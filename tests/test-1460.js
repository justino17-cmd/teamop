/* ⛔ CE QUE CE FICHIER GARDE — « NOUVEAU GROUPE », « NOUVELLE DISCUSSION » ET « NOUVEL APPEL » : LES GENS QU'ON PEUT CHOISIR, LEUR LIBELLÉ, CEUX QUE LE SERVICE REFUSE, LE NOM (lot m13 ; modèles `test-995`, `test-994`).

   Cinq défauts relevés au navigateur (agents « groupes » et « appels », 17 octobre 2026), gardés ici par les VRAIES fonctions de la page, extraites de `apercu/opmessages/index.html` ET du script SERVI
   (`server-msg/public/opmsg-ui.js`), et par le VRAI `source-serveur.js` contre le VRAI service (127.0.0.1, un faux OP GESTION, aucun Internet) :

     1. groupes#9 · appels#7 — LE LIBELLÉ. La rubrique s'appelait « Contacts de l'entreprise », écrit en dur, même côté Perso au-dessus d'une liste d'amis. Elle suit le côté : Perso « Mes contacts », Pro
        « Contacts de l'entreprise » ; le compteur « n / N » compte la liste qu'on voit ;
     2. groupes#2 — LES COLLÈGUES. Côté Pro, la feuille n'offrait que les contacts personnels alors que le service accepte un collègue d'un même espace (`peutEcrire`). Elle lit désormais les collègues
        (`chargerCollegues`, relus à chaque ouverture), sans jamais proposer — côté Perso — un collègue non-contact, ni un collègue que J'AI bloqué (le service refuserait) ;
     3. groupes#1 — LE REFUS SE DIT. Un contact refusé par le service (`non_ajoutes` : il m'a bloqué) naissait absent du groupe, sans un mot. La réponse du service est lue par `source.creerGroupe`
        (`nonAjoutes`) et la page dit « Dan n'a pas pu être ajouté. » — et ne dit rien quand tout le monde est entré ;
     4. groupes@11 — LE NOM SE COMPTE EN SIGNES. `maxlength="40"` compte des unités UTF-16 : 45 émojis tapés, 20 gardés. La page coupe au signe (40 points de code), sans couper un signe en deux, et
        `source.creerGroupe` ne coupe plus à 80 UNITÉS (le service compte 80 signes).

   ⛔ UNE ASSERTION SUR UN ENSEMBLE VIDE PASSE ET NE PROUVE RIEN : chaque « absent » est précédé de la population qui aurait pu s'y trouver (les collègues LUS par le service, les contacts, les membres réels). */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const T = require('./outils-msg');
T.sauterSiSansDependances();
const { v, vrai, fin } = T.compteur();
const OPMSG = require(path.join(T.SERVICE, 'public', 'api.js'));
const { creerSourceServeur } = require(path.join(T.SERVICE, 'public', 'source-serveur.js'));

setTimeout(() => { console.log('  ✗ délai global du banc dépassé (120 s)'); process.exit(1); }, 120000).unref();

const sansCommentairesJs = (s) => s.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/(^|\s)\/\/\s.*$/gm, ' ');
const HTML = fs.readFileSync(path.join(T.RACINE, 'apercu', 'opmessages', 'index.html'), 'utf8');
const APERCU = sansCommentairesJs((/<script>([\s\S]*?)<\/script>/.exec(HTML) || [, ''])[1]);
const SERVI = sansCommentairesJs(fs.readFileSync(path.join(T.SERVICE, 'public', 'opmsg-ui.js'), 'utf8'));
const SERVI_HTML = fs.readFileSync(path.join(T.SERVICE, 'public', 'index.html'), 'utf8');

