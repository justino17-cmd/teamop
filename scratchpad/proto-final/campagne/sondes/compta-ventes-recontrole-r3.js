// Recontrôle adverse « compta-ventes », R3 (17 novembre 2026) : Julie (secrétariat), AU TÉLÉPHONE, du dossier d'une intervention terminée à la facture
// envoyée, puis le même document vu dans le cadre plein écran. Gestes réels (barre du bas, tuiles, boutons), captures à regarder, cibles au doigt.
// usage : node compta-ventes-recontrole-r3.js [profil] [qui] [jour|nuit]
const X = require('./compta-ventes-outils.js'), L = X.L;
const cts = n => Math.round(n * 100);
(async () => {
  const profil = process.argv[2] || 'iphone', qui = process.argv[3] || 'julie', nuit = process.argv[4] === 'nuit', tag = `${profil}-${qui}-${nuit ? 'nuit' : 'jour'}`;
  const c = await L.ouvrir({ profil, qui, nuit }), p = c.p;
  const du0 = await X.du(p), d0 = await X.donnees(p);
  const afact = await p.evaluate(() => cxDossiers().filter(x => x.st === 'afacturer').map(x => ({ id: x.id, titre: x.titre })));
  L.v('population : des interventions terminées à facturer', afact.length >= 1, afact);
  // le chemin d'une personne : onglet Comptabilité → cadre → « Factures et paiements »
  let f = await X.cadreOuvert(c); L.v('l’onglet Comptabilité ouvre le cadre', !!f);
  await L.capture(c, X.CAP + `r3-${tag}-cadre.png`);
  const bFact = p.locator('#cpsys .cpsys-barre button', { hasText: 'Factures et paiements' }).first();
  await L.toucher(c, bFact); await L.calme(p, 700);
  L.v('« Factures et paiements » mène aux factures d’OP GESTION', await p.evaluate(() => route === 'comptabilite' && !document.querySelector('#cpsys.ouvert')), await p.evaluate(() => route));
  await X.compta(c, 'dossiers'); await L.capture(c, X.CAP + `r3-${tag}-dossiers.png`);
  const a = afact[0]; await p.evaluate(i => { const b = document.querySelector('[data-cx="dossier|' + i + '"]'); if (b) b.click(); }, a.id); await L.calme(p, 500);
  await L.capture(c, X.CAP + `r3-${tag}-dossier.png`);
  const dz = await L.doigts(p, '#calque .panneau'); console.log('  cibles du dossier :', JSON.stringify(dz).slice(0, 300));
  await L.toucher(c, '#calque [data-cx^="dosfac|"]'); await p.waitForTimeout(600);
  const fid = await p.evaluate(() => param); L.v('la fiche de la facture préparée s’ouvre', !!fid && await p.evaluate(() => route === 'facture'), fid);
  await L.capture(c, X.CAP + `r3-${tag}-fiche.png`);
  const dz2 = await L.doigts(p, '#contenu'); console.log('  cibles de la fiche :', JSON.stringify(dz2).slice(0, 400));
  const dep = await L.deborde(c); console.log('  débordement fiche :', JSON.stringify(dep).slice(0, 200));
  const info = await p.evaluate(id => { const F = FACTURES.find(x => x.id === id); return { st: F.st, tva: F.tva, n: lignesDe(F).length, sansPrix: lignesDe(F).filter(l => l.pu == null).length, cli: F.cli, type: CLIENTS[F.cli].type }; }, fid);
  console.log('  facture préparée :', JSON.stringify(info));
  if (info.sansPrix) { const champs = p.locator('#contenu input[data-prix].manque'); const n = await champs.count(); for (let i = 0; i < n; i++) { await p.locator('#contenu input[data-prix].manque').first().fill('12,5'); await p.locator('#contenu input[data-prix]').first().press('Tab').catch(() => {}); await L.calme(p, 250); } }
  const actif = await p.evaluate(() => { const b = document.querySelector('[data-action="apercuEnvoi"]'); return b && !b.disabled; });
  L.v('« Aperçu et envoi » est actif quand toutes les lignes ont un nom et un prix', !!actif, await X.texte(p, '#contenu').then(t => t.slice(0, 150)));
  await L.toucher(c, '[data-action="apercuEnvoi"]'); await L.capture(c, X.CAP + `r3-${tag}-apercu.png`);
  await L.toucher(c, '#calque [data-action="envoyer"]'); await L.calme(p, 600);
  const env = await p.evaluate(id => { const F = FACTURES.find(x => x.id === id); return { st: F.st, num: F.num, ttc: Math.round(ttcDe(F) * 100) }; }, fid);
  console.log('  envoi :', JSON.stringify(env), await X.toasts(p));
  L.v('la facture est partie avec un numéro définitif', env.st === 'envoyee' || env.st === 'payee' || env.st === 'partielle', env);
  // PDF depuis le cadre
  f = await X.cadreOuvert(c); await f.evaluate(() => aller('ventes')); await p.waitForTimeout(900);
  const cad = await f.evaluate(n => { const r = document.querySelector(`#contenu tr[data-fac="${n}"], #contenu [data-fac="${n}"]`); return r ? r.innerText.replace(/\s+/g, ' ') : null; }, env.num);
  L.v('le cadre liste la facture neuve', !!cad, cad);
  await L.capture(c, X.CAP + `r3-${tag}-cadre-ventes.png`);
  if (cad) { await f.evaluate(n => document.querySelector(`#contenu [data-fac="${n}"]`).click(), env.num); await p.waitForTimeout(600);
    await f.evaluate(() => { const b = document.querySelector('[data-cmpt="pdf"]'); if (b) b.click(); }); await p.waitForTimeout(600);
    const pdf = await p.evaluate(() => { const e = document.querySelector('#calque .panneau'); return e ? e.innerText.replace(/\s+/g, ' ').trim() : ''; });
    L.v('le PDF du cadre est le même document : SIRET, IBAN, numéro, pas de phrase de démonstration', /SIRET/.test(pdf) && /FR76/.test(pdf) && pdf.includes(env.num) && !/démonstration/i.test(pdf), pdf.slice(0, 200));
    await L.capture(c, X.CAP + `r3-${tag}-cadre-pdf.png`); }
  L.v('aucune erreur de page', c.err.length === 0, c.err.slice(0, 3));
  await L.fin(c); await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.log('ÉCHEC DE LA SONDE', e.message); process.exit(2); });
