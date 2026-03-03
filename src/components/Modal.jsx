// ═══════════════════════════════════════════════════════════
//  Modal Professionale - Sostituisce alert() e confirm()
// ═══════════════════════════════════════════════════════════

import { motion, AnimatePresence } from "framer-motion";

export default function Modal({ isOpen, onClose, title, message, type = "info", onConfirm }) {
  if (!isOpen) return null;

  const isConfirm = type === "confirm";

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 99999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(0,0,0,0.85)",
            backdropFilter: "blur(8px)",
          }}
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "linear-gradient(145deg, rgba(30,25,20,0.98), rgba(20,15,12,0.98))",
              border: "2px solid rgba(212,175,55,0.4)",
              borderRadius: 16,
              padding: "32px 36px",
              minWidth: 400,
              maxWidth: 500,
              boxShadow: "0 20px 60px rgba(0,0,0,0.8), 0 0 100px rgba(212,175,55,0.15)",
            }}
          >
            {/* Header */}
            {title && (
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                marginBottom: 20,
                paddingBottom: 16,
                borderBottom: "1px solid rgba(212,175,55,0.2)",
              }}>
                <div style={{
                  fontSize: "1.8rem",
                  filter: "drop-shadow(0 0 8px rgba(212,175,55,0.5))",
                }}>
                  {type === "error" && "⚠"}
                  {type === "success" && "✓"}
                  {type === "confirm" && "⁇"}
                  {type === "info" && "ⓘ"}
                </div>
                <h3 style={{
                  margin: 0,
                  fontFamily: "var(--font-heading)",
                  fontSize: "1.3rem",
                  color: "var(--gold)",
                  fontWeight: 700,
                  letterSpacing: "0.02em",
                }}>
                  {title}
                </h3>
              </div>
            )}

            {/* Message */}
            <div style={{
              fontSize: "0.95rem",
              color: "rgba(255,255,255,0.85)",
              lineHeight: 1.7,
              marginBottom: 24,
            }}>
              {message}
            </div>

            {/* Actions */}
            <div style={{
              display: "flex",
              gap: 12,
              justifyContent: "flex-end",
              paddingTop: 16,
              borderTop: "1px solid rgba(212,175,55,0.15)",
            }}>
              {isConfirm ? (
                <>
                  <motion.button
                    onClick={onClose}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    style={{
                      padding: "12px 24px",
                      fontSize: "0.9rem",
                      fontWeight: 600,
                      background: "transparent",
                      border: "2px solid rgba(212,175,55,0.3)",
                      borderRadius: 10,
                      color: "rgba(212,175,55,0.9)",
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                    }}
                  >
                    Annulla
                  </motion.button>
                  <motion.button
                    onClick={() => {
                      if (onConfirm) onConfirm();
                      onClose();
                    }}
                    whileHover={{ scale: 1.02, boxShadow: "0 0 25px rgba(212,175,55,0.4)" }}
                    whileTap={{ scale: 0.98 }}
                    style={{
                      padding: "12px 28px",
                      fontSize: "0.9rem",
                      fontWeight: 700,
                      background: "linear-gradient(135deg, #d4af37 0%, #b8941f 100%)",
                      border: "none",
                      borderRadius: 10,
                      color: "#000",
                      cursor: "pointer",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
                      transition: "all 0.2s ease",
                    }}
                  >
                    Conferma
                  </motion.button>
                </>
              ) : (
                <motion.button
                  onClick={onClose}
                  whileHover={{ scale: 1.02, boxShadow: "0 0 25px rgba(212,175,55,0.4)" }}
                  whileTap={{ scale: 0.98 }}
                  style={{
                    padding: "12px 32px",
                    fontSize: "0.9rem",
                    fontWeight: 700,
                    background: "linear-gradient(135deg, #d4af37 0%, #b8941f 100%)",
                    border: "none",
                    borderRadius: 10,
                    color: "#000",
                    cursor: "pointer",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
                    transition: "all 0.2s ease",
                  }}
                >
                  OK
                </motion.button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
