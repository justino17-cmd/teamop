/* ⛔ CE QUE CE FICHIER GARDE — LA PAGE D'OP MESSAGES APRÈS LES DÉCISIONS DE JUSTIN DU 26 OCTOBRE 2026 (« fait les 18 », parties contacts / groupes / conversations / pro / temps réel).
   Les VRAIES fonctions de `apercu/opmessages/index.html` sont exécutées dans un bac à sable (modèle `test-2553`), le DOM étant remplacé par des éléments de poche ; ce qui touche le
   DOM de bout en bout (le champ qui disparaît, le menu qui s'ouvre au doigt) vit dans la sonde navigateur `tests/sonde-opmessages-groupes-conversations.js`.

     · #16 (n#5) — UNE SEULE LIMITE pour le nom d'un groupe : 80 signes, à la création comme au renommage (`NOM_GROUPE_MAX` ; `NOM_RENOMMAGE_MAX` n'existe plus) ;
     · #10 (groupes@5) — sans nom saisi, un groupe s'appelle par les prénoms de ses membres (« Léa, Hugo et 2 autres »), et c'est CE nom que `creerGroupe` envoie au service ;
     · #13 (conversations@1) — une conversation épinglée n'est qu'EN HAUT : jamais deux fois à l'écran, quel que soit l'état de la liste ; le geste « Désépingler » est sur l'épingle ;
     · #11 (groupes@3) — un canal supprimé se dit « supprimé » ; sans l'indication du service, la phrase d'avant ;
     · #15 (temps-reel@3) — en groupe, « … écrit » dit le prénom ; à deux, rien de changé ;
     · #14 (pro@6) — la ligne « Confirmer l'envoi » est masquée en Perso (elle ne vaut que du côté Pro) ;
     · #1 (contacts#1) — la conversation d'un contact bloqué se lit sans champ pour écrire (une phrase, un geste « Débloquer »).
   ⛔ Un motif de banc vise du CODE, jamais une phrase : le script est lu SANS ses commentaires. Et chaque absence est précédée de la population qu'elle aurait pu compter. */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const T = require('./outils-msg');
