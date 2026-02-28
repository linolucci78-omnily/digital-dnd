// ═══════════════════════════════════════════════
//  DiceBox3D — Dadi 3D Poliedrici Realistici
//  Con fisica, rotolamento, e rilevamento risultato
// ═══════════════════════════════════════════════

import { useRef, useState, useEffect, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Physics, useBox, usePlane } from '@react-three/cannon';
import { OrbitControls, PerspectiveCamera, Environment } from '@react-three/drei';
import * as THREE from 'three';

// Geometrie per i vari tipi di dadi
const getDiceGeometry = (type) => {
  switch (type) {
    case 'd4':
      return new THREE.TetrahedronGeometry(1);
    case 'd6':
      return new THREE.BoxGeometry(1, 1, 1);
    case 'd8':
      return new THREE.OctahedronGeometry(1);
    case 'd12':
      return new THREE.DodecahedronGeometry(1);
    case 'd20':
      return new THREE.IcosahedronGeometry(1);
    default:
      return new THREE.BoxGeometry(1, 1, 1);
  }
};

// Numero di facce per ogni dado
const getDiceFaces = (type) => {
  const faces = {
    'd4': 4,
    'd6': 6,
    'd8': 8,
    'd10': 10,
    'd12': 12,
    'd20': 20,
  };
  return faces[type] || 6;
};

// Componente Dado 3D con fisica
function Dice3D({ type = 'd20', position = [0, 5, 0], rotation = [0, 0, 0], color = '#d4af37', onResult }) {
  const geometry = getDiceGeometry(type);
  const [ref, api] = useBox(() => ({
    mass: 1,
    position,
    rotation,
    linearDamping: 0.3,
    angularDamping: 0.3,
    restitution: 0.6,
    args: [1, 1, 1], // Bounding box approssimativo
  }));

  const [hasLanded, setHasLanded] = useState(false);
  const velocityRef = useRef([0, 0, 0]);
  const angularVelocityRef = useRef([0, 0, 0]);

  // Monitora velocità per capire quando si ferma
  useEffect(() => {
    const unsubscribeVel = api.velocity.subscribe((v) => {
      velocityRef.current = v;
    });
    const unsubscribeAngVel = api.angularVelocity.subscribe((v) => {
      angularVelocityRef.current = v;
    });

    return () => {
      unsubscribeVel();
      unsubscribeAngVel();
    };
  }, [api]);

  useFrame(() => {
    if (hasLanded) return;

    const vel = velocityRef.current;
    const angVel = angularVelocityRef.current;

    // Controlla se il dado si è fermato
    const speed = Math.sqrt(vel[0] ** 2 + vel[1] ** 2 + vel[2] ** 2);
    const angSpeed = Math.sqrt(angVel[0] ** 2 + angVel[1] ** 2 + angVel[2] ** 2);

    if (speed < 0.1 && angSpeed < 0.1 && !hasLanded) {
      setHasLanded(true);

      // Calcola quale faccia è rivolta verso l'alto
      const rotation = ref.current.rotation;
      const result = calculateTopFace(type, rotation);

      if (onResult) {
        setTimeout(() => onResult(result), 200);
      }
    }
  });

  // Materiale del dado con colore personalizzato
  const material = new THREE.MeshStandardMaterial({
    color: color,
    roughness: 0.3,
    metalness: 0.5,
  });

  return (
    <mesh ref={ref} geometry={geometry} material={material} castShadow receiveShadow>
      {/* Numeri sulle facce - semplificato per ora */}
      <meshStandardMaterial color={color} roughness={0.3} metalness={0.5} />
    </mesh>
  );
}

// Calcola quale faccia è rivolta verso l'alto
function calculateTopFace(type, rotation) {
  const faces = getDiceFaces(type);

  // Per semplicità, restituiamo un numero casuale per ora
  // TODO: implementare calcolo geometrico preciso basato sulla rotazione
  return Math.floor(Math.random() * faces) + 1;
}

// Piano/tavolo su cui cadono i dadi
function DiceTable() {
  const [ref] = usePlane(() => ({
    rotation: [-Math.PI / 2, 0, 0],
    position: [0, 0, 0],
  }));

  return (
    <mesh ref={ref} receiveShadow>
      <planeGeometry args={[20, 20]} />
      <meshStandardMaterial color="#1a140c" roughness={0.8} />
    </mesh>
  );
}

