// ═══════════════════════════════════════════════
//  DiceRoller — Lancio dadi con animazione epica
//  Il momento più importante del D&D digitale
//  Supporta: d4, d6, d8, d10, d12, d20, d100
// ═══════════════════════════════════════════════

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
//import DiceBox3D from './DiceBox3D.jsx';
import DDDice3D from './DDDice3D.jsx';

// Forme SVG per ogni dado
export const DICE_SHAPES = {
  d4: (
    <svg viewBox="0 0 100 100" fill="none">
      <polygon points="50,10 90,85 10,85" stroke="currentColor" strokeWidth="4" fill="rgba(0,0,0,0.3)" />
      <polygon points="50,15 85,82 15,82" stroke="currentColor" strokeWidth="1" strokeOpacity="0.3" fill="none" />
    </svg>
  ),
  d6: (
    <svg viewBox="0 0 100 100" fill="none">
      <rect x="10" y="10" width="80" height="80" rx="12" stroke="currentColor" strokeWidth="4" fill="rgba(0,0,0,0.3)" />
      <rect x="16" y="16" width="68" height="68" rx="8" stroke="currentColor" strokeWidth="1" strokeOpacity="0.3" fill="none" />
    </svg>
  ),
  d8: (
    <svg viewBox="0 0 100 100" fill="none">
      <polygon points="50,8 92,40 92,70 50,92 8,70 8,40" stroke="currentColor" strokeWidth="4" fill="rgba(0,0,0,0.3)" />
      <line x1="50" y1="8" x2="50" y2="92" stroke="currentColor" strokeWidth="1" strokeOpacity="0.2" />
      <line x1="8" y1="50" x2="92" y2="50" stroke="currentColor" strokeWidth="1" strokeOpacity="0.2" />
    </svg>
  ),
  d10: (
    <svg viewBox="0 0 100 100" fill="none">
      <polygon points="50,8 90,35 80,78 50,92 20,78 10,35" stroke="currentColor" strokeWidth="4" fill="rgba(0,0,0,0.3)" />
      <polygon points="50,15 83,38 74,74 50,86 26,74 17,38" stroke="currentColor" strokeWidth="1" strokeOpacity="0.3" fill="none" />
    </svg>
  ),
  d12: (
    <svg viewBox="0 0 100 100" fill="none">
      <polygon points="50,8 68,15 82,28 88,46 84,64 72,78 55,87 45,87 28,78 16,64 12,46 18,28 32,15" stroke="currentColor" strokeWidth="4" fill="rgba(0,0,0,0.3)" />
    </svg>
  ),
  d20: (
    <svg viewBox="0 0 100 100" fill="none">
      <polygon points="50,5 94,30 94,70 50,95 6,70 6,30" stroke="currentColor" strokeWidth="4" fill="rgba(0,0,0,0.3)" />
      <polygon points="50,12 87,33 87,67 50,88 13,67 13,33" stroke="currentColor" strokeWidth="1" strokeOpacity="0.3" fill="none" />
      <line x1="50" y1="5" x2="13" y2="33" stroke="currentColor" strokeWidth="1" strokeOpacity="0.15" />
      <line x1="50" y1="5" x2="87" y2="33" stroke="currentColor" strokeWidth="1" strokeOpacity="0.15" />
      <line x1="50" y1="12" x2="13" y2="33" stroke="currentColor" strokeWidth="1" strokeOpacity="0.15" />
      <line x1="50" y1="12" x2="87" y2="33" stroke="currentColor" strokeWidth="1" strokeOpacity="0.15" />
    </svg>
  ),
  d100: (
    <svg viewBox="0 0 100 100" fill="none">
      <circle cx="50" cy="50" r="42" stroke="currentColor" strokeWidth="4" fill="rgba(0,0,0,0.3)" />
      <circle cx="50" cy="50" r="35" stroke="currentColor" strokeWidth="1" strokeOpacity="0.3" fill="none" />
      <circle cx="50" cy="50" r="4" fill="currentColor" opacity="0.5" />
    </svg>
  ),
};

const DICE_SIDES = { d4: 4, d6: 6, d8: 8, d10: 10, d12: 12, d20: 20, d100: 100 };

function rollDie(sides) {
  return Math.floor(Math.random() * sides) + 1;
}

