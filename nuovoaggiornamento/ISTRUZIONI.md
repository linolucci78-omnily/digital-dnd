# Combat Unificato — Pacchetto Completo

## 3 file da mettere nel progetto:

```
src/
├── dm/
│   ├── DMPanel.jsx          ← SOSTITUISCI
│   └── ScenePanel.jsx       ← AGGIUNGI (file nuovo)
└── shared/
    └── components/
        └── DnDIcon.jsx      ← AGGIUNGI se non esiste (cartella: shared-components/)
```

## Ordine:

1. **DnDIcon.jsx** → copia in `src/shared/components/DnDIcon.jsx`
   (se la cartella non esiste, creala)

2. **ScenePanel.jsx** → copia in `src/dm/ScenePanel.jsx`
   (file nuovo, non esisteva prima)

3. **DMPanel.jsx** → SOSTITUISCI `src/dm/DMPanel.jsx`
   (questo importa sia ScenePanel che DnDIcon, quindi vanno messi PRIMA)

## Cosa cambia rispetto al tuo progetto attuale:

- **DnDIcon**: componente icone medievali (sostituisce tutte le emoji)
- **ScenePanel**: unifica SceneManager + LocationManager in un solo componente
- **DMPanel**: 
  - Da 8+ tab a **7 tab**
  - Tab "Battaglia" ELIMINATO
  - BattleGrid ora è DENTRO il tab "Combattimento"
  - Il DM vede mappa + token + controlli combat tutto insieme

## Se qualcosa non va:
Il problema sarà sempre un file mancante. Controlla che tutti e 3 esistano nei path giusti.
