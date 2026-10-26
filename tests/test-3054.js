/* ⛔ CE QUE CE FICHIER GARDE — LES DONNÉES DE L'INVITÉ SANS COMPTE (RGPD, Justin 26 octobre 2026) : « le nom et l'entreprise de l'invité ne vivent que le temps de la réunion, plus le rapport de présence s'il existe ».

   Ce que le service fait, et que ce banc relit sur le VRAI service :
     1. LES JOURNAUX NE PORTENT NI NOM, NI ENTREPRISE, NI JETON — ni celui du lien ni celui de la session — quoi qu'il arrive (entrée, refus, quota, lien mort, fin de salle) : la sortie du service est lue en entier, des canaris
        y sont cherchés, et la population de lignes lues est comptée avant de conclure ; le code de l'invité n'appelle `journaliser` nulle part ;
     2. LA BASE NE LES PORTE PAS EN CLAIR : le nom et l'entreprise sont SCELLÉS (`nom_ch`, `ent_ch`), le jeton du lien n'est qu'une empreinte, celui de la session aussi — aucun octet de la base (ni de son journal WAL) ne les contient ;
     3. À LA FIN DE LA SALLE : la session de l'invité est coupée (`session_h` NULL), le lien est mort, le jeton n'est plus qu'une empreinte notée (`invite_lien_mort`, et le registre des purges, rejoué par une restauration) ;
     4. LE NOM SURVIT UNE FOIS, ET À UN SEUL ENDROIT : le RAPPORT DE PRÉSENCE de l'organisateur (« Paul — Plomberie Durand · invité sans compte », durée, arrivée, départ), qui part avec la séance (`ON DELETE CASCADE` : l'élagage
        de l'historique emporte la ligne d'invité). Ni le COMPTE RENDU écrit dans la conversation de la réunion (il COMPTE les invités sans compte, il ne les nomme pas), ni l'agenda, ni /health ne le portent ;
     5. L'INVITÉ N'A RIEN À EXPORTER NI À EFFACER : il n'a pas de compte — la suppression d'un compte (l'organisateur) emporte la réunion, donc sa ligne.
   ⛔ Une assertion sur un ensemble vide passe et ne prouve rien : les canaris sont d'abord cherchés là où ILS DOIVENT ÊTRE (le rapport de présence), pour prouver que la recherche voit quelque chose. */
'use strict';
const fs = require('fs'), path = require('path');
const T = require('./outils-msg');
const O = require('./outils-invite');
T.sauterSiSansDependances();
const { v, vrai, fin } = T.compteur();

setTimeout(() => { console.log('  ✗ délai global du banc dépassé (150 s)'); process.exit(1); }, 150000).unref();

const NOM = 'Zorglub-Nom-3054', ENT = 'Zorglub-Ent-3054';

