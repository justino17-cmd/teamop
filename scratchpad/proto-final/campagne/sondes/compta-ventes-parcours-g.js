// Parcours G « compta-ventes » : la facture de la VISITE d'un contrat créé puis signé dans l'application. Le contrat dit « 600 € par an, 2 visites » :
// chaque visite doit se facturer 300 € HT (le prix du contrat), pas au tarif horaire par défaut. Joue les VRAIES actions (creerContrat, signerContrat, factureDepuis).
// usage : node compta-ventes-parcours-g.js [profil]       « N ✓ · M ✗ », code 1 si un contrôle tombe
const X = require('./compta-ventes-outils.js'), L = X.L;
(async () => {
  const profil = process.argv[2] || 'mac';
  const c = await L.ouvrir({ profil, qui: 'marc' }), p = c.p;
  for (const mode of ['visite', 'an', 'mois']) {
    const r = await p.evaluate(mode => {
      try {
        const cli = Object.keys(CLIENTS).find(k => /@/.test(CLIENTS[k].mail || '') && !CONTRATS.some(x => x.cli === k));
        Object.assign(BROUILLON, { cli, modele: Object.keys(MODELES)[0], freq: 2, prix: '600', fact: mode, debut: '2026-11-05', lieu: '' });
        const avant = CONTRATS.length; try { cfCtrT = 0; } catch (e) { /* le garde-fou du double clic de l'application : on le lève, chaque création est un geste voulu */ }
        ACTIONS.creerContrat();
        if (CONTRATS.length === avant) return { ok: false, err: 'le contrat n’a pas été créé (refus de l’application : ' + ((document.getElementById('toast') || {}).textContent || '').slice(0, 80) + ')' };
        const k = CONTRATS[CONTRATS.length - 1];
        // la signature, comme la page du contrat la fournit au geste
        const cv = document.createElement('canvas'); cv.id = 'signe-ctr'; cv.dataset.signe = 'data:image/png;base64,AAAA'; const lu = document.createElement('input'); lu.type = 'checkbox'; lu.id = 'lu'; lu.checked = true; document.body.append(cv, lu);
        ACTIONS.signerContrat({ dataset: { id: k.id } }); cv.remove(); lu.remove();
        const visites = INTS.filter(i => i.id.startsWith('n-ctr-' + k.id));
        const annuelle = FACTURES.find(f => f.id === 'fc-' + k.id);
        // terminer la 1re visite comme le fait le technicien, puis préparer sa facture
        const i = visites[0]; i.st = 'fait'; i.tech = (TECHS.find(t => t.id) || {}).id; const F = fiche(i.id); F.debut = F.debut || '09:00'; F.fin = F.fin || '10:00'; factureDepuis(i);
        const f = FACTURES.find(x => x.int === i.id);
        return { ok: true, k: { id: k.id, num: k.num, prix: k.prix, freq: k.freq, fact: k.fact, fin: k.fin }, visites: visites.length, annuelle: annuelle ? { ht: htDe(annuelle), st: annuelle.st } : null, fc: FACTURES.filter(f => /^fc-/.test(f.id)).map(f => f.id), kfact: k.fact, facture: f ? { st: f.st, tva: f.tva, ht: htDe(f), lignes: lignesDe(f).map(l => l.d + ' → ' + l.pu) } : null };
      } catch (e) { return { ok: false, err: e.message }; }
    }, mode);
    L.v(`contrat « ${mode} » : créé, signé, ses 2 visites posées`, r.ok && r.visites === 2, r);
    if (!r.ok) continue;
    if (mode === 'visite') {
      L.v('compta-ventes-12 · la facture de la visite d’un contrat « à chaque visite » est au prix du contrat (300,00 € HT = 600 / 2), pas au tarif horaire par défaut', !!r.facture && Math.abs(r.facture.ht - r.k.prix / r.k.freq) < .01, r.facture);
      L.v('la facture de la visite dit de quel contrat elle vient', !!r.facture && r.facture.lignes.some(l => /contrat|CTR/i.test(l)), r.facture && r.facture.lignes);
    } else if (mode === 'an') {
      L.v('contrat facturé « à l’an » : la facture de l’année est préparée à la signature (la fenêtre de signature le promet)', !!r.annuelle && Math.abs(r.annuelle.ht - r.k.prix) < .01, { annuelle: r.annuelle, fc: r.fc, kfact: r.kfact });
      L.v('compta-ventes-12b · contrat facturé « à l’an » : la visite ne fait pas naître une SECONDE facture au tarif horaire (le dossier dit « Couverte par le contrat »)', !r.facture, r.facture);
    } else {
      console.log('  · contrat « mois » : visite →', JSON.stringify(r.facture), '(constat, sans verdict : la facturation mensuelle n’a pas de règle écrite)');
    }
  }
  L.v('aucune erreur de page', c.err.length === 0, c.err.slice(0, 3));
  await L.fin(c); await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.log('ÉCHEC DE LA SONDE', e.message); process.exit(2); });
