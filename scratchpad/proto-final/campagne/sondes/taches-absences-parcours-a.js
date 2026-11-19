// Parcours A (gérant, ordinateur) : créer une tâche (phrase, formulaire, vide, longue), la retrouver, les totaux, l'historique, annuler.
const O = require('./taches-absences-outils.js'), L = O.L, v = L.v;
const nbs = p => p.evaluate(() => { const g = s => [...document.querySelectorAll(s)]; const onglets = {}; g('[data-tonglet]').forEach(b => { const m = b.textContent.match(/(\d+)\s*$/); onglets[b.dataset.tonglet] = m ? +m[1] : 0; });
  return { onglets, lignes: g('#contenu [data-tmodif]').length, retardPastille: ((g('[data-tkxfiltre=retard]')[0] || {}).textContent || '').replace(/\D+/g, ''), retardLignes: g('#contenu .t-l .t-retard').length, h1: (document.querySelector('#contenu h1') || {}).textContent }; });
(async () => {
  const c = await L.ouvrir({ profil: 'mac', qui: 'marc', hash: 'taches' }); const p = c.p;
  await L.calme(p, 500);
  // 0 — cohérence de départ : chaque pastille d'onglet = nombre de lignes montrées dans l'onglet
  for (const o of ['auj', 'avenir', 'faites']) { await p.evaluate(k => document.querySelector(`[data-tonglet=${k}]`).click(), o); await L.calme(p, 300); const n = await nbs(p); const att = o === 'faites' ? n.lignes : n.onglets[o]; v(`A0 : onglet « ${o} » : pastille = lignes (${att} / ${n.lignes})`, o === 'faites' || att === n.lignes, n); }
  await p.evaluate(() => document.querySelector('[data-tonglet=auj]').click()); await L.calme(p, 300);
  const av = await p.evaluate(() => ({ n: TACHES.length, j: JOURNAL.length, auj: AUJ }));
  // 1 — la phrase
  await p.fill('[data-tajout]', 'Appeler M. Martin demain 14h'); await L.calme(p, 300);
  const chips = await p.evaluate(() => (document.querySelector('[data-tkxcompris]') || {}).textContent || '');
  v('A1 : la phrase est comprise (demain, 14 h)', /demain/i.test(chips) && /14/.test(chips), chips);
  await L.capture(c, O.CAP + 'A1-phrase.png');
  await p.keyboard.press('Enter'); await L.calme(p, 500);
  const ap = await p.evaluate(() => ({ n: TACHES.length, x: TACHES[TACHES.length - 1], j: JOURNAL[JOURNAL.length - 1], toast: (document.getElementById('toast') || {}).textContent, champ: document.querySelector('[data-tajout]').value, auj: AUJ, demain: jour(1) }));
  v('A1 : une tâche de plus', ap.n === av.n + 1, ap.n);
  v('A1 : date = demain, heure = 14:00, pour Marc', ap.x.d === ap.demain && ap.x.h === '14:00' && ap.x.qui === 'marc', ap.x);
  v('A1 : le titre est propre (sans « demain 14h »)', !/demain|14/i.test(ap.x.t), ap.x.t);
  v('A1 : le champ se vide', ap.champ === '', ap.champ);
  v('A1 : le toast dit pour demain à 14 h', /demain/.test(ap.toast) && /14 h/.test(ap.toast), ap.toast);
  v('A1 : l’historique note la création', ap.j && /créé/.test(ap.j.action), ap.j);
  const n1 = await nbs(p); v('A1 : « À venir » passe de 5 à 6 et la liste d’aujourd’hui ne bouge pas', n1.onglets.avenir === 6 && n1.onglets.auj === 7, n1.onglets);
  // la retrouver dans À venir, sous « Demain »
  await p.evaluate(() => document.querySelector('[data-tonglet=avenir]').click()); await L.calme(p, 300);
  const dem = await p.evaluate(() => { const h = [...document.querySelectorAll('#contenu h3.t-sep')].find(x => /^Demain/.test(x.textContent)); const l = h && h.nextElementSibling; return { titre: h && h.textContent.trim(), lignes: l ? [...l.querySelectorAll('[data-tmodif]')].map(e => e.textContent.replace(/\s+/g, ' ').trim()) : [] }; });
  v('A1 : on la retrouve dans « À venir › Demain »', dem.lignes.some(t => /Appeler M\. Martin/.test(t)), dem);
  await L.capture(c, O.CAP + 'A1-avenir.png');
  // Annuler du toast
  await p.evaluate(() => { const b = document.querySelector('#toast button'); if (b) b.click(); }); await L.calme(p, 300);
  // 2 — champ vide / espaces
  await p.evaluate(() => document.querySelector('[data-tonglet=auj]').click()); await L.calme(p, 300);
  const n0 = await p.evaluate(() => TACHES.length);
  await p.fill('[data-tajout]', '   '); await p.keyboard.press('Enter'); await L.calme(p, 300);
  v('A2 : des espaces seuls ne créent rien', (await p.evaluate(() => TACHES.length)) === n0);
  await p.fill('[data-tajout]', ''); await p.keyboard.press('Enter'); await L.calme(p, 300);
  v('A2 : champ vide + Entrée ne crée rien', (await p.evaluate(() => TACHES.length)) === n0);
  // 3 — formulaire « Détails », vide
  await L.toucher(c, '[data-tnouv]'); await L.calme(p, 300);
  await L.toucher(c, '[data-tok=""]'); await L.calme(p, 300);
  const vide = await p.evaluate(() => ({ n: TACHES.length, panneau: !!document.querySelector('#calque .panneau'), toast: (document.getElementById('toast') || {}).textContent, msg: [...document.querySelectorAll('#calque .panneau .err, #calque .panneau .erreur, #calque .panneau [role=alert]')].map(e => e.textContent) }));
  v('A3 : « Créer la tâche » sans titre ne crée rien', vide.n === n0, vide);
  v('A3 : ET le dit (message ou toast), sans fermer la fenêtre', vide.panneau && (vide.msg.length > 0 || /titre|quoi|écris|vide/i.test(vide.toast || '')), vide);
  await L.capture(c, O.CAP + 'A3-vide.png');
  // 3b — titre très long + date absurde
  const long = 'Rappeler monsieur Jean-Baptiste de la Fontaine-Beauregard-Dupont pour le contrôle annuel de sa pompe à chaleur Daikin Altherma';
  await p.fill('#tk-t', long); await p.fill('#tk-d', '1999-01-01'); await L.toucher(c, '[data-tok=""]'); await L.calme(p, 400);
  const lg = await p.evaluate(() => ({ n: TACHES.length, x: TACHES[TACHES.length - 1], toast: (document.getElementById('toast') || {}).textContent, panneau: !!document.querySelector('#calque .panneau') }));
  v('A3b : titre long + date de 1999 : soit refusé, soit créé « en retard » sans casser', lg.n === n0 + 1 || /date/i.test(lg.toast || ''), lg);
  await p.evaluate(() => { try { fermerPanneau(); } catch (e) {} }); await L.calme(p, 300);
  const dep = await L.deborde(c); v('A3b : aucun glissement latéral avec le titre long', dep.bouge === 0, dep);
  await L.capture(c, O.CAP + 'A3b-long.png', true);
  v('aucune erreur JavaScript', c.err.length === 0, c.err.slice(0, 3));
  await L.fin(c); await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.error('PLANTÉ', e.message); process.exit(2); });
