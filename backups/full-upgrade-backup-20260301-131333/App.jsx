// ═══════════════════════════════════════════════
//  digitalDnD — App principale
//  Routing: Home → DM Panel | Giocatore | TV Screen
// ═══════════════════════════════════════════════

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "./lib/supabase.js";
import CharacterCreation from "./player/CharacterCreation.jsx";
import CharacterSheet from "./player/CharacterSheet.jsx";
import AdventurePlayer from "./player/AdventurePlayer.jsx";
import DMPanel from "./dm/DMPanel.jsx";
import TVScreen from "./tv/TVScreen.jsx";
import MusicPlayer from "./shared/components/MusicPlayer.jsx";
import DnDIcon from "./shared/components/DnDIcon.jsx";
import starterSetData from "./data/starter_set_seed.json";

// Determina la modalità dal URL
function getMode() {
  const params = new URLSearchParams(window.location.search);
  const mode = params.get("mode");

  // Supporta sia ?mode=tv che ?tv per compatibilità
  if (mode === "tv" || params.get("tv") !== null) return "tv";
  if (mode === "dm" || params.get("dm") !== null) return "dm";
  if (mode === "join" || params.get("join") !== null) return "join";
  if (mode === "dm_create" || params.get("create") !== null) return "dm_create";
  if (mode === "campaign_created" || params.get("created") !== null) return "campaign_created";
  if (mode === "player_code" || params.get("pcode") !== null) return "player_code";
  if (mode === "player" || params.get("play") !== null) return "player";
  return "home";
}

// Naviga con URL reale (stessa tab)
function goTo(path) { window.location.href = path; }
// Apri in nuovo tab
function openTab(path) { window.open(path, "_blank"); }

