/* 3022 — LA COUTURE DE LA TOUR AVEC LE VRAI SERVEUR : LES GROUPES PERSONNALISABLES ET LE RELEVÉ DE PAULINE (Tour v2.112, 26 octobre 2026).
   `test-3011` fait parler les vraies fonctions de la page à un `apiPost` / `apiGet` SCRIPTÉS ; `test-3016` et `test-3020` font parler le vrai serveur à
   des clients de banc. Aucun des deux ne voit un défaut de COUTURE (CLAUDE.md : « dès qu'une page appelle une route neuve, un banc fait parler la VRAIE fonction de
   la page au VRAI serveur »). Ici : les vraies `apiGet`, `apiPost`, `messListeCharger`, `msGroupeEnregistrer`, `msGroupeDefaut`, `chargerPauline`, `agPaulineHtml` de
   `tour.html` contre le vrai `server/index.js` (127.0.0.1, `tests/banc-serveur-gestion.js`). Il garde :
     · groupes : l'icône « # » d'origine PRÉ-REMPLIE, sur un groupe jamais personnalisé, est acceptée ; la liste relue porte `perso` ; un refus 400 (nom avec « Justin »)
       s'affiche tel quel ; un 403 aussi ; « Remettre par défaut » retire `perso` ; un nom ou une description hostiles reviennent ÉCHAPPÉS ;
     · Pauline : pas de relevé (200, recuLe null) ≠ pont absent (404) ≠ relevé illisible (503) ; un relevé posté avec le bon jeton est lu, rendu, chiffres et chauffe
       compris ; le texte des prospects est échappé ; relire le même relevé ne redessine pas l'écran. */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm'), crypto = require('crypto');
const RACINE = path.join(__dirname, '..');
let ok = 0, ko = 0, fini = false;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + String(JSON.stringify(b)).slice(0, 400) + '\n      obtenu  : ' + String(JSON.stringify(a)).slice(0, 400)); } };
const vrai = (t, c, d) => v(t + (d !== undefined && !c ? ' — ' + String(typeof d === 'string' ? d : JSON.stringify(d)).slice(0, 300) : ''), !!c, true);
/* ⛔ un banc qui s'arrête sans finir (une promesse jamais résolue) sortait en 0 */
process.on('exit', () => { if (!fini) { console.log('  ✗ banc interrompu avant la fin'); process.exitCode = 1; } });
setTimeout(() => { console.log('  ✗ banc FIGÉ au-delà de 150 s'); console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); process.exit(1); }, 150000).unref();
console.log('── test-3022 : la Tour (ses vraies fonctions) contre le vrai serveur — groupes et relevé de Pauline ──');
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
const FNS = ['apiGet', 'apiPost', 'messListeCharger', 'agAvatar', 'msAgentsParId', 'msEtat', 'msEstGroupe', 'msGroupePerso', 'msNomFil', 'msIconeHtml', 'msSousTitre', 'msEnteteHtml',
  'msGroupeFeuille', 'msGroupeModifier', 'msGroupeCouleur', 'msGroupeErr', 'msGroupeEnvoyer', 'msGroupeEnregistrer', 'msGroupeDefaut',
  'paObj', 'paT', 'paNb', 'paMs', 'paUnite', 'paDepuis', 'paQuand', 'paAge', 'paEtatLigne', 'paChiffres', 'paChauffe', 'paAttentesHtml', 'paListe', 'paMot', 'paNom', 'paLigne', 'agPaulineHtml', 'agPaOuvrir', 'agPaTout', 'agPaTexte', 'paMajAge', 'paApres', 'chargerPauline'];
const FN = FNS.map(fonction);
const VARS = [ligne('var AG_PHOTOS='), ligne('var MS_GROUPES_LIB='), ligne('var MS_COULEURS='), ligne('var MS_ETAT_LIB='), ligne('var INJOIGNABLE='), ligne('var PA_LISTES='), ligne('var PA_RETARD='), ligne('var PA_E_ENT='), ligne('var PA_E_COU='), ligne('var PA_E_REP='),
  corps('var PA={') + ';', corps('var MS={') + ';'].join('\n');
