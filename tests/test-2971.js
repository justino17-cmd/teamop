/* ⛔ CE QUE CE FICHIER GARDE — LA RELECTURE JURIDIQUE DU 23 OCTOBRE 2026 : LES TEXTES DISENT CE QUI SE PASSE, ET RIEN DE PLUS.
   Justin : « tu as déjà tout de ça » — les réponses recommandées de la relecture, avec les faits du dépôt. Ce banc tient ce qui ne tenait par rien d'autre :
     1. PLUS AUCUNE PROMESSE « 24h/24 » / « 7j/7 » dans ce que le site, le portail et les contrats disent (la population est comptée avant de croire un zéro) ;
        l'écart qui reste est DÉCLARÉ et vérifié encore là (app.html seul : la description d'une formule dans l'application — elle ne se publie que sur une phrase de Justin) ; la bêta et la
        démonstration publique, fabriquées, sont refabriquées ici et ne la portent plus ;
     2. LES CROCHETS QUI RESTENT sont exactement ceux de l'avocat, de la signature électronique et de la durée de conservation d'OP MESSAGES — et le serveur, lui, REFUSE de valider
        un texte qui en garde un, ACCEPTE de valider ceux qui n'en ont plus (le vrai module, un vrai registre) ;
     3. LA RÉVISION : sur un registre déjà peuplé (celui du VPS), corriger un `.txt` ne change rien à la Tour — le module dépose UNE fois le texte révisé comme brouillon de plus,
        sans toucher à ce qui est validé ni à ce qu'un client a reçu, et ne le redépose jamais ;
     4. LES FAITS ÉCRITS SONT CEUX DU CODE : ce qui part chez Anthropic (60 clients, 100 traductions par jour, le « Devis IA » rapide qui n'envoie que la demande), le SIRET « en cours
        d'attribution » partout où l'éditeur est nommé, la suppression « possible après 24 mois » sans préavis promis, aucun reste de l'ancienne phrase ;
     5. ⛔ LES PAGES NE PROMETTENT PAS PLUS QUE LE CODE : « adresses et numéros retirés » (analyse d'un incident) et « mot de passe de boîte conservé chiffré » ne s'écrivent que si le CODE
        le fait (les deux routes de l'incident, la fonction qui écrit mailboxes.json) — le texte suit le code dans les deux sens, et le banc se lit sur ce que le serveur fait AUJOURD'HUI. */
'use strict';
const fs = require('fs'), os = require('os'), path = require('path');
const RACINE = path.join(__dirname, '..');
let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + String(JSON.stringify(b)).slice(0, 400) + '\n      obtenu  : ' + String(JSON.stringify(a)).slice(0, 400)); } };
const vrai = (t, c, d) => v(t + (d !== undefined && !c ? ' — ' + String(d).slice(0, 200) : ''), !!c, true);
const lire = f => fs.readFileSync(path.join(RACINE, f), 'utf8');
const sansHtmlCom = s => s.replace(/<!--[\s\S]*?-->/g, ' ');
const sansJsCom = s => s.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
const txtPage = f => sansHtmlCom(lire(f)).replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').replace(/'/g, '’');
const TEXTES = path.join(RACINE, 'server', 'contrats-textes');
const typesTxt = fs.readdirSync(TEXTES).filter(f => /\.txt$/.test(f)).map(f => f.replace(/\.txt$/, '')).sort();
const txt = t => fs.readFileSync(path.join(TEXTES, t + '.txt'), 'utf8');
const tout = (d, re) => { const r = []; (function marche(x) { for (const e of fs.readdirSync(path.join(RACINE, x), { withFileTypes: true })) { const p = x ? x + '/' + e.name : e.name; if (e.isDirectory()) { if (!/^(node_modules|\.git)$/.test(e.name)) marche(p); } else if (re.test(e.name)) r.push(p); } })(d); return r; };

console.log('\n── 2971 · relecture juridique : les textes disent ce qui se passe ──');

