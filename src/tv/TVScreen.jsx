// ═══════════════════════════════════════════════
//  TVScreen — Schermata TV/Proiettore
//  Mostra: Party status, iniziativa, narrativa,
//  lancio dadi in tempo reale, mappa
// ═══════════════════════════════════════════════

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import MusicPlayer from "../shared/components/MusicPlayer.jsx";
import { supabase } from "../lib/supabase.js";
import { TokenSmall } from "../shared/components/CharacterToken.jsx";
import FinalDiceBox from "../shared/components/FinalDiceBox.jsx";
import DnDIcon from "../shared/components/DnDIcon.jsx";
import TurnBanner from "./TurnBanner.jsx";
import CombatLog from "./CombatLog.jsx";
import { STATUS_EFFECTS } from "../shared/constants/statusEffects.js";
import { SAVING_THROWS } from "../shared/constants/savingThrows.js";
import { SKILL_CHECKS } from "../shared/constants/skillChecks.js";

const CLASS_ICONS = {
  barbarian:"⚔️", bard:"🎸", cleric:"✝️", druid:"🌿", fighter:"🗡️",
  monk:"🥋", paladin:"🛡️", ranger:"🏹", rogue:"🔪", sorcerer:"⚡",
  warlock:"🌑", wizard:"📚",
};

const CLASS_DATA = {
  barbarian: { icon: "⚔️", label: "Barbaro", gradient: ["#8B2500", "#CD3700"] },
  bard: { icon: "🎵", label: "Bardo", gradient: ["#6A287E", "#9B59B6"] },
  cleric: { icon: "✦", label: "Chierico", gradient: ["#B8860B", "#DAA520"] },
  druid: { icon: "🌿", label: "Druido", gradient: ["#2E5A1E", "#4A8A2E"] },
  fighter: { icon: "🗡️", label: "Guerriero", gradient: ["#1E3A5A", "#2E6A9A"] },
  monk: { icon: "☯", label: "Monaco", gradient: ["#4A3728", "#6A5748"] },
  paladin: { icon: "🛡️", label: "Paladino", gradient: ["#8B7500", "#BBA030"] },
  ranger: { icon: "🏹", label: "Ranger", gradient: ["#2E4A1E", "#3A6A2A"] },
  rogue: { icon: "🗡", label: "Ladro", gradient: ["#1A3A2A", "#2A5A4A"] },
  sorcerer: { icon: "⚡", label: "Stregone", gradient: ["#5A1A2A", "#8A2A4A"] },
  warlock: { icon: "🌑", label: "Warlock", gradient: ["#2A1A3A", "#4A2A5A"] },
  wizard: { icon: "✧", label: "Mago", gradient: ["#3A1A5A", "#5A3A8A"] },
  monster: { icon: "💀", label: "Mostro", gradient: ["#4A0A0A", "#7A1A1A"] },
};

// Particelle per animazione dadi
function DiceParticles({ color = "#d4af37", count = 8 }) {
  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 50 }}>
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          style={{
            position: "absolute",
            width: Math.random() * 6 + 4,
            height: Math.random() * 6 + 4,
            borderRadius: "50%",
            background: color,
            left: "50%", top: "50%",
          }}
          initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
          animate={{
            x: (Math.random() - 0.5) * 300,
            y: (Math.random() - 0.5) * 300,
            opacity: 0,
            scale: 0,
          }}
          transition={{ duration: 1.2, ease: "easeOut", delay: Math.random() * 0.3 }}
        />
      ))}
    </div>
  );
}

