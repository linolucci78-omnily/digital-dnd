// ═══════════════════════════════════════════════
//  CharacterToken — Miniatura del personaggio
//  Token circolare con silhouette SVG della classe
//  e colore personalizzato del giocatore
// ═══════════════════════════════════════════════

import { motion } from "framer-motion";

// Icone delle classi (PNG create con Canva AI)
const CLASS_ICONS = {
  barbarian: "/class-icons/barbarian.png",
  bard: "/class-icons/bard.png",
  cleric: "/class-icons/cleric.png",
  druid: "/class-icons/druid.png",
  fighter: "/class-icons/fighter.png",
  monk: "/class-icons/monk.png",
  paladin: "/class-icons/paladin.png",
  ranger: "/class-icons/ranger.png",
  rogue: "/class-icons/rogue.png",
  sorcerer: "/class-icons/sorcerer.png",
  warlock: "/class-icons/warlock.png",
  wizard: "/class-icons/wizard.png",
};

// Precarica tutte le icone all'avvio per evitare flickering
if (typeof window !== "undefined") {
  Object.values(CLASS_ICONS).forEach(src => {
    const img = new Image();
    img.src = src;
  });
}

// Silhouette SVG per ogni classe D&D (deprecate - usiamo CLASS_ICONS)
const CLASS_SILHOUETTES_OLD = {
  barbarian: (
    <svg viewBox="0 0 40 40" fill="currentColor">
      {/* Barbaro: muscoloso con ascia */}
      <ellipse cx="20" cy="10" rx="5" ry="6" /> {/* testa */}
      <path d="M14 16 Q20 14 26 16 L28 32 Q24 34 20 33 Q16 34 12 32 Z" /> {/* busto/gambe */}
      <path d="M10 18 L6 28 L10 28 L12 22" /> {/* braccio sx */}
      <path d="M30 18 L36 22 L38 18 L34 14 L30 16" /> {/* ascia dx */}
      <path d="M13 26 L10 38 L15 38 L17 30" /> {/* gamba sx */}
      <path d="M27 26 L30 38 L25 38 L23 30" /> {/* gamba dx */}
    </svg>
  ),
  bard: (
    <svg viewBox="0 0 40 40" fill="currentColor">
      {/* Bardo: con cappello a punta e liuto */}
      <ellipse cx="20" cy="10" rx="5" ry="5" />
      <path d="M15 6 L20 0 L25 6" /> {/* cappello */}
      <path d="M14 15 Q20 13 26 15 L27 30 Q20 32 13 30 Z" />
      <path d="M10 17 L7 25 Q9 27 11 25 L13 20" />
      {/* Liuto stilizzato */}
      <ellipse cx="32" cy="22" rx="5" ry="6" />
      <line x1="27" y1="18" x2="29" y2="10" stroke="currentColor" strokeWidth="1.5" />
      <path d="M13 28 L11 38 L15 38 L16 31" />
      <path d="M27 28 L29 38 L25 38 L24 31" />
    </svg>
  ),
  cleric: (
    <svg viewBox="0 0 40 40" fill="currentColor">
      {/* Chierico: con simbolo sacro e vesti lunghe */}
      <ellipse cx="20" cy="9" rx="5" ry="5.5" />
      {/* Aureola */}
      <circle cx="20" cy="9" r="8" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.6" />
      {/* Corpo con vesti lunghe */}
      <path d="M13 15 Q20 13 27 15 L30 40 Q20 42 10 40 Z" />
      <path d="M10 17 L7 28 L11 28 L13 20" />
      <path d="M30 17 L33 28 L29 28 L27 20" />
      {/* Simbolo sacro */}
      <rect x="18" y="19" width="4" height="7" rx="1" />
      <rect x="15" y="21" width="10" height="3" rx="1" />
    </svg>
  ),
  druid: (
    <svg viewBox="0 0 40 40" fill="currentColor">
      {/* Druido: con foglie e bastone */}
      <ellipse cx="20" cy="10" rx="5" ry="5.5" />
      {/* Corona di foglie */}
      <path d="M14 7 Q12 2 15 5" />
      <path d="M20 5 Q20 0 20 4" />
      <path d="M26 7 Q28 2 25 5" />
      <path d="M13 15 Q20 13 27 15 L26 33 Q20 35 14 33 Z" />
      <path d="M10 17 L8 28 L12 28 L13 20" />
      {/* Bastone con pomo */}
      <line x1="30" y1="38" x2="30" y2="12" stroke="currentColor" strokeWidth="2" />
      <circle cx="30" cy="11" r="3" />
      <path d="M14 30 L12 38 L16 38 L17 32" />
      <path d="M26 30 L28 38 L24 38 L23 32" />
    </svg>
  ),
  fighter: (
    <svg viewBox="0 0 40 40" fill="currentColor">
      {/* Guerriero: armatura e spada */}
      <ellipse cx="20" cy="9" rx="5" ry="5.5" />
      {/* Elmo */}
      <path d="M15 7 L15 4 Q20 2 25 4 L25 7" />
      {/* Corpo con armatura */}
      <path d="M13 15 Q20 13 27 15 L27 32 Q20 34 13 32 Z" />
      {/* Bretelle armatura */}
      <line x1="16" y1="15" x2="14" y2="30" stroke="currentColor" strokeWidth="0.8" opacity="0.5" />
      <line x1="24" y1="15" x2="26" y2="30" stroke="currentColor" strokeWidth="0.8" opacity="0.5" />
      <path d="M10 16 L8 27 L12 27 L13 19" />
      {/* Spada */}
      <line x1="31" y1="36" x2="31" y2="16" stroke="currentColor" strokeWidth="2" />
      <line x1="28" y1="20" x2="34" y2="20" stroke="currentColor" strokeWidth="2" />
      <path d="M13 30 L11 38 L16 38 L17 32" />
      <path d="M27 30 L29 38 L24 38 L23 32" />
    </svg>
  ),
  monk: (
    <svg viewBox="0 0 40 40" fill="currentColor">
      {/* Monaco: in posizione di combattimento */}
      <ellipse cx="20" cy="10" rx="5" ry="5.5" />
      <path d="M14 16 Q20 14 26 16 L25 32 Q20 34 15 32 Z" />
      {/* Pose dinamica - braccia aperte */}
      <path d="M8 20 L12 16 L14 20 L10 25 Z" /> {/* braccio esteso sx */}
      <path d="M32 20 L28 16 L26 20 L30 25 Z" /> {/* braccio esteso dx */}
      <path d="M14 30 L10 38 L15 38 L17 32" />
      <path d="M26 30 L30 38 L25 38 L23 32" />
      {/* Cintura */}
      <line x1="14" y1="24" x2="26" y2="24" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  ),
  paladin: (
    <svg viewBox="0 0 40 40" fill="currentColor">
      {/* Paladino: con scudo e spada, armatura pesante */}
      <ellipse cx="20" cy="9" rx="5" ry="5.5" />
      <path d="M14 8 L14 5 Q20 3 26 5 L26 8" /> {/* elmo */}
      <path d="M13 15 Q20 13 27 15 L27 32 Q20 34 13 32 Z" />
      {/* Croce sul petto */}
      <rect x="18.5" y="17" width="3" height="9" rx="0.5" fill="rgba(255,255,255,0.4)" />
      <rect x="15" y="19" width="10" height="3" rx="0.5" fill="rgba(255,255,255,0.4)" />
      {/* Scudo */}
      <path d="M7 16 L7 28 Q7 32 11 32 L11 18 Q9 16 7 16 Z" />
      {/* Spada alzata */}
      <line x1="32" y1="30" x2="32" y2="10" stroke="currentColor" strokeWidth="2" />
      <line x1="29" y1="14" x2="35" y2="14" stroke="currentColor" strokeWidth="2" />
      <path d="M14 30 L12 38 L16 38 L17 32" />
      <path d="M26 30 L28 38 L24 38 L23 32" />
    </svg>
  ),
  ranger: (
    <svg viewBox="0 0 40 40" fill="currentColor">
      {/* Ranger: con arco teso */}
      <ellipse cx="20" cy="10" rx="5" ry="5.5" />
      <path d="M14 16 Q20 14 26 16 L25 32 Q20 34 15 32 Z" />
      {/* Arco - curva */}
      <path d="M32 5 Q38 20 32 35" fill="none" stroke="currentColor" strokeWidth="2" />
      <line x1="32" y1="5" x2="32" y2="35" stroke="currentColor" strokeWidth="0.8" /> {/* corda arco */}
      {/* Freccia */}
      <line x1="28" y1="19" x2="34" y2="19" stroke="currentColor" strokeWidth="1.5" />
      <path d="M28 17 L26 19 L28 21" />
      <path d="M9 17 L7 25 L11 25 L12 20" />
      <path d="M14 30 L12 38 L16 38 L17 32" />
      <path d="M26 30 L28 38 L24 38 L23 32" />
    </svg>
  ),
  rogue: (
    <svg viewBox="0 0 40 40" fill="currentColor">
      {/* Ladro: incappucciato, furtivo */}
      <ellipse cx="20" cy="11" rx="5" ry="5" />
      {/* Cappuccio */}
      <path d="M13 9 Q14 3 20 2 Q26 3 27 9 Q24 8 20 8 Q16 8 13 9 Z" />
      <path d="M14 16 Q20 14 26 16 L25 31 Q20 33 15 31 Z" />
      {/* Mantello laterale */}
      <path d="M10 16 L8 30 L13 28 L14 18 Z" opacity="0.7" />
      {/* Pugnale in mano */}
      <line x1="30" y1="28" x2="28" y2="16" stroke="currentColor" strokeWidth="1.5" />
      <ellipse cx="28.5" cy="15" rx="2" ry="1" />
      <path d="M14 29 L12 38 L16 38 L17 31" />
      <path d="M26 29 L28 38 L24 38 L23 31" />
    </svg>
  ),
  sorcerer: (
    <svg viewBox="0 0 40 40" fill="currentColor">
      {/* Stregone: con energia magica che emana */}
      <ellipse cx="20" cy="10" rx="5" ry="5.5" />
      <path d="M13 16 Q20 14 27 16 L26 32 Q20 34 14 32 Z" />
      {/* Braccia che emanano magia */}
      <path d="M10 19 L7 15 L9 13 L12 18" />
      <path d="M30 19 L33 15 L31 13 L28 18" />
      {/* Scintille magiche */}
      <circle cx="6" cy="12" r="2" opacity="0.8" />
      <circle cx="4" cy="17" r="1.5" opacity="0.6" />
      <circle cx="34" cy="12" r="2" opacity="0.8" />
      <circle cx="36" cy="17" r="1.5" opacity="0.6" />
      <circle cx="20" cy="2" r="3" opacity="0.9" />
      <path d="M14 30 L12 38 L16 38 L17 32" />
      <path d="M26 30 L28 38 L24 38 L23 32" />
    </svg>
  ),
  warlock: (
    <svg viewBox="0 0 40 40" fill="currentColor">
      {/* Warlock: con tentacoli/energia oscura */}
      <ellipse cx="20" cy="10" rx="5" ry="5.5" />
      <path d="M13 16 Q20 14 27 16 L26 32 Q20 34 14 32 Z" />
      {/* Mantello oscuro */}
      <path d="M10 14 L7 36 L14 32 L14 18 Z" opacity="0.8" />
      <path d="M30 14 L33 36 L26 32 L26 18 Z" opacity="0.8" />
      {/* Sfera di potere oscuro */}
      <circle cx="20" cy="4" r="4" opacity="0.7" />
      <path d="M17 6 Q20 2 23 6" fill="none" stroke="currentColor" strokeWidth="0.8" />
      {/* Occhio del patrono */}
      <ellipse cx="20" cy="4" rx="2.5" ry="1.5" fill="rgba(0,0,0,0.6)" />
      <circle cx="20" cy="4" r="1" fill="rgba(255,50,50,0.8)" />
      <path d="M14 30 L12 38 L16 38 L17 32" />
      <path d="M26 30 L28 38 L24 38 L23 32" />
    </svg>
  ),
  wizard: (
    <svg viewBox="0 0 40 40" fill="currentColor">
      {/* Mago: cappello a punta, bastone, libro */}
      <ellipse cx="20" cy="12" rx="5" ry="4.5" />
      {/* Cappello conico */}
      <path d="M14 10 L20 0 L26 10 Z" />
      <ellipse cx="20" cy="10" rx="7" ry="2" />
      <path d="M13 16 Q20 14 27 16 L26 32 Q20 34 14 32 Z" />
      {/* Bastone */}
      <line x1="9" y1="38" x2="10" y2="14" stroke="currentColor" strokeWidth="2" />
      <circle cx="10" cy="12" r="3" />
      <circle cx="10" cy="12" r="1.5" fill="rgba(150,150,255,0.8)" />
      {/* Libro nella mano */}
      <rect x="28" y="20" width="8" height="10" rx="1" />
      <line x1="32" y1="20" x2="32" y2="30" stroke="rgba(0,0,0,0.3)" strokeWidth="0.8" />
      <path d="M14 30 L13 38 L17 38 L17 32" />
      <path d="M26 30 L27 38 L23 38 L23 32" />
    </svg>
  ),
};

