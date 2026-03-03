// ═══════════════════════════════════════════════
//  ModalDialog — Popup elegante in stile D&D
// ═══════════════════════════════════════════════

import { motion, AnimatePresence } from "framer-motion";

/**
 * Modal Dialog elegante per conferme/alert
 *
 * @param {boolean} isOpen - Se il modal è visibile
 * @param {function} onClose - Callback quando si chiude
 * @param {string} title - Titolo del modal
 * @param {string} message - Messaggio principale
 * @param {string} type - "confirm" | "alert" | "success" | "error"
 * @param {string} confirmText - Testo bottone conferma (default: "Conferma")
 * @param {string} cancelText - Testo bottone annulla (default: "Annulla")
 * @param {function} onConfirm - Callback quando si conferma
 */
export default function ModalDialog({
  isOpen,
  onClose,
  title,
  message,
  type = "alert",
  confirmText = "Conferma",
  cancelText = "Annulla",
  onConfirm,
}) {

  // Icona basata sul tipo
  const getIcon = () => {
    switch (type) {
      case "success": return "✨";
      case "error": return "!";
      case "confirm": return "?";
      default: return "•";
    }
  };

  // Colore del bordo basato sul tipo
  const getBorderColor = () => {
    switch (type) {
      case "success": return "rgba(34, 197, 94, 0.4)";
      case "error": return "rgba(220, 38, 38, 0.4)";
      case "confirm": return "rgba(212, 175, 55, 0.4)";
      default: return "rgba(212, 175, 55, 0.3)";
    }
  };

  const handleConfirm = () => {
    if (onConfirm) onConfirm();
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop oscurato */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            style={{
              position: "fixed",
              inset: 0,
              backgroundColor: "rgba(0, 0, 0, 0.7)",
              backdropFilter: "blur(4px)",
              zIndex: 9998,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "20px",
            }}
          >
            {/* Modal Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              onClick={(e) => e.stopPropagation()}
              style={{
                position: "relative",
                width: "100%",
                maxWidth: "440px",
                background: "linear-gradient(135deg, rgba(25, 20, 15, 0.98), rgba(15, 10, 8, 0.98))",
                border: `2px solid ${getBorderColor()}`,
                borderRadius: "12px",
                boxShadow: `
                  0 0 30px rgba(0, 0, 0, 0.9),
                  inset 0 1px 0 rgba(212, 175, 55, 0.1),
                  0 0 60px ${getBorderColor()}
                `,
                padding: "32px 28px",
                zIndex: 9999,
              }}
            >
              {/* Decorazione angoli */}
              <div style={{
                position: "absolute",
                top: "8px",
                left: "8px",
                right: "8px",
                bottom: "8px",
                border: "1px solid rgba(212, 175, 55, 0.15)",
                borderRadius: "8px",
                pointerEvents: "none",
              }} />

              {/* Icona centrale */}
              <div style={{
                textAlign: "center",
                fontSize: "3rem",
                marginBottom: "16px",
                filter: "drop-shadow(0 0 20px rgba(212, 175, 55, 0.4))",
              }}>
                {getIcon()}
              </div>

              {/* Titolo */}
              {title && (
                <h3 style={{
                  fontFamily: "var(--font-heading)",
                  fontSize: "1.4rem",
                  color: "var(--gold)",
                  textAlign: "center",
                  marginBottom: "16px",
                  letterSpacing: "0.05em",
                  textShadow: "0 0 20px rgba(212, 175, 55, 0.3)",
                }}>
                  {title}
                </h3>
              )}

              {/* Messaggio */}
              <div style={{
                color: "var(--parchment)",
                fontSize: "0.95rem",
                lineHeight: 1.6,
                textAlign: "center",
                marginBottom: "24px",
                whiteSpace: "pre-line",
              }}>
                {message}
              </div>

              {/* Bottoni */}
              <div style={{
                display: "flex",
                gap: "12px",
                justifyContent: "center",
              }}>
                {/* Bottone Annulla (solo per confirm) */}
                {type === "confirm" && (
                  <motion.button
                    className="btn btn-ghost"
                    onClick={onClose}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    style={{
                      flex: 1,
                      maxWidth: "140px",
                    }}
                  >
                    {cancelText}
                  </motion.button>
                )}

                {/* Bottone Conferma/OK */}
                <motion.button
                  className={type === "error" ? "btn btn-crimson" : "btn btn-gold"}
                  onClick={handleConfirm}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  style={{
                    flex: 1,
                    maxWidth: type === "confirm" ? "140px" : "180px",
                  }}
                >
                  {confirmText}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
