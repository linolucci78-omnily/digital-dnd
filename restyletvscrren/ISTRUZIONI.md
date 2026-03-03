# TV Restyling — Istruzioni

## File da sostituire

```
src/tv/TVScreen.jsx    ← sostituisci con questo
src/tv/TurnBanner.jsx  ← sostituisci con questo
```

## Cosa è cambiato

### Token sulla mappa (PlayerToken + MonsterToken)
- **PRIMA**: Anelli SVG oro con gradient, HP arc dorato a cerchio, 6 dot decorativi, glow esagerato, nome con background box
- **DOPO**: Cerchio semplice con bordo 2px, HP bar sottile dentro il token (in basso), glow morbido solo se attivo, nome come testo flottante senza box

### TurnBanner (overlay cambio turno)
- **PRIMA**: Bordo 3px, glow pulsante enorme (inset -100), box dorato con inner border decorativo, icone DnDIcon
- **DOPO**: Box nero traslucido con blur, bordo 1px bianco, testo pulito senza emoji o icone

### NarrativeOverlay (testo del DM)
- **PRIMA**: Bordo dorato 2px intorno all'intera schermata, box con border oro e box-shadow oro
- **DOPO**: Bordo quasi invisibile, box con blur e bordo bianco sottile

### Attack/Damage Banners
- **PRIMA**: "Effetto PAZZO" con glow che pulsa da 0.85x a 1.4x, bordo 4px, box-shadow triplo, emoji 💀
- **DOPO**: Glow morbido, bordo 1px, box nero traslucido

### Hit/Miss Banner
- **PRIMA**: textShadow che pulsa da 40px a 80px su ogni frame
- **DOPO**: Glow statico morbido, scale più contenuto

### Saving Throw Banner
- **PRIMA**: Emoji 🎲, textShadow pulsante
- **DOPO**: Testo pulito, opacity pulse

### Exploration Header
- **PRIMA**: Bordo oro 1px, box-shadow triplo con glow oro, emoji ⚔️
- **DOPO**: Box nero traslucido, bordo bianco quasi invisibile

### Waiting Screen
- **PRIMA**: D20 grande con glow dorato, titolo a colori pieni
- **DOPO**: D20 piccolo quasi trasparente, titolo molto discreto

### Particelle
- **PRIMA**: Giallo-oro luminose
- **DOPO**: Bianche quasi invisibili

### DiceRoll
- **PRIMA**: Glow 60px + 120px
- **DOPO**: Glow 40px contenuto

## Cosa NON è cambiato
- Sidebar (era già stata pulita in una sessione precedente)
- Griglia (era già bianca)
- Initiative tracker in alto (era già pulito)
- Turn banner in basso (era già pulito)
- Tutta la logica di broadcast/realtime
- Struttura dei componenti e props
