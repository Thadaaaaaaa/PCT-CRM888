/**
 * PCT × Xiaomi Order Operations
 * Spreadsheet: Order Schedules
 * Deploy as: Web app
 */
const CONFIG = Object.freeze({
  SPREADSHEET_ID: '1yLyOaIkjQs88BKud9b5lYWY05jiZ6TrIg35Pgz4afNk',
  TIME_ZONE: 'Asia/Bangkok',
  SHEETS: Object.freeze({
    REPORT: 'Report',
    ORDERS: 'Orders',
    PROBLEMS: 'Problem case',
    AC: 'AC service'
  }),
  ORDER_COLUMNS: 19,
  CACHE_SECONDS: 300,
  DEFAULT_PAGE_SIZE: 30,
  MAX_PAGE_SIZE: 100
});
let SPREADSHEET_CACHE_ = null;

function doGet(e) {
  const action = e && e.parameter ? clean_(e.parameter.action) : '';
  if (action === 'getReports') {
    return jsonOutput_({
      ok: true,
      reportApi: true,
      items: getReports(Number(e.parameter.limit) || 365)
    });
  }
  if (action === 'reportHealth') {
    return jsonOutput_({ ok: true, reportApi: true, version: 'PCT_REPORT_API_V1' });
  }
  if (action === 'dashboardBootstrap') {
    const dashboardRows = getOrderRows_();
    const dashboardSummary = makeSummary_(dashboardRows);
    return jsonOutput_({
      ok: true,
      dashboardApi: true,
      version: 'PCT_DASHBOARD_API_V2',
      summary: dashboardSummary,
      orders: filterOrders_(dashboardRows, requestParams_(e))
    });
  }
  if (action === 'dashboardLiveSummary') {
    return jsonOutput_({
      ok: true,
      dashboardApi: true,
      summary: getAppointmentLiveSummary_()
    });
  }
  if (action === 'getOrders') {
    return jsonOutput_({ ok: true, dashboardApi: true, orders: getOrders(requestParams_(e)) });
  }
  if (action === 'getProblemCases') {
    return jsonOutput_({ ok: true, dashboardApi: true, problems: getProblemCases(requestParams_(e)) });
  }
  if (action === 'getACServices') {
    return jsonOutput_({ ok: true, dashboardApi: true, services: getACServices(requestParams_(e)) });
  }
  if (action === 'getEditableOrderCase') {
    return jsonOutput_({
      ok: true,
      dashboardApi: true,
      data: getEditableOrderCase(e.parameter.so)
    });
  }
  return HtmlService.createTemplateFromFile('Index')
    .evaluate()
    .setTitle('PCT × Xiaomi Order Operations')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, viewport-fit=cover');
}

function doPost(e) {
  try {
    const payload = JSON.parse(e && e.postData && e.postData.contents ? e.postData.contents : '{}');
    if (payload.action === 'saveReport') {
      const result = saveReport(payload.data || {});
      return jsonOutput_(Object.assign({ ok: true, reportApi: true }, result));
    }
    if (payload.action === 'updateOrderCase') {
      return jsonOutput_(Object.assign(
        { ok: true, dashboardApi: true },
        updateOrderCaseFields(payload.data || {})
      ));
    }
    if (payload.action === 'saveProblemCase') {
      return jsonOutput_(Object.assign(
        { ok: true, dashboardApi: true },
        saveProblemCase(payload.data || {})
      ));
    }
    if (payload.action === 'addACService') {
      return jsonOutput_(Object.assign(
        { ok: true, dashboardApi: true },
        addACServiceBySO(payload.so)
      ));
    }
    const result = saveCRMOrderFromWebhook_(payload);
    return jsonOutput_(Object.assign({ ok: true }, result));
  } catch (error) {
    console.error(error);
    return jsonOutput_({ ok: false, message: error.message || String(error) });
  }
}

/**
 * อ่านข้อมูลจาก Report!A:M
 */
