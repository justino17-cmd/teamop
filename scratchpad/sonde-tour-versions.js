/* ══ SONDE — LES PANNEAUX DE VERSIONS DE LA TOUR v2.84, AU TÉLÉPHONE ET AU BUREAU, DE NUIT ET DE JOUR ══
   Justin, 6 octobre 2026 : « le panneau OP MESSAGES, le panneau OP GESTION, et que tout soit bien séparé ». On injecte des réponses
   (VER.d, MV.d) dans la VRAIE tour.html servie en 127.0.0.1 (l'API simulée par sonde-tour-theme.js : aucune requête ne sort), et on
   exige : les deux cartes de chaque console, la page qui ne glisse pas de côté, aucune exception. Captures dans CAPTURES. */
'use strict';
const fs = require('fs'), path = require('path');
const { demarrer, onglet, STABLE } = require('./sonde-tour-theme.js');
const CAP = process.env.CAPTURES || path.join(__dirname, 'tour-versions');
fs.mkdirSync(CAP, { recursive: true });
const ok = [], ko = [];
const v = (t, cond, d) => { (cond ? ok : ko).push(t); console.log((cond ? '  ✓ ' : '  ✗ ') + t + (d !== undefined && !cond ? ' — ' + JSON.stringify(d) : '')); };
const VER = `{ok:true,min:760,versionEnLigne:767,sous:[],cleAdmin:true,maj:Date.now()-86400000,par:'Justin',minFirestore:760,beta:{min:771,maj:Date.now(),par:'Justin',versionEnLigne:771}}`;
const MV = `{ok:true,prod:{min:12,maj:Date.now(),par:'Justin',service:{joignable:true,version:12,build:'f6e5d4c',minService:1,inscription:false}},beta:{min:0,maj:0,par:'',service:{joignable:false}}}`;
(async () => {
  const S = await demarrer();
  console.log('Tour ' + S.version);
  try {
    for (const [app, largeur] of [['telephone', 390], ['telephone', 360], ['bureau', 0]]) for (const mode of ['dark', 'light']) {
      const nom = app + (largeur ? largeur : '') + '-' + mode;
      console.log('\n── ' + nom + ' ──');
      const o = await onglet(S, app, mode);
      if (largeur && largeur !== 390) await o.c.envoyer('Emulation.setDeviceMetricsOverride', { width: largeur, height: 780, deviceScaleFactor: 3, mobile: true });
      for (const console_ of ['gestion', 'messages']) {
        const r = await o.ev(`try{ setApp('${console_}',true); }catch(e){} setTab('surveillance',true); await new Promise(r=>setTimeout(r,700));
          VER.d=${VER}; VER.ts=Date.now(); MV.d=${MV}; MV.ts=Date.now(); render(); ${STABLE} await new Promise(r=>setTimeout(r,600)); ${STABLE}
          const secs=[...document.querySelectorAll('.sec')].filter(e=>e.textContent.trim().indexOf('VERSIONS')===0&&e.textContent.indexOf('PUBLIQUE')+e.textContent.indexOf('BÊTA')>-2);
          if(secs[0]) secs[0].scrollIntoView({block:'start'}); ${STABLE}
          const y=scrollY; window.scrollTo(9999,y); const glisse=scrollX; window.scrollTo(0,y);
          const boutons=[...document.querySelectorAll('button')].filter(b=>/Exiger|Lever/.test(b.textContent)&&b.offsetParent).map(b=>({t:b.textContent.trim(),h:Math.round(b.getBoundingClientRect().height),r:Math.round(b.getBoundingClientRect().right),dis:b.disabled}));
          return { titres:secs.map(e=>e.textContent.trim().indexOf('PUBLIQUE')>0&&e.textContent.trim().indexOf('PUBLIQUE')<25?'PUBLIQUE':'BÊTA'), tous:[...document.querySelectorAll('.sec')].map(e=>e.textContent.slice(0,30)), glisse, boutons, iw:innerWidth };`);
        v(console_ + ' : ' + JSON.stringify(r.titres) + ' ' + JSON.stringify(r.tous), console_ === 'gestion' ? r.titres.join() === 'PUBLIQUE,BÊTA' : r.titres.join() === 'PUBLIQUE,BÊTA', r.titres);
        v(console_ + ' : la page ne glisse pas de côté', r.glisse === 0, r.glisse);
        v(console_ + ' : les boutons tiennent dans l’écran', r.boutons.length >= 2 && r.boutons.every(b => b.r <= r.iw), r.boutons);
        if (console_ === 'messages') v('messages : « Exiger » de la bêta injoignable est désactivé', r.boutons.some(b => /Exiger/.test(b.t) && b.dis), r.boutons);
        const cap = await o.c.envoyer('Page.captureScreenshot', { format: 'png' });
        fs.writeFileSync(path.join(CAP, nom + '-' + console_ + '.png'), Buffer.from(cap.data, 'base64'));
      }
      const acc = await o.ev(`setTab('essais',true); await new Promise(r=>setTimeout(r,700)); MV.d=${MV}; MV.ts=Date.now(); BT.loaded=true; render(); ${STABLE} await new Promise(r=>setTimeout(r,500));
        const t=document.getElementById('vue').textContent; window.scrollTo(9999,scrollY); return { pub:/Version publique d’OP MESSAGES/.test(t), etat:/inscriptions fermées/.test(t), glisse:scrollX };`);
      v('Accès (messages) : la version publique et son état', acc.pub && acc.etat, acc);
      v('Accès (messages) : ne glisse pas de côté', acc.glisse === 0, acc.glisse);
      const cap = await o.c.envoyer('Page.captureScreenshot', { format: 'png' });
      fs.writeFileSync(path.join(CAP, nom + '-acces.png'), Buffer.from(cap.data, 'base64'));
      v('aucune exception', o.exceptions.length === 0, o.exceptions);
      await o.fermer();
    }
  } finally { S.fermer(); }
  console.log('\n' + ok.length + ' ✓  ' + ko.length + ' ✗');
  process.exit(ko.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
