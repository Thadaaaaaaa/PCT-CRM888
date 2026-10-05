const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const context=vm.createContext({window:{}});vm.runInContext(fs.readFileSync(__dirname+'/data/latest-site-data.js','utf8'),context);
const data=context.window.PCT_LATEST_SITE_DATA;
assert.deepEqual(Object.keys(data).sort(),['categories','catalogGroups','exportedAt','items','layout','version'].sort());
assert.equal(data.items.length,52);assert.equal(data.categories.length,12);assert.equal(data.catalogGroups.length,5);
const ids=new Set(data.items.map(item=>item.id));
assert(!ids.has('item_g2f2zimm')&&!ids.has('item_9xx075sw'),'Retired shortcuts are excluded');
assert.deepEqual(Array.from(data.catalogGroups,group=>group.memberIds.length),[3,4,3,4,3]);
const grouped=new Set();
for(const group of data.catalogGroups){assert(group.memberIds.every(id=>ids.has(id)));for(const id of group.memberIds){assert(!grouped.has(id),'Each card belongs to only one group');grouped.add(id);assert.equal(data.items.find(item=>item.id===id).category,group.category);}}
const blocked=new Set(['cases','sheetConfig','dailyReports','cred','credentials','credential','username','password','history','lastEditor','editor']);
function check(value){if(!value||typeof value!=='object')return;for(const [key,child] of Object.entries(value)){assert(!blocked.has(key),'Sensitive field excluded: '+key);check(child);}}
check(data);
for(const item of data.items){if(item.url){const url=new URL(item.url);assert(!url.username&&!url.password);assert(['https:','http:'].includes(url.protocol));}}
console.log('PASS: latest October catalog has 52 current cards and 5 groups; retired shortcuts and private data are excluded.');