function getReports(limit) {
  const sheet = getSheet_(CONFIG.SHEETS.REPORT);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  limit = Math.min(1000, Math.max(1, Number(limit) || 365));
  const startRow = Math.max(2, lastRow - limit + 1);
  return sheet.getRange(startRow, 1, lastRow - startRow + 1, 13)
    .getDisplayValues()
    .map(function (r, index) {
      return {
        rowNumber: startRow + index,
        date: normalizeDateString_(r[0]) || r[0],
        serviceProvider: r[1],
        teamNumber: r[2],
        newOrder: r[3],
        acWork: r[4],
        wmWork: r[5],
        closedToday: r[6],
        cancelOrder: r[7],
        currentPending: r[8],
        reschedule: r[9],
        cancelDetail: r[10],
        outOfSystem: r[11],
        remarks: r[12]
      };
    })
    .filter(function (row) { return row.date || row.serviceProvider; });
}

/**
 * เพิ่มหรืออัปเดต Report โดยใช้ Date เป็นคีย์
 * เว็บเขียนเฉพาะ A, C:F, H, J:M และไม่แตะสูตรใน B, G, I
 */
function saveReport(payload) {
  payload = payload || {};
  const dateText = clean_(payload.date);
  if (!dateText) throw new Error('กรุณาระบุ Date');

  const date = parseFlexibleDate_(dateText);
  if (!date) throw new Error('รูปแบบ Date ไม่ถูกต้อง');
  const sheet = getSheet_(CONFIG.SHEETS.REPORT);
  const lock = LockService.getDocumentLock();
  lock.waitLock(15000);
  try {
    const targetDate = Utilities.formatDate(date, CONFIG.TIME_ZONE, 'yyyy-MM-dd');
    let rowNumber = 0;
    const lastRow = sheet.getLastRow();
    if (lastRow >= 2) {
      const keys = sheet.getRange(2, 1, lastRow - 1, 1).getDisplayValues();
      for (let i = 0; i < keys.length; i++) {
        if (normalizeDateString_(keys[i][0]) === targetDate) {
          rowNumber = i + 2;
          break;
        }
      }
    }
    const isNewRow = !rowNumber;
    if (isNewRow) {
      rowNumber = Math.max(2, lastRow + 1);
      if (lastRow >= 2) {
        copyReportAutomaticCell_(sheet, lastRow, rowNumber, 2, true);
        copyReportFormula_(sheet, lastRow, rowNumber, 7);
        copyReportFormula_(sheet, lastRow, rowNumber, 9);
      }
    }

    sheet.getRange(rowNumber, 1).setValue(date);
    sheet.getRange(rowNumber, 3, 1, 4).setValues([[
      reportNumber_(payload.teamNumber),
      reportNumber_(payload.newOrder),
      reportNumber_(payload.acWork),
      reportNumber_(payload.wmWork)
    ]]);
    sheet.getRange(rowNumber, 8).setValue(reportNumber_(payload.cancelOrder));
    sheet.getRange(rowNumber, 10, 1, 4).setValues([[
      clean_(payload.reschedule),
      clean_(payload.cancelDetail),
      clean_(payload.outOfSystem),
      clean_(payload.remarks)
    ]]);
    sheet.getRange(rowNumber, 1).setNumberFormat('dd/MM/yyyy');
    SpreadsheetApp.flush();
    return {
      message: rowNumber <= lastRow ? 'อัปเดต Report เรียบร้อยแล้ว' : 'เพิ่ม Report เรียบร้อยแล้ว',
      rowNumber: rowNumber
    };
  } finally {
    lock.releaseLock();
  }
}

/**
 * Service Provider ในไฟล์ปัจจุบันเป็นค่าคงที่ PCS บางแถว ไม่ใช่สูตร
 * จึงอนุญาตให้คัดลอกค่าจากแถวก่อนหน้าเมื่อไม่มีสูตร โดยยังไม่รับค่าจากหน้าเว็บ
 */
function copyReportAutomaticCell_(sheet, sourceRow, targetRow, column, allowStaticValue) {
  const source = sheet.getRange(sourceRow, column);
  if (source.getFormula()) {
    source.copyTo(
      sheet.getRange(targetRow, column),
      SpreadsheetApp.CopyPasteType.PASTE_FORMULA,
      false
    );
    return;
  }
  if (allowStaticValue && source.getValue() !== '') {
    sheet.getRange(targetRow, column).setValue(source.getValue());
  }
}

