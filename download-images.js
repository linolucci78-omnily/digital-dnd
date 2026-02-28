// ═══════════════════════════════════════════════
//  Script per scaricare immagini in progressione
//  Da 1.jpg a 321.jpg (o altro range)
// ═══════════════════════════════════════════════

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ──────────────────────────────────────────────
// ⚙️ CONFIGURAZIONE - MODIFICA QUESTI VALORI
// ──────────────────────────────────────────────

const BASE_URL = "https://online.anyflip.com/znfnp/bqbd/files/mobile/";  // ← INSERISCI IL TUO URL QUI
const START = 1;                                        // Numero iniziale
const END = 64;                                        // Numero finale
const EXTENSION = ".jpg";                               // Estensione (.jpg, .JPG, .png)
const OUTPUT_DIR = "./public/maps";                     // Cartella dove salvare

// ──────────────────────────────────────────────

async function downloadFile(url, outputPath) {
  try {
    console.log(`📥 Scaricando: ${url}`);
    const response = await fetch(url);

    if (!response.ok) {
      console.log(`❌ Errore ${response.status}: ${url}`);
      return false;
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    fs.writeFileSync(outputPath, buffer);
    console.log(`✅ Salvato: ${outputPath}`);
    return true;
  } catch (error) {
    console.log(`❌ Errore download: ${url} - ${error.message}`);
    return false;
  }
}

async function main() {
  console.log("🚀 Inizio download immagini...\n");
  console.log(`📍 URL base: ${BASE_URL}`);
  console.log(`📊 Range: ${START} - ${END}`);
  console.log(`📂 Destinazione: ${OUTPUT_DIR}\n`);

  // Crea cartella se non esiste
  const outputPath = path.resolve(__dirname, OUTPUT_DIR);
  if (!fs.existsSync(outputPath)) {
    fs.mkdirSync(outputPath, { recursive: true });
    console.log(`📁 Cartella creata: ${outputPath}\n`);
  }

  let successCount = 0;
  let failCount = 0;

  // Scarica tutti i file
  for (let i = START; i <= END; i++) {
    const url = `${BASE_URL}${i}${EXTENSION}`;
    const filename = `${i}${EXTENSION}`;
    const filePath = path.join(outputPath, filename);

    const success = await downloadFile(url, filePath);
    if (success) {
      successCount++;
    } else {
      failCount++;
    }

    // Piccola pausa per non sovraccaricare il server
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log(`\n✨ Download completato!`);
  console.log(`✅ Successi: ${successCount}`);
  console.log(`❌ Falliti: ${failCount}`);
}

main().catch(console.error);
