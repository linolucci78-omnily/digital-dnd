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

const CLASS_ICONS = {
  barbarian:"⚔️", bard:"🎸", cleric:"✝️", druid:"🌿", fighter:"🗡️",
  monk:"🥋", paladin:"🛡️", ranger:"🏹", rogue:"🔪", sorcerer:"⚡",
  warlock:"🌑", wizard:"📚",
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
    const t = setTimeout(onDone, 4000);
    return () => clearTimeout(t);
  }, [onDone]);

  const accentColor = isNat20 ? "#f0d060" : isNat1 ? "#c04040" : (roll.tokenColor || "#d4af37");

  return (
    <motion.div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.8)",
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

// Messaggio narrativo del DM
function NarrativeOverlay({ text, dmName, onDone, title }) {
  const [isTypingDone, setIsTypingDone] = useState(false);

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
        maxWidth: "85%",
        maxHeight: "80vh",
        overflowY: "auto",
        padding: "40px 60px",
        background: "linear-gradient(135deg, rgba(25,20,15,0.95), rgba(15,10,8,0.95))",
        border: "1px solid rgba(212,175,55,0.4)",
        borderRadius: 8,
        boxShadow: "0 0 60px rgba(212,175,55,0.2), inset 0 1px 0 rgba(212,175,55,0.1)",
      }}>
        <div style={{ textAlign: "center", fontSize: "3rem", marginBottom: 20, filter: "drop-shadow(0 0 20px rgba(212,175,55,0.4))" }}>
          📜
        </div>

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

        <TypewriterText text={text} onComplete={() => setIsTypingDone(true)} />

        {isTypingDone && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            style={{
              marginTop: 30,
              textAlign: "center",
              fontSize: "0.85rem",
              color: "rgba(212,175,55,0.5)",
              fontStyle: "italic",
            }}
          >
            In attesa del Dungeon Master...
          </motion.div>
        )}
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

