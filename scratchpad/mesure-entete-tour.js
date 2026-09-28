/* mesure ponctuelle : où tombent la pastille et l'en-tête de la Tour, de nuit et de jour, encoche posée (47 px) */
'use strict';
const { demarrer, onglet, STABLE } = require('./sonde-tour-theme.js');
(async () => { const S = await demarrer();
  try { for (const mode of ['dark', 'light']) { const o = await onglet(S, 'telephone', mode);
    const r = await o.ev(`await new Promise(r=>setTimeout(r,800)); ${STABLE} const q=s=>{const e=document.querySelector(s); if(!e) return null; const r=e.getBoundingClientRect(); return Math.round(r.top)+'/'+Math.round(r.height);};
      return {pastille:q('#menu-rond'), bandeau:q('.bandeau'), hchip:q('.hchip'), pill:q('#app-pill'), app:q('#app'), scrollY, inset:getComputedStyle(document.querySelector('.tiroir')).paddingTop, jour:document.body.classList.contains('jour'),
        bpt:getComputedStyle(document.querySelector('.bandeau')).paddingTop, hbpt:getComputedStyle(document.querySelector('.hbar')).paddingTop, bpos:getComputedStyle(document.querySelector('.bandeau')).position};`);
    console.log(mode, JSON.stringify(r)); await o.fermer(); } } finally { S.fermer(); } process.exit(0); })();
