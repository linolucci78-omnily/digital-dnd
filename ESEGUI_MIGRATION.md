# 🚀 GUIDA: Esecuzione Migration Scene System

## 📋 Istruzioni Passo-Passo

### Step 1: Apri Supabase SQL Editor

1. Vai su: **https://supabase.com/dashboard**
2. Seleziona il progetto: **nuasmddbrenapcysxhei**
3. Nel menu laterale, clicca su **SQL Editor** (icona `</>`)

### Step 2: Crea Nuova Query

1. Clicca sul pulsante **"New query"** (in alto a destra)
2. Dai un nome alla query: `Scene System Migration`

### Step 3: Copia il Codice SQL

Apri il file: **`supabase/migrations/20260228215841_create_unified_scene_system.sql`**

Oppure copia tutto il contenuto qui sotto:

```sql
-- Il contenuto è nel file supabase/migrations/20260228215841_create_unified_scene_system.sql
```

### Step 4: Esegui la Migration

1. Incolla tutto il codice SQL nell'editor
2. **IMPORTANTE**: Leggi i commenti nel codice per capire cosa fa
3. Clicca sul pulsante **"Run"** (o `Ctrl+Enter` / `Cmd+Enter`)
4. Attendi il completamento (dovresti vedere messaggi di successo)

### Step 5: Verifica il Risultato

Esegui questa query per verificare che la tabella `scenes` sia stata creata:

```sql
SELECT
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'scenes'
ORDER BY ordinal_position;
```

Dovresti vedere tutte le colonne della tabella scenes.

### Step 6: Verifica Migration Automatica

La migration dovrebbe aver automaticamente convertito le location esistenti in scene.

Controlla:

```sql
-- Conta scene create
SELECT COUNT(*) as total_scenes FROM scenes;

-- Vedi scene create
SELECT id, name, scene_type, map_url, is_active
FROM scenes
ORDER BY created_at DESC;

-- Verifica link con locations
SELECT
  l.name as location_name,
  s.name as scene_name,
  s.map_url
FROM locations l
LEFT JOIN scenes s ON l.default_scene_id = s.id
WHERE l.map_url IS NOT NULL;
```

## ⚠️ Note Importanti

### Backup Automatico
Supabase mantiene automaticamente backup del database. In caso di problemi puoi fare rollback.

### Cosa Fa Questa Migration

1. ✅ Crea tabella `scenes` con tutte le configurazioni
2. ✅ Rimuove `sessions.map_url` e `sessions.battle_map_url`
3. ✅ Aggiunge `sessions.current_scene_id`
4. ✅ Aggiunge `locations.default_scene_id`
5. ✅ Converte location esistenti → scene
6. ✅ Crea trigger per garantire solo 1 scena attiva
7. ✅ Imposta Row Level Security (RLS)

### In Caso di Errore

Se vedi errori tipo "column already exists" o "table already exists":
- È normale se hai già eseguito parte della migration
- Il codice SQL usa `IF NOT EXISTS` per evitare errori
- Continua pure, gli errori verranno ignorati

### Dopo la Migration

Una volta completata la migration:
1. ❌ **NON caricare mappe** nei vecchi modi (fino a refactor completo)
2. ✅ Verifica che i dati esistenti siano stati migrati
3. ✅ Continua con il refactor dei componenti

## 📞 Help

Se vedi errori o hai dubbi, fermati e chiedi supporto prima di procedere.

---

**Status**: Pronto per esecuzione
**Database**: `nuasmddbrenapcysxhei.supabase.co`
**File SQL**: `supabase/migrations/20260228215841_create_unified_scene_system.sql`
