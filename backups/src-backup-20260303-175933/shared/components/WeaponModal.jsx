// ═══════════════════════════════════════════════
//  WeaponModal — Modale completo per equipaggiare armi
//  Tutti i campi visibili + preview immagine
// ═══════════════════════════════════════════════

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import DnDIcon from "./DnDIcon.jsx";
import { supabase } from "../../lib/supabase.js";
import ModalDialog from "./ModalDialog.jsx";

const DAMAGE_DICE = [
  { label: "1d4 (Pugnale, Dardo)", value: "1d4" },
  { label: "1d6 (Spada Corta, Mazza)", value: "1d6" },
  { label: "1d8 (Spada Lunga, Ascia da Battaglia)", value: "1d8" },
  { label: "1d10 (Alabarda, Picca)", value: "1d10" },
  { label: "1d12 (Ascia Bipenne, Martello da Guerra)", value: "1d12" },
  { label: "2d6 (Spadone)", value: "2d6" },
  { label: "Custom", value: "custom" },
];

const DAMAGE_TYPES = [
  { label: "Taglio", value: "taglio" },
  { label: "Perforante", value: "perforante" },
  { label: "Contundente", value: "contundente" },
  { label: "Fuoco", value: "fuoco" },
  { label: "Freddo", value: "freddo" },
  { label: "Acido", value: "acido" },
  { label: "Elettrico", value: "elettrico" },
  { label: "Tuono", value: "tuono" },
  { label: "Veleno", value: "veleno" },
  { label: "Psichico", value: "psichico" },
  { label: "Necrotico", value: "necrotico" },
  { label: "Radiante", value: "radiante" },
  { label: "Forza", value: "forza" },
];

const WEAPON_PROPERTIES = [
  { id: "finesse", label: "Finezza (usa DES invece di FOR)" },
  { id: "versatile", label: "Versatile (1d8/1d10 a due mani)" },
  { id: "light", label: "Leggera (combattimento con due armi)" },
  { id: "two-handed", label: "A due mani" },
  { id: "thrown", label: "Lancio" },
  { id: "ammunition", label: "Munizioni" },
  { id: "reach", label: "Portata (3m invece di 1.5m)" },
  { id: "heavy", label: "Pesante (svantaggio per Piccoli)" },
  { id: "loading", label: "Ricarica" },
];

