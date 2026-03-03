// ═══════════════════════════════════════════════
//  DiceRollModal — Modal fullscreen per dadi 3D DM
//  I dadi rotolano in un overlay elegante
// ═══════════════════════════════════════════════

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import FinalDiceBox from "./FinalDiceBox.jsx";
import DnDIcon from "./DnDIcon.jsx";
import { DICE_SHAPES } from "./DiceRoller.jsx";

/**
 * Modal fullscreen per lanciare dadi 3D (usato dal DM)
 *
 * @param {boolean} isOpen - Se il modal è visibile
 * @param {function} onClose - Callback quando si chiude
 * @param {string} playerName - Nome del giocatore/DM
 * @param {string} playerColor - Colore del giocatore
 * @param {function} onRollComplete - Callback quando il lancio è completo
 */
export default function DiceRollModal({
  isOpen,
  onClose,
  playerName = "Dungeon Master",
  playerColor = "var(--gold)",
  onRollComplete,
  tvChannel = null, // Canale per inviare alla TV
}) {
  const diceBoxRef = useRef(null);
  const [selectedDice, setSelectedDice] = useState([]);
  const [modifier, setModifier] = useState(0);
  const [isRolling, setIsRolling] = useState(false);
  const [lastResult, setLastResult] = useState(null);
  const [showOnTV, setShowOnTV] = useState(false); // Toggle per mostrare sulla TV

  const diceTypes = ["d4", "d6", "d8", "d10", "d12", "d20", "d100"];

  // Reset stato quando il modale si apre
  useEffect(() => {
    if (isOpen) {
      setLastResult(null);
      setSelectedDice([]);
      setModifier(0);
      setIsRolling(false); // ✨ Reset stato lancio
    }
  }, [isOpen]);

  const addDie = (type) => {
    setSelectedDice(prev => [...prev, type]);
  };

  const removeDie = (index) => {
    setSelectedDice(prev => prev.filter((_, i) => i !== index));
  };

  const clearDice = () => {
    setSelectedDice([]);
    setModifier(0);
    setLastResult(null); // Pulisce anche i risultati visualizzati

    // Pulisce anche i dadi 3D dalla scena
    if (diceBoxRef.current && diceBoxRef.current.hide) {
      diceBoxRef.current.hide();
    }
  };

  const rollDice = async () => {
    console.log(" rollDice chiamato - selectedDice:", selectedDice, "isRolling:", isRolling);

    if (selectedDice.length === 0 || isRolling) {
      console.log(" Blocco: nessun dado o già in lancio");
      return;
    }

    console.log(" Inizio lancio dadi... showOnTV:", showOnTV, "tvChannel:", !!tvChannel);
    setIsRolling(true);

    // ========================================
    // SE "MOSTRA SULLA TV" È ATTIVO → Invia alla TV
    // ========================================
    if (showOnTV && tvChannel) {
      console.log(" DM lancia dadi PUBBLICI sulla TV");

      try {
        // Raggruppa i dadi per tipo (come nel lancio locale)
        const diceCounts = {};
        selectedDice.forEach(die => {
          diceCounts[die] = (diceCounts[die] || 0) + 1;
        });

        // Lancia solo il primo gruppo di dadi dello stesso tipo
        const firstDieType = selectedDice[0];
        const count = diceCounts[firstDieType];

        // Crea array con N dadi dello stesso tipo
        const diceToRoll = Array(count).fill(firstDieType);

        console.log(" Invio alla TV:", diceToRoll, "tipo:", firstDieType, "count:", count);

        await tvChannel.send({
          type: "broadcast",
          event: "dice_roll_request",
          payload: {
            characterName: playerName,
            dice: diceToRoll, // Array di dadi TUTTI dello stesso tipo
            modifier: modifier,
            label: "DM Roll",
            diceTheme: "default", // Stesso tema dei player
            timestamp: Date.now(),
            isDMRoll: true,
          },
        });

        console.log(" Richiesta inviata alla TV - dadi visibili a tutti!");

        // Chiudi il modal - i dadi appariranno sulla TV
        onClose();
      } catch (err) {
        console.error(" Errore invio dadi alla TV:", err);
        setIsRolling(false);
      }

      return;
    }

    // ========================================
    // ALTRIMENTI → Lancio SEGRETO locale (solo DM vede)
    // ========================================
    console.log("🙈 DM lancia dadi SEGRETI (solo lui vede)");

    // Pulisci i risultati precedenti PRIMA di lanciare
    setLastResult(null);

    // Costruisci la notation per i dadi (es. "2d20" o "1d6+3")
    const diceCounts = {};
    selectedDice.forEach(die => {
      diceCounts[die] = (diceCounts[die] || 0) + 1;
    });

    // Per semplicità, lancia tutti i dadi della stessa tipologia insieme
    // Se ci sono più tipi, lancia il primo gruppo
    const firstDieType = selectedDice[0];
    const count = diceCounts[firstDieType];
    const notation = `${count}${firstDieType}`;

    console.log(" Lancio dadi:", notation, "modificatore:", modifier);
    console.log(" diceBoxRef.current:", !!diceBoxRef.current, "roll method:", !!diceBoxRef.current?.roll);

    if (diceBoxRef.current && diceBoxRef.current.roll) {
      console.log(" DiceBox pronto, lancio...");
      await diceBoxRef.current.roll(notation, (results) => {
        console.log(" Risultati REALI dai dadi 3D:", results);

        // Calcola il totale DAI RISULTATI REALI dei dadi 3D
        const total = results.reduce((sum, die) => sum + die.value, 0);
        const finalTotal = total + modifier;

        // Salva i risultati DOPO che i dadi si sono fermati
        setTimeout(() => {
          setLastResult({
            rolls: results,
            total: total,
            modifier: modifier,
            finalTotal: finalTotal,
            notation: notation,
          });
          setIsRolling(false);

          if (onRollComplete) {
            onRollComplete({ results, modifier, notation, total, finalTotal });
          }
        }, 500); // Piccolo delay per far vedere i dadi fermi prima di mostrare i risultati
      });
    } else {
      console.error(" DiceBox non pronto!");
      setIsRolling(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop con blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            style={{
              position: "fixed",
              inset: 0,
              backgroundColor: "rgba(0, 0, 0, 0.85)",
              backdropFilter: "blur(8px)",
              zIndex: 9998,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "20px",
            }}
          >
            {/* Modal Container */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 30 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              onClick={(e) => e.stopPropagation()}
              style={{
                position: "relative",
                width: "100%",
                maxWidth: "900px",
                height: "auto",
                maxHeight: "90vh",
                background: "linear-gradient(135deg, rgba(25, 20, 15, 0.98), rgba(15, 10, 8, 0.98))",
                border: "2px solid rgba(212, 175, 55, 0.5)",
                borderRadius: "16px",
                boxShadow: `
                  0 0 40px rgba(0, 0, 0, 0.9),
                  inset 0 2px 0 rgba(212, 175, 55, 0.15),
                  0 0 80px rgba(212, 175, 55, 0.4)
                `,
                padding: "32px",
                zIndex: 9999,
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
              }}
            >
              {/* Decorazione angoli */}
              <div style={{
                position: "absolute",
                top: "12px",
                left: "12px",
                right: "12px",
                bottom: "12px",
                border: "1px solid rgba(212, 175, 55, 0.2)",
                borderRadius: "12px",
                pointerEvents: "none",
              }} />

              {/* Header */}
              <div style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "24px",
                position: "relative",
                zIndex: 1,
              }}>
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                }}>
                  <DnDIcon icon="dice" size={32} color={playerColor} />
                  <div>
                    <h2 style={{
                      fontFamily: "var(--font-heading)",
                      fontSize: "1.8rem",
                      color: playerColor,
                      margin: 0,
                      letterSpacing: "0.05em",
                      textShadow: `0 0 20px ${playerColor}80`,
                    }}>
                      {playerName}
                    </h2>
                    <div style={{
                      fontSize: "0.85rem",
                      color: "rgba(212, 175, 55, 0.6)",
                      fontFamily: "var(--font-body)",
                      fontStyle: "italic",
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}>
                      <DnDIcon
                        icon={showOnTV ? "eye" : "scroll"}
                        size={14}
                        color="rgba(212, 175, 55, 0.6)"
                      />
                      {showOnTV ? "Visibile sulla TV" : "Lancio Segreto (Solo tu vedi)"}
                    </div>
                  </div>
                </div>

                {/* Toggle Medievale "Mostra sulla TV" */}
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 16,
                    padding: "10px 16px",
                    background: showOnTV ? "rgba(212, 175, 55, 0.15)" : "rgba(0, 0, 0, 0.3)",
                    border: `2px solid ${showOnTV ? "rgba(212, 175, 55, 0.5)" : "rgba(100, 100, 100, 0.3)"}`,
                    borderRadius: 8,
                    transition: "all 0.3s",
                  }}
                >
                  {/* Label e Icona */}
                  <div style={{
                    fontSize: "0.9rem",
                    color: showOnTV ? playerColor : "rgba(200, 200, 200, 0.7)",
                    fontWeight: showOnTV ? "bold" : "normal",
                    fontFamily: "var(--font-heading)",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}>
                    <DnDIcon
                      icon={showOnTV ? "eye" : "scroll"}
                      size={18}
                      color={showOnTV ? playerColor : "rgba(200, 200, 200, 0.7)"}
                    />
                    {showOnTV ? "Visibile sulla TV" : "Solo DM"}
                  </div>

                  {/* Toggle Switch Medievale */}
                  <motion.div
                    onClick={() => setShowOnTV(!showOnTV)}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    style={{
                      position: "relative",
                      width: 56,
                      height: 28,
                      background: showOnTV
                        ? `linear-gradient(135deg, ${playerColor}60, ${playerColor}40)`
                        : "rgba(60, 60, 60, 0.5)",
                      border: `2px solid ${showOnTV ? playerColor : "rgba(100, 100, 100, 0.5)"}`,
                      borderRadius: 14,
                      cursor: "pointer",
                      transition: "all 0.3s",
                      boxShadow: showOnTV ? `0 0 15px ${playerColor}60` : "none",
                    }}
                  >
                    {/* Pallino Toggle */}
                    <motion.div
                      animate={{
                        x: showOnTV ? 28 : 0,
                      }}
                      transition={{
                        type: "spring",
                        stiffness: 500,
                        damping: 30,
                      }}
                      style={{
                        position: "absolute",
                        top: 2,
                        left: 2,
                        width: 20,
                        height: 20,
                        borderRadius: "50%",
                        background: showOnTV
                          ? `radial-gradient(circle, ${playerColor}, ${playerColor}cc)`
                          : "rgba(150, 150, 150, 0.8)",
                        border: `2px solid ${showOnTV ? "rgba(255, 255, 255, 0.3)" : "rgba(80, 80, 80, 0.5)"}`,
                        boxShadow: showOnTV
                          ? `0 0 10px ${playerColor}, inset 0 1px 2px rgba(255,255,255,0.3)`
                          : "0 2px 4px rgba(0,0,0,0.3)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {/* Icona nel pallino */}
                      <DnDIcon
                        icon={showOnTV ? "eye" : "scroll"}
                        size={10}
                        color={showOnTV ? "rgba(10,8,6,0.9)" : "rgba(200,200,200,0.6)"}
                      />
                    </motion.div>
                  </motion.div>
                </motion.div>

                {/* Close Button */}
                <motion.button
                  onClick={onClose}
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                  style={{
                    background: "rgba(192, 64, 64, 0.2)",
                    border: "2px solid rgba(192, 64, 64, 0.4)",
                    borderRadius: "50%",
                    width: 48,
                    height: 48,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    color: "#e06060",
                    fontSize: "1.5rem",
                    transition: "all 0.2s",
                  }}
                >
                  ✕
                </motion.button>
              </div>

              {/* Controlli Selezione Dadi - COMPATTA */}
              <div style={{
                marginBottom: "12px",
                padding: "12px",
                background: "rgba(0, 0, 0, 0.4)",
                borderRadius: "8px",
                border: "1px solid rgba(212, 175, 55, 0.2)",
              }}>
                {/* Bottoni Dadi - PIÙ PICCOLI */}
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(7, 1fr)",
                  gap: "6px",
                  marginBottom: "8px",
                }}>
                  {diceTypes.map(type => (
                    <motion.button
                      key={type}
                      onClick={() => addDie(type)}
                      whileHover={{ scale: 1.05, boxShadow: `0 0 15px ${playerColor}60` }}
                      whileTap={{ scale: 0.95 }}
                      style={{
                        padding: "6px",
                        background: "rgba(212, 175, 55, 0.1)",
                        border: "1px solid rgba(212, 175, 55, 0.3)",
                        borderRadius: "6px",
                        color: playerColor,
                        fontSize: "0.7rem",
                        fontWeight: "bold",
                        fontFamily: "var(--font-heading)",
                        cursor: "pointer",
                        transition: "all 0.2s",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: "2px",
                      }}
                    >
                      <div style={{ width: "20px", height: "20px", opacity: 0.7 }}>
                        {DICE_SHAPES[type]}
                      </div>
                      {type.toUpperCase()}
                    </motion.button>
                  ))}
                </div>

                {/* Dadi Selezionati - COMPATTI */}
                {selectedDice.length > 0 && (
                  <div style={{
                    padding: "6px 8px",
                    background: "rgba(212, 175, 55, 0.05)",
                    borderRadius: "6px",
                    marginBottom: "8px",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    flexWrap: "wrap",
                  }}>
                    <div style={{
                      fontSize: "0.65rem",
                      color: "rgba(212, 175, 55, 0.6)",
                    }}>
                      ({selectedDice.length}):
                    </div>
                    {selectedDice.map((die, index) => (
                      <motion.div
                        key={index}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        style={{
                          padding: "2px 6px",
                          background: "rgba(212, 175, 55, 0.2)",
                          border: "1px solid rgba(212, 175, 55, 0.4)",
                          borderRadius: "4px",
                          fontSize: "0.7rem",
                          color: playerColor,
                          fontWeight: "bold",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                        }}
                        onClick={() => removeDie(index)}
                        whileHover={{ scale: 1.1, backgroundColor: "rgba(192, 64, 64, 0.3)" }}
                      >
                        {die.toUpperCase()}
                        <span style={{ fontSize: "0.6rem", opacity: 0.6 }}>✕</span>
                      </motion.div>
                    ))}
                  </div>
                )}

                {/* Modificatore e Bottoni - COMPATTI */}
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}>
                  {/* Modificatore */}
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    marginRight: "8px",
                  }}>
                    <div style={{
                      fontSize: "0.65rem",
                      color: "rgba(212, 175, 55, 0.7)",
                      fontWeight: "bold",
                    }}>
                      MOD:
                    </div>
                    <button
                      onClick={() => setModifier(m => m - 1)}
                      style={{
                        width: "24px",
                        height: "24px",
                        background: "rgba(212, 175, 55, 0.1)",
                        border: "1px solid rgba(212, 175, 55, 0.3)",
                        borderRadius: "4px",
                        color: playerColor,
                        fontSize: "1rem",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      −
                    </button>
                    <div style={{
                      minWidth: "35px",
                      textAlign: "center",
                      fontSize: "0.9rem",
                      color: playerColor,
                      fontWeight: "bold",
                      fontFamily: "var(--font-heading)",
                    }}>
                      {modifier >= 0 ? `+${modifier}` : modifier}
                    </div>
                    <button
                      onClick={() => setModifier(m => m + 1)}
                      style={{
                        width: "24px",
                        height: "24px",
                        background: "rgba(212, 175, 55, 0.1)",
                        border: "1px solid rgba(212, 175, 55, 0.3)",
                        borderRadius: "4px",
                        color: playerColor,
                        fontSize: "1rem",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      +
                    </button>
                  </div>

                  {/* Bottoni Azione */}
                  <motion.button
                    onClick={rollDice}
                    disabled={selectedDice.length === 0 || isRolling}
                    whileHover={selectedDice.length > 0 && !isRolling ? { scale: 1.05, boxShadow: `0 0 20px ${playerColor}80` } : {}}
                    whileTap={selectedDice.length > 0 && !isRolling ? { scale: 0.95 } : {}}
                    style={{
                      flex: 1,
                      padding: "8px 16px",
                      background: selectedDice.length === 0 || isRolling ? "rgba(100, 100, 100, 0.2)" : `linear-gradient(135deg, ${playerColor}40, ${playerColor}20)`,
                      border: `2px solid ${selectedDice.length === 0 || isRolling ? "rgba(100, 100, 100, 0.3)" : playerColor}`,
                      borderRadius: "6px",
                      color: selectedDice.length === 0 || isRolling ? "rgba(200, 200, 200, 0.4)" : playerColor,
                      fontSize: "0.85rem",
                      fontWeight: "bold",
                      fontFamily: "var(--font-heading)",
                      cursor: selectedDice.length === 0 || isRolling ? "not-allowed" : "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "6px",
                      transition: "all 0.2s",
                    }}
                  >
                    <DnDIcon icon="dice" size={16} />
                    {isRolling ? "LANCIANDO..." : "LANCIA"}
                  </motion.button>

                  <motion.button
                    onClick={clearDice}
                    disabled={selectedDice.length === 0}
                    whileHover={selectedDice.length > 0 ? { scale: 1.05 } : {}}
                    whileTap={selectedDice.length > 0 ? { scale: 0.95 } : {}}
                    style={{
                      padding: "8px 12px",
                      background: "rgba(192, 64, 64, 0.2)",
                      border: "2px solid rgba(192, 64, 64, 0.4)",
                      borderRadius: "6px",
                      color: selectedDice.length === 0 ? "rgba(200, 200, 200, 0.4)" : "#e06060",
                      fontSize: "0.75rem",
                      fontWeight: "bold",
                      cursor: selectedDice.length === 0 ? "not-allowed" : "pointer",
                      transition: "all 0.2s",
                    }}
                  >
                    RESET
                  </motion.button>
                </div>
              </div>

              {/* Risultati Lancio */}
              <AnimatePresence>
                {lastResult && (
                  <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    style={{
                      marginBottom: "12px",
                      padding: "16px",
                      background: "linear-gradient(135deg, rgba(212, 175, 55, 0.15), rgba(212, 175, 55, 0.05))",
                      border: "2px solid rgba(212, 175, 55, 0.5)",
                      borderRadius: "12px",
                      boxShadow: `0 0 30px rgba(212, 175, 55, 0.3)`,
                    }}
                  >
                    {/* Titolo */}
                    <div style={{
                      fontSize: "0.75rem",
                      color: "rgba(212, 175, 55, 0.7)",
                      marginBottom: "8px",
                      fontFamily: "var(--font-heading)",
                      letterSpacing: "0.1em",
                    }}>
                      RISULTATO LANCIO
                    </div>

                    {/* Risultati Singoli Dadi */}
                    <div style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: "8px",
                      marginBottom: "12px",
                      alignItems: "center",
                    }}>
                      {lastResult.rolls.map((die, index) => (
                        <motion.div
                          key={index}
                          initial={{ scale: 0, rotate: -180 }}
                          animate={{ scale: 1, rotate: 0 }}
                          transition={{ delay: index * 0.1 }}
                          style={{
                            padding: "8px 12px",
                            background: die.value === 20 && lastResult.notation.includes('d20')
                              ? "rgba(76, 175, 80, 0.3)"  // Verde per nat 20
                              : die.value === 1 && lastResult.notation.includes('d20')
                              ? "rgba(244, 67, 54, 0.3)"  // Rosso per nat 1
                              : "rgba(212, 175, 55, 0.2)",
                            border: `2px solid ${
                              die.value === 20 && lastResult.notation.includes('d20')
                                ? "#4caf50"
                                : die.value === 1 && lastResult.notation.includes('d20')
                                ? "#f44336"
                                : playerColor
                            }`,
                            borderRadius: "8px",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            gap: "4px",
                          }}
                        >
                          <div style={{
                            fontSize: "0.7rem",
                            color: "rgba(255, 255, 255, 0.6)",
                            fontWeight: "normal",
                          }}>
                            {die.type}
                          </div>
                          <div style={{
                            fontSize: "1.4rem",
                            fontWeight: "bold",
                            color: die.value === 20 && lastResult.notation.includes('d20')
                              ? "#4caf50"
                              : die.value === 1 && lastResult.notation.includes('d20')
                              ? "#f44336"
                              : playerColor,
                            fontFamily: "var(--font-heading)",
                          }}>
                            {die.value}
                          </div>
                        </motion.div>
                      ))}
                    </div>

                    {/* Totale */}
                    <div style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      paddingTop: "12px",
                      borderTop: "1px solid rgba(212, 175, 55, 0.3)",
                    }}>
                      <div style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                      }}>
                        <div style={{
                          fontSize: "0.85rem",
                          color: "rgba(212, 175, 55, 0.7)",
                        }}>
                          Totale dadi: <span style={{ fontWeight: "bold", color: playerColor }}>{lastResult.total}</span>
                        </div>
                        {lastResult.modifier !== 0 && (
                          <>
                            <div style={{
                              fontSize: "0.85rem",
                              color: "rgba(212, 175, 55, 0.7)",
                            }}>
                              Modificatore: <span style={{ fontWeight: "bold", color: playerColor }}>
                                {lastResult.modifier >= 0 ? `+${lastResult.modifier}` : lastResult.modifier}
                              </span>
                            </div>
                          </>
                        )}
                      </div>

                      {/* Totale Finale Grande */}
                      <div style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                      }}>
                        <div style={{
                          fontSize: "0.8rem",
                          color: "rgba(212, 175, 55, 0.7)",
                          fontWeight: "bold",
                        }}>
                          TOTALE:
                        </div>
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
                          style={{
                            fontSize: "2rem",
                            fontWeight: "bold",
                            color: playerColor,
                            fontFamily: "var(--font-heading)",
                            textShadow: `0 0 20px ${playerColor}80`,
                            padding: "4px 16px",
                            background: "rgba(0, 0, 0, 0.4)",
                            borderRadius: "8px",
                            border: `2px solid ${playerColor}`,
                          }}
                        >
                          {lastResult.finalTotal}
                        </motion.div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Dice Box Container - PIÙ GRANDE */}
              <div style={{
                flex: 1,
                position: "relative",
                minHeight: "500px",
                background: "rgba(0, 0, 0, 0.3)",
                borderRadius: "12px",
                border: "2px solid rgba(212, 175, 55, 0.2)",
                overflow: "hidden",
              }}>
                <FinalDiceBox
                  ref={diceBoxRef}
                  playerName={playerName}
                  playerColor={playerColor}
                  onRollComplete={(result) => {
                    if (onRollComplete) onRollComplete(result);
                  }}
                  showInTray={false}
                  secretRoll={true}
                />
              </div>

              {/* Footer Info */}
              <div style={{
                marginTop: "20px",
                padding: "16px",
                background: "rgba(212, 175, 55, 0.05)",
                border: "1px solid rgba(212, 175, 55, 0.15)",
                borderRadius: "8px",
                textAlign: "center",
                position: "relative",
                zIndex: 1,
              }}>
                <div style={{
                  fontSize: "0.85rem",
                  color: "rgba(212, 175, 55, 0.7)",
                  lineHeight: 1.6,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                }}>
                  <DnDIcon icon="search" size={14} />
                  <span>
                    I risultati di questo lancio sono <strong>segreti</strong> e non verranno mostrati sulla TV
                  </span>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
