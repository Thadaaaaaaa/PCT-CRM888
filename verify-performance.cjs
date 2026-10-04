const fs=require('node:fs'), vm=require('node:vm'), assert=require('node:assert/strict');
const html=fs.readFileSync(__dirname+'/index.html','utf8');
assert(!html.includes('<script src="data/error-codes.js"></script>'));
const start=html.indexOf('let KB_ERROR_MODEL'),end=html.indexOf('\nconst ',start);
let requests=0,fail=false;
const context=vm.createContext({window:{},document:{createElement:()=>({remove(){}}),head:{appendChild(s){requests++;queueMicrotask(()=>{if(fail)s.onerror();else{context.window.PCT_ERROR_CODE_DATA={records:[{code:'TEST'}]};s.onload();}});}}}});
vm.runInContext(html.slice(start,end),context);
(async()=>{
 const first=context.ensureKnowledgeData();assert.equal(context.ensureKnowledgeData(),first);
 await first;await context.ensureKnowledgeData();assert.equal(requests,1);
 delete context.window.PCT_ERROR_CODE_DATA;vm.runInContext('pctKnowledgePromise=null',context);fail=true;
 await assert.rejects(context.ensureKnowledgeData());fail=false;await context.ensureKnowledgeData();
 assert.equal(requests,3);assert(html.includes("activeCategory==='cat_1ysw82rn'"));
 console.log('PASS: Knowledge lazy loading, shared request, cache, failure/retry and correct category guard');
})().catch(e=>{console.error(e);process.exitCode=1;});
