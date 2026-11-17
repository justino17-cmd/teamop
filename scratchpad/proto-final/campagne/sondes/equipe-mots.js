// ÉQUIPE et MON ENTREPRISE : les MOTS. On relève tout le texte lisible de chaque écran et de chaque fenêtre (comme le gérant, mode application), puis :
// 1. aucun reste d'échafaudage (« Prototype », « pour l'essai », « Dans ce prototype », « démo », « lorem », « TODO », « undefined », « NaN », « [object ») ;
// 2. aucun mot anglais ou technique que le gérant ne dit pas (login, reset, token, ID, admin en minuscules, « email » sans trait d'union…) ;
// 3. aucune phrase de plus de 35 mots (un artisan de 55 ans la relit deux fois) — les phrases trouvées sont LISTÉES, pas jugées : on les lit ensuite ;
// 4. aucun écran sans consigne : un écran vide dit quoi faire. Les textes sont écrits dans /tmp (hors dépôt). ⛔ 127.0.0.1 seulement.   usage : node equipe-mots.js [mac]
const E = require('./equipe-outils.js'); const { L, v } = E; const fs = require('fs');
const PROFIL = process.argv[2] || 'mac';
const ECHAFAUDAGE = /prototype|pour l.essai|dans cette démo|\bdémo\b|lorem|\btodo\b|undefined|\bnull\b|\bNaN\b|\[object|\bfoo\b|test test/i;
const TECHNIQUE = /\b(login|logout|reset|token|payload|callback|timeout|admin(?!istrat)|emails?\b|\bID\b|URL|API|JSON|cookie|bug|debug|offline|online)\b/;
(async () => {
  const c = await E.marc(PROFIL); const p = c.p; const T = {};
  const lire = async (nom, zone) => { const t = await p.evaluate(z => { const q = document.querySelector(z || '#contenu'); return q ? q.innerText.replace(/[  ]/g, ' ') : ''; }, zone); T[nom] = t; return t; };   // les retours à la ligne sont gardés : une phrase finit à la ligne ou au point
  await L.aller(p, 'equipe'); await lire('equipe-liste');
  for (const f of ['terrain', 'bureau', 'invites', 'off', 'droits']) { await L.toucher(c, `[data-eq="filtre|${f}"]`); await lire('equipe-filtre-' + f); }
  await L.toucher(c, '[data-eq="filtre|tous"]');
  for (const k of ['marc', 'julie', 'sm', 'kb', 'lr']) { await E.fiche(c, k); await p.evaluate(() => { const d = document.querySelector('#calque details.eqx-det'); if (d) d.open = true; }); await lire('fiche-' + k, '#calque'); await E.ranger(c); }
  await E.fiche(c, 'julie'); await L.toucher(c, '[data-eqx="modifier|julie"]'); await lire('fiche-modifier', '#calque'); await E.ranger(c);
  for (const [nom, sel] of [['inviter', '[data-eq="inviter"]'], ['regles', '[data-eqx="regles"]'], ['formation', '[data-eqx^="formation"]']]) { await L.aller(p, 'equipe'); await L.toucher(c, sel); await lire('equipe-' + nom, '#calque'); await E.ranger(c); }
  await E.fiche(c, 'kb'); await L.toucher(c, '[data-eq="habajout|kb"]'); await lire('habilitation-ajout', '#calque'); await E.ranger(c);
  await E.fiche(c, 'kb'); const j = await p.evaluate(() => eqDe('kb').habil.findIndex(h => /électrique/i.test(h[0]))); await L.toucher(c, `[data-eq="renouv|kb|${j}"]`); await lire('habilitation-renouveler', '#calque'); await E.ranger(c);
  await E.fiche(c, 'lr'); await L.toucher(c, '[data-eq="actif|lr"]'); await lire('desactiver', '#calque'); await E.ranger(c);
  await E.fiche(c, 'julie'); await L.toucher(c, '[data-cnx="repose|julie"]'); await lire('mot-de-passe-provisoire', '#calque'); await E.ranger(c);
  await E.fiche(c, 'julie'); await L.toucher(c, '[data-sec2="telephone|julie"]'); await lire('nouveau-telephone', '#calque'); await E.ranger(c);
  await E.fiche(c, 'julie'); await L.toucher(c, '[data-sec2="deconnecter|julie"]'); await lire('deconnecter', '#calque'); await E.ranger(c);
  await E.fiche(c, 'julie'); await p.selectOption('#calque select[data-eqprof="julie"]', 'resp'); await L.calme(p, 400); await lire('profil-confirmation', '#calque'); await E.ranger(c);
  await L.aller(p, 'entreprise'); await lire('entreprise');
  for (const k of ['ident', 'legal', 'logo', 'banque', 'horaires']) { await L.aller(p, 'entreprise'); await L.toucher(c, `[data-ent="carte|${k}"]`); await lire('entreprise-' + k, '#calque'); await E.ranger(c); }
  for (const k of ['rdv', 'stock', 'metiers']) { await L.aller(p, 'entreprise'); await L.toucher(c, `[data-ent="lien|${k}"]`); await L.calme(p, 600); await lire('entreprise-lien-' + k, '#calque'); await E.ranger(c); }
  const noms = Object.keys(T); v(`population : ${noms.length} écrans et fenêtres relevés`, noms.length >= 30 && noms.every(n => T[n].length > 40), noms.filter(n => T[n].length <= 40));
  const long = [];
  for (const [n, t] of Object.entries(T)) {
    const e = (t.match(ECHAFAUDAGE) || [])[0]; v(`${n} : aucun reste d’échafaudage`, !e, e);
    const q = (t.match(TECHNIQUE) || [])[0]; v(`${n} : aucun mot technique ou anglais`, !q, q);
    t.split(/\n+|(?<=[.!?…])\s+|\s·\s/).forEach(s => { const m = s.trim().split(/\s+/).length; if (m > 35) long.push(n + ' (' + m + ' mots) : ' + s.trim().slice(0, 140)); });
  }
  v('equipe-20 aucune phrase de plus de 35 mots (liste en détail)', long.length === 0, long.slice(0, 6));
  fs.writeFileSync('/tmp/equipe-mots-' + PROFIL + '.json', JSON.stringify(T, null, 1));
  v('aucune erreur de page', c.err.length === 0, c.err.slice(0, 3));
  await L.fin(c); await E.fin();
})().catch(e => { console.error('ÉCHEC DE LA SONDE', e); process.exit(2); });
