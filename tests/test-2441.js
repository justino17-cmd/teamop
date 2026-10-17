/* ══ LA FICHE DE CONTACT PARTAGÉE : L'ÉTAT VIENT DU SERVICE, PAS D'UNE MÉMOIRE DE LA PAGE (lot m09 : medias#5, contacts#5, medias@7) ═════════════════════════════════
   Trois constats du testeur, une seule carte :
   · medias#5 — Ben touche « Ajouter » sur la fiche de Cléo : « Demande envoyée ». Il recharge la page : « Ajouter » est revenu. L'état vivait dans une `Map` de la page
     (`fichesDemandees`), perdue au rechargement ; un second « Ajouter » répondait sans doublon, donc un simple écran qui ment ;
   · contacts#5 — Cléo accepte : chez Ben, la carte restait « Écrire / Demande envoyée » jusqu'au rechargement (la liste des contacts était relue, la conversation n'était
     pas redessinée, et la `Map` de la page primait sur le service) ;
   · medias@7 — la fiche écrivait « CL » et « Cléo » là où l'avatar de Cléo dit « CP » et son nom « Cléo Petit » partout ailleurs.

   Ce que ce fichier garde : le VRAI service, le VRAI `source-serveur.js` (le module que la page appelle), deux instances pour Ben (la page avant et après rechargement), et la
   VRAIE `htmlCarteFiche` de la page, nourrie de ce que la source rend.
     1. le service dit lui-même qu'une demande est en cours (`demande`), pour celui qui l'a faite et pour lui seul ;
     2. la source le rend tel quel, tout de suite après le geste, et APRÈS rechargement (une autre instance) ;
     3. l'acceptation de l'autre redessine la conversation (un événement `conversation`, sans geste de Ben) et la carte devient « Écrire » seul ;
     4. initiales et nom de la fiche sont ceux de l'avatar (une personne connue), la page écrit le nom complet ;
     5. la page ne garde plus aucune mémoire de la demande (aucun `fichesDemandees` dans le code) ;
     6. (relecture du lot) « annuler la demande » : la carte redevient « Ajouter » tout de suite ET après rechargement ;
     7. « Écrire » à une personne inconnue vaut une demande (la carte le dit sans rechargement) ; une demande REFUSÉE reste « envoyée » (le refus ne se dit pas) ;
     8. une fois contacts, plus aucune demande — même quand la ligne de la demande est restée en base (le contact s'est fait par un lien), côté service ET côté source ;
     9. « Demander » depuis la recherche met à jour la fiche déjà lue. */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const T = require('./outils-msg');
T.sauterSiSansDependances();
const { v, vrai, fin } = T.compteur();
const OPMSG = require(path.join(T.SERVICE, 'public', 'api.js'));
const { creerSourceServeur } = require(path.join(T.SERVICE, 'public', 'source-serveur.js'));
const att = (cond, ms = 8000) => T.attendre(cond, ms, 10);
setTimeout(() => { console.log('  ✗ délai global du banc dépassé (120 s)'); process.exit(1); }, 120000).unref();

/* ── les fonctions RÉELLES de la page (aperçu) ── */
const PAGE = fs.readFileSync(path.join(T.RACINE, 'apercu', 'opmessages', 'index.html'), 'utf8');
const JS = ((/<script>([\s\S]*?)<\/script>/.exec(PAGE) || [, ''])[1]).replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/(^|\s)\/\/\s.*$/gm, ' ');
function decl(debut) {
  const i = JS.indexOf(debut); if (i < 0) return '';
  let j = JS.indexOf('{', i + debut.length - 1), n = 0, q = null;
  for (; j < JS.length; j++) {
    const ch = JS[j];
    if (q) { if (ch === '\\') { j++; continue; } if (ch === q) q = null; continue; }
    if (ch === "'" || ch === '"' || ch === '`') { q = ch; continue; }
    if (ch === '{') n++;
    else if (ch === '}') { n--; if (n === 0) return JS.slice(i, j + 1); }
  }
  return '';
}
const ligne = debut => { const i = JS.indexOf(debut); return i < 0 ? '' : JS.slice(i, JS.indexOf('\n', i)); };
function faireFiche() {
  const ctx = { console }; vm.createContext(ctx);
  vm.runInContext(`const CAP = { invitations: true };\nconst icone = () => '';\nconst avatar = a => '<av ' + a.initiales + '>';\n${ligne('const esc = ')}\n${ligne('const fichesDemandees = ')}\n${decl('function htmlCarteFiche(')}\nthis.f = htmlCarteFiche;`, ctx, { timeout: 3000 });
  return ctx.f;
}
const FICHE = faireFiche();
const texte = h => h.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

