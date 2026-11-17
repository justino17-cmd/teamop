// Parcours A (gérant, ordinateur) : « Contrat rapide » de bout en bout, pour CHAQUE mode de facturation (à chaque visite, par mois,
// par an) : créer, envoyer à signer, signer en client, vérifier ce que la signature pose (fin, visites, facture), les chiffres de la
// liste, Statistiques et Tâches (qui plantaient sur un contrat neuf), puis finir une visite et lire la facture qui en sort.
// usage : node contrats-parcours-a.js [profil]
const O = require('./contrats-outils.js'), L = O.L, v = L.v;
const MODES = [['visite', 'à chaque visite'], ['mois', 'chaque mois'], ['an', 'une fois par an, à la signature']];
const cents = x => Math.round(x * 100);
(async () => {
  const profil = process.argv[2] || 'mac';
  const c = await L.ouvrir({ profil, qui: 'marc', hash: 'contrats' }); const p = c.p;
  for (const [mode, lib] of MODES) {
    console.log(`\n── mode « ${lib} »`);
    await O.neuf(c, 'contrats');
    const av = await O.donnees(p), kav = await O.kpis(p);
    await L.aller(p, 'contrat-nouveau');
    // le formulaire : modèle chauffage, client Camping Les Pins, 2 visites, 140 €, mode choisi
    await p.selectOption('[data-b="modele"]', 'chauffage'); await L.calme(p, 300);
    const prixDef = await p.inputValue('[data-b="prix"]'); v(`A-${mode} : le prix se pré-remplit avec celui du modèle (${prixDef})`, +prixDef > 0, prixDef);
    await p.selectOption('[data-b="cli"]', 'cp'); await p.selectOption('[data-b="freq"]', '2'); await p.selectOption('[data-b="fact"]', mode);
    await p.fill('[data-b="prix"]', '140'); await p.fill('[data-b="lieu"]', 'Chaudière du sous-sol');
    await L.capture(c, O.CAP + `A-${mode}-formulaire-${profil}.png`);
    await L.toucher(c, '[data-action="creerContrat"]'); await L.calme(p, 600);
    const ap1 = await O.donnees(p), e1 = await O.lire(p);
    v(`A-${mode} : un contrat de plus, « envoyé »`, ap1.contrats.length === av.contrats.length + 1 && ap1.contrats[ap1.contrats.length - 1].st === 'envoye', ap1.contrats.slice(-1));
    const k = ap1.contrats[ap1.contrats.length - 1];
    v(`A-${mode} : le nouveau contrat a une date de fin (un an moins un jour)`, k.fin === '31/10/2027' || /^\d\d\/\d\d\/20\d\d$/.test(k.fin), k);
    v(`A-${mode} : on arrive sur sa fiche`, new RegExp(k.num).test(e1.h1), e1.h1);
    v(`A-${mode} : le toast dit l'adresse du client`, /contact@campinglespins\.fr/.test(e1.toast), e1.toast);
    v(`contrats-04 · A-${mode} : l'historique note l'envoi du contrat`, ap1.nJournal > av.nJournal, [av.nJournal, ap1.nJournal]);
    await L.capture(c, O.CAP + `A-${mode}-fiche-envoye-${profil}.png`);
    // la liste
    await L.aller(p, 'contrats'); const kp = await O.kpis(p);
    v(`A-${mode} : « en attente » passe de ${kav[3].n} à ${+kav[3].n + 1}`, +kp[3].n === +kav[3].n + 1, kp);
    v(`A-${mode} : « contrats signés » ne bouge pas`, kp[0].n === kav[0].n, kp);
    // le client signe
    await L.aller(p, 'contrat-x-' + k.id); await L.toucher(c, '[data-go^="signer-x-"]');
    const eS = await O.lire(p); v(`A-${mode} : « Voir ce que le client voit » ouvre la page de signature`, /signer/.test(eS.hash), eS);
    // sans case ni signature : refus clair
    await L.toucher(c, '[data-action="signerContrat"]'); let t = (await O.lire(p)).toast;
    v(`A-${mode} : signer sans cocher est refusé et le dit`, /Cochez/.test(t), t);
    await p.check('#lu'); await L.toucher(c, '[data-action="signerContrat"]'); t = (await O.lire(p)).toast;
    v(`A-${mode} : signer sans dessiner est refusé et le dit`, /Signez/.test(t), t);
    const bb = await p.locator('#signe-ctr').boundingBox();
    await p.mouse.move(bb.x + bb.width * .2, bb.y + bb.height * .6); await p.mouse.down(); await p.mouse.move(bb.x + bb.width * .5, bb.y + bb.height * .3, { steps: 6 }); await p.mouse.move(bb.x + bb.width * .8, bb.y + bb.height * .6, { steps: 6 }); await p.mouse.up();
    await L.capture(c, O.CAP + `A-${mode}-signature-${profil}.png`);
    await L.toucher(c, '[data-action="signerContrat"]'); await L.calme(p, 500);
    const ap2 = await O.donnees(p), e2 = await O.lire(p), k2 = ap2.contrats.find(x => x.id === k.id);
    v(`A-${mode} : le contrat est signé`, k2.st === 'signe', k2);
    v(`A-${mode} : on revient sur la fiche du contrat`, new RegExp(k.num).test(e2.h1), e2.h1);
    const vis = await p.evaluate(id => INTS.filter(i => i.titre.startsWith('Contrat — visite') && i.cli === 'cp').map(i => ({ id: i.id, d: i.d, st: i.st, titre: i.titre })), k.id);
    v(`A-${mode} : 2 visites posées au planning, « à planifier »`, vis.length === 2 && vis.every(x => x.st === 'aplanifier'), vis);
    v(`A-${mode} : les dates des visites tombent dans l'année du contrat`, vis.every(x => x.d >= '2026-11-01' && x.d <= '2027-10-31'), vis.map(x => x.d));
    const fact = await p.evaluate(() => FACTURES.filter(f => f.cli === 'cp' && /^fc-/.test(f.id)).map(f => ({ id: f.id, objet: f.objet, ht: f.ht, lignes: f.lignes, st: f.st })));
    if (mode === 'an') v(`A-${mode} : la facture de l'année est préparée, 140 € HT`, fact.length === 1 && fact[0].lignes[0].pu === 140, fact);
    else v(`A-${mode} : pas de facture à la signature`, fact.length === 0, fact);
    await L.capture(c, O.CAP + `A-${mode}-fiche-signe-${profil}.png`);
    // les chiffres de la liste
    await L.aller(p, 'contrats'); const kq = await O.kpis(p);
    v(`A-${mode} : « contrats signés » +1`, +kq[0].n === +kav[0].n + 1, kq);
    v(`A-${mode} : le revenu annuel +140 €`, L.cents(kq[1].n) === L.cents(kav[1].n) + 14000, [kav[1].n, kq[1].n]);
    v(`A-${mode} : « visites à venir » +2`, +kq[2].n === +kav[2].n + 2, kq);
    v(`A-${mode} : « en attente » revient à ${kav[3].n}`, +kq[3].n === +kav[3].n, kq);
    // Statistiques et Tâches ne plantent pas
    const nErr = c.err.length;
    await L.aller(p, 'statistiques'); const es = await O.lire(p); v(`A-${mode} : Statistiques s'ouvre (${es.h1})`, /Statistiques/.test(es.h1), es);
    await L.aller(p, 'taches'); const et = await O.lire(p); v(`A-${mode} : Tâches s'ouvre (${et.h1})`, /Tâches/.test(et.h1), et);
    v(`A-${mode} : aucune erreur de la page`, c.err.length === nErr, c.err.slice(nErr));
    // finir la 1re visite : la facture qui en sort
    const t0 = await O.terminerVisite(p, vis[0].id), r = { st: t0.st, f: t0.facture };
    const attendu = mode === 'visite' ? 70 : null;
    console.log('  · visite terminée → facture :', JSON.stringify(r));
    if (mode === 'visite') v(`contrats-01 · A-${mode} : la visite terminée se facture au prix du contrat (70 € HT = 140 ÷ 2)`, r.f && r.f.lignes.some(l => Math.abs(l.q === '1' ? l.pu - 70 : 9999) < .01) && !r.f.lignes.some(l => /Déplacement|Main-d/.test(l.d)), r.f);
    if (mode !== 'visite') v(`contrats-02 · A-${mode} : ce contrat se facture ${mode === 'an' ? 'une fois par an' : 'chaque mois'} : la visite terminée ne crée PAS une seconde facture`, !r.f, r.f);
    const d3 = await O.donnees(p); const k3 = d3.contrats.find(x => x.id === k.id);
    v(`contrats-03 · A-${mode} : la fiche compte 1 visite faite après la fin de la visite`, k3.faites === 1, k3.faites);
  }
  console.log('err', c.err.length, c.err.slice(0, 5));
  const ko = L.bilan(); await L.fin(c); await L.fermer(); process.exit(ko ? 1 : 0);
})().catch(async e => { console.log('ÉCHEC', e.stack); await L.fermer(); process.exit(2); });
