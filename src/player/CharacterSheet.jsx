// ═══════════════════════════════════════════════
//  CharacterSheet — Scheda personaggio sul telefono
//  Aggiornamenti realtime via Supabase
//  Tab: Statistiche | Abilità | Incantesimi | Inventario | Note
// ═══════════════════════════════════════════════

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import MusicPlayer from "../shared/components/MusicPlayer.jsx";
import { supabase } from "../lib/supabase.js";
import { TokenLarge } from "../shared/components/CharacterToken.jsx";
import { DicePanel } from "../shared/components/DiceRoller.jsx";
import ExploreTab from "./ExploreTab.jsx";
import { getClassById, PROFICIENCY_BONUS } from "../shared/constants/classes.js";
import { getRaceById } from "../shared/constants/races.js";
import DnDIcon from "../shared/components/DnDIcon.jsx";
import ModalDialog from "../shared/components/ModalDialog.jsx";
import InputModal from "../shared/components/InputModal.jsx";
import WeaponModal from "../shared/components/WeaponModal.jsx";
import { STATUS_EFFECTS } from "../shared/constants/statusEffects.js";
import { SAVING_THROWS } from "../shared/constants/savingThrows.js";
import { SKILL_CHECKS } from "../shared/constants/skillChecks.js";

const ABILITIES = [
  { key: "strength",     label: "FOR", full: "Forza",       skills: ["athletics"] },
  { key: "dexterity",    label: "DES", full: "Destrezza",   skills: ["acrobatics","sleight_of_hand","stealth"] },
  { key: "constitution", label: "COS", full: "Costituzione",skills: [] },
  { key: "intelligence", label: "INT", full: "Intelligenza", skills: ["arcana","history","investigation","nature","religion"] },
  { key: "wisdom",       label: "SAG", full: "Saggezza",    skills: ["animal_handling","insight","medicine","perception","survival"] },
  { key: "charisma",     label: "CAR", full: "Carisma",     skills: ["deception","intimidation","performance","persuasion"] },
];

const SKILL_NAMES = {
  athletics: "Atletica",
  acrobatics: "Acrobazia",
  sleight_of_hand: "Destrezza di mano",
  stealth: "Furtività",
  arcana: "Arcana",
  history: "Storia",
  investigation: "Indagare",
  nature: "Natura",
  religion: "Religione",
  animal_handling: "Addestrare animali",
  insight: "Intuizione",
  medicine: "Medicina",
  perception: "Percezione",
  survival: "Sopravvivenza",
  deception: "Inganno",
  intimidation: "Intimidire",
  performance: "Esibizione",
  persuasion: "Persuasione",
};

const TABS = [
  { id: "main", label: "Stat", icon: "sword" },
  { id: "explore", label: "Esplora", icon: "explore" },
  { id: "skills", label: "Abilità", icon: "perception" },
  { id: "dice", label: "Dadi", icon: "diceD20" },
  { id: "spells", label: "Magie", icon: "spell" },
  { id: "inventory", label: "Zaino", icon: "shield" },
  { id: "notes", label: "Note", icon: "scroll" },
];

function getMod(score) {
  return Math.floor((score - 10) / 2);
}
function modStr(score) {
  const m = getMod(score);
  return m >= 0 ? `+${m}` : `${m}`;
}

// Calcola AC automaticamente da equipaggiamento
function calculateAC(character) {
  const dexMod = getMod(character.dexterity || 10);
  const armor = character.equipped_armor;
  const shield = character.equipped_shield;

  let ac = 10;
  let dexBonus = dexMod;

  if (armor) {
    ac = armor.ac_base || 10;
    if (armor.max_dex_bonus !== undefined) {
      dexBonus = Math.min(dexMod, armor.max_dex_bonus);
    }
  }

  ac += dexBonus;
  if (shield) ac += shield.ac_bonus || 2;

  return ac;
}

