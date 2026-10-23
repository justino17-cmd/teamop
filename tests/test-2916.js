/* ⛔ CE QUE CE FICHIER GARDE — LA TOUR DE HUGO, MARGAUX, EMMA ET SARAH CONTRE LE VRAI SERVEUR (23 octobre 2026).
   Les vraies fonctions `agGe…` de `tour.html` (bloc d'Emma, de Sarah, de Margaux, aperçus et décisions des papiers des agents) parlent au vrai `server/index.js`, isolé sur 127.0.0.1,
   avec un faux Claude, un faux Stripe et un facteur SMTP de banc. Seuls l'écran (render, toast, confirm) et le cadre de page sont des bouchons. Ce qu'on garde, et qu'aucune moitié ne voit seule :
     · l'écran DIT ce que le serveur a répondu : « Annonce envoyée » seulement quand le courriel est parti ; un document illisible ne se dessine JAMAIS « vide » (trois états) ;
     · ⛔ on ne valide QUE ce qu'on a lu : sans l'empreinte du texte lu, la Tour ne demande rien au serveur ; avec un texte réécrit depuis la lecture, le serveur refuse (409) et rien ne part ;
     · le formulaire d'Emma part dans la forme fermée du serveur, et une plage incomplète ne part PAS (l'erreur se dit à l'écran, le serveur n'a rien reçu) ;
     · un collaborateur (non patron) ne peut rien écrire — et la page ne lui propose rien (aucune carte d'agent de gestion, aucun appel d'écriture) ;
     · aucune de ces fonctions n'écrit dans `db` ni ne touche le stockage du navigateur : tout passe par `apiGet` / `apiPost`. */
const fs = require('fs'), path = require('path'), vm = require('vm');
const RACINE = path.join(__dirname, '..');
const { demarrer, dormir } = require('./banc-serveur-gestion.js');
const SRC = fs.readFileSync(path.join(RACINE, 'tour.html'), 'utf8');
const CODE = SRC.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + String(JSON.stringify(b)).slice(0, 300) + '\n      obtenu  : ' + String(JSON.stringify(a)).slice(0, 300)); } };
const vrai = (t, c) => v(t, !!c, true);
const serveurs = [];
const fin = () => { for (const s of serveurs) { try { fs.rmSync(s.banc, { recursive: true, force: true }); } catch (e) {} } };
process.on('exit', fin);
setTimeout(() => { console.log('  ✗ banc FIGÉ au-delà de 200 s'); console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); process.exit(1); }, 200000).unref();

function fonction(nom) {
  const m = new RegExp('\\n(?:async )?function ' + nom + '\\(').exec(CODE); if (!m) return '';
  let k = CODE.indexOf('{', m.index), prof = 0, q = null;
  for (; k < CODE.length; k++) { const c = CODE[k];
    if (q) { if (c === '\\') { k++; continue; } if (c === q) q = null; continue; }
    if (c === "'" || c === '"' || c === '`') { q = c; continue; }
    if (c === '/' && CODE[k + 1] === '/') { k = CODE.indexOf('\n', k); continue; }
    if (c === '{') prof++; else if (c === '}') { prof--; if (!prof) break; } }
  return CODE.slice(m.index + 1, k + 1);
}
const ESC = (/\nfunction esc\(s\)\{.*\n/.exec(CODE) || [''])[0];
const NOMS = ['hAuth', 'srvRepond', 'srvMuet', 'apiGet', 'apiPost', 'msgErreur', 'acSquel', 'fmtDate', 'agParId', 'agNom', 'agMode', 'agParams', 'agEnPause', 'chargerAgents', 'agSec', 'agBrRef', 'agBrCharger', 'agBrApercu',
  'agBrModifier', 'agBrAnnuler', 'agBrEnregistrer', 'agIllisible', 'fmtHeure', 'agTachesDe', 'agDispo', 'agEnCoursTxt', 'agQuiFaitQuoi', 'agDecisionMsg', 'agDecider',
  'agDosCharger', 'agDosOuvrir', 'agDosFermer', 'agDosPaiement', 'agDosFiche', 'agDosListe', 'agCvCharger', 'agCvOuvrir', 'agCvFermer', 'agCvEnvoyer', 'agCvDossier', 'agCvMessage', 'agCvVue'];
const i0 = CODE.indexOf('var AG={'), i1 = CODE.indexOf('\nfunction agParId(');
const g0 = CODE.indexOf('var AGG={'), g1 = CODE.indexOf('\nfunction agDecisionMsg(');
vrai('(population) le bloc des agents et le bloc de gestion sont trouvés dans la Tour', i0 > 0 && i1 > i0 && g0 > i1 && g1 > g0);
vrai('(population) chaque fonction empruntée existe', ESC && NOMS.every(n => fonction(n)));
const GENRES = (CODE.slice(g0, g1).match(/\nfunction (agGe\w+)\(/g) || []).map(x => /function (\w+)/.exec(x)[1]);
vrai('(population) le bloc porte au moins quinze fonctions agGe…', GENRES.length >= 15);

function tour(S, role, confirmer) {
  const toasts = [], etat = { rendus: 0, confirmations: [], ecritures: [] };
  const base = S.B;
  const ctx = { fetch: (u, o) => { if (o && o.method && o.method !== 'GET') etat.ecritures.push(String(u).replace(base, '')); return fetch(u, o); }, API: base, TOKEN: role === 'patron' ? S.TP : S.TA, MYROLE: role, TAB: 'agents',
    Object, String, JSON, Promise, Math, Number, Array, Date, Error, console, parseInt, RegExp, encodeURIComponent,
    srvEtat() {}, doLogout() {}, APPS_TOUR: {}, INJOIGNABLE: 'Serveur injoignable — nouvelle tentative dans un instant.',
    enTete: t => '<h1>' + t + '</h1>', toast: t => toasts.push(t), render() { etat.rendus++; },
    confirm: q => { etat.confirmations.push(q); return confirmer !== false; } };
  vm.createContext(ctx);
  vm.runInContext(ESC + CODE.slice(i0, i1) + '\n' + NOMS.map(fonction).join('\n') + '\n' + CODE.slice(g0, g1), ctx);
  return { ctx, toasts, etat, ag: () => vm.runInContext('AG', ctx), agg: () => vm.runInContext('AGG', ctx) };
}
const att = async (f, ms = 8000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await f()) return true; await dormir(60); } return false; };

