// ═══════════════════════════════════════════════
//  DMDashboard — Plancia di Comando del DM
//  Card con immagini + icone medievali DnDIcon
// ═══════════════════════════════════════════════

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import DnDIcon from "../shared/components/DnDIcon.jsx";

const SECTIONS = [
  {
    id: "dm-main",
    title: "Dungeon Master",
    subtitle: "Scene, Mappa, Combattimento",
    icon: "crown",
    image: "/cards/dm-main-card.png",
    accent: "#d4af37",
    glow: "rgba(212,175,55,0.35)",
    span: 2,
  },
  {
    id: "party",
    title: "Party",
    subtitle: "Gestisci gli eroi",
    icon: "shield",
    image: "/cards/party-card.png",
    accent: "#4caf50",
    glow: "rgba(76,175,80,0.3)",
  },
  {
    id: "npcs",
    title: "NPC",
    subtitle: "Nemici ed alleati",
    icon: "dragon",
    image: "/cards/npc-card.png",
    accent: "#c04040",
    glow: "rgba(192,64,64,0.3)",
  },
  {
    id: "inventory",
    title: "Tesori",
    subtitle: "Bottino e oggetti magici",
    icon: "chest",
    image: "/cards/inventory-card.png",
    accent: "#e6a817",
    glow: "rgba(230,168,23,0.3)",
  },
  {
    id: "diary",
    title: "Diario",
    subtitle: "Note e progressione",
    icon: "book",
    image: "/cards/diary-card.png",
    accent: "#9c6baf",
    glow: "rgba(156,107,175,0.3)",
  },
  {
    id: "music",
    title: "Music",
    subtitle: "Atmosfera e sound",
    icon: "performance",
    image: "/cards/mcard.png",
    accent: "#26a69a",
    glow: "rgba(38,166,154,0.3)",
  },
  {
    id: "dice",
    title: "Dadi",
    subtitle: "Tiri e prove",
    icon: "diceD20",
    image: "/cards/dice-card.png",
    accent: "#d4af37",
    glow: "rgba(212,175,55,0.3)",
  },
];

