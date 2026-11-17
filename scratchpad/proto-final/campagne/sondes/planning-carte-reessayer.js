const L = require('../../lib.js');
const CAP='/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/campagne-planning/';
(async()=>{ const c = await L.ouvrir({profil:'mac', qui:'marc'});
 await c.ctx.route('**/unpkg.com/**', r => r.abort());
 const st = ()=>c.p.evaluate(()=>({etat:crReelEtat, raison:crReelRaison, L:!!(window.L&&L.map), gl:!!(window.L&&L.maplibreGL), texte:(document.getElementById('cr-carte')||{textContent:'(pas de carte)'}).textContent.replace(/\s+/g,' ').slice(0,160), bouton: !!document.querySelector('[data-crreessayer]'), msg:(document.querySelector('.cr-repli, .cr-info, [data-fond]')||{}).className}));
 await c.p.evaluate(()=>{ if(location.hash!=='#planning') aller('planning'); plVue='carte'; plRef=AUJ; rendre(); });
 await c.p.waitForTimeout(3500); console.log('1er essai, plugin bloqué:', JSON.stringify(await st()));
 await L.capture(c, CAP+'dbg-plugin-bloque.png');
 if (await c.p.evaluate(()=>!!document.querySelector('[data-crreessayer]'))) { await L.toucher(c,'[data-crreessayer]'); await c.p.waitForTimeout(3000); console.log('après Réessayer (3 s):', JSON.stringify(await st())); await c.p.waitForTimeout(12000); console.log('15 s plus tard:', JSON.stringify(await st())); await L.capture(c, CAP+'dbg-plugin-reessayer.png'); }
 console.log('erreurs page:', JSON.stringify(c.err.slice(0,3)));
 await L.fermer(); })();
