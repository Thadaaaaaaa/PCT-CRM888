// Read an export as data only and emit an apply_patch patch; never copy cases/settings.
const fs=require('node:fs'),path=require('node:path');
const source=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
if(!Array.isArray(source.categories)||!Array.isArray(source.items)||!Array.isArray(source.catalogGroups))throw Error('Expected a catalog export with groups');
const pick=(value,keys)=>Object.fromEntries(keys.filter(key=>value[key]!==undefined).map(key=>[key,value[key]]));
const categories=source.categories.map(cat=>pick(cat,['id','name','icon','color','bgColor']));
const categoryIds=new Set(categories.map(cat=>cat.id));
const items=source.items.filter(item=>categoryIds.has(item.category)).map(item=>{
 const safe=pick(item,['id','category','title','desc','url','color','bgColor','linkMonth']);
 if(/(?:password|รหัสผ่าน|username|user\s*:|pass\s*:)/i.test(safe.desc||''))safe.desc='ข้อมูลเข้าสู่ระบบ: ติดต่อผู้ดูแลระบบ';
 if(safe.url){try{const url=new URL(safe.url);if(!/^https?:$/.test(url.protocol)||url.username||url.password)safe.url='';}catch(error){safe.url='';}}
 return safe;
});
const itemIds=new Set(items.map(item=>item.id));
const catalogGroups=source.catalogGroups.map(group=>({...pick(group,['id','category','name','description','color','bgColor']),memberIds:(group.memberIds||[]).filter(id=>itemIds.has(id))}));
const layout=Object.fromEntries(Object.entries(source.layout||{}).filter(([id])=>categoryIds.has(id)).map(([id,rows])=>{
 const seen=new Set();return [id,rows.map(row=>({label:row.label||'',ids:(row.ids||[]).filter(key=>itemIds.has(key)&&!seen.has(key)&&seen.add(key))}))];
}));
const snapshot={version:4,exportedAt:source.exportedAt,categories,items,catalogGroups,layout};
const file=path.join(__dirname,'../data/latest-site-data.js'),old=fs.readFileSync(file,'utf8').replace(/\r/g,'').trimEnd();
const next='// Public catalog snapshot generated from the 2026-10-05 export.\n// Customer cases, credentials, editor history, sheet configuration, and daily reports are intentionally excluded.\nwindow.PCT_LATEST_SITE_DATA='+JSON.stringify(snapshot,null,2)+';';
process.stdout.write('*** Begin Patch\n*** Update File: '+file.replace(/\\/g,'/')+'\n@@\n'+old.split('\n').map(line=>'-'+line).join('\n')+'\n'+next.split('\n').map(line=>'+'+line).join('\n')+'\n*** End Patch');
