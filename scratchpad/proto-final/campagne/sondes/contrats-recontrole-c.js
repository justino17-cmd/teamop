// RECONTRÔLE ADVERSE des contrats, parcours R3 : ce que les corrections ont pu CASSER à côté.
//  · une visite d'un contrat « par an » : sa fiche AVANT la fin, le message à « Terminer », le dossier de Comptabilité (le mot « garantie » n'a rien à faire là) ;
//  · une visite « à chaque visite » avec une pièce posée sur place : la pièce s'ajoute au prix du contrat ;
//  · le Retour du navigateur après la signature (pas de seconde signature, pas de seconde série de visites) ;
//  · les visites posées au Planning (le plateau « à planifier ») et la date de fin dans Tâches après un contrat neuf ;
//  · le formulaire « Contrat rapide » rouvert après un envoi (client, prix, lieu repartent du modèle).
// usage : node contrats-recontrole-c.js [profil] [nuit]  → « N ✓ · M ✗ », code 1 si un contrôle tombe
const O = require('./contrats-outils.js'), L = O.L, v = L.v;
const txt = (p, z) => p.evaluate(z => ((document.querySelector(z || '#contenu') || {}).textContent || '').replace(/\s+/g, ' ').trim(), z);
(async () => {
  const profil = process.argv[2] || 'mac', nuit = process.argv[3] === 'nuit', tag = profil + (nuit ? '-nuit' : '-jour');
  const CAP = O.CAP.replace('campagne-contrats', 'recontrole-contrats');
  const c = await L.ouvrir({ profil, qui: 'marc', hash: 'contrats', nuit }); const p = c.p; await L.calme(p, 400);
  async function signer(k) { await L.aller(p, 'signer-x-' + k.id); await p.check('#lu'); await p.evaluate(() => document.getElementById('signe-ctr').scrollIntoView({ block: 'center' })); await L.calme(p, 250); const bb = await p.locator('#signe-ctr').boundingBox();
    await p.mouse.move(bb.x + bb.width * .2, bb.y + bb.height * .6); await p.mouse.down(); await p.mouse.move(bb.x + bb.width * .5, bb.y + bb.height * .3, { steps: 6 }); await p.mouse.move(bb.x + bb.width * .8, bb.y + bb.height * .6, { steps: 6 }); await p.mouse.up();
    await L.toucher(c, '[data-action="signerContrat"]'); await L.calme(p, 600); }
  async function creer(o) { await L.aller(p, 'contrat-nouveau'); await p.selectOption('[data-b="modele"]', o.modele || 'chauffage'); await L.calme(p, 250);
    await p.selectOption('[data-b="cli"]', o.cli); await p.selectOption('[data-b="freq"]', String(o.freq)); await p.selectOption('[data-b="fact"]', o.fact); await p.fill('[data-b="prix"]', String(o.prix)); await p.fill('[data-b="lieu"]', o.lieu || 'Site test');
    await L.toucher(c, '[data-action="creerContrat"]'); await L.calme(p, 600); return p.evaluate(() => { const k = CONTRATS[CONTRATS.length - 1]; return { id: k.id, num: k.num }; }); }
  const preparer = (id, extra) => p.evaluate(([id, extra]) => { const i = INTS.find(o => o.id === id); if (!i.tech) { i.tech = 'tl'; i.st = 'planifiee'; } const F = fiche(id); tousControles(F).forEach(k => { F.coches[k] = true; }); F.signature = 'signee'; F.compte = 'Fait.'; if (extra) F.pieces = [extra]; rendre(); }, [id, extra || null]);

  // ── visite d'un contrat « par an »
  const a = await creer({ cli: 'cm', freq: 2, fact: 'an', prix: 1200 }); await signer(a);
  const vis = await p.evaluate(id => INTS.filter(i => i.ctr === id).map(i => i.id), a.id);
  await L.aller(p, 'inter-x-' + vis[0]); await preparer(vis[0]); await L.calme(p, 300); let t = await txt(p);
  await L.capture(c, CAP + `R3-visite-an-avant-${tag}.png`);
  v('R3-1 AVANT la fin : la fiche de la visite d\'un contrat par an ne propose pas de paiement ni de facture à part', !/Préparer la facture|Paiement sur place|la facture lui sera envoyée/.test(t), (t.match(/.{0,60}(factur|Paiement).{0,80}/gi) || []).slice(0, 4));
  await L.toucher(c, '[data-action="terminer"]', { delai: 2500 }); await L.calme(p, 500);
  const e = await L.etat(p); console.log('  · message à « Terminer » :', JSON.stringify(e.toast), '· panneau :', JSON.stringify(e.panneau));
  v('R3-2 le message à « Terminer » une visite comprise ne parle ni de « garantie » ni de « facture préparée »', !/garantie|facture est préparée/i.test(e.toast || ''), e.toast);
  await L.capture(c, CAP + `R3-visite-an-apres-${tag}.png`);
  await L.aller(p, 'cx-x-' + vis[0]).catch(() => {}); t = await txt(p);
  const dossier = await p.evaluate(id => typeof cxDossier === 'function' ? (() => { try { return cxDossier(INTS.find(o => o.id === id)).toString().slice(0, 0); } catch (e) { return 'err'; } })() : 'sans', vis[0]);
  await L.aller(p, 'compta'); await L.calme(p, 400);
  const lignes = await p.evaluate(() => [...document.querySelectorAll('#contenu *')].filter(e => e.children.length === 0 && /Contrat — visite|comprise|réglée par le contrat|garantie/i.test(e.textContent)).map(e => e.textContent.replace(/\s+/g, ' ').trim().slice(0, 100)).slice(0, 8));
  console.log('  · Comptabilité, lignes qui parlent de contrat/garantie :', JSON.stringify(lignes));
  v('R3-3 Comptabilité : une visite comprise se range « réglée par le contrat », jamais « garantie »', !lignes.some(x => /garantie/i.test(x)), lignes);
  await L.capture(c, CAP + `R3-compta-${tag}.png`);

  // ── visite « à chaque visite » avec une pièce posée sur place
  const b = await creer({ cli: 'cp', freq: 2, fact: 'visite', prix: 600, lieu: 'Splits du bâtiment d\'accueil' }); await signer(b);
  const visB = await p.evaluate(id => INTS.filter(i => i.ctr === id).map(i => i.id), b.id);
  await L.aller(p, 'inter-x-' + visB[0]); await preparer(visB[0], { nom: 'Filtre de rechange', q: '2', pu: 15 }); await L.calme(p, 300);
  await L.toucher(c, '[data-action="terminer"]', { delai: 2500 }); await L.calme(p, 500);
  const fb = await p.evaluate(id => { const f = FACTURES.find(x => x.int === id); return f && { lignes: f.lignes.map(l => [l.d, l.q, l.pu]), ht: Math.round(htDe(f) * 100) }; }, visB[0]);
  console.log('  · facture avec pièce :', JSON.stringify(fb));
  v('R3-4 la facture d\'une visite avec une pièce : ligne du contrat 300 € + la pièce 2 × 15 € = 330,00 € HT', !!fb && fb.ht === 33000 && fb.lignes.length === 2, fb);
  await L.aller(p, 'facture-x-f-' + visB[0]); t = await txt(p); v('R3-5 l\'écran de la facture dit Total HT 330,00 €', /330,00 €/.test(t), (t.match(/Total HT.{0,40}/) || [''])[0]);
  await L.capture(c, CAP + `R3-facture-piece-${tag}.png`);

  // ── Retour du navigateur après la signature
  const nVis0 = await p.evaluate(() => INTS.filter(i => /^Contrat — visite/.test(i.titre)).length), nFac0 = await p.evaluate(() => FACTURES.length), nJ0 = await p.evaluate(() => JOURNAL.length);
  await p.goBack(); await L.calme(p, 600); const eb = await L.etat(p); console.log('  · après Retour :', JSON.stringify(eb.hash || eb.url || ''));
  await L.aller(p, 'signer-x-' + b.id); await p.check('#lu').catch(() => {}); await L.toucher(c, '[data-action="signerContrat"]').catch(() => {}); await L.calme(p, 500);
  const nVis1 = await p.evaluate(() => INTS.filter(i => /^Contrat — visite/.test(i.titre)).length), nFac1 = await p.evaluate(() => FACTURES.length), nJ1 = await p.evaluate(() => JOURNAL.length);
  v('R3-6 revenir sur la page de signature d\'un contrat déjà signé et re-signer ne pose ni visite, ni facture, ni ligne d\'Historique de plus', nVis1 === nVis0 && nFac1 === nFac0 && nJ1 === nJ0, [nVis0, nVis1, nFac0, nFac1, nJ0, nJ1]);

  // ── Planning : le plateau « à planifier » montre les visites du contrat neuf
  const m = await creer({ cli: 'md', freq: 4, fact: 'visite', prix: 400 }); await signer(m);
  await L.aller(p, 'planning'); await L.calme(p, 500); t = await txt(p, 'body');
  await L.capture(c, CAP + `R3-planning-${tag}.png`);
  const aPlan = await p.evaluate(id => INTS.filter(i => i.ctr === id && i.st === 'aplanifier').length, m.id);
  v('R3-7 les 4 visites du contrat neuf sont « à planifier » et le Planning s\'ouvre sans erreur', aPlan === 4 && c.err.length === 0, [aPlan, c.err.slice(0, 2)]);
  v('R3-8 le Planning nomme les visites d\'un contrat (« Contrat — visite n sur N ») : les visites du contrat NEUF tombent après la semaine affichée (R3-7 les compte « à planifier »), on lit donc une visite quelconque — erreur de la sonde d\'origine corrigée le 17/11, restes contrats', /Contrat — visite \d sur \d/.test(t), (t.match(/.{0,30}Contrat — visite.{0,30}/) || [''])[0]);
  // ── Tâches après un contrat neuf
  await L.aller(p, 'taches'); await L.toucher(c, '[data-tsuggs]'); await L.calme(p, 500); t = await txt(p, '#calque');
  v('R3-9 Tâches : un contrat neuf (fin dans un an) n\'est pas proposé au renouvellement', !new RegExp(m.num).test(t), (t.match(new RegExp('.{0,40}' + m.num + '.{0,80}')) || [''])[0]);
  // ── Contrat rapide rouvert : le formulaire repart du modèle
  await L.aller(p, 'contrat-nouveau'); await L.calme(p, 300);
  const f = await p.evaluate(() => ({ cli: document.querySelector('[data-b="cli"]').value, prix: document.querySelector('[data-b="prix"]').value, lieu: document.querySelector('[data-b="lieu"]').value, freq: document.querySelector('[data-b="freq"]').value }));
  v('R3-10 le formulaire rouvert repart du modèle (pas du client, ni du prix, ni de la fréquence du contrat précédent)', f.cli !== 'md' && f.prix !== '400' && f.freq !== '4' && !/Site test/.test(f.lieu), f);
  await L.capture(c, CAP + `R3-formulaire-rouvert-${tag}.png`);
  console.log('err', c.err.length, c.err.slice(0, 5));
  const ko = L.bilan(); await L.fin(c); await L.fermer(); process.exit(ko ? 1 : 0);
})().catch(async e => { console.log('ÉCHEC', e.stack); await L.fermer(); process.exit(2); });
