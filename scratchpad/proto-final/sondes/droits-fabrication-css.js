// LA FEUILLE DE STYLE DES DROITS : pour chaque geste que la table refuse à la personne, une règle existe ET un bouton rendu avec cet attribut est `display:none` ; elle se recalcule quand on change de personne ou de droits,
// sans recharger ; aucun MutationObserver n'a été ajouté par l'étape (il se réveille sur ses propres retraits) ; la règle ne cache jamais ce que la garde laisse passer (les gestes de lecture). ⛔ 127.0.0.1 seulement.
const { L, v, ouvrirComme, fin } = require('./droits-commun.js');
const fs = require('fs'), { execSync } = require('child_process');
(async () => {
  // aucun MutationObserver DES DROITS. Restes entreprise, tour 6 : la sonde comptait « pas plus que la branche d'avant l'étape » (5 observateurs au commit 5616202) ; or QUATRE autres chantiers en ont ajouté depuis
  // (fond de la fenêtre, veille des panneaux, repère de défilement, pose du témoin de connexion) : le défaut était dans la SONDE, pas dans la page. Ce qui compte, c'est que la feuille des droits (droitsMaj, droits-css)
  // ne s'abonne à rien : on liste CHAQUE observateur de la page, on le rattache à sa fonction, et on exige qu'aucun ne soit celui des droits et qu'aucun ne soit inconnu.
  const page = fs.readFileSync(require('./droits-recensement.js').PAGE, 'utf8');
  const OBS = [...page.matchAll(/new MutationObserver\(([^\n]{0,260})/g)].map(m => m[1]);
  const CONNUS = ['docBarres', 'appliquerMode', 'fond', 'veille', 'typo(', 'defileRepereTout', 'dtAmeliorer', 'metiersTextes', 'cnxTestPoser'];
  const inconnus = OBS.filter(t => !CONNUS.some(k => t.includes(k))), desDroits = OBS.filter(t => /droits|droitsMaj|droits-css/.test(t));
  v(`aucun MutationObserver des droits : ${OBS.length} observateurs dans la page, tous rattachés à un autre chantier (barres, thème, fond, veille, défilement, dates, métier, connexion), aucun inconnu, aucun pour les droits`, OBS.length === 9 && inconnus.length === 0 && desDroits.length === 0, { n:OBS.length, inconnus, desDroits });
  const c = await ouvrirComme({ k:'rp', prenom:'Rémi', nom:'Poulain', pd:'resp', terrain:false, cases:Object.fromEntries(['planif', 'inter', 'crm', 'ventes', 'compta', 'stock', 'temps', 'com', 'achats', 'admin'].map(k => [k, '1000'])), sp:{} });
  const r = await c.p.evaluate(() => { const p = eqDe('rp'), vus = []; let nRegles = 0, nCaches = 0, nLecture = 0, faux = [];
    document.getElementById('droits-css') || droitsMaj();
    Object.entries(GESTES).forEach(([fam, E]) => ['c', 'm', 's'].forEach(x => Object.keys(GESTES_TJ[fam][x]).forEach(verbe => { const cat = GESTES_TJ[fam][x][verbe] || E.k; if (!cat) return;
      const b = document.createElement('button'); b.setAttribute('data-' + fam, verbe + '|essai'); b.type = 'button'; b.textContent = fam + verbe; document.body.appendChild(b); const cache = getComputedStyle(b).display === 'none'; b.remove(); nRegles++;
      if (!peut(cat, x, p)) { if (cache) nCaches++; else faux.push(fam + '|' + verbe + ' visible'); } else if (cache) faux.push(fam + '|' + verbe + ' caché alors que permis'); })));
    // la lecture n'est jamais cachée
    [['go', 'planning'], ['onglet', 'x'], ['ac', 'onglet'], ['cx', 'fiche'], ['eq', 'fiche'], ['vh', 'fiche'], ['mat', 'bord']].forEach(([f, verbe]) => { const b = document.createElement('button'); b.setAttribute('data-' + f, verbe + '|x'); document.body.appendChild(b); if (getComputedStyle(b).display !== 'none') nLecture++; else faux.push('lecture cachée : ' + f + '|' + verbe); b.remove(); });
    return { nRegles, nCaches, nLecture, faux:faux.slice(0, 15), taille:(document.getElementById('droits-css') || {}).textContent.length }; });
  v('pour chaque verbe d\'écriture de la table refusé à la personne, le bouton est caché (population : plus de 300 verbes, plus de 250 cachés)', r.nRegles > 300 && r.nCaches > 250 && r.faux.length === 0, r);
  v('les gestes de lecture ne sont jamais cachés (sept essais)', r.nLecture === 7, r);
  // recalcul : un droit rendu et la règle disparaît, sans recharger
  const t = await c.p.evaluate(() => { const avant = droitsCss().length; eqDe('rp').droits.cats.crm = { v:1, c:1, m:1, s:1 }; droitsMaj(); const b = document.createElement('button'); b.setAttribute('data-action', 'clientNouveau'); document.body.appendChild(b); const visible = getComputedStyle(b).display !== 'none'; b.remove(); return { avant, apres:droitsCss().length, visible }; });
  v('rendre « Clients › Créer » : la règle disparaît à l\'instant et le bouton reparaît', t.apres < t.avant && t.visible, t);
  const g = await c.p.evaluate(() => { sessionOuvrir('marc'); droitsMaj(); return (document.getElementById('droits-css') || {}).textContent; }); await L.calme(c.p, 300);
  v('changer de personne (Marc) : la feuille se vide', g === '', g && g.length);
  v('aucune erreur de page', c.err.length === 0, c.err.slice(0, 2));
  await L.fin(c); await fin();
})().catch(e => { console.error(e); process.exit(1); });
