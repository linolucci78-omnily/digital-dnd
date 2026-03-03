// ═══════════════════════════════════════════════
//  TealDice3D — Dadi 3D professionali
//  Usa la libreria Teal (Anton Natarov) - quella
//  usata da Roll20, Foundry VTT, D&D Beyond
// ═══════════════════════════════════════════════

import { useRef, useEffect, useState } from 'react';

export default function TealDice3D({
  diceType = 'd20',
  diceColor = '#d4af37',
  result = null,
  isRolling = false,
  onRollComplete = () => {},
  size = 250,
}) {
  const containerRef = useRef(null);
  const diceBoxRef = useRef(null);
  const [error, setError] = useState(null);

  // Inizializza Dice Box
  useEffect(() => {
    if (!containerRef.current || !window.DICE || !window.THREE || !window.CANNON) {
      setError('Librerie 3D non caricate');
      return;
    }

    try {
      // Crea il dice box
      const box = new window.DICE.dice_box(containerRef.current, {
        w: size * 1.5,
        h: size * 1.5,
      });

      // Configura aspetto dadi
      box.set_color(diceColor);

      diceBoxRef.current = box;
      setError(null);
    } catch (e) {
      console.error('Errore inizializzazione Teal Dice:', e);
      setError(e.message);
    }

    return () => {
      // Cleanup
      if (diceBoxRef.current && diceBoxRef.current.clear) {
        diceBoxRef.current.clear();
      }
    };
  }, [size, diceColor]);

  // Lancia i dadi quando isRolling diventa true
  useEffect(() => {
    if (!isRolling || !diceBoxRef.current || !result) return;

    try {
      // Notazione dadi (es: "1d20", "2d6", ecc)
      const notation = `1${diceType}`;

      diceBoxRef.current.start_throw(
        () => {
          // Before throw
          console.log('🎲 Lancio dadi:', notation);
        },
        (rollResult) => {
          // After throw - risultato dal roll
          console.log('🎲 Risultato roll:', rollResult);

          // Aspetta un attimo prima di mostrare il risultato finale
          setTimeout(() => {
            onRollComplete(result);
          }, 500);
        },
        notation
      );
    } catch (e) {
      console.error('Errore lancio dadi:', e);
      setError(e.message);
    }
  }, [isRolling, diceType, result, onRollComplete]);

  if (error) {
    return (
      <div style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: 10,
        color: '#c04040',
        fontFamily: 'var(--font-body)',
        fontSize: '0.9rem',
      }}>
        <div>⚠️ Errore 3D Dice</div>
        <div style={{ fontSize: '0.7rem', opacity: 0.7 }}>{error}</div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        filter: `drop-shadow(0 0 20px ${diceColor}80)`,
      }}
    />
  );
}
