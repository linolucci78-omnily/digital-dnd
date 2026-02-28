// ═══════════════════════════════════════════════
//  CombatLog — Storia eventi di combattimento
//  Mostra attacchi, danni, saving throws, skill checks
// ═══════════════════════════════════════════════

import { motion, AnimatePresence } from "framer-motion";
import DnDIcon from "../shared/components/DnDIcon.jsx";

// Icona per tipo evento
const EVENT_ICONS = {
  attack: "attack",
  damage: "damage",
  saving_throw: "shield",
  skill_check: "search",
  status_effect: "skull",
  turn_change: "hourglass",
  initiative: "diceD20",
};

export default function CombatLog({ events = [], isVisible = true }) {
  if (!isVisible || events.length === 0) return null;

  // Mostra solo ultimi 15 eventi
  const recentEvents = events.slice(-15);

  return (
    <motion.div
      initial={{ x: 300, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 300, opacity: 0 }}
      style={{
        position: "fixed",
        right: 12,
        top: 100,
        bottom: 12,
        width: "320px",
        background: "rgba(15,20,25,0.95)",
        border: "2px solid rgba(212,175,55,0.3)",
        borderRadius: 12,
        padding: "12px",
        display: "flex",
        flexDirection: "column",
        boxShadow: "0 8px 32px rgba(0,0,0,0.8)",
        backdropFilter: "blur(10px)",
        zIndex: 50,
      }}
    >
      {/* Header */}
      <div style={{
        fontFamily: "var(--font-heading)",
        fontSize: "0.75rem",
        color: "var(--gold)",
        letterSpacing: "0.2em",
        marginBottom: 12,
        paddingBottom: 8,
        borderBottom: "1px solid rgba(212,175,55,0.2)",
        display: "flex",
        alignItems: "center",
        gap: 8,
      }}>
        <DnDIcon icon="scroll" size={16} />
        COMBAT LOG
      </div>

      {/* Eventi */}
      <div style={{
        flex: 1,
        overflowY: "auto",
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}>
        <AnimatePresence initial={false}>
          {recentEvents.map((event, idx) => (
            <motion.div
              key={event.id || idx}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              style={{
                padding: "8px 10px",
                background: event.success === true
                  ? "rgba(64,255,64,0.08)"
                  : event.success === false
                  ? "rgba(255,64,64,0.08)"
                  : "rgba(212,175,55,0.05)",
                border: `1px solid ${
                  event.success === true
                    ? "rgba(64,255,64,0.2)"
                    : event.success === false
                    ? "rgba(255,64,64,0.2)"
                    : "rgba(212,175,55,0.15)"
                }`,
                borderRadius: 6,
                fontSize: "0.7rem",
                lineHeight: 1.4,
              }}
            >
              {/* Timestamp e icona */}
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                marginBottom: 4,
                opacity: 0.6,
              }}>
                <DnDIcon
                  icon={EVENT_ICONS[event.type] || "dice"}
                  size={12}
                  color={event.color || "var(--parchment-dark)"}
                />
                <span style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "0.65rem",
                  color: "var(--parchment-dark)",
                }}>
                  {new Date(event.timestamp).toLocaleTimeString('it-IT', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  })}
                </span>
              </div>

              {/* Nome personaggio */}
              {event.characterName && (
                <div style={{
                  fontFamily: "var(--font-heading)",
                  fontSize: "0.75rem",
                  color: "var(--gold)",
                  marginBottom: 2,
                }}>
                  {event.characterName}
                </div>
              )}

              {/* Messaggio */}
              <div style={{
                fontFamily: "var(--font-body)",
                color: event.success === true
                  ? "#40ff40"
                  : event.success === false
                  ? "#ff4040"
                  : "var(--parchment)",
              }}>
                {event.message}
              </div>

              {/* Badge SUCCESS/FAIL */}
              {event.success !== undefined && (
                <div style={{
                  marginTop: 4,
                  fontSize: "0.65rem",
                  fontFamily: "var(--font-heading)",
                  fontWeight: "700",
                  color: event.success ? "#40ff40" : "#ff4040",
                }}>
                  {event.success ? "✓ SUCCESS" : "✗ FAIL"}
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
