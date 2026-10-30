/* LA CONNAISSANCE DE L'OFFRE (23 octobre 2026) — UN texte de référence que Léa et Camille reçoivent dans leur `system`.
 *
 * Justin : « quand on reçoit des mails comme ça, il faut que les agents répondent en fonction de l'entreprise ; prendre contact avec
 * le client, lui expliquer comment on fonctionne, ce qu'on peut faire pour lui […] sans exploser son budget, à des prix très
 * corrects — c'est là qu'on fait la différence avec la concurrence ; la semaine d'essai, on la propose APRÈS son retour, pas tout
 * de suite ; le but c'est de vendre l'application. »
 *
 * ⛔ UNIQUEMENT des faits vrais, déjà vérifiés. Un agent commercial qui promet une fonction absente fait signer un client pour un
 *    produit qui n'existe pas : c'est la faute la plus coûteuse de ce chantier, et c'est pourquoi la liste est ICI, en un seul
 *    exemplaire, relue par le banc (`test-2862` § 0), plutôt que recopiée dans deux prompts qui divergeraient.
 * ⛔ Une demande métier qui n'est pas dans la liste ne devient JAMAIS « une fonction qu'on a » : elle se présente comme « une
 *    catégorie qu'on peut créer pour vous ». Aucun autre prix, aucune date, aucune remise, aucun engagement juridique.
 * Ajouter un fait ici est un geste conscient : il doit être vrai AUJOURD'HUI dans l'application publiée ou sur teamop.fr.
 * ⛔ UNE SEULE exception, BORNÉE : le bloc « BIENTÔT » (Justin, 27 octobre 2026 : « on peut dire aux clients qu'on peut les aider aussi à refaire leur site ou alors en
 *    créer s'ils n'en ont pas ; c'est une fonctionnalité qui va arriver bientôt »). Ce qui n'est pas ouvert se dit AU FUTUR, sans prix, sans date, sans contenu promis —
 *    et `refusDe` continue de refuser un délai (« d'ici un mois ») ou une promesse (« offert ») écrits autour. Un service ouvert sort de ce bloc pour la liste.
 */
'use strict';