/* ── les morceaux RÉELS de la page : une tranche entre deux ancres, qu'on prouve avoir trouvée (une tranche vide passe au vert sur tout) ── */
function tranche(src, debut, finTexte) {
  const i = src.indexOf(debut), f = i < 0 ? -1 : src.indexOf(finTexte, i);
  return i >= 0 && f > i ? src.slice(i, f) : '';
}
function extraire(src) {
  const caps = /const CAP = Object\.assign\((\{[^\n]*\}), source\.capacites \|\| \{\}\);/.exec(src);
  const un = (re) => (re.exec(src) || [''])[0];
  return {
    caps: caps ? caps[1] : null,
    modesActifs: un(/const modesActifs = [^\n]+/), prenom: un(/const prenom = [^\n]+/), contactDe: un(/const contactDe = [^\n]+/), phrase: un(/const phrase = [^\n]+/),
    choix: tranche(src, 'let collegueChoix = [];', 'function construireContacts()'),
    collegues: tranche(src, 'async function chargerCollegues()', 'function candidats(deja)'),
    creer: tranche(src, src.includes('function phraseNonAjoutes(') ? 'function phraseNonAjoutes(' : 'async function creerGroupe()', 'const ND_ACTIONS = ['),   // (le code d'AVANT n'a pas la phrase : sa `creerGroupe` se joue quand même)
    nom: tranche(src, 'const NOM_GROUPE_MAX', '$(\'g-nom\').addEventListener(\'compositionend\''),
  };
}
const X = extraire(SERVI), XA = extraire(APERCU);

/* la page, sans DOM : l'état, les rendus qu'on COMPTE, la source passée en paramètre */
function faireBac(src, caps, etatDepart) {
  const ctx = { console, source: src, caps, etatDepart, Array, Set, Map, Object, JSON, Promise };
  vm.createContext(ctx);
  vm.runInContext(`
    const CAP = Object.assign(${X.caps}, caps || {});
    let etat = Object.assign({ pro: true, mode: 'pro', neuves: new Set(), creation: false, groupe: { ouvert: true, cle: 'chat', mode: 'chat', choisis: [], nom: '', photo: null, annonces: false, ephemeres: 0 } }, etatDepart);
    let CONTACTS = [];
    const rendus = { nouvelle: 0, contacts: 0, synchro: 0, mots: [], fermee: 0 };
    ${X.modesActifs}
    ${X.prenom}
    ${X.contactDe}
    ${X.phrase || "const phrase = (e, repli) => (e && e.dit ? e.phrase() : repli);"}
    const g = () => etat.groupe;
    const reu = { colleagues: null };
    const norme = s => String(s || '');
    function rendreNouvelle() { rendus.nouvelle++; }
    function construireContacts() { rendus.contacts++; }
    function synchroFeuille() { rendus.synchro++; }
    function mot(texte, duree) { rendus.mots.push({ texte, duree }); }
    async function rafraichirListe() {}
    function fermerFeuille() { rendus.fermee++; }
    const notifier = () => {};
    const $ = () => ({ textContent: '', setAttribute() {}, addEventListener() {} });
    ${X.collegues}
    ${X.choix}
    ${X.creer}
    ${X.nom}
    // (un typeof sur un nom jamais déclaré ne jette pas : sur le code d'AVANT, les assertions tombent sur le COMPORTEMENT, pas sur un ReferenceError)
    this.api = { etat: () => etat, setContacts: (l) => { CONTACTS = l; }, rendus, reu,
      libelle: () => typeof libelleContacts === 'function' ? libelleContacts() : undefined, choix: () => typeof contactsChoix === 'function' ? contactsChoix() : CONTACTS,
      charger: (cle) => { if (typeof chargerChoixCollegues === 'function') chargerChoixCollegues(cle); }, creer: () => creerGroupe(),
      phrase: (l) => typeof phraseNonAjoutes === 'function' ? phraseNonAjoutes(l) : undefined, limiter: (c) => { if (typeof limiterNomGroupe === 'function') limiterNomGroupe(c); } };
  `, ctx, { timeout: 5000 });
  return ctx.api;
}

/* une section qui jette (une fonction de la page qui n'existe pas, sur le code d'AVANT) se DIT et n'arrête pas les suivantes */
async function essai(titre, f) { try { await f(); } catch (e) { vrai('⛔ ' + titre + ' : la section est morte — ' + String(e && e.message || e).split('\n')[0], false); } }

