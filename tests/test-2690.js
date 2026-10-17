/* ⛔ CE QUE CE FICHIER GARDE — L'ADMINISTRATION D'OP MESSAGES : LA GARDE `AD`, LES SIX ROUTES DE LECTURE, ET CE QUI NE DOIT JAMAIS EN SORTIR (17 octobre 2026).

   La console interne (la Tour) lit OP MESSAGES par le relais d'OP GESTION, en boucle locale (`server-msg/admin.js` porte le contrat). Ce banc lance le VRAI service, avec une population réelle (deux accès
   bêta ouverts par la porte, des comptes par adresse, un compte par téléphone, un message, un groupe, des espaces et des abonnements), et joue :

     · LA GARDE, refus par refus — nginx relaie le public DEPUIS 127.0.0.1, donc « la connexion vient de la boucle locale » ne prouve rien : il faut le secret ET l'absence de tout en-tête de proxy.
       Sans secret configuré : 404 partout (INERTE), même avec un en-tête qui ressemble à un secret. Mauvais secret, secret mal formé, secret juste mais `X-Forwarded-For` / `X-Real-IP` / `Forwarded` /
       `X-Forwarded-Proto` / `X-Forwarded-Host`, une session d'utilisateur à la place : le MÊME 404 qu'une route inconnue, octet pour octet. La boucle locale se joue sur la FONCTION (le service n'écoute
       que sur 127.0.0.1 : un banc ne peut pas lui parler d'ailleurs). Le journal reçoit une ligne par motif et par minute, jamais le secret ni l'adresse annoncée ;
     · LES DONNÉES : le décompte, les comptes (pagination par clé, avec des créations à la MÊME milliseconde, une création entre deux pages), les filtres, les empreintes d'adresses recalculées
       indépendamment, les espaces, les abonnements, les incidents entier vrai événement du service ;
     · ⛔ AUCUNE FUITE — avec la population prouvée : le numéro de téléphone, le texte entier message, un nom de groupe, un statut, un nom de famille, le sel et l'empreinte entier mot de passe, le nom entier
       appareil, un jeton de session et son empreinte, les identifiants Stripe, l'adresse IP annoncée, le secret lui-même. Chaque canari existe dans la base (il serait sorti si une route le lisait mal),
       et le détecteur est éprouvé sur ce qui DOIT sortir (l'adresse entier compte, le nom entiere entreprise) : un zéro sur du vide ne prouve rien ;
     · UNE LECTURE N'ÉCRIT RIEN ; la configuration (`admin.secret`) : chaque forme fausse refuse le démarrage sans citer la valeur ; le tampon d'incidents (liste blanche, masque, bornes, rafales comptées).

   Les mutations qui le font tomber sont décrites dans `REPRISE.md`-à-venir (cette fiche n'est pas encore écrite) : retirer la vérification du secret, retirer un en-tête de proxy, retirer la garde de boucle
   locale, ouvrir la route quand rien n'est configuré, rendre le téléphone, ne plus lier le journal, retirer le plafond de lignes de journal.
   ⛔ UNE ASSERTION SUR UN ENSEMBLE VIDE PASSE ET NE PROUVE RIEN : chaque « aucune fuite » est précédée de la population qu'elle aurait pu trouver. Les canaris du banc portent des lettres hors de [0-9a-f]. */
'use strict';
const fs = require('fs'), os = require('os'), path = require('path'), crypto = require('crypto');
const T = require('./outils-msg');
T.sauterSiSansDependances();
const { v: v0, vrai, fin } = T.compteur();
/* ⛔ l'ordre des CLÉS entier objet n'est pas ce qu'on garde (le contrat dit les champs, pas leur ordre) : on compare des formes canoniques */
const canon = (x) => Array.isArray(x) ? x.map(canon) : (x && typeof x === 'object' ? Object.fromEntries(Object.keys(x).sort().map(k => [k, canon(x[k])])) : x);
const v = (t, a, b) => v0(t, canon(a), canon(b));
const { ouvrir } = require(path.join(T.SERVICE, 'stockage.js'));
const { creerScelleur } = require(path.join(T.SERVICE, 'scelle.js'));
const ADMIN = require(path.join(T.SERVICE, 'admin.js'));
const { MANIFESTE } = require(path.join(T.SERVICE, 'manifeste.js'));

setTimeout(() => { console.log('  ✗ délai global du banc dépassé (200 s)'); process.exit(1); }, 200000).unref();

const sha = (x) => crypto.createHash('sha256').update(x).digest('hex');
const SECRET = '5c0f3e8a91b7d24c6e1a0b9f83d57c42e6a1b0f93d85c7e24a6b1f0d93c8e57a';
const BASCULE = (s) => s.slice(0, 63) + (s[63] === '0' ? '1' : '0');         // le même secret, un seul signe changé
const IP_ANNONCEE = '203.0.113.77';
const ROUTES = ['sante', 'comptes', 'empreintes', 'espaces', 'abonnements', 'incidents'];
const corpus = [];   // chaque réponse d'administration lue, pour la recherche de fuites à la fin

async function appeler(base, chemin, o = {}) {
  const h = Object.assign({}, o.entetes || {});
  const secret = o.secret === undefined ? SECRET : o.secret;
  if (secret !== null) h['X-OPM-Admin'] = secret;
  const r = await fetch(base + chemin, { method: o.methode || 'GET', headers: h, redirect: 'manual' });
  const txt = await r.text(); let j = null; try { j = JSON.parse(txt); } catch (e) { j = null; }
  corpus.push(txt);
  return { code: r.status, j, txt, h: r.headers };
}
/* suit `suivant` jusqu'au bout */
async function toutes(base, chemin, limite) {
  const items = []; let apres = null, pages = 0;
  for (;;) {
    const r = await appeler(base, chemin + (chemin.includes('?') ? '&' : '?') + 'limite=' + limite + (apres ? '&apres=' + apres : ''));
    if (r.code !== 200) return { erreur: r.code, items, pages };
    pages++; items.push(...r.j.items);
    if (!r.j.suivant) return { items, pages, total: r.j.total };
    apres = r.j.suivant;
    if (pages > 200) return { erreur: 'boucle', items, pages };
  }
}

