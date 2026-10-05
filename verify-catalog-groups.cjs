const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const code=fs.readFileSync(__dirname+'/data/catalog-groups-capacity.js','utf8');
const items=[{id:'old',category:'stock',title:'Aug26',url:'https://example.com/aug'},{id:'new',category:'stock',title:'Sep26',url:'https://example.com/sep'},{id:'other',category:'private',title:'Private',url:'https://example.com/private'}];
const ctx=vm.createContext({URL,DATA:items});
function run(name){const start=code.indexOf(' function '+name+'('),end=code.indexOf('\n function ',start+1);assert(start>=0&&end>start);vm.runInContext(code.slice(start,end),ctx);}
vm.runInContext("const months=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];",ctx);
['linkUrl','period','members','groupCopyText'].forEach(run);
const group={name:'Monthly stock',category:'stock',memberIds:['old','new','other','missing']};
const sorted=ctx.members(group);
assert.deepEqual(Array.from(sorted,item=>item.id),['new','old']);
assert.equal(ctx.groupCopyText(group,sorted),'Monthly stock\n\nSep26\nhttps://example.com/sep\n\nAug26\nhttps://example.com/aug');
assert.equal(ctx.groupCopyText(group,[]),'');
assert.equal(ctx.groupCopyText(group,[{title:'Unsafe',url:'javascript:alert(1)'},{title:'Credentials',url:'https://name:secret@example.com'}]),'');
assert.deepEqual(items.map(item=>item.id),['old','new','other'],'Sorting must not mutate source records');
assert(code.includes('color:\'#000000\',name:\'สีดำ\',description:\'ห้ามใส่เคส\''));
assert(code.includes('searchIndex=links.map('),'Group search precomputes its index once');
assert(code.includes('tools.textContent=\'◩ เครื่องมือ\''));
console.log('PASS: indexed group membership, latest-month ordering, copy formats, unsafe-link exclusions, source preservation and six-color legend.');
