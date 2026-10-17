/* ══ PAGES JURIDIQUES — CE QUE LA CARTE ENVOIE À DES TIERS EST DIT (Justin, 17 octobre 2026) ═════════════════════════════
   Question posée à Justin (campagne de test, clients#5) : « l'adresse d'un client part à OpenStreetMap (Nominatim) pour le
   placer sur la carte, et aucune page juridique ne le dit — que fait-on ? ». Sa décision : « L'écrire dans les pages ».
   La carte continue de placer les clients ; les pages le disent.

   Ce banc relit le CODE d'app.html (commentaires retirés) et les PAGES :
   1. chaque service tiers de carte que le code appelle — géocodage (Nominatim, adresse.data.gouv.fr), IGN (bâtiments et
      photos aériennes), calcul de trajet (OSRM), tuiles Google — est NOMMÉ, par son adresse, dans sous-traitance.html,
      registre-traitements.html et confidentialite.html (et par son exploitant dans mentions-legales.html) ;
   2. ⛔ tout hôte que le code appelle est CLASSÉ ici (carte / lien que la personne ouvre / autre flux) : un hôte neuf
      fait tomber le banc, il faut trancher s'il reçoit une donnée de client et le dire — c'est la règle de CLAUDE.md
      « un champ que personne ne lit est une garde qui n'en est pas une », côté juridique ;
   3. les pages juridiques sont citées par numéro de ligne (mentions-legales.html:74, sous-traitance.html:162…) : on a
      ajouté SOUS les lignes citées, et ce banc vérifie les citations qu'aucun autre banc ne garde ;
   4. le code appelle ces services DIRECTEMENT depuis l'appareil (aucune route du serveur ne les relaie), et la page le dit
      tel quel — on ne promet pas ce que le code ne fait pas. */
'use strict';
const fs = require('fs'), path = require('path');
const RACINE = path.join(__dirname, '..');
const lire = f => fs.readFileSync(path.join(RACINE, f), 'utf8');
let ok = 0, ko = 0;
const vrai = (t, c, d) => { c ? ok++ : ko++; console.log((c ? '  ✓ ' : '  ✗ ') + t + (c || d === undefined ? '' : '  → ' + JSON.stringify(d))); };

/* le CODE : on ne retire que les blocs qui COMMENCENT une ligne (CLAUDE.md : le motif naïf avale 107 000 caractères d'app.html) */
const sansCom = s => s.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
const CODE = sansCom(lire('app.html'));
/* le texte d'une page : balises retirées, espaces repliés */
const texte = f => lire(f).replace(/<style[\s\S]*?<\/style>/g, ' ').replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ');
const PAGES = { sous: 'sous-traitance.html', registre: 'registre-traitements.html', confid: 'confidentialite.html', mentions: 'mentions-legales.html' };
const T = {}; for (const k of Object.keys(PAGES)) T[k] = texte(PAGES[k]);

console.log('\n── 1. la population : les hôtes que le code appelle ──');
const hotes = {};
for (const m of CODE.matchAll(/https?:\/\/([a-z0-9{}.\-]+)/gi)) hotes[m[1]] = (hotes[m[1]] || 0) + 1;

/* SERVICES DE CARTE : une donnée liée à un client (adresse, coordonnées d'un site) ou la zone regardée part chez eux.
   `code` = comment le code les appelle ; `nom` = ce qu'une page doit dire pour le nommer (l'adresse du service). */
