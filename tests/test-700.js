/* ══ v683 — LES TROIS PORTES QUE JUSTIN A TROUVÉES LUI-MÊME ═══════════════════════════════

   15 septembre 2026, dans l'après-midi, trois captures d'écran et trois phrases :

   1. « c'est quoi cette page, je viens de voir ça, je trouve ça pas bien » — l'écran de
      connexion d'app.html sur un appareil neuf.
   2. « le lien de connexion, je le trouve dangereux » — le panneau de la Tour.
   3. « quand on a ça je veux voir quel utilisateur » — le dossier d'erreur de la Tour.

   Les trois étaient justes, et les trois cachaient un défaut réel.

   ⚠️ CE QUI NE S'EXÉCUTE PAS EST DIT. L'écran de connexion se lit au navigateur
   (`scratchpad/sonde-ecran-connexion.js`, qui sert le dépôt local sur un profil VIDE — aucune
   donnée de client) ; ici on vérifie le fichier livré. Les fonctions qui peuvent tourner
   tournent, extraites par comptage d'accolades et jamais par une fenêtre de largeur fixe. */
const fs = require('fs'), path = require('path');
const R = p => fs.readFileSync(path.join(__dirname, '..', p), 'utf8');
const APP = R('app.html'), SRV = R('server/index.js'), TOUR = R('tour.html');
let ok = 0, ko = 0;
function v(nom, recu, attendu) {
  const bon = JSON.stringify(recu) === JSON.stringify(attendu);
  if (bon) { ok++; console.log('  ✓ ' + nom); }
  else { ko++; console.log('  ✗ ' + nom + '\n      attendu ' + JSON.stringify(attendu) + '\n      reçu    ' + JSON.stringify(recu)); }
}
function extraire(src, entete) {
  const d = src.indexOf(entete); if (d < 0) return null;
  let n = 0;
  for (let i = src.indexOf('{', d); i < src.length; i++) {
    if (src[i] === '{') n++; else if (src[i] === '}') { n--; if (!n) return src.slice(d, i + 1); } }
  return null;
}

console.log('\n── 700 · l\'écran de connexion, le lien de la Tour, et qui a vu l\'erreur ──');

/* ══ 1. L'AVERTISSEMENT QUI NE S'EST JAMAIS AFFICHÉ ════════════════════════════════════
   Il vivait DANS la branche « cet appareil EST sur un espace », alors que sa propre condition
   dit « cet appareil N'EST PAS sur un espace ». Deux choses qui ne peuvent pas être vraies
   ensemble : rien ne sortait, jamais. Mesuré au navigateur avant/après (voir l'en-tête). */
{
  const i = APP.indexOf('$(\'login-box\').innerHTML=');
  const j = APP.indexOf('setTimeout(()=>{ const el=$(saved?\'li-pin\':\'li-login\'); if(el) el.focus(); },60);', i);
  v('le gabarit de l\'écran de connexion est trouvé', i > 0 && j > i, true);
  const bloc = APP.slice(i, j);
  /* La branche `_surEspace ? … : ''` commence au premier `${_surEspace?` et se referme sur
     son `:''}`. L'avertissement doit être APRÈS cette fermeture, pas avant. */
  const debutBranche = bloc.indexOf('${_surEspace?`');
  const finBranche = bloc.indexOf(':\'\'}', bloc.indexOf('elan_ent_ok'));
  const posAvertissement = bloc.indexOf('id="li-orphelin"');
  v('l\'avertissement existe toujours', posAvertissement > 0, true);
  v('⛔ il n\'est PLUS enfermé dans la branche « déjà sur un espace »',
    posAvertissement > finBranche && finBranche > debutBranche, true);
  v('… et sa condition reste « aucune entreprise »',
    /\$\{\(!_surEspace&&!BETA_ESSAI\)\?`<div id="li-orphelin"/.test(bloc), true);
  /* ⛔ ET SA COULEUR EXISTE. Second signe que personne ne l'avait jamais vu : il tirait sur
     --amber, absente des DEUX thèmes — scripts/verifier-theme.js la signalait, et c'était le
     seul endroit du fichier à l'employer. */
  v('⛔ il n\'utilise plus une variable de couleur inexistante', /var\(--amber\)/.test(APP), false);
  v('… mais une qui est définie dans les deux thèmes',
    /id="li-orphelin"[^`]*var\(--org\)/.test(bloc) && (APP.match(/--org:/g) || []).length >= 2, true);
}

