// ═══════════════════════════════════════════════════════════
//  CreateSceneForm — Form con accordion sections (stile screenshot)
// ═══════════════════════════════════════════════════════════

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../lib/supabase";

export default function CreateSceneForm({ onSubmit, onCancel, campaignId }) {
  const [expandedSections, setExpandedSections] = useState({
    basic: true,
    map: false,
    grid: false,
    page: false,
    fog: false,
  });

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    scene_type: "exploration",
    // Grid Settings
    gridEnabled: true,
    gridType: "square",
    gridSize: 200, // Increased from 140px for better token visibility (tokens are ~100-150px)
    gridColor: "#d4af37",
    gridOpacity: 0.45,
    gridScale: 5,
    gridScaleUnit: "ft",
    snapToGrid: false,
    // Page Settings
    pageWidth: 25,
    pageHeight: 25,
    backgroundColor: "#1a1410",
    // Fog of War
    fogEnabled: false,
  });

  const toggleSection = (section) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // Map upload
  const [mapFile, setMapFile] = useState(null);
  const [mapPreview, setMapPreview] = useState(null);
  const [mapUploading, setMapUploading] = useState(false);
  const [mapUrl, setMapUrl] = useState(null);
  const fileInputRef = useRef(null);

  const handleMapSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setMapFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setMapPreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  const uploadMap = async () => {
    if (!mapFile) return null;
    setMapUploading(true);
    try {
      const ext = mapFile.name.split(".").pop();
      const fileName = `scene_thumb_${Date.now()}.${ext}`;
      const filePath = `thumbnails/${fileName}`;
      const { error } = await supabase.storage
        .from("maps").upload(filePath, mapFile, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from("maps").getPublicUrl(filePath);
      setMapUrl(data.publicUrl);
      return data.publicUrl;
    } catch (err) {
      console.error("Errore upload mappa:", err);
      return null;
    } finally {
      setMapUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;
    // Upload mappa se presente
    let finalMapUrl = mapUrl;
    if (mapFile && !mapUrl) {
      finalMapUrl = await uploadMap();
    }
    onSubmit({ ...formData, map_url: finalMapUrl });
  };

  // Stile per accordion header
  const accordionHeaderStyle = (isExpanded) => ({
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "16px 20px",
    background: isExpanded
      ? "linear-gradient(90deg, rgba(212,175,55,0.15) 0%, rgba(212,175,55,0.05) 100%)"
      : "rgba(255,255,255,0.03)",
    borderLeft: isExpanded ? "3px solid var(--gold)" : "3px solid transparent",
    cursor: "pointer",
    transition: "all 0.2s ease",
    marginBottom: isExpanded ? 0 : 12,
  });

  const accordionTitleStyle = {
    fontFamily: "var(--font-heading)",
    fontSize: "0.95rem",
    color: "var(--gold)",
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
  };

  const inputStyle = {
    width: "100%",
    padding: "10px 14px",
    background: "rgba(0,0,0,0.5)",
    border: "1px solid rgba(212,175,55,0.3)",
    borderRadius: 6,
    color: "#fff",
    fontSize: "0.95rem",
    transition: "all 0.2s ease",
  };

  const labelStyle = {
    display: "block",
    marginBottom: 8,
    fontSize: "0.85rem",
    color: "rgba(255,255,255,0.6)",
    fontWeight: 500,
  };

  return (
    <form onSubmit={handleSubmit} style={{ width: "100%" }}>
      {/* BASIC INFO SECTION */}
      <div style={{ marginBottom: 12 }}>
        <div
          onClick={() => toggleSection("basic")}
          style={accordionHeaderStyle(expandedSections.basic)}
        >
          <span style={accordionTitleStyle}>Basic Info</span>
          <motion.span
            animate={{ rotate: expandedSections.basic ? 90 : 0 }}
            style={{ color: "var(--gold)", fontSize: "1.2rem" }}
          >
            ›
          </motion.span>
        </div>

        <AnimatePresence>
          {expandedSections.basic && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              style={{
                overflow: "hidden",
                padding: "20px",
                background: "rgba(0,0,0,0.2)",
                marginBottom: 12,
              }}
            >
              <div style={{ marginBottom: 20 }}>
                <label style={labelStyle}>Nome Scena *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Esplorazione"
                  required
                  autoFocus
                  style={inputStyle}
                  onFocus={(e) => e.target.style.borderColor = "rgba(212,175,55,0.6)"}
                  onBlur={(e) => e.target.style.borderColor = "rgba(212,175,55,0.3)"}
                />
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={labelStyle}>Tipologia</label>
                <select
                  value={formData.scene_type}
                  onChange={(e) => setFormData({ ...formData, scene_type: e.target.value })}
                  style={inputStyle}
                >
                  <option value="exploration">Esplorazione</option>
                  <option value="combat">Combattimento</option>
                  <option value="social">Social</option>
                </select>
              </div>

              <div>
                <label style={labelStyle}>Descrizione (opzionale)</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }}
                  onFocus={(e) => e.target.style.borderColor = "rgba(212,175,55,0.6)"}
                  onBlur={(e) => e.target.style.borderColor = "rgba(212,175,55,0.3)"}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* MAPPA / THUMBNAIL SECTION */}
      <div style={{ marginBottom: 12 }}>
        <div
          onClick={() => toggleSection("map")}
          style={accordionHeaderStyle(expandedSections.map)}
        >
          <span style={accordionTitleStyle}>Mappa / Thumbnail</span>
          <motion.span
            animate={{ rotate: expandedSections.map ? 90 : 0 }}
            style={{ color: "var(--gold)", fontSize: "1.2rem" }}
          >
            ›
          </motion.span>
        </div>
        <AnimatePresence>
          {expandedSections.map && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              style={{ overflow: "hidden" }}
            >
              <div style={{ padding: "16px 20px" }}>
                {/* Preview */}
                {mapPreview ? (
                  <div style={{ marginBottom: 14 }}>
                    <div style={{
                      width: "100%", height: 160, borderRadius: 8,
                      overflow: "hidden", border: "2px solid rgba(212,175,55,0.3)",
                      position: "relative",
                    }}>
                      <img src={mapPreview} alt="preview"
                        style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      <button
                        onClick={() => { setMapFile(null); setMapPreview(null); setMapUrl(null); }}
                        style={{
                          position: "absolute", top: 6, right: 6,
                          background: "rgba(0,0,0,0.7)", border: "1px solid rgba(255,255,255,0.2)",
                          borderRadius: 4, color: "#ff6b6b",
                          cursor: "pointer", padding: "2px 8px", fontSize: "0.7rem",
                        }}
                      >
                        Rimuovi
                      </button>
                    </div>
                    <div style={{
                      fontSize: "0.65rem", color: "rgba(255,255,255,0.4)",
                      marginTop: 6, textAlign: "center",
                    }}>
                      {mapFile?.name} ({(mapFile?.size / 1024).toFixed(0)} KB)
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      width: "100%", height: 120, borderRadius: 8,
                      border: "2px dashed rgba(212,175,55,0.3)",
                      display: "flex", flexDirection: "column",
                      alignItems: "center", justifyContent: "center", gap: 8,
                      cursor: "pointer", marginBottom: 14,
                      background: "rgba(212,175,55,0.03)",
                      transition: "border-color 0.2s",
                    }}
                  >
                    <span style={{ fontSize: "1.5rem", color: "rgba(212,175,55,0.4)" }}>+</span>
                    <span style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.35)" }}>
                      Clicca per caricare un'immagine
                    </span>
                    <span style={{ fontSize: "0.6rem", color: "rgba(255,255,255,0.2)" }}>
                      JPG, PNG, WebP
                    </span>
                  </div>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleMapSelect}
                  style={{ display: "none" }}
                />

                <p style={{
                  fontSize: "0.6rem", color: "rgba(255,255,255,0.25)",
                  fontStyle: "italic", margin: 0, textAlign: "center",
                }}>
                  Questa immagine apparira come thumbnail nella lista scene e come mappa nella minimap.
                  Puoi aggiungere la mappa completa nell'editor.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* GRID & MEASUREMENT SECTION */}
      <div style={{ marginBottom: 12 }}>
        <div
          onClick={() => toggleSection("grid")}
          style={accordionHeaderStyle(expandedSections.grid)}
        >
          <span style={accordionTitleStyle}>Grid & Measurement</span>
          <motion.span
            animate={{ rotate: expandedSections.grid ? 90 : 0 }}
            style={{ color: "var(--gold)", fontSize: "1.2rem" }}
          >
            ›
          </motion.span>
        </div>

        <AnimatePresence>
          {expandedSections.grid && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              style={{
                overflow: "hidden",
                padding: "20px",
                background: "rgba(0,0,0,0.2)",
                marginBottom: 12,
              }}
            >
              <label style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={formData.gridEnabled}
                  onChange={(e) => setFormData({ ...formData, gridEnabled: e.target.checked })}
                  style={{ width: 18, height: 18, cursor: "pointer" }}
                />
                <span style={{ color: "rgba(255,255,255,0.8)", fontSize: "0.9rem" }}>Enable Grid</span>
              </label>

              {formData.gridEnabled && (
                <>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
                    <div>
                      <label style={labelStyle}>Grid Type</label>
                      <select
                        value={formData.gridType}
                        onChange={(e) => setFormData({ ...formData, gridType: e.target.value })}
                        style={inputStyle}
                      >
                        <option value="square">Square</option>
                        <option value="hex">Hex</option>
                      </select>
                    </div>
                    <div>
                      <label style={labelStyle}>Grid Size (px)</label>
                      <input
                        type="number"
                        min="10"
                        max="500"
                        value={formData.gridSize}
                        onChange={(e) => setFormData({ ...formData, gridSize: parseInt(e.target.value) })}
                        style={inputStyle}
                      />
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
                    <div>
                      <label style={labelStyle}>Grid Scale</label>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={formData.gridScale}
                        onChange={(e) => setFormData({ ...formData, gridScale: parseInt(e.target.value) })}
                        style={inputStyle}
                      />
                    </div>
                    <div>
                      <label style={labelStyle}>Unit</label>
                      <select
                        value={formData.gridScaleUnit}
                        onChange={(e) => setFormData({ ...formData, gridScaleUnit: e.target.value })}
                        style={inputStyle}
                      >
                        <option value="ft">feet</option>
                        <option value="m">meters</option>
                        <option value="km">kilometers</option>
                        <option value="mi">miles</option>
                      </select>
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                    <div>
                      <label style={labelStyle}>Grid Color</label>
                      <input
                        type="color"
                        value={formData.gridColor}
                        onChange={(e) => setFormData({ ...formData, gridColor: e.target.value })}
                        style={{ ...inputStyle, height: 40, padding: 4, cursor: "pointer" }}
                      />
                    </div>
                    <div>
                      <label style={labelStyle}>Opacity ({Math.round(formData.gridOpacity * 100)}%)</label>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={formData.gridOpacity}
                        onChange={(e) => setFormData({ ...formData, gridOpacity: parseFloat(e.target.value) })}
                        style={{ width: "100%", marginTop: 8 }}
                      />
                    </div>
                  </div>

                  <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={formData.snapToGrid}
                      onChange={(e) => setFormData({ ...formData, snapToGrid: e.target.checked })}
                      style={{ width: 16, height: 16, cursor: "pointer" }}
                    />
                    <span style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.85rem" }}>Snap objects to grid</span>
                  </label>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* PAGE DIMENSIONS SECTION */}
      <div style={{ marginBottom: 12 }}>
        <div
          onClick={() => toggleSection("page")}
          style={accordionHeaderStyle(expandedSections.page)}
        >
          <span style={accordionTitleStyle}>Page Dimensions</span>
          <motion.span
            animate={{ rotate: expandedSections.page ? 90 : 0 }}
            style={{ color: "var(--gold)", fontSize: "1.2rem" }}
          >
            ›
          </motion.span>
        </div>

        <AnimatePresence>
          {expandedSections.page && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              style={{
                overflow: "hidden",
                padding: "20px",
                background: "rgba(0,0,0,0.2)",
                marginBottom: 12,
              }}
            >
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
                <div>
                  <label style={labelStyle}>Width (cells)</label>
                  <input
                    type="number"
                    min="5"
                    max="100"
                    value={formData.pageWidth}
                    onChange={(e) => setFormData({ ...formData, pageWidth: parseInt(e.target.value) })}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Height (cells)</label>
                  <input
                    type="number"
                    min="5"
                    max="100"
                    value={formData.pageHeight}
                    onChange={(e) => setFormData({ ...formData, pageHeight: parseInt(e.target.value) })}
                    style={inputStyle}
                  />
                </div>
              </div>

              <div>
                <label style={labelStyle}>Background Color</label>
                <input
                  type="color"
                  value={formData.backgroundColor}
                  onChange={(e) => setFormData({ ...formData, backgroundColor: e.target.value })}
                  style={{ ...inputStyle, height: 40, padding: 4, cursor: "pointer" }}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* FOG OF WAR SECTION */}
      <div style={{ marginBottom: 32 }}>
        <div
          onClick={() => toggleSection("fog")}
          style={accordionHeaderStyle(expandedSections.fog)}
        >
          <span style={accordionTitleStyle}>Fog of War</span>
          <motion.span
            animate={{ rotate: expandedSections.fog ? 90 : 0 }}
            style={{ color: "var(--gold)", fontSize: "1.2rem" }}
          >
            ›
          </motion.span>
        </div>

        <AnimatePresence>
          {expandedSections.fog && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              style={{
                overflow: "hidden",
                padding: "20px",
                background: "rgba(0,0,0,0.2)",
                marginBottom: 12,
              }}
            >
              <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={formData.fogEnabled}
                  onChange={(e) => setFormData({ ...formData, fogEnabled: e.target.checked })}
                  style={{ width: 18, height: 18, cursor: "pointer" }}
                />
                <span style={{ color: "rgba(255,255,255,0.8)", fontSize: "0.9rem" }}>Enable Fog of War</span>
              </label>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* SUBMIT BUTTON */}
      <motion.button
        type="submit"
        whileHover={{ scale: 1.02, boxShadow: "0 0 30px rgba(212,175,55,0.6)" }}
        whileTap={{ scale: 0.98 }}
        style={{
          width: "100%",
          padding: "16px",
          fontSize: "1rem",
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.1em",
          background: "linear-gradient(135deg, #d4af37 0%, #b8941f 100%)",
          border: "none",
          borderRadius: 8,
          color: "#000",
          cursor: "pointer",
          boxShadow: "0 4px 15px rgba(212,175,55,0.3)",
          transition: "all 0.2s ease",
        }}
      >
        Crea Scena
      </motion.button>
    </form>
  );
}
