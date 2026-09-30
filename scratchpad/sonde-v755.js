/* ══ SONDE — CE QUE LA v755 CHANGE, DANS LA VRAIE PAGE ═══════════════════════════════════════════════
   Le banc (test-822) exécute les vraies fonctions ; ici on regarde ce que l'ÉCRAN montre, dans la bêta :
   A. l'identité du compte dans le pied du menu (initiales, nom, rôle · entreprise) à l'ouverture ;
   B. se renommer par le VRAI formulaire (champs remplis, bouton cliqué à la souris) : les initiales du menu
      changent tout de suite — la v754 gardait les anciennes jusqu'au rechargement ;
   C. le journal (Historique) : une puce par type d'entrée, plus aucune puce générique pour les types écrits
      par le code (réglages d'entreprise, intervention, planning, commercial, synchro) ;
   D. un avatar fait avec l'ancien créateur (« avb ») se recolore quand la teinte change — son dessin est
      resté quand son écran est parti ;
   E. aucune exception dans la page.
   ⛔ Bêta locale, 127.0.0.1, données fictives. SOURCE=<bêta d'avant> pour la contre-épreuve : la v754 doit
   tomber sur B et C. */
const path = require('path');
const { ouvrir, dormir } = require(path.join(__dirname, 'pilote.js'));
let ok = 0, ko = 0; const vrai = (t, c, d) => { c ? ok++ : ko++; console.log((c ? '  ✓ ' : '  ✗ ') + t + (c || d === undefined ? '' : '  → ' + JSON.stringify(d))); };

async function cliquer(S, sel) {
  const r = await S.ev(`const e=document.querySelector(${JSON.stringify(sel)}); if(!e) return null;
    e.scrollIntoView({block:'center'}); await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
    const b=e.getBoundingClientRect(); const x=b.left+b.width/2, y=b.top+b.height/2; const t=document.elementFromPoint(x,y);
    return {x,y,w:b.width,h:b.height,atteint:!!t&&(t===e||e.contains(t))};`);
  if (!r || !r.w || !r.atteint) return r || false;
  for (const type of ['mousePressed', 'mouseReleased'])
    await S.c.envoyer('Input.dispatchMouseEvent', { type, x: r.x, y: r.y, button: 'left', clickCount: 1 });
  await dormir(300);
  return true;
}
const pied = S => S.ev(`const g=id=>{ const e=document.getElementById(id); return e?e.textContent.trim():null; };
  return {ava:g('foot-ava'), nom:g('foot-name'), role:g('foot-role')};`);