const OFFRE = [
  'TeamOP édite deux applications : OP GESTION (la gestion des interventions des entreprises de terrain) et OP MESSAGES (une messagerie, bientôt disponible).',
  '',
  'CE QU’OP GESTION FAIT (et rien d’autre que cette liste) :',
  '- Fonctionne sur ordinateur, tablette et téléphone, depuis le navigateur, sans installation (sur téléphone, elle s’ajoute à l’écran d’accueil).',
  '- Toute l’équipe travaille sur des informations à jour en temps réel.',
  '- Planning des techniciens par jour, semaine ou mois, avec glisser-déposer ; les conflits et les absences sont signalés.',
  '- Suivi des interventions : planifiée, en cours, terminée.',
  '- Fiche d’intervention sur téléphone : liste de contrôle, photos avant et après, signature du client et du technicien, rapport PDF envoyé au client.',
  '- Contrats d’entretien : échéances, passage suivant créé en un clic, rappel avant l’échéance, historique par client et par site.',
  '- Fiches clients et sites.',
  '- Devis : un devis accepté se transforme en facture en un clic, envoi par e-mail, suivi des factures envoyées, payées ou en retard.',
  '- Stock et commandes fournisseurs.',
  '- Pointage des heures.',
  '- Droits réglés personne par personne.',
  '',
  'NOS COURRIELS :',
  '- Ils partent de l’adresse écrite dans la signature. Une personne qui ne les reçoit pas, ou qui les trouve dans les indésirables (le spam), regarde dans ce dossier, marque le message « non-spam » (« pas un courrier indésirable » dans Outlook) et enregistre l’adresse de la signature dans ses contacts : les suivants arrivent alors normalement dans sa boîte de réception (rien n’est garanti : chaque messagerie trie à sa façon). Tu écris « l’adresse indiquée dans notre signature », jamais l’adresse elle-même (elle dépend de la boîte qui envoie, et la signature la porte déjà).',
  '',
  'NOTRE DIFFÉRENCE :',
  '- Une formule sur mesure : les catégories dont l’entreprise n’a pas besoin sont retirées, et elles ne sont pas facturées.',
  '- Des catégories peuvent être améliorées, ou créées pour les besoins de l’entreprise, et elles lui sont réservées (confidentielles).',
  '- Des tarifs maîtrisés : à partir de 15 € par mois et par utilisateur (TVA non applicable).',
  '- Sans engagement de durée : l’abonnement se résilie à tout moment, depuis le Support de l’espace client ou en écrivant à contact@teamop.fr, et l’accès se poursuit jusqu’à la fin de la période réglée. (Seule cette formule exacte, « sans engagement de durée », est permise.)',
  '',
  'BIENTÔT — UN SERVICE QUI N’EST PAS ENCORE OUVERT, À DIRE COMME TEL :',
  '- TeamOP pourra bientôt aider les entreprises à refaire leur site internet, ou à en créer un si elles n’en ont pas. Tu le dis en UNE phrase, au futur, comme un service « bientôt disponible » : sans prix, sans date, sans délai, sans rien annoncer de ce qu’il contiendra. Tu ne l’évoques que lorsqu’il sert ce client-là (il n’a pas de site, le sien semble ancien, ou il en parle) ; s’il est intéressé, tu dis que nous reviendrons vers lui à son ouverture.',
  '',
  'LIMITES, À RESPECTER À LA LETTRE :',
  '- Tu ne présentes comme existante AUCUNE fonction absente de la liste ci-dessus. Un besoin propre au métier du client qui n’y figure pas (par exemple le suivi des fluides frigorigènes d’un climaticien) se présente comme « une catégorie que nous pouvons créer pour vous », jamais comme une fonction déjà disponible.',
  '- Quand tu décris une fonction, tu reprends les MOTS de la ligne ci-dessus : un synonyme est permis, une qualité de plus non. Tu n’écris pas « automatiquement » ni « automatique » pour un envoi ou un rappel dont la liste ne dit pas qu’il l’est (« rapport PDF envoyé au client » ne devient pas « rapport envoyé automatiquement »), ni « centralisé », « instantané » ou « complet » là où la liste ne les dit pas.',
  '- Tu ne donnes aucun autre prix que « à partir de 15 € par mois et par utilisateur (TVA non applicable) », aucune date, aucune remise, aucune promesse de délai, aucun engagement juridique autre que « sans engagement de durée », aucun remboursement.',
  '- La période d’essai d’une semaine se propose APRÈS le retour du client, jamais dans le premier message : tu la présentes comme une possibilité « ensuite », sans la promettre.',
  '- Tu n’écris jamais les mots « gratuit », « offert », « remise », « réduction », « illimité », « garanti », « remboursé », ni « sans engagement » seul : ce sont des promesses commerciales que personne n’a faites (« sans engagement de durée » est un fait, voir ci-dessus). Tu n’écris aucun nom de site ou d’adresse web autre que « teamop.fr ».',
].join('\n');

/* LES TROIS FORMULES D'OP GESTION (23 octobre 2026) — recopiées des conditions particulières VALIDÉES (`server/contrats-textes/cp_op_gestion_*.txt`) et de `tarifs.html` ; rien des
   « À CONFIRMER » de ces textes n'y entre (périmètre de la création sur mesure, délai du support prioritaire, disponibilité 24 h/24 : aucun engagement). Chloé en tire sa
   proposition ; le SEUL endroit où paraissent 25 € et 50 € : `refusDe` les permet à son profil « proposition » et à lui seul. */
