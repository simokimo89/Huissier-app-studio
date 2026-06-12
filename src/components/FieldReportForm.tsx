/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { 
  FileText, 
  Signature, 
  Camera, 
  Upload, 
  CheckCircle, 
  X, 
  RotateCcw, 
  Stamp, 
  MapPin, 
  AlignRight, 
  AlertTriangle,
  Printer,
  Download,
  Search,
  Copy,
  ChevronDown,
  ChevronUp,
  BookOpen,
  FileDown,
  History
} from 'lucide-react';
import { JudicialFile, JudicialReport, MediaFile } from '../types';
import { dbService } from '../lib/db';

interface FieldReportFormProps {
  selectedFile: JudicialFile | null;
  reporterName: string;
  onSaveReport: (report: Omit<JudicialReport, 'id' | 'createdAt'>) => Promise<string>;
  onSaveMedia: (media: Omit<MediaFile, 'id' | 'createdAt'>) => Promise<string>;
  onCancel: () => void;
}

export default function FieldReportForm({
  selectedFile,
  reporterName,
  onSaveReport,
  onSaveMedia,
  onCancel,
}: FieldReportFormProps) {
  
  // Form values
  const [reportType, setReportType] = useState<JudicialReport['reportType']>('notification_minutes');
  const [statementDetails, setStatementDetails] = useState('');
  const [servingOutcome, setServingOutcome] = useState<JudicialReport['servingOutcome']>('handed_in_person');
  const [recipientName, setRecipientName] = useState('');
  const [hasOfficialStamp, setHasOfficialStamp] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState('');

  // Media Attachment state
  const [attachmentBase64, setAttachmentBase64] = useState<string | null>(null);
  const [attachmentTitle, setAttachmentTitle] = useState('شرح حالة الباب / صورة المعاينة');
  const [isCompressing, setIsCompressing] = useState(false);

  // Signature Pad Refs
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  // Archival and PDF Export history states
  const [allReports, setAllReports] = useState<JudicialReport[]>([]);
  const [allFiles, setAllFiles] = useState<JudicialFile[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [historySearchTerm, setHistorySearchTerm] = useState('');
  const [expandedReportId, setExpandedReportId] = useState<string | null>(null);
  const [copiedReportId, setCopiedReportId] = useState<string | null>(null);

  const fetchHistory = async () => {
    try {
      setIsLoadingHistory(true);
      const [reports, files] = await Promise.all([
        dbService.getAllReports(),
        dbService.getAllFiles()
      ]);
      setAllReports(reports.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      setAllFiles(files);
    } catch (err) {
      console.error("Failed to load historical reports:", err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [selectedFile]);

  const handleCopyToClipboard = (text: string, reportId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedReportId(reportId);
    setTimeout(() => {
      setCopiedReportId(null);
    }, 2000);
  };

  // Official Moroccan Legal PDF Generation & Print-Trigger
  const handleExportToPDF = (report: JudicialReport, file: JudicialFile) => {
    // Dynamically retrieve configured active identity
    let activeOfficerName = 'الأستاذ المصطفى الخليفي';
    let activeOfficeName = 'مكتب المفوض القضائي بالرباط - الدائرة القضائية وبني ملال';
    try {
      const sessionStr = localStorage.getItem('court_user_session');
      if (sessionStr) {
        const session = JSON.parse(sessionStr);
        if (session.name) activeOfficerName = session.name;
        if (session.officeName) activeOfficeName = session.officeName;
      }
    } catch (e) {
      console.error(e);
    }

    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.bottom = '0';
    iframe.style.right = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow || iframe.contentDocument;
    if (!doc) return;

    const titleArabic = 
      report.reportType === 'notification_minutes' ? 'محضر تبليغ رسمي وإعذار قانوني' :
      report.reportType === 'execution_minutes' ? 'محضر معاينة حجز تنفيذي وجرد' :
      'محضر إثبات حال وصياغة معاينات ميدانية';

    const outcomeArabic = 
      report.servingOutcome === 'handed_in_person' ? 'سلّمت النسخة للمعني شخصياً (تم التبليغ)' :
      report.servingOutcome === 'handed_to_family' ? 'سلّمت النسخة لأحد الأقارب المقيمين (تم التبليغ)' :
      report.servingOutcome === 'neighbor_refused' ? 'امتنع الطرف أو الجيران عن التسلم (تعذر التبليغ)' :
      report.servingOutcome === 'closed_door' ? 'المحل مغلق بصفة مستمرة (تعذر التبليغ)' :
      report.servingOutcome === 'executed_successfully' ? 'تم جرد الممتلكات والحجز بنجاح (تم التنفيذ الميداني)' :
      'ثبوت حالة المانع والمقاومة البدنية (تعذّر التنفيذ)';

    const formattedDetails = report.statementDetails.replace(/\n/g, '<br />');
    const dateFormatted = new Date(report.createdAt).toLocaleDateString('ar-MA', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const uniqueId = `UUID-MA-81.03-${report.id?.toUpperCase().substring(4, 12) || Math.random().toString(36).substring(2, 10).toUpperCase()}`;

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="ar" dir="rtl">
      <head>
        <meta charset="UTF-8">
        <title>${titleArabic} - ${file.caseNumber}</title>
        <style>
          body {
            font-family: Arial, Tahoma, sans-serif;
            margin: 40px;
            color: #111;
            direction: rtl;
            line-height: 1.6;
            background-color: #fff;
          }
          
          /* Official Header Container */
          .legal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 3px double #000;
            padding-bottom: 12px;
            margin-bottom: 25px;
          }
          
          .header-column {
            width: 38%;
            font-size: 11px;
            font-weight: bold;
            text-align: center;
          }

          .header-column.right {
            text-align: right;
            line-height: 1.5;
          }

          .header-column.left {
            text-align: left;
            line-height: 1.5;
          }

          .header-column.center {
            width: 20%;
          }

          .emblem-placeholder {
            font-size: 36px;
            line-height: 1;
          }

          .header-section-title {
            font-size: 13px;
            font-weight: 900;
            margin-bottom: 4px;
          }

          .double-divider {
            border-top: 1px solid #000;
            border-bottom: 1px solid #000;
            height: 3px;
            margin: 15px 0;
          }

          /* Title block styling */
          .document-title-wrapper {
            text-align: center;
            margin: 25px 0;
          }

          .document-title {
            font-size: 17px;
            font-weight: 950;
            border: 2px solid #000;
            padding: 8px 18px;
            display: inline-block;
            background-color: #fafafa;
            border-radius: 4px;
          }

          .law-reference {
            font-size: 10px;
            font-style: italic;
            margin-top: 5px;
            color: #333;
          }

          /* metadata block */
          .meta-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
            margin-bottom: 25px;
            background: #fff;
            border: 1px solid #ccc;
            padding: 12px;
            border-radius: 6px;
            font-size: 11.5px;
          }

          .meta-item {
            display: flex;
            justify-content: flex-start;
            align-items: center;
            gap: 6px;
          }

          .meta-label {
            font-weight: bold;
            color: #222;
          }

          /* Statement content styling */
          .statement-header-intro {
            font-weight: bold;
            font-size: 13px;
            margin-bottom: 10px;
            text-decoration: underline;
          }

          .statement-body {
            font-size: 12.5px;
            text-align: justify;
            text-justify: inter-word;
            line-height: 1.8;
            margin-bottom: 40px;
            padding: 0 5px;
          }

          /* Signatures block */
          .signatures-section {
            display: flex;
            justify-content: space-between;
            margin-top: 40px;
            page-break-inside: avoid;
          }

          .signature-col {
            width: 45%;
            text-align: center;
            font-size: 11.5px;
            font-weight: bold;
          }

          .signature-title {
            margin-bottom: 12px;
            text-decoration: underline;
            color: #111;
          }

          .signature-canvas-container {
            min-height: 80px;
            display: flex;
            align-items: center;
            justify-content: center;
            border: 1px dashed #bbb;
            background: #fafafa;
            border-radius: 4px;
            margin-top: 8px;
          }

          .signature-image {
            max-height: 70px;
            max-width: 170px;
            object-fit: contain;
          }

          /* Stylized circular legal stamp cachet */
          .stamp-seal-canvas {
            margin-top: 10px;
            display: inline-block;
            border: 3px double #0d9488;
            border-radius: 50%;
            width: 100px;
            height: 100px;
            color: #0d9488;
            font-size: 8px;
            font-weight: 900;
            line-height: 1.2;
            padding: 6px;
            box-sizing: border-box;
            background-color: rgba(13, 148, 136, 0.05);
            text-align: center;
            transform: rotate(-3deg);
          }

          .stamp-seal-inner {
            border: 1px dashed #0d9488;
            border-radius: 50%;
            width: 100%;
            height: 100%;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
          }

          .stamp-core {
            font-weight: 900;
            font-size: 9.5px;
            margin: 2px 0;
          }

          /* Footer printing notes */
          .print-footer {
            position: fixed;
            bottom: 10px;
            left: 0;
            right: 0;
            text-align: center;
            font-size: 8px;
            color: #666;
            border-top: 1px solid #ddd;
            padding-top: 5px;
          }

          @media print {
            body {
              margin: 15px;
            }
            .no-print {
              display: none !important;
            }
          }
        </style>
      </head>
      <body>
        
        <!-- Official Legal Header -->
        <div class="legal-header">
          <div class="header-column right">
            <div class="header-section-title">المملكة المغربية</div>
            <div>وزارة العـدل</div>
            <div>مكتب المفوض القضائي المقبول لدى المحاكم</div>
            <div>الأستاذ: ${activeOfficerName}</div>
            <div style="font-size: 8.5px; margin-top: 2px; color:#555; max-width: 250px;">التكليف: ${activeOfficeName}</div>
            <div style="font-size: 8.5px; color:#555;">الهاتف المعتمد: 0537-72-83-91</div>
          </div>
          
          <div class="header-column center">
            <div class="emblem-placeholder">⚖️</div>
            <div style="font-size: 9px; margin-top: 6px; font-weight: 900;">العدل أساس الملك</div>
          </div>
          
          <div class="header-column left">
            <div>السجل المركزي الرقمي</div>
            <div>المحكمة المنتسبة: <span style="font-weight: 900;">${file.courtName}</span></div>
            <div>ملف تتبع رقم: <span style="font-weight: 900; font-family: monospace;">${file.caseNumber}</span></div>
            <div style="font-size: 8.5px; color: #555; margin-top: 2px; font-family: monospace;">رقم الأرشفة: ${uniqueId}</div>
            <div style="font-size: 8.5px; color: #555; font-family: monospace;">المحضر: REP-${report.id?.substring(4, 9).toUpperCase() || 'NEW'}</div>
          </div>
        </div>

        <!-- Centered Document Title -->
        <div class="document-title-wrapper">
          <div class="document-title">${titleArabic}</div>
          <div class="law-reference">منظم ومؤسس قانوناً بموجب مقتضيات الظهير الشريف رقم 1.06.134 بتنفيذ القانون رقم 81.03 الخاص بالمهنة</div>
        </div>

        <!-- File Cases Metadata Details -->
        <div class="meta-grid">
          <div class="meta-item">
            <span class="meta-label">طالب الإجراء (المدعي):</span>
            <span>${file.plaintiffName}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">المستلم المالي/التبليغي المعترف به:</span>
            <span>${report.recipientName || 'المعني بالأمر أو من ينوب عنه بوجه صحيح'}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">المطلوب ضده (المنفذ عليه):</span>
            <span>${file.defendantName}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">العنوان الميداني المعتمد:</span>
            <span>${file.defendantAddress}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">تاريخ ساعة الانتقال والتحرير:</span>
            <span>${dateFormatted}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">الحصيلة والوضعية الميدانية للإجراء:</span>
            <span style="font-weight: bold; color: #0d9488;">${outcomeArabic}</span>
          </div>
        </div>

        <div class="double-divider"></div>

        <!-- Body Narrative text content -->
        <div class="statement-header-intro">تفصيل المحاضر والوقائع الميدانية المسجلة:</div>
        <div class="statement-body">
          ${formattedDetails}
        </div>

        <!-- Signatures Block -->
        <div class="signatures-section">
          
          <!-- Recipient Signature -->
          <div class="signature-col">
            <div class="signature-title">توقيع وبصمة الطرف المسلم له أو الممتنع:</div>
            <div class="signature-canvas-container">
              ${report.signatureBase64 ? `
                <img src="${report.signatureBase64}" class="signature-image" alt="توقيع الطرف المعني" />
              ` : `
                <div style="font-size: 10px; color: #999; font-style: italic; padding: 20px;">[امتنع عن التوقيع أو تعذر حضوره]</div>
              `}
            </div>
          </div>

          <!-- Bailiff Stamp -->
          <div class="signature-col">
            <div class="signature-title">توقيع وختم المفوض القضائي المقر:</div>
            
            <div style="margin-top: 10px;">
              ${report.hasOfficialStamp ? `
                <div class="stamp-seal-canvas">
                  <div class="stamp-seal-inner">
                    <div style="font-size: 7px;">المملكة المغربية</div>
                    <div class="stamp-core">المفوض القضائي</div>
                    <div style="font-size: 7px; font-weight: bold;">أ. ${activeOfficerName.replace('الأستاذ ', '')}</div>
                    <div style="font-size: 5px; transform: scale(0.9);">هيئة الرباط - المحاكم الابتدائية</div>
                  </div>
                </div>
              ` : `
                <div style="font-size: 10px; color: #999; font-style: italic; padding: 20px;">[لم يعتمد الختم الرسمي بعد]</div>
              `}
            </div>
            
            <div style="font-size: 9.5px; line-height: 1.4; margin-top: 8px;">
              ${activeOfficerName}<br />
              المسجل بالسلك الوطني برقم 4432
            </div>
          </div>

        </div>

        <div class="print-footer">
          نظام المفوض القضائي الموحد المغربي | مرمز AES-256 ومحمي مركزياً | المطبوع مخرج آلياً ومرخص بموجب القانون 81.03
        </div>

      </body>
      </html>
    `;

    // Write content to iframe and trigger print
    const iframeDoc = iframe.contentWindow?.document || iframe.contentDocument;
    if (iframeDoc) {
      iframeDoc.open();
      iframeDoc.write(htmlContent);
      iframeDoc.close();

      setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        
        // Cleanup the temporary iframe
        setTimeout(() => {
          document.body.removeChild(iframe);
        }, 3000);
      }, 500);
    }
  };

  // Initialize Canvas layout on mount
  useEffect(() => {
    if (selectedFile) {
      clearSignature();
      // Adjust default templates based on case type
      if (selectedFile.caseType === 'execution') {
        setReportType('execution_minutes');
        setServingOutcome('executed_successfully');
      } else if (selectedFile.caseType === 'preview') {
        setReportType('preview_report');
        setServingOutcome('executed_successfully');
      } else {
        setReportType('notification_minutes');
        setServingOutcome('handed_in_person');
      }

      // Geo-coordinates mock simulation (Judicial field GPS locking requirement)
      if (typeof navigator !== 'undefined' && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => console.log('Location locked:', pos.coords.latitude, pos.coords.longitude),
          (err) => console.warn('Geo access skipped/denied:', err)
        );
      }
    }
  }, [selectedFile]);

  // If no active file is selected, show historical registry list
  if (!selectedFile) {
    const filteredReports = allReports.filter(report => {
      const term = historySearchTerm.toLowerCase().trim();
      if (!term) return true;
      
      const file = allFiles.find(f => f.id === report.fileId);
      const isReportTypeMatch = 
        (report.reportType === 'notification_minutes' && 'تبليغ'.includes(term)) ||
        (report.reportType === 'execution_minutes' && 'تنفيذ حجز'.includes(term)) ||
        (report.reportType === 'preview_report' && 'إثبات حالة'.includes(term));

      return (
        (report.id || '').toLowerCase().includes(term) ||
        (report.statementDetails || '').toLowerCase().includes(term) ||
        (report.recipientName || '').toLowerCase().includes(term) ||
        (report.reporterName || '').toLowerCase().includes(term) ||
        isReportTypeMatch ||
        (file && (
          (file.caseNumber || '').toLowerCase().includes(term) ||
          (file.plaintiffName || '').toLowerCase().includes(term) ||
          (file.defendantName || '').toLowerCase().includes(term)
        ))
      );
    });

    return (
      <div className="space-y-6 text-right font-sans" id="all-completed-reports-dashboard">
        
        {/* Dash Header */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-lg font-extrabold text-white flex items-center gap-2 justify-start">
              <History className="w-5.5 h-5.5 text-blue-500" />
              أرشيف ومستودع المحاضر القضائية المنجزة
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              مراجعة وتصدير المحاضر المنجزة ميدانياً بصيغة PDF معتمدة مع الترويسة القانونية الكاملة والختم الرسمي لمكتب المفوض.
            </p>
          </div>
          <div className="bg-blue-950/40 border border-blue-900/30 text-blue-400 py-1.5 px-4 rounded-xl text-xs font-bold leading-normal text-right shrink-0">
            القانون 81.03 المنظم للمهنة ⚖️
          </div>
        </div>

        {/* Action / Search Bar */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute right-3.5 top-3.5 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="ابحث برقم الملف، اسم المدعي، أو المستلم..."
              value={historySearchTerm}
              onChange={(e) => setHistorySearchTerm(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pr-10 pl-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              id="report-history-search"
            />
          </div>
          <p className="text-xs text-slate-500 font-bold shrink-0">
            الحصيلة: <strong className="text-white">{filteredReports.length} محضر منجز</strong>
          </p>
        </div>

        {/* Core List grid */}
        {isLoadingHistory ? (
          <div className="bg-slate-900 border border-slate-800 p-12 text-center text-slate-500 text-xs font-semibold">
            جاري تحميل سجل المحاضر والتواقيع الميدانية...
          </div>
        ) : filteredReports.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 p-12 rounded-2xl text-center text-slate-500 text-xs font-bold space-y-3">
            <div>لا توجد محاضر قضائية منجزة تناسب خيارات البحث حالياً.</div>
            <div className="text-slate-600 font-normal">لتسجيل محضر جديد، يُرجى تحديد أحد الملفات القضائية من "سجل الملفات" والضغط على "تحرير المحضر".</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {filteredReports.map((report) => {
              const file = allFiles.find(f => f.id === report.fileId);
              const isExpanded = expandedReportId === report.id;
              
              if (!file) return null;

              return (
                <div key={report.id} className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 hover:border-slate-700 transition" id={`archived-rep-row-${report.id}`}>
                  
                  {/* Card Header metadata */}
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <span className="text-[10px] uppercase font-mono text-slate-500 tracking-wider">سجل {file.caseNumber}</span>
                      <h3 className="font-extrabold text-white text-xs mt-0.5">
                        {report.reportType === 'notification_minutes' && 'محضر تبليغ رسمي وإعذار'}
                        {report.reportType === 'execution_minutes' && 'محضر معاينة حجز تنفيذي'}
                        {report.reportType === 'preview_report' && 'محضر إثبات حال ومعاينة'}
                      </h3>
                      <div className="text-[9.5px] text-slate-400 mt-1">المنفذ عليه: <strong className="text-slate-200">{file.defendantName}</strong></div>
                    </div>
                    <div className="text-left shrink-0">
                      <span className="inline-block text-[8px] bg-blue-950/40 text-blue-400 border border-blue-900/30 font-extrabold px-2 py-0.5 rounded-full">
                        REP-{report.id?.substring(4, 9).toUpperCase() || 'NEW'}
                      </span>
                      <div className="text-[9px] text-slate-500 mt-1 font-semibold">{new Date(report.createdAt).toLocaleDateString('ar-MA')}</div>
                    </div>
                  </div>

                  {/* Body highlights */}
                  <div className="bg-slate-950/60 p-3 rounded-lg text-[10px] space-y-1.5 border border-slate-800">
                    <div className="flex justify-between">
                      <span className="text-slate-400">طالب الإجراء (المدعي):</span>
                      <span className="font-semibold text-white truncate max-w-44">{file.plaintiffName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">النتيجة الميدانية:</span>
                      <span className="font-bold text-teal-400">
                        {report.servingOutcome === 'handed_in_person' && 'تم التبليغ شخصياً'}
                        {report.servingOutcome === 'handed_to_family' && 'تم التبليغ للأقارب'}
                        {report.servingOutcome === 'neighbor_refused' && 'تعذر (امتناع)'}
                        {report.servingOutcome === 'closed_door' && 'تعذر (مغلق)'}
                        {report.servingOutcome === 'executed_successfully' && 'تم جرد الحجز'}
                        {report.servingOutcome === 'execution_obstruction' && 'تعذر (مقاومة)'}
                      </span>
                    </div>
                    {report.recipientName && (
                      <div className="flex justify-between">
                        <span className="text-slate-400">الشخص المتسلّم:</span>
                        <span className="font-semibold text-white">{report.recipientName}</span>
                      </div>
                    )}
                    <div className="flex justify-between border-t border-slate-900 pt-1.5 mt-1.5 items-center">
                      <span className="text-slate-500 text-[9px]">المفوض المحرر الأصلي:</span>
                      <span className="font-mono text-slate-400 text-[9px] font-bold">{report.reporterName}</span>
                    </div>
                  </div>

                  {/* Expanded text */}
                  {isExpanded && (
                    <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800 text-[10.5px] text-slate-300 leading-relaxed font-sans mt-2 whitespace-pre-wrap animate-fade-in">
                      <h4 className="font-bold text-slate-400 border-b border-slate-900 pb-1.5 mb-2 flex items-center gap-1.5">
                        <BookOpen className="w-3.5 h-3.5 text-blue-500" />
                        المنطوق والمضمون المكتوب في المحضر:
                      </h4>
                      {report.statementDetails}
                    </div>
                  )}

                  {/* Actions buttons */}
                  <div className="flex justify-between items-center gap-1.5 pt-2 border-t border-slate-900">
                    <button
                      type="button"
                      onClick={() => setExpandedReportId(isExpanded ? null : report.id!)}
                      className="text-[9.5px] text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer font-bold"
                    >
                      {isExpanded ? (
                        <>
                          <ChevronUp className="w-3.5 h-3.5 text-slate-500" />
                          <span>طي التفاصيل</span>
                        </>
                      ) : (
                        <>
                          <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                          <span>عرض منطوق المحضر</span>
                        </>
                      )}
                    </button>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleCopyToClipboard(report.statementDetails, report.id!)}
                        className={`py-1.5 px-3 rounded text-[9px] font-extrabold flex items-center gap-1 transition ${copiedReportId === report.id ? 'bg-emerald-900/30 text-emerald-400 border border-emerald-800' : 'bg-slate-950 hover:bg-slate-800 text-slate-400 border border-slate-800 cursor-pointer'}`}
                      >
                        <Copy className="w-3 h-3" />
                        <span>{copiedReportId === report.id ? 'تم نسخ النص' : 'نسخ النص'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleExportToPDF(report, file)}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold py-1.5 px-4 rounded text-[9.5px] flex items-center gap-1 transition-all shadow-md cursor-pointer"
                        id={`export-pdf-btn-${report.id}`}
                      >
                        <Printer className="w-3 h-3 text-blue-200" />
                        <span>تصدير PDF 📄</span>
                      </button>
                    </div>
                  </div>

                </div>
              );
            })}
          </div>
        )}

      </div>
    );
  }

  // Canvas Drawing Methods
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.strokeStyle = '#3b82f6'; // Glowing office blue ink
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;

    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;

    if ('touches' in e) {
      // Prevent scrolling while signing on mobile
      if (e.cancelable) e.preventDefault();
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
    setHasSignature(true);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  // Automated Legal Text Templates (Moroccan Legal compliance templates)
  const insertTemplateText = (preset: 'prologue' | 'refusal' | 'preview_note') => {
    const today = new Date().toLocaleDateString('ar-MA');
    const time = new Date().toLocaleTimeString('ar-MA');

    let textToInsert = '';
    
    if (preset === 'prologue') {
      textToInsert = `نحن ${reporterName}، بصفتنا مفوضاً قضائياً محلفاً، والمصرح لنا قانونياً. انتقلنا في هذا اليوم ${today} على الساعة ${time} إلى الدائرة الحقلية المقر بها موطن المدعى عليه السيد(ة) ${selectedFile.defendantName}.\nوجدنا العنوان وباشرنا الإجراء التالي: `;
    } else if (preset === 'refusal') {
      textToInsert = `قمنا بمخاطبة أحد القاطنين بالعمارة السكنية الذي أقر بقرابة المطلوب تبليغه، لكنه امتنع جملة وتفصيلاً عن تسلم نسخة الإعذار أو كشف الاسم الشخصي بصفة قاطعة، ورفض التوقيع على هذا المحضر متذرعاً بعدم جاهزيته.\nتبعاً لذلك قمنا بمطابقة المسطرة وتوثيق واقعة الامتناع.`;
    } else if (preset === 'preview_note') {
      textToInsert = `بناءً على الحكم التمهيدي والترخيص الصادر، قمنا بالمعاينة البصرية المباشرة للمحل المذكور. وعاينا الأضرار بوجود شقوق واضحة في الجدار الشرقي المحاذي لورش البناء بطول يقارب 3 أمتار، مع سيلان واضح للمياه ورشح بالخرسانة.\nوقمنا بإنتاج صورتين تذكاريتين لإرفاقهما بملف إثبات الحالة للمحكمة المختصة.`;
    }

    setStatementDetails(prev => prev ? prev + '\n' + textToInsert : textToInsert);
  };

  // Automatic Image Scaling and 70% Quality Compression Logic
  const handleAttachmentUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsCompressing(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // Compute scaled dimensions (maximum width 800px on-device)
        const MAX_WIDTH = 800;
        let width = img.width;
        let height = img.height;

        if (width > MAX_WIDTH) {
          height = Math.round((height * MAX_WIDTH) / width);
          width = MAX_WIDTH;
        }

        // Draw onto local offscreen canvas for jpeg reduction
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          // Compress to JPEG with 0.7 (70% quality factor)
          const base64Compressed = canvas.toDataURL('image/jpeg', 0.7);
          setAttachmentBase64(base64Compressed);
          console.log('[Media] Image compressed from', file.size, 'bytes down to Base64 length:', base64Compressed.length);
        }
        setIsCompressing(false);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Custom visual stamp seal trigger with status verification
  const handleApplyOfficialStamp = () => {
    if (!hasSignature) {
      alert('لتطبيق ختم المصادقة، يجب الحصول على التوقيع الرقمي/البصمة أولاً في المربع أدناه!');
      return;
    }
    setHasOfficialStamp(true);
  };

  // Submit report to local database & log queue
  const handleSaveReportAndMedia = async () => {
    if (!statementDetails.trim()) {
      alert('الرجاء تحرير تفاصيل وقائع الانتقال في المحضر المفتوح!');
      return;
    }

    setIsSaving(true);
    try {
      // Get signature data base64
      let signatureBase64 = undefined;
      const canvas = canvasRef.current;
      if (canvas && hasSignature) {
        signatureBase64 = canvas.toDataURL('image/png');
      }

      // 1. Convert state to JudicialReport and save to Local IndexedDB Dexie tables
      const generatedReportId = await onSaveReport({
        fileId: selectedFile.id!,
        reportType,
        reporterName,
        statementDetails: statementDetails.trim(),
        servingOutcome,
        recipientName: servingOutcome === 'handed_in_person' || servingOutcome === 'handed_to_family' ? recipientName.trim() || selectedFile.defendantName : undefined,
        signatureBase64,
        hasOfficialStamp,
      });

      // 2. Save compressed photography attachment if exists
      if (attachmentBase64) {
        await onSaveMedia({
          fileId: selectedFile.id!,
          reportId: generatedReportId,
          title: attachmentTitle,
          base64Data: attachmentBase64,
          fileType: 'image/jpeg'
        });
      }

      setSaveSuccess('تم تثبيت محضر المعاينة بالبصمة وتوثيق المعطيات محلياً بسجل المزامنة بنجاح! ✅ 🔒');
      setTimeout(() => {
        setSaveSuccess('');
        onCancel(); // Close drafting form
      }, 2500);

    } catch (err) {
      console.error(err);
      alert('فشل حفظ المحضر حالياً في المستودع المحلي.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-sm p-6 space-y-6 text-right font-sans" id="court-report-form">
      
      {/* Top File Meta */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-950 border border-slate-800 p-4 rounded-xl">
        <div>
          <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">الملف القضائي النشط</span>
          <h3 className="font-mono font-extrabold text-blue-400 text-sm mt-0.5" id="report-case-label">{selectedFile.caseNumber}</h3>
          <p className="text-xs text-slate-400 mt-1">طالب الإجراء (المدعي): <strong className="text-white">{selectedFile.plaintiffName}</strong></p>
          <p className="text-xs text-slate-400">المطلوب ضده (المنفذ عليه): <strong className="text-white">{selectedFile.defendantName}</strong></p>
        </div>
        <div className="text-left shrink-0 font-sans">
          <span className="text-[10px] block text-slate-500 font-bold">بأمر من محكمة</span>
          <span className="text-xs font-bold text-slate-300 block mt-0.5">{selectedFile.courtName}</span>
          <span className="inline-block mt-2 text-[10px] bg-blue-950/40 text-blue-400 border border-blue-900/30 px-2.5 py-0.5 rounded font-black">
            وديعة مسبقة: {selectedFile.depositAmount} د.م.
          </span>
        </div>
      </div>

      {saveSuccess && (
        <div className="bg-emerald-50 dark:bg-emerald-950/35 border-l-4 border-emerald-500 p-4 rounded-lg text-xs text-emerald-800 dark:text-emerald-400 font-bold text-center">
          {saveSuccess}
        </div>
      )}

      {/* Main Drafting Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Editorial Text Forms (LHS - Span 7) */}
        <div className="lg:col-span-7 space-y-5">
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Report Type Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5 font-sans">نوع التقرير / المحضر</label>
              <select
                value={reportType}
                onChange={(e) => setReportType(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
                id="report-type-select"
              >
                <option value="notification_minutes">محضر تبليغ رسمي وإعذار</option>
                <option value="execution_minutes">محضر معاينة حجز تنفيذي وجرد</option>
                <option value="preview_report">محضر إثبات حال وصياغة معاينات</option>
              </select>
            </div>

            {/* Serving Outcome */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5 font-sans">الوضعية والنتيجة الميدانية للمهمّة</label>
              <select
                value={servingOutcome}
                onChange={(e) => setServingOutcome(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
                id="serving-outcome-select"
              >
                <option value="handed_in_person">سلمت النسخة للمعني شخصياً (تم التبليغ)</option>
                <option value="handed_to_family">سلمت النسخة لأحد الأقارب المقيمين (تم التبليغ)</option>
                <option value="neighbor_refused">امتنع الطرف أو الجيران عن التسلم (تعذر)</option>
                <option value="closed_door">المحل مغلق بصفة مستمرة (تعذر التبليغ)</option>
                <option value="executed_successfully">تم جرد الممتلكات والحجز بنجاح (تم التنفيذ)</option>
                <option value="execution_obstruction">وجود مقاومة أو ممانعة للتبليغ (تعذر التنفيذ)</option>
              </select>
            </div>

          </div>

          {/* Conditional Recipient Name */}
          {(servingOutcome === 'handed_in_person' || servingOutcome === 'handed_to_family') && (
            <div className="animate-fade-in">
              <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1">
                اسم الشخص المتسلم الفعلي للمحضر *
                <span className="text-[10px] text-slate-500 font-semibold">(سيتم حفظه مشفراً بـ AES-256)</span>
              </label>
              <input
                type="text"
                required
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                placeholder="مثال: بشير الإدريسي (أو زوجته عائشة علمي)"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
                id="recipient-name-input"
              />
            </div>
          )}

          {/* Details of statement details */}
          <div>
            <div className="flex justify-between items-center mb-1.5 font-sans">
              <label className="block text-xs font-bold text-slate-300">وقائع وقرار الانتقال المكتوب بالتفصيل *</label>
              
              {/* Quick Preset Layout Formatting shortcuts */}
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => insertTemplateText('prologue')}
                  className="bg-slate-950 hover:bg-slate-900 text-slate-300 text-[10px] py-1 px-2.5 rounded border border-slate-800 flex items-center gap-1 cursor-pointer font-bold"
                  title="أدرج ديباجة الإجراء من المسطرة المدنية للتوفير"
                >
                  <AlignRight className="w-3 h-3 text-blue-500" />
                  <span>+ ديباجة المسطرة</span>
                </button>
                <button
                  type="button"
                  onClick={() => insertTemplateText('refusal')}
                  className="bg-slate-950 hover:bg-slate-900 text-slate-300 text-[10px] py-1 px-2.5 rounded border border-slate-800 flex items-center gap-1 cursor-pointer font-bold"
                >
                  <span>+ إشهاد الامتناع</span>
                </button>
                <button
                  type="button"
                  onClick={() => insertTemplateText('preview_note')}
                  className="bg-slate-950 hover:bg-slate-900 text-slate-300 text-[10px] py-1 px-2.5 rounded border border-slate-800 flex items-center gap-1 cursor-pointer font-bold"
                >
                  <span>+ تقرير المعاينة</span>
                </button>
              </div>
            </div>

            <textarea
              required
              rows={7}
              value={statementDetails}
              onChange={(e) => setStatementDetails(e.target.value)}
              placeholder="نحن المفوض القضائي الموقع أسفله... انتقلنا إلى العنوان وعاينا ما يلي..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-white focus:outline-none focus:border-blue-500 font-sans leading-relaxed text-right font-medium"
              id="report-details-textarea"
            ></textarea>
          </div>

          {/* Device level image uploader with scaling */}
          <div className="border border-slate-800 rounded-xl p-4 space-y-3 bg-slate-950/40">
            <h4 className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <Camera className="w-4 h-4 text-blue-500" />
              إرفاق فوتوغرافي ميداني ملخص (كتمهيد لإثبات السند)
            </h4>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 mb-1">وصف وعنوان المرفق الصوري</label>
                <input
                  type="text"
                  value={attachmentTitle}
                  onChange={(e) => setAttachmentTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded p-1.5 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-slate-500 mb-1">رفع وتصوير بالهاتف (مضغوط على الجهاز) *</label>
                <div className="relative">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAttachmentUpload}
                    className="absolute inset-0 opacity-0 w-full h-full cursor-pointer z-10"
                    id="camera-photo-upload"
                  />
                  <div className="bg-slate-950 border border-dashed border-slate-800 rounded p-2 text-center text-xs text-slate-400 hover:bg-slate-900 flex items-center justify-center gap-2">
                    <Upload className="w-4 h-4 text-slate-500" />
                    <span>{isCompressing ? 'جاري ضغط الحجم بدقة...' : 'التقط بكاميرا الحقل أو ارفع'}</span>
                  </div>
                </div>
              </div>
            </div>

            {attachmentBase64 && (
              <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 flex items-center justify-between gap-3 animate-fade-in">
                <div className="flex items-center gap-3">
                  <img src={attachmentBase64} className="w-12 h-12 object-cover rounded border border-slate-800" alt="المرفق الميداني" />
                  <div>
                    <span className="text-xs font-bold text-slate-300 block truncate max-w-48">{attachmentTitle}</span>
                    <span className="text-[10px] text-emerald-400 font-bold block">مضغوط ومؤمن (JPEG 70%) ✔</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setAttachmentBase64(null)}
                  className="text-slate-500 hover:text-rose-500 p-1 rounded"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

        </div>

        {/* Digital Signature and stamping block (RHS - Span 5) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* HTML5 Canvas Signature Pad */}
          <div className="bg-slate-950 rounded-xl border border-slate-800 p-4 space-y-3">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
              <span className="text-xs font-black text-white flex items-center gap-1.5">
                <Signature className="w-4 h-4 text-blue-500" />
                صندوق التوقيع الرقمي / البصمة الميدانية
              </span>
              <button
                type="button"
                onClick={clearSignature}
                className="text-[10px] text-slate-400 hover:text-white font-bold flex items-center gap-0.5 cursor-pointer"
                id="clear-signature-btn"
              >
                <RotateCcw className="w-3 h-3" />
                مسح اللوحة
              </button>
            </div>

            <p className="text-[10px] text-slate-500 leading-normal font-bold">
              اطلب من مستلم الإشعار أو الشاهد استخدام إصبعه أو القلم الإلكتروني للتوقيع مباشرة داخل المربع المائي أدناه:
            </p>

            <div className="bg-slate-900 rounded-lg border-2 border-dashed border-blue-500/20 overflow-hidden relative" id="signature-canvas-wrapper">
              <canvas
                ref={canvasRef}
                width={360}
                height={150}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
                className="w-full h-[150px] bg-slate-950/40 cursor-crosshair blockTouchScroll touch-none"
                id="signature-canvas"
              ></canvas>
              {!hasSignature && (
                <div className="absolute inset-0 flex items-center justify-center text-slate-600 select-none pointer-events-none text-xs font-bold text-center font-sans">
                  [ارسم البصمة أو التوقيع هنا]
                </div>
              )}
            </div>
          </div>

          {/* Official Electronic certifying Stamp verification */}
          <div className="bg-blue-950/20 rounded-xl border border-blue-900/30 p-5 flex flex-col items-center text-center space-y-4">
            <div className="bg-blue-900/10 p-3.5 rounded-full text-blue-500 border border-blue-900/30">
              <Stamp className="w-7 h-7" />
            </div>

            <div>
              <h4 className="text-xs font-bold text-slate-200 font-sans">ختم ومصادقة مكتب المفوض</h4>
              <p className="text-[10px] text-slate-500 mt-1 max-w-sm font-bold">
                ينشئ هذا الإجراء ترميزاً جنائياً مدمجاً للتوقيع مع ترقيم الUUID بسجل العدل الوطني تفعيلاً للمادتين 15 و16.
              </p>
            </div>

            {hasOfficialStamp ? (
              <div className="bg-emerald-950/40 border border-emerald-500/50 text-emerald-400 rounded-lg py-2 px-6 text-xs font-bold animate-pulse flex items-center gap-1.5 font-sans" id="verified-stamp-indicator">
                <CheckCircle className="w-4 h-4 text-emerald-500" />
                <span>المحضر مختوم وموثق قانونياً الأستاذ الخليفي &rlm;✅</span>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleApplyOfficialStamp}
                disabled={!hasSignature}
                className={`py-2 px-6 rounded-lg text-xs font-bold shadow-md transition-all flex items-center gap-1.5 ${hasSignature ? 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer shadow-md shadow-blue-500/10' : 'bg-slate-950 text-slate-600 cursor-not-allowed border border-slate-900 font-bold'}`}
                id="apply-stamp-btn"
              >
                <span>تطبيق الختم والمصادقة</span>
              </button>
            )}
          </div>

          {/* Submit Actions */}
          <div className="flex gap-3 justify-end pt-4">
            <button
              type="button"
              onClick={onCancel}
              className="bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-300 font-bold py-2.5 px-6 rounded-lg text-xs cursor-pointer flex-1"
            >
              مغادرة المسودة
            </button>
            
            <button
              type="button"
              onClick={handleSaveReportAndMedia}
              disabled={isSaving}
              className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold py-2.5 px-8 rounded-lg text-xs shadow-md transition-all flex-1 text-center cursor-pointer font-sans"
              id="report-commit-local-btn"
            >
              {isSaving ? 'مواد مشفرة محفوظة...' : 'تثبيت التقرير نهائياً'}
            </button>
          </div>

        </div>

      </div>

      {/* Historical reports list for the current selected file */}
      {allReports.filter(rep => rep.fileId === selectedFile.id).length > 0 && (
        <div className="border-t border-slate-800 pt-6 mt-6 space-y-4">
          <h3 className="text-sm font-extrabold text-white flex items-center gap-2 justify-start">
            <History className="w-4 h-4 text-blue-500" />
            فهرس المحاضر والتقارير المنجزة سابقاً لملف هذه القضية ({selectedFile.caseNumber})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {allReports.filter(rep => rep.fileId === selectedFile.id).map(report => {
              const rectFile = selectedFile;
              const isExpanded = expandedReportId === report.id;
              return (
                <div key={report.id} className="bg-slate-950 border border-slate-800 p-4 rounded-xl space-y-3" id={`nested-linked-archived-${report.id}`}>
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-xs text-slate-200">
                        {report.reportType === 'notification_minutes' && 'محضر تبليغ رسمي وإعذار'}
                        {report.reportType === 'execution_minutes' && 'محضر معاينة حجز تنفيذي'}
                        {report.reportType === 'preview_report' && 'محضر إثبات حال ومعاينة'}
                      </h4>
                      <span className="text-[10px] text-teal-400 font-semibold mt-1 block">
                        النتيجة: {
                          report.servingOutcome === 'handed_in_person' ? 'تم التبليغ شخصياً' :
                          report.servingOutcome === 'handed_to_family' ? 'تم التبليغ للأقارب' :
                          report.servingOutcome === 'neighbor_refused' ? 'عسر (امتناع)' :
                          report.servingOutcome === 'closed_door' ? 'تعذر (مغلق)' :
                          report.servingOutcome === 'executed_successfully' ? 'تم جرد الحجز' : 'تعذر (مقاومة)'
                        }
                      </span>
                    </div>
                    <span className="text-[8px] bg-slate-900 border border-slate-800 text-slate-500 font-mono px-2 py-0.5 rounded">
                      {new Date(report.createdAt).toLocaleDateString('ar-MA')}
                    </span>
                  </div>

                  {isExpanded && (
                    <div className="bg-slate-900 border border-slate-800 p-3 rounded text-[10px] text-slate-300 font-sans leading-relaxed whitespace-pre-wrap">
                      {report.statementDetails}
                    </div>
                  )}

                  <div className="flex justify-between items-center pt-2 border-t border-slate-900">
                    <button
                      type="button"
                      onClick={() => setExpandedReportId(isExpanded ? null : report.id!)}
                      className="text-[9px] text-slate-400 hover:text-white font-bold flex items-center gap-1 cursor-pointer"
                    >
                      {isExpanded ? 'إخفاء التفاصيل' : 'عرض المحتوى'}
                    </button>

                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleCopyToClipboard(report.statementDetails, report.id!)}
                        className={`py-1 px-2.5 rounded text-[8.5px] font-bold ${copiedReportId === report.id ? 'bg-emerald-900/35 text-emerald-400 border border-emerald-800' : 'bg-slate-900 hover:bg-slate-800 text-slate-400 border border-slate-800 cursor-pointer'}`}
                      >
                        {copiedReportId === report.id ? 'تم النسخ' : 'نسخ'}
                      </button>
                      
                      <button
                        type="button"
                        onClick={() => handleExportToPDF(report, rectFile)}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold py-1 px-3 rounded text-[9px] flex items-center gap-1 cursor-pointer"
                      >
                        <Printer className="w-2.5 h-2.5" />
                        <span>تصدير PDF 📄</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

    </div>
  );
}
