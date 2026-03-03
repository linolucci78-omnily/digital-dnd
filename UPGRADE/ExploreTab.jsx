// ═══════════════════════════════════════════════
//  ExploreTab — Tab Esplorazione per Mobile
//  Mostra location corrente, POI, azioni skill check
// ═══════════════════════════════════════════════

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../lib/supabase.js";
import ModalDialog from "../shared/components/ModalDialog.jsx";
import DnDIcon from "../shared/components/DnDIcon.jsx";

const POI_ICONS = {
  npc: "npc",
  chest: "chest",
  door: "door",
  trap: "damage",
  secret: "search",
  lore: "scroll",
  hazard: "skull",
};

const POI_COLORS = {
  npc: "#60c0f0",
  chest: "#d4af37",
  door: "#8b7355",
  trap: "#c04040",
  secret: "#9b59b6",
  lore: "#e67e22",
  hazard: "#e74c3c",
};

const SKILL_CHECKS = [
  { id: "perception", label: "Cerco", skill: "perception", ability: "wisdom", description: "Tiro Percezione per trovare cose nascoste" },
  { id: "investigation", label: "🔎 Indago", skill: "investigation", ability: "intelligence", description: "Tiro Indagare per capire dettagli" },
  { id: "athletics", label: "💪 Forzo", skill: "athletics", ability: "strength", description: "Tiro Atletica per sfondare/spostare" },
  { id: "sleight_of_hand", label: "🔓 Scassino", skill: "sleight_of_hand", ability: "dexterity", description: "Tiro Destrezza di Mano per scassinare" },
];

function getMod(score) {
  return Math.floor((score - 10) / 2);
}

