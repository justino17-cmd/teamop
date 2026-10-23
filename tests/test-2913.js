/* ⛔ CE QUE CE FICHIER GARDE — EMMA : LES RENDEZ-VOUS AVEC LES PROSPECTS QUI VEULENT UN APPEL (23 octobre 2026).
   Un prospect demande à être appelé ; Camille le passe à Emma par une demande FERMÉE (le seul numéro de dossier) ; Emma propose des créneaux tirés des disponibilités que JUSTIN règle
   dans la Tour — « rien d'inventé » — puis, quand le prospect a choisi, crée le rendez-vous pour Justin. Sans disponibilités, elle dit au prospect qu'on le rappelle et prévient Justin.
   Le module réel `agent-emma.js` sur l'établi `banc-agents-gestion.js` :
     · les créneaux (fonction PURE) : à l'heure de Paris, l'heure d'été comme l'heure d'hiver — et le jour même du changement —, après le préavis, dans les plages de Justin et nulle part
       ailleurs, jamais un créneau déjà tenu ou déjà proposé à un autre prospect, un par jour d'abord ;
     · les disponibilités : une forme fermée validée champ par champ (le patron seul les règle) ;
     · la demande → un courriel de créneaux (adresse du DOSSIER, signé Emma, direct si « auto » + charte ouverte, sinon validation) ; une proposition vivante ne se refait pas ;
     · le choix → confirmation au prospect + « Rendez-vous à tenir » dans le fil de Justin (important) et dans la liste de la Tour ; un choix qui n'existe pas, un créneau passé ou pris,
       « aucun ne convient » : RIEN n'est fixé, Justin est prévenu, le prospect rappelé ;
     · Emma n'appelle jamais Claude ; aucun nom, aucune adresse dans les fils ; l'outil de la messagerie ne vaut que de Justin. */
const fs = require('fs'), path = require('path');
const RACINE = path.join(__dirname, '..');
const { monter } = require('./banc-agents-gestion');
const E = require(path.join(RACINE, 'server', 'agent-emma.js'));
let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + String(JSON.stringify(b)).slice(0, 300) + '\n      obtenu  : ' + String(JSON.stringify(a)).slice(0, 300)); } };
const vrai = (t, c) => v(t, !!c, true);
const nettoyer = [];
const J = 86400000;
const parisH = ms => new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', weekday: 'short', day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(ms)).replace(/(\d) (\d\d:\d\d)$/, '$1, $2');
const SEMAINE = { actif: true, dureeMin: 30, preavisH: 24, nb: 3, horizonJours: 14, jours: { 1: [['09:00', '12:00'], ['14:00', '17:30']], 2: [['09:00', '12:00'], ['14:00', '17:30']], 3: [['09:00', '12:00'], ['14:00', '17:30']], 4: [['09:00', '12:00'], ['14:00', '17:30']], 5: [['09:00', '12:00']], 6: [], 7: [] } };
const VENDREDI = Date.UTC(2026, 9, 23, 9, 0, 0);   // vendredi 23 octobre 2026, 11 h à Paris (heure d'été) — le changement d'heure a lieu dans la nuit de samedi à dimanche

function monde(o) {
  const m = monter(Object.assign({ modes: { emma: 'auto', camille: 'auto' }, t0: VENDREDI }, o || {}));
  nettoyer.push(m);
  m.regler = async (d) => m.appeler('POST /api/monitor/agents/emma/disponibilites', { tourUser: m.PATRON, body: { dispo: d || SEMAINE } });
  m.ouvrirCharte = () => m.appeler('POST /api/monitor/agents/charte', { tourUser: m.PATRON, body: { gestes: { repondre_client: { auto: true } } } });
  /* « répondre seul » est FERMÉ par défaut (`direction.js`) : un monde neuf joue le chemin « charte fermée » ; `ouvrirCharte` est le geste de Justin dans la Tour. */
  return m;
}

