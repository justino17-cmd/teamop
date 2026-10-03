/* ⛔ CE QUE CE FICHIER GARDE — LES RÉUNIONS PROGRAMMÉES PAR LEURS ROUTES : LE VRAI SERVICE, EN HTTP, FORMULE DE PRODUCTION (famille 3, étape 6 ; modèle `test-961`).

   `test-972` éprouve ce qui est rangé et décidé, le stockage seul ; `test-905` joue la garde de chaque route contre six profils. Celui-ci joue les GESTES, de bout en bout, à plusieurs personnes, avec la
   formule de PRODUCTION (`formule.toutOuvert: false` : ce qui n'est pas payé est refusé), une horloge calée sur le lundi 19 octobre 2026 08:00 UTC (une semaine avant le retour à l'heure d'hiver) :

     · programmer est une fonction Pro jugée sur la PERSONNE, jamais sur le corps ; chaque refus du corps dit pourquoi (`heure_inexistante`, `fin_avant_debut`, `rappel_invalide`…) et n'écrit RIEN ;
     · l'heure se dit dans un fuseau et le service fait autorité : une heure locale du trou de printemps est refusée, une heure vécue deux fois est la première, une série garde son heure LOCALE de
       part et d'autre du 25 octobre ; les identifiants (hôte, conversation, version) viennent de la base, jamais du corps ;
     · les invités sont des contacts ou des membres de SON espace (`peutEcrire`), jamais un autre — un inconnu et un refusé répondent PAREIL ; un non-invité reçoit le 404 d'une réunion inexistante ;
     · les notifications se composent dans le fuseau de CELUI QUI LES REÇOIT, ne nomment l'hôte qu'à ses invités, se taisent sur « Notifier les invités : non » — sauf l'annulation, qui part toujours ;
     · modifier : seul l'hôte ; un changement d'HORAIRE remet les réponses en attente, un lieu non ; annuler prévient et ne se fait qu'une fois ; supprimer emporte la conversation ;
     · inviter, retirer, répondre, régler ses rappels ; le fichier .ics (série, occurrence, annulée) avec ses en-têtes, sans adresse de courriel, sans ligne qu'un titre pourrait ouvrir ;
     · la conversation de la réunion s'écrit comme un groupe, et les routes des GROUPES la refusent (renommer, ajouter, retirer, promouvoir, lien, quitter) ;
     · le push : l'invitation et l'annulation partent, la charge minimale ne dit rien du titre (sauf aperçu activé), la SOURDINE coupe une modification mais jamais une annulation ;
     · en direct (SSE) chaque geste arrive aux autres participants et à personne d'autre ; l'export des données d'une personne porte SES réunions ;
     · production : 30 programmations par heure et par personne, 60 fichiers par minute, 300 réunions à venir par hôte (et le code d'erreur que la page sait dire).

   ⛔ UNE ASSERTION SUR UN ENSEMBLE VIDE PASSE ET NE PROUVE RIEN : chaque « zéro » ci-dessous est précédé de la population qu'il aurait pu compter. */
'use strict';
const fs = require('fs'), os = require('os'), path = require('path'), crypto = require('crypto');
const T = require('./outils-msg');
const P = require('./outils-push');
T.sauterSiSansDependances();
const { v, vrai, fin } = T.compteur();
const { ouvrir } = require(path.join(T.SERVICE, 'stockage.js'));
const { creerScelleur } = require(path.join(T.SERVICE, 'scelle.js'));
const ICS = require(path.join(T.SERVICE, 'ics.js'));

setTimeout(() => { console.log('  ✗ délai global du banc dépassé (240 s)'); process.exit(1); }, 240000).unref();

const sha = (x) => crypto.createHash('sha256').update(x).digest('hex');
const jeton = () => 'opm_' + crypto.randomBytes(32).toString('base64url');
const MIN = 60000, HEURE = 3600000, JOUR = 86400000;
const ZERO = Date.UTC(2026, 9, 19, 8, 0, 0);        // lundi 19 octobre 2026, 08:00 UTC = 10:00 à Paris (l'heure d'été court encore)
const L26 = Date.UTC(2026, 9, 26, 13, 0);           // lundi 26 octobre, 14:00 à Paris — l'heure d'hiver est revenue le dimanche 25 à 03:00
const CANARI_T = 'TITRE-WQXZ-CANARI', CANARI_L = 'LIEU-WQXZ-CANARI';   // des lettres hors [0-9a-f] : jamais le hasard d'une empreinte
const ACK_MS = 1500;
const PUSH_CFG = { ackMs: ACK_MS, echecsMax: 2, etalementMs: 1500, timeoutMs: 3000, contact: 'mailto:exploitation@exemple.invalid' };
const inconnu = () => 'p_' + crypto.randomBytes(16).toString('hex');
const tri = (l) => l.slice().sort();

