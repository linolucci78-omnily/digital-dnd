// ═══════════════════════════════════════════════
//  POIInteractionModal — Popup per interazione POI
//  Mostra testo, immagine, e opzioni quando clicchi un POI
// ═══════════════════════════════════════════════

import { motion, AnimatePresence } from "framer-motion";

export default function POIInteractionModal({ poi, onClose, onNavigate }) {
  if (!poi) return null;

  const handleDoorClick = () => {
    if (poi.type === "door" && poi.leads_to_location) {
      onNavigate(poi.leads_to_location);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.85)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 2000,
          padding: 24,
          backdropFilter: "blur(8px)",
        }}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: "spring", damping: 25 }}
          onClick={(e) => e.stopPropagation()}
          className="glass-card"
          style={{
            maxWidth: 700,
            width: "100%",
            padding: 32,
            maxHeight: "85vh",
            overflowY: "auto",
            position: "relative",
          }}
        >
          {/* Close button */}
          <button
            onClick={onClose}
            style={{
              position: "absolute",
              top: 16,
              right: 16,
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
              lineHeight: 1,
            }}
            className="hover-gold"
          >
            ×
          </button>

          {/* POI Type badge */}
          <div
            style={{
              display: "inline-block",
              background: getPOITypeColor(poi.type),
              color: "white",
              padding: "4px 12px",
              borderRadius: 6,
              fontSize: "0.7rem",
              fontFamily: "var(--font-heading)",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              marginBottom: 16,
            }}
          >
            {getPOITypeLabel(poi.type)}
          </div>

          {/* Title */}
          <h2
            style={{
              fontFamily: "var(--font-heading)",
              fontSize: "1.8rem",
              color: "var(--gold-light)",
              marginBottom: 20,
              letterSpacing: "0.03em",
            }}
          >
            {poi.name}
          </h2>

          {/* Custom image se presente */}
          {poi.icon_url && (
            <div style={{ marginBottom: 20 }}>
              <img
                src={poi.icon_url}
                alt={poi.name}
                style={{
                  width: "100%",
                  maxHeight: 300,
                  objectFit: "contain",
                  borderRadius: 8,
                  border: "1px solid rgba(212,175,55,0.3)",
                }}
              />
            </div>
          )}

          {/* Description */}
          {poi.description && (
            <div
              style={{
                padding: 16,
                background: "rgba(0,0,0,0.4)",
                borderRadius: 8,
                borderLeft: "4px solid rgba(212,175,55,0.5)",
                marginBottom: 20,
              }}
            >
              <div
                style={{
                  fontSize: "0.7rem",
                  fontFamily: "var(--font-heading)",
                  color: "var(--gold-dark)",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  marginBottom: 8,
                }}
              >
                Descrizione:
              </div>
              <p
                style={{
                  fontSize: "0.95rem",
                  color: "var(--parchment)",
                  lineHeight: 1.6,
                  margin: 0,
                }}
              >
                {poi.description}
              </p>
            </div>
          )}

          {/* Interaction text */}
          {poi.interaction_text && (
            <div
              style={{
                padding: 20,
                background: "rgba(212,175,55,0.08)",
                borderRadius: 8,
                border: "1px solid var(--gold-dark)",
                marginBottom: 20,
              }}
            >
              <p
                style={{
                  fontSize: "1.05rem",
                  color: "var(--parchment-light)",
                  lineHeight: 1.7,
                  fontStyle: "italic",
                  margin: 0,
                }}
              >
                {poi.interaction_text}
              </p>
            </div>
          )}

          {/* Check requirement se presente */}
          {poi.requires_check && (
            <div
              style={{
                padding: 12,
                background: "rgba(64,80,140,0.15)",
                border: "1px solid rgba(64,80,140,0.4)",
                borderRadius: 6,
                fontSize: "0.85rem",
                color: "var(--parchment-dark)",
                marginBottom: 20,
              }}
            >
              <strong style={{ color: "var(--gold)" }}>Check richiesto:</strong> {poi.requires_check} (DC {poi.check_dc || 10})
            </div>
          )}

          {/* Buttons */}
          <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
            {/* Door navigation */}
            {poi.type === "door" && poi.leads_to_location && (
              <button
                onClick={handleDoorClick}
                className="btn btn-gold"
                style={{
                  flex: 1,
                  padding: "12px 24px",
                  fontSize: "0.95rem",
                }}
              >
                🚪 Entra
              </button>
            )}

            {/* Close button */}
            <button
              onClick={onClose}
              className={poi.type === "door" ? "btn btn-ghost" : "btn btn-gold"}
              style={{
                flex: 1,
                padding: "12px 24px",
                fontSize: "0.95rem",
              }}
            >
              {poi.type === "door" ? "Torna Indietro" : "Chiudi"}
            </button>
          </div>
        </motion.div>
      </motion.div>

      {/* Custom hover style */}
      <style>{`
        .hover-gold:hover {
          color: var(--gold);
        }
      `}</style>
    </AnimatePresence>
  );
}

// Helper functions
function getPOITypeColor(type) {
  const colors = {
    npc: "#40c040",
    door: "#4080c0",
    lore: "#c09040",
    treasure: "#c0a040",
    trap: "#c04040",
    quest: "#c040c0",
    secret: "#8040c0",
  };
  return colors[type] || "#6a6a6a";
}

function getPOITypeLabel(type) {
  const labels = {
    npc: "👤 NPC",
    door: "🚪 Porta",
    lore: "📜 Lore",
    treasure: "💎 Tesoro",
    trap: "⚠️ Trappola",
    quest: "❗ Quest",
    secret: "🔍 Segreto",
  };
  return labels[type] || "❓ Sconosciuto";
}
