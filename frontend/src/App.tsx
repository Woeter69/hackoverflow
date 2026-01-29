import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from './lib/firebase';
import CampusHologram from './components/CampusHologram';
import AuthPage from './pages/AuthPage';
import LandingPage from './pages/LandingPage';

// Protected Route Component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return <div style={{ background: '#000', height: '100vh', width: '100%', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>INITIALIZING_LINK...</div>;
  }

  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

const App = () => {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/auth" element={<AuthPage />} />
      <Route 
        path="/home" 
        element={
          <ProtectedRoute>
            <CampusHologram />
          </ProtectedRoute>
        } 
      />
    </Routes>
  );
};

export default App;