// ═══════════════════════════════════════════════
//  UnifiedDMLayout - SISTEMA INTEGRATO COMPLETO
//  Dashboard → Scene Manager → Editor Canvas → Tutte le sezioni
// ═══════════════════════════════════════════════

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import DMDashboard from "./DMDashboard.jsx";
import SceneManager from "./SceneManager.jsx";
import PageCanvas from "./PageCanvas.jsx";
import NPCManager from "./NPCManager.jsx";
import SceneEditor from "./SceneEditor.jsx";
import DnDIcon from "../shared/components/DnDIcon.jsx";

export default function UnifiedDMLayout({
  campaign,
  session,
  characters = [],
  npcs = [],
  activeScene,
  tvChannel,
}) {
  // Routing tra sezioni
  const [currentSection, setCurrentSection] = useState("dashboard"); // dashboard | scenes | party | npcs | etc.

  // Combat system
  const [combatActive, setCombatActive] = useState(false);
  const [combatData, setCombatData] = useState(null);

  // Scene Editor States
  const [sceneEditMode, setSceneEditMode] = useState(false);
  const [editingScene, setEditingScene] = useState(null);

  // Debug: monitora cambiamenti di currentSection
  useEffect(() => {
    console.log("🔄 currentSection changed to:", currentSection);
  }, [currentSection]);

  // Handler per selezione sezione dal dashboard
  const handleSectionSelect = (sectionId) => {
    console.log("📍 UnifiedDMLayout - Navigating to section:", sectionId);
    console.log("📍 Current section before:", currentSection);
    setCurrentSection(sectionId);
    console.log("📍 Current section after setState:", sectionId);
  };

  // Handler per tornare al dashboard
  const handleBackToDashboard = () => {
    console.log("🏠 Back to dashboard");
    setCurrentSection("dashboard");
    setSceneEditMode(false);
    setEditingScene(null);
  };

  // Handler per aprire scene editor
  const handleEditScene = (scene) => {
    console.log("✏️ Editing scene:", scene);
    setEditingScene(scene);
    setSceneEditMode(true);
  };

  // Handler per chiudere scene editor
  const handleCloseEditor = () => {
    console.log("❌ Closing editor");
    setSceneEditMode(false);
    setEditingScene(null);
  };

  // Quick Combat Controls
  const startCombat = () => {
    const combatants = [
      ...characters.map(c => ({
        id: c.id,
        name: c.name,
        initiative: Math.floor(Math.random() * 20) + 1,
        hp: { current: c.hp_current, max: c.hp_max },
        ac: c.armor_class,
      })),
    ];

    const turnOrder = combatants.sort((a, b) => b.initiative - a.initiative);

    setCombatData({
      turnOrder,
      currentTurn: 0,
      round: 1,
    });
    setCombatActive(true);
  };

  const endCombat = () => {
    setCombatActive(false);
    setCombatData(null);
  };

  const nextTurn = () => {
    if (!combatData) return;

    const nextTurnIndex = (combatData.currentTurn + 1) % combatData.turnOrder.length;
    const nextRound = nextTurnIndex === 0 ? combatData.round + 1 : combatData.round;

    setCombatData({
      ...combatData,
      currentTurn: nextTurnIndex,
      round: nextRound,
    });
  };

  // ═══════════════════════════════════════════════════════════
  // RENDER SECTION - Sistema di Routing
  // ═══════════════════════════════════════════════════════════

  const renderSection = () => {
    // SCENE EDITOR HUB — Il cuore del DM (sia da "dm-main" che da "scenes")
    if (currentSection === "dm-main" || currentSection === "scenes" || (sceneEditMode && editingScene)) {
      return (
        <SceneEditor
          campaign={campaign}
          session={session}
          tvChannel={tvChannel}
          characters={characters}
          onClose={handleBackToDashboard}
          initialScene={editingScene}
        />
      );
    }

    // DASHBOARD - Schermata iniziale con tutte le carte
    if (currentSection === "dashboard") {
      return (
        <DMDashboard
          onSelectSection={handleSectionSelect}
          sessionData={session}
        />
      );
    }

    // SCENES - Scene Manager con lista scene
    if (currentSection === "scenes") {
      return (
        <div style={{ width: "100%", height: "100vh", background: "rgba(10,8,6,1)", position: "relative" }}>
          {/* Header con bottone back */}
          <div style={{
            position: "absolute",
            top: 20,
            left: 20,
            zIndex: 10,
          }}>
            <motion.button
              onClick={handleBackToDashboard}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              style={{
                padding: "12px 24px",
                background: "rgba(212,175,55,0.2)",
                border: "2px solid rgba(212,175,55,0.5)",
                borderRadius: 8,
                color: "#D4AF37",
                fontFamily: "'Cinzel', serif",
                fontSize: "0.9rem",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <DnDIcon icon="back" size={16} />
              Dashboard
            </motion.button>
          </div>

          {/* Scene Manager */}
          <SceneManager
            campaign={campaign}
            session={session}
            tvChannel={tvChannel}
            onEditScene={handleEditScene}
          />
        </div>
      );
    }

    // NPC MANAGER
    if (currentSection === "npcs") {
      return (
        <div style={{ width: "100%", height: "100vh", background: "rgba(10,8,6,1)", position: "relative" }}>
          {/* Header con bottone back */}
          <div style={{
            position: "absolute",
            top: 20,
            left: 20,
            zIndex: 10,
          }}>
            <motion.button
              onClick={handleBackToDashboard}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              style={{
                padding: "12px 24px",
                background: "rgba(212,175,55,0.2)",
                border: "2px solid rgba(212,175,55,0.5)",
                borderRadius: 8,
                color: "#D4AF37",
                fontFamily: "'Cinzel', serif",
                fontSize: "0.9rem",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <DnDIcon icon="back" size={16} />
              Dashboard
            </motion.button>
          </div>

          {/* NPC Manager */}
          <div style={{ paddingTop: 80 }}>
            <NPCManager campaign={campaign} />
          </div>
        </div>
      );
    }

    // PARTY
    if (currentSection === "party") {
      return (
        <div style={{ width: "100%", height: "100vh", background: "rgba(10,8,6,1)", display: "flex", flexDirection: "column", padding: 40 }}>
          {/* Header */}
          <motion.button
            onClick={handleBackToDashboard}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            style={{
              alignSelf: "flex-start",
              marginBottom: 30,
              padding: "12px 24px",
              background: "rgba(212,175,55,0.2)",
              border: "2px solid rgba(212,175,55,0.5)",
              borderRadius: 8,
              color: "#D4AF37",
              fontFamily: "'Cinzel', serif",
              fontSize: "0.9rem",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <DnDIcon icon="back" size={16} />
            Dashboard
          </motion.button>

          <h1 style={{
            fontFamily: "'Cinzel', serif",
            fontSize: "2.5rem",
            color: "#D4AF37",
            marginBottom: 30,
          }}>
            Party
          </h1>

          {/* Party Members */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
            gap: 20,
          }}>
            {characters.map(char => (
              <div key={char.id} style={{
                background: "rgba(212,175,55,0.1)",
                border: "2px solid rgba(212,175,55,0.3)",
                borderRadius: 12,
                padding: 20,
              }}>
                <div style={{ fontFamily: "'Cinzel', serif", fontSize: "1.2rem", color: "#D4AF37", marginBottom: 10 }}>
                  {char.name}
                </div>
                <div style={{ color: "var(--parchment)", fontSize: "0.9rem" }}>
                  <div>HP: {char.hp_current}/{char.hp_max}</div>
                  <div>AC: {char.armor_class}</div>
                  <div>Livello: {char.level}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    // DM-MAIN - Tavolo principale con canvas e combat
    if (currentSection === "dm-main") {
      return (
        <div style={{
          display: "flex",
          height: "100vh",
          background: "rgba(10,8,6,1)",
          overflow: "hidden"
        }}>
          {/* SIDEBAR SINISTRA */}
          <div style={{
            width: 400,
            background: "rgba(15,12,10,0.95)",
            borderRight: "1px solid rgba(212,175,55,0.2)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden"
          }}>
            {/* Header */}
            <div style={{
              padding: 20,
              borderBottom: "1px solid rgba(212,175,55,0.2)",
            }}>
              <motion.button
                onClick={handleBackToDashboard}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                style={{
                  width: "100%",
                  padding: "12px 20px",
                  background: "rgba(212,175,55,0.2)",
                  border: "2px solid rgba(212,175,55,0.5)",
                  borderRadius: 8,
                  color: "#D4AF37",
                  fontFamily: "'Cinzel', serif",
                  fontSize: "0.9rem",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  marginBottom: 15,
                }}
              >
                <DnDIcon icon="back" size={16} />
                Dashboard
              </motion.button>

              <div style={{
                fontFamily: "'Cinzel', serif",
                color: "var(--gold)",
                fontSize: "1.2rem",
                marginBottom: 8,
                display: "flex",
                alignItems: "center",
                gap: 10
              }}>
                <DnDIcon icon="crown" size={24} />
                {campaign?.name || "Campagna"}
              </div>
              <div style={{ fontSize: "0.7rem", color: "var(--parchment-dark)" }}>
                {characters.length} giocatori
                {combatActive && (
                  <span style={{ color: "var(--crimson-light)", marginLeft: 8 }}>
                    <DnDIcon icon="attack" size={12} /> COMBATTIMENTO
                  </span>
                )}
              </div>
            </div>

            {/* Party List */}
            <div style={{
              flex: 1,
              overflow: "auto",
              padding: 16
            }}>
              <div style={{ fontSize: "0.85rem", color: "var(--parchment)" }}>
                {characters.length === 0 ? (
                  <div style={{ textAlign: "center", padding: 40, color: "var(--parchment-dark)", fontStyle: "italic" }}>
                    Nessun giocatore connesso
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {characters.map(c => (
                      <div key={c.id} style={{
                        background: "rgba(212,175,55,0.05)",
                        border: "1px solid rgba(212,175,55,0.15)",
                        borderRadius: 8,
                        padding: 12
                      }}>
                        <div style={{ fontWeight: 600, color: "var(--gold)", marginBottom: 4 }}>
                          {c.name}
                        </div>
                        <div style={{ fontSize: "0.7rem", color: "var(--parchment-dark)" }}>
                          HP: {c.hp_current}/{c.hp_max} · AC: {c.armor_class}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Combat Controls */}
            <div style={{
              padding: 16,
              borderTop: "1px solid rgba(212,175,55,0.2)",
              background: "rgba(10,8,6,0.8)"
            }}>
              {!combatActive ? (
                <motion.button
                  onClick={startCombat}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  style={{
                    width: "100%",
                    padding: "12px",
                    background: "linear-gradient(135deg, rgba(192,64,64,0.8), rgba(139,0,0,0.8))",
                    border: "2px solid var(--crimson)",
                    borderRadius: 8,
                    color: "#fff",
                    fontFamily: "'Cinzel', serif",
                    fontSize: "0.9rem",
                    cursor: "pointer",
                    fontWeight: 600,
                  }}
                >
                  <DnDIcon icon="attack" size={16} /> Start Combat
                </motion.button>
              ) : (
                <div style={{ display: "flex", gap: 8 }}>
                  <motion.button
                    onClick={nextTurn}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    style={{
                      flex: 1,
                      padding: "12px",
                      background: "rgba(212,175,55,0.2)",
                      border: "2px solid var(--gold)",
                      borderRadius: 8,
                      color: "var(--gold)",
                      cursor: "pointer",
                      fontSize: "0.85rem",
                      fontWeight: 600,
                    }}
                  >
                    Next Turn
                  </motion.button>
                  <motion.button
                    onClick={endCombat}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    style={{
                      padding: "12px 20px",
                      background: "rgba(139,0,0,0.3)",
                      border: "2px solid var(--crimson)",
                      borderRadius: 8,
                      color: "var(--crimson)",
                      cursor: "pointer",
                      fontSize: "0.85rem",
                      fontWeight: 600,
                    }}
                  >
                    End
                  </motion.button>
                </div>
              )}
            </div>
          </div>

          {/* CANVAS CENTRALE */}
          <div style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            position: "relative"
          }}>
            <div style={{ flex: 1, overflow: "hidden" }}>
              {activeScene ? (
                <PageCanvas
                  scene={activeScene}
                  mode={combatActive ? "combat" : "exploration"}
                  combatData={combatData}
                  tvChannel={tvChannel}
                  session={session}
                />
              ) : (
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  height: "100%",
                  color: "var(--parchment-dark)",
                  fontStyle: "italic"
                }}>
                  Nessuna scena attiva
                </div>
              )}
            </div>
          </div>

          {/* COMBAT SIDEBAR DESTRA */}
          <AnimatePresence>
            {combatActive && (
              <motion.div
                initial={{ x: 300, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: 300, opacity: 0 }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                style={{
                  width: 300,
                  background: "rgba(15,12,10,0.95)",
                  borderLeft: "1px solid rgba(212,175,55,0.2)",
                  display: "flex",
                  flexDirection: "column",
                  overflow: "hidden"
                }}
              >
                {/* Combat Header */}
                <div style={{
                  padding: 20,
                  borderBottom: "1px solid rgba(212,175,55,0.2)",
                  background: "rgba(192,64,64,0.1)"
                }}>
                  <div style={{
                    fontFamily: "'Cinzel', serif",
                    fontSize: "1.1rem",
                    color: "var(--crimson-light)",
                    marginBottom: 8,
                    display: "flex",
                    alignItems: "center",
                    gap: 8
                  }}>
                    <DnDIcon icon="attack" size={20} />
                    Combat
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "var(--parchment-dark)" }}>
                    Round {combatData.round}
                  </div>
                </div>

                {/* Initiative Order */}
                <div style={{
                  flex: 1,
                  overflow: "auto",
                  padding: 16
                }}>
                  <div style={{
                    fontSize: "0.7rem",
                    color: "var(--gold)",
                    fontFamily: "var(--font-heading)",
                    letterSpacing: "0.1em",
                    marginBottom: 12
                  }}>
                    INITIATIVE ORDER
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {combatData.turnOrder.map((combatant, index) => (
                      <motion.div
                        key={combatant.id}
                        initial={{ x: -20, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ delay: index * 0.05 }}
                        style={{
                          padding: 12,
                          background: index === combatData.currentTurn
                            ? "rgba(212,175,55,0.2)"
                            : "rgba(212,175,55,0.05)",
                          border: index === combatData.currentTurn
                            ? "2px solid var(--gold)"
                            : "1px solid rgba(212,175,55,0.15)",
                          borderRadius: 8,
                          position: "relative"
                        }}
                      >
                        {index === combatData.currentTurn && (
                          <div style={{
                            position: "absolute",
                            top: -8,
                            right: 8,
                            background: "var(--gold)",
                            color: "rgba(10,8,6,1)",
                            padding: "2px 8px",
                            borderRadius: 4,
                            fontSize: "0.6rem",
                            fontWeight: 700,
                            letterSpacing: "0.05em"
                          }}>
                            YOUR TURN
                          </div>
                        )}

                        <div style={{
                          fontWeight: 600,
                          color: index === combatData.currentTurn ? "var(--gold)" : "var(--parchment)",
                          marginBottom: 4,
                          fontSize: "0.85rem"
                        }}>
                          {combatant.name}
                        </div>

                        <div style={{
                          display: "flex",
                          gap: 12,
                          fontSize: "0.7rem",
                          color: "var(--parchment-dark)"
                        }}>
                          <span>Initiative: {combatant.initiative}</span>
                          {combatant.hp && (
                            <span>HP: {combatant.hp.current}/{combatant.hp.max}</span>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      );
    }

    // Sezioni placeholder per le altre voci
    return (
      <div style={{ width: "100%", height: "100vh", background: "rgba(10,8,6,1)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 40 }}>
        <motion.button
          onClick={handleBackToDashboard}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          style={{
            position: "absolute",
            top: 40,
            left: 40,
            padding: "12px 24px",
            background: "rgba(212,175,55,0.2)",
            border: "2px solid rgba(212,175,55,0.5)",
            borderRadius: 8,
            color: "#D4AF37",
            fontFamily: "'Cinzel', serif",
            fontSize: "0.9rem",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <DnDIcon icon="back" size={16} />
          Dashboard
        </motion.button>

        <h1 style={{
          fontFamily: "'Cinzel', serif",
          fontSize: "3rem",
          color: "#D4AF37",
          marginBottom: 20,
        }}>
          {currentSection}
        </h1>
        <p style={{ color: "var(--parchment-dark)", fontStyle: "italic" }}>
          Sezione in costruzione...
        </p>
      </div>
    );
  };

  // ═══════════════════════════════════════════════════════════
  // MAIN RENDER
  // ═══════════════════════════════════════════════════════════

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={currentSection}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
      >
        {renderSection()}
      </motion.div>
    </AnimatePresence>
  );
}
