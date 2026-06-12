/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Plus, 
  MapPin, 
  Scale, 
  ShieldAlert, 
  FolderCheck,
  Search,
  Lock,
  Unlock,
  Coins,
  Check
} from 'lucide-react';
import { JudicialFile } from '../types';

interface CaseManagementViewProps {
  files: JudicialFile[];
  onAddNewFile: (file: Omit<JudicialFile, 'id' | 'createdAt' | 'updatedAt' | 'isEncrypted'>) => Promise<string>;
  onSelectFileForReport: (file: JudicialFile) => void;
  userRole: string;
}

export default function CaseManagementView({
  files,
  onAddNewFile,
  onSelectFileForReport,
  userRole,
}: CaseManagementViewProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Search Filter Computation
  const filteredFiles = files.filter(file => {
    const term = searchTerm.toLowerCase();
    return (
      file.caseNumber.toLowerCase().includes(term) ||
      file.plaintiffName.toLowerCase().includes(term) ||
      file.defendantName.toLowerCase().includes(term) ||
      file.courtName.toLowerCase().includes(term)
    );
  });

  // Form Fields State
  const [caseNumber, setCaseNumber] = useState('');
  const [courtName, setCourtName] = useState('المحكمة الابتدائية بالرباط');
  const [plaintiffName, setPlaintiffName] = useState('');
  const [defendantName, setDefendantName] = useState('');
  const [defendantAddress, setDefendantAddress] = useState('');
  const [caseType, setCaseType] = useState<'notification' | 'execution' | 'preview'>('notification');
  const [depositAmount, setDepositAmount] = useState('500');
  
  const [formSuccess, setFormSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Pre-configured autocomplete address logs for Moroccan cities to accelerate field testing
  const AUTOCOMPLETE_ADDRESS_SHORTCUTS = [
    { city: 'الرباط', address: 'شارع فال ولد عمير، عمارة 112، شقة 5، أكدال، الرباط' },
    { city: 'الدار البيضاء', address: 'حي المعاريف، زنقة جاب بن حيان، رقم 18، الدار البيضاء' },
    { city: 'طنجة', address: 'شارع محمد الخامس، مجمع طنجة بوليفارد، بلوك ب، طنجة' },
    { city: 'بني ملال', address: 'حي الهدى، زنقة زرياب، رقم 20، بني ملال' }
  ];

  // Quick Court presets
  const COURT_PRESETS = [
    'المحكمة الابتدائية بالرباط',
    'المحكمة التجارية بالدار البيضاء',
    'المحكمة الابتدائية الإدارية بأكادير',
    'محكمة الاستئناف بالرباط',
    'المحكمة الابتدائية بطنجة',
    'المحكمة الابتدائية بتطوان',
    'محكمة الاستئناف بطنجة',
    'المحكمة التجارية بطنجة',
    'المحكمة الابتدائية بالحسيمة'
  ];

  const handleAutocompleteAddress = (address: string) => {
    setDefendantAddress(address);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!caseNumber || !plaintiffName || !defendantName || !defendantAddress) {
      alert('الرجاء ملء جميع الحقول الإلزامية لتأمين الملف!');
      return;
    }

    setIsSubmitting(true);
    try {
      await onAddNewFile({
        caseNumber: caseNumber.trim(),
        courtName,
        plaintiffName: plaintiffName.trim(),
        defendantName: defendantName.trim(),
        defendantAddress: defendantAddress.trim(),
        caseType,
        status: 'pending',
        depositAmount: parseFloat(depositAmount) || 0,
      });

      setFormSuccess('تم حفظ الملف وتشفيره وتدوينه بسجل المحكمة بنجاح! 🔒');
      
      // Reset Form fields
      setCaseNumber('');
      setPlaintiffName('');
      setDefendantName('');
      setDefendantAddress('');
      setDepositAmount('500');
      
      setTimeout(() => {
        setFormSuccess('');
        setShowAddForm(false);
      }, 2000);

    } catch (err) {
      console.error(err);
      alert('فشل حفظ الملف حالياً.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6" id="case-mgmt-view-container">
      
      {/* Header and Toggle Button */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800 pb-5">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Scale className="w-5.5 h-5.5 text-blue-500" />
            سجل الملفات القضائية العينية والجدولة
          </h2>
          <p className="text-xs text-slate-500 mt-1">تفريغ طلبات التبليغ والاستلام والتنفيذ الواردة من المحاكم الإدارية والتجارية بالمملكة.</p>
        </div>
        
        {userRole !== 'accountant' && (
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-5 rounded-xl text-xs shadow-lg shadow-blue-900/10 transition-all cursor-pointer"
            id="toggle-add-file-form-btn"
          >
            <Plus className="w-4 h-4" />
            <span>{showAddForm ? 'إخفاء استمارة الإضافة' : 'إضافة ملف قضائي جديد'}</span>
          </button>
        )}
      </div>

      {formSuccess && (
        <div className="bg-emerald-950/30 border border-emerald-800 text-emerald-400 p-4 rounded-xl text-xs font-bold text-center">
          {formSuccess}
        </div>
      )}

      {/* Adding judicial file (RTL Structured) with Immersive theme variables */}
      {showAddForm && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-sm p-6 animate-slide-up text-right" id="add-case-form-wrapper">
          <h3 className="text-sm font-bold text-white pb-3.5 mb-5 border-b border-slate-800 flex items-center gap-1.5 justify-start">
            استمارة إدخال ملف قانوني وتقييد المتقاضين بقفل التشفير [AES-256]
          </h3>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              
              {/* Case Tracking Number */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">رقم تتبع الملف (رقم الملف بالمحكمة) *</label>
                <input
                  type="text"
                  required
                  value={caseNumber}
                  onChange={(e) => setCaseNumber(e.target.value)}
                  placeholder="مثال: م-ت-2026-6631"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500 font-mono"
                  id="form-case-number-input"
                />
              </div>

              {/* Court Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">المحكمة المصدرة للحكم / الأمر *</label>
                <select
                  value={courtName}
                  onChange={(e) => setCourtName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                  id="form-court-selector"
                >
                  {COURT_PRESETS.map((court, idx) => (
                    <option key={idx} value={court}>{court}</option>
                  ))}
                </select>
              </div>

              {/* Plaintiff Name */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1.5 justify-start">
                  طالب الإجراء (المدعي) * 
                  <span className="text-[9px] bg-slate-950 border border-slate-800 text-slate-400 px-2 py-0.5 rounded-full flex items-center gap-1 font-bold">
                    <Lock className="w-2.5 h-2.5 text-blue-400" /> مشفَّر عسكرياً
                  </span>
                </label>
                <input
                  type="text"
                  required
                  value={plaintiffName}
                  onChange={(e) => setPlaintiffName(e.target.value)}
                  placeholder="الاسم الكامل أو اسم الشركة أو المؤسسة"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                  id="form-plaintiff-input"
                />
              </div>

              {/* Defendant Name */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1.5 justify-start">
                  المطلوب ضده الإجراء (المدعى عليه) *
                  <span className="text-[9px] bg-slate-950 border border-slate-800 text-slate-400 px-2 py-0.5 rounded-full flex items-center gap-1 font-bold">
                    <Lock className="w-2.5 h-2.5 text-blue-400" /> مشفَّر عسكرياً
                  </span>
                </label>
                <input
                  type="text"
                  required
                  value={defendantName}
                  onChange={(e) => setDefendantName(e.target.value)}
                  placeholder="الاسم الكامل للمطلوب تبليغه أو حجز ممتلكاته"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                  id="form-defendant-input"
                />
              </div>

              {/* Case Type */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">نوع المهمّة والإجراء الميداني</label>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => setCaseType('notification')}
                    className={`py-2 px-3 rounded-lg text-xs font-bold border transition duration-150 cursor-pointer ${caseType === 'notification' ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-900/10' : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-900'}`}
                  >
                    تبليغ وإنذار
                  </button>
                  <button
                    type="button"
                    onClick={() => setCaseType('execution')}
                    className={`py-2 px-3 rounded-lg text-xs font-bold border transition duration-150 cursor-pointer ${caseType === 'execution' ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-900/10' : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-900'}`}
                  >
                    تنفيذ وحجز
                  </button>
                  <button
                    type="button"
                    onClick={() => setCaseType('preview')}
                    className={`py-2 px-3 rounded-lg text-xs font-bold border transition duration-150 cursor-pointer ${caseType === 'preview' ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-900/10' : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-900'}`}
                  >
                    معاينة وإثبات حال
                  </button>
                </div>
              </div>

              {/* Cash Escrow Deposit */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1.5 justify-start">
                  <Coins className="w-3.5 h-3.5 text-blue-400" />
                  مبلغ الوديعة المسبقة المؤداة (درهم مغربي) *
                </label>
                <input
                  type="number"
                  required
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  placeholder="مثال: 800"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500 font-mono"
                  id="form-deposit-input"
                />
              </div>

            </div>

            {/* Defendant Address & Autocomplete Shortcuts */}
            <div>
              <div className="flex justify-between items-center mb-2 flex-row-reverse">
                <label className="block text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  عنونة المطلوب تبليغه وعنوان التواجد المختار *
                  <span className="text-[9px] bg-slate-950 border border-slate-800 text-slate-400 px-2 py-0.5 rounded-full flex items-center gap-1 font-bold">
                    <Lock className="w-2.5 h-2.5 text-blue-400" /> مشفَّر عسكرياً
                  </span>
                </label>
                <span className="text-[10px] text-slate-500 font-semibold">انقر لتسريع التجربة الميدانية:</span>
              </div>

              <div className="flex flex-wrap gap-2 mb-3 justify-end">
                {AUTOCOMPLETE_ADDRESS_SHORTCUTS.map((shortcut, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => handleAutocompleteAddress(shortcut.address)}
                    className="bg-slate-950 hover:bg-blue-600 hover:text-white text-slate-400 text-[10px] font-semibold py-1 px-3 rounded-lg border border-slate-800 hover:border-blue-500 transition cursor-pointer flex items-center gap-1.5 max-w-xs truncate"
                  >
                    <MapPin className="w-3 h-3 shrink-0 text-blue-500 group-hover:text-white" />
                    <span>{shortcut.city}</span>
                  </button>
                ))}
              </div>

              <textarea
                required
                rows={3}
                value={defendantAddress}
                onChange={(e) => setDefendantAddress(e.target.value)}
                placeholder="تفاصيل العمارة، الشقة، الشارع والمدينة لضمان استدلال الموظف ميدانياً..."
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                id="form-address-textarea"
              ></textarea>
            </div>

            {/* Form Actions */}
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="bg-slate-950 hover:bg-slate-900 text-slate-300 font-bold py-2.5 px-6 rounded-lg border border-slate-800 text-xs cursor-pointer"
              >
                إلغاء التعديل
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-8 rounded-lg text-xs shadow-md transition-all flex items-center gap-1 cursor-pointer"
                id="submit-case-btn"
              >
                {isSubmitting ? 'جاري الحفظ والتشفير...' : 'حفظ الملف بقفل التشفير'}
              </button>
            </div>

          </form>
        </div>
      )}

      {/* Database Search & List Explorer */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-sm p-6">
        
        {/* Seek Toolbar */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-center mb-6">
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute right-3.5 top-3 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="ابحث برقم الملف، اسم المدعي، أو اسم المنفذ عليه..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pr-10 pl-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              id="file-search-bar"
            />
          </div>

          <div className="text-xs text-slate-400 shrink-0 font-bold bg-slate-950 border border-slate-800 px-3.5 py-1.5 rounded-full flex items-center gap-1.5">
            <FolderCheck className="w-4 h-4 text-blue-500" />
            <span>الحصيلة المحلية: <strong className="text-white">{filteredFiles.length} ملف قضائي</strong></span>
          </div>
        </div>

        {/* Files Datagrid Table */}
        {filteredFiles.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-xs font-semibold">
            لا توجد ملفات تناسب عبارة البحث المدخلة حالياً. جرب البحث عن كلمة "تأمين" أو "بنك".
          </div>
        ) : (
          <div className="overflow-x-auto text-[11px]">
            <table className="w-full text-right divide-y divide-slate-800">
              <thead className="bg-slate-950 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                <tr>
                  <th scope="col" className="px-4 py-3 text-right">رقم الملف تتبع</th>
                  <th scope="col" className="px-4 py-3 text-right">المحكمة المصدرة</th>
                  <th scope="col" className="px-4 py-3 text-right">طالب الإجراء (المدعي)</th>
                  <th scope="col" className="px-4 py-3 text-right">المنفذ عليه (المدعى عليه)</th>
                  <th scope="col" className="px-4 py-3 text-right hidden lg:table-cell">عنوان التواجد المقيد</th>
                  <th scope="col" className="px-4 py-3 text-center">وديعة الصندوق</th>
                  <th scope="col" className="px-4 py-3 text-center">الوضعية القانونية</th>
                  {userRole !== 'accountant' && (
                    <th scope="col" className="px-4 py-3 text-center">خيارات الحقل</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                {filteredFiles.map((file) => (
                  <tr key={file.id} className="hover:bg-slate-950/40 transition-colors" id={`file-row-idx-${file.id}`}>
                    
                    {/* Case Number */}
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="font-extrabold font-mono text-blue-400">{file.caseNumber}</div>
                      <div className="text-[9px] text-slate-500 mt-0.5 font-bold">{new Date(file.createdAt).toLocaleDateString('ar-MA')}</div>
                    </td>

                    {/* Court Source */}
                    <td className="px-4 py-4">
                      <div className="text-white font-bold">{file.courtName}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5 font-bold">
                        {file.caseType === 'notification' && 'طلب تبليغ رسمي'}
                        {file.caseType === 'execution' && 'طلب حجز وتنفيذ'}
                        {file.caseType === 'preview' && 'طلب إثبات حال'}
                      </div>
                    </td>

                    {/* Plaintiff */}
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-1.5 justify-start">
                        <span className="text-blue-500 hover:text-blue-400 cursor-pointer text-xs" title="تم الرمز وفك التشفير محليًا بمحيطك الأمني">
                          <Unlock className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                        </span>
                        <span className="font-bold text-white truncate max-w-40 inline-block">{file.plaintiffName}</span>
                      </div>
                      <span className="text-[8px] bg-blue-950/40 text-blue-400 border border-blue-900/30 font-mono font-bold px-1.5 py-0.5 rounded-full mt-0.5 inline-block">
                        AES-256 ACTIVE
                      </span>
                    </td>

                    {/* Defendant */}
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-1.5 font-bold text-slate-300 justify-start">
                        <Unlock className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                        <span className="truncate max-w-40">{file.defendantName}</span>
                      </div>
                    </td>

                    {/* Defendant Address */}
                    <td className="px-4 py-4 hidden lg:table-cell text-slate-500 max-w-xs truncate font-bold">
                      {file.defendantAddress}
                    </td>

                    {/* Escrow Deposit amount */}
                    <td className="px-4 py-4 text-center font-bold font-mono text-slate-300 whitespace-nowrap">
                      {file.depositAmount} د.م.
                    </td>

                    {/* Legal Service Status */}
                    <td className="px-4 py-4 text-center whitespace-nowrap">
                      {file.status === 'pending' && (
                        <span className="bg-amber-950/40 border border-amber-900/30 text-amber-500 font-bold px-2.5 py-1 text-[10px] rounded-full inline-block">
                          بانتظار الانتقال
                        </span>
                      )}
                      {file.status === 'inprogress' && (
                        <span className="bg-blue-950/40 border border-blue-900/30 text-blue-400 font-bold px-2.5 py-1 text-[10px] rounded-full inline-block">
                          جاري المخابرة
                        </span>
                      )}
                      {file.status === 'served' && (
                        <span className="bg-emerald-950/40 border border-emerald-800 text-emerald-400 font-bold px-2.5 py-1 text-[10px] rounded-full inline-block font-sans">
                          تمت الميدانية ✔
                        </span>
                      )}
                      {file.status === 'failed' && (
                        <span className="bg-slate-950/40 border border-slate-900 text-slate-400 font-bold px-2.5 py-1 text-[10px] rounded-full inline-block">
                          تعذر الإنجاز ✖
                        </span>
                      )}
                    </td>

                    {/* Case Options */}
                    {userRole !== 'accountant' && (
                      <td className="px-4 py-4 text-center whitespace-nowrap">
                        <button
                          onClick={() => onSelectFileForReport(file)}
                          className="bg-blue-600 font-bold text-white hover:bg-blue-700 text-[10px] py-1.5 px-3.5 rounded-lg transition-all"
                        >
                          تحرير المحضر
                        </button>
                      </td>
                    )}

                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      </div>

    </div>
  );
}
