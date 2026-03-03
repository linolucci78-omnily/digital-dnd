// ═══════════════════════════════════════════════
//  CharacterCreation — Creazione personaggio 5e
//  Passi: Nome → Razza → Classe → Background → Statistiche → Conferma
// ═══════════════════════════════════════════════

import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import MusicPlayer from "../shared/components/MusicPlayer.jsx";
import { RACES, getRaceById, getTotalAbilityBonuses } from "../shared/constants/races.js";
import { CLASSES, getClassById, getStartingHP, PROFICIENCY_BONUS } from "../shared/constants/classes.js";
import { BACKGROUNDS, getBackgroundById } from "../shared/constants/backgrounds.js";
import { TokenPreview } from "../shared/components/CharacterToken.jsx";
import { DICE_SHAPES } from "../shared/components/DiceRoller.jsx";

const STEPS = [
  { id: "name", label: "Nome" },
  { id: "race", label: "Razza" },
  { id: "class", label: "Classe" },
  { id: "background", label: "Background" },
  { id: "stats", label: "Statistiche" },
  { id: "portrait", label: "Ritratto" },
  { id: "confirm", label: "Conferma" },
];

const ABILITIES = [
  { key: "strength", label: "FOR", full: "Forza" },
  { key: "dexterity", label: "DES", full: "Destrezza" },
  { key: "constitution", label: "COS", full: "Costituzione" },
  { key: "intelligence", label: "INT", full: "Intelligenza" },
  { key: "wisdom", label: "SAG", full: "Saggezza" },
  { key: "charisma", label: "CAR", full: "Carisma" },
];

// Colori disponibili per il token
const TOKEN_COLORS = [
  "#d4af37", "#c04040", "#4070c0", "#5a8a30", "#a040c0",
  "#c87040", "#40a0a0", "#c8a020", "#60a060", "#8080a0",
  "#e87060", "#60c0e0",
];

function mod(score) {
  const m = Math.floor((score - 10) / 2);
  return m >= 0 ? `+${m}` : `${m}`;
}

function rollStat() {
  // 4d6 drop lowest — il metodo ufficiale D&D 5e
  const rolls = [
    Math.floor(Math.random() * 6) + 1,
    Math.floor(Math.random() * 6) + 1,
    Math.floor(Math.random() * 6) + 1,
    Math.floor(Math.random() * 6) + 1,
  ];
  rolls.sort((a, b) => a - b);
  return rolls[1] + rolls[2] + rolls[3]; // scarta il più basso
}

function rollAllStats() {
  return {
    strength: rollStat(),
    dexterity: rollStat(),
    constitution: rollStat(),
    intelligence: rollStat(),
    wisdom: rollStat(),
    charisma: rollStat(),
  };
}

// ── STEP 0: Nome e dati base ──
function StepName({ data, onChange, onNext }) {
  const [name, setName] = useState(data.name || "");
  const [playerName, setPlayerName] = useState(data.player_name || "");
  const [tokenColor, setTokenColor] = useState(data.token_color || "#d4af37");

  const canContinue = name.trim().length >= 2 && playerName.trim().length >= 2;

  const handleNext = () => {
    onChange({ name: name.trim(), player_name: playerName.trim(), token_color: tokenColor });
    onNext();
  };

  return (
    <motion.div
      className="animate-slide"
      style={{ display: "flex", flexDirection: "column", gap: 24, maxWidth: 480, margin: "0 auto" }}
    >
      {/* D20 placeholder */}
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 8 }}>
        <img
          src="/placeholder_avatar.png"
          alt="D20"
          style={{ width: 120, height: 120, filter: "drop-shadow(0 0 20px rgba(212,175,55,0.4))" }}
        />
      </div>

      <div>
        <label>Il tuo nome (giocatore)</label>
        <input
          type="text"
          placeholder="Come ti chiami?"
          value={playerName}
          onChange={e => setPlayerName(e.target.value)}
          maxLength={30}
          autoFocus
        />
      </div>

      <div>
        <label>Nome del personaggio</label>
        <input
          type="text"
          placeholder="Aragorn, Gandalf, Drizzt..."
          value={name}
          onChange={e => setName(e.target.value)}
          maxLength={40}
        />
      </div>

      <button
        className="btn btn-gold"
        onClick={handleNext}
        disabled={!canContinue}
        style={{ opacity: canContinue ? 1 : 0.5, fontSize: "1rem" }}
      >
        Avanti →
      </button>
    </motion.div>
  );
}

