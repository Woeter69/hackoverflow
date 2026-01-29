import React, { useState } from 'react';
import { signInWithPopup, GoogleAuthProvider, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, Chrome, ArrowRight, ShieldCheck } from 'lucide-react';
// @ts-ignore
import LiquidEther from '../components/LiquidEther.jsx';

const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleGoogleSignIn = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      navigate('/home');
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
      navigate('/home');
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div style={{ width: '100%', height: '100vh', background: '#000', color: '#fff', position: 'relative', overflow: 'hidden' }}>
      {/* Background Layer - Reusing LiquidEther for consistency */}
      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 0, opacity: 0.6 }}>
        <LiquidEther
            colors={[ '#001122', '#220033', '#440055' ]} // Slightly more purple for Auth
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

      <div style={{
        position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        zIndex: 100,
        width: '400px',
      }}>
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            style={{
                padding: '40px',
                background: 'linear-gradient(135deg, rgba(20, 20, 20, 0.9), rgba(30, 30, 30, 0.8))',
                backdropFilter: 'blur(20px) saturate(180%)',
                borderRadius: '16px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5), inset 0 1px 1px rgba(255,255,255,0.1)'
            }}
        >
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
                <ShieldCheck size={48} color="#00ffff" strokeWidth={1.5} />
            </div>

            <h2 style={{ 
                textAlign: 'center', marginBottom: '30px', fontSize: '1.5rem', 
                fontWeight: 800, letterSpacing: '4px', textTransform: 'uppercase',
                background: 'linear-gradient(90deg, #fff, #aaa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
            }}>
                <AnimatePresence mode="wait">
                    <motion.span
                        key={isLogin ? 'login' : 'register'}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                        transition={{ duration: 0.2 }}
                    >
                        {isLogin ? 'Identity_Verify' : 'New_Subject_Entry'}
                    </motion.span>
                </AnimatePresence>
            </h2>

            {error && (
                <motion.div 
                    initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                    style={{ color: '#ff4444', marginBottom: '15px', fontSize: '0.8rem', textAlign: 'center', background: 'rgba(255,0,0,0.1)', padding: '10px', borderRadius: '4px' }}
                >
                    {error}
                </motion.div>
            )}

            <form onSubmit={handleEmailAuth} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.7rem', color: '#888', letterSpacing: '2px' }}>EMAIL_ADDRESS</label>
                <div style={{ position: 'relative' }}>
                    <Mail size={16} color="#666" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                    <input 
                    type="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    style={{
                        width: '100%', padding: '12px 12px 12px 40px', background: 'rgba(0,0,0,0.3)', 
                        border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '4px',
                        outline: 'none', fontSize: '0.9rem', boxSizing: 'border-box',
                        transition: 'border-color 0.2s'
                    }}
                    onFocus={(e) => e.target.style.borderColor = 'rgba(0,255,255,0.5)'}
                    onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                    />
                </div>
            </div>
            <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.7rem', color: '#888', letterSpacing: '2px' }}>ACCESS_CODE</label>
                <div style={{ position: 'relative' }}>
                    <Lock size={16} color="#666" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                    <input 
                    type="password" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={{
                        width: '100%', padding: '12px 12px 12px 40px', background: 'rgba(0,0,0,0.3)', 
                        border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '4px',
                        outline: 'none', fontSize: '0.9rem', boxSizing: 'border-box',
                        transition: 'border-color 0.2s'
                    }}
                    onFocus={(e) => e.target.style.borderColor = 'rgba(0,255,255,0.5)'}
                    onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                    />
                </div>
            </div>

            <motion.button 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit" 
                style={{
                    background: '#fff', color: '#000', border: 'none', padding: '14px',
                    borderRadius: '2px', fontWeight: 800, cursor: 'pointer', fontSize: '0.8rem', letterSpacing: '2px',
                    marginTop: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px'
                }}
            >
                {isLogin ? 'INITIATE_SESSION' : 'REGISTER_ENTITY'}
                <ArrowRight size={16} />
            </motion.button>
            </form>

            <div style={{ margin: '20px 0', textAlign: 'center', color: '#555', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.1)' }}></div>
                OR
                <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.1)' }}></div>
            </div>

            <motion.button 
                whileHover={{ scale: 1.02, backgroundColor: 'rgba(255,255,255,0.05)' }}
                whileTap={{ scale: 0.98 }}
                onClick={handleGoogleSignIn} 
                style={{
                    width: '100%', background: 'transparent', color: '#fff', border: '1px solid rgba(255,255,255,0.3)', 
                    padding: '14px', borderRadius: '2px', fontWeight: 600, cursor: 'pointer', fontSize: '0.8rem', letterSpacing: '1px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px'
                }}
            >
                <Chrome size={16} />
                AUTHENTICATE_WITH_GOOGLE
            </motion.button>

            <div style={{ marginTop: '25px', textAlign: 'center', fontSize: '0.8rem', color: '#888' }}>
                {isLogin ? "No clearance?" : "Already verified?"}{' '}
                <span 
                    onClick={() => { setError(''); setIsLogin(!isLogin); }}
                    style={{ color: '#00ffff', cursor: 'pointer', fontWeight: 'bold' }}
                >
                    {isLogin ? 'Request Access' : 'Login'}
                </span>
            </div>
        </motion.div>
      </div>
    </div>
  );
};

export default AuthPage;
