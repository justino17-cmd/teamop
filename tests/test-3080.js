/* 3080 — LA COUTURE DE LA TOUR AVEC LE VRAI SERVEUR : VALIDER LES MAILS DE PAULINE DEPUIS LA MESSAGERIE (Tour v2.115, 27 octobre 2026).
   Justin : « je peux pas être tout le temps sur le site de Harvey, si je suis sur mon téléphone ; que Pauline m'envoie le mail dans la messagerie de la Tour, j'accepte, je refuse,
   je modifie, et quand j'accepte elle l'envoie. » `test-3079` joue le serveur et le script du Mac ; ici, les VRAIES fonctions de `tour.html` (`chargerPauline`, `msPaHtml`,
   `paDecider`, `paClic`, `paSaisie`, `paResumeCharger`, `apiGet`, `apiPost`…) parlent au VRAI `server/index.js` (127.0.0.1). Il garde :
     · la conversation : les mails qui attendent l'accord (ni l'accepté, ni le parti), du plus ancien au plus récent, le texte des prospects ÉCHAPPÉ, aucun champ du relevé dans un attribut ;
     · accepter : la décision arrive au serveur, le Mac la voit ; l'écran le dit, la pastille baisse ; « modifier » envoie le texte de Justin (une réponse garde son objet) ;
       un objet vidé n'envoie RIEN ; « refuser » demande confirmation ; un refus du serveur (déjà traité sur le Mac, collaborateur) s'affiche TEL QUEL ;
     · la pastille du menu vient du résumé (`?resume=1`), sans le relevé. */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm'), crypto = require('crypto');
const RACINE = path.join(__dirname, '..');
let ok = 0, ko = 0, fini = false;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + String(JSON.stringify(b)).slice(0, 400) + '\n      obtenu  : ' + String(JSON.stringify(a)).slice(0, 400)); } };
const vrai = (t, c, d) => v(t + (d !== undefined && !c ? ' — ' + String(typeof d === 'string' ? d : JSON.stringify(d)).slice(0, 300) : ''), !!c, true);
process.on('exit', () => { if (!fini) { console.log('  ✗ banc interrompu avant la fin'); process.exitCode = 1; } });
setTimeout(() => { console.log('  ✗ banc FIGÉ au-delà de 150 s'); console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); process.exit(1); }, 150000).unref();
console.log('── test-3080 : valider les mails de Pauline depuis la Messagerie — la Tour (ses vraies fonctions) contre le vrai serveur ──');
if (!fs.existsSync(path.join(RACINE, 'server', 'node_modules', 'express'))) { console.log('  (sauté : server/node_modules absent)\n\n0 ✓  0 ✗'); fini = true; process.exit(0); }

