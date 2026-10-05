const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const context=vm.createContext({window:{}});vm.runInContext(fs.readFileSync(__dirname+'/data/latest-site-data.js','utf8'),context);
const data=context.window.PCT_LATEST_SITE_DATA;
assert.deepEqual(Object.keys(data).sort(),['categories','catalogGroups','exportedAt','items','layout','version'].sort());
assert.equal(data.items.length,52);assert.equal(data.categories.length,12);assert.equal(data.catalogGroups.length,2);
const ids=new Set(data.items.map(item=>item.id));
for(const group of data.catalogGroups){assert.equal(group.memberIds.length,3);assert(group.memberIds.every(id=>ids.has(id)));}
const blocked=new Set(['cases','sheetConfig','dailyReports','cred','credentials','credential','username','password','history','lastEditor','editor']);
function check(value){if(!value||typeof value!=='object')return;for(const [key,child] of Object.entries(value)){assert(!blocked.has(key),'Sensitive field excluded: '+key);check(child);}}
check(data);
for(const item of data.items){if(item.url){const url=new URL(item.url);assert(!url.username&&!url.password);assert(['https:','http:'].includes(url.protocol));}}
console.log('PASS: October public catalog has 52 cards and 2 groups; customer cases, credentials, history and settings are excluded.');