// Tiro singolo con animazione
export function SingleDie({ type = "d20", color = "#d4af37", size = 80, onRoll, disabled = false }) {
  const [value, setValue] = useState(null);
  const [isRolling, setIsRolling] = useState(false);
  const [isNatural, setIsNatural] = useState(null); // null | "nat20" | "nat1"
  const sides = DICE_SIDES[type] || 20;
  const shape = DICE_SHAPES[type] || DICE_SHAPES.d20;

  const roll = useCallback(async () => {
    if (isRolling || disabled) return;
    setIsRolling(true);
    setIsNatural(null);

    // Vibra il telefono
    if (typeof window !== "undefined" && window.navigator?.vibrate) {
      window.navigator.vibrate([20, 10, 30]);
    }

    // Animazione di "rimbalzo" con valori casuali
    const duration = 800;
    const start = Date.now();
    const interval = setInterval(() => {
      setValue(rollDie(sides));
      if (Date.now() - start > duration) {
        clearInterval(interval);
        const final = rollDie(sides);
        setValue(final);
        setIsRolling(false);

        if (type === "d20" && final === 20) {
          setIsNatural("nat20");
          if (window.navigator?.vibrate) window.navigator.vibrate([50, 30, 50, 30, 100]);
        } else if (type === "d20" && final === 1) {
          setIsNatural("nat1");
          if (window.navigator?.vibrate) window.navigator.vibrate([200]);
        }

        if (onRoll) onRoll(final, type);
      }
    }, 60);
  }, [isRolling, disabled, sides, type, onRoll]);

  const dieColor = isNatural === "nat20" ? "#f0d060" : isNatural === "nat1" ? "#c04040" : color;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
      <motion.button
        onClick={roll}
        disabled={disabled || isRolling}
        style={{
          width: size,
          height: size,
          background: "transparent",
          border: "none",
          cursor: disabled ? "default" : "pointer",
          color: dieColor,
          position: "relative",
          padding: 0,
          outline: "none",
        }}
        animate={isRolling ? {
          scale: [1, 1.1, 0.9, 1.05, 0.95, 1],
        } : { rotate: 0, scale: 1 }}
        transition={{ duration: 0.8, repeat: isRolling ? Infinity : 0 }}
        whileHover={!disabled && !isRolling ? { scale: 1.1 } : {}}
        whileTap={!disabled && !isRolling ? { scale: 0.9 } : {}}
      >
        {/* Forma dado */}
        <div style={{ position: "absolute", inset: 0, filter: `drop-shadow(0 0 8px ${dieColor}80)` }}>
          {shape}
        </div>

        {/* Valore al centro */}
        <div style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "var(--font-heading)",
          fontSize: value !== null ? (value >= 10 ? size * 0.28 : size * 0.35) : size * 0.22,
          fontWeight: "900",
          color: dieColor,
          textShadow: `0 0 12px ${dieColor}`,
          letterSpacing: "-0.02em",
        }}>
          {value !== null ? value : type.toUpperCase()}
        </div>
      </motion.button>

      {/* Badge NAT20 / NAT1 */}
      <AnimatePresence>
        {isNatural && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.5 }}
            style={{
              fontFamily: "var(--font-heading)",
              fontSize: "0.8rem",
              fontWeight: "700",
              color: isNatural === "nat20" ? "#f0d060" : "#c04040",
              textShadow: `0 0 10px ${isNatural === "nat20" ? "#f0d060" : "#c04040"}`,
              letterSpacing: "0.1em",
            }}
          >
            {isNatural === "nat20" ? "NATURALE 20" : "NATURALE 1"}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Pannello completo per tirare più dadi
