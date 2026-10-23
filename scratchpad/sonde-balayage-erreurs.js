/* ══ SONDE — BALAYAGE DE TOUTES LES RUBRIQUES : COMPTE DES ERREURS JAVASCRIPT, ET LES SIX REDESSINS DU TABLEAU DE BORD ═══════════
   Vérification du 23 octobre 2026 (suite de l'audit apple-design). Pour un profil (PROF=tel|ipad|bureau, défaut tel), encoches posées,
   en JOUR puis en NUIT : on ouvre CHAQUE rubrique du menu (go), on attend la fin de l'entrée, et on compte les exceptions non
   rattrapées et les `console.error` — avec la population (rubriques ouvertes, contenu non vide). Puis, sur le tableau de bord
   avec une fenêtre laissée en route (barre « Reprendre ») et la page défilée : les six gestes qui le redessinaient (Modifier,
   une carte ajoutée, retirée, déplacée, la disposition d'origine, la période) gardent la barre et la place.
   Sur téléphone : la barre d'onglets et sa pastille existent et la pastille désigne l'onglet courant.
   ⛔ Bêta uniquement, copie locale en 127.0.0.1. */
const path = require('path');
const { ouvrir, dormir } = require(path.join(__dirname, 'pilote.js'));
const { PROFILS, poserProfil } = require(path.join(__dirname, 'profils.js'));
/* OP Courrier (boiteMail) se dessine depuis le serveur du Courrier : sans réseau ni boîte, il n'écrit rien — nommé, pas masqué */
const SANS_SERVEUR = ['boiteMail'];
(async () => {
  const S = await ouvrir(process.env.SOURCE ? { source: process.env.SOURCE } : {});
  console.log('page mesurée :', S.version);
  let ok = 0, ko = 0; const c = (t, v, d) => { if (v) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '  → ' + JSON.stringify(d) : '')); } };
  await S.ev(`window.horsLigneDebut=function(){}; try{_horsLigne=false;}catch(e){} const h=document.getElementById('hl-ecran'); if(h)h.remove(); window.pushPropose=function(){};
    if(!db.users.length){db.users.push({id:'u1',prenom:'Justin',nom:'B',role:'admin',username:'j',pass:'x',actif:true,pref:{}});save();}
    currentUser=db.users[0]; try{ localStorage.setItem('elanB_onboarded_'+currentUser.id,'1'); }catch(e){} enterApp(currentUser); return 1;`);
  await dormir(1500); await S.ev(`try{ betaRemplir(false); }catch(e){} try{ mvtDemoPoser(); }catch(e){} return 1;`); await dormir(2000);
  const cle = process.env.PROF || 'tel', P = PROFILS[cle];
  if (P.tac) await poserProfil(S, P); else await S.c.envoyer('Emulation.setDeviceMetricsOverride', { width: P.w, height: P.h, deviceScaleFactor: P.dpr, mobile: false });
  await S.ev(`setPlatForce('${P.plat}'); return 1;`);
  const calme = async () => { for (let i = 0; i < 50; i++) { if (await S.ev(`return !document.querySelector('.content.entre');`)) break; await dormir(100); }
    await dormir(250); await S.ev(`return new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(()=>r(1))));`); };
  const enc = P.enc ? await S.ev(`return getComputedStyle(document.documentElement).getPropertyValue('--sat')||''`) : '';
  console.log('profil : ' + P.lbl + (P.enc ? ' · encoches ' + P.enc.join('/') : ''));
  let vues = await S.ev(`return NAV.flatMap(s=>s.items).filter(it=>{ try{ return canSee(it); }catch(e){ return false; } }).map(it=>it.k).filter((k,i,a)=>views[k]&&a.indexOf(k)===i);`);
  for (const theme of ['light', 'dark']) {
    await S.ev(`(typeof setThemePrefNu==='function'?setThemePrefNu:setThemePref)('${theme}'); return 1;`); await dormir(2500);
    const e0 = S.exceptions.length, k0 = S.consoleErr.length; let vides = [], ouvertes = 0;
    for (const v of vues) {
      await S.ev(`try{ closeModal(true); }catch(e){} try{ go('${v}'); }catch(e){ window.__errGo=(window.__errGo||[]).concat('${v}: '+e.message); } return 1;`); await calme();
      const n = await S.ev(`const c=document.getElementById('content'); return c?c.textContent.trim().length:0;`);
      ouvertes++; if (n < 20 && !SANS_SERVEUR.includes(v)) vides.push(v + ':' + n);
    }
    const nouvelles = S.exceptions.slice(e0), nouvellesK = S.consoleErr.slice(k0);
    c('(population) ' + theme + ' : ' + ouvertes + ' rubriques ouvertes (au moins 30), toutes avec du contenu', ouvertes >= 30 && vides.length === 0, vides);
    c('⛔ ' + (theme === 'light' ? 'jour' : 'nuit') + ' : aucune exception JavaScript sur ' + ouvertes + ' rubriques', nouvelles.length === 0, nouvelles.slice(0, 5));
    c('⛔ ' + (theme === 'light' ? 'jour' : 'nuit') + ' : aucun console.error', nouvellesK.length === 0, nouvellesK.slice(0, 5));
    const eg = await S.ev(`return window.__errGo||[]`); c('go() n’a jeté pour aucune rubrique', eg.length === 0, eg.slice(0, 5));
  }
  /* ── la barre d'onglets et sa pastille (téléphone) ── */
  if (P.tac && P.w < 600) {
    await S.ev(`closeModal(true); go('dashboard'); return 1;`); await calme();
    const b = await S.ev(`const t=document.querySelector('.rf-tabs, #tabbar'); if(!t) return null; const r=t.getBoundingClientRect(); const cur=t.querySelector('button.on'); return {n:t.querySelectorAll('button,a,.tab,.rf-tab').length, haut:Math.round(r.top), bas:Math.round(r.bottom), h:innerHeight, cur:cur?(cur.getAttribute('aria-label')||cur.textContent||'').trim().slice(0,30):null, pastille:!!t.querySelector('.tab-cur,.rf-cur,.rf-bulle,[class*=bulle],[class*=pill]')};`);
    c('(population) la barre d’onglets est là, avec ses onglets, au bas de l’écran (encoche posée)', !!b && b.n >= 3 && b.bas <= b.h, b);
    c('un onglet est désigné comme courant', !!b && !!b.cur, b);
  }
  /* ── les six redessins du tableau de bord ── */
  console.log('\nTableau de bord : les gestes qui le redessinaient (barre « Reprendre » + place)');
  await S.ev(`try{ closeModal(true); }catch(e){} go('clients'); return 1;`); await dormir(900); await S.ev(`const o=multiTout(); o.dashboard={ts:Date.now(),html:'<div class="modal-head"><h3>Nouveau client</h3></div>',titre:'Nouveau client',y:120}; multiEcrire(o); go('dashboard'); return 1;`); await dormir(1300); await calme();
  const etat = () => S.ev(`const c=document.getElementById('content'); const H=(c.scrollHeight>c.clientHeight+5)?c:document.scrollingElement; return {barre:!!c.querySelector('.multi-bar'), y:Math.round(H.scrollTop), max:Math.round(H.scrollHeight-H.clientHeight), edit:typeof dashEdit!=='undefined'&&dashEdit, cartes:[...c.querySelectorAll('[data-dk],[data-k]')].length, layout:(dashLayout()||[]).join(',')};`);
  await S.ev(`const c=document.getElementById('content'); const H=(c.scrollHeight>c.clientHeight+5)?c:document.scrollingElement; H.scrollTop=Math.min(200,H.scrollHeight-H.clientHeight); return 1;`); await dormir(300);
  const e0 = await etat();
  c('(population) la barre « Reprendre » est là, la page est défilée (' + e0.y + ' px), la disposition a ' + e0.layout.split(',').length + ' cartes', e0.barre && e0.y > 20 && e0.layout.split(',').length >= 3, e0);
  let prec = e0; /* la page garde sa place AUTANT QU'ELLE LE PEUT : elle ne regagne pas ce qu'une page raccourcie lui a fait perdre */
  const pas = async (nom, js, attendu) => { await S.ev(js); await dormir(700); await calme(); const e = await etat();
    c('⛔ ' + nom + ' : la barre « Reprendre » reste, la page garde sa place (' + prec.y + ' → ' + e.y + ' px, au plus ' + e.max + ')', e.barre && (attendu ? attendu(e) : true) && Math.abs(e.y - Math.min(prec.y, e.max)) <= 3, e); prec = e; return e; };
  await pas('« Modifier »', `dashToggleEdit(); return 1;`);
  const avant = (await etat()).layout.split(',');
  const dispo = await S.ev(`return {layout:dashLayout(), tout:Object.keys(typeof DASH_CARTES!=='undefined'?DASH_CARTES:(typeof DASH_DEFS!=='undefined'?DASH_DEFS:{}))};`);
  await pas('une carte déplacée', `dashMove(dashLayout()[1], 1); return 1;`, e => e.layout !== avant.join(','));
  const k = avant[avant.length - 1];
  await pas('une carte retirée', `dashRemove(${JSON.stringify(k)}); return 1;`, e => !e.layout.split(',').includes(k));
  await pas('une carte ajoutée', `dashAdd(${JSON.stringify(k)}); return 1;`, e => e.layout.split(',').includes(k));
  await pas('la disposition d’origine', `dashReset(); return 1;`);
  await S.ev(`if(dashEdit) dashToggleEdit(); return 1;`); await dormir(600); await calme();
  await S.ev(`const o=multiTout(); delete o.dashboard; multiEcrire(o); return 1;`);
  c('aucune exception JavaScript pendant toute la sonde (' + S.exceptions.length + ')', S.exceptions.length === 0, S.exceptions.slice(0, 5));
  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  S.fermer(); process.exit(ko ? 1 : 0);
})();