/* ══ 2. « LAISSE VIDE » N'EST PLUS UNE INVITATION ══════════════════════════════════════
   L'aide disait « Compte local sur cet appareil : laisse vide ». On laissait vide, on entrait,
   et on travaillait sur une base que l'équipe ne verra JAMAIS — sans un mot, puisque
   l'avertissement ci-dessus ne sortait pas. */
{
  v('⛔ la phrase qui invitait au piège a disparu', /Compte local sur cet appareil : laisse vide/.test(APP), false);
  const dl = extraire(APP, 'async function doLogin(e)');
  v('doLogin est trouvée', !!dl, true);
  /* On ne FERME pas ce chemin — quelqu'un qui découvre l'application seul en a besoin, et des
     comptes locaux existent déjà. On exige un geste conscient. */
  v('⛔ partir sans entreprise demande une confirmation',
    /if\(!_entSaisi && \$\('li-ent'\) && !BETA_ESSAI\)\{\s*\n\s*if\(!confirm\(/.test(dl), true);
  v('… et le refus ramène au champ, il ne connecte pas',
    /const el=\$\('li-ent'\); if\(el\) el\.focus\(\);\s*\n\s*return;/.test(dl), true);
  v('la confirmation dit ce que ça coûte', /ton équipe ne verra rien/.test(dl), true);
  /* ⚠️ Ni pour la bêta (elle n'a pas ce champ), ni pour un appareil déjà rattaché
     (`_surEspace` le retire) : dans les deux cas `$('li-ent')` est absent. */
  v('⛔ la bêta n\'est pas concernée', /&& !BETA_ESSAI\)\{/.test(dl), true);
}

/* ══ 3. QUI A VU L'ERREUR — LE FAIT, PLUS LA DÉDUCTION ════════════════════════════════ */
{
  /* Côté application : trois champs, les mêmes que porte déjà le journal des connexions. */
  const tq = extraire(APP, 'function tmQui()');
  v('tmQui est trouvée', !!tq, true);
  const tmQui = new Function('currentUser', tq + '; return tmQui;');
  v('elle rend l\'identifiant, le nom et le rôle',
    tmQui({ login: 'ben', prenom: 'Ben', nom: 'Ali', role: 'dr' })(),
    { login: 'ben', nom: 'Ben Ali', role: 'dr' });
  v('⛔ personne de connecté : trois chaînes vides, jamais une exception',
    tmQui(null)(), { login: '', nom: '', role: '' });
  /* ⛔ LA SENTINELLE NE DOIT JAMAIS FAIRE TOMBER L'APPLICATION : c'est sa première règle. */
  v('⛔ un objet biscornu ne la fait pas jeter',
    tmQui({ get login() { throw new Error('boum'); } })(), { login: '', nom: '', role: '' });
  v('⛔ et rien de plus personnel ne part : ni e-mail, ni téléphone',
    /function tmQui\(\)[\s\S]{0,700}?email|function tmQui\(\)[\s\S]{0,700}?tel\b/.test(APP.slice(APP.indexOf('function tmQui()'), APP.indexOf('function tmQui()') + 700)), false);
  v('le rapport les emporte', /user:qui\.login,userNom:qui\.nom,userRole:qui\.role/.test(APP), true);

  /* Côté serveur : bornés comme tout le reste, et rangés par entreprise. */
  v('le serveur borne l\'identifiant', /const qui = monStr\(r\.user, 40\)\.toLowerCase\(\)\.trim\(\);/.test(SRV), true);
  v('… le nom aussi', /const quiNom = monStr\(r\.userNom, 60\)\.trim\(\);/.test(SRV), true);
  v('⛔ la liste des personnes est plafonnée', /ent\.gens\.length < 12/.test(SRV), true);
  v('⛔ et sans doublon : on retrouve la personne avant de l\'ajouter',
    /let g = ent\.gens\.find\(x => x && x\.login === qui\);/.test(SRV), true);
  v('une version antérieure n\'écrit rien', /if \(qui\) \{/.test(SRV), true);

  /* Côté Tour : le fait d'abord, la déduction ensuite — et on écrit laquelle on lit. */
  v('la Tour construit le bloc « signalé par l\'application »', /var quiExact='';/.test(TOUR), true);
  v('… en le disant explicitement', /ce n’est pas une déduction/.test(TOUR), true);
  v('⛔ et quand elle n\'a que la déduction, elle l\'annonce comme telle',
    /Ce qui suit est une <b>déduction<\/b>/.test(TOUR), true);
  v('⛔ le bloc ne peut pas faire tomber la fiche', /\}catch\(e\)\{ quiExact=''; \}/.test(TOUR), true);
}

/* ══ 4. LE MOT DE PASSE PROVISOIRE NE SE DEVINE PLUS ══════════════════════════════════
   Il rendait le NOM DE FAMILLE du client + « !! », pendant que l'identifiant est son PRÉNOM.
   Florian Duflot → `florian` / `Duflot!!`, sur une route de connexion PUBLIQUE, pour une
   entreprise dont l'adresse s'écrit sur un camion. */
{
  const fn = extraire(TOUR, 'function tourMdpDefaut()');
  v('tourMdpDefaut est trouvée', !!fn, true);
  v('⛔ elle ne dérive plus du nom du client', /nomFam|charAt\(0\)\.toUpperCase\(\)/.test(fn || ''), false);
  v('⛔ et ne rend plus « !! »', /\+'!!'/.test(fn || ''), false);
  const tourMdpDefaut = new Function('crypto', fn + '; return tourMdpDefaut;')(require('crypto').webcrypto);
  const tirages = new Set();
  for (let i = 0; i < 200; i++) tirages.add(tourMdpDefaut('x@y.fr'));
  v('⛔ 200 tirages donnent 200 valeurs différentes', tirages.size, 200);
  const un = tourMdpDefaut();
  v('il s\'annonce', /^OP-/.test(un), true);
  v('assez long pour ne pas se deviner', un.length, 13);
  /* Dicté au téléphone à un technicien sur un chantier : ni O/0, ni I/l/1. */
  /* ⚠️ On teste la PARTIE TIRÉE AU SORT, pas le préfixe : « OP- » porte un O, mais c'est la
     marque et personne ne l'épelle. Première écriture de ce test, il incluait le préfixe et
     échouait sur son propre décor. */
  v('⛔ aucun caractère ambigu dans la partie tirée au sort',
    /[O0Il1]/.test([...tirages].map(x => x.slice(3)).join('')), false);
  /* ⛔ ET ON N'AFFICHE PLUS UN MOT DE PASSE QUE LE SERVEUR N'A JAMAIS HACHÉ. Devenu tiré au
     sort, il n'est plus recalculable : un espace existant dont CE navigateur n'a pas gardé la
     trace n'a rien à montrer. Avant, on affichait une valeur qui était de toute façon fausse
     dès que le client avait changé son mot de passe. */
  v('le cas « inconnu sur cet appareil » est détecté',
    /var mdpInconnu=!e\.mdp && \(e\.annuaire\|\|0\)>0;/.test(TOUR), true);
  v('⛔ et on n\'invente rien à la place', /var mdpAff=e\.mdp\|\|\(mdpInconnu\?'':mdp\);/.test(TOUR), true);
  v('l\'écran le dit', /inconnu sur cet appareil/.test(TOUR), true);
  v('… et donne la sortie', /Mot de passe oublié \?ature|Mot de passe oublié \?/.test(TOUR), true);
  v('le message envoyé au client ne porte pas un blanc',
    /mdpInconnu\?'\(à te faire redonner — voir plus bas\)':mdpAff/.test(TOUR), true);
}

console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
process.exit(ko ? 1 : 0);
