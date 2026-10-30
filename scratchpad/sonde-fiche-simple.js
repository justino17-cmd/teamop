/* ══ SONDE — LA FICHE D'INTERVENTION SIMPLE (v781) ═══════════════════════════════════════════════
   Justin, 29 octobre 2026 : « un truc beaucoup plus simple par rapport à chaque métier ». Dans la VRAIE page
   (beta.html, 127.0.0.1) : une intervention de plomberie ; on coche une prestation, on tape « ce qui a été fait »,
   on ajoute un produit par la recherche (− / +), on crée une note avant paiement en tapant UN prix, puis on
   termine par le gros bouton — et chaque effet est relu dans `db`.
   Usage : SOURCE=…/beta.html node scratchpad/sonde-fiche-simple.js */
const path = require('path');
const { ouvrir, dormir } = require('/home/user/teamop/scratchpad/pilote.js');
let ok = 0, ko = 0;
const vrai = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '  → ' + JSON.stringify(d).slice(0, 600) : '')); } };
(async () => {
  const S = await ouvrir({ source: process.env.SOURCE || path.join(__dirname, '..', 'beta.html') });
  console.log('page mesurée :', S.version);
  await S.c.envoyer('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  await S.ev(`window.horsLigneDebut=function(){}; try{_horsLigne=false;}catch(e){} const h=document.getElementById('hl-ecran'); if(h)h.remove();
    window.pushPropose=function(){}; window.maybeProfilePhoto=function(){}; window.entAccueilCheck=function(){};
    window.__errs=[]; window.addEventListener('error',e=>window.__errs.push(String(e.message)));
    window.__toasts=[]; const t0=window.toast; window.toast=function(m){ window.__toasts.push(String(m)); try{ return t0.apply(this,arguments); }catch(e){} };
    window.proposerAbonnement=function(){};
    db.metier='plomberie'; db.metierPlus=''; db.entreprise={nom:'Plomberie Ouest',adresse:'12 rue des Lilas',cp:'17000',ville:'La Rochelle',siret:'12345678900017',tel:'05 46 11 22 33',email:'contact@po.fr'};
    db.clients=(db.clients||[]).filter(c=>c.id!=='cP').concat([{id:'cP',nom:'Mme Durand',tel:'06 11 22 33 44',email:'durand@ex.fr',adresse:'5 rue Verte, 17000 La Rochelle'}]);
    db.produits=(db.produits||[]).filter(p=>p.id!=='pS').concat([{id:'pS',nom:'Siphon PVC 40',unite:'u',qte:10,prix:4}]);
    db.interventions=(db.interventions||[]).filter(i=>i.id!=='iP').concat([{id:'iP',num:'INT-P1',titre:'Fuite sous évier',type:'Dépannage',clientId:'cP',date:'2026-10-29',heure:'09:00',duree:60,statut:'encours',adresse:'5 rue Verte, 17000 La Rochelle',techIds:[],compteRendu:''}]);
    db.users=(db.users||[]).filter(u=>u.id!=='uP').concat([{id:'uP',prenom:'Justin',nom:'Sonde',login:'justin-sonde',role:'admin',actif:true,pref:{}}]);
    save(); currentUser=db.users.find(u=>u.id==='uP'); enterApp(currentUser); return 1;`);
  await dormir(1500); await S.ev(`try{ closeModal(true); }catch(e){} return 1;`);
  await S.ev(`detailIntervention('iP'); return 1;`); await dormir(900);

  console.log('── 1. le gros bouton vert ──');
  let r = await S.ev(`const b=document.getElementById('int-terminee-gros'); if(!b) return null; const rc=b.getBoundingClientRect(); return {txt:b.textContent.trim(), w:Math.round(rc.width), h:Math.round(rc.height), bg:getComputedStyle(b).backgroundColor, col:getComputedStyle(b).color}`);
  vrai('le bouton « ✅ Intervention terminée » est là, 56 px de haut, pleine largeur de sa carte', r && /Intervention terminée/.test(r.txt) && r.h >= 56 && r.w > 250, r);
  console.log('   fond', r && r.bg, 'encre', r && r.col);
  const lum = c => { const m = c.match(/[\d.]+/g).map(Number); const f = v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }; return .2126 * f(m[0]) + .7152 * f(m[1]) + .0722 * f(m[2]); };
  if (r) { const a = lum(r.bg), b = lum(r.col); const cr = (Math.max(a, b) + .05) / (Math.min(a, b) + .05); vrai('contraste du libellé ≥ 4,5 (' + cr.toFixed(2) + ')', cr >= 4.5); }
  vrai('rien n’est dit « stylo pour modifier » dans la fiche', await S.ev(`return !/stylo pour modifier/.test(document.getElementById('content').innerText)`));

  console.log('── 2. Prestations réalisées : cases directes + « ce qui a été fait » ──');
  const pn = await S.ev(`return {n:document.querySelectorAll('.met-chip:not(.add)').length, lbl:(metierPack().presta||[])[0]}`);
  vrai('les cases du métier sont dans la carte sans mode modification (' + pn.n + ')', pn.n >= 3, pn);
  await S.ev(`document.querySelector('.met-chip:not(.add)').click(); return 1;`); await dormir(400);
  let i = await S.ev(`const i=db.interventions.find(x=>x.id==='iP'); return {p:i.prestaMetier||[], intEdit}`);
  vrai('cocher une case écrit i.prestaMetier (sans stylo)', i.p.length === 1 && i.p[0] === pn.lbl && !i.intEdit, i);
  await S.ev(`document.querySelector('.met-chip.on').click(); return 1;`); await dormir(300);
  vrai('la recocher la retire', (await S.ev(`return (db.interventions.find(x=>x.id==='iP').prestaMetier||[]).length`)) === 0);
  await S.ev(`document.querySelector('.met-chip:not(.add)').click(); return 1;`); await dormir(300);
  await S.ev(`const t=document.getElementById('fait-iP'); t.value='Siphon remplacé, joint refait'; t.dispatchEvent(new Event('input',{bubbles:true})); return 1;`); await dormir(1000);
  vrai('« Ce qui a été fait » est enregistré à la saisie (compteRendu)', (await S.ev(`return db.interventions.find(x=>x.id==='iP').compteRendu`)) === 'Siphon remplacé, joint refait');

  console.log('── 3. Produits & matériel : recherche, un tap, − / + ──');
  await S.ev(`const q=document.getElementById('ip-q-iP'); q.value='sip'; q.dispatchEvent(new Event('input',{bubbles:true})); return 1;`); await dormir(300);
  r = await S.ev(`return [...document.querySelectorAll('#ip-res-iP button')].map(b=>b.textContent.trim())`);
  vrai('2 lettres → le catalogue répond (Siphon PVC 40) + l’option hors catalogue', r.length >= 2 && /Siphon PVC 40/.test(r[0]), r);
  await S.ev(`document.querySelector('#ip-res-iP button').click(); return 1;`); await dormir(500);
  let L = await S.ev(`return {l:db.interventions.find(x=>x.id==='iP').produitsUtilises, stock:db.produits.find(p=>p.id==='pS').qte}`);
  vrai('un tap ajoute la ligne produitsUtilises (qte 1)', L.l.length === 1 && L.l[0].produitId === 'pS' && L.l[0].qte === 1, L);
  await S.ev(`document.querySelector('button[aria-label="Plus"]').click(); return 1;`); await dormir(400);
  vrai('« + » passe à 2', (await S.ev(`return db.interventions.find(x=>x.id==='iP').produitsUtilises[0].qte`)) === 2);
  await S.ev(`document.querySelector('button[aria-label="Moins"]').click(); return 1;`); await dormir(400);
  vrai('« − » repasse à 1', (await S.ev(`return db.interventions.find(x=>x.id==='iP').produitsUtilises[0].qte`)) === 1);
  L = await S.ev(`return db.produits.find(p=>p.id==='pS').qte`);
  vrai('⛔ le stock n’a pas bougé (une intervention ne déduit rien) : 10', L === 10, L);
  await S.ev(`const q=document.getElementById('ip-q-iP'); q.value='mastic gris'; q.dispatchEvent(new Event('input',{bubbles:true})); return 1;`); await dormir(300);
  await S.ev(`document.querySelector('#ip-res-iP .met-chip.add').click(); return 1;`); await dormir(400);
  vrai('un produit hors catalogue s’ajoute en nomLibre', (await S.ev(`return db.interventions.find(x=>x.id==='iP').produitsUtilises.some(l=>l.nomLibre==='mastic gris')`)));
  await S.ev(`const ix=db.interventions.find(x=>x.id==='iP').produitsUtilises.findIndex(l=>l.nomLibre==='mastic gris'); document.querySelectorAll('button[aria-label="Moins"]')[ix].click(); return 1;`); await dormir(400);
  vrai('« − » à 1 retire la ligne', (await S.ev(`return db.interventions.find(x=>x.id==='iP').produitsUtilises.length`)) === 1);

  console.log('── 4. Note avant paiement : UN prix, la TVA se calcule ──');
  await S.ev(`docmForm('note-depannage',{cid:'cP',iid:'iP'}); return 1;`); await dormir(500);
  r = await S.ev(`return {prix:!!document.getElementById('docm-q-p'), plus:!!document.getElementById('docm-plus'), plusOuvert:document.getElementById('docm-plus')&&document.getElementById('docm-plus').open,
     visibles:[...document.querySelectorAll('#docm-champs input,#docm-champs select,#docm-champs textarea')].filter(e=>e.offsetParent!==null&&!e.closest('details:not([open])')).map(e=>e.id), tous:document.querySelectorAll('#docm-champs input,#docm-champs select,#docm-champs textarea').length,
     cli:document.body.innerText.includes('Mme Durand'), lieu:document.getElementById('docm-lieu').value, date:document.getElementById('docm-date').value, tva:document.getElementById('docm-tva').value}`);
  console.log('   champs visibles :', r.visibles.join(', '), '/', r.tous);
  vrai('prix rapide en haut, « Plus de détails » replié', r.prix && r.plus && !r.plusOuvert, r);
  vrai('≤ 3 champs à l’écran (prestation, prix) au lieu de ' + r.tous, r.visibles.length <= 3, r.visibles);
  vrai('client + adresse + date + TVA 20 % pré-remplis, rien de redemandé', r.cli && /Verte/.test(r.lieu) && /^\d{4}-\d\d-\d\d$/.test(r.date) && r.tva === '20', r);
  await S.ev(`const d=document.getElementById('docm-q-d'); d.value='Remplacement du siphon'; d.dispatchEvent(new Event('input',{bubbles:true})); const p=document.getElementById('docm-q-p'); p.value='100'; p.dispatchEvent(new Event('input',{bubbles:true})); return 1;`); await dormir(300);
  let tot = await S.ev(`return document.getElementById('docm-tot').innerText`);
  vrai('100 € HT → total TTC 120,00 € calculé seul', /Total HT\s*100,00/.test(tot) && /Total TTC\s*120,00/.test(tot) && /TVA 20 %\s*20,00/.test(tot), tot);
  await S.ev(`docmPrixMode('ttc'); const p=document.getElementById('docm-q-p'); p.value='120'; p.dispatchEvent(new Event('input',{bubbles:true})); return 1;`); await dormir(300);
  tot = await S.ev(`return document.getElementById('docm-tot').innerText`);
  vrai('bascule TTC : 120 € TTC → HT 100,00 · TVA 20,00', /Total HT\s*100,00/.test(tot) && /Total TTC\s*120,00/.test(tot), tot);
  await S.ev(`docmSet('tva','10'); return 1;`); await dormir(200);
  tot = await S.ev(`return document.getElementById('docm-tot').innerText`);
  vrai('TTC tapé, TVA 10 % : le HT suit (109,09 · TTC 120,00)', /Total HT\s*109,09/.test(tot) && /Total TTC\s*120,00/.test(tot), tot);
  await S.ev(`docmSet('tva','20'); return 1;`);
  await S.ev(`docmSauver(true); return 1;`);
  const doc = await S.ev(`return db.docsMetier.find(d=>d.doc==='note-depannage')`);
  vrai('le document est enregistré (n° NOT-…), ligne à 100 HT, client/intervention/lieu/TVA posés', doc && /^NOT-/.test(doc.num) && doc.lignes.length === 1 && doc.lignes[0].pu === '100' && doc.v.tva === '20' && doc.clientId === 'cP' && doc.interventionId === 'iP' && /Verte/.test(doc.v.lieu), doc);
  await S.ev(`try{ closeModal(true); }catch(e){} return 1;`);

  console.log('── 5. Devis et test d’étanchéité : repliés eux aussi ──');
  await S.ev(`docmForm('devis-depannage',{cid:'cP',iid:'iP'}); return 1;`); await dormir(400);
  r = await S.ev(`return {v:[...document.querySelectorAll('#docm-champs input,#docm-champs select,#docm-champs textarea')].filter(e=>e.offsetParent!==null&&!e.closest('details:not([open])')).map(e=>e.id), tous:document.querySelectorAll('#docm-champs input,#docm-champs select,#docm-champs textarea').length}`);
  console.log('   devis : visibles', r.v.join(', '), '/', r.tous);
  vrai('devis : nature + prestation + prix, le reste replié', r.v.length <= 4 && r.v.indexOf('docm-q-p') >= 0, r);
  await S.ev(`docmSauver(true); return 1;`); vrai('devis sans prix : refus dit', /ligne/i.test(await S.ev(`return __toasts.slice(-1)[0]`)), await S.ev(`return __toasts.slice(-1)[0]`));
  await S.ev(`try{ closeModal(true); }catch(e){} return 1;`);
  await S.ev(`docmForm('rapport-etancheite',{cid:'cP',iid:'iP'}); return 1;`); await dormir(400);
  r = await S.ev(`return {v:[...document.querySelectorAll('#docm-champs input,#docm-champs select,#docm-champs textarea')].filter(e=>e.offsetParent!==null&&!e.closest('details:not([open])')).map(e=>e.id), tous:document.querySelectorAll('#docm-champs input,#docm-champs select,#docm-champs textarea').length}`);
  console.log('   test d’étanchéité : visibles', r.v.join(', '), '/', r.tous);
  vrai('étanchéité : 7 champs à l’écran au lieu de ' + r.tous, r.v.length <= 7 && r.v.length < r.tous, r);
  await S.ev(`try{ closeModal(true); }catch(e){} return 1;`);

  console.log('── 6. le gros bouton termine l’intervention (porte existante) ──');
  await S.ev(`detailIntervention('iP'); return 1;`); await dormir(700);
  await S.ev(`document.getElementById('int-terminee-gros').click(); return 1;`); await dormir(900);
  i = await S.ev(`const i=db.interventions.find(x=>x.id==='iP'); return {st:i.statut, toasts:__toasts.slice(-3), modal:!!document.querySelector('.modal-head')}`);
  console.log('   ', JSON.stringify(i));
  vrai('statut = terminée', i.st === 'terminee', i);
  vrai('le bouton a disparu de la fiche terminée', await S.ev(`return !document.getElementById('int-terminee-gros')`));

  console.log('── 7. droits : un compte sans la case ni rattachement ne remplit rien ──');
  await S.ev(`const i=db.interventions.find(x=>x.id==='iP'); i.statut='encours'; db.users.push({id:'uX',prenom:'Cora',nom:'Compta',login:'cora',role:'compta',actif:true,pref:{}}); currentUser=db.users.find(u=>u.id==='uX'); return 1;`);
  r = await S.ev(`const can0=canCat('int','modifier'); const i=db.interventions.find(x=>x.id==='iP'); const av=JSON.stringify([i.prestaMetier,i.produitsUtilises,i.compteRendu]); const ok=intRapportPeut(i);
    metPrestaToggle('iP','XX'); intProdPlus('iP','pS'); intFaitSet('iP','pirate'); const ap=JSON.stringify([i.prestaMetier,i.produitsUtilises,i.compteRendu]); return {can0,ok,inchange:av===ap}`);
  vrai('compta sans « Interventions → Modifier » : rien ne s’écrit' + (r.can0 ? ' (ce rôle a la case : essai non concluant)' : ''), r.can0 || (r.ok === false && r.inchange), r);
  vrai('aucune erreur JavaScript de la page', (await S.ev(`return __errs`)).length === 0, await S.ev(`return __errs`));
  console.log(`\n${ok} ✓ ${ko} ✗`);
  S.fermer(); process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
