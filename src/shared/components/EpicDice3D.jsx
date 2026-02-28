// ═══════════════════════════════════════════════
//  EpicDice3D — Dado 3D SPETTACOLARE con numeri
//  Animazione epica di lancio per la TV
// ═══════════════════════════════════════════════

import { useRef, useEffect, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Text, PerspectiveCamera, Environment } from '@react-three/drei';
import * as THREE from 'three';

// Mappa i numeri per ogni tipo di dado e le loro posizioni sulle facce
const DICE_CONFIGS = {
  d4: { sides: 4, numbers: [1, 2, 3, 4] },
  d6: { sides: 6, numbers: [1, 2, 3, 4, 5, 6] },
  d8: { sides: 8, numbers: [1, 2, 3, 4, 5, 6, 7, 8] },
  d10: { sides: 10, numbers: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] },
  d12: { sides: 12, numbers: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] },
  d20: { sides: 20, numbers: Array.from({ length: 20 }, (_, i) => i + 1) },
  d100: { sides: 10, numbers: [0, 10, 20, 30, 40, 50, 60, 70, 80, 90] },
};

// Dado 3D con numeri sulle facce
function DiceWithNumbers({ type = 'd20', color = '#d4af37', spinning = true }) {
  const meshRef = useRef();
  const groupRef = useRef();
  const config = DICE_CONFIGS[type] || DICE_CONFIGS.d20;

  // Velocità di rotazione che rallenta nel tempo
  const rotationSpeed = useRef({
    x: (Math.random() - 0.5) * 0.3,
    y: (Math.random() - 0.5) * 0.3,
    z: (Math.random() - 0.5) * 0.3,
  });

  useFrame((state, delta) => {
    if (!spinning || !groupRef.current) return;

    // Rotazione con decelerazione
    groupRef.current.rotation.x += rotationSpeed.current.x;
    groupRef.current.rotation.y += rotationSpeed.current.y;
    groupRef.current.rotation.z += rotationSpeed.current.z;

    // Decelera gradualmente
    rotationSpeed.current.x *= 0.99;
    rotationSpeed.current.y *= 0.99;
    rotationSpeed.current.z *= 0.99;

    // Leggera oscillazione verticale
    groupRef.current.position.y = Math.sin(state.clock.elapsedTime * 2) * 0.15;
  });

  // Geometria del dado
  const getGeometry = () => {
    const size = 2;
    switch (type) {
      case 'd4':
        return <tetrahedronGeometry args={[size]} />;
      case 'd6':
        return <boxGeometry args={[size, size, size]} />;
      case 'd8':
        return <octahedronGeometry args={[size]} />;
      case 'd10':
        return <cylinderGeometry args={[size * 0.7, size * 0.7, size * 1.2, 10]} />;
      case 'd12':
        return <dodecahedronGeometry args={[size]} />;
      case 'd20':
        return <icosahedronGeometry args={[size]} />;
      case 'd100':
        return <cylinderGeometry args={[size * 0.7, size * 0.7, size * 1.2, 10]} />;
      default:
        return <icosahedronGeometry args={[size]} />;
    }
  };

  return (
    <group ref={groupRef}>
      {/* Dado principale */}
      <mesh ref={meshRef} castShadow receiveShadow>
        {getGeometry()}
        <meshStandardMaterial
          color={color}
          roughness={0.4}
          metalness={0.6}
          emissive={color}
          emissiveIntensity={0.2}
        />
      </mesh>

      {/* Numeri sulle facce (solo per d20 e d6 per ora - i più usati) */}
      {type === 'd20' && (
        <>
          {/* Numeri posizionati sulle facce del d20 */}
          <Text
            position={[0, 2.3, 0]}
            fontSize={0.5}
            color="#000"
            anchorX="center"
            anchorY="middle"
            fontWeight="bold"
          >
            20
          </Text>
          <Text
            position={[0, -2.3, 0]}
            rotation={[Math.PI, 0, 0]}
            fontSize={0.5}
            color="#000"
            anchorX="center"
            anchorY="middle"
            fontWeight="bold"
          >
            1
          </Text>
          <Text
            position={[2.3, 0, 0]}
            rotation={[0, Math.PI / 2, 0]}
            fontSize={0.5}
            color="#000"
            anchorX="center"
            anchorY="middle"
            fontWeight="bold"
          >
            10
          </Text>
          <Text
            position={[-2.3, 0, 0]}
            rotation={[0, -Math.PI / 2, 0]}
            fontSize={0.5}
            color="#000"
            anchorX="center"
            anchorY="middle"
            fontWeight="bold"
          >
            11
          </Text>
          <Text
            position={[0, 0, 2.3]}
            rotation={[0, 0, 0]}
            fontSize={0.5}
            color="#000"
            anchorX="center"
            anchorY="middle"
            fontWeight="bold"
          >
            7
          </Text>
          <Text
            position={[0, 0, -2.3]}
            rotation={[0, Math.PI, 0]}
            fontSize={0.5}
            color="#000"
            anchorX="center"
            anchorY="middle"
            fontWeight="bold"
          >
            14
          </Text>
        </>
      )}

      {type === 'd6' && (
        <>
          {/* Numeri sulle 6 facce del cubo */}
          <Text
            position={[0, 1.05, 0]}
            rotation={[-Math.PI / 2, 0, 0]}
            fontSize={0.6}
            color="#000"
            anchorX="center"
            anchorY="middle"
            fontWeight="bold"
          >
            6
          </Text>
          <Text
            position={[0, -1.05, 0]}
            rotation={[Math.PI / 2, 0, 0]}
            fontSize={0.6}
            color="#000"
            anchorX="center"
            anchorY="middle"
            fontWeight="bold"
          >
            1
          </Text>
          <Text
            position={[1.05, 0, 0]}
            rotation={[0, Math.PI / 2, 0]}
            fontSize={0.6}
            color="#000"
            anchorX="center"
            anchorY="middle"
            fontWeight="bold"
          >
            5
          </Text>
          <Text
            position={[-1.05, 0, 0]}
            rotation={[0, -Math.PI / 2, 0]}
            fontSize={0.6}
            color="#000"
            anchorX="center"
            anchorY="middle"
            fontWeight="bold"
          >
            2
          </Text>
          <Text
            position={[0, 0, 1.05]}
            fontSize={0.6}
            color="#000"
            anchorX="center"
            anchorY="middle"
            fontWeight="bold"
          >
            4
          </Text>
          <Text
            position={[0, 0, -1.05]}
            rotation={[0, Math.PI, 0]}
            fontSize={0.6}
            color="#000"
            anchorX="center"
            anchorY="middle"
            fontWeight="bold"
          >
            3
          </Text>
        </>
      )}

      {type === 'd8' && (
        <>
          {/* Numeri sulle 8 facce dell'ottaedro */}
          <Text
            position={[0, 1.8, 0]}
            fontSize={0.5}
            color="#000"
            anchorX="center"
            anchorY="middle"
            fontWeight="bold"
          >
            8
          </Text>
          <Text
            position={[0, -1.8, 0]}
            rotation={[Math.PI, 0, 0]}
            fontSize={0.5}
            color="#000"
            anchorX="center"
            anchorY="middle"
            fontWeight="bold"
          >
            1
          </Text>
        </>
      )}

      {type === 'd12' && (
        <>
          {/* Numeri sulle facce del dodecaedro */}
          <Text
            position={[0, 2.2, 0]}
            fontSize={0.45}
            color="#000"
            anchorX="center"
            anchorY="middle"
            fontWeight="bold"
          >
            12
          </Text>
          <Text
            position={[0, -2.2, 0]}
            rotation={[Math.PI, 0, 0]}
            fontSize={0.45}
            color="#000"
            anchorX="center"
            anchorY="middle"
            fontWeight="bold"
          >
            1
          </Text>
        </>
      )}

      {type === 'd4' && (
        <>
          {/* Numeri sulle 4 facce del tetraedro */}
          <Text
            position={[0, 1.5, 0]}
            fontSize={0.5}
            color="#000"
            anchorX="center"
            anchorY="middle"
            fontWeight="bold"
          >
            4
          </Text>
        </>
      )}

      {/* Luce puntiforme che segue il dado */}
      <pointLight position={[3, 3, 3]} intensity={0.5} color={color} />
    </group>
  );
}

