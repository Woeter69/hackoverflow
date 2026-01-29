import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
// @ts-ignore
import LiquidEther from '../components/LiquidEther.jsx';
import { ArrowRight } from 'lucide-react';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { auth } from '../lib/firebase';

const LandingPage = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);

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

  return (
    <div style={{ width: '100%', height: '100vh', background: '#000', color: '#fff', position: 'relative', overflow: 'hidden' }}>
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

      {/* Main Content Overlay */}
      <div style={{
        position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        zIndex: 10, textAlign: 'center', width: '100%'
      }}>
        <div style={{ marginBottom: '40px' }}>
          <h2 style={{ 
            fontSize: '0.7rem', fontWeight: 800, letterSpacing: '8px', 
            color: 'rgba(255,255,255,0.9)', margin: 0, textTransform: 'uppercase' 
          }}>
            Autonomous_Campus_Matching_System
          </h2>
          <p style={{ 
            fontSize: '4.5rem', fontWeight: 900, margin: '10px 0 0 0', 
            letterSpacing: '-2px', color: '#fff' 
          }}>
            CAMPUS_LOOP
          </p>
          <p style={{ fontSize: '1.1rem', color: '#aaa', letterSpacing: '1px', marginTop: '10px' }}>
            Connecting the Hub. Matching the Needs.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '30px' }}>
            <button 
                onClick={() => navigate(user ? '/home' : '/auth')}
                style={{
                    background: 'rgba(255, 255, 255, 1)', 
                    color: '#000', 
                    border: 'none',
                    padding: '18px 50px', 
                    borderRadius: '2px', 
                    fontSize: '0.9rem', 
                    fontWeight: 900, 
                    cursor: 'pointer',
                    letterSpacing: '3px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '12px',
                    textTransform: 'uppercase',
                    boxShadow: '0 0 30px rgba(255,255,255,0.3)'
                }}
            >
                {user ? 'ACCESS_DASHBOARD' : 'ENTER_SYSTEM'} <ArrowRight size={20} />
            </button>

            {/* Sub-Actions */}
            <div style={{ display: 'flex', gap: '25px', justifyContent: 'center' }}>
                <button style={{
                    background: 'transparent', color: '#fff', border: '1px solid rgba(255,255,255,0.3)', 
                    padding: '14px 35px', borderRadius: '2px', fontWeight: 800, cursor: 'pointer', 
                    fontSize: '0.75rem', letterSpacing: '1px', textTransform: 'uppercase',
                    backdropFilter: 'blur(5px)'
                }}>REQUEST_FAVOR</button>
                <button 
                    style={{
                    background: 'transparent', color: '#fff', border: '1px solid rgba(255,255,255,0.3)',
                    padding: '14px 35px', borderRadius: '2px', fontWeight: 800, cursor: 'pointer', 
                    fontSize: '0.75rem', letterSpacing: '1px', textTransform: 'uppercase',
                    backdropFilter: 'blur(5px)'
                    }}>EMERGENCY_BEACON</button>
            </div>
        </div>
      </div>

      {/* Footer / Status */}
      <div style={{
        position: 'absolute', bottom: '30px', width: '100%', textAlign: 'center',
        color: 'rgba(255,255,255,0.3)', fontSize: '0.6rem', letterSpacing: '3px',
        textTransform: 'uppercase'
      }}>
        PROTOCOL: ACTIVE // ENCRYPTION: SECURE // v1.0.0
      </div>
    </div>
  );
};

export default LandingPage;