/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Scale, 
  FolderClosed, 
  FileText, 
  Wallet, 
  ArrowLeftRight, 
  User, 
  Lock, 
  Database,
  RefreshCw,
  LogOut,
  Moon,
  Sun,
  ShieldCheck,
  LayoutDashboard,
  Bell,
  Calendar,
  AlertTriangle,
  Clock,
  Settings
} from 'lucide-react';

import { User as UserType, UserRole, JudicialFile, JudicialReport, MediaFile, FinancialLedgerItem, LocalAlert } from './types';
import { dbService } from './lib/db';
import { getSyncStatus, performSynchronize, getOnlineStatus } from './lib/sync';
import { supabase } from './lib/supabase';

// Subcomponents import
import Navbar from './components/Navbar';
import DashboardView from './components/DashboardView';
import CaseManagementView from './components/CaseManagementView';
import FieldReportForm from './components/FieldReportForm';
import FinancialLedgerView from './components/FinancialLedgerView';

interface TeamMemberCardProps {
  key?: React.Key;
  member: any;
  onUpdate: (username: string, name: string, password?: string) => Promise<boolean>;
}

function TeamMemberCard({ member, onUpdate }: TeamMemberCardProps) {
  const [editedName, setEditedName] = useState(member.name);
  const [editedPassword, setEditedPassword] = useState(member.password);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateMsg, setUpdateMsg] = useState('');

  // Keep state synced with outer changes
  useEffect(() => {
    setEditedName(member.name);
    setEditedPassword(member.password);
  }, [member.name, member.password]);

  const handleSave = async () => {
    setIsUpdating(true);
    setUpdateMsg('');
    const success = await onUpdate(member.username, editedName, editedPassword);
    setIsUpdating(false);
    if (success) {
      setUpdateMsg('تم التحديث بنجاح! 👤');
      setTimeout(() => setUpdateMsg(''), 4000);
    } else {
      setUpdateMsg('عذراً، فشل التحديث.');
      setTimeout(() => setUpdateMsg(''), 4000);
    }
  };

  return (
    <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-xl space-y-4 flex flex-col justify-between" id={`member-card-${member.username}`}>
      <div className="space-y-3 text-right" dir="rtl">
        <div className="flex justify-between items-center border-b border-slate-900 pb-2">
          <span className="text-[11px] text-slate-400 font-bold block font-mono">{member.username}</span>
          <span className={`text-[9px] px-2 py-0.5 rounded font-black border ${
            member.role === 'officer' 
              ? 'bg-blue-950/50 text-blue-400 border-blue-900/40' 
              : member.role === 'accountant' 
                ? 'bg-emerald-950/50 text-emerald-400 border-emerald-950/40' 
                : 'bg-slate-800/50 text-slate-300 border-slate-700/40'
          }`}>
            {member.role === 'officer' ? 'المفوض القضائي' : member.role === 'accountant' ? 'محاسبة المكتب' : 'مساعد محلف'}
          </span>
        </div>

        <div className="space-y-1.5">
          <label className="block text-[10px] font-bold text-slate-400 text-right">الاسم الكامل المعتمد بالنظام:</label>
          <input 
            type="text"
            value={editedName}
            onChange={(e) => setEditedName(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500 font-sans"
          />
        </div>

        <div className="space-y-1.5">
          <label className="block text-[10px] font-bold text-slate-400 text-right font-sans">رمز المرور السري (الولوج):</label>
          <input 
            type="text"
            value={editedPassword}
            onChange={(e) => setEditedPassword(e.target.value)}
            placeholder="رمز المرور للمكتب"
            className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
          />
        </div>
      </div>

      <div className="pt-2 flex items-center justify-between border-t border-slate-900/40" dir="rtl">
        <button 
          type="button"
          onClick={handleSave}
          disabled={isUpdating}
          className="bg-blue-600/10 hover:bg-blue-600 border border-blue-500/20 text-blue-400 hover:text-white px-3 py-1.5 rounded-lg text-[10px] font-black cursor-pointer transition flex items-center gap-1"
        >
          {isUpdating ? 'جاري التحديث...' : 'حفظ التغييرات 💾'}
        </button>
        {updateMsg && (
          <span className={`text-[10px] font-black ${updateMsg.includes('بنجاح') ? 'text-emerald-400' : 'text-rose-400'}`}>
            {updateMsg}
          </span>
        )}
      </div>
    </div>
  );
}

export default function App() {
  // Theme Dark Mode
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Authentication State
  const [currentUser, setCurrentUser] = useState<UserType | null>(() => {
    const savedUser = localStorage.getItem('court_user_session');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Dynamic state for authenticating team of judicial officers / clerks
  const [team, setTeam] = useState<any[]>(() => {
    const saved = localStorage.getItem('court_team_roster');
    return saved ? JSON.parse(saved) : [
      { username: 'elkhalifi', name: 'الأستاذ المصطفى الخليفي', role: 'officer', office: 'مكتب المفوض القضائي بالرباط - الدائرة القضائية وبني ملال', password: 'admin2026' },
      { username: 'yassir_assistant', name: 'ياسير الداودي (مساعد محلف)', role: 'assistant', office: 'مكتب المفوض القضائي بالرباط', password: 'admin2026' },
      { username: 'rachida_acc', name: 'رشيدة علمي (محاسبة المكتب)', role: 'accountant', office: 'مكتب المفوض القضائي بالرباط', password: 'admin2026' }
    ];
  });

  const fetchTeamData = async () => {
    try {
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*');

      if (!error && profiles && profiles.length > 0) {
        const mappedTeam = profiles.map(p => ({
          username: p.username,
          name: p.full_name,
          role: p.role,
          office: p.office_name,
          password: 'admin2026', // Default for quick-login buttons
        }));
        setTeam(mappedTeam);
        localStorage.setItem('court_team_roster', JSON.stringify(mappedTeam));
      }
    } catch (e) {
      console.warn('Supabase profiles table unreachable, using cached roster', e);
    }
  };

  useEffect(() => {
    fetchTeamData();
  }, [currentUser]);

  // View Navigation
  const [activeTab, setActiveTab] = useState<'dashboard' | 'files' | 'report' | 'ledger' | 'sync_log' | 'settings'>('dashboard');

  // Database lists
  const [files, setFiles] = useState<JudicialFile[]>([]);
  const [financials, setFinancials] = useState<FinancialLedgerItem[]>([]);
  
  // Selected file for writing minutes
  const [selectedFileForReport, setSelectedFileForReport] = useState<JudicialFile | null>(null);

  // Local active reminders and scheduled alerts state
  const [alerts, setAlerts] = useState<LocalAlert[]>([]);
  const [triggeredAlert, setTriggeredAlert] = useState<LocalAlert | null>(null);

  // Sync state
  const [syncMetrics, setSyncMetrics] = useState({
    pendingCount: 0,
    lastSyncTime: 'لم تتم المزامنة بعد',
    isOnline: true
  });
  const [syncStatusMsg, setSyncStatusMsg] = useState('');
  const [settingsSuccessMsg, setSettingsSuccessMsg] = useState('');

  // 1. Initial Load & Listeners
  useEffect(() => {
    // Read theme preference
    const savedTheme = localStorage.getItem('theme_dark_mode') === 'true';
    setIsDarkMode(savedTheme);
    applyThemeClass(savedTheme);

    // Initial load of Index DB files
    if (currentUser) {
      refreshData();
    }

    // Network connectivity change events
    const handleNetworkChange = () => {
      setSyncMetrics(prev => ({
        ...prev,
        isOnline: getOnlineStatus()
      }));
    };

    // Reacting to local synchronization log adjustments
    const handleSyncChange = () => {
      updateSyncMetrics();
      refreshData();
    };

    window.addEventListener('online', handleNetworkChange);
    window.addEventListener('offline', handleNetworkChange);
    window.addEventListener('sync_queue_updated', handleSyncChange);

    return () => {
      window.removeEventListener('online', handleNetworkChange);
      window.removeEventListener('offline', handleNetworkChange);
      window.removeEventListener('sync_queue_updated', handleSyncChange);
    };
  }, [currentUser]);

  // Apply dark class to document element
  const applyThemeClass = (dark: boolean) => {
    if (dark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const handleToggleDarkMode = () => {
    const nextDark = !isDarkMode;
    setIsDarkMode(nextDark);
    localStorage.setItem('theme_dark_mode', String(nextDark));
    applyThemeClass(nextDark);
  };

  // Refresh datasets from Dexie IndexedDB
  const refreshData = async () => {
    try {
      const allFiles = await dbService.getAllFiles();
      // Sort files by newest created first
      allFiles.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setFiles(allFiles);

      const allFinances = await dbService.getAllFinancials();
      allFinances.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setFinancials(allFinances);

      updateSyncMetrics();
      await loadAndInitializeAlerts(allFiles);
    } catch (err) {
      console.error('Error reading offline Dexie ledger:', err);
    }
  };

  // Seed and load local scheduled appointment alerts from localStorage
  const loadAndInitializeAlerts = async (currentFiles: JudicialFile[]) => {
    try {
      const stored = localStorage.getItem('court_local_alerts');
      if (stored) {
        setAlerts(JSON.parse(stored));
        return;
      }

      // No stored alerts: let's seed default ones tied to our case files!
      if (currentFiles.length === 0) return;

      const seededAlerts: LocalAlert[] = [];

      // Find files
      const f1 = currentFiles.find(f => f.caseNumber === 'م-ت-2026-8834');
      const f2 = currentFiles.find(f => f.caseNumber === 'م-ن-2026-1129');
      const f3 = currentFiles.find(f => f.caseNumber === 'م-ت-2026-4412');

      if (f1) {
        seededAlerts.push({
          id: 'alt_1',
          fileId: f1.id || 'f1',
          caseNumber: f1.caseNumber,
          defendantName: f1.defendantName,
          title: 'تبليغ الإعذار الرسمي والمعني بالأمر',
          alertType: 'notification',
          appointmentDate: '2026-06-09T10:00', // Tomorrow morning
          note: 'التوجه لعنوان المعترض المذكور بالملف وتسليم الورقة وتوثيق المتسلم الفعلي بقفل AES.',
          priority: 'high',
          isTriggered: false,
          isCompleted: false,
          createdAt: new Date().toISOString()
        });
      }

      if (f2) {
        seededAlerts.push({
          id: 'alt_2',
          fileId: f2.id || 'f2',
          caseNumber: f2.caseNumber,
          defendantName: f2.defendantName,
          title: 'جلسة البيع بالمزاد العلني وإثبات الحجز التجاري',
          alertType: 'session',
          appointmentDate: '2026-06-10T11:30', // In 2 days
          note: 'مرافقة القوة العمومية ورئيس كتابة الضبط بالمعاريف لجرد المحتويات تمهيداً للمصادرة.',
          priority: 'high',
          isTriggered: false,
          isCompleted: false,
          createdAt: new Date().toISOString()
        });
      }

      if (f3) {
        seededAlerts.push({
          id: 'alt_3',
          fileId: f3.id || 'f3',
          caseNumber: f3.caseNumber,
          defendantName: f3.defendantName,
          title: 'معاينة عينية طارئة وإثبات حال البقعة الأرضية ومستوى البناء',
          alertType: 'preview',
          appointmentDate: '2026-06-12T09:30', // In 4 days
          note: 'التقاط 3 صور دقيقة لموقع البناء ومقاطعة السندات العقارية.',
          priority: 'medium',
          isTriggered: false,
          isCompleted: false,
          createdAt: new Date().toISOString()
        });
      }

      if (seededAlerts.length > 0) {
        localStorage.setItem('court_local_alerts', JSON.stringify(seededAlerts));
        setAlerts(seededAlerts);
      }
    } catch (err) {
      console.error('Error handling local alerts seed:', err);
    }
  };

  // Save alerts array to state and localStorage
  const saveAndSetAlerts = (updatedAlerts: LocalAlert[]) => {
    setAlerts(updatedAlerts);
    localStorage.setItem('court_local_alerts', JSON.stringify(updatedAlerts));
  };

  // synthesized acoustic electronic dual chime using Web Audio API
  const playModernChime = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      
      // First note
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      gain1.gain.setValueAtTime(0.15, ctx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
      
      osc1.start();
      osc1.stop(ctx.currentTime + 0.4);
      
      // Second note (slightly delayed)
      setTimeout(() => {
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(880.00, ctx.currentTime); // A5
        gain2.gain.setValueAtTime(0.15, ctx.currentTime);
        gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
        
        osc2.start();
        osc2.stop(ctx.currentTime + 0.5);
      }, 180);
    } catch (err) {
      console.warn('Audio play skipped (requires first interaction):', err);
    }
  };

  const handleScheduleAlert = (newAlert: Omit<LocalAlert, 'id' | 'isTriggered' | 'isCompleted' | 'createdAt'>) => {
    const alertRecord: LocalAlert = {
      ...newAlert,
      id: `alt_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      isTriggered: false,
      isCompleted: false,
      createdAt: new Date().toISOString()
    };
    saveAndSetAlerts([...alerts, alertRecord]);
  };

  const handleCompleteAlert = (id: string) => {
    const updated = alerts.map(alt => alt.id === id ? { ...alt, isCompleted: true, isTriggered: true } : alt);
    saveAndSetAlerts(updated);
    if (triggeredAlert?.id === id) {
      setTriggeredAlert(null);
    }
  };

  const handleDeleteAlert = (id: string) => {
    const updated = alerts.filter(alt => alt.id !== id);
    saveAndSetAlerts(updated);
    if (triggeredAlert?.id === id) {
      setTriggeredAlert(null);
    }
  };

  const handleSnoozeAlert = (id: string, minutes: number = 5) => {
    const snoozeTime = new Date(Date.now() + minutes * 60 * 1000).toISOString().slice(0, 16); // YYYY-MM-DDTHH:mm
    const updated = alerts.map(alt => {
      if (alt.id === id) {
        return { ...alt, appointmentDate: snoozeTime, isTriggered: false };
      }
      return alt;
    });
    saveAndSetAlerts(updated);
    if (triggeredAlert?.id === id) {
      setTriggeredAlert(null);
    }
  };

  const handleTriggerTestAlert = (id: string) => {
    // Instantly reschedule this alert to trigger immediately
    const testTime = new Date(Date.now() - 3000).toISOString().slice(0, 16);
    const updated = alerts.map(alt => {
      if (alt.id === id) {
        return { ...alt, appointmentDate: testTime, isTriggered: false, isCompleted: false };
      }
      return alt;
    });
    saveAndSetAlerts(updated);
  };

  // Alert check loop
  useEffect(() => {
    if (!currentUser) return;

    const interval = setInterval(() => {
      const now = new Date().getTime();
      let hasUpdates = false;
      const updatedAlerts = alerts.map(alert => {
        if (!alert.isTriggered && !alert.isCompleted) {
          const alertTime = new Date(alert.appointmentDate).getTime();
          if (now >= alertTime) {
            setTriggeredAlert(alert);
            hasUpdates = true;
            return { ...alert, isTriggered: true };
          }
        }
        return alert;
      });

      if (hasUpdates) {
        saveAndSetAlerts(updatedAlerts);
      }
    }, 4000); 

    return () => clearInterval(interval);
  }, [alerts, currentUser]);

  useEffect(() => {
    if (triggeredAlert) {
      playModernChime();
    }
  }, [triggeredAlert]);

  const updateSyncMetrics = async () => {
    const status = await getSyncStatus();
    setSyncMetrics({
      pendingCount: status.pendingCount,
      lastSyncTime: status.lastSyncTime,
      isOnline: status.isOnline
    });
  };

  // 2. Supabase Authentication trigger
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginUsername.trim() || !loginPassword) {
      setLoginError('الرجاء تعبئة اسم المستخدم وكلمة المرور!');
      return;
    }

    setIsLoggingIn(true);
    setLoginError('');

    try {
      // 1. Look up user by username in Supabase profiles table
      const { data: profiles, error: lookupError } = await supabase
        .from('profiles')
        .select('*')
        .eq('username', loginUsername.trim().toLowerCase());

      if (lookupError || !profiles || profiles.length === 0) {
        // Fallback to local team if Supabase unreachable
        throw new Error('Profile not found on Supabase');
      }

      const profile = profiles[0];
      // Use convention: username@bailiff.ma as the auth email
      const email = `${profile.username}@bailiff.ma`;

      // 2. Authenticate with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password: loginPassword,
      });

      if (authError) {
        if (authError.message?.includes('Invalid login')) {
          setLoginError('رمز المرور غير صحيح لهذا المستخدم.');
        } else {
          setLoginError(`خطأ في المصادقة: ${authError.message}`);
        }
        setIsLoggingIn(false);
        return;
      }

      // 3. Create session from profile + auth
      const user = {
        id: authData.user.id,
        username: profile.username,
        name: profile.full_name,
        role: profile.role as UserRole,
        officeName: profile.office_name,
        auth_level: profile.role === 'officer' ? 3 : profile.role === 'accountant' ? 2 : 1,
        token: authData.session?.access_token,
      };

      localStorage.setItem('court_user_session', JSON.stringify(user));
      localStorage.setItem('bailiff_vault_pin', profile.username + '_secure_2026');

      setCurrentUser(user);
      setLoginUsername('');
      setLoginPassword('');
      
      // Refresh team roster from Supabase
      fetchTeamData();

    } catch (err) {
      // Offline / fallback: use local team state
      console.warn('[Auth] Supabase unreachable, trying offline fallback:', err);
      const matched = team.find(u => u.username.toLowerCase().trim() === loginUsername.toLowerCase().trim());
      if (matched && loginPassword === matched.password) {
        const user = {
          id: `usr_${matched.username}`,
          username: matched.username,
          name: matched.name,
          role: matched.role,
          officeName: matched.office || 'مكتب المفوض القضائي بالرباط - الدائرة القضائية وبني ملال',
          auth_level: matched.role === 'officer' ? 3 : matched.role === 'accountant' ? 2 : 1,
        };
        localStorage.setItem('court_user_session', JSON.stringify(user));
        localStorage.setItem('bailiff_vault_pin', matched.username + '_secure_2026');
        setCurrentUser(user);
        setLoginUsername('');
        setLoginPassword('');
      } else {
        setLoginError('يتعذر الاتصال بخادم المصادقة المركزي. تحقق من اتصالك بالإنترنت.');
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleUpdateTeamMember = async (username: string, name: string, password?: string) => {
    try {
      // Update profile in Supabase
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: name, updated_at: new Date().toISOString() })
        .eq('username', username);

      if (!error) {
        // Refresh team list
        await fetchTeamData();

        // If updating own profile, sync current user
        if (currentUser && currentUser.username.toLowerCase().trim() === username.toLowerCase().trim()) {
          const updatedUser = { ...currentUser, name };
          setCurrentUser(updatedUser);
          localStorage.setItem('court_user_session', JSON.stringify(updatedUser));
        }
        return true;
      }
    } catch (e) {
      console.warn('Supabase update failed, applying locally:', e);
    }

    // Local / Offline / Fallback
    const updatedTeam = team.map(m => {
      if (m.username.toLowerCase().trim() === username.toLowerCase().trim()) {
        return { ...m, name, password: password !== undefined ? password : m.password };
      }
      return m;
    });
    setTeam(updatedTeam);
    localStorage.setItem('court_team_roster', JSON.stringify(updatedTeam));

    if (currentUser && currentUser.username.toLowerCase().trim() === username.toLowerCase().trim()) {
      const updatedUser = { ...currentUser, name };
      setCurrentUser(updatedUser);
      localStorage.setItem('court_user_session', JSON.stringify(updatedUser));
    }
    return true;
  };

  const handleLogout = () => {
    supabase.auth.signOut().catch(() => {});
    localStorage.removeItem('court_user_session');
    localStorage.removeItem('bailiff_vault_pin');
    setCurrentUser(null);
  };

  // Simulating RBAC role alteration at client Navbar
  const handleRoleChange = (role: UserRole) => {
    if (!currentUser) return;
    const offices: Record<UserRole, string> = {
      officer: 'مكتب المفوض القضائي بالرباط - الدائرة القضائية وبني ملال',
      assistant: 'مكتب المفوض القضائي بالرباط (ميداني)',
      accountant: 'المكتب الحسابي ومراقبة الصندوق بالرباط'
    };
    const names: Record<UserRole, string> = {
      officer: 'الأستاذ المصطفى الخليفي',
      assistant: 'ياسير الداودي (مساعد محلف)',
      accountant: 'رشيدة علمي (محاسبة المكتب)'
    };
    const updatedUser: UserType = {
      ...currentUser,
      role,
      name: names[role],
      officeName: offices[role]
    };
    localStorage.setItem('court_user_session', JSON.stringify(updatedUser));
    setCurrentUser(updatedUser);

    // Redirect if the new role is restricted from accessing the current active tab
    if (role === 'accountant' && (activeTab === 'files' || activeTab === 'report' || activeTab === 'settings')) {
      setActiveTab('dashboard');
    } else if (role === 'assistant' && (activeTab === 'ledger' || activeTab === 'settings')) {
      setActiveTab('dashboard');
    }
  };

  const handleUpdateProfile = async (name: string, officeName: string) => {
    if (!currentUser) return;
    const updatedUser: UserType = {
      ...currentUser,
      name,
      officeName
    };
    localStorage.setItem('court_user_session', JSON.stringify(updatedUser));
    setCurrentUser(updatedUser);

    try {
      await fetch('/api/team/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: currentUser.username, name })
      });
      fetchTeamData();
    } catch (e) {
      console.warn('Network issue persisting profile update to server:', e);
    }
  };

  // 3. Transactions & Database Operations delegation
  const handleAddNewFile = async (newFile: Omit<JudicialFile, 'id' | 'createdAt' | 'updatedAt' | 'isEncrypted'>) => {
    const id = await dbService.saveFile({
      ...newFile,
      isEncrypted: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    await refreshData();
    return id;
  };

  const handleSaveReportFromForm = async (newReport: Omit<JudicialReport, 'id' | 'createdAt'>) => {
    const id = await dbService.saveReport({
      ...newReport,
      createdAt: new Date().toISOString()
    });
    await refreshData();
    return id;
  };

  const handleSaveMediaFromForm = async (newMedia: Omit<MediaFile, 'id' | 'createdAt'>) => {
    const id = await dbService.saveMedia({
      ...newMedia,
      createdAt: new Date().toISOString()
    });
    await refreshData();
    return id;
  };

  const handleAddFinancialItem = async (newItem: Omit<FinancialLedgerItem, 'id' | 'createdAt'>) => {
    const id = await dbService.saveFinancialItem({
      ...newItem,
      createdAt: new Date().toISOString()
    });
    await refreshData();
    return id;
  };

  // Trigger synchronize queue manually
  const handleTriggerSyncNow = async () => {
    if (!currentUser) return;
    
    setSyncStatusMsg('جاري تحزيم السجلات وتشفير كتل المزامنة للمركز...');
    const result = await performSynchronize(currentUser.name);
    
    setSyncStatusMsg(result.message);
    updateSyncMetrics();
    refreshData();

    setTimeout(() => {
      setSyncStatusMsg('');
    }, 4000);
  };

  // Form direct navigation helper
  const handleSelectCaseForReport = (file: JudicialFile) => {
    setSelectedFileForReport(file);
    setActiveTab('report');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 transition-all font-sans" id="main-applicative-wrapper">
      
      {/* 1. Login Gate Overlay (RTL Authentic Theme with immersive dark coat of arms) */}
      {!currentUser ? (
        <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative bg-slate-950">
          <div className="absolute inset-0 bg-cover bg-center opacity-3 pointer-events-none" style={{ backgroundImage: "url('https://img.icons8.com/color/192/justice-scales.png')" }}></div>
          
          <div className="max-w-md w-full space-y-8 bg-slate-900 p-8 rounded-2xl shadow-2xl border border-slate-800 relative z-10">
            
            {/* National Crest header signature */}
            <div className="text-center">
              <div className="mx-auto h-16 w-16 bg-blue-700/20 text-blue-500 rounded-full flex items-center justify-center shadow-lg shadow-blue-500/10 border border-blue-500/30">
                <Scale className="w-8 h-8" />
              </div>
              <h2 className="mt-4 text-xl font-bold tracking-tight text-white font-sans">المملكة المغربية</h2>
              <p className="text-[10px] uppercase tracking-widest text-blue-400 font-semibold mt-1">مكتب المفوض القضائي المقبول لدى المحاكم</p>
              <p className="text-[10px] bg-slate-800 text-slate-300 py-1.5 px-3 rounded-full mt-3 inline-block font-semibold border border-slate-700">
                البوابة الموحدة للموظفين والمساعدين المحلفين
              </p>
            </div>

            {/* Login form */}
            <form className="mt-6 space-y-4 text-right" onSubmit={handleLoginSubmit}>
              {loginError && (
                <div className="bg-rose-950/40 border border-rose-800 text-rose-300 p-3 rounded-lg text-xs font-semibold text-center leading-relaxed">
                  {loginError}
                </div>
              )}

              <div>
                <label className="block text-xs font-extrabold text-slate-300 mb-1.5">اسم المستخدم (المعرّف الإلكتروني) *</label>
                <div className="relative">
                  <span className="absolute right-3 top-3 text-slate-400">
                    <User className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    required
                    value={loginUsername}
                    onChange={(e) => setLoginUsername(e.target.value)}
                    placeholder="مثال: elkhalifi"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg pr-10 pl-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    id="login-username-input"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-extrabold text-slate-300 mb-1.5">رمز المرور السري للولوج *</label>
                <div className="relative">
                  <span className="absolute right-3 top-3 text-slate-400">
                    <Lock className="w-4 h-4" />
                  </span>
                  <input
                    type="password"
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="رمز المرور للمكتب"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg pr-10 pl-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    id="login-password-input"
                    autoComplete="current-password"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoggingIn}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl text-xs shadow-lg shadow-blue-900/20 mt-4 transition cursor-pointer"
                id="login-submit-btn"
              >
                {isLoggingIn ? 'جاري التحقق والمصادقة على القفل...' : 'تسجيل دخول آمن وعرض السجلات'}
              </button>
            </form>



          </div>
        </div>
      ) : (
        
        // 2. Active Application Body (Authorized User state is saved)
        <div className="space-y-0 text-right" id="app-workspace" dir="rtl">
          
          {/* Global Header and role manager */}
          <Navbar 
            currentUser={currentUser}
            onRoleChange={handleRoleChange}
            isOnline={syncMetrics.isOnline}
            pendingSyncCount={syncMetrics.pendingCount}
            onTriggerSync={handleTriggerSyncNow}
            isDarkMode={isDarkMode}
            onToggleDarkMode={handleToggleDarkMode}
            onUpdateProfile={handleUpdateProfile}
            onLogout={handleLogout}
          />

          {/* Sync Progress Status Banner */}
          {syncStatusMsg && (
            <div className="bg-sky-950/20 border-b border-sky-900/50 p-3.5 text-center text-xs font-bold text-blue-400 animate-slide-up flex items-center justify-center gap-2">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>{syncStatusMsg}</span>
            </div>
          )}

          {/* Core Workspace Layout Panel */}
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
            
            {/* Tab Swappers Controls styled with Immersive UI navbar links aesthetic */}
            <div className="flex flex-wrap bg-slate-900 border border-slate-800 p-1 rounded-xl shadow-inner max-w-3xl gap-1.5">
              
              <button
                onClick={() => { setActiveTab('dashboard'); setSelectedFileForReport(null); }}
                className={`flex-1 py-3 px-2 rounded-lg text-xs font-extrabold transition-all flex items-center justify-center gap-2 cursor-pointer ${activeTab === 'dashboard' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/30' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
                id="tab-dashboard"
              >
                <LayoutDashboard className="w-4 h-4 shrink-0" />
                <span>لوحة التحكم</span>
              </button>

              {currentUser.role !== 'accountant' && (
                <button
                  onClick={() => { setActiveTab('files'); setSelectedFileForReport(null); }}
                  className={`flex-1 py-3 px-2 rounded-lg text-xs font-extrabold transition-all flex items-center justify-center gap-2 cursor-pointer ${activeTab === 'files' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/30' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
                  id="tab-files"
                >
                  <FolderClosed className="w-4 h-4 shrink-0" />
                  <span>الملفات والجدولة</span>
                </button>
              )}

              {currentUser.role !== 'accountant' && (
                <button
                  onClick={() => setActiveTab('report')}
                  disabled={!selectedFileForReport}
                  className={`flex-1 py-3 px-2 rounded-lg text-xs font-extrabold transition-all flex items-center justify-center gap-2 ${!selectedFileForReport ? 'cursor-not-allowed text-slate-600 opacity-40' : 'cursor-pointer'} ${activeTab === 'report' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/30' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
                  id="tab-report"
                  title={!selectedFileForReport ? 'حدد ملفاً من القائمة أولاً لإعداد محضره الميداني' : ''}
                >
                  <FileText className="w-4 h-4 shrink-0" />
                  <span>المحاضر الميدانية</span>
                </button>
              )}

              {currentUser.role !== 'assistant' && (
                <button
                  onClick={() => { setActiveTab('ledger'); setSelectedFileForReport(null); }}
                  className={`flex-1 py-3 px-2 rounded-lg text-xs font-extrabold transition-all flex items-center justify-center gap-2 cursor-pointer ${activeTab === 'ledger' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/30' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
                  id="tab-ledger"
                >
                  <Wallet className="w-4 h-4 shrink-0" />
                  <span>الجريدة المالية</span>
                </button>
              )}

              {currentUser.role === 'officer' && (
                <button
                  onClick={() => { setActiveTab('settings'); setSelectedFileForReport(null); }}
                  className={`flex-1 py-3 px-2 rounded-lg text-xs font-extrabold transition-all flex items-center justify-center gap-2 cursor-pointer ${activeTab === 'settings' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/30' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
                  id="tab-settings"
                >
                  <Settings className="w-4 h-4 shrink-0" />
                  <span>إعدادات المكتب</span>
                </button>
              )}

            </div>

            {/* TAB VIEW CONTROLLERS */}
            
            {/* Dashboard tab */}
            {activeTab === 'dashboard' && (
              <DashboardView 
                files={files}
                pendingSyncCount={syncMetrics.pendingCount}
                user={currentUser}
                onSetTab={(tab) => setActiveTab(tab as any)}
                onSelectFileForReport={handleSelectCaseForReport}
                onTriggerSync={handleTriggerSyncNow}
                alerts={alerts}
                onScheduleAlert={handleScheduleAlert}
                onCompleteAlert={handleCompleteAlert}
                onDeleteAlert={handleDeleteAlert}
                onSnoozeAlert={handleSnoozeAlert}
                onTriggerTestAlert={handleTriggerTestAlert}
              />
            )}

            {/* Case file and registry tab */}
            {activeTab === 'files' && currentUser.role !== 'accountant' && (
              <CaseManagementView 
                files={files}
                onAddNewFile={handleAddNewFile}
                onSelectFileForReport={handleSelectCaseForReport}
                userRole={currentUser.role}
              />
            )}

            {/* Document drafting tab */}
            {activeTab === 'report' && currentUser.role !== 'accountant' && (
              <FieldReportForm 
                selectedFile={selectedFileForReport}
                reporterName={currentUser.name}
                onSaveReport={handleSaveReportFromForm}
                onSaveMedia={handleSaveMediaFromForm}
                onCancel={() => {
                  setSelectedFileForReport(null);
                  setActiveTab('dashboard');
                }}
              />
            )}

            {/* Financial ledger accounting tab */}
            {activeTab === 'ledger' && currentUser.role !== 'assistant' && (
              <FinancialLedgerView
                financials={financials}
                files={files}
                onAddFinancialItem={handleAddFinancialItem}
                accountantName={currentUser.name}
              />
            )}

            {/* General Settings Tab for Officer / Office details */}
            {activeTab === 'settings' && currentUser.role === 'officer' && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 md:p-8 space-y-6 text-right font-sans" id="general-settings-view">
                
                {/* Header */}
                <div className="border-b border-slate-800 pb-5">
                  <h2 className="text-lg font-extrabold text-white flex items-center gap-2 justify-start">
                    <Settings className="w-5.5 h-5.5 text-blue-500" />
                    الإعدادات العامة لمكتب المفوض القضائي
                  </h2>
                  <p className="text-xs text-slate-400 mt-1.5">
                    تعديل الهوية القانونية، اسم المكتب، والدوائر القضائية والملحقات التابعة للمفوض المعتمد. يتم تحديث الترويسة آلياً في جميع المحاضر وقوائم التصدير.
                  </p>
                </div>

                {settingsSuccessMsg && (
                  <div className="bg-emerald-950/40 border border-emerald-900/40 text-emerald-400 p-4 rounded-xl text-xs font-bold leading-relaxed text-right animate-fade-in flex items-center gap-2 justify-start">
                    <span className="text-emerald-500">✅</span>
                    <span>{settingsSuccessMsg}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  
                  {/* Left Column - Information Summary Card */}
                  <div className="bg-slate-950/60 border border-slate-800 p-5 rounded-xl space-y-4">
                    <h3 className="font-bold text-xs text-white border-b border-slate-900 pb-2">تفاصيل الهوية النشطة الحالية</h3>
                    
                    <div className="space-y-3.5 text-xs text-slate-300">
                      <div>
                        <span className="text-slate-500 block text-[10.5px]">المستخدم النشط الحالي:</span>
                        <strong className="text-white font-semibold block mt-0.5">{currentUser.name}</strong>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10.5px]">الصفة والصلاحيات:</span>
                        <span className="inline-block bg-blue-950/40 text-[9.5px] text-blue-400 px-2.5 py-0.5 rounded-full border border-blue-900/40 font-bold mt-1">
                          مفوض قضائي رئيسي (officer)
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10.5px]">اسم المكتب والدوائر المعتمدة:</span>
                        <strong className="text-slate-200 font-bold block mt-0.5 leading-relaxed">{currentUser.officeName}</strong>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10.5px]">طريقة الحفظ والترميز:</span>
                        <strong className="text-emerald-400 block mt-0.5 font-mono text-[10px]">LOCALSTORAGE + CRYPTO AES-256</strong>
                      </div>
                    </div>
                  </div>

                  {/* Right Column - Edit Form (spans 2 columns) */}
                  <form 
                    onSubmit={(e) => {
                      e.preventDefault();
                      const formData = new FormData(e.currentTarget);
                      const name = formData.get('officerName') as string;
                      const officeName = formData.get('officeName') as string;
                      if (name.trim() && officeName.trim()) {
                        handleUpdateProfile(name.trim(), officeName.trim());
                        setSettingsSuccessMsg('تم حفظ وتحديث بيانات المفوض والمكتب والدوائر القضائية بنجاح في النظام المتكامل!');
                        setTimeout(() => {
                          setSettingsSuccessMsg('');
                        }, 5500);
                      }
                    }}
                    className="lg:col-span-2 bg-slate-950/35 border border-slate-800/60 p-5 rounded-xl space-y-5"
                  >
                    <div className="space-y-1.5">
                      <label htmlFor="settings-officer-name" className="block text-xs font-bold text-slate-300">
                        الاسم الكامل للمفتش والمقرر (المفوض القضائي):
                      </label>
                      <input
                        type="text"
                        name="officerName"
                        id="settings-officer-name"
                        defaultValue={currentUser.name}
                        required
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2.5 px-3.5 text-xs text-white focus:outline-none focus:border-blue-500 font-medium font-sans"
                      />
                      <span className="text-[10px] text-slate-500 block mt-1">الاسم الشخصي والعائلي للمفوّض بالصيغة الرسمية المعتمدة لدى وزارة العدل.</span>
                    </div>

                    <div className="space-y-1.5">
                      <label htmlFor="settings-office-name" className="block text-xs font-bold text-slate-300">
                        اسم المكتب والدوائر القضائية الملحقة بالتكليف:
                      </label>
                      <textarea
                        name="officeName"
                        id="settings-office-name"
                        defaultValue={currentUser.officeName}
                        required
                        rows={4}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2.5 px-3.5 text-xs text-white focus:outline-none focus:border-blue-500 font-medium leading-relaxed font-sans"
                      />
                      <span className="text-[10px] text-slate-500 block mt-1">أدخل المسمى التفصيلي للمكتب مع الدائرة والمحاكم الملحقة (مثال: مكتب المفوض القضائي بالرباط - الدائرة القضائية وبني ملال).</span>
                    </div>

                    <div className="flex gap-3 justify-start pt-3 border-t border-slate-900">
                      <button
                        type="submit"
                        className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs py-2.5 px-6 rounded-lg flex items-center gap-1.5 cursor-pointer shadow-lg shadow-blue-500/15 animate-pulse-slow"
                        id="settings-save-button"
                      >
                        <span>تثبيت التغييرات بصفة دائمة 💾</span>
                      </button>
                      
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab('dashboard');
                        }}
                        className="bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white py-2.5 px-5 rounded-lg text-xs font-bold cursor-pointer transition"
                      >
                        رجوع إلى لوحة التحكم
                      </button>
                    </div>

                  </form>

                </div>

                {/* Team roster administration section */}
                <div className="border-t border-slate-800 pt-8 mt-4" id="team-roster-management">
                  <div className="pb-5">
                    <h3 className="text-base font-extrabold text-white flex items-center gap-2 justify-start">
                      <User className="w-5 h-5 text-amber-500" />
                      مستوى التفويض: إدارة طاقم العمل والصلاحيات الثنائية
                    </h3>
                    <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                      بصفتك المفوض القضائي (Officer)، تملك الصلاحية الكاملة لتعديل معلومات الفريق ورموز مرورهم للولوج للنظام لضمان الاستمرارية الإجرائية ومراقبة الصيانة الأمنية.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    {team.map((member) => (
                      <TeamMemberCard 
                        key={member.username} 
                        member={member} 
                        onUpdate={handleUpdateTeamMember} 
                      />
                    ))}
                  </div>
                </div>

              </div>
            )}

          </main>

          {/* Triggered Alert Emergency Modal Overlay */}
          {triggeredAlert && (
            <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in text-right">
              <div className="bg-slate-900 border-2 border-rose-500/30 w-full max-w-lg rounded-2xl shadow-2xl p-6 md:p-8 space-y-6 relative overflow-hidden" id="emergency-alert-modal">
                <div className="absolute top-0 right-0 left-0 h-1.5 bg-rose-600 animate-pulse"></div>
                
                <div className="flex items-center gap-4 border-b border-slate-800 pb-4 justify-start">
                  <div className="bg-rose-500/20 text-rose-500 p-3 rounded-2xl border border-rose-500/20 animate-bounce">
                    <Bell className="w-7 h-7" />
                  </div>
                  <div>
                    <span className="text-[10px] bg-rose-500/10 border border-rose-500/30 text-rose-400 px-2.5 py-0.5 rounded-full font-black animate-pulse">
                      إنذار قضائي وجدولة آنية 🚨
                    </span>
                    <h3 className="text-base font-black text-white mt-1.5 leading-normal">{triggeredAlert.title}</h3>
                  </div>
                </div>

                <div className="space-y-3.5 text-xs text-slate-300">
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-slate-500 font-bold">رقم الملف تتبع:</span>
                      <strong className="font-mono text-blue-400 font-extrabold">{triggeredAlert.caseNumber}</strong>
                    </div>
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-slate-500 font-bold">المنفذ عليه / المطلوب:</span>
                      <strong className="text-slate-200 font-bold">{triggeredAlert.defendantName}</strong>
                    </div>
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-slate-500 font-bold">نوع الإجراء القضائي:</span>
                      <span className="bg-rose-950/40 border border-rose-900/30 text-rose-400 font-extrabold px-2 py-0.5 rounded text-[9px]">
                        {triggeredAlert.alertType === 'session' && 'جلسة محاكمة'}
                        {triggeredAlert.alertType === 'notification' && 'طلب تبليغ رسمي'}
                        {triggeredAlert.alertType === 'execution' && 'تنفيذ وحجز'}
                        {triggeredAlert.alertType === 'preview' && 'إثبات حالة معاينة'}
                        {triggeredAlert.alertType === 'other' && 'إجراء عام'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-slate-500 font-bold">توقيت الجدولة الميدانية:</span>
                      <strong className="text-amber-400 font-extrabold">{new Date(triggeredAlert.appointmentDate).toLocaleString('ar-MA')}</strong>
                    </div>
                  </div>

                  {triggeredAlert.note && (
                    <div className="bg-amber-950/20 border border-amber-900/20 p-4 rounded-xl">
                      <span className="block text-[10px] text-amber-500 font-extrabold mb-1">🎯 تعليمات وملاحظات مأمورية المفوض:</span>
                      <p className="leading-relaxed text-amber-200 text-[11px]">{triggeredAlert.note}</p>
                    </div>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <button
                    onClick={() => {
                      const correlatedFile = files.find(f => f.id === triggeredAlert.fileId || f.caseNumber === triggeredAlert.caseNumber);
                      if (correlatedFile) {
                        handleSelectCaseForReport(correlatedFile);
                      } else {
                        setActiveTab('files');
                      }
                      handleCompleteAlert(triggeredAlert.id);
                    }}
                    className="flex-grow bg-blue-600 hover:bg-blue-700 text-white font-black py-3 px-5 rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer transition shadow-lg shadow-blue-500/10"
                    id="alert-action-draft"
                  >
                    <span>تحرير المحضر فوراً ✍️</span>
                  </button>

                  <button
                    onClick={() => handleSnoozeAlert(triggeredAlert.id, 5)}
                    className="flex-grow bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-300 font-bold py-3 px-5 rounded-xl text-xs flex items-center justify-center gap-1 cursor-pointer transition"
                    id="alert-action-snooze"
                  >
                    <Clock className="w-3.5 h-3.5 text-amber-500" />
                    <span>تأجيل 5 دق</span>
                  </button>
                  
                  <button
                    onClick={() => handleCompleteAlert(triggeredAlert.id)}
                    className="bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 px-6 rounded-xl text-xs cursor-pointer transition"
                    id="alert-action-complete"
                  >
                    <span>تخطي</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Royal Immersive Footer Branding and Logging Exit button */}
          <footer className="bg-slate-900 text-slate-400 py-10 border-t border-slate-800">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-4">
              <div className="flex items-center justify-center gap-2">
                <Scale className="w-5 h-5 text-blue-500" />
                <span className="font-bold text-white text-xs tracking-wider">نظام المفوض القضائي المقر والمنظم بالقانون 81.03</span>
              </div>
              
              <p className="text-[10px] max-w-xl mx-auto leading-normal text-slate-500 font-mono">
                AES-256 ENCRYPTION ACTIVE | DB: INDEXEDDB (DEXIE) | SYNC: QUEUE_STANDBY | v1.2.6-stable
              </p>

              <div>
                <button
                  onClick={handleLogout}
                  className="bg-rose-500/10 border border-rose-500/30 text-rose-400 hover:bg-rose-600 hover:text-white px-5 py-2 rounded-lg text-xs font-bold transition-all inline-flex items-center gap-1.5 cursor-pointer"
                  id="footer-exit-btn"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>تسجيل خروج من الجلسة الآمنة</span>
                </button>
              </div>

            </div>
          </footer>

        </div>
      )}

    </div>
  );
}
