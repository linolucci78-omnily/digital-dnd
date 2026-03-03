// ═══════════════════════════════════════════════
//  DMPanel — Pannello del Dungeon Master
//  PC/Tablet: gestione campagna, personaggi,
//  combattimento, mappa, narrativa
// ═══════════════════════════════════════════════

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import MusicPlayer from "../shared/components/MusicPlayer.jsx";
import { supabase } from "../lib/supabase.js";
import { TokenSmall } from "../shared/components/CharacterToken.jsx";
import SceneManager from "./SceneManager.jsx";
import SkillCheckNotification from "./SkillCheckNotification.jsx";
import ModalDialog from "../shared/components/ModalDialog.jsx";
import LootDistribution from "./LootDistribution.jsx";
import NPCManager from "./NPCManager.jsx";
import FogOfWarEditor from "./FogOfWarEditor.jsx";
import BattleGrid from "./BattleGrid.jsx";
import DnDIcon from "../shared/components/DnDIcon.jsx";
import DiceRollModal from "../shared/components/DiceRollModal.jsx";
import { STATUS_EFFECTS } from "../shared/constants/statusEffects.js";
import { SAVING_THROWS, calculateSavingThrowBonus } from "../shared/constants/savingThrows.js";
import { SKILL_CHECKS, calculateSkillCheckBonus } from "../shared/constants/skillChecks.js";

const DM_TABS = [
  { id: "party", label: "Gruppo", icon: "npc" },
  { id: "scenes", label: "Scene", icon: "map" },
  { id: "combat", label: "Combattimento", icon: "attack" },
  { id: "narrate", label: "Narrativa", icon: "scroll" },
  { id: "npcs", label: "NPC", icon: "merchant" },
  { id: "loot", label: "Tesoro", icon: "chest" },
  { id: "dice", label: "Dadi DM", icon: "dice" },
];

// Mostri predefiniti (il DM può aggiungerne altri)
const PRESET_MONSTERS = [
  { id: "goblin", name: "Goblin", hp: 7, ac: 15, speed: 30, cr: "1/4", attack: "+4", damage: "1d6+2", type: "Umanoide Piccolo" },
  { id: "skeleton", name: "Scheletro", hp: 13, ac: 13, speed: 30, cr: "1/4", attack: "+4", damage: "1d6+2", type: "Non morto" },
  { id: "zombie", name: "Zombie", hp: 22, ac: 8, speed: 20, cr: "1/4", attack: "+3", damage: "1d6+1", type: "Non morto" },
  { id: "wolf", name: "Lupo", hp: 11, ac: 13, speed: 40, cr: "1/4", attack: "+4", damage: "2d4+2", type: "Bestia" },
  { id: "orc", name: "Orco", hp: 15, ac: 13, speed: 30, cr: "1/2", attack: "+5", damage: "1d12+3", type: "Umanoide" },
  { id: "cultist", name: "Cultista", hp: 9, ac: 12, speed: 30, cr: "1/8", attack: "+3", damage: "1d6+1", type: "Umanoide" },
  { id: "bandit", name: "Bandito", hp: 11, ac: 12, speed: 30, cr: "1/8", attack: "+3", damage: "1d6+1", type: "Umanoide" },
  { id: "ogre", name: "Orco Gigante", hp: 59, ac: 11, speed: 40, cr: "2", attack: "+6", damage: "2d8+4", type: "Gigante" },
  { id: "troll", name: "Troll", hp: 84, ac: 15, speed: 30, cr: "5", attack: "+7", damage: "2d6+4", type: "Gigante" },
  { id: "dragon_young", name: "Drago Giovane (Rosso)", hp: 178, ac: 18, speed: 40, cr: "10", attack: "+10", damage: "2d10+6", type: "Drago" },
];

