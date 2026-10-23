/* ⛔ CE QUE CE FICHIER GARDE — LES CONSTATS DE LA REVUE DU 23 OCTOBRE 2026 SUR LES AGENTS DE LA PLATEFORME QUI NE SONT PAS DES DÉCLENCHEURS FORGEABLES (ceux-là : `test-2928`).
     Les VRAIS modules assemblés (`agents-plateforme.js`), les routes rejouées avec leurs intergiciels :
       · RGPD, le côté ÉMISSION : personne ne déposait de tâche « escalade_humain / rgpd » — Justin enregistre la demande avec sa date de RÉCEPTION (`/rgpd/declarer`, patron seul) ; le délai
         d'un mois court depuis ce jour-là ; une date future, ancienne de plus de quatre mois, inexistante (31 février) ou mal écrite est refusée sans écrire ; le plafond de demandes ouvertes ;
         rien d'une personne n'entre ; la demande saisie est ACCUSÉE et RAPPELÉE comme celle qu'aurait déposée Camille ;
       · le relevé de la Tour porte `sauvegardes` pour de bon (c'était une promesse sérialisée en `{}`) ;
       · « Passer maintenant » : une liste FERMÉE (`constructor`, `__proto__`, `toString` étaient des « agents ») et Inès relit hors de sa fenêtre (le geste répondait « passée » sans rien relire) ;
       · Victor : quinze points forcés dans la journée n'effacent pas la clé du jour (le point du matin ne se redit pas) ;
       · Nina dit « identifiant verrouillé », pas « compte » (le serveur verrouille aussi un nom qui n'existe pas). */
const fs = require('fs'), path = require('path');
const { monter, SANTE_BONNE, S, RACINE } = require('./banc-plateforme');
let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + String(JSON.stringify(b)).slice(0, 500) + '\n      obtenu  : ' + String(JSON.stringify(a)).slice(0, 500)); } };
const vrai = (t, c, d) => v(t + (d !== undefined && !c ? ' — ' + String(d).slice(0, 300) : ''), !!c, true);
setTimeout(() => { console.log('  ✗ banc FIGÉ au-delà de 90 s'); process.exit(1); }, 90000).unref();
const PL = require(S('agents-plateforme.js'));
const O = require(S('plateforme-outils.js'));
const JOUR = 86400000, MIN = 60000;

function assemble(o) {
  o = o || {};
  const B = monter(Object.assign({ mode: 'brouillon', claude: () => 'Diagnostic du banc.' }, o));
  const sante = { j: SANTE_BONNE() };
  const sv = { derniere: { ok: true, ts: B.horloge.t, motif: '', octets: 1 }, histo: [] };
  const P = PL(B.app, { agents: B.agents, conversations: B.conversations, cerveau: B.cerveau, fichier: B.fichier, monAdmin: (req, res, next) => (req.tourUser ? next() : res.status(401).json({ error: 'non connecté' })),
    monPatronStrict: (req, res, next) => (req.tourUser && req.tourUser.role === 'patron' ? next() : res.status(403).json({ error: 'réservé au patron' })), maintenant: B.maintenant,
    issues: () => B.issues, sauverIssues: () => {}, sante: async () => JSON.parse(JSON.stringify(sante.j)), sauvegarde: { etat: () => sv }, conservation: { sante: () => ({ suivis: 4, enPreavis: 0, echus: 0, jours: 730, jamaisAbonnes: 0, balayageOk: true }) },
    contrats: { etat: () => ({ enAttente: 0, plusVieuxJours: 0, paquetsBloques: 0, paquetsTotal: 6, piecesAConfirmer: 0, envoyes: 0, acceptes: 0, total: 0 }) }, securite: () => ({ verrousTour: 0, verrousPortail: 0, clesInvalides: 0 }),
    courriels: () => [], courrier: () => ({ aTraiter: 0, enCours: 0 }), clients: () => ({ demandesEnAttente: 0 }) });
  return Object.assign(B, { P, sante });
}
const R = (B, chemin, body, qui) => B.appeler('POST /api/monitor/agents/plateforme/' + chemin, { tourUser: qui || B.PATRON, body });
const jourIso = (B, avant) => O.parisParties(B.horloge.t - avant * JOUR).date;