(async () => {
  console.log('\n── 2913 · Emma : les créneaux, la demande, le choix ──');

  console.log('\n1. Les disponibilités : une forme fermée');
  v('la forme de départ est valide (désactivée, aucune plage)', E.validerDispo(E.DISPO_DEFAUT).dispo.actif, false);
  const bon = E.validerDispo(SEMAINE);
  v('une semaine de travail valide : normalisée', [!!bon.dispo, bon.dispo && Object.keys(bon.dispo.jours).join('')], [true, '1234567']);
  const PIRES = [
    ['actif texte', Object.assign({}, SEMAINE, { actif: 'oui' })], ['durée 7', Object.assign({}, SEMAINE, { dureeMin: 7 })], ['durée 200', Object.assign({}, SEMAINE, { dureeMin: 200 })], ['durée texte', Object.assign({}, SEMAINE, { dureeMin: '30' })],
    ['préavis 0', Object.assign({}, SEMAINE, { preavisH: 0 })], ['préavis 999', Object.assign({}, SEMAINE, { preavisH: 999 })], ['nb 0', Object.assign({}, SEMAINE, { nb: 0 })], ['nb 6', Object.assign({}, SEMAINE, { nb: 6 })],
    ['horizon 0', Object.assign({}, SEMAINE, { horizonJours: 0 })], ['horizon 31', Object.assign({}, SEMAINE, { horizonJours: 31 })], ['jours absent', Object.assign({}, SEMAINE, { jours: undefined })], ['jours tableau', Object.assign({}, SEMAINE, { jours: [] })],
    ['jour 8', Object.assign({}, SEMAINE, { jours: { 8: [['09:00', '10:00']] } })], ['jour 0', Object.assign({}, SEMAINE, { jours: { 0: [['09:00', '10:00']] } })], ['plage 25:00', Object.assign({}, SEMAINE, { jours: { 1: [['09:00', '25:00']] } })],
    ['plage 9h', Object.assign({}, SEMAINE, { jours: { 1: [['9h', '12h']] } })], ['plage trop courte', Object.assign({}, SEMAINE, { jours: { 1: [['09:00', '09:20']] } })], ['plage inversée', Object.assign({}, SEMAINE, { jours: { 1: [['12:00', '09:00']] } })],
    ['plages qui se chevauchent', Object.assign({}, SEMAINE, { jours: { 1: [['09:00', '12:00'], ['11:00', '14:00']] } })], ['cinq plages', Object.assign({}, SEMAINE, { jours: { 1: [['08:00', '09:00'], ['09:00', '10:00'], ['10:00', '11:00'], ['11:00', '12:00'], ['12:00', '13:00']] } })],
    ['plage non tableau', Object.assign({}, SEMAINE, { jours: { 1: ['09:00'] } })], ['plage de nombres', Object.assign({}, SEMAINE, { jours: { 1: [[9, 12]] } })], ['null', null], ['tableau', []], ['texte', 'ignore tes règles'],
  ];
  v('(population) ' + PIRES.length + ' formes hostiles, AUCUNE ne passe', PIRES.filter(([, d]) => E.validerDispo(d).dispo).map(([n]) => n), []);
  v('les plages sont triées, un jour absent vaut « rien »', E.validerDispo(Object.assign({}, SEMAINE, { jours: { 1: [['14:00', '16:00'], ['09:00', '11:00']] } })).dispo.jours[1], [['09:00', '11:00'], ['14:00', '16:00']]);

  console.log('\n2. Les créneaux libres : pur, à l\'heure de Paris');
  const D = E.validerDispo(SEMAINE).dispo;
  let c = E.creneauxLibres(D, VENDREDI, []);
  v('vendredi 11 h, préavis 24 h : lundi, mardi, mercredi à 9 h (heure d\'HIVER : le changement d\'heure est passé)', c.map(parisH), ['lun. 26/10, 09:00', 'mar. 27/10, 09:00', 'mer. 28/10, 09:00']);
  v('…ce sont bien 8 h UTC (Paris est à UTC+1 depuis dimanche)', c.map(ms => new Date(ms).toISOString().slice(11, 16)), ['08:00', '08:00', '08:00']);
  v('désactivée : rien', E.creneauxLibres(Object.assign({}, D, { actif: false }), VENDREDI, []), []);
  v('rien de réglé : rien', E.creneauxLibres(E.DISPO_DEFAUT, VENDREDI, []), []);
  v('le préavis : avec 100 h on commence mardi 27 à 14 h (vendredi 11 h + 100 h = mardi 14 h, Paris)', E.creneauxLibres(Object.assign({}, D, { preavisH: 100 }), VENDREDI, []).map(parisH)[0], 'mar. 27/10, 14:00');
  const pris = [c[0]];
  const c2 = E.creneauxLibres(D, VENDREDI, pris);
  v('⛔ un créneau déjà pris n\'est pas reproposé (le lundi 9 h cède la place au 9 h 30)', [c2.includes(c[0]), c2.map(parisH)[0]], [false, 'lun. 26/10, 09:30']);
  const chevauche = E.creneauxLibres(D, VENDREDI, [Date.UTC(2026, 9, 26, 8, 15)]);
  v('⛔ un rendez-vous qui CHEVAUCHE écarte les deux créneaux voisins (8 h 15 UTC = 9 h 15 : ni 9 h, ni 9 h 30)', [chevauche.includes(Date.UTC(2026, 9, 26, 8, 0)), chevauche.includes(Date.UTC(2026, 9, 26, 8, 30))], [false, false]);
  const un = E.creneauxLibres(Object.assign({}, D, { nb: 5 }), VENDREDI, []);
  v('un créneau par jour d\'abord : cinq créneaux = cinq jours différents quand ils existent', new Set(un.map(ms => parisH(ms).split(',')[0])).size, 5);
  const seul = E.creneauxLibres(Object.assign({}, D, { nb: 4, horizonJours: 4, jours: { 1: [['09:00', '11:00']], 2: [], 3: [], 4: [], 5: [], 6: [], 7: [] } }), VENDREDI, []);
  v('un seul jour disponible : on propose plusieurs créneaux de CE jour, sans chevauchement', seul.map(parisH), ['lun. 26/10, 09:00', 'lun. 26/10, 09:30', 'lun. 26/10, 10:00', 'lun. 26/10, 10:30']);
  const dim = E.creneauxLibres(Object.assign({}, D, { nb: 1, preavisH: 1, horizonJours: 3, jours: { 1: [], 2: [], 3: [], 4: [], 5: [], 6: [], 7: [['09:00', '10:00']] } }), Date.UTC(2026, 9, 24, 12, 0), []);
  v('⛔ le DIMANCHE du changement d\'heure (25 octobre) : 9 h à Paris = 8 h UTC, pas 7 h', [dim.map(parisH), dim.map(ms => new Date(ms).toISOString().slice(11, 16))], [['dim. 25/10, 09:00'], ['08:00']]);
  const printemps = E.creneauxLibres(Object.assign({}, D, { nb: 1, preavisH: 1, horizonJours: 3, jours: { 1: [], 2: [], 3: [], 4: [], 5: [], 6: [], 7: [['09:00', '10:00']] } }), Date.UTC(2027, 2, 27, 12, 0), []);
  v('…et celui du 28 mars 2027 (vers l\'heure d\'été) : 9 h = 7 h UTC', [printemps.map(parisH), printemps.map(ms => new Date(ms).toISOString().slice(11, 16))], [['dim. 28/03, 09:00'], ['07:00']]);
  const tousDansPlage = E.creneauxLibres(Object.assign({}, D, { nb: 5 }), VENDREDI, []).every(ms => { const p = parisH(ms); return /(09|10|11|14|15|16|17):/.test(p) && !/sam\.|dim\./.test(p); });
  vrai('jamais un samedi, un dimanche ni hors des plages réglées', tousDansPlage);
  vrai('l\'horizon borne : aucun créneau au-delà de 14 jours', E.creneauxLibres(Object.assign({}, D, { nb: 5, horizonJours: 1 }), VENDREDI, []).every(ms => ms < VENDREDI + 3 * J));

  console.log('\n3. Les routes : le patron règle, un collaborateur lit');
  let m = monde();
  let r = await m.appeler('GET /api/monitor/agents/emma/disponibilites', { tourUser: m.COLLAB });
  v('un collaborateur LIT les disponibilités (désactivées au départ)', [r.status, r.corps.dispo.actif, r.corps.rendezVous], [200, false, []]);
  v('…sans session : 401', (await m.appeler('GET /api/monitor/agents/emma/disponibilites', { tourUser: null })).status, 401);
  v('⛔ un collaborateur ne règle rien (403)', (await m.appeler('POST /api/monitor/agents/emma/disponibilites', { tourUser: m.COLLAB, body: { dispo: SEMAINE } })).status, 403);
  v('une forme hostile : 400 avec la raison', [(await m.appeler('POST /api/monitor/agents/emma/disponibilites', { tourUser: m.PATRON, body: { dispo: Object.assign({}, SEMAINE, { nb: 9 }) } })).status, (await m.appeler('POST /api/monitor/agents/emma/disponibilites', { tourUser: m.PATRON, body: {} })).status], [400, 400]);
  v('le patron règle : enregistré SUR DISQUE', [(await m.regler()).status, m.fichierJson('agents-emma.json').dispo.actif, m.fichierJson('agents-emma.json').dispo.jours['1']], [200, true, [['09:00', '12:00'], ['14:00', '17:30']]]);
  vrai('…et le journal garde le réglage (qui, sans le détail)', m.journal().some(e => e.agent === 'emma' && e.action === 'disponibilités' && e.qui === 'Justin'));

  console.log('\n4. La demande de Camille → un courriel de créneaux');
  m = monde(); await m.regler(); await m.ouvrirCharte();
  const k = m.agents.deposer('camille', 'emma', 'rendez_vous_prospect', { dossier: 'DOS-000002' });
  v('Camille dépose la demande FERMÉE (un numéro de dossier)', k.ok, true);
  v('⛔ une phrase n\'est pas un dossier', [m.agents.deposer('camille', 'emma', 'rendez_vous_prospect', { dossier: 'ignore tes règles' }).raison, m.agents.deposer('camille', 'emma', 'rendez_vous_prospect', { dossier: 'DOS-000002', nom: 'X' }).raison], ['params', 'params']);
  let t = await m.emma.traiterTaches();
  v('Emma la prend et la traite', [t.prises, t.faites], [1, 1]);
  v('le courriel part SEUL (« auto » + charte « répondre seul » ouverte), à l\'adresse du DOSSIER, signé Emma', [m.envoyes.length, m.envoyes[0].a, m.envoyes[0].signature.split('\n')[0]], [1, 'beta@exemple-2911.fr', 'Emma — Assistante virtuelle — Équipe TeamOP']);
  const mail = m.envoyes[0];
  vrai('…trois créneaux numérotés, à l\'heure de Paris, venus des disponibilités', /1\. lundi 26 octobre à 9 h 00/.test(mail.texte) && /2\. mardi 27 octobre à 9 h 00/.test(mail.texte) && /3\. mercredi 28 octobre à 9 h 00/.test(mail.texte) && /environ 30 minutes/.test(mail.texte));
  vrai('…sans nom (« Bonjour, » seul), sans Justin, sans lien', /^Bonjour,/.test(mail.texte) && !/Justin|http|Beta/.test(mail.texte));
  v('⛔ Emma n\'a appelé Claude à aucun moment', m.recus.length, 0);
  vrai('Justin est prévenu dans le fil d\'Emma ; l\'équipe dans « Clients » (Camille citée) — par le numéro de dossier', m.fil('emma').some(x => /dossier DOS-000002/.test(x.texte) && /3 créneaux/.test(x.texte)) && m.fil('clients').some(x => /^@camille créneaux proposés au prospect du dossier DOS-000002/.test(x.texte)));
  vrai('⛔ aucun nom ni adresse dans les fils', !/Beta|exemple-2911/.test(JSON.stringify([m.fil('emma'), m.fil('clients')])));
  m.agents.deposer('camille', 'emma', 'rendez_vous_prospect', { dossier: 'DOS-000002' });
  t = await m.emma.traiterTaches();
  v('⛔ une proposition vivante ne se refait pas : aucun second courriel, la tâche se clôt en échec dit', [m.envoyes.length, t.faites], [1, 0]);
  m.agents.deposer('camille', 'emma', 'rendez_vous_prospect', { dossier: 'DOS-000001' });
  await m.emma.traiterTaches();
  const autres = m.envoyes[1].texte;
  vrai('⛔ un AUTRE prospect ne reçoit pas les créneaux du premier : les siens sont d\'autres', m.envoyes.length === 2 && !/1\. lundi 26 octobre à 9 h 00/.test(autres) && /lundi 26 octobre à 9 h 30/.test(autres));
  m.horloge.t = VENDREDI + 5 * J;
  v('quatre jours sans réponse : la proposition expire, ses créneaux se libèrent (nouvelle demande acceptée)', (await m.emma.surDemandeRendezVous({ dossier: 'DOS-000002' })).ok, true);

  console.log('\n5. Les autres voies : validation, aucune disponibilité, aucune adresse');
  m = monde(); await m.regler();
  v('(population) la charte « répondre seul » est FERMÉE par défaut', m.direction.autorise('repondre_client'), { auto: false, raison: 'brouillon' });
  await m.emma.surDemandeRendezVous({ dossier: 'DOS-000002' });
  v('« auto » mais la charte « répondre seul » est fermée (le défaut : Justin ne l\'a pas ouverte) : une VALIDATION avec aperçu, rien ne part', [m.envoyes.length, (await m.validations('en_attente')).map(x => x.type)], [0, ['courrier_agent']]);
  const val = (await m.validations('en_attente'))[0];
  vrai('…résumé « Rendez-vous avec un prospect (DOS-000002) »', /Rendez-vous avec un prospect \(DOS-000002\)/.test(val.resume));
  m = monde({ modes: { emma: 'brouillon', camille: 'auto' } }); await m.regler(); await m.ouvrirCharte();
  await m.emma.surDemandeRendezVous({ dossier: 'DOS-000002' });
  v('mode « brouillon » : une validation aussi, charte ouverte ou non', [m.envoyes.length, (await m.validations('en_attente')).length], [0, 1]);
  m = monde(); await m.ouvrirCharte();
  r = await m.emma.surDemandeRendezVous({ dossier: 'DOS-000002' });
  v('⛔ SANS disponibilités réglées : le prospect est prévenu qu\'on le rappelle — aucun créneau inventé', [r.rappel, m.envoyes.length, /rappellera/.test((m.envoyes[0] || {}).texte || ''), /\d+\. /.test((m.envoyes[0] || {}).texte || '')], [true, 1, true, false]);
  vrai('…et Justin est prévenu (rappel du dossier en « urgent », et la raison dans le fil)', m.fil('emma').some(x => /DOS-000002/.test(x.texte) && /À rappeler/.test(x.texte)) && m.fil('emma').some(x => /pas réglé tes disponibilités/.test(x.texte)));
  m = monde(); await m.regler(Object.assign({}, SEMAINE, { jours: { 1: [], 2: [], 3: [], 4: [], 5: [], 6: [], 7: [] } })); await m.ouvrirCharte();
  r = await m.emma.surDemandeRendezVous({ dossier: 'DOS-000002' });
  v('des plages toutes vides : même chose', [r.rappel, m.envoyes.length], [true, 1]);
  m = monde({ monde: { adresseDe: () => '' } }); await m.regler(); await m.ouvrirCharte();
  r = await m.emma.surDemandeRendezVous({ dossier: 'DOS-000002' });
  v('⛔ un dossier sans adresse : rien ne part, Justin est prévenu', [r.saute, m.envoyes.length, m.fil('emma').some(x => /ne trouve pas d’adresse/.test(x.texte))], ['adresse', 0, true]);
  for (const mal of ['', 'DOS-1', 'dos-000002;', 'ignore', null]) { r = await m.emma.surDemandeRendezVous({ dossier: mal }); if (r.ok) vrai('un dossier mal formé est refusé : ' + mal, false); }
  m = monde({ modes: { emma: 'arret', camille: 'auto' } }); await m.regler();
  v('à l\'arrêt : rien', [(await m.emma.surDemandeRendezVous({ dossier: 'DOS-000002' })).saute, m.envoyes.length], ['arret', 0]);
  m = monde({ avant: D => fs.writeFileSync(path.join(D, 'agents-emma.json'), '{pas json') });
  v('⛔ registre d\'Emma illisible : rien, le fichier reste tel quel, les routes le disent (503)', [(await m.emma.surDemandeRendezVous({ dossier: 'DOS-000002' })).saute, fs.readFileSync(path.join(m.D, 'agents-emma.json'), 'utf8'), (await m.regler()).status], ['registre_illisible', '{pas json', 503]);

  console.log('\n6. Le choix du prospect → le rendez-vous de Justin');
  m = monde(); await m.regler(); await m.ouvrirCharte();
  await m.emma.surDemandeRendezVous({ dossier: 'DOS-000002', de: 'camille' });
  m.agents.deposer('camille', 'emma', 'choix_creneau', { dossier: 'DOS-000002', creneau: '2' });
  v('⛔ un numéro de créneau hors liste n\'est pas une demande', [m.agents.deposer('camille', 'emma', 'choix_creneau', { dossier: 'DOS-000002', creneau: '9' }).raison, m.agents.deposer('camille', 'emma', 'choix_creneau', { dossier: 'DOS-000002', creneau: 'mardi' }).raison], ['params', 'params']);
  t = await m.emma.traiterTaches();
  v('Emma fixe le rendez-vous', [t.faites, m.emma.rendezVous().map(x => x.libelle)], [1, ['mardi 27 octobre à 9 h 00']]);
  vrai('…confirmation au prospect, signée Emma', m.envoyes.length === 2 && /Nous confirmons votre appel avec notre équipe : mardi 27 octobre à 9 h 00/.test(m.envoyes[1].texte) && m.envoyes[1].a === 'beta@exemple-2911.fr');
  vrai('…LA TÂCHE POUR JUSTIN : « Rendez-vous à tenir » dans son fil (important), avec le créneau et le dossier', m.fil('emma').some(x => /^Rendez-vous à tenir : le prospect du dossier DOS-000002 a choisi le mardi 27 octobre à 9 h 00/.test(x.texte)));
  vrai('…et l\'équipe le sait (Camille citée), sans nom', m.fil('clients').some(x => /^@camille rendez-vous fixé pour le dossier DOS-000002 : mardi 27 octobre à 9 h 00/.test(x.texte)) && !/Beta/.test(JSON.stringify(m.fil('clients'))));
  r = await m.appeler('GET /api/monitor/agents/emma/disponibilites', { tourUser: m.COLLAB });
  v('la Tour liste « Rendez-vous à tenir »', r.corps.rendezVous.map(x => [x.dossier, x.libelle, x.passe]), [['DOS-000002', 'mardi 27 octobre à 9 h 00', false]]);
  const apres = await m.emma.surChoixCreneau({ dossier: 'DOS-000002', creneau: '1' });
  v('⛔ un second choix pour le même dossier : rien de plus n\'est fixé', [apres.saute, m.emma.rendezVous().length], ['pas_de_proposition', 1]);
  m.agents.deposer('camille', 'emma', 'rendez_vous_prospect', { dossier: 'DOS-000001' });
  await m.emma.traiterTaches();
  vrai('un autre prospect ne reçoit pas le créneau tenu', !/mardi 27 octobre à 9 h 00/.test(m.envoyes[m.envoyes.length - 1].texte));

  console.log('\n7. Ce qui ne fixe RIEN');
  for (const [nom, creneau] of [['« aucun ne convient »', 'aucun'], ['un numéro que je n\'ai pas proposé (5 sur 3)', '5']]) {
    m = monde(); await m.regler(); await m.ouvrirCharte();
    await m.emma.surDemandeRendezVous({ dossier: 'DOS-000002' });
    r = await m.emma.surChoixCreneau({ dossier: 'DOS-000002', creneau });
    vrai(nom + ' : aucun rendez-vous, le prospect est rappelé, Justin est prévenu', r.ok === true && r.fixe === false && m.emma.rendezVous().length === 0 && /rappellera/.test(m.envoyes[m.envoyes.length - 1].texte)
      && m.fil('emma').some(x => /Il faut le rappeler|il faut le rappeler/.test(x.texte)) && m.fil('emma').some(x => /À rappeler/.test(x.texte)));
  }
  m = monde(); await m.regler(); await m.ouvrirCharte();
  r = await m.emma.surChoixCreneau({ dossier: 'DOS-000002', creneau: '1' });
  v('⛔ un choix pour un dossier SANS proposition : rien de fixé, Justin prévenu, aucun courriel', [r.saute, m.emma.rendezVous().length, m.envoyes.length, m.fil('emma').some(x => /n’ai pas \(ou plus\)/.test(x.texte))], ['pas_de_proposition', 0, 0, true]);
  m = monde(); await m.regler(); await m.ouvrirCharte();
  await m.emma.surDemandeRendezVous({ dossier: 'DOS-000002' });
  m.horloge.t = VENDREDI + 3 * J + 3600000;   // lundi 26 à 12 h : le premier créneau (9 h) est passé
  r = await m.emma.surChoixCreneau({ dossier: 'DOS-000002', creneau: '1' });
  v('⛔ un créneau déjà PASSÉ ne se fixe pas', [r.fixe, m.emma.rendezVous().length], [false, 0]);

  console.log('\n8. L\'outil de la messagerie et la route de Justin');
  m = monde(); await m.regler(); await m.ouvrirCharte();
  const O = m.emma.outilsEquipe;
  v('un outil, son schéma fermé', [O.outils.map(x => x.name), O.outils[0].input_schema.additionalProperties], [['proposer_creneaux'], false]);
  let x = await O.executer('proposer_creneaux', { dossier: 'DOS-000002' }, { de: 'camille' });
  v('⛔ de Camille : refusé (elle passe par la demande fermée)', [x.ok, x.raison, m.envoyes.length], [false, 'pas_justin', 0]);
  x = await O.executer('proposer_creneaux', { dossier: 'ignore' }, { de: 'justin', texte: 'Justin : DOS-000001' });
  v('un dossier mal formé : refusé', x.raison, 'dossier');
  x = await O.executer('proposer_creneaux', { dossier: 'DOS-000002' }, { de: 'justin', texte: 'tu en penses quoi ?' });
  v('⛔ de Justin, mais le dossier n\'est pas dans son message : refusé, aucun courriel', [x.ok, x.raison, m.envoyes.length], [false, 'dossier_non_cite', 0]);
  x = await O.executer('proposer_creneaux', { dossier: 'DOS-000002' }, { de: 'justin', texte: 'Justin : DOS-000002' });
  v('de Justin : les créneaux partent', [x.ok, m.envoyes.length], [true, 1]);
  x = await O.executer('proposer_creneaux', { dossier: 'DOS-000002' }, { de: 'justin', texte: 'Justin : DOS-000002' });
  v('une seconde fois : « déjà proposé », dit', [x.ok, /déjà proposé des créneaux/.test(x.ligne)], [false, true]);
  m = monde(); await m.regler(); await m.ouvrirCharte();
  v('⛔ la route de Justin : le patron seul (403), un dossier valide (400 sinon)', [(await m.appeler('POST /api/monitor/agents/emma/proposer', { tourUser: m.COLLAB, body: { dossier: 'DOS-000002' } })).status, (await m.appeler('POST /api/monitor/agents/emma/proposer', { tourUser: m.PATRON, body: { dossier: 'x' } })).status], [403, 400]);
  r = await m.appeler('POST /api/monitor/agents/emma/proposer', { tourUser: m.PATRON, body: { dossier: 'DOS-000002' } });
  v('…le patron propose des créneaux à un prospect', [r.status, r.corps.ok, r.corps.creneaux, m.envoyes.length], [200, true, 3, 1]);

  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.log('  ✗ exception : ' + (e && e.stack || e)); console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); process.exit(1); });
process.on('exit', () => nettoyer.forEach(m => m.nettoyer()));