console.log('\n1. Plus aucune promesse « 24h/24 » ni « 7j/7 »');
const PROMESSE = /24 ?h ?\/ ?24|7 ?j ?\/ ?7/i;
/* L'ÉCART EST REFERMÉ (v773, 24 octobre 2026, Justin : « publie tout ») : la description Business Premium d'`app.html` dit elle-même « assistance prioritaire ». La liste reste, VIDE, pour
   qu'un écart futur se déclare ici et nulle part ailleurs ; app.html est relue comme les autres pages, et les générateurs ne portent plus de remplacement (contrôle plus bas). */
const ECART_APPLICATION = [];
/* ce n'est pas une promesse : un commentaire de code d'OP MESSAGES qui explique qu'« 24h/24 » n'est pas une heure à lire dans un mail */
const SANS_RAPPORT = ['apercu/opmessages/index.html'];
const racineHtml = fs.readdirSync(RACINE).filter(f => /\.html$/.test(f));
const pagesServies = racineHtml.concat(tout('apercu', /\.html$/)).filter(f => !ECART_APPLICATION.includes(f) && !SANS_RAPPORT.includes(f) && f !== 'apercu/app.html');
vrai('(population) les pages du site, du portail et leurs aperçus sont relues : ' + pagesServies.length, pagesServies.length > 60 && pagesServies.includes('tarifs.html') && pagesServies.includes('recap-abonnement.html') && pagesServies.includes('apercu/site/tarifs.html'));
v('⛔ aucune page servie (hors l’écart déclaré) ne promet « 24h/24 » ni « 7j/7 »', pagesServies.filter(f => PROMESSE.test(sansHtmlCom(lire(f)))), []);
v('⛔ …ni le générateur du site (code, commentaires retirés)', PROMESSE.test(sansJsCom(lire('scripts/site-marine.js'))), false);
v('⛔ …ni aucun texte de contrat', typesTxt.filter(t => PROMESSE.test(txt(t))), []);
vrai('(population) les contrats relus sont les onze pièces', typesTxt.length === 11, typesTxt.length);
for (const f of ECART_APPLICATION) vrai('écart déclaré : ' + f + ' porte encore la description « service 24h/24 » (la retirer d’ici le jour où elle est corrigée)', PROMESSE.test(lire(f)));
vrai('(population) la bêta et la démonstration publique sont parmi les pages relues', pagesServies.includes('beta.html') && pagesServies.includes('demo.html'));
vrai('(population) l’application elle-même (app.html) est parmi les pages relues', pagesServies.includes('app.html'));
v('⛔ les générateurs ne corrigent plus la description au passage (app.html la dit juste : un remplacement resté là masquerait un retour du texte)', ['beta-build.js', 'demo-build.js'].filter(g => /24 ?h ?\/ ?24/.test(sansJsCom(lire(g)))), []);
{ /* refabriqués pour de bon : le générateur fait ce qu'on dit, pas seulement le fichier rangé */
  const cp = require('child_process'), tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'op2971-'));
  for (const [gen, sortie] of [['beta-build.js', 'beta.html'], ['demo-build.js', 'demo.html']]) {
    const dest = path.join(tmp, sortie);
    cp.execFileSync(process.execPath, [path.join(RACINE, gen), dest], { cwd: RACINE, stdio: 'pipe', timeout: 60000 });
    const fabrique = fs.readFileSync(dest, 'utf8');
    vrai('⛔ ' + gen + ' fabrique une page sans « 24h/24 » ni « 7j/7 » (population : ' + Math.round(fabrique.length / 1024) + ' Ko, la description de la formule y est)', fabrique.length > 1000000 && /Business Premium/.test(fabrique) && !PROMESSE.test(fabrique) && /assistance prioritaire/.test(fabrique));
    /* ⛔ Une BÊTA EN AVANCE (publiée seule sur `main`, app.html attend la phrase de Justin) n'est pas la génération de l'app.html de `main`, par construction.
       Elle se reconnaît à son numéro, PLUS HAUT que celui d'app.html ; elle est alors relue contre la promesse comme toute page servie (contrôle plus haut), et
       l'égalité redevient stricte d'elle-même le jour où app.html la rattrape. La démonstration publique, elle, suit toujours l'application publiée. */
    const vNum = t => parseInt((/const APP_VERSION = '(\d+)/.exec(t) || [])[1], 10) || 0;
    const enAvance = sortie === 'beta.html' && vNum(lire('beta.html')) > vNum(lire('app.html'));
    vrai('   … et la page rangée dans le dépôt est celle que le générateur fabrique' + (enAvance ? ' (bêta EN AVANCE : v' + vNum(lire('beta.html')) + ' contre v' + vNum(lire('app.html')) + ' — relue contre la promesse, pas comparée)' : ''),
      enAvance ? !PROMESSE.test(sansHtmlCom(lire(sortie))) : fabrique === lire(sortie));
  }
  fs.rmSync(tmp, { recursive: true, force: true });
}
const TARIFS = sansHtmlCom(lire('tarifs.html'));
vrai('la carte Business Premium de la page tarifs dit l’assistance prioritaire, plus 24h/24', /l.assistance prioritaire/.test(TARIFS) && /Assistance prioritaire et accompagnement à la mise en route/.test(TARIFS));
vrai('la page de paiement dit la même chose (assistance prioritaire ; la création sur mesure passe par un devis écrit)', /titre: 'Assistance prioritaire'/.test(lire('recap-abonnement.html')) && /devis écrit accepté avant tout travail/.test(lire('recap-abonnement.html')));
vrai('la page tarifs ne dit plus « visio illimitée » (la réunion compte au plus dix personnes) et dit le changement de formule à la période suivante',
  !/visio illimit/i.test(TARIFS) && /jusqu.à 10 personnes par réunion/.test(TARIFS) && /s.applique à la période suivante/.test(TARIFS));

console.log('\n2. Les crochets qui restent, et ce que le serveur accepte de valider');
const CROCHET = /\[\s*[AÀ]\s+(?:CONFIRMER|COMPLÉTER|VÉRIFIER|RENSEIGNER)[^\]]*\]/gi;
const crochets = Object.fromEntries(typesTxt.map(t => [t, (txt(t).normalize('NFC').match(CROCHET) || [])]));
v('⛔ les crochets restants, pièce par pièce : l’avocat, la signature électronique, la conservation d’OP MESSAGES — rien d’autre',
  Object.fromEntries(Object.entries(crochets).filter(([, l]) => l.length).map(([t, l]) => [t, l.length])),
  { conditions_generales: 2, conditions_op_messages: 2, cp_op_messages_perso: 1, dpa: 3, signature_electronique: 2 });
