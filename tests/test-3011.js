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
let ok = 0, ko = 0;
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
  'msAgentsParId', 'msEtat', 'msEstGroupe', 'msGroupePerso', 'msNomFil', 'msIconeHtml', 'msSousTitre', 'msEnteteHtml', 'msGroupeFeuille', 'msGroupeModifier', 'msGroupeCouleur', 'msGroupeErr', 'msGroupeEnvoyer', 'msGroupeEnregistrer', 'msGroupeDefaut'];
const FN = FNS.map(fonction);
const VARS = [ligne('var AG_MODES='), ligne('var AG_PHOTOS='), ligne('var MS_GROUPES_LIB='), ligne('var MS_COULEURS='), ligne('var MS_ETAT_LIB='), ligne('var INJOIGNABLE='), corps('var AG_TYPES=') + ';', corps('var MS={') + ';'].join('\n');
vrai('(population) les ' + FNS.length + ' fonctions et les tables sont trouvées dans le fichier livré', FN.every(f => f.length > 30) && VARS.length > 500, FNS.filter((n, i) => FN[i].length <= 30).join(','));

/* ── le bac : un DOM minimal, un apiPost scripté, et l'état réel de la page ── */
const els = {}, panneau = { ouvert: false, html: '' }, appels = [], toasts = [];
const bac = {
  JSON, Date, String, Array, Math, Object, Number, Promise, Error, console,
  MYROLE: 'patron', INJOIGNABLE: 'Serveur injoignable',
  AG: { loaded: true, err: '', illisible: false, pause: null, agents: [], enAttente: 0, validations: [], journal: [], taches: [], lec: { validations: 1, journal: 1, taches: 1 }, sec: 'equipe', busy: false, cleOk: true, cv: { nonLus: 0 }, dos: {} },
  MS: null, enTete: t => '<h1>' + t + '</h1>', acSquel: () => '<sq>', agIllisible: t => '<ill>' + t,
  $: id => els[id] || null,
  document: { querySelector: sel => (sel === '#tour-panneau .mg-pas.on' ? (els.pasOn || null) : null), querySelectorAll: () => [] },
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
vrai('Pauline : sa photo, « Prospection (Harvey, sur ton Mac) », état honnête « Relevé pas encore branché »', /icons\/agents\/pauline\.jpg/.test(pau) && /<h3>Pauline<\/h3>/.test(pau) && /Prospection \(Harvey, sur ton Mac\)/.test(pau) && /Relevé pas encore branché/.test(pau), pau.slice(0, 300));
vrai('⛔ Pauline n’a NI segmenté NI bouton d’action NI appel serveur (elle ne se pilote pas d’ici)', !/ag-seg|<button|onclick=|agMode_|agParler/.test(pau));
vrai('⛔ Pauline : AUCUN chiffre inventé (aucun chiffre dans sa carte : le pont Mac → serveur n’existe pas encore) et l’emplacement du futur relevé existe', !/\d/.test(pau.replace(/<[^>]+>/g, ' ')) && /<details class="ag-voir"><summary>Ce que tu verras ici<\/summary>/.test(pau) && /Les recherches lancées/.test(pau) && /Les réponses reçues/.test(pau), pau.replace(/<[^>]+>/g, ' '));
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
  appels.length = 0; mettre('Clients', '💬', '', 'bleu'); let lacher; bac.__reponse = () => new Promise(r => { lacher = () => r({ ok: true, status: 200, d: {} }); });
  const a1 = bac.msGroupeEnregistrer('clients'), a2 = bac.msGroupeEnregistrer('clients');
  vrai('⛔ un double toucher n’envoie qu’UNE fois, et le bouton est éteint pendant l’appel', appels.length === 1 && els['mg-ok'].disabled === true && MS.groupeBusy === true);
  bac.__reponse = null; lacher = null; 
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
  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.log('  ✗ banc mort : ' + (e && e.stack || e)); console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); process.exit(1); });
