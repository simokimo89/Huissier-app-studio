/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Scale, Wifi, WifiOff, RefreshCw, UserCheck, Moon, Sun, Edit3, Check, X, ShieldAlert } from 'lucide-react';
import { User, UserRole } from '../types';

interface NavbarProps {
  currentUser: User;
  onRoleChange: (role: UserRole) => void;
  isOnline: boolean;
  pendingSyncCount: number;
  onTriggerSync: () => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  onUpdateProfile?: (name: string, officeName: string) => void;
}

export default function Navbar({
  currentUser,
  onRoleChange,
  isOnline,
  pendingSyncCount,
  onTriggerSync,
  isDarkMode,
  onToggleDarkMode,
  onUpdateProfile,
}: NavbarProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [tempName, setTempName] = useState(currentUser.name);
  const [tempOffice, setTempOffice] = useState(currentUser.officeName);

  useEffect(() => {
    setTempName(currentUser.name);
    setTempOffice(currentUser.officeName);
  }, [currentUser]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (onUpdateProfile && tempName.trim() && tempOffice.trim()) {
      onUpdateProfile(tempName.trim(), tempOffice.trim());
    }
    setIsEditing(false);
  };
  return (
    <nav className="bg-slate-900 text-white shadow-2xl border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          
          {/* Right Section: Branding & Identity (RTL prioritized) */}
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 text-white p-2.5 rounded-lg shadow-lg shadow-blue-900/20 flex items-center justify-center">
              <Scale className="w-7 h-7" id="navbar-brand-icon" />
            </div>
            <div>
              <h1 className="text-lg md:text-xl font-bold tracking-tight text-white">نظام المفوض القضائي</h1>
              <p className="text-[10px] uppercase tracking-widest text-blue-400 font-semibold">مؤسسة التبليغ والتنفيذ الميداني الرقمي</p>
            </div>
          </div>

          {/* Center/Left Section: System Controls */}
          <div className="flex items-center gap-3 sm:gap-6">
            
            {/* Live Network & Offline Sync State */}
            <div className="flex items-center gap-2 bg-slate-800/60 px-3 py-1.5 rounded-full border border-slate-700">
              {isOnline ? (
                <div className="flex items-center gap-1.5 text-xs text-legal-teal font-medium">
                  <Wifi className="w-4 h-4 text-legal-teal" />
                  <span className="hidden sm:inline">متصل بالشبكة</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-xs text-rose-400 font-medium">
                  <WifiOff className="w-4 h-4 text-rose-400" />
                  <span className="hidden sm:inline">وضع الحقل (منفصل)</span>
                </div>
              )}
              {pendingSyncCount > 0 && (
                <button
                  onClick={onTriggerSync}
                  className="mr-1.5 bg-legal-gold text-legal-dark px-2 py-0.5 rounded text-[10px] font-bold animate-pulse hover:brightness-110 flex items-center gap-1 transition-all"
                  title="مزامنة مع السيرفر"
                  id="nav-sync-badge-btn"
                >
                  <RefreshCw className="w-3 h-3 animate-spin duration-1000" />
                  <span>{pendingSyncCount} معلق</span>
                </button>
              )}
            </div>

            {/* Simulated RBAC Switcher (For Testing Permission Sets) */}
            <div className="hidden md:flex items-center gap-2 bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700">
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <UserCheck className="w-3.5 h-3.5" />
                الدور الحالي:
              </span>
              <select
                value={currentUser.role}
                onChange={(e) => onRoleChange(e.target.value as UserRole)}
                className="bg-slate-900 border-none text-xs text-legal-gold font-bold focus:ring-1 focus:ring-legal-gold rounded outline-none p-1 cursor-pointer"
                id="rbac-role-selector"
              >
                <option value="officer">المفوض الرسمي (Officer)</option>
                <option value="assistant">مساعد محلف (Assistant)</option>
                <option value="accountant">محاسب الصندوق (Accountant)</option>
              </select>
            </div>

            {/* Dark & Light Toggle */}
            <button
              onClick={onToggleDarkMode}
              className="p-2 rounded-lg bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-300 transition-colors"
              title="تغيير المظهر"
              id="theme-toggler"
            >
              {isDarkMode ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5" />}
            </button>

          </div>
        </div>
      </div>

      {/* Dynamic Sub-header detailing simulated User State */}
      <div className="bg-slate-950 py-3.5 px-4 sm:px-6 lg:px-8 border-t border-slate-800 text-slate-300 text-xs flex flex-wrap justify-between items-center gap-3">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(37,99,235,0.6)]"></span>
            <span>المكتب القضائي: <strong className="text-white">{currentUser.officeName}</strong></span>
          </div>
          <div className="flex items-center gap-2">
            <span>المستخدم النشط: <strong className="text-white font-semibold">{currentUser.name}</strong></span>
            <span className="bg-blue-900/40 text-[10px] text-blue-400 px-3 py-1 rounded-full border border-blue-800/50 font-bold">
              {currentUser.role === 'officer' && 'صلاحيات كاملة'}
              {currentUser.role === 'assistant' && 'إجراءات وتقارير الحقل فقط'}
              {currentUser.role === 'accountant' && 'السجلات المالية والمداخيل فقط'}
            </span>
          </div>
        </div>

        {/* Change / Update Information Action Trigger */}
        <button
          onClick={() => {
            setTempName(currentUser.name);
            setTempOffice(currentUser.officeName);
            setIsEditing(true);
          }}
          className="bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 px-3 py-1.5 rounded-lg text-[10.5px] font-extrabold text-blue-400 hover:text-white transition flex items-center gap-1.5 cursor-pointer ml-auto sm:ml-0"
          title="تغيير معلومات المكتب والمستخدم"
          id="custom-modify-office-btn"
        >
          <Edit3 className="w-3.5 h-3.5" />
          <span>تعديل الهوية والدوائر القضائية ✍️</span>
        </button>

        {/* Beautiful Modern Overlay Modal for dynamic Profile / Office Editing */}
        {isEditing && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl" id="custom-profile-edit-modal">
              
              {/* Modal Header */}
              <div className="bg-slate-950 p-5 border-b border-slate-800 flex justify-between items-center">
                <div className="text-right">
                  <h3 className="font-extrabold text-sm text-white">تعديل بيانات الهوية والمكتب القضائي</h3>
                  <p className="text-[10px] text-slate-400 mt-1">تعديل الترويسة المسجلة والمستعملة في المحاضر والمستندات الرسمية المصدّرة</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="p-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Form Input Container */}
              <form onSubmit={handleSave} className="p-6 space-y-5 text-right font-sans">
                
                {/* Warning message explaining legal binding */}
                <div className="bg-amber-950/25 border border-amber-900/40 p-3.5 rounded-xl text-amber-200 text-[10.5px] flex items-start gap-2.5 leading-relaxed">
                  <ShieldAlert className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                  <span>
                    <strong>تنبيه قانوني هام:</strong> سيتم إدراج هذه المسميات والبيانات مباشرة بالترويسة المعتمدة والختم على جميع التقارير والمحاضر القضائية المطبوعة بصيغة PDF. يرجى تحري الدقة والمطابقة للسجلات العقائدية لوزارة العدل.
                  </span>
                </div>

                {/* Name Input */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-300">الاسم الكامل للمفوض / المساعد المسؤول:</label>
                  <input
                    type="text"
                    required
                    value={tempName}
                    onChange={(e) => setTempName(e.target.value)}
                    placeholder="مثال: الأستاذ المصطفى الخليفي"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2.5 px-3 text-xs text-white focus:outline-none focus:border-blue-500 font-medium"
                    id="profile-edit-fullname"
                  />
                </div>

                {/* Office Name Input */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-300">اسم وتوصيف المكتب القضائي والدوائر المنتسبة:</label>
                  <textarea
                    required
                    rows={3}
                    value={tempOffice}
                    onChange={(e) => setTempOffice(e.target.value)}
                    placeholder="مثال: مكتب المفوض القضائي بالرباط - الدائرة القضائية وبني ملال"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2.5 px-3 text-xs text-white focus:outline-none focus:border-blue-500 font-medium leading-relaxed"
                    id="profile-edit-officename"
                  />
                  <span className="text-[9px] text-slate-500 block leading-normal">يكتب الإقليم والملحقات التابعة للدائرة القضائية المضمونة بالتكليف.</span>
                </div>

                {/* Action Controls */}
                <div className="flex gap-2.5 pt-2 border-t border-slate-800">
                  <button
                    type="submit"
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs py-2.5 px-4 rounded-lg flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-blue-500/10"
                    id="profile-save-btn"
                  >
                    <Check className="w-3.5 h-3.5 text-blue-200" />
                    <span>حفظ وتثبيت البيانات الرسمية</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white py-2.5 px-4 rounded-lg text-xs font-bold cursor-pointer transition"
                  >
                    إلغاء
                  </button>
                </div>

              </form>

            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
