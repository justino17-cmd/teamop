/* ⛔ CE QUE CE FICHIER GARDE — LE PLAN DE NUMÉROTATION ET LA TABLE DE PRIX DES SMS, MODULES SEULS (famille 2 de SERVEUR.md § 3.11).

   `server-msg/numero.js` et `server-msg/sms-prix.js`, purs : aucun service, aucun réseau. Justin, 1er octobre 2026 : « je veux une
   connexion pour TOUS les pays » et « le but c'est qu'on gagne de l'argent ». Deux conséquences que ce banc tient :

     · AUCUNE LISTE BLANCHE DE PAYS — tout indicatif existant est reconnu, un numéro mobile valide du monde est accepté (belge,
       réunionnais, américain, indien, japonais, brésilien, nigérian, australien…) ; on le démontre en PARCOURANT tous les indicatifs
       de la table, pas en en citant quelques-uns ;
     · MAIS SEULS LES MOBILES ORDINAIRES REÇOIVENT UN SMS : un fixe, un surtaxé, un « premium », un satellite, un numéro gratuit
       mondial, une plage de la liste de configuration — refusés AVANT tout envoi (donc avant tout coût). France : 06 et 07 seulement.
     · UN PRIX PAR PAYS, prudent : un pays absent de la table coûte le pire connu, un prix écrit en configuration est pris tel quel.

   ⛔ UNE ASSERTION SUR UN ENSEMBLE VIDE PASSE ET NE PROUVE RIEN : chaque parcours compte sa population d'abord. */
const path = require('path');
const T = require('./outils-msg');
const { v, vrai, fin } = T.compteur();
const N = require(path.join(T.SERVICE, 'numero.js'));
const P = require(path.join(T.SERVICE, 'sms-prix.js'));

const ok = (brut, extra) => { const r = N.analyser(brut, extra); return r.ok ? { e164: r.e164, pays: r.pays, mobile: r.mobile } : { refus: r.raison }; };

console.log('\n── 912 · la normalisation E.164 ──');
v('un numéro français écrit à la française avec indicatif', ok('+33 6 12 34 56 78'), { e164: '+33612345678', pays: 'FR', mobile: true });
v('« 00 » vaut « + »', ok('0033612345678'), { e164: '+33612345678', pays: 'FR', mobile: true });
v('le zéro de ligne entre parenthèses se retire (« +33 (0)6… »)', ok('+33 (0)6 12 34 56 78'), { e164: '+33612345678', pays: 'FR', mobile: true });
v('le zéro de ligne tapé quand même (« +33 06… ») se retire s\'il fait tomber juste', ok('+33 06 12 34 56 78'), { e164: '+33612345678', pays: 'FR', mobile: true });
v('points, tirets et espaces insécables normalisés', ok('+33.6-12-34-56-78'), { e164: '+33612345678', pays: 'FR', mobile: true });
v('⛔ un numéro SANS indicatif n\'est pas deviné (« 06 12 34 56 78 » : le pays ne se devine pas à la langue du navigateur)', ok('06 12 34 56 78'), { refus: 'format' });
v('un texte qui n\'est pas un numéro', ok('appelle-moi'), { refus: 'format' });
v('trop court', ok('+33 6'), { refus: 'format' });
v('trop long (plus de 15 chiffres)', ok('+3361234567812345678'), { refus: 'format' });
v('un nombre, un objet, un tableau, rien : jamais une exception', [ok(33612345678), ok({}), ok([]), ok(null), ok(undefined)], Array(5).fill({ refus: 'format' }));
v('une chaîne de plus de 40 caractères', ok('+' + '3'.repeat(41)), { refus: 'format' });

