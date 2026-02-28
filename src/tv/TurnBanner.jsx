// ═══════════════════════════════════════════════
//  TurnBanner — Banner cinematico che appare
//  quando cambia turno (stile D&D Beyond)
// ═══════════════════════════════════════════════

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import DnDIcon from "../shared/components/DnDIcon.jsx";

export default function TurnBanner({ character }) {
  const [show, setShow] = useState(true);

  useEffect(() => {
    // Banner appare per 2.5 secondi poi sparisce
    const timer = setTimeout(() => setShow(false), 2500);
    return () => clearTimeout(timer);
  }, [character]);

  if (!show) return null;

  const isPlayer = character.type === "player";
  const accentColor = isPlayer ? "var(--gold)" : "var(--crimson-light)";
  const bgColor = isPlayer ? "rgba(212,175,55,0.15)" : "rgba(192,64,64,0.15)";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      style={{
        position: "fixed",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        zIndex: 150,
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          background: `linear-gradient(135deg, ${bgColor}, ${bgColor}40)`,
          backdropFilter: "blur(20px)",
          border: `3px solid ${accentColor}`,
          borderRadius: 16,
          padding: "20px 40px",
          boxShadow: `
            0 0 60px ${accentColor},
            0 0 100px ${accentColor}60,
            inset 0 0 40px ${accentColor}20
          `,
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Glow pulsante sfondo */}
        <motion.div
          animate={{
            opacity: [0.3, 0.6, 0.3],
            scale: [0.8, 1.2, 0.8],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          style={{
            position: "absolute",
            inset: -100,
            background: `radial-gradient(circle, ${accentColor}40, transparent 70%)`,
            pointerEvents: "none",
          }}
        />

        {/* Contenuto */}
        <div style={{ position: "relative", zIndex: 1, textAlign: "center" }}>
          {/* Label */}
          <motion.div
            initial={{ y: -10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            style={{
              fontFamily: "var(--font-heading)",
              fontSize: "1rem",
              color: `${accentColor}AA`,
              letterSpacing: "0.3em",
              marginBottom: 10,
              textTransform: "uppercase",
            }}
          >
            Turno di
          </motion.div>

          {/* Nome */}
          <motion.div
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            style={{
              fontFamily: "var(--font-heading)",
              fontSize: "clamp(2rem, 5vw, 3.5rem)",
              fontWeight: "900",
              color: accentColor,
              textShadow: `
                0 0 30px ${accentColor},
                0 0 60px ${accentColor}80,
                0 4px 8px rgba(0,0,0,0.8)
              `,
              letterSpacing: "0.05em",
              marginBottom: 8,
            }}
          >
            {character.name}
          </motion.div>

          {/* Tipo */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            style={{
              fontFamily: "var(--font-heading)",
              fontSize: "0.85rem",
              color: "var(--parchment)",
              letterSpacing: "0.2em",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
          >
            <DnDIcon icon={isPlayer ? "crown" : "skull"} size={16} color={accentColor} />
            {isPlayer ? "GIOCATORE" : "NEMICO"}
            <DnDIcon icon={isPlayer ? "crown" : "skull"} size={16} color={accentColor} />
          </motion.div>
        </div>

        {/* Decorazioni angoli */}
        <div style={{
          position: "absolute",
          top: 16,
          left: 16,
          right: 16,
          bottom: 16,
          border: `2px solid ${accentColor}40`,
          borderRadius: 16,
          pointerEvents: "none",
        }} />
      </div>
    </motion.div>
  );
}
