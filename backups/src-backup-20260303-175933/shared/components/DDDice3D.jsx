import { useEffect, useState } from 'react';
import { initDiceBox } from '../../lib/diceBox.js';

export default function DDDice3D({
  diceType = 'd20',
  diceColor = '#d4af37',
  onRollComplete = null,
  autoRoll = true,
}) {
  const [isReady, setIsReady] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    let box = null;

    const setupDice = async () => {
      try {
        box = await initDiceBox();
        setIsReady(true);

        if (autoRoll) {
          // Un piccolo ritardo per rendere l'effetto visibile
          setTimeout(() => {
            rollDice(box, diceType);
          }, 300);
        }
      } catch (err) {
        console.error("Errore inizializzazione DiceBox:", err);
        setIsReady(false);
      }
    };

    setupDice();

    // Quando smontiamo il componente (es. il modal si chiude), puliamo i dadi
    return () => {
      if (box) {
        box.clear();
      }
    };
  }, [diceType, diceColor, autoRoll]);

  const rollDice = async (diceBoxApp, type) => {
    try {
      diceBoxApp.clear(); // Pulisci eventuali dadi vecchi

      // diceType es: "d20" -> @3d-dice richiede "1d20"
      const formattedType = type.match(/^\d+/) ? type : `1${type}`;

      // Passa themeColor in modo dinamico per evitare di dover ricaricare l'intero tema
      const rollResult = await diceBoxApp.roll(formattedType, { themeColor: diceColor });

      // result è un array di risultati
      if (rollResult && rollResult.length > 0) {
        const total = rollResult[0].value;
        setResult(total);
        if (onRollComplete) {
          onRollComplete(total);
        }
      }
    } catch (e) {
      console.error("Errore tiro dado 3d:", e);
      const sides = parseInt(type.replace('d', '')) || 20;
      const manualResult = Math.floor(Math.random() * sides) + 1;
      setResult(manualResult);
      if (onRollComplete) onRollComplete(manualResult);
    }
  };

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden' }}>
      {/* Non serve più un canvas locale perché diceBoxApp usa il #global-dice-container */}

      {/* Loading indicator */}
      {!isReady && (
        <div style={{
          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          fontFamily: 'var(--font-heading)', color: diceColor, textShadow: `0 0 20px ${diceColor}`, zIndex: 2
        }}>
          Caricamento Dadi 3D...
        </div>
      )}

      {/* Etichetta tipo dado */}
      {isReady && (
        <div
          style={{
            position: 'absolute',
            top: 20,
            left: '50%',
            transform: 'translateX(-50%)',
            fontFamily: 'var(--font-heading)',
            fontSize: '1.5rem',
            fontWeight: '900',
            color: diceColor,
            textShadow: `0 0 30px ${diceColor}, 0 0 60px ${diceColor}80`,
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            pointerEvents: 'none',
            zIndex: 10
          }}
        >
          {diceType.toUpperCase()}
        </div>
      )}
    </div>
  );
}
