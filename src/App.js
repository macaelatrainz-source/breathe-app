import React, { useState, useEffect } from 'react';
import { 
  Calendar, Activity, Video, MessageSquare, User, ChevronRight, 
  Star, CheckCircle, Play, Dumbbell, Heart, Plus, Save, ArrowLeft, 
  Users, Settings, LogOut, Loader, AlertCircle, RefreshCw, MapPin,
  ClipboardList, History, TrendingUp, CheckSquare
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, signInAnonymously, signInWithCustomToken } from 'firebase/auth';
import { getFirestore, collection, doc, setDoc, updateDoc, onSnapshot } from 'firebase/firestore';

// --- FIREBASE CONFIGURATION ---
const firebaseConfig = {
  apiKey: "AIzaSyDFQBvgGXfNX5DEsW5tq8YV8_w3hBBxaOQ",             
  authDomain: "breathe-to-move-697c0.firebaseapp.com",   
  projectId: "breathe-to-move-697c0",          
  storageBucket: "breathe-to-move-697c0.firebasestorage.app",     
  messagingSenderId: "871044952745", 
  appId: "871044952745"             
};

// --- APP INITIALIZATION ---
let auth, db, CLIENTS_COLLECTION;
// This handles the switch between the Chat Preview (here) and your Live Site (Vercel)
try {
  // 1. Try to use keys if you pasted them above (Production Mode)
  if (firebaseConfig.apiKey) {
    const app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    // Note: In production, use 'clients' collection. 
    // You can remove 'artifacts/appId/public/data' structure if you want a simpler DB, 
    // but this path works fine.
    CLIENTS_COLLECTION = collection(db, 'clients'); 
  } 
  // 2. Fallback to Chat Preview Mode (Development Mode)
  else if (typeof __firebase_config !== 'undefined') {
    const app = initializeApp(JSON.parse(__firebase_config));
    auth = getAuth(app);
    db = getFirestore(app);
    const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
    CLIENTS_COLLECTION = collection(db, 'artifacts', appId, 'public', 'data', 'clients');
  }
} catch (e) {
  console.error("Firebase Setup Error. Did you paste your config keys?", e);
}

// --- CONSTANTS ---
const COACH_EMAIL = "mac@breathe.com";
const INITIAL_EXERCISES = [
  { id: 1, name: "Goblet Squat", category: "Legs", inProgram: true },
  { id: 2, name: "Push Up", category: "Upper Body", inProgram: true },
  { id: 3, name: "Deadbug", category: "Core", inProgram: true },
  { id: 4, name: "Cat-Cow Stretch", category: "Mobility", inProgram: false },
  { id: 5, name: "Lateral Lunge", category: "Legs", inProgram: false },
  { id: 6, name: "Face Pulls", category: "Upper Body", inProgram: false },
  { id: 7, name: "Thoracic Rotation", category: "Mobility", inProgram: false },
  { id: 8, name: "Single Leg RDL", category: "Legs", inProgram: true },
];

// --- COMPONENTS ---

const BodyMap = ({ issues = [], onClick, isEditing }) => (
  <div className="relative w-48 h-80 mx-auto bg-slate-100 rounded-xl border border-slate-200 shadow-inner flex items-center justify-center overflow-hidden">
    <svg viewBox="0 0 100 200" className="h-full w-full text-slate-300 fill-current opacity-50 pointer-events-none">
      <circle cx="50" cy="20" r="12" />
      <path d="M40,35 Q20,40 15,60 L10,100 L20,105 L25,70 L35,80 L35,130 L25,180 L35,190 L45,140 L50,130 L55,140 L65,190 L75,180 L65,130 L65,80 L75,70 L80,105 L90,100 L85,60 Q80,40 60,35 Z" />
    </svg>
    {isEditing && (
      <div className="absolute inset-0 z-0 cursor-crosshair" onClick={(e) => {
        const rect = e.target.getBoundingClientRect();
        onClick(((e.clientX - rect.left) / rect.width) * 100, ((e.clientY - rect.top) / rect.height) * 100);
      }} />
    )}
    {issues.map((issue, idx) => (
      <div key={idx} className="absolute group cursor-pointer z-10" style={{ top: `${issue.y}%`, left: `${issue.x}%` }}>
        <div className="w-4 h-4 -ml-2 -mt-2 bg-red-500/50 rounded-full animate-pulse absolute pointer-events-none" />
        <div className="w-2 h-2 -ml-1 -mt-1 bg-red-600 rounded-full border border-white relative" />
        <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-32 bg-slate-800 text-white text-xs p-2 rounded hidden group-hover:block z-50 text-center shadow-lg pointer-events-none">
          <strong>{issue.area}</strong><div className="text-slate-300 mt-1">{issue.status}</div>
        </div>
      </div>
    ))}
  </div>
);

