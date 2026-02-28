// ═══════════════════════════════════════════════
//  FinalDiceBox — Singleton DiceBox via CDN
//  
//  USO: Metti <FinalDiceBox ref={diceRef} /> a livello TVScreen (sempre montato).
//  Chiama roll() tramite ref:
//
//  diceRef.current.roll("2d6+3", (results) => {...})
// ═══════════════════════════════════════════════

import { useState, useEffect, useRef, useImperativeHandle, forwardRef } from 'react';

const VER = "1.1.3";
const CDN = `https://unpkg.com/@3d-dice/dice-box@${VER}/dist`;

const FinalDiceBox = forwardRef(function FinalDiceBox({ scale = 9 }, ref) {
  const [status, setStatus] = useState('loading');
  const [visible, setVisible] = useState(false);
  const boxRef = useRef(null);
  const initRef = useRef(false);
  const rollCallbackRef = useRef(null);

  // Esponi metodi al parent tramite ref
  useImperativeHandle(ref, () => ({
    roll: (notation, onComplete) => {
      if (!boxRef.current) {
        console.warn('🎲 DiceBox non ancora pronto');
        return false;
      }

      rollCallbackRef.current = onComplete;
      setVisible(true);

      // Clear dadi precedenti e lancia
      console.log('🎲 Lancio:', notation);
      boxRef.current.clear();

      requestAnimationFrame(() => {
        boxRef.current.roll(notation);
      });

      return true;
    },
    hide: () => {
      setVisible(false);
      if (boxRef.current) {
        boxRef.current.clear();
      }
    },
    isReady: () => status === 'ready',
  }));

  // Init una sola volta
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    (async () => {
      try {
        console.log('🎲 Carico DiceBox dal CDN...');

        const { default: DiceBox } = await import(
          /* @vite-ignore */ `${CDN}/dice-box.es.min.js`
        );

        const box = new DiceBox({
          assetPath: "assets/",
          origin: `${CDN}/`,
          container: "#dice-box-persistent",
          id: "dice-box-canvas",
          gravity: 2,
          mass: 1,
          friction: 0.8,
          restitution: 0,
          angularDamping: 0.4,
          linearDamping: 0.4,
          spinForce: 6,
          throwForce: 5,
          startingHeight: 8,
          settleTimeout: 4000,
          delay: 10,
          lightIntensity: 1.3,
          enableShadows: true,
          shadowTransparency: 0.8,
          theme: "default",
          themeColor: "#d4af37",
          scale,
          offscreen: true,
          onRollComplete: (results) => {
            console.log('🎲 Risultato:', results);
            if (rollCallbackRef.current) {
              rollCallbackRef.current(results);
            }
          },
        });

        await box.init();
        console.log('✅ DiceBox pronto!');

        boxRef.current = box;
        setStatus('ready');
      } catch (e) {
        console.error('❌ DiceBox errore:', e);
        setStatus('error');
      }
    })();
  }, [scale]);

  return (
    <div
      id="dice-box-persistent"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: visible ? 150 : -1,
        opacity: visible ? 1 : 0,
        pointerEvents: visible ? 'auto' : 'none',
        transition: 'opacity 0.3s ease',
        background: 'transparent',
        width: '100vw',
        height: '100vh',
      }}
    />
  );
});

export default FinalDiceBox;
