// outils de ma relecture (relire-compositeur-tout)
const A = require('../atelier-outils.js'), L = A.L;
exports.A=A; exports.L=L;
exports.CAP=(process.env.CAP||'/tmp/relire-compositeur-tout/');
// clic/toucher ; en cas d'échec : DIT ce qui est sous le point (pile d'éléments), puis relance l'erreur
exports.clic = async (c,f,s,opt)=>{ const l=f.locator(s).first();
  try { if(c.doigt) await l.tap({timeout:5000,...opt}); else await l.click({timeout:5000,...opt}); }
  catch(e){ const pile=await f.evaluate(sel=>{ const t=document.querySelector(sel); if(!t) return 'cible absente'; const r=t.getBoundingClientRect(); return document.elementsFromPoint(r.left+r.width/2,r.top+r.height/2).slice(0,6).map(x=>x.tagName+'.'+String(x.className).slice(0,40)+(x.id?'#'+x.id:'')).join(' > ')+' | cible '+Math.round(r.left)+','+Math.round(r.top)+' '+Math.round(r.width)+'x'+Math.round(r.height); },s.split(',')[0]).catch(()=>'?'); console.log('  ! clic raté sur',s,'→ pile :',pile); throw e; }
  await c.p.waitForTimeout(160); };
exports.texte = f=>f.evaluate(()=>document.body.innerText.replace(/\s+/g,' '));
