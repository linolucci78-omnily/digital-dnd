// ═══════════════════════════════════════════════
//  SpriteSheetDice — Dadi con sprite sheet
//  Animazioni pre-renderizzate professionali
//  Frame-by-frame come nei videogiochi AAA
// ═══════════════════════════════════════════════

import { useRef, useEffect, useState } from 'react';
import { motion } from 'framer-motion';

export default function SpriteSheetDice({
  diceType = 'd20',
  diceColor = '#d4af37',
  result = null,
  isRolling = false,
  size = 300,
}) {
  const [currentFrame, setCurrentFrame] = useState(0);
  const animationRef = useRef(null);

  // Sprite sheet configurations
  const SPRITE_CONFIG = {
    d20: {
      image: '/d20-sprite.png',
      frameCount: 12,
      frameWidth: 512,
      frameHeight: 512,
      fps: 24,
    },
  };

  const config = SPRITE_CONFIG[diceType] || SPRITE_CONFIG.d20;

  // Anima lo sprite sheet quando sta rollando
  useEffect(() => {
    if (!isRolling) {
      // Ferma l'animazione
      if (animationRef.current) {
        clearInterval(animationRef.current);
      }
      // Mostra frame finale basato sul risultato
      if (result !== null) {
        setCurrentFrame((result - 1) % config.frameCount);
      }
      return;
    }

    // Avvia animazione frame-by-frame
    let frame = 0;
    const frameDelay = 1000 / config.fps;

    animationRef.current = setInterval(() => {
      frame = (frame + 1) % config.frameCount;
      setCurrentFrame(frame);
    }, frameDelay);

    return () => {
      if (animationRef.current) {
        clearInterval(animationRef.current);
      }
    };
  }, [isRolling, result, config.frameCount, config.fps]);

  // Calcola posizione sprite nel foglio
  const spriteX = -(currentFrame * config.frameWidth);

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
      {/* Dado sprite animato */}
      <motion.div
        style={{
          width: size,
          height: size,
          backgroundImage: `url(${config.image})`,
          backgroundPosition: `${spriteX}px 0px`,
          backgroundSize: `${config.frameWidth * config.frameCount}px ${config.frameHeight}px`,
          backgroundRepeat: 'no-repeat',
          filter: `drop-shadow(0 0 20px ${diceColor}80) drop-shadow(0 0 40px ${diceColor}40)`,
          imageRendering: 'crisp-edges',
        }}
        animate={isRolling ? {
          scale: [1, 1.1, 1],
          rotate: [0, 5, -5, 0],
        } : {}}
        transition={{
          duration: 0.3,
          repeat: isRolling ? Infinity : 0,
          repeatType: 'reverse',
        }}
      />

      {/* Etichetta tipo dado */}
      <div
        style={{
          position: 'absolute',
          bottom: 10,
          left: '50%',
          transform: 'translateX(-50%)',
          fontFamily: 'var(--font-heading)',
          fontSize: '1.2rem',
          fontWeight: '700',
          color: diceColor,
          textShadow: `0 0 15px ${diceColor}, 0 0 30px ${diceColor}`,
          letterSpacing: '0.3em',
          textTransform: 'uppercase',
          pointerEvents: 'none',
          background: 'rgba(0,0,0,0.7)',
          padding: '5px 15px',
          borderRadius: '8px',
          border: `2px solid ${diceColor}60`,
        }}
      >
        {diceType.toUpperCase()}
      </div>

      {/* Risultato grande in overlay */}
      {!isRolling && result !== null && (
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
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
              0 0 40px ${diceColor},
              0 0 80px ${diceColor},
              0 0 120px ${diceColor}80,
              0 8px 30px rgba(0,0,0,0.9),
              0 0 10px #fff
            `,
            pointerEvents: 'none',
            zIndex: 10,
            lineHeight: 1,
            WebkitTextStroke: `2px ${diceColor}`,
          }}
        >
          {result}
        </motion.div>
      )}
    </div>
  );
}