// ── HOME PAGE ──
function HomePage() {
  const [joinCode, setJoinCode] = useState("");
  const [playerCode, setPlayerCode] = useState("");
  const [dmJoinCode, setDmJoinCode] = useState("");
  const [dmPassword, setDmPassword] = useState("");
  const [showJoin, setShowJoin] = useState(false);
  const [showReturn, setShowReturn] = useState(false);
  const [showDMReturn, setShowDMReturn] = useState(false);
  const [joinError, setJoinError] = useState("");
  const [loading, setLoading] = useState(false);

  const closeAll = () => { setShowJoin(false); setShowReturn(false); setShowDMReturn(false); setJoinError(""); };

  const handleJoinCampaign = async () => {
    if (!joinCode.trim()) return;
    setLoading(true);
    setJoinError("");
    try {
      const { data: campaign, error } = await supabase
        .from("campaigns")
        .select("id, name")
        .eq("join_code", joinCode.trim().toUpperCase())
        .single();
      if (error || !campaign) {
        setJoinError("Codice non trovato. Riprova.");
      } else {
        goTo(`?join&c=${joinCode.trim().toUpperCase()}&cid=${campaign.id}`);
      }
    } catch (e) {
      setJoinError("Errore di connessione.");
    } finally {
      setLoading(false);
    }
  };

  const handleReturnPlayer = async () => {
    if (!playerCode.trim()) return;
    setLoading(true);
    setJoinError("");
    try {
      const { data: character, error } = await supabase
        .from("characters")
        .select("id, player_code, campaign_id")
        .eq("player_code", playerCode.trim().toUpperCase())
        .single();
      if (error || !character) {
        setJoinError("Codice personaggio non trovato.");
      } else {
        goTo(`?play&pc=${playerCode.trim().toUpperCase()}`);
      }
    } catch (e) {
      setJoinError("Errore di connessione.");
    } finally {
      setLoading(false);
    }
  };

  const handleReturnDM = async () => {
    if (!dmJoinCode.trim() || !dmPassword.trim()) return;
    setLoading(true);
    setJoinError("");
    try {
      const { data: campaign, error } = await supabase
        .from("campaigns")
        .select("id, dm_code")
        .eq("join_code", dmJoinCode.trim().toUpperCase())
        .single();

      // DEBUG: stampa i valori per vedere cosa sta succedendo
      console.log("🔍 DEBUG DM LOGIN:");
      console.log("Campaign trovata:", campaign);
      console.log("dm_code nel DB:", campaign?.dm_code);
      console.log("Password inserita:", dmPassword.trim());
      console.log("Match:", campaign?.dm_code === dmPassword.trim());

      if (error || !campaign) {
        setJoinError("Codice campagna non trovato.");
      } else if (campaign.dm_code !== dmPassword.trim()) {
        setJoinError("Password DM non corretta.");
      } else {
        openTab(`?dm&cid=${campaign.id}&dmc=${encodeURIComponent(dmPassword.trim())}`);
      }
    } catch (e) {
      setJoinError("Errore di connessione.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "20px",
      gap: 32,
    }}>
      <div className="bg-image bg-lobby" />
      <div className="bg-overlay-light" />
      <MusicPlayer track="lobby" />

      {/* Logo e titolo */}
      <motion.div
        style={{ textAlign: "center" }}
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        {/* Icona d20 decorativa */}
        <motion.div
          style={{
            width: 100, height: 100,
            margin: "0 auto 16px",
            color: "var(--gold)",
            filter: "drop-shadow(0 0 20px rgba(212,175,55,0.6))",
          }}
          animate={{ rotate: [0, 3, -3, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        >
          <svg viewBox="0 0 100 100" fill="none">
            <polygon points="50,5 94,30 94,70 50,95 6,70 6,30" stroke="currentColor" strokeWidth="4" fill="rgba(212,175,55,0.1)" />
            <polygon points="50,12 87,33 87,67 50,88 13,67 13,33" stroke="currentColor" strokeWidth="1" strokeOpacity="0.3" fill="none" />
            <text x="50" y="58" textAnchor="middle" fill="currentColor" fontSize="28" fontWeight="900" fontFamily="serif">20</text>
          </svg>
        </motion.div>

        <h1 style={{
          fontFamily: "var(--font-title)",
          fontSize: "clamp(1.8rem, 6vw, 3rem)",
          color: "var(--gold)",
          textShadow: "0 0 30px rgba(212,175,55,0.5), 0 2px 4px rgba(0,0,0,0.8)",
          letterSpacing: "0.05em",
          lineHeight: 1.1,
        }}>
          digital D&D
        </h1>
        <div style={{
          color: "var(--parchment-dark)",
          fontSize: "0.9rem",
          fontStyle: "italic",
          marginTop: 8,
          letterSpacing: "0.1em",
        }}>
          Dungeons & Dragons 5e — Edizione Digitale
        </div>
      </motion.div>

      {/* Immagine Paladino - Posizione assoluta a sinistra */}
      <motion.div
        initial={{ opacity: 0, x: -50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.2, duration: 0.8 }}
        className="hero-paladin"
        style={{
          position: "fixed",
          left: "120px",
          top: "42%",
          transform: "translateY(-50%)",
          zIndex: 1,
        }}
      >
        <img
          src="/assets/hero/paladin.png"
          alt="Paladin Hero"
          style={{
            width: "clamp(350px, 35vw, 500px)",
            height: "auto",
            filter: "drop-shadow(0 0 40px rgba(212,175,55,0.4))",
            objectFit: "contain",
            opacity: 0.95,
          }}
        />
      </motion.div>

      {/* Immagine Orc - Posizione assoluta a destra */}
      <motion.div
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.2, duration: 0.8 }}
        className="hero-orc"
        style={{
          position: "fixed",
          right: "120px",
          top: "42%",
          transform: "translateY(-50%)",
          zIndex: 1,
        }}
      >
        <img
          src="/assets/hero/orc3.png"
          alt="Orc Enemy"
          style={{
            width: "clamp(350px, 35vw, 500px)",
            height: "auto",
            filter: "drop-shadow(0 0 40px rgba(192,64,64,0.4))",
            objectFit: "contain",
            opacity: 0.95,
          }}
        />
      </motion.div>

      <style>{`
        @media (max-width: 768px) {
          .hero-paladin, .hero-orc {
            display: none;
          }
        }
      `}</style>

      {/* Bottoni principali - Sempre centrati */}
      <motion.div
        style={{ display: "flex", flexDirection: "column", gap: 12, width: "100%", maxWidth: 360, zIndex: 10 }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.6 }}
      >
        {/* Crea Campagna (DM) */}
        <motion.button
          className="btn btn-gold"
          onClick={() => goTo("?create")}
          style={{ fontSize: "1rem", padding: "16px", width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <DnDIcon icon="crown" size={20} />
          Crea Campagna (Dungeon Master)
        </motion.button>

        {/* Rientra come DM */}
        <motion.button
          className="btn btn-ghost"
          onClick={() => { setShowDMReturn(!showDMReturn); closeAll(); setShowDMReturn(true); }}
          style={{ fontSize: "0.95rem", padding: "14px", width: "100%", borderColor: "rgba(212,175,55,0.4)", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <DnDIcon icon="key" size={18} />
          Rientra come Dungeon Master
        </motion.button>

        {/* Unisciti come giocatore */}
        <motion.button
          className="btn btn-ghost"
          onClick={() => { closeAll(); setShowJoin(true); }}
          style={{ fontSize: "0.95rem", padding: "14px", width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <DnDIcon icon="sword" size={18} />
          Unisciti alla Campagna (Giocatore)
        </motion.button>

        {/* Rientra con personaggio esistente */}
        <motion.button
          className="btn btn-ghost"
          onClick={() => { closeAll(); setShowReturn(true); }}
          style={{ fontSize: "0.9rem", padding: "12px", width: "100%", borderColor: "rgba(212,175,55,0.2)", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <DnDIcon icon="weapon" size={16} />
          Riprendi il tuo Personaggio
        </motion.button>

      </motion.div>

      {/* Form rientra DM */}
      <AnimatePresence>
        {showDMReturn && (
          <motion.div
            className="glass-card"
            style={{ padding: 20, width: "100%", maxWidth: 360, display: "flex", flexDirection: "column", gap: 12 }}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
          >
            <div style={{ fontFamily: "var(--font-heading)", fontSize: "0.8rem", color: "var(--gold)", letterSpacing: "0.15em" }}>
              RIENTRA COME DUNGEON MASTER
            </div>
            <input
              type="text"
              placeholder="Codice campagna (es: AB3X7K)"
              value={dmJoinCode}
              onChange={e => { setDmJoinCode(e.target.value.toUpperCase()); setJoinError(""); }}
              maxLength={10}
              style={{ textTransform: "uppercase", letterSpacing: "0.15em", textAlign: "center", fontSize: "1.1rem" }}
            />
            <input
              type="password"
              placeholder="Password DM"
              value={dmPassword}
              onChange={e => { setDmPassword(e.target.value); setJoinError(""); }}
              maxLength={30}
              onKeyDown={e => e.key === "Enter" && handleReturnDM()}
            />
            {joinError && (
              <div style={{ color: "var(--crimson-light)", fontSize: "0.8rem", textAlign: "center" }}>
                {joinError}
              </div>
            )}
            <button
              className="btn btn-gold"
              onClick={handleReturnDM}
              disabled={!dmJoinCode.trim() || !dmPassword.trim() || loading}
              style={{ opacity: (!dmJoinCode.trim() || !dmPassword.trim() || loading) ? 0.5 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}
            >
              {loading ? "Verificando..." : (
                <>
                  <DnDIcon icon="crown" size={18} />
                  Entra nel Pannello DM
                </>
              )}
            </button>
            <div style={{ fontSize: "0.72rem", color: "rgba(212,175,55,0.4)", textAlign: "center", fontStyle: "italic" }}>
              Il pannello DM si aprirà in un nuovo tab
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Form unisciti */}
      <AnimatePresence>
        {showJoin && (
          <motion.div
            className="glass-card"
            style={{ padding: 20, width: "100%", maxWidth: 360, display: "flex", flexDirection: "column", gap: 12 }}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
          >
            <label>Codice Campagna (fornito dal DM)</label>
            <input
              type="text"
              placeholder="es: DRAGON42"
              value={joinCode}
              onChange={e => { setJoinCode(e.target.value.toUpperCase()); setJoinError(""); }}
              maxLength={10}
              style={{ textTransform: "uppercase", letterSpacing: "0.15em", textAlign: "center", fontSize: "1.1rem" }}
              onKeyDown={e => e.key === "Enter" && handleJoinCampaign()}
            />
            {joinError && (
              <div style={{ color: "var(--crimson-light)", fontSize: "0.8rem", textAlign: "center" }}>
                {joinError}
              </div>
            )}
            <button
              className="btn btn-gold"
              onClick={handleJoinCampaign}
              disabled={!joinCode.trim() || loading}
              style={{ opacity: (!joinCode.trim() || loading) ? 0.5 : 1 }}
            >
              {loading ? "Cercando..." : "Entra"}
            </button>
          </motion.div>
        )}

        {showReturn && (
          <motion.div
            className="glass-card"
            style={{ padding: 20, width: "100%", maxWidth: 360, display: "flex", flexDirection: "column", gap: 12 }}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
          >
            <label>Codice Personaggio (ricevuto alla creazione)</label>
            <input
              type="text"
              placeholder="es: AB12CD"
              value={playerCode}
              onChange={e => { setPlayerCode(e.target.value.toUpperCase()); setJoinError(""); }}
              maxLength={10}
              style={{ textTransform: "uppercase", letterSpacing: "0.15em", textAlign: "center", fontSize: "1.2rem" }}
              onKeyDown={e => e.key === "Enter" && handleReturnPlayer()}
            />
            {joinError && (
              <div style={{ color: "var(--crimson-light)", fontSize: "0.8rem", textAlign: "center" }}>
                {joinError}
              </div>
            )}
            <button
              className="btn btn-gold"
              onClick={handleReturnPlayer}
              disabled={!playerCode.trim() || loading}
              style={{ opacity: (!playerCode.trim() || loading) ? 0.5 : 1 }}
            >
              {loading ? "Cercando..." : "Riprendi"}
            </button>
            <div style={{ fontSize: "0.75rem", color: "rgba(212,175,55,0.5)", textAlign: "center", fontStyle: "italic" }}>
              Il codice ti è stato mostrato dopo la creazione del personaggio.
              Chiedilo al tuo Dungeon Master se lo hai perso.
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <div style={{ color: "rgba(212,175,55,0.3)", fontSize: "0.7rem", textAlign: "center", letterSpacing: "0.1em" }}>
        DUNGEONS & DRAGONS 5a Edizione — Usa lo stesso sistema cartaceo
      </div>
    </div>
  );
}

// ── FORM CREAZIONE CAMPAGNA ──
function CreateCampaign() {
  const onBack = () => goTo("/");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [dmName, setDmName] = useState("");
  const [dmCode, setDmCode] = useState("");
  const [world, setWorld] = useState("Forgotten Realms");
  const [campaignType, setCampaignType] = useState("starter"); // "empty" o "starter"
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const worlds = ["Forgotten Realms", "Eberron", "Ravenloft", "Greyhawk", "Dragonlance", "Theros", "Ravnica", "Mondo Personalizzato"];

  const generateJoinCode = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "";
    for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
    return code;
  };

  const handleCreate = async () => {
    if (!name.trim() || !dmName.trim() || !dmCode.trim()) return;
    setLoading(true);
    setError("");

    try {
      const joinCode = generateJoinCode();
      const { data, error: err } = await supabase
        .from("campaigns")
        .insert([{
          name: name.trim(),
          description: description.trim() || null,
          dm_name: dmName.trim(),
          dm_code: dmCode.trim(),
          join_code: joinCode,
          world: world,
        }])
        .select()
        .single();

      if (err) throw err;

      // Crea sessione attiva
      await supabase.from("sessions").insert([{
        campaign_id: data.id,
        session_number: 1,
        title: "Sessione 1",
        phase: "lobby",
        is_active: true,
      }]);

      // Se Starter Set, carica automaticamente l'avventura
      if (campaignType === "starter") {
        // 1. Carica Locations
        const locationsToInsert = starterSetData.locations.map(loc => ({
          campaign_id: data.id,
          name: loc.name,
          description: loc.description,
          map_url: loc.map_url,
          music_track: loc.music_track,
          entry_point_x: loc.entry_point_x,
          entry_point_y: loc.entry_point_y,
          is_current: false,
        }));

        const { data: insertedLocations, error: locError } = await supabase
          .from("locations")
          .insert(locationsToInsert)
          .select();

        if (locError) throw locError;

        // 2. Carica POI per ogni location
        for (let i = 0; i < starterSetData.locations.length; i++) {
          const locData = starterSetData.locations[i];
          const dbLocation = insertedLocations[i];

          if (locData.pois && locData.pois.length > 0) {
            const poisToInsert = locData.pois.map(poi => ({
              location_id: dbLocation.id,
              name: poi.name,
              type: poi.type,
              x: poi.x,
              y: poi.y,
              discovered: poi.discovered,
              requires_check: poi.requires_check || null,
              check_dc: poi.check_dc || null,
              description: poi.description || null,
              interaction_text: poi.interaction_text || null,
            }));

            const { error: poiError } = await supabase
              .from("points_of_interest")
              .insert(poisToInsert);

            if (poiError) throw poiError;
          }
        }
      }

      // Naviga alla schermata "campagna creata" con i dati nell'URL
      goTo(`?created&cid=${data.id}&jc=${joinCode}&dmc=${encodeURIComponent(dmCode.trim())}&name=${encodeURIComponent(name.trim())}`);
    } catch (err) {
      console.error(err);
      setError("Errore nella creazione della campagna.");
    } finally {
      setLoading(false);
    }
  };

  const canCreate = name.trim() && dmName.trim() && dmCode.trim().length >= 4;

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "20px",
    }}>
      <div className="bg-image bg-explore" />
      <div className="bg-overlay" />
      <MusicPlayer track="explore" />

      <motion.div
        className="glass-card glass-card-dark"
        style={{ padding: 24, width: "100%", maxWidth: 440, display: "flex", flexDirection: "column", gap: 18 }}
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div style={{ textAlign: "center" }}>
          <h2 style={{ fontFamily: "var(--font-heading)", color: "var(--gold)", fontSize: "1.4rem" }}>
            Nuova Campagna
          </h2>
          <div style={{ color: "var(--parchment-dark)", fontSize: "0.85rem", marginTop: 4 }}>
            Il Dungeon Master crea il mondo
          </div>
        </div>

        {/* Tipo Campagna */}
        <div>
          <label>Tipo di Campagna</label>
          <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
            <button
              type="button"
              className={`btn ${campaignType === "starter" ? "btn-gold" : "btn-ghost"}`}
              onClick={() => setCampaignType("starter")}
              style={{
                flex: 1,
                padding: "12px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 4,
              }}
            >
              <DnDIcon icon="book" size={24} />
              <span style={{ fontSize: "0.85rem" }}>Starter Set</span>
              <span style={{ fontSize: "0.7rem", opacity: 0.7 }}>Avventura già pronta</span>
            </button>
            <button
              type="button"
              className={`btn ${campaignType === "empty" ? "btn-gold" : "btn-ghost"}`}
              onClick={() => setCampaignType("empty")}
              style={{
                flex: 1,
                padding: "12px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 4,
              }}
            >
              <DnDIcon icon="dice" size={24} />
              <span style={{ fontSize: "0.85rem" }}>Vuota</span>
              <span style={{ fontSize: "0.7rem", opacity: 0.7 }}>Costruisci da zero</span>
            </button>
          </div>
          {campaignType === "starter" && (
            <div style={{
              marginTop: 10,
              padding: 12,
              background: "rgba(212,175,55,0.1)",
              border: "1px solid rgba(212,175,55,0.3)",
              borderRadius: 6,
              fontSize: "0.75rem",
              color: "var(--parchment-dark)",
              display: "flex",
              alignItems: "flex-start",
              gap: "8px",
            }}>
              <DnDIcon icon="star" size={14} style={{ flexShrink: 0, marginTop: "2px" }} />
              <span>Includerà automaticamente <strong>"Lost Mine of Phandelver"</strong> con 3 location, 12 POI e skill checks già configurati!</span>
            </div>
          )}
        </div>

        <div>
          <label>Nome della Campagna</label>
          <input type="text" placeholder="La Maledizione di Strahd, Caos a Neverwinter..." value={name} onChange={e => setName(e.target.value)} maxLength={60} />
        </div>

        <div>
          <label>Descrizione (opzionale)</label>
          <textarea placeholder="Breve descrizione dell'avventura..." value={description} onChange={e => setDescription(e.target.value)} rows={2} maxLength={300} style={{ resize: "vertical" }} />
        </div>

        <div>
          <label>Il tuo nome (Dungeon Master)</label>
          <input type="text" placeholder="Come ti chiami?" value={dmName} onChange={e => setDmName(e.target.value)} maxLength={40} />
        </div>

        <div>
          <label>Codice DM segreto (per rientrare)</label>
          <input
            type="password"
            placeholder="Minimo 4 caratteri — RICORDATELO!"
            value={dmCode}
            onChange={e => setDmCode(e.target.value)}
            maxLength={30}
          />
          <div style={{ fontSize: "0.7rem", color: "rgba(212,175,55,0.5)", marginTop: 4 }}>
            Questo codice ti permetterà di rientrare come DM in futuro.
          </div>
        </div>

        <div>
          <label>Ambientazione</label>
          <select value={world} onChange={e => setWorld(e.target.value)}>
            {worlds.map(w => <option key={w} value={w}>{w}</option>)}
          </select>
        </div>

        {error && <div style={{ color: "var(--crimson-light)", fontSize: "0.85rem", textAlign: "center" }}>{error}</div>}

        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn btn-ghost" onClick={onBack} disabled={loading} style={{ flex: 1 }}>← Indietro</button>
          <button
            className="btn btn-gold"
            onClick={handleCreate}
            disabled={!canCreate || loading}
            style={{ flex: 2, opacity: (!canCreate || loading) ? 0.5 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}
          >
            {loading ? "Creando..." : (
              <>
                <DnDIcon icon="star" size={16} />
                Crea Campagna
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ── SCHERMATA CODICE (mostrata dopo creazione campagna) ──
function CampaignCreatedScreen() {
  const params = new URLSearchParams(window.location.search);
  const campaignId = params.get("cid");
  const joinCode = params.get("jc");
  const dmCode = params.get("dmc");
  const campaignName = params.get("name") || "Nuova Campagna";

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "20px",
      gap: 24,
    }}>
      <div className="bg-image bg-victory" />
      <div className="bg-overlay" />
      <MusicPlayer track="victory" />

      <motion.div
        style={{ textAlign: "center" }}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
      >
        <div style={{ marginBottom: 12 }}>
          <DnDIcon icon="castle" size={64} color="var(--gold)" />
        </div>
        <h2 style={{ fontFamily: "var(--font-heading)", color: "var(--gold)", fontSize: "1.6rem" }}>
          {campaignName}
        </h2>
        <div style={{ color: "var(--parchment-dark)", fontSize: "0.85rem" }}>
          Campagna creata con successo!
        </div>
      </motion.div>

      <motion.div
        className="glass-card"
        style={{ padding: 24, maxWidth: 380, width: "100%", textAlign: "center" }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div style={{ fontFamily: "var(--font-heading)", fontSize: "0.75rem", color: "var(--gold)", letterSpacing: "0.2em", marginBottom: 10 }}>
          CODICE PER I GIOCATORI
        </div>
        <div style={{
          fontFamily: "var(--font-heading)",
          fontSize: "2.5rem",
          fontWeight: "900",
          color: "var(--parchment)",
          letterSpacing: "0.3em",
          textShadow: "0 0 20px rgba(212,175,55,0.3)",
        }}>
          {joinCode}
        </div>
        <div style={{ fontSize: "0.8rem", color: "rgba(212,175,55,0.5)", marginTop: 8, fontStyle: "italic" }}>
          Condividi questo codice con i tuoi giocatori.<br />
          Lo inseriscono nella schermata principale.
        </div>
      </motion.div>

      <motion.div
        style={{ display: "flex", flexDirection: "column", gap: 12, width: "100%", maxWidth: 380 }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <button
          className="btn btn-gold"
          onClick={() => openTab(`?dm&cid=${campaignId}&dmc=${dmCode}`)}
          style={{ fontSize: "1rem", padding: "14px 32px", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}
        >
          <DnDIcon icon="crown" size={18} />
          Apri Pannello DM
        </button>

        <button
          className="btn btn-ghost"
          onClick={() => openTab(`?tv&c=${joinCode}`)}
          style={{ fontSize: "0.95rem", padding: "12px 24px", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}
        >
          <DnDIcon icon="screen" size={18} />
          Apri Schermo TV / Proiettore
        </button>

        <div style={{ fontSize: "0.75rem", color: "rgba(212,175,55,0.4)", textAlign: "center", fontStyle: "italic", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
          <DnDIcon icon="phone" size={12} />
          <span>Giocatori: aprono <strong style={{ color: "rgba(212,175,55,0.6)" }}>{window.location.origin}</strong> e inseriscono il codice <strong style={{ color: "var(--gold)" }}>{joinCode}</strong></span>
        </div>
      </motion.div>
    </div>
  );
}

// ── SCHERMATA CODICE PERSONAGGIO ──
function PlayerCodeScreen() {
  const params = new URLSearchParams(window.location.search);
  const playerCode = params.get("pc");
  const charName = params.get("name") ? decodeURIComponent(params.get("name")) : "Personaggio";

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "20px",
      gap: 24,
    }}>
      <div className="bg-image bg-victory" />
      <div className="bg-overlay" />
      <MusicPlayer track="victory" />

      <motion.div
        style={{ textAlign: "center" }}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
      >
        <div style={{ marginBottom: 12 }}>
          <DnDIcon icon="sword" size={64} color="var(--gold)" />
        </div>
        <h2 style={{ fontFamily: "var(--font-heading)", color: "var(--gold)" }}>
          {charName}
        </h2>
        <div style={{ color: "var(--parchment-dark)", fontSize: "0.85rem" }}>
          Il tuo personaggio è pronto!
        </div>
      </motion.div>

      <motion.div
        className="glass-card"
        style={{ padding: 24, maxWidth: 360, width: "100%", textAlign: "center" }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div style={{ fontFamily: "var(--font-heading)", fontSize: "0.75rem", color: "var(--gold)", letterSpacing: "0.2em", marginBottom: 10 }}>
          IL TUO CODICE PERSONAGGIO
        </div>
        <div style={{
          fontFamily: "var(--font-heading)",
          fontSize: "2.5rem",
          fontWeight: "900",
          color: "var(--parchment)",
          letterSpacing: "0.3em",
          textShadow: "0 0 20px rgba(212,175,55,0.3)",
        }}>
          {playerCode}
        </div>
        <div style={{ fontSize: "0.8rem", color: "rgba(212,175,55,0.5)", marginTop: 10, fontStyle: "italic" }}>
          ⚠️ SALVALO! Serve per tornare al tuo personaggio domani o la prossima sessione.
        </div>
      </motion.div>

      <button
        className="btn btn-gold"
        onClick={() => goTo(`?play&pc=${playerCode}`)}
        style={{ fontSize: "1rem", padding: "14px 32px", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}
      >
        <DnDIcon icon="scroll" size={18} />
        Apri la Scheda Personaggio
      </button>
    </div>
  );
}

// ── APP PRINCIPALE ──
export default function App() {
  const mode = getMode();
  const params = new URLSearchParams(window.location.search);

  // TV screen
  if (mode === "tv") {
    const joinCode = params.get("c");
    return <TVScreen joinCode={joinCode} />;
  }

  // DM Panel — legge campaign_id e dm_code dall'URL, carica da Supabase
  if (mode === "dm") {
    return <DMPanelLoader />;
  }

  // Creazione campagna
  if (mode === "dm_create") {
    return <CreateCampaign />;
  }

  // Schermata dopo creazione campagna
  if (mode === "campaign_created") {
    return <CampaignCreatedScreen />;
  }

  // Creazione personaggio (giocatore)
  if (mode === "join") {
    const campaignId = params.get("cid");
    return (
      <CharacterCreation
        campaignId={campaignId}
        onComplete={async (characterPayload) => {
          try {
            const { data, error } = await supabase
              .from("characters")
              .insert([characterPayload])
              .select()
              .single();
            if (error) throw error;
            goTo(`?pcode&pc=${data.player_code}&name=${encodeURIComponent(data.name)}`);
          } catch (err) {
            console.error("Errore salvataggio personaggio:", err);
          }
        }}
      />
    );
  }

  // Schermata codice personaggio
  if (mode === "player_code") {
    return <PlayerCodeScreen />;
  }

  // Scheda personaggio
  if (mode === "player") {
    return <CharacterSheetLoader />;
  }

  // Home page (default)
  return <HomePage />;
}

// ── LOADER DM PANEL (carica campagna da URL) ──
function DMPanelLoader() {
  const params = new URLSearchParams(window.location.search);
  const campaignId = params.get("cid");
  const dmCode = params.get("dmc");
  const [campaign, setCampaign] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!campaignId) { setError("Parametri mancanti."); return; }
    supabase.from("campaigns").select("*").eq("id", campaignId).single()
      .then(({ data, error: err }) => {
        if (err || !data) { setError("Campagna non trovata."); return; }

        // DEBUG: controllo password DM Panel
        console.log("🔍 DEBUG DM PANEL LOADER:");
        console.log("dm_code dal DB:", data.dm_code, "Type:", typeof data.dm_code);
        console.log("dmCode dall'URL:", dmCode, "Type:", typeof dmCode);
        console.log("Match:", data.dm_code === dmCode);
        console.log("Match (string):", String(data.dm_code) === String(dmCode));

        if (data.dm_code !== dmCode) { setError("Codice DM non corretto."); return; }
        setCampaign(data);
      });
  }, [campaignId, dmCode]);

  if (error) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", minHeight:"100vh", flexDirection:"column", gap:16 }}>
      <div className="bg-image bg-lobby" /><div className="bg-overlay-heavy" />
      <div style={{ color:"var(--crimson-light)", fontFamily:"var(--font-heading)" }}>{error}</div>
      <button className="btn btn-ghost" onClick={() => goTo("/")}>← Torna alla Home</button>
    </div>
  );
  if (!campaign) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", minHeight:"100vh" }}>
      <div className="bg-image bg-lobby" /><div className="bg-overlay-heavy" />
      <div style={{ color:"var(--gold)", fontFamily:"var(--font-heading)" }}>Caricamento...</div>
    </div>
  );
  return <DMPanel campaign={campaign} dmCode={dmCode} onBack={() => goTo("/")} />;
}

// ── LOADER CHARACTER SHEET (carica personaggio da URL) ──
function CharacterSheetLoader() {
  const params = new URLSearchParams(window.location.search);
  const playerCode = params.get("pc");
  const [character, setCharacter] = useState(null);
  const [campaign, setCampaign] = useState(null);
  const [session, setSession] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!playerCode) { setError("Codice personaggio mancante."); return; }
    supabase.from("characters").select("*, campaigns(*)").eq("player_code", playerCode.toUpperCase()).single()
      .then(async ({ data, error: err }) => {
        if (err || !data) { setError("Personaggio non trovato."); return; }
        setCharacter(data);
        setCampaign(data.campaigns);

        // Carica la sessione attiva per verificare la modalità
        const { data: sess } = await supabase
          .from("sessions")
          .select("*")
          .eq("campaign_id", data.campaign_id)
          .eq("is_active", true)
          .single();
        setSession(sess);
      });
  }, [playerCode]);

  if (error) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", minHeight:"100vh", flexDirection:"column", gap:16 }}>
      <div className="bg-image bg-lobby" /><div className="bg-overlay-heavy" />
      <div style={{ color:"var(--crimson-light)", fontFamily:"var(--font-heading)" }}>{error}</div>
      <button className="btn btn-ghost" onClick={() => goTo("/")}>← Torna alla Home</button>
    </div>
  );
  if (!character) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", minHeight:"100vh" }}>
      <div className="bg-image bg-lobby" /><div className="bg-overlay-heavy" />
      <div style={{ color:"var(--gold)", fontFamily:"var(--font-heading)" }}>Caricamento personaggio...</div>
    </div>
  );

  // Se la sessione è in modalità avventura, mostra AdventurePlayer
  if (session?.adventure_mode) {
    return <AdventurePlayer character={character} session={session} campaign={campaign} onBack={() => goTo("/")} />;
  }

  // Altrimenti mostra la scheda personaggio classica
  return <CharacterSheet character={character} campaign={campaign} session={session} onBack={() => goTo("/")} />;
}
