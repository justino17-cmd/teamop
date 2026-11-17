// Parcours B (gérant, ordinateur) : ce que la FICHE d'un contrat NEUF raconte de sa facturation, avant et après une visite faite ;
// les chiffres (1 200 € HT par an, 2 visites : 600 € par visite, 100 € par mois — faciles à recalculer à la main).
// usage : node contrats-parcours-b.js [profil]
const O = require('./contrats-outils.js'), L = O.L, v = L.v;
const texte = (p, s) => p.evaluate(s => { const e = document.querySelector(s); return e ? e.innerText.replace(/\s+/g, ' ').trim() : ''; }, s);
(async () => {
  const profil = process.argv[2] || 'mac';
  const c = await L.ouvrir({ profil, qui: 'marc', hash: 'contrats' }); const p = c.p;
  for (const mode of ['visite', 'mois', 'an']) {
    console.log(`\n── mode « ${mode} » : 1 200 € HT / an, 2 visites`);
    await O.neuf(c, 'contrats');
    const k = await O.creerSigner(c, { modele: 'chauffage', cli: 'cp', freq: 2, fact: mode, prix: 1200, lieu: 'Chaudière du sous-sol' });
    v(`B-${mode} : contrat créé et signé`, !!k, k); if (!k) continue;
    await L.aller(p, 'contrat-x-' + k.id);
    const fiche0 = await p.evaluate(() => [...document.querySelectorAll('#contenu .carte')].map(x => x.innerText.replace(/\s+/g, ' ').trim()).filter(t => /^FACTURATION|^Facturation/i.test(t)));
    console.log('  · carte Facturation :', fiche0.join(' | '));
    const ligne = fiche0.join(' ');
    if (mode === 'mois') v('contrats-02 · B-mois : la fiche annonce 100,00 € HT par mois (1 200 ÷ 12), pas 600 € ni la facture de chaque visite', /100,00 € HT/.test(ligne) && !/chaque visite se prépare/.test(ligne), ligne);
    if (mode === 'an') v('contrats-02 · B-an : la fiche ne promet pas « la facture de chaque visite » : une seule facture par an', !/chaque visite se prépare/.test(ligne), ligne);
    if (mode === 'visite') v('B-visite : la fiche annonce 600,00 € HT à chaque visite', /600,00 € HT à chaque visite/.test(ligne), ligne);
    await L.capture(c, O.CAP + `B-${mode}-fiche-bas-${profil}.png`);
    // la visite 1 : sa fiche d'intervention
    const vis = await p.evaluate(() => INTS.filter(i => i.cli === 'cp' && /^Contrat — visite/.test(i.titre)).map(i => i.id));
    await L.aller(p, 'inter-x-' + vis[0]); const fin = await p.evaluate(() => [...document.querySelectorAll('#contenu .fin-c, #contenu .carte')].map(x => x.innerText.replace(/\s+/g, ' ').trim()).filter(t => /Facturation/i.test(t)).slice(0, 2));
    console.log('  · fiche de la visite 1, facturation :', JSON.stringify(fin));
    // finir la visite 1
    const t = await O.terminerVisite(p, vis[0]);
    console.log('  · visite 1 terminée → facture :', JSON.stringify(t.facture));
    await L.aller(p, 'contrat-x-' + k.id);
    const apres = await p.evaluate(() => ({ titre: [...document.querySelectorAll('#contenu .carte h3')].map(h => h.innerText).find(t => /visites/i.test(t)), lignes: [...document.querySelectorAll('#contenu .carte .ligne')].map(l => l.innerText.replace(/\s+/g, ' ').trim()).filter(t => /^Visite/.test(t)) }));
    console.log('  · fiche après la visite :', JSON.stringify(apres));
    v(`contrats-03 · B-${mode} : le titre de la carte dit « 1 sur 2 faites » après la visite 1`, /1 sur 2 faites/i.test(apres.titre || ''), apres.titre);
    v(`contrats-03 · B-${mode} : la ligne de la visite 1 dit « Faite » ou « Terminée »`, apres.lignes.length && /Faite|Terminée/i.test(apres.lignes[0] || ''), apres.lignes);
    await L.aller(p, 'contrats'); const row = await p.evaluate(() => { const r = [...document.querySelectorAll('#contenu tbody tr')].pop(); return r ? r.innerText.replace(/\s+/g, ' ').trim() : ''; });
    v(`contrats-03 · B-${mode} : la liste dit « 1 / 2 faites » pour ce contrat`, /1 \/ 2 faites/.test(row), row);
    const kp = await O.kpis(p); console.log('  · chiffres du haut :', JSON.stringify(kp.map(x => x.n)));
    await L.aller(p, 'statistiques'); const st = await p.evaluate(() => { const t = document.getElementById('contenu').innerText.replace(/\s+/g, ' '); const m = t.match(/(\d+)\s*(?:sur|\/)\s*(\d+)\s*visites?[^.]{0,40}/i) || t.match(/visites?[^.]{0,80}/i); return m ? m[0] : ''; });
    console.log('  · Statistiques, visites :', st);
  }
  console.log('err', c.err.length, c.err.slice(0, 5));
  const ko = L.bilan(); await L.fin(c); await L.fermer(); process.exit(ko ? 1 : 0);
})().catch(async e => { console.log('ÉCHEC', e.stack); await L.fermer(); process.exit(2); });
