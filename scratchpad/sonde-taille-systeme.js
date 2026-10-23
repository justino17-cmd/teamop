/* Sonde du 23 octobre 2026 — « Comme l'appareil » suit-il la taille du texte du TÉLÉPHONE ? Ce Chromium n'est pas un iPhone :
   il ne connaît pas `font:-apple-system-body`. On le SIMULE, sans toucher au code de la page : `CSS.supports` dit oui et
   `getComputedStyle` rend, pour le span de mesure (reconnu à sa forme : Chromium jette la déclaration `font:-apple-system-body`), la taille que Safari rendrait (17 px par défaut ; 19, 21, 23 aux trois crans
   du dessus, 28 aux crans d'accessibilité). Ce qui est éprouvé : la LOGIQUE de la page (lecture, facteur, application, relecture
   au retour sur l'application, plafond à ×1,35, jamais sous ×1, choix explicite qui l'emporte). Ce qui ne l'est PAS : que Safari
   rende vraiment ces tailles — il faut un iPhone (voir le guide). ⛔ Bêta uniquement, copie locale en 127.0.0.1. */
const path = require('path');
const { ouvrir, dormir } = require(path.join(__dirname, 'pilote.js'));
const { PROFILS, poserProfil } = require(path.join(__dirname, 'profils.js'));
(async () => {
  const S = await ouvrir(process.env.SOURCE ? { source: process.env.SOURCE } : {});
  console.log('page mesurée :', S.version);
  let ok = 0, ko = 0; const ck = (t, v, d) => { if (v) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '  → ' + JSON.stringify(d) : '')); } };
  await S.ev(`window.horsLigneDebut=function(){}; try{_horsLigne=false;}catch(e){} const h=document.getElementById('hl-ecran'); if(h)h.remove(); window.pushPropose=function(){};
    if(!db.users.length){db.users.push({id:'u1',prenom:'Justin',nom:'B',role:'admin',username:'j',pass:'x',actif:true,pref:{}});save();}
    currentUser=db.users[0]; try{ localStorage.setItem('elanB_onboarded_'+currentUser.id,'1'); }catch(e){} enterApp(currentUser); return 1;`);
  await dormir(1500);
  for (const nomP of (process.env.PROFILS || 'tel,ipad').split(',')) {
    const P = PROFILS[nomP]; await poserProfil(S, P);
    await S.ev(`setPlatForce('${P.plat}'); closeModal(true); go('dashboard'); return 1;`); await dormir(1200);
    console.log('\n' + P.lbl);
    ck('(population) la plateforme se dit iOS (data-os=ios)', await S.ev(`return document.documentElement.getAttribute('data-os')==='ios'`), await S.ev(`return document.documentElement.getAttribute('data-os')`));
    await S.ev(`prefLocal(TXT_CLE,'auto'); window.__px=17;
      window.__cssSupports=window.__cssSupports||CSS.supports.bind(CSS);
      CSS.supports=function(a,b){ return (a==='font'&&b==='-apple-system-body')?true:window.__cssSupports.apply(CSS,arguments); };
      window.__gcs=window.__gcs||window.getComputedStyle.bind(window);
      window.getComputedStyle=function(el,p){ if(el&&el.tagName==='SPAN'&&el.textContent==='x'&&el.style&&el.style.position==='absolute'&&el.style.visibility==='hidden') return {fontSize:window.__px+'px'}; return window.__gcs(el,p); };
      return 1;`);
    const facteur = async (px) => await S.ev(`window.__px=${px}; txtAppliquer(); const d=document.documentElement; return {f:txtFacteur(), cssVar:d.style.getPropertyValue('--txt'), attr:d.getAttribute('data-txt')};`);
    const lirePx = async () => await S.ev(`const e=document.querySelector('#content .card, #content p, #content b'); return e?parseFloat(getComputedStyle(e).fontSize):0;`);
    const r17 = await facteur(17); await dormir(200);
    ck('réglage du téléphone par défaut (17 px) : ×1, rien ne bouge (pas de data-txt)', r17.f === 1 && !r17.attr, r17);
    const base = await S.ev(`const e=[...document.querySelectorAll('#content *')].filter(x=>x.children.length===0&&x.textContent.trim().length>3&&parseFloat(getComputedStyle(x).fontSize)>=11&&parseFloat(getComputedStyle(x).fontSize)<=16)[0]; if(!e) return null; e.setAttribute('data-sonde-t','1'); return parseFloat(getComputedStyle(e).fontSize);`);
    ck('(population) un texte de contenu a été trouvé pour mesurer', base > 0, base);
    const att = {};
    for (const [px, attendu] of [[19, 1.12], [21, 1.24], [23, 1.35], [28, 1.35], [15, 1]]) {
      const r = await facteur(px); await dormir(200);
      const t = await S.ev(`const e=document.querySelector('[data-sonde-t]'); return e?parseFloat(getComputedStyle(e).fontSize):0;`);
      att[px] = [r.f, r.cssVar, r.attr, t];
      ck('téléphone à ' + px + ' px (réglage du système) : facteur ×' + attendu + ' (plafonné à 1,35, jamais sous 1) ; le texte passe de ' + base + ' à ' + t + ' px', Math.abs(r.f - attendu) < 0.011 && Math.abs(t - base * attendu) < 0.6, [r, t]);
    }
    /* un choix explicite l'emporte sur le téléphone */
    await S.ev(`window.__px=23; setTxt('1'); return 1;`); await dormir(200);
    const ex = await S.ev(`return {f:txtFacteur(), attr:document.documentElement.getAttribute('data-txt'), t:parseFloat(getComputedStyle(document.querySelector('[data-sonde-t]')).fontSize)}`);
    ck('« Normale » choisie dans l’application l’emporte sur un téléphone à 23 px (×1, texte ' + base + ' px)', ex.f === 1 && !ex.attr && Math.abs(ex.t - base) < 0.3, ex);
    await S.ev(`setTxt('auto'); return 1;`); await dormir(200);
    const re = await S.ev(`return {f:txtFacteur(), t:parseFloat(getComputedStyle(document.querySelector('[data-sonde-t]')).fontSize)}`);
    ck('« Comme l’appareil » rend la main au téléphone (23 px → ×1,35)', Math.abs(re.f - 1.35) < 0.011 && re.t > base * 1.3, re);
    /* le téléphone change PENDANT que l'application est en arrière-plan : au retour, elle relit */
    await S.ev(`window.__px=19; Object.defineProperty(document,'visibilityState',{configurable:true,get:()=>'visible'}); document.dispatchEvent(new Event('visibilitychange')); return 1;`); await dormir(300);
    const ret = await S.ev(`return {f:txtFacteur(), attr:document.documentElement.getAttribute('data-txt'), t:parseFloat(getComputedStyle(document.querySelector('[data-sonde-t]')).fontSize)}`);
    ck('le téléphone passe à 19 px pendant l’absence : au retour sur l’application, elle relit (×1,12)', Math.abs(ret.f - 1.12) < 0.011 && Math.abs(ret.t - base * 1.12) < 0.6, ret);
    /* le réglage de l'écran Paramètres dit ce qui se passe */
    await S.ev(`go('parametres'); return 1;`); await dormir(1500);
    const note = await S.ev(`const c=document.getElementById('content'); const m=/Suit Réglages[^.]*\\.[^<]*/.exec(c.textContent); return m?m[0].slice(0,160):null;`);
    ck('Paramètres › Apparence dit « Suit Réglages › Luminosité et affichage › Taille du texte » et le facteur en cours', !!note && /×1,12/.test(note), note);
  }
  const jsErr = S.exceptions.length;
  ck('aucune erreur JavaScript levée pendant la sonde', jsErr === 0, S.exceptions.slice(0, 4));
  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  S.fermer(); process.exit(ko ? 1 : 0);
})();
