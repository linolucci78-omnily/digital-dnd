# Combat Unificato — Istruzioni

## Cosa è cambiato

### 1 file modificato: `src/dm/DMPanel.jsx`

### Cosa è stato fatto:
- **Rimosso** il tab "Battaglia" (era `tab === "map"`) dalla lista `DM_TABS`
- **Spostato** BattleGrid + upload mappa **dentro** il tab "Combattimento"
- **Spostato** il combat log **dentro** il tab "Combattimento"
- **Rimosso** tutto il blocco JSX del vecchio tab Mappa standalone

### Da 8 tab a 7:
1. Gruppo
2. Scene  
3. **Combattimento** ← ora contiene: Mappa + BattleGrid + Mostri + Iniziativa + Turni + Attacchi + Log
4. Narrativa
5. NPC
6. Tesoro
7. Dadi DM

### Layout del tab Combattimento unificato:
```
┌─────────────────────────────────┐
│  MAPPA DI BATTAGLIA             │
│  [BattleGrid 350px height]      │
│  oppure [Upload mappa button]   │
├─────────────────────────────────┤
│  LOG COMBATTIMENTO (compact)    │
│  (ultimi 5 eventi, scrollable)  │
├─────────────────────────────────┤
│  CONTROLLI COMBATTIMENTO        │
│  - Mostri predefiniti           │
│  - Aggiungi mostro custom       │
│  - Lista mostri aggiunti        │
│  - Tira iniziativa              │
│  - Turno successivo / Fine      │
│  - Ordine iniziativa            │
└─────────────────────────────────┘
```

### Nessun file aggiunto o rimosso
### Nessuna dipendenza cambiata
### BattleGrid.jsx NON è stato toccato — funziona identico

## Come applicare
Sostituisci `src/dm/DMPanel.jsx` con il file in questa cartella.
