const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const html = fs.readFileSync(__dirname+'/index.html','utf8');
function codeBetween(start,end){return html.slice(html.indexOf(start),html.indexOf(end,html.indexOf(start)));}
const ctx = vm.createContext({
MANAGER_CATEGORY_ID:'manager-id',
CATS:[{id:'manager-id',name:'Renamed manager'},{id:'alternate',name:' Manager '},{id:'public',name:'Operations'}],
DATA:[{id:'one',category:'manager-id'},{id:'two',category:'alternate'},{id:'three',category:'public'}]
});
vm.runInContext(codeBetween('function isManagerCategory(','\nasync function selectCategory'),ctx);
vm.runInContext(codeBetween('function getSearchableCatalogItems(','\nfunction catalogActionIcon'),ctx);
assert.deepEqual(Array.from(ctx.getSearchableCatalogItems(),r=>r.id),['three']);
ctx.DATA.push({id:'late-manager-entry',category:'manager-id'});
assert.equal(ctx.getSearchableCatalogItems().length,1,'New Manager items are excluded too');
assert(html.includes('getSearchableCatalogItems().map(item=>({item, score: scoreItem(item, q)}))'));
assert(html.includes('managerGateIsOpen() ? DATA : getSearchableCatalogItems()'),'Locked safe-copy omits Manager items');
assert(html.includes('ต้องปลดล็อกก่อน Export'),'Full backup cannot bypass Manager UI gate');
const zone = vm.createContext({window:{}});
vm.runInContext(fs.readFileSync(__dirname+'/data/postcode-zones.js','utf8'),zone);
assert.equal(zone.window.PCT_POSTCODE_ZONE_REFERENCE.length,6);
assert.equal(zone.window.PCT_POSTCODE_ZONE_REFERENCE.reduce((n,g)=>n+g.places.length,0),39);
const expected=[['Red zone','#FF0000',10],['Orange zone','#E97132',8],['Blue zone','#4E95D9',5],['Green zone','#47D45A',5],['Purple zone','#A02B93',6],['Pink zone','#FFCCFF',5]];
assert.deepEqual(Array.from(zone.window.PCT_POSTCODE_ZONES,g=>[g.id,g.color,g.postcodes.length]),expected);
const gs=fs.readFileSync(__dirname+'/GoogleAppsScript_Code.gs','utf8');
const server=vm.createContext({});
vm.runInContext(gs.match(/const POSTCODE_ZONE_GROUPS = Object.freeze\([\s\S]*?\);/)[0]+';globalThis.groups=POSTCODE_ZONE_GROUPS;',server);
for(const g of server.groups){for(const code of g[3]){const match=zone.window.pctFindPostcodeZone(code);assert(match);assert.equal(match.id,g[0]);assert.equal(match.color,g[1]);assert.equal(match.textColor,g[2]);}}
assert.equal(zone.window.pctFindPostcodeZone('10260').id,'Green zone');
assert.equal(zone.window.pctFindPostcodeZone('10270').id,'Pink zone');
assert.equal(zone.window.pctFindPostcodeZone('10210').id,'Orange zone');
for(const code of ['10222','11000','1026','105410','',null])assert.equal(zone.window.pctFindPostcodeZone(code),null);
for(const file of ['data/error-codes.js','data/latest-site-data.js','data/postcode-zones.js']){
new vm.Script(fs.readFileSync(__dirname+'/'+file,'utf8'),{filename:file});
}
const toolHtml=fs.readFileSync(__dirname+'/tools/incentive-calculator.html','utf8');
for(const match of toolHtml.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)){if(match[1].trim())new vm.Script(match[1]);}
console.log('PASS: Manager/export guards; 6 Appointment Zone groups, 39 postcodes, server parity and unsupported codes.');
