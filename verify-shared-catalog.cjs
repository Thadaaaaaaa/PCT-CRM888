const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync(__dirname+'/index.html','utf8');
const asset={window:{}};vm.runInNewContext(fs.readFileSync(__dirname+'/data/latest-site-data.js','utf8'),asset);
const published=asset.window.PCT_LATEST_SITE_DATA;
const publishedOriginal=JSON.stringify(published);
const clone=x=>JSON.parse(JSON.stringify(x));
const source=html.slice(html.indexOf('function pctApplyPublishedCatalog('),html.indexOf('\nfunction saveAll(){'));
const old={dataExportedAt:1,seedVersion:1,categories:[{id:'local',name:'Local menu'}],items:[{id:'local-item',category:'local',title:'Unsynced title'}],layout:{local:[{label:'Local row',ids:['local-item']}]},catalogGroups:[],cases:[{id:'fixture-case',so:'TEST-NOT-A-REAL-CASE'}],sheetConfig:{webAppUrl:'https://script.google.com/macros/s/test-custom/exec'},dailyReports:{fixture:{total:3}}};
const storage=new Map([['hub',JSON.stringify(old)]]);
let context;
context=vm.createContext({
 window:{PCT_LATEST_SITE_DATA:published},PUBLIC_DATA_PAYLOAD:published,LATEST_DATA_EXPORT:published.exportedAt,
 LATEST_SETTINGS_SEED:{categories:[{id:'legacy',name:'Legacy seed'}],items:[{id:'legacy-item',category:'legacy'}]},
 MANAGER_CATEGORY_SEED:{id:'manager-fixture',name:'Manager'},LATEST_LINKS:{},LS_KEY:'hub',
 CATS:[],DATA:[],LAYOUT:{},CATALOG_GROUPS:[],CASES:[],SHEET_CONFIG:{webAppUrl:'default'},DAILY_REPORTS:{},
 localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},
 sanitizeCategories:clone,sanitizeCatalogItems:clone,sanitizeCatalogGroups:clone,sanitizeCases:clone,
 pctNormalizeSheetUrl:x=>x,pctGetSheetUrl(){},initSidebarCollapse(){},setupGlobalEvents(){},render(){},showToast(){},
 saveAll(){storage.set('hub',JSON.stringify({dataExportedAt:published.exportedAt,categories:context.CATS,items:context.DATA,layout:context.LAYOUT,catalogGroups:context.CATALOG_GROUPS,cases:context.CASES,sheetConfig:context.SHEET_CONFIG,dailyReports:context.DAILY_REPORTS}));}
});
vm.runInContext(source,context);
function check(){
 context.loadAll();
 const current=JSON.parse(storage.get('hub'));
 for(const key of ['categories','items','layout','catalogGroups'])assert.deepEqual(current[key],clone(published[key]),key+' uses the shared published snapshot');
 for(const key of ['cases','sheetConfig','dailyReports'])assert.deepEqual(current[key],old[key],key+' stays on its original device');
 assert.equal(JSON.stringify(published),publishedOriginal,'Loading never mutates the published asset');
 return current;
}
check();
const backup=storage.get('pctCatalogBeforeSharedSync_v1');
assert(backup);assert.deepEqual(JSON.parse(backup).items,old.items);
assert(!Object.hasOwn(JSON.parse(backup),'cases'));
const current=JSON.parse(storage.get('hub'));current.items[0].title='Device-specific edit';current.dataExportedAt=published.exportedAt+999;
storage.set('hub',JSON.stringify(current));check();
assert.equal(storage.get('pctCatalogBeforeSharedSync_v1'),backup,'Original backup is not replaced on later page loads');
storage.delete('hub');context.loadAll();
const fresh=JSON.parse(storage.get('hub'));
for(const key of ['categories','items','layout','catalogGroups'])assert.deepEqual(fresh[key],clone(published[key]),'Fresh and existing browsers use the same '+key);
assert.deepEqual(fresh.cases,[]);assert.deepEqual(fresh.dailyReports,{});
delete context.window.PCT_LATEST_SITE_DATA;const sentinel=clone(context.DATA);
context.pctApplyPublishedCatalog(old);assert.deepEqual(clone(context.DATA),sentinel,'Missing public script does not erase local catalog');
console.log('PASS: all devices load the same published catalog; local cases/settings/reports and original menu backup are preserved.');
