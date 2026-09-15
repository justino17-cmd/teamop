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

/* ══ 3. QUI A VU L'ERREUR — ET POURQUOI ON NE CROIT PAS LE RAPPORT SUR PAROLE ═════════
   Première écriture de ce correctif : l'application envoyait `user`, `userNom` et `userRole`,
   et la Tour les affichait sous « ✅ ce n'est pas une déduction ». L'agent `gardien` l'a
   REJOUÉ sur un vrai serveur : `/api/monitor/report` n'exige aucune preuve et un nom
   d'entreprise est public, donc un inconnu posait « ELAN · Jean Dupont · patron » et la Tour
   le présentait comme établi. On avait remplacé une déduction fausse une fois sur deux par
   une certitude forgeable — c'est pire, parce qu'on la croit.
   Le corps ne porte donc plus que ce qui DÉSIGNE (un identifiant) et ce qui SITUE (l'espace).
   Le nom et le rôle sont lus dans le journal des connexions du serveur, qui s'écrit contre
   l'identifiant d'espace et non contre un nom public. La preuve fonctionnelle — un rapport
   forgé n'écrit rien, un rapport corroboré écrit le nom DU JOURNAL — vit dans test-641, qui
   lance le vrai serveur. */
{
  const tq = extraire(APP, 'function tmQui()');
  v('tmQui est trouvée', !!tq, true);
  const tmQui = new Function('currentUser', 'localStorage', tq + '; return tmQui;');
  const faux = { getItem: () => 'elan-34oc' };
  v('elle rend l\'identifiant et l\'espace',
    tmQui({ login: 'ben', prenom: 'Ben', nom: 'Ali', role: 'dr' }, faux)(),
    { login: 'ben', espace: 'elan-34oc' });
  /* ⛔ ET RIEN D'AUTRE. Le nom d'un salarié ne doit plus transiter par une route publique. */
  v('⛔ le nom ne part plus', /nom:/.test(tq), false);
  v('⛔ le rôle non plus', /role:/.test(tq), false);
  v('⛔ personne de connecté : l\'espace seul, jamais une exception',
    tmQui(null, faux)(), { login: '', espace: 'elan-34oc' });
  /* ⛔ LA SENTINELLE NE DOIT JAMAIS FAIRE TOMBER L'APPLICATION : c'est sa première règle. */
  v('⛔ un objet biscornu ne la fait pas jeter',
    tmQui({ get login() { throw new Error('boum'); } }, faux)(), { login: '', espace: '' });
  v('⛔ un stockage qui refuse non plus',
    tmQui({ login: 'ben' }, { getItem: () => { throw new Error('bloqué'); } })(), { login: 'ben', espace: '' });
  v('le rapport les emporte', /user:qui\.login,espace:qui\.espace,/.test(APP), true);

  /* Côté serveur : on lit deux champs, et on ne CROIT que ce que le journal confirme. */
  v('le serveur borne l\'identifiant', /const qui = monStr\(r\.user, 40\)\.toLowerCase\(\)\.trim\(\);/.test(SRV), true);
  v('… et l\'espace', /const quiEspace = monStr\(r\.espace, 80\)\.trim\(\);/.test(SRV), true);
  v('⛔ il exige une ligne du journal de CET espace',
    /const jrn = cnxData\[quiEspace\];/.test(SRV) && /String\(x\.login \|\| ''\)\.toLowerCase\(\)\.trim\(\) === qui/.test(SRV), true);
  v('⛔ un échec de connexion ne corrobore rien', /x\.ev !== 'echec'/.test(SRV), true);
  v('⛔ le nom affiché vient du JOURNAL, jamais du corps',
    /g\.nom = monStr\(vu\.nom, 60\)\.trim\(\);/.test(SRV), true);
  v('⛔ le rôle aussi', /g\.role = monStr\(vu\.role, 16\)\.trim\(\);/.test(SRV), true);
  /* ⛔ ET LE DERNIER VU GAGNE. La première écriture gardait la PREMIÈRE vue : douze envois
     préemptaient les douze places, et plus aucun rapport légitime ne pouvait corriger. */
  v('⛔ la place la plus ancienne cède au lieu de refuser', /ent\.gens\.splice\(vieux, 1\);/.test(SRV), true);
  v('… et la liste reste plafonnée', /ent\.gens\.length >= 12/.test(SRV), true);
  /* ⛔ LES NOMS NE PARTENT PAS À L'ARCHIVE : elle garde 5 000 incidents et n'a aucune purge
     par âge, là où le journal dont ils sortent tourne à 500 entrées par entreprise. */
  v('⛔ l\'archive est débarrassée des personnes',
    /\(i\.entreprises \|\| \[\]\)\.forEach\(e => \{ if \(e && e\.gens\) delete e\.gens; \}\);/.test(SRV), true);

  /* Côté Tour : le fait d'abord, la déduction ensuite — et on écrit laquelle on lit. */
  v('la Tour construit le bloc corroboré', /var quiExact='';/.test(TOUR), true);
  v('⛔ et elle ne promet que ce que la donnée vaut', /CONFIRMÉ PAR LE JOURNAL DES CONNEXIONS/.test(TOUR), true);
  v('⛔ l\'ancienne promesse a disparu', /ce n’est pas une déduction<\/div>/.test(TOUR), false);
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
  /* ⛔ ET MAINTENANT LE COMPORTEMENT, PAS LE TEXTE. Les deux relectures ont fait le même
     reproche à la première version de ce fichier : il vérifiait que les LIGNES existent, pas
     qu'elles font ce qu'elles disent. C'est ce qui a laissé passer le vrai défaut — devenu
     aléatoire, `tourMdpDefaut` transformait `if(mdp&&sp.m!==mdp){ sp.m=mdp; }` d'un no-op en
     une CORRUPTION : à chaque ouverture du panneau, le vrai mot de passe mémorisé était
     remplacé par un tirage neuf, et le bouton « Envoyer par e-mail » expédiait au client un
     mot de passe qui ne marche pas. On exécute donc les deux lignes réelles, extraites du
     fichier livré. */
  {
    const ligneSp = (TOUR.match(/^\s*if\(mdp&&[^\n]*sp\.m[^\n]*$/m) || [''])[0].trim();
    v('la ligne qui met à jour le mot de passe mémorisé est trouvée', !!ligneSp, true);
    const majSp = new Function('sp', 'mdp', 'var maj=false; ' + ligneSp + ' return {m:sp.m,maj:maj};');
    v('⛔ un mot de passe déjà mémorisé n\'est JAMAIS écrasé par un tirage neuf',
      majSp({ m: 'VRAI-MDP-DONNE-AU-CLIENT' }, 'OP-hasard1234'),
      { m: 'VRAI-MDP-DONNE-AU-CLIENT', maj: false });
    v('… mais un trou se comble', majSp({ m: '' }, 'OP-hasard1234'), { m: 'OP-hasard1234', maj: true });

    const ligneRet = (TOUR.match(/^\s*ident:\(connu\.ident[^\n]*$/m) || [''])[0].trim();
    v('la ligne de retour d\'un espace connu est trouvée', !!ligneRet, true);
    const ret = new Function('connu', 'ident', 'sp', 'mdp', 'return {' + ligneRet.replace(/,\s*$/, '') + '};');
    v('⛔ sans trace locale, on ne rend RIEN — c\'est ce qui allume « inconnu sur cet appareil »',
      ret({ ident: 'flo' }, 'flo', null, 'OP-hasard1234').mdp, '');
    v('avec la trace, on rend le VRAI mot de passe',
      ret({ ident: 'flo' }, 'flo', { m: 'VRAI-MDP' }, 'OP-hasard1234').mdp, 'VRAI-MDP');
  }
  v('le message envoyé au client ne porte pas un blanc',
    /mdpInconnu\?'\(à te faire redonner — voir plus bas\)':mdpAff/.test(TOUR), true);
}

console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
process.exit(ko ? 1 : 0);
