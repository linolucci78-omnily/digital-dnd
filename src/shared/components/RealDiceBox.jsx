// ═══════════════════════════════════════════════
//  RealDiceBox — DADI 3D VERI con fisica
//  Usa @3d-dice/dice-box - LA libreria dei VTT professionali
//  Stessa tecnologia di D&D Beyond, Roll20, Foundry VTT
// ═══════════════════════════════════════════════

import { useRef, useEffect, useState } from 'react';
import DiceBox from '@3d-dice/dice-box';

export default function RealDiceBox({
  diceType = 'd20',
  diceColor = '#d4af37',
  result = null,
  isRolling = false,
  onRollComplete = () => {},
}) {
  console.log('🎲 RealDiceBox RENDER - diceType:', diceType, 'result:', result, 'isRolling:', isRolling);

  const diceBoxRef = useRef(null);
  const [initialized, setInitialized] = useState(false);
  const [error, setError] = useState(null);
  const containerIdRef = useRef(`dice-box-${Math.random().toString(36).slice(2)}`);

  // Inizializza DiceBox quando il container è pronto
  const initDiceBox = async (container) => {
    if (!container || initialized || diceBoxRef.current) return;

    try {
      console.log('🎲 Inizio inizializzazione DiceBox...');
      console.log('Container:', container);

      // NUOVA API v1.1.0+ - passa solo config object
      const Box = new DiceBox({
        id: containerIdRef.current,  // ID del container (senza #)
        assetPath: '/assets/dice-box/assets/',  // FIX: aggiunto /assets/ finale!
        theme: 'default',
        themeColor: diceColor,
        offscreen: false,
        scale: 9,           // Dadi GRANDI per la TV (come D&D Beyond)
        gravity: 3,         // Gravità pesante (feeling realistico)
        friction: 0.8,      // Alta friction per rotolamento naturale
        restitution: 0.4,   // Rimbalzo moderato
        linearDamping: 0.5, // Rallentamento graduale
        angularDamping: 0.4,
      });

      console.log('🎲 DiceBox creato, ora inizializzo...');

      await Box.init();

      console.log('✅ DiceBox.init() completato!');

      diceBoxRef.current = Box;
      setInitialized(true);
      console.log('✅ DiceBox pronto!');
    } catch (e) {
      console.error('❌ Errore DiceBox completo:', e);
      console.error('Stack:', e.stack);
      setError(e.message || 'Errore sconosciuto');
    }
  };

  // Cleanup quando il componente si smonta
  useEffect(() => {
    return () => {
      if (diceBoxRef.current) {
        console.log('🎲 Cleanup DiceBox');
        diceBoxRef.current.clear();
      }
    };
  }, []);

  // Lancia i dadi quando isRolling diventa true
  useEffect(() => {
    if (!isRolling || !initialized || !diceBoxRef.current || !result) return;

    const rollDice = async () => {
      try {
        // Notazione dadi: "1d20", "2d6+5", ecc.
        const notation = `1${diceType}`;

        console.log('🎲 Lancio:', notation);

        const rollResult = await diceBoxRef.current.roll(notation);

        console.log('🎲 Risultato:', rollResult);

        // Attendi che l'animazione finisca
        setTimeout(() => {
          onRollComplete(result);
        }, 3000);
      } catch (e) {
        console.error('❌ Errore lancio:', e);
        setError(e.message);
      }
    };

    rollDice();
  }, [isRolling, initialized, diceType, result, onRollComplete]);

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

  if (!initialized) {
    return (
      <div style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: diceColor,
        fontFamily: 'var(--font-heading)',
        fontSize: '1rem',
      }}>
        Caricamento dadi 3D...
      </div>
    );
  }

  return (
    <div
      id={containerIdRef.current}
      ref={(el) => {
        console.log('🎲 Callback ref chiamato - el:', el, 'initialized:', initialized, 'diceBoxRef.current:', diceBoxRef.current);
        if (el && !initialized && !diceBoxRef.current) {
          console.log('🎲 Chiamo initDiceBox...');
          initDiceBox(el);
        }
      }}
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
      }}
    />
  );
}
