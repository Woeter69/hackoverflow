import React, { useState, useMemo, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid, PerspectiveCamera } from '@react-three/drei';
import { EffectComposer, Bloom, Noise } from '@react-three/postprocessing';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { useNavigate } from 'react-router-dom';
// @ts-ignore
import LiquidEther from './LiquidEther.jsx';
import SOSBeacon from './SOSBeacon';

const Building = ({ position, args, color }: { position: [number, number, number], args: [number, number, number], color: string }) => (
  <mesh position={position}>
    <boxGeometry args={args} />
    <meshPhysicalMaterial 
      color={color} thickness={0.5} roughness={0.1} transmission={0.8}
      ior={1.5} opacity={0.4} transparent={true} emissive={color} emissiveIntensity={0.2}
    />
  </mesh>
);

const CampusHologram = () => {
  const [sosActive, setSosActive] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  const handleAuthAction = () => {
    if (user) {
      signOut(auth);
    } else {
      navigate('/auth');
    }
  };

  const buildings = useMemo(() => Array.from({ length: 30 }).map((_, i) => ({
    id: i,
    position: [(Math.random() - 0.5) * 50, 0, (Math.random() - 0.5) * 50] as [number, number, number],
    height: Math.random() * 8 + 2,
    width: Math.random() * 3 + 2,
    color: i % 3 === 0 ? '#00ffff' : '#2244ff'
  })), []);

  return (
    <div style={{ width: '100%', height: '100vh', background: '#000', color: '#fff', position: 'relative' }}>
      {/* LiquidEther Background Layer */}
      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 0 }}>
        <LiquidEther
          colors={[ '#001122', '#00ffff', '#0055ff' ]}
          mouseForce={20}
          cursorSize={100}
          isViscous={true}
          viscous={30}
          iterationsViscous={32}
          iterationsPoisson={32}
          resolution={0.5}
          isBounce={false}
          autoDemo={true}
          autoSpeed={0.5}
          autoIntensity={2.2}
          takeoverDuration={0.25}
          autoResumeDelay={3000}
          autoRampDuration={0.6}
        />
      </div>

      {/* HUD Header - 3D Iridescent Glass */}
      <header style={{
        position: 'absolute', top: '24px', left: '50%', transform: 'translateX(-50%)',
        width: 'calc(100% - 60px)', maxWidth: '1100px', padding: '16px 36px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        
        // Iridescent Glass Effect
        background: 'linear-gradient(135deg, rgba(25, 25, 25, 0.9), rgba(40, 40, 40, 0.8), rgba(0, 255, 255, 0.05), rgba(255, 0, 255, 0.05))',
        backdropFilter: 'blur(40px) saturate(180%)',
        
        // 3D Borders
        borderTop: '1px solid rgba(255, 255, 255, 0.3)',
        borderLeft: '1px solid rgba(255, 255, 255, 0.2)',
        borderRight: '1px solid rgba(0, 0, 0, 0.5)',
        borderBottom: '2px solid rgba(0, 0, 0, 0.6)',
        borderRadius: '16px',
        
        zIndex: 100, boxSizing: 'border-box',
        
        // Deep 3D Shadow
        boxShadow: `
          0 20px 50px rgba(0, 0, 0, 0.7), 
          inset 0 1px 2px rgba(255, 255, 255, 0.2),
          inset 0 -2px 10px rgba(0, 0, 0, 0.4)
        `
      }}>
        <div style={{ 
          fontSize: '0.9rem', fontWeight: 900, letterSpacing: '4px', color: '#fff',
          textShadow: '0 0 10px rgba(255,255,255,0.3)'
        }}>CAMPUS_LOOP</div>
        <nav style={{ display: 'flex', gap: '40px', fontSize: '0.7rem', opacity: 0.9, fontWeight: 700, letterSpacing: '2px', color: '#aaa', alignItems: 'center' }}>
          <span style={{ cursor: 'pointer', color: '#fff' }}>TERMINAL</span>
          <span style={{ cursor: 'pointer' }}>LOGISTICS</span>
          <span style={{ cursor: 'pointer' }}>NETWORK</span>
          <button 
            onClick={handleAuthAction}
            style={{
              background: user ? 'rgba(255, 50, 50, 0.2)' : 'rgba(0, 255, 255, 0.1)',
              border: user ? '1px solid rgba(255, 50, 50, 0.5)' : '1px solid rgba(0, 255, 255, 0.5)',
              color: user ? '#ff4444' : '#00ffff',
              padding: '8px 16px', borderRadius: '4px', cursor: 'pointer',
              fontSize: '0.65rem', fontWeight: 800, letterSpacing: '1px',
              textTransform: 'uppercase', marginLeft: '10px'
            }}
          >
            {user ? 'DISCONNECT' : 'INITIALIZE'}
          </button>
        </nav>
      </header>

      {/* Main Action Center */}
      <div style={{
        position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        zIndex: 10, textAlign: 'center', pointerEvents: 'none'
      }}>
        <div style={{ marginBottom: '30px' }}>
          <h2 style={{ 
            fontSize: '0.7rem', fontWeight: 800, letterSpacing: '8px', 
            color: 'rgba(255,255,255,0.9)', margin: 0, textTransform: 'uppercase' 
          }}>
            Autonomous_Campus_Matching_System
          </h2>
          <p style={{ 
            fontSize: '2.5rem', fontWeight: 900, margin: '10px 0 0 0', 
            letterSpacing: '-1px', color: '#fff' 
          }}>
            Connecting the Loop.
          </p>
        </div>
        <div style={{ pointerEvents: 'auto', display: 'flex', gap: '25px', justifyContent: 'center' }}>
          <button style={{
            background: '#fff', color: '#000', border: 'none', padding: '18px 45px',
            borderRadius: '2px', fontWeight: 800, cursor: 'pointer', fontSize: '0.85rem',
            boxShadow: '0 0 30px rgba(255,255,255,0.2)'
          }}>REQUEST_FAVOR</button>
          <button 
            onClick={() => setSosActive(!sosActive)}
            style={{
              background: 'transparent', color: '#fff', border: '2px solid #fff',
              padding: '18px 45px', borderRadius: '2px', fontWeight: 800, cursor: 'pointer', fontSize: '0.85rem'
            }}>EMERGENCY_BEACON</button>
        </div>
      </div>

      {/* 3D Canvas Layer */}
      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 5, pointerEvents: 'none' }}>
        <Canvas shadows gl={{ alpha: true }}>
          <PerspectiveCamera makeDefault position={[40, 40, 40]} fov={40} />
          <OrbitControls 
            enableDamping 
            dampingFactor={0.05} 
            maxPolarAngle={Math.PI / 2.1} 
            makeDefault 
            // Allow clicking through UI for orbit
            domElement={document.body}
          />
          <ambientLight intensity={0.5} />
          <pointLight position={[10, 10, 10]} intensity={2} color="#00ffff" />
          
          <Grid infiniteGrid fadeDistance={60} fadeStrength={5} cellSize={1} sectionSize={5} sectionColor="#112233" cellColor="#050505" />

          {/* 
          {buildings.map((b) => (
            <Building key={b.id} position={[b.position[0], b.height / 2, b.position[2]]} args={[b.width, b.height, b.width]} color={b.color} />
          ))}
          */}

          {sosActive && <SOSBeacon position={[0, 0, 0]} />}

          <EffectComposer enableNormalPass={false}>
            <Bloom luminanceThreshold={0.1} mipmapBlur intensity={1.2} radius={0.3} />
            <Noise opacity={0.02} />
          </EffectComposer>
        </Canvas>
      </div>
    </div>
  );
};

export default CampusHologram;