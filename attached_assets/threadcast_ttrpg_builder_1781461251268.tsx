import React, { useState, useEffect, useRef } from 'react';
import { 
  Shield, Heart, Zap, Book, Crosshair, 
  Flame, Moon, Save, RefreshCw, AlertCircle, 
  Sword, Backpack, Dices, User, Plus, X, Settings, Image as ImageIcon, ChevronLeft, LogOut
} from 'lucide-react';

// --- FIREBASE SETUP ---
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, doc, setDoc, getDoc, onSnapshot, deleteDoc } from 'firebase/firestore';

const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

// --- CONSTANTS ---
const SKILLS = [
  { name: 'Thread Reach', attr: 'THS' }, { name: 'Surge', attr: 'POT' },
  { name: 'Weave Reading', attr: 'THS' }, { name: 'Signature Suppression', attr: 'CTR' },
  { name: 'Strand Awareness', attr: 'THS' }, { name: 'Ward Craft', attr: 'CTR' },
  { name: 'Inscription', attr: 'ACU' }, { name: 'Anatomy of Magic', attr: 'ACU' },
  { name: 'Combat Forms', attr: 'ACU' }, { name: 'Swift Hands', attr: 'CTR' },
  { name: 'Grit', attr: 'RES' }, { name: 'Discernment', attr: 'ACU' },
  { name: 'Lore', attr: 'ACU' }, { name: 'Guild Protocol', attr: 'PRE' },
  { name: 'Street Sense', attr: 'ACU' }, { name: 'Survival', attr: 'RES' },
  { name: 'Presence', attr: 'PRE' }, { name: 'Trade Craft', attr: 'ACU' }
];

const MODES = ["Striker", "Anchor", "Slider", "Binder", "Shearer", "Tensioner", "Imprinter", "Conductor"];

const DEFAULT_CHAR = {
  name: 'New Character', avatarUrl: '', age: '', background: '', affinity: '', guild: '', guildRank: '', level: 1,
  primaryMode: '', secondaryMode: '', tertiaryMode: '',
  attributes: { POT: 10, CTR: 10, RES: 10, ACU: 10, PRE: 10, THS: 10 },
  attunedSkills: [],
  vpCurrent: 18, tension: 0, burnout: 0, fatigue: 0, corruption: 0,
  recoveryDiceCurrent: 2,
  strings: [], techniques: [], feats: {},
  equipment: '', signature: '', woundsNotes: ''
};

const DEFAULT_SETTINGS = {
  affinities: ['Fire', 'Water', 'Earth', 'Air', 'Metal', 'Wood', 'Plant', 'Ice', 'Lightning', 'Glass', 'Stone', 'Sound', 'Light'],
  customStrings: []
};

const calcMod = (score) => Math.floor((score - 10) / 2);