// Tavolo/piano di appoggio
function DiceTable() {
  return (
    <mesh receiveShadow position={[0, -3, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[20, 20]} />
      <meshStandardMaterial
        color="#1a140c"
        roughness={0.9}
        metalness={0.1}
      />
    </mesh>
  );
}

export default function EpicDice3D({
  diceType = 'd20',
  diceColor = '#d4af37',
  autoSpin = true,
}) {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Piccolo delay per smooth entry
    const timer = setTimeout(() => setIsReady(true), 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <Canvas
        shadows
        gl={{ antialias: true, alpha: true }}
        style={{ background: 'transparent' }}
      >
        {/* Luci */}
        <ambientLight intensity={0.6} />
        <spotLight
          position={[10, 15, 10]}
          angle={0.3}
          penumbra={1}
          intensity={1.5}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
        />
        <spotLight
          position={[-10, 10, -10]}
          angle={0.3}
          penumbra={1}
          intensity={0.8}
          color={diceColor}
        />
        <pointLight position={[0, 5, 5]} intensity={0.5} color="#ffffff" />

        {/* Camera */}
        <PerspectiveCamera makeDefault position={[0, 2, 8]} fov={45} />

        {/* Dado con numeri */}
        {isReady && (
          <DiceWithNumbers
            type={diceType}
            color={diceColor}
            spinning={autoSpin}
          />
        )}

        {/* Tavolo */}
        <DiceTable />

        {/* Ambiente con riflessi */}
        <Environment preset="city" />
      </Canvas>

      {/* Etichetta tipo dado */}
      <div
        style={{
          position: 'absolute',
          bottom: 20,
          left: '50%',
          transform: 'translateX(-50%)',
          fontFamily: 'var(--font-heading)',
          fontSize: '1.2rem',
          color: diceColor,
          textShadow: `0 0 20px ${diceColor}, 0 0 40px ${diceColor}80`,
          letterSpacing: '0.2em',
          fontWeight: '900',
          textTransform: 'uppercase',
          pointerEvents: 'none',
        }}
      >
        {diceType.toUpperCase()}
      </div>
    </div>
  );
}
