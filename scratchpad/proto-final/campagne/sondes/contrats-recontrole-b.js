// RECONTRÔLE ADVERSE des contrats, parcours R2 : les deux modes « par an » et « par mois », un client qui a DEUX contrats signés, puis les
// dates de fin limites (fin dépassée, fin dans 20 jours, fin absente) dans la liste, la fiche, Statistiques et Tâches. Tout se lit sur l'écran.
// usage : node contrats-recontrole-b.js [profil] [nuit]  → « N ✓ · M ✗ », code 1 si un contrôle tombe
const O = require('./contrats-outils.js'), L = O.L, v = L.v;
const txt = (p, z) => p.evaluate(z => ((document.querySelector(z || '#contenu') || {}).textContent || '').replace(/\s+/g, ' ').trim(), z);
(async () => {
  const profil = process.argv[2] || 'mac', nuit = process.argv[3] === 'nuit', tag = profil + (nuit ? '-nuit' : '-jour');
  const CAP = O.CAP.replace('campagne-contrats', 'recontrole-contrats');
  const c = await L.ouvrir({ profil, qui: 'marc', hash: 'contrats', nuit }); const p = c.p; await L.calme(p, 400);
  const nErr = () => c.err.length; let e0 = nErr();
  async function signer(k) { await L.aller(p, 'signer-x-' + k.id); await p.check('#lu'); await p.evaluate(() => document.getElementById('signe-ctr').scrollIntoView({ block: 'center' })); await L.calme(p, 250); const bb = await p.locator('#signe-ctr').boundingBox();
    await p.mouse.move(bb.x + bb.width * .2, bb.y + bb.height * .6); await p.mouse.down(); await p.mouse.move(bb.x + bb.width * .5, bb.y + bb.height * .3, { steps: 6 }); await p.mouse.move(bb.x + bb.width * .8, bb.y + bb.height * .6, { steps: 6 }); await p.mouse.up();
    await L.toucher(c, '[data-action="signerContrat"]'); await L.calme(p, 600); }
  async function terminer(id) { await L.aller(p, 'inter-x-' + id);
    await p.evaluate(id => { const i = INTS.find(o => o.id === id); if (!i.tech) { i.tech = 'tl'; i.st = 'planifiee'; } const F = fiche(id); tousControles(F).forEach(k => { F.coches[k] = true; }); F.signature = 'signee'; F.compte = 'Fait.'; rendre(); }, id); await L.calme(p, 400);
    if (!(await p.locator('[data-action="terminer"]').count())) return false; await L.toucher(c, '[data-action="terminer"]', { delai: 3000 }); await L.calme(p, 700);
    if ((await L.etat(p)).panneau) { const b = p.getByRole('button', { name: /C’est bon|Terminer|Oui/ }).first(); if (await b.count()) await L.toucher(c, b); await L.calme(p, 500); } return true; }
  async function creer(o) { await L.aller(p, 'contrat-nouveau'); await p.selectOption('[data-b="modele"]', o.modele || 'chauffage'); await L.calme(p, 250);
    await p.selectOption('[data-b="cli"]', o.cli); await p.selectOption('[data-b="freq"]', String(o.freq)); await p.selectOption('[data-b="fact"]', o.fact); await p.fill('[data-b="prix"]', String(o.prix)); await p.fill('[data-b="lieu"]', o.lieu || 'Site test');
    await L.toucher(c, '[data-action="creerContrat"]'); await L.calme(p, 600); return p.evaluate(() => { const k = CONTRATS[CONTRATS.length - 1]; return { id: k.id, num: k.num }; }); }

  // ── « par an » : la facture de l'année est la SEULE
  const a = await creer({ cli: 'cm', freq: 2, fact: 'an', prix: 1200 }); await signer(a);
  const fa = await p.evaluate(() => FACTURES.filter(f => /^fc-/.test(f.id)).map(f => ({ id: f.id, ttc: Math.round(ttcDe(f) * 100), ht: Math.round(htDe(f) * 100), tva: f.tva, cli: f.cli })));
  v('R2-1 « par an » : une facture de l\'année à 1 200 € HT préparée à la signature', fa.some(f => f.id === 'fc-' + a.id && f.ht === 120000), fa);
  await L.aller(p, 'contrat-x-' + a.id); let t = await txt(p); await L.capture(c, CAP + `R2-an-fiche-${tag}.png`);
  v('R2-2 la fiche « par an » dit 1 200 € par an et ne promet pas de facture à chaque visite', /1\s?200,00 € HT/.test(t) && !/facture de chaque visite se prépare/i.test(t), (t.match(/Facturation.{0,260}/) || [''])[0]);
  const vis = await p.evaluate(id => INTS.filter(i => i.ctr === id).map(i => i.id), a.id);
  const nF0 = await p.evaluate(() => FACTURES.length); await terminer(vis[0]); const nF1 = await p.evaluate(() => FACTURES.length);
  v('R2-3 « par an » : terminer une visite ne crée aucune facture', nF1 === nF0, [nF0, nF1]);
  await L.aller(p, 'inter-x-' + vis[0]); t = await txt(p); await L.capture(c, CAP + `R2-an-visite-${tag}.png`);
  v('R2-4 la fiche de la visite dit « comprise dans le contrat » et ne parle pas de paiement à faire', /comprise dans le contrat/i.test(t) && !/Préparer la facture|la facture lui sera envoyée|Paiement sur place/.test(t), (t.match(/.{0,50}(comprise|facture|Paiement).{0,80}/gi) || []).slice(0, 4));
  await L.aller(p, 'compta'); t = await txt(p); v('R2-5 Comptabilité s\'ouvre sans erreur et la visite comprise n\'y est pas à facturer', c.err.length === e0, c.err.slice(e0));
  await L.aller(p, 'factures'); t = await txt(p);
  v('R2-6 la liste Factures ne porte qu\'UNE facture pour ce contrat', (await p.evaluate(id => FACTURES.filter(f => f.cli === 'cm' && (f.id === 'fc-' + id || (f.int && INTS.find(i => i.id === f.int && i.ctr === id)))).length, a.id)) === 1);

  // ── « par mois »
  const m = await creer({ cli: 'hp', freq: 4, fact: 'mois', prix: 2400 }); await signer(m);
  await L.aller(p, 'contrat-x-' + m.id); t = await txt(p); await L.capture(c, CAP + `R2-mois-fiche-${tag}.png`);
  v('R2-7 la fiche « par mois » dit 200,00 € par mois (2 400 ÷ 12)', /200,00 € HT/.test(t) && /mois/i.test(t), (t.match(/Facturation.{0,260}/) || [''])[0]);
  const visM = await p.evaluate(id => INTS.filter(i => i.ctr === id).map(i => i.id), m.id);
  const nF2 = await p.evaluate(() => FACTURES.length); await terminer(visM[0]); v('R2-8 « par mois » : une visite terminée ne crée aucune facture', (await p.evaluate(() => FACTURES.length)) === nF2);
  await L.aller(p, 'contrats'); t = await txt(p);
  v('R2-9 la liste montre « 1 / 4 faites » pour le contrat mensuel', /1 \/ 4 faites/.test(t), (t.match(/.{0,50}\/ 4 faites/g) || []).join(' ¦ '));

  // ── un client, DEUX contrats signés : chaque visite se facture au prix de SON contrat
  const b = await creer({ cli: 'cm', freq: 2, fact: 'visite', prix: 800, lieu: 'Climatisation du cabinet' }); await signer(b);
  const visB = await p.evaluate(id => INTS.filter(i => i.ctr === id).map(i => i.id), b.id); await terminer(visB[0]);
  const fb = await p.evaluate(id => { const f = FACTURES.find(x => x.int === id); return f && { lignes: f.lignes.map(l => [l.d, l.pu]) }; }, visB[0]);
  v('R2-10 deux contrats pour le même client : la visite du second se facture à 400 € (800 ÷ 2), avec SON numéro', !!fb && fb.lignes[0][1] === 400 && fb.lignes[0][0].includes(b.num), fb);
  await L.aller(p, 'contrat-x-' + a.id); t = await txt(p); v('R2-11 la fiche du premier contrat compte toujours ses propres visites (« 1 sur 2 faites », pas 2)', /1 sur 2 faites/i.test(t), (t.match(/.{0,40}faites.{0,20}/) || [''])[0]);

  // ── dates de fin limites
  await p.evaluate(() => { const k = CONTRATS.find(x => x.id === 'c1'); k.fin = '15/10/2026'; const k2 = CONTRATS.find(x => x.id === 'c2'); if (k2) k2.fin = '20/11/2026'; });
  e0 = nErr();
  await L.aller(p, 'contrats'); t = await txt(p); await L.capture(c, CAP + `R2-liste-fin-${tag}.png`);
  v('R2-12 contrat à fin dépassée : la liste ne plante pas et ne parle pas d\'un nombre de jours négatif', c.err.length === e0 && !/-\d+ ?j\b|dans -\d+/.test(t), c.err.slice(e0));
  await L.aller(p, 'contrat-x-c1'); t = await txt(p); v('R2-13 sa fiche dit qu\'il est échu (et pas « dans -17 jours »)', c.err.length === e0 && !/-\d+ ?j(ours)?\b/.test(t), (t.match(/.{0,50}(échu|fin|jours).{0,50}/gi) || []).slice(0, 4));
  await L.capture(c, CAP + `R2-fiche-echu-${tag}.png`);
  await L.aller(p, 'statistiques'); t = await txt(p); await L.capture(c, CAP + `R2-stats-fin-${tag}.png`);
  v('R2-14 Statistiques : le contrat échu paraît (à renouveler ou échu), sans « -17 j »', c.err.length === e0 && /CTR-2026-004/.test(t) && !/-\d+ j\b/.test(t), (t.match(/.{0,40}CTR-2026-004.{0,80}/) || [''])[0]);
  await L.aller(p, 'taches'); await L.toucher(c, '[data-tsuggs]'); await L.calme(p, 500); t = await txt(p, '#calque');
  v('R2-15 Tâches propose de renouveler le contrat échu, sans « -17 jours »', c.err.length === e0 && /CTR-2026-004/.test(t) && !/-\d+ jours?/.test(t), (t.match(/.{0,40}CTR-2026-004.{0,100}/) || [''])[0]);
  await p.evaluate(() => { const k = CONTRATS.find(x => x.id === 'c1'); delete k.fin; });
  await L.aller(p, 'contrats'); await L.aller(p, 'contrat-x-c1'); await L.aller(p, 'statistiques'); await L.aller(p, 'taches');
  v('R2-16 un contrat SANS date de fin (ancien format) ne fait planter aucun écran', c.err.length === e0, c.err.slice(e0));
  console.log('err', c.err.length, c.err.slice(0, 5));
  const ko = L.bilan(); await L.fin(c); await L.fermer(); process.exit(ko ? 1 : 0);
})().catch(async e => { console.log('ÉCHEC', e.stack); await L.fermer(); process.exit(2); });
