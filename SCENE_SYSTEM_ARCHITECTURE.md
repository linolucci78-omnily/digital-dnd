# 🎬 UNIFIED SCENE SYSTEM - Architettura Professionale

## 📋 Panoramica

Sistema unificato di gestione scene ispirato a **Foundry VTT**, che elimina la confusione tra `map_url`, `battle_map_url` e altri sistemi frammentati.

### ❌ PROBLEMA VECCHIO SISTEMA

```
❌ map_url (sessions)           → Scene generiche
❌ battle_map_url (sessions)    → Battle Grid
❌ map_url (locations)          → Location maps
❌ Eventi: map_update, battle_map_update, scene_change
❌ Conflitti: L'ultimo evento sovrascrive gli altri
❌ Bug: Schermo verde quando mapUrl diventa null
```

### ✅ NUOVO SISTEMA (Scene-Based)

```
✅ UNA tabella scenes           → Contiene TUTTO
✅ current_scene_id (sessions)  → Punta alla scena attiva
✅ UN solo evento: scene_change
✅ Zero conflitti: Solo una scene attiva per campaign
✅ Professionale: Come Foundry VTT
```

---

## 🗄️ SCHEMA DATABASE

### Tabella `scenes`

```sql
scenes {
  id                UUID PRIMARY KEY
  campaign_id       UUID → campaigns(id)

  -- Metadata
  name              TEXT (es: "Goblin Ambush", "Royal Tavern")
  description       TEXT
  scene_type        TEXT (exploration|combat|social)

  -- Visual
  map_url           TEXT (URL immagine background)
  thumbnail_url     TEXT (preview per DM)

  -- Grid Configuration (Battle Grid integrato!)
  grid_enabled      BOOLEAN
  grid_size         INTEGER (pixels per cella)
  grid_opacity      FLOAT
  grid_color        TEXT

  -- Fog of War
  fog_enabled       BOOLEAN
  fog_data          JSONB (canvas state)

  -- Ambience
  ambient_light     FLOAT (0-1)
  music_track       TEXT
  ambient_sounds    JSONB

  -- Navigation
  entry_point_x     FLOAT (%)
  entry_point_y     FLOAT (%)

  -- State
  is_active         BOOLEAN (solo UNA per campaign)
}
```

### Modifiche altre tabelle

```sql
-- sessions: Rimuove campi frammentati
sessions.map_url ❌ REMOVED
sessions.battle_map_url ❌ REMOVED
sessions.current_scene_id ✅ ADDED → scenes(id)

-- locations: Mantiene compatibilità
locations.map_url ⚠️ DEPRECATO (legacy)
locations.default_scene_id ✅ ADDED → scenes(id)
```

---

## 🔄 FLUSSO OPERATIVO

### 1️⃣ **DM crea una Scene**

```javascript
// DMPanel - Scene Manager
const createScene = async (sceneData) => {
  const { data: scene } = await supabase
    .from('scenes')
    .insert({
      campaign_id: campaign.id,
      name: sceneData.name,
      map_url: sceneData.mapUrl,
      scene_type: 'combat', // o 'exploration'
      grid_enabled: true,
      grid_size: 50,
      grid_opacity: 0.15
    })
    .select()
    .single();

  return scene;
};
```

### 2️⃣ **DM attiva una Scene**

```javascript
const activateScene = async (sceneId) => {
  // 1. Marca scene come attiva (trigger SQL disattiva automaticamente le altre)
  await supabase
    .from('scenes')
    .update({ is_active: true })
    .eq('id', sceneId);

  // 2. Aggiorna session
  await supabase
    .from('sessions')
    .update({ current_scene_id: sceneId })
    .eq('id', session.id);

  // 3. Broadcast UNICO evento alla TV
  await tvChannel.send({
    type: 'broadcast',
    event: 'scene_change',
    payload: {
      sceneId,
      // TV caricherà tutti i dati della scene dal DB
    }
  });
};
```

### 3️⃣ **TV riceve e carica Scene**

```javascript
// TVScreen.jsx
const loadScene = async (sceneId) => {
  const { data: scene } = await supabase
    .from('scenes')
    .select('*')
    .eq('id', sceneId)
    .single();

  // Carica TUTTO dalla scene
  setMapUrl(scene.map_url);
  setGridConfig({
    enabled: scene.grid_enabled,
    size: scene.grid_size,
    opacity: scene.grid_opacity,
    color: scene.grid_color
  });
  setFogData(scene.fog_data);
  setAmbientLight(scene.ambient_light);
  // ... etc
};

// Listener semplificato
channel.on('broadcast', { event: 'scene_change' }, ({ payload }) => {
  loadScene(payload.sceneId);
});
```

---

## 🎯 VANTAGGI

### Chiarezza
- ✅ Un solo posto dove cercare la mappa attuale
- ✅ Un solo evento da ascoltare (`scene_change`)
- ✅ Zero ambiguità

### Scalabilità
- ✅ Facile aggiungere features (lighting dinamico, weather, etc.)
- ✅ Ogni scene è autocontenuta
- ✅ DM può preparare scene in anticipo

