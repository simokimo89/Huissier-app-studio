/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { 
  FolderClosed, 
  FileText, 
  CheckCircle, 
  Database, 
  TrendingUp, 
  ArrowLeftRight, 
  Network,
  RefreshCw,
  Clock,
  Bell,
  Calendar,
  Trash2
} from 'lucide-react';
import { JudicialFile, User, LocalAlert } from '../types';

interface DashboardViewProps {
  files: JudicialFile[];
  pendingSyncCount: number;
  user: User;
  onSetTab: (tab: string) => void;
  onSelectFileForReport: (file: JudicialFile) => void;
  onTriggerSync: () => void;
  alerts: LocalAlert[];
  onScheduleAlert: (newAlert: Omit<LocalAlert, 'id' | 'isTriggered' | 'isCompleted' | 'createdAt'>) => void;
  onCompleteAlert: (id: string) => void;
  onDeleteAlert: (id: string) => void;
  onSnoozeAlert: (id: string, minutes?: number) => void;
  onTriggerTestAlert: (id: string) => void;
}

export default function DashboardView({
  files,
  pendingSyncCount,
  user,
  onSetTab,
  onSelectFileForReport,
  onTriggerSync,
  alerts,
  onScheduleAlert,
  onCompleteAlert,
  onDeleteAlert,
  onSnoozeAlert,
  onTriggerTestAlert,
}: DashboardViewProps) {
  const [serverStats, setServerStats] = useState<any>(null);
  const [isLoadingServer, setIsLoadingServer] = useState(false);

  // Advanced offline appointment scheduler & calendar states
  const [activeAlertFilter, setActiveAlertFilter] = useState<'all' | 'high' | 'notification' | 'session' | 'completed'>('all');
  const [schedulerFileId, setSchedulerFileId] = useState<string>('');
  const [schedulerType, setSchedulerType] = useState<'session' | 'notification' | 'execution' | 'preview' | 'other'>('notification');
  const [schedulerTitle, setSchedulerTitle] = useState<string>('تبليغ الإعذار الرسمي ومطالبة الأداء');
  const [schedulerCustomTitle, setSchedulerCustomTitle] = useState<string>('');
  const [schedulerDate, setSchedulerDate] = useState<string>('');
  const [schedulerPriority, setSchedulerPriority] = useState<'high' | 'medium' | 'low'>('high');
  const [schedulerNote, setSchedulerNote] = useState<string>('');
  const [schedulerSuccessMsg, setSchedulerSuccessMsg] = useState<string>('');

  const presetTemplates = {
    notification: [
      'تبليغ الإعذار الرسمي ومطالبة الأداء',
      'تبليغ طي الاستدعاء لحضور الجلسة',
      'تبليغ حكم قضائي ابتدائي مع السند التنفيذي',
      'إشعار بالدفع والامتثال تحت طائلة الحجز'
    ],
    session: [
      'جلسة النطق بالحكم أو التمديد',
      'جلسة عوارض وبحث في مكتب القاضي المقر',
      'جلسة تحديد القيمة الافتتاحية للبيع المزاد',
      'تبليغ مصلحة الاستيفاء والمطابقة بالنيابة العامة'
    ],
    execution: [
      'تنفيذ الحجز التنفيذي أو التحفظي ممتلكات المنفذ عليه',
      'إفراغ العقار وتحرير المحضر بالقوة العمومية',
      'جرد السلع والأصول والتسعير الأولي',
      'إجراء بيع بالمزاد العلني في السوق أو العقار'
    ],
    preview: [
      'معاينة عينية وإثبات حالة عقار أو ورش بناء',
      'إشعار تصويري فوري وإحداثيات GPS للمخالفة',
      'معاينة ومطابقة الحساب البنكي والمنقولات الرقمية',
      'إثبت حالة مستعجلة للعيوب اللاحقة بمحل تجاري'
    ],
    other: [
      'مأمورية عامة طارئة',
      'أرشفة وقفل وتوثيق ملف قضائي نهائي',
      'تحديث كشف السحب والتصفية المالية للمقاصة'
    ]
  };

  useEffect(() => {
    const list = presetTemplates[schedulerType];
    if (list && list.length > 0) {
      setSchedulerTitle(list[0]);
    } else {
      setSchedulerTitle('custom');
    }
  }, [schedulerType]);

  useEffect(() => {
    if (files.length > 0 && !schedulerFileId) {
      const firstAvailable = files[0].id || '';
      setSchedulerFileId(firstAvailable);
    }
  }, [files, schedulerFileId]);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!schedulerFileId || !schedulerDate) {
      alert('الرجاء تزويد الموعد وتحديد الملف المرجعي للمطابقة القضائية');
      return;
    }

    const matchedFile = files.find(f => f.id === schedulerFileId);
    if (!matchedFile) return;

    const finalTitle = schedulerTitle === 'custom' ? schedulerCustomTitle : schedulerTitle;

    onScheduleAlert({
      fileId: schedulerFileId,
      caseNumber: matchedFile.caseNumber,
      defendantName: matchedFile.defendantName,
      title: finalTitle || 'مأمورية قضائية مجدولة',
      alertType: schedulerType,
      appointmentDate: schedulerDate,
      note: schedulerNote,
      priority: schedulerPriority
    });

    setSchedulerNote('');
    setSchedulerCustomTitle('');
    setSchedulerSuccessMsg('تمت جدولة الموعد بنجاح ومزامنته بآلية السيرفر المحلي 🗓️');
    
    setTimeout(() => {
      setSchedulerSuccessMsg('');
    }, 4000);
  };

  const getRelativeTimeArabic = (dateStr: string) => {
    const now = new Date();
    const target = new Date(dateStr);
    const diffMs = target.getTime() - now.getTime();
    const diffMins = Math.round(diffMs / 60000);
    const diffHours = Math.round(diffMs / 3600000);
    const diffDays = Math.round(diffMs / 86400000);

    if (diffMs < 0) {
      if (Math.abs(diffMins) < 60) return `منذ ${Math.abs(diffMins)} دقيقة (فائت)`;
      if (Math.abs(diffHours) < 24) return `منذ ${Math.abs(diffHours)} ساعة (فائت)`;
      return `مضى عليه ${Math.abs(diffDays)} أيام`;
    }

    if (diffMins < 60) {
      return `متبقي ${diffMins} دقيقة 🚨`;
    }

    if (diffHours < 24) {
      if (target.getDate() === now.getDate()) {
        return `اليوم، متبقي ${diffHours} ساعة وافية`;
      } else {
        return `غداً، متبقي ${diffHours} ساعة وافية`;
      }
    }

    if (diffDays === 1) return 'غداً صباحاً بالتوقيت المعين';
    if (diffDays === 2) return 'خلال يومين اثنين';
    return `متبقي ${diffDays} أيام في الأجل`;
  };

  const filteredAlerts = alerts.filter(alt => {
    const isCompletedVal = activeAlertFilter === 'completed';
    if (activeAlertFilter === 'all') return !alt.isCompleted;
    if (activeAlertFilter === 'completed') return alt.isCompleted;
    if (activeAlertFilter === 'high') return alt.priority === 'high' && !alt.isCompleted;
    if (activeAlertFilter === 'notification') return alt.alertType === 'notification' && !alt.isCompleted;
    if (activeAlertFilter === 'session') return alt.alertType === 'session' && !alt.isCompleted;
    return true;
  });

  // Read central mirrored Postgres server database state to showcase sync
  const fetchServerRecords = async () => {
    setIsLoadingServer(true);
    try {
      const response = await fetch('/api/server-records');
      if (response.ok) {
        const data = await response.json();
        setServerStats(data);
      }
    } catch (err) {
      console.warn('Central server records are unreachable:', err);
    } finally {
      setIsLoadingServer(false);
    }
  };

  useEffect(() => {
    fetchServerRecords();
  }, [pendingSyncCount]);

  // Tallies
  const totalLocal = files.length;
  const pendingNotification = files.filter(f => f.status === 'pending' || f.status === 'inprogress').length;
  const servedCount = files.filter(f => f.status === 'served').length;
  const totalDeposits = files.reduce((acc, current) => acc + (current.depositAmount || 0), 0);

  return (
    <div className="space-y-8 animate-fade-in" id="dashboard-container">
      {/* Welcome Banner */}
      <div className="bg-slate-900 border border-slate-800 text-white rounded-2xl p-6 md:p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute inset-0 bg-cover bg-center opacity-[0.02] pointer-events-none" style={{ backgroundImage: "url('https://img.icons8.com/color/192/justice-scales.png')" }}></div>
        <div className="relative z-10 space-y-2">
          <p className="text-blue-400 text-xs font-bold tracking-widest uppercase mb-1">لوحة القيادة - نظام التدبير القضائي الموحد</p>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-white">مرحباً بك، {user.name}</h2>
          <p className="text-slate-400 text-xs md:text-sm max-w-4xl leading-relaxed">
            نظام مكتب المفوض القضائي يعمل حالياً بكامل طاقته الاتصالية. يمكنك تسجيل ملفات المتقاضين، معالجة محاضر التنفيذ والتبليغ، تسوية المقاصة والجرائد المالية، والعمل ميدانياً في الحقول والقرى البعيدة بثقة تامة (وضع Offline) عبر التشفير العسكري لقاعدة البيانات المحلية المتزامنة تفاضلياً.
          </p>
        </div>

      </div>

      {/* Numerical Metrics Grid strictly styled with Immersive UI details */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-sm flex items-center justify-between" id="metric-local-files">
          <div>
            <span className="text-xs font-semibold text-slate-500 block mb-1">إجمالي الملفات محلياً</span>
            <span className="text-2xl font-bold text-white tracking-tight" id="stat-total-files">{totalLocal}</span>
            <div className="mt-2 flex items-center gap-2 text-[10px] text-blue-400 font-bold">
              <span className="bg-blue-400/10 px-1.5 py-0.5 rounded">نشطة بالصندوق</span>
            </div>
          </div>
          <div className="bg-blue-600/10 p-3 rounded-xl text-blue-500">
            <FolderClosed className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-sm flex items-center justify-between" id="metric-pending-tasks">
          <div>
            <span className="text-xs font-semibold text-slate-500 block mb-1">إجراءات قيد الانتظار</span>
            <span className="text-2xl font-bold text-white tracking-tight" id="stat-pending-tasks">{pendingNotification}</span>
            <div className="mt-2 flex items-center gap-2 text-[10px] text-amber-400 font-bold">
              <span className="bg-amber-400/10 px-1.5 py-0.5 rounded">مأمورية ميدانية</span>
            </div>
          </div>
          <div className="bg-amber-500/10 p-3 rounded-xl text-amber-500">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-sm flex items-center justify-between" id="metric-served-tasks">
          <div>
            <span className="text-xs font-semibold text-slate-500 block mb-1">المحاضر المنجزة والمبلغة</span>
            <span className="text-2xl font-bold text-white tracking-tight" id="stat-served-tasks">{servedCount}</span>
            <div className="mt-2 flex items-center gap-2 text-[10px] text-emerald-400 font-bold">
              <span className="bg-emerald-400/10 px-1.5 py-0.5 rounded">مغلق بالكامل</span>
            </div>
          </div>
          <div className="bg-emerald-500/10 p-3 rounded-xl text-emerald-400">
            <CheckCircle className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-sm flex items-center justify-between" id="metric-escrow-balance">
          <div>
            <span className="text-xs font-semibold text-slate-500 block mb-1">التحصيلات والمصاريف</span>
            <span className="text-2xl font-bold text-white tracking-tight font-mono" id="stat-deposits-balance">
              {totalDeposits.toLocaleString('en-US', { minimumFractionDigits: 2 })} <span className="text-xs text-slate-400">د.م</span>
            </span>
            <div className="mt-2 flex items-center gap-2 text-[10px] text-blue-400 font-bold">
              <span className="bg-blue-400/10 px-1.5 py-0.5 rounded">مؤمن بالكامل</span>
            </div>
          </div>
          <div className="bg-blue-600/10 p-3 rounded-xl text-blue-500">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

      </div>

      {/* Row representing Offline Status Warning / Sync State */}
      {pendingSyncCount > 0 && (
        <div className="bg-amber-950/20 border border-amber-900/50 rounded-2xl p-4.5 flex flex-col md:flex-row justify-between items-center gap-4 transition-all" id="warning-sync-bar">
          <div className="flex items-center gap-3">
            <div className="bg-amber-600 text-white p-2.5 rounded-xl shadow-lg shadow-amber-900/20 animate-bounce">
              <ArrowLeftRight className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-amber-400 text-sm">مستندات معالجة معلقة لم تتم مزامنتها!</h4>
              <p className="text-xs text-slate-400 mt-1">
                لديك {pendingSyncCount} سجلات قانونية ومحاضر تم توثيقها وتوقيعها محلياً تحتفظ بها قاعدة البيانات لحين تغطية الإنترنت.
              </p>
            </div>
          </div>
          <button
            onClick={onTriggerSync}
            className="w-full md:w-auto bg-amber-600 hover:bg-amber-700 text-white font-bold py-2.5 px-6 rounded-lg text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
            id="dash-sync-now-btn"
          >
            <RefreshCw className="w-4 h-4" />
            <span>مزامنة تفاضلية الآن</span>
          </button>
        </div>
      )}

      {/* SECTION: Judicial Client Appointments Board & Scheduler Bento Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8" id="judicial-appointments-bento-grid">
        
        {/* Left Bento: Upcoming Judicial Appointments Monitor (lg:col-span-7) */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-3xl p-6 flex flex-col justify-between space-y-6 relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-blue-500/20 to-transparent"></div>
          
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <span className="text-[10px] text-blue-400 font-extrabold uppercase tracking-wider block mb-1">المفوض الذكي - السجل المحلي للمهام ⏰</span>
                <h3 className="text-base font-black text-white flex items-center gap-2">
                  <Bell className="w-5 h-5 text-blue-500" />
                  <span>المواعيد والتبليغات الميدانية المجدولة</span>
                </h3>
              </div>
              
              {/* Active Clock Panel for Bailiffs */}
              <div className="bg-slate-950/80 border border-slate-800/80 px-4 py-2 rounded-2xl flex items-center gap-2.5">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                <span className="text-xs font-mono font-extrabold text-slate-300">
                  {new Date().toLocaleDateString('ar-MA', { weekday: 'long', day: 'numeric', month: 'long' })}
                </span>
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex flex-wrap gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800/40">
              <button
                onClick={() => setActiveAlertFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${activeAlertFilter === 'all' ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30 font-black' : 'text-slate-400 hover:text-white border border-transparent'}`}
              >
                المعلقة ({alerts.filter(x => !x.isCompleted).length})
              </button>
              <button
                onClick={() => setActiveAlertFilter('high')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${activeAlertFilter === 'high' ? 'bg-rose-600/20 text-rose-400 border border-rose-500/30 font-black' : 'text-slate-400 hover:text-white border border-transparent'}`}
              >
                عاجل ({alerts.filter(x => !x.isCompleted && x.priority === 'high').length})
              </button>
              <button
                onClick={() => setActiveAlertFilter('notification')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${activeAlertFilter === 'notification' ? 'bg-blue-600/20 text-slate-300 border border-blue-500/30' : 'text-slate-400 hover:text-white border border-transparent'}`}
              >
                تبليغات ({alerts.filter(x => !x.isCompleted && x.alertType === 'notification').length})
              </button>
              <button
                onClick={() => setActiveAlertFilter('session')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${activeAlertFilter === 'session' ? 'bg-blue-600/20 text-slate-300 border border-blue-500/30' : 'text-slate-400 hover:text-white border border-transparent'}`}
              >
                جلسات ({alerts.filter(x => !x.isCompleted && x.alertType === 'session').length})
              </button>
              <button
                onClick={() => setActiveAlertFilter('completed')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${activeAlertFilter === 'completed' ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30' : 'text-slate-400 hover:text-white border border-transparent'}`}
              >
                المكتملة ({alerts.filter(x => x.isCompleted).length})
              </button>
            </div>
          </div>

          {/* List display */}
          <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
            {filteredAlerts.length === 0 ? (
              <div className="text-center py-10 bg-slate-950 rounded-2xl border border-slate-800 space-y-3">
                <div className="bg-slate-900 border border-slate-800 w-12 h-12 rounded-full flex items-center justify-center mx-auto text-slate-600">
                  <Calendar className="w-5 h-5 text-slate-400" />
                </div>
                <p className="text-slate-400 text-xs font-semibold">لا توجد مواعيد قضائية أو تنبيهات مطابقة لهذا الفلتر.</p>
                <p className="text-[10px] text-slate-500 max-w-sm mx-auto">امسح الفلتر أو قم بجدولة موعد/إنذار جديد على أحد الملفات المتاحة بالمكتب لتتبعه ميدانياً.</p>
              </div>
            ) : (
              filteredAlerts.map(alt => {
                const correspondingFile = files.find(f => f.id === alt.fileId || f.caseNumber === alt.caseNumber);
                
                return (
                  <div
                    key={alt.id}
                    className={`p-4 rounded-xl border transition-all ${alt.isCompleted ? 'bg-slate-950/40 border-slate-800 opacity-60' : alt.priority === 'high' ? 'bg-rose-950/10 border-rose-900/30 hover:border-rose-800/50' : 'bg-slate-950 border-slate-800 hover:border-slate-800'} space-y-3`}
                  >
                    <div className="flex justify-between items-start gap-3">
                      <div className="space-y-1 text-right">
                        <div className="flex items-center gap-2 flex-wrap justify-start">
                          <span className={`text-[9px] px-2 py-0.5 rounded-full font-extrabold border ${alt.alertType === 'session' ? 'bg-blue-950/60 border-blue-900/40 text-blue-400' : alt.alertType === 'notification' ? 'bg-indigo-950/60 border-indigo-900/40 text-indigo-400' : alt.alertType === 'execution' ? 'bg-amber-950/60 border-amber-900/40 text-amber-400' : alt.alertType === 'preview' ? 'bg-cyan-950/60 border-cyan-900/40 text-cyan-400' : 'bg-slate-900 border-slate-800 text-slate-400'}`}>
                            {alt.alertType === 'session' && 'جلسة محكمة'}
                            {alt.alertType === 'notification' && 'طلب تبليغ رسمي'}
                            {alt.alertType === 'execution' && 'تنفيذ وحجز مال'}
                            {alt.alertType === 'preview' && 'إثبات حالة معاينة'}
                            {alt.alertType === 'other' && 'إجراء عام'}
                          </span>
                          
                          <span className="text-[10px] bg-slate-900 text-slate-400 px-2 py-0.5 rounded-md font-mono font-bold" title="رقم الملف القضائي">
                            {alt.caseNumber}
                          </span>

                          {alt.priority === 'high' && !alt.isCompleted && (
                            <span className="flex h-2 w-2 relative">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                            </span>
                          )}
                        </div>

                        <h4 className={`text-xs font-extrabold ${alt.isCompleted ? 'text-slate-500 line-through' : 'text-slate-100'}`}>
                          {alt.title}
                        </h4>

                        <div className="text-[10px] text-slate-400 flex items-center justify-start gap-1">
                          <span className="text-slate-500 font-bold">المنفذ ضدّه:</span>
                          <span className="text-slate-300">{alt.defendantName}</span>
                        </div>
                      </div>

                      {/* Remaining timing countdown pill */}
                      {!alt.isCompleted && (
                        <div className="text-left shrink-0">
                          <span className="text-[9px] bg-slate-900 border border-slate-800 text-amber-500 px-2.5 py-1 rounded-lg font-extrabold block">
                            {getRelativeTimeArabic(alt.appointmentDate)}
                          </span>
                        </div>
                      )}
                    </div>

                    {alt.note && (
                      <p className="text-[11px] text-slate-400 bg-slate-900/30 p-2.5 rounded-lg border border-slate-800 text-right leading-normal">
                        <strong className="text-slate-400">التوجيه القضائي:</strong> {alt.note}
                      </p>
                    )}

                    <div className="flex items-center justify-between border-t border-slate-800 pt-2.5 mt-1">
                      <div className="flex gap-2">
                        {!alt.isCompleted && (
                          <button
                            onClick={() => onCompleteAlert(alt.id)}
                            className="text-[10px] bg-slate-900 hover:bg-emerald-600 hover:text-white border border-slate-800 hover:border-emerald-600 px-2.5 py-1.5 rounded-lg cursor-pointer transition-all font-bold flex items-center gap-1"
                            title="تعليم على الإجراء كمكتمل"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                            <span>تم الإنجاز</span>
                          </button>
                        )}

                        <button
                          onClick={() => onDeleteAlert(alt.id)}
                          className="text-[10px] bg-slate-900 hover:bg-rose-950 hover:text-rose-400 border border-slate-800 hover:border-rose-900 px-2.5 py-1.5 rounded-lg cursor-pointer transition-all font-bold"
                          title="حذف هذا التنبيه من الجدول"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="flex gap-1.5 items-center">
                        {/* Instant Test simulation button in dashboard list */}
                        {!alt.isCompleted && (
                          <button
                            onClick={() => onTriggerTestAlert(alt.id)}
                            className="text-[9px] bg-blue-600/10 hover:bg-blue-600 hover:text-white border border-blue-500/20 text-blue-400 px-2.5 py-1.5 rounded-lg font-mono font-bold transition-all cursor-pointer"
                            title="تعديل وقت الإنذار فورياً لاختبار تفعيل شاشة الطوارئ وتنبيه الطنين"
                          >
                            محاكاة اختبار رنين التنبيه 🔔
                          </button>
                        )}
                        
                        {correspondingFile && !alt.isCompleted && (
                          <button
                            onClick={() => onSelectFileForReport(correspondingFile)}
                            className="text-[9px] bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-2.5 py-1.5 rounded-lg font-extrabold transition-all cursor-pointer"
                          >
                            مسودة المحضر القضائي
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="text-[9px] text-slate-500 bg-blue-950/10 border border-blue-900/10 p-3 rounded-2xl flex items-center justify-center gap-2">
            <span>💡 نصيحة للتبليغ الميداني: انقر على زر "مسودة المحضر القضائي" للمرور الفوري وتدوين المحضر من المعاينة.</span>
          </div>
        </div>

        {/* Right Bento: Smart Quick Scheduler Form */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-3xl p-6 flex flex-col justify-between space-y-4 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-blue-500/20 to-transparent"></div>
          
          <div className="space-y-4">
            <div>
              <span className="text-[10px] text-amber-500 font-extrabold uppercase tracking-wider block mb-1">جدولة سريعة ومأمونة للنشاط ⚖️</span>
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <Calendar className="w-5 h-5 text-amber-500" />
                <span>جدولة وتنبيه ميداني مستعجل</span>
              </h3>
            </div>

            {schedulerSuccessMsg && (
              <div className="bg-sky-950/40 border border-sky-900/40 rounded-xl p-3.5 text-center text-xs font-extrabold text-blue-400 animate-slide-up">
                {schedulerSuccessMsg}
              </div>
            )}

            <form onSubmit={handleFormSubmit} className="space-y-4 text-xs" id="quick-scheduler-form">
              {/* Case Dropdown */}
              <div className="space-y-1.5">
                <label className="text-slate-400 font-bold block text-right">الملف القضائي المرتبط بالجدولة:</label>
                <select
                  value={schedulerFileId}
                  onChange={(e) => setSchedulerFileId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-300 py-2.5 px-3 rounded-xl focus:border-blue-500 font-semibold focus:outline-none text-right"
                  required
                >
                  <option value="" disabled>-- واختر الملف القضائي للمطابقة --</option>
                  {files.map(file => (
                    <option key={file.id} value={file.id}>
                      الملف {file.caseNumber} - المطلوب: {file.defendantName}
                    </option>
                  ))}
                </select>
                <span className="text-[9px] text-slate-600 block text-right">يستخرج خيارات المطابقة من الملفات النشطة حالياً بالمكتب.</span>
              </div>

              {/* Appointment Type */}
              <div className="space-y-1.5">
                <label className="text-slate-400 font-bold block text-right">نوع المأمورية أو الموعد:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSchedulerType('notification')}
                    className={`p-2 rounded-xl text-center font-bold text-xs border transition-all cursor-pointer ${schedulerType === 'notification' ? 'bg-indigo-600/10 border-indigo-500 text-indigo-400 font-black' : 'bg-slate-950 border-slate-800 text-slate-500'}`}
                  >
                    تبليغ رسمي
                  </button>
                  <button
                    type="button"
                    onClick={() => setSchedulerType('session')}
                    className={`p-2 rounded-xl text-center font-bold text-xs border transition-all cursor-pointer ${schedulerType === 'session' ? 'bg-blue-600/10 border-blue-500 text-blue-400 font-black' : 'bg-slate-950 border-slate-800 text-slate-500'}`}
                  >
                    جلسة محاكمة
                  </button>
                  <button
                    type="button"
                    onClick={() => setSchedulerType('execution')}
                    className={`p-2 rounded-xl text-center font-bold text-xs border transition-all cursor-pointer ${schedulerType === 'execution' ? 'bg-amber-600/10 border-amber-500 text-amber-400 font-black' : 'bg-slate-950 border-slate-800 text-slate-500'}`}
                  >
                    مأمورية تنفيذ
                  </button>
                  <button
                    type="button"
                    onClick={() => setSchedulerType('preview')}
                    className={`p-2 rounded-xl text-center font-bold text-xs border transition-all cursor-pointer ${schedulerType === 'preview' ? 'bg-cyan-600/10 border-cyan-500 text-cyan-400 font-black' : 'bg-slate-950 border-slate-800 text-slate-500'}`}
                  >
                    إثبات حالة
                  </button>
                </div>
              </div>

              {/* Event Title Template Options */}
              <div className="space-y-1.5">
                <label className="text-slate-400 font-bold block text-right">موضوع أو قالب الإجراء القضائي:</label>
                <select
                  value={schedulerTitle}
                  onChange={(e) => setSchedulerTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-300 py-2.5 px-3 rounded-xl focus:border-blue-500 focus:outline-none text-right"
                >
                  {presetTemplates[schedulerType]?.map((tmpl, idx) => (
                    <option key={idx} value={tmpl}>{tmpl}</option>
                  ))}
                  <option value="custom">-- موضوع مخصص يدوي --</option>
                </select>
              </div>

              {/* Custom Title Input */}
              {schedulerTitle === 'custom' && (
                <div className="space-y-1.5 animate-slide-up">
                  <label className="text-slate-400 font-bold block text-right">اكتب المأمورية مخصصة:</label>
                  <input
                    type="text"
                    required
                    value={schedulerCustomTitle}
                    onChange={(e) => setSchedulerCustomTitle(e.target.value)}
                    placeholder="اكتب تفصيل المأمورية يدوياً..."
                    className="w-full bg-slate-950 border border-slate-800 text-slate-200 py-2.5 px-3 rounded-xl focus:border-blue-500 focus:outline-none text-right"
                  />
                </div>
              )}

              {/* Date & Time Scheduling */}
              <div className="space-y-1.5">
                <label className="text-slate-400 font-bold block text-right">التاريخ والمواقيت الميدانية (أجل):</label>
                <input
                  type="datetime-local"
                  required
                  value={schedulerDate}
                  onChange={(e) => setSchedulerDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-200 py-2.5 px-3 rounded-xl font-mono focus:border-blue-500 focus:outline-none text-right"
                />
              </div>

              {/* Priority Rating */}
              <div className="space-y-1.5">
                <label className="text-slate-400 font-bold block text-right">مستوى ومؤشر الأهمية:</label>
                <div className="flex justify-start gap-4" dir="rtl">
                  <label className="flex items-center gap-1.5 text-slate-300 font-bold cursor-pointer">
                    <input
                      type="radio"
                      name="scheduler-priority"
                      checked={schedulerPriority === 'high'}
                      onChange={() => setSchedulerPriority('high')}
                      className="accent-rose-600"
                    />
                    <span>عاجل جداً</span>
                  </label>
                  <label className="flex items-center gap-1.5 text-slate-300 font-bold cursor-pointer">
                    <input
                      type="radio"
                      name="scheduler-priority"
                      checked={schedulerPriority === 'medium'}
                      onChange={() => setSchedulerPriority('medium')}
                      className="accent-amber-500"
                    />
                    <span>متوسط الأجل</span>
                  </label>
                  <label className="flex items-center gap-1.5 text-slate-300 font-bold cursor-pointer">
                    <input
                      type="radio"
                      name="scheduler-priority"
                      checked={schedulerPriority === 'low'}
                      onChange={() => setSchedulerPriority('low')}
                      className="accent-blue-500"
                    />
                    <span>عادي / اعتيادي</span>
                  </label>
                </div>
              </div>

              {/* Text Area Instructions */}
              <div className="space-y-1.5">
                <label className="text-slate-400 font-bold block text-right">توصيات وملاحظات مأمورية المفوض القضائي:</label>
                <textarea
                  value={schedulerNote}
                  onChange={(e) => setSchedulerNote(e.target.value)}
                  placeholder="التوصيات الخاصة بالموقع، الاتصال، القاضي المقر أو غيرها لجردها بالمحضر..."
                  rows={2}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-200 p-3 rounded-xl focus:border-blue-500 focus:outline-none text-right"
                />
              </div>

              {/* Submit trigger button */}
              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-3 px-5 rounded-xl transition duration-200 cursor-pointer text-xs flex items-center justify-center gap-2"
              >
                <span>حفظ وجدولة المأمورية الآن</span>
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Main Screen Split: Quick Launch and Postgres Database Mirror Mirror */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Quick Launch and Operations (LHS) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-sm p-6">
            <h3 className="text-sm font-bold text-white border-b border-slate-800 pb-3.5 mb-6 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(37,99,235,0.6)]"></div>
              إجراءات العمليات السريعة من الميدان
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {user.role !== 'accountant' && (
                <button
                  onClick={() => onSetTab('files')}
                  className="p-5 rounded-xl border border-slate-800 bg-slate-950/40 hover:bg-slate-950 hover:border-blue-500 text-right group transition-all cursor-pointer"
                  id="dash-launch-add-file"
                >
                  <h4 className="font-bold text-slate-100 text-sm group-hover:text-blue-400 transition-colors">سجل تبليغ جديد</h4>
                  <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">تفريغ معطيات المتقاضين من المحاكم مع عنونة ذكية ومصادقة سريعة</p>
                </button>
              )}

              {user.role !== 'accountant' && (
                <button
                  onClick={() => onSetTab('files')}
                  className="p-5 rounded-xl border border-slate-800 bg-slate-950/40 hover:bg-slate-950 hover:border-blue-500 text-right group transition-all cursor-pointer"
                  id="dash-launch-report"
                >
                  <h4 className="font-bold text-slate-100 text-sm group-hover:text-blue-400 transition-colors">تحرير محضر عيني</h4>
                  <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">تفويض الملاحظات وتنزيل الإحداثيات وتوقيع المحضر فورياً من الحقل</p>
                </button>
              )}

              {user.role !== 'assistant' && (
                <button
                  onClick={() => onSetTab('ledger')}
                  className="p-5 rounded-xl border border-slate-800 bg-slate-950/40 hover:bg-slate-950 hover:border-blue-500 text-right group transition-all cursor-pointer"
                  id="dash-launch-accounting"
                >
                  <h4 className="font-bold text-slate-100 text-sm group-hover:text-blue-400 transition-colors">محاسبة الصناديق والمقاصة</h4>
                  <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">إصدار وصولات الأتعاب الميدانية، تمبر المحكمة، وموجز الحساب الصندوقي</p>
                </button>
              )}

              <button
                onClick={fetchServerRecords}
                className="p-5 rounded-xl border border-slate-800 bg-slate-950/40 hover:bg-slate-950 hover:border-blue-500 text-right group transition-all cursor-pointer"
                id="dash-launch-refresh"
              >
                <div className="flex justify-between items-center">
                  <h4 className="font-bold text-slate-100 text-sm">تحديث خادم الوزارة والاتصال</h4>
                  <RefreshCw className={`w-3.5 h-3.5 text-slate-400 ${isLoadingServer ? 'animate-spin' : ''}`} />
                </div>
                <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">إعادة قراءة الحصيلة وتحديث القيود السيرفرية وقاعدة البيانات المركزية</p>
              </button>

            </div>
          </div>

          {/* Pending Tasks Quick List */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-sm p-6">
            <h3 className="text-sm font-bold text-white border-b border-slate-800 pb-3.5 mb-4 flex justify-between items-center">
              <span>آخر الملفات قيد الانتظار (إجراءات ميدانية)</span>
              <span className="text-[10px] bg-slate-950 text-slate-400 px-2 py-1 rounded-full font-bold border border-slate-800">إجمالي {pendingNotification} ملف</span>
            </h3>

            {files.filter(f => f.status === 'pending' || f.status === 'inprogress').length === 0 ? (
              <div className="text-center py-6 text-slate-500 text-xs font-semibold">
                لا توجد مهمات معلقة حالياً في جدولك الميداني اليوم!
              </div>
            ) : (
              <div className="divide-y divide-slate-800">
                {files.filter(f => f.status === 'pending' || f.status === 'inprogress').slice(0, 3).map((file) => (
                  <div key={file.id} className="py-3.5 flex justify-between items-center gap-2">
                    <div className="min-w-0 flex-1 text-right">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-blue-400">{file.caseNumber}</span>
                        <span className="text-[9px] bg-slate-950 text-slate-300 px-2 py-0.5 rounded-full font-bold border border-slate-800">
                          {file.caseType === 'notification' ? 'تبليغ' : file.caseType === 'execution' ? 'تنفيذ قضائي' : 'معاينة حال'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 mt-1.5 truncate">المدعى عليه: <strong className="text-slate-100">{file.defendantName}</strong></p>
                      <p className="text-[11px] text-slate-500 truncate mt-0.5">{file.defendantAddress}</p>
                    </div>
                    {user.role !== 'accountant' && (
                      <button
                        onClick={() => onSelectFileForReport(file)}
                        className="bg-blue-600 text-white hover:bg-blue-700 text-xs font-bold py-1.5 px-3 rounded-lg flex items-center gap-1 shrink-0 transition cursor-pointer"
                      >
                        إنجاز محضر
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Live Central Postgres Mirror Database Sync Viewer (RHS) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-sm p-6 relative z-10 overflow-hidden">
            <div className="absolute right-3 top-3 opacity-5 pointer-events-none">
              <Database className="w-16 h-16 text-blue-400" />
            </div>

            <div className="flex justify-between items-center border-b border-slate-800 pb-3 mb-4">
              <h3 className="text-xs font-bold text-blue-400 flex items-center gap-2">
                <Network className="w-4 h-4 animate-pulse text-emerald-400" />
                سيرفر المزامنة المركزي (قاعدة PostgreSQL)
              </h3>
              <span className="text-[9px] bg-emerald-900/30 text-emerald-400 px-2.5 py-0.5 rounded-full font-bold border border-emerald-800/30 uppercase">
                بث مباشر
              </span>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed mb-6">
              تظهر هذه اللوحة محتويات قاعدة البيانات المركزية على خادم شبكة الوزارة. عندما تقوم بالمرور من وضع "Offline" وتطلق المزامنة، يتم نسخ بياناتك فوراً وتطبيق القيود هنا.
            </p>

            {/* Central Database Live Counters */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-center">
                <span className="text-[10px] text-slate-500 font-bold block mb-0.5">الملفات المرفوعة</span>
                <span className="text-xl font-bold text-white font-mono">
                  {serverStats?.stats?.filesCount ?? '---'}
                </span>
              </div>
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-center">
                <span className="text-[10px] text-slate-500 font-bold block mb-0.5">المحاضر المخزنة</span>
                <span className="text-xl font-bold text-white font-mono">
                  {serverStats?.stats?.reportsCount ?? '---'}
                </span>
              </div>
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-center">
                <span className="text-[10px] text-slate-500 font-bold block mb-0.5">الوسائط المرفقة</span>
                <span className="text-xl font-bold text-white font-mono">
                  {serverStats?.stats?.mediaCount ?? '---'}
                </span>
              </div>
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-center">
                <span className="text-[10px] text-slate-500 font-bold block mb-0.5">الفواتير المدققة</span>
                <span className="text-xl font-bold text-white font-mono">
                  {serverStats?.stats?.financialsCount ?? '---'}
                </span>
              </div>
            </div>

            {/* Preview of Centrally Mirror Reports */}
            <div className="space-y-3">
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-800 pb-1.5 mb-2 text-right">
                آخر المحاضر المؤكدة مركزياً (شجرة الحساب):
              </div>

              {serverStats?.records?.reports?.length === 0 ? (
                <div className="text-center py-4 text-xs text-slate-500 italic">
                  لم يتم ترحيل أي محاضر قضائية عينية من الحقل بعد.
                </div>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {serverStats?.records?.reports?.slice(-3).reverse().map((r: any) => {
                    const lFile = serverStats?.records?.files?.find((f: any) => f.id === r.fileId);
                    return (
                      <div key={r.id} className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 flex justify-between items-center gap-1 text-[11px] text-right">
                        <div>
                          <div className="font-bold font-mono text-white">{lFile?.caseNumber || 'ملف خارجي'}</div>
                          <div className="text-slate-500 mt-0.5 text-[9px]">تم الرفع الميداني بـ: <span className="text-blue-300 font-semibold">{r.reporterName}</span></div>
                        </div>
                        <div className="text-left shrink-0">
                          <span className="text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded text-[8px] font-bold border border-emerald-900/30">
                            مزامن ✔
                          </span>
                          <div className="text-slate-600 text-[8px] mt-0.5 font-mono">{new Date(r.createdAt).toLocaleTimeString('ar-MA')}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="mt-5 pt-3 border-t border-slate-800/80 text-center">
              <a
                href="/api/server-records"
                target="_blank"
                rel="noreferrer"
                className="text-xs text-blue-400 hover:text-blue-300 inline-flex items-center gap-1.5 text-center font-bold transition-colors"
              >
                رابط استعلام JSON المباشر لقاعدة البيانات المركزية ↗
              </a>
            </div>

          </div>
        </div>

      </div>

    </div>
  );
}
