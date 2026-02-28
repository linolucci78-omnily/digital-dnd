// ═══════════════════════════════════════════════
//  AdventurePlayer — Modalità Avventura Guidata
//  Mostra scene, scelte, narrativa interattiva
// ═══════════════════════════════════════════════

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../lib/supabase.js";
import { getAdventure, getScene } from "../shared/constants/adventures.js";
import MusicPlayer from "../shared/components/MusicPlayer.jsx";

export default function AdventurePlayer({ character, session, campaign, onBack }) {
  const [currentScene, setCurrentScene] = useState(null);
  const [adventure, setAdventure] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedChoice, setSelectedChoice] = useState(null);
  const [skillCheckResult, setSkillCheckResult] = useState(null);
  const [showCharacterSheet, setShowCharacterSheet] = useState(false);

  // Carica avventura e scena corrente
  useEffect(() => {
    if (!session?.current_adventure_id) {
      setLoading(false);
      return;
    }

    const adv = getAdventure(session.current_adventure_id);
    setAdventure(adv);

    const sceneId = session.current_scene_id || adv.startScene;
    const scene = getScene(session.current_adventure_id, sceneId);
    setCurrentScene(scene);
    setLoading(false);
  }, [session]);

  // Realtime sync per cambio scena
  useEffect(() => {
    if (!session?.id) return;

    const channel = supabase
      .channel(`session-${session.id}`)
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "sessions",
        filter: `id=eq.${session.id}`,
      }, ({ new: updated }) => {
        if (updated.current_scene_id) {
          const scene = getScene(updated.current_adventure_id, updated.current_scene_id);
          setCurrentScene(scene);
          // Reset delle scelte quando cambia scena
          setSelectedChoice(null);
          setSkillCheckResult(null);
        }
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [session?.id]);

  // Gestione scelta
  const handleChoice = async (choice) => {
    setSelectedChoice(choice);

    // Se è una prova abilità
    if (choice.type === "skill_check") {
      await performSkillCheck(choice);
    }
    // Se è dialogo/azione diretta
    else if (choice.type === "dialogue") {
      await applyConsequence(choice.consequence);
    }
  };

  // Esegui prova abilità
  const performSkillCheck = async (choice) => {
    const skill = choice.skill;
    const dc = choice.dc;

    // Calcola modificatore (semplificato - dovresti prendere dalla scheda)
    const abilityScore = character[getAbilityForSkill(skill)] || 10;
    const modifier = Math.floor((abilityScore - 10) / 2);
    const profBonus = getProficiencyBonus(character.level);
    const isProficient = (character.proficiencies || []).includes(skill);
    const totalModifier = isProficient ? modifier + profBonus : modifier;

    // Tira d20
    const roll = Math.floor(Math.random() * 20) + 1;
    const total = roll + totalModifier;
    const success = total >= dc;

    const result = {
      skill,
      dc,
      roll,
      modifier: totalModifier,
      total,
      success,
    };

    setSkillCheckResult(result);

    // Broadcast dado alla TV
    if (window.__tvChannel) {
      await window.__tvChannel.send({
        type: "broadcast",
        event: "dice_roll",
        payload: {
          characterId: character.id,
          characterName: character.name,
          tokenColor: character.token_color,
          type: "d20",
          result: roll,
          modifier: totalModifier,
          total,
          label: `${getSkillName(skill)} (CD ${dc})`,
          timestamp: Date.now(),
        },
      });
    }

    // Reset dopo 5 secondi per permettere altre scelte
    setTimeout(() => {
      setSelectedChoice(null);
      setSkillCheckResult(null);
    }, 5000);

    // Aspetta un momento per mostrare il risultato
    setTimeout(() => {
      const consequence = success ? choice.onSuccess : choice.onFailure;
      applyConsequence(consequence);
    }, 3000);
  };

  // Applica conseguenza di una scelta
  const applyConsequence = async (consequence) => {
    if (!consequence) return;

    // Applica ricompense
    if (consequence.rewards) {
      const { gold, xp, items, damage } = consequence.rewards;

      if (gold) {
        // TODO: Aggiungi oro al personaggio
      }
      if (xp) {
        // TODO: Aggiungi XP al personaggio
      }
      if (items) {
        // TODO: Aggiungi items all'inventario
      }
      if (damage) {
        // TODO: Applica danno
      }
    }

    // Vai alla prossima scena
    if (consequence.nextScene) {
      await goToScene(consequence.nextScene);
    }

    setSelectedChoice(null);
    setSkillCheckResult(null);
  };

  // Vai a una nuova scena
  const goToScene = async (sceneId) => {
    const scene = getScene(session.current_adventure_id, sceneId);
    setCurrentScene(scene);

    // Aggiorna nel database (solo il DM dovrebbe farlo normalmente)
    // Per ora lo facciamo dal giocatore per semplicità
    await supabase
      .from("sessions")
      .update({ current_scene_id: sceneId })
      .eq("id", session.id);
  };

  if (loading) {
    return (
      <div style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--bg-primary)",
      }}>
        <div style={{ color: "var(--gold)", fontFamily: "var(--font-heading)" }}>
          Caricamento avventura...
        </div>
      </div>
    );
  }

  if (!adventure || !currentScene) {
    return (
      <div style={{
        minHeight: "100vh",
        padding: 20,
        background: "var(--bg-primary)",
      }}>
        <div style={{ textAlign: "center", marginTop: 40 }}>
          <h2 style={{ color: "var(--gold)", fontFamily: "var(--font-heading)" }}>
            Nessuna avventura attiva
          </h2>
          <p style={{ color: "var(--parchment-dark)" }}>
            Aspetta che il DM avvii un'avventura!
          </p>
          <button className="btn btn-ghost" onClick={onBack} style={{ marginTop: 20 }}>
            ← Torna Indietro
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* Background dinamico */}
      <div
        className="bg-image"
        style={{
          backgroundImage: currentScene.background ? `url(${currentScene.background})` : "none",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />
      <div className="bg-overlay-heavy" />

      {/* Musica */}
      <MusicPlayer track={currentScene.music || "explore"} />

      {/* Header */}
      <div style={{
        background: "rgba(10,8,6,0.95)",
        borderBottom: "1px solid rgba(212,175,55,0.2)",
        padding: "12px 16px",
        position: "sticky",
        top: 0,
        zIndex: 100,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ flex: 1 }}>
            <div style={{
              fontFamily: "var(--font-heading)",
              color: "var(--gold)",
              fontSize: "0.9rem",
            }}>
              {adventure.title}
            </div>
            <div style={{ fontSize: "0.7rem", color: "var(--parchment-dark)" }}>
              {currentScene.title}
            </div>
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            {/* Bottone reset per debug */}
            {selectedChoice && (
              <button
                onClick={() => {
                  console.log("🔄 Reset manuale scelte");
                  setSelectedChoice(null);
                  setSkillCheckResult(null);
                }}
                style={{
                  background: "rgba(192,64,64,0.1)",
                  border: "1px solid rgba(192,64,64,0.3)",
                  color: "#ff6b6b",
                  padding: "6px 12px",
                  borderRadius: 8,
                  cursor: "pointer",
                  fontSize: "0.75rem",
                  fontFamily: "var(--font-heading)",
                }}
              >
                🔄 Reset
              </button>
            )}

            <button
              onClick={() => setShowCharacterSheet(!showCharacterSheet)}
              style={{
                background: "rgba(212,175,55,0.1)",
                border: "1px solid rgba(212,175,55,0.3)",
                borderRadius: 8,
                padding: "6px 12px",
                color: "var(--gold)",
                fontFamily: "var(--font-heading)",
                fontSize: "0.75rem",
                cursor: "pointer",
              }}
            >
              {showCharacterSheet ? "📖 Avventura" : "👤 Scheda"}
            </button>
          </div>
        </div>
      </div>

      {/* Contenuto principale */}
      <div style={{ flex: 1, padding: 20, overflowY: "auto" }}>
        <AnimatePresence mode="wait">
          {/* Mostra scheda personaggio se richiesta */}
          {showCharacterSheet ? (
            <motion.div
              key="character-sheet"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="glass-card"
              style={{ padding: 20 }}
            >
              <h3 style={{ color: "var(--gold)", fontFamily: "var(--font-heading)", marginBottom: 16 }}>
                {character.name}
              </h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
                <div>
                  <div style={{ fontSize: "0.7rem", color: "var(--gold-dark)" }}>HP</div>
                  <div style={{ fontSize: "1.2rem", color: "var(--parchment)" }}>
                    {character.hp_current}/{character.hp_max}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: "0.7rem", color: "var(--gold-dark)" }}>CA</div>
                  <div style={{ fontSize: "1.2rem", color: "var(--parchment)" }}>
                    {character.armor_class || 10}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: "0.7rem", color: "var(--gold-dark)" }}>Livello</div>
                  <div style={{ fontSize: "1.2rem", color: "var(--parchment)" }}>
                    {character.level || 1}
                  </div>
                </div>
              </div>
              {/* TODO: Aggiungi più dettagli scheda */}
            </motion.div>
          ) : (
            /* Mostra scena avventura */
            <motion.div
              key={currentScene.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              {/* Narrativa */}
              <div
                className="glass-card"
                style={{
                  padding: 20,
                  marginBottom: 20,
                  whiteSpace: "pre-line",
                }}
              >
                <div style={{
                  fontFamily: "var(--font-body)",
                  fontSize: "0.95rem",
                  lineHeight: "1.7",
                  color: "var(--parchment)",
                }}>
                  {currentScene.narrative}
                </div>
              </div>

              {/* Risultato prova abilità */}
              <AnimatePresence>
                {skillCheckResult && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="glass-card"
                    style={{
                      padding: 20,
                      marginBottom: 20,
                      textAlign: "center",
                      border: `2px solid ${skillCheckResult.success ? "var(--gold)" : "var(--crimson-light)"}`,
                      background: skillCheckResult.success
                        ? "rgba(212,175,55,0.1)"
                        : "rgba(192,64,64,0.1)",
                    }}
                  >
                    <div style={{
                      fontFamily: "var(--font-heading)",
                      fontSize: "1.2rem",
                      color: skillCheckResult.success ? "var(--gold)" : "var(--crimson-light)",
                      marginBottom: 8,
                    }}>
                      {skillCheckResult.success ? "✅ SUCCESSO!" : "❌ FALLIMENTO"}
                    </div>
                    <div style={{ color: "var(--parchment-dark)", fontSize: "0.9rem" }}>
                      🎲 {skillCheckResult.roll} + {skillCheckResult.modifier} = {skillCheckResult.total}
                      <br />
                      (CD {skillCheckResult.dc})
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Scelte */}
              {currentScene.choices && !selectedChoice && (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div style={{
                    fontFamily: "var(--font-heading)",
                    fontSize: "0.8rem",
                    color: "var(--gold-dark)",
                    letterSpacing: "0.1em",
                    marginBottom: 8,
                  }}>
                    COSA FAI?
                  </div>

                  {currentScene.choices.map((choice, idx) => (
                    <motion.button
                      key={choice.id}
                      className="glass-card"
                      onClick={() => handleChoice(choice)}
                      style={{
                        padding: "16px 20px",
                        textAlign: "left",
                        cursor: "pointer",
                        border: "1px solid rgba(212,175,55,0.3)",
                        background: "rgba(0,0,0,0.4)",
                        color: "var(--parchment)",
                        fontFamily: "var(--font-body)",
                        fontSize: "0.9rem",
                        lineHeight: "1.5",
                      }}
                      whileHover={{
                        scale: 1.02,
                        background: "rgba(212,175,55,0.1)",
                        borderColor: "var(--gold)",
                      }}
                      whileTap={{ scale: 0.98 }}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.1 }}
                    >
                      {choice.text}
                      {choice.type === "skill_check" && (
                        <div style={{
                          fontSize: "0.75rem",
                          color: "var(--gold-dark)",
                          marginTop: 6
                        }}>
                          🎲 Richiede: {getSkillName(choice.skill)} (CD {choice.dc})
                        </div>
                      )}
                    </motion.button>
                  ))}
                </div>
              )}

              {/* Loading scelta */}
              {selectedChoice && !skillCheckResult && (
                <div style={{ textAlign: "center", padding: 40 }}>
                  <div style={{
                    fontFamily: "var(--font-heading)",
                    color: "var(--gold)",
                    fontSize: "1rem",
                  }}>
                    ⏳ Elaborando...
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ────────────────────────────────────────
// HELPER FUNCTIONS
// ────────────────────────────────────────

function getAbilityForSkill(skill) {
  const skillToAbility = {
    athletics: "strength",
    acrobatics: "dexterity",
    sleight_of_hand: "dexterity",
    stealth: "dexterity",
    arcana: "intelligence",
    history: "intelligence",
    investigation: "intelligence",
    nature: "intelligence",
    religion: "intelligence",
    animal_handling: "wisdom",
    insight: "wisdom",
    medicine: "wisdom",
    perception: "wisdom",
    survival: "wisdom",
    deception: "charisma",
    intimidation: "charisma",
    performance: "charisma",
    persuasion: "charisma",
  };
  return skillToAbility[skill] || "strength";
}

function getProficiencyBonus(level) {
  return Math.floor((level - 1) / 4) + 2;
}

function getSkillName(skill) {
  const names = {
    athletics: "Atletica",
    acrobatics: "Acrobazia",
    sleight_of_hand: "Destrezza di Mano",
    stealth: "Furtività",
    arcana: "Arcana",
    history: "Storia",
    investigation: "Indagare",
    nature: "Natura",
    religion: "Religione",
    animal_handling: "Addestrare Animali",
    insight: "Intuizione",
    medicine: "Medicina",
    perception: "Percezione",
    survival: "Sopravvivenza",
    deception: "Inganno",
    intimidation: "Intimidire",
    performance: "Esibizione",
    persuasion: "Persuasione",
  };
  return names[skill] || skill;
}
