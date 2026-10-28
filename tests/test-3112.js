/* ══ test-3112 — LES DEUX GÉNÉRATEURS DE DEVIS PARLENT LE MÉTIER DE L'ENTREPRISE (assistant et « Devis IA ») ══════════
   Avant : `server/agent-devis.js` et la route `/api/devis/generer` étaient écrits pour la 3D (dératisation, Certibiocide,
   fourchettes de prix de la dératisation, TVA des logements) et servis tels quels à toute entreprise. Une entreprise de
   nettoyage qui ouvrait l'assistant recevait des devis de punaises de lit. Maintenant : une consigne par métier, choisie par
   `server/devis-metier.js` — l'ANNUAIRE d'abord, le corps de la requête seulement pour un espace sans fiche (la bêta),
   et la 3D d'AVANT pour qui n'a pas de métier réglé (les entreprises existantes, ELAN comprise, ne perdent rien).

   Ce que ce banc joue, et pourquoi (voir CLAUDE.md : « un banc qui passe ne prouve rien tant qu'on ne l'a pas vu ÉCHOUER ») :
   · 1. la consigne 3D est IDENTIQUE à celle d'avant, octet pour octet — empreinte relevée sur `d045e0dd` AVANT toute
        modification, pour trois contextes (dont 70 clients : la limite de 60 clients envoyés à Anthropic) ; idem la phrase
        du « Devis IA » ;
   · 2. le cerveau NETTOYAGE ne porte aucun mot d'anti-nuisibles, aucun prix inventé, aucune TVA à 10 % ; le cerveau
        GÉNÉRIQUE, joué sur les 21 autres métiers du VRAI `metiers.json`, n'emprunte rien à la 3D ; les trois partagent
        EXACTEMENT les mêmes blocs de contexte (ce qui part chez Anthropic ne change pas : nom, adresse, ville) ;
   · 3. `resoudreMetier` : l'annuaire décide ; le corps ne décide jamais pour une entreprise de l'annuaire ; borné à la liste
        fermée pour un espace sans fiche ; `__proto__`, casse, longueur ;
   · 4. la VRAIE route `/api/devis/agent` (Express, faux client Anthropic injecté) : accès refusé = métier jamais lu et
        Claude jamais appelé ; chaque cas de métier ; un crochet qui jette retombe sur la 3D ; TVA par défaut ;
   · 5. le VRAI serveur (`server/index.js`, isolé, un faux service Claude par `ANTHROPIC_BASE_URL`) : les DEUX routes
        lisent le même métier pour la même entreprise — c'est le câblage (le montage ligne ~680 d'index.js précède la
        définition de `metierOk` : une valeur lue au montage serait en zone morte temporelle, et ce banc-là le voit).
   Les motifs de lecture visent du CODE (commentaires retirés), jamais une phrase. */
'use strict';
const fs = require('fs'), path = require('path'), os = require('os'), net = require('net'), http = require('http');
const crypto = require('crypto');
const { spawn } = require('child_process');
const RACINE = path.join(__dirname, '..');
const lire = f => fs.readFileSync(path.join(RACINE, f), 'utf8');
const sansCom = s => s.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
const sha = s => crypto.createHash('sha256').update(s).digest('hex');
let ok = 0, ko = 0;
const vrai = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '  → ' + JSON.stringify(d).slice(0, 400) : '')); } };
const v = (t, a, b) => vrai(t, JSON.stringify(a) === JSON.stringify(b), a);

const MOD = require(path.join(RACINE, 'server', 'devis-metier.js'));
let AGENT = null;
try { AGENT = require(path.join(RACINE, 'server', 'agent-devis.js')); } catch (e) { /* sans server/node_modules (le SDK) : les parties qui le montent sautent */ }

/* ── Ce que le texte d'un cerveau nettoyage ne doit JAMAIS porter (le métier d'à côté) ── */
const ANTI = /d[ée]ratisation|d[ée]sinsectisation|nuisible|rongeur|app[âa]t|\bpostes?\b|\bbox(?:es)?\b|biocide|TP ?14|TP ?18|certibiocide|HACCP|\b3D\b|punaise|cafard|termite|frelon/i;
const PRIX_FOURCHETTE = /\d+\s*[–-]\s*\d+\s*€/;     // « 150–450 € » : une fourchette de prix écrite dans la consigne
const DIX_POURCENT = /\b10 ?%/;

const CTX = { societes: ['3D Sud-Ouest SARL', 'Hygiène Atlantique'], clients: [{ nom: 'Mme Martin', adresse: '12 rue des Lilas', ville: 'Rochefort' }, { nom: 'Boulangerie Dupont' }] };
const clients70 = []; for (let i = 0; i < 70; i++) clients70.push({ nom: 'Client ' + i, adresse: i % 2 ? '' : 'rue ' + i, ville: i % 3 ? '' : 'Ville ' + i });
const CTX70 = { societes: ['A', '', 'B'], clients: clients70 };

