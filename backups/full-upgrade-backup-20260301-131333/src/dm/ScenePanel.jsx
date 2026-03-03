// ═══════════════════════════════════════════════
//  ScenePanel — Gestione Unificata Scene & POI
//  Un unico posto per: creare scene, uploadare mappe,
//  gestire POI, attivare scene sulla TV
//  Usa tabella "locations" + "points_of_interest"
// ═══════════════════════════════════════════════

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../lib/supabase.js";
import DnDIcon from "../shared/components/DnDIcon.jsx";

// ── Costanti ──

const POI_TYPES = [
  { id: "npc", label: "NPC", icon: "npc", color: "#60c0f0" },
  { id: "chest", label: "Scrigno", icon: "chest", color: "#d4af37" },
  { id: "door", label: "Porta", icon: "door", color: "#8b7355" },
  { id: "trap", label: "Trappola", icon: "damage", color: "#c04040" },
  { id: "secret", label: "Segreto", icon: "search", color: "#9b59b6" },
  { id: "lore", label: "Lore", icon: "scroll", color: "#e67e22" },
  { id: "hazard", label: "Pericolo", icon: "skull", color: "#e74c3c" },
];

const MUSIC_TRACKS = [
  { id: "exploration", label: "Esplorazione", icon: "explore" },
  { id: "combat", label: "Combattimento", icon: "attack" },
  { id: "city", label: "Città", icon: "castle" },
  { id: "dungeon", label: "Dungeon", icon: "dungeon" },
  { id: "tavern", label: "Taverna", icon: "merchant" },
  { id: "mystery", label: "Mistero", icon: "arcana" },
];

const SKILL_OPTIONS = [
  { id: "", label: "Nessuno (DM rivela manualmente)" },
  { id: "perception", label: "Percezione" },
  { id: "investigation", label: "Investigare" },
  { id: "athletics", label: "Atletica" },
  { id: "sleight_of_hand", label: "Rapidità di Mano" },
  { id: "stealth", label: "Furtività" },
  { id: "arcana", label: "Arcano" },
  { id: "history", label: "Storia" },
  { id: "nature", label: "Natura" },
  { id: "religion", label: "Religione" },
];

// ═══ COMPONENTE PRINCIPALE ═══

