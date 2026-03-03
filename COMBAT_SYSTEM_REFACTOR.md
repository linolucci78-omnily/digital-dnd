# 🎯 Sistema Combattimento Professionale - Piano di Refactoring

## 📊 ANALISI SISTEMA ESISTENTE

### ✅ Cosa FUNZIONA GIÀ:

**BattleGrid.jsx** (DM Panel):
- ✅ Layout Mappa (sinistra) + Sidebar Tokens (destra) **→ PERFETTO!**
- ✅ Drag & drop Heroes/Monsters/NPCs sulla mappa
- ✅ Fog of War editing (reveal/hide tool)
- ✅ Grid configurabile (cellSize, opacity, visible)
- ✅ Token positioning su griglia
- ✅ Broadcast verso TV via Supabase Realtime:
  - `token_update` (add, move, remove, update_hp)
  - `fog_update` (enabled, imageData)
  - `grid_update` (cellSize, gridOpacity, gridVisible)

**TVScreen.jsx** (TV per giocatori):
- ✅ Rendering mappa + griglia
- ✅ Token animati con HP ring visivo (colori: verde→giallo→rosso)
- ✅ Glow effect su token del turno corrente
- ✅ Fog of War overlay
- ✅ Animazioni smooth per movimento token
- ✅ Sistema dadi 3D con particelle (DiceRollDisplay component)
- ✅ Gestione combat state (initiative, currentTurn, round)
- ✅ Eventi broadcast: combat_started, turn_changed, combat_ended

**DMPanel.jsx** (Tab principale DM):
- ✅ Gestione mostri (aggiungi, HP, iniziativa)
- ✅ Combat log
- ✅ Sistema attacco (seleziona bersaglio, tira d20, calcola danno)
- ✅ Turni e round tracking
- ❌ **PROBLEMA:** BattleGrid è in sub-tab "Mappa" separato

---

## 🎯 COSA IMPLEMENTARE (Visione Professionale)

### 1. **TAB COMBATTIMENTO UNIFICATO**

**Layout target:**
```
┌────────────────────────────────────────────────────┬──────────┐
│  🎯 TURNO: Theron | Round 2 | Next: Goblin         │  TOKENS  │
├────────────────────────────────────────────────────┤          │
│                                                    │  👤 EROI │
│              BATTLE GRID                           │  □ Theron│
│              (MAPPA GRANDE)                        │  □ Lyra  │
│                                                    │          │
│  • Drag & drop token                              │  💀 MOSTRI│
│  • Click token → menu contestuale                 │  □ Goblin│
│  • Fog of War editing                             │  □ Orco  │
│  • Grid controls in toolbar                       │  (drag→) │
│                                                    │          │
│                                                    │  🎒 ITEMS│
│                                                    │  □ Trap  │
└────────────────────────────────────────────────────┴──────────┘
│  [🎲 INIZIA COMBAT] [⏭️ TURNO SUCC] [🛑 FINE]            │
└──────────────────────────────────────────────────────────────┘
```

### 2. **MENU CONTESTUALE SU TOKEN** (DM Panel)

Click destro (o click) su token → menu popup:
```
┌──────────────────┐
│ 👤 Theron        │
├──────────────────┤
│ ⚔️  Attacca      │
│ 💗 Modifica HP   │
│ ℹ️  Info Stats   │
│ 📍 Centra Mappa  │
│ 🗑️  Rimuovi      │
└──────────────────┘
```

**Click "Attacca" →**
1. Mostra sottomenu: seleziona bersaglio (lista token enemy)
2. DM conferma → broadcast evento `attack_started`
3. TV mostra animazione dadi 3D + risultato
4. Se colpisce → broadcast `damage_dealt` → TV mostra danno sul token

### 3. **ANIMAZIONI COMBATTIMENTO SULLA TV**

**Evento: `attack_started`**
```javascript
payload: {
  attackerId: "goblin_1",
  targetId: "hero_1",
  attackerName: "Goblin",
  targetName: "Theron",
  rollType: "attack", // "attack" | "save" | "ability"
  dice: ["d20"],
  bonus: 4
}
```
→ TV mostra:
- ⚔️ "Goblin attacca Theron!"
- 🎲 Dadi 3D rotolano
- ✨ Risultato: "18 - Colpito!"

**Evento: `damage_dealt`**
```javascript
payload: {
  targetId: "hero_1",
  damage: 7,
  damageType: "slashing",
  newHp: 38
}
```
→ TV mostra:
- 💥 Numero "7" appare sul token in rosso
- HP ring si riduce con animazione
- Particelle rosse
- (opzionale) Token shake effect

**Evento: `effect_applied`**
```javascript
payload: {
  targetId: "hero_1",
  effect: "poisoned",
  duration: 3 // rounds
}
```
→ TV mostra:
- 🧪 Icona status effect appare sopra token
- Colore overlay sul token (verde per poison, ecc)

---

## 🔧 IMPLEMENTAZIONE - ROADMAP

### **FASE 1: Layout Unificato** ✅ (Quick Win)
- [x] Rimuovere sub-tab (Prepara, Mappa, Combatti)
- [x] Integrare BattleGrid direttamente nel tab Combattimento
- [ ] Spostare controlli combat (INIZIA, TURNO SUCC, FINE) in toolbar sotto mappa
- [ ] Mantenere combat log compatto in sidebar (opzionale) o in overlay

**File da modificare:**
- `src/dm/DMPanel.jsx` → refactor tab "combat" rendering

**Tempo stimato:** 2-3 ore

---