const BRUT = fs.readFileSync(path.join(RACINE, 'tour.html'), 'utf8');
const CODE = BRUT.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
function corps(entete) {
  const i = CODE.indexOf(entete); if (i < 0) return '';
  let k = CODE.indexOf('{', i), prof = 0, prev = '';
  for (; k < CODE.length; k++) {
    const c = CODE[k], n = CODE[k + 1];
    if (c === '/' && n === '/') { k = CODE.indexOf('\n', k) - 1; continue; }
    if (c === '/' && n === '*') { k = CODE.indexOf('*/', k + 2) + 1; continue; }
    if (c === "'" || c === '"' || c === '`') { const q = c; for (k++; k < CODE.length; k++) { if (CODE[k] === '\\') { k++; continue; } if (CODE[k] === q) break; } prev = 'x'; continue; }
    if (c === '/' && /[(,=:\[!&|?{};]/.test(prev)) { let cl = false; for (k++; k < CODE.length; k++) { const d = CODE[k]; if (d === '\\') { k++; continue; } if (d === '[') cl = true; else if (d === ']') cl = false; else if (d === '/' && !cl) break; } prev = 'x'; continue; }
    if (c === '{') prof++; else if (c === '}') { prof--; if (!prof) return CODE.slice(i, k + 1); }
    if (!/\s/.test(c)) prev = c;
  }
  return '';
}
const fonction = nom => corps('\nfunction ' + nom + '(').trim();
const ligne = deb => { const i = CODE.indexOf(deb); return i < 0 ? '' : CODE.slice(i, CODE.indexOf('\n', i)); };
const ESC = (/\nfunction esc\(s\)\{.*\n/.exec(CODE) || [''])[0];
const FNS = ['apiGet', 'apiPost', 'agAvatar', 'paObj', 'paT', 'paNb', 'paMs', 'paUnite', 'paDepuis', 'paQuand', 'paListe', 'paApres', 'chargerPauline',
  'paMessagerieApres', 'paAttendAccord', 'paDecs', 'paReleveLu', 'paDecide', 'paAttenteN', 'msBadge', 'paResumeCharger', 'msLignePauline', 'paFilCharger', 'paEtatCarte', 'paCarteHtml',
  'msPaHtml', 'paSaisie', 'paCourriel', 'paDecider', 'paClic', 'msNomFil', 'msSousTitre'];
const FN = FNS.map(fonction);
const VARS = [ligne('var AG_PHOTOS='), ligne('var INJOIGNABLE='), ligne('var MS_PA='), corps('var PA={') + ';'].join('\n');
vrai('(population) les ' + FNS.length + ' fonctions de la page et ses tables sont trouvées', FN.every(f => f.length > 30) && VARS.length > 100 && /var MS_PA=/.test(VARS), FNS.filter((n, i) => FN[i].length <= 30).join(','));

let jeton = '', confirmer = true;
const toasts = [], badges = [], peints = { fil: 0, liste: 0 };
const bac = { JSON, Date, String, Array, Math, Object, Number, Promise, Error, console, fetch, MYROLE: 'patron', TAB: 'messagerie', API: '', AG: { sec: 'equipe' },
  MS: { fil: 'pauline', inst: {}, nonLus: 3, msgLec: 0 },
  hAuth: () => ({ Authorization: 'Bearer ' + jeton, 'Content-Type': 'application/json' }), srvRepond: r => r, srvMuet: e => { throw e; }, doLogout: () => {},
  $: () => null, document: { activeElement: null }, toast: t => toasts.push(t), setBdg: (id, n) => badges.push([id, n]), confirm: () => confirmer,
  messPeindreListe: () => { peints.liste++; }, messPeindreEntete: () => {}, messPeindreFil: () => { peints.fil++; }, render: () => {}, paMajAge: () => {},
  msAgentsParId: () => ({}), MS_GROUPES_LIB: {}, msEstGroupe: () => false, msGroupePerso: () => ({}), esc: null };
vm.createContext(bac);
vm.runInContext(ESC + '\n' + VARS + '\n' + FN.join('\n') + '\n' + FNS.concat(['esc', 'PA', 'MS_PA']).map(n => 'this.' + n + '=' + n + ';').join(''), bac);
const PA = bac.PA, MS_PA = bac.MS_PA;
const clic = (act, i) => bac.paClic({ getAttribute: k => (k === 'data-act' ? act : k === 'data-i' ? String(i) : null) });
const attendre = async () => { for (let n = 0; n < 50 && PA.enVol; n++) await PA.enVol; };
const texte = h => String(h).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');

const HOSTILE = '<img src=x onerror="alert(1)">';
const maint = Date.now(), iso = d => new Date(maint + d).toISOString();
function releve() {
  return { version: 1, genereLe: iso(0), chauffe: { debut: null, jour: null, plafondDuJour: 10 }, jour: { envoyes: 0, reponses: 0, refus: 0, enAttente: 3 }, recherches: [], reponses: [],
    entreprises: [{ id: 'c1', nom: 'Clim Atlantique ' + HOSTILE, ville: 'Rochefort', metier: 'climatisation', etat: 'courriel_pret', email: 'patron@clim-atlantique.fr', contact: 'Marc', majLe: iso(-60e3) },
      { id: 'c2', nom: 'Plomberie Niortaise', ville: 'Niort', metier: 'plomberie', etat: 'courriel_pret', majLe: iso(-60e3) }],
    courriels: [
      { id: 'o-recent', entrepriseId: 'c2', etat: 'en_attente', objet: 'Vos plannings', texte: 'Bonjour,\nun texte récent.', quand: iso(-1000), genre: 'sequence', etape: 1, statutBrut: 'pending_review' },
      { id: 'o-ancien', entrepriseId: 'c1', etat: 'en_attente', objet: 'Objet ' + HOSTILE, texte: 'Texte ' + HOSTILE, quand: iso(-5000), genre: 'sequence', etape: 1, statutBrut: 'pending_review' },
      { id: 'o-rep', entrepriseId: 'c1', etat: 'en_attente', objet: 'Re: Votre devis', texte: 'Merci pour votre retour.', quand: iso(-3000), genre: 'reponse', statutBrut: 'pending_review' },
      { id: 'o-accepte', entrepriseId: 'c1', etat: 'en_attente', objet: 'x', texte: 'y', quand: iso(-800), statutBrut: 'approved' },
      { id: 'o-parti', entrepriseId: 'c2', etat: 'envoye', objet: 'x', texte: 'y', quand: iso(-700), statutBrut: 'sent' }] };
}

(async () => {
  const { demarrer } = require('./banc-serveur-gestion.js');
  const JETON = 'jeton-de-banc-3080-' + crypto.randomBytes(24).toString('hex'), EMPREINTE = crypto.createHash('sha256').update(JETON).digest('hex');
  const S = await demarrer({ config: { pauline: { jetonSha256: EMPREINTE } } });
  vrai('le serveur démarre, une session de patron et une de collaborateur', S.vivant && S.TP && S.TA, S.journal().slice(-300));
  if (!S.vivant) { fini = true; console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); process.exit(1); }
  let adr = 0;   /* une adresse par appel : le quota du Mac (8 par minute et par adresse) n'est pas ce que ce banc mesure — test-3020 le garde */
  const mac = (methode, route, c) => fetch(S.B + route, { method: methode, headers: Object.assign({ Authorization: 'Bearer ' + JETON, 'X-Forwarded-For': '10.80.0.' + (++adr) }, c ? { 'Content-Type': 'application/json' } : {}), body: c ? JSON.stringify(c) : undefined }).then(r => r.json());
  v('le Mac poste son relevé', (await mac('POST', '/api/pauline/releve', releve())).ok, true);
  bac.API = S.B; jeton = S.TP;

  console.log('\n1. La pastille, puis la conversation');
  bac.paResumeCharger(); await new Promise(r => setTimeout(r, 300));
  v('la pastille vient du RÉSUMÉ : 3 mails à valider, ajoutés aux 3 non-lus des agents', [MS_PA.n, badges[badges.length - 1]], [3, ['bdg-msgr', 6]]);
  vrai('la rangée « Pauline » le dit', /3 mails attendent ton accord/.test(bac.msLignePauline()) && /data-fil="pauline"/.test(bac.msLignePauline()));
  v('le nom et le sous-titre de la conversation', [bac.msNomFil('pauline'), bac.msSousTitre()], ['Pauline', 'Prospection · Harvey, sur ton Mac']);
  await bac.chargerPauline(); await attendre();
  let H = bac.msPaHtml();
  v('les mails qui ATTENDENT l’accord, du plus ancien au plus récent (ni l’accepté, ni le parti)', MS_PA.ids, ['o-ancien', 'o-rep', 'o-recent']);
  vrai('trois cartes, chacune avec ses trois boutons', (H.match(/data-act="paAcc"/g) || []).length === 3 && (H.match(/data-act="paMod"/g) || []).length === 3 && (H.match(/data-act="paRef"/g) || []).length === 3);
  vrai('⛔ le texte des prospects est ÉCHAPPÉ (nom, objet, texte)', !/<img/.test(H) && (H.match(/&lt;img src=x onerror=/g) || []).length >= 3);
  vrai('⛔ aucun identifiant du relevé dans un attribut : les boutons portent un NUMÉRO', !/o-ancien|o-recent|o-rep/.test(H) && /data-i="0"/.test(H));
  vrai('à qui, quoi : « À : Marc · patron@clim-atlantique.fr · Premier mail », « Réponse à un prospect »', /À : Marc · patron@clim-atlantique\.fr · Premier mail/.test(texte(H)) && /Réponse à un prospect/.test(texte(H)));
  vrai('l’introduction de Pauline compte ses mails', /voici les 3 mails que j’ai préparés/.test(H));

  console.log('\n2. Accepter');
  const avant = toasts.length;
  await bac.paDecider(0, 'accepter'); await attendre();
  v('le toast le dit', toasts.slice(avant), ['Accepté : le Mac l’envoie dans la minute, aux heures d’envoi.']);
  let m = await mac('GET', '/api/pauline/decisions');
  v('le Mac voit la décision', m.decisions, [{ id: 'o-ancien', action: 'accepter' }]);
  H = bac.msPaHtml();
  v('il reste deux mails à valider, la pastille baisse', [MS_PA.ids.slice(0, 2), bac.paAttenteN(), MS_PA.n], [['o-rep', 'o-recent'], 2, 2]);
  vrai('le mail accepté passe dans « Décidés récemment », avec son état et « Changer d’avis »', /Décidés récemment \(1\)/.test(H) && /Accepté — part du Mac dans la minute/.test(H) && /data-act="paAvis"/.test(H));

  console.log('\n3. Modifier');
  H = bac.msPaHtml();
  const kRec = MS_PA.ids.indexOf('o-recent'), kRep = MS_PA.ids.indexOf('o-rep');
  clic('paMod', kRec); H = bac.msPaHtml();
  vrai('« Modifier » ouvre l’éditeur PRÉ-REMPLI (objet et texte du mail)', MS_PA.edit === 'o-recent' && /value="Vos plannings"/.test(H) && /<textarea[^>]*>Bonjour,\nun texte récent\.<\/textarea>/.test(H) && /data-act="paModOk"/.test(H));
  const n0 = toasts.length;
  bac.paSaisie(kRec, 'objet', '   ');
  await bac.paDecider(kRec, 'modifier');
  v('⛔ un objet vidé n’envoie RIEN, et le dit', [toasts.slice(n0), (await mac('GET', '/api/pauline/decisions')).decisions.length], [['L’objet et le texte ne peuvent pas être vides.'], 1]);
  bac.paSaisie(kRec, 'objet', 'Votre planning, en deux clics'); bac.paSaisie(kRec, 'texte', 'Bonjour,\nle texte de Justin.');
  await bac.paDecider(kRec, 'modifier'); await attendre();
  m = await mac('GET', '/api/pauline/decisions');
  v('le Mac reçoit le texte de Justin', m.decisions.filter(d => d.id === 'o-recent'), [{ id: 'o-recent', action: 'modifier', objet: 'Votre planning, en deux clics', texte: 'Bonjour,\nle texte de Justin.' }]);
  v('l’éditeur se ferme, le brouillon s’efface', [MS_PA.edit, 'o-recent' in MS_PA.brouillon], ['', false]);
  H = bac.msPaHtml();
  const kRep2 = MS_PA.ids.indexOf('o-rep');
  clic('paMod', kRep2); H = bac.msPaHtml();
  vrai('une RÉPONSE : l’objet est grisé, et l’écran dit pourquoi', /<input[^>]*value="Re: Votre devis" disabled/.test(H) && /Une réponse garde son objet/.test(H));
  bac.paSaisie(kRep2, 'objet', 'Autre objet'); bac.paSaisie(kRep2, 'texte', 'Merci, à bientôt.');

  console.log('\n4. Refuser, changer d’avis, et les refus du serveur');
  clic('paModAnn', kRep2);
  v('« Annuler » ferme l’éditeur sans rien envoyer', [MS_PA.edit, (await mac('GET', '/api/pauline/decisions')).decisions.length], ['', 2]);
  H = bac.msPaHtml();
  confirmer = false; await bac.paDecider(MS_PA.ids.indexOf('o-rep'), 'refuser');
  v('⛔ « Refuser » demande confirmation : non → rien n’est envoyé', (await mac('GET', '/api/pauline/decisions')).decisions.length, 2);
  confirmer = true; await bac.paDecider(MS_PA.ids.indexOf('o-rep'), 'refuser'); await attendre();
  v('oui → le Mac voit le refus ; plus rien à valider', [(await mac('GET', '/api/pauline/decisions')).decisions.map(d => d.id + ':' + d.action), bac.paAttenteN()], [['o-ancien:accepter', 'o-recent:modifier', 'o-rep:refuser'], 0]);
  v('le Mac rend compte : appliqué', (await mac('POST', '/api/pauline/decisions/resultats', { resultats: [{ id: 'o-ancien', ok: true }, { id: 'o-recent', ok: true }, { id: 'o-rep', ok: true }] })).pris, 3);
  PA.luLe = 0; await bac.chargerPauline(); await attendre(); H = bac.msPaHtml();
  vrai('la Tour voit « Appliqué sur le Mac » tant que le relevé n’a pas suivi', /Appliqué sur le Mac — mise à jour…/.test(H));
  const kA = MS_PA.ids.indexOf('o-ancien');
  clic('paAvis', kA); H = bac.msPaHtml();
  const n1 = toasts.length;
  await bac.paDecider(MS_PA.ids.indexOf('o-ancien'), 'refuser'); await attendre();
  v('⛔ changer d’avis APRÈS le Mac : le refus du serveur s’affiche tel quel', toasts.slice(n1), ['Ce mail a déjà été traité sur le Mac.']);
  const r2 = releve(); r2.courriels.push({ id: 'o-neuf', entrepriseId: 'c2', etat: 'en_attente', objet: 'Nouveau', texte: 'Nouveau texte', quand: iso(-10), statutBrut: 'pending_review' });
  r2.courriels.forEach(c => { if (['o-ancien', 'o-recent'].includes(c.id)) c.statutBrut = 'approved'; if (c.id === 'o-rep') { c.etat = 'refuse'; c.statutBrut = 'rejected'; } });
  await mac('POST', '/api/pauline/releve', r2);
  PA.luLe = 0; await bac.chargerPauline(); await attendre(); H = bac.msPaHtml();
  v('le relevé suivant : un mail neuf à valider, les décidés dans leur état', [MS_PA.ids[0], /Accepté — part aux heures d’envoi/.test(H), /Refusé/.test(texte(H))], ['o-neuf', true, true]);
  jeton = S.TA; const n2 = toasts.length;
  await bac.paDecider(0, 'accepter');
  vrai('⛔ un collaborateur : le serveur refuse (403), l’écran le dit', toasts.length === n2 + 1 && /403|patron|refus|réserv/i.test(toasts[n2]), toasts.slice(n2));
  jeton = S.TP;
  vrai('⛔ aucun texte de prospect dans le journal du serveur', !/Clim Atlantique|le texte de Justin|onerror/.test(S.journal()));
  await S.fin();
  fini = true;
  console.log('\ntest-3080 : ' + ok + ' ✓ ' + ko + ' ✗');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.log('  ✗ exception : ' + (e && e.stack || e)); fini = true; console.log('\ntest-3080 : ' + ok + ' ✓ ' + (ko + 1) + ' ✗'); process.exit(1); });
