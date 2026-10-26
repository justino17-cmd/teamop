/* 3011 — L'ÉQUIPE EN LISTES GROUPÉES, PAULINE, LE VISAGE DANS L'EN-TÊTE ET LES GROUPES PERSONNALISABLES (Tour v2.112, 25 octobre 2026).
   Justin : « revoir tout l'onglet Agents, il n'est pas super bien fait, ni pro, ni simple » ; « mets-moi Pauline ici » ; la photo de l'agent devant son nom dans la
   messagerie ; les groupes (Équipe TeamOP, Clients, Plateforme, Réunions) personnalisables : nom, icône, couleur, description.
   Ce banc EXÉCUTE les vraies fonctions de tour.html (jamais un motif sur leur texte) :
     · Équipe : une rangée par agent (visage, nom, rôle, mot d'état, segmenté, « Parler ») rangée par couche ; plus de tuiles ni de redites ; Pauline à part,
       SANS segmenté et SANS chiffre inventé ; la ligne d'état dit les nombres du serveur et « tâches illisibles » quand la file l'est ;
     · en-tête d'un fil : la photo d'un agent (l'icône d'un groupe à la même place), « Modifier » pour le patron seul, valeurs hostiles échappées ;
     · `perso` absent (serveur d'avant) = valeurs d'origine ; `perso` hostile (couleur hors liste, textes trop longs) = borné ;
     · la feuille « Modifier » : six pastilles dont une cochée, bornes 40 / 4 / 120, refus du serveur affiché tel quel, un seul envoi à la fois, patron seul. */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const RACINE = path.join(__dirname, '..');
let ok = 0, ko = 0, fini = false;
/* ⛔ un banc qui s'arrête SANS finir (une promesse jamais résolue vide la boucle d'événements) sortait en 0 : on le dit, et on sort en 1 */
process.on('exit', () => { if (!fini) { console.log('  ✗ banc interrompu avant la fin (une attente n’a jamais abouti)'); process.exitCode = 1; } });
const vrai = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? ' — ' + String(typeof d === 'string' ? d : JSON.stringify(d)).slice(0, 400) : '')); } };
console.log('── test-3011 : Équipe en listes groupées, Pauline, en-tête avec visage, groupes personnalisables ──');
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
const FNS = ['agMode', 'agEnPause', 'agParId', 'agNom', 'agParams', 'agTachesDe', 'agDispo', 'agEnCoursTxt', 'agQuiFaitQuoi', 'agAide', 'agAvatar', 'vueAgents',
  'paObj', 'paT', 'paNb', 'paMs', 'paUnite', 'paDepuis', 'paQuand', 'paAge', 'paEtatLigne', 'paChiffres', 'paChauffe', 'paListe', 'paMot', 'paNom', 'paLigne', 'agPaulineHtml', 'agPaOuvrir', 'agPaTout', 'agPaTexte', 'paMajAge', 'paApres', 'chargerPauline',
  'msAgentsParId', 'msEtat', 'msEstGroupe', 'msGroupePerso', 'msNomFil', 'msIconeHtml', 'msSousTitre', 'msEnteteHtml', 'msGroupeFeuille', 'msGroupeModifier', 'msGroupeCouleur', 'msGroupeErr', 'msGroupeEnvoyer', 'msGroupeEnregistrer', 'msGroupeDefaut'];
const FN = FNS.map(fonction);
const VARS = [ligne('var AG_MODES='), ligne('var AG_PHOTOS='), ligne('var MS_GROUPES_LIB='), ligne('var MS_COULEURS='), ligne('var MS_ETAT_LIB='), ligne('var INJOIGNABLE='), ligne('var PA_LISTES='), ligne('var PA_RETARD='), ligne('var PA_E_ENT='), ligne('var PA_E_COU='), ligne('var PA_E_REP='), corps('var PA={') + ';', corps('var AG_TYPES=') + ';', corps('var MS={') + ';'].join('\n');
vrai('(population) les ' + FNS.length + ' fonctions et les tables sont trouvées dans le fichier livré', FN.every(f => f.length > 30) && VARS.length > 500, FNS.filter((n, i) => FN[i].length <= 30).join(','));

/* ── le bac : un DOM minimal, un apiPost scripté, et l'état réel de la page ── */
const els = {}, panneau = { ouvert: false, html: '' }, appels = [], toasts = [];
const bac = {
  JSON, Date, String, Array, Math, Object, Number, Promise, Error, console,
  MYROLE: 'patron', INJOIGNABLE: 'Serveur injoignable',
  AG: { loaded: true, err: '', illisible: false, pause: null, agents: [], enAttente: 0, validations: [], journal: [], taches: [], lec: { validations: 1, journal: 1, taches: 1 }, sec: 'equipe', busy: false, cleOk: true, cv: { nonLus: 0 }, dos: {} },
  MS: null, TAB: 'agents', rendus: 0, render: () => { bac.rendus++; }, etatMaj: 0, apiGetAppels: [], apiGet: u => { bac.apiGetAppels.push(u); return bac.__get(u); },
  enTete: t => '<h1>' + t + '</h1>', acSquel: () => '<sq>', agIllisible: t => '<ill>' + t,
  $: id => els[id] || null,
  document: { querySelector: sel => (sel === '#tour-panneau .mg-pas.on' ? (els.pasOn || null) : null), querySelectorAll: () => [], getElementById: id => (id === 'pa-etat' ? { set textContent(t) { bac.etatMaj++; bac.etatTexte = t; }, setAttribute: () => {} } : null) },
  tourPanneau: h => { panneau.ouvert = true; panneau.html = h; }, tourPanneauFermer: () => { panneau.ouvert = false; },
  toast: t => toasts.push(t), messPeindreListe: () => {}, messPeindreEntete: () => {},
  apiPost: (u, c) => { appels.push({ u, c }); const r = bac.__reponse; return Promise.resolve(r ? r(u, c) : { ok: true, status: 200, d: {} }); }
};
vm.createContext(bac);
vm.runInContext(ESC + '\n' + VARS + '\n' + FN.join('\n') + '\n' + FNS.map(n => 'this.' + n + '=' + n + ';').join('') + '\nthis.MS=MS;\nthis.MS_GROUPES_LIB=MS_GROUPES_LIB;this.MS_COULEURS=MS_COULEURS;', bac);
const MS = bac.MS;
vrai('(population) MS, ses groupes et ses six couleurs existent', MS && Object.keys(bac.MS_GROUPES_LIB).length === 4 && bac.MS_COULEURS.length === 6, Object.keys(bac.MS_GROUPES_LIB));

