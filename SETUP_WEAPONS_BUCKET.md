# 🗡️ Setup Bucket "weapons" su Supabase

## ❌ Problema: Row-Level Security Policy

Errore: `new row violates row-level security policy`

Questo errore significa che il bucket esiste ma le policy RLS bloccano l'upload.

---

## ✅ SOLUZIONE RAPIDA 1: Via Dashboard (No SQL)

**Il metodo PIÙ veloce senza scrivere SQL:**

1. Vai su **Storage** → https://supabase.com/dashboard/project/[tuo-id]/storage/buckets
2. Click sul bucket **"weapons"** (crealo se non esiste)
3. Click su **"Policies"** (tab in alto)
4. Click **"New Policy"**
5. Seleziona **"For full customization"**
6. Compila:
   - **Policy name:** `weapons_full_access`
   - **Policy command:** `ALL`
   - **Target roles:** `public` (importante!)
   - **USING expression:** `bucket_id = 'weapons'`
   - **WITH CHECK expression:** `bucket_id = 'weapons'`
7. Click **"Save policy"**

✅ Fatto! Ora chiunque può uploadare.

---

## ✅ SOLUZIONE RAPIDA 2: Via SQL Editor

Se preferisci SQL, è ancora più veloce:

### 1. Vai su Supabase SQL Editor
https://supabase.com/dashboard → SQL Editor

### 2. Incolla e RUN:

```sql
-- ═══════════════════════════════════════════════
-- DISABILITA RLS COMPLETAMENTE (solo per dev/test)
-- ═══════════════════════════════════════════════

-- Crea bucket pubblico SENZA RLS
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'weapons',
  'weapons',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET public = true;

-- RIMUOVI TUTTE LE POLICY ESISTENTI
DROP POLICY IF EXISTS "Public can view weapon images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload weapon images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their weapon images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their weapon images" ON storage.objects;

-- CREA POLICY PERMISSIVA: TUTTI POSSONO FARE TUTTO
CREATE POLICY "weapons_all_access"
ON storage.objects
FOR ALL
TO public
USING (bucket_id = 'weapons')
WITH CHECK (bucket_id = 'weapons');
```

✅ Questo permette a **CHIUNQUE** di uploadare/leggere/modificare/eliminare immagini nel bucket "weapons".

---

## 🔍 DEBUG: Verifica cosa sta bloccando

Prima di provare le soluzioni, esegui questo SQL per capire il problema:

```sql
-- Mostra info sul bucket
SELECT * FROM storage.buckets WHERE id = 'weapons';

-- Mostra tutte le policy attive
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'objects'
AND schemaname = 'storage';
```

**Controlla:**
- ✅ `public = true` nel bucket? (Deve essere true)
- ✅ Ci sono policy per `bucket_id = 'weapons'`?
- ✅ Le policy hanno `roles = {public}` o `roles = {authenticated}`?

**Verifica autenticazione utente (Console Browser - F12):**
```javascript
// Esegui nella console del browser
const { data } = await supabase.auth.getUser();
console.log("User:", data.user);
console.log("Authenticated:", !!data.user);
```

Se `data.user` è `null` → l'utente NON è autenticato → usa la policy `TO public` invece di `auth.role() = 'authenticated'`

---

## ✅ Soluzione Alternativa: Policy RLS Corrette (Per produzione)

### Opzione 1: Dashboard Supabase (Consigliato)

**1. Vai su Supabase Dashboard:**
- https://supabase.com/dashboard/project/[tuo-project-id]/storage/buckets

**2. Se il bucket "weapons" NON esiste ancora:**
- Click **"New bucket"**
- **Name:** `weapons`
- **Public bucket:** ✅ **SPUNTA QUESTO!** (importante per vedere le immagini)
- Click **"Create bucket"**

**3. Configura le Policy RLS:**
- Click sul bucket **"weapons"**
- Vai alla tab **"Policies"**
- Click **"New Policy"**

**Policy 1 - Lettura Pubblica (SELECT):**
```
Policy name: Public Read
Allowed operation: SELECT
Policy definition: true
```

**Policy 2 - Upload per Utenti Autenticati (INSERT):**
```
Policy name: Authenticated Upload
Allowed operation: INSERT
Policy definition: auth.role() = 'authenticated'
```

---

### Opzione 2: SQL Editor (Più Veloce)

**1. Vai su SQL Editor:**
- https://supabase.com/dashboard/project/[tuo-project-id]/sql

**2. Copia e incolla questo SQL:**

```sql
-- ═══════════════════════════════════════════════
-- Crea il bucket "weapons" (se non esiste)
-- ═══════════════════════════════════════════════
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'weapons',
  'weapons',
  true,  -- PUBBLICO per vedere le immagini!
  5242880,  -- 5 MB max
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- ═══════════════════════════════════════════════
-- Policy 1: TUTTI possono LEGGERE le immagini
-- ═══════════════════════════════════════════════
CREATE POLICY "Public can view weapon images"
ON storage.objects
FOR SELECT
USING (bucket_id = 'weapons');

-- ═══════════════════════════════════════════════
-- Policy 2: Utenti AUTENTICATI possono UPLOADARE
-- ═══════════════════════════════════════════════
CREATE POLICY "Authenticated users can upload weapon images"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'weapons'
  AND auth.role() = 'authenticated'
);

-- ═══════════════════════════════════════════════
-- Policy 3: Utenti possono AGGIORNARE le proprie immagini
-- ═══════════════════════════════════════════════
CREATE POLICY "Users can update their weapon images"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'weapons'
  AND auth.role() = 'authenticated'
)
WITH CHECK (
  bucket_id = 'weapons'
  AND auth.role() = 'authenticated'
);

-- ═══════════════════════════════════════════════
-- Policy 4: Utenti possono ELIMINARE le proprie immagini
-- ═══════════════════════════════════════════════
CREATE POLICY "Users can delete their weapon images"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'weapons'
  AND auth.role() = 'authenticated'
);
```

**3. Click "Run" (⌘ + Enter)**

---

## ✅ Verifica che Funzioni

**1. Vai su Storage:**
- https://supabase.com/dashboard/project/[tuo-project-id]/storage/buckets/weapons

**2. Dovresti vedere:**
- ✅ Bucket "weapons" con icona lucchetto aperto (pubblico)
- ✅ 4 policy attive nella tab "Policies"

**3. Prova l'upload:**
- Vai su CharacterSheet → Zaino → "+ Arma Principale"
- Carica un'immagine dal PC
- Se funziona: ✅ Setup completato!
- Se fallisce: Controlla console per errori

---

## 🔍 Troubleshooting

**Errore: "Bucket already exists"**
- Il bucket esiste già, salta al punto 3 (Policy)

**Errore: "Policy already exists"**
- Le policy esistono già, tutto OK!

**Errore: "new row violates row-level security policy"**
- Le policy non sono configurate correttamente
- Verifica che la Policy 2 (INSERT) sia attiva
- Verifica che l'utente sia autenticato (`auth.role() = 'authenticated'`)

**Immagini non visibili:**
- Il bucket NON è pubblico → Vai su Settings bucket e spunta "Public bucket"
- La Policy 1 (SELECT) non è attiva → Aggiungi la policy di lettura pubblica

---

## 📁 Struttura File nel Bucket

Le immagini verranno salvate così:

```
weapons/
  └── {campaign_id}/
      └── weapons/
          ├── Spada_Lunga_1709876543210.png
          ├── Pugnale_1709876544320.jpg
          └── Arco_Lungo_1709876545430.webp
```

Ogni campaign ha la sua cartella per organizzare le armi! 🎯
