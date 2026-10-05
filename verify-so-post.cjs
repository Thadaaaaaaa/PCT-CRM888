const fs=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const html=fs.readFileSync(__dirname+'/index.html','utf8');
const start=html.indexOf('const RULES = [',html.indexOf('const SOApp ='));
const end=html.indexOf('/* ── Parsers ── */',start);
const context=vm.createContext({});
vm.runInContext(html.slice(start,end),context);
const common=['Service Order Number\n工单号','Name\n顾客姓名','Detail case','Team Technician (Car)','Engineer 1','Type','Class'];
function posts(extraHeaders,extraCells){return context.buildPosts([common.concat(extraHeaders),['ASTH26093060003157','Customer example','Service Order : OLD\nExpected Time : 01/01/2000 01:00\nCustomer : Customer example','4ฒญ4174','Engineer example','Installation only','Class III'].concat(extraCells)]);}
for(const headers of [['"Date\n上门日期"','"Time\n上门时间"'],['Date','Time'],['上门日期','上门时间'],['Date appointment','Appointment time']]){
 const result=posts(headers,['05/10/2026','13:00'])[0];
 assert.equal(result.date,'05/10/2026');assert.equal(result.time,'13:00');
 assert(result.text.includes('Expected Time : 05/10/2026 13:00'),'Dedicated appointment date and time must both appear');
 assert(!result.text.includes('01/01/2000'),'Stale dates in Detail case must not override dedicated columns');
 assert.equal(result.text.match(/Expected Time :/g).length,1);
}
assert.equal(posts(['上门时间','上门日期'],['09:30','05/10/2026'])[0].time,'09:30','Column order must not matter');
assert.equal(posts(['上门日期','上门日期'],['05/10/2026','14:00'])[0].time,'14:00','Legacy duplicate date headers remain supported');
assert.equal(posts(['上门日期','上门日期','Time\n上门时间'],['05/10/2026','old-value','00:00'])[0].time,'00:00','An explicit time header overrides legacy duplicate dates');
assert.equal(posts(['上门日期'],['05/10/2026'])[0].time,'','Missing time must not be fabricated');
const tsvStart=html.indexOf('function parseTSV(',end),tsvEnd=html.indexOf('\nasync function parseXLSX',tsvStart);
if(tsvEnd>tsvStart){vm.runInContext(html.slice(tsvStart,tsvEnd),context);const rows=context.parseTSV('"Service Order Number\n工单号"\t"Date\n上门日期"\t"Time\n上门时间"\nSO-DEMO\t05/10/2026\t10:30');assert.equal(context.buildPosts(rows)[0].time,'10:30');}
console.log('PASS: SO posts preserve bilingual date/time headers, column order, midnight, legacy headers and current appointment values.');
