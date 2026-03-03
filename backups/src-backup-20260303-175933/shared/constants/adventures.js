// ═══════════════════════════════════════════════
//  ADVENTURES - Sistema Avventure Semi-Guidate
//  Struttura per storie pre-scritte con scelte
// ═══════════════════════════════════════════════

export const ADVENTURES = {
  crypt_forgotten_king: {
    id: "crypt_forgotten_king",
    title: "La Cripta del Re Dimenticato",
    description: "Un vecchio uomo vi chiede di salvare sua figlia dai goblin. Ma nella cripta antica, oscuri segreti attendono...",
    level: { min: 1, max: 3 },
    duration: "2-3 ore",
    difficulty: "Facile",
    image: "/adventures/crypt.jpg",

    // Scena iniziale
    startScene: "tavern_intro",

    // Tutte le scene dell'avventura
    scenes: {
      // ────────────────────────────────────────
      // ATTO 1: La Taverna
      // ────────────────────────────────────────
      tavern_intro: {
        id: "tavern_intro",
        title: "La Taverna del Drago Addormentato",
        type: "narrative", // narrative | combat | exploration | puzzle
        background: "/bg/tavern.jpg",
        music: "lobby",

        narrative: `Siete seduti nella taverna "Il Drago Addormentato". L'aria è calda e profuma di birra e arrosto.

Un vecchio uomo vestito di stracci si avvicina al vostro tavolo. Le sue mani tremano mentre si aggrappa al bastone.

"Eroi... vi prego, ho bisogno del vostro aiuto!" dice con voce rotta. "Mia figlia Elena è stata rapita tre giorni fa. I goblin l'hanno portata nella vecchia cripta a nord del villaggio!"

Il vecchio vi guarda con occhi supplichevoli. "Non ho molto... ma vi darò tutto quello che possiedo se la riporterete a casa!"`,

        // NPC in scena
        npcs: [
          {
            id: "old_man",
            name: "Vecchio Marcus",
            portrait: "/npc/old_man.png",
            description: "Un vecchio contadino disperato",
          }
        ],

        // Scelte disponibili
        choices: [
          {
            id: "accept_quest",
            text: "💬 \"Ti aiuteremo, vecchio. Riporteremo tua figlia a casa.\"",
            type: "dialogue",
            consequence: {
              narrative: `Il vecchio Marcus scoppia in lacrime di gratitudine. "Grazie! GRAZIE! Che gli dei vi benedicano!"

Vi consegna una mappa sgualcita e un piccolo medaglione. "Prendete questo... era di mia moglie. Forse vi porterà fortuna."

🎁 OTTENUTO: Mappa della Cripta
🎁 OTTENUTO: Medaglione della Fortuna (+1 ai tiri salvezza per oggi)`,
              rewards: {
                items: ["crypt_map", "luck_medallion"],
                xp: 50,
              },
              nextScene: "journey_forest",
            }
          },
          {
            id: "negotiate_payment",
            text: "💰 \"Quanto ci pagherai esattamente?\"",
            type: "skill_check",
            skill: "persuasion",
            dc: 12,
            onSuccess: {
              narrative: `Marcus esita, poi tira fuori una piccola borsa. "Ho... ho 50 monete d'oro. È tutto quello che ho!"

Sembra sincero. Le sue mani tremano mentre vi porge la borsa.

💰 OTTENUTO: 50 Monete d'Oro (subito)
🎁 OTTENUTO: Mappa della Cripta`,
              rewards: {
                gold: 50,
                items: ["crypt_map"],
                xp: 30,
              },
              nextScene: "journey_forest",
            },
            onFailure: {
              narrative: `Marcus abbassa lo sguardo. "Non... non ho quasi nulla. Ma vi darò la mia casa e il mio campo se la riportate indietro!"

La sua disperazione è palpabile. Anche senza soldi, sembra disposto a darvi tutto.`,
              nextScene: "tavern_intro", // Torna alle scelte
            }
          },
          {
            id: "refuse_quest",
            text: "🚶 \"Scusa vecchio, non sono affari nostri.\"",
            type: "dialogue",
            consequence: {
              narrative: `Marcus crolla a terra in ginocchio, piangendo disperatamente.

Gli altri avventori della taverna vi guardano con disgusto. Il taverniere vi indica la porta con uno sguardo severo.

"Fuori dalla mia taverna. Non voglio vigliacchi qui!"

❌ QUEST RIFIUTATA
❌ -10 Reputazione nel villaggio`,
              rewards: {
                reputation: -10,
              },
              nextScene: "tavern_kicked_out",
            }
          },
          {
            id: "ask_details",
            text: "🔍 \"Raccontaci tutto quello che sai sui goblin e sulla cripta.\"",
            type: "dialogue",
            consequence: {
              narrative: `Marcus annuisce e si siede. "La cripta è vecchia... antichissima. Dicono che un tempo lì fu sepolto un re, tanto tempo fa."

"I goblin sono apparsi una settimana fa. Prima non c'erano. Hanno rapito almeno cinque persone dal villaggio, ma nessuno è mai tornato."

Il vecchio trema. "Ho paura... ho paura che facciano qualcosa a mia figlia..."

📚 INFORMAZIONI OTTENUTE: Goblin apparsi da una settimana, cripta di un antico re`,
              nextScene: "tavern_intro", // Torna alle scelte con più info
            }
          }
        ]
      },

      // ────────────────────────────────────────
      // ATTO 2: Il Viaggio
      // ────────────────────────────────────────
      journey_forest: {
        id: "journey_forest",
        title: "Viaggio nel Bosco",
        type: "exploration",
        background: "/bg/forest.jpg",
        music: "explore",

        narrative: `Lasciate il villaggio alle spalle e vi addentrate nel bosco a nord. Gli alberi diventano sempre più fitti e la luce del sole fatica a filtrare tra le foglie.

Dopo circa un'ora di cammino, sentite dei rumori tra i cespugli alla vostra sinistra...

🎲 PROVA DI GRUPPO: Tutti i membri del party devono tirare Percezione (CD 13)`,

        // Prova abilità di gruppo
        groupCheck: {
          skill: "perception",
          dc: 13,
          requiredSuccesses: 2, // Almeno 2 devono riuscire
        },

        onSuccess: {
          narrative: `I vostri sensi acuti non vi tradiscono! Notate due paia di occhi gialli che vi osservano dall'ombra. Sono LUPI!

Avete il tempo di prepararvi prima che attacchino!

✅ VANTAGGIO sull'iniziativa nel combattimento!`,
          nextScene: "combat_wolves_prepared",
        },

        onFailure: {
          narrative: `I rumori si fermano... tutto sembra tranquillo.

IMPROVVISAMENTE due lupi affamati balzano fuori dai cespugli e vi attaccano!

❌ SVANTAGGIO sull'iniziativa! Siete stati sorpresi!`,
          nextScene: "combat_wolves_surprised",
        }
      },

      // ────────────────────────────────────────
      // COMBATTIMENTI
      // ────────────────────────────────────────
      combat_wolves_prepared: {
        id: "combat_wolves_prepared",
        title: "Combattimento: Lupi Affamati",
        type: "combat",
        background: "/bg/forest_combat.jpg",
        music: "combat",

        narrative: "I lupi attaccano! Ma siete pronti!",

        combat: {
          enemies: [
            {
              id: "wolf_1",
              name: "Lupo Affamato",
              type: "wolf",
              hp: 11,
              ac: 13,
              stats: {
                strength: 12,
                dexterity: 15,
                constitution: 12,
              },
              attacks: [
                {
                  name: "Morso",
                  bonus: 4,
                  damage: "2d4+2",
                  damageType: "piercing",
                }
              ]
            },
            {
              id: "wolf_2",
              name: "Lupo Affamato",
              type: "wolf",
              hp: 11,
              ac: 13,
              stats: {
                strength: 12,
                dexterity: 15,
                constitution: 12,
              },
              attacks: [
                {
                  name: "Morso",
                  bonus: 4,
                  damage: "2d4+2",
                  damageType: "piercing",
                }
              ]
            }
          ],

          playerAdvantage: true, // Vantaggio iniziativa
        },

        onVictory: {
          narrative: `I lupi cadono a terra, sconfitti. Il bosco torna silenzioso.

Frugando tra i resti trovate qualcosa di luccicante...

🎁 OTTENUTO: 10 Monete d'Oro
⭐ +100 XP`,
          rewards: {
            gold: 10,
            xp: 100,
          },
          nextScene: "crypt_entrance",
        },

        onDefeat: {
          narrative: `I lupi sono troppo forti! Dovete ritirarvi...

Tornate al villaggio feriti e sconfitti.

❌ GAME OVER`,
          nextScene: "game_over",
        }
      },

      combat_wolves_surprised: {
        id: "combat_wolves_surprised",
        title: "Combattimento: Lupi Affamati (Sorpresi!)",
        type: "combat",
        background: "/bg/forest_combat.jpg",
        music: "combat",

        narrative: "I lupi vi attaccano di sorpresa!",

        combat: {
          enemies: [
            {
              id: "wolf_1",
              name: "Lupo Affamato",
              type: "wolf",
              hp: 11,
              ac: 13,
              stats: { strength: 12, dexterity: 15, constitution: 12 },
              attacks: [{ name: "Morso", bonus: 4, damage: "2d4+2", damageType: "piercing" }]
            },
            {
              id: "wolf_2",
              name: "Lupo Affamato",
              type: "wolf",
              hp: 11,
              ac: 13,
              stats: { strength: 12, dexterity: 15, constitution: 12 },
              attacks: [{ name: "Morso", bonus: 4, damage: "2d4+2", damageType: "piercing" }]
            }
          ],

          playerDisadvantage: true, // Svantaggio iniziativa
        },

        onVictory: {
          narrative: `Nonostante la sorpresa, riuscite a sconfiggere i lupi!

🎁 OTTENUTO: 10 Monete d'Oro
⭐ +100 XP`,
          rewards: { gold: 10, xp: 100 },
          nextScene: "crypt_entrance",
        },

        onDefeat: {
          narrative: `I lupi sono troppo forti! ❌ GAME OVER`,
          nextScene: "game_over",
        }
      },

      // ────────────────────────────────────────
      // ATTO 3: La Cripta
      // ────────────────────────────────────────
      crypt_entrance: {
        id: "crypt_entrance",
        title: "L'Ingresso della Cripta",
        type: "exploration",
        background: "/bg/crypt_entrance.jpg",
        music: "explore",

        narrative: `Dopo il combattimento, continuate il viaggio. Davanti a voi si erge la cripta: un'antica struttura di pietra coperta di muschio e rovi.

Un enorme portone di pietra blocca l'ingresso. Su di esso sono incisi strani simboli che brillano di una debole luce blu.

Vicino al portone, notate un teschio umano appoggiato a terra.`,

        // Mappa interattiva
        interactiveObjects: [
          {
            id: "stone_door",
            name: "Portone di Pietra",
            icon: "🚪",
            position: { x: 50, y: 40 },
            description: "Un massiccio portone con simboli magici incisi.",
          },
          {
            id: "skull",
            name: "Teschio",
            icon: "💀",
            position: { x: 30, y: 60 },
            description: "Un teschio umano antico.",
          },
          {
            id: "trees",
            name: "Alberi Morti",
            icon: "🌳",
            position: { x: 20, y: 20 },
            description: "Alberi secchi e contorti.",
          }
        ],

        // Azioni disponibili
        choices: [
          {
            id: "examine_door",
            text: "🔍 Esamina il portone di pietra",
            type: "skill_check",
            skill: "arcana",
            dc: 10,
            onSuccess: {
              narrative: `Riconoscete i simboli! Sono rune arcane antiche. Sembrano formare un enigma...

I simboli rappresentano le quattro stagioni:
🌸 Primavera | ☀️ Estate | 🍂 Autunno | ❄️ Inverno

Sotto c'è scritto in lettere antiche:
"Quando la neve si scioglie, io arrivo.
Quando il caldo brucia, io fiorisco.
Prima dell'inverno, io cado.
Nel gelo, io dormo."

Quale simbolo devi premere?`,
              nextScene: "crypt_door_puzzle",
            },
            onFailure: {
              narrative: `I simboli sono incomprensibili. Sembrano solo decorazioni antiche.

Forse qualcun altro nel party sa qualcosa...`,
              nextScene: "crypt_entrance", // Riprova
            }
          },
          {
            id: "examine_skull",
            text: "💀 Esamina il teschio",
            type: "skill_check",
            skill: "investigation",
            dc: 12,
            onSuccess: {
              narrative: `Sollevi il teschio con cautela. È antico, ma qualcosa è inciso all'interno...

"Solo il ciclo eterno apre la via"

Sembra un indizio per l'enigma del portone!`,
              nextScene: "crypt_entrance",
            },
            onFailure: {
              narrative: `È solo un teschio vecchio. Niente di interessante.`,
              nextScene: "crypt_entrance",
            }
          },
          {
            id: "force_door",
            text: "💪 Prova a forzare il portone",
            type: "skill_check",
            skill: "athletics",
            dc: 18, // Molto difficile!
            onSuccess: {
              narrative: `Con uno sforzo immane, riesci a spostare leggermente il portone! Le rune si spengono.

Il portone si apre con un gemito profondo...

Ma qualcosa è andato storto. Senti una voce antica sussurrare: "Gli stolti pagano il prezzo..."

💥 Tutti subiscono 1d6 danni da forza magica!

La porta è aperta, ma a che prezzo?`,
              rewards: { damage: "1d6", damageType: "force" },
              nextScene: "crypt_corridor",
            },
            onFailure: {
              narrative: `Il portone non si muove di un millimetro. È sigillato dalla magia.`,
              nextScene: "crypt_entrance",
            }
          }
        ]
      },

      // Continuare con altre scene...
      // ...
    }
  }
};

// Funzione helper per ottenere un'avventura
export function getAdventure(adventureId) {
  return ADVENTURES[adventureId];
}

// Funzione helper per ottenere una scena
export function getScene(adventureId, sceneId) {
  const adventure = ADVENTURES[adventureId];
  return adventure?.scenes[sceneId];
}
