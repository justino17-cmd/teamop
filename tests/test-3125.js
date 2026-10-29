/* ⛔ CE QUE CE FICHIER GARDE — « DE 8 H À MINUIT, TOUS LES JOURS » ET LA MAINTENANCE DE NUIT (28 octobre 2026, 21 h 15).
     Justin : « Les agents, maintenant, ils vont travailler de 8 h à minuit. Plus simple pour moi de pouvoir tout gérer. Et je veux des agents qui travaillent la nuit aussi en maintenance. Un agent dans
     chaque catégorie qui travaille en maintenance. »
   Les VRAIS modules (`agents-horaires.js`, `agents.js`, `agent-equipe.js`, `agent-camille.js`), à l'heure de Paris, aux instants écrits EN UTC À LA MAIN (l'heure d'hiver court depuis le 25 octobre : Paris = UTC + 1).
       1. le DÉFAUT du code : sept jours ouverts 8 h – 24 h, fériés compris (`feries: false`), un agent d'astreinte par COUCHE du registre (Plateforme en compte deux), permanence du week-end éteinte
          mais intacte (sa forme, sa validation, sa rotation) ;
       2. le calendrier : ouvert lundi 8 h, mardi 23 h 59, samedi midi, le 11 novembre (férié) à 10 h, le 14 juillet en été ; fermé à 0 h 30 et 7 h 59 ; le dimanche de 25 heures ;
       3. la nuit (3 h) : chacun des six agents de l'astreinte AGIT et le dit (`horsHeures`), tous les autres sont `hors_heures` ; aux heures ouvrées, personne n'est « hors heures » ;
       4. le modèle est PRÉVENU : `consigneNuit` (agents.js) et le prompt réel envoyé à Claude (agent-equipe.js) — la nuit seulement, et pour l'astreinte seulement ;
       5. Camille la nuit : elle ne lit ni ne répond (un brouillon refusé après un « vu » perdrait la réponse) — le courriel est mis de côté et repris le matin ;
       6. LA MIGRATION UNIQUE : un registre d'avant (9 h – 18 h, lundi – vendredi, Max et Théo, horaires de Lola) est migré UNE fois — Lola gardée, journal, écriture atomique — puis jamais plus, ni au deuxième
          chargement ni après un réglage de Justin ; un registre illisible n'est JAMAIS réécrit ni migré ; un registre absent reste absent ;
       7. la Tour : la lecture ne change pas de contrat, une écriture qui renvoie `regle` ne la fait pas redescendre, la migration est au journal de la Tour. */
'use strict';
const fs = require('fs'), os = require('os'), path = require('path');
const RACINE = path.join(__dirname, '..');
const S = f => path.join(RACINE, 'server', f);
let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + String(JSON.stringify(b)).slice(0, 500) + '\n      obtenu  : ' + String(JSON.stringify(a)).slice(0, 500)); } };
const vrai = (t, c, d) => v(t + (!c && d !== undefined ? ' — ' + String(d).slice(0, 300) : ''), !!c, true);
const U = (a, m, j, h, mi) => Date.UTC(a, m - 1, j, h, mi || 0);                    // un instant UTC, mois de 1 à 12
setTimeout(() => { console.log('  ✗ banc FIGÉ au-delà de 150 s'); console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); process.exit(1); }, 150000).unref();

const HOR = require(S('agents-horaires.js'));
const AG = require(S('agents.js'));
const BH = require('./banc-horaires.js');
const REG = AG.AGENTS.map(a => a.id);
const coucheDe = id => AG.AGENTS.find(a => a.id === id).couche;
const racinesTmp = [];
const dossier = () => { const d = fs.mkdtempSync(path.join(os.tmpdir(), 'b3125-')); racinesTmp.push(d); return d; };
process.on('exit', () => racinesTmp.forEach(d => { try { fs.rmSync(d, { recursive: true, force: true }); } catch (e) {} }));
const F = 'agents-horaires.json';
const lire = D => { try { return fs.readFileSync(path.join(D, F), 'utf8'); } catch (e) { return null; } };
/* le journal du serveur (console.log) pendant `fn` */
function captureJournal(fn) {
  const vieux = console.log, lignes = [];
  console.log = (...a) => { lignes.push(a.join(' ')); };
  try { return { r: fn(), lignes }; } finally { console.log = vieux; }
}
const ASTREINTE_ATTENDUE = ['ines', 'camille', 'max', 'theo', 'louis', 'noah'];

