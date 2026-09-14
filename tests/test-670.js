/* ⛔ CE QUE CE FICHIER GARDE — le Courrier de la Tour se regarde boîte par boîte.

   Justin, 12 septembre 2026 : « je veux que la Tour refasse tout le mail, que je puisse
   choisir par mail ». Trois boîtes sont reliées — support@, controle@, contact@ — et elles
   étaient listées en bas de la barre, en petit, non cliquables, avec ce commentaire :

       « Les boîtes reliées restent visibles, en bas et en petit. Ce n'est plus le rangement,
         c'est la plomberie. Les rendre cliquables ramènerait le mélange qu'on vient de
         supprimer. »

   ── POURQUOI CE COMMENTAIRE AVAIT RAISON, ET POURQUOI ON LE DÉPASSE ───────────────────────
   Il visait juste sur son point : ranger PAR BOÎTE À LA PLACE des entreprises remettrait ELAN
   et sa voisine dans la même colonne — exactement ce que Justin avait fait corriger avant
   (« je ne veux pas que tout soit mélangé entre eux »). Ce n'est pas ce qu'on fait ici. La
   boîte devient un CADRE, et le rangement par entreprise continue À L'INTÉRIEUR. On n'échange
   pas un rangement contre l'autre : on les emboîte.

   ── LE PIÈGE QU'ON A ÉVITÉ, ET QUI AURAIT ÉTÉ INVISIBLE ───────────────────────────────────
   La vue fusionnée ne charge qu'une TRANCHE de messages (PAR_PAGE × 2, toutes boîtes
   confondues). Filtrer côté navigateur aurait montré « ce qui traînait déjà en mémoire » en
   laissant croire que la boîte ne contient que ça — une liste courte et fausse, sans le moindre
   signe. La route serveur accepte « ?boite= » depuis toujours : c'est elle qu'on appelle, avec
   sa pagination. La plomberie existait ; il ne manquait que le clic.

   ── DEUX DÉFAUTS D'AVANT, VUS EN PILOTANT L'ÉCRAN AU NAVIGATEUR ───────────────────────────
   Ni l'un ni l'autre ne se voyait en relisant le code :
   · chaque ligne de message affichait « b-sup », l'identifiant technique, au lieu de
     « support@teamop.fr » — la ligne prévoit un `m.boiteNom` que le serveur n'envoie pas ;
   · le bouton ⟳ disait « Boîte support actualisée », toujours, même en relevant controle@.

   Sonde : scratchpad/sonde-courrier.js (Chromium, trois boîtes et des messages en fixture).
   Mesuré : clic sur controle@ → requête « /api/monitor/mail/liste?page=0&boite=b-ctl », titre
   « Courrier · controle@teamop.fr », liste ramenée à 1 message ; retour → 3 messages. */

const fs = require('fs');
const TOUR = fs.readFileSync(__dirname + '/../tour.html', 'utf8');
let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + JSON.stringify(b) + '\n      obtenu  : ' + JSON.stringify(a)); } };

function corps(src, entete) {
  const i = src.indexOf(entete);
  if (i < 0) return '';
  let j = src.indexOf('{', i), p = 0;
  for (let k = j; k < src.length; k++) {
    const c = src[k];
    if (c === '{') p++;
    else if (c === '}') { p--; if (!p) return src.slice(i, k + 1); }
  }
  return '';
}

console.log('Le Courrier se regarde boîte par boîte, sans mélanger les entreprises');

