// ═══════════════════════════════════════════════
//  ProfessionalDice3D — Dadi 3D professionali
//  Usa la libreria @3d-dice/dice-box
//  Texture realistiche, fisica, numeri perfetti
// ═══════════════════════════════════════════════

import { useEffect, useRef, useState } from 'react';
import DiceBox from '@3d-dice/dice-box';

export default function ProfessionalDice3D({
  diceType = 'd20',
  diceColor = '#d4af37',
  onRollComplete = null,
  autoRoll = true,
}) {
  const containerRef = useRef(null);
  const diceBoxRef = useRef(null);
  const [isReady, setIsReady] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (!containerRef.current || diceBoxRef.current) return;

    // Inizializza DiceBox
    const initDiceBox = async () => {
      try {
        const Box = new DiceBox(
          '#dice-box', // Selettore DOM richiesto
          {
            assetPath: 'https://unpkg.com/@3d-dice/dice-box@1.1.4/dist/assets/',
            theme: 'default',
            themeColor: diceColor,
            offscreen: false,
            scale: 6,
          }
        );

        // Inizializza il box
        await Box.init();

        diceBoxRef.current = Box;
        setIsReady(true);

        // Ascolta il risultato del lancio
        Box.onRollComplete = (results) => {
          console.log('🎲 Risultato dado:', results);
          if (results && results.length > 0) {
            const total = results.reduce((sum, die) => sum + die.value, 0);
            setResult(total);
            if (onRollComplete) {
              onRollComplete(total);
            }
          }
        };

        // Auto-roll se richiesto
        if (autoRoll) {
          setTimeout(() => {
            Box.roll(`1${diceType}`);
          }, 500);
        }
      } catch (error) {
        console.error('Errore inizializzazione DiceBox:', error);
      }
    };

    initDiceBox();

    // Cleanup
    return () => {
      if (diceBoxRef.current) {
        diceBoxRef.current.clear();
        diceBoxRef.current = null;
      }
    };
  }, [diceType, diceColor, autoRoll, onRollComplete]);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      {/* Container per DiceBox */}
      <div
        ref={containerRef}
        id="dice-box"
        style={{
          width: '100%',
          height: '100%',
          position: 'relative',
        }}
      />

      {/* Loading indicator */}
      {!isReady && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            fontFamily: 'var(--font-heading)',
            color: diceColor,
            fontSize: '1.2rem',
            textShadow: `0 0 20px ${diceColor}`,
          }}
        >
          Caricamento dado 3D...
        </div>
      )}

      {/* Risultato */}
      {result !== null && (
        <div
          style={{
            position: 'absolute',
            bottom: 20,
            left: '50%',
            transform: 'translateX(-50%)',
            fontFamily: 'var(--font-heading)',
            fontSize: '2rem',
            fontWeight: '900',
            color: diceColor,
            textShadow: `0 0 30px ${diceColor}, 0 0 60px ${diceColor}80`,
            pointerEvents: 'none',
          }}
        >
          {result}
        </div>
      )}
    </div>
  );
}
