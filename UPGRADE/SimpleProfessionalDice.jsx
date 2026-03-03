// ═══════════════════════════════════════════════
//  SimpleProfessionalDice — Dadi semplici ma belli
//  Animazioni CSS smooth, gradients professionali
//  Niente librerie complicate - solo CSS puro
// ═══════════════════════════════════════════════

import { motion } from 'framer-motion';

const DICE_SHAPES = {
  d4: '△',  // Tetraedro
  d6: '⬛', // Cubo
  d8: '◆',  // Ottaedro
  d10: '⬟', // Decaedro
  d12: '⬡', // Dodecaedro
  d20: 'dice', // Icosaedro
};

export default function SimpleProfessionalDice({
  diceType = 'd20',
  diceColor = '#d4af37',
  result = null,
  isRolling = false,
  size = 300,
}) {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        perspective: '1000px',
      }}
    >
      {/* Dado 3D con CSS */}
      <motion.div
        animate={isRolling ? {
          rotateX: [0, 360, 720, 1080],
          rotateY: [0, 360, 720, 1080],
          rotateZ: [0, 180, 360, 540],
          scale: [1, 1.2, 1, 1.2, 1],
        } : {
          rotateX: 25,
          rotateY: 25,
          scale: 1,
        }}
        transition={{
          duration: isRolling ? 2.5 : 0.5,
          ease: isRolling ? "easeOut" : "easeInOut",
        }}
        style={{
          width: size,
          height: size,
          position: 'relative',
          transformStyle: 'preserve-3d',
        }}
      >
        {/* Dado principale */}
        <div
          style={{
            width: '100%',
            height: '100%',
            background: `
              radial-gradient(circle at 30% 30%, ${diceColor}ff, ${diceColor}cc 50%, ${diceColor}99),
              linear-gradient(135deg, ${diceColor}dd, ${diceColor}88)
            `,
            borderRadius: diceType === 'd6' ? '20px' : diceType === 'd20' ? '50%' : '25%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: size * 0.6,
            color: '#fff',
            textShadow: `
              0 0 20px ${diceColor},
              0 0 40px ${diceColor}cc,
              0 4px 10px rgba(0,0,0,0.5)
            `,
            boxShadow: `
              0 0 60px ${diceColor}80,
              0 0 120px ${diceColor}40,
              0 20px 60px rgba(0,0,0,0.5),
              inset 0 0 60px ${diceColor}40,
              inset -10px -10px 40px rgba(0,0,0,0.3),
              inset 10px 10px 40px rgba(255,255,255,0.2)
            `,
            border: `3px solid ${diceColor}`,
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Riflesso luce */}
          <div
            style={{
              position: 'absolute',
              top: '10%',
              left: '10%',
              width: '40%',
              height: '40%',
              background: 'radial-gradient(circle, rgba(255,255,255,0.4), transparent)',
              borderRadius: '50%',
              pointerEvents: 'none',
            }}
          />

          {/* Shape del dado */}
          {DICE_SHAPES[diceType]}
        </div>
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
          background: 'rgba(0,0,0,0.8)',
          padding: '8px 20px',
          borderRadius: '12px',
          border: `3px solid ${diceColor}80`,
          backdropFilter: 'blur(10px)',
        }}
      >
        {diceType.toUpperCase()}
      </motion.div>

      {/* Risultato ENORME */}
      {!isRolling && result !== null && (
        <motion.div
          initial={{ opacity: 0, scale: 0.3 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{
            type: 'spring',
            stiffness: 300,
            damping: 15,
          }}
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            fontFamily: 'var(--font-heading)',
            fontSize: '8rem',
            fontWeight: '900',
            color: '#fff',
            textShadow: `
              0 0 60px ${diceColor},
              0 0 120px ${diceColor},
              0 0 180px ${diceColor}80,
              0 10px 40px rgba(0,0,0,0.9),
              0 0 20px #fff,
              -4px -4px 0 ${diceColor},
              4px 4px 0 rgba(0,0,0,0.3)
            `,
            pointerEvents: 'none',
            zIndex: 20,
            lineHeight: 1,
            WebkitTextStroke: `4px ${diceColor}`,
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
