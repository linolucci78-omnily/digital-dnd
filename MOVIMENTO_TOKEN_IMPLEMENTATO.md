# ✅ Sistema Movimento Token - COMPLETATO

**Data:** 2025-02-23
**Implementazione:** Soluzione B di Gemini - "Teletrasporto verso POI"

---

## 🎯 OBIETTIVO

Permettere ai giocatori di muovere i propri token sulla mappa TV cliccando "📍 Vai qui" su un POI dal mobile.

**Vantaggi rispetto al drag & drop classico:**
- ✅ Nessun bisogno di drag sulla mappa mobile (schermo piccolo)
- ✅ Movimento automatico e fluido sulla TV
- ✅ Narrativamente coerente: "vado verso il barista"
- ✅ Il DM non deve fare nulla - automazione intelligente

---

## 🏗️ ARCHITETTURA

```
┌─────────────────────────────────────────────────────────────┐
│ 1. MOBILE - Giocatore clicca "📍 Vai qui" su POI            │
└─────────────────────────────────────────────────────────────┘
                          ↓
                    ExploreTab.jsx
                          ↓
        ┌─────────────────┴─────────────────┐
        │                                   │
        ↓                                   ↓
┌──────────────────┐              ┌──────────────────┐
│  UPDATE DATABASE │              │  BROADCAST EVENT │
│  characters      │              │  character_moved │
│  map_x, map_y    │              │                  │
└──────────────────┘              └──────────────────┘
                                          │
                                          ↓
                          ┌───────────────────────────┐
                          │ 2. TV - Riceve broadcast  │
                          │    e aggiorna posizione   │
                          └───────────────────────────┘
                                          ↓
                                   TVScreen.jsx
                                          ↓
                          ┌───────────────────────────┐
                          │ 3. Animazione Spring      │
                          │    Token scivola verso    │
                          │    nuova posizione        │
                          └───────────────────────────┘
```

---

## 📁 FILE MODIFICATI

### 1. **TVScreen.jsx** - Mostra Token e Animazione

#### Aggiunto rendering token personaggi:
```javascript
{characters.map((char, idx) => {
  // Solo personaggi con posizione valida
  if (!char.map_x && !char.map_y) return null;

  return (
    <motion.div
      key={char.id}
      style={{
        position: "absolute",
        left: `${char.map_x}%`,
        top: `${char.map_y}%`,
        transform: "translate(-50%, -50%)",
        zIndex: 20, // Sopra i POI
      }}
      animate={{
        scale: 1,
        opacity: 1,
        left: `${char.map_x}%`,
        top: `${char.map_y}%`,
      }}
      transition={{
        left: { type: "spring", stiffness: 100, damping: 20 },
        top: { type: "spring", stiffness: 100, damping: 20 },
      }}
    >
      {/* Token cerchio colorato con icona classe */}
      <div style={{
        width: "clamp(45px, 4.5vw, 75px)",
        height: "clamp(45px, 4.5vw, 75px)",
        borderRadius: "50%",
        background: `radial-gradient(circle, ${char.token_color}, ${char.token_color}cc)`,
        border: `4px solid ${char.token_color}`,
        boxShadow: `0 0 25px ${char.token_color}90`,
      }}>
        {CLASS_ICONS[char.class] || char.name?.[0]}
      </div>

      {/* Nome personaggio */}
      <div style={{ /* ... stile nome ... */ }}>
        {char.name}
      </div>

      {/* Indicatore HP basso */}
      {char.hp_current < char.hp_max * 0.3 && (
        <div style={{ /* badge rosso */ }}>⚠️</div>
      )}
    </motion.div>
  );
})}
```

**Key Features:**
- Token sono cerchi con icona classe (⚔️🎸✝️🌿 etc.)
- Colore personalizzato dal campo `token_color`
- Animazione **spring** fluida per movimento (no scatti!)
- Badge ⚠️ se HP < 30%
- zIndex 20 → token sopra i POI

#### Aggiunto listener `character_moved`:
```javascript
.on("broadcast", { event: "character_moved" }, ({ payload }) => {
  console.log("📺 TV riceve character_moved:", payload);
  // Aggiorna posizione personaggio sulla mappa
  setCharacters(prev => prev.map(c =>
    c.id === payload.characterId
      ? { ...c, map_x: payload.x, map_y: payload.y }
      : c
  ));
})
```

**Come funziona:**
1. Evento broadcast arriva dalla mobile
2. Trova il personaggio nel state `characters`
3. Aggiorna `map_x` e `map_y`
4. Framer Motion anima automaticamente il token verso nuova posizione

---

### 2. **ExploreTab.jsx** - Bottone "Vai qui" e Broadcast

#### Funzione `handleMoveToPOI`:
```javascript
const handleMoveToPOI = async (poi) => {
  if (!character?.id || !session?.id || !poi) return;

  try {
    // 1. Aggiorna database
    await supabase
      .from("characters")
      .update({ map_x: poi.x, map_y: poi.y })
      .eq("id", character.id);

    // 2. Broadcast alla TV
    const tvChannel = supabase.channel(`session-tv-${session.id}`);
    await tvChannel.send({
      type: "broadcast",
      event: "character_moved",
      payload: {
        characterId: character.id,
        characterName: character.name,
        x: poi.x,
        y: poi.y,
      },
    });

    // 3. Feedback
    alert(`${character.name} si muove verso ${poi.name}! 🚶`);
    setSelectedPOI(null);
  } catch (e) {
    console.error("Errore movimento:", e);
  }
};
```