### Professionalità
- ✅ Come Foundry VTT (standard del settore)
- ✅ Codice pulito per licenza software
- ✅ Manutenibilità a lungo termine

### Performance
- ✅ Index SQL ottimizzati
- ✅ Trigger automatici (no race conditions)
- ✅ RLS integrato per security

---

## 🔧 MIGRATION STEPS

### Step 1: Esegui Migration SQL
```bash
cd /Volumes/Samsung980/digitalDnD
psql $DATABASE_URL -f migrations/create_unified_scene_system.sql
```

### Step 2: Refactor Componenti

#### DMPanel
- [ ] Rimuovere `handleMapUpload` per battle_map_url
- [ ] Creare `SceneManager` component
- [ ] Upload map → Crea scene nuova
- [ ] Pulsante "Activate Scene" → Broadcast scene_change

#### TVScreen
- [ ] Rimuovere listener `map_update`, `battle_map_update`
- [ ] Mantenere solo `scene_change`
- [ ] Funzione `loadScene(sceneId)` che carica tutto dal DB
- [ ] Rimuovere background verde fallback (sostituire con messaggio "No scene active")

#### LocationManager
- [ ] Quando crea location → Crea anche default_scene
- [ ] "Change Scene" button → Attiva la scene collegata
- [ ] Upload map → Aggiorna scene.map_url (non location.map_url)

### Step 3: Pulizia Database (se migration fallita prima)
Se hai già provato a eseguire la migration e ha dato errore, pulisci prima:
```sql
-- Rimuovi policy errata (se esiste)
DROP POLICY IF EXISTS "Campaign members can view scenes" ON scenes;
DROP POLICY IF EXISTS "Only DM can modify scenes" ON scenes;
```

### Step 4: Deprecare Legacy Code
```javascript
// Marcare come deprecato
/** @deprecated Use SceneManager instead */
const handleMapUpload = ...
```

### Step 5: Testing
- [ ] DM crea scene → TV mostra mappa ✅
- [ ] DM cambia scene → TV aggiorna istantaneamente ✅
- [ ] Grid settings salvati per scene ✅
- [ ] Fog of War persiste tra scene switch ✅
- [ ] Zero schermo verde bug ✅

---

## 📚 ESEMPI USO

### Caso 1: Preparation Phase
```javascript
// DM prepara 3 scene prima della sessione
await createScene({ name: "Tavern", mapUrl: "...", type: "social" });
await createScene({ name: "Goblin Ambush", mapUrl: "...", type: "combat" });
await createScene({ name: "Dark Cave", mapUrl: "...", type: "exploration" });
```

### Caso 2: Durante la Sessione
```javascript
// Party entra in combattimento
await activateScene(goblinAmbushSceneId);
// TV mostra istantaneamente: mappa + grid + fog state

// Combattimento finito, tornano alla taverna
await activateScene(tavernSceneId);
// TV mostra: mappa taverna (no grid, ambience music)
```

### Caso 3: Scene Dinamiche
```javascript
// DM modifica scene in tempo reale
await supabase
  .from('scenes')
  .update({
    ambient_light: 0.3, // Cala la notte
    fog_enabled: true   // Attiva fog
  })
  .eq('id', currentSceneId);

// Broadcast update
await tvChannel.send({
  type: 'broadcast',
  event: 'scene_updated', // Nuovo evento per modifiche live
  payload: { sceneId: currentSceneId }
});
```

---

## ⚠️ BREAKING CHANGES

### API Changes
- `sessions.map_url` → `sessions.current_scene_id`
- `sessions.battle_map_url` → REMOVED
- Eventi `map_update`, `battle_map_update` → `scene_change`

### Migration Path
1. Esegui SQL migration (auto-converte location esistenti)
2. Aggiorna componenti (backward compatible durante transizione)
3. Testa completo
4. Deploy

### Rollback Plan
- SQL migration è reversibile
- Mantieni backup di `sessions` table prima di migration
- Feature flag per switchare tra old/new system durante testing

---

## 🚀 FUTURE ENHANCEMENTS

Una volta implementato il sistema base, sarà facile aggiungere:

- **Multi-level scenes**: Scene con layer multipli (ground floor, upper floor)
- **Weather systems**: Pioggia, neve, nebbia dinamica
- **Day/Night cycles**: Lighting automatico basato su tempo in-game
- **Scene templates**: Library di scene pre-configurate
- **Scene history**: Replay delle scene precedenti
- **Performance optimizations**: Lazy loading, image compression

---

## 📖 RIFERIMENTI

- [Foundry VTT Scene Documentation](https://foundryvtt.com/article/scenes/)
- [Roll20 Page Architecture](https://help.roll20.net/hc/en-us/articles/360037772793-Page-Settings)
- Database schema: `/migrations/create_unified_scene_system.sql`

---

**Status**: 🚧 In Implementation
**Priority**: 🔴 HIGH (Blocca bug schermo verde + Necessario per licenza software)
**Estimated effort**: ~8-12 ore (migration + refactor + testing)
