// ═══════════════════════════════════════════════
//  LocationManager — Gestione Scene e POI
//  DM può creare locations, aggiungere POI, cambiare scena
// ═══════════════════════════════════════════════

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../lib/supabase.js";

const POI_TYPES = [
  { id: "npc", label: "👤 NPC", color: "#60c0f0" },
  { id: "chest", label: "📦 Scrigno", color: "#d4af37" },
  { id: "door", label: "🚪 Porta", color: "#8b7355" },
  { id: "trap", label: "⚠️ Trappola", color: "#c04040" },
  { id: "secret", label: "🔍 Segreto", color: "#9b59b6" },
  { id: "lore", label: "📜 Lore", color: "#e67e22" },
  { id: "hazard", label: "☠️ Pericolo", color: "#e74c3c" },
];

const MUSIC_TRACKS = [
  { id: "exploration", label: "🎵 Esplorazione" },
  { id: "combat", label: "⚔️ Combattimento" },
  { id: "city", label: "🏛️ Città" },
  { id: "dungeon", label: "🕳️ Dungeon" },
  { id: "tavern", label: "🍺 Taverna" },
  { id: "mystery", label: "🔮 Mistero" },
];

const CLASS_ICONS = {
  barbarian:"⚔️", bard:"🎸", cleric:"✝️", druid:"🌿", fighter:"🗡️",
  monk:"🥋", paladin:"🛡️", ranger:"🏹", rogue:"🔪", sorcerer:"⚡",
  warlock:"🌑", wizard:"📚",
};