const { v, vrai, fin } = T.compteur();
const RACINE = process.env.OPMSG_RACINE ? path.resolve(process.env.OPMSG_RACINE) : path.join(__dirname, '..');
const PAGE = fs.readFileSync(path.join(RACINE, 'apercu/opmessages/index.html'), 'utf8');
const script = (/<script>([\s\S]*?)<\/script>/.exec(PAGE) || [, ''])[1];
const sansCommJs = s => s.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/(^|\s)\/\/\s.*$/gm, ' ');
const JS = sansCommJs(script);
const CSS = ((/<style>([\s\S]*?)<\/style>/.exec(PAGE) || [, ''])[1]).replace(/\/\*[\s\S]*?\*\//g, ' ');

function decl(debut) {
  const i = JS.indexOf(debut); if (i < 0) return '';
  let j = JS.indexOf('{', i + debut.length - 1), n = 0, q = null;
  for (; j < JS.length; j++) {
    const ch = JS[j];
    if (q) { if (ch === '\\') { j++; continue; } if (ch === q) q = null; continue; }
    if (ch === "'" || ch === '"' || ch === '`') { q = ch; continue; }
    if (ch === '{') n++;
    else if (ch === '}') { n--; if (n === 0) return JS.slice(i, j + 1) + (JS[j + 1] === ';' ? ';' : ''); }
  }
  return '';
}
const ligne = debut => { const i = JS.indexOf(debut); return i < 0 ? '' : JS.slice(i, JS.indexOf('\n', i)); };
const flechePlus = debut => { const i = JS.indexOf(debut); if (i < 0) return ''; const f = JS.indexOf(';\n', i); return JS.slice(i, f + 1); };
const occurrences = (txt, motif) => (String(txt).match(new RegExp(motif.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;

setTimeout(() => { console.log('  ✗ délai global du banc dépassé (120 s)'); process.exit(1); }, 120000).unref();

(async () => {
  /* ═══ 0. LA POPULATION : chaque morceau réel est trouvé ═══════════════════════════════════════════════════════════════════════════════ */
  console.log('0. La population : chaque fonction réelle est trouvée dans la page');
  const M = {
    esc: ligne('const esc = '), norme: ligne('const norme = '), icone: ligne('const icone = '), blob: ligne('const blob = '), avIndex: ligne('const avIndex = '), nomConv: ligne('const nomConv = '), avatar: ligne('const avatar = '),
    enSourdine: flechePlus('const enSourdine = '), autreCote: ligne('const autreCote = '), coteDe: ligne('const coteDe = '), NOM_COTE: ligne('const NOM_COTE = '),
    ligneConv: decl('function ligneConv('), boutonEpingle: flechePlus('const boutonEpingle = '), rendreListe: decl('function rendreListe('),
    ligneInvitations: decl('function ligneInvitations('), ligneArchives: decl('function ligneArchives('),
    limite: ligne('const NOM_GROUPE_MAX = '), defaut: decl('const nomGroupeParDefaut = prenoms => {'),
    phrase: decl('function phraseSaisie('), multi: ligne('const multi = '), prenom: ligne('const prenom = '), contactDe: ligne('const contactDe = '), nomAuteur: ligne('const nomAuteur = '),
    motRetire: decl('const motRetire = (c, brouillon, supprime) => {'),
    confirmerActif: ligne('const confirmerActif = '), confirmerMasque: ligne('const confirmerMasque = '), CONFIRMER: ligne('const CONFIRMER = '), CHEVRON_UD: ligne('const CHEVRON_UD = '),
    peindreConfirmer: decl('function peindreConfirmer('),
    creerGroupe: decl('async function creerGroupe('), phraseNonAjoutes: decl('function phraseNonAjoutes('),
  };
  v('(population) chaque morceau réel est trouvé', Object.keys(M).filter(k => !M[k]), []);
  vrai('la page ne connaît plus `NOM_RENOMMAGE_MAX` (une seule limite)', !/NOM_RENOMMAGE_MAX/.test(JS) && /const NOM_GROUPE_MAX = 80;/.test(JS));
  if (!Object.values(M).every(Boolean)) { fin(); return; }

  /* ═══ 1. #16 : UNE SEULE LIMITE ══════════════════════════════════════════════════════════════════════════════════════════════════════════ */
  console.log('\n1. #16 — une seule limite (80), la plus grande, comptée en signes');
  const ctxN = { Array, String, console }; vm.createContext(ctxN);
  vm.runInContext([M.limite, M.defaut, 'this.F = { nomGroupeParDefaut, NOM_GROUPE_MAX };'].join('\n'), ctxN, { timeout: 3000 });
  const { nomGroupeParDefaut, NOM_GROUPE_MAX } = ctxN.F;
  v('la limite est 80 (celle du service : `Array.from(nom).length <= 80`)', NOM_GROUPE_MAX, 80);
  vrai('le champ de création ET celui du renommage coupent à `NOM_GROUPE_MAX` (le code, sans commentaires)', /function limiterNomGroupe\(champ\) \{\s*limiterNomSignes\(champ, NOM_GROUPE_MAX\);/.test(JS) && /limiterNomSignes\(e\.target, NOM_GROUPE_MAX\);/.test(JS));
  vrai('le service accepte bien 80 (routes.js) — la limite de la page est lue là, pas supposée', /Array\.from\(nom\)\.length > 80/.test(fs.readFileSync(path.join(RACINE, 'server-msg/routes.js'), 'utf8')));

  /* ═══ 2. #10 : LE NOM PAR DÉFAUT ═════════════════════════════════════════════════════════════════════════════════════════════════════════ */
  console.log('\n2. #10 — un groupe sans nom s\'appelle par les prénoms de ses membres');
  {
    const n = nomGroupeParDefaut;
    v('un membre : « Léa »', n(['Léa']), 'Léa');
    v('deux : « Léa et Hugo »', n(['Léa', 'Hugo']), 'Léa et Hugo');
    v('trois : tous nommés', n(['Léa', 'Hugo', 'Sam']), 'Léa, Hugo et Sam');
    v('⛔ quatre : l\'exemple de Justin, « Léa, Hugo et 2 autres »', n(['Léa', 'Hugo', 'Sam', 'Eve']), 'Léa, Hugo et 2 autres');
    v('cinq : « Léa, Hugo et 3 autres »', n(['Léa', 'Hugo', 'Sam', 'Eve', 'Zoé']), 'Léa, Hugo et 3 autres');
    v('personne, des blancs, du vide : le repli « Nouveau groupe » (le service exige un nom)', [n([]), n(['', '  ']), n(null)], ['Nouveau groupe', 'Nouveau groupe', 'Nouveau groupe']);
    const long = 'A'.repeat(60);
    const t = n([long, long, 'Sam']);
    v('⛔ jamais plus que la limite, comptée en SIGNES', Array.from(t).length, 80);
    const emo = '😀'.repeat(50);
    vrai('… et jamais un émoji coupé en deux (50 émojis × 3 > 80 signes : coupé au signe, pas à l\'unité UTF-16)', Array.from(n([emo, emo, 'x'])).length === 80 && !/[\uD800-\uDBFF]$/.test(n([emo, emo, 'x'])));
  }
  console.log('— et c\'est CE nom que `creerGroupe` envoie au service —');
  {
    const envoyes = [];
    const G = { choisis: ['u1', 'u2', 'u3', 'u4'], nom: '   ', photo: null, photoBlob: null, annonces: false, ephemeres: 0 };
    const NOMS = { u1: 'Léa Martin', u2: 'Hugo Petit', u3: 'Sam Roux', u4: 'Eve Blanc' };
    const ctx = { Array, String, Set, console, g: () => G, $: () => ({ textContent: '' }), setTimeout: () => 0, synchroFeuille: () => {}, etat: { creation: false, neuves: new Set() },
      contactDe: id => ({ id, nom: NOMS[id] }), prenom: c => c.nom.split(' ')[0], rafraichirListe: async () => {}, fermerFeuille: () => {}, mot: () => {}, phrase: () => '', CAP: { avatars: false, service: true },
      notifier: () => {}, source: { creerGroupe: async spec => { envoyes.push(spec); return { id: 'c_1', nonAjoutes: [] }; } } };
    vm.createContext(ctx);
    vm.runInContext([M.limite, M.defaut, M.phraseNonAjoutes, M.creerGroupe, 'this.F = { creerGroupe };'].join('\n'), ctx, { timeout: 3000 });
    await ctx.F.creerGroupe();
    v('⛔ le champ est vide : le service reçoit « Léa, Hugo et 2 autres »', envoyes.map(s => s.nom), ['Léa, Hugo et 2 autres']);
    G.nom = '  Chantier Nord '; G.choisis = ['u1', 'u2'];
    await ctx.F.creerGroupe();
    v('un nom saisi reste le nom (rogné), jamais remplacé par les prénoms', envoyes[1].nom, 'Chantier Nord');
  }
  vrai('le filigrane du champ dit le nom que le groupe aura (`placeholder = … nomGroupeParDefaut(…)` quand des contacts sont choisis)', /\$\('g-nom'\)\.placeholder = G\.mode === 'chat' && G\.choisis\.length \? nomGroupeParDefaut\(/.test(JS));

  /* ═══ 3. #13 : L'ÉPINGLE N'EST QU'EN HAUT ═══════════════════════════════════════════════════════════════════════════════════════════════ */
  console.log('\n3. #13 — une conversation épinglée n\'est qu\'en haut : jamais deux fois à l\'écran');
  {
    const H = { t: Date.UTC(2026, 9, 26, 12, 0, 0) };
    const els = { 'liste-conv': { innerHTML: '' }, epingles: { innerHTML: '', hidden: true } };
    const base = (id, nom, extra) => Object.assign({ id, type: 'direct', nom, court: nom, initiales: 'X', avatar: 1, photo: null, t: H.t, apercu: 'ap-' + id, nonLu: false, nonLus: 0, cote: 'perso', epingle: false, archive: false }, extra || {});
    const etat = { conv: null, selection: null, listeArchives: false, listeInvit: false, recherche: '', neuves: new Set(), conversations: [] };
    const ctx = { Date, Math, JSON, Number, Array, Object, String, Set, console, etat, modesActifs: () => false, CHEVRON: '<svg class="chev"></svg>', libelleListe: () => '12:00', CAP: { service: true, identifiants: true },
      $: id => els[id] || (els[id] = { innerHTML: '', hidden: false }), peindreSelection: () => {}, majBadge: () => {}, peindreMode: () => {}, dansMode: () => true, enSourdine: () => false };
    vm.createContext(ctx);
    vm.runInContext([M.esc, M.norme, M.icone, M.blob, M.avIndex, M.nomConv, M.avatar, M.autreCote, M.coteDe, M.NOM_COTE, M.ligneConv, M.boutonEpingle, M.ligneInvitations, M.ligneArchives,
      /* l'ancrage et le rendu en place (29 octobre 2026) mesurent le vrai DOM : ici, des éléments simulés — on garde ce que la liste ÉCRIT */
      'function sansSauter(c, k, f) { f(); } function peindreEnPlace(el, h) { el.innerHTML = h; } const cleLigne = () => \'\';', M.rendreListe,
      'this.F = { rendreListe };'].join('\n'), ctx, { timeout: 3000 });
    const rendre = (o) => { Object.assign(etat, { selection: null, listeArchives: false, listeInvit: false, recherche: '' }, o || {}); ctx.F.rendreListe(); return { liste: els['liste-conv'].innerHTML, haut: els.epingles.innerHTML, hautCache: els.epingles.hidden }; };
    const nb = (r, id) => occurrences(r.liste, 'data-ouvrir="' + id + '"') + occurrences(r.haut, 'data-ouvrir="' + id + '"');
    etat.conversations = [base('c_pin', 'Pierre Épinglé', { epingle: true }), base('c_pin2', 'Paul Épinglé', { epingle: true }), base('c_nor', 'Nora Normale'), base('c_arc', 'Alex Archivé', { archive: true, epingle: true })];
    {
      const r = rendre();
      v('population : la rangée du haut porte les deux épinglées (l\'archivée n\'est pas « épinglée » à l\'écran)', [occurrences(r.haut, 'epingle-bouton'), r.hautCache], [2, false]);
      v('⛔ l\'épinglée est EN HAUT, une seule fois, et PAS dans la liste', [occurrences(r.haut, 'data-ouvrir="c_pin"'), occurrences(r.liste, 'data-ouvrir="c_pin"')], [1, 0]);
      v('la liste garde la normale (une fois)', occurrences(r.liste, 'data-ouvrir="c_nor"'), 1);
    }
    {
      const r = rendre({ recherche: 'pierre' });
      v('⛔ une RECHERCHE cache la rangée du haut : la conversation trouvée est dans la liste, UNE fois', [nb(r, 'c_pin'), occurrences(r.liste, 'data-ouvrir="c_pin"'), r.hautCache], [1, 1, true]);
    }
    {
      const r = rendre({ selection: new Set() });
      v('⛔ le mode « Modifier » (qui coche des lignes) cache la rangée : l\'épinglée est dans la liste, UNE fois, cochable', [occurrences(r.liste, 'data-choisir="c_pin"') + occurrences(r.haut, 'data-ouvrir="c_pin"'), occurrences(r.liste, 'data-choisir="c_pin"'), r.hautCache], [1, 1, true]);
    }
    {
      const r = rendre({ listeArchives: true });
      v('« Archivées » : la rangée est cachée et l\'archivée est dans la liste, une fois', [nb(r, 'c_arc'), r.hautCache], [1, true]);
    }
    {
      etat.conversations = [base('c_pin', 'Pierre Épinglé', { epingle: true })];
      const r = rendre();
      vrai('⛔ TOUT est épinglé : la liste est vide mais ne dit pas « Aucune conversation » (la rangée du haut les porte)', occurrences(r.haut, 'data-ouvrir="c_pin"') === 1 && !/vide/.test(r.liste) && !/Aucune/.test(r.liste));
      etat.conversations = [];
      const r0 = rendre();
      vrai('contre-épreuve : sans aucune conversation, le message « Aucune conversation » est bien là', /Aucune conversation/.test(r0.liste));
    }
  }
  vrai('le geste « Désépingler » est sur l\'épingle : appui long (doigt), clic droit / touche Menu, et il avale le clic du relâcher', /function menuEpingle\(bouton, auDoigt\)/.test(JS) && /\$\('epingles'\)\.addEventListener\('pointerdown'/.test(JS) && /\$\('epingles'\)\.addEventListener\('contextmenu'/.test(JS) && /if \(o && epingleClicAvale\(e\)\) return;/.test(JS));
  vrai('… et il passe par le même service que « Modifier » (`rangerConvs([id], \'desepingler\')`)', /source\.rangerConvs\(\[id\], 'desepingler'\)/.test(JS));

  /* ═══ 4. #11 : « SUPPRIMÉ », PAS « RETIRÉ » ════════════════════════════════════════════════════════════════════════════════════════════ */
  console.log('\n4. #11 — un canal supprimé se dit « supprimé »');
  {
    const ctx = { String }; vm.createContext(ctx);
    vm.runInContext([M.motRetire, 'this.F = { motRetire };'].join('\n'), ctx, { timeout: 3000 });
    const m = ctx.F.motRetire;
    const canal = { type: 'canal', nom: 'general' }, groupe = { type: 'groupe', nom: 'Équipe' };
    v('⛔ un canal SUPPRIMÉ : « Le canal general a été supprimé. »', m(canal, false, true), 'Le canal general a été supprimé.');
    v('un canal dont on est retiré (sans l\'indication) : la phrase d\'avant', m(canal, false, false), 'Tu as été retiré du canal general.');
    v('un groupe : toujours « retiré » (on ne supprime pas un groupe pour tous)', [m(groupe, false, false), m(groupe, false, true)], ['Tu as été retiré de Équipe.', 'Tu as été retiré de Équipe.']);
    vrai('le brouillon en cours est toujours dit', /Ton message en cours/.test(m(canal, true, true)));
  }
  vrai('l\'événement `retire` du service porte `supprime` jusqu\'à la phrase (`surRetire(ev.id, ev.supprime === true)`)', /surRetire\(ev\.id, ev\.supprime === true\)/.test(JS) && /function surRetire\(id, supprime\)/.test(JS));

  /* ═══ 5. #15 : « ÉCRIT… » DIT QUI, EN GROUPE ═══════════════════════════════════════════════════════════════════════════════════════════ */
  console.log('\n5. #15 — en groupe, « écrit… » dit le prénom');
  {
    const CONTACTS = [{ id: 'u1', nom: 'Léa Martin' }, { id: 'u2', nom: 'Hugo Petit' }, { id: 'u3', nom: 'Sam Roux' }, { id: 'u4', nom: 'Eve Blanc' }];
    const ctx = { CONTACTS, source: {}, Array }; vm.createContext(ctx);
    vm.runInContext([M.prenom, M.contactDe, M.nomAuteur, M.multi, M.phrase, 'this.F = { phraseSaisie };'].join('\n'), ctx, { timeout: 3000 });
    const p = ctx.F.phraseSaisie;
    const grp = { type: 'groupe' }, direct = { type: 'direct' };
    v('un : « Léa écrit… »', p(Object.assign({ saisie: { contact: 'u1', contacts: ['u1'] } }, grp)), 'Léa écrit…');
    v('deux : « Léa et Hugo écrivent… »', p(Object.assign({ saisie: { contact: 'u1', contacts: ['u1', 'u2'] } }, grp)), 'Léa et Hugo écrivent…');
    v('trois : « Léa, Hugo et 1 autre écrivent… »', p(Object.assign({ saisie: { contact: 'u1', contacts: ['u1', 'u2', 'u3'] } }, grp)), 'Léa, Hugo et 1 autre écrivent…');
    v('quatre : « … et 2 autres écrivent… »', p(Object.assign({ saisie: { contact: 'u1', contacts: ['u1', 'u2', 'u3', 'u4'] } }, grp)), 'Léa, Hugo et 2 autres écrivent…');
    v('une source d\'avant (pas de `contacts`) : le premier seul', p(Object.assign({ saisie: { contact: 'u2' } }, grp)), 'Hugo écrit…');
    v('une personne inconnue : « Quelqu\'un écrit… », jamais « ? »', p(Object.assign({ saisie: { contact: 'zz', contacts: ['zz'] } }, grp)), 'Quelqu\'un écrit…');
    v('⛔ à deux : rien (les trois points suffisent, c\'est l\'autre)', p(Object.assign({ saisie: { contact: 'u1', contacts: ['u1'] } }, direct)), '');
    v('pas de saisie : rien', p(Object.assign({ saisie: null }, grp)), '');
    v('⛔ un doublon d\'identifiant ne fait pas « Léa et Léa écrivent… »', p(Object.assign({ saisie: { contact: 'u1', contacts: ['u1', 'u1'] } }, grp)), 'Léa écrit…');
  }
  vrai('la phrase est posée dans l\'indicateur du fil (le nom visible, l\'étiquette lisible à voix haute)', /<span class="saisie-qui" aria-hidden="true">' \+ esc\(qui\) \+ '<\/span>/.test(JS) && /\.saisie-qui \{[^}]*color: var\(--sub-meta\);/.test(CSS));
  vrai('⛔ le prénom de « écrit… » est en `--sub-meta` : lisible sur la bulle reçue (`--sub` n\'y fait que 3,19:1, mesuré à la sonde du 26 octobre 2026)', !/\.saisie-qui \{[^}]*color: var\(--sub\);/.test(CSS));

  /* ═══ 6. #14 : « CONFIRMER L'ENVOI » SE CACHE EN PERSO ═══════════════════════════════════════════════════════════════════════════════ */
  console.log('\n6. #14 — la ligne « Confirmer l\'envoi » est masquée en Perso (pro@6) ; rien de plus aux heures (pro@5)');
  {
    const etat = { mode: 'pro' };
    const btn = { hidden: false, dataset: {} }, val = { innerHTML: '' };
    const ctx = { etat, esc: s => String(s), CHEVRON_UD: '<svg/>', $: id => id === 'reg-confirmer' ? btn : id === 'reg-v-confirmer' ? val : null, source: { confirmerEnvoi: () => 'groupes' }, modesActifs: () => true, CAP: { confirmerEnvoi: true } };
    vm.createContext(ctx);
    vm.runInContext([M.CONFIRMER, M.CHEVRON_UD, 'const confirmerActif = () => true;', M.confirmerMasque, M.peindreConfirmer, 'this.F = { peindreConfirmer, confirmerMasque };'].join('\n'), ctx, { timeout: 3000 });
    ctx.F.peindreConfirmer();
    v('population : en Pro la ligne est visible et dit le réglage', [btn.hidden, val.innerHTML.includes('Groupes et canaux')], [false, true]);
    etat.mode = 'perso'; ctx.F.peindreConfirmer();
    v('⛔ en Perso la ligne est masquée', btn.hidden, true);
    etat.mode = 'pro'; ctx.F.peindreConfirmer();
    v('… et elle revient dès qu\'on repasse en Pro', btn.hidden, false);
    ctx.modesActifs = () => false; etat.mode = 'perso'; ctx.F.peindreConfirmer();
    v('un compte sans les deux côtés (pas de Perso/Pro) : la ligne reste visible', btn.hidden, false);
  }
  vrai('le Profil la dessine masquée en Perso dès son premier rendu, et le passage Perso ↔ Pro la repeint (`peindreMode` rappelle `peindreConfirmer`)',
    /id="reg-confirmer" aria-haspopup="menu" aria-expanded="false" aria-controls="deroule-liste"' \+ \(confirmerMasque\(\) \? ' hidden' : ''\)/.test(JS) && /if \(typeof peindreConfirmer === 'function'\) peindreConfirmer\(\);/.test(decl('function peindreMode(')));

  /* ═══ 7. #1 : LA CONVERSATION D'UN CONTACT BLOQUÉ SE LIT SANS CHAMP ══════════════════════════════════════════════════════════════════ */
  console.log('\n7. #1 — un contact bloqué : conversation lisible, sans champ, une phrase et « Débloquer »');
  {
    const rc = decl('function rendreConv(');
    vrai('(population) rendreConv est trouvée', rc.length > 500);
    vrai('⛔ le champ est caché pour une directe `bloque` (jamais pour une conversation en cours d\'invitation)', /const bloque = !!\(c && c\.bloque && !c\.supprime\) && !recue;/.test(rc) && /\$\('compo'\)\.hidden = ferme \|\| recue \|\| bloque \|\|/.test(rc));
    vrai('… la barre « Débloquer » paraît à sa place, avec sa phrase, et l\'appel vidéo disparaît', /\$\('compo-bloque'\)\.hidden = ferme \|\| !bloque; \$\('conv-cam'\)\.hidden = bloque;/.test(rc) && /Tu as bloqué /.test(rc) && /plus y écrire/.test(rc));
    vrai('… la barre existe dans la page (balisage) avec son bouton', /<div class="compo-invit compo-bloque" id="compo-bloque"[^>]*hidden>[\s\S]{0,300}data-debloquer>Débloquer<\/button>/.test(PAGE));
    vrai('… le bouton appelle `source.debloquer` sur l\'AUTRE personne de la conversation', /\$\('compo-bloque'\)\.addEventListener\('click', async e => \{[\s\S]{0,400}source\.debloquer\(c\.autre\)/.test(JS));
    vrai('les Infos de la directe proposent « Débloquer » à la place de « Bloquer » quand `i.bloque`', /if \(autre && i\.bloque\) h \+= .*data-act="debloquer"/.test(JS));
    vrai('bloquer / débloquer redisent les conversations de la personne (la source relit la liste TOUT DE SUITE)', /async function apresBlocage\(uid\)/.test(fs.readFileSync(path.join(RACINE, 'server-msg/public/source-serveur.js'), 'utf8')));
  }
  fin();
})().catch(e => { console.log('  ✗ le banc a levé : ' + (e && e.stack || e)); process.exit(1); });
