// RECONTRÔLE ADVERSE — LES PAGES VOISINES D'UNE AUTRE ORIGINE (17 novembre 2026). Le rapport de l'étape 1 pose : « les pages voisines sont de même origine ; sinon le
// cadre dirait "pas disponible", il ne casse pas ». Cette sonde le JOUE pour de vrai (pas par un mandataire de fenêtre) : l'iframe de la Comptabilité (puis de l'atelier) est
// rechargée sous l'hôte « localhost » au lieu de « 127.0.0.1 » : origine différente, window.parent.claude JETTE réellement (SecurityError), postMessage reste permis.
// Exigé : le geste (FEC, PDF) dit « pas disponible » — jamais un silence, jamais « enregistré » — et aucune erreur non rattrapée.
const P = require('./recontrole-artefact-pose.js'), { bac, lib: L, v } = P;
async function autreOrigine(c, motif) {
  await c.p.evaluate(m => { const i = [...document.querySelectorAll('iframe')].find(x => new RegExp(m).test(x.getAttribute('src') || x.src)); if (i) i.src = i.src.replace('127.0.0.1', 'localhost'); return !!i; }, motif.source);
  const t0 = Date.now(); let f = null; while (Date.now() - t0 < 25000) { f = c.hote.frames().find(x => motif.test(x.url()) && /localhost/.test(x.url())); if (f && await f.evaluate(() => document.readyState === 'complete' && !!document.body && document.body.innerHTML.length > 500).catch(() => false)) break; f = null; await c.hote.waitForTimeout(500); }
  return f; }
(async () => {
  for (const profil of ['mac', 'iphone']) {
    const c = await P.ouvrirHote({ profil, qui: 'marc' }, {});
    await c.p.evaluate(() => { location.hash = 'comptabilite'; }); await L.calme(c.p, 2000);
    let f = await autreOrigine(c, /prototype-comptabilite\.html/);
    const acces = f ? await f.evaluate(() => { try { void window.parent.claude; return 'lisible'; } catch (e) { return e.name; } }) : null;
    v(`${profil} compta : population (le cadre est d'une AUTRE origine : window.parent.claude → ${acces})`, !!f && acces === 'SecurityError', acces);
    if (f) { await f.evaluate(() => aller('fec')); await L.calme(c.p, 600); await f.locator('[data-a="fec-dl"]').first().click(); await c.hote.waitForTimeout(2500);
      const r = await f.evaluate(() => ({ msg: ((document.getElementById('fec-msg') || {}).textContent || '').trim(), toast: ((document.getElementById('toast') || {}).textContent || '').trim(), attente: !!document.querySelector('[data-opc="attente"]') }));
      v(`${profil} compta : le FEC en cadre d'une autre origine DIT « pas disponible » (jamais un silence)`, /pas disponible/.test(r.msg) && !/enregistré/.test(r.toast), r); }
    await L.aller(c.p, 'devis'); await c.p.locator('#contenu [data-opd="devis"]').first().click({ timeout: 5000 }).catch(() => {}); await L.calme(c.p, 2200);
    const g = await autreOrigine(c, /prototype-documents\.html/);
    const acces2 = g ? await g.evaluate(() => { try { void window.parent.claude; return 'lisible'; } catch (e) { return e.name; } }) : null;
    if (!g) console.log(`  · ${profil} atelier d'une autre origine : NON REJOUABLE ici (la page principale garde l'adresse du cadre : il reste sous 127.0.0.1) — lu dans le code : claudeHote() et HOTE sont sous try/catch`);
    else v(`${profil} atelier : population (le cadre est d'une AUTRE origine : ${acces2})`, acces2 === 'SecurityError', acces2);
    if (g) { const ok = await g.evaluate(() => typeof pdfEnregistrer === 'function'); v(`${profil} atelier : population (la fonction existe)`, ok, ''); if (ok) { const r = await g.evaluate(() => pdfEnregistrer(new Blob(['%PDF-1.4\n% essai'], { type: 'application/pdf' }), 'devis-essai.pdf')); const t = await g.evaluate(() => [...document.querySelectorAll('#toasts .toast')].map(x => x.textContent).join(' | '));
      v(`${profil} atelier : le PDF dit « pas disponible » (retour ${r}, « ${t.slice(0, 60)} »)`, r === 'indisponible' && /pas disponible/.test(t), { r, t }); } }
    v(`${profil} aucune erreur JavaScript non rattrapée`, c.err.filter(x => !/Failed to load|ERR_/.test(x)).length === 0, c.err.slice(0, 3));
    await L.fin(c);
  }
  await L.fermer(); const ko = L.bilan(); process.exit(ko ? 1 : 0);
})().catch(async e => { console.log('ERREUR SONDE', e); try { await L.fermer(); } catch (x) {} process.exit(2); });