/* Empreintes relevées sur `d045e0dd` (server/agent-devis.js d'origine, et la chaîne `sys` d'index.js), AVANT toute modification. */
const EMPREINTE_3D = { ctx: '0ae26971f4cbdd68a5e2622020e61133dac8b2cf5454416a93168c5ba587767f', vide: '08050559b21b7a97af931fb54be62dcc3cdfd29898a4e6661052863299045845',
  ctx70: 'bc4ad8efaacfed882c0ad2f8f7f1fd29bb7670af0457886e7e82261ae50a8e49', generer: '368ceb8e3e17f58d742fac1146a37783061084c9ee406f02e82e448031b72783' };

console.log('\n── 3112 · le devis parle le métier de l\'entreprise ──');

/* ══ 1. LA 3D NE CHANGE PAS ══ */
console.log('\n1. La consigne 3D est celle d\'avant, octet pour octet');
if (!AGENT) console.log('  … SAUTÉ (sans server/node_modules, le SDK d\'Anthropic manque)');
else {
  v('assistant : même consigne, contexte nominal (empreinte d\'avant)', sha(AGENT.construireSystem(CTX)), EMPREINTE_3D.ctx);
  v('…métier « 3d » : la même', sha(AGENT.construireSystem(CTX, '3d')), EMPREINTE_3D.ctx);
  v('…métier « » (rien de réglé) : la même', sha(AGENT.construireSystem(CTX, '')), EMPREINTE_3D.ctx);
  v('…contexte vide', sha(AGENT.construireSystem({})), EMPREINTE_3D.vide);
  v('…70 clients (les 60 premiers seulement) et des champs vides', sha(AGENT.construireSystem(CTX70)), EMPREINTE_3D.ctx70);
  const s70 = AGENT.construireSystem(CTX70);
  vrai('(population) la consigne de 70 clients porte « Client 59 » et pas « Client 60 »', /- Client 59\b/.test(s70) && !/- Client 60\b/.test(s70));
}
v('« Devis IA » : même phrase que celle d\'avant (empreinte d\'avant)', sha(MOD.devisSysPour('')), EMPREINTE_3D.generer);
v('…métier « 3d » : la même', sha(MOD.devisSysPour('3d')), EMPREINTE_3D.generer);
v('…la constante exportée est celle-là', sha(MOD.DEVIS_SYS_3D), EMPREINTE_3D.generer);

