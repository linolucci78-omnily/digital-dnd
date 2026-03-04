// ═══════════════════════════════════════════════════════════
//  SceneEditor — REGIA DI COMANDO DEL DUNGEON MASTER
//  
//  Due modalita:
//    REGIA: lista scene, bandierina TV, combat sidebar, dadi 3D
//           Centro mostra scena attiva in view mode
//           Right-click su scena → menu (Edit, Copia, Elimina)
//
//    EDITOR: PageCanvas in edit mode (da right-click → Edit)
//           Toolbar + sidebar destra editing + fog tools
//           Bottone "Torna alla Regia" per uscire
// ═══════════════════════════════════════════════════════════

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import PageCanvas from "./PageCanvas.jsx";
import CreateSceneForm from "./CreateSceneForm.jsx";
import DiceRollModal from "../shared/components/DiceRollModal.jsx";
import { supabase } from "../lib/supabase";
import DnDIcon from "../shared/components/DnDIcon.jsx";
import Modal from "../components/Modal.jsx";
import { FiEdit3, FiCopy, FiMonitor, FiTrash2, FiMoreVertical, FiFlag } from "react-icons/fi";

const SCENE_TYPE_CONFIG = {
  exploration: { label: "Esplorazione", icon: "explore", color: "#4caf50" },
  combat: { label: "Combattimento", icon: "attack", color: "#c04040" },
  social: { label: "Social", icon: "scroll", color: "#60a0d0" },
};