/* ═══ 1. L'ÉQUIPE ═══ */
const REG = require(path.join(RACINE, 'server', 'agents.js')).AGENTS;
const MODES = { victor: 'auto', hugo: 'auto', margaux: 'auto', camille: 'brouillon', lea: 'brouillon' };
bac.AG.agents = REG.map(a => Object.assign({}, a, { mode: MODES[a.id] || 'arret', cerveau: true }));
bac.AG.taches = [{ id: 'a', de: 'victor', vers: 'camille', type: 'escalade_humain', statut: 'prise', params: {} }, { id: 'b', de: 'victor', vers: 'hugo', type: 'verifier_paiement', statut: 'attente', params: {} }];
let H = bac.vueAgents();
const rangs = (H.match(/<article class="ag-rang/g) || []).length;
vrai('une rangée par agent du registre (16) + celle de Pauline, rangées en listes groupées', rangs === 17 && (H.match(/<div class="ag-lg">/g) || []).length === 6, [rangs, (H.match(/class="ag-lg"/g) || []).length]);
vrai('les titres de section sont les couches du registre, dans l’ordre, puis « Prospection — sur ton Mac »', JSON.stringify([...H.matchAll(/<div class="ag-couche">([^<]*)</g)].map(m => m[1])) === JSON.stringify(['Coordination', 'Clients', 'Plateforme', 'Produit', 'Croissance', 'Prospection — sur ton Mac']));
vrai('plus aucune tuile de chiffres, plus de carte, plus de pastille « Vague », plus de redite', !/class="kpi"|grille-kpi|ag-carte|ag-vague|Branché|Ne fait rien tant que|Plafond mensuel/.test(H));
vrai('la ligne d’état : « 3 en auto · 2 en brouillon · 11 à l’arrêt · 1 tâche en attente »', /<b>3 en auto · 2 en brouillon · 11 à l’arrêt · 1 tâche en attente<\/b>/.test(H), H.slice(H.indexOf('ag-barre'), H.indexOf('ag-barre') + 300));
vrai('les deux boutons globaux restent (« Toute l’équipe au travail », « Tout arrêter »)', /agToutBrouillon\(\)">Toute l’équipe au travail/.test(H) && /agPause\(true\)">Tout arrêter/.test(H));
const rangee = id => (H.match(new RegExp('<article class="ag-rang[^"]*" data-etat="[a-z]+"><div class="ag-rg-id"><span class="ag-av"[^>]*>[^<]*<img src="icons/agents/' + id + '\\.jpg"[\\s\\S]*?</article>')) || [''])[0];
const cam = rangee('camille');
vrai('une rangée : visage, nom, rôle, vague et plafond en petit texte, mot d’état, segmenté, « Parler »', /<h3>Camille<\/h3>/.test(cam) && /class="ag-role">Courrier et support <span class="ag-meta">vague 2 · plafond 35 \$ par mois<\/span>/.test(cam) && /data-e="brouillon">Brouillon</.test(cam) && /class="ag-seg"/.test(cam) && /onclick="agParler\('camille'\)"/.test(cam), cam.slice(0, 500));
vrai('le segmenté a les MÊMES appels (agMode_) pour les trois modes, avec « Auto » refusé à l’arrêt', JSON.stringify([...cam.matchAll(/onclick="agMode_\('camille','([a-z]+)'\)"/g)].map(m => m[1])) === JSON.stringify(['arret', 'brouillon', 'auto']) && /data-m="auto" class=""[^>]*disabled/.test(rangee('jules')) === true);
vrai('Camille a une tâche prise : sa rangée le dit ; Hugo, une tâche en attente', /En ce moment : <b>Passer la main à une personne/.test(cam) && /En attente : <b>Vérifier un paiement/.test(rangee('hugo')));
const pau = (H.match(/<article class="ag-rang ag-ext[\s\S]*?<\/article>/) || [''])[0];
vrai('Pauline : sa photo, « Prospection (Harvey, sur ton Mac) », et, avant toute lecture, « Lecture du relevé… » (pas un état inventé)', /icons\/agents\/pauline\.jpg/.test(pau) && /<h3>Pauline<\/h3>/.test(pau) && /Prospection \(Harvey, sur ton Mac\)/.test(pau) && /data-e="externe">Lecture du relevé…</.test(pau), pau.slice(0, 300));
vrai('⛔ Pauline n’a NI segmenté NI bouton d’action NI appel serveur (elle ne se pilote pas d’ici)', !/ag-seg|<button|onclick=|agMode_|agParler/.test(pau));
vrai('⛔ Pauline avant tout relevé : AUCUN chiffre, AUCUNE liste (rien d\u2019inventé)', !/\d/.test(pau.replace(/<[^>]+>/g, ' ')) && !/<details/.test(pau), pau.replace(/<[^>]+>/g, ' '));
vrai('…ses accords d’envoi se donnent sur le Mac (dit en clair)', /accords d’envoi se donnent dans son tableau de bord, sur ton Mac/.test(pau));
bac.AG.pause = { actif: true, par: 'Justin' }; H = bac.vueAgents();
vrai('pause générale : la barre le dit, chaque rangée dit « En pause » (le mode choisi reste lisible dans le segmenté)', /Pause générale : tous les agents sont à l’arrêt \(posée par Justin\)/.test(H) && (H.match(/data-e="pause">En pause</g) || []).length === 16 && /data-m="auto" class="on"/.test(rangee('victor')));
bac.AG.pause = null; bac.AG.lec.taches = -1; H = bac.vueAgents();
vrai('⛔ file de tâches illisible : « tâches illisibles », jamais « 0 tâche »', /<b>3 en auto · 2 en brouillon · 11 à l’arrêt · tâches illisibles<\/b>/.test(H) && !/0 tâche/.test(H));
bac.AG.lec.taches = 1;
bac.AG.agents[2].cerveau = false; H = bac.vueAgents();
vrai('un agent pas branché le dit sur SA rangée, une fois', (H.match(/Pas encore branché : il ne répond pas et n’agit pas/g) || []).length === 1);
bac.AG.cleOk = false; H = bac.vueAgents(); bac.AG.cleOk = true;
vrai('sans clé Anthropic : une seule phrase au-dessus de la liste, pas une par rangée', (H.match(/La clé Anthropic n’est pas posée/g) || []).length === 1);
bac.AG.agents[0].nom = '<img src=x onerror=1>'; bac.AG.agents[0].role = '"><script>'; H = bac.vueAgents();
vrai('⛔ un nom ou un rôle hostile est échappé dans la rangée', !/<img src=x onerror|<script>/.test(H) && /&lt;img src=x/.test(H));
bac.AG.agents[0].nom = 'Victor'; bac.AG.agents[0].role = 'Chef d’orchestre'; bac.AG.agents[2].cerveau = true;

/* ═══ 1 bis. LE RELEVÉ DE PAULINE ═══ */
const iso = min => new Date(Date.now() - min * 60000).toISOString();
const PA = bac.PA, pauR = () => (bac.vueAgents().match(/<article class="ag-rang ag-ext[\s\S]*?<\/article>/) || [''])[0];
const texteDe = h => h.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
const etat = () => bac.paEtatLigne();
PA.lec = 1; PA.d = { ok: true, recuLe: null }; PA.luLe = Date.now();
vrai('rien reçu (`recuLe:null`) : « Pas encore de relevé — le Mac n’a rien envoyé », sans chiffre ni liste', etat().lib === 'Pas encore de relevé — le Mac n’a rien envoyé' && !/\d/.test(texteDe(pauR())) && !/<details/.test(pauR()));
PA.lec = -2; PA.err = ''; vrai('serveur sans la route (404) : « Pont pas encore configuré »', etat().lib === 'Pont pas encore configuré' && etat().e === 'externe');
PA.lec = -3; PA.err = '<b>Le fichier est illisible</b>'; vrai('503 (relevé illisible sur le serveur) : « Relevé illisible sur le serveur », en ambre — jamais « pas configuré » ni « rien reçu »', etat().lib === 'Relevé illisible sur le serveur' && etat().e === 'retard');
vrai('…avec le texte du serveur, ÉCHAPPÉ', /&lt;b&gt;Le fichier est illisible/.test(pauR()) && !/<b>Le fichier/.test(pauR()));
PA.lec = -1; vrai('lecture impossible : le dit, en ambre (jamais « rien reçu »)', etat().lib === 'Le relevé n’a pas pu être lu' && etat().e === 'retard');
const rel = (o) => Object.assign({ version: 1, genereLe: iso(1),
  chauffe: { debut: '2026-10-20', jour: 5, plafondDuJour: 10, plafondMax: 40, phase: 'chauffe' },
  jour: { date: '2026-10-26', envoyes: 12, envoyesFroid: 8, reponses: 3, refus: 1, enAttente: 2 },
  recherches: [], entreprises: [], courriels: [], reponses: [] }, o || {});
const poser = (releve, age) => { PA.lec = 1; PA.echec = false; PA.err = ''; PA.d = { ok: true, recuLe: iso((age || 300) / 60), age: age === undefined ? 300 : age, releve }; PA.luLe = Date.now(); };
poser(rel(), 720);
vrai('âge : « Dernier relevé il y a 12 min » (l\u2019âge mesuré par le serveur)', etat().lib === 'Dernier relevé il y a 12 min' && etat().e === 'ok', etat());
poser(rel(), 20); PA.luLe = Date.now() - 120000; poser(rel(), 300); PA.luLe = Date.now() - 120000;
vrai('l’âge ajoute le temps écoulé depuis la lecture : 300 s + 2 min = « il y a 7 min »', etat().lib === 'Dernier relevé il y a 7 min', etat());
poser(rel(), 20); vrai('moins d’une minute : « à l’instant »', etat().lib === 'Dernier relevé à l’instant');
poser(rel(), 3 * 3600 + 120); vrai('⛔ plus de 2 h sans relevé : en AMBRE, « Le Mac ne répond plus depuis 3 h »', etat().lib === 'Le Mac ne répond plus depuis 3 h' && etat().e === 'retard', etat());
poser(rel(), 7200); vrai('pile 2 h : pas encore en retard (au-delà seulement)', etat().e === 'ok');
poser(rel(), 2 * 86400 + 5); vrai('deux jours : « depuis 2 j »', etat().lib === 'Le Mac ne répond plus depuis 2 j');
PA.echec = true; vrai('une relecture qui échoue garde le relevé et le DIT', /relecture impossible/.test(etat().lib)); PA.echec = false;
poser(rel(), 300);
let h1 = pauR(), t1 = texteDe(h1);
vrai('les chiffres du jour sur UNE ligne : envoyés, réponses, refus, en attente de ton accord', /<p class="pa-ligne">Aujourd’hui : <b>12<\/b> envoyés · <b>3<\/b> réponses · <b>1<\/b> refus · <b>2<\/b> en attente de ton accord<\/p>/.test(h1), t1.slice(0, 400));
vrai('la chauffe en mots : « jour 5, plafond 10 par jour »', /Chauffe : jour 5, plafond 10 par jour\./.test(t1));
poser(rel({ chauffe: { debut: '2099-12-31', jour: null, plafondDuJour: 0, phase: 'verrou' } })); vrai('phase « verrou » : « verrouillée »', /Chauffe : verrouillée/.test(pauR()));
poser(rel({ chauffe: { debut: '2099-12-31', jour: null, plafondDuJour: 0 } })); vrai('…aussi sans le mot « phase », par la date du verrou', /Chauffe : verrouillée/.test(pauR()));
poser(rel({ chauffe: { debut: '2026-10-30', jour: -2, plafondDuJour: 0, phase: 'chauffe' } })); vrai('chauffe pas commencée (jour négatif) : le dit', /Chauffe : pas encore commencée, plafond 0 par jour/.test(pauR()));
poser(rel({ chauffe: { phase: 'rodee', plafondDuJour: 30 } })); vrai('rodée : « terminée, plafond 30 par jour »', /Chauffe : terminée, plafond 30 par jour/.test(pauR()));
poser(rel({ chauffe: { phase: 'sans_rampe', plafondDuJour: 25 } })); vrai('sans rampe : le dit', /Chauffe : sans rampe, plafond 25 par jour/.test(pauR()));
const sansChauffe = rel(); delete sansChauffe.chauffe; poser(sansChauffe);
vrai('un relevé SANS chauffe : aucune phrase de chauffe, rien d’inventé, les chiffres restent', !/Chauffe/.test(pauR()) && /Aujourd’hui/.test(pauR()));
const sansJour = rel(); delete sansJour.jour; poser(sansJour); vrai('sans bloc « jour » : « Chiffres du jour : non transmis » (jamais des zéros)', /Chiffres du jour : non transmis/.test(pauR()) && !/<b>0<\/b>/.test(pauR()));
poser(rel({ jour: { envoyes: 1, enAttente: 0 } })); h1 = pauR();
vrai('champ absent = inconnu : seul ce qui est transmis s’affiche (1 envoyé au singulier ; un 0 RÉEL reste affiché)', /Aujourd’hui : <b>1<\/b> envoyé · <b>0<\/b> en attente de ton accord<\/p>/.test(h1) && !/réponse|refus/.test(h1.split('pa-ligne')[1]), h1.slice(0, 300));
poser(rel({ jour: { envoyes: -3, reponses: 1.5, refus: '4', enAttente: null } })); vrai('un nombre négatif, décimal, textuel ou nul n’est jamais affiché', /Chiffres du jour : non transmis/.test(pauR()));

/* — les listes — */
const rech = Array.from({ length: 25 }, (_, i) => ({ quand: iso(i * 10 + 5), metier: 'plombier', ville: 'Lyon-' + i, trouvees: i, origine: 'cycle' }));
const entr = [{ id: 'e1', nom: 'Plomberie Dupont', ville: 'Lyon', metier: 'plombier', etat: 'a_repondu', email: 'contact@dupont.example', contact: 'M. Dupont', majLe: iso(20) },
  { id: 'e2', nom: 'Chauffage Lambert', ville: 'Nantes', metier: 'chauffagiste', etat: 'courriel_pret', majLe: iso(5) },
  { id: 'e3', nom: 'Électricité Roux', ville: 'Lille', metier: 'électricien', etat: 'refus', majLe: iso(900) }];
const cour = [{ id: 'c1', entrepriseId: 'e1', etat: 'repondu', objet: 'Gagnez du temps sur vos devis', texte: 'Bonjour,\nje vous écris au sujet de vos devis.\nCordialement', quand: iso(60) },
  { id: 'c2', entrepriseId: 'e2', etat: 'en_attente', objet: 'Une question rapide', texte: '', quand: iso(3) }];
const repo = [{ entrepriseId: 'e1', quand: iso(30), resume: 'Intéressé, rappelez-moi mardi', nature: 'interesse' }, { entrepriseId: 'e3', quand: iso(4000), resume: 'Ne plus me contacter', nature: 'refus' }];
poser(rel({ recherches: rech, entreprises: entr, courriels: cour, reponses: repo })); PA.tout = {}; PA.ouvert = {}; PA.texte = {};
h1 = pauR();
const compteurs = [...h1.matchAll(/<summary>(Recherches|Entreprises|Courriels|Réponses)<span class="pa-n">([^<]*)<\/span>/g)].map(m => m[1] + '=' + m[2]);
vrai('quatre listes repliables, avec leur nombre', JSON.stringify(compteurs) === JSON.stringify(['Recherches=25', 'Entreprises=3', 'Courriels=2', 'Réponses=2']), compteurs);
vrai('repliées par défaut (aucun « open »)', !/<details class="ag-voir pa-det" open/.test(h1));
const bloc = k => (h1.match(new RegExp('<details class="ag-voir pa-det"[^>]*agPaOuvrir\\(\\\'' + k + '\\\'[\\s\\S]*?</details>(?=<details class="ag-voir pa-det"|</div>|$)')) || [''])[0];
const rrech = bloc('recherches');
vrai('vingt éléments puis « Voir tout (25) »', (rrech.match(/<div class="pa-r">/g) || []).length === 20 && /agPaTout\('recherches'\)">Voir tout \(25\)/.test(h1));
vrai('les plus récentes d’abord : « Lyon-0 » (il y a 5 min) ouvre la liste, « Lyon-19 » la ferme', rrech.indexOf('Lyon-0<') > 0 && rrech.indexOf('Lyon-0<') < rrech.indexOf('Lyon-1<') && /Lyon-19</.test(rrech) && !/Lyon-20</.test(rrech));
vrai('une recherche : métier · ville, « N trouvées », quand', /plombier · Lyon-3<\/div><div class="pa-s">3 trouvées · il y a 35 min/.test(rrech) && /1 trouvée · /.test(rrech));
bac.agPaTout('recherches'); h1 = pauR();
vrai('« Voir tout » : les 25 apparaissent, le bouton disparaît, un rendu a été demandé', (bloc('recherches').match(/<div class="pa-r">/g) || []).length === 25 && !/Voir tout/.test(h1) && bac.rendus > 0);
bac.agPaOuvrir('entreprises', true); h1 = pauR();
vrai('l’état ouvert d’une liste survit au rendu suivant (`ontoggle` → PA.ouvert)', /<details class="ag-voir pa-det" open ontoggle="agPaOuvrir\('entreprises',this\.open\)">/.test(h1) && !/<details class="ag-voir pa-det" open ontoggle="agPaOuvrir\('recherches'/.test(h1));
const ent = bloc('entreprises'), ordreEnt = [...ent.matchAll(/<div class="pa-t">([^<]*)<\/div>/g)].map(m => m[1]);
vrai('entreprises : les plus récemment touchées d’abord (Lambert, Dupont, Roux)', JSON.stringify(ordreEnt) === JSON.stringify(['Chauffage Lambert', 'Plomberie Dupont', 'Électricité Roux']), ordreEnt);
vrai('une entreprise : ville · métier · état en mot coloré · quand ; contact et adresse en TEXTE', /Lyon · plombier · <span class="pa-e" data-t="ok">a répondu<\/span> · il y a 20 min<\/div><div class="pa-s">M\. Dupont · contact@dupont\.example<\/div>/.test(ent) && /data-t="att">courriel prêt/.test(ent) && /data-t="ko">refus<\/span> · il y a 15 h/.test(ent));
const cou = bloc('courriels');
vrai('courriels : objet, entreprise (par son identifiant), état en mot coloré, quand', /Une question rapide<\/div><div class="pa-s">Chauffage Lambert · <span class="pa-e" data-t="att">en attente de ton accord<\/span> · il y a 3 min/.test(cou) && /Gagnez du temps sur vos devis<\/div><div class="pa-s">Plomberie Dupont · <span class="pa-e" data-t="ok">répondu/.test(cou));
vrai('le texte complet se déplie (un courriel sans texte n’a pas de dépliant) ; les retours à la ligne sont gardés', (cou.match(/<details class="pa-txt"/g) || []).length === 1 && /<pre class="pa-corps">Bonjour,\nje vous écris au sujet de vos devis\.\nCordialement<\/pre>/.test(cou));
bac.agPaTexte(1, true); h1 = pauR();
vrai('un texte déplié reste déplié au rendu suivant (clé : le NUMÉRO de rangée, retrouvé dans la liste affichée)', /<details class="pa-txt" open ontoggle="agPaTexte\(1,this\.open\)">/.test(h1) && PA.texte.c1 === true, Object.keys(PA.texte));
bac.agPaTexte(99, true); bac.agPaTexte('x', true); bac.agPaTexte(-1, true);
vrai('un numéro qui n’existe pas n’écrit rien', Object.keys(PA.texte).join() === 'c1');
const rep2 = bloc('reponses');
vrai('réponses : entreprise · nature en mot coloré, résumé, quand', /Plomberie Dupont · <span class="pa-e" data-t="ok">intéressé<\/span><\/div><div class="pa-s">Intéressé, rappelez-moi mardi · il y a 30 min/.test(rep2) && /data-t="ko">refus<\/span><\/div><div class="pa-s">Ne plus me contacter · /.test(rep2));
vrai('une date de plus de deux jours s’écrit en toutes lettres courtes (« 27 sept. »…), pas en « il y a 48 h »', /Ne plus me contacter · \d{1,2} [a-zéû.]+/.test(rep2) && !/il y a \d+ h/.test(rep2.split('Ne plus me contacter')[1]));

/* — ⛔ tout vient de tiers — */
const HOS = ['<img src=x onerror=alert(1)>', '"><script>alert(2)</script>', 'javascript:alert(3)', "'+alert(4)+'", '"onmouseover="alert(5)', '</textarea><svg onload=alert(6)>', '<a href="javascript:alert(7)">x</a>'];
poser(rel({
  recherches: [{ quand: iso(1), metier: HOS[0], ville: HOS[1], trouvees: 3 }],
  entreprises: [{ id: HOS[4], nom: HOS[0], ville: HOS[1], metier: HOS[2], etat: HOS[3], email: HOS[1], contact: HOS[6], majLe: iso(1) }],
  courriels: [{ id: HOS[4], entrepriseId: HOS[4], etat: HOS[5], objet: HOS[0], texte: HOS[1] + '\n' + HOS[6], quand: iso(1) }],
  reponses: [{ entrepriseId: HOS[4], quand: iso(1), resume: HOS[6] + HOS[2], nature: HOS[3] }] }));
PA.tout = {}; PA.ouvert = { recherches: true, entreprises: true, courriels: true, reponses: true }; PA.texte = {};
h1 = pauR();
{ const reste = h1.replace(/<img src="icons\/agents\/pauline\.jpg"[^>]*>/, ''), balises = [...reste.matchAll(/<([a-z0-9]+)([^>]*)>/gi)], mal = balises.filter(t => /^(img|script|svg|a|iframe|object|embed|link|form|style)$/i.test(t[1]) || /\s(href|src|action|formaction|srcdoc|style)\s*=/i.test(t[2]));
  vrai('⛔ valeurs hostiles : aucune BALISE de plus (ni img, ni script, ni svg, ni a), aucun href, src, action ni style dans une balise (le texte hostile reste du texte)', balises.length > 20 && mal.length === 0, mal.slice(0, 3).map(t => t[0])); }
const attrs = [...h1.matchAll(/\son(?:click|toggle|error|load|mouseover)="([^"]*)"/g)].map(m => m[1]).filter(a => !/^this\.remove\(\)$/.test(a));
vrai('⛔ les seuls gestionnaires de la carte sont les nôtres, avec une clé fixe ou un numéro — jamais un champ du relevé', attrs.length >= 5 && attrs.every(a => /^(agPaOuvrir\('(recherches|entreprises|courriels|reponses)',this\.open\)|agPaTexte\(\d+,this\.open\)|agPaTout\('(recherches|entreprises|courriels|reponses)'\))$/.test(a)), attrs);
vrai('…le texte hostile est là, en TEXTE échappé', /&lt;img src=x onerror=alert\(1\)&gt;/.test(h1) && /&lt;script&gt;alert\(2\)&lt;\/script&gt;/.test(h1) && /javascript:alert\(3\)/.test(h1));
vrai('un état inconnu ou venu du prototype s’écrit « — », jamais une couleur inventée', !/data-t="(?!ok|att|ko|n")/.test(h1) && (h1.match(/<span class="pa-e" data-t="n">—<\/span>/g) || []).length >= 3);
poser(rel({ entreprises: [{ id: 'e1', nom: 'X', etat: 'constructor' }, { id: 'e2', nom: 'Y', etat: '__proto__' }], reponses: [{ entrepriseId: '__proto__', nature: 'toString', resume: 'a', quand: iso(1) }, { entrepriseId: 'constructor', nature: 'autre', quand: iso(1) }] }));
h1 = pauR(); vrai('identifiants et états du prototype (`constructor`, `__proto__`, `toString`) : « — » et « entreprise inconnue », jamais « undefined »', !/function|Object|undefined/.test(h1.replace(/<[^>]+>/g, ' ')) && !/data-t="(?!ok|att|ko|n")/.test(h1) && (h1.match(/<span class="pa-e" data-t="n">—<\/span>/g) || []).length >= 3 && /entreprise inconnue/.test(h1), h1.slice(-700));
const long = 'Z'.repeat(9000); poser(rel({ entreprises: [{ id: 'e1', nom: long, ville: long, metier: long, etat: 'trouvee', majLe: iso(1) }], courriels: [{ id: 'c', entrepriseId: 'e1', etat: 'envoye', objet: long, texte: long, quand: iso(1) }], reponses: [{ entrepriseId: 'e1', resume: long, nature: 'autre', quand: iso(1) }] }));
vrai('des textes démesurés sont coupés à l’affichage (nom 120, objet 200, texte 5 000, résumé 400)', pauR().length < 20000, pauR().length);

/* — champs absents, listes vides, formes inattendues : rien ne jette — */
let jette = null;
const essais = [rel({ recherches: [], entreprises: [], courriels: [], reponses: [] }), rel({ recherches: 'x', entreprises: null, courriels: 5, reponses: { a: 1 } }), rel({ recherches: [null, 5, 'x', [], {}], entreprises: [{}], courriels: [{}], reponses: [{}] }), 'chaîne', null, [], {}];
essais.forEach((r, i) => { try { poser(r); const h = pauR(); if (!h) jette = 'vide ' + i; } catch (e) { jette = i + ' : ' + e.message; } });
vrai('listes vides, types faux, éléments nuls ou vides, relevé qui n’est pas un objet : rien ne jette, la rangée se dessine', jette === null, jette);
poser(rel({ recherches: [], entreprises: [], courriels: [], reponses: [] })); h1 = pauR();
vrai('listes vides : « aucune » dans le titre et « Rien dans le relevé. » dedans', (h1.match(/<span class="pa-n">aucune<\/span>/g) || []).length === 4 && (h1.match(/Rien dans le relevé\./g) || []).length === 4);
poser(rel({ recherches: [{}], courriels: [{ id: 'z' }] })); h1 = pauR();
vrai('un élément sans champs : « nombre inconnu », « (sans objet) », « entreprise inconnue » — jamais un zéro ni « undefined »', /nombre inconnu/.test(h1) && /\(sans objet\)/.test(h1) && /entreprise inconnue/.test(h1) && !/undefined|NaN|null/.test(h1.replace(/<[^>]+>/g, ' ')));

/* — la lecture : un appel à la fois, trois états, rien qui s'écrit — */

/* ═══ 2. LES GROUPES : perso absent, perso borné ═══ */
const grp = (fil, perso) => Object.assign({ fil, groupe: true }, perso === undefined ? {} : { perso });
MS.fils = [grp('equipe'), grp('clients'), grp('plateforme'), grp('reunions'), { fil: 'ines', groupe: false }, { fil: 'camille', groupe: false }];
MS.agents = bac.AG.agents; MS.taches = []; MS.tachesLec = 1; MS.membres = [{ nom: 'Camille' }, { nom: 'Hugo' }]; MS.agLec = 1;
let p = bac.msGroupePerso('clients');
vrai('serveur d’avant (aucun `perso`) : nom, icône « # », aucune couleur, aucune description — valeurs d’origine', p.nom === 'Clients' && p.icone === '#' && p.couleur === '' && p.description === '' && p.perso === false, p);
MS.fils[1].perso = { nom: 'Clients & support', icone: '💬', couleur: 'orange', description: 'Les entreprises clientes' };
p = bac.msGroupePerso('clients');
vrai('un `perso` complet est lu tel quel', p.nom === 'Clients & support' && p.icone === '💬' && p.couleur === 'orange' && p.description === 'Les entreprises clientes' && p.perso === true, p);
MS.fils[1].perso = { nom: 'N'.repeat(90), icone: 'abcdefgh', couleur: 'url(javascript:1)', description: 'D'.repeat(400) };
p = bac.msGroupePerso('clients');
vrai('⛔ un `perso` hostile est BORNÉ : nom 40, icône 4, couleur hors liste = aucune, description 120', p.nom.length === 40 && p.icone === 'abcd' && p.couleur === '' && p.description.length === 120, [p.nom.length, p.icone, p.couleur, p.description.length]);
MS.fils[1].perso = { nom: 42, icone: ['x'], couleur: null, description: {} };
p = bac.msGroupePerso('clients');
vrai('un `perso` de mauvais types retombe sur les valeurs d’origine', p.nom === 'Clients' && p.icone === '#' && p.perso === false, p);
MS.fils[1].perso = 'chaîne';
vrai('un `perso` qui n’est pas un objet : valeurs d’origine', bac.msGroupePerso('clients').nom === 'Clients');
MS.fils[1].perso = { nom: '  Les clients  ', icone: '🤝' };
p = bac.msGroupePerso('clients');
vrai('un `perso` PARTIEL : le nom (rogné) et l’icône viennent de lui, le reste retombe sur l’origine', p.nom === 'Les clients' && p.icone === '🤝' && p.couleur === '' && p.description === '');
vrai('un identifiant qui vit sur le prototype n’est pas un groupe (aucun perso lu)', bac.msGroupePerso('constructor').perso === false && bac.msGroupePerso('__proto__').nom === '__proto__' && bac.msNomFil('constructor') === 'constructor' && bac.msNomFil('ines') === 'Inès');
MS.fils[1].perso = { nom: '<img src=x onerror=1>', icone: '<b>', couleur: '"><script>', description: '"><i>' };
const ic = bac.msIconeHtml('clients', 'ms-av g');
vrai('⛔ l’icône d’un groupe : texte et couleur hostiles ne s’injectent pas (la classe de couleur est une liste fermée)', !/<b>|<script|<img/.test(ic) && /&lt;b&gt;/.test(ic) && !/cb-/.test(ic), ic);
MS.fils[1].perso = { nom: 'Clients', icone: '💬', couleur: 'vert', description: '' };
vrai('une couleur de la liste pose sa classe ; sans couleur, aucune classe de couleur', /class="ms-av g cb-vert"/.test(bac.msIconeHtml('clients', 'ms-av g')) && !/cb-/.test(bac.msIconeHtml('equipe', 'ms-av g')));

/* ═══ 3. L'EN-TÊTE D'UN FIL ═══ */
MS.fil = 'ines'; let E = bac.msEnteteHtml();
vrai('en-tête d’un agent : sa PHOTO devant son nom (36 px : classe « h »), nom, rôle et état', /<div class="ms-hid"><span class="ms-av h" aria-hidden="true">I<img src="icons\/agents\/ines\.jpg"/.test(E) && /<h2>Inès<\/h2>/.test(E), E.slice(0, 400));
vrai('…et pas de bouton « Modifier » sur un agent', !/ms-btn-mod/.test(E));
MS.fil = 'clients'; E = bac.msEnteteHtml();
vrai('en-tête d’un groupe : son icône dans son rond à la même place, plus de « # » devant le nom', /<div class="ms-hid"><span class="ms-av g h cb-vert" aria-hidden="true">💬<\/span>/.test(E) && /<h2>Clients<\/h2>/.test(E));
vrai('…avec « Modifier » (patron), nommé pour un lecteur d’écran', /<button type="button" class="ms-btn-mod" data-act="groupeModifier" aria-label="Modifier le groupe Clients">Modifier<\/button>/.test(E));
bac.MYROLE = 'collaborateur'; E = bac.msEnteteHtml(); bac.MYROLE = 'patron';
vrai('⛔ hors patron : AUCUN bouton « Modifier »', !/ms-btn-mod|groupeModifier/.test(E));
MS.fils[1].perso = { nom: '<img src=x onerror=1>', icone: '💬', couleur: 'bleu', description: '"><script>alert(1)</script>' }; E = bac.msEnteteHtml();
vrai('⛔ nom et description hostiles : échappés dans l’en-tête (titre, sous-titre, aria-label)', !/<img src=x|<script/.test(E) && (E.match(/&lt;img src=x onerror=1&gt;/g) || []).length >= 2 && /&lt;script&gt;/.test(E));
MS.fils[1].perso = { nom: 'Clients & support', icone: '💬', couleur: 'orange', description: 'Les entreprises clientes' }; E = bac.msEnteteHtml();
vrai('la description sert de sous-titre ; sans elle, l’en-tête dit toujours qui est dans le fil', /<p>Les entreprises clientes<\/p>/.test(E) && /Camille, Hugo et toi/.test((delete MS.fils[1].perso.description, bac.msEnteteHtml())));
delete MS.fils[1].perso; E = bac.msEnteteHtml();
vrai('sans `perso` : en-tête d’origine (Clients, #), « Modifier » présent', /<span class="ms-av g h" aria-hidden="true">#<\/span>/.test(E) && /<h2>Clients<\/h2>/.test(E) && /ms-btn-mod/.test(E));

/* ═══ 4. LA FEUILLE ═══ */
MS.fils[1].perso = { nom: 'Clients & support', icone: '💬', couleur: 'orange', description: 'Les entreprises clientes' };
let F = bac.msGroupeFeuille('clients');
const pastilles = [...F.matchAll(/<button type="button" role="radio" aria-checked="(true|false)" class="mg-pas cb-([a-z]+)( on)?" data-c="([a-z]+)" aria-label="([^"]+)"/g)];
vrai('six pastilles (bleu, vert, orange, rouge, violet, gris), UNE seule cochée : la couleur actuelle', JSON.stringify(pastilles.map(m => m[4])) === JSON.stringify(['bleu', 'vert', 'orange', 'rouge', 'violet', 'gris']) && pastilles.filter(m => m[1] === 'true').map(m => m[4]).join() === 'orange' && pastilles.filter(m => m[3]).length === 1, pastilles.map(m => m.slice(1, 4).join('|')));
vrai('les champs portent leurs bornes (nom 40, icône, description 120) et leurs valeurs actuelles', /id="mg-nom"[^>]*maxlength="40" value="Clients &amp; support"/.test(F) && /id="mg-ico"[^>]*value="💬"/.test(F) && /id="mg-desc" maxlength="120"[^>]*>Les entreprises clientes<\/textarea>/.test(F));
vrai('« Enregistrer », « Annuler », « Remettre par défaut » (activé : le groupe est personnalisé)', /onclick="msGroupeEnregistrer\('clients'\)">Enregistrer/.test(F) && /onclick="tourPanneauFermer\(\)">Annuler/.test(F) && /onclick="msGroupeDefaut\('clients'\)">Remettre par défaut/.test(F) && !/msGroupeDefaut\('clients'\)" disabled/.test(F));
delete MS.fils[1].perso; F = bac.msGroupeFeuille('clients');
vrai('sans personnalisation : « gris » est coché, et « Remettre par défaut » est désactivé (rien à remettre)', /aria-checked="true" class="mg-pas cb-gris on"/.test(F) && /msGroupeDefaut\('clients'\)" disabled>/.test(F));
MS.fils[1].perso = { nom: '"><script>alert(1)</script>', icone: '"><b>', couleur: 'bleu', description: '</textarea><script>x</script>' }; F = bac.msGroupeFeuille('clients');
vrai('⛔ valeurs hostiles : aucune ne sort d’un attribut ni du textarea', !/<script>|<b>/.test(F) && (F.match(/&lt;\/textarea&gt;/g) || []).length === 1);

/* — les gestes, avec un apiPost scripté — */
const mettre = (nom, ico, desc, coul) => { els['mg-nom'] = { value: nom, focus: () => {} }; els['mg-ico'] = { value: ico }; els['mg-desc'] = { value: desc }; els['mg-ok'] = { disabled: false }; els['mg-err'] = { textContent: '' }; els.pasOn = coul ? { getAttribute: () => coul } : null; };
(async () => {
  const get = fn => { bac.__get = fn; bac.apiGetAppels.length = 0; };
  let lacher; get(() => new Promise(r => { lacher = () => r({ ok: true, recuLe: iso(2), age: 120, releve: rel() }); }));
  PA.lec = 0; PA.sig = ''; PA.echec = false; PA.enVol = null; bac.rendus = 0;
  const p1 = bac.chargerPauline(), p2 = bac.chargerPauline(), p3 = bac.chargerPauline();
  vrai('⛔ un SEUL appel à la fois, sur la bonne route (3 demandes rapides = 1 appel)', bac.apiGetAppels.length === 1 && bac.apiGetAppels[0] === '/api/monitor/pauline' && p1 === p2 && p2 === p3, bac.apiGetAppels);
  lacher(); await p1;
  vrai('…puis le relevé est lu et la page se redessine une fois', PA.lec === 1 && etat().lib === 'Dernier relevé il y a 2 min' && bac.rendus === 1 && PA.enVol === null, [PA.lec, bac.rendus]);
  get(() => Promise.resolve({ ok: true, recuLe: PA.d.recuLe, age: 180, releve: PA.d.releve }));
  bac.rendus = 0; bac.etatMaj = 0; await bac.chargerPauline();
  vrai('même relevé relu : PAS de redessin (le formulaire ouvert ne bouge pas), seul l’âge se met à jour', bac.rendus === 0 && bac.etatMaj === 1 && /il y a 3 min/.test(bac.etatTexte), [bac.rendus, bac.etatMaj, bac.etatTexte]);
  get(() => Promise.resolve({ ok: true, recuLe: iso(0), age: 5, releve: rel({ jour: { envoyes: 99 } }) }));
  bac.rendus = 0; await bac.chargerPauline(); vrai('un relevé qui a changé : redessin', bac.rendus === 1);
  get(() => Promise.reject(Object.assign(new Error('http'), { status: 500 })));
  bac.rendus = 0; await bac.chargerPauline();
  vrai('⛔ une relecture qui échoue garde le relevé déjà lu et le dit (jamais « rien reçu »)', PA.lec === 1 && PA.echec === true && /relecture impossible/.test(etat().lib) && bac.rendus === 1);
  get(() => Promise.resolve({ ok: true, recuLe: iso(0), age: 1, releve: rel() })); await bac.chargerPauline();
  vrai('…et se rétablit à la lecture suivante', PA.echec === false && !/impossible/.test(etat().lib));
  get(() => Promise.reject(Object.assign(new Error('http'), { status: 404 }))); await bac.chargerPauline();
  vrai('404 (serveur sans la route) : « Pont pas encore configuré », sans relevé', PA.lec === -2 && PA.d === null && etat().lib === 'Pont pas encore configuré');
  get(() => Promise.reject(Object.assign(new Error('http'), { status: 503, corps: 'Le relevé de Pauline est illisible' }))); await bac.chargerPauline();
  vrai('503 : « Relevé illisible sur le serveur » et la raison du serveur', PA.lec === -3 && etat().lib === 'Relevé illisible sur le serveur' && /Le relevé de Pauline est illisible/.test(pauR()));
  PA.lec = 0; get(() => Promise.reject(new Error('réseau'))); await bac.chargerPauline();
  vrai('coupure à la première lecture : « n’a pas pu être lu » (on ne sait pas), pas « rien reçu »', PA.lec === -1 && etat().lib === 'Le relevé n’a pas pu être lu');
  get(() => Promise.resolve({ ok: true, recuLe: null })); await bac.chargerPauline();
  vrai('`{ok:true, recuLe:null}` : lu, rien reçu — un état à part de l’échec', PA.lec === 1 && /rien envoyé/.test(etat().lib));
  get(() => Promise.resolve({ error: 'x' })); PA.lec = 0; await bac.chargerPauline();
  vrai('une réponse sans `ok:true` n’est pas prise pour un relevé', PA.lec === -1);
  get(() => Promise.resolve({ ok: true, recuLe: iso(0) })); await bac.chargerPauline();
  bac.MYROLE = 'collaborateur'; get(() => Promise.resolve({})); await bac.chargerPauline(); bac.MYROLE = 'patron';
  vrai('⛔ hors patron : aucun appel', bac.apiGetAppels.length === 0);
  vrai('(code) aucune écriture : la lecture du relevé est un GET, rien ne se poste', !/apiPost\([^)]*pauline/i.test(CODE));
  vrai('(code) relu à l’ouverture de l’onglet, à l’entrée dans la section, puis chaque minute tant qu’elle est visible', /if\(t==='agents'\)\{ chargerAgents\(\); chargerPauline\(\); \}/.test(CODE) && /if\(s==='equipe'&&typeof chargerPauline==='function'\) chargerPauline\(\); render\(\); \}/.test(CODE) && /setInterval\(function\(\)\{ if\(document\.visibilityState==='visible'&&TAB==='agents'&&AG\.sec==='equipe'\) chargerPauline\(\); \},60000\);/.test(CODE));
  PA.lec = 0; PA.d = null;
  MS.fils[1].perso = { nom: 'Clients', icone: '💬', couleur: 'bleu', description: '' };
  const err = () => els['mg-err'].textContent;
  mettre('', '💬', '', 'bleu'); appels.length = 0; await bac.msGroupeEnregistrer('clients');
  vrai('un nom vide : la feuille le dit, RIEN n’est envoyé', appels.length === 0 && /nom/.test(err()), err());
  mettre('Clients', '', '', 'bleu'); await bac.msGroupeEnregistrer('clients');
  vrai('une icône vide : refusée avant l’envoi', appels.length === 0 && /icône/.test(err()), err());
  mettre('Clients', 'abcde', '', 'bleu'); await bac.msGroupeEnregistrer('clients');
  vrai('une icône de 5 caractères : refusée avant l’envoi', appels.length === 0 && /4 caractères/.test(err()), err());
  mettre('Clients', '👩‍👧', '', 'bleu'); bac.__reponse = () => ({ ok: true, status: 200, d: {} }); await bac.msGroupeEnregistrer('clients');
  vrai('un émoji composé (3 caractères) passe', appels.length === 1, err());
  appels.length = 0; mettre('N'.repeat(41), '💬', '', 'bleu'); await bac.msGroupeEnregistrer('clients');
  vrai('un nom de 41 caractères : refusé avant l’envoi', appels.length === 0 && /40 caractères/.test(err()), err());
  mettre('Clients', '💬', 'D'.repeat(121), 'bleu'); await bac.msGroupeEnregistrer('clients');
  vrai('une description de 121 caractères : refusée avant l’envoi', appels.length === 0 && /120 caractères/.test(err()), err());

  /* refus du serveur : affiché TEL QUEL, feuille ouverte, rien ne change à l’écran */
  mettre('Clients', '💬', 'x', 'vert'); panneau.ouvert = true; appels.length = 0;
  bac.__reponse = () => ({ ok: false, status: 400, d: { error: 'Ce nom est déjà pris.' } });
  await bac.msGroupeEnregistrer('clients');
  vrai('⛔ refus 400 : le message du serveur est affiché tel quel, la feuille reste ouverte, le groupe n’a pas bougé', err() === 'Ce nom est déjà pris.' && panneau.ouvert && MS.fils[1].perso.couleur === 'bleu' && MS.groupeBusy === false, [err(), panneau.ouvert, MS.fils[1].perso]);
  bac.__reponse = () => ({ ok: false, status: 403, d: {} }); await bac.msGroupeEnregistrer('clients');
  vrai('refus 403 sans texte : « Réservé au patron »', /Réservé au patron/.test(err()));
  bac.__reponse = () => ({ ok: false, status: 503, d: { error: 'Le registre des groupes est illisible' } }); await bac.msGroupeEnregistrer('clients');
  vrai('refus 503 : le texte du serveur', err() === 'Le registre des groupes est illisible');
  /* réussite : le corps est EXACTEMENT le contrat */
  appels.length = 0; toasts.length = 0; mettre('Équipe clients', '🤝', 'Les entreprises clientes', 'vert'); panneau.ouvert = true;
  bac.__reponse = () => ({ ok: true, status: 200, d: { ok: true, perso: { nom: 'Équipe clients', icone: '🤝', couleur: 'vert', description: 'Les entreprises clientes' } } });
  await bac.msGroupeEnregistrer('clients');
  vrai('succès : POST /api/monitor/conversations/groupe, corps { fil, nom, icone, couleur, description }', appels.length === 1 && appels[0].u === '/api/monitor/conversations/groupe' && JSON.stringify(appels[0].c) === JSON.stringify({ fil: 'clients', nom: 'Équipe clients', icone: '🤝', couleur: 'vert', description: 'Les entreprises clientes' }), appels);
  vrai('…la feuille se ferme, la liste prend le `perso` RENDU par le serveur, un toast le dit', !panneau.ouvert && MS.fils[1].perso.nom === 'Équipe clients' && toasts.length === 1 && err() === '', [panneau.ouvert, MS.fils[1].perso, toasts]);
  /* un seul envoi à la fois */
  appels.length = 0; mettre('Clients', '💬', '', 'bleu'); let lacher2; bac.__reponse = () => new Promise(r => { lacher2 = () => r({ ok: true, status: 200, d: {} }); });
  const a1 = bac.msGroupeEnregistrer('clients'), a2 = bac.msGroupeEnregistrer('clients');
  vrai('⛔ un double toucher n’envoie qu’UNE fois, et le bouton est éteint pendant l’appel', appels.length === 1 && els['mg-ok'].disabled === true && MS.groupeBusy === true);
  bac.__reponse = null; lacher2 = null; 
  /* le second `then` n'est pas attendu : on rend la main en résolvant la promesse en attente */
  appels.length = 0; MS.groupeBusy = false;
  /* « Remettre par défaut » */
  MS.fils[1].perso = { nom: 'X', icone: 'X', couleur: 'bleu', description: '' }; bac.__reponse = () => ({ ok: true, status: 200, d: { ok: true, perso: null } }); panneau.ouvert = true;
  await bac.msGroupeDefaut('clients');
  vrai('« Remettre par défaut » : POST { fil, defaut:true } seulement, et le groupe retrouve ses valeurs d’origine', appels.length === 1 && JSON.stringify(appels[0].c) === JSON.stringify({ fil: 'clients', defaut: true }) && MS.fils[1].perso === undefined && bac.msGroupePerso('clients').nom === 'Clients', appels);
  /* patron seul, groupe connu seul */
  appels.length = 0; bac.MYROLE = 'collaborateur'; panneau.ouvert = false;
  await bac.msGroupeEnvoyer('clients', { defaut: true }); bac.msGroupeModifier('clients');
  vrai('⛔ hors patron : ni envoi, ni feuille (la fonction refuse AVANT d’appeler)', appels.length === 0 && !panneau.ouvert);
  bac.MYROLE = 'patron'; await bac.msGroupeEnvoyer('constructor', { defaut: true }); bac.msGroupeModifier('ines'); bac.msGroupeModifier('__proto__');
  vrai('⛔ un identifiant qui n’est pas un groupe (agent, prototype) : ni envoi, ni feuille', appels.length === 0 && !panneau.ouvert);
  bac.msGroupeModifier('clients');
  vrai('le patron ouvre la feuille d’un groupe', panneau.ouvert && /class="mg" data-fil="clients"/.test(panneau.html));
  fini = true;
  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.log('  ✗ banc mort : ' + (e && e.stack || e)); console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); process.exit(1); });