const FORMULES = {
  pro: { nom: 'OP GESTION Pro', prix: 15, inclus: ['planning des interventions (jour, semaine, mois)', 'fiches clients et historique des passages', 'rapports d’intervention avec photos, signatures et envoi en PDF',
    'tournées du jour avec carte et ordre optimisé', 'récurrences (contrats) et passages multiples', 'conflits de planning et absences signalés', 'devis et factures', 'pointage des heures',
    'exports CSV et notifications', 'application web et mobile (iPhone, Android, Mac, PC)'] },
  business: { nom: 'OP GESTION Business', prix: 25, inclus: ['tout OP GESTION Pro', 'stock avec inventaire et seuils d’alerte', 'bons de commande fournisseurs en PDF, envoyés en un clic', 'commande suggérée, la réception crédite le stock',
    'boîte mail intégrée, rattachée aux bons', 'télécollecte et comptabilité', 'droits utilisateur fins', 'logo de l’entreprise dans l’application', 'assistance par courriel avec traitement prioritaire'] },
  premium: { nom: 'OP GESTION Business Premium', prix: 50, inclus: ['tout OP GESTION Business', 'toutes les fonctions d’OP GESTION pour le métier de l’entreprise', 'logo et couleur de l’entreprise pour toute l’équipe',
    'OP MESSAGES inclus à son ouverture', 'accompagnement à la mise en route et assistance prioritaire'] },
};
const PRIX_FORMULES = Object.values(FORMULES).map(f => f.prix);
const blocFormules = () => ['LES FORMULES D’OP GESTION (prix par mois et par utilisateur, TVA non applicable, sans engagement de durée) — et rien d’autre :'].concat(
  Object.entries(FORMULES).map(([id, f]) => '- ' + f.nom + ' (' + id + ') : ' + f.prix + ' € ; comprend ' + f.inclus.join(' ; ') + '.')).join('\n');

/* La FORME du courriel, la même pour les deux. Ce que Justin a validé : professionnel, voix de l'entreprise, vouvoiement. */
const FORME = [
  'FORME DU COURRIEL :',
  '- Un courriel professionnel, écrit au nom de l’entreprise TeamOP (« nous »), en français, au vouvoiement.',
  '- Il commence par « Bonjour, » (jamais un prénom ni un nom : tu n’en connais pas) et finit par « Bien cordialement, ».',
  '- Structuré en courts paragraphes séparés par une ligne vide ; une liste numérotée simple (1., 2., 3.) pour les questions, et pour elles seules (une liste d’avantages s’écrit en tirets « - »).',
  '- Texte brut : ni Markdown (pas d’astérisques, pas de dièses), ni titres en capitales, ni émoji, ni lien, ni adresse électronique, ni numéro de téléphone.',
  '- Tu n’écris PAS de signature : le serveur l’ajoute après « Bien cordialement, ».',
  '- Le premier paragraphe montre qu’on a lu la situation de la personne (son activité, sa question) : pas de formule d’ouverture qui irait à n’importe qui.',
  '- Un paragraphe porte une idée. Le courriel se termine par UNE seule demande claire (ce qu’on attend de la personne), jamais deux.',
  '- Aucune formule creuse : tu n’écris jamais « n’hésitez pas à… » ; tu dis précisément ce que la personne peut faire (« répondez simplement à ce message avec… »).',
].join('\n');

/* Les bornes du texte rendu par Claude : un brouillon trop court n'est pas un courriel, un trop long n'est pas lu. */
const OBJET_MAX = 200;
const CORPS_MIN = 80;
const CORPS_MAX = 8000;

/* ── Ce qui part chez Claude, et ce qui en revient ───────────────────────────────────────────────────────────────────────────────
   `sansAdresses` / `sansTel` : une adresse ou un numéro de téléphone ne part JAMAIS chez Claude (la règle de `sous-traitance.html`).
   ⛔ PAS le `sansAdresses` du serveur : il garde l'initiale et le DOMAINE (« j***@entreprise.fr »), très bien pour un journal que Justin lit, pas
   pour ce qui part chez Anthropic — le domaine d'un client EST un nom de client. Ici, tout devient « (adresse) ».
   Les numéros : neuf chiffres au moins (une date ou un numéro de dossier ne sont pas des téléphones), séparés par des espaces — insécables
   compris —, des points, des tirets ou des parenthèses : « 06 12 34 56 78 », « +33 6 12 34 56 78 », « 06.12.34.56.78 », « 0612345678 ». */
