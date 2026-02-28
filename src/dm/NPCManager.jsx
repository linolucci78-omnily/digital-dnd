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
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
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
        </div>
        {!showForm && (
          <button
            onClick={() => { resetForm(); setShowForm(true); }}
            className="btn btn-gold"
            style={{ fontSize: "0.85rem", padding: "8px 16px" }}
          >
            + Nuovo NPC
          </button>
        )}
      </div>

      {/* Form Create/Edit */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="glass-card"
            style={{ padding: 20 }}
          >
            <div style={{
              fontFamily: "var(--font-heading)",
              fontSize: "0.9rem",
              color: "var(--gold)",
              marginBottom: 16,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}>
              <span>{editingNPC ? "MODIFICA NPC" : "NUOVO NPC"}</span>
              <button
                onClick={resetForm}
                style={{
                  background: "none",
                  border: "none",
                  color: "rgba(212,175,55,0.4)",
                  cursor: "pointer",
                  fontSize: "1.2rem",
                }}
              >
                ✕
              </button>
            </div>

            {/* Basic Info */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
              <div>
                <label style={{ fontSize: "0.75rem", color: "rgba(212,175,55,0.7)" }}>Nome *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder="Elminster"
                  style={{ width: "100%", padding: 8, borderRadius: 4 }}
                />
              </div>
              <div>
                <label style={{ fontSize: "0.75rem", color: "rgba(212,175,55,0.7)" }}>Razza</label>
                <input
                  type="text"
                  value={form.race}
                  onChange={e => setForm({ ...form, race: e.target.value })}
                  placeholder="Umano"
                  style={{ width: "100%", padding: 8, borderRadius: 4 }}
                />
              </div>
            </div>

            {/* Avatar Upload */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: "0.75rem", color: "rgba(212,175,55,0.7)", display: "block", marginBottom: 8 }}>
                Avatar (opzionale)
              </label>

              <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                {/* Preview */}
                {(avatarPreview || (editingNPC && form.avatar_url)) && (
                  <div style={{
                    width: 80,
                    height: 80,
                    borderRadius: "50%",
                    overflow: "hidden",
                    border: "3px solid var(--gold)",
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

                {/* Upload button */}
                <div style={{ flex: 1 }}>
                  <label
                    htmlFor="avatar-upload"
                    style={{
                      display: "inline-block",
                      padding: "8px 16px",
                      background: "rgba(212,175,55,0.2)",
                      border: "2px solid rgba(212,175,55,0.4)",
                      borderRadius: 6,
                      color: "var(--gold)",
                      cursor: "pointer",
                      fontSize: "0.85rem",
                      fontFamily: "var(--font-heading)",
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
                  <div style={{ fontSize: "0.65rem", color: "rgba(212,175,55,0.5)", marginTop: 6 }}>
                    Carica dal PC (max 5 MB)
                  </div>
                  {avatarFile && (
                    <div style={{ fontSize: "0.7rem", color: "var(--gold)", marginTop: 4 }}>
                      {avatarFile.name}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Classe e Livello */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
              <div>
                <label style={{ fontSize: "0.75rem", color: "rgba(212,175,55,0.7)" }}>Classe/Ruolo</label>
                <select
                  value={form.class}
                  onChange={e => setForm({ ...form, class: e.target.value })}
                  style={{ width: "100%", padding: 8, borderRadius: 4 }}
                >
                  {NPC_CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: "0.75rem", color: "rgba(212,175,55,0.7)" }}>Livello</label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={form.level}
                  onChange={e => setForm({ ...form, level: parseInt(e.target.value) || 1 })}
                  style={{ width: "100%", padding: 8, borderRadius: 4 }}
                />
              </div>
            </div>

            {/* Attitude */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: "0.75rem", color: "rgba(212,175,55,0.7)", display: "block", marginBottom: 8 }}>
                Atteggiamento
              </label>
              <div style={{ display: "flex", gap: 8 }}>
                {ATTITUDES.map(att => (
                  <button
                    key={att.id}
                    onClick={() => setForm({ ...form, attitude: att.id })}
                    style={{
                      flex: 1,
                      padding: 10,
                      background: form.attitude === att.id ? `${att.color}20` : "rgba(0,0,0,0.3)",
                      border: `2px solid ${form.attitude === att.id ? att.color : "rgba(212,175,55,0.2)"}`,
                      borderRadius: 6,
                      color: form.attitude === att.id ? att.color : "rgba(212,175,55,0.6)",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                      fontSize: "0.85rem",
                    }}
                  >
                    <DnDIcon icon={att.icon} size={14} />
                    {att.label}
                  </button>
                ))}
              </div>
            </div>

            {/* HP & AC */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 16 }}>
              <div>
                <label style={{ fontSize: "0.75rem", color: "rgba(212,175,55,0.7)" }}>HP Max</label>
                <input
                  type="number"
                  min="1"
                  value={form.hp_max}
                  onChange={e => setForm({ ...form, hp_max: parseInt(e.target.value) || 10 })}
                  style={{ width: "100%", padding: 8, borderRadius: 4 }}
                />
              </div>
              <div>
                <label style={{ fontSize: "0.75rem", color: "rgba(212,175,55,0.7)" }}>HP Correnti</label>
                <input
                  type="number"
                  min="0"
                  value={form.hp_current}
                  onChange={e => setForm({ ...form, hp_current: parseInt(e.target.value) || 0 })}
                  style={{ width: "100%", padding: 8, borderRadius: 4 }}
                />
              </div>
              <div>
                <label style={{ fontSize: "0.75rem", color: "rgba(212,175,55,0.7)" }}>Classe Armatura</label>
                <input
                  type="number"
                  min="1"
                  value={form.armor_class}
                  onChange={e => setForm({ ...form, armor_class: parseInt(e.target.value) || 10 })}
                  style={{ width: "100%", padding: 8, borderRadius: 4 }}
                />
              </div>
            </div>

            {/* Stats */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: "0.75rem", color: "rgba(212,175,55,0.7)", display: "block", marginBottom: 8 }}>
                Caratteristiche
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 8 }}>
                {["strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma"].map(stat => {
                  const label = { strength: "FOR", dexterity: "DES", constitution: "COS", intelligence: "INT", wisdom: "SAG", charisma: "CAR" }[stat];
                  const mod = getMod(form[stat]);
                  return (
                    <div key={stat} style={{ textAlign: "center" }}>
                      <div style={{ fontSize: "0.65rem", color: "var(--gold-dark)", marginBottom: 4 }}>{label}</div>
                      <input
                        type="number"
                        min="1"
                        max="20"
                        value={form[stat]}
                        onChange={e => setForm({ ...form, [stat]: parseInt(e.target.value) || 10 })}
                        style={{ width: "100%", padding: 6, borderRadius: 4, textAlign: "center", fontSize: "0.9rem" }}
                      />
                      <div style={{ fontSize: "0.7rem", color: mod >= 0 ? "var(--gold)" : "var(--crimson-light)", marginTop: 2 }}>
                        {mod >= 0 ? "+" : ""}{mod}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Location */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: "0.75rem", color: "rgba(212,175,55,0.7)" }}>Località/Dove si trova</label>
              <input
                type="text"
                value={form.location}
                onChange={e => setForm({ ...form, location: e.target.value })}
                placeholder="Taverna del Drago Rosso, Neverwinter"
                style={{ width: "100%", padding: 8, borderRadius: 4 }}
              />
            </div>

            {/* Description */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: "0.75rem", color: "rgba(212,175,55,0.7)" }}>Descrizione</label>
              <textarea
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                placeholder="Un vecchio mago dalla lunga barba bianca, occhi saggi..."
                rows={3}
                style={{ width: "100%", padding: 8, borderRadius: 4, resize: "vertical", fontSize: "0.9rem" }}
              />
            </div>

            {/* Special Abilities */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: "0.75rem", color: "rgba(212,175,55,0.7)" }}>Abilità Speciali</label>
              <textarea
                value={form.special_abilities}
                onChange={e => setForm({ ...form, special_abilities: e.target.value })}
                placeholder="Lancio incantesimi di 9° livello, Teletrasporto..."
                rows={2}
                style={{ width: "100%", padding: 8, borderRadius: 4, resize: "vertical", fontSize: "0.9rem" }}
              />
            </div>

            {/* Inventory Notes */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: "0.75rem", color: "rgba(212,175,55,0.7)" }}>Inventario/Oggetti</label>
              <textarea
                value={form.inventory_notes}
                onChange={e => setForm({ ...form, inventory_notes: e.target.value })}
                placeholder="Bastone del potere, Pozioni di guarigione x3..."
                rows={2}
                style={{ width: "100%", padding: 8, borderRadius: 4, resize: "vertical", fontSize: "0.9rem" }}
              />
            </div>

            {/* Actions */}
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={handleSave}
                disabled={uploading}
                className="btn btn-gold"
                style={{
                  flex: 1,
                  padding: 12,
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
                style={{ padding: 12, opacity: uploading ? 0.5 : 1 }}
              >
                Annulla
              </button>
            </div>
          </motion.div>
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
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {npcs.map(npc => {
            const attitude = ATTITUDES.find(a => a.id === npc.attitude) || ATTITUDES[1];
            const hpPct = npc.hp_max > 0 ? (npc.hp_current / npc.hp_max) * 100 : 0;

            return (
              <motion.div
                key={npc.id}
                className="glass-card"
                style={{ padding: 16 }}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div style={{ display: "flex", gap: 12 }}>
                  {/* Icon/Avatar */}
                  <div style={{
                    width: 60,
                    height: 60,
                    borderRadius: "50%",
                    background: npc.avatar_url ? "#000" : `${attitude.color}20`,
                    border: `3px solid ${attitude.color}`,
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
                          e.target.parentElement.innerHTML = `<div style="width:100%; height:100%; display:flex; align-items:center; justify-content:center;"><svg width="28" height="28" fill="${attitude.color}"><use href="#icon-${attitude.icon}"/></svg></div>`;
                        }}
                      />
                    ) : (
                      <DnDIcon icon={attitude.icon} size={28} color={attitude.color} />
                    )}
                  </div>

                  <div style={{ flex: 1 }}>
                    {/* Header */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                      <div>
                        <div style={{ fontFamily: "var(--font-heading)", fontSize: "1rem", color: "var(--parchment)" }}>
                          {npc.name}
                        </div>
                        <div style={{ fontSize: "0.75rem", color: "var(--parchment-dark)" }}>
                          Liv. {npc.level} {npc.class} · {npc.race}
                          {npc.location && <span> · {npc.location}</span>}
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        {/* Bottone Combatti solo se NPC non è ostile (gli ostili vengono aggiunti automaticamente) */}
                        {onAddToCombat && npc.attitude !== "hostile" && (
                          <button
                            onClick={() => onAddToCombat(npc)}
                            style={{
                              background: "rgba(192,64,64,0.2)",
                              border: "1px solid rgba(192,64,64,0.5)",
                              borderRadius: 4,
                              padding: "4px 10px",
                              color: "var(--crimson-light)",
                              cursor: "pointer",
                              fontSize: "0.75rem",
                            }}
                            title="Aggiungi al combattimento"
                          >
                            Combatti
                          </button>
                        )}
                        {/* Badge ostile se è un nemico */}
                        {npc.attitude === "hostile" && (
                          <div style={{
                            background: "rgba(192,64,64,0.3)",
                            border: "1px solid var(--crimson-light)",
                            borderRadius: 4,
                            padding: "4px 10px",
                            color: "var(--crimson-light)",
                            fontSize: "0.65rem",
                            fontWeight: "700",
                          }}>
                            NEMICO
                          </div>
                        )}
                        <button
                          onClick={() => handleEdit(npc)}
                          style={{
                            background: "none",
                            border: "1px solid rgba(212,175,55,0.3)",
                            borderRadius: 4,
                            padding: "4px 10px",
                            color: "var(--gold)",
                            cursor: "pointer",
                            fontSize: "0.75rem",
                          }}
                        >
                          Modifica
                        </button>
                        <button
                          onClick={() => handleDelete(npc)}
                          style={{
                            background: "none",
                            border: "none",
                            color: "rgba(192,64,64,0.6)",
                            cursor: "pointer",
                            fontSize: "1rem",
                          }}
                        >
                          ✕
                        </button>
                      </div>
                    </div>

                    {/* HP Bar */}
                    <div style={{ marginBottom: 8 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.7rem", color: "var(--parchment-dark)", marginBottom: 3 }}>
                        <span>
                          <DnDIcon icon="heart" size={12} /> {npc.hp_current}/{npc.hp_max}
                        </span>
                        <span>
                          <DnDIcon icon="shield" size={12} /> CA {npc.armor_class}
                        </span>
                      </div>
                      <div style={{
                        height: 6,
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

                    {/* Stats */}
                    <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
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
                          <div key={label} style={{ textAlign: "center", flex: 1 }}>
                            <div style={{ fontSize: "0.55rem", color: "var(--gold-dark)" }}>{label}</div>
                            <div style={{ fontSize: "0.8rem", color: "var(--parchment)" }}>{score}</div>
                            <div style={{ fontSize: "0.65rem", color: mod >= 0 ? "var(--gold)" : "var(--crimson-light)" }}>
                              {mod >= 0 ? "+" : ""}{mod}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Description */}
                    {npc.description && (
                      <div style={{ fontSize: "0.8rem", color: "var(--parchment-dark)", fontStyle: "italic", marginBottom: 6, lineHeight: 1.4 }}>
                        "{npc.description}"
                      </div>
                    )}

                    {/* Special Abilities */}
                    {npc.special_abilities && (
                      <div style={{ fontSize: "0.75rem", color: "rgba(212,175,55,0.7)", marginBottom: 4 }}>
                        <DnDIcon icon="spell" size={12} /> <strong>Abilità:</strong> {npc.special_abilities}
                      </div>
                    )}

                    {/* Inventory */}
                    {npc.inventory_notes && (
                      <div style={{ fontSize: "0.75rem", color: "rgba(212,175,55,0.7)" }}>
                        <DnDIcon icon="backpack" size={12} /> <strong>Inventario:</strong> {npc.inventory_notes}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
