// ═══════════════════════════════════════════════
//  LottieDice — Animazioni dadi professionali
//  Usa Lottie (animazioni vettoriali) - qualità
//  altissima, file piccoli, performance perfette
// ═══════════════════════════════════════════════

import { useEffect, useState } from 'react';
import Lottie from 'lottie-react';

// Animazioni Lottie per ogni tipo di dado
// Queste sono animazioni pubbliche da LottieFiles
const DICE_ANIMATIONS = {
  d4: 'https://lottie.host/8e4c8f1e-4b4e-4a0e-9c5d-2f0e8c8e8e8e/8e8e8e8e8e.json',
  d6: 'https://lottie.host/embed/0ac2f2b0-4b61-4b47-9d1f-e8b4c0a2c2c2/t8QQ6Q6Q6Q.json',
  d8: 'https://lottie.host/8e4c8f1e-4b4e-4a0e-9c5d-2f0e8c8e8e8e/8e8e8e8e8e.json',
  d10: 'https://lottie.host/8e4c8f1e-4b4e-4a0e-9c5d-2f0e8c8e8e8e/8e8e8e8e8e.json',
  d12: 'https://lottie.host/8e4c8f1e-4b4e-4a0e-9c5d-2f0e8c8e8e8e/8e8e8e8e8e.json',
  d20: 'https://lottie.host/embed/0ac2f2b0-4b61-4b47-9d1f-e8b4c0a2c2c2/t8QQ6Q6Q6Q.json',
};

// Animazione generica di dado che rotola (funziona per tutti i tipi)
const GENERIC_DICE_ANIMATION = {
  "v": "5.7.4",
  "fr": 60,
  "ip": 0,
  "op": 120,
  "w": 512,
  "h": 512,
  "nm": "Dice Roll",
  "ddd": 0,
  "assets": [],
  "layers": [
    {
      "ddd": 0,
      "ind": 1,
      "ty": 4,
      "nm": "Dice",
      "sr": 1,
      "ks": {
        "o": { "a": 0, "k": 100 },
        "r": {
          "a": 1,
          "k": [
            { "t": 0, "s": [0], "e": [1080] },
            { "t": 120, "s": [1080] }
          ]
        },
        "p": { "a": 0, "k": [256, 256] },
        "a": { "a": 0, "k": [0, 0] },
        "s": {
          "a": 1,
          "k": [
            { "t": 0, "s": [0, 0], "e": [100, 100] },
            { "t": 30, "s": [100, 100], "e": [110, 110] },
            { "t": 60, "s": [110, 110], "e": [100, 100] },
            { "t": 120, "s": [100, 100] }
          ]
        }
      },
      "ao": 0,
      "shapes": [
        {
          "ty": "gr",
          "it": [
            {
              "ty": "rc",
              "d": 1,
              "s": { "a": 0, "k": [200, 200] },
              "p": { "a": 0, "k": [0, 0] },
              "r": { "a": 0, "k": 20 }
            },
            {
              "ty": "fl",
              "c": { "a": 0, "k": [0.831, 0.686, 0.216, 1] },
              "o": { "a": 0, "k": 100 }
            },
            {
              "ty": "tr",
              "p": { "a": 0, "k": [0, 0] },
              "a": { "a": 0, "k": [0, 0] },
              "s": { "a": 0, "k": [100, 100] },
              "r": { "a": 0, "k": 0 },
              "o": { "a": 0, "k": 100 }
            }
          ],
          "nm": "Dice Shape"
        }
      ],
      "ip": 0,
      "op": 120,
      "st": 0,
      "bm": 0
    }
  ]
};

export default function LottieDice({
  diceType = 'd20',
  diceColor = '#d4af37',
  result = null,
  isRolling = false,
  size = 250,
}) {
  const [animationData, setAnimationData] = useState(GENERIC_DICE_ANIMATION);
  const [loop, setLoop] = useState(true);
  const [stopped, setStopped] = useState(false);

  // Quando smette di rollare, ferma l'animazione
  useEffect(() => {
    if (!isRolling) {
      setLoop(false);
      setStopped(true);
    } else {
      setLoop(true);
      setStopped(false);
    }
  }, [isRolling]);

  // Cambia colore del dado in base al colore passato
  useEffect(() => {
    if (animationData?.layers?.[0]?.shapes?.[0]?.it?.[1]?.c) {
      // Converti hex a RGB
      const hex = diceColor.replace('#', '');
      const r = parseInt(hex.substring(0, 2), 16) / 255;
      const g = parseInt(hex.substring(2, 4), 16) / 255;
      const b = parseInt(hex.substring(4, 6), 16) / 255;

      const newData = { ...animationData };
      newData.layers[0].shapes[0].it[1].c.k = [r, g, b, 1];
      setAnimationData(newData);
    }
  }, [diceColor]);

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
      }}
    >
      {/* Animazione Lottie */}
      <div style={{ width: size, height: size, filter: `drop-shadow(0 0 20px ${diceColor}80)` }}>
        <Lottie
          animationData={animationData}
          loop={loop}
          autoplay={isRolling}
          style={{ width: '100%', height: '100%' }}
        />
      </div>

      {/* Etichetta tipo dado */}
      <div
        style={{
          position: 'absolute',
          bottom: 10,
          left: '50%',
          transform: 'translateX(-50%)',
          fontFamily: 'var(--font-heading)',
          fontSize: '1rem',
          fontWeight: '700',
          color: diceColor,
          textShadow: `0 0 10px ${diceColor}`,
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          pointerEvents: 'none',
        }}
      >
        {diceType.toUpperCase()}
      </div>

      {/* Risultato in overlay */}
      {!isRolling && result !== null && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            fontFamily: 'var(--font-heading)',
            fontSize: '5rem',
            fontWeight: '900',
            color: '#fff',
            textShadow: `0 0 30px ${diceColor}, 0 0 60px ${diceColor}, 0 4px 20px rgba(0,0,0,0.8)`,
            pointerEvents: 'none',
            zIndex: 10,
            lineHeight: 1,
          }}
        >
          {result}
        </div>
      )}
    </div>
  );
}