console.log('\n── 912 · des mobiles de TOUT le monde sont acceptés ──');
const MOBILES = {
  FR: '+33612345678', BE: '+32470123456', RE: '+262692123456', YT: '+262639123456', GP: '+590690123456', MQ: '+596696123456',
  US: '+12125551234', CA: '+14165551234', IN: '+919876543210', JP: '+819012345678', BR: '+5511912345678', NG: '+2348012345678',
  AU: '+61412345678', GB: '+447912345678', DE: '+4915123456789', ES: '+34612345678', IT: '+393123456789', MA: '+212612345678',
  DZ: '+213551234567', TN: '+21620123456', SN: '+221771234567', CI: '+2250712345678', CM: '+237612345678', ZA: '+27821234567',
  EG: '+201012345678', TR: '+905321234567', SA: '+966512345678', AE: '+971501234567', IL: '+972501234567', CN: '+8613812345678',
  KR: '+821012345678', ID: '+6281234567890', PH: '+639171234567', VN: '+84912345678', TH: '+66812345678', PK: '+923001234567',
  BD: '+8801712345678', MX: '+525512345678', AR: '+5491123456789', CO: '+573012345678', CL: '+56912345678', PE: '+51912345678',
  PL: '+48501234567', UA: '+380501234567', RU: '+79123456789', KZ: '+77012345678', CH: '+41791234567', NL: '+31612345678', PT: '+351912345678',
  PF: '+68987123456', NC: '+687751234', PR: '+17875551234', DO: '+18095551234', JM: '+18765551234',
};
let nb = 0, bons = 0;
for (const [pays, num] of Object.entries(MOBILES)) { nb++; const r = N.analyser(num); if (r.ok && r.pays === pays) bons++; else console.log('     ⚠ ' + pays + ' : ' + JSON.stringify(r)); }
vrai('la population est large (' + nb + ' pays, des cinq continents)', nb >= 50);
v('⛔ chacun est accepté ET attribué au bon pays', bons, nb);
v('la Réunion n\'est pas la France (un tarif et un budget à elle)', [N.analyser('+262692123456').pays, N.analyser('+33692123456').pays], ['RE', 'FR']);
v('un numéro belge saisi avec son zéro de ligne (« +32 0470… »)', ok('+32 0470 12 34 56'), { e164: '+32470123456', pays: 'BE', mobile: true });

console.log('\n── 912 · AUCUNE liste blanche : tous les indicatifs connus sont RECONNUS (le refus d\'un indicatif n\'est jamais « pays inconnu ») ──');
{
  const tous = N.indicatifsConnus();
  vrai('la population : plus de 150 indicatifs (' + tous.length + ')', tous.length > 150);
  const inconnus = tous.filter(cc => { const r = N.analyser('+' + cc + '1234567890'); return !r.ok && r.raison === 'pays'; });
  v('⛔ aucun indicatif de la table n\'est refusé comme « pays inconnu »', inconnus, []);
  const lenient = tous.filter(cc => !['1', '7'].includes(cc)).filter(cc => { for (let l = 4; l <= 13; l++) if (N.analyser('+' + cc + '5'.repeat(l)).ok) return true; return false; });
  vrai('et les pays qui ne distinguent pas mobile et fixe acceptent un numéro bien formé (' + lenient.length + ' pays « non vérifiables » : mieux vaut un SMS de trop, borné par le budget, qu\'un client refusé)', lenient.length > 40);
  v('un indicatif qui n\'existe pas est refusé « pays »', [ok('+999 1234567890'), ok('+210 123456789')].map(x => x.refus), ['pays', 'pays']);
}

