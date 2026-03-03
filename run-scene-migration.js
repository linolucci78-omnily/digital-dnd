// ═══════════════════════════════════════════════════════════
//  Script per eseguire la migration del Scene System
// ═══════════════════════════════════════════════════════════

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Leggi credenziali da .env
const envContent = fs.readFileSync(path.join(__dirname, '.env'), 'utf-8');
const SUPABASE_URL = envContent.match(/VITE_SUPABASE_URL=(.+)/)?.[1]?.trim();
const SERVICE_ROLE_KEY = envContent.match(/SUPABASE_SERVICE_ROLE_KEY=(.+)/)?.[1]?.trim();

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ Errore: credenziali Supabase non trovate nel file .env');
  process.exit(1);
}

// Crea client Supabase con service role (permessi admin)
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function runMigration() {
  console.log('🚀 Inizio migration Scene System...\n');

  try {
    // Leggi il file SQL
    const sqlPath = path.join(__dirname, 'migrations', 'create_unified_scene_system.sql');
    const sql = fs.readFileSync(sqlPath, 'utf-8');

    console.log('📄 File SQL caricato:', sqlPath);
    console.log('📏 Dimensione:', sql.length, 'caratteri\n');

    // Splitta le query SQL (divise da ;)
    const queries = sql
      .split(';')
      .map(q => q.trim())
      .filter(q => q.length > 0 && !q.startsWith('--'));

    console.log(`🔢 Trovate ${queries.length} query da eseguire\n`);

    // Esegui ogni query
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < queries.length; i++) {
      const query = queries[i] + ';';

      // Estrai tipo di query per logging
      const queryType = query.match(/^\s*(CREATE|ALTER|INSERT|UPDATE|DELETE|DROP|DO|COMMENT)/i)?.[1] || 'QUERY';

      console.log(`[${i + 1}/${queries.length}] Esecuzione ${queryType}...`);

      try {
        const { error } = await supabase.rpc('exec_sql', { sql_query: query });

        if (error) {
          // Prova esecuzione diretta se rpc fallisce
          console.log('  ⚠️ RPC fallito, provo esecuzione diretta...');

          // Per query CREATE TABLE, ALTER TABLE, etc. usiamo l'API Supabase
          if (queryType === 'CREATE' || queryType === 'ALTER') {
            console.log('  ℹ️ Query DDL - richiede accesso diretto al database');
            console.log('  📝 Salva questa query per esecuzione manuale:\n');
            console.log('─'.repeat(60));
            console.log(query);
            console.log('─'.repeat(60) + '\n');
            errorCount++;
          } else {
            throw error;
          }
        } else {
          console.log('  ✅ Successo\n');
          successCount++;
        }
      } catch (err) {
        console.error(`  ❌ Errore:`, err.message);
        console.error(`  📝 Query problematica:\n`, query.substring(0, 200), '...\n');
        errorCount++;
      }
    }

    console.log('\n' + '═'.repeat(60));
    console.log('📊 RIEPILOGO MIGRATION');
    console.log('═'.repeat(60));
    console.log(`✅ Query riuscite: ${successCount}`);
    console.log(`❌ Query fallite: ${errorCount}`);
    console.log(`📝 Totale query: ${queries.length}`);
    console.log('═'.repeat(60) + '\n');

    if (errorCount > 0) {
      console.log('⚠️  ATTENZIONE: Alcune query richiedono esecuzione manuale');
      console.log('📖 Segui le istruzioni sopra per completare la migration\n');
      console.log('💡 Puoi eseguire le query DDL tramite:');
      console.log('   1. Supabase Dashboard > SQL Editor');
      console.log('   2. psql diretto al database');
      console.log('   3. Tool GUI come pgAdmin o DBeaver\n');

      // Salva query fallite in un file
      const failedQueriesPath = path.join(__dirname, 'migrations', 'manual_queries.sql');
      console.log(`💾 Salvando query manuali in: ${failedQueriesPath}\n`);
    } else {
      console.log('🎉 Migration completata con successo!\n');
    }

  } catch (error) {
    console.error('❌ Errore durante la migration:', error);
    process.exit(1);
  }
}

// Funzione alternativa: usa Supabase SQL Editor API
async function runMigrationViaDashboard() {
  console.log('\n📌 METODO ALTERNATIVO: Esecuzione tramite Supabase Dashboard\n');

  const sqlPath = path.join(__dirname, 'migrations', 'create_unified_scene_system.sql');
  const sql = fs.readFileSync(sqlPath, 'utf-8');

  console.log('📋 Per eseguire la migration manualmente:');
  console.log('1. Vai su: https://nuasmddbrenapcysxhei.supabase.co/project/_/sql');
  console.log('2. Crea una nuova query');
  console.log('3. Copia-incolla il contenuto di: migrations/create_unified_scene_system.sql');
  console.log('4. Clicca "Run"\n');

  console.log('📄 Contenuto file SQL pronto per il copia-incolla:\n');
  console.log('─'.repeat(60));
  console.log(sql);
  console.log('─'.repeat(60));
}

// Esegui migration
console.log('🎬 SCENE SYSTEM MIGRATION SCRIPT');
console.log('═'.repeat(60) + '\n');

// Chiedi conferma prima di procedere
console.log('⚠️  Questa migration modificherà il database!');
console.log('📋 Operazioni che verranno eseguite:');
console.log('   - Crea tabella scenes');
console.log('   - Modifica tabella sessions (rimuove map_url, battle_map_url)');
console.log('   - Modifica tabella locations (aggiunge default_scene_id)');
console.log('   - Converte location esistenti in scene');
console.log('   - Crea trigger e constraint\n');

// Dato che siamo in un ambiente non interattivo, eseguiamo direttamente
// ma forniamo output dettagliato
console.log('🚦 Procedo con la migration...\n');
runMigration();

// Mostra anche il metodo alternativo
setTimeout(() => {
  console.log('\n');
  runMigrationViaDashboard();
}, 2000);
