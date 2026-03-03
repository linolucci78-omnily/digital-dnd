// ═══════════════════════════════════════════════
//  NPCManager — Gestione NPC con stat blocks
//  Il DM crea NPC completi con statistiche D&D
// ═══════════════════════════════════════════════

import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase.js";
import DnDIcon from "../shared/components/DnDIcon.jsx";
import { motion, AnimatePresence } from "framer-motion";
import ModalDialog from "../shared/components/ModalDialog.jsx";

const ATTITUDES = [
  { id: "friendly", label: "Amichevole", color: "#60e060", icon: "heart" },
  { id: "neutral", label: "Neutrale", color: "#d4af37", icon: "npc" },
  { id: "hostile", label: "Ostile", color: "#c04040", icon: "skull" },
];

const NPC_CLASSES = [
  "Guerriero", "Mago", "Chierico", "Ladro", "Ranger", "Paladino", "Barbaro", "Bardo",
  "Druido", "Monaco", "Stregone", "Warlock", "Mercante", "Guardia", "Nobile", "Contadino", "Artigiano"
];

export default function NPCManager({ campaign, onAddToCombat, onHostileNPCCreated }) {
  const [npcs, setNpcs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingNPC, setEditingNPC] = useState(null);
  const [showForm, setShowForm] = useState(false);

  // Modal state
  const [modal, setModal] = useState({ isOpen: false, type: "alert", title: "", message: "", onConfirm: null });

  // Avatar upload state
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [uploading, setUploading] = useState(false);

  // Filtri e Ricerca
  const [searchQuery, setSearchQuery] = useState("");
  const [filterAttitude, setFilterAttitude] = useState("all");
  const [filterClass, setFilterClass] = useState("all");
  const [filterLocation, setFilterLocation] = useState("all");
  const [sortBy, setSortBy] = useState("created"); // created, name, level, hp
  const [groupByAttitude, setGroupByAttitude] = useState(false);

  // Pannello Dettaglio
  const [selectedNPC, setSelectedNPC] = useState(null);

  // Form state
  const [form, setForm] = useState({
    name: "",
    class: "Mercante",
    level: 1,
    race: "Umano",
    attitude: "neutral",
    hp_max: 10,
    hp_current: 10,
    armor_class: 10,
    strength: 10,
    dexterity: 10,
    constitution: 10,
    intelligence: 10,
    wisdom: 10,
    charisma: 10,
    description: "",
    location: "",
    special_abilities: "",
    inventory_notes: "",
    avatar_url: "",
    tags: "", // Tag personalizzati separati da virgola
  });

  useEffect(() => {
    if (campaign?.id) loadNPCs();
  }, [campaign?.id]);

  const loadNPCs = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("npcs")
      .select("*")
      .eq("campaign_id", campaign.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Errore caricamento NPC:", error);
      // Se la tabella non esiste, mostra array vuoto
      setNpcs([]);
    } else {
      setNpcs(data || []);
    }
    setLoading(false);
  };

  const getMod = (score) => Math.floor((score - 10) / 2);

  // Estrai tutte le località uniche dagli NPC
  const getUniqueLocations = () => {
    const locations = npcs
      .map(npc => npc.location)
      .filter(loc => loc && loc.trim() !== "");
    return [...new Set(locations)].sort();
  };

  // Filtra e ordina gli NPC
  const getFilteredAndSortedNPCs = () => {
    let filtered = [...npcs];

    // Ricerca per nome/descrizione
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(npc =>
        npc.name?.toLowerCase().includes(query) ||
        npc.description?.toLowerCase().includes(query) ||
        npc.tags?.toLowerCase().includes(query) ||
        npc.location?.toLowerCase().includes(query)
      );
    }

    // Filtro per atteggiamento
    if (filterAttitude !== "all") {
      filtered = filtered.filter(npc => npc.attitude === filterAttitude);
    }

    // Filtro per classe
    if (filterClass !== "all") {
      filtered = filtered.filter(npc => npc.class === filterClass);
    }

    // Filtro per località
    if (filterLocation !== "all") {
      filtered = filtered.filter(npc => npc.location === filterLocation);
    }

    // Ordinamento
    switch (sortBy) {
      case "name":
        filtered.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
        break;
      case "level":
        filtered.sort((a, b) => (b.level || 0) - (a.level || 0));
        break;
      case "hp":
        filtered.sort((a, b) => (b.hp_max || 0) - (a.hp_max || 0));
        break;
      case "created":
      default:
        // Già ordinati per created_at dal database
        break;
    }

    return filtered;
  };

  // Raggruppa NPC per atteggiamento
  const getGroupedNPCs = () => {
    const filtered = getFilteredAndSortedNPCs();
    if (!groupByAttitude) {
      return { all: filtered };
    }

    const grouped = {
      friendly: [],
      neutral: [],
      hostile: []
    };

    filtered.forEach(npc => {
      const attitude = npc.attitude || "neutral";
      if (grouped[attitude]) {
        grouped[attitude].push(npc);
      }
    });

    return grouped;
  };

  // Gestione selezione file avatar
  const handleAvatarSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Controlla dimensione (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setModal({
        isOpen: true,
        type: "error",
        title: "File Troppo Grande",
        message: `Immagine troppo grande (${(file.size / 1024 / 1024).toFixed(1)} MB).\n\nMassimo: 5 MB`,
        confirmText: "OK",
      });
      return;
    }

    setAvatarFile(file);

    // Crea preview locale
    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatarPreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  // Upload avatar su Supabase Storage
  const uploadAvatar = async () => {
    if (!avatarFile || !campaign?.id) return null;

    try {
      const ext = avatarFile.name.split('.').pop();
      const fileName = `${campaign.id}/npcs/${form.name.replace(/\s+/g, '_')}_${Date.now()}.${ext}`;

      console.log(`📤 Upload avatar NPC: ${fileName}`);

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, avatarFile, { upsert: true });

      if (uploadError) {
        console.error("❌ Errore upload avatar:", uploadError);
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(fileName);

      console.log(`✅ Avatar caricato: ${publicUrl}`);
      return publicUrl;
    } catch (error) {
      console.error("❌ Errore upload:", error);
      return null;
    }
  };

  const resetForm = () => {
    setForm({
      name: "",
      class: "Mercante",
      level: 1,
      race: "Umano",
      attitude: "neutral",
      hp_max: 10,
      hp_current: 10,
      armor_class: 10,
      strength: 10,
      dexterity: 10,
      constitution: 10,
      intelligence: 10,
      wisdom: 10,
      charisma: 10,
      description: "",
      location: "",
      special_abilities: "",
      inventory_notes: "",
      avatar_url: "",
    });
    setEditingNPC(null);
    setShowForm(false);
    setAvatarFile(null);
    setAvatarPreview(null);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      setModal({
        isOpen: true,
        type: "error",
        title: "Errore",
        message: "Inserisci un nome per l'NPC!",
        confirmText: "OK",
      });
      return;
    }

    setUploading(true);

    try {
      // Upload avatar se selezionato
      let avatarUrl = form.avatar_url; // Mantieni URL esistente se presente
      if (avatarFile) {
        const uploadedUrl = await uploadAvatar();
        if (uploadedUrl) {
          avatarUrl = uploadedUrl;
        } else {
          // Upload fallito
          setUploading(false);
          setModal({
            isOpen: true,
            type: "confirm",
            title: "Upload Fallito",
            message: "Impossibile caricare l'immagine avatar.\n\nVuoi salvare l'NPC senza immagine?",
            confirmText: "Salva",
            cancelText: "Annulla",
            onConfirm: async () => {
              // Continua senza immagine
              avatarUrl = "";
              await saveNPCData({ ...form, avatar_url: avatarUrl, campaign_id: campaign.id });
            },
          });
          return;
        }
      }

      await saveNPCData({ ...form, avatar_url: avatarUrl, campaign_id: campaign.id });
    } catch (error) {
      console.error("Errore salvataggio NPC:", error);
      setModal({
        isOpen: true,
        type: "error",
        title: "Errore",
        message: `Errore: ${error.message}\n\nAssicurati che la tabella 'npcs' esista nel database.`,
        confirmText: "OK",
      });
    } finally {
      setUploading(false);
    }
  };

  const saveNPCData = async (npcData) => {
    try {

      if (editingNPC) {
        // Update
        const { error } = await supabase
          .from("npcs")
          .update(npcData)
          .eq("id", editingNPC.id);

        if (error) throw error;
      } else {
        // Insert
        const { error } = await supabase
          .from("npcs")
          .insert([npcData]);

        if (error) throw error;
      }

      await loadNPCs();

      // Se NPC è ostile, aggiungilo automaticamente al combattimento
      if (npcData.attitude === "hostile" && onHostileNPCCreated) {
        onHostileNPCCreated(npcData);
      }

      resetForm();

      setModal({
        isOpen: true,
        type: "success",
        title: editingNPC ? "NPC Aggiornato!" : "NPC Creato!",
        message: `${form.name} è stato ${editingNPC ? "aggiornato" : "creato"} con successo!${npcData.attitude === "hostile" ? "\n\nAutomaticamente aggiunto al combattimento." : ""}`,
        confirmText: "OK",
      });
    } catch (error) {
      console.error("Errore salvataggio NPC:", error);
      setModal({
        isOpen: true,
        type: "error",
        title: "Errore",
        message: `Errore: ${error.message}\n\nAssicurati che la tabella 'npcs' esista nel database.`,
        confirmText: "OK",
      });
    }
  };

  const handleEdit = (npc) => {
    setEditingNPC(npc);
    setForm({ ...npc });
    setShowForm(true);
    setAvatarFile(null);
    setAvatarPreview(null);
  };

  const handleDelete = async (npc) => {
    setModal({
      isOpen: true,
      type: "confirm",
      title: "Conferma Eliminazione",
      message: `Sei sicuro di voler eliminare ${npc.name}?\n\nQuesta azione non può essere annullata.`,
      confirmText: "Elimina",
      cancelText: "Annulla",
      onConfirm: async () => {
        const { error } = await supabase
          .from("npcs")
          .delete()
          .eq("id", npc.id);

        if (error) {
          console.error("Errore eliminazione:", error);
          setModal({
            isOpen: true,
            type: "error",
            title: "Errore",
            message: "Errore durante l'eliminazione!",
            confirmText: "OK",
          });
        } else {
          await loadNPCs();
          setModal({
            isOpen: true,
            type: "success",
            title: "NPC Eliminato",
            message: `${npc.name} è stato eliminato con successo.`,
            confirmText: "OK",
          });
        }
      }
    });
  };

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: 40, color: "var(--parchment-dark)" }}>
        Caricamento NPC...
      </div>
    );
  }

  return (
    <div style={{
      position: "relative",
      minHeight: "100vh",
      backgroundImage: "url('/bg/custom_exploration.png')",
      backgroundSize: "cover",
      backgroundPosition: "center",
      backgroundAttachment: "fixed"
    }}>
      {/* Overlay leggero */}
      <div style={{
        position: "fixed",
        inset: 0,
        background: "rgba(10, 8, 6, 0.3)",
        zIndex: 0
      }} />

      {/* Contenuto */}
      <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", gap: 16, padding: "20px" }}>
        {/* Modal */}
        <ModalDialog
          isOpen={modal.isOpen}
          onClose={() => setModal({ ...modal, isOpen: false })}
          type={modal.type}
          title={modal.title}
          message={modal.message}
          confirmText={modal.confirmText}
          cancelText={modal.cancelText}
          onConfirm={modal.onConfirm}
        />

      {/* Header */}
      <div style={{
        fontFamily: "var(--font-heading)",
        fontSize: "1.2rem",
        color: "var(--gold)",
        display: "flex",
        alignItems: "center",
        gap: 8,
        justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <DnDIcon icon="npc" size={24} color="var(--gold)" />
          GESTIONE NPC
          <span style={{ fontSize: "0.8rem", color: "var(--parchment-dark)", fontWeight: 400 }}>
            ({getFilteredAndSortedNPCs().length} di {npcs.length})
          </span>
        </div>
        <button
          onClick={() => { resetForm(); setShowForm(true); }}
          className="btn btn-gold"
          style={{ fontSize: "0.85rem", padding: "8px 16px" }}
        >
          + Nuovo NPC
        </button>
      </div>

      {/* Barra Ricerca e Filtri */}
      {npcs.length > 0 && (
        <div className="glass-card" style={{ padding: 16 }}>
          {/* Ricerca */}
          <div style={{ marginBottom: 12 }}>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cerca per nome, descrizione, tag o località..."
              style={{
                width: "100%",
                padding: "10px 14px",
                borderRadius: 6,
                fontSize: "0.9rem",
                border: "2px solid rgba(212,175,55,0.3)",
                background: "rgba(0,0,0,0.3)",
                color: "var(--parchment)",
              }}
            />
          </div>

          {/* Filtri e Ordinamento */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
            gap: 10
          }}>
            {/* Filtro Atteggiamento */}
            <div>
              <label style={{ fontSize: "0.7rem", color: "var(--parchment-dark)", display: "block", marginBottom: 4 }}>
                Atteggiamento
              </label>
              <select
                value={filterAttitude}
                onChange={(e) => setFilterAttitude(e.target.value)}
                style={{
                  width: "100%",
                  padding: "6px 8px",
                  borderRadius: 4,
                  fontSize: "0.85rem",
                  background: "rgba(0,0,0,0.3)",
                  color: "var(--parchment)",
                  border: "1px solid rgba(212,175,55,0.3)"
                }}
              >
                <option value="all">Tutti</option>
                {ATTITUDES.map(att => (
                  <option key={att.id} value={att.id}>{att.label}</option>
                ))}
              </select>
            </div>

            {/* Filtro Classe */}
            <div>
              <label style={{ fontSize: "0.7rem", color: "var(--parchment-dark)", display: "block", marginBottom: 4 }}>
                Classe
              </label>
              <select
                value={filterClass}
                onChange={(e) => setFilterClass(e.target.value)}
                style={{
                  width: "100%",
                  padding: "6px 8px",
                  borderRadius: 4,
                  fontSize: "0.85rem",
                  background: "rgba(0,0,0,0.3)",
                  color: "var(--parchment)",
                  border: "1px solid rgba(212,175,55,0.3)"
                }}
              >
                <option value="all">Tutte</option>
                {NPC_CLASSES.map(cls => (
                  <option key={cls} value={cls}>{cls}</option>
                ))}
              </select>
            </div>

            {/* Filtro Località */}
            <div>
              <label style={{ fontSize: "0.7rem", color: "var(--parchment-dark)", display: "block", marginBottom: 4 }}>
                Località
              </label>
              <select
                value={filterLocation}
                onChange={(e) => setFilterLocation(e.target.value)}
                style={{
                  width: "100%",
                  padding: "6px 8px",
                  borderRadius: 4,
                  fontSize: "0.85rem",
                  background: "rgba(0,0,0,0.3)",
                  color: "var(--parchment)",
                  border: "1px solid rgba(212,175,55,0.3)"
                }}
              >
                <option value="all">Tutte</option>
                {getUniqueLocations().map(loc => (
                  <option key={loc} value={loc}>{loc}</option>
                ))}
              </select>
            </div>

            {/* Ordinamento */}
            <div>
              <label style={{ fontSize: "0.7rem", color: "var(--parchment-dark)", display: "block", marginBottom: 4 }}>
                Ordina per
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                style={{
                  width: "100%",
                  padding: "6px 8px",
                  borderRadius: 4,
                  fontSize: "0.85rem",
                  background: "rgba(0,0,0,0.3)",
                  color: "var(--parchment)",
                  border: "1px solid rgba(212,175,55,0.3)"
                }}
              >
                <option value="created">Recenti</option>
                <option value="name">Nome A-Z</option>
                <option value="level">Livello</option>
                <option value="hp">HP</option>
              </select>
            </div>
          </div>

          {/* Toggle Raggruppamento */}
          <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 8 }}>
            <label style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              cursor: "pointer",
              fontSize: "0.85rem",
              color: "var(--parchment)",
            }}>
              <input
                type="checkbox"
                checked={groupByAttitude}
                onChange={(e) => setGroupByAttitude(e.target.checked)}
                style={{ cursor: "pointer" }}
              />
              Raggruppa per atteggiamento
            </label>

            {/* Reset Filtri */}
            {(searchQuery || filterAttitude !== "all" || filterClass !== "all" || filterLocation !== "all" || sortBy !== "created") && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setFilterAttitude("all");
                  setFilterClass("all");
                  setFilterLocation("all");
                  setSortBy("created");
                }}
                style={{
                  marginLeft: "auto",
                  padding: "4px 12px",
                  fontSize: "0.75rem",
                  background: "rgba(192,64,64,0.2)",
                  border: "1px solid rgba(192,64,64,0.4)",
                  borderRadius: 4,
                  color: "var(--crimson-light)",
                  cursor: "pointer"
                }}
              >
                Reset Filtri
              </button>
            )}
          </div>
        </div>
      )}

      {/* Form Create/Edit - Modale Centrato */}
      <AnimatePresence>
        {showForm && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={resetForm}
              style={{
                position: "fixed",
                inset: 0,
                backgroundColor: "rgba(0, 0, 0, 0.75)",
                backdropFilter: "blur(5px)",
                zIndex: 9998,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "20px",
              }}
            >
              {/* Modal Card */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 30 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 30 }}
                transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                onClick={(e) => e.stopPropagation()}
                className="glass-card"
                style={{
                  padding: 20,
                  width: "100%",
                  maxWidth: "900px",
                  maxHeight: "90vh",
                  overflowY: "auto",
                  position: "relative",
                  border: "3px solid rgba(212,175,55,0.6)",
                  boxShadow: `
                    0 20px 60px rgba(0, 0, 0, 0.9),
                    0 0 0 1px rgba(0, 0, 0, 0.9),
                    inset 0 1px 0 rgba(212, 175, 55, 0.15),
                    0 0 80px rgba(212,175,55,0.3)
                  `,
                }}
              >
            {/* Header con Icona */}
            <div style={{
              textAlign: "center",
              marginBottom: 20,
              paddingBottom: 16,
              borderBottom: "2px solid rgba(212,175,55,0.3)"
            }}>
              {/* Icona Decorativa NPC */}
              <div style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: 80,
                height: 80,
                borderRadius: "50%",
                background: "linear-gradient(135deg, rgba(212,175,55,0.2), rgba(212,175,55,0.05))",
                border: "3px solid rgba(212,175,55,0.5)",
                marginBottom: 12,
                boxShadow: "0 0 30px rgba(212,175,55,0.3), inset 0 0 20px rgba(212,175,55,0.1)"
              }}>
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#D4AF37" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
              </div>

              {/* Titolo */}
              <h3 style={{
                fontFamily: "var(--font-heading)",
                fontSize: "1.3rem",
                color: "var(--gold)",
                marginBottom: 4,
                letterSpacing: "0.05em",
                textShadow: "0 0 20px rgba(212,175,55,0.4)",
                fontWeight: 700
              }}>
                {editingNPC ? "MODIFICA NPC" : "CREA NUOVO NPC"}
              </h3>

              <p style={{
                fontSize: "0.85rem",
                color: "var(--parchment-dark)",
                opacity: 0.8
              }}>
                {editingNPC ? "Modifica le informazioni del personaggio" : "Compila i campi per creare un nuovo personaggio"}
              </p>

              {/* Bottone Chiudi */}
              <button
                onClick={resetForm}
                style={{
                  position: "absolute",
                  top: 16,
                  right: 16,
                  background: "rgba(0,0,0,0.3)",
                  border: "1px solid rgba(212,175,55,0.3)",
                  borderRadius: "50%",
                  width: 36,
                  height: 36,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "rgba(212,175,55,0.6)",
                  cursor: "pointer",
                  fontSize: "1.2rem",
                  transition: "all 0.2s"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(212,175,55,0.2)";
                  e.currentTarget.style.color = "var(--gold)";
                  e.currentTarget.style.borderColor = "var(--gold)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(0,0,0,0.3)";
                  e.currentTarget.style.color = "rgba(212,175,55,0.6)";
                  e.currentTarget.style.borderColor = "rgba(212,175,55,0.3)";
                }}
              >
                ✕
              </button>
            </div>

            {/* Layout a 2 Colonne */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>

              {/* COLONNA SINISTRA - Info Base */}
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

                {/* Nome e Razza */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <div>
                    <label style={{ fontSize: "0.7rem", color: "rgba(212,175,55,0.7)", display: "block", marginBottom: 4 }}>Nome *</label>
                    <input
                      type="text"
                      value={form.name}
                      onChange={e => setForm({ ...form, name: e.target.value })}
                      placeholder="Elminster"
                      style={{ width: "100%", padding: 6, borderRadius: 4, fontSize: "0.85rem" }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: "0.7rem", color: "rgba(212,175,55,0.7)", display: "block", marginBottom: 4 }}>Razza</label>
                    <input
                      type="text"
                      value={form.race}
                      onChange={e => setForm({ ...form, race: e.target.value })}
                      placeholder="Umano"
                      style={{ width: "100%", padding: 6, borderRadius: 4, fontSize: "0.85rem" }}
                    />
                  </div>
                </div>

                {/* Classe e Livello */}
                <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 8 }}>
                  <div>
                    <label style={{ fontSize: "0.7rem", color: "rgba(212,175,55,0.7)", display: "block", marginBottom: 4 }}>Classe/Ruolo</label>
                    <select
                      value={form.class}
                      onChange={e => setForm({ ...form, class: e.target.value })}
                      style={{ width: "100%", padding: 6, borderRadius: 4, fontSize: "0.85rem" }}
                    >
                      {NPC_CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: "0.7rem", color: "rgba(212,175,55,0.7)", display: "block", marginBottom: 4 }}>Livello</label>
                    <input
                      type="number"
                      min="1"
                      max="20"
                      value={form.level}
                      onChange={e => setForm({ ...form, level: parseInt(e.target.value) || 1 })}
                      style={{ width: "100%", padding: 6, borderRadius: 4, fontSize: "0.85rem" }}
                    />
                  </div>
                </div>

                {/* HP e AC */}
                <div>
                  <label style={{ fontSize: "0.7rem", color: "rgba(212,175,55,0.7)", display: "block", marginBottom: 4 }}>Punti Vita & Armatura</label>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
                    <div>
                      <div style={{ fontSize: "0.65rem", color: "rgba(212,175,55,0.5)", marginBottom: 2 }}>HP Max</div>
                      <input
                        type="number"
                        min="1"
                        value={form.hp_max}
                        onChange={e => setForm({ ...form, hp_max: parseInt(e.target.value) || 10 })}
                        style={{ width: "100%", padding: 5, borderRadius: 4, fontSize: "0.85rem", textAlign: "center" }}
                      />
                    </div>
                    <div>
                      <div style={{ fontSize: "0.65rem", color: "rgba(212,175,55,0.5)", marginBottom: 2 }}>HP Ora</div>
                      <input
                        type="number"
                        min="0"
                        value={form.hp_current}
                        onChange={e => setForm({ ...form, hp_current: parseInt(e.target.value) || 0 })}
                        style={{ width: "100%", padding: 5, borderRadius: 4, fontSize: "0.85rem", textAlign: "center" }}
                      />
                    </div>
                    <div>
                      <div style={{ fontSize: "0.65rem", color: "rgba(212,175,55,0.5)", marginBottom: 2 }}>CA</div>
                      <input
                        type="number"
                        min="1"
                        value={form.armor_class}
                        onChange={e => setForm({ ...form, armor_class: parseInt(e.target.value) || 10 })}
                        style={{ width: "100%", padding: 5, borderRadius: 4, fontSize: "0.85rem", textAlign: "center", fontWeight: 600 }}
                      />
                    </div>
                  </div>
                </div>

                {/* Stats */}
                <div>
                  <label style={{ fontSize: "0.7rem", color: "rgba(212,175,55,0.7)", display: "block", marginBottom: 4 }}>Caratteristiche</label>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
                    {["strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma"].map(stat => {
                      const label = { strength: "FOR", dexterity: "DES", constitution: "COS", intelligence: "INT", wisdom: "SAG", charisma: "CAR" }[stat];
                      const mod = getMod(form[stat]);
                      return (
                        <div key={stat} style={{ textAlign: "center", background: "rgba(0,0,0,0.2)", borderRadius: 4, padding: 4 }}>
                          <div style={{ fontSize: "0.6rem", color: "var(--gold-dark)", marginBottom: 2 }}>{label}</div>
                          <input
                            type="number"
                            min="1"
                            max="20"
                            value={form[stat]}
                            onChange={e => setForm({ ...form, [stat]: parseInt(e.target.value) || 10 })}
                            style={{ width: "100%", padding: 4, borderRadius: 3, textAlign: "center", fontSize: "0.85rem", fontWeight: 600 }}
                          />
                          <div style={{ fontSize: "0.65rem", color: mod >= 0 ? "var(--gold)" : "var(--crimson-light)", marginTop: 2, fontWeight: 600 }}>
                            {mod >= 0 ? "+" : ""}{mod}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Atteggiamento */}
                <div>
                  <label style={{ fontSize: "0.7rem", color: "rgba(212,175,55,0.7)", display: "block", marginBottom: 4 }}>Atteggiamento</label>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
                    {ATTITUDES.map(att => (
                      <button
                        key={att.id}
                        onClick={() => setForm({ ...form, attitude: att.id })}
                        style={{
                          padding: 6,
                          background: form.attitude === att.id ? `${att.color}20` : "rgba(0,0,0,0.3)",
                          border: `2px solid ${form.attitude === att.id ? att.color : "rgba(212,175,55,0.2)"}`,
                          borderRadius: 4,
                          color: form.attitude === att.id ? att.color : "rgba(212,175,55,0.5)",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 4,
                          fontSize: "0.7rem",
                          fontWeight: form.attitude === att.id ? 600 : 400,
                        }}
                      >
                        <DnDIcon icon={att.icon} size={12} />
                        {att.label}
                      </button>
                    ))}
                  </div>
                </div>

              </div>

              {/* COLONNA DESTRA - Dettagli e Avatar */}
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

                {/* Avatar Upload */}
                <div>
                  <label style={{ fontSize: "0.7rem", color: "rgba(212,175,55,0.7)", display: "block", marginBottom: 6 }}>
                    Avatar (opzionale)
                  </label>
                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    {(avatarPreview || (editingNPC && form.avatar_url)) && (
                      <div style={{
                        width: 60,
                        height: 60,
                        borderRadius: "50%",
                        overflow: "hidden",
                        border: "2px solid var(--gold)",
                        flexShrink: 0,
                      }}>
                        <img
                          src={avatarPreview || form.avatar_url}
                          alt="Avatar preview"
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                          }}
                        />
                      </div>
                    )}
                    <div style={{ flex: 1 }}>
                      <label
                        htmlFor="avatar-upload"
                        style={{
                          display: "block",
                          padding: "6px 12px",
                          background: "rgba(212,175,55,0.2)",
                          border: "1px solid rgba(212,175,55,0.4)",
                          borderRadius: 4,
                          color: "var(--gold)",
                          cursor: "pointer",
                          fontSize: "0.75rem",
                          textAlign: "center",
                        }}
                      >
                        Scegli Immagine
                      </label>
                      <input
                        id="avatar-upload"
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarSelect}
                        style={{ display: "none" }}
                      />
                      {avatarFile && (
                        <div style={{ fontSize: "0.65rem", color: "var(--gold)", marginTop: 4, textAlign: "center" }}>
                          {avatarFile.name.substring(0, 20)}...
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Location */}
                <div>
                  <label style={{ fontSize: "0.7rem", color: "rgba(212,175,55,0.7)", display: "block", marginBottom: 4 }}>Località</label>
                  <input
                    type="text"
                    value={form.location}
                    onChange={e => setForm({ ...form, location: e.target.value })}
                    placeholder="Taverna del Drago Rosso"
                    style={{ width: "100%", padding: 6, borderRadius: 4, fontSize: "0.85rem" }}
                  />
                </div>

                {/* Description */}
                <div>
                  <label style={{ fontSize: "0.7rem", color: "rgba(212,175,55,0.7)", display: "block", marginBottom: 4 }}>Descrizione</label>
                  <textarea
                    value={form.description}
                    onChange={e => setForm({ ...form, description: e.target.value })}
                    placeholder="Un vecchio mago dalla lunga barba bianca..."
                    rows={3}
                    style={{ width: "100%", padding: 6, borderRadius: 4, resize: "vertical", fontSize: "0.8rem", lineHeight: 1.4 }}
                  />
                </div>

                {/* Special Abilities */}
                <div>
                  <label style={{ fontSize: "0.7rem", color: "rgba(212,175,55,0.7)", display: "block", marginBottom: 4 }}>Abilità Speciali</label>
                  <textarea
                    value={form.special_abilities}
                    onChange={e => setForm({ ...form, special_abilities: e.target.value })}
                    placeholder="Lancio incantesimi, Teletrasporto..."
                    rows={2}
                    style={{ width: "100%", padding: 6, borderRadius: 4, resize: "vertical", fontSize: "0.8rem", lineHeight: 1.4 }}
                  />
                </div>

                {/* Inventory Notes */}
                <div>
                  <label style={{ fontSize: "0.7rem", color: "rgba(212,175,55,0.7)", display: "block", marginBottom: 4 }}>Inventario</label>
                  <textarea
                    value={form.inventory_notes}
                    onChange={e => setForm({ ...form, inventory_notes: e.target.value })}
                    placeholder="Bastone del potere, Pozioni x3..."
                    rows={2}
                    style={{ width: "100%", padding: 6, borderRadius: 4, resize: "vertical", fontSize: "0.8rem", lineHeight: 1.4 }}
                  />
                </div>

                {/* Tags */}
                <div>
                  <label style={{ fontSize: "0.7rem", color: "rgba(212,175,55,0.7)", display: "block", marginBottom: 4 }}>
                    Tag (separati da virgola)
                  </label>
                  <input
                    type="text"
                    value={form.tags}
                    onChange={e => setForm({ ...form, tags: e.target.value })}
                    placeholder="Boss, Mercante, Quest Principale..."
                    style={{ width: "100%", padding: 6, borderRadius: 4, fontSize: "0.85rem" }}
                  />
                  <div style={{ fontSize: "0.65rem", color: "var(--parchment-dark)", marginTop: 4, opacity: 0.7 }}>
                    Es: Boss, Mercante, Quest Principale, Alleato
                  </div>
                </div>

              </div>
            </div>

            {/* Actions Footer */}
            <div style={{
              display: "flex",
              gap: 8,
              marginTop: 16,
              paddingTop: 12,
              borderTop: "1px solid rgba(212,175,55,0.2)"
            }}>
              <button
                onClick={handleSave}
                disabled={uploading}
                className="btn btn-gold"
                style={{
                  flex: 1,
                  padding: 10,
                  fontSize: "0.85rem",
                  opacity: uploading ? 0.5 : 1,
                  cursor: uploading ? "not-allowed" : "pointer",
                }}
              >
                {uploading ? "Caricamento..." : (editingNPC ? "Salva Modifiche" : "Crea NPC")}
              </button>
              <button
                onClick={resetForm}
                disabled={uploading}
                className="btn btn-ghost"
                style={{
                  padding: 10,
                  fontSize: "0.85rem",
                  opacity: uploading ? 0.5 : 1
                }}
              >
                Annulla
              </button>
            </div>
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* NPC List */}
      {npcs.length === 0 ? (
        <div className="glass-card" style={{ padding: 40, textAlign: "center" }}>
          <DnDIcon icon="npc" size={48} color="rgba(212,175,55,0.3)" style={{ marginBottom: 16 }} />
          <div style={{ color: "rgba(212,175,55,0.5)", fontStyle: "italic" }}>
            Nessun NPC creato. Clicca "Nuovo NPC" per iniziare.
          </div>
        </div>
      ) : getFilteredAndSortedNPCs().length === 0 ? (
        <div className="glass-card" style={{ padding: 40, textAlign: "center" }}>
          <div style={{ color: "var(--parchment-dark)", fontStyle: "italic" }}>
            Nessun NPC trovato con i filtri selezionati.
          </div>
        </div>
      ) : (
        <>
          {Object.entries(getGroupedNPCs()).map(([groupKey, groupNPCs]) => {
            if (groupNPCs.length === 0) return null;

            const attitudeData = ATTITUDES.find(a => a.id === groupKey);

            return (
              <div key={groupKey} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {/* Header Gruppo (solo se raggruppamento attivo) */}
                {groupByAttitude && attitudeData && (
                  <div style={{
                    fontFamily: "var(--font-heading)",
                    fontSize: "1rem",
                    color: attitudeData.color,
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "8px 12px",
                    background: `${attitudeData.color}15`,
                    border: `2px solid ${attitudeData.color}40`,
                    borderRadius: 8,
                  }}>
                    <DnDIcon icon={attitudeData.icon} size={20} color={attitudeData.color} />
                    {attitudeData.label}
                    <span style={{ fontSize: "0.85rem", opacity: 0.7, marginLeft: "auto" }}>
                      ({groupNPCs.length})
                    </span>
                  </div>
                )}

                {/* Griglia NPC */}
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
                  gap: 16,
                  alignItems: "start"
                }}>
                  {groupNPCs.map(npc => {
            const attitude = ATTITUDES.find(a => a.id === npc.attitude) || ATTITUDES[1];
            const hpPct = npc.hp_max > 0 ? (npc.hp_current / npc.hp_max) * 100 : 0;

            return (
              <motion.div
                key={npc.id}
                className="glass-card"
                onClick={() => setSelectedNPC(npc)}
                style={{
                  padding: 14,
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                  position: "relative",
                  borderLeft: `4px solid ${attitude.color}`,
                  cursor: "pointer",
                  transition: "all 0.2s"
                }}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.2 }}
                whileHover={{ scale: 1.02, boxShadow: `0 8px 24px ${attitude.color}40` }}
              >
                {/* Header con Avatar e Info Base */}
                <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                  {/* Avatar */}
                  <div style={{
                    width: 50,
                    height: 50,
                    borderRadius: "50%",
                    background: npc.avatar_url ? "#000" : `${attitude.color}20`,
                    border: `2px solid ${attitude.color}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    overflow: "hidden",
                  }}>
                    {npc.avatar_url ? (
                      <img
                        src={npc.avatar_url}
                        alt={npc.name}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                        }}
                        onError={(e) => {
                          e.target.style.display = "none";
                          e.target.parentElement.style.background = `${attitude.color}20`;
                          e.target.parentElement.innerHTML = `<div style="width:100%; height:100%; display:flex; align-items:center; justify-content:center;"><svg width="24" height="24" fill="${attitude.color}"><use href="#icon-${attitude.icon}"/></svg></div>`;
                        }}
                      />
                    ) : (
                      <DnDIcon icon={attitude.icon} size={24} color={attitude.color} />
                    )}
                  </div>

                  {/* Nome e Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontFamily: "var(--font-heading)",
                      fontSize: "0.95rem",
                      color: "var(--parchment)",
                      fontWeight: 600,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap"
                    }}>
                      {npc.name}
                    </div>
                    <div style={{ fontSize: "0.7rem", color: "var(--parchment-dark)", lineHeight: 1.3 }}>
                      Liv. {npc.level} {npc.class}
                    </div>
                    <div style={{ fontSize: "0.65rem", color: "var(--parchment-dark)", opacity: 0.8 }}>
                      {npc.race}
                    </div>
                  </div>

                  {/* Bottone Delete compatto */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(npc);
                    }}
                    style={{
                      background: "none",
                      border: "none",
                      color: "rgba(192,64,64,0.5)",
                      cursor: "pointer",
                      fontSize: "1.1rem",
                      padding: 0,
                      lineHeight: 1,
                      width: 20,
                      height: 20,
                    }}
                  >
                    ✕
                  </button>
                </div>

                {/* Badge Nemico se ostile */}
                {npc.attitude === "hostile" && (
                  <div style={{
                    background: "rgba(192,64,64,0.3)",
                    border: "1px solid var(--crimson-light)",
                    borderRadius: 4,
                    padding: "3px 8px",
                    color: "var(--crimson-light)",
                    fontSize: "0.6rem",
                    fontWeight: "700",
                    textAlign: "center",
                    letterSpacing: "0.05em"
                  }}>
                    NEMICO
                  </div>
                )}

                {/* HP e AC */}
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "1fr auto",
                  gap: 8,
                  alignItems: "center"
                }}>
                  <div>
                    <div style={{
                      fontSize: "0.65rem",
                      color: "var(--parchment-dark)",
                      marginBottom: 2,
                      display: "flex",
                      alignItems: "center",
                      gap: 4
                    }}>
                      <DnDIcon icon="heart" size={10} /> {npc.hp_current}/{npc.hp_max}
                    </div>
                    <div style={{
                      height: 5,
                      background: "rgba(0,0,0,0.4)",
                      borderRadius: 3,
                      overflow: "hidden",
                    }}>
                      <div style={{
                        width: `${Math.max(0, Math.min(100, hpPct))}%`,
                        height: "100%",
                        background: hpPct > 50 ? "#60e060" : hpPct > 25 ? "#e0c060" : "#e06060",
                        transition: "width 0.3s",
                      }} />
                    </div>
                  </div>
                  <div style={{
                    background: "rgba(212,175,55,0.15)",
                    border: "1px solid rgba(212,175,55,0.4)",
                    borderRadius: 6,
                    padding: "6px 10px",
                    textAlign: "center"
                  }}>
                    <div style={{ fontSize: "0.6rem", color: "var(--gold-dark)", marginBottom: 1 }}>CA</div>
                    <div style={{ fontSize: "1rem", color: "var(--gold)", fontWeight: 700 }}>
                      {npc.armor_class}
                    </div>
                  </div>
                </div>

                {/* Stats - Griglia 3x2 compatta */}
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: 6,
                  background: "rgba(0,0,0,0.2)",
                  padding: 8,
                  borderRadius: 6
                }}>
                  {[
                    ["FOR", npc.strength],
                    ["DES", npc.dexterity],
                    ["COS", npc.constitution],
                    ["INT", npc.intelligence],
                    ["SAG", npc.wisdom],
                    ["CAR", npc.charisma],
                  ].map(([label, score]) => {
                    const mod = getMod(score);
                    return (
                      <div key={label} style={{ textAlign: "center" }}>
                        <div style={{ fontSize: "0.55rem", color: "var(--gold-dark)", marginBottom: 1 }}>{label}</div>
                        <div style={{ fontSize: "0.75rem", color: "var(--parchment)", fontWeight: 600 }}>{score}</div>
                        <div style={{
                          fontSize: "0.6rem",
                          color: mod >= 0 ? "var(--gold)" : "var(--crimson-light)",
                          fontWeight: 600
                        }}>
                          {mod >= 0 ? "+" : ""}{mod}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Description compatta */}
                {npc.description && (
                  <div style={{
                    fontSize: "0.7rem",
                    color: "var(--parchment-dark)",
                    fontStyle: "italic",
                    lineHeight: 1.3,
                    maxHeight: "3em",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical"
                  }}>
                    "{npc.description}"
                  </div>
                )}

                {/* Special Abilities compatto */}
                {npc.special_abilities && (
                  <div style={{
                    fontSize: "0.65rem",
                    color: "rgba(212,175,55,0.7)",
                    background: "rgba(212,175,55,0.1)",
                    padding: "4px 6px",
                    borderRadius: 4,
                    lineHeight: 1.3
                  }}>
                    <DnDIcon icon="spell" size={10} /> <strong>Abilità:</strong> {npc.special_abilities}
                  </div>
                )}

                {/* Inventory compatto */}
                {npc.inventory_notes && (
                  <div style={{
                    fontSize: "0.65rem",
                    color: "rgba(212,175,55,0.7)",
                    background: "rgba(212,175,55,0.1)",
                    padding: "4px 6px",
                    borderRadius: 4,
                    lineHeight: 1.3
                  }}>
                    <DnDIcon icon="backpack" size={10} /> <strong>Inv:</strong> {npc.inventory_notes}
                  </div>
                )}

                {/* Tags */}
                {npc.tags && npc.tags.trim() && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                    {npc.tags.split(",").map((tag, i) => {
                      const trimmedTag = tag.trim();
                      if (!trimmedTag) return null;
                      return (
                        <span
                          key={i}
                          style={{
                            fontSize: "0.6rem",
                            padding: "2px 6px",
                            background: "rgba(212,175,55,0.2)",
                            border: "1px solid rgba(212,175,55,0.4)",
                            borderRadius: 3,
                            color: "var(--gold)",
                            fontWeight: 600
                          }}
                        >
                          {trimmedTag}
                        </span>
                      );
                    })}
                  </div>
                )}

                {/* Bottoni Azioni */}
                <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
                  {onAddToCombat && npc.attitude !== "hostile" && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onAddToCombat(npc);
                      }}
                      style={{
                        flex: 1,
                        background: "rgba(192,64,64,0.2)",
                        border: "1px solid rgba(192,64,64,0.5)",
                        borderRadius: 4,
                        padding: "6px 8px",
                        color: "var(--crimson-light)",
                        cursor: "pointer",
                        fontSize: "0.7rem",
                        fontWeight: 600
                      }}
                      title="Aggiungi al combattimento"
                    >
                      Combatti
                    </button>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEdit(npc);
                    }}
                    style={{
                      flex: 1,
                      background: "rgba(212,175,55,0.1)",
                      border: "1px solid rgba(212,175,55,0.3)",
                      borderRadius: 4,
                      padding: "6px 8px",
                      color: "var(--gold)",
                      cursor: "pointer",
                      fontSize: "0.7rem",
                      fontWeight: 600
                    }}
                  >
                    Modifica
                  </button>
                </div>
              </motion.div>
            );
                  })}
                </div>
              </div>
            );
          })}
        </>
      )}

      {/* Pannello Dettaglio Laterale */}
      <AnimatePresence>
        {selectedNPC && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setSelectedNPC(null)}
              style={{
                position: "fixed",
                inset: 0,
                backgroundColor: "rgba(0, 0, 0, 0.6)",
                backdropFilter: "blur(3px)",
                zIndex: 9997,
              }}
            />

            {/* Pannello Laterale */}
            <motion.div
              initial={{ x: "100%", opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: "100%", opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              style={{
                position: "fixed",
                top: 0,
                right: 0,
                bottom: 0,
                width: "100%",
                maxWidth: "500px",
                background: "linear-gradient(145deg, rgba(30, 25, 20, 0.98), rgba(20, 15, 10, 0.98))",
                borderLeft: "3px solid rgba(212,175,55,0.6)",
                boxShadow: "-10px 0 40px rgba(0, 0, 0, 0.8)",
                zIndex: 9998,
                overflowY: "auto",
                padding: "24px",
              }}
            >
              {(() => {
                const attitude = ATTITUDES.find(a => a.id === selectedNPC.attitude) || ATTITUDES[1];
                const hpPct = selectedNPC.hp_max > 0 ? (selectedNPC.hp_current / selectedNPC.hp_max) * 100 : 0;

                return (
                  <>
                    {/* Header con Close */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
                      <div style={{
                        fontFamily: "var(--font-heading)",
                        fontSize: "1.4rem",
                        color: "var(--gold)",
                        letterSpacing: "0.05em"
                      }}>
                        DETTAGLIO NPC
                      </div>
                      <button
                        onClick={() => setSelectedNPC(null)}
                        style={{
                          background: "rgba(0,0,0,0.3)",
                          border: "1px solid rgba(212,175,55,0.3)",
                          borderRadius: "50%",
                          width: 36,
                          height: 36,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "rgba(212,175,55,0.6)",
                          cursor: "pointer",
                          fontSize: "1.2rem",
                        }}
                      >
                        ✕
                      </button>
                    </div>

                    {/* Avatar Grande */}
                    <div style={{ textAlign: "center", marginBottom: 24 }}>
                      <div style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: 140,
                        height: 140,
                        borderRadius: "50%",
                        background: selectedNPC.avatar_url ? "#000" : `${attitude.color}20`,
                        border: `4px solid ${attitude.color}`,
                        overflow: "hidden",
                        boxShadow: `0 0 40px ${attitude.color}60`
                      }}>
                        {selectedNPC.avatar_url ? (
                          <img
                            src={selectedNPC.avatar_url}
                            alt={selectedNPC.name}
                            style={{
                              width: "100%",
                              height: "100%",
                              objectFit: "cover",
                            }}
                          />
                        ) : (
                          <DnDIcon icon={attitude.icon} size={70} color={attitude.color} />
                        )}
                      </div>
                    </div>

                    {/* Nome e Info Base */}
                    <div style={{ textAlign: "center", marginBottom: 24 }}>
                      <h2 style={{
                        fontFamily: "var(--font-heading)",
                        fontSize: "1.8rem",
                        color: attitude.color,
                        marginBottom: 8,
                        textShadow: `0 0 30px ${attitude.color}60`
                      }}>
                        {selectedNPC.name}
                      </h2>
                      <div style={{ fontSize: "1rem", color: "var(--parchment)", marginBottom: 4 }}>
                        Livello {selectedNPC.level} {selectedNPC.class}
                      </div>
                      <div style={{ fontSize: "0.9rem", color: "var(--parchment-dark)" }}>
                        {selectedNPC.race}
                      </div>
                      {selectedNPC.location && (
                        <div style={{ fontSize: "0.85rem", color: "var(--gold)", marginTop: 8, fontStyle: "italic" }}>
                          {selectedNPC.location}
                        </div>
                      )}
                    </div>

                    {/* Badge Atteggiamento */}
                    <div style={{
                      textAlign: "center",
                      marginBottom: 24,
                      padding: "8px 16px",
                      background: `${attitude.color}20`,
                      border: `2px solid ${attitude.color}`,
                      borderRadius: 8,
                      display: "inline-block",
                      width: "100%"
                    }}>
                      <DnDIcon icon={attitude.icon} size={16} color={attitude.color} />
                      <span style={{ marginLeft: 8, color: attitude.color, fontWeight: 600 }}>
                        {attitude.label}
                      </span>
                    </div>

                    {/* HP e AC */}
                    <div style={{
                      display: "grid",
                      gridTemplateColumns: "1fr auto",
                      gap: 16,
                      marginBottom: 24,
                      padding: 16,
                      background: "rgba(0,0,0,0.3)",
                      borderRadius: 8,
                      border: "1px solid rgba(212,175,55,0.2)"
                    }}>
                      <div>
                        <div style={{
                          fontSize: "0.8rem",
                          color: "var(--parchment-dark)",
                          marginBottom: 6,
                          display: "flex",
                          alignItems: "center",
                          gap: 6
                        }}>
                          <DnDIcon icon="heart" size={14} /> PUNTI VITA
                        </div>
                        <div style={{ fontSize: "1.5rem", color: "var(--parchment)", fontWeight: 700, marginBottom: 8 }}>
                          {selectedNPC.hp_current} / {selectedNPC.hp_max}
                        </div>
                        <div style={{
                          height: 8,
                          background: "rgba(0,0,0,0.5)",
                          borderRadius: 4,
                          overflow: "hidden",
                        }}>
                          <div style={{
                            width: `${Math.max(0, Math.min(100, hpPct))}%`,
                            height: "100%",
                            background: hpPct > 50 ? "#60e060" : hpPct > 25 ? "#e0c060" : "#e06060",
                            transition: "width 0.3s",
                          }} />
                        </div>
                      </div>
                      <div style={{
                        textAlign: "center",
                        padding: "12px 20px",
                        background: "rgba(212,175,55,0.2)",
                        border: "2px solid rgba(212,175,55,0.5)",
                        borderRadius: 8,
                      }}>
                        <div style={{ fontSize: "0.75rem", color: "var(--gold-dark)", marginBottom: 4 }}>
                          <DnDIcon icon="shield" size={12} /> CA
                        </div>
                        <div style={{ fontSize: "2rem", color: "var(--gold)", fontWeight: 700 }}>
                          {selectedNPC.armor_class}
                        </div>
                      </div>
                    </div>

                    {/* Statistiche */}
                    <div style={{ marginBottom: 24 }}>
                      <div style={{
                        fontSize: "0.9rem",
                        color: "var(--gold)",
                        fontFamily: "var(--font-heading)",
                        marginBottom: 12,
                        letterSpacing: "0.05em"
                      }}>
                        CARATTERISTICHE
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
                        {[
                          ["Forza", "FOR", selectedNPC.strength],
                          ["Destrezza", "DES", selectedNPC.dexterity],
                          ["Costituzione", "COS", selectedNPC.constitution],
                          ["Intelligenza", "INT", selectedNPC.intelligence],
                          ["Saggezza", "SAG", selectedNPC.wisdom],
                          ["Carisma", "CAR", selectedNPC.charisma],
                        ].map(([name, abbr, score]) => {
                          const mod = getMod(score);
                          return (
                            <div
                              key={abbr}
                              style={{
                                padding: 12,
                                background: "rgba(0,0,0,0.3)",
                                border: "1px solid rgba(212,175,55,0.2)",
                                borderRadius: 6,
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center"
                              }}
                            >
                              <div>
                                <div style={{ fontSize: "0.7rem", color: "var(--gold-dark)" }}>{abbr}</div>
                                <div style={{ fontSize: "0.85rem", color: "var(--parchment-dark)" }}>{name}</div>
                              </div>
                              <div style={{ textAlign: "right" }}>
                                <div style={{ fontSize: "1.3rem", color: "var(--parchment)", fontWeight: 600 }}>
                                  {score}
                                </div>
                                <div style={{
                                  fontSize: "0.9rem",
                                  color: mod >= 0 ? "var(--gold)" : "var(--crimson-light)",
                                  fontWeight: 600
                                }}>
                                  {mod >= 0 ? "+" : ""}{mod}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Descrizione */}
                    {selectedNPC.description && (
                      <div style={{ marginBottom: 20 }}>
                        <div style={{
                          fontSize: "0.9rem",
                          color: "var(--gold)",
                          fontFamily: "var(--font-heading)",
                          marginBottom: 8,
                          letterSpacing: "0.05em"
                        }}>
                          DESCRIZIONE
                        </div>
                        <div style={{
                          padding: 12,
                          background: "rgba(0,0,0,0.3)",
                          border: "1px solid rgba(212,175,55,0.2)",
                          borderRadius: 6,
                          fontSize: "0.9rem",
                          color: "var(--parchment)",
                          lineHeight: 1.6,
                          fontStyle: "italic"
                        }}>
                          "{selectedNPC.description}"
                        </div>
                      </div>
                    )}

                    {/* Abilità Speciali */}
                    {selectedNPC.special_abilities && (
                      <div style={{ marginBottom: 20 }}>
                        <div style={{
                          fontSize: "0.9rem",
                          color: "var(--gold)",
                          fontFamily: "var(--font-heading)",
                          marginBottom: 8,
                          letterSpacing: "0.05em"
                        }}>
                          ABILITÀ SPECIALI
                        </div>
                        <div style={{
                          padding: 12,
                          background: "rgba(212,175,55,0.1)",
                          border: "1px solid rgba(212,175,55,0.3)",
                          borderRadius: 6,
                          fontSize: "0.85rem",
                          color: "rgba(212,175,55,0.9)",
                          lineHeight: 1.5
                        }}>
                          <DnDIcon icon="spell" size={14} /> {selectedNPC.special_abilities}
                        </div>
                      </div>
                    )}

                    {/* Inventario */}
                    {selectedNPC.inventory_notes && (
                      <div style={{ marginBottom: 20 }}>
                        <div style={{
                          fontSize: "0.9rem",
                          color: "var(--gold)",
                          fontFamily: "var(--font-heading)",
                          marginBottom: 8,
                          letterSpacing: "0.05em"
                        }}>
                          INVENTARIO
                        </div>
                        <div style={{
                          padding: 12,
                          background: "rgba(212,175,55,0.1)",
                          border: "1px solid rgba(212,175,55,0.3)",
                          borderRadius: 6,
                          fontSize: "0.85rem",
                          color: "rgba(212,175,55,0.9)",
                          lineHeight: 1.5
                        }}>
                          <DnDIcon icon="backpack" size={14} /> {selectedNPC.inventory_notes}
                        </div>
                      </div>
                    )}

                    {/* Tags */}
                    {selectedNPC.tags && selectedNPC.tags.trim() && (
                      <div style={{ marginBottom: 20 }}>
                        <div style={{
                          fontSize: "0.9rem",
                          color: "var(--gold)",
                          fontFamily: "var(--font-heading)",
                          marginBottom: 8,
                          letterSpacing: "0.05em"
                        }}>
                          TAG
                        </div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                          {selectedNPC.tags.split(",").map((tag, i) => {
                            const trimmedTag = tag.trim();
                            if (!trimmedTag) return null;
                            return (
                              <span
                                key={i}
                                style={{
                                  fontSize: "0.75rem",
                                  padding: "6px 12px",
                                  background: "rgba(212,175,55,0.2)",
                                  border: "1px solid rgba(212,175,55,0.5)",
                                  borderRadius: 6,
                                  color: "var(--gold)",
                                  fontWeight: 600
                                }}
                              >
                                {trimmedTag}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Azioni */}
                    <div style={{ display: "flex", gap: 12, marginTop: 32 }}>
                      <button
                        onClick={() => {
                          handleEdit(selectedNPC);
                          setSelectedNPC(null);
                        }}
                        className="btn btn-gold"
                        style={{ flex: 1 }}
                      >
                        Modifica
                      </button>
                      {onAddToCombat && selectedNPC.attitude !== "hostile" && (
                        <button
                          onClick={() => {
                            onAddToCombat(selectedNPC);
                            setSelectedNPC(null);
                          }}
                          style={{
                            flex: 1,
                            padding: "10px 16px",
                            background: "rgba(192,64,64,0.3)",
                            border: "2px solid rgba(192,64,64,0.6)",
                            borderRadius: 6,
                            color: "var(--crimson-light)",
                            cursor: "pointer",
                            fontSize: "0.9rem",
                            fontWeight: 600
                          }}
                        >
                          Combatti
                        </button>
                      )}
                    </div>
                  </>
                );
              })()}
            </motion.div>
          </>
        )}
      </AnimatePresence>
      </div>
    </div>
  );
}
