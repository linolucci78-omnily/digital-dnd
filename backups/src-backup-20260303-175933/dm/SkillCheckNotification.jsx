// ═══════════════════════════════════════════════
//  SkillCheckNotification — Notifica DM skill check
//  Mostra quando giocatore supera CD di un POI nascosto
// ═══════════════════════════════════════════════

import { motion, AnimatePresence } from "framer-motion";

const CD_LEVELS = [
  { threshold: 20, label: "Difficile", color: "#e67e22", icon: "🟠" },
  { threshold: 15, label: "Medio", color: "#2ecc71", icon: "🟢" },
  { threshold: 10, label: "Facile", color: "#f1c40f", icon: "🟡" },
];

export default function SkillCheckNotification({
  skillCheck,
  discoveredPOIs,
  onReveal,
  onDismiss
}) {
  if (!skillCheck) return null;

  // Determina livello successo
  const successLevels = CD_LEVELS.filter(level => skillCheck.total >= level.threshold);
  const highestSuccess = successLevels[0];

  return (
    <AnimatePresence>
      <motion.div
        style={{
          position: "fixed",
          top: 20,
          right: 20,
          zIndex: 2000,
          maxWidth: 400,
        }}
        initial={{ x: 500, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 500, opacity: 0 }}
        transition={{ type: "spring", damping: 20 }}
      >
        <div
          className="glass-card"
          style={{
            padding: 20,
            background: "linear-gradient(135deg, rgba(10,8,6,0.98), rgba(20,16,12,0.98))",
            border: `2px solid ${highestSuccess?.color || "rgba(212,175,55,0.5)"}`,
            boxShadow: `0 0 30px ${highestSuccess?.color || "rgba(212,175,55,0.3)"}`,
          }}
        >
          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div style={{ fontFamily: "var(--font-heading)", fontSize: "0.7rem", color: "var(--gold)", letterSpacing: "0.2em" }}>
              🎲 SKILL CHECK
            </div>
            <button
              onClick={onDismiss}
              style={{
                background: "none",
                border: "none",
                color: "rgba(212,175,55,0.5)",
                cursor: "pointer",
                fontSize: "1rem",
                padding: 4,
              }}
            >
              ✕
            </button>
          </div>

          {/* Giocatore */}
          <div style={{ fontFamily: "var(--font-heading)", fontSize: "1.1rem", color: "var(--parchment)", marginBottom: 8 }}>
            {skillCheck.characterName}
          </div>
          <div style={{ fontSize: "0.85rem", color: "var(--parchment-dark)", marginBottom: 12 }}>
            {skillCheck.skillLabel}
          </div>

          {/* Risultato */}
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: 12,
            background: "rgba(0,0,0,0.3)",
            borderRadius: 8,
            marginBottom: 12,
          }}>
            <div style={{ fontSize: "2rem" }}>🎲</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: "var(--font-heading)", fontSize: "0.7rem", color: "var(--gold-dark)" }}>
                RISULTATO
              </div>
              <div style={{ fontFamily: "var(--font-heading)", fontSize: "1.8rem", color: "var(--gold)", fontWeight: "700" }}>
                {skillCheck.total}
              </div>
              <div style={{ fontSize: "0.7rem", color: "var(--parchment-dark)" }}>
                d20: {skillCheck.d20} {skillCheck.modifier >= 0 ? "+" : ""}{skillCheck.modifier}
              </div>
            </div>
          </div>

          {/* Indicatori CD */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: "0.65rem", color: "var(--gold-dark)", marginBottom: 6, fontFamily: "var(--font-heading)", letterSpacing: "0.1em" }}>
              LIVELLI DIFFICOLTÀ
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {CD_LEVELS.map(level => {
                const passed = skillCheck.total >= level.threshold;
                return (
                  <div
                    key={level.threshold}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "6px 10px",
                      background: passed ? `${level.color}20` : "rgba(0,0,0,0.2)",
                      borderLeft: `3px solid ${passed ? level.color : "rgba(100,100,100,0.3)"}`,
                      borderRadius: 4,
                      opacity: passed ? 1 : 0.5,
                    }}
                  >
                    <span style={{ fontSize: "0.9rem" }}>{level.icon}</span>
                    <span style={{ fontSize: "0.75rem", color: passed ? level.color : "var(--parchment-dark)", fontFamily: "var(--font-heading)" }}>
                      {level.label} (CD {level.threshold})
                    </span>
                    {passed && <span style={{ marginLeft: "auto", fontSize: "0.7rem", color: level.color }}>✓</span>}
                  </div>
                );
              })}
            </div>
          </div>

          {/* POI Scoperti */}
          {discoveredPOIs.length > 0 && (
            <div
              style={{
                background: "rgba(46,204,113,0.1)",
                border: "2px solid rgba(46,204,113,0.4)",
                borderRadius: 8,
                padding: 12,
                marginBottom: 12,
              }}
            >
              <div style={{
                fontFamily: "var(--font-heading)",
                fontSize: "0.75rem",
                color: "#2ecc71",
                letterSpacing: "0.1em",
                marginBottom: 8,
              }}>
                ✨ SCOPERTE
              </div>
              {discoveredPOIs.map(poi => (
                <div
                  key={poi.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "8px 0",
                    borderBottom: "1px solid rgba(46,204,113,0.2)",
                  }}
                >
                  <div>
                    <div style={{ fontSize: "0.85rem", color: "var(--parchment)", fontFamily: "var(--font-heading)" }}>
                      {poi.name}
                    </div>
                    <div style={{ fontSize: "0.65rem", color: "var(--parchment-dark)" }}>
                      CD {poi.check_dc} ({poi.requires_check})
                    </div>
                  </div>
                  <button
                    className="btn btn-gold"
                    onClick={() => onReveal(poi)}
                    style={{ padding: "6px 12px", fontSize: "0.75rem" }}
                  >
                    👁️ Rivela
                  </button>
                </div>
              ))}
            </div>
          )}

          {discoveredPOIs.length === 0 && (
            <div style={{
              textAlign: "center",
              padding: 12,
              background: "rgba(0,0,0,0.2)",
              borderRadius: 8,
              fontSize: "0.75rem",
              color: "var(--parchment-dark)",
              fontStyle: "italic",
            }}>
              Nessun POI nascosto scoperto con questo tiro
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
