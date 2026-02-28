// Saving Throws D&D 5e (Tiri Salvezza)
export const SAVING_THROWS = [
  {
    id: "strength",
    label: "Forza",
    shortLabel: "FOR",
    color: "#c74440",
    description: "Resistere a effetti fisici, spinte, trattenute"
  },
  {
    id: "dexterity",
    label: "Destrezza",
    shortLabel: "DES",
    color: "#4a9f4a",
    description: "Schivare esplosioni, trappole, effetti ad area"
  },
  {
    id: "constitution",
    label: "Costituzione",
    shortLabel: "COS",
    color: "#ff8833",
    description: "Resistere a veleni, malattie, morte"
  },
  {
    id: "intelligence",
    label: "Intelligenza",
    shortLabel: "INT",
    color: "#4a9fd8",
    description: "Resistere a illusioni, effetti mentali"
  },
  {
    id: "wisdom",
    label: "Saggezza",
    shortLabel: "SAG",
    color: "#9f7fd8",
    description: "Resistere a charme, paura, dominazione"
  },
  {
    id: "charisma",
    label: "Carisma",
    shortLabel: "CAR",
    color: "#d87fa0",
    description: "Resistere a possessione, esilio planare"
  },
];

// Helper per calcolare bonus salvezza
export const calculateSavingThrowBonus = (character, abilityId) => {
  if (!character) return 0;

  // Mappa ability ID -> stat abbrev
  const abilityMap = {
    strength: 'for',
    dexterity: 'des',
    constitution: 'cos',
    intelligence: 'int',
    wisdom: 'sag',
    charisma: 'car'
  };

  const statKey = abilityMap[abilityId];
  if (!statKey) return 0;

  // Calcola modificatore dall'abilità
  const abilityScore = character[statKey] || 10;
  const abilityModifier = Math.floor((abilityScore - 10) / 2);

  // Controlla se ha proficiency in questo save
  const saveProficiencies = character.save_proficiencies || [];
  const hasProficiency = saveProficiencies.includes(abilityId);

  // Bonus proficiency (default +2, scala con livello)
  const proficiencyBonus = character.proficiency_bonus || 2;

  return abilityModifier + (hasProficiency ? proficiencyBonus : 0);
};