const quoi = (t, re) => crochets[t].some(c => re.test(c));
vrai('…conditions générales : le plafond de responsabilité et la durée de 24 mois, tous deux « PAR UN JURISTE »', quoi('conditions_generales', /PAR UN JURISTE : validité de ce plafond/) && quoi('conditions_generales', /PAR UN JURISTE : durée de 24 mois/));
vrai('…OP MESSAGES : le régime du compte « Perso » (juriste) et la durée de conservation des messages, qui reste à décider', quoi('conditions_op_messages', /PAR UN JURISTE AVANT L.OUVERTURE : le compte « Perso »/) && quoi('conditions_op_messages', /durée de conservation des messages/));
vrai('…sous-traitance : transferts hors UE, plafond, client non professionnel (juriste)', quoi('dpa', /mécanisme retenu/) && quoi('dpa', /compatibilité de ce plafond/) && quoi('dpa', /Client agissant à titre non professionnel/));
vrai('…signature électronique : le parcours pas encore en service, et le niveau de signature simple (juriste)', quoi('signature_electronique', /parcours d.acceptation en ligne/) && quoi('signature_electronique', /signature électronique simple suffit/));
v('⛔ aucune des pièces d’une formule d’OP GESTION ne garde de crochet : Justin peut les valider', ['cp_op_gestion_pro', 'cp_op_gestion_business', 'cp_op_gestion_business_premium', 'conditions_op_gestion', 'cp_op_messages_pro', 'cp_op_messages_business_premium'].filter(t => crochets[t].length), []);

