// ═══════════════════════════════════════════════
//  PlayerMapControls — Joystick virtuale per muovere token
//  Il player non vede la mappa, solo i controlli
//  Il movimento si vede sulla TV
// ═══════════════════════════════════════════════

import { useState, useRef } from "react";
import { motion } from "framer-motion";

export default function PlayerMapControls({
  characterId,
  tvChannel,
  gridSize = 200,
  currentPosition = { x: 0, y: 0 }, // Posizione attuale del token
}) {
  const [pressing, setPressing] = useState(null); // direzione premuta
  const [lastMove, setLastMove] = useState(null);

  // Direzioni: 8 direzioni (N, NE, E, SE, S, SW, W, NW)
  const directions = [
    { id: "n", label: "↑", angle: -90, dx: 0, dy: -1 },
    { id: "ne", label: "↗", angle: -45, dx: 1, dy: -1 },
    { id: "e", label: "→", angle: 0, dx: 1, dy: 0 },
    { id: "se", label: "↘", angle: 45, dx: 1, dy: 1 },
    { id: "s", label: "↓", angle: 90, dx: 0, dy: 1 },
    { id: "sw", label: "↙", angle: 135, dx: -1, dy: 1 },
    { id: "w", label: "←", angle: 180, dx: -1, dy: 0 },
    { id: "nw", label: "↖", angle: 225, dx: -1, dy: -1 },
  ];

  // Muovi token di 1 cella nella direzione
  const moveToken = async (direction) => {
    if (!tvChannel || !characterId) return;

    // Calcola nuova posizione
    const newX = currentPosition.x + (direction.dx * gridSize);
    const newY = currentPosition.y + (direction.dy * gridSize);

    try {
      await tvChannel.send({
        type: "broadcast",
        event: "player_move_request",
        payload: {
          characterId,
          direction: direction.id,
          newX,
          newY,
          gridMove: { dx: direction.dx, dy: direction.dy },
        },
      });

      setLastMove(direction.id);
      console.log(`🕹️ Movimento inviato: ${direction.label}`);
    } catch (err) {
      console.error("❌ Errore invio movimento:", err);
    }
  };

  // Stile posizione bottone circolare
  const getButtonPosition = (angle) => {
    const radius = 80; // distanza dal centro
    const rad = (angle * Math.PI) / 180;
    const x = Math.cos(rad) * radius;
    const y = Math.sin(rad) * radius;
    return {
      left: `calc(50% + ${x}px - 24px)`,
      top: `calc(50% + ${y}px - 24px)`,
    };
  };

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background: "linear-gradient(135deg, rgba(25,20,15,0.98), rgba(15,10,8,0.98))",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
        gap: "30px",
      }}
    >
      {/* Info */}
      <div
        style={{
          textAlign: "center",
          color: "var(--parchment)",
          maxWidth: "300px",
        }}
      >
        <h3
          style={{
            fontFamily: "var(--font-heading)",
            color: "var(--gold)",
            fontSize: "1.3rem",
            marginBottom: "10px",
            letterSpacing: "0.05em",
          }}
        >
          Controlli Movimento
        </h3>
        <p style={{ fontSize: "0.9rem", opacity: 0.8, lineHeight: 1.5 }}>
          Usa il joystick per muovere il tuo personaggio sulla mappa.
          Guarda lo schermo TV per vedere il movimento!
        </p>
      </div>

      {/* Joystick virtuale */}
      <div
        style={{
          position: "relative",
          width: "280px",
          height: "280px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* Cerchio esterno */}
        <div
          style={{
            position: "absolute",
            width: "220px",
            height: "220px",
            borderRadius: "50%",
            border: "2px solid rgba(212,175,55,0.3)",
            background: "radial-gradient(circle, rgba(212,175,55,0.05), transparent)",
            boxShadow: "inset 0 0 30px rgba(0,0,0,0.5)",
          }}
        />

        {/* Centro */}
        <div
          style={{
            position: "absolute",
            width: "60px",
            height: "60px",
            borderRadius: "50%",
            background: "linear-gradient(135deg, rgba(212,175,55,0.3), rgba(212,175,55,0.15))",
            border: "2px solid rgba(212,175,55,0.5)",
            boxShadow: "0 0 20px rgba(212,175,55,0.3)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "var(--font-heading)",
            color: "var(--gold)",
            fontSize: "0.8rem",
          }}
        >
          🎯
        </div>

        {/* Bottoni direzionali */}
        {directions.map((dir) => (
          <motion.button
            key={dir.id}
            onMouseDown={() => {
              setPressing(dir.id);
              moveToken(dir);
            }}
            onMouseUp={() => setPressing(null)}
            onMouseLeave={() => setPressing(null)}
            onTouchStart={(e) => {
              e.preventDefault();
              setPressing(dir.id);
              moveToken(dir);
            }}
            onTouchEnd={() => setPressing(null)}
            whileHover={{ scale: 1.15 }}
            whileTap={{ scale: 0.9 }}
            style={{
              position: "absolute",
              ...getButtonPosition(dir.angle),
              width: "48px",
              height: "48px",
              borderRadius: "50%",
              background:
                pressing === dir.id
                  ? "linear-gradient(135deg, rgba(212,175,55,0.8), rgba(212,175,55,0.6))"
                  : lastMove === dir.id
                  ? "linear-gradient(135deg, rgba(212,175,55,0.5), rgba(212,175,55,0.3))"
                  : "linear-gradient(135deg, rgba(212,175,55,0.3), rgba(212,175,55,0.15))",
              border: `2px solid ${pressing === dir.id ? "var(--gold)" : "rgba(212,175,55,0.4)"}`,
              color: pressing === dir.id ? "#000" : "var(--gold)",
              fontSize: "1.5rem",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow:
                pressing === dir.id
                  ? "0 0 20px rgba(212,175,55,0.6)"
                  : "0 2px 8px rgba(0,0,0,0.3)",
              transition: "all 0.15s ease",
              userSelect: "none",
              WebkitTapHighlightColor: "transparent",
            }}
          >
            {dir.label}
          </motion.button>
        ))}
      </div>

      {/* Ultimo movimento */}
      {lastMove && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            padding: "10px 20px",
            background: "rgba(212,175,55,0.15)",
            border: "1px solid rgba(212,175,55,0.3)",
            borderRadius: "8px",
            color: "var(--gold)",
            fontSize: "0.9rem",
            fontFamily: "var(--font-heading)",
          }}
        >
          ✓ Movimento inviato
        </motion.div>
      )}

      {/* Info tecnica (debug) */}
      <div
        style={{
          fontSize: "0.75rem",
          color: "rgba(212,175,55,0.4)",
          textAlign: "center",
        }}
      >
        Character ID: {characterId || "N/A"}
        <br />
        Connessione: {tvChannel ? "✓ Attiva" : "✗ Non connessa"}
      </div>
    </div>
  );
}