// Scheda HP nella sidebar
function CharacterHPCard({ character, isActive = false }) {
  const pct = Math.max(0, (character.hp_current / character.hp_max) * 100);
  const hpClass = pct > 50 ? "high" : pct > 25 ? "mid" : "low";

  return (
    <motion.div
      style={{
        background: isActive ? "rgba(212,175,55,0.08)" : "rgba(0,0,0,0.4)",
        border: `1px solid ${isActive ? character.token_color : "rgba(212,175,55,0.1)"}`,
        borderLeft: `3px solid ${character.token_color}`,
        borderRadius: "0 8px 8px 0",
        padding: "10px 12px",
        transition: "all 0.3s",
        boxShadow: isActive ? `0 0 15px ${character.token_color}30` : "none",
      }}
      animate={isActive ? { x: [0, 4, 0] } : {}}
      transition={{ duration: 0.4 }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <div style={{
          width: 32, height: 32, borderRadius: "50%",
          background: character.avatar_url ? "#000" : `radial-gradient(circle, ${character.token_color}30, rgba(0,0,0,0.8))`,
          border: `2px solid ${character.token_color}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "0.7rem", color: character.token_color, fontFamily: "var(--font-heading)", fontWeight: "700",
          flexShrink: 0,
          overflow: "hidden",
        }}>
          {character.avatar_url ? (
            <img
              src={character.avatar_url}
              alt={character.name}
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
              onError={(e) => {
                e.target.style.display = "none";
                e.target.parentElement.style.background = `radial-gradient(circle, ${character.token_color}30, rgba(0,0,0,0.8))`;
                e.target.parentElement.innerHTML = `<span style="font-size: 0.7rem; color: ${character.token_color}; font-family: var(--font-heading); font-weight: 700">${CLASS_ICONS[character.class] || character.name?.[0] || "?"}</span>`;
              }}
            />
          ) : (
            CLASS_ICONS[character.class] || character.name?.[0] || "?"
          )}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily: "var(--font-heading)",
            fontSize: "0.85rem",
            color: character.hp_current === 0 ? "#c04040" : "var(--parchment)",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            {character.name}
          </div>
          <div style={{ fontSize: "0.6rem", color: "rgba(212,175,55,0.5)" }}>
            {character.hp_current}/{character.hp_max} HP · CA {character.armor_class}
          </div>
        </div>
        {character.hp_current === 0 && (
          <span style={{ fontSize: "0.65rem", color: "#c04040" }}>💀</span>
        )}
        {character.inspiration && (
          <span style={{ fontSize: "0.7rem", color: "var(--gold)" }}>✦</span>
        )}
      </div>
      <div className="hp-bar-container" style={{ height: 6 }}>
        <motion.div
          className={`hp-bar-fill ${hpClass}`}
          style={{ width: `${pct}%` }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>
    </motion.div>
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
  const [loading, setLoading] = useState(true);
  const [joinCode, setJoinCode] = useState(propJoinCode || "");
  const [inputCode, setInputCode] = useState("");
  const [currentLocation, setCurrentLocation] = useState(null);
  const [pois, setPois] = useState([]);
  const cleanupRef = useRef(null);
  const diceRef = useRef(null);

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
        setCombatState(payload);
      })
      .on("broadcast", { event: "combat_started" }, ({ payload }) => {
        console.log("📺 TV riceve combat_started", payload);
        setCombatState(prev => ({ ...prev, active: true, ...payload }));
      })
      .on("broadcast", { event: "combat_ended" }, () => {
        console.log("📺 TV riceve combat_ended");
        setCombatState(null);
      })
      .on("broadcast", { event: "turn_changed" }, ({ payload }) => {
        console.log("📺 TV riceve turn_changed", payload);
        setCombatState(prev => prev ? { ...prev, currentTurn: payload.currentTurn } : null);
      })
      .on("broadcast", { event: "narrative" }, ({ payload }) => {
        console.log("📺 TV riceve narrativa:", payload);
        if (payload.text === null) {
          console.log("📺 TV: Narrativa con text=null, chiudo");
          setNarrativeMsg(null);
        } else {
          setNarrativeMsg(payload);
        }
      })
      .on("broadcast", { event: "dice_roll" }, ({ payload }) => {
        console.log("📺 TV riceve dado:", payload);
        setDiceRoll(payload);

        // ── Lancia dado 3D ──
        const diceType = payload.dice?.[0] || "d20";
        const count = payload.dice?.length || 1;
        let notation = `${count}${diceType}`;
        if (payload.modifier && payload.modifier !== 0) {
          notation += payload.modifier > 0 ? `+${payload.modifier}` : `${payload.modifier}`;
        }

        if (diceRef.current?.isReady()) {
          diceRef.current.roll(notation, (results) => {
            console.log("🎲 3D completato:", results);
          });
        }
      })
      .on("broadcast", { event: "map_update" }, ({ payload }) => {
        console.log("📺 TV riceve mappa:", payload);
        setMapUrl(payload.mapUrl);
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
      {/* Background dinamico */}
      <div className={`bg-image ${isCombat ? "bg-combat" : "bg-lobby"}`} />
      <div className="bg-overlay-light" />
      <MusicPlayer track={isCombat ? "combat" : "lobby"} />

      {/* Sidebar sinistra — Party */}
      <div style={{
        width: "clamp(220px, 22%, 300px)",
        height: "100%",
        borderRight: "1px solid rgba(212,175,55,0.15)",
        padding: "20px 12px",
        display: "flex",
        flexDirection: "column",
        gap: 8,
        overflowY: "auto",
        background: "rgba(0,0,0,0.5)",
        backdropFilter: "blur(10px)",
      }}>
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontFamily: "var(--font-title)", color: "var(--gold)", fontSize: "0.9rem" }}>
            {campaign?.name}
          </div>
          <div style={{ fontSize: "0.65rem", color: "rgba(212,175,55,0.4)", letterSpacing: "0.1em" }}>
            {campaign?.world} · DM: {campaign?.dm_name}
          </div>
        </div>

        <div style={{ fontFamily: "var(--font-heading)", fontSize: "0.6rem", color: "var(--gold-dark)", letterSpacing: "0.2em", marginBottom: 4 }}>
          IL GRUPPO ({characters.length})
        </div>

        {characters.map((c, i) => {
          const isActive = isCombat && initiative[currentTurn]?.id === c.id;
          return (
            <CharacterHPCard key={c.id} character={c} isActive={isActive} />
          );
        })}
      </div>

      {/* Area centrale — Contenuto principale */}
      <div style={{
        flex: 1, height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        overflow: "hidden",
      }}>

        {/* MAPPA DI BATTAGLIA */}
        {mapUrl && !diceRoll && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "#000",
            }}
          >
            <div style={{ position: "relative", width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <img
                src={mapUrl}
                alt="Mappa di battaglia"
                style={{
                  maxWidth: "100%",
                  maxHeight: "100%",
                  objectFit: "contain",
                  imageRendering: "crisp-edges",
                }}
              />

              {/* Token Personaggi sulla mappa */}
              {characters.map((char, idx) => {
                const x = char.map_x || 50;
                const y = char.map_y || 50;

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
                    <div style={{
                      width: "clamp(45px, 4.5vw, 75px)",
                      height: "clamp(45px, 4.5vw, 75px)",
                      borderRadius: "50%",
                      background: char.avatar_url ? "#000" : `radial-gradient(circle at 35% 35%, ${char.token_color}, ${char.token_color}cc)`,
                      border: `4px solid ${char.token_color}`,
                      boxShadow: `0 0 25px ${char.token_color}90, 0 5px 15px rgba(0,0,0,0.6)`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "clamp(1.2rem, 2.5vw, 2rem)",
                      cursor: "pointer",
                      position: "relative",
                      overflow: "hidden",
                    }}>
                      {char.avatar_url ? (
                        <img
                          src={char.avatar_url}
                          alt={char.name}
                          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                          onError={(e) => {
                            e.target.style.display = "none";
                            e.target.parentElement.style.background = `radial-gradient(circle at 35% 35%, ${char.token_color}, ${char.token_color}cc)`;
                            e.target.parentElement.innerHTML = `<span style="font-size: clamp(1.2rem, 2.5vw, 2rem)">${CLASS_ICONS[char.class] || char.name?.[0] || "?"}</span>`;
                          }}
                        />
                      ) : (
                        CLASS_ICONS[char.class] || char.name?.[0] || "?"
                      )}

                      {char.hp_current > 0 && char.hp_current < char.hp_max * 0.3 && (
                        <div style={{
                          position: "absolute",
                          top: -5, right: -5,
                          width: 20, height: 20,
                          background: "#c04040",
                          borderRadius: "50%",
                          border: "2px solid #fff",
                          fontSize: "0.6rem",
                          display: "flex", alignItems: "center", justifyContent: "center",
                        }}>
                          ⚠️
                        </div>
                      )}
                    </div>

                    <div style={{
                      position: "absolute",
                      top: "calc(100% + 6px)",
                      left: "50%",
                      transform: "translateX(-50%)",
                      whiteSpace: "nowrap",
                      fontFamily: "var(--font-heading)",
                      fontSize: "clamp(0.7rem, 1.2vw, 1rem)",
                      color: "#fff",
                      textShadow: `0 0 15px ${char.token_color}, 0 0 8px ${char.token_color}, 0 2px 8px #000`,
                      fontWeight: "700",
                      pointerEvents: "none",
                      background: `linear-gradient(to bottom, rgba(0,0,0,0.8), rgba(0,0,0,0.95))`,
                      padding: "3px 10px",
                      borderRadius: "5px",
                      border: `2px solid ${char.token_color}`,
                      letterSpacing: "0.05em",
                    }}>
                      {char.name}
                    </div>
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

        {/* Combattimento attivo */}
        {isCombat && (
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
                    {entry.init}
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
            onDone={() => setNarrativeMsg(null)}
          />
        )}
      </AnimatePresence>

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
      `}</style>
    </div>
  );
}