// Mostra un risultato di dado sul TV
function DiceRollDisplay({ roll, onDone }) {
  const [showParticles, setShowParticles] = useState(false);
  const isNat20 = roll.dice?.[0] === "d20" && roll.total === 20;
  const isNat1 = roll.dice?.[0] === "d20" && roll.total === 1;

  useEffect(() => {
    setTimeout(() => setShowParticles(true), 300);
    const t = setTimeout(onDone, 3500);
    return () => clearTimeout(t);
  }, [onDone]);

  const accentColor = isNat20 ? "#f0d060" : isNat1 ? "#c04040" : (roll.tokenColor || "#d4af37");

  return (
    <motion.div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.3)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 200,
        gap: 16,
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {showParticles && <DiceParticles color={accentColor} count={isNat20 ? 16 : 8} />}

      {/* Chi ha lanciato */}
      <motion.div
        style={{ fontFamily: "var(--font-heading)", fontSize: "1.2rem", color: accentColor, letterSpacing: "0.3em", textTransform: "uppercase" }}
        initial={{ y: -30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
      >
        {roll.characterName} lancia {roll.dice?.join(" + ")}
        {roll.label ? ` — ${roll.label}` : ""}
      </motion.div>

      {/* Risultato */}
      <motion.div
        style={{
          fontFamily: "var(--font-heading)",
          fontSize: "clamp(6rem, 15vw, 12rem)",
          fontWeight: "900",
          color: accentColor,
          textShadow: `0 0 60px ${accentColor}, 0 0 120px ${accentColor}60`,
          lineHeight: 1,
        }}
        initial={{ opacity: 0, scale: 0.3 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.5, type: "spring", stiffness: 300 }}
      >
        {roll.total}
      </motion.div>

      {/* Label nat20/nat1 */}
      {(isNat20 || isNat1) && (
        <motion.div
          style={{
            fontFamily: "var(--font-heading)",
            fontSize: "2rem",
            color: accentColor,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            textShadow: `0 0 20px ${accentColor}`,
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
        >
          {isNat20 ? "✦ COLPO CRITICO! ✦" : "✖ FALLIMENTO CRITICO ✖"}
        </motion.div>
      )}

      {/* Dettagli tiro */}
      {roll.rolls && roll.rolls.length > 1 && (
        <motion.div
          style={{ display: "flex", gap: 12 }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
        >
          {roll.rolls.map((r, i) => (
            <div key={i} style={{
              background: "rgba(0,0,0,0.5)",
              border: `1px solid ${accentColor}40`,
              borderRadius: 8, padding: "8px 16px",
              textAlign: "center",
            }}>
              <div style={{ fontSize: "0.7rem", color: accentColor, fontFamily: "var(--font-heading)" }}>{r.type}</div>
              <div style={{ fontSize: "1.5rem", fontFamily: "var(--font-heading)", color: "var(--parchment)" }}>{r.value}</div>
            </div>
          ))}
          {roll.modifier !== 0 && (
            <div style={{
              background: "rgba(0,0,0,0.5)",
              border: "1px solid rgba(212,175,55,0.3)",
              borderRadius: 8, padding: "8px 16px",
              textAlign: "center",
            }}>
              <div style={{ fontSize: "0.7rem", color: "var(--gold)", fontFamily: "var(--font-heading)" }}>MOD</div>
              <div style={{ fontSize: "1.5rem", fontFamily: "var(--font-heading)", color: roll.modifier > 0 ? "var(--gold)" : "var(--crimson-light)" }}>
                {roll.modifier > 0 ? "+" : ""}{roll.modifier}
              </div>
            </div>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}

// Componente Marker Animato
function NarrativeMarker({ marker }) {
  if (!marker) return null;

  const { x, y, style } = marker;

  return (
    <div style={{
      position: "absolute",
      left: `${x}%`,
      top: `${y}%`,
      transform: "translate(-50%, -50%)",
      pointerEvents: "none",
      zIndex: 10,
    }}>
      {style.type === 'circle' && (
        <motion.div
          animate={{
            scale: [1, 1.4, 1],
            opacity: [0.7, 1, 0.7]
          }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          style={{
            width: style.size,
            height: style.size,
            borderRadius: "50%",
            border: `4px solid ${style.color}`,
            background: `${style.color}40`,
            boxShadow: `0 0 30px ${style.color}, 0 0 60px ${style.color}80`
          }}
        />
      )}
      {style.type === 'arrow' && (
        <motion.div
          animate={{
            y: [-8, 8, -8],
            opacity: [0.7, 1, 0.7]
          }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          style={{
            fontSize: style.size * 1.2,
            color: style.color,
            filter: `drop-shadow(0 0 15px ${style.color})`,
            lineHeight: 1
          }}
        >
          ▼
        </motion.div>
      )}
      {style.type === 'x' && (
        <motion.div
          animate={{
            rotate: [0, 90, 0],
            scale: [1, 1.3, 1],
            opacity: [0.7, 1, 0.7]
          }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          style={{
            fontSize: style.size,
            fontWeight: "bold",
            color: style.color,
            filter: `drop-shadow(0 0 15px ${style.color})`,
            lineHeight: 1
          }}
        >
          ✕
        </motion.div>
      )}
      {style.type === 'star' && (
        <motion.div
          animate={{
            rotate: [0, 360],
            scale: [1, 1.3, 1],
            opacity: [0.7, 1, 0.7]
          }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          style={{
            fontSize: style.size,
            color: style.color,
            filter: `drop-shadow(0 0 15px ${style.color})`,
            lineHeight: 1
          }}
        >
          ★
        </motion.div>
      )}
    </div>
  );
}

// Messaggio narrativo del DM
function NarrativeOverlay({ text, dmName, onDone, title, image, marker }) {
  return (
    <motion.div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.92)",
        backdropFilter: "blur(8px)",
        zIndex: 100,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "60px 100px",
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div style={{
        position: "absolute",
        inset: 40,
        border: "2px solid rgba(212,175,55,0.3)",
        borderRadius: 12,
        pointerEvents: "none",
      }} />

      <div style={{
        maxWidth: image ? "95%" : "85%",
        maxHeight: "85vh",
        overflowY: "auto",
        padding: "40px 60px",
        background: "linear-gradient(135deg, rgba(25,20,15,0.95), rgba(15,10,8,0.95))",
        border: "1px solid rgba(212,175,55,0.4)",
        borderRadius: 8,
        boxShadow: "0 0 60px rgba(212,175,55,0.2), inset 0 1px 0 rgba(212,175,55,0.1)",
        display: "flex",
        flexDirection: image ? "row" : "column",
        gap: 30,
        alignItems: image ? "flex-start" : "center",
      }}>
        {/* Immagine con Marker (se presente) */}
        {image && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            style={{
              position: "relative",
              flex: "0 0 45%",
              borderRadius: 8,
              overflow: "hidden",
              border: "2px solid rgba(212,175,55,0.3)",
              boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
            }}
          >
            <img
              src={image}
              alt="Narrative"
              style={{
                width: "100%",
                height: "auto",
                maxHeight: "70vh",
                objectFit: "contain",
                display: "block",
              }}
            />
            <NarrativeMarker marker={marker} />
          </motion.div>
        )}

        {/* Testo */}
        <div style={{
          flex: image ? "1" : "none",
          display: "flex",
          flexDirection: "column",
        }}>
          {title && (
            <h2 style={{
              fontFamily: "var(--font-heading)",
              fontSize: "clamp(1.5rem, 3vw, 2.5rem)",
              color: "var(--gold)",
              textAlign: "center",
              marginBottom: 30,
              letterSpacing: "0.05em",
              textShadow: "0 0 30px rgba(212,175,55,0.4)",
            }}>
              {title}
            </h2>
          )}

          <div style={{
            fontFamily: "var(--font-heading)",
            fontSize: "0.75rem",
            color: "rgba(212,175,55,0.6)",
            letterSpacing: "0.3em",
            marginBottom: 20,
            textAlign: "center",
          }}>
            {dmName || "DUNGEON MASTER"}
          </div>

          <TypewriterText text={text} />
        </div>
      </div>
    </motion.div>
  );
}

// Effetto macchina da scrivere per narrativa
function TypewriterText({ text, onComplete }) {
  const [displayed, setDisplayed] = useState("");
  useEffect(() => {
    setDisplayed("");
    let i = 0;
    const interval = setInterval(() => {
      setDisplayed(text.slice(0, i + 1));
      i++;
      if (i >= text.length) {
        clearInterval(interval);
        if (onComplete) onComplete();
      }
    }, 20);
    return () => clearInterval(interval);
  }, [text, onComplete]);

  return (
    <div style={{
      fontFamily: "var(--font-body)",
      fontSize: "clamp(1.1rem, 2.2vw, 1.6rem)",
      color: "var(--parchment)",
      lineHeight: 1.7,
      whiteSpace: "pre-line",
      textShadow: "0 0 20px rgba(212,175,55,0.2)",
    }}>
      {displayed}
      {displayed.length < text.length && (
        <span style={{ borderRight: "2px solid var(--gold)", marginLeft: 2, animation: "blink 1s infinite" }}></span>
      )}
    </div>
  );
}

// Particelle atmosferiche (da Opus)
function Particles() {
  const ps = Array.from({ length: 20 }, (_, i) => ({
    id: i, x: Math.random() * 100, y: Math.random() * 100,
    s: Math.random() * 3 + 1, d: Math.random() * 8 + 4, dl: Math.random() * 5,
  }));
  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 5 }}>
      {ps.map(p => (
        <div key={p.id} style={{
          position: "absolute", left: `${p.x}%`, top: `${p.y}%`,
          width: p.s, height: p.s, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(255,240,180,0.8), transparent)",
          boxShadow: `0 0 ${p.s * 3}px rgba(255,220,100,0.3)`,
          animation: `fly ${p.d}s ease-in-out ${p.dl}s infinite`,
        }} />
      ))}
    </div>
  );
}

// Initiative Carousel (da Opus) - Carousel orizzontale in alto
function InitiativeCarousel({ combatants, activeIndex, currentRound }) {
  if (!combatants || combatants.length === 0) return null;

  return (
    <div style={{
      position: "absolute",
      top: 10,
      left: "50%",
      transform: "translateX(-50%)",
      zIndex: 50,
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      background: "none",
      boxShadow: "none",
      backdropFilter: "none",
    }}>
      {combatants.map((c, i) => {
          const isActive = i === activeIndex;
          const isMonster = c.type === "monster";
          const icon = isMonster ? "👹" : (CLASS_DATA[c.class]?.icon || CLASS_ICONS[c.class] || "⚔️");
          const borderColor = isMonster ? "#cc3333" : c.token_color;

          return (
            <div key={c.id} style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 3,
              transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
              transform: isActive ? "scale(1.2)" : "scale(0.85)",
              opacity: isActive ? 1 : 0.35,
              filter: isActive ? "none" : "brightness(0.4)",
            }}>
              {/* Turn arrow */}
              {isActive && (
                <div style={{
                  fontSize: "0.5rem",
                  color: "#d4af37",
                  textShadow: "0 0 8px #d4af37",
                  animation: "turnBounce 1s ease-in-out infinite",
                  marginBottom: -2,
                }}>▼</div>
              )}

              {/* Portrait circle */}
              <div style={{
                position: "relative",
                width: 48,
                height: 48,
                borderRadius: "50%",
                background: isMonster
                  ? `radial-gradient(circle at 35% 30%, ${c.token_color || '#cc3333'}60, #1a0808)`
                  : `radial-gradient(circle at 35% 30%, ${c.token_color}50, #0a0a15)`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1.2rem",
                border: isActive ? `3px solid #40c040` : `2px solid ${borderColor}30`,
                boxShadow: isActive
                  ? `0 0 25px #40c040, 0 0 15px #40c040, inset 0 -6px 12px rgba(0,0,0,0.5)`
                  : `inset 0 -4px 8px rgba(0,0,0,0.6)`,
                transition: "all 0.4s ease",
              }}>
                {c.avatar_url ? (
                  <img src={c.avatar_url} alt={c.name} style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} />
                ) : icon}

                {/* Red X for monster indicator */}
                {isMonster && (
                  <div style={{
                    position: "absolute",
                    bottom: -1,
                    right: -1,
                    width: 14,
                    height: 14,
                    borderRadius: "50%",
                    background: "#cc3333",
                    border: "2px solid rgba(0,0,0,0.8)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "0.45rem",
                  }}>☠</div>
                )}

                {/* HP ring (only for active) */}
                {isActive && (
                  <svg viewBox="0 0 100 100" style={{
                    position: "absolute",
                    inset: -3,
                    width: "calc(100% + 6px)",
                    height: "calc(100% + 6px)",
                  }}>
                    <circle cx="50" cy="50" r="47" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="3" />
                    <circle cx="50" cy="50" r="47"
                      fill="none"
                      stroke={isMonster ? "#cc3333" : "#40c040"}
                      strokeWidth="3"
                      strokeDasharray={`${(Math.max(0, c.hp_current / c.hp_max) * 295.3)} 295.3`}
                      strokeLinecap="round"
                      transform="rotate(-90 50 50)"
                      style={{ filter: `drop-shadow(0 0 3px ${isMonster ? "#cc333360" : "#40c04060"})` }}
                    />
                  </svg>
                )}
              </div>

              {/* Name */}
              <div style={{
                fontFamily: "'Cinzel', serif",
                fontSize: isActive ? "0.55rem" : "0.45rem",
                color: isActive ? "#fff" : "rgba(200,190,170,0.5)",
                fontWeight: isActive ? 700 : 400,
                letterSpacing: "0.05em",
                textShadow: isActive ? `0 0 8px ${borderColor}60` : "none",
                whiteSpace: "nowrap",
                maxWidth: 80,
                overflow: "hidden",
                textOverflow: "ellipsis",
                textAlign: "center",
                transition: "all 0.4s ease",
              }}>
                {c.name}
              </div>

              {/* Initiative number */}
              <div style={{
                fontFamily: "'Cinzel', serif",
                fontSize: "0.4rem",
                color: "rgba(212,175,55,0.3)",
                letterSpacing: "0.05em",
              }}>
                {c.initiative || 0}
              </div>
            </div>
          );
        })}
    </div>
  );
}

// Scheda HP nella sidebar (versione migliorata da Opus)
function CharacterHPCard({ character, isActive = false }) {
  const hpPct = Math.max(0, (character.hp_current / character.hp_max) * 100);
  const isDying = hpPct > 0 && hpPct <= 25;
  const isDead = character.hp_current === 0;
  const classInfo = CLASS_DATA[character.class] || CLASS_DATA.fighter;
  const hpColor = hpPct > 50 ? "#40c040" : hpPct > 25 ? "#c0a020" : "#c04040";

  return (
    <div style={{
      position: "relative",
      borderRadius: 10,
      overflow: "hidden",
      transition: "all 0.5s cubic-bezier(0.4, 0, 0.2, 1)",
      transform: isActive ? "scale(1.02)" : "scale(1)",
    }}>
      {/* Background */}
      <div style={{
        position: "absolute", inset: 0,
        background: `linear-gradient(145deg, ${classInfo.gradient[0]}dd, ${classInfo.gradient[1]}40, rgba(8,6,4,0.95))`,
        borderRadius: 10,
      }} />

      {/* Noise */}
      <div style={{
        position: "absolute", inset: 0, opacity: 0.06, borderRadius: 10, pointerEvents: "none",
        backgroundImage: `url("data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><filter id="n"><feTurbulence baseFrequency="0.9" numOctaves="4"/></filter><rect width="200" height="200" filter="url(#n)"/></svg>')}")`,
      }} />

      {/* Border */}
      <div style={{
        position: "absolute", inset: 0, borderRadius: 10, pointerEvents: "none", zIndex: 5,
        border: isActive ? `2px solid ${character.token_color}` : "1px solid rgba(212,175,55,0.1)",
        transition: "all 0.5s ease",
      }} />

      {/* Pulsating glow when active */}
      {isActive && (
        <div style={{
          position: "absolute", inset: -3, borderRadius: 13, pointerEvents: "none", zIndex: 6,
          boxShadow: `0 0 40px ${character.token_color}dd, 0 0 20px ${character.token_color}, inset 0 0 30px ${character.token_color}80`,
          animation: "glowPulse 1s ease-in-out infinite",
        }} />
      )}

      {/* Content */}
      <div style={{
        position: "relative", zIndex: 2,
        padding: "12px", display: "flex", gap: 12, alignItems: "stretch",
      }}>
        {/* Portrait */}
        <div style={{ position: "relative", flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
          <div style={{ position: "relative" }}>
            <div style={{
              width: 56, height: 56, borderRadius: 8,
              background: character.avatar_url
                ? "#000"
                : `radial-gradient(circle at 30% 25%, ${character.token_color}60, transparent 60%), radial-gradient(circle at 70% 75%, ${classInfo.gradient[0]}80, transparent 60%), linear-gradient(145deg, #1a1a2e, #0a0a15)`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "1.6rem",
              border: `2px solid ${character.token_color}80`,
              boxShadow: `0 0 12px ${character.token_color}30, inset 0 -12px 18px rgba(0,0,0,0.4), inset 0 2px 4px rgba(255,255,255,0.1)`,
              filter: isDead ? "grayscale(1) brightness(0.4)" : "none",
              overflow: "hidden",
            }}>
              {character.avatar_url ? (
                <img src={character.avatar_url} alt={character.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (isDead ? "💀" : classInfo.icon)}
            </div>
            {/* Gold corners */}
            {[{ top: -2, left: -2 }, { top: -2, right: -2 }, { bottom: -2, left: -2 }, { bottom: -2, right: -2 }].map((pos, i) => (
              <div key={i} style={{
                position: "absolute", ...pos, width: 5, height: 5,
                borderTop: i < 2 ? "1.5px solid #d4af37" : "none",
                borderBottom: i >= 2 ? "1.5px solid #d4af37" : "none",
                borderLeft: i % 2 === 0 ? "1.5px solid #d4af37" : "none",
                borderRight: i % 2 === 1 ? "1.5px solid #d4af37" : "none",
              }} />
            ))}
            {isActive && (
              <div style={{
                position: "absolute", top: -6, left: "50%", transform: "translateX(-50%)",
                fontSize: "0.45rem", color: "#d4af37", textShadow: "0 0 8px #d4af37",
                animation: "turnBounce 1s ease-in-out infinite",
              }}>▼</div>
            )}
          </div>
          <div style={{
            fontSize: "0.42rem", color: character.token_color, letterSpacing: "0.12em",
            fontFamily: "'Cinzel', serif", textTransform: "uppercase", opacity: 0.8,
          }}>LV.{character.level} {classInfo.label}</div>
        </div>

        {/* Info */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div>
            <div style={{
              fontFamily: "'Cinzel Decorative', serif", fontSize: "0.9rem", fontWeight: 700,
              color: isActive ? "#fff" : "rgba(235,220,190,0.9)", letterSpacing: "0.06em",
              textShadow: isActive ? `0 0 12px ${character.token_color}80` : "0 1px 3px rgba(0,0,0,0.8)",
            }}>{character.name}</div>
          </div>

          {/* HP Bar */}
          <div style={{ marginTop: 6 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
              <span style={{ fontSize: "0.42rem", color: "rgba(212,175,55,0.35)", fontFamily: "'Cinzel', serif", letterSpacing: "0.1em" }}>PF</span>
              <span style={{
                fontFamily: "'Cinzel', serif", fontSize: "0.6rem", fontWeight: 700, color: hpColor,
                textShadow: `0 0 6px ${hpColor}30`,
              }}>{character.hp_current}<span style={{ color: "rgba(212,175,55,0.25)", fontSize: "0.45rem" }}>/{character.hp_max}</span></span>
            </div>
            <div style={{
              height: 8, borderRadius: 4, background: "rgba(0,0,0,0.5)", border: "1px solid rgba(212,175,55,0.08)",
              overflow: "hidden", position: "relative", boxShadow: "inset 0 2px 4px rgba(0,0,0,0.5)",
            }}>
              <div style={{
                position: "absolute", bottom: 0, left: 0, width: `${hpPct}%`, height: "100%", borderRadius: 3,
                background: hpPct > 50
                  ? "linear-gradient(to top, #1a6a1a, #30a030, #50c050)"
                  : hpPct > 25 ? "linear-gradient(to top, #8a6a10, #b09020, #c0a030)" : "linear-gradient(to top, #6a1a1a, #a03030, #c04040)",
                transition: "width 0.6s ease",
                boxShadow: `0 0 8px ${hpColor}40`,
              }}>
                {/* Bubbles animati */}
                {[...Array(3)].map((_, i) => (
                  <div key={i} style={{
                    position: "absolute", bottom: 0, left: `${20 + i * 30}%`,
                    width: 2.5 - i * 0.3, height: 2.5 - i * 0.3, borderRadius: "50%",
                    background: "rgba(255,255,255,0.2)", animation: `bubble ${1.5 + i * 0.5}s ease-in-out ${i * 0.3}s infinite`,
                  }} />
                ))}
                <div style={{
                  position: "absolute", top: 1, left: 4, right: "40%", height: 2.5, borderRadius: 3,
                  background: "linear-gradient(90deg, rgba(255,255,255,0.15), transparent)",
                }} />
              </div>
              {isDying && <div style={{
                position: "absolute", inset: 0, background: "rgba(192,64,64,0.3)",
                animation: "dangerPulse 1.2s ease-in-out infinite", borderRadius: 3,
              }} />}
            </div>
          </div>

          {/* Stats */}
          <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
            <div style={{
              display: "flex", alignItems: "center", gap: 3, padding: "2px 6px", borderRadius: 4,
              background: "rgba(255,255,255,0.04)", border: "1px solid rgba(212,175,55,0.06)",
            }}>
              <svg viewBox="0 0 24 24" style={{ width: 11, height: 11 }}>
                <path d="M12 2L3 7v5c0 5.5 3.8 10.7 9 12 5.2-1.3 9-6.5 9-12V7l-9-5z" fill="none" stroke="rgba(212,175,55,0.5)" strokeWidth="2" />
                <text x="12" y="16" textAnchor="middle" fill="rgba(212,175,55,0.7)" fontSize="9" fontWeight="bold" fontFamily="serif">{character.armor_class}</text>
              </svg>
              <span style={{ fontSize: "0.4rem", color: "rgba(212,175,55,0.35)", fontFamily: "'Cinzel', serif" }}>CA</span>
            </div>
            <div style={{
              display: "flex", alignItems: "center", gap: 3, padding: "2px 6px", borderRadius: 4,
              background: "rgba(255,255,255,0.04)", border: "1px solid rgba(212,175,55,0.06)",
            }}>
              <span style={{ fontSize: "0.55rem", fontWeight: 700, color: "rgba(212,175,55,0.6)", fontFamily: "'Cinzel', serif" }}>{character.initiative || "0"}</span>
              <span style={{ fontSize: "0.4rem", color: "rgba(212,175,55,0.35)", fontFamily: "'Cinzel', serif" }}>INIT</span>
            </div>
          </div>

          {/* Status Effects */}
          {character.conditions && character.conditions.length > 0 && (
            <div style={{ display: "flex", gap: 4, marginTop: 6, flexWrap: "wrap" }}>
              {character.conditions.map(condId => {
                const effect = STATUS_EFFECTS.find(e => e.id === condId);
                if (!effect) return null;
                return (
                  <div
                    key={condId}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "2px 5px",
                      borderRadius: 4,
                      background: `${effect.color}25`,
                      border: `1px solid ${effect.color}80`,
                      fontSize: "0.42rem",
                      fontFamily: "'Cinzel', serif",
                      color: effect.color,
                      fontWeight: 600,
                      boxShadow: `0 0 6px ${effect.color}20`,
                    }}
                    title={effect.label}
                  >
                    <span style={{ fontWeight: "700", fontSize: "0.5rem" }}>{effect.symbol}</span>
                    <span style={{ letterSpacing: "0.02em" }}>{effect.label}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Player Token sulla mappa (da Opus) - Con HP arc dorato
function PlayerToken({ character, size = 60, isActive = false }) {
  const hpPct = Math.max(0, (character.hp_current / character.hp_max) * 100);
  const classInfo = CLASS_DATA[character.class];
  const isDead = character.hp_current === 0;

  return (
    <div style={{
      position: "relative", display: "flex", flexDirection: "column", alignItems: "center",
    }}>
      <div style={{
        position: "absolute", bottom: -2, width: size * 1.1, height: size * 0.25,
        background: "radial-gradient(ellipse, rgba(0,0,0,0.5), transparent 70%)", borderRadius: "50%",
      }} />

      {isActive && (
        <div style={{
          position: "absolute", inset: -12, borderRadius: "50%",
          background: `radial-gradient(circle, ${character.token_color}30, transparent 65%)`,
          animation: "activePulse 2.5s ease-in-out infinite",
        }} />
      )}

      {/* Status Effects badges - SPOSTATI QUI */}
      {character.conditions && character.conditions.length > 0 && (
        <div style={{
          position: "absolute",
          top: -8,
          left: "50%",
          transform: "translateX(-50%)",
          display: "flex",
          gap: 3,
          zIndex: 50,
        }}>
          {character.conditions.slice(0, 3).map(condId => {
            const effect = STATUS_EFFECTS.find(e => e.id === condId);
            if (!effect) return null;
            return (
              <div
                key={condId}
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: "50%",
                  background: `${effect.color}ee`,
                  border: `2px solid ${effect.color}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "0.6rem",
                  fontWeight: "700",
                  color: "#fff",
                  fontFamily: "var(--font-heading)",
                  boxShadow: `0 0 10px ${effect.color}cc, 0 2px 6px rgba(0,0,0,0.8)`,
                }}
                title={effect.label}
              >
                {effect.symbol}
              </div>
            );
          })}
          {character.conditions.length > 3 && (
            <div style={{
              width: 20,
              height: 20,
              borderRadius: "50%",
              background: "#555",
              border: "2px solid #777",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "0.55rem",
              fontWeight: "700",
              color: "#fff",
              boxShadow: "0 0 8px rgba(0,0,0,0.6)",
            }}>
              +{character.conditions.length - 3}
            </div>
          )}
        </div>
      )}

      <div style={{ position: "relative", width: size, height: size }}>
        <svg viewBox="0 0 100 100" style={{
          position: "absolute", inset: -4, width: size + 8, height: size + 8,
        }}>
          <defs>
            <linearGradient id={`pg-${character.id}`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#d4af37" />
              <stop offset="50%" stopColor={character.token_color} />
              <stop offset="100%" stopColor="#d4af37" />
            </linearGradient>
          </defs>
          <circle cx="50" cy="50" r="47" fill="none" stroke={`url(#pg-${character.id})`} strokeWidth="1.5" opacity="0.6" />
          <circle cx="50" cy="50" r="47" fill="none"
            stroke={hpPct > 50 ? "#40c040" : hpPct > 25 ? "#c0a020" : "#c04040"}
            strokeWidth="3"
            strokeDasharray={`${(hpPct / 100) * 295.3} 295.3`}
            strokeLinecap="round"
            transform="rotate(-90 50 50)"
            style={{ transition: "stroke-dasharray 0.5s ease" }}
          />
          {[0, 60, 120, 180, 240, 300].map(a => (
            <circle key={a} cx={50 + 47 * Math.cos(((a - 90) * Math.PI) / 180)}
              cy={50 + 47 * Math.sin(((a - 90) * Math.PI) / 180)} r="1.5" fill="#d4af37" opacity="0.4" />
          ))}
        </svg>

        <div style={{
          width: size, height: size, borderRadius: "50%",
          background: character.avatar_url
            ? "#000"
            : `radial-gradient(circle at 35% 30%, ${character.token_color}50, transparent 50%), #0a0a15`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: size * 0.4,
          border: `2px solid ${character.token_color}60`,
          boxShadow: `inset 0 -8px 15px rgba(0,0,0,0.4), inset 0 2px 4px rgba(255,255,255,0.05)`,
          filter: isDead ? "grayscale(1) brightness(0.4)" : "none",
          overflow: "hidden",
        }}>
          {character.avatar_url ? (
            <img src={character.avatar_url} alt={character.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (isDead ? "💀" : classInfo?.icon || "⚔️")}
        </div>
      </div>

      <div style={{
        marginTop: 5, fontFamily: "'Cinzel', serif", fontSize: "0.6rem", fontWeight: 700,
        color: "#fff", letterSpacing: "0.05em", textTransform: "uppercase",
        textShadow: `0 0 10px ${character.token_color}, 0 2px 6px rgba(0,0,0,0.9)`,
        background: "linear-gradient(to bottom, rgba(0,0,0,0.6), rgba(0,0,0,0.8))",
        padding: "2px 10px", borderRadius: 4, border: `1px solid ${character.token_color}40`,
      }}>
        {character.name}
      </div>
    </div>
  );
}

// Monster Token sulla mappa (da Opus) - Con bordo tratteggiato rosso
function MonsterToken({ monster, size = 55, isActive = false }) {
  const hpPct = Math.max(0, (monster.hp_current / monster.hp_max) * 100);
  const sizeMultiplier = monster.size === "large" ? 1.3 : monster.size === "small" ? 0.85 : 1;
  const actualSize = size * sizeMultiplier;
  const monsterColor = monster.token_color || "#cc3333";

  return (
    <div style={{
      position: "relative", display: "flex", flexDirection: "column", alignItems: "center",
    }}>
      {/* Ground shadow */}
      <div style={{
        position: "absolute", bottom: -2,
        width: actualSize * 1.1, height: actualSize * 0.25,
        background: "radial-gradient(ellipse, rgba(180,30,30,0.3), transparent 70%)",
        borderRadius: "50%",
      }} />

      {/* Active glow */}
      {isActive && (
        <div style={{
          position: "absolute", inset: -14, borderRadius: "50%",
          background: `radial-gradient(circle, ${monsterColor}35, transparent 60%)`,
          animation: "activePulse 2s ease-in-out infinite",
        }} />
      )}

      <div style={{ position: "relative", width: actualSize, height: actualSize }}>
        {/* Danger ring SVG */}
        <svg viewBox="0 0 100 100" style={{
          position: "absolute", inset: -4,
          width: actualSize + 8, height: actualSize + 8,
        }}>
          {/* Spiky outer ring for monsters */}
          <circle cx="50" cy="50" r="47" fill="none" stroke={monsterColor} strokeWidth="1.5" opacity="0.4"
            strokeDasharray="4 3" />
          {/* HP ring base */}
          <circle cx="50" cy="50" r="44" fill="none"
            stroke="rgba(255,255,255,0.06)" strokeWidth="3" />
        </svg>

        {/* Portrait */}
        <div style={{
          width: actualSize, height: actualSize, borderRadius: "50%",
          background: monster.avatar_url
            ? "#000"
            : `radial-gradient(circle at 35% 30%, ${monsterColor}50, #1a0808)`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: actualSize * 0.45,
          border: `2.5px solid ${monsterColor}90`,
          boxShadow: isActive
            ? `0 0 20px ${monsterColor}50, inset 0 -8px 15px rgba(0,0,0,0.5)`
            : `0 0 8px ${monsterColor}20, inset 0 -8px 15px rgba(0,0,0,0.5)`,
          transition: "all 0.4s ease",
          overflow: "hidden",
        }}>
          {monster.avatar_url ? (
            <img src={monster.avatar_url} alt={monster.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : "👹"}
        </div>
      </div>

      {/* Name */}
      <div style={{
        marginTop: 5,
        fontFamily: "'Cinzel', serif",
        fontSize: "0.6rem",
        fontWeight: 700,
        color: "#e0c0c0",
        letterSpacing: "0.04em",
        textShadow: `0 0 10px ${monsterColor}80, 0 2px 6px rgba(0,0,0,0.9)`,
        background: "linear-gradient(to bottom, rgba(60,10,10,0.7), rgba(40,5,5,0.9))",
        padding: "2px 10px",
        borderRadius: 4,
        border: `1px solid ${monsterColor}50`,
      }}>
        {monster.name}
      </div>
    </div>
  );
}

export default function TVScreen({ joinCode: propJoinCode }) {
  const [campaign, setCampaign] = useState(null);
  const [characters, setCharacters] = useState([]);
  const [session, setSession] = useState(null);
  const [combatState, setCombatState] = useState(null);
  const [narrativeMsg, setNarrativeMsg] = useState(null);
  const [diceRoll, setDiceRoll] = useState(null);
  const [mapUrl, setMapUrl] = useState(null);
  const [tokenPositions, setTokenPositions] = useState({});

  // Battle Grid State
  const [battleGrid, setBattleGrid] = useState({
    cellSize: 50,
    gridOpacity: 0.15,
    gridVisible: true
  });
  const [battleTokens, setBattleTokens] = useState([]);

  const [loading, setLoading] = useState(true);
  const [joinCode, setJoinCode] = useState(propJoinCode || "");
  const [inputCode, setInputCode] = useState("");
  const [currentLocation, setCurrentLocation] = useState(null);
  const [pois, setPois] = useState([]);
  const cleanupRef = useRef(null);
  const diceRef = useRef(null);

  // Initiative System
  const [showInitiativeRequest, setShowInitiativeRequest] = useState(false);

  // Track processed initiative messages to avoid loops
  const processedInitiativeRef = useRef(new Set());
  const processedLogEventsRef = useRef(new Set()); // 🛡️ Anti-duplicati per combat log
  const lastNarrativeTimestampRef = useRef(null); // 🛡️ Anti-duplicati per narrativa

  // Attack Pre-Roll Banner (narrazione educativa)
  const [attackBanner, setAttackBanner] = useState(null); // { characterName, weaponName, abilityUsed, abilityMod, profBonus, ... }
  const [damageBanner, setDamageBanner] = useState(null); // { characterName, weaponName, weaponDamage, damageBonus, ... }
  const [hitMissBanner, setHitMissBanner] = useState(null); // { hit: true/false, characterName, targetName, total, targetAC }
  const [savingThrowBanner, setSavingThrowBanner] = useState(null); // { characterName, ability, dc, description }
  const [savingThrowResultBanner, setSavingThrowResultBanner] = useState(null); // { success: true/false, characterName, ability, total, dc }
  const [skillCheckBanner, setSkillCheckBanner] = useState(null); // { characterName, skill, ability, dc, description }
  const [skillCheckResultBanner, setSkillCheckResultBanner] = useState(null); // { success: true/false, characterName, skill, ability, total, dc }

  // Exploration Mode (turni fuori combattimento)
  const [explorationMode, setExplorationMode] = useState(false);
  const [explorationTurnIndex, setExplorationTurnIndex] = useState(0);

  // Combat Log
  const [combatLog, setCombatLog] = useState([]);

  // Carica location corrente e POI
  const loadCurrentLocation = async (campaignId) => {
    try {
      const { data: location } = await supabase
        .from("locations")
        .select("*")
        .eq("campaign_id", campaignId)
        .eq("is_current", true)
        .maybeSingle();

      if (location) {
        setCurrentLocation(location);
        setMapUrl(location.map_url);

        const { data: poisData } = await supabase
          .from("points_of_interest")
          .select("*")
          .eq("location_id", location.id)
          .eq("discovered", true);

        setPois(poisData || []);
      }
    } catch (e) {
      console.error("Errore caricamento location:", e);
    }
  };

  // ═══════════════════════════════════════════════
  // COMBAT LOG - Aggiungi evento al log (con protezione anti-duplicati)
  // ═══════════════════════════════════════════════
  const addLogEvent = (eventData) => {
    // Crea un ID univoco basato sui dati dell'evento
    const eventKey = `${eventData.type}-${eventData.characterName || ''}-${eventData.message || ''}-${Date.now()}`;

    // Evita duplicati: controlla se questo evento è già stato loggato di recente (ultimi 500ms)
    const recentKey = `${eventData.type}-${eventData.characterName || ''}-${eventData.message || ''}`;
    if (processedLogEventsRef.current.has(recentKey)) {
      console.log("📜 ⚠️ Evento duplicato ignorato:", recentKey);
      return;
    }

    // Segna l'evento come processato
    processedLogEventsRef.current.add(recentKey);

    // Rimuovi dopo 500ms per permettere lo stesso evento in futuro
    setTimeout(() => {
      processedLogEventsRef.current.delete(recentKey);
    }, 500);

    // Limita la dimensione del Set (mantieni solo gli ultimi 50)
    if (processedLogEventsRef.current.size > 50) {
      const items = Array.from(processedLogEventsRef.current);
      processedLogEventsRef.current = new Set(items.slice(-50));
    }

    const event = {
      id: Date.now() + Math.random(), // ID unico
      timestamp: Date.now(),
      ...eventData,
    };
    setCombatLog(prev => [...prev, event]);
    console.log("📜 Log evento:", event);
  };

  // Carica campagna dal codice
  const loadCampaign = async (code) => {
    setLoading(true);
    try {
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }

      const { data: camp } = await supabase
        .from("campaigns")
        .select("*")
        .eq("join_code", code.toUpperCase())
        .single();
      if (!camp) { setLoading(false); return; }

      setCampaign(camp);

      const { data: chars } = await supabase
        .from("characters")
        .select("*")
        .eq("campaign_id", camp.id)
        .order("created_at");
      setCharacters(chars || []);

      const { data: sess } = await supabase
        .from("sessions")
        .select("*")
        .eq("campaign_id", camp.id)
        .eq("is_active", true)
        .single();
      setSession(sess);

      if (sess?.combat_state?.active) {
        console.log("📺 TV carica stato combattimento dal DB:", sess.combat_state);
        setCombatState(sess.combat_state);
      }

      if (sess?.map_url) {
        setMapUrl(sess.map_url);
      }

      await loadCurrentLocation(camp.id);

      cleanupRef.current = subscribeToSession(sess, camp);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const subscribeToSession = (sess, camp) => {
    if (!sess?.id) return;

    const tvChannel = supabase.channel(`session-tv-${sess.id}`, {
      config: {
        broadcast: { self: true },
      },
    })
      .on("broadcast", { event: "combat_update" }, ({ payload }) => {
        console.log("📺 TV riceve combat_update", payload);
        // Merge del payload con lo stato esistente invece di sovrascrivere tutto
        setCombatState(prev => prev ? { ...prev, ...payload } : payload);
      })
      .on("broadcast", { event: "combat_started" }, ({ payload }) => {
        console.log("📺 TV riceve combat_started", payload);
        console.log("📺 DEBUG payload.active:", payload.active, "payload.currentTurn:", payload.currentTurn);
        console.log("📺 DEBUG payload.initiative:", payload.initiative);

        // 📜 Log evento inizio combattimento
        addLogEvent({
          type: "initiative",
          message: "Combat started! Roll initiative!",
        });

        // Imposta direttamente il payload come nuovo stato (già contiene active: true e currentTurn: 0)
        setCombatState(payload);
        console.log("📺 combatState aggiornato con:", payload);
      })
      .on("broadcast", { event: "combat_ended" }, () => {
        console.log("📺 TV riceve combat_ended");
        setCombatState(null);
        setCombatLog([]); // 🧹 Pulisci il combat log
      })
      .on("broadcast", { event: "turn_changed" }, ({ payload }) => {
        console.log("📺 TV riceve turn_changed", payload);
        setCombatState(prev => {
          if (!prev) return null;

          // 📜 Log evento cambio turno
          const initiative = prev.initiative || [];
          const newTurnEntity = initiative[payload.currentTurn];
          if (newTurnEntity) {
            addLogEvent({
              type: "turn_change",
              characterName: newTurnEntity.name,
              message: `${newTurnEntity.name}'s turn`,
            });
          }

          return { ...prev, currentTurn: payload.currentTurn };
        });
      })
      .on("broadcast", { event: "narrative" }, ({ payload }) => {
        console.log("📺 TV riceve narrativa:", payload);
        if (payload.text === null) {
          console.log("📺 TV: Narrativa con text=null, chiudo");
          setNarrativeMsg(null);
          lastNarrativeTimestampRef.current = null;
        } else {
          // 🛡️ Anti-duplicati: ignora se è lo stesso timestamp
          if (payload.timestamp === lastNarrativeTimestampRef.current) {
            console.log("📺 ⚠️ Narrativa duplicata ignorata:", payload.timestamp);
            return;
          }
          lastNarrativeTimestampRef.current = payload.timestamp;
          setNarrativeMsg(payload);
        }
      })
      .on("broadcast", { event: "dice_roll_request" }, ({ payload }) => {
        console.log("📺 TV riceve dice_roll_request:", payload);
        console.log("🔍 payload.dice:", payload.dice);
        console.log("🔍 Tipo di payload.dice:", typeof payload.dice, "Array?", Array.isArray(payload.dice));
        console.log("🎨🎨🎨 TEMA RICEVUTO DALLA TV:", payload.diceTheme);

        // ═══════════════════════════════════════════════
        // SE È UN TIRO INIZIATIVA → Lancia i dadi subito
        // ═══════════════════════════════════════════════
        if (payload.isInitiative) {
          console.log("⚔️ INIZIATIVA rilevata! Lancia i dadi");

          if (diceRef.current?.isReady()) {
            const diceType = payload.dice?.[0] || "d20";
            const count = payload.dice?.length || 1;
            const notation = `${count}${diceType}`;
            const rollOptions = { theme: payload.diceTheme || (payload.isMonster ? "#c04040" : "#d4af37") };

            diceRef.current.roll(notation, (results) => {
              const rolls = results.map(r => ({ type: `d${r.sides}`, value: r.value }));
              const diceSum = results.reduce((sum, r) => sum + r.value, 0);
              const total = diceSum + (payload.modifier || 0);

              const resultPayload = {
                ...payload,
                rolls,
                total,
                timestamp: Date.now()
              };
              setDiceRoll(resultPayload);

              tvChannel.send({
                type: "broadcast",
                event: "dice_roll_result",
                payload: resultPayload,
              });
            }, rollOptions);
          }

          return;
        }

        // ═══════════════════════════════════════════════
        // SE È UN ATTACCO MOSTRO → Banner rosso PAZZO!
        // ═══════════════════════════════════════════════
        if (payload.isMonsterAttack) {
          console.log("🐉 ATTACCO MOSTRO! Banner rosso educativo!");

          // Mostra banner mostro
          setAttackBanner({ ...payload, isMonster: true });

          // Dopo 2.5 secondi, nascondi e lancia dadi
          setTimeout(() => {
            setAttackBanner(null);

            if (diceRef.current?.isReady()) {
              const diceType = payload.dice?.[0] || "d20";
              const count = payload.dice?.length || 1;
              const notation = `${count}${diceType}`;
              const rollOptions = { theme: payload.diceTheme || "#c04040" }; // Rosso per mostri

              diceRef.current.roll(notation, (results) => {
                const rolls = results.map(r => ({ type: `d${r.sides}`, value: r.value }));
                const diceSum = results.reduce((sum, r) => sum + r.value, 0);
                const total = diceSum + (payload.modifier || 0);

                // 🎯 CONFRONTO AUTOMATICO ATTACCO VS CA
                let hit = undefined;
                if (payload.target && payload.target.ac) {
                  hit = total >= payload.target.ac;
                  console.log(`🎲 Attacco mostro: ${total} vs CA ${payload.target.ac} → ${hit ? '✅ COLPITO!' : '❌ MANCATO!'}`);
                }

                const resultPayload = {
                  ...payload,
                  rolls,
                  total,
                  hit, // true/false/undefined
                  timestamp: Date.now()
                };
                setDiceRoll(resultPayload);

                // 🎬 Mostra banner HIT/MISS dopo 2 secondi
                if (hit !== undefined && payload.target) {
                  setTimeout(() => {
                    setHitMissBanner({
                      hit: hit,
                      attackerName: payload.monsterName || payload.characterName,
                      targetName: payload.target.name,
                      total: total,
                      targetAC: payload.target.ac,
                      isMonster: true,
                    });

                    // 📜 Log evento attacco mostro nel combat log
                    addLogEvent({
                      type: "attack",
                      characterName: payload.monsterName,
                      message: `${hit ? 'Hit' : 'Missed'} ${payload.target.name} (${total} vs AC ${payload.target.ac})`,
                      success: hit,
                    });

                    // Nascondi dopo 2.5 secondi
                    setTimeout(() => setHitMissBanner(null), 2500);
                  }, 2000);
                }

                tvChannel.send({
                  type: "broadcast",
                  event: "dice_roll_result",
                  payload: resultPayload,
                });
              }, rollOptions);
            }
          }, 2500);

          return;
        }

        // ═══════════════════════════════════════════════
        // SE È UN DANNO MOSTRO → Banner rosso danno!
        // ═══════════════════════════════════════════════
        if (payload.isMonsterDamage) {
          console.log("💀 DANNO MOSTRO! Banner rosso danno!");

          // Mostra banner danno mostro
          setDamageBanner({ ...payload, isMonster: true });

          // Dopo 2 secondi, nascondi e lancia dadi
          setTimeout(() => {
            setDamageBanner(null);

            if (diceRef.current?.isReady()) {
              const diceType = payload.dice?.[0] || "d6";
              const count = payload.dice?.length || 1;
              const notation = `${count}${diceType}`;
              const rollOptions = { theme: payload.diceTheme || "#c04040" }; // Rosso per mostri

              diceRef.current.roll(notation, (results) => {
                const rolls = results.map(r => ({ type: `d${r.sides}`, value: r.value }));
                const diceSum = results.reduce((sum, r) => sum + r.value, 0);
                const total = diceSum + (payload.modifier || 0);

                const resultPayload = { ...payload, rolls, total, timestamp: Date.now() };
                setDiceRoll(resultPayload);

                // 📜 Log evento danno mostro nel combat log
                if (payload.monsterName && payload.target) {
                  setTimeout(() => {
                    addLogEvent({
                      type: "damage",
                      characterName: payload.monsterName,
                      message: `Dealt ${total} damage to ${payload.target.name}`,
                    });
                  }, 2000);
                }

                tvChannel.send({
                  type: "broadcast",
                  event: "dice_roll_result",
                  payload: resultPayload,
                });
              }, rollOptions);
            }
          }, 2000);

          return;
        }

        // ═══════════════════════════════════════════════
        // SE È UN ATTACCO PLAYER → Mostra banner educativo PRIMA dei dadi
        // ═══════════════════════════════════════════════
        if (payload.isAttack) {
          console.log("⚔️ Attacco rilevato! Mostro banner educativo prima dei dadi");

          // Mostra banner con narrazione
          setAttackBanner(payload);

          // Dopo 2.5 secondi, nascondi il banner e lancia i dadi
          setTimeout(() => {
            setAttackBanner(null);

            // Ora lancia i dadi
            if (diceRef.current?.isReady()) {
              const diceType = payload.dice?.[0] || "d20";
              const count = payload.dice?.length || 1;
              const notation = `${count}${diceType}`;
              const rollOptions = { theme: payload.diceTheme || "#d4af37" };

              diceRef.current.roll(notation, (results) => {
                let rolls, diceSum;

                if (diceType === "d100" && results.length === 2 && results.every(r => r.sides === 10)) {
                  const tens = (results[0].value === 10 ? 0 : results[0].value) * 10;
                  const ones = results[1].value === 10 ? 0 : results[1].value;
                  const d100Value = tens + ones || 100;
                  rolls = [{ type: "d100", value: d100Value }];
                  diceSum = d100Value;
                } else {
                  rolls = results.map(r => ({ type: `d${r.sides}`, value: r.value }));
                  diceSum = results.reduce((sum, r) => sum + r.value, 0);
                }

                const total = diceSum + (payload.modifier || 0);

                // 🎯 CONFRONTO AUTOMATICO ATTACCO VS CA
                let hit = undefined;
                if (payload.target && payload.target.ac) {
                  hit = total >= payload.target.ac;
                  console.log(`🎲 Attacco player: ${total} vs CA ${payload.target.ac} → ${hit ? '✅ COLPITO!' : '❌ MANCATO!'}`);
                }

                const resultPayload = {
                  ...payload,
                  rolls,
                  total,
                  hit, // true/false/undefined
                  timestamp: Date.now(),
                };

                setDiceRoll(resultPayload);

                // 🎬 Mostra banner HIT/MISS dopo 2 secondi
                if (hit !== undefined && payload.target) {
                  setTimeout(() => {
                    setHitMissBanner({
                      hit: hit,
                      attackerName: payload.characterName,
                      targetName: payload.target.name,
                      total: total,
                      targetAC: payload.target.ac,
                      isMonster: false,
                    });

                    // 📜 Log evento attacco nel combat log
                    addLogEvent({
                      type: "attack",
                      characterName: payload.characterName,
                      message: `${hit ? 'Hit' : 'Missed'} ${payload.target.name} (${total} vs AC ${payload.target.ac})`,
                      success: hit,
                    });

                    // Nascondi dopo 2.5 secondi
                    setTimeout(() => setHitMissBanner(null), 2500);
                  }, 2000);
                }

                tvChannel.send({
                  type: "broadcast",
                  event: "dice_roll_result",
                  payload: resultPayload,
                }).then(() => {
                  console.log("✅ dice_roll_result inviato");
                }).catch(err => {
                  console.error("❌ Errore invio result:", err);
                });
              }, rollOptions);
            }
          }, 2500);

          return; // Non lanciare i dadi subito
        }

        // ═══════════════════════════════════════════════
        // SE È UN DANNO → Mostra banner educativo PRIMA dei dadi
        // ═══════════════════════════════════════════════
        if (payload.isDamage) {
          console.log("💥 Danno rilevato! Mostro banner educativo prima dei dadi");

          // Mostra banner con narrazione
          setDamageBanner(payload);

          // Dopo 2 secondi, nascondi il banner e lancia i dadi
          setTimeout(() => {
            setDamageBanner(null);

            // Ora lancia i dadi
            if (diceRef.current?.isReady()) {
              const diceType = payload.dice?.[0] || "d6";
              const count = payload.dice?.length || 1;
              const notation = `${count}${diceType}`;
              const rollOptions = { theme: payload.diceTheme || "#d4af37" };

              diceRef.current.roll(notation, (results) => {
                let rolls, diceSum;

                if (diceType === "d100" && results.length === 2 && results.every(r => r.sides === 10)) {
                  const tens = (results[0].value === 10 ? 0 : results[0].value) * 10;
                  const ones = results[1].value === 10 ? 0 : results[1].value;
                  const d100Value = tens + ones || 100;
                  rolls = [{ type: "d100", value: d100Value }];
                  diceSum = d100Value;
                } else {
                  rolls = results.map(r => ({ type: `d${r.sides}`, value: r.value }));
                  diceSum = results.reduce((sum, r) => sum + r.value, 0);
                }

                const total = diceSum + (payload.modifier || 0);

                const resultPayload = {
                  ...payload,
                  rolls,
                  total,
                  timestamp: Date.now(),
                };

                setDiceRoll(resultPayload);

                // 📜 Log evento danno nel combat log
                if (payload.characterName && payload.target) {
                  setTimeout(() => {
                    addLogEvent({
                      type: "damage",
                      characterName: payload.characterName,
                      message: `Dealt ${total} damage to ${payload.target.name}`,
                    });
                  }, 2000);
                }

                tvChannel.send({
                  type: "broadcast",
                  event: "dice_roll_result",
                  payload: resultPayload,
                }).then(() => {
                  console.log("✅ dice_roll_result inviato");
                }).catch(err => {
                  console.error("❌ Errore invio result:", err);
                });
              }, rollOptions);
            }
          }, 2000);

          return; // Non lanciare i dadi subito
        }

        // ═══════════════════════════════════════════════
        // SE È UN SAVING THROW → Mostra banner e controlla SUCCESS/FAIL
        // ═══════════════════════════════════════════════
        if (payload.isSavingThrow) {
          console.log("🎲 SAVING THROW rilevato! Mostra banner educativo");

          // Mostra banner con info saving throw
          setSavingThrowBanner(payload);

          // Dopo 2.5 secondi, nascondi banner e lancia dadi
          setTimeout(() => {
            setSavingThrowBanner(null);

            if (diceRef.current?.isReady()) {
              const diceType = payload.dice?.[0] || "d20";
              const count = payload.dice?.length || 1;
              const notation = `${count}${diceType}`;
              const abilityColor = SAVING_THROWS.find(s => s.id === payload.savingThrowData?.abilityId)?.color || "#d4af37";
              const rollOptions = { theme: payload.diceTheme || abilityColor };

              diceRef.current.roll(notation, (results) => {
                const rolls = results.map(r => ({ type: `d${r.sides}`, value: r.value }));
                const diceSum = results.reduce((sum, r) => sum + r.value, 0);
                const total = diceSum + (payload.modifier || 0);

                // 🎯 CONFRONTO SAVING THROW: total >= DC = SUCCESS
                const success = total >= payload.savingThrowData.dc;
                console.log(`🎲 Saving Throw: ${total} vs DC ${payload.savingThrowData.dc} → ${success ? '✅ SUCCESS!' : '❌ FAIL!'}`);

                const resultPayload = {
                  ...payload,
                  rolls,
                  total,
                  success, // true/false
                  timestamp: Date.now(),
                };

                setDiceRoll(resultPayload);

                // 🎬 Mostra banner SUCCESS/FAIL dopo 2 secondi
                setTimeout(() => {
                  setSavingThrowResultBanner({
                    success: success,
                    characterName: payload.characterName,
                    ability: payload.savingThrowData.ability,
                    total: total,
                    dc: payload.savingThrowData.dc,
                    description: payload.savingThrowData.description,
                  });

                  // 📜 Log evento
                  addLogEvent({
                    type: "saving_throw",
                    characterName: payload.characterName,
                    message: `${payload.savingThrowData.ability.toUpperCase()} Save: ${total} vs DC ${payload.savingThrowData.dc}`,
                    success: success,
                  });

                  // Nascondi dopo 3 secondi
                  setTimeout(() => setSavingThrowResultBanner(null), 3000);
                }, 2000);

                tvChannel.send({
                  type: "broadcast",
                  event: "dice_roll_result",
                  payload: resultPayload,
                });
              }, rollOptions);
            }
          }, 2500);

          return;
        }

        // ═══════════════════════════════════════════════
        // SE È UN SKILL CHECK → Mostra banner e controlla SUCCESS/FAIL
        // ═══════════════════════════════════════════════
        if (payload.isSkillCheck) {
          console.log("🎲 SKILL CHECK rilevato! Mostra banner educativo");

          // Mostra banner con info skill check
          setSkillCheckBanner(payload);

          // Dopo 2.5 secondi, nascondi banner e lancia dadi
          setTimeout(() => {
            setSkillCheckBanner(null);

            if (diceRef.current?.isReady()) {
              const diceType = payload.dice?.[0] || "d20";
              const count = payload.dice?.length || 1;
              const notation = `${count}${diceType}`;
              const skillColor = SKILL_CHECKS.find(s => s.id === payload.skillCheckData?.skillId)?.color || "#d4af37";
              const rollOptions = { theme: payload.diceTheme || skillColor };

              diceRef.current.roll(notation, (results) => {
                const rolls = results.map(r => ({ type: `d${r.sides}`, value: r.value }));
                const diceSum = results.reduce((sum, r) => sum + r.value, 0);
                const total = diceSum + (payload.modifier || 0);

                // 🎯 CONFRONTO SKILL CHECK: total >= DC = SUCCESS
                const success = total >= payload.skillCheckData.dc;
                console.log(`🎲 Skill Check: ${total} vs DC ${payload.skillCheckData.dc} → ${success ? '✅ SUCCESS!' : '❌ FAIL!'}`);

                const resultPayload = {
                  ...payload,
                  rolls,
                  total,
                  success, // true/false
                  timestamp: Date.now(),
                };

                setDiceRoll(resultPayload);

                // 🎬 Mostra banner SUCCESS/FAIL dopo 2 secondi
                setTimeout(() => {
                  setSkillCheckResultBanner({
                    success: success,
                    characterName: payload.characterName,
                    skill: payload.skillCheckData.skill,
                    ability: payload.skillCheckData.ability,
                    total: total,
                    dc: payload.skillCheckData.dc,
                    description: payload.skillCheckData.description,
                  });

                  // 📜 Log evento
                  addLogEvent({
                    type: "skill_check",
                    characterName: payload.characterName,
                    message: `${payload.skillCheckData.skill}: ${total} vs DC ${payload.skillCheckData.dc}`,
                    success: success,
                  });

                  // Nascondi dopo 3 secondi
                  setTimeout(() => setSkillCheckResultBanner(null), 3000);
                }, 2000);

                tvChannel.send({
                  type: "broadcast",
                  event: "dice_roll_result",
                  payload: resultPayload,
                });
              }, rollOptions);
            }
          }, 2500);

          return;
        }

        // ═══════════════════════════════════════════════
        // Altrimenti lancia i dadi normalmente (no banner)
        // ═══════════════════════════════════════════════
        if (diceRef.current?.isReady()) {
          // Costruisci notation SENZA modifier - lo aggiungiamo dopo
          const diceType = payload.dice?.[0] || "d20";
          const count = payload.dice?.length || 1;
          const notation = `${count}${diceType}`;

          console.log("🎲 diceType estratto:", diceType);
          console.log("🎲 count calcolato:", count);
          console.log("🎲 TV lancia dadi 3D (PURI, senza modifier):", notation);
          console.log("🎲 Modifier da aggiungere dopo:", payload.modifier);

          // Passa il COLORE del personaggio a FinalDiceBox
          const rollOptions = {
            theme: payload.diceTheme || "#d4af37"  // Default: oro
          };
          console.log("🎨 Roll options (colore):", rollOptions);

          diceRef.current.roll(notation, (results) => {
            console.log("🎲 3D completato con risultati:", results);
            console.log("🔍 Dettaglio results:", JSON.stringify(results, null, 2));
            console.log("🔍 Numero di dadi ricevuti:", results.length);

            // GESTIONE SPECIALE D100: dice-box lancia 2xd10 (decine + unità)
            let rolls, diceSum;

            if (diceType === "d100" && results.length === 2 && results.every(r => r.sides === 10)) {
              console.log("🎲 Rilevato d100 → combinando 2xd10 in singolo valore");
              // Il primo dado è le decine (0-90), il secondo le unità (0-9)
              const tens = (results[0].value === 10 ? 0 : results[0].value) * 10;
              const ones = results[1].value === 10 ? 0 : results[1].value;
              const d100Value = tens + ones || 100; // 00 = 100

              console.log("🎲 D100: decine =", tens, "unità =", ones, "→ totale =", d100Value);

              rolls = [{ type: "d100", value: d100Value }];
              diceSum = d100Value;
            } else {
              // Gestione normale per altri dadi
              rolls = results.map(r => {
                console.log("🎲 Dado singolo - sides:", r.sides, "value:", r.value);
                return { type: `d${r.sides}`, value: r.value };
              });
              diceSum = results.reduce((sum, r) => sum + r.value, 0);
            }

            // Aggiungi il modifier UNA SOLA VOLTA
            const total = diceSum + (payload.modifier || 0);

            console.log("📊 Calcolo totale:");
            console.log("  - Somma dadi:", diceSum);
            console.log("  - Modifier:", payload.modifier);
            console.log("  - TOTALE:", total);

            // Crea il payload del risultato
            const resultPayload = {
              ...payload,
              rolls,
              total,
              timestamp: Date.now(),
            };

            console.log("📺➡️📱 Invio dice_roll_result:", resultPayload);

            // Mostra sulla TV
            setDiceRoll(resultPayload);

            // Invia il risultato VERO al telefono via tvChannel
            tvChannel.send({
              type: "broadcast",
              event: "dice_roll_result",
              payload: resultPayload,
            }).then(() => {
              console.log("✅ dice_roll_result inviato al telefono");
            }).catch(err => {
              console.error("❌ Errore invio result:", err);
            });
          }, rollOptions);  // ✨ Passa il tema al metodo roll()
        }
      })
      .on("broadcast", { event: "initiative_request" }, ({ payload }) => {
        console.log("⚔️ TV riceve initiative_request:", payload);
        setShowInitiativeRequest(true);
        setTimeout(() => setShowInitiativeRequest(false), 5000); // Mostra per 5 secondi
      })
      .on("broadcast", { event: "initiative_rolled" }, ({ payload }) => {
        console.log("🎲 TV riceve initiative_rolled:", payload);

        // 📜 Log evento initiative roll
        if (payload.characterName && payload.roll !== undefined) {
          addLogEvent({
            type: "initiative",
            characterName: payload.characterName,
            message: `Initiative: ${payload.roll}`,
          });
        }

        // Mostra il dado che rotola per questo personaggio
        // Il dado verrà mostrato dal sistema esistente di dadi 3D
      })
      .on("broadcast", { event: "map_update" }, ({ payload }) => {
        console.log("📺 TV riceve mappa:", payload);
        setMapUrl(payload.mapUrl);
      })
      .on("broadcast", { event: "grid_update" }, ({ payload }) => {
        console.log("📺 TV riceve grid_update:", payload);
        setBattleGrid(prev => ({ ...prev, ...payload }));
      })
      .on("broadcast", { event: "token_update" }, ({ payload }) => {
        console.log("📺 TV riceve token_update:", payload);
        const { action, token } = payload;

        if (action === 'add') {
          setBattleTokens(prev => [...prev, token]);
        } else if (action === 'move') {
          setBattleTokens(prev => prev.map(t =>
            t.id === token.id
              ? { ...t, gridCol: token.gridCol, gridRow: token.gridRow, x: token.gridCol * battleGrid.cellSize, y: token.gridRow * battleGrid.cellSize }
              : t
          ));
        } else if (action === 'remove') {
          setBattleTokens(prev => prev.filter(t => t.id !== token.id));
        } else if (action === 'update_hp') {
          setBattleTokens(prev => prev.map(t =>
            t.id === token.id ? { ...t, hp: token.hp } : t
          ));
        } else if (action === 'clear') {
          setBattleTokens([]);
        }
      })
      .on("broadcast", { event: "scene_change" }, async ({ payload }) => {
        console.log("📺 TV riceve scene_change:", payload);
        setCurrentLocation({
          name: payload.location,
          description: payload.description,
          map_url: payload.mapUrl,
          music_track: payload.musicTrack,
        });
        setMapUrl(payload.mapUrl);

        if (camp?.id) {
          loadCurrentLocation(camp.id);
        }

        const { data: updatedChars } = await supabase
          .from("characters")
          .select("*")
          .eq("campaign_id", camp.id)
          .order("created_at");

        if (updatedChars) {
          setCharacters(updatedChars);
        }
      })
      .on("broadcast", { event: "poi_revealed" }, ({ payload }) => {
        console.log("📺 TV riceve poi_revealed:", payload);
        setPois(prev => [...prev, payload.poi]);
      })
      .on("broadcast", { event: "character_moved" }, ({ payload }) => {
        console.log("📺 TV riceve character_moved:", payload);
        setCharacters(prev => prev.map(c =>
          c.id === payload.characterId
            ? { ...c, map_x: payload.x, map_y: payload.y }
            : c
        ));
      })
      .on("broadcast", { event: "hp_updated" }, ({ payload }) => {
        console.log("📺 TV riceve hp_updated:", payload);
        // Aggiorna HP del personaggio nella lista characters
        setCharacters(prev => prev.map(c =>
          c.id === payload.characterId
            ? { ...c, hp_current: payload.hp_current, hp_max: payload.hp_max }
            : c
        ));
      })
      .on("broadcast", { event: "status_effects_updated" }, ({ payload }) => {
        console.log("📺 TV riceve status_effects_updated:", payload);
        // Aggiorna condizioni del personaggio
        setCharacters(prev => {
          const character = prev.find(c => c.id === payload.characterId);

          // 📜 Log evento per ogni condizione aggiunta/rimossa
          if (character && payload.conditions) {
            const oldConditions = character.conditions || [];
            const newConditions = payload.conditions;

            // Condizioni aggiunte
            const added = newConditions.filter(nc => !oldConditions.includes(nc));
            added.forEach(condition => {
              addLogEvent({
                type: "status_effect",
                characterName: character.name,
                message: `Status applied: ${condition}`,
              });
            });

            // Condizioni rimosse
            const removed = oldConditions.filter(oc => !newConditions.includes(oc));
            removed.forEach(condition => {
              addLogEvent({
                type: "status_effect",
                characterName: character.name,
                message: `Status removed: ${condition}`,
              });
            });
          }

          return prev.map(c =>
            c.id === payload.characterId
              ? { ...c, conditions: payload.conditions }
              : c
          );
        });
      })
      .on("broadcast", { event: "monster_hp_updated" }, ({ payload }) => {
        console.log("📺 TV riceve monster_hp_updated:", payload);
        // Aggiorna HP del mostro nel combatState
        setCombatState(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            monsters: prev.monsters.map(m =>
              m.id === payload.monsterId
                ? { ...m, hp_current: payload.hp_current, hp_max: payload.hp_max }
                : m
            )
          };
        });
      })
      .on("broadcast", { event: "initiative_rolled_player" }, async ({ payload }) => {
        // Crea un ID univoco per questo messaggio
        const messageId = `${payload.characterId}-${payload.roll}`;

        // Evita loop: non riprocessare messaggi già inoltrati
        if (processedInitiativeRef.current.has(messageId)) {
          return;
        }

        // Segna questo messaggio come processato
        processedInitiativeRef.current.add(messageId);

        // Pulisci messaggi vecchi dal Set (mantieni solo gli ultimi 100)
        if (processedInitiativeRef.current.size > 100) {
          const items = Array.from(processedInitiativeRef.current);
          processedInitiativeRef.current = new Set(items.slice(-100));
        }

        console.log("📺 TV riceve tiro iniziativa da player, relay al DM:", payload);

        // Inoltra il messaggio al canale della sessione (dove il DM sta ascoltando)
        await tvChannel.send({
          type: "broadcast",
          event: "initiative_rolled_player",
          payload: payload,
        });
      })
      .on("broadcast", { event: "exploration_mode_update" }, ({ payload }) => {
        console.log("📺 TV riceve exploration_mode_update:", payload);
        setExplorationMode(payload.active);
        setExplorationTurnIndex(payload.currentTurn || 0);
        // Aggiorna i personaggi se presenti nel payload
        if (payload.characters) {
          setCharacters(payload.characters);
        }
      })
      .subscribe((status) => {
        console.log("📺 TV canale status:", status, `session-tv-${sess.id}`);
      });

    const charChannel = supabase.channel(`tv-chars-${camp.id}`)
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "characters",
        filter: `campaign_id=eq.${camp.id}`,
      }, ({ new: updated }) => {
        setCharacters(prev => prev.map(c => c.id === updated.id ? { ...c, ...updated } : c));
      })
      .subscribe();

    return () => {
      console.log("📺 TV cleanup canali");
      supabase.removeChannel(tvChannel);
      supabase.removeChannel(charChannel);
    };
  };

  useEffect(() => {
    if (joinCode) loadCampaign(joinCode);

    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
      }
    };
  }, []);

  // Schermata inserimento codice TV
  if (!joinCode || (!loading && !campaign)) {
    return (
      <div style={{
        minHeight: "100vh",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        gap: 24, padding: 40,
        background: "#0a0806",
      }}>
        <div style={{
          fontFamily: "var(--font-title)",
          fontSize: "clamp(2rem, 5vw, 4rem)",
          color: "var(--gold)",
          textShadow: "0 0 40px rgba(212,175,55,0.5)",
          textAlign: "center",
        }}>
          digital D&D
        </div>
        <div style={{ textAlign: "center", color: "var(--parchment-dark)", fontStyle: "italic", fontSize: "1rem" }}>
          Schermata TV — Inserisci il codice campagna
        </div>
        <div style={{ display: "flex", gap: 10, maxWidth: 400, width: "100%" }}>
          <input
            type="text"
            placeholder="Codice campagna..."
            value={inputCode}
            onChange={e => setInputCode(e.target.value.toUpperCase())}
            style={{ flex: 1, fontSize: "1.2rem", textAlign: "center", letterSpacing: "0.2em" }}
            onKeyDown={e => { if (e.key === "Enter" && inputCode) { setJoinCode(inputCode); loadCampaign(inputCode); } }}
          />
          <button
            className="btn btn-gold"
            onClick={() => { if (inputCode) { setJoinCode(inputCode); loadCampaign(inputCode); } }}
            style={{ padding: "10px 20px" }}
          >
            Connetti
          </button>
        </div>
        {!loading && joinCode && !campaign && (
          <div style={{ color: "var(--crimson-light)", fontSize: "0.9rem" }}>Codice non trovato.</div>
        )}
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0a0806" }}>
        <motion.div
          style={{ color: "var(--gold)", fontFamily: "var(--font-heading)", fontSize: "1.5rem" }}
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          Connessione al mondo...
        </motion.div>
      </div>
    );
  }

  const initiative = combatState?.initiative || [];
  const currentTurn = combatState?.currentTurn || 0;
  const isCombat = combatState?.active;
  const monsters = combatState?.monsters || [];

  return (
    <div style={{
      width: "100vw", height: "100vh",
      background: "#0a0806",
      display: "flex",
      overflow: "hidden",
      position: "relative",
    }}>
      {/* Font Cinzel per design migliorato */}
      <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700;900&family=Cinzel+Decorative:wght@400;700;900&family=Cormorant+Garamond:ital,wght@0,400;0,600;1,400&display=swap" rel="stylesheet" />

      {/* Background dinamico */}
      <div className={`bg-image ${isCombat ? "bg-combat" : "bg-lobby"}`} />
      <MusicPlayer track={isCombat ? "combat" : "lobby"} />

      {/* ═══ MAP AREA A TUTTO SCHERMO ═══ */}
      <div style={{ flex: 1, height: "100%", position: "relative", overflow: "hidden" }}>

        {/* MAPPA DI BATTAGLIA */}
        {!diceRoll && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: "absolute",
              inset: 0,
            }}
          >
            <div style={{ position: "relative", width: "100%", height: "100%" }}>

              {/* ═══ EXPLORATION MODE HEADER ═══ */}
              {explorationMode && !isCombat && (
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  style={{
                    position: "absolute",
                    top: 24,
                    left: "50%",
                    transform: "translateX(-50%)",
                    zIndex: 100,
                    textAlign: "center",
                  }}
                >
                  <div style={{
                    background: "linear-gradient(135deg, rgba(20,25,35,0.92) 0%, rgba(30,40,55,0.88) 100%)",
                    backdropFilter: "blur(12px)",
                    border: "1px solid rgba(212,175,55,0.3)",
                    borderRadius: 16,
                    padding: "12px 32px",
                    boxShadow: `
                      0 8px 32px rgba(0,0,0,0.5),
                      0 0 20px rgba(212,175,55,0.15),
                      inset 0 1px 0 rgba(255,255,255,0.1)
                    `,
                  }}>
                    <div style={{
                      fontFamily: "'Cinzel', serif",
                      fontSize: "1.1rem",
                      fontWeight: 700,
                      color: "var(--gold)",
                      letterSpacing: "0.2em",
                      textTransform: "uppercase",
                      marginBottom: 4,
                      textShadow: "0 2px 8px rgba(212,175,55,0.4)",
                    }}>
                      ⚔️ Esplorazione ⚔️
                    </div>
                    <div style={{
                      fontFamily: "'Cormorant Garamond', serif",
                      fontSize: "0.95rem",
                      color: "rgba(140,180,240,0.85)",
                      fontStyle: "italic",
                    }}>
                      Turno di <strong style={{ color: "rgba(160,200,255,0.95)", fontWeight: 600 }}>{characters[explorationTurnIndex]?.name || "—"}</strong>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* IMMAGINE MAPPA (quando caricata) */}
              {mapUrl && (
                <img
                  src={mapUrl}
                  alt="Mappa di battaglia"
                  style={{
                    position: "absolute",
                    inset: 0,
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    imageRendering: "crisp-edges",
                  }}
                />
              )}

              {/* BATTLE GRID OVERLAY */}
              {mapUrl && battleGrid.gridVisible && (
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    pointerEvents: "none",
                    zIndex: 5,
                    backgroundImage: `
                      linear-gradient(rgba(201,168,76,${battleGrid.gridOpacity}) 1px, transparent 1px),
                      linear-gradient(90deg, rgba(201,168,76,${battleGrid.gridOpacity}) 1px, transparent 1px)
                    `,
                    backgroundSize: `${battleGrid.cellSize}px ${battleGrid.cellSize}px`,
                    transition: "opacity 0.3s",
                  }}
                />
              )}

              {/* BACKGROUND PROCEDURALE (quando NON c'è mappa) */}
              {!mapUrl && (
                <div style={{
                  position: "absolute", inset: 0,
                  background: `
                    radial-gradient(ellipse at 25% 40%, #2d4a1e 0%, transparent 45%),
                    radial-gradient(ellipse at 75% 50%, #1e3a15 0%, transparent 45%),
                    radial-gradient(ellipse at 50% 50%, #1a2e12 0%, #0a0f06 100%)
                  `,
                }}>
                  {/* Texture noise */}
                  <div style={{
                    position: "absolute", inset: 0, opacity: 0.12,
                    backgroundImage: `url("data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400"><filter id="t"><feTurbulence baseFrequency="0.025" numOctaves="5" seed="3"/><feColorMatrix values="0 0 0 0 0.15 0 0 0 0 0.3 0 0 0 0 0.08 0 0 0 1 0"/></filter><rect width="400" height="400" filter="url(#t)"/></svg>')}")`,
                  }} />
                </div>
              )}

              {/* Battle line divider (sempre visibile) */}
              <div style={{
                position: "absolute", top: "20%", bottom: "20%",
                left: "48%", width: 1,
                background: "linear-gradient(to bottom, transparent, rgba(255,100,100,0.08), transparent)",
                zIndex: 3,
              }} />

              {/* Particelle atmosferiche (da Opus) */}
              <Particles />

              {/* BATTLE TOKENS (dalla BattleGrid) */}
              {battleTokens.map(token => (
                <motion.div
                  key={token.id}
                  style={{
                    position: "absolute",
                    left: token.x,
                    top: token.y,
                    width: battleGrid.cellSize,
                    height: battleGrid.cellSize,
                    borderRadius: "50%",
                    border: `3px solid ${token.color}`,
                    background: token.imgUrl
                      ? `url(${token.imgUrl})`
                      : token.type === 'hero'
                        ? "linear-gradient(135deg, rgba(201,168,76,0.5), rgba(201,168,76,0.3))"
                        : "linear-gradient(135deg, rgba(220,20,60,0.5), rgba(220,20,60,0.3))",
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    boxShadow: "0 4px 16px rgba(0,0,0,0.7)",
                    zIndex: 25,
                    overflow: "hidden",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                  }}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1, left: token.x, top: token.y }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={{
                    scale: { type: "spring", stiffness: 200, damping: 20 },
                    opacity: { duration: 0.3 },
                    left: { type: "spring", stiffness: 100, damping: 20 },
                    top: { type: "spring", stiffness: 100, damping: 20 }
                  }}
                >
                  {/* Token Label */}
                  <div style={{
                    position: "absolute",
                    top: -20,
                    left: "50%",
                    transform: "translateX(-50%)",
                    fontSize: battleGrid.cellSize * 0.25,
                    fontFamily: "var(--font-heading)",
                    color: "#C9A84C",
                    whiteSpace: "nowrap",
                    textShadow: "0 2px 6px #000",
                    pointerEvents: "none",
                    fontWeight: 700
                  }}>
                    {token.name}
                  </div>

                  {/* HP Bar */}
                  <div style={{
                    position: "absolute",
                    bottom: 3,
                    left: 4,
                    right: 4,
                    height: 5,
                    background: "rgba(0,0,0,0.7)",
                    borderRadius: 3,
                    overflow: "hidden"
                  }}>
                    <div style={{
                      height: "100%",
                      width: `${(token.hp / token.maxHp) * 100}%`,
                      background: token.hp > token.maxHp * 0.5
                        ? "linear-gradient(90deg, #22C55E, #16A34A)"
                        : token.hp > token.maxHp * 0.25
                          ? "linear-gradient(90deg, #EAB308, #CA8A04)"
                          : "linear-gradient(90deg, #EF4444, #DC2626)",
                      transition: "width 0.3s",
                      boxShadow: "0 0 8px currentColor"
                    }} />
                  </div>

                  {/* Token Icon (if no image) */}
                  {!token.imgUrl && (
                    <div style={{
                      fontSize: battleGrid.cellSize * 0.5,
                      filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.5))"
                    }}>
                      {token.type === 'hero' ? '⚔️' : token.type === 'npc' ? '👤' : '☠️'}
                    </div>
                  )}
                </motion.div>
              ))}

              {/* Initiative Carousel in alto - RIMOSSO: ora usiamo quello nuovo più in basso */}

              {/* Token Personaggi sulla mappa (con nuovo design Opus) */}
              {characters.map((char, idx) => {
                const x = char.map_x || 50;
                const y = char.map_y || 50;
                const isActivePlayer = initiative[currentTurn]?.id === char.id;

                return (
                  <motion.div
                    key={char.id}
                    style={{
                      position: "absolute",
                      left: `${x}%`,
                      top: `${y}%`,
                      transform: "translate(-50%, -50%)",
                      zIndex: 20,
                    }}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{
                      scale: 1,
                      opacity: 1,
                      left: `${x}%`,
                      top: `${y}%`,
                    }}
                    transition={{
                      scale: { delay: 0.3 + idx * 0.1, type: "spring" },
                      opacity: { delay: 0.3 + idx * 0.1 },
                      left: { type: "spring", stiffness: 100, damping: 20 },
                      top: { type: "spring", stiffness: 100, damping: 20 },
                    }}
                  >
                    <PlayerToken character={char} size={60} isActive={isActivePlayer} />
                  </motion.div>
                );
              })}

              {/* Token Mostri sulla mappa (con nuovo design Opus) */}
              {monsters.map((monster, idx) => {
                const x = monster.map_x || (30 + (idx * 15) % 40);
                const y = monster.map_y || (30 + (idx * 10) % 40);
                const isActiveMonster = initiative[currentTurn]?.id === monster.id;
                const isDead = monster.hp_current <= 0;

                return (
                  <motion.div
                    key={monster.id}
                    style={{
                      position: "absolute",
                      left: `${x}%`,
                      top: `${y}%`,
                      transform: "translate(-50%, -50%)",
                      zIndex: 20,
                    }}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={isDead ? {
                      scale: 0,
                      opacity: 0,
                      rotate: 360,
                    } : {
                      scale: 1,
                      opacity: 1,
                      left: `${x}%`,
                      top: `${y}%`,
                    }}
                    exit={{
                      scale: 0,
                      opacity: 0,
                      rotate: 360,
                    }}
                    transition={isDead ? {
                      duration: 0.8,
                      ease: "easeInOut"
                    } : {
                      scale: { delay: 0.3 + idx * 0.1, type: "spring" },
                      opacity: { delay: 0.3 + idx * 0.1 },
                      left: { type: "spring", stiffness: 100, damping: 20 },
                      top: { type: "spring", stiffness: 100, damping: 20 },
                    }}
                  >
                    <MonsterToken monster={monster} size={55} isActive={isActiveMonster} />
                  </motion.div>
                );
              })}

              {/* POI sulla mappa */}
              {pois.map((poi, idx) => {
                const POI_ICONS = {
                  npc: "👤", chest: "📦", door: "🚪", trap: "⚠️",
                  secret: "🔍", lore: "📜", hazard: "☠️",
                };
                const POI_COLORS = {
                  npc: "#60c0f0", chest: "#d4af37", door: "#8b7355", trap: "#c04040",
                  secret: "#9b59b6", lore: "#e67e22", hazard: "#e74c3c",
                };

                return (
                  <motion.div
                    key={poi.id}
                    style={{
                      position: "absolute",
                      left: `${poi.x}%`,
                      top: `${poi.y}%`,
                      transform: "translate(-50%, -50%)",
                      zIndex: 15,
                    }}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.5 + idx * 0.1, type: "spring" }}
                    whileHover={{ scale: 1.2, zIndex: 25 }}
                  >
                    <div style={{
                      width: "clamp(35px, 3.5vw, 60px)",
                      height: "clamp(35px, 3.5vw, 60px)",
                      borderRadius: "50%",
                      background: `radial-gradient(circle at 35% 35%, ${POI_COLORS[poi.type]}, ${POI_COLORS[poi.type]}cc)`,
                      border: `3px solid ${POI_COLORS[poi.type]}`,
                      boxShadow: `0 0 20px ${POI_COLORS[poi.type]}80, 0 4px 10px rgba(0,0,0,0.5)`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: "clamp(1rem, 2vw, 1.5rem)",
                      cursor: "pointer",
                    }}>
                      {POI_ICONS[poi.type] || "❓"}
                    </div>

                    <div style={{
                      position: "absolute",
                      top: "calc(100% + 4px)",
                      left: "50%",
                      transform: "translateX(-50%)",
                      whiteSpace: "nowrap",
                      fontFamily: "var(--font-heading)",
                      fontSize: "clamp(0.65rem, 1.1vw, 0.9rem)",
                      color: "#fff",
                      textShadow: `0 0 12px ${POI_COLORS[poi.type]}, 0 0 6px ${POI_COLORS[poi.type]}, 0 2px 6px #000`,
                      fontWeight: "700",
                      pointerEvents: "none",
                      background: `linear-gradient(to bottom, rgba(0,0,0,0.7), rgba(0,0,0,0.9))`,
                      padding: "2px 8px",
                      borderRadius: "4px",
                      border: `1px solid ${POI_COLORS[poi.type]}80`,
                      letterSpacing: "0.05em",
                    }}>
                      {poi.name}
                    </div>
                  </motion.div>
                );
              })}

              {/* Turn banner - MODERNO */}
              {isCombat && initiative.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{
                    position: "absolute",
                    bottom: 24,
                    left: "50%",
                    transform: "translateX(-50%)",
                    zIndex: 20,
                    display: "flex",
                    alignItems: "center",
                    gap: 16,
                    padding: "16px 48px",
                    background: initiative[currentTurn]?.type === "monster"
                      ? "linear-gradient(135deg, rgba(26,10,10,0.95), rgba(40,15,15,0.95))"
                      : "linear-gradient(135deg, rgba(15,10,8,0.95), rgba(25,20,15,0.95))",
                    border: `3px solid ${initiative[currentTurn]?.type === "monster" ? "var(--crimson-light)" : "var(--gold)"}`,
                    borderRadius: 16,
                    boxShadow: `0 8px 32px rgba(0,0,0,0.6), 0 0 40px ${initiative[currentTurn]?.type === "monster" ? "rgba(192,64,64,0.4)" : "rgba(212,175,55,0.4)"}`,
                    backdropFilter: "blur(8px)",
                  }}
                >
                  {/* Decorazione angoli */}
                  <div style={{
                    position: "absolute",
                    top: 8, left: 8, right: 8, bottom: 8,
                    border: `1px solid ${initiative[currentTurn]?.type === "monster" ? "rgba(192,64,64,0.3)" : "rgba(212,175,55,0.2)"}`,
                    borderRadius: 12,
                    pointerEvents: "none",
                  }} />

                  <motion.span
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    style={{
                      fontFamily: "'Cinzel', serif",
                      fontSize: "1.2rem",
                      fontWeight: 900,
                      letterSpacing: "0.15em",
                      color: initiative[currentTurn]?.type === "monster" ? "var(--crimson-light)" : "var(--gold)",
                      textShadow: `0 0 20px ${initiative[currentTurn]?.type === "monster" ? "var(--crimson-light)" : "var(--gold)"}80, 0 2px 8px rgba(0,0,0,0.8)`,
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      position: "relative",
                      zIndex: 1,
                    }}
                  >
                    <span style={{ fontSize: "1.5rem" }}>
                      {initiative[currentTurn]?.type === "monster" ? "☠" : "⚔"}
                    </span>
                    TURNO DI {initiative[currentTurn]?.name?.toUpperCase()}
                  </motion.span>
                </motion.div>
              )}

              {/* ═══ SIDEBAR SINISTRA IN OVERLAY (sempre visibile) ═══ */}
              <div style={{
                position: "absolute",
                left: 0,
                top: 0,
                bottom: 0,
                width: "clamp(250px, 20vw, 300px)",
                display: "flex",
                flexDirection: "column",
                zIndex: 50,
                background: "linear-gradient(180deg, rgba(12,10,6,0.85), rgba(8,6,4,0.9))",
                backdropFilter: "blur(10px)",
                borderRight: "1px solid rgba(212,175,55,0.15)",
                boxShadow: "5px 0 20px rgba(0,0,0,0.5)",
              }}>
                {/* Glow decorativo sul bordo */}
                <div style={{
                  position: "absolute", right: -1, top: 0, bottom: 0, width: 1,
                  boxShadow: "0 0 20px rgba(212,175,55,0.06)",
                }} />

                {/* Campaign header */}
                <div style={{ padding: "16px 14px 12px", textAlign: "center" }}>
                  <div style={{
                    fontFamily: "'Cinzel Decorative', serif", fontSize: "0.65rem",
                    color: "#d4af37", letterSpacing: "0.18em",
                    textShadow: "0 0 20px rgba(212,175,55,0.25)", lineHeight: 1.4,
                  }}>{campaign?.name || "CAMPAGNA"}</div>
                  <div style={{
                    marginTop: 4, fontSize: "0.55rem", color: "rgba(212,175,55,0.8)",
                    fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic", letterSpacing: "0.1em",
                  }}>{campaign?.world || "Mondo Fantasy"} · DM: {campaign?.dm_name || "Dungeon Master"}</div>
                </div>

                {/* Divider */}
                <div style={{ padding: "0 20px", margin: "2px 0 8px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ flex: 1, height: 1, background: "linear-gradient(90deg, transparent, rgba(212,175,55,0.12))" }} />
                    <span style={{ fontSize: "0.75rem", color: "rgba(212,175,55,0.5)", letterSpacing: "0.2em", fontFamily: "'Cinzel', serif", fontWeight: 600 }}>
                      {explorationMode && !isCombat ? "ESPLORAZIONE" : "IL GRUPPO"}
                    </span>
                    <div style={{ flex: 1, height: 1, background: "linear-gradient(90deg, rgba(212,175,55,0.12), transparent)" }} />
                  </div>
                  {explorationMode && !isCombat && (
                    <div style={{
                      textAlign: "center",
                      marginTop: 6,
                      fontSize: "0.7rem",
                      color: "rgba(120,160,220,0.75)",
                      fontFamily: "'Cormorant Garamond', serif",
                      fontStyle: "italic",
                      fontWeight: 500
                    }}>
                      Turno: <strong style={{ color: "rgba(140,180,240,0.95)" }}>{characters[explorationTurnIndex]?.name || "—"}</strong>
                    </div>
                  )}
                </div>

                {/* Player cards */}
                <div style={{
                  flex: 1, padding: "0 8px", display: "flex", flexDirection: "column",
                  gap: 6, overflowY: "auto",
                }}>
                  {characters.map((char, idx) => {
                    // Attivo se: in combattimento E il suo turno, OPPURE in exploration mode E il suo turno
                    const isActive = (isCombat && initiative[currentTurn]?.id === char.id) ||
                                     (explorationMode && !isCombat && idx === explorationTurnIndex);
                    return (
                      <CharacterHPCard
                        key={char.id}
                        character={char}
                        isActive={isActive}
                      />
                    );
                  })}
                </div>

                {/* Footer */}
                <div style={{
                  padding: "10px", borderTop: "1px solid rgba(212,175,55,0.04)", textAlign: "center",
                }}>
                  <div style={{
                    fontFamily: "'Cinzel Decorative', serif", fontSize: "0.4rem",
                    color: "rgba(212,175,55,0.12)", letterSpacing: "0.2em",
                  }}>✦ DIGITAL D&D ✦</div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Schermata in attesa */}
        {!isCombat && !narrativeMsg && !mapUrl && (
          <motion.div
            style={{ textAlign: "center" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <motion.div
              style={{
                width: "clamp(150px, 20vw, 220px)",
                height: "clamp(150px, 20vw, 220px)",
                margin: "0 auto 24px",
                color: "var(--gold)",
                filter: "drop-shadow(0 0 30px rgba(212,175,55,0.4))",
              }}
              animate={{ rotate: [0, 5, -5, 0], scale: [1, 1.02, 1] }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            >
              <svg viewBox="0 0 100 100" fill="none">
                <polygon points="50,5 94,30 94,70 50,95 6,70 6,30" stroke="currentColor" strokeWidth="3" fill="rgba(212,175,55,0.08)" />
                <polygon points="50,12 87,33 87,67 50,88 13,67 13,33" stroke="currentColor" strokeWidth="1" strokeOpacity="0.2" fill="none" />
                <text x="50" y="58" textAnchor="middle" fill="currentColor" fontSize="28" fontWeight="900" fontFamily="serif">20</text>
              </svg>
            </motion.div>

            <div style={{
              fontFamily: "var(--font-title)",
              fontSize: "clamp(2rem, 5vw, 4rem)",
              color: "var(--gold)",
              textShadow: "0 0 40px rgba(212,175,55,0.4)",
              letterSpacing: "0.05em",
            }}>
              digital D&D
            </div>
            <div style={{ color: "var(--parchment-dark)", fontSize: "clamp(0.9rem, 1.5vw, 1.2rem)", marginTop: 8, fontStyle: "italic" }}>
              {campaign?.name} · In attesa dell'inizio...
            </div>

            {characters.length > 0 && (
              <div style={{ marginTop: 40, display: "flex", gap: 20, flexWrap: "wrap", justifyContent: "center" }}>
                {characters.map(c => (
                  <motion.div
                    key={c.id}
                    style={{ textAlign: "center" }}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    <div style={{
                      width: "clamp(60px, 8vw, 90px)",
                      height: "clamp(60px, 8vw, 90px)",
                      borderRadius: "50%",
                      background: c.avatar_url ? "#000" : `radial-gradient(circle at 35% 35%, ${c.token_color}40, rgba(0,0,0,0.8))`,
                      border: `3px solid ${c.token_color}`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      margin: "0 auto 8px",
                      fontSize: "2rem",
                      boxShadow: `0 0 20px ${c.token_color}40`,
                      overflow: "hidden",
                    }}>
                      {c.avatar_url ? (
                        <img
                          src={c.avatar_url}
                          alt={c.name}
                          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                          onError={(e) => {
                            e.target.style.display = "none";
                            e.target.parentElement.style.background = `radial-gradient(circle at 35% 35%, ${c.token_color}40, rgba(0,0,0,0.8))`;
                            e.target.parentElement.innerHTML += `<span style="font-size: 2rem">${CLASS_ICONS[c.class] || "⚔️"}</span>`;
                          }}
                        />
                      ) : (
                        CLASS_ICONS[c.class] || "⚔️"
                      )}
                    </div>
                    <div style={{ fontFamily: "var(--font-heading)", color: c.token_color, fontSize: "clamp(0.75rem, 1.2vw, 0.9rem)" }}>
                      {c.name}
                    </div>
                    <div style={{ fontSize: "0.65rem", color: "rgba(212,175,55,0.5)" }}>
                      Lv.{c.level} {c.class}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* NUOVO SISTEMA COMBATTIMENTO CINEMATICO (D&D Beyond style) */}
        {/* ═══════════════════════════════════════════════════════════ */}

        {/* Initiative Carousel - Striscia orizzontale in alto */}
        {isCombat && (
          <motion.div
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            transition={{ type: "spring", damping: 20 }}
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              zIndex: 100,
              background: "transparent", // 🔓 Completamente trasparente - solo icone visibili
              padding: "6px 16px 0px",
            }}
          >
            {/* Round counter */}
            <div style={{
              textAlign: "center",
              fontFamily: "var(--font-heading)",
              fontSize: "0.7rem",
              color: "var(--crimson-light)",
              letterSpacing: "0.2em",
              marginBottom: 10,
              textShadow: "0 0 20px rgba(192,64,64,0.8)",
            }}>
              ⚔️ ROUND {Math.floor(currentTurn / initiative.length) + 1} ⚔️
            </div>

            {/* Initiative Carousel */}
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 12,
              overflowX: "auto",
              padding: "20px 0 12px", // Più spazio sopra per distanziare dalla scritta ROUND
              scrollbarWidth: "none",
            }}>
              {initiative.map((entry, i) => {
                const isActive = i === currentTurn;
                const isPast = i < currentTurn;
                const isPlayer = entry.type === "player";
                const accentColor = isPlayer ? "var(--gold)" : "var(--crimson-light)";

                // Trova il personaggio/mostro corrispondente per mostrare avatar
                const character = isPlayer
                  ? characters.find(c => c.id === entry.id)
                  : monsters.find(m => m.id === entry.id);

                return (
                  <motion.div
                    key={`carousel-${entry.id}-${i}`}
                    animate={{
                      scale: 1, // Nessun ingrandimento - effetto solo sull'anello
                      opacity: isPast ? 0.4 : isActive ? 1 : 0.7,
                      y: 0, // Nessuno spostamento verticale - rimangono allineate
                    }}
                    transition={{ type: "spring", damping: 15 }}
                    style={{
                      position: "relative",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 3,
                      flexShrink: 0,
                    }}
                  >
                    {/* Token/Avatar - Contenitore esterno per badge */}
                    <div style={{
                      position: "relative",
                      width: isActive ? 52 : 44, // Dimensione equilibrata
                      height: isActive ? 52 : 44,
                    }}>
                      {/* Token interno con overflow hidden */}
                      <div style={{
                        width: "100%",
                        height: "100%",
                        borderRadius: "50%",
                        background: character?.avatar_url
                          ? "#000"
                          : isActive
                          ? `radial-gradient(circle, ${accentColor}40, rgba(10,8,6,0.9))`
                          : `radial-gradient(circle, ${accentColor}20, rgba(10,8,6,0.8))`,
                        border: isActive
                          ? `3px solid ${accentColor}`
                          : `2px solid ${accentColor}60`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontFamily: "var(--font-heading)",
                        fontSize: isActive ? "1.3rem" : "1.1rem",
                        color: accentColor,
                        fontWeight: "900",
                        boxShadow: isActive
                          ? `0 4px 12px rgba(0,0,0,0.5), 0 0 20px ${accentColor}40` // Shadow più pulita senza doppio glow
                          : `0 2px 8px rgba(0,0,0,0.3)`,
                        transition: "all 0.3s",
                        overflow: "hidden",
                      }}>
                        {character?.avatar_url ? (
                          <img
                            src={character.avatar_url}
                            alt={entry.name}
                            style={{
                              width: "100%",
                              height: "100%",
                              objectFit: "cover",
                              display: "block",
                            }}
                            onError={(e) => {
                              e.target.style.display = "none";
                              e.target.parentElement.style.background = isActive
                                ? `radial-gradient(circle, ${accentColor}40, rgba(10,8,6,0.9))`
                                : `radial-gradient(circle, ${accentColor}20, rgba(10,8,6,0.8))`;
                              const icon = isPlayer ? (CLASS_ICONS[character?.class] || entry.name[0]) : "👹";
                              e.target.parentElement.innerHTML = `<span style="font-family: var(--font-heading); font-size: ${isActive ? "1.3rem" : "1.1rem"}; color: ${accentColor}; font-weight: 900">${icon}</span>`;
                            }}
                          />
                        ) : (
                          isPlayer ? (CLASS_ICONS[character?.class] || entry.name[0]) : "👹"
                        )}
                      </div>

                      {/* Badge iniziativa - fuori dal contenitore overflow */}
                      <div style={{
                        position: "absolute",
                        bottom: -6,
                        right: -6,
                        width: 26,
                        height: 26,
                        borderRadius: "50%",
                        background: accentColor,
                        color: "rgba(10,8,6,0.95)",
                        fontSize: "0.75rem",
                        fontWeight: "900",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        border: "2px solid rgba(10,8,6,0.95)",
                        boxShadow: `0 0 12px ${accentColor}`,
                      }}>
                        {entry.roll}
                      </div>

                      {/* Anello pulsante FORTE per turno attivo */}
                      {isActive && (
                        <motion.div
                          animate={{
                            scale: [1, 1.4, 1], // Pulsazione MOLTO evidente
                            opacity: [0.7, 1, 0.7], // Opacità marcata
                          }}
                          transition={{
                            duration: 1.5, // Più veloce
                            repeat: Infinity,
                            ease: "easeInOut",
                          }}
                          style={{
                            position: "absolute",
                            inset: -8, // Più grande
                            borderRadius: "50%",
                            border: `2px solid ${accentColor}`, // Bordino più spesso e opaco
                            pointerEvents: "none",
                          }}
                        />
                      )}
                    </div>

                    {/* Nome */}
                    <div style={{
                      fontFamily: "var(--font-heading)",
                      fontSize: isActive ? "0.75rem" : "0.65rem",
                      color: isActive ? "var(--parchment)" : "var(--parchment-dark)",
                      fontWeight: isActive ? "700" : "400",
                      textAlign: "center",
                      maxWidth: 70,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      textShadow: "none", // Rimosso glow per evitare effetti doppi
                    }}>
                      {entry.name}
                    </div>

                    {/* Badge "TURNO" */}
                    {isActive && (
                      <motion.div
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        style={{
                          background: accentColor,
                          color: "rgba(10,8,6,0.95)",
                          padding: "1px 8px",
                          borderRadius: 8,
                          fontSize: "0.55rem",
                          fontFamily: "var(--font-heading)",
                          fontWeight: "900",
                          letterSpacing: "0.1em",
                          boxShadow: `0 2px 8px rgba(0,0,0,0.4)`, // Shadow pulita senza glow eccessivo
                        }}
                      >
                        ► TURNO
                      </motion.div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Banner TURNO DI - Appare quando cambia turno */}
        <AnimatePresence>
          {isCombat && initiative[currentTurn] && (
            <TurnBanner
              key={`turn-${currentTurn}`}
              character={initiative[currentTurn]}
            />
          )}
        </AnimatePresence>

        {/* ══════════════════════════════════════════════════ */}
        {/* VECCHIO SISTEMA COMBATTIMENTO (commentato/backup)  */}
        {/* ══════════════════════════════════════════════════ */}
        {/* Combattimento attivo */}
        {false && isCombat && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: "20px 30px",
              gap: 16,
              background: "rgba(10, 8, 6, 0.75)",
              backdropFilter: "blur(8px)",
              zIndex: 40,
            }}
          >
            <div style={{ fontFamily: "var(--font-heading)", fontSize: "clamp(1rem, 2vw, 1.5rem)", color: "var(--crimson-light)", letterSpacing: "0.3em", textAlign: "center" }}>
              ⚔️ COMBATTIMENTO ⚔️
            </div>

            {initiative[currentTurn] && (
              <motion.div
                key={currentTurn}
                style={{
                  textAlign: "center",
                  padding: "24px 32px",
                  background: "rgba(212,175,55,0.06)",
                  borderRadius: 16,
                  border: "2px solid rgba(212,175,55,0.4)",
                  boxShadow: "0 0 40px rgba(212,175,55,0.2)",
                }}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: "spring" }}
              >
                <div style={{ fontFamily: "var(--font-heading)", fontSize: "clamp(0.9rem, 1.8vw, 1.3rem)", color: "rgba(212,175,55,0.7)", letterSpacing: "0.25em", marginBottom: 12 }}>
                  TURNO DI
                </div>
                <div style={{
                  fontFamily: "var(--font-heading)",
                  fontSize: "clamp(2.5rem, 6vw, 5rem)",
                  color: initiative[currentTurn].type === "player" ? "var(--gold)" : "var(--crimson-light)",
                  textShadow: `0 0 30px ${initiative[currentTurn].type === "player" ? "rgba(212,175,55,0.6)" : "rgba(192,64,64,0.6)"}`,
                  fontWeight: "900",
                }}>
                  {initiative[currentTurn].name}
                </div>
              </motion.div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 8, overflowY: "auto", maxHeight: "50vh", width: "100%", maxWidth: "800px" }}>
              {initiative.map((entry, i) => (
                <motion.div
                  key={`${entry.id}-${i}`}
                  style={{
                    display: "flex", alignItems: "center", gap: 16,
                    padding: "16px 24px",
                    background: i === currentTurn ? "rgba(212,175,55,0.15)" : "rgba(0,0,0,0.4)",
                    borderLeft: `6px solid ${i === currentTurn ? "var(--gold)" : entry.type === "player" ? "rgba(212,175,55,0.4)" : "rgba(192,64,64,0.4)"}`,
                    borderRadius: "0 12px 12px 0",
                    opacity: i < currentTurn ? 0.6 : 1,
                    boxShadow: i === currentTurn ? "0 0 25px rgba(212,175,55,0.3)" : "none",
                    transition: "all 0.3s",
                  }}
                  animate={i === currentTurn ? { x: [0, 8, 0] } : {}}
                  transition={{ duration: 0.4 }}
                >
                  <div style={{
                    width: "clamp(48px, 4vw, 60px)",
                    height: "clamp(48px, 4vw, 60px)",
                    borderRadius: "50%",
                    background: entry.type === "player" ? "rgba(212,175,55,0.2)" : "rgba(192,64,64,0.2)",
                    border: `3px solid ${entry.type === "player" ? "var(--gold)" : "var(--crimson-light)"}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontFamily: "var(--font-heading)", fontSize: "clamp(1.2rem, 2vw, 1.8rem)",
                    color: entry.type === "player" ? "var(--gold)" : "var(--crimson-light)",
                    flexShrink: 0,
                    fontWeight: "900",
                  }}>
                    {entry.roll || entry.init}
                  </div>
                  <span style={{
                    fontFamily: "var(--font-heading)",
                    fontSize: "clamp(1.3rem, 2.5vw, 2rem)",
                    color: i === currentTurn ? "var(--parchment)" : "var(--parchment-dark)",
                    flex: 1,
                    fontWeight: i === currentTurn ? "700" : "400",
                  }}>
                    {entry.name}
                    {i === currentTurn && <span style={{ marginLeft: 12, color: "var(--gold)", fontSize: "0.9em" }}>◀ in azione</span>}
                  </span>
                  {entry.type === "player" && (
                    <span style={{ fontSize: "clamp(0.9rem, 1.5vw, 1.2rem)", color: "rgba(212,175,55,0.5)" }}>Giocatore</span>
                  )}
                  {entry.type === "monster" && (
                    <span style={{ fontSize: "clamp(0.9rem, 1.5vw, 1.2rem)", color: "rgba(192,64,64,0.7)" }}>Nemico</span>
                  )}
                </motion.div>
              ))}
            </div>

            {monsters.filter(m => m.hp_current > 0).length > 0 && (
              <div style={{ display: "flex", gap: 16, flexWrap: "wrap", justifyContent: "center", width: "100%", maxWidth: "800px" }}>
                {monsters.filter(m => m.hp_current > 0).map(m => {
                  const pct = (m.hp_current / m.hp_max) * 100;
                  return (
                    <div key={m.id} style={{
                      background: "rgba(139,26,26,0.3)",
                      border: "2px solid rgba(192,64,64,0.5)",
                      borderRadius: 12,
                      padding: "16px 20px",
                      minWidth: "clamp(150px, 20vw, 250px)",
                      flex: "1 1 auto",
                    }}>
                      <div style={{ fontFamily: "var(--font-heading)", color: "var(--crimson-light)", fontSize: "clamp(1.1rem, 2vw, 1.6rem)", marginBottom: 8 }}>{m.name}</div>
                      <div className="hp-bar-container" style={{ marginTop: 8, height: 10, borderRadius: 5 }}>
                        <div className="hp-bar-fill low" style={{ width: `${pct}%`, borderRadius: 5 }} />
                      </div>
                      <div style={{ fontSize: "clamp(0.9rem, 1.5vw, 1.2rem)", color: "rgba(212,175,55,0.6)", marginTop: 6, fontFamily: "var(--font-heading)" }}>
                        {m.hp_current}/{m.hp_max} HP
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}
      </div>

      {/* ── Dado 3D persistente — sempre montato, si mostra/nasconde ── */}
      <FinalDiceBox ref={diceRef} />

      {/* Overlays */}
      <AnimatePresence>
        {diceRoll && (
          <DiceRollDisplay
            key={diceRoll.timestamp || Math.random()}
            roll={diceRoll}
            onDone={() => {
              setDiceRoll(null);
              diceRef.current?.hide();
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {narrativeMsg && narrativeMsg.text && !diceRoll && (
          <NarrativeOverlay
            key={narrativeMsg.timestamp}
            text={narrativeMsg.text}
            title={narrativeMsg.title}
            dmName={narrativeMsg.dmName}
            image={narrativeMsg.imageUrl}
            marker={narrativeMsg.marker}
            onDone={() => setNarrativeMsg(null)}
          />
        )}
      </AnimatePresence>

      {/* ═══════════════════════════════════════════════ */}
      {/* INITIATIVE REQUEST BANNER */}
      {/* ═══════════════════════════════════════════════ */}
      <AnimatePresence>
        {showInitiativeRequest && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.5 }}
            style={{
              position: "fixed",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              zIndex: 200,
              pointerEvents: "none",
            }}
          >
            <motion.div
              animate={{
                scale: [1, 1.05, 1],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              style={{
                background: "linear-gradient(135deg, rgba(192,64,64,0.2), rgba(192,64,64,0.1))",
                backdropFilter: "blur(20px)",
                border: "4px solid var(--crimson-light)",
                borderRadius: 24,
                padding: "40px 80px",
                boxShadow: `
                  0 0 80px var(--crimson-light),
                  0 0 120px rgba(192,64,64,0.6),
                  inset 0 0 60px rgba(192,64,64,0.2)
                `,
                textAlign: "center",
              }}
            >
              <div style={{
                fontFamily: "var(--font-heading)",
                fontSize: "clamp(2.5rem, 6vw, 4.5rem)",
                fontWeight: "900",
                color: "var(--crimson-light)",
                textShadow: `
                  0 0 40px var(--crimson-light),
                  0 0 80px rgba(192,64,64,0.8),
                  0 4px 8px rgba(0,0,0,0.8)
                `,
                letterSpacing: "0.1em",
                marginBottom: 20,
              }}>
                ⚔️ ROLL FOR INITIATIVE! ⚔️
              </div>
              <div style={{
                fontFamily: "var(--font-heading)",
                fontSize: "clamp(1rem, 2vw, 1.5rem)",
                color: "var(--gold)",
                letterSpacing: "0.2em",
                textShadow: "0 0 20px rgba(212,175,55,0.6)",
              }}>
                Tutti i giocatori tirano d20 + DEX
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══════════════════════════════════════════════ */}
      {/* ATTACK PRE-ROLL BANNER - Narrazione Educativa */}
      {/* ═══════════════════════════════════════════════ */}
      <AnimatePresence>
        {attackBanner && (() => {
          const isMonster = attackBanner.isMonster;
          const color = isMonster ? "var(--crimson-light)" : "var(--gold)";
          const colorRgb = isMonster ? "192,64,64" : "212,175,55";

          return (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -50, scale: 0.9 }}
            transition={{ duration: 0.4, type: "spring", damping: 20 }}
            style={{
              position: "fixed",
              top: "20%",
              left: "50%",
              transform: "translateX(-50%)",
              zIndex: 250,
              pointerEvents: "none",
              width: "80%",
              maxWidth: "900px",
            }}
          >
            {/* Effetto PAZZO: Glow pulsante sfondo */}
            <motion.div
              animate={{
                opacity: [0.3, 0.8, 0.3],
                scale: [0.9, 1.3, 0.9],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              style={{
                position: "absolute",
                inset: -100,
                background: `radial-gradient(circle, rgba(${colorRgb},0.6), transparent 70%)`,
                filter: "blur(50px)",
                pointerEvents: "none",
              }}
            />

            <div style={{
              background: `linear-gradient(135deg, rgba(${colorRgb},0.25), rgba(${colorRgb},0.15))`,
              backdropFilter: "blur(30px)",
              border: `4px solid ${color}`,
              borderRadius: 20,
              padding: "32px 48px",
              boxShadow: `
                0 0 60px rgba(${colorRgb},0.6),
                0 0 100px rgba(${colorRgb},0.3),
                inset 0 0 40px rgba(${colorRgb},0.15)
              `,
              position: "relative",
            }}>
              {/* Nome personaggio/mostro */}
              <div style={{
                fontFamily: "var(--font-heading)",
                fontSize: "clamp(1.5rem, 4vw, 2.5rem)",
                fontWeight: "900",
                color,
                textShadow: `0 0 30px rgba(${colorRgb},0.8)`,
                letterSpacing: "0.08em",
                marginBottom: 16,
                textAlign: "center",
              }}>
                <DnDIcon icon={isMonster ? "skull" : "attack"} size={32} color={color} style={{ marginRight: 12, verticalAlign: "middle" }} />
                {attackBanner.characterName || attackBanner.monsterName} attacca!
              </div>

              {/* Arma o Attacco Mostro */}
              <div style={{
                fontFamily: "var(--font-heading)",
                fontSize: "clamp(1.2rem, 3vw, 1.8rem)",
                fontWeight: "700",
                color: "var(--parchment)",
                textAlign: "center",
                marginBottom: 24,
              }}>
                <DnDIcon icon="weapon" size={24} color={color} style={{ marginRight: 8, verticalAlign: "middle" }} />
                {isMonster ? "Attacco Naturale" : attackBanner.weaponName}
              </div>

              {/* Narrazione Educativa - IL CUORE! */}
              <div style={{
                background: "rgba(10,8,6,0.5)",
                border: `2px solid rgba(${colorRgb},0.4)`,
                borderRadius: 12,
                padding: "20px 28px",
                marginBottom: 20,
              }}>
                <div style={{
                  fontFamily: "var(--font-heading)",
                  fontSize: "clamp(0.9rem, 2vw, 1.3rem)",
                  color: `rgba(${colorRgb},0.9)`,
                  lineHeight: 1.6,
                  textAlign: "center",
                }}>
                  <div style={{ marginBottom: 12 }}>
                    <span style={{ color: "var(--parchment)", fontWeight: "bold" }}>Tiro per Colpire:</span>
                  </div>
                  <div style={{ fontSize: "clamp(1.1rem, 2.5vw, 1.6rem)", fontWeight: "900", color }}>
                    {isMonster ? (
                      <>1d20 {attackBanner.monsterAttackBonus >= 0 ? '+' : ''}{attackBanner.monsterAttackBonus}</>
                    ) : (
                      <>1d20 + {attackBanner.abilityUsed} ({attackBanner.abilityMod >= 0 ? '+' : ''}{attackBanner.abilityMod}) + Competenza (+{attackBanner.profBonus})</>
                    )}
                  </div>
                </div>
              </div>

              {/* Info danno (anteprima) */}
              <div style={{
                fontFamily: "var(--font-body)",
                fontSize: "clamp(0.75rem, 1.5vw, 1rem)",
                color: `rgba(${colorRgb},0.7)`,
                textAlign: "center",
                fontStyle: "italic",
              }}>
                {isMonster ? (
                  <>Se colpisce: {attackBanner.monsterDamage}</>
                ) : (
                  <>Se colpisce: {attackBanner.weaponDamage} + {attackBanner.damageBonus} danni da {attackBanner.weaponDamageType}</>
                )}
              </div>
            </div>

            {/* Countdown bar */}
            <motion.div
              initial={{ scaleX: 1 }}
              animate={{ scaleX: 0 }}
              transition={{ duration: 2.5, ease: "linear" }}
              style={{
                height: 4,
                background: color,
                borderRadius: 2,
                marginTop: 8,
                boxShadow: `0 0 15px ${color}`,
              }}
            />
          </motion.div>
          );
        })()}
      </AnimatePresence>

      {/* ═══════════════════════════════════════════════ */}
      {/* DAMAGE ROLL BANNER - Narrazione Educativa Danno */}
      {/* ═══════════════════════════════════════════════ */}
      <AnimatePresence>
        {damageBanner && (() => {
          const isMonster = damageBanner.isMonster;
          const color = isMonster ? "var(--crimson-light)" : "var(--crimson-light)";
          const colorRgb = isMonster ? "192,64,64" : "192,64,64";

          return (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.3, type: "spring", damping: 15 }}
              style={{
                position: "fixed",
                top: "25%",
                left: "50%",
                transform: "translateX(-50%)",
                zIndex: 250,
                pointerEvents: "none",
                width: "75%",
                maxWidth: "800px",
              }}
            >
              {/* Effetto PAZZO: Screen shake quando appare */}
              <motion.div
                animate={{
                  x: [0, -8, 8, -8, 8, -5, 5, 0],
                  y: [0, 8, -8, 8, -8, 5, -5, 0],
                }}
                transition={{
                  duration: 0.5,
                  ease: "easeInOut",
                }}
                style={{ width: "100%", height: "100%" }}
              >
                {/* Effetto PAZZO: Glow pulsante rosso sangue */}
                <motion.div
                  animate={{
                    opacity: [0.4, 1, 0.4],
                    scale: [0.85, 1.4, 0.85],
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                  style={{
                    position: "absolute",
                    inset: -120,
                    background: `radial-gradient(circle, rgba(${colorRgb},0.8), transparent 70%)`,
                    filter: "blur(60px)",
                    pointerEvents: "none",
                  }}
                />

                <div style={{
                  background: `linear-gradient(135deg, rgba(${colorRgb},0.35), rgba(${colorRgb},0.25))`,
                  backdropFilter: "blur(30px)",
                  border: `4px solid ${color}`,
                  borderRadius: 20,
                  padding: "28px 44px",
                  boxShadow: `
                    0 0 70px rgba(${colorRgb},0.7),
                    0 0 110px rgba(${colorRgb},0.4),
                    inset 0 0 45px rgba(${colorRgb},0.2)
                  `,
                  position: "relative",
                }}>
                  {/* Titolo */}
                  <div style={{
                    fontFamily: "var(--font-heading)",
                    fontSize: "clamp(1.3rem, 3.5vw, 2.2rem)",
                    fontWeight: "900",
                    color: color,
                    textShadow: `0 0 35px rgba(${colorRgb},0.9)`,
                    letterSpacing: "0.08em",
                    marginBottom: 14,
                    textAlign: "center",
                  }}>
                    <DnDIcon icon="damage" size={30} color={color} style={{ marginRight: 10, verticalAlign: "middle" }} />
                    {isMonster ? "💀 DANNO MOSTRO! 💀" : "DANNO!"}
                  </div>

                  {/* Nome e Arma */}
                  <div style={{
                    fontFamily: "var(--font-heading)",
                    fontSize: "clamp(1rem, 2.5vw, 1.5rem)",
                    fontWeight: "700",
                    color: "var(--parchment)",
                    textAlign: "center",
                    marginBottom: 20,
                  }}>
                    {isMonster ? (
                      <>{damageBanner.monsterName || damageBanner.characterName} - Attacco Naturale</>
                    ) : (
                      <>{damageBanner.characterName} - {damageBanner.weaponName}</>
                    )}
                  </div>

                  {/* Narrazione Educativa - IL CUORE! */}
                  <div style={{
                    background: "rgba(10,8,6,0.6)",
                    border: `2px solid rgba(${colorRgb},0.5)`,
                    borderRadius: 12,
                    padding: "18px 24px",
                  }}>
                    <div style={{
                      fontFamily: "var(--font-heading)",
                      fontSize: "clamp(0.85rem, 1.8vw, 1.2rem)",
                      color: `rgba(${colorRgb},0.95)`,
                      lineHeight: 1.6,
                      textAlign: "center",
                    }}>
                      <div style={{ marginBottom: 10 }}>
                        <span style={{ color: "var(--parchment)", fontWeight: "bold" }}>Tiro Danno:</span>
                      </div>
                      {isMonster ? (
                        <div style={{ fontSize: "clamp(1rem, 2.3vw, 1.5rem)", fontWeight: "900", color: color }}>
                          {damageBanner.monsterDamage}
                        </div>
                      ) : (
                        <>
                          <div style={{ fontSize: "clamp(1rem, 2.3vw, 1.5rem)", fontWeight: "900", color: color }}>
                            {damageBanner.weaponDamage} + Bonus (+{damageBanner.damageBonus})
                          </div>
                          <div style={{ fontSize: "clamp(0.75rem, 1.5vw, 1rem)", color: `rgba(${colorRgb},0.7)`, marginTop: 8, fontStyle: "italic" }}>
                            Tipo: {damageBanner.weaponDamageType.toUpperCase()}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Countdown bar */}
                <motion.div
                  initial={{ scaleX: 1 }}
                  animate={{ scaleX: 0 }}
                  transition={{ duration: 2, ease: "linear" }}
                  style={{
                    height: 4,
                    background: color,
                    borderRadius: 2,
                    marginTop: 8,
                    boxShadow: `0 0 15px ${color}`,
                  }}
                />
              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>

      {/* ═══════════════════════════════════════════════ */}
      {/* BANNER HIT/MISS - EFFETTI PAZZI!!! */}
      {/* ═══════════════════════════════════════════════ */}
      <AnimatePresence>
        {hitMissBanner && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5, rotate: -10 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            exit={{ opacity: 0, scale: 0.5, rotate: 10 }}
            transition={{ duration: 0.4, type: "spring", damping: 12 }}
            style={{
              position: "fixed",
              top: "55%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              zIndex: 90,
              pointerEvents: "none",
            }}
          >
            {/* EFFETTO PAZZO: Glow esplosivo */}
            <motion.div
              animate={{
                scale: hitMissBanner.hit ? [1, 1.8, 1.3] : [1, 1.4, 1.1],
                opacity: [0.8, 0.3, 0.6],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              style={{
                position: "absolute",
                inset: -150,
                background: hitMissBanner.hit
                  ? "radial-gradient(circle, rgba(64,255,64,0.9), transparent 60%)"
                  : "radial-gradient(circle, rgba(255,64,64,0.9), transparent 60%)",
                filter: "blur(80px)",
                pointerEvents: "none",
              }}
            />

            {/* Banner principale */}
            <motion.div
              animate={{
                y: hitMissBanner.hit ? [0, -10, 0] : [0, 10, 5, 0],
                rotate: hitMissBanner.hit ? [0, 2, -2, 0] : [0, -3, 3, -2, 2, 0],
              }}
              transition={{
                duration: 0.6,
                repeat: Infinity,
                repeatDelay: 0.5,
              }}
              style={{
                background: hitMissBanner.hit
                  ? "linear-gradient(135deg, rgba(64,255,64,0.4), rgba(32,200,32,0.3))"
                  : "linear-gradient(135deg, rgba(255,64,64,0.4), rgba(200,32,32,0.3))",
                backdropFilter: "blur(40px)",
                border: hitMissBanner.hit
                  ? "4px solid #40ff40"
                  : "4px solid #ff4040",
                borderRadius: 20,
                padding: "30px 50px",
                boxShadow: hitMissBanner.hit
                  ? `
                    0 0 80px rgba(64,255,64,0.9),
                    0 0 150px rgba(64,255,64,0.6),
                    inset 0 0 60px rgba(64,255,64,0.3)
                  `
                  : `
                    0 0 80px rgba(255,64,64,0.9),
                    0 0 150px rgba(255,64,64,0.6),
                    inset 0 0 60px rgba(255,64,64,0.3)
                  `,
              }}
            >
              {/* Testo HIT/MISS gigante */}
              <motion.div
                animate={{
                  scale: [1, 1.1, 1],
                  textShadow: hitMissBanner.hit
                    ? [
                        "0 0 40px rgba(64,255,64,1)",
                        "0 0 80px rgba(64,255,64,1)",
                        "0 0 40px rgba(64,255,64,1)",
                      ]
                    : [
                        "0 0 40px rgba(255,64,64,1)",
                        "0 0 80px rgba(255,64,64,1)",
                        "0 0 40px rgba(255,64,64,1)",
                      ],
                }}
                transition={{
                  duration: 0.8,
                  repeat: Infinity,
                }}
                style={{
                  fontFamily: "var(--font-heading)",
                  fontSize: "clamp(2.5rem, 8vw, 5rem)",
                  fontWeight: "900",
                  color: hitMissBanner.hit ? "#40ff40" : "#ff4040",
                  textAlign: "center",
                  letterSpacing: "0.1em",
                  marginBottom: 15,
                }}
              >
                {hitMissBanner.hit ? "✓ COLPITO!" : "✗ MANCATO!"}
              </motion.div>

              {/* Dettagli */}
              <div style={{
                fontFamily: "var(--font-heading)",
                fontSize: "clamp(0.9rem, 2.5vw, 1.5rem)",
                color: "var(--parchment)",
                textAlign: "center",
                lineHeight: 1.6,
              }}>
                <div style={{ marginBottom: 10 }}>
                  <span style={{ fontWeight: "bold", color: hitMissBanner.hit ? "#40ff40" : "#ff4040" }}>
                    {hitMissBanner.attackerName}
                  </span>
                  {" → "}
                  <span style={{ fontWeight: "bold", color: "var(--gold)" }}>
                    {hitMissBanner.targetName}
                  </span>
                </div>
                <div style={{
                  fontSize: "clamp(0.8rem, 2vw, 1.2rem)",
                  color: hitMissBanner.hit ? "rgba(64,255,64,0.9)" : "rgba(255,64,64,0.9)",
                }}>
                  Tiro: <span style={{ fontWeight: "900" }}>{hitMissBanner.total}</span>
                  {" vs "}
                  CA: <span style={{ fontWeight: "900" }}>{hitMissBanner.targetAC}</span>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══════════════════════════════════════════════ */}
      {/* SAVING THROW BANNER - Mostra prima del tiro */}
      {/* ═══════════════════════════════════════════════ */}
      <AnimatePresence>
        {savingThrowBanner && (
          <motion.div
            key="saving-throw-banner"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.95)",
              zIndex: 100,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 40,
            }}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", duration: 0.6 }}
              style={{
                textAlign: "center",
                maxWidth: "900px",
              }}
            >
              {/* Titolo */}
              <motion.div
                animate={{
                  textShadow: [
                    `0 0 20px ${SAVING_THROWS.find(s => s.id === savingThrowBanner.savingThrowData?.abilityId)?.color || "#d4af37"}80`,
                    `0 0 40px ${SAVING_THROWS.find(s => s.id === savingThrowBanner.savingThrowData?.abilityId)?.color || "#d4af37"}ff`,
                    `0 0 20px ${SAVING_THROWS.find(s => s.id === savingThrowBanner.savingThrowData?.abilityId)?.color || "#d4af37"}80`,
                  ],
                }}
                transition={{ duration: 1.5, repeat: Infinity }}
                style={{
                  fontFamily: "var(--font-heading)",
                  fontSize: "clamp(2.5rem, 7vw, 4.5rem)",
                  fontWeight: "900",
                  color: SAVING_THROWS.find(s => s.id === savingThrowBanner.savingThrowData?.abilityId)?.color || "#d4af37",
                  letterSpacing: "0.1em",
                  marginBottom: 20,
                }}
              >
                🎲 TIRO SALVEZZA 🎲
              </motion.div>

              {/* Descrizione */}
              <div style={{
                fontFamily: "var(--font-body)",
                fontSize: "clamp(1rem, 3vw, 1.8rem)",
                color: "var(--parchment-dark)",
                marginBottom: 30,
                fontStyle: "italic",
              }}>
                {savingThrowBanner.savingThrowData?.description}
              </div>

              {/* Personaggio */}
              <div style={{
                fontFamily: "var(--font-heading)",
                fontSize: "clamp(1.2rem, 3.5vw, 2.2rem)",
                color: "var(--gold)",
                marginBottom: 15,
              }}>
                {savingThrowBanner.characterName}
              </div>

              {/* Abilità */}
              <div style={{
                fontFamily: "var(--font-heading)",
                fontSize: "clamp(1rem, 3vw, 1.8rem)",
                color: SAVING_THROWS.find(s => s.id === savingThrowBanner.savingThrowData?.abilityId)?.color || "var(--parchment)",
                marginBottom: 25,
              }}>
                Tiro salvezza su <strong>{savingThrowBanner.savingThrowData?.ability}</strong>
              </div>

              {/* Bonus e DC */}
              <div style={{
                display: "flex",
                justifyContent: "center",
                gap: 40,
                fontFamily: "var(--font-heading)",
                fontSize: "clamp(0.9rem, 2.5vw, 1.5rem)",
                color: "var(--parchment)",
              }}>
                <div>
                  <span style={{ color: "rgba(212,175,55,0.6)" }}>Bonus: </span>
                  <span style={{ color: "var(--gold)", fontWeight: "700", fontSize: "1.2em" }}>
                    {savingThrowBanner.savingThrowData?.bonus >= 0 ? '+' : ''}{savingThrowBanner.savingThrowData?.bonus}
                  </span>
                </div>
                <div>
                  <span style={{ color: "rgba(212,175,55,0.6)" }}>DC: </span>
                  <span style={{ color: "var(--crimson-light)", fontWeight: "700", fontSize: "1.2em" }}>
                    {savingThrowBanner.savingThrowData?.dc}
                  </span>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══════════════════════════════════════════════ */}
      {/* SAVING THROW RESULT BANNER - SUCCESS/FAIL */}
      {/* ═══════════════════════════════════════════════ */}
      <AnimatePresence>
        {savingThrowResultBanner && (
          <motion.div
            key="saving-throw-result"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.92)",
              zIndex: 100,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 40,
            }}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", duration: 0.6 }}
              style={{
                textAlign: "center",
                maxWidth: "800px",
              }}
            >
              {/* SUCCESS/FAIL */}
              <motion.div
                animate={{
                  textShadow: savingThrowResultBanner.success
                    ? [
                        "0 0 20px rgba(64,255,64,0.8)",
                        "0 0 40px rgba(64,255,64,1)",
                        "0 0 20px rgba(64,255,64,0.8)",
                      ]
                    : [
                        "0 0 20px rgba(255,64,64,0.8)",
                        "0 0 40px rgba(255,64,64,1)",
                        "0 0 20px rgba(255,64,64,0.8)",
                      ],
                }}
                transition={{ duration: 0.8, repeat: Infinity }}
                style={{
                  fontFamily: "var(--font-heading)",
                  fontSize: "clamp(3rem, 10vw, 6rem)",
                  fontWeight: "900",
                  color: savingThrowResultBanner.success ? "#40ff40" : "#ff4040",
                  textAlign: "center",
                  letterSpacing: "0.1em",
                  marginBottom: 20,
                }}
              >
                {savingThrowResultBanner.success ? "✓ SUCCESS!" : "✗ FAIL!"}
              </motion.div>

              {/* Personaggio */}
              <div style={{
                fontFamily: "var(--font-heading)",
                fontSize: "clamp(1.2rem, 3.5vw, 2rem)",
                color: "var(--gold)",
                marginBottom: 20,
              }}>
                {savingThrowResultBanner.characterName}
              </div>

              {/* Abilità */}
              <div style={{
                fontFamily: "var(--font-heading)",
                fontSize: "clamp(0.9rem, 2.5vw, 1.5rem)",
                color: "var(--parchment-dark)",
                marginBottom: 25,
              }}>
                Tiro salvezza su <strong style={{ color: "var(--parchment)" }}>{savingThrowResultBanner.ability}</strong>
              </div>

              {/* Risultato vs DC */}
              <div style={{
                fontFamily: "var(--font-heading)",
                fontSize: "clamp(1rem, 3vw, 1.8rem)",
                color: savingThrowResultBanner.success ? "rgba(64,255,64,0.9)" : "rgba(255,64,64,0.9)",
              }}>
                Tiro: <span style={{ fontWeight: "900", fontSize: "1.3em" }}>{savingThrowResultBanner.total}</span>
                {" vs "}
                DC: <span style={{ fontWeight: "900", fontSize: "1.3em" }}>{savingThrowResultBanner.dc}</span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══════════════════════════════════════════════ */}
      {/* SKILL CHECK BANNER - Mostra prima del tiro */}
      {/* ═══════════════════════════════════════════════ */}
      <AnimatePresence>
        {skillCheckBanner && (
          <motion.div
            key="skill-check-banner"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.95)",
              zIndex: 100,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 40,
            }}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", duration: 0.6 }}
              style={{
                textAlign: "center",
                maxWidth: "900px",
              }}
            >
              {/* Titolo */}
              <motion.div
                animate={{
                  textShadow: [
                    `0 0 20px ${SKILL_CHECKS.find(s => s.id === skillCheckBanner.skillCheckData?.skillId)?.color || "#d4af37"}80`,
                    `0 0 40px ${SKILL_CHECKS.find(s => s.id === skillCheckBanner.skillCheckData?.skillId)?.color || "#d4af37"}ff`,
                    `0 0 20px ${SKILL_CHECKS.find(s => s.id === skillCheckBanner.skillCheckData?.skillId)?.color || "#d4af37"}80`,
                  ],
                }}
                transition={{ duration: 1.5, repeat: Infinity }}
                style={{
                  fontFamily: "var(--font-heading)",
                  fontSize: "clamp(2.5rem, 7vw, 4.5rem)",
                  fontWeight: "900",
                  color: SKILL_CHECKS.find(s => s.id === skillCheckBanner.skillCheckData?.skillId)?.color || "#d4af37",
                  letterSpacing: "0.1em",
                  marginBottom: 20,
                }}
              >
                🎯 PROVA ABILITÀ 🎯
              </motion.div>

              {/* Descrizione */}
              <div style={{
                fontFamily: "var(--font-body)",
                fontSize: "clamp(1rem, 3vw, 1.8rem)",
                color: "var(--parchment-dark)",
                marginBottom: 30,
                fontStyle: "italic",
              }}>
                {skillCheckBanner.skillCheckData?.description}
              </div>

              {/* Personaggio */}
              <div style={{
                fontFamily: "var(--font-heading)",
                fontSize: "clamp(1.2rem, 3.5vw, 2.2rem)",
                color: "var(--gold)",
                marginBottom: 15,
              }}>
                {skillCheckBanner.characterName}
              </div>

              {/* Abilità */}
              <div style={{
                fontFamily: "var(--font-heading)",
                fontSize: "clamp(1rem, 3vw, 1.8rem)",
                color: SKILL_CHECKS.find(s => s.id === skillCheckBanner.skillCheckData?.skillId)?.color || "var(--parchment)",
                marginBottom: 25,
              }}>
                Prova di <strong>{skillCheckBanner.skillCheckData?.skill}</strong> <span style={{ fontSize: "0.85em", opacity: 0.7 }}>({skillCheckBanner.skillCheckData?.ability})</span>
              </div>

              {/* Bonus e DC */}
              <div style={{
                display: "flex",
                justifyContent: "center",
                gap: 40,
                fontFamily: "var(--font-heading)",
                fontSize: "clamp(0.9rem, 2.5vw, 1.5rem)",
                color: "var(--parchment)",
              }}>
                <div>
                  <span style={{ color: "rgba(212,175,55,0.6)" }}>Bonus: </span>
                  <span style={{ color: "var(--gold)", fontWeight: "700", fontSize: "1.2em" }}>
                    {skillCheckBanner.skillCheckData?.bonus >= 0 ? '+' : ''}{skillCheckBanner.skillCheckData?.bonus}
                  </span>
                </div>
                <div>
                  <span style={{ color: "rgba(212,175,55,0.6)" }}>DC: </span>
                  <span style={{ color: "var(--crimson-light)", fontWeight: "700", fontSize: "1.2em" }}>
                    {skillCheckBanner.skillCheckData?.dc}
                  </span>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══════════════════════════════════════════════ */}
      {/* SKILL CHECK RESULT BANNER - SUCCESS/FAIL */}
      {/* ═══════════════════════════════════════════════ */}
      <AnimatePresence>
        {skillCheckResultBanner && (
          <motion.div
            key="skill-check-result"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.92)",
              zIndex: 100,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 40,
            }}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", duration: 0.6 }}
              style={{
                textAlign: "center",
                maxWidth: "800px",
              }}
            >
              {/* SUCCESS/FAIL */}
              <motion.div
                animate={{
                  textShadow: skillCheckResultBanner.success
                    ? [
                        "0 0 20px rgba(64,255,64,0.8)",
                        "0 0 40px rgba(64,255,64,1)",
                        "0 0 20px rgba(64,255,64,0.8)",
                      ]
                    : [
                        "0 0 20px rgba(255,64,64,0.8)",
                        "0 0 40px rgba(255,64,64,1)",
                        "0 0 20px rgba(255,64,64,0.8)",
                      ],
                }}
                transition={{ duration: 0.8, repeat: Infinity }}
                style={{
                  fontFamily: "var(--font-heading)",
                  fontSize: "clamp(3rem, 10vw, 6rem)",
                  fontWeight: "900",
                  color: skillCheckResultBanner.success ? "#40ff40" : "#ff4040",
                  textAlign: "center",
                  letterSpacing: "0.1em",
                  marginBottom: 20,
                }}
              >
                {skillCheckResultBanner.success ? "✓ SUCCESS!" : "✗ FAIL!"}
              </motion.div>

              {/* Personaggio */}
              <div style={{
                fontFamily: "var(--font-heading)",
                fontSize: "clamp(1.2rem, 3.5vw, 2rem)",
                color: "var(--gold)",
                marginBottom: 20,
              }}>
                {skillCheckResultBanner.characterName}
              </div>

              {/* Abilità */}
              <div style={{
                fontFamily: "var(--font-heading)",
                fontSize: "clamp(0.9rem, 2.5vw, 1.5rem)",
                color: "var(--parchment-dark)",
                marginBottom: 25,
              }}>
                Prova di <strong style={{ color: "var(--parchment)" }}>{skillCheckResultBanner.skill}</strong> <span style={{ fontSize: "0.85em", opacity: 0.7 }}>({skillCheckResultBanner.ability})</span>
              </div>

              {/* Risultato vs DC */}
              <div style={{
                fontFamily: "var(--font-heading)",
                fontSize: "clamp(1rem, 3vw, 1.8rem)",
                color: skillCheckResultBanner.success ? "rgba(64,255,64,0.9)" : "rgba(255,64,64,0.9)",
              }}>
                Tiro: <span style={{ fontWeight: "900", fontSize: "1.3em" }}>{skillCheckResultBanner.total}</span>
                {" vs "}
                DC: <span style={{ fontWeight: "900", fontSize: "1.3em" }}>{skillCheckResultBanner.dc}</span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══════════════════════════════════════════════ */}
      {/* COMBAT LOG - Sidebar destra con eventi */}
      {/* ═══════════════════════════════════════════════ */}
      <CombatLog events={combatLog} isVisible={combatState !== null} />

      {/* Indicatore sessione in basso a destra */}
      <div style={{
        position: "fixed", bottom: 12, right: 16,
        fontSize: "0.65rem", color: "rgba(212,175,55,0.25)",
        fontFamily: "var(--font-heading)", letterSpacing: "0.1em",
      }}>
        {campaign?.join_code} · digital D&D
      </div>

      <style>{`
        @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
        @keyframes fly {
          0%, 100% { opacity: 0; transform: translate(0, 0); }
          30% { opacity: 0.6; }
          50% { opacity: 0.2; transform: translate(15px, -10px); }
          70% { opacity: 0.7; }
        }
        @keyframes activePulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 1; }
        }
        @keyframes dangerPulse {
          0%, 100% { opacity: 0; }
          50% { opacity: 0.5; }
        }
        @keyframes turnBounce {
          0%, 100% { transform: translateX(-50%) translateY(0); }
          50% { transform: translateX(-50%) translateY(-3px); }
        }
        @keyframes bubble {
          0%, 100% { transform: translateY(0); opacity: 0; }
          50% { transform: translateY(-5px); opacity: 0.4; }
        }
        @keyframes glowPulse {
          0%, 100% {
            opacity: 0.4;
            transform: scale(1);
            filter: brightness(1);
          }
          50% {
            opacity: 1;
            transform: scale(1.03);
            filter: brightness(1.3);
          }
        }
      `}</style>
    </div>
  );
}