function paireVapid() {
  for (;;) {
    const e = crypto.createECDH('prime256v1'); e.generateKeys();
    const priv = e.getPrivateKey();
    if (priv.length === 32) return { pub: e.getPublicKey().toString('base64url'), priv: priv.toString('base64url') };
  }
}
/* L'heure locale d'un instant, lue par `Intl` — un oracle qui ne partage rien avec `calendrier.js` */
const heureLocale = (t, tz) => new Intl.DateTimeFormat('fr-FR', { timeZone: tz, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(t));

/* Un service (horloge décalable, calée sur ZERO), sa base ouverte à côté (WAL : deux processus, une base) avec la MÊME horloge, des personnes et leurs clients */
async function monter(config, env) {
  const svc = await T.lancerService({ horloge: true, config, env: env || {} });
  let decal = ZERO - Date.now(); svc.avancer(decal);
  const maintenant = () => Date.now() + decal;
  const S = ouvrir({ chemin: path.join(svc.data, 'msg.db'), scelleur: creerScelleur(Buffer.from(svc.cle, 'hex')), horloge: maintenant });
  let k = 0;
  const pers = (nom) => S.personneCreer({ identifiant: 'beta:' + nom + (++k) + crypto.randomBytes(2).toString('hex'), prenom: nom, nom: 'Banc', origine: 'beta', verifie: true });
  const cl = (p) => { const c = T.client(svc.base); const j = jeton(); S.sessionAjouter({ h: sha(j), personne: p.id, appareil: null, ttlMs: 60 * JOUR }); c.poserCookie(j); c.moi = p; return c; };
  const payer = (espace) => S.abonnementPoser(espace, { client: 'cus_banc973', abonnement: 'sub_b973_' + espace.slice(2, 14), statut: 'active', places: 150, fin_periode: maintenant() + 40 * JOUR, annule: false, impaye: false }, { adopter: true });
  const entrer = (espace, par, uid) => { const code = crypto.randomBytes(16).toString('base64url'); S.lienCreer({ h: sha(code), genre: 'espace', cible: espace, par, ttlMs: JOUR, max: 5 }); return S.invitationAccepter({ h: sha(code), uid, max: Infinity }); };
  const sql = (req, ...args) => { const d = T.lireBase(path.join(svc.data, 'msg.db')); try { return d.prepare(req).get(...args); } finally { d.close(); } };
  const nReunions = () => Number(sql('SELECT COUNT(*) AS n FROM reunion').n);
  const avancer = (ms) => { decal += ms; svc.avancer(ms); };
  return { svc, S, pers, cl, payer, entrer, sql, nReunions, avancer, maintenant, fermer: async () => { try { S.fermer(); } catch (x) { /* déjà fermé */ } await svc.arreter(); } };
}

/* Les lignes d'un fichier .ics, repliées défaites */
const lignesIcs = (txt) => String(txt).replace(/\r\n[ \t]/g, '').split('\r\n');

(async () => {
  const fps = await P.fauxServicePush();
  const PAIRE = paireVapid();
  const M = await monter({ formule: { toutOuvert: false }, quotas: { reunion: { max: 100000, fenetreMs: HEURE }, ics: { max: 100000, fenetreMs: MIN } }, push: PUSH_CFG, vapidPublicKey: PAIRE.pub, vapidPrivateKey: PAIRE.priv }, { OPMSG_TEST_PUSH: fps.hote });
  const { svc, S, pers, cl, payer, entrer, sql, nReunions, avancer } = M;
  const ana = pers('Ana'), ben = pers('Ben'), cleo = pers('Cleo'), dan = pers('Dan'), eve = pers('Eve'), fred = pers('Fred'), gus = pers('Gus'), hal = pers('Hal');
  const a = cl(ana), b = cl(ben), c = cl(cleo), d = cl(dan), e = cl(eve), f = cl(fred), g = cl(gus), h = cl(hal);
  const flux = [];
  try {
    /* L'entreprise payée d'Ana : Ben, Cleo, Gus et Hal y sont ses collègues (donc Pro et invitables) ; Dan n'est qu'un contact (Perso) ; Eve et Fred sont des étrangers ; Ana a bloqué Gus */
    const E = S.espaceCreer({ nom: 'ENTREPRISE-WQXZ', proprio: ana.id }).id;
    payer(E);
    for (const p of [ben, cleo, gus, hal]) entrer(E, ana.id, p.id);
    S.contactLier(ana.id, dan.id);
    S.contactBloquer(ana.id, gus.id);
    await a.post('/api/moi/maj', { tz: 'Europe/Paris' }); await c.post('/api/moi/maj', { tz: 'America/New_York' });
    const B0 = { titre: 'Base', debut: '2026-10-26T14:00', fin: '2026-10-26T15:00', tz: 'Europe/Paris' };
    const corps = (extra) => Object.assign({}, B0, extra || {});
    const mk = async (cli, extra) => { const r = await cli.post('/api/reunions', corps(extra)); if (r.code !== 201) throw new Error('création de banc refusée : ' + r.code + ' ' + JSON.stringify(r.j)); return r.j; };
    const nots = async (cli, cible) => (await cli.get('/api/notifications')).j.notifications.filter(n => /^reunion_/.test(n.type) && (!cible || n.cible === cible));
    const typesDe = (l) => tri(l.map(n => n.type));
    const statuts = (j) => tri(j.invites.map(i => i.prenom + ':' + i.statut)).join(' ');
    const fiche = async (cli, id) => (await cli.get('/api/reunions/' + id));
    /* ⛔ les IDENTIFIANTS des notifications, pas leur nombre : une modification en remplace une autre non lue, le nombre ne bouge pas quand une notification de trop est partie (R14 a survécu à ce compte) */
    const idsDe = async (cli, cible) => (await nots(cli, cible)).map(n => n.id).sort().join();

    /* ═══ 1. PROGRAMMER : UNE FONCTION PRO, JUGÉE SUR LA PERSONNE ═══════════════════════════════════════════════════════════════════════════════ */
    console.log('Programmer est une fonction Pro : la formule de la PERSONNE décide, jamais le corps');
    {
      const n0 = nReunions();
      const r = await d.post('/api/reunions', Object.assign(corps(), { formule: 'pro', pro: true, abonnement: { statut: 'active' } }));
      v('⛔ Dan (Perso : un contact d\'Ana, aucun espace) ne programme pas : 402 `formule_requise`, et le corps qui se dit Pro n\'y change rien', [r.code, r.j.error, r.j.abonnement_ouvert], [402, 'formule_requise', false]);
      v('… rien n\'a été créé', nReunions(), n0);
      const ok = await b.post('/api/reunions', corps());
      v('population : Ben (une place dans l\'espace payé d\'Ana) programme (201) — le refus de Dan ne vient donc pas d\'une route qui refuse tout', [ok.code, nReunions()], [201, n0 + 1]);
      v('sans session : 401', (await T.client(svc.base).post('/api/reunions', corps())).code, 401);
    }

    /* ═══ 2. LE CORPS : CHAQUE REFUS DIT POURQUOI ET N'ÉCRIT RIEN ═════════════════════════════════════════════════════════════════════════════════ */
    console.log('\nLe corps d\'une programmation : chaque refus dit pourquoi, un refus n\'écrit rien');
    {
      const REFUS = [
        ['sans titre', { titre: undefined }, 400, 'titre_vide'],
        ['un titre fait d\'espaces', { titre: '   \t ' }, 400, 'titre_vide'],
        ['un titre qui n\'est pas du texte', { titre: 12 }, 400, 'champ_invalide'],
        ['un titre de 121 signes', { titre: 'T'.repeat(121) }, 400, 'champ_invalide'],
        ['un lieu de 301 signes', { lieu: 'L'.repeat(301) }, 400, 'champ_invalide'],
        ['un lieu qui n\'est pas du texte', { lieu: ['salle'] }, 400, 'champ_invalide'],
        ['sans début', { debut: undefined }, 400, 'heure_invalide'],
        ['sans fin', { fin: undefined }, 400, 'heure_invalide'],
        ['un début en toutes lettres', { debut: 'demain à 14 h' }, 400, 'heure_invalide'],
        ['une heure locale avec des secondes', { debut: '2026-10-26T14:00:00' }, 400, 'heure_invalide'],
        ['un jour qui n\'existe pas (30 février)', { debut: '2026-02-30T10:00', fin: '2026-02-30T11:00' }, 400, 'heure_invalide'],
        ['« 24:00 »', { debut: '2026-10-26T24:00' }, 400, 'heure_invalide'],
        ['un instant décimal', { debut: 1793019600000.5 }, 400, 'heure_invalide'],
        ['un instant négatif', { debut: -5 }, 400, 'heure_invalide'],
        ['un instant d\'avant l\'an 2000', { debut: 1000 }, 400, 'heure_invalide'],
        ['un instant d\'après 2100', { debut: 4102444800000, fin: 4102448400000 }, 400, 'heure_invalide'],
        ['⛔ une heure locale que le passage à l\'heure d\'été a SUPPRIMÉE (2027-03-28, 02:30 à Paris)', { debut: '2027-03-28T02:30', fin: '2027-03-28T03:30' }, 400, 'heure_inexistante'],
        ['… une fin dans le trou', { debut: '2027-03-28T01:30', fin: '2027-03-28T02:30' }, 400, 'heure_inexistante'],
        ['une fin avant le début', { fin: '2026-10-26T13:00' }, 400, 'fin_avant_debut'],
        ['une fin égale au début', { fin: '2026-10-26T14:00' }, 400, 'fin_avant_debut'],
        ['une réunion de plus de 30 jours', { fin: '2026-12-01T14:00' }, 400, 'reunion_trop_longue'],
        ['un fuseau inconnu', { tz: 'Mars/Olympus' }, 400, 'fuseau_inconnu'],
        ['un fuseau qui n\'est pas du texte', { tz: 12 }, 400, 'fuseau_inconnu'],
        ['une répétition inconnue', { repetition: 'annuelle' }, 400, 'repetition_invalide'],
        ['un nombre de répétitions de 1', { repetition: 'hebdomadaire', n: 1 }, 400, 'fin_repetition_invalide'],
        ['… de 1001', { repetition: 'hebdomadaire', n: 1001 }, 400, 'fin_repetition_invalide'],
        ['… « 3 » écrit en texte', { repetition: 'hebdomadaire', n: '3' }, 400, 'fin_repetition_invalide'],
        ['une date de fin de répétition en toutes lettres', { repetition: 'hebdomadaire', jusqua: 'bientôt' }, 400, 'fin_repetition_invalide'],
        ['une date de fin de répétition AVANT le début', { repetition: 'hebdomadaire', jusqua: '2026-10-01' }, 400, 'fin_repetition_invalide'],
        ['une date de fin de répétition à plus de dix ans', { repetition: 'quotidienne', jusqua: '2040-01-01' }, 400, 'fin_repetition_invalide'],
        ['un rappel hors de la liste (7 minutes)', { rappels: [7] }, 400, 'rappel_invalide'],
        ['des rappels qui ne sont pas une liste', { rappels: 15 }, 400, 'rappel_invalide'],
        ['cinq rappels', { rappels: [5, 15, 60, 1440, 5] }, 400, 'rappel_invalide'],
        ['« Notifier les invités » qui n\'est pas un booléen', { notifier: 'oui' }, 400, 'champ_invalide'],
        ['des invités qui ne sont pas une liste', { invites: 'tout le monde' }, 400, 'champ_invalide'],
        ['un invité mal formé', { invites: ['pas-un-identifiant'] }, 400, 'champ_invalide'],
        ['101 invités', { invites: Array.from({ length: 101 }, inconnu) }, 409, 'trop_d_invites'],
      ];
      const n0 = nReunions(), nB = (await nots(b)).length;
      const res = [];
      for (const [, extra] of REFUS) res.push(await a.post('/api/reunions', corps(extra)));
      for (let i = 0; i < REFUS.length; i++) v('refus : ' + REFUS[i][0] + ' → ' + REFUS[i][2] + ' ' + REFUS[i][3], [res[i].code, res[i].j && res[i].j.error], [REFUS[i][2], REFUS[i][3]]);
      v('⛔ les ' + REFUS.length + ' refus n\'ont RIEN écrit (ni réunion, ni notification)', [nReunions(), (await nots(b)).length], [n0, nB]);
      const bon = await a.post('/api/reunions', corps());
      v('population : le corps de base, lui, est accepté (201) — les refus ne viennent pas d\'une route qui refuse tout', [bon.code, nReunions()], [201, n0 + 1]);
      v('un corps qui n\'est pas un objet (une liste) : titre manquant, pas une panne', [(await a.post('/api/reunions', [1, 2])).code, (await a.post('/api/reunions', 'texte')).code], [400, 400]);
    }

    console.log('\nLe corps d\'une programmation : ce qui est accepté, et dit comme il faut');
    {
      const x = await mk(a, { titre: '  Point   avec \t espaces  ', lieu: null });
      v('le titre est nettoyé (espaces repliés), un lieu nul est un lieu vide, les rappels par défaut sont [15 minutes]', [x.reunion.titre, x.reunion.lieu, x.reunion.rappels], ['Point avec espaces', '', [15]]);
      v('une heure locale à Paris ce 26 octobre (heure d\'hiver) est 13:00 UTC ; la fin, 14:00 UTC', [x.reunion.debut, x.reunion.fin], [L26, L26 + HEURE]);
      const ms = await mk(a, { debut: L26, fin: L26 + HEURE });
      v('les mêmes instants donnés en millisecondes UTC : le même enregistrement', [ms.reunion.debut, ms.reunion.fin], [L26, L26 + HEURE]);
      const tk = await mk(a, { tz: 'Asia/Tokyo' });
      v('la même heure locale à Tokyo (UTC+9, sans changement d\'heure) est 05:00 UTC, et le fuseau de la réunion est celui qu\'on a dit', [tk.reunion.debut, tk.reunion.tz], [Date.UTC(2026, 9, 26, 5, 0), 'Asia/Tokyo']);
      const am = await mk(a, { debut: '2026-10-25T02:30', fin: '2026-10-25T03:30' });
      v('⛔ 02:30 le jour du retour à l\'heure d\'hiver est vécue DEUX fois : on retient la première (heure d\'été, 00:30 UTC) — la fin, 03:30, n\'existe qu\'une fois (02:30 UTC)', [am.reunion.debut, am.reunion.fin], [Date.UTC(2026, 9, 25, 0, 30), Date.UTC(2026, 9, 25, 2, 30)]);
      const ny = await mk(c, { debut: '2026-10-26T09:00', fin: '2026-10-26T10:00', tz: undefined });
      v('sans fuseau dans le corps : celui de la PERSONNE (Cleo vit à New York) — 09:00 là-bas est 13:00 UTC', [ny.reunion.tz, ny.reunion.debut], ['America/New_York', L26]);
      const rp = await mk(a, { rappels: [60, 5, 5] }), r0 = await mk(a, { rappels: [] });
      v('les rappels sont triés et sans doublon ; une liste vide veut dire « aucun »', [rp.reunion.rappels, r0.reunion.rappels], [[5, 60], []]);
      const usurpe = await mk(a, { hote: eve.id, uid: eve.id, role: 'admin', id: 'r_' + '0'.repeat(32), conv: 'c_' + '0'.repeat(32), annulee: true, version: 99, cree: 5, maj: 5, prochain: 1 });
      v('⛔ l\'hôte, l\'identifiant, la conversation, la version viennent de la SESSION et de la base : un corps qui s\'en attribue d\'autres est ignoré', [usurpe.reunion.hote.id, usurpe.reunion.id === 'r_' + '0'.repeat(32), usurpe.reunion.conv === 'c_' + '0'.repeat(32), usurpe.reunion.annulee, usurpe.reunion.version, usurpe.reunion.cree > 5], [ana.id, false, false, false, 0, true]);
      v('population : Eve, dont le corps se réclamait, n\'a aucune réunion', (await e.get('/api/reunions')).j.reunions.length, 0);
      const loin = await mk(a, { debut: '2027-03-25T14:00', fin: '2027-03-25T15:00' });
      v('⛔ une réunion programmée dans cinq mois (157 jours) a sa prochaine occurrence — sans elle, ni rappel ni avertissement à la suppression (population : elle est bien à plus de 100 jours)', [(loin.reunion.debut - ZERO) / JOUR > 100, loin.prochaine && loin.prochaine.debut === loin.reunion.debut], [true, true]);
    }

    /* ═══ 3. LES INVITÉS, LES NOTIFICATIONS D'INVITATION ════════════════════════════════════════════════════════════════════════════════════════════ */
    console.log('\nLes invités : des contacts ou des membres de MON espace — un inconnu et un refusé répondent PAREIL');
    const T1 = 'Point d\'équipe ' + CANARI_T, L1 = 'Salle ' + CANARI_L, INC = inconnu();
    const c1 = await a.post('/api/reunions', { titre: T1, lieu: L1, debut: '2026-10-26T14:00', fin: '2026-10-26T15:00', tz: 'Europe/Paris', invites: [ben.id, cleo.id, dan.id, eve.id, gus.id, INC, ana.id, ben.id], rappels: [15, 60] });
    const R1 = c1.j.reunion.id, CONV1 = c1.j.reunion.conv;
    {
      v('programmer : 201', c1.code, 201);
      v('⛔ un collègue (Ben, Cleo), un contact (Dan) sont invités ; un étranger (Eve), un collègue que l\'hôte a BLOQUÉ (Gus) et un identifiant inconnu sont rendus ENSEMBLE dans `non_invites`, sans dire lequel est quoi', [statuts(c1.j), tri(c1.j.non_invites)], ['Ana:accepte Ben:attente Cleo:attente Dan:attente', tri([eve.id, gus.id, INC])]);
      v('l\'hôte s\'invite d\'office (accepté) et ne compte pas deux fois ; un doublon dans la liste est ignoré (4 participants)', [c1.j.invites.length, c1.j.invites.filter(i => i.hote).map(i => i.prenom)], [4, ['Ana']]);
      v('la fiche rendue à l\'hôte : hôte, mes rappels, première occurrence', [c1.j.moi, c1.j.prochaine], [{ hote: true, statut: 'accepte', rappels: [15, 60], rappels_perso: false }, { debut: L26, fin: L26 + HEURE }]);
      v('⛔ chaque invité ne reçoit de l\'hôte que ce que sa fiche dit : identifiant, prénom, nom, photo, réponse — rien d\'autre sur les autres (ni fuseau, ni adresse)', [...new Set(c1.j.invites.map(i => Object.keys(i).sort().join()))], ['avatar,hote,id,nom,prenom,statut']);
      const nb = await nots(b, R1), nc = await nots(c, R1), nd = await nots(d, R1), na = await nots(a, R1);
      v('⛔ chaque invité a UNE notification d\'invitation qui nomme l\'hôte, dit le titre, et l\'heure dans SON fuseau — Ben à Paris : 14:00', [nb.length, nb[0].type, nb[0].titre, nb[0].texte, nb[0].cible], [1, 'reunion_invitation', T1, 'Ana Banc vous a invité à une réunion : lundi 26 octobre à 14:00.', R1]);
      v('… Cleo, à New York : la MÊME réunion se lit 09:00 (13:00 UTC)', [nc.length, nc[0].texte], [1, 'Ana Banc vous a invité à une réunion : lundi 26 octobre à 09:00.']);
      v('… Dan (un contact, sans Pro) la reçoit aussi', [nd.length, nd[0].type], [1, 'reunion_invitation']);
      v('⛔ l\'hôte n\'est pas notifié de son propre geste (zéro, la population étant trois notifications ailleurs)', na.length, 0);
      v('⛔ chaque notification dit QUI elle nomme (`auteur`) : l\'effacement du compte d\'Ana la réécrira « Un compte supprimé » (couture avec le lot 3) — population : trois notifications', [nb, nc, nd].map(l => sql('SELECT auteur FROM notification WHERE id = ?', l[0].id).auteur), [ana.id, ana.id, ana.id]);
      v('les personnes non invitées n\'ont reçu AUCUNE notification de réunion (population : Eve, Fred, Gus)', [(await nots(e)).length, (await nots(f)).length, (await nots(g)).length], [0, 0, 0]);
      const sans = await mk(a, { invites: [ben.id], notifier: false });
      v('« Notifier les invités : non » : Ben est invité (la fiche le dit) mais ne reçoit rien', [statuts(sans), (await nots(b, sans.reunion.id)).length], ['Ana:accepte Ben:attente', 0]);
      const rep = await mk(a, { invites: [ben.id], repetition: 'hebdomadaire', n: 3 });
      v('une réunion qui se répète le dit dans l\'invitation', (await nots(b, rep.reunion.id))[0].texte, 'Ana Banc vous a invité à une réunion : lundi 26 octobre à 14:00. Elle se répète chaque semaine.');
      const cn = await b.get('/api/conversations');
      const mienne = cn.j.conversations.find(x => x.id === CONV1);
      v('la conversation de la réunion paraît dans la liste de Ben : de genre `reunion`, au nom du titre, avec l\'identifiant de la réunion (pour ouvrir sa fiche)', [mienne && mienne.type, mienne && mienne.nom, mienne && mienne.reunion, mienne && mienne.role], ['reunion', T1, R1, 'membre']);
      v('… et Ana en est l\'administrateur', (await a.get('/api/conversations')).j.conversations.find(x => x.id === CONV1).role, 'admin');
      const pd = await b.post('/api/reunions', corps({ invites: [dan.id] }));
      v('⛔ Ben, collègue d\'Ana mais pas contact de Dan, ne peut pas inviter Dan : `peutEcrire` est la seule définition (Dan est rendu dans `non_invites`)', [pd.code, pd.j.non_invites, pd.j.invites.length], [201, [dan.id], 1]);
    }

    /* ═══ 4. LA FICHE : UN NON-INVITÉ NE VOIT RIEN ═════════════════════════════════════════════════════════════════════════════════════════════ */
    console.log('\nLa fiche : un non-invité reçoit la réponse d\'une réunion inexistante');
    {
      const vue = await fiche(b, R1);
      v('un invité lit la fiche : titre, lieu, hôte, invités et SES rappels', [vue.code, vue.j.reunion.titre, vue.j.reunion.lieu, vue.j.reunion.hote.prenom, vue.j.moi.statut], [200, T1, L1, 'Ana', 'attente']);
      const inex = await e.get('/api/reunions/r_' + '0'.repeat(32));
      for (const [nom, cli] of [['une étrangère (Eve)', e], ['un étranger (Fred)', f], ['un collègue que l\'hôte a bloqué (Gus)', g]]) {
        const r = await cli.get('/api/reunions/' + R1);
        v('⛔ ' + nom + ' : 404, la MÊME réponse qu\'une réunion qui n\'existe pas', [r.code, r.j], [inex.code, inex.j]);
      }
      v('population : la réponse d\'une réunion inexistante est bien un 404 « introuvable »', [inex.code, inex.j], [404, { error: 'introuvable' }]);
      const ics = await e.get('/api/reunions/' + R1 + '/ics'), rep = await e.post('/api/reunions/' + R1 + '/reponse', { statut: 'accepte' });
      v('… ni le fichier .ics ni une réponse : 404 aussi', [ics.code, rep.code], [404, 404]);
      v('des identifiants mal formés répondent 404 (jamais une erreur de format, jamais un 500)', (await Promise.all(['r_zz', 'x', 'r_' + 'A'.repeat(32), 'c_' + '0'.repeat(32), 'r_' + '0'.repeat(31)].map(async id => (await b.get('/api/reunions/' + id)).code))), [404, 404, 404, 404, 404]);
    }

    /* ═══ 5. L'AGENDA ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════ */
    console.log('\nL\'agenda : mes réunions seulement, leurs occurrences dans la fenêtre, une fenêtre bornée');
    const R5 = (await mk(a, { titre: 'Hebdo du lundi', debut: '2026-10-19T14:00', fin: '2026-10-19T15:00', repetition: 'hebdomadaire', n: 6, invites: [ben.id, cleo.id] })).reunion.id;
    {
      const lb = (await b.get('/api/reunions')).j;
      const r1 = lb.reunions.find(x => x.id === R1);
      v('la fenêtre par défaut commence la VEILLE et dure quatorze jours ; Ben y voit R1 avec son occurrence, sa réponse et le nombre de participants', [lb.au - lb.du, JOUR - (ZERO - lb.du) >= 0 && JOUR - (ZERO - lb.du) < 60000, !!r1, r1 && r1.occurrences, r1 && r1.moi.statut, r1 && r1.participants_n], [14 * JOUR, true, true, [{ debut: L26, fin: L26 + HEURE }], 'attente', 4]);
      v('⛔ une étrangère (Eve) n\'a rien dans son agenda — population : Ben en a plusieurs', [(await e.get('/api/reunions')).j.reunions.length, lb.reunions.length > 3], [0, true]);
      const dedans = lb.reunions.map(x => x.id);
      vrai('⛔ l\'agenda de Ben ne contient QUE des réunions où Ben est invité (aucune des réunions de la fixture où il ne l\'est pas)', dedans.every(id => Number(sql('SELECT COUNT(*) AS n FROM reunion_invite WHERE reunion = ? AND uid = ?', id, ben.id).n) === 1));
      const ser = (await a.get('/api/reunions?du=' + (ZERO - JOUR) + '&au=' + (ZERO + 28 * JOUR))).j.reunions.find(x => x.id === R5);
      const attendues = [Date.UTC(2026, 9, 19, 12, 0), Date.UTC(2026, 9, 26, 13, 0), Date.UTC(2026, 10, 2, 13, 0), Date.UTC(2026, 10, 9, 13, 0)];
      v('⛔ une série hebdomadaire du lundi 14:00 à Paris, vue sur quatre semaines : 12:00 UTC avant le retour à l\'heure d\'hiver, 13:00 UTC après — et toujours 14:00 À PARIS', [ser.occurrences.map(o => o.debut), ser.occurrences.map(o => heureLocale(o.debut, 'Europe/Paris'))], [attendues, ['14:00', '14:00', '14:00', '14:00']]);
      v('… chaque occurrence dure une heure', ser.occurrences.map(o => o.fin - o.debut), [HEURE, HEURE, HEURE, HEURE]);
      const apres = (await a.get('/api/reunions?du=' + (L26 + 2 * HEURE) + '&au=' + (L26 + 8 * JOUR))).j.reunions.map(x => x.id);
      v('une fenêtre qui commence après la fin de R1 ne la porte pas ; la série, si (population)', [apres.includes(R1), apres.includes(R5)], [false, true]);
      const encours = (await a.get('/api/reunions?du=' + (L26 + 30 * MIN) + '&au=' + (L26 + 2 * HEURE))).j.reunions.map(x => x.id);
      v('une réunion COMMENCÉE avant la fenêtre mais pas finie y paraît', encours.includes(R1), true);
      const idsDe = async (q) => (await a.get('/api/reunions?' + q)).j.reunions.map(x => x.id);
      v('⛔ les bornes sont STRICTES : une réunion qui finit à l\'instant où la fenêtre commence n\'y est pas (R1 et la série finissent à 14:00 UTC), à une milliseconde près elle y est', [(await idsDe('du=' + (L26 + HEURE) + '&au=' + (L26 + 2 * HEURE))).filter(id => id === R1 || id === R5), (await idsDe('du=' + (L26 + HEURE - 1) + '&au=' + (L26 + 2 * HEURE))).filter(id => id === R1 || id === R5).sort()], [[], tri([R1, R5])]);
      v('… et une réunion qui COMMENCE à l\'instant où la fenêtre finit n\'y est pas non plus ; une milliseconde de plus et elle y est', [(await idsDe('du=' + (L26 - HEURE) + '&au=' + L26)).filter(id => id === R1 || id === R5), (await idsDe('du=' + (L26 - HEURE) + '&au=' + (L26 + 1))).filter(id => id === R1 || id === R5).sort()], [[], tri([R1, R5])]);
      const bornes = [['62 jours exactement', 'du=' + ZERO + '&au=' + (ZERO + 62 * JOUR), 200], ['62 jours et une milliseconde', 'du=' + ZERO + '&au=' + (ZERO + 62 * JOUR + 1), 400], ['un début qui n\'est pas un nombre', 'du=abc', 400], ['une fin égale au début', 'du=5&au=5', 400], ['une fin avant le début par défaut (hier)', 'au=' + (ZERO - 5 * JOUR), 400], ['un nombre décimal', 'du=1.5&au=99', 400]];
      for (const [nom, q, code] of bornes) { const r = await a.get('/api/reunions?' + q); v('fenêtre : ' + nom + ' → ' + code, [r.code, code === 400 ? r.j.error : null], [code, code === 400 ? 'fenetre_invalide' : null]); }
    }

    /* ═══ 6. RÉPONDRE ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════ */
    console.log('\nRépondre : accepte, décline, peut-être — l\'hôte n\'a pas à répondre, un corps ne répond pas pour un autre');
    {
      v('Ben accepte', statuts((await b.post('/api/reunions/' + R1 + '/reponse', { statut: 'accepte' })).j), 'Ana:accepte Ben:accepte Cleo:attente Dan:attente');
      v('Cleo répond « peut-être »', statuts((await c.post('/api/reunions/' + R1 + '/reponse', { statut: 'peutetre' })).j), 'Ana:accepte Ben:accepte Cleo:peutetre Dan:attente');
      const rd = await d.post('/api/reunions/' + R1 + '/reponse', { statut: 'decline' });
      v('population : Dan (Perso, sans aucun espace) répond SANS Pro — répondre ne demande pas de formule', [rd.code, statuts(rd.j)], [200, 'Ana:accepte Ben:accepte Cleo:peutetre Dan:decline']);
      const usurpe = await b.post('/api/reunions/' + R1 + '/reponse', { statut: 'peutetre', uid: ana.id, par: cleo.id, id: 'r_x' });
      v('⛔ un corps ne répond pas pour un autre : seule la réponse de Ben change (Ana et Cleo gardent la leur)', statuts(usurpe.j), 'Ana:accepte Ben:peutetre Cleo:peutetre Dan:decline');
      await b.post('/api/reunions/' + R1 + '/reponse', { statut: 'accepte' });
      const refus = [['un statut inconnu', { statut: 'oui' }], ['« en attente » (on ne retourne pas à l\'attente)', { statut: 'attente' }], ['sans statut', {}], ['un statut qui n\'est pas du texte', { statut: 5 }]];
      for (const [nom, corps2] of refus) { const r = await b.post('/api/reunions/' + R1 + '/reponse', corps2); v('refus : ' + nom + ' → 400 champ_invalide', [r.code, r.j.error], [400, 'champ_invalide']); }
      const rh = await a.post('/api/reunions/' + R1 + '/reponse', { statut: 'decline' });
      v('⛔ l\'hôte ne répond pas à sa propre réunion : 409 `hote_reponse`, et il reste « accepté »', [rh.code, rh.j.error, statuts((await fiche(a, R1)).j)], [409, 'hote_reponse', 'Ana:accepte Ben:accepte Cleo:peutetre Dan:decline']);
      const meme = await b.post('/api/reunions/' + R1 + '/reponse', { statut: 'accepte' });
      v('répondre deux fois la même chose : 200, rien ne change', [meme.code, statuts(meme.j)], [200, 'Ana:accepte Ben:accepte Cleo:peutetre Dan:decline']);
      await c.post('/api/reunions/' + R1 + '/reponse', { statut: 'accepte' });
    }

    /* ═══ 7. MES RAPPELS ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════ */
    console.log('\nMes rappels : à moi seul, `null` rend la main à la réunion');
    {
      const r = await b.post('/api/reunions/' + R1 + '/rappels', { rappels: [1440, 5] });
      v('Ben choisit 5 minutes et 1 jour avant : ses rappels, triés, sont les siens', [r.code, r.j.moi.rappels, r.j.moi.rappels_perso], [200, [5, 1440], true]);
      v('⛔ … ceux de la réunion, et ceux d\'Ana, n\'ont pas bougé', [r.j.reunion.rappels, (await fiche(a, R1)).j.moi], [[15, 60], { hote: true, statut: 'accepte', rappels: [15, 60], rappels_perso: false }]);
      const rien = await b.post('/api/reunions/' + R1 + '/rappels', { rappels: [] });
      v('« aucun rappel » est un choix (liste vide)', [rien.j.moi.rappels, rien.j.moi.rappels_perso], [[], true]);
      const nul = await b.post('/api/reunions/' + R1 + '/rappels', { rappels: null });
      v('`null` rend la main au réglage de la réunion', [nul.j.moi.rappels, nul.j.moi.rappels_perso], [[15, 60], false]);
      const refus = [['un rappel hors de la liste', { rappels: [7] }, 'rappel_invalide'], ['du texte', { rappels: 'x' }, 'rappel_invalide'], ['cinq rappels', { rappels: [5, 15, 60, 1440, 5] }, 'rappel_invalide'], ['sans le champ', {}, 'champ_invalide']];
      for (const [nom, corps2, code] of refus) { const x = await b.post('/api/reunions/' + R1 + '/rappels', corps2); v('refus : ' + nom + ' → 400 ' + code, [x.code, x.j.error], [400, code]); }
      v('… aucun refus n\'a touché à ses rappels', (await fiche(b, R1)).j.moi.rappels_perso, false);
      const usurpe = await b.post('/api/reunions/' + R1 + '/rappels', { rappels: [5], uid: cleo.id, par: cleo.id });
      v('⛔ un corps ne règle pas les rappels d\'un autre : ceux de Ben changent, ceux de Cleo (et d\'Ana) restent ceux de la réunion', [usurpe.j.moi.rappels_perso, (await fiche(c, R1)).j.moi.rappels_perso, (await fiche(a, R1)).j.moi.rappels_perso], [true, false, false]);
      await b.post('/api/reunions/' + R1 + '/rappels', { rappels: null });
    }

    /* ═══ 8. MODIFIER ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════ */
    console.log('\nModifier : seul l\'hôte ; l\'HORAIRE remet les réponses en attente, un lieu non ; on ne prévient que de ce qui se voit');
    {
      const ver = async () => (await fiche(a, R1)).j.reunion.version;
      const v0 = await ver();
      v('Ben, invité, ne modifie pas : 403 `interdit` ; une étrangère et un collègue bloqué : 404', [(await b.post('/api/reunions/' + R1 + '/modifier', { lieu: 'ailleurs' })).code, (await e.post('/api/reunions/' + R1 + '/modifier', { lieu: 'ailleurs' })).code, (await g.post('/api/reunions/' + R1 + '/modifier', { lieu: 'ailleurs' })).code], [403, 404, 404]);
      v('population : rien n\'a changé (lieu, version)', [(await fiche(a, R1)).j.reunion.lieu, await ver()], [L1, v0]);
      const L1b = 'Salle ' + CANARI_L + ' bis';
      const m1 = await a.post('/api/reunions/' + R1 + '/modifier', { lieu: L1b, hote: eve.id, id: 'r_' + '1'.repeat(32), conv: 'c_' + '1'.repeat(32), annulee: true, version: 99 });
      v('⛔ changer le lieu : 200, la version monte d\'UN, et les champs d\'identité du corps sont ignorés (hôte, identifiant, conversation, annulée, version)', [m1.code, m1.j.reunion.lieu, m1.j.reunion.version, m1.j.reunion.hote.id, m1.j.reunion.annulee, m1.j.reunion.id, m1.j.reunion.conv], [200, L1b, v0 + 1, ana.id, false, R1, CONV1]);
      v('⛔ un LIEU qui change ne remet pas les réponses en attente (celui qui vient peut toujours venir)', statuts(m1.j), 'Ana:accepte Ben:accepte Cleo:accepte Dan:decline');
      const nm = [await nots(b, R1), await nots(c, R1), await nots(d, R1)];
      v('… Ben, Cleo et Dan sont prévenus : « a modifié la réunion »', nm.map(l => l.filter(n => n.type === 'reunion_modifiee').map(n => n.texte)), [['Ana Banc a modifié la réunion.'], ['Ana Banc a modifié la réunion.'], ['Ana Banc a modifié la réunion.']]);
      const m2 = await a.post('/api/reunions/' + R1 + '/modifier', { titre: T1 + ' (suite)' });
      v('le titre change aussi le nom de la CONVERSATION de la réunion', [m2.j.reunion.titre, (await b.get('/api/conversations')).j.conversations.find(x => x.id === CONV1).nom], [T1 + ' (suite)', T1 + ' (suite)']);
      await a.post('/api/reunions/' + R1 + '/modifier', { titre: T1 });
      const avant = await idsDe(b, R1);
      const m3 = await a.post('/api/reunions/' + R1 + '/modifier', { rappels: [5, 15] });
      v('⛔ un simple réglage de RAPPEL change la réunion (la version monte) mais ne prévient personne : rien ne s\'en voit', [m3.code, m3.j.reunion.rappels, await idsDe(b, R1)], [200, [5, 15], avant]);
      await a.post('/api/reunions/' + R1 + '/modifier', { rappels: [15, 60] });
      const vn = await ver(), an = await idsDe(b, R1);
      const m4 = await a.post('/api/reunions/' + R1 + '/modifier', { lieu: L1b });
      v('modifier pour mettre la même valeur : 200, rien ne change, personne n\'est prévenu', [m4.code, await ver(), await idsDe(b, R1)], [200, vn, an]);
      const m5 = await a.post('/api/reunions/' + R1 + '/modifier', { lieu: L1, notifier: false });
      v('« Notifier les invités : non » : le lieu change, personne n\'est prévenu', [m5.j.reunion.lieu, await idsDe(b, R1)], [L1, an]);
      const m6 = await a.post('/api/reunions/' + R1 + '/modifier', { lieu: null });
      v('un lieu nul efface le lieu', m6.j.reunion.lieu, '');
      await a.post('/api/reunions/' + R1 + '/modifier', { lieu: L1, notifier: false });
      const m7 = await a.post('/api/reunions/' + R1 + '/modifier', { debut: '2026-10-26T15:00', fin: '2026-10-26T16:00' });
      v('⛔ l\'HORAIRE change : tous les invités repassent « en attente » (celui qui avait décliné l\'ancienne heure ne doit pas manquer la nouvelle) ; l\'hôte reste accepté', [m7.code, statuts(m7.j), m7.j.reunion.debut, m7.j.prochaine.debut], [200, 'Ana:accepte Ben:attente Cleo:attente Dan:attente', L26 + HEURE, L26 + HEURE]);
      const hb = (await nots(b, R1)).filter(n => n.type === 'reunion_modifiee').map(n => n.texte), hc = (await nots(c, R1)).filter(n => n.type === 'reunion_modifiee').map(n => n.texte);
      v('… la notification DIT la nouvelle heure, dans le fuseau de chacun (Ben 15:00, Cleo à New York 10:00)', [hb.includes('Ana Banc a changé l\'horaire de la réunion : lundi 26 octobre à 15:00.'), hc.includes('Ana Banc a changé l\'horaire de la réunion : lundi 26 octobre à 10:00.')], [true, true]);
      const msgs = (await a.get('/api/conversations/' + CONV1 + '/messages')).j.messages.filter(x => x.type === 'systeme').map(x => x.meta);
      v('… et la conversation le dit (un message d\'activité « horaire »)', [msgs[0], msgs[msgs.length - 1]], [{ k: 'reunion_creee' }, { k: 'reunion_modifiee', horaire: true }]);
      await b.post('/api/reunions/' + R1 + '/reponse', { statut: 'accepte' }); await c.post('/api/reunions/' + R1 + '/reponse', { statut: 'accepte' }); await d.post('/api/reunions/' + R1 + '/reponse', { statut: 'peutetre' });
      const v1 = await ver();
      const REFUS = [
        ['une fin avant le nouveau début', { fin: '2026-10-26T14:30' }, 'fin_avant_debut'], ['un fuseau inconnu', { tz: 'Mars/Olympus' }, 'fuseau_inconnu'],
        ['une heure locale du trou de printemps', { debut: '2027-03-28T02:30', fin: '2027-03-28T03:30' }, 'heure_inexistante'], ['un nombre de répétitions absurde', { repetition: 'quotidienne', n: 1 }, 'fin_repetition_invalide'],
        ['un rappel hors de la liste', { rappels: [3] }, 'rappel_invalide'], ['un titre vide', { titre: '' }, 'titre_vide'], ['un lieu trop long', { lieu: 'L'.repeat(301) }, 'champ_invalide'], ['une répétition inconnue', { repetition: 'annuelle' }, 'repetition_invalide'],
      ];
      for (const [nom, corps2, code] of REFUS) { const x = await a.post('/api/reunions/' + R1 + '/modifier', corps2); v('refus : ' + nom + ' → 400 ' + code, [x.code, x.j.error], [400, code]); }
      const bad = await a.post('/api/reunions/' + R1 + '/modifier', { lieu: 'x', notifier: 'non' });
      v('« Notifier » qui n\'est pas un booléen : 400 champ_invalide', [bad.code, bad.j.error], [400, 'champ_invalide']);
      v('⛔ aucun refus n\'a rien changé (version, réponses)', [await ver(), statuts((await fiche(a, R1)).j)], [v1, 'Ana:accepte Ben:accepte Cleo:accepte Dan:peutetre']);
      const se = await mk(a, { repetition: 'hebdomadaire', n: 4, invites: [ben.id] });
      const sm = await a.post('/api/reunions/' + se.reunion.id + '/modifier', { repetition: 'aucune' });
      v('une série qui devient une réunion simple perd son nombre de répétitions et sa date de fin', [sm.j.reunion.repetition, sm.j.reunion.n, sm.j.reunion.jusqua], ['aucune', null, null]);
      v('… et Ben est toujours invité (population : la fiche garde ses deux participants)', statuts(sm.j), 'Ana:accepte Ben:attente');
    }

    /* ═══ 9. INVITER, RETIRER ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════ */
    console.log('\nInviter après coup, retirer : l\'hôte seul, les mêmes règles que la création');
    {
      const R4 = (await mk(a, { invites: [ben.id] })).reunion.id;
      const [nc0, nd0] = [(await nots(c, R4)).length, (await nots(d, R4)).length];
      const inv = await a.post('/api/reunions/' + R4 + '/inviter', { uids: [cleo.id, dan.id, eve.id, gus.id, INC, ben.id] });
      v('⛔ inviter : les collègues et contacts entrent (Cleo, Dan) ; Eve, Gus (bloqué) et l\'inconnu sont rendus ENSEMBLE ; Ben, déjà invité, n\'est ni ajouté ni refusé', [inv.code, tri(inv.j.ajoutes), tri(inv.j.non_ajoutes)], [200, tri([cleo.id, dan.id]), tri([eve.id, gus.id, INC])]);
      v('… la fiche rendue les compte (4 participants) et Cleo reçoit son invitation dans SON fuseau (09:00 à New York)', [inv.j.invites.length, (await nots(c, R4)).length - nc0, (await nots(c, R4))[0].texte], [4, 1, 'Ana Banc vous a invité à une réunion : lundi 26 octobre à 09:00.']);
      v('… Dan aussi, et Ben (déjà invité) pas une seconde fois', [(await nots(d, R4)).length - nd0, (await nots(b, R4)).filter(n => n.type === 'reunion_invitation').length], [1, 1]);
      const hh = await a.post('/api/reunions/' + R4 + '/inviter', { uids: [hal.id], notifier: false });
      v('« Notifier les invités : non » : Hal est invité sans notification', [hh.j.ajoutes, (await nots(h, R4)).length], [[hal.id], 0]);
      const REFUS = [['une liste vide', { uids: [] }], ['pas une liste', { uids: 'tous' }], ['un identifiant mal formé', { uids: ['pas-un-identifiant'] }], ['51 identifiants à la fois', { uids: Array.from({ length: 51 }, inconnu) }], ['sans le champ', {}], ['« Notifier » qui n\'est pas un booléen', { uids: [hal.id], notifier: 1 }]];
      for (const [nom, corps2] of REFUS) { const x = await a.post('/api/reunions/' + R4 + '/inviter', corps2); v('refus : ' + nom + ' → 400 champ_invalide', [x.code, x.j.error], [400, 'champ_invalide']); }
      v('Ben, invité, n\'invite personne : 403 ; une étrangère : 404', [(await b.post('/api/reunions/' + R4 + '/inviter', { uids: [hal.id] })).code, (await e.post('/api/reunions/' + R4 + '/inviter', { uids: [hal.id] })).code], [403, 404]);
      /* retirer */
      v('Ben, invité, ne retire personne : 403', (await b.post('/api/reunions/' + R4 + '/retirer', { uid: cleo.id })).code, 403);
      const ret = await a.post('/api/reunions/' + R4 + '/retirer', { uid: cleo.id });
      v('⛔ l\'hôte retire Cleo : 200, la fiche ne la compte plus, et elle ne voit PLUS rien — ni la réunion, ni sa conversation (404 comme si elle n\'existait pas)', [ret.code, statuts(ret.j), (await fiche(c, R4)).code, (await c.get('/api/conversations/' + ret.j.reunion.conv)).code], [200, 'Ana:accepte Ben:attente Dan:attente Hal:attente', 404, 404]);
      v('… et elle ne répond plus (404)', (await c.post('/api/reunions/' + R4 + '/reponse', { statut: 'accepte' })).code, 404);
      const refus2 = [['l\'hôte (409 hote_non_retirable)', { uid: ana.id }, 409, 'hote_non_retirable'], ['quelqu\'un qui n\'est pas invité', { uid: eve.id }, 404, 'introuvable'], ['un identifiant mal formé', { uid: 'x' }, 400, 'champ_invalide'], ['sans identifiant', {}, 400, 'champ_invalide']];
      for (const [nom, corps2, code, err] of refus2) { const x = await a.post('/api/reunions/' + R4 + '/retirer', corps2); v('retirer : ' + nom, [x.code, x.j.error], [code, err]); }
      v('Cleo retirée peut être invitée de nouveau (elle a gardé son droit d\'être invitée)', (await a.post('/api/reunions/' + R4 + '/inviter', { uids: [cleo.id] })).j.ajoutes, [cleo.id]);
    }

    console.log('\nCent invités au plus (l\'hôte en plus) : le plafond se lit en HTTP');
    {
      const foule = [];
      for (let i = 0; i < 101; i++) { const p = pers('M' + String(i).padStart(3, '0')); S.contactLier(ana.id, p.id); foule.push(p.id); }
      const tropnombreux = await a.post('/api/reunions', corps({ invites: foule }));
      v('101 personnes réelles : 409 `trop_d_invites`, rien de créé', [tropnombreux.code, tropnombreux.j.error], [409, 'trop_d_invites']);
      const n0 = nReunions();
      const cent = await a.post('/api/reunions', corps({ invites: foule.slice(0, 100), notifier: false }));
      v('population : cent personnes réelles sont invitées (101 participants, l\'hôte compris) — le refus du dessus venait bien du nombre', [cent.code, cent.j.invites.length, cent.j.non_invites.length, nReunions()], [201, 101, 0, n0 + 1]);
      const plus = await a.post('/api/reunions/' + cent.j.reunion.id + '/inviter', { uids: [foule[100]] });
      v('⛔ une cent-unième personne : 409 `trop_d_invites`, la fiche garde ses 101 participants', [plus.code, plus.j.error, (await fiche(a, cent.j.reunion.id)).j.invites.length], [409, 'trop_d_invites', 101]);
    }

    /* ═══ 10. ANNULER ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════ */
    console.log('\nAnnuler : la réunion reste (annulée), ses invités sont prévenus — TOUJOURS, et une seule fois');
    const R2 = (await mk(a, { invites: [ben.id, cleo.id, dan.id], notifier: false })).reunion.id;
    {
      await b.post('/api/reunions/' + R2 + '/reponse', { statut: 'accepte' });
      v('Ben, invité, n\'annule pas : 403 ; une étrangère : 404', [(await b.post('/api/reunions/' + R2 + '/annuler', {})).code, (await e.post('/api/reunions/' + R2 + '/annuler', {})).code], [403, 404]);
      v('population : la réunion est vivante, et aucun invité n\'a été prévenu de quoi que ce soit (notifier:false à la création)', [(await fiche(a, R2)).j.reunion.annulee, (await nots(b, R2)).length, (await nots(c, R2)).length], [false, 0, 0]);
      const an = await a.post('/api/reunions/' + R2 + '/annuler', { notifier: false });
      v('annuler : 200, la réunion est annulée, il n\'y a plus de prochaine occurrence', [an.code, an.j.reunion.annulee, an.j.prochaine], [200, true, null]);
      const [nb, nc, nd, na] = [await nots(b, R2), await nots(c, R2), await nots(d, R2), await nots(a, R2)];
      v('⛔ l\'annulation PRÉVIENT, même quand le corps dit « notifier : non » (aller à une réunion annulée coûte plus cher que d\'être dérangé) — dans le fuseau de chacun', [nb.map(n => n.texte), nc.map(n => n.texte), nd.length], [['Ana Banc a annulé la réunion du lundi 26 octobre à 14:00.'], ['Ana Banc a annulé la réunion du lundi 26 octobre à 09:00.'], 1]);
      v('… sauf l\'hôte, qui l\'a fait', na.length, 0);
      const vn = (await fiche(a, R2)).j.reunion.version;
      const deux = await a.post('/api/reunions/' + R2 + '/annuler', {});
      v('⛔ annuler une réunion déjà annulée : 200, rien ne change, personne n\'est prévenu une seconde fois', [deux.code, deux.j.reunion.version, (await nots(b, R2)).length], [200, vn, 1]);
      const apres = [(await a.post('/api/reunions/' + R2 + '/modifier', { lieu: 'x' })), (await a.post('/api/reunions/' + R2 + '/inviter', { uids: [hal.id] })), (await b.post('/api/reunions/' + R2 + '/reponse', { statut: 'decline' }))];
      v('⛔ une réunion annulée ne se modifie plus, n\'invite plus, ne reçoit plus de réponse : 409 `reunion_annulee`', apres.map(x => [x.code, x.j.error]), [[409, 'reunion_annulee'], [409, 'reunion_annulee'], [409, 'reunion_annulee']]);
      const lue = await fiche(b, R2);
      v('… mais elle se LIT (« annulée »), et paraît dans l\'agenda de Ben marquée annulée', [lue.code, lue.j.reunion.annulee, (await b.get('/api/reunions')).j.reunions.find(x => x.id === R2).annulee], [200, true, true]);
      const ics = lignesIcs((await b.get('/api/reunions/' + R2 + '/ics')).txt);
      v('… et son fichier .ics dit `STATUS:CANCELLED` (l\'agenda de la personne la barre au lieu de la garder)', [ics.includes('STATUS:CANCELLED'), ics.includes('STATUS:CONFIRMED')], [true, false]);
      const sys = (await a.get('/api/conversations/' + lue.j.reunion.conv + '/messages')).j.messages.filter(x => x.type === 'systeme').map(x => x.meta.k);
      v('la conversation le dit (un message d\'activité)', sys, ['reunion_creee', 'reunion_annulee']);
    }

    /* ═══ 10 bis. BLOQUER, QUITTER ════════════════════════════════════════════════════════════════════════════════════════════════════════════════ */
    console.log('\nBloquer ne retire personne d\'une réunion et coupe les notifications de celui qu\'on a bloqué ; « Quitter » est la sortie de l\'invité');
    {
      const RB = (await mk(a, { invites: [ben.id, cleo.id, hal.id], notifier: false })).reunion.id;
      /* Ben bloque Ana (l'invité bloque l'hôte) ; Ana bloque Hal (l'hôte bloque l'invité) ; Cleo ne bloque personne */
      const bl1 = await b.post('/api/contacts/bloquer', { uid: ana.id }), bl2 = await a.post('/api/contacts/bloquer', { uid: hal.id });
      v('population : Ben a bloqué Ana, Ana a bloqué Hal (200 chacun), et tous trois sont invités à la réunion', [bl1.code, bl2.code, statuts((await fiche(a, RB)).j)], [200, 200, 'Ana:accepte Ben:attente Cleo:attente Hal:attente']);
      const m = await a.post('/api/reunions/' + RB + '/modifier', { lieu: 'Après le blocage' });
      v('⛔ l\'hôte modifie : 200, la réunion change pour tous, mais la notification ne part qu\'à CLEO — Ben a bloqué l\'hôte, l\'hôte a bloqué Hal : la règle de la messagerie (`contactBloque`), dans les deux sens',
        [m.code, (await nots(b, RB)).length, (await nots(h, RB)).length, (await nots(c, RB)).map(n => n.type)], [200, 0, 0, ['reunion_modifiee']]);
      v('⛔ … et BLOQUER NE RETIRE PERSONNE : tous sont encore invités, la fiche de Ben se lit et porte la nouvelle valeur, l\'agenda de Hal la porte',
        [statuts((await fiche(a, RB)).j), (await fiche(b, RB)).j.reunion.lieu, (await h.get('/api/reunions')).j.reunions.some(x => x.id === RB)], ['Ana:accepte Ben:attente Cleo:attente Hal:attente', 'Après le blocage', true]);
      await a.post('/api/reunions/' + RB + '/annuler', {});
      v('⛔ l\'annulation suit la même règle : elle prévient Cleo (qui a aussi sa modification), ni Ben ni Hal — ils lisent « annulée » dans leur agenda', [(await nots(c, RB)).map(n => n.type).sort(), (await nots(b, RB)).length, (await nots(h, RB)).length, (await b.get('/api/reunions')).j.reunions.find(x => x.id === RB).annulee], [['reunion_annulee', 'reunion_modifiee'], 0, 0, true]);

      /* on lève les deux blocages : la suite du banc compte sur Ben et Hal comme invités ordinaires d'Ana */
      const debl = [await b.post('/api/contacts/debloquer', { uid: ana.id }), await a.post('/api/contacts/debloquer', { uid: hal.id })];
      v('population : les deux blocages sont levés (200 chacun) — Ana peut de nouveau inviter Ben et Hal', [debl[0].code, debl[1].code], [200, 200]);

      /* quitter : c'est Cleo et Dan qui jouent */
      const RQ = (await mk(a, { invites: [cleo.id, dan.id], notifier: false })).reunion.id;
      const convQ = (await fiche(a, RQ)).j.reunion.conv;
      const refus = [await a.post('/api/reunions/' + RQ + '/quitter', {}), await e.post('/api/reunions/' + RQ + '/quitter', {}), await T.client(svc.base).post('/api/reunions/' + RQ + '/quitter', {})];
      v('⛔ l\'hôte ne quitte pas (409 `hote_non_quittable`, la réunion reste intacte) ; une étrangère reçoit le 404 d\'une réunion inexistante ; sans session : 401',
        [refus.map(x => x.code), refus[0].j.error, refus[1].j.error, statuts((await fiche(a, RQ)).j)], [[409, 404, 401], 'hote_non_quittable', 'introuvable', 'Ana:accepte Cleo:attente Dan:attente']);
      v('… et la réponse faite à la non-invitée est celle d\'une réunion inexistante', [refus[1].code, refus[1].j.error], [(await e.post('/api/reunions/r_' + '0'.repeat(32) + '/quitter', {})).code, 'introuvable']);
      const sortie = await c.post('/api/reunions/' + RQ + '/quitter', {});
      v('⛔ Cleo quitte : 200 ; la réunion n\'est plus dans son agenda, sa fiche répond 404 (la réponse d\'une réunion inexistante), sa conversation aussi',
        [sortie.code, (await fiche(c, RQ)).code, (await c.get('/api/reunions')).j.reunions.some(x => x.id === RQ), (await c.get('/api/conversations/' + convQ + '/messages')).code], [200, 404, false, 404]);
      const sys = (await a.get('/api/conversations/' + convQ + '/messages')).j.messages.filter(x => x.type === 'systeme').map(x => x.meta.k);
      v('… l\'hôte et Dan voient la liste SANS elle ; la conversation le dit (« a quitté la réunion ») — l\'hôte le VOIT', [statuts((await fiche(a, RQ)).j), statuts((await fiche(d, RQ)).j), sys], ['Ana:accepte Dan:attente', 'Ana:accepte Dan:attente', ['reunion_creee', 'membre_parti']]);
      await a.post('/api/reunions/' + RQ + '/modifier', { lieu: 'Sans Cleo' });
      v('… elle ne reçoit plus rien de cette réunion (la modification part à Dan seul) ; quitter une seconde fois : 404', [(await nots(c, RQ)).length, (await nots(d, RQ)).map(n => n.type), (await c.post('/api/reunions/' + RQ + '/quitter', {})).code], [0, ['reunion_modifiee'], 404]);
      const re = await a.post('/api/reunions/' + RQ + '/inviter', { uids: [cleo.id] });
      v('⛔ « Quitter » n\'est pas un blocage : l\'hôte peut réinviter Cleo, qui retrouve la réunion (en attente) et sa conversation', [re.code, re.j.ajoutes, (await fiche(c, RQ)).code, statuts((await fiche(c, RQ)).j), (await c.get('/api/conversations/' + convQ + '/messages')).code], [200, [cleo.id], 200, 'Ana:accepte Cleo:attente Dan:attente', 200]);
      const aAnnulee = await c.post('/api/reunions/' + RB + '/quitter', {});
      v('quitter une réunion ANNULÉE marche (c\'est la façon de la sortir de son agenda)', [aAnnulee.code, (await c.get('/api/reunions')).j.reunions.some(x => x.id === RB)], [200, false]);
    }

    /* ═══ 10 ter. LA FIN DE SÉRIE, ÉCRITE PAR LES ROUTES ═══════════════════════════════════════════════════════════════════════════════════════════════ */
    console.log('\nLa fin d\'une série est posée par les routes (création et changement d\'horaire) : de quoi écarter en SQL les séries terminées');
    {
      const fs = (id) => { const x = sql('SELECT fin_serie AS n FROM reunion WHERE id = ?', id).n; return x === null ? null : Number(x); };
      const seule = (await mk(a, {})).reunion.id;
      const quatre = (await mk(a, { repetition: 'hebdomadaire', n: 4 })).reunion.id;               // les lundis 26 octobre, 2, 9 et 16 novembre à 14:00 de Paris
      const jamais = (await mk(a, { repetition: 'hebdomadaire' })).reunion.id;
      const jusquau = (await mk(a, { repetition: 'quotidienne', jusqua: '2026-11-03' })).reunion.id;
      v('⛔ à la création : une réunion simple finit avec elle ; quatre lundis finissent après le dernier (le 16 novembre, 14:00 UTC à l\'heure d\'hiver, plus un jour de marge) ; « jusqu\'au 3 novembre » après le dernier jour ; « Jamais » n\'a pas de fin (NULL : toujours gardée)',
        [fs(seule), fs(quatre), fs(jusquau), fs(jamais)], [L26 + HEURE, Date.UTC(2026, 10, 16, 14, 0) + JOUR, Date.UTC(2026, 10, 3, 14, 0) + JOUR, null]);
      await a.post('/api/reunions/' + quatre + '/modifier', { lieu: 'Un autre lieu' });
      const apresLieu = fs(quatre);
      await a.post('/api/reunions/' + quatre + '/modifier', { n: 2 });
      v('⛔ un changement de LIEU ne touche pas la fin ; un changement de RÉPÉTITION la recalcule (deux lundis : le 2 novembre)', [apresLieu, fs(quatre)], [Date.UTC(2026, 10, 16, 14, 0) + JOUR, Date.UTC(2026, 10, 2, 14, 0) + JOUR]);
      await a.post('/api/reunions/' + jamais + '/modifier', { n: 3 });
      await a.post('/api/reunions/' + seule + '/modifier', { debut: '2026-10-27T10:00', fin: '2026-10-27T11:00' });
      v('… une série « Jamais » qui reçoit un nombre de répétitions en a une ; une réunion simple déplacée finit à sa nouvelle fin', [fs(jamais), fs(seule)], [Date.UTC(2026, 10, 9, 14, 0) + JOUR, Date.UTC(2026, 9, 27, 10, 0)]);
    }

    /* ═══ 11. SUPPRIMER ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════ */
    console.log('\nSupprimer : la réunion part avec sa conversation ; une réunion À VENIR prévient ses invités');
    {
      const R3 = await mk(a, { invites: [ben.id, cleo.id], notifier: false });
      v('Ben, invité, ne supprime pas : 403 ; une étrangère : 404 ; la réunion est intacte', [(await b.post('/api/reunions/' + R3.reunion.id + '/supprimer', {})).code, (await e.post('/api/reunions/' + R3.reunion.id + '/supprimer', {})).code, (await fiche(a, R3.reunion.id)).code], [403, 404, 200]);
      const s = await a.post('/api/reunions/' + R3.reunion.id + '/supprimer', {});
      v('supprimer : 200', [s.code, s.j], [200, { ok: true }]);
      v('⛔ la réunion n\'existe plus pour personne (l\'hôte non plus), ni sa conversation, ni son rang dans l\'agenda', [(await fiche(a, R3.reunion.id)).code, (await fiche(b, R3.reunion.id)).code, (await b.get('/api/conversations/' + R3.reunion.conv)).code, (await b.get('/api/conversations')).j.conversations.some(x => x.id === R3.reunion.conv), (await b.get('/api/reunions')).j.reunions.some(x => x.id === R3.reunion.id)], [404, 404, 404, false, false]);
      v('⛔ une réunion À VENIR que l\'hôte efface sans l\'avoir annulée : ses invités l\'apprennent (sinon elle disparaît de leur agenda sans un mot)', [(await nots(b, R3.reunion.id)).map(n => n.type), (await nots(c, R3.reunion.id)).map(n => n.type)], [['reunion_annulee'], ['reunion_annulee']]);
      v('supprimer deux fois : la seconde est un 404', (await a.post('/api/reunions/' + R3.reunion.id + '/supprimer', {})).code, 404);
      const R3b = await mk(a, { invites: [ben.id], notifier: false });
      await a.post('/api/reunions/' + R3b.reunion.id + '/supprimer', { notifier: false });
      v('« Notifier : non » : supprimée sans un mot (population : la précédente en avait dit un)', [(await nots(b, R3b.reunion.id)).length, (await fiche(a, R3b.reunion.id)).code], [0, 404]);
      const R3c = await mk(a, { invites: [ben.id], notifier: false });
      await a.post('/api/reunions/' + R3c.reunion.id + '/annuler', {});
      await a.post('/api/reunions/' + R3c.reunion.id + '/supprimer', {});
      v('annulée PUIS supprimée : un seul message (celui de l\'annulation), pas deux', (await nots(b, R3c.reunion.id)).map(n => n.type), ['reunion_annulee']);
      const R3d = await mk(a, { debut: '2026-10-18T10:00', fin: '2026-10-18T11:00', invites: [ben.id], notifier: false });
      v('population : cette réunion est PASSÉE (aucune occurrence à venir)', (await fiche(a, R3d.reunion.id)).j.prochaine, null);
      await a.post('/api/reunions/' + R3d.reunion.id + '/supprimer', {});
      v('une réunion passée s\'efface sans prévenir personne', (await nots(b, R3d.reunion.id)).length, 0);
      v('la suppression est NOTÉE au registre des effacements (l\'archive d\'avant ne la ressusciterait pas)', Number(sql(`SELECT COUNT(*) AS n FROM purge WHERE genre = 'conversation' AND objet = ?`, R3.reunion.conv).n), 1);
    }

    /* ═══ 12. LE FICHIER .ICS ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════ */
    console.log('\nLe fichier .ics : la série ou une occurrence, ses en-têtes, rien qui ne soit à la personne');
    {
      const TS = 'Revue; budget, "T3" \\ fin';
      const RS = (await mk(a, { titre: TS + '\r\nATTENDEE:intrus\r\nBEGIN:VEVENT', lieu: 'Salle 3', repetition: 'hebdomadaire', n: 4, invites: [ben.id, dan.id], rappels: [15, 60] })).reunion.id;
      await b.post('/api/reunions/' + RS + '/rappels', { rappels: [5] });
      const s = await b.get('/api/reunions/' + RS + '/ics?serie=1');
      const L = lignesIcs(s.txt);
      v('la série : 200, en `text/calendar`, jamais mise en cache', [s.code, s.h.get('content-type'), s.h.get('cache-control')], [200, 'text/calendar; charset=utf-8', 'no-store']);
      vrai('… TÉLÉCHARGÉE (attachment), sous un nom ASCII sûr : lettres minuscules, chiffres, tirets, `.ics` — jamais le titre brut', /^attachment; filename="reunion-[a-z0-9-]{1,40}\.ics"$/.test(s.h.get('content-disposition')));
      v('le fichier est un calendrier complet, aux fins de ligne CRLF', [L[0], L[L.length - 2], L[L.length - 1], /\r\n$/.test(s.txt), /[^\r]\n/.test(s.txt)], ['BEGIN:VCALENDAR', 'END:VCALENDAR', '', true, false]);
      v('l\'identifiant, la règle de répétition (quatre lundis), l\'heure LOCALE de Paris', [L.includes('UID:reunion-' + RS + '@' + ICS.DOMAINE), L.includes('RRULE:FREQ=WEEKLY;BYDAY=MO;COUNT=4'), L.includes('DTSTART;TZID=Europe/Paris:20261026T140000')], [true, true, true]);
      v('⛔ le titre est ÉCHAPPÉ (point-virgule, virgule, barre oblique) : une seule ligne SUMMARY, et le titre n\'a pas ouvert de ligne (aucun ATTENDEE, un seul VEVENT)', [L.filter(x => x.startsWith('SUMMARY:')).length, L.filter(x => x.startsWith('ATTENDEE')).length, L.filter(x => x === 'BEGIN:VEVENT').length, L.find(x => x.startsWith('SUMMARY:')) === 'SUMMARY:Revue\\; budget\\, "T3" \\\\ finATTENDEE:intrusBEGIN:VEVENT'], [1, 0, 1, true]);
      v('⛔ MES rappels (Ben : 5 minutes) sont ceux du fichier de Ben ; ceux de l\'hôte (15 minutes et 1 heure) ceux du sien', [L.filter(x => x.startsWith('TRIGGER:')), lignesIcs((await a.get('/api/reunions/' + RS + '/ics?serie=1')).txt).filter(x => x.startsWith('TRIGGER:'))], [['TRIGGER:-PT5M'], ['TRIGGER:-PT15M', 'TRIGGER:-PT1H']]);
      v('⛔ aucune adresse de courriel ni aucun nom de personne dans le fichier (le seul « @ » est celui de l\'identifiant)', [(s.txt.match(/@/g) || []).length, /Ana|Ben|Banc|mailto/.test(s.txt)], [1, false]);
      const occ = await b.get('/api/reunions/' + RS + '/ics?occurrence=' + Date.UTC(2026, 10, 2, 13, 0));
      const Lo = lignesIcs(occ.txt);
      v('une occurrence : un événement SEUL, en UTC, sans règle de répétition, à l\'identifiant propre', [Lo.filter(x => x === 'BEGIN:VEVENT').length, Lo.includes('DTSTART:20261102T130000Z'), Lo.some(x => x.startsWith('RRULE')), Lo.find(x => x.startsWith('UID:')).startsWith('UID:reunion-' + RS + '-20261102T130000Z@')], [1, true, false, true]);
      const plie = s.txt.split('\r\n').every(x => Buffer.byteLength(x, 'utf8') <= 75);
      vrai('aucune ligne ne dépasse 75 octets (pliage de la RFC 5545)', plie);
      const refus = [['une occurrence qui n\'en est pas une (une heure plus tard)', '?occurrence=' + Date.UTC(2026, 10, 2, 14, 0), 404, 'occurrence_inconnue'], ['une occurrence en texte', '?occurrence=abc', 400, 'champ_invalide'], ['`serie` ni 0 ni 1', '?serie=2', 400, 'champ_invalide']];
      for (const [nom, q, code, err] of refus) { const x = await b.get('/api/reunions/' + RS + '/ics' + q); v('refus : ' + nom, [x.code, x.j.error], [code, err]); }
      const dd = await d.get('/api/reunions/' + RS + '/ics');
      v('population : Dan (Perso, sans Pro) télécharge le fichier de la réunion où il est invité (200) — mais pas Eve (404)', [dd.code, (await e.get('/api/reunions/' + RS + '/ics')).code], [200, 404]);
      v('le fichier sans paramètre est celui de la série', lignesIcs(dd.txt).some(x => x.startsWith('RRULE:FREQ=WEEKLY')), true);
    }

    /* ═══ 13. LA CONVERSATION DE LA RÉUNION ═══════════════════════════════════════════════════════════════════════════════════════════════════ */
    console.log('\nLa conversation de la réunion : on y écrit comme dans un groupe — et les routes des GROUPES la refusent');
    {
      const w = await b.post('/api/conversations/' + CONV1 + '/messages', { cid: 'cid-r1-000001', texte: 'Je serai là' });
      const lues = (await a.get('/api/conversations/' + CONV1 + '/messages')).j.messages.filter(x => x.type === 'texte');
      v('un invité écrit dans la conversation de la réunion (201) et l\'hôte le lit', [w.code, lues.map(x => x.texte)], [201, ['Je serai là']]);
      v('⛔ une étrangère ne la lit pas, n\'y écrit pas (404)', [(await e.get('/api/conversations/' + CONV1 + '/messages')).code, (await e.post('/api/conversations/' + CONV1 + '/messages', { cid: 'cid-r1-000002', texte: 'intrus' })).code], [404, 404]);
      const avant = [statuts((await fiche(a, R1)).j), (await a.get('/api/conversations/' + CONV1)).j.conversation.membres_n];
      const groupes = [
        ['renommer (le titre est celui de la RÉUNION)', () => a.post('/api/conversations/' + CONV1 + '/maj', { nom: 'Autre nom' }), 400, 'champ_invalide'],
        ['ajouter des membres', () => a.post('/api/conversations/' + CONV1 + '/membres/ajouter', { uids: [eve.id] }), 409, 'conversation_directe'],
        ['retirer un membre', () => a.post('/api/conversations/' + CONV1 + '/membres/retirer', { uid: dan.id }), 409, 'conversation_directe'],
        ['promouvoir un administrateur', () => a.post('/api/conversations/' + CONV1 + '/admins', { uid: ben.id, admin: true }), 409, 'conversation_directe'],
        ['créer un lien d\'invitation', () => a.post('/api/conversations/' + CONV1 + '/lien', {}), 409, 'conversation_directe'],
        ['quitter (un invité se décline, il ne sort pas)', () => b.post('/api/conversations/' + CONV1 + '/quitter', {}), 409, 'reunion_quitter'],
      ];
      for (const [nom, geste, code, err] of groupes) { const x = await geste(); v('⛔ les routes des groupes : ' + nom + ' → ' + code + ' ' + err, [x.code, x.j.error], [code, err]); }
      v('… rien n\'a bougé (invités, membres, nom), et Ben est toujours dans la conversation', [statuts((await fiche(a, R1)).j), (await a.get('/api/conversations/' + CONV1)).j.conversation.membres_n, (await b.get('/api/conversations/' + CONV1)).code], [...avant, 200]);
    }

    /* ═══ 14. LE PUSH ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════ */
    console.log('\nLe push : l\'invitation et l\'annulation partent, la charge est minimale, la SOURDINE coupe une modification mais jamais une annulation');
    {
      const dev = (nom) => { const x = P.appareil(fps.endpoint(nom)); x.nom = nom; x.chemin = '/push/' + nom; x.lus = 0; return x; };
      const recus = (x) => fps.envois.filter(y => y.chemin === x.chemin);
      const charge = (x, y) => JSON.parse(P.dechiffrer(x, y.corps));
      const suivant = async (x) => { const i = x.lus; const ok = await T.attendre(() => recus(x).length > i, 8000, 10); if (!ok) return null; x.lus = i + 1; return charge(x, recus(x)[i]); };
      const A1 = dev('ana-1'), B1 = dev('ben-1'), C1 = dev('cleo-1');
      for (const [cli, ap] of [[a, A1], [b, B1], [c, C1]]) await cli.post('/api/push/abonner', { sub: ap.sub });
      v('population : trois appareils sont inscrits (Ana, Ben, Cleo)', [A1, B1, C1].map(x => Number(sql('SELECT COUNT(*) AS n FROM push WHERE uid = ?', { [A1.nom]: ana.id, [B1.nom]: ben.id, [C1.nom]: cleo.id }[x.nom]).n)), [1, 1, 1]);
      await c.post('/api/moi/maj', { prefs: { apercu_notif: true } });
      const T7 = 'Atelier ' + CANARI_T;
      const r7 = await mk(a, { titre: T7, debut: '2026-10-27T10:00', fin: '2026-10-27T11:00', invites: [ben.id, cleo.id] });
      const R7 = r7.reunion.id;
      const pb = await suivant(B1), pc = await suivant(C1);
      v('⛔ l\'invitation part à Ben avec la charge MINIMALE : rien du titre, de l\'heure ni de l\'hôte — il ne l\'a pas demandé', pb, { type: 'reunion', titre: 'OP MESSAGES', corps: 'Invitation à une réunion', tag: 'reunion:' + R7, url: '/#reunions/' + R7, renotify: false });
      v('… et à Cleo, qui a activé l\'aperçu, avec le titre et le texte — l\'heure DANS SON FUSEAU (mardi 27 octobre, 10:00 à Paris = 05:00 à New York)', [pc.titre, pc.corps], [T7, 'Ana Banc vous a invité à une réunion : mardi 27 octobre à 05:00.']);
      v('⛔ l\'hôte ne reçoit rien (population : Ben et Cleo ont chacun reçu la leur, par la même route)', [recus(A1).length, recus(B1).length, recus(C1).length], [0, 1, 1]);
      await b.post('/api/conversations/' + r7.reunion.conv + '/prefs', { muet_jusqua: ZERO + 30 * JOUR });
      const nBavant = (await nots(b, R7)).length;
      await a.post('/api/reunions/' + R7 + '/modifier', { lieu: 'Salle 9' });
      const pcm = await suivant(C1);
      v('Cleo reçoit la modification (aperçu activé : le titre et la phrase)', [pcm.titre, pcm.corps, pcm.tag], [T7, 'Ana Banc a modifié la réunion.', 'reunion:' + R7]);
      v('⛔ Ben a mis la conversation en SOURDINE : la modification ne lui arrive pas en push — mais la notification dans l\'application, si (population : Cleo l\'a reçue)', [recus(B1).length, (await nots(b, R7)).length - nBavant], [1, 1]);
      await a.post('/api/reunions/' + R7 + '/annuler', {});
      const pba = await suivant(B1), pca = await suivant(C1);
      v('⛔ l\'ANNULATION part même en sourdine (Ben : charge minimale « Réunion annulée ») — c\'est la seconde chose qu\'il reçoit, la modification n\'a pas été retenue pour plus tard', [pba.corps, recus(B1).length], ['Réunion annulée', 2]);
      v('… Cleo reçoit l\'annulation avec le titre et l\'heure dans son fuseau', [pca.titre, pca.corps], [T7, 'Ana Banc a annulé la réunion du mardi 27 octobre à 05:00.']);
      v('l\'hôte n\'a toujours rien reçu', recus(A1).length, 0);
      const r8 = await mk(a, { titre: 'Atelier supprimé', debut: '2026-10-28T10:00', fin: '2026-10-28T11:00', invites: [ben.id] });
      const pi8 = await suivant(B1);
      await a.post('/api/reunions/' + r8.reunion.id + '/supprimer', {});
      const ps8 = await suivant(B1);
      v('⛔ une réunion À VENIR supprimée sans avoir été annulée prévient Ben PAR PUSH aussi — « Réunion annulée » part bien que la réunion n\'existe plus à l\'instant d\'envoyer (la charge d\'une annulation n\'est pas re-jugée sur elle)', [pi8 && pi8.corps, ps8 && ps8.corps, ps8 && ps8.tag], ['Invitation à une réunion', 'Réunion annulée', 'reunion:' + r8.reunion.id]);
      for (const [cli, ap] of [[a, A1], [b, B1], [c, C1]]) await cli.post('/api/push/desabonner', { endpoint: ap.sub.endpoint });
      await c.post('/api/moi/maj', { prefs: { apercu_notif: false } });
    }

    /* ═══ 15. EN DIRECT ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════ */
    console.log('\nEn direct : chaque geste arrive aux AUTRES participants — jamais à un étranger — et se rejoue après une coupure');
    {
      const R9 = (await mk(a, { invites: [ben.id, cleo.id], notifier: false })).reunion;
      const fa = await T.flux(a), fb = await T.flux(b), fe = await T.flux(e); flux.push(fa, fb, fe);
      S.contactLier(fred.id, eve.id);
      const dm = await f.post('/api/conversations/directe', { uid: eve.id });
      await f.post('/api/conversations/' + dm.j.conversation.id + '/messages', { cid: 'cid-eve-000001', texte: 'coucou' });
      vrai('population : le flux d\'Eve est vivant (le message de Fred lui arrive) — son silence sur les réunions veut donc dire quelque chose', !!(await fe.attendre(x => x.event === 'message')));
      const gid0 = (await b.get('/api/sync')).j.gid;
      await c.post('/api/reunions/' + R9.id + '/reponse', { statut: 'decline' });
      const evA = await fa.attendre(x => x.event === 'reunion' && x.data.id === R9.id), evB = await fb.attendre(x => x.event === 'reunion' && x.data.id === R9.id);
      v('⛔ la réponse de Cleo arrive à Ana et à Ben EN DIRECT : un événement `reunion` qui ne dit que « relis » (identifiant, conversation, version — jamais la réponse elle-même)', [evA && Object.keys(evA.data).sort(), evB && evB.data.id, evA && evA.data.conv], [['conv', 'id', 'version'], R9.id, R9.conv]);
      await a.post('/api/reunions/' + R9.id + '/modifier', { lieu: 'Salle 12' });
      vrai('… la modification d\'Ana arrive à Ben (la version a monté)', !!(await fb.attendre(x => x.event === 'reunion' && x.data.id === R9.id && x.data.version >= 1)));
      await a.post('/api/reunions/' + R9.id + '/retirer', { uid: ben.id });
      const evR = await fb.attendre(x => x.event === 'reunion' && x.data.id === R9.id && x.data.supprime === true);
      v('⛔ Ben est retiré : il l\'apprend EN DIRECT par un événement ADRESSÉ (`supprime`) — sa copie de la fiche doit disparaître', evR && evR.data, { id: R9.id, supprime: true });
      v('⛔ pendant tout cela, Eve n\'a reçu AUCUN événement de réunion (population : elle en a reçu un autre)', [fe.evenements.filter(x => x.event === 'reunion').length, fe.evenements.some(x => x.event === 'message')], [0, true]);
      const rattrape = await b.get('/api/sync?depuis=' + gid0);
      const dernierB = (rattrape.j.evenements.filter(x => x.event === 'reunion').pop() || {}).data;
      v('⛔ après une coupure, la synchronisation rejoue ce que Ben a manqué — et le DERNIER mot est son retrait (`supprime`), pas la fiche d\'avant', [rattrape.j.resync, dernierB], [false, { id: R9.id, supprime: true }]);
      await a.post('/api/reunions/' + R9.id + '/supprimer', { notifier: false });
      const evS = await fa.attendre(x => x.event === 'reunion' && x.data.id === R9.id && x.data.supprime === true);
      vrai('… la suppression arrive à l\'hôte lui-même (sa copie de la fiche disparaît sur tous ses appareils)', !!evS);
      const dernierC = ((await c.get('/api/sync?depuis=0')).j.evenements.filter(x => x.event === 'reunion').pop() || {}).data;
      v('… et Cleo, qui n\'était pas connectée, l\'apprend par la synchronisation à sa prochaine ouverture', dernierC, { id: R9.id, supprime: true });
      for (const x of flux) x.fermer();
    }

    /* ═══ 16. L'EXPORT DES DONNÉES ════════════════════════════════════════════════════════════════════════════════════════════════════════════ */
    console.log('\nL\'export des données d\'une personne porte SES réunions — et celles-là seulement');
    {
      const ex = await b.post('/api/compte/export', {});
      const mes = Number(sql('SELECT COUNT(*) AS n FROM reunion_invite WHERE uid = ?', ben.id).n);
      const r1 = ex.j.reunions.find(x => x.id === R1);
      v('⛔ l\'export de Ben liste ses réunions : titre, lieu, rôle, réponse, fuseau — autant que de lignes d\'invitation (population non vide)', [ex.code, ex.j.reunions.length, ex.j.reunions.length > 5], [200, mes, true]);
      v('… R1 y est, avec le titre et le lieu EN CLAIR (ce sont les siens)', [r1.titre, r1.lieu, r1.role, r1.reponse, r1.fuseau, r1.debut], [T1, L1, 'invite', 'accepte', 'Europe/Paris', new Date(L26 + HEURE).toISOString()]);
      v('⛔ aucune réunion des autres (celles où Ben n\'est pas invité n\'y sont pas)', ex.j.reunions.every(x => Number(sql('SELECT COUNT(*) AS n FROM reunion_invite WHERE reunion = ? AND uid = ?', x.id, ben.id).n) === 1), true);
      const ee = await e.post('/api/compte/export', {});
      v('population : l\'export d\'Eve est le sien (200, son prénom) et ne porte aucune réunion', [ee.code, ee.j.profil.prenom, ee.j.reunions], [200, 'Eve', []]);
    }

    /* ═══ 17. LA VIE PRIVÉE ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════ */
    console.log('\nLa vie privée : ni titre ni lieu dans les journaux, ni en clair dans la base');
    {
      const fichiers = fs.readdirSync(svc.data).filter(x => /^msg\.db/.test(x)).map(x => fs.readFileSync(path.join(svc.data, x)));
      const dansBase = (motif) => fichiers.some(x => x.includes(Buffer.from(motif, 'utf8')));
      const j = svc.sortie.texte();
      vrai('population : le titre et le lieu sont bien dans les réponses du service (le banc les voit passer)', c1.j.reunion.titre.includes(CANARI_T) && c1.j.reunion.lieu.includes(CANARI_L));
      v('⛔ le journal du service ne porte ni le titre, ni le lieu, ni le nom de l\'entreprise', [j.includes(CANARI_T), j.includes(CANARI_L), j.includes('ENTREPRISE-WQXZ')], [false, false, false]);
      vrai('population : le journal est lu (le démarrage y est)', /demarre/.test(j));
      v('⛔ la base ne les porte pas en clair : le titre et le lieu d\'une réunion sont SCELLÉS (la notification, la conversation et le message d\'activité aussi)', [dansBase(CANARI_T), dansBase(CANARI_L)], [false, false]);
      vrai('population : le balayage de la base sait voir du texte en clair (le nom des tables est dans le fichier)', dansBase('reunion_invite'));
      const sante = (await T.client(svc.base).get('/health')).txt;
      v('/health ne dit ni titre ni identifiant de réunion', [sante.includes(CANARI_T), /r_[0-9a-f]{32}/.test(sante)], [false, false]);
    }

    /* ═══ 18. LE TEMPS PASSE : LA SÉRIE TRAVERSE LE 25 OCTOBRE ═════════════════════════════════════════════════════════════════════════════════════════ */
    console.log('\nLe temps passe : la prochaine occurrence d\'une série reste à 14:00 à Paris de part et d\'autre du retour à l\'heure d\'hiver');
    {
      const pro = async () => (await fiche(b, R5)).j.prochaine.debut;
      v('lundi 19 octobre 10:00 : la prochaine occurrence est celle de 14:00 (12:00 UTC, heure d\'été)', [await pro(), heureLocale(await pro(), 'Europe/Paris')], [Date.UTC(2026, 9, 19, 12, 0), '14:00']);
      avancer(4 * HEURE + 30 * MIN);   // 12:30 UTC : la première occurrence a COMMENCÉ
      v('⛔ 12:30 UTC : la première a commencé — la suivante est le lundi 26 à 13:00 UTC, toujours 14:00 À PARIS (et non 12:00 UTC : +7 × 24 h aurait dérivé d\'une heure)', [await pro(), heureLocale(await pro(), 'Europe/Paris')], [Date.UTC(2026, 9, 26, 13, 0), '14:00']);
      avancer(7 * JOUR);               // lundi 26 octobre, 12:30 UTC : le retour à l'heure d'hiver a eu lieu
      v('lundi 26, 12:30 UTC (13:30 à Paris, heure d\'hiver) : l\'occurrence de 14:00 n\'a pas commencé — c\'est elle', await pro(), Date.UTC(2026, 9, 26, 13, 0));
      avancer(HEURE);                  // 13:30 UTC : elle a commencé
      v('13:30 UTC : elle a commencé — la suivante est le lundi 2 novembre, 13:00 UTC (14:00 à Paris)', [await pro(), heureLocale(await pro(), 'Europe/Paris')], [Date.UTC(2026, 10, 2, 13, 0), '14:00']);
      const lst = (await b.get('/api/reunions')).j.reunions.find(x => x.id === R5);
      v('l\'agenda, vingt-sept jours après le début, montre les occurrences à venir de la série, à l\'heure de Paris', lst.occurrences.slice(0, 2).map(o => heureLocale(o.debut, 'Europe/Paris')), ['14:00', '14:00']);
      v('population : R1 (15:00 à Paris, soit 14:00 UTC) n\'a pas fini à 13:30 UTC — elle a encore une prochaine occurrence', (await fiche(a, R1)).j.prochaine, { debut: L26 + HEURE, fin: L26 + 2 * HEURE });
      avancer(2 * HEURE);              // 15:30 UTC : elle est finie
      v('15:30 UTC : R1 (non répétée) est passée — plus de prochaine occurrence, et elle paraît encore dans l\'agenda de la veille', [(await fiche(a, R1)).j.prochaine, (await a.get('/api/reunions')).j.reunions.some(x => x.id === R1)], [null, true]);
    }
  } catch (err) {
    console.log('  ✗ le banc a levé : ' + (err && err.stack || err)); process.exitCode = 1;
  } finally {
    for (const x of flux) { try { x.fermer(); } catch (z) { /* déjà fermé */ } }
    await M.fermer();
  }

  /* ═══ 19. LES PLAFONDS DE PRODUCTION (un second service, sans les relâchements du banc) ════════════════════════════════════════════════════════════════ */
  console.log('\nLes plafonds de production : 30 programmations par heure, 60 fichiers par minute, 300 réunions à venir par hôte');
  const Q = await monter({}, {});
  try {
    const { S, pers, cl, nReunions, avancer } = Q;
    const gil = pers('Gil'), hug = pers('Hug');
    const gi = cl(gil), hu = cl(hug);
    const corps = (extra) => Object.assign({ titre: 'Plafond', debut: '2027-01-11T10:00', fin: '2027-01-11T11:00', tz: 'Europe/Paris' }, extra || {});
    let derniere = null;
    for (let i = 0; i < 30; i++) { const r = await gi.post('/api/reunions', corps({ titre: 'P' + i })); if (r.code !== 201) throw new Error('la programmation ' + i + ' a été refusée : ' + r.code); derniere = r; }
    v('population : trente programmations en une heure passent (201), l\'instance bêta ouvre tout', [nReunions(), derniere.code], [30, 201]);
    const trente1 = await gi.post('/api/reunions', corps({ titre: 'Trop' }));
    v('⛔ la trente et unième : 429 `quota_atteint`, avec le délai à attendre (en-tête et corps), et rien de créé', [trente1.code, trente1.j.error, Number(trente1.h.get('retry-after')) > 0 && Number(trente1.h.get('retry-after')) <= 3600, trente1.j.retry === Number(trente1.h.get('retry-after')), nReunions()], [429, 'quota_atteint', true, true, 30]);
    const chez = await hu.post('/api/reunions', corps());
    v('… un autre hôte n\'est pas touché (le plafond est PAR PERSONNE)', chez.code, 201);
    avancer(61 * MIN);
    v('une heure après, il reprend', (await gi.post('/api/reunions', corps({ titre: 'Reprise' }))).code, 201);
    const RS = chez.j.reunion.id;
    let dernierIcs = null;
    for (let i = 0; i < 60; i++) { dernierIcs = await hu.get('/api/reunions/' + RS + '/ics'); if (dernierIcs.code !== 200) throw new Error('le fichier ' + i + ' a été refusé : ' + dernierIcs.code); }
    const ics61 = await hu.get('/api/reunions/' + RS + '/ics');
    v('⛔ soixante fichiers .ics en une minute passent (200) ; le soixante et unième : 429 `quota_atteint`', [dernierIcs.code, ics61.code, ics61.j.error, Number(ics61.h.get('retry-after')) > 0], [200, 429, 'quota_atteint', true]);
    avancer(61 * 1000);
    v('une minute après, le fichier se télécharge de nouveau', (await hu.get('/api/reunions/' + RS + '/ics')).code, 200);
    /* 300 réunions À VENIR par hôte : on les programme par lots de trente, une heure d'horloge entre deux (la « Reprise » de tout à l'heure compte dans l'heure en cours : on la laisse passer) */
    avancer(61 * MIN);
    const n0 = nReunions(), deja = Number(Q.sql(`SELECT COUNT(*) AS n FROM reunion WHERE hote = ? AND annulee = 0 AND prochain IS NOT NULL`, gil.id).n);
    let faites = 0;
    while (deja + faites < 300) {
      for (let i = 0; i < 30 && deja + faites < 300; i++, faites++) { const r = await gi.post('/api/reunions', corps({ titre: 'Lot ' + faites })); if (r.code !== 201) throw new Error('la réunion ' + (deja + faites) + ' a été refusée : ' + r.code + ' ' + JSON.stringify(r.j)); }
      avancer(61 * MIN);
    }
    v('population : Gil a EXACTEMENT 300 réunions à venir (' + deja + ' déjà là, ' + faites + ' ajoutées)', Number(Q.sql(`SELECT COUNT(*) AS n FROM reunion WHERE hote = ? AND annulee = 0 AND prochain IS NOT NULL`, gil.id).n), 300);
    const trop = await gi.post('/api/reunions', corps({ titre: 'La 301e' }));
    v('⛔ la trois cent unième : 409 `trop_de_reunions` (le code que la page sait dire), rien de créé', [trop.code, trop.j.error, nReunions()], [409, 'trop_de_reunions', n0 + faites]);
    const premiere = Q.sql(`SELECT id FROM reunion WHERE hote = ? ORDER BY cree LIMIT 1`, gil.id).id;
    await gi.post('/api/reunions/' + premiere + '/annuler', {});
    v('annuler une réunion libère une place : la suivante passe', (await gi.post('/api/reunions', corps({ titre: 'La 301e, après une annulation' }))).code, 201);
    /* VINGT modifications par réunion et par heure : l'hôte est Hug (Gil a atteint ses trois cents), l'invité Gil */
    Q.S.contactLier(hug.id, gil.id);
    const RM = (await hu.post('/api/reunions', corps({ titre: 'Modifiée', invites: [gil.id] }))).j.reunion.id;
    const notifsGil = async () => (await gi.get('/api/notifications')).j.notifications.filter(n => n.type === 'reunion_modifiee' && n.cible === RM);
    let dernierOk = null;
    for (let i = 0; i < 20; i++) { dernierOk = await hu.post('/api/reunions/' + RM + '/modifier', { lieu: 'Salle ' + i }); if (dernierOk.code !== 200) throw new Error('la modification ' + i + ' a été refusée : ' + dernierOk.code + ' ' + JSON.stringify(dernierOk.j)); }
    const version20 = dernierOk.j.reunion.version;
    v('population : vingt modifications d\'une réunion en une heure passent (200) — la dernière porte le lieu « Salle 19 »', [dernierOk.code, dernierOk.j.reunion.lieu, version20], [200, 'Salle 19', 20]);
    v('⛔ UNE SEULE notification non lue pour Gil malgré les vingt modifications : la dernière remplace les autres', [(await notifsGil()).length, (await notifsGil()).every(n => !n.lue)], [1, true]);
    const vingtEt1 = await hu.post('/api/reunions/' + RM + '/modifier', { lieu: 'Salle 20' });
    v('⛔ la vingt et unième : 429 `trop_de_modifications` (le code que la page sait dire), avec le délai à attendre (en-tête et corps)', [vingtEt1.code, vingtEt1.j.error, Number(vingtEt1.h.get('retry-after')) > 0 && Number(vingtEt1.h.get('retry-after')) <= 3600, vingtEt1.j.retry === Number(vingtEt1.h.get('retry-after'))], [429, 'trop_de_modifications', true, true]);
    const apresRefus = (await hu.get('/api/reunions/' + RM)).j;
    v('… et le refus n\'a RIEN écrit : même version, même lieu, même notification, une conversation qui compte vingt modifications et pas vingt et une',
      [apresRefus.reunion.version, apresRefus.reunion.lieu, (await notifsGil()).length, (await hu.get('/api/conversations/' + apresRefus.reunion.conv + '/messages')).j.messages.filter(x => x.type === 'systeme' && x.meta.k === 'reunion_modifiee').length], [version20, 'Salle 19', 1, 20]);
    v('… le plafond est PAR RÉUNION : une autre réunion du même hôte se modifie encore (200),', [(await hu.post('/api/reunions/' + RS + '/modifier', { lieu: 'Ailleurs' })).code], [200]);
    avancer(61 * MIN);
    v('une heure plus tard la réunion se modifie de nouveau (200)', (await hu.post('/api/reunions/' + RM + '/modifier', { lieu: 'Salle 21' })).code, 200);
  } catch (err) {
    console.log('  ✗ le second service a levé : ' + (err && err.stack || err)); process.exitCode = 1;
  } finally {
    await Q.fermer();
    await fps.fermer();
  }

  /* ═══ 20. LA RÉPARATION AU DÉMARRAGE ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════ */
  console.log('\nLa réparation au démarrage : un compte effacé par un code d\'AVANT laisse des réunions sans hôte — le service neuf les répare avant de servir, une seule fois');
  {
    const dossier = fs.mkdtempSync(path.join(os.tmpdir(), 'banc-973-rep-'));
    const cle = crypto.randomBytes(32).toString('hex');
    const port = await T.portLibre();
    const lire = (sql, ...p) => { const d = T.lireBase(path.join(dossier, 'data', 'msg.db')); try { return d.prepare(sql).get(...p); } finally { d.close(); } };
    let z = null;
    try {
      z = await T.lancerService({ dossier, cle, port });
      await z.arreter(false);                                    // la base existe, au dernier schéma ; le service est arrêté
      const chemin = path.join(dossier, 'data', 'msg.db');
      const W = ouvrir({ chemin, scelleur: creerScelleur(Buffer.from(cle, 'hex')) });
      const mkp = (nom) => W.personneCreer({ identifiant: 'beta:' + nom + crypto.randomBytes(3).toString('hex'), prenom: nom, nom: 'Banc', origine: 'beta', verifie: true });
      const [pa, pb, pc] = [mkp('Ana'), mkp('Ben'), mkp('Cleo')];
      const debut = Date.now() + 3 * JOUR;
      const mkr = (hote, titre, invites) => W.reunionCreer({ hote: hote.id, titre, lieu: '', debut, fin: debut + HEURE, tz: 'Europe/Paris', rep: 'aucune', n: null, jusqua: null, rappels: [15], invites, prochain: debut, finSerie: debut + HEURE });
      const r1 = mkr(pa, 'Avec successeur', [pb.id, pc.id]), r2 = mkr(pa, 'Sans successeur', []), r3 = mkr(pb, 'Chez Ben', [pa.id]);
      W.fermer();
      /* ce que ferait un code d'AVANT les réunions qui efface le compte d'Ana : le profil vidé et marqué supprimé — les lignes des réunions ne sont pas touchées (il ne les connaît pas) */
      const d = T.ouvrirBaseEcriture ? T.ouvrirBaseEcriture(chemin) : new (require('node:sqlite').DatabaseSync)(chemin);
      d.prepare(`UPDATE personne SET etat = 'supprime', prenom = '', nom = '' WHERE id = ?`).run(pa.id);
      d.prepare('UPDATE membre SET quitte_le = ? WHERE uid = ?').run(Date.now(), pa.id);
      d.close();
      v('population : Ana est effacée mais héberge deux réunions et est invitée à une troisième — trois traces dans les réunions', [Number(lire('SELECT COUNT(*) AS n FROM reunion WHERE hote = ?', pa.id).n), Number(lire('SELECT COUNT(*) AS n FROM reunion_invite WHERE uid = ?', pa.id).n)], [2, 3]);
      z = await T.lancerService({ dossier, cle, port });
      const sortie1 = z.sortie.texte();
      const ligne = sortie1.split('\n').filter(l => l.includes('"evt":"reunions_reparees"'));
      v('⛔ le service neuf répare AU DÉMARRAGE, avant de servir : la première réunion est à Ben (le plus ancien invité), la seconde — sans successeur — est partie avec sa conversation, Ana n\'est plus invitée à la troisième',
        [lire('SELECT hote AS n FROM reunion WHERE id = ?', r1.id).n === pb.id, Number(lire('SELECT COUNT(*) AS n FROM reunion WHERE id = ?', r2.id).n), Number(lire('SELECT COUNT(*) AS n FROM conversation WHERE id = ?', r2.conv).n), Number(lire('SELECT COUNT(*) AS n FROM reunion_invite WHERE uid = ?', pa.id).n), Number(lire('SELECT COUNT(*) AS n FROM reunion WHERE id = ?', r3.id).n)], [true, 0, 0, 0, 1]);
      v('… et le journal le DIT : une ligne, un nombre (une personne), ni identifiant ni nom', [ligne.length, ligne.length === 1 && JSON.parse(ligne[0]).n, ligne.join('').includes(pa.id), ligne.join('').includes('Ana')], [1, 1, false, false]);
      await z.arreter(false);
      z = await T.lancerService({ dossier, cle, port });
      v('⛔ un démarrage ordinaire n\'a rien à réparer et le DIT PAS : aucune seconde ligne, et la réunion réparée est toujours à Ben', [z.sortie.texte().includes('reunions_reparees'), lire('SELECT hote AS n FROM reunion WHERE id = ?', r1.id).n === pb.id], [false, true]);
    } finally {
      if (z) await z.arreter(false);
      try { fs.rmSync(dossier, { recursive: true, force: true }); } catch (e) { /* déjà parti */ }
    }
  }
  fin();
})().catch((err) => { console.log('  ✗ le banc a levé : ' + (err && err.stack || err)); process.exitCode = 1; fin(); });