/**
 * คัดลอกเฉพาะสูตรจากแถวก่อนหน้า โดยไม่คัดลอกค่าคงที่มาทับข้อมูลใหม่
 */
function copyReportFormula_(sheet, sourceRow, targetRow, column) {
  const source = sheet.getRange(sourceRow, column);
  if (!source.getFormula()) return;
  source.copyTo(
    sheet.getRange(targetRow, column),
    SpreadsheetApp.CopyPasteType.PASTE_FORMULA,
    false
  );
}

/**
 * รองรับฟอร์ม Customer Case เดิมโดยไม่ต้องแสดงช่อง Web App URL ในหน้า CRM
 */
function saveCRMOrderFromWebhook_(payload) {
  if (!clean_(payload.so)) throw new Error('กรุณาระบุ Service Order ID');
  const sheet = getSheet_(CONFIG.SHEETS.ORDERS);
  const lock = LockService.getDocumentLock();
  lock.waitLock(15000);
  try {
    const existingRow = findRowByValue_(sheet, 2, payload.so);
    const rowNumber = existingRow || Math.max(2, sheet.getLastRow() + 1);
    sheet.getRange(rowNumber, 1, 1, 17).setValues([[
      toSheetDate_(payload.columnA),
      clean_(payload.so),
      clean_(payload.doNumber),
      clean_(payload.customerName),
      clean_(payload.phone),
      clean_(payload.address),
      clean_(payload.postcode),
      clean_(payload.statusLabel),
      clean_(payload.fillOnFile) || 'No',
      toSheetDate_(payload.apptDate),
      clean_(payload.apptTime),
      clean_(payload.model),
      clean_(payload.customerType),
      clean_(payload.transactionType),
      clean_(payload.difficulty),
      clean_(payload.columnOContent),
      clean_(payload.noted2)
    ]]);
    invalidateOrderCache_();
    SpreadsheetApp.flush();
    return {
      message: existingRow ? 'อัปเดต Order เรียบร้อยแล้ว' : 'เพิ่ม Order เรียบร้อยแล้ว',
      rowNumber: rowNumber
    };
  } finally {
    lock.releaseLock();
  }
}

function reportNumber_(value) {
  const number = Number(String(value == null ? '' : value).replace(/,/g, ''));
  return isFinite(number) ? number : 0;
}