const CARTE = [
  { id: 'Nominatim (OpenStreetMap)', code: /nominatim\.openstreetmap\.org/, nom: 'nominatim.openstreetmap.org', exploitant: /OpenStreetMap/ },
  { id: 'adresse.data.gouv.fr (Base Adresse Nationale)', code: /api-adresse\.data\.gouv\.fr/, nom: 'api-adresse.data.gouv.fr', exploitant: /Base Adresse Nationale/ },
  { id: 'IGN Géoplateforme (bâtiments, photos aériennes)', code: /data\.geopf\.fr/, nom: 'data.geopf.fr', exploitant: /IGN/ },
  { id: 'OSRM (calcul de trajet)', code: /router\.project-osrm\.org/, nom: 'router.project-osrm.org', exploitant: /OSRM/ },
  { id: 'tuiles Google Maps', code: /\{s\}\.google\.com/, nom: 'mt0.google.com', exploitant: /Google/ },
];
vrai('le recensement trouve les cinq services de carte dans le code d\'app.html (pas une tranche vide)', CARTE.every(c => c.code.test(CODE)), CARTE.filter(c => !c.code.test(CODE)).map(c => c.id));
vrai('… et plus de dix hôtes au total (la population n\'est pas vide)', Object.keys(hotes).length > 10, Object.keys(hotes).length);

console.log('\n── 2. chaque service de carte est nommé dans les pages ──');
for (const c of CARTE) {
  for (const k of ['sous', 'registre', 'confid']) vrai(PAGES[k] + ' nomme ' + c.id + ' (« ' + c.nom + ' »)', T[k].includes(c.nom));
  vrai(PAGES.mentions + ' nomme l\'exploitant de ' + c.id, c.exploitant.test(T.mentions));
}

console.log('\n── 3. ce que les pages disent de Nominatim (le sujet de la décision) ──');
for (const k of ['sous', 'registre', 'confid']) {
  const t = T[k], i = t.indexOf('nominatim.openstreetmap.org'), autour = i < 0 ? '' : t.slice(Math.max(0, i - 400), i + 900);
  vrai(PAGES[k] + ' : l\'organisme (fondation OpenStreetMap) et son pays (Royaume-Uni)', /OpenStreetMap Foundation|fondation OpenStreetMap/i.test(autour) && /Royaume-Uni/.test(autour));
  vrai(PAGES[k] + ' : la donnée transmise (l\'adresse) et la finalité (placer sur la carte)', /adresse/i.test(autour) && /carte/i.test(autour));
}
vrai('sous-traitance.html : la décision d\'adéquation de la Commission européenne pour le Royaume-Uni', /Royaume-Uni[^.]{0,200}adéquation|adéquation[^.]{0,200}Royaume-Uni/.test(T.sous));
vrai('registre-traitements.html : la décision d\'adéquation de la Commission européenne pour le Royaume-Uni', /Royaume-Uni[^.]{0,200}adéquation|adéquation[^.]{0,200}Royaume-Uni/.test(T.registre));
vrai('le moment est dit : à l\'enregistrement d\'une fiche client, au bouton « Localiser » (sous-traitance et confidentialité)', ['sous', 'confid'].every(k => /Enregistrer/.test(T[k]) && /Localiser/.test(T[k])));
vrai('confidentialite.html : la position GPS du technicien n\'est plus dite « ni partagée » (OSRM la reçoit pour estimer l\'arrivée)', !/ni stockée sur nos serveurs ni partagée/.test(T.confid));
vrai('confidentialite.html : … elle dit à qui la position part', /position[^.]{0,400}router\.project-osrm\.org/.test(T.confid));

console.log('\n── 4. aucun engagement que le code ne tient pas ──');
const serveur = ['index.js', 'op-socle.js', 'agent-devis.js'].filter(f => fs.existsSync(path.join(RACINE, 'server', f))).map(f => sansCom(lire('server/' + f)));
vrai('le serveur (server/*.js) n\'appelle aucun de ces cinq services : les appels partent de l\'appareil, comme les pages le disent', serveur.length >= 2 && !serveur.some(s => /nominatim|api-adresse|geopf|osrm|google\.com\/vt/i.test(s)), serveur.length);
for (const k of ['sous', 'registre', 'confid']) {
  vrai(PAGES[k] + ' : dit que l\'appel part de l\'appareil, sans passer par nos serveurs', /sans passer par (nos|le) serveurs?/.test(T[k]));
  vrai(PAGES[k] + ' : ne promet pas « jamais conservé » ni « aucune trace » pour ces services tiers', !/(jamais conserv|aucune trace)[^.]{0,120}(Nominatim|OSRM|Google|geopf)/i.test(T[k]));
}
vrai('les coordonnées obtenues sont enregistrées sur la fiche (le code écrit c.lat / c.lng) — et les pages le disent', /c\.lat=parseFloat\(a\[0\]\.lat\)/.test(CODE) && ['sous', 'registre'].every(k => /enregistrées sur la fiche/.test(T[k])));