export default function DMPanel({ campaign, onBack }) {
  const [tab, setTab] = useState("party");
  const [characters, setCharacters] = useState([]);
  const [session, setSession] = useState(null);
  const [monsters, setMonsters] = useState([]);
  const [initiative, setInitiative] = useState([]);
  const [currentTurn, setCurrentTurn] = useState(0);
  const [narrativeText, setNarrativeText] = useState("");
  const [narrativeSending, setNarrativeSending] = useState(false);
  const [narrativeActive, setNarrativeActive] = useState(false); // Traccia se c'è narrativa sulla TV
  const [narrativeImage, setNarrativeImage] = useState(null); // File immagine caricato
  const [narrativeImagePreview, setNarrativeImagePreview] = useState(null); // Anteprima base64
  const [markerPosition, setMarkerPosition] = useState(null); // { x: %, y: % }
  const [markerStyle, setMarkerStyle] = useState({ type: 'circle', color: '#d4af37', size: 40 }); // Personalizzazione marker
  const [customMonster, setCustomMonster] = useState({ name: "", hp: 10, ac: 12, attack: "+3", damage: "1d6", avatar_url: "" });
  const [showAddMonster, setShowAddMonster] = useState(false);
  const [monsterAvatarFile, setMonsterAvatarFile] = useState(null);
  const [monsterAvatarPreview, setMonsterAvatarPreview] = useState(null);
  const [uploadingMonsterAvatar, setUploadingMonsterAvatar] = useState(false);
  const [combatActive, setCombatActive] = useState(false);
  const [monsterTargets, setMonsterTargets] = useState({}); // { monsterId: target } per tracking target per mostro

  // Exploration Mode (turni fuori combattimento)
  const [explorationMode, setExplorationMode] = useState(false);
  const [explorationTurn, setExplorationTurn] = useState(0); // Indice del giocatore che ha il turno
  const [mapUrl, setMapUrl] = useState(null); // Caricato dal database, non da localStorage
  const [uploadingMap, setUploadingMap] = useState(false);
  const [tokenPositions, setTokenPositions] = useState({});
  const [skillCheckNotification, setSkillCheckNotification] = useState(null);
  const [tvChannel, setTvChannel] = useState(null);

  // Initiative Rolling System
  const [rollingInitiative, setRollingInitiative] = useState(false);
  const [initiativeRolls, setInitiativeRolls] = useState({}); // { characterId: { name, type, roll, ready } }

  // Modal state
  const [modal, setModal] = useState({ isOpen: false, type: "alert", title: "", message: "", onConfirm: null });
  const [diceModalOpen, setDiceModalOpen] = useState(false);

  // Monster Attack System
  const [pendingMonsterDamage, setPendingMonsterDamage] = useState(null); // { monsterId, monsterName, damage, attackRoll }

  // Saving Throws System
  const [savingThrowForm, setSavingThrowForm] = useState({}); // { [charId]: { ability, dc, description } }

  // Skill Checks System
  const [skillCheckForm, setSkillCheckForm] = useState({}); // { [charId]: { skill, dc, description } }

  // Combat Log System
  const [combatLog, setCombatLog] = useState([]);

  // Helper per aggiungere eventi al log
  const addLogEvent = useCallback((eventData) => {
    const event = {
      id: Date.now() + Math.random(),
      timestamp: Date.now(),
      ...eventData,
    };
    setCombatLog(prev => [...prev, event].slice(-20)); // Keep only last 20 events
    console.log("📜 [DM LOG]:", event);
  }, []);

  // Carica dati campagna
  useEffect(() => {
    if (!campaign?.id) return;
    loadData();
  }, [campaign?.id]);

  const loadData = async () => {
    console.log("🔄 DMPanel: Caricamento dati...");

    // Personaggi
    const { data: chars } = await supabase
      .from("characters")
      .select("*")
      .eq("campaign_id", campaign.id)
      .order("created_at", { ascending: true });
    setCharacters(chars || []);
    console.log("✅ Personaggi caricati:", chars?.length || 0);

    // Sessione attiva
    console.log("🔍 Cerco session attiva per campaign:", campaign.id);
    let { data: sess, error: sessionError } = await supabase
      .from("sessions")
      .select("*")
      .eq("campaign_id", campaign.id)
      .eq("is_active", true)
      .single();

    if (sessionError) {
      console.warn("⚠️ Errore caricamento session:", sessionError.message);
    }

    // Se non esiste una sessione attiva, creala automaticamente
    if (!sess && campaign?.id) {
      console.log("➕ Creo nuova session per campaign:", campaign.id);
      const { data: newSession, error: insertError } = await supabase
        .from("sessions")
        .insert({
          campaign_id: campaign.id,
          is_active: true,
          combat_state: { monsters: [], initiative: [], currentTurn: 0, active: false },
          event_log: [],
        })
        .select()
        .single();

      if (insertError) {
        console.error("❌ Errore creazione session:", insertError);
      } else {
        console.log("✅ Session creata:", newSession?.id);
        sess = newSession;
      }
    } else if (sess) {
      console.log("✅ Session trovata:", sess.id);
    }

    setSession(sess);
    console.log("📌 Session impostata:", !!sess, sess?.id);

    if (sess?.combat_state) {
      const cs = sess.combat_state;
      setMonsters(cs.monsters || []);
      setInitiative(cs.initiative || []);
      setCurrentTurn(cs.currentTurn || 0);
      setCombatActive(cs.active || false);
    }

    // Carica mappa dalla location attiva
    if (campaign?.id) {
      const { data: activeLocation } = await supabase
        .from("locations")
        .select("map_url")
        .eq("campaign_id", campaign.id)
        .eq("is_current", true)
        .maybeSingle();

      if (activeLocation?.map_url) {
        setMapUrl(activeLocation.map_url);
      }
    }
    if (sess?.token_positions) {
      setTokenPositions(sess.token_positions);
    }
  };

  // Listener per skill check dei giocatori
  useEffect(() => {
    if (!session?.id) return;

    const skillCheckChannel = supabase.channel(`dm-skill-checks-${session.id}`, {
      config: { broadcast: { self: false } },
    })
      .on("broadcast", { event: "skill_check" }, async ({ payload }) => {
        console.log("🎲 DM riceve skill check:", payload);

        // Carica POI nascosti della location
        const { data: hiddenPOIs } = await supabase
          .from("points_of_interest")
          .select("*")
          .eq("location_id", payload.locationId)
          .eq("discovered", false)
          .not("requires_check", "is", null);

        // Filtra POI che il giocatore ha scoperto
        const discovered = (hiddenPOIs || []).filter(poi => {
          return (
            poi.requires_check === payload.skill &&
            payload.total >= (poi.check_dc || 10)
          );
        });

        setSkillCheckNotification({
          ...payload,
          discoveredPOIs: discovered,
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(skillCheckChannel);
    };
  }, [session?.id]);

  // Rivela POI scoperto
  const handleRevealPOI = async (poi) => {
    await supabase
      .from("points_of_interest")
      .update({ discovered: true })
      .eq("id", poi.id);

    // Broadcast alla TV
    if (session?.id) {
      const tvChannel = supabase.channel(`session-tv-${session.id}`);
      await tvChannel.send({
        type: "broadcast",
        event: "poi_revealed",
        payload: { poi: { ...poi, discovered: true } },
      });
    }

    // Rimuovi dalla notifica
    setSkillCheckNotification(prev => {
      if (!prev) return null;
      const remaining = prev.discoveredPOIs.filter(p => p.id !== poi.id);
      if (remaining.length === 0) return null;
      return { ...prev, discoveredPOIs: remaining };
    });
  };

  // Upload mappa
  const handleMapUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file || !session?.id) return;

    setUploadingMap(true);
    try {
      // Upload file a Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${campaign.id}/${Date.now()}.${fileExt}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('maps')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Ottieni URL pubblico
      const { data: { publicUrl } } = supabase.storage
        .from('maps')
        .getPublicUrl(fileName);

      // Salva URL nella location attiva
      const { data: activeLocation } = await supabase
        .from("locations")
        .select("id")
        .eq("campaign_id", campaign.id)
        .eq("is_current", true)
        .maybeSingle();

      if (activeLocation) {
        const { error: updateError } = await supabase
          .from('locations')
          .update({ map_url: publicUrl })
          .eq('id', activeLocation.id);

        if (updateError) throw updateError;

        console.log('Mappa salvata nella location attiva:', activeLocation.id);
        setMapUrl(publicUrl);

        // Invia update alla TV
        if (tvChannel) {
          await tvChannel.send({
            type: 'broadcast',
            event: 'scene_change',
            payload: { mapUrl: publicUrl },
          });
        }
      } else {
        throw new Error('Nessuna scena attiva! Attiva una scena dalla tab Scene prima di caricare la mappa.');
      }

      console.log('✅ Mappa caricata:', publicUrl);
    } catch (e) {
      console.error('❌ Errore upload mappa:', e);
      setModal({
        isOpen: true,
        type: "error",
        title: "Errore Caricamento Mappa",
        message: `Non è stato possibile caricare la mappa:\n${e.message}`,
        confirmText: "OK"
      });
    } finally {
      setUploadingMap(false);
    }
  };

  // Realtime: ascolta cambiamenti personaggi + broadcast TV
  useEffect(() => {
    console.log("🔌 DMPanel useEffect Realtime triggered");
    console.log("   campaign?.id:", campaign?.id);
    console.log("   session?.id:", session?.id);

    if (!campaign?.id || !session?.id) {
      console.warn("⚠️ useEffect Realtime SKIPPED - mancano campaign o session");
      return;
    }

    console.log("✅ Procedo con creazione canali broadcast...");

    const channel = supabase
      .channel(`dm-campaign-${campaign.id}`, {
        config: {
          broadcast: { self: false },
        },
      })
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "characters",
        filter: `campaign_id=eq.${campaign.id}`,
      }, () => loadData())
      .subscribe();

    // Canale broadcast per TV (stesso nome usato dalla TV)
    const tvChannel = supabase
      .channel(`session-tv-${session.id}`, {
        config: {
          broadcast: { self: false },
        },
      })
      .on("broadcast", { event: "initiative_rolled_player" }, ({ payload }) => {
        console.log("🎲 DM riceve tiro iniziativa da giocatore:", payload);
        console.log("🔍 DEBUG DM - characterId:", payload.characterId, "roll:", payload.roll);

        // Aggiungi il tiro del giocatore
        setInitiativeRolls(prev => {
          const newRolls = {
            ...prev,
            [payload.characterId]: {
              id: payload.characterId,
              name: payload.characterName,
              type: "player",
              roll: payload.roll,
              ready: true,
              hp: payload.hp,
              hp_max: payload.hp_max,
              tokenColor: payload.tokenColor,
            }
          };
          console.log("🔍 DEBUG DM - Nuovo stato initiativeRolls:", newRolls);
          return newRolls;
        });
      })
      .on("broadcast", { event: "dice_roll_result" }, ({ payload }) => {
        // Gestisci risultati dadi 3D per iniziativa mostri
        if (payload.isInitiative && payload.isMonster && payload.monsterId) {
          console.log("🎲 Ricevuto tiro iniziativa da mostro (3D):", payload);

          // Aggiungi il tiro del mostro
          setInitiativeRolls(prev => ({
            ...prev,
            [payload.monsterId]: {
              id: payload.monsterId,
              name: payload.monsterName,
              type: "monster",
              roll: payload.total,
              ready: true,
              hp: payload.hp,
              hp_max: payload.hp_max,
            }
          }));

          // Broadcast alla TV per mostrare il risultato nel sistema
          broadcastToTV("initiative_rolled", {
            characterId: payload.monsterId,
            characterName: payload.monsterName,
            type: "monster",
            roll: payload.total,
          });

          console.log(`✅ Iniziativa mostro ${payload.monsterName}: ${payload.total}`);
        }

        // Gestisci risultati attacco mostri
        if (payload.isMonsterAttack && payload.monsterId) {
          console.log(`⚔️ Tiro attacco mostro completato! ${payload.monsterName}: ${payload.total}`);

          // Salva in pending per poter tirare il danno - INCLUDE TARGET!
          setPendingMonsterDamage({
            monsterId: payload.monsterId,
            monsterName: payload.monsterName,
            damage: payload.monsterDamage,
            attackRoll: payload.total,
            timestamp: Date.now(),
            target: payload.target, // 🎯 Salva il bersaglio per applicare danno dopo
            hit: payload.hit, // Se ha colpito o no
          });

          console.log(`✅ Attacco ${payload.monsterName}: ${payload.total} - DM può ora tirare il danno!`);
        }

        // Gestisci risultati danno mostri
        if (payload.isMonsterDamage && payload.monsterId) {
          console.log(`💥 Danno mostro completato! ${payload.monsterName}: ${payload.total}`);

          // 🎯 APPLICAZIONE AUTOMATICA DANNO AL GIOCATORE
          if (payload.target && payload.total) {
            const targetId = payload.target.id;
            const damage = payload.total;

            console.log(`💀 Applicando ${damage} danni a ${payload.target.name}...`);

            // Trova il personaggio e aggiorna HP
            const targetChar = characters.find(c => c.id === targetId);
            if (targetChar) {
              const newHP = Math.max(0, targetChar.hp_current - damage);

              // Aggiorna nel database
              supabase
                .from("characters")
                .update({ hp_current: newHP })
                .eq("id", targetId)
                .then(() => {
                  console.log(`✅ HP aggiornati per ${targetChar.name}: ${targetChar.hp_current} → ${newHP}`);

                  // Aggiorna stato locale
                  setCharacters(prev => prev.map(c =>
                    c.id === targetId ? { ...c, hp_current: newHP } : c
                  ));

                  // Broadcast HP aggiornati
                  broadcastToTV("hp_updated", {
                    characterId: targetId,
                    characterName: targetChar.name,
                    hp_current: newHP,
                    hp_max: targetChar.hp_max,
                    damage: damage,
                  });
                });
            }
          }

          // Pulisci pending
          setPendingMonsterDamage(null);
        }

        // Gestisci risultati danno giocatori contro mostri
        if (payload.isDamage && payload.characterId) {
          console.log(`💥 Danno player completato! ${payload.characterName}: ${payload.total}`);

          // 🎯 APPLICAZIONE AUTOMATICA DANNO AL MOSTRO
          if (payload.target && payload.total) {
            const targetId = payload.target.id;
            const damage = payload.total;

            console.log(`💀 Applicando ${damage} danni a ${payload.target.name}...`);

            // Trova il mostro e aggiorna HP
            setMonsters(prev => prev.map(m => {
              if (m.id === targetId) {
                const newHP = Math.max(0, m.hp_current - damage);
                console.log(`✅ HP aggiornati per ${m.name}: ${m.hp_current} → ${newHP}`);

                // Broadcast HP aggiornati
                broadcastToTV("monster_hp_updated", {
                  monsterId: targetId,
                  monsterName: m.name,
                  hp_current: newHP,
                  hp_max: m.hp_max,
                  damage: damage,
                });

                return { ...m, hp_current: newHP };
              }
              return m;
            }));
          }
        }
      })
      .subscribe((status) => {
        console.log('📡 DM Panel → TV channel status:', status);
      });

    setTvChannel(tvChannel);
    console.log("✅ DMPanel: TV Channel inizializzato →", `session-tv-${session?.id}`);

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(tvChannel);
    };
  }, [campaign?.id, session?.id]);

  // Salva stato combattimento nella sessione
  const saveCombatState = useCallback(async (newMonsters, newInit, newTurn, active) => {
    if (!session?.id) return;
    const combatState = {
      active: active ?? combatActive,
      monsters: newMonsters ?? monsters,
      initiative: newInit ?? initiative,
      currentTurn: newTurn ?? currentTurn,
      updatedAt: Date.now(),
    };
    await supabase.from("sessions").update({ combat_state: combatState }).eq("id", session.id);

    // Broadcast al TV
    await broadcastToTV("combat_update", combatState);
  }, [session?.id, monsters, initiative, currentTurn, combatActive]);

  const broadcastToTV = async (event, payload) => {
    if (!tvChannel) {
      console.warn('⚠️ Canale TV non disponibile');
      return;
    }
    try {
      console.log(`📡 DM → TV: ${event}`, payload);
      await tvChannel.send({
        type: "broadcast",
        event,
        payload,
      });
    } catch (e) {
      console.error('❌ Errore broadcast:', e);
    }
  };

  // ═══════════════════════════════════════════════
  // EXPLORATION MODE - Turni fuori combattimento
  // ═══════════════════════════════════════════════

  const toggleExplorationMode = async () => {
    const newMode = !explorationMode;
    setExplorationMode(newMode);
    setExplorationTurn(0); // Reset al primo giocatore

    // Broadcast al TV
    await broadcastToTV("exploration_mode_update", {
      active: newMode,
      currentTurn: 0,
      characters: characters,
    });
  };

  const nextExplorationTurn = async () => {
    const nextTurn = (explorationTurn + 1) % characters.length;
    setExplorationTurn(nextTurn);

    // Broadcast al TV
    await broadcastToTV("exploration_mode_update", {
      active: explorationMode,
      currentTurn: nextTurn,
      characters: characters,
    });
  };

  // Aggiorna HP personaggio
  const updateCharHP = async (charId, delta) => {
    const char = characters.find(c => c.id === charId);
    if (!char) return;
    const newHP = Math.max(0, Math.min(char.hp_max, char.hp_current + delta));
    await supabase.from("characters").update({ hp_current: newHP }).eq("id", charId);
    setCharacters(prev => prev.map(c => c.id === charId ? { ...c, hp_current: newHP } : c));

    // 🎯 Broadcast HP aggiornati in tempo reale a TV e players
    await broadcastToTV("hp_updated", {
      characterId: charId,
      characterName: char.name,
      hp_current: newHP,
      hp_max: char.hp_max,
      damage: delta < 0 ? Math.abs(delta) : null,
      healing: delta > 0 ? delta : null,
    });
  };

  // Toggle Status Effect
  const toggleStatusEffect = async (charId, effectId) => {
    const char = characters.find(c => c.id === charId);
    if (!char) return;

    const currentConditions = char.conditions || [];
    const hasEffect = currentConditions.includes(effectId);
    const newConditions = hasEffect
      ? currentConditions.filter(id => id !== effectId)
      : [...currentConditions, effectId];

    await supabase.from("characters").update({ conditions: newConditions }).eq("id", charId);
    setCharacters(prev => prev.map(c => c.id === charId ? { ...c, conditions: newConditions } : c));

    // Broadcast status effects aggiornati
    await broadcastToTV("status_effects_updated", {
      characterId: charId,
      characterName: char.name,
      conditions: newConditions,
    });
  };

  // Request Saving Throw
  const requestSavingThrow = async (charId) => {
    const char = characters.find(c => c.id === charId);
    const form = savingThrowForm[charId];

    if (!char || !form?.ability || !form?.dc) {
      setModal({
        isOpen: true,
        type: "error",
        title: "Dati Mancanti",
        message: "Seleziona abilità e imposta DC prima di richiedere il tiro salvezza.",
        confirmText: "OK",
      });
      return;
    }

    const ability = SAVING_THROWS.find(s => s.id === form.ability);
    const bonus = calculateSavingThrowBonus(char, form.ability);

    // Broadcast saving throw request
    await broadcastToTV("saving_throw_requested", {
      characterId: charId,
      characterName: char.name,
      ability: ability.label,
      abilityId: form.ability,
      dc: parseInt(form.dc),
      description: form.description || `Tiro salvezza su ${ability.label}`,
      bonus: bonus,
      timestamp: Date.now(),
    });

    // Reset form
    setSavingThrowForm(prev => ({
      ...prev,
      [charId]: { ability: "", dc: "", description: "" }
    }));
  };

  // Request Skill Check
  const requestSkillCheck = async (charId) => {
    const char = characters.find(c => c.id === charId);
    const form = skillCheckForm[charId];

    if (!char || !form?.skill || !form?.dc) {
      setModal({
        isOpen: true,
        type: "error",
        title: "Dati Mancanti",
        message: "Seleziona abilità e imposta DC prima di richiedere la prova.",
        confirmText: "OK",
      });
      return;
    }

    const skill = SKILL_CHECKS.find(s => s.id === form.skill);
    const bonus = calculateSkillCheckBonus(char, form.skill);

    // Broadcast skill check request
    await broadcastToTV("skill_check_requested", {
      characterId: charId,
      characterName: char.name,
      skill: skill.label,
      skillId: form.skill,
      ability: skill.abilityLabel,
      dc: parseInt(form.dc),
      description: form.description || `Prova di ${skill.label}`,
      bonus: bonus,
      timestamp: Date.now(),
    });

    // Reset form
    setSkillCheckForm(prev => ({
      ...prev,
      [charId]: { skill: "", dc: "", description: "" }
    }));
  };

  // Aggiungi mostro al combattimento
  const addMonster = async (preset) => {
    const newMonster = {
      id: `m_${Date.now()}_${Math.random().toString(36).slice(2,5)}`,
      ...preset,
      hp_current: preset.hp,
      hp_max: preset.hp,
    };
    const updated = [...monsters, newMonster];
    setMonsters(updated);

    // 🎯 Broadcast mostro aggiunto alla TV
    await saveCombatState(updated, null, null, null);

    return newMonster;
  };

  // Gestione avatar mostro
  const handleMonsterAvatarSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

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

    setMonsterAvatarFile(file);

    const reader = new FileReader();
    reader.onloadend = () => {
      setMonsterAvatarPreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const uploadMonsterAvatar = async () => {
    if (!monsterAvatarFile || !campaign?.id) return null;

    try {
      const ext = monsterAvatarFile.name.split('.').pop();
      const fileName = `${campaign.id}/monsters/${customMonster.name.replace(/\s+/g, '_')}_${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, monsterAvatarFile, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (error) {
      console.error("❌ Errore upload avatar mostro:", error);
      return null;
    }
  };

  const addCustomMonster = async () => {
    if (!customMonster.name.trim()) {
      setModal({
        isOpen: true,
        type: "error",
        title: "Nome Mancante",
        message: "Inserisci il nome del mostro prima di aggiungerlo.",
        confirmText: "OK",
      });
      return;
    }

    setUploadingMonsterAvatar(true);

    try {
      let avatarUrl = "";
      if (monsterAvatarFile) {
        avatarUrl = await uploadMonsterAvatar();
        if (!avatarUrl) {
          setUploadingMonsterAvatar(false);
          setModal({
            isOpen: true,
            type: "confirm",
            title: "Upload Fallito",
            message: "Impossibile caricare l'immagine avatar.\n\nVuoi aggiungere il mostro senza immagine?",
            confirmText: "Aggiungi",
            cancelText: "Annulla",
            onConfirm: async () => {
              // Continua senza avatar
              const newMonster = {
                id: `m_${Date.now()}`,
                ...customMonster,
                hp_max: parseInt(customMonster.hp) || 10,
                hp_current: parseInt(customMonster.hp) || 10,
                avatar_url: "",
              };

              const updated = [...monsters, newMonster];
              setMonsters(updated);
              setCustomMonster({ name: "", hp: 10, ac: 12, attack: "+3", damage: "1d6", avatar_url: "" });
              setMonsterAvatarFile(null);
              setMonsterAvatarPreview(null);
              setShowAddMonster(false);

              await saveCombatState(updated, null, null, null);
            },
          });
          return;
        }
      }

      const newMonster = {
        id: `m_${Date.now()}`,
        ...customMonster,
        hp_max: parseInt(customMonster.hp) || 10,
        hp_current: parseInt(customMonster.hp) || 10,
        avatar_url: avatarUrl,
      };

      const updated = [...monsters, newMonster];
      setMonsters(updated);
      setCustomMonster({ name: "", hp: 10, ac: 12, attack: "+3", damage: "1d6", avatar_url: "" });
      setMonsterAvatarFile(null);
      setMonsterAvatarPreview(null);
      setShowAddMonster(false);

      // 🎯 Broadcast mostro aggiunto alla TV
      await saveCombatState(updated, null, null, null);
    } finally {
      setUploadingMonsterAvatar(false);
    }
  };

  // Migra mostri temporanei a NPC nel database
  const migrateMonsterToNPC = async (monster) => {
    if (!campaign?.id) return;

    try {
      const npcData = {
        campaign_id: campaign.id,
        name: monster.name,
        class: "Mostro",
        level: 1,
        race: "Creatura",
        attitude: "hostile",
        hp_max: monster.hp_max,
        hp_current: monster.hp_current,
        armor_class: monster.ac,
        strength: 10,
        dexterity: 10,
        constitution: 10,
        intelligence: 10,
        wisdom: 10,
        charisma: 10,
        description: "",
        location: "",
        special_abilities: `Attacco: ${monster.attack}, Danno: ${monster.damage}`,
        inventory_notes: "",
        avatar_url: monster.avatar_url || "",
      };

      const { error } = await supabase
        .from("npcs")
        .insert([npcData]);

      if (error) throw error;

      console.log(`✅ Mostro "${monster.name}" migrato a NPC nel database`);
      return true;
    } catch (error) {
      console.error(`❌ Errore migrazione mostro "${monster.name}":`, error);
      return false;
    }
  };

  const migrateAllMonsters = async () => {
    if (monsters.length === 0) {
      setModal({
        isOpen: true,
        type: "alert",
        title: "Nessun Mostro",
        message: "Non ci sono mostri da salvare nel database.",
        confirmText: "OK",
      });
      return;
    }

    setModal({
      isOpen: true,
      type: "confirm",
      title: "Salva Mostri nel Database",
      message: `Vuoi salvare tutti i ${monsters.length} mostri attuali nel database come NPC?\n\nVantaggi:\n• Potrai modificarli (avatar, statistiche, descrizione)\n• Non scompariranno al refresh\n• Li riutilizzi in altre sessioni`,
      confirmText: "Salva",
      cancelText: "Annulla",
      onConfirm: async () => {
        let migrated = 0;
        for (const monster of monsters) {
          const success = await migrateMonsterToNPC(monster);
          if (success) migrated++;
        }

        setModal({
          isOpen: true,
          type: "success",
          title: "Mostri Salvati",
          message: `${migrated}/${monsters.length} mostri salvati nel database!\n\nTrovali nel tab NPC con atteggiamento "Ostile"`,
          confirmText: "OK",
          onConfirm: () => {
            // Vai al tab NPC per vedere i mostri salvati
            setTab("npcs");
          },
        });
      },
    });
  };

  const removeMonster = (id) => {
    const newMonsters = monsters.filter(m => m.id !== id);
    const newInitiative = initiative.filter(e => e.id !== id);
    setMonsters(newMonsters);
    setInitiative(newInitiative);
    saveCombatState(newMonsters, newInitiative);
  };

  const updateMonsterHP = (monsterId, delta) => {
    setMonsters(prev => prev.map(m => {
      if (m.id !== monsterId) return m;
      const newHP = Math.max(0, Math.min(m.hp_max, m.hp_current + delta));
      return { ...m, hp_current: newHP };
    }));
  };

  // ═══════════════════════════════════════════════
  // SISTEMA ATTACCO MOSTRI - Con banner educativi TV
  // ═══════════════════════════════════════════════

  const attackWithMonster = async (monster) => {
    if (!tvChannel) {
      console.warn("⚠️ Canale TV non disponibile");
      return;
    }

    // Verifica che ci sia un target selezionato
    const target = monsterTargets[monster.id];
    if (!target) {
      console.warn("⚠️ Seleziona un bersaglio prima di attaccare!");
      return;
    }

    console.log(`⚔️ ${monster.name} attacca ${target.name}!`);

    // Parsa bonus attacco (es: "+4" → 4)
    const attackBonus = parseInt(monster.attack.replace("+", "")) || 0;

    const requestPayload = {
      monsterId: monster.id,
      monsterName: monster.name,
      characterName: monster.name, // Per compatibilità
      dice: ["d20"],
      modifier: attackBonus,
      label: `Attacco - ${monster.name}`,
      diceTheme: "rock", // Tema mostri
      timestamp: Date.now(),
      isMonsterAttack: true, // Flag per attacco mostro
      // Dati per narrazione educativa
      monsterDamage: monster.damage,
      monsterAttackBonus: attackBonus,
      // 🎯 DATI TARGETING
      target: target, // { id, name, ac, hp_current, hp_max }
    };

    console.log("📱➡️📺 DM invia richiesta attacco mostro con dadi 3D");

    // Invia richiesta alla TV
    await tvChannel.send({
      type: "broadcast",
      event: "dice_roll_request",
      payload: requestPayload,
    });
  };

  const rollMonsterDamage = async () => {
    if (!tvChannel || !pendingMonsterDamage) {
      console.warn("⚠️ Nessun attacco in pending");
      return;
    }

    const { monsterId, monsterName, damage, target, hit } = pendingMonsterDamage;

    // Se l'attacco ha mancato, non tirare danno!
    if (hit === false) {
      console.log(`❌ ${monsterName} ha mancato ${target.name}! Nessun danno.`);
      setPendingMonsterDamage(null);
      return;
    }

    console.log(`💥 ${monsterName} tira danno contro ${target.name}: ${damage}`);

    // Parsa i dadi danno (es: "1d6+2" → dice=["d6"], modifier=2)
    const match = damage.match(/(\d+)d(\d+)(?:\+(\d+))?/);
    if (!match) {
      console.error("❌ Formato danno non valido:", damage);
      return;
    }

    const count = parseInt(match[1]);
    const dieType = `d${match[2]}`;
    const bonusDamage = parseInt(match[3]) || 0;
    const dice = Array(count).fill(dieType);

    const requestPayload = {
      monsterId,
      monsterName,
      characterName: monsterName, // Per compatibilità
      dice: dice,
      modifier: bonusDamage,
      label: `Danno - ${monsterName}`,
      diceTheme: "rock", // Tema mostri
      timestamp: Date.now(),
      isMonsterDamage: true, // Flag per danno mostro
      // Dati per narrazione educativa
      monsterDamage: damage,
      // 🎯 Dati targeting per applicazione automatica danno
      target: target,
    };

    console.log("📱➡️📺 DM invia richiesta danno mostro con dadi 3D");

    // Invia richiesta alla TV
    await tvChannel.send({
      type: "broadcast",
      event: "dice_roll_request",
      payload: requestPayload,
    });

    // Pulisci pending dopo aver inviato
    setPendingMonsterDamage(null);
  };

  // ═══════════════════════════════════════════════
  // SISTEMA INIZIATIVA VERO D&D
  // ═══════════════════════════════════════════════

  // Passo 1: DM richiede ai giocatori di tirare iniziativa
  const requestInitiativeRoll = async () => {
    setRollingInitiative(true);
    setInitiativeRolls({});

    // Invia richiesta a tutti i giocatori
    await broadcastToTV("initiative_request", {
      timestamp: Date.now(),
    });

    console.log("📣 DM ha richiesto roll for initiative ai giocatori");
  };

  // Passo 2: DM tira iniziativa per UN mostro specifico CON DADI 3D
  const rollMonsterInitiative = async (monster) => {
    const dexMod = 0; // I mostri potrebbero avere un modificatore, per ora 0

    console.log(`🎲 ${monster.name} richiede tiro iniziativa con dadi 3D: d20 + DEX(${dexMod})`);

    // Usa il sistema di dadi 3D esistente
    // Manda richiesta alla TV per tirare d20
    const requestPayload = {
      monsterId: monster.id,
      monsterName: monster.name,
      characterName: monster.name, // Per compatibilità con sistema esistente
      dice: ["d20"], // Solo d20
      modifier: dexMod, // Modificatore DEX
      label: `Initiative - ${monster.name}`,
      diceTheme: "rock", // Tema mostri
      timestamp: Date.now(),
      isInitiative: true, // Flag per sapere che è un tiro di iniziativa
      isMonster: true, // Flag per sapere che è un mostro
      hp: monster.hp_current,
      hp_max: monster.hp_max,
    };

    console.log("📱➡️📺 DM invia richiesta tiro iniziativa mostro con dadi 3D");

    // Invia richiesta alla TV
    await broadcastToTV("dice_roll_request", requestPayload);

    // Il risultato arriverà tramite il listener "dice_roll_result"
    // e verrà gestito lì per aggiornare lo stato
  };

  // Passo 3: Quando tutti hanno tirato, avvia il combattimento
  const finalizeInitiative = async () => {
    const allCombatants = Object.values(initiativeRolls).sort((a, b) => b.roll - a.roll);

    setInitiative(allCombatants);
    setCurrentTurn(0);
    setCombatActive(true);
    setRollingInitiative(false);

    await saveCombatState(monsters, allCombatants, 0, true);
    await broadcastToTV("combat_started", { initiative: allCombatants, currentTurn: 0, active: true });

    // 🎯 Broadcast mostri disponibili ai giocatori per targeting
    await broadcastToTV("combat_update", {
      monsters: monsters.map(m => ({
        id: m.id,
        name: m.name,
        ac: m.ac,
        hp_current: m.hp_current,
        hp_max: m.hp_max,
      }))
    });

    console.log("⚔️ Combattimento iniziato con ordine:", allCombatants.map(c => `${c.name}(${c.roll})`));
  };

  // Avvia combattimento — tira iniziativa per tutti (OLD METHOD - manteniamo per compatibilità)
  const startCombat = async () => {
    const allCombatants = [
      ...characters.map(c => ({
        id: c.id, name: c.name, type: "player",
        init: Math.floor(Math.random() * 20) + 1 + Math.floor(((c.dexterity || 10) - 10) / 2),
        hp: c.hp_current, hp_max: c.hp_max, tokenColor: c.token_color,
      })),
      ...monsters.map(m => ({
        id: m.id, name: m.name, type: "monster",
        init: Math.floor(Math.random() * 20) + 1,
        hp: m.hp_current, hp_max: m.hp_max,
      })),
    ].sort((a, b) => b.init - a.init);

    setInitiative(allCombatants);
    setCurrentTurn(0);
    setCombatActive(true);
    await saveCombatState(monsters, allCombatants, 0, true);
    await broadcastToTV("combat_started", { initiative: allCombatants, currentTurn: 0, active: true });
  };

  const nextTurn = async () => {
    const next = (currentTurn + 1) % initiative.length;
    setCurrentTurn(next);
    await saveCombatState(null, null, next, null);
    await broadcastToTV("turn_changed", { currentTurn: next, combatant: initiative[next] });

    // 📜 Log evento
    if (initiative[next]) {
      addLogEvent({
        type: "turn_change",
        message: `${initiative[next].name}'s turn`,
      });
    }
  };

  const endCombat = async () => {
    setCombatActive(false);
    setInitiative([]);
    setCurrentTurn(0);
    await saveCombatState([], [], 0, false);
    await broadcastToTV("combat_ended", {});
  };

  // Upload immagine narrativa
  const handleNarrativeImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Verifica che sia un'immagine
    if (!file.type.startsWith('image/')) {
      alert('Carica solo file immagine (PNG, JPG, GIF, ecc.)');
      return;
    }

    setNarrativeImage(file);

    // Crea anteprima base64
    const reader = new FileReader();
    reader.onloadend = () => {
      setNarrativeImagePreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  // Click sull'anteprima per posizionare marker
  const handleImageClick = (e) => {
    if (!narrativeImagePreview) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    setMarkerPosition({ x, y });
  };

  // Invia narrativa al TV
  const sendNarrative = async () => {
    if (!narrativeText.trim()) return;
    setNarrativeSending(true);

    let imageUrl = null;

    // Se c'è un'immagine, caricala su Supabase Storage
    if (narrativeImage) {
      try {
        const fileName = `narrative_${Date.now()}_${narrativeImage.name}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('narrative-images')
          .upload(fileName, narrativeImage, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) {
          console.error("❌ Errore upload immagine:", uploadError);
          alert("Errore nel caricamento dell'immagine. Riprova.");
          setNarrativeSending(false);
          return;
        }

        // Ottieni URL pubblico
        const { data: urlData } = supabase.storage
          .from('narrative-images')
          .getPublicUrl(fileName);

        imageUrl = urlData.publicUrl;
        console.log("✅ Immagine caricata:", imageUrl);
      } catch (err) {
        console.error("❌ Errore durante upload:", err);
        setNarrativeSending(false);
        return;
      }
    }

    const payload = {
      text: narrativeText.trim(),
      dmName: campaign?.dm_name || "DM",
      timestamp: Date.now(),
      imageUrl: imageUrl, // URL dell'immagine su Storage (non base64!)
      marker: markerPosition ? { ...markerPosition, style: markerStyle } : null,
    };

    console.log("📺 DM invia narrativa:", {
      textLength: payload.text.length,
      hasImage: !!payload.imageUrl,
      hasMarker: !!payload.marker,
      timestamp: payload.timestamp
    });

    await broadcastToTV("narrative", payload);

    // Salva nel log sessione
    if (session?.id) {
      const log = session.event_log || [];
      log.push({
        type: "narrative",
        text: narrativeText.trim(),
        hasImage: !!imageUrl,
        hasMarker: !!markerPosition,
        at: Date.now()
      });
      await supabase.from("sessions").update({ event_log: log }).eq("id", session.id);
    }

    setNarrativeText("");
    setNarrativeActive(true); // ✅ Narrativa ora attiva sulla TV
    setTimeout(() => setNarrativeSending(false), 800);
  };

  const hpPct = (current, max) => max > 0 ? Math.max(0, (current / max) * 100) : 0;
  const hpClass = (pct) => pct > 50 ? "high" : pct > 25 ? "mid" : "low";

  if (!campaign) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", flexDirection: "column", gap: 16 }}>
        <div className="bg-image bg-lobby" />
        <div className="bg-overlay-heavy" />
        <div style={{ color: "var(--gold)", fontFamily: "var(--font-heading)" }}>Campagna non trovata.</div>
        <button className="btn btn-ghost" onClick={onBack}>← Indietro</button>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", paddingBottom: 80 }}>
      <div className="bg-image bg-lobby" />
      <div className="bg-overlay-heavy" />
      <MusicPlayer track="lobby" />

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

      {/* Dice Roll Modal */}
      <DiceRollModal
        isOpen={diceModalOpen}
        onClose={() => setDiceModalOpen(false)}
        playerName="Dungeon Master"
        playerColor="var(--gold)"
        tvChannel={tvChannel}
        onRollComplete={(result) => {
          console.log("[DM] Lancio 3D:", result);
        }}
      />

      {/* Skill Check Notification */}
      {skillCheckNotification && (
        <SkillCheckNotification
          skillCheck={skillCheckNotification}
          discoveredPOIs={skillCheckNotification.discoveredPOIs || []}
          onReveal={handleRevealPOI}
          onDismiss={() => setSkillCheckNotification(null)}
        />
      )}

      {/* Header DM */}
      <div style={{
        background: "rgba(10,8,6,0.97)",
        borderBottom: "1px solid rgba(212,175,55,0.3)",
        padding: "12px 20px",
        position: "sticky", top: 0, zIndex: 100,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={onBack} style={{ background: "none", border: "none", color: "rgba(212,175,55,0.6)", cursor: "pointer", fontSize: "1rem" }}>←</button>
          <DnDIcon icon="crown" size={24} color="var(--gold)" />
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: "var(--font-heading)", color: "var(--gold)", fontSize: "1rem" }}>{campaign.name}</div>
            <div style={{ fontSize: "0.7rem", color: "var(--parchment-dark)" }}>
              DM: {campaign.dm_name} · {characters.length} giocatori
              {combatActive && <span style={{ color: "var(--crimson-light)", marginLeft: 8 }}><DnDIcon icon="attack" size={12} /> COMBATTIMENTO</span>}
            </div>
          </div>
          <motion.button
            className="btn btn-gold"
            onClick={() => window.open(`?mode=tv&c=${campaign.join_code}`, "_blank")}
            style={{
              fontSize: "0.9rem",
              padding: "10px 18px",
              display: "flex",
              alignItems: "center",
              gap: 8,
              boxShadow: "0 0 20px rgba(212,175,55,0.3)",
            }}
            whileHover={{ scale: 1.05, boxShadow: "0 0 30px rgba(212,175,55,0.5)" }}
            whileTap={{ scale: 0.95 }}
          >
            <DnDIcon icon="castle" size={18} />
            APRI TV
          </motion.button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{
        display: "flex", background: "rgba(10,8,6,0.9)",
        borderBottom: "1px solid rgba(212,175,55,0.15)",
        overflowX: "auto", scrollbarWidth: "none",
      }}>
        {DM_TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            flex: "1 0 auto",
            padding: "10px 14px",
            background: "transparent",
            border: "none",
            borderBottom: tab === t.id ? "2px solid var(--gold)" : "2px solid transparent",
            color: tab === t.id ? "var(--gold)" : "rgba(212,175,55,0.4)",
            fontFamily: "var(--font-body)",
            fontSize: "0.8rem",
            cursor: "pointer",
            whiteSpace: "nowrap",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}>
            <DnDIcon icon={t.icon} size={14} />
            {t.label}
          </button>
        ))}
      </div>

      {/* Contenuto */}
      <div style={{ flex: 1, padding: "12px 24px", overflowY: "auto", width: "100%", height: "100%" }}>
        <AnimatePresence mode="wait">

          {/* ── TAB CAMPAIGN GUIDE ── */}
          {/* ── TAB GRUPPO ── */}
          {tab === "party" && (
            <motion.div key="party" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {characters.length === 0 ? (
                <div style={{ textAlign: "center", color: "rgba(212,175,55,0.4)", padding: 40, fontStyle: "italic" }}>
                  Nessun giocatore ancora.<br />
                  I giocatori si uniscono con il codice: <strong style={{ color: "var(--gold)", letterSpacing: "0.2em" }}>{campaign.join_code}</strong>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {/* ═══ EXPLORATION MODE CONTROLS ═══ */}
                  <div className="glass-card" style={{ padding: 16, background: "rgba(64,80,140,0.15)", borderColor: "rgba(64,120,200,0.3)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                      <DnDIcon icon="explore" size={24} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontFamily: "var(--font-heading)", fontSize: "0.95rem", color: "var(--gold)" }}>
                          Modalità Esplorazione
                        </div>
                        <div style={{ fontSize: "0.65rem", color: "rgba(212,175,55,0.6)" }}>
                          Turni a rotazione per esplorazione dungeon
                        </div>
                      </div>
                      <button
                        onClick={toggleExplorationMode}
                        className={explorationMode ? "btn-crimson" : "btn-gold"}
                        style={{ padding: "8px 16px", fontSize: "0.8rem" }}
                      >
                        {explorationMode ? "Disattiva" : "Attiva"}
                      </button>
                    </div>

                    {explorationMode && (
                      <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 12, paddingTop: 12, borderTop: "1px solid rgba(212,175,55,0.2)" }}>
                        <div style={{ flex: 1, fontSize: "0.85rem", color: "var(--parchment)" }}>
                          Turno di: <strong style={{ color: "var(--gold)", fontSize: "1rem" }}>{characters[explorationTurn]?.name || "—"}</strong>
                        </div>
                        <button
                          onClick={nextExplorationTurn}
                          className="btn-ghost"
                          style={{ padding: "6px 14px", fontSize: "0.75rem" }}
                        >
                          Prossimo Turno →
                        </button>
                      </div>
                    )}
                  </div>
                  {characters.map(c => {
                    const pct = hpPct(c.hp_current, c.hp_max);
                    return (
                      <motion.div
                        key={c.id}
                        className="glass-card"
                        style={{ padding: 16 }}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                      >
                        <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                          {/* Token */}
                          <div style={{
                            width: 52, height: 52, borderRadius: "50%",
                            background: `radial-gradient(circle, ${c.token_color}40, rgba(0,0,0,0.8))`,
                            border: `3px solid ${c.token_color}`,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            flexShrink: 0, fontSize: "1.3rem", fontFamily: "var(--font-heading)",
                            color: c.token_color, fontWeight: "700",
                          }}>
                            {c.name?.[0] || "?"}
                          </div>

                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                              <div>
                                <div style={{ fontFamily: "var(--font-heading)", color: c.token_color, fontSize: "1rem" }}>
                                  {c.name}
                                </div>
                                <div style={{ fontSize: "0.7rem", color: "var(--parchment-dark)" }}>
                                  Lv.{c.level} {c.class} · {c.race} · {c.player_name}
                                </div>
                              </div>
                              {/* Stato */}
                              {c.hp_current === 0 && (
                                <span style={{ fontSize: "0.7rem", color: "var(--crimson-light)", fontFamily: "var(--font-heading)", display: "flex", alignItems: "center", gap: 4 }}>
                                  <DnDIcon icon="unconscious" size={12} /> INCOSCIENTE
                                </span>
                              )}
                              {c.inspiration && (
                                <span style={{ fontSize: "0.7rem", color: "var(--gold)", display: "flex", alignItems: "center", gap: 4 }}>
                                  <DnDIcon icon="inspiration" size={12} /> ISPIRATO
                                </span>
                              )}
                            </div>

                            {/* HP */}
                            <div style={{ marginTop: 8 }}>
                              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.7rem", color: "var(--parchment-dark)", marginBottom: 3 }}>
                                <span>HP {c.hp_current}/{c.hp_max}</span>
                                <span>CA {c.armor_class}</span>
                              </div>
                              <div className="hp-bar-container">
                                <div className={`hp-bar-fill ${hpClass(pct)}`} style={{ width: `${pct}%` }} />
                              </div>
                            </div>

                            {/* Controlli HP */}
                            <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                              {[-5, -1].map(d => (
                                <button key={d} onClick={() => updateCharHP(c.id, d)} style={{
                                  padding: "4px 10px", background: "rgba(192,64,64,0.3)",
                                  border: "1px solid rgba(192,64,64,0.5)", borderRadius: 6,
                                  color: "#e06060", cursor: "pointer", fontSize: "0.8rem",
                                }}>
                                  {d}
                                </button>
                              ))}
                              <div style={{ flex: 1 }} />
                              {[1, 5].map(d => (
                                <button key={d} onClick={() => updateCharHP(c.id, d)} style={{
                                  padding: "4px 10px", background: "rgba(64,192,64,0.3)",
                                  border: "1px solid rgba(64,192,64,0.5)", borderRadius: 6,
                                  color: "#60e060", cursor: "pointer", fontSize: "0.8rem",
                                }}>
                                  +{d}
                                </button>
                              ))}
                            </div>

                            {/* Statistiche rapide */}
                            <div style={{ display: "flex", gap: 10, marginTop: 8, flexWrap: "wrap" }}>
                              {[
                                ["FOR", c.strength], ["DES", c.dexterity], ["COS", c.constitution],
                                ["INT", c.intelligence], ["SAG", c.wisdom], ["CAR", c.charisma],
                              ].map(([label, score]) => {
                                const m = Math.floor((score - 10) / 2);
                                return (
                                  <div key={label} style={{ textAlign: "center" }}>
                                    <div style={{ fontSize: "0.55rem", color: "var(--gold-dark)", fontFamily: "var(--font-heading)" }}>{label}</div>
                                    <div style={{ fontFamily: "var(--font-heading)", fontSize: "0.9rem", color: "var(--parchment)" }}>{score}</div>
                                    <div style={{ fontSize: "0.65rem", color: m >= 0 ? "var(--gold)" : "var(--crimson-light)" }}>
                                      {m >= 0 ? "+" : ""}{m}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>

                            {/* Status Effects / Condizioni */}
                            <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid rgba(212,175,55,0.15)" }}>
                              <div style={{ fontSize: "0.7rem", color: "var(--gold-dark)", fontFamily: "var(--font-heading)", marginBottom: 8 }}>
                                CONDIZIONI
                              </div>

                              {/* Condizioni attive */}
                              {c.conditions && c.conditions.length > 0 && (
                                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
                                  {c.conditions.map(condId => {
                                    const effect = STATUS_EFFECTS.find(e => e.id === condId);
                                    if (!effect) return null;
                                    return (
                                      <div
                                        key={condId}
                                        onClick={() => toggleStatusEffect(c.id, condId)}
                                        style={{
                                          display: "inline-flex",
                                          alignItems: "center",
                                          gap: 10,
                                          padding: "3px 8px",
                                          background: `${effect.color}30`,
                                          border: `1px solid ${effect.color}`,
                                          borderRadius: 6,
                                          fontSize: "0.7rem",
                                          color: effect.color,
                                          cursor: "pointer",
                                          fontFamily: "var(--font-heading)",
                                        }}
                                        title="Click per rimuovere"
                                      >
                                        <span style={{ fontWeight: "700" }}>{effect.symbol}</span>
                                        <span>{effect.label}</span>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}

                              {/* Selettore condizioni disponibili */}
                              <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                                {STATUS_EFFECTS.map(effect => {
                                  const isActive = c.conditions?.includes(effect.id);
                                  if (isActive) return null; // Non mostrare se già attivo
                                  return (
                                    <button
                                      key={effect.id}
                                      onClick={() => toggleStatusEffect(c.id, effect.id)}
                                      style={{
                                        padding: "2px 6px",
                                        background: "rgba(20,25,35,0.5)",
                                        border: `1px solid ${effect.color}40`,
                                        borderRadius: 4,
                                        color: `${effect.color}aa`,
                                        fontSize: "0.65rem",
                                        cursor: "pointer",
                                        fontFamily: "var(--font-heading)",
                                        fontWeight: "600",
                                      }}
                                      title={effect.label}
                                    >
                                      {effect.symbol}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>

                            {/* Saving Throws / Tiri Salvezza */}
                            <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid rgba(212,175,55,0.15)" }}>
                              <div style={{ fontSize: "0.7rem", color: "var(--gold-dark)", fontFamily: "var(--font-heading)", marginBottom: 8 }}>
                                TIRI SALVEZZA
                              </div>

                              {/* Selettore Abilità */}
                              <div style={{ marginBottom: 8 }}>
                                <div style={{ fontSize: "0.6rem", color: "rgba(212,175,55,0.6)", marginBottom: 4 }}>Abilità:</div>
                                <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                                  {SAVING_THROWS.map(save => {
                                    const isSelected = savingThrowForm[c.id]?.ability === save.id;
                                    const bonus = calculateSavingThrowBonus(c, save.id);
                                    return (
                                      <button
                                        key={save.id}
                                        onClick={() => setSavingThrowForm(prev => ({
                                          ...prev,
                                          [c.id]: { ...prev[c.id], ability: save.id }
                                        }))}
                                        style={{
                                          padding: "4px 8px",
                                          background: isSelected ? `${save.color}30` : "rgba(20,25,35,0.5)",
                                          border: `1px solid ${isSelected ? save.color : `${save.color}40`}`,
                                          borderRadius: 6,
                                          color: isSelected ? save.color : `${save.color}aa`,
                                          fontSize: "0.65rem",
                                          cursor: "pointer",
                                          fontFamily: "var(--font-heading)",
                                          fontWeight: isSelected ? "700" : "600",
                                          display: "flex",
                                          alignItems: "center",
                                          gap: 6,
                                        }}
                                        title={`${save.description} (${bonus >= 0 ? '+' : ''}${bonus})`}
                                      >
                                        <span>{save.shortLabel}</span>
                                        <span style={{ fontSize: "0.6rem", opacity: 0.7 }}>
                                          {bonus >= 0 ? '+' : ''}{bonus}
                                        </span>
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>

                              {/* DC e Descrizione */}
                              <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
                                <div style={{ flex: "0 0 60px" }}>
                                  <div style={{ fontSize: "0.6rem", color: "rgba(212,175,55,0.6)", marginBottom: 3 }}>DC:</div>
                                  <input
                                    type="number"
                                    min="5"
                                    max="30"
                                    value={savingThrowForm[c.id]?.dc || ""}
                                    onChange={(e) => setSavingThrowForm(prev => ({
                                      ...prev,
                                      [c.id]: { ...prev[c.id], dc: e.target.value }
                                    }))}
                                    placeholder="15"
                                    style={{
                                      width: "100%",
                                      padding: "4px 6px",
                                      background: "rgba(20,25,35,0.7)",
                                      border: "1px solid rgba(212,175,55,0.3)",
                                      borderRadius: 4,
                                      color: "var(--parchment)",
                                      fontSize: "0.75rem",
                                      fontFamily: "var(--font-heading)",
                                      textAlign: "center",
                                    }}
                                  />
                                </div>
                                <div style={{ flex: 1 }}>
                                  <div style={{ fontSize: "0.6rem", color: "rgba(212,175,55,0.6)", marginBottom: 3 }}>Descrizione:</div>
                                  <input
                                    type="text"
                                    value={savingThrowForm[c.id]?.description || ""}
                                    onChange={(e) => setSavingThrowForm(prev => ({
                                      ...prev,
                                      [c.id]: { ...prev[c.id], description: e.target.value }
                                    }))}
                                    placeholder="Es: Resisti al veleno"
                                    style={{
                                      width: "100%",
                                      padding: "4px 8px",
                                      background: "rgba(20,25,35,0.7)",
                                      border: "1px solid rgba(212,175,55,0.3)",
                                      borderRadius: 4,
                                      color: "var(--parchment)",
                                      fontSize: "0.7rem",
                                      fontFamily: "var(--font-body)",
                                    }}
                                  />
                                </div>
                              </div>

                              {/* Bottone Richiedi Tiro */}
                              <button
                                onClick={() => requestSavingThrow(c.id)}
                                disabled={!savingThrowForm[c.id]?.ability || !savingThrowForm[c.id]?.dc}
                                className="btn btn-primary"
                                style={{
                                  width: "100%",
                                  padding: "8px",
                                  fontSize: "0.7rem",
                                  opacity: (!savingThrowForm[c.id]?.ability || !savingThrowForm[c.id]?.dc) ? 0.5 : 1,
                                  cursor: (!savingThrowForm[c.id]?.ability || !savingThrowForm[c.id]?.dc) ? "not-allowed" : "pointer",
                                }}
                              >
                                Richiedi Tiro Salvezza
                              </button>
                            </div>

                            {/* Skill Checks / Prove Abilità */}
                            <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid rgba(212,175,55,0.15)" }}>
                              <div style={{ fontSize: "0.7rem", color: "var(--gold-dark)", fontFamily: "var(--font-heading)", marginBottom: 8 }}>
                                PROVE ABILITÀ
                              </div>

                              {/* Selettore Abilità (dropdown) */}
                              <div style={{ marginBottom: 8 }}>
                                <div style={{ fontSize: "0.6rem", color: "rgba(212,175,55,0.6)", marginBottom: 4 }}>Abilità:</div>
                                <select
                                  value={skillCheckForm[c.id]?.skill || ""}
                                  onChange={(e) => setSkillCheckForm(prev => ({
                                    ...prev,
                                    [c.id]: { ...prev[c.id], skill: e.target.value }
                                  }))}
                                  style={{
                                    width: "100%",
                                    padding: "6px 8px",
                                    background: "rgba(20,25,35,0.7)",
                                    border: "1px solid rgba(212,175,55,0.3)",
                                    borderRadius: 4,
                                    color: "var(--parchment)",
                                    fontSize: "0.7rem",
                                    fontFamily: "var(--font-heading)",
                                  }}
                                >
                                  <option value="">-- Seleziona abilità --</option>
                                  {SKILL_CHECKS.map(skill => {
                                    const bonus = calculateSkillCheckBonus(c, skill.id);
                                    return (
                                      <option key={skill.id} value={skill.id}>
                                        {skill.label} ({skill.abilityLabel} {bonus >= 0 ? '+' : ''}{bonus})
                                      </option>
                                    );
                                  })}
                                </select>
                              </div>

                              {/* DC e Descrizione */}
                              <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
                                <div style={{ flex: "0 0 60px" }}>
                                  <div style={{ fontSize: "0.6rem", color: "rgba(212,175,55,0.6)", marginBottom: 3 }}>DC:</div>
                                  <input
                                    type="number"
                                    min="5"
                                    max="30"
                                    value={skillCheckForm[c.id]?.dc || ""}
                                    onChange={(e) => setSkillCheckForm(prev => ({
                                      ...prev,
                                      [c.id]: { ...prev[c.id], dc: e.target.value }
                                    }))}
                                    placeholder="15"
                                    style={{
                                      width: "100%",
                                      padding: "4px 6px",
                                      background: "rgba(20,25,35,0.7)",
                                      border: "1px solid rgba(212,175,55,0.3)",
                                      borderRadius: 4,
                                      color: "var(--parchment)",
                                      fontSize: "0.75rem",
                                      fontFamily: "var(--font-heading)",
                                      textAlign: "center",
                                    }}
                                  />
                                </div>
                                <div style={{ flex: 1 }}>
                                  <div style={{ fontSize: "0.6rem", color: "rgba(212,175,55,0.6)", marginBottom: 3 }}>Descrizione:</div>
                                  <input
                                    type="text"
                                    value={skillCheckForm[c.id]?.description || ""}
                                    onChange={(e) => setSkillCheckForm(prev => ({
                                      ...prev,
                                      [c.id]: { ...prev[c.id], description: e.target.value }
                                    }))}
                                    placeholder="Es: Nota la trappola nascosta"
                                    style={{
                                      width: "100%",
                                      padding: "4px 8px",
                                      background: "rgba(20,25,35,0.7)",
                                      border: "1px solid rgba(212,175,55,0.3)",
                                      borderRadius: 4,
                                      color: "var(--parchment)",
                                      fontSize: "0.7rem",
                                      fontFamily: "var(--font-body)",
                                    }}
                                  />
                                </div>
                              </div>

                              {/* Bottone Richiedi Prova */}
                              <button
                                onClick={() => requestSkillCheck(c.id)}
                                disabled={!skillCheckForm[c.id]?.skill || !skillCheckForm[c.id]?.dc}
                                className="btn btn-primary"
                                style={{
                                  width: "100%",
                                  padding: "8px",
                                  fontSize: "0.7rem",
                                  opacity: (!skillCheckForm[c.id]?.skill || !skillCheckForm[c.id]?.dc) ? 0.5 : 1,
                                  cursor: (!skillCheckForm[c.id]?.skill || !skillCheckForm[c.id]?.dc) ? "not-allowed" : "pointer",
                                }}
                              >
                                Richiedi Prova Abilità
                              </button>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}

              {/* Codice join campagna */}
              <div className="glass-card" style={{ padding: 14, marginTop: 16, textAlign: "center" }}>
                <div style={{ fontFamily: "var(--font-heading)", fontSize: "0.7rem", color: "var(--gold)", letterSpacing: "0.2em", marginBottom: 6 }}>
                  CODICE CAMPAGNA
                </div>
                <div style={{ fontFamily: "var(--font-heading)", fontSize: "2rem", color: "var(--parchment)", letterSpacing: "0.3em" }}>
                  {campaign.join_code}
                </div>
                <div style={{ fontSize: "0.75rem", color: "rgba(212,175,55,0.5)" }}>
                  I giocatori usano questo codice per unirsi
                </div>
              </div>
            </motion.div>
          )}

          {/* ── TAB COMBATTIMENTO UNIFICATO ── */}
          {tab === "combat" && (
            <motion.div key="combat" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{ display: "flex", flexDirection: "column", gap: 16, height: "100%" }}>

              {/* ═══ UPLOAD MAPPA (se non caricata) ═══ */}
              {!mapUrl && (
                <div style={{ background: "rgba(212,175,55,0.05)", border: "1px solid rgba(212,175,55,0.15)", borderRadius: 12, padding: 20 }}>
                  <div style={{ fontFamily: "var(--font-heading)", fontSize: "0.8rem", color: "var(--gold)", letterSpacing: "0.15em", marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
                    <DnDIcon icon="map" size={16} /> CARICA MAPPA DI BATTAGLIA
                  </div>
                  <div style={{ fontSize: "0.85rem", color: "var(--parchment-dark)", marginBottom: 16, lineHeight: 1.6 }}>
                    Carica una mappa (PNG/JPG, consigliato 2800x2800px con griglia 70px).<br />
                    La mappa apparirà sulla TV e potrai posizionare i token dei personaggi e mostri.
                  </div>
                  <label htmlFor="map-upload-combat">
                    <motion.div className="btn btn-gold" style={{ display: "inline-flex", alignItems: "center", gap: 10, cursor: uploadingMap ? "wait" : "pointer", opacity: uploadingMap ? 0.5 : 1 }}
                      whileHover={!uploadingMap ? { scale: 1.02 } : {}} whileTap={!uploadingMap ? { scale: 0.98 } : {}}>
                      <DnDIcon icon={uploadingMap ? "hourglass" : "map"} size={18} />
                      {uploadingMap ? "Caricamento..." : "Scegli Mappa"}
                    </motion.div>
                  </label>
                  <input id="map-upload-combat" type="file" accept="image/png,image/jpeg,image/jpg" onChange={handleMapUpload} disabled={uploadingMap} style={{ display: "none" }} />
                </div>
              )}

              {/* ═══ BATTLE GRID (sempre visibile quando c'è mappa) ═══ */}
              {mapUrl && (
                <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minHeight: 500 }}>
                  <BattleGrid
                    mapUrl={mapUrl}
                    tvChannel={tvChannel}
                    session={session}
                    characters={characters}
                    monsters={monsters}
                    npcs={[]}
                    combatActive={combatActive}
                  />
                </div>
              )}

              {/* ═══ COMBAT TOOLBAR ═══ */}
              {mapUrl && (
                <div style={{ display: "flex", flexDirection: "column", gap: 16, padding: "0 8px" }}>

                  {/* Bottoni Combat */}
                  <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                    {/* INIZIA COMBATTIMENTO */}
                    {!combatActive && monsters.length > 0 && (
                      <motion.button
                        className="btn btn-crimson"
                        onClick={requestInitiativeRoll}
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        style={{
                          flex: 1,
                          padding: "18px 28px",
                          fontSize: "1.1rem",
                          fontWeight: "700",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 12,
                          boxShadow: "0 0 40px rgba(192,64,64,0.6)",
                          border: "2px solid var(--crimson-light)",
                          transition: "all 0.3s",
                          letterSpacing: "0.05em",
                        }}
                      >
                        <DnDIcon icon="attack" size={24} />
                        INIZIA COMBATTIMENTO
                      </motion.button>
                    )}

                    {/* TURNO SUCCESSIVO + FINE */}
                    {combatActive && (
                      <>
                        <motion.button
                          className="btn btn-gold"
                          onClick={nextTurn}
                          whileHover={{ scale: 1.03 }}
                          whileTap={{ scale: 0.97 }}
                          style={{
                            flex: 2,
                            padding: "16px 24px",
                            fontSize: "1rem",
                            fontWeight: "700",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 10,
                            boxShadow: "0 0 30px rgba(212,175,55,0.5)",
                            transition: "all 0.3s",
                          }}
                        >
                          <DnDIcon icon="arrow" size={18} />
                          TURNO SUCCESSIVO
                        </motion.button>
                        <motion.button
                          className="btn btn-ghost"
                          onClick={endCombat}
                          whileHover={{ scale: 1.03 }}
                          whileTap={{ scale: 0.97 }}
                          style={{
                            flex: 1,
                            padding: "16px 24px",
                            fontSize: "0.9rem",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 8,
                          }}
                        >
                          <DnDIcon icon="shield" size={16} />
                          Fine
                        </motion.button>
                      </>
                    )}
                  </div>

                  {/* Ordine iniziativa (compatto) */}
                  {combatActive && initiative.length > 0 && (
                    <div style={{
                      background: "rgba(15,20,25,0.6)",
                      border: "1px solid rgba(212,175,55,0.12)",
                      borderRadius: 8,
                      padding: 12,
                    }}>
                      <div style={{
                        fontFamily: "var(--font-heading)",
                        fontSize: "0.7rem",
                        color: "var(--gold)",
                        letterSpacing: "0.15em",
                        marginBottom: 10,
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                      }}>
                        <DnDIcon icon="dice" size={14} color="var(--gold)" />
                        ORDINE TURNI - Round {Math.floor(currentTurn / initiative.length) + 1}
                      </div>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        {initiative.map((entry, idx) => {
                          const isCurrent = idx === (currentTurn % initiative.length);
                          return (
                            <div
                              key={entry.id}
                              style={{
                                padding: "6px 12px",
                                borderRadius: 6,
                                background: isCurrent
                                  ? "rgba(212,175,55,0.2)"
                                  : "rgba(10,8,6,0.5)",
                                border: isCurrent
                                  ? "2px solid var(--gold)"
                                  : "1px solid rgba(212,175,55,0.1)",
                                fontSize: "0.75rem",
                                color: isCurrent ? "var(--gold)" : "var(--parchment-dark)",
                                fontWeight: isCurrent ? "700" : "400",
                                display: "flex",
                                alignItems: "center",
                                gap: 6,
                              }}
                            >
                              {entry.name} ({entry.roll})
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

            </motion.div>
          )}

          {/* ── TAB NARRATIVA ── REDESIGN PROFESSIONALE */}
          {tab === "narrate" && (
            <motion.div key="narrate" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{ display: "flex", flexDirection: "column", gap: 20 }}>

              {/* Header con info scena attiva */}
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
                  rows={5}
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
                            fontSize: "0.8rem"
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
                          fontSize: "0.8rem"
                        }}
                      >
                        Rimuovi Immagine
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Pulsante Invia con feedback migliorato */}
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

              {/* Pulsante Chiudi Narrativa - Appare solo se c'è narrativa attiva */}
              <AnimatePresence>
                {narrativeActive && (
                  <motion.button
                    className="btn"
                    onClick={async () => {
                      await broadcastToTV("narrative", { text: null });
                      setNarrativeActive(false); // ✅ Narrativa chiusa
                      // Reset immagine e marker
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

              {/* Template Organizzati per Categoria */}
              <div style={{ marginTop: 8 }}>
                <div style={{
                  fontFamily: "var(--font-heading)",
                  fontSize: "0.7rem",
                  color: "var(--gold)",
                  letterSpacing: "0.15em",
                  marginBottom: 16,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}>
                  <div style={{ flex: 1, height: 1, background: "linear-gradient(90deg, rgba(212,175,55,0.3), transparent)" }} />
                  TEMPLATE RAPIDI
                  <div style={{ flex: 1, height: 1, background: "linear-gradient(90deg, transparent, rgba(212,175,55,0.3))" }} />
                </div>

                {/* Grid di categorie */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>

                  {/* Categoria: Combattimento */}
                  {(() => {
                    const templates = [
                      { label: "Inizio Combattimento", text: "Il combattimento inizia! Preparatevi ad affrontare i nemici!" },
                      { label: "Nemico Sconfitto", text: "Il nemico cade a terra esanime. La battaglia è vinta!" },
                      { label: "Tiro Iniziativa", text: "Tirate per l'iniziativa! Il combattimento sta per cominciare." },
                      { label: "Round Finale", text: "È l'ultimo round! Questo è il momento decisivo della battaglia!" },
                    ];
                    return (
                      <div style={{
                        background: "linear-gradient(135deg, rgba(192,64,64,0.1), rgba(192,64,64,0.05))",
                        border: "1px solid rgba(192,64,64,0.3)",
                        borderRadius: 10,
                        padding: "14px",
                      }}>
                        <div style={{
                          fontFamily: "var(--font-heading)",
                          fontSize: "0.7rem",
                          color: "var(--crimson-light)",
                          letterSpacing: "0.12em",
                          marginBottom: 10,
                          fontWeight: "700",
                        }}>
                          COMBATTIMENTO
                        </div>
                        {templates.map(t => (
                          <button
                            key={t.label}
                            onClick={() => setNarrativeText(t.text)}
                            style={{
                              display: "block",
                              width: "100%",
                              background: "rgba(0,0,0,0.2)",
                              border: "1px solid rgba(192,64,64,0.2)",
                              borderRadius: 6,
                              padding: "10px 12px",
                              color: "var(--parchment-dark)",
                              cursor: "pointer",
                              textAlign: "left",
                              fontSize: "0.8rem",
                              marginBottom: 6,
                              transition: "all 0.2s",
                              fontFamily: "var(--font-body)",
                            }}
                            onMouseOver={e => {
                              e.currentTarget.style.borderColor = "rgba(192,64,64,0.5)";
                              e.currentTarget.style.background = "rgba(192,64,64,0.15)";
                              e.currentTarget.style.color = "var(--parchment)";
                            }}
                            onMouseOut={e => {
                              e.currentTarget.style.borderColor = "rgba(192,64,64,0.2)";
                              e.currentTarget.style.background = "rgba(0,0,0,0.2)";
                              e.currentTarget.style.color = "var(--parchment-dark)";
                            }}
                          >
                            {t.label}
                          </button>
                        ))}
                      </div>
                    );
                  })()}

                  {/* Categoria: Esplorazione */}
                  {(() => {
                    const templates = [
                      { label: "Dungeon in Vista", text: "Davanti a voi si erge l'ingresso di un antico dungeon. Le ombre danzano all'interno." },
                      { label: "Stanza Oscura", text: "Entrate in una stanza buia. Le torce proiettano ombre inquietanti sulle pareti." },
                      { label: "Corridoio Lungo", text: "Un lungo corridoio si estende davanti a voi, perdendosi nell'oscurità." },
                      { label: "Porta Misteriosa", text: "Vi trovate davanti a una porta chiusa. Dall'altra parte sentite rumori sospetti." },
                    ];
                    return (
                      <div style={{
                        background: "linear-gradient(135deg, rgba(100,150,100,0.1), rgba(100,150,100,0.05))",
                        border: "1px solid rgba(100,150,100,0.3)",
                        borderRadius: 10,
                        padding: "14px",
                      }}>
                        <div style={{
                          fontFamily: "var(--font-heading)",
                          fontSize: "0.7rem",
                          color: "#7ec47e",
                          letterSpacing: "0.12em",
                          marginBottom: 10,
                          fontWeight: "700",
                        }}>
                          ESPLORAZIONE
                        </div>
                        {templates.map(t => (
                          <button
                            key={t.label}
                            onClick={() => setNarrativeText(t.text)}
                            style={{
                              display: "block",
                              width: "100%",
                              background: "rgba(0,0,0,0.2)",
                              border: "1px solid rgba(100,150,100,0.2)",
                              borderRadius: 6,
                              padding: "10px 12px",
                              color: "var(--parchment-dark)",
                              cursor: "pointer",
                              textAlign: "left",
                              fontSize: "0.8rem",
                              marginBottom: 6,
                              transition: "all 0.2s",
                              fontFamily: "var(--font-body)",
                            }}
                            onMouseOver={e => {
                              e.currentTarget.style.borderColor = "rgba(100,150,100,0.5)";
                              e.currentTarget.style.background = "rgba(100,150,100,0.15)";
                              e.currentTarget.style.color = "var(--parchment)";
                            }}
                            onMouseOut={e => {
                              e.currentTarget.style.borderColor = "rgba(100,150,100,0.2)";
                              e.currentTarget.style.background = "rgba(0,0,0,0.2)";
                              e.currentTarget.style.color = "var(--parchment-dark)";
                            }}
                          >
                            {t.label}
                          </button>
                        ))}
                      </div>
                    );
                  })()}

                  {/* Categoria: Tesori */}
                  {(() => {
                    const templates = [
                      { label: "Forziere Trovato", text: "Notate un forziere nell'angolo della stanza. Potrebbe contenere qualcosa di prezioso." },
                      { label: "Tesoro Nascosto", text: "Con occhio attento, scoprite un nascondiglio segreto. Al suo interno brilla qualcosa." },
                      { label: "Oggetto Magico", text: "Tra i resti trovate un oggetto che emana una debole aura magica." },
                      { label: "Ricompensa", text: "Per il vostro coraggio, ricevete una ricompensa degna di veri eroi." },
                    ];
                    return (
                      <div style={{
                        background: "linear-gradient(135deg, rgba(212,175,55,0.1), rgba(212,175,55,0.05))",
                        border: "1px solid rgba(212,175,55,0.3)",
                        borderRadius: 10,
                        padding: "14px",
                      }}>
                        <div style={{
                          fontFamily: "var(--font-heading)",
                          fontSize: "0.7rem",
                          color: "var(--gold)",
                          letterSpacing: "0.12em",
                          marginBottom: 10,
                          fontWeight: "700",
                        }}>
                          TESORI
                        </div>
                        {templates.map(t => (
                          <button
                            key={t.label}
                            onClick={() => setNarrativeText(t.text)}
                            style={{
                              display: "block",
                              width: "100%",
                              background: "rgba(0,0,0,0.2)",
                              border: "1px solid rgba(212,175,55,0.2)",
                              borderRadius: 6,
                              padding: "10px 12px",
                              color: "var(--parchment-dark)",
                              cursor: "pointer",
                              textAlign: "left",
                              fontSize: "0.8rem",
                              marginBottom: 6,
                              transition: "all 0.2s",
                              fontFamily: "var(--font-body)",
                            }}
                            onMouseOver={e => {
                              e.currentTarget.style.borderColor = "rgba(212,175,55,0.5)";
                              e.currentTarget.style.background = "rgba(212,175,55,0.15)";
                              e.currentTarget.style.color = "var(--parchment)";
                            }}
                            onMouseOut={e => {
                              e.currentTarget.style.borderColor = "rgba(212,175,55,0.2)";
                              e.currentTarget.style.background = "rgba(0,0,0,0.2)";
                              e.currentTarget.style.color = "var(--parchment-dark)";
                            }}
                          >
                            {t.label}
                          </button>
                        ))}
                      </div>
                    );
                  })()}

                  {/* Categoria: Pericoli */}
                  {(() => {
                    const templates = [
                      { label: "Trappola Attivata", text: "Scatta una trappola! Tirate Destrezza (CD 15) per evitarla." },
                      { label: "Rumori Inquietanti", text: "Udite strani rumori provenire dall'oscurità. Qualcosa si sta avvicinando..." },
                      { label: "Presenza Nemica", text: "Percepite una presenza nemica nelle vicinanze. State in guardia!" },
                      { label: "Ambiente Ostile", text: "L'ambiente diventa ostile. Dovrete superare questa sfida per proseguire." },
                    ];
                    return (
                      <div style={{
                        background: "linear-gradient(135deg, rgba(150,80,50,0.1), rgba(150,80,50,0.05))",
                        border: "1px solid rgba(150,80,50,0.3)",
                        borderRadius: 10,
                        padding: "14px",
                      }}>
                        <div style={{
                          fontFamily: "var(--font-heading)",
                          fontSize: "0.7rem",
                          color: "#c4926e",
                          letterSpacing: "0.12em",
                          marginBottom: 10,
                          fontWeight: "700",
                        }}>
                          PERICOLI
                        </div>
                        {templates.map(t => (
                          <button
                            key={t.label}
                            onClick={() => setNarrativeText(t.text)}
                            style={{
                              display: "block",
                              width: "100%",
                              background: "rgba(0,0,0,0.2)",
                              border: "1px solid rgba(150,80,50,0.2)",
                              borderRadius: 6,
                              padding: "10px 12px",
                              color: "var(--parchment-dark)",
                              cursor: "pointer",
                              textAlign: "left",
                              fontSize: "0.8rem",
                              marginBottom: 6,
                              transition: "all 0.2s",
                              fontFamily: "var(--font-body)",
                            }}
                            onMouseOver={e => {
                              e.currentTarget.style.borderColor = "rgba(150,80,50,0.5)";
                              e.currentTarget.style.background = "rgba(150,80,50,0.15)";
                              e.currentTarget.style.color = "var(--parchment)";
                            }}
                            onMouseOut={e => {
                              e.currentTarget.style.borderColor = "rgba(150,80,50,0.2)";
                              e.currentTarget.style.background = "rgba(0,0,0,0.2)";
                              e.currentTarget.style.color = "var(--parchment-dark)";
                            }}
                          >
                            {t.label}
                          </button>
                        ))}
                      </div>
                    );
                  })()}

                </div>
              </div>
            </motion.div>
          )}

          {/* ── TAB SCENE ── */}
          {tab === "scenes" && (
            <motion.div key="scenes" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <SceneManager
                campaign={campaign}
                session={session}
                tvChannel={tvChannel}
              />
            </motion.div>
          )}

          {/* ── TAB NPC ── */}
          {tab === "npcs" && (
            <motion.div key="npcs" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <NPCManager
                campaign={campaign}
                onAddToCombat={(npc) => {
                  // Converti NPC in mostro
                  const monster = {
                    id: `m_npc_${Date.now()}`,
                    name: npc.name,
                    hp: npc.hp_max,
                    hp_current: npc.hp_current,
                    hp_max: npc.hp_max,
                    ac: npc.armor_class,
                    attack: `+${Math.floor((npc.strength - 10) / 2)}`,
                    damage: "1d8+" + Math.floor((npc.strength - 10) / 2),
                    avatar_url: npc.avatar_url || "",
                  };
                  addMonster(monster);
                  setTab("combat"); // Vai al tab combattimento
                }}
                onHostileNPCCreated={(npc) => {
                  // NPC ostile creato → aggiungi automaticamente ai mostri
                  const monster = {
                    id: `m_npc_${Date.now()}`,
                    name: npc.name,
                    hp: npc.hp_max,
                    hp_current: npc.hp_current,
                    hp_max: npc.hp_max,
                    ac: npc.armor_class,
                    attack: `+${Math.floor((npc.strength - 10) / 2)}`,
                    damage: "1d8+" + Math.floor((npc.strength - 10) / 2),
                    avatar_url: npc.avatar_url || "",
                  };
                  addMonster(monster);
                  console.log(`☠️ NPC ostile "${npc.name}" aggiunto automaticamente ai mostri`);
                }}
              />
            </motion.div>
          )}

          {/* ── TAB TESORO ── */}
          {tab === "loot" && (
            <motion.div key="loot" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <LootDistribution characters={characters} campaign={campaign} />
            </motion.div>
          )}

          {/* ── TAB DADI DM ── */}
          {tab === "dice" && (
            <motion.div key="dice" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div style={{ fontFamily: "var(--font-heading)", fontSize: "0.7rem", color: "var(--gold)", letterSpacing: "0.15em", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
                <DnDIcon icon="dice" size={16} /> DADI SEGRETI (solo il DM vede il risultato)
              </div>

              {/* Bottone Lancia Dadi 3D */}
              <div style={{
                background: "linear-gradient(135deg, rgba(212,175,55,0.1), rgba(212,175,55,0.05))",
                border: "2px solid rgba(212,175,55,0.3)",
                borderRadius: 12,
                padding: 40,
                textAlign: "center",
                marginBottom: 16,
              }}>
                <div style={{
                  marginBottom: 16,
                  filter: "drop-shadow(0 0 20px rgba(212,175,55,0.5))",
                  display: "flex",
                  justifyContent: "center",
                }}>
                  <DnDIcon icon="dice" size={64} color="var(--gold)" />
                </div>
                <h3 style={{
                  fontFamily: "var(--font-heading)",
                  fontSize: "1.4rem",
                  color: "var(--gold)",
                  marginBottom: 12,
                  letterSpacing: "0.05em",
                }}>
                  Dadi 3D Segreti
                </h3>
                <div style={{
                  fontSize: "0.9rem",
                  color: "var(--parchment-dark)",
                  marginBottom: 24,
                  lineHeight: 1.6,
                }}>
                  Lancia dadi 3D realistici con fisica avanzata.<br />
                  I risultati saranno visibili solo a te.
                </div>
                <motion.button
                  className="btn btn-gold"
                  onClick={() => setDiceModalOpen(true)}
                  whileHover={{ scale: 1.05, boxShadow: "0 0 30px rgba(212,175,55,0.5)" }}
                  whileTap={{ scale: 0.95 }}
                  style={{
                    padding: "16px 32px",
                    fontSize: "1.1rem",
                    fontWeight: "bold",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <DnDIcon icon="dice" size={24} />
                  Apri Tavolo Dadi 3D
                </motion.button>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}