/* ══ 2. LES CERVEAUX NETTOYAGE ET GÉNÉRIQUE ══ */
console.log('\n2. Le cerveau nettoyage et le cerveau générique n\'empruntent rien à la 3D');
const METIERS = JSON.parse(lire('metiers.json'));
const AUTRES = Object.keys(METIERS.metiers).filter(k => k !== '3d' && k !== 'nettoyage');
if (!AGENT) console.log('  … SAUTÉ (SDK absent)');
else {
  const N = AGENT.construireSystem(CTX, 'nettoyage');
  vrai('(population) le cerveau nettoyage est un vrai texte, avec ses sociétés, ses clients et ses règles', N.length > 1500 && /SOCIÉTÉS ÉMETTRICES POSSIBLES/.test(N) && /- Mme Martin — 12 rue des Lilas Rochefort/.test(N) && /RÈGLES MÉTIER ABSOLUES/.test(N), N.length);
  const mots = (N.match(new RegExp(ANTI.source, 'gi')) || []);
  // « 3D Sud-Ouest SARL » vient du CONTEXTE d'entreprise (une société nommée ainsi), pas de la consigne : on cherche dans la consigne seule
  const consigneN = N.slice(0, N.indexOf('SOCIÉTÉS ÉMETTRICES')) + N.slice(N.indexOf('CHOIX DE LA SOCIÉTÉ'));
  v('⛔ aucun mot d\'anti-nuisibles dans la consigne nettoyage', (consigneN.match(new RegExp(ANTI.source, 'gi')) || []), []);
  vrai('(population) le contrôle regarde bien du texte : « nettoyage » et « m² » y sont', /nettoyage/i.test(consigneN) && /m²/.test(consigneN));
  vrai('⛔ aucune fourchette de prix écrite (« 150–450 € »)', !PRIX_FOURCHETTE.test(N));
  vrai('⛔ aucune TVA à 10 %', !DIX_POURCENT.test(N));
  vrai('TVA 20 % par défaut, tva_taux toujours renseigné, doute → question', /TVA : 20 % par défaut/.test(N) && /Renseigne toujours tva_taux/.test(N) && /demande/.test(N));
  vrai('aucun prix inventé : le tarif de l\'entreprise est demandé, « heures × taux » à valider', /N'invente AUCUNE fourchette de prix/.test(N) && /heures × taux/.test(N));
  vrai('aucune obligation, norme ni convention collective que l\'utilisateur n\'a pas dite', /aucune obligation réglementaire, norme, garantie ni\s+convention collective/.test(N));
  vrai('l\'outil exige encore la dernière ligne à quantité 1 et ttc_cible', /DERNIÈRE ligne doit toujours avoir une quantité de 1/.test(N) && /ttc_cible/.test(N));

  /* Le contexte transmis à Anthropic est le MÊME dans les trois cerveaux : les deux blocs, au caractère près. */
  const bloc = s => s.slice(s.indexOf('SOCIÉTÉS ÉMETTRICES POSSIBLES'), s.indexOf('CHOIX DE LA SOCIÉTÉ'));
  const G = AGENT.construireSystem(CTX, 'plomberie', { nom: 'Plomberie', types: ['Dépannage'], presta: ['Recherche de fuite'] });
  const T = AGENT.construireSystem(CTX);
  v('le contexte client (sociétés + clients) est identique dans la 3D, le nettoyage et le générique', [bloc(N) === bloc(T), bloc(G) === bloc(T), bloc(T).length > 100], [true, true, true]);
  const N70 = AGENT.construireSystem(CTX70, 'nettoyage'), G70 = AGENT.construireSystem(CTX70, 'plomberie', { nom: 'P', types: [], presta: [] });
  vrai('…60 clients au plus, dans chacun', [N70, G70].every(s => /- Client 59\b/.test(s) && !/- Client 60\b/.test(s)));
  vrai('un champ de plus sur un client (téléphone) ne part jamais', !/0612345678/.test(AGENT.construireSystem({ societes: [], clients: [{ nom: 'Mme Test', adresse: 'rue X', ville: 'Y', telephone: '0612345678', email: 'x@y.fr' }] }, 'nettoyage')));

  /* Le générique, sur chacun des 21 autres métiers du VRAI référentiel. */
  const libelles = {};
  let fautifs = [], sansVoc = [];
  for (const k of AUTRES) {
    const m = METIERS.metiers[k];
    const voc = MOD.vocabulaireDe(METIERS, kk => METIERS.metiers[kk].nom, k);
    libelles[k] = voc.nom;
    const G1 = AGENT.construireSystem(CTX, k, voc);
    if (!voc.nom || !G1.includes('métier : ' + voc.nom)) fautifs.push(k + ':nom');
    if (m.types && m.types.length && !G1.includes(String(m.types[0]).slice(0, 80))) sansVoc.push(k);
    if (/certibiocide|hygiéniste|150–450|\bTP ?1[48]\b/i.test(G1.slice(0, G1.indexOf('SOCIÉTÉS ÉMETTRICES')) + G1.slice(G1.indexOf('CHOIX DE LA SOCIÉTÉ'))) || PRIX_FOURCHETTE.test(G1) || DIX_POURCENT.test(G1)) fautifs.push(k + ':3D');
  }
  vrai('(population) les 21 autres métiers du référentiel sont joués', AUTRES.length >= 20, AUTRES.length);
  v('⛔ chacun nomme son métier et n\'emprunte ni Certibiocide, ni TP14/18, ni fourchette, ni 10 %', fautifs, []);
  v('…et reprend son premier type d\'intervention du référentiel', sansVoc, []);
  // le gabarit seul, SANS vocabulaire : aucun mot d'anti-nuisibles venant du modèle de texte
  const Gvide = AGENT.construireSystem({}, 'plomberie', { nom: 'Plomberie', types: [], presta: [] });
  v('⛔ le gabarit générique (sans vocabulaire) ne porte aucun mot d\'anti-nuisibles', (Gvide.match(new RegExp(ANTI.source, 'gi')) || []), []);
  vrai('…ni sans voc du tout (référentiel illisible) : il dit « non précisé » et reste un texte entier', /métier : non précisé/.test(AGENT.construireSystem({}, 'plomberie', null)) && AGENT.construireSystem({}, 'plomberie', null).length > 1200);
  vrai('le générique ne dit RIEN du droit d\'un métier : pas de « conforme », « norme NF », « convention » hors la règle d\'interdiction', !/conforme|NF EN|DTU|IDCC/.test(Gvide));

  /* un métier ouvert hors liste fournie au cerveau (voc null) ne retombe PAS sur la 3D */
  vrai('un métier réglé mais sans vocabulaire lisible reçoit le générique, jamais la 3D', !/Certibiocide|hygiéniste/.test(AGENT.construireSystem(CTX, 'froid', null)));
}
/* « Devis IA » : nettoyage et générique */
{
  const sn = MOD.devisSysPour('nettoyage'), sg = MOD.devisSysPour('plomberie', { nom: 'Plomberie' });
  v('« Devis IA » nettoyage : aucun mot d\'anti-nuisibles, TVA 20 par défaut sans règle de logement', [(sn.match(new RegExp(ANTI.source, 'gi')) || []), /TVA 20 par défaut\./.test(sn), /logement/.test(sn)], [[], true, false]);
  v('« Devis IA » générique : nomme le métier, aucun mot d\'anti-nuisibles', [/métier : Plomberie/.test(sg), (sg.match(new RegExp(ANTI.source, 'gi')) || [])], [true, []]);
  vrai('(population) ces phrases sont entières : lignes, désignation, remarque', [sn, sg].every(s => s.length > 400 && /remarque/.test(s) && /désignation/.test(s)));
}
v('TVA par défaut quand le modèle n\'en donne pas : 10 pour la 3D (comme avant), 20 pour les autres', [MOD.tvaParDefaut(''), MOD.tvaParDefaut('3d'), MOD.tvaParDefaut('nettoyage'), MOD.tvaParDefaut('plomberie')], [10, 10, 20, 20]);

/* ══ 3. OÙ LE MÉTIER SE LIT ══ */
console.log('\n3. resoudreMetier : l\'annuaire décide, le corps ne décide pas pour une entreprise de l\'annuaire');
const OUVERTS = ['3d', 'plomberie', 'nettoyage', 'froid'];
const metierOk = m => (OUVERTS.includes(m) ? m : '');
const ANNUAIRE = { 'ent-net': { metier: 'nettoyage' }, 'ent-3d': { metier: '3d' }, 'ent-vide': { metier: '' }, 'ent-sansch': {}, 'ent-inconnu': { metier: 'metier-ferme' } };
const espaceDe = t => (Object.prototype.hasOwnProperty.call(ANNUAIRE, t) ? ANNUAIRE[t] : null);
const R = (t, m) => MOD.resoudreMetier(t, m, { espaceDe, metierOk });
v('entreprise de nettoyage de l\'annuaire → nettoyage', R('ent-net', ''), 'nettoyage');
v('⛔ …et le corps n\'y change rien (il dit « 3d », « plomberie », n\'importe quoi)', ['3d', 'plomberie', 'zzz', '__proto__'].map(m => R('ent-net', m)), ['nettoyage', 'nettoyage', 'nettoyage', 'nettoyage']);
v('⛔ entreprise 3D de l\'annuaire : le corps « nettoyage » ne la fait pas changer de consigne', R('ent-3d', 'nettoyage'), '3d');
v('⛔ entreprise sans métier réglé : la 3D d\'avant (« »), même si le corps dit « nettoyage »', [R('ent-vide', 'nettoyage'), R('ent-sansch', 'nettoyage')], ['', '']);
v('métier fermé ou inconnu dans l\'annuaire → la 3D d\'avant (on ne retire rien à qui l\'avait)', R('ent-inconnu', 'nettoyage'), '');
v('espace SANS fiche (bêta, démonstration) : le corps décide, borné à la liste ouverte', [R('opgestion-beta', 'nettoyage'), R('opgestion-beta', 'plomberie'), R('opgestion-beta', 'froid')], ['nettoyage', 'plomberie', 'froid']);
v('…un métier hors liste, vide ou hostile → la 3D', [R('opgestion-beta', 'zzz'), R('opgestion-beta', ''), R('opgestion-beta', '__proto__'), R('opgestion-beta', 'constructor'), R('opgestion-beta', null), R('opgestion-beta', { a: 1 })], ['', '', '', '', '', '']);
v('…la casse et les espaces sont tolérés, la longueur bornée', [R('opgestion-beta', '  Nettoyage '), R('opgestion-beta', 'nettoyage' + ' '.repeat(100) + 'x')], ['nettoyage', '']);
v('sans identifiant d\'équipe : le corps décide aussi (le « Devis IA » avec le code partagé), borné', [R('', 'nettoyage'), R(undefined, 'plomberie'), R('', 'zzz'), R('', '')], ['nettoyage', 'plomberie', '', '']);
v('sans métier ni crochets, le cerveau est celui d\'avant', [MOD.resoudreMetier('x', 'nettoyage', {}), MOD.resoudreMetier('x', 'nettoyage', null)], ['', '']);
{
  /* l'identifiant est borné : un `t` de 10 000 signes ne se cherche pas en entier dans l'annuaire */
  let vu = ''; MOD.resoudreMetier('t'.repeat(10000), '', { espaceDe: t => { vu = t; return null; }, metierOk });
  v('l\'identifiant cherché est borné à 80 signes', vu.length, 80);
}

/* ══ 4. LE CÂBLAGE DANS index.js (lecture du CODE, commentaires retirés) ══ */
console.log('\n4. Le câblage, lu dans le code');
{
  const IDX = sansCom(lire('server/index.js')), AG = sansCom(lire('server/agent-devis.js'));
  vrai('le montage de l\'assistant passe les deux crochets', /monterAgentDevis\(app, config, DATA_DIR, \{ metierDe: devisMetierDe, vocabulaire: devisVocabulaire \}\)/.test(IDX));
  vrai('⛔ les crochets sont des DÉCLARATIONS de fonction (remontées) — le montage précède `metierOk` ; une constante serait en zone morte', /\nfunction devisMetierDe\(t, metierCorps\) \{/.test(IDX) && /\nfunction devisVocabulaire\(metier\) \{/.test(IDX) && !/(?:const|let) devisMetierDe\b/.test(IDX));
  vrai('devisMetierDe lit l\'ANNUAIRE (espaceParT) et metierOk', /resoudreMetier\(t, metierCorps, \{ espaceDe: espaceParT, metierOk \}\)/.test(IDX));
  const g0 = IDX.indexOf("app.post('/api/devis/generer'"), g1 = IDX.indexOf("app.post('/api/devis/generer'") + 4000;
  const G = g0 < 0 ? '' : IDX.slice(g0, g1);
  vrai('(population) la route « Devis IA » est trouvée', g0 > 0 && /devisMoteurChoisi/.test(G));
  vrai('⛔ le « Devis IA » choisit sa phrase par le MÊME métier (devisMetierDe sur `team`) et plus de chaîne 3D en dur', /devisMetierDe\(teamKey, \(req\.body \|\| \{\}\)\.metier\)/.test(G) && /devisSysPour\(metierDevis,/.test(G) && !/entreprise française de gestion de nuisibles/.test(G));
  vrai('⛔ aucune phrase de la 3D ne reste dans index.js hors du module (une seule définition)', !/gestion de nuisibles/.test(IDX));
  vrai('l\'assistant lit le métier APRÈS les contrôles d\'accès (un refus ne le lit pas)', AG.indexOf('metierDe(') > AG.indexOf('quota.reste() <= 0') && AG.indexOf('metierDe(') > AG.indexOf('memeSecret(req.headers'));
  vrai('…avec `t` (borné) et `metier` du corps, et le résultat part dans construireSystem', /metierDe\(txt\(\(req\.body \|\| \{\}\)\.t, 80\), txt\(\(req\.body \|\| \{\}\)\.metier, 40\)\)/.test(AG) && /construireSystem\(contexte, metier, voc\)/.test(AG));
  vrai('le modèle de l\'assistant n\'a pas changé', /const MODEL = 'claude-sonnet-5';/.test(AG));
  vrai('⛔ le contexte transmis est inchangé : nom, adresse, ville — rien de plus', /nom: txt\(c && c\.nom, 80\), adresse: txt\(c && c\.adresse, 120\), ville: txt\(c && c\.ville, 60\)/.test(AG));
}

/* ══ 5. LA VRAIE ROUTE /api/devis/agent (faux client injecté) ══ */
const libre = () => new Promise(r => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => r(p)); }); });
const dormir = ms => new Promise(r => setTimeout(r, ms));
const banc = fs.mkdtempSync(path.join(os.tmpdir(), 'b3112-'));
const enfants = [];
process.on('exit', () => { for (const e of enfants) { try { e.kill('SIGKILL'); } catch (x) {} } try { fs.rmSync(banc, { recursive: true, force: true }); } catch (x) {} });
setTimeout(() => { console.log('  ✗ banc FIGÉ au-delà de 150 s'); process.exit(1); }, 150000).unref();