(async () => {
  const S = await ouvrir(process.env.SOURCE ? { source: process.env.SOURCE } : {});
  console.log('page mesurée :', S.version);
  await S.c.envoyer('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
  await S.c.envoyer('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  await S.ev(`window.horsLigneDebut=function(){}; try{_horsLigne=false;}catch(e){} const h=document.getElementById('hl-ecran'); if(h)h.remove();
    window.pushPropose=function(){}; return 1;`);
  for (let i = 0; i < 100; i++) { if (await S.ev('return !!(db&&db.permsRepris)')) break; await dormir(300); }
  const pop = await S.ev(`db.forfaitQty=5; db.entreprise=Object.assign({},db.entreprise||{},{nom:'Sonde Nettoyage'});
    db.users=[{id:'uA',prenom:'Justin',nom:'Roux',login:'jroux',role:'admin',actif:true,pref:{}},
      {id:'uT',prenom:'Tom',nom:'Terrain',login:'tom',role:'technicien',actif:true,pref:{}}];
    const t=Date.now();
    db.journal=[['Métier de l’entreprise','Nettoyage / Propreté','admin'],['Intervention démarrée','Cuisine sonde','intervention'],
      ['Organisation du planning validée','','plan'],['Synchro allégée','2 pièces','sync'],['Devis envoyé','DEV-2026-900','commercial'],
      ['Droits modifiés','@tom','auth']].map((x,i)=>({id:'j'+i,ts:t-i*60000,date:todayISO(),heure:'10:0'+i,action:x[0],detail:x[1],type:x[2],user:'Justin Roux',userId:'uA'}));
    save(); return {users:db.users.length, journal:db.journal.length};`);
  vrai('population : deux comptes, six entrées de journal de six types', pop.users === 2 && pop.journal === 6, pop);

  console.log('\n── A. l’identité à l’ouverture ──');
  await S.ev(`try{ logout(); }catch(e){} await new Promise(r=>setTimeout(r,150)); const u=db.users.find(x=>x.id==='uA'); currentUser=u; enterApp(u);
    await new Promise(r=>setTimeout(r,800)); try{ closeModal(true); }catch(e){} return 1;`);
  const p0 = await pied(S);
  vrai('le pied du menu montre les initiales, le nom, le rôle et l’entreprise', !!p0 && p0.ava === 'JR' && p0.nom === 'Justin Roux' && p0.role === 'Administrateur · Sonde Nettoyage', p0);

  console.log('\n── B. se renommer, par le vrai formulaire ──');
  await S.ev(`formUser('uA'); await new Promise(r=>setTimeout(r,400)); return 1;`);
  const champs = await S.ev(`const f=document.querySelector('.modal form'); if(!f) return null;
    const p=f.querySelector('[name=prenom]'), n=f.querySelector('[name=nom]'); if(!p||!n) return {form:true};
    p.value='Marc'; n.value='Aubert'; p.dispatchEvent(new Event('input',{bubbles:true})); n.dispatchEvent(new Event('input',{bubbles:true}));
    return {form:true, prenom:p.value, nom:n.value};`);
  vrai('population : le formulaire de son compte est ouvert, prénom et nom remplis', !!champs && champs.prenom === 'Marc' && champs.nom === 'Aubert', champs);
  const cE = await cliquer(S, '.modal form button[type=submit]');
  vrai('le clic atteint « Enregistrer »', cE === true, cE);
  await dormir(900);
  const p1 = await pied(S), enr = await S.ev(`const u=db.users.find(x=>x.id==='uA'); return u?{prenom:u.prenom,nom:u.nom}:null;`);
  vrai('population : le compte est bien renommé', !!enr && enr.prenom === 'Marc' && enr.nom === 'Aubert', enr);
  vrai('⛔⛔ les initiales du menu suivent tout de suite (« MA »)', !!p1 && p1.ava === 'MA', p1);
  vrai('⛔ … le nom aussi, et le rôle garde l’entreprise', !!p1 && p1.nom === 'Marc Aubert' && p1.role === 'Administrateur · Sonde Nettoyage', p1);

  console.log('\n── C. le journal : une puce par type ──');
  await S.ev(`try{ closeModal(true); }catch(e){} go('historique'); await new Promise(r=>setTimeout(r,700)); return 1;`);
  const j = await S.ev(`return [...document.querySelectorAll('#content .tl-item')].map(e=>{ const d=e.querySelector('.tl-dot');
    return {puce:d?d.textContent.trim():null, img:d?!!d.querySelector('svg,img'):false, texte:e.textContent.replace(/\\s+/g,' ').trim().slice(0,60)}; });`);
  /* l'application en écrit elle-même pendant la séance (la présence du jour, le renommage) : on exige les six
     posées, et le contrôle suivant porte sur TOUTES les lignes dessinées */
  const posees = ['Métier de l’entreprise', 'Intervention démarrée', 'Organisation du planning validée', 'Synchro allégée', 'Devis envoyé', 'Droits modifiés'];
  vrai('population : les six entrées posées sont dessinées (' + (j && j.length) + ' lignes en tout)', Array.isArray(j) && posees.every(t => j.some(x => x.texte.includes(t))), j && j.map(x => x.texte));
  const generiques = (j || []).filter(x => (x.puce === '•' || x.puce === '') && !x.img).map(x => x.texte);
  vrai('⛔⛔ aucune ne tombe sur la puce générique', generiques.length === 0, generiques);
  const metier = (j || []).find(x => /Métier de l’entreprise/.test(x.texte));
  vrai('… « Métier de l’entreprise » a la sienne', !!metier && (metier.puce === '🛠️' || metier.img), metier);

  console.log('\n── D. un avatar de l’ancien créateur se recolore ──');
  const av = await S.ev(`const u=db.users.find(x=>x.id==='uA'); const svg=avbSvg({skin:'#EAB38B',hair:'court',hairColor:'#3B2A1D',barbe:'non',lun:'non',shirt:'#2563EB',bg:'elan'},64);
    u.photo='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg); u.photoMeta={type:'avb',avb:{skin:'#EAB38B',hair:'court',hairColor:'#3B2A1D',barbe:'non',lun:'non',shirt:'#2563EB',bg:'elan'},accent:getAccent()};
    currentUser=u; save(); const avant=u.photo; setAccent(getAccent()==='blue'?'purple':'blue'); await new Promise(r=>setTimeout(r,900));
    return {change:u.photo!==avant, png:/^data:image\\/png/.test(u.photo||''), type:(u.photoMeta||{}).type, teinte:(u.photoMeta||{}).accent===getAccent()};`);
  vrai('⛔ changer de teinte régénère l’avatar « avb » (une nouvelle image, à la nouvelle teinte)', !!av && av.change && av.png && av.type === 'avb' && av.teinte, av);

  vrai('aucune exception dans la page', !S.exceptions.length, S.exceptions.slice(0, 3));
  S.fermer();
  console.log(`\n════ sonde-v755 (${S.version}) : ${ok} ✓ ${ko} ✗ ════`);
  process.exit(ko ? 1 : 0);
})().catch(e => { console.error('SONDE MORTE :', e.message); process.exit(2); });