/* le registre qu'un Justin d'AVANT le 28 octobre a laissé sur le VPS : 9 h – 18 h, lundi – vendredi, fériés fermés, Max et Théo, Lola travaille le samedi matin, permanence réglée à sa main */
const registreAvant = () => {
  const r = BH.ancien(); delete r.regle;
  r.parAgent = { lola: { jours: [null, null, null, null, null, { ouvert: true, debut: '09:00', fin: '12:00' }, null] } };
  r.permanence = { actif: true, agents: ['camille', 'hugo', 'lea'], piliers: ['hugo'], debut: '10:00', fin: '17:00' };
  r.ouvertJusqua = U(2026, 10, 28, 21);      // « ouvrir maintenant » de ce soir : il est gardé tel quel (et ne pèse que jusqu'à son heure)
  r.maj = { ts: 1700000000000, par: 'Justin' };
  return r;
};

console.log('\n── 3125 · de 8 h à minuit, tous les jours — et la maintenance de nuit ──');
(async () => {
  console.log('\n1. Le défaut du code');
  {
    const d = HOR.defaut();
    v('la règle courante est portée par le défaut', [HOR.REGLE, d.regle], [1, 1]);
    v('(population) sept jours, tous ouverts de 08:00 à 24:00', [d.entreprise.jours.length, d.entreprise.jours.every(j => j.ouvert === true && j.debut === '08:00' && j.fin === '24:00')], [7, true]);
    v('⛔ « feries: false » : les jours fériés NE ferment PAS (true les fermerait — le sens du champ)', d.entreprise.feries, false);
    v('l’astreinte par défaut : Inès, Camille, Max, Théo, Louis, Noah', d.astreinte, ASTREINTE_ATTENDUE);
    v('…et c’est la constante exportée', HOR.ASTREINTE_DEFAUT, ASTREINTE_ATTENDUE);
    const couches = {}; for (const id of d.astreinte) couches[coucheDe(id)] = (couches[coucheDe(id)] || 0) + 1;
    v('⛔ UN agent par couche du registre — Plateforme en compte deux (Max la sentinelle, Théo les sauvegardes de nuit)', couches, { Coordination: 1, Clients: 1, Plateforme: 2, Produit: 1, Croissance: 1 });
    v('(population) le registre a bien ces cinq couches, et pas d’autre', [...new Set(AG.AGENTS.map(a => a.couche))].sort(), ['Clients', 'Coordination', 'Croissance', 'Plateforme', 'Produit']);
    v('Jules (maintenance dev) est de la couche Plateforme, déjà servie : il ne veille pas', [coucheDe('jules'), d.astreinte.includes('jules')], ['Plateforme', false]);
    v('la permanence du week-end est ÉTEINTE par défaut — sa forme est intacte (agents, piliers, heures)', [d.permanence.actif, d.permanence.agents, d.permanence.piliers, d.permanence.debut, d.permanence.fin], [false, ['camille', 'hugo', 'margaux', 'lea'], ['camille', 'hugo'], '09:00', '18:00']);
    const D = dossier(), h = HOR({ DATA_DIR: D });
    v('un registre ABSENT : le défaut, et RIEN n’est écrit sur le disque', [lire(D), h.config().entreprise.jours[6].fin, h.config().regle], [null, '24:00', 1]);
    const samedi = U(2026, 10, 31, 11);
    v('permanence éteinte : personne n’est « de garde » ce week-end (tout le monde travaille déjà)', [HOR.deGarde(h.config().permanence, HOR.parisParties(samedi)), h.vue(samedi).permanence.ceWeekEnd.agents], [[], []]);
    /* la validation de la permanence est intacte : on peut la RALLUMER, et la rotation joue */
    const r = h.appliquer({ permanence: { actif: true, agents: ['camille', 'hugo', 'margaux', 'lea'], piliers: ['camille', 'hugo'], debut: '09:00', fin: '18:00' } });
    vrai('…rallumée par Justin, la permanence est acceptée par la validation', r.cfg && r.cfg.permanence.actif === true, JSON.stringify(r));
    v('…et sa rotation rend de nouveau un binôme (31 octobre)', HOR.deGarde(r.cfg.permanence, HOR.parisParties(samedi)), ['camille', 'hugo']);
    v('…une permanence mal formée est refusée comme avant', (h.appliquer({ permanence: { actif: true, agents: ['camille'], piliers: [], debut: '09:00', fin: '18:00' } })).erreur, 'permanence : au moins deux agents dans la rotation');
  }

  console.log('\n2. Le calendrier de Paris (instants UTC écrits à la main ; heure d’hiver = UTC + 1 depuis le 25 octobre)');
  {
    const h = HOR({ DATA_DIR: dossier() });
    const ouv = (ts, id) => h.etatA(ts, id || null).ouvert;
    v('lundi 26 octobre : 07:59 Paris fermé (06:59 UTC), 08:00 Paris ouvert (07:00 UTC)', [ouv(U(2026, 10, 26, 6, 59)), ouv(U(2026, 10, 26, 7))], [false, true]);
    v('mardi 27 octobre 23:59 Paris (22:59 UTC) : ouvert', ouv(U(2026, 10, 27, 22, 59)), true);
    v('…et minuit pile (23:00 UTC) : fermé — la fenêtre finit à 24:00, elle ne reprend qu’à 8 h', [ouv(U(2026, 10, 27, 23)), h.etatA(U(2026, 10, 27, 23), null).raison], [false, 'hors_heures']);
    v('0 h 30 Paris (mercredi 28, 23:30 UTC le mardi) : fermé', ouv(U(2026, 10, 27, 23, 30)), false);
    v('7 h 59 Paris (mercredi 28, 06:59 UTC) : fermé', ouv(U(2026, 10, 28, 6, 59)), false);
    v('la réouverture annoncée à minuit passé est 8 h : mercredi 28 octobre à 8 h (07:00 UTC)', [h.etatA(U(2026, 10, 27, 23, 30), null).prochaineOuverture, h.libelle(h.etatA(U(2026, 10, 27, 23, 30), null).prochaineOuverture)], [U(2026, 10, 28, 7), 'mercredi 28 octobre à 8 h']);
    v('samedi 31 octobre, midi Paris (11:00 UTC) : ouvert, « heures_ouvrees » — plus de jour fermé', [ouv(U(2026, 10, 31, 11)), h.etatA(U(2026, 10, 31, 11), null).raison], [true, 'heures_ouvrees']);
    v('dimanche 1er novembre (Toussaint, férié) 10 h Paris : ouvert', [ouv(U(2026, 11, 1, 9)), h.etatA(U(2026, 11, 1, 9), null).raison], [true, 'heures_ouvrees']);
    v('⛔ mercredi 11 novembre 2026 (Armistice, férié) 10 h Paris (09:00 UTC) : OUVERT — les fériés ne ferment plus', [h.ferieDe(HOR.parisParties(U(2026, 11, 11, 9))), ouv(U(2026, 11, 11, 9)), h.etatA(U(2026, 11, 11, 9), null).raison], ['Armistice 1918', true, 'heures_ouvrees']);
    v('…et une fois en été : le 14 juillet 2026, 10 h Paris (08:00 UTC, CEST), ouvert ; 7 h 59 (05:59 UTC) fermé, 8 h (06:00 UTC) ouvert', [ouv(U(2026, 7, 14, 8)), ouv(U(2026, 7, 14, 5, 59)), ouv(U(2026, 7, 14, 6))], [true, false, true]);
    v('Noël (vendredi 25 décembre 2026, 10 h Paris = 09:00 UTC) : ouvert', ouv(U(2026, 12, 25, 9)), true);
    /* le dimanche 25 octobre 2026 a duré 25 heures : ouvert de 8 h CET (07:00 UTC) à 24 h CET (23:00 UTC) */
    v('⛔ le dimanche de 25 heures (25 octobre) : 06:59 UTC fermé, 07:00 UTC ouvert (8 h CET), 22:59 UTC ouvert, 23:00 UTC fermé (minuit CET)', [ouv(U(2026, 10, 25, 6, 59)), ouv(U(2026, 10, 25, 7)), ouv(U(2026, 10, 25, 22, 59)), ouv(U(2026, 10, 25, 23))], [false, true, true, false]);
    v('…et la nuit de PRINTEMPS (28 mars 2027, 23 heures) : ouvert dès 8 h CEST (06:00 UTC), pas à 07:00 UTC', [ouv(U(2027, 3, 28, 5, 59)), ouv(U(2027, 3, 28, 6))], [false, true]);
    v('le temps où l’équipe a pu travailler, lundi 26 octobre 8 h → mardi 27 octobre 8 h (CET) : seize heures, plus vingt-quatre', h.tempsOuvert('lea', U(2026, 10, 26, 7), U(2026, 10, 27, 7)), 16 * 3600000);
  }

  console.log('\n3. La nuit (3 h Paris, mardi 27 octobre) : l’astreinte agit et le dit, les autres sont hors heures');
  {
    const h = HOR({ DATA_DIR: dossier() }), nuit = U(2026, 10, 27, 2), jour = U(2026, 10, 27, 9);
    for (const id of ASTREINTE_ATTENDUE) v('⛔ ' + id + ' (' + coucheDe(id) + ') : agit, hors heures, d’astreinte', h.peutAgir(id, nuit), { ok: true, horsHeures: true, astreinte: true });
    const autres = REG.filter(id => !ASTREINTE_ATTENDUE.includes(id));
    v('(population) dix agents hors de l’astreinte', autres.length, 10);
    v('⛔ Léa, Hugo, Margaux — et les sept autres — sont « hors_heures » : ils n’agissent pas', autres.map(id => h.peutAgir(id, nuit).raison + ':' + h.peutAgir(id, nuit).ok), autres.map(() => 'hors_heures:false'));
    v('…avec la prochaine ouverture : 8 h (07:00 UTC) ce matin', h.peutAgir('lea', nuit).prochaineOuverture, U(2026, 10, 27, 7));
    v('à 10 h Paris (09:00 UTC) : les seize agents agissent, aucun « hors heures »', REG.map(id => h.peutAgir(id, jour)).every(p => p.ok === true && p.horsHeures === false), true);
    v('la vue de la Tour la nuit : l’astreinte « agit » sans être « ouverte », les autres ni l’un ni l’autre', [h.vue(nuit).agents.camille, h.vue(nuit).agents.lea].map(a => [a.ouvert, a.agit, a.astreinte]), [[false, true, true], [false, false, false]]);
  }

  console.log('\n4. Le modèle est PRÉVENU : la nuit, de la maintenance — jamais d’écriture à un client, d’argent ni d’accès');
  {
    const D = dossier(); fs.writeFileSync(path.join(D, F), JSON.stringify(HOR.defaut()));
    fs.writeFileSync(path.join(D, 'agents-etat.json'), JSON.stringify({ pause: { actif: false, par: '', depuis: 0, motif: '' }, modes: Object.fromEntries(REG.map(id => [id, 'brouillon'])) }));
    const horloge = { t: U(2026, 10, 27, 2) };
    const app = { get() {}, post() {}, use() {} };
    const ag = AG(app, { DATA_DIR: D, monAdmin() {}, monPatronStrict() {}, maintenant: () => horloge.t, pousseNotif: async () => 0, cerveaux: [], cleCerveauPosee: true, horaires: HOR({ DATA_DIR: D }) });
    const c = ag.consigneNuit('camille');
    vrai('3 h : Camille reçoit la consigne de MAINTENANCE DE NUIT', /MAINTENANCE DE NUIT/.test(c), c);
    vrai('…qui dit : surveiller, vérifier, préparer, noter', /surveiller, vérifier, préparer, noter/.test(c));
    vrai('…prévenir Justin seulement si c’est URGENT', /ne préviens Justin que si c’est URGENT/.test(c));
    vrai('…n’écrire à AUCUN client, aucun geste d’argent ni d’accès', /AUCUN client/.test(c) && /AUCUN geste d’argent ni d’accès/.test(c));
    vrai('…et dit quand l’équipe rouvre (mardi 27 octobre à 8 h)', /mardi 27 octobre à 8 h/.test(c), c);
    vrai('(population) les six de l’astreinte la reçoivent', ASTREINTE_ATTENDUE.every(id => /MAINTENANCE DE NUIT/.test(ag.consigneNuit(id))));
    v('⛔ Léa, hors heures et hors astreinte, n’en reçoit pas (elle ne parle même pas)', [ag.consigneNuit('lea'), ag.consigneNuit('victor')], ['', '']);
    horloge.t = U(2026, 10, 27, 9);
    v('10 h : personne n’en reçoit — c’est le jour', ASTREINTE_ATTENDUE.map(id => ag.consigneNuit(id)), ASTREINTE_ATTENDUE.map(() => ''));
    v('un agent inconnu : vide, sans jeter', ag.consigneNuit('pirate'), '');
    /* le prompt RÉEL envoyé à Claude, par le vrai `agent-equipe.js` (banc-autonomie) */
    const { monter, rep } = require('./banc-autonomie.js');
    const H = monter({ horaires: true, t0: U(2026, 10, 27, 2), avant: D2 => fs.writeFileSync(path.join(D2, F), JSON.stringify(HOR.defaut())), script: () => rep('Rien à signaler cette nuit.') });
    await H.justin('camille', 'Camille, tout va bien cette nuit ?');
    const aC = H.appels.filter(a => a.id === 'camille');
    v('3 h : Camille répond (un appel à Claude)', aC.length, 1);
    vrai('⛔ …et le prompt réel porte la MAINTENANCE DE NUIT', aC.length === 1 && /MAINTENANCE DE NUIT/.test(aC[0].system), aC.length ? aC[0].system.slice(-400) : 'aucun appel');
    await H.justin('lea', 'Léa, tu es là ?');
    v('⛔ 3 h : Léa ne répond pas (hors heures) — aucun appel de plus', H.appels.length, 1);
    H.horloge.t = U(2026, 10, 27, 9);
    await H.justin('noah', 'Noah, un point ?');
    const aN = H.appels.filter(a => a.id === 'noah');
    vrai('10 h : Noah répond, SANS la consigne de nuit (le prompt de jour est inchangé)', aN.length === 1 && !/MAINTENANCE DE NUIT/.test(aN[0].system), aN.length);
    H.horloge.t = U(2026, 10, 27, 2, 30);
    await H.justin('noah', 'Noah, et cette nuit ?');
    const aN2 = H.appels.filter(a => a.id === 'noah');
    vrai('3 h 30 : Noah répond avec la consigne de nuit', aN2.length === 2 && /MAINTENANCE DE NUIT/.test(aN2[1].system), aN2.length);
    H.nettoyer();
  }

  console.log('\n5. Camille la nuit : le courriel est mis de côté, pas examiné — et repris le matin');
  {
    const { monter } = require('./banc-agents-courrier.js');
    const nuit = U(2026, 10, 27, 2);
    const Z = monter({ t0: nuit, modes: { camille: 'brouillon' }, claude: () => 'CATEGORIE : remboursement', avant: D => fs.writeFileSync(path.join(D, F), JSON.stringify(HOR.defaut())), horaires: D => HOR({ DATA_DIR: D }) });
    const mail = (uid, de) => { const m = { uid, dossier: 'INBOX', boite: 'b-contact', mid: '<n' + uid + '@banc-3125>', de, deNom: '', pour: 'contact@teamop.fr', objet: 'Demande n°' + uid, texte: 'Bonjour, je veux un remboursement.', ts: Z.horloge.t - 3600000, auto: false, protege: false, authentifie: true }; Z.messages[m.boite + '|' + m.dossier + '|' + uid] = m; return { boiteId: m.boite, dossier: m.dossier, uid }; };
    v('3 h : Camille PEUT agir (astreinte) — mais hors heures', Z.agents.peutAgir('camille'), { ok: true, mode: 'brouillon', horsHeures: true, astreinte: true });
    const ev = mail(1, 'client-3125@exemple-3125.fr');
    const r = await Z.camille.surNouveauMessage(ev);
    v('⛔ un courriel arrive à 3 h : mis de côté (ni lu ni examiné), pas de brouillon, pas d’appel à Claude', [r.saute, r.differe, Z.lectures.length, Z.recus.length, (await Z.validations()).length], ['hors_heures', true, 0, 0, 0]);
    v('…il attend : une entrée pour Camille', Z.agents.differesEnAttente(), { camille: 1 });
    vrai('…et il n’est PAS marqué « vu » (rien dans le registre de Camille : il sera examiné pour de vrai)', !fs.existsSync(path.join(Z.D, 'agents-camille.json')) || !/banc-3125/.test(fs.readFileSync(path.join(Z.D, 'agents-camille.json'), 'utf8')));
    const nu = await Z.agents.reprendreDifferes();
    v('3 h encore : la reprise n’y touche pas (l’astreinte ne reprend rien hors des heures)', [nu.reprises, Z.recus.length], [0, 0]);
    Z.mail.arriere = async () => [];
    const ar = await Z.camille.reprendreArriere(30);
    v('…ni la reprise de l’arriéré', [ar.ok, ar.raison], [false, 'hors_heures']);
    Z.horloge.t = U(2026, 10, 27, 7, 5);             // 8 h 05 Paris
    const matin = await Z.agents.reprendreDifferes();
    v('⛔ 8 h 05 : le courriel est repris, Camille l’examine et dépose sa réponse en validation', [matin.reprises, Z.recus.length >= 1, (await Z.validations()).length], [1, true, 1]);
    Z.nettoyer();
  }

  console.log('\n6. ⛔ LA MIGRATION UNIQUE d’un registre d’avant');
  {
    const D = dossier();
    fs.writeFileSync(path.join(D, F), JSON.stringify(registreAvant()));
    const t0 = U(2026, 10, 28, 20);
    const { r: h, lignes } = captureJournal(() => HOR({ DATA_DIR: D, maintenant: () => t0 }));
    const c = h.config();
    v('la règle courante est posée', c.regle, 1);
    v('⛔ l’entreprise passe à 8 h – 24 h, les sept jours, fériés compris (feries false)', [c.entreprise.jours.every(j => j.ouvert && j.debut === '08:00' && j.fin === '24:00'), c.entreprise.jours.length, c.entreprise.feries], [true, 7, false]);
    v('l’astreinte devient la nouvelle liste (un agent par couche)', c.astreinte, ASTREINTE_ATTENDUE);
    v('⛔ la permanence est désactivée — ses agents, piliers et heures sont gardés', [c.permanence.actif, c.permanence.agents, c.permanence.piliers, c.permanence.debut, c.permanence.fin], [false, ['camille', 'hugo', 'lea'], ['hugo'], '10:00', '17:00']);
    v('⛔ les horaires PAR AGENT sont gardés (Lola le samedi matin : un choix de Justin)', c.parAgent, registreAvant().parAgent);
    v('…« ouvert jusqu’à » aussi', c.ouvertJusqua, U(2026, 10, 28, 21));
    v('…et la ligne « maj » dit que c’est la migration', [c.maj.par, c.maj.ts], ['migration du 28 octobre 2026', t0]);
    const sur = JSON.parse(lire(D));
    v('le fichier est RÉÉCRIT sur le disque, avec la règle, et sans fichier temporaire oublié', [sur.regle, sur.entreprise.jours[0].fin, sur.astreinte, fs.readdirSync(D).filter(f => /\.tmp$/.test(f))], [1, '24:00', ASTREINTE_ATTENDUE, []]);
    v('UNE ligne au journal du serveur, qui dit ce qui change et ce qui est gardé (Lola)', [lignes.filter(l => /migration unique du 28 octobre 2026/.test(l)).length, /lola/.test(lignes.join(' '))], [1, true]);
    v('(effet, au-delà de « ouvert jusqu’à ») mardi 3 novembre 3 h : Léa ferme, Camille d’astreinte ; samedi 7 novembre 11 h ouvert pour Léa ; Lola, aux horaires propres du samedi (9 h – 12 h), travaille à 10 h et plus à 13 h',
      [h.peutAgir('lea', U(2026, 11, 3, 2)).raison, h.peutAgir('camille', U(2026, 11, 3, 2)).astreinte, h.peutAgir('lea', U(2026, 11, 7, 10)).ok, h.peutAgir('lola', U(2026, 11, 7, 9)).ok, h.peutAgir('lola', U(2026, 11, 7, 12)).raison],
      ['hors_heures', true, true, true, 'hors_heures']);

    /* le deuxième chargement : le fichier est relu et réécrit à l'IDENTIQUE — rien ne se migre */
    const apres1 = lire(D);
    const { r: h2, lignes: l2 } = captureJournal(() => HOR({ DATA_DIR: D, maintenant: () => t0 + 86400000 }));
    v('⛔ deuxième chargement : aucune migration (zéro ligne), fichier octet pour octet identique', [l2.filter(l => /migration/.test(l)).length, lire(D) === apres1, h2.config().maj.ts], [0, true, t0]);
    v('…et même configuration en mémoire', h2.config(), h.config());

    /* Justin règle ensuite dans la Tour : 9 h – 18 h le lundi, une astreinte réduite, la permanence rallumée — la migration ne revient JAMAIS */
    const jours = h2.config().entreprise.jours.map((j, i) => (i === 0 ? { ouvert: true, debut: '09:00', fin: '18:00' } : j));
    const rr = h2.appliquer({ entreprise: { jours, feries: true }, astreinte: ['max'], permanence: Object.assign({}, h2.config().permanence, { actif: true }) });
    vrai('(préparation) le réglage de Justin est valide', !!rr.cfg, JSON.stringify(rr));
    let notes = []; const posts = {};
    const app = { get() {}, post(chemin, ...hs) { posts[chemin] = hs[hs.length - 1]; } };
    h2.routes(app, { monAdmin() {}, monPatronStrict() {}, maintenant: () => t0 + 2 * 86400000, noter: (...a) => notes.push(a) });
    const res = () => { const o = { code: 200, corps: null, status(c) { o.code = c; return o; }, json(x) { o.corps = x; return o; } }; return o; };
    const x = res(); posts['/api/monitor/agents/horaires']({ body: { entreprise: { jours, feries: true }, astreinte: ['max'], permanence: Object.assign({}, h2.config().permanence, { actif: true }) }, tourUser: { nom: 'Justin' } }, x);
    v('Justin enregistre ses horaires dans la Tour : 200', x.code, 200);
    const apresJustin = lire(D);
    const { r: h3, lignes: l3 } = captureJournal(() => HOR({ DATA_DIR: D, maintenant: () => t0 + 3 * 86400000 }));
    v('⛔ APRÈS le réglage de Justin et un redémarrage : sa règle tient (lundi 9 h – 18 h, astreinte Max seul, permanence active), la migration ne revient pas', [h3.config().entreprise.jours[0].debut, h3.config().entreprise.feries, h3.config().astreinte, h3.config().permanence.actif, h3.config().regle, l3.filter(l => /migration/.test(l)).length, lire(D) === apresJustin], ['09:00', true, ['max'], true, 1, 0, true]);

    /* l'écran qui renvoie un champ `regle` (ou un `regle: 0` malveillant) ne fait pas redescendre la règle */
    const y = res(); posts['/api/monitor/agents/horaires']({ body: { regle: 0, astreinte: ['max', 'theo'] }, tourUser: { nom: 'Justin' } }, y);
    v('un POST qui porte « regle: 0 » est accepté mais IGNORÉ : la règle reste à 1', [y.code, JSON.parse(lire(D)).regle, JSON.parse(lire(D)).astreinte], [200, 1, ['max', 'theo']]);
    v('…et un redémarrage ne migre toujours pas', captureJournal(() => HOR({ DATA_DIR: D })).lignes.filter(l => /migration/.test(l)).length, 0);
  }

  console.log('\n7. La migration au journal de la Tour, et les cas où elle ne doit PAS jouer');
  {
    /* le journal de la Tour (noter) reçoit UNE ligne au montage des routes */
    const D = dossier(); fs.writeFileSync(path.join(D, F), JSON.stringify(registreAvant()));
    const h = captureJournal(() => HOR({ DATA_DIR: D })).r;
    const notes = [];
    h.routes({ get() {}, post() {} }, { monAdmin() {}, monPatronStrict() {}, noter: (...a) => notes.push(a) });
    v('au montage des routes : UNE ligne « horaires » du système, « migration unique »', [notes.length, notes[0] && notes[0][0], notes[0] && notes[0][1], /migration unique/.test(notes[0] && notes[0][2].detail)], [1, 'systeme', 'horaires', true]);
    const notes2 = []; h.routes({ get() {}, post() {} }, { monAdmin() {}, monPatronStrict() {}, noter: (...a) => notes2.push(a) });
    v('…et pas une seconde fois si les routes sont remontées', notes2.length, 0);

    /* un registre qui porte DÉJÀ la règle, avec les horaires de Justin : intact */
    const D1 = dossier(), mien = Object.assign(BH.ancien(), { regle: 1 }); fs.writeFileSync(path.join(D1, F), JSON.stringify(mien));
    const avant1 = lire(D1), a1 = captureJournal(() => HOR({ DATA_DIR: D1 }));
    v('⛔ un registre à la règle courante (9 h – 18 h, Max et Théo) n’est PAS touché : fichier identique, zéro ligne', [lire(D1) === avant1, a1.lignes.length, a1.r.config().entreprise.jours[0].debut, a1.r.config().astreinte], [true, 0, '09:00', ['max', 'theo']]);
    /* une règle plus NEUVE (retour arrière du code) : intacte aussi */
    const D2 = dossier(); fs.writeFileSync(path.join(D2, F), JSON.stringify(Object.assign(BH.ancien(), { regle: 2 })));
    const a2 = captureJournal(() => HOR({ DATA_DIR: D2 }));
    v('une règle PLUS neuve que celle du code : lue telle quelle, jamais rabaissée', [JSON.parse(lire(D2)).regle, a2.r.config().regle, a2.lignes.length], [2, 2, 0]);

    /* ⛔ un registre ILLISIBLE n'est ni migré ni réécrit : il reste illisible et arrête tout */
    const cas = [['un JSON cassé', '{"entreprise": {"jours": ['], ['un JSON qui n’est pas un objet', '[1,2,3]'],
      ['trois jours seulement (forme inattendue), sans règle', JSON.stringify(Object.assign(registreAvant(), { entreprise: { jours: registreAvant().entreprise.jours.slice(0, 3), feries: true } }))],
      ['une règle absurde (-1)', JSON.stringify(Object.assign(BH.ancien(), { regle: -1 }))], ['une règle en chaîne', JSON.stringify(Object.assign(BH.ancien(), { regle: '1' }))],
      ['une astreinte avec un agent inconnu, sans règle', JSON.stringify(Object.assign(registreAvant(), { astreinte: ['pirate'] }))]];
    for (const [nom, brut] of cas) {
      const Di = dossier(); fs.writeFileSync(path.join(Di, F), brut);
      const w = captureJournal(() => HOR({ DATA_DIR: Di })); const hi = w.r;
      const err = [];
      const ve = console.error; console.error = (...a) => err.push(a.join(' ')); try { hi.peutAgir('max', U(2026, 10, 27, 2)); } finally { console.error = ve; }
      v('⛔ ' + nom + ' : illisible → TOUT LE MONDE arrêté (Max d’astreinte compris), fichier NON réécrit, aucune migration', [hi.illisible(), hi.peutAgir('max', U(2026, 10, 27, 2)), hi.peutAgir('lea', U(2026, 10, 27, 10)), lire(Di) === brut, w.lignes.filter(l => /migration/.test(l)).length, fs.readdirSync(Di).filter(f => /tmp/.test(f))],
        [true, { ok: false, raison: 'horaires_illisibles' }, { ok: false, raison: 'horaires_illisibles' }, true, 0, []]);
      const p = hi.appliquer({ astreinte: ['max'] });
      const ecr = hi.routes ? (() => { const posts = {}; hi.routes({ get() {}, post(c, ...hs) { posts[c] = hs[hs.length - 1]; } }, { monAdmin() {}, monPatronStrict() {} }); const o = { code: 200, corps: null, status(c) { o.code = c; return o; }, json(x) { o.corps = x; return o; } }; posts['/api/monitor/agents/horaires']({ body: { astreinte: ['max'] }, tourUser: { nom: 'Justin' } }, o); return o.code; })() : null;
      v('…et la Tour ne peut pas régler par-dessus (503), fichier toujours intact', [ecr, lire(Di) === brut, !!p.cfg], [503, true, true]);
    }

    /* un registre ABSENT : pas de migration, pas de fichier */
    const D3 = dossier(), a3 = captureJournal(() => HOR({ DATA_DIR: D3 }));
    v('un registre absent : aucune migration, aucun fichier écrit', [lire(D3), a3.lignes.length], [null, 0]);

    /* l'écriture échoue : la règle courante tient en mémoire, le fichier garde l'ancienne, le prochain démarrage recommence */
    const D4 = dossier(); fs.writeFileSync(path.join(D4, F), JSON.stringify(registreAvant()));
    const brutAvant = lire(D4);
    const fichierCasse = { charger: (n, d) => require(S('agents-fichier.js'))(D4).charger(n, d), ecrire: () => false, illisible: () => false };
    const a4 = captureJournal(() => HOR({ DATA_DIR: D4, fichier: fichierCasse }));
    v('écriture impossible : la migration vaut en mémoire, le fichier reste celui d’avant, le journal le DIT', [a4.r.config().regle, a4.r.config().entreprise.jours[6].fin, lire(D4) === brutAvant, /ÉCRITURE ÉCHOUÉE/.test(a4.lignes.join(' '))], [1, '24:00', true, true]);
    v('…et le démarrage suivant (disque réparé) migre pour de bon', [captureJournal(() => HOR({ DATA_DIR: D4 })).lignes.filter(l => /migration unique/.test(l)).length, JSON.parse(lire(D4)).regle], [1, 1]);
  }

  console.log('\n8. La Tour : le contrat de lecture ne bouge pas');
  {
    const D = dossier(); fs.writeFileSync(path.join(D, F), JSON.stringify(registreAvant()));
    const h = captureJournal(() => HOR({ DATA_DIR: D })).r;
    const vue = h.vue(U(2026, 10, 28, 20));
    v('la lecture rend les mêmes champs qu’avant (la Tour n’a rien à changer)', Object.keys(vue).sort(), ['agents', 'astreinte', 'entreprise', 'feriesAVenir', 'fuseau', 'illisible', 'maintenant', 'ok', 'ouvertJusqua', 'parAgent', 'permanence', 'ts']);
    v('…l’astreinte lue par la Tour est la nouvelle, la permanence est éteinte', [vue.astreinte, vue.permanence.actif], [ASTREINTE_ATTENDUE, false]);
    const retour = JSON.parse(JSON.stringify(vue));
    vrai('un écran qui renvoie la vue TELLE QUELLE (avec ses champs de lecture) n’est pas refusé', !!h.appliquer(retour).cfg, JSON.stringify(h.appliquer(retour)).slice(0, 200));
    vrai('…même avec `regle` dedans', !!h.appliquer(Object.assign({}, retour, { regle: 1 })).cfg);
    v('la vue ne dit pas « regle » : un détail du registre, pas un réglage de Justin', 'regle' in vue, false);
    v('(population) le registre en service porte seize agents connus', Object.keys(vue.agents).length, 16);
  }

  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.log('  ✗ le banc a jeté : ' + (e && e.stack || e)); console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); process.exit(1); });
