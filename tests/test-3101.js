/* 3098 — « 35 COURRIERS À TRAITER, PERSONNE DESSUS » : CE QUE CAMILLE A LU NE RESTE PLUS « À TRAITER », ET ELLE ET VICTOR LE SAVENT (28 octobre 2026).
     Production, 28 octobre, fil Équipe de la Tour. Victor (9 h) : « 35 courriers sont à traiter : personne dessus ». Justin (11 h 33) : « tu gères tous les messages depuis le début de la boîte mail,
     retour dans 2h ». Camille (13 h 15, bilan automatique) : « 13 courriels examinés — 0 réponse en brouillon… » ; à 16 h 59 : « je démarre tout juste le tri, les 35 sont encore à traiter » ; à 17 h 01 :
     « peux-tu redemander à Justin ce top départ ? ». Trois causes, toutes mesurées dans le code :
       1. un courriel que Camille a LU et jugé sans réponse à faire (publicité, lettre d'information, message automatique, message de chez nous) n'écrivait RIEN au suivi du Courrier — la décision du
          `gardien` (« résolu est définitif, une catégorie mal posée ferait disparaître un vrai message ») était juste, mais elle laissait ces lignes « à traiter, personne dessus » POUR TOUJOURS, et
          la file de la reprise les relisait à chaque passe (une lecture complète de la boîte chacun) en tête de ses 200 places ;
       2. Camille ne voyait pas le bilan de sa reprise : il va dans son fil PRIVÉ, que le fil Équipe ne lit pas ; son seul chiffre était le même 35 ; et son outil refusait les trois phrases de Justin
          (la garde cherchait « reprend / ancien / arriéré ») sans qu'elle voie la raison du refus — d'où le « top départ » réclamé ;
       3. Victor n'avait que {aTraiter:35, enCours:0} : aucun fait sur ce que Camille avait lu.
     Ce banc joue le VRAI `mail.js` (suivi, décomptes, route de la Tour, file de l'arriéré — contre un IMAP simulé), le VRAI `agent-camille.js` (établi `banc-agents-courrier.js`) branché sur ce
     `mail.js`, puis les prompts de Victor et de Camille (`agent-conversation.js`) nourris par le vrai `etatReprise()`.
     ⛔ Le classement est « en cours · Camille » + une RAISON d'une liste fermée (`classe`) : la Tour EN SERVICE (v2.117) ne lit que statut / assigne / par — elle n'a pas à changer. */
'use strict';
const fs = require('fs'), path = require('path'), os = require('os'), crypto = require('crypto');
const RACINE = path.join(__dirname, '..');
const { monter } = require('./banc-agents-courrier.js');
let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + String(JSON.stringify(b)).slice(0, 500) + '\n      obtenu  : ' + String(JSON.stringify(a)).slice(0, 500)); } };
const vrai = (t, c, d) => v(t + (d !== undefined && !c ? ' — ' + String(d).slice(0, 400) : ''), !!c, true);
const JOUR = 86400000;
setTimeout(() => { console.log('  ✗ banc FIGÉ au-delà de 150 s'); console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); process.exit(1); }, 150000).unref();
const dormir = ms => new Promise(r => setTimeout(r, ms));
const empreinte = x => crypto.createHash('sha256').update('camille:' + String(x)).digest('hex').slice(0, 32);
const PUB = 'CATEGORIE : ignorer';
const QUESTION = 'CATEGORIE : question\nObjet : Re : Fonctionnement de l’application\n\nBonjour,\n\nOP GESTION fonctionne sur ordinateur, tablette et téléphone, depuis le navigateur, sans installation.\n\nBien cordialement,';
const poser = (Z, o) => { const m = Object.assign({ uid: 1, dossier: 'INBOX', boite: 'b-contact', mid: '<c1@banc-3098>', de: 'client@exemple-3098.fr', deNom: 'Hortense Valmont', pour: 'contact@teamop.fr', objet: 'Question',
  texte: 'Bonjour, comment ça marche ?', ts: Z.horloge.t - 3600000, auto: false, protege: false, authentifie: true }, o); Z.messages[m.boite + '|' + m.dossier + '|' + m.uid] = m;
  return { boiteId: m.boite, dossier: m.dossier, uid: m.uid, mid: m.mid, ts: m.ts }; };
const ligne = (o) => Object.assign({ statut: 'aTraiter', assigne: '', par: '', ts: 1, recuTs: 1, repTs: 0, de: 'expediteur@exemple-3098.fr', objet: 'Objet' }, o);
const src = f => fs.readFileSync(path.join(RACINE, 'server', f), 'utf8');
const sansCommentaires = t => t.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');

/* Le VRAI mail.js, sur un dossier de données jetable. `ligneSuivi` : le contenu de mail-suivi.json. `imap` : le faux serveur (voir plus bas). */
function mailReel(ligneSuivi, imap) {
  const D = fs.mkdtempSync(path.join(os.tmpdir(), 'b3098-'));
  fs.writeFileSync(path.join(D, 'mail-suivi.json'), JSON.stringify(ligneSuivi || {}));
  if (imap) fs.writeFileSync(path.join(D, 'mail-boites.json'), JSON.stringify([{ id: 'b-contact', email: 'contact@teamop.fr', pass: 'x', imapHost: 'imap.banc-3098.test', imapPort: 993, smtpHost: 'smtp.banc-3098.test', smtpPort: 465, nom: 'TEAM OP', ts: 1, par: 'banc' }]));
  const routes = {};
  const reg = m => (chemin, ...h) => { routes[m + ' ' + chemin] = h[h.length - 1]; };
  const app = { get: reg('GET'), post: reg('POST'), put: reg('PUT'), delete: reg('DELETE'), use() {} };
  const M = require(path.join(RACINE, 'server', 'mail.js'))(app, { DATA_DIR: D, monAdmin: (q, r, n) => n(), monPatronStrict: (q, r, n) => n(), monStr: (x, n) => String(x == null ? '' : x).slice(0, n), pousseNotif: () => {} });
  const appeler = (cle, req) => { let corps = null, code = 200; const res = { json: x => { corps = x; return res; }, status: c => { code = c; return res; } }; routes[cle](Object.assign({ body: {}, query: {}, tourUser: { nom: 'Justin' } }, req || {}), res); return { code, corps }; };
  return { M, D, appeler, nettoyer: () => { try { fs.rmSync(D, { recursive: true, force: true }); } catch (e) {} } };
}

