// « Mon entreprise » : plus aucune phrase ne renvoie à un écran « Paramètres » qui n'a jamais existé. On recense les phrases VISIBLES de chaque
// écran du gérant (le DOM relu, pas le fichier), les panneaux qui en parlaient, la visite « à venir » et « Comment ça marche » ; la seule trace permise
// est la colonne « avant » du guide des nouveautés (NV_PLACE : c'est l'ancienne application, pas un renvoi). Les créneaux renvoient à Mon entreprise par un LIEN.
// ⛔ 127.0.0.1 seulement. Chaque contrôle compte sa population (écrans lus) avant de conclure.
const fs = require('fs'), path = require('path');
const { L, v, ouvrirEnt, fin } = require('./entreprise-commun.js');
const PAGE = fs.readFileSync(path.join(L.RACINE, 'apercu', 'prototype-op-gestion.html'), 'utf8');
(async () => {
  // le fichier : le mot ne reste nulle part (le guide refait du 17 novembre ne cite plus l'ancienne ligne « Boîtes mail (Paramètres) »)
  const L1 = PAGE.split('\n').map((l, i) => [i + 1, l]).filter(([, l]) => /Paramètres/.test(l));
  v('dans le fichier : « Paramètres » ne reste nulle part (le guide ne cite plus l’ancienne application ligne à ligne)', L1.length === 0, L1.map(([n, l]) => n + ' ' + l.slice(0, 80)));
  const c = await ouvrirEnt({ profil:'mac' });
  const routes = await c.p.evaluate(() => rlLignes().map(l => l.k));
  let lus = 0;
  for (const r of routes) {
    await L.aller(c.p, r); const t = await c.p.evaluate(() => document.querySelector('#contenu').innerText); lus++;
    v(`écran « ${r} » : aucune phrase ne renvoie à « Paramètres »`, !/Paramètres/.test(t), (t.match(/.{30}Paramètres.{20}/) || [''])[0]);
  }
  v('population : écrans du gérant lus', lus >= 20, lus);
  // les panneaux qui en parlaient
  const P = await c.p.evaluate(() => { const out = {}; const lire = n => (document.querySelector('#calque .panneau') || { textContent:'' }).textContent.replace(/\s+/g, ' ');
    panneauReglagesRdv(); out.rdv = lire(); fermerPanneau();
    ACTIONS_CREA.cAjoutType(); out.type = lire(); fermerPanneau();
    ACTIONS.commentAuto(); out.comment = lire(); fermerPanneau();
    ouvrirCreation({}); CREA.vue = 'jour'; rendre(); out.creation = document.getElementById('fenetre').textContent.replace(/\s+/g, ' '); out.lienCreation = !!document.querySelector('#fenetre [data-go="entreprise"]'); fermerCreation();
    return out; });
  v('panneau « Rendez-vous en ligne » : surtitre « Planning »', /^✕?Planning/.test(P.rdv) && !/Paramètres/.test(P.rdv), P.rdv.slice(0, 40));
  v('« Ajouter un type » : la parenthèse « réglable aussi dans Paramètres » est retirée', !/Paramètres/.test(P.type) && /Il sera proposé pour toutes les prochaines interventions\./.test(P.type), P.type);
  v('« Comment ça marche » : aucun renvoi à Paramètres', !/Paramètres|dans tes réglages/.test(P.comment), P.comment.slice(0, 60));
  v('la création d’intervention : aide des créneaux « (tes horaires, dans Mon entreprise) » avec un LIEN', /tes horaires, dans Mon entreprise/.test(P.creation) && P.lienCreation && !/Paramètres/.test(P.creation), (P.creation.match(/.{40}tes horaires.{30}/) || [''])[0]);
  const avenir = await c.p.evaluate(() => { return document.documentElement.innerHTML.includes('ton entreprise, l’équipe, les chiffres'); });
  v('la visite « à venir » : « Patron : ton entreprise, l’équipe, les chiffres »', avenir, avenir);
  v('aucune erreur de page', c.err.length === 0, c.err);
  await L.fin(c); await fin();
})();