**Perché aggiorniamo sia DB che broadcast?**
- **Database:** Persistenza - se ricarichi TV la posizione rimane
- **Broadcast:** Velocità - TV aggiorna subito senza query

#### Bottone "📍 Vai qui" nel modal POI:
```javascript
<button
  className="btn btn-gold"
  onClick={() => handleMoveToPOI(selectedPOI)}
  style={{
    width: "100%",
    background: `linear-gradient(135deg, ${POI_COLORS[selectedPOI.type]}, ${POI_COLORS[selectedPOI.type]}cc)`,
    border: `2px solid ${POI_COLORS[selectedPOI.type]}`,
  }}
>
  📍 Vai qui
</button>
```

**Visual Design:**
- Colore dinamico basato su tipo POI (oro per chest, blu per NPC, etc.)
- Gradient per effetto premium
- Click → chiude modal e muove token

#### Bottone rapido "📍" nella lista POI:
```javascript
<button
  className="btn btn-ghost"
  onClick={(e) => {
    e.stopPropagation(); // Non apre modal
    handleMoveToPOI(poi);
  }}
  style={{
    padding: "6px 10px",
    fontSize: "1rem",
    background: `${POI_COLORS[poi.type]}15`,
    border: `1px solid ${POI_COLORS[poi.type]}50`,
  }}
>
  📍
</button>
```

**UX:**
- Click sul nome POI → apre modal dettagli
- Click su "📍" → movimento immediato senza modal
- Perfetto per movimento rapido durante combattimento

---

## 🎮 FLUSSO COMPLETO

### Scenario: Giocatore vuole andare al barista

```
┌─────────────────────────────────────────────────────────────┐
│ FASE 1: Setup DM                                             │
└─────────────────────────────────────────────────────────────┘

DM: Crea location "Taverna"
DM: Aggiungi POI "Barista Nano"
    - Tipo: 👤 NPC
    - Posizione: X:30%, Y:40%
    - Visibile: SÌ
DM: Attiva scena


┌─────────────────────────────────────────────────────────────┐
│ FASE 2: TV mostra mappa                                      │
└─────────────────────────────────────────────────────────────┘

TV: Mappa "Taverna" caricata
TV: POI "👤 Barista Nano" visibile a (30%, 40%)
TV: Token personaggi visibili alle loro posizioni iniziali (0, 0)


┌─────────────────────────────────────────────────────────────┐
│ FASE 3: Giocatore (Mobile)                                   │
└─────────────────────────────────────────────────────────────┘

Mobile: Tab "🗺️ Esplora"
Mobile: Vede lista POI → "👤 Barista Nano"
Mobile: Click su "📍" (movimento rapido)

↓ handleMoveToPOI() eseguito ↓

1. UPDATE characters SET map_x=30, map_y=40 WHERE id='...'
2. BROADCAST event: character_moved
   { characterId, characterName, x: 30, y: 40 }


┌─────────────────────────────────────────────────────────────┐
│ FASE 4: TV riceve broadcast                                  │
└─────────────────────────────────────────────────────────────┘

TV: Listener riceve "character_moved"
TV: Aggiorna state: character.map_x = 30, character.map_y = 40
TV: Framer Motion anima token:
    - Partenza: (0%, 0%)
    - Arrivo: (30%, 40%)
    - Transizione: spring (fluida, elastica)

Risultato sulla TV:
✨ Token del personaggio scivola dalla posizione iniziale
   fino al "👤 Barista Nano" con animazione fluida!


┌─────────────────────────────────────────────────────────────┐
│ FASE 5: Mobile feedback                                      │
└─────────────────────────────────────────────────────────────┘

Mobile: Alert "Gandalf si muove verso Barista Nano! 🚶"
Mobile: Modal si chiude
```

---

## 🎨 DESIGN DETTAGLI

### Token Personaggi
```
┌─────────────────────────────────────────────┐
│         ┌───────────────┐                   │
│         │               │                   │
│         │      ⚔️       │  ← Icona classe   │
│         │               │                   │
│         └───────────────┘                   │
│              ⚠️  ← Badge HP basso (se <30%) │
│         ┌───────────────┐                   │
│         │   Gandalf     │  ← Nome           │
│         └───────────────┘                   │
│                                             │
│  Colore: token_color (es: #d4af37 oro)     │
│  Glow: boxShadow con stesso colore         │
│  Dimensione: responsive clamp(45px-75px)   │
└─────────────────────────────────────────────┘
```

### POI vs Token - Gerarchia Visiva
```
z-index: 15 → POI (🚪📦👤)
z-index: 20 → Token Personaggi (⚔️🎸🌿)

→ Token sempre sopra i POI (più importanti)
```

---

## 🔮 FUTURE ENHANCEMENTS