console.log('\n── 912 · les numéros qui ne reçoivent JAMAIS de SMS ──');
const REFUS = [
  ['France, fixe 01', '+33112345678', 'non_mobile'], ['France, fixe 04', '+33412345678', 'non_mobile'], ['France, fixe 05', '+33512345678', 'non_mobile'],
  ['⛔ France, 08 (surtaxé / spécial)', '+33812345678', 'non_mobile'], ['⛔ France, 08 « 0899 »', '+33899123456', 'non_mobile'], ['⛔ France, 09 (voix sur IP)', '+33912345678', 'non_mobile'],
  ['⛔ France, 0800 (gratuit)', '+33800123456', 'non_mobile'], ['France, écrit à la française 08', '0033 8 12 34 56 78', 'non_mobile'],
  ['Royaume-Uni, 09 (surtaxé)', '+449012345678', 'non_mobile'], ['Royaume-Uni, fixe 020', '+442012345678', 'non_mobile'],
  ['Allemagne, fixe (030)', '+493012345678', 'non_mobile'], ['Allemagne, 0900 surtaxé', '+499001234567', 'non_mobile'],
  ['Belgique, fixe (02)', '+3221234567', 'non_mobile'], ['Italie, fixe (06)', '+390612345678', 'non_mobile'], ['Espagne, 905 surtaxé', '+34905123456', 'non_mobile'],
  ['⛔ États-Unis, 900 (surtaxé)', '+19005551234', 'non_mobile'], ['⛔ États-Unis, 976 (surtaxé)', '+19765551234', 'non_mobile'],
  ['États-Unis, 800 (gratuit)', '+18005551234', 'non_mobile'], ['États-Unis, 888 (gratuit)', '+18885551234', 'non_mobile'], ['États-Unis, 500 (communications personnelles)', '+15005551234', 'non_mobile'],
  ['États-Unis, 700', '+17005551234', 'non_mobile'],
  ['⛔ numéro gratuit mondial (+800)', '+80012345678', 'interdit'], ['⛔ coût partagé mondial (+808)', '+80812345678', 'interdit'],
  ['⛔ satellite (+870)', '+870123456789', 'interdit'], ['⛔ satellite (+881)', '+881123456789', 'interdit'], ['⛔ réseaux internationaux (+882)', '+882123456789', 'interdit'],
  ['⛔ réseaux internationaux (+883)', '+883123456789', 'interdit'], ['⛔ surtaxé mondial (+979)', '+979123456789', 'interdit'], ['communications personnelles (+878)', '+878123456789', 'interdit'],
  ['Inde, numéro qui commence par 5', '+915876543210', 'non_mobile'], ['Japon, fixe (03)', '+81312345678', null], ['Chine, fixe', '+862112345678', null],
];
{
  vrai('la population des refus : ' + REFUS.length + ' cas', REFUS.length >= 30);
  for (const [nom, num, raison] of REFUS) { if (raison) v(nom + ' → refusé (' + raison + ')', ok(num), { refus: raison }); else vrai(nom + ' → refusé (quelle qu\'en soit la raison : longueur ou non-mobile)', ok(num).refus); }
  v('⛔ la France entière : 01 à 05, 08 et 09 refusés ; 06 et 07 acceptés', ['1', '2', '3', '4', '5', '8', '9'].map(c => ok('+33' + c + '12345678').refus).concat(['6', '7'].map(c => ok('+33' + c + '12345678').e164)),
    Array(7).fill('non_mobile').concat(['+33612345678', '+33712345678']));
}

console.log('\n── 912 · la liste de configuration `sms.interdits` (les plages connues pour la fraude) ──');
v('un préfixe interdit par la configuration est refusé « interdit », même s\'il est un mobile valide', [ok('+251911223344', { interdits: ['+2519'] }), ok('+33612345678', { interdits: ['+336123'] })], [{ refus: 'interdit' }, { refus: 'interdit' }]);
v('et un mobile qui n\'est pas dans ces plages passe', ok('+33712345678', { interdits: ['+336123', '+2519'] }), { e164: '+33712345678', pays: 'FR', mobile: true });
v('une liste mal formée est ignorée sans exception (la validation est au démarrage, `lireConfigSms`)', [ok('+33612345678', { interdits: [42, null, 'x', '+'] }).e164, ok('+33612345678', { interdits: null }).e164], ['+33612345678', '+33612345678']);