// --- MAIN APP ---

export default function BreatheToMoveApp() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [appMode, setAppMode] = useState('login'); // 'login', 'coach', 'client'
  const [clients, setClients] = useState([]);
  const [currentClient, setCurrentClient] = useState(null);
  const [error, setError] = useState("");

  // Init Auth
  useEffect(() => {
    if (!auth) { setLoading(false); setError("Database Error: Config missing"); return; }
    const init = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) await signInWithCustomToken(auth, __initial_auth_token);
        else await signInAnonymously(auth);
      } catch(e) { console.error(e); setError("Auth Error"); setLoading(false); }
    };
    init();
    return onAuthStateChanged(auth, u => { setUser(u); setLoading(false); });
  }, []);

  // Sync Clients
  useEffect(() => {
    if (!user || !CLIENTS_COLLECTION) return;
    const unsub = onSnapshot(CLIENTS_COLLECTION, snap => {
      const list = snap.docs.map(d => ({id: d.id, ...d.data()}));
      setClients(list);
      if (currentClient) {
        const updated = list.find(c => c.id === currentClient.id);
        if (updated) setCurrentClient(updated);
      }
    });
    return () => unsub();
  }, [user, currentClient?.id]);

  // Views
  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><Loader className="animate-spin text-teal-600" /></div>;
  if (appMode === 'login') return <LoginView setError={setError} error={error} setAppMode={setAppMode} setClient={setCurrentClient} clients={clients} />;
  if (appMode === 'coach') return <CoachView clients={clients} setAppMode={setAppMode} setClient={setCurrentClient} />;
  if (appMode === 'client') return <ClientView client={currentClient} setAppMode={setAppMode} />;
  
  return <div className="p-10 text-center">App Error. <button onClick={() => window.location.reload()}>Reload</button></div>;
}

// --- SUB-VIEWS ---