(async () => {
  console.log('\n── 3098 · le courrier lu par Camille ne reste plus « à traiter » ──');

  console.log('\n1. mail.js (le vrai) : classer, compter, afficher');
  {
    const R = mailReel({ '<pub@x>': ligne({ de: 'pub@exemple-3098.fr', objet: 'Soldes' }), '<pris@x>': ligne({ statut: 'enCours', assigne: 'Paul', par: 'Justin' }), '<rep@x>': ligne({ repTs: 5 }),
      '<tp@x>': ligne({ statut: 'enCours', assigne: 'Camille', par: 'Camille' }), '<vrai@x>': ligne({ de: 'client@exemple-3098.fr', objet: 'Ma panne' }), '<touche@x>': ligne({ par: 'Justin' }), '<res@x>': ligne({ statut: 'resolu' }) });
    const M = R.M;
    const c0 = M.compter();
    v('départ : 3 à traiter (pub, vrai, touche… la touchée compte), 2 en cours, 1 résolu, aucun classé', [c0.aTraiter, c0.enCours, c0.classes, c0.resolus, c0.total], [4, 2, 0, 1, 7]);
    v('⛔ classer une ligne INTACTE : vrai', M.suiviClasser('<pub@x>', 'ignore'), true);
    const c1 = M.compter();
    v('…« à traiter » baisse de UN, « en cours » ne bouge PAS (un classement n’est pas du travail en cours), « classés » monte, le total est le même', [c1.aTraiter, c1.enCours, c1.classes, c1.total], [3, 2, 1, 7]);
    v('⛔ une ligne déjà classée : rien (on ne recompte pas)', M.suiviClasser('<pub@x>', 'ignore'), false);
    v('⛔ une ligne prise par un humain, répondue, déjà en cours chez Camille, touchée par Justin, résolue : JAMAIS réécrite', ['<pris@x>', '<rep@x>', '<tp@x>', '<touche@x>', '<res@x>'].map(m => M.suiviClasser(m, 'ignore')), [false, false, false, false, false]);
    v('⛔ aucune ligne n’est CRÉÉE (une lettre d’information n’entre pas au suivi) et une raison hors de la liste est refusée', [M.suiviClasser('<inconnu@x>', 'ignore'), M.suiviClasser('<vrai@x>', 'resolu'), M.suiviClasser('<vrai@x>', 'pirate'), M.compter().total], [false, false, false, 7]);
    for (const [mid, raison] of [['<vrai@x>', 'automatique']]) M.suiviClasser(mid, raison);
    M.suiviClasser('<vrai@x>', 'ignore');   // déjà classée « automatique » : sans effet
    v('⛔ la ligne classée n’est PAS « résolue » : « résolu » est définitif, un classement se défait d’un geste', M.compter().resolus, 1);
    v('une ligne classée n’est plus libre : la file de l’arriéré ne la relit pas', [M.suiviLibre('<pub@x>'), M.suiviLibre('<res@x>')], [false, false]);

    const st = R.appeler('GET /api/monitor/mail/stats').corps;
    v('/stats : les trois champs que la Tour EN SERVICE lit gardent leur sens (aTraiter, enCours, ouverts), les classés s’ajoutent à part', [st.aTraiter, st.enCours, st.classes, st.resolus], [2, 2, 2, 1]);
    vrai('⛔ « Au rapport » (`ouverts`) garde les classés : la Tour EN SERVICE ne lit ni `classe` ni `classesRecents`, un courriel mal classé ne doit pas disparaître d’un tableau qu’elle ne peut pas élargir', st.ouverts.some(x => /Soldes/.test(x.objet)) && st.ouverts.some(x => /Ma panne/.test(x.objet)), JSON.stringify(st.ouverts.map(x => x.objet)));
    vrai('…DERRIÈRE les quatre vrais (les deux « à traiter », la prise par Paul, celle de Camille), et marqués `classe` pour une Tour qui sait la lire', st.ouverts.length === 6 && st.ouverts.slice(0, 4).every(x => !('classe' in x)) && st.ouverts.slice(0, 4).filter(x => x.statut === 'aTraiter').length === 2
      && st.ouverts.slice(4).map(x => x.classe).sort().join() === 'automatique,ignore', JSON.stringify(st.ouverts));
    v('⛔ …mais les classés restent RÉCUPÉRABLES (`classesRecents` : raison, expéditeur, objet) — une Tour qui les montre les trouve ici', st.classesRecents.map(x => x.classe + '|' + x.objet).sort(), ['automatique|Ma panne', 'ignore|Soldes']);
    /* ce que la Tour EN SERVICE lit : suiviDe() ne garde que statut, assigne, par (tour.html) — un champ de plus ne la gêne pas */
    const tourSuiviDe = s => s && typeof s === 'object' ? { statut: s.statut, assigne: s.assigne || '', par: s.par || '' } : null;
    v('la Tour EN SERVICE y lit « en cours · Camille », rien de plus', tourSuiviDe({ statut: 'enCours', assigne: 'Camille', classe: 'ignore' }), { statut: 'enCours', assigne: 'Camille', par: '' });

    /* la main d'un humain défait le classement */
    const r1 = R.appeler('POST /api/monitor/mail/suivi', { body: { mid: '<pub@x>', statut: 'aTraiter', assigne: '' } });
    const c2 = M.compter();
    v('⛔ Justin remet un classé « à traiter » : il l’est (la raison est effacée), et Camille ne le reclasse plus (la ligne porte son nom)', [r1.code, c2.aTraiter, c2.classes, M.suiviClasser('<pub@x>', 'ignore')], [200, 3, 1, false]);
    R.appeler('POST /api/monitor/mail/suivi', { body: { mid: '<vrai@x>', statut: 'resolu' } });
    v('…ou « résolu » : plus classé', [M.compter().classes, M.compter().resolus], [0, 2]);
    await dormir(700);   // l'écriture du suivi est différée de 500 ms
    const disque = JSON.parse(fs.readFileSync(path.join(R.D, 'mail-suivi.json'), 'utf8'));
    v('⛔ …et la RAISON est effacée du fichier (pas de drapeau périmé qui ressusciterait si la ligne repasse « en cours » par un autre geste)', [disque['<pub@x>'].classe, disque['<vrai@x>'].classe], [undefined, undefined]);
    const R3 = mailReel({ '<perime@x>': ligne({ statut: 'enCours', assigne: 'Paul', par: 'Justin', classe: 'ignore' }) });
    v('⛔ une ligne « en cours » prise par un HUMAIN ne compte jamais comme classée, même si elle porte encore une raison (donnée périmée)', [R3.M.compter().classes, R3.M.compter().enCours], [0, 1]);
    R3.nettoyer();

    /* une vraie décision de Camille remplace un classement */
    const R2 = mailReel({ '<z@x>': ligne({}) }); R2.M.suiviClasser('<z@x>', 'ignore');
    v('une vraie décision de Camille (brouillon déposé) sur une ligne classée : « en cours · Camille », la raison est effacée', [R2.M.suiviMarquer('<z@x>', { statut: 'enCours', assigne: 'Camille' }), R2.M.compter().classes, R2.M.compter().enCours], [true, 0, 1]);
    R2.nettoyer(); R.nettoyer();

    /* une vingtaine de classés ANCIENS ne chassent pas du tableau (vingt places) un vrai courrier récent qui attend */
    {
      const L = {}; for (let k = 1; k <= 25; k++) L['<c' + k + '@x>'] = ligne({ recuTs: 1000 + k, objet: 'Pub ' + k });
      L['<attend@x>'] = ligne({ recuTs: Date.now() - 1000, objet: 'Client qui attend' });
      const RC = mailReel(L); for (let k = 1; k <= 25; k++) RC.M.suiviClasser('<c' + k + '@x>', 'ignore');
      const o = RC.appeler('GET /api/monitor/mail/stats').corps.ouverts;
      vrai('⛔ 25 classés anciens + 1 vrai courrier récent : le vrai est EN TÊTE de « Au rapport » (les classés passent derrière), 20 lignes au plus', o.length === 20 && o[0].objet === 'Client qui attend' && o.slice(1).every(x => x.classe === 'ignore'), JSON.stringify(o.slice(0, 3)));
      RC.nettoyer();
    }
    /* un classement n'est qu'une ligne « en cours · Camille » INTACTE : répondue ou déjà assignée, elle n'est ni classée ni comptée classée */
    {
      const RG = mailReel({ '<rp@x>': ligne({ statut: 'enCours', assigne: 'Camille', par: 'Camille', classe: 'ignore', repTs: 5 }), '<as@x>': ligne({ assigne: 'Paul' }) });
      v('⛔ une ligne répondue qui porte encore une raison (donnée périmée) ne compte PAS classée', [RG.M.compter().classes, RG.M.compter().enCours], [0, 1]);
      v('⛔ une ligne « à traiter » déjà ASSIGNÉE (sans `par`) n’est jamais classée', [RG.M.suiviClasser('<as@x>', 'ignore'), RG.M.compter().classes], [false, 0]);
      RG.nettoyer();
    }

    const MAIL = sansCommentaires(src('mail.js'));
    vrai('la liste des raisons est FERMÉE et écrite une fois (mail.js) : un expéditeur illisible n’y est PAS (personne ne l’a lu)', /const CLASSES = \['ignore', 'automatique', 'interne'\];/.test(MAIL));
    vrai('une réponse partie, la main de Justin et une vraie décision de Camille EFFACENT la raison du fichier (trois `delete sv.classe`)', (MAIL.match(/delete sv\.classe;/g) || []).length === 3, (MAIL.match(/delete sv\.classe;/g) || []).length);
    vrai('la liste des messages montre la raison au Courrier (`classe`), aux deux endroits qui rendent un suivi', (MAIL.match(/estClasse\((?:sv|suivi\[midCle\])\) \? \{ classe: (?:sv|suivi\[midCle\])\.classe \} : \{\}/g) || []).length === 2);
  }

  console.log('\n2. mail.js (le vrai) : la file de l’arriéré ne relit plus ce qui est décidé');
  {
    /* un IMAP simulé : 250 courriels DÉCIDÉS (sans ligne de suivi) puis 3 neufs. Avant, les 200 premières places allaient aux décidés. */
    const MSGS = {}, UIDS = [];
    const mettre = (uid, mid, objet, de) => { MSGS[uid] = { uid, envelope: { messageId: mid, subject: objet, from: [{ name: 'X', address: de || ('exp' + uid + '@exemple-3098.fr') }], date: new Date(Date.UTC(2026, 9, 1) + uid * 60000) }, flags: new Set() }; UIDS.push(uid); };
    for (let k = 1; k <= 250; k++) mettre(k, '<dec' + k + '@x>', 'Décidé ' + k);
    for (let k = 251; k <= 253; k++) mettre(k, '<neuf' + k + '@x>', 'Neuf ' + k);
    mettre(254, '<notif@x>', 'Alerte', 'noreply@exemple-3098.fr');
    let lus = 0;
    class FauxImap { constructor() {} on() {} async connect() {} async logout() {} close() {}
      async list() { return [{ path: 'INBOX', name: 'INBOX', flags: new Set() }]; }
      async getMailboxLock() { return { release() {} }; }
      async search() { return UIDS.slice(); }
      async *fetch(q) { for (const u of String(q.uid).split(',').map(Number)) { lus++; if (MSGS[u]) yield MSGS[u]; } } }
    const chemin = require.resolve(path.join(RACINE, 'server', 'node_modules', 'imapflow'));
    const ancien = require.cache[chemin];
    require.cache[chemin] = { id: chemin, filename: chemin, loaded: true, exports: { ImapFlow: FauxImap } };
    const R = mailReel({ '<dec3@x>': ligne({ statut: 'enCours', assigne: 'Camille', par: 'Camille' }), '<dec4@x>': ligne({}) }, true);
    try {
      const sans = await R.M.arriere(3650);
      v('SANS filtre (comme avant) : la file est coupée à 200 — les 3 neufs ne sont PAS dedans (le défaut que Camille subissait)', [sans.length, sans.some(x => x.mid === '<neuf253@x>'), sans.tronque], [200, false, true]);
      const decide = x => /^<dec/.test(x.mid);
      const avec = await R.M.arriere(3650, { ecarter: decide });
      v('AVEC `ecarter` : les 3 neufs sont dans la file, les décidés n’y prennent aucune place, la ligne classée est écartée par le suivi (pas de lecture de plus)', [avec.map(x => x.mid), avec.tronque], [['<neuf251@x>', '<neuf252@x>', '<neuf253@x>'], false]);
      v('…les décidés sont rendus À PART (identifiant et date, jamais un texte) pour que l’appelant range leur ligne de suivi', [avec.ecartes.length, Object.keys(avec.ecartes[0]).sort(), avec.ecartes.some(x => x.mid === '<dec3@x>')], [249, ['mid', 'ts'], false]);
      v('⛔ une notification automatique (noreply@) n’est ni dans la file ni dans les écartés', [avec.some(x => x.mid === '<notif@x>'), avec.ecartes.some(x => x.mid === '<notif@x>')], [false, false]);
      v('⛔ un `ecarter` qui JETTE ne casse pas la file : le courriel reste candidat (on relit plutôt que de perdre)', (await R.M.arriere(3650, { ecarter: () => { throw new Error('panne'); } })).length, 200);
    } finally { if (ancien) require.cache[chemin] = ancien; else delete require.cache[chemin]; R.nettoyer(); }
    vrai('(population) le faux IMAP a bien servi des en-têtes', lus > 250, lus);
  }

  console.log('\n3. Camille : ce qu’elle a lu et qui n’appelle aucune réponse est CLASSÉ (jamais résolu)');
  {
    const R = mailReel({ '<pub@banc-3098>': ligne({ de: 'pub@exemple-3098.fr' }), '<pris@banc-3098>': ligne({ par: 'Justin', assigne: 'Paul', statut: 'enCours' }), '<auto@banc-3098>': ligne({}), '<nous@banc-3098>': ligne({}), '<sec@banc-3098>': ligne({}), '<mauvais@banc-3098>': ligne({}), '<forme@banc-3098>': ligne({}) });
    const Z = monter({ modes: { camille: 'brouillon' }, claude: () => PUB });
    Z.mail.suiviMarquer = R.M.suiviMarquer; Z.mail.suiviClasser = R.M.suiviClasser; Z.mail.suiviLibre = R.M.suiviLibre;
    let r = await Z.camille.surNouveauMessage(poser(Z, { mid: '<pub@banc-3098>' }));
    v('« ignorer » : classé « ignore » au suivi (en cours · Camille), le résultat le dit', [r.ignore, r.classe, R.M.compter().classes, R.M.compter().aTraiter], [true, true, 1, 5]);
    r = await Z.camille.surNouveauMessage(poser(Z, { uid: 2, mid: '<pris@banc-3098>' }));
    v('⛔ une ligne que Justin a touchée n’est JAMAIS réécrite : ignorée par Camille, elle reste à Paul (le classement ne se fait pas)', [r.ignore, r.classe === true, R.M.compter().classes], [true, false, 1]);
    r = await Z.camille.surNouveauMessage(poser(Z, { uid: 3, mid: '<auto@banc-3098>', auto: true }));
    v('un message AUTOMATIQUE (en-tête) : classé « automatique » — sauté, pas examiné', [r.saute, r.classe, R.M.compter().classes], ['automatique', true, 2]);
    r = await Z.camille.surNouveauMessage(poser(Z, { uid: 4, mid: '<nous@banc-3098>', de: 'collegue@teamop.fr' }));
    v('un message de CHEZ NOUS : classé « interne »', [r.saute, r.classe, R.M.compter().classes], ['interne', true, 3]);
    const avantSec = R.M.compter();
    r = await Z.camille.surNouveauMessage(poser(Z, { uid: 5, mid: '<sec@banc-3098>', protege: true }));
    v('⛔ un courriel de SÉCURITÉ (code, avis de suppression) : ni lu, ni noté, ni classé — la Tour elle-même n’y touche pas', [r.saute, r.protege, r.classe === true, R.M.compter().classes, R.M.compter().aTraiter, Object.keys(Z.fichierJson('agents-camille.json').rien || {}).length], ['automatique', true, false, avantSec.classes, avantSec.aTraiter, 4]);
    r = await Z.camille.surNouveauMessage(poser(Z, { uid: 6, mid: '<mauvais@banc-3098>', de: 'pas une adresse' }));
    v('⛔ un expéditeur illisible : NON classé (personne n’a rien lu) — la ligne reste « à traiter », mais n’est pas relue à chaque passe', [r.saute, r.classe === true, R.M.compter().classes, R.M.compter().aTraiter, !!Z.fichierJson('agents-camille.json').mids[empreinte('<mauvais@banc-3098>')]], ['expediteur', false, 3, 3, true]);
    const Y = monter({ modes: { camille: 'brouillon' }, claude: () => 'Je ne sais pas trop.' });
    Y.mail.suiviMarquer = R.M.suiviMarquer; Y.mail.suiviClasser = R.M.suiviClasser; Y.mail.suiviLibre = R.M.suiviLibre;
    r = await Y.camille.surNouveauMessage(poser(Y, { mid: '<forme@banc-3098>' }));
    v('⛔ une PANNE (réponse sans catégorie) ne classe rien : le courriel reste « à traiter », il sera repris', [r.saute, r.classe === true, R.M.compter().classes], ['forme', false, 3]);
    const reg = Z.fichierJson('agents-camille.json');
    v('le registre retient la raison de chaque courrier rangé (empreinte → raison, heure), jamais l’adresse ni l’objet', Object.values(reg.rien).map(x => x[0]).sort(), ['automatique', 'ignore', 'ignore', 'interne']);
    vrai('…et rien de lisible (ni adresse, ni Message-ID) n’y est écrit', !/exemple-3098|banc-3098|Hortense/.test(JSON.stringify(reg.rien)));
    Z.nettoyer(); Y.nettoyer(); R.nettoyer();
  }

  console.log('\n3b. Camille : un classement « sans réponse » ne cache JAMAIS un courriel qui parle de recours, de prélèvement ou de résiliation (gardien)');
  {
    const lignes = {}; for (const k of ['lit', 'pay', 'res', 'err', 'pubok', 'nous', 'fauxnous', 'transf', 'autolit', 'autook', 'autopay']) lignes['<' + k + '@banc-3098>'] = ligne({});
    const R = mailReel(lignes);
    const Z = monter({ modes: { camille: 'brouillon' }, claude: () => PUB });
    Z.mail.suiviMarquer = R.M.suiviMarquer; Z.mail.suiviClasser = R.M.suiviClasser; Z.mail.suiviLibre = R.M.suiviLibre;
    const etat = () => ({ cl: R.M.compter().classes, at: R.M.compter().aTraiter });
    let n = 0; const msg = (k, o) => poser(Z, Object.assign({ uid: 100 + (++n), mid: '<' + k + '@banc-3098>' }, o));
    let r = await Z.camille.surNouveauMessage(msg('lit', { objet: 'Votre relance', texte: 'Sans réponse sous huit jours, j’appelle mon avocat et je saisis le tribunal.' }));
    v('⛔ « ignorer » (texte piégé ou mauvaise catégorie) sur une MENACE DE LITIGE : ignoré comme avant (un démarchage d’avocats ne dérange pas Justin, test-2905) mais JAMAIS classé — la ligne reste « à traiter » et visible', [r.ignore, r.reste, r.classe === true, etat()], [true, true, false, { cl: 0, at: 11 }]);
    r = await Z.camille.surNouveauMessage(msg('pay', { objet: 'Facture', texte: 'Vous m’avez prélevé deux fois ce mois-ci.' }));
    v('⛔ « ignorer » sur une erreur de PRÉLÈVEMENT (sans mot de recours) : ignoré comme avant, mais NON classé — la ligne reste « à traiter » et visible', [r.ignore, r.reste, r.classe === true, etat()], [true, true, false, { cl: 0, at: 11 }]);
    r = await Z.camille.surNouveauMessage(msg('res', { objet: 'Arrêt', texte: 'Je souhaite résilier mon abonnement dès que possible.' }));
    v('⛔ « ignorer » sur une demande de RÉSILIATION : non classé non plus', [r.ignore, r.reste, r.classe === true, etat()], [true, true, false, { cl: 0, at: 11 }]);
    r = await Z.camille.surNouveauMessage(msg('err', { objet: 'Ma dernière facture', texte: 'Le montant incorrect de votre dernier document me surprend.' }));
    v('⛔ « ignorer » sur une ERREUR signalée (mots de `erreurDePaiement` seuls, ni prélèvement ni recours) : non classé', [r.ignore, r.reste, r.classe === true, etat()], [true, true, false, { cl: 0, at: 11 }]);
    r = await Z.camille.surNouveauMessage(msg('pubok', { objet: 'Soldes', texte: 'Profitez de nos offres de la semaine.' }));
    v('(contre-épreuve) une vraie publicité, sans ces mots : classée comme avant', [r.ignore, r.classe === true, etat()], [true, true, { cl: 1, at: 10 }]);

    r = await Z.camille.surNouveauMessage(msg('nous', { de: 'collegue@teamop.fr', authentifie: true, texte: 'Rappel interne : réunion à 10 h.' }));
    v('(contre-épreuve) un message de chez nous AUTHENTIFIÉ : classé « interne »', [r.saute, r.classe === true, etat()], ['interne', true, { cl: 2, at: 9 }]);
    r = await Z.camille.surNouveauMessage(msg('fauxnous', { de: 'faux@teamop.fr', authentifie: false, texte: 'Merci de répondre à ce client.' }));
    v('⛔ « de chez nous » SANS authentification (faux From teamop.fr) : non classé, la ligne reste « à traiter »', [r.saute, r.classe === true, etat()], ['interne', false, { cl: 2, at: 9 }]);
    r = await Z.camille.surNouveauMessage(msg('transf', { de: 'collegue@teamop.fr', authentifie: true, objet: 'Fwd: plainte client', texte: 'Voici sa plainte : il parle de prélèvement en double et de son avocat.' }));
    v('⛔ un collègue authentifié qui TRANSFÈRE une plainte à contact@ : non classé', [r.saute, r.classe === true, etat()], ['interne', false, { cl: 2, at: 9 }]);

    r = await Z.camille.surNouveauMessage(msg('autolit', { auto: true, enteteAuto: true, texte: 'Je vous mets en demeure : mon avocat vous écrira.' }));
    v('⛔ un en-tête de liste / « automatique » choisi par l’EXPÉDITEUR au-dessus d’un texte de recours : non classé (et noté « vu » : pas relu à chaque passe)', [r.saute, r.classe === true, etat(), !!Z.fichierJson('agents-camille.json').mids[empreinte('<autolit@banc-3098>')]], ['automatique', false, { cl: 2, at: 9 }, true]);
    r = await Z.camille.surNouveauMessage(msg('autopay', { auto: true, texte: 'Votre prélèvement mensuel a été effectué.' }));
    v('⛔ un message automatique qui parle de PRÉLÈVEMENT : non classé', [r.saute, r.classe === true, etat()], ['automatique', false, { cl: 2, at: 9 }]);
    r = await Z.camille.surNouveauMessage(msg('autook', { auto: true, texte: 'Votre colis est en route.' }));
    v('(contre-épreuve) un message automatique ordinaire : classé « automatique »', [r.saute, r.classe === true, etat()], ['automatique', true, { cl: 3, at: 8 }]);
    vrai('(population) onze lignes de suivi, trois classées de plus que la publicité : le banc a bien joué des classements ET des refus', Object.keys(lignes).length === 11 && etat().cl === 3);
    Z.nettoyer(); R.nettoyer();
  }
  {
    /* les références de ce que Camille a classé sur un JUGEMENT (« ignorer », en-tête automatique) sont dans le bilan : un classement piégé se retrouve */
    const R = mailReel({ '<j1@banc-3098>': ligne({}), '<j2@banc-3098>': ligne({}) });
    const Z = monter({ modes: { camille: 'brouillon' }, claude: () => PUB });
    Z.mail.suiviMarquer = R.M.suiviMarquer; Z.mail.suiviClasser = R.M.suiviClasser; Z.mail.suiviLibre = R.M.suiviLibre;
    Z.mail.arriere = async () => [poser(Z, { uid: 1, mid: '<j1@banc-3098>', texte: 'Offre spéciale.' }), poser(Z, { uid: 2, mid: '<j2@banc-3098>', auto: true, texte: 'Notification.' })];
    await Z.camille.reprendreArriere(3650);
    const bilan = Z.paroles.filter(p => p.fil === 'camille' && /Reprise de l’arriéré/.test(p.texte)).map(p => p.texte).join(' ');
    const r1 = empreinte('<j1@banc-3098>').slice(0, 4), r2 = empreinte('<j2@banc-3098>').slice(0, 4);
    vrai('⛔ le bilan cite les références des classés sur un jugement (« ignore », « automatique »), pas de nom ni d’adresse', bilan.includes('À parcourir au besoin') && bilan.includes(r1 + ' ignore') && bilan.includes(r2 + ' automatique') && !/@|exemple-3098|banc-3098/.test(bilan), bilan);
    Z.nettoyer(); R.nettoyer();
  }

  console.log('\n4. Camille : la reprise AVANCE (file, écartés, attentes, bilan)');
  {
    /* 4a. les décidés ne reprennent pas de place, et leurs lignes de suivi se rangent SANS relire la boîte */
    const T0 = Date.UTC(2026, 9, 28, 10, 0, 0);
    const R = mailReel({ '<ancien-ignore@x>': ligne({ de: 'pub@exemple-3098.fr' }), '<rien-note@x>': ligne({}), '<repris-prise@x>': ligne({ par: 'Justin', assigne: 'Paul', statut: 'enCours' }), '<inconnu-vu@x>': ligne({}) });
    const hA = empreinte('<ancien-ignore@x>'), hR = empreinte('<rien-note@x>'), hP = empreinte('<repris-prise@x>'), hI = empreinte('<inconnu-vu@x>');
    const reg0 = { mids: { [hA]: T0 - 2 * 3600000, [hR]: T0 - 2 * 3600000, [hP]: T0 - 2 * 3600000, [hI]: T0 - 2 * 3600000 }, repris: { [hA]: T0 - 2 * 3600000, [hP]: T0 - 2 * 3600000 }, rien: { [hR]: ['interne', T0 - 3600000] },
      jour: { j: '', brouillons: 0, examens: 0, domaines: {}, prevenu: {} } };
    const Z = monter({ modes: { camille: 'brouillon' }, claude: () => QUESTION, avant: D => fs.writeFileSync(path.join(D, 'agents-camille.json'), JSON.stringify(reg0)) });
    Z.mail.suiviMarquer = R.M.suiviMarquer; Z.mail.suiviClasser = R.M.suiviClasser; Z.mail.suiviLibre = R.M.suiviLibre;
    const neuf = poser(Z, { uid: 9, mid: '<neuf@x>' });
    let opts = null;
    const vus = [Object.assign({ mid: '<ancien-ignore@x>' }, { boiteId: 'b-contact', dossier: 'INBOX', uid: 1, ts: T0 - 5 * JOUR }), { boiteId: 'b-contact', dossier: 'INBOX', uid: 2, mid: '<rien-note@x>', ts: T0 - 5 * JOUR },
      { boiteId: 'b-contact', dossier: 'INBOX', uid: 3, mid: '<repris-prise@x>', ts: T0 - 5 * JOUR }];
    Z.mail.arriere = async (j, o) => { opts = o; const l = [neuf]; l.ecartes = vus.map(x => ({ mid: x.mid, ts: x.ts })); return l; };
    const lecturesAvant = Z.lectures.length;
    const b = await Z.camille.reprendreArriere(3650);
    v('la reprise range le suivi des écartés NOTÉS « rien » (jamais la ligne de Paul/Justin) ; ⛔ un `repris` SANS marque « rien » (un litige passé à Justin, un brouillon, Chloé) n’est PAS rangé « ignoré » : sa ligne, rouverte « à traiter », reste visible', [b.classes, R.M.compter().classes, R.M.suiviLibre('<repris-prise@x>'), R.M.suiviLibre('<ancien-ignore@x>')], [1, 1, false, true]);
    v('…sans relire la boîte pour eux (seul le courriel NEUF est lu)', Z.lectures.length - lecturesAvant, 1);
    vrai('…et le neuf est examiné (une réponse en brouillon)', b.examines === 1 && b.reponses === 1, JSON.stringify(b));
    const bilan = Z.paroles.filter(p => p.fil === 'camille' && /Reprise de l’arriéré/.test(p.texte));
    vrai('le bilan dit les lignes rangées, en nombres, sans adresse ni nom', bilan.length === 1 && /1 ligne du suivi rangée « en cours · Camille » \(rien à répondre\)/.test(bilan[0].texte) && !/@|Hortense|exemple-3098/.test(bilan[0].texte), JSON.stringify(bilan));
    const ec = opts.ecarter;
    const x0 = { boiteId: 'b-contact', dossier: 'INBOX', uid: 1, ts: T0 - 3600000 };
    const vieux = empreinte('<vieux-vu@x>'), enReg = JSON.parse(fs.readFileSync(path.join(Z.D, 'agents-camille.json'), 'utf8'));
    v('`ecarter` reprend le jugement de `traiter` : décidé (vu) → écarté ; marqué « rien » sans « vu » → écarté ; jamais vu → PAS écarté', [ec(Object.assign({ mid: '<inconnu-vu@x>' }, x0)), ec(Object.assign({ mid: '<rien-note@x>' }, x0)), ec(Object.assign({ mid: '<jamais@x>' }, x0))], [true, true, false]);
    v('…un courriel « vu » plus de trois jours APRÈS sa date, sans marque de reprise, se REPREND (le vieil arriéré écarté par la limite d’âge d’avant)', [ec({ mid: '<inconnu-vu@x>', boiteId: 'b-contact', dossier: 'INBOX', uid: 7, ts: T0 - 10 * JOUR }), ec({ mid: '<ancien-ignore@x>', boiteId: 'b-contact', dossier: 'INBOX', uid: 7, ts: T0 - 10 * JOUR })], [false, true]);
    v('…sans Message-ID, la clé est la même que celle de `traiter` (boîte, dossier, uid)', [ec({ mid: '', boiteId: 'b-contact', dossier: 'INBOX', uid: 77, ts: 1 }), (() => { enReg.rien = enReg.rien || {}; return enReg.mids; })() && true], [false, true]);
    Z.nettoyer(); R.nettoyer();
  }
  {
    /* 4a bis. ⛔ un automatique ou un expéditeur illisible SANS ligne de suivi (la Tour ne l'a jamais ouvert) n'est lu qu'UNE fois : sans la garde `reg.rien` d'`ecarter` (ou `noterVu` de l'expéditeur),
       chaque passe en refait la lecture complète — et ils reprenaient les places de la file, l'ancien défaut. */
    const Z = monter({ modes: { camille: 'brouillon' }, claude: () => QUESTION });
    Z.mail.suiviMarquer = () => true; Z.mail.suiviClasser = () => false; Z.mail.suiviLibre = () => true;
    const bruits = [poser(Z, { uid: 1, mid: '<b1@x>', auto: true, texte: 'Notification.' }), poser(Z, { uid: 2, mid: '<b2@x>', auto: true, texte: 'Notification.' }), poser(Z, { uid: 3, mid: '<b3@x>', de: 'pas une adresse' })];
    let ecarter = null;
    Z.mail.arriere = async (j, o) => { ecarter = o && o.ecarter; const l = bruits.filter(x => !(ecarter && ecarter(x))); l.ecartes = bruits.filter(x => ecarter && ecarter(x)).map(x => ({ mid: x.mid, ts: x.ts })); return l; };
    const lect = []; for (let k = 0; k < 4; k++) { const a0 = Z.lectures.length; await Z.camille.reprendreArriere(3650, { silencieux: true }); lect.push(Z.lectures.length - a0); }
    v('⛔ trois passes : les trois courriels sans ligne sont lus UNE fois (3 lectures à la première), puis plus jamais', lect, [3, 0, 0, 0]);
    Z.nettoyer();
  }
  {
    /* 4b. trois courriels qui ATTENDENT (expéditeur déjà deux brouillons en attente) n'arrêtent pas la passe : le quatrième est traité */
    const Z = monter({ modes: { camille: 'brouillon' }, claude: () => QUESTION });
    Z.mail.suiviMarquer = () => true; Z.mail.suiviClasser = () => false; Z.mail.suiviLibre = () => true;
    Z.brouillons.nombreEnAttente = (id, a) => (/^att/.test(a) ? 2 : 0);
    Z.mail.arriere = async () => [1, 2, 3].map(k => poser(Z, { uid: 60 + k, mid: '<att' + k + '@x>', de: 'att' + k + '@exemple-3098.fr' })).concat([poser(Z, { uid: 70, mid: '<libre@x>', de: 'libre@exemple-3098.fr' })]);
    const b = await Z.camille.reprendreArriere(3650);
    v('⛔ trois « expéditeur déjà en attente » en TÊTE de file n’arrêtent plus la reprise (avant : « échecs répétés », et tout ce qui suivait n’était jamais vu)', [b.arret, b.attendent, b.echecs || 0, b.examines, b.reponses], ['', 3, 0, 1, 1]);
    const bilan = Z.paroles.filter(p => p.fil === 'camille' && /Reprise de l’arriéré/.test(p.texte));
    vrai('…et le bilan DIT qu’ils attendent', bilan.length === 1 && /3 attendent \(un expéditeur a déjà deux brouillons en attente/.test(bilan[0].texte), JSON.stringify(bilan));
    Z.nettoyer();
    const Y = monter({ modes: { camille: 'brouillon' }, claude: () => 'Je ne sais pas trop.' });
    Y.mail.suiviMarquer = () => true; Y.mail.suiviClasser = () => false; Y.mail.suiviLibre = () => true;
    Y.mail.arriere = async () => [1, 2, 3, 4].map(k => poser(Y, { uid: 80 + k, mid: '<f' + k + '@x>', de: 'f' + k + '@exemple-3098.fr' }));
    const c = await Y.camille.reprendreArriere(3650);
    v('…mais trois vrais ÉCHECS de suite l’arrêtent toujours (la garde reste)', [c.arret, c.echecs], ['echecs_repetes', 3]);
    Y.nettoyer();
  }
  {
    /* 4c. la dernière reprise, en nombres : ce que Victor et Camille lisent */
    const Z = monter({ modes: { camille: 'brouillon' }, claude: () => PUB });
    const R = mailReel({ '<a@x>': ligne({}), '<b@x>': ligne({}) });
    Z.mail.suiviMarquer = R.M.suiviMarquer; Z.mail.suiviClasser = R.M.suiviClasser; Z.mail.suiviLibre = R.M.suiviLibre;
    const E0 = Z.camille.etatReprise();
    v('avant toute reprise : zéro partout, pas de dernière passe, `null` pour « jamais échoué »', [E0.examinesAujourdhui, E0.classesAujourdhui, E0.dernierePasse, E0.derniereLectureEchoueeIlYAMin, E0.enCours, E0.toutesLesMin], [0, 0, null, null, false, 30]);
    Z.mail.arriere = async () => [poser(Z, { uid: 1, mid: '<a@x>' }), poser(Z, { uid: 2, mid: '<b@x>' })];
    const b = await Z.camille.reprendreArriere(3650, { silencieux: true });
    Z.horloge.t += 12 * 60000;
    const E = Z.camille.etatReprise();
    v('après une passe (même silencieuse) : 2 examinés, 2 classés, il y a 12 minutes, rien d’arrêté', [b.examines, E.examinesAujourdhui, E.classesAujourdhui, E.dernierePasse.examinees, E.dernierePasse.classes, E.dernierePasse.ilYAMin, E.dernierePasse.arretPlafondDuJour, E.dernierePasse.arretEchecs],
      [2, 2, 2, 2, 2, 12, false, false]);
    const feuilles = []; (function marche(x) { if (x && typeof x === 'object') Object.values(x).forEach(marche); else feuilles.push(x); })(E);
    vrai('⛔ le relevé ne porte que des nombres, des booléens et `null` : ni adresse, ni objet, ni identifiant', feuilles.every(x => x === null || typeof x === 'number' || typeof x === 'boolean') && feuilles.length > 15, feuilles.length);
    const bilansAvant = Z.paroles.filter(p => /Reprise de l’arriéré/.test(p.texte)).length;
    const b2 = await Z.camille.reprendreArriere(3650, { silencieux: true });
    const E2 = Z.camille.etatReprise();
    v('une passe suivante qui ne trouve rien se TAIT (aucun bilan de plus) mais se voit : le cumul du jour garde 2 examinés, la dernière passe dit 0', [b2.examines, Z.paroles.filter(p => /Reprise de l’arriéré/.test(p.texte)).length - bilansAvant, E2.examinesAujourdhui, E2.passesAujourdhui, E2.dernierePasse.examinees], [0, 0, 2, 2, 0]);
    {
      /* une passe qui n'a RIEN examiné mais a rangé des lignes (la Tour en avait ouvert) le DIT une fois : sinon les « à traiter » baissent sans que personne sache pourquoi */
      const RW = mailReel({ '<w@x>': ligne({}) }); const hw = empreinte('<w@x>');
      const W2 = monter({ modes: { camille: 'brouillon' }, claude: () => PUB, avant: D => fs.writeFileSync(path.join(D, 'agents-camille.json'), JSON.stringify({ mids: { [hw]: 1 }, rien: { [hw]: ['ignore', 1] }, jour: { j: '', brouillons: 0, examens: 0, domaines: {}, prevenu: {} } })) });
      W2.mail.suiviMarquer = RW.M.suiviMarquer; W2.mail.suiviClasser = RW.M.suiviClasser; W2.mail.suiviLibre = RW.M.suiviLibre;
      W2.mail.arriere = async () => { const l = []; l.ecartes = [{ mid: '<w@x>', ts: 1 }]; return l; };
      const bw = await W2.camille.reprendreArriere(3650, { silencieux: true });
      v('⛔ un ratissage silencieux qui n’a examiné personne mais RANGÉ une ligne le dit une fois (puis se tait)', [bw.examines, bw.classes, W2.paroles.filter(p => /Reprise de l’arriéré/.test(p.texte)).length, (await W2.camille.reprendreArriere(3650, { silencieux: true })).classes, W2.paroles.filter(p => /Reprise de l’arriéré/.test(p.texte)).length], [0, 1, 1, 0, 1]);
      W2.nettoyer(); RW.nettoyer();
    }
    Z.mail.arriere = async () => { throw new Error('IMAP en panne'); };
    const b3 = await Z.camille.reprendreArriere(3650, { silencieux: true });
    Z.horloge.t += 5 * 60000;
    v('une boîte illisible se VOIT (`derniereLectureEchoueeIlYAMin`), et ne grave pas une passe qui n’a pas eu lieu', [b3.raison, Z.camille.etatReprise().derniereLectureEchoueeIlYAMin, Z.camille.etatReprise().passesAujourdhui], ['lecture', 5, 2]);
    /* le plafond du jour se voit : la moitié des examens atteinte */
    const j = new Date(Z.horloge.t).toISOString().slice(0, 10);
    const Y = monter({ modes: { camille: 'brouillon' }, claude: () => PUB, avant: D => fs.writeFileSync(path.join(D, 'agents-camille.json'), JSON.stringify({ mids: {}, jour: { j: new Date(Date.UTC(2026, 9, 23, 9, 0, 0)).toISOString().slice(0, 10), brouillons: 0, examens: 50, domaines: {}, prevenu: {} } })) });
    Y.mail.suiviMarquer = () => true; Y.mail.suiviClasser = () => false; Y.mail.suiviLibre = () => true;
    Y.mail.arriere = async () => [poser(Y, { uid: 1, mid: '<p@x>' })];
    await Y.camille.reprendreArriere(3650);
    const EY = Y.camille.etatReprise();
    v('⛔ la reprise arrêtée par la moitié des plafonds se DIT (`arretPlafondDuJour`) avec ce qui reste', [EY.dernierePasse.arretPlafondDuJour, EY.dernierePasse.restent, EY.dernierePasse.aReprendre, EY.examensRepriseMax, EY.examensAujourdhui], [true, 1, 1, 50, 50]);
    vrai('(population) le jour de la sonde est bien celui du registre', typeof j === 'string' && j.length === 10);
    Z.nettoyer(); Y.nettoyer(); R.nettoyer();
  }

  console.log('\n5. L’outil de Camille : les phrases RÉELLES de Justin l’ouvrent, rien d’autre');
  {
    const C = require(path.join(RACINE, 'server', 'agent-camille.js'));
    const Z = monter({ modes: { camille: 'brouillon' }, claude: () => QUESTION });
    let appels = 0; Z.mail.arriere = async () => { appels++; return []; };
    const O = Z.camille.outilsEquipe;
    const REELLES = ['tu as bien accès à contact@ et support@, il faudrait que tu traites tout des boîtes mail', 'tu vois bien tous les messages même ceux qui sont de plus de 3 jours ?', 'tu gères tous les messages depuis le début de la boîte mail ok je veux un retour dans 2h'];
    for (const [k, p] of REELLES.entries()) {
      const avant = appels; const r = O.executer('reprendre_courriels_anciens', {}, { de: 'justin', texte: p });
      await dormir(40);
      vrai('phrase réelle de Justin n°' + (k + 1) + ' : la reprise est lancée (« ' + p.slice(0, 40) + '… »)', r.ok === true && appels === avant + 1 && /toute la boîte/.test(r.ligne), JSON.stringify(r));
    }
    const avant = appels;
    const refus = [
      O.executer('reprendre_courriels_anciens', {}, { de: 'justin', texte: 'sur les mails tu en es où ?' }),
      O.executer('reprendre_courriels_anciens', {}, { de: 'justin', texte: 'traite le mail de Hortense' }),
      O.executer('reprendre_courriels_anciens', {}, { de: 'justin', texte: 'merci, top' })].map(r => r.raison);
    v('⛔ une question d’ÉTAT (« tu en es où ? »), un verbe seul sur UN mail, un merci : pas de reprise', [refus, appels - avant], [['pas_demande', 'pas_demande', 'pas_demande'], 0]);
    /* (28 octobre, soir) Victor, chef d'orchestre, lance la reprise lui aussi (test-3089) : il sort de cette liste, un autre collègue y entre. */
    const horsJustin = ['hugo', 'client', 'lea', 'hortense@exemple-3098.fr'].flatMap(de => REELLES.map(p => O.executer('reprendre_courriels_anciens', {}, { de, texte: p })));
    await dormir(40);
    v('⛔ les MÊMES phrases venues d’un collègue, d’un client ou d’un texte de courriel : refusées (`pas_justin`), aucune reprise', [horsJustin.every(r => r.ok === false && r.raison === 'pas_justin'), horsJustin.length, appels - avant], [true, 12, 0]);
    vrai('…et le refus DIT à qui le lit que la reprise tourne déjà seule (Camille ne réclame plus de « top départ »)', /tourne déjà seule, toutes les 30 minutes/.test(horsJustin[0].ligne) && /tourne déjà seule, toutes les 30 minutes/.test(refus.length && O.executer('reprendre_courriels_anciens', {}, { de: 'justin', texte: 'merci' }).ligne));
    vrai('(population) la garde de mots est exportée et rejoue ses trois phrases', REELLES.every(C.demandeDeReprise) && !C.demandeDeReprise('sur les mails tu en es où ?'));
    v('l’ÉTENDUE seule suffit (« depuis le début », « de plus de 3 jours »), pour le courrier — chaque motif a son cas', [C.demandeDeReprise('regarde le mail depuis le début'), C.demandeDeReprise('les messages de plus de 3 jours'), C.demandeDeReprise('les messages de moins de 3 jours')], [true, true, false]);
    v('les mots qui servaient avant servent encore (« reprends les anciens courriels », « le retard du courrier »)', [C.demandeDeReprise('Camille, regarde les anciens courriels'), C.demandeDeReprise('reprends le retard du courrier')], [true, true]);
    v('⛔ un TEXTE DE CLIENT qui contient ces mots, lu par Camille pour trier, n’ouvre rien : l’outil n’est offert que sur un message d’un fil, et refuse tout `de` autre que justin', [O.executer('reprendre_courriels_anciens', {}, { de: 'justin ', texte: REELLES[2] }).raison, O.executer('reprendre_courriels_anciens', {}, { texte: REELLES[2] }).raison, O.executer('reprendre_courriels_anciens', {}, null).raison], ['pas_justin', 'pas_justin', 'pas_justin']);
    Z.nettoyer();
  }

  console.log('\n6. Victor et Camille, quand on leur parle : ce que Claude reçoit');
  {
    const AC = require(path.join(RACINE, 'server', 'agent-conversation.js')), REGISTRE = require(path.join(RACINE, 'server', 'agents.js')).AGENTS;
    const Zc = monter({ modes: { camille: 'brouillon' }, claude: () => PUB });
    const R = mailReel({ '<a@x>': ligne({}), '<b@x>': ligne({}), '<c@x>': ligne({}) });
    Zc.mail.suiviMarquer = R.M.suiviMarquer; Zc.mail.suiviClasser = R.M.suiviClasser; Zc.mail.suiviLibre = R.M.suiviLibre;
    Zc.mail.arriere = async () => ['<a@x>', '<b@x>'].map((mid, k) => poser(Zc, { uid: 1 + k, mid }));
    await Zc.camille.reprendreArriere(3650, { silencieux: true });
    const systemes = [];
    const monte = (faits) => AC({ agents: { AGENTS: REGISTRE, peutAgir: () => ({ ok: true, mode: 'brouillon' }) }, conversations: { historique: () => [{ de: 'justin', texte: 'sur les mails tu en es où ?', ts: 1 }], parler: () => ({ ok: true }) },
      cerveau: { penser: async (id, system) => { systemes.push({ id, system }); return { ok: true, texte: 'Voilà.' }; } }, faits });
    const m = monte({ courrier: async () => { const c = R.M.compter(); return { aTraiter: c.aTraiter, enCours: c.enCours, classes: c.classes }; }, reprise: async () => Zc.camille.etatReprise() });
    await m.repondre('equipe', 'sur les mails tu en es où ?'); await m.repondre('camille', 'sur les mails tu en es où ?');
    const sv = systemes.find(x => x.id === 'victor').system, sc = systemes.find(x => x.id === 'camille').system;
    const lireFait = (s, nom) => { const l = s.split('\n').find(x => x.startsWith(nom + ' ')); return l ? JSON.parse(l.slice(l.indexOf('{'))) : null; };
    v('⛔ Victor reçoit le courrier en TROIS morceaux (personne n’y a touché / pris / classés par Camille), pas « 35 et 0 »', lireFait(sv, 'courrier'), { aTraiter: 1, enCours: 0, classes: 2 });
    v('…et ce que la reprise de Camille a fait aujourd’hui (2 examinés, 2 classés), les mêmes nombres que son registre', [lireFait(sv, 'reprise').examinesAujourdhui, lireFait(sv, 'reprise').classesAujourdhui, lireFait(sv, 'reprise').toutesLesMin], [2, 2, 30]);
    v('Camille reçoit les mêmes : le bilan de sa propre reprise et l’état du suivi', [lireFait(sc, 'courrier'), lireFait(sc, 'reprise').dernierePasse.examinees], [{ aTraiter: 1, enCours: 0, classes: 2 }, 2]);
    const lignesFaits = [sv, sc].flatMap(s => s.split('\n').filter(l => /^(courrier|reprise) \{/.test(l)));
    vrai('⛔ le relevé reste FERMÉ : les lignes de faits ne portent que des nombres, des booléens et null (aucune adresse, aucun objet)', lignesFaits.length === 4 && lignesFaits.every(l => !/"[^"]*":\s*"/.test(l) && !/@|exemple-3098|Question|Hortense/.test(l)), lignesFaits.join(' | '));
    const mv = AC.ROLES.victor.mission, mc = AC.ROLES.camille.mission;
    vrai('Victor : la mission dit ce que chaque nombre veut dire, interdit « personne dessus » quand Camille a examiné, et ferme la porte à « donner l’accès à la boîte » (Hugo n’a pas d’outil pour ça)', /aTraiter = les courriels que PERSONNE n’a touchés/.test(mv) && /Tu ne dis JAMAIS « personne dessus »/.test(mv) && /aucun accès à lui donner/.test(mv) && /tu ne demandes jamais à Hugo/.test(mv));
    vrai('Camille : sa reprise tourne SEULE toutes les 30 minutes, elle n’attend aucun « top départ », et sait que l’outil lance la reprise tout de suite si Justin le demande', /tourne SEULE toutes les 30 minutes/.test(mc) && /aucun « top départ »/.test(mc) && /reprendre_courriels_anciens lance la reprise tout de suite/.test(mc));
    v('les deux rôles lisent « reprise » (et « courrier »), et la messagerie les garde après l’élargissement de la plateforme', (() => { const copie = JSON.parse(JSON.stringify(AC.ROLES)); require(path.join(RACINE, 'server', 'plateforme-roles.js')).appliquer(copie); return [copie.victor.faits.includes('reprise') && copie.victor.faits.includes('courrier'), copie.camille.faits.includes('reprise') && copie.camille.faits.includes('courrier')]; })(), [true, true]);
    /* la règle d'honnêteté de la messagerie reste entière */
    const EQ = sansCommentaires(src('agent-equipe.js'));
    vrai('⛔ la règle « honnêteté » de la messagerie est INTACTE (ne jamais promettre ce qu’aucun outil ne fait)', /Tu ne promets jamais d’avoir fait ce que tu n’as pas fait, ni de faire ce qu’aucun de tes outils ne fait/.test(EQ));
    vrai('⛔ la plateforme passe `reprise` à Victor (sans elle, son point du matin ne sait rien de ce que Camille a classé)', /courrier: ctx\.courrier, reprise: ctx\.reprise, clients: ctx\.clients/.test(sansCommentaires(src('agents-plateforme.js'))));
    const IDX = sansCommentaires(src('index.js'));
    vrai('serveur : le relevé `reprise` lit le VRAI `etatReprise` de Camille, sans jamais jeter', /reprise: \(\) => \{ try \{ return agentCamille && typeof agentCamille\.etatReprise === 'function' \? agentCamille\.etatReprise\(\) : null; \} catch \(e\) \{ return null; \} \},/.test(IDX));
    vrai('serveur : le relevé `courrier` porte les classés, et Victor reçoit `reprise` pour son point du matin', /return \{ aTraiter: c\.aTraiter, enCours: c\.enCours, classes: c\.classes \}/.test(IDX) && /courrier: faitsAgents\.courrier, reprise: faitsAgents\.reprise, clients: faitsAgents\.clients/.test(IDX));
    vrai('serveur : une première passe 3 minutes après le démarrage (un déploiement ne repousse plus la reprise de 30 minutes)', /setTimeout\(ratisserArriere, 3 \* 60000\)\.unref\(\);/.test(IDX) && /setInterval\(ratisserArriere, 30 \* 60000\)\.unref\(\);/.test(IDX));
    Zc.nettoyer(); R.nettoyer();
  }

  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.log('  ✗ banc mort : ' + (e && e.stack || e)); console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); process.exit(1); });
