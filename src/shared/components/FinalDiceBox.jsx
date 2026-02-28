// ═══════════════════════════════════════════════
//  FinalDiceBox — Copia ESATTA dell'HTML che funzionava
//  Container: position relative, 100vw x 100vh
//  Canvas forzato a riempire con !important
// ═══════════════════════════════════════════════

import { useEffect, useRef, useImperativeHandle, forwardRef, useState } from 'react';

const VER = "1.1.3";
const CDN = `https://unpkg.com/@3d-dice/dice-box@${VER}/dist`;

// Container RELATIVE come vuole DiceBox
const CONTAINER_STYLE = {
  position: 'relative',
  width: '100%',
  height: '100%',
};

// CSS iniettato per forzare il canvas a schermo intero
const FORCE_CSS = `
  #dice-box-canvas {
    width: 100vw !important;
    height: 100vh !important;
    position: fixed !important;
    top: 0 !important;
    left: 0 !important;
    z-index: 999 !important;
  }
  #dice-box-persistent canvas {
    width: 100vw !important;
    height: 100vh !important;
    position: fixed !important;
    top: 0 !important;
    left: 0 !important;
    z-index: 999 !important;
  }
`;

const FinalDiceBox = forwardRef(function FinalDiceBox(_, ref) {
  const [visible, setVisible] = useState(false);
  const [ready, setReady] = useState(false);
  const boxRef = useRef(null);
  const initRef = useRef(false);
  const callbackRef = useRef(null);
  const isRollingRef = useRef(false);
  const currentThemeRef = useRef("default");  // Default theme
  const DiceBoxClassRef = useRef(null);
  const audioRef = useRef(null);

  // Funzione per riprodurre il suono del dado
  const playDiceSound = (notation) => {
    try {
      // Parsa notation (es. "3d20" o "d20")
      const match = notation.match(/(\d*)d(\d+)/i);
      if (!match) return;

      let count = Math.min(parseInt(match[1] || "1"), 10); // Max 10 dadi
      let diceType = `d${match[2]}`; // d4, d6, d8, d10, d12, d20, d100

      // Per d100, usa il suono di 2 dadi
      if (diceType === "d100") {
        count = 2;
      }

      // Costruisci path del file audio
      const soundPath = `/sounds/${diceType}/Roll ${count}${diceType}.wav`;

      console.log(`🔊 Riproduco suono: ${soundPath}`);

      // Ferma audio precedente se in riproduzione
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }

      // Crea e riproduci nuovo audio
      audioRef.current = new Audio(soundPath);
      audioRef.current.volume = 0.7; // Volume al 70%
      audioRef.current.play().catch(err => {
        console.warn('⚠️ Errore riproduzione audio:', err);
      });
    } catch (e) {
      console.warn('⚠️ Errore playDiceSound:', e);
    }
  };

  useImperativeHandle(ref, () => ({
    roll: async (notation, onComplete, options = {}) => {
      console.log('🎯 roll() chiamato con notation:', notation, 'isRolling:', isRollingRef.current);
      console.log('🎨 Opzioni ricevute:', options);

      // Riproduci suono dado
      playDiceSound(notation);

      const requestedTheme = options.theme || "default";
      console.log('🎨 Tema richiesto:', requestedTheme);
      console.log('🎨 Tema corrente:', currentThemeRef.current);

      // Aggiorna il tema usando updateConfig
      if (requestedTheme !== currentThemeRef.current && boxRef.current) {
        console.log('🎨 CAMBIO TEMA da', currentThemeRef.current, 'a', requestedTheme);
        try {
          boxRef.current.updateConfig({ theme: requestedTheme, scale: 10 });
          currentThemeRef.current = requestedTheme;
          console.log('✅ Tema aggiornato con updateConfig() - scala forzata a 10');
        } catch (e) {
          console.warn('⚠️ Errore updateConfig:', e);
        }
      }

      // BLOCCA se c'è già un lancio in corso
      if (isRollingRef.current) {
        console.warn('⏸️ BLOCCO: lancio già in corso, ignoro questo');
        return false;
      }

      if (!boxRef.current) {
        console.warn('🎲 DiceBox non pronto');
        return false;
      }

      // Segna che un lancio è in corso
      isRollingRef.current = true;
      callbackRef.current = onComplete;

      // Prima nascondi, aspetta, poi mostra e lancia
      setVisible(false);

      setTimeout(() => {
        // Clear triplo
        if (boxRef.current) {
          boxRef.current.clear();
          boxRef.current.clear();
          boxRef.current.clear();
          console.log('🧹 Clear triplo eseguito');
        }

        setVisible(true);

        // Aspetta che sia visibile, poi lancia CON RISULTATI NATURALI
        setTimeout(() => {
          if (boxRef.current) {
            console.log('🎲 Lancio dadi - notation:', notation, 'tema:', currentThemeRef.current);
            boxRef.current.roll(notation);
          }
        }, 100);
      }, 300);

      // Sblocca dopo 4 secondi
      setTimeout(() => {
        isRollingRef.current = false;
        console.log('🔓 Lancio completato, sbloccato');
      }, 4000);

      return true;
    },
    hide: () => {
      console.log('👻 hide() chiamato');
      setVisible(false);
      isRollingRef.current = false; // Sblocca
      if (boxRef.current) {
        boxRef.current.clear();
        boxRef.current.clear();
        console.log('🧹 Canvas cleared e sbloccato');
      }
    },
    isReady: () => ready,
  }));

  useEffect(() => {
    console.log('🔄 useEffect eseguito! initRef.current =', initRef.current);
    if (initRef.current) {
      console.log('⏭️ Già inizializzato, skip');
      return;
    }
    initRef.current = true;

    // Inietta CSS forzato
    const style = document.createElement('style');
    style.textContent = FORCE_CSS;
    document.head.appendChild(style);
    console.log('💉 CSS iniettato');

    (async () => {
      try {
        console.log('🎲 Inizio caricamento DiceBox dal CDN:', CDN);
        const { default: DiceBox } = await import(
          /* @vite-ignore */ `${CDN}/dice-box.es.min.js`
        );
        console.log('📥 DiceBox scaricato, classe:', DiceBox);

        // Salva la classe per poterla riutilizzare
        DiceBoxClassRef.current = DiceBox;

        // Crea istanza iniziale con tema default
        const box = new DiceBox({
          assetPath: "/assets/",
          container: "#dice-box-persistent",
          id: "dice-box-canvas",
          gravity: 2,
          mass: 1,
          friction: 0.8,
          restitution: 0,
          angularDamping: 0.4,
          linearDamping: 0.4,
          spinForce: 5,
          throwForce: 4,
          startingHeight: 6,
          settleTimeout: 3000,
          delay: 10,
          lightIntensity: 1.3,
          enableShadows: true,
          shadowTransparency: 0.8,
          theme: "default",
          scale: 10,  // ✨ Dimensione più contenuta
          offscreen: false,
          onRollComplete: (results) => {
            console.log('🎲 Risultato:', results);
            if (callbackRef.current) callbackRef.current(results);
          },
        });

        await box.init();
        console.log('✅ DiceBox pronto!');
        console.log('📦 Container:', document.getElementById('dice-box-persistent'));

        const canvas = document.getElementById('dice-box-canvas');
        console.log('🎨 Canvas PRIMA del resize:', canvas);

        // FORZA resize del canvas a schermo intero
        if (canvas) {
          setTimeout(() => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            console.log('📐 Canvas ridimensionato a:', canvas.width, 'x', canvas.height);

            // Trigger resize event per DiceBox
            if (box.resize) {
              box.resize(window.innerWidth, window.innerHeight);
              console.log('📐 DiceBox.resize() chiamato');
            }
          }, 200);
        }

        boxRef.current = box;
        currentThemeRef.current = "default";  // Default theme
        setReady(true);
      } catch (e) {
        console.error('❌ DiceBox errore durante inizializzazione:', e);
        console.error('Stack:', e.stack);
      }
    })();

    console.log('✨ useEffect completato, async init avviato');


    return () => {
      style.remove();
    };
  }, []);

  // Wrapper FIXED esterno a schermo intero, container RELATIVE interno
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      zIndex: 1000,
      opacity: visible ? 1 : 0,
      pointerEvents: 'none',
      transition: 'opacity 0.3s',
      visibility: visible ? 'visible' : 'hidden',
    }}>
      <div
        id="dice-box-persistent"
        style={CONTAINER_STYLE}
      />
    </div>
  );
});

export default FinalDiceBox;