(async () => {
  const NOMS = { ana: 'Ana Martin', ben: 'Ben Durand', cleo: 'Cléo Petit', dan: 'Dan Roux', eve: 'Eve Blanc', fay: 'Fay Noir' };
  const MDP = Object.fromEntries(Object.keys(NOMS).map(k => [k, 'pw-' + k + '-12345']));
  const og = await T.fauxOpGestion(Object.fromEntries(Object.keys(NOMS).map(k => [k, { pass: MDP[k], nom: NOMS[k], actif: true }])));
  const svc = await T.lancerService({ urlGestion: og.url });
  const sources = [];
  const ouvrirSource = async (login, enveloppe) => {
    const nav = T.navigateur(svc.base);
    const faux = { priseEnCharge: () => ({ ok: false, raison: 'navigateur' }), permission: () => 'default', visible: () => true, surMessage: () => {}, abonnementActuel: async () => null };
    const src = creerSourceServeur({ OPMSG, base: svc.base, fetch: enveloppe ? enveloppe(nav.fetch) : nav.fetch, EventSource: nav.EventSource, navigateur: faux, attente: () => 60, attenteEnvoi: () => 120, delaiSaisieMs: 500, delaiRelireMs: 5 });
    await src.connexion(login, MDP[login]); const d = await src.demarrer();
    if (!d.connecte) throw new Error('démarrage refusé : ' + JSON.stringify(d));
    sources.push(src); return src;
  };
  try {
    const P = {}; for (const l of Object.keys(NOMS)) P[l] = await T.connecter(svc, og, l, MDP[l]);
    const relier = async (x, y) => { const l = await x.post('/api/contacts/lien', {}); await y.post('/api/liens/accepter', { code: l.j.code }); };
    await relier(P.ana, P.ben); await relier(P.ana, P.cleo);        // Ana connaît les deux ; Ben et Cléo ne se connaissent pas
    for (const k of ['dan', 'eve', 'fay']) await relier(P.ana, P[k]);   // …et Dan, Eve, Fay (les sections 6 à 9)
    const G = (await P.ana.post('/api/conversations/groupe', { nom: 'Chantier Nord', membres: [P.ben.moi.id] })).j.conversation.id;
    const r = await P.ana.post('/api/conversations/' + G + '/messages', { cid: 'cid-fiche-1', type: 'contact', uid: P.cleo.moi.id });
    if (r.code !== 201) throw new Error('la fiche n\'est pas partie (' + r.code + ')');
    const seq = r.j.seq;
    const carte = async (S) => { const c = await S.ouvrir(G); const m = c.messages.find(x => x.carteContact); return m ? { m, f: m.carteContact } : null; };

    console.log('\n1. Le service dit lui-même qu\'une demande est en cours — à celui qui l\'a faite, et à lui seul');
    const lireMeta = async (X) => ((await X.get('/api/conversations/' + G + '/messages')).j.messages.find(m => m.seq === seq) || {}).meta;
    const meta0 = await lireMeta(P.ben);
    vrai('(population) Ben lit la fiche de Cléo : son identifiant et son prénom', !!meta0 && meta0.uid === P.cleo.moi.id && meta0.prenom === 'Cléo');
    v('avant tout geste : aucune demande en cours', meta0.demande === true, false);
    const ben1 = await ouvrirSource('ben');
    const c0 = await carte(ben1);
    vrai('(population) la source de Ben rend la carte', !!c0);
    v('la source de Ben : pas contact, pas de demande, l\'action « Ajouter » (la page écrit ce que la source dit)', [c0.f.contact, c0.f.demande === true, /Ajouter/.test(texte(FICHE(c0.m, 'recu'))), /Demande envoyée/.test(texte(FICHE(c0.m, 'recu')))], [false, false, true, false]);

    console.log('\n2. « Ajouter » : « Demande envoyée » tout de suite — et APRÈS rechargement (une autre instance de la source)');
    const rep = await ben1.demanderCarte(G, seq);
    v('le service répond « envoyee »', rep, 'envoyee');
    const c1 = await carte(ben1);
    v('juste après le geste : « Demande envoyée », plus « Ajouter »', [c1.f.demande === true, /Demande envoyée/.test(texte(FICHE(c1.m, 'recu'))), /Ajouter/.test(texte(FICHE(c1.m, 'recu')))], [true, true, false]);
    const metaB = await lireMeta(P.ben), metaA = await lireMeta(P.ana);
    v('⛔ le service le dit à Ben (celui qui a demandé), pas à Ana qui a partagé la fiche', [metaB.demande === true, metaA.demande === true], [true, false]);
    const ben2 = await ouvrirSource('ben');       // « il recharge la page » : une source neuve, sans mémoire
    const c2 = await carte(ben2);
    vrai('(population) la source rechargée rend la carte', !!c2);
    v('⛔ APRÈS rechargement : toujours « Demande envoyée », « Ajouter » ne revient pas (l\'état vient du service)', [c2.f.demande === true, /Demande envoyée/.test(texte(FICHE(c2.m, 'recu'))), /Ajouter/.test(texte(FICHE(c2.m, 'recu')))], [true, true, false]);
    const rep2 = await ben2.demanderCarte(G, seq);
    v('(le second « Ajouter » d\'avant : le service répondait déjà « deja_envoyee » — l\'écran ne devait donc jamais le proposer)', rep2, 'deja_envoyee');

    console.log('\n3. L\'autre accepte : la carte de Ben se redessine toute seule (sans rechargement, sans geste)');
    let conversations = 0; const arret = ben2.ecouter ? ben2.ecouter(e => { if (e && e.type === 'conversation' && e.id === G) conversations++; }) : null;
    const avant = conversations;
    const ok = await P.cleo.post('/api/contacts/demandes/repondre', { id: P.ben.moi.id, accepter: true });
    v('Cléo accepte la demande de Ben', [ok.code, ok.j.resultat], [200, 'acceptee']);
    v('⛔ le service ne dit plus « demande » à Ben une fois contacts (la demande est effacée à l\'acceptation)', (await lireMeta(P.ben)).demande === true, false);
    const devenue = await att(async () => { const c = await carte(ben2); return c && c.f.contact === true ? c : null; });
    vrai('(population) la carte de Ben dit que Cléo est un contact', !!devenue);
    v('⛔ la source a REDESSINÉ la conversation sans geste de Ben (un événement « conversation » est parti après l\'acceptation)', conversations > avant, true);
    const t3 = texte(FICHE(devenue.m, 'recu'));
    v('la carte : « Écrire » seul — plus « Demande envoyée », plus « Ajouter »', [/Écrire/.test(t3), /Demande envoyée/.test(t3), /Ajouter/.test(t3)], [true, false, false]);
    if (typeof arret === 'function') arret();

    console.log('\n4. Les initiales et le nom de la fiche sont ceux de l\'avatar (une personne connue)');
    const cleoVue = ben2.personne(P.cleo.moi.id);
    vrai('(population) Cléo est connue de la source de Ben (contact) : « Cléo Petit »', !!cleoVue && cleoVue.nom === 'Cléo Petit');
    v('la fiche porte les initiales de l\'avatar (« CP »), pas « CL » — et le nom complet', [devenue.f.initiales, devenue.f.nom], [cleoVue.initiales, 'Cléo Petit']);
    v('…« CP », en toutes lettres (le banc ne recopie pas la source : c\'est le prénom + le nom)', devenue.f.initiales, 'CP');
    const t4 = texte(FICHE(devenue.m, 'recu'));
    vrai('la page écrit le nom complet (« Cléo Petit ») sur la fiche, avec les initiales de l\'avatar', /Cléo Petit/.test(t4) && /<av CP>/.test(FICHE(devenue.m, 'recu')));
    const inconnue = FICHE({ id: 'm1', carteContact: { uid: 'p_x', prenom: 'Léa', identifiant: 'Léa#1234', moi: false, contact: false, avatar: 0, initiales: 'LÉ' } }, 'recu');
    vrai('une personne connue par son seul prénom : la fiche garde le prénom (aucun nom inventé)', /Léa/.test(texte(inconnue)) && !/undefined|null/.test(inconnue));

    console.log('\n5. La page ne garde plus aucune mémoire de la demande');
    vrai('⛔ plus aucun `fichesDemandees` dans le code de la page (hors commentaires) : l\'état est celui du service', !/fichesDemandees/.test(JS));

    /* ── relecture du lot : les gestes qui défont ou qui ne passent pas par « Ajouter » ── */
    const fiches = {};
    for (const k of ['dan', 'eve', 'fay']) {
      const rr = await P.ana.post('/api/conversations/' + G + '/messages', { cid: 'cid-fiche-' + k, type: 'contact', uid: P[k].moi.id });
      if (rr.code !== 201) throw new Error('la fiche de ' + k + ' n\'est pas partie (' + rr.code + ')');
      fiches[k] = rr.j.seq;
    }
    const carteDe = async (S, k) => { const c = await S.ouvrir(G); const m = c.messages.find(x => x.carteContact && x.carteContact.uid === P[k].moi.id); return m ? { m, f: m.carteContact, t: texte(FICHE(m, 'recu')) } : null; };
    /* [contact, demande, « Demande envoyée », « Ajouter », « Écrire »] — « Écrire » est toujours là (une invitation si on n'est pas contacts) */
    const etatCarte = (c) => [c.f.contact === true, c.f.demande === true, /Demande envoyée/.test(c.t), /Ajouter/.test(c.t), /Écrire/.test(c.t)];
    const lireMetaDe = async (X, k) => ((await X.get('/api/conversations/' + G + '/messages')).j.messages.find(m => m.seq === fiches[k]) || {}).meta;

    console.log('\n6. Annuler la demande : « Ajouter » revient tout de suite, et reste après rechargement');
    const ben3 = await ouvrirSource('ben');
    const d0 = await carteDe(ben3, 'dan');
    vrai('(population) la carte de Dan est rendue, « Ajouter » proposé', !!d0 && /Ajouter/.test(d0.t));
    v('Ben demande Dan par la fiche', await ben3.demanderCarte(G, fiches.dan), 'envoyee');
    const d1 = await carteDe(ben3, 'dan');
    v('(population) « Demande envoyée » est bien à l\'écran avant d\'annuler', etatCarte(d1), [false, true, true, false, true]);
    v('le service dit « demande » à Ben (population de la ligne qu\'on annule)', (await lireMetaDe(P.ben, 'dan')).demande === true, true);
    await ben3.annulerDemande(P.dan.moi.id);
    const d2 = await carteDe(ben3, 'dan');
    v('⛔ juste après l\'annulation, SANS rechargement : « Ajouter » est revenu, plus « Demande envoyée »', etatCarte(d2), [false, false, false, true, true]);
    v('⛔ le service ne dit plus « demande » à Ben (la demande retirée ne compte plus : masque = 1)', (await lireMetaDe(P.ben, 'dan')).demande === true, false);
    const ben4 = await ouvrirSource('ben');
    const d3 = await carteDe(ben4, 'dan');
    v('⛔ APRÈS rechargement : toujours « Ajouter » (une demande retirée ne revient pas)', etatCarte(d3), [false, false, false, true, true]);

    console.log('\n7. « Écrire » à une inconnue vaut une demande ; un refus ne se dit pas');
    const ben5 = await ouvrirSource('ben');
    const e0 = await carteDe(ben5, 'eve');
    vrai('(population) la carte d\'Eve est rendue, « Ajouter » proposé', !!e0 && /Ajouter/.test(e0.t));
    const ec = await ben5.ecrireCarte(G, fiches.eve);
    v('Ben écrit à Eve par la fiche : une invitation (une demande)', ec.resultat, 'envoyee');
    const e1 = await carteDe(ben5, 'eve');
    v('⛔ juste après « Écrire », SANS rechargement : « Demande envoyée » (la carte suit le geste)', etatCarte(e1), [false, true, true, false, true]);
    v('le service le dit à Ben, pas à Ana', [(await lireMetaDe(P.ben, 'eve')).demande === true, (await lireMetaDe(P.ana, 'eve')).demande === true], [true, false]);
    const refus = await P.eve.post('/api/contacts/demandes/repondre', { id: P.ben.moi.id, accepter: false });
    v('Eve refuse la demande de Ben', [refus.code, refus.j.resultat], [200, 'refusee']);
    const ben6 = await ouvrirSource('ben');
    const e2 = await carteDe(ben6, 'eve');
    v('⛔ APRÈS le refus et un rechargement : toujours « Demande envoyée » (un refus ne se dit pas — « Ajouter » ne revient pas)', etatCarte(e2), [false, true, true, false, true]);

    console.log('\n8. Une fois contacts, plus aucune demande — même si la ligne de la demande est restée en base');
    const lienEve = await P.eve.post('/api/contacts/lien', {});
    const accEve = await P.ben.post('/api/liens/accepter', { code: lienEve.j.code });
    vrai('(population) Ben et Eve sont contacts par le lien d\'Eve (la demande refusée n\'a pas été effacée par ce chemin)', accEve.code === 200 || accEve.code === 201);
    v('⛔ le service ne dit plus « demande » à Ben : être contact l\'emporte sur une ligne restée en base', (await lireMetaDe(P.ben, 'eve')).demande === true, false);
    const ben7 = await ouvrirSource('ben');
    const e3 = await carteDe(ben7, 'eve');
    v('la carte d\'Eve chez Ben : « Écrire » seul', etatCarte(e3), [true, false, false, false, true]);
    /* défense en profondeur : même si un service en retard disait encore « demande » à un contact, la source ne le rendrait pas (le contact l'emporte) */
    const ben8 = await ouvrirSource('ben', (f) => async (url, init) => {
      const r = await f(url, init);
      if (!r.ok || !/\/messages/.test(String(url)) || ((init && init.method) || 'GET') !== 'GET') return r;
      const j = await r.json();
      for (const m of (j.messages || [])) if (m.meta && m.meta.k === 'contact') m.meta.demande = true;
      return new Response(JSON.stringify(j), { status: r.status, headers: { 'content-type': 'application/json' } });
    });
    const e4 = await carteDe(ben8, 'eve');
    v('⛔ même si le service disait « demande » : un contact reste « Écrire » seul (la source ne rend pas `demande` à un contact)', etatCarte(e4), [true, false, false, false, true]);

    console.log('\n9. « Demander » depuis l\'écran de recherche met à jour la fiche déjà lue');
    const ben9 = await ouvrirSource('ben');
    const f0 = await carteDe(ben9, 'fay');
    vrai('(population) la carte de Fay est rendue avec son identifiant', !!f0 && typeof f0.f.identifiant === 'string' && /Ajouter/.test(f0.t));
    const trouvee = await ben9.contactParIdentifiant(f0.f.identifiant);
    vrai('(population) Ben trouve Fay par son identifiant', trouvee.trouve === true && trouvee.id === P.fay.moi.id);
    v('Ben lui envoie une demande', await ben9.demanderContact(trouvee.id), 'envoyee');
    const f1 = await carteDe(ben9, 'fay');
    v('⛔ la fiche de Fay, déjà lue, passe à « Demande envoyée » sans rechargement', etatCarte(f1), [false, true, true, false, true]);
  } catch (e) { console.log('  ✗ le banc est mort : ' + (e && e.stack || e)); process.exitCode = 1; }
  finally {
    for (const s of sources) { try { if (s.arreter) s.arreter(); } catch (e) { /* déjà arrêté */ } }
    await svc.arreter(); await og.fermer();
  }
  fin();
})();