(async () => {
  const B = await O.monter({ quotasProd: true });
  const { svc, S } = B;
  const brut = () => new (require('node:sqlite').DatabaseSync)(path.join(svc.data, 'msg.db'));
  const un = (sql, ...a) => { const d = brut(); try { return d.prepare(sql).get(...a); } finally { d.close(); } };
  const tous = (sql, ...a) => { const d = brut(); try { return d.prepare(sql).all(...a); } finally { d.close(); } };
  const dit = (r) => [r.code, r.j && r.j.error];
  try {
    const ana = B.pers('Ana'), ben = B.pers('Ben');
    S.contactLier(ana.id, ben.id); S.contactLier(ben.id, ana.id);
    const a1 = B.cl(ana), b1 = B.cl(ben);
    const rid = await B.programmer(a1, { invites: [ben.id] });
    const jeton = await B.lien(a1, rid);
    const sid = await B.entrerSalle(a1, rid, 'audio');
    await B.entrerSalle(b1, rid, 'audio');

    /* un parcours complet, avec des refus de toute sorte */
    const paul = await B.invite(jeton, NOM, ENT);
    const refuse = await B.invite(jeton, NOM + '-refuse', ENT);
    await B.invite('Z'.repeat(32), NOM, ENT);                              // un jeton inconnu
    await B.invite(jeton, '', ENT);                                          // un nom vide
    for (let i = 0; i < 70; i++) await T.client(svc.base).post('/api/invite/apercu', { jeton });      // un quota atteint (60 par minute)
    await a1.post('/api/salles/' + sid + '/refuser', { uid: refuse.id });
    await a1.post('/api/salles/' + sid + '/admettre', { uid: paul.id });
    await paul.c.post('/api/invite/main', { actif: true });
    await paul.c.get('/api/invite/ice');
    const sessionJeton = paul.c.cookie();
    vrai('population : Paul est dans la salle, Marc a été refusé, un jeton faux et un nom vide ont été essayés', paul.rep.code === 201 && refuse.rep.code === 201 && (await paul.c.get('/api/invite/etat')).j.appel.moi.statut === 'present');

    /* ═══ 4 d'abord : le rapport de présence, là où le nom DOIT être (la preuve que la recherche voit quelque chose) ═══ */
    console.log('1. le rapport de présence de l\'organisateur : le seul endroit où le nom survit');
    const rap = await a1.get('/api/salles/' + sid + '/presence');
    const lp = (rap.j.venus || []).find(x => x.id === paul.id);
    v('Ana lit le rapport : Paul y est, avec son entreprise, signalé « sans compte »', [rap.code, !!lp, lp && lp.prenom, lp && lp.entreprise, lp && lp.invite_sans_compte], [200, true, NOM, ENT, true]);
    const mp = (rap.j.absents || []).find(x => x.id === refuse.id);
    v('… le refusé, jamais entré, figure parmi les absents (avec son nom)', [!!mp, mp && mp.prenom], [true, NOM + '-refuse']);
    vrai('… sa durée et son arrivée sont celles d\'un participant ordinaire', lp && lp.arrivee > 0 && lp.duree_s >= 0 && lp.present === true);
    const rapReunion = await a1.get('/api/reunions/' + rid + '/presence');
    vrai('le rapport de la RÉUNION (ses séances) le porte aussi', JSON.stringify(rapReunion.j).includes(NOM) && JSON.stringify(rapReunion.j).includes(ENT));
    const rapPaul = await paul.c.get('/api/salles/' + sid + '/presence');
    v('⛔ Paul ne le lit pas (le rapport est à l\'organisateur seul) : 401', rapPaul.code, 401);
    const rapBen = await b1.get('/api/salles/' + sid + '/presence');
    v('… ni Ben, participant (403 `interdit`)', dit(rapBen), [403, 'interdit']);

    /* ═══ la fin ═══ */
    console.log('2. la salle finit : session coupée, lien mort, compte rendu sans le nom');
    const t = await a1.post('/api/salles/' + sid + '/terminer', {});
    v('Ana termine la réunion pour tous', t.code, 200);
    const ligne = un('SELECT session_h, nom_ch, ent_ch FROM invite_sans_compte WHERE id = ?', paul.id);
    v('⛔ la session de Paul est COUPÉE dans la base (`session_h` NULL) — et son nom reste scellé pour le rapport', [ligne.session_h, !!ligne.nom_ch], [null, true]);
    v('… elle ne répond plus (401) ; son jeton de session n\'ouvre rien', [(await paul.c.get('/api/invite/etat')).code, (await paul.c.post('/api/invite/main', { actif: true })).code], [401, 401]);
    const mort = un('SELECT motif FROM invite_lien_mort WHERE reunion = ?', rid);
    v('⛔ le lien est mort : la réunion n\'a plus de jeton, l\'empreinte est NOTÉE (« terminée »)', [un('SELECT inv_h, inv_ch FROM reunion WHERE id = ?', rid), mort && mort.motif], [{ inv_h: null, inv_ch: null }, 'terminee']);
    vrai('… et l\'empreinte est au registre des purges (une restauration ne ressuscite pas le lien)', un('SELECT COUNT(*) AS n FROM purge WHERE genre = \'invite_lien\'').n === 1);
    v('… le jeton ouvert après : « Cette réunion est terminée » (410 `reunion_terminee`)', dit(await T.client(svc.base, { xff: '198.51.100.77' }).post('/api/invite/apercu', { jeton })), [410, 'reunion_terminee']);

    const conv = un('SELECT conv FROM reunion WHERE id = ?', rid).conv;
    const msgs = await a1.get('/api/conversations/' + conv + '/messages');
    const cr = (msgs.j.messages || []).find(m => m.meta && m.meta.k === 'compte_rendu');
    vrai('population : le compte rendu est écrit dans la conversation de la réunion', !!cr);
    vrai('⛔ il COMPTE les invités sans compte et ne les NOMME pas (ni le nom ni l\'entreprise, ni dans le texte ni dans la fiche)', cr && !JSON.stringify(msgs.j).includes(NOM) && !JSON.stringify(msgs.j).includes(ENT) && cr.meta.sans_compte_n === 1 && /1 invité sans compte/.test(cr.texte || ''));
    const agenda = await a1.get('/api/reunions?du=' + (Date.now() - 86400000) + '&au=' + (Date.now() + 86400000));
    vrai('population : l\'agenda de l\'organisateur est lu (' + (agenda.j && agenda.j.reunions ? agenda.j.reunions.length : 0) + ' réunion)', agenda.code === 200 && agenda.j.reunions.length >= 1);
    vrai('⛔ l\'agenda (les séances, les présents) ne porte pas non plus le nom', !JSON.stringify(agenda.j).includes(NOM) && !JSON.stringify(agenda.j).includes(ENT));
    const sante = await T.client(svc.base).get('/health');
    vrai('⛔ /health ne le porte pas (et ne dit rien des invités)', sante.code === 200 && !sante.txt.includes(NOM) && !sante.txt.includes(ENT) && !/invit/i.test(sante.txt));

    /* ═══ 1 : les journaux ═══ */
    console.log('3. les journaux : ni nom, ni entreprise, ni jeton');
    await T.dort(300);
    const sortie = svc.sortie.texte();
    const lignes = sortie.split('\n').filter(Boolean);
    vrai('population : la sortie du service a été lue (' + lignes.length + ' lignes)', lignes.length >= 3);
    vrai('population : la sortie contient bien les lignes ordinaires du service (démarrage)', /"evt":"demarre"/.test(sortie));
    const canaris = [NOM, ENT, jeton, sessionJeton, jeton.slice(0, 12), sessionJeton.slice(0, 16), paul.id];
    v('⛔ AUCUNE ligne ne porte un canari : ni le nom, ni l\'entreprise, ni le jeton du lien, ni celui de la session, ni l\'identifiant de l\'invité', canaris.filter(c => sortie.includes(c)), []);
    const SRC_R = T.sansCommentaires(fs.readFileSync(path.join(T.SERVICE, 'routes-invites.js'), 'utf8'));
    v('⛔ le code de l\'invité n\'appelle `journaliser` NULLE PART (routes-invites.js)', (SRC_R.match(/journaliser\s*\(/g) || []).length, 0);
    const SRC_S = T.sansCommentaires(fs.readFileSync(path.join(T.SERVICE, 'stockage.js'), 'utf8'));
    const bloc = SRC_S.slice(SRC_S.indexOf('function inviteLienPoser'), SRC_S.indexOf('function inviteSessionsEchues'));
    vrai('population : le bloc de stockage de l\'invité a été découpé (' + bloc.length + ' signes)', bloc.length > 4000);
    v('… et il n\'écrit ni dans la console ni au journal', (bloc.match(/console\.|journaliser/g) || []).length, 0);

    /* ═══ 2 : la base ═══ */
    console.log('4. la base : rien en clair');
    const octets = ['msg.db', 'msg.db-wal'].map(f => { try { return fs.readFileSync(path.join(svc.data, f)); } catch (e) { return Buffer.alloc(0); } });
    vrai('population : la base a été lue (' + octets.reduce((n, b) => n + b.length, 0) + ' octets)', octets.reduce((n, b) => n + b.length, 0) > 50000);
    v('⛔ ni le nom, ni l\'entreprise, ni le jeton du lien, ni celui de la session ne figurent en clair dans la base ou son journal', [NOM, ENT, jeton, sessionJeton].map(c => octets.some(b => b.includes(Buffer.from(c)))), [false, false, false, false]);
    vrai('… l\'empreinte de session est un SHA-256 (64 hexadécimaux), jamais le jeton — et elle est effacée (NULL) à la fin', tous('SELECT session_h FROM invite_sans_compte').every(r => r.session_h === null));

    /* ═══ 4 : la séance s'élague, la ligne d'invité part avec ═══ */
    console.log('5. la séance s\'élague : la ligne d\'invité part avec elle');
    const avant = un('SELECT COUNT(*) AS n FROM invite_sans_compte').n;
    S.appelsElaguer(Date.now() + 86400000);        // tout appel fini créé avant demain est effacé
    const apres = un('SELECT COUNT(*) AS n FROM invite_sans_compte').n;
    v('⛔ élaguer l\'historique emporte les lignes d\'invité (`ON DELETE CASCADE`) : leur nom ne survit pas à la séance', [avant >= 2, apres], [true, 0]);
    v('… et leurs lignes de salle aussi (pas de `g_…` orphelin)', un('SELECT COUNT(*) AS n FROM appel_part WHERE uid LIKE \'g\\_%\' ESCAPE \'\\\'').n, 0);
    /* la réunion supprimée emporte tout ce qui reste : l'empreinte de lien morte aussi */
    const sup = await a1.post('/api/reunions/' + rid + '/supprimer', { notifier: false });
    v('l\'organisateur supprime la réunion : tout part (200)', sup.code, 200);
    v('… la mémoire du lien mort part avec elle', un('SELECT COUNT(*) AS n FROM invite_lien_mort').n, 0);
  } catch (e) { console.log('  ✗ le banc est mort : ' + (e && e.stack || e)); process.exitCode = 1; }
  finally { await B.arreter(); }
  fin();
})();