vrai('(population) les ' + FNS.length + ' fonctions de la page et ses tables sont trouvées', FN.every(f => f.length > 30) && VARS.length > 500, FNS.filter((n, i) => FN[i].length <= 30).join(','));

/* ── le bac : la VRAIE page, sans DOM ; seul le réseau est vrai (fetch vers 127.0.0.1) ── */
let jeton = '';
const els = {}, panneau = { ouvert: false }, toasts = [], rendus = { n: 0 };
const bac = { JSON, Date, String, Array, Math, Object, Number, Promise, Error, console, fetch, MYROLE: 'patron', TAB: 'agents', API: '', AG: { sec: 'equipe' }, MS: null,
  hAuth: () => ({ Authorization: 'Bearer ' + jeton, 'Content-Type': 'application/json' }), srvRepond: r => r, srvMuet: e => { throw e; }, doLogout: () => {},
  $: id => els[id] || null, document: { querySelector: sel => (sel === '#tour-panneau .mg-pas.on' ? els.pasOn || null : null), querySelectorAll: () => [], getElementById: () => null },
  tourPanneau: () => { panneau.ouvert = true; }, tourPanneauFermer: () => { panneau.ouvert = false; }, toast: t => toasts.push(t), setBdg: () => {},
  messPeindreListe: () => {}, messPeindreEntete: () => {}, render: () => { rendus.n++; }, esc: null };
vm.createContext(bac);
vm.runInContext(ESC + '\n' + VARS + '\n' + FN.join('\n') + '\n' + FNS.concat(['esc', 'PA', 'MS']).map(n => 'this.' + n + '=' + n + ';').join(''), bac);
const MS = bac.MS, PA = bac.PA;
const dec = t => String(t).replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;/g, "'").replace(/&amp;/g, '&');
/* ce que la feuille PRÉ-REMPLIT, relu dans son HTML : c'est lui que le patron enregistrerait sans rien toucher */
const preRempli = fil => { const F = bac.msGroupeFeuille(fil), g = re => dec((re.exec(F) || [])[1] || '');
  return { nom: g(/id="mg-nom"[^>]*value="([^"]*)"/), ico: g(/id="mg-ico"[^>]*value="([^"]*)"/), desc: g(/id="mg-desc"[^>]*>([^<]*)<\/textarea>/), coul: (/class="mg-pas cb-([a-z]+) on"/.exec(F) || [])[1] }; };
const mettre = (nom, ico, desc, coul) => { els['mg-nom'] = { value: nom, focus: () => {} }; els['mg-ico'] = { value: ico }; els['mg-desc'] = { value: desc }; els['mg-ok'] = { disabled: false }; els['mg-err'] = { textContent: '' }; els.pasOn = coul ? { getAttribute: () => coul } : null; };
const err = () => els['mg-err'].textContent;
const fil = (fils, id) => (fils || []).filter(f => f.fil === id)[0] || {};

