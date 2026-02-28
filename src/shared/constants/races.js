// ═══════════════════════════════════════════════
//  RAZZE D&D 5e — Dati ufficiali Player's Handbook
// ═══════════════════════════════════════════════

export const RACES = [
  {
    id: "human",
    name: "Umano",
    icon: "game-icons:human-target",
    color: "#c8a97a",
    description: "Versatili e ambiziosi, gli umani eccellono in qualsiasi classe.",
    speed: 30,
    size: "Medium",
    abilityBonuses: { strength:1, dexterity:1, constitution:1, intelligence:1, wisdom:1, charisma:1 },
    traits: [
      { name: "Extra linguaggio", desc: "Parli un linguaggio extra a tua scelta." },
      { name: "Extra abilità", desc: "Ottieni competenza in un'abilità extra a tua scelta." },
    ],
    subraces: [],
  },
  {
    id: "elf",
    name: "Elfo",
    icon: "game-icons:elf-ear",
    color: "#7ec8a4",
    description: "Creature magiche di straordinaria grazia.",
    speed: 30,
    size: "Medium",
    abilityBonuses: { dexterity: 2 },
    traits: [
      { name: "Visione nel buio", desc: "60 piedi di visione nel buio." },
      { name: "Sensi acuti", desc: "Competenza in Percezione." },
      { name: "Discendenza fatata", desc: "Vantaggio ai tiri salvezza contro incantesimi affascinanti. Immunità al sonno magico." },
      { name: "Trance", desc: "Non hai bisogno di dormire. Riposi meditando per 4 ore." },
    ],
    subraces: [
      {
        id: "high_elf",
        name: "Alto Elfo",
        abilityBonuses: { intelligence: 1 },
        traits: [{ name: "Trucchetto", desc: "Conosci un trucchetto del mago." }],
      },
      {
        id: "wood_elf",
        name: "Elfo del Bosco",
        abilityBonuses: { wisdom: 1 },
        traits: [
          { name: "Passo del bosco", desc: "Ignori i terreni difficili non magici di piante." },
          { name: "Nascondersi nel bosco", desc: "Puoi tentare di nasconderti anche quando sei leggermente oscurato da fogliame." },
        ],
        speed: 35,
      },
      {
        id: "drow",
        name: "Drow (Elfo Oscuro)",
        abilityBonuses: { charisma: 1 },
        traits: [
          { name: "Visione nel buio superiore", desc: "120 piedi di visione nel buio." },
          { name: "Sensibilità alla luce solare", desc: "Svantaggio agli attacchi e Percezione alla luce solare diretta." },
          { name: "Magia del drow", desc: "Conosci il trucchetto Luci Danzanti." },
        ],
      },
    ],
  },
  {
    id: "dwarf",
    name: "Nano",
    icon: "game-icons:dwarf-helmet",
    color: "#b87333",
    description: "Robusti e resistenti, con una grande affinità per la pietra e il metallo.",
    speed: 25,
    size: "Medium",
    abilityBonuses: { constitution: 2 },
    traits: [
      { name: "Visione nel buio", desc: "60 piedi di visione nel buio." },
      { name: "Resilienza nanica", desc: "Vantaggio ai tiri salvezza contro veleno. Resistenza ai danni da veleno." },
      { name: "Addestramento al combattimento nanico", desc: "Competenza con ascia da guerra, mannaia, martello da guerra, martello leggero." },
      { name: "Abilità con gli strumenti", desc: "Competenza con strumenti di artigiano a tua scelta." },
      { name: "Senso della pietra", desc: "Vantaggio alle prove di storia riguardanti l'origine di oggetti di pietra." },
    ],
    subraces: [
      {
        id: "hill_dwarf",
        name: "Nano delle Colline",
        abilityBonuses: { wisdom: 1 },
        traits: [{ name: "Tenacia nanica", desc: "+1 HP massimi per ogni livello." }],
      },
      {
        id: "mountain_dwarf",
        name: "Nano delle Montagne",
        abilityBonuses: { strength: 2 },
        traits: [{ name: "Addestramento con le armature naniche", desc: "Competenza con armature leggere e medie." }],
      },
    ],
  },
  {
    id: "halfling",
    name: "Halfling",
    icon: "game-icons:barefoot",
    color: "#d4a76a",
    description: "Piccoli e agili, con la fortuna dalla loro parte.",
    speed: 25,
    size: "Small",
    abilityBonuses: { dexterity: 2 },
    traits: [
      { name: "Fortunato", desc: "Quando ottieni un 1 su un attacco, tiro salvezza o prova di caratteristica, puoi ritirare il dado." },
      { name: "Coraggioso", desc: "Vantaggio ai tiri salvezza contro la paura." },
      { name: "Agilità halfling", desc: "Puoi muoverti attraverso lo spazio di qualsiasi creatura di taglia superiore." },
    ],
    subraces: [
      {
        id: "lightfoot",
        name: "Piediveloci",
        abilityBonuses: { charisma: 1 },
        traits: [{ name: "Naturaliter nascosto", desc: "Puoi tentare di nasconderti quando sei oscurato da una creatura di taglia Medium o superiore." }],
      },
      {
        id: "stout",
        name: "Robusti",
        abilityBonuses: { constitution: 1 },
        traits: [{ name: "Resilienza dei robusti", desc: "Vantaggio ai tiri salvezza contro veleno. Resistenza ai danni da veleno." }],
      },
    ],
  },
  {
    id: "half_elf",
    name: "Mezzosangue",
    icon: "game-icons:fairy",
    color: "#9b7ec8",
    description: "Con un piede in entrambi i mondi, versatili e affascinanti.",
    speed: 30,
    size: "Medium",
    abilityBonuses: { charisma: 2 },
    extraAbilityPoints: 2, // 2 punti da distribuire liberamente
    traits: [
      { name: "Visione nel buio", desc: "60 piedi di visione nel buio." },
      { name: "Discendenza fatata", desc: "Vantaggio ai tiri salvezza contro incantesimi affascinanti. Immunità al sonno magico." },
      { name: "Versatilità delle abilità", desc: "Competenza in 2 abilità a tua scelta." },
    ],
    subraces: [],
  },
  {
    id: "half_orc",
    name: "Mezzorco",
    icon: "game-icons:orc-head",
    color: "#5a7a4a",
    description: "Forti e tenaci, con una resistenza straordinaria.",
    speed: 30,
    size: "Medium",
    abilityBonuses: { strength: 2, constitution: 1 },
    traits: [
      { name: "Visione nel buio", desc: "60 piedi di visione nel buio." },
      { name: "Minaccioso", desc: "Competenza nell'abilità Intimidire." },
      { name: "Resistenza implacabile", desc: "Quando scendi a 0 HP, puoi scendere invece a 1 HP (1 volta per riposo lungo)." },
      { name: "Attacchi selvaggi", desc: "Quando ottieni un critico, aggiungi un dado di danno extra." },
    ],
    subraces: [],
  },
  {
    id: "tiefling",
    name: "Tiefling",
    icon: "game-icons:devil-mask",
    color: "#c8334a",
    description: "Discendenti da patti infernali, con doti magiche innate.",
    speed: 30,
    size: "Medium",
    abilityBonuses: { intelligence: 1, charisma: 2 },
    traits: [
      { name: "Visione nel buio", desc: "60 piedi di visione nel buio." },
      { name: "Resistenza infernale", desc: "Resistenza ai danni da fuoco." },
      { name: "Eredità infernale", desc: "Conosci il trucchetto Thaumaturgy. A livello 3: Hellish Rebuke. A livello 5: Darkness." },
    ],
    subraces: [],
  },
  {
    id: "dragonborn",
    name: "Draconico",
    icon: "game-icons:dragon-head",
    color: "#c86420",
    description: "Discendenti dei draghi, con un soffio elementale.",
    speed: 30,
    size: "Medium",
    abilityBonuses: { strength: 2, charisma: 1 },
    traits: [
      {
        name: "Ascendenza draconica",
        desc: "Scegli un tipo di drago. Determina il tuo soffio e resistenza.",
        options: [
          { id: "black", name: "Nero (Acido)", breathType: "acid", damageType: "acid" },
          { id: "blue", name: "Blu (Fulmine)", breathType: "lightning", damageType: "lightning" },
          { id: "brass", name: "Ottone (Fuoco)", breathType: "fire", damageType: "fire" },
          { id: "bronze", name: "Bronzo (Fulmine)", breathType: "lightning", damageType: "lightning" },
          { id: "copper", name: "Rame (Acido)", breathType: "acid", damageType: "acid" },
          { id: "gold", name: "Oro (Fuoco)", breathType: "fire", damageType: "fire" },
          { id: "green", name: "Verde (Veleno)", breathType: "poison", damageType: "poison" },
          { id: "red", name: "Rosso (Fuoco)", breathType: "fire", damageType: "fire" },
          { id: "silver", name: "Argento (Freddo)", breathType: "cold", damageType: "cold" },
          { id: "white", name: "Bianco (Freddo)", breathType: "cold", damageType: "cold" },
        ],
      },
      { name: "Soffio", desc: "Usabile 1 volta per riposo corto. CD Costituzione = 8 + bonus competenza + modificatore COS." },
      { name: "Resistenza ai danni", desc: "Resistenza al tipo di danno della tua ascendenza." },
    ],
    subraces: [],
  },
  {
    id: "gnome",
    name: "Gnomo",
    icon: "game-icons:wizard-staff",
    color: "#7ab87a",
    description: "Inventivi e curiosi, con una naturale affinità per la magia.",
    speed: 25,
    size: "Small",
    abilityBonuses: { intelligence: 2 },
    traits: [
      { name: "Visione nel buio", desc: "60 piedi di visione nel buio." },
      { name: "Astuzia gnomica", desc: "Vantaggio a tutti i tiri salvezza contro magia di INT, WIS e CHA." },
    ],
    subraces: [
      {
        id: "forest_gnome",
        name: "Gnomo del Bosco",
        abilityBonuses: { dexterity: 1 },
        traits: [
          { name: "Illusionista naturale", desc: "Conosci il trucchetto Minor Illusion." },
          { name: "Parla con i piccoli animali", desc: "Puoi comunicare con bestie di piccola taglia." },
        ],
      },
      {
        id: "rock_gnome",
        name: "Gnomo delle Rocce",
        abilityBonuses: { constitution: 1 },
        traits: [
          { name: "Conoscitore di artefatti", desc: "Competenza con strumenti degli artigiani (tinker's tools)." },
          { name: "Inventore", desc: "Puoi costruire piccoli congegni meccanici." },
        ],
      },
    ],
  },
];

export function getRaceById(id) {
  return RACES.find(r => r.id === id) || null;
}

export function getSubraceById(raceId, subraceId) {
  const race = getRaceById(raceId);
  if (!race) return null;
  return race.subraces.find(s => s.id === subraceId) || null;
}

// Calcola i bonus alle caratteristiche combinando razza + sottorazza
export function getTotalAbilityBonuses(raceId, subraceId = null) {
  const race = getRaceById(raceId);
  if (!race) return {};

  const bonuses = { ...race.abilityBonuses };

  if (subraceId) {
    const subrace = getSubraceById(raceId, subraceId);
    if (subrace?.abilityBonuses) {
      Object.entries(subrace.abilityBonuses).forEach(([stat, val]) => {
        bonuses[stat] = (bonuses[stat] || 0) + val;
      });
    }
  }

  return bonuses;
}