(async () => {
  const dispo = fs.existsSync(path.join(RACINE, 'server', 'node_modules', 'express')) && AGENT;
  if (!dispo) { console.log('\n  … parties 5 et 6 SAUTÉES : server/node_modules absent (cd server && npm i)'); console.log('\n' + ok + ' ✓  ' + ko + ' ✗'); process.exit(ko ? 1 : 0); }
  const express = require(path.join(RACINE, 'server', 'node_modules', 'express'));

  console.log('\n5. La route de l\'assistant, jouée (Express réel, faux client Anthropic)');
  const appels = [];            // chaque appel au faux client : { system, model }
  let scenario = 'texte';       // 'texte' | 'outil'
  const fauxClient = { messages: { create: async (p) => {
    appels.push({ system: p.system, model: p.model, tools: (p.tools || []).map(t => t.name) });
    if (scenario === 'outil' && !p.messages.some(m => Array.isArray(m.content) && m.content.some(b => b.type === 'tool_result'))) {
      return { stop_reason: 'tool_use', content: [{ type: 'tool_use', id: 'tu_1', name: 'creer_devis', input: { client_nom: 'Mme Test', objet: 'Objet', lignes: [{ designation: 'Main-d\'œuvre', qte: 2, pu_ht: 50 }, { designation: 'Forfait', qte: 1, pu_ht: 10 }] } }] };
    }
    return { stop_reason: 'end_turn', content: [{ type: 'text', text: 'Réponse du banc' }] };
  } } };
  const metierDeReel = (t, m) => MOD.resoudreMetier(t, m, { espaceDe, metierOk });
  let metierLu = 0, jeter = false;
  const app = express(); app.use(express.json());
  const VOC = { plomberie: { nom: 'Plomberie', types: ['Dépannage fuite'], presta: ['Recherche de fuite'] }, froid: { nom: 'Froid', types: ['Maintenance groupe froid'], presta: [] } };
  AGENT.monterAgentDevis(app, { anthropic: { cleApi: 'cle-banc', secretDevis: 'SECRET-BANC' } }, banc, {
    metierDe: (t, m) => { metierLu++; if (jeter) throw new Error('crochet cassé'); return metierDeReel(t, m); },
    vocabulaire: k => VOC[k] || null, creerClient: () => fauxClient });
  const srv = await new Promise(r => { const s = app.listen(0, '127.0.0.1', () => r(s)); });
  const B1 = 'http://127.0.0.1:' + srv.address().port;
  const agent = async (corps, secret) => {
    const r = await fetch(B1 + '/api/devis/agent', { method: 'POST', headers: Object.assign({ 'Content-Type': 'application/json' }, secret === null ? {} : { 'X-Teamop-Devis': secret || 'SECRET-BANC' }), body: JSON.stringify(corps) });
    let j = null; try { j = await r.json(); } catch (e) {} return { s: r.status, j };
  };
  const msg = [{ role: 'user', content: 'Un devis pour Mme Test' }];
  const ctx = { societes: ['Ma société'], clients: [{ nom: 'Mme Test', adresse: '1 rue du Banc', ville: 'Tours' }] };
  const consigne = async (extra) => { const n0 = appels.length; const r = await agent(Object.assign({ messages: msg, contexte: ctx }, extra)); return { r, sys: appels.length > n0 ? appels[appels.length - 1].system : null, n: appels.length - n0 }; };
  const quel = sys => !sys ? 'aucun' : /Certibiocide/.test(sys) ? '3d' : /nettoyage et de\s+propreté/.test(sys) ? 'nettoyage' : /métier : Plomberie/.test(sys) ? 'plomberie' : /métier : Froid/.test(sys) ? 'froid' : /métier : non précisé/.test(sys) ? 'generique-sans-voc' : 'autre';

  /* accès */
  let m0 = metierLu, n0 = appels.length;
  let r = await agent({ messages: msg, contexte: ctx, t: 'ent-net' }, 'mauvais-code');
  v('⛔ mauvais code d\'accès : 403, le métier n\'est PAS lu, Claude n\'est pas appelé', [r.s, metierLu - m0, appels.length - n0], [403, 0, 0]);
  r = await agent({ messages: msg, contexte: ctx, t: 'ent-net' }, null);
  v('…sans code : 403, rien lu, rien appelé', [r.s, metierLu - m0, appels.length - n0], [403, 0, 0]);
  r = await agent({ contexte: ctx, t: 'ent-net' });
  v('…sans messages : 400, rien lu, rien appelé', [r.s, metierLu - m0, appels.length - n0], [400, 0, 0]);

  const cas = [
    ['entreprise de nettoyage de l\'annuaire', { t: 'ent-net' }, 'nettoyage'],
    ['⛔ …son corps dit « 3d » : sans effet', { t: 'ent-net', metier: '3d' }, 'nettoyage'],
    ['⛔ entreprise 3D, corps « nettoyage » : sans effet', { t: 'ent-3d', metier: 'nettoyage' }, '3d'],
    ['⛔ entreprise sans métier réglé, corps « nettoyage » : la 3D d\'avant', { t: 'ent-vide', metier: 'nettoyage' }, '3d'],
    ['aucun identifiant ni métier : la 3D d\'avant (comportement d\'aujourd\'hui, application v773)', {}, '3d'],
    ['espace sans fiche (bêta) qui demande le nettoyage', { t: 'opgestion-beta', metier: 'nettoyage' }, 'nettoyage'],
    ['espace sans fiche qui demande la plomberie : générique + son vocabulaire', { t: 'opgestion-beta', metier: 'plomberie' }, 'plomberie'],
    ['espace sans fiche, métier hors liste : la 3D', { t: 'opgestion-beta', metier: 'zzz' }, '3d'],
    ['espace sans fiche, métier ouvert mais sans vocabulaire lisible : générique, pas la 3D', { t: 'opgestion-beta', metier: 'froid' }, 'froid'],
  ];
  for (const [nom, extra, attendu] of cas) { const c = await consigne(extra); v(nom + ' → cerveau « ' + attendu + ' »', [c.r.s, c.n, quel(c.sys)], [200, 1, attendu]); }
  { const c = await consigne({ t: 'opgestion-beta', metier: 'plomberie' }); vrai('le générique a reçu les types du référentiel (Dépannage fuite, Recherche de fuite)', /Dépannage fuite/.test(c.sys) && /Recherche de fuite/.test(c.sys)); }

  /* ce qui part chez Anthropic : le client, tel quel */
  {
    const c = await consigne({ t: 'ent-net' });
    vrai('⛔ le client part avec son nom, son adresse et sa ville — dans la consigne nettoyage comme dans la 3D', /- Mme Test — 1 rue du Banc Tours/.test(c.sys) && /- Ma société/.test(c.sys));
    const c3 = await consigne({ t: 'ent-3d' });
    vrai('…et la 3D reçoit la même ligne', /- Mme Test — 1 rue du Banc Tours/.test(c3.sys));
    vrai('le modèle ne change pas (claude-sonnet-5) et l\'outil est le même', appels[appels.length - 1].model === 'claude-sonnet-5' && appels[appels.length - 1].tools.join() === 'creer_devis');
  }
  /* un crochet qui jette */
  jeter = true; { const c = await consigne({ t: 'ent-net' }); v('un crochet de métier qui jette ne casse pas l\'assistant : 200 et la consigne d\'avant', [c.r.s, c.n, quel(c.sys)], [200, 1, '3d']); } jeter = false;

  /* la TVA par défaut */
  scenario = 'outil';
  for (const [t, attendu] of [['ent-net', 20], ['ent-3d', 10], ['ent-vide', 10]]) {
    const rr = await agent({ messages: msg, contexte: ctx, t });
    v('devis sans tva_taux du modèle : ' + t + ' → TVA ' + attendu + ' %', [rr.s, rr.j && rr.j.devis && rr.j.devis.tvaTaux], [200, attendu]);
  }
  { const rr = await agent({ messages: msg, contexte: ctx, t: 'ent-net' });
    vrai('(population) un devis a bien été composé (2 lignes, un total)', rr.j && rr.j.devis && rr.j.devis.lignes.length === 2 && rr.j.devis.totalHt === 110, rr.j && rr.j.devis); }
  scenario = 'texte';
  srv.close();

  /* ══ 6. LE VRAI SERVEUR : les DEUX routes lisent le même métier ══ */
  console.log('\n6. Le vrai serveur : « Devis IA » et assistant choisissent le même cerveau pour la même entreprise');
  let webpush;
  try { webpush = require(path.join(RACINE, 'server', 'node_modules', 'web-push')); } catch (e) { console.log('  … SAUTÉE : web-push absent'); console.log('\n' + ok + ' ✓  ' + ko + ' ✗'); process.exit(ko ? 1 : 0); }
  const recus = [];
  const faux = http.createServer((q, rep) => { let b = ''; q.on('data', d => { b += d; }); q.on('end', () => {
    let j = {}; try { j = JSON.parse(b); } catch (e) {} recus.push({ url: q.url, corps: j });
    const generer = !!(j.output_config && j.output_config.format);
    const texte = generer ? JSON.stringify({ titre: 'Devis du banc', lignes: [{ designation: 'Ligne', qte: 1, pu: 100 }], tva: 20, remarque: '' }) : 'Réponse du banc';
    rep.writeHead(200, { 'Content-Type': 'application/json' });
    rep.end(JSON.stringify({ id: 'msg_x', type: 'message', role: 'assistant', model: j.model, stop_reason: 'end_turn', content: [{ type: 'text', text: texte }], usage: { input_tokens: 1, output_tokens: 1 } }));
  }); });
  await new Promise(r => faux.listen(0, '127.0.0.1', r));
  const D = path.join(banc, 'data'); fs.mkdirSync(D);
  const vap = webpush.generateVAPIDKeys();
  const b64 = o => Buffer.from(JSON.stringify(o)).toString('base64');
  const esp = (slug, t, metier) => ({ slug, nom: slug, email: slug + '@exemple.fr', t, code: b64({ t, k: 'CLE-' + slug }), ts: 1, ...(metier === undefined ? {} : { metier }) });
  fs.writeFileSync(path.join(D, 'espaces.json'), JSON.stringify({
    'prop-net': esp('prop-net', 'ent-net-3112', 'nettoyage'), 'hyg-3d': esp('hyg-3d', 'ent-3d-3112', '3d'), 'sans-metier': esp('sans-metier', 'ent-vide-3112'), 'plombier': esp('plombier', 'ent-plomb-3112', 'plomberie') }));
  fs.writeFileSync(path.join(D, 'devis-acces.json'), JSON.stringify({ 'ent-net-3112': { actif: true }, 'ent-3d-3112': { actif: true }, 'ent-vide-3112': { actif: true }, 'ent-plomb-3112': { actif: true }, 'opgestion-beta': { actif: true } }));
  fs.writeFileSync(path.join(banc, 'config.json'), JSON.stringify({ vapidPublicKey: vap.publicKey, vapidPrivateKey: vap.privateKey, apiKey: 'banc', anthropic: { cleApi: 'sk-ant-banc', secretDevis: 'SECRET-BANC' } }));
  const port = await libre(), B = 'http://127.0.0.1:' + port; let sortie = '';
  const proc = spawn(process.execPath, [path.join(RACINE, 'server', 'index.js')], { env: Object.assign({}, process.env, { TEAMOP_CONFIG: path.join(banc, 'config.json'), TEAMOP_DATA: D, PORT: String(port),
    TEAMOP_FB_ADMIN: path.join(banc, 'absente.json'), ANTHROPIC_BASE_URL: 'http://127.0.0.1:' + faux.address().port }), stdio: ['ignore', 'pipe', 'pipe'] });
  enfants.push(proc); proc.stdout.on('data', d => { sortie += d; }); proc.stderr.on('data', d => { sortie += d; });
  let vivant = false; for (let i = 0; i < 150 && !vivant; i++) { await dormir(100); try { vivant = (await fetch(B + '/health')).ok; } catch (e) {} }
  v('le vrai serveur démarre', vivant, true);
  if (!vivant) { console.log(sortie.slice(-1500)); console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); process.exit(1); }
  vrai('(population) l\'assistant est monté (pas de « assistant devis non monté » au démarrage)', !/assistant devis non monté/.test(sortie), sortie.slice(0, 300));
  const post = async (chemin, corps, entetes) => { const rr = await fetch(B + chemin, { method: 'POST', headers: Object.assign({ 'Content-Type': 'application/json' }, entetes || {}), body: JSON.stringify(corps) }); let j = null; try { j = await rr.json(); } catch (e) {} return { s: rr.status, j }; };
  const sysDe = async (chemin, corps, entetes) => { const n = recus.length; const rr = await post(chemin, corps, entetes); return { rr, sys: recus.length > n ? recus[recus.length - 1].corps.system : null }; };
  const gen = (t, extra) => sysDe('/api/devis/generer', Object.assign({ team: t, demande: 'Nettoyage des bureaux 300 m2, trois passages par semaine' }, extra || {}));
  const ag = (t, extra) => sysDe('/api/devis/agent', Object.assign({ messages: [{ role: 'user', content: 'Un devis pour Mme Test' }], contexte: { societes: ['Ma société'], clients: [{ nom: 'Mme Test', adresse: '1 rue du Banc', ville: 'Tours' }] }, t }, extra || {}), { 'X-Teamop-Devis': 'SECRET-BANC' });
  const quelGen = s => !s ? 'aucun' : /gestion de nuisibles/.test(s) ? '3d' : /nettoyage et de propreté/.test(s) ? 'nettoyage' : /métier : Plomberie/.test(s) ? 'plomberie' : 'autre';
  const quelAg = s => !s ? 'aucun' : /Certibiocide/.test(s) ? '3d' : /nettoyage et de\s+propreté/.test(s) ? 'nettoyage' : /métier : Plomberie/.test(s) ? 'plomberie' : 'autre';
  const entreprises = [['entreprise de nettoyage', 'ent-net-3112', 'nettoyage'], ['entreprise 3D', 'ent-3d-3112', '3d'], ['entreprise sans métier réglé (ELAN avant qu\'on le règle)', 'ent-vide-3112', '3d'], ['plombier', 'ent-plomb-3112', 'plomberie']];
  for (const [nom, t, attendu] of entreprises) {
    const g = await gen(t), a = await ag(t);
    v(nom + ' : « Devis IA » et assistant → cerveau « ' + attendu + ' »', [g.rr.s, quelGen(g.sys), a.rr.s, quelAg(a.sys)], [200, attendu, 200, attendu]);
  }
  {
    const g = await gen('ent-net-3112', { metier: '3d' }), a = await ag('ent-net-3112', { metier: '3d' });
    v('⛔ un corps qui dit « 3d » ne fait pas parler la 3D à une entreprise de nettoyage de l\'annuaire (les deux routes)', [quelGen(g.sys), quelAg(a.sys)], ['nettoyage', 'nettoyage']);
    const g2 = await gen('ent-3d-3112', { metier: 'nettoyage' }), a2 = await ag('ent-3d-3112', { metier: 'nettoyage' });
    v('⛔ …et un corps qui dit « nettoyage » ne l\'ôte pas à une entreprise 3D', [quelGen(g2.sys), quelAg(a2.sys)], ['3d', '3d']);
    const g3 = await gen('opgestion-beta', { metier: 'nettoyage' }), a3 = await ag('opgestion-beta', { metier: 'nettoyage' });
    v('espace sans fiche (la bêta) : le métier du corps, borné — les deux routes', [quelGen(g3.sys), quelAg(a3.sys)], ['nettoyage', 'nettoyage']);
    const g4 = await gen('opgestion-beta', { metier: 'zzz' });
    v('…hors liste : la 3D', quelGen(g4.sys), '3d');
  }
  {
    const g = await gen('ent-net-3112');
    vrai('⛔ le « Devis IA » d\'une entreprise de nettoyage ne porte aucun mot d\'anti-nuisibles (consigne ET modèle de la requête)', !ANTI.test(g.sys || 'x') && !ANTI.test(JSON.stringify(recus[recus.length - 1].corps.messages)), g.sys);
    const a = await ag('ent-net-3112');
    vrai('⛔ …ni l\'assistant', !ANTI.test((a.sys || 'x').replace(/^[\s\S]*?(?=CHOIX DE LA SOCIÉTÉ)/, '')));
    const g0 = recus.length; const sans = await post('/api/devis/generer', { team: 'ent-net-3112', demande: 'x' });
    v('(garde conservée) une demande trop courte : 400, Claude n\'est pas appelé', [sans.s, recus.length - g0], [400, 0]);
    const g1 = recus.length; const nonActive = await post('/api/devis/generer', { team: 'entreprise-inconnue', demande: 'Nettoyage des bureaux, trois passages' });
    v('(garde conservée) une entreprise non activée sans le code partagé : 401, Claude n\'est pas appelé', [nonActive.s, recus.length - g1], [401, 0]);
  }
  vrai('le serveur n\'a rien écrit d\'inquiétant en route (pas de ReferenceError / zone morte)', !/ReferenceError|Cannot access|is not defined/.test(sortie), sortie.slice(-600));
  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.log('  ✗ le banc a levé : ' + (e && e.stack || e)); console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); process.exit(1); });