export default function ThreadcastApp() {
  const [authUser, setAuthUser] = useState(null);
  const [appState, setAppState] = useState('LOGIN'); // LOGIN, ROSTER, BUILDER
  
  // Login State
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // Data State
  const [characters, setCharacters] = useState([]);
  const [activeChar, setActiveChar] = useState(null);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  
  // Builder UI State
  const [activeTab, setActiveTab] = useState('identity');
  const [saveStatus, setSaveStatus] = useState('');

  // Dice State
  const [isDicePanelOpen, setIsDicePanelOpen] = useState(false);
  const [diceHistory, setDiceHistory] = useState([]);
  const [isRolling, setIsRolling] = useState(false);
  const [currentRoll, setCurrentRoll] = useState(null);

  // Initialize Firebase Auth
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) {
        console.error("Auth error:", err);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setAuthUser);
    return () => unsubscribe();
  }, []);

  // Fetch Data when authenticated & logged into app
  useEffect(() => {
    if (!authUser || appState === 'LOGIN') return;

    // Listen to Characters
    const charRef = collection(db, 'artifacts', appId, 'users', authUser.uid, 'characters');
    const unsubChars = onSnapshot(charRef, (snapshot) => {
      const chars = [];
      snapshot.forEach(doc => chars.push({ id: doc.id, ...doc.data() }));
      setCharacters(chars);
    }, (err) => console.error(err));

    // Listen to Settings
    const settingsRef = doc(db, 'artifacts', appId, 'users', authUser.uid, 'settings', 'gm');
    const unsubSettings = onSnapshot(settingsRef, (docSnap) => {
      if (docSnap.exists()) {
        setSettings(docSnap.data());
      } else {
        setDoc(settingsRef, DEFAULT_SETTINGS);
      }
    }, (err) => console.error(err));

    return () => {
      unsubChars();
      unsubSettings();
    };
  }, [authUser, appState]);

  // Save Active Character
  useEffect(() => {
    if (!authUser || !activeChar || !activeChar.id) return;
    
    const saveToCloud = async () => {
      setSaveStatus('Saving...');
      try {
        const docRef = doc(db, 'artifacts', appId, 'users', authUser.uid, 'characters', activeChar.id);
        await setDoc(docRef, activeChar);
        setSaveStatus('Saved');
        setTimeout(() => setSaveStatus(''), 2000);
      } catch (err) {
        setSaveStatus('Error saving');
        console.error(err);
      }
    };

    const debounce = setTimeout(saveToCloud, 1000);
    return () => clearTimeout(debounce);
  }, [activeChar, authUser]);

  // Handlers
  const handleLogin = (e) => {
    e.preventDefault();
    if (username === 'test' && password === '1234') {
      setAppState('ROSTER');
      setLoginError('');
    } else {
      setLoginError('Invalid credentials. Try test / 1234');
    }
  };

  const handleCreateChar = async () => {
    const newId = crypto.randomUUID();
    const newChar = { ...DEFAULT_CHAR, id: newId, name: 'Unnamed Weaver' };
    try {
      await setDoc(doc(db, 'artifacts', appId, 'users', authUser.uid, 'characters', newId), newChar);
      setActiveChar(newChar);
      setAppState('BUILDER');
      setActiveTab('identity');
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteChar = async (id, e) => {
    e.stopPropagation();
    if(confirm("Burn this character's thread permanently?")) {
      await deleteDoc(doc(db, 'artifacts', appId, 'users', authUser.uid, 'characters', id));
    }
  };

  const updateChar = (field, value) => {
    setActiveChar(prev => ({ ...prev, [field]: value }));
  };

  const updateAttr = (attr, value) => {
    setActiveChar(prev => ({
      ...prev,
      attributes: { ...prev.attributes, [attr]: parseInt(value) || 0 }
    }));
  };

  const toggleSkill = (skillName) => {
    setActiveChar(prev => {
      const attuned = prev.attunedSkills.includes(skillName)
        ? prev.attunedSkills.filter(s => s !== skillName)
        : [...prev.attunedSkills, skillName];
      return { ...prev, attunedSkills: attuned };
    });
  };

  const doMend = () => {
    updateChar('tension', 0);
    updateChar('woundsNotes', activeChar.woundsNotes.replace(/Shaking Hands/ig, '').replace(/Burned/ig, ''));
  };

  const doLongRest = () => {
    const level = parseInt(activeChar.level) || 1;
    const maxVp = (parseInt(activeChar.attributes.RES) || 10) + 8 + ((level - 1) * 2);
    const maxRecDice = Math.max(0, calcMod(activeChar.attributes.RES) + 2);
    
    setActiveChar(prev => ({ 
      ...prev, 
      vpCurrent: maxVp, 
      tension: 0, 
      fatigue: Math.max(0, prev.fatigue - 1),
      burnout: Math.max(0, prev.burnout - 1),
      recoveryDiceCurrent: maxRecDice
    }));
  };

  // Dice Roller Logic
  const rollDice = (modifier = 0, label = "Custom Roll") => {
    setIsDicePanelOpen(true);
    setIsRolling(true);
    setCurrentRoll(null);
    
    // Simulate roll animation delay
    setTimeout(() => {
      const roll = Math.floor(Math.random() * 20) + 1;
      const total = roll + modifier;
      const result = { id: Date.now(), roll, mod: modifier, total, label, isCrit: roll === 20, isFail: roll === 1 };
      
      setCurrentRoll(result);
      setDiceHistory(prev => [result, ...prev].slice(0, 10)); // Keep last 10
      setIsRolling(false);
    }, 800);
  };

  // Render Functions
  if (appState === 'LOGIN') {
    return (
      <div className="min-h-screen bg-[#1a1412] flex items-center justify-center p-4 parchment-bg font-serif">
        <div className="bg-[#f4ebd8] max-w-md w-full p-8 rounded-sm shadow-[0_20px_50px_rgba(0,0,0,0.5)] border-4 border-double border-[#4a3320] relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-2 bg-[#8b0000]"></div>
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-[#2c1e16] tracking-wider mb-2">THREADCAST</h1>
            <p className="text-[#5c432d] italic">The Weave Awaits</p>
          </div>
          
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-[#4a3320] font-bold mb-1 uppercase text-sm tracking-widest">Codename</label>
              <input 
                type="text" 
                className="w-full bg-transparent border-b-2 border-[#8b0000]/30 focus:border-[#8b0000] p-2 text-[#2c1e16] focus:outline-none transition-colors"
                value={username} onChange={e => setUsername(e.target.value)} required
              />
            </div>
            <div>
              <label className="block text-[#4a3320] font-bold mb-1 uppercase text-sm tracking-widest">Cipher</label>
              <input 
                type="password" 
                className="w-full bg-transparent border-b-2 border-[#8b0000]/30 focus:border-[#8b0000] p-2 text-[#2c1e16] focus:outline-none transition-colors"
                value={password} onChange={e => setPassword(e.target.value)} required
              />
            </div>
            {loginError && <p className="text-[#8b0000] text-sm font-bold animate-pulse">{loginError}</p>}
            <button type="submit" className="w-full bg-[#2c1e16] text-[#f4ebd8] py-3 font-bold tracking-widest hover:bg-[#8b0000] transition-colors shadow-lg">
              ENTER THE WEAVE
            </button>
          </form>
          <div className="mt-6 text-center text-xs text-[#5c432d]">
            Access restricted to authorized Guild members.<br/>(Use test / 1234)
          </div>
        </div>
      </div>
    );
  }

  if (appState === 'ROSTER') {
    return (
      <div className="min-h-screen bg-[#1a1412] p-8 font-serif parchment-bg text-[#f4ebd8]">
        <div className="max-w-5xl mx-auto space-y-8">
          <div className="flex justify-between items-center border-b border-[#4a3320] pb-4">
            <div>
              <h1 className="text-4xl font-bold text-[#d4af37]">Threadcast Roster</h1>
              <p className="text-[#8b7355] italic">Select your thread or weave anew.</p>
            </div>
            <button onClick={() => setAppState('LOGIN')} className="flex items-center gap-2 text-[#8b7355] hover:text-[#f4ebd8] transition-colors">
              <LogOut size={18}/> Logout
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <button 
              onClick={handleCreateChar}
              className="h-48 border-2 border-dashed border-[#8b7355] hover:border-[#d4af37] rounded-lg flex flex-col items-center justify-center text-[#8b7355] hover:text-[#d4af37] transition-all bg-[#2c1e16]/30 hover:bg-[#2c1e16]/50 group"
            >
              <Plus size={48} className="mb-4 group-hover:scale-110 transition-transform" />
              <span className="font-bold tracking-widest uppercase">Weave New Character</span>
            </button>

            {characters.map(c => (
              <div 
                key={c.id} 
                onClick={() => { setActiveChar(c); setAppState('BUILDER'); setActiveTab('identity'); }}
                className="h-48 bg-[#f4ebd8] text-[#2c1e16] rounded-lg p-6 cursor-pointer hover:shadow-[0_0_20px_rgba(212,175,55,0.3)] transition-all relative overflow-hidden border-2 border-[#4a3320]"
              >
                <div className="absolute top-0 right-0 bg-[#8b0000] text-[#f4ebd8] px-3 py-1 text-xs font-bold rounded-bl-lg">
                  Level {c.level}
                </div>
                <div className="flex items-center gap-4 mb-4">
                  {c.avatarUrl ? (
                    <img src={c.avatarUrl} alt="Avatar" className="w-12 h-12 rounded-full border-2 border-[#4a3320] object-cover" />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-[#2c1e16] flex items-center justify-center text-[#d4af37]">
                      <User size={24} />
                    </div>
                  )}
                  <div>
                    <h3 className="font-bold text-xl truncate w-32">{c.name || 'Unnamed'}</h3>
                    <p className="text-sm text-[#5c432d] italic">{c.affinity || 'No Affinity'} {c.primaryMode}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm border-t border-[#4a3320]/30 pt-4">
                  <div><strong>VP:</strong> {c.vpCurrent}</div>
                  <div><strong>Tension:</strong> <span className={c.tension > 0 ? "text-[#8b0000] font-bold" : ""}>{c.tension}</span></div>
                  <div className="col-span-2 text-xs text-[#5c432d] truncate">Guild: {c.guild || 'None'}</div>
                </div>
                <button 
                  onClick={(e) => handleDeleteChar(c.id, e)}
                  className="absolute bottom-2 right-2 p-2 text-[#8b0000]/50 hover:text-[#8b0000] transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // BUILDER VIEW VARIABLES
  const level = parseInt(activeChar.level) || 1;
  const rb = Math.floor((level - 1) / 2) + 2;
  const potMod = calcMod(activeChar.attributes.POT);
  const ctrMod = calcMod(activeChar.attributes.CTR);
  const resMod = calcMod(activeChar.attributes.RES);
  const acuMod = calcMod(activeChar.attributes.ACU);
  const preMod = calcMod(activeChar.attributes.PRE);
  const thsMod = calcMod(activeChar.attributes.THS);

  const maxVp = (parseInt(activeChar.attributes.RES) || 10) + 8 + ((level - 1) * 2);
  const tp = Math.max(6, (potMod + ctrMod + level) * 2);
  const safeLimit = potMod + ctrMod + level;
  const wardRating = 10 + ctrMod;
  const guardRating = 10 + resMod;
  const maxRecoveryDice = Math.max(0, resMod + 2);
  const safePowerLevel = Math.max(1, level + Math.floor(potMod / 3));

  return (
    <div className="min-h-screen bg-[#1a1412] text-[#2c1e16] font-serif p-2 md:p-6 parchment-bg overflow-x-hidden flex">
      
      {/* MAIN BUILDER CONTENT */}
      <div className={`flex-1 transition-all duration-300 ${isDicePanelOpen ? 'mr-0 md:mr-80' : ''} max-w-6xl mx-auto space-y-6 relative`}>
        
        {/* Nav / Header */}
        <div className="flex justify-between items-center mb-4 text-[#f4ebd8]">
          <button onClick={() => setAppState('ROSTER')} className="flex items-center gap-2 hover:text-[#d4af37] transition-colors">
            <ChevronLeft size={20}/> Back to Roster
          </button>
          <div className="flex items-center gap-4">
            <span className="text-xs italic text-[#8b7355]">{saveStatus}</span>
            <button 
              onClick={() => setIsDicePanelOpen(!isDicePanelOpen)}
              className="flex items-center gap-2 bg-[#8b0000] hover:bg-[#a50000] text-white px-4 py-2 rounded-sm shadow-lg font-bold tracking-widest transition-colors"
            >
              <Dices size={18} /> DICE ROLLER
            </button>
          </div>
        </div>

        {/* Character Header Plate */}
        <header className="bg-[#fdf6e3] border-4 border-double border-[#4a3320] rounded-sm p-4 md:p-6 shadow-[0_10px_30px_rgba(0,0,0,0.5)] flex flex-col md:flex-row gap-6 items-center relative z-10">
          
          {/* Avatar Section */}
          <div className="relative group cursor-pointer w-24 h-24 md:w-32 md:h-32 rounded-full border-4 border-[#2c1e16] overflow-hidden flex-shrink-0 bg-[#e6d5b8]">
            {activeChar.avatarUrl ? (
              <img src={activeChar.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-[#8b7355]">
                <ImageIcon size={40} />
              </div>
            )}
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <input 
                type="text" 
                placeholder="Image URL" 
                className="w-[90%] bg-[#f4ebd8] text-[#2c1e16] text-xs p-1 text-center font-sans border border-[#4a3320]"
                value={activeChar.avatarUrl}
                onChange={(e) => updateChar('avatarUrl', e.target.value)}
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>

          <div className="flex-1 w-full space-y-3">
            <input 
              type="text" 
              placeholder="Character Name" 
              className="text-4xl md:text-5xl font-bold bg-transparent border-b-2 border-transparent focus:border-[#8b0000] focus:outline-none w-full placeholder-[#8b7355] text-[#2c1e16] uppercase tracking-wider"
              value={activeChar.name}
              onChange={(e) => updateChar('name', e.target.value)}
            />
            <div className="flex flex-wrap gap-4 text-sm font-bold text-[#4a3320]">
              <div className="flex items-center gap-2 border-b-2 border-[#8b7355]/30 pb-1">
                <span className="uppercase text-xs tracking-widest">Level</span>
                <input type="number" min="1" max="20" className="bg-transparent w-12 text-center text-[#8b0000] focus:outline-none" value={activeChar.level} onChange={(e) => updateChar('level', e.target.value)} />
              </div>
              <select 
                className="bg-transparent border-b-2 border-[#8b7355]/30 focus:border-[#8b0000] focus:outline-none pb-1 uppercase tracking-wider text-[#2c1e16] font-bold"
                value={activeChar.affinity} onChange={(e) => updateChar('affinity', e.target.value)}
              >
                <option value="">Select Affinity...</option>
                {settings.affinities.map(aff => <option key={aff} value={aff}>{aff}</option>)}
              </select>
              <input type="text" placeholder="Background" className="bg-transparent border-b-2 border-[#8b7355]/30 focus:border-[#8b0000] focus:outline-none pb-1 uppercase tracking-wider" value={activeChar.background} onChange={(e) => updateChar('background', e.target.value)} />
            </div>
          </div>

          <div className="flex gap-4 items-stretch w-full md:w-auto">
            {/* Health Widget */}
            <div className="bg-[#e6d5b8] border-2 border-[#4a3320] rounded-sm p-3 flex flex-col items-center justify-center min-w-[120px] shadow-inner relative overflow-hidden">
              <div className="absolute inset-0 opacity-10 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPgo8cmVjdCB3aWR0aD0iOCIgaGVpZ2h0PSI4IiBmaWxsPSIjZmZmIj48L3JlY3Q+CjxwYXRoIGQ9Ik0wIDBMOCA4Wk04IDBMMCA4WiIgc3Ryb2tlPSIjMDAwIiBzdHJva2Utd2lkdGg9IjEiPjwvcGF0aD4KPC9zdmc+')]"></div>
              <div className="flex items-center gap-1 text-[#8b0000] mb-1 z-10"><Heart size={18} fill="currentColor"/> <span className="text-xs font-bold uppercase tracking-widest">Vitality</span></div>
              <div className="flex items-baseline gap-1 z-10">
                <input type="number" className="bg-transparent text-3xl font-bold text-center w-16 text-[#2c1e16] focus:outline-none" value={activeChar.vpCurrent} onChange={(e) => updateChar('vpCurrent', parseInt(e.target.value) || 0)} />
                <span className="text-[#5c432d] font-bold">/ {maxVp}</span>
              </div>
            </div>

            {/* Tension Widget */}
            <div className={`bg-[#e6d5b8] border-2 rounded-sm p-3 flex flex-col items-center justify-center min-w-[120px] shadow-inner relative overflow-hidden transition-colors ${
              activeChar.tension > tp ? 'border-[#8b0000] bg-[#ffcccc]' : 
              activeChar.tension > safeLimit ? 'border-[#d4af37] bg-[#fff5cc]' : 
              'border-[#4a3320]'
            }`}>
              <div className={`flex items-center gap-1 mb-1 z-10 font-bold uppercase tracking-widest text-xs ${
                activeChar.tension > tp ? 'text-[#8b0000]' : activeChar.tension > safeLimit ? 'text-[#a67c00]' : 'text-[#4a3320]'
              }`}>
                <Zap size={18} fill="currentColor"/> Tension
              </div>
              <div className="flex items-baseline gap-1 z-10">
                <input type="number" className={`bg-transparent text-3xl font-bold text-center w-16 focus:outline-none ${
                  activeChar.tension > tp ? 'text-[#8b0000] animate-pulse' : activeChar.tension > safeLimit ? 'text-[#a67c00]' : 'text-[#2c1e16]'
                }`} value={activeChar.tension} onChange={(e) => updateChar('tension', parseInt(e.target.value) || 0)} />
              </div>
              <div className="text-[10px] text-[#5c432d] mt-1 font-bold">Safe: {safeLimit} | Max: {tp}</div>
            </div>
          </div>
        </header>

        {/* Tab Navigation */}
        <div className="flex overflow-x-auto space-x-1 mt-6 border-b-4 border-double border-[#4a3320] scrollbar-hide">
          {[
            { id: 'identity', label: 'Identity', icon: <Book size={16} /> },
            { id: 'stats', label: 'Stats & Skills', icon: <Crosshair size={16} /> },
            { id: 'magic', label: 'Magic & Weave', icon: <Flame size={16} /> },
            { id: 'gear', label: 'Gear & Feats', icon: <Backpack size={16} /> },
            { id: 'status', label: 'Status & Logs', icon: <ActivityIcon size={16} /> },
            { id: 'gm', label: 'Homebrew (GM)', icon: <Settings size={16} /> },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-6 py-3 rounded-t-sm transition-all font-bold tracking-widest uppercase text-sm border-2 border-b-0 whitespace-nowrap ${
                activeTab === tab.id 
                  ? 'bg-[#fdf6e3] border-[#4a3320] text-[#8b0000] -mb-[4px] pb-4' 
                  : 'bg-[#e6d5b8] border-transparent text-[#5c432d] hover:bg-[#fdf6e3] hover:text-[#2c1e16]'
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <main className="bg-[#fdf6e3] border-4 border-t-0 border-double border-[#4a3320] p-6 shadow-xl min-h-[60vh] relative">
          
          {/* TAB 1: IDENTITY */}
          {activeTab === 'identity' && (
            <div className="space-y-8 animate-in fade-in duration-500">
              <h2 className="text-2xl font-bold text-[#8b0000] border-b-2 border-[#8b7355]/30 pb-2 uppercase tracking-widest">Character Identity</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                <InputField label="Age" value={activeChar.age} onChange={(e) => updateChar('age', e.target.value)} />
                <InputField label="Guild Affiliation" value={activeChar.guild} onChange={(e) => updateChar('guild', e.target.value)} />
                <InputField label="Guild Rank" value={activeChar.guildRank} onChange={(e) => updateChar('guildRank', e.target.value)} />
                
                <div className="space-y-1 lg:col-span-3">
                  <label className="text-xs uppercase font-bold text-[#4a3320] tracking-widest">Primary Mode of Resonance</label>
                  <select 
                    className="w-full bg-transparent border-b-2 border-[#8b7355]/50 p-2 text-[#2c1e16] focus:border-[#8b0000] focus:outline-none font-bold"
                    value={activeChar.primaryMode} onChange={(e) => updateChar('primaryMode', e.target.value)}
                  >
                    <option value="">Select Mode...</option>
                    {MODES.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>

                <div className="space-y-1 lg:col-span-1">
                  <label className="text-xs uppercase font-bold text-[#4a3320] tracking-widest flex items-center justify-between">
                    Secondary Mode 
                    {level < 4 && <span className="text-[10px] text-[#8b0000]">(Unlocks Level 4)</span>}
                  </label>
                  <select 
                    disabled={level < 4}
                    className="w-full bg-transparent border-b-2 border-[#8b7355]/50 p-2 text-[#2c1e16] focus:border-[#8b0000] focus:outline-none font-bold disabled:opacity-50"
                    value={activeChar.secondaryMode} onChange={(e) => updateChar('secondaryMode', e.target.value)}
                  >
                    <option value="">Select Mode...</option>
                    {MODES.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>

                <div className="space-y-1 lg:col-span-1">
                  <label className="text-xs uppercase font-bold text-[#4a3320] tracking-widest flex items-center justify-between">
                    Tertiary Mode 
                    {level < 7 && <span className="text-[10px] text-[#8b0000]">(Unlocks Level 7)</span>}
                  </label>
                  <select 
                    disabled={level < 7}
                    className="w-full bg-transparent border-b-2 border-[#8b7355]/50 p-2 text-[#2c1e16] focus:border-[#8b0000] focus:outline-none font-bold disabled:opacity-50"
                    value={activeChar.tertiaryMode} onChange={(e) => updateChar('tertiaryMode', e.target.value)}
                  >
                    <option value="">Select Mode...</option>
                    {MODES.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: STATS & SKILLS */}
          {activeTab === 'stats' && (
            <div className="space-y-10 animate-in fade-in duration-500">
              <div className="flex items-center justify-between border-b-2 border-[#8b7355]/30 pb-2">
                <h2 className="text-2xl font-bold text-[#8b0000] uppercase tracking-widest">Attributes</h2>
                <div className="text-sm bg-[#e6d5b8] text-[#4a3320] px-4 py-1 border border-[#4a3320] font-bold tracking-widest shadow-sm">
                  Refinement Bonus (RB): <strong className="text-lg text-[#8b0000]">+{rb}</strong>
                </div>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
                {[
                  { id: 'POT', name: 'Potency', desc: 'Raw strength' },
                  { id: 'CTR', name: 'Control', desc: 'Precision & wards' },
                  { id: 'RES', name: 'Resilience', desc: 'Toughness' },
                  { id: 'ACU', name: 'Acuity', desc: 'Sharpness' },
                  { id: 'PRE', name: 'Presence', desc: 'Will & social' },
                  { id: 'THS', name: 'Thread Sense', desc: 'Perception' },
                ].map(attr => {
                  const mod = calcMod(activeChar.attributes[attr.id]);
                  return (
                    <div key={attr.id} className="bg-[#fdf6e3] border-2 border-[#4a3320] rounded-tl-xl rounded-br-xl p-3 flex flex-col items-center relative shadow-[4px_4px_0_rgba(74,51,32,0.1)] hover:-translate-y-1 hover:shadow-[6px_6px_0_rgba(139,0,0,0.2)] transition-all group">
                      <span className="text-[#8b0000] text-sm font-bold uppercase tracking-widest">{attr.id}</span>
                      <span className="text-[#5c432d] text-[10px] mb-2 text-center h-4 italic">{attr.desc}</span>
                      <input 
                        type="number" 
                        className="w-full text-center text-3xl font-bold bg-transparent focus:outline-none text-[#2c1e16]"
                        value={activeChar.attributes[attr.id]}
                        onChange={(e) => updateAttr(attr.id, e.target.value)}
                      />
                      <button 
                        onClick={() => rollDice(mod, `${attr.name} Check`)}
                        className="mt-2 bg-[#4a3320] text-[#f4ebd8] w-full text-center py-1 font-sans text-sm font-bold cursor-pointer hover:bg-[#8b0000] transition-colors"
                        title="Roll Check"
                      >
                        {mod >= 0 ? `+${mod}` : mod}
                      </button>
                    </div>
                  )
                })}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                {/* Derived Combat Stats */}
                <div className="space-y-6">
                  <h3 className="text-xl font-bold text-[#8b0000] border-b-2 border-[#8b7355]/30 pb-2 uppercase tracking-widest">Derived Defenses</h3>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="bg-[#fdf6e3] border-2 border-[#4a3320] p-6 flex flex-col items-center justify-center relative overflow-hidden shadow-md">
                      <div className="absolute opacity-5 text-[#8b7355] -right-4 -bottom-4"><Shield size={80}/></div>
                      <Shield className="text-[#4a3320] mb-2 z-10" size={32} />
                      <span className="text-4xl font-bold text-[#8b0000] z-10">{wardRating}</span>
                      <span className="text-xs text-[#5c432d] uppercase font-bold mt-1 tracking-widest z-10">Ward Rating</span>
                    </div>
                    <div className="bg-[#fdf6e3] border-2 border-[#4a3320] p-6 flex flex-col items-center justify-center relative overflow-hidden shadow-md">
                      <div className="absolute opacity-5 text-[#8b7355] -right-4 -bottom-4"><Shield size={80}/></div>
                      <Shield className="text-[#4a3320] mb-2 z-10" size={32} />
                      <span className="text-4xl font-bold text-[#8b0000] z-10">{guardRating}</span>
                      <span className="text-xs text-[#5c432d] uppercase font-bold mt-1 tracking-widest z-10">Guard Rating</span>
                    </div>
                  </div>
                </div>

                {/* Skills */}
                <div className="space-y-4">
                  <h3 className="text-xl font-bold text-[#8b0000] border-b-2 border-[#8b7355]/30 pb-2 flex justify-between uppercase tracking-widest">
                    <span>Skills</span>
                    <span className="text-xs text-[#5c432d] font-normal self-end italic normal-case">Check to Attune (+RB)</span>
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 max-h-[350px] overflow-y-auto pr-4 custom-scrollbar-light">
                    {SKILLS.map(skill => {
                      const isAttuned = activeChar.attunedSkills.includes(skill.name);
                      const baseMod = calcMod(activeChar.attributes[skill.attr]);
                      const total = baseMod + (isAttuned ? rb : 0);
                      
                      return (
                        <div key={skill.name} className="flex items-center justify-between border-b border-[#4a3320]/20 pb-1 group hover:bg-[#e6d5b8]/50 transition-colors">
                          <label className="flex items-center gap-2 cursor-pointer flex-1">
                            <input 
                              type="checkbox" 
                              checked={isAttuned}
                              onChange={() => toggleSkill(skill.name)}
                              className="w-4 h-4 rounded-none border-[#4a3320] text-[#8b0000] focus:ring-[#8b0000]"
                            />
                            <span className={`text-sm font-bold ${isAttuned ? 'text-[#8b0000]' : 'text-[#2c1e16]'}`}>{skill.name}</span>
                            <span className="text-[10px] text-[#5c432d] bg-[#e6d5b8] border border-[#4a3320]/30 px-1 ml-auto">{skill.attr}</span>
                          </label>
                          <button 
                            onClick={() => rollDice(total, skill.name)}
                            className={`font-sans text-sm font-bold ml-3 px-2 rounded-sm hover:bg-[#4a3320] hover:text-[#f4ebd8] transition-colors ${isAttuned ? 'text-[#8b0000]' : 'text-[#5c432d]'}`}
                            title="Roll Skill"
                          >
                            {total >= 0 ? `+${total}` : total}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: MAGIC & WEAVE */}
          {activeTab === 'magic' && (
            <div className="space-y-10 animate-in fade-in duration-500">
              
              {/* Magic HUD */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <StatCard title="Thread Pool" value={tp} desc={`Min 6 | POT+CTR+Lv ×2`} color="text-[#1e3a8a]" border="border-[#1e3a8a]" />
                <StatCard title="Safe Limit" value={safeLimit} desc={`POT + CTR + Lv`} color="text-[#b45309]" border="border-[#b45309]" />
                <StatCard title="Max Safe Power" value={`PL ${safePowerLevel}`} desc={`Lv + (POT/3)`} color="text-[#8b0000]" border="border-[#8b0000]" />
                <StatCard title="Spell Attack" value={`+${ctrMod}`} desc={`CTR Modifier`} color="text-[#4a3320]" border="border-[#4a3320]" onClick={() => rollDice(ctrMod, "Spell Attack")} hover="hover:bg-[#4a3320] hover:text-[#fdf6e3] cursor-pointer transition-colors" />
              </div>

              {/* Warning Context */}
              {activeChar.tension > safeLimit && (
                <div className="bg-[#fffbeb] border-l-4 border-[#f59e0b] text-[#92400e] p-4 flex items-start gap-3 shadow-md">
                  <AlertCircle className="shrink-0 mt-0.5 text-[#f59e0b]" size={20} />
                  <div className="text-sm">
                    <strong className="font-bold uppercase tracking-widest">Strain Warning:</strong> Your Tension ({activeChar.tension}) exceeds your Safe Limit ({safeLimit}). You must make a Strain Check (d20 + RES mod vs DC {10 + (activeChar.tension - safeLimit)}) at the start of your turn.
                    <button onClick={() => rollDice(resMod, "Strain Check")} className="ml-4 bg-[#f59e0b] text-white px-2 py-1 rounded-sm text-xs font-bold hover:bg-[#d97706] transition-colors">Roll Strain Check</button>
                  </div>
                </div>
              )}
              {activeChar.tension > tp && (
                <div className="bg-[#fef2f2] border-l-4 border-[#dc2626] text-[#991b1b] p-4 flex items-start gap-3 shadow-md animate-pulse">
                  <AlertCircle className="shrink-0 mt-0.5 text-[#dc2626]" size={20} />
                  <div className="text-sm">
                    <strong className="font-bold uppercase tracking-widest">Snapback Imminent:</strong> Your Tension ({activeChar.tension}) exceeds your Thread Pool ({tp})! Automatic Snapback.
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                {/* Strings */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center border-b-2 border-[#8b7355]/30 pb-2">
                    <h3 className="text-xl font-bold text-[#8b0000] uppercase tracking-widest">Known Strings</h3>
                    <button onClick={() => {
                      const newStrings = [...activeChar.strings, ''];
                      updateChar('strings', newStrings);
                    }} className="text-xs bg-[#4a3320] hover:bg-[#8b0000] px-3 py-1 text-white font-bold tracking-widest transition-colors shadow-sm">+ ADD</button>
                  </div>
                  <div className="space-y-3">
                    {activeChar.strings.map((str, idx) => (
                      <div key={idx} className="flex gap-2">
                        {/* If GM added custom strings, use a dropdown, otherwise text input */}
                        {settings.customStrings.length > 0 ? (
                          <select 
                            className="flex-1 bg-transparent border-b-2 border-[#8b7355]/50 p-2 text-[#2c1e16] focus:border-[#8b0000] focus:outline-none font-bold"
                            value={str} 
                            onChange={(e) => {
                              const newStrings = [...activeChar.strings];
                              newStrings[idx] = e.target.value;
                              updateChar('strings', newStrings);
                            }}
                          >
                            <option value="">Custom String...</option>
                            {settings.customStrings.map(cs => <option key={cs} value={cs}>{cs}</option>)}
                          </select>
                        ) : (
                          <input 
                            type="text" 
                            placeholder="e.g. The Heat String"
                            className="flex-1 bg-transparent border-b-2 border-[#8b7355]/50 p-2 text-[#2c1e16] focus:border-[#8b0000] focus:outline-none font-bold placeholder-[#8b7355]/50"
                            value={str} 
                            onChange={(e) => {
                              const newStrings = [...activeChar.strings];
                              newStrings[idx] = e.target.value;
                              updateChar('strings', newStrings);
                            }}
                          />
                        )}
                        <button onClick={() => {
                          const newStrings = activeChar.strings.filter((_, i) => i !== idx);
                          updateChar('strings', newStrings);
                        }} className="px-2 text-[#8b0000]/50 hover:text-[#8b0000] transition-colors"><X size={20}/></button>
                      </div>
                    ))}
                    {activeChar.strings.length === 0 && <p className="text-sm italic text-[#8b7355]">No strings unlocked. Click ADD to begin your weave.</p>}
                  </div>
                </div>

                {/* Techniques */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center border-b-2 border-[#8b7355]/30 pb-2">
                    <h3 className="text-xl font-bold text-[#8b0000] uppercase tracking-widest">Mode Techniques</h3>
                    <button onClick={() => {
                      const newTechs = [...activeChar.techniques, ''];
                      updateChar('techniques', newTechs);
                    }} className="text-xs bg-[#4a3320] hover:bg-[#8b0000] px-3 py-1 text-white font-bold tracking-widest transition-colors shadow-sm">+ ADD</button>
                  </div>
                  <div className="space-y-3">
                    {activeChar.techniques.map((tech, idx) => (
                      <div key={idx} className="flex gap-2">
                        <input 
                          type="text" 
                          placeholder="e.g. Groundbreaker (Striker)"
                          className="flex-1 bg-transparent border-b-2 border-[#8b7355]/50 p-2 text-[#2c1e16] focus:border-[#8b0000] focus:outline-none font-bold placeholder-[#8b7355]/50"
                          value={tech} 
                          onChange={(e) => {
                            const newTechs = [...activeChar.techniques];
                            newTechs[idx] = e.target.value;
                            updateChar('techniques', newTechs);
                          }}
                        />
                        <button onClick={() => {
                          const newTechs = activeChar.techniques.filter((_, i) => i !== idx);
                          updateChar('techniques', newTechs);
                        }} className="px-2 text-[#8b0000]/50 hover:text-[#8b0000] transition-colors"><X size={20}/></button>
                      </div>
                    ))}
                    {activeChar.techniques.length === 0 && <p className="text-sm italic text-[#8b7355]">No techniques mastered. Study the Weave.</p>}
                  </div>
                </div>
              </div>

              {/* Signature */}
              <div className="space-y-2 mt-8">
                <label className="text-xl font-bold text-[#8b0000] border-b-2 border-[#8b7355]/30 pb-2 block uppercase tracking-widest">Magical Signature</label>
                <p className="text-xs text-[#5c432d] italic mb-2">Describe the visual and auditory manifestation of your magic. Cannot be hidden without suppression techniques.</p>
                <textarea 
                  rows="3" 
                  className="w-full bg-[#f4ebd8] border-2 border-[#4a3320] p-4 text-sm text-[#2c1e16] focus:border-[#8b0000] focus:outline-none resize-y shadow-inner font-sans"
                  placeholder="e.g. Visual: Geometric amber patterns. Auditory: A low hum matching my heartbeat."
                  value={activeChar.signature}
                  onChange={(e) => updateChar('signature', e.target.value)}
                ></textarea>
              </div>

            </div>
          )}

          {/* TAB 4: GEAR & FEATS */}
          {activeTab === 'gear' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 animate-in fade-in duration-500">
              
              {/* Feats */}
              <div className="space-y-6">
                <h3 className="text-2xl font-bold text-[#8b0000] border-b-2 border-[#8b7355]/30 pb-2 flex items-center gap-3 uppercase tracking-widest">
                  <Sword size={24} /> Feats
                </h3>
                <p className="text-xs text-[#5c432d] mb-4 italic">Unlocked at even levels. Select Core Choices (ASI, Attunement, Expertise) or specific Feats from the tome.</p>
                <div className="space-y-4">
                  {[2, 4, 6, 8, 10].map(lvl => (
                    <div key={lvl} className={`flex flex-col gap-2 p-4 border-2 shadow-sm ${level >= lvl ? 'bg-[#f4ebd8] border-[#4a3320]' : 'bg-[#e6d5b8]/50 border-[#8b7355]/30 opacity-70'}`}>
                      <label className="text-xs uppercase font-bold text-[#8b0000] tracking-widest flex justify-between border-b border-[#8b7355]/30 pb-1">
                        Level {lvl} Slot
                        {level < lvl && <span className="text-[10px] text-[#4a3320] flex items-center gap-1 italic">Locked</span>}
                      </label>
                      <input 
                        type="text" 
                        disabled={level < lvl}
                        placeholder={level >= lvl ? "Inscribe Feat Name..." : "Requires higher level"}
                        className="bg-transparent text-[#2c1e16] focus:outline-none font-bold placeholder-[#8b7355]/60 disabled:cursor-not-allowed"
                        value={activeChar.feats[lvl] || ''}
                        onChange={(e) => {
                          const newFeats = { ...activeChar.feats, [lvl]: e.target.value };
                          updateChar('feats', newFeats);
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Equipment */}
              <div className="space-y-6 flex flex-col h-full">
                <h3 className="text-2xl font-bold text-[#8b0000] border-b-2 border-[#8b7355]/30 pb-2 flex items-center gap-3 uppercase tracking-widest">
                  <Backpack size={24} /> Inventory
                </h3>
                <div className="bg-[#fdf6e3] p-4 text-xs text-[#5c432d] border-l-4 border-[#4a3320] italic shadow-sm">
                  <p><strong>Casting Gloves Warning:</strong> Standard warded gloves reduce Snapback damage by 1d4 but impose Discord on Thread Sense checks.</p>
                </div>
                <textarea 
                  className="flex-1 w-full min-h-[400px] bg-[#f4ebd8] border-2 border-[#4a3320] p-4 text-sm text-[#2c1e16] focus:border-[#8b0000] focus:outline-none resize-none shadow-inner custom-scrollbar-light font-sans leading-relaxed"
                  placeholder="Inscribe your Weapons, Armor, Talismans, and Consumables here..."
                  value={activeChar.equipment}
                  onChange={(e) => updateChar('equipment', e.target.value)}
                ></textarea>
              </div>

            </div>
          )}

          {/* TAB 5: STATUS & TRACKERS */}
          {activeTab === 'status' && (
            <div className="space-y-10 animate-in fade-in duration-500">
              
              {/* Rest Buttons */}
              <div className="flex flex-wrap gap-6 bg-[#f4ebd8] p-6 border-2 border-[#4a3320] shadow-md justify-center md:justify-start">
                <button 
                  onClick={doMend}
                  className="flex items-center gap-2 bg-[#fdf6e3] hover:bg-[#e6d5b8] text-[#2c1e16] px-6 py-3 border-2 border-[#4a3320] font-bold tracking-widest uppercase text-sm shadow-[4px_4px_0_rgba(74,51,32,0.2)] hover:translate-y-1 hover:shadow-[2px_2px_0_rgba(74,51,32,0.2)] transition-all"
                >
                  <RefreshCw size={18} className="text-[#8b0000]" /> Mend (10 Min)
                </button>
                <button 
                  onClick={doLongRest}
                  className="flex items-center gap-2 bg-[#2c1e16] hover:bg-[#4a3320] text-[#f4ebd8] px-6 py-3 border-2 border-[#1a1412] font-bold tracking-widest uppercase text-sm shadow-[4px_4px_0_rgba(26,20,18,0.5)] hover:translate-y-1 hover:shadow-[2px_2px_0_rgba(26,20,18,0.5)] transition-all"
                >
                  <Moon size={18} className="text-[#d4af37]" /> Full Recovery (8 Hrs)
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                {/* Visual Trackers */}
                <div className="bg-[#fdf6e3] border-2 border-[#4a3320] p-8 space-y-10 flex flex-col justify-center items-center shadow-md">
                  <Tracker max={6} current={activeChar.burnout} onChange={(v) => updateChar('burnout', v)} color="bg-[#d97706] border-[#b45309]" emptyBorder="border-[#b45309]" label="Burnout" />
                  <Tracker max={6} current={activeChar.fatigue} onChange={(v) => updateChar('fatigue', v)} color="bg-[#475569] border-[#334155]" emptyBorder="border-[#334155]" label="Fatigue" />
                  <div className="pt-6 border-t border-[#8b7355]/30 w-full flex justify-center">
                    <Tracker max={10} current={activeChar.corruption} onChange={(v) => updateChar('corruption', v)} color="bg-[#701a75] border-[#4a044e]" emptyBorder="border-[#4a044e]" label="Corruption (Hollowing)" />
                  </div>
                </div>

                {/* HP & Recovery */}
                <div className="bg-[#fdf6e3] border-2 border-[#4a3320] p-8 space-y-8 shadow-md">
                  <div>
                    <label className="text-sm uppercase font-bold text-[#8b0000] tracking-widest block mb-4 border-b border-[#8b7355]/30 pb-2">Recovery Dice</label>
                    <div className="flex items-center gap-4">
                      <input 
                        type="number" 
                        className="bg-[#f4ebd8] border-2 border-[#4a3320] p-2 text-center text-3xl font-bold text-[#8b0000] focus:outline-none w-24 shadow-inner"
                        value={activeChar.recoveryDiceCurrent}
                        onChange={(e) => updateChar('recoveryDiceCurrent', parseInt(e.target.value) || 0)}
                      />
                      <span className="text-[#5c432d] font-bold">/ {maxRecoveryDice} Total<br/><span className="text-xs italic font-normal">(1d6 + RES)</span></span>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm uppercase font-bold text-[#8b0000] tracking-widest block mb-4 border-b border-[#8b7355]/30 pb-2">Quick VP Adjust</label>
                    <div className="flex gap-4">
                      <button onClick={() => updateChar('vpCurrent', Math.max(0, activeChar.vpCurrent - 1))} className="flex-1 bg-[#fee2e2] hover:bg-[#fecaca] text-[#991b1b] py-3 border-2 border-[#991b1b] font-bold tracking-widest uppercase transition-colors shadow-sm">-1 Harm</button>
                      <button onClick={() => updateChar('vpCurrent', Math.min(maxVp, activeChar.vpCurrent + 1))} className="flex-1 bg-[#ecfdf5] hover:bg-[#d1fae5] text-[#065f46] py-3 border-2 border-[#065f46] font-bold tracking-widest uppercase transition-colors shadow-sm">+1 Heal</button>
                    </div>
                  </div>
                </div>

                {/* Wounds & Notes */}
                <div className="bg-[#fdf6e3] border-2 border-[#4a3320] shadow-md flex flex-col">
                  <div className="p-4 border-b-2 border-[#4a3320] bg-[#e6d5b8]">
                    <h3 className="text-sm font-bold text-[#8b0000] uppercase tracking-widest">Wounds & Conditions</h3>
                  </div>
                  <textarea 
                    className="w-full flex-1 bg-transparent p-6 text-sm text-[#2c1e16] focus:outline-none resize-none custom-scrollbar-light font-sans leading-relaxed"
                    placeholder="List active wounds, permanent injuries, and conditions (e.g. Shaking Hands, Prone, Burned)..."
                    value={activeChar.woundsNotes}
                    onChange={(e) => updateChar('woundsNotes', e.target.value)}
                  ></textarea>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: GM SETTINGS (HOMEBREW) */}
          {activeTab === 'gm' && (
            <div className="space-y-10 animate-in fade-in duration-500 max-w-3xl">
              <h2 className="text-2xl font-bold text-[#8b0000] border-b-2 border-[#8b7355]/30 pb-2 uppercase tracking-widest">Homebrew Settings (GM)</h2>
              <p className="text-sm text-[#5c432d] italic mb-6">Modify these to add custom Affinities and Strings to your campaign. Changes here affect the dropdowns in the Identity and Magic tabs for all your characters.</p>
              
              <div className="bg-[#fdf6e3] border-2 border-[#4a3320] p-6 shadow-md space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-[#4a3320] mb-2 uppercase tracking-widest">Custom Affinities</h3>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {settings.affinities.map((aff, i) => (
                      <span key={i} className="bg-[#e6d5b8] border border-[#8b7355] text-[#2c1e16] px-3 py-1 text-sm font-bold flex items-center gap-2 shadow-sm">
                        {aff}
                        <button onClick={() => {
                          const newAffs = settings.affinities.filter((_, idx) => idx !== i);
                          setSettings(prev => ({...prev, affinities: newAffs}));
                          setDoc(doc(db, 'artifacts', appId, 'users', authUser.uid, 'settings', 'gm'), { ...settings, affinities: newAffs });
                        }} className="text-[#8b0000] hover:text-red-600"><X size={14}/></button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input type="text" id="newAff" placeholder="New Affinity..." className="border-b-2 border-[#8b7355]/50 bg-transparent p-2 flex-1 focus:border-[#8b0000] focus:outline-none text-[#2c1e16] font-bold" />
                    <button onClick={() => {
                      const input = document.getElementById('newAff');
                      if(input.value) {
                        const newAffs = [...settings.affinities, input.value];
                        setSettings(prev => ({...prev, affinities: newAffs}));
                        setDoc(doc(db, 'artifacts', appId, 'users', authUser.uid, 'settings', 'gm'), { ...settings, affinities: newAffs });
                        input.value = '';
                      }
                    }} className="bg-[#4a3320] text-white px-4 py-2 font-bold tracking-widest hover:bg-[#8b0000] transition-colors">ADD</button>
                  </div>
                </div>

                <div className="border-t-2 border-[#8b7355]/30 pt-6">
                  <h3 className="text-lg font-bold text-[#4a3320] mb-2 uppercase tracking-widest">Custom Strings</h3>
                  <p className="text-xs text-[#5c432d] italic mb-4">Add specific strings that players can select in the Magic tab instead of typing freely.</p>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {settings.customStrings.map((str, i) => (
                      <span key={i} className="bg-[#e6d5b8] border border-[#8b7355] text-[#2c1e16] px-3 py-1 text-sm font-bold flex items-center gap-2 shadow-sm">
                        {str}
                        <button onClick={() => {
                          const newStrs = settings.customStrings.filter((_, idx) => idx !== i);
                          setSettings(prev => ({...prev, customStrings: newStrs}));
                          setDoc(doc(db, 'artifacts', appId, 'users', authUser.uid, 'settings', 'gm'), { ...settings, customStrings: newStrs });
                        }} className="text-[#8b0000] hover:text-red-600"><X size={14}/></button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input type="text" id="newStr" placeholder="New String..." className="border-b-2 border-[#8b7355]/50 bg-transparent p-2 flex-1 focus:border-[#8b0000] focus:outline-none text-[#2c1e16] font-bold" />
                    <button onClick={() => {
                      const input = document.getElementById('newStr');
                      if(input.value) {
                        const newStrs = [...settings.customStrings, input.value];
                        setSettings(prev => ({...prev, customStrings: newStrs}));
                        setDoc(doc(db, 'artifacts', appId, 'users', authUser.uid, 'settings', 'gm'), { ...settings, customStrings: newStrs });
                        input.value = '';
                      }
                    }} className="bg-[#4a3320] text-white px-4 py-2 font-bold tracking-widest hover:bg-[#8b0000] transition-colors">ADD</button>
                  </div>
                </div>
              </div>
            </div>
          )}

        </main>
      </div>

      {/* DICE ROLLER SIDE PANEL */}
      <div className={`fixed top-0 right-0 h-full w-full md:w-80 bg-[#1a1412] border-l-4 border-double border-[#4a3320] shadow-[-10px_0_30px_rgba(0,0,0,0.8)] transition-transform duration-300 z-50 flex flex-col ${isDicePanelOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="p-4 border-b-2 border-[#4a3320] flex justify-between items-center bg-[#2c1e16]">
          <h3 className="text-[#d4af37] font-bold tracking-widest flex items-center gap-2 uppercase">
            <Dices size={20}/> Dice Roller
          </h3>
          <button onClick={() => setIsDicePanelOpen(false)} className="text-[#8b7355] hover:text-white transition-colors">
            <X size={24}/>
          </button>
        </div>

        <div className="p-6 flex flex-col items-center border-b border-[#4a3320]/50 bg-[#1f1816]">
          {/* Animated 3D CSS Dice Area */}
          <div className="w-32 h-32 relative mb-6 perspective-[1000px] flex items-center justify-center">
            {isRolling ? (
              <div className="w-20 h-20 bg-[#8b0000] animate-[spin_0.5s_linear_infinite] rounded-lg shadow-[0_0_30px_rgba(139,0,0,0.8)] flex items-center justify-center border-2 border-[#d4af37]">
                <span className="text-4xl text-white font-bold opacity-50 blur-[1px]">?</span>
              </div>
            ) : currentRoll ? (
              <div className={`w-24 h-24 flex items-center justify-center rounded-lg shadow-[0_0_40px_rgba(212,175,55,0.4)] border-4 transition-all duration-300 scale-110 ${currentRoll.isCrit ? 'bg-[#d4af37] border-white' : currentRoll.isFail ? 'bg-[#4a0000] border-[#8b0000]' : 'bg-[#2c1e16] border-[#d4af37]'}`}>
                <span className={`text-5xl font-bold ${currentRoll.isCrit ? 'text-[#2c1e16]' : 'text-[#f4ebd8]'}`}>{currentRoll.roll}</span>
              </div>
            ) : (
              <div className="w-20 h-20 bg-[#2c1e16] rounded-lg border-2 border-[#4a3320] flex items-center justify-center cursor-pointer hover:border-[#d4af37] hover:shadow-[0_0_15px_rgba(212,175,55,0.3)] transition-all" onClick={() => rollDice()}>
                <span className="text-3xl text-[#8b7355] font-bold">20</span>
              </div>
            )}
          </div>
          
          {currentRoll && !isRolling && (
            <div className="text-center animate-in slide-in-from-bottom-2 fade-in">
              <div className="text-[#8b7355] text-sm uppercase tracking-widest mb-1">{currentRoll.label}</div>
              <div className="text-3xl font-bold text-[#f4ebd8]">
                {currentRoll.roll} <span className="text-xl text-[#8b7355] font-normal">{currentRoll.mod >= 0 ? `+${currentRoll.mod}` : currentRoll.mod}</span> = <span className={currentRoll.isCrit ? 'text-[#d4af37]' : currentRoll.isFail ? 'text-red-500' : 'text-white'}>{currentRoll.total}</span>
              </div>
              {currentRoll.isCrit && <div className="text-[#d4af37] font-bold uppercase tracking-widest text-sm mt-2 animate-pulse">Thread Break!</div>}
              {currentRoll.isFail && <div className="text-red-500 font-bold uppercase tracking-widest text-sm mt-2 animate-pulse">Misfire!</div>}
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar-dark bg-[#1a1412]">
          <h4 className="text-[#5c432d] text-xs font-bold uppercase tracking-widest mb-4 border-b border-[#4a3320] pb-2">History Log</h4>
          <div className="space-y-3">
            {diceHistory.map((h, i) => (
              <div key={h.id} className={`p-3 border-l-4 bg-[#2c1e16]/50 rounded-r-md flex justify-between items-center ${h.isCrit ? 'border-[#d4af37]' : h.isFail ? 'border-red-600' : 'border-[#4a3320]'}`}>
                <div>
                  <div className="text-[#d4af37] font-bold text-lg">{h.total}</div>
                  <div className="text-[#8b7355] text-xs italic">{h.label}</div>
                </div>
                <div className="text-right text-xs text-[#8b7355] font-mono">
                  {h.roll} {h.mod >= 0 ? `+${h.mod}` : h.mod}
                </div>
              </div>
            ))}
            {diceHistory.length === 0 && <p className="text-[#5c432d] text-sm italic text-center mt-8">Silence in the Weave.</p>}
          </div>
        </div>
        <div className="p-4 bg-[#2c1e16] border-t border-[#4a3320]">
          <button onClick={() => rollDice()} className="w-full bg-[#8b0000] hover:bg-[#a50000] text-white py-3 font-bold tracking-widest uppercase transition-colors shadow-lg">
            Free Roll (d20)
          </button>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        .parchment-bg {
          background-color: #1a1412;
          background-image: radial-gradient(circle at center, #2c1e16 0%, #1a1412 100%);
        }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        
        /* Light Parchment Scrollbar */
        .custom-scrollbar-light::-webkit-scrollbar { width: 8px; }
        .custom-scrollbar-light::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar-light::-webkit-scrollbar-thumb { background: rgba(74, 51, 32, 0.3); border-radius: 4px; border: 1px solid rgba(244, 235, 216, 0.5); }
        .custom-scrollbar-light::-webkit-scrollbar-thumb:hover { background: rgba(74, 51, 32, 0.5); }
        
        /* Dark Panel Scrollbar */
        .custom-scrollbar-dark::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar-dark::-webkit-scrollbar-track { background: #1a1412; }
        .custom-scrollbar-dark::-webkit-scrollbar-thumb { background: #4a3320; border-radius: 4px; }
        .custom-scrollbar-dark::-webkit-scrollbar-thumb:hover { background: #5c432d; }
      `}} />
    </div>
  );
}

// --- SUBCOMPONENTS ---
function InputField({ label, value, onChange }) {
  return (
    <div className="flex flex-col space-y-1">
      <label className="text-xs uppercase font-bold text-[#4a3320] tracking-widest">{label}</label>
      <input 
        type="text" 
        className="bg-transparent border-b-2 border-[#8b7355]/50 p-2 text-[#2c1e16] focus:border-[#8b0000] focus:outline-none transition-colors font-bold"
        value={value} 
        onChange={onChange} 
      />
    </div>
  );
}

function StatCard({ title, value, desc, color, border, onClick, hover = '' }) {
  return (
    <div className={`flex flex-col items-center p-4 border-2 ${border} bg-[#fdf6e3] shadow-[4px_4px_0_rgba(0,0,0,0.1)] relative overflow-hidden ${hover}`} onClick={onClick}>
      <div className={`absolute top-0 left-0 w-full h-1 ${color.replace('text-', 'bg-')}`}></div>
      <span className="text-[10px] text-[#5c432d] font-bold uppercase tracking-widest mb-1">{title}</span>
      <span className={`text-3xl font-bold ${color}`}>{value}</span>
      <span className="text-[9px] text-[#8b7355] mt-2 text-center leading-tight uppercase font-bold italic">{desc}</span>
    </div>
  );
}

function Tracker({ max, current, onChange, color, emptyBorder, label }) {
  return (
    <div className="flex flex-col items-center">
      <span className="text-sm text-[#4a3320] mb-2 uppercase font-bold tracking-widest">{label}</span>
      <div className="flex space-x-2">
        {[...Array(max)].map((_, i) => (
          <button
            key={i}
            onClick={() => onChange(i + 1 === current ? i : i + 1)}
            className={`w-6 h-6 rounded-full border-2 transition-all shadow-inner ${
              i < current ? `${color} shadow-black/50` : `bg-[#e6d5b8] ${emptyBorder}`
            }`}
          />
        ))}
      </div>
    </div>
  );
}

function ActivityIcon(props) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
    </svg>
  );
}