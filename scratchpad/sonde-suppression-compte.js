/* Supprimer un compte, au doigt, dans la vraie page (bêta) : 🗑 → « Êtes-vous sûr ? » → la case → « Oui ».
   Justin, 26 septembre 2026 : plus de code par e-mail. On clique comme une personne (événements de souris
   au centre de l'élément, après l'avoir amené à l'écran), et on regarde ce qui s'est VRAIMENT passé :
   le compte, sa pierre tombale, la liste à l'écran, et le réseau (aucun /api/sendcode, aucun /api/checkcode).
   ⛔ Bêta seulement, 127.0.0.1 seulement (pilote.js).  Usage : [SOURCE=…] node scratchpad/sonde-suppression-compte.js */
const { ouvrir, dormir } = require('./pilote.js');
let ok = 0, ko = 0;
const vrai = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '\n      ' + JSON.stringify(d) : '')); } };

(async () => {
  const S = await ouvrir(process.env.SOURCE ? { source: process.env.SOURCE } : {});
  try {
    console.log('Page : ' + S.version);
    await S.c.envoyer('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
    await S.c.envoyer('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
    await S.ev(`window.horsLigneDebut=function(){}; try{_horsLigne=false;}catch(e){} const h=document.getElementById('hl-ecran'); if(h) h.remove();
      window.pushPropose=function(){};
      window.__appels=[]; const f0=window.fetch; window.fetch=function(u,o){ try{ window.__appels.push(String((u&&u.url)||u)); }catch(e){} return f0.apply(this,arguments); };
      if(!db.users.some(u=>u.id==='beta-justin')) db.users.push({id:'beta-justin',prenom:'Justin',nom:'Bernard',login:'justin',role:'admin',actif:true,essai:true,email:'justin@exemple.invalid'});
      db.users=db.users.filter(u=>u.id!=='u-test'); db.users.push({id:'u-test',prenom:'Test',nom:'Suppression',login:'test-suppr',role:'technicien',actif:true});
      save(); currentUser=db.users.find(u=>u.id==='beta-justin');
      try{ ['onboarded_','push_ask_','photo_prompt_'].forEach(k=>localStorage.setItem('elanB_'+k+'beta-justin','1')); }catch(e){}
      enterApp(currentUser); return 1;`);
    await dormir(1500);
    await S.ev(`closeModal&&closeModal(); go('utilisateurs'); return 1;`); await dormir(1200);

    /* un clic de doigt : amener l'élément au milieu de l'écran, puis presser et relâcher à son centre */
    const toucher = async (sel) => {
      const p = await S.ev(`const e=document.querySelector(${JSON.stringify(sel)}); if(!e) return null; e.scrollIntoView({block:'center'});
        await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))); const b=e.getBoundingClientRect();
        if(!b.width||!b.height) return null; const x=b.left+b.width/2, y=b.top+b.height/2; const t=document.elementFromPoint(x,y);
        return {x,y,touche:!!t&&(t===e||e.contains(t)||(t.closest&&t.closest('label')&&t.closest('label').contains(e)))};`);
      if (!p) return { ok: false, raison: 'élément absent ou sans taille' };
      for (const type of ['mousePressed', 'mouseReleased']) await S.c.envoyer('Input.dispatchMouseEvent', { type, x: p.x, y: p.y, button: 'left', clickCount: 1 });
      await dormir(500);
      return { ok: p.touche, raison: p.touche ? '' : 'le point touché est un autre élément' };
    };

    const avant = await S.ev(`return {existe:db.users.some(u=>u.id==='u-test'), ligne:!!document.querySelector('button[onclick="delUser(\\'u-test\\')"]')};`);
    vrai('population : le compte « Test Suppression » existe et sa ligne a un 🗑', avant.existe && avant.ligne, avant);
    const t1 = await toucher(`button[onclick="delUser('u-test')"]`);
    vrai('le 🗑 est touché pour de vrai', t1.ok, t1);
    const f = await S.ev(`const m=document.querySelector('#overlay .modal'); const b=document.getElementById('du-oui'), c=document.getElementById('du-ok');
      const lab=c&&c.closest('label'); const r=lab?lab.getBoundingClientRect():null;
      return {texte:m?m.textContent.replace(/\\s+/g,' ').trim():'', case:!!c, coche:!!(c&&c.checked), ouiDesactive:!!(b&&b.disabled), hauteurCase:r?Math.round(r.height):0};`);
    console.log('    fenêtre : « ' + f.texte.slice(0, 170) + '… »');
    vrai('la question est posée : « Êtes-vous sûr de vouloir supprimer ce compte ? »', /Êtes-vous sûr de vouloir supprimer ce compte \?/.test(f.texte), f.texte);
    vrai('⛔ aucun code, aucune adresse e-mail demandée', !/code à 6 chiffres|Code reçu|adresse e-mail/i.test(f.texte), f.texte);
    vrai('une case, non cochée, et « Oui » désactivé', f.case && !f.coche && f.ouiDesactive, f);
    vrai('la case se touche au doigt (rangée ≥ 44 px)', f.hauteurCase >= 44, f.hauteurCase);

    const t2 = await toucher('#du-oui');
    const e2 = await S.ev(`const o=document.getElementById('overlay'); return {existe:db.users.some(u=>u.id==='u-test'), fenetre:!!(o&&o.classList.contains('open'))};`);
    vrai('⛔ « Oui » sans la case : le compte est toujours là', e2.existe && e2.fenetre, { e2, t2 });

    const t3 = await toucher('#du-ok');
    const e3 = await S.ev(`const b=document.getElementById('du-oui'), c=document.getElementById('du-ok'); return {coche:!!(c&&c.checked), ouiActif:!!(b&&!b.disabled)};`);
    vrai('la case se coche au doigt, et « Oui » s’active', t3.ok && e3.coche && e3.ouiActif, { t3, e3 });

    const t4 = await toucher('#du-oui'); await dormir(600);
    const e4 = await S.ev(`return {existe:db.users.some(u=>u.id==='u-test'), tombe:(db.usersSupprimes||[]).some(t=>(t&&t.id||t)==='u-test'),
      /* ce que l'œil voit : closeModal() retire la classe « open » et laisse le contenu dans la page, masqué */
      fenetre:(()=>{ const o=document.getElementById('overlay'); if(!o) return false; const cs=getComputedStyle(o); return o.classList.contains('open')&&cs.display!=='none'&&cs.visibility!=='hidden'&&+cs.opacity>0.05; })(),
      ligne:!!document.querySelector('button[onclick="delUser(\\'u-test\\')"]'),
      appels:(window.__appels||[]).filter(u=>/sendcode|checkcode/.test(u)), journal:(db.journal||[]).slice(0,3).map(j=>(j.titre||j.t||j.a||'')+' '+(j.detail||j.d||''))};`);
    vrai('« Oui » : le compte est supprimé', !e4.existe, e4);
    vrai('…sa pierre tombale est posée (il ne reviendra pas par la synchro)', e4.tombe, e4);
    vrai('…la fenêtre est fermée et la ligne a disparu de la liste', !e4.fenetre && !e4.ligne, e4);
    vrai('⛔ aucun appel /api/sendcode ni /api/checkcode de tout le geste', e4.appels.length === 0, e4.appels);
    vrai('aucune erreur JavaScript', S.exceptions.length === 0, S.exceptions);
  } finally { S.fermer(); }
  console.log('\n' + ok + ' ✓ ' + ko + ' ✗');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
