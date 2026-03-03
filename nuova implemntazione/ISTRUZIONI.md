# Refactor Scene/Mappe/Narrativa — Istruzioni

## Cosa è cambiato

### FILE NUOVI
- `ScenePanel.jsx` — Componente unificato che sostituisce SceneManager + LocationManager

### FILE MODIFICATI
- `DMPanel.jsx` — Aggiornato per usare ScenePanel, rimossi tab e import vecchi, emoji sostituite con DnDIcon

### FILE CHE PUOI ELIMINARE (non più importati)
- `SceneManager.jsx` — Sostituito da ScenePanel
- `LocationManager.jsx` — Sostituito da ScenePanel
- `AdventureManager.jsx` — Rimosso (lo ricostruirai meglio dopo)
- `StarterSetLoader.jsx` — Rimosso
- `CampaignGuideViewer.jsx` — Rimosso

### TAB DM PANEL — Prima vs Dopo

PRIMA (11 tab):
1. Campaign Guide
2. Starter Set
3. Gruppo
4. Scene (SceneManager)
5. Combattimento
6. NPC
7. Avventura (AdventureManager)
8. Narrativa
9. Tesoro
10. Mappa (BattleGrid + LocationManager)
11. Dadi DM

DOPO (8 tab):
1. Gruppo
2. Scene (ScenePanel — unificato)
3. Combattimento
4. Narrativa
5. Battaglia (BattleGrid — usa mappa dalla scena attiva)
6. NPC
7. Tesoro
8. Dadi DM

### Database

- Usa SOLO tabella `locations` + `points_of_interest` (come prima)
- La tabella `scenes` non è più usata dal codice (puoi eliminarla dal DB quando vuoi)
- La mappa attiva viene caricata da `locations` dove `is_current = true`
- `sessions.map_url` viene aggiornato quando si attiva una scena (per compatibilità con BattleGrid)

### Broadcast

- `scene_change` — Ora invia SEMPRE payload completo: { location, description, mapUrl, musicTrack, entryPoint }
- `poi_revealed` — Invariato
- Tutti i broadcast combat_*, dice_*, initiative_* — INVARIATI

### Come applicare

1. Copia `ScenePanel.jsx` in `src/dm/`
2. Sostituisci `DMPanel.jsx` con la versione aggiornata
3. (Opzionale) Elimina i file vecchi: SceneManager, LocationManager, AdventureManager, StarterSetLoader, CampaignGuideViewer
4. Testa: apri DM Panel, verifica che tab Scene funziona, crea una scena, uploada mappa, attiva su TV

### Cosa NON è stato toccato
- Dadi 3D e animazioni
- Sistema iniziativa
- Combattimento (turni, attacchi, danni, HP)
- CharacterSheet / CharacterCreation
- TVScreen
- BattleGrid / FogOfWarEditor
- NPCManager / LootDistribution
- DiceRollModal
- Tutti i file in shared/