export default function LocationManager({ campaign, session }) {
  const [locations, setLocations] = useState([]);
  const [characters, setCharacters] = useState([]);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [pois, setPois] = useState([]);
  const [showCreateLocation, setShowCreateLocation] = useState(false);
  const [showAddPOI, setShowAddPOI] = useState(false);
  const [newLocation, setNewLocation] = useState({
    name: "",
    description: "",
    music_track: "exploration",
    entry_point_x: 50,
    entry_point_y: 90,
  });
  const [newPOI, setNewPOI] = useState({
    name: "",
    type: "npc",
    description: "",
    x: 50,
    y: 50,
    discovered: false,
    requires_check: "",
    check_dc: 10,
  });
  const [uploadingMap, setUploadingMap] = useState(false);
  const [draggingPOI, setDraggingPOI] = useState(null);
  const mapImageRef = useRef(null);

  // Carica locations
  useEffect(() => {
    if (!campaign?.id) return;
    loadLocations();
  }, [campaign?.id]);

  const loadLocations = async () => {
    const { data } = await supabase
      .from("locations")
      .select("*")
      .eq("campaign_id", campaign.id)
      .order("created_at", { ascending: false });

    setLocations(data || []);

    const current = data?.find(l => l.is_current);
    setCurrentLocation(current || null);
    if (current) {
      setSelectedLocation(current);
      loadPOIs(current.id);
    }
  };

  // Carica POI di una location
  const loadPOIs = async (locationId) => {
    const { data } = await supabase
      .from("points_of_interest")
      .select("*")
      .eq("location_id", locationId)
      .order("created_at", { ascending: true });

    setPois(data || []);
  };

  // Crea nuova location
  const handleCreateLocation = async () => {
    if (!newLocation.name.trim()) return;

    const { data, error } = await supabase
      .from("locations")
      .insert({
        campaign_id: campaign.id,
        ...newLocation,
      })
      .select()
      .single();

    if (!error) {
      setLocations([data, ...locations]);
      setNewLocation({ name: "", description: "", music_track: "exploration" });
      setShowCreateLocation(false);
    }
  };

  // Upload mappa
  const handleMapUpload = async (e, locationId) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingMap(true);
    try {
      const ext = file.name.split('.').pop();
      const fileName = `${campaign.id}/${locationId}_${Date.now()}.${ext}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
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

      loadLocations();
    } catch (err) {
      console.error("Errore upload mappa:", err);
    } finally {
      setUploadingMap(false);
    }
  };

  // Cambia scena (broadcast alla TV)
  const handleChangeScene = async (location) => {
    // Imposta come current (disattiva altre location)
    await supabase
      .from("locations")
      .update({ is_current: false })
      .eq("campaign_id", campaign.id);

    await supabase
      .from("locations")
      .update({ is_current: true })
      .eq("id", location.id);

    // Reset posizioni di tutti i personaggi al punto d'ingresso
    const entryX = location.entry_point_x || 50;
    const entryY = location.entry_point_y || 90;

    await supabase
      .from("characters")
      .update({
        map_x: entryX,
        map_y: entryY,
      })
      .eq("campaign_id", campaign.id);

    // Aggiorna session con nuova mappa
    if (session?.id) {
      await supabase
        .from("sessions")
        .update({ map_url: location.map_url })
        .eq("id", session.id);

      // Broadcast alla TV
      const tvChannel = supabase.channel(`session-tv-${session.id}`);
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
    }

    setCurrentLocation(location);
    loadLocations();
  };

  // Aggiungi POI
  const handleAddPOI = async () => {
    if (!newPOI.name.trim() || !selectedLocation) return;

    const { data, error } = await supabase
      .from("points_of_interest")
      .insert({
        location_id: selectedLocation.id,
        ...newPOI,
      })
      .select()
      .single();

    if (!error) {
      setPois([...pois, data]);
      setNewPOI({
        name: "",
        type: "npc",
        description: "",
        x: 50,
        y: 50,
        discovered: false,
        requires_check: "",
        check_dc: 10,
      });
      setShowAddPOI(false);
    }
  };

  // Toggle discovered POI
  const togglePOIDiscovered = async (poi) => {
    const newDiscovered = !poi.discovered;

    const { error } = await supabase
      .from("points_of_interest")
      .update({ discovered: newDiscovered })
      .eq("id", poi.id);

    if (!error) {
      setPois(pois.map(p => p.id === poi.id ? { ...p, discovered: newDiscovered } : p));

      // Se rivelato, broadcast alla TV
      if (newDiscovered && session?.id) {
        const tvChannel = supabase.channel(`session-tv-${session.id}`);
        await tvChannel.send({
          type: "broadcast",
          event: "poi_revealed",
          payload: {
            poi: { ...poi, discovered: true },
          },
        });
      }
    }
  };

  // Elimina POI
  const handleDeletePOI = async (poiId) => {
    const { error } = await supabase
      .from("points_of_interest")
      .delete()
      .eq("id", poiId);

    if (!error) {
      setPois(pois.filter(p => p.id !== poiId));
    }
  };

  // Click sulla mappa per posizionare POI
  const handleMapClick = (e) => {
    if (!showAddPOI || !mapImageRef.current) return;

    const rect = mapImageRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    setNewPOI(prev => ({ ...prev, x, y }));
  };

  // Drag & Drop POI
  const handlePOIDragStart = (e, poi) => {
    e.stopPropagation();
    setDraggingPOI(poi);
  };

  const handlePOIDragOver = (e) => {
    e.preventDefault();
  };

  const handlePOIDrop = async (e) => {
    e.preventDefault();
    if (!draggingPOI || !mapImageRef.current) return;

    const rect = mapImageRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    // Aggiorna posizione POI nel database
    const { error } = await supabase
      .from("points_of_interest")
      .update({ x, y })
      .eq("id", draggingPOI.id);

    if (!error) {
      setPois(pois.map(p => p.id === draggingPOI.id ? { ...p, x, y } : p));
    }

    setDraggingPOI(null);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, padding: 16 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2 style={{ fontFamily: "var(--font-heading)", color: "var(--gold)", fontSize: "1.2rem", margin: 0 }}>
            Gestione Scene
          </h2>
          {currentLocation && (
            <div style={{ fontSize: "0.75rem", color: "var(--parchment-dark)", marginTop: 4 }}>
              📍 Scena attuale: <strong>{currentLocation.name}</strong>
            </div>
          )}
        </div>
        <button
          className="btn btn-gold"
          onClick={() => setShowCreateLocation(true)}
          style={{ padding: "8px 16px", fontSize: "0.85rem" }}
        >
          ➕ Nuova Location
        </button>
      </div>

      {/* Lista Locations */}
      <div className="glass-card" style={{ padding: 16 }}>
        <div style={{ fontFamily: "var(--font-heading)", fontSize: "0.7rem", color: "var(--gold)", letterSpacing: "0.15em", marginBottom: 12 }}>
          LOCATIONS ({locations.length})
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {locations.map(loc => (
            <div
              key={loc.id}
              style={{
                background: loc.is_current ? "rgba(212,175,55,0.1)" : "rgba(0,0,0,0.3)",
                border: `1px solid ${loc.is_current ? "var(--gold)" : "rgba(212,175,55,0.2)"}`,
                borderRadius: 8,
                padding: 12,
                cursor: "pointer",
                transition: "all 0.2s",
              }}
              onClick={() => {
                setSelectedLocation(loc);
                loadPOIs(loc.id);
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: "var(--font-heading)", color: "var(--parchment)", fontSize: "0.9rem" }}>
                    {loc.is_current && "📍 "}{loc.name}
                  </div>
                  <div style={{ fontSize: "0.7rem", color: "var(--parchment-dark)", marginTop: 2 }}>
                    {loc.description || "Nessuna descrizione"}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <label style={{ cursor: "pointer" }}>
                    <input
                      type="file"
                      accept="image/*"
                      style={{ display: "none" }}
                      onChange={(e) => handleMapUpload(e, loc.id)}
                    />
                    <span className="btn btn-ghost" style={{ padding: "6px 12px", fontSize: "0.75rem" }}>
                      {loc.map_url ? "🗺️ Cambia" : "📤 Upload"}
                    </span>
                  </label>
                  {!loc.is_current && (
                    <button
                      className="btn btn-gold"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleChangeScene(loc);
                      }}
                      style={{ padding: "6px 12px", fontSize: "0.75rem" }}
                    >
                      ▶ Attiva
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* POI della location selezionata */}
      {selectedLocation && (
        <div className="glass-card" style={{ padding: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div style={{ fontFamily: "var(--font-heading)", fontSize: "0.7rem", color: "var(--gold)", letterSpacing: "0.15em" }}>
              POINTS OF INTEREST - {selectedLocation.name}
            </div>
            <button
              className="btn btn-ghost"
              onClick={() => setShowAddPOI(true)}
              style={{ padding: "6px 12px", fontSize: "0.75rem" }}
            >
              ➕ Aggiungi POI
            </button>
          </div>

          {/* Mappa con POI */}
          {selectedLocation.map_url && (
            <div
              style={{
                position: "relative",
                width: "100%",
                marginBottom: 16,
                border: "2px solid rgba(212,175,55,0.3)",
                borderRadius: 8,
                overflow: "hidden",
                cursor: showAddPOI ? "crosshair" : "default",
              }}
              onClick={handleMapClick}
              onDragOver={handlePOIDragOver}
              onDrop={handlePOIDrop}
            >
              <img
                ref={mapImageRef}
                src={selectedLocation.map_url}
                alt={selectedLocation.name}
                style={{ width: "100%", display: "block" }}
              />

              {/* Render POI sulla mappa */}
              {pois.map(poi => {
                const poiType = POI_TYPES.find(t => t.id === poi.type);
                const isDragging = draggingPOI?.id === poi.id;
                return (
                  <div
                    key={poi.id}
                    draggable
                    onDragStart={(e) => handlePOIDragStart(e, poi)}
                    style={{
                      position: "absolute",
                      left: `${poi.x}%`,
                      top: `${poi.y}%`,
                      transform: "translate(-50%, -50%)",
                      width: 32,
                      height: 32,
                      borderRadius: "50%",
                      background: poi.discovered ? poiType?.color : "rgba(100,100,100,0.5)",
                      border: `2px solid ${poi.discovered ? "#fff" : "#666"}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "0.9rem",
                      cursor: isDragging ? "grabbing" : "grab",
                      opacity: isDragging ? 0.5 : (poi.discovered ? 1 : 0.6),
                      boxShadow: poi.discovered ? `0 0 15px ${poiType?.color}` : "none",
                      transition: isDragging ? "none" : "all 0.2s",
                    }}
                    title={`${poi.name} - Trascina per spostare, click per rivelare/nascondere`}
                    onClick={(e) => {
                      e.stopPropagation();
                      togglePOIDiscovered(poi);
                    }}
                  >
                    {poi.discovered ? poiType?.label.split(" ")[0] : "?"}
                  </div>
                );
              })}

              {/* Posizione nuovo POI */}
              {showAddPOI && (
                <div
                  style={{
                    position: "absolute",
                    left: `${newPOI.x}%`,
                    top: `${newPOI.y}%`,
                    transform: "translate(-50%, -50%)",
                    width: 32,
                    height: 32,
                    borderRadius: "50%",
                    background: "rgba(212,175,55,0.5)",
                    border: "2px dashed var(--gold)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "1rem",
                    animation: "pulse 1s infinite",
                  }}
                >
                  ➕
                </div>
              )}
            </div>
          )}

          {/* Lista POI */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {pois.map(poi => {
              const poiType = POI_TYPES.find(t => t.id === poi.type);
              return (
                <div
                  key={poi.id}
                  style={{
                    background: "rgba(0,0,0,0.3)",
                    border: `1px solid ${poi.discovered ? poiType?.color : "rgba(100,100,100,0.3)"}`,
                    borderRadius: 6,
                    padding: 10,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "0.85rem", color: "var(--parchment)" }}>
                      {poiType?.label} {poi.name}
                      {!poi.discovered && <span style={{ color: "#888", marginLeft: 6 }}>(nascosto)</span>}
                    </div>
                    {poi.description && (
                      <div style={{ fontSize: "0.7rem", color: "var(--parchment-dark)", marginTop: 2 }}>
                        {poi.description}
                      </div>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button
                      className="btn btn-ghost"
                      onClick={() => togglePOIDiscovered(poi)}
                      style={{ padding: "4px 10px", fontSize: "0.7rem" }}
                    >
                      {poi.discovered ? "👁️ Nascondi" : "👁️ Rivela"}
                    </button>
                    <button
                      className="btn btn-ghost"
                      onClick={() => handleDeletePOI(poi.id)}
                      style={{ padding: "4px 10px", fontSize: "0.7rem", color: "#c04040" }}
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              );
            })}
            {pois.length === 0 && (
              <div style={{ textAlign: "center", color: "rgba(212,175,55,0.4)", fontStyle: "italic", padding: 20 }}>
                Nessun POI. Clicca "Aggiungi POI" per iniziare.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal: Crea Location */}
      <AnimatePresence>
        {showCreateLocation && (
          <motion.div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.85)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 1000,
              padding: 20,
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowCreateLocation(false)}
          >
            <motion.div
              className="glass-card"
              style={{ padding: 24, maxWidth: 500, width: "100%" }}
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 style={{ fontFamily: "var(--font-heading)", color: "var(--gold)", marginBottom: 16 }}>
                Nuova Location
              </h3>

              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div>
                  <label>Nome Location</label>
                  <input
                    type="text"
                    value={newLocation.name}
                    onChange={(e) => setNewLocation({ ...newLocation, name: e.target.value })}
                    placeholder="es: Taverna del Drago Rosso"
                    autoFocus
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

                <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
                  <button
                    className="btn btn-ghost"
                    onClick={() => setShowCreateLocation(false)}
                    style={{ flex: 1 }}
                  >
                    Annulla
                  </button>
                  <button
                    className="btn btn-gold"
                    onClick={handleCreateLocation}
                    style={{ flex: 1 }}
                    disabled={!newLocation.name.trim()}
                  >
                    Crea Location
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal: Aggiungi POI */}
      <AnimatePresence>
        {showAddPOI && (
          <motion.div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.85)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 1000,
              padding: 20,
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowAddPOI(false)}
          >
            <motion.div
              className="glass-card"
              style={{ padding: 24, maxWidth: 500, width: "100%" }}
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 style={{ fontFamily: "var(--font-heading)", color: "var(--gold)", marginBottom: 16 }}>
                Nuovo Point of Interest
              </h3>

              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div>
                  <label>Nome POI</label>
                  <input
                    type="text"
                    value={newPOI.name}
                    onChange={(e) => setNewPOI({ ...newPOI, name: e.target.value })}
                    placeholder="es: Barista Nano"
                    autoFocus
                  />
                </div>

                <div>
                  <label>Tipo</label>
                  <select
                    value={newPOI.type}
                    onChange={(e) => setNewPOI({ ...newPOI, type: e.target.value })}
                  >
                    {POI_TYPES.map(type => (
                      <option key={type.id} value={type.id}>{type.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label>Descrizione</label>
                  <textarea
                    value={newPOI.description}
                    onChange={(e) => setNewPOI({ ...newPOI, description: e.target.value })}
                    placeholder="Descrivi cosa vedono i giocatori..."
                    rows={2}
                  />
                </div>

                <div>
                  <label>
                    <input
                      type="checkbox"
                      checked={newPOI.discovered}
                      onChange={(e) => setNewPOI({ ...newPOI, discovered: e.target.checked })}
                      style={{ width: "auto", marginRight: 8 }}
                    />
                    Visibile ai giocatori dall'inizio
                  </label>
                </div>

                {!newPOI.discovered && (
                  <>
                    <div>
                      <label>Richiede Skill Check (per rivelare)</label>
                      <select
                        value={newPOI.requires_check || ""}
                        onChange={(e) => setNewPOI({ ...newPOI, requires_check: e.target.value || null })}
                      >
                        <option value="">Nessuno (DM rivela manualmente)</option>
                        <option value="perception">Percezione</option>
                        <option value="investigation">Investigare</option>
                        <option value="athletics">Atletica</option>
                        <option value="sleight_of_hand">Rapidità di Mano</option>
                        <option value="stealth">Furtività</option>
                        <option value="arcana">Arcano</option>
                        <option value="history">Storia</option>
                        <option value="nature">Natura</option>
                        <option value="religion">Religione</option>
                      </select>
                    </div>

                    {newPOI.requires_check && (
                      <div>
                        <label>CD (Classe Difficoltà)</label>
                        <input
                          type="number"
                          value={newPOI.check_dc || 10}
                          onChange={(e) => setNewPOI({ ...newPOI, check_dc: parseInt(e.target.value) })}
                          min="5"
                          max="30"
                          placeholder="es: 15"
                        />
                        <div style={{ fontSize: "0.7rem", color: "var(--parchment-dark)", marginTop: 4 }}>
                          🟡 Facile: 10 | 🟢 Medio: 15 | 🟠 Difficile: 20 | 🔴 Molto Difficile: 25
                        </div>
                      </div>
                    )}
                  </>
                )}

                <div style={{ fontSize: "0.75rem", color: "var(--parchment-dark)" }}>
                  💡 Clicca sulla mappa sopra per posizionare il POI (X: {newPOI.x.toFixed(1)}%, Y: {newPOI.y.toFixed(1)}%)
                </div>

                <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
                  <button
                    className="btn btn-ghost"
                    onClick={() => setShowAddPOI(false)}
                    style={{ flex: 1 }}
                  >
                    Annulla
                  </button>
                  <button
                    className="btn btn-gold"
                    onClick={handleAddPOI}
                    style={{ flex: 1 }}
                    disabled={!newPOI.name.trim()}
                  >
                    Aggiungi POI
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.6; transform: translate(-50%, -50%) scale(1); }
          50% { opacity: 1; transform: translate(-50%, -50%) scale(1.1); }
        }
      `}</style>
    </div>
  );
}
