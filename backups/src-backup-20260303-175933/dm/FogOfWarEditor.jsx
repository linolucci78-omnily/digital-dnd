// ═══════════════════════════════════════════════
//  FogOfWarEditor — Sistema Fog of War per mappe
//  Il DM può rivelare gradualmente zone della mappa
// ═══════════════════════════════════════════════

import { useState, useRef, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase.js";
import DnDIcon from "../shared/components/DnDIcon.jsx";
import ModalDialog from "../shared/components/ModalDialog.jsx";

export default function FogOfWarEditor({ mapUrl, session, tvChannel }) {
  const [modal, setModal] = useState({ isOpen: false, type: "confirm", title: "", message: "", onConfirm: null });
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [brushSize, setBrushSize] = useState(50);
  const [mode, setMode] = useState("reveal"); // reveal or hide
  const [fogData, setFogData] = useState(null);
  const [saving, setSaving] = useState(false);

  // Carica fog esistente dalla sessione
  useEffect(() => {
    if (session?.fog_of_war) {
      setFogData(session.fog_of_war);
      redrawCanvas(session.fog_of_war);
    } else {
      // Inizializza canvas completamente oscurato
      initializeCanvas();
    }
  }, [session?.fog_of_war, mapUrl]);

  const initializeCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    canvas.width = 800;
    canvas.height = 800;

    // Riempi con nero (nebbia completa)
    ctx.fillStyle = "rgba(0, 0, 0, 0.9)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Salva stato iniziale
    const imageData = canvas.toDataURL();
    setFogData(imageData);
  };

  const redrawCanvas = (imageData) => {
    const canvas = canvasRef.current;
    if (!canvas || !imageData) return;

    const ctx = canvas.getContext("2d");
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
    };
    img.src = imageData;
  };

  const getMousePos = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const draw = (x, y) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    ctx.globalCompositeOperation = mode === "reveal" ? "destination-out" : "source-over";

    ctx.beginPath();
    ctx.arc(x, y, brushSize, 0, Math.PI * 2);

    if (mode === "reveal") {
      ctx.fillStyle = "rgba(0, 0, 0, 1)"; // Trasparente (rimuove nebbia)
    } else {
      ctx.fillStyle = "rgba(0, 0, 0, 0.9)"; // Nero (aggiunge nebbia)
    }

    ctx.fill();
  };

  const handleMouseDown = (e) => {
    setIsDrawing(true);
    const pos = getMousePos(e);
    draw(pos.x, pos.y);
  };

  const handleMouseMove = (e) => {
    if (!isDrawing) return;
    const pos = getMousePos(e);
    draw(pos.x, pos.y);
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
    // Salva automaticamente dopo ogni disegno
    saveFog();
  };

  const saveFog = async () => {
    const canvas = canvasRef.current;
    if (!canvas || !session?.id) return;

    setSaving(true);
    try {
      const imageData = canvas.toDataURL();
      setFogData(imageData);

      // Salva nel database
      const { error } = await supabase
        .from("sessions")
        .update({ fog_of_war: imageData })
        .eq("id", session.id);

      if (error) throw error;

      // Broadcast alla TV
      if (tvChannel) {
        await tvChannel.send({
          type: "broadcast",
          event: "fog_update",
          payload: { fogData: imageData },
        });
      }

      console.log("✅ Fog of War salvato");
    } catch (error) {
      console.error("Errore salvataggio fog:", error);
    } finally {
      setSaving(false);
    }
  };

  const clearAllFog = async () => {
    setModal({
      isOpen: true,
      type: "confirm",
      title: "Rivelare Mappa",
      message: "Sei sicuro di voler rivelare completamente la mappa?\n\nI giocatori vedranno tutta la mappa sulla TV.",
      confirmText: "Rivela Tutto",
      cancelText: "Annulla",
      onConfirm: async () => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        await saveFog();
      }
    });
  };

  const resetAllFog = async () => {
    setModal({
      isOpen: true,
      type: "confirm",
      title: "Oscurare Mappa",
      message: "Sei sicuro di voler oscurare completamente la mappa?\n\nI giocatori non vedranno nulla sulla TV.",
      confirmText: "Oscura Tutto",
      cancelText: "Annulla",
      onConfirm: async () => {
        initializeCanvas();
        await saveFog();
      }
    });
  };

  if (!mapUrl) {
    return (
      <div style={{
        background: "rgba(0,0,0,0.3)",
        border: "1px solid rgba(212,175,55,0.15)",
        borderRadius: 8,
        padding: 20,
        textAlign: "center",
      }}>
        <DnDIcon icon="map" size={32} color="rgba(212,175,55,0.3)" style={{ marginBottom: 12 }} />
        <div style={{ fontSize: "0.85rem", color: "var(--parchment-dark)", fontStyle: "italic" }}>
          Carica prima una mappa per usare il Fog of War
        </div>
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
        fontSize: "0.9rem",
        color: "var(--gold)",
        display: "flex",
        alignItems: "center",
        gap: 8,
      }}>
        <DnDIcon icon="cave" size={20} />
        FOG OF WAR
        {saving && <span style={{ fontSize: "0.75rem", color: "rgba(212,175,55,0.6)" }}>Salvando...</span>}
      </div>

      {/* Tools */}
      <div style={{
        background: "rgba(0,0,0,0.3)",
        border: "1px solid rgba(212,175,55,0.15)",
        borderRadius: 8,
        padding: 16,
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}>
        {/* Mode Selection */}
        <div>
          <label style={{ fontSize: "0.75rem", color: "rgba(212,175,55,0.7)", display: "block", marginBottom: 8 }}>
            Modalità
          </label>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => setMode("reveal")}
              style={{
                flex: 1,
                padding: 10,
                background: mode === "reveal" ? "rgba(212,175,55,0.2)" : "rgba(0,0,0,0.3)",
                border: `2px solid ${mode === "reveal" ? "var(--gold)" : "rgba(212,175,55,0.2)"}`,
                borderRadius: 6,
                color: mode === "reveal" ? "var(--gold)" : "rgba(212,175,55,0.6)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                fontSize: "0.85rem",
              }}
            >
              <DnDIcon icon="search" size={14} />
              Rivela
            </button>
            <button
              onClick={() => setMode("hide")}
              style={{
                flex: 1,
                padding: 10,
                background: mode === "hide" ? "rgba(0,0,0,0.6)" : "rgba(0,0,0,0.3)",
                border: `2px solid ${mode === "hide" ? "rgba(255,255,255,0.5)" : "rgba(212,175,55,0.2)"}`,
                borderRadius: 6,
                color: mode === "hide" ? "#fff" : "rgba(212,175,55,0.6)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                fontSize: "0.85rem",
              }}
            >
              <DnDIcon icon="cave" size={14} />
              Nascondi
            </button>
          </div>
        </div>

        {/* Brush Size */}
        <div>
          <label style={{ fontSize: "0.75rem", color: "rgba(212,175,55,0.7)", display: "block", marginBottom: 8 }}>
            Dimensione Pennello: {brushSize}px
          </label>
          <input
            type="range"
            min="10"
            max="150"
            value={brushSize}
            onChange={e => setBrushSize(parseInt(e.target.value))}
            style={{ width: "100%", accentColor: "var(--gold)" }}
          />
        </div>

        {/* Quick Actions */}
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={clearAllFog}
            className="btn btn-gold"
            style={{ flex: 1, fontSize: "0.8rem", padding: "8px 12px" }}
          >
            <DnDIcon icon="search" size={14} /> Rivela Tutto
          </button>
          <button
            onClick={resetAllFog}
            className="btn btn-ghost"
            style={{ flex: 1, fontSize: "0.8rem", padding: "8px 12px" }}
          >
            <DnDIcon icon="cave" size={14} /> Oscura Tutto
          </button>
        </div>
      </div>

      {/* Canvas Editor */}
      <div style={{
        background: "rgba(0,0,0,0.5)",
        border: "2px solid rgba(212,175,55,0.3)",
        borderRadius: 8,
        padding: 12,
        position: "relative",
      }}>
        <div style={{
          position: "relative",
          width: "100%",
          maxWidth: 800,
          margin: "0 auto",
          aspectRatio: "1 / 1",
        }}>
          {/* Background Map */}
          <img
            src={mapUrl}
            alt="Mappa"
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              objectFit: "contain",
              pointerEvents: "none",
            }}
          />

          {/* Fog Canvas */}
          <canvas
            ref={canvasRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              cursor: mode === "reveal" ? "crosshair" : "not-allowed",
              touchAction: "none",
            }}
          />
        </div>

        <div style={{
          textAlign: "center",
          marginTop: 12,
          fontSize: "0.75rem",
          color: "rgba(212,175,55,0.6)",
          fontStyle: "italic",
        }}>
          Clicca e trascina per {mode === "reveal" ? "rivelare" : "nascondere"} aree della mappa
        </div>
      </div>

      {/* Info */}
      <div style={{
        background: "rgba(212,175,55,0.05)",
        border: "1px solid rgba(212,175,55,0.1)",
        borderRadius: 8,
        padding: 12,
        fontSize: "0.75rem",
        color: "rgba(212,175,55,0.6)",
        lineHeight: 1.6,
      }}>
        <DnDIcon icon="search" size={12} /> <strong>Come funziona:</strong><br />
        • Le modifiche vengono salvate automaticamente e inviate alla TV<br />
        • I giocatori vedranno solo le aree rivelate<br />
        • Usa "Rivela" per scoprire zone, "Nascondi" per oscurarle di nuovo
      </div>
    </div>
  );
}
