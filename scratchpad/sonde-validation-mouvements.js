/* ══ SONDE — « VALIDATIONS DR » EST DEVENU « VALIDATION DES MOUVEMENTS » (23 octobre 2026) ══════════
   Justin : « Validations DR → Validation des mouvements ; le mot validation DR, supprime-le de partout ».
   Joué dans la vraie page (copie locale de beta.html, 127.0.0.1), par un administrateur et un technicien soumis
   à la validation (Karim, `boxValidDR`) :
     1. le MENU dit « Validation des mouvements » (bureau 1440 px, bureau 1100 px, téléphone 402 px) — et son
        libellé tient (une ligne ? deux ? coupé ?) ;
     2. l'ÉCRAN de validation : titre de page, badge « En attente de validation » ;
     3. Karim prend un produit dans sa box et ENVOIE sa liste : le message dit « en validation », pas « au DR » ;
     4. français ET anglais ; jour ET nuit ;
     5. le mot « DR » n'est lu nulle part dans le texte visible de #content / du menu / de l'infobulle (hors rôles).
   ⛔ On compte la population avant de croire un zéro. Captures : CAPTURES=<dossier>.                     */
const path = require('path'), fs = require('fs');
const { ouvrir, dormir } = require(path.join(__dirname, 'pilote.js'));
let ok = 0, ko = 0;
const vrai = (t, c, d) => { c ? ok++ : ko++; console.log((c ? '  ✓ ' : '  ✗ ') + t + (c || d === undefined ? '' : '  → ' + JSON.stringify(d))); };
const v = (t, a, b) => vrai(t, JSON.stringify(a) === JSON.stringify(b), a);
const CAP = process.env.CAPTURES || '';
const MOT_DR = '(?<![A-Za-z0-9_À-ÿ])(DR|RD)(?![A-Za-z0-9_À-ÿ])';