// ══ 1) CHOISIR UNE BOÎTE DEMANDE AU SERVEUR — ce n'est pas un filtre de page ══════════════
{
  const f = corps(TOUR, 'function mailChoisirBoite(');
  v('la fonction existe', f.length > 200, true);
  /* ⛔ LE CONTRÔLE QUI COMPTE. Sans cet appel, on filtrerait la tranche déjà chargée et la
     boîte paraîtrait presque vide — sans que rien ne le dise. */
  v('⛔ elle REDEMANDE la liste au serveur', /chargerMessages\(\);/.test(f), true);
  v('…en posant la boîte dans MSG.sel, que le chargeur lit', /MSG\.sel = id \?/.test(f), true);
  v('le chargeur passe bien « boite » à la route', /p\+='&boite='\+encodeURIComponent\(s\.boite\)/.test(TOUR), true);
  /* Les messages de la boîte précédente ne doivent pas rester sous les yeux pendant que les
     nouveaux arrivent : sinon on lit la mauvaise boîte en croyant lire la bonne. */
  v('⛔ l’ancienne liste est vidée avant l’arrivée de la nouvelle', /MSG\.messages=\[\]; MSG\.total=0;/.test(f), true);
  /* L'entreprise ouverte n'écrit peut-être pas à cette boîte : y rester afficherait un écran
     vide sans dire pourquoi. */
  v('on repart de « toutes les entreprises »', /MSG\.selEnt='toutes'; MSG\.selCat='tout';/.test(f), true);
  v('…et le message ouvert se referme', /MSG\.ouvert=null; MSG\.lu=null; MSG\.envSel=null;/.test(f), true);
  v('« toutes les boîtes » revient en passant un identifiant vide', /: \{boite:'toutes'/.test(f), true);
}

// ══ 2) LA BARRE : les boîtes se cliquent, et elles passent EN PREMIER ═════════════════════
{
  const f = corps(TOUR, 'function mailDossiers(');
  v('⛔ les boîtes sont des BOUTONS, plus des lignes mortes', /mailChoisirBoite\(\\'/.test(f), true);
  v('⛔ l’ancienne liste morte a disparu', /class="dos-plomb"/.test(TOUR), false);
  v('il y a une entrée « Toutes les boîtes »', /'Toutes les boîtes'/.test(f), true);
  /* Elles cadrent tout ce qui suit : les entreprises en dessous ne veulent rien dire de précis
     tant qu'on ne sait pas de quelle boîte elles parlent. */
  /* On compare les EN-TÊTES tels qu'ils sont écrits dans le balisage. Ma première version
     cherchait "'Boîte'" entre apostrophes : introuvable, donc indexOf rendait -1, et la
     comparaison passait au rouge sur du code juste. La capture navigateur, elle, montrait
     bien l'ordre — c'était l'assertion qui se trompait de cible, pas l'écran. */
  /* ⛔ CE CONTRÔLE A CHANGE DE SENS LE 13 SEPTEMBRE AU SOIR. Il gardait l'ORDRE de deux
     en-têtes, « Boîte » avant « Entreprises ». La section « Entreprises » n'existe plus :
     Justin l'a montrée en capture — « je parle de ça à supprimer dans mail ». Le rangement par
     entreprise se fait DANS LA LISTE, où chaque groupe porte son nom, son compte et son bouton
     d'entrée ; la barre en était le doublon, et ce doublon coûtait deux titres de section pour
     une seule ligne utile sur son écran.
     Ce qui est gardé maintenant : la barre ne porte plus QUE les boîtes. */
  var iB = f.indexOf('>Boîte</div>');
  v('l’en-tête « Boîte » existe', iB > -1, true);
  v('⛔ et c’est le seul en-tête de la barre',
    (f.match(/<div class="dos-t">/g) || []).length, 1);
  v('⛔ plus de section « Entreprises »', f.indexOf('>Entreprises</div>') > -1, false);
  v('⛔ ni de section « Rechercher »', f.indexOf('>Rechercher</div>') > -1, false);
  /* Le rangement par entreprise n'a pas disparu pour autant — il a juste quitté la barre. */
  v('la liste groupe toujours par entreprise', /function courrierParEnt\(\)/.test(TOUR), true);
  v('…et garde son chemin d’entrée', /Voir les '\+g\.msgs\.length\+' messages de /.test(TOUR), true);
  /* ⛔ LE PIÈGE DE CE RETRAIT, et la raison d'être des deux contrôles qui suivent : « Toutes
     les entreprises » dans la barre était le SEUL retour depuis la vue d'une entreprise. Celui
     du corps de page ne sort que dans l'état VIDE. Sans le retour posé dans l'en-tête, le
     bouton d'entrée devenait une porte à sens unique. */
  const vs = corps(TOUR, 'function vueSupport(');
  v('⛔ la vue d’une entreprise offre le retour dans l’en-tête',
    /mailChoisirEnt\(\\'toutes\\'\);return false">Revenir à toutes les entreprises<\/a>/.test(vs), true);
  v('…et le titre nomme l’entreprise ouverte', /entVue\?\('Courrier · '\+entNom\)/.test(vs), true);
  /* Un choix à une seule option est un faux choix : avec une seule boîte reliée, la section
     ne s'affiche pas du tout. */
  v('⛔ une seule boîte reliée : pas de section du tout', /if\(MSG\.boites\.length>1\|\|mailBoiteChoisie\(\)\)\{/.test(f), true);
  /* Le compteur vient du serveur et vaut pour TOUTE la boîte, pas pour la tranche chargée :
     c'est le seul chiffre juste avant d'avoir ouvert. */
  v('le compteur par boîte vient du serveur', /Number\(x\.nonLus\)\|\|0/.test(f), true);
}

// ══ 2bis) LA SECTION « FILTRER » A ÉTÉ SUPPRIMÉE — ET CE QUI LA REMPLACE ════════════════
/* ⛔ CE BLOC A CHANGÉ DE SENS LE 13 SEPTEMBRE 2026 AU SOIR, et c'est voulu.
   Il gardait, le matin, l'existence d'une section « Filtrer » à cinq catégories. Le soir,
   après avoir vu les dossiers IMAP en place, Justin a tranché : « supprime dans mail filtre,
   il ne sert à rien, on filtre par boîte mail, c'est largement suffisant ».
   Il a raison, et la raison vaut d'être écrite : les dossiers (Réception, Indésirables,
   Corbeille, Archives) découpent la matière que le SERVEUR DE COURRIER connaît, tandis que
   les catégories découpaient la tranche que la Tour avait chargée. Deux découpages
   concurrents dans la même barre obligeaient à tenir les deux en tête pour savoir ce qu'on
   regardait.
   ⚠️ MAIS LE PIÈGE ÉTAIT AILLEURS, et c'est lui que ce bloc garde maintenant : « Envois
   TeamOP » était rangé parmi ces filtres SANS EN ÊTRE UN. Les quatre autres restreignaient la
   liste courante ; celui-là CHANGE DE SOURCE — une autre route, le SMTP de TeamOP, pas l'IMAP
   d'une boîte reliée. Supprimer le bloc entier l'aurait emporté avec, et le seul chemin
   restant aurait été un bouton en bas du Journal de la console, dont le libellé (« dans
   Support → Envoyés ») serait devenu faux par la même occasion. Il est donc remonté dans la
   section « Boîte », là où il dit ce qu'il est : la sortie, à côté des entrées. */
{
  const f = corps(TOUR, 'function mailDossiers(');
  v('⛔ plus aucune section « Filtrer »', />Filtrer<\/div>/.test(f), false);
  v('…et plus aucune rangée de catégories', /MAIL_CATS\.map\(function\(c\)\{/.test(f), false);
  v('⛔ « Envois TeamOP » n’est PAS parti avec elles', /'📤', 'Envois TeamOP'/.test(f), true);
  /* « Rechercher » a disparu à son tour : on ancre sur ce qui reste, la fin de la section
     Boîte, plutôt que sur un repère supprimé — sinon indexOf rend -1 et la comparaison est
     vraie par accident. */
  v('…et il est bien DANS la section Boîte',
    f.indexOf("'Envois TeamOP'") > f.indexOf('>Boîte</div>'), true);
  /* Le clic est écrit dans une chaîne JS : c'est `mailChoisirCat(\\'envoyes\\')` dans le
     fichier, apostrophes échappées comprises. Une garde qui vise `.envoyes.` rate d'un
     caractère et passe au rouge sur du code juste — vu à l'instant. */
  v('…en gardant le chemin qui ouvre la vue des envois', /mailChoisirCat\(\\'envoyes\\'\)/.test(f), true);
  v('les catégories ne sont pas non plus imbriquées sous l’entreprise', /class="dos sous"/.test(TOUR), false);
  v('…ni répétées pour chaque entreprise', /dos sous'\+\(MSG\.selCat/.test(TOUR), false);

  /* Les deux fonctions qui ne servaient QU'aux compteurs des filtres sont parties avec eux.
     Une fonction qui ne compte plus qu'une occurrence — sa propre définition — est du code
     mort, et du code mort dans un fichier de 570 Ko se paie en relecture. */
  v('⛔ mailCadreMsgs est retirée', /function mailCadreMsgs\(/.test(TOUR), false);
  v('⛔ mailEnvoisDe est retirée', /function mailEnvoisDe\(/.test(TOUR), false);
  /* Celles dont d'autres écrans dépendent encore, elles, RESTENT. */
  v('MAIL_CATS reste — deux états vides lisent son libellé', /var MAIL_CATS=\[/.test(TOUR), true);
  v('mailDansCat reste — le groupage par entreprise filtre dessus', /function mailDansCat\(/.test(TOUR), true);
  v('mailChoisirCat reste — c’est lui qui ouvre les envois', /function mailChoisirCat\(/.test(TOUR), true);

  /* ⛔ LE DÉFAUT QUE CE LOT CORRIGE VRAIMENT : la vue « toutes les entreprises » ignorait le
     filtre. La barre montrait une catégorie allumée pendant que la liste affichait tout — on
     croyait avoir trié. Un filtre qui s'allume sans filtrer est pire qu'un filtre absent. */
  /* ⚠️ `mailListeRecue` n'est qu'une ENVELOPPE (elle pose un bandeau puis délègue) : viser son
     nom rendait 79 signes, et six contrôles passaient au rouge sur du code juste. Le vrai corps
     s'appelle `mailListeRecueCorps`. Une garde qui lit le mauvais bloc ne garde rien — dans un
     sens comme dans l'autre. */
  const l = corps(TOUR, 'function mailListeRecueCorps(');
  v('le vrai corps de la liste est retrouvé, et entier', l.length > 2000, true);
  v('⛔ la vue « toutes les entreprises » filtre enfin', /return mailDansCat\(m,catT\.cle\); \}\)/.test(l), true);
  v('…et laisse tomber les entreprises devenues vides', /\}\)\.filter\(function\(g\)\{ return g\.msgs\.length; \}\);/.test(l), true);
  /* Rien dans la catégorie : on le DIT et on donne la sortie. Sinon l'écran reste vide et on
     croit que la boîte l'est aussi. */
  v('⛔ un filtre sans résultat le dit, au lieu de laisser l’écran vide', /if\(!gr\.length\) return supVide\('support','Rien dans/.test(l), true);
  v('…en nommant la boîte quand il y en a une', /Aucun message de '\+esc\(mailBoiteNom\(mailBoiteChoisie\(\)\)\)/.test(l), true);
  v('…et en offrant de tout revoir', /onclick="mailChoisirCat\(\\'tout\\'\)">Voir tous les messages/.test(l), true);
}

// ══ 2ter) UN LIBELLÉ NE SE COUPE PLUS ════════════════════════════════════════════════════
/* La colonne fait 238 px et « Toutes les entreprises » s'affichait « Toutes les entrep… ».
   Un libellé tronqué cache une information — et il y en a d'autres qui arrivent : des noms
   d'entreprise, des adresses de boîte. */
{
  v('⛔ plus de coupure à l’ellipse sur les libellés de la barre',
    /\.dos-n\{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap\}/.test(TOUR), false);
  v('le libellé se replie', /-webkit-line-clamp:2/.test(TOUR), true);
  /* Deux lignes AU PLUS : au-delà, une seule entrée pourrait manger toute la barre. */
  v('…mais deux lignes au plus', /-webkit-line-clamp:2;line-height:1\.25/.test(TOUR), true);
  /* La coupure se fait entre les mots : un nom d'entreprise coupé en deux ne se reconnaît plus. */
  v('…et jamais au milieu d’un mot', /overflow-wrap:break-word/.test(TOUR), true);
  /* Le plancher tactile de 44 px tient toujours — c'est une console utilisée au doigt aussi. */
  v('⛔ le plancher tactile de 44 px tient', /\.dos\{display:flex;[^}]*min-height:44px/.test(TOUR), true);
  v('…et la ligne respire quand elle grandit', /min-height:44px;padding:7px 10px/.test(TOUR), true);
}

// ══ 3) L'ÉCRAN DIT QUELLE BOÎTE ON REGARDE ═══════════════════════════════════════════════
/* Sans ça, seul le surlignage de la barre le disait — et sur écran étroit cette barre se
   replie. Un écran qui filtre sans le dire fait croire que le reste n'existe pas. */
{
  /* Le titre s'est allongé le 13 septembre : le dossier s'y ajoute quand ce n'est pas la
     réception (lot des dossiers IMAP, tests/test-671.js). Ce contrôle-ci garde ce qu'il
     gardait — que la BOÎTE soit nommée — sans figer la suite de la phrase, sinon il
     casserait à chaque mot ajouté au titre. */
  /* Le titre a gagné une branche le 13 septembre au soir : la vue des envois se nomme
     elle-même, parce qu'elle ne vient pas de la boîte sélectionnée. Ce contrôle garde les
     deux : la boîte est nommée quand on la regarde, les envois quand ce sont eux. */
  v('⛔ le titre nomme la boîte', /\(bCh\?\('Courrier · '\+bNom/.test(TOUR), true);
  v('⛔ …et les envois se nomment eux-mêmes', /envVue\?'Courrier · Envois TeamOP'/.test(TOUR), true);
  v('le sous-titre explique ce qu’on ne voit pas', /Vous ne voyez que ce qui est arrivé sur/.test(TOUR), true);
  v('…et donne la sortie, sur place', /Voir toutes les boîtes/.test(TOUR), true);
}

// ══ 4) L'ADRESSE, PAS L'IDENTIFIANT TECHNIQUE — on joue la vraie fonction ═════════════════
{
  const src = corps(TOUR, 'function mailBoiteNom(');
  v('la fonction existe', src.length > 80, true);
  const MSG = { boites: [
    { boite: { id: 'b-sup', email: 'support@teamop.fr' } },
    { boite: { id: 'b-ctl', email: 'controle@teamop.fr' } },
    { boite: {} } ] };
  const mailBoiteNom = eval('(' + src.replace(/^function mailBoiteNom/, 'function') + ')');
  v('⛔ un identifiant rend son adresse', mailBoiteNom('b-sup'), 'support@teamop.fr');
  v('…et l’autre aussi', mailBoiteNom('b-ctl'), 'controle@teamop.fr');
  /* Une boîte qu'on ne connaît plus (débranchée entre-temps) : on retombe sur l'identifiant
     plutôt que de rendre vide. Une ligne sans origine vaut mieux qu'une ligne qui ment. */
  v('une boîte inconnue retombe sur son identifiant', mailBoiteNom('b-parti'), 'b-parti');
  v('rien du tout rend rien du tout', mailBoiteNom(''), '');
  v('une entrée abîmée ne casse pas la boucle', mailBoiteNom('b-vide'), 'b-vide');

  const l = corps(TOUR, 'function mailLigneRecue(');
  v('⛔ la ligne n’affiche plus l’identifiant brut', /esc\(m\.boiteNom\|\|m\.boite\)/.test(l), false);
  v('elle passe par la correspondance', /mailBoiteNom\(m\.boite\)/.test(l), true);
  /* Répéter la boîte sur chaque ligne quand tout l'écran ne parle que d'elle n'apporte rien —
     et prend la place du nom, de l'objet et de l'heure, qui comptent. */
  v('⛔ …et seulement quand on regarde PLUSIEURS boîtes', /if\(!mailBoiteChoisie\(\)\)\{ var bn=/.test(l), true);
}

// ══ 5) CE QUE LE CADRE NE PEUT PAS FAIRE, ET QU'IL FAUT DIRE ═════════════════════════════
/* Tout ce que TeamOP envoie part de la MÊME adresse SMTP : le journal d'envoi ne porte même
   pas de boîte d'expédition. Laisser « Envoyés » muet pendant que le titre annonce
   « Courrier · support@ » ferait croire que ces envois sont ceux de cette boîte-là. */
{
  const f = corps(TOUR, 'function mailListeEnvoyee(');
  v('⛔ « Envoyés » dit qu’il ne se range pas par boîte', /Les envois ne se rangent pas par boîte/.test(f), true);
  v('…seulement quand une boîte est choisie', /var noteB = mailBoiteChoisie\(\)/.test(f), true);
  /* La note doit aussi apparaître quand la liste est VIDE : c'est là qu'un volet muet trompe
     le plus — on croirait que cette boîte n'a rien envoyé. */
  v('⛔ y compris sur la liste vide', /if\(!vus\.length\) return noteB\+\(q/.test(f), true);
  v('…et sur la liste pleine', /return noteB\+'<div class="reg"/.test(f), true);
}

// ══ 6) LE BOUTON ⟳ NOMME CE QU'IL RELÈVE ═════════════════════════════════════════════════
{
  v('⛔ il ne dit plus « support » quoi qu’il arrive', /toast\('Boîte support actualisée'\)/.test(TOUR), false);
  v('il nomme la boîte relevée', /mailBoiteNom\(mailBoiteChoisie\(\)\)\+' actualisée'/.test(TOUR), true);
  v('…ou les dit toutes', /'Toutes les boîtes actualisées'/.test(TOUR), true);
}

// ══ 7) CE QUE CE LOT NE DOIT PAS AVOIR CASSÉ ═════════════════════════════════════════════
/* Le rangement par entreprise est la demande d'avant, et elle tient toujours : la boîte
   l'encadre, elle ne le remplace pas. */
{
  v('les entreprises se rangent toujours', /function courrierParEnt\(\)/.test(TOUR), true);
  /* Le groupage par entreprise tient toujours — la boîte et le filtre l'encadrent, ils ne le
     remplacent pas. La forme a changé (les groupes passent par un filtre de catégorie), donc
     on vise ce qui compte : on part bien de courrierParEnt, pas d'une liste à plat. */
  v('…et la vue « toutes » reste groupée, jamais à plat', /var gr=courrierParEnt\(\)\.map\(function\(g\)\{/.test(TOUR), true);
  v('les cinq catégories sont intactes', (TOUR.match(/\{cle:'(tout|traiter|marques|pieces|envoyes)'/g) || []).length, 5);
  v('la Tour ne parle toujours qu’à ses propres routes', /\/api\/monitor\/mail\/liste/.test(TOUR), true);
}

console.log('\n' + ok + ' ✓  ' + ko + ' ✗'); process.exit(ko ? 1 : 0);
