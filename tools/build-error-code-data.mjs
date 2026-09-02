import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const SPREADSHEET_ID = '1KGHybT3jrFaXgIrCClPYiwl_iQmSUbNTH0t4gbp5q-E';
const SOURCE_URL = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/edit`;
const SHEETS = [
  {
    name: 'AC',
    gid: '1464835070',
    product: 'ac',
    map: { category: 'หมวดหมู่', code: 'รหัส', meaning: 'หมายถึงรหัส', troubleshooting: 'วิธีแก้ไขปัญหา' }
  },
  {
    name: 'WM',
    gid: '1337027954',
    product: 'washer',
    category: 'เครื่องซักผ้า',
    map: {
      code: 'รหัส',
      meaning: 'ความหมายของรหัส',
      troubleshooting: 'วิธีแก้ไขปัญหา',
      materials: 'วัสดุที่แนะนำ (เรียงตามอัตราการล้มเหลว)'
    }
  },
  {
    name: 'Ref',
    gid: '410563846',
    product: 'fridge',
    map: {
      category: 'หมวดหมู่',
      code: 'รหัสข้อผิดพลาด',
      meaning: 'ความหมายของรหัส',
      troubleshooting: 'วิธีแก้ไขปัญหา',
      materials: 'ข้อแนะนำวัสดุ (เรียงตามอัตราการล้มเหลว)'
    }
  }
];

const PRODUCT_WARNINGS = {
  ac: 'ตัดเบรกเกอร์และตรวจว่าไม่มีไฟเลี้ยงก่อนเปิดฝาครอบหรือแตะวงจรไฟฟ้า งานสารทำความเย็นต้องดำเนินการโดยช่างที่ผ่านการอบรม',
  washer: 'ถอดปลั๊กและปิดวาล์วน้ำก่อนถอดชิ้นส่วน ห้ามทดสอบวงจรหรือปั๊มขณะมือหรือพื้นที่เปียก',
  fridge: 'ถอดปลั๊กก่อนตรวจชิ้นส่วนภายใน ระวังขอบโลหะ คาปาซิเตอร์ และระบบสารทำความเย็นที่ต้องใช้ช่างผู้เชี่ยวชาญ'
};

function parseCsv(text) {
  const rows = [];
  let row = [], value = '', quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quoted) {
      if (char === '"' && text[index + 1] === '"') { value += '"'; index += 1; }
      else if (char === '"') quoted = false;
      else value += char;
    } else if (char === '"') quoted = true;
    else if (char === ',') { row.push(value); value = ''; }
    else if (char === '\n') { row.push(value.replace(/\r$/, '')); rows.push(row); row = []; value = ''; }
    else value += char;
  }
  if (value || row.length) { row.push(value.replace(/\r$/, '')); rows.push(row); }
  const headers = rows.shift().map(clean);
  return rows
    .filter(values => values.some(value => clean(value)))
    .map(values => Object.fromEntries(headers.map((header, index) => [header, clean(values[index] || '')])));
}

function clean(value) {
  return String(value ?? '').replace(/\r\n?/g, '\n').replace(/[ \t]+\n/g, '\n').trim();
}

function extractRootCause(text) {
  const normalized = clean(text);
  const labelled = normalized.match(/^(?:สาเหตุ(?:(?!โปรดแก้ไข)[^\n:：])*[:：]|หลักการ(?:ความ)?ผิด(?:พลาด)?[:：]?)[ \t]*\n?([\s\S]*?)(?=\n(?:ขอบเขตความผิดพลาด|วิธีการ(?:ซ่อมแซม|บำรุงรักษา)|โปรดแก้ไขปัญหา)|$)/);
  if (labelled?.[1]) return clean(labelled[1]);
  const firstLine = normalized.split('\n').find(Boolean) || '';
  if (/^สาเหตุ/.test(firstLine)) return clean(firstLine.split(/โปรดแก้ไขปัญหา/)[0]);
  return '';
}

function extractSteps(text) {
  const normalized = clean(text);
  const anchor = normalized.search(/(?:วิธีการ(?:ซ่อมแซม|บำรุงรักษา)\s*[:：]|โปรดแก้ไขปัญหาตาม(?:ขั้นตอน|อาการ)[^:：\n]*[:：])/);
  let actionable = anchor >= 0 ? normalized.slice(anchor).replace(/^[^:：\n]*[:：]\s*/, '') : normalized;
  const firstStep = actionable.search(/(?:^|\n)(?:ขั้นตอนที่\s*)?1\s*[.):：]/);
  if (firstStep >= 0) actionable = actionable.slice(firstStep);
  actionable = actionable
    .replace(/(?:^|\n)ขั้นตอนที่\s*(\d+)\s*[:：]?\s*/g, '\n$1. ')
    .replace(/([;；])\s*(\d+)\s*[.)]\s*/g, '$1\n$2. ');
  const matches = [...actionable.matchAll(/(?:^|\n)(\d+)\s*[.)]\s*([\s\S]*?)(?=\n\d+\s*[.)]\s*|$)/g)];
  return matches.map(match => clean(match[2])).filter(Boolean);
}

function extractWarnings(product, text) {
  const warnings = [PRODUCT_WARNINGS[product]];
  clean(text).split('\n').forEach(line => {
    if (/^(?:หมายเหตุ|คำเตือน)|ห้ามใช้งาน|ตัดไฟทันที|ถอดปลั๊กทันที/.test(line.trim())) warnings.push(line.trim());
  });
  return [...new Set(warnings.filter(Boolean))];
}

function deriveSeverity(code, troubleshooting) {
  if (/ไม่ใช่รหัสข้อขัดข้อง/.test(troubleshooting) || /^(?:AU|END|LOCK)$/i.test(code)) return 'info';
  if (/ไฟรั่ว|ไฟไหม้|กลิ่นไหม้|ตัดไฟทันที|อันตราย/.test(troubleshooting)) return 'critical';
  if (/ลัดวงจร|แรงดันไฟ|ถอดปลั๊ก|คอมเพรสเซอร์|เมนบอร์ด|แผงหลัก/.test(troubleshooting)) return 'warning';
  return 'standard';
}

function makeId(product, code, rowNumber) {
  const slug = clean(code).toLowerCase().replace(/[^a-z0-9ก-๙]+/g, '-').replace(/^-|-$/g, '') || `row-${rowNumber}`;
  return `${product}-${slug}-${rowNumber}`;
}

async function loadSheet(config) {
  const url = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/export?format=csv&gid=${config.gid}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`โหลดชีต ${config.name} ไม่สำเร็จ (${response.status})`);
  const rows = parseCsv(await response.text());
  return rows.map((row, index) => {
    const get = key => clean(row[config.map[key]] || '');
    const code = get('code');
    const troubleshooting = get('troubleshooting');
    return {
      id: makeId(config.product, code, index + 2),
      product: config.product,
      category: get('category') || config.category,
      code,
      meaning: get('meaning'),
      rootCause: extractRootCause(troubleshooting),
      troubleshootingSteps: extractSteps(troubleshooting),
      troubleshooting,
      safetyWarnings: extractWarnings(config.product, troubleshooting),
      recommendedMaterials: get('materials'),
      severity: deriveSeverity(code, troubleshooting),
      keywords: [code, get('meaning'), get('materials')].filter(Boolean),
      source: { spreadsheetId: SPREADSHEET_ID, sheet: config.name, row: index + 2 }
    };
  }).filter(item => item.code || item.meaning || item.troubleshooting);
}

const records = (await Promise.all(SHEETS.map(loadSheet))).flat();
const currentFile = fileURLToPath(import.meta.url);
const outputDir = path.resolve(path.dirname(currentFile), '..', 'data');
const outputFile = path.join(outputDir, 'error-codes.js');
const payload = {
  schemaVersion: 1,
  sourceUrl: SOURCE_URL,
  generatedAt: new Date().toISOString(),
  products: {
    ac: { label: 'เครื่องปรับอากาศ', icon: '🌬️' },
    washer: { label: 'เครื่องซักผ้า', icon: '🧼' },
    fridge: { label: 'ตู้เย็น', icon: '🧊' }
  },
  records
};

await mkdir(outputDir, { recursive: true });
await writeFile(outputFile, `/* Generated from Google Sheet \"Error code\". Edit the sheet and run: node tools/build-error-code-data.mjs */\nwindow.PCT_ERROR_CODE_DATA=${JSON.stringify(payload)};\n`, 'utf8');
console.log(`สร้าง ${path.relative(process.cwd(), outputFile)} จำนวน ${records.length} รายการ`);