const mod = require(path.join(RACINE, 'server', 'contrats.js'));
const banc = fs.mkdtempSync(path.join(os.tmpdir(), 'b2971-'));
process.on('exit', () => { try { fs.rmSync(banc, { recursive: true, force: true }); } catch (x) {} });
let horloge = 2e12;
const monter = (nom, textesDir) => { const D = path.join(banc, nom); fs.mkdirSync(D, { recursive: true }); return { D, m: mod({ get() {}, post() {} }, { DATA_DIR: D, monAdmin() {}, monPatronStrict() {}, textesDir, maintenant: () => ++horloge }) }; };
const R = monter('neuf', TEXTES);
const codes = Object.fromEntries(typesTxt.map(t => [t, R.m.valider(t, 1, 'Justin').code]));
v('⛔ le VRAI serveur refuse de valider les cinq pièces qui gardent un crochet, et accepte les six autres',
  typesTxt.filter(t => codes[t] === 409).sort(),
  ['conditions_generales', 'conditions_op_messages', 'cp_op_messages_perso', 'dpa', 'signature_electronique']);
v('…les six autres sont validées (200)', typesTxt.filter(t => codes[t] === 200).sort(), ['conditions_op_gestion', 'cp_op_gestion_business', 'cp_op_gestion_business_premium', 'cp_op_gestion_pro', 'cp_op_messages_business_premium', 'cp_op_messages_pro']);

console.log('\n3. La révision : un registre déjà peuplé reçoit le texte révisé, UNE fois, en brouillon');
const REV = mod.REVISIONS;
v('(population) les sept pièces dont le texte a changé portent une révision', Object.keys(REV).sort(), ['conditions_generales', 'conditions_op_messages', 'cp_op_gestion_business', 'cp_op_gestion_business_premium', 'cp_op_gestion_pro', 'cp_op_messages_business_premium', 'dpa']);
/* un registre « d'avant » : un ancien texte validé (conditions générales), un brouillon (DPA), le reste semé sans marque de révision */
const ANCIEN = monter('ancien', null);
ANCIEN.m.brouillon('conditions_generales', 'Ancien texte des conditions générales.', 'Justin'); ANCIEN.m.valider('conditions_generales', 1, 'Justin');
ANCIEN.m.brouillon('dpa', 'Ancien contrat de sous-traitance [À CONFIRMER : à reprendre].', 'agent');
ANCIEN.m.brouillon('conditions_op_gestion', 'Conditions OP GESTION, inchangées.', 'agent');
const avant = JSON.parse(fs.readFileSync(path.join(ANCIEN.D, 'contrats-documents.json'), 'utf8'));
const n1 = ANCIEN.m.semer(TEXTES);
const apres = JSON.parse(fs.readFileSync(path.join(ANCIEN.D, 'contrats-documents.json'), 'utf8'));
v('⛔ la révision dépose UN brouillon sur chacune des deux pièces révisées déjà présentes (dix dépôts en tout : les huit pièces absentes entrent comme au premier semis)', [n1, apres.conditions_generales.length, apres.dpa.length, Object.keys(apres).filter(t => REV[t]).length], [10, 2, 2, 7]);
v('⛔ …marqué « revision », jamais validé, texte du fichier', [apres.conditions_generales[1].statut, apres.conditions_generales[1].revision, apres.conditions_generales[1].texte === txt('conditions_generales').replace(/\r\n/g, '\n').trim()], ['brouillon', REV.conditions_generales, true]);
v('⛔ …et ce qui était validé ne bouge pas : la version en vigueur reste la 1, avec son empreinte', [ANCIEN.m.enVigueur('conditions_generales').n, ANCIEN.m.enVigueur('conditions_generales').empreinte, avant.conditions_generales[0].empreinte], [1, mod.sha('Ancien texte des conditions générales.'), avant.conditions_generales[0].empreinte]);
v('…une pièce dont le fichier n’a pas changé n’en reçoit pas', apres.conditions_op_gestion.length, 1);
const n2 = ANCIEN.m.semer(TEXTES);
const apres2 = JSON.parse(fs.readFileSync(path.join(ANCIEN.D, 'contrats-documents.json'), 'utf8'));
v('⛔ un second passage (le redémarrage suivant) ne redépose RIEN', [n2, JSON.stringify(apres2) === JSON.stringify(apres)], [0, true]);
ANCIEN.m.brouillon('dpa', 'Version écrite par Justin dans la Tour.', 'Justin');
v('…ni après qu’une version de Justin est venue s’ajouter', [ANCIEN.m.semer(TEXTES), JSON.parse(fs.readFileSync(path.join(ANCIEN.D, 'contrats-documents.json'), 'utf8')).dpa.length], [0, 3]);
v('…et un registre neuf n’a qu’UNE version par pièce (la révision ne double pas le premier semis)', Object.values(JSON.parse(fs.readFileSync(path.join(R.D, 'contrats-documents.json'), 'utf8'))).every(l => l.length === 1), true);

