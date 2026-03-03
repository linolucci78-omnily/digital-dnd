// ═══════════════════════════════════════════════
//  POIMarker — Point of Interest sulla mappa
//  Mostra icone clickabili per NPC, porte, tesori, ecc
// ═══════════════════════════════════════════════

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

// Icone default per ogni tipo di POI
const POI_ICONS = {
  npc: "👤",
  door: "🚪",
  lore: "📜",
  treasure: "💎",
  trap: "⚠️",
  quest: "❗",
  secret: "🔍",
};

export default function POIMarker({ poi, onClick, mapWidth, mapHeight }) {
  const [isHovered, setIsHovered] = useState(false);

  // Calcola posizione assoluta basata su % della mappa
  const posX = (poi.x / 100) * mapWidth;
  const posY = (poi.y / 100) * mapHeight;

  // Se non è discovered, non mostrare (a meno che non sia GM)
  if (!poi.discovered) return null;

  const iconSize = 40; // Dimensione icona

  return (
    <>
      <motion.div
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={() => onClick(poi)}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        whileHover={{ scale: 1.2, zIndex: 1000 }}
        whileTap={{ scale: 0.95 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
        style={{
          position: "absolute",
          left: `${posX}px`,
          top: `${posY}px`,
          transform: "translate(-50%, -50%)",
          width: iconSize,
          height: iconSize,
          cursor: "pointer",
          zIndex: 100,
        }}
      >
        {/* Custom icon o emoji default */}
        {poi.icon_url ? (
          <img
            src={poi.icon_url}
            alt={poi.name}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "contain",
              filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.8))",
              pointerEvents: "none",
            }}
          />
        ) : (
          <div
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "2rem",
              background: "rgba(0,0,0,0.7)",
              borderRadius: "50%",
              border: "2px solid var(--gold)",
              boxShadow: "0 0 12px rgba(212,175,55,0.6), 0 4px 12px rgba(0,0,0,0.8)",
              pointerEvents: "none",
            }}
          >
            {POI_ICONS[poi.type] || "❓"}
          </div>
        )}

        {/* Pulse effect per POI importanti */}
        {(poi.type === "quest" || poi.type === "door") && (
          <motion.div
            animate={{
              scale: [1, 1.3, 1],
              opacity: [0.5, 0, 0.5],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            style={{
              position: "absolute",
              inset: -4,
              borderRadius: "50%",
              border: "2px solid var(--gold)",
              pointerEvents: "none",
            }}
          />
        )}
      </motion.div>

      {/* Tooltip on hover */}
      <AnimatePresence>
        {isHovered && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            style={{
              position: "absolute",
              left: `${posX}px`,
              top: `${posY - iconSize - 8}px`,
              transform: "translate(-50%, -100%)",
              background: "rgba(26,20,12,0.95)",
              border: "1px solid var(--gold)",
              borderRadius: 8,
              padding: "8px 12px",
              whiteSpace: "nowrap",
              fontSize: "0.85rem",
              fontFamily: "var(--font-heading)",
              color: "var(--gold)",
              letterSpacing: "0.05em",
              boxShadow: "0 4px 16px rgba(0,0,0,0.9)",
              zIndex: 200,
              pointerEvents: "none",
            }}
          >
            {poi.name}
            <div
              style={{
                position: "absolute",
                bottom: -6,
                left: "50%",
                transform: "translateX(-50%)",
                width: 0,
                height: 0,
                borderLeft: "6px solid transparent",
                borderRight: "6px solid transparent",
                borderTop: "6px solid var(--gold)",
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