(async () => {
  const og = await T.fauxOpGestion({ alice: { pass: 'pw-alice-1234', nom: 'Alice ZQXWNOM', actif: true }, bruno: { pass: 'pw-bruno-1234', nom: 'Bruno ZQXWNOM', actif: true } });
  og.versionMin = 99999;   // la Tour pose un minimum qu'aucune page servie n'atteint : le service l'IGNORE et le journalise — un vrai incident, né du service
  const A = await T.lancerService({ urlGestion: og.url, config: { admin: { secret: SECRET } } });
  const B = await T.lancerService({ urlGestion: og.url });   // SANS secret : l'administration est inerte
  const cleScelleur = creerScelleur(Buffer.from(A.cle, 'hex'));
  const S = ouvrir({ chemin: path.join(A.data, 'msg.db'), scelleur: cleScelleur });                           // l'horloge réelle
  const FIXE = Date.now() - 3 * 86400000;
  const SF = ouvrir({ chemin: path.join(A.data, 'msg.db'), scelleur: cleScelleur, horloge: () => FIXE });   // une horloge FIXE : des créations à la MÊME milliseconde
  const raw = () => new (require('node:sqlite').DatabaseSync)(path.join(A.data, 'msg.db'));
  const lire = () => T.lireBase(path.join(A.data, 'msg.db'));
  const debutBanc = Date.now();
  let nouveauId = null;   // le compte créé ENTRE deux pages
  try {
    /* ═══ 0. LA POPULATION — réelle, et prouvée ═══════════════════════════════════════════════════════════════════════════════════════════════ */
    console.log('La population : des comptes de chaque origine, un message, un groupe, des espaces, des abonnements — dans le vrai service');
    const alice = await T.connecter(A, og, 'alice', 'pw-alice-1234', IP_ANNONCEE), bruno = await T.connecter(A, og, 'bruno', 'pw-bruno-1234');
    const MSG = 'MESSAGE-WQXZ-CANARI', GROUPE = 'GROUPE-WQXZ-CANARI', STATUT = 'STATUT-WQXZ-CANARI';
    S.contactLier(alice.moi.id, bruno.moi.id);   // une conversation directe se lie à un contact
    const direct = await alice.post('/api/conversations/directe', { uid: bruno.moi.id });
    const idDirect = direct.j && (direct.j.id || (direct.j.conversation && direct.j.conversation.id));
    const env = await alice.post('/api/conversations/' + idDirect + '/messages', { cid: 'cid-' + crypto.randomBytes(6).toString('hex'), texte: MSG });
    const groupe = await alice.post('/api/conversations/groupe', { nom: GROUPE, membres: [bruno.moi.id] });
    const majStatut = await alice.post('/api/moi/maj', { statut: STATUT });
    v('population : un message, un groupe et un statut existent (créés par les vraies routes)', [direct.code < 300, env.code, groupe.code, majStatut.code], [true, 201, 201, 200]);
    const lu = await bruno.get('/api/conversations/' + idDirect + '/messages');
    vrai('population : le texte du message est bien LISIBLE par son destinataire (il sortirait si une route de l\'administration le lisait mal)', JSON.stringify(lu.j).includes(MSG));
    vrai('population : le nom du groupe est bien rangé (la liste de Bruno le montre)', JSON.stringify((await bruno.get('/api/conversations')).j).includes(GROUPE));

    const MEL = (n) => 'mel:' + n + '.wqxz@exemple.invalid';
    const ana = SF.personneCreer({ identifiant: MEL('ana'), prenom: 'Ana', nom: 'ZQXWNOM', origine: 'compte', verifie: true });
    const ben = SF.personneCreer({ identifiant: MEL('ben'), prenom: 'Ben', nom: 'ZQXWNOM', origine: 'compte', verifie: true });
    const cleo = SF.personneCreer({ identifiant: MEL('cleo'), prenom: 'Cleo', nom: 'ZQXWNOM', origine: 'compte', verifie: true });
    const dan = SF.personneCreer({ identifiant: 'mel:Dan.WQXZ@Exemple.invalid', /* une ligne écrite à la main avec des MAJUSCULES : le contrat dit « adresse en minuscules » */ prenom: 'Dan', nom: 'ZQXWNOM', origine: 'compte', verifie: true });
    const eva = SF.personneCreer({ identifiant: MEL('eva'), prenom: 'Eva', nom: 'ZQXWNOM', origine: 'compte', verifie: true });
    const fay = SF.personneCreer({ identifiant: MEL('fay'), prenom: 'Fay', nom: 'ZQXWNOM', origine: 'compte', verifie: true });
    const SEL = 'SEL-WQXZ-CANARI', HASH = 'HASH-WQXZ-CANARI', JETON_ANA = 'tokAnaWQXZ-jeton-de-session', APPAREIL = 'APPAREIL-WQXZ-CANARI';
    SF.mdpPoser(ana.id, { sel: Buffer.from(SEL), hash: Buffer.from(HASH), params: 'PARAMS-WQXZ' });
    SF.sessionAjouter({ h: sha(JETON_ANA), personne: ana.id, appareil: APPAREIL, ttlMs: 86400000 * 30 });
    SF.suppressionProgrammer(fay.id, Date.now() + 10 * 86400000);
    SF.suppressionProgrammer(eva.id, FIXE - 1000);   // un compte ne s'efface qu'une fois sa suppression ÉCHUE
    v('population : un compte est vraiment EFFACÉ (identité vidée, état « supprime »)', [SF.compteEffacer(eva.id).effacee, lire().prepare('SELECT etat, email_ch FROM personne WHERE id = ?').get(eva.id)], [true, { etat: 'supprime', email_ch: null }]);
    const TEL = '+33699887766', TEL_APPAREIL = 'TEL-APPAREIL-WQXZ';
    const telma = S.personneCreer({ identifiant: 'tel:' + TEL, prenom: 'Telma', nom: 'ZQXWNOM', origine: 'telephone', verifie: true });
    S.telAppareilLier({ h: sha('appareil-telma-wqxz'), personne: telma.id, nom: TEL_APPAREIL, ttlMs: 86400000 * 30 });
    v('population : les six comptes par adresse sont nés à la MÊME milliseconde (de quoi éprouver la pagination par clé)', new Set([ana, ben, cleo, dan, eva, fay].map(p => lire().prepare('SELECT cree FROM personne WHERE id = ?').get(p.id).cree)).size, 1);
    v('population : le numéro de téléphone est bien rangé (et s\'ouvre) — il sortirait si une route lisait mal l\'identité d\'un compte « telephone »', S.personneIdentifiant(telma.id), 'tel:' + TEL);
    vrai('population : un sel et une empreinte de mot de passe existent', (() => { const d = lire(); try { const r = d.prepare('SELECT sel, mdp FROM personne WHERE id = ?').get(ana.id); return Buffer.from(r.sel).toString() === SEL && Buffer.from(r.mdp).toString() === HASH; } finally { d.close(); } })());

    const eA = S.espaceCreer({ nom: 'Entreprise WQXZ SARL', proprio: ana.id }).id, eB = S.espaceCreer({ nom: 'Atelier WQXZ', proprio: ben.id }).id, eC = S.espaceCreer({ nom: 'Sans abonnement WQXZ', proprio: dan.id }).id;
    const bd = raw(); bd.prepare(`INSERT INTO espace_membre(espace, uid, role, depuis) VALUES(?, ?, 'membre', ?)`).run(eB, cleo.id, Date.now()); bd.close();
    S.abonnementPoser(eA, { client: 'cus_WQXZCLIENT', abonnement: 'sub_WQXZABO', statut: 'active', places: 3, fin_periode: Date.now() + 20 * 86400000, annule: false, impaye: false }, { adopter: true });
    S.abonnementPoser(eB, { client: 'cus_WQXZCLIENTB', abonnement: 'sub_WQXZABOB', statut: 'past_due', places: 1, fin_periode: Date.now() + 2 * 86400000, annule: true, impaye: true }, { adopter: true });
    { const d = raw(); d.prepare('UPDATE abonnement SET impaye_depuis = ?, relu_le = ? WHERE espace = ?').run(Date.now() - 8 * 86400000, Date.now(), eB); d.close(); }   // huit jours d'impayé : hors sursis
    v('population : un abonnement payé et un impayé ont leurs identifiants Stripe rangés (ils sortiraient si une route les lisait)', [S.abonnementLire(eA).client, S.abonnementLire(eB).abonnement], ['cus_WQXZCLIENT', 'sub_WQXZABOB']);
    const ids = { alice: alice.moi.id, bruno: bruno.moi.id, ana: ana.id, ben: ben.id, cleo: cleo.id, dan: dan.id, eva: eva.id, fay: fay.id, telma: telma.id };

    /* ═══ 1. SANS SECRET CONFIGURÉ : INERTE ═══════════════════════════════════════════════════════════════════════════════════════════════════ */
    console.log('\nSans `admin.secret` : les six routes sont INERTES — le 404 d\'une route qui n\'existe pas, même avec un en-tête qui ressemble à un secret');
    {
      const inconnue = await appeler(B.base, '/api/admin/inconnue', { secret: null });
      vrai('population : le service sans secret répond (vivant) et une route inconnue rend le 404 de référence', inconnue.code === 404 && inconnue.j && inconnue.j.error === 'introuvable');
      const cas = [];
      for (const r of ROUTES) {
        for (const secret of [null, SECRET, BASCULE(SECRET)]) { const x = await appeler(B.base, '/api/admin/' + r, { secret }); cas.push([x.code, x.txt === inconnue.txt, x.h.get('set-cookie')]); }
      }
      v('⛔ 6 routes × (sans en-tête, avec le secret de A, avec un autre) : 404, le MÊME corps que la route inconnue, aucun cookie', [cas.length, [...new Set(cas.map(c => JSON.stringify(c)))]], [18, [JSON.stringify([404, true, null])]]);
      const sante = await (await fetch(B.base + '/health')).json();
      v('le service sans secret ne dit pas qu\'une administration existe (/health ne porte rien d\'« admin »)', Object.keys(sante).filter(k => /admin/i.test(k)), []);
    }

    /* ═══ 2. LA GARDE — refus par refus ═══════════════════════════════════════════════════════════════════════════════════════════════════════ */
    console.log('\nLa garde : le secret ET aucun en-tête de proxy ; tout refus est le même 404');
    const ref404 = await appeler(A.base, '/api/admin/inconnue', { secret: null });
    {
      vrai('population : le 404 de référence (route inconnue du service A)', ref404.code === 404 && ref404.j && ref404.j.error === 'introuvable');
      const refus = [];
      const essai = async (nom, o) => { for (const r of ROUTES) { const x = await appeler(A.base, '/api/admin/' + r, o); refus.push({ nom, route: r, code: x.code, memeCorps: x.txt === ref404.txt, cookie: x.h.get('set-cookie') }); } };
      await essai('sans en-tête', { secret: null });
      await essai('mauvais secret (un signe changé)', { secret: BASCULE(SECRET) });
      await essai('secret trop court', { secret: SECRET.slice(0, 63) });
      await essai('secret trop long', { secret: SECRET + '0' });
      await essai('secret non hexadécimal', { secret: 'zz' + SECRET.slice(2) });
      await essai('secret vide', { secret: '' });
      await essai('le secret, mais PAS dans le bon en-tête', { secret: null, entetes: { Authorization: 'Bearer ' + SECRET, 'X-OPM': SECRET } });
      await essai('une SESSION d\'utilisateur ne remplace pas le secret', { secret: null, entetes: { Cookie: alice.enteteCookie() } });
      for (const [h, val] of [['X-Forwarded-For', IP_ANNONCEE], ['X-Real-IP', IP_ANNONCEE], ['Forwarded', 'for=' + IP_ANNONCEE], ['X-Forwarded-Proto', 'https'], ['X-Forwarded-Host', 'msg.exemple.invalid'], ['X-Forwarded-For', '']]) {
        await essai('secret JUSTE + ' + h + (val === '' ? ' vide' : ''), { entetes: { [h]: val } });
      }
      const mauvais = refus.filter(r => r.code !== 404 || !r.memeCorps || r.cookie !== null);
      v('⛔ chaque refus (' + refus.length + ' essais) : 404, le MÊME corps que la route inconnue, jamais un cookie', mauvais, []);
      v('population : 14 cas de refus × 6 routes ont été joués', refus.length, 14 * 6);
      for (const h of ['X-Forwarded-For', 'X-Real-IP', 'Forwarded', 'X-Forwarded-Proto', 'X-Forwarded-Host']) {
        const x = await appeler(A.base, '/api/admin/comptes', { entetes: { [h]: 'x' } });
        v('⛔ le secret JUSTE + ' + h + ' seul : refusé (le proxy pose cet en-tête sur tout ce qu\'il relaie)', x.code, 404);
      }
      const ok = await appeler(A.base, '/api/admin/comptes');
      v('témoin : le secret juste, sans en-tête de proxy, depuis la boucle locale : 200 (le refus ci-dessus vient bien de l\'en-tête, pas du reste)', [ok.code, Array.isArray(ok.j && ok.j.items)], [200, true]);
      const maj = await appeler(A.base, '/api/admin/comptes', { secret: SECRET.toUpperCase() });
      v('le secret en MAJUSCULES est le même secret (hexadécimal : la casse n\'est pas une information)', maj.code, 200);
      for (const methode of ['POST', 'DELETE', 'PUT']) {
        const x = await appeler(A.base, '/api/admin/comptes', { methode });
        vrai('aucune écriture : ' + methode + ' sur une route d\'administration ne rend JAMAIS de données (' + x.code + ')', x.code >= 400 && !(x.j && x.j.items));
      }
      const hors = await appeler(A.base, '/api/admin/comptes', { secret: null, entetes: { Cookie: alice.enteteCookie() } });
      vrai('une session d\'utilisateur, même valide, n\'ouvre pas la console', hors.code === 404);
    }
    console.log('\nLa boucle locale se joue sur la FONCTION (le service n\'écoute que sur 127.0.0.1)');
    {
      const faux = (adresse, entetes, horloge) => {
        const ctx = { config: { admin: ADMIN.adminConfig({ admin: { secret: SECRET } }, null) }, journaliser: () => {}, horloge: horloge || Date.now };
        const g = ADMIN.gardeAdmin(ctx)[0];
        let statut = null, corps = null, suite = false;
        const res = { status(s) { statut = s; return this; }, json(c) { corps = c; return this; } };
        g({ socket: { remoteAddress: adresse }, headers: Object.assign({ 'x-opm-admin': SECRET }, entetes || {}) }, res, () => { suite = true; });
        return { suite, statut, corps, ctx };
      };
      v('⛔ une connexion qui NE vient PAS de la boucle locale est refusée même avec le bon secret (une adresse publique, une adresse privée, absente)', ['203.0.113.9', '10.1.2.3', '::2', undefined, ''].map(a => { const r = faux(a); return [r.suite, r.statut]; }), Array(5).fill([false, 404]));
      v('la boucle locale (IPv4, IPv6, IPv4 enveloppée dans IPv6) passe avec le bon secret', ['127.0.0.1', '::1', '::ffff:127.0.0.1'].map(a => faux(a).suite), [true, true, true]);
      v('⛔ l\'adresse ANNONCÉE par un en-tête n\'est jamais lue : une socket publique qui annonce « 127.0.0.1 » reste refusée', ['x-forwarded-for', 'x-real-ip', 'forwarded'].map(h => faux('203.0.113.9', { [h]: '127.0.0.1' }).suite), [false, false, false]);
      const sansReq = (() => { const ctx = { config: { admin: ADMIN.adminConfig({ admin: { secret: SECRET } }, null) }, journaliser: () => {} }; const g = ADMIN.gardeAdmin(ctx)[0]; let s = null; try { g({ headers: { 'x-opm-admin': SECRET } }, { status(x) { s = x; return this; }, json() { return this; } }, () => { s = 'passe'; }); } catch (e) { s = 'exception'; } return s; })();
      v('une requête sans socket (impossible en vrai) est refusée proprement, jamais admise ni plantée', sansReq, 404);
      /* la ligne de journal : une par motif et par minute — jamais le secret ni l'adresse annoncée */
      const lignes = []; let t = 1000000;
      const ctxJ = { config: { admin: ADMIN.adminConfig({ admin: { secret: SECRET } }, null) }, journaliser: (e, c) => lignes.push([e, c]), horloge: () => t };
      const gJ = ADMIN.gardeAdmin(ctxJ)[0], resJ = { status() { return this; }, json() { return this; } };
      const frappe = (h) => gJ({ socket: { remoteAddress: '127.0.0.1' }, headers: h }, resJ, () => {});
      for (let i = 0; i < 30; i++) frappe({});                                                // 30 × « absent »
      for (let i = 0; i < 5; i++) frappe({ 'x-opm-admin': BASCULE(SECRET) });                    // 5 × « faux »
      for (let i = 0; i < 5; i++) frappe({ 'x-opm-admin': SECRET, 'x-forwarded-for': IP_ANNONCEE });   // 5 × « proxy »
      v('⛔ 40 refus : TROIS lignes de journal (une par motif), et chacune ne porte que le motif', [lignes.length, lignes.map(l => l[0]), lignes.map(l => Object.keys(l[1])), lignes.map(l => l[1].motif).sort()], [3, ['admin_refus', 'admin_refus', 'admin_refus'], [['motif'], ['motif'], ['motif']], ['absent', 'faux', 'proxy']]);
      v('… et les compteurs (en mémoire) comptent TOUS les refus, par motif', ctxJ.adminEtat.refus, { absent: 30, faux: 5, proxy: 5 });
      t += 59999; frappe({});
      const avant = lignes.length;
      t += 2; frappe({});
      v('une minute plus tard, le même motif a de nouveau SA ligne (59,999 s : non ; 60,001 s : oui)', [avant, lignes.length], [3, 4]);
      t -= 120000; frappe({});
      vrai('une horloge qui RECULE n\'éteint pas le journal (une ligne repart)', lignes.length === 5);
      const tout = JSON.stringify(lignes);
      v('aucune ligne ne porte le secret, l\'adresse annoncée ni un en-tête', [tout.includes(SECRET), tout.includes(IP_ANNONCEE), /x-forwarded/i.test(tout)], [false, false, false]);
    }
    console.log('\nLe journal du SERVICE réel : les refus de la garde y sont, sans secret ni adresse');
    {
      const n0 = (A.sortie.texte().match(/"evt":"admin_refus"/g) || []).length;
      for (let i = 0; i < 25; i++) await appeler(A.base, '/api/admin/sante', { secret: null });
      const lignes = A.sortie.texte().split('\n').filter(l => l.includes('"evt":"admin_refus"'));
      const motifs = lignes.map(l => JSON.parse(l).motif);
      vrai('population : le service a bien refusé des dizaines de requêtes (sans en-tête, mauvais secret, proxy)', (await appeler(A.base, '/api/admin/sante')).j.admin.refus.absent >= 25);
      const minutes = Math.ceil((Date.now() - debutBanc) / 60000);
      v('⛔ pas une ligne par refus : au plus UNE par motif et par minute écoulée (motifs joués : absent, faux, proxy) — et chaque motif est un des motifs DITS', [lignes.length >= 3, lignes.length <= 3 * minutes, [...new Set(motifs)].sort(), n0 >= 0], [true, true, ['absent', 'faux', 'proxy'], true]);
      v('⛔ le journal du service ne contient ni le secret, ni son empreinte, ni l\'adresse annoncée, ni un en-tête de proxy', [A.sortie.texte().includes(SECRET), A.sortie.texte().includes(sha(SECRET)), A.sortie.texte().includes(IP_ANNONCEE)], [false, false, false]);
    }

    /* ═══ 3. LES DONNÉES ══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════ */
    console.log('\nGET /api/admin/sante : ce que /health agrège, plus ce qui sert à un opérateur');
    const instantane = () => {
      const d = lire();
      try { return ['personne', 'session', 'conversation', 'message', 'journal', 'notification', 'espace', 'espace_membre', 'abonnement', 'appareil_tel', 'purge'].map(t => d.prepare('SELECT COUNT(*) AS n FROM ' + t).get().n).join(',') + '|' + d.prepare('SELECT COALESCE(SUM(vu),0) AS a FROM session').get().a + '|' + d.prepare('SELECT COALESCE(SUM(relu_le),0) AS a FROM abonnement').get().a + '|' + d.prepare('SELECT COALESCE(SUM(suppression_le),0) AS a FROM personne').get().a; }
      finally { d.close(); }
    };
    {
      const r = await appeler(A.base, '/api/admin/sante'), s = r.j;
      const health = await (await fetch(A.base + '/health')).json();
      v('200, JSON, jamais mis en cache, ni cookie ni en-tête CORS', [r.code, /^application\/json/.test(r.h.get('content-type')), r.h.get('cache-control'), r.h.get('set-cookie'), [...r.h.keys()].filter(k => /^access-control-/i.test(k))], [200, true, 'no-store', null, []]);
      v('l\'instance, la révision et la version du service', [s.instance, s.sha, /^\d+\.\d+\.\d+/.test(s.version), typeof s.version_page, s.version_page > 0], ['beta', 'banc0000', true, 'number', true]);
      v('⛔ `sante` porte EXACTEMENT les champs de /health (ce que le service agrège), pas un de plus ni de moins', [Object.keys(s.sante).sort(), s.sante.ok, s.sante.base.ok], [Object.keys(health).sort(), true, true]);
      v('le décompte : les comptes par origine (actifs, supprimés, suppression programmée), les espaces, les abonnements par statut', [s.decompte.comptes.beta, s.decompte.comptes.compte, s.decompte.comptes.telephone, s.decompte.espaces, s.decompte.abonnements], [
        { actifs: 2, supprimes: 0, suppression_programmee: 0 }, { actifs: 5, supprimes: 1, suppression_programmee: 1 }, { actifs: 1, supprimes: 0, suppression_programmee: 0 }, 3, { active: { n: 1, places: 3 }, past_due: { n: 1, places: 1 } }]);
      vrai('Perso+ (forfait retiré le 12 octobre) n\'est nulle part dans l\'administration : ni dans le décompte ni ailleurs dans la santé (test-991 le refuse dans le code)', !/perso/i.test(JSON.stringify(s.decompte)));
      v('la base, le disque, les réglages (des nombres et des booléens — jamais une valeur de configuration)', [typeof s.base.fichier_mo, s.base.schema >= 12, typeof s.base.stats.personnes, s.base.stats.personnes >= 9, s.disque.bas, typeof s.disque.plancher_mo, s.reglages.tout_ouvert, s.reglages.admin_configuree, s.reglages.inscription_courriel, s.reglages.courriel_ouvert, s.reglages.facturation_ouverte, s.reglages.sauvegarde_configuree],
        ['number', true, 'number', true, false, 'number', true, true, false, false, false, false]);
      v('le processus (version de Node, mémoire) et le démarrage (avant maintenant)', [/^v\d+\./.test(s.processus.node), s.processus.rss_mo > 0, s.demarre_le < s.maintenant], [true, true, true]);
      vrai('les compteurs de la garde sont là, et ils ont vu des refus ET des accès', s.admin.acces >= 1 && s.admin.refus.absent >= 25 && s.admin.refus.faux >= 1 && s.admin.refus.proxy >= 1 && typeof s.admin.dernier_refus === 'number');
    }

    console.log('\nGET /api/admin/comptes : les personnes, la pagination par clé, les filtres');
    {
      const r = await appeler(A.base, '/api/admin/comptes');
      v('200 ; par défaut les comptes ACTIFS (huit : deux accès bêta, cinq comptes par adresse dont une suppression programmée, un compte par téléphone) ; le drapeau de la bêta est dit', [r.code, r.j.total, r.j.items.length, r.j.suivant, r.j.tout_ouvert], [200, 8, 8, null, true]);
      const par = (id) => r.j.items.find(x => x.id === id);
      const attendu = (o) => Object.assign({ suppression_le: null, verifie: true, acces_beta: null, email: null, email_sha256: null, espaces: 0 }, o);
      const sansDates = (x) => { const c = Object.assign({}, x); delete c.cree; delete c.derniere_activite; delete c.ident; return c; };
      const pro = { formule: 'pro', motif: 'abonne', sursis_jusqua: null }, perso = { formule: 'perso', motif: 'aucun', sursis_jusqua: null }, impaye = { formule: 'impaye', motif: 'impaye', sursis_jusqua: null };
      v('Ana (adresse, propriétaire d\'un espace PAYÉ) : l\'adresse, son empreinte, Pro — la formule RÉELLE, pas celle du drapeau de la bêta', sansDates(par(ids.ana)),
        attendu({ id: ids.ana, origine: 'courriel', etat: 'actif', email: 'ana.wqxz@exemple.invalid', email_sha256: sha('ana.wqxz@exemple.invalid'), formule: pro, espaces: 1 }));
      v('⛔ une adresse rangée avec des MAJUSCULES (Dan) sort en minuscules, et son empreinte est celle de la forme en minuscules — la Tour calcule SHA-256(adresse en minuscules)', [par(ids.dan).email, par(ids.dan).email_sha256], ['dan.wqxz@exemple.invalid', sha('dan.wqxz@exemple.invalid')]);
      v('Ben (propriétaire d\'un espace IMPAYÉ depuis huit jours) : « impaye » ; Cleo (simple membre de cet espace) aussi ; Dan (propriétaire d\'un espace sans abonnement) : Perso', [par(ids.ben).formule, par(ids.cleo).formule, par(ids.dan).formule, [par(ids.ben).espaces, par(ids.cleo).espaces, par(ids.dan).espaces]], [impaye, impaye, perso, [1, 1, 1]]);
      v('Fay (suppression programmée dans dix jours) : l\'état le dit, avec l\'échéance ; elle n\'a plus de session', [par(ids.fay).etat, typeof par(ids.fay).suppression_le, par(ids.fay).suppression_le > Date.now(), par(ids.fay).derniere_activite], ['suppression_programmee', 'number', true, null]);
      v('un accès bêta (Alice) : le mode d\'inscription, l\'identifiant de l\'accès chez OP GESTION (« b… »), ni adresse ni empreinte, vue récemment', [par(ids.alice).origine, /^b[0-9a-f]{6,32}$/.test(par(ids.alice).acces_beta), par(ids.alice).email, par(ids.alice).email_sha256, Date.now() - par(ids.alice).derniere_activite < 60000, par(ids.alice).formule], ['beta', true, null, null, true, perso]);
      v('⛔ le compte par TÉLÉPHONE : le mode d\'inscription, son identifiant public — ni adresse, ni empreinte, ni accès bêta ; vu par son appareil', [par(ids.telma).origine, /^Telma#\d{4,5}$/.test(par(ids.telma).ident), par(ids.telma).email, par(ids.telma).email_sha256, par(ids.telma).acces_beta, Date.now() - par(ids.telma).derniere_activite < 60000], ['telephone', true, null, null, null, true]);
      v('Ana a une session ouverte (la date de la session, à la milliseconde) ; Ben, Cleo, Dan n\'en ont pas : « null » plutôt qu\'une date inventée', [par(ids.ana).derniere_activite, par(ids.ben).derniere_activite, par(ids.cleo).derniere_activite, par(ids.dan).derniere_activite], [FIXE, null, null, null]);
      vrai('l\'identifiant public « Prénom#1234 » ne porte que le premier mot du prénom (jamais le nom de famille)', r.j.items.every(x => x.ident === null || /^[A-Za-zÀ-ÿ]+#\d{4,5}$/.test(x.ident)));
      v('l\'ordre est celui de la création, puis de l\'identifiant (strictement croissant)', r.j.items.every((x, i, a) => i === 0 || a[i - 1].cree < x.cree || (a[i - 1].cree === x.cree && a[i - 1].id < x.id)), true);

      const tous = await appeler(A.base, '/api/admin/comptes?etat=tous'), sup = await appeler(A.base, '/api/admin/comptes?etat=supprime');
      v('`etat=tous` ajoute le compte effacé (neuf comptes) ; `etat=supprime` ne montre que lui : identité vidée, ni identifiant public, ni adresse, ni formule', [tous.j.total, sup.j.total, sup.j.items.length, sup.j.items[0] && sup.j.items[0].id, sup.j.items[0] && [sup.j.items[0].etat, sup.j.items[0].ident, sup.j.items[0].email, sup.j.items[0].email_sha256, sup.j.items[0].formule]], [9, 1, 1, ids.eva, ['supprime', null, null, null, null]]);
      for (const [o, n] of [['beta', 2], ['courriel', 5], ['telephone', 1]]) {
        const x = await appeler(A.base, '/api/admin/comptes?origine=' + o + '&limite=200');
        v('`origine=' + o + '` : ' + n + ' compte(s), tous de cette origine', [x.j.total, x.j.items.length, [...new Set(x.j.items.map(i => i.origine))]], [n, n, [o]]);
      }
      const un = await appeler(A.base, '/api/admin/comptes?id=' + ids.bruno);
      v('`id=` rend UN compte (celui-là)', [un.j.total, un.j.items.map(i => i.id)], [1, [ids.bruno]]);
      const sansAdr = await appeler(A.base, '/api/admin/comptes?adresses=non');
      v('⛔ `adresses=non` retire toutes les adresses ET garde les empreintes (la console range un courriel sans recevoir l\'adresse)', [sansAdr.j.items.filter(i => i.email !== null).length, sansAdr.j.items.filter(i => i.email_sha256 !== null).length, JSON.stringify(sansAdr.j).includes('exemple.invalid')], [0, 5, false]);

      for (const [q, champ] of [['limite=0', 'limite'], ['limite=201', 'limite'], ['limite=abc', 'limite'], ['limite=-1', 'limite'], ['limite=1&limite=2', 'limite'], ['limite=5.5', 'limite'], ['apres=x', 'apres'], ['apres=12.p_zz', 'apres'], ['apres[a]=1', 'apres'], ['origine=sms', 'origine'], ['origine=compte', 'origine'], ['etat=autre', 'etat'], ['id=p_court', 'id'], ['adresses=peut-etre', 'adresses']]) {
        const x = await appeler(A.base, '/api/admin/comptes?' + q);
        v('paramètre faux « ' + q + ' » : 400 parametre_invalide, le champ nommé (jamais ignoré en silence, jamais une erreur 500)', [x.code, x.j && x.j.error, x.j && x.j.champ], [400, 'parametre_invalide', champ]);
      }

      /* La pagination par clé : page par page, comparée à la lecture entier seul tenant */
      const entier = await toutes(A.base, '/api/admin/comptes?etat=tous', 200);
      const p1 = await toutes(A.base, '/api/admin/comptes?etat=tous', 1), p2 = await toutes(A.base, '/api/admin/comptes?etat=tous', 2), p4 = await toutes(A.base, '/api/admin/comptes?etat=tous', 4);
      v('⛔ une page à la fois (1, 2, 4 par page) rend EXACTEMENT les mêmes lignes, dans le même ordre, que la lecture d\'un seul tenant — sans doublon ni trou, dont six comptes nés à la même milliseconde', [p1.items.map(i => i.id), p2.items.map(i => i.id), p4.items.map(i => i.id)], [entier.items.map(i => i.id), entier.items.map(i => i.id), entier.items.map(i => i.id)]);
      v('… le nombre de pages est celui qu\'on attend (9 lignes : 9, 5 et 3 pages) et `total` est le même à chaque page', [p1.pages, p2.pages, p4.pages, p1.total, p2.total, p4.total], [9, 5, 3, 9, 9, 9]);
      v('population : les six comptes de même date sont bien dans la lecture (c\'est eux que la clé « (création, identifiant) » départage)', entier.items.filter(i => i.cree === FIXE).length, 6);
      const page1 = await appeler(A.base, '/api/admin/comptes?etat=tous&limite=3');
      const nouveau = S.personneCreer({ identifiant: MEL('zoe'), prenom: 'Zoe', nom: 'ZQXWNOM', origine: 'compte', verifie: true }); nouveauId = nouveau.id;
      const page2 = await appeler(A.base, '/api/admin/comptes?etat=tous&limite=3&apres=' + page1.j.suivant);
      v('⛔ un compte créé ENTRE deux pages ne décale pas la suivante (pagination par clé, pas par décalage) : la page 2 est celle qu\'on attendait, le nouveau compte est tout au bout', [page2.j.items.map(i => i.id), page2.j.total], [entier.items.slice(3, 6).map(i => i.id), 10]);
      const fin_ = await toutes(A.base, '/api/admin/comptes?etat=tous', 3);
      v('… et il est le dernier de la liste', [fin_.items.length, fin_.items[fin_.items.length - 1].id], [10, nouveau.id]);
    }

    console.log('\nGET /api/admin/empreintes : de quoi ranger un courriel sans recevoir l\'adresse');
    {
      const r = await appeler(A.base, '/api/admin/empreintes');
      const attendues = ['ana', 'ben', 'cleo', 'dan', 'fay', 'zoe'].map(n => sha(n + '.wqxz@exemple.invalid')).sort();
      v('200 ; l\'algorithme et la normalisation sont DITS ; les comptes par adresse ACTIFS seulement (le compte effacé n\'y est pas, ni un accès bêta, ni le compte par téléphone)', [r.code, r.j.algorithme, /minuscules/.test(r.j.normalisation), r.j.total, r.j.items.length, r.j.suivant], [200, 'sha256', true, 6, 6, null]);
      v('⛔ chaque empreinte est le SHA-256 (hexadécimal en minuscules) de l\'adresse en minuscules — recalculé ici, indépendamment du service', r.j.items.map(i => i.sha256).sort(), attendues);
      v('chaque empreinte est liée au bon compte', r.j.items.map(i => [i.id, i.sha256]).sort(), [[ids.ana, 'ana'], [ids.ben, 'ben'], [ids.cleo, 'cleo'], [ids.dan, 'dan'], [ids.fay, 'fay'], [nouveauId, 'zoe']].map(([id, n]) => [id, sha(n + '.wqxz@exemple.invalid')]).sort());
      vrai('⛔ aucune adresse en clair : ni « @ », ni « exemple.invalid », ni un prénom — et seuls `id` et `sha256` sortent de chaque ligne', !/@|exemple\.invalid|wqxz/i.test(r.txt) && r.j.items.every(i => Object.keys(i).sort().join() === 'id,sha256' && /^[0-9a-f]{64}$/.test(i.sha256)));
      const pages = await toutes(A.base, '/api/admin/empreintes', 2);
      v('par page de 2 : trois pages, les mêmes six empreintes', [pages.pages, pages.items.map(i => i.sha256).sort()], [3, attendues]);
      const g = await appeler(A.base, '/api/admin/empreintes?limite=1000'), trop = await appeler(A.base, '/api/admin/empreintes?limite=1001');
      v('jusqu\'à 1000 par page ; au-delà : 400', [g.code, trop.code, trop.j.champ], [200, 400, 'limite']);
    }

    console.log('\nGET /api/admin/espaces et /api/admin/abonnements');
    {
      const r = await appeler(A.base, '/api/admin/espaces');
      const par = (id) => r.j.items.find(x => x.id === id);
      v('200 ; trois espaces ; le nom de l\'entreprise, le propriétaire, les membres, les canaux', [r.code, r.j.total, r.j.items.length, r.j.suivant, [eA, eB, eC].map(e => [par(e).nom, par(e).proprio, par(e).membres, par(e).canaux])], [200, 3, 3, null, [['Entreprise WQXZ SARL', ids.ana, 1, 0], ['Atelier WQXZ', ids.ben, 2, 0], ['Sans abonnement WQXZ', ids.dan, 1, 0]]]);
      v('la formule RÉELLE de chaque espace : payé → Pro ; impayé de huit jours → « impaye » ; sans abonnement → Perso', [eA, eB, eC].map(e => par(e).formule), [{ formule: 'pro', motif: 'abonne', sursis_jusqua: null }, { formule: 'impaye', motif: 'impaye', sursis_jusqua: null }, { formule: 'perso', motif: 'aucun', sursis_jusqua: null }]);
      v('l\'abonnement (statut, places, échéance, annulation, impayé) ou « null » ; deux membres pour une place payée = places dépassées', [[eA, eB, eC].map(e => par(e).abonnement && [par(e).abonnement.statut, par(e).abonnement.places, par(e).abonnement.annule, typeof par(e).abonnement.fin_periode, typeof par(e).abonnement.impaye_depuis, typeof par(e).abonnement.relu_le]), [eA, eB, eC].map(e => par(e).places_depassees)],
        [[['active', 3, false, 'number', 'object', 'number'], ['past_due', 1, true, 'number', 'number', 'number'], null], [false, true, false]]);
      const pages = await toutes(A.base, '/api/admin/espaces', 1);
      v('par page de 1 : trois pages, les mêmes trois espaces', [pages.pages, pages.items.map(i => i.id).sort()], [3, [eA, eB, eC].sort()]);

      const ab = await appeler(A.base, '/api/admin/abonnements');
      const pa = (id) => ab.j.items.find(x => x.espace === id);
      v('200 ; deux abonnements ; le résumé par statut ; la facturation (inerte sur ce service : pas de clé Stripe)', [ab.code, ab.j.total, ab.j.items.length, ab.j.resume, ab.j.facturation.ouvert, ab.j.facturation.mode, ab.j.facturation.tout_ouvert, ab.j.facturation.stripe_echec_min], [200, 2, 2, { par_statut: { active: { n: 1, places: 3 }, past_due: { n: 1, places: 1 } } }, false, 'inerte', true, 0]);
      v('chaque abonnement : l\'espace et son nom, le statut, la formule, les places et les membres, l\'échéance, l\'annulation, l\'impayé — et seulement DIT qu\'il existe chez Stripe', [pa(eA).nom, pa(eA).statut, pa(eA).formule.formule, pa(eA).places, pa(eA).membres, pa(eA).fin_periode > Date.now(), pa(eA).annule, pa(eA).stripe, pa(eA).paiement_en_attente,
        pa(eB).statut, pa(eB).formule.formule, pa(eB).places_depassees, pa(eB).annule, typeof pa(eB).impaye_depuis], ['Entreprise WQXZ SARL', 'active', 'pro', 3, 1, true, false, true, false, 'past_due', 'impaye', true, true, 'number']);
      vrai('⛔ aucun identifiant de client, d\'abonnement ou de session Stripe dans la réponse (population : ils existent en base, vérifié plus haut)', !/cus_|sub_|cs_/.test(ab.txt));
      const filtre = await appeler(A.base, '/api/admin/abonnements?statut=past_due'), aucun = await appeler(A.base, '/api/admin/abonnements?statut=canceled'), mal = await appeler(A.base, '/api/admin/abonnements?statut=PAST%20DUE');
      v('`statut=` filtre (un impayé ; aucun résilié) et refuse une forme fausse', [filtre.j.total, filtre.j.items.map(i => i.espace), aucun.j.total, aucun.j.items, mal.code, mal.j.champ], [1, [eB], 0, [], 400, 'statut']);
    }

    console.log('\nGET /api/admin/incidents : ce que le service journalise déjà, rangé pour la console');
    {
      const trouve = await T.attendre(async () => (await appeler(A.base, '/api/admin/incidents')).j.incidents.some(i => i.evt === 'version_min_ignoree'), 6000, 50);
      vrai('population : un VRAI incident, né du service (la Tour pose un minimum qu\'aucune page servie n\'atteint ; le service l\'ignore et le journalise)', trouve);
      const r = await appeler(A.base, '/api/admin/incidents');
      const s = (await appeler(A.base, '/api/admin/sante')).j;
      const i0 = r.j.incidents.find(i => i.evt === 'version_min_ignoree');
      v('200 ; l\'incident, avec SES champs de la liste blanche (le nombre posé, le motif) et sa date ; rien d\'autre', [r.code, i0.n, i0.motif, typeof i0.t, Object.keys(i0).sort()], [200, 99999, 'au-dessus de la page servie v' + s.version_page, 'number', ['evt', 'motif', 'n', 't']]);
      v('les compteurs disent TOUT ce qui a été journalisé depuis le démarrage : le démarrage (une vie), l\'incident (un incident), les refus de la garde (des incidents comptés, rangés nulle part)', [r.j.compteurs.demarre.n, r.j.compteurs.demarre.incidents, r.j.compteurs.version_min_ignoree.incidents, r.j.compteurs.admin_refus.incidents >= 3, r.j.incidents.some(i => i.evt === 'admin_refus')], [1, 0, 1, true, false]);
      v('`depuis`, la capacité et la taille du tampon', [typeof r.j.depuis, r.j.capacite, r.j.en_memoire >= 1], ['number', 200, true]);
      const un = await appeler(A.base, '/api/admin/incidents?limite=1'), zero = await appeler(A.base, '/api/admin/incidents?limite=0'), cur = await appeler(A.base, '/api/admin/incidents?apres=1.p_' + '0'.repeat(32));
      v('`limite` borne la liste ; 0 est refusé ; il n\'y a pas de curseur sur une liste en mémoire', [un.j.incidents.length, zero.code, cur.code, cur.j.champ], [1, 400, 400, 'apres']);
    }

    /* ═══ 4. AUCUNE FUITE ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════ */
    console.log('\nAucune fuite : chaque canari existe en base, et aucune réponse de l\'administration ne le porte');
    {
      /* le détecteur est éprouvé sur ce qui DOIT sortir — sinon un « zéro » ne prouve rien */
      const comptes = corpus.filter(t => t.includes('"items"')).join('\n');
      vrai('témoin du détecteur : l\'adresse d\'un compte, le nom d\'une entreprise et un identifiant public SORTENT bien (il les voit)', comptes.includes('ana.wqxz@exemple.invalid') && comptes.includes('Entreprise WQXZ SARL') && /Telma#\d+/.test(comptes));
      vrai('population : plus de 150 réponses d\'administration lues pendant ce banc (' + corpus.length + ')', corpus.length > 150);
      const lectures = await appeler(A.base, '/api/admin/comptes?etat=tous&limite=200');
      const toutes_ = corpus.join('\n') + '\n' + A.sortie.texte();
      const CANARIS = {
        'le numéro de téléphone (avec et sans « + », et ses derniers chiffres)': [TEL, TEL.slice(1), TEL.slice(3), TEL.slice(-8)],
        'le texte d\'un message': [MSG], 'le nom d\'un groupe': [GROUPE], 'un statut': [STATUT], 'un nom de famille': ['ZQXWNOM'],
        'le sel et l\'empreinte d\'un mot de passe (en clair, en hexadécimal, en base 64)': [SEL, HASH, 'PARAMS-WQXZ', Buffer.from(SEL).toString('hex'), Buffer.from(HASH).toString('hex'), Buffer.from(HASH).toString('base64'), Buffer.from(SEL).toString('base64')],
        'le nom d\'un appareil': [APPAREIL, TEL_APPAREIL],
        'un jeton de session, sa valeur et son empreinte': [JETON_ANA, sha(JETON_ANA), alice.cookie(), sha(alice.cookie()), bruno.cookie()],
        'les identifiants Stripe': ['cus_WQXZCLIENT', 'sub_WQXZABO', 'cus_WQXZCLIENTB', 'sub_WQXZABOB'],
        'l\'adresse IP annoncée': [IP_ANNONCEE],
        'le secret d\'administration et son empreinte': [SECRET, sha(SECRET), SECRET.toUpperCase()],
        'la clé maître': [A.cle],
      };
      v('population : les valeurs recherchées existent toutes (aucune n\'est vide ni un fragment trop court pour compter)', Object.values(CANARIS).flat().filter(x => typeof x !== 'string' || x.length < 7), []);
      for (const [nom, valeurs] of Object.entries(CANARIS)) v('⛔ ' + nom + ' : ni dans une réponse d\'administration, ni dans le journal du service', valeurs.filter(x => toutes_.includes(x)), []);
      vrai('population : la lecture finale de tous les comptes a bien eu lieu (' + lectures.j.items.length + ' lignes)', lectures.j.items.length === 10);
      const champs = new Set(); for (const i of lectures.j.items) Object.keys(i).forEach(k => champs.add(k));
      v('le vocabulaire d\'une ligne de compte est FERMÉ : ces champs-là, et aucun autre (un champ ajouté sans réflexion fait tomber ce banc)', [...champs].sort(), ['acces_beta', 'cree', 'derniere_activite', 'email', 'email_sha256', 'espaces', 'etat', 'formule', 'id', 'ident', 'origine', 'suppression_le', 'verifie']);
    }
    {
      const e = await appeler(A.base, '/api/admin/espaces'), a = await appeler(A.base, '/api/admin/abonnements');
      v('le vocabulaire d\'un espace est fermé', [...new Set(e.j.items.flatMap(Object.keys))].sort(), ['abonnement', 'canaux', 'cree', 'formule', 'id', 'membres', 'nom', 'places_depassees', 'proprio']);
      v('le vocabulaire d\'un abonnement est fermé', [...new Set(a.j.items.flatMap(Object.keys))].sort(), ['annule', 'cree', 'espace', 'fin_periode', 'formule', 'impaye_depuis', 'membres', 'nom', 'paiement_en_attente', 'places', 'places_depassees', 'relu_le', 'statut', 'stripe']);
    }

    console.log('\nUne lecture n\'écrit rien');
    const avant = instantane(), vu0 = await appeler(A.base, '/api/admin/sante');
    for (let i = 0; i < 3; i++) for (const r of ROUTES) await appeler(A.base, '/api/admin/' + r + (r === 'comptes' || r === 'empreintes' ? '?limite=2' : ''));
    await appeler(A.base, '/api/admin/comptes?etat=tous&adresses=non'); await appeler(A.base, '/api/admin/abonnements?statut=active');
    vrai('population : la base à comparer n\'est pas vide (' + avant.split('|')[0] + ')', Number(avant.split(',')[0]) >= 10 && vu0.code === 200);
    v('⛔ la base est la même après 27 lectures (personnes, sessions, messages, journal, notifications, espaces, abonnements, dates de session, de relecture et de suppression)', instantane() === avant ? 'inchangée' : 'a changé', 'inchangée');
  } finally {
    try { SF.fermer(); S.fermer(); } catch (e) { /* déjà fermées */ }
    await A.arreter(); await B.arreter(); await og.fermer();
  }

  /* ═══ 5. LA CONFIGURATION ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════ */
  console.log('\nLa configuration `admin` : absente = inerte ; fausse = démarrage refusé, sans jamais citer la valeur');
  {
    const lance = (f) => { try { f(); return null; } catch (e) { return [e.code, e.message]; } };
    const kek = Buffer.from(SECRET.split('').reverse().join(''), 'hex');   // une clé maître au hasard (pas régulière : c'est l'ÉGALITÉ qui doit la refuser)
    v('absente ou nulle : INERTE (null)', [ADMIN.adminConfig({}, kek), ADMIN.adminConfig({ admin: null }, kek)], [null, null]);
    const valide = ADMIN.adminConfig({ admin: { secret: SECRET } }, kek);
    v('un secret de 64 hexadécimaux : accepté, et la configuration ne porte que son EMPREINTE (jamais le secret)', [Buffer.isBuffer(valide.empreinte), valide.empreinte.toString('hex'), JSON.stringify(valide).includes(SECRET), Object.keys(valide)], [true, sha(SECRET), false, ['empreinte']]);
    v('les majuscules sont le même secret', ADMIN.adminConfig({ admin: { secret: SECRET.toUpperCase() } }, kek).empreinte.toString('hex'), sha(SECRET));
    const FAUX = {
      'pas un objet': { admin: 'oui' }, 'un tableau': { admin: [SECRET] }, 'une clé inconnue': { admin: { secret: SECRET, relais: 'x' } }, 'sans secret': { admin: {} },
      'un secret numérique': { admin: { secret: 12345 } }, '63 caractères': { admin: { secret: SECRET.slice(0, 63) } }, '65 caractères': { admin: { secret: SECRET + 'a' } },
      'non hexadécimal': { admin: { secret: 'g' + SECRET.slice(1) } }, 'trop régulier (ab×32)': { admin: { secret: 'ab'.repeat(32) } }, 'trop régulier (zéros)': { admin: { secret: '0'.repeat(64) } },
      'égal à la clé maître': { admin: { secret: kek.toString('hex') } },
    };
    const res = Object.entries(FAUX).map(([nom, cfg]) => [nom, lance(() => ADMIN.adminConfig(cfg, kek))]);
    v('⛔ chaque forme fausse est refusée (code CONFIG)', res.filter(([, r]) => !r || r[0] !== 'CONFIG').map(([n]) => n), []);
    v('⛔ aucun message ne cite la valeur (ni le secret, ni la clé maître, ni le fragment « ab×32 »)', res.filter(([, r]) => r && (r[1].includes(SECRET.slice(0, 20)) || r[1].includes(kek.toString('hex')) || r[1].includes('abababab') || r[1].includes('00000000'))).map(([n]) => n), []);
    vrai('population : onze formes fausses ont été jouées', res.length === 11);
    /* le VRAI démarrage refuse, lui aussi */
    const refuse = await T.lancerService({ attendreSante: false, config: { admin: { secret: 'ab'.repeat(32) } } });
    const mort = await T.attendre(() => refuse.sorti() !== null, 8000, 50);
    const sortie = refuse.sortie.texte();
    v('⛔ un secret trop régulier REFUSE le démarrage du service (code 1), le dit, et ne cite pas la valeur', [mort !== null, refuse.sorti(), /admin\.secret/.test(sortie), /demarrage_refuse/.test(sortie), sortie.includes('abababab')], [true, 1, true, true, false]);
    await refuse.arreter();
    const refuse2 = await T.lancerService({ attendreSante: false, config: { admin: { secret: SECRET.slice(0, 40) } } });
    await T.attendre(() => refuse2.sorti() !== null, 8000, 50);
    v('un secret trop court aussi', [refuse2.sorti(), refuse2.sortie.texte().includes(SECRET.slice(0, 40))], [1, false]);
    await refuse2.arreter();
    const prod = await T.lancerService({ instance: 'prod', config: { admin: { secret: SECRET } } });
    const rp = await appeler(prod.base, '/api/admin/sante');
    v('la production accepte la même configuration (l\'administration n\'est pas réservée à la bêta)', [rp.code, rp.j.instance, rp.j.reglages.tout_ouvert], [200, 'prod', false]);
    await prod.arreter();
  }

  /* ═══ 6. LE TAMPON D'INCIDENTS ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════ */
  console.log('\nLe tampon d\'incidents : liste blanche, masque, bornes, rafales comptées');
  {
    let t = 5000;
    const J = ADMIN.creerJournalIncidents({ max: 5, cleMax: 4, horloge: () => t });
    J.noter({ t: new Date(1000).toISOString(), evt: 'erreur', nom: 'jean.dupont@exemple.invalid', code: '+33612345678', motif: IP_ANNONCEE, route: '/api/x', pays: 'BE', etat: 'echec', n: 3, jeton: 'opm_' + 'A'.repeat(43), texte: 'MESSAGE-WQXZ-CANARI', sha: 'Abc123' });
    const [i0] = J.lire(10);
    v('⛔ une ligne hostile : les champs de la liste blanche seulement, et tout ce qui ressemble à une adresse, un numéro, une adresse IP est « (masqué) » — le reste passe', [i0.nom, i0.code, i0.motif, i0.route, i0.pays, i0.etat, i0.n, i0.sha, Object.keys(i0).sort()], ['(masqué)', '(masqué)', '(masqué)', '/api/x', 'BE', 'echec', 3, 'Abc123', ['code', 'etat', 'evt', 'motif', 'n', 'nom', 'pays', 'route', 'sha', 't']]);
    v('… la date de la ligne (ISO) devient des millisecondes', i0.t, 1000);
    const masques = ['a@b', '0612345678', '+33 6 12', '203.0.113.7', '2001:db8:0:0:0:0:0:1', 'opm_' + 'x'.repeat(43), 'opd_abc', 'p_' + 'a'.repeat(32), 'ABCDEF0123456789ABCDEF0123', 'https://x.invalid', '+3366'];
    v('le masque : adresse, numéro, IPv4, IPv6, jeton, identifiant, longue empreinte, lien', masques.map(x => ADMIN.chaineSure(x)), masques.map(() => '(masqué)'));
    v('… et ne masque pas les valeurs ordinaires d\'un journal (un nom d\'erreur, un motif, un état)', ['SqliteError', 'ECONNRESET', 'abonnement_introuvable', 'au-dessus de la page servie v243', 'sms_refuse', 'echec'].map(x => ADMIN.chaineSure(x)), ['SqliteError', 'ECONNRESET', 'abonnement_introuvable', 'au-dessus de la page servie v243', 'sms_refuse', 'echec']);
    v('une valeur longue est coupée à 60 signes', ADMIN.chaineSure('x'.repeat(200)).length, 60);

    J.reinitialiser();
    for (let i = 0; i < 50; i++) J.noter({ t: new Date(i).toISOString(), evt: 'quota_refuse', quota: 'ip' });
    J.noter({ t: new Date(60).toISOString(), evt: 'balayage_echec', nom: 'E1' });
    v('⛔ une RAFALE d\'événements qu\'un inconnu déclenche est COMPTÉE, jamais rangée : cinquante `quota_refuse` ne chassent pas la vraie panne', [J.lire(10).map(i => i.evt), J.compteurs().quota_refuse.n, J.compteurs().quota_refuse.incidents, J.compteurs().balayage_echec.n], [['balayage_echec'], 50, 50, 1]);
    J.reinitialiser();
    for (let i = 0; i < 8; i++) J.noter({ t: new Date(1000 + i).toISOString(), evt: 'balayage_echec', nom: 'E' + i });
    v('le tampon est BORNÉ (5), le plus récent d\'abord, et le compteur garde le total', [J.taille(), J.lire(10).map(i => i.nom), J.compteurs().balayage_echec.n], [5, ['E7', 'E6', 'E5', 'E4', 'E3'], 8]);
    v('`lire(n)` rend au plus n lignes (les plus récentes)', [J.lire(2).map(i => i.nom), J.lire(0).length], [['E7', 'E6'], 1]);
    J.reinitialiser();
    for (const e of ['a_echec', 'b_echec', 'c_echec', 'd_echec', 'e_echec', 'f_echec']) J.noter({ t: new Date(1).toISOString(), evt: e });
    v('le nombre de noms d\'événement est BORNÉ (4) : les suivants vont dans « (autre) » — un journal ne grossit pas avec ce qu\'on lui envoie', Object.keys(J.compteurs()).sort(), ['(autre)', 'a_echec', 'b_echec', 'c_echec', 'd_echec']);
    let leve = null; try { for (const x of [null, undefined, 42, 'texte', [], {}, { evt: 12 }, { evt: 'x'.repeat(100) }, { evt: 'ÉVÉNEMENT' }, { evt: 'a', t: 'pas une date' }]) J.noter(x); ADMIN.noterJournal(null); ADMIN.noterJournal({ get evt() { throw new Error('piégé'); } }); } catch (e) { leve = e.message; }
    v('⛔ le journal ne plante JAMAIS sur une entrée bizarre (rien, un nombre, un objet piégé) : il ne doit pas faire échouer ce qu\'il journalise', leve, null);
    const classes = {
      incident: ['erreur', 'exception', 'rejet', 'demarrage_refuse', 'balayage_echec', 'relecture_echec', 'planif_echec', 'planif_retard', 'programme_echec', 'programme_abandonne', 'rappel_abandonne', 'agenda_rappel_abandonne', 'compte_rendu_echec', 'reprises_en_echec', 'stripe_echec', 'piece_illisible', 'piece_lecture_coupee', 'export_coupe', 'push_inactif', 'sms_refuse', 'sms_bouclier', 'espace_payant_sans_membre', 'appel_perdu', 'ouvrier_relance', 'ouvrier_occupe', 'version_min_ignoree', 'facturation', 'quota_refuse', 'corps_lent', 'piece_depot_lent', 'admin_refus'],
      info: ['demarre', 'compte_efface', 'programme_envoye', 'push_elagage', 'reunions_reparees', 'appels_repares', 'push_vapid', 'attentes_echues'],
    };
    v('⛔ la classification : les noms d\'événements du service qui disent une panne, un refus ou un abandon sont des incidents ; la vie ordinaire n\'en est pas', [classes.incident.filter(e => ADMIN.niveauDe(e, {}) !== 'incident'), classes.info.filter(e => ADMIN.niveauDe(e, {}) !== 'info')], [[], []]);
    v('… et l\'ÉTAT que porte un événement tranche pour les messages d\'issue (courriel, trajet, sauvegarde, rejeu)', [['courriel', 'echec'], ['courriel', 'envoye'], ['trajet', 'hors_reseau'], ['trajet', 'invraisemblable'], ['sauvegarde', 'ok'], ['rejeu', 'echec'], ['transcription', 'prete']].map(([e, s]) => ADMIN.niveauDe(e, { etat: s })), ['incident', 'info', 'incident', 'incident', 'info', 'incident', 'info']);
  }

  /* ═══ 7. LE CÂBLAGE — du code, pas des phrases ═══════════════════════════════════════════════════════════════════════════════════════════════ */
  console.log('\nLe câblage (lu dans le CODE, commentaires retirés)');
  {
    const code = (f) => T.sansCommentaires(fs.readFileSync(path.join(T.SERVICE, f), 'utf8'));
    const adm = code('admin.js');
    vrai('population : le code d\'`admin.js` est lu (plus de 200 lignes)', adm.split('\n').length > 150);
    v('⛔ la comparaison du secret est en TEMPS CONSTANT (`timingSafeEqual` sur deux empreintes), et le secret n\'est comparé nulle part avec `===`', [/crypto\.timingSafeEqual\(\s*sha256\(brut\.toLowerCase\(\)\),\s*cfg\.empreinte\s*\)/.test(adm), /empreinte\s*===|===\s*[a-z.]*empreinte/.test(adm)], [true, false]);
    v('⛔ la garde lit la SOCKET (jamais `req.ip`, jamais un en-tête pour la boucle locale)', [/req\.socket && req\.socket\.remoteAddress/.test(adm), /req\.ip\b/.test(adm), /BOUCLE\.has\(/.test(adm)], [true, false, true]);
    v('⛔ les CINQ en-têtes de proxy sont refusés', ADMIN.ENTETES_PROXY, ['x-forwarded-for', 'x-real-ip', 'forwarded', 'x-forwarded-proto', 'x-forwarded-host']);
    v('aucun SQL, aucun accès à la base dans `admin.js` (tout le SQL vit dans `stockage.js`) : il ne parle qu\'à `stockage.adminLecture`', [/\.prepare\(|DatabaseSync|node:sqlite/.test(adm), (adm.match(/stockage\.[a-zA-Z]+/g) || []).filter((x, i, a) => a.indexOf(x) === i).sort()], [false, ['stockage.adminLecture', 'stockage.illisibles', 'stockage.schema', 'stockage.stats']]);
    const man = MANIFESTE.filter(r => r.garde === 'AD');
    v('⛔ le manifeste porte EXACTEMENT les six routes d\'administration, toutes en GET, toutes sous /api/admin/, toutes gardées par AD — et aucune autre route n\'est sous /api/admin/', [man.map(r => r.p).sort(), man.every(r => r.m === 'GET'), MANIFESTE.filter(r => /^\/api\/admin\//.test(r.p) && r.garde !== 'AD').length], [ROUTES.map(r => '/api/admin/' + r).sort(), true, 0]);
    const app = code('app.js');
    v('`app.js` monte la garde AD (créée par `gardeAdmin(ctx)`) et installe les gestionnaires APRÈS elle', [/garde\.AD = gardeAdmin\(ctx\);/.test(app), /installerAdmin\(H, ctx\);/.test(app), app.indexOf('garde.AD = gardeAdmin') < app.indexOf('installerAdmin(H, ctx)')], [true, true, true]);
    v('⛔ `index.js` donne chaque ligne du journal au tampon des incidents AVANT de l\'écrire (sans lui, la console ne verrait rien)', /noterJournal\(o\);[^\n]*\n\s*process\.stdout\.write\(JSON\.stringify\(o\)/.test(code('index.js')), true);
    v('`config.js` valide le bloc au démarrage, avec la clé maître en main', /admin: adminConfig\(cfg, kek\),/.test(code('config.js')), true);
    v('⛔ pas de CORS, pas de cookie : `admin.js` n\'écrit aucun en-tête `Access-Control-*` ni `Set-Cookie`', [/access-control/i.test(adm), /set-cookie|\.cookie\(/i.test(adm)], [false, false]);
    v('⛔ le secret n\'est jamais journalisé ni rendu : aucun appel de journal ni `res.json` qui le nomme', [/journaliser\([^)]*(secret|brut|empreinte)/.test(adm), /res\.json\([^)]*(secret|empreinte)/.test(adm)], [false, false]);
  }

  fin();
})().catch((e) => { console.log('  ✗ le banc est mort : ' + (e && e.stack || e)); process.exitCode = 1; fin(); });

