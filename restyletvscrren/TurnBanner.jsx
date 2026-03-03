// TurnBanner — Clean turn transition overlay

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

export default function TurnBanner({ character }) {
  const [show, setShow] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setShow(false), 2000);
    return () => clearTimeout(timer);
  }, [character]);

  if (!show) return null;

  const isPlayer = character.type === "player";
  const color = isPlayer
    ? (character.token_color || "rgba(212,175,55,0.8)")
    : "rgba(220,60,60,0.8)";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      style={{
        position: "fixed",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        zIndex: 150,
        pointerEvents: "none",
      }}
    >
      <div style={{
        background: "rgba(0,0,0,0.75)",
        backdropFilter: "blur(16px)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 12,
        padding: "16px 48px",
        textAlign: "center",
      }}>
        <motion.div
          initial={{ y: -6, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          style={{
            fontFamily: "'Cinzel', serif",
            fontSize: "0.7rem",
            color: "rgba(255,255,255,0.35)",
            letterSpacing: "0.2em",
            marginBottom: 6,
          }}
        >
          TURNO DI
        </motion.div>

        <motion.div
          initial={{ y: 6, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.15 }}
          style={{
            fontFamily: "'Cinzel', serif",
            fontSize: "clamp(1.8rem, 4vw, 3rem)",
            fontWeight: 700,
            color: isPlayer ? "#fff" : "rgba(255,140,140,0.95)",
            letterSpacing: "0.04em",
          }}
        >
          {character.name}
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25 }}
          style={{
            marginTop: 4,
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          }}
        >
          <div style={{
            width: 6, height: 6, borderRadius: "50%",
            background: color,
            boxShadow: `0 0 8px ${color}`,
          }} />
          <span style={{
            fontFamily: "'Cinzel', serif",
            fontSize: "0.55rem",
            color: "rgba(255,255,255,0.25)",
            letterSpacing: "0.15em",
          }}>
            {isPlayer ? "GIOCATORE" : "NEMICO"}
          </span>
          <div style={{
            width: 6, height: 6, borderRadius: "50%",
            background: color,
            boxShadow: `0 0 8px ${color}`,
          }} />
        </motion.div>
      </div>
    </motion.div>
  );
}