console.log('\n4. Les faits écrits sont ceux du code');
const CG = txt('conditions_generales'), DPA = txt('dpa');
const SOUS = txtPage('sous-traitance.html'), REG = txtPage('registre-traitements.html'), ML = txtPage('mentions-legales.html'), CONF = txtPage('confidentialite.html');
/* — le SIRET : « en cours d'attribution » à chaque fois que l'éditeur est nommé avec son SIREN — */
const lieux = [['conditions_generales.txt', CG], ['dpa.txt', DPA], ['sous-traitance.html', SOUS], ['registre-traitements.html', REG], ['mentions-legales.html', ML], ['confidentialite.html', CONF], ['espace.html', txtPage('espace.html')]];
for (const [f, T] of lieux) {
  const n = (T.match(/107 995 011/g) || []).length, bon = (T.match(/107 995 011 ?\(SIRET en cours d.attribution\)/g) || []).length;
  v('⛔ ' + f + ' : le SIREN est toujours suivi de « (SIRET en cours d’attribution) » (' + n + ' mention)', [n > 0, bon], [true, n]);
}
v('…et plus aucun crochet « SIRET » dans les contrats', /SIRET en cours d.attribution à la date de rédaction/.test(CG), false);
/* — la conservation : possible après 24 mois, aucun préavis promis — */
const SUPPR = /peuvent être supprimées après (?:<b>)?24 mois(?:<\/b>)? sans abonnement/i;
for (const [f, T] of [['conditions_generales.txt', CG], ['dpa.txt', DPA], ['sous-traitance.html', SOUS], ['registre-traitements.html', REG], ['mentions-legales.html (brut)', lire('mentions-legales.html')]]) vrai('⛔ ' + f + ' : « les données peuvent être supprimées après 24 mois sans abonnement »', SUPPR.test(T));
const ANCIENNE = /courriel (?:de préavis )?pr[ée]vient[^.]{0,60}30 jours|30 jours avant (?:cette |la )?suppression|avertissement 30 jours|conservées?[^.]{0,30}24 mois[^.]{0,40}puis supprimées/i;
v('⛔ aucun reste de l’ancienne promesse (courriel 30 jours avant, suppression automatique à 24 mois)', [['CG', CG], ['DPA', DPA], ['sous-traitance', SOUS], ['registre', REG], ['mentions', ML], ['confidentialité', CONF]].filter(([, T]) => ANCIENNE.test(T)).map(([n]) => n), []);
vrai('mentions-legales.html:74 garde sa phrase (citée par le serveur et les bancs) : « n’entraînent aucune suppression »', /n'entraînent aucune suppression/.test(lire('mentions-legales.html').split('\n')[73]));
vrai('⛔ le contrat remis par espace.html ne dit plus « jamais supprimées » : il dit la même chose que les autres textes (24 mois sans abonnement)', !/ne sont jamais supprimées/.test(lire('espace.html')) && /peuvent l.être après 24 mois sans abonnement/.test(lire('espace.html')));
/* — ce qui part chez Anthropic, et ce que le code envoie vraiment — */
const DEVIS = sansJsCom(lire('server/agent-devis.js')), INDEX = sansJsCom(lire('server/index.js')), APP = sansJsCom(lire('app.html'));
vrai('(population) les trois sources du code sont lues', DEVIS.length > 3000 && INDEX.length > 500000 && APP.length > 1000000);
vrai('le code ne passe que 60 clients à l’assistant de devis (le serveur ET l’application)', (DEVIS.match(/\.slice\(0, 60\)/g) || []).length >= 2 && /visibleClients\(db\.clients\|\|\[\]\)\.slice\(0,60\)/.test(APP));
vrai('le code plafonne la traduction à 100 par entreprise et par jour', /TRAD_ENTREPRISE_MAX = 100\b/.test(INDEX) && /traduireMail\(req, res, [^,]+, TRAD_ENTREPRISE_MAX\)/.test(INDEX));
vrai('le « Devis IA » rapide n’envoie que la demande (jamais un client)', /fetch\(PUSH_API\+'\/api\/devis\/generer',\{method:'POST',headers:\{'Content-Type':'application\/json'\},\s*body:JSON\.stringify\(\{team:syncTeam\(\),metier:metierId\(\),code:code\|\|undefined,demande,profond:!!profond(?:,metiersAssocies:metiersAssociesEnvoi\(\))?\}\)/.test(APP));   // v778 : + le CODE du métier (jamais un client) ; v779 : + les métiers associés (identifiants, ou rien)
vrai('l’explication d’un incident envoie message, trace, écran et extrait de code (« Expliquer la cause »)', /'- message : ' \+ [^\n]*issue\.message/.test(INDEX) && /issue\.stack \? '- trace/.test(INDEX) && /écran ouvert : ' \+ \(issue\.categorie/.test(INDEX) && /Code du dépôt autour de/.test(INDEX));
const ANTH = [['conditions_generales.txt', CG], ['dpa.txt', DPA], ['sous-traitance.html', SOUS], ['registre-traitements.html', REG], ['confidentialite.html', CONF]];
for (const [f, T] of ANTH) {
  vrai('⛔ ' + f + ' : ' + '« ne servent pas à entraîner ses modèles, selon ses conditions commerciales applicables à l’API »', /ne servent pas à entraîner ses modèles, selon ses conditions commerciales applicables à l.API|ne s.en sert pas pour entraîner ses modèles, selon ses conditions commerciales applicables à l.API/.test(T));
  vrai('   … 60 clients visibles, le nom, l’adresse et la ville ; la traduction « tel quel » ' + (f === 'confidentialite.html' ? '' : ', 100 par jour'), /60 (?:premiers )?clients/.test(T) && /tel quel/.test(T) && (f === 'confidentialite.html' || /100 (?:traductions )?par jour/.test(T)));
}
/* ⛔ « RETIRÉS » EST UNE PROMESSE SUR LE CODE, PAS SUR UNE INTENTION. Les deux routes d'analyse d'un incident (« Expliquer la cause », « Proposer un correctif ») construisent leur contexte avec le
   message et la trace d'un incident remonté par /api/monitor/report — publique, sans preuve. Les pages ne disent « adresses électroniques et numéros de téléphone retirés » QUE si le code des
   DEUX routes ne laisse plus passer `issue.message` / `issue.stack` tels quels dans la chaîne envoyée ; tant qu'il les concatène bruts, elles disent qu'aucun filtre ne les retire. Dans les deux
   sens : le jour où le filtre entre, ce banc oblige à réécrire les trois textes (et la mutation « filtre retiré » le fait tomber). */
const routeIncident = (chemin) => { const d = INDEX.indexOf("app.post('" + chemin + "'"); if (d < 0) return ''; const f = INDEX.indexOf('\napp.', d + 10); return INDEX.slice(d, f < 0 ? d + 12000 : f); };
const ROUTES_INCIDENT = ['/api/monitor/expliquer', '/api/monitor/proposer'].map(routeIncident);
vrai('(population) les deux routes d’analyse d’un incident sont trouvées et lisent le message de l’incident', ROUTES_INCIDENT.every(r => r.length > 800 && /issue\.message/.test(r) && /issue\.stack/.test(r)), ROUTES_INCIDENT.map(r => r.length));
const BRUT_INCIDENT = /\+\s*issue\.(?:message|stack)\b|\+\s*\(\s*issue\.(?:message|stack)\s*(?:\|\|[^()]*)?\)/;   // « + issue.message » ou « + (issue.message || '') » ; pas « + (issue.stack ? … » (une condition)
const FILTRE_INCIDENT = ROUTES_INCIDENT.every(r => !BRUT_INCIDENT.test(r));
for (const [f, T] of [['dpa.txt', DPA], ['sous-traitance.html', SOUS], ['registre-traitements.html', REG]]) {
  const bout = T.slice(T.indexOf('Expliquer la cause'));
  vrai('⛔ ' + f + ' : l’analyse d’un incident (« Expliquer la cause », « Proposer un correctif ») est déclarée', /Expliquer la cause/.test(T) && /Proposer un correctif/.test(T));
  vrai('⛔ ' + f + ' : « adresses électroniques et numéros de téléphone retirés » ' + (FILTRE_INCIDENT ? 'est écrit (le code filtre)' : 'n’est PAS écrit (le code ne filtre rien) ; il dit « aucun filtre »'),
    FILTRE_INCIDENT ? /adresses électroniques et numéros de téléphone retirés/.test(bout) : (!/adresses électroniques et numéros de téléphone retirés/.test(bout) && /aucun filtre ne retire/i.test(bout.slice(0, 1500))));
}
for (const [f, T] of [['sous-traitance.html', SOUS], ['registre-traitements.html', REG]]) vrai('⛔ ' + f + ' : l’objet du courriel reçu part avec son texte', /objet et (?:son )?texte|l.objet et le texte/.test(T));
vrai('⛔ le DPA ne dit plus que les agents ne reçoivent que « des faits fermés » : il dit aussi le texte libre', !/uniquement avec des faits fermés/.test(DPA) && /texte libre/.test(DPA) && /noms non retirés/.test(DPA));
/* — la décision de chaque pièce, mot pour mot — */
const QUI = [
  ['conditions_generales', /sans s'engager sur un taux chiffré/], ['conditions_generales', /La nouvelle formule s'applique à la période suivante ; la période en cours n'est ni remboursée ni recalculée\./],
  ['conditions_generales', /Les accès sont envoyés par courriel à l'adresse confirmée du compte, une fois l'espace ouvert\./], ['conditions_generales', /ouvrira avec sa nouvelle version, à une date annoncée sur teamop\.fr ; aucune formule n'est facturée avant/],
  ['cp_op_gestion_pro', /La nouvelle formule s'applique à la période suivante ; la période en cours n'est ni remboursée ni recalculée\./],
  ['cp_op_gestion_business', /traitement prioritaire, sans délai de réponse garanti\./], ['cp_op_gestion_business', /La nouvelle formule s'applique à la période suivante/],
  ['cp_op_gestion_business_premium', /TEAM OP étudie la demande ; périmètre, délai et prix éventuel sont fixés dans un devis écrit, accepté avant tout travail\./], ['cp_op_gestion_business_premium', /Assistance : assistance prioritaire et accompagnement à la mise en route\./],
  ['cp_op_messages_business_premium', /visio \(HD, partage d'écran\) jusqu'à 10 personnes par réunion/], ['conditions_op_messages', /ouvrira avec sa nouvelle version, à une date annoncée sur teamop\.fr ; aucune formule n'est facturée avant/],
  ['conditions_op_messages', /api\.teamop\.fr[^.]*IONOS SE en France[^.]*Francfort/], ['dpa', /pour OP GESTION, copie figée conservée 30 jours puis supprimée ; pour OP MESSAGES, stockage tant qu'il n'a pas son propre serveur/],
];
for (const [t, re] of QUI) vrai(t + ' : ' + String(re).slice(1, 70) + '…', re.test(txt(t)));
vrai('la réunion d’OP MESSAGES compte au plus dix personnes dans le code (ce que dit la pièce)', /const REUNION_PERSONNES_MAX = 10;/.test(sansJsCom(lire('server-msg/formule.js'))));
/* — les mots de passe des boîtes : le texte suit ce que le code ÉCRIT SUR LE DISQUE (le chiffrement est un AUTRE chantier ; tant qu'il n'est pas dans ce code, aucune page ne dit « chiffré ») —
   ⛔ Le 23 octobre 2026, trois pages disaient « conservé chiffré sur le serveur » alors que `saveMailboxes()` écrit `JSON.stringify(mailboxes)` — le mot de passe en clair — dans mailboxes.json
   (seules les sauvegardes sont chiffrées). On lit donc la fonction qui écrit : si elle jette l'objet tel quel, les pages ne promettent rien de plus et le registre le dit ; le jour où elle
   ne le fait plus, ce banc oblige à réécrire les phrases. */
const iSauve = INDEX.indexOf('function saveMailboxes()');
const SAUVE = iSauve < 0 ? '' : INDEX.slice(iSauve, iSauve + 700).split(/\n(?=function |app\.)/)[0];
/* Depuis le chantier des boîtes (23 octobre 2026), `saveMailboxes()` passe par le coffre (`server/coffre-boites.js`) : c'est LUI qui écrit, et
   il écrit le mot de passe scellé (`passScelle = sceller(…)`, la clé maître du socle). On suit donc l'écriture jusqu'au coffre. */
const PAR_COFFRE = /coffreBoites\.ecrire\(\s*MAILBOX_PATH/.test(SAUVE);
const COFFRE = PAR_COFFRE && fs.existsSync(path.join(RACINE, 'server', 'coffre-boites.js')) ? sansJsCom(lire('server/coffre-boites.js')) : '';
vrai('(population) la fonction qui écrit mailboxes.json est trouvée' + (PAR_COFFRE ? ', et le coffre qu\'elle appelle' : ''), SAUVE.length > 40 && (/writeFileSync\(MAILBOX_PATH/.test(SAUVE) || (PAR_COFFRE && COFFRE.length > 200)), SAUVE.slice(0, 120));
const BOITES_EN_CLAIR = PAR_COFFRE ? !/passScelle\s*=\s*sceller\(/.test(COFFRE) : /JSON\.stringify\(\s*mailboxes\s*\)/.test(SAUVE);
const DIT_CHIFFRE = T => /mots? de passe d.application[^.<]{0,120}conserv\S*\s+chiffr/i.test(T) || /conserv\S*\s+chiffr\S*[^.<]{0,60}mots? de passe d.application/i.test(T);   // \S et non \w : « conservé » porte un é
const PAGES_BOITES = [['registre-traitements.html', REG], ['sous-traitance.html', SOUS], ['confidentialite.html', CONF], ['apercu/registre-traitements.html', txtPage('apercu/registre-traitements.html')], ['apercu/sous-traitance.html', txtPage('apercu/sous-traitance.html')], ['apercu/confidentialite.html', txtPage('apercu/confidentialite.html')]];
for (const [f, T] of PAGES_BOITES) vrai('⛔ ' + f + ' : ' + (BOITES_EN_CLAIR ? 'ne dit pas « conservé chiffré » du mot de passe d’une boîte (le code l’écrit en clair)' : 'dit le mot de passe d’une boîte « conservé chiffré » (le code ne l’écrit plus en clair)'), DIT_CHIFFRE(T) === !BOITES_EN_CLAIR);
vrai('⛔ le registre dit ce que fait le code des mots de passe de boîtes (' + (BOITES_EN_CLAIR ? '« sans chiffrement propre », seules les sauvegardes chiffrées' : 'chiffré sur le serveur') + ')',
  BOITES_EN_CLAIR ? (/sans chiffrement propre \(seules les sauvegardes sont chiffrées\)/.test(REG) && /il n.est chiffré que dans les sauvegardes/.test(REG) && /Trois points appellent une décision/.test(REG)) : /conservé chiffré sur le serveur/.test(REG.slice(REG.indexOf('Mesures de sécurité'))));
vrai('…la politique de confidentialité nomme le sous-traitant Anthropic et l’éditeur (plus « éditée par OP GESTION », qui est une application)', /Anthropic PBC/.test(CONF) && /TEAM OP — Justin Biret, entrepreneur individuel/.test(CONF) && !/éditée par OP GESTION/.test(CONF));

console.log('\n' + ok + ' ✓  ' + ko + ' ✗'); process.exit(ko ? 1 : 0);
