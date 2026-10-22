/* ══ test-2814 : LOT 1 DE LA REFONTE DE LA TOUR — (e) CONTRATS (21 octobre 2026) ══
   La page « Contrats » lit le registre (`server/contrats.js`) EN LECTURE : les pièces et leur version en vigueur, les abonnements qu'une
   pièce manquante bloque, les contrats des clients (envoyés, signés, en attente). La couture se joue avec le VRAI serveur — un brouillon
   puis une validation passent par les VRAIES routes du patron, les contrats des clients sont posés dans leur fichier — et les VRAIES
   fonctions de la page :
     · ⛔ « en vigueur » et « validée par » ne viennent que du TAMPON posé par le serveur ; une pièce sans version validée le DIT ;
     · un abonnement bloqué nomme ce qui lui manque ; quand toutes ses pièces sont validées, il n'est plus bloqué ;
     · les contrats des clients : signé / en attente / pas envoyé ;
     · lire une pièce charge SON texte (version en vigueur, sinon le dernier brouillon) ;
     · ⛔ un registre illisible (503) n'est jamais « aucun contrat » : chaque lecture dit sa panne à sa place ;
     · ⛔ la page n'écrit rien : aucun apiPost dans ses fonctions.
   Rien ne sort d'ici : 127.0.0.1, configuration et données jetables. */
'use strict';
const fs = require('fs'), os = require('os'), path = require('path'), crypto = require('crypto'), net = require('net'), vm = require('vm');
const { spawn } = require('child_process');
const RACINE = path.join(__dirname, '..');
let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + String(JSON.stringify(b)).slice(0, 400) + '\n      obtenu  : ' + String(JSON.stringify(a)).slice(0, 400)); } };
const vrai = (t, c, d) => v(t + (d !== undefined && !c ? ' — ' + String(d).slice(0, 300) : ''), !!c, true);
const dormir = ms => new Promise(r => setTimeout(r, ms));
const sha = x => crypto.createHash('sha256').update(x).digest('hex');
console.log('── test-2814 : la Tour, lot 1 (e) — Contrats ──');
let webpush; try { webpush = require(path.join(RACINE, 'server', 'node_modules', 'web-push')); } catch (e) { console.log('  (sauté : server/node_modules absent)\n\n0 ✓  0 ✗'); process.exit(0); }
const T = fs.readFileSync(path.join(RACINE, 'tour.html'), 'utf8');
const corps = (src, entete) => { const i = src.indexOf(entete); if (i < 0) return ''; let j = src.indexOf('{', i), p = 0; for (let k = j; k < src.length; k++) { const c = src[k]; if (c === '{') p++; else if (c === '}') { p--; if (!p) return src.slice(i, k + 1); } } return ''; };
const NOMS = ['chargerContrats', 'ctLire', 'ctPaquetNom', 'ctAction', 'vueContrats'];
const FN = NOMS.concat(['ligneAc', 'abnGroupe', 'acErr', 'videTour', 'esc', 'jsq', 'fmtJour', 'fmtDate', 'apiGet']).map(n => corps(T, 'function ' + n + '('));
const iCT = T.indexOf('var CT={'), CTV = iCT > 0 ? T.slice(iCT, T.indexOf('\n', iCT)) : '';
v('(population) les 14 fonctions et l\'état CT sont trouvés dans le fichier livré', [FN.filter(f => f.length < 30).length, CTV.length > 30], [0, true]);
v('⛔ la page n\'écrit rien : aucun apiPost dans ses fonctions', FN.slice(0, NOMS.length).filter(f => /apiPost|fetch\(/.test(f)).length, 0);

const demarrer = async (banc, D) => {
  const PORT = await new Promise(res => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)); }); });
  let journal = '';
  const e = spawn(process.execPath, [path.join(RACINE, 'server', 'index.js')], { env: Object.assign({}, process.env, { TEAMOP_CONFIG: path.join(banc, 'config.json'), TEAMOP_DATA: D, PORT: String(PORT),
    TEAMOP_FB_ADMIN: path.join(banc, 'absente.json'), TEAMOP_FB_OAUTH_URL: 'http://127.0.0.1:9/token', TEAMOP_FIRESTORE_URL: 'http://127.0.0.1:9', TEAMOP_IDTK_URL: 'http://127.0.0.1:9/idtk',
    TEAMOP_FB_CERTS_URL: 'http://127.0.0.1:9/certs' }), stdio: ['ignore', 'pipe', 'pipe'] });
  e.stdout.on('data', d => { journal += d; }); e.stderr.on('data', d => { journal += d; });
  let vivant = false; for (let i = 0; i < 100 && !vivant; i++) { try { vivant = (await fetch('http://127.0.0.1:' + PORT + '/health')).ok; } catch (x) {} if (!vivant) await dormir(100); }
  return { e, PORT, vivant, journal: () => journal };
};
const MDP = 'banc-2814-patron', now = Date.now();
const preparer = (banc) => { const vap = webpush.generateVAPIDKeys();
  fs.writeFileSync(path.join(banc, 'config.json'), JSON.stringify({ vapidPublicKey: vap.publicKey, vapidPrivateKey: vap.privateKey, apiKey: 'banc' }));
  fs.writeFileSync(path.join(banc, 'monitor.json'), JSON.stringify({ users: [{ id: 'u-patron', nom: 'Patron', email: '', hash: sha(MDP), role: 'patron', actif: true, ts: now }] }));
  const D = path.join(banc, 'data'); fs.mkdirSync(D, { recursive: true }); return D; };

