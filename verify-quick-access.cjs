const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync(__dirname+'/data/quick-access.js','utf8');
new vm.Script(source);
const context=vm.createContext({window:{},URL,CATS:[{id:'ops',name:'Operations',icon:'📅'}],getSearchableCatalogItems:()=>[
 {id:'public-1',category:'ops',title:'Order <Schedules>',url:'https://example.com/orders'},
 {id:'no-link',category:'ops',title:'No link'},
 {id:'unsafe',category:'ops',title:'Unsafe',url:'javascript:alert(1)'}
],localStorage:{getItem:()=>JSON.stringify([{type:'catalog',id:'public-1'},{type:'catalog',id:'manager-1'},{type:'catalog',id:'deleted'},{type:'custom',id:'custom-1',name:'<script>alert(1)</script>',url:'https://example.com/private'}])}});
vm.runInContext(source.replace('window.PCTQuickAccess={validUrl,normalize,catalog,resolved};','window.PCTQuickAccess={validUrl,normalize,catalog,resolved,renderSaved};').replace(' install();',' favorites=read();'),context);
const api=context.window.PCTQuickAccess;
for(const invalid of ['javascript:alert(1)','data:text/html,x','file:///secret','https://user:password@example.com','relative/path'])assert.equal(api.validUrl(invalid),'');
assert.equal(api.validUrl('https://example.com'),'https://example.com/');
assert.equal(api.normalize(null).length,0);assert.equal(api.normalize([{type:'custom',id:'a',name:'',url:'https://example.com'}]).length,0);
assert.equal(api.normalize([{type:'catalog',id:'a'},{type:'catalog',id:'a'}]).length,1);
assert.equal(api.normalize(Array.from({length:40},(_,i)=>({type:'catalog',id:String(i)}))).length,24);
assert.deepEqual(Array.from(api.catalog(),c=>c.id),['public-1']);
assert.deepEqual(Array.from(api.resolved(),c=>c.id),['public-1','custom-1'],'Manager and deleted records cannot resolve');
const html=api.renderSaved();assert(html.includes('Order &lt;Schedules&gt;'));assert(!html.includes('<script>'));assert(html.includes('target="_blank" rel="noopener noreferrer"'));assert(html.includes('data-remove="catalog:public-1"'));
assert(source.includes('getSearchableCatalogItems()'));assert(!/\bfetch\s*\(/.test(source),'No remote synchronization');
const app=fs.readFileSync(__dirname+'/index.html','utf8');assert(app.includes('src="data/quick-access.js?v=20261005"'));assert(app.includes('href="data/quick-access.css?v=20261005"'));
console.log('PASS: Quick Access URL safety, escaping, duplicate/limit handling, public-only catalog and new-tab links');
const css=fs.readFileSync(__dirname+'/data/quick-access.css','utf8');
assert(css.includes('color:#39475b'),'Original launcher symbol color is preserved');
assert(css.includes('0 0 24px 8px rgba(255,145,65,.18)'),'Soft orange aura is present');