console.log('\n── 2929 · la revue de la plateforme : l\'amont du RGPD et les petits défauts ──');
(async () => {
  console.log('\n1. RGPD : Justin enregistre la demande avec sa date de réception');
  {
    const B = assemble();
    const r = await R(B, 'rgpd/declarer', { recu: jourIso(B, 10) });
    const g = B.P.nina.rgpd();
    v('une demande reçue il y a dix jours : 200, UNE demande ouverte, le délai court depuis la RÉCEPTION (une vingtaine de jours, pas un mois plein)', [r.status, r.corps.ok, g.length, g[0] && g[0].joursRestants >= 19 && g[0].joursRestants <= 22, g[0] && g[0].accusee], [200, true, 1, true, false]);
    vrai('rien d\'une personne dans la mémoire : une référence, un expéditeur « justin », deux dates, un statut', (() => { const m = B.P.etat.agent('nina').rgpd[0]; return Object.keys(m).sort().join() === 'accuse,de,fil,id,limite,rappels,recu,statut' && m.de === 'justin' && /^saisie-/.test(m.fil); })());
    await B.P.nina.passer();
    vrai('⛔ Nina l\'ACCUSE à son passage (« Équipe » + son fil privé) comme celle d\'une tâche de Camille', B.P.nina.rgpd()[0].accusee === true && B.fil('equipe').some(m => m.de === 'nina' && /demande d’exercice de droits/.test(m.texte)) && B.fil('nina').some(m => m.de === 'nina' && /Le délai légal est d’un mois/.test(m.texte)), JSON.stringify([B.fil('equipe').map(m => m.texte), B.fil('nina').map(m => m.texte)]));
    B.avancer(11 * JOUR); await B.P.nina.passer();
    vrai('…et la RAPPELLE à J-10 (le délai court depuis le jour de réception)', B.fichierJson('agents-messages.json').some(m => m.de === 'nina' && m.fil === 'nina' && /^Rappel RGPD : il reste/.test(m.texte)), JSON.stringify(B.fichierJson('agents-messages.json').filter(m => m.fil === 'nina').map(m => m.texte.slice(0, 50))));
    v('⛔ le journal des agents note la saisie, sans date ni personne', B.journal().filter(e => e.action === 'demande RGPD saisie').map(e => [e.resultat, e.qui]), [['ok', 'Justin']]);
    B.nettoyer();
  }
  {
    const B = assemble();
    const refus = async corps => { const r = await R(B, 'rgpd/declarer', corps); return [r.status, r.corps.error]; };
    v('⛔ une date dans le futur : 400, rien d\'écrit', [await refus({ recu: jourIso(B, -3) }), B.P.nina.rgpd().length], [[400, 'La date de réception est dans le futur'], 0]);
    v('…de plus de quatre mois (la faute de frappe d\'année) : 400', await refus({ recu: jourIso(B, 130) }), [400, 'La date de réception remonte à plus de quatre mois : vérifie l’année']);
    v('…une date qui n\'existe pas, mal écrite ou absente : 400', [await refus({ recu: '2026-02-31' }), await refus({ recu: '23/10/2026' }), await refus({}), await refus({ recu: 20261023 }), await refus({ recu: '2026-13-01' })].map(x => x[0]), [400, 400, 400, 400, 400]);
    v('…aucune n\'a écrit', B.P.nina.rgpd().length, 0);
    v('⛔ réservé au patron : un collaborateur est refusé', [(await R(B, 'rgpd/declarer', { recu: jourIso(B, 1) }, B.COLLAB)).status, (await B.appeler('POST /api/monitor/agents/plateforme/rgpd/declarer', { body: { recu: jourIso(B, 1) } })).status], [403, 403]);
    v('aujourd\'hui est accepté (la date vaut minuit à Paris : saisir le jour même, tôt le matin, n\'est pas « le futur »)', (await R(B, 'rgpd/declarer', { recu: jourIso(B, 0) })).status, 200);
    let dernier = 0; for (let k = 0; k < 60; k++) dernier = (await R(B, 'rgpd/declarer', { recu: jourIso(B, 1) })).status;
    v('⛔ le plafond de demandes ouvertes (50) : 409 avec sa phrase, pas une mémoire qui grossit sans fin', [dernier, B.P.nina.rgpd().length, (await R(B, 'rgpd/declarer', { recu: jourIso(B, 1) })).corps.error], [409, 50, 'Trop de demandes ouvertes : marque des demandes traitées d’abord']);
    B.nettoyer();
  }
  {
    const B = assemble({ avant: D => fs.writeFileSync(path.join(D, 'agents-plateforme.json'), '{ pas du json') });
    const r = await R(B, 'rgpd/declarer', { recu: jourIso(B, 1) });
    v('⛔ une mémoire ILLISIBLE : 503, rien n\'est réécrit par-dessus (on ne perd pas une demande en silence)', [r.status, r.corps.error], [503, 'Demande non enregistrée']);
    B.nettoyer();
  }

  console.log('\n2. Le relevé de la Tour : « sauvegardes » est un vrai relevé');
  {
    const B = assemble();
    const rel = (await B.appeler('GET /api/monitor/agents/plateforme', { tourUser: B.PATRON })).corps;
    vrai('⛔ `sauvegardes` porte les champs de Théo (c\'était `{}` : une promesse sérialisée)', rel.sauvegardes && rel.sauvegardes.active === true && rel.sauvegardes.ok === true && typeof rel.sauvegardes.tentativesRecentes === 'number', JSON.stringify(rel.sauvegardes));
    B.sante.j = null;
    const rel2 = (await B.appeler('GET /api/monitor/agents/plateforme', { tourUser: B.PATRON })).corps;
    v('…une santé illisible : `null` (on ne sait pas), jamais un objet vide, et la route répond quand même', [rel2.ok, rel2.sauvegardes], [true, null]);
    B.nettoyer();
  }

  console.log('\n3. « Passer maintenant » : une liste fermée, et Inès relit');
  {
    const B = assemble();
    const mauvais = [];
    for (const a of ['constructor', '__proto__', 'toString', 'hasOwnProperty', 'valueOf', 'hugo', '', 42, null, ['max']]) { const r = await R(B, 'passer', { agent: a }); if (r.status !== 400) mauvais.push([a, r.status]); }
    v('⛔ un nom hérité de l\'objet (`constructor`, `__proto__`…) ou hors liste : 400 — pas un 500 sur une propriété héritée', mauvais, []);
    B.heure(7, 30);                       // 9 h 30 à Paris : avant l'heure de la relecture
    await R(B, 'passer', { agent: 'ines' });
    const dedans = B.P.ines.etat();
    vrai('⛔ Inès, hors de sa fenêtre : le geste de la Tour la FAIT relire (sinon « Inès est passée » sans rien relire)', dedans.relu !== '' && dedans.relu !== undefined && dedans.relu !== null, JSON.stringify(dedans));
    const encore = await R(B, 'passer', { agent: 'ines' });
    v('…et le geste est répété sans refus (« Passer maintenant » est une demande, pas le passage du jour)', [encore.status, encore.corps.ok], [200, true]);
    B.nettoyer();
  }

  console.log('\n4. Victor : le point du matin ne se redit pas après quinze points forcés');
  {
    const B = assemble();
    B.heure(5, 0);                                     // 7 h à Paris, vendredi 23 octobre
    const forcer = async n => { for (let k = 0; k < n; k++) { B.avancer(20 * MIN); await B.P.victor.pointDuMatin({ forcer: true }); } };      // 20 minutes d'écart : le plafond d'heure de la messagerie n'en refuse aucun
    await forcer(16);
    const cles = () => Object.keys(B.P.etat.agent('victor').points || {});
    vrai('(population) seize points forcés, la mémoire n\'en garde que cinq', cles().length === 5 && cles().every(k => /^manuel:/.test(k)), cles().join());
    vrai('(population) …et aucun n\'est resté « à redire » : les seize ont été dits (« doublon » compte : le même texte n\'est écrit qu\'une fois par jour)', Object.values(B.P.etat.agent('victor').points).every(e => e.statut === 'fait'), JSON.stringify(Object.values(B.P.etat.agent('victor').points).map(e => e.statut)));
    B.avancer(20 * MIN);
    const matin = await B.P.victor.pointDuMatin({});
    const jour = O.jourParis(B.horloge.t);
    vrai('le point du MATIN (clé du jour) est dit une fois', matin.dit === true && !!B.P.etat.agent('victor').points[jour], JSON.stringify([matin, cles()]));
    await forcer(16);
    const n2 = B.fil('equipe').filter(m => m.de === 'victor').length;
    vrai('(population) …les seize de plus ont bien été dits, et la mémoire reste bornée (5 forcés + les jours)', Object.values(B.P.etat.agent('victor').points).every(e => e.statut === 'fait') && cles().length === 6, cles().join());
    vrai('⛔ …la clé du jour n\'a pas été élaguée par eux (« manuel:<ts> » se range APRÈS « 2026-10-23 » dans l\'ordre des noms)', !!B.P.etat.agent('victor').points[jour], cles().join());
    B.avancer(20 * MIN); const r = await B.P.victor.pointDuMatin({});
    v('…donc le point du matin ne se redit pas', [r.saute, B.fil('equipe').filter(m => m.de === 'victor').length], ['deja', n2]);
    B.nettoyer();
  }

  console.log('\n5. Nina : « identifiant », pas « compte »');
  {
    const t = O.cap(require(S('plateforme-regles.js')).texteDe('verrou_tour', { comptes: 2 }));
    v('le verrou de la Tour se dit au pluriel et sans prétendre que ces noms sont des comptes', t, '2 identifiants de connexion à la Tour (ou à la bêta) verrouillés quinze minutes après cinq échecs d’affilée');
  }
  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.log('  ✗ ' + (e && e.stack || e)); process.exit(1); });
