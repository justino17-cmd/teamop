// Balayage RAPIDE « compta-ventes » : chaque élément qui répond d'un écran de la Comptabilité est touché, et on dit ce que le geste a fait.
// Différence avec compta-ventes-balayage.js (page neuve à chaque frappe, 20 à 30 s sous charge) : on ne recharge que si le geste a ÉCRIT dans les données
// (signature de FACTURES, ENCAISSEMENTS, ACHATS, caisse) ; sinon on remet l'écran d'aplomb par les gestes de l'application (fermerPanneau, rendre).
// usage : node compta-ventes-balayage-rapide.js <profil> <qui> [écran…]       écrans : ensemble dossiers fventes avoirs clients contrats paiements caisse
// sortie : campagne/balayage-compta-ventes-<qui>-<profil>.json (écrit après chaque écran : une machine qui redémarre ne perd pas tout)
const X = require('./compta-ventes-outils.js'), L = X.L, fs = require('fs'), path = require('path');
const ECRANS = {
  ensemble: { onglet: 'ensemble' }, dossiers: { onglet: 'dossiers' }, fventes: { onglet: 'fventes', cat: 'ventes' }, avoirs: { onglet: 'fventes', cat: 'avoirs' },
  clients: { onglet: 'clients' }, contrats: { onglet: 'contrats' }, paiements: { onglet: 'paiements' }, caisse: { onglet: 'caisse' } };
const signature = p => p.evaluate(() => { const s = JSON.stringify([FACTURES, ENCAISSEMENTS, ACHATS, CP.depots, CP.chq, CP.remis, CONTRATS, INTS.length, typeof TACHES !== 'undefined' ? TACHES.length : 0]); let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return s.length + ':' + h; });
(async () => {
  const profil = process.argv[2] || 'mac', qui = process.argv[3] || 'marc', noms = process.argv.slice(4).length ? process.argv.slice(4) : Object.keys(ECRANS);
  const c = await L.ouvrir({ profil, qui, hash: 'accueil' }), p = c.p; const sorties = {}, sortie = path.join(__dirname, '..', `balayage-compta-ventes-${qui}-${profil}${process.env.SUFFIXE ? '-' + process.env.SUFFIXE : ''}.json`);   // SUFFIXE : une reprise d'un seul écran ne remplace pas le fichier des autres
  const neuf = async () => { await X.O.neuf(c, 'comptabilite'); };
  const prep = async e => { await X.compta(c, e.onglet, { cat: e.cat }); };
  for (const nom of noms) {
    const e = ECRANS[nom]; if (!e) { console.log('écran inconnu', nom); continue; }
    await neuf(); await prep(e); let liste = await X.marquer(p, '#contenu');
    /* la barre d'espaces, les onglets, « Comment ça marche ? » et « ＋ Ajouter » sont les MÊMES sur tous les écrans : touchés une fois (premier écran), pas huit
       (le recensement complet de la barre est dans le rapport de l'écran « ensemble »). Les touches qui changent d'écran sont gardées si elles sortent de la barre. */
    if (noms.indexOf(nom) > 0 && !process.env.TOUT) liste = liste.filter(g => !/data-cx=grp\||data-cp=aide|data-cx=nouveau|data-cx=sec\|(ensemble|cloture|dossiers|fventes|clients|contrats|fachats|ndf|fournisseurs|paiements|banque|caisse|enligne|tva|ecritures|balance|grandlivre|resultat|envoi|normes|archives)$/.test(g.data)); console.log(`\n== ${qui}-${profil}-${nom} : ${liste.length} gestes recensés`); const lignes = []; let sale = false;
    const sig0 = await signature(p);
    for (const g of liste) {
      if (sale) { await neuf(); sale = false; }
      await prep(e); const m = await X.marquer(p, '#contenu'); const cible = m.find(x => x.lib === g.lib && x.data === g.data) || null;
      if (!cible) { lignes.push({ i: g.i, lib: g.lib, data: g.data, touche: false, change: ['absent après remise en place'] }); console.log(`${String(g.i).padStart(2)} ✗ ${g.lib.slice(0, 44).padEnd(44)} introuvable après remise en place`); continue; }
      const avant = await X.lire(p), sigAvant = await signature(p);
      const ok = await L.toucher(c, `[data-sonde="${cible.i}"]`, { delai: 3500 }); const apres = await X.lire(p), d = X.diff(avant, apres), sigApres = await signature(p);
      const ecrit = sigAvant !== sigApres; if (ecrit) sale = true;
      lignes.push({ i: g.i, lib: g.lib, data: g.data, touche: ok, change: d, h1: apres.h1, panneau: apres.panneau, hash: apres.hash, toast: apres.toast, ecrit, sansNom: g.sansNom, l: g.l, h: g.h });
      console.log(`${String(g.i).padStart(2)} ${ok ? 'T' : '✗'} ${(g.lib || '(sans nom)').slice(0, 44).padEnd(44)} ${g.data.slice(0, 34).padEnd(34)} → ${d.length ? d.join(',') : 'RIEN'}${ecrit ? ' [ÉCRIT]' : ''} ${apres.panneau ? '[P:' + apres.panneau.slice(0, 40) + ']' : ''} ${apres.toast ? '[T:' + apres.toast.slice(0, 50) + ']' : ''} ${apres.h1 !== avant.h1 ? '[H1:' + apres.h1.slice(0, 30) + ']' : ''}`);
    }
    sorties[`${qui}-${profil}-${nom}`] = { recenses: liste.length, touches: lignes.filter(l => l.touche).length, lignes };
    fs.writeFileSync(sortie, JSON.stringify({ profil, qui, sorties, err: c.err }, null, 1));
  }
  console.log('\nerreurs de page', c.err.length, c.err.slice(0, 5));
  await L.fin(c); await L.fermer();
})().catch(e => { console.log('ÉCHEC DE LA SONDE', e.message); process.exit(2); });
