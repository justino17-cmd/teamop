// Tour 6, RECONTRÔLE ADVERSE de ce que les correctifs du tour 6 ont pu casser : Terminer refusé (toutes les portes, la marque data-refuse),
// le vidage (seuls les champs touchés s'écrivent), la lecture des séparateurs (1.200,5 / 1.234.567 / 1.5 / 1.200 …). Frappe RÉELLE, touche par touche.
// usage : node interventions-restes-tour6-recontrole.js <profil> [nuit] → « N ✓ · M ✗ », code 1 si un contrôle tombe
const I = require('./interventions-outils.js'), L = I.L;
(async () => {
  const profil = process.argv[2] || 'mac', nuit = process.argv[3] === 'nuit', tel = ['iphone', 'android', 'petit'].includes(profil);
  const c = await L.ouvrir({ profil, qui: 'sm', nuit }); const p = c.p, v = L.v;
  const sel = n => `[data-releve="${n}"]`, S = sel('Soufflage');
  const lire = (n, id) => p.evaluate(([s, i]) => { const e = document.querySelector(s); const F = fiche(i || (e && e.dataset.id)); return e ? { champ: e.value, mem: (F.releves || {})[e.dataset.releve], refuse: e.dataset.refuse || null, toast: (document.getElementById('toast') || {}).textContent || '' } : null; }, [sel(n), id]);
  const poser = async (n, av) => { await p.evaluate(([s, a]) => { const e = document.querySelector(s); e.value = a; e.dispatchEvent(new Event('change', { bubbles: true })); const T = document.getElementById('toast'); if (T) T.textContent = ''; }, [sel(n), av]); };
  const frappe = async (n, t, sortie = 'Tab') => { await p.locator(sel(n)).scrollIntoViewIfNeeded(); await p.locator(sel(n)).click({ clickCount: 3 }); await p.keyboard.press('Delete'); if (t) await p.keyboard.type(t, { delay: 12 }); if (sortie) await p.keyboard.press(sortie); await L.calme(p, 150); return lire(n); };
  const vide = () => p.evaluate(() => { const T = document.getElementById('toast'); if (T) T.textContent = ''; });
  const complete = id => p.evaluate(i => { const F = fiche(i); tousControles(F).forEach(k => F.coches[k] = true); F.signature = 'data:image/png;base64,iVBORw0KGgo='; F.absent = false; F.compte = F.compte || 'Fait.'; F.etat = 'encours'; (INTS.find(o => o.id === i) || {}).st = 'planifiee'; }, id);
  const etat = id => p.evaluate(i => ({ etat: fiche(i).etat, st: (INTS.find(o => o.id === i) || {}).st, env: !!fiche(i).envoye, fact: FACTURES.filter(f => f.int === i).length, rel: JSON.stringify(fiche(i).releves) }), id);
  const clic = async sl => { const b = p.locator(sl).first(); await b.scrollIntoViewIfNeeded(); await b.click({ force: true }); await L.calme(p, 500); };
  await p.evaluate(() => { fiche('i1').metier = 'clim'; }); await I.devenir(c, 'sm', 'inter-x-i1');
  // ---------- (3) lecture des séparateurs, frappe réelle ----------
  v('population : Soufflage présent', (await p.locator(S).count()) === 1, 0);
  const LEC = [['1.200,5', '1200,5'], ['1.234.567', '1234567'], ['12.5', '12.5'], ['1.5', '1.5'], ['0.5', '0.5'], ['1,5', '1,5'], ['1.000.000,25', '1000000,25'], ['-1.200,5', '-1200,5'], ['1 200,5', '1200,5'], ['12,50', '12,50']];
  const DOUTE = ['1.200', '1.050', '2.500']; for (const t of DOUTE) { await poser('Soufflage', '14'); const r = await frappe('Soufflage', t); console.log(`  · DOUTE « ${t} » → champ « ${r.champ} », fiche « ${r.mem} » (ambigu : mille ou virgule, enregistré tel quel, sans phrase)`); v(`« ${t} » : ni refusé ni réécrit en un autre nombre (population : valeur gardée telle quelle)`, r.mem === t, r); } await poser('Soufflage', '14');
  const REF = ['1,2,3', '1.2.3', '1.200.5', '1,234.5', '1.2,3', '12,5,5'];
  await poser('Soufflage', '14');
  for (const [t, att] of LEC) { const r = await frappe('Soufflage', t); v(`lecture « ${t} »`, r.champ === att && r.mem === att, { r, att }); console.log(`  · info « ${t} » → champ « ${r.champ} », fiche « ${r.mem} », phrase « ${r.toast} »`); await poser('Soufflage', '14'); }
  for (const t of REF) { const r = await frappe('Soufflage', t); v(`refus « ${t} » (ou lu sans mentir) `, (r.champ === '14' && r.mem === '14') || /^\d+(,\d+)?$/.test(r.mem || ''), r); console.log(`  · info « ${t} » → champ « ${r.champ} », fiche « ${r.mem} », phrase « ${r.toast} »`); await poser('Soufflage', '14'); }
  // ---------- (2) le vidage ----------
  // un clic sur n'importe quel bouton : aucun relevé vide sur aucune fiche de tout métier
  for (const m of ['clim', 'nett', 'nuis', 'plomb']) {
    await p.evaluate(m2 => { const F = fiche('i1'); F.metier = m2; delete F.releves; }, m); await I.devenir(c, 'sm', 'inter-x-i1');
    const nb = await p.locator('input[data-releve]').count();
    const btns = await p.evaluate(() => [...document.querySelectorAll('#contenu [data-action]')].map(b => b.dataset.action).filter(a => a !== 'terminer').slice(0, 6));
    for (const a of btns) { const b = p.locator(`#contenu [data-action="${a}"]`).first(); if (await b.count()) { await b.click({ force: true, timeout: 3000 }).catch(() => {}); await L.calme(p, 200); await p.keyboard.press('Escape'); await p.evaluate(() => { try { fermerPanneau(); } catch (e) {} }); } }
    const rl = await p.evaluate(() => fiche('i1').releves); v(`population ${m} : ${nb} champs, ${btns.length} boutons cliqués ; aucun relevé créé par un simple clic`, nb >= 2 && btns.length >= 2 && rl === undefined, { nb, btns, rl });
  }
  await p.evaluate(() => { const F = fiche('i1'); F.metier = 'clim'; delete F.releves; }); await I.devenir(c, 'sm', 'inter-x-i1');
  // saisie réelle sur un champ jamais rempli : s'écrit ; un seul champ touché => un seul champ écrit
  let r = await frappe('Soufflage', '13'); const un = await p.evaluate(() => fiche('i1').releves); v('une saisie sur UN champ n\'écrit que celui-là', JSON.stringify(un) === '{"Soufflage":"13"}', un);
  // effacer un champ déjà rempli : s'écrit (vide)
  r = await frappe('Soufflage', ''); v('effacer un champ déjà rempli s\'écrit (vide, pas l\'ancienne valeur)', r.mem === '' && r.champ === '', r);
  // retaper la même valeur : pas de bruit, valeur gardée
  await poser('Soufflage', '13'); r = await frappe('Soufflage', '13'); v('retaper la même valeur : inchangée', r.mem === '13', r);
  // champ libre (nuis) : effacer s'écrit aussi
  await p.evaluate(() => { fiche('i1').metier = 'nuis'; fiche('i1').releves = { Infestation: 'forte' }; }); await I.devenir(c, 'sm', 'inter-x-i1');
  r = await frappe('Infestation', ''); v('champ libre : effacé = écrit vide', r.mem === '', r);
  r = await frappe('Infestation', 'faible'); v('champ libre : ressaisi', r.mem === 'faible', r);
  // ---------- (1) Terminer refusé ----------
  await p.evaluate(() => { const F = fiche('i1'); F.metier = 'clim'; F.releves = { Soufflage: '14' }; }); await complete('i1'); await I.devenir(c, 'sm', 'inter-x-i1');
  const man = await p.evaluate(() => manque(fiche('i1'))); v('population : fiche i1 complète', man.length === 0, man);
  const refus = async (t = '10-12') => { await poser('Soufflage', '14'); return frappe('Soufflage', t); };
  // 1a. refus puis vrai clic Terminer
  r = await refus(); v('refus posé : champ 14, marque présente', r.champ === '14' && r.refuse, r);
  await vide(); await clic('[data-action="terminer"]'); let e = await etat('i1');
  v('1a Terminer après refus : ne termine pas, rien ne part (pas de facture, pas envoyé)', e.etat !== 'bureau' && e.st !== 'fait' && !e.env, e);
  r = await lire('Soufflage'); v('1a la phrase est visible', /Un seul nombre/.test(r.toast), r.toast);
  await L.capture(c, I.CAP + `tour6-recontrole-terminer-refuse-${profil}${nuit ? '-nuit' : ''}.png`);
  // 1b. la marque s'efface quand on retape (une touche), puis Terminer termine
  r = await refus(); await p.locator(S).click(); await p.keyboard.press('End'); await p.keyboard.type('5', { delay: 12 }); r = await lire('Soufflage');
  v('1b marque effacée dès qu\'on retape', !r.refuse, r);
  await frappe('Soufflage', '15'); await vide(); await clic('[data-action="terminer"]'); e = await etat('i1');
  v('1b refus, correction « 15 », Terminer : la fiche se termine avec 15', e.etat === 'bureau' && /15/.test(e.rel), e);
  // 1c. refus -> clic sur un AUTRE bouton -> Terminer (la marque a-t-elle été consommée par l'autre clic ?)
  await complete('i1'); await p.evaluate(() => { fiche('i1').releves = { Soufflage: '14' }; }); await I.devenir(c, 'sm', 'inter-x-i1');
  await refus(); const autre = await p.evaluate(() => [...document.querySelectorAll('#contenu [data-action]')].map(b => b.dataset.action).find(a => a !== 'terminer'));
  await p.locator(`#contenu [data-action="${autre}"]`).first().click({ force: true }).catch(() => {}); await L.calme(p, 300); await p.keyboard.press('Escape'); await p.evaluate(() => { try { fermerPanneau(); } catch (x) {} });
  const m1 = (await lire('Soufflage')) || {}; await vide(); await clic('[data-action="terminer"]'); e = await etat('i1');
  console.log(`  · info 1c refus, clic « ${autre} », puis Terminer : état ${e.etat}, champ « ${m1.champ} », marque ${m1.refuse}`);
  v('1c refus puis autre bouton puis Terminer : la fiche ne part pas avec un relevé que le technicien croit refusé SANS qu\'il l\'ait revu (DOUTE si elle part)', e.etat !== 'bureau', e);
  // 1d. refus sur i1, puis Terminer sur une AUTRE fiche
  await complete('i1'); await p.evaluate(() => { fiche('i1').releves = { Soufflage: '14' }; }); await I.devenir(c, 'sm', 'inter-x-i1'); await refus();
  const autreId = await p.evaluate(() => { const o = INTS.find(i => i.id !== 'i1' && i.st !== 'fait' && i.st !== 'annulee' && !/^h/.test(i.id) && (i.tech === 'sm' || true)); return o && o.id; });
  await p.evaluate(i => { fiche(i).metier = 'clim'; }, autreId); await complete(autreId); await I.devenir(c, 'sm', 'inter-x-' + autreId);
  const marques = await p.evaluate(() => document.querySelectorAll('input[data-releve][data-refuse]').length);
  v(`1d population : fiche ${autreId} ouverte, aucune marque de refus ne la suit`, marques === 0, marques);
  await clic('[data-action="terminer"]'); e = await etat(autreId); v(`1d Terminer sur une autre fiche (${autreId}) : se termine`, e.etat === 'bureau', e);
  const e1 = await etat('i1'); v('1d la fiche i1 (refusée) n\'a pas bougé', e1.etat !== 'bureau', e1);
  // 1e. portes directes avec relevé refusé dans le DOM
  await I.devenir(c, 'sm', 'inter-x-i1'); await complete('i1'); await p.evaluate(() => { fiche('i1').releves = { Soufflage: '14' }; }); await I.devenir(c, 'sm', 'inter-x-i1');
  const d1 = await p.evaluate(() => { const e = document.querySelector('input[data-releve="Soufflage"]'); e.value = '10-12'; ACTIONS.terminer({ dataset: { id: 'i1' } }); return { etat: fiche('i1').etat, st: INTS.find(o => o.id === 'i1').st }; }); v('1e ACTIONS.terminer direct, relevé refusé', d1.etat !== 'bureau', d1);
  const d2 = await p.evaluate(() => { const e = document.querySelector('input[data-releve="Soufflage"]'); e.value = '10-12'; const f = (typeof rlAction === 'function') ? 'rlAction' : null; return { f }; }); console.log('  · info porte visitefin :', JSON.stringify(d2));
  // 1f. menu de statut du planning : « Marquer terminée » (ne touche pas la fiche : on le DIT)
  const menu = await p.evaluate(() => typeof pmMenuStatut !== 'undefined');
  console.log('  · info menu de statut : fonction dédiée', menu, ' (aucun champ relevé dans le planning : pas de porte à garder)');
  // 1g. rôles marc / julie : même règle
  for (const qui of ['marc', 'julie']) { await I.devenir(c, qui, 'inter-x-i1'); const n = await p.locator(S).count();
    if (!n) { console.log(`  · NOTE ${qui} : pas de champ relevé sur cette fiche`); continue; }
    await complete('i1'); await p.evaluate(() => { fiche('i1').releves = { Soufflage: '14' }; }); await I.devenir(c, qui, 'inter-x-i1'); await refus(); await vide(); await clic('[data-action="terminer"]'); e = await etat('i1');
    v(`1g rôle ${qui} : Terminer après refus ne termine pas`, e.etat !== 'bureau', e);
    await frappe('Soufflage', '1.200,5'); await clic('[data-action="terminer"]'); e = await etat('i1'); v(`1g rôle ${qui} : corrigé (1.200,5) puis Terminer termine`, e.etat === 'bureau' && /1200,5/.test(e.rel), e); }
  const er = I.erreurs(c); v('aucune erreur de page', er.length === 0, er);
  const ko = L.bilan(); await L.fin(c); await L.fermer(); process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
