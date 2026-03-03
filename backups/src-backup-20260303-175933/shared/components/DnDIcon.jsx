// ═══════════════════════════════════════════════
//  DnDIcon — Icone medievali professionali
//  Usa @iconify/react con game-icons (stile D&D vintage)
// ═══════════════════════════════════════════════

import { Icon } from "@iconify/react";

// Mappa nomi icone logici → game-icons
const ICON_MAP = {
  // Caratteristiche
  strength: "game-icons:weight-lifting-up",
  dexterity: "game-icons:quick-man",
  constitution: "game-icons:muscle-up",
  intelligence: "game-icons:wisdom",
  wisdom: "game-icons:owl",
  charisma: "game-icons:crowned-heart",

  // Stats
  sword: "game-icons:sword-brandish",
  shield: "game-icons:shield",
  armor: "game-icons:chest-armor",
  boot: "game-icons:sprint",
  heart: "game-icons:hearts",
  skull: "game-icons:skull",

  // Abilità
  athletics: "game-icons:muscle-up",
  acrobatics: "game-icons:cartwheel",
  sleightOfHand: "game-icons:hand",
  stealth: "game-icons:hood",
  arcana: "game-icons:surrounded-eye",
  history: "game-icons:bookshelf",
  investigation: "game-icons:magnifying-glass",
  nature: "game-icons:pine-tree",
  religion: "game-icons:praying-hands",
  animalHandling: "game-icons:wolf-howl",
  insight: "game-icons:third-eye",
  medicine: "game-icons:health-potion",
  perception: "game-icons:eye-target",
  survival: "game-icons:campfire",
  deception: "game-icons:drama-masks",
  intimidation: "game-icons:spiked-mace",
  performance: "game-icons:trumpet",
  persuasion: "game-icons:conversation",

  // Magie
  spell: "game-icons:magic-swirl",
  spellBook: "game-icons:spell-book",
  fireball: "game-icons:fireball",
  lightning: "game-icons:lightning-bolt",
  heal: "game-icons:health-increase",

  // Azioni
  dice: "game-icons:perspective-dice-six-faces-random",
  diceD20: "game-icons:dice-twenty-faces-twenty",
  attack: "game-icons:sword-clash",
  defend: "game-icons:round-shield",
  explore: "game-icons:treasure-map",
  search: "game-icons:magnifying-glass",

  // Items
  backpack: "game-icons:knapsack",
  potion: "game-icons:potion-ball",
  scroll: "game-icons:scroll-unfurled",
  coin: "game-icons:gold-stack",
  gem: "game-icons:diamonds",

  // UI
  menu: "game-icons:hamburger-menu",
  close: "game-icons:cross",
  check: "game-icons:checkmark",
  arrow: "game-icons:arrow-cursor",
  crown: "game-icons:crown",
  key: "game-icons:key",
  star: "game-icons:star-formation",
  book: "game-icons:book-cover",
  screen: "game-icons:screen",
  phone: "game-icons:smartphone",

  // Locations
  castle: "game-icons:castle",
  dungeon: "game-icons:dungeon-gate",
  door: "game-icons:door-handle",
  chest: "game-icons:treasure-chest",
  cave: "game-icons:cave-entrance",
  forest: "game-icons:forest",
  mountain: "game-icons:mountain-cave",

  // NPCs
  npc: "game-icons:person",
  merchant: "game-icons:merchant",
  guard: "game-icons:guards",
  monster: "game-icons:creature",
  dragon: "game-icons:dragon-head",

  // Rest
  shortRest: "game-icons:night-sleep",
  longRest: "game-icons:bed",

  // Combat
  initiative: "game-icons:hourglass",
  damage: "game-icons:bleeding-wound",

  // Map
  map: "game-icons:world",
  compass: "game-icons:compass",
  flag: "game-icons:checkpoint",

  // Inventory & Equipment
  weapon: "game-icons:crossed-swords",
  weaponMain: "game-icons:broad-dagger",
  weaponOff: "game-icons:stiletto",
  money: "game-icons:two-coins",
  goldCoin: "game-icons:gold-bar",
  silverCoin: "game-icons:shiny-purse",
  copperCoin: "game-icons:receive-money",

  // Conditions (Status Effects)
  blinded: "game-icons:bleeding-eye",
  charmed: "game-icons:charm",
  deafened: "game-icons:ringing-bell",
  frightened: "game-icons:terror",
  grappled: "game-icons:grab",
  incapacitated: "game-icons:drowsy",
  invisible: "game-icons:invisible",
  paralyzed: "game-icons:frozen-body",
  petrified: "game-icons:stone-pile",
  poisoned: "game-icons:poison-bottle",
  prone: "game-icons:person-in-bed",
  restrained: "game-icons:chain",
  stunned: "game-icons:stars-stack",
  unconscious: "game-icons:coma",

  // Spell/Magic
  concentration: "game-icons:psychic-waves",
  inspiration: "game-icons:star-medal",
};

export default function DnDIcon({ icon, size = 24, color = "currentColor", style = {}, className = "" }) {
  const iconName = ICON_MAP[icon] || icon;

  return (
    <Icon
      icon={iconName}
      width={size}
      height={size}
      style={{ color, ...style }}
      className={className}
    />
  );
}

// Esporta anche la mappa per uso diretto
export { ICON_MAP };
