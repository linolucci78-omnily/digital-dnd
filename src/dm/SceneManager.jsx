// ═══════════════════════════════════════════════════════════
//  SceneManager — Gestione Scene VTT (stile Foundry VTT)
//  Permette al DM di creare, modificare e attivare scene
// ═══════════════════════════════════════════════════════════

import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import PageCanvas from "./PageCanvas.jsx";
import Modal from "../components/Modal";
import CreateSceneForm from "./CreateSceneForm.jsx";

export default function SceneManager({ campaign, session, tvChannel, openEditor, onEditorOpen, onEditorClose, sessionState, onSceneActivated, onEditScene }) {
  const [scenes, setScenes] = useState([]);
  const [activeSceneId, setActiveSceneId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploadingScene, setUploadingScene] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Editor Mode States
  const [editorMode, setEditorMode] = useState(false);
  const [selectedSceneId, setSelectedSceneId] = useState(null);

  // View Mode - per vedere la scena al centro senza editare
  const [viewSceneId, setViewSceneId] = useState(null);

  // Modal state
  const [modal, setModal] = useState({
    isOpen: false,
    title: "",
    message: "",
    type: "info",
    onConfirm: null,
  });

  // Context menu
  const [contextMenu, setContextMenu] = useState(null);

  // Apri editor quando richiesto da DMPanel
  useEffect(() => {
    if (openEditor) {
      setEditorMode(true);
      setSelectedSceneId(null);
      setShowCreateModal(true);
      if (onEditorOpen) onEditorOpen(); // Reset il flag
    }
  }, [openEditor, onEditorOpen]);

  // Carica scene della campagna
  useEffect(() => {
    console.log("📡 useEffect loadScenes - campaign?.id:", campaign?.id);
    if (campaign?.id) {
      loadScenes();
    } else {
      console.log("❌ No campaign.id, cannot load scenes");
      setLoading(false);
    }
  }, [campaign?.id]);

  const loadScenes = async () => {
    console.log("🔄 loadScenes() called - campaign.id:", campaign.id);
    try {
      const { data, error } = await supabase
        .from("scenes")
        .select("*")
        .eq("campaign_id", campaign.id)
        .order("created_at", { ascending: false });

      console.log("📦 Scenes loaded:", data?.length || 0, "scenes", error ? `ERROR: ${error.message}` : "");

      if (error) throw error;

      setScenes(data || []);

      // Trova scena attiva
      const active = data?.find(s => s.is_active);
      if (active) {
        setActiveSceneId(active.id);
        console.log("✅ Active scene:", active.name);
      }

      // Seleziona automaticamente una scena per visualizzarla
      if (data && data.length > 0) {
        // Priorità: scena attiva, altrimenti la prima
        const sceneToView = active || data[0];
        setViewSceneId(sceneToView.id);
        console.log("🎯 Auto-selected scene:", sceneToView.name, sceneToView.id);
      } else {
        console.log("⚠️ No scenes found");
      }
    } catch (err) {
      console.error("❌ Errore caricamento scene:", err);
    } finally {
      setLoading(false);
    }
  };

  // Crea nuova scena (riceve dati dal CreateSceneForm)
  const handleCreateScene = async (formData) => {
    try {
      // Prepara canvas_state con le impostazioni scelte
      const canvasState = {
        layers: {
          map: { visible: true, locked: false, objects: [] },
          objects: { visible: true, locked: false, objects: [] },
          tokens: { visible: true, locked: false, objects: [] },
          gm: { visible: true, locked: false, objects: [] },
        },
        gridSettings: {
          enabled: formData.gridEnabled,
          type: formData.gridType,
          size: formData.gridSize,
          color: formData.gridColor,
          opacity: formData.gridOpacity,
          snapToGrid: formData.snapToGrid,
          offsetX: 0,
          offsetY: 0,
          scale: formData.gridScale,
          scaleUnit: formData.gridScaleUnit,
        },
        pageSettings: {
          backgroundColor: formData.backgroundColor,
          mapImage: null,
          pageWidth: formData.pageWidth,
          pageHeight: formData.pageHeight,
          fogOfWar: {
            enabled: formData.fogEnabled,
            // Roll20 style: fog inizia completamente nera, il DM rivela man mano con lo strumento Reveal
            revealedAreas: [],
          },
        },
      };

      const { data: scene, error } = await supabase
        .from("scenes")
        .insert({
          campaign_id: campaign.id,
          name: formData.name,
          description: formData.description,
          scene_type: formData.scene_type,
          canvas_state: canvasState,
        })
        .select()
        .single();

      if (error) throw error;

      setScenes([scene, ...scenes]);
      setShowCreateModal(false);

      // Apri editor con la scena appena creata
      setSelectedSceneId(scene.id);
      setEditorMode(true);

      // Se è la prima scena, attivala automaticamente
      if (scenes.length === 0) {
        activateScene(scene.id);
      }
    } catch (err) {
      console.error("Errore creazione scena:", err);
      setModal({
        isOpen: true,
        title: "Errore Creazione",
        message: "Impossibile creare la scena. Riprova più tardi.",
        type: "error",
      });
    }
  };

  // Attiva una scena (mostrerà sulla TV)
  const activateScene = async (sceneId) => {
    try {
      // 1. Marca scena come attiva (trigger SQL disattiva automaticamente le altre)
      const { error: updateError } = await supabase
        .from("scenes")
        .update({ is_active: true })
        .eq("id", sceneId);

      if (updateError) throw updateError;

      // 2. Aggiorna session
      if (session?.id) {
        await supabase
          .from("sessions")
          .update({ current_scene_id: sceneId })
          .eq("id", session.id);
      }

      // 3. Broadcast alla TV
      if (tvChannel) {
        console.log("📡 Broadcasting scene_change:", sceneId);
        await tvChannel.send({
          type: "broadcast",
          event: "scene_change",
          payload: { sceneId },
        });
      }

      setActiveSceneId(sceneId);
      loadScenes(); // Ricarica per aggiornare is_active

      // Notifica il parent component (DMPanel)
      if (onSceneActivated) {
        onSceneActivated(sceneId);
      }
    } catch (err) {
      console.error("Errore attivazione scena:", err);
      setModal({
        isOpen: true,
        title: "Errore Attivazione",
        message: "Impossibile attivare la scena sulla TV. Verifica la connessione.",
        type: "error",
      });
    }
  };

  // Upload mappa per una scena
  const handleMapUpload = async (e, sceneId) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingScene(sceneId);

    try {
      const ext = file.name.split(".").pop();
      const fileName = `${campaign.id}/scene_${sceneId}_${Date.now()}.${ext}`;

      // Upload a Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from("maps")
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from("maps")
        .getPublicUrl(fileName);

      // Aggiorna scena con map_url
      const { error: updateError } = await supabase
        .from("scenes")
        .update({ map_url: publicUrl })
        .eq("id", sceneId);

      if (updateError) throw updateError;

      // Se è la scena attiva, broadcast update
      if (sceneId === activeSceneId && tvChannel) {
        await tvChannel.send({
          type: "broadcast",
          event: "scene_change",
          payload: { sceneId },
        });
      }

      loadScenes();
    } catch (err) {
      console.error("Errore upload mappa:", err);
      setModal({
        isOpen: true,
        title: "Errore Upload",
        message: "Impossibile caricare la mappa. Verifica che il file sia un'immagine valida.",
        type: "error",
      });
    } finally {
      setUploadingScene(null);
    }
  };

  // Elimina scena
  const deleteScene = async (sceneId) => {
    setModal({
      isOpen: true,
      title: "Conferma Eliminazione",
      message: "Sei sicuro di voler eliminare questa scena? Questa azione non può essere annullata.",
      type: "confirm",
      onConfirm: () => confirmDeleteScene(sceneId),
    });
  };

  const confirmDeleteScene = async (sceneId) => {
    if (!sceneId) {
      console.error("sceneId is null or undefined!");
      return;
    }

    try {
      const { error } = await supabase
        .from("scenes")
        .delete()
        .eq("id", sceneId);

      if (error) throw error;

      setScenes(scenes.filter(s => s.id !== sceneId));
      if (activeSceneId === sceneId) {
        setActiveSceneId(null);
      }
    } catch (err) {
      console.error("Errore eliminazione scena:", err);
      setModal({
        isOpen: true,
        title: "Errore Eliminazione",
        message: "Impossibile eliminare la scena. Riprova più tardi.",
        type: "error",
      });
    }
  };

  if (loading) {
    return (
      <div style={{ padding: 20, textAlign: "center", color: "rgba(212,175,55,0.6)" }}>
        Caricamento scene...
      </div>
    );
  }

  const SCENE_TYPE_LABELS = {
    exploration: "Esplorazione",
    combat: "Combattimento",
    social: "💬 Social",
  };

  // Layout Editor Mode (Full Screen Overlay)
  if (editorMode) {
    const selectedScene = scenes.find(s => s.id === selectedSceneId);

    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 9999,
          background: "rgba(0,0,0,0.95)",
          backdropFilter: "blur(8px)",
        }}
      >
        <div style={{ display: "flex", height: "100%", gap: 0 }}>
        {/* SIDEBAR SINISTRA - Lista Scene */}
        <div style={{
          width: 340,
          background: "linear-gradient(180deg, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.25) 100%)",
          borderRight: "1px solid rgba(212,175,55,0.3)",
          display: "flex",
          flexDirection: "column",
          height: "100%",
        }}>
          {/* Header Sidebar */}
          <div style={{
            padding: "16px 20px",
            borderBottom: "1px solid rgba(212,175,55,0.25)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "rgba(212,175,55,0.05)",
            minHeight: 60,
          }}>
            <div>
              <div style={{
                fontFamily: "var(--font-heading)",
                fontSize: "1rem",
                color: "var(--gold)",
                letterSpacing: "0.05em",
                fontWeight: 600,
              }}>
                SCENE LIBRARY
              </div>
              <div style={{
                fontSize: "0.7rem",
                color: "rgba(255,255,255,0.4)",
                marginTop: 2,
              }}>
                {scenes.length} {scenes.length === 1 ? "scena" : "scene"}
              </div>
            </div>
            <motion.button
              onClick={() => {
                setEditorMode(false);
                if (onEditorClose) onEditorClose();
              }}
              whileHover={{ scale: 1.1, color: "rgba(255,255,255,0.8)" }}
              whileTap={{ scale: 0.9 }}
              style={{
                background: "none",
                border: "none",
                color: "rgba(255,255,255,0.5)",
                cursor: "pointer",
                fontSize: "1.3rem",
                padding: 6,
                lineHeight: 1,
              }}
            >
              ✕
            </motion.button>
          </div>

          {/* Lista Scene Compatta */}
          <div style={{
            flex: 1,
            overflowY: "auto",
            padding: "16px",
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}>
            {scenes.length === 0 && (
              <div style={{
                padding: "40px 20px",
                textAlign: "center",
                color: "rgba(255,255,255,0.35)",
                fontSize: "0.85rem",
                lineHeight: 1.8,
              }}>
                <div style={{ fontSize: "2rem", marginBottom: 12, opacity: 0.3 }}>📚</div>
                Nessuna scena disponibile.<br />
                Crea la tua prima scena per iniziare.
              </div>
            )}

            {scenes.map(scene => (
              <motion.div
                key={scene.id}
                onClick={() => setSelectedSceneId(scene.id)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setContextMenu({
                    x: e.clientX,
                    y: e.clientY,
                    sceneId: scene.id,
                  });
                }}
                whileHover={{ scale: 1.01, boxShadow: "0 4px 12px rgba(0,0,0,0.3)" }}
                whileTap={{ scale: 0.98 }}
                style={{
                  background: selectedSceneId === scene.id
                    ? "linear-gradient(135deg, rgba(212,175,55,0.18) 0%, rgba(212,175,55,0.08) 100%)"
                    : "rgba(255,255,255,0.04)",
                  border: selectedSceneId === scene.id
                    ? "1px solid rgba(212,175,55,0.6)"
                    : "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 10,
                  padding: 12,
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  position: "relative",
                }}
              >
                {scene.map_url && (
                  <div style={{
                    width: "100%",
                    height: 70,
                    borderRadius: 6,
                    overflow: "hidden",
                    marginBottom: 8,
                    background: "#000",
                    border: "1px solid rgba(255,255,255,0.1)",
                  }}>
                    <img
                      src={scene.map_url}
                      alt={scene.name}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                      }}
                    />
                  </div>
                )}
                <div style={{
                  fontFamily: "var(--font-body)",
                  fontSize: "0.9rem",
                  color: selectedSceneId === scene.id ? "var(--gold)" : "rgba(255,255,255,0.85)",
                  fontWeight: selectedSceneId === scene.id ? 600 : 500,
                  marginBottom: 4,
                }}>
                  {scene.name}
                </div>
                <div style={{
                  fontSize: "0.7rem",
                  color: "rgba(255,255,255,0.4)",
                }}>
                  {SCENE_TYPE_LABELS[scene.scene_type]}
                </div>
                {scene.is_active && (
                  <div style={{
                    position: "absolute",
                    top: 8,
                    right: 8,
                    fontSize: "0.65rem",
                    color: "#4CAF50",
                    background: "rgba(76,175,80,0.15)",
                    padding: "3px 8px",
                    borderRadius: 4,
                    fontWeight: 600,
                    border: "1px solid rgba(76,175,80,0.3)",
                  }}>
                    ● LIVE
                  </div>
                )}
              </motion.div>
            ))}

            {/* Bottone Nuova Scena */}
            <motion.button
              onClick={() => setShowCreateModal(true)}
              whileHover={{ scale: 1.02, borderColor: "rgba(212,175,55,0.4)" }}
              whileTap={{ scale: 0.98 }}
              className="btn btn-ghost"
              style={{
                fontSize: "0.85rem",
                padding: "14px",
                marginTop: 8,
                borderStyle: "dashed",
                borderWidth: "2px",
                borderColor: "rgba(212,175,55,0.25)",
                color: "rgba(212,175,55,0.7)",
                fontWeight: 600,
              }}
            >
              + Crea Nuova Scena
            </motion.button>
          </div>
        </div>

        {/* CANVAS DESTRA - Editor Scena */}
        <div style={{
          flex: 1,
          background: "linear-gradient(180deg, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.05) 100%)",
          display: "flex",
          flexDirection: "column",
          height: "100%",
        }}>
          {/* Header Canvas */}
          <div style={{
            padding: "16px 24px",
            borderBottom: "1px solid rgba(212,175,55,0.25)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "rgba(212,175,55,0.05)",
            minHeight: 60,
          }}>
            <div>
              <div style={{
                fontFamily: "var(--font-heading)",
                fontSize: "1.1rem",
                color: "var(--gold)",
                fontWeight: 600,
                letterSpacing: "0.02em",
              }}>
                {selectedScene?.name || "SCENE EDITOR"}
              </div>
              {selectedScene && (
                <div style={{
                  fontSize: "0.7rem",
                  color: "rgba(255,255,255,0.4)",
                  marginTop: 2,
                }}>
                  {SCENE_TYPE_LABELS[selectedScene.scene_type]}
                </div>
              )}
            </div>

            {selectedScene && (
              <div style={{ display: "flex", gap: 10 }}>
                {/* Open TV Button */}
                <motion.button
                  onClick={() => {
                    if (!campaign?.join_code) {
                      console.error("❌ Join code not found");
                      return;
                    }
                    const tvUrl = `${window.location.origin}/?tv&c=${campaign.join_code}`;
                    window.open(tvUrl, '_blank');
                    console.log("📺 TV tab opened:", tvUrl);
                  }}
                  whileHover={{ scale: 1.05, boxShadow: "0 0 20px rgba(212,175,55,0.4)" }}
                  whileTap={{ scale: 0.95 }}
                  className="btn btn-gold"
                  style={{
                    fontSize: "0.85rem",
                    padding: "10px 18px",
                    fontWeight: 600,
                    boxShadow: "0 0 20px rgba(212,175,55,0.3)",
                  }}
                >
                  Apri TV
                </motion.button>
              </div>
            )}
          </div>

          {/* Area Canvas - NUOVO EDITOR AVANZATO */}
          <div style={{
            flex: 1,
            display: "flex",
            alignItems: selectedScene ? "stretch" : "center",
            justifyContent: selectedScene ? "stretch" : "center",
            overflow: "hidden",
          }}>
            {selectedScene ? (
              <div style={{ width: "100%", height: "100%", display: "flex" }}>
                <PageCanvas
                  scene={selectedScene}
                  campaign={campaign}
                  mode="edit"
                  tvChannel={tvChannel}
                  onUpdate={(updates) => {
                    // TODO: Save grid settings to database
                    console.log("Scene updated:", updates);
                  }}
                />
              </div>
            ) : showCreateModal ? (
              // Form creazione scena - NEW ACCORDION STYLE
              <>
              <style>{`
                .hide-scrollbar::-webkit-scrollbar {
                  display: none;
                }
                .hide-scrollbar {
                  -ms-overflow-style: none;
                  scrollbar-width: none;
                }
              `}</style>
              <motion.div
                initial={{ scale: 0.96, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="hide-scrollbar"
                style={{
                  background: "linear-gradient(180deg, rgba(26,22,18,0.98) 0%, rgba(18,15,12,0.98) 100%)",
                  border: "1px solid rgba(212,175,55,0.2)",
                  borderRadius: 12,
                  padding: "40px",
                  width: 600,
                  maxWidth: "90%",
                  maxHeight: "90vh",
                  overflowY: "auto",
                  boxShadow: "0 20px 60px rgba(0,0,0,0.9)",
                  position: "relative",
                }}
              >
                {/* Close button */}
                <button
                  onClick={() => setShowCreateModal(false)}
                  style={{
                    position: "absolute",
                    top: 16,
                    right: 16,
                    background: "none",
                    border: "none",
                    color: "rgba(255,255,255,0.5)",
                    fontSize: "1.5rem",
                    cursor: "pointer",
                    transition: "color 0.2s ease",
                  }}
                  onMouseEnter={(e) => e.target.style.color = "rgba(255,255,255,0.8)"}
                  onMouseLeave={(e) => e.target.style.color = "rgba(255,255,255,0.5)"}
                >
                  ×
                </button>

                {/* Header */}
                <h2 style={{
                  margin: 0,
                  marginBottom: 32,
                  fontFamily: "var(--font-heading)",
                  fontSize: "2rem",
                  color: "var(--gold)",
                  fontWeight: 700,
                  letterSpacing: "0.1em",
                  textAlign: "center",
                  textTransform: "uppercase",
                  borderBottom: `2px solid var(--gold)`,
                  paddingBottom: 16,
                }}>
                  Crea Nuova Scena
                </h2>

                <CreateSceneForm
                  onSubmit={handleCreateScene}
                  onCancel={() => setShowCreateModal(false)}
                />
              </motion.div>
              </>
            ) : (
              // Stato vuoto - Nessuna scena selezionata CON SFONDO
              <div style={{
                position: "relative",
                width: "100%",
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}>
                {/* Background Image */}
                <img
                  src="/bg/custom_exploration.png"
                  alt="Background"
                  style={{
                    position: "absolute",
                    inset: 0,
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    opacity: 0.6,
                    filter: "blur(1px) brightness(0.7)",
                    pointerEvents: "none",
                  }}
                  onError={(e) => {
                    console.error("Failed to load image:", e);
                    e.target.style.display = "none";
                  }}
                />

                {/* Dark overlay */}
                <div style={{
                  position: "absolute",
                  inset: 0,
                  background: "radial-gradient(circle at center, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.5) 100%)",
                  pointerEvents: "none",
                }} />

                {/* Content */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                  style={{
                    position: "relative",
                    zIndex: 1,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 32,
                    maxWidth: 600,
                    textAlign: "center",
                    padding: "40px",
                    background: "rgba(0,0,0,0.6)",
                    backdropFilter: "blur(10px)",
                    borderRadius: 16,
                    border: "1px solid rgba(212,175,55,0.2)",
                  }}
                >
                  <div>
                    <div style={{
                      color: "var(--gold)",
                      fontSize: "2rem",
                      fontFamily: "var(--font-heading)",
                      fontWeight: 700,
                      marginBottom: 16,
                      letterSpacing: "0.05em",
                      textTransform: "uppercase",
                      textShadow: "0 0 20px rgba(212,175,55,0.5)",
                    }}>
                      Scene Editor
                    </div>
                    <div style={{
                      color: "rgba(255,255,255,0.7)",
                      fontSize: "1.05rem",
                      lineHeight: 1.8,
                      maxWidth: 480,
                    }}>
                      Seleziona una scena dalla sidebar per visualizzarla e modificarla,<br />
                      oppure crea una nuova scena per iniziare la tua avventura.
                    </div>
                  </div>

                  <motion.button
                    onClick={() => setShowCreateModal(true)}
                    whileHover={{
                      scale: 1.05,
                      boxShadow: "0 0 40px rgba(212,175,55,0.6), 0 8px 30px rgba(0,0,0,0.4)"
                    }}
                    whileTap={{ scale: 0.95 }}
                    style={{
                      fontSize: "1.1rem",
                      padding: "18px 48px",
                      fontWeight: 700,
                      fontFamily: "var(--font-heading)",
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      background: "linear-gradient(135deg, #d4af37 0%, #b8941f 100%)",
                      color: "#000",
                      border: "none",
                      borderRadius: 10,
                      cursor: "pointer",
                      boxShadow: "0 4px 20px rgba(212,175,55,0.4)",
                      transition: "all 0.2s ease",
                    }}
                  >
                    + Crea Prima Scena
                  </motion.button>
                </motion.div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Context Menu */}
      <AnimatePresence>
        {contextMenu && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            onClick={() => setContextMenu(null)}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 10000,
            }}
          >
            <motion.div
              onClick={(e) => e.stopPropagation()}
              style={{
                position: "absolute",
                left: contextMenu.x,
                top: contextMenu.y,
                background: "linear-gradient(145deg, rgba(30,25,20,0.98), rgba(20,15,12,0.98))",
                border: "2px solid rgba(212,175,55,0.4)",
                borderRadius: 12,
                padding: "8px",
                minWidth: 200,
                boxShadow: "0 8px 32px rgba(0,0,0,0.8)",
              }}
            >
              <motion.button
                whileHover={{ background: "rgba(212,175,55,0.2)" }}
                onClick={() => {
                  const scene = scenes.find(s => s.id === contextMenu.sceneId);
                  if (onEditScene) {
                    onEditScene(scene);
                  } else {
                    setSelectedSceneId(scene.id);
                    setEditorMode(true);
                  }
                  setContextMenu(null);
                }}
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  background: "transparent",
                  border: "none",
                  color: "var(--gold)",
                  textAlign: "left",
                  cursor: "pointer",
                  borderRadius: 8,
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                }}
              >
Apri Editor
              </motion.button>

              <div style={{
                height: 1,
                background: "rgba(212,175,55,0.2)",
                margin: "6px 0",
              }} />

              <motion.button
                whileHover={{ background: "rgba(255,0,0,0.2)" }}
                onClick={() => {
                  deleteScene(contextMenu.sceneId);
                  setContextMenu(null);
                }}
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  background: "transparent",
                  border: "none",
                  color: "#ff4444",
                  textAlign: "left",
                  cursor: "pointer",
                  borderRadius: 8,
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                Elimina Scena
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal Professionale */}
      <Modal
        isOpen={modal.isOpen}
        onClose={() => setModal({ ...modal, isOpen: false })}
        title={modal.title}
        message={modal.message}
        type={modal.type}
        onConfirm={modal.onConfirm}
      />
      </motion.div>
    );
  }

  // Durante preparing, non mostrare la lista normale (solo editor)
  if (sessionState === "preparing") {
    console.log("SceneManager: sessionState is 'preparing', returning null");
    return null;
  }

  // Layout Lista Normale - 2 COLONNE
  const viewScene = scenes.find(s => s.id === viewSceneId);
  console.log("SceneManager rendering - viewSceneId:", viewSceneId, "viewScene:", viewScene?.name, "scenes:", scenes.length);

  return (
    <div style={{ display: "flex", height: "100%", gap: 0 }}>
      {/* COLONNA SINISTRA - Lista Scene */}
      <div style={{
        width: 320,
        minWidth: 320,
        display: "flex",
        flexDirection: "column",
        gap: 15,
        borderRight: "1px solid rgba(212,175,55,0.3)",
        paddingRight: 15,
      }}>
        {/* Header */}
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "0 5px",
        }}>
          <h3 style={{
            margin: 0,
            fontFamily: "var(--font-heading)",
            fontSize: "1.1rem",
            color: "var(--gold)",
          }}>
             Scene Manager
          </h3>
          <button
            onClick={() => {
              setEditorMode(true);
              setSelectedSceneId(null);
              setShowCreateModal(true);
            }}
            className="btn btn-primary"
            style={{ fontSize: "0.85rem", padding: "8px 16px" }}
          >
            + Nuova Scena
          </button>
        </div>

        {/* Lista Scene */}
        <div style={{
          flex: 1,
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}>
        {scenes.length === 0 && (
          <div style={{
            padding: 30,
            textAlign: "center",
            color: "rgba(255,255,255,0.4)",
            fontSize: "0.9rem",
          }}>
            Nessuna scena creata.<br />
            Clicca "+ Nuova Scena" per iniziare
          </div>
        )}

        {scenes.map((scene) => (
          <motion.div
            key={scene.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={() => setViewSceneId(scene.id)}
            style={{
              background: viewSceneId === scene.id
                ? "linear-gradient(135deg, rgba(212,175,55,0.15), rgba(212,175,55,0.05))"
                : scene.is_active
                ? "linear-gradient(135deg, rgba(76,175,80,0.15), rgba(76,175,80,0.05))"
                : "rgba(255,255,255,0.03)",
              border: viewSceneId === scene.id
                ? "2px solid rgba(212,175,55,0.6)"
                : scene.is_active
                ? "2px solid rgba(76,175,80,0.6)"
                : "1px solid rgba(255,255,255,0.1)",
              borderRadius: 12,
              padding: 12,
              position: "relative",
              transition: "all 0.3s ease",
              cursor: "pointer",
            }}
          >
            {/* Badge "ACTIVE" */}
            {scene.is_active && (
              <div style={{
                position: "absolute",
                top: -8,
                right: 12,
                background: "linear-gradient(135deg, #d4af37, #b8941f)",
                color: "#000",
                padding: "3px 10px",
                borderRadius: 4,
                fontSize: "0.65rem",
                fontWeight: 700,
                letterSpacing: "0.05em",
              }}>
● LIVE
              </div>
            )}

            {/* Preview mappa (se presente) */}
            {scene.map_url && (
              <div style={{
                width: "100%",
                height: 120,
                borderRadius: 8,
                overflow: "hidden",
                marginBottom: 10,
                background: "#000",
                border: "1px solid rgba(255,255,255,0.1)",
              }}>
                <img
                  src={scene.map_url}
                  alt={scene.name}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                  }}
                />
              </div>
            )}

            {/* Nome e Tipo */}
            <div style={{ marginBottom: 8 }}>
              <div style={{
                fontFamily: "var(--font-heading)",
                fontSize: "1rem",
                color: "var(--gold)",
                marginBottom: 4,
              }}>
                {scene.name}
              </div>
              <div style={{
                fontSize: "0.75rem",
                color: "rgba(255,255,255,0.5)",
              }}>
                {SCENE_TYPE_LABELS[scene.scene_type] || scene.scene_type}
              </div>
            </div>

            {/* Descrizione */}
            {scene.description && (
              <div style={{
                fontSize: "0.75rem",
                color: "rgba(255,255,255,0.4)",
                marginBottom: 10,
                fontStyle: "italic",
              }}>
                {scene.description}
              </div>
            )}

            {/* Azioni */}
            <div style={{
              display: "flex",
              gap: 6,
              flexWrap: "wrap",
            }}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedSceneId(scene.id);
                  setEditorMode(true);
                }}
                className="btn btn-ghost"
                style={{
                  flex: 1,
                  fontSize: "0.75rem",
                  padding: "8px 12px",
                }}
              >
Editor
              </button>

              <label style={{ flex: 1 }}>
                <input
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={(e) => handleMapUpload(e, scene.id)}
                  disabled={uploadingScene === scene.id}
                />
                <button
                  as="span"
                  className="btn btn-ghost"
                  disabled={uploadingScene === scene.id}
                  style={{
                    width: "100%",
                    fontSize: "0.75rem",
                    padding: "8px 12px",
                    pointerEvents: uploadingScene === scene.id ? "none" : "auto",
                  }}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    e.target.parentElement.querySelector('input[type="file"]').click();
                  }}
                >
                  {uploadingScene === scene.id
                    ? "⏳ Upload..."
                    : scene.map_url
                    ? "📤 Mappa"
                    : "📤 Mappa"}
                </button>
              </label>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deleteScene(scene.id);
                }}
                className="btn btn-ghost"
                style={{
                  fontSize: "0.75rem",
                  padding: "8px 12px",
                  color: "#c92a2a",
                }}
              >
                ×
              </button>
            </div>
          </motion.div>
        ))}
        </div>
      </div>

      {/* COLONNA DESTRA - Visualizza Scena */}
      <div style={{
        flex: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        background: "rgba(0,0,0,0.3)",
      }}>
        {viewScene ? (
          <div style={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            gap: 15,
          }}>
            {/* Header Scena */}
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              paddingBottom: 15,
              borderBottom: "1px solid rgba(212,175,55,0.3)",
            }}>
              <div>
                <h2 style={{
                  margin: 0,
                  fontFamily: "var(--font-heading)",
                  fontSize: "1.5rem",
                  color: "var(--gold)",
                }}>
                  {viewScene.name}
                </h2>
                {viewScene.description && (
                  <p style={{
                    margin: "5px 0 0",
                    fontSize: "0.85rem",
                    color: "rgba(255,255,255,0.6)",
                  }}>
                    {viewScene.description}
                  </p>
                )}
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                {!viewScene.is_active && (
                  <button
                    onClick={() => activateScene(viewScene.id)}
                    className="btn btn-primary"
                    style={{
                      fontSize: "0.85rem",
                      padding: "10px 18px",
                      background: "linear-gradient(135deg, #4CAF50, #45a049)",
                    }}
                  >
                    Attiva su TV
                  </button>
                )}
                <button
                  onClick={() => {
                    setSelectedSceneId(viewScene.id);
                    setEditorMode(true);
                  }}
                  className="btn btn-primary"
                  style={{ fontSize: "0.85rem", padding: "10px 18px" }}
                >
                  Modifica
                </button>
              </div>
            </div>

            {/* Preview Mappa */}
            <div style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "#000",
              borderRadius: 12,
              overflow: "hidden",
              border: "2px solid rgba(212,175,55,0.3)",
            }}>
              {viewScene.map_url ? (
                <img
                  src={viewScene.map_url}
                  alt={viewScene.name}
                  style={{
                    maxWidth: "100%",
                    maxHeight: "100%",
                    objectFit: "contain",
                  }}
                />
              ) : (
                <div style={{
                  textAlign: "center",
                  color: "rgba(255,255,255,0.4)",
                }}>
                  <div style={{ fontSize: "4rem", marginBottom: 15 }}>📍</div>
                  <div style={{ fontSize: "1rem" }}>Nessuna mappa caricata</div>
                  <div style={{ fontSize: "0.85rem", marginTop: 5 }}>
                    Clicca "Modifica" per aggiungere una mappa
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div style={{
            textAlign: "center",
            color: "rgba(255,255,255,0.4)",
          }}>
            <div style={{ fontSize: "5rem", marginBottom: 20, opacity: 0.3 }}>🎬</div>
            <div style={{ fontSize: "1.2rem", marginBottom: 10 }}>
              Seleziona una scena per visualizzarla
            </div>
            <div style={{ fontSize: "0.9rem" }}>
              Clicca su una scena dalla lista per vederla al centro
            </div>
          </div>
        )}
      </div>

      {/* Context Menu */}
      <AnimatePresence>
        {contextMenu && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            onClick={() => setContextMenu(null)}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 10000,
            }}
          >
            <motion.div
              onClick={(e) => e.stopPropagation()}
              style={{
                position: "absolute",
                left: contextMenu.x,
                top: contextMenu.y,
                background: "linear-gradient(145deg, rgba(30,25,20,0.98), rgba(20,15,12,0.98))",
                border: "2px solid rgba(212,175,55,0.4)",
                borderRadius: 12,
                padding: "8px",
                minWidth: 200,
                boxShadow: "0 8px 32px rgba(0,0,0,0.8)",
              }}
            >
              <motion.button
                whileHover={{ background: "rgba(212,175,55,0.2)" }}
                onClick={() => {
                  const scene = scenes.find(s => s.id === contextMenu.sceneId);
                  if (onEditScene) {
                    onEditScene(scene);
                  } else {
                    setSelectedSceneId(contextMenu.sceneId);
                    setEditorMode(true);
                  }
                  setContextMenu(null);
                }}
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  background: "transparent",
                  border: "none",
                  color: "var(--gold)",
                  textAlign: "left",
                  cursor: "pointer",
                  borderRadius: 8,
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                }}
              >
Apri Editor
              </motion.button>

              <div style={{
                height: 1,
                background: "rgba(212,175,55,0.2)",
                margin: "6px 0",
              }} />

              <motion.button
                whileHover={{ background: "rgba(255,0,0,0.2)" }}
                onClick={() => {
                  deleteScene(contextMenu.sceneId);
                  setContextMenu(null);
                }}
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  background: "transparent",
                  border: "none",
                  color: "#ff4444",
                  textAlign: "left",
                  cursor: "pointer",
                  borderRadius: 8,
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                Elimina Scena
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal Professionale */}
      <Modal
        isOpen={modal.isOpen}
        onClose={() => setModal({ ...modal, isOpen: false })}
        title={modal.title}
        message={modal.message}
        type={modal.type}
        onConfirm={modal.onConfirm}
      />
    </div>
  );
}