console.log('\n── 912 · la table de prix : un prix par pays, prudent, et un pays inconnu au pire ──');
const REGL = { prixCreditEur: 0.06, margePrix: 1.25, prixDefautEur: 1.05, prix: {} };
{
  vrai('la population : plus de 190 pays dans la table (' + Object.keys(P.CREDITS).length + ')', Object.keys(P.CREDITS).length > 190);
  v('la France : 1 crédit × 0,06 € × 1,25 = 0,075 € = 75 000 micro-euros (un entier : aucune dérive de virgule dans les sommes)', P.coutEstime('FR', '33', REGL), 75000);
  v('les États-Unis (0,35 crédit) coûtent moins que la Belgique (1,35)', P.coutEstime('US', '1', REGL) < P.coutEstime('BE', '32', REGL), true);
  v('⛔ la Russie (13,95 crédits) est la plus chère : plus de 1 €', P.coutEstime('RU', '7', REGL) > 1000000, true);
  const max = Math.max(...Object.keys(P.CREDITS).map(p => P.coutEstime(p, '', REGL)));
  v('⛔ un pays ABSENT de la table coûte AU MOINS le plus cher connu (dans le doute, le pire)', P.coutEstime('ZZ', '999', REGL) >= max, true);
  vrai('   et ce défaut reste du même ordre que ce pire (entre lui et 1,1 € — la Russie marge comprise fait ' + max + ' µ€)', P.coutEstime('ZZ', '999', REGL) >= max && P.coutEstime('ZZ', '999', REGL) <= 1100000);
  v('un prix écrit en configuration par pays est pris TEL QUEL, sans marge', P.coutEstime('FR', '33', Object.assign({}, REGL, { prix: { FR: 0.1 } })), 100000);
  v('un prix écrit par indicatif (« +33 ») aussi — si le pays n\'a pas le sien', P.coutEstime('FR', '33', Object.assign({}, REGL, { prix: { '+33': 0.2 } })), 200000);
  v('le prix du pays passe avant celui de l\'indicatif', P.coutEstime('FR', '33', Object.assign({}, REGL, { prix: { '+33': 0.2, FR: 0.1 } })), 100000);
  v('le prix du crédit se change sans toucher au code', P.coutEstime('FR', '33', Object.assign({}, REGL, { prixCreditEur: 0.1 })), 125000);
  v('sans réglage du tout, les valeurs prudentes s\'appliquent', [P.coutEstime('FR', '33'), P.coutEstime('ZZ', '999')], [75000, 1050000]);
  v('⛔ un prix invalide en configuration (négatif, texte) est ignoré : on retombe sur la table', [P.coutEstime('FR', '33', Object.assign({}, REGL, { prix: { FR: -1 } })), P.coutEstime('FR', '33', Object.assign({}, REGL, { prix: { FR: 'gratuit' } }))], [75000, 75000]);
  v('l\'arrondi : 0,10125 € rend 101 250 micro-euros, pas 101 251', P.coutEstime('BE', '32', REGL), 101250);
}

console.log('\n── 912 · chaque pays que le plan de numérotation sait rendre a un prix connu (sinon il est facturé au pire) ──');
{
  const vus = new Set();
  for (const num of Object.values(MOBILES)) vus.add(N.analyser(num).pays);
  const sansPrix = Array.from(vus).filter(p => P.CREDITS[p] === undefined);
  vrai('la population : ' + vus.size + ' pays rendus par le plan de numérotation', vus.size >= 50);
  /* ⚠️ DÉCLARÉS : Porto Rico et la République dominicaine (indicatifs régionaux nord-américains) ne sont pas dans la grille d'OVH relevée ;
     ils coûtent donc le pire connu jusqu'à ce que Justin y mette leur prix (`sms.prix`) — plus cher que nécessaire, jamais moins. */
  v('⛔ chaque pays de l\'échantillon figure dans la table de prix, sauf ces deux-là, DÉCLARÉS facturés au pire', sansPrix.sort(), ['DO', 'PR']);
  v('   et ils sont bien facturés au pire, pas à zéro', ['PR', 'DO'].map(p => P.coutEstime(p, '1', REGL)), [1050000, 1050000]);
}

fin();