// Colori di default per classe (possono essere sovrascritti dal giocatore)
const CLASS_COLORS = {
  barbarian: { bg: "#3a1510", accent: "#c84a2a", glow: "rgba(200,74,42,0.5)" },
  bard:      { bg: "#2a2a08", accent: "#c8a020", glow: "rgba(200,160,32,0.5)" },
  cleric:    { bg: "#2a2a18", accent: "#e8d060", glow: "rgba(232,208,96,0.5)" },
  druid:     { bg: "#0a1a0a", accent: "#5a8a30", glow: "rgba(90,138,48,0.5)" },
  fighter:   { bg: "#1a1208", accent: "#c87040", glow: "rgba(200,112,64,0.5)" },
  monk:      { bg: "#1a1a10", accent: "#d4b060", glow: "rgba(212,176,96,0.5)" },
  paladin:   { bg: "#1a1a08", accent: "#e8d060", glow: "rgba(232,208,96,0.6)" },
  ranger:    { bg: "#0a1808", accent: "#60a060", glow: "rgba(96,160,96,0.5)" },
  rogue:     { bg: "#141418", accent: "#8080a0", glow: "rgba(128,128,160,0.5)" },
  sorcerer:  { bg: "#1a0a2a", accent: "#a040c0", glow: "rgba(160,64,192,0.5)" },
  warlock:   { bg: "#120818", accent: "#8030a0", glow: "rgba(128,48,160,0.5)" },
  wizard:    { bg: "#081028", accent: "#4070c0", glow: "rgba(64,112,192,0.5)" },
};