export default function ExploreTab({ character, campaign, session, onRollDice }) {
  const [currentLocation, setCurrentLocation] = useState(null);
  const [pois, setPois] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPOI, setSelectedPOI] = useState(null);
  const [modal, setModal] = useState({ isOpen: false, type: "alert", title: "", message: "", onConfirm: null });

  // Carica location corrente e POI scoperti
  useEffect(() => {
    if (!campaign?.id) return;
    loadCurrentLocation();

    // Realtime: ascolta cambiamenti location/POI
    const locationChannel = supabase
      .channel(`location-changes-${campaign.id}`)
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "locations",
        filter: `campaign_id=eq.${campaign.id}`,
      }, () => {
        loadCurrentLocation();
      })
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "points_of_interest",
      }, () => {
        loadCurrentLocation();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(locationChannel);
    };
  }, [campaign?.id]);

  const loadCurrentLocation = async () => {
    setLoading(true);
    try {
      // Location corrente
      const { data: location } = await supabase
        .from("locations")
        .select("*")
        .eq("campaign_id", campaign.id)
        .eq("is_current", true)
        .maybeSingle();

      setCurrentLocation(location);

      if (location) {
        // POI scoperti
        const { data: poisData } = await supabase
          .from("points_of_interest")
          .select("*")
          .eq("location_id", location.id)
          .eq("discovered", true);

        setPois(poisData || []);
      } else {
        setPois([]);
      }
    } catch (e) {
      console.error("Errore caricamento location:", e);
    } finally {
      setLoading(false);
    }
  };

  // Skill check
  const handleSkillCheck = async (skillCheck) => {
    const abilityScore = character[skillCheck.ability] || 10;
    const abilityMod = getMod(abilityScore);
    const profBonus = character.proficiency_bonus || 2;
    const isProf = (character.proficiencies || []).includes(skillCheck.skill);
    const bonus = isProf ? abilityMod + profBonus : abilityMod;

    // Tiro d20
    const d20 = Math.floor(Math.random() * 20) + 1;
    const total = d20 + bonus;

    // Broadcast alla TV tramite onRollDice
    if (onRollDice) {
      onRollDice({
        dice: ["d20"],
        total,
        rolls: [{ type: "d20", value: d20 }],
        modifier: bonus,
        label: `${skillCheck.label} (${skillCheck.skill.toUpperCase()})`,
      });
    }

    // Broadcast skill check al DM per controllo automatico CD
    if (session?.id && currentLocation?.id) {
      const dmChannel = supabase.channel(`session-tv-${session.id}`);
      await dmChannel.send({
        type: "broadcast",
        event: "skill_check",
        payload: {
          characterId: character.id,
          characterName: character.name,
          skill: skillCheck.skill,
          skillLabel: skillCheck.label,
          total,
          d20,
          modifier: bonus,
          locationId: currentLocation.id,
          timestamp: Date.now(),
        },
      });
    }
  };

  // Interagisci con POI
  const handleInteractPOI = (poi) => {
    setSelectedPOI(poi);
  };

  // Muovi il personaggio verso un POI
  const handleMoveToPOI = async (poi) => {
    if (!character?.id || !session?.id || !poi) return;

    try {
      // Calcola posizione VICINO al POI (non sopra)
      // Offset casuale per evitare sovrapposizione
      const offsetDistance = 8; // 8% di distanza dal POI
      const angle = Math.random() * Math.PI * 2; // Angolo casuale
      const targetX = poi.x + Math.cos(angle) * offsetDistance;
      const targetY = poi.y + Math.sin(angle) * offsetDistance;

      // Clamp tra 5% e 95% per evitare di uscire dalla mappa
      const clampedX = Math.max(5, Math.min(95, targetX));
      const clampedY = Math.max(5, Math.min(95, targetY));

      // Aggiorna posizione nel database
      const { error } = await supabase
        .from("characters")
        .update({
          map_x: clampedX,
          map_y: clampedY,
        })
        .eq("id", character.id);

      if (error) {
        console.error("Errore movimento:", error);
        return;
      }

      // Broadcast movimento alla TV
      const tvChannel = supabase.channel(`session-tv-${session.id}`);
      await tvChannel.send({
        type: "broadcast",
        event: "character_moved",
        payload: {
          characterId: character.id,
          characterName: character.name,
          x: clampedX,
          y: clampedY,
        },
      });

      // Feedback visivo
      setModal({
        isOpen: true,
        type: "success",
        title: "In Movimento",
        message: `${character.name} si muove verso ${poi.name}! 🚶`,
        confirmText: "OK",
      });
      setSelectedPOI(null);
    } catch (e) {
      console.error("Errore movimento:", e);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: "var(--parchment-dark)" }}>
        Caricamento...
      </div>
    );
  }

  if (!currentLocation) {
    return (
      <div style={{ padding: 40, textAlign: "center" }}>
        <div style={{ fontSize: "3rem", marginBottom: 16 }}><DnDIcon icon="explore" size={48} /></div>
        <div style={{ color: "var(--parchment-dark)", fontSize: "0.9rem" }}>
          Nessuna location attiva.
          <br />
          Il DM deve attivare una scena.
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Modal Dialog */}
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

      {/* Location Header */}
      <div className="glass-card" style={{ padding: 16 }}>
        <div style={{ fontFamily: "var(--font-heading)", fontSize: "1.1rem", color: "var(--gold)", marginBottom: 6 }}>
          📍 {currentLocation.name}
        </div>
        {currentLocation.description && (
          <div style={{ fontSize: "0.8rem", color: "var(--parchment-dark)", lineHeight: 1.5 }}>
            {currentLocation.description}
          </div>
        )}
      </div>

      {/* Azioni Rapide */}
      <div className="glass-card" style={{ padding: 16 }}>
        <div style={{ fontFamily: "var(--font-heading)", fontSize: "0.7rem", color: "var(--gold)", letterSpacing: "0.15em", marginBottom: 12 }}>
          AZIONI RAPIDE
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8 }}>
          {SKILL_CHECKS.map(check => (
            <button
              key={check.id}
              className="btn btn-ghost"
              onClick={() => handleSkillCheck(check)}
              style={{
                padding: "12px 8px",
                fontSize: "0.85rem",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 4,
              }}
            >
              <span style={{ fontSize: "1.2rem" }}>{check.label.split(" ")[0]}</span>
              <span style={{ fontSize: "0.7rem" }}>{check.label.split(" ")[1]}</span>
            </button>
          ))}
        </div>
        <div style={{ fontSize: "0.65rem", color: "var(--parchment-dark)", marginTop: 10, textAlign: "center", fontStyle: "italic" }}>
          Tira automaticamente con i tuoi modificatori
        </div>
      </div>

      {/* Points of Interest */}
      {pois.length > 0 && (
        <div className="glass-card" style={{ padding: 16 }}>
          <div style={{ fontFamily: "var(--font-heading)", fontSize: "0.7rem", color: "var(--gold)", letterSpacing: "0.15em", marginBottom: 12 }}>
            LUOGHI E OGGETTI ({pois.length})
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {pois.map(poi => (
              <motion.div
                key={poi.id}
                className="glass-card"
                style={{
                  padding: 12,
                  background: "rgba(0,0,0,0.3)",
                  border: `1px solid ${POI_COLORS[poi.type]}40`,
                  borderLeft: `3px solid ${POI_COLORS[poi.type]}`,
                }}
                whileTap={{ scale: 0.98 }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{
                    width: 40,
                    height: 40,
                    borderRadius: "50%",
                    background: `${POI_COLORS[poi.type]}20`,
                    border: `2px solid ${POI_COLORS[poi.type]}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "1.2rem",
                    flexShrink: 0,
                  }}>
                    {<DnDIcon icon={POI_ICONS[poi.type] || "star"} size={20} color="var(--gold)" />}
                  </div>
                  <div style={{ flex: 1, cursor: "pointer" }} onClick={() => handleInteractPOI(poi)}>
                    <div style={{ fontFamily: "var(--font-heading)", color: "var(--parchment)", fontSize: "0.9rem" }}>
                      {poi.name}
                    </div>
                    {poi.description && (
                      <div style={{ fontSize: "0.7rem", color: "var(--parchment-dark)", marginTop: 2 }}>
                        {poi.description}
                      </div>
                    )}
                  </div>
                  {/* Bottone movimento rapido */}
                  <button
                    className="btn btn-ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMoveToPOI(poi);
                    }}
                    style={{
                      padding: "6px 10px",
                      fontSize: "1rem",
                      minWidth: "auto",
                      background: `${POI_COLORS[poi.type]}15`,
                      border: `1px solid ${POI_COLORS[poi.type]}50`,
                    }}
                  >
                    📍
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {pois.length === 0 && (
        <div style={{ textAlign: "center", padding: 30, color: "var(--parchment-dark)", fontSize: "0.85rem", fontStyle: "italic" }}>
          Nessun luogo o oggetto scoperto.
          <br />
          Usa "Cerco" per esplorare!
        </div>
      )}

      {/* Modal POI Dettagli */}
      <AnimatePresence>
        {selectedPOI && (
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
            onClick={() => setSelectedPOI(null)}
          >
            <motion.div
              className="glass-card"
              style={{
                padding: 24,
                maxWidth: 400,
                width: "100%",
                border: `2px solid ${POI_COLORS[selectedPOI.type]}`,
              }}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ textAlign: "center", fontSize: "3rem", marginBottom: 12 }}>
                {<DnDIcon icon={POI_ICONS[selectedPOI.type] || "star"} size={40} color="var(--gold)" />}
              </div>

              <h3 style={{
                fontFamily: "var(--font-heading)",
                color: POI_COLORS[selectedPOI.type],
                textAlign: "center",
                marginBottom: 16,
                fontSize: "1.2rem",
              }}>
                {selectedPOI.name}
              </h3>

              {selectedPOI.description && (
                <div style={{
                  color: "var(--parchment-dark)",
                  fontSize: "0.85rem",
                  lineHeight: 1.6,
                  marginBottom: 16,
                  textAlign: "center",
                }}>
                  {selectedPOI.description}
                </div>
              )}

              {selectedPOI.interaction_text && (
                <div style={{
                  background: "rgba(212,175,55,0.1)",
                  border: "1px solid rgba(212,175,55,0.3)",
                  borderRadius: 6,
                  padding: 12,
                  fontSize: "0.8rem",
                  color: "var(--parchment)",
                  marginBottom: 16,
                  fontStyle: "italic",
                }}>
                  "{selectedPOI.interaction_text}"
                </div>
              )}

              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {/* Bottone Vai Qui - Sempre visibile */}
                <button
                  className="btn btn-gold"
                  onClick={() => handleMoveToPOI(selectedPOI)}
                  style={{
                    width: "100%",
                    background: `linear-gradient(135deg, ${POI_COLORS[selectedPOI.type]}, ${POI_COLORS[selectedPOI.type]}cc)`,
                    border: `2px solid ${POI_COLORS[selectedPOI.type]}`,
                  }}
                >
                  📍 Vai qui
                </button>

                {/* Bottoni interazione specifici per tipo */}
                {selectedPOI.type === "npc" && (
                  <button className="btn btn-ghost" style={{ width: "100%" }}>
                    💬 Parla
                  </button>
                )}
                {selectedPOI.type === "chest" && (
                  <button className="btn btn-ghost" style={{ width: "100%" }}>
                    Apri Scrigno
                  </button>
                )}
                {selectedPOI.type === "door" && (
                  <button className="btn btn-ghost" style={{ width: "100%" }}>
                    Apri Porta
                  </button>
                )}

                <button
                  className="btn btn-ghost"
                  onClick={() => setSelectedPOI(null)}
                  style={{ width: "100%" }}
                >
                  Chiudi
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
