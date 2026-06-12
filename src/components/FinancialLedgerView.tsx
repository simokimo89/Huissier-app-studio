/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  FileSpreadsheet, 
  Plus, 
  Coins, 
  ShieldCheck, 
  Printer, 
  Building2, 
  PlusCircle, 
  TrendingUp,
  Receipt
} from 'lucide-react';
import { FinancialLedgerItem, JudicialFile } from '../types';

interface FinancialLedgerViewProps {
  financials: FinancialLedgerItem[];
  files: JudicialFile[];
  onAddFinancialItem: (item: Omit<FinancialLedgerItem, 'id' | 'createdAt'>) => Promise<string>;
  accountantName: string;
}

export default function FinancialLedgerView({
  financials,
  files,
  onAddFinancialItem,
  accountantName,
}: FinancialLedgerViewProps) {
  const [showInvoiceForm, setShowInvoiceForm] = useState(false);

  // Invoice Fields
  const [selectedFileId, setSelectedFileId] = useState('');
  const [payerName, setPayerName] = useState('');
  const [executionFees, setExecutionFees] = useState('600');
  const [stampsFee, setStampsFee] = useState('50');
  const [paymentMethod, setPaymentMethod] = useState<FinancialLedgerItem['paymentMethod']>('cash');
  const [paymentType, setPaymentType] = useState<FinancialLedgerItem['paymentType']>('deposit_receipt');

  const [formSuccess, setFormSuccess] = useState('');

  // Live total computations
  const currentExecutionFees = parseFloat(executionFees) || 0;
  const currentStampsFee = parseFloat(stampsFee) || 0;
  // Professional bailiffs are subject to a 20% VAT in Morocco
  const calculatedTax = parseFloat((currentExecutionFees * 0.20).toFixed(2));
  const totalAmountDue = currentExecutionFees + currentStampsFee + calculatedTax;

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payerName.trim()) {
      alert('الرجاء كتابة اسم الملزم بالأداء!');
      return;
    }

    try {
      const billNumber = `BL-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
      await onAddFinancialItem({
        fileId: selectedFileId || undefined,
        billNumber,
        payerName: payerName.trim(),
        amountPaid: totalAmountDue,
        taxAmount: calculatedTax,
        stampsFee: currentStampsFee,
        executionFees: currentExecutionFees,
        paymentType,
        paymentMethod,
        status: 'paid',
        accountantName,
      });

      setFormSuccess(`تم إصدار وتوثيق الوصل الأصلي رقم ${billNumber} بنجاح! 🧾`);
      
      // Reset
      setPayerName('');
      setExecutionFees('600');
      setStampsFee('50');
      
      setTimeout(() => {
        setFormSuccess('');
        setShowInvoiceForm(false);
      }, 2350);

    } catch (err) {
      console.error(err);
      alert('فشل إصدار التذكرة المالية.');
    }
  };

  // Tallies
  const totalReceived = financials.reduce((sum, item) => sum + item.amountPaid, 0);
  const totalStamps = financials.reduce((sum, item) => sum + item.stampsFee, 0);
  const totalTaxes = financials.reduce((sum, item) => sum + item.taxAmount, 0);
  const netEarnings = financials.reduce((sum, item) => sum + item.executionFees, 0);

  return (
    <div className="space-y-6" id="finances-ledger-container">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800 pb-5">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <FileSpreadsheet className="w-5.5 h-5.5 text-blue-500" />
            المكتب الحسابي والجرائد والرقابة
          </h2>
          <p className="text-xs text-slate-500 mt-1">تسوية مقاصة مصاريف المتقاضين، احتساب الضريبة على القيمة المضافة [20%] والتمبر الرسمي لصناديق الدولة المغربية.</p>
        </div>

        <button
          onClick={() => setShowInvoiceForm(!showInvoiceForm)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-5 rounded-xl text-xs shadow-lg shadow-blue-900/10 transition-all cursor-pointer"
          id="toggle-invoice-btn"
        >
          <PlusCircle className="w-4 h-4" />
          <span>{showInvoiceForm ? 'إخفاء الفاتورة' : 'إصدار تذكرة محاسبية جديدة'}</span>
        </button>
      </div>

      {formSuccess && (
        <div className="bg-emerald-950/30 border border-emerald-800 p-4 rounded-xl text-emerald-400 text-xs font-black text-center">
          {formSuccess}
        </div>
      )}

      {/* Numerical Tallies Card Row configured with Immersive UI details */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white p-5 rounded-2xl shadow-lg shadow-blue-900/20 border border-blue-500/25">
          <span className="text-[10px] uppercase font-bold text-blue-200 block">المقبوضات الإجمالية</span>
          <span className="text-xl font-black block mt-1">{totalReceived.toFixed(2)} د.م.</span>
          <span className="text-[9px] text-blue-100 mt-1 block">شاملة للتمبر والرسم الضريبي</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 text-white p-5 rounded-2xl shadow-sm">
          <span className="text-[10px] uppercase font-bold text-slate-500 block">صافي عمولات المكتب</span>
          <span className="text-xl font-bold text-blue-400 block mt-1">{netEarnings.toFixed(2)} د.م.</span>
          <span className="text-[9px] text-slate-500 mt-1 block">أتعاب أصلية معلنة للرقابة</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-sm">
          <span className="text-[10px] uppercase font-bold text-slate-500 block">حصيلة تمبر المحكمة</span>
          <span className="text-xl font-bold text-white block mt-1">{totalStamps.toFixed(2)} د.م.</span>
          <span className="text-[9px] text-slate-500 mt-1 block">سلمت لعدالة الخازن العام</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-sm">
          <span className="text-[10px] uppercase font-bold text-slate-500 block">حصيلة الضريبة [VAT 20%]</span>
          <span className="text-xl font-bold text-white block mt-1">{totalTaxes.toFixed(2)} د.م.</span>
          <span className="text-[9px] text-slate-500 mt-1 block">المرشحة لتقرير الإدارة السنوي</span>
        </div>

      </div>

      {/* Invoice Constructor Form */}
      {showInvoiceForm && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-sm p-6 animate-slide-up text-right" id="invoice-form-wrapper">
          <h3 className="text-sm font-bold text-white pb-3.5 mb-5 border-b border-slate-800 flex items-center gap-1.5 justify-start">
            <Receipt className="w-4 h-4 text-blue-500" />
            صياغة تذكرة استخلاص مالي وتفريغ المقاصة الأصلية
          </h3>

          <form onSubmit={handleCreateInvoice} className="space-y-4">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Target Case selection (Optional link) */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">ربطه بملف قضائي تتبع (اختياري)</label>
                <select
                  value={selectedFileId}
                  onChange={(e) => {
                    setSelectedFileId(e.target.value);
                    const matchedFile = files.find(f => f.id === e.target.value);
                    if (matchedFile) {
                      setPayerName(matchedFile.plaintiffName);
                    }
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200"
                  id="ledger-link-file-select"
                >
                  <option value="">-- غير مربوط بملف عيني (استشارة خارجية) --</option>
                  {files.map((file) => (
                    <option key={file.id} value={file.id}>
                      {file.caseNumber} - المدعي: {file.plaintiffName}
                    </option>
                  ))}
                </select>
              </div>

              {/* Payer name */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">اسم طالب الإجراء المؤدي (الملزم بالدفع) *</label>
                <input
                  type="text"
                  required
                  value={payerName}
                  onChange={(e) => setPayerName(e.target.value)}
                  placeholder="الاسم الكامل للشخص الدافع"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200"
                  id="ledger-payer-input"
                />
              </div>

              {/* Execution Fees */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">أتعاب التنفيذ والانتقال (درهم) *</label>
                <input
                  type="number"
                  required
                  value={executionFees}
                  onChange={(e) => setExecutionFees(e.target.value)}
                  placeholder="مثال: 600"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 font-mono"
                  id="ledger-fees-input"
                />
              </div>

              {/* Stamp Fees */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">واجبات التمبر الرسمي للمحكمة (درهم) *</label>
                <input
                  type="number"
                  required
                  value={stampsFee}
                  onChange={(e) => setStampsFee(e.target.value)}
                  placeholder="مثال: 50"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 font-mono"
                  id="ledger-stamps-input"
                />
              </div>

              {/* Payment Method */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">طريقة الأداء والدفع</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200"
                >
                  <option value="cash">نقداً بالصندوق (Cash)</option>
                  <option value="check">بشيك بنكي مصدق (Check)</option>
                  <option value="bank_transfer">تحويل رسمي لحساب الوديعة (Transfer)</option>
                </select>
              </div>

              {/* Payment Type */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">نوع الكشف المالي</label>
                <select
                  value={paymentType}
                  onChange={(e) => setPaymentType(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200"
                >
                  <option value="deposit_receipt">توصيل وديعة مسبقة (Deposit)</option>
                  <option value="final_invoice">فاتورة التصفية النهائية (Final Invoice)</option>
                  <option value="service_fee">رسوم أوراق مستعجلة (Service Fee)</option>
                </select>
              </div>

            </div>

            {/* Calculations Simulator Layout */}
            <div className="bg-slate-950 text-white rounded-xl p-4.5 space-y-2 border border-slate-800 font-sans" id="live-tax-simulator">
              <div className="flex justify-between items-center text-xs text-slate-500">
                <span>أتعاب العمولات الأصلية والخارجية:</span>
                <span className="font-mono">{currentExecutionFees.toFixed(2)} د.م.</span>
              </div>
              <div className="flex justify-between items-center text-xs text-slate-500">
                <span>الضريبة على القيمة المضافة [صنف أتعاب م.م. - بنسبة 20%]:</span>
                <span className="font-mono text-blue-400">+{calculatedTax.toFixed(2)} د.م.</span>
              </div>
              <div className="flex justify-between items-center text-xs text-slate-500">
                <span>واجب التمبر المخزني المؤدى باسم الخزينة العامة:</span>
                <span className="font-mono">+{currentStampsFee.toFixed(2)} د.م.</span>
              </div>
              <div className="border-t border-slate-800 pt-2 flex justify-between items-center text-sm font-bold text-white">
                <span className="flex items-center gap-1.5">
                  <Coins className="w-4 h-4 text-blue-500" />
                  المبلغ الكلي الملزم بالصندوق للزبون:
                </span>
                <span className="text-base font-bold font-mono text-blue-400">{totalAmountDue.toFixed(2)} درهم مغربي</span>
              </div>
            </div>

            {/* Form actions */}
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowInvoiceForm(false)}
                className="bg-slate-950 hover:bg-slate-900 text-slate-300 font-bold py-2 px-6 rounded-lg border border-slate-800 text-xs cursor-pointer"
              >
                إلغاء التعديل
              </button>
              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-8 rounded-lg text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                id="ledger-submit-btn"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>إصدار الوصل والختم الضريبي</span>
              </button>
            </div>

          </form>
        </div>
      )}

      {/* Database Accounting Ledgers Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-sm p-6 space-y-4">
        
        <div className="flex justify-between items-center border-b border-slate-800 pb-3.5">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Building2 className="w-5 h-5 text-blue-500" />
            مسودة المعالجة ودفتر وصولات الصناديق الحسابية
          </h3>
          <span className="text-[10px] bg-slate-950 border border-slate-800 text-slate-400 font-bold px-3 py-1 rounded-full">
            دفتر الحصيلة: {financials.length} تذكرة محاسبية
          </span>
        </div>

        {financials.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-xs font-semibold">
            لا توجد وصولات مالية مسجلة حالياً في السجل الحسابي للمكتب.
          </div>
        ) : (
          <div className="overflow-x-auto text-[11px]">
            <table className="w-full text-right divide-y divide-slate-800">
              <thead className="bg-slate-950 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                <tr>
                  <th scope="col" className="px-4 py-3 border-b border-slate-800">رقم تذكرة الفاتورة</th>
                  <th scope="col" className="px-4 py-3 border-b border-slate-800">الملزم بالأداء</th>
                  <th scope="col" className="px-4 py-3 border-b border-slate-800">الملف المقيد به</th>
                  <th scope="col" className="px-4 py-3 text-center border-b border-slate-800">أتعاب المكتب</th>
                  <th scope="col" className="px-4 py-3 text-center border-b border-slate-800">ضريبة [20%]</th>
                  <th scope="col" className="px-4 py-3 text-center border-b border-slate-800">التمبر المالي</th>
                  <th scope="col" className="px-4 py-3 text-center border-b border-slate-800">المقدار الصافي الكلي</th>
                  <th scope="col" className="px-4 py-3 text-center border-b border-slate-800">طريقة الدفع</th>
                  <th scope="col" className="px-4 py-3 text-center border-b border-slate-800 col-span-2">المحاسب المسؤول</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                {financials.map((item) => {
                  const linkedFile = files.find(f => f.id === item.fileId);
                  return (
                    <tr key={item.id} className="hover:bg-slate-950/40 transition-colors" id={`finance-row-id-${item.id}`}>
                      
                      {/* Invoice billNumber */}
                      <td className="px-4 py-3.5 font-bold font-mono text-blue-400">
                        {item.billNumber}
                      </td>

                      {/* Client Payer */}
                      <td className="px-4 py-3.5 font-bold text-white">
                        {item.payerName}
                      </td>

                      {/* Associated Case File */}
                      <td className="px-4 py-3.5 font-mono text-slate-500">
                        {linkedFile ? linkedFile.caseNumber : 'استشارة عامة'}
                      </td>

                      {/* Commission fees */}
                      <td className="px-4 py-3.5 text-center font-mono">
                        {item.executionFees.toFixed(2)} د.م.
                      </td>

                      {/* Tax calculated */}
                      <td className="px-4 py-3 text-center text-blue-500 font-mono font-bold">
                        {item.taxAmount.toFixed(2)}
                      </td>

                      {/* Stamp costs */}
                      <td className="px-4 py-3 text-center font-mono text-slate-500">
                        {item.stampsFee.toFixed(2)}
                      </td>

                      {/* Total Net received */}
                      <td className="px-4 py-3 text-center font-bold font-mono text-white">
                        {item.amountPaid.toFixed(2)} د.م.
                      </td>

                      {/* Payer channel */}
                      <td className="px-4 py-3 text-center">
                        <span className="bg-slate-950 text-slate-400 border border-slate-800 px-2.5 py-1 rounded-full font-bold text-[9px]">
                          {item.paymentMethod === 'cash' && 'نقدًا بالخزينة'}
                          {item.paymentMethod === 'check' && 'شيك بنكي'}
                          {item.paymentMethod === 'bank_transfer' && 'حساب المقاصة'}
                        </span>
                      </td>

                      {/* Clerk validation */}
                      <td className="px-4 py-3 text-center text-slate-500 text-[10px]">
                        {item.accountantName}
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

      </div>

    </div>
  );
}