function jsonOutput_(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function requestParams_(e) {
  const p = e && e.parameter ? e.parameter : {};
  return {
    q: clean_(p.q),
    status: clean_(p.status),
    difficulty: clean_(p.difficulty),
    dateFrom: clean_(p.dateFrom),
    dateTo: clean_(p.dateTo),
    date: clean_(p.date),
    month: clean_(p.month),
    dateField: clean_(p.dateField) === 'coming' ? 'coming' : 'appointment',
    page: Math.max(1, Number(p.page) || 1),
    pageSize: Math.min(CONFIG.MAX_PAGE_SIZE, Math.max(10, Number(p.pageSize) || CONFIG.DEFAULT_PAGE_SIZE))
  };
}

function getBootstrap(params) {
  const rows = getOrderRows_();
  return {
    summary: makeSummary_(rows),
    orders: filterOrders_(rows, params || {})
  };
}

function getOrders(params) {
  return filterOrders_(getOrderRows_(), params || {});
}

function getDashboardSummary() {
  return makeSummary_(getOrderRows_());
}

/**
 * ค้นหาเคสจาก SO โดยส่งคืนเฉพาะ J, K, P ที่อนุญาตให้แก้
 */
function getEditableOrderCase(so) {
  const found = findOrderBySO_(so);
  if (!found) throw new Error('ไม่พบเลข SO ในหน้า Orders');
  return stripSearchText_(found.data);
}

/**
 * แก้ไข Orders!A:P โดยใช้ SO เดิมเป็นคีย์ค้นหาแถว
 */
function updateOrderCaseFields(payload) {
  payload = payload || {};
  const so = clean_(payload.originalSo || payload.so);
  if (!so) throw new Error('กรุณาระบุเลข SO');

  const lock = LockService.getDocumentLock();
  lock.waitLock(15000);
  try {
    const found = findOrderBySO_(so);
    if (!found) throw new Error('ไม่พบเลข SO ในหน้า Orders');
    const sheet = getSheet_(CONFIG.SHEETS.ORDERS);

    sheet.getRange(found.rowNumber, 1, 1, 16).setValues([[
      toSheetDate_(payload.date),
      clean_(payload.so) || found.data.so,
      clean_(payload.deliveryOrder),
      clean_(payload.name),
      clean_(payload.phone),
      clean_(payload.address),
      clean_(payload.postCode),
      clean_(payload.status),
      clean_(payload.fillOnFile),
      toSheetDate_(payload.appointmentDate),
      clean_(payload.appointmentTime),
      clean_(payload.model),
      clean_(payload.vip),
      clean_(payload.type),
      clean_(payload.difficulty),
      clean_(payload.noted)
    ]]);
    sheet.getRange(found.rowNumber, 1).setNumberFormat('dd/MM/yyyy');
    sheet.getRange(found.rowNumber, 10).setNumberFormat('dd/MM/yyyy');
    invalidateOrderCache_();

    return {
      ok: true,
      message: 'อัปเดตข้อมูล Orders คอลัมน์ A–P เรียบร้อยแล้ว',
      data: getEditableOrderCase(clean_(payload.so) || so)
    };
  } finally {
    lock.releaseLock();
  }
}

function getProblemOrderInfo(so) {
  const found = findOrderBySO_(so);
  if (!found) throw new Error('ไม่พบเลข SO ในหน้า Orders');
  const o = found.data;
  return {
    so: o.so,
    deliveryOrder: o.deliveryOrder,
    name: o.name,
    phone: o.phone,
    address: o.address,
    type: o.type,
    model: o.model
  };
}

function getProblemCases(params) {
  params = params || {};
  const sheet = getSheet_(CONFIG.SHEETS.PROBLEMS);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return { items: [], total: 0 };

  const rows = sheet.getRange(2, 1, lastRow - 1, 22).getDisplayValues();
  const q = normalize_(params.q);
  const date = clean_(params.date);
  const status = normalize_(params.status);

  const items = rows.map(function (r, index) {
    return {
      rowNumber: index + 2,
      so: r[0],
      deliveryOrder: r[1],
      name: r[2],
      phone: r[3],
      address: r[4],
      type: r[5],
      model: r[6],
      dateReceived: r[7],
      problem: r[8],
      previousTeam: r[9],
      appointmentDate: r[13],
      appointmentTime: r[14],
      status: r[15],
      repairTeam: r[16],
      steps: r[20],
      result: r[21]
    };
  }).filter(function (item) {
    if (!item.so) return false;
    if (q && !normalize_([
      item.so, item.deliveryOrder, item.name, item.phone,
      item.problem, item.status, item.repairTeam
    ].join(' ')).includes(q)) return false;
    if (date && normalizeDateString_(item.appointmentDate) !== date &&
        normalizeDateString_(item.dateReceived) !== date) return false;
    if (status && normalize_(item.status) !== status) return false;
    return true;
  });

  items.sort(function (a, b) {
    return dateSortValue_(b.dateReceived, b.appointmentTime) -
      dateSortValue_(a.dateReceived, a.appointmentTime);
  });
  return { items: items.slice(0, 300), total: items.length };
}

function saveProblemCase(payload) {
  payload = payload || {};
  const so = clean_(payload.so);
  if (!so) throw new Error('กรุณาระบุเลข SO');
  if (!clean_(payload.dateReceived)) throw new Error('กรุณาระบุวันที่รับเคส');
  if (!clean_(payload.problem)) throw new Error('กรุณาระบุรายละเอียดปัญหา');

  const order = getProblemOrderInfo(so);
  const sheet = getSheet_(CONFIG.SHEETS.PROBLEMS);
  const lock = LockService.getDocumentLock();
  lock.waitLock(15000);
  try {
    const rowNumber = findRowByValue_(sheet, 1, so) || sheet.getLastRow() + 1;
    const isNew = rowNumber > sheet.getLastRow();

    if (isNew) {
      sheet.getRange(rowNumber, 1, 1, 22).setValues([[
        order.so, order.deliveryOrder, order.name, order.phone, order.address,
        order.type, order.model, toSheetDate_(payload.dateReceived),
        clean_(payload.problem), clean_(payload.previousTeam), '', '', '',
        toSheetDate_(payload.appointmentDate), clean_(payload.appointmentTime),
        clean_(payload.status) || 'รับเรื่องแล้ว', clean_(payload.repairTeam),
        '', '', '', clean_(payload.steps), clean_(payload.result)
      ]]);
    } else {
      sheet.getRange(rowNumber, 1, 1, 7).setValues([[
        order.so, order.deliveryOrder, order.name, order.phone,
        order.address, order.type, order.model
      ]]);
      sheet.getRange(rowNumber, 8, 1, 3).setValues([[
        toSheetDate_(payload.dateReceived), clean_(payload.problem),
        clean_(payload.previousTeam)
      ]]);
      sheet.getRange(rowNumber, 14, 1, 4).setValues([[
        toSheetDate_(payload.appointmentDate), clean_(payload.appointmentTime),
        clean_(payload.status) || 'รับเรื่องแล้ว', clean_(payload.repairTeam)
      ]]);
      sheet.getRange(rowNumber, 21, 1, 2).setValues([[
        clean_(payload.steps), clean_(payload.result)
      ]]);
    }

    SpreadsheetApp.flush();
    return {
      ok: true,
      message: isNew ? 'เพิ่ม Problem case เรียบร้อยแล้ว' : 'อัปเดต Problem case เรียบร้อยแล้ว',
      rowNumber: rowNumber
    };
  } finally {
    lock.releaseLock();
  }
}

function getACServices(params) {
  params = params || {};
  const sheet = getSheet_(CONFIG.SHEETS.AC);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return { items: [], total: 0 };

  const rows = sheet.getRange(2, 1, lastRow - 1, 9).getDisplayValues();
  const q = normalize_(params.q);
  const date = clean_(params.date);
  const month = clean_(params.month);

  const items = rows.map(function (r, index) {
    return {
      rowNumber: index + 2,
      so: r[0],
      name: r[1],
      phone: r[2],
      address: r[3],
      type: r[4],
      model: r[5],
      installDate: r[6],
      serviceDate: r[7],
      noted: r[8]
    };
  }).filter(function (item) {
    if (!item.so) return false;
    if (q && !normalize_([
      item.so, item.name, item.phone, item.address, item.model
    ].join(' ')).includes(q)) return false;
    const iso = normalizeDateString_(item.serviceDate);
    if (date && iso !== date) return false;
    if (month && iso.slice(0, 7) !== month) return false;
    return true;
  });

  items.sort(function (a, b) {
    return dateSortValue_(a.serviceDate, '') - dateSortValue_(b.serviceDate, '');
  });
  return { items: items.slice(0, 500), total: items.length };
}

/**
 * หน้า AC Service กรอกแค่ SO:
 * - ดึงข้อมูลจาก Orders
 * - Date install = Orders!J
 * - Date Appointment for AC service = Date install + 1 ปี
 */
function addACServiceBySO(so) {
  so = clean_(so);
  if (!so) throw new Error('กรุณาระบุเลข SO');
  const found = findOrderBySO_(so);
  if (!found) throw new Error('ไม่พบเลข SO ในหน้า Orders');
  if (!found.data.appointmentDate) {
    throw new Error('SO นี้ยังไม่มี Date appointment ในหน้า Orders');
  }

  const sheet = getSheet_(CONFIG.SHEETS.AC);
  const lock = LockService.getDocumentLock();
  lock.waitLock(15000);
  try {
    const existingRow = findRowByValue_(sheet, 1, so);
    if (existingRow) {
      return { ok: true, exists: true, message: 'SO นี้อยู่ใน AC service แล้ว', rowNumber: existingRow };
    }

    const installDate = parseFlexibleDate_(found.data.appointmentDate);
    if (!installDate) throw new Error('รูปแบบ Date appointment ไม่ถูกต้อง');
    const serviceDate = new Date(installDate.getTime());
    serviceDate.setFullYear(serviceDate.getFullYear() + 1);

    sheet.appendRow([
      found.data.so,
      found.data.name,
      found.data.phone,
      found.data.address,
      found.data.type,
      found.data.model,
      installDate,
      serviceDate,
      found.data.noted
    ]);
    SpreadsheetApp.flush();
    return { ok: true, message: 'เพิ่มนัดล้างแอร์เรียบร้อยแล้ว' };
  } finally {
    lock.releaseLock();
  }
}

function filterOrders_(rows, params) {
  const q = normalize_(params.q);
  const status = normalize_(params.status);
  const difficulty = normalize_(params.difficulty);
  const dateFrom = clean_(params.dateFrom);
  const dateTo = clean_(params.dateTo);
  const dateField = clean_(params.dateField) === 'coming' ? 'coming' : 'appointment';
  const page = Math.max(1, Number(params.page) || 1);
  const pageSize = Math.min(
    CONFIG.MAX_PAGE_SIZE,
    Math.max(10, Number(params.pageSize) || CONFIG.DEFAULT_PAGE_SIZE)
  );

  const filtered = rows.filter(function (o) {
    if (q && !o.searchText.includes(q)) return false;
    if (status && normalize_(o.status) !== status) return false;
    if (difficulty && normalize_(o.difficulty) !== difficulty) return false;
    const iso = normalizeDateString_(dateField === 'coming' ? o.date : o.appointmentDate);
    if (dateFrom && (!iso || iso < dateFrom)) return false;
    if (dateTo && (!iso || iso > dateTo)) return false;
    return true;
  }).sort(function (a, b) {
    const bDate = dateField === 'coming' ? b.date : b.appointmentDate;
    const aDate = dateField === 'coming' ? a.date : a.appointmentDate;
    return dateSortValue_(bDate, dateField === 'coming' ? '' : b.appointmentTime) -
      dateSortValue_(aDate, dateField === 'coming' ? '' : a.appointmentTime);
  });

  const start = (page - 1) * pageSize;
  return {
    items: filtered.slice(start, start + pageSize).map(stripSearchText_),
    total: filtered.length,
    summary: makeOrderStatusSummary_(filtered),
    page: page,
    pageSize: pageSize,
    totalPages: Math.max(1, Math.ceil(filtered.length / pageSize))
  };
}

function makeOrderStatusSummary_(rows) {
  const summary = { total: rows.length, confirm: 0, pendingFillOnFile: 0 };
  rows.forEach(function (order) {
    const status = normalize_(order.status);
    if (status === 'confirm') summary.confirm++;
    if (status === 'confirm' && normalize_(order.fillOnFile) === 'no') summary.pendingFillOnFile++;
  });
  return summary;
}

function makeSummary_(rows) {
  const appointmentCounts = {};
  const summary = {
    total: rows.length,
    confirm: 0,
    pendingFillOnFile: 0,
    withAppointment: 0,
    classI: 0,
    classII: 0,
    classIII: 0,
    updatedAt: Utilities.formatDate(new Date(), CONFIG.TIME_ZONE, 'dd/MM/yyyy HH:mm')
  };
  rows.forEach(function (o) {
    const status = normalize_(o.status);
    const difficulty = normalize_(o.difficulty).replace(/\s/g, '');
    if (status === 'confirm') summary.confirm++;
    if (status === 'confirm' && normalize_(o.fillOnFile) === 'no') summary.pendingFillOnFile++;
    if (o.appointmentDate) {
      summary.withAppointment++;
      const appointmentDate = normalizeDateString_(o.appointmentDate);
      if (appointmentDate) appointmentCounts[appointmentDate] = (appointmentCounts[appointmentDate] || 0) + 1;
    }
    if (difficulty === 'classi') summary.classI++;
    if (difficulty === 'classii') summary.classII++;
    if (difficulty === 'classiii') summary.classIII++;
  });
  summary.appointmentsByDate = Object.keys(appointmentCounts).sort().map(function (date) {
    return { date: date, count: appointmentCounts[date] };
  });
  return summary;
}

/**
 * อัปเดต Dashboard แบบเบา: อ่านเฉพาะ Orders!J (Date appointment)
 * แทนการอ่าน Orders, Problem case และ AC service ทั้งชุดทุก 30 วินาที
 */
function getAppointmentLiveSummary_() {
  const sheet = getSheet_(CONFIG.SHEETS.ORDERS);
  const lastRow = sheet.getLastRow();
  const appointmentCounts = {};
  let withAppointment = 0;
  if (lastRow >= 2) {
    sheet.getRange(2, 10, lastRow - 1, 1).getDisplayValues().forEach(function (row) {
      const iso = normalizeDateString_(row[0]);
      if (!iso) return;
      withAppointment++;
      appointmentCounts[iso] = (appointmentCounts[iso] || 0) + 1;
    });
  }
  return {
    withAppointment: withAppointment,
    appointmentsByDate: Object.keys(appointmentCounts).sort().map(function (date) {
      return { date: date, count: appointmentCounts[date] };
    }),
    updatedAt: Utilities.formatDate(new Date(), CONFIG.TIME_ZONE, 'dd/MM/yyyy HH:mm:ss')
  };
}

function countOpenProblems_() {
  const sheet = getSheet_(CONFIG.SHEETS.PROBLEMS);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return 0;
  const rowCount = lastRow - 1;
  const serviceOrders = sheet.getRange(2, 1, rowCount, 1).getDisplayValues();
  const statuses = sheet.getRange(2, 16, rowCount, 1).getDisplayValues();
  let count = 0;
  for (let i = 0; i < rowCount; i++) {
    if (!clean_(serviceOrders[i][0])) continue;
    if (normalize_(statuses[i][0]) !== normalize_('แก้ไขแล้ว')) count++;
  }
  return count;
}

function countUpcomingACServices_() {
  const sheet = getSheet_(CONFIG.SHEETS.AC);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return 0;
  const rowCount = lastRow - 1;
  const serviceOrders = sheet.getRange(2, 1, rowCount, 1).getDisplayValues();
  const appointmentDates = sheet.getRange(2, 8, rowCount, 1).getDisplayValues();
  const todayIso = Utilities.formatDate(new Date(), CONFIG.TIME_ZONE, 'yyyy-MM-dd');
  let count = 0;
  for (let i = 0; i < rowCount; i++) {
    if (!clean_(serviceOrders[i][0])) continue;
    const date = normalizeDateString_(appointmentDates[i][0]);
    if (date && date >= todayIso) count++;
  }
  return count;
}

function getOrderRows_(skipCache) {
  const cache = CacheService.getScriptCache();
  const token = getCacheToken_();
  const metaKey = 'pct-orders-meta-' + token;
  const metaText = cache.get(metaKey);

  if (!skipCache && metaText) {
    try {
      const meta = JSON.parse(metaText);
      const keys = [];
      for (let i = 0; i < meta.chunks; i++) keys.push('pct-orders-' + token + '-' + i);
      const cached = cache.getAll(keys);
      if (keys.every(function (key) { return cached[key]; })) {
        return keys.reduce(function (all, key) {
          return all.concat(JSON.parse(cached[key]));
        }, []);
      }
    } catch (error) {
      // หาก cache เสีย จะอ่านจากชีตใหม่
    }
  }

  const sheet = getSheet_(CONFIG.SHEETS.ORDERS);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  const values = sheet.getRange(2, 1, lastRow - 1, CONFIG.ORDER_COLUMNS).getDisplayValues();
  const rows = values.map(mapOrderRow_).filter(function (o) { return o.so; });
  storeOrderCache_(cache, token, metaKey, rows);
  return rows;
}

function mapOrderRow_(r) {
  const data = {
    date: r[0],
    so: r[1],
    deliveryOrder: r[2],
    name: r[3],
    phone: r[4],
    address: r[5],
    postCode: r[6],
    status: r[7],
    fillOnFile: r[8],
    appointmentDate: r[9],
    appointmentTime: r[10],
    model: r[11],
    vip: r[12],
    type: r[13],
    difficulty: r[14],
    noted: r[15],
    noted2: r[16],
    csUpdate: r[17],
    picture: r[18]
  };
  data.searchText = normalize_([
    data.date, data.so, data.deliveryOrder, data.name, data.phone, data.address,
    data.postCode, data.status, data.fillOnFile, data.appointmentDate,
    data.appointmentTime, data.model, data.vip, data.type, data.difficulty,
    data.noted, data.noted2, data.csUpdate, data.picture
  ].join(' '));
  return data;
}

function stripSearchText_(item) {
  const copy = Object.assign({}, item);
  delete copy.searchText;
  return copy;
}

function storeOrderCache_(cache, token, metaKey, rows) {
  try {
    const chunks = [];
    let current = [];
    let currentLength = 2;
    rows.forEach(function (row) {
      const encoded = JSON.stringify(row);
      if (current.length && currentLength + encoded.length > 70000) {
        chunks.push(current);
        current = [];
        currentLength = 2;
      }
      current.push(row);
      currentLength += encoded.length + 1;
    });
    if (current.length) chunks.push(current);

    const values = {};
    chunks.forEach(function (chunk, index) {
      values['pct-orders-' + token + '-' + index] = JSON.stringify(chunk);
    });
    cache.putAll(values, CONFIG.CACHE_SECONDS);
    cache.put(metaKey, JSON.stringify({ chunks: chunks.length }), CONFIG.CACHE_SECONDS);
  } catch (error) {
    console.warn('Order cache skipped: ' + error.message);
  }
}

function findOrderBySO_(so) {
  so = clean_(so);
  if (!so) return null;
  const sheet = getSheet_(CONFIG.SHEETS.ORDERS);
  const rowNumber = findRowByValue_(sheet, 2, so);
  if (!rowNumber) return null;
  const row = sheet.getRange(rowNumber, 1, 1, CONFIG.ORDER_COLUMNS).getDisplayValues()[0];
  return { rowNumber: rowNumber, data: mapOrderRow_(row) };
}

function findRowByValue_(sheet, column, value) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return 0;
  const match = sheet.getRange(2, column, lastRow - 1, 1)
    .createTextFinder(String(value).trim())
    .matchEntireCell(true)
    .matchCase(false)
    .findNext();
  return match ? match.getRow() : 0;
}

