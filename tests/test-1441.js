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
     5. la page ne garde plus aucune mémoire de la demande (aucun `fichesDemandees` dans le code). */
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
  const NOMS = { ana: 'Ana Martin', ben: 'Ben Durand', cleo: 'Cléo Petit' };
  const MDP = Object.fromEntries(Object.keys(NOMS).map(k => [k, 'pw-' + k + '-12345']));
  const og = await T.fauxOpGestion(Object.fromEntries(Object.keys(NOMS).map(k => [k, { pass: MDP[k], nom: NOMS[k], actif: true }])));
  const svc = await T.lancerService({ urlGestion: og.url });
  const sources = [];
  const ouvrirSource = async (login) => {
    const nav = T.navigateur(svc.base);
    const faux = { priseEnCharge: () => ({ ok: false, raison: 'navigateur' }), permission: () => 'default', visible: () => true, surMessage: () => {}, abonnementActuel: async () => null };
    const src = creerSourceServeur({ OPMSG, base: svc.base, fetch: nav.fetch, EventSource: nav.EventSource, navigateur: faux, attente: () => 60, attenteEnvoi: () => 120, delaiSaisieMs: 500, delaiRelireMs: 5 });
    await src.connexion(login, MDP[login]); const d = await src.demarrer();
    if (!d.connecte) throw new Error('démarrage refusé : ' + JSON.stringify(d));
    sources.push(src); return src;
  };
  try {
    const P = {}; for (const l of Object.keys(NOMS)) P[l] = await T.connecter(svc, og, l, MDP[l]);
    const relier = async (x, y) => { const l = await x.post('/api/contacts/lien', {}); await y.post('/api/liens/accepter', { code: l.j.code }); };
    await relier(P.ana, P.ben); await relier(P.ana, P.cleo);        // Ana connaît les deux ; Ben et Cléo ne se connaissent pas
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
  } catch (e) { console.log('  ✗ le banc est mort : ' + (e && e.stack || e)); process.exitCode = 1; }
  finally {
    for (const s of sources) { try { if (s.arreter) s.arreter(); } catch (e) { /* déjà arrêté */ } }
    await svc.arreter(); await og.fermer();
  }
  fin();
})();