(async () => {
  const S = await ouvrir(process.env.SOURCE ? { source: process.env.SOURCE } : {});
  console.log('page mesurée :', S.version);
  const cap = async n => { if (!CAP) return; await dormir(500); fs.mkdirSync(CAP, { recursive: true });
    const s = await S.c.envoyer('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(path.join(CAP, n + '.png'), Buffer.from(s.data, 'base64')); };
  await S.ev(`window.horsLigneDebut=function(){}; try{_horsLigne=false;}catch(e){} const h=document.getElementById('hl-ecran'); if(h)h.remove(); window.pushPropose=function(){};
    window.__toasts=[]; const t0=window.toast; window.toast=function(m){ window.__toasts.push(String(m)); return t0.apply(this,arguments); }; return 1;`);
  await S.c.envoyer('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });

  const pop = await S.ev(`
    db.users=(db.users||[]).filter(u=>!/^u-vm-/.test(u.id));
    db.users.push({id:'u-vm-a',prenom:'Justin',nom:'Roux',login:'jr-vm',role:'admin',actif:true,pref:{}},
      {id:'u-vm-k',prenom:'Karim',nom:'Benali',login:'kb-vm',role:'technicien',techId:'t-vm-k',actif:true,pref:{},boxValidDR:true});
    db.techniciens=(db.techniciens||[]).filter(t=>!/^t-vm-/.test(t.id)).concat([{id:'t-vm-k',nom:'Benali',prenom:'Karim'}]);
    db.produits=(db.produits||[]).filter(p=>!/^p-vm-/.test(p.id));
    produitCreer({id:'p-vm-a',nom:'ADVION GEL BLATTES 30G',ref:'ADV30',categorie:'TP18 — Insecticide',unite:'u',qte:0,seuil:2},{semis:true});
    db.boxes=[{id:'bx-vm',nom:'Box Véhicule Nord',numero:'BX-VM-1',stock:{'p-vm-a':{u:10,ctn:0}},userIds:['u-vm-k'],techIds:['t-vm-k'],actif:true}];
    db.boxMvtAttente=[]; db.validDRTous=false; save();
    return {admin:db.users.some(u=>u.id==='u-vm-a'), tech:db.users.find(u=>u.id==='u-vm-k').boxValidDR, boxes:db.boxes.length};`);
  v('population : un administrateur, un technicien soumis à la validation, une box de 10 unités', pop, { admin: true, tech: true, boxes: 1 });

  const connecter = async id => { await S.ev(`try{ closeModal(true); }catch(e){} const u=db.users.find(x=>x.id===${JSON.stringify(id)}); currentUser=u; enterApp(u);
      await new Promise(r=>setTimeout(r,1500)); try{ closeModal(true); }catch(e){} const f=document.getElementById('fdr-banner'); if(f) f.remove(); return 1;`); };
  const motsDR = zone => S.ev(`const e=document.querySelector(${JSON.stringify(zone)}); if(!e) return null; const re=new RegExp(${JSON.stringify(MOT_DR)},'g');
    const txt=e.textContent.replace(/\\s+/g,' '); const o=[]; let m; while((m=re.exec(txt))) o.push(txt.slice(Math.max(0,m.index-50),m.index+40)); return o;`);

  const profils = [
    { nom: 'bureau-1440', w: 1440, h: 900, mobile: false },
    { nom: 'bureau-1100', w: 1100, h: 800, mobile: false },
    { nom: 'telephone-402', w: 402, h: 874, mobile: true },
  ];
  for (const P of profils) {
    await S.c.envoyer('Emulation.setDeviceMetricsOverride', { width: P.w, height: P.h, deviceScaleFactor: P.mobile ? 3 : 1, mobile: P.mobile });
    await S.c.envoyer('Emulation.setTouchEmulationEnabled', { enabled: P.mobile, maxTouchPoints: 5 });
    if (P.mobile) { try { await S.c.envoyer('Emulation.setSafeAreaInsetsOverride', { insets: { top: 59, bottom: 34, left: 0, right: 0, topMax: 59, bottomMax: 34, leftMax: 0, rightMax: 0 } }); } catch (e) {} }
    for (const lang of ['fr', 'en']) for (const theme of ['light', 'dark']) {
      const id = P.nom + '-' + lang + '-' + (theme === 'light' ? 'jour' : 'nuit');
      console.log('\n══ ' + id + ' ══');
      await S.ev(`setLang(${JSON.stringify(lang)}); setThemePref(${JSON.stringify(theme)}); return 1;`);
      await connecter('u-vm-a');
      await S.ev(`go('validations'); await new Promise(r=>setTimeout(r,1000)); return 1;`);
      await dormir(700);
      /* le menu : l'entrée existe (population), dit le bon libellé, et tient */
      const nav = await S.ev(`const e=document.querySelector('#nav .nav-item[data-view="validations"]'); if(!e) return null;
        const lib=[...e.childNodes].filter(n=>n.nodeType===3||(n.nodeType===1&&!n.classList.contains('ico')&&!n.classList.contains('badge'))).map(n=>n.textContent).join('').replace(/\\s+/g,' ').trim();
        const r=e.getBoundingClientRect(); const cs=getComputedStyle(e);
        return {lib, haut:Math.round(r.height), large:Math.round(r.width), actif:e.classList.contains('active'), lignes:Math.round(r.height/parseFloat(cs.lineHeight||20))};`);
      vrai('population : l’entrée de menu « validations » existe', !!nav, nav);
      if (nav) {
        v('le menu dit « ' + (lang === 'fr' ? 'Validation des mouvements' : 'Movement approval') + ' »', nav.lib, lang === 'fr' ? 'Validation des mouvements' : 'Movement approval');
        console.log('    · entrée de menu : ' + nav.large + ' × ' + nav.haut + ' px (≈ ' + nav.lignes + ' ligne(s)), active : ' + nav.actif);
      }
      const titre = await S.ev(`const t=document.getElementById('page-title')||document.querySelector('.topbar h1,.page-title,#topbar-title'); return t?t.textContent.replace(/\\s+/g,' ').trim():null;`);
      vrai('population : le titre de la page est lu', !!titre, titre);
      v('le titre de l’écran', titre, lang === 'fr' ? 'Validation des mouvements' : 'Movement approval');
      const dr1 = await motsDR('#content'); const dr2 = await motsDR('#nav');
      vrai('population : l’écran de validation a du contenu (' + ((await S.ev(`return document.getElementById('content').textContent.length`))) + ' signes)', (await S.ev(`return document.getElementById('content').textContent.length`)) > 80);
      v('⛔ aucun « DR » lu dans l’écran (mot isolé)', dr1, []);
      v('⛔ aucun « DR » / « RD » lu dans le menu', dr2, []);
      const info = await S.ev(`return [...document.querySelectorAll('[title],[aria-label],[data-tip],[placeholder]')].map(e=>[e.title,e.getAttribute('aria-label'),e.getAttribute('data-tip'),e.getAttribute('placeholder')].join(' ')).filter(x=>new RegExp(${JSON.stringify(MOT_DR)}).test(x));`);
      v('⛔ aucun « DR » dans les infobulles, noms accessibles et textes de champ', info, []);
      if (P.mobile && lang === 'fr') { /* tiroir ouvert : le menu se voit */
        await S.ev(`const b=document.querySelector('.menu-btn'); if(b) b.click(); return 1;`); await dormir(700);
        await cap(id + '-menu');
        await S.ev(`const b=document.querySelector('.menu-btn'); if(b&&document.body.classList.contains('side-open')) b.click(); return 1;`);
      } else if (!P.mobile) { await cap(id + '-ecran'); }
      if (P.mobile) await cap(id + '-ecran');
    }
  }

  /* ══ Karim envoie sa liste : le message dit « en validation » ══ */
  console.log('\n══ ENVOI D’UNE LISTE PAR UN TECHNICIEN SOUMIS ══');
  await S.c.envoyer('Emulation.setDeviceMetricsOverride', { width: 402, height: 874, deviceScaleFactor: 3, mobile: true });
  for (const lang of ['fr', 'en']) {
    await S.ev(`setLang(${JSON.stringify(lang)}); setThemePref('light'); db.boxMvtAttente=[]; save(); return 1;`);
    await connecter('u-vm-k');
    const r = await S.ev(`window.__toasts.length=0; boxView='bx-vm'; go('boxes'); await new Promise(r=>setTimeout(r,800));
      try{ openBox('bx-vm'); }catch(e){} await new Promise(r=>setTimeout(r,800));
      const soumis=boxValidRequis(); const ok1=boxSaisir('p-vm-a',-2); await new Promise(r=>setTimeout(r,300));
      const panneau=document.getElementById('content')?document.getElementById('content').textContent.replace(/\\s+/g,' '):'';
      boxBrouillonValider('bx-vm'); await new Promise(r=>setTimeout(r,500));
      const att=(db.boxMvtAttente||[]).filter(m=>m.boxId==='bx-vm'&&m.statut==='enAttente').length;
      return {soumis, ok1, att, toasts:window.__toasts.slice(), boutonListe:/envoi en validation|Valider/.test(panneau)};`);
    vrai('population (' + lang + ') : Karim est soumis, a pris 2 unités, et une demande attend (' + r.att + ')', r.soumis && r.ok1 && r.att === 1, r);
    const envoye = (r.toasts || []).find(x => /📨/.test(x));
    vrai('le message d’envoi existe : ' + JSON.stringify(envoye), !!envoye);
    vrai('⛔ le message d’envoi dit « en validation » et pas « au DR »', !!envoye && /en validation/.test(envoye) && !new RegExp(MOT_DR).test(envoye), envoye);
    await cap('envoi-' + lang);
    /* l'administrateur voit la demande, avec « En attente de validation » */
    await connecter('u-vm-a');
    await S.ev(`go('validations'); await new Promise(r=>setTimeout(r,1000)); return 1;`); await dormir(500);
    const att = await S.ev(`return document.getElementById('content').textContent.replace(/\\s+/g,' ')`);
    vrai('population : l’écran de validation montre la demande de Karim', /Karim|ADVION|Box Véhicule/.test(att), att.slice(0, 200));
    vrai('⛔ … l’administrateur y lit « Valider » et aucun « DR »', /Valider|Approve|Aprobar/.test(att) && !new RegExp(MOT_DR).test(att), att.slice(0, 300));
    await cap('ecran-demande-admin-' + lang);
    /* Karim (soumis) voit sa propre demande, avec le badge « En attente de validation » */
    await connecter('u-vm-k');
    await S.ev(`go('validations'); await new Promise(r=>setTimeout(r,1000)); return 1;`); await dormir(500);
    const att2 = await S.ev(`return document.getElementById('content').textContent.replace(/\\s+/g,' ')`);
    vrai('population : Karim voit sa demande dans l’écran', /ADVION|Box Véhicule/.test(att2), att2.slice(0, 200));
    vrai('⛔ … avec le badge « En attente de validation » (FR) et aucun « DR »', (lang === 'fr' ? /En attente de validation/.test(att2) : true) && !new RegExp(MOT_DR).test(att2), att2.slice(0, 300));
    await cap('ecran-demande-karim-' + lang);
    await connecter('u-vm-a');
    /* Le valideur accepte : la notification part sans « le DR » */
    if (lang === 'fr') {
      const val = await S.ev(`window.__toasts.length=0; const m=(db.boxMvtAttente||[]).find(x=>x.boxId==='bx-vm'&&x.statut==='enAttente'); if(!m) return null;
        window.pushNotify=function(t,b){ window.__notifs=(window.__notifs||[]).concat([[t,b]]); }; try{ boxMvtValider(m.id,'valide'); }catch(e){ return {err:String(e)}; }
        await new Promise(r=>setTimeout(r,500)); const m2=db.boxMvtAttente.find(x=>x.id===m.id);
        return {statut:m2&&m2.statut, notifs:window.__notifs||[], journal:(db.journal||[]).slice(0,3).map(j=>j.action||j.titre||j.type||'')};`);
      vrai('population : la demande est validée', !!val && val.statut === 'valide', val);
      if (val) vrai('⛔ la notification au demandeur dit « Validé par Justin Roux » (sans « le DR »)', val.notifs.some(n => /^✅ Validé par Justin Roux/.test(n[0])), val.notifs);
    }
  }

  console.log('\nerreurs JavaScript : ' + S.exceptions.length + (S.exceptions.length ? ' → ' + JSON.stringify(S.exceptions.slice(0, 3)) : ''));
  vrai('aucune exception non rattrapée', S.exceptions.length === 0, S.exceptions);
  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  S.fermer(); process.exit(ko ? 1 : 0);
})().catch(e => { console.error('SONDE MORTE :', e && e.stack || e); process.exit(2); });
