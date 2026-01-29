import React, { useState, useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Grid } from '@react-three/drei';
import { EffectComposer, Bloom, Noise, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { useNavigate } from 'react-router-dom';
import { X, Info, Activity, Users, MapPin, Navigation, CheckCircle, LayoutDashboard } from 'lucide-react';
import { api, MatchResponse, ErrandResponse } from '../lib/api';
import { wsService } from '../lib/ws';

// --- Types ---
interface BuildingData {
  id: number;
  position: [number, number, number];
  args: [number, number, number];
  isTarget?: boolean;
  name: string;
  type: string;
  occupancy: number;
  status: 'Active' | 'Maintenance' | 'Restricted';
}

interface BuildingProps {
  data: BuildingData;
  isSelected: boolean;
  isStart?: boolean;
  isEnd?: boolean;
  isEmergency: boolean;
  onClick: (id: number) => void;
}

// --- Beacon Component (Errand Marker) ---
const Beacon = ({ position, color = '#ffaa00' }: { position: [number, number, number], color?: string }) => {
    return (
        <group position={position}>
            {/* Beam */}
            <mesh position={[0, 10, 0]}>
                <cylinderGeometry args={[0.2, 0.2, 20, 8]} />
                <meshBasicMaterial color={color} transparent opacity={0.3} />
            </mesh>
            {/* Core */}
            <mesh position={[0, 1, 0]}>
                <sphereGeometry args={[0.8, 16, 16]} />
                <meshBasicMaterial color={color} />
            </mesh>
            {/* Ground Pulse Effect can be added here */}
        </group>
    );
};

// --- Building Component ---
const Building = ({ data, isSelected, isStart, isEnd, isEmergency, onClick }: BuildingProps) => {
  const meshRef = useRef<THREE.Mesh>(null);
  
  // Base Colors
  const baseColor = new THREE.Color('#00bcd4'); 
  const emergencyColor = new THREE.Color('#ff0000');
  const selectedColor = new THREE.Color('#ffffff'); // White for selection
  const startColor = new THREE.Color('#00ff00'); // Green for Start
  const endColor = new THREE.Color('#ff00ff');   // Magenta for End

  useFrame((state) => {
    if (!meshRef.current) return;
    const material = meshRef.current.material as THREE.MeshPhysicalMaterial;

    if (isEmergency && data.isTarget) {
      // Emergency Pulse
      const t = state.clock.getElapsedTime();
      const intensity = (Math.sin(t * 8) + 1) * 0.5 + 0.2;
      material.emissive.copy(emergencyColor);
      material.emissiveIntensity = intensity * 4;
      material.color.lerp(emergencyColor, 0.1);
    } else if (isStart) {
        material.emissive.copy(startColor);
        material.emissiveIntensity = 1.5;
        material.color.copy(startColor);
    } else if (isEnd) {
        material.emissive.copy(endColor);
        material.emissiveIntensity = 1.5;
        material.color.copy(endColor);
    } else if (isSelected) {
      // Selected State: Bright White Glow
      material.emissive.copy(selectedColor);
      material.emissiveIntensity = 2.0;
      material.color.copy(selectedColor);
    } else {
      // Normal State
      material.emissive.copy(baseColor);
      material.emissiveIntensity = 0.5;
      material.color.copy(baseColor);
    }
  });

  return (
    <group position={data.position}>
      {/* Hitbox mesh (invisible but clickable) for easier selection */}
      <mesh 
        position={[0, 0, 0]} 
        onClick={(e) => { e.stopPropagation(); onClick(data.id); }}
        visible={false}
      >
        <boxGeometry args={[data.args[0] + 0.5, data.args[1], data.args[2] + 0.5]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>

      <mesh 
        ref={meshRef} 
        onClick={(e) => { e.stopPropagation(); onClick(data.id); }}
        onPointerOver={() => { document.body.style.cursor = 'pointer'; }}
        onPointerOut={() => { document.body.style.cursor = 'auto'; }}
      >
        <boxGeometry args={data.args} />
        <meshPhysicalMaterial
          transparent
          opacity={0.3}
          roughness={0}
          metalness={0.1}
          transmission={0.6}
          thickness={1}
          ior={1.5}
        />
        {/* Wireframe */}
        <lineSegments>
          <edgesGeometry args={[new THREE.BoxGeometry(...data.args)]} />
          <lineBasicMaterial 
            color={isSelected ? '#ffffff' : (isEmergency && data.isTarget ? '#ff0000' : '#00ffff')} 
            opacity={isSelected ? 0.8 : 0.5} 
            transparent 
          />
        </lineSegments>
      </mesh>
    </group>
  );
};

// --- Info Panel Component ---
const InfoPanel = ({ building, onClose }: { building: BuildingData; onClose: () => void }) => (
  <div style={{
    position: 'absolute', top: '100px', right: '30px',
    width: '300px', padding: '24px',
    background: 'rgba(10, 20, 30, 0.8)',
    backdropFilter: 'blur(15px)',
    border: '1px solid rgba(0, 255, 255, 0.2)',
    borderLeft: '4px solid #00ffff',
    borderRadius: '0 12px 12px 0',
    color: '#fff', zIndex: 20,
    boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
    animation: 'slideIn 0.3s ease-out forwards'
  }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
      <h2 style={{ margin: 0, fontSize: '1.2rem', textTransform: 'uppercase', letterSpacing: '2px', color: '#00ffff' }}>
        {building.name}
      </h2>
      <button 
        onClick={onClose}
        style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', padding: 0 }}
      >
        <X size={20} />
      </button>
    </div>

    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9rem', color: '#aaa' }}>
        <MapPin size={16} color="#00ffff" />
        <span>Sector {building.id < 10 ? `0${building.id}` : building.id} - Grid A</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9rem', color: '#aaa' }}>
        <Info size={16} color="#00ffff" />
        <span>Type: {building.type}</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9rem', color: '#aaa' }}>
        <Users size={16} color="#00ffff" />
        <span>Occupancy: {building.occupancy}%</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9rem', color: '#aaa' }}>
        <Activity size={16} color={building.status === 'Active' ? '#00ff00' : '#ffaa00'} />
        <span>Status: <span style={{ color: building.status === 'Active' ? '#fff' : '#ffaa00' }}>{building.status}</span></span>
      </div>
    </div>

    <div style={{ marginTop: '25px', paddingTop: '15px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
      <button style={{
        width: '100%', padding: '10px', background: 'rgba(0, 255, 255, 0.1)', 
        border: '1px solid rgba(0, 255, 255, 0.3)', color: '#00ffff',
        textTransform: 'uppercase', fontSize: '0.8rem', letterSpacing: '1px',
        cursor: 'pointer', borderRadius: '4px'
      }}>
        View Detail Logs
      </button>
    </div>
  </div>
);

// --- Match List Component ---
const MatchList = ({ matches, onClose }: { matches: MatchResponse[], onClose: () => void }) => (
    <div style={{
      position: 'absolute', bottom: '30px', left: '50%', transform: 'translateX(-50%)',
      width: '600px', maxHeight: '400px', overflowY: 'auto',
      background: 'rgba(10, 20, 30, 0.9)',
      backdropFilter: 'blur(20px)',
      border: '1px solid rgba(0, 255, 0, 0.3)',
      borderRadius: '12px',
      padding: '20px', color: '#fff', zIndex: 25,
      boxShadow: '0 0 50px rgba(0, 255, 0, 0.2)'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
        <h3 style={{ margin: 0, color: '#00ff00', letterSpacing: '2px' }}>MATCHING ERRANDS ({matches.length})</h3>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#aaa', cursor: 'pointer' }}><X size={20}/></button>
      </div>
      
      {matches.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#666', padding: '20px' }}>No matches found along this route.</div>
      ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {matches.map((m, idx) => (
                  <div key={idx} style={{ 
                      padding: '12px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px',
                      borderLeft: '3px solid #00ff00', display: 'flex', justifyContent: 'space-between'
                  }}>
                      <div>
                          <div style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>{m.errand.title}</div>
                          <div style={{ fontSize: '0.8rem', color: '#aaa' }}>{m.errand.description}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                          <div style={{ color: '#00ffff', fontWeight: 'bold' }}>${m.errand.reward_estimate.toFixed(2)}</div>
                          <div style={{ fontSize: '0.7rem', color: '#aaa' }}>+{m.distance_from_route.toFixed(0)}m detour</div>
                      </div>
                  </div>
              ))}
          </div>
      )}
    </div>
);

// --- Route Visualizer Component ---
const RouteVisualizer = ({ start, end }: { start: [number, number, number], end: [number, number, number] }) => {
    const points = useMemo(() => {
        const p1 = new THREE.Vector3(start[0], 0.5, start[2]);
        const p2 = new THREE.Vector3(end[0], 0.5, end[2]);
        return [p1, p2];
    }, [start, end]);

    const curve = useMemo(() => new THREE.CatmullRomCurve3(points), [points]);

    return (
        <group>
             {/* Core Line */}
            <mesh>
                <tubeGeometry args={[curve, 20, 0.1, 8, false]} />
                <meshBasicMaterial color="#00ff00" />
            </mesh>
            {/* Glow Effect */}
            <mesh>
                <tubeGeometry args={[curve, 20, 0.3, 8, false]} />
                <meshBasicMaterial color="#00ff00" transparent opacity={0.2} />
            </mesh>
        </group>
    );
};

// --- SOS Beam Component ---
const SOSBeam = ({ position }: { position: [number, number, number] }) => {
    const beamRef = useRef<THREE.Mesh>(null);
    
    useFrame((state) => {
        if (beamRef.current) {
            const t = state.clock.getElapsedTime();
            beamRef.current.scale.x = 1 + Math.sin(t * 10) * 0.2;
            beamRef.current.scale.z = 1 + Math.sin(t * 10) * 0.2;
            (beamRef.current.material as THREE.MeshBasicMaterial).opacity = 0.5 + Math.sin(t * 10) * 0.3;
        }
    });

    return (
        <group position={[position[0], 0, position[2]]}>
            <mesh ref={beamRef} position={[0, 50, 0]}>
                <cylinderGeometry args={[0.5, 2, 100, 16]} />
                <meshBasicMaterial color="#ff0000" transparent opacity={0.6} />
            </mesh>
            <mesh position={[0, 0.5, 0]}>
                <cylinderGeometry args={[4, 4, 0.2, 32]} />
                <meshBasicMaterial color="#ff0000" transparent opacity={0.3} />
            </mesh>
        </group>
    );
};

// --- Glassmorphism Sidebar ---
const Sidebar = ({ 
    activeErrands, 
    isEmergency, 
    onClose,
    onComplete,
    onCancel
}: { 
    activeErrands: ErrandResponse[], 
    isEmergency: boolean,
    onClose?: () => void,
    onComplete: (id: string) => void,
    onCancel: (id: string) => void
}) => {
    return (
        <div style={{
            position: 'absolute', top: '100px', left: '30px',
            width: '320px', bottom: '30px',
            background: 'rgba(5, 15, 25, 0.7)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(0, 255, 255, 0.1)',
            borderRight: isEmergency ? '4px solid #ff0000' : '4px solid #00ffff',
            borderRadius: '12px',
            color: '#fff', zIndex: 15,
            padding: '24px',
            display: 'flex', flexDirection: 'column', gap: '25px',
            boxShadow: '20px 0 50px rgba(0,0,0,0.5)',
            overflowY: 'auto',
            animation: 'slideInLeft 0.3s ease-out'
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontSize: '0.8rem', color: '#00ffff', letterSpacing: '2px', textTransform: 'uppercase' }}>System Status</h3>
                {onClose && (
                    <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer' }}>
                        <X size={18} />
                    </button>
                )}
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '-10px' }}>
                <div style={{ width: '8px', height: '8px', background: '#00ff00', borderRadius: '50%' }}></div>
                <span style={{ fontSize: '0.9rem' }}>Network: STABLE</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '8px' }}>
                <div style={{ width: '8px', height: '8px', background: isEmergency ? '#ff0000' : '#00ffff', borderRadius: '50%' }}></div>
                <span style={{ fontSize: '0.9rem' }}>Alert Level: {isEmergency ? 'CRITICAL' : 'NOMINAL'}</span>
            </div>

            <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '20px' }}>
                <h3 style={{ margin: '0 0 15px 0', fontSize: '0.8rem', color: '#00ffff', letterSpacing: '2px', textTransform: 'uppercase' }}>Active Errands</h3>
                {activeErrands.length === 0 ? (
                    <div style={{ fontSize: '0.85rem', color: '#666', fontStyle: 'italic' }}>No pending requests...</div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {activeErrands.map(e => (
                            <div key={e.id} style={{ 
                                padding: '12px', background: 'rgba(255,255,255,0.03)', 
                                border: '1px solid rgba(0,255,255,0.05)', borderRadius: '6px',
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                            }}>
                                <div>
                                    <div style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>{e.title}</div>
                                    <div style={{ fontSize: '0.75rem', color: '#aaa', marginTop: '4px' }}>${e.reward_estimate.toFixed(2)} Reward</div>
                                </div>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button 
                                        onClick={() => onComplete(e.id)}
                                        title="Complete"
                                        style={{ background: 'rgba(0, 255, 0, 0.2)', border: 'none', borderRadius: '4px', padding: '4px', cursor: 'pointer', color: '#00ff00' }}
                                    >
                                        <CheckCircle size={14} />
                                    </button>
                                    <button 
                                        onClick={() => onCancel(e.id)}
                                        title="Cancel"
                                        style={{ background: 'rgba(255, 0, 0, 0.2)', border: 'none', borderRadius: '4px', padding: '4px', cursor: 'pointer', color: '#ff4444' }}
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div style={{ marginTop: 'auto', background: 'rgba(0, 255, 255, 0.05)', padding: '15px', borderRadius: '8px', border: '1px solid rgba(0, 255, 255, 0.1)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                    <Activity size={16} color="#00ffff" />
                    <span style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>LIVE FEED</span>
                </div>
                <div style={{ fontSize: '0.7rem', color: '#00ffff', fontFamily: 'monospace' }}>
                    &gt; Scanning Sector 7...<br/>
                    &gt; {activeErrands.length} nodes active<br/>
                    &gt; Encryption: AES-256
                </div>
            </div>
        </div>
    );
};

import { HyperspaceOverlay } from './Hyperspace';

// --- Main Component ---
const CampusHologram = () => {
  const [isEmergency, setIsEmergency] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const navigate = useNavigate();

  // Transition State
  const [isHyperSpace, setIsHyperSpace] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);

  // Route Planning State
  const [travelMode, setTravelMode] = useState(false);
  const [startBuilding, setStartBuilding] = useState<BuildingData | null>(null);
  const [endBuilding, setEndBuilding] = useState<BuildingData | null>(null);
  const [matches, setMatches] = useState<MatchResponse[] | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeRoute, setActiveRoute] = useState<{start: [number, number, number], end: [number, number, number]} | null>(null);

  // Errand Request State
  const [errandMode, setErrandMode] = useState(false);
  const [pickupBuilding, setPickupBuilding] = useState<BuildingData | null>(null);
  const [dropoffBuilding, setDropoffBuilding] = useState<BuildingData | null>(null);
  
  // Live Data State
  const [pendingErrands, setPendingErrands] = useState<ErrandResponse[]>([]);

  const fetchErrands = async () => {
      try {
          const res = await api.getPendingErrands();
          if (res.data) setPendingErrands(res.data || []);
      } catch (err) {
          console.error("Failed to fetch errands", err);
      }
  };

  const handleUpdateErrand = async (id: string, status: 'completed' | 'cancelled') => {
      try {
          await api.updateErrandStatus(id, status);
          // Optimistic update
          setPendingErrands(prev => prev.filter(e => e.id !== id));
      } catch (err) {
          console.error("Failed to update errand", err);
      }
  };

  const handleAuthAction = async () => {
    await signOut(auth);
    navigate('/');
  };

  // Auth State Listener
  React.useEffect(() => {
    // Start WebSocket
    wsService.connect();

    // Listen for new errands
    const handleNewErrand = (newErrand: ErrandResponse) => {
        console.log("New Errand Received!", newErrand);
        setPendingErrands(prev => [newErrand, ...prev]);
    };
    
    // Listen for Emergency State
    const handleEmergency = (payload: { active: boolean }) => {
        console.log("Emergency State Update:", payload);
        setIsEmergency(payload.active);
    };

    // Listen for Errand Status Updates
    const handleErrandStatus = (payload: { id: string, status: string }) => {
        console.log("Errand Status Update:", payload);
        if (payload.status !== 'pending') {
            setPendingErrands(prev => prev.filter(e => e.id !== payload.id));
        }
    };

    wsService.on('NEW_ERRAND', handleNewErrand);
    wsService.on('EMERGENCY_STATE', handleEmergency);
    wsService.on('ERRAND_STATUS_UPDATE', handleErrandStatus);

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
          fetchErrands();
      }
    });

    return () => {
        unsubscribe();
        wsService.off('NEW_ERRAND', handleNewErrand);
        wsService.off('EMERGENCY_STATE', handleEmergency);
        wsService.off('ERRAND_STATUS_UPDATE', handleErrandStatus);
    };
  }, []);

  // Generate Buildings Data
  const buildings = useMemo(() => {
    const types = ["Research Lab", "Dormitory", "Lecture Hall", "Cafeteria", "Admin Block"];
    const statuses = ["Active", "Maintenance", "Restricted"] as const;
    const temp: BuildingData[] = [];
    
    for (let i = 0; i < 20; i++) {
      const height = Math.random() * 5 + 2; 
      const width = Math.random() * 2 + 1;
      const depth = Math.random() * 2 + 1;
      const x = (Math.random() - 0.5) * 40; 
      const z = (Math.random() - 0.5) * 40;
      
      temp.push({
        id: i,
        position: [x, height / 2, z],
        args: [width, height, depth],
        isTarget: i === 7,
        name: `Building ${String.fromCharCode(65 + (i % 26))}-${100 + i}`,
        type: types[i % types.length],
        occupancy: Math.floor(Math.random() * 100),
        status: statuses[Math.floor(Math.random() * 3)]
      });
    }
    return temp;
  }, []);

  const selectedBuilding = useMemo(() => 
    buildings.find(b => b.id === selectedId), 
  [buildings, selectedId]);

  // --- Logic ---
  const handleBuildingClick = (id: number) => {
      const b = buildings.find(x => x.id === id);
      if (!b) return;

      if (travelMode) {
          if (!startBuilding) {
              setStartBuilding(b);
          } else if (!endBuilding && b.id !== startBuilding.id) {
              setEndBuilding(b);
          } else {
              if (b.id === startBuilding.id) setStartBuilding(null);
              else if (endBuilding && b.id === endBuilding.id) setEndBuilding(null);
              else {
                  setStartBuilding(b);
                  setEndBuilding(null);
              }
          }
      } else if (errandMode) {
          if (!pickupBuilding) {
              setPickupBuilding(b);
          } else if (!dropoffBuilding && b.id !== pickupBuilding.id) {
              setDropoffBuilding(b);
          } else {
               if (b.id === pickupBuilding.id) setPickupBuilding(null);
               else if (dropoffBuilding && b.id === dropoffBuilding.id) setDropoffBuilding(null);
               else {
                   setPickupBuilding(b);
                   setDropoffBuilding(null);
               }
          }
      } else {
          setSelectedId(id);
      }
  };

  const handleConfirmRoute = async () => {
      if (!startBuilding || !endBuilding || !user) return;
      setIsSubmitting(true);
      try {
          // Construct WKT LineString (x z)
          const wkt = `LINESTRING(${startBuilding.position[0]} ${startBuilding.position[2]}, ${endBuilding.position[0]} ${endBuilding.position[2]})`;
          
          const plan = await api.createTravelPlan({
              user_id: user.uid,
              route_geom: wkt
          });
          
          if (plan.data && plan.data.id) {
              // Trigger Hyperspace
              setIsHyperSpace(true);
              
              const matchResults = await api.getMatches(plan.data.id);
              
              // Wait for effect
              setTimeout(() => {
                setMatches(matchResults.data);
                setActiveRoute({ start: startBuilding.position, end: endBuilding.position });
                setTravelMode(false); 
                setIsHyperSpace(false);
                setIsSubmitting(false);
              }, 2000);
          }
      } catch (err) {
          console.error("Failed to plan route:", err);
          alert("Route planning failed. Check console.");
          setIsSubmitting(false);
      }
  };

  const handleConfirmErrand = async () => {
      if (!pickupBuilding || !dropoffBuilding || !user) return;
      setIsSubmitting(true);
      try {
           const pickupWkt = `POINT(${pickupBuilding.position[0]} ${pickupBuilding.position[2]})`;
           const dropoffWkt = `POINT(${dropoffBuilding.position[0]} ${dropoffBuilding.position[2]})`;

           await api.createErrand({
               user_id: user.uid,
               title: "Campus Delivery",
               description: `Deliver package from ${pickupBuilding.name} to ${dropoffBuilding.name}`,
               pickup_geom: pickupWkt,
               dropoff_geom: dropoffWkt,
               reward_estimate: 5.0
           });
           
           alert("Errand Request Broadcasted!");
           setErrandMode(false);
           setPickupBuilding(null);
           setDropoffBuilding(null);
           fetchErrands(); // Refresh map
      } catch (err) {
          console.error("Failed to create errand:", err);
          alert("Errand creation failed.");
      } finally {
          setIsSubmitting(false);
      }
  };

  return (
    <div style={{ width: '100%', height: '100vh', background: '#050505', color: '#fff', position: 'relative' }}>
      
      <HyperspaceOverlay isActive={isHyperSpace} />

      {/* Header */}
      <header style={{
        position: 'absolute', top: '24px', left: '50%', transform: 'translateX(-50%)',
        width: '90%', maxWidth: '1200px', padding: '16px 32px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        background: 'rgba(10, 20, 30, 0.6)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(0, 255, 255, 0.1)',
        borderBottom: '2px solid rgba(0, 255, 255, 0.3)',
        borderRadius: '12px',
        zIndex: 10
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <div style={{ width: '10px', height: '10px', background: isEmergency ? '#ff0000' : '#00ffff', borderRadius: '50%', boxShadow: isEmergency ? '0 0 10px #ff0000' : '0 0 10px #00ffff' }}></div>
            <h1 style={{ margin: 0, fontSize: '1.2rem', letterSpacing: '4px', textTransform: 'uppercase', color: '#fff' }}>CampusLoop</h1>
        </div>
        
        <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
            <button 
                onClick={() => setShowSidebar(!showSidebar)}
                style={{
                    background: showSidebar ? 'rgba(0, 255, 255, 0.2)' : 'rgba(0, 255, 255, 0.05)',
                    border: '1px solid #00ffff',
                    color: '#00ffff',
                    padding: '8px 12px', cursor: 'pointer', borderRadius: '4px',
                    display: 'flex', alignItems: 'center'
                }}
            >
                <LayoutDashboard size={20} />
            </button>

            <button 
                onClick={() => { setTravelMode(!travelMode); setErrandMode(false); setMatches(null); setActiveRoute(null); }}
                style={{
                    background: travelMode ? 'rgba(0, 255, 0, 0.2)' : 'rgba(0, 255, 255, 0.1)',
                    border: travelMode ? '1px solid #00ff00' : '1px solid #00ffff',
                    color: travelMode ? '#00ff00' : '#00ffff',
                    padding: '8px 24px', cursor: 'pointer', fontWeight: 'bold', letterSpacing: '1px',
                    display: 'flex', alignItems: 'center', gap: '8px'
                }}
            >
                <Navigation size={16} />
                {travelMode ? 'PLANNING...' : 'PLAN ROUTE'}
            </button>

            <button 
                onClick={() => { setErrandMode(!errandMode); setTravelMode(false); setMatches(null); setActiveRoute(null); }}
                style={{
                    background: errandMode ? 'rgba(255, 165, 0, 0.2)' : 'rgba(0, 255, 255, 0.1)',
                    border: errandMode ? '1px solid #FFA500' : '1px solid #00ffff',
                    color: errandMode ? '#FFA500' : '#00ffff',
                    padding: '8px 24px', cursor: 'pointer', fontWeight: 'bold', letterSpacing: '1px',
                    display: 'flex', alignItems: 'center', gap: '8px'
                }}
            >
                <MapPin size={16} />
                {errandMode ? 'REQUESTING...' : 'REQUEST FAVOR'}
            </button>

            <button 
                onClick={() => api.toggleEmergency(!isEmergency)}
                style={{
                    background: isEmergency ? 'rgba(255, 0, 0, 0.2)' : 'rgba(0, 255, 255, 0.1)',
                    border: isEmergency ? '1px solid #ff0000' : '1px solid #00ffff',
                    color: isEmergency ? '#ff0000' : '#00ffff',
                    padding: '8px 24px', cursor: 'pointer', fontWeight: 'bold', letterSpacing: '1px'
                }}
            >
                {isEmergency ? 'DEACTIVATE ALARM' : 'SIMULATE EMERGENCY'}
            </button>

            {activeRoute && (
                <button 
                    onClick={() => setActiveRoute(null)}
                    style={{
                        background: 'rgba(255, 0, 0, 0.2)',
                        border: '1px solid #ff0000',
                        color: '#ff0000',
                        padding: '8px 16px', cursor: 'pointer', fontWeight: 'bold', letterSpacing: '1px',
                        display: 'flex', alignItems: 'center', gap: '8px'
                    }}
                >
                    <X size={16} />
                    CLEAR PATH
                </button>
            )}

            <button 
            onClick={handleAuthAction}
            style={{
              background: 'transparent',
              border: '1px solid rgba(255, 50, 50, 0.5)',
              color: '#ff4444',
              padding: '8px 16px', borderRadius: '4px', cursor: 'pointer',
              fontSize: '0.7rem', fontWeight: 800, letterSpacing: '1px',
              textTransform: 'uppercase'
            }}
          >
            DISCONNECT
          </button>
        </div>
      </header>

      {/* Sidebar Overlay */}
      {showSidebar && (
          <Sidebar 
            activeErrands={pendingErrands} 
            isEmergency={isEmergency} 
            onClose={() => setShowSidebar(false)}
            onComplete={(id) => handleUpdateErrand(id, 'completed')}
            onCancel={(id) => handleUpdateErrand(id, 'cancelled')}
          />
      )}

      {/* Info Panel Overlay (Only if not in travel/errand mode) */}
      {!travelMode && !errandMode && selectedBuilding && (
        <InfoPanel building={selectedBuilding} onClose={() => setSelectedId(null)} />
      )}

      {/* Route Planner Overlay */}
      {travelMode && (
          <div style={{
              position: 'absolute', bottom: '30px', left: '50%', transform: 'translateX(-50%)',
              background: 'rgba(0,0,0,0.8)', padding: '20px 40px', borderRadius: '12px',
              border: '1px solid #00ff00', backdropFilter: 'blur(10px)', zIndex: 20,
              display: 'flex', gap: '30px', alignItems: 'center'
          }}>
              <div style={{ textAlign: 'center' }}>
                  <div style={{ color: '#aaa', fontSize: '0.7rem', letterSpacing: '1px' }}>START</div>
                  <div style={{ color: startBuilding ? '#00ff00' : '#444', fontWeight: 'bold' }}>
                      {startBuilding ? startBuilding.name : 'SELECT BUILDING'}
                  </div>
              </div>
              <div style={{ width: '50px', height: '2px', background: '#333' }}></div>
              <div style={{ textAlign: 'center' }}>
                  <div style={{ color: '#aaa', fontSize: '0.7rem', letterSpacing: '1px' }}>DESTINATION</div>
                  <div style={{ color: endBuilding ? '#ff00ff' : '#444', fontWeight: 'bold' }}>
                      {endBuilding ? endBuilding.name : 'SELECT BUILDING'}
                  </div>
              </div>

              <button 
                  disabled={!startBuilding || !endBuilding || isSubmitting}
                  onClick={handleConfirmRoute}
                  style={{
                      marginLeft: '20px',
                      background: (!startBuilding || !endBuilding) ? '#333' : '#00ff00',
                      color: (!startBuilding || !endBuilding) ? '#666' : '#000',
                      border: 'none', padding: '12px 24px', borderRadius: '4px',
                      fontWeight: 'bold', cursor: (!startBuilding || !endBuilding) ? 'not-allowed' : 'pointer'
                  }}
              >
                  {isSubmitting ? 'CALCULATING...' : 'CONFIRM ROUTE'}
              </button>
          </div>
      )}

      {/* Errand Request Overlay */}
      {errandMode && (
          <div style={{
              position: 'absolute', bottom: '30px', left: '50%', transform: 'translateX(-50%)',
              background: 'rgba(0,0,0,0.8)', padding: '20px 40px', borderRadius: '12px',
              border: '1px solid #FFA500', backdropFilter: 'blur(10px)', zIndex: 20,
              display: 'flex', gap: '30px', alignItems: 'center'
          }}>
              <div style={{ textAlign: 'center' }}>
                  <div style={{ color: '#aaa', fontSize: '0.7rem', letterSpacing: '1px' }}>PICKUP</div>
                  <div style={{ color: pickupBuilding ? '#FFA500' : '#444', fontWeight: 'bold' }}>
                      {pickupBuilding ? pickupBuilding.name : 'SELECT BUILDING'}
                  </div>
              </div>
              <div style={{ width: '50px', height: '2px', background: '#333' }}></div>
              <div style={{ textAlign: 'center' }}>
                  <div style={{ color: '#aaa', fontSize: '0.7rem', letterSpacing: '1px' }}>DROPOFF</div>
                  <div style={{ color: dropoffBuilding ? '#FFA500' : '#444', fontWeight: 'bold' }}>
                      {dropoffBuilding ? dropoffBuilding.name : 'SELECT BUILDING'}
                  </div>
              </div>

              <button 
                  disabled={!pickupBuilding || !dropoffBuilding || isSubmitting}
                  onClick={handleConfirmErrand}
                  style={{
                      marginLeft: '20px',
                      background: (!pickupBuilding || !dropoffBuilding) ? '#333' : '#FFA500',
                      color: (!pickupBuilding || !dropoffBuilding) ? '#666' : '#000',
                      border: 'none', padding: '12px 24px', borderRadius: '4px',
                      fontWeight: 'bold', cursor: (!pickupBuilding || !dropoffBuilding) ? 'not-allowed' : 'pointer'
                  }}
              >
                  {isSubmitting ? 'POSTING...' : 'POST REQUEST'}
              </button>
          </div>
      )}

      {/* Match Results Overlay */}
      {matches && (
          <MatchList matches={matches} onClose={() => { setMatches(null); setActiveRoute(null); }} />
      )}

      {/* 3D Scene */}
      <Canvas shadows camera={{ position: [30, 30, 30], fov: 35 }} onPointerMissed={() => setSelectedId(null)}>
        <ambientLight intensity={0.2} />
        <pointLight position={[10, 10, 10]} intensity={1} color="#00ffff" />
        <pointLight position={[-10, 20, -10]} intensity={0.5} color="#ff00ff" />
        
        <Grid 
            infiniteGrid 
            fadeDistance={50} 
            fadeStrength={5} 
            cellSize={1} 
            sectionSize={5} 
            sectionColor={isEmergency ? "#550000" : "#005577"} 
            cellColor={isEmergency ? "#330000" : "#002233"} 
        />

        <group>
            {buildings.map((b) => (
                <Building 
                    key={b.id} 
                    data={b}
                    isSelected={selectedId === b.id}
                    isStart={startBuilding?.id === b.id || pickupBuilding?.id === b.id}
                    isEnd={endBuilding?.id === b.id || dropoffBuilding?.id === b.id}
                    isEmergency={isEmergency}
                    onClick={handleBuildingClick}
                />
            ))}
            
            {/* SOS Beam for Target Building */}
            {isEmergency && buildings.find(b => b.isTarget) && (
                <SOSBeam position={buildings.find(b => b.isTarget)!.position} />
            )}

            {/* Active Errand Beacons */}
            {pendingErrands.map((e) => (
                <Beacon 
                    key={e.id} 
                    position={[e.pickup_lng, 0, e.pickup_lat]} 
                    color="#ffaa00"
                />
            ))}

            {/* Active Route Visualization */}
            {activeRoute && <RouteVisualizer start={activeRoute.start} end={activeRoute.end} />}
        </group>

        <OrbitControls 
            enableDamping 
            dampingFactor={0.05} 
            maxPolarAngle={Math.PI / 2 - 0.1}
            minDistance={10}
            maxDistance={80}
        />

        <EffectComposer>
            <Bloom 
                luminanceThreshold={0.1} 
                mipmapBlur 
                intensity={1.5} 
                radius={0.4} 
            />
            <Noise opacity={0.05} />
            <Vignette eskil={false} offset={0.1} darkness={1.1} />
        </EffectComposer>
      </Canvas>
    </div>
  );
};

export default CampusHologram;