export default function CharacterSheet({ character: initialChar, campaign, session, onBack }) {
  const [char, setChar] = useState(initialChar);
  const [tab, setTab] = useState("main");
  const [saving, setSaving] = useState(false);
  const [lastRoll, setLastRoll] = useState(null);
  const [editingHP, setEditingHP] = useState(false);
  const [hpDelta, setHpDelta] = useState("");
  const [showDiceResult, setShowDiceResult] = useState(false);
  const [diceResult, setDiceResult] = useState(null);
  const [showShortRest, setShowShortRest] = useState(false);
  const [hitDieResult, setHitDieResult] = useState(null);
  const [selectedHelp, setSelectedHelp] = useState(null);

  // Modal states
  const [modal, setModal] = useState({ isOpen: false, type: "alert", title: "", message: "", onConfirm: null });
  const [inputModal, setInputModal] = useState({ isOpen: false, title: "", label: "", onConfirm: null, defaultValue: "", type: "text" });
  const [weaponModal, setWeaponModal] = useState({ isOpen: false, isOffhand: false, onConfirm: null });

  // Initiative Roll State
  const [initiativeRequest, setInitiativeRequest] = useState(null); // { timestamp } quando il DM richiede il tiro
  const [rollingInitiative, setRollingInitiative] = useState(false);

  // Combat State
  const [isCombat, setIsCombat] = useState(false);
  const [pendingDamageRoll, setPendingDamageRoll] = useState(null); // { weapon, attackRoll, hit } quando può tirare danno
  const [availableTargets, setAvailableTargets] = useState([]); // Lista mostri disponibili durante combattimento
  const [selectedTarget, setSelectedTarget] = useState(null); // Bersaglio selezionato { id, name, ac }

  // Saving Throw State
  const [savingThrowRequest, setSavingThrowRequest] = useState(null); // { ability, abilityId, dc, description, bonus, timestamp }

  // Skill Check State
  const [skillCheckRequest, setSkillCheckRequest] = useState(null); // { skill, skillId, ability, dc, description, bonus, timestamp }

  const cls = getClassById(char?.class);
  const race = getRaceById(char?.race);
  const level = char?.level || 1;
  const profBonus = PROFICIENCY_BONUS[level - 1] || 2;
  const hpPct = char ? Math.max(0, (char.hp_current / char.hp_max) * 100) : 0;
  const hpClass = hpPct > 50 ? "high" : hpPct > 25 ? "mid" : "low";

  // Realtime sync personaggio
  useEffect(() => {
    if (!char?.id) return;

    const channel = supabase
      .channel(`character-${char.id}`)
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "characters",
        filter: `id=eq.${char.id}`,
      }, ({ new: updated }) => {
        setChar(prev => ({ ...prev, ...updated }));
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [char?.id]);

  // Canale TV per broadcast dadi - creato una volta sola
  useEffect(() => {
    if (!campaign?.id) return;

    let tvChannel = null;

    const setupTVChannel = async () => {
      try {
        const { data: session } = await supabase
          .from("sessions")
          .select("id")
          .eq("campaign_id", campaign.id)
          .eq("is_active", true)
          .maybeSingle();

        if (session) {
          // Crea il canale con configurazione broadcast
          tvChannel = supabase.channel(`session-tv-${session.id}`, {
            config: {
              broadcast: { self: true },
            },
          })
            .on("broadcast", { event: "dice_roll_result" }, async ({ payload }) => {
              console.log("📺➡️📱 Ricevuto dice_roll_result dalla TV:", payload);
              console.log("📱 Payload total:", payload.total, "rolls:", payload.rolls);
              console.log("⏰ Timestamp richiesta:", payload.timestamp);
              console.log("⏰ Ora attuale:", Date.now());
              console.log("⏰ Ritardo:", Date.now() - payload.timestamp, "ms");

              // DEBUG: Controlla flag iniziativa
              console.log("🔍 DEBUG isInitiative:", payload.isInitiative, "char.id:", char?.id);
              console.log("🔍 DEBUG condizione:", payload.isInitiative && char?.id);

              // Se è un tiro di iniziativa DEL PLAYER (non mostro!), invia il risultato al DM
              if (payload.isInitiative && !payload.isMonster && char?.id) {
                console.log("⚔️ Tiro iniziativa completato! Invio risultato al DM...");

                // Invia il risultato dell'iniziativa al DM
                await window.__tvChannel.send({
                  type: "broadcast",
                  event: "initiative_rolled_player",
                  payload: {
                    characterId: char.id,
                    characterName: char.name,
                    roll: payload.total, // Totale già include modificatore DEX
                    hp: char.hp_current,
                    hp_max: char.hp_max,
                    tokenColor: char.token_color,
                  },
                });

                // Chiudi la richiesta di iniziativa
                setInitiativeRequest(null);
                setRollingInitiative(false);

                console.log(`✅ Iniziativa di ${char.name}: ${payload.total}`);

                // 🎯 AUTO-HIDE: Nascondi il risultato dopo 4 secondi
                setTimeout(() => {
                  setShowDiceResult(false);
                  setDiceResult(null);
                }, 4000);
              }

              // Se è un tiro di attacco, prepara il tiro danno
              if (payload.isAttack && char?.id) {
                console.log("⚔️ Tiro attacco completato! Risultato:", payload.total);

                // Salva l'attacco in pending per poter tirare il danno - INCLUDE TARGET E HIT!
                setPendingDamageRoll({
                  weapon: {
                    name: payload.weaponName,
                    damage: payload.weaponDamage,
                    damage_type: payload.weaponDamageType,
                  },
                  attackRoll: payload.total,
                  abilityMod: payload.abilityMod,
                  damageBonus: payload.damageBonus,
                  timestamp: Date.now(),
                  target: payload.target, // 🎯 Salva il bersaglio
                  hit: payload.hit, // Se ha colpito o no
                });

                console.log(`✅ Attacco: ${payload.total} - Player può ora tirare il danno!`);
              }

              // Mostra SEMPRE il risultato (il giocatore vede solo i suoi lanci)
              console.log("📱 Sto per mostrare il risultato sul telefono...");
              setDiceResult(payload);
              setShowDiceResult(true);
              if (window.navigator?.vibrate) window.navigator.vibrate([50, 30, 50]);
            })
            .on("broadcast", { event: "initiative_request" }, ({ payload }) => {
              console.log("⚔️ Player riceve richiesta di iniziativa!", payload);
              setInitiativeRequest(payload);
              if (window.navigator?.vibrate) window.navigator.vibrate([100, 50, 100]);
            })
            .on("broadcast", { event: "combat_started" }, ({ payload }) => {
              console.log("⚔️ Player: Combattimento iniziato!", payload);
              setIsCombat(true);
              if (window.navigator?.vibrate) window.navigator.vibrate([200, 100, 200]);
            })
            .on("broadcast", { event: "combat_ended" }, ({ payload }) => {
              console.log("✅ Player: Combattimento terminato!", payload);
              setIsCombat(false);
              setAvailableTargets([]);
              setSelectedTarget(null);
            })
            .on("broadcast", { event: "combat_update" }, ({ payload }) => {
              console.log("🎯 Player: Aggiornamento combattimento (mostri disponibili):", payload);
              if (payload.monsters) {
                setAvailableTargets(payload.monsters);
              }
            })
            .on("broadcast", { event: "hp_updated" }, ({ payload }) => {
              console.log("❤️ Player: HP aggiornati dal DM!", payload);
              // Aggiorna HP solo se è il personaggio corrente
              if (payload.characterId === char?.id) {
                setChar(prev => ({
                  ...prev,
                  hp_current: payload.hp_current,
                  hp_max: payload.hp_max,
                }));
                console.log(`✅ HP di ${payload.characterName}: ${payload.hp_current}/${payload.hp_max}`);
                if (window.navigator?.vibrate) {
                  // Vibrazione diversa per danno vs healing
                  if (payload.damage) {
                    window.navigator.vibrate([100, 50, 100]); // Danno
                  } else if (payload.healing) {
                    window.navigator.vibrate([50, 30, 50, 30, 50]); // Guarigione
                  }
                }
              }
            })
            .on("broadcast", { event: "status_effects_updated" }, ({ payload }) => {
              console.log("📺 Player: Status effects aggiornati dal DM!", payload);
              // Aggiorna condizioni solo se è il personaggio corrente
              if (payload.characterId === char?.id) {
                setChar(prev => ({
                  ...prev,
                  conditions: payload.conditions,
                }));
                console.log(`✅ Condizioni di ${payload.characterName}:`, payload.conditions);
              }
            })
            .on("broadcast", { event: "saving_throw_requested" }, ({ payload }) => {
              console.log("🎲 Player: Tiro salvezza richiesto dal DM!", payload);
              // Mostra richiesta solo se è il personaggio corrente
              if (payload.characterId === char?.id) {
                setSavingThrowRequest(payload);
                if (window.navigator?.vibrate) window.navigator.vibrate([150, 100, 150]);
                console.log(`✅ Richiesta TS: ${payload.ability} DC ${payload.dc}`);
              }
            })
            .on("broadcast", { event: "skill_check_requested" }, ({ payload }) => {
              console.log("🎲 Player: Prova abilità richiesta dal DM!", payload);
              // Mostra richiesta solo se è il personaggio corrente
              if (payload.characterId === char?.id) {
                setSkillCheckRequest(payload);
                if (window.navigator?.vibrate) window.navigator.vibrate([150, 100, 150]);
                console.log(`✅ Richiesta Skill Check: ${payload.skill} DC ${payload.dc}`);
              }
            });

          const status = await tvChannel.subscribe();
          console.log("✅ Canale TV connesso:", `session-tv-${session.id}`, status);

          // Salva il canale nel component per riutilizzarlo
          window.__tvChannel = tvChannel;
          window.__sessionId = session.id;
        }
      } catch (e) {
        console.warn("Errore setup canale TV:", e);
      }
    };

    setupTVChannel();

    return () => {
      if (tvChannel) {
        supabase.removeChannel(tvChannel);
        window.__tvChannel = null;
        window.__sessionId = null;
      }
    };
  }, [campaign?.id]);

  const saveField = useCallback(async (updates) => {
    if (!char?.id) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("characters")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", char.id);
      if (!error) setChar(prev => ({ ...prev, ...updates }));
    } catch (e) {
      console.error("Errore salvataggio:", e);
    } finally {
      setTimeout(() => setSaving(false), 500);
    }
  }, [char?.id]);

  // Modifica HP
  const applyHPChange = async (delta) => {
    const newHP = Math.max(0, Math.min(char.hp_max + (char.hp_temp || 0), char.hp_current + delta));
    await saveField({ hp_current: newHP });
    if (newHP === 0) {
      if (window.navigator?.vibrate) window.navigator.vibrate([100, 50, 100]);
    }
  };

  const applyHPDelta = async () => {
    const val = parseInt(hpDelta);
    if (isNaN(val)) return;
    await applyHPChange(val);
    setHpDelta("");
    setEditingHP(false);
  };

  // Toggle death save
  const toggleDeathSave = async (type, index) => {
    const key = type === "success" ? "death_saves_success" : "death_saves_fail";
    const current = char[key] || 0;
    const newVal = current > index ? index : index + 1;
    await saveField({ [key]: Math.min(3, newVal) });

    // Controllo vita/morte
    if (type === "fail" && Math.min(3, newVal) >= 3) {
      if (window.navigator?.vibrate) window.navigator.vibrate([200, 100, 200, 100, 300]);
    }
  };

  // Usa spell slot
  const useSpellSlot = async (level) => {
    const used = char.spell_slots_used || {};
    const total = char.spell_slots || {};
    const currentUsed = parseInt(used[String(level)] || 0);
    const max = parseInt(total[String(level)] || 0);
    if (currentUsed >= max) return;
    const newUsed = { ...used, [String(level)]: currentUsed + 1 };
    await saveField({ spell_slots_used: newUsed });
  };

  const restoreSpellSlot = async (level) => {
    const used = char.spell_slots_used || {};
    const currentUsed = parseInt(used[String(level)] || 0);
    if (currentUsed <= 0) return;
    const newUsed = { ...used, [String(level)]: currentUsed - 1 };
    await saveField({ spell_slots_used: newUsed });
  };

  // Riposo lungo — ripristina tutto
  const longRest = async () => {
    const resetSlots = {};
    Object.keys(char.spell_slots || {}).forEach(k => { resetSlots[k] = 0; });
    await saveField({
      hp_current: char.hp_max,
      hp_temp: 0,
      spell_slots_used: resetSlots,
      hit_dice_used: 0,
      death_saves_success: 0,
      death_saves_fail: 0,
      is_stable: true,
    });
    if (window.navigator?.vibrate) window.navigator.vibrate([30, 20, 60]);
  };

  // Riposo breve — tira dadi vita
  const shortRest = async () => {
    if (char.hit_dice_used >= char.hit_dice_total) return;
    const die = cls?.hitDie || 8;
    const roll = Math.floor(Math.random() * die) + 1;
    const cosMod = getMod(char.constitution || 10);
    const healed = Math.max(1, roll + cosMod);
    const newHP = Math.min(char.hp_max, char.hp_current + healed);
    await saveField({
      hp_current: newHP,
      hit_dice_used: (char.hit_dice_used || 0) + 1,
    });
    setHitDieResult({ roll, cosMod, healed, die });
    setShowShortRest(false);
    if (window.navigator?.vibrate) window.navigator.vibrate([20, 10, 40]);
  };

  // Lancio dado - NUOVO FLUSSO: manda REQUEST alla TV
  const handleDiceRoll = async (rollData) => {
    // NON mostrare ancora il risultato - aspetta la TV
    console.log("📱 Richiesta lancio dado:", rollData);
    console.log("📱 rollData.dice:", rollData.dice, "tipo:", typeof rollData.dice);

    // Invia RICHIESTA al canale TV (senza risultato calcolato)
    if (window.__tvChannel && char?.id) {
      try {
        console.log("🔍 DEBUG char.dice_theme:", char.dice_theme);
        console.log("🔍 DEBUG char completo:", char);

        const requestPayload = {
          characterId: char.id,
          characterName: char.name,
          tokenColor: char.token_color,
          playerName: char.player_name || char.name,
          dice: rollData.dice,
          modifier: rollData.modifier || 0,
          label: rollData.label || "",
          diceTheme: char.dice_theme || "default",  // ✨ TEMA PERSONALIZZATO
          timestamp: Date.now(),
        };

        console.log("📱➡️📺 Invio dice_roll_request:", requestPayload);
        console.log("📱 payload.dice che invio:", requestPayload.dice);
        console.log("🎨🎨🎨 TEMA DADI CHE INVIO:", requestPayload.diceTheme);

        await window.__tvChannel.send({
          type: "broadcast",
          event: "dice_roll_request",
          payload: requestPayload,
        });
      } catch (e) {
        console.error("❌ Errore invio richiesta dado a TV:", e);
      }
    } else {
      console.warn("⚠️ Canale TV non disponibile");
    }
  };

  // ═══════════════════════════════════════════════
  // ROLL FOR INITIATIVE - Giocatore tira d20 + DEX CON DADI 3D
  // ═══════════════════════════════════════════════
  const rollInitiative = async () => {
    setRollingInitiative(true);

    // Calcola modificatore Destrezza
    const dexMod = getMod(char.dexterity || 10);

    console.log(`🎲 ${char.name} richiede tiro iniziativa: d20 + DEX(${dexMod})`);

    // Usa il sistema di dadi 3D esistente
    // Manda richiesta alla TV per tirare d20
    if (window.__tvChannel && char?.id) {
      try {
        const requestPayload = {
          characterId: char.id,
          characterName: char.name,
          tokenColor: char.token_color,
          playerName: char.player_name || char.name,
          dice: ["d20"], // Solo d20, aggiungeremo DEX dopo
          modifier: dexMod, // Modificatore verrà aggiunto dalla TV
          label: "Initiative",
          diceTheme: char.dice_theme || "default",
          timestamp: Date.now(),
          isInitiative: true, // Flag per sapere che è un tiro di iniziativa
        };

        console.log("📱➡️📺 Invio richiesta tiro iniziativa con dadi 3D");

        // Invia richiesta alla TV
        await window.__tvChannel.send({
          type: "broadcast",
          event: "dice_roll_request",
          payload: requestPayload,
        });

        // Il risultato arriverà tramite il listener "dice_roll_result"
        // e verrà gestito lì per inviare l'iniziativa al DM
      } catch (e) {
        console.error("❌ Errore invio richiesta iniziativa:", e);
        setRollingInitiative(false);
      }
    } else {
      console.warn("⚠️ Canale TV non disponibile");
      setRollingInitiative(false);
    }
  };

  // ═══════════════════════════════════════════════
  // DANNO - Tira i dadi danno dopo un attacco
  // ═══════════════════════════════════════════════
  const rollDamage = async () => {
    if (!window.__tvChannel || !char?.id || !pendingDamageRoll) {
      console.warn("⚠️ Nessun attacco in pending o canale TV non disponibile");
      return;
    }

    const { weapon, damageBonus, target, hit } = pendingDamageRoll;

    // Se l'attacco ha mancato, non tirare danno!
    if (hit === false) {
      console.log(`❌ ${char.name} ha mancato ${target?.name || 'il bersaglio'}! Nessun danno.`);
      setPendingDamageRoll(null);
      return;
    }

    console.log(`💥 ${char.name} tira danno con ${weapon.name}${target ? ` contro ${target.name}` : ''}!`);

    try {
      // Parsa i dadi danno (es. "1d8" → ["d8"], "2d6" → ["d6", "d6"])
      const match = weapon.damage.match(/(\d+)d(\d+)/);
      if (!match) {
        console.error("❌ Formato danno non valido:", weapon.damage);
        return;
      }

      const count = parseInt(match[1]);
      const dieType = `d${match[2]}`;
      const dice = Array(count).fill(dieType);

      const requestPayload = {
        characterId: char.id,
        characterName: char.name,
        tokenColor: char.token_color,
        playerName: char.player_name || char.name,
        dice: dice,
        modifier: damageBonus,
        label: `Danno - ${weapon.name}`,
        diceTheme: char.dice_theme || "default",
        timestamp: Date.now(),
        isDamage: true, // Flag per danno
        // Dati per la narrazione educativa
        weaponName: weapon.name,
        weaponDamage: weapon.damage,
        weaponDamageType: weapon.damage_type,
        damageBonus: damageBonus,
        // 🎯 Dati targeting per applicazione automatica danno
        target: target,
      };

      console.log("📱➡️📺 Invio richiesta danno con dadi 3D");

      // Invia richiesta alla TV
      await window.__tvChannel.send({
        type: "broadcast",
        event: "dice_roll_request",
        payload: requestPayload,
      });

      // Pulisci il pending dopo aver inviato
      setPendingDamageRoll(null);
    } catch (e) {
      console.error("❌ Errore invio richiesta danno:", e);
    }
  };

  // ═══════════════════════════════════════════════
  // SAVING THROW - Tiro salvezza richiesto dal DM
  // ═══════════════════════════════════════════════
  const rollSavingThrow = async () => {
    if (!window.__tvChannel || !char?.id || !savingThrowRequest) {
      console.warn("⚠️ Nessuna richiesta di tiro salvezza o canale TV non disponibile");
      return;
    }

    const { ability, abilityId, dc, description, bonus } = savingThrowRequest;

    console.log(`🎲 ${char.name} tira salvezza su ${ability}: d20 + ${bonus} vs DC ${dc}`);

    try {
      const requestPayload = {
        characterId: char.id,
        characterName: char.name,
        tokenColor: char.token_color,
        playerName: char.player_name || char.name,
        dice: ["d20"],
        modifier: bonus,
        label: `TS ${ability}`,
        diceTheme: char.dice_theme || "default",
        timestamp: Date.now(),
        isSavingThrow: true, // Flag per tiro salvezza
        // Dati per valutazione
        savingThrowData: {
          ability: ability,
          abilityId: abilityId,
          dc: dc,
          description: description,
          bonus: bonus,
        },
      };

      console.log("📱➡️📺 Invio richiesta tiro salvezza con dadi 3D");

      // Invia richiesta alla TV
      await window.__tvChannel.send({
        type: "broadcast",
        event: "dice_roll_request",
        payload: requestPayload,
      });

      // Pulisci la richiesta dopo aver inviato
      setSavingThrowRequest(null);
    } catch (e) {
      console.error("❌ Errore invio richiesta tiro salvezza:", e);
    }
  };

  // ═══════════════════════════════════════════════
  // SKILL CHECK - Prova abilità richiesta dal DM
  // ═══════════════════════════════════════════════
  const rollSkillCheck = async () => {
    if (!window.__tvChannel || !char?.id || !skillCheckRequest) {
      console.warn("⚠️ Nessuna richiesta di prova abilità o canale TV non disponibile");
      return;
    }

    const { skill, skillId, ability, dc, description, bonus } = skillCheckRequest;

    console.log(`🎲 ${char.name} tira ${skill} (${ability}): d20 + ${bonus} vs DC ${dc}`);

    try {
      const requestPayload = {
        characterId: char.id,
        characterName: char.name,
        tokenColor: char.token_color,
        playerName: char.player_name || char.name,
        dice: ["d20"],
        modifier: bonus,
        label: `${skill}`,
        diceTheme: char.dice_theme || "default",
        timestamp: Date.now(),
        isSkillCheck: true, // Flag per skill check
        // Dati per valutazione
        skillCheckData: {
          skill: skill,
          skillId: skillId,
          ability: ability,
          dc: dc,
          description: description,
          bonus: bonus,
        },
      };

      console.log("📱➡️📺 Invio richiesta prova abilità con dadi 3D");

      // Invia richiesta alla TV
      await window.__tvChannel.send({
        type: "broadcast",
        event: "dice_roll_request",
        payload: requestPayload,
      });

      // Pulisci la richiesta dopo aver inviato
      setSkillCheckRequest(null);
    } catch (e) {
      console.error("❌ Errore invio richiesta prova abilità:", e);
    }
  };

  // ═══════════════════════════════════════════════
  // ATTACCO CON ARMA - Con narrazione educativa sulla TV
  // ═══════════════════════════════════════════════
  const attackWithWeapon = async (weapon, isOffhand = false) => {
    if (!window.__tvChannel || !char?.id) {
      console.warn("⚠️ Canale TV non disponibile");
      return;
    }

    // Se siamo in combattimento e non c'è un bersaglio selezionato, avvisa
    if (isCombat && availableTargets.length > 0 && !selectedTarget) {
      console.warn("⚠️ Seleziona un bersaglio prima di attaccare!");
      return;
    }

    // Calcola bonus attacco
    const isFine = weapon.properties?.includes("finesse");
    const str = getMod(char.strength || 10);
    const dex = getMod(char.dexterity || 10);
    const atkBonus = isFine ? Math.max(str, dex) : str;
    const totalBonus = atkBonus + profBonus;

    // Determina quale caratteristica si usa
    const abilityUsed = (isFine && dex > str) ? "Destrezza" : "Forza";
    const abilityMod = (isFine && dex > str) ? dex : str;

    console.log(`⚔️ ${char.name} attacca${selectedTarget ? ` ${selectedTarget.name}` : ''} con ${weapon.name}!`);

    try {
      const requestPayload = {
        characterId: char.id,
        characterName: char.name,
        tokenColor: char.token_color,
        playerName: char.player_name || char.name,
        dice: ["d20"],
        modifier: totalBonus,
        label: `Attacco - ${weapon.name}`,
        diceTheme: char.dice_theme || "default",
        timestamp: Date.now(),
        isAttack: true, // Flag per attacco
        // Dati per la narrazione educativa
        weaponName: weapon.name,
        weaponDamage: weapon.damage,
        weaponDamageType: weapon.damage_type,
        abilityUsed: abilityUsed,
        abilityMod: abilityMod,
        profBonus: profBonus,
        damageBonus: abilityMod,
        // 🎯 DATI TARGETING
        target: selectedTarget, // { id, name, ac, hp_current, hp_max }
      };

      console.log("📱➡️📺 Invio richiesta attacco con dadi 3D");

      // Invia richiesta alla TV
      await window.__tvChannel.send({
        type: "broadcast",
        event: "dice_roll_request",
        payload: requestPayload,
      });
    } catch (e) {
      console.error("❌ Errore invio richiesta attacco:", e);
    }
  };

  // Funzione Level Up
  const performLevelUp = (newLevel) => {
    const hitDie = cls?.hit_die || 8;
    const conMod = getMod(char.constitution || 10);

    // Tira dado vita per HP
    const hpRoll = Math.floor(Math.random() * hitDie) + 1;
    const hpGain = Math.max(1, hpRoll + conMod);
    const newHPMax = (char.hp_max || 0) + hpGain;

    // Aggiorna spell slots se caster
    let newSpellSlots = { ...char.spell_slots };
    if (cls?.spellcasting && cls.spell_slots_by_level) {
      newSpellSlots = cls.spell_slots_by_level[newLevel - 1] || {};
    }

    // Proficiency bonus
    const newProfBonus = PROFICIENCY_BONUS[newLevel - 1] || 2;

    saveField({
      level: newLevel,
      hp_max: newHPMax,
      hp_current: char.hp_current + hpGain,
      hit_dice_total: newLevel,
      proficiency_bonus: newProfBonus,
      spell_slots: newSpellSlots,
    });

    // Success modal
    setModal({
      isOpen: true,
      type: "success",
      title: `LIVELLO ${newLevel}!`,
      message: `Congratulazioni!\n\n+${hpGain} HP (${hpRoll} dado + ${conMod} COS)\nHP Max: ${newHPMax}\nProficiency Bonus: +${newProfBonus}`,
      confirmText: "Fantastico!",
    });
  };

  if (!char) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
      <div style={{ color: "var(--gold)", fontFamily: "var(--font-heading)" }}>Caricamento...</div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", paddingBottom: 80 }}>
      <div className="bg-image bg-lobby" />
      <div className="bg-overlay-heavy" />
      <MusicPlayer track="lobby" />

      {/* Modals */}
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

      <InputModal
        isOpen={inputModal.isOpen}
        onClose={() => setInputModal({ ...inputModal, isOpen: false })}
        title={inputModal.title}
        label={inputModal.label}
        defaultValue={inputModal.defaultValue}
        type={inputModal.type}
        placeholder={inputModal.placeholder}
        onConfirm={inputModal.onConfirm}
      />

      <WeaponModal
        isOpen={weaponModal.isOpen}
        isOffhand={weaponModal.isOffhand}
        campaignId={campaign?.id}
        onClose={() => setWeaponModal({ ...weaponModal, isOpen: false })}
        onConfirm={weaponModal.onConfirm}
      />

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
          <button
            onClick={onBack}
            style={{ background: "none", border: "none", color: "rgba(212,175,55,0.6)", cursor: "pointer", fontSize: "1.1rem", padding: "4px 8px" }}
          >
            ←
          </button>

          {/* Avatar/Token piccolo */}
          <div style={{
            width: 44,
            height: 44,
            borderRadius: "50%",
            background: char.avatar_url ? "transparent" : `radial-gradient(circle, ${char.token_color}40, rgba(10,8,6,0.9))`,
            border: `2px solid ${char.token_color}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "1.2rem",
            flexShrink: 0,
            overflow: "hidden",
            position: "relative",
          }}>
            {char.avatar_url ? (
              <img
                src={char.avatar_url}
                alt={char.name}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  display: "block"
                }}
                onError={(e) => {
                  // Fallback alla lettera se l'immagine non carica
                  e.target.style.display = "none";
                  e.target.parentElement.style.background = `radial-gradient(circle, ${char.token_color}40, rgba(10,8,6,0.9))`;
                  e.target.parentElement.innerHTML = `<span style="font-family: var(--font-heading); font-weight: 700; color: ${char.token_color}">${char.name?.[0] || "?"}</span>`;
                }}
              />
            ) : (
              <span style={{ fontFamily: "var(--font-heading)", fontWeight: "700", color: char.token_color }}>
                {char.name?.[0] || "?"}
              </span>
            )}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontFamily: "var(--font-heading)",
              color: char.token_color,
              fontSize: "1rem",
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>
              {char.name}
            </div>
            <div style={{ fontSize: "0.7rem", color: "var(--parchment-dark)" }}>
              Lv.{level} {cls?.name} · {race?.name}
            </div>
          </div>

          {/* Indicatore salvataggio */}
          <AnimatePresence>
            {saving && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{ fontSize: "0.65rem", color: "var(--gold)", fontFamily: "var(--font-heading)" }}
              >
                💾
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* HP Bar compatta nell'header */}
        <div style={{ marginTop: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.7rem", color: "var(--parchment-dark)", marginBottom: 3 }}>
            <span>HP {char.hp_current}/{char.hp_max}</span>
            {char.hp_temp > 0 && <span style={{ color: "#60c060" }}>+{char.hp_temp} temp</span>}
          </div>
          <div className="hp-bar-container">
            <motion.div
              className={`hp-bar-fill ${hpClass}`}
              style={{ width: `${hpPct}%` }}
              animate={{ width: `${hpPct}%` }}
              transition={{ duration: 0.4 }}
            />
          </div>
        </div>

        {/* Status Effects / Condizioni */}
        {char.conditions && char.conditions.length > 0 && (
          <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
            {char.conditions.map(condId => {
              const effect = STATUS_EFFECTS.find(e => e.id === condId);
              if (!effect) return null;
              return (
                <motion.div
                  key={condId}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "4px 8px",
                    borderRadius: 6,
                    background: `${effect.color}30`,
                    border: `1px solid ${effect.color}`,
                    fontSize: "0.7rem",
                    fontFamily: "var(--font-heading)",
                    color: effect.color,
                    fontWeight: 600,
                    boxShadow: `0 0 8px ${effect.color}40`,
                  }}
                >
                  <span style={{ fontWeight: "700", fontSize: "0.8rem" }}>{effect.symbol}</span>
                  <span style={{ letterSpacing: "0.02em" }}>{effect.label}</span>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* TABS */}
      <div style={{
        display: "flex",
        background: "rgba(10,8,6,0.9)",
        borderBottom: "1px solid rgba(212,175,55,0.15)",
        overflowX: "auto",
        scrollbarWidth: "none",
        position: "sticky",
        top: "104px",
        zIndex: 99,
      }}>
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              flex: "1 0 auto",
              padding: "10px 12px",
              background: "transparent",
              border: "none",
              borderBottom: tab === t.id ? "2px solid var(--gold)" : "2px solid transparent",
              color: tab === t.id ? "var(--gold)" : "rgba(212,175,55,0.4)",
              fontFamily: "var(--font-body)",
              fontSize: "0.8rem",
              cursor: "pointer",
              transition: "all 0.2s",
              whiteSpace: "nowrap",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 4,
            }}
          >
            <DnDIcon icon={t.icon} size={20} />
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* Contenuto tab */}
      <div style={{ flex: 1, padding: "16px", overflowY: "auto" }}>
        <AnimatePresence mode="wait">
          {/* ── TAB MAIN ── */}
          {tab === "main" && (
            <motion.div
              key="main"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              style={{ display: "flex", flexDirection: "column", gap: 16 }}
            >
              {/* HP Controls */}
              <div className="glass-card" style={{ padding: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <span style={{ fontFamily: "var(--font-heading)", fontSize: "0.7rem", color: "var(--gold)", letterSpacing: "0.15em" }}>PUNTI FERITA</span>
                  {char.hp_current === 0 && (
                    <span style={{ fontSize: "0.7rem", color: "var(--crimson-light)", fontFamily: "var(--font-heading)" }}>⚠ TIRI SALVEZZA MORTE</span>
                  )}
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <button
                    onClick={() => applyHPChange(-1)}
                    style={{
                      width: 44, height: 44,
                      background: "rgba(192,64,64,0.3)",
                      border: "1px solid rgba(192,64,64,0.5)",
                      borderRadius: 8, color: "#c04040",
                      fontSize: "1.4rem", cursor: "pointer",
                    }}
                  >−</button>

                  <div
                    style={{
                      flex: 1, textAlign: "center",
                      fontFamily: "var(--font-heading)",
                      cursor: "pointer",
                    }}
                    onClick={() => setEditingHP(true)}
                  >
                    <span style={{
                      fontSize: "2.5rem", fontWeight: "900",
                      color: hpPct > 50 ? "#40c040" : hpPct > 25 ? "#c0b020" : "#c04040",
                      textShadow: `0 0 15px ${hpPct > 50 ? "#40c040" : hpPct > 25 ? "#c0b020" : "#c04040"}60`,
                    }}>
                      {char.hp_current}
                    </span>
                    <span style={{ color: "var(--parchment-dark)", fontSize: "1rem" }}>/{char.hp_max}</span>
                  </div>

                  <button
                    onClick={() => applyHPChange(1)}
                    style={{
                      width: 44, height: 44,
                      background: "rgba(64,192,64,0.3)",
                      border: "1px solid rgba(64,192,64,0.5)",
                      borderRadius: 8, color: "#40c040",
                      fontSize: "1.4rem", cursor: "pointer",
                    }}
                  >+</button>
                </div>

                {/* Input danno/cura diretto */}
                <AnimatePresence>
                  {editingHP && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      style={{ marginTop: 10, display: "flex", gap: 8 }}
                    >
                      <input
                        type="number"
                        placeholder="±HP (es: -5 danno, +8 cura)"
                        value={hpDelta}
                        onChange={e => setHpDelta(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && applyHPDelta()}
                        autoFocus
                        style={{ textAlign: "center" }}
                      />
                      <button className="btn btn-gold" onClick={applyHPDelta} style={{ padding: "10px 16px" }}>OK</button>
                      <button className="btn btn-ghost" onClick={() => { setEditingHP(false); setHpDelta(""); }} style={{ padding: "10px 12px" }}>✕</button>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Tiri salvezza morte */}
                {char.hp_current === 0 && (
                  <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid rgba(192,64,64,0.3)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                        <span style={{ fontSize: "0.7rem", color: "#40c040", fontFamily: "var(--font-heading)" }}>Successi</span>
                        {[0,1,2].map(i => (
                          <div
                            key={i}
                            className={`death-save success ${i < (char.death_saves_success || 0) ? "filled" : ""}`}
                            onClick={() => toggleDeathSave("success", i)}
                          />
                        ))}
                      </div>
                      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                        <span style={{ fontSize: "0.7rem", color: "#c04040", fontFamily: "var(--font-heading)" }}>Fallimenti</span>
                        {[0,1,2].map(i => (
                          <div
                            key={i}
                            className={`death-save fail ${i < (char.death_saves_fail || 0) ? "filled" : ""}`}
                            onClick={() => toggleDeathSave("fail", i)}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Stats rapide */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
                {[
                  {
                    label: "CA",
                    value: calculateAC(char),
                    help: "Classe Armatura: indica quanto è difficile colpirti in combattimento. Più alta è, meglio è!",
                    example: "Esempio: Se hai CA 15 e un nemico tira 1d20 e ottiene 14, non ti colpisce. Se ottiene 15 o più, ti colpisce!"
                  },
                  {
                    label: "INIT",
                    value: modStr(char.dexterity),
                    help: "Iniziativa: determina l'ordine dei turni in combattimento. Si calcola tirando 1d20 + questo bonus.",
                    example: `Esempio: Tiri 1d20 + ${modStr(char.dexterity)} = risultato. Chi ha il risultato più alto agisce per primo!`
                  },
                  {
                    label: "VEL",
                    value: `${char.speed || 30}ft`,
                    help: "Velocità: quanti piedi (ft) puoi muoverti in 1 turno. 30ft è la velocità standard umana.",
                    example: "Esempio: In un turno puoi muoverti fino a 30ft (circa 9 metri) e fare un'azione."
                  },
                  {
                    label: "PROF",
                    value: `+${profBonus}`,
                    help: `Bonus Competenza: si aggiunge a tutti i tiri in cui sei competente. Al livello ${level} è +${profBonus}.`,
                    example: `Esempio: Se sei competente in Percezione, tiri 1d20 + SAG + ${profBonus} invece di solo 1d20 + SAG.`
                  },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <div
                      className="stat-box-dnd"
                      onClick={() => setSelectedHelp(selectedHelp === label ? null : label)}
                      style={{
                        cursor: "pointer",
                        transition: "all 0.2s",
                        filter: selectedHelp === label ? "brightness(1.3)" : "brightness(1)"
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.transform = "translateY(-2px)"}
                      onMouseLeave={(e) => e.currentTarget.style.transform = "translateY(0)"}
                    >
                      <div className="stat-value">{value}</div>
                      <div className="stat-label">{label}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Statistiche 6 */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                {ABILITIES.map(({ key, label, full }) => {
                  const score = char[key] || 10;
                  const modifier = getMod(score);

                  return (
                    <div key={key}>
                      <div
                        className="ability-box"
                        onClick={() => setSelectedHelp(selectedHelp === key ? null : key)}
                        style={{
                          cursor: "pointer",
                          transition: "all 0.2s",
                          filter: selectedHelp === key ? "brightness(1.3)" : "brightness(1)"
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.transform = "translateY(-2px)"}
                        onMouseLeave={(e) => e.currentTarget.style.transform = "translateY(0)"}
                      >
                        <div className="ability-name">{full}</div>
                        <div className="ability-score">{score}</div>
                        <div className="ability-mod" style={{ color: modifier >= 0 ? "var(--gold)" : "var(--crimson-light)" }}>
                          {modifier >= 0 ? "+" : ""}{modifier}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Riposi */}
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  className="btn btn-ghost"
                  onClick={() => setShowShortRest(true)}
                  disabled={(char.hit_dice_used || 0) >= (char.hit_dice_total || 1)}
                  style={{
                    flex: 1, padding: "10px",
                    opacity: (char.hit_dice_used || 0) >= (char.hit_dice_total || 1) ? 0.4 : 1,
                  }}
                >
                  💤 Riposo Breve<br />
                  <span style={{ fontSize: "0.65rem", color: "rgba(212,175,55,0.5)" }}>
                    Dado vita: {(char.hit_dice_total || 1) - (char.hit_dice_used || 0)}/{char.hit_dice_total || 1}
                  </span>
                </button>
                <button
                  className="btn btn-gold"
                  onClick={longRest}
                  style={{ flex: 1, padding: "10px", fontSize: "0.85rem" }}
                >
                  🌙 Riposo Lungo<br />
                  <span style={{ fontSize: "0.65rem" }}>Ripristina tutto</span>
                </button>
              </div>

              {/* Risultato dado vita */}
              <AnimatePresence>
                {hitDieResult && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="glass-card"
                    style={{ padding: 12, textAlign: "center" }}
                  >
                    <div style={{ color: "#40c040", fontFamily: "var(--font-heading)", fontSize: "1rem" }}>
                      +{hitDieResult.healed} HP recuperati
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "var(--parchment-dark)" }}>
                      d{hitDieResult.die}: {hitDieResult.roll} + COS({hitDieResult.cosMod >= 0 ? "+" : ""}{hitDieResult.cosMod})
                    </div>
                    <button onClick={() => setHitDieResult(null)} style={{ background: "none", border: "none", color: "rgba(212,175,55,0.4)", cursor: "pointer", marginTop: 6, fontSize: "0.8rem" }}>✕ chiudi</button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Ispirazione */}
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <button
                  onClick={() => saveField({ inspiration: !char.inspiration })}
                  style={{
                    display: "flex", alignItems: "center", gap: 8,
                    background: char.inspiration ? "rgba(212,175,55,0.15)" : "rgba(0,0,0,0.4)",
                    border: `2px solid ${char.inspiration ? "var(--gold)" : "rgba(212,175,55,0.2)"}`,
                    borderRadius: 8, padding: "10px 16px",
                    cursor: "pointer", color: "var(--parchment)",
                    fontFamily: "var(--font-heading)", fontSize: "0.85rem",
                    transition: "all 0.2s",
                    boxShadow: char.inspiration ? "0 0 12px rgba(212,175,55,0.3)" : "none",
                  }}
                >
                  <DnDIcon icon="inspiration" size={20} color={char.inspiration ? "var(--gold)" : "rgba(212,175,55,0.5)"} />
                  {char.inspiration ? "ISPIRAZIONE (attiva)" : "Ispirazione"}
                </button>

                {/* Status Effects / Condizioni */}
                <div className="glass-card" style={{ padding: 14 }}>
                  <div style={{ fontFamily: "var(--font-heading)", fontSize: "0.7rem", color: "var(--gold)", letterSpacing: "0.15em", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
                    <DnDIcon icon="stunned" size={16} color="var(--gold)" />
                    CONDIZIONI
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {[
                      { id: "blinded", label: "Accecato", iconName: "blinded", color: "#666" },
                      { id: "charmed", label: "Affascinato", iconName: "charmed", color: "#ff69b4" },
                      { id: "deafened", label: "Assordato", iconName: "deafened", color: "#888" },
                      { id: "frightened", label: "Spaventato", iconName: "frightened", color: "#9370db" },
                      { id: "grappled", label: "Afferrato", iconName: "grappled", color: "#cd853f" },
                      { id: "incapacitated", label: "Incapacitato", iconName: "incapacitated", color: "#708090" },
                      { id: "invisible", label: "Invisibile", iconName: "invisible", color: "#add8e6" },
                      { id: "paralyzed", label: "Paralizzato", iconName: "paralyzed", color: "#4682b4" },
                      { id: "petrified", label: "Pietrificato", iconName: "petrified", color: "#696969" },
                      { id: "poisoned", label: "Avvelenato", iconName: "poisoned", color: "#9acd32" },
                      { id: "prone", label: "Prono", iconName: "prone", color: "#8b4513" },
                      { id: "restrained", label: "Trattenuto", iconName: "restrained", color: "#a9a9a9" },
                      { id: "stunned", label: "Stordito", iconName: "stunned", color: "#ffa500" },
                      { id: "unconscious", label: "Incosciente", iconName: "unconscious", color: "#dc143c" },
                    ].map(condition => {
                      const active = (char.conditions || []).includes(condition.id);
                      return (
                        <button
                          key={condition.id}
                          onClick={() => {
                            const current = char.conditions || [];
                            const newConditions = active
                              ? current.filter(c => c !== condition.id)
                              : [...current, condition.id];
                            saveField({ conditions: newConditions });
                          }}
                          style={{
                            padding: "6px 10px",
                            background: active ? `${condition.color}40` : "rgba(0,0,0,0.4)",
                            border: `2px solid ${active ? condition.color : "rgba(212,175,55,0.15)"}`,
                            borderRadius: 6,
                            color: "var(--parchment)",
                            fontSize: "0.7rem",
                            cursor: "pointer",
                            transition: "all 0.2s",
                            fontWeight: active ? "bold" : "normal",
                            boxShadow: active ? `0 0 8px ${condition.color}80` : "none",
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                          }}
                        >
                          <DnDIcon icon={condition.iconName} size={16} color={active ? condition.color : "rgba(212,175,55,0.5)"} />
                          <span>{condition.label}</span>
                        </button>
                      );
                    })}
                  </div>
                  {(char.conditions || []).length > 0 && (
                    <div style={{
                      marginTop: 10,
                      padding: "8px",
                      background: "rgba(220,20,60,0.2)",
                      border: "1px solid rgba(220,20,60,0.4)",
                      borderRadius: 6,
                      fontSize: "0.7rem",
                      color: "rgba(220,20,60,0.9)",
                      textAlign: "center",
                    }}>
                      ⚠️ {(char.conditions || []).length} condizione{(char.conditions || []).length > 1 ? 'i' : ''} attiv{(char.conditions || []).length > 1 ? 'e' : 'a'}
                    </div>
                  )}
                </div>

                {/* Level Up & XP */}
                <div className="glass-card" style={{ padding: 14 }}>
                  <div style={{ fontFamily: "var(--font-heading)", fontSize: "0.7rem", color: "var(--gold)", letterSpacing: "0.15em", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
                    <DnDIcon icon="crown" size={16} color="var(--gold)" />
                    LIVELLO & ESPERIENZA
                  </div>

                  {/* Livello corrente */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                    <div style={{ fontSize: "0.9rem", fontWeight: "bold" }}>
                      Livello {char.level || 1}
                    </div>
                    <div style={{ fontSize: "0.7rem", color: "rgba(212,175,55,0.6)" }}>
                      {char.xp || 0} / {(() => {
                        const XP_TABLE = [0, 300, 900, 2700, 6500, 14000, 23000, 34000, 48000, 64000, 85000, 100000, 120000, 140000, 165000, 195000, 225000, 265000, 305000, 355000];
                        return XP_TABLE[char.level || 1] || 999999;
                      })()} XP
                    </div>
                  </div>

                  {/* Barra XP */}
                  <div style={{
                    background: "rgba(0,0,0,0.5)",
                    borderRadius: 8,
                    height: 20,
                    overflow: "hidden",
                    border: "2px solid rgba(212,175,55,0.3)",
                    marginBottom: 10,
                  }}>
                    <div style={{
                      background: "linear-gradient(90deg, var(--gold-dark), var(--gold))",
                      height: "100%",
                      width: `${(() => {
                        const XP_TABLE = [0, 300, 900, 2700, 6500, 14000, 23000, 34000, 48000, 64000, 85000, 100000, 120000, 140000, 165000, 195000, 225000, 265000, 305000, 355000];
                        const currentLevel = char.level || 1;
                        if (currentLevel >= 20) return 100;
                        const xpNeeded = XP_TABLE[currentLevel] || 300;
                        const progress = ((char.xp || 0) / xpNeeded) * 100;
                        return Math.min(100, Math.max(0, progress));
                      })()}%`,
                      transition: "width 0.3s",
                    }} />
                  </div>

                  {/* Bottoni */}
                  <div style={{ display: "flex", gap: 6 }}>
                    <button
                      className="btn btn-ghost"
                      onClick={() => {
                        setInputModal({
                          isOpen: true,
                          title: "Aggiungi XP",
                          label: "Quanti XP vuoi aggiungere?",
                          defaultValue: "100",
                          type: "number",
                          placeholder: "100",
                          onConfirm: (value) => {
                            const xpToAdd = parseInt(value) || 0;
                            if (xpToAdd > 0) {
                              const newXP = (char.xp || 0) + xpToAdd;
                              saveField({ xp: newXP });
                            }
                          }
                        });
                      }}
                      style={{ flex: 1, padding: "8px", fontSize: "0.75rem" }}
                    >
                      + Aggiungi XP
                    </button>

                    {(() => {
                      const XP_TABLE = [0, 300, 900, 2700, 6500, 14000, 23000, 34000, 48000, 64000, 85000, 100000, 120000, 140000, 165000, 195000, 225000, 265000, 305000, 355000];
                      const currentLevel = char.level || 1;
                      const xpNeeded = XP_TABLE[currentLevel] || 300;
                      const canLevelUp = (char.xp || 0) >= xpNeeded && currentLevel < 20;

                      if (!canLevelUp) return null;

                      return (
                        <button
                          className="btn btn-gold"
                          onClick={() => {
                            const newLevel = currentLevel + 1;
                            setModal({
                              isOpen: true,
                              type: "confirm",
                              title: "Level Up!",
                              message: `Sei pronto a salire al livello ${newLevel}?\n\nTirerai un dado vita per gli HP e aggiornerai le tue statistiche.`,
                              confirmText: `Sali a Livello ${newLevel}!`,
                              cancelText: "Annulla",
                              onConfirm: () => {
                                performLevelUp(newLevel);
                              }
                            });
                          }}
                          style={{ flex: 1, padding: "8px", fontSize: "0.75rem", fontWeight: "bold" }}
                        >
                          <DnDIcon icon="arrow" size={12} /> LEVEL UP
                        </button>
                      );
                    })()}
                  </div>
                  </div>

                  {/* Helpers */}

                {/* Tema Dadi 3D */}
                <div className="glass-card" style={{ padding: 14 }}>
                  <div style={{ fontFamily: "var(--font-heading)", fontSize: "0.7rem", color: "var(--gold)", letterSpacing: "0.15em", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
                    <DnDIcon icon="dice" size={16} color="var(--gold)" />
                    TEMA DADI 3D
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                    {[
                      { id: "default", label: "Default", icon: "⚪", desc: "Classico" },
                      { id: "diceOfRolling", label: "Rolling", icon: "🎲", desc: "Vibrante" },
                      { id: "rock", label: "Rock", icon: "🪨", desc: "Pietra" },
                      { id: "rust", label: "Rust", icon: "🟤", desc: "Arrugginito" },
                      { id: "wooden", label: "Wooden", icon: "🪵", desc: "Legno" },
                      { id: "blueGreenMetal", label: "Metal", icon: "🔷", desc: "Metallico" },
                      { id: "smooth", label: "Smooth", icon: "✨", desc: "Liscio" },
                    ].map(theme => (
                      <button
                        key={theme.id}
                        onClick={() => saveField({ dice_theme: theme.id })}
                        style={{
                          padding: "12px 8px",
                          background: (char.dice_theme || "default") === theme.id ? "rgba(212,175,55,0.2)" : "rgba(0,0,0,0.4)",
                          border: `2px solid ${(char.dice_theme || "default") === theme.id ? "var(--gold)" : "rgba(212,175,55,0.15)"}`,
                          borderRadius: 8,
                          color: "var(--parchment)",
                          fontFamily: "var(--font-heading)",
                          fontSize: "0.7rem",
                          cursor: "pointer",
                          transition: "all 0.2s",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          gap: 4,
                          boxShadow: (char.dice_theme || "default") === theme.id ? "0 0 16px rgba(212,175,55,0.5)" : "none",
                        }}
                      >
                        <span style={{ fontSize: "1.8rem" }}>{theme.icon}</span>
                        <span style={{ fontSize: "0.65rem", letterSpacing: "0.05em", fontWeight: "bold" }}>{theme.label}</span>
                        <span style={{ fontSize: "0.55rem", color: "rgba(212,175,55,0.6)" }}>{theme.desc}</span>
                      </button>
                    ))}
                  </div>
                  <div style={{ fontSize: "0.65rem", color: "rgba(212,175,55,0.5)", marginTop: 8, textAlign: "center", fontStyle: "italic" }}>
                    I dadi 3D sulla TV avranno questo tema
                  </div>
                </div>

                {/* HELP BOX UNIVERSALE - Appare qui sotto per qualsiasi statistica cliccata */}
                <AnimatePresence>
                  {selectedHelp && (() => {
                    const HELP_DATA = {
                      "CA": {
                        title: "🛡️ Classe Armatura (CA)",
                        description: "La Classe Armatura è il numero che i nemici devono battere per colpirti.",
                        howItWorks: `Quando un nemico ti attacca:\n1. Tira 1d20 e aggiunge il suo bonus\n2. Se il totale è ≥ ${calculateAC(char)} → TI COLPISCE\n3. Se il totale è < ${calculateAC(char)} → MANCA`,
                        example: `Tu hai CA ${calculateAC(char)}. Un goblin ti attacca:\n\n→ Tira 1d20+4 = [10]+4 = 14\n→ 14 ≥ ${calculateAC(char)}? SÌ → COLPISCE! ✓\n\n→ Tira 1d20+4 = [5]+4 = 9\n→ 9 ≥ ${calculateAC(char)}? NO → MANCA! ✗`,
                        tip: "Armature migliori e scudi aumentano la CA. Più alta = più difficile da colpire!"
                      },
                      "INIT": {
                        title: "⚡ Iniziativa (INIT)",
                        description: "Determina chi agisce per primo in combattimento.",
                        howItWorks: `All'inizio del combattimento:\n1. Tutti tirano 1d20 + bonus Iniziativa (${modStr(char.dexterity)})\n2. Chi ottiene il numero più alto agisce per primo\n3. Si procede in ordine decrescente`,
                        example: `Inizia combattimento!\n\n→ Tu: 1d20${modStr(char.dexterity)} = [12]${modStr(char.dexterity)} = ${12 + getMod(char.dexterity)}\n→ Goblin: 1d20+2 = [8]+2 = 10\n\nRisultato: ${12 + getMod(char.dexterity)} > 10 → TU AGISCI PRIMA! ✓`,
                        tip: "Personaggi con alta Destrezza agiscono più velocemente. Agire per primi può fare la differenza!"
                      },
                      "VEL": {
                        title: "🏃 Velocità (VEL)",
                        description: `Quanti piedi (ft) puoi muoverti nel tuo turno. 1 quadretto = 5ft.`,
                        howItWorks: `In 1 turno puoi:\n• Muoverti fino a ${char.speed || 30}ft\n• Fare 1 azione (attaccare, lanciare incantesimo, ecc.)\n• Fare 1 azione bonus (se disponibile)`,
                        example: `Hai ${char.speed || 30}ft di movimento:\n\n→ Corri 20ft verso un nemico (rimangono ${(char.speed || 30) - 20}ft)\n→ Lo attacchi (azione)\n→ Ti ritiri 10ft indietro (usi i ${(char.speed || 30) - 20}ft rimasti)\n\nTotale: ${char.speed || 30}ft usati ✓`,
                        tip: "Usa Dash per muoverti il doppio! Terreno difficile dimezza la velocità."
                      },
                      "PROF": {
                        title: `🎯 Bonus Competenza (+${profBonus})`,
                        description: `Bonus che aggiungi quando sei COMPETENTE in qualcosa.`,
                        howItWorks: `Al livello ${level} hai +${profBonus}.\n\nLo aggiungi a:\n• Abilità in cui sei competente\n• Tiri salvezza competenti\n• Attacchi con armi competenti`,
                        example: `Tiro Percezione (sei competente):\n\n→ 1d20 = [15]\n→ + SAG (${modStr(getMod(char.wisdom || 10))}) = ${15 + getMod(char.wisdom || 10)}\n→ + PROF (+${profBonus}) = ${15 + getMod(char.wisdom || 10) + profBonus}\n\nTotale: ${15 + getMod(char.wisdom || 10) + profBonus} ✓`,
                        tip: `Aumenta ogni 4 livelli: Lv1-4=+2, Lv5-8=+3, Lv9-12=+4, Lv13-16=+5, ecc.`
                      },
                      "strength": {
                        title: "💪 Forza (FOR)",
                        description: "Potenza fisica, atletismo, forza bruta.",
                        howItWorks: `Modificatore: ${modStr(getMod(char.strength || 10))}\n\nSi usa per:\n• Attacchi e danni corpo a corpo\n• Sollevare/spingere oggetti pesanti\n• Sfondare porte\n• Atletica (scalare, nuotare, saltare)`,
                        example: `Attacchi con spada:\n\n→ Tiro per colpire: 1d20${modStr(getMod(char.strength || 10))} = [15]${modStr(getMod(char.strength || 10))} = ${15 + getMod(char.strength || 10)}\n→ Se colpisci: 1d8${modStr(getMod(char.strength || 10))} danni\n→ Es: [6]${modStr(getMod(char.strength || 10))} = ${6 + getMod(char.strength || 10)} danni ⚔️`,
                        tip: "Importante per Guerrieri, Barbari, Paladini. Determina quanto peso puoi trasportare!"
                      },
                      "dexterity": {
                        title: "🎯 Destrezza (DES)",
                        description: "Agilità, riflessi, coordinazione.",
                        howItWorks: `Modificatore: ${modStr(getMod(char.dexterity || 10))}\n\nSi usa per:\n• Attacchi e danni a distanza\n• CA (con armature leggere)\n• Iniziativa\n• Acrobazia, Furtività, Rapidità di Mano`,
                        example: `Attacchi con arco:\n\n→ Tiro per colpire: 1d20${modStr(getMod(char.dexterity || 10))} = [13]${modStr(getMod(char.dexterity || 10))} = ${13 + getMod(char.dexterity || 10)}\n→ Se colpisci: 1d8${modStr(getMod(char.dexterity || 10))} danni\n→ Es: [7]${modStr(getMod(char.dexterity || 10))} = ${7 + getMod(char.dexterity || 10)} danni 🏹`,
                        tip: "Importante per Ladri, Ranger, Monaci. Alta DES = difficile da colpire e agisci per primo!"
                      },
                      "constitution": {
                        title: "🛡️ Costituzione (COS)",
                        description: "Salute, resistenza, forza vitale.",
                        howItWorks: `Modificatore: ${modStr(getMod(char.constitution || 10))}\n\nSi usa per:\n• HP extra ad ogni livello\n• Resistere a veleni/malattie\n• Tiri salvezza Costituzione\n• Trattenere il respiro, marce forzate`,
                        example: `Calcolo HP:\n\nAd ogni livello guadagni:\n→ Dado Vita + COS (${modStr(getMod(char.constitution || 10))})\n\nLivello ${level}:\n→ HP base + (${level} × ${modStr(getMod(char.constitution || 10))})\n→ = ${level * getMod(char.constitution || 10)} HP extra dalla COS! 💚`,
                        tip: "TUTTI i personaggi beneficiano di alta COS. Più HP = sopravvivi più a lungo!"
                      },
                      "intelligence": {
                        title: "📚 Intelligenza (INT)",
                        description: "Acume mentale, memoria, ragionamento.",
                        howItWorks: `Modificatore: ${modStr(getMod(char.intelligence || 10))}\n\nSi usa per:\n• Indagare, Arcano, Storia\n• Natura, Religione\n• Incantesimi (Mago)\n• Capire linguaggi, decifrare codici`,
                        example: `Cerchi trappole (Indagare):\n\n→ 1d20${modStr(getMod(char.intelligence || 10))} = [14]${modStr(getMod(char.intelligence || 10))} = ${14 + getMod(char.intelligence || 10)}\n→ CD 15 per trovarla\n→ ${14 + getMod(char.intelligence || 10)} ${14 + getMod(char.intelligence || 10) >= 15 ? '≥' : '<'} 15 → ${14 + getMod(char.intelligence || 10) >= 15 ? 'TROVATA! ✓' : 'Non trovi nulla... ✗'}`,
                        tip: "Essenziale per Maghi. Alta INT = risolvere enigmi, ricordare dettagli importanti, capire magie."
                      },
                      "wisdom": {
                        title: "🦉 Saggezza (SAG)",
                        description: "Consapevolezza, intuizione, sensi.",
                        howItWorks: `Modificatore: ${modStr(getMod(char.wisdom || 10))}\n\nSi usa per:\n• Percezione, Intuizione\n• Sopravvivenza, Medicina\n• Incantesimi (Chierico, Druido)\n• Notare dettagli, leggere intenzioni`,
                        example: `Ascolti dietro una porta (Percezione):\n\n→ 1d20${modStr(getMod(char.wisdom || 10))} = [11]${modStr(getMod(char.wisdom || 10))} = ${11 + getMod(char.wisdom || 10)}\n→ CD 12 per sentire goblin\n→ ${11 + getMod(char.wisdom || 10)} ${11 + getMod(char.wisdom || 10) >= 12 ? '≥' : '<'} 12 → ${11 + getMod(char.wisdom || 10) >= 12 ? 'Li senti! 👂' : 'Non senti nulla... ✗'}`,
                        tip: "Essenziale per Chierici/Druidi. Alta SAG = evitare imboscate, capire bugie, orientarsi."
                      },
                      "charisma": {
                        title: "👑 Carisma (CAR)",
                        description: "Personalità, eloquenza, leadership.",
                        howItWorks: `Modificatore: ${modStr(getMod(char.charisma || 10))}\n\nSi usa per:\n• Persuasione, Inganno, Intimidire\n• Intrattenere, Addestrare Animali\n• Incantesimi (Bardo, Stregone, Warlock)\n• Influenzare persone`,
                        example: `Convinci guardia (Persuasione):\n\n→ 1d20${modStr(getMod(char.charisma || 10))} = [16]${modStr(getMod(char.charisma || 10))} = ${16 + getMod(char.charisma || 10)}\n→ CD 15 per convincerla\n→ ${16 + getMod(char.charisma || 10)} ≥ 15 → Ti fa passare! 🗣️`,
                        tip: "Essenziale per Bardi/Paladini. Alto CAR = negoziare, mentire, comandare, affascinare."
                      }
                    };

                    const data = HELP_DATA[selectedHelp];
                    if (!data) return null;

                    return (
                      <motion.div
                        initial={{ opacity: 0, height: 0, y: -20 }}
                        animate={{ opacity: 1, height: "auto", y: 0 }}
                        exit={{ opacity: 0, height: 0, y: -20 }}
                        transition={{ duration: 0.3, ease: "easeOut" }}
                        style={{
                          background: "linear-gradient(135deg, rgba(10,8,6,0.95) 0%, rgba(26,20,12,0.95) 100%)",
                          border: "3px solid var(--gold)",
                          borderRadius: 12,
                          padding: "20px 24px",
                          boxShadow: "0 8px 32px rgba(0,0,0,0.9), inset 0 2px 8px rgba(212,175,55,0.1)",
                          position: "relative",
                          overflow: "hidden",
                        }}
                      >
                        {/* Decorative corner ornaments */}
                        <div style={{
                          position: "absolute",
                          top: 8, left: 8,
                          width: 24, height: 24,
                          borderTop: "2px solid var(--gold-dark)",
                          borderLeft: "2px solid var(--gold-dark)",
                          opacity: 0.3
                        }} />
                        <div style={{
                          position: "absolute",
                          top: 8, right: 8,
                          width: 24, height: 24,
                          borderTop: "2px solid var(--gold-dark)",
                          borderRight: "2px solid var(--gold-dark)",
                          opacity: 0.3
                        }} />

                        {/* Titolo */}
                        <div style={{
                          fontFamily: "var(--font-heading)",
                          fontSize: "1.1rem",
                          color: "var(--gold)",
                          marginBottom: 14,
                          letterSpacing: "0.05em",
                          textTransform: "uppercase",
                          textAlign: "center",
                          textShadow: "0 2px 8px rgba(212,175,55,0.4)"
                        }}>
                          {data.title}
                        </div>

                        {/* Descrizione */}
                        <div style={{
                          color: "var(--parchment)",
                          fontSize: "0.95rem",
                          lineHeight: 1.6,
                          marginBottom: 14,
                          fontStyle: "italic",
                          opacity: 0.9
                        }}>
                          {data.description}
                        </div>

                        {/* Come funziona */}
                        <div style={{ marginBottom: 14 }}>
                          <div style={{
                            color: "var(--gold-dark)",
                            fontSize: "0.8rem",
                            fontFamily: "var(--font-heading)",
                            marginBottom: 6,
                            letterSpacing: "0.05em",
                            textTransform: "uppercase"
                          }}>
                            ⚙️ Come Funziona
                          </div>
                          <div style={{
                            color: "var(--parchment)",
                            fontSize: "0.9rem",
                            lineHeight: 1.6,
                            background: "rgba(0,0,0,0.3)",
                            padding: "10px 14px",
                            borderRadius: 6,
                            borderLeft: "3px solid var(--gold-dark)"
                          }}>
                            {data.howItWorks}
                          </div>
                        </div>

                        {/* Esempio pratico */}
                        <div style={{ marginBottom: 14 }}>
                          <div style={{
                            color: "var(--gold-dark)",
                            fontSize: "0.8rem",
                            fontFamily: "var(--font-heading)",
                            marginBottom: 6,
                            letterSpacing: "0.05em",
                            textTransform: "uppercase"
                          }}>
                            💡 Esempio Pratico
                          </div>
                          <div style={{
                            color: "#90EE90",
                            fontSize: "0.9rem",
                            lineHeight: 1.6,
                            background: "rgba(0,50,0,0.3)",
                            padding: "10px 14px",
                            borderRadius: 6,
                            borderLeft: "3px solid #90EE90",
                            fontFamily: "monospace"
                          }}>
                            {data.example}
                          </div>
                        </div>

                        {/* Tip */}
                        <div style={{
                          background: "rgba(212,175,55,0.08)",
                          border: "1px solid rgba(212,175,55,0.3)",
                          borderRadius: 6,
                          padding: "10px 14px",
                          display: "flex",
                          gap: 10,
                          alignItems: "flex-start"
                        }}>
                          <span style={{ fontSize: "1.2rem", flexShrink: 0 }}>💎</span>
                          <div>
                            <div style={{
                              color: "var(--gold)",
                              fontSize: "0.75rem",
                              fontFamily: "var(--font-heading)",
                              marginBottom: 4,
                              letterSpacing: "0.05em"
                            }}>
                              CONSIGLIO
                            </div>
                            <div style={{
                              color: "var(--parchment-dark)",
                              fontSize: "0.85rem",
                              lineHeight: 1.5
                            }}>
                              {data.tip}
                            </div>
                          </div>
                        </div>

                        {/* Close button */}
                        <button
                          onClick={() => setSelectedHelp(null)}
                          style={{
                            position: "absolute",
                            top: 12, right: 12,
                            background: "rgba(0,0,0,0.5)",
                            border: "1px solid rgba(212,175,55,0.3)",
                            borderRadius: "50%",
                            width: 28, height: 28,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            cursor: "pointer",
                            color: "var(--gold-dark)",
                            fontSize: "1.1rem",
                            transition: "all 0.2s"
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = "rgba(212,175,55,0.2)";
                            e.currentTarget.style.borderColor = "var(--gold)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = "rgba(0,0,0,0.5)";
                            e.currentTarget.style.borderColor = "rgba(212,175,55,0.3)";
                          }}
                        >
                          ✕
                        </button>
                      </motion.div>
                    );
                  })()}
                </AnimatePresence>
              </div>
            </motion.div>
          )}

          {/* ── TAB ESPLORA ── */}
          {tab === "explore" && (
            <motion.div
              key="explore"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
            >
              <ExploreTab
                character={char}
                campaign={campaign}
                session={session}
                onRollDice={handleDiceRoll}
              />
            </motion.div>
          )}

          {/* ── TAB ABILITÀ ── */}
          {tab === "skills" && (
            <motion.div
              key="skills"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              style={{ display: "flex", flexDirection: "column", gap: 6 }}
            >
              <div style={{ fontFamily: "var(--font-heading)", fontSize: "0.7rem", color: "var(--gold)", letterSpacing: "0.15em", marginBottom: 6 }}>
                BONUS COMPETENZA +{profBonus}
              </div>

              {/* Tiri salvezza */}
              <div className="ornament" style={{ margin: "8px 0 12px" }}>TIRI SALVEZZA</div>
              {ABILITIES.map(({ key, label, full }) => {
                const score = char[key] || 10;
                const mod = getMod(score);
                const hasSave = (char.saving_throws || []).includes(key);
                const bonus = hasSave ? mod + profBonus : mod;
                return (
                  <div key={`save-${key}`} style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "10px 12px",
                    background: hasSave ? "linear-gradient(135deg, rgba(26,20,12,0.9) 0%, rgba(10,8,6,0.9) 100%)" : "rgba(0,0,0,0.3)",
                    border: hasSave ? "2px solid var(--gold-dark)" : "1px solid rgba(212,175,55,0.15)",
                    borderRadius: 8,
                    boxShadow: hasSave ? "inset 0 2px 6px rgba(0,0,0,0.5), 0 3px 10px rgba(0,0,0,0.4)" : "none",
                  }}>
                    <div style={{
                      width: 12, height: 12, borderRadius: "50%",
                      background: hasSave ? "var(--gold)" : "rgba(212,175,55,0.2)",
                      border: hasSave ? "2px solid var(--gold-light)" : "none",
                      boxShadow: hasSave ? "0 0 8px rgba(212,175,55,0.6)" : "none",
                      flexShrink: 0
                    }} />
                    <span style={{ fontSize: "0.7rem", color: "var(--gold)", fontFamily: "var(--font-heading)", fontWeight: 700, width: 32 }}>{label}</span>
                    <span style={{ flex: 1, fontSize: "0.85rem", color: "var(--parchment)", fontWeight: hasSave ? 600 : 400 }}>{full}</span>
                    <span style={{
                      fontFamily: "var(--font-heading)",
                      fontSize: "1.1rem",
                      color: hasSave ? "var(--gold-light)" : "var(--parchment-dark)",
                      fontWeight: 900,
                      minWidth: 36,
                      textAlign: "center",
                      background: hasSave ? "rgba(0,0,0,0.4)" : "transparent",
                      padding: hasSave ? "2px 8px" : "0",
                      borderRadius: 4,
                      border: hasSave ? "1px solid rgba(212,175,55,0.3)" : "none",
                    }}>
                      {bonus >= 0 ? "+" : ""}{bonus}
                    </span>
                  </div>
                );
              })}

              {/* Abilità */}
              <div className="ornament" style={{ margin: "16px 0 12px" }}>ABILITÀ</div>
              {ABILITIES.flatMap(({ key, skills }) =>
                skills.map(skill => {
                  const score = char[key] || 10;
                  const mod = getMod(score);
                  const isProf = (char.proficiencies || []).includes(skill);
                  const isExpert = (char.skills || {})[skill] === "expertise";
                  const bonus = isExpert ? mod + profBonus * 2 : isProf ? mod + profBonus : mod;

                  return (
                    <div key={skill} style={{
                      display: "flex", alignItems: "center", gap: 10,
                      padding: "10px 12px",
                      background: (isProf || isExpert) ? "linear-gradient(135deg, rgba(26,20,12,0.9) 0%, rgba(10,8,6,0.9) 100%)" : "rgba(0,0,0,0.3)",
                      border: isExpert ? "2px solid #60c0f0" : isProf ? "2px solid var(--gold-dark)" : "1px solid rgba(212,175,55,0.15)",
                      borderRadius: 8,
                      boxShadow: (isProf || isExpert) ? "inset 0 2px 6px rgba(0,0,0,0.5), 0 3px 10px rgba(0,0,0,0.4)" : "none",
                    }}>
                      <div style={{
                        width: 12, height: 12, borderRadius: "50%",
                        background: isExpert ? "#60c0f0" : isProf ? "var(--gold)" : "rgba(212,175,55,0.2)",
                        border: (isProf || isExpert) ? `2px solid ${isExpert ? "#80d0ff" : "var(--gold-light)"}` : "none",
                        boxShadow: (isProf || isExpert) ? `0 0 8px ${isExpert ? "rgba(96,192,240,0.6)" : "rgba(212,175,55,0.6)"}` : "none",
                        flexShrink: 0,
                      }} />
                      <span style={{ flex: 1, fontSize: "0.85rem", color: "var(--parchment)", fontWeight: (isProf || isExpert) ? 600 : 400 }}>
                        {SKILL_NAMES[skill]}
                      </span>
                      <span style={{ fontSize: "0.65rem", color: "var(--gold)", fontFamily: "var(--font-heading)", fontWeight: 600 }}>
                        ({key.slice(0,3).toUpperCase()})
                      </span>
                      <span style={{
                        fontFamily: "var(--font-heading)",
                        fontSize: "1.1rem",
                        color: isExpert ? "#60c0f0" : isProf ? "var(--gold-light)" : "var(--parchment-dark)",
                        fontWeight: 900,
                        minWidth: 36,
                        textAlign: "right",
                      }}>
                        {bonus >= 0 ? "+" : ""}{bonus}
                      </span>
                    </div>
                  );
                })
              )}
            </motion.div>
          )}

          {/* ── TAB DADI ── */}
          {tab === "dice" && (
            <motion.div
              key="dice"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
            >
              <DicePanel
                playerName={char.name}
                playerColor={char.token_color || "var(--gold)"}
                onRoll={handleDiceRoll}
              />
            </motion.div>
          )}

          {/* ── TAB MAGIE ── */}
          {tab === "spells" && (
            <motion.div
              key="spells"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              style={{ display: "flex", flexDirection: "column", gap: 12 }}
            >
              {cls?.spellcasting ? (
                <>
                  {/* Concentrazione */}
                  <div className="glass-card" style={{ padding: 14 }}>
                    <div style={{ fontFamily: "var(--font-heading)", fontSize: "0.7rem", color: "var(--gold)", letterSpacing: "0.15em", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
                      <DnDIcon icon="concentration" size={16} color="var(--gold)" />
                      CONCENTRAZIONE
                    </div>
                    {char.concentration_spell ? (
                      <div style={{
                        background: "rgba(138,43,226,0.2)",
                        border: "2px solid rgba(138,43,226,0.5)",
                        borderRadius: 8,
                        padding: "12px",
                        position: "relative",
                      }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div>
                            <div style={{ fontSize: "0.65rem", color: "rgba(138,43,226,0.8)", marginBottom: 4 }}>
                              MANTENENDO CONCENTRAZIONE SU:
                            </div>
                            <div style={{ fontSize: "0.9rem", fontWeight: "bold", color: "var(--parchment)", fontFamily: "var(--font-heading)" }}>
                              {char.concentration_spell}
                            </div>
                            <div style={{ fontSize: "0.6rem", color: "rgba(212,175,55,0.6)", marginTop: 6 }}>
                              ⚠️ Tiro salvezza CON se subisci danno (CD 10 o metà danno)
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              setModal({
                                isOpen: true,
                                type: "confirm",
                                title: "Interrompi Concentrazione",
                                message: `Sei sicuro di voler interrompere la concentrazione su ${char.concentration_spell}?`,
                                confirmText: "Interrompi",
                                cancelText: "Annulla",
                                onConfirm: () => {
                                  saveField({ concentration_spell: null });
                                }
                              });
                            }}
                            style={{
                              background: "rgba(220,20,60,0.3)",
                              border: "2px solid var(--crimson-light)",
                              borderRadius: 6,
                              padding: "8px 12px",
                              color: "var(--crimson-light)",
                              cursor: "pointer",
                              fontSize: "0.7rem",
                              fontWeight: "bold",
                            }}
                          >
                            ✕ Interrompi
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div style={{
                        background: "rgba(0,0,0,0.4)",
                        border: "2px solid rgba(212,175,55,0.2)",
                        borderRadius: 8,
                        padding: "12px",
                        textAlign: "center",
                      }}>
                        <div style={{ fontSize: "0.7rem", color: "rgba(212,175,55,0.5)", marginBottom: 8 }}>
                          Nessun incantesimo con concentrazione attivo
                        </div>
                        <button
                          className="btn btn-gold"
                          onClick={() => {
                            setInputModal({
                              isOpen: true,
                              title: "Attiva Concentrazione",
                              label: "Nome incantesimo:",
                              defaultValue: "",
                              placeholder: "Es: Benedizione",
                              onConfirm: (spell) => {
                                if (spell.trim()) {
                                  saveField({ concentration_spell: spell.trim() });
                                }
                              }
                            });
                          }}
                          style={{ padding: "6px 12px", fontSize: "0.75rem" }}
                        >
                          + Attiva Concentrazione
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="glass-card" style={{ padding: 14 }}>
                    <div style={{ fontFamily: "var(--font-heading)", fontSize: "0.7rem", color: "var(--gold)", letterSpacing: "0.15em", marginBottom: 10 }}>
                      SLOT INCANTESIMI
                    </div>
                    {[1,2,3,4,5,6,7,8,9].map(lvl => {
                      const total = parseInt((char.spell_slots || {})[String(lvl)] || 0);
                      const used = parseInt((char.spell_slots_used || {})[String(lvl)] || 0);
                      if (total === 0) return null;
                      return (
                        <div key={lvl} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                          <span style={{ fontFamily: "var(--font-heading)", fontSize: "0.7rem", color: "var(--gold-dark)", width: 50 }}>
                            Lv.{lvl}
                          </span>
                          <div style={{ display: "flex", gap: 6, flex: 1 }}>
                            {Array.from({ length: total }).map((_, i) => (
                              <button
                                key={i}
                                className={`spell-slot ${i < (total - used) ? "available" : ""}`}
                                onClick={() => i < (total - used) ? useSpellSlot(lvl) : restoreSpellSlot(lvl)}
                                title={i < (total - used) ? "Usa slot" : "Ripristina slot"}
                              />
                            ))}
                          </div>
                          <span style={{ fontSize: "0.7rem", color: "var(--parchment-dark)" }}>
                            {total - used}/{total}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Trucchetti */}
                  {(char.cantrips || []).length > 0 && (
                    <div className="glass-card" style={{ padding: 14 }}>
                      <div style={{ fontFamily: "var(--font-heading)", fontSize: "0.7rem", color: "var(--gold)", letterSpacing: "0.15em", marginBottom: 8 }}>
                        TRUCCHETTI (∞)
                      </div>
                      {(char.cantrips || []).map((spell, i) => (
                        <div key={i} style={{ fontSize: "0.85rem", color: "var(--parchment-dark)", padding: "4px 0" }}>
                          ✦ {typeof spell === "string" ? spell : spell.name}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Incantesimi preparati */}
                  {(char.spells_prepared || []).length > 0 && (
                    <div className="glass-card" style={{ padding: 14 }}>
                      <div style={{ fontFamily: "var(--font-heading)", fontSize: "0.7rem", color: "var(--gold)", letterSpacing: "0.15em", marginBottom: 8 }}>
                        INCANTESIMI PREPARATI
                      </div>
                      {(char.spells_prepared || []).map((spell, i) => (
                        <div key={i} style={{ fontSize: "0.85rem", color: "var(--parchment-dark)", padding: "4px 0", borderBottom: "1px solid rgba(212,175,55,0.1)" }}>
                          ✦ {typeof spell === "string" ? spell : spell.name}
                        </div>
                      ))}
                    </div>
                  )}

                  {(char.spells_prepared || []).length === 0 && (char.cantrips || []).length === 0 && (
                    <div style={{ textAlign: "center", color: "rgba(212,175,55,0.4)", fontStyle: "italic", marginTop: 20 }}>
                      Nessun incantesimo registrato.<br />
                      Il DM aggiornerà i tuoi incantesimi.
                    </div>
                  )}
                </>
              ) : (
                <div style={{ textAlign: "center", color: "rgba(212,175,55,0.4)", fontStyle: "italic", marginTop: 40 }}>
                  Il {cls?.name} non usa la magia.<br />
                  Ma la tua forza parla da sola.
                </div>
              )}
            </motion.div>
          )}

          {/* ── TAB INVENTARIO ── */}
          {tab === "inventory" && (
            <motion.div
              key="inventory"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              style={{ display: "flex", flexDirection: "column", gap: 12 }}
            >
              {/* ========================================
                  AZIONI COMBAT - Solo durante il combattimento
                  ======================================== */}
              {isCombat && (
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="glass-card"
                  style={{
                    padding: 16,
                    border: "3px solid var(--crimson-light)",
                    boxShadow: "0 0 30px rgba(192,64,64,0.4)",
                    background: "linear-gradient(135deg, rgba(192,64,64,0.15), rgba(192,64,64,0.05))",
                  }}
                >
                  {/* Header */}
                  <div style={{
                    fontFamily: "var(--font-heading)",
                    fontSize: "0.9rem",
                    color: "var(--crimson-light)",
                    letterSpacing: "0.15em",
                    marginBottom: 12,
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    textShadow: "0 0 20px rgba(192,64,64,0.8)",
                  }}>
                    <DnDIcon icon="attack" size={20} color="var(--crimson-light)" />
                    ⚔️ AZIONI COMBAT
                  </div>

                  {/* ═══════════════════════════════════════════════ */}
                  {/* SELEZIONE BERSAGLIO */}
                  {/* ═══════════════════════════════════════════════ */}
                  {availableTargets.length > 0 && (
                    <div style={{ marginBottom: 16 }}>
                      <div style={{
                        fontSize: "0.75rem",
                        color: "var(--gold)",
                        marginBottom: 8,
                        fontWeight: "bold",
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                      }}>
                        <DnDIcon icon="target" size={14} color="var(--gold)" />
                        🎯 Seleziona Bersaglio:
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {availableTargets.map(target => (
                          <motion.button
                            key={target.id}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => setSelectedTarget(target)}
                            style={{
                              padding: "10px 12px",
                              background: selectedTarget?.id === target.id
                                ? "linear-gradient(135deg, rgba(212,175,55,0.3), rgba(212,175,55,0.2))"
                                : "rgba(0,0,0,0.3)",
                              border: selectedTarget?.id === target.id
                                ? "2px solid var(--gold)"
                                : "2px solid rgba(212,175,55,0.3)",
                              borderRadius: 8,
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              transition: "all 0.2s",
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                              <DnDIcon icon="monster" size={20} color={selectedTarget?.id === target.id ? "var(--gold)" : "var(--parchment-dark)"} />
                              <div style={{ textAlign: "left" }}>
                                <div style={{
                                  fontFamily: "var(--font-heading)",
                                  fontSize: "0.85rem",
                                  color: selectedTarget?.id === target.id ? "var(--gold)" : "var(--parchment)",
                                  fontWeight: "bold",
                                }}>
                                  {target.name}
                                </div>
                                <div style={{
                                  fontSize: "0.7rem",
                                  color: selectedTarget?.id === target.id ? "rgba(212,175,55,0.7)" : "var(--parchment-dark)",
                                }}>
                                  CA {target.ac} • {target.hp_current}/{target.hp_max} HP
                                </div>
                              </div>
                            </div>
                            {selectedTarget?.id === target.id && (
                              <div style={{ fontSize: "1.2rem" }}>✓</div>
                            )}
                          </motion.button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Arma Principale */}
                  {char.equipped_weapon_main && (
                    <motion.button
                      whileHover={{ scale: 1.02, boxShadow: "0 0 25px rgba(212,175,55,0.6)" }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => attackWithWeapon(char.equipped_weapon_main, false)}
                      style={{
                        width: "100%",
                        padding: "14px",
                        background: "linear-gradient(135deg, rgba(212,175,55,0.2), rgba(212,175,55,0.1))",
                        border: "2px solid var(--gold)",
                        borderRadius: 8,
                        cursor: "pointer",
                        marginBottom: 10,
                        transition: "all 0.2s",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        {/* Immagine arma o icona fallback */}
                        {char.equipped_weapon_main.image_url ? (
                          <img
                            src={char.equipped_weapon_main.image_url}
                            alt={char.equipped_weapon_main.name}
                            style={{
                              width: 40,
                              height: 40,
                              objectFit: "contain",
                              borderRadius: 6,
                              background: "rgba(0,0,0,0.3)",
                              padding: 4,
                            }}
                            onError={(e) => { e.target.style.display = 'none'; }}
                          />
                        ) : (
                          <DnDIcon icon="weapon" size={24} color="var(--gold)" />
                        )}
                        <div style={{ flex: 1, textAlign: "left" }}>
                          <div style={{
                            fontFamily: "var(--font-heading)",
                            fontSize: "0.9rem",
                            fontWeight: "bold",
                            color: "var(--gold)",
                          }}>
                            {char.equipped_weapon_main.name}
                          </div>
                          <div style={{
                            fontSize: "0.7rem",
                            color: "rgba(212,175,55,0.7)",
                            marginTop: 2,
                          }}>
                            {/* Calcolo bonus attacco */}
                            {(() => {
                              const isFine = char.equipped_weapon_main.properties?.includes("finesse");
                              const str = getMod(char.strength || 10);
                              const dex = getMod(char.dexterity || 10);
                              const atkBonus = isFine ? Math.max(str, dex) : str;
                              const totalBonus = atkBonus + profBonus;
                              return `Attacco: +${totalBonus} | Danno: ${char.equipped_weapon_main.damage}+${atkBonus} ${char.equipped_weapon_main.damage_type}`;
                            })()}
                          </div>
                        </div>
                        <DnDIcon icon="dice" size={20} color="var(--gold)" />
                      </div>
                    </motion.button>
                  )}

                  {/* Arma Secondaria (se presente) */}
                  {char.equipped_weapon_offhand && (
                    <motion.button
                      whileHover={{ scale: 1.02, boxShadow: "0 0 25px rgba(212,175,55,0.6)" }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => attackWithWeapon(char.equipped_weapon_offhand, true)}
                      style={{
                        width: "100%",
                        padding: "14px",
                        background: "linear-gradient(135deg, rgba(212,175,55,0.15), rgba(212,175,55,0.05))",
                        border: "2px solid rgba(212,175,55,0.6)",
                        borderRadius: 8,
                        cursor: "pointer",
                        transition: "all 0.2s",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        {/* Immagine arma o icona fallback */}
                        {char.equipped_weapon_offhand.image_url ? (
                          <img
                            src={char.equipped_weapon_offhand.image_url}
                            alt={char.equipped_weapon_offhand.name}
                            style={{
                              width: 36,
                              height: 36,
                              objectFit: "contain",
                              borderRadius: 6,
                              background: "rgba(0,0,0,0.3)",
                              padding: 4,
                            }}
                            onError={(e) => { e.target.style.display = 'none'; }}
                          />
                        ) : (
                          <DnDIcon icon="weapon" size={22} color="rgba(212,175,55,0.8)" />
                        )}
                        <div style={{ flex: 1, textAlign: "left" }}>
                          <div style={{
                            fontFamily: "var(--font-heading)",
                            fontSize: "0.85rem",
                            fontWeight: "bold",
                            color: "rgba(212,175,55,0.9)",
                          }}>
                            {char.equipped_weapon_offhand.name}
                          </div>
                          <div style={{
                            fontSize: "0.65rem",
                            color: "rgba(212,175,55,0.6)",
                            marginTop: 2,
                          }}>
                            {(() => {
                              const dex = getMod(char.dexterity || 10);
                              const str = getMod(char.strength || 10);
                              const atkBonus = Math.max(str, dex);
                              const totalBonus = atkBonus + profBonus;
                              return `Attacco: +${totalBonus} | Danno: ${char.equipped_weapon_offhand.damage}+${atkBonus} ${char.equipped_weapon_offhand.damage_type}`;
                            })()}
                          </div>
                        </div>
                        <DnDIcon icon="dice" size={18} color="rgba(212,175,55,0.8)" />
                      </div>
                    </motion.button>
                  )}

                  {/* ═══════════════════════════════════════════════
                      BOTTONE TIRA DANNO - Appare solo se l'attacco ha COLPITO
                      ═══════════════════════════════════════════════ */}
                  {pendingDamageRoll && pendingDamageRoll.hit !== false && (
                    <motion.button
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      whileHover={{ scale: 1.05, boxShadow: "0 0 35px rgba(192,64,64,0.8)" }}
                      whileTap={{ scale: 0.95 }}
                      onClick={rollDamage}
                      style={{
                        width: "100%",
                        padding: "18px",
                        background: "linear-gradient(135deg, rgba(192,64,64,0.3), rgba(192,64,64,0.2))",
                        border: "3px solid var(--crimson-light)",
                        borderRadius: 10,
                        cursor: "pointer",
                        marginTop: 16,
                        transition: "all 0.2s",
                        boxShadow: "0 0 25px rgba(192,64,64,0.5)",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12 }}>
                        <DnDIcon icon="damage" size={28} color="var(--crimson-light)" />
                        <div>
                          <div style={{
                            fontFamily: "var(--font-heading)",
                            fontSize: "1.1rem",
                            fontWeight: "900",
                            color: "var(--crimson-light)",
                            textShadow: "0 0 15px rgba(192,64,64,0.8)",
                          }}>
                            TIRA DANNO
                          </div>
                          <div style={{
                            fontSize: "0.7rem",
                            color: "rgba(192,64,64,0.8)",
                            marginTop: 2,
                          }}>
                            {pendingDamageRoll.weapon.damage} + {pendingDamageRoll.damageBonus} {pendingDamageRoll.weapon.damage_type}
                          </div>
                        </div>
                        <DnDIcon icon="dice" size={24} color="var(--crimson-light)" />
                      </div>
                    </motion.button>
                  )}

                  {/* Nessuna arma equipaggiata */}
                  {!char.equipped_weapon_main && !char.equipped_weapon_offhand && (
                    <div style={{
                      padding: "16px",
                      textAlign: "center",
                      color: "rgba(200,200,200,0.6)",
                      fontSize: "0.75rem",
                      fontStyle: "italic",
                    }}>
                      Nessuna arma equipaggiata.<br/>
                      Vai alla sezione Equipaggiamento per equipaggiare un'arma.
                    </div>
                  )}
                </motion.div>
              )}

              {/* Equipaggiamento */}
              <div className="glass-card" style={{ padding: 14 }}>
                <div style={{ fontFamily: "var(--font-heading)", fontSize: "0.7rem", color: "var(--gold)", letterSpacing: "0.15em", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
                  <DnDIcon icon="weapon" size={16} color="var(--gold)" />
                  EQUIPAGGIAMENTO
                </div>

                {/* AC Display */}
                <div style={{
                  background: "rgba(212,175,55,0.15)",
                  border: "2px solid var(--gold)",
                  borderRadius: 8,
                  padding: "12px",
                  marginBottom: 12,
                  textAlign: "center",
                }}>
                  <div style={{ fontSize: "0.65rem", color: "rgba(212,175,55,0.6)", marginBottom: 4 }}>
                    CLASSE ARMATURA
                  </div>
                  <div style={{ fontSize: "2rem", fontWeight: "bold", color: "var(--gold)", fontFamily: "var(--font-heading)" }}>
                    {calculateAC(char)}
                  </div>
                  <div style={{ fontSize: "0.6rem", color: "rgba(212,175,55,0.5)", marginTop: 4 }}>
                    {(() => {
                      const dexMod = getMod(char.dexterity || 10);
                      const armor = char.equipped_armor;
                      const shield = char.equipped_shield;

                      let parts = [];
                      if (armor) {
                        parts.push(`${armor.ac_base} (${armor.name})`);
                        const maxDex = armor.max_dex_bonus !== undefined ? armor.max_dex_bonus : 999;
                        const appliedDex = Math.min(dexMod, maxDex);
                        if (appliedDex > 0) parts.push(`+${appliedDex} DES`);
                      } else {
                        parts.push(`10 base`);
                        if (dexMod > 0) parts.push(`+${dexMod} DES`);
                      }
                      if (shield) parts.push(`+${shield.ac_bonus || 2} (${shield.name})`);
                      return parts.join(' ');
                    })()}
                  </div>
                </div>

                {/* Armatura */}
                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: "0.7rem", color: "var(--gold)", marginBottom: 6, fontWeight: "bold", display: "flex", alignItems: "center", gap: 4 }}>
                    <DnDIcon icon="armor" size={14} color="var(--gold)" />
                    Armatura
                  </div>
                  {char.equipped_armor ? (
                    <div style={{
                      background: "rgba(0,0,0,0.4)",
                      border: "2px solid rgba(212,175,55,0.3)",
                      borderRadius: 6,
                      padding: "8px 10px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}>
                      <div>
                        <div style={{ fontWeight: "bold", fontSize: "0.8rem" }}>{char.equipped_armor.name}</div>
                        <div style={{ fontSize: "0.65rem", color: "rgba(212,175,55,0.6)" }}>
                          AC {char.equipped_armor.ac_base}
                          {char.equipped_armor.max_dex_bonus !== undefined && ` (max DES +${char.equipped_armor.max_dex_bonus})`}
                          {char.equipped_armor.stealth_disadvantage && ' • Svantaggio Furtività'}
                        </div>
                      </div>
                      <button
                        onClick={() => saveField({ equipped_armor: null })}
                        style={{ background: "none", border: "none", color: "var(--crimson-light)", cursor: "pointer", fontSize: "1.2rem" }}
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <button
                      className="btn btn-ghost"
                      onClick={() => {
                        // Step 1: Nome armatura
                        setInputModal({
                          isOpen: true,
                          title: "Equipaggia Armatura",
                          label: "Nome armatura:",
                          defaultValue: "",
                          type: "text",
                          placeholder: "Es: Armatura di Piastre",
                          onConfirm: (name) => {
                            if (!name.trim()) return;
                            // Step 2: Tipo armatura
                            setInputModal({
                              isOpen: true,
                              title: "Tipo Armatura",
                              label: "Tipo (light/medium/heavy):",
                              defaultValue: "light",
                              type: "text",
                              placeholder: "light, medium, o heavy",
                              onConfirm: (type) => {
                                const armorType = type.toLowerCase().trim() || "light";
                                // Step 3: AC base
                                setInputModal({
                                  isOpen: true,
                                  title: "AC Base",
                                  label: "AC base:",
                                  defaultValue: "11",
                                  type: "number",
                                  placeholder: "Es: 11, 13, 16...",
                                  onConfirm: (acBaseStr) => {
                                    const ac_base = parseInt(acBaseStr) || 11;
                                    const max_dex_bonus = armorType === "heavy" ? 0 : armorType === "medium" ? 2 : undefined;
                                    // Step 4: Stealth disadvantage
                                    setModal({
                                      isOpen: true,
                                      type: "confirm",
                                      title: "Svantaggio in Furtività",
                                      message: "Questa armatura dà svantaggio in Furtività?",
                                      confirmText: "Sì",
                                      cancelText: "No",
                                      onConfirm: () => {
                                        const armor = { name, type: armorType, ac_base, max_dex_bonus, stealth_disadvantage: true };
                                        saveField({ equipped_armor: armor });
                                      },
                                      onCancel: () => {
                                        const armor = { name, type: armorType, ac_base, max_dex_bonus, stealth_disadvantage: false };
                                        saveField({ equipped_armor: armor });
                                      }
                                    });
                                  }
                                });
                              }
                            });
                          }
                        });
                      }}
                      style={{ width: "100%", fontSize: "0.75rem" }}
                    >
                      + Equipaggia Armatura
                    </button>
                  )}
                </div>

                {/* Scudo */}
                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: "0.7rem", color: "var(--gold)", marginBottom: 6, fontWeight: "bold", display: "flex", alignItems: "center", gap: 4 }}>
                    <DnDIcon icon="shield" size={14} color="var(--gold)" />
                    Scudo
                  </div>
                  {char.equipped_shield ? (
                    <div style={{
                      background: "rgba(0,0,0,0.4)",
                      border: "2px solid rgba(212,175,55,0.3)",
                      borderRadius: 6,
                      padding: "8px 10px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}>
                      <div>
                        <div style={{ fontWeight: "bold", fontSize: "0.8rem" }}>{char.equipped_shield.name}</div>
                        <div style={{ fontSize: "0.65rem", color: "rgba(212,175,55,0.6)" }}>
                          +{char.equipped_shield.ac_bonus || 2} AC
                        </div>
                      </div>
                      <button
                        onClick={() => saveField({ equipped_shield: null })}
                        style={{ background: "none", border: "none", color: "var(--crimson-light)", cursor: "pointer", fontSize: "1.2rem" }}
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <button
                      className="btn btn-ghost"
                      onClick={() => {
                        // Step 1: Nome scudo
                        setInputModal({
                          isOpen: true,
                          title: "Equipaggia Scudo",
                          label: "Nome scudo:",
                          defaultValue: "Scudo",
                          type: "text",
                          placeholder: "Es: Scudo di Legno",
                          onConfirm: (name) => {
                            if (!name.trim()) return;
                            // Step 2: AC bonus
                            setInputModal({
                              isOpen: true,
                              title: "Bonus AC",
                              label: "Bonus AC:",
                              defaultValue: "2",
                              type: "number",
                              placeholder: "Es: 2",
                              onConfirm: (acBonusStr) => {
                                const ac_bonus = parseInt(acBonusStr) || 2;
                                saveField({ equipped_shield: { name, ac_bonus } });
                              }
                            });
                          }
                        });
                      }}
                      style={{ width: "100%", fontSize: "0.75rem" }}
                    >
                      + Equipaggia Scudo
                    </button>
                  )}
                </div>

                {/* Armi */}
                <div>
                  <div style={{ fontSize: "0.7rem", color: "var(--gold)", marginBottom: 6, fontWeight: "bold", display: "flex", alignItems: "center", gap: 4 }}>
                    <DnDIcon icon="sword" size={14} color="var(--gold)" />
                    Armi
                  </div>

                  {/* Arma Principale */}
                  {char.equipped_weapon_main ? (
                    <div style={{
                      background: "rgba(0,0,0,0.4)",
                      border: "2px solid rgba(212,175,55,0.3)",
                      borderRadius: 6,
                      padding: "8px 10px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 6,
                      gap: 10,
                    }}>
                      {/* Immagine arma (se presente) */}
                      {char.equipped_weapon_main.image_url && (
                        <img
                          src={char.equipped_weapon_main.image_url}
                          alt={char.equipped_weapon_main.name}
                          style={{
                            width: 48,
                            height: 48,
                            objectFit: "contain",
                            borderRadius: 6,
                            background: "rgba(0,0,0,0.3)",
                            padding: 4,
                          }}
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                      )}
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: "bold", fontSize: "0.8rem" }}>{char.equipped_weapon_main.name}</div>
                        <div style={{ fontSize: "0.65rem", color: "rgba(212,175,55,0.6)" }}>
                          {char.equipped_weapon_main.damage} {char.equipped_weapon_main.damage_type}
                          {char.equipped_weapon_main.properties && ` • ${char.equipped_weapon_main.properties.join(', ')}`}
                        </div>
                      </div>
                      <button
                        onClick={() => saveField({ equipped_weapon_main: null })}
                        style={{ background: "none", border: "none", color: "var(--crimson-light)", cursor: "pointer", fontSize: "1.2rem" }}
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <button
                      className="btn btn-ghost"
                      onClick={() => {
                        setWeaponModal({
                          isOpen: true,
                          isOffhand: false,
                          onConfirm: (weapon) => {
                            saveField({ equipped_weapon_main: weapon });
                          }
                        });
                      }}
                      style={{ width: "100%", fontSize: "0.75rem", marginBottom: 6 }}
                    >
                      + Arma Principale
                    </button>
                  )}

                  {/* Arma Secondaria */}
                  {char.equipped_weapon_offhand ? (
                    <div style={{
                      background: "rgba(0,0,0,0.4)",
                      border: "2px solid rgba(212,175,55,0.3)",
                      borderRadius: 6,
                      padding: "8px 10px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 10,
                    }}>
                      {/* Immagine arma (se presente) */}
                      {char.equipped_weapon_offhand.image_url && (
                        <img
                          src={char.equipped_weapon_offhand.image_url}
                          alt={char.equipped_weapon_offhand.name}
                          style={{
                            width: 48,
                            height: 48,
                            objectFit: "contain",
                            borderRadius: 6,
                            background: "rgba(0,0,0,0.3)",
                            padding: 4,
                          }}
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                      )}
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: "bold", fontSize: "0.8rem" }}>{char.equipped_weapon_offhand.name} (Offhand)</div>
                        <div style={{ fontSize: "0.65rem", color: "rgba(212,175,55,0.6)" }}>
                          {char.equipped_weapon_offhand.damage} {char.equipped_weapon_offhand.damage_type}
                        </div>
                      </div>
                      <button
                        onClick={() => saveField({ equipped_weapon_offhand: null })}
                        style={{ background: "none", border: "none", color: "var(--crimson-light)", cursor: "pointer", fontSize: "1.2rem" }}
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <button
                      className="btn btn-ghost"
                      onClick={() => {
                        setWeaponModal({
                          isOpen: true,
                          isOffhand: true,
                          onConfirm: (weapon) => {
                            saveField({ equipped_weapon_offhand: weapon });
                          }
                        });
                      }}
                      style={{ width: "100%", fontSize: "0.75rem" }}
                    >
                      + Arma Secondaria
                    </button>
                  )}
                </div>
              </div>

              {/* Monete */}
              <div className="glass-card" style={{ padding: 14 }}>
                <div style={{ fontFamily: "var(--font-heading)", fontSize: "0.7rem", color: "var(--gold)", letterSpacing: "0.15em", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
                  <DnDIcon icon="money" size={16} color="var(--gold)" />
                  MONETE
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                  {[
                    { key: "gold", label: "Oro", iconName: "goldCoin", color: "#ffd700" },
                    { key: "silver", label: "Argento", iconName: "silverCoin", color: "#c0c0c0" },
                    { key: "copper", label: "Rame", iconName: "copperCoin", color: "#b87333" },
                  ].map(({ key, label, iconName, color }) => (
                    <div key={key} style={{ textAlign: "center" }}>
                      <div style={{ marginBottom: 4 }}>
                        <DnDIcon icon={iconName} size={24} color={color} />
                      </div>
                      <input
                        type="number"
                        min="0"
                        value={char[key] || 0}
                        onChange={e => setChar(prev => ({ ...prev, [key]: parseInt(e.target.value) || 0 }))}
                        onBlur={e => saveField({ [key]: parseInt(e.target.value) || 0 })}
                        style={{
                          width: "100%",
                          padding: "8px",
                          textAlign: "center",
                          background: "rgba(0,0,0,0.4)",
                          border: `2px solid ${color}80`,
                          borderRadius: 6,
                          color: "var(--parchment)",
                          fontSize: "1rem",
                          fontWeight: "bold",
                        }}
                      />
                      <div style={{ fontSize: "0.65rem", color: "rgba(212,175,55,0.6)", marginTop: 4 }}>{label}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Lista Oggetti */}
              <div className="glass-card" style={{ padding: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <div style={{ fontFamily: "var(--font-heading)", fontSize: "0.7rem", color: "var(--gold)", letterSpacing: "0.15em", display: "flex", alignItems: "center", gap: 6 }}>
                    <DnDIcon icon="backpack" size={16} color="var(--gold)" />
                    OGGETTI ({(char.inventory || []).length})
                  </div>
                  <button
                    className="btn btn-gold"
                    onClick={() => {
                      let tempItem = { name: "", quantity: 1, weight: 0, description: "" };

                      // Step 1: Nome
                      setInputModal({
                        isOpen: true,
                        title: "Aggiungi Oggetto",
                        label: "Nome oggetto:",
                        defaultValue: "",
                        placeholder: "Spada lunga, Pozione, ecc.",
                        onConfirm: (name) => {
                          if (!name.trim()) return;
                          tempItem.name = name;

                          // Step 2: Quantità
                          setInputModal({
                            isOpen: true,
                            title: "Aggiungi Oggetto",
                            label: "Quantità:",
                            defaultValue: "1",
                            type: "number",
                            placeholder: "1",
                            onConfirm: (quantity) => {
                              tempItem.quantity = parseInt(quantity) || 1;

                              // Step 3: Peso
                              setInputModal({
                                isOpen: true,
                                title: "Aggiungi Oggetto",
                                label: "Peso (lb):",
                                defaultValue: "0",
                                type: "number",
                                placeholder: "0",
                                onConfirm: (weight) => {
                                  tempItem.weight = parseFloat(weight) || 0;

                                  // Step 4: Descrizione (opzionale)
                                  setInputModal({
                                    isOpen: true,
                                    title: "Aggiungi Oggetto",
                                    label: "Descrizione (opzionale):",
                                    defaultValue: "",
                                    placeholder: "Descrizione dell'oggetto...",
                                    onConfirm: (description) => {
                                      tempItem.description = description || "";

                                      // Aggiungi l'oggetto
                                      const newItem = {
                                        id: Date.now(),
                                        ...tempItem,
                                      };

                                      const newInventory = [...(char.inventory || []), newItem];
                                      setChar(prev => ({ ...prev, inventory: newInventory }));
                                      saveField({ inventory: newInventory });
                                    }
                                  });
                                }
                              });
                            }
                          });
                        }
                      });
                    }}
                    style={{ padding: "6px 12px", fontSize: "0.75rem" }}
                  >
                    + Aggiungi
                  </button>
                </div>

                {(char.inventory || []).length === 0 ? (
                  <div style={{ textAlign: "center", color: "rgba(212,175,55,0.4)", fontStyle: "italic", padding: "20px 0" }}>
                    Lo zaino è vuoto.<br />
                    Aggiungi il tuo primo oggetto!
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {(char.inventory || []).map((item, idx) => (
                      <div
                        key={item.id || idx}
                        style={{
                          background: "rgba(0,0,0,0.4)",
                          border: "2px solid rgba(212,175,55,0.2)",
                          borderRadius: 8,
                          padding: "10px",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "flex-start",
                        }}
                      >
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: "bold", color: "var(--gold)", fontSize: "0.85rem" }}>
                            {item.name}
                          </div>
                          {item.description && (
                            <div style={{ fontSize: "0.7rem", color: "rgba(212,175,55,0.6)", marginTop: 2 }}>
                              {item.description}
                            </div>
                          )}
                          <div style={{ fontSize: "0.65rem", color: "rgba(212,175,55,0.5)", marginTop: 4 }}>
                            Qtà: {item.quantity} {item.weight > 0 && `• Peso: ${item.weight * item.quantity} lb`}
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            setModal({
                              isOpen: true,
                              type: "confirm",
                              title: "Rimuovi Oggetto",
                              message: `Vuoi rimuovere ${item.name} dall'inventario?`,
                              confirmText: "Rimuovi",
                              cancelText: "Annulla",
                              onConfirm: () => {
                                const newInventory = (char.inventory || []).filter((_, i) => i !== idx);
                                setChar(prev => ({ ...prev, inventory: newInventory }));
                                saveField({ inventory: newInventory });
                              }
                            });
                          }}
                          style={{
                            background: "none",
                            border: "none",
                            color: "var(--crimson-light)",
                            cursor: "pointer",
                            fontSize: "1.2rem",
                            padding: "0 8px",
                          }}
                        >
                          ✕
                        </button>
                      </div>
                    ))}

                    {/* Peso Totale */}
                    <div style={{
                      textAlign: "center",
                      fontSize: "0.75rem",
                      color: "rgba(212,175,55,0.6)",
                      marginTop: 8,
                      paddingTop: 8,
                      borderTop: "1px solid rgba(212,175,55,0.2)",
                    }}>
                      Peso totale: {(char.inventory || []).reduce((sum, item) => sum + (item.weight * item.quantity), 0).toFixed(1)} lb
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* ── TAB NOTE ── */}
          {tab === "notes" && (
            <motion.div
              key="notes"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              style={{ display: "flex", flexDirection: "column", gap: 16 }}
            >
              {[
                { key: "traits", label: "Tratti" },
                { key: "ideals", label: "Ideali" },
                { key: "bonds", label: "Legami" },
                { key: "flaws", label: "Difetti" },
                { key: "backstory", label: "Storia del personaggio" },
                { key: "notes", label: "Note di sessione" },
              ].map(({ key, label }) => (
                <div key={key}>
                  <label>{label}</label>
                  <textarea
                    value={char[key] || ""}
                    onChange={e => setChar(prev => ({ ...prev, [key]: e.target.value }))}
                    onBlur={e => saveField({ [key]: e.target.value })}
                    rows={key === "backstory" || key === "notes" ? 5 : 2}
                    placeholder={`Inserisci ${label.toLowerCase()}...`}
                    style={{ resize: "vertical" }}
                  />
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Modal riposo breve */}
      <AnimatePresence>
        {showShortRest && (
          <motion.div
            style={{
              position: "fixed", inset: 0,
              background: "rgba(0,0,0,0.85)",
              display: "flex", alignItems: "center", justifyContent: "center",
              zIndex: 200, padding: 20,
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="glass-card"
              style={{ padding: 24, maxWidth: 340, width: "100%", textAlign: "center" }}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
            >
              <div style={{ fontFamily: "var(--font-heading)", color: "var(--gold)", fontSize: "1.1rem", marginBottom: 8 }}>
                Riposo Breve
              </div>
              <div style={{ color: "var(--parchment-dark)", fontSize: "0.85rem", marginBottom: 16 }}>
                Tira un dado vita (d{cls?.hitDie || 8}) per recuperare HP.
                <br />
                Dadi vita disponibili: {(char.hit_dice_total || 1) - (char.hit_dice_used || 0)}/{char.hit_dice_total || 1}
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button className="btn btn-ghost" onClick={() => setShowShortRest(false)} style={{ flex: 1 }}>Annulla</button>
                <button className="btn btn-gold" onClick={shortRest} style={{ flex: 1 }}>
                  🎲 Tira d{cls?.hitDie || 8}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Risultato dadi dalla TV */}
      <AnimatePresence>
        {showDiceResult && diceResult && (
          <motion.div
            style={{
              position: "fixed", inset: 0,
              background: "rgba(0,0,0,0.9)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 250,
              padding: 20,
              gap: 16,
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowDiceResult(false)}
          >
            <motion.div
              style={{
                fontFamily: "var(--font-heading)",
                fontSize: "1rem",
                color: char.token_color || "var(--gold)",
                letterSpacing: "0.2em",
                textTransform: "uppercase",
              }}
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
            >
              {diceResult.label || `${diceResult.dice?.join(" + ")}`}
            </motion.div>

            {/* Singoli dadi */}
            {diceResult.rolls && diceResult.rolls.length > 0 && (
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
                {diceResult.rolls.map((r, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.1 }}
                    style={{
                      background: "rgba(0,0,0,0.6)",
                      border: `2px solid ${char.token_color || "var(--gold)"}`,
                      borderRadius: 12,
                      padding: "12px 16px",
                      textAlign: "center",
                    }}
                  >
                    <div style={{ fontSize: "0.7rem", color: char.token_color || "var(--gold)", fontFamily: "var(--font-heading)" }}>
                      {r.type}
                    </div>
                    <div style={{ fontSize: "2rem", fontFamily: "var(--font-heading)", fontWeight: "900", color: "var(--parchment)" }}>
                      {r.value}
                    </div>
                  </motion.div>
                ))}
                {diceResult.modifier !== 0 && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: diceResult.rolls.length * 0.1 }}
                    style={{
                      background: "rgba(0,0,0,0.6)",
                      border: "2px solid rgba(212,175,55,0.5)",
                      borderRadius: 12,
                      padding: "12px 16px",
                      textAlign: "center",
                    }}
                  >
                    <div style={{ fontSize: "0.7rem", color: "var(--gold)", fontFamily: "var(--font-heading)" }}>
                      MOD
                    </div>
                    <div style={{ fontSize: "2rem", fontFamily: "var(--font-heading)", fontWeight: "900", color: diceResult.modifier > 0 ? "var(--gold)" : "var(--crimson-light)" }}>
                      {diceResult.modifier > 0 ? "+" : ""}{diceResult.modifier}
                    </div>
                  </motion.div>
                )}
              </div>
            )}

            {/* Totale */}
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3, type: "spring" }}
              style={{
                fontFamily: "var(--font-heading)",
                fontSize: "5rem",
                fontWeight: "900",
                color: char.token_color || "var(--gold)",
                textShadow: `0 0 30px ${char.token_color || "var(--gold)"}`,
                lineHeight: 1,
              }}
            >
              {diceResult.total}
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              style={{
                fontSize: "0.8rem",
                color: "rgba(212,175,55,0.5)",
                fontStyle: "italic",
              }}
            >
              Tocca per chiudere
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══════════════════════════════════════════════ */}
      {/* INITIATIVE REQUEST BANNER */}
      {/* ═══════════════════════════════════════════════ */}
      <AnimatePresence>
        {initiativeRequest && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => !rollingInitiative && setInitiativeRequest(null)}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.95)",
              zIndex: 9999,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 30,
              padding: 20,
            }}
          >
            {/* Titolo */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1, type: "spring" }}
              style={{
                fontFamily: "var(--font-heading)",
                fontSize: "clamp(1.5rem, 6vw, 2.5rem)",
                color: "var(--crimson-light)",
                textAlign: "center",
                letterSpacing: "0.1em",
                textShadow: "0 0 30px rgba(192,64,64,0.8)",
              }}
            >
              ⚔️ ROLL FOR INITIATIVE! ⚔️
            </motion.div>

            {/* Info personaggio */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              style={{
                textAlign: "center",
                color: "var(--parchment)",
              }}
            >
              <div style={{
                fontFamily: "var(--font-heading)",
                fontSize: "1.2rem",
                color: "var(--gold)",
                marginBottom: 8,
              }}>
                {char.name}
              </div>
              <div style={{
                fontSize: "0.9rem",
                color: "var(--parchment-dark)",
              }}>
                Tira d20 + Destrezza ({getMod(char.dexterity || 10) >= 0 ? '+' : ''}{getMod(char.dexterity || 10)})
              </div>
            </motion.div>

            {/* Bottone TIRA */}
            <motion.button
              className="btn btn-crimson"
              onClick={rollInitiative}
              disabled={rollingInitiative}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.3, type: "spring" }}
              whileHover={!rollingInitiative ? { scale: 1.05 } : {}}
              whileTap={!rollingInitiative ? { scale: 0.95 } : {}}
              style={{
                padding: "20px 50px",
                fontSize: "1.5rem",
                fontWeight: "900",
                boxShadow: "0 0 40px rgba(192,64,64,0.6)",
                opacity: rollingInitiative ? 0.5 : 1,
                display: "flex",
                alignItems: "center",
                gap: 12,
              }}
            >
              🎲 {rollingInitiative ? "TIRANDO..." : "TIRA INIZIATIVA"}
            </motion.button>

            {/* Istruzioni */}
            {!rollingInitiative && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                style={{
                  fontSize: "0.8rem",
                  color: "rgba(212,175,55,0.5)",
                  fontStyle: "italic",
                  textAlign: "center",
                }}
              >
                Tocca fuori per annullare
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══════════════════════════════════════════════ */}
      {/* SAVING THROW REQUEST BANNER */}
      {/* ═══════════════════════════════════════════════ */}
      <AnimatePresence>
        {savingThrowRequest && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSavingThrowRequest(null)}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.95)",
              zIndex: 9999,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 30,
              padding: 20,
            }}
          >
            {/* Titolo */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1, type: "spring" }}
              style={{
                fontFamily: "var(--font-heading)",
                fontSize: "clamp(1.3rem, 5vw, 2rem)",
                color: SAVING_THROWS.find(s => s.id === savingThrowRequest.abilityId)?.color || "var(--gold)",
                textAlign: "center",
                letterSpacing: "0.1em",
                textShadow: `0 0 30px ${SAVING_THROWS.find(s => s.id === savingThrowRequest.abilityId)?.color || "var(--gold)"}80`,
              }}
            >
              🎲 TIRO SALVEZZA 🎲
            </motion.div>

            {/* Descrizione */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              style={{
                textAlign: "center",
                color: "var(--parchment)",
                maxWidth: "400px",
              }}
            >
              <div style={{
                fontFamily: "var(--font-body)",
                fontSize: "1rem",
                color: "var(--parchment-dark)",
                marginBottom: 16,
                fontStyle: "italic",
              }}>
                {savingThrowRequest.description}
              </div>

              <div style={{
                fontFamily: "var(--font-heading)",
                fontSize: "1.2rem",
                color: "var(--gold)",
                marginBottom: 8,
              }}>
                {char.name}
              </div>

              <div style={{
                fontSize: "1rem",
                color: SAVING_THROWS.find(s => s.id === savingThrowRequest.abilityId)?.color || "var(--parchment)",
                marginBottom: 12,
                fontWeight: "600",
              }}>
                Tiro salvezza su <strong>{savingThrowRequest.ability}</strong>
              </div>

              <div style={{
                fontSize: "0.9rem",
                color: "var(--parchment-dark)",
                display: "flex",
                justifyContent: "center",
                gap: 20,
                marginTop: 12,
              }}>
                <div>
                  <span style={{ color: "rgba(212,175,55,0.6)", fontSize: "0.75rem" }}>Bonus: </span>
                  <span style={{ color: "var(--gold)", fontWeight: "700" }}>
                    {savingThrowRequest.bonus >= 0 ? '+' : ''}{savingThrowRequest.bonus}
                  </span>
                </div>
                <div>
                  <span style={{ color: "rgba(212,175,55,0.6)", fontSize: "0.75rem" }}>DC: </span>
                  <span style={{ color: "var(--crimson-light)", fontWeight: "700" }}>
                    {savingThrowRequest.dc}
                  </span>
                </div>
              </div>
            </motion.div>

            {/* Bottone TIRA */}
            <motion.button
              className="btn btn-primary"
              onClick={rollSavingThrow}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.3, type: "spring" }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              style={{
                padding: "20px 50px",
                fontSize: "1.5rem",
                fontWeight: "900",
                boxShadow: `0 0 40px ${SAVING_THROWS.find(s => s.id === savingThrowRequest.abilityId)?.color || "var(--gold)"}60`,
                display: "flex",
                alignItems: "center",
                gap: 12,
                background: `linear-gradient(135deg, ${SAVING_THROWS.find(s => s.id === savingThrowRequest.abilityId)?.color || "var(--gold)"}40, ${SAVING_THROWS.find(s => s.id === savingThrowRequest.abilityId)?.color || "var(--gold)"}20)`,
                border: `2px solid ${SAVING_THROWS.find(s => s.id === savingThrowRequest.abilityId)?.color || "var(--gold)"}`,
              }}
            >
              🎲 TIRA d20
            </motion.button>

            {/* Istruzioni */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              style={{
                fontSize: "0.8rem",
                color: "rgba(212,175,55,0.5)",
                fontStyle: "italic",
                textAlign: "center",
              }}
            >
              Tocca fuori per annullare
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══════════════════════════════════════════════ */}
      {/* SKILL CHECK REQUEST BANNER */}
      {/* ═══════════════════════════════════════════════ */}
      <AnimatePresence>
        {skillCheckRequest && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSkillCheckRequest(null)}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.95)",
              zIndex: 9999,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 30,
              padding: 20,
            }}
          >
            {/* Titolo */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1, type: "spring" }}
              style={{
                fontFamily: "var(--font-heading)",
                fontSize: "clamp(1.3rem, 5vw, 2rem)",
                color: SKILL_CHECKS.find(s => s.id === skillCheckRequest.skillId)?.color || "var(--gold)",
                textAlign: "center",
                letterSpacing: "0.1em",
                textShadow: `0 0 30px ${SKILL_CHECKS.find(s => s.id === skillCheckRequest.skillId)?.color || "var(--gold)"}80`,
              }}
            >
              🎯 PROVA ABILITÀ 🎯
            </motion.div>

            {/* Descrizione */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              style={{
                textAlign: "center",
                color: "var(--parchment)",
                maxWidth: "400px",
              }}
            >
              <div style={{
                fontFamily: "var(--font-body)",
                fontSize: "1rem",
                color: "var(--parchment-dark)",
                marginBottom: 16,
                fontStyle: "italic",
              }}>
                {skillCheckRequest.description}
              </div>

              <div style={{
                fontFamily: "var(--font-heading)",
                fontSize: "1.2rem",
                color: "var(--gold)",
                marginBottom: 8,
              }}>
                {char.name}
              </div>

              <div style={{
                fontSize: "1rem",
                color: SKILL_CHECKS.find(s => s.id === skillCheckRequest.skillId)?.color || "var(--parchment)",
                marginBottom: 12,
                fontWeight: "600",
              }}>
                Prova di <strong>{skillCheckRequest.skill}</strong> <span style={{ fontSize: "0.85rem", opacity: 0.7 }}>({skillCheckRequest.ability})</span>
              </div>

              <div style={{
                fontSize: "0.9rem",
                color: "var(--parchment-dark)",
                display: "flex",
                justifyContent: "center",
                gap: 20,
                marginTop: 12,
              }}>
                <div>
                  <span style={{ color: "rgba(212,175,55,0.6)", fontSize: "0.75rem" }}>Bonus: </span>
                  <span style={{ color: "var(--gold)", fontWeight: "700" }}>
                    {skillCheckRequest.bonus >= 0 ? '+' : ''}{skillCheckRequest.bonus}
                  </span>
                </div>
                <div>
                  <span style={{ color: "rgba(212,175,55,0.6)", fontSize: "0.75rem" }}>DC: </span>
                  <span style={{ color: "var(--crimson-light)", fontWeight: "700" }}>
                    {skillCheckRequest.dc}
                  </span>
                </div>
              </div>
            </motion.div>

            {/* Bottone TIRA */}
            <motion.button
              className="btn btn-primary"
              onClick={rollSkillCheck}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.3, type: "spring" }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              style={{
                padding: "20px 50px",
                fontSize: "1.5rem",
                fontWeight: "900",
                boxShadow: `0 0 40px ${SKILL_CHECKS.find(s => s.id === skillCheckRequest.skillId)?.color || "var(--gold)"}60`,
                display: "flex",
                alignItems: "center",
                gap: 12,
                background: `linear-gradient(135deg, ${SKILL_CHECKS.find(s => s.id === skillCheckRequest.skillId)?.color || "var(--gold)"}40, ${SKILL_CHECKS.find(s => s.id === skillCheckRequest.skillId)?.color || "var(--gold)"}20)`,
                border: `2px solid ${SKILL_CHECKS.find(s => s.id === skillCheckRequest.skillId)?.color || "var(--gold)"}`,
              }}
            >
              🎲 TIRA d20
            </motion.button>

            {/* Istruzioni */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              style={{
                fontSize: "0.8rem",
                color: "rgba(212,175,55,0.5)",
                fontStyle: "italic",
                textAlign: "center",
              }}
            >
              Tocca fuori per annullare
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