export default function WeaponModal({ isOpen, onClose, onConfirm, isOffhand = false, campaignId }) {
  const [name, setName] = useState("");
  const [damage, setDamage] = useState("1d8");
  const [customDamage, setCustomDamage] = useState("");
  const [damageType, setDamageType] = useState("taglio");
  const [properties, setProperties] = useState([]);
  const [imageFile, setImageFile] = useState(null); // File selezionato
  const [imagePreview, setImagePreview] = useState(null); // Preview locale
  const [showDamageCustom, setShowDamageCustom] = useState(false);
  const [uploading, setUploading] = useState(false); // Loading durante upload

  // Modal professionale per alert/confirm
  const [modal, setModal] = useState({ isOpen: false, type: "alert", title: "", message: "", onConfirm: null });

  // Reset quando si apre il modale
  useEffect(() => {
    if (isOpen) {
      setName("");
      setDamage(isOffhand ? "1d6" : "1d8");
      setCustomDamage("");
      setDamageType("taglio");
      setProperties([]);
      setImageFile(null);
      setImagePreview(null);
      setShowDamageCustom(false);
      setUploading(false);
    }
  }, [isOpen, isOffhand]);

  // Gestisce la selezione dell'immagine e crea preview
  const handleImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validazione tipo file
    if (!file.type.startsWith('image/')) {
      setModal({
        isOpen: true,
        type: "alert",
        title: "⚠️ Formato Non Valido",
        message: "Seleziona un file immagine valido (JPG, PNG, GIF, WebP).",
      });
      return;
    }

    // Validazione dimensione (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setModal({
        isOpen: true,
        type: "alert",
        title: "⚠️ File Troppo Grande",
        message: `Immagine troppo grande (${(file.size / 1024 / 1024).toFixed(1)} MB).\n\nMassimo: 5 MB`,
      });
      return;
    }

    setImageFile(file);

    // Crea preview locale
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  // Upload immagine su Supabase Storage
  const uploadWeaponImage = async () => {
    if (!imageFile || !campaignId) return null;

    try {
      const ext = imageFile.name.split('.').pop();
      const fileName = `${campaignId}/weapons/${name.replace(/\s+/g, '_')}_${Date.now()}.${ext}`;

      console.log(`📤 Upload immagine arma: ${fileName}`);

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("weapons")
        .upload(fileName, imageFile, { upsert: true });

      if (uploadError) {
        console.error("❌ Errore upload immagine:", uploadError);
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from("weapons")
        .getPublicUrl(fileName);

      console.log(`✅ Immagine caricata: ${publicUrl}`);
      return publicUrl;
    } catch (error) {
      console.error("❌ Errore upload:", error);
      // Ritorna null, l'errore verrà gestito in handleConfirm
      return null;
    }
  };

  const handlePropertyToggle = (propId) => {
    setProperties(prev =>
      prev.includes(propId)
        ? prev.filter(p => p !== propId)
        : [...prev, propId]
    );
  };

  const handleConfirm = async () => {
    if (!name.trim()) {
      setModal({
        isOpen: true,
        type: "alert",
        title: "⚠️ Nome Mancante",
        message: "Inserisci il nome dell'arma prima di equipaggiarla.",
      });
      return;
    }

    setUploading(true);

    try {
      // Upload immagine se selezionata
      let imageUrl = null;
      if (imageFile) {
        imageUrl = await uploadWeaponImage();
        if (!imageUrl) {
          // Upload fallito - chiedi conferma
          setUploading(false);
          setModal({
            isOpen: true,
            type: "confirm",
            title: "❌ Upload Fallito",
            message: "Impossibile caricare l'immagine.\n\nVuoi equipaggiare l'arma senza immagine?",
            confirmText: "Sì, equipaggia",
            cancelText: "Annulla",
            onConfirm: async () => {
              // Continua senza immagine
              setUploading(true);
              const finalDamage = showDamageCustom && customDamage.trim()
                ? customDamage.trim()
                : damage;

              const weapon = {
                name: name.trim(),
                damage: finalDamage,
                damage_type: damageType,
                properties: properties.length > 0 ? properties : undefined,
                image_url: undefined,
              };

              onConfirm(weapon);
              onClose();
              setUploading(false);
            },
          });
          return;
        }
      }

      const finalDamage = showDamageCustom && customDamage.trim()
        ? customDamage.trim()
        : damage;

      const weapon = {
        name: name.trim(),
        damage: finalDamage,
        damage_type: damageType,
        properties: properties.length > 0 ? properties : undefined,
        image_url: imageUrl || undefined,
      };

      onConfirm(weapon);
      onClose();
    } catch (error) {
      console.error("❌ Errore durante la creazione dell'arma:", error);
      setModal({
        isOpen: true,
        type: "alert",
        title: "❌ Errore",
        message: `Si è verificato un errore:\n\n${error.message}`,
      });
    } finally {
      setUploading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <style>
        {`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}
      </style>

      {/* Modal professionale per messaggi */}
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

      <AnimatePresence mode="wait">
      <motion.div
        key="weapon-modal-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.85)",
          backdropFilter: "blur(8px)",
          zIndex: 9999,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "20px",
          overflowY: "auto",
        }}
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ duration: 0.2 }}
          onClick={(e) => e.stopPropagation()}
          style={{
            background: "linear-gradient(135deg, rgba(26,20,12,0.98), rgba(10,8,6,0.98))",
            border: "3px solid var(--gold)",
            borderRadius: 16,
            padding: "24px",
            maxWidth: "600px",
            width: "100%",
            maxHeight: "90vh",
            overflowY: "auto",
            boxShadow: "0 20px 60px rgba(0,0,0,0.9), 0 0 60px rgba(212,175,55,0.3)",
          }}
        >
          {/* Header */}
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 20,
            paddingBottom: 16,
            borderBottom: "2px solid rgba(212,175,55,0.3)",
          }}>
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}>
              <DnDIcon icon="weapon" size={28} color="var(--gold)" />
              <h2 style={{
                fontFamily: "var(--font-heading)",
                fontSize: "1.3rem",
                color: "var(--gold)",
                margin: 0,
                letterSpacing: "0.05em",
              }}>
                {isOffhand ? "⚔️ ARMA SECONDARIA" : "⚔️ ARMA PRINCIPALE"}
              </h2>
            </div>
            <button
              onClick={onClose}
              style={{
                background: "rgba(0,0,0,0.4)",
                border: "1px solid rgba(212,175,55,0.4)",
                borderRadius: "50%",
                width: 32,
                height: 32,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                color: "var(--gold)",
                fontSize: "1.2rem",
              }}
            >
              ✕
            </button>
          </div>

          {/* Preview Arma (se ha immagine) */}
          {imagePreview && (
            <div style={{
              marginBottom: 20,
              textAlign: "center",
              padding: 16,
              background: "rgba(0,0,0,0.3)",
              borderRadius: 12,
              border: "2px solid rgba(212,175,55,0.2)",
            }}>
              <img
                src={imagePreview}
                alt={name || "Anteprima arma"}
                style={{
                  maxWidth: "200px",
                  maxHeight: "200px",
                  objectFit: "contain",
                  borderRadius: 8,
                }}
              />
              {name && (
                <div style={{
                  marginTop: 12,
                  fontFamily: "var(--font-heading)",
                  fontSize: "1.1rem",
                  color: "var(--gold)",
                }}>
                  {name}
                </div>
              )}
              <div style={{
                marginTop: 8,
                fontSize: "0.7rem",
                color: "rgba(212,175,55,0.6)",
                fontStyle: "italic",
              }}>
                {imageFile?.name} ({(imageFile?.size / 1024).toFixed(1)} KB)
              </div>
            </div>
          )}

          {/* Nome Arma */}
          <div style={{ marginBottom: 16 }}>
            <label style={{
              display: "block",
              fontFamily: "var(--font-heading)",
              fontSize: "0.8rem",
              color: "var(--gold-dark)",
              marginBottom: 8,
              letterSpacing: "0.05em",
              textTransform: "uppercase",
            }}>
              <DnDIcon icon="scroll" size={14} color="var(--gold-dark)" style={{ marginRight: 6 }} />
              Nome Arma *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Es: Spada Lunga, Pugnale Magico, Arco Lungo..."
              autoFocus
              style={{
                width: "100%",
                padding: "12px 14px",
                background: "rgba(0,0,0,0.5)",
                border: "2px solid rgba(212,175,55,0.4)",
                borderRadius: 8,
                color: "var(--parchment)",
                fontSize: "1rem",
                fontFamily: "var(--font-body)",
              }}
            />
          </div>

          {/* Upload Immagine */}
          <div style={{ marginBottom: 16 }}>
            <label style={{
              display: "block",
              fontFamily: "var(--font-heading)",
              fontSize: "0.8rem",
              color: "var(--gold-dark)",
              marginBottom: 8,
              letterSpacing: "0.05em",
              textTransform: "uppercase",
            }}>
              <DnDIcon icon="image" size={14} color="var(--gold-dark)" style={{ marginRight: 6 }} />
              Immagine Arma (opzionale)
            </label>

            <div style={{
              position: "relative",
              display: "inline-block",
              width: "100%",
            }}>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                id="weapon-image-upload"
                style={{
                  position: "absolute",
                  opacity: 0,
                  width: "100%",
                  height: "100%",
                  cursor: "pointer",
                }}
              />
              <label
                htmlFor="weapon-image-upload"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 10,
                  width: "100%",
                  padding: "16px 14px",
                  background: imageFile
                    ? "rgba(212,175,55,0.15)"
                    : "rgba(0,0,0,0.5)",
                  border: imageFile
                    ? "2px solid rgba(212,175,55,0.6)"
                    : "2px dashed rgba(212,175,55,0.4)",
                  borderRadius: 8,
                  color: "var(--parchment)",
                  fontSize: "0.9rem",
                  fontFamily: "var(--font-body)",
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
              >
                <DnDIcon
                  icon="image"
                  size={20}
                  color={imageFile ? "var(--gold)" : "rgba(212,175,55,0.6)"}
                />
                {imageFile ? (
                  <span style={{ color: "var(--gold)" }}>
                    ✓ Immagine selezionata
                  </span>
                ) : (
                  <span>
                    📷 Clicca per caricare dal PC
                  </span>
                )}
              </label>
            </div>

            <div style={{
              fontSize: "0.7rem",
              color: "rgba(212,175,55,0.5)",
              marginTop: 4,
              fontStyle: "italic",
            }}>
              Formati: JPG, PNG, GIF (max 5MB)
            </div>
          </div>

          {/* Danno */}
          <div style={{ marginBottom: 16 }}>
            <label style={{
              display: "block",
              fontFamily: "var(--font-heading)",
              fontSize: "0.8rem",
              color: "var(--gold-dark)",
              marginBottom: 8,
              letterSpacing: "0.05em",
              textTransform: "uppercase",
            }}>
              <DnDIcon icon="damage" size={14} color="var(--crimson-light)" style={{ marginRight: 6 }} />
              Dadi Danno *
            </label>
            <select
              value={showDamageCustom ? "custom" : damage}
              onChange={(e) => {
                if (e.target.value === "custom") {
                  setShowDamageCustom(true);
                } else {
                  setShowDamageCustom(false);
                  setDamage(e.target.value);
                }
              }}
              style={{
                width: "100%",
                padding: "12px 14px",
                background: "rgba(0,0,0,0.5)",
                border: "2px solid rgba(212,175,55,0.4)",
                borderRadius: 8,
                color: "var(--parchment)",
                fontSize: "1rem",
                cursor: "pointer",
              }}
            >
              {DAMAGE_DICE.map(d => (
                <option key={d.value} value={d.value}>{d.label}</option>
              ))}
            </select>

            {/* Custom Damage Input */}
            {showDamageCustom && (
              <input
                type="text"
                value={customDamage}
                onChange={(e) => setCustomDamage(e.target.value)}
                placeholder="Es: 3d6, 1d8+2, 4d4..."
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  background: "rgba(0,0,0,0.5)",
                  border: "2px solid rgba(212,175,55,0.4)",
                  borderRadius: 8,
                  color: "var(--parchment)",
                  fontSize: "1rem",
                  marginTop: 8,
                }}
              />
            )}
          </div>

          {/* Tipo Danno */}
          <div style={{ marginBottom: 20 }}>
            <label style={{
              display: "block",
              fontFamily: "var(--font-heading)",
              fontSize: "0.8rem",
              color: "var(--gold-dark)",
              marginBottom: 8,
              letterSpacing: "0.05em",
              textTransform: "uppercase",
            }}>
              <DnDIcon icon="fire" size={14} color="var(--crimson-light)" style={{ marginRight: 6 }} />
              Tipo Danno *
            </label>
            <select
              value={damageType}
              onChange={(e) => setDamageType(e.target.value)}
              style={{
                width: "100%",
                padding: "12px 14px",
                background: "rgba(0,0,0,0.5)",
                border: "2px solid rgba(212,175,55,0.4)",
                borderRadius: 8,
                color: "var(--parchment)",
                fontSize: "1rem",
                cursor: "pointer",
              }}
            >
              {DAMAGE_TYPES.map(dt => (
                <option key={dt.value} value={dt.value}>{dt.label}</option>
              ))}
            </select>
          </div>

          {/* Proprietà Arma */}
          <div style={{ marginBottom: 24 }}>
            <label style={{
              display: "block",
              fontFamily: "var(--font-heading)",
              fontSize: "0.8rem",
              color: "var(--gold-dark)",
              marginBottom: 10,
              letterSpacing: "0.05em",
              textTransform: "uppercase",
            }}>
              <DnDIcon icon="settings" size={14} color="var(--gold-dark)" style={{ marginRight: 6 }} />
              Proprietà (opzionale)
            </label>
            <div style={{
              display: "grid",
              gridTemplateColumns: "1fr",
              gap: 8,
              background: "rgba(0,0,0,0.3)",
              padding: 12,
              borderRadius: 8,
              border: "1px solid rgba(212,175,55,0.2)",
            }}>
              {WEAPON_PROPERTIES.map(prop => (
                <label
                  key={prop.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    cursor: "pointer",
                    padding: "8px 10px",
                    background: properties.includes(prop.id)
                      ? "rgba(212,175,55,0.15)"
                      : "transparent",
                    borderRadius: 6,
                    border: properties.includes(prop.id)
                      ? "1px solid rgba(212,175,55,0.4)"
                      : "1px solid transparent",
                    transition: "all 0.2s",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={properties.includes(prop.id)}
                    onChange={() => handlePropertyToggle(prop.id)}
                    style={{
                      width: 18,
                      height: 18,
                      cursor: "pointer",
                    }}
                  />
                  <span style={{
                    color: "var(--parchment)",
                    fontSize: "0.85rem",
                  }}>
                    {prop.label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Bottoni */}
          <div style={{
            display: "flex",
            gap: 12,
            paddingTop: 16,
            borderTop: "2px solid rgba(212,175,55,0.3)",
          }}>
            <button
              onClick={onClose}
              className="btn btn-ghost"
              style={{
                flex: 1,
                padding: "14px",
                fontSize: "0.95rem",
              }}
            >
              Annulla
            </button>
            <button
              onClick={handleConfirm}
              disabled={uploading}
              className="btn btn-gold"
              style={{
                flex: 2,
                padding: "14px",
                fontSize: "0.95rem",
                fontWeight: "bold",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                opacity: uploading ? 0.6 : 1,
                cursor: uploading ? "wait" : "pointer",
              }}
            >
              {uploading ? (
                <>
                  <span style={{
                    display: "inline-block",
                    width: 16,
                    height: 16,
                    border: "2px solid rgba(10,8,6,0.3)",
                    borderTop: "2px solid rgba(10,8,6,0.9)",
                    borderRadius: "50%",
                    animation: "spin 0.6s linear infinite",
                  }} />
                  Caricamento...
                </>
              ) : (
                <>
                  <DnDIcon icon="check" size={18} color="rgba(10,8,6,0.9)" />
                  Equipaggia
                </>
              )}
            </button>
          </div>
        </motion.div>
      </motion.div>
      </AnimatePresence>
    </>
  );
}