// ── STEP 1: Scelta Razza ──
function StepRace({ data, onChange, onNext, onBack }) {
  const [selectedRace, setSelectedRace] = useState(data.race || null);
  const [selectedSubrace, setSelectedSubrace] = useState(data.subrace || null);
  const [expanded, setExpanded] = useState(null);

  const race = getRaceById(selectedRace);

  const handleNext = () => {
    onChange({ race: selectedRace, subrace: selectedSubrace });
    onNext();
  };

  return (
    <motion.div className="animate-slide" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {RACES.map(r => (
          <motion.div
            key={r.id}
            className={`select-card ${selectedRace === r.id ? "selected" : ""}`}
            onClick={() => {
              setSelectedRace(r.id);
              setSelectedSubrace(null);
              setExpanded(expanded === r.id ? null : r.id);
            }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {/* Header razza */}
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{
                width: 40, height: 40, borderRadius: "50%",
                background: `${r.color}20`,
                border: `2px solid ${r.color}60`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "1.2rem", color: r.color,
              }}>
                {/* Prima lettera in stile */}
                <span style={{ fontFamily: "var(--font-heading)", fontWeight: "700" }}>
                  {r.name[0]}
                </span>
              </div>
              <div>
                <div style={{ fontFamily: "var(--font-heading)", fontSize: "0.95rem", color: selectedRace === r.id ? r.color : "var(--parchment)" }}>
                  {r.name}
                </div>
                {/* Bonus abilità */}
                <div style={{ fontSize: "0.65rem", color: "var(--gold-dark)", letterSpacing: "0.05em" }}>
                  {Object.entries(r.abilityBonuses).map(([k, v]) =>
                    `+${v} ${k.slice(0,3).toUpperCase()}`
                  ).join(", ")}
                </div>
              </div>
            </div>

            {/* Descrizione espansa */}
            <AnimatePresence>
              {expanded === r.id && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  style={{ overflow: "hidden" }}
                >
                  <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid rgba(212,175,55,0.2)" }}>
                    <div style={{ fontSize: "0.8rem", color: "var(--parchment-dark)", fontStyle: "italic", marginBottom: 8 }}>
                      {r.description}
                    </div>

                    {/* Tratti razza */}
                    {r.traits.slice(0, 3).map(t => (
                      <div key={t.name} style={{ fontSize: "0.75rem", color: "rgba(212,175,55,0.7)", marginBottom: 4 }}>
                        <span style={{ color: "var(--gold)", fontFamily: "var(--font-heading)" }}>{t.name}:</span> {t.desc}
                      </div>
                    ))}

                    {/* Sottorazza */}
                    {r.subraces.length > 0 && (
                      <div style={{ marginTop: 10 }}>
                        <div style={{ fontFamily: "var(--font-heading)", fontSize: "0.65rem", color: "var(--gold)", letterSpacing: "0.15em", marginBottom: 6 }}>
                          SOTTORAZZA
                        </div>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                          {r.subraces.map(sr => (
                            <button
                              key={sr.id}
                              onClick={e => { e.stopPropagation(); setSelectedSubrace(sr.id); }}
                              style={{
                                padding: "4px 10px",
                                background: selectedSubrace === sr.id ? `${r.color}30` : "rgba(0,0,0,0.4)",
                                border: `1px solid ${selectedSubrace === sr.id ? r.color : "rgba(212,175,55,0.3)"}`,
                                borderRadius: 6,
                                color: selectedSubrace === sr.id ? r.color : "var(--parchment-dark)",
                                fontSize: "0.75rem",
                                cursor: "pointer",
                                fontFamily: "var(--font-heading)",
                              }}
                            >
                              {sr.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 10 }}>
        <button className="btn btn-ghost" onClick={onBack} style={{ flex: 1 }}>← Indietro</button>
        <button
          className="btn btn-gold"
          onClick={handleNext}
          disabled={!selectedRace || (race?.subraces.length > 0 && !selectedSubrace)}
          style={{ flex: 2, opacity: (!selectedRace || (race?.subraces.length > 0 && !selectedSubrace)) ? 0.5 : 1 }}
        >
          {race?.subraces.length > 0 && !selectedSubrace ? "Scegli una sottorazza" : "Avanti →"}
        </button>
      </div>
    </motion.div>
  );
}

// ── STEP 2: Scelta Classe ──
function StepClass({ data, onChange, onNext, onBack }) {
  const [selectedClass, setSelectedClass] = useState(data.class || null);
  const [expanded, setExpanded] = useState(null);

  const cls = getClassById(selectedClass);

  const handleNext = () => {
    onChange({ class: selectedClass });
    onNext();
  };

  return (
    <motion.div className="animate-slide" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Preview token aggiornato */}
      {selectedClass && (
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 4 }}>
          <TokenPreview classId={selectedClass} tokenColor={data.token_color} name={data.name} />
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {CLASSES.map(c => {
          const classColor = getComputedStyle(document.documentElement).getPropertyValue(`--class-${c.id}`).trim() || c.color;
          return (
            <motion.div
              key={c.id}
              className={`select-card ${selectedClass === c.id ? "selected" : ""}`}
              onClick={() => {
                setSelectedClass(c.id);
                setExpanded(expanded === c.id ? null : c.id);
              }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              style={{ borderColor: selectedClass === c.id ? c.color : undefined }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: "50%",
                  background: `${c.color}20`,
                  border: `2px solid ${c.color}70`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "1rem",
                  boxShadow: selectedClass === c.id ? `0 0 12px ${c.color}50` : "none",
                }}>
                  <span style={{ fontFamily: "var(--font-heading)", fontWeight: "700", color: c.color }}>
                    {c.name[0]}
                  </span>
                </div>
                <div>
                  <div style={{ fontFamily: "var(--font-heading)", fontSize: "0.9rem", color: selectedClass === c.id ? c.color : "var(--parchment)" }}>
                    {c.name}
                  </div>
                  <div style={{ fontSize: "0.65rem", color: "var(--gold-dark)" }}>
                    d{c.hitDie} HP · {c.spellcasting ? "Incantesimi" : "Non incantatore"}
                  </div>
                </div>
              </div>

              <AnimatePresence>
                {expanded === c.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    style={{ overflow: "hidden" }}
                  >
                    <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid rgba(212,175,55,0.2)" }}>
                      <div style={{ fontSize: "0.8rem", color: "var(--parchment-dark)", fontStyle: "italic", marginBottom: 8 }}>
                        {c.description}
                      </div>
                      {/* Abilità di salvataggio */}
                      <div style={{ fontSize: "0.7rem", color: "rgba(212,175,55,0.7)" }}>
                        <span style={{ color: "var(--gold)", fontFamily: "var(--font-heading)" }}>Tiri sal.:</span>{" "}
                        {c.savingThrows.join(", ")}
                      </div>
                      {/* Feature livello 1 */}
                      {c.features["1"]?.map(f => (
                        <div key={f} style={{ fontSize: "0.7rem", color: "rgba(212,175,55,0.6)", marginTop: 3 }}>
                          ✦ {f}
                        </div>
                      ))}
                      {/* Sottoclassi */}
                      <div style={{ marginTop: 8, fontSize: "0.7rem", color: "var(--parchment-dark)" }}>
                        <span style={{ color: "var(--gold)", fontFamily: "var(--font-heading)" }}>Archetipi:</span>{" "}
                        {c.subclasses.map(s => s.name).join(", ")}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>

      <div style={{ display: "flex", gap: 10 }}>
        <button className="btn btn-ghost" onClick={onBack} style={{ flex: 1 }}>← Indietro</button>
        <button
          className="btn btn-gold"
          onClick={handleNext}
          disabled={!selectedClass}
          style={{ flex: 2, opacity: !selectedClass ? 0.5 : 1 }}
        >
          Avanti →
        </button>
      </div>
    </motion.div>
  );
}

// ── STEP 3: Background ──
function StepBackground({ data, onChange, onNext, onBack }) {
  const [selectedBg, setSelectedBg] = useState(data.background || null);

  const handleNext = () => {
    onChange({ background: selectedBg });
    onNext();
  };

  return (
    <motion.div className="animate-slide" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {BACKGROUNDS.map(bg => (
          <motion.div
            key={bg.id}
            className={`select-card ${selectedBg === bg.id ? "selected" : ""}`}
            onClick={() => setSelectedBg(bg.id)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: "1.4rem" }}>{bg.icon}</span>
              <div>
                <div style={{ fontFamily: "var(--font-heading)", fontSize: "0.9rem", color: selectedBg === bg.id ? "var(--gold)" : "var(--parchment)" }}>
                  {bg.name}
                </div>
                <div style={{ fontSize: "0.65rem", color: "var(--gold-dark)" }}>
                  {bg.skillProficiencies.join(", ")}
                </div>
              </div>
            </div>

            {selectedBg === bg.id && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                style={{ overflow: "hidden" }}
              >
                <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid rgba(212,175,55,0.2)" }}>
                  <div style={{ fontSize: "0.75rem", color: "var(--parchment-dark)", fontStyle: "italic", marginBottom: 6 }}>
                    {bg.description}
                  </div>
                  <div style={{ fontSize: "0.7rem", color: "rgba(212,175,55,0.8)" }}>
                    <span style={{ color: "var(--gold)", fontFamily: "var(--font-heading)" }}>{bg.feature.name}:</span>{" "}
                    {bg.feature.desc}
                  </div>
                </div>
              </motion.div>
            )}
          </motion.div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 10 }}>
        <button className="btn btn-ghost" onClick={onBack} style={{ flex: 1 }}>← Indietro</button>
        <button
          className="btn btn-gold"
          onClick={handleNext}
          disabled={!selectedBg}
          style={{ flex: 2, opacity: !selectedBg ? 0.5 : 1 }}
        >
          Avanti →
        </button>
      </div>
    </motion.div>
  );
}

// Animazione dadi che rotolano
function RollingDiceAnimation({ onComplete }) {
  const [hasCompleted, setHasCompleted] = useState(false);

  useEffect(() => {
    if (!hasCompleted) {
      const timer = setTimeout(() => {
        setHasCompleted(true);
        onComplete();
      }, 1800);
      return () => clearTimeout(timer);
    }
  }, [hasCompleted, onComplete]);

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
        zIndex: 9999,
        gap: 20,
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        style={{
          fontFamily: "var(--font-heading)",
          fontSize: "1.2rem",
          color: "var(--gold)",
          letterSpacing: "0.2em",
          textTransform: "uppercase",
        }}
        initial={{ y: -30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
      >
        Lancio delle Statistiche
      </motion.div>

      {/* 4 dadi d6 che rotolano */}
      <div style={{ display: "flex", gap: 20, flexWrap: "wrap", justifyContent: "center" }}>
        {[0, 1, 2, 3].map((i) => (
          <motion.div
            key={i}
            style={{
              width: 80,
              height: 80,
              color: "#d4af37",
              filter: "drop-shadow(0 0 20px rgba(212,175,55,0.6))",
            }}
            initial={{
              rotate: -180 * (i + 1),
              scale: 0,
              x: (Math.random() - 0.5) * 300,
              y: -200,
            }}
            animate={{
              rotate: [
                -180 * (i + 1),
                360 * (i + 2),
                720 * (i + 1),
                360 * (i + 3),
                0,
              ],
              scale: [0, 1.2, 0.9, 1.1, 1],
              x: 0,
              y: [
                -200,
                50,
                -30,
                20,
                0,
              ],
            }}
            transition={{
              duration: 1.5,
              delay: i * 0.15,
              ease: [0.34, 1.56, 0.64, 1],
            }}
          >
            {DICE_SHAPES.d6}
          </motion.div>
        ))}
      </div>

      <motion.div
        style={{
          fontFamily: "var(--font-heading)",
          fontSize: "0.9rem",
          color: "rgba(212,175,55,0.6)",
          letterSpacing: "0.15em",
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 1, 1, 0] }}
        transition={{ duration: 1.8, times: [0, 0.3, 0.7, 1] }}
      >
        4d6 drop lowest × 6
      </motion.div>
    </motion.div>
  );
}

// ── STEP 4: Statistiche (4d6 drop lowest) ──
function StepStats({ data, onChange, onNext, onBack }) {
  const [baseStats, setBaseStats] = useState(data._baseStats || {});
  const [assignedStats, setAssignedStats] = useState(data._assignedStats || null);
  const [rolling, setRolling] = useState(null); // quale stat sta rollando (es: "strength")
  const [dragging, setDragging] = useState(null);
  const [currentRoll, setCurrentRoll] = useState(null); // { dice: [5,3,6,2], total: 14, dropped: 2 }
  const [showDiceAnim, setShowDiceAnim] = useState(false);

  const raceBonus = getTotalAbilityBonuses(data.race, data.subrace);

  // Controlla se tutte le stats sono state lanciate
  const allRolled = ABILITIES.every(({ key }) => baseStats[key] !== undefined);

  // Lancia una singola statistica
  const rollSingleStat = useCallback((statKey) => {
    if (rolling) return;

    setRolling(statKey);
    setShowDiceAnim(true);
    if (window.navigator?.vibrate) window.navigator.vibrate([20, 10, 30, 10, 50]);
  }, [rolling]);

  const completeDiceAnimation = useCallback(() => {
    setShowDiceAnim(false);

    if (!rolling) return;

    // Lancia 4d6
    const dice = [
      Math.floor(Math.random() * 6) + 1,
      Math.floor(Math.random() * 6) + 1,
      Math.floor(Math.random() * 6) + 1,
      Math.floor(Math.random() * 6) + 1,
    ];

    // Trova il minimo da scartare
    const sorted = [...dice].sort((a, b) => a - b);
    const dropped = sorted[0];
    const total = sorted[1] + sorted[2] + sorted[3];

    // Mostra i dadi con delay
    setTimeout(() => {
      setCurrentRoll({ dice, total, dropped, stat: rolling });

      // Dopo 2 secondi, salva il risultato
      setTimeout(() => {
        setBaseStats(prev => ({ ...prev, [rolling]: total }));

        // Se è il primo lancio o tutte le stats sono state lanciate, aggiorna assignedStats
        const newStats = { ...baseStats, [rolling]: total };
        if (Object.keys(newStats).length === 6) {
          setAssignedStats(newStats);
        }

        setCurrentRoll(null);
        setRolling(null);
      }, 2500);
    }, 200);
  }, [rolling, baseStats]);

  const swapStats = (keyA, keyB) => {
    if (!assignedStats) return;
    setAssignedStats(prev => ({
      ...prev,
      [keyA]: prev[keyB],
      [keyB]: prev[keyA],
    }));
  };

  const handleNext = () => {
    if (!allRolled) return;
    // Calcola le statistiche finali con i bonus razza
    const finalStats = {};
    ABILITIES.forEach(({ key }) => {
      finalStats[key] = (baseStats[key] || 10) + (raceBonus[key] || 0);
    });
    onChange({
      ...finalStats,
      _baseStats: baseStats,
    });
    onNext();
  };

  const total = Object.values(baseStats).reduce((a, b) => a + b, 0);

  return (
    <>
      <motion.div className="animate-slide" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Spiegazione */}
        <div className="glass-card" style={{ padding: 14, textAlign: "center" }}>
          <div style={{ fontFamily: "var(--font-heading)", color: "var(--gold)", fontSize: "0.85rem", marginBottom: 6 }}>
            METODO 4d6 SCARTA IL MINORE
          </div>
          <div style={{ fontSize: "0.8rem", color: "var(--parchment-dark)" }}>
            Lancia i dadi per ogni statistica. Vedrai i 4 dadi, il minore verrà scartato.
            Proprio come al tavolo da gioco!
          </div>
        </div>

        {/* Risultato dadi corrente */}
        <AnimatePresence>
          {currentRoll && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="glass-card"
              style={{
                padding: 20,
                textAlign: "center",
                background: "linear-gradient(135deg, rgba(212,175,55,0.15), rgba(212,175,55,0.05))",
                border: "2px solid var(--gold)",
              }}
            >
              <div style={{ fontFamily: "var(--font-heading)", color: "var(--gold)", fontSize: "1rem", marginBottom: 12, letterSpacing: "0.15em" }}>
                {ABILITIES.find(a => a.key === currentRoll.stat)?.full.toUpperCase()}
              </div>

              {/* I 4 dadi */}
              <div style={{ display: "flex", gap: 10, justifyContent: "center", marginBottom: 15, flexWrap: "wrap" }}>
                {currentRoll.dice.map((value, i) => (
                  <motion.div
                    key={i}
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ delay: i * 0.1, type: "spring" }}
                    style={{
                      width: 56,
                      height: 56,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontFamily: "var(--font-heading)",
                      fontSize: "1.8rem",
                      fontWeight: "900",
                      borderRadius: 8,
                      background: value === currentRoll.dropped ? "rgba(192,64,64,0.3)" : "rgba(212,175,55,0.2)",
                      border: `2px solid ${value === currentRoll.dropped ? "#c04040" : "var(--gold)"}`,
                      color: value === currentRoll.dropped ? "#ff6b6b" : "var(--gold)",
                      position: "relative",
                      textDecoration: value === currentRoll.dropped ? "line-through" : "none",
                    }}
                  >
                    {value}
                  </motion.div>
                ))}
              </div>

              {/* Totale */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                style={{ fontSize: "0.75rem", color: "var(--parchment-dark)", marginBottom: 6 }}
              >
                Scartato: <span style={{ color: "#ff6b6b", fontFamily: "var(--font-heading)" }}>{currentRoll.dropped}</span>
              </motion.div>
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.8, type: "spring" }}
                style={{
                  fontFamily: "var(--font-heading)",
                  fontSize: "2.5rem",
                  fontWeight: "900",
                  color: "var(--gold)",
                  textShadow: "0 0 20px rgba(212,175,55,0.6)",
                }}
              >
                = {currentRoll.total}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

      {/* Griglia statistiche con bottoni */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
          {ABILITIES.map(({ key, label, full }) => {
            const hasValue = baseStats[key] !== undefined;
            const value = baseStats[key];
            const bonus = raceBonus[key] || 0;
            const final = hasValue ? value + bonus : null;
            const modifier = final ? Math.floor((final - 10) / 2) : null;
            const isRolling = rolling === key;

            return (
              <motion.div
                key={key}
                className="glass-card"
                style={{
                  padding: 12,
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                  opacity: isRolling ? 0.6 : 1,
                }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: isRolling ? 0.6 : 1, y: 0 }}
                transition={{ delay: ABILITIES.findIndex(a => a.key === key) * 0.05 }}
              >
                <div style={{ fontFamily: "var(--font-heading)", fontSize: "0.75rem", color: "var(--gold)", letterSpacing: "0.1em", textAlign: "center" }}>
                  {full.toUpperCase()}
                </div>

                {hasValue ? (
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontFamily: "var(--font-heading)", fontSize: "2rem", color: "var(--parchment)", fontWeight: "900" }}>
                      {final}
                    </div>
                    <div style={{ fontSize: "0.75rem", color: modifier >= 0 ? "var(--gold)" : "var(--crimson-light)" }}>
                      {modifier >= 0 ? "+" : ""}{modifier}
                    </div>
                    {bonus > 0 && (
                      <div style={{ fontSize: "0.6rem", color: "#40c040", marginTop: 2 }}>
                        ({value} +{bonus} razza)
                      </div>
                    )}
                    <button
                      onClick={() => rollSingleStat(key)}
                      disabled={isRolling || rolling !== null}
                      style={{
                        marginTop: 8,
                        padding: "6px 12px",
                        fontSize: "0.7rem",
                        fontFamily: "var(--font-heading)",
                        background: "rgba(192,64,64,0.2)",
                        border: "1px solid rgba(192,64,64,0.5)",
                        borderRadius: 6,
                        color: "#ff6b6b",
                        cursor: (isRolling || rolling !== null) ? "not-allowed" : "pointer",
                        opacity: (isRolling || rolling !== null) ? 0.5 : 1,
                      }}
                    >
                      🔄 RILANCIA
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => rollSingleStat(key)}
                    disabled={isRolling || rolling !== null}
                    className="btn btn-crimson"
                    style={{
                      padding: "14px",
                      fontSize: "0.9rem",
                      opacity: (isRolling || rolling !== null) ? 0.6 : 1,
                      cursor: (isRolling || rolling !== null) ? "not-allowed" : "pointer",
                    }}
                  >
                    {isRolling ? "⚀ Lancio..." : "🎲 LANCIA"}
                  </button>
                )}
              </motion.div>
            );
          })}
        </div>

        {/* Totale e info */}
        {allRolled && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card"
            style={{ padding: 14, textAlign: "center" }}
          >
            <div style={{ fontSize: "0.75rem", color: "var(--parchment-dark)", marginBottom: 4 }}>
              Totale statistiche base
            </div>
            <div style={{
              fontFamily: "var(--font-heading)",
              fontSize: "1.8rem",
              color: total >= 72 ? "#40c040" : total >= 64 ? "var(--gold)" : "var(--parchment)"
            }}>
              {total}
            </div>
            <div style={{ fontSize: "0.65rem", color: "rgba(212,175,55,0.5)", marginTop: 2 }}>
              (media: 65-72)
            </div>
          </motion.div>
        )}

        {/* Bottoni navigazione */}
        <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
          <button className="btn btn-ghost" onClick={onBack} style={{ flex: 1 }}>
            ← Indietro
          </button>
          <button
            className="btn btn-gold"
            onClick={handleNext}
            disabled={!allRolled}
            style={{ flex: 2, opacity: !allRolled ? 0.5 : 1 }}
          >
            Avanti →
          </button>
        </div>
      </motion.div>

      {/* Animazione dadi */}
      <AnimatePresence>
        {showDiceAnim && <RollingDiceAnimation onComplete={completeDiceAnimation} />}
      </AnimatePresence>
    </>
  );
}

// ── STEP 5: Ritratto ──
function StepPortrait({ data, onChange, onNext, onBack }) {
  // Mappa nomi razze/classi ai nomi delle cartelle
  const getRaceFolder = (race) => {
    const map = {
      "human": "umano",
      "elf": "elfo",
      "dwarf": "nano",
      "halfling": "halfling",
      "half-elf": "mezzoelfo",
      "half-orc": "mezzorco",
      "tiefling": "tiefling",
      "dragonborn": "dragonborn",
      "gnome": "gnomo",
    };
    return map[race?.toLowerCase()] || race?.toLowerCase();
  };

  const getClassFolder = (cls) => {
    const map = {
      "fighter": "guerriero",
      "wizard": "mago",
      "rogue": "ladro",
      "cleric": "chierico",
      "ranger": "ranger",
      "paladin": "paladino",
      "barbarian": "barbaro",
      "bard": "bardo",
      "monk": "monaco",
      "sorcerer": "stregone",
      "warlock": "warlock",
      "druid": "druido",
      "artificer": "inventore",
    };
    return map[cls?.toLowerCase()] || cls?.toLowerCase();
  };

  const getFolderName = () => {
    if (!data.race || !data.class) return null;
    const raceName = getRaceFolder(data.race);
    const className = getClassFolder(data.class);
    return `${raceName}_${className}_m`; // per ora solo maschi
  };

  const folderName = getFolderName();
  const portraits = folderName ? [
    `/portraits/${folderName}/1.png`,
    `/portraits/${folderName}/2.png`,
    `/portraits/${folderName}/3.png`,
    `/portraits/${folderName}/4.png`,
  ] : [];

  return (
    <motion.div className="animate-slide" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ textAlign: "center", marginBottom: 8 }}>
        <div style={{ fontFamily: "var(--font-heading)", fontSize: "1rem", color: "var(--gold)" }}>
          Personalizza il tuo Personaggio
        </div>
        <div style={{ fontSize: "0.75rem", color: "var(--parchment-dark)", marginTop: 4 }}>
          Scegli ritratto e colore del token
        </div>
      </div>

      {/* Galleria ritratti */}
      <div>
        <label style={{ marginBottom: 8, display: "block" }}>Ritratto</label>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
          {portraits.map((url, i) => {
            const selectedColor = data.token_color || "#d4af37";
            const isSelected = data.avatar_url === url;
            return (
              <motion.div
                key={i}
                onClick={() => onChange({ avatar_url: url })}
                style={{
                  cursor: "pointer",
                  borderRadius: 12,
                  overflow: "hidden",
                  border: isSelected ? `3px solid ${selectedColor}` : "2px solid rgba(212,175,55,0.2)",
                  boxShadow: isSelected ? `0 0 20px ${selectedColor}80, 0 0 40px ${selectedColor}40` : "none",
                  transition: "all 0.3s",
                }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <img
                  src={url}
                  alt={`Ritratto ${i + 1}`}
                  style={{ width: "100%", height: "auto", display: "block" }}
                  onError={(e) => { e.target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Crect fill='%23333' width='200' height='200'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%23999' font-size='14'%3ENessuna immagine%3C/text%3E%3C/svg%3E"; }}
                />
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Scelta colore token */}
      <div>
        <label style={{ marginBottom: 8, display: "block" }}>Colore del Token</label>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {TOKEN_COLORS.map(color => {
            const isSelected = (data.token_color || "#d4af37") === color;
            return (
              <motion.button
                key={color}
                onClick={() => onChange({ token_color: color })}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: "50%",
                  background: color,
                  border: isSelected ? "4px solid white" : "3px solid rgba(212,175,55,0.3)",
                  cursor: "pointer",
                  boxShadow: isSelected ? `0 0 20px ${color}, 0 0 40px ${color}80` : `0 0 8px ${color}40`,
                  transition: "all 0.2s",
                  position: "relative",
                }}
                whileHover={{ scale: 1.15 }}
                whileTap={{ scale: 0.9 }}
              >
                {isSelected && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    style={{
                      position: "absolute",
                      top: "50%",
                      left: "50%",
                      transform: "translate(-50%, -50%)",
                      color: "white",
                      fontSize: "1.2rem",
                      textShadow: "0 0 8px rgba(0,0,0,0.8)",
                    }}
                  >
                    ✓
                  </motion.div>
                )}
              </motion.button>
            );
          })}
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
        <button className="btn btn-ghost" onClick={onBack} style={{ flex: 1 }}>← Indietro</button>
        <button
          className="btn btn-gold"
          onClick={onNext}
          disabled={!data.avatar_url}
          style={{ flex: 2, opacity: !data.avatar_url ? 0.5 : 1 }}
        >
          Avanti →
        </button>
      </div>
    </motion.div>
  );
}

// ── STEP 6: Riepilogo e Conferma ──
function StepConfirm({ data, onConfirm, onBack, loading }) {
  const race = getRaceById(data.race);
  const cls = getClassById(data.class);
  const bg = getBackgroundById(data.background);
  const raceBonus = getTotalAbilityBonuses(data.race, data.subrace);

  const hp = getStartingHP(data.class, (data.constitution || 10));
  const ac = 10 + Math.floor(((data.dexterity || 10) - 10) / 2);
  const prof = PROFICIENCY_BONUS[0]; // livello 1

  return (
    <motion.div className="animate-slide" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Token grande centrato */}
      <div style={{ display: "flex", justifyContent: "center" }}>
        <TokenPreview classId={data.class} tokenColor={data.token_color} name={data.name} />
      </div>

      {/* Info base */}
      <div className="glass-card" style={{ padding: 16 }}>
        <div style={{ fontFamily: "var(--font-heading)", fontSize: "1.2rem", color: cls?.color || "var(--gold)", textAlign: "center", marginBottom: 4 }}>
          {data.name}
        </div>
        <div style={{ textAlign: "center", color: "var(--parchment-dark)", fontSize: "0.85rem", marginBottom: 12 }}>
          {race?.name}{data.subrace ? ` (${race?.subraces.find(s => s.id === data.subrace)?.name})` : ""} · {cls?.name} · {bg?.name}
        </div>

        {/* Stats combat */}
        <div style={{ display: "flex", justifyContent: "space-around", marginBottom: 12 }}>
          {[
            { label: "HP", value: hp },
            { label: "CA", value: ac },
            { label: "Comp", value: `+${prof}` },
            { label: "Vel", value: `${race?.speed || 30}ft` },
          ].map(({ label, value }) => (
            <div key={label} style={{ textAlign: "center" }}>
              <div style={{ fontFamily: "var(--font-heading)", fontSize: "1.4rem", color: "var(--parchment)" }}>{value}</div>
              <div style={{ fontSize: "0.6rem", color: "var(--gold-dark)", letterSpacing: "0.1em" }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Statistiche */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 6 }}>
          {ABILITIES.map(({ key, label }) => {
            const score = data[key] || 10;
            const m = Math.floor((score - 10) / 2);
            return (
              <div key={key} style={{ textAlign: "center" }}>
                <div style={{ fontSize: "0.6rem", color: "var(--gold-dark)", fontFamily: "var(--font-heading)" }}>{label}</div>
                <div style={{ fontFamily: "var(--font-heading)", fontSize: "1.1rem", color: "var(--parchment)" }}>{score}</div>
                <div style={{ fontSize: "0.7rem", color: m >= 0 ? "var(--gold)" : "var(--crimson-light)" }}>
                  {m >= 0 ? "+" : ""}{m}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Tratti background */}
      <div className="glass-card" style={{ padding: 12 }}>
        <div style={{ fontFamily: "var(--font-heading)", fontSize: "0.7rem", color: "var(--gold)", letterSpacing: "0.15em", marginBottom: 8 }}>
          COMPETENZE DA BACKGROUND
        </div>
        <div style={{ fontSize: "0.8rem", color: "var(--parchment-dark)" }}>
          {bg?.skillProficiencies.join(", ")}
        </div>
        <div style={{ marginTop: 8, fontStyle: "italic", color: "rgba(212,175,55,0.6)", fontSize: "0.75rem" }}>
          {bg?.feature.name}: {bg?.feature.desc}
        </div>
      </div>

      <div style={{ display: "flex", gap: 10 }}>
        <button className="btn btn-ghost" onClick={onBack} disabled={loading} style={{ flex: 1 }}>← Indietro</button>
        <motion.button
          className="btn btn-gold"
          onClick={onConfirm}
          disabled={loading}
          style={{ flex: 2, fontSize: "1rem" }}
          animate={loading ? { scale: [1, 1.02, 1] } : {}}
          transition={{ duration: 1, repeat: Infinity }}
        >
          {loading ? "Creando personaggio..." : "✦ ENTRA NEL MONDO ✦"}
        </motion.button>
      </div>
    </motion.div>
  );
}

// ── COMPONENTE PRINCIPALE ──
export default function CharacterCreation({ campaignId, onComplete }) {
  const DRAFT_KEY = `character_draft_${campaignId}`;

  // Carica bozza salvata o inizializza nuovo personaggio
  const [step, setStep] = useState(() => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      return saved ? JSON.parse(saved).step : 0;
    } catch {
      return 0;
    }
  });

  const [characterData, setCharacterData] = useState(() => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.data || {
          race: null, subrace: null, class: null, background: null,
          name: "", player_name: "", token_color: "#d4af37", avatar_url: null,
          alignment: "Neutrale", level: 1, xp: 0,
        };
      }
    } catch {
      // Se c'è un errore, ignora e usa i default
    }
    return {
      race: null, subrace: null, class: null, background: null,
      name: "", player_name: "", token_color: "#d4af37", avatar_url: null,
      alignment: "Neutrale", level: 1, xp: 0,
    };
  });

  const [loading, setLoading] = useState(false);

  // Salva automaticamente in localStorage quando i dati cambiano
  useEffect(() => {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({
        step,
        data: characterData,
        timestamp: Date.now(),
      }));
    } catch (e) {
      console.warn("Impossibile salvare bozza:", e);
    }
  }, [step, characterData, DRAFT_KEY]);

  const updateData = useCallback((updates) => {
    setCharacterData(prev => ({ ...prev, ...updates }));
  }, []);

  const nextStep = () => setStep(s => Math.min(s + 1, STEPS.length - 1));
  const prevStep = () => setStep(s => Math.max(s - 1, 0));

  const handleConfirm = async () => {
    setLoading(true);
    try {
      // Prepara dati per Supabase — rimuovi chiavi private con _
      const { _baseStats, _assignedStats, ...cleanData } = characterData;

      const cls = getClassById(cleanData.class);
      const race = getRaceById(cleanData.race);

      // Calcola HP massimi = dado classe + modificatore CON
      const conMod = Math.floor(((cleanData.constitution || 10) - 10) / 2);
      const hpMax = (cls?.hitDie || 8) + conMod;

      // Calcola AC di base (10 + mod DES, il DM può cambiarlo)
      const dexMod = Math.floor(((cleanData.dexterity || 10) - 10) / 2);
      const armorClass = 10 + dexMod;

      // Calcola iniziativa
      const initiative = dexMod;

      // Slot incantesimi di livello 1
      const spellSlots = cls?.spellcasting?.slotsTable?.[0] || [0,0,0,0,0,0,0,0,0];
      const spellSlotsObj = {};
      const spellSlotsUsedObj = {};
      spellSlots.forEach((n, i) => {
        spellSlotsObj[String(i+1)] = n;
        spellSlotsUsedObj[String(i+1)] = 0;
      });

      const payload = {
        campaign_id: campaignId,
        player_name: cleanData.player_name,
        player_code: Math.random().toString(36).slice(2, 8).toUpperCase(), // codice 6 caratteri
        name: cleanData.name,
        race: cleanData.race,
        subrace: cleanData.subrace || null,
        class: cleanData.class,
        background: cleanData.background,
        alignment: cleanData.alignment,
        level: 1,
        xp: 0,
        strength: cleanData.strength || 10,
        dexterity: cleanData.dexterity || 10,
        constitution: cleanData.constitution || 10,
        intelligence: cleanData.intelligence || 10,
        wisdom: cleanData.wisdom || 10,
        charisma: cleanData.charisma || 10,
        hp_max: hpMax,
        hp_current: hpMax,
        hp_temp: 0,
        armor_class: armorClass,
        speed: race?.speed || 30,
        initiative: initiative,
        proficiency_bonus: 2,
        spell_slots: spellSlotsObj,
        spell_slots_used: spellSlotsUsedObj,
        hit_dice_total: 1,
        hit_dice_used: 0,
        death_saves_success: 0,
        death_saves_fail: 0,
        is_stable: true,
        proficiencies: [
          ...(cls?.savingThrows || []),
          ...(getBackgroundById(cleanData.background)?.skillProficiencies || []),
        ],
        saving_throws: cls?.savingThrows || [],
        skills: {},
        inventory: [],
        gold: 0, silver: 0, copper: 0,
        spells_known: [], spells_prepared: [], cantrips: [],
        conditions: [],
        inspiration: false,
        token_color: cleanData.token_color || "#d4af37",
        avatar_url: cleanData.avatar_url || null,
      };

      if (onComplete) {
        await onComplete(payload);
        // Cancella la bozza dopo la creazione con successo
        try {
          localStorage.removeItem(DRAFT_KEY);
        } catch (e) {
          console.warn("Impossibile rimuovere bozza:", e);
        }
      }
    } catch (err) {
      console.error("Errore creazione personaggio:", err);
    } finally {
      setLoading(false);
    }
  };

  const stepComponents = [
    <StepName data={characterData} onChange={updateData} onNext={nextStep} />,
    <StepRace data={characterData} onChange={updateData} onNext={nextStep} onBack={prevStep} />,
    <StepClass data={characterData} onChange={updateData} onNext={nextStep} onBack={prevStep} />,
    <StepBackground data={characterData} onChange={updateData} onNext={nextStep} onBack={prevStep} />,
    <StepStats data={characterData} onChange={updateData} onNext={nextStep} onBack={prevStep} />,
    <StepPortrait data={characterData} onChange={updateData} onNext={nextStep} onBack={prevStep} />,
    <StepConfirm data={characterData} onConfirm={handleConfirm} onBack={prevStep} loading={loading} />,
  ];

  return (
    <div style={{
      minHeight: "100vh",
      padding: "20px 16px",
      display: "flex",
      flexDirection: "column",
      gap: 20,
      maxWidth: 560,
      margin: "0 auto",
    }}>
      <div className="bg-image bg-explore" />
      <div className="bg-overlay-heavy" />
      <MusicPlayer track="explore" />

      {/* Header */}
      <div style={{ textAlign: "center" }}>
        <div style={{
          fontFamily: "var(--font-title)",
          fontSize: "1.4rem",
          color: "var(--gold)",
          textShadow: "0 0 20px rgba(212,175,55,0.5)",
          letterSpacing: "0.05em",
        }}>
          Crea il tuo Personaggio
        </div>
        <div style={{ color: "var(--parchment-dark)", fontSize: "0.8rem", marginTop: 4 }}>
          {STEPS[step].label}
        </div>
      </div>

      {/* Step indicator */}
      <div className="step-dots">
        {STEPS.map((s, i) => (
          <div
            key={s.id}
            className={`step-dot ${i === step ? "active" : i < step ? "done" : ""}`}
          />
        ))}
      </div>

      {/* Contenuto step */}
      <AnimatePresence mode="wait">
        <div key={step}>
          {stepComponents[step]}
        </div>
      </AnimatePresence>
    </div>
  );
}