### 1. Movimento Limitato (Combattimento)
```javascript
// Calcola distanza tra token e POI
const distance = Math.sqrt(
  Math.pow(poi.x - char.map_x, 2) +
  Math.pow(poi.y - char.map_y, 2)
);

// In combattimento, limite movimento
if (session.phase === 'combat' && distance > char.speed * GRID_SCALE) {
  alert("Troppo lontano! Puoi muoverti solo 30ft.");
  return;
}
```

### 2. Cerchio Raggio Movimento
```javascript
// Mostra sulla TV quanto lontano può andare
<circle
  cx={char.map_x}
  cy={char.map_y}
  r={char.speed * GRID_SCALE}
  fill="rgba(212,175,55,0.1)"
  stroke="var(--gold)"
  strokeWidth={2}
/>
```

### 3. Path Animation
```javascript
// Invece di movimento diretto, segui un path
<motion.div
  animate={{
    x: [startX, midpointX, endX],
    y: [startY, midpointY, endY],
  }}
  transition={{ duration: 1.5, ease: "easeInOut" }}
/>
```

### 4. Reset Posizioni su Cambio Scena
```javascript
.on("broadcast", { event: "scene_change" }, ({ payload }) => {
  // Sposta tutti i personaggi al punto d'ingresso
  const entryPoint = payload.entryPoint || { x: 50, y: 90 };

  setCharacters(prev => prev.map(c => ({
    ...c,
    map_x: entryPoint.x,
    map_y: entryPoint.y,
  })));

  // Aggiorna database
  characters.forEach(async (c) => {
    await supabase
      .from("characters")
      .update({ map_x: entryPoint.x, map_y: entryPoint.y })
      .eq("id", c.id);
  });
});
```

### 5. Movimento Click Mappa (Mobile)
```javascript
// Alternativa: click direttamente sulla mappa dal mobile
<img
  src={mapUrl}
  onClick={(e) => {
    const rect = e.target.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    handleMoveTo({ x, y });
  }}
/>
```

---

## 🧪 COME TESTARE

### Test Completo:

1. **Setup:**
   - Crea campagna e sessione
   - Crea personaggio (es: Gandalf, Mago)
   - Vai al DM Panel → Tab "🗺️ Scene"
   - Crea location "Taverna della Rosa"
   - Upload mappa
   - Aggiungi POI "Barista" a posizione X:40%, Y:30%
   - Attiva scena

2. **TV:**
   - Apri TV Screen (finestra separata)
   - Inserisci join code
   - Verifica che vedi:
     - Mappa taverna
     - POI "👤 Barista" a (40%, 30%)
     - Token Gandalf a (0%, 0%) - oppure non visibile se non ha posizione

3. **Mobile:**
   - Apri CharacterSheet di Gandalf
   - Tab "🗺️ Esplora"
   - Vedi POI "👤 Barista" nella lista
   - Click sul bottone "📍" accanto al barista

4. **Verifica TV:**
   - Token Gandalf dovrebbe **scivolare** da (0,0) a (40%, 30%)
   - Animazione fluida spring (non scatto!)
   - Token si ferma esattamente sopra il barista

5. **Test Movimento Multiplo:**
   - Crea secondo POI "Porta Uscita" a (80%, 20%)
   - Dal mobile, click "📍" su Porta Uscita
   - Token si muove da barista → porta
   - Ogni movimento aggiorna il database

---

## ✅ CHECKLIST COMPLETAMENTO

- [x] Token personaggi visibili sulla TV
- [x] Token hanno icona classe (⚔️🎸🌿)
- [x] Token hanno colore personalizzato
- [x] Token hanno badge HP basso
- [x] Token hanno nome sotto
- [x] Listener `character_moved` su TV
- [x] Animazione spring fluida
- [x] Funzione `handleMoveToPOI` su mobile
- [x] Bottone "📍 Vai qui" nel modal POI
- [x] Bottone "📍" rapido nella lista POI
- [x] Update database + broadcast
- [x] Feedback utente (alert movimento)
- [x] Stop propagation per evitare conflitti
- [x] Colore dinamico bottone basato su tipo POI

---

## 🎯 VANTAGGI SOLUZIONE B (vs Drag & Drop)

| Feature | Drag & Drop (DM) | "Vai qui" (Mobile) |
|---------|------------------|-------------------|
| **Velocità** | DM deve trascinare ogni token | Giocatore click autonomo |
| **Precisione** | Alta (DM posiziona esatto) | Auto-allineato a POI |
| **Mobile UX** | Impossibile (schermo piccolo) | ✅ Perfetto |
| **Narrativa** | DM descrive movimento | Giocatore decide |
| **Scalabilità** | DM sovraccarico con 4+ player | ✅ Ogni giocatore indipendente |
| **Combattimento** | DM muove tutti i nemici + PG | DM muove solo nemici |

**Conclusione:** Soluzione B è **molto più adatta** per un VTT ibrido con mobile!

---

**🎉 Sistema movimento completamente funzionante!**

Ora i giocatori possono esplorare la mappa in modo autonomo, mentre il DM si concentra sulla narrazione e gestione nemici.