function LoginView({ setError, error, setAppMode, setClient, clients }) {
  const [email, setEmail] = useState("");

  const handleLogin = (e) => {
    e.preventDefault();
    const cleanEmail = email.toLowerCase().trim();
    if (cleanEmail === COACH_EMAIL) {
      setAppMode('coach');
    } else {
      const found = clients.find(c => c.email === cleanEmail);
      if (found) {
        setClient(found);
        setAppMode('client');
      } else {
        setError("User not found. Ask Coach Mac to create your profile.");
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="bg-gradient-to-br from-teal-600 to-teal-800 p-8 text-center">
          <div className="w-24 h-24 bg-white rounded-full mx-auto mb-4 flex items-center justify-center p-1 shadow-lg overflow-hidden relative">
             <div className="absolute inset-0 flex items-center justify-center text-teal-600 font-bold text-2xl">BM</div>
             <img 
               src="btm%20logo.jpg" 
               alt="Breathe to Move Logo" 
               className="w-full h-full object-contain relative z-10 bg-white" 
               onError={(e) => e.target.style.display='none'} 
             />
          </div>
          <h1 className="text-2xl font-bold text-white">Breathe to Move</h1>
          <p className="text-teal-100 text-sm mt-2">Macaela Henning | Exercise Specialist</p>
        </div>
        <div className="p-8">
          <form onSubmit={handleLogin} className="space-y-4">
            <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="Enter Email" className="w-full p-3 bg-slate-50 border rounded-xl" />
            {error && <div className="text-red-500 text-sm bg-red-50 p-2 rounded flex items-center gap-2"><AlertCircle size={14}/>{error}</div>}
            <button type="submit" className="w-full p-4 bg-teal-600 text-white font-bold rounded-xl hover:bg-teal-700 flex items-center justify-center gap-2">Enter App <ChevronRight size={18}/></button>
          </form>
          <p className="text-center text-xs text-slate-400 mt-6">Coach: {COACH_EMAIL}</p>
        </div>
      </div>
    </div>
  );
}

function CoachView({ clients, setAppMode, setClient }) {
  const [view, setView] = useState('list'); // 'list', 'edit'
  const [activeClient, setActiveClient] = useState(null);
  const [activeTab, setActiveTab] = useState('current'); // 'current', 'past', 'tests'
  
  // Create Client State
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");

  // Program Builder State
  const [progName, setProgName] = useState("");
  const [progDetails, setProgDetails] = useState("");
  const [progFocus, setProgFocus] = useState("");
  const [scheduleDays, setScheduleDays] = useState({ 
    Mon: false, Tue: false, Wed: false, Thu: false, Fri: false, Sat: false, Sun: false 
  });
  
  // Assessment State
  const [marker, setMarker] = useState(null);
  const [issueArea, setIssueArea] = useState("");
  const [issueStatus, setIssueStatus] = useState("");

  // Test Results State
  const [testDate, setTestDate] = useState(new Date().toISOString().split('T')[0]);
  const [testName, setTestName] = useState("");
  const [testResult, setTestResult] = useState("");

  const createClient = async () => {
    if (!newName || !newEmail) return;
    const emailKey = newEmail.toLowerCase().trim();
    if (clients.some(c => c.email === emailKey)) return alert("Exists");
    
    await setDoc(doc(CLIENTS_COLLECTION, emailKey), {
      name: newName, 
      email: emailKey, 
      calendar: {}, 
      assessments: { posture: [] },
      programsHistory: [],
      testResults: []
    });
    setNewName(""); setNewEmail("");
  };

  const assignProgram = async () => {
    if (!activeClient || !progName || !progDetails) return;
    
    const newCalendar = { ...activeClient.calendar };
    
    const dayMap = {
      Sun: [1, 8, 15, 22, 29],
      Mon: [2, 9, 16, 23, 30],
      Tue: [3, 10, 17, 24],
      Wed: [4, 11, 18, 25],
      Thu: [5, 12, 19, 26],
      Fri: [6, 13, 20, 27],
      Sat: [7, 14, 21, 28]
    };

    Object.keys(scheduleDays).forEach(day => {
      if (scheduleDays[day]) {
        dayMap[day].forEach(dateNum => {
          if (dateNum <= 30) {
            newCalendar[dateNum] = {
              type: "Workout",
              title: progName,
              details: `${progDetails}\n\nFocus: ${progFocus}`
            };
          }
        });
      }
    });

    const newProgramRecord = {
      id: Date.now(),
      name: progName,
      details: progDetails,
      assignedDate: new Date().toISOString().split('T')[0],
      focus: progFocus
    };
    
    const updatedHistory = [newProgramRecord, ...(activeClient.programsHistory || [])];

    await updateDoc(doc(CLIENTS_COLLECTION, activeClient.id), { 
      calendar: newCalendar,
      programsHistory: updatedHistory
    });

    setProgName("");
    setProgDetails("");
    setProgFocus("");
    setScheduleDays({ Mon: false, Tue: false, Wed: false, Thu: false, Fri: false, Sat: false, Sun: false });
    alert("Program Assigned & Calendar Updated!");
  };

  const saveAssessment = async () => {
    if (!marker || !activeClient) return;
    const updated = [...(activeClient.assessments?.posture || []), { x: marker.x, y: marker.y, area: issueArea, status: issueStatus }];
    await updateDoc(doc(CLIENTS_COLLECTION, activeClient.id), { assessments: { ...activeClient.assessments, posture: updated }});
    setMarker(null); setIssueArea(""); setIssueStatus("");
  };

  const saveTestResult = async () => {
    if (!testName || !testResult || !activeClient) return;
    const newResult = {
      id: Date.now(),
      date: testDate,
      name: testName,
      result: testResult
    };
    const updatedResults = [newResult, ...(activeClient.testResults || [])];
    await updateDoc(doc(CLIENTS_COLLECTION, activeClient.id), { testResults: updatedResults });
    setTestName(""); setTestResult("");
  };

  if (view === 'edit' && activeClient) {
    return (
      <div className="min-h-screen bg-slate-50 p-4">
        <div className="max-w-md mx-auto bg-white rounded-xl shadow-lg overflow-hidden flex flex-col min-h-[90vh]">
          {/* Header */}
          <div className="bg-slate-900 text-white p-4 flex justify-between items-center shrink-0">
            <button onClick={() => setView('list')} className="flex items-center gap-2 text-sm text-slate-300 hover:text-white"><ArrowLeft size={16}/> Back</button>
            <div className="flex items-center gap-3">
              <span className="font-bold">{activeClient.name}</span>
              <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold border border-slate-600">
                {activeClient.name.substring(0,2).toUpperCase()}
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-slate-200">
            <button onClick={() => setActiveTab('current')} className={`flex-1 py-3 text-sm font-bold border-b-2 ${activeTab === 'current' ? 'border-teal-600 text-teal-700' : 'border-transparent text-slate-400'}`}>Current Program</button>
            <button onClick={() => setActiveTab('past')} className={`flex-1 py-3 text-sm font-bold border-b-2 ${activeTab === 'past' ? 'border-teal-600 text-teal-700' : 'border-transparent text-slate-400'}`}>Past Programs</button>
            <button onClick={() => setActiveTab('tests')} className={`flex-1 py-3 text-sm font-bold border-b-2 ${activeTab === 'tests' ? 'border-teal-600 text-teal-700' : 'border-transparent text-slate-400'}`}>Test Results</button>
          </div>

          <div className="p-4 space-y-6 flex-1 overflow-y-auto">
            
            {/* --- SECTION 1: CURRENT PROGRAM & SCHEDULER --- */}
            {activeTab === 'current' && (
              <div className="space-y-4 animate-fade-in">
                <div className="bg-teal-50 p-4 rounded-xl border border-teal-100">
                  <h3 className="font-bold mb-3 flex items-center gap-2 text-teal-900"><ClipboardList size={18}/> Program Builder</h3>
                  <div className="space-y-3">
                    <input className="w-full p-2 text-sm border border-teal-200 rounded bg-white" placeholder="Program Name (e.g. Hypertrophy Block 1)" value={progName} onChange={e=>setProgName(e.target.value)} />
                    <textarea className="w-full p-2 text-sm border border-teal-200 rounded bg-white h-20" placeholder="Workout Details (Exercises, Sets, Reps)..." value={progDetails} onChange={e=>setProgDetails(e.target.value)} />
                    <input className="w-full p-2 text-sm border border-teal-200 rounded bg-white" placeholder="Focus Notes (e.g. Tempo 3-0-1)" value={progFocus} onChange={e=>setProgFocus(e.target.value)} />
                    
                    <div className="bg-white p-3 rounded border border-teal-200">
                      <p className="text-xs font-bold text-slate-500 mb-2 uppercase">Auto-Schedule Days</p>
                      <div className="flex flex-wrap gap-3">
                        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                          <label key={day} className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer bg-slate-50 px-2 py-1 rounded border border-slate-100 hover:bg-slate-100">
                            <input type="checkbox" checked={scheduleDays[day]} onChange={e => setScheduleDays({...scheduleDays, [day]: e.target.checked})} className="rounded text-teal-600 focus:ring-teal-500"/>
                            {day}
                          </label>
                        ))}
                      </div>
                    </div>
                    
                    <button onClick={assignProgram} className="w-full py-2 bg-teal-600 text-white rounded-lg text-sm font-bold flex items-center justify-center gap-2 hover:bg-teal-700 shadow-sm"><Calendar size={16}/> Assign & Schedule</button>
                  </div>
                </div>

                {/* Mini Calendar Preview */}
                <div className="bg-white p-4 rounded-xl border border-slate-200">
                   <h4 className="text-xs font-bold text-slate-400 uppercase mb-2">Current Calendar View</h4>
                   <div className="grid grid-cols-7 gap-1">
                     {[...Array(30).keys()].map(i => {
                       const d = i+1;
                       const hasP = activeClient.calendar?.[d];
                       return (
                         <div key={d} className={`aspect-square rounded flex items-center justify-center text-[10px] ${hasP ? 'bg-teal-100 text-teal-800 font-bold' : 'bg-slate-50 text-slate-300'}`}>
                           {d}
                         </div>
                       )
                     })}
                   </div>
                </div>
              </div>
            )}

            {/* --- SECTION 2: PAST PROGRAMS --- */}
            {activeTab === 'past' && (
              <div className="space-y-4 animate-fade-in">
                <div className="flex items-center gap-2 text-slate-500 mb-2">
                  <History size={18} />
                  <h3 className="font-bold">Program History</h3>
                </div>
                {(!activeClient.programsHistory || activeClient.programsHistory.length === 0) ? (
                  <p className="text-center text-slate-400 text-sm py-8 bg-slate-50 rounded-xl border border-dashed">No past programs recorded.</p>
                ) : (
                  activeClient.programsHistory.map(prog => (
                    <div key={prog.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:border-teal-200 transition-colors">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-bold text-slate-800">{prog.name}</h4>
                        <span className="text-[10px] bg-slate-100 px-2 py-1 rounded text-slate-500">{prog.assignedDate}</span>
                      </div>
                      <p className="text-xs text-slate-600 line-clamp-2 mb-2">{prog.details}</p>
                      {prog.focus && <div className="text-xs text-teal-600 bg-teal-50 p-2 rounded">Focus: {prog.focus}</div>}
                    </div>
                  ))
                )}
              </div>
            )}

            {/* --- SECTION 3: TEST RESULTS & ASSESSMENTS --- */}
            {activeTab === 'tests' && (
              <div className="space-y-6 animate-fade-in">
                
                {/* 3A. Performance Metrics */}
                <div className="bg-white p-4 rounded-xl border border-slate-200">
                  <h3 className="font-bold mb-3 flex items-center gap-2 text-slate-800"><TrendingUp size={18} className="text-purple-600"/> Performance Metrics</h3>
                  
                  {/* Results List */}
                  <div className="space-y-2 mb-4 max-h-40 overflow-y-auto">
                    {(!activeClient.testResults || activeClient.testResults.length === 0) ? (
                      <p className="text-xs text-slate-400 italic">No test results yet.</p>
                    ) : (
                      activeClient.testResults.map(res => (
                        <div key={res.id} className="flex justify-between items-center text-sm p-2 bg-slate-50 rounded border border-slate-100">
                          <div>
                            <span className="font-bold text-slate-700">{res.name}</span>
                            <span className="text-xs text-slate-400 ml-2">{res.date}</span>
                          </div>
                          <span className="font-mono font-bold text-purple-600">{res.result}</span>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Add Result Form */}
                  <div className="bg-purple-50 p-3 rounded-lg border border-purple-100">
                    <h4 className="text-xs font-bold text-purple-800 mb-2 uppercase">Log New Result</h4>
                    <div className="grid grid-cols-2 gap-2 mb-2">
                      <input type="date" className="p-1 text-sm border rounded" value={testDate} onChange={e=>setTestDate(e.target.value)} />
                      <input placeholder="Test Name (e.g. 1RM Squat)" className="p-1 text-sm border rounded" value={testName} onChange={e=>setTestName(e.target.value)} />
                    </div>
                    <input placeholder="Result (e.g. 100kg)" className="w-full p-1 text-sm border rounded mb-2" value={testResult} onChange={e=>setTestResult(e.target.value)} />
                    <button onClick={saveTestResult} className="w-full py-1.5 bg-purple-600 text-white rounded text-xs font-bold hover:bg-purple-700">Add Entry</button>
                  </div>
                </div>

                {/* 3B. Postural Assessment */}
                <div className="bg-white p-4 rounded-xl border border-slate-200">
                  <h3 className="font-bold mb-3 flex items-center gap-2 text-slate-800"><MapPin size={18} className="text-red-500"/> Postural Map</h3>
                  <div className="flex flex-col items-center bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <BodyMap issues={activeClient.assessments?.posture} isEditing={true} onClick={(x,y) => setMarker({x,y})} />
                  </div>
                  {marker && (
                    <div className="mt-4 space-y-3 bg-red-50 p-3 rounded-lg border border-red-100 animate-slide-up">
                      <h4 className="text-sm font-bold text-red-800">New Issue Details</h4>
                      <input className="w-full p-2 text-sm border border-red-200 rounded bg-white" placeholder="Area (e.g. Left Knee)" value={issueArea} onChange={e=>setIssueArea(e.target.value)} />
                      <input className="w-full p-2 text-sm border border-red-200 rounded bg-white" placeholder="Issue (e.g. Pain)" value={issueStatus} onChange={e=>setIssueStatus(e.target.value)} />
                      <button onClick={saveAssessment} className="w-full py-2 bg-red-500 text-white rounded text-sm font-bold hover:bg-red-600 transition-colors">Add Marker</button>
                    </div>
                  )}
                </div>

              </div>
            )}

          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4">
      <div className="max-w-md mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
             <div className="w-12 h-12 rounded-full bg-slate-800 overflow-hidden border-2 border-slate-700 shadow-md relative">
               <div className="absolute inset-0 flex items-center justify-center text-white text-xs font-bold">MH</div>
               <img 
                 src="mac%20pic.jpg" 
                 alt="Coach Mac" 
                 className="w-full h-full object-cover relative z-10 bg-slate-800" 
                 onError={(e) => e.target.style.display='none'}
               />
             </div>
             <div><h1 className="font-bold text-slate-900 text-lg">Coach Dashboard</h1><p className="text-xs text-slate-500 font-medium">{clients.length} Active Clients</p></div>
          </div>
          <button onClick={() => setAppMode('login')} className="bg-white p-2 rounded-full shadow-sm hover:bg-slate-100 transition-colors"><LogOut size={20} className="text-slate-400"/></button>
        </div>

        {/* Add Client Section */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 space-y-4 mb-8">
          <h3 className="font-bold text-slate-800 flex items-center gap-2"><Plus size={18} className="text-teal-600"/> Add New Client</h3>
          <div className="space-y-3">
            <input placeholder="Full Name" className="w-full p-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none transition-all" value={newName} onChange={e=>setNewName(e.target.value)} />
            <input placeholder="Email Address" className="w-full p-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none transition-all" value={newEmail} onChange={e=>setNewEmail(e.target.value)} />
            <button onClick={createClient} className="w-full py-3 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-slate-800 transition-colors shadow-lg shadow-slate-200">Create Profile</button>
          </div>
        </div>

        {/* Client List */}
        <h3 className="font-bold text-slate-700 mb-3 px-1">Your Clients</h3>
        <div className="space-y-3">
          {clients.length === 0 ? (
            <div className="text-center py-10 text-slate-400 bg-white rounded-2xl border border-dashed border-slate-200">
              <Users size={40} className="mx-auto mb-2 opacity-20"/>
              <p className="text-sm">No clients yet.</p>
            </div>
          ) : (
            clients.map(c => (
              <div key={c.id} onClick={() => { setActiveClient(c); setView('edit'); }} className="bg-white p-4 rounded-2xl border border-slate-100 flex items-center gap-4 cursor-pointer hover:border-teal-500 hover:shadow-md transition-all group">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-teal-100 to-teal-50 flex items-center justify-center shrink-0 border border-teal-100 group-hover:scale-105 transition-transform">
                  <span className="text-teal-700 text-lg font-bold">{c.name.substring(0,2).toUpperCase()}</span>
                </div>
                
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-slate-800 truncate">{c.name}</h3>
                  <p className="text-xs text-slate-400 truncate">{c.email}</p>
                  <p className="text-[10px] text-teal-600 mt-1 font-medium bg-teal-50 inline-block px-2 py-0.5 rounded-full">Tap to manage programs</p>
                </div>
                
                <div className="text-slate-300 group-hover:text-teal-500 transition-colors">
                  <ChevronRight size={20} />
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function ClientView({ client, setAppMode }) {
  const [tab, setTab] = useState('home');
  const [date, setDate] = useState(null);

  const getDays = () => {
    const d = [];
    for(let i=1; i<=30; i++) d.push(i);
    return d;
  };

  return (
    <div className="min-h-screen bg-white font-sans text-slate-900">
      <div className="max-w-md mx-auto min-h-screen shadow-2xl relative pb-20 overflow-hidden">
        <div className="h-full overflow-y-auto p-6 scrollbar-hide">
          
          {tab === 'home' && (
            <div className="space-y-6 animate-fade-in">
              <div className="bg-gradient-to-br from-teal-600 to-teal-800 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
                 <div className="flex justify-between items-start relative z-10">
                   <div className="flex gap-3 items-center">
                     <div className="w-16 h-16 bg-white rounded-full p-1 overflow-hidden shadow-sm relative">
                       <div className="absolute inset-0 flex items-center justify-center text-teal-600 font-bold text-lg">BM</div>
                       <img 
                         src="btm%20logo.jpg" 
                         alt="Logo" 
                         className="w-full h-full object-contain relative z-10 bg-white"
                         onError={(e) => e.target.style.display='none'}
                       />
                     </div>
                     <h1 className="font-bold leading-tight">Breathe<br/>to Move</h1>
                   </div>
                   <button onClick={() => setAppMode('login')} className="bg-white/20 p-2 rounded-full"><LogOut size={14}/></button>
                 </div>
                 <div className="mt-4 relative z-10"><h2 className="text-lg">Welcome, {client.name}</h2><p className="text-teal-100 text-sm">Let's move with intention.</p></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <button onClick={() => setTab('calendar')} className="bg-slate-50 p-4 rounded-xl border hover:bg-teal-50"><Calendar className="mb-2 text-orange-500"/><span className="font-bold text-sm">Schedule</span></button>
                <button onClick={() => setTab('profile')} className="bg-slate-50 p-4 rounded-xl border hover:bg-teal-50"><Activity className="mb-2 text-blue-500"/><span className="font-bold text-sm">Progress</span></button>
              </div>
            </div>
          )}

          {tab === 'calendar' && (
            <div className="space-y-6 animate-fade-in">
              <h2 className="text-xl font-bold">Your Schedule</h2>
              <div className="bg-slate-50 p-4 rounded-2xl border">
                <div className="grid grid-cols-7 gap-2">
                  {getDays().map(d => (
                    <div key={d} onClick={() => setDate(d)} className={`aspect-square rounded flex flex-col items-center justify-center text-sm ${date===d ? 'bg-teal-600 text-white' : client.calendar?.[d] ? 'bg-teal-100' : 'bg-white'}`}>
                      {d}
                      {client.calendar?.[d] && <div className="w-1 h-1 bg-teal-500 rounded-full mt-1"/>}
                    </div>
                  ))}
                </div>
              </div>
              {date && (
                <div className="bg-teal-50 p-4 rounded-xl border border-teal-200">
                  <h3 className="font-bold text-teal-900 mb-2">Feb {date}</h3>
                  {client.calendar?.[date] ? (
                    <div>
                      <span className="text-xs font-bold bg-teal-200 px-2 py-1 rounded uppercase">{client.calendar[date].type}</span>
                      <p className="mt-2 text-sm whitespace-pre-wrap">{client.calendar[date].details}</p>
                    </div>
                  ) : <p className="text-sm text-slate-500">Rest Day</p>}
                </div>
              )}
            </div>
          )}

          {tab === 'profile' && (
            <div className="space-y-6 animate-fade-in">
              <h2 className="text-xl font-bold">Assessment & Results</h2>
              
              {/* Results Section */}
              <div className="bg-white p-4 rounded-xl border border-slate-200">
                 <h3 className="font-bold mb-3 flex items-center gap-2 text-slate-800"><TrendingUp size={18} className="text-purple-600"/> Performance Metrics</h3>
                 <div className="space-y-2 max-h-40 overflow-y-auto">
                    {(!client.testResults || client.testResults.length === 0) ? (
                      <p className="text-xs text-slate-400 italic">No test results recorded yet.</p>
                    ) : (
                      client.testResults.map(res => (
                        <div key={res.id} className="flex justify-between items-center text-sm p-2 bg-slate-50 rounded border border-slate-100">
                          <div><span className="font-bold text-slate-700">{res.name}</span><span className="text-xs text-slate-400 ml-2">{res.date}</span></div>
                          <span className="font-mono font-bold text-purple-600">{res.result}</span>
                        </div>
                      ))
                    )}
                 </div>
              </div>

              {/* Body Map Section */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200">
                <h3 className="font-bold mb-3 text-slate-800">Postural Map</h3>
                <BodyMap issues={client.assessments?.posture} isEditing={false} />
              </div>
            </div>
          )}

          {tab === 'videos' && (
            <div className="space-y-4 animate-fade-in">
              <h2 className="text-xl font-bold">Library</h2>
              {INITIAL_EXERCISES.map(ex => (
                <div key={ex.id} className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border">
                  <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm"><Play size={14}/></div>
                  <div><div className="font-bold text-sm">{ex.name}</div><div className="text-xs text-slate-500">{ex.category}</div></div>
                </div>
              ))}
            </div>
          )}

          {tab === 'connect' && (
            <div className="space-y-6 animate-fade-in">
              <h2 className="text-xl font-bold">Connect</h2>
              <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-xl border">
                 <div className="w-14 h-14 rounded-full overflow-hidden bg-slate-300 relative">
                   <div className="absolute inset-0 flex items-center justify-center text-slate-500 text-xs font-bold">MH</div>
                   <img 
                     src="mac%20pic.jpg" 
                     alt="Coach Mac" 
                     className="w-full h-full object-cover relative z-10 bg-slate-300"
                     onError={(e) => e.target.style.display='none'}
                   />
                 </div>
                 <div><div className="font-bold">Coach Mac</div><div className="text-xs text-slate-500">Head Coach</div></div>
              </div>
              <textarea className="w-full p-3 border rounded-xl text-sm" placeholder="Message..." rows={4}></textarea>
              <button className="w-full py-3 bg-teal-600 text-white rounded-xl font-bold">Send</button>
            </div>
          )}

        </div>

        {/* NAV BAR */}
        <div className="absolute bottom-0 w-full bg-white border-t px-6 py-3 flex justify-between items-center text-xs font-medium text-slate-400">
           <button onClick={() => setTab('home')} className={`flex flex-col items-center gap-1 ${tab==='home'?'text-teal-600':''}`}><Activity size={20}/>Home</button>
           <button onClick={() => setTab('calendar')} className={`flex flex-col items-center gap-1 ${tab==='calendar'?'text-teal-600':''}`}><Calendar size={20}/>Plan</button>
           <button onClick={() => setTab('profile')} className={`flex flex-col items-center gap-1 ${tab==='profile'?'text-teal-600':''}`}><User size={20}/>Profile</button>
           <button onClick={() => setTab('videos')} className={`flex flex-col items-center gap-1 ${tab==='videos'?'text-teal-600':''}`}><Video size={20}/>Explore</button>
           <button onClick={() => setTab('connect')} className={`flex flex-col items-center gap-1 ${tab==='connect'?'text-teal-600':''}`}><MessageSquare size={20}/>Connect</button>
        </div>
      </div>
      <style>{`.animate-fade-in { animation: fade 0.3s } @keyframes fade { from {opacity:0} to {opacity:1}} .scrollbar-hide::-webkit-scrollbar { display: none; }`}</style>
    </div>
  );
}
