// ═══════════════════════════════════════════════════════════
//  SceneManager — Gestione Scene VTT (stile Foundry VTT)
//  Permette al DM di creare, modificare e attivare scene
// ═══════════════════════════════════════════════════════════

import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { motion, AnimatePresence } from "framer-motion";

export default function SceneManager({ campaign, session, tvChannel }) {
  const [scenes, setScenes] = useState([]);
  const [activeSceneId, setActiveSceneId] = useState(null);
  const [selectedSceneId, setSelectedSceneId] = useState(null); // Scena selezionata per anteprima
  const [loading, setLoading] = useState(true);
  const [uploadingScene, setUploadingScene] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newSceneData, setNewSceneData] = useState({
    name: "",
    description: "",
    scene_type: "exploration",
  });

  // Carica scene della campagna
  useEffect(() => {
    if (campaign?.id) {
      loadScenes();
    }
  }, [campaign?.id]);

  // Seleziona automaticamente la scena attiva o la prima scena
  useEffect(() => {
    if (scenes.length > 0 && !selectedSceneId) {
      const activeScene = scenes.find(s => s.is_active);
      setSelectedSceneId(activeScene?.id || scenes[0].id);
    }
  }, [scenes, selectedSceneId]);

  const loadScenes = async () => {
    try {
      const { data, error } = await supabase
        .from("scenes")
        .select("*")
        .eq("campaign_id", campaign.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setScenes(data || []);

      // Trova scena attiva
      const active = data?.find(s => s.is_active);
      if (active) {
        setActiveSceneId(active.id);
      }
    } catch (err) {
      console.error("Errore caricamento scene:", err);
    } finally {
      setLoading(false);
    }
  };

  // Crea nuova scena
  const handleCreateScene = async (e) => {
    e.preventDefault();

    if (!newSceneData.name.trim()) return;

    try {
      const { data: scene, error } = await supabase
        .from("scenes")
        .insert({
          campaign_id: campaign.id,
          name: newSceneData.name,
          description: newSceneData.description,
          scene_type: newSceneData.scene_type,
        })
        .select()
        .single();

      if (error) throw error;

      setScenes([scene, ...scenes]);
      setShowCreateModal(false);
      setNewSceneData({ name: "", description: "", scene_type: "exploration" });
    } catch (err) {
      console.error("Errore creazione scena:", err);
      alert("Errore nella creazione della scena");
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
    } catch (err) {
      console.error("Errore attivazione scena:", err);
      alert("Errore nell'attivazione della scena");
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
      alert("Errore nel caricamento della mappa");
    } finally {
      setUploadingScene(null);
    }
  };

  // Elimina scena
  const deleteScene = async (sceneId) => {
    if (!confirm("Sei sicuro di voler eliminare questa scena?")) return;

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
      alert("Errore nell'eliminazione della scena");
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
    exploration: "🗺️ Esplorazione",
    combat: "⚔️ Combattimento",
    social: "💬 Social",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 15, height: "100%" }}>
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
          🎬 Scene Manager
        </h3>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn btn-primary"
          style={{ fontSize: "0.85rem", padding: "8px 16px" }}
        >
          + Nuova Scena
        </button>
      </div>

      {/* Layout a 2 colonne: Anteprima SINISTRA + Card DESTRA */}
      <div style={{
        flex: 1,
        display: "flex",
        gap: 20,
        overflow: "hidden",
      }}>
        {/* COLONNA SINISTRA: Anteprima Scena */}
        <div style={{
          flex: "1 1 70%",
          display: "flex",
          flexDirection: "column",
          gap: 15,
          overflow: "auto",
        }}>
          {!selectedSceneId && scenes.length === 0 && (
            <div style={{
              padding: 60,
              textAlign: "center",
              color: "rgba(255,255,255,0.4)",
              fontSize: "1rem",
            }}>
              Nessuna scena creata.<br />
              Clicca "+ Nuova Scena" per iniziare
            </div>
          )}

          {!selectedSceneId && scenes.length > 0 && (
            <div style={{
              padding: 60,
              textAlign: "center",
              color: "rgba(255,255,255,0.4)",
              fontSize: "1rem",
            }}>
              Seleziona una scena dalla lista a destra →
            </div>
          )}

          {selectedSceneId && (() => {
            const scene = scenes.find(s => s.id === selectedSceneId);
            if (!scene) return null;

            return (
              <div style={{
                background: scene.is_active
                  ? "linear-gradient(135deg, rgba(212,175,55,0.15), rgba(212,175,55,0.05))"
                  : "rgba(255,255,255,0.03)",
                border: scene.is_active
                  ? "2px solid rgba(212,175,55,0.6)"
                  : "1px solid rgba(255,255,255,0.1)",
                borderRadius: 12,
                padding: 20,
                position: "relative",
              }}>
                {/* Badge LIVE */}
                {scene.is_active && (
                  <div style={{
                    position: "absolute",
                    top: -12,
                    right: 20,
                    background: "linear-gradient(135deg, #d4af37, #b8941f)",
                    color: "#000",
                    padding: "6px 16px",
                    borderRadius: 6,
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    letterSpacing: "0.1em",
                  }}>
                    🔴 LIVE SU TV
                  </div>
                )}

                {/* Mappa Grande */}
                {scene.map_url ? (
                  <div style={{
                    width: "100%",
                    aspectRatio: "16/9",
                    borderRadius: 12,
                    overflow: "hidden",
                    marginBottom: 20,
                    background: "#000",
                    border: "2px solid rgba(255,255,255,0.1)",
                  }}>
                    <img
                      src={scene.map_url}
                      alt={scene.name}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "contain",
                      }}
                    />
                  </div>
                ) : (
                  <div style={{
                    width: "100%",
                    aspectRatio: "16/9",
                    borderRadius: 12,
                    marginBottom: 20,
                    background: "rgba(0,0,0,0.3)",
                    border: "2px dashed rgba(255,255,255,0.2)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "rgba(255,255,255,0.3)",
                    fontSize: "1rem",
                  }}>
                    Nessuna mappa caricata
                  </div>
                )}

                {/* Nome e Tipo */}
                <div style={{ marginBottom: 15 }}>
                  <div style={{
                    fontFamily: "var(--font-heading)",
                    fontSize: "1.5rem",
                    color: "var(--gold)",
                    marginBottom: 8,
                  }}>
                    {scene.name}
                  </div>
                  <div style={{
                    fontSize: "0.9rem",
                    color: "rgba(255,255,255,0.5)",
                  }}>
                    {SCENE_TYPE_LABELS[scene.scene_type] || scene.scene_type}
                  </div>
                </div>

                {/* Descrizione */}
                {scene.description && (
                  <div style={{
                    fontSize: "0.9rem",
                    color: "rgba(255,255,255,0.6)",
                    marginBottom: 20,
                    fontStyle: "italic",
                    lineHeight: 1.5,
                  }}>
                    {scene.description}
                  </div>
                )}

                {/* Azioni */}
                <div style={{
                  display: "flex",
                  gap: 10,
                  flexWrap: "wrap",
                }}>
                  {!scene.is_active && (
                    <button
                      onClick={() => activateScene(scene.id)}
                      className="btn btn-primary"
                      style={{
                        flex: "1 1 auto",
                        fontSize: "0.9rem",
                        padding: "12px 20px",
                        background: "linear-gradient(135deg, #d4af37, #b8941f)",
                        color: "#000",
                      }}
                    >
                      📺 Attiva su TV
                    </button>
                  )}

                  {scene.is_active && (
                    <button
                      className="btn btn-ghost"
                      disabled
                      style={{
                        flex: "1 1 auto",
                        fontSize: "0.9rem",
                        padding: "12px 20px",
                        opacity: 0.5,
                      }}
                    >
                      ✅ Scena Attiva
                    </button>
                  )}

                  <label style={{ flex: "1 1 auto" }}>
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
                        fontSize: "0.9rem",
                        padding: "12px 20px",
                        pointerEvents: uploadingScene === scene.id ? "none" : "auto",
                      }}
                      onClick={(e) => {
                        e.preventDefault();
                        e.target.parentElement.querySelector('input[type="file"]').click();
                      }}
                    >
                      {uploadingScene === scene.id
                        ? "⏳ Caricamento..."
                        : scene.map_url
                        ? "🗺️ Cambia Mappa"
                        : "📤 Carica Mappa"}
                    </button>
                  </label>

                  <button
                    onClick={() => deleteScene(scene.id)}
                    className="btn btn-ghost"
                    style={{
                      padding: "12px 20px",
                      color: "rgba(220,60,60,0.8)",
                    }}
                  >
                    🗑️ Elimina
                  </button>
                </div>
              </div>
            );
          })()}
        </div>

        {/* COLONNA DESTRA: Lista Card Scene */}
        <div style={{
          flex: "0 0 280px",
          display: "flex",
          flexDirection: "column",
          gap: 10,
          overflowY: "auto",
          padding: "5px",
        }}>

        {scenes.map((scene) => (
          <motion.div
            key={scene.id}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            onClick={() => setSelectedSceneId(scene.id)}
            style={{
              background: selectedSceneId === scene.id
                ? "linear-gradient(135deg, rgba(212,175,55,0.2), rgba(212,175,55,0.1))"
                : scene.is_active
                ? "linear-gradient(135deg, rgba(212,175,55,0.1), rgba(212,175,55,0.05))"
                : "rgba(255,255,255,0.03)",
              border: selectedSceneId === scene.id
                ? "2px solid rgba(212,175,55,0.8)"
                : scene.is_active
                ? "1px solid rgba(212,175,55,0.4)"
                : "1px solid rgba(255,255,255,0.1)",
              borderRadius: 8,
              padding: 10,
              position: "relative",
              transition: "all 0.2s ease",
              cursor: "pointer",
            }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {/* Badge LIVE */}
            {scene.is_active && (
              <div style={{
                position: "absolute",
                top: -6,
                right: 6,
                background: "linear-gradient(135deg, #d4af37, #b8941f)",
                color: "#000",
                padding: "2px 8px",
                borderRadius: 4,
                fontSize: "0.55rem",
                fontWeight: 700,
                letterSpacing: "0.05em",
              }}>
                🔴 LIVE
              </div>
            )}

            {/* Preview mini mappa */}
            {scene.map_url && (
              <div style={{
                width: "100%",
                aspectRatio: "16/9",
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

            {/* Nome e Tipo */}
            <div>
              <div style={{
                fontFamily: "var(--font-heading)",
                fontSize: "0.85rem",
                color: "var(--gold)",
                marginBottom: 2,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}>
                {scene.name}
              </div>
              <div style={{
                fontSize: "0.65rem",
                color: "rgba(255,255,255,0.4)",
              }}>
                {SCENE_TYPE_LABELS[scene.scene_type] || scene.scene_type}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
      </div>

      {/* Modal Creazione Scena */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.85)",
              backdropFilter: "blur(8px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 1000,
            }}
            onClick={() => setShowCreateModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                background: "linear-gradient(135deg, rgba(30,25,20,0.95), rgba(20,15,12,0.95))",
                border: "1px solid rgba(212,175,55,0.4)",
                borderRadius: 16,
                padding: 30,
                maxWidth: 500,
                width: "90%",
                boxShadow: "0 0 60px rgba(212,175,55,0.2)",
              }}
            >
              <h2 style={{
                margin: "0 0 20px 0",
                fontFamily: "var(--font-heading)",
                fontSize: "1.5rem",
                color: "var(--gold)",
              }}>
                Crea Nuova Scena
              </h2>

              <form onSubmit={handleCreateScene}>
                <div style={{ marginBottom: 15 }}>
                  <label style={{
                    display: "block",
                    marginBottom: 6,
                    fontSize: "0.85rem",
                    color: "rgba(255,255,255,0.7)",
                  }}>
                    Nome Scena *
                  </label>
                  <input
                    type="text"
                    value={newSceneData.name}
                    onChange={(e) => setNewSceneData({ ...newSceneData, name: e.target.value })}
                    placeholder="es: Goblin Ambush, Royal Tavern..."
                    required
                    autoFocus
                    style={{
                      width: "100%",
                      padding: 12,
                      background: "rgba(0,0,0,0.5)",
                      border: "1px solid rgba(255,255,255,0.2)",
                      borderRadius: 8,
                      color: "#fff",
                      fontSize: "1rem",
                    }}
                  />
                </div>

                <div style={{ marginBottom: 15 }}>
                  <label style={{
                    display: "block",
                    marginBottom: 6,
                    fontSize: "0.85rem",
                    color: "rgba(255,255,255,0.7)",
                  }}>
                    Tipo Scena
                  </label>
                  <select
                    value={newSceneData.scene_type}
                    onChange={(e) => setNewSceneData({ ...newSceneData, scene_type: e.target.value })}
                    style={{
                      width: "100%",
                      padding: 12,
                      background: "rgba(0,0,0,0.5)",
                      border: "1px solid rgba(255,255,255,0.2)",
                      borderRadius: 8,
                      color: "#fff",
                      fontSize: "1rem",
                    }}
                  >
                    <option value="exploration">🗺️ Esplorazione</option>
                    <option value="combat">⚔️ Combattimento</option>
                    <option value="social">💬 Social</option>
                  </select>
                </div>

                <div style={{ marginBottom: 20 }}>
                  <label style={{
                    display: "block",
                    marginBottom: 6,
                    fontSize: "0.85rem",
                    color: "rgba(255,255,255,0.7)",
                  }}>
                    Descrizione (opzionale)
                  </label>
                  <textarea
                    value={newSceneData.description}
                    onChange={(e) => setNewSceneData({ ...newSceneData, description: e.target.value })}
                    placeholder="Breve descrizione della scena..."
                    rows={3}
                    style={{
                      width: "100%",
                      padding: 12,
                      background: "rgba(0,0,0,0.5)",
                      border: "1px solid rgba(255,255,255,0.2)",
                      borderRadius: 8,
                      color: "#fff",
                      fontSize: "0.9rem",
                      resize: "vertical",
                    }}
                  />
                </div>

                <div style={{
                  display: "flex",
                  gap: 10,
                  justifyContent: "flex-end",
                }}>
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="btn btn-ghost"
                  >
                    Annulla
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                  >
                    Crea Scena
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
