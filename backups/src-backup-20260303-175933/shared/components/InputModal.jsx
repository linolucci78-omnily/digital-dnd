// ═══════════════════════════════════════════════
//  InputModal — Modal con input per sostituire prompt()
// ═══════════════════════════════════════════════

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * Modal con input per sostituire prompt()
 *
 * @param {boolean} isOpen - Se il modal è visibile
 * @param {function} onClose - Callback quando si chiude
 * @param {string} title - Titolo del modal
 * @param {string} label - Label del campo input
 * @param {string} placeholder - Placeholder dell'input
 * @param {string} defaultValue - Valore predefinito
 * @param {string} type - Tipo input: "text" | "number"
 * @param {function} onConfirm - Callback con il valore (value) => void
 */
export default function InputModal({
  isOpen,
  onClose,
  title,
  label,
  placeholder = "",
  defaultValue = "",
  type = "text",
  onConfirm,
}) {
  const [value, setValue] = useState(defaultValue);

  const handleConfirm = () => {
    if (value.trim() || type === "number") {
      onConfirm(value);
      onClose();
      setValue(defaultValue);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      handleConfirm();
    } else if (e.key === "Escape") {
      onClose();
      setValue(defaultValue);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => {
              onClose();
              setValue(defaultValue);
            }}
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
                border: "2px solid rgba(212, 175, 55, 0.4)",
                borderRadius: "12px",
                boxShadow: `
                  0 0 30px rgba(0, 0, 0, 0.9),
                  inset 0 1px 0 rgba(212, 175, 55, 0.1),
                  0 0 60px rgba(212, 175, 55, 0.3)
                `,
                padding: "32px 28px",
                zIndex: 9999,
              }}
            >
              {/* Decorazione */}
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

              {/* Icona */}
              <div style={{
                textAlign: "center",
                fontSize: "3rem",
                marginBottom: "16px",
                filter: "drop-shadow(0 0 20px rgba(212, 175, 55, 0.4))",
              }}>
                ✍️
              </div>

              {/* Titolo */}
              {title && (
                <h3 style={{
                  fontFamily: "var(--font-heading)",
                  fontSize: "1.4rem",
                  color: "var(--gold)",
                  textAlign: "center",
                  marginBottom: "20px",
                  letterSpacing: "0.05em",
                  textShadow: "0 0 20px rgba(212, 175, 55, 0.3)",
                }}>
                  {title}
                </h3>
              )}

              {/* Label */}
              {label && (
                <label style={{
                  display: "block",
                  fontSize: "0.85rem",
                  color: "rgba(212, 175, 55, 0.8)",
                  marginBottom: "8px",
                  fontFamily: "var(--font-body)",
                }}>
                  {label}
                </label>
              )}

              {/* Input */}
              <input
                type={type}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                autoFocus
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  fontSize: "1rem",
                  background: "rgba(0, 0, 0, 0.4)",
                  border: "2px solid rgba(212, 175, 55, 0.3)",
                  borderRadius: "8px",
                  color: "var(--parchment)",
                  fontFamily: "var(--font-body)",
                  marginBottom: "24px",
                  outline: "none",
                  transition: "border-color 0.2s",
                }}
                onFocus={(e) => e.target.style.borderColor = "var(--gold)"}
                onBlur={(e) => e.target.style.borderColor = "rgba(212, 175, 55, 0.3)"}
              />

              {/* Bottoni */}
              <div style={{
                display: "flex",
                gap: "12px",
                justifyContent: "center",
              }}>
                <motion.button
                  className="btn btn-ghost"
                  onClick={() => {
                    onClose();
                    setValue(defaultValue);
                  }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  style={{ flex: 1, maxWidth: "140px" }}
                >
                  Annulla
                </motion.button>

                <motion.button
                  className="btn btn-gold"
                  onClick={handleConfirm}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  style={{ flex: 1, maxWidth: "140px" }}
                >
                  Conferma
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