export default function DMDashboard({ onSelectSection, sessionData }) {
  const [hoveredCard, setHoveredCard] = useState(null);
  const [selectedCard, setSelectedCard] = useState(null);
  const [particles, setParticles] = useState([]);

  // Floating embers
  useEffect(() => {
    setParticles(Array.from({ length: 20 }, (_, i) => ({
      id: i,
      x: Math.random() * 100, y: Math.random() * 100,
      size: Math.random() * 3 + 1,
      duration: Math.random() * 15 + 10,
      delay: Math.random() * 8,
      opacity: Math.random() * 0.12 + 0.04,
    })));
  }, []);

  const handleCardClick = (section) => {
    setSelectedCard(section.id);
    setTimeout(() => onSelectSection(section.id), 450);
  };

  return (
    <div style={{
      width: "100%", minHeight: "100vh",
      background: "#080604", position: "relative", overflow: "hidden",
    }}>
      {/* Ambient light */}
      <div style={{
        position: "fixed", inset: 0, zIndex: 0,
        background:
          "radial-gradient(ellipse at 50% 0%, rgba(212,175,55,0.04) 0%, transparent 50%), " +
          "radial-gradient(ellipse at 20% 80%, rgba(139,69,19,0.03) 0%, transparent 40%), " +
          "radial-gradient(ellipse at 80% 60%, rgba(139,0,0,0.02) 0%, transparent 40%)",
      }} />

      {/* Vignette */}
      <div style={{
        position: "fixed", inset: 0, zIndex: 0,
        boxShadow: "inset 0 0 200px 60px rgba(0,0,0,0.7)",
        pointerEvents: "none",
      }} />

      {/* Embers */}
      {particles.map((p) => (
        <div key={p.id} style={{
          position: "fixed", left: `${p.x}%`, top: `${p.y}%`,
          width: p.size, height: p.size, borderRadius: "50%",
          background: `rgba(212,175,55,${p.opacity})`,
          boxShadow: `0 0 ${p.size * 3}px rgba(212,175,55,${p.opacity * 0.5})`,
          animation: `ember-float ${p.duration}s ease-in-out ${p.delay}s infinite`,
          zIndex: 0, pointerEvents: "none",
        }} />
      ))}

      {/* Content */}
      <div style={{
        position: "relative", zIndex: 2,
        maxWidth: 1300, margin: "0 auto",
        padding: "clamp(30px, 5vh, 60px) clamp(20px, 3vw, 50px) 60px",
        display: "flex", flexDirection: "column", minHeight: "100vh",
      }}>
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          style={{ textAlign: "center", marginBottom: "clamp(30px, 4vh, 50px)" }}
        >
          <div style={{
            display: "flex", alignItems: "center", gap: 16,
            marginBottom: 16, justifyContent: "center",
          }}>
            <OrnamentLine flip />
            <DnDIcon icon="crown" size={20} color="rgba(212,175,55,0.5)" />
            <OrnamentLine />
          </div>

          <h1 style={{
            fontFamily: "'Cinzel Decorative', 'Cinzel', serif",
            fontSize: "clamp(1.8rem, 4.5vw, 3.2rem)",
            fontWeight: 900, color: "#d4af37",
            letterSpacing: "0.1em", margin: 0,
            textShadow: "0 0 60px rgba(212,175,55,0.2), 0 2px 4px rgba(0,0,0,0.8)",
          }}>
            Tavolo del Dungeon Master
          </h1>

          <motion.p
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            style={{
              fontFamily: "'Cinzel', serif", fontSize: "0.85rem",
              color: "rgba(212,175,55,0.35)", letterSpacing: "0.15em", marginTop: 10,
            }}
          >
            Sessione:{" "}
            <span style={{ color: "rgba(212,175,55,0.6)" }}>
              {sessionData?.name || "Nuova Avventura"}
            </span>
          </motion.p>
        </motion.header>

        {/* Cards grid */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "clamp(12px, 1.5vw, 22px)",
          flex: 1, alignContent: "start",
        }}>
          {SECTIONS.map((section, index) => {
            const isHovered = hoveredCard === section.id;
            const isLarge = section.span === 2;

            return (
              <motion.div
                key={section.id}
                initial={{ opacity: 0, y: 30, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{
                  duration: 0.5, delay: 0.15 + index * 0.07,
                  ease: [0.25, 0.46, 0.45, 0.94],
                }}
                onMouseEnter={() => setHoveredCard(section.id)}
                onMouseLeave={() => setHoveredCard(null)}
                onClick={() => handleCardClick(section)}
                style={{
                  gridColumn: isLarge ? "span 2" : "span 1",
                  position: "relative",
                  aspectRatio: isLarge ? "2 / 1.15" : "1 / 1.15",
                  cursor: "pointer",
                }}
              >
                {/* Outer glow */}
                <motion.div
                  animate={{
                    boxShadow: isHovered
                      ? `0 8px 50px ${section.glow}, 0 0 80px ${section.glow}`
                      : "0 4px 20px rgba(0,0,0,0.4)",
                  }}
                  transition={{ duration: 0.35 }}
                  style={{
                    position: "absolute", inset: -1,
                    borderRadius: 14, pointerEvents: "none", zIndex: 0,
                  }}
                />

                {/* Card */}
                <motion.div
                  animate={{
                    y: isHovered ? -8 : 0,
                    scale: isHovered ? 1.03 : 1,
                  }}
                  transition={{ duration: 0.35, ease: "easeOut" }}
                  style={{
                    position: "absolute", inset: 0,
                    borderRadius: 12, overflow: "hidden",
                    willChange: "transform",
                  }}
                >
                  {/* Background image */}
                  <div style={{
                    position: "absolute", inset: 0,
                    backgroundImage: `url(${section.image})`,
                    backgroundSize: "cover", backgroundPosition: "center",
                    transition: "transform 0.6s ease, filter 0.4s",
                    transform: isHovered ? "scale(1.08)" : "scale(1)",
                    filter: isHovered ? "brightness(1.15) saturate(1.1)" : "brightness(0.85) saturate(0.9)",
                  }} />

                  {/* Bottom gradient */}
                  <div style={{
                    position: "absolute", inset: 0,
                    background: isHovered
                      ? "linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.4) 35%, transparent 65%)"
                      : "linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.15) 40%, transparent 70%)",
                    transition: "all 0.4s",
                  }} />

                  {/* Color overlay on hover */}
                  <motion.div
                    animate={{ opacity: isHovered ? 0.12 : 0 }}
                    transition={{ duration: 0.3 }}
                    style={{
                      position: "absolute", inset: 0,
                      background: section.accent, mixBlendMode: "overlay",
                    }}
                  />

                  {/* Corner accents */}
                  <div style={{
                    position: "absolute", top: 14, left: 14,
                    width: 24, height: 24, zIndex: 3,
                    borderTop: `2px solid ${isHovered ? section.accent : "rgba(212,175,55,0.2)"}`,
                    borderLeft: `2px solid ${isHovered ? section.accent : "rgba(212,175,55,0.2)"}`,
                    borderTopLeftRadius: 4, transition: "border-color 0.3s",
                  }} />
                  <div style={{
                    position: "absolute", bottom: 14, right: 14,
                    width: 24, height: 24, zIndex: 3,
                    borderBottom: `2px solid ${isHovered ? section.accent : "rgba(212,175,55,0.2)"}`,
                    borderRight: `2px solid ${isHovered ? section.accent : "rgba(212,175,55,0.2)"}`,
                    borderBottomRightRadius: 4, transition: "border-color 0.3s",
                  }} />

                  {/* Content */}
                  <div style={{
                    position: "absolute", bottom: 0, left: 0, right: 0,
                    padding: isLarge ? "0 28px 22px" : "0 20px 18px",
                    zIndex: 3,
                  }}>
                    {/* Icon */}
                    <motion.div
                      animate={{ scale: isHovered ? 1.15 : 1, y: isHovered ? -4 : 0 }}
                      transition={{ duration: 0.3 }}
                      style={{
                        marginBottom: 10,
                        filter: isHovered ? `drop-shadow(0 0 12px ${section.glow})` : "none",
                        transition: "filter 0.3s",
                      }}
                    >
                      <DnDIcon
                        icon={section.icon}
                        size={isLarge ? 36 : 28}
                        color={isHovered ? section.accent : "rgba(240,230,210,0.7)"}
                      />
                    </motion.div>

                    {/* Title */}
                    <h3 style={{
                      fontFamily: "'Cinzel Decorative', 'Cinzel', serif",
                      fontSize: isLarge ? "clamp(1.3rem, 2.5vw, 1.8rem)" : "clamp(0.95rem, 1.5vw, 1.15rem)",
                      fontWeight: 700, margin: "0 0 4px 0",
                      letterSpacing: "0.05em",
                      color: isHovered ? section.accent : "rgba(240,230,210,0.95)",
                      transition: "color 0.3s",
                      textShadow: isHovered
                        ? `0 0 25px ${section.glow}, 0 2px 8px rgba(0,0,0,0.9)`
                        : "0 2px 6px rgba(0,0,0,0.8)",
                    }}>
                      {section.title}
                    </h3>

                    {/* Subtitle */}
                    <motion.p
                      animate={{ opacity: isHovered ? 1 : 0.5, y: isHovered ? 0 : 3 }}
                      transition={{ duration: 0.25 }}
                      style={{
                        fontFamily: "'Cinzel', serif",
                        fontSize: "0.68rem",
                        color: "rgba(212,175,55,0.5)",
                        letterSpacing: "0.08em", margin: 0,
                      }}
                    >
                      {section.subtitle}
                    </motion.p>
                  </div>

                  {/* Arrow on hover */}
                  <motion.div
                    animate={{ opacity: isHovered ? 1 : 0, x: isHovered ? 0 : -8 }}
                    transition={{ duration: 0.2 }}
                    style={{
                      position: "absolute", top: 16, right: 18, zIndex: 3,
                      color: section.accent,
                      textShadow: `0 0 12px ${section.glow}`,
                    }}
                  >
                    <DnDIcon icon="arrow" size={16} />
                  </motion.div>
                </motion.div>
              </motion.div>
            );
          })}
        </div>

        {/* Footer */}
        <motion.footer
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          transition={{ delay: 1.0, duration: 0.6 }}
          style={{
            marginTop: "clamp(24px, 3vh, 40px)",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 14,
          }}
        >
          <div style={{ width: 40, height: 1, background: "linear-gradient(90deg, transparent, rgba(212,175,55,0.15))" }} />
          <span style={{
            fontSize: "0.55rem", color: "rgba(212,175,55,0.15)",
            letterSpacing: "0.25em", fontFamily: "'Cinzel', serif",
          }}>
            DIGITAL D&D 5E
          </span>
          <div style={{ width: 40, height: 1, background: "linear-gradient(90deg, rgba(212,175,55,0.15), transparent)" }} />
        </motion.footer>
      </div>

      {/* Transition overlay */}
      <AnimatePresence>
        {selectedCard && (() => {
          const s = SECTIONS.find((x) => x.id === selectedCard);
          return (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              style={{
                position: "fixed", inset: 0, zIndex: 100,
                background: "rgba(8,6,4,0.98)",
                display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center", gap: 16,
              }}
            >
              <motion.div
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 0.8 }}
                transition={{ duration: 0.3 }}
              >
                <DnDIcon icon={s?.icon} size={60} color={s?.accent} />
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15, duration: 0.25 }}
                style={{
                  fontFamily: "'Cinzel', serif", fontSize: "1.1rem",
                  color: s?.accent, letterSpacing: "0.15em",
                }}
              >
                {s?.title}
              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>

      <style>{`
        @keyframes ember-float {
          0%, 100% { transform: translateY(0) translateX(0); opacity: 0; }
          10% { opacity: 1; }
          50% { transform: translateY(-80px) translateX(20px); }
          90% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}

function OrnamentLine({ flip = false }) {
  return (
    <div style={{
      width: "clamp(60px, 12vw, 140px)", height: 6,
      position: "relative", transform: flip ? "scaleX(-1)" : "none",
    }}>
      <div style={{
        position: "absolute", top: 2, width: "100%", height: 1,
        background: "linear-gradient(90deg, rgba(212,175,55,0.4), transparent)",
      }} />
      <div style={{
        position: "absolute", top: 4, width: "60%", height: 1,
        background: "linear-gradient(90deg, rgba(212,175,55,0.2), transparent)",
      }} />
    </div>
  );
}
