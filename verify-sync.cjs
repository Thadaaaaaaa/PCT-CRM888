const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const html = fs.readFileSync(__dirname + '/index.html', 'utf8');
const source = html.slice(html.indexOf('const PCT_SHEET_WEB_APP_URL ='), html.indexOf('let crmEditingId ='));
const storage = new Map();
let fetchOptions, fetchUrl, cleared = 0, saveCount = 0;
let storageBlocked = false;
let fetchError = false;
const context = vm.createContext({String, Object, JSON, AbortController,
  localStorage:{getItem(k){if(storageBlocked) throw Error('blocked');return storage.get(k)||null;},setItem(k,v){if(storageBlocked) throw Error('blocked');storage.set(k,v);}},
  saveAll(){saveCount++;},setTimeout(){return 42;},clearTimeout(){cleared++;},
  async fetch(url, options){fetchUrl=url;fetchOptions=options;if(fetchError) throw Error('offline');return {ok:true,status:200,async text(){return '{"ok":true}';}}}
});
vm.runInContext(source, context);
const run = expression=>vm.runInContext(expression, context);
const current = run('PCT_SHEET_WEB_APP_URL'), retired = run('PCT_RETIRED_WEB_APP_URL');
const key = run('PCT_SHEET_URL_KEY');
const custom = 'https://script.google.com/macros/s/custom-deployment/exec';
assert.equal(context.pctGetSheetUrl(),current,'New devices use the working deployment');
storage.set(key,'https://example.com/exec');
assert.equal(context.pctGetSheetUrl(),current,'Invalid cached settings do not override a working deployment');
for(const legacy of [retired,retired+'?old=1']){
 storage.set(key,legacy);
 assert.equal(context.pctGetSheetUrl(),current,'Cached retired URLs are migrated');
 assert.equal(storage.get(key),current);
 assert.equal(run('SHEET_CONFIG.webAppUrl'),current);
}
storage.clear();run('SHEET_CONFIG.webAppUrl=PCT_RETIRED_WEB_APP_URL');
assert.equal(context.pctGetSheetUrl(),current,'CRM-only legacy settings migrate');
assert(context.pctSetSheetUrl(custom));assert.equal(context.pctGetSheetUrl(),custom);
assert.equal(run('SHEET_CONFIG.webAppUrl'),custom,'Dashboard and CRM share user configuration');
assert.equal(saveCount,1);
assert(!context.pctSetSheetUrl('https://example.com/exec'));
assert.equal(context.pctGetSheetUrl(),custom,'Invalid settings leave working configuration intact');
storageBlocked=true;
assert.equal(context.pctGetSheetUrl(),custom,'Blocked storage does not break Sheet requests');
assert(context.pctSetSheetUrl(current));
assert.equal(context.pctGetSheetUrl(),current);
(async()=>{
 const response=await context.pctSheetFetch(current,{method:'POST',headers:{'Content-Type':'text/plain;charset=UTF-8'},body:'{"so":"test"}'});
 assert.equal(fetchUrl,current);assert.equal(fetchOptions.credentials,'omit');assert.equal(fetchOptions.redirect,'follow');
 assert.equal(fetchOptions.headers['Content-Type'],'text/plain;charset=UTF-8');
 assert.equal((await response.json()).ok,true);assert.equal(cleared,1);
 fetchError=true;await assert.rejects(context.pctSheetFetch(current,{}),/offline/);assert.equal(cleared,2);
 // Sending twice during a slow request must save and transmit exactly once.
 let release, sends=0, saves=0, renders=0;
 const button={disabled:false,textContent:''};
 const sending=vm.createContext({JSON,document:{getElementById:()=>button},crmDraft:{so:'SO-test'},
  crmSaveCase(){saves++;return true;},showToast(){},render(){renders++;},
  crmSendToWebApp:async()=>{sends++;await new Promise(resolve=>{release=resolve;});}
 });
 const start=html.indexOf('let crmSendBusy = false;'), end=html.indexOf('\nfunction crmLoadCase',start);
 vm.runInContext(html.slice(start,end),sending);
 const first=sending.crmSaveAndSend();await sending.crmSaveAndSend();
 assert.equal(saves,1);assert.equal(sends,1);assert(button.disabled);
 release();await first;assert.equal(renders,1);assert.equal(vm.runInContext('crmSendBusy',sending),false);
 assert(!html.includes("mode: 'no-cors'"),'Writes must have a readable server confirmation');
 console.log('PASS: new and cached URLs, custom settings, blocked storage, credential-free transport, failures and duplicate submission.');
})().catch(error=>{console.error(error);process.exitCode=1;});