(async () => {
  const L = ['cleo', 'ana', 'ben', 'dan', 'eve'];
  const NOMS = { cleo: 'Cléo Petit', ana: 'Ana Martin', ben: 'Ben Durand', dan: 'Dan Roux', eve: 'Eve Blanc' };
  const MDP = Object.fromEntries(L.map(k => [k, 'pw-' + k + '-12345678']));
  const og = await T.fauxOpGestion(Object.fromEntries(L.map(k => [k, { pass: MDP[k], nom: NOMS[k], actif: true }])));
  const svc = await T.lancerService({ urlGestion: og.url });
  let C = null;
  try {
    console.log('\nLes morceaux de la page : ceux du script SERVI sont ceux de l\'aperçu');
    for (const k of ['choix', 'collegues', 'creer', 'nom']) vrai('(population) « ' + k + ' » : ' + X[k].length + ' caractères dans le script servi, ' + XA[k].length + ' dans l\'aperçu', X[k].length > 200 && XA[k].length > 200);
    vrai('⛔ le générateur n\'a RIEN changé à ces morceaux : le texte est identique', ['choix', 'collegues', 'creer', 'nom'].every(k => X[k] === XA[k]));
    vrai('(population) les définitions réelles de la page (capacités, côté, prénom, contactDe) sont trouvées', !!X.caps && !!X.modesActifs && !!X.prenom && !!X.contactDe);

    /* ── le monde : Cléo (la personne qui crée), Ana et Dan ses contacts, Ben et Eve ses collègues d'« Atelier Nord » (non-contacts) ── */
    const P = {}; for (const l of L) P[l] = await T.connecter(svc, og, l, MDP[l]);
    const ids = {}; for (const l of L) ids[l] = P[l].moi.id;
    for (const l of ['ana', 'dan']) { const lien = await P[l].post('/api/contacts/lien', {}); if (lien.code !== 201) throw new Error('lien refusé pour ' + l); const r = await P.cleo.post('/api/liens/accepter', { code: lien.j.code }); if (r.code !== 200 && r.code !== 201) throw new Error('lien non accepté (' + r.code + ')'); }
    const esp = await P.cleo.post('/api/espaces', { nom: 'Atelier Nord' });
    if (esp.code !== 201) throw new Error('espace refusé : ' + esp.code + ' ' + JSON.stringify(esp.j));
    const idEspace = esp.j.espace.id;
    const inv = await P.cleo.post('/api/espaces/' + idEspace + '/invitations', { max: 5, jours: 1 });
    if (inv.code !== 201) throw new Error('invitation refusée : ' + inv.code);
    for (const l of ['ben', 'eve']) { const r = await P[l].post('/api/invitations/accepter', { code: inv.j.code }); if (r.code !== 200 && r.code !== 201) throw new Error('invitation non acceptée (' + l + ') : ' + r.code); }

    const nav = T.navigateur(svc.base);
    const faux = { priseEnCharge: () => ({ ok: false, raison: 'navigateur' }), permission: () => 'default', visible: () => true, surMessage: () => {}, abonnementActuel: async () => null };
    const src = creerSourceServeur({ OPMSG, base: svc.base, fetch: nav.fetch, EventSource: nav.EventSource, navigateur: faux, attente: () => 60, attenteEnvoi: () => 120, delaiSaisieMs: 500, delaiRelireMs: 5 });
    await src.connexion('cleo', MDP.cleo); const d = await src.demarrer();
    if (!d.connecte) throw new Error('démarrage refusé : ' + JSON.stringify(d));
    C = src;
    const caps = src.capacites || {};

    console.log('\nLe monde (population) : ce que le service rend à Cléo');
    const contacts = src.contacts();
    v('Cléo a deux contacts (Ana, Dan) ; Ben et Eve ne sont PAS ses contacts', [contacts.map(c => c.id).sort(), contacts.some(c => c.id === ids.ben || c.id === ids.eve)], [[ids.ana, ids.dan].sort(), false]);
    const lus = await src.espaceContacts(idEspace);
    v('le service lit à Cléo (administratrice) les membres de son espace : Ben et Eve y sont', lus.contacts.filter(p => !p.moi).map(p => p.id).sort(), [ids.ben, ids.eve].sort());
    vrai('les capacités du service portent `espaces` et `modes` (la page n\'offre les collègues que si le service les tient)', caps.espaces === true && caps.modes === true);

    console.log('\ngroupes#9 · appels#7 — le libellé suit le côté');
    const perso = faireBac(src, caps, { mode: 'perso' }); perso.setContacts(contacts);
    const pro = faireBac(src, caps, { mode: 'pro' }); pro.setContacts(contacts);
    await essai('groupes#9 · appels#7', async () => {
    v('Perso : « Mes contacts »', perso.libelle(), 'Mes contacts');
    v('Pro : « Contacts de l\'entreprise »', pro.libelle(), 'Contacts de l\'entreprise');
    v('sans Messages Pro du tout (aucun espace), le libellé est « Mes contacts » même si le service ne distingue pas les côtés', faireBac(src, Object.assign({}, caps, { modes: false }), { pro: false, mode: 'perso' }).libelle(), 'Mes contacts');
    vrai('la feuille ÉCRIT ce libellé (rubrique ET nom accessible du groupe) à chaque synchro, au lieu d\'un texte figé', /\$\('g-rubrique'\)\.textContent = libelleContacts\(\)/.test(APERCU) && /\$\('g-contacts'\)\.setAttribute\('aria-label', libelleContacts\(\)\)/.test(APERCU));
    vrai('⛔ le balisage ne fige plus « Contacts de l\'entreprise » dans la rubrique ni dans le groupe (aperçu et page servie)',
      [HTML, SERVI_HTML].every(h => /<span id="g-rubrique">Mes contacts<\/span>/.test(h) && /id="g-contacts" role="group" aria-label="Mes contacts"/.test(h) && !/id="g-contacts"[^>]*aria-label="Contacts de l'entreprise"/.test(h)));

    });

    console.log('\ngroupes#2 — côté Pro, les collègues sont proposés ; côté Perso, jamais');
    await essai('groupes#2', async () => {
    await perso.charger('chat');
    await T.dort(300);
    v('Perso : les contacts seulement (Ana, Dan) — Ben et Eve, collègues non-contacts, ne sont pas proposés', perso.choix().map(c => c.id).sort(), [ids.ana, ids.dan].sort());
    vrai('… et côté Perso les collègues ne sont même pas LUS (rien n\'est demandé au service pour une feuille qui ne les montre pas)', perso.reu.colleagues === null);
    vrai('(population côté Pro) avant la lecture des collègues, la feuille montre déjà les contacts', pro.choix().length === 2);
    pro.etat().groupe.cle = 'chat';
    pro.charger('chat');
    await T.attendre(() => pro.rendus.contacts > 0, 8000, 10);
    const choixPro = pro.choix();
    v('Pro : Ana, Dan (contacts) ET Ben, Eve (collègues) — quatre personnes, le compteur « n / N » en compte quatre', [choixPro.map(c => c.id).sort(), choixPro.length], [[ids.ana, ids.ben, ids.dan, ids.eve].sort(), 4]);
    const ben = choixPro.find(c => c.id === ids.ben);
    v('un collègue porte son nom et dit d\'où il vient (« Collègue — Atelier Nord »), comme dans les invités d\'une réunion', [ben && ben.nom, ben && ben.role], ['Ben Durand', 'Collègue — Atelier Nord']);
    vrai('Cléo elle-même n\'est pas proposée', !choixPro.some(c => c.id === ids.cleo));
    vrai('la feuille est RECONSTRUITE quand les collègues arrivent (la liste affichée se complète)', pro.rendus.contacts >= 1 && pro.rendus.synchro >= 1);
    /* une feuille ouverte entre-temps ne reçoit pas les collègues demandés par la précédente */
    const autre = faireBac(src, caps, { mode: 'pro' }); autre.setContacts(contacts);
    autre.etat().groupe.cle = 'appel';
    autre.charger('chat');           // demandée par la feuille « chat », qui n'est plus celle d'« appel »
    await T.attendre(() => autre.reu.colleagues !== null, 8000, 10); await T.dort(100);
    v('(population) les collègues ont été lus, mais une autre feuille est ouverte : rien n\'est reconstruit', [autre.reu.colleagues.length, autre.rendus.contacts, autre.rendus.nouvelle], [2, 0, 0]);
    /* « Nouvelle discussion » et « Nouvel appel » */
    const nd = faireBac(src, caps, { mode: 'pro' }); nd.setContacts(contacts); nd.etat().groupe = Object.assign(nd.etat().groupe, { cle: 'nouvelle', mode: 'nouvelle' });
    nd.charger('nouvelle'); await T.attendre(() => nd.rendus.nouvelle > 0, 8000, 10);
    v('« Nouvelle discussion » (Pro) : la liste est redessinée avec les quatre personnes', [nd.rendus.nouvelle, nd.choix().length], [1, 4]);
    const ap = faireBac(src, caps, { mode: 'pro' }); ap.setContacts(contacts); ap.etat().groupe = Object.assign(ap.etat().groupe, { cle: 'appel', mode: 'appel' });
    ap.charger('appel'); await T.attendre(() => ap.rendus.contacts > 0, 8000, 10);
    v('« Nouvel appel » (Pro) : la même liste (le service laisse appeler un collègue : `peutEcrire`)', ap.choix().length, 4);
    /* un collègue que J'AI bloqué (l'administratrice lit la liste COMPLÈTE de son espace) n'est pas proposé */
    await src.bloquer(ids.eve);
    const bq = faireBac(src, caps, { mode: 'pro' }); bq.setContacts(src.contacts());
    bq.charger('chat'); await T.attendre(() => bq.reu.colleagues !== null, 8000, 10); await T.dort(100);
    v('(population) le service lit TOUJOURS Eve parmi les membres de l\'espace de Cléo (administratrice) …', (await src.espaceContacts(idEspace)).contacts.some(p => p.id === ids.eve), true);
    v('… mais bloquée par Cléo, elle n\'est plus proposée ; Ben reste', bq.choix().map(c => c.id).sort(), [ids.ana, ids.ben, ids.dan].sort());
    await src.debloquer(ids.eve);
    v('le service accepte un groupe avec un collègue non-contact (ce que la page propose désormais est faisable)', (await P.cleo.post('/api/conversations/groupe', { nom: 'Collègues', membres: [ids.ben] })).code, 201);
    vrai('l\'ouverture d\'une feuille (« Nouveau groupe », « Nouvel appel », « Nouvelle discussion ») lit les collègues, et « Nouvelle discussion » se dessine avec la liste complète',
      /mode === 'chat' \|\| etat\.groupe\.mode === 'appel' \|\| etat\.groupe\.mode === 'nouvelle'\) \{ collegueChoix = \[\];[^\n]*chargerChoixCollegues\(etat\.groupe\.cle\);/.test(APERCU) && /ndModele\(contactsChoix\(\), etat\.conversations, G\.recherche\)/.test(APERCU)
      && /const choix = contactsChoix\(\);\s*\$\('g-contacts'\)\.innerHTML/.test(APERCU) && /' \/ ' \+ choix\.length/.test(APERCU));

    });

    console.log('\ngroupes#1 — un contact que le service refuse se DIT');
    await essai('groupes#1', async () => {
    const sheet = faireBac(src, caps, { mode: 'pro' });
    const avantBlocage = src.contacts(); sheet.setContacts(avantBlocage);
    vrai('(population) Dan est encore dans les contacts de la feuille au moment où elle s\'ouvre', avantBlocage.some(c => c.id === ids.dan));
    await P.dan.post('/api/contacts/bloquer', { uid: ids.cleo });
    sheet.etat().groupe.choisis = [ids.dan, ids.ana]; sheet.etat().groupe.nom = 'Avec bloqueur';
    await sheet.creer();
    const dit = sheet.rendus.mots;
    v('⛔ la page DIT qui n\'a pas pu être ajouté (le nom, pas un identifiant), assez longtemps pour être lu', [dit.length, dit[0] && dit[0].texte, dit[0] && dit[0].duree > 3000], [1, 'Dan n\'a pas pu être ajouté.', true]);
    const liste = await src.lister(true);
    const g1 = liste.find(c => c.type === 'groupe' && /Avec bloqueur/.test(c.nom));
    const m1 = g1 ? await src.infos(g1.id) : null;
    v('(population) le groupe existe, avec Cléo et Ana seulement — Dan, coché à l\'écran, n\'y est pas', [!!g1, m1 && m1.membres.map(m => m.id).sort()], [true, [ids.ana, ids.cleo].sort()]);
    vrai('la feuille se ferme (le groupe est créé) et la conversation neuve est marquée', sheet.rendus.fermee === 1 && sheet.etat().neuves.size === 1);
    /* deux refusés : la phrase s'accorde */
    v('la phrase s\'accorde : deux · trois personnes', [sheet.phrase(['Dan', 'Eve']), sheet.phrase(['Dan', 'Eve', 'Max'])], ['Dan et Eve n\'ont pas pu être ajoutés.', 'Dan, Eve et Max n\'ont pas pu être ajoutés.']);
    /* tout le monde entre : RIEN n'est dit */
    const bon = faireBac(src, caps, { mode: 'pro' }); bon.setContacts(src.contacts());
    bon.etat().groupe.choisis = [ids.ana]; bon.etat().groupe.nom = 'Tout le monde entre';
    await bon.creer();
    v('(contre-épreuve) quand tout le monde est entré, aucun message d\'échec — et le groupe existe', [bon.rendus.mots.length, bon.rendus.fermee, (await src.lister(true)).some(c => /Tout le monde entre/.test(c.nom))], [0, 1, true]);
    /* le module de données porte la liste des refusés */
    const brut = await src.creerGroupe({ nom: 'Module', membres: [ids.dan, ids.ana] });
    v('`source.creerGroupe` rend les refusés (`nonAjoutes`, des identifiants) ; une réponse sans refusé en rend une liste vide', [brut.nonAjoutes, (await src.creerGroupe({ nom: 'Module 2', membres: [ids.ana] })).nonAjoutes], [[ids.dan], []]);

    });

    console.log('\ngroupes@11 — le nom se compte en signes');
    await essai('groupes@11', async () => {
    const champ = (valeur) => { const c = { value: valeur }; return c; };
    const nm = faireBac(src, caps, { mode: 'pro' });
    const c45 = champ('😀'.repeat(45));
    nm.limiter(c45);
    v('45 émojis tapés : 40 signes gardés (avant : 20, la limite comptait des unités UTF-16)', [Array.from(c45.value).length, nm.etat().groupe.nom === c45.value], [40, true]);
    const cmix = champ('é' + '😀'.repeat(50));
    nm.limiter(cmix);
    v('un signe n\'est jamais coupé en deux : aucune moitié de paire de substitution en bout de nom', [Array.from(cmix.value).length, /[\uD800-\uDBFF]$/.test(cmix.value)], [40, false]);
    const ctexte = champ('a'.repeat(39)); nm.limiter(ctexte);
    v('39 lettres ordinaires : rien n\'est touché (population : le nom est resté de 39 signes)', Array.from(ctexte.value).length, 39);
    v('40 lettres : gardées ; 41 : la 41e est refusée', [(() => { const c = champ('b'.repeat(40)); nm.limiter(c); return c.value.length; })(), (() => { const c = champ('b'.repeat(41)); nm.limiter(c); return c.value.length; })()], [40, 40]);
    vrai('le champ n\'a plus de `maxlength` (il compterait des unités UTF-16) — aperçu et page servie', [HTML, SERVI_HTML].every(h => { const m = /<input[^>]*id="g-nom"[^>]*>/.exec(h); return !!m && !/maxlength/.test(m[0]); }));
    vrai('la composition (clavier chinois, accents morts) est attendue jusqu\'à sa fin avant de couper', /addEventListener\('input', e => \{ if \(!e\.isComposing\) limiterNomGroupe\(e\.target\)/.test(APERCU) && /addEventListener\('compositionend', e => limiterNomGroupe\(e\.target\)\)/.test(APERCU));
    const gros = await src.creerGroupe({ nom: '😀'.repeat(45), membres: [ids.ana] });
    v('le module de données ne coupe plus à 80 UNITÉS : 45 émojis arrivent entiers au service (qui compte 80 signes)', Array.from(String(gros.court || gros.nom).replace(/\s*\(\d+\)$/, '')).filter(x => x === '😀').length, 45);
    const trop = await src.creerGroupe({ nom: '😀'.repeat(90), membres: [ids.ana] });
    vrai('… et 90 émojis sont coupés à 80 SIGNES (jamais au milieu d\'un émoji)', Array.from(String(trop.court || trop.nom)).filter(x => x === '😀').length === 80 && !/[\uD800-\uDBFF]($|\s|\()/.test(String(trop.court || trop.nom)));
    });
  } catch (e) { console.log('  ✗ le banc est mort : ' + (e && e.stack || e)); process.exitCode = 1; }
  finally {
    try { if (C && C.arreter) C.arreter(); } catch (e) { /* déjà arrêté */ }
    await svc.arreter(); await og.fermer();
  }
  fin();
})();