(async () => {
  const { demarrer } = require('./banc-serveur-gestion.js');
  const JETON = 'jeton-de-banc-3022-' + crypto.randomBytes(24).toString('hex'), EMPREINTE = crypto.createHash('sha256').update(JETON).digest('hex');

  console.log('\n1. Les groupes personnalisables : le vrai serveur, sans pont de Pauline');
  const S = await demarrer({});
  vrai('le serveur démarre, une session de patron et une de collaborateur', S.vivant && S.TP && S.TA, S.journal().slice(-300));
  if (!S.vivant) { fini = true; console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); process.exit(1); }
  bac.API = S.B; jeton = S.TP;
  await bac.messListeCharger();
  v('la vraie `messListeCharger` lit la liste du serveur : quatre groupes, aucun `perso`', [MS.lec, MS.fils.filter(f => f.groupe).map(f => f.fil), MS.fils.filter(f => 'perso' in f).length], [1, ['equipe', 'clients', 'plateforme', 'reunions'], 0]);
  const p0 = preRempli('clients');
  v('la feuille d’un groupe jamais personnalisé pré-remplit l’ORIGINE : « Clients », icône « # », gris', [p0.nom, p0.ico, p0.coul], ['Clients', '#', 'gris']);
  mettre(p0.nom, p0.ico, p0.desc, p0.coul); panneau.ouvert = true;
  const r1 = await bac.msGroupeEnregistrer('clients');
  v('⛔ ENREGISTRER sans rien toucher (icône « # » pré-remplie) : le vrai serveur l’accepte (200), la feuille se ferme', [r1 && r1.status, r1 && r1.d.ok, panneau.ouvert, err()], [200, true, false, '']);
  const perso1 = fil(MS.fils, 'clients').perso;
  v('…la page prend le `perso` RENDU par le serveur', perso1, { nom: 'Clients', icone: '#', couleur: 'gris', description: '' });
  await bac.messListeCharger();
  v('⛔ la liste RELUE chez le serveur porte `perso` sur ce groupe seulement', [fil(MS.fils, 'clients').perso, MS.fils.filter(f => 'perso' in f).map(f => f.fil)], [perso1, ['clients']]);
  v('…le registre du serveur est écrit', Object.keys(S.fichier('conversations-groupes.json')), ['clients']);

  mettre('Les clients', '🤝', 'Les entreprises qui nous font confiance', 'vert'); await bac.msGroupeEnregistrer('clients'); await bac.messListeCharger();
  v('un enregistrement avec nom, icône, couleur et description : relu tel quel', fil(MS.fils, 'clients').perso, { nom: 'Les clients', icone: '🤝', couleur: 'vert', description: 'Les entreprises qui nous font confiance' });
  MS.fil = 'clients'; const E = bac.msEnteteHtml();
  vrai('…et l’en-tête de la page dessine ce que le serveur a gardé (icône dans son rond vert, nom, description en sous-titre)', /<span class="ms-av g h cb-vert" aria-hidden="true">🤝<\/span>/.test(E) && /<h2>Les clients<\/h2>/.test(E) && /<p>Les entreprises qui nous font confiance<\/p>/.test(E), E.slice(0, 400));

  /* un refus du serveur : affiché TEL QUEL, la feuille reste ouverte, la liste n'a pas bougé */
  mettre('Le fil de Justin', '💬', '', 'bleu'); panneau.ouvert = true;
  const r2 = await bac.msGroupeEnregistrer('clients');
  v('⛔ un nom avec « Justin » : le vrai serveur refuse (400) et la page affiche SON message, tel quel', [r2.status, err(), panneau.ouvert, MS.groupeBusy], [400, 'Le nom ne peut pas porter le prénom de Justin', true, false]);
  await bac.messListeCharger();
  v('…rien n’a changé chez le serveur', fil(MS.fils, 'clients').perso.nom, 'Les clients');
  mettre('Clients', '💬', '', 'rouge'); jeton = S.TA;
  const r3 = await bac.msGroupeEnregistrer('clients'); jeton = S.TP;
  vrai('⛔ un collaborateur (jeton refusé par le serveur : 403) : la page le dit, sans rien changer', r3 && r3.status === 403 && err().length > 5 && fil(MS.fils, 'clients').perso.nom === 'Les clients', [r3 && r3.status, err()]);
  console.log('    (message affiché pour le 403 : « ' + err() + ' »)');

  /* des valeurs hostiles : le serveur les REFUSE (nom) ou les garde (description, icône) — dans les deux cas rien de brut ne sort de la page */
  const sansBalise = h => { const bal = [...h.matchAll(/<([a-z0-9]+)([^>]*)>/gi)], mal = bal.filter(t => /^(img|script|svg|a|iframe|object|embed|link|form|style)$/i.test(t[1]) || /\s(href|src|action|srcdoc|style)\s*=/i.test(t[2])); return mal.length === 0 ? true : mal.slice(0, 3).map(t => t[0]); };
  mettre('<img src=x onerror=alert(1)>', '💬', '', 'violet'); panneau.ouvert = true;
  const r4 = await bac.msGroupeEnregistrer('plateforme');
  v('⛔ un NOM avec des balises : le vrai serveur refuse (400) et la page affiche sa raison ; rien n’est gardé', [r4.status, /lettres, des chiffres/.test(err()), 'perso' in fil((await (async () => { await bac.messListeCharger(); return MS.fils; })()), 'plateforme')], [400, true, false]);
  mettre('Technique', '<b', 'x', 'violet'); panneau.ouvert = true;
  const r4a = await bac.msGroupeEnregistrer('plateforme');
  v('⛔ une ICÔNE avec une balise : refusée par le vrai serveur (400), sa raison affichée', [r4a.status, err()], [400, 'L’icône est un émoji, ou une ou deux lettres']);
  const HD = ['<img src=x onerror=alert(2)> et </textarea><script>alert(3)</script>'];
  mettre('Technique', '⚙️', HD[0], 'violet'); panneau.ouvert = true;
  const r4b = await bac.msGroupeEnregistrer('plateforme'); await bac.messListeCharger(); MS.fil = 'plateforme';
  const E4 = bac.msEnteteHtml() + bac.msGroupeFeuille('plateforme') + bac.msIconeHtml('plateforme', 'ms-av g') + bac.msNomFil('plateforme');
  console.log('    (description à balises : le serveur répond ' + r4b.status + (r4b.status === 200 ? ', gardées' : ' : « ' + err() + ' »') + ')');
  vrai('⛔ icône et description hostiles (gardées OU refusées par le serveur) : jamais une balise de plus dans l’en-tête, la feuille ni l’icône', sansBalise(E4) === true && (r4b.status !== 200 || (/&lt;img src=x onerror=alert\(2\)&gt;/.test(E4) && /&lt;\/textarea&gt;&lt;script&gt;/.test(E4))), sansBalise(E4));
  await bac.msGroupeDefaut('plateforme');

  const r5 = await bac.msGroupeDefaut('clients'); const tout = 'perso' in fil(MS.fils, 'clients'); await bac.messListeCharger();
  v('« Remettre par défaut » : 200, la page retire `perso` TOUT DE SUITE (avant de relire), et la liste relue chez le serveur n’en a plus', [r5.status, tout, 'perso' in fil(MS.fils, 'clients'), msNom()], [200, false, false, 'Clients']);
  function msNom() { return bac.msNomFil('clients'); }
  v('…et le registre du serveur ne garde plus que l’autre groupe, s’il a été accepté', Object.keys(S.fichier('conversations-groupes.json')).filter(k => k === 'clients'), []);

  console.log('\n2. Pauline : le vrai serveur, pont NON configuré');
  PA.lec = 0; PA.sig = ''; PA.d = null;
  await bac.chargerPauline();
  v('⛔ aucun relevé reçu (200, `recuLe:null`) : « Pas encore de relevé », lu — ni « pont absent » ni « illisible »', [PA.lec, PA.d && PA.d.recuLe, bac.paEtatLigne().lib], [1, null, 'Pas encore de relevé — le Mac n’a rien envoyé']);
  const post = (corpsRel, jt) => fetch(S.B + '/api/pauline/releve', { method: 'POST', headers: Object.assign({ 'Content-Type': 'application/json', 'X-Forwarded-For': '10.122.0.' + (1 + Math.floor(Math.random() * 200)) }, jt ? { Authorization: 'Bearer ' + jt } : {}), body: JSON.stringify(corpsRel) }).then(async r => ({ s: r.status, j: await r.json().catch(() => ({})) }));
  const a503 = await post({}, JETON);
  v('(le serveur) la porte d’envoi du Mac refuse sans empreinte configurée : 503 « pont non configuré »', [a503.s, a503.j.error], [503, 'pont non configuré']);
  fs.writeFileSync(path.join(S.D, 'pauline-releve.json'), '{ cassé');
  PA.sig = ''; await bac.chargerPauline();
  v('⛔ un relevé ILLISIBLE chez le serveur (503) : la page dit « Relevé illisible sur le serveur » avec la raison du serveur — pas « rien reçu », pas « pas configuré »', [PA.lec, bac.paEtatLigne().lib, bac.paEtatLigne().e, /illisible sur le serveur/.test(PA.err)], [-3, 'Relevé illisible sur le serveur', 'retard', true]);
  const t403 = jeton; jeton = S.TA; PA.lec = 0; await bac.chargerPauline(); jeton = t403;
  vrai('un collaborateur (403) : la page ne prend pas cela pour un relevé', PA.lec === -1 && bac.paEtatLigne().lib === 'Le relevé n’a pas pu être lu', [PA.lec, bac.paEtatLigne().lib]);
  await S.fin();

  console.log('\n3. Pauline : le vrai serveur, pont configuré — un relevé posté avec le bon jeton');
  const S2 = await demarrer({ config: { pauline: { jetonSha256: EMPREINTE } } });
  vrai('le serveur démarre', S2.vivant, S2.journal().slice(-300));
  if (!S2.vivant) { fini = true; console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); process.exit(1); }
  bac.API = S2.B; jeton = S2.TP;
  const post2 = (corpsRel, jt) => fetch(S2.B + '/api/pauline/releve', { method: 'POST', headers: Object.assign({ 'Content-Type': 'application/json', 'X-Forwarded-For': '10.123.0.' + (1 + Math.floor(Math.random() * 200)) }, jt ? { Authorization: 'Bearer ' + jt } : {}), body: JSON.stringify(corpsRel) }).then(async r => ({ s: r.status, j: await r.json().catch(() => ({})) }));
  PA.lec = 0; PA.sig = ''; PA.d = null; await bac.chargerPauline();
  v('avant tout relevé : « Pas encore de relevé »', bac.paEtatLigne().lib, 'Pas encore de relevé — le Mac n’a rien envoyé');
  const maint = Date.now(), iso = d => new Date(maint + d).toISOString();
  const HOST = ['<img src=x onerror=alert(1)>', '"><script>alert(2)</script>', 'javascript:alert(3)', '<a href="javascript:alert(4)">x</a>'];
  const rel = { version: 1, genereLe: iso(0), chauffe: { debut: '2026-10-10', jour: 15, plafondDuJour: 7, plafondMax: 15, phase: 'chauffe' },
    jour: { date: '2026-10-26', envoyes: 3, envoyesFroid: 2, reponses: 1, refus: 0, enAttente: 2 },
    recherches: [{ quand: iso(-3600e3), metier: 'nettoyage', ville: 'La Rochelle', trouvees: 12, origine: 'decouverte' }, { quand: iso(-7200e3), metier: HOST[0], ville: 'Niort', trouvees: 5, origine: 'cycle' }],
    entreprises: [{ id: 'c1', nom: HOST[0], ville: 'Niort', metier: 'dératisation', etat: 'courriel_pret', email: 'dirigeant@exemple.fr', contact: HOST[3], majLe: iso(-60e3) },
      { id: 'c2', nom: 'Clim Atlantique', ville: 'Rochefort', metier: 'climatisation', etat: 'envoye', majLe: iso(-120e3) }],
    courriels: [{ id: 'o1', entrepriseId: 'c1', etat: 'en_attente', objet: HOST[1], texte: 'Bonjour,\n' + HOST[2], quand: iso(-1000) }],
    reponses: [{ entrepriseId: 'c1', quand: iso(-500), resume: HOST[3], nature: 'interesse' }] };
  const bon = await post2(rel, JETON);
  v('le Mac poste le relevé avec le bon jeton : 200', [bon.s, bon.j.ok], [200, true]);
  await bac.chargerPauline();
  v('⛔ la vraie `chargerPauline` lit le relevé du vrai serveur : lu, avec l’âge en secondes', [PA.lec, PA.d.ok, typeof PA.d.age, PA.d.releve.entreprises.length], [1, true, 'number', 2]);
  const et = bac.paEtatLigne();
  v('…la ligne d’état dit « Dernier relevé… », en couleur « ok »', [/^Dernier relevé /.test(et.lib), et.e], [true, 'ok']);
  const H = bac.agPaulineHtml(), T = H.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
  vrai('les chiffres du jour et la chauffe, tels que le serveur les rend', /Aujourd’hui : <b>3<\/b> envoyés · <b>1<\/b> réponse · <b>0<\/b> refus · <b>2<\/b> en attente de ton accord/.test(H) && /Chauffe : jour 15, plafond 7 par jour\./.test(H), T.slice(0, 300));
  const compteurs = [...H.matchAll(/<summary>(Recherches|Entreprises|Courriels|Réponses)<span class="pa-n">([^<]*)<\/span>/g)].map(m => m[1] + '=' + m[2]);
  v('les quatre listes ont les nombres du relevé posté', compteurs, ['Recherches=2', 'Entreprises=2', 'Courriels=1', 'Réponses=1']);
  vrai('l’adresse e-mail s’affiche en TEXTE (aucun « mailto: »)', /dirigeant@exemple\.fr/.test(H) && !/mailto:/.test(H));
  const reste = H.replace(/<img src="icons\/agents\/pauline\.jpg"[^>]*>/, ''), balises = [...reste.matchAll(/<([a-z0-9]+)([^>]*)>/gi)], mal = balises.filter(t => /^(img|script|svg|a|iframe|object|embed|link|form|style)$/i.test(t[1]) || /\s(href|src|action|formaction|srcdoc|style)\s*=/i.test(t[2]));
  vrai('⛔ le texte HOSTILE posté par le « Mac » est rendu échappé : aucune balise de plus, aucun href ni src', balises.length > 15 && mal.length === 0 && /&lt;img src=x onerror=alert\(1\)&gt;/.test(H) && /&lt;script&gt;alert\(2\)&lt;\/script&gt;/.test(H), mal.slice(0, 3).map(t => t[0]));
  const gest = [...H.matchAll(/\son(?:click|toggle)="([^"]*)"/g)].map(m => m[1]);
  vrai('⛔ aucun gestionnaire d’attribut ne porte un champ du relevé (clé fixe ou numéro de rangée)', gest.length > 4 && gest.every(a => /^(agPaOuvrir\('(recherches|entreprises|courriels|reponses)',this\.open\)|agPaTexte\(\d+,this\.open\)|agPaTout\('(recherches|entreprises|courriels|reponses)'\))$/.test(a)), gest);

  /* relire le même relevé : l'âge change, le relevé non — aucun redessin */
  await new Promise(r => setTimeout(r, 1300));   /* l'âge, en secondes entières, a bougé : seule la signature du relevé décide d'un redessin */
  const age0 = PA.d.age; rendus.n = 0; await bac.chargerPauline();
  v('⛔ relire le MÊME relevé du vrai serveur ne redessine pas l’écran (l’âge a changé, la signature non)', [rendus.n, PA.lec, PA.d.age > age0], [0, 1, true]);
  const bon2 = await post2(Object.assign({}, rel, { genereLe: iso(1000), jour: Object.assign({}, rel.jour, { envoyes: 4 }) }), JETON);
  await bac.chargerPauline();
  v('un second relevé REMPLACE le premier : la page se redessine et lit « 4 envoyés »', [bon2.s, rendus.n, /<b>4<\/b> envoyés/.test(bac.agPaulineHtml())], [200, 1, true]);
  fini = true;
  await S2.fin();
  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.log('  ✗ banc mort : ' + (e && e.stack || e)); console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); process.exit(1); });
