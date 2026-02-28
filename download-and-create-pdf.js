// ═══════════════════════════════════════════════
//  Script COMPLETO: Scarica immagini + Crea PDF
//  Tutto automatico, un solo comando
// ═══════════════════════════════════════════════

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { PDFDocument } from 'pdf-lib';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ──────────────────────────────────────────────
// ⚙️ CONFIGURAZIONE - MODIFICA QUESTI VALORI
// ──────────────────────────────────────────────

const BASE_URL = "https://online.anyflip.com/piwcj/iafx/files/mobile/";  // ← URL immagini
const START = 1;                    // Numero iniziale
const END = 321;                    // Numero finale
const EXTENSION = ".jpg";           // Estensione immagini
const TEMP_DIR = "./temp-images";   // Cartella temporanea
const PDF_NAME = "nuovo-manuale.pdf";  // ← NOME DEL PDF FINALE

// Layout PDF a libro (2 pagine affiancate)
const PAGE_WIDTH = 1684;   // A4 orizzontale doppia
const PAGE_HEIGHT = 1191;
const SINGLE_PAGE_WIDTH = PAGE_WIDTH / 2;

// ──────────────────────────────────────────────

// STEP 1: Scarica immagini
async function downloadImages() {
  console.log("📥 STEP 1: Download immagini...\n");

  // Crea cartella temporanea
  if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
  }

  let successCount = 0;
  let failCount = 0;

  for (let i = START; i <= END; i++) {
    const url = `${BASE_URL}${i}${EXTENSION}`;
    const filename = `${i}${EXTENSION}`;
    const filePath = path.join(TEMP_DIR, filename);

    try {
      console.log(`📥 Scaricando ${i}/${END}...`);
      const response = await fetch(url);

      if (!response.ok) {
        console.log(`❌ Errore ${response.status}: ${url}`);
        failCount++;
        continue;
      }

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      fs.writeFileSync(filePath, buffer);
      successCount++;

      // Pausa breve
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      console.log(`❌ Errore: ${error.message}`);
      failCount++;
    }
  }

  console.log(`\n✅ Download completato: ${successCount} successi, ${failCount} errori\n`);
  return successCount > 0;
}

// STEP 2: Crea PDF
async function createPDF() {
  console.log("📚 STEP 2: Creazione PDF...\n");

  const pdfDoc = await PDFDocument.create();
  let processedPages = 0;

  for (let i = START; i <= END; i += 2) {
    const leftPageNum = i;
    const rightPageNum = i + 1;

    const leftImagePath = path.join(TEMP_DIR, `${leftPageNum}${EXTENSION}`);
    const rightImagePath = path.join(TEMP_DIR, `${rightPageNum}${EXTENSION}`);

    try {
      const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);

      // Immagine sinistra
      if (fs.existsSync(leftImagePath)) {
        console.log(`📄 Pagina ${leftPageNum} (sinistra)...`);
        const leftImageBytes = fs.readFileSync(leftImagePath);
        const leftImage = EXTENSION.toLowerCase().includes('jpg')
          ? await pdfDoc.embedJpg(leftImageBytes)
          : await pdfDoc.embedPng(leftImageBytes);

        const leftScale = Math.min(
          SINGLE_PAGE_WIDTH / leftImage.width,
          PAGE_HEIGHT / leftImage.height
        );
        const leftWidth = leftImage.width * leftScale;
        const leftHeight = leftImage.height * leftScale;

        page.drawImage(leftImage, {
          x: (SINGLE_PAGE_WIDTH - leftWidth) / 2,
          y: (PAGE_HEIGHT - leftHeight) / 2,
          width: leftWidth,
          height: leftHeight,
        });
      }

      // Immagine destra
      if (rightPageNum <= END && fs.existsSync(rightImagePath)) {
        console.log(`📄 Pagina ${rightPageNum} (destra)...`);
        const rightImageBytes = fs.readFileSync(rightImagePath);
        const rightImage = EXTENSION.toLowerCase().includes('jpg')
          ? await pdfDoc.embedJpg(rightImageBytes)
          : await pdfDoc.embedPng(rightImageBytes);

        const rightScale = Math.min(
          SINGLE_PAGE_WIDTH / rightImage.width,
          PAGE_HEIGHT / rightImage.height
        );
        const rightWidth = rightImage.width * rightScale;
        const rightHeight = rightImage.height * rightScale;

        page.drawImage(rightImage, {
          x: SINGLE_PAGE_WIDTH + (SINGLE_PAGE_WIDTH - rightWidth) / 2,
          y: (PAGE_HEIGHT - rightHeight) / 2,
          width: rightWidth,
          height: rightHeight,
        });
      }

      processedPages++;
    } catch (error) {
      console.error(`❌ Errore pagine ${leftPageNum}-${rightPageNum}:`, error.message);
    }
  }

  // Salva PDF
  console.log(`\n💾 Salvando PDF...`);
  const pdfBytes = await pdfDoc.save();
  const outputPath = path.resolve(__dirname, PDF_NAME);
  fs.writeFileSync(outputPath, pdfBytes);

  console.log(`\n✨ PDF creato con successo!`);
  console.log(`📁 File: ${outputPath}`);
  console.log(`📊 Pagine doppie: ${processedPages}`);
  console.log(`📄 Immagini totali: ${Math.min(END - START + 1, processedPages * 2)}`);
}

// STEP 3: Cleanup cartella temporanea
function cleanup() {
  console.log(`\n🧹 Pulizia file temporanei...`);
  if (fs.existsSync(TEMP_DIR)) {
    fs.rmSync(TEMP_DIR, { recursive: true, force: true });
    console.log(`✅ Cartella temporanea rimossa`);
  }
}

// ESEGUI TUTTO
async function main() {
  console.log("🚀 INIZIO PROCESSO COMPLETO\n");
  console.log(`📍 URL: ${BASE_URL}`);
  console.log(`📊 Range: ${START} - ${END}`);
  console.log(`📄 PDF finale: ${PDF_NAME}\n`);
  console.log("─────────────────────────────────────────\n");

  try {
    // Step 1: Download
    const downloadSuccess = await downloadImages();
    if (!downloadSuccess) {
      throw new Error("Download fallito, nessuna immagine scaricata");
    }

    // Step 2: Crea PDF
    await createPDF();

    // Step 3: Cleanup
    cleanup();

    console.log("\n🎉 COMPLETATO! PDF pronto da usare!");
  } catch (error) {
    console.error("\n❌ ERRORE:", error.message);
    process.exit(1);
  }
}

main().catch(console.error);