// Token piccolo per la mappa (50x50px)
export function TokenSmall({ character, isActive = false, isDead = false }) {
  const colors = CLASS_COLORS[character.class] || CLASS_COLORS.fighter;
  const tokenColor = character.token_color || colors.accent;
  const classIcon = CLASS_ICONS[character.class] || CLASS_ICONS.fighter;

  return (
    <motion.div
      className={`token ${isActive ? "active" : ""}`}
      style={{
        width: 44,
        height: 44,
        background: `radial-gradient(circle at 35% 35%, ${tokenColor}40, ${colors.bg} 70%)`,
        border: `3px solid ${tokenColor}`,
        "--token-glow": colors.glow,
        opacity: isDead ? 0.5 : 1,
        filter: isDead ? "grayscale(0.7)" : "none",
      }}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
    >
      <img
        src={classIcon}
        alt={character.class}
        style={{ width: 28, height: 28, objectFit: "contain", filter: "drop-shadow(0 0 3px rgba(212,175,55,0.5))" }}
      />
      {/* Indicatore turno attivo */}
      {isActive && (
        <motion.div
          style={{
            position: "absolute",
            inset: -4,
            borderRadius: "50%",
            border: `2px solid ${tokenColor}`,
            opacity: 0.6,
          }}
          animate={{ scale: [1, 1.3, 1], opacity: [0.6, 0, 0.6] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
      )}
    </motion.div>
  );
}

// Token grande per la scheda personaggio e la creazione (100x100px)
export function TokenLarge({ character, size = 100 }) {
  const colors = CLASS_COLORS[character.class] || CLASS_COLORS.fighter;
  const tokenColor = character.token_color || colors.accent;
  const classIcon = CLASS_ICONS[character.class] || CLASS_ICONS.fighter;

  return (
    <div style={{ textAlign: "center" }}>
      <motion.div
        className="token"
        style={{
          width: size,
          height: size,
          background: `radial-gradient(circle at 35% 35%, ${tokenColor}50, ${colors.bg} 70%)`,
          border: `4px solid ${tokenColor}`,
          "--token-glow": colors.glow,
          boxShadow: `0 0 30px ${colors.glow}, 0 8px 24px rgba(0,0,0,0.8), inset 0 2px 4px rgba(255,255,255,0.1)`,
        }}
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 200 }}
      >
        {/* Pattern decorativo interno */}
        <div style={{
          position: "absolute",
          inset: 4,
          borderRadius: "50%",
          border: `1px solid ${tokenColor}40`,
        }} />
        {/* Silhouette */}
        <img
          src={classIcon}
          alt={character.class}
          style={{
            width: size * 0.65,
            height: size * 0.65,
            objectFit: "contain",
            filter: `drop-shadow(0 0 8px rgba(212,175,55,0.6))`,
            position: "relative",
            zIndex: 1,
          }}
        />
      </motion.div>

      {/* Nome sotto il token */}
      {character.name && (
        <div style={{
          marginTop: 8,
          fontFamily: "var(--font-heading)",
          fontSize: "0.75rem",
          color: tokenColor,
          letterSpacing: "0.1em",
          textShadow: `0 0 8px ${colors.glow}`,
          maxWidth: size + 20,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}>
          {character.name}
        </div>
      )}
    </div>
  );
}

// Token preview durante la creazione del personaggio
export function TokenPreview({ classId, tokenColor, name = "" }) {
  const colors = CLASS_COLORS[classId] || CLASS_COLORS.fighter;
  const color = tokenColor || colors.accent;
  const classIcon = CLASS_ICONS[classId] || CLASS_ICONS.fighter;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
      <motion.div
        className="token"
        style={{
          width: 120,
          height: 120,
          background: `radial-gradient(circle at 35% 35%, ${color}50, ${colors.bg} 70%)`,
          border: `5px solid ${color}`,
          "--token-glow": `${color}80`,
          boxShadow: `0 0 40px ${color}50, 0 12px 32px rgba(0,0,0,0.9), inset 0 2px 6px rgba(255,255,255,0.1)`,
        }}
        key={classId}
        initial={{ scale: 0.5, rotate: -10, opacity: 0 }}
        animate={{ scale: 1, rotate: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
      >
        {/* Anello interno decorativo */}
        <div style={{
          position: "absolute",
          inset: 5,
          borderRadius: "50%",
          border: `1px solid ${color}40`,
        }} />
        <div style={{
          position: "absolute",
          inset: 10,
          borderRadius: "50%",
          border: `1px solid ${color}20`,
        }} />
        {/* Icona classe */}
        <img
          src={classIcon}
          alt={classId}
          style={{
            width: 80,
            height: 80,
            objectFit: "contain",
            filter: `drop-shadow(0 0 10px rgba(212,175,55,0.7))`,
            position: "relative",
            zIndex: 1,
          }}
        />
      </motion.div>

      {/* Nome sotto */}
      {name && (
        <motion.div
          style={{
            fontFamily: "var(--font-heading)",
            fontSize: "1rem",
            color: color,
            letterSpacing: "0.1em",
            textShadow: `0 0 12px ${color}80`,
          }}
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {name}
        </motion.div>
      )}
    </div>
  );
}

export default TokenLarge;
