/* ⛔ CE QUE CE FICHIER GARDE — LES HEURES DE TRAVAIL DES AGENTS (26 octobre 2026).
     Justin : « je voudrais pouvoir choisir les heures de travail des agents ; je veux que ce soit comme une vraie entreprise ». Les VRAIS modules (`agents-horaires.js`, `agents.js`,
     `agent-camille.js`, `agent-lea.js`, `agent-max.js`, `agents-brouillons.js`, `reunions.js`, `examen.js`), sur une HORLOGE TENUE ; puis le vrai serveur, parlé en HTTP.
       1. le calendrier : Pâques et les onze jours fériés français, à la main (2008 à 2038) ;
       2. l'heure de PARIS : ouverture et fermeture un jour d'été (07 h / 16 h UTC) et un jour d'hiver (08 h / 17 h UTC), les bornes à la minute — les valeurs sont écrites en UTC À LA MAIN ;
       3. ⛔ la nuit du 25 octobre 2026 (25 heures) et vendredi soir → lundi matin À CHEVAL sur le changement d'heure : la réouverture est lundi 08:00 UTC, jamais 07:00 (3 × 24 h) ;
       4. un jour férié (Toussaint un lundi, lundi de Pâques), un samedi, les horaires PAR AGENT (Lola le samedi matin, un agent qui travaille les jours fériés) ;
       5. `peutAgir` (la porte commune) : hors heures → `hors_heures`, l'arrêt et la pause passent avant, l'ASTREINTE agit mais le dit, un registre illisible arrête TOUT LE MONDE ;
       6. l'astreinte pour de bon : Max (le vrai) prévient Justin la nuit et ouvre l'incident dans la Tour, n'écrit JAMAIS à un client (les portes du courrier le refusent) ;
       7. ce qui arrive hors des heures ATTEND : un courriel (Camille), une inscription (Léa), une tâche — rien n'est lu, rien n'est compté comme traité, tout est repris à l'ouverture,
          LE PLUS ANCIEN D'ABORD ; un long week-end férié ne rend pas « ancien » un courriel ; une demande ne vieillit pas pendant que son destinataire est fermé ;
       8. « ouvrir maintenant » et sa fin ; 9. l'API (forme, refus lisibles, rien d'écrit sur un refus, accès) ; 10. un registre illisible ou de forme inattendue : agents ARRÊTÉS, et dit ;
      11. une réunion planifiée tient à son heure même fermée (vendredi 18 h, lundi férié) — pas la pause, pas un registre illisible ; 12. l'examen n'est JAMAIS bloqué ;
      13. le câblage d'`index.js` ; 14. le vrai serveur : la Tour règle les heures, Max répond la nuit, Camille se tait, « ouvrir maintenant » la réveille. */
'use strict';
const fs = require('fs'), os = require('os'), path = require('path'), crypto = require('crypto'), net = require('net');
const { spawn } = require('child_process');
const RACINE = path.join(__dirname, '..');
const S = f => path.join(RACINE, 'server', f);
let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + String(JSON.stringify(b)).slice(0, 500) + '\n      obtenu  : ' + String(JSON.stringify(a)).slice(0, 500)); } };
const vrai = (t, c, d) => v(t + (d !== undefined && !c ? ' — ' + String(d).slice(0, 300) : ''), !!c, true);
const dormir = ms => new Promise(r => setTimeout(r, ms));
const att = async (f, ms = 8000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await f()) return true; await dormir(60); } return false; };
const libre = () => new Promise(res => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)); }); });
const U = (a, m, j, h, mi) => Date.UTC(a, m - 1, j, h, mi || 0);                    // un instant UTC, mois de 1 à 12
const HEURE = 3600000;
const nu = s => s.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
const banc = fs.mkdtempSync(path.join(os.tmpdir(), 'b3021-'));
const enfants = [];
const fin = () => { enfants.forEach(e => { try { e.kill('SIGKILL'); } catch (x) {} }); try { fs.rmSync(banc, { recursive: true, force: true }); } catch (x) {} };
process.on('exit', fin);
setTimeout(() => { console.log('  ✗ banc FIGÉ au-delà de 170 s'); console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); fin(); process.exit(1); }, 170000).unref();
let n = 0;
const dossier = () => { const d = path.join(banc, 'd' + (n++)); fs.mkdirSync(d, { recursive: true }); return d; };

const HOR = require(S('agents-horaires.js'));
const BH = require('./banc-horaires.js');
/* ⛔ 28 octobre 2026 (Justin : « de 8 h à minuit », tous les jours) : le DÉFAUT du code ne ferme plus rien — `test-3125` le garde. Ce fichier-ci garde le MÉCANISME des heures (le calendrier de Paris,
   un férié, un samedi fermé, l'astreinte, la permanence) : il le joue sur le registre qu'un Justin d'avant aurait laissé dans la Tour (lundi – vendredi 9 h – 18 h, fériés fermés, Max et Théo, permanence
   active), `BH.ancien()`, avec la règle courante pour qu'aucune migration n'y touche. Les rares contrôles qui lisent le défaut lui-même ont été réécrits. */
const HORA = o => BH.horairesAncien(HOR, o);
/* le contenu du registre sur disque (ou null) : « rien n'est écrit » se prouve par un fichier IDENTIQUE — le registre de départ existe maintenant (l'ancien réglage) */
const contenuHor = D => { try { return fs.readFileSync(path.join(D, 'agents-horaires.json'), 'utf8'); } catch (e) { return null; } };
const AG = require(S('agents.js'));
const REG = AG.AGENTS.map(a => a.id);
const defaut = () => BH.ancien();
/* un registre d'horaires posé sur le disque AVANT le montage, comme Justin le laisse depuis la Tour */
const fab = cfg => { const D = dossier(); if (cfg !== undefined) fs.writeFileSync(path.join(D, 'agents-horaires.json'), typeof cfg === 'string' ? cfg : JSON.stringify(cfg)); return { D, h: HORA({ DATA_DIR: D }) }; };
const cfgDe = mod => Object.assign(defaut(), mod || {});
const jour = (debut, fin) => ({ ouvert: true, debut, fin });
const SEMAINE_SEULE = (i, d, f) => { const l = [null, null, null, null, null, null, null]; l[i] = jour(d, f); return l; };

