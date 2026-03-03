// ═══════════════════════════════════════════════
//  AdventureManager — Gestione Avventure per DM
//  Libreria avventure, controllo scene, progressi
// ═══════════════════════════════════════════════

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../lib/supabase.js";
import { ADVENTURES, getAdventure, getScene } from "../shared/constants/adventures.js";
import ModalDialog from "../shared/components/ModalDialog.jsx";

export default function AdventureManager({ session, characters, campaign, tvChannel }) {
  const [view, setView] = useState("library"); // 'library' | 'current' | 'editor'
  const [currentAdventure, setCurrentAdventure] = useState(null);
  const [currentScene, setCurrentScene] = useState(null);
  const [adventureProgress, setAdventureProgress] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [modal, setModal] = useState({ isOpen: false, type: "alert", title: "", message: "", onConfirm: null });

  // Carica avventura corrente e progressi
  useEffect(() => {
    loadAdventureData();
  }, [session?.id]);

  const loadAdventureData = async () => {
    setLoading(true);

    // Carica avventura corrente dalla sessione
    if (session?.current_adventure_id) {
      const adv = getAdventure(session.current_adventure_id);
      setCurrentAdventure(adv);

      const sceneId = session.current_scene_id || adv?.startScene;
      if (sceneId) {
        const scene = getScene(session.current_adventure_id, sceneId);
        setCurrentScene(scene);
      }
    }

    // Carica progressi avventure dalla campagna
    // TODO: Query database per adventure_progress
    setAdventureProgress([]);

    setLoading(false);
  };

  // Avvia nuova avventura
  const startAdventure = async (adventureId) => {
    const adventure = getAdventure(adventureId);
    if (!adventure) return;

    setModal({
      isOpen: true,
      type: "confirm",
      title: `Avviare "${adventure.title}"?`,
      message: `Livello consigliato: ${adventure.level.min}-${adventure.level.max}\nDurata: ${adventure.duration}\n\nI giocatori vedranno la prima scena.`,
      confirmText: "▶️ Avvia",
      cancelText: "Annulla",
      onConfirm: async () => {
        // Aggiorna sessione
        console.log("🚀 DM: Avvio avventura", adventureId, "session ID:", session.id);
        const { data, error } = await supabase
          .from("sessions")
          .update({
            adventure_mode: true,
            current_adventure_id: adventureId,
            current_scene_id: adventure.startScene,
            adventure_state: {
              started_at: new Date().toISOString(),
              choices_made: [],
              flags: {},
              variables: {},
            }
          })
          .eq("id", session.id)
          .select();

        if (error) {
          console.error(" Errore aggiornamento sessione:", error);
        } else {
          console.log(" Sessione aggiornata:", data);
          setCurrentAdventure(adventure);
          const scene = getScene(adventureId, adventure.startScene);
          setCurrentScene(scene);
          setView("current");
        }
      }
    });
  };

  // Vai a scena specifica
  const goToScene = async (sceneId) => {
    const scene = getScene(session.current_adventure_id, sceneId);
    if (!scene) return;

    const { error } = await supabase
      .from("sessions")
      .update({ current_scene_id: sceneId })
      .eq("id", session.id);

    if (!error) {
      setCurrentScene(scene);
    }
  };

  // Termina avventura
  const endAdventure = async () => {
    setModal({
      isOpen: true,
      type: "confirm",
      title: "Terminare l'avventura?",
      message: "I progressi saranno salvati e potrai iniziarne una nuova.",
      confirmText: "⏹️ Termina",
      cancelText: "Annulla",
      onConfirm: async () => {
        // TODO: Salva progressi in adventure_progress

        const { error } = await supabase
          .from("sessions")
          .update({
            adventure_mode: false,
            current_adventure_id: null,
            current_scene_id: null,
          })
          .eq("id", session.id);

        if (!error) {
          setCurrentAdventure(null);
          setCurrentScene(null);
          setView("library");
        }
      }
    });
  };

  if (loading) {
    return <div style={{ padding: 20, textAlign: "center", color: "var(--gold)" }}>Caricamento...</div>;
  }

  return (
    <div style={{ padding: 20 }}>
      {/* Modal Dialog */}
      <ModalDialog
        isOpen={modal.isOpen}
        onClose={() => setModal({ ...modal, isOpen: false })}
        type={modal.type}
        title={modal.title}
        message={modal.message}
        confirmText={modal.confirmText}
        cancelText={modal.cancelText}
        onConfirm={modal.onConfirm}
      />

      {/* Header con navigazione */}
      <div style={{ marginBottom: 20, display: "flex", gap: 12, borderBottom: "1px solid rgba(212,175,55,0.2)", paddingBottom: 12 }}>
        <button
          className={view === "library" ? "btn btn-gold" : "btn btn-ghost"}
          onClick={() => setView("library")}
          style={{ flex: 1, padding: "10px" }}
        >
          Libreria
        </button>
        <button
          className={view === "current" ? "btn btn-gold" : "btn btn-ghost"}
          onClick={() => setView("current")}
          disabled={!currentAdventure}
          style={{ flex: 1, padding: "10px", opacity: !currentAdventure ? 0.4 : 1 }}
        >
           Scena Corrente
        </button>
      </div>

      <AnimatePresence mode="wait">
        {/* ──────────────────────────────────────── */}
        {/* VIEW: LIBRERIA AVVENTURE */}
        {/* ──────────────────────────────────────── */}
        {view === "library" && (
          <motion.div
            key="library"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <h2 style={{
              fontFamily: "var(--font-heading)",
              color: "var(--gold)",
              fontSize: "1.2rem",
              marginBottom: 16
            }}>
              Avventure Disponibili
            </h2>

            {/* Avventura attiva */}
            {currentAdventure && (
              <div className="glass-card" style={{
                padding: 16,
                marginBottom: 20,
                border: "2px solid var(--gold)",
                background: "rgba(212,175,55,0.1)"
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                  <span style={{ fontSize: "1.5rem" }}>▶️</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: "var(--font-heading)", color: "var(--gold)", fontSize: "1rem" }}>
                      {currentAdventure.title}
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "var(--parchment-dark)" }}>
                      IN CORSO · Scena: {currentScene?.title || "N/A"}
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    className="btn btn-gold"
                    onClick={() => setView("current")}
                    style={{ flex: 1 }}
                  >
                     Vai alla Scena
                  </button>
                  <button
                    className="btn btn-ghost"
                    onClick={endAdventure}
                    style={{ padding: "10px 16px" }}
                  >
                    ⏹️ Termina
                  </button>
                </div>
              </div>
            )}

            {/* Lista avventure */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {Object.values(ADVENTURES).map((adventure) => {
                const isActive = currentAdventure?.id === adventure.id;

                return (
                  <motion.div
                    key={adventure.id}
                    className="glass-card"
                    style={{
                      padding: 16,
                      opacity: isActive ? 0.5 : 1,
                    }}
                    whileHover={!isActive ? { scale: 1.01 } : {}}
                  >
                    <div style={{ display: "flex", gap: 16 }}>
                      {/* Icona/Immagine */}
                      <div style={{
                        width: 80,
                        height: 80,
                        borderRadius: 8,
                        background: "rgba(212,175,55,0.1)",
                        border: "1px solid rgba(212,175,55,0.3)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "2rem",
                        flexShrink: 0,
                      }}>
                        🐉
                      </div>

                      {/* Info */}
                      <div style={{ flex: 1 }}>
                        <h3 style={{
                          fontFamily: "var(--font-heading)",
                          color: "var(--gold)",
                          fontSize: "1rem",
                          marginBottom: 6,
                        }}>
                          {adventure.title}
                        </h3>
                        <p style={{
                          fontSize: "0.85rem",
                          color: "var(--parchment-dark)",
                          marginBottom: 10,
                          lineHeight: "1.4",
                        }}>
                          {adventure.description}
                        </p>

                        <div style={{ display: "flex", gap: 12, fontSize: "0.75rem", color: "var(--gold-dark)", marginBottom: 10 }}>
                          <span>📊 Lv.{adventure.level.min}-{adventure.level.max}</span>
                          <span>⏱️ {adventure.duration}</span>
                          <span>{adventure.difficulty}</span>
                        </div>

                        {isActive ? (
                          <div style={{
                            fontSize: "0.8rem",
                            color: "var(--gold)",
                            fontFamily: "var(--font-heading)",
                          }}>
                            ▶️ AVVENTURA IN CORSO
                          </div>
                        ) : (
                          <button
                            className="btn btn-gold"
                            onClick={() => startAdventure(adventure.id)}
                            disabled={!!currentAdventure}
                            style={{ padding: "8px 16px", fontSize: "0.85rem" }}
                          >
                            ▶️ Avvia Avventura
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* TODO: Sezione avventure completate */}
            {adventureProgress.length > 0 && (
              <div style={{ marginTop: 30 }}>
                <h3 style={{
                  fontFamily: "var(--font-heading)",
                  color: "var(--gold-dark)",
                  fontSize: "0.9rem",
                  marginBottom: 12,
                }}>
                  🏆 AVVENTURE COMPLETATE
                </h3>
                {/* TODO: Lista progressi */}
              </div>
            )}
          </motion.div>
        )}

        {/* ──────────────────────────────────────── */}
        {/* VIEW: SCENA CORRENTE */}
        {/* ──────────────────────────────────────── */}
        {view === "current" && currentScene && (
          <motion.div
            key="current"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            {/* Header scena */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                <h2 style={{
                  fontFamily: "var(--font-heading)",
                  color: "var(--gold)",
                  fontSize: "1.3rem",
                  flex: 1,
                }}>
                  {currentScene.title}
                </h2>
                <span style={{
                  fontSize: "0.75rem",
                  color: "var(--parchment-dark)",
                  background: "rgba(212,175,55,0.1)",
                  padding: "4px 12px",
                  borderRadius: 12,
                  fontFamily: "var(--font-heading)",
                }}>
                  {getSceneTypeLabel(currentScene.type)}
                </span>
              </div>
              <div style={{ fontSize: "0.8rem", color: "var(--gold-dark)" }}>
                {currentAdventure.title}
              </div>
            </div>

            {/* Narrativa DM */}
            <div className="glass-card" style={{ padding: 20, marginBottom: 20 }}>
              <div style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 12,
              }}>
                <h3 style={{
                  fontFamily: "var(--font-heading)",
                  fontSize: "0.8rem",
                  color: "var(--gold)",
                  letterSpacing: "0.1em",
                }}>
                  📖 NARRATIVA (leggi ai giocatori)
                </h3>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    className="btn btn-ghost"
                    style={{ padding: "6px 12px", fontSize: "0.75rem" }}
                    onClick={async () => {
                      // Broadcast narrativa alla TV
                      if (tvChannel) {
                        await tvChannel.send({
                          type: "broadcast",
                          event: "narrative",
                          payload: {
                            text: currentScene.narrative,
                            title: currentScene.title,
                            timestamp: Date.now(), // Timestamp unico per evitare duplicati
                            dmName: campaign.dm_name,
                          },
                        });

                        setModal({
                          isOpen: true,
                          type: "success",
                          title: "Narrativa Inviata!",
                          message: "La narrativa è stata inviata alla TV e i giocatori la vedranno.",
                          confirmText: "OK"
                        });
                      } else {
                        setModal({
                          isOpen: true,
                          type: "error",
                          title: "TV Non Connessa",
                          message: "La TV non è collegata. Assicurati che la TV sia aperta e connessa alla campagna.",
                          confirmText: "OK"
                        });
                      }
                    }}
                  >
                     Mostra su TV
                  </button>
                  <button
                    className="btn btn-ghost"
                    style={{ padding: "6px 12px", fontSize: "0.75rem", borderColor: "rgba(192,64,64,0.4)" }}
                    onClick={async () => {
                      // Chiudi narrativa dalla TV inviando narrativa null
                      console.log("🔴 DM: Chiudo narrativa dalla TV", tvChannel);
                      if (tvChannel) {
                        await tvChannel.send({
                          type: "broadcast",
                          event: "narrative",
                          payload: {
                            text: null, // Narrativa null = chiudi
                            title: null,
                            timestamp: Date.now(),
                          },
                        });
                        console.log(" DM: Evento narrative (chiudi) inviato");
                      } else {
                        console.error(" DM: tvChannel non disponibile!");
                      }
                    }}
                  >
                     Nascondi dalla TV
                  </button>
                </div>
              </div>

              <div style={{
                whiteSpace: "pre-line",
                lineHeight: "1.7",
                fontSize: "0.95rem",
                color: "var(--parchment)",
                fontFamily: "var(--font-body)",
              }}>
                {currentScene.narrative}
              </div>
            </div>

            {/* Scelte disponibili */}
            {currentScene.choices && (
              <div className="glass-card" style={{ padding: 20, marginBottom: 20 }}>
                <h3 style={{
                  fontFamily: "var(--font-heading)",
                  fontSize: "0.8rem",
                  color: "var(--gold)",
                  letterSpacing: "0.1em",
                  marginBottom: 12,
                }}>
                  SCELTE DISPONIBILI PER I GIOCATORI
                </h3>

                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {currentScene.choices.map((choice, idx) => (
                    <div
                      key={choice.id}
                      style={{
                        padding: 12,
                        background: "rgba(0,0,0,0.3)",
                        border: "1px solid rgba(212,175,55,0.2)",
                        borderRadius: 8,
                      }}
                    >
                      <div style={{ fontSize: "0.85rem", color: "var(--parchment)", marginBottom: 4 }}>
                        {idx + 1}. {choice.text}
                      </div>
                      {choice.type === "skill_check" && (
                        <div style={{ fontSize: "0.75rem", color: "var(--gold-dark)" }}>
                          Prova: {choice.skill} (CD {choice.dc})
                        </div>
                      )}
                      {choice.consequence?.nextScene && (
                        <div style={{ fontSize: "0.7rem", color: "var(--parchment-dark)", marginTop: 6 }}>
                          → Porta a: {choice.consequence.nextScene}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Progressi giocatori */}
            <div className="glass-card" style={{ padding: 20, marginBottom: 20 }}>
              <h3 style={{
                fontFamily: "var(--font-heading)",
                fontSize: "0.8rem",
                color: "var(--gold)",
                letterSpacing: "0.1em",
                marginBottom: 12,
              }}>
                PROGRESSI GIOCATORI
              </h3>

              {characters.map(char => (
                <div
                  key={char.id}
                  style={{
                    padding: "8px 0",
                    borderBottom: "1px solid rgba(212,175,55,0.1)",
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                  }}
                >
                  <div style={{
                    width: 32,
                    height: 32,
                    borderRadius: "50%",
                    background: char.token_color,
                    border: `2px solid ${char.token_color}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "0.9rem",
                    fontFamily: "var(--font-heading)",
                    color: "#000",
                  }}>
                    {char.name[0]}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "0.85rem", color: "var(--parchment)" }}>
                      {char.name}
                    </div>
                    <div style={{ fontSize: "0.7rem", color: "var(--parchment-dark)" }}>
                      In attesa di scelta...
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Controlli scena */}
            <div style={{ display: "flex", gap: 12 }}>
              <button
                className="btn btn-ghost"
                onClick={() => setView("library")}
                style={{ padding: "10px 16px" }}
              >
                ← Libreria
              </button>

              {/* TODO: Dropdown scelte scene */}
              <select
                className="glass-card"
                onChange={(e) => goToScene(e.target.value)}
                value={currentScene.id}
                style={{
                  flex: 1,
                  padding: "10px 16px",
                  background: "rgba(0,0,0,0.4)",
                  border: "1px solid rgba(212,175,55,0.3)",
                  color: "var(--parchment)",
                  fontFamily: "var(--font-heading)",
                  fontSize: "0.85rem",
                }}
              >
                <option value="">⏭️ Vai a scena...</option>
                {currentAdventure && Object.keys(currentAdventure.scenes).map(sceneId => {
                  const scene = currentAdventure.scenes[sceneId];
                  return (
                    <option key={sceneId} value={sceneId}>
                      {scene.title}
                    </option>
                  );
                })}
              </select>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ────────────────────────────────────────
// HELPER FUNCTIONS
// ────────────────────────────────────────

function getSceneTypeLabel(type) {
  const labels = {
    narrative: "📖 Narrativa",
    combat: "Combattimento",
    exploration: "Esplorazione",
    puzzle: "🧩 Enigma",
  };
  return labels[type] || type;
}
