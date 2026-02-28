// ═══════════════════════════════════════════════
//  Script per creare PDF a LIBRO dalle immagini
//  Combina 2 immagini per pagina (sinistra + destra)
// ═══════════════════════════════════════════════

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { PDFDocument } from 'pdf-lib';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ──────────────────────────────────────────────
// ⚙️ CONFIGURAZIONE
// ──────────────────────────────────────────────

const INPUT_DIR = "./public/maps";           // Cartella con le immagini
const OUTPUT_FILE = "./campaign-guide.pdf";  // Nome del PDF finale
const START = 1;                             // Numero iniziale
const END = 64;                              // Numero finale
const EXTENSION = ".jpg";                    // Estensione immagini

// Layout a libro: 2 pagine affiancate
const PAGE_WIDTH = 1684;   // Larghezza totale (2 pagine A4 orizzontali: 842 x 2)
const PAGE_HEIGHT = 1191;  // Altezza A4 orizzontale
const SINGLE_PAGE_WIDTH = PAGE_WIDTH / 2; // Larghezza di una singola pagina

// ──────────────────────────────────────────────

async function createBookPDF() {
  console.log("📚 Creazione PDF a libro...\n");

  // Crea nuovo documento PDF
  const pdfDoc = await PDFDocument.create();

  let processedPages = 0;
  let errorCount = 0;

  // Processa le immagini a coppie (sinistra + destra)
  for (let i = START; i <= END; i += 2) {
    const leftPageNum = i;
    const rightPageNum = i + 1;

    const leftImagePath = path.join(__dirname, INPUT_DIR, `${leftPageNum}${EXTENSION}`);
    const rightImagePath = path.join(__dirname, INPUT_DIR, `${rightPageNum}${EXTENSION}`);

    try {
      // Crea nuova pagina nel PDF
      const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);

      // Carica immagine sinistra
      if (fs.existsSync(leftImagePath)) {
        console.log(`📄 Aggiungendo pagina ${leftPageNum} (sinistra)...`);
        const leftImageBytes = fs.readFileSync(leftImagePath);
        const leftImage = EXTENSION.toLowerCase() === '.jpg' || EXTENSION.toLowerCase() === '.jpeg'
          ? await pdfDoc.embedJpg(leftImageBytes)
          : await pdfDoc.embedPng(leftImageBytes);

        // Calcola dimensioni per mantenere aspect ratio
        const leftScale = Math.min(
          SINGLE_PAGE_WIDTH / leftImage.width,
          PAGE_HEIGHT / leftImage.height
        );
        const leftWidth = leftImage.width * leftScale;
        const leftHeight = leftImage.height * leftScale;

        // Disegna immagine sinistra
        page.drawImage(leftImage, {
          x: (SINGLE_PAGE_WIDTH - leftWidth) / 2, // Centra nella metà sinistra
          y: (PAGE_HEIGHT - leftHeight) / 2,      // Centra verticalmente
          width: leftWidth,
          height: leftHeight,
        });
      } else {
        console.log(`⚠️  Immagine ${leftPageNum} non trovata, lasciando vuota`);
      }

      // Carica immagine destra (se esiste)
      if (rightPageNum <= END && fs.existsSync(rightImagePath)) {
        console.log(`📄 Aggiungendo pagina ${rightPageNum} (destra)...`);
        const rightImageBytes = fs.readFileSync(rightImagePath);
        const rightImage = EXTENSION.toLowerCase() === '.jpg' || EXTENSION.toLowerCase() === '.jpeg'
          ? await pdfDoc.embedJpg(rightImageBytes)
          : await pdfDoc.embedPng(rightImageBytes);

        // Calcola dimensioni per mantenere aspect ratio
        const rightScale = Math.min(
          SINGLE_PAGE_WIDTH / rightImage.width,
          PAGE_HEIGHT / rightImage.height
        );
        const rightWidth = rightImage.width * rightScale;
        const rightHeight = rightImage.height * rightScale;

        // Disegna immagine destra
        page.drawImage(rightImage, {
          x: SINGLE_PAGE_WIDTH + (SINGLE_PAGE_WIDTH - rightWidth) / 2, // Centra nella metà destra
          y: (PAGE_HEIGHT - rightHeight) / 2,                          // Centra verticalmente
          width: rightWidth,
          height: rightHeight,
        });
      } else if (rightPageNum <= END) {
        console.log(`⚠️  Immagine ${rightPageNum} non trovata, lasciando vuota`);
      }

      processedPages++;
    } catch (error) {
      console.error(`❌ Errore processando pagine ${leftPageNum}-${rightPageNum}:`, error.message);
      errorCount++;
    }
  }

  // Salva PDF
  console.log(`\n💾 Salvando PDF...`);
  const pdfBytes = await pdfDoc.save();
  const outputPath = path.resolve(__dirname, OUTPUT_FILE);
  fs.writeFileSync(outputPath, pdfBytes);

  console.log(`\n✨ PDF creato con successo!`);
  console.log(`📁 Percorso: ${outputPath}`);
  console.log(`📊 Pagine doppie create: ${processedPages}`);
  console.log(`📄 Immagini totali: ${Math.min(END - START + 1, processedPages * 2)}`);
  if (errorCount > 0) {
    console.log(`⚠️  Errori: ${errorCount}`);
  }
  console.log(`\n🎉 Apri il PDF per vedere il formato a libro!`);
}

createBookPDF().catch(console.error);
