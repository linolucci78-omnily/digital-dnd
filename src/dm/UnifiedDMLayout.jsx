// ═══════════════════════════════════════════════
//  UnifiedDMLayout - NUOVO LAYOUT SPAZIALE
//  3 Colonne: Sidebar | Canvas (Always Visible) | Combat
// ═══════════════════════════════════════════════

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import PageCanvas from "./PageCanvas.jsx";
import DnDIcon from "../shared/components/DnDIcon.jsx";

export default function UnifiedDMLayout({
  campaign,
  session,
  characters = [],
  npcs = [],
  activeScene,
  tvChannel,
}) {
  const [combatActive, setCombatActive] = useState(false);
  const [combatData, setCombatData] = useState(null);
  const [currentTab, setCurrentTab] = useState("party");

  // Quick Combat Controls
  const startCombat = () => {
    // Collect all tokens on canvas and roll initiative
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

  return (
    <div style={{
      display: "flex",
      height: "100vh",
      background: "rgba(10,8,6,1)",
      overflow: "hidden"
    }}>
      {/* ═══════════════════════════════════════════ */}
      {/* SIDEBAR SINISTRA - Controlli & Tabs (400px) */}
      {/* ═══════════════════════════════════════════ */}
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

        {/* Tabs */}
        <div style={{
          display: "flex",
          gap: 4,
          padding: "12px 16px",
          borderBottom: "1px solid rgba(212,175,55,0.15)",
          flexWrap: "wrap"
        }}>
          {["party", "scenes", "npcs"].map(tab => (
            <button
              key={tab}
              onClick={() => setCurrentTab(tab)}
              style={{
                padding: "8px 16px",
                background: currentTab === tab
                  ? "rgba(212,175,55,0.2)"
                  : "transparent",
                border: currentTab === tab
                  ? "1px solid rgba(212,175,55,0.4)"
                  : "1px solid transparent",
                borderRadius: 6,
                color: currentTab === tab ? "var(--gold)" : "var(--parchment-dark)",
                cursor: "pointer",
                fontSize: "0.75rem",
                fontFamily: "var(--font-heading)",
                letterSpacing: "0.05em",
                transition: "all 0.2s"
              }}
            >
              {tab.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div style={{
          flex: 1,
          overflow: "auto",
          padding: 16
        }}>
          <AnimatePresence mode="wait">
            {currentTab === "party" && (
              <motion.div
                key="party"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
              >
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
              </motion.div>
            )}

            {currentTab === "scenes" && (
              <motion.div
                key="scenes"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
              >
                <div style={{ fontSize: "0.85rem", color: "var(--parchment)" }}>
                  Scene Manager (coming soon...)
                </div>
              </motion.div>
            )}

            {currentTab === "npcs" && (
              <motion.div
                key="npcs"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
              >
                <div style={{ fontSize: "0.85rem", color: "var(--parchment)" }}>
                  NPC Library (coming soon...)
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Quick Combat Controls (Always Visible!) */}
        <div style={{
          padding: 16,
          borderTop: "1px solid rgba(212,175,55,0.2)",
          background: "rgba(10,8,6,0.8)"
        }}>
          <div style={{
            fontFamily: "'Cinzel', serif",
            fontSize: "0.8rem",
            color: "var(--gold)",
            marginBottom: 12,
            display: "flex",
            alignItems: "center",
            gap: 8
          }}>
            <DnDIcon icon="attack" size={16} />
            QUICK COMBAT
          </div>

          {!combatActive ? (
            <motion.button
              onClick={startCombat}
              className="btn btn-crimson"
              style={{
                width: "100%",
                padding: "14px 20px",
                fontSize: "0.95rem",
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
                boxShadow: "0 0 20px rgba(192,64,64,0.4)"
              }}
              whileHover={{ scale: 1.02, boxShadow: "0 0 30px rgba(192,64,64,0.6)" }}
              whileTap={{ scale: 0.98 }}
            >
              <DnDIcon icon="dice" size={18} />
              INIZIA COMBATTIMENTO
            </motion.button>
          ) : (
            <div style={{ display: "flex", gap: 8 }}>
              <motion.button
                onClick={nextTurn}
                className="btn btn-gold"
                style={{
                  flex: 1,
                  padding: "12px",
                  fontSize: "0.8rem"
                }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Next Turn →
              </motion.button>
              <motion.button
                onClick={endCombat}
                className="btn btn-ghost"
                style={{
                  padding: "12px 16px",
                  fontSize: "0.8rem"
                }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                End
              </motion.button>
            </div>
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════════ */}
      {/* CANVAS CENTRALE - Sempre Visibile! (flex-1) */}
      {/* ═══════════════════════════════════════════ */}
      <div style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        position: "relative"
      }}>
        {/* Canvas Header */}
        <div style={{
          padding: "12px 20px",
          background: "rgba(15,12,10,0.95)",
          borderBottom: "1px solid rgba(212,175,55,0.2)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between"
        }}>
          <div style={{
            fontFamily: "'Cinzel', serif",
            color: "var(--gold)",
            fontSize: "1rem",
            display: "flex",
            alignItems: "center",
            gap: 10
          }}>
            <DnDIcon icon="map" size={20} />
            {activeScene?.name || "Nessuna Scena Attiva"}
          </div>

          {/* Tools */}
          <div style={{ display: "flex", gap: 8 }}>
            {["select", "draw", "fog", "grid"].map(tool => (
              <button
                key={tool}
                style={{
                  padding: "8px 12px",
                  background: "rgba(212,175,55,0.1)",
                  border: "1px solid rgba(212,175,55,0.2)",
                  borderRadius: 6,
                  color: "var(--parchment-dark)",
                  cursor: "pointer",
                  fontSize: "0.7rem",
                  textTransform: "uppercase"
                }}
              >
                {tool}
              </button>
            ))}
          </div>
        </div>

        {/* PageCanvas - IL CUORE DEL SISTEMA! */}
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
              Seleziona una scena per iniziare
            </div>
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════════ */}
      {/* SIDEBAR DESTRA - Combat Tracker (300px)     */}
      {/* Appare SOLO quando combatActive = true      */}
      {/* ═══════════════════════════════════════════ */}
      <AnimatePresence>
        {combatActive && combatData && (
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
                color: "var(--crimson-light)",
                fontSize: "1.1rem",
                marginBottom: 8,
                display: "flex",
                alignItems: "center",
                gap: 10
              }}>
                <DnDIcon icon="attack" size={20} />
                COMBAT
              </div>
              <div style={{
                fontSize: "0.8rem",
                color: "var(--parchment-dark)"
              }}>
                Round {combatData.round}
              </div>
            </div>

            {/* Turn Order */}
            <div style={{ flex: 1, overflow: "auto", padding: 16 }}>
              <div style={{
                fontSize: "0.7rem",
                color: "var(--gold-dark)",
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

            {/* Combat Actions */}
            <div style={{
              padding: 16,
              borderTop: "1px solid rgba(212,175,55,0.2)",
              background: "rgba(10,8,6,0.8)"
            }}>
              <motion.button
                onClick={nextTurn}
                className="btn btn-gold"
                style={{
                  width: "100%",
                  padding: "14px 20px",
                  fontSize: "0.9rem",
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 10
                }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Next Turn →
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
