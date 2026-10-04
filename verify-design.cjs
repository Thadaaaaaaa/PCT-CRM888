const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const html = fs.readFileSync(__dirname + '/index.html','utf8');
assert(html.includes('id="pctOperationsConsoleDesign"'));
assert(!/<script[^>]+src=["'][^"']*xlsx/i.test(html), 'Excel must not load during startup');
assert(html.includes('await ensureExcelParser();'), 'Upload waits for parser');
assert(html.includes('<h2>Operations Console</h2>'));
assert.equal((html.match(/<h4 class="crm-workspace-heading">/g)||[]).length,0);
// Customer Workspace markup is frozen at the approved pre-design version.
const crypto = require('node:crypto');
const crmStart = html.indexOf('function renderAirCRM(main){');
const crmEnd = html.indexOf('\nfunction renderAirCRMRefresh',crmStart);
assert.equal(crypto.createHash('sha256').update(html.slice(crmStart,crmEnd)).digest('hex'),'41ee7c84cedad4b71c2dcd86624930fc35fb06be5665e288c26ded0588f656e8','Customer questions and line arrangement must not change without approval');
const questionStart = html.indexOf('const CRM_SURVEY_QUESTIONS_AIR');
const questionEnd = html.indexOf('\nfunction toDMY',questionStart);
assert.equal(crypto.createHash('sha256').update(html.slice(questionStart,questionEnd)).digest('hex'),'8a452c811f69ad4402d729a3eb6204431507be1541ef55d32804d3a63b70fd0d','Air, Washer and Repair questions and choices are frozen');
assert(html.includes("activeCategory !== 'cust'"),'New design excludes Customer Workspace');
assert(html.includes("if(cat.id === 'ops'){ renderFleetMap(main); }"));
const mapStart = html.indexOf('function renderFleetMap(container){');
const mapEnd = html.indexOf('\nfunction renderIncentiveTool',mapStart);
const mapFunction = html.slice(mapStart,mapEnd);
assert(mapFunction.includes("frame.loading = 'eager';"),'Map renders automatically, without a toggle');
assert(mapFunction.includes("frame.title = 'Appointment Area — Google My Maps';"));
assert(mapFunction.includes("href = mapUrl;"),'Full editor uses existing Google session');
assert(!mapFunction.includes('AccountChooser'),'No separate Google login function');
assert(!mapFunction.includes('data-map-toggle'),'Preview cannot be collapsed');
assert(mapFunction.includes('target="_blank" rel="noopener noreferrer"'));
const start = html.indexOf('let pctExcelParserPromise = null;');
const end = html.indexOf('\nfunction hexToRgba',start);
let appended = 0;
let fail = false;
const context = vm.createContext({window:{},Promise,Error,setTimeout,clearTimeout,
  document:{createElement:()=>({remove(){}}),head:{appendChild(script){
    appended++;
    queueMicrotask(()=>{if(fail) script.onerror();else{context.window.XLSX={read:()=>[]};script.onload();}});
  }}}
});
vm.runInContext(html.slice(start,end),context);
(async()=>{
  const first = context.ensureExcelParser();
  assert.equal(context.ensureExcelParser(),first,'Concurrent imports share one request');
  await first;
  assert.equal(appended,1);
  await context.ensureExcelParser();
  assert.equal(appended,1,'Loaded library is reused');
  delete context.window.XLSX;
  vm.runInContext('pctExcelParserPromise = null;',context);
  fail = true;
  await assert.rejects(context.ensureExcelParser(),/unavailable/);
  fail = false;
  await context.ensureExcelParser();
  assert.equal(appended,3,'Failed request can be retried');
  console.log('PASS: design guards, lazy Excel loading, concurrency, failure and retry.');
})().catch(e=>{console.error(e);process.exitCode=1;});
