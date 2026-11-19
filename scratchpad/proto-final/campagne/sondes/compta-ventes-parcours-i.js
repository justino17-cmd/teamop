// Parcours I « compta-ventes » : les ACOMPTES, recalculés au centime. Pour 600 devis fabriqués (1 à 4 lignes, quantités et prix décimaux, TVA 20 / 10 / 5,5 %,
// acompte 20 à 50 %), on joue les VRAIES fonctions de l'application — dvAcompte (facture d'acompte) puis factureDepuis (facture du solde, acompte déduit) — et on exige :
// acompte TTC + solde TTC = TTC du devis, et acompte TTC = acompte % du TTC du devis, tous deux à un centime près ; l'ordre inverse (solde sans acompte) ne déduit rien.
// usage : node compta-ventes-parcours-i.js [profil]       « N ✓ · M ✗ », code 1 si un contrôle tombe
const X = require('./compta-ventes-outils.js'), L = X.L;
(async () => {
  const profil = process.argv[2] || 'mac';
  const c = await L.ouvrir({ profil, qui: 'marc' }), p = c.p;
  const r = await p.evaluate(() => {
    const out = { cas: 0, ecartSomme: [], ecartPart: [], sansDeduction: 0, exacts: 0, erreurs: [] }; let graine = 20261117; const alea = () => (graine = (graine * 1664525 + 1013904223) % 4294967296) / 4294967296;
    const TVAS = [20, 10, 5.5], ACS = [20, 30, 40, 50];
    for (let n = 0; n < 600; n++) {
      try {
        const nl = 1 + Math.floor(alea() * 4), lignes = Array.from({ length: nl }, (_, k) => ['Ligne ' + k, 1 + Math.floor(alea() * 5), Math.round((10 + alea() * 900) * 100) / 100]);
        const tva = TVAS[Math.floor(alea() * 3)], ac = ACS[Math.floor(alea() * 4)], num = 'D-2026-9' + String(n).padStart(3, '0');
        const x = { id: 'BRt' + n, num, cli: 'md', objet: 'Devis de contrôle ' + n, d: AUJ, e: 'accepte', tva, valid: 30, acompte: ac, relances: 0, trace: [], lignes, rep: '31/10', signePar: 'Essai', via: 'en ligne' };
        DV.push(x); DEVIS_REG[num] = x;
        dvAcompte(x, true); const fa = FACTURES.find(f => f.id === x.facAcompte);
        const i = { id: 'izz' + n, d: AUJ, h: '09:00', dur: 60, tech: '', cli: 'md', titre: x.objet, type: 'Dépannage', st: 'fait' }; INTS.push(i); x.int = i.id; fiche(i.id);
        factureDepuis(i); const fs = FACTURES.find(f => f.id === 'f-' + i.id);
        const ttcDev = dvTTC(x), ttcA = ttcDe(fa), ttcS = ttcDe(fs);
        out.cas++;
        if (Math.abs(ttcA + ttcS - ttcDev) > .0101) out.ecartSomme.length < 5 && out.ecartSomme.push({ num, tva, ac, ttcDev, ttcA: Math.round(ttcA * 100) / 100, ttcS: Math.round(ttcS * 100) / 100, ecart: Math.round((ttcA + ttcS - ttcDev) * 100) / 100 });
        if (Math.abs(ttcA - ttcDev * ac / 100) > .0101) out.ecartPart.length < 5 && out.ecartPart.push({ num, tva, ac, ttcDev, ttcA: Math.round(ttcA * 100) / 100, attendu: Math.round(ttcDev * ac) / 100 });
        { const cA = Math.round(ttcA * 100), cS = Math.round(ttcS * 100), cT = Math.round(ttcDev * 100); if (cA + cS === cT && cA === Math.floor((cT * ac) / 100 + .5)) out.exacts++; }   // les DEUX promesses tombent juste, en centimes entiers
        if (!lignesDe(fs).some(l => l.pu < 0)) out.sansDeduction++;
      } catch (e) { out.erreurs.length < 3 && out.erreurs.push(e.message); }
    }
    return out;
  });
  L.v('population : 600 devis à acompte rejoués', r.cas === 600, r.cas);
  L.v('compta-ventes-18 · acompte TTC + solde TTC = TTC du devis (à un centime près) sur les 600 cas', r.ecartSomme.length === 0, r.ecartSomme);
  L.v('l’acompte vaut l’acompte % du TTC du devis (à un centime près)', r.ecartPart.length === 0, r.ecartPart);
  console.log('  · cas où l’acompte ET la somme tombent juste au centime :', r.exacts, 'sur', r.cas);
  L.v('compta-ventes-18 · le HT de l’acompte est CHERCHÉ pour tenir les deux promesses (≥ 65 % de cas exacts ; le HT « au plus près » n’en donne que 61 % sur ces 600 devis)', r.exacts / r.cas >= 0.65, r.exacts);
  L.v('chaque facture de solde porte sa ligne négative « acompte déjà facturé »', r.sansDeduction === 0, r.sansDeduction);
  L.v('aucune exception pendant le rejeu', r.erreurs.length === 0, r.erreurs);
  L.v('aucune erreur de page', c.err.length === 0, c.err.slice(0, 3));
  await L.fin(c); await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.log('ÉCHEC DE LA SONDE', e.message); process.exit(2); });
