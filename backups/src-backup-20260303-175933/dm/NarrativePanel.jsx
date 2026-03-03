// ═══════════════════════════════════════════════
//  NarrativePanel — Pannello Narrativa del DM
//  Invia testi narrativi con immagini e marker sulla TV
// ═══════════════════════════════════════════════

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import DnDIcon from "../shared/components/DnDIcon.jsx";
import { supabase } from "../lib/supabase.js";

export default function NarrativePanel({ tvChannel, session }) {
  const [narrativeText, setNarrativeText] = useState("");
  const [narrativeSending, setNarrativeSending] = useState(false);
  const [narrativeActive, setNarrativeActive] = useState(false);
  const [narrativeImage, setNarrativeImage] = useState(null);
  const [narrativeImagePreview, setNarrativeImagePreview] = useState(null);
  const [markerPosition, setMarkerPosition] = useState(null);
  const [markerStyle, setMarkerStyle] = useState({ type: 'circle', color: '#d4af37', size: 40 });

  // Upload immagine narrativa
  const handleNarrativeImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Per favore seleziona un'immagine valida");
      return;
    }

    setNarrativeImage(file);

    const reader = new FileReader();
    reader.onloadend = () => {
      setNarrativeImagePreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  // Click sull'immagine per posizionare il marker
  const handleImageClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setMarkerPosition({ x, y });
  };

  // Invia narrativa alla TV
  const sendNarrative = async () => {
    if (!narrativeText.trim()) return;
    setNarrativeSending(true);

    let imageUrl = null;

    // Upload immagine se presente
    if (narrativeImage) {
      try {
        const fileName = `narrative-${Date.now()}-${narrativeImage.name}`;
        const filePath = `narratives/${fileName}`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("maps")
          .upload(filePath, narrativeImage, {
            cacheControl: "3600",
            upsert: false,
          });

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from("maps")
          .getPublicUrl(filePath);

        imageUrl = urlData.publicUrl;
      } catch (error) {
        console.error("Errore upload immagine:", error);
        alert("Errore durante l'upload dell'immagine");
        setNarrativeSending(false);
        return;
      }
    }

    // Broadcast alla TV
    const payload = {
      text: narrativeText,
      timestamp: Date.now(),
      imageUrl: imageUrl,
      marker: markerPosition ? { ...markerPosition, style: markerStyle } : null,
    };

    console.log("📺 DM invia narrativa:", {
      textLength: payload.text.length,
      hasImage: !!payload.imageUrl,
      hasMarker: !!payload.marker,
      timestamp: payload.timestamp
    });

    try {
      await tvChannel.send({
        type: "broadcast",
        event: "narrative",
        payload,
      });
    } catch (error) {
      console.error("Errore invio narrativa:", error);
    }

    // Log evento
    if (session) {
      const log = session.event_log || [];
      log.push({
        type: "narrative",
        text: narrativeText.substring(0, 100),
        timestamp: Date.now(),
      });
      await supabase.from("sessions").update({ event_log: log }).eq("id", session.id);
    }

    setNarrativeText("");
    setNarrativeActive(true);
    setTimeout(() => setNarrativeSending(false), 800);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Header */}
      <div style={{
        background: "linear-gradient(135deg, rgba(212,175,55,0.08), rgba(212,175,55,0.03))",
        border: "1px solid rgba(212,175,55,0.2)",
        borderRadius: 12,
        padding: "16px 20px"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
          <DnDIcon icon="scroll" size={16} color="var(--gold)" />
          <span style={{ fontFamily: "var(--font-heading)", fontSize: "0.75rem", color: "var(--gold)", letterSpacing: "0.15em" }}>
            NARRATIVA
          </span>
        </div>
        <div style={{ fontFamily: "var(--font-body)", fontSize: "0.85rem", color: "var(--parchment-dark)", lineHeight: 1.5 }}>
          Scrivi una descrizione scenica o un dialogo NPC. Il testo apparirà sul TV in grande stile cinematico.
        </div>
      </div>

      {/* Textarea con counter */}
      <div style={{ position: "relative" }}>
        <textarea
          value={narrativeText}
          onChange={e => setNarrativeText(e.target.value)}
          placeholder="Una nebbia spessa avvolge il sentiero... in lontananza, si intravede la sagoma di un'antica torre in rovina."
          rows={6}
          style={{
            resize: "vertical",
            fontSize: "0.95rem",
            lineHeight: 1.7,
            fontFamily: "var(--font-body)",
            background: "rgba(0,0,0,0.4)",
            border: "2px solid rgba(212,175,55,0.2)",
            borderRadius: 10,
            padding: "14px",
            width: "100%",
            color: "var(--parchment)",
          }}
        />
        {/* Character counter */}
        <div style={{
          position: "absolute",
          bottom: 8,
          right: 12,
          fontSize: "0.7rem",
          color: narrativeText.length > 200 ? "var(--crimson-light)" : "var(--parchment-dark)",
          fontFamily: "var(--font-heading)",
          background: "rgba(0,0,0,0.6)",
          padding: "2px 8px",
          borderRadius: 4,
        }}>
          {narrativeText.length} caratteri
        </div>
      </div>

      {/* ═══ SEZIONE IMMAGINE + PUNTATORE ═══ */}
      <div style={{
        background: "linear-gradient(135deg, rgba(100,60,130,0.08), rgba(100,60,130,0.03))",
        border: "1px solid rgba(150,100,180,0.2)",
        borderRadius: 12,
        padding: "16px 20px"
      }}>
        <div style={{ fontFamily: "var(--font-heading)", fontSize: "0.75rem", color: "rgba(180,150,220,0.9)", letterSpacing: "0.15em", marginBottom: 12 }}>
          IMMAGINE (OPZIONALE)
        </div>

        {/* Upload + Anteprima */}
        {!narrativeImagePreview ? (
          <label style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            padding: "16px",
            background: "rgba(0,0,0,0.3)",
            border: "2px dashed rgba(150,100,180,0.4)",
            borderRadius: 8,
            cursor: "pointer",
            transition: "all 0.2s",
            fontFamily: "var(--font-body)",
            fontSize: "0.9rem",
            color: "var(--parchment-dark)"
          }}
            onMouseEnter={e => e.currentTarget.style.borderColor = "rgba(150,100,180,0.7)"}
            onMouseLeave={e => e.currentTarget.style.borderColor = "rgba(150,100,180,0.4)"}
          >
            <DnDIcon icon="image" size={20} />
            Carica Immagine (PNG, JPG, GIF...)
            <input
              type="file"
              accept="image/*"
              onChange={handleNarrativeImageUpload}
              style={{ display: "none" }}
            />
          </label>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {/* Anteprima + Click per marker */}
            <div style={{
              position: "relative",
              borderRadius: 8,
              overflow: "hidden",
              border: "2px solid rgba(150,100,180,0.4)",
              cursor: "crosshair",
            }}
              onClick={handleImageClick}
              title="Clicca sull'immagine per posizionare il puntatore"
            >
              <img
                src={narrativeImagePreview}
                alt="Narrative"
                style={{
                  width: "100%",
                  maxHeight: 300,
                  objectFit: "contain",
                  background: "rgba(0,0,0,0.5)"
                }}
              />

              {/* Marker preview */}
              {markerPosition && (
                <div style={{
                  position: "absolute",
                  left: `${markerPosition.x}%`,
                  top: `${markerPosition.y}%`,
                  transform: "translate(-50%, -50%)",
                  pointerEvents: "none"
                }}>
                  {markerStyle.type === 'circle' && (
                    <motion.div
                      animate={{
                        scale: [1, 1.3, 1],
                        opacity: [0.8, 1, 0.8]
                      }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                      style={{
                        width: markerStyle.size,
                        height: markerStyle.size,
                        borderRadius: "50%",
                        border: `3px solid ${markerStyle.color}`,
                        background: `${markerStyle.color}40`,
                        boxShadow: `0 0 20px ${markerStyle.color}`
                      }}
                    />
                  )}
                  {markerStyle.type === 'arrow' && (
                    <motion.div
                      animate={{
                        y: [-5, 5, -5],
                        opacity: [0.8, 1, 0.8]
                      }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                      style={{
                        fontSize: markerStyle.size,
                        color: markerStyle.color,
                        filter: `drop-shadow(0 0 10px ${markerStyle.color})`
                      }}
                    >
                      ▼
                    </motion.div>
                  )}
                  {markerStyle.type === 'x' && (
                    <motion.div
                      animate={{
                        rotate: [0, 90, 0],
                        opacity: [0.8, 1, 0.8]
                      }}
                      transition={{ duration: 2, repeat: Infinity }}
                      style={{
                        fontSize: markerStyle.size,
                        fontWeight: "bold",
                        color: markerStyle.color,
                        filter: `drop-shadow(0 0 10px ${markerStyle.color})`
                      }}
                    >
                      ✕
                    </motion.div>
                  )}
                  {markerStyle.type === 'star' && (
                    <motion.div
                      animate={{
                        rotate: [0, 360],
                        scale: [1, 1.2, 1],
                        opacity: [0.8, 1, 0.8]
                      }}
                      transition={{ duration: 2, repeat: Infinity }}
                      style={{
                        fontSize: markerStyle.size,
                        color: markerStyle.color,
                        filter: `drop-shadow(0 0 10px ${markerStyle.color})`
                      }}
                    >
                      ★
                    </motion.div>
                  )}
                </div>
              )}
            </div>

            {/* Personalizzazione Marker */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
              gap: 10,
              padding: 12,
              background: "rgba(0,0,0,0.3)",
              borderRadius: 8
            }}>
              {/* Tipo Marker */}
              <div>
                <label style={{ fontSize: "0.7rem", color: "var(--parchment-dark)", marginBottom: 4, display: "block" }}>
                  Forma
                </label>
                <select
                  value={markerStyle.type}
                  onChange={e => setMarkerStyle({ ...markerStyle, type: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "6px",
                    background: "rgba(0,0,0,0.5)",
                    border: "1px solid rgba(150,100,180,0.3)",
                    borderRadius: 4,
                    color: "var(--parchment)",
                    fontSize: "0.85rem"
                  }}
                >
                  <option value="circle">Cerchio</option>
                  <option value="arrow">Freccia</option>
                  <option value="x">X</option>
                  <option value="star">Stella</option>
                </select>
              </div>

              {/* Colore */}
              <div>
                <label style={{ fontSize: "0.7rem", color: "var(--parchment-dark)", marginBottom: 4, display: "block" }}>
                  Colore
                </label>
                <input
                  type="color"
                  value={markerStyle.color}
                  onChange={e => setMarkerStyle({ ...markerStyle, color: e.target.value })}
                  style={{
                    width: "100%",
                    height: 30,
                    border: "1px solid rgba(150,100,180,0.3)",
                    borderRadius: 4,
                    cursor: "pointer"
                  }}
                />
              </div>

              {/* Dimensione */}
              <div>
                <label style={{ fontSize: "0.7rem", color: "var(--parchment-dark)", marginBottom: 4, display: "block" }}>
                  Dimensione: {markerStyle.size}px
                </label>
                <input
                  type="range"
                  min="20"
                  max="80"
                  value={markerStyle.size}
                  onChange={e => setMarkerStyle({ ...markerStyle, size: parseInt(e.target.value) })}
                  style={{ width: "100%" }}
                />
              </div>
            </div>

            {/* Pulsanti Azioni */}
            <div style={{ display: "flex", gap: 8 }}>
              {markerPosition && (
                <button
                  className="btn"
                  onClick={() => setMarkerPosition(null)}
                  style={{
                    flex: 1,
                    padding: "8px",
                    background: "rgba(150,80,50,0.3)",
                    fontSize: "0.8rem",
                    border: "1px solid rgba(150,80,50,0.4)",
                    color: "#c4926e"
                  }}
                >
                  Rimuovi Puntatore
                </button>
              )}
              <button
                className="btn"
                onClick={() => {
                  setNarrativeImage(null);
                  setNarrativeImagePreview(null);
                  setMarkerPosition(null);
                }}
                style={{
                  flex: 1,
                  padding: "8px",
                  background: "rgba(150,80,50,0.3)",
                  fontSize: "0.8rem",
                  border: "1px solid rgba(150,80,50,0.4)",
                  color: "#c4926e"
                }}
              >
                Rimuovi Immagine
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Pulsante Invia */}
      <motion.button
        className="btn btn-gold"
        onClick={sendNarrative}
        disabled={!narrativeText.trim() || narrativeSending}
        style={{
          padding: "16px",
          opacity: !narrativeText.trim() ? 0.4 : 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 10,
          fontSize: "0.95rem",
          fontWeight: "600",
        }}
        whileHover={!narrativeSending ? { scale: 1.02 } : {}}
        whileTap={!narrativeSending ? { scale: 0.98 } : {}}
      >
        {narrativeSending ? (
          <>
            <motion.span
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              style={{ display: "inline-block" }}
            >
              <DnDIcon icon="initiative" size={18} />
            </motion.span>
            Inviando alla TV...
          </>
        ) : (
          <>
            <DnDIcon icon="scroll" size={18} />
            Mostra sul TV
          </>
        )}
      </motion.button>

      {/* Pulsante Chiudi Narrativa */}
      <AnimatePresence>
        {narrativeActive && (
          <motion.button
            className="btn"
            onClick={async () => {
              await tvChannel.send({
                type: "broadcast",
                event: "narrative",
                payload: { text: null },
              });
              setNarrativeActive(false);
              setNarrativeImage(null);
              setNarrativeImagePreview(null);
              setMarkerPosition(null);
            }}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            style={{
              padding: "14px",
              background: "linear-gradient(135deg, rgba(150,80,50,0.2), rgba(150,80,50,0.1))",
              border: "2px solid rgba(150,80,50,0.4)",
              color: "#c4926e",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              fontSize: "0.9rem",
              fontWeight: "600",
            }}
            whileHover={{ scale: 1.02, borderColor: "rgba(150,80,50,0.6)" }}
            whileTap={{ scale: 0.98 }}
          >
            <DnDIcon icon="close" size={18} />
            Chiudi Narrativa sul TV
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
