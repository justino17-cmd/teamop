// Les menus qui SE DÉDUISENT des cases : pour chaque personne (les six de la démonstration + un Responsable fabriqué), le menu, la barre du bas, l'ouverture,
// les adresses ouvertes et fermées, l'adresse tapée à la main et son message, la recherche « Aller à » et les raccourcis ⌘ 1-9 (qui lisent le même menu).
// Attendus (spécification § 2.12, révisée : Julie a DIX lignes depuis que le lot Véhicules lui a ouvert « Véhicules » ; Marc 20 ; terrain 6). Chaque contrôle compte sa population.
const { L, v, ouvrirComme, etatPersonne, toast, fin } = require('./droits-commun.js');
const MARC = ['accueil', 'statistiques', 'historique', 'planning', 'interventions', 'taches', 'absences', 'clients', 'devis', 'contrats', 'boiteMail', 'comptabilite', 'achats', 'stock', 'produits', 'boxes', 'equipe', 'pointage', 'vehicules', 'entreprise'];
const ATTENDU = {
  marc:{ lignes:MARC, barre:['accueil', 'planning', 'interventions', 'clients', 'comptabilite'], ouverture:'accueil' },
  julie:{ lignes:['taches', 'interventions', 'clients', 'devis', 'contrats', 'comptabilite', 'achats', 'stock', 'produits', 'vehicules'], barre:['comptabilite', 'devis', 'clients', 'taches', 'achats'], ouverture:'comptabilite' },
  terrain:{ lignes:['majournee', 'taches', 'techfrais', 'mesheures', 'moncamion', 'absences'], barre:['majournee', 'techfrais', 'mesheures', 'taches', 'moncamion'], ouverture:'majournee' },
  resp:{ lignes:['accueil', 'statistiques', 'historique', 'taches', 'planning', 'interventions', 'absences', 'clients', 'devis', 'contrats', 'boiteMail', 'comptabilite', 'achats', 'stock', 'produits', 'boxes', 'equipe', 'pointage', 'vehicules', 'entreprise'],   /* « Mes tâches » ouvre le groupe Travail pour tout ce qui n'est pas le gérant */ barre:['accueil', 'planning', 'interventions', 'clients', 'comptabilite'], ouverture:'accueil' }
};
const egal = (a, b) => JSON.stringify(a) === JSON.stringify(b);
(async () => {
  let nPers = 0, nLignes = 0;
  for (const [qui, att] of [['marc', ATTENDU.marc], ['julie', ATTENDU.julie], ['sm', ATTENDU.terrain], ['kb', ATTENDU.terrain], ['lr', ATTENDU.terrain], ['tl', ATTENDU.terrain], ['rp', ATTENDU.resp]]) {
    const c = qui === 'rp' ? await ouvrirComme({ k:'rp', prenom:'Rémi', nom:'Poulain', pd:'resp', terrain:false }) : await ouvrirComme(qui);
    const e = await etatPersonne(c.p); nPers++; nLignes += e.lignes.length;
    v(`${qui} : le menu (${att.lignes.length} lignes, dans l'ordre)`, egal(e.lignes, att.lignes), e.lignes);
    v(`${qui} : la barre du bas`, egal(e.barre, att.barre), e.barre);
    v(`${qui} : l'ouverture (${att.ouverture})`, e.ouverture === att.ouverture, e.ouverture);
    // les adresses : ce que rlPermis ouvre = ce que le menu montre, plus les écrans « fiche » qui s'y rattachent
    const r = await c.p.evaluate(() => { const R = [...new Set([...Object.keys(vues()), ...Object.keys(ROUTE_DROIT)])].filter(x => x !== 'espaceclient'); return R.filter(x => rlPermis(x)); });
    const lignes = new Set(e.lignes), horsMenu = r.filter(x => !lignes.has(x));
    v(`${qui} : chaque ligne du menu s'ouvre (rlPermis)`, e.lignes.every(x => r.includes(x) || x === 'entreprise' && r.includes('entreprise')), e.lignes.filter(x => !r.includes(x)));
    // la recherche « Aller à » et les raccourcis lisent le MÊME menu
    const pal = await c.p.evaluate(() => ({ R:rcRubriques().map(x => x.k), aller:palEntrees().filter(x => x.g === 'Aller à').map(x => x.l) }));
    v(`${qui} : les raccourcis ⌘ 1-9 et la recherche lisent le menu (mêmes rubriques)`, egal(pal.R, e.lignes), pal.R);
    // une adresse tapée à la main : ce qui est fermé renvoie à l'ouverture et le dit
    const fermees = { marc:[['mesheures', 'Cette page n’est pas dans ton espace.'], ['majournee', 'Cette page n’est pas dans ton espace.'], ['espaceclient', 'Cette page n’est pas dans ton espace.'], ['zzz', 'Cette page n’existe pas.']],
      julie:[['planning', 'Cette rubrique est fermée à ton compte : demande à l’administrateur de la rouvrir (Équipe, tes droits).'], ['equipe', 'Cette rubrique est fermée à ton compte : demande à l’administrateur de la rouvrir (Équipe, tes droits).'], ['boiteMail', 'Cette rubrique est fermée à ton compte : demande à l’administrateur de la rouvrir (Équipe, tes droits).'], ['mesheures', 'Cette page n’est pas dans ton espace.'], ['boxes', 'Cette rubrique est fermée à ton compte : demande à l’administrateur de la rouvrir (Équipe, tes droits).']],
      sm:[['planning', 'Cette page n’est pas dans ton espace.'], ['comptabilite', 'Cette page n’est pas dans ton espace.'], ['equipe', 'Cette page n’est pas dans ton espace.']] }[qui] || [];
    let nF = 0;
    for (const [h, msg] of fermees) {
      await c.p.evaluate(x => { location.hash = '#' + x; }, h); await L.calme(c.p, 500); const t = await toast(c.p), ap = await c.p.evaluate(() => ({ h:location.hash.slice(1), role:ROLE })); nF++;
      v(`${qui} : l'adresse #${h} est refusée et DIT pourquoi`, t.includes(msg) && ap.h !== h, { t, ap });
    }
    if (fermees.length) v(`${qui} population : ${fermees.length} adresses fermées jouées`, nF === fermees.length, nF);
    v(`${qui} : aucune erreur de page`, c.err.length === 0, c.err.slice(0, 3));
    await L.fin(c);
  }
  v('population : sept personnes, des menus de 6 à 20 lignes (compté avant de conclure)', nPers === 7 && nLignes === 20 + 10 + 6 * 4 + 20, { nPers, nLignes });
  await fin();
})().catch(e => { console.error(e); process.exit(1); });
