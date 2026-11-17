// Mise en page de « Achats et frais » et de « Mes frais » (campagne du 17 novembre 2026) : sur un profil, jour ou nuit, avec des VALEURS LONGUES,
// chaque écran et chaque fenêtre : pas de glissement latéral (contre la largeur POSÉE du profil), cibles au doigt ≥ 44 px, champs ≥ 16 px,
// pas de texte écrasé, aucune erreur JavaScript. Les captures vont dans le dossier temporaire, à REGARDER.
// Usage : node achats-mise-en-page.js [profil=iphone] [nuit=0|1]
const { L, CAP, devenir, txt, panneau, fermerGuide } = require('./achats-outils.js'), v = L.v, fs = require('fs');
(async () => {
  const profil = process.argv[2] || 'iphone', nuit = process.argv[3] === '1', tag = `${profil}-${nuit ? 'nuit' : 'jour'}`;
  const c = await L.ouvrir({ profil, qui: 'marc', nuit }), p = c.p, E = (f, a) => p.evaluate(f, a), rapport = [];
  // les valeurs les plus longues plausibles : une demande et une note comme le ferait une personne qui détaille tout (on copie la forme d'une fiche existante)
  const LONG = 'Câble de raccordement électrique triphasé renforcé, section 5 × 16 mm², longueur 25 m, avec embouts';
  await E(L_ => { const d = JSON.parse(JSON.stringify(DEM_ACHAT.find(x => x.etat === 'attente'))); Object.assign(d, { id: 'dlong', quoi: L_, q: 1523.5, u: 'kg', est: 12345.67, pourquoi: 'Pour le gros chantier de la zone industrielle de Périgny : trois groupes de toiture à raccorder avant le 28, le fournisseur habituel est en rupture.', qui: 'sm' }); DEM_ACHAT.unshift(d);
    const n = JSON.parse(JSON.stringify(NDF.find(x => x.etat === 'attente' && x.recu))); Object.assign(n, { id: 'nlong', objet: 'Repas sur un chantier, restaurant du port de La Rochelle, repas du midi pour deux techniciens', ttc: 12345.67 }); NDF.unshift(n); rendre(); }, LONG);
  const mesure = async (nom, zone, panneauOuvert) => {
    await L.calme(p, 350);
    const dep = await L.deborde(c), d = await L.doigts(p, zone), vide = (await E(z => { const e = document.querySelector(z); return e ? e.textContent.trim().length : 0; }, zone)) > 20;
    const file = CAP + `mep-${nom}-${tag}.png`; await L.capture(c, file);
    v(`${nom} : l’écran n’est pas vide`, vide); v(`${nom} : aucun glissement latéral`, dep.bouge === 0, dep);
    if (c.doigt) { v(`${nom} : cibles ≥ 44 px`, d.petits.length === 0, d.petits); v(`${nom} : champs ≥ 16 px`, d.champs.length === 0, d.champs); }
    v(`${nom} : aucun texte écrasé`, d.ecrases.length === 0, d.ecrases);
    rapport.push({ nom, deborde: dep.bouge, petits: d.petits, champs: d.champs, ecrases: d.ecrases, capture: file }); };
  const ouvre = async (sel, nom, zone) => { const ok = await L.toucher(c, sel, { delai: 4000 }); v(`${nom} : le geste a été touché`, ok, sel); if (ok) await mesure(nom, zone || '#calque .panneau'); await L.ranger(p); };
  await E(() => { acOnglet = 'demandes'; }); await L.aller(p, 'achats'); await mesure('demandes', '#contenu');
  await ouvre('[data-axa="dem"]', 'fenetre-demande'); await ouvre('[data-axa^="prec|"]', 'fenetre-precision'); await ouvre('[data-ac^="refuser|"]', 'fenetre-refus-demande');
  await ouvre('[data-axa^="budget|"]', 'fenetre-budget'); await ouvre('[data-action="achatsAide"]', 'fenetre-aide');
  await E(() => { acOnglet = 'notes'; rendre(); }); await mesure('notes', '#contenu');
  await ouvre('[data-axa^="fiche|"]', 'fenetre-fiche-note'); await ouvre('[data-ac^="ndfsans|"]', 'fenetre-sans-ticket'); await ouvre('[data-ac^="ndfnon|"]', 'fenetre-refus-note'); await ouvre('[data-axa="toutval"]', 'fenetre-tout-valider'); await ouvre('[data-axa="kmtarif"]', 'fenetre-tarif-km');
  await devenir(p, 'sm', 'techfrais'); await mesure('mes-frais', '#contenu');
  await ouvre('[data-rl="ndf"]', 'fenetre-note-de-frais'); await ouvre('[data-axa="dem"]', 'fenetre-ma-demande'); await ouvre('[data-axa^="demmod|"]', 'fenetre-modifier-demande');
  const err = c.err.filter(x => !/ERR_/.test(x)); v('aucune erreur JavaScript', err.length === 0, err.slice(0, 3));
  fs.writeFileSync(`${__dirname}/../achats-mep-${tag}.json`, JSON.stringify(rapport, null, 1));
  const ko = L.bilan(); await L.fin(c); await L.fermer(); process.exit(ko ? 1 : 0);
})().catch(async e => { console.error(e); try { await L.fermer(); } catch (x) {} process.exit(2); });