export default function ScenePanel({ campaign, session, tvChannel, onMapChanged }) {
  // State
  const [locations, setLocations] = useState([]);
  const [activeLocation, setActiveLocation] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [pois, setPois] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploadingMap, setUploadingMap] = useState(null);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAddPOI, setShowAddPOI] = useState(false);

  // Form data
  const [newLocation, setNewLocation] = useState({
    name: "", description: "", music_track: "exploration",
    entry_point_x: 50, entry_point_y: 90,
  });
  const [newPOI, setNewPOI] = useState({
    name: "", type: "npc", description: "", interaction_text: "",
    x: 50, y: 50, discovered: false, requires_check: "", check_dc: 10,
  });

  const mapImageRef = useRef(null);

  // ── Debug: Log tvChannel ──
  useEffect(() => {
    console.log("📡 ScenePanel: tvChannel ricevuto:", !!tvChannel);
    if (tvChannel) {
      console.log("✅ ScenePanel: tvChannel disponibile!");
    } else {
      console.warn("⚠️ ScenePanel: tvChannel è NULL");
    }
  }, [tvChannel]);

  // ── Carica Locations ──
  useEffect(() => {
    if (!campaign?.id) return;
    loadLocations();
  }, [campaign?.id]);

  const loadLocations = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("locations")
      .select("*")
      .eq("campaign_id", campaign.id)
      .order("created_at", { ascending: false });

    const locs = data || [];
    setLocations(locs);

    const active = locs.find(l => l.is_current);
    setActiveLocation(active || null);

    // Auto-seleziona la scena attiva
    if (active && !selectedLocation) {
      setSelectedLocation(active);
      loadPOIs(active.id);
    }

    setLoading(false);
  };

  // ── Carica POI ──
  const loadPOIs = async (locationId) => {
    const { data } = await supabase
      .from("points_of_interest")
      .select("*")
      .eq("location_id", locationId)
      .order("created_at", { ascending: true });
    setPois(data || []);
  };

  // ── Crea Location ──
  const handleCreateLocation = async () => {
    if (!newLocation.name.trim()) return;
    const { data, error } = await supabase
      .from("locations")
      .insert({ campaign_id: campaign.id, ...newLocation })
      .select()
      .single();

    if (!error && data) {
      setLocations([data, ...locations]);
      setNewLocation({ name: "", description: "", music_track: "exploration", entry_point_x: 50, entry_point_y: 90 });
      setShowCreateModal(false);
      // Auto-seleziona la nuova location
      setSelectedLocation(data);
      setPois([]);
    }
  };

  // ── Upload Mappa ──
  const handleMapUpload = async (e, locationId) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingMap(locationId);
    try {
      const ext = file.name.split('.').pop();
      const fileName = `${campaign.id}/${locationId}_${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("maps")
        .upload(fileName, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("maps")
        .getPublicUrl(fileName);

      await supabase
        .from("locations")
        .update({ map_url: publicUrl })
        .eq("id", locationId);

      // Se è la scena attiva, notifica il cambio mappa
      if (activeLocation?.id === locationId && onMapChanged) {
        onMapChanged(publicUrl);
      }

      await loadLocations();
      // Aggiorna selectedLocation se è quella a cui abbiamo uploadato
      if (selectedLocation?.id === locationId) {
        setSelectedLocation(prev => ({ ...prev, map_url: publicUrl }));
      }
    } catch (err) {
      console.error("Errore upload mappa:", err);
    } finally {
      setUploadingMap(null);
    }
  };

  // ── Attiva Scena (broadcast alla TV) ──
  const handleActivateScene = async (location) => {
    try {
      // Disattiva tutte le location
      await supabase
        .from("locations")
        .update({ is_current: false })
        .eq("campaign_id", campaign.id);

      // Attiva questa
      await supabase
        .from("locations")
        .update({ is_current: true })
        .eq("id", location.id);

      // Reset posizioni personaggi al punto d'ingresso
      const entryX = location.entry_point_x || 50;
      const entryY = location.entry_point_y || 90;
      await supabase
        .from("characters")
        .update({ map_x: entryX, map_y: entryY })
        .eq("campaign_id", campaign.id);

      // Aggiorna session
      if (session?.id) {
        await supabase
          .from("sessions")
          .update({ map_url: location.map_url })
          .eq("id", session.id);
      }

      // Broadcast alla TV
      console.log("🎬 ScenePanel: Tentativo broadcast scene_change");
      console.log("📡 tvChannel disponibile?", !!tvChannel);
      console.log("🗺️ Payload:", {
        location: location.name,
        mapUrl: location.map_url,
      });

      if (tvChannel) {
        try {
          await tvChannel.send({
            type: "broadcast",
            event: "scene_change",
            payload: {
              location: location.name,
              description: location.description,
              mapUrl: location.map_url,
              musicTrack: location.music_track,
              entryPoint: { x: entryX, y: entryY },
            },
          });
          console.log("✅ Broadcast scene_change INVIATO con successo!");
        } catch (err) {
          console.error("❌ Errore invio broadcast scene_change:", err);
        }
      } else {
        console.warn("⚠️ tvChannel NON disponibile! Broadcast non inviato.");
      }

      setActiveLocation(location);
      if (onMapChanged) onMapChanged(location.map_url);
      await loadLocations();
    } catch (err) {
      console.error("Errore attivazione scena:", err);
    }
  };

  // ── Elimina Location ──
  const handleDeleteLocation = async (locId) => {
    if (!confirm("Eliminare questa scena e tutti i suoi POI?")) return;
    // Elimina POI collegati
    await supabase.from("points_of_interest").delete().eq("location_id", locId);
    // Elimina location
    await supabase.from("locations").delete().eq("id", locId);
    if (selectedLocation?.id === locId) {
      setSelectedLocation(null);
      setPois([]);
    }
    if (activeLocation?.id === locId) {
      setActiveLocation(null);
    }
    await loadLocations();
  };

  // ── Aggiungi POI ──
  const handleAddPOI = async () => {
    if (!newPOI.name.trim() || !selectedLocation) return;
    const { data, error } = await supabase
      .from("points_of_interest")
      .insert({ location_id: selectedLocation.id, ...newPOI })
      .select()
      .single();

    if (!error && data) {
      setPois([...pois, data]);
      setNewPOI({ name: "", type: "npc", description: "", interaction_text: "", x: 50, y: 50, discovered: false, requires_check: "", check_dc: 10 });
      setShowAddPOI(false);
    }
  };

  // ── Toggle POI visibilità ──
  const togglePOIDiscovered = async (poi) => {
    const newVal = !poi.discovered;
    const { error } = await supabase
      .from("points_of_interest")
      .update({ discovered: newVal })
      .eq("id", poi.id);

    if (!error) {
      setPois(pois.map(p => p.id === poi.id ? { ...p, discovered: newVal } : p));
      // Se rivelato, broadcast alla TV
      if (newVal && tvChannel) {
        await tvChannel.send({
          type: "broadcast",
          event: "poi_revealed",
          payload: { poi: { ...poi, discovered: true } },
        });
      }
    }
  };

  // ── Elimina POI ──
  const handleDeletePOI = async (poiId) => {
    const { error } = await supabase.from("points_of_interest").delete().eq("id", poiId);
    if (!error) setPois(pois.filter(p => p.id !== poiId));
  };

  // ── Click mappa per posizionare POI ──
  const handleMapClick = (e) => {
    if (!showAddPOI || !mapImageRef.current) return;
    const rect = mapImageRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setNewPOI(prev => ({ ...prev, x, y }));
  };

  // ── Drag POI sulla mappa ──
  const handlePOIDrop = async (e, poi) => {
    if (!mapImageRef.current) return;
    const rect = mapImageRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    const { error } = await supabase
      .from("points_of_interest")
      .update({ x, y })
      .eq("id", poi.id);
    if (!error) {
      setPois(pois.map(p => p.id === poi.id ? { ...p, x, y } : p));
    }
  };

  // Helper
  const getPOIType = (typeId) => POI_TYPES.find(t => t.id === typeId) || POI_TYPES[0];

  // ═══ RENDER ═══

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: "var(--gold)", fontFamily: "var(--font-heading)" }}>
        Caricamento scene...
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

      {/* ── Header ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <DnDIcon icon="map" size={20} color="var(--gold)" />
            <h3 style={{ margin: 0, fontFamily: "var(--font-heading)", fontSize: "1.1rem", color: "var(--gold)" }}>
              Gestione Scene
            </h3>
          </div>
          {activeLocation && (
            <div style={{ fontSize: "0.75rem", color: "var(--parchment-dark)", marginTop: 4, display: "flex", alignItems: "center", gap: 6 }}>
              <DnDIcon icon="flag" size={12} color="var(--gold)" />
              Scena attiva: <strong style={{ color: "var(--parchment)" }}>{activeLocation.name}</strong>
            </div>
          )}
        </div>
        <motion.button
          className="btn btn-gold"
          onClick={() => setShowCreateModal(true)}
          style={{ padding: "8px 16px", fontSize: "0.85rem", display: "flex", alignItems: "center", gap: 8 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <DnDIcon icon="star" size={16} />
          Nuova Scena
        </motion.button>
      </div>

      {/* ── Lista Scene ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {locations.length === 0 && (
          <div style={{
            padding: 30, textAlign: "center",
            background: "rgba(212,175,55,0.03)", border: "1px dashed rgba(212,175,55,0.2)",
            borderRadius: 10,
          }}>
            <DnDIcon icon="explore" size={32} color="rgba(212,175,55,0.3)" style={{ marginBottom: 10 }} />
            <div style={{ color: "var(--parchment-dark)", fontSize: "0.85rem" }}>
              Nessuna scena creata.
            </div>
            <div style={{ color: "rgba(212,175,55,0.4)", fontSize: "0.75rem", marginTop: 4 }}>
              Crea la prima scena per iniziare l'avventura.
            </div>
          </div>
        )}

        {locations.map(loc => {
          const isActive = loc.is_current;
          const isSelected = selectedLocation?.id === loc.id;

          return (
            <motion.div
              key={loc.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                background: isActive
                  ? "linear-gradient(135deg, rgba(212,175,55,0.12), rgba(212,175,55,0.04))"
                  : isSelected
                    ? "rgba(255,255,255,0.04)"
                    : "rgba(255,255,255,0.02)",
                border: isActive
                  ? "2px solid rgba(212,175,55,0.5)"
                  : isSelected
                    ? "1px solid rgba(212,175,55,0.3)"
                    : "1px solid rgba(255,255,255,0.08)",
                borderRadius: 10,
                padding: 14,
                cursor: "pointer",
                position: "relative",
                transition: "all 0.2s",
              }}
              onClick={() => { setSelectedLocation(loc); loadPOIs(loc.id); }}
              whileHover={{ borderColor: "rgba(212,175,55,0.4)" }}
            >
              {/* Badge LIVE */}
              {isActive && (
                <div style={{
                  position: "absolute", top: -8, right: 14,
                  background: "linear-gradient(135deg, #d4af37, #b8941f)",
                  color: "#000", padding: "3px 10px", borderRadius: 4,
                  fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.08em",
                  fontFamily: "var(--font-heading)",
                  display: "flex", alignItems: "center", gap: 4,
                }}>
                  <DnDIcon icon="screen" size={10} color="#000" /> LIVE
                </div>
              )}

              <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                {/* Thumbnail mappa */}
                <div style={{
                  width: 64, height: 64, borderRadius: 8,
                  background: loc.map_url ? "none" : "rgba(212,175,55,0.06)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  overflow: "hidden", flexShrink: 0,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  {loc.map_url ? (
                    <img src={loc.map_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <DnDIcon icon="explore" size={24} color="rgba(212,175,55,0.25)" />
                  )}
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontFamily: "var(--font-heading)", color: "var(--parchment)",
                    fontSize: "0.95rem", marginBottom: 3,
                  }}>
                    {loc.name}
                  </div>
                  {loc.description && (
                    <div style={{
                      fontSize: "0.72rem", color: "var(--parchment-dark)",
                      lineHeight: 1.4, overflow: "hidden", textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}>
                      {loc.description}
                    </div>
                  )}
                  <div style={{ display: "flex", gap: 8, marginTop: 6, fontSize: "0.7rem", color: "rgba(212,175,55,0.5)" }}>
                    {loc.music_track && (
                      <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
                        <DnDIcon icon="spell" size={11} /> {loc.music_track}
                      </span>
                    )}
                    {loc.map_url && (
                      <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
                        <DnDIcon icon="map" size={11} /> Mappa
                      </span>
                    )}
                  </div>
                </div>

                {/* Azioni rapide */}
                <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                  {/* Upload mappa */}
                  <label>
                    <input
                      type="file" accept="image/*" style={{ display: "none" }}
                      onChange={(e) => handleMapUpload(e, loc.id)}
                      disabled={uploadingMap === loc.id}
                    />
                    <motion.div
                      className="btn btn-ghost"
                      style={{ padding: "6px 10px", fontSize: "0.72rem", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={(e) => { e.stopPropagation(); e.currentTarget.parentElement.querySelector('input').click(); }}
                    >
                      <DnDIcon icon={uploadingMap === loc.id ? "initiative" : "map"} size={14} />
                      {uploadingMap === loc.id ? "..." : loc.map_url ? "Cambia" : "Mappa"}
                    </motion.div>
                  </label>

                  {/* Attiva */}
                  {!isActive && (
                    <motion.button
                      className="btn btn-gold"
                      onClick={(e) => { e.stopPropagation(); handleActivateScene(loc); }}
                      style={{ padding: "6px 10px", fontSize: "0.72rem", display: "flex", alignItems: "center", gap: 4 }}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <DnDIcon icon="screen" size={14} />
                      Attiva
                    </motion.button>
                  )}

                  {/* Elimina */}
                  <motion.button
                    className="btn btn-ghost"
                    onClick={(e) => { e.stopPropagation(); handleDeleteLocation(loc.id); }}
                    style={{ padding: "6px 8px", color: "rgba(192,64,64,0.6)" }}
                    whileHover={{ scale: 1.05, color: "#c04040" }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <DnDIcon icon="close" size={14} />
                  </motion.button>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* ── Dettaglio Scena Selezionata — Mappa & POI ── */}
      {selectedLocation && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{
            background: "rgba(0,0,0,0.2)",
            border: "1px solid rgba(212,175,55,0.15)",
            borderRadius: 12, padding: 16,
          }}
        >
          {/* Header dettaglio */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <DnDIcon icon="flag" size={16} color="var(--gold)" />
              <span style={{ fontFamily: "var(--font-heading)", fontSize: "0.8rem", color: "var(--gold)", letterSpacing: "0.1em" }}>
                {selectedLocation.name} — Punti di Interesse
              </span>
            </div>
            <motion.button
              className="btn btn-ghost"
              onClick={() => setShowAddPOI(true)}
              style={{ padding: "6px 12px", fontSize: "0.75rem", display: "flex", alignItems: "center", gap: 6 }}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              <DnDIcon icon="star" size={14} /> Aggiungi POI
            </motion.button>
          </div>

          {/* Mappa con POI */}
          {selectedLocation.map_url && (
            <div
              style={{
                position: "relative", width: "100%", marginBottom: 14,
                border: "2px solid rgba(212,175,55,0.2)", borderRadius: 8,
                overflow: "hidden", cursor: showAddPOI ? "crosshair" : "default",
              }}
              onClick={handleMapClick}
              onDragOver={(e) => e.preventDefault()}
            >
              <img
                ref={mapImageRef}
                src={selectedLocation.map_url}
                alt={selectedLocation.name}
                style={{ width: "100%", display: "block" }}
              />

              {/* POI markers sulla mappa */}
              {pois.map(poi => {
                const poiType = getPOIType(poi.type);
                return (
                  <div
                    key={poi.id}
                    draggable
                    onDragEnd={(e) => handlePOIDrop(e, poi)}
                    onClick={(e) => { e.stopPropagation(); togglePOIDiscovered(poi); }}
                    title={`${poi.name} — Click per rivelare/nascondere, trascina per spostare`}
                    style={{
                      position: "absolute",
                      left: `${poi.x}%`, top: `${poi.y}%`,
                      transform: "translate(-50%, -50%)",
                      width: 30, height: 30, borderRadius: "50%",
                      background: poi.discovered ? `${poiType.color}cc` : "rgba(100,100,100,0.5)",
                      border: `2px solid ${poi.discovered ? "#fff" : "#666"}`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      cursor: "grab", opacity: poi.discovered ? 1 : 0.6,
                      boxShadow: poi.discovered ? `0 0 12px ${poiType.color}` : "none",
                      transition: "all 0.2s",
                    }}
                  >
                    {poi.discovered ? (
                      <DnDIcon icon={poiType.icon} size={14} color="#fff" />
                    ) : (
                      <DnDIcon icon="search" size={12} color="#888" />
                    )}
                  </div>
                );
              })}

              {/* Preview posizione nuovo POI */}
              {showAddPOI && (
                <motion.div
                  animate={{ scale: [1, 1.15, 1], opacity: [0.6, 1, 0.6] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  style={{
                    position: "absolute",
                    left: `${newPOI.x}%`, top: `${newPOI.y}%`,
                    transform: "translate(-50%, -50%)",
                    width: 30, height: 30, borderRadius: "50%",
                    background: "rgba(212,175,55,0.4)",
                    border: "2px dashed var(--gold)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}
                >
                  <DnDIcon icon="star" size={14} color="var(--gold)" />
                </motion.div>
              )}
            </div>
          )}

          {/* Se non c'è mappa */}
          {!selectedLocation.map_url && (
            <div style={{
              padding: 24, textAlign: "center",
              background: "rgba(212,175,55,0.03)", border: "1px dashed rgba(212,175,55,0.15)",
              borderRadius: 8, marginBottom: 14,
            }}>
              <DnDIcon icon="map" size={28} color="rgba(212,175,55,0.25)" />
              <div style={{ color: "var(--parchment-dark)", fontSize: "0.8rem", marginTop: 8 }}>
                Nessuna mappa caricata per questa scena.
              </div>
              <div style={{ color: "rgba(212,175,55,0.4)", fontSize: "0.7rem", marginTop: 4 }}>
                Carica una mappa per posizionare i POI visivamente.
              </div>
            </div>
          )}

          {/* Lista POI */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {pois.map(poi => {
              const poiType = getPOIType(poi.type);
              return (
                <div
                  key={poi.id}
                  style={{
                    background: "rgba(0,0,0,0.25)",
                    border: `1px solid ${poi.discovered ? `${poiType.color}40` : "rgba(100,100,100,0.2)"}`,
                    borderLeft: `3px solid ${poi.discovered ? poiType.color : "#555"}`,
                    borderRadius: "0 6px 6px 0",
                    padding: "10px 12px",
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1 }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: "50%",
                      background: `${poiType.color}20`, border: `1px solid ${poiType.color}`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      <DnDIcon icon={poiType.icon} size={14} color={poiType.color} />
                    </div>
                    <div>
                      <div style={{ fontSize: "0.82rem", color: "var(--parchment)" }}>
                        {poi.name}
                        {!poi.discovered && (
                          <span style={{ color: "#777", fontSize: "0.7rem", marginLeft: 6, fontStyle: "italic" }}>
                            (nascosto)
                          </span>
                        )}
                      </div>
                      {poi.description && (
                        <div style={{ fontSize: "0.68rem", color: "var(--parchment-dark)", marginTop: 2 }}>
                          {poi.description}
                        </div>
                      )}
                      {poi.requires_check && (
                        <div style={{ fontSize: "0.65rem", color: "rgba(212,175,55,0.5)", marginTop: 2 }}>
                          Richiede: {poi.requires_check} (CD {poi.check_dc})
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                    <button
                      className="btn btn-ghost"
                      onClick={() => togglePOIDiscovered(poi)}
                      style={{ padding: "4px 10px", fontSize: "0.68rem", display: "flex", alignItems: "center", gap: 4 }}
                    >
                      <DnDIcon icon={poi.discovered ? "invisible" : "perception"} size={12} />
                      {poi.discovered ? "Nascondi" : "Rivela"}
                    </button>
                    <button
                      className="btn btn-ghost"
                      onClick={() => handleDeletePOI(poi.id)}
                      style={{ padding: "4px 8px", color: "rgba(192,64,64,0.5)" }}
                    >
                      <DnDIcon icon="close" size={12} />
                    </button>
                  </div>
                </div>
              );
            })}

            {pois.length === 0 && (
              <div style={{ textAlign: "center", color: "rgba(212,175,55,0.35)", fontStyle: "italic", padding: 16, fontSize: "0.8rem" }}>
                Nessun punto di interesse.
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* ═══ MODAL: Crea Scena ═══ */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setShowCreateModal(false)}
          >
            <motion.div
              className="glass-card"
              style={{ padding: 24, maxWidth: 480, width: "100%" }}
              initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
                <DnDIcon icon="star" size={22} color="var(--gold)" />
                <h3 style={{ fontFamily: "var(--font-heading)", color: "var(--gold)", margin: 0, fontSize: "1.15rem" }}>
                  Nuova Scena
                </h3>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div>
                  <label>Nome Scena</label>
                  <input
                    type="text" autoFocus
                    value={newLocation.name}
                    onChange={(e) => setNewLocation({ ...newLocation, name: e.target.value })}
                    placeholder="es: Taverna del Drago Rosso"
                  />
                </div>
                <div>
                  <label>Descrizione</label>
                  <textarea
                    value={newLocation.description}
                    onChange={(e) => setNewLocation({ ...newLocation, description: e.target.value })}
                    placeholder="Descrivi il luogo..."
                    rows={3}
                  />
                </div>
                <div>
                  <label>Musica Ambientale</label>
                  <select
                    value={newLocation.music_track}
                    onChange={(e) => setNewLocation({ ...newLocation, music_track: e.target.value })}
                  >
                    {MUSIC_TRACKS.map(track => (
                      <option key={track.id} value={track.id}>{track.label}</option>
                    ))}
                  </select>
                </div>
                <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                  <button className="btn btn-ghost" onClick={() => setShowCreateModal(false)} style={{ flex: 1 }}>
                    Annulla
                  </button>
                  <button
                    className="btn btn-gold" onClick={handleCreateLocation}
                    disabled={!newLocation.name.trim()}
                    style={{ flex: 1, opacity: !newLocation.name.trim() ? 0.5 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
                  >
                    <DnDIcon icon="check" size={16} /> Crea Scena
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ MODAL: Aggiungi POI ═══ */}
      <AnimatePresence>
        {showAddPOI && (
          <motion.div
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setShowAddPOI(false)}
          >
            <motion.div
              className="glass-card"
              style={{ padding: 24, maxWidth: 480, width: "100%" }}
              initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
                <DnDIcon icon="flag" size={22} color="var(--gold)" />
                <h3 style={{ fontFamily: "var(--font-heading)", color: "var(--gold)", margin: 0, fontSize: "1.1rem" }}>
                  Nuovo Punto di Interesse
                </h3>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div>
                  <label>Nome</label>
                  <input
                    type="text" autoFocus
                    value={newPOI.name}
                    onChange={(e) => setNewPOI({ ...newPOI, name: e.target.value })}
                    placeholder="es: Barista Nano, Forziere Nascosto"
                  />
                </div>
                <div>
                  <label>Tipo</label>
                  <select value={newPOI.type} onChange={(e) => setNewPOI({ ...newPOI, type: e.target.value })}>
                    {POI_TYPES.map(t => (
                      <option key={t.id} value={t.id}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label>Descrizione</label>
                  <textarea
                    value={newPOI.description}
                    onChange={(e) => setNewPOI({ ...newPOI, description: e.target.value })}
                    placeholder="Cosa vedono i giocatori..."
                    rows={2}
                  />
                </div>
                <div>
                  <label>Testo di interazione (opzionale)</label>
                  <textarea
                    value={newPOI.interaction_text}
                    onChange={(e) => setNewPOI({ ...newPOI, interaction_text: e.target.value })}
                    placeholder="Cosa succede quando il giocatore interagisce..."
                    rows={2}
                  />
                </div>
                <div>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={newPOI.discovered}
                      onChange={(e) => setNewPOI({ ...newPOI, discovered: e.target.checked })}
                      style={{ width: "auto" }}
                    />
                    Visibile ai giocatori dall'inizio
                  </label>
                </div>

                {!newPOI.discovered && (
                  <>
                    <div>
                      <label>Skill Check per rivelare</label>
                      <select
                        value={newPOI.requires_check || ""}
                        onChange={(e) => setNewPOI({ ...newPOI, requires_check: e.target.value || null })}
                      >
                        {SKILL_OPTIONS.map(s => (
                          <option key={s.id} value={s.id}>{s.label}</option>
                        ))}
                      </select>
                    </div>
                    {newPOI.requires_check && (
                      <div>
                        <label>CD (Classe Difficoltà)</label>
                        <input
                          type="number" min="5" max="30"
                          value={newPOI.check_dc}
                          onChange={(e) => setNewPOI({ ...newPOI, check_dc: parseInt(e.target.value) || 10 })}
                        />
                        <div style={{ fontSize: "0.68rem", color: "var(--parchment-dark)", marginTop: 4 }}>
                          Facile: 10 | Medio: 15 | Difficile: 20 | Molto Difficile: 25
                        </div>
                      </div>
                    )}
                  </>
                )}

                {selectedLocation?.map_url && (
                  <div style={{
                    fontSize: "0.72rem", color: "var(--parchment-dark)",
                    background: "rgba(212,175,55,0.05)", padding: "8px 12px", borderRadius: 6,
                    display: "flex", alignItems: "center", gap: 6,
                  }}>
                    <DnDIcon icon="compass" size={13} color="rgba(212,175,55,0.5)" />
                    Clicca sulla mappa per posizionare il POI (X: {newPOI.x.toFixed(0)}%, Y: {newPOI.y.toFixed(0)}%)
                  </div>
                )}

                <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                  <button className="btn btn-ghost" onClick={() => setShowAddPOI(false)} style={{ flex: 1 }}>
                    Annulla
                  </button>
                  <button
                    className="btn btn-gold" onClick={handleAddPOI}
                    disabled={!newPOI.name.trim()}
                    style={{ flex: 1, opacity: !newPOI.name.trim() ? 0.5 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
                  >
                    <DnDIcon icon="check" size={16} /> Aggiungi
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