const ADRESSE = /[^\s<>"'(),;:[\]]+@[^\s<>"'(),;:[\]]+/g;
const TEL = /\+?\d[\d    .\-()]{6,}\d/g;
const sansAdresses = t => String(t || '').replace(ADRESSE, '(adresse)');
const sansTel = t => String(t || '').replace(TEL, m => (m.replace(/\D/g, '').length >= 9 ? '(numéro)' : m));
/* ── Le texte libre d'un INCIDENT, avant qu'il parte chez Anthropic (23 octobre 2026) ────────────────────────────────────────────────
   « Expliquer la cause » et « Proposer un correctif » (la Tour) envoient le message d'erreur, la trace et la source d'un incident. Ces champs
   arrivent par /api/monitor/report, une route PUBLIQUE sans preuve : une erreur peut citer ce qu'un client avait saisi (« adresse invalide :
   jean@… », un numéro dans une URL). La Tour GARDE l'original pour Justin ; seul ce qui part chez Anthropic passe ici — UNE définition, celle des
   courriels reçus (`sansAdresses`, `sansTel`), plus ce que le texte d'un incident ajoute :
   · NFKC d'abord : « ＠ » et les chiffres pleine chasse (« ０６… ») ne sont plus des échappatoires ;
   · une arobase ENCODÉE (« %40 » d'une adresse web, « @ » écrit en toutes lettres, « &#64; ») redevient « @ » avant le filtre — la trace d'un
     `fetch` cite des URL ;
   · `coupe` : le texte a été COUPÉ à une longueur fixe (message 300, trace 600, source 200) — une adresse peut finir sur « jean.dupont@ » et un
     numéro sur « 06 98 76 5 » (moins de neuf chiffres, donc laissé par `sansTel`) : le bout est masqué lui aussi. Une adresse coupée AVANT son
     « @ » (« jean.dup ») ne se reconnaît pas : rien à faire, et rien d'identifiable non plus.
   ⛔ Pas pour du CODE : une ligne qui finit par des chiffres ne doit pas être masquée (ni `coupe`). Le code du dépôt est servi publiquement et ne
   cite aucun client ; l'extrait de « Proposer » reste donc tel quel, parce que le modèle doit en recopier un fragment au caractère près. */
const AROBASE_ENCODEE = /%40|\\u0040|&#0*64;|&#x0*40;|&commat;/gi;
/* Un IBAN dont le BBAN porte des lettres (« GB29 NWBK 6016 1331 9268 19 ») que `sansTel` ne voit pas ; un numéro écrit « 06/98/76/54/32 »
   (la barre oblique n'est pas un séparateur de `TEL`, qui laisserait passer ce numéro tel quel). */
const IBAN = /\b[A-Z]{2}\d{2}(?: ?[A-Z0-9]{4}){2,7}(?: ?[A-Z0-9]{1,3})?\b/g;
const TEL_BARRES = /\d[\d/]{7,}\d/g;
/* Un numéro écrit DANS une URL : l'espace y devient « %20 » ou « + », le « + » international « %2B » (la trace d'un `fetch` cite l'adresse
   appelée, donc ce qu'elle porte en paramètre). `TEL` n'admet que l'espace lui-même, le point, le tiret et les parenthèses : « tel=06%2098%2076
   %2054%2032 » traversait. On reconnaît la FORME encodée, on compte les chiffres sans les chiffres des « %20 » eux-mêmes, et on ne masque qu'à
   neuf chiffres — « a+b » ou « 3+4 » restent ce qu'ils sont. */
const TEL_URL = /(?:%2B|\+)?\d(?:[\d.\-]|%20|%2D|%C2%A0|%2B|\+){6,}\d/gi;
/* « 06_98_76_54_32 » et « 06,98,76,54,32 » : cinq paires, la première commençant par 0 — la forme d'un numéro français, pas celle d'une liste de
   nombres (« 1,2,3,4,5,6,7,8,9 » dans une trace n'est pas un téléphone). */
const TEL_PAIRES = /\b0\d(?:[_,]\d\d){4}\b/g;
function pourAnthropic(t, opts) {
  let s = String(t == null ? '' : t);
  try { s = s.normalize('NFKC'); } catch (e) {}
  s = s.replace(AROBASE_ENCODEE, '@').replace(IBAN, '(IBAN)');
  /* Une adresse dans une URL (« …/app.html?mail=jean@x.fr&t=1 ») : `ADRESSE` accepte « / ? = & » dans ses deux moitiés et avalerait le chemin avant
     elle et la suite après — la trace perdrait le fichier qu'elle désigne. On coupe aux séparateurs d'URL qui touchent l'arobase, de part et d'autre. */
  s = s.replace(/([?&=#/])(?=[^\s?&=#/@]+@)/g, '$1 ').replace(/(@[^\s?&#/]+)(?=[?&#/])/g, '$1 ');
  s = s.replace(TEL_URL, m => (m.replace(/%[0-9A-F]{2}/gi, '').replace(/\D/g, '').length >= 9 ? '(numéro)' : m)).replace(TEL_PAIRES, '(numéro)');
  s = sansTel(sansAdresses(s)).replace(TEL_BARRES, m => (m.replace(/\D/g, '').length >= 9 ? '(numéro)' : m));
  if (opts && opts.coupe) {
    s = s.replace(/[^\s<>"'(),;:[\]]+@$/, '(adresse)');
    s = s.replace(/\+?\d[\d \u00a0\u202f\u2009.\-()]{4,}$/, m => (m.replace(/\D/g, '').length >= 6 ? '(numéro)' : m));
  }
  return s;
}
/* Une donnée venue de l'extérieur, présentée à Claude ENTRE DÉLIMITEURS : elle ne peut pas les contenir (on les remplace), donc elle ne
   peut pas « fermer » le bloc et faire passer la suite pour une consigne. */
const delimiter = t => String(t || '').replace(/[<>]{3,}/g, ' ').replace(/[<>]/g, ' ');

/* Lire la réponse de Claude : « IGNORER » en première ligne, ou « Objet : … » puis le corps. Rien d'autre n'est un courriel. */
function lireMail(brut) {
  const t = String(brut || '').replace(/\r/g, '').trim();
  if (!t) return null;
  const premiere = t.split('\n')[0].trim();
  if (/^IGNORER\b/i.test(premiere)) return { ignorer: true };
  const m = /^Objet\s*:[ \t]*([^\n]*)\n+([\s\S]+)$/i.exec(t);
  if (!m) return null;
  return { objet: m[1].trim(), corps: m[2].trim() };
}

/* Les mots d'une PROMESSE que personne n'a faite (« trois mois gratuits », « formule illimitée », « sans engagement »). Cherchés sur le texte sans accents ni
   majuscules, au début des mots (« garanti » attrape garantie, garantissons). Pas « offre » seul : c'est le nom de notre offre, et le mot revient partout. */
const PROMESSES = /\b(?:gratuit|offert|offre\s+(?:speciale|exclusive)|offrons|offrirons|remise|rabais|reduction|promotion|illimite|garanti|garantissons|rembours|satisfait\s+ou|sans\s+engagement|sans\s+frais|sans\s+surcout|a\s+vie\b|geste\s+commercial|dedommag|indemni|compensation|compenser|a\s+titre\s+gracieux|gracieusement|prise\s+en\s+charge\s+(?:de|des|d)\s*(?:'|\s)?\s*frais|cadeau|bonus|avoir\s+offert)/;
/* UN DÉLAI promis (relecture du 23 octobre 2026) : « sous 24 heures », « demain matin », « d'ici vendredi », « dans les deux jours »… L'offre ne promet AUCUN délai (`OFFRE`), et un client qui lit
   « un technicien vous rappelle sous 24 heures » attend ce rappel. « Rapidement » n'est pas un délai ; « d'une semaine » (l'essai) non plus : seuls sont visés « sous / dans / d'ici / avant » suivis
   d'une durée ou d'un jour, et les mots du lendemain. Cherché sur le texte sans accents. */
const DELAI = /\b(?:(?:sous|dans|d['’]ici|avant)\s+(?:(?:les|la|le|l['’])\s*)?(?:\d+|un|une|deux|trois|quatre|cinq|six|sept|huit|neuf|dix|douze|quinze|vingt|trente|quelques|plusieurs)?\s*(?:h\b|heures?|minutes?|jours?|journees?|semaines?|mois|lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche|fin\s+de\s+(?:semaine|mois|journee))|demain|apres-demain|ce\s+soir|cet\s+apres-midi|aujourd['’]hui\s+meme|immediatement|au\s+plus\s+tard)/;
const sansAccents = t => String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
/* Un NOM DE DOMAINE nu (« teamop-paiement.example/pay », « bit.ly/3xYz ») : des étiquettes séparées par des points, une extension de lettres MINUSCULES (« fin.Merci » n'en est pas un). Seule abréviation
   française qui en a la forme : « p.ex » (écartée par son nom, `ABREVIATIONS`). Les extensions de fichier courantes ne comptent pas comme des sites. */
const DOMAINE = /(?<![A-Za-z0-9@.-])((?:[A-Za-z0-9][A-Za-z0-9-]{0,62}\.)+[a-z]{2,24})(?![A-Za-z0-9-])/g;
const ABREVIATIONS = new Set(['p.ex']);
const FICHIERS = new Set(['pdf', 'doc', 'docx', 'xls', 'xlsx', 'png', 'jpg', 'jpeg', 'gif', 'txt', 'zip', 'csv']);

/* Un nombre écrit en lettres, de zéro à 9 999 (« vingt-cinq » → 25, « quatre-vingt-dix » → 90, « deux cents » → 200, « mille cinq cents » → 1 500). `null` si les mots qui précèdent « euros » ne forment
   pas un nombre COMPLET (« les euros » n'est pas un montant). Lu sur le texte sans accents. */
function montantEnLettres(mots) {
  const U = { zero: 0, un: 1, une: 1, deux: 2, trois: 3, quatre: 4, cinq: 5, six: 6, sept: 7, huit: 8, neuf: 9, dix: 10, onze: 11, douze: 12, treize: 13, quatorze: 14, quinze: 15, seize: 16,
    vingt: 20, trente: 30, quarante: 40, cinquante: 50, soixante: 60 };
  const w = String(mots || '').split(/[\s-]+/).filter(Boolean);
  // on garde la plus longue FIN de phrase faite uniquement de mots-nombres
  let k = w.length; while (k > 0 && (w[k - 1] in U || ['et', 'cent', 'cents', 'mille'].includes(w[k - 1]))) k--;
  const nb = w.slice(k).filter(x => x !== 'et');
  if (!nb.length) return null;
  let total = 0, cours = 0;
  for (const x of nb) {
    if (x === 'cent' || x === 'cents') cours = (cours || 1) * 100;
    else if (x === 'mille') { total += (cours || 1) * 1000; cours = 0; }
    else if (x in U) cours += U[x];
  }
  // « quatre-vingt » : quatre × vingt
  const txt = nb.join(' ');
  if (/quatre vingts?/.test(txt)) { const r = txt.replace(/quatre vingts?/, 'X').split(' '); let c2 = 0, t2 = 0; for (const x of r) { if (x === 'X') c2 += 80; else if (x === 'cent' || x === 'cents') c2 = (c2 || 1) * 100; else if (x === 'mille') { t2 += (c2 || 1) * 1000; c2 = 0; } else if (x in U) c2 += U[x]; } return t2 + c2; }
  return total + cours;
}

/* Ce que Claude écrit se vérifie avant d'être rangé : un texte venu d'un courriel hostile ne doit pas pouvoir y glisser un lien de
   paiement ou une adresse d'ailleurs. Seuls le site de TeamOP et ses adresses passent ; aucun numéro de téléphone (Claude n'en a reçu aucun,
   donc tout numéro est inventé). Rend `''` si le texte est sain, sinon la raison — pour le journal, jamais le texte. */
function refusDe(objet, corps, opts) {
  /* `opts.prix` : les montants permis, en euros (15 par défaut ; 15, 25 et 50 pour une proposition de formule — `PRIX_FORMULES`). */
  const prixOk = opts && Array.isArray(opts.prix) && opts.prix.length ? opts.prix : [15];
  const o = String(objet || ''), c = String(corps || '');
  if (o.length < 3 || o.length > OBJET_MAX || /[\r\n]/.test(o)) return 'objet hors bornes';
  if (c.length < CORPS_MIN || c.length > CORPS_MAX) return 'texte hors bornes';
  const tout = o + '\n' + c;
  for (const m of tout.matchAll(/[^\s<>"'(),;:[\]]+@([^\s<>"'(),;:[\]]+)/g)) if (!/(^|\.)teamop\.fr\.?$/i.test(m[1])) return 'adresse étrangère';
  if (/@/.test(tout.replace(/[^\s<>"'(),;:[\]]+@[^\s<>"'(),;:[\]]+/g, ''))) return 'adresse étrangère';
  for (const m of tout.matchAll(/(?:https?:\/\/|www\.)([^\s/?#)>"']+)/gi)) if (!/(^|\.)teamop\.fr$/i.test(m[1].replace(/^www\./i, '').replace(/:\d+$/, ''))) return 'lien étranger';
  /* un domaine SANS « http » ni « www » est un lien aussi (le client clique, ou son courriel en fait un lien) : seul teamop.fr passe */
  for (const m of tout.matchAll(DOMAINE)) {
    const d = m[1].toLowerCase();
    if (/(^|\.)teamop\.fr$/.test(d) || ABREVIATIONS.has(d) || FICHIERS.has(d.split('.').pop())) continue;
    return 'lien étranger';
  }
  /* « sans engagement de durée » est un FAIT (tarifs.html, CGV art. 6) : seule cette formule exacte est permise, « sans engagement » seul reste une promesse refusée. */
  if (PROMESSES.test(sansAccents(tout).replace(/sans\s+engagement\s+de\s+duree/g, ' '))) return 'promesse commerciale';
  if (DELAI.test(sansAccents(tout))) return 'délai promis';
  for (const m of tout.matchAll(TEL)) if (m[0].replace(/\D/g, '').length >= 9) return 'numéro de téléphone';
  /* Le SEUL prix permis est « 15 € » (le plancher de l'offre) : tout autre montant en euros est une promesse que personne n'a faite. Et un
     pourcentage est une remise. ⚠️ On lit le NOMBRE, pas le mot : « 150 € » contient « 15 » — une comparaison de texte le laisserait passer. */
  for (const m of tout.matchAll(/(\d[\d  .,]*)\s*(?:€|euros?\b|eur\b)/gi)) if (!prixOk.includes(parseFloat(m[1].replace(/[^\d.,]/g, '').replace(',', '.')))) return 'prix étranger';
  /* un montant dans une AUTRE devise (« 9,99 $ », « £ 12 », « 20 dollars », « 30 CHF ») n'est jamais un prix de l'offre ; et un montant ÉCRIT EN LETTRES (« dix euros », « vingt-cinq euros ») se lit
     comme un chiffre (« quinze euros » = 15 passe, comme « 15 € »). */
  if (/\d\s*(?:\$|£|usd\b|gbp\b|chf\b|dollars?\b|livres?\s+sterling|francs?\b)|[$£]\s*\d/i.test(tout)) return 'prix étranger';
  for (const m of sansAccents(tout).matchAll(/((?:[a-z]+[\s-]+){0,5}[a-z]+)\s+euros?\b/g)) { const v = montantEnLettres(m[1]); if (v !== null && !prixOk.includes(v)) return 'prix étranger'; }
  if (/\d\s*%|pour\s?cent/i.test(tout)) return 'pourcentage';
  return '';
}

/* Remettre un corps d'aplomb sans en changer le sens : pas de Markdown (Claude en glisse malgré la consigne), « Bonjour, » en tête et « Bien
   cordialement, » en queue — la forme que Justin a validée. La signature, elle, n'est JAMAIS ajoutée ici : c'est le serveur d'envoi qui la pose. */
function normaliserCorps(corps) {
  let t = String(corps || '').replace(/\r/g, '').replace(/\*\*|__/g, '').replace(/^[ \t]*#{1,6}[ \t]+/gm, '').replace(/^[ \t]*[*•][ \t]+/gm, '- ').trim();
  if (!/^Bonjour\b/i.test(t)) t = 'Bonjour,\n\n' + t;
  if (!/Bien cordialement,?\s*$/i.test(t)) t = t.replace(/\s*$/, '') + '\n\nBien cordialement,';
  return t.replace(/\n{3,}/g, '\n\n');
}

module.exports = { montantEnLettres, DELAI, PROMESSES, OFFRE, FORMULES, PRIX_FORMULES, blocFormules, FORME, OBJET_MAX, CORPS_MIN, CORPS_MAX, ADRESSE, TEL, sansAdresses, sansTel, pourAnthropic, delimiter, lireMail, refusDe, normaliserCorps };