export default function SceneEditor({
  campaign,
  session,
  tvChannel,
  characters = [],
  onClose,
  initialScene = null,
}) {
  // ═══ MODALITA ═══
  const [viewMode, setViewMode] = useState("regia"); // "regia" | "editor"
  const [editingScene, setEditingScene] = useState(null);

  // ═══ SCENE STATE ═══
  const [scenes, setScenes] = useState([]);
  const [activeSceneId, setActiveSceneId] = useState(null);
  const [selectedSceneId, setSelectedSceneId] = useState(null);
  const [loadingScenes, setLoadingScenes] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // ═══ CONTEXT MENU (right-click) ═══
  const [contextMenu, setContextMenu] = useState(null);

  // ═══ COMBAT STATE ═══
  const [combatActive, setCombatActive] = useState(false);
  const [combatData, setCombatData] = useState(null);

  // ═══ DICE MODAL ═══
  const [diceModalOpen, setDiceModalOpen] = useState(false);

  // ═══ MODAL ═══
  const [modal, setModal] = useState({
    isOpen: false, title: "", message: "", type: "info", onConfirm: null,
  });

  // ═══ FLAG DRAG TO LIVE ═══
  const [draggingFlag, setDraggingFlag] = useState(false);

  // ═══ PAGE CANVAS REF ═══
  const pageCanvasRef = useRef(null);
  const [flagDropTarget, setFlagDropTarget] = useState(null);

  // Computed
  const activeScene = scenes.find((s) => s.id === activeSceneId);
  const selectedScene = scenes.find((s) => s.id === selectedSceneId);

  // ═══════════════════════════════════════════════
  //  LOAD SCENES
  // ═══════════════════════════════════════════════
  useEffect(() => {
    if (campaign?.id) loadScenes();
  }, [campaign?.id]);

  const loadScenes = async () => {
    try {
      const { data, error } = await supabase
        .from("scenes").select("*")
        .eq("campaign_id", campaign.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      setScenes(data || []);
      const active = data?.find((s) => s.is_active);
      if (active) {
        setActiveSceneId(active.id);
        if (!selectedSceneId) setSelectedSceneId(active.id);
      }
    } catch (err) {
      console.error("Errore caricamento scene:", err);
    } finally {
      setLoadingScenes(false);
    }
  };

  // ═══════════════════════════════════════════════
  //  CREATE SCENE
  // ═══════════════════════════════════════════════
  const handleCreateScene = async (formData) => {
    try {
      const canvasState = {
        layers: {
          map: { visible: true, locked: false, objects: [] },
          objects: { visible: true, locked: false, objects: [] },
          tokens: { visible: true, locked: false, objects: [] },
          gm: { visible: true, locked: false, objects: [] },
        },
        gridSettings: {
          enabled: formData.gridEnabled, type: formData.gridType,
          size: formData.gridSize, color: formData.gridColor,
          opacity: formData.gridOpacity, snapToGrid: formData.snapToGrid,
          offsetX: 0, offsetY: 0,
          scale: formData.gridScale, scaleUnit: formData.gridScaleUnit,
        },
        pageSettings: {
          backgroundColor: formData.backgroundColor || "#1a1410",
          mapImage: null,
          pageWidth: formData.pageWidth || 25,
          pageHeight: formData.pageHeight || 25,
          fogOfWar: { enabled: formData.fogEnabled || false, revealedAreas: [] },
        },
      };
      const { data: scene, error } = await supabase
        .from("scenes")
        .insert({
          campaign_id: campaign.id, name: formData.name,
          description: formData.description, scene_type: formData.scene_type,
          canvas_state: canvasState,
          map_url: formData.map_url || null,
        })
        .select().single();
      if (error) throw error;
      setScenes((prev) => [scene, ...prev]);
      setShowCreateModal(false);
      setSelectedSceneId(scene.id);
      if (scenes.length === 0) activateScene(scene.id);
    } catch (err) {
      console.error("Errore creazione scena:", err);
      setModal({ isOpen: true, title: "Errore", message: "Impossibile creare la scena.", type: "error" });
    }
  };

  // ═══════════════════════════════════════════════
  //  ACTIVATE SCENE ON TV (bandierina)
  // ═══════════════════════════════════════════════
  const activateScene = async (sceneId) => {
    try {
      // PRIMA: disattiva TUTTE le scene della campagna
      await supabase
        .from("scenes")
        .update({ is_active: false })
        .eq("campaign_id", campaign.id);

      // POI: attiva solo quella selezionata
      const { error: updateError } = await supabase
        .from("scenes").update({ is_active: true }).eq("id", sceneId);
      if (updateError) throw updateError;
      if (session?.id) {
        await supabase.from("sessions").update({ current_scene_id: sceneId }).eq("id", session.id);
      }
      if (tvChannel) {
        // La TV si aspetta dati completi della scena
        const sceneData = scenes.find((s) => s.id === sceneId);
        await tvChannel.send({
          type: "broadcast", event: "scene_change",
          payload: {
            sceneId,
            location: sceneData?.name || "",
            description: sceneData?.description || "",
            mapUrl: sceneData?.map_url || "",
            musicTrack: sceneData?.music_track || null,
          },
        });
      }
      setActiveSceneId(sceneId);
      loadScenes();
    } catch (err) {
      console.error("Errore attivazione scena:", err);
    }
  };

  // ═══════════════════════════════════════════════
  //  DUPLICATE SCENE
  // ═══════════════════════════════════════════════
  const duplicateScene = async (sceneId) => {
    try {
      const original = scenes.find((s) => s.id === sceneId);
      if (!original) return;
      const { data: copy, error } = await supabase
        .from("scenes")
        .insert({
          campaign_id: campaign.id,
          name: `${original.name} (copia)`,
          description: original.description,
          scene_type: original.scene_type,
          canvas_state: original.canvas_state,
          map_url: original.map_url,
        })
        .select().single();
      if (error) throw error;
      setScenes((prev) => [copy, ...prev]);
    } catch (err) {
      console.error("Errore duplicazione:", err);
    }
  };

  // ═══════════════════════════════════════════════
  //  DELETE SCENE
  // ═══════════════════════════════════════════════
  const deleteScene = (sceneId) => {
    setModal({
      isOpen: true, title: "Eliminare questa scena?",
      message: "L'azione non puo essere annullata.",
      type: "confirm",
      onConfirm: async () => {
        try {
          const { error } = await supabase.from("scenes").delete().eq("id", sceneId);
          if (error) throw error;
          setScenes((prev) => prev.filter((s) => s.id !== sceneId));
          if (selectedSceneId === sceneId) setSelectedSceneId(null);
          if (activeSceneId === sceneId) setActiveSceneId(null);
        } catch (err) { console.error("Errore eliminazione:", err); }
      },
    });
  };

  // ═══════════════════════════════════════════════
  //  ENTER / EXIT EDITOR
  // ═══════════════════════════════════════════════
  const enterEditor = (scene) => {
    setEditingScene(scene);
    setViewMode("editor");
  };

  const exitEditor = async () => {
    // Save canvas before exiting
    if (pageCanvasRef.current?.save) {
      try {
        await pageCanvasRef.current.save();
        console.log("✅ Canvas saved before exiting");
      } catch (err) {
        console.error("❌ Error saving canvas:", err);
      }
    }

    setEditingScene(null);
    setViewMode("regia");
    loadScenes(); // refresh dopo eventuali modifiche
  };

  // ═══════════════════════════════════════════════
  //  OPEN TV
  // ═══════════════════════════════════════════════
  const openTV = () => {
    if (!campaign?.join_code) return;
    window.open(`${window.location.origin}/?tv&c=${campaign.join_code}`, "_blank");
  };

  // ═══════════════════════════════════════════════
  //  COMBAT SYSTEM
  // ═══════════════════════════════════════════════
  const startCombat = () => {
    const combatants = characters.map((c) => ({
      id: c.id, name: c.name, type: "player",
      initiative: Math.floor(Math.random() * 20) + 1 + (c.initiative_bonus || 0),
      hp: { current: c.hp_current, max: c.hp_max },
      ac: c.armor_class, token_color: c.token_color,
    }));
    const turnOrder = combatants.sort((a, b) => b.initiative - a.initiative);
    setCombatData({ turnOrder, currentTurn: 0, round: 1 });
    setCombatActive(true);
    if (tvChannel) {
      tvChannel.send({
        type: "broadcast", event: "combat_started",
        payload: {
          active: true,
          currentTurn: 0,
          initiative: turnOrder,
          round: 1,
        },
      });
    }
  };

  const nextTurn = () => {
    if (!combatData) return;
    const nextIdx = (combatData.currentTurn + 1) % combatData.turnOrder.length;
    const nextRound = nextIdx === 0 ? combatData.round + 1 : combatData.round;
    const newData = { ...combatData, currentTurn: nextIdx, round: nextRound };
    setCombatData(newData);
    if (tvChannel) {
      tvChannel.send({ type: "broadcast", event: "turn_changed", payload: { currentTurn: nextIdx } });
    }
  };

  const endCombat = () => {
    setCombatActive(false);
    setCombatData(null);
    if (tvChannel) {
      tvChannel.send({ type: "broadcast", event: "combat_ended", payload: {} });
    }
  };

  // ═══════════════════════════════════════════════
  //  CLOSE CONTEXT MENU
  // ═══════════════════════════════════════════════
  const closeContextMenu = () => setContextMenu(null);

  // ═══════════════════════════════════════════════════════════
  //
  //   R E N D E R   —   E D I T O R   M O D E
  //
  // ═══════════════════════════════════════════════════════════
  if (viewMode === "editor" && editingScene) {
    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100vh", width: "100vw", background: "#0a0806" }}>
        {/* Editor header bar */}
        <div style={{
          height: 48, display: "flex", alignItems: "center",
          padding: "0 20px", gap: 16,
          background: "rgba(15,12,10,0.95)",
          borderBottom: "1px solid rgba(212,175,55,0.2)",
        }}>
          <motion.button
            onClick={exitEditor}
            whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            style={{
              padding: "8px 16px", background: "rgba(212,175,55,0.15)",
              border: "1px solid rgba(212,175,55,0.3)", borderRadius: 6,
              color: "var(--gold)", cursor: "pointer",
              fontSize: "0.75rem", fontWeight: 600,
              display: "flex", alignItems: "center", gap: 8,
            }}
          >
            <DnDIcon icon="compass" size={14} /> Torna alla Regia
          </motion.button>

          <div style={{ height: 20, width: 1, background: "rgba(212,175,55,0.15)" }} />

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <DnDIcon icon="map" size={16} color="var(--gold)" />
            <span style={{
              fontFamily: "'Cinzel', serif", fontSize: "0.9rem",
              color: "var(--gold)", fontWeight: 600, letterSpacing: "0.04em",
            }}>
              EDITING: {editingScene.name?.toUpperCase()}
            </span>
          </div>

          <div style={{ flex: 1 }} />

          <motion.button
            onClick={exitEditor}
            whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            style={{
              padding: "8px 20px",
              background: "linear-gradient(135deg, rgba(212,175,55,0.3), rgba(212,175,55,0.15))",
              border: "1px solid rgba(212,175,55,0.5)", borderRadius: 6,
              color: "var(--gold)", cursor: "pointer",
              fontSize: "0.75rem", fontWeight: 700,
              display: "flex", alignItems: "center", gap: 8,
            }}
          >
            <DnDIcon icon="check" size={14} /> Salva e Esci
          </motion.button>
        </div>

        {/* PageCanvas in edit mode — gestisce toolbar + canvas + sidebar destra */}
        <div style={{ flex: 1, overflow: "hidden" }}>
          <PageCanvas
            ref={pageCanvasRef}
            scene={editingScene}
            campaign={campaign}
            mode="edit"
            tvChannel={tvChannel}
            session={session}
          />
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════
  //
  //   R E N D E R   —   R E G I A   M O D E
  //
  // ═══════════════════════════════════════════════════════════
  return (
    <div style={{
      display: "flex", height: "100vh", width: "100vw",
      background: "#0a0806", overflow: "hidden",
    }}>

      {/* ═══ SIDEBAR SINISTRA — Scene List ═══ */}
      <div style={{
        width: 300, minWidth: 300,
        background: "linear-gradient(180deg, rgba(15,12,10,0.98), rgba(10,8,6,0.98))",
        borderRight: "1px solid rgba(212,175,55,0.15)",
        display: "flex", flexDirection: "column", overflow: "hidden",
      }}>
        {/* Header */}
        <div style={{
          padding: "16px 18px",
          borderBottom: "1px solid rgba(212,175,55,0.15)",
          background: "rgba(212,175,55,0.03)",
        }}>
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            marginBottom: 12,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <DnDIcon icon="crown" size={16} color="var(--gold)" />
              <span style={{
                fontFamily: "'Cinzel', serif", fontSize: "0.7rem",
                color: "var(--gold)", letterSpacing: "0.1em", fontWeight: 600,
              }}>
                {campaign?.name?.toUpperCase() || "CAMPAGNA"}
              </span>
            </div>
            {onClose && (
              <motion.button onClick={onClose}
                whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                style={{
                  background: "none", border: "none",
                  color: "rgba(255,255,255,0.3)", cursor: "pointer",
                  fontSize: "0.9rem", padding: 4,
                }}
              >
                <DnDIcon icon="close" size={14} />
              </motion.button>
            )}
          </div>

          {/* Nuova Scena button */}
          <motion.button
            onClick={() => setShowCreateModal(true)}
            whileHover={{ scale: 1.02, borderColor: "rgba(212,175,55,0.5)" }}
            whileTap={{ scale: 0.98 }}
            style={{
              width: "100%", padding: "10px 14px",
              background: "rgba(212,175,55,0.08)",
              border: "1px dashed rgba(212,175,55,0.3)", borderRadius: 8,
              color: "var(--gold)", cursor: "pointer",
              fontSize: "0.75rem", fontWeight: 600,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              transition: "border-color 0.2s",
            }}
          >
            <DnDIcon icon="star" size={14} /> Nuova Scena
          </motion.button>
        </div>

        {/* Scene list — scrollabile */}
        <div style={{ flex: 1, overflowY: "auto", padding: 12 }}>
          {loadingScenes ? (
            <div style={{ textAlign: "center", padding: 30, color: "rgba(255,255,255,0.3)", fontStyle: "italic", fontSize: "0.8rem" }}>
              Caricamento...
            </div>
          ) : scenes.length === 0 ? (
            <div style={{ textAlign: "center", padding: 30, color: "rgba(255,255,255,0.3)", fontSize: "0.8rem" }}>
              <DnDIcon icon="explore" size={32} color="rgba(212,175,55,0.2)" />
              <div style={{ marginTop: 12, fontStyle: "italic" }}>Nessuna scena creata</div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {/* Bandierina standalone — quando nessuna scena e in live */}
              {!activeSceneId && scenes.length > 0 && (
                <div
                  draggable
                  onDragStart={(e) => {
                    setDraggingFlag(true);
                    const ghost = document.createElement("div");
                    ghost.innerHTML = "🚩";
                    ghost.style.cssText = "position:absolute;top:-999px;font-size:24px;";
                    document.body.appendChild(ghost);
                    e.dataTransfer.setDragImage(ghost, 12, 12);
                    setTimeout(() => document.body.removeChild(ghost), 0);
                    e.dataTransfer.effectAllowed = "move";
                  }}
                  onDragEnd={() => {
                    setDraggingFlag(false);
                    setFlagDropTarget(null);
                  }}
                  style={{
                    padding: "10px 14px",
                    background: "rgba(76,175,80,0.08)",
                    border: "1px dashed rgba(76,175,80,0.3)",
                    borderRadius: 8,
                    display: "flex", alignItems: "center", gap: 10,
                    cursor: "grab",
                    userSelect: "none",
                  }}
                >
                  <FiFlag
                    size={18}
                    style={{
                      color: "rgba(76,175,80,0.7)",
                      pointerEvents: "none",
                      flexShrink: 0,
                    }}
                  />
                  <span style={{
                    fontSize: "0.65rem", color: "rgba(255,255,255,0.5)",
                    fontWeight: 500,
                    pointerEvents: "none",
                  }}>
                    Trascina sulla scena da trasmettere
                  </span>
                </div>
              )}

              {scenes.map((scene) => {
                const isActive = scene.id === activeSceneId;
                const isSelected = scene.id === selectedSceneId;
                const isDropTarget = flagDropTarget === scene.id;
                const typeConf = SCENE_TYPE_CONFIG[scene.scene_type] || SCENE_TYPE_CONFIG.exploration;

                return (
                  <motion.div
                    key={scene.id}
                    onClick={() => setSelectedSceneId(scene.id)}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      setContextMenu({ x: e.clientX, y: e.clientY, sceneId: scene.id });
                    }}
                    // Drop target per la bandierina
                    onDragOver={(e) => {
                      e.preventDefault();
                      if (draggingFlag && scene.id !== activeSceneId) {
                        setFlagDropTarget(scene.id);
                      }
                    }}
                    onDragLeave={() => setFlagDropTarget(null)}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (draggingFlag) {
                        activateScene(scene.id);
                        setDraggingFlag(false);
                        setFlagDropTarget(null);
                      }
                    }}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    style={{
                      padding: 10, borderRadius: 8, cursor: "pointer",
                      position: "relative",
                      background: isDropTarget
                        ? "linear-gradient(135deg, rgba(76,175,80,0.2), rgba(76,175,80,0.08))"
                        : isSelected
                        ? "linear-gradient(135deg, rgba(212,175,55,0.15), rgba(212,175,55,0.05))"
                        : "rgba(255,255,255,0.02)",
                      border: isDropTarget
                        ? "2px dashed rgba(76,175,80,0.7)"
                        : isSelected
                        ? "1px solid rgba(212,175,55,0.5)"
                        : isActive
                        ? "1px solid rgba(76,175,80,0.3)"
                        : "1px solid rgba(255,255,255,0.06)",
                      transition: "all 0.2s",
                    }}
                  >
                    {/* Thumbnail mappa */}
                    {scene.map_url && (
                      <div style={{
                        width: "100%", height: 60, borderRadius: 5,
                        overflow: "hidden", marginBottom: 8,
                        background: "#000", border: "1px solid rgba(255,255,255,0.08)",
                        pointerEvents: "none",
                      }}>
                        <img src={scene.map_url} alt={scene.name}
                          style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      </div>
                    )}

                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div style={{ flex: 1 }}>
                        <div style={{
                          fontWeight: 600, fontSize: "0.82rem",
                          color: isSelected ? "var(--gold)" : "rgba(255,255,255,0.85)",
                          marginBottom: 2,
                        }}>
                          {scene.name}
                        </div>
                        <div style={{ fontSize: "0.6rem", color: "rgba(255,255,255,0.35)" }}>
                          <span style={{ color: typeConf.color }}>
                            <DnDIcon icon={typeConf.icon} size={10} /> {typeConf.label}
                          </span>
                        </div>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        {/* Menu button (tre puntini) */}
                        <motion.button
                          onClick={(e) => {
                            e.stopPropagation();
                            setContextMenu({ x: e.clientX, y: e.clientY, sceneId: scene.id });
                          }}
                          whileHover={{ background: "rgba(255,255,255,0.12)" }}
                          whileTap={{ scale: 0.9 }}
                          style={{
                            padding: 4,
                            background: "rgba(255,255,255,0.05)",
                            border: "1px solid rgba(255,255,255,0.1)",
                            borderRadius: 4,
                            color: "rgba(255,255,255,0.5)",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            transition: "all 0.1s ease",
                          }}
                          title="Options"
                        >
                          <FiMoreVertical size={14} />
                        </motion.button>

                        {/* Bandierina LIVE — draggabile, presente solo sulla scena attiva */}
                        {isActive && (
                          <div
                            draggable
                            onDragStart={(e) => {
                              e.stopPropagation();
                              setDraggingFlag(true);
                              // Icona drag custom
                              const ghost = document.createElement("div");
                              ghost.innerHTML = "🚩";
                              ghost.style.cssText = "position:absolute;top:-999px;font-size:24px;";
                              document.body.appendChild(ghost);
                              e.dataTransfer.setDragImage(ghost, 12, 12);
                              setTimeout(() => document.body.removeChild(ghost), 0);
                              e.dataTransfer.effectAllowed = "move";
                            }}
                            onDragEnd={() => {
                              setDraggingFlag(false);
                              setFlagDropTarget(null);
                            }}
                            onClick={(e) => e.stopPropagation()}
                            title="Trascina su un'altra scena per metterla in LIVE"
                            style={{
                              cursor: "grab", padding: 6,
                              filter: "drop-shadow(0 0 6px rgba(76,175,80,0.5))",
                              transition: "transform 0.2s",
                              userSelect: "none",
                              display: "flex",
                              alignItems: "center",
                            }}
                          >
                            <FiFlag size={18} style={{ color: "#4caf50" }} />
                          </div>
                        )}

                        {/* Indicatore drop target */}
                        {isDropTarget && !isActive && (
                          <div style={{
                            color: "#4caf50", opacity: 0.5,
                            animation: "pulse-flag 1s ease-in-out infinite",
                            display: "flex",
                            alignItems: "center",
                          }}>
                            <FiFlag size={18} />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Badge LIVE */}
                    {isActive && (
                      <div style={{
                        position: "absolute", top: 6, right: 6,
                        background: "rgba(76,175,80,0.15)",
                        border: "1px solid rgba(76,175,80,0.4)",
                        color: "#4caf50", padding: "2px 7px", borderRadius: 4,
                        fontSize: "0.5rem", fontWeight: 700, letterSpacing: "0.05em",
                      }}>
                        LIVE
                      </div>
                    )}
                  </motion.div>
                );
              })}

              {/* Hint drag (visibile quando si sta draggando) */}
              {draggingFlag && (
                <div style={{
                  textAlign: "center", padding: "8px",
                  fontSize: "0.6rem", color: "rgba(76,175,80,0.6)",
                  fontStyle: "italic",
                }}>
                  Rilascia su una scena per trasmetterla
                </div>
              )}
            </div>
          )}
        </div>

        {/* ═══ BOTTOM BAR — TV, Dadi, Combat ═══ */}
        <div style={{
          padding: 12, borderTop: "1px solid rgba(212,175,55,0.15)",
          background: "rgba(0,0,0,0.3)",
          display: "flex", flexDirection: "column", gap: 8,
        }}>
          {/* Riga bottoni: TV + Dadi */}
          <div style={{ display: "flex", gap: 8 }}>
            <motion.button onClick={openTV}
              whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              style={{
                flex: 1, padding: "10px",
                background: "rgba(212,175,55,0.08)",
                border: "1px solid rgba(212,175,55,0.2)", borderRadius: 8,
                color: "var(--gold)", cursor: "pointer",
                fontSize: "0.7rem", fontWeight: 600,
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              }}
            >
              <DnDIcon icon="screen" size={14} /> Apri TV
            </motion.button>

            <motion.button onClick={() => setDiceModalOpen(true)}
              whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              style={{
                flex: 1, padding: "10px",
                background: "rgba(212,175,55,0.08)",
                border: "1px solid rgba(212,175,55,0.2)", borderRadius: 8,
                color: "var(--gold)", cursor: "pointer",
                fontSize: "0.7rem", fontWeight: 600,
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              }}
            >
              <DnDIcon icon="diceD20" size={14} /> Dadi
            </motion.button>
          </div>

          {/* Combat button */}
          {!combatActive ? (
            <motion.button onClick={startCombat}
              whileHover={{ scale: 1.02, boxShadow: "0 0 25px rgba(139,0,0,0.4)" }}
              whileTap={{ scale: 0.98 }}
              style={{
                width: "100%", padding: "14px",
                background: "linear-gradient(135deg, rgba(192,64,64,0.7), rgba(139,0,0,0.7))",
                border: "2px solid rgba(192,64,64,0.6)", borderRadius: 8,
                color: "#fff", fontFamily: "'Cinzel', serif",
                fontSize: "0.85rem", cursor: "pointer", fontWeight: 700,
                display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                boxShadow: "0 0 15px rgba(139,0,0,0.25)",
                letterSpacing: "0.05em",
              }}
            >
              <DnDIcon icon="attack" size={18} /> START COMBAT
            </motion.button>
          ) : (
            <div style={{ display: "flex", gap: 8 }}>
              <motion.button onClick={nextTurn}
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                style={{
                  flex: 1, padding: "12px",
                  background: "rgba(212,175,55,0.15)",
                  border: "2px solid rgba(212,175,55,0.4)", borderRadius: 8,
                  color: "var(--gold)", cursor: "pointer",
                  fontSize: "0.75rem", fontWeight: 600,
                }}
              >
                <DnDIcon icon="initiative" size={14} /> Prossimo
              </motion.button>
              <motion.button onClick={endCombat}
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                style={{
                  padding: "12px 16px",
                  background: "rgba(139,0,0,0.2)",
                  border: "2px solid rgba(192,64,64,0.4)", borderRadius: 8,
                  color: "#c04040", cursor: "pointer",
                  fontSize: "0.75rem", fontWeight: 600,
                }}
              >
                Fine
              </motion.button>
            </div>
          )}
        </div>
      </div>

      {/* ═══ CENTRO — Canvas View / Empty State ═══ */}
      <div style={{
        flex: 1, display: "flex", flexDirection: "column",
        overflow: "hidden", position: "relative", minWidth: 0,
      }}>
        {/* Top bar con info scena */}
        <div style={{
          height: 44, display: "flex", alignItems: "center",
          justifyContent: "center", gap: 12,
          background: "rgba(0,0,0,0.4)",
          borderBottom: "1px solid rgba(212,175,55,0.1)",
        }}>
          <DnDIcon icon="map" size={14} color="rgba(212,175,55,0.5)" />
          <span style={{
            fontSize: "0.8rem", color: "rgba(255,255,255,0.7)",
            fontFamily: "'Cinzel', serif", fontWeight: 600, letterSpacing: "0.05em",
          }}>
            {(selectedScene || activeScene)?.name?.toUpperCase() || "NESSUNA SCENA SELEZIONATA"}
          </span>
          {selectedScene && selectedScene.id === activeSceneId && (
            <span style={{
              fontSize: "0.5rem", color: "#4caf50",
              background: "rgba(76,175,80,0.1)", padding: "2px 8px",
              borderRadius: 4, fontWeight: 700, letterSpacing: "0.05em",
              border: "1px solid rgba(76,175,80,0.2)",
            }}>
              LIVE
            </span>
          )}
          {selectedScene && selectedScene.id !== activeSceneId && (
            <span style={{
              fontSize: "0.5rem", color: "rgba(212,175,55,0.5)",
              background: "rgba(212,175,55,0.08)", padding: "2px 8px",
              borderRadius: 4, fontWeight: 700, letterSpacing: "0.05em",
              border: "1px solid rgba(212,175,55,0.15)",
            }}>
              ANTEPRIMA
            </span>
          )}
        </div>

        {/* Canvas area */}
        <div style={{ flex: 1, overflow: "hidden" }}>
          {(selectedScene || activeScene) ? (
            <PageCanvas
              key={(selectedScene || activeScene).id}
              scene={selectedScene || activeScene}
              campaign={campaign}
              mode={combatActive ? "combat" : "exploration"}
              tvChannel={tvChannel}
              session={session}
              combatData={combatActive ? combatData : null}
            />
          ) : (
            <div style={{
              display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center",
              height: "100%", gap: 20,
            }}>
              <DnDIcon icon="explore" size={56} color="rgba(212,175,55,0.15)" />
              <div style={{
                fontSize: "1rem", color: "rgba(255,255,255,0.3)",
                fontFamily: "'Cinzel', serif", fontStyle: "italic",
              }}>
                Seleziona una scena o trascina la bandierina per trasmettere
              </div>
              <motion.button
                onClick={() => setShowCreateModal(true)}
                whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                style={{
                  padding: "14px 28px",
                  background: "rgba(212,175,55,0.1)",
                  border: "2px solid rgba(212,175,55,0.3)", borderRadius: 8,
                  color: "var(--gold)", cursor: "pointer",
                  fontSize: "0.85rem", fontWeight: 600,
                }}
              >
                <DnDIcon icon="star" size={16} /> Crea Prima Scena
              </motion.button>
            </div>
          )}
        </div>
      </div>

      {/* ═══ COMBAT SIDEBAR DESTRA (appare durante combat) ═══ */}
      <AnimatePresence>
        {combatActive && combatData && (
          <motion.div
            initial={{ x: 280, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 280, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            style={{
              width: 280, minWidth: 280,
              background: "linear-gradient(180deg, rgba(15,12,10,0.98), rgba(10,8,6,0.98))",
              borderLeft: "1px solid rgba(192,64,64,0.25)",
              display: "flex", flexDirection: "column", overflow: "hidden",
            }}
          >
            {/* Combat header */}
            <div style={{
              padding: "16px 18px",
              borderBottom: "1px solid rgba(192,64,64,0.2)",
              background: "rgba(192,64,64,0.05)",
              textAlign: "center",
            }}>
              <div style={{
                fontFamily: "'Cinzel', serif", fontSize: "1rem",
                color: "#c04040", fontWeight: 700, marginBottom: 4,
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              }}>
                <DnDIcon icon="attack" size={18} /> COMBATTIMENTO
              </div>
              <div style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.4)" }}>
                Round {combatData.round}
              </div>
            </div>

            {/* Initiative order */}
            <div style={{ flex: 1, overflowY: "auto", padding: 12 }}>
              <div style={{
                fontSize: "0.6rem", color: "var(--gold)",
                letterSpacing: "0.1em", marginBottom: 10, fontWeight: 600,
              }}>
                <DnDIcon icon="initiative" size={12} /> ORDINE INIZIATIVA
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {combatData.turnOrder.map((c, i) => {
                  const isCurrent = i === combatData.currentTurn;
                  const hpPct = c.hp ? (c.hp.current / c.hp.max) * 100 : 100;
                  const hpColor = hpPct > 60 ? "#4caf50" : hpPct > 30 ? "#ff9800" : "#c04040";

                  return (
                    <motion.div
                      key={c.id}
                      initial={{ x: -15, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: i * 0.04 }}
                      style={{
                        padding: 10, borderRadius: 8, position: "relative",
                        background: isCurrent ? "rgba(212,175,55,0.15)" : "rgba(255,255,255,0.02)",
                        border: isCurrent ? "1px solid rgba(212,175,55,0.5)" : "1px solid rgba(255,255,255,0.06)",
                      }}
                    >
                      {isCurrent && (
                        <div style={{
                          position: "absolute", top: -7, right: 8,
                          background: "var(--gold)", color: "#0a0806",
                          padding: "2px 8px", borderRadius: 3,
                          fontSize: "0.5rem", fontWeight: 700,
                        }}>
                          TURNO
                        </div>
                      )}

                      <div style={{
                        fontWeight: 600, fontSize: "0.8rem", marginBottom: 4,
                        color: isCurrent ? "var(--gold)" : "rgba(255,255,255,0.8)",
                      }}>
                        {c.name}
                      </div>

                      {/* HP bar */}
                      {c.hp && (
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                          <div style={{
                            flex: 1, height: 4, background: "rgba(0,0,0,0.4)",
                            borderRadius: 2, overflow: "hidden",
                          }}>
                            <div style={{
                              width: `${hpPct}%`, height: "100%",
                              background: hpColor, borderRadius: 2,
                              transition: "width 0.3s",
                            }} />
                          </div>
                          <span style={{ fontSize: "0.55rem", color: hpColor, fontWeight: 600 }}>
                            {c.hp.current}/{c.hp.max}
                          </span>
                        </div>
                      )}

                      <div style={{ display: "flex", gap: 10, fontSize: "0.6rem", color: "rgba(255,255,255,0.35)" }}>
                        <span><DnDIcon icon="initiative" size={10} /> {c.initiative}</span>
                        {c.ac && <span><DnDIcon icon="shield" size={10} /> {c.ac}</span>}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ CONTEXT MENU (right-click su scena) ═══ */}
      <AnimatePresence>
        {contextMenu && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={closeContextMenu}
            style={{ position: "fixed", inset: 0, zIndex: 10000 }}
          >
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              onClick={(e) => e.stopPropagation()}
              style={{
                position: "absolute",
                left: contextMenu.x, top: contextMenu.y,
                background: "rgba(25,25,28,0.96)",
                backdropFilter: "blur(12px)",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 6, padding: 4, minWidth: 180,
                boxShadow: "0 4px 24px rgba(0,0,0,0.5), 0 0 0 1px rgba(0,0,0,0.3)",
              }}
            >
              {/* Edit */}
              <ContextMenuItem
                icon={FiEdit3}
                label="Edit Scene"
                color="rgba(255,255,255,0.9)"
                onClick={() => {
                  const scene = scenes.find((s) => s.id === contextMenu.sceneId);
                  if (scene) enterEditor(scene);
                  closeContextMenu();
                }}
              />
              {/* Duplicate */}
              <ContextMenuItem
                icon={FiCopy}
                label="Duplicate"
                color="rgba(255,255,255,0.9)"
                onClick={() => {
                  duplicateScene(contextMenu.sceneId);
                  closeContextMenu();
                }}
              />
              {/* Activate on TV */}
              <ContextMenuItem
                icon={FiMonitor}
                label="Broadcast to TV"
                color="rgba(255,255,255,0.9)"
                onClick={() => {
                  activateScene(contextMenu.sceneId);
                  closeContextMenu();
                }}
              />

              <div style={{ height: 1, background: "rgba(255,255,255,0.08)", margin: "4px 0" }} />

              {/* Delete */}
              <ContextMenuItem
                icon={FiTrash2}
                label="Delete"
                color="rgba(239,68,68,0.95)"
                onClick={() => {
                  deleteScene(contextMenu.sceneId);
                  closeContextMenu();
                }}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ CREATE SCENE MODAL ═══ */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{
              position: "fixed", inset: 0,
              background: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)",
              display: "flex", alignItems: "center", justifyContent: "center",
              zIndex: 9999,
            }}
            onClick={() => setShowCreateModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                maxWidth: 600, width: "90%", maxHeight: "85vh",
                overflowY: "auto",
                background: "linear-gradient(180deg, rgba(30,25,20,0.98), rgba(20,15,12,0.98))",
                border: "2px solid rgba(212,175,55,0.35)",
                borderRadius: 14, padding: 28,
                boxShadow: "0 24px 80px rgba(0,0,0,0.8)",
              }}
            >
              <CreateSceneForm
                onSubmit={handleCreateScene}
                onCancel={() => setShowCreateModal(false)}
                campaignId={campaign?.id}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ DICE 3D MODAL ═══ */}
      <DiceRollModal
        isOpen={diceModalOpen}
        onClose={() => setDiceModalOpen(false)}
        playerName="Dungeon Master"
        playerColor="var(--gold)"
        tvChannel={tvChannel}
      />

      {/* ═══ CSS ═══ */}
      <style>{`
        @keyframes pulse-flag {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(1.15); }
        }
      `}</style>

      {/* ═══ CONFIRM/ERROR MODAL ═══ */}
      <Modal
        isOpen={modal.isOpen}
        onClose={() => setModal({ ...modal, isOpen: false })}
        title={modal.title} message={modal.message}
        type={modal.type} onConfirm={modal.onConfirm}
      />
    </div>
  );
}

// ═══════════════════════════════════════════════
//  ContextMenuItem — voce del menu right-click
// ═══════════════════════════════════════════════
function ContextMenuItem({ icon: Icon, label, color, onClick }) {
  const isDelete = label.toLowerCase().includes('delete');

  return (
    <motion.button
      onClick={onClick}
      whileHover={{ background: isDelete ? "rgba(239,68,68,0.12)" : "rgba(255,255,255,0.08)" }}
      whileTap={{ scale: 0.98 }}
      style={{
        width: "100%", padding: "7px 10px",
        background: "transparent", border: "none",
        color: color, textAlign: "left", cursor: "pointer",
        borderRadius: 4, fontSize: "0.75rem", fontWeight: 500,
        letterSpacing: "0.01em",
        transition: "all 0.1s ease",
        display: "flex", alignItems: "center", gap: 8,
      }}
    >
      <Icon size={14} style={{ flexShrink: 0 }} />
      {label}
    </motion.button>
  );
}
