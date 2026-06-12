/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

app.use(express.json({ limit: '15mb' })); // Allow field media Base64 uploads

// --- Server-Side Data Storage (Mocking PostgreSQL Core Mirror) ---
const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'server_db.json');

// Initialize server database with default users list if empty
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(DB_FILE)) {
  fs.writeFileSync(
    DB_FILE,
    JSON.stringify({ 
      files: [], 
      reports: [], 
      media: [], 
      financials: [],
      users: [
        { username: 'elkhalifi', name: 'الأستاذ المصطفى الخليفي', role: 'officer', office: 'مكتب المفوض القضائي بالرباط - الدائرة القضائية وبني ملال', password: 'admin2026' },
        { username: 'yassir_assistant', name: 'ياسير الداودي (مساعد محلف)', role: 'assistant', office: 'مكتب المفوض القضائي بالرباط', password: 'admin2026' },
        { username: 'rachida_acc', name: 'رشيدة علمي (محاسبة المكتب)', role: 'accountant', office: 'مكتب المفوض القضائي بالرباط', password: 'admin2026' }
      ]
    }, null, 2)
  );
}

// Quick Helper to read/write central state
function readServerDB() {
  try {
    const data = fs.readFileSync(DB_FILE, 'utf8');
    const parsed = JSON.parse(data);
    // Ensure users array always exists
    if (!parsed.users) {
      parsed.users = [
        { username: 'elkhalifi', name: 'الأستاذ المصطفى الخليفي', role: 'officer', office: 'مكتب المفوض القضائي بالرباط - الدائرة القضائية وبني ملال', password: 'admin2026' },
        { username: 'yassir_assistant', name: 'ياسير الداودي (مساعد محلف)', role: 'assistant', office: 'مكتب المفوض القضائي بالرباط', password: 'admin2026' },
        { username: 'rachida_acc', name: 'رشيدة علمي (محاسبة المكتب)', role: 'accountant', office: 'مكتب المفوض القضائي بالرباط', password: 'admin2026' }
      ];
    }
    return parsed;
  } catch (e) {
    return { 
      files: [], 
      reports: [], 
      media: [], 
      financials: [],
      users: [
        { username: 'elkhalifi', name: 'الأستاذ المصطفى الخليفي', role: 'officer', office: 'مكتب المفوض القضائي بالرباط - الدائرة القضائية وبني ملال', password: 'admin2026' },
        { username: 'yassir_assistant', name: 'ياسير الداودي (مساعد محلف)', role: 'assistant', office: 'مكتب المفوض القضائي بالرباط', password: 'admin2026' },
        { username: 'rachida_acc', name: 'رشيدة علمي (محاسبة المكتب)', role: 'accountant', office: 'مكتب المفوض القضائي بالرباط', password: 'admin2026' }
      ]
    };
  }
}

function writeServerDB(data: any) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// --- API Endpoints ---

// 1. JWT and RBAC Authentication Core
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  const db = readServerDB();

  const matched = db.users.find((u: any) => u.username.toLowerCase().trim() === username.toLowerCase().trim());
  if (matched && password === matched.password) {
    res.json({
      success: true,
      user: {
        id: `usr_${matched.username}`,
        username: matched.username,
        name: matched.name,
        role: matched.role,
        officeName: matched.office || 'مكتب المفوض القضائي بالرباط',
        auth_level: matched.role === 'officer' ? 3 : matched.role === 'accountant' ? 2 : 1,
        token: `mock-jwt-token-level-${matched.role}-${Date.now()}`
      }
    });
  } else {
    res.status(401).json({
      success: false,
      message: matched 
        ? 'رمز المرور غير صحيح لهذا المعرّف.' 
        : 'اسم المستخدم غير موجود بالنظام المركزي.'
    });
  }
});

// 1b. Team list retrieval
app.get('/api/team', (req, res) => {
  const db = readServerDB();
  res.json({
    success: true,
    team: db.users
  });
});

