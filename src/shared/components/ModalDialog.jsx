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

  // Icona SVG basata sul tipo
  const getIcon = () => {
    switch (type) {
      case "success":
        return (
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22 4 12 14.01 9 11.01"></polyline>
          </svg>
        );
      case "error":
        return (
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="15" y1="9" x2="9" y2="15"></line>
            <line x1="9" y1="9" x2="15" y2="15"></line>
          </svg>
        );
      case "confirm":
        return (
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="16" x2="12" y2="12"></line>
            <line x1="12" y1="8" x2="12.01" y2="8"></line>
          </svg>
        );
      default:
        return (
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="16" x2="12" y2="12"></line>
            <line x1="12" y1="8" x2="12.01" y2="8"></line>
          </svg>
        );
    }
  };

  // Colore del bordo basato sul tipo
  const getBorderColor = () => {
    switch (type) {
      case "success": return "rgba(34, 197, 94, 0.6)";
      case "error": return "rgba(220, 38, 38, 0.6)";
      case "confirm": return "rgba(212, 175, 55, 0.6)";
      default: return "rgba(212, 175, 55, 0.4)";
    }
  };

  // Colore icona
  const getIconColor = () => {
    switch (type) {
      case "success": return "#22c55e";
      case "error": return "#dc2626";
      case "confirm": return "#D4AF37";
      default: return "#D4AF37";
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
              initial={{ opacity: 0, scale: 0.95, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 30 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              onClick={(e) => e.stopPropagation()}
              style={{
                position: "relative",
                width: "100%",
                maxWidth: "480px",
                background: "linear-gradient(145deg, rgba(30, 25, 20, 0.98), rgba(20, 15, 10, 0.98))",
                border: `3px solid ${getBorderColor()}`,
                borderRadius: "16px",
                boxShadow: `
                  0 20px 60px rgba(0, 0, 0, 0.8),
                  0 0 0 1px rgba(0, 0, 0, 0.9),
                  inset 0 1px 0 rgba(212, 175, 55, 0.15),
                  0 0 80px ${getBorderColor()}30
                `,
                padding: "40px 32px",
                zIndex: 9999,
              }}
            >
              {/* Decorazione angoli doppia */}
              <div style={{
                position: "absolute",
                top: "12px",
                left: "12px",
                right: "12px",
                bottom: "12px",
                border: "1px solid rgba(212, 175, 55, 0.2)",
                borderRadius: "10px",
                pointerEvents: "none",
              }} />
              <div style={{
                position: "absolute",
                top: "6px",
                left: "6px",
                right: "6px",
                bottom: "6px",
                border: "1px solid rgba(212, 175, 55, 0.1)",
                borderRadius: "12px",
                pointerEvents: "none",
              }} />

              {/* Icona centrale */}
              <div style={{
                textAlign: "center",
                marginBottom: "20px",
                color: getIconColor(),
                filter: `drop-shadow(0 0 20px ${getIconColor()}40)`,
              }}>
                {getIcon()}
              </div>

              {/* Titolo */}
              {title && (
                <h3 style={{
                  fontFamily: "var(--font-heading)",
                  fontSize: "1.5rem",
                  color: getIconColor(),
                  textAlign: "center",
                  marginBottom: "12px",
                  letterSpacing: "0.05em",
                  textShadow: `0 0 30px ${getIconColor()}40`,
                  fontWeight: 700,
                }}>
                  {title}
                </h3>
              )}

              {/* Messaggio */}
              <div style={{
                color: "var(--parchment)",
                fontSize: "1rem",
                lineHeight: 1.7,
                textAlign: "center",
                marginBottom: "32px",
                whiteSpace: "pre-line",
                opacity: 0.95,
              }}>
                {message}
              </div>

              {/* Bottoni */}
              <div style={{
                display: "flex",
                gap: "14px",
                justifyContent: "center",
              }}>
                {/* Bottone Annulla (solo per confirm) */}
                {type === "confirm" && (
                  <motion.button
                    className="btn btn-ghost"
                    onClick={onClose}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    style={{
                      flex: 1,
                      maxWidth: "160px",
                      padding: "12px 20px",
                      fontSize: "0.95rem",
                      fontWeight: 600,
                    }}
                  >
                    {cancelText}
                  </motion.button>
                )}

                {/* Bottone Conferma/OK */}
                <motion.button
                  className={type === "error" ? "btn btn-crimson" : "btn btn-gold"}
                  onClick={handleConfirm}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  style={{
                    flex: 1,
                    maxWidth: type === "confirm" ? "160px" : "200px",
                    padding: "12px 20px",
                    fontSize: "0.95rem",
                    fontWeight: 600,
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