console.log('\n── 5. tout hôte du code est classé (un hôte neuf oblige à trancher) ──');
const LIENS = ['www.google.com', 'maps.google.com', 'waze.com', 'maps.apple.com'];     // liens que la PERSONNE ouvre (nouvel onglet) : ni fetch ni image
const AUTRES = {   // flux vers des tiers qui ne sont PAS de la carte — vus, pas traités ici (soumis à Justin dans le rapport du lot)
  'accounts.google.com': 'lien d\'aide à la création de mot de passe d\'application (ouvert par la personne)', 'myaccount.google.com': 'idem',
  'id.orange.fr': 'idem', 'login.yahoo.com': 'idem', 'www.sfr.fr': 'idem',
  'api.anthropic.com': 'assistant de devis (déjà dans les pages)', 'api.teamop.fr': 'notre serveur', 'teamop.fr': 'notre site',
  'api.dicebear.com': 'avatars dessinés (paramètres de style)', 'cdn.jsdelivr.net': 'bibliothèques (jsPDF, Tesseract, PDF.js)', 'unpkg.com': 'bibliothèque de carte Leaflet',
  'raw.githubusercontent.com': 'contours des départements (GeoJSON public)', 'fonts.googleapis.com': 'polices', 'www.w3.org': 'espace de noms SVG (pas un appel)',
};
const estCarte = h => CARTE.some(c => c.code.test(h));
const inconnus = Object.keys(hotes).filter(h => !estCarte(h) && !LIENS.includes(h) && !(h in AUTRES));
vrai('⛔ tous les hôtes appelés par app.html sont classés (carte / lien / autre) — sinon dire s\'ils reçoivent une donnée de client', inconnus.length === 0, inconnus);
const perimes = Object.keys(AUTRES).concat(LIENS).filter(h => !(h in hotes));
vrai('la liste « autres » et « liens » ne cite aucun hôte disparu du code', perimes.length === 0, perimes);

