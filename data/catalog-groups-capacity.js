/* Catalog groups retain original card IDs, links, search and backup data. */
(function(){
 'use strict';
 const SEED_KEY='pctCatalogGroupsSeed_v1';
 const CAPACITY_KEY='pctCapacitySheetUrl_v1';
 const CAPACITY_URL='https://docs.google.com/spreadsheets/d/1yLyOaIkjQs88BKud9b5lYWY05jiZ6TrIg35Pgz4afNk/edit?gid=1526247490#gid=1526247490';
 const esc=value=>String(value==null?'':value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const months=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
 let dialog=null,capacityHost=null,capacityFrame=null,lastFocus=null,modalGroup=null,capacityTools=false;
 const CAPACITY_STATUSES=[
   {color:'#ffff00',name:'สีเหลือง',description:'นัดหมายเบื้องต้น'},
   {color:'#00ff00',name:'สีเขียว',description:'ไม่สามารถเลื่อนวันได้'},
   {color:'#9900ff',name:'สีม่วง',description:'เลื่อนวันได้ ต้องการเร็วกว่าวันที่ลงได้'},
   {color:'#1c4587',name:'สีน้ำเงินเข้ม',description:'งานซ่อมนอกระบบ Problem case'},
   {color:'#ff9900',name:'สีส้ม',description:'KOL/Xiaomi order'}
 ];
 function linkUrl(value){try{const url=new URL(String(value).trim());return /^https?:$/.test(url.protocol)&&!url.username&&!url.password?url.href:'';}catch(error){return '';}}
 function sheetUrl(value){try{const u=new URL(String(value).trim());if(u.protocol!=='https:'||u.hostname!=='docs.google.com'||u.username||u.password||u.port||!/^\/spreadsheets\/d\/[A-Za-z0-9_-]+\/edit\/?$/.test(u.pathname))return '';const gid=u.searchParams.get('gid')||(u.hash.match(/gid=(\d+)/)||[])[1];if(gid&&!/^\d+$/.test(gid))return '';const out=new URL(u.origin+u.pathname);if(gid)out.searchParams.set('gid',gid);return out.href;}catch(error){return '';}}
 function period(item){
   if(/^\d{4}-(0[1-9]|1[0-2])$/.test(item.linkMonth||''))return item.linkMonth;
   const match=String(item.title||'').match(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s*([0-9]{2}|[0-9]{4})\b/i);
   if(!match)return '';const month=months.findIndex(m=>m.toLowerCase()===match[1].slice(0,3).toLowerCase())+1;
   return (match[2].length===2?'20'+match[2]:match[2])+'-'+String(month).padStart(2,'0');
 }
 function members(group){return group.memberIds.map(id=>DATA.find(item=>item.id===id&&item.category===group.category)).filter(Boolean).sort((a,b)=>period(b).localeCompare(period(a))||String(a.title).localeCompare(String(b.title),'th'));}
 function allowedGroup(group){return !!group&&(!isManagerCategory(group.category)||managerGateIsOpen());}
 function seed(){
   let seeded=false;try{seeded=localStorage.getItem(SEED_KEY)==='1';}catch(error){}
   if(seeded)return;
   const used=new Set(CATALOG_GROUPS.flatMap(group=>group.memberIds));
   const byCategory=new Map();
   DATA.filter(item=>!isManagerCategory(item.category)&&/^stock\s*consum\s*out\b/i.test(item.title||'')&&!used.has(item.id)).forEach(item=>{if(!byCategory.has(item.category))byCategory.set(item.category,[]);byCategory.get(item.category).push(item.id);});
   byCategory.forEach((ids,category)=>{if(ids.length>=2)CATALOG_GROUPS.push({id:uid('group'),category,name:'Stock consum out',description:'ไฟล์เบิกอุปกรณ์ แยกตามเดือน',memberIds:ids});});
   saveAll();try{localStorage.setItem(SEED_KEY,'1');}catch(error){}
 }
 function closeDialog(){if(!dialog)return;const node=dialog;dialog=null;node.close();node.remove();if(lastFocus&&lastFocus.isConnected)lastFocus.focus();}
 function showDialog(html){
   if(dialog)closeDialog();lastFocus=document.activeElement;
   dialog=document.createElement('dialog');dialog.className='cg-dialog';dialog.setAttribute('aria-label','จัดการกลุ่มลิงก์');
   dialog.innerHTML='<div class="cg-dialog-inner">'+html+'</div>';document.body.appendChild(dialog);
   dialog.addEventListener('cancel',event=>{event.preventDefault();closeDialog();});
   dialog.addEventListener('click',event=>{if(event.target===dialog)closeDialog();});
   dialog.querySelector('[data-cg-close]').onclick=closeDialog;dialog.showModal();return dialog;
 }
 function header(name,sub){return '<header class="cg-dialog-head"><div><h2>'+esc(name)+'</h2><p>'+esc(sub||'')+'</p></div><button class="cg-btn" type="button" data-cg-close aria-label="ปิดกลุ่ม">✕</button></header>';}
 function saveAndRender(){CATALOG_GROUPS=sanitizeCatalogGroups(CATALOG_GROUPS);saveAll();window.render();}
 function configureModal(group){
   modalGroup=group||null;
   const type=document.getElementById('f-card-type');type.value=group?'group':'single';
   document.getElementById('f-category').disabled=!!group;
   if(group){
     document.getElementById('modalTitle').textContent='แก้ไขหัวข้อกลุ่ม';
     document.getElementById('f-title').value=group.name;
     document.getElementById('f-desc').value=group.description||'';
     document.getElementById('f-url').value='';
     currentItemColor=group.color||null;currentItemBg=group.bgColor||null;
     buildItemSwatches(currentItemColor,(CATS.find(c=>c.id===group.category)||{}).color);buildBgSwatches(currentItemBg);
   }
   updateModalType();
 }
 function updateModalType(){
   const grouped=document.getElementById('f-card-type').value==='group';
   const area=document.getElementById('f-group-members'),category=document.getElementById('f-category').value;
   area.hidden=!grouped;
   document.getElementById('f-card-type-hint').textContent=grouped?'บันทึกแล้วเปิดกลุ่มเพื่อเพิ่มลิงก์ได้ · ลิงก์ด้านล่างเป็นไฟล์แรก (ไม่บังคับ)':modalGroup?'เปลี่ยนเป็นการ์ดเดี่ยว: ลิงก์ในกลุ่มจะกลับมาเป็นการ์ดแยก ไม่ถูกลบ':'การ์ดเดี่ยวสำหรับหัวข้อหรือไฟล์หนึ่งรายการ';
   if(!grouped)return;
   const reserved=new Set(CATALOG_GROUPS.filter(g=>!modalGroup||g.id!==modalGroup.id).flatMap(g=>g.memberIds).filter(id=>id!==editingId));
   const choices=DATA.filter(item=>item.category===category).map(item=>{
     const checked=modalGroup?modalGroup.memberIds.includes(item.id):item.id===editingId;
     return '<label class="cg-choice"><input type="checkbox" value="'+esc(item.id)+'" '+(checked?'checked ':'')+(reserved.has(item.id)?'disabled':'')+'><span>'+esc(item.title)+(reserved.has(item.id)?'<small>อยู่ในกลุ่มอื่น</small>':'')+'</span></label>';
   }).join('');
   area.innerHTML='<label>รวมการ์ดเดิมในกลุ่ม (ไม่บังคับ)</label><div class="cg-choices">'+(choices||'<p class="cg-muted">ยังไม่มีลิงก์ในหมวดนี้ เพิ่มภายในกลุ่มหลังบันทึกได้</p>')+'</div>';
 }
 function editTopicGroup(category,group){
   if(isManagerCategory(category)&&!managerGateIsOpen())return;
   if(dialog)closeDialog();openAdd();refreshCategorySelect(category);configureModal(group);
   document.getElementById('f-card-type').value='group';updateModalType();
 }
 function saveTopicModal(obj){
   if(isManagerCategory(obj.category)&&!managerGateIsOpen()){showToast('กรุณาปลดล็อก Manager ก่อนบันทึก');return true;}
   if(document.getElementById('f-card-type').value!=='group'){
     if(modalGroup){
       const first=members(modalGroup)[0];editingId=first?first.id:null;
       if(first&&!obj.url)obj.url=first.url||'';
       document.getElementById('f-url').value=obj.url;
       CATALOG_GROUPS=CATALOG_GROUPS.filter(g=>g.id!==modalGroup.id);
     }
     return false;
   }
   const reserved=new Set(CATALOG_GROUPS.filter(g=>!modalGroup||g.id!==modalGroup.id).flatMap(g=>g.memberIds).filter(id=>id!==editingId));
   const ids=[...document.querySelectorAll('#f-group-members input:checked')].map(input=>input.value).filter(id=>!reserved.has(id)&&DATA.some(item=>item.id===id&&item.category===obj.category));
   // Converting a single card retains its complete original data and URL.
   if(editingId&&!reserved.has(editingId)&&!ids.includes(editingId))ids.push(editingId);
   const original=DATA.find(item=>item.id===editingId);
   if(original&&original.category!==obj.category){removeFromLayout(original.category,original.id);original.category=obj.category;ensureLayout(obj.category);}
   if(obj.url&&(!original||linkUrl(original.url)!==linkUrl(obj.url))&&!ids.some(id=>linkUrl(DATA.find(item=>item.id===id).url)===linkUrl(obj.url))){
     const now=Date.now(),item={...obj,id:uid('item'),lastEditedAt:now,history:[{ts:now,summary:'เพิ่มลิงก์แรกในกลุ่ม'}]};
     DATA.push(item);ensureLayout(obj.category);ids.push(item.id);
   }
   const group={id:modalGroup?modalGroup.id:uid('group'),category:obj.category,name:obj.title,description:obj.desc,memberIds:ids,color:obj.color,bgColor:obj.bgColor};
   if(editingId)CATALOG_GROUPS=CATALOG_GROUPS.map(g=>({...g,memberIds:g.memberIds.filter(id=>id!==editingId)}));
   CATALOG_GROUPS=modalGroup?CATALOG_GROUPS.map(g=>g.id===modalGroup.id?group:g):CATALOG_GROUPS.concat(group);
   activeCategory=obj.category;closeModal();saveAndRender();openGroup(group.id);showToast('บันทึกกลุ่มแล้ว — เพิ่มลิงก์ภายในได้ทันที');return true;
 }
 function editGroup(category,group){
   if(isManagerCategory(category)&&!managerGateIsOpen())return;
   const reserved=new Set(CATALOG_GROUPS.filter(g=>!group||g.id!==group.id).flatMap(g=>g.memberIds));
   const choices=DATA.filter(item=>item.category===category).map(item=>'<label class="cg-choice"><input type="checkbox" name="member" value="'+esc(item.id)+'" '+(group&&group.memberIds.includes(item.id)?'checked ':'')+(reserved.has(item.id)?'disabled':'')+'><span>'+esc(item.title)+(reserved.has(item.id)?'<small>อยู่ในกลุ่มอื่นแล้ว</small>':'')+'</span></label>').join('');
   const host=showDialog(header(group?'แก้ไขกลุ่ม':'สร้างกลุ่มไฟล์','รวมลิงก์ที่เกี่ยวข้องไว้ในการ์ดเดียว')+'<form class="cg-form" data-cg-edit><label>ชื่อกลุ่ม<input name="name" maxlength="100" required value="'+esc(group?group.name:'')+'" placeholder="เช่น Stock consum out"></label><label>คำอธิบาย<textarea name="description" maxlength="1000" rows="2">'+esc(group?group.description:'')+'</textarea></label><fieldset><legend>เลือกการ์ดที่ต้องการรวม</legend><div class="cg-choices">'+(choices||'<p class="cg-muted">ยังไม่มีการ์ด สามารถเพิ่มลิงก์หลังสร้างกลุ่มได้</p>')+'</div></fieldset><div class="cg-toolbar"><button class="cg-btn cg-primary" type="submit">บันทึกกลุ่ม</button></div></form>');
   host.querySelector('form').onsubmit=event=>{
     event.preventDefault();const values=new FormData(event.currentTarget);const name=String(values.get('name')||'').trim();if(!name)return;
     const next={id:group?group.id:uid('group'),category,name,description:String(values.get('description')||'').trim(),memberIds:values.getAll('member').filter(id=>DATA.some(item=>item.id===id&&item.category===category)&&!reserved.has(id))};
     CATALOG_GROUPS=group?CATALOG_GROUPS.map(g=>g.id===group.id?next:g):CATALOG_GROUPS.concat(next);closeDialog();saveAndRender();openGroup(next.id);
   };
 }
 function openGroup(id){
   const group=CATALOG_GROUPS.find(g=>g.id===id);if(!allowedGroup(group))return;
   const links=members(group),latest=links.find(item=>period(item));
   const host=showDialog(header(group.name,(group.description?group.description+' · ':'')+links.length+' ลิงก์')+'<div class="cg-toolbar"><button class="cg-btn cg-primary" type="button" data-cg-add>＋ เพิ่มลิงก์</button><button class="cg-btn" type="button" data-cg-manage>เลือก / แก้ไขกลุ่ม</button></div><form class="cg-form cg-new-link" data-cg-add-form hidden><h3>เพิ่มลิงก์ในกลุ่มนี้</h3><div class="cg-fields"><label>ชื่อไฟล์<input name="title" maxlength="200" required placeholder="เช่น Stock consum out Nov26"></label><label>เดือนของไฟล์ (ไม่บังคับ)<input name="month" type="month"></label></div><label>ลิงก์ไฟล์<input name="url" type="url" required maxlength="2048" placeholder="https://docs.google.com/…"></label><div class="cg-toolbar"><button class="cg-btn cg-primary" type="submit">บันทึกลิงก์</button><button class="cg-btn" type="button" data-cg-cancel-add>ยกเลิก</button></div><p class="cg-message" role="alert"></p></form><div class="cg-links">'+(links.length?links.map(item=>{const p=period(item),u=linkUrl(item.url);return '<article class="cg-link-row"><div class="cg-month">'+(p?'<strong>'+months[Number(p.slice(5))-1]+'</strong><small>'+p.slice(0,4)+'</small>':'↗')+'</div><div class="cg-link-info"><strong>'+esc(item.title)+(latest&&latest.id===item.id?'<span class="cg-latest">ล่าสุด</span>':'')+'</strong><small>'+esc(item.desc||'ลิงก์อ้างอิง')+'</small></div><div class="cg-link-actions">'+(u?'<a class="cg-btn" href="'+esc(u)+'" target="_blank" rel="noopener noreferrer">เปิดไฟล์ ↗</a><button class="cg-btn" type="button" data-cg-copy="'+esc(item.id)+'" aria-label="คัดลอกลิงก์ '+esc(item.title)+'">คัดลอก</button>':'<span class="cg-muted">ไม่มีลิงก์</span>')+'<button class="cg-btn" type="button" data-cg-item-edit="'+esc(item.id)+'" aria-label="แก้ไข '+esc(item.title)+'">✎</button></div></article>';}).join(''):'<p class="cg-empty">กลุ่มนี้ยังไม่มีลิงก์ กด “เพิ่มลิงก์” เพื่อเริ่มต้น</p>')+'</div><footer class="cg-dialog-foot"><span class="cg-muted">การ์ดเดิมยังค้นหาและเพิ่มในทางลัดได้</span><button class="cg-btn cg-danger" type="button" data-cg-ungroup>ยกเลิกกลุ่ม</button></footer>');
   host.querySelector('[data-cg-manage]').onclick=()=>editTopicGroup(group.category,group);
   const form=host.querySelector('[data-cg-add-form]');
   host.querySelector('[data-cg-add]').onclick=()=>{form.hidden=!form.hidden;if(!form.hidden)form.elements.title.focus();};
   host.querySelector('[data-cg-cancel-add]').onclick=()=>{form.hidden=true;};
   form.onsubmit=event=>{
     event.preventDefault();const values=new FormData(form),title=String(values.get('title')||'').trim(),url=linkUrl(values.get('url'));const month=String(values.get('month')||'');
     if(!title||!url){form.querySelector('.cg-message').textContent='กรุณากรอกชื่อและลิงก์ http/https ที่ถูกต้อง';return;}
     if(links.some(item=>linkUrl(item.url)===url)){form.querySelector('.cg-message').textContent='ลิงก์นี้อยู่ในกลุ่มแล้ว';return;}
     const item={id:uid('item'),category:group.category,title,desc:'',url,linkMonth:/^\d{4}-(0[1-9]|1[0-2])$/.test(month)?month:'',color:null,bgColor:null,lastEditedAt:Date.now(),history:[{ts:Date.now(),summary:'เพิ่มลิงก์ในกลุ่ม'}]};
     DATA.push(item);ensureLayout(group.category);CATALOG_GROUPS=CATALOG_GROUPS.map(g=>g.id===group.id?{...g,memberIds:g.memberIds.concat(item.id)}:g);closeDialog();saveAndRender();openGroup(group.id);showToast('เพิ่มลิงก์ในกลุ่มแล้ว');
   };
   host.querySelectorAll('[data-cg-copy]').forEach(button=>button.onclick=()=>{const item=DATA.find(i=>i.id===button.dataset.cgCopy);if(item)copyText(linkUrl(item.url),button);});
   host.querySelectorAll('[data-cg-item-edit]').forEach(button=>button.onclick=()=>{closeDialog();openEdit(button.dataset.cgItemEdit);});
   host.querySelector('[data-cg-ungroup]').onclick=()=>{if(!confirm('ยกเลิกกลุ่มนี้และแสดงการ์ดแยกเหมือนเดิม? ลิงก์และข้อมูลทั้งหมดจะยังอยู่'))return;CATALOG_GROUPS=CATALOG_GROUPS.filter(g=>g.id!==id);closeDialog();saveAndRender();};
 }
 function groupCard(group,cat){
   const links=members(group),latest=links.find(item=>period(item));const card=document.createElement('section');card.className='card cg-group-card';card.dataset.groupId=group.id;card.style.setProperty('--c',cat.color);card.style.setProperty('--cg-accent',cat.color);
   if(group.color)card.style.setProperty('--c',group.color);if(group.bgColor)card.style.setProperty('--bgc',group.bgColor);
   card.innerHTML='<button class="cg-group-open" type="button"><span class="cg-group-top"><span class="cg-folder">📁</span><span class="cg-count">'+links.length+' ลิงก์</span></span><strong>'+esc(group.name)+'</strong><span class="cg-muted">'+esc(group.description||'รวมลิงก์ที่เกี่ยวข้อง')+'</span><span class="cg-group-bottom"><span>'+(latest?'ล่าสุด · '+esc(period(latest)):'เพิ่มลิงก์ในกลุ่มได้')+'</span><b>เปิดกลุ่ม →</b></span></button><button class="cg-edit-group" type="button" aria-label="แก้ไขกลุ่ม '+esc(group.name)+'">✎</button>';
   card.querySelector('.cg-group-open').onclick=()=>openGroup(group.id);card.querySelector('.cg-edit-group').onclick=()=>editTopicGroup(group.category,group);return card;
 }
 function decorateGroups(){
   const main=document.getElementById('main'),cat=CATS.find(c=>c.id===activeCategory);
   if(!main||!cat||reorderMode||(document.getElementById('ask').value||'').trim()||(isManagerCategory(cat.id)&&!managerGateIsOpen()))return;
   const banner=main.querySelector('.page-banner');if(!banner)return;
   const button=document.createElement('button');button.type='button';button.className='btn secondary';button.textContent='📁 สร้างกลุ่ม';button.onclick=()=>editTopicGroup(cat.id);banner.querySelector('.right-actions').prepend(button);
   const groups=CATALOG_GROUPS.filter(g=>g.category===cat.id),cardNodes=[...main.querySelectorAll('.row-flex > .card[data-id]')];
   groups.forEach(group=>{
     const nodes=cardNodes.filter(card=>group.memberIds.includes(card.dataset.id));
     const card=groupCard(group,cat);
     if(nodes.length){nodes[0].replaceWith(card);nodes.slice(1).forEach(node=>node.remove());}
     else{let row=main.querySelector('.row-flex');if(!row){row=document.createElement('div');row.className='row-flex';banner.after(row);}row.appendChild(card);}
   });
   main.querySelectorAll('.row-flex').forEach(row=>{if(!row.querySelector('.cg-group-card'))return;const cards=[...row.children].filter(el=>el.classList.contains('card'));cards.forEach(card=>{card.style.flex='1 1 260px';card.style.maxWidth='none';});});
   main.querySelectorAll('.row-block').forEach(block=>{if(!block.querySelector('.row-flex > .card'))block.hidden=true;});
 }
 function getCapacityUrl(){let stored='';try{stored=localStorage.getItem(CAPACITY_KEY)||'';}catch(error){}return sheetUrl(stored)||sheetUrl(CAPACITY_URL);}
 function openCapacityLegend(){
   const host=showDialog(header('หมายเหตุสี Capacity','เลือกสีตามสถานะของงาน เพื่อให้ทีมอ่านตารางตรงกัน')+'<div class="pct-cap-legend">'+CAPACITY_STATUSES.map(status=>'<div class="pct-cap-status"><span class="pct-cap-swatch" style="background:'+status.color+'" aria-hidden="true"></span><div><strong>'+esc(status.name)+'</strong><p>'+esc(status.description)+'</p></div></div>').join('')+'</div><p class="cg-muted">ปรับสีจริง: กด “สีช่องในชีต” → เลือกเซลล์ในตาราง → ใช้เครื่องมือสีพื้นหลัง (ถังสี) ของ Google Sheets · ต้องมีสิทธิ์แก้ไขชีต</p>');
   host.setAttribute('aria-label','หมายเหตุสี Capacity');
 }
 function lockCapacityScroll(locked){
   // Cross-origin Sheets cannot expose wheel events to CRM. Lock only the
   // parent scroll container while interacting with the embedded table.
   document.documentElement.classList.toggle('pct-cap-scroll-locked',!!locked);
 }
 function installCapacityScroll(area){
   area.addEventListener('pointerenter',()=>lockCapacityScroll(true));
   area.addEventListener('pointerleave',event=>{if(event.pointerType!=='touch')lockCapacityScroll(false);});
   area.addEventListener('pointercancel',()=>lockCapacityScroll(false));
   document.addEventListener('pointerdown',event=>{if(!area.contains(event.target))lockCapacityScroll(false);},true);
   document.addEventListener('wheel',event=>{if(!area.contains(event.target))lockCapacityScroll(false);},{passive:true,capture:true});
   document.addEventListener('focusin',event=>lockCapacityScroll(area.contains(event.target)));
   document.addEventListener('keydown',event=>{if(event.key==='Escape')lockCapacityScroll(false);});
   document.addEventListener('visibilitychange',()=>{if(document.hidden)lockCapacityScroll(false);});
   window.addEventListener('blur',()=>{if(document.activeElement!==capacityFrame)lockCapacityScroll(false);});
   window.addEventListener('pagehide',()=>lockCapacityScroll(false));
 }
 function loadCapacity(refresh){
   if(!capacityHost)return;const area=capacityHost.querySelector('[data-cap-frame]');
   if(capacityFrame&&!refresh)return;
   const url=new URL(getCapacityUrl());if(capacityTools)url.searchParams.delete('rm');else url.searchParams.set('rm','minimal');
   if(refresh)url.searchParams.set('_pct_refresh',Date.now());
   const frame=document.createElement('iframe');frame.title='Order Capacity — Google Sheet';frame.loading='lazy';frame.referrerPolicy='strict-origin-when-cross-origin';frame.setAttribute('sandbox','allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-downloads');frame.src=url.href;
   frame.addEventListener('focus',()=>lockCapacityScroll(true));
   frame.addEventListener('blur',()=>lockCapacityScroll(false));
   area.replaceChildren(frame);capacityFrame=frame;
 }
 function installCapacity(){
   const main=document.getElementById('main');if(!main)return;
   capacityHost=document.createElement('section');capacityHost.className='pct-capacity-host';capacityHost.hidden=true;
   capacityHost.innerHTML='<details class="pct-capacity"><summary><span class="pct-cap-icon">▦</span><span><strong>Capacity <span class="pct-cap-badge">LIVE</span></strong><small>ตารางรถและทีมติดตั้ง · Google Sheet</small></span><span class="pct-cap-chevron">⌄</span></summary><div class="pct-cap-body"><div class="cg-toolbar"><a class="cg-btn" data-cap-open target="_blank" rel="noopener noreferrer">เปิดชีตเต็ม ↗</a><button class="cg-btn" type="button" data-cap-refresh>↻ โหลดตารางใหม่</button><button class="cg-btn cg-primary" type="button" data-cap-copy>คัดลอก Template เคส</button><label class="pct-cap-zoom">มุมมอง <select data-cap-zoom aria-label="ขนาดมุมมอง Capacity"><option value="0.5">50%</option><option value="0.65">65%</option><option value="0.75">75%</option><option value="1">100%</option></select></label></div><div class="pct-cap-frame" data-cap-frame style="--cap-scale:.5;--cap-size:200%"></div><p class="cg-muted">เริ่มต้นที่ 50% เพื่อเห็นทะเบียนรถได้มากขึ้น · เลื่อนตารางแนวนอนเพื่อดูรถที่อยู่ด้านขวา · แก้ไข Template ได้ในเคสด้านล่าง</p><details class="pct-cap-settings"><summary>เปลี่ยนลิงก์แท็บ Capacity</summary><form><label>ลิงก์ Google Sheet พร้อม gid ของแท็บ<input type="url" data-cap-url required></label><button class="cg-btn" type="submit">บันทึกลิงก์</button><p class="cg-message" role="alert"></p></form></details></div></details>';
   main.before(capacityHost);const details=capacityHost.querySelector('.pct-capacity');
   const toolbar=capacityHost.querySelector('.cg-toolbar'),zoom=capacityHost.querySelector('.pct-cap-zoom');
   const legend=document.createElement('button');legend.type='button';legend.className='cg-btn pct-cap-legend-button';legend.setAttribute('aria-haspopup','dialog');legend.innerHTML='<span class="pct-cap-legend-dots" aria-hidden="true">'+CAPACITY_STATUSES.map(status=>'<i style="background:'+status.color+'"></i>').join('')+'</span> หมายเหตุสี';legend.onclick=openCapacityLegend;toolbar.insertBefore(legend,zoom);
   const tools=document.createElement('button');tools.type='button';tools.className='cg-btn';tools.dataset.capTools='';tools.setAttribute('aria-pressed','false');tools.textContent='◩ สีช่องในชีต';toolbar.insertBefore(tools,zoom);
   const toolsHelp=document.createElement('p');toolsHelp.className='pct-cap-tools-help';toolsHelp.hidden=true;toolsHelp.setAttribute('role','status');toolsHelp.textContent='เลือกเซลล์ในตาราง แล้วกด “สีพื้นหลัง / Fill color” (ถังสี) ในแถบ Google Sheets เพื่อบันทึกสีลงชีตจริง · แนะนำซูม 75–100% ขณะปรับสี · ต้องลงชื่อเข้าใช้บัญชีที่มีสิทธิ์แก้ไข หากเครื่องมือไม่แสดงให้กด “เปิดชีตเต็ม”';toolbar.after(toolsHelp);
   tools.onclick=()=>{capacityTools=!capacityTools;tools.setAttribute('aria-pressed',String(capacityTools));tools.textContent=capacityTools?'◩ ซ่อนเครื่องมือชีต':'◩ สีช่องในชีต';toolsHelp.hidden=!capacityTools;lockCapacityScroll(false);loadCapacity(true);};
   const summary=details.querySelector('summary'),body=capacityHost.querySelector('.pct-cap-body');
   body.id='pct-capacity-body';summary.setAttribute('aria-controls',body.id);summary.setAttribute('aria-expanded','false');
   capacityHost.querySelector('.pct-cap-icon').innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 2v4m8-4v4M3 10h18M10 21H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v5"/><path d="M7 14h3m-3 3h2"/><circle cx="17" cy="17" r="5"/><path d="M17 14v3l2 1"/></svg>';
   const toggle=capacityHost.querySelector('.pct-cap-chevron');toggle.innerHTML='<span data-cap-toggle-label>แสดงตาราง</span><svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 7 5 5 5-5"/></svg>';
   installCapacityScroll(capacityHost.querySelector('[data-cap-frame]'));
   const openLink=capacityHost.querySelector('[data-cap-open]');openLink.href=getCapacityUrl();
   capacityHost.querySelector('[data-cap-url]').value=getCapacityUrl();
   details.addEventListener('toggle',()=>{summary.setAttribute('aria-expanded',String(details.open));toggle.querySelector('[data-cap-toggle-label]').textContent=details.open?'ซ่อนตาราง':'แสดงตาราง';if(details.open)loadCapacity(false);else lockCapacityScroll(false);});
   capacityHost.querySelector('[data-cap-refresh]').onclick=()=>loadCapacity(true);
   capacityHost.querySelector('[data-cap-copy]').onclick=event=>copyText(crmBuildColumnO(crmDraft),event.currentTarget);
   capacityHost.querySelector('[data-cap-zoom]').onchange=event=>{const scale=Number(event.target.value);if(![.5,.65,.75,1].includes(scale))return;const area=capacityHost.querySelector('[data-cap-frame]');area.style.setProperty('--cap-scale',scale);area.style.setProperty('--cap-size',(100/scale)+'%');};
   capacityHost.querySelector('form').onsubmit=event=>{event.preventDefault();const url=sheetUrl(capacityHost.querySelector('[data-cap-url]').value);const message=capacityHost.querySelector('.cg-message');if(!url){message.textContent='กรุณาใช้ลิงก์ https://docs.google.com/spreadsheets/d/…/edit พร้อม gid ที่เป็นตัวเลข';return;}try{localStorage.setItem(CAPACITY_KEY,url);}catch(error){message.textContent='บันทึกไม่ได้ เบราว์เซอร์ปิดการจัดเก็บข้อมูล';return;}message.textContent='บันทึกลิงก์แล้ว';openLink.href=url;capacityHost.querySelector('[data-cap-url]').value=url;loadCapacity(true);};
 }
 function syncCapacity(){if(capacityHost){capacityHost.hidden=activeCategory!=='cust'||!!(document.getElementById('ask').value||'').trim()||!document.querySelector('#main .crm-panel');if(capacityHost.hidden)lockCapacityScroll(false);}}
 function afterRender(){decorateGroups();syncCapacity();}
 seed();installCapacity();
 const baseRender=window.render;window.render=function(){const result=baseRender.apply(this,arguments);afterRender();return result;};
 afterRender();
 new MutationObserver(syncCapacity).observe(document.getElementById('main'),{childList:true});
 document.getElementById('f-card-type').onchange=updateModalType;
 document.getElementById('f-category').addEventListener('change',updateModalType);
 window.PCTCatalogGroups={open:openGroup,create:editTopicGroup,configureModal,saveModal:saveTopicModal,period,linkUrl,sheetUrl};
})();