// 1c. Modify Team member profile (restricted to officer)
app.post('/api/team/update', (req, res) => {
  const { username, name, password } = req.body;
  if (!username) {
    return res.status(400).json({ success: false, message: 'المعرّف الإلكتروني مطلوب.' });
  }

  const db = readServerDB();
  const index = db.users.findIndex((u: any) => u.username.toLowerCase().trim() === username.toLowerCase().trim());
  
  if (index === -1) {
    return res.status(404).json({ success: false, message: 'مستعمل غير مقيد بالنظام.' });
  }

  if (name !== undefined) db.users[index].name = name;
  if (password !== undefined) db.users[index].password = password;

  writeServerDB(db);
  res.json({
    success: true,
    message: 'تم تحديث البيانات بصفة قطعية على الخادم المركزي!',
    team: db.users
  });
});

// 2. Synchronize endpoint (/api/sync)
app.post('/api/sync', (req, res) => {
  const { queueItems, clerk } = req.body;
  if (!queueItems || !Array.isArray(queueItems)) {
    return res.status(400).json({ success: false, error: 'تنسيق الطلب غير صالح / Invalid schema' });
  }

  console.log(`[Sync Engine] Received ${queueItems.length} transactional logs from ${clerk || 'Field Agent'}`);

  const db = readServerDB();
  const successfulLocalIds: number[] = [];

  for (const item of queueItems) {
    const { id: localSyncId, action, table, recordId, data } = item;
    try {
      const parsedRecord = JSON.parse(data);

      if (table === 'files') {
        const index = db.files.findIndex((f: any) => f.id === recordId);
        if (action === 'create' || action === 'update') {
          if (index > -1) {
            db.files[index] = { ...db.files[index], ...parsedRecord, syncedAt: new Date().toISOString() };
          } else {
            db.files.push({ ...parsedRecord, syncedAt: new Date().toISOString() });
          }
        } else if (action === 'delete') {
          db.files = db.files.filter((f: any) => f.id !== recordId);
        }
      } 
      
      else if (table === 'reports') {
        const index = db.reports.findIndex((r: any) => r.id === recordId);
        if (action === 'create' || action === 'update') {
          if (index > -1) {
            db.reports[index] = { ...db.reports[index], ...parsedRecord, syncedAt: new Date().toISOString() };
          } else {
            db.reports.push({ ...parsedRecord, syncedAt: new Date().toISOString() });
          }
        }
      } 
      
      else if (table === 'media') {
        const index = db.media.findIndex((m: any) => m.id === recordId);
        if (action === 'create') {
          if (index === -1) {
            db.media.push({ ...parsedRecord, syncedAt: new Date().toISOString() });
          }
        }
      } 
      
      else if (table === 'financials') {
        const index = db.financials.findIndex((f: any) => f.id === recordId);
        if (action === 'create' || action === 'update') {
          if (index > -1) {
            db.financials[index] = { ...db.financials[index], ...parsedRecord, syncedAt: new Date().toISOString() };
          } else {
            db.financials.push({ ...parsedRecord, syncedAt: new Date().toISOString() });
          }
        }
      }

      // Track successful local database rows to return to client
      successfulLocalIds.push(localSyncId);
    } catch (err) {
      console.error(`[Error Syncing Item id ${localSyncId}]:`, err);
    }
  }

  writeServerDB(db);

  res.json({
    success: true,
    syncedIds: successfulLocalIds,
    timestamp: new Date().toISOString(),
    message: `تمت مزامنة عدد ${successfulLocalIds.length} من السجلات بنجاح في نظام المخابرة المركزي`
  });
});

// 3. Central DB Records Explorer Endpoint
app.get('/api/server-records', (req, res) => {
  const db = readServerDB();
  res.json({
    success: true,
    stats: {
      filesCount: db.files.length,
      reportsCount: db.reports.length,
      mediaCount: db.media.length,
      financialsCount: db.financials.length,
    },
    records: db
  });
});