console.log('\n── 3021 · les heures de travail des agents ──');
(async () => {
  console.log('\n1. Le calendrier : Pâques et les onze jours fériés — à la main');
  {
    const P = HOR.paques;
    v('Pâques, dates connues : 2008 → 23 mars, 2024 → 31 mars, 2025 → 20 avril, 2026 → 5 avril, 2027 → 28 mars, 2038 → 25 avril', [2008, 2024, 2025, 2026, 2027, 2038].map(a => P(a).mois + '/' + P(a).jour), ['3/23', '3/31', '4/20', '4/5', '3/28', '4/25']);
    const F = HOR.joursFeries(2026);
    v('(population) onze jours fériés en 2026', Object.keys(F).length, 11);
    v('les fixes : 1er janvier, 1er mai, 8 mai, 14 juillet, 15 août, 1er novembre, 11 novembre, 25 décembre', ['01-01', '05-01', '05-08', '07-14', '08-15', '11-01', '11-11', '12-25'].map(d => !!F['2026-' + d]), [true, true, true, true, true, true, true, true]);
    v('les mobiles de 2026 (Pâques le 5 avril) : lundi de Pâques le 6 avril, Ascension le 14 mai, lundi de Pentecôte le 25 mai', [F['2026-04-06'], F['2026-05-14'], F['2026-05-25']], ['Lundi de Pâques', 'Ascension', 'Lundi de Pentecôte']);
    v('…le Vendredi saint et le 26 décembre (Alsace-Moselle) n’en sont pas', [!!F['2026-04-03'], !!F['2026-12-26']], [false, false]);
    const F7 = HOR.joursFeries(2027);
    v('2027 (Pâques le 28 mars) : lundi de Pâques le 29 mars, Ascension le 6 mai, lundi de Pentecôte le 17 mai', [F7['2027-03-29'], F7['2027-05-06'], F7['2027-05-17']], ['Lundi de Pâques', 'Ascension', 'Lundi de Pentecôte']);
  }

  console.log('\n2. L’heure de Paris — un jour d’été, un jour d’hiver, au pas de la minute (valeurs écrites en UTC à la main)');
  {
    const { h } = fab();
    const ouv = ts => h.etatA(ts, null).ouvert;
    /* mardi 7 juillet 2026 (heure d'ÉTÉ, UTC+2) : 9 h = 07:00 UTC, 18 h = 16:00 UTC */
    v('mardi 7 juillet (été) : 06:59 UTC fermé, 07:00 UTC ouvert (9 h), 15:59 UTC ouvert, 16:00 UTC fermé (18 h)', [ouv(U(2026, 7, 7, 6, 59)), ouv(U(2026, 7, 7, 7)), ouv(U(2026, 7, 7, 15, 59)), ouv(U(2026, 7, 7, 16))], [false, true, true, false]);
    /* mardi 1er décembre 2026 (heure d'HIVER, UTC+1) : 9 h = 08:00 UTC, 18 h = 17:00 UTC */
    v('⛔ mardi 1er décembre (hiver) : 07:59 UTC fermé, 08:00 UTC ouvert (9 h), 16:59 UTC ouvert, 17:00 UTC fermé — un « +2 » figé ouvrirait à 07:00', [ouv(U(2026, 12, 1, 7, 59)), ouv(U(2026, 12, 1, 8)), ouv(U(2026, 12, 1, 16, 59)), ouv(U(2026, 12, 1, 17))], [false, true, true, false]);
    const e = h.etatA(U(2026, 7, 7, 10), null);
    v('ouvert : la raison, et la FERMETURE à venir (16:00 UTC)', [e.raison, e.prochaineFermeture, e.prochaineOuverture], ['heures_ouvrees', U(2026, 7, 7, 16), null]);
    const f = h.etatA(U(2026, 7, 7, 16), null);
    v('fermé à 18 h : hors_heures, et la réouverture est demain 9 h (07:00 UTC)', [f.raison, f.prochaineOuverture], ['hors_heures', U(2026, 7, 8, 7)]);
    v('⛔ UN REGISTRE ABSENT, C’EST LE RÉGLAGE PAR DÉFAUT — pas « ouvert tout le temps » : un samedi à midi, c’est fermé', h.etatA(U(2026, 10, 24, 10), null).ouvert, false);
    v('…et les défauts sont ceux de Justin : lundi → vendredi, 9 h – 18 h, fériés fermés, Max et Théo d’astreinte', [defaut().entreprise.jours.map(j => j.ouvert), defaut().entreprise.jours[0].debut + '-' + defaut().entreprise.jours[0].fin, defaut().entreprise.feries, defaut().astreinte],
      [[true, true, true, true, true, false, false], '09:00-18:00', true, ['max', 'theo']]);
  }

  console.log('\n3. ⛔ La nuit du 25 octobre 2026 (25 heures) et le week-end qui change d’heure');
  {
    const { h } = fab(cfgDe({ parAgent: { lola: { jours: SEMAINE_SEULE(6, '00:00', '24:00') } } }));
    const lola = ts => h.etatA(ts, 'lola');
    v('Lola travaille le dimanche toute la journée : le 25 octobre ouvre à 00:00 CEST = 22:00 UTC la veille et ferme à 24:00 CET = 23:00 UTC', [lola(U(2026, 10, 24, 21, 59)).ouvert, lola(U(2026, 10, 24, 22)).ouvert, lola(U(2026, 10, 25, 22, 59)).ouvert, lola(U(2026, 10, 25, 23)).ouvert], [false, true, true, false]);
    v('⛔ …cette journée-là dure VINGT-CINQ heures (le dimanche 8 novembre, vingt-quatre) : jamais « ajouter 24 h »', [lola(U(2026, 10, 24, 22)).prochaineFermeture - U(2026, 10, 24, 22), lola(U(2026, 11, 7, 23)).prochaineFermeture - U(2026, 11, 7, 23)], [25 * HEURE, 24 * HEURE]);
    const vendrediSoir = U(2026, 10, 23, 16);                  // vendredi 23 octobre, 18 h CEST
    const g = fab().h;
    v('⛔ vendredi 18 h (été) → la réouverture est lundi 26 octobre 9 h CET = 08:00 UTC (trois fois 24 h donneraient 07:00 UTC, 8 h à Paris)', [g.etatA(vendrediSoir, null).prochaineOuverture, g.etatA(vendrediSoir, null).prochaineOuverture === vendrediSoir + 3 * 24 * HEURE - 9 * HEURE], [U(2026, 10, 26, 8), false]);
    v('…le samedi à midi et le dimanche à minuit, la même réouverture', [g.etatA(U(2026, 10, 24, 10), null).prochaineOuverture, g.etatA(U(2026, 10, 25, 23), null).prochaineOuverture], [U(2026, 10, 26, 8), U(2026, 10, 26, 8)]);
    v('…et au printemps 2028 (changement d’heure le dimanche 26 mars) : vendredi 24 mars 18 h CET = 17:00 UTC → lundi 27 mars 9 h CEST = 07:00 UTC', g.etatA(U(2028, 3, 24, 17), null).prochaineOuverture, U(2028, 3, 27, 7));
    /* ⛔ le dimanche 28 mars 2027 n'a que 23 heures : « + 24 h » depuis le samedi 23 h 30 saute carrément un jour civil */
    const dim = fab(cfgDe({ parAgent: { lola: { jours: SEMAINE_SEULE(6, '08:00', '12:00') } } })).h;
    v('⛔ la nuit de PRINTEMPS (23 heures) : Lola travaille le dimanche 28 mars 2027 de 8 h à 12 h (CEST = 06:00 – 10:00 UTC) ; samedi 27 à 23 h 30 CET (22:30 UTC), sa prochaine ouverture est CE dimanche — pas le lundi', [dim.etatA(U(2027, 3, 27, 22, 30), 'lola').prochaineOuverture, dim.etatA(U(2027, 3, 28, 6), 'lola').ouvert, dim.etatA(U(2027, 3, 28, 10), 'lola').ouvert], [U(2027, 3, 28, 6), true, false]);
    v('le temps où l’équipe a pu travailler, vendredi 18 h → lundi 14 h CET (13:00 UTC) : cinq heures', g.tempsOuvert('camille', vendrediSoir, U(2026, 10, 26, 13)), 5 * HEURE);
    v('…et de lundi 9 h à mardi 9 h CET : neuf heures (et non vingt-quatre)', g.tempsOuvert('camille', U(2026, 10, 26, 8), U(2026, 10, 27, 8)), 9 * HEURE);
    v('…l’astreinte travaille tout le temps (le week-end entier compte)', g.tempsOuvert('max', vendrediSoir, U(2026, 10, 26, 8)), U(2026, 10, 26, 8) - vendrediSoir);
  }

  console.log('\n4. Un jour férié, un samedi, les horaires PAR AGENT');
  {
    const { h } = fab();
    const t = h.etatA(U(2027, 11, 1, 10), null);
    v('⛔ le 1er novembre 2027 (un LUNDI, Toussaint) : fermé toute la journée, la raison est « ferie » et le nom y est', [t.ouvert, t.raison, t.ferie], [false, 'ferie', 'Toussaint']);
    v('…la réouverture est le mardi 2 novembre à 9 h (08:00 UTC)', t.prochaineOuverture, U(2027, 11, 2, 8));
    v('…et le mardi 2 novembre, ouvert', h.etatA(U(2027, 11, 2, 10), null).ouvert, true);
    const p = h.etatA(U(2026, 4, 6, 8), null);
    v('⛔ le lundi de Pâques 2026 (6 avril, 9 h CEST = 07:00 UTC, 10 h = 08:00 UTC) : fermé', [h.etatA(U(2026, 4, 6, 7), null).ouvert, p.ouvert, p.ferie], [false, false, 'Lundi de Pâques']);
    v('…le Vendredi saint (3 avril) est un jour ordinaire : ouvert', h.etatA(U(2026, 4, 3, 8), null).ouvert, true);
    v('l’Ascension (jeudi 14 mai 2026) et la Pentecôte (lundi 25 mai) : fermées', [h.etatA(U(2026, 5, 14, 9), null).ferie, h.etatA(U(2026, 5, 25, 9), null).ferie], ['Ascension', 'Lundi de Pentecôte']);
    const s = h.etatA(U(2026, 10, 24, 10), null);
    v('un samedi : fermé, la raison est « jour_ferme » (pas un férié), prochaine ouverture lundi', [s.ouvert, s.raison, s.ferie, s.prochaineOuverture], [false, 'jour_ferme', undefined, U(2026, 10, 26, 8)]);
    /* l'entreprise qui travaille les jours fériés */
    const sansFeries = fab(cfgDe({ entreprise: Object.assign(defaut().entreprise, { feries: false }) })).h;
    v('« feries: false » : le lundi de Pâques est un lundi comme un autre', sansFeries.etatA(U(2026, 4, 6, 8), null).ouvert, true);
    /* Lola le samedi matin (9 h – 12 h CET = 08:00 – 11:00 UTC) */
    const lola = fab(cfgDe({ parAgent: { lola: { jours: SEMAINE_SEULE(5, '09:00', '12:00') } } })).h;
    v('⛔ Lola le samedi matin : le samedi 31 octobre ouvert de 08:00 à 11:00 UTC (9 h – 12 h), fermé après', [lola.etatA(U(2026, 10, 31, 7, 59), 'lola').ouvert, lola.etatA(U(2026, 10, 31, 8), 'lola').ouvert, lola.etatA(U(2026, 10, 31, 10, 59), 'lola').ouvert, lola.etatA(U(2026, 10, 31, 11), 'lola').ouvert], [false, true, true, false]);
    v('…Inès, elle, ne travaille pas le samedi (hors de la permanence) ; et Lola garde les horaires de l’entreprise les autres jours (mardi 9 h – 18 h)', [lola.etatA(U(2026, 10, 31, 9), 'ines').ouvert, lola.etatA(U(2026, 11, 3, 8), 'lola').ouvert, lola.etatA(U(2026, 11, 3, 17), 'lola').ouvert], [false, true, false]);
    v('…et avant le samedi matin, la prochaine ouverture de Lola est le samedi (pas le lundi) : vendredi 18 h → samedi 9 h', lola.etatA(U(2026, 10, 30, 17), 'lola').prochaineOuverture, U(2026, 10, 31, 8));
    /* un agent qui travaille les fériés (et sa propre fenêtre) */
    const noah = fab(cfgDe({ parAgent: { noah: { feries: false } } })).h;
    v('Noël 2026 (vendredi 25 décembre) : Noah, qui a « feries: false », travaille ; Camille non', [noah.etatA(U(2026, 12, 25, 10), 'noah').ouvert, noah.etatA(U(2026, 12, 25, 10), 'camille').ouvert, noah.etatA(U(2026, 12, 25, 10), 'camille').ferie], [true, false, 'Noël']);
    /* un agent aux horaires décalés : ses horaires remplacent ceux de l'entreprise, jour par jour */
    const tot = fab(cfgDe({ parAgent: { louis: { jours: [jour('06:00', '10:00'), null, null, null, null, null, null] } } })).h;
    v('Louis le lundi de 6 h à 10 h (CET) : lundi 26 octobre 06:00 UTC = 7 h → fermé ; 05:00 UTC = 6 h → ouvert ; 09:00 UTC = 10 h → fermé', [tot.etatA(U(2026, 10, 26, 5), 'louis').ouvert, tot.etatA(U(2026, 10, 26, 8), 'louis').ouvert, tot.etatA(U(2026, 10, 26, 9), 'louis').ouvert], [true, true, false]);
  }

  /* ── l'établi : les vrais modules du courrier, une horloge tenue, les heures branchées ── */
  const { monter, COURRIEL } = require('./banc-agents-courrier.js');
  const TOUS = {}; for (const id of REG) TOUS[id] = 'brouillon';
  const SAMEDI = U(2026, 10, 24, 10);                       // samedi 24 octobre 2026, 12 h à Paris
  const LUNDI = U(2026, 10, 26, 8);                         // lundi 26 octobre 2026, 9 h à Paris (heure d'hiver)
  const avecHeures = o => monter(Object.assign({ modes: TOUS, t0: SAMEDI, horaires: D => HORA({ DATA_DIR: D }) }, o));
  /* Les scénarios écrits AVANT la permanence du week-end (attente, expiration au temps de travail) se jouent permanence éteinte : ils gardent la fermeture
     du week-end, pas la rotation (jouée à part, section 15). */
  const SANS_PERMANENCE = D => { fs.writeFileSync(path.join(D, 'agents-horaires.json'), JSON.stringify(Object.assign(BH.ancien(), { permanence: Object.assign(BH.ancien().permanence, { actif: false }) }))); return HORA({ DATA_DIR: D }); };
  const poserMail = (Z, uid, de, o) => { const m = Object.assign({ uid, dossier: 'INBOX', boite: 'b-contact', mid: '<c' + uid + '@banc-3021>', de, deNom: '', pour: 'contact@teamop.fr', objet: 'Demande de remboursement n°' + uid,
    texte: 'Bonjour, je veux un remboursement.', ts: Z.horloge.t - HEURE, auto: false, protege: false, authentifie: true }, o); Z.messages[m.boite + '|' + m.dossier + '|' + uid] = m; return { boiteId: m.boite, dossier: m.dossier, uid }; };

  console.log('\n5. `peutAgir`, la porte commune : hors heures, l’astreinte, l’arrêt, l’illisible');
  {
    const Z = avecHeures({ modes: Object.assign({}, TOUS, { lola: 'arret' }) });
    v('⛔ samedi à midi : Camille est « hors_heures »', Z.agents.peutAgir('camille'), { ok: false, raison: 'hors_heures' });
    v('…Max (astreinte) agit, et le dit', Z.agents.peutAgir('max'), { ok: true, mode: 'brouillon', horsHeures: true, astreinte: true });
    v('…un agent À L’ARRÊT reste « arret » (le mode passe avant les heures)', Z.agents.peutAgir('lola'), { ok: false, raison: 'arret' });
    Z.horloge.t = LUNDI;
    v('lundi 9 h : Camille agit (et ne porte pas le drapeau d’astreinte)', Z.agents.peutAgir('camille'), { ok: true, mode: 'brouillon' });
    v('…Max aussi, sans le drapeau (il est dans ses heures)', Z.agents.peutAgir('max'), { ok: true, mode: 'brouillon' });
    Z.horloge.t = SAMEDI;
    await Z.appeler('POST /api/monitor/agents/pause', { tourUser: Z.PATRON, body: { pause: true, motif: 'banc' } });
    v('la pause générale passe avant les heures (même pour l’astreinte)', [Z.agents.peutAgir('camille').raison, Z.agents.peutAgir('max').raison], ['pause', 'pause']);
    Z.nettoyer();
    const Y = monter({ modes: TOUS, t0: SAMEDI });
    v('(contre-épreuve) SANS heures branchées — un banc de module, l’examen — rien ne change : Camille agit un samedi', Y.agents.peutAgir('camille'), { ok: true, mode: 'brouillon' });
    Y.nettoyer();
  }

  console.log('\n6. ⛔ L’astreinte : Max PRÉVIENT Justin la nuit — et n’écrit JAMAIS à un client');
  {
    const { monter: monterP, SANTE_BONNE } = require('./banc-plateforme.js');
    const B = monterP({ t0: SAMEDI, horaires: D => HORA({ DATA_DIR: D }) });
    const sante = SANTE_BONNE();
    const eq = require(S('agent-equipe.js'))({ agents: B.agents, conversations: B.conversations, cerveau: B.cerveau, faits: {} });
    const max = require(S('agent-max.js'))({ agents: B.agents, conversations: B.conversations, etat: B.etat, incidents: B.incidents, maintenant: B.maintenant, sante: async () => JSON.parse(JSON.stringify(sante)) });
    const jules = require(S('agent-jules.js'))({ agents: B.agents, conversations: B.conversations, cerveau: B.cerveau, etat: B.etat, incidents: B.incidents, maintenant: B.maintenant, equipe: () => eq });
    sante.stripeEchecMin = 95;                                   // Stripe illisible depuis 95 minutes : critique
    const r = await max.passer();
    v('samedi 12 h : Max voit Stripe illisible, ouvre l’épisode et l’annonce', [r.nouveaux, r.annonces], [1, 1]);
    vrai('…l’incident est ouvert dans la Tour (Surveillance) — sans aucune entreprise : aucun courriel à un client ne peut en partir', B.issues.length === 1 && Array.isArray(B.issues[0].entreprises) && B.issues[0].entreprises.length === 0, JSON.stringify(B.issues));
    vrai('…« Plateforme » le dit, Justin est prévenu à part (fil de Max, urgent) ET notifié', B.textes('plateforme').length === 1 && B.fil('max').some(m => m.texte.startsWith('Justin, c’est sérieux')) && B.pousses.length >= 1, JSON.stringify(B.pousses));
    v('…Jules, lui, est fermé : il ne prend rien', (await jules.passer()).saute, 'hors_heures');
    /* un incident de gravité haute venu des appareils : Max PRÉVIENT (« Plateforme »), Jules est fermé — la consigne attend, et la phrase le dit */
    const client = { id: 'i1a2b3c4d5e60', signature: 'opgestion|x', app: 'opgestion', type: 'erreur', categorie: 'Planning', message: 'MESSAGE-SECRET-3021', stack: 'x', src: 'x', origine: 'x', count: 14, firstTs: B.horloge.t - 60000, lastTs: B.horloge.t - 30000,
      entreprises: [{ nom: 'Société Secrète 3021' }, { nom: 'Autre 3021' }, { nom: 'Troisième 3021' }], appareils: { a: 1 }, statut: 'nouveau', notes: 'x', mailEnvoye: false };
    B.issues.push(client);
    const r2 = await max.passer();
    v('un incident venu des appareils : Max le DIT dans « Plateforme », et dit que Jules est hors des heures (l’incident l’attend dans la Tour) — sans nom d’entreprise', [r2.clients, B.textes('plateforme').filter(t => /^Un incident de gravité haute/.test(t))], [1, ['Un incident de gravité haute vient d’arriver des appareils : 14 occurrences, chez 3 entreprises, catégorie Planning. Jules est hors des heures de travail : l’incident l’attend dans la Tour (Incidents).']]);
    v('…et aucune consigne n’est donnée à un Jules fermé', B.agents.tachesDe('jules'), []);
    B.nettoyer();
    const G = require('./banc-agents-gestion.js').monter({ modes: { max: 'auto', camille: 'auto' }, t0: SAMEDI, horaires: D => HORA({ DATA_DIR: D }) });
    const doc = a => G.documents.ranger({ type: 'courrier_agent', agent: a, a: 'client@exemple-3021.fr', objet: 'Bonjour', texte: 'Un texte.', source: 'relance' });
    v('⛔ les DOCUMENTS (relances, accusés, annonces) refusent l’astreinte comme les brouillons : Max, samedi → hors_heures, rien de rangé', [(await doc('max')).raison, fs.existsSync(path.join(G.D, 'agents-documents.json'))], ['hors_heures', false]);
    v('…le courrier direct de Max aussi', (await G.documents.courrier({ agent: 'max', a: 'client@exemple-3021.fr', objet: 'Bonjour', texte: 'Un texte.', source: 'relance', porte: 'aucune' })).raison, 'hors_heures');
    G.nettoyer();
    /* les portes qui écrivent à un client refusent l'astreinte */
    const Z = avecHeures({ modes: Object.assign({}, TOUS, { max: 'auto' }) });
    const depot = a => Z.brouillons.deposer({ agent: a, a: 'client@exemple-3021.fr', objet: 'Bonjour', texte: 'Un texte.', source: 'courrier', enReponseA: null });
    v('⛔ Max (astreinte, samedi) dépose un brouillon pour un client : REFUSÉ, rien n’est rangé, rien ne part', [(await depot('max')).raison, fs.existsSync(path.join(Z.D, 'agents-brouillons.json')), Z.envoyes.length], ['hors_heures', false, 0]);
    v('…Théo de même', (await depot('theo')).raison, 'hors_heures');
    v('…Camille, fermée, aussi (autre raison : pas d’astreinte)', (await depot('camille')).raison, 'hors_heures');
    Z.horloge.t = LUNDI;
    const positif = await depot('max');
    vrai('(contre-épreuve) lundi 9 h, le même dépôt par Max passe : le refus du samedi vient bien des heures', positif.ok === true, JSON.stringify(positif));
    Z.nettoyer();
  }

  console.log('\n7. ⛔ Ce qui arrive hors des heures ATTEND, et se reprend à l’ouverture — le plus ancien d’abord');
  {
    const Z = avecHeures({ claude: () => 'CATEGORIE : remboursement' });
    const evs = [poserMail(Z, 1, 'premier@exemple-3021.fr'), poserMail(Z, 2, 'second@exemple-3021.fr'), poserMail(Z, 3, 'troisieme@exemple-3021.fr')];
    const rs = []; for (const ev of evs) rs.push(await Z.camille.surNouveauMessage(ev));
    v('samedi : les trois courriels sont mis de côté, aucun n’est lu ni examiné', [rs.map(r => r.saute + ':' + r.differe), Z.lectures.length, Z.recus.length], [['hors_heures:true', 'hors_heures:true', 'hors_heures:true'], 0, 0]);
    v('⛔ rien n’est compté comme traité : pas de registre de Camille, pas de brouillon, pas de validation, pas d’examen au compteur', [fs.existsSync(path.join(Z.D, 'agents-camille.json')), fs.existsSync(path.join(Z.D, 'agents-brouillons.json')), (await Z.validations()).length], [false, false, 0]);
    v('…ils attendent : trois entrées pour Camille, et la liste des agents en donne le NOMBRE', [Z.agents.differesEnAttente(), (await Z.appeler('GET /api/monitor/agents', { tourUser: Z.PATRON })).corps.horaires.enAttente], [{ camille: 3 }, 3]);
    const brut = fs.readFileSync(path.join(Z.D, 'agents-differes.json'), 'utf8');
    vrai('⛔ …le fichier ne porte que trois identifiants par courriel — ni adresse, ni objet, ni texte', !/exemple-3021|remboursement|premier|second|troisieme/i.test(brut), brut.slice(0, 300));
    v('(contre-épreuve de la file) deux annonces du même courriel ne font qu’une entrée', [(await Z.camille.surNouveauMessage(evs[0])).saute, Z.agents.differesEnAttente()], ['hors_heures', { camille: 3 }]);
    let b = await Z.agents.reprendreDifferes();
    v('samedi encore : la reprise n’y touche pas (personne ne peut agir)', [b.reprises, b.restantes, Z.recus.length], [0, 3, 0]);
    Z.horloge.t = LUNDI;
    b = await Z.agents.reprendreDifferes();
    v('⛔ lundi 9 h : les trois sont reprises', [b.reprises, b.restantes, b.abandonnees], [3, 0, 0]);
    v('…LE PLUS ANCIEN D’ABORD (lectures dans l’ordre d’arrivée) et Claude appelé une fois par courriel', [Z.lectures.map(l => l[2]), Z.recus.length], [[1, 2, 3], 3]);
    v('…trois réponses préparées (validations de Justin), trois courriels au registre de Camille', [(await Z.validations()).length, Object.keys(Z.fichierJson('agents-camille.json').mids).length], [3, 3]);
    v('…et la reprise est écrite au journal (un nombre, pas un nom)', Z.journal().filter(e => e.action === 'reprise à l’ouverture').map(e => e.detail), ['3 entrées reprises, la plus ancienne d’abord']);
    v('…la file est vide, et le fichier aussi', [Z.agents.differesEnAttente(), JSON.parse(fs.readFileSync(path.join(Z.D, 'agents-differes.json'), 'utf8'))], [{}, []]);
    v('une seconde reprise ne répond pas deux fois', [(await Z.agents.reprendreDifferes()).reprises, Z.recus.length], [0, 3]);
    Z.nettoyer();
  }
  {
    /* ⛔ un long week-end férié (jeudi 24 décembre 18 h → lundi 28 décembre 9 h : 87 heures) ne rend pas « ancien » un courriel que Camille reçoit à 18 h 30 */
    const Z = avecHeures({ t0: U(2026, 12, 24, 17, 32), claude: () => 'CATEGORIE : remboursement' });
    const ev = poserMail(Z, 7, 'noel@exemple-3021.fr', { ts: U(2026, 12, 24, 17, 30) });
    await Z.camille.surNouveauMessage(ev);
    Z.horloge.t = U(2026, 12, 28, 8);
    const b = await Z.agents.reprendreDifferes();
    v('⛔ jeudi 24 décembre 18 h 32 → lundi 28 à 9 h (87 h, plus de trois jours) : le courriel de 18 h 30 est repris, pas jeté comme « ancien »', [b.reprises, Z.recus.length, (await Z.validations()).length], [1, 1, 1]);
    Z.nettoyer();
    const Y = monter({ modes: TOUS, t0: U(2026, 12, 28, 8) });
    poserMail(Y, 8, 'ancien@exemple-3021.fr', { ts: U(2026, 12, 24, 17, 30) });
    const r = await Y.camille.surNouveauMessage({ boiteId: 'b-contact', dossier: 'INBOX', uid: 8 });
    /* 28 octobre 2026 (Justin : « trois jours avant, et après ils n'ont plus accès au reste, c'est débile ») : il n'y a plus d'« ancien » — le même courriel, arrivé SANS avoir attendu, se traite aussi */
    v('le même courriel, arrivé SANS avoir attendu l’ouverture, se traite aussi (plus de limite d’âge depuis le 28 octobre 2026)', [r.saute, Y.recus.length], [undefined, 1]);
    Y.nettoyer();
  }
  {
    const Z = avecHeures();
    const a = await Z.lea.surInscription({ entreprise: 'Toka Clim', email: 'toka@exemple-3021.fr' });
    const a2 = await Z.lea.surInscription({ entreprise: 'Toka Clim', email: 'toka@exemple-3021.fr' });
    v('⛔ samedi : l’inscription ne prépare rien (ni Claude, ni brouillon, ni mémoire de Léa) — elle attend, UNE fois', [a.saute, a.differe, a2.differe, Z.recus.length, fs.existsSync(path.join(Z.D, 'agents-lea.json')), Z.agents.differesEnAttente()], ['hors_heures', true, true, 0, false, { lea: 1 }]);
    Z.horloge.t = LUNDI;
    const b = await Z.agents.reprendreDifferes();
    const val = await Z.validations();
    v('lundi 9 h : Léa la prend — un courriel préparé pour Justin, une réponse enregistrée par empreinte', [b.reprises, Z.recus.length, val.length, val[0] && /Réponse à l’inscription de Toka Clim/.test(val[0].resume), Object.keys(Z.fichierJson('agents-lea.json').adresses).length], [1, 1, 1, true, 1]);
    Z.nettoyer();
    const Y = avecHeures({ modes: Object.assign({}, TOUS, { lea: 'arret' }) });
    const r = await Y.lea.surInscription({ entreprise: 'Toka Clim', email: 'toka@exemple-3021.fr' });
    v('(contre-épreuve) Léa À L’ARRÊT : rien n’est mis de côté — l’arrêt n’est pas une attente', [r.saute, r.differe, Y.agents.differesEnAttente()], ['arret', undefined, {}]);
    Y.nettoyer();
  }
  {
    /* les tâches entre agents : celles déposées avant la fermeture attendent, la plus ancienne d'abord, et ne vieillissent pas pendant la fermeture */
    const Z = avecHeures({ t0: U(2026, 10, 23, 15, 59), horaires: SANS_PERMANENCE });
    const t1 = Z.agents.deposer('camille', 'hugo', 'verifier_paiement', { espace: 'premiere' });
    Z.horloge.t += 30000;
    const t2 = Z.agents.deposer('camille', 'hugo', 'verifier_paiement', { espace: 'seconde' });
    v('vendredi 17 h 59 : deux demandes déposées à Hugo', [t1.ok, t2.ok], [true, true]);
    Z.horloge.t = U(2026, 10, 23, 16, 1);
    v('18 h 01 : Hugo est fermé, il ne prend rien', Z.agents.prendre('hugo'), null);
    Z.horloge.t = U(2026, 10, 25, 16, 30);
    v('⛔ dimanche 17 h 30 — plus de 48 h après le dépôt : les demandes n’ont pas expiré (rien n’est perdu), elles attendent toujours', [Z.agents.comptes().tachesEnAttente, Z.agents.prendre('hugo')], [2, null]);
    Z.horloge.t = LUNDI;
    const p1 = Z.agents.prendre('hugo'), p2 = Z.agents.prendre('hugo');
    v('⛔ lundi 9 h : Hugo prend LA PLUS ANCIENNE d’abord', [p1 && p1.params.espace, p2 && p2.params.espace], ['premiere', 'seconde']);
    Z.nettoyer();
    const Y = avecHeures({ t0: U(2026, 12, 1, 8), horaires: SANS_PERMANENCE });
    Y.agents.deposer('camille', 'hugo', 'verifier_paiement', { espace: 'ancienne' });
    Y.horloge.t = U(2026, 12, 8, 10);
    v('une demande jamais prise finit par expirer — mais au temps de travail, et au bout de SEPT jours ouvrés d’heures (48 h jusqu’au 28 octobre 2026) : mardi 8 décembre 11 h (une semaine de calendrier, une quarantaine d’heures ouvrées), elle vit encore', Y.agents.comptes().tachesEnAttente, 1);
    Y.horloge.t = U(2026, 12, 8, 12);
    v('…à 13 h le même jour, aussi (elle aurait expiré avant le 28 octobre 2026)', Y.agents.comptes().tachesEnAttente, 1);
    Y.horloge.t = U(2027, 1, 20, 12);
    v('…et plus de six semaines après (bien plus de 168 h ouvrées), elle a expiré', Y.agents.comptes().tachesEnAttente, 0);
    Y.nettoyer();
  }

  console.log('\n8. « Ouvrir maintenant » — Justin fait travailler l’équipe un samedi, puis l’arrête');
  {
    const Z = avecHeures({ claude: () => 'CATEGORIE : remboursement' });
    await Z.camille.surNouveauMessage(poserMail(Z, 1, 'attente@exemple-3021.fr'));
    const ouvrir = jusqua => Z.appeler('POST /api/monitor/agents/horaires/ouvrir', { tourUser: Z.PATRON, body: { jusqua } });
    let r = await ouvrir(Z.horloge.t + 2 * HEURE);
    v('POST …/horaires/ouvrir { jusqua } : 200, l’équipe est ouverte « par ouverture forcée », et dit jusqu’à quand', [r.status, r.corps.maintenant.ouvert, r.corps.maintenant.raison, r.corps.ouvertJusqua, r.corps.maintenant.prochaineFermeture], [200, true, 'ouverture_forcee', SAMEDI + 2 * HEURE, SAMEDI + 2 * HEURE]);
    v('…Camille peut agir, elle n’est pas « d’astreinte »', Z.agents.peutAgir('camille'), { ok: true, mode: 'brouillon' });
    const b = await Z.agents.reprendreDifferes();
    v('⛔ …ce qui l’attendait est repris SUR-LE-CHAMP (Justin veut les faire travailler ce soir)', [b.reprises, Z.recus.length, (await Z.validations()).length], [1, 1, 1]);
    const f = await Z.appeler('POST /api/monitor/agents/horaires/fermer', { tourUser: Z.PATRON, body: {} });
    v('POST …/horaires/fermer : l’ouverture forcée cesse tout de suite, retour aux horaires', [f.status, f.corps.maintenant.ouvert, f.corps.ouvertJusqua, Z.agents.peutAgir('camille').raison], [200, false, null, 'hors_heures']);
    await ouvrir(Z.horloge.t + HEURE);
    Z.horloge.t += HEURE - 1;
    v('…une ouverture forcée finit toute seule à l’heure dite (une seconde avant : ouvert)', Z.agents.peutAgir('camille').ok, true);
    Z.horloge.t += 2;
    v('…une seconde après : fermé', Z.agents.peutAgir('camille').raison, 'hors_heures');
    v('ouvrir pendant les heures normales PROLONGE : lundi 17 h 30 (16:30 UTC) jusqu’à 21 h, Camille travaille à 19 h', (() => { Z.horloge.t = U(2026, 10, 26, 16, 30); return true; })() && (await ouvrir(U(2026, 10, 26, 20))).corps.maintenant.prochaineFermeture, U(2026, 10, 26, 20));
    Z.horloge.t = U(2026, 10, 26, 18);
    v('…à 19 h CET (18:00 UTC), Camille agit', Z.agents.peutAgir('camille').ok, true);
    /* les refus */
    Z.horloge.t = SAMEDI;
    const refus = async (corps, motif) => { const x = await ouvrir(corps); return [x.status, new RegExp(motif).test(x.corps.error || '')]; };
    v('un « jusqua » absent, déjà passé, dans moins d’une minute, au-delà d’une semaine, ou une date sans fuseau : 400 lisible', [await refus(undefined, 'Jusqu’à quand'), await refus(SAMEDI - 1000, 'déjà passée'), await refus(SAMEDI + 30000, 'déjà passée'), await refus(SAMEDI + 8 * 86400000, 'une semaine'), await refus('2026-10-24T20:00:00', 'Jusqu’à quand')],
      [[400, true], [400, true], [400, true], [400, true], [400, true]]);
    const iso = await ouvrir('2026-10-24T22:00:00+02:00');
    v('une date ISO AVEC fuseau passe (24 octobre 22 h CEST = 20:00 UTC) ; en texte numérique aussi', [iso.status, iso.corps.ouvertJusqua, (await ouvrir(String(SAMEDI + HEURE))).corps.ouvertJusqua], [200, U(2026, 10, 24, 20), SAMEDI + HEURE]);
    v('ouvrir et fermer sont réservés au patron (403 pour un collaborateur, comme sans compte)', [(await Z.appeler('POST /api/monitor/agents/horaires/ouvrir', { tourUser: Z.COLLAB, body: { jusqua: SAMEDI + HEURE } })).status, (await Z.appeler('POST /api/monitor/agents/horaires/fermer', { tourUser: Z.COLLAB, body: {} })).status, (await Z.appeler('POST /api/monitor/agents/horaires/fermer', { tourUser: null, body: {} })).status], [403, 403, 403]);
    const sur = JSON.parse(fs.readFileSync(path.join(Z.D, 'agents-horaires.json'), 'utf8'));
    v('l’ouverture forcée est ÉCRITE (elle survit à un redémarrage), par un fichier temporaire renommé', [sur.ouvertJusqua, fs.readdirSync(Z.D).some(f => /horaires.*\.tmp$/.test(f))], [SAMEDI + HEURE, false]);
    Z.nettoyer();
  }

  console.log('\n9. L’API : la forme, les refus lisibles, rien d’écrit sur un refus, qui peut quoi');
  {
    const Z = avecHeures();
    const G = tu => Z.appeler('GET /api/monitor/agents/horaires', { tourUser: tu === undefined ? Z.PATRON : tu });
    const P = (corps, tu) => Z.appeler('POST /api/monitor/agents/horaires', { tourUser: tu === undefined ? Z.PATRON : tu, body: corps });
    const DEPART9 = contenuHor(Z.D);
    const lu = (await G()).corps;
    v('GET : les champs du contrat', Object.keys(lu).sort(), ['agents', 'astreinte', 'entreprise', 'feriesAVenir', 'fuseau', 'illisible', 'maintenant', 'ok', 'ouvertJusqua', 'parAgent', 'permanence', 'ts']);
    v('…l’entreprise : sept jours (lundi → dimanche) { ouvert, debut, fin }, et « feries »', [lu.entreprise.jours.length, Object.keys(lu.entreprise.jours[0]).sort(), lu.entreprise.feries, lu.fuseau], [7, ['debut', 'fin', 'ouvert'], true, 'Europe/Paris']);
    v('…maintenant : ouvert, raison, prochaineOuverture (UTC), prochaineFermeture, et la phrase', [lu.maintenant.ouvert, lu.maintenant.raison, lu.maintenant.prochaineOuverture, lu.maintenant.prochaineFermeture, lu.maintenant.libelleOuverture], [false, 'jour_ferme', U(2026, 10, 26, 8), null, 'lundi 26 octobre à 9 h']);
    v('…parAgent vide, astreinte [max, theo], aucune ouverture forcée', [lu.parAgent, lu.astreinte, lu.ouvertJusqua], [{}, ['max', 'theo'], null]);
    v('…un état par agent : seize agents, Max « agit » mais n’est pas « ouvert » (astreinte), Camille ni l’un ni l’autre', [Object.keys(lu.agents).length, lu.agents.max.ouvert, lu.agents.max.agit, lu.agents.max.astreinte, lu.agents.camille.ouvert, lu.agents.camille.agit], [16, false, true, true, false, false]);
    v('…les prochains jours fériés (cinq, avec leur date)', [lu.feriesAVenir.length, lu.feriesAVenir[0]], [5, { date: '2026-11-01', nom: 'Toussaint' }]);
    v('GET est ouvert à tout compte de la Tour, fermé sans compte', [(await G(Z.COLLAB)).status, (await G(null)).status], [200, 401]);
    v('POST est réservé au patron (403 pour un collaborateur, 403 sans compte) — et ne modifie rien', [(await P({ astreinte: ['nina'] }, Z.COLLAB)).status, (await P({ astreinte: ['nina'] }, null)).status, contenuHor(Z.D) === DEPART9], [403, 403, true]);

    const sept = (f, i) => { const l = defaut().entreprise.jours.map(j => Object.assign({}, j)); if (f) f(l); return l; };
    const REFUS = [
      ['un corps vide', {}, 'Rien à modifier'],
      ['un champ inconnu', { foo: 1 }, 'Champ inconnu'],
      ['six jours seulement', { entreprise: { jours: sept().slice(0, 6) } }, 'sept jours'],
      ['« ouvert » en chaîne', { entreprise: { jours: sept(l => { l[0].ouvert = 'true'; }) } }, 'true ou false'],
      ['une heure sans zéro (« 9:00 »)', { entreprise: { jours: sept(l => { l[0].debut = '9:00'; }) } }, 'HH:MM'],
      ['une heure impossible (« 25:00 » en fin)', { entreprise: { jours: sept(l => { l[0].fin = '25:00'; }) } }, 'HH:MM'],
      ['« 24:00 » en début', { entreprise: { jours: sept(l => { l[0].debut = '24:00'; }) } }, 'HH:MM'],
      ['une ouverture après la fermeture', { entreprise: { jours: sept(l => { l[1].debut = '18:00'; l[1].fin = '09:00'; }) } }, 'doit venir avant'],
      ['une ouverture égale à la fermeture', { entreprise: { jours: sept(l => { l[1].debut = '09:00'; l[1].fin = '09:00'; }) } }, 'doit venir avant'],
      ['un champ inconnu dans un jour', { entreprise: { jours: sept(l => { l[0].pause = '12:00'; }) } }, 'champ inconnu'],
      ['un jour null chez l’entreprise (réservé aux agents)', { entreprise: { jours: sept(l => { l[2] = null; }) } }, 'un jour est un objet'],
      ['« feries » en chaîne', { entreprise: { feries: 'oui' } }, 'true ou false'],
      ['aucun jour ouvert', { entreprise: { jours: sept(l => l.forEach(j => { j.ouvert = false; })) } }, 'pause générale'],
      ['une entreprise nulle', { entreprise: null }, 'attendu'],
      ['un agent inconnu', { parAgent: { pirate: { feries: false } } }, 'agent inconnu'],
      ['des horaires d’agent mal formés', { parAgent: { lola: { jours: [jour('09:00', '12:00')] } } }, 'sept jours'],
      ['un champ inconnu chez un agent', { parAgent: { lola: { vacances: true } } }, 'attendu'],
      ['une astreinte avec un inconnu', { astreinte: ['max', 'pirate'] }, 'agent inconnu'],
      ['une astreinte qui n’est pas une liste', { astreinte: 'max' }, 'liste'],
    ];
    const sansEcriture = [];
    for (const [nom, corps, motif] of REFUS) {
      const x = await P(corps);
      if (!(x.status === 400 && new RegExp(motif, 'i').test(x.corps.error || '') && contenuHor(Z.D) === DEPART9)) sansEcriture.push(nom + ' → ' + x.status + ' ' + (x.corps && x.corps.error));
    }
    v('(population) ' + REFUS.length + ' corps refusés en 400 avec une phrase lisible, et RIEN n’est écrit sur disque', sansEcriture, []);

    /* un réglage valide */
    const bon = { entreprise: { jours: sept(l => { for (let i = 0; i < 5; i++) { l[i].debut = '08:30'; l[i].fin = '17:45'; } l[5] = { ouvert: false }; }), feries: true },
      parAgent: { lola: { jours: [null, null, null, null, null, jour('09:00', '12:00'), null] } }, astreinte: ['max', 'theo', 'nina'] };
    const ok1 = await P(bon);
    v('un réglage valide : 200, rendu comme le GET', [ok1.status, ok1.corps.entreprise.jours[0], ok1.corps.entreprise.jours[5], ok1.corps.parAgent.lola.jours[5], ok1.corps.astreinte], [200, jour('08:30', '17:45'), { ouvert: false, debut: '09:00', fin: '18:00' }, jour('09:00', '12:00'), ['max', 'theo', 'nina']]);
    v('…écrit atomiquement (aucun .tmp) et relu à l’identique par un module neuf', [fs.readdirSync(Z.D).some(f => /horaires.*\.tmp$/.test(f)), JSON.stringify(HOR({ DATA_DIR: Z.D }).config().entreprise) === JSON.stringify(ok1.corps.entreprise), HOR({ DATA_DIR: Z.D }).config().astreinte], [false, true, ['max', 'theo', 'nina']]);
    Z.horloge.t = U(2026, 11, 2, 7, 29);
    const h1 = Z.agents.peutAgir('camille').ok;
    Z.horloge.t = U(2026, 11, 2, 7, 30);
    v('…et il PREND EFFET : lundi 2 novembre, 8 h 30 CET = 07:30 UTC (07:29 fermé)', [h1, Z.agents.peutAgir('camille').ok], [false, true]);
    Z.horloge.t = U(2026, 11, 2, 16, 44);
    const fer = Z.agents.peutAgir('camille').ok;
    Z.horloge.t = U(2026, 11, 2, 16, 45);
    v('…et ferme à 17 h 45 CET = 16:45 UTC', [fer, Z.agents.peutAgir('camille').ok], [true, false]);
    const avant = fs.readFileSync(path.join(Z.D, 'agents-horaires.json'), 'utf8');
    const ret = await P({ parAgent: { lola: null } });
    v('« parAgent: { lola: null } » retire ses horaires, sans toucher à ceux de l’entreprise ni à l’astreinte (fusion par agent)', [ret.status, ret.corps.parAgent, ret.corps.entreprise.jours[0].debut, ret.corps.astreinte], [200, {}, '08:30', ['max', 'theo', 'nina']]);
    const refait = await P(JSON.parse(JSON.stringify(Object.assign({}, ret.corps, { ok: undefined }))));
    v('un écran qui renvoie tel quel ce que le GET a rendu (ok, maintenant, agents…) est accepté — les champs en lecture seule sont ignorés', refait.status, 200);
    v('un refus après un succès ne change pas le fichier', [(await P({ astreinte: ['pirate'] })).status, fs.readFileSync(path.join(Z.D, 'agents-horaires.json'), 'utf8') === fs.readFileSync(path.join(Z.D, 'agents-horaires.json'), 'utf8'), avant === fs.readFileSync(path.join(Z.D, 'agents-horaires.json'), 'utf8')], [400, true, false]);
    const dernier = fs.readFileSync(path.join(Z.D, 'agents-horaires.json'), 'utf8');
    await P({ astreinte: ['pirate'] });
    v('…(le fichier reste exactement celui du dernier succès)', fs.readFileSync(path.join(Z.D, 'agents-horaires.json'), 'utf8'), dernier);
    v('chaque écriture est au journal des agents, par le patron (« horaires réglés »)', Z.journal().filter(e => e.action === 'horaires').every(e => e.qui === 'Justin' && e.agent === 'systeme'), true);
    vrai('…et la liste des agents donne le résumé des heures (GET /api/monitor/agents)', (await Z.appeler('GET /api/monitor/agents', { tourUser: Z.PATRON })).corps.horaires.actives === true);
    Z.nettoyer();
  }

  console.log('\n10. ⛔ Un registre illisible ARRÊTE les agents — il ne les ouvre pas — et le DIT');
  {
    const cas = [['un JSON cassé', '{"entreprise": {"jours": ['], ['un JSON qui n’est pas un objet', '[1,2,3]'], ['une forme inattendue (trois jours)', JSON.stringify({ entreprise: { jours: [jour('09:00', '18:00'), jour('09:00', '18:00'), jour('09:00', '18:00')], feries: true } })],
      ['une heure absurde', JSON.stringify(Object.assign(defaut(), { entreprise: { jours: defaut().entreprise.jours.map(j => Object.assign({}, j, { fin: '99:99' })), feries: true } }))], ['une astreinte avec un agent inconnu', JSON.stringify(Object.assign(defaut(), { astreinte: ['pirate'] }))]];
    for (const [nom, brut] of cas) {
      const Z = monter({ modes: TOUS, t0: LUNDI, avant: D => fs.writeFileSync(path.join(D, 'agents-horaires.json'), brut), horaires: D => HORA({ DATA_DIR: D }) });
      v('⛔ ' + nom + ' — lundi 9 h, en pleine heure ouvrée : Camille ET Max (l’astreinte) sont arrêtés, pour la raison « horaires_illisibles »', [Z.agents.peutAgir('camille'), Z.agents.peutAgir('max')], [{ ok: false, raison: 'horaires_illisibles' }, { ok: false, raison: 'horaires_illisibles' }]);
      const g = await Z.appeler('GET /api/monitor/agents/horaires', { tourUser: Z.PATRON });
      const p = await Z.appeler('POST /api/monitor/agents/horaires', { tourUser: Z.PATRON, body: { astreinte: ['nina'] } });
      const o = await Z.appeler('POST /api/monitor/agents/horaires/ouvrir', { tourUser: Z.PATRON, body: { jusqua: LUNDI + HEURE } });
      v('…la Tour le DIT : GET, POST et « ouvrir » rendent 503 « illisible », et le fichier n’est PAS réécrit', [g.status, g.corps.illisible, /illisibles/.test(g.corps.error), p.status, o.status, fs.readFileSync(path.join(Z.D, 'agents-horaires.json'), 'utf8') === brut], [503, true, true, 503, 503, true]);
      v('…la liste des agents le dit aussi, et un dépôt de Camille est refusé', [(await Z.appeler('GET /api/monitor/agents', { tourUser: Z.PATRON })).corps.horaires, (await Z.brouillons.deposer({ agent: 'camille', a: 'c@exemple-3021.fr', objet: 'x', texte: 'y', source: 'courrier' })).raison], [{ actives: true, illisible: true }, 'horaires_illisibles']);
      Z.nettoyer();
    }
    const Z = monter({ modes: TOUS, t0: LUNDI, horaires: D => HORA({ DATA_DIR: D }) });
    v('(contre-épreuve) SANS fichier : ce n’est pas illisible, c’est le réglage par défaut — lundi 9 h, Camille agit', [Z.agents.peutAgir('camille').ok, (await Z.appeler('GET /api/monitor/agents', { tourUser: Z.PATRON })).corps.horaires.illisible], [true, false]);
    Z.nettoyer();
  }

  console.log('\n11. Une réunion planifiée tient à son heure, même fermée — pas la pause, pas un registre illisible');
  {
    const CV = require(S('conversations.js')), EQ = require(S('agent-equipe.js')), REU = require(S('reunions.js'));
    const monterReunion = async (o) => {
      const Z = avecHeures(Object.assign({ claude: () => 'Voici mon point de réunion.' }, o));
      const routes = {};
      const app = { get() {}, post(p, ...h) { routes[p] = h[h.length - 1]; } };
      let eq = null, reu = null;
      const conv = CV(app, { DATA_DIR: Z.D, monAdmin() {}, monPatronStrict() {}, agents: Z.agents, maintenant: () => Z.horloge.t, pousseNotif: () => Promise.resolve(), surMessage: m => (eq ? eq.surMessage(m) : null) });
      eq = EQ({ agents: Z.agents, conversations: conv, cerveau: Z.cerveau, faits: {}, memoire: id => (reu ? reu.memoire(id) : '') });
      reu = REU(app, { DATA_DIR: Z.D, monAdmin() {}, monPatronStrict() {}, agents: Z.agents, conversations: conv, cerveau: Z.cerveau, pousseNotif: () => Promise.resolve(), equipe: () => eq, maintenant: () => Z.horloge.t });
      return Object.assign(Z, { conv, reu, routes });
    };
    let Z = await monterReunion({ t0: U(2026, 10, 23, 16) });         // vendredi 23 octobre 18 h à Paris : l'heure de la FERMETURE
    v('vendredi 18 h : l’équipe est fermée (hors_heures)… (le coup d’œil direct)', Z.agents.peutAgir('victor').raison, 'hors_heures');
    let r = Z.reu.tic(); await Z.reu.attendre();
    vrai('⛔ …et la réunion du vendredi se tient quand même : Claude a parlé, les agents ont pris la parole', r.lancee && !r.annulee && Z.recus.length > 3 && Z.conv.lire('reunions', 50).filter(m => m.de !== 'systeme').length > 3, JSON.stringify(r) + ' / ' + Z.recus.length);
    v('…et le serveur la compte tenue (statut « terminée »)', (JSON.parse(fs.readFileSync(path.join(Z.D, 'agents-reunions.json'), 'utf8')).reunions || []).map(x => x.statut), ['terminee']);
    v('⛔ l’exemption ne FUIT pas : une fois la réunion finie, Victor est de nouveau « hors_heures » (elle ne tient qu’à l’intérieur)', Z.agents.peutAgir('victor').raison, 'hors_heures');
    Z.nettoyer();
    /* le lancement à la main de Justin, un soir : la route passe par `demarrer` sans `tic` */
    Z = await monterReunion({ t0: U(2026, 10, 24, 17) });            // samedi 24 octobre, 19 h à Paris
    { const res = { code: 200, corps: null, status(c) { res.code = c; return res; }, json(x) { res.corps = x; return res; } };
      await Z.routes['/api/monitor/agents/reunions/lancer']({ body: { type: 'objectifs' }, tourUser: Z.PATRON, query: {} }, res); await Z.reu.attendre();
      vrai('⛔ Justin lance une réunion un samedi soir : elle se tient (les agents parlent)', res.code === 200 && Z.recus.length > 3 && Z.conv.lire('reunions', 50).filter(m => m.de !== 'systeme').length > 3, JSON.stringify(res.corps) + ' / ' + Z.recus.length); }
    Z.nettoyer();
    /* une réunion annulée faute d'agent allumé se REPREND quand ils le sont (le créneau n'est pas consommé) — même fermés */
    Z = await monterReunion({ t0: U(2026, 10, 23, 16), modes: {}, horaires: D => { fs.writeFileSync(path.join(D, 'agents-horaires.json'), JSON.stringify(cfgDe({ astreinte: [] }))); return HOR({ DATA_DIR: D }); } });   // sans astreinte : personne n'est « ouvert » à 18 h
    for (const id of REG) await Z.appeler('POST /api/monitor/agents/mode', { tourUser: Z.PATRON, body: { agent: id, mode: 'arret' } });
    let r0 = Z.reu.tic();
    v('vendredi 18 h, aucun agent allumé : « Réunion annulée », sans consommer le créneau, aucun appel', [!!r0.annulee, Z.recus.length], [true, 0]);
    for (const id of REG) await Z.appeler('POST /api/monitor/agents/mode', { tourUser: Z.PATRON, body: { agent: id, mode: 'brouillon' } });
    r0 = Z.reu.tic(); await Z.reu.attendre();
    vrai('⛔ …Justin rallume les agents à 18 h 05 : la réunion est reprise (le contrôle de ses participants est lui aussi hors des heures)', !!r0.lancee && Z.recus.length > 3, JSON.stringify(r0));
    Z.nettoyer();
    Z = await monterReunion({ t0: U(2027, 3, 29, 7) });              // lundi de Pâques 2027, 9 h CEST : férié
    v('le lundi de Pâques 2027, 9 h : férié', Z.agents.peutAgir('victor').raison, 'hors_heures');
    r = Z.reu.tic(); await Z.reu.attendre();
    v('…la réunion du lundi a lieu (ce qui est planifié continue de marcher)', [!!r.lancee, Z.recus.length > 3], [true, true]);
    Z.nettoyer();
    Z = await monterReunion({ t0: U(2026, 10, 23, 16) });
    await Z.appeler('POST /api/monitor/agents/pause', { tourUser: Z.PATRON, body: { pause: true } });
    r = Z.reu.tic();
    v('⛔ la PAUSE générale arrête la réunion (seules les heures sont levées)', [r.saute, Z.recus.length], ['pause', 0]);
    Z.nettoyer();
    Z = await monterReunion({ t0: U(2026, 10, 26, 8), avant: D => fs.writeFileSync(path.join(D, 'agents-horaires.json'), '{"cassé"') });
    r = Z.reu.tic(); await Z.reu.attendre();
    v('⛔ un registre d’horaires illisible arrête aussi la réunion : personne ne parle, la réunion est annulée', [Z.recus.length, (JSON.parse(fs.readFileSync(path.join(Z.D, 'agents-reunions.json'), 'utf8')).reunions || []).map(x => x.statut)], [0, ['annulee']]);
    Z.nettoyer();
  }

  console.log('\n12. ⛔ L’examen de l’équipe n’est JAMAIS bloqué par les heures — Justin le lance le soir');
  {
    const EX = require(S('examen.js'));
    const E = EX.monterEquipe({ cle: 'sk-ant-banc-3021-xxxxxxxxxxxxxxxx', maintenant: () => U(2026, 10, 25, 23, 30), allumes: ['camille', 'lea', 'hugo'],
      appeler: async () => ({ texte: 'CATEGORIE : ignorer', entree: 100, sortie: 10, stop_reason: 'end_turn' }) });
    v('dimanche 0 h 30 à Paris : l’équipe d’essai agit', [E.agents.peutAgir('camille').ok, E.agents.peutAgir('lea').ok, E.agents.ouverture('camille')], [true, true, null]);
    E.poste.recevoir(7, { de: 'spam@essai.test', objet: 'GAGNEZ', texte: 'Bonjour cher ami' });
    const x = await E.camille.surNouveauMessage({ boiteId: 'b1', dossier: 'INBOX', uid: 7 });
    v('…et Camille traite un courriel d’essai (jamais « hors_heures »)', [x.saute, x.ignore], [undefined, true]);
    E.fin();
    const nuE = nu(fs.readFileSync(S('examen.js'), 'utf8'));
    v('le module de l’examen ne branche AUCUNE garde horaire sur son équipe d’essai (aucune mention dans son code)', /horaires/i.test(nuE), false);
    const nuIndex = nu(fs.readFileSync(S('index.js'), 'utf8'));
    const iEx = nuIndex.indexOf("require('./examen')(app,");
    vrai('…et l’examen du VRAI serveur est monté sans « horaires »', iEx > 0 && !/horaires/.test(nuIndex.slice(iEx, iEx + 900)), nuIndex.slice(iEx, iEx + 200));
  }

  console.log('\n13. Le câblage d’index.js et la décision de Justin qui attend (accepter hors heures)');
  {
    const idx = nu(fs.readFileSync(S('index.js'), 'utf8'));
    const iAg = idx.indexOf("agentsMod = require('./agents')(app,");
    vrai('les horaires sont montés DANS l’appel qui monte les agents, sous le même « try » (s’ils manquent, les agents ne se montent pas non plus — jamais des agents ouverts faute de garde)', iAg > 0 && /^[\s\S]{0,40}$/.test(idx.slice(idx.lastIndexOf('try {', iAg) + 5, iAg)) && /horaires: require\('\.\/agents-horaires'\)\(\{ DATA_DIR \}\)/.test(idx.slice(iAg, iAg + 400)), idx.slice(iAg, iAg + 300));
    vrai('…la reprise de ce qui a attendu est minutée (une fois par minute)', /setInterval\(\(\) => \{ agentsMod\.reprendreDifferes\(\)/.test(idx));
    const g = idx.slice(idx.indexOf('const MON_GESTES'), idx.indexOf('const MON_ACTIONS_MAX'));
    vrai('les trois écritures sont déclarées dans MON_GESTES (journal des gestes de la Tour)', ["'agents/horaires'", "'agents/horaires/ouvrir'", "'agents/horaires/fermer'"].every(k => g.includes(k)));
    const hs = nu(fs.readFileSync(S('agents-horaires.js'), 'utf8'));
    vrai('les quatre routes sont déclarées EN ENTIER (la table ROUTES_COMMUNES lit `req.route.path`), lecture monAdmin, écriture monPatronStrict', /app\.get\('\/api\/monitor\/agents\/horaires', monAdmin/.test(hs) && /app\.post\('\/api\/monitor\/agents\/horaires', monPatronStrict/.test(hs) && /app\.post\('\/api\/monitor\/agents\/horaires\/ouvrir', monPatronStrict/.test(hs) && /app\.post\('\/api\/monitor\/agents\/horaires\/fermer', monPatronStrict/.test(hs));
    const ag = nu(fs.readFileSync(S('agents.js'), 'utf8'));
    vrai('la garde horaire est dans `peutAgir`, entre le mode et le retour — pas dans chaque agent', /if \(m === 'arret'\) return \{ ok: false, raison: 'arret' \};\s*if \(hor\) \{\s*const h = hor\.peutAgir\(id, maintenant\(\)\)/.test(ag));
    /* accepter une validation hors heures : elle RESTE en attente (comme pendant la pause) */
    const Z = avecHeures({ t0: LUNDI, claude: () => 'CATEGORIE : remboursement' });
    const r = await Z.camille.surNouveauMessage(poserMail(Z, 1, 'valid@exemple-3021.fr'));
    const val = (await Z.validations())[0];
    vrai('lundi 9 h : Camille prépare une réponse, une validation attend Justin', r.depose === true && val && val.statut === 'en_attente', JSON.stringify(r));
    Z.horloge.t = U(2026, 10, 26, 17, 30);          // 18 h 30 à Paris
    const empreinte = Z.brouillons.vue(val.params.fil).empreinte;
    const decider = (id, decision) => Z.appeler('POST /api/monitor/agents/validations/decider', { tourUser: Z.PATRON, body: { id, decision, empreinte } });
    const tard = await decider(val.id, 'accepter');
    v('⛔ lundi 18 h 30 : Justin ACCEPTE — c’est faire envoyer Camille : 409, la validation reste EN ATTENTE, rien ne part, et la phrase dit quand', [tard.status, /Hors des heures de travail de Camille/.test(tard.corps.error), /mardi 27 octobre à 9 h/.test(tard.corps.error), (await Z.validations())[0].statut, Z.envoyes.length], [409, true, true, 'en_attente', 0]);
    Z.horloge.t = U(2026, 10, 27, 8);
    const jour2 = await decider(val.id, 'accepter');
    v('mardi 9 h : la même acceptation passe, le courriel part', [jour2.status, Z.envoyes.length], [200, 1]);
    const Y = avecHeures({ t0: U(2026, 10, 26, 17, 30), claude: () => 'CATEGORIE : remboursement' });
    Y.horloge.t = LUNDI; await Y.camille.surNouveauMessage(poserMail(Y, 1, 'refus@exemple-3021.fr')); Y.horloge.t = U(2026, 10, 26, 17, 30);
    const v2 = (await Y.validations())[0];
    v('REFUSER passe toujours, à toute heure (refuser ne coûte rien)', [(await Y.appeler('POST /api/monitor/agents/validations/decider', { tourUser: Y.PATRON, body: { id: v2.id, decision: 'refuser' } })).status, (await Y.validations())[0].statut], [200, 'refuse']);
    Z.nettoyer(); Y.nettoyer();
  }

  console.log('\n15. La permanence du week-end : deux agents Clients en rotation, jamais le même binôme deux fois de suite, Camille ou Hugo toujours là');
  {
    const PD = Object.assign({}, HOR.PERMANENCE_DEFAUT, { actif: true });   // allumée : la rotation se joue allumée (le défaut du code l'éteint depuis le 28 octobre, `test-3125`)
    v('(population) la permanence allumée : active, les quatre agents Clients, Camille et Hugo piliers, 9 h – 18 h', [PD.actif, PD.agents, PD.piliers, PD.debut, PD.fin], [true, ['camille', 'hugo', 'margaux', 'lea'], ['camille', 'hugo'], '09:00', '18:00']);
    const B = HOR.binomes(PD);
    v('cinq binômes possibles, chacun avec un pilier (Margaux et Léa ne sont jamais seules)', [B.length, B.every(b => b.includes('camille') || b.includes('hugo'))], [5, true]);
    const { h } = fab();
    const garde = []; let samedi = U(2026, 10, 31, 11);
    for (let k = 0; k < 60; k++) { garde.push(HOR.deGarde(PD, HOR.parisParties(samedi + k * 7 * 86400000)).join('+')); }
    v('⛔ soixante week-ends de suite : jamais deux fois le même binôme', garde.every((g, i) => i === 0 || g !== garde[i - 1]), true);
    v('…chaque week-end deux agents, dont toujours Camille ou Hugo — une résiliation est toujours repérée', garde.every(g => g.split('+').length === 2 && /camille|hugo/.test(g)), true);
    v('…les cinq binômes passent tous, à tour de rôle', new Set(garde.slice(0, 5)).size, 5);
    const sam = HOR.deGarde(PD, HOR.parisParties(U(2026, 10, 31, 11))), dim = HOR.deGarde(PD, HOR.parisParties(U(2026, 11, 1, 11)));
    v('le samedi et le dimanche d’un même week-end : le même binôme (31 octobre – 1er novembre)', [sam, dim], [['camille', 'hugo'], ['camille', 'hugo']]);
    v('un vendredi ou un lundi : personne de garde (la semaine suit les heures de l’entreprise)', [HOR.deGarde(PD, HOR.parisParties(U(2026, 10, 30, 11))), HOR.deGarde(PD, HOR.parisParties(U(2026, 11, 2, 11)))], [[], []]);
    v('⛔ le week-end du passage à l’heure d’été (27-28 mars 2027) : le même binôme les deux jours — compté au calendrier', HOR.deGarde(PD, HOR.parisParties(U(2027, 3, 27, 11))), HOR.deGarde(PD, HOR.parisParties(U(2027, 3, 28, 11))));
    /* samedi 31 octobre 2026 (hiver, UTC+1) : 9 h = 08:00 UTC, 18 h = 17:00 UTC */
    v('⛔ samedi 31 octobre : Camille (de garde) ouvre à 9 h et ferme à 18 h, heure de Paris', [h.etatA(U(2026, 10, 31, 7, 59), 'camille').ouvert, h.etatA(U(2026, 10, 31, 8), 'camille').ouvert, h.etatA(U(2026, 10, 31, 16, 59), 'camille').ouvert, h.etatA(U(2026, 10, 31, 17), 'camille').ouvert], [false, true, true, false]);
    v('…elle agit pour de bon (pas une astreinte : elle peut écrire à un client)', h.peutAgir('camille', U(2026, 10, 31, 10)), { ok: true, horsHeures: false });
    v('…Margaux (pas de garde ce week-end) reste fermée, l’entreprise aussi', [h.etatA(U(2026, 10, 31, 10), 'margaux').ouvert, h.etatA(U(2026, 10, 31, 10), null).ouvert], [false, false]);
    v('⛔ la Toussaint tombe un dimanche (1er novembre) : la permanence tient quand même', h.etatA(U(2026, 11, 1, 10), 'hugo').ouvert, true);
    v('…vendredi 18 h, la prochaine ouverture de Camille est samedi 9 h (pas lundi)', h.etatA(U(2026, 10, 30, 17), 'camille').prochaineOuverture, U(2026, 10, 31, 8));
    /* le 15 août 2026 tombe un samedi : une entreprise ouverte le samedi matin est fermée ce jour-là (férié), le binôme de garde travaille quand même */
    const samOuvert = defaut().entreprise; samOuvert.jours[5] = jour('09:00', '12:00');
    const hs = fab(cfgDe({ entreprise: samOuvert })).h, g15 = HOR.deGarde(PD, HOR.parisParties(U(2026, 8, 15, 8)));
    v('⛔ le 15 août (un samedi férié) dans une entreprise ouverte le samedi : fermée pour tous, sauf le binôme de garde (9 h – 18 h)', [hs.etatA(U(2026, 8, 15, 8), null).ouvert, hs.etatA(U(2026, 8, 15, 14), g15[0]).ouvert, hs.etatA(U(2026, 8, 22, 9), null).ouvert], [false, true, true]);
    const eteinte = fab(cfgDe({ permanence: Object.assign(BH.ancien().permanence, { actif: false }) })).h;
    v('permanence éteinte : Camille ne travaille pas le samedi', eteinte.etatA(U(2026, 10, 31, 10), 'camille').ouvert, false);
    const vu = h.vue(U(2026, 10, 28, 10));
    v('la vue dit qui est de garde ce week-end et le suivant', [vu.permanence.ceWeekEnd, vu.permanence.suivant, vu.agents.camille.deGarde, !!vu.agents.margaux.deGarde], [{ samedi: '2026-10-31', agents: ['camille', 'hugo'] }, { samedi: '2026-11-07', agents: ['camille', 'margaux'] }, true, false]);
    const ok = x => !!h.appliquer(x).cfg, err = x => h.appliquer(x).erreur || '';
    v('écrire : la vue renvoyée telle quelle passe (ceWeekEnd et suivant sont ignorés)', ok({ permanence: vu.permanence }), true);
    v('écrire : une autre rotation (Léa et Margaux, sans pilier) passe', ok({ permanence: { actif: true, agents: ['lea', 'margaux'], piliers: [], debut: '10:00', fin: '16:00' } }), true);
    v('refus lisibles : un seul agent, un agent inconnu, un pilier hors de la rotation, une heure mal formée, début après la fin, un champ de trop', [
      err({ permanence: { actif: true, agents: ['camille'], piliers: [] } }), err({ permanence: { actif: true, agents: ['camille', 'pirate'], piliers: [] } }),
      err({ permanence: { actif: true, agents: ['camille', 'hugo'], piliers: ['lea'] } }), err({ permanence: { actif: true, agents: ['camille', 'hugo'], piliers: [], debut: '9:00' } }),
      err({ permanence: { actif: true, agents: ['camille', 'hugo'], piliers: [], debut: '18:00', fin: '09:00' } }), err({ permanence: { actif: true, agents: ['camille', 'hugo'], piliers: [], qui: 1 } })
    ].map(e => /^permanence : /.test(e)), [true, true, true, true, true, true]);
    const fou = fab(cfgDe({ permanence: { actif: true, agents: ['camille', 'inconnu'], piliers: [] } })).h;
    v('⛔ un registre dont la permanence est fausse : tout s’arrête (comme toute forme inattendue)', fou.peutAgir('camille', U(2026, 10, 31, 10)).raison, 'horaires_illisibles');
  }

  console.log('\n14. Le VRAI serveur : la Tour règle les heures, Max répond la nuit, Camille se tait, « ouvrir maintenant » la réveille');
  {
    let webpush;
    try { webpush = require(path.join(RACINE, 'server', 'node_modules', 'web-push')); }
    catch (e) { console.log('  … SAUTÉ : server/node_modules absent'); webpush = null; }
    if (webpush) {
      const PRE = path.join(banc, 'claude.js'), TRACE = path.join(banc, 'recu.jsonl');
      fs.writeFileSync(PRE, `const vrai = globalThis.fetch; let n = 0; globalThis.fetch = async function (url, opts) { const u = String(url && url.url || url);
        if (u.startsWith('https://api.anthropic.com/')) { require('fs').appendFileSync(${JSON.stringify(TRACE)}, String(opts && opts.body) + '\\n'); n++;
          return new Response(JSON.stringify({ id: 'msg_banc', type: 'message', role: 'assistant', model: 'claude-sonnet-5', stop_reason: 'end_turn', content: [{ type: 'text', text: 'Réponse ' + n + ' : je note.' }], usage: { input_tokens: 400, output_tokens: 60 } }), { status: 200, headers: { 'content-type': 'application/json' } }); }
        if (u.startsWith('https://api.stripe.com/')) return new Response('{"data":[],"has_more":false}', { status: 200, headers: { 'content-type': 'application/json' } });
        return vrai.apply(this, arguments); };\n`);
      const kh = k => crypto.createHash('sha256').update(k).digest('hex'); const MDP = 'mot-de-passe-du-banc-3021';
      const recus = () => fs.existsSync(TRACE) ? fs.readFileSync(TRACE, 'utf8').split('\n').filter(Boolean).length : 0;
      const D = path.join(banc, 'serveur', 'data'); fs.mkdirSync(D, { recursive: true });
      fs.writeFileSync(path.join(D, 'espaces.json'), '{}'); fs.writeFileSync(path.join(D, 'clients.json'), '{}');
      const vap = webpush.generateVAPIDKeys();
      fs.writeFileSync(path.join(banc, 'serveur', 'config.json'), JSON.stringify({ vapidPublicKey: vap.publicKey, vapidPrivateKey: vap.privateKey, apiKey: 'banc', adminPassHash: kh(MDP), stripe: { secretKey: 'sk_de_banc_3021' },
        agents: { cleApi: 'sk-ant-banc-3021-xxxxxxxxxxxxxxxx', reunionsAuto: false } }));
      let nreq = 0;
      async function serveur() {
        const PORT = await libre(); let journal = '';
        const e = spawn(process.execPath, ['--require', PRE, S('index.js')], { env: Object.assign({}, process.env, { TEAMOP_CONFIG: path.join(banc, 'serveur', 'config.json'), TEAMOP_DATA: D, PORT: String(PORT), TEAMOP_FB_ADMIN: path.join(banc, 'absente.json'), TEAMOP_PLACES_BASCULE: '2026-01-01T00:00:00Z' }), stdio: ['ignore', 'pipe', 'pipe'] });
        e.stdout.on('data', d => { journal += d; }); e.stderr.on('data', d => { journal += d; }); enfants.push(e);
        const B = 'http://127.0.0.1:' + PORT; let vivant = false;
        for (let i = 0; i < 120 && !vivant; i++) { try { vivant = (await fetch(B + '/health')).ok; } catch (x) {} if (!vivant) await dormir(100); }
        vrai('le serveur démarre', vivant); if (!vivant) { console.log(journal.slice(0, 800)); process.exit(1); }
        const req = async (m, r, c, j) => { const x = await fetch(B + r, { method: m, headers: Object.assign({ 'Content-Type': 'application/json', 'X-Forwarded-For': '10.7.' + Math.floor(nreq++ / 50) + '.1' }, j ? { Authorization: 'Bearer ' + j } : {}), body: m === 'POST' ? JSON.stringify(c || {}) : undefined }); let t = null; try { t = await x.json(); } catch (e2) {} return { s: x.status, j: t }; };
        const jeton = (await req('POST', '/api/monitor/login', { nom: 'Patron', pass: MDP })).j.token;
        return { journal: () => journal, G: r => req('GET', r, null, jeton), P: (r, c) => req('POST', r, c, jeton), arreter: async () => { e.kill('SIGKILL'); await dormir(400); } };
      }
      const parole = async (S1, fil, texte) => { await S1.P('/api/monitor/conversations/envoyer', { fil, texte }); };
      const fil = async (S1, f) => (await S1.G('/api/monitor/conversations/' + f)).j.messages;
      let S1 = await serveur();
      const g0 = await S1.G('/api/monitor/agents/horaires');
      v('le serveur répond au GET des horaires : le réglage par défaut depuis le 28 octobre 2026 (tous les jours 8 h – 24 h, un agent d’astreinte par couche — `test-3125` le détaille)', [g0.s, g0.j.entreprise.jours.map(j => j.ouvert), g0.j.entreprise.jours[0].debut, g0.j.entreprise.jours[0].fin, g0.j.astreinte, g0.j.ouvertJusqua], [200, [true, true, true, true, true, true, true], '08:00', '24:00', ['ines', 'camille', 'max', 'theo', 'louis', 'noah'], null]);
      /* on règle l'entreprise pour qu'elle soit FERMÉE maintenant, quelle que soit l'heure où ce banc tourne : seul demain est ouvré */
      const jsPar = parseInt(new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Paris', weekday: 'short' }).format(new Date()).replace(/Mon/, 1).replace(/Tue/, 2).replace(/Wed/, 3).replace(/Thu/, 4).replace(/Fri/, 5).replace(/Sat/, 6).replace(/Sun/, 7), 10);
      const demain = jsPar % 7;                     // rang (0 = lundi) du lendemain
      const ferme = { entreprise: { jours: [0, 1, 2, 3, 4, 5, 6].map(i => i === demain ? jour('09:00', '10:00') : { ouvert: false, debut: '09:00', fin: '18:00' }) }, astreinte: ['max', 'theo'] };   // Justin ferme l'entreprise ET ne laisse que Max et Théo d'astreinte : ce que ce scénario joue (Camille, elle, se tait hors de ses heures)
      const p1 = await S1.P('/api/monitor/agents/horaires', ferme);
      v('POST des horaires (seul demain 9 h – 10 h est ouvré) : 200, et l’équipe est fermée MAINTENANT', [p1.s, p1.j.maintenant.ouvert], [200, false]);
      const bad = await S1.P('/api/monitor/agents/horaires', { entreprise: { jours: [1, 2] } });
      v('un corps refusé : 400 lisible', [bad.s, /sept jours/.test(bad.j.error)], [400, true]);
      await S1.P('/api/monitor/agents/mode', { agent: 'camille', mode: 'brouillon' }); await S1.P('/api/monitor/agents/mode', { agent: 'max', mode: 'brouillon' });
      await parole(S1, 'camille', 'Camille, où en es-tu du courrier ?');
      await dormir(1200);
      const fc = await fil(S1, 'camille');
      v('⛔ Camille (hors de ses heures) ne répond pas : zéro appel à Claude, et UNE ligne du système dit pourquoi', [recus(), fc.filter(m => m.de === 'camille').length, fc.filter(m => m.de === 'systeme' && /hors des heures de travail/.test(m.texte)).length], [0, 0, 1]);
      await parole(S1, 'max', 'Max, tout va bien cette nuit ?');
      vrai('⛔ Max (d’astreinte) répond, lui, à la même heure : un appel à Claude et sa réponse dans son fil', await att(async () => recus() === 1 && (await fil(S1, 'max')).some(m => m.de === 'max')), 'appels=' + recus());
      const ouv = await S1.P('/api/monitor/agents/horaires/ouvrir', { jusqua: Date.now() + HEURE });
      v('« ouvrir maintenant » (jusqu’à dans une heure) : l’équipe est ouverte', [ouv.s, ouv.j.maintenant.ouvert, ouv.j.maintenant.raison], [200, true, 'ouverture_forcee']);
      await parole(S1, 'camille', 'Camille, et maintenant ?');
      vrai('…Camille répond : un appel de plus, sa réponse dans son fil', await att(async () => recus() === 2 && (await fil(S1, 'camille')).some(m => m.de === 'camille')), 'appels=' + recus());
      const fer = await S1.P('/api/monitor/agents/horaires/fermer', {});
      v('« fermer » : retour aux horaires — fermé', [fer.s, fer.j.maintenant.ouvert, fer.j.ouvertJusqua], [200, false, null]);
      await parole(S1, 'camille', 'Camille, tu es là ?');
      await dormir(1200);
      v('…Camille se tait de nouveau (aucun appel de plus)', recus(), 2);
      const lis = (await S1.G('/api/monitor/agents')).j;
      v('GET /api/monitor/agents : le résumé des heures, et l’équipe fermée', [lis.horaires.actives, lis.horaires.illisible, lis.horaires.ouvert], [true, false, false]);
      await S1.arreter();
      /* le réglage survit à un redémarrage */
      S1 = await serveur();
      const g1 = await S1.G('/api/monitor/agents/horaires');
      v('⛔ après un REDÉMARRAGE le réglage est celui de Justin (écrit sur disque)', [g1.s, g1.j.entreprise.jours.map(j => j.ouvert).indexOf(true) === demain, g1.j.maintenant.ouvert], [200, true, false]);
      await S1.arreter();
      /* le registre est abîmé : TOUS les agents s'arrêtent, Max compris, et la Tour le dit */
      const abime = '{"entreprise": {"jours": [';
      fs.writeFileSync(path.join(D, 'agents-horaires.json'), abime);
      const avantAppels = recus();
      S1 = await serveur();
      const g2 = await S1.G('/api/monitor/agents/horaires');
      v('⛔ registre ILLISIBLE au démarrage : la Tour répond 503 « illisible »', [g2.s, g2.j.illisible, /illisibles/.test(g2.j.error)], [503, true, true]);
      const lis2 = (await S1.G('/api/monitor/agents')).j;
      v('…la liste des agents le dit (illisible)', [lis2.horaires.actives, lis2.horaires.illisible], [true, true]);
      await parole(S1, 'max', 'Max, tu me reçois ?');
      await dormir(1200);
      const fm = await fil(S1, 'max');
      v('⛔ …Max (l’astreinte elle-même) est ARRÊTÉ : aucun appel à Claude, et le fil dit que les horaires sont illisibles', [recus() - avantAppels, fm.filter(m => m.de === 'systeme' && /horaires des agents sont illisibles/.test(m.texte)).length], [0, 1]);
      const pp = await S1.P('/api/monitor/agents/horaires', ferme);
      v('…on ne peut pas régler par-dessus (503), et le fichier abîmé n’est PAS réécrit', [pp.s, fs.readFileSync(path.join(D, 'agents-horaires.json'), 'utf8') === abime], [503, true]);
      vrai('…et le journal du serveur le crie au démarrage', /agents-horaires\.json/.test(S1.journal()) && /illisible|forme inattendue/.test(S1.journal()), S1.journal().slice(0, 300));
      await S1.arreter();
    }
  }

  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.log('  ✗ le banc a jeté : ' + (e && e.stack || e)); console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); process.exit(1); });
