import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Grid } from '@react-three/drei';
import { EffectComposer, Bloom, Noise, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { useNavigate } from 'react-router-dom';
import { X, Info, Activity, Users, MapPin, Navigation, CheckCircle, LayoutDashboard, HelpCircle, AlertTriangle } from 'lucide-react';
import { api, MatchResponse, ErrandResponse } from '../lib/api';
import { wsService } from '../lib/ws';
import { HyperspaceOverlay } from './Hyperspace';

// --- Components ---

const HelpOverlay = ({ onClose }: { onClose: () => void }) => (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(10px)' }}>
        <div style={{ background: 'rgba(10, 20, 30, 0.95)', padding: '40px', borderRadius: '16px', border: '1px solid #00ffff', maxWidth: '500px', color: '#fff', boxShadow: '0 0 50px rgba(0, 255, 255, 0.2)' }}>
            <h2 style={{ color: '#00ffff', letterSpacing: '4px', textAlign: 'center', textTransform: 'uppercase' }}>Hologuide</h2>
            <div style={{ margin: '30px 0', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ display: 'flex', gap: '15px' }}><Navigation color="#00ff00" /><span><b>PLAN ROUTE:</b> Click two buildings to find tasks along your path.</span></div>
                <div style={{ display: 'flex', gap: '15px' }}><MapPin color="#FFA500" /><span><b>REQUEST FAVOR:</b> Mark pickup & dropoff to broadcast a new errand.</span></div>
                <div style={{ display: 'flex', gap: '15px' }}><LayoutDashboard color="#00ffff" /><span><b>DASHBOARD:</b> View all active errands and manage them.</span></div>
                <div style={{ display: 'flex', gap: '15px' }}><Activity color="#ff4444" /><span><b>EMERGENCY:</b> Trigger global alerts & visual beacons.</span></div>
            </div>
            <button onClick={onClose} style={{ width: '100%', padding: '12px', background: '#00ffff', color: '#000', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '2px' }}>Acknowledged</button>
        </div>
    </div>
);

const EmergencyBanner = ({ message }: { message: string }) => (
    <div style={{ position: 'absolute', top: '120px', left: '50%', transform: 'translateX(-50%)', width: '100%', background: 'rgba(200, 0, 0, 0.9)', color: '#fff', padding: '12px', textAlign: 'center', fontWeight: 'bold', letterSpacing: '4px', zIndex: 100, borderTop: '2px solid #fff', borderBottom: '2px solid #fff', boxShadow: '0 0 30px rgba(255,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '20px' }}>
        <AlertTriangle size={24} />
        <span>CRITICAL ALERT: {message || "UNIDENTIFIED ANOMALY DETECTED"}</span>
        <AlertTriangle size={24} />
    </div>
);

const Beacon = ({ position, category, onClick }: { position: [number, number, number], category?: string, onClick: () => void }) => (
    <group position={position} onClick={(e) => { e.stopPropagation(); onClick(); }} onPointerOver={() => { document.body.style.cursor = 'pointer'; }} onPointerOut={() => { document.body.style.cursor = 'auto'; }}>
        <mesh position={[0, 10, 0]}><cylinderGeometry args={[0.2, 0.2, 20, 8]} /><meshBasicMaterial color={category === 'borrow' ? '#ff00ff' : category === 'favor' ? '#00ff00' : '#ffaa00'} transparent opacity={0.3} /></mesh>
        <mesh position={[0, 1, 0]}><sphereGeometry args={[0.8, 16, 16]} /><meshBasicMaterial color={category === 'borrow' ? '#ff00ff' : category === 'favor' ? '#00ff00' : '#ffaa00'} /></mesh>
    </group>
);

const Building = ({ data, isSelected, isStart, isEnd, isEmergency, emergencyBuildingId, onClick }: any) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const isTarget = isEmergency && data.id === emergencyBuildingId;
  
  useFrame((state) => {
    if (!meshRef.current) return;
    const material = meshRef.current.material as THREE.MeshPhysicalMaterial;
    if (isTarget) {
      const t = state.clock.getElapsedTime();
      material.emissive.set('#ff0000');
      material.emissiveIntensity = (Math.sin(t * 8) + 1) * 2 + 0.5;
      material.color.lerp(new THREE.Color('#ff0000'), 0.1);
    } else if (isStart) { material.emissive.set('#00ff00'); material.emissiveIntensity = 1.5; material.color.set('#00ff00'); }
    else if (isEnd) { material.emissive.set('#ff00ff'); material.emissiveIntensity = 1.5; material.color.set('#ff00ff'); }
    else if (isSelected) { material.emissive.set('#ffffff'); material.emissiveIntensity = 2.0; material.color.set('#ffffff'); }
    else { material.emissive.set('#00bcd4'); material.emissiveIntensity = 0.5; material.color.set('#00bcd4'); }
  });

  return (
    <group position={data.position}>
      <mesh onClick={(e) => { e.stopPropagation(); onClick(data.id); }} onPointerOver={() => { document.body.style.cursor = 'pointer'; }} onPointerOut={() => { document.body.style.cursor = 'auto'; }} ref={meshRef}>
        <boxGeometry args={data.args} />
        <meshPhysicalMaterial transparent opacity={0.3} roughness={0} metalness={0.1} transmission={0.6} thickness={1} ior={1.5} />
        <lineSegments>
          <edgesGeometry args={[new THREE.BoxGeometry(...data.args)]} />
          <lineBasicMaterial color={isSelected ? '#ffffff' : (isTarget ? '#ff0000' : '#00ffff')} opacity={isSelected ? 0.8 : 0.5} transparent />
        </lineSegments>
      </mesh>
    </group>
  );
};

const InfoPanel = ({ building, onClose, onReportEmergency }: any) => (
  <div style={{ position: 'absolute', top: '100px', right: '30px', width: '300px', padding: '24px', background: 'rgba(10, 20, 30, 0.85)', backdropFilter: 'blur(15px)', border: '1px solid rgba(0, 255, 255, 0.2)', borderLeft: '4px solid #00ffff', borderRadius: '0 12px 12px 0', color: '#fff', zIndex: 20, boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
      <h2 style={{ margin: 0, fontSize: '1.2rem', textTransform: 'uppercase', letterSpacing: '2px', color: '#00ffff' }}>{building.name}</h2>
      <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer' }}><X size={20} /></button>
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9rem', color: '#aaa' }}><MapPin size={16} color="#00ffff" /><span>Sector {building.id}</span></div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9rem', color: '#aaa' }}><Info size={16} color="#00ffff" /><span>Type: {building.type}</span></div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9rem', color: '#aaa' }}><Activity size={16} color="#00ff00" /><span>Status: Active</span></div>
    </div>
    <div style={{ marginTop: '25px', paddingTop: '15px', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <button style={{ width: '100%', padding: '10px', background: 'rgba(0, 255, 255, 0.1)', border: '1px solid rgba(0, 255, 255, 0.3)', color: '#00ffff', cursor: 'pointer', textTransform: 'uppercase', fontSize: '0.8rem' }}>View Logs</button>
      <button onClick={() => onReportEmergency(building.id)} style={{ width: '100%', padding: '10px', background: 'rgba(255, 0, 0, 0.2)', border: '1px solid rgba(255, 0, 0, 0.5)', color: '#ff4444', cursor: 'pointer', fontWeight: 'bold', textTransform: 'uppercase', fontSize: '0.8rem' }}>Trigger Alarm</button>
    </div>
  </div>
);

const Sidebar = ({ errands, isEmergency, onClose, onComplete, onCancel, onOpenChat }: any) => (
    <div style={{ position: 'absolute', top: '100px', left: '30px', width: '320px', bottom: '30px', background: 'rgba(5, 15, 25, 0.75)', backdropFilter: 'blur(20px)', border: '1px solid rgba(0, 255, 255, 0.1)', borderRight: isEmergency ? '4px solid #ff0000' : '4px solid #00ffff', borderRadius: '12px', color: '#fff', zIndex: 15, padding: '24px', display: 'flex', flexDirection: 'column', gap: '25px', boxShadow: '20px 0 50px rgba(0,0,0,0.5)', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: '0.8rem', color: '#00ffff', letterSpacing: '2px', textTransform: 'uppercase' }}>Mission Control</h3>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer' }}><X size={18} /></button>
        </div>
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '20px' }}>
            {errands.length === 0 ? <div style={{ fontSize: '0.85rem', color: '#666', fontStyle: 'italic' }}>No active nodes...</div> : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {errands.map((e: any) => (
                        <div key={e.id} style={{ padding: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(0,255,255,0.05)', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div onClick={() => onOpenChat(e.id)} style={{ cursor: 'pointer' }}><div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#00ffff' }}>{e.title}</div><div style={{ fontSize: '0.75rem', color: '#aaa', marginTop: '4px' }}>${e.reward_estimate} • {e.category}</div></div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button onClick={() => onComplete(e.id)} style={{ background: 'rgba(0, 255, 0, 0.2)', border: 'none', borderRadius: '4px', padding: '4px', cursor: 'pointer', color: '#00ff00' }}><CheckCircle size={14} /></button>
                                <button onClick={() => onCancel(e.id)} style={{ background: 'rgba(255, 0, 0, 0.2)', border: 'none', borderRadius: '4px', padding: '4px', cursor: 'pointer', color: '#ff4444' }}><X size={14} /></button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
        <div style={{ marginTop: 'auto', background: 'rgba(0, 255, 255, 0.05)', padding: '15px', borderRadius: '8px', border: '1px solid rgba(0, 255, 255, 0.1)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}><Activity size={16} color="#00ffff" /><span style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>Live Feed</span></div>
            <div style={{ fontSize: '0.7rem', color: '#00ffff', fontFamily: 'monospace' }}>&gt; SCANNING SECTOR 7...<br/>&gt; {errands.length} NODES ACTIVE<br/>&gt; AES-256 ENCRYPTED</div>
        </div>
    </div>
);

const RouteVisualizer = ({ start, end }: { start: [number, number, number], end: [number, number, number] }) => {
    const points = useMemo(() => [new THREE.Vector3(start[0], 0.5, start[2]), new THREE.Vector3(end[0], 0.5, end[2])], [start, end]);
    const curve = useMemo(() => new THREE.CatmullRomCurve3(points), [points]);
    return (
        <group>
            <mesh><tubeGeometry args={[curve, 20, 0.1, 8, false]} /><meshBasicMaterial color="#00ff00" /></mesh>
            <mesh><tubeGeometry args={[curve, 20, 0.3, 8, false]} /><meshBasicMaterial color="#00ff00" transparent opacity={0.2} /></mesh>
        </group>
    );
};

const SOSBeam = ({ position }: { position: [number, number, number] }) => {
    const beamRef = useRef<THREE.Mesh>(null);
    useFrame((state) => {
        if (beamRef.current) {
            const t = state.clock.getElapsedTime();
            beamRef.current.scale.x = beamRef.current.scale.z = 1 + Math.sin(t * 10) * 0.2;
            (beamRef.current.material as THREE.MeshBasicMaterial).opacity = 0.5 + Math.sin(t * 10) * 0.3;
        }
    });
    return (
        <group position={[position[0], 0, position[2]]}>
            <mesh ref={beamRef} position={[0, 50, 0]}><cylinderGeometry args={[0.5, 2, 100, 16]} /><meshBasicMaterial color="#ff0000" transparent opacity={0.6} /></mesh>
            <mesh position={[0, 0.5, 0]}><cylinderGeometry args={[4, 4, 0.2, 32]} /><meshBasicMaterial color="#ff0000" transparent opacity={0.3} /></mesh>
        </group>
    );
};

const MatchList = ({ matches, onClose }: { matches: MatchResponse[], onClose: () => void }) => (
    <div style={{ position: 'absolute', bottom: '100px', left: '50%', transform: 'translateX(-50%)', width: '400px', background: 'rgba(10, 20, 30, 0.9)', backdropFilter: 'blur(10px)', border: '1px solid #00ff00', borderRadius: '12px', color: '#fff', zIndex: 100, padding: '20px', boxShadow: '0 0 30px rgba(0, 255, 0, 0.2)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <h3 style={{ margin: 0, color: '#00ff00', fontSize: '0.9rem', letterSpacing: '2px', textTransform: 'uppercase' }}>Matches Found</h3>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer' }}><X size={18} /></button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '300px', overflowY: 'auto' }}>
            {matches.length === 0 ? <p style={{ fontSize: '0.8rem', color: '#aaa', textAlign: 'center' }}>No errands found along this route.</p> : matches.map((m, i) => (
                <div key={i} style={{ padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '6px', border: '1px solid rgba(0,255,0,0.1)' }}>
                    <div style={{ fontWeight: 'bold', fontSize: '0.85rem', color: '#00ff00' }}>{m.errand.title}</div>
                    <div style={{ fontSize: '0.75rem', color: '#aaa', marginTop: '4px' }}>{m.errand.description}</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', fontSize: '0.7rem' }}>
                        <span style={{ color: '#fa0' }}>Reward: ${m.errand.reward_estimate}</span>
                        <span style={{ color: '#888' }}>{Math.round(m.distance_from_route)}m off-path</span>
                    </div>
                </div>
            ))}
        </div>
    </div>
);

const NeuralWallet = ({ credits, xp, rank }: { credits: number, xp: number, rank: string }) => (
    <div style={{ position: 'absolute', top: '100px', right: '30px', padding: '15px 25px', background: 'rgba(5, 15, 25, 0.75)', backdropFilter: 'blur(20px)', border: '1px solid rgba(0, 255, 255, 0.2)', borderRight: '4px solid #00ffff', borderRadius: '8px', color: '#fff', zIndex: 15, display: 'flex', flexDirection: 'column', gap: '5px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
        <div style={{ fontSize: '0.65rem', color: '#00ffff', letterSpacing: '2px', textTransform: 'uppercase', opacity: 0.8 }}>Digital Reputation</div>
        <div style={{ fontSize: '1.2rem', fontWeight: 900, letterSpacing: '1px' }}>{rank} <span style={{ fontSize: '0.7rem', color: '#666', fontWeight: 400 }}>lvl.{Math.floor(xp / 1000)}</span></div>
        <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ background: 'rgba(0, 255, 255, 0.1)', padding: '5px 10px', borderRadius: '4px', border: '1px solid rgba(0, 255, 255, 0.3)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '8px', height: '8px', background: '#00ffff', borderRadius: '50%', boxShadow: '0 0 10px #00ffff' }}></div>
                <span style={{ fontSize: '0.9rem', fontWeight: 'bold', fontFamily: 'monospace' }}>{credits.toLocaleString()} CR</span>
            </div>
            <div style={{ flex: 1, height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', overflow: 'hidden' }}>
                <div style={{ width: `${(xp % 1000) / 10}%`, height: '100%', background: '#00ffff' }}></div>
            </div>
        </div>
    </div>
);

const TerminalChat = ({ errandId, userId, onClose }: { errandId: string, userId: string, onClose: () => void }) => {
    const [messages, setMessages] = useState<any[]>([]);
    const [input, setInput] = useState("");
    const scrollRef = useRef<HTMLDivElement>(null);

    const fetchHistory = async () => {
        try {
            const res = await api.getChat(errandId);
            setMessages(res.data);
        } catch (e) { console.error(e); }
    };

    useEffect(() => {
        fetchHistory();
        const handleNewMsg = (m: any) => {
            if (m.errand_id === errandId) setMessages(prev => [...prev, m]);
        };
        wsService.on('NEW_MESSAGE', handleNewMsg);
        return () => wsService.off('NEW_MESSAGE', handleNewMsg);
    }, [errandId]);

    useEffect(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }, [messages]);

    const send = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim()) return;
        try {
            await api.sendMessage(errandId, userId, input);
            setInput("");
        } catch (e) { alert("Comms Failure"); }
    };

    return (
        <div style={{ position: 'fixed', bottom: '100px', right: '30px', width: '350px', height: '450px', background: 'rgba(5, 10, 15, 0.95)', backdropFilter: 'blur(20px)', border: '1px solid #00ffff', borderRadius: '8px', zIndex: 100, display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 0 50px rgba(0,255,255,0.1)' }}>
            <div style={{ background: 'rgba(0, 255, 255, 0.1)', padding: '10px 15px', borderBottom: '1px solid #00ffff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ color: '#00ffff', fontSize: '0.7rem', letterSpacing: '2px', fontWeight: 'bold' }}>SECURE_CHANNEL://{errandId.slice(0,8)}</div>
                <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#00ffff', cursor: 'pointer' }}><X size={14} /></button>
            </div>
            <div ref={scrollRef} style={{ flex: 1, padding: '15px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', fontFamily: 'monospace', fontSize: '0.8rem' }}>
                {messages.map((m, i) => (
                    <div key={i} style={{ alignSelf: m.sender_id === userId ? 'flex-end' : 'flex-start', maxWidth: '80%' }}>
                        <div style={{ color: m.sender_id === userId ? '#00ffff' : '#aaa', fontSize: '0.6rem', marginBottom: '2px' }}>{m.sender_id === userId ? 'YOU' : 'TRACER_REF'}</div>
                        <div style={{ background: m.sender_id === userId ? 'rgba(0, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.05)', padding: '8px 12px', borderRadius: '4px', border: m.sender_id === userId ? '1px solid rgba(0, 255, 255, 0.2)' : '1px solid rgba(255, 255, 255, 0.1)', color: '#fff', wordBreak: 'break-all' }}>
                            {m.content}
                        </div>
                    </div>
                ))}
            </div>
            <form onSubmit={send} style={{ padding: '10px', borderTop: '1px solid rgba(0, 255, 255, 0.2)', display: 'flex', gap: '5px' }}>
                <input value={input} onChange={e => setInput(e.target.value)} placeholder="Enter encrypted text..." style={{ flex: 1, background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(0,255,255,0.3)', color: '#00ffff', padding: '8px', borderRadius: '4px', fontSize: '0.8rem', fontFamily: 'monospace' }} />
                <button type="submit" style={{ background: '#00ffff', color: '#000', border: 'none', padding: '0 15px', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}>SEND</button>
            </form>
        </div>
    );
};

// --- Main Component ---

const CampusHologram = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<{ credits: number, xp: number, rank: string }>({ credits: 0, xp: 0, rank: "Ghost" });
  const [pendingErrands, setPendingErrands] = useState<ErrandResponse[]>([]);
  
  // UI State
  const [showHelp, setShowHelp] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isHyperSpace, setIsHyperSpace] = useState(false);
  
  // Emergency State
  const [isEmergency, setIsEmergency] = useState(false);
  const [emergencyMsg, setEmergencyMsg] = useState("");
  const [emergencyBuildingId, setEmergencyBuildingId] = useState<number | null>(null);
  
  // Map State
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [travelMode, setTravelMode] = useState(false);
  const [errandMode, setErrandMode] = useState(false);
  const [errandCategory, setErrandCategory] = useState("delivery");
  const [startBuilding, setStartBuilding] = useState<any>(null);
  const [endBuilding, setEndBuilding] = useState<any>(null);
  const [pickupBuilding, setPickupBuilding] = useState<any>(null);
  const [dropoffBuilding, setDropoffBuilding] = useState<any>(null);
  const [activeRoute, setActiveRoute] = useState<any>(null);
  const [matches, setMatches] = useState<MatchResponse[] | null>(null);
  const [chatErrandId, setChatErrandId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [buildingLayout, setBuildingLayout] = useState(0);

  const fetchProfile = async () => {
      try {
          const res = await api.getProfile();
          setProfile(res.data);
      } catch (e) { console.error("Profile fetch failed"); }
  };

  const fetchErrands = async () => {
      setIsLoading(true);
      try {
          const res = await api.getPendingErrands();
          setPendingErrands(res.data || []);
      } catch (e) { console.error(e); }
      finally { setIsLoading(false); }
  };

  const handleUpdateErrand = async (id: string, status: 'completed' | 'cancelled') => {
      try {
          await api.updateErrandStatus(id, status);
          setPendingErrands(prev => prev.filter(err => err.id !== id));
          if (status === 'completed') {
              fetchProfile(); // Refresh credits
          }
          alert(`Success: Request ${status}`);
      } catch (e) { alert("Action failed"); }
  };

  const handleReportEmergency = async (id: number) => {
      const msg = prompt("ENTER EMERGENCY CLEARANCE MESSAGE:");
      if (msg) await api.toggleEmergency(true, msg, id);
  };

  useEffect(() => {
    wsService.connect();
    const hNew = (e: any) => setPendingErrands(p => [e, ...p]);
    const hEmerg = (p: any) => { setIsEmergency(p.active); setEmergencyMsg(p.message); setEmergencyBuildingId(p.building_id); };
    const hStat = (p: any) => { if (p.status !== 'pending') setPendingErrands(prev => prev.filter(err => err.id !== p.id)); };

    wsService.on('NEW_ERRAND', hNew);
    wsService.on('EMERGENCY_STATE', hEmerg);
    wsService.on('ERRAND_STATUS_UPDATE', hStat);

    const unsub = onAuthStateChanged(auth, (u) => { 
        setUser(u); 
        if (u) {
            fetchErrands();
            fetchProfile();
        } 
    });
    return () => { unsub(); wsService.off('NEW_ERRAND', hNew); wsService.off('EMERGENCY_STATE', hEmerg); wsService.off('ERRAND_STATUS_UPDATE', hStat); };
  }, []);

  const buildings = useMemo(() => {
    const b: { id: number, position: [number, number, number], args: [number, number, number], name: string, type: string }[] = [];
    const types = ["Lab", "Dorm", "Hall", "Cafe", "Admin"];
    for (let i = 0; i < 20; i++) {
      const h = Math.random() * 5 + 2; 
      const seed = i + buildingLayout;
      const x = Math.sin(seed * 12345.678) * 20;
      const z = Math.cos(seed * 98765.432) * 20;
      b.push({ id: i, position: [x, h / 2, z], args: [2, h, 2], name: `Node ${String.fromCharCode(65+(i%26))}-${100+i}`, type: types[i%5] });
    }
    return b;
  }, [buildingLayout]);

  const handleBuildingClick = (id: number) => {
      const b = buildings.find(x => x.id === id);
      if (!b) return;
      if (travelMode) {
          if (!startBuilding) setStartBuilding(b);
          else if (!endBuilding) setEndBuilding(b);
          else { setStartBuilding(b); setEndBuilding(null); }
      } else if (errandMode) {
          if (!pickupBuilding) setPickupBuilding(b);
          else if (!dropoffBuilding) setDropoffBuilding(b);
          else { setPickupBuilding(b); setDropoffBuilding(null); }
      } else setSelectedId(id);
  };

  const handleConfirmRoute = async () => {
      if (!startBuilding || !endBuilding || !user) return;
      setIsSubmitting(true);
      try {
          const wkt = `LINESTRING(${startBuilding.position[0]} ${startBuilding.position[2]}, ${endBuilding.position[0]} ${endBuilding.position[2]})`;
          const plan = await api.createTravelPlan({ user_id: user.uid, route_geom: wkt });
          if (plan.data) {
              setIsHyperSpace(true);
              const m = await api.getMatches(plan.data.id);
              setTimeout(() => { 
                  setMatches(m.data); 
                  setActiveRoute({start: startBuilding.position, end: endBuilding.position}); 
                  setTravelMode(false); 
                  setStartBuilding(null);
                  setEndBuilding(null);
                  setIsHyperSpace(false); 
                  setIsSubmitting(false); 
              }, 2000);
          }
      } catch (e) { alert("Failed"); setIsSubmitting(false); }
  };

  const handleConfirmErrand = async () => {
      if (!pickupBuilding || !dropoffBuilding || !user) return;
      setIsSubmitting(true);
      try {
          await api.createErrand({ user_id: user.uid, title: errandCategory.toUpperCase(), category: errandCategory, description: `Request: ${errandCategory}`, pickup_geom: `POINT(${pickupBuilding.position[0]} ${pickupBuilding.position[2]})`, dropoff_geom: `POINT(${dropoffBuilding.position[0]} ${dropoffBuilding.position[2]})`, reward_estimate: 5.0 });
          alert("Request Broadcasted!"); 
          setErrandMode(false); 
          setPickupBuilding(null); 
          setDropoffBuilding(null); 
          fetchErrands();
      } catch (e) { alert("Error"); } finally { setIsSubmitting(false); }
  };

  const selectedBuilding = useMemo(() => buildings.find(b => b.id === selectedId), [buildings, selectedId]);

  return (
    <div style={{ width: '100%', height: '100vh', background: '#050505', position: 'relative', color: '#fff' }}>
      <HyperspaceOverlay isActive={isHyperSpace} />
      {showHelp && <HelpOverlay onClose={() => setShowHelp(false)} />}
      {isEmergency && <EmergencyBanner message={emergencyMsg} />}
      {isLoading && <div style={{ position: 'absolute', inset: 0, zIndex: 500, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'monospace', letterSpacing: '4px', color: '#00ffff' }}>SCANNING CAMPUS NODES...</div>}

      <header style={{ position: 'absolute', top: '24px', left: '50%', transform: 'translateX(-50%)', width: '90%', maxWidth: '1200px', padding: '16px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(10, 20, 30, 0.6)', backdropFilter: 'blur(10px)', border: '1px solid rgba(0, 255, 255, 0.1)', borderBottom: '2px solid rgba(0, 255, 255, 0.3)', borderRadius: '12px', zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <div style={{ width: '10px', height: '10px', background: isEmergency ? '#ff0000' : '#00ffff', borderRadius: '50%', boxShadow: isEmergency ? '0 0 10px #ff0000' : '0 0 10px #00ffff' }}></div>
            <h1 style={{ margin: 0, fontSize: '1.2rem', letterSpacing: '4px', textTransform: 'uppercase' }}>CampusLoop</h1>
        </div>
        <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
            <button onClick={() => setBuildingLayout(prev => prev + 1)} style={{ background: 'rgba(0, 255, 255, 0.1)', border: '1px solid #00ffff', color: '#00ffff', padding: '8px 12px', cursor: 'pointer', borderRadius: '4px', textTransform: 'uppercase', fontSize: '0.7rem', fontWeight: 'bold' }}>Reconfigure</button>
            <button onClick={() => setShowHelp(true)} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', padding: '8px 12px', cursor: 'pointer', borderRadius: '4px' }}><HelpCircle size={20}/></button>
            <button onClick={() => setShowSidebar(!showSidebar)} style={{ background: showSidebar ? 'rgba(0,255,255,0.2)' : 'rgba(0,255,255,0.05)', border: '1px solid #00ffff', color: '#00ffff', padding: '8px 12px', cursor: 'pointer', borderRadius: '4px' }}><LayoutDashboard size={20}/></button>
            <button onClick={() => { const m = !travelMode; setTravelMode(m); setErrandMode(false); setMatches(null); setActiveRoute(null); if(!m) {setStartBuilding(null); setEndBuilding(null);} }} style={{ background: travelMode ? 'rgba(0,255,0,0.2)' : 'rgba(0,255,255,0.1)', border: travelMode ? '1px solid #00ff00' : '1px solid #00ffff', color: travelMode ? '#00ff00' : '#00ffff', padding: '8px 24px', cursor: 'pointer', fontWeight: 'bold', letterSpacing: '1px' }}>{travelMode ? 'PLANNING...' : 'PLAN ROUTE'}</button>
            <button onClick={() => { const m = !errandMode; setErrandMode(m); setTravelMode(false); setMatches(null); setActiveRoute(null); if(!m) {setPickupBuilding(null); setDropoffBuilding(null);} }} style={{ background: errandMode ? 'rgba(255,165,0,0.2)' : 'rgba(0,255,255,0.1)', border: errandMode ? '1px solid #FFA500' : '1px solid #00ffff', color: errandMode ? '#FFA500' : '#00ffff', padding: '8px 24px', cursor: 'pointer', fontWeight: 'bold', letterSpacing: '1px' }}>{errandMode ? 'REQUESTING...' : 'REQUEST FAVOR'}</button>
            <button onClick={() => api.toggleEmergency(!isEmergency, "EVACUATION DRILL", -1)} style={{ background: isEmergency ? 'rgba(255,0,0,0.2)' : 'rgba(0,255,255,0.1)', border: isEmergency ? '1px solid #ff0000' : '1px solid #00ffff', color: isEmergency ? '#ff0000' : '#00ffff', padding: '8px 24px', cursor: 'pointer', fontWeight: 'bold', letterSpacing: '1px' }}>{isEmergency ? 'OFF' : 'SOS'}</button>
            {activeRoute && <button onClick={() => { setActiveRoute(null); setStartBuilding(null); setEndBuilding(null); }} style={{ background: 'rgba(255,0,0,0.2)', border: '1px solid #ff0000', color: '#ff0000', padding: '8px 16px', cursor: 'pointer', fontWeight: 'bold' }}>CLEAR PATH</button>}
            <button onClick={() => { signOut(auth); navigate('/'); }} style={{ background: 'transparent', border: '1px solid #f44', color: '#f44', padding: '8px 16px', cursor: 'pointer', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase' }}>Exit</button>
        </div>
      </header>

      <NeuralWallet credits={profile.credits} xp={profile.xp} rank={profile.rank} />

      {showSidebar && <Sidebar errands={pendingErrands} isEmergency={isEmergency} onClose={() => setShowSidebar(false)} onComplete={(id: any) => handleUpdateErrand(id, 'completed')} onCancel={(id: any) => handleUpdateErrand(id, 'cancelled')} onOpenChat={(id: string) => setChatErrandId(id)} />}
      {chatErrandId && <TerminalChat errandId={chatErrandId} userId={user?.uid || "demo-user"} onClose={() => setChatErrandId(null)} />}
      {!travelMode && !errandMode && selectedBuilding && <InfoPanel building={selectedBuilding} onClose={() => setSelectedId(null)} onReportEmergency={handleReportEmergency} />}

      {travelMode && (
          <div style={{ position: 'absolute', bottom: '30px', left: '50%', transform: 'translateX(-50%)', background: 'rgba(0,0,0,0.8)', padding: '20px 40px', borderRadius: '12px', border: '1px solid #00ff00', backdropFilter: 'blur(10px)', zIndex: 20, display: 'flex', gap: '30px', alignItems: 'center' }}>
              <span style={{ color: '#0f0', fontWeight: 'bold' }}>{startBuilding?.name || 'SELECT START'} ➔ {endBuilding?.name || 'SELECT DESTINATION'}</span>
              <button disabled={!startBuilding || !endBuilding || isSubmitting} onClick={handleConfirmRoute} style={{ background: '#00ff00', color: '#000', border: 'none', padding: '12px 24px', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}>{isSubmitting ? '...' : 'CONFIRM'}</button>
          </div>
      )}

      {errandMode && (
          <div style={{ position: 'absolute', bottom: '30px', left: '50%', transform: 'translateX(-50%)', background: 'rgba(0,0,0,0.8)', padding: '20px 40px', borderRadius: '12px', border: '1px solid #FFA500', backdropFilter: 'blur(10px)', zIndex: 20, display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                  {['delivery', 'borrow', 'favor'].map(cat => (
                      <button key={cat} onClick={() => setErrandCategory(cat)} style={{ padding: '5px 15px', background: errandCategory === cat ? '#fa0' : 'none', border: '1px solid #fa0', color: errandCategory === cat ? '#000' : '#fa0', borderRadius: '4px', cursor: 'pointer', fontSize: '0.7rem', fontWeight: 'bold' }}>{cat.toUpperCase()}</button>
                  ))}
              </div>
              <div style={{ display: 'flex', gap: '30px', alignItems: 'center' }}>
                  <span style={{ color: '#fa0', fontWeight: 'bold' }}>{pickupBuilding?.name || 'PICKUP'} ➔ {dropoffBuilding?.name || 'DROPOFF'}</span>
                  <button disabled={!pickupBuilding || !dropoffBuilding || isSubmitting} onClick={handleConfirmErrand} style={{ background: '#fa0', color: '#000', border: 'none', padding: '12px 24px', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}>{isSubmitting ? '...' : 'POST'}</button>
              </div>
          </div>
      )}

      {matches && <MatchList matches={matches} onClose={() => { setMatches(null); setActiveRoute(null); }} />}

      <Canvas camera={{ position: [30, 30, 30], fov: 35 }}>
        <ambientLight intensity={0.2} /><pointLight position={[10, 10, 10]} intensity={1} color="#00ffff" />
        <Grid infiniteGrid fadeDistance={50} fadeStrength={5} cellSize={1} sectionSize={5} sectionColor={isEmergency ? "#550000" : "#005577"} cellColor={isEmergency ? "#330000" : "#002233"} />
        <group>
            {buildings.map(b => <Building key={b.id} data={b} isSelected={selectedId === b.id} isStart={startBuilding?.id === b.id || pickupBuilding?.id === b.id} isEnd={endBuilding?.id === b.id || dropoffBuilding?.id === b.id} isEmergency={isEmergency} emergencyBuildingId={emergencyBuildingId ?? undefined} onClick={handleBuildingClick} />)}
            {isEmergency && emergencyBuildingId !== null && buildings.find(b => b.id === emergencyBuildingId) && <SOSBeam position={buildings.find(b => b.id === emergencyBuildingId)!.position} />}
            {pendingErrands.map(e => (
                <Beacon 
                    key={e.id} 
                    position={[e.pickup_lng, 0, e.pickup_lat]} 
                    category={e.category}
                    onClick={() => setShowSidebar(true)} 
                />
            ))}
            {activeRoute && <RouteVisualizer start={activeRoute.start} end={activeRoute.end} />}
        </group>
        <OrbitControls enableDamping dampingFactor={0.05} maxPolarAngle={Math.PI / 2 - 0.1} />
        <EffectComposer><Bloom luminanceThreshold={0.1} intensity={1.5} radius={0.4} /><Noise opacity={0.05} /><Vignette offset={0.1} darkness={1.1} /></EffectComposer>
      </Canvas>
    </div>
  );
};

export default CampusHologram;