(async () => {
  console.log('\n── 2916 · la Tour de Hugo, Margaux, Emma, Sarah : ses vraies fonctions contre le vrai serveur ──');
  try { require(path.join(RACINE, 'server', 'node_modules', 'web-push')); } catch (e) { console.log('  … SAUTÉ : server/node_modules absent (cd server && npm i)'); console.log('\n' + ok + ' ✓  ' + ko + ' ✗'); process.exit(0); }
  const J = 86400000, M = Date.now();
  const CLIENTS = { 'alpha@exemple-2916.fr': { email: 'alpha@exemple-2916.fr', entreprise: 'Alpha Nettoyage', inscrit: M - 3 * J }, 'beta@exemple-2916.fr': { email: 'beta@exemple-2916.fr', entreprise: 'Beta Nettoyage', inscrit: M - 2 * J } };
  const ESPACES = { 'alpha-nettoyage': { t: 't-alpha-2916', nom: 'Alpha Nettoyage', email: 'alpha@exemple-2916.fr', ts: M - 3 * J, formule: 'pro', quantite: 1 }, 'beta-nettoyage': { t: 't-beta-2916', nom: 'Beta Nettoyage', email: 'beta@exemple-2916.fr', ts: M - 2 * J, formule: 'pro', quantite: 1 } };
  const S = await demarrer({ modes: { hugo: 'auto', margaux: 'auto', emma: 'auto', sarah: 'brouillon', camille: 'auto' }, clients: CLIENTS, espaces: ESPACES,
    claude: `(q) => { const sys = q.system || ''; if (/^Tu es Sarah, l’agent « Communication » de TeamOP\\./.test(sys)) return 'Objet : Une nouvelle version d’OP GESTION\\n\\nBonjour,\\n\\nVotre application OP GESTION vient de recevoir une mise à jour : le planning s’affiche plus vite.\\n\\nBien cordialement,'; return 'Bien reçu.'; }` });
  serveurs.push(S);
  if (!S.vivant) { console.log(S.journal().slice(0, 800)); process.exit(1); }

  /* ── 1. Sarah : rédiger, lire, valider ── */
  console.log('\n1. Sarah : la Tour rédige (route fermée), lit le papier, valide AVEC son empreinte');
  const T = tour(S, 'patron');
  await T.ctx.chargerAgents();
  await att(() => T.ag().lec && T.ag().lec.validations === 1);
  vrai('la liste des validations est lue (trois états : 1 = lue)', T.ag().lec.validations === 1);
  T.agg().sarah.notes = 'court';
  await T.ctx.agGeSarahRediger();
  v('⛔ des notes trop courtes ne partent pas : le serveur n\'a reçu aucune écriture, l\'écran le dit', [T.etat.ecritures.length, /dix caractères/.test(T.agg().sarah.msg || '')], [0, true]);
  T.agg().sarah.notes = 'Le planning s’affiche plus vite sur téléphone.'; T.agg().sarah.type = 'version';
  await T.ctx.agGeSarahRediger();
  await att(() => !T.agg().sarah.busy && T.etat.ecritures.length > 0);
  v('la rédaction est demandée au serveur par la route de Sarah, une fois', T.etat.ecritures.filter(x => /sarah\/rediger/.test(x)), ['/api/monitor/agents/sarah/rediger']);
  vrai('l\'écran dit le résultat du serveur (déposée dans « Validations »)', /déposée dans « Validations »/.test(T.agg().sarah.msg || ''));
  await T.ctx.chargerAgents();
  await att(() => T.agg().lec === 1 && Object.keys(T.agg().d).length === 1);
  const val = T.ag().validations.find(x => x.type === 'annonce_clients');
  vrai('la validation d\'annonce est dans la liste, reconnue par agGeType', val && T.ctx.agGeType(val));
  const ref = val && val.params.ref, doc = T.agg().d[ref];
  vrai('le document est lu avec son empreinte et sa cible', doc && /^[0-9a-f]{32}$/.test(doc.empreinte || '') && /Tous les clients \(2 entreprises\)/.test(doc.cible));
  const ligne = T.ctx.agGeLigne(val);
  vrai('la ligne montre l\'aperçu et le bouton « Valider et envoyer à tous »', /Valider et envoyer à tous/.test(ligne) && /Tous les clients \(2 entreprises\)/.test(ligne) && /Une nouvelle version/.test(ligne));
  /* sans lecture : la Tour ne demande rien */
  const T2 = tour(S, 'patron'); T2.ag().validations = T.ag().validations;
  T2.ctx.agGeDecider(val.id, 'accepter');
  v('⛔ sans avoir LU le document, « valider » ne demande rien au serveur', [T2.etat.ecritures.length, T2.etat.confirmations.length, /pas été lu/.test(T2.toasts[0] || '')], [0, 0, true]);
  /* un texte réécrit après la lecture : 409, rien ne part */
  await S.post('/api/monitor/agents/documents/modifier', { ref, objet: 'Une nouvelle version d’OP GESTION', texte: 'Bonjour,\n\nTexte réécrit entre-temps.\n\nBien cordialement,' });
  T.etat.confirmations.length = 0; T.etat.ecritures.length = 0;
  await T.ctx.agGeDecider(val.id, 'accepter');
  await att(() => T.toasts.length > 0);
  v('⛔ le texte a été réécrit depuis la lecture : le serveur refuse (409), la Tour le dit, rien ne part', [(await S.courriels()).length, /changé|relu|refus/i.test(T.toasts[T.toasts.length - 1] || '')], [0, true]);
  /* relire, puis valider */
  await T.ctx.chargerAgents(); await att(() => T.agg().d[ref] && T.agg().d[ref].empreinte !== doc.empreinte);
  vrai('l\'aperçu est relu avec le texte à jour', T.agg().d[ref].empreinte !== doc.empreinte && /réécrit entre-temps/.test(T.agg().d[ref].texte));
  T.etat.confirmations.length = 0; T.toasts.length = 0;
  await T.ctx.agGeDecider(val.id, 'accepter');
  await att(() => T.toasts.length > 0);
  vrai('la Tour demande confirmation avec le nombre d\'entreprises, puis le serveur envoie', T.etat.confirmations.length === 1 && /2 entreprises/.test(T.etat.confirmations[0]));
  await S.attendre(async () => (await S.courriels()).length >= 2);
  const cs = await S.courriels();
  v('UN courriel par entreprise est parti, et l\'écran dit « partie »', [cs.length, /L’annonce est partie/.test(T.toasts[0] || '')], [2, true]);
  /* ── 2. Emma : le formulaire ── */
  console.log('\n2. Emma : le formulaire part dans la forme fermée, une plage incomplète ne part pas');
  const TE = tour(S, 'patron');
  await TE.ctx.agGeEmmaCharger(); await att(() => TE.agg().emma.lec === 1);
  vrai('les disponibilités sont lues (état 1) : 7 jours, deux plages chacun', TE.agg().emma.lec === 1 && Object.keys(TE.agg().emma.f.jours).length === 7 && TE.agg().emma.f.jours[1].length === 2);
  TE.ctx.agGeEmmaChamp('actif', true); TE.ctx.agGeEmmaChamp('nb', '4');
  TE.ctx.agGeEmmaPlage(1, 0, 0, '09:00'); TE.ctx.agGeEmmaPlage(1, 0, 1, '12:00'); TE.ctx.agGeEmmaPlage(3, 0, 0, '10:00');
  await TE.ctx.agGeEmmaEnregistrer();
  v('⛔ une plage sans heure de fin ne part PAS : aucune écriture, l\'erreur se dit', [TE.etat.ecritures.length, /Mer : une plage a besoin/.test(TE.agg().emma.err || '')], [0, true]);
  TE.ctx.agGeEmmaPlage(3, 0, 0, '');
  await TE.ctx.agGeEmmaEnregistrer(); await att(() => TE.etat.ecritures.length > 0 && !TE.agg().emma.busy);
  const dispo = S.fichier('agents-emma.json');
  v('le serveur a rangé la forme fermée : actif, 4 créneaux, lundi 09:00–12:00', [dispo.dispo.actif, dispo.dispo.nb, JSON.stringify(dispo.dispo.jours[1])], [true, 4, '[["09:00","12:00"]]']);
  TE.agg().emma.dos = 'pas un dossier';
  const avant = TE.etat.ecritures.length;
  await TE.ctx.agGeEmmaProposer();
  v('⛔ un numéro de dossier mal formé ne part pas', [TE.etat.ecritures.length - avant, /DOS- suivi de six chiffres/.test(TE.agg().emma.err || '')], [0, true]);
  /* ── 3. Margaux ── */
  console.log('\n3. Margaux : le passage à la demande rend son compte');
  const TM = tour(S, 'patron');
  await TM.ctx.agGeMargaux(); await att(() => !TM.agg().margaux.busy && TM.agg().margaux.msg);
  vrai('l\'écran dit ce que le serveur a compté (impayés examinés, relances)', /impayés? examinés?/.test(TM.agg().margaux.msg || '') || /rien/i.test(TM.agg().margaux.msg || ''));
  /* ── 4. un collaborateur ── */
  console.log('\n4. Un collaborateur : la page ne propose rien, et ne demande rien');
  const TC = tour(S, 'collaborateur');
  vrai('aucune carte de gestion pour un collaborateur', ['emma', 'sarah', 'margaux', 'hugo'].every(id => TC.ctx.agGeCarte({ id }, 'auto') === ''));
  TC.agg().sarah.notes = 'Le planning s’affiche plus vite sur téléphone.'; TC.agg().emma.f = TC.ctx.agGeEmmaForme({ actif: true, jours: {} }); TC.agg().emma.dos = 'DOS-000001';   // de quoi ÉCRIRE : seule la garde du rôle doit les retenir
  await TC.ctx.agGeSarahRediger(); await TC.ctx.agGeMargaux(); await TC.ctx.agGeEmmaProposer(); await TC.ctx.agGeEmmaEnregistrer(); TC.ctx.agGeModifier('dc000000000000'); TC.ctx.agGeDecider('x', 'refuser');
  v('⛔ aucune écriture ne part de la page d\'un collaborateur', TC.etat.ecritures, []);
  const direct = await S.post('/api/monitor/agents/sarah/rediger', { type: 'version', notes: 'Une nouvelle version avec un planning plus rapide.' }, S.TA);
  v('…et le serveur refuse de toute façon (403)', direct.s, 403);
  /* ── 5. un document illisible ne se dessine pas « vide » ── */
  console.log('\n5. Un document que le serveur ne rend pas : trois états');
  const TI = tour(S, 'patron');
  TI.ag().validations = [{ id: 'vx', ts: M, agent: 'sarah', type: 'annonce_clients', resume: 'Annonce', params: { ref: 'dc0123456789ab' }, statut: 'en_attente' }];
  await TI.ctx.agGeCharger(); await att(() => TI.agg().lec !== 0);
  const lig = TI.ctx.agGeLigne(TI.ag().validations[0]);
  vrai('⛔ référence inconnue : la ligne dit « n’a pas pu être lu », le bouton de validation est GRISÉ (jamais un aperçu vide validable)', /n’a pas pu être lu/.test(lig) && /class="ag-btn ok" disabled/.test(lig));
  /* ── 6. ni db ni stockage ── */
  console.log('\n6. Aucun accès direct au stockage ni à `db`');
  const BLOC = CODE.slice(g0, g1);
  vrai('le bloc n\'écrit ni dans localStorage, ni dans sessionStorage, ni dans `db`, et n\'appelle pas fetch directement', !/localStorage|sessionStorage|\bdb\.|\bfetch\(/.test(BLOC));
  vrai('toutes ses écritures passent par apiPost (route de la liste fermée)', (BLOC.match(/apiPost\('([^']+)'/g) || []).every(x => /agents\/(documents\/modifier|validations\/decider|emma\/disponibilites|emma\/proposer|sarah\/rediger|margaux\/passer)/.test(x)));
  await S.fin();
  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.log('  ✗ banc mort : ' + (e && e.stack || e)); console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); process.exit(1); });