function getSheet_(name) {
  if (!SPREADSHEET_CACHE_) {
    SPREADSHEET_CACHE_ = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  }
  const sheet = SPREADSHEET_CACHE_.getSheetByName(name);
  if (!sheet) throw new Error('ไม่พบแท็บ "' + name + '"');
  return sheet;
}

function getCacheToken_() {
  const props = PropertiesService.getScriptProperties();
  let token = props.getProperty('PCT_ORDER_CACHE_TOKEN');
  if (!token) {
    token = String(Date.now());
    props.setProperty('PCT_ORDER_CACHE_TOKEN', token);
  }
  return token;
}

function invalidateOrderCache_() {
  PropertiesService.getScriptProperties()
    .setProperty('PCT_ORDER_CACHE_TOKEN', String(Date.now()));
}

function toSheetDate_(value) {
  if (!clean_(value)) return '';
  return parseFlexibleDate_(value) || clean_(value);
}

function parseFlexibleDate_(value) {
  if (value instanceof Date && !isNaN(value)) return value;
  const text = clean_(value);
  if (!text) return null;
  let match = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (match) return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12);
  match = text.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})$/);
  if (match) {
    let year = Number(match[3]);
    if (year < 100) year += 2000;
    if (year > 2400) year -= 543;
    return new Date(year, Number(match[2]) - 1, Number(match[1]), 12);
  }
  const parsed = new Date(text);
  return isNaN(parsed) ? null : parsed;
}

function normalizeDateString_(value) {
  const date = parseFlexibleDate_(value);
  return date ? Utilities.formatDate(date, CONFIG.TIME_ZONE, 'yyyy-MM-dd') : '';
}

function dateSortValue_(dateValue, timeValue) {
  const date = parseFlexibleDate_(dateValue);
  if (!date) return 0;
  const time = clean_(timeValue).match(/(\d{1,2})[:.](\d{2})/);
  if (time) date.setHours(Number(time[1]), Number(time[2]), 0, 0);
  return date.getTime();
}

function clean_(value) {
  return value == null ? '' : String(value).trim();
}

function normalize_(value) {
  return clean_(value).toLowerCase().replace(/\s+/g, ' ');
}