// Pareti invisibili per contenere i dadi
function Walls() {
  const [frontWall] = usePlane(() => ({
    position: [0, 2, -5],
    rotation: [0, 0, 0],
  }));
  const [backWall] = usePlane(() => ({
    position: [0, 2, 5],
    rotation: [0, Math.PI, 0],
  }));
  const [leftWall] = usePlane(() => ({
    position: [-5, 2, 0],
    rotation: [0, Math.PI / 2, 0],
  }));
  const [rightWall] = usePlane(() => ({
    position: [5, 2, 0],
    rotation: [0, -Math.PI / 2, 0],
  }));

  return (
    <>
      <mesh ref={frontWall} visible={false} />
      <mesh ref={backWall} visible={false} />
      <mesh ref={leftWall} visible={false} />
      <mesh ref={rightWall} visible={false} />
    </>
  );
}

// Componente principale
export default function DiceBox3D({
  diceType = 'd20',
  diceColor = '#d4af37',
  onRollComplete,
  autoRoll = true
}) {
  const [result, setResult] = useState(null);
  const [isRolling, setIsRolling] = useState(false);

  const handleResult = (value) => {
    setResult(value);
    setIsRolling(false);
    if (onRollComplete) {
      onRollComplete(value);
    }
  };

  const roll = () => {
    setIsRolling(true);
    setResult(null);
    // Il dado verrà ricreato con nuova posizione casuale
  };

  useEffect(() => {
    if (autoRoll) {
      roll();
    }
  }, [autoRoll]);

  // Posizione e rotazione casuali per il lancio
  const randomPosition = [
    (Math.random() - 0.5) * 2,
    8 + Math.random() * 2,
    (Math.random() - 0.5) * 2
  ];

  const randomRotation = [
    Math.random() * Math.PI * 2,
    Math.random() * Math.PI * 2,
    Math.random() * Math.PI * 2
  ];

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <Canvas shadows camera={{ position: [0, 5, 8], fov: 50 }}>
        <Suspense fallback={null}>
          {/* Luci */}
          <ambientLight intensity={0.5} />
          <spotLight
            position={[10, 15, 10]}
            angle={0.3}
            penumbra={1}
            intensity={1}
            castShadow
            shadow-mapSize={[2048, 2048]}
          />
          <pointLight position={[-10, 10, -10]} intensity={0.3} />

          {/* Fisica */}
          <Physics gravity={[0, -30, 0]}>
            <DiceTable />
            <Walls />

            {isRolling && (
              <Dice3D
                key={Math.random()} // Forza ricreazione per nuovo lancio
                type={diceType}
                position={randomPosition}
                rotation={randomRotation}
                color={diceColor}
                onResult={handleResult}
              />
            )}
          </Physics>

          {/* Ambiente riflessi */}
          <Environment preset="warehouse" />
        </Suspense>
      </Canvas>

      {/* Risultato */}
      {result !== null && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          fontFamily: 'var(--font-heading)',
          fontSize: '4rem',
          fontWeight: '900',
          color: diceColor,
          textShadow: `0 0 30px ${diceColor}, 0 0 60px ${diceColor}`,
          pointerEvents: 'none',
          animation: 'fadeInScale 0.5s ease-out',
        }}>
          {result}
        </div>
      )}

      {/* Bottone re-roll */}
      {!isRolling && result !== null && (
        <button
          onClick={roll}
          style={{
            position: 'absolute',
            bottom: 20,
            left: '50%',
            transform: 'translateX(-50%)',
            padding: '12px 24px',
            background: 'rgba(212,175,55,0.9)',
            border: '2px solid var(--gold)',
            borderRadius: 8,
            color: '#000',
            fontFamily: 'var(--font-heading)',
            fontSize: '1rem',
            cursor: 'pointer',
            fontWeight: '700',
          }}
        >
          🎲 RILANCIA
        </button>
      )}

      <style>{`
        @keyframes fadeInScale {
          from {
            opacity: 0;
            transform: translate(-50%, -50%) scale(0.5);
          }
          to {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
          }
        }
      `}</style>
    </div>
  );
}
