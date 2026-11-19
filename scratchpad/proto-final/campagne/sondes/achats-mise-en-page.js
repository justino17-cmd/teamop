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
    const dep = await L.deborde(c), d = await L.doigts(p, zone), pop = await E(z => { const R = document.querySelector(z); return R ? R.querySelectorAll('button, a, [role=button], summary, input, select, textarea').length : 0; }, zone), vide = (await E(z => { const e = document.querySelector(z); return e ? e.textContent.trim().length : 0; }, zone)) > 20;
    const file = CAP + `mep-${nom}-${tag}.png`; await L.capture(c, file);
    v(`${nom} : la population mesurée n’est pas vide (${pop} éléments qui répondent)`, pop > 0, pop); v(`${nom} : l’écran n’est pas vide`, vide); v(`${nom} : aucun glissement latéral`, dep.bouge === 0, dep);
    if (c.doigt) { v(`${nom} : cibles ≥ 44 px`, d.petits.length === 0, d.petits); v(`${nom} : champs ≥ 16 px`, d.champs.length === 0, d.champs); }
    v(`${nom} : aucun texte écrasé`, d.ecrases.length === 0, d.ecrases);
    rapport.push({ nom, population: pop, deborde: dep.bouge, petits: d.petits, champs: d.champs, ecrases: d.ecrases, capture: file }); };
  const ouvre = async (sel, nom, zone) => { const ok = await L.toucher(c, sel, { delai: 4000 }); v(`${nom} : le geste a été touché`, ok, sel); if (ok) await mesure(nom, zone || '#calque .panneau'); await L.ranger(p); };
  await E(() => { acOnglet = 'demandes'; }); await L.aller(p, 'achats'); await mesure('demandes', '#contenu');
  const tq = await txt(p, '#contenu');
  v('achats-12 les grandes quantités se lisent avec leur séparateur (« 1 523,5 kg », pas « 1523,5 kg »)', !/\b\d{4,}(,\d+)? (kg|u|m|L)\b/.test(tq), (tq.match(/\b\d{4,}(,\d+)? (kg|u|m|L)\b/) || [])[0]);
  // la PREMIÈRE chose à décider doit se voir sans défiler (achats-05 : sur un téléphone, il faut passer quatre blocs avant la première demande)
  const yDem = await E(() => { const e = document.querySelector('.ax-d'); return e ? Math.round(e.getBoundingClientRect().top + scrollY) : -1; });
  if (['iphone','android','petit'].includes(process.argv[2] || 'iphone')) v('achats-05 la première demande à décider commence dans le premier écran (' + yDem + ' px pour un écran de ' + c.hauteur + ' px)', yDem >= 0 && yDem < c.hauteur - 120, { yDem, hauteur: c.hauteur });
  await ouvre('[data-axa="dem"]', 'fenetre-demande'); await ouvre('[data-axa^="prec|"]', 'fenetre-precision'); await ouvre('[data-ac^="refuser|"]', 'fenetre-refus-demande');
  await ouvre('[data-axa^="budget|"]', 'fenetre-budget'); await ouvre('[data-action="achatsAide"]', 'fenetre-aide');
  await E(() => { acOnglet = 'notes'; rendre(); }); await mesure('notes', '#contenu');
  const yNote = await E(() => { const e = document.querySelector('.ax-n'); return e ? Math.round(e.getBoundingClientRect().top + scrollY) : -1; });
  if (['iphone','android','petit'].includes(process.argv[2] || 'iphone')) v('achats-05 la première note à valider commence dans le premier écran (' + yNote + ' px pour un écran de ' + c.hauteur + ' px)', yNote >= 0 && yNote < c.hauteur - 120, { yNote, hauteur: c.hauteur });
  await ouvre('[data-axa^="fiche|"]', 'fenetre-fiche-note'); await ouvre('[data-ac^="ndfsans|"]', 'fenetre-sans-ticket'); await ouvre('[data-ac^="ndfnon|"]', 'fenetre-refus-note'); await ouvre('[data-axa="toutval"]', 'fenetre-tout-valider'); if (await E(() => [...document.querySelectorAll('#contenu [data-axa="kmtarif"]')].some(e => e.offsetParent))) await ouvre('[data-axa="kmtarif"]', 'fenetre-tarif-km');
  else { await ouvre('[data-axa="reglages"]', 'fenetre-reglages'); /* téléphone (achats-05) : le tarif est derrière « Réglages › » */ const ok = await L.toucher(c, '[data-axa="reglages"]', { delai: 4000 }); if (ok) { await L.calme(p, 300); const ok2 = await L.toucher(c, '#calque [data-axa="kmtarif"]', { delai: 4000 }); v('fenetre-tarif-km (par Réglages) : le geste a été touché', ok2, 'kmtarif'); if (ok2) await mesure('fenetre-tarif-km', '#calque .panneau'); } await L.ranger(p); };
  await devenir(p, 'sm', 'techfrais'); await mesure('mes-frais', '#contenu');
  await ouvre('[data-rl="ndf"]', 'fenetre-note-de-frais'); await ouvre('[data-axa="dem"]', 'fenetre-ma-demande'); await ouvre('[data-axa^="demmod|"]', 'fenetre-modifier-demande');
  const err = c.err.filter(x => !/ERR_/.test(x)); v('aucune erreur JavaScript', err.length === 0, err.slice(0, 3));
  fs.writeFileSync(`${__dirname}/../achats-mep-${tag}.json`, JSON.stringify(rapport, null, 1));
  const ko = L.bilan(); await L.fin(c); await L.fermer(); process.exit(ko ? 1 : 0);
})().catch(async e => { console.error(e); try { await L.fermer(); } catch (x) {} process.exit(2); });
