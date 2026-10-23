/* Sonde : la signature d'un nouveau message (test-2958), au vrai navigateur, sur le VRAI opcourrier.js (page d'essai, source de démonstration, 127.0.0.1).
   Avant le correctif du 23 octobre 2026 : 2 signatures après un changement de boîte « De », et « Brouillon enregistré » sans rien taper. Après : 1, aucun brouillon.
   Lancer : NODE_PATH=/tmp/pw/node_modules node scratchpad/courrier/sonde-signature-double.js (voir l'en-tête de pilote.js). */
const RAC = require('path').join(__dirname, '..', '..');
const { ouvrir } = require(RAC + '/scratchpad/courrier/pilote.js');
const SR = "document.querySelector('[data-opcourrier]').shadowRoot";
(async () => {
  const P = await ouvrir(); const R = [];
  const ctx = await P.ctxPour({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const p = await ctx.newPage(); const err = []; p.on('pageerror', e => err.push(String(e)));
  await p.goto(P.avec('mode=demo')); await p.waitForTimeout(600);
  const corps = () => p.evaluate(sr => { const t = eval(sr).querySelector('#cBody'); return t ? t.value : null; }, SR);
  const nb = s => (String(s || '').match(/(^|\n)-- \n/g) || []).length;
  const boites = await p.evaluate(sr => [...eval(sr).querySelectorAll('#cFrom option')].map(o => o.value), SR);
  // ouvrir « Nouveau message » par l'API du module si elle existe, sinon par le bouton
  await p.evaluate(sr => { const r = eval(sr); const b = r.querySelector('#btnCompose'); if (b) b.click(); }, SR);
  await p.waitForTimeout(400);
  let v0 = await corps();
  if (v0 === null) { const t = await p.evaluate(sr => [...eval(sr).querySelectorAll('button')].map(b => (b.id || '') + ':' + (b.getAttribute('data-act') || '') + ':' + b.textContent.trim().slice(0, 20)).join(' | '), SR); console.log('bouton composer introuvable :', t.slice(0, 900)); process.exit(3); }
  const opts = await p.evaluate(sr => [...eval(sr).querySelectorAll('#cFrom option')].map(o => o.value + '=' + o.textContent), SR);
  R.push('boîtes : ' + JSON.stringify(opts));
  R.push('à l’ouverture : ' + JSON.stringify(v0) + ' → ' + nb(v0) + ' signature(s)');
  // changer de boîte puis revenir, comme sur l'iPhone
  const vals = await p.evaluate(sr => [...eval(sr).querySelectorAll('#cFrom option')].map(o => o.value), SR);
  for (const v of vals.slice(1).concat(vals[0])) {
    await p.evaluate(([sr, v]) => { const s = eval(sr).querySelector('#cFrom'); s.value = v; s.dispatchEvent(new Event('change', { bubbles: true })); }, [SR, v]);
    await p.waitForTimeout(150);
    const c = await corps(); R.push('après « De » = ' + v + ' : ' + JSON.stringify(c) + ' → ' + nb(c) + ' signature(s)');
  }
  await p.waitForTimeout(1800);
  const saved = await p.evaluate(sr => (eval(sr).querySelector('#cSaved') || {}).textContent || '', SR);
  R.push('sans rien taper, mention de brouillon : ' + JSON.stringify(saved));
  R.push('erreurs JS : ' + err.length + (err.length ? ' ' + err[0] : ''));
  console.log(R.join('\n'));
  await ctx.close(); await P.fermer ? P.fermer() : 0; process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