export function DicePanel({ onRoll, playerName, playerColor = "#d4af37", compact = false }) {
  const [selectedDice, setSelectedDice] = useState([]);
  const [modifier, setModifier] = useState(0);
  const [results, setResults] = useState(null);
  const [isRolling, setIsRolling] = useState(false);
  const [rollLabel, setRollLabel] = useState("");

  const diceTypes = ["d4", "d6", "d8", "d10", "d12", "d20", "d100"];

  const addDie = (type) => {
    setSelectedDice(prev => [...prev, type]);
    setResults(null);
  };

  const removeDie = (index) => {
    setSelectedDice(prev => prev.filter((_, i) => i !== index));
    setResults(null);
  };

  const rollAll = async () => {
    if (selectedDice.length === 0 || isRolling) return;
    setIsRolling(true);
    setResults(null);

    if (window.navigator?.vibrate) {
      window.navigator.vibrate([20, 10, 40, 10, 20]);
    }

    // NON calcolare i risultati localmente!
    // Invia solo la REQUEST alla TV che genererà i risultati veri
    if (onRoll) {
      onRoll({
        playerName,
        dice: selectedDice,
        modifier,
        label: rollLabel,
      });
    }

    // Nascondi l'animazione di rolling dopo un po'
    setTimeout(() => {
      setIsRolling(false);
    }, 1000);
  };

  if (compact) {
    return (
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
        {diceTypes.map(type => (
          <motion.button
            key={type}
            onClick={() => {
              const val = rollDie(DICE_SIDES[type]);
              if (onRoll) onRoll({ playerName, dice: [type], rolls: [{ type, value: val }], modifier: 0, total: val, label: type });
            }}
            style={{
              background: "rgba(0,0,0,0.5)",
              border: `2px solid ${playerColor}60`,
              borderRadius: 8,
              color: playerColor,
              fontFamily: "var(--font-heading)",
              fontSize: "0.85rem",
              padding: "8px 12px",
              cursor: "pointer",
              letterSpacing: "0.05em",
            }}
            whileHover={{ scale: 1.05, borderColor: playerColor }}
            whileTap={{ scale: 0.95 }}
          >
            {type.toUpperCase()}
          </motion.button>
        ))}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Selezione dado */}
      <div>
        <div style={{ fontFamily: "var(--font-heading)", fontSize: "0.7rem", color: "var(--gold)", letterSpacing: "0.15em", marginBottom: 10 }}>
          SELEZIONA DADI
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {diceTypes.map(type => (
            <motion.button
              key={type}
              onClick={() => addDie(type)}
              style={{
                width: 52,
                height: 52,
                background: "rgba(0,0,0,0.5)",
                border: `2px solid ${playerColor}50`,
                borderRadius: 10,
                color: playerColor,
                fontFamily: "var(--font-heading)",
                fontSize: "0.8rem",
                fontWeight: "700",
                cursor: "pointer",
                letterSpacing: "0.03em",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
              whileHover={{ scale: 1.1, borderColor: playerColor, background: `${playerColor}20` }}
              whileTap={{ scale: 0.9 }}
            >
              {type.toUpperCase()}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Dadi selezionati */}
      {selectedDice.length > 0 && (
        <div>
          <div style={{ fontFamily: "var(--font-heading)", fontSize: "0.7rem", color: "var(--gold)", letterSpacing: "0.15em", marginBottom: 8 }}>
            TIRO: {selectedDice.join(" + ")}{modifier !== 0 ? ` ${modifier > 0 ? "+" : ""}${modifier}` : ""}
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
            {selectedDice.map((type, i) => (
              <motion.button
                key={i}
                onClick={() => removeDie(i)}
                style={{
                  padding: "4px 12px",
                  background: `${playerColor}20`,
                  border: `1px solid ${playerColor}80`,
                  borderRadius: 6,
                  color: playerColor,
                  fontFamily: "var(--font-heading)",
                  fontSize: "0.85rem",
                  cursor: "pointer",
                }}
                whileHover={{ scale: 1.05, background: "rgba(192,64,64,0.3)" }}
                whileTap={{ scale: 0.95 }}
                title="Clicca per rimuovere"
              >
                {type} ✕
              </motion.button>
            ))}
            {/* Modificatore */}
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginLeft: 8 }}>
              <button onClick={() => setModifier(m => m - 1)} style={{ width: 28, height: 28, background: "rgba(0,0,0,0.5)", border: "1px solid rgba(212,175,55,0.3)", borderRadius: 4, color: "var(--parchment)", cursor: "pointer", fontSize: "1rem" }}>-</button>
              <span style={{ fontFamily: "var(--font-heading)", color: modifier >= 0 ? "var(--gold)" : "var(--crimson-light)", minWidth: 30, textAlign: "center", fontSize: "0.9rem" }}>
                {modifier >= 0 ? "+" : ""}{modifier}
              </span>
              <button onClick={() => setModifier(m => m + 1)} style={{ width: 28, height: 28, background: "rgba(0,0,0,0.5)", border: "1px solid rgba(212,175,55,0.3)", borderRadius: 4, color: "var(--parchment)", cursor: "pointer", fontSize: "1rem" }}>+</button>
              <span style={{ fontSize: "0.7rem", color: "rgba(212,175,55,0.5)", fontFamily: "var(--font-heading)" }}>MOD</span>
            </div>
          </div>
        </div>
      )}

      {/* Etichetta tiro */}
      <input
        type="text"
        placeholder="Etichetta (es: Attacco Spada, Tiro Salvezza CON...)"
        value={rollLabel}
        onChange={e => setRollLabel(e.target.value)}
        style={{ fontSize: "0.9rem" }}
      />

      {/* Bottone tiro */}
      <motion.button
        className="btn btn-gold"
        onClick={rollAll}
        disabled={selectedDice.length === 0 || isRolling}
        style={{
          fontSize: "1rem",
          padding: "14px 28px",
          opacity: selectedDice.length === 0 ? 0.5 : 1,
        }}
        animate={isRolling ? { scale: [1, 1.02, 0.98, 1.01, 0.99, 1] } : { scale: 1 }}
        transition={{ duration: 0.6, repeat: isRolling ? Infinity : 0 }}
        whileHover={selectedDice.length > 0 && !isRolling ? { scale: 1.02 } : {}}
        whileTap={selectedDice.length > 0 && !isRolling ? { scale: 0.98 } : {}}
      >
        {isRolling ? "Lanciando..." : "LANCIA I DADI"}
      </motion.button>

      {/* Risultati */}
      <AnimatePresence>
        {results && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            style={{
              background: "rgba(0,0,0,0.6)",
              border: `1px solid ${playerColor}60`,
              borderRadius: 12,
              padding: 16,
              textAlign: "center",
            }}
          >
            {/* Singoli valori */}
            <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", marginBottom: 10 }}>
              {results.rolls.map((r, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.08 }}
                  style={{
                    background: "rgba(0,0,0,0.5)",
                    border: `1px solid ${playerColor}40`,
                    borderRadius: 8,
                    padding: "6px 12px",
                    fontFamily: "var(--font-heading)",
                    color: "var(--parchment)",
                    fontSize: "0.9rem",
                  }}
                >
                  <span style={{ color: playerColor, fontSize: "0.65rem" }}>{r.type}</span>
                  <br />
                  <span style={{ fontSize: "1.4rem", fontWeight: "700" }}>{r.value}</span>
                </motion.div>
              ))}
              {results.modifier !== 0 && (
                <div style={{
                  background: "rgba(0,0,0,0.5)",
                  border: "1px solid rgba(212,175,55,0.3)",
                  borderRadius: 8,
                  padding: "6px 12px",
                  fontFamily: "var(--font-heading)",
                  color: results.modifier > 0 ? "var(--gold)" : "var(--crimson-light)",
                  fontSize: "0.9rem",
                }}>
                  <span style={{ fontSize: "0.65rem" }}>MOD</span>
                  <br />
                  <span style={{ fontSize: "1.4rem", fontWeight: "700" }}>{results.modifier > 0 ? "+" : ""}{results.modifier}</span>
                </div>
              )}
            </div>

            {/* Totale */}
            <motion.div
              initial={{ scale: 0.5 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", delay: 0.3 }}
              style={{
                fontFamily: "var(--font-heading)",
                fontSize: "3rem",
                fontWeight: "900",
                color: playerColor,
                textShadow: `0 0 20px ${playerColor}80, 0 0 40px ${playerColor}40`,
                lineHeight: 1,
              }}
            >
              {results.total}
            </motion.div>
            <div style={{ color: "rgba(212,175,55,0.5)", fontSize: "0.7rem", fontFamily: "var(--font-heading)", letterSpacing: "0.1em" }}>
              TOTALE
            </div>
            {rollLabel && (
              <div style={{ color: "var(--parchment-dark)", fontSize: "0.85rem", marginTop: 6, fontStyle: "italic" }}>
                {rollLabel}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Dado d20 rapido per la TV/schermata principale con animazione spettacolare
export function EpicDiceRoll({ roll, playerName, playerColor, onComplete }) {
  const [showResult, setShowResult] = useState(false);
  const [diceRollComplete, setDiceRollComplete] = useState(false);

  useEffect(() => {
    // Auto-complete dopo il tempo necessario
    const completeTimer = setTimeout(() => {
      setShowResult(true);
      setDiceRollComplete(true);
      if (onComplete) onComplete();
    }, 5000);

    return () => {
      clearTimeout(completeTimer);
    };
  }, [onComplete]);

  const isNat20 = roll?.total === 20 && roll?.dice?.[0] === "d20";
  const isNat1 = roll?.total === 1 && roll?.dice?.[0] === "d20";
  const diceType = roll?.dice?.[0] || "d20";
  const diceColor = isNat20 ? "#f0d060" : isNat1 ? "#c04040" : playerColor || "var(--gold)";

  const handleDiceComplete = (result) => {
    console.log(" Dado fermato su:", result);
    setTimeout(() => setShowResult(true), 500);
  };

  return (
    <motion.div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.9)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        gap: 20,
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Nome giocatore */}
      <motion.div
        style={{
          fontFamily: "var(--font-heading)",
          fontSize: "2rem",
          color: diceColor,
          letterSpacing: "0.3em",
          textTransform: "uppercase",
          position: "absolute",
          top: 40,
          textShadow: `0 0 20px ${diceColor}`,
        }}
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
      >
        {playerName} lancia {diceType.toUpperCase()}
      </motion.div>

      {/* DADO 3D TEST SEMPLICE */}
      <div style={{
        width: '100%',
        height: '70%',
        position: 'relative',
      }}>
        <DDDice3D
          diceType={diceType}
          diceColor={diceColor}
          autoRoll={true}
        />
      </div>

      {/* Risultato - appare dopo l'animazione del dado */}
      <AnimatePresence>
        {showResult && (
          <motion.div
            style={{
              fontFamily: "var(--font-heading)",
              fontSize: "8rem",
              fontWeight: "900",
              color: isNat20 ? "#f0d060" : isNat1 ? "#c04040" : "var(--parchment)",
              textShadow: isNat20
                ? "0 0 40px #f0d060, 0 0 80px #f0d06080, 0 0 120px #f0d06060"
                : isNat1
                  ? "0 0 40px #c04040, 0 0 80px #c0404080, 0 0 120px #c0404060"
                  : "0 0 30px rgba(212,175,55,0.8), 0 0 60px rgba(212,175,55,0.4)",
              lineHeight: 1,
            }}
            initial={{ opacity: 0, scale: 0.3, rotateZ: -180 }}
            animate={{
              opacity: 1,
              scale: [0.3, 1.3, 0.9, 1.1, 1],
              rotateZ: 0
            }}
            transition={{ type: "spring", stiffness: 400, damping: 20, duration: 0.8 }}
          >
            {roll?.total ?? "?"}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Etichetta - appare dopo il risultato */}
      <AnimatePresence>
        {showResult && (isNat20 || isNat1 || roll?.label) && (
          <motion.div
            style={{
              fontFamily: "var(--font-heading)",
              fontSize: "1.8rem",
              color: isNat20 ? "#f0d060" : isNat1 ? "#c04040" : "var(--parchment-dark)",
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              textShadow: isNat20
                ? "0 0 20px #f0d060"
                : isNat1
                  ? "0 0 20px #c04040"
                  : "none",
            }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, type: "spring" }}
          >
            {isNat20 ? "COLPO CRITICO!" : isNat1 ? "FALLIMENTO CRITICO" : roll?.label}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dettaglio tiro */}
      <AnimatePresence>
        {showResult && roll?.label && !isNat20 && !isNat1 && (
          <motion.div
            style={{
              color: "rgba(212,175,55,0.6)",
              fontSize: "1.1rem",
              fontFamily: "var(--font-heading)"
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            {roll.dice?.join(" + ")}{roll.modifier ? ` + ${roll.modifier}` : ""} = {roll.total}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Particelle per nat20 */}
      {isNat20 && Array.from({ length: 12 }).map((_, i) => (
        <motion.div
          key={i}
          style={{
            position: "absolute",
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: "#f0d060",
          }}
          initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
          animate={{
            x: Math.cos((i / 12) * Math.PI * 2) * (100 + Math.random() * 80),
            y: Math.sin((i / 12) * Math.PI * 2) * (100 + Math.random() * 80),
            opacity: 0,
            scale: 0,
          }}
          transition={{ delay: 0.8, duration: 1, ease: "easeOut" }}
        />
      ))}
    </motion.div>
  );
}

export default DicePanel;