console.log('\n── 6. les pages juridiques gardent leurs numéros de ligne ──');
const ligne = (f, n) => lire(f).split('\n')[n - 1] || '';
vrai('sous-traitance.html:126 est toujours « Tenir un registre » (cité par les plans)', /registre-traitements\.html/.test(ligne('sous-traitance.html', 126)));
vrai('sous-traitance.html:154 est toujours le préavis de 30 jours (cité par PLAN-OP-SOCLE)', /30 jours à l'avance/.test(ligne('sous-traitance.html', 154)));
vrai('sous-traitance.html:162 est toujours IONOS SE', /IONOS SE/.test(ligne('sous-traitance.html', 162)));
vrai('mentions-legales.html:52 est toujours l\'hébergeur (IONOS)', /IONOS SE/.test(ligne('mentions-legales.html', 52)));
vrai('mentions-legales.html:74 est toujours l\'article 5', /n'entraînent aucune suppression/.test(ligne('mentions-legales.html', 74)));
vrai('confidentialite.html:41 est toujours la ligne de la localisation et du trajet', /Localisation \(facultative\)/.test(ligne('confidentialite.html', 41)) && /Heure de départ/.test(ligne('confidentialite.html', 41)));
vrai('confidentialite.html:34 est toujours le contact du responsable', /Contact : /.test(ligne('confidentialite.html', 34)));

console.log('\n── 7. les pages portent la date de leur mise à jour ──');
vrai('registre-traitements.html : « version du 17 octobre 2026 »', /version du 17 octobre 2026/.test(T.registre));
vrai('mentions-legales.html : « Dernière mise à jour : octobre 2026 »', /Dernière mise à jour : octobre 2026/.test(T.mentions));
vrai('confidentialite.html : « Dernière mise à jour : octobre 2026 »', /Dernière mise à jour : octobre 2026/.test(T.confid));

console.log('\n── 8. relecture du 17 octobre 2026 : trois phrases que le code contredisait ──');
/* a. « Google reçoit… jamais une adresse de client » (section 2) et la section 5 doivent dire la même chose : Google n'est pas
      cité parmi les destinataires de l'adresse. Le code envoie à Google des numéros de tuile, pas une adresse. */
vrai('le code envoie à Google des tuiles ({s}.google.com/vt), jamais le champ adresse d\'un client', /\{s\}\.google\.com\/vt/.test(CODE) && !/google\.com\/vt[^'"`]*adresse/i.test(CODE));
{
  const i = T.confid.indexOf('l\'adresse d\'un client est aussi transmise'), j = T.confid.indexOf('Google ne reçoit', i);
  const destinataires = i < 0 || j < 0 ? '' : T.confid.slice(i, j);
  vrai('confidentialite.html §5 : la phrase de partage est trouvée (pas une tranche vide)', destinataires.length > 100, [i, j]);
  vrai('confidentialite.html §5 : Google n\'est pas cité parmi les destinataires de l\'adresse d\'un client', destinataires.length > 100 && !/Google/.test(destinataires));
  vrai('confidentialite.html §5 : … il est dit à part qu\'il ne reçoit que la zone affichée et l\'adresse IP, jamais une adresse de client', /Google ne reçoit que la zone de carte affichée et l'adresse IP de l'appareil, jamais une adresse de client/.test(T.confid));
}
vrai('aucune page ne qualifie de « services publics » l\'ensemble des services de carte (OSRM et Google ne le sont pas)', ['sous', 'registre', 'confid'].every(k => !/services publics de cartographie/.test(T[k])));
/* b. la position du pointage : le code l'écrit dans l'enregistrement, qui part à la synchro — la page ne dit plus « pas stockée ». */
vrai('app.html : pointerDebut range lat et lng de l\'appareil dans l\'enregistrement du pointage', /rec\.lat=\+pos\.coords\.latitude\.toFixed\(5\)[\s\S]{0,80}rec\.lng=\+pos\.coords\.longitude\.toFixed\(5\)/.test(CODE));
vrai('app.html : les pointages sont une collection synchronisée (COLLECTIONS_DONNEES)', /const COLLECTIONS_DONNEES=\[[^\]]*'pointages'/.test(CODE));
vrai('confidentialite.html : ne dit plus que la position « n\'est pas stockée sur nos serveurs »', !/n'est pas stockée sur nos serveurs/.test(T.confid));
vrai('confidentialite.html : dit que la position du pointage « Début de journée » est enregistrée et synchronisée avec les données de l\'équipe', /pointage « Début de journée »[^.]{0,200}enregistrée avec ce pointage[^.]{0,200}synchronisée/.test(T.confid));
vrai('confidentialite.html : … et que le chronomètre automatique n\'enregistre pas les positions lues', /chronomètre ne sont pas enregistrées/.test(T.confid));
vrai('registre-traitements.html : la position relevée au pointage est dans les données du traitement cartes', /pointage « Début de journée » et enregistrée avec le pointage/.test(T.registre));
/* c. §5 de sous-traitance : « toute addition vous sera notifiée 30 jours à l'avance » — les cinq services étaient appelés avant d'être écrits. */
vrai('sous-traitance.html : dit que les cinq services de carte étaient appelés avant leur inscription, à la date du 17 octobre 2026', /sont appelés par l'application depuis avant leur inscription ici : à la date du 17 octobre 2026/.test(T.sous));
vrai('sous-traitance.html : … et ouvre le droit d\'opposition de la clause à ces cinq services', /vous pouvez vous y opposer dans les mêmes conditions/.test(T.sous));
vrai('sous-traitance.html : la clause des 30 jours est intacte (rien n\'est retiré de l\'engagement)', /Toute addition ou remplacement vous sera notifié 30 jours à l'avance par courriel/.test(T.sous));

console.log('\n════ test-1800 : ' + ok + ' ✓ ' + ko + ' ✗ ════');
process.exit(ko ? 1 : 0);
