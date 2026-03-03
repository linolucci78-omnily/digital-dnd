# Combat Unificato v2 — Con Sub-Tab

## File da mettere nel progetto (3 file):

```
src/
├── dm/
│   ├── DMPanel.jsx          ← SOSTITUISCI
│   └── ScenePanel.jsx       ← AGGIUNGI (file nuovo)
└── shared/
    └── components/
        └── DnDIcon.jsx      ← AGGIUNGI se non esiste
```

## Ordine: DnDIcon → ScenePanel → DMPanel

---

## Cosa è cambiato

### 7 tab principali (era 8+):
Gruppo | Scene | **Combattimento** | Narrativa | NPC | Tesoro | Dadi DM

### Il tab Combattimento ha 3 SUB-TAB interni:

```
┌──────────────────────────────────────────────┐
│  [Prepara]    [Mappa]    [Combatti]          │
│   ^^^^^^^^                                    │
│   attivo di default                           │
└──────────────────────────────────────────────┘
```

### SUB-TAB "Prepara" (default):
- Mostri predefiniti (Goblin, Orco, ecc.)
- Crea mostro personalizzato
- Lista mostri aggiunti con HP
- Pulsante "INIZIA COMBATTIMENTO"
- Durante il combat: mostra i controlli attacco su ogni mostro

### SUB-TAB "Mappa":
- BattleGrid a SCHERMO PIENO
- Upload mappa se non c'è
- Token drag & drop
- Fog of war
- Come il vecchio tab "Battaglia" ma dentro Combattimento

### SUB-TAB "Combatti" (appare solo durante il combat):
- Mini anteprima mappa (click per tornare alla mappa)
- Log combattimento
- Pulsanti TURNO SUCCESSIVO / FINE
- Ordine iniziativa completo

---

## Il flusso del DM:

### PRIMA del combattimento:
1. Vai su **Combattimento** → sei su **Prepara**
2. Clicca sui mostri per aggiungerli
3. Se vuoi, vai su **Mappa** per caricare una mappa e posizionare token
4. Torna su **Prepara** → clicca **INIZIA COMBATTIMENTO**

### DURANTE il combattimento:
1. Resti su **Prepara** — i mostri ora mostrano i controlli attacco
2. Clicca un mostro → scegli bersaglio → tira attacco
3. Quando vuoi vedere l'ordine turni → clicca **Combatti** (ha un pallino rosso pulsante)
4. Per vedere/spostare token → clicca **Mappa**
5. Per tornare ad attaccare → clicca **Prepara**

### FINE combattimento:
1. Da **Combatti** clicca **Fine** → torna automaticamente su **Prepara**
