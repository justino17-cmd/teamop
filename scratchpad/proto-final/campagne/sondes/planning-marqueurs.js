const L = require('../../lib.js');
const CAP='/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/campagne-planning/';
const profil=process.argv[2]||'mac';
(async()=>{ const c = await L.ouvrir({profil, qui:'marc'});
 const ouvrir = async()=>{ await c.p.evaluate(()=>{ crSel=null; crFocus=null; crLV=null; if(location.hash!=='#planning') aller('planning'); plVue='carte'; plRef=AUJ; rendre(); });
   for (let i=0;i<40;i++){ await c.p.waitForTimeout(500); if (await c.p.evaluate(()=>crReelEtat==='ok' && document.querySelectorAll('.cr-mk[data-crpin]').length>0)) break; } await L.calme(c.p,1200); };
 await ouvrir();
 const ids = await c.p.evaluate(()=>[...document.querySelectorAll('.cr-mk[data-crpin]')].map(e=>e.dataset.crpin));
 console.log('marqueurs:', ids.length, ids.join(' '), 'mode', await c.p.evaluate(()=>crReelEtat));
 let bons=0; const rapport=[];
 for (const id of ids) { await ouvrir();
   const r = await c.p.evaluate(id=>{ const e=document.querySelector('.cr-mk[data-crpin="'+id+'"]'); const b=e.getBoundingClientRect(); const x=b.left+b.width/2,y=b.top+b.height/2; const t=document.elementFromPoint(x,y); const m=t&&t.closest('.cr-mk'); return {x,y,w:Math.round(b.width), couvertPar: m? m.dataset.crpin||'dépôt' : (t? (t.getAttribute&&t.getAttribute('class')||t.tagName):null)}; }, id);
   await c.p.mouse.click(r.x, r.y); await L.calme(c.p,600);
   const sel = await c.p.evaluate(()=>crSel); const ok = sel===id; if (ok) bons++; rapport.push({id, ok, sel, couvertPar:r.couvertPar, w:r.w});
   console.log((ok?'✓':'✗'), id, 'couvert par', r.couvertPar, '-> sélection', sel); }
 console.log(bons+'/'+ids.length, 'marqueurs ouvrent leur fiche au clic');
 await L.fermer(); })();