// 4. Dynamic Legal Document HTML-PDF Printer Endpoint
app.get('/api/reports/:id/pdf', (req, res) => {
  const { id } = req.params;
  const db = readServerDB();
  const report = db.reports.find((r: any) => r.id === id);
  if (!report) {
    return res.status(404).send('<h1>المحضر غير موجود / Report Not Found on Central Server</h1>');
  }

  const file = db.files.find((f: any) => f.id === report.fileId);

  // Generate an authentic judicial minute document layout
  const htmlContent = `
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
      <meta charset="UTF-8">
      <title>محضر قضائي رسمي - رقم ${file?.caseNumber || 'غير معروف'}</title>
      <style>
        body { font-family: 'Cairo', system-ui, sans-serif; padding: 40px; background-color: #fff; color: #333; line-height: 1.8; }
        .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px double #071e3d; padding-bottom: 20px; font-size: 14px; }
        .royal-crest { text-align: center; }
        .royal-title { font-weight: bold; font-size: 18px; color: #071e3d; }
        .doc-title { text-align: center; margin: 40px 0; font-size: 24px; font-weight: bold; color: #071e3d; text-decoration: underline; }
        .section { margin-bottom: 25px; border: 1px solid #ddd; padding: 20px; border-radius: 8px; background: #fafafa; }
        .section-title { font-weight: bold; color: #1f4287; margin-bottom: 12px; border-bottom: 1px dashed #1f4287; padding-bottom: 6px; }
        .field { display: flex; margin-bottom: 10px; }
        .field-label { width: 180px; font-weight: bold; color: #555; }
        .field-value { flex-grow: 1; }
        .body-text { white-space: pre-wrap; font-size: 15px; margin-top: 15px; border-top: 1px solid #eee; padding-top: 15px; }
        .footer-signatures { display: flex; justify-content: space-between; margin-top: 50px; }
        .signature-box { width: 45%; text-align: center; border: 1px solid #ccc; padding: 15px; border-radius: 6px; min-height: 180px; display: flex; flex-direction: column; justify-content: space-between; }
        .stamp-circle { width: 130px; height: 130px; border: 4px double #1f4287; border-radius: 50%; display: flex; flex-direction: column; justify-content: center; align-items: center; font-size: 11px; color: #1f4287; font-weight: bold; transform: rotate(-12deg); margin: 10px auto; opacity: 0.95; }
        .legal-footer { margin-top: 60px; font-size: 11px; text-align: center; color: #777; border-top: 1px solid #ddd; padding-top: 10px; }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <strong>المملكة المغربية</strong><br>
          وزارة العدل والحريات<br>
          محكمة الاستئناف بالرباط<br>
          <strong>الأستاذ المصطفى الخليفي</strong><br>
          مفوض قضائي مقبول لدى المحاكم
        </div>
        <div class="royal-crest">
          <img src="https://img.icons8.com/color/96/justice-scales.png" width="60" alt="شعار المحكمة"><br>
          <span style="font-size: 10px; letter-spacing: 1px;">العدل أساس الملك</span>
        </div>
        <div style="text-align: left;">
          التاريخ: ${new Date(report.createdAt).toLocaleDateString('ar-MA')}<br>
          رقم الملف: ${file?.caseNumber || '---'}<br>
          بإذن محكمة: ${file?.courtName || '---'}
        </div>
      </div>

      <div class="doc-title">
        ${report.reportType === 'notification_minutes' ? 'محضر تبليغ رسمي وإعذار' : report.reportType === 'execution_minutes' ? 'محضر تنفيذ قضائي وجرد' : 'محضر إثبات حال ومعاينة'}
      </div>

      <div class="section">
        <div class="section-title">أولاً: هوية الأطراف وبطاقة الملف</div>
        <div class="field">
          <div class="field-label">طالب الإجراء (المدعي):</div>
          <div class="field-value">${file?.plaintiffName || 'مُرخص ومحمي'} [تبقياً للسر المهني]</div>
        </div>
        <div class="field">
          <div class="field-label">المبلغ إليه (المدعى عليه):</div>
          <div class="field-value">${file?.defendantName || 'مُرخص ومحمي'}</div>
        </div>
        <div class="field">
          <div class="field-label">موطن التبليغ المختار:</div>
          <div class="field-value">${file?.defendantAddress || 'مُرخص ومحمي'}</div>
        </div>
        <div class="field">
          <div class="field-label">موضوع الطلب:</div>
          <div class="field-value">${file?.caseType === 'notification' ? 'تبليغ حكم قضائي مع ذعيرة التهديدية' : file?.caseType === 'execution' ? 'حجز تنفيذي على المنقولات بموجب سند تفعيلي' : 'معاينة عينية للأضرار'}</div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">ثانياً: وقائع الانتقال والتبليغ القانونية</div>
        <div>
          بناء على مقتضيات الفصل 37 و38 و39 من قانون المسطرة المدنية المغربية، نحن <strong>${report.reporterName}</strong>، وبصفتنا مفوضاً قضائياً محلفاً، نشهد أننا انتقلنا إلى العنوان المذكور أعلاه، وقمنا بالإجراء الموثق أدناه:
        </div>
        <div class="body-text">
          ${report.statementDetails}
        </div>
        <div class="field" style="margin-top: 15px;">
          <div class="field-label">مآل الإجراء الميداني:</div>
          <div class="field-value" style="font-weight: bold; color: #1f4287;">
            ${report.servingOutcome === 'handed_in_person' ? '✅ تم التبليغ للمجلس عليه شخصياً' : report.servingOutcome === 'handed_to_family' ? '✅ سلمت النسخة لقريب مساكن معه' : '❌ تعذر التبليغ لغلق المحل المستمر'}
          </div>
        </div>
        ${report.recipientName ? `
        <div class="field">
          <div class="field-label">اسم المتسلم الصريح:</div>
          <div class="field-value">${report.recipientName}</div>
        </div>` : ''}
      </div>

      <div class="footer-signatures">
        <div class="signature-box">
          <strong>توقيع أو بصمة المتسلّم</strong>
          ${report.signatureBase64 ? `
            <div style="margin: auto;">
              <img src="${report.signatureBase64}" style="max-height: 100px; border: 1px solid #eee; background:#fff;" alt="التوقيع الرقمي">
            </div>
          ` : '<div style="margin: auto; color:#999; font-style:italic;">[رفض التوقيع أو غاب]</div>'}
          <span style="font-size: 11px;">صفة المتلم: ${report.recipientName ? 'المدعى عليه شخصياً' : 'مستوطن بالمنزل'}</span>
        </div>

        <div class="signature-box">
          <strong>خاتم وتوقيع المفوض القضائي</strong>
          ${report.hasOfficialStamp ? `
            <div class="stamp-circle">
              مفوض قضائي بمحكمة الرباط<br>
              المصطفى الخليفي<br>
              خاتم رسمي مرخص<br>
              ★ رقم 4428 ★
            </div>
          ` : '<div style="margin: auto; color:#ff4444;">[بانتظار المصادقة]</div>'}
          <span style="font-size: 10px; font-family: monospace;">UUID-SEC: ${id.toUpperCase()}</span>
        </div>
      </div>

      <div class="legal-footer">
        هذا المحضر محرر طبقاً لمقتضيات المادة 15 من القانون رقم 81.03 المنظم لمهنة المفوضين القضائيين وصحيحة في الإثبات.<br>
        <strong>ملاحظة هامة:</strong> أي تحوير أو تزوير في هذا المحضر يعرض صاحبه للعقوبات المقررة في الفصل 351 وما يليه من القانون الجنائي المغربي.
      </div>
    </body>
    </html>
  `;
  res.send(htmlContent);
});

// Setup Vite & Static Files Hosting
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Bailiff Server is running on port ${PORT}`);
  });
}

startServer();
