/* Personal shortcuts: local preview only. No backend calls and no Manager indexing. */
(function(){
 'use strict';
 const KEY='pctPersonalQuickAccess_v1',LIMIT=24;
 const icon='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m13 2-9 12h7l-1 8 10-12h-7l1-8Z"/></svg>';
 const plus='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>';
 let favorites=[],open=false,tab='saved',query='',root,lastFocus;
 const esc=value=>String(value==null?'':value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function validUrl(value){try{const url=new URL(String(value).trim());return /^https?:$/.test(url.protocol)&&!url.username&&!url.password?url.href:'';}catch(e){return '';}}
 function normalize(value){if(!Array.isArray(value))return [];const seen=new Set();return value.filter(v=>v&&typeof v==='object').map(v=>v.type==='catalog'&&typeof v.id==='string'?{type:'catalog',id:v.id.slice(0,150)}:v.type==='custom'&&typeof v.id==='string'&&typeof v.name==='string'&&validUrl(v.url)?{type:'custom',id:v.id.slice(0,150),name:v.name.trim().slice(0,100),url:validUrl(v.url)}:null).filter(v=>{if(!v||(v.type==='custom'&&!v.name))return false;const key=v.type+':'+v.id;if(seen.has(key))return false;seen.add(key);return true;}).slice(0,LIMIT);}
 function read(){try{return normalize(JSON.parse(localStorage.getItem(KEY)||'[]'));}catch(e){return [];}}
 function write(next){try{localStorage.setItem(KEY,JSON.stringify(next));favorites=next;return true;}catch(e){message('บันทึกไม่ได้ เบราว์เซอร์ปิดการจัดเก็บข้อมูล หรือพื้นที่เต็ม');return false;}}
 function catalog(){
   // Reuse the same public-only boundary as global search, even after Manager unlock.
   if(typeof getSearchableCatalogItems!=='function')return [];
   return getSearchableCatalogItems().flatMap(item=>{
     const url=validUrl(item.url);if(!url)return [];
     const cat=typeof CATS!=='undefined'?CATS.find(c=>c.id===item.category):null;
     return [{type:'catalog',id:item.id,name:String(item.title||item.name||'การ์ด'),url,category:cat?cat.name:'การ์ด',icon:cat?cat.icon:'↗'}];
   });
 }
 function resolved(){const cards=new Map(catalog().map(c=>[c.id,c]));return favorites.flatMap(f=>f.type==='custom'?[{...f,category:'ลิงก์ส่วนตัว',icon:'↗'}]:cards.has(f.id)?[cards.get(f.id)]:[]);}
 function identity(f){return f.type+':'+f.id;}
 function message(text){const el=root&&root.querySelector('.qa-message');if(el){el.textContent=text;el.hidden=!text;}}
 function renderSaved(){const cards=resolved();return (cards.length?cards.map(card=>`<div class="qa-row"><a class="qa-link" href="${esc(card.url)}" target="_blank" rel="noopener noreferrer" title="เปิด ${esc(card.name)} ในแท็บใหม่" aria-label="เปิด ${esc(card.name)} ในแท็บใหม่"><span class="qa-icon" aria-hidden="true">${esc(card.icon)}</span><span class="qa-link-text"><b>${esc(card.name)}</b><small>${esc(card.category)}</small></span><span class="qa-arrow" aria-hidden="true">↗</span></a><button type="button" class="qa-remove" data-remove="${esc(identity(card))}" aria-label="นำ ${esc(card.name)} ออกจากทางลัด" title="นำออกจากทางลัดเท่านั้น">×</button></div>`).join(''):'<div class="qa-empty">ยังไม่มีทางลัดส่วนตัว<br>เลือกการ์ดที่ใช้บ่อย แล้วเปิดได้ทันทีจากทุกหน้า</div>')+`<button type="button" class="qa-add-main" data-add-view>${plus} เพิ่มการ์ดที่ใช้บ่อย</button>`;}
 function picker(){const chosen=new Set(favorites.map(identity));const cards=catalog().filter(c=>(c.name+' '+c.category).toLowerCase().includes(query.toLowerCase()));return cards.length?cards.map(c=>`<button type="button" class="qa-choice" data-pick="${esc(c.id)}" ${chosen.has(identity(c))?'disabled':''}><span aria-hidden="true">${esc(c.icon)}</span><span>${esc(c.name)}<small>${esc(c.category)}</small></span><em>${chosen.has(identity(c))?'✓':'＋'}</em></button>`).join(''):'<div class="qa-empty">ไม่พบการ์ดที่มีลิงก์ตรงกับคำค้น<br>การ์ด Manager และการ์ดไม่มีลิงก์จะไม่แสดง</div>';}
 function renderAdd(){return `<input type="search" class="qa-search" aria-label="ค้นหาการ์ดสำหรับทางลัด" placeholder="ค้นหาชื่อการ์ด / หมวดหมู่" value="${esc(query)}"><div class="qa-picker">${picker()}</div><details class="qa-custom"><summary>หรือเพิ่มลิงก์ส่วนตัว</summary><form id="qaCustomForm"><label>ชื่อทางลัด<input name="shortcutName" required maxlength="100" placeholder="เช่น ระบบงานที่ใช้ประจำ"></label><label>ลิงก์ (http / https)<input name="shortcutUrl" type="url" required maxlength="2048" placeholder="https://..."></label><button type="submit">＋ บันทึกลิงก์ส่วนตัว</button></form></details>`;}
 function render(){
   const count=resolved().length;
   root.innerHTML=`<section class="qa-panel" id="pctQuickPanel" aria-label="ทางลัดส่วนตัว" ${open?'':'hidden'}><div class="qa-header"><span class="qa-badge">${icon}</span><div><strong>ทางลัดของฉัน</strong><small>เปิดการ์ดที่ใช้บ่อยจากทุกหน้า</small></div><button type="button" class="qa-close" aria-label="ปิดทางลัด">×</button></div><div class="qa-tabs" role="tablist" aria-label="จัดการทางลัด"><button type="button" role="tab" id="qaSavedTab" aria-controls="qaContent" aria-selected="${tab==='saved'}" data-tab="saved">การ์ดของฉัน ${count?`(${count})`:''}</button><button type="button" role="tab" id="qaAddTab" aria-controls="qaContent" aria-selected="${tab==='add'}" data-tab="add">＋ เพิ่มการ์ด</button></div><div class="qa-content" id="qaContent" role="tabpanel" aria-labelledby="${tab==='saved'?'qaSavedTab':'qaAddTab'}">${tab==='saved'?renderSaved():renderAdd()}</div><p class="qa-message" role="status" hidden></p><div class="qa-footer">เก็บเฉพาะเบราว์เซอร์นี้ · ไม่ซิงก์บัญชี/เครื่องอื่น<br>ชื่อแท็บใหม่ขึ้นตามเว็บไซต์ปลายทาง · Manager ไม่อยู่ในรายการลัด</div></section><button type="button" class="qa-launcher" aria-label="ทางลัดส่วนตัว" title="ทางลัดส่วนตัว" aria-expanded="${open}" aria-controls="pctQuickPanel">${icon}${count?`<span class="qa-count" aria-hidden="true">${count}</span>`:''}</button>`;
   root.querySelector('.qa-launcher').onclick=()=>{if(!open)lastFocus=document.activeElement;open=!open;tab='saved';query='';render();if(open)root.querySelector('.qa-close').focus();};
   root.querySelector('.qa-close').onclick=close;
   root.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{tab=b.dataset.tab;query='';render();root.querySelector(tab==='add'?'.qa-search':'#qaSavedTab').focus();});
   root.querySelector('[data-add-view]')?.addEventListener('click',()=>{tab='add';render();root.querySelector('.qa-search').focus();});
   root.querySelector('.qa-search')?.addEventListener('input',e=>{query=e.target.value;root.querySelector('.qa-picker').innerHTML=picker();bindPicker();});
   root.querySelectorAll('[data-remove]').forEach(b=>b.onclick=()=>{if(write(favorites.filter(f=>identity(f)!==b.dataset.remove))){render();root.querySelector('.qa-add-main')?.focus();}});
   root.querySelector('#qaCustomForm')?.addEventListener('submit',e=>{
     e.preventDefault();const name=e.target.elements.shortcutName.value.trim(),url=validUrl(e.target.elements.shortcutUrl.value);
     if(!name||!url){message('กรุณาใส่ชื่อและลิงก์ http/https ที่ถูกต้อง (ไม่ใส่รหัสผ่านใน URL)');return;}
     if(favorites.length>=LIMIT){message(`เพิ่มได้สูงสุด ${LIMIT} การ์ด กรุณานำรายการที่ไม่ใช้ออกก่อน`);return;}
     if(resolved().some(f=>f.url===url)){message('ลิงก์นี้อยู่ในทางลัดแล้ว');return;}
     const id=typeof crypto!=='undefined'&&crypto.randomUUID?crypto.randomUUID():Date.now().toString(36)+Math.random().toString(36).slice(2);
     if(write([...favorites,{type:'custom',id,name,url}])){tab='saved';query='';render();root.querySelector('.qa-add-main').focus();}
   });bindPicker();
 }
 function bindPicker(){root.querySelectorAll('[data-pick]').forEach(b=>b.onclick=()=>{
   if(favorites.length>=LIMIT){message(`เพิ่มได้สูงสุด ${LIMIT} การ์ด`);return;}
   const card=catalog().find(c=>c.id===b.dataset.pick);if(!card)return;
   if(favorites.some(f=>f.type==='catalog'&&f.id===card.id))return;
   if(write([...favorites,{type:'catalog',id:card.id}])){tab='saved';query='';render();root.querySelector('.qa-add-main').focus();}
 });}
 function close(){open=false;render();if(lastFocus&&lastFocus.isConnected&&!root.contains(lastFocus))lastFocus.focus();else root.querySelector('.qa-launcher').focus();}
 function install(){if(document.getElementById('pctQuickAccess'))return;favorites=read();root=document.createElement('div');root.id='pctQuickAccess';document.body.appendChild(root);render();document.addEventListener('keydown',e=>{if(e.key==='Escape'&&open){e.preventDefault();close();}});document.addEventListener('pointerdown',e=>{if(open&&!root.contains(e.target)){open=false;render();}});window.addEventListener('storage',e=>{if(e.key===KEY){favorites=read();render();}});}
 window.PCTQuickAccess={validUrl,normalize,catalog,resolved};
 install();
})();
