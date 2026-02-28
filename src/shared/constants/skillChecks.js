// Skill Checks D&D 5e (Prove di Abilità)
export const SKILL_CHECKS = [
  // Forza
  {
    id: "athletics",
    label: "Atletica",
    ability: "strength",
    abilityLabel: "FOR",
    color: "#c74440",
    description: "Scalare, saltare, nuotare, lottare"
  },

  // Destrezza
  {
    id: "acrobatics",
    label: "Acrobazia",
    ability: "dexterity",
    abilityLabel: "DES",
    color: "#4a9f4a",
    description: "Equilibrio, capriole, evitare cadute"
  },
  {
    id: "sleight_of_hand",
    label: "Rapidità di Mano",
    ability: "dexterity",
    abilityLabel: "DES",
    color: "#4a9f4a",
    description: "Borseggiare, nascondere oggetti, manomettere serrature"
  },
  {
    id: "stealth",
    label: "Furtività",
    ability: "dexterity",
    abilityLabel: "DES",
    color: "#4a9f4a",
    description: "Muoversi di nascosto, nascondersi"
  },

  // Intelligenza
  {
    id: "arcana",
    label: "Arcano",
    ability: "intelligence",
    abilityLabel: "INT",
    color: "#4a9fd8",
    description: "Conoscenza di magia, incantesimi, oggetti magici"
  },
  {
    id: "history",
    label: "Storia",
    ability: "intelligence",
    abilityLabel: "INT",
    color: "#4a9fd8",
    description: "Ricordare eventi storici, leggende, antiche civiltà"
  },
  {
    id: "investigation",
    label: "Indagare",
    ability: "intelligence",
    abilityLabel: "INT",
    color: "#4a9fd8",
    description: "Cercare indizi, deduzioni logiche, trovare segreti"
  },
  {
    id: "nature",
    label: "Natura",
    ability: "intelligence",
    abilityLabel: "INT",
    color: "#4a9fd8",
    description: "Conoscenza di piante, animali, clima, terreno"
  },
  {
    id: "religion",
    label: "Religione",
    ability: "intelligence",
    abilityLabel: "INT",
    color: "#4a9fd8",
    description: "Conoscenza di divinità, riti, simboli sacri"
  },

  // Saggezza
  {
    id: "animal_handling",
    label: "Addestrare Animali",
    ability: "wisdom",
    abilityLabel: "SAG",
    color: "#9f7fd8",
    description: "Calmare, controllare, cavalcare animali"
  },
  {
    id: "insight",
    label: "Intuizione",
    ability: "wisdom",
    abilityLabel: "SAG",
    color: "#9f7fd8",
    description: "Capire intenzioni, leggere linguaggio del corpo"
  },
  {
    id: "medicine",
    label: "Medicina",
    ability: "wisdom",
    abilityLabel: "SAG",
    color: "#9f7fd8",
    description: "Stabilizzare morenti, diagnosticare malattie"
  },
  {
    id: "perception",
    label: "Percezione",
    ability: "wisdom",
    abilityLabel: "SAG",
    color: "#9f7fd8",
    description: "Notare dettagli, sentire rumori, vedere nemici nascosti"
  },
  {
    id: "survival",
    label: "Sopravvivenza",
    ability: "wisdom",
    abilityLabel: "SAG",
    color: "#9f7fd8",
    description: "Seguire tracce, cacciare, orientarsi, prevedere meteo"
  },

  // Carisma
  {
    id: "deception",
    label: "Inganno",
    ability: "charisma",
    abilityLabel: "CAR",
    color: "#d87fa0",
    description: "Mentire, travestirsi, ingannare"
  },
  {
    id: "intimidation",
    label: "Intimidire",
    ability: "charisma",
    abilityLabel: "CAR",
    color: "#d87fa0",
    description: "Minacciare, costringere con paura"
  },
  {
    id: "performance",
    label: "Intrattenere",
    ability: "charisma",
    abilityLabel: "CAR",
    color: "#d87fa0",
    description: "Musica, danza, recitazione, storytelling"
  },
  {
    id: "persuasion",
    label: "Persuasione",
    ability: "charisma",
    abilityLabel: "CAR",
    color: "#d87fa0",
    description: "Convincere, negoziare, influenzare con tatto"
  },
];

// Mappa abilità -> caratteristica abbreviata per calcolo
const ABILITY_STAT_MAP = {
  strength: 'for',
  dexterity: 'des',
  constitution: 'cos',
  intelligence: 'int',
  wisdom: 'sag',
  charisma: 'car'
};

// Helper per calcolare bonus skill check
export const calculateSkillCheckBonus = (character, skillId) => {
  if (!character) return 0;

  const skill = SKILL_CHECKS.find(s => s.id === skillId);
  if (!skill) return 0;

  // Trova il valore della caratteristica
  const statKey = ABILITY_STAT_MAP[skill.ability];
  const abilityScore = character[statKey] || 10;
  const abilityModifier = Math.floor((abilityScore - 10) / 2);

  // Controlla se ha proficiency in questa skill
  const skillProficiencies = character.skill_proficiencies || [];
  const hasProficiency = skillProficiencies.includes(skillId);

  // Bonus proficiency (default +2, scala con livello)
  const proficiencyBonus = character.proficiency_bonus || 2;

  return abilityModifier + (hasProficiency ? proficiencyBonus : 0);
};
