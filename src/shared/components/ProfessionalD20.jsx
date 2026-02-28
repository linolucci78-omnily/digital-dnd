// ═══════════════════════════════════════════════
//  ProfessionalD20 — Dado d20 PROFESSIONALE
//  Usa sprite sheet da OpenGameArt (CC0)
//  Animazione frame-by-frame con numeri REALI
// ═══════════════════════════════════════════════

import { useRef, useEffect, useState } from 'react';
import { motion } from 'framer-motion';

export default function ProfessionalD20({
  diceType = 'd20',
  diceColor = '#d4af37',
  result = null,
  isRolling = false,
  size = 300,
}) {
  const [currentResult, setCurrentResult] = useState(1);
  const animationRef = useRef(null);

  // Mappa il colore hex a uno dei colori disponibili nel pack
  const getPackColor = (hexColor) => {
    const colorMap = {
      '#d4af37': 'yellow',  // Gold
      '#f0d060': 'yellow',  // Gold chiaro
      '#c04040': 'red',     // Rosso
      '#60c0f0': 'blue',    // Blu
      '#40c040': 'green',   // Verde
      '#9b59b6': 'purple',  // Viola
    };

    return colorMap[hexColor.toLowerCase()] || 'yellow'; // Default yellow per gold
  };

  const packColor = getPackColor(diceColor);

  // Anima cambiando immagine quando sta rollando
  useEffect(() => {
    if (!isRolling) {
      // Ferma l'animazione
      if (animationRef.current) {
        clearInterval(animationRef.current);
      }
      // Imposta il risultato finale
      if (result !== null) {
        setCurrentResult(result);
      }
      return;
    }

    // Avvia animazione cambiando numero random
    animationRef.current = setInterval(() => {
      const randomNum = Math.floor(Math.random() * 20) + 1;
      setCurrentResult(randomNum);
    }, 80); // Cambia ogni 80ms per effetto veloce

    return () => {
      if (animationRef.current) {
        clearInterval(animationRef.current);
      }
    };
  }, [isRolling, result]);

  // Path dell'immagine dal HiResDicePack
  const imagePath = `/dice/HiResDicePack/D20/d20_${packColor}_${currentResult}.png`;

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
      {/* Dado immagine animata */}
      <motion.div
        animate={isRolling ? {
          rotateX: [0, 360, 720, 1080],
          rotateY: [0, 360, 720, 1080],
          rotateZ: [0, 360, 720, 1080],
          scale: [1, 1.2, 1.1, 1.2, 1],
        } : {
          rotateX: 0,
          rotateY: 0,
          rotateZ: 0,
          scale: 1,
        }}
        transition={{
          duration: isRolling ? 2.5 : 0.5,
          ease: isRolling ? "easeOut" : "easeInOut",
        }}
        style={{
          width: size,
          height: size,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transformStyle: 'preserve-3d',
          perspective: '1000px',
        }}
      >
        <img
          src={imagePath}
          alt={`d20 showing ${currentResult}`}
          style={{
            maxWidth: '100%',
            maxHeight: '100%',
            objectFit: 'contain',
            filter: `
              drop-shadow(0 0 30px ${diceColor}80)
              drop-shadow(0 0 60px ${diceColor}40)
              drop-shadow(0 10px 30px rgba(0,0,0,0.5))
            `,
          }}
        />
      </motion.div>

      {/* Etichetta tipo dado */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          position: 'absolute',
          bottom: 10,
          left: '50%',
          transform: 'translateX(-50%)',
          fontFamily: 'var(--font-heading)',
          fontSize: '1.3rem',
          fontWeight: '700',
          color: diceColor,
          textShadow: `0 0 20px ${diceColor}, 0 0 40px ${diceColor}`,
          letterSpacing: '0.4em',
          textTransform: 'uppercase',
          pointerEvents: 'none',
          background: 'rgba(0,0,0,0.9)',
          padding: '8px 20px',
          borderRadius: '12px',
          border: `3px solid ${diceColor}80`,
          backdropFilter: 'blur(10px)',
        }}
      >
        D20
      </motion.div>

      {/* Risultato ENORME quando si ferma */}
      {!isRolling && result !== null && (
        <motion.div
          initial={{ opacity: 0, scale: 0.3 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{
            type: 'spring',
            stiffness: 300,
            damping: 15,
            delay: 0.2,
          }}
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            fontFamily: 'var(--font-heading)',
            fontSize: '6rem',
            fontWeight: '900',
            color: '#fff',
            textShadow: `
              0 0 60px ${diceColor},
              0 0 120px ${diceColor},
              0 0 180px ${diceColor}80,
              0 10px 40px rgba(0,0,0,0.9),
              0 0 20px #fff
            `,
            pointerEvents: 'none',
            zIndex: 20,
            lineHeight: 1,
            WebkitTextStroke: `3px ${diceColor}`,
            paintOrder: 'stroke fill',
            filter: 'drop-shadow(0 0 30px #fff)',
          }}
        >
          {result}
        </motion.div>
      )}
    </div>
  );
}
