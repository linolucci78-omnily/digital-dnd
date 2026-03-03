// ═══════════════════════════════════════════════
//  HelpTooltip — Tooltip esplicativi per principianti
//  Click per mostrare spiegazione
// ═══════════════════════════════════════════════

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import DnDIcon from "./DnDIcon.jsx";

export default function HelpTooltip({ title, children, position = "bottom" }) {
  const [show, setShow] = useState(false);

  const getPositionStyle = () => {
    switch (position) {
      case "top":
        return { bottom: "100%", left: "50%", transform: "translateX(-50%)", marginBottom: 8 };
      case "bottom":
        return { top: "100%", left: "50%", transform: "translateX(-50%)", marginTop: 8 };
      case "left":
        return { right: "100%", top: "50%", transform: "translateY(-50%)", marginRight: 8 };
      case "right":
        return { left: "100%", top: "50%", transform: "translateY(-50%)", marginLeft: 8 };
      default:
        return { top: "100%", left: "50%", transform: "translateX(-50%)", marginTop: 8 };
    }
  };

  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      {/* Bottone info */}
      <button
        onClick={() => setShow(!show)}
        style={{
          background: "rgba(212,175,55,0.15)",
          border: "1px solid rgba(212,175,55,0.3)",
          borderRadius: "50%",
          width: 20,
          height: 20,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          transition: "all 0.2s",
          color: "var(--gold)",
          fontSize: "0.7rem",
          fontFamily: "var(--font-heading)",
          fontWeight: 700,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "rgba(212,175,55,0.25)";
          e.currentTarget.style.borderColor = "var(--gold)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "rgba(212,175,55,0.15)";
          e.currentTarget.style.borderColor = "rgba(212,175,55,0.3)";
        }}
      >
        ?
      </button>

      {/* Tooltip */}
      <AnimatePresence>
        {show && (
          <>
            {/* Overlay per chiudere */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShow(false)}
              style={{
                position: "fixed",
                inset: 0,
                zIndex: 999,
              }}
            />

            {/* Contenuto tooltip */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ type: "spring", damping: 25 }}
              style={{
                position: "absolute",
                zIndex: 1000,
                ...getPositionStyle(),
                minWidth: 280,
                maxWidth: 320,
              }}
            >
              <div
                className="glass-card"
                style={{
                  padding: 16,
                  background: "rgba(26,20,12,0.98)",
                  border: "2px solid var(--gold)",
                  boxShadow: "0 8px 32px rgba(0,0,0,0.9), 0 0 20px rgba(212,175,55,0.3)",
                }}
              >
                {/* Titolo */}
                {title && (
                  <div
                    style={{
                      fontFamily: "var(--font-heading)",
                      fontSize: "0.85rem",
                      color: "var(--gold)",
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      marginBottom: 12,
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <DnDIcon icon="wisdom" size={18} />
                    {title}
                  </div>
                )}

                {/* Contenuto */}
                <div
                  style={{
                    fontSize: "0.85rem",
                    color: "var(--parchment)",
                    lineHeight: 1.6,
                  }}
                >
                  {children}
                </div>

                {/* Bottone chiudi */}
                <button
                  onClick={() => setShow(false)}
                  className="btn btn-ghost"
                  style={{
                    width: "100%",
                    marginTop: 12,
                    padding: "8px",
                    fontSize: "0.75rem",
                  }}
                >
                  Chiudi
                </button>
              </div>

              {/* Freccia */}
              <div
                style={{
                  position: "absolute",
                  ...(position === "bottom" && {
                    bottom: "100%",
                    left: "50%",
                    transform: "translateX(-50%)",
                    borderLeft: "8px solid transparent",
                    borderRight: "8px solid transparent",
                    borderBottom: "8px solid var(--gold)",
                  }),
                  ...(position === "top" && {
                    top: "100%",
                    left: "50%",
                    transform: "translateX(-50%)",
                    borderLeft: "8px solid transparent",
                    borderRight: "8px solid transparent",
                    borderTop: "8px solid var(--gold)",
                  }),
                }}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