### **FASE 2: Menu Contestuale Token** 🎯 (Core Feature)
- [ ] Aggiungere state `selectedToken` e `contextMenu` in BattleGrid
- [ ] Implementare handler `onTokenClick(token)`
- [ ] Creare component `TokenContextMenu` con opzioni:
  - Attacca → apre dialog selezione bersaglio
  - Modifica HP → input rapido
  - Info → mostra stats complete
  - Rimuovi → conferma + rimuovi token
- [ ] Styling menu (glass-card, dropdown elegante)

**File da modificare:**
- `src/dm/BattleGrid.jsx` → aggiungere menu logic
- (opzionale) `src/dm/components/TokenContextMenu.jsx` → nuovo component

**Tempo stimato:** 3-4 ore

---

### **FASE 3: Sistema Attacco Integrato** ⚔️ (Combat Core)
- [ ] Quando DM click "Attacca" da menu → mostra dialog:
  - Lista bersagli disponibili (token nemici sulla mappa)
  - Tipo attacco (arma, incantesimo, ecc)
  - Bonus manuale (opzionale)
- [ ] Click "Tira Attacco" → broadcast `attack_roll`
- [ ] Se colpisce → mostra dialog danno → broadcast `damage_dealt`
- [ ] Aggiornare HP token locale + sync TV

**Nuovi eventi broadcast:**
```javascript
// In BattleGrid.jsx
const broadcastAttackRoll = async (attackData) => {
  await tvChannel.send({
    type: 'broadcast',
    event: 'attack_roll',
    payload: attackData
  });
};

const broadcastDamage = async (damageData) => {
  await tvChannel.send({
    type: 'broadcast',
    event: 'damage_dealt',
    payload: damageData
  });
};
```

**File da modificare:**
- `src/dm/BattleGrid.jsx` → attack system
- `src/tv/TVScreen.jsx` → listeners + animazioni

**Tempo stimato:** 4-5 ore

---

### **FASE 4: Animazioni TV Avanzate** ✨ (Polish)
- [ ] Creare component `AttackAnimation`:
  - Linea freccia da attaccante → bersaglio
  - Dadi 3D animati (già esiste DiceRollDisplay)
  - Risultato con particelle
- [ ] Creare component `DamageNumber`:
  - Numero danno appare sopra token
  - Fade out verso l'alto (come nei videogame)
  - Colori: rosso (danno), verde (heal), blu (mana)
- [ ] Integrare con HP ring animation (già esistente)
- [ ] Aggiungere shake effect su token quando colpito

**File da creare:**
- `src/tv/components/AttackAnimation.jsx`
- `src/tv/components/DamageNumber.jsx`

**File da modificare:**
- `src/tv/TVScreen.jsx` → integrare animazioni

**Tempo stimato:** 5-6 ore

---

### **FASE 5: Status Effects** 🧪 (Extra Feature)
- [ ] Aggiungere icone status sopra token TV:
  - Poisoned (verde), Stunned (giallo), Invisible (grigio trasparente)
  - Badge numerato per duration (es. "3" rounds)
- [ ] DM può applicare effects da menu contestuale
- [ ] Auto-decrement duration ogni turno
- [ ] Broadcast `effect_applied`, `effect_removed`

**Tempo stimato:** 3-4 ore

---

## 📦 TOTALE IMPLEMENTAZIONE

**Priorità ALTA (MVP):**
- Fase 1 + Fase 2 + Fase 3 = **~10 ore**
  → Risultato: Sistema combat completamente funzionale e professionale

**Priorità MEDIA (Polish):**
- Fase 4 = **+6 ore**
  → Risultato: Esperienza visiva cinematografica sulla TV

**Priorità BASSA (Nice-to-have):**
- Fase 5 = **+4 ore**
  → Risultato: Sistema status effects completo

**TOTALE COMPLETO:** ~20 ore di sviluppo meticoloso

---

## ✅ VANTAGGI RISPETTO A SISTEMA ATTUALE

| Caratteristica | Prima | Dopo |
|----------------|-------|------|
| Layout | Sub-tab separati (Prepara/Mappa/Combatti) | **Tutto in un tab unificato** |
| Workflow | Tanti click per switchare | **Zero switching** |
| Token interaction | Solo drag & drop | **Menu contestuale professionale** |
| Attacchi | UI separata lontano dalla mappa | **Click su token → Attacca** |
| TV experience | Solo mappa statica | **Animazioni dadi + danni + effetti** |
| Professionalità | Buona | **Roll20/Foundry VTT level** |

---

## 🎬 USER STORY FINALE

**Setup combat:**
1. DM va su tab "Combattimento"
2. Drag Goblin dalla sidebar → mappa (TV lo vede apparire)
3. Drag Orco → mappa
4. Click bottone "INIZIA COMBATTIMENTO" → tira iniziativa

**Durante combat:**
1. DM click destro su Goblin → "Attacca"
2. Seleziona Theron come bersaglio
3. Conferma → **TV mostra dadi 3D che rotolano**
4. Risultato: 18 → "COLPITO!" sulla TV
5. DM inserisce danno: 7 → **TV mostra "💥 7" sul token di Theron**
6. HP ring di Theron si riduce con animazione smooth
7. DM click "TURNO SUCCESSIVO" → TV mostra "È il turno di Lyra"

**Esperienza giocatori (TV):**
- Vedono la mappa tattica sempre aggiornata
- Animazioni cinematografiche per ogni azione
- Capiscono subito chi attacca chi
- Numeri danno chiari e visibili
- Turn banner elegante
- Nessun "backend" visibile (solo la scena)

---

## 🚀 READY TO START?

Sistema **architetturalmente pronto** per l'implementazione.
Posso procedere con:
1. **Fase 1 + 2** subito (layout + menu) → ~6 ore → risultato già molto professionale
2. **Fase 3** dopo → attacchi funzionali
3. **Fase 4 + 5** opzionali per polish

Confermi di procedere? 🎯