(async () => {
  const bancs = [], enfants = [];
  const fin = () => { enfants.forEach(e => { try { e.kill('SIGKILL'); } catch (x) {} }); bancs.forEach(b => { try { fs.rmSync(b, { recursive: true, force: true }); } catch (x) {} }); };
  process.on('exit', fin);
  setTimeout(() => { console.log('  ✗ banc FIGÉ au-delà de 120 s'); console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); fin(); process.exit(1); }, 120000).unref();
  const banc = fs.mkdtempSync(path.join(os.tmpdir(), 'b2814-')); bancs.push(banc);
  const D = preparer(banc);
  /* le fichier des pièces existe (vide) : des contrats de clients SANS lui, le registre se déclare illisible (sa garde, contrats.js) */
  fs.writeFileSync(path.join(D, 'contrats-documents.json'), '{}');
  fs.writeFileSync(path.join(D, 'contrats-clients.json'), JSON.stringify([
    { id: 'c1', dossier: 'DOS-000101', type: 'paquet:op_gestion:pro', pieces: [], version: 0, empreinte: 'x', envoyeLe: now - 5 * 86400000, accepteLe: now - 4 * 86400000 },
    { id: 'c2', dossier: 'DOS-000102', type: 'paquet:op_gestion:business_premium', pieces: [], version: 0, empreinte: 'y', envoyeLe: now - 86400000, accepteLe: 0 },
    { id: 'c3', dossier: 'DOS-000103', type: 'conditions_generales', version: 2, empreinte: 'z', envoyeLe: 0, accepteLe: 0 }]));
  const S = await demarrer(banc, D); enfants.push(S.e);
  vrai('le serveur démarre', S.vivant, S.journal().slice(-300));
  const API = 'http://127.0.0.1:' + S.PORT;
  const TP = (await (await fetch(API + '/api/monitor/login', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': '10.0.0.1' }, body: JSON.stringify({ nom: 'Patron', pass: MDP }) })).json()).token;
  vrai('une session de patron', TP);
  const post = async (u, b) => { const r = await fetch(API + u, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + TP }, body: JSON.stringify(b) }); return { s: r.status, d: await r.json().catch(() => ({})) }; };
  /* les conditions générales : un brouillon propre, puis le TAMPON par la vraie route */
  const br = await post('/api/monitor/contrats/brouillon', { type: 'conditions_generales', texte: 'Conditions générales de TEAM OP — texte du banc 2814.\nArticle 1. Objet.', note: 'banc' });
  v('le patron enregistre un brouillon (vraie route)', br.s, 200);
  const n = br.d.version && br.d.version.n;
  v('…puis le valide : le serveur pose le tampon', (await post('/api/monitor/contrats/valider', { type: 'conditions_generales', n })).s, 200);
  const br3 = await post('/api/monitor/contrats/brouillon', { type: 'conditions_generales', texte: 'Nouvelle rédaction <b>en gras</b> — pas encore validée.', note: 'banc' });
  v('…puis un brouillon PLUS RÉCENT, pas encore validé', br3.s, 200);
  const n3 = br3.d.version && br3.d.version.n;
  /* le contrat de sous-traitance : un brouillon validé PUIS retiré (vraies routes) — plus rien en vigueur, la version retirée reste au registre */
  const brD = await post('/api/monitor/contrats/brouillon', { type: 'dpa', texte: 'Contrat de sous-traitance — banc 2814.', note: 'banc' });
  const nD = brD.d.version && brD.d.version.n;
  v('le contrat de sous-traitance : validé puis RETIRÉ par les vraies routes', [(await post('/api/monitor/contrats/valider', { type: 'dpa', n: nD })).s, (await post('/api/monitor/contrats/retirer', { type: 'dpa', n: nD })).s], [200, 200]);

  let jeton = TP, rendus = 0;
  const bac = { API, fetch, Promise, JSON, Date, String, Array, Math, Error, Number, Object, TAB: 'contrats', MYROLE: 'patron', AG: { sec: '' },
    hAuth: () => ({ Authorization: 'Bearer ' + jeton }), srvRepond: r => r, srvMuet: e => { throw e; }, doLogout: () => {}, render: () => { rendus++; }, msgErreur: () => 'Serveur injoignable.',
    svg: n2 => '<svg data-ic="' + n2 + '"></svg>', enTete: (t, ph, ac) => '<h1>' + t + '</h1>' + (ac || ''), acSquel: () => '<squelette>', document: { getElementById: () => null } };
  vm.createContext(bac);
  vm.runInContext(CTV + '\n' + FN.join('\n') + '\nthis.CT=CT;' + NOMS.map(x => 'this.' + x + '=' + x + ';').join(''), bac);
  const texte = h => h.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
  const attendre = async (f) => { for (let i = 0; i < 60 && !f(); i++) await dormir(25); };
  v('avant la lecture : un squelette', /<squelette>/.test(bac.vueContrats()), true);
  bac.chargerContrats(); await attendre(() => bac.CT.regLec && bac.CT.cliLec);
  v('les deux lectures sont faites, et la page ouverte est redessinée', [bac.CT.regLec, bac.CT.cliLec, rendus >= 2], [1, 1, true]);
  const H = bac.vueContrats(), X = texte(H);
  const nT = bac.CT.reg.types.length, nP = bac.CT.reg.paquets.length;
  vrai('tuiles : 1 pièce en vigueur sur ' + nT + ', 0 abonnement prêt sur ' + nP + ', 2 envoyés, 1 en attente', X.indexOf('1 / ' + nT + ' Pièces en vigueur 0 / ' + nP + ' Abonnements prêts à partir 2 Contrats envoyés 1 En attente de signature') >= 0, X.slice(0, 400));
  const lCG = (H.match(/<button type="button" class="reg-l"[^>]*ctLire\('conditions_generales'[\s\S]*?<\/button>/) || [''])[0];
  vrai('⛔ « en vigueur » : version ' + n + ', validée par Patron — le tampon du serveur', /validée par <b>Patron<\/b>/.test(lCG) && /p-vert">en vigueur</.test(lCG) && new RegExp('version ' + n + ' ').test(lCG), lCG);
  const HP0 = H.slice(H.indexOf('>Les pièces<'));
  const lDPA = (HP0.match(/<button type="button" class="reg-l"[^>]*>(?:(?!<\/button>)[\s\S])*?Contrat de sous-traitance[\s\S]*?<\/button>/) || [''])[0];
  vrai('une pièce sans version en vigueur le DIT ; sa version RETIRÉE se dit retirée, jamais « brouillon » (relecture du 22 octobre 2026)', /aucune version en vigueur · version \d+ retirée · dernier brouillon : version 1/.test(lDPA) && !/p-vert">en vigueur/.test(lDPA), lDPA);
  vrai('les abonnements bloqués nomment ce qui leur manque (OP GESTION · Pro : les conditions d\'OP GESTION)', /Abonnements bloqués/.test(X) && /OP GESTION · Pro/.test(X) && /manque : [^·]*Conditions d’utilisation — OP GESTION/.test(X), X.slice(0, 600));
  vrai('« Les pièces » ne se replie jamais toute seule (reg-g-fixe)', /<div class="reg-g reg-g-fixe"><div class="reg-tete"><span class="reg-nom">Les pièces</.test(H));
  vrai('…et les conditions générales, validées, n\'y manquent plus', !/manque : [^<]*Conditions générales/.test(H));
  vrai('contrats des clients : signé, en attente, pas envoyé — avec leurs dossiers', /DOS-000101[\s\S]*?signé le[\s\S]*?p-vert">signé</.test(H) && /DOS-000102[\s\S]*?OP GESTION · Business Premium[\s\S]*?p-ambre">en attente</.test(H) && /DOS-000103[\s\S]*?p-attente">pas envoyé</.test(H), H.slice(H.indexOf('DOS-0001'), H.indexOf('DOS-0001') + 600));
  v('le nom d\'un abonnement se lit en français', [bac.ctPaquetNom('paquet:op_gestion:business_premium'), bac.ctPaquetNom('op_messages:perso')], ['OP GESTION · Business Premium', 'OP MESSAGES · Perso']);
  v('⛔ toucher une pièce lit sa version EN VIGUEUR, pas le brouillon plus récent ; sans version en vigueur, le dernier BROUILLON (pas la retirée) ; sans texte, rien', [bac.ctAction(bac.CT.reg.types, 'conditions_generales'), bac.ctAction(bac.CT.reg.types, 'dpa'), bac.ctAction([{ type: 'vide', versions: [] }], 'vide')], ["ctLire('conditions_generales'," + n + ")", "ctLire('dpa',1)", 'void 0']);
  bac.ctLire('conditions_generales', n); await attendre(() => bac.CT.versLec);
  const HL = texte(bac.vueContrats());
  vrai('lire : le TEXTE de la version, et qui l\'a validée', bac.CT.versLec === 1 && /Article 1\. Objet\./.test(HL) && /Validée par Patron/.test(HL), HL.slice(0, 300));
  bac.ctLire('conditions_generales', n3); await attendre(() => bac.CT.versLec);
  const HB = bac.vueContrats();
  vrai('⛔ un texte de contrat est ÉCHAPPÉ (aucune balise ne passe) ; un brouillon se dit « pas encore en vigueur »', HB.indexOf('<b>en gras</b>') < 0 && HB.indexOf('&lt;b&gt;en gras&lt;/b&gt;') > 0 && /Brouillon — pas encore en vigueur/.test(texte(HB)));
  bac.ctLire('conditions_generales', n); bac.CT.vers = { type: 'dpa', n: 1 }; bac.CT.versLec = 0;
  await dormir(400);
  v('⛔ une réponse qui arrive APRÈS qu\'on a ouvert un autre texte ne le remplace pas', [bac.CT.vers.type, bac.CT.versLec], ['dpa', 0]);
  bac.ctLire('conditions_generales', 999); await attendre(() => bac.CT.versLec);
  vrai('une version qui n\'existe pas : « ce texte n\'a pas pu être lu »', bac.CT.versLec === -1 && /Ce texte n’a pas pu être lu/.test(texte(bac.vueContrats())));
  bac.CT.vers = null;
  /* une pièce dont la seule version est RETIRÉE (aucun brouillon) : la pastille dit « retirée » */
  const regAvant = bac.CT.reg;
  bac.CT.reg = { types: [{ type: 'signature_electronique', libelle: 'Signature', enVigueur: null, versions: [{ n: 2, statut: 'retire', auteur: 'x', ts: now }] }], paquets: [], clients: {} };
  const HR = bac.vueContrats();
  vrai('une pièce dont la seule version est retirée : « version 2 retirée », pastille « retirée »', /aucune version en vigueur · version 2 retirée/.test(HR) && /p-ambre">retirée</.test(HR), HR.slice(HR.indexOf('Signature'), HR.indexOf('Signature') + 500));
  bac.CT.reg = regAvant;
  bac.MYROLE = 'collaborateur';
  vrai('le bouton « Rédiger et valider » n\'est proposé qu\'au patron', !/Rédiger et valider/.test(bac.vueContrats()));
  bac.MYROLE = 'patron';

  /* ⛔ un second serveur, registre des clients ILLISIBLE */
  const banc2 = fs.mkdtempSync(path.join(os.tmpdir(), 'b2814b-')); bancs.push(banc2);
  const D2 = preparer(banc2); fs.writeFileSync(path.join(D2, 'contrats-clients.json'), '{ tronqué');
  const S2 = await demarrer(banc2, D2); enfants.push(S2.e);
  vrai('(second serveur, registre des clients illisible) il démarre', S2.vivant, S2.journal().slice(-300));
  const TP2 = (await (await fetch('http://127.0.0.1:' + S2.PORT + '/api/monitor/login', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': '10.0.0.1' }, body: JSON.stringify({ nom: 'Patron', pass: MDP }) })).json()).token;
  bac.API = 'http://127.0.0.1:' + S2.PORT; jeton = TP2;
  bac.chargerContrats(); await attendre(() => bac.CT.regLec && bac.CT.cliLec);
  const HI = texte(bac.vueContrats());
  vrai('⛔ clients illisibles (503) : la panne est DITE, avec le message du serveur — jamais « aucun contrat envoyé »', bac.CT.cliLec === -1 && /Les contrats des clients ne répondent pas/.test(HI) && /illisibles/.test(HI) && !/Aucun contrat envoyé/.test(HI), HI.slice(-400));
  vrai('…le serveur déclare alors TOUT le registre illisible (sa garde) : la page le dit aussi, « rien n’est envoyé »', bac.CT.regLec === -1 && /Le registre des contrats ne répond pas/.test(HI) && /rien n’est envoyé à un client/.test(HI) && !/Les pièces/.test(HI), HI.slice(0, 400));
  bac.API = 'http://127.0.0.1:1';
  bac.chargerContrats(); await attendre(() => bac.CT.regLec && bac.CT.cliLec);
  const HP = texte(bac.vueContrats());
  vrai('⛔ serveur injoignable : les deux lectures disent leur panne', /Le registre des contrats ne répond pas/.test(HP) && /Les contrats des clients ne répondent pas/.test(HP) && !/Aucun contrat/.test(HP), HP);

  const SANS = T.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ');
  vrai('plus « en construction » ; sa branche de rendu ; relue à chaque ouverture',
    !/\n  contrats:\['Contrats'/.test(T) && /else if\(TAB==='contrats'\) v\.innerHTML=vueContrats\(\);/.test(SANS) && /if\(t==='contrats'\) chargerContrats\(\);/.test(SANS));
  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  fin(); process.exit(ko ? 1 : 0);
})().catch(e => { console.log('  ✗ exception : ' + (e && e.stack || e)); console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); process.exit(1); });
