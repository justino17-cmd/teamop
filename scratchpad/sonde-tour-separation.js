/* SONDE — la Tour v2.85 au navigateur : chaque vue de chaque console s'ouvre sans exception, la page ne glisse pas de côté, et la console OP MESSAGES
   n'affiche aucun mot du courrier ni des abonnements d'OP GESTION. tour.html servi en 127.0.0.1, API simulée (sonde-tour-theme.js). */
'use strict';
const fs = require('fs'), path = require('path');
const { demarrer, onglet, STABLE } = require('./sonde-tour-theme.js');
const CAP = path.join(__dirname, 'tour-separation'); fs.mkdirSync(CAP, { recursive: true });
const ok = [], ko = []; const v = (t, c, d) => { (c ? ok : ko).push(t); console.log((c ? '  ✓ ' : '  ✗ ') + t + (!c && d !== undefined ? ' — ' + JSON.stringify(d).slice(0, 300) : '')); };
(async () => {
  const S = await demarrer();
  try {
    for (const [app, mode] of [['telephone', 'dark'], ['bureau', 'light']]) {
      const o = await onglet(S, app, mode);
      for (const cons of ['gestion', 'messages']) {
        const vues = await o.ev(`try{ setApp('${cons}',true); }catch(e){} await new Promise(r=>setTimeout(r,500)); return vues();`);
        v(app + ' · ' + cons + ' : ses vues ' + vues.join(','), cons === 'messages' ? vues.indexOf('support') < 0 : vues.indexOf('support') >= 0);
        for (const t of vues) {
          const r = await o.ev(`setTab('${t}',true); await new Promise(r=>setTimeout(r,650)); ${STABLE} const y=scrollY; window.scrollTo(9999,y); const g=scrollX; window.scrollTo(0,y);
            const tx=document.getElementById('vue')?document.getElementById('vue').textContent:''; return { g, courrier:/Messages non lus|support@|Envois TeamOP|Notifications automatiques/.test(tx), stripe:/Paiement en échec|abonnement Stripe/.test(tx) };`);
          v(app + ' · ' + cons + ' · ' + t + ' : ne glisse pas de côté', r.g === 0, r.g);
          if (cons === 'messages') v(app + ' · messages · ' + t + ' : rien du courrier ni de Stripe d’OP GESTION', !r.courrier && !r.stripe, r);
          if (t === 'accueil' || t === 'equipe') { const cap = await o.c.envoyer('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(path.join(CAP, app + '-' + cons + '-' + t + '.png'), Buffer.from(cap.data, 'base64')); }
        }
      }
      v(app + ' : aucune exception', o.exceptions.length === 0, o.exceptions);
      await o.fermer();
    }
  } finally { S.fermer(); }
  console.log('\n' + ok.length + ' ✓  ' + ko.length + ' ✗'); process.exit(ko.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
