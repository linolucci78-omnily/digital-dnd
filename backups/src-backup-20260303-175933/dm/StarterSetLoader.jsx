// ═══════════════════════════════════════════════
//  StarterSetLoader — Carica Avventura Starter Set
//  Popola automaticamente Location, POI, NPC, Mostri
// ═══════════════════════════════════════════════

import { useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "../lib/supabase.js";
import starterSetData from "../data/starter_set_seed.json";

export default function StarterSetLoader({ campaign }) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleLoadStarterSet = async () => {
    if (!campaign?.id) {
      setError("Nessuna campagna selezionata!");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(false);
    setStatus("Iniziando caricamento...");

    try {
      // 1. Carica Locations
      setStatus(`Caricamento ${starterSetData.locations.length} location...`);

      const locationsToInsert = starterSetData.locations.map(loc => ({
        campaign_id: campaign.id,
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
      setStatus("Caricamento Points of Interest...");
      let totalPOIs = 0;

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
          totalPOIs += poisToInsert.length;
        }
      }

      // 3. Success!
      setStatus("Completato!");
      setSuccess(true);

      setTimeout(() => {
        setStatus(`
          ✅ ${insertedLocations.length} location caricate
          ✅ ${totalPOIs} POI caricati

          Pronto per giocare!
        `);
      }, 500);

    } catch (err) {
      console.error("Errore caricamento Starter Set:", err);
      setError(err.message);
      setStatus("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontFamily: "var(--font-heading)", color: "var(--gold)", marginBottom: 8 }}>
          📚 Carica Avventura Starter Set
        </h2>
        <p style={{ color: "var(--parchment-dark)", fontSize: "0.9rem", lineHeight: 1.6 }}>
          Carica automaticamente l'avventura <strong>"Lost Mine of Phandelver"</strong> con:
        </p>
        <ul style={{ color: "var(--parchment-dark)", fontSize: "0.85rem", marginTop: 10, paddingLeft: 20 }}>
          <li>✅ {starterSetData.locations.length} Location complete (mappe incluse)</li>
          <li>✅ {starterSetData.locations.reduce((sum, loc) => sum + (loc.pois?.length || 0), 0)} Points of Interest</li>
          <li>✅ POI nascosti con CD già configurati</li>
          <li>✅ Testi descrittivi del manuale</li>
        </ul>
      </div>

      <div className="glass-card" style={{ padding: 20, marginBottom: 20, background: "rgba(212,175,55,0.05)" }}>
        <div style={{ fontSize: "0.85rem", color: "var(--parchment-dark)", marginBottom: 12 }}>
          ⚠️ <strong>Attenzione:</strong> Questo caricherà nuove location nella campagna corrente.
        </div>
        <div style={{ fontSize: "0.8rem", color: "var(--parchment-dark)" }}>
          Campagna: <strong style={{ color: "var(--gold)" }}>{campaign?.name || "Nessuna"}</strong>
        </div>
      </div>

      {!success && (
        <button
          className="btn btn-gold"
          onClick={handleLoadStarterSet}
          disabled={loading || !campaign}
          style={{
            width: "100%",
            padding: "16px",
            fontSize: "1rem",
            marginBottom: 20,
          }}
        >
          {loading ? "⏳ Caricamento..." : "🚀 Carica Starter Set"}
        </button>
      )}

      {status && (
        <motion.div
          className="glass-card"
          style={{
            padding: 16,
            background: success ? "rgba(46,204,113,0.1)" : "rgba(212,175,55,0.1)",
            border: `1px solid ${success ? "#2ecc71" : "var(--gold)"}`,
            marginBottom: 20,
          }}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div style={{
            fontSize: "0.9rem",
            color: success ? "#2ecc71" : "var(--gold)",
            whiteSpace: "pre-line",
            textAlign: "center",
          }}>
            {status}
          </div>
        </motion.div>
      )}

      {error && (
        <motion.div
          className="glass-card"
          style={{
            padding: 16,
            background: "rgba(192,64,64,0.1)",
            border: "1px solid #c04040",
          }}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div style={{ fontSize: "0.9rem", color: "#c04040" }}>
            ❌ Errore: {error}
          </div>
        </motion.div>
      )}

      {success && (
        <div style={{ marginTop: 20 }}>
          <div className="glass-card" style={{ padding: 16, background: "rgba(46,204,113,0.05)" }}>
            <h3 style={{ fontFamily: "var(--font-heading)", color: "#2ecc71", marginBottom: 12 }}>
              🎉 Avventura Caricata!
            </h3>
            <p style={{ color: "var(--parchment-dark)", fontSize: "0.85rem", marginBottom: 12 }}>
              Vai al tab <strong>"🗺️ Scene"</strong> per:
            </p>
            <ul style={{ color: "var(--parchment-dark)", fontSize: "0.8rem", paddingLeft: 20 }}>
              <li>Attivare la prima scena</li>
              <li>Vedere tutti i POI sulla mappa</li>
              <li>Iniziare a giocare!</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
