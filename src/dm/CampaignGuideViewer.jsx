// ═══════════════════════════════════════════════
//  CampaignGuideViewer — Interfaccia Campaign Guide
//  Rende usabile la guida per il DM durante il gioco
//  Design SUPREMO che rispecchia l'app principale
// ═══════════════════════════════════════════════

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import starterSetData from "../data/starter_set_seed.json";
import DnDIcon from "../shared/components/DnDIcon.jsx";

export default function CampaignGuideViewer({ onClose }) {
  const [selectedSession, setSelectedSession] = useState(1);
  const [expandedSection, setExpandedSection] = useState("overview");
  const [showReadAloud, setShowReadAloud] = useState(false);
  const [currentReadAloud, setCurrentReadAloud] = useState("");

  // Get campaign guide data
  const campaignGuide = starterSetData.campaign_guide;
  const sessions = campaignGuide.session_guides;
  const currentSession = sessions.find(s => s.session_number === selectedSession);

  // Get all sections for current session
  const sessionSections = useMemo(() => {
    if (!currentSession) return [];

    const sections = [];

    // Add standard sections
    if (currentSession.opening) sections.push({ key: "opening", label: "Opening", data: currentSession.opening });

    // Add dynamic sections (scene_1, scene_2, stanza_1, location_1, etc)
    Object.keys(currentSession).forEach(key => {
      if (key.startsWith("scene_") || key.startsWith("stanza_") || key.startsWith("location_")) {
        const title = currentSession[key].title || key.replace(/_/g, " ");
        sections.push({ key, label: `🎬 ${title}`, data: currentSession[key] });
      }
    });

    if (currentSession.session_end) sections.push({ key: "session_end", label: "🏁 Session End", data: currentSession.session_end });

    return sections;
  }, [currentSession]);

  // Extract read-aloud text from any object
  const extractReadAloud = (obj, path = "") => {
    if (!obj) return null;
    if (typeof obj === "string" && path.includes("read_aloud")) return obj;
    if (obj.read_aloud) return obj.read_aloud;

    for (const key in obj) {
      if (typeof obj[key] === "object") {
        const result = extractReadAloud(obj[key], `${path}.${key}`);
        if (result) return result;
      }
    }
    return null;
  };

  const handleReadAloud = (text) => {
    setCurrentReadAloud(text);
    setShowReadAloud(true);
  };

  if (!campaignGuide) {
    return (
      <div style={{ padding: 24, background: "rgba(139,26,26,0.2)", border: "1px solid var(--crimson)", borderRadius: 12 }}>
        <p style={{ color: "var(--crimson-light)" }}>❌ Campaign Guide non trovata nel JSON!</p>
      </div>
    );
  }

  return (
    <div style={{
      position: "fixed",
      inset: 0,
      display: "flex",
      flexDirection: "column",
      background: "rgba(10,8,6,0.95)",
      overflow: "hidden",
      zIndex: 200,
    }}>
      {/* Header */}
      <div style={{
        padding: "16px 24px",
        background: "rgba(10,8,6,0.97)",
        borderBottom: "1px solid rgba(212,175,55,0.3)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "16px",
      }}>
        {/* Titolo a SINISTRA con icona */}
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}>
          <DnDIcon icon="book" size={28} color="var(--gold)" />
          <div>
            <h1 style={{
              fontFamily: "var(--font-heading)",
              fontSize: "1.1rem",
              color: "var(--gold)",
              letterSpacing: "0.05em",
              margin: 0,
            }}>
              Campaign Guide
            </h1>
            <div style={{
              fontSize: "0.7rem",
              color: "rgba(212,175,55,0.5)",
              fontStyle: "italic",
            }}>
              Lost Mine of Phandelver
            </div>
          </div>
        </div>

        {/* Bottone CHIUDI - a DESTRA */}
        {onClose && (
          <button
            onClick={onClose}
            className="btn btn-ghost"
            style={{
              fontSize: "0.8rem",
              padding: "8px 16px",
              display: "flex",
              alignItems: "center",
              gap: 6,
              color: "rgba(212,175,55,0.7)",
            }}
          >
            ← Chiudi
          </button>
        )}
      </div>

      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* Sidebar - Session List */}
        <div style={{
          width: 320,
          minWidth: 320,
          background: "rgba(0,0,0,0.4)",
          borderRight: "1px solid rgba(212,175,55,0.2)",
          overflowY: "auto",
        }}>
          <div style={{
            padding: "16px 16px 12px",
            borderBottom: "1px solid rgba(212,175,55,0.15)",
          }}>
            <h3 style={{
              fontFamily: "var(--font-heading)",
              fontSize: "0.75rem",
              color: "var(--gold-dark)",
              letterSpacing: "0.15em",
              textTransform: "uppercase",
            }}>
              📋 Sessioni
            </h3>
          </div>

          {sessions.map(session => (
            <motion.button
              key={session.session_number}
              onClick={() => {
                setSelectedSession(session.session_number);
                setExpandedSection("overview");
              }}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              style={{
                width: "100%",
                textAlign: "left",
                padding: "16px 20px",
                borderBottom: "1px solid rgba(212,175,55,0.08)",
                background: selectedSession === session.session_number
                  ? "rgba(212,175,55,0.12)"
                  : "transparent",
                borderLeft: selectedSession === session.session_number
                  ? "3px solid var(--gold)"
                  : "3px solid transparent",
                cursor: "pointer",
                transition: "all 0.2s ease",
                border: "none",
                outline: "none",
              }}
              className={selectedSession !== session.session_number ? "hover-bg" : ""}
            >
              <div style={{
                fontFamily: "var(--font-heading)",
                fontSize: "0.95rem",
                color: selectedSession === session.session_number ? "var(--gold)" : "var(--parchment)",
                fontWeight: 600,
                marginBottom: 6,
              }}>
                Session {session.session_number}
              </div>
              <div style={{
                fontSize: "0.8rem",
                color: selectedSession === session.session_number ? "var(--parchment-dark)" : "rgba(212,175,55,0.5)",
                lineHeight: 1.3,
              }}>
                {session.title?.replace(`Sessione ${session.session_number}: `, "")}
              </div>
              <div style={{
                fontSize: "0.72rem",
                color: "rgba(212,175,55,0.4)",
                marginTop: 6,
                letterSpacing: "0.03em",
                display: "flex",
                alignItems: "center",
                gap: 4,
              }}>
                <DnDIcon icon="time" size={12} color="rgba(212,175,55,0.4)" />
                {session.estimated_time}
              </div>
            </motion.button>
          ))}
        </div>

        {/* Main Content */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {currentSession ? (
            <>
              {/* Session Header */}
              <div style={{
                padding: "24px 64px",
                background: "rgba(0,0,0,0.3)",
                borderBottom: "1px solid rgba(212,175,55,0.2)",
              }}>
                <h2 style={{
                  fontFamily: "var(--font-heading)",
                  fontSize: "1.8rem",
                  color: "var(--gold-light)",
                  marginBottom: 12,
                  letterSpacing: "0.03em",
                }}>
                  {currentSession.title}
                </h2>
                <div style={{ display: "flex", gap: 24, fontSize: "0.85rem", color: "var(--parchment-dark)", alignItems: "center" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <DnDIcon icon="time" size={14} color="rgba(212,175,55,0.6)" />
                    {currentSession.estimated_time}
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <DnDIcon icon="level" size={14} color="rgba(212,175,55,0.6)" />
                    Level {currentSession.level}
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <DnDIcon icon="map" size={14} color="rgba(212,175,55,0.6)" />
                    {currentSession.locations?.join(", ") || "Multiple"}
                  </span>
                </div>

                {/* Session Goals */}
                {currentSession.session_goals && (
                  <div style={{ marginTop: 16 }}>
                    <div style={{
                      fontFamily: "var(--font-heading)",
                      fontSize: "0.7rem",
                      color: "var(--gold)",
                      letterSpacing: "0.12em",
                      textTransform: "uppercase",
                      marginBottom: 8,
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}>
                      <DnDIcon icon="quest" size={14} />
                      Obiettivi
                    </div>
                    <ul style={{ paddingLeft: 0, listStyle: "none" }}>
                      {currentSession.session_goals.map((goal, i) => (
                        <li key={i} style={{
                          fontSize: "0.85rem",
                          color: "var(--parchment)",
                          marginBottom: 4,
                          paddingLeft: 16,
                          position: "relative",
                        }}>
                          <span style={{ position: "absolute", left: 0, color: "var(--gold-dark)" }}>•</span>
                          {goal}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Section Navigation */}
              <div style={{
                padding: "12px 64px",
                background: "rgba(0,0,0,0.25)",
                borderBottom: "1px solid rgba(212,175,55,0.15)",
                overflowX: "auto",
              }}>
                <div style={{ display: "flex", gap: 8, flexWrap: "nowrap" }}>
                  <button
                    onClick={() => setExpandedSection("overview")}
                    className={expandedSection === "overview" ? "btn btn-gold" : "btn btn-ghost"}
                    style={{
                      padding: "8px 16px",
                      fontSize: "0.85rem",
                      whiteSpace: "nowrap",
                      minWidth: "auto",
                    }}
                  >
                    📋 Overview
                  </button>

                  {sessionSections.map(section => (
                    <button
                      key={section.key}
                      onClick={() => setExpandedSection(section.key)}
                      className={expandedSection === section.key ? "btn btn-gold" : "btn btn-ghost"}
                      style={{
                        padding: "8px 16px",
                        fontSize: "0.85rem",
                        whiteSpace: "nowrap",
                        minWidth: "auto",
                      }}
                    >
                      {section.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Content Area */}
              <div style={{
                flex: 1,
                overflowY: "auto",
                padding: "32px 64px",
                background: "rgba(10,8,6,0.4)",
              }}>
                <AnimatePresence mode="wait">
                  {expandedSection === "overview" ? (
                    <motion.div
                      key="overview"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.3 }}
                      style={{ display: "flex", flexDirection: "column", gap: 20 }}
                    >
                      {/* DM Notes */}
                      {currentSession.dm_notes_important && (
                        <div style={{
                          padding: 20,
                          background: "rgba(139,26,26,0.15)",
                          border: "1px solid var(--crimson)",
                          borderLeft: "4px solid var(--crimson)",
                          borderRadius: 8,
                        }}>
                          <div style={{
                            fontFamily: "var(--font-heading)",
                            fontSize: "0.85rem",
                            color: "var(--crimson-light)",
                            letterSpacing: "0.1em",
                            textTransform: "uppercase",
                            marginBottom: 12,
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                          }}>
                            <DnDIcon icon="alert" size={16} color="var(--crimson-light)" />
                            Note Importanti DM
                          </div>
                          <p style={{ fontSize: "0.95rem", color: "var(--parchment)", lineHeight: 1.6 }}>
                            {currentSession.dm_notes_important}
                          </p>
                        </div>
                      )}

                      {/* Opening */}
                      {currentSession.opening && (
                        <div className="glass-card" style={{ padding: 20 }}>
                          <div style={{
                            fontFamily: "var(--font-heading)",
                            fontSize: "0.9rem",
                            color: "var(--gold)",
                            letterSpacing: "0.08em",
                            marginBottom: 16,
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                          }}>
                            <DnDIcon icon="book" size={16} />
                            OPENING
                          </div>
                          {currentSession.opening.recap && (
                            <div style={{ marginBottom: 16 }}>
                              <div style={{
                                fontSize: "0.7rem",
                                fontFamily: "var(--font-heading)",
                                color: "var(--gold-dark)",
                                letterSpacing: "0.1em",
                                textTransform: "uppercase",
                                marginBottom: 8,
                              }}>
                                Recap:
                              </div>
                              <p style={{ fontSize: "0.9rem", color: "var(--parchment-dark)", lineHeight: 1.6 }}>
                                {currentSession.opening.recap}
                              </p>
                            </div>
                          )}
                          {currentSession.opening.read_aloud && (
                            <div>
                              <div style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                marginBottom: 12,
                              }}>
                                <div style={{
                                  fontSize: "0.75rem",
                                  fontFamily: "var(--font-heading)",
                                  color: "#40c040",
                                  letterSpacing: "0.1em",
                                  textTransform: "uppercase",
                                }}>
                                  📣 READ ALOUD
                                </div>
                                <button
                                  onClick={() => handleReadAloud(currentSession.opening.read_aloud)}
                                  style={{
                                    background: "linear-gradient(135deg, #2a8a2a 0%, #40c040 50%, #2a8a2a 100%)",
                                    color: "white",
                                    border: "none",
                                    padding: "8px 16px",
                                    borderRadius: 6,
                                    fontSize: "0.8rem",
                                    fontFamily: "var(--font-heading)",
                                    letterSpacing: "0.05em",
                                    cursor: "pointer",
                                    transition: "all 0.2s",
                                    boxShadow: "0 2px 8px rgba(0,0,0,0.5)",
                                  }}
                                  className="hover-brightness"
                                >
                                  🔊 Leggi ai Giocatori
                                </button>
                              </div>
                              <p style={{
                                fontSize: "1rem",
                                color: "var(--parchment)",
                                fontStyle: "italic",
                                background: "rgba(0,0,0,0.5)",
                                padding: 16,
                                borderRadius: 6,
                                borderLeft: "4px solid #40c040",
                                lineHeight: 1.7,
                              }}>
                                "{currentSession.opening.read_aloud}"
                              </p>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Quick Reference */}
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))", gap: 24 }}>
                        {currentSession.session_goals && (
                          <div className="glass-card" style={{ padding: 20 }}>
                            <div style={{
                              fontSize: "0.7rem",
                              fontFamily: "var(--font-heading)",
                              color: "var(--gold)",
                              letterSpacing: "0.1em",
                              textTransform: "uppercase",
                              marginBottom: 12,
                              display: "flex",
                              alignItems: "center",
                              gap: 6,
                            }}>
                              <DnDIcon icon="quest" size={14} />
                              Obiettivi
                            </div>
                            <ul style={{ paddingLeft: 0, listStyle: "none" }}>
                              {currentSession.session_goals.map((goal, i) => (
                                <li key={i} style={{
                                  fontSize: "0.85rem",
                                  color: "var(--parchment)",
                                  marginBottom: 6,
                                  paddingLeft: 16,
                                  position: "relative",
                                }}>
                                  <span style={{ position: "absolute", left: 0, color: "var(--gold-dark)" }}>•</span>
                                  {goal}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {currentSession.locations && (
                          <div className="glass-card" style={{ padding: 20 }}>
                            <div style={{
                              fontSize: "0.7rem",
                              fontFamily: "var(--font-heading)",
                              color: "var(--gold)",
                              letterSpacing: "0.1em",
                              textTransform: "uppercase",
                              marginBottom: 12,
                              display: "flex",
                              alignItems: "center",
                              gap: 6,
                            }}>
                              <DnDIcon icon="map" size={14} />
                              Locations
                            </div>
                            <ul style={{ paddingLeft: 0, listStyle: "none" }}>
                              {currentSession.locations.map((loc, i) => (
                                <li key={i} style={{
                                  fontSize: "0.85rem",
                                  color: "var(--parchment)",
                                  marginBottom: 6,
                                  paddingLeft: 16,
                                  position: "relative",
                                }}>
                                  <span style={{ position: "absolute", left: 0, color: "var(--gold-dark)" }}>•</span>
                                  {loc}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div
                      key={expandedSection}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.3 }}
                    >
                      <SectionContent
                        section={sessionSections.find(s => s.key === expandedSection)}
                        onReadAloud={handleReadAloud}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </>
          ) : (
            <div style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--gold-dark)",
              fontStyle: "italic",
            }}>
              <p>Seleziona una sessione per iniziare</p>
            </div>
          )}
        </div>
      </div>

      {/* Read Aloud Modal */}
      <AnimatePresence>
        {showReadAloud && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.85)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 1000,
              padding: 40,
              backdropFilter: "blur(8px)",
            }}
            onClick={() => setShowReadAloud(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", damping: 25 }}
              style={{
                background: "linear-gradient(135deg, rgba(26,20,12,0.98) 0%, rgba(10,8,6,0.98) 100%)",
                border: "4px solid #40c040",
                borderRadius: 16,
                padding: 40,
                maxWidth: 900,
                maxHeight: "85vh",
                overflowY: "auto",
                boxShadow: "0 20px 60px rgba(0,0,0,0.9), 0 0 40px rgba(64,192,64,0.3)",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                marginBottom: 28,
              }}>
                <h3 style={{
                  fontFamily: "var(--font-heading)",
                  fontSize: "1.75rem",
                  color: "#40c040",
                  letterSpacing: "0.05em",
                  textShadow: "0 2px 12px rgba(64,192,64,0.4)",
                }}>
                  📣 READ ALOUD TO PLAYERS
                </h3>
                <button
                  onClick={() => setShowReadAloud(false)}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "var(--parchment-dark)",
                    fontSize: "2rem",
                    cursor: "pointer",
                    padding: 0,
                    width: 36,
                    height: 36,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transition: "color 0.2s",
                  }}
                  className="hover-gold"
                >
                  ×
                </button>
              </div>
              <p style={{
                fontSize: "1.4rem",
                color: "var(--parchment)",
                lineHeight: 1.8,
                fontStyle: "italic",
                letterSpacing: "0.01em",
              }}>
                "{currentReadAloud}"
              </p>
              <div style={{ marginTop: 32, display: "flex", justifyContent: "flex-end" }}>
                <button
                  onClick={() => setShowReadAloud(false)}
                  className="btn btn-gold"
                  style={{ padding: "12px 32px", fontSize: "1rem" }}
                >
                  Chiudi
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Custom hover styles */}
      <style>{`
        .hover-bg:hover {
          background: rgba(212,175,55,0.05) !important;
        }
        .hover-brightness:hover {
          filter: brightness(1.15);
          transform: translateY(-1px);
        }
        .hover-gold:hover {
          color: var(--gold);
        }
      `}</style>
    </div>
  );
}

// Component to render section content
function SectionContent({ section, onReadAloud }) {
  if (!section) return <div style={{ color: "var(--gold-dark)", fontStyle: "italic" }}>Nessun contenuto</div>;

  const renderValue = (value, key = "", depth = 0) => {
    if (value === null || value === undefined) return null;

    // Handle read_aloud specially
    if (key === "read_aloud" && typeof value === "string") {
      return (
        <div style={{
          marginBottom: 20,
          padding: 20,
          background: "rgba(0,0,0,0.5)",
          borderRadius: 8,
          borderLeft: "4px solid #40c040",
        }}>
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 12,
          }}>
            <div style={{
              fontSize: "0.75rem",
              fontFamily: "var(--font-heading)",
              color: "#40c040",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
            }}>
              📣 READ ALOUD
            </div>
            <button
              onClick={() => onReadAloud(value)}
              style={{
                background: "linear-gradient(135deg, #2a8a2a 0%, #40c040 50%, #2a8a2a 100%)",
                color: "white",
                border: "none",
                padding: "8px 16px",
                borderRadius: 6,
                fontSize: "0.8rem",
                fontFamily: "var(--font-heading)",
                letterSpacing: "0.05em",
                cursor: "pointer",
                transition: "all 0.2s",
                boxShadow: "0 2px 8px rgba(0,0,0,0.5)",
              }}
              className="hover-brightness"
            >
              🔊 Leggi ai Giocatori
            </button>
          </div>
          <p style={{
            fontSize: "1rem",
            color: "var(--parchment)",
            fontStyle: "italic",
            lineHeight: 1.7,
          }}>
            "{value}"
          </p>
        </div>
      );
    }

    // Handle strings
    if (typeof value === "string") {
      return <p style={{ fontSize: "0.95rem", color: "var(--parchment)", marginBottom: 12, lineHeight: 1.6 }}>{value}</p>;
    }

    // Handle arrays
    if (Array.isArray(value)) {
      return (
        <ul style={{ paddingLeft: 0, listStyle: "none", marginBottom: 16 }}>
          {value.map((item, i) => (
            <li key={i} style={{
              fontSize: "0.9rem",
              color: "var(--parchment)",
              marginBottom: 6,
              paddingLeft: 16,
              position: "relative",
            }}>
              <span style={{ position: "absolute", left: 0, color: "var(--gold-dark)" }}>•</span>
              {typeof item === "string" ? item : JSON.stringify(item)}
            </li>
          ))}
        </ul>
      );
    }

    // Handle objects
    if (typeof value === "object") {
      return (
        <div style={{
          display: "flex",
          flexDirection: "column",
          gap: 16,
          marginLeft: depth > 0 ? 20 : 0,
          paddingLeft: depth > 0 ? 16 : 0,
          borderLeft: depth > 0 ? "2px solid rgba(212,175,55,0.2)" : "none",
        }}>
          {Object.entries(value).map(([k, v]) => (
            <div key={k}>
              <div style={{
                fontSize: "0.75rem",
                fontFamily: "var(--font-heading)",
                color: "var(--gold)",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                marginBottom: 8,
              }}>
                {k.replace(/_/g, " ")}:
              </div>
              {renderValue(v, k, depth + 1)}
            </div>
          ))}
        </div>
      );
    }

    return <span style={{ fontSize: "0.9rem", color: "var(--parchment)" }}>{String(value)}</span>;
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <h3 style={{
        fontFamily: "var(--font-heading)",
        fontSize: "1.5rem",
        color: "var(--gold-light)",
        marginBottom: 8,
        letterSpacing: "0.03em",
      }}>
        {section.label}
      </h3>
      {renderValue(section.data)}
    </div>
  );
}
