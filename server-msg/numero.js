/* ══ LE PLAN DE NUMÉROTATION — E.164, PAYS, ET « EST-CE UN MOBILE ? » ═════════════════════════
 *
 * Fait main, sans bibliothèque (règle du dépôt : chaque dépendance est une surface d'attaque).
 * ⛔ DÉCISION DE JUSTIN, 1er octobre 2026 : « une connexion pour TOUS les pays ». Il n'y a donc AUCUNE
 * liste blanche de pays ici : tout indicatif d'un pays existant est accepté. Le risque d'argent
 * (« SMS pumping » : des robots qui déclenchent des SMS vers des destinations chères ou surtaxées)
 * ne se traite pas par « où » mais par « combien » — `sms-garde.js` — et par « quoi » : ce module
 * refuse ce qui n'est pas un MOBILE ordinaire.
 *
 * Ce que ce module rend pour un texte saisi :
 *   { ok:true,  e164:'+33612345678', cc:'33', nsn:'612345678', pays:'FR', mobile:true|null }
 *   { ok:false, raison:'format'|'pays'|'longueur'|'non_mobile'|'interdit' }
 * `mobile:true`  : le numéro national est dans une plage MOBILE connue de son pays ;
 * `mobile:null`  : le pays ne distingue pas (ou ce module ne sait pas) mobile et fixe — accepté.
 *                  C'est le cas de l'Amérique du Nord (la portabilité mélange tout), du Danemark, du
 *                  Mexique, et de beaucoup de petits pays. Un numéro fixe de ces pays peut donc
 *                  recevoir une tentative d'envoi ; le budget par pays la borne.
 *
 * ⛔ CE TABLEAU EST ÉCRIT D'APRÈS LE PLAN DE NUMÉROTATION TEL QU'ON LE CONNAÎT, À RELIRE : les plages
 * mobiles changent (ouverture de préfixes), et une plage manquante REFUSERAIT un vrai mobile. Dans le
 * doute, un pays est écrit « non vérifiable » (`mobile:null`) plutôt qu'avec une plage trop étroite :
 * refuser un client réel coûte une inscription, accepter un fixe coûte un SMS borné par le budget.
 * ⛔ Ce qui est TOUJOURS refusé : les codes internationaux spéciaux (satellite, réseaux « internationaux »,
 * numéros gratuits, partagés et surtaxés mondiaux), les plages surtaxées de l'Amérique du Nord, et tout
 * préfixe de la liste de configuration `sms.interdits`.
 *
 * La France : seuls les 06 et 07 sont des mobiles (le 08 est surtaxé ou spécial, le 09 est la voix sur IP,
 * 01 à 05 sont fixes). Les départements d'outre-mer ont leurs propres plages (Réunion 0692 / 0693, etc.).
 */

/* [indicatif, pays, longueurMin, longueurMax, plage mobile (RegExp sur le numéro NATIONAL) ou null, refus (RegExp) ou null]
   Le numéro national est ce qui suit l'indicatif, sans le « 0 » de ligne. */
const R = (s) => new RegExp('^(?:' + s + ')$');
const TABLE = [
  ['20', 'EG', 10, 10, R('1[0125]\\d{8}')],
  ['27', 'ZA', 9, 9, R('(?:6\\d|7[0-46-9]|8[1-5])\\d{7}')],
  ['30', 'GR', 10, 10, R('69\\d{8}')],
  ['31', 'NL', 9, 9, R('6\\d{8}')],
  ['32', 'BE', 8, 9, R('4[5-9]\\d{7}')],
  ['33', 'FR', 9, 9, R('[67]\\d{8}')],
  ['34', 'ES', 9, 9, R('6\\d{8}|7[1-4]\\d{7}')],
  ['36', 'HU', 8, 9, R('(?:20|30|31|50|70)\\d{7}')],
  ['39', 'IT', 9, 11, R('3\\d{8,9}')],
  ['40', 'RO', 9, 9, R('7\\d{8}')],
  ['41', 'CH', 9, 9, R('7[4-9]\\d{7}')],
  ['43', 'AT', 10, 13, R('6(?:50|60|64|7\\d|8[018]|99)\\d{6,9}')],
  ['44', 'GB', 10, 10, R('7(?:[1-57-9]\\d{8}|624\\d{6})')],
  ['45', 'DK', 8, 8, null, R('(?:80|90)\\d{6}')],
  ['46', 'SE', 7, 13, R('7[02369]\\d{7}')],
  ['47', 'NO', 8, 8, R('[49]\\d{7}')],
  ['48', 'PL', 9, 9, R('(?:45|5[0137]|6[069]|7[2389]|88)\\d{7}')],
  ['49', 'DE', 10, 11, R('1[5-7]\\d{8,9}')],
  ['51', 'PE', 9, 9, R('9\\d{8}')],
  ['52', 'MX', 10, 10, null],
  ['53', 'CU', 8, 8, R('5\\d{7}')],
  ['54', 'AR', 10, 11, R('9\\d{9,10}')],
  ['55', 'BR', 10, 11, R('[1-9]{2}9\\d{8}')],
  ['56', 'CL', 9, 9, R('9\\d{8}')],
  ['57', 'CO', 10, 10, R('3\\d{9}')],
  ['58', 'VE', 10, 10, R('4(?:1[246]|2[46])\\d{7}')],
  ['60', 'MY', 9, 10, R('1\\d{8,9}')],
  ['61', 'AU', 9, 9, R('4\\d{8}')],
  ['62', 'ID', 9, 12, R('8\\d{8,11}')],
  ['63', 'PH', 10, 10, R('9\\d{9}')],
  ['64', 'NZ', 8, 10, R('2\\d{7,9}')],
  ['65', 'SG', 8, 8, R('[89]\\d{7}')],
  ['66', 'TH', 9, 9, R('[689]\\d{8}')],
  ['81', 'JP', 10, 10, R('[7-9]0\\d{8}')],
  ['82', 'KR', 9, 10, R('1\\d{8,9}')],
  ['84', 'VN', 9, 9, R('(?:3[2-9]|5[25689]|7[06-9]|8[1-9]|9\\d)\\d{7}')],
  ['86', 'CN', 11, 11, R('1[3-9]\\d{9}')],
  ['90', 'TR', 10, 10, R('5\\d{9}')],
  ['91', 'IN', 10, 10, R('[6-9]\\d{9}')],
  ['92', 'PK', 10, 10, R('3\\d{9}')],
  ['93', 'AF', 9, 9, R('7\\d{8}')],
  ['94', 'LK', 9, 9, R('7\\d{8}')],
  ['95', 'MM', 8, 10, R('9\\d{7,9}')],
  ['98', 'IR', 10, 10, R('9\\d{9}')],
  ['211', 'SS', 9, 9, null],
  ['212', 'MA', 9, 9, R('[67]\\d{8}')],
  ['213', 'DZ', 9, 9, R('[567]\\d{8}')],
  ['216', 'TN', 8, 8, R('[2459]\\d{7}')],
  ['218', 'LY', 9, 10, null],
  ['220', 'GM', 7, 7, null], ['221', 'SN', 9, 9, R('7[0-8]\\d{7}')], ['222', 'MR', 8, 8, null],
  ['223', 'ML', 8, 8, null], ['224', 'GN', 9, 9, null], ['225', 'CI', 10, 10, R('0[157]\\d{8}')],
  ['226', 'BF', 8, 8, null], ['227', 'NE', 8, 8, null], ['228', 'TG', 8, 8, null], ['229', 'BJ', 8, 10, null],
  ['230', 'MU', 8, 8, R('5\\d{7}')], ['231', 'LR', 7, 9, null], ['232', 'SL', 8, 8, null],
  ['233', 'GH', 9, 9, R('[235]\\d{8}')], ['234', 'NG', 10, 10, R('[789][01]\\d{8}')],
  ['235', 'TD', 8, 8, null], ['236', 'CF', 8, 8, null], ['237', 'CM', 9, 9, R('6\\d{8}')],
  ['238', 'CV', 7, 7, null], ['239', 'ST', 7, 7, null], ['240', 'GQ', 9, 9, null], ['241', 'GA', 7, 8, null],
  ['242', 'CG', 9, 9, null], ['243', 'CD', 9, 9, null], ['244', 'AO', 9, 9, R('9\\d{8}')],
  ['245', 'GW', 7, 9, null], ['246', 'IO', 7, 7, null], ['247', 'AC', 4, 5, null], ['248', 'SC', 7, 7, null],
  ['249', 'SD', 9, 9, null], ['250', 'RW', 9, 9, null], ['251', 'ET', 9, 9, R('9\\d{8}')],
  ['252', 'SO', 7, 9, null], ['253', 'DJ', 8, 8, null], ['254', 'KE', 9, 9, R('[17]\\d{8}')],
  ['255', 'TZ', 9, 9, R('[67]\\d{8}')], ['256', 'UG', 9, 9, R('7\\d{8}')], ['257', 'BI', 8, 8, null],
  ['258', 'MZ', 9, 9, null], ['260', 'ZM', 9, 9, null], ['261', 'MG', 9, 9, R('3[2-49]\\d{7}')],
  ['263', 'ZW', 9, 9, null], ['264', 'NA', 9, 9, null], ['265', 'MW', 7, 9, null], ['266', 'LS', 8, 8, null],
  ['267', 'BW', 8, 8, null], ['268', 'SZ', 8, 8, null], ['269', 'KM', 7, 7, null],
  ['290', 'SH', 4, 5, null], ['291', 'ER', 7, 7, null], ['297', 'AW', 7, 7, null], ['298', 'FO', 6, 6, null],
  ['299', 'GL', 6, 6, null],
  ['350', 'GI', 8, 8, R('5[6-8]\\d{6}')],
  ['351', 'PT', 9, 9, R('9[1236]\\d{7}')],
  ['352', 'LU', 6, 9, R('6\\d{8}')],
  ['353', 'IE', 7, 9, R('8[3-9]\\d{7}')],
  ['354', 'IS', 7, 7, R('[678]\\d{6}')],
  ['355', 'AL', 8, 9, R('6[6-9]\\d{7}')],
  ['356', 'MT', 8, 8, R('7[79]\\d{6}|9[6-9]\\d{6}')],
  ['357', 'CY', 8, 8, R('9[4-9]\\d{6}')],
  ['358', 'FI', 6, 11, R('4\\d{7,9}|50\\d{5,8}')],
  ['359', 'BG', 8, 9, R('8[7-9]\\d{7}|9[89]\\d{7}')],
  ['370', 'LT', 8, 8, R('6\\d{7}')],
  ['371', 'LV', 8, 8, R('2\\d{7}')],
  ['372', 'EE', 7, 8, R('5\\d{6,7}')],
  ['373', 'MD', 8, 8, null], ['374', 'AM', 8, 8, null], ['375', 'BY', 9, 9, R('(?:25|29|33|44)\\d{7}')],
  ['376', 'AD', 6, 6, R('[36]\\d{5}')], ['377', 'MC', 8, 9, R('4\\d{7}|6\\d{8}')],
  ['378', 'SM', 6, 10, null], ['380', 'UA', 9, 9, R('(?:39|50|6[3-8]|9[1-9])\\d{7}')],
  ['381', 'RS', 8, 9, R('6\\d{7,8}')], ['382', 'ME', 8, 8, null], ['383', 'XK', 8, 8, null],
  ['385', 'HR', 8, 9, R('9[1-9]\\d{6,7}')], ['386', 'SI', 8, 8, R('(?:3[01]|40|41|51|6[45]|70)\\d{6}')],
  ['387', 'BA', 8, 8, null], ['389', 'MK', 8, 8, null],
  ['420', 'CZ', 9, 9, R('[67]\\d{8}')], ['421', 'SK', 9, 9, R('9\\d{8}')], ['423', 'LI', 7, 9, null],
  ['500', 'FK', 5, 5, null], ['501', 'BZ', 7, 7, null], ['502', 'GT', 8, 8, R('[3-5]\\d{7}')],
  ['503', 'SV', 8, 8, R('[67]\\d{7}')], ['504', 'HN', 8, 8, null], ['505', 'NI', 8, 8, null],
  ['506', 'CR', 8, 8, R('[5-8]\\d{7}')], ['507', 'PA', 7, 8, R('6\\d{7}')], ['509', 'HT', 8, 8, null],
  ['591', 'BO', 8, 8, R('[67]\\d{7}')], ['592', 'GY', 7, 7, null], ['593', 'EC', 9, 9, R('9\\d{8}')],
  ['595', 'PY', 9, 9, R('9\\d{8}')], ['597', 'SR', 6, 7, null], ['598', 'UY', 8, 8, R('9\\d{7}')],
  ['599', 'CW', 7, 8, null],
  ['670', 'TL', 8, 8, null], ['672', 'NF', 5, 6, null], ['673', 'BN', 7, 7, null], ['674', 'NR', 7, 7, null],
  ['675', 'PG', 8, 8, null], ['676', 'TO', 5, 7, null], ['677', 'SB', 5, 7, null], ['678', 'VU', 5, 7, null],
  ['679', 'FJ', 7, 7, null], ['680', 'PW', 7, 7, null], ['681', 'WF', 6, 6, null], ['682', 'CK', 5, 5, null],
  ['683', 'NU', 4, 4, null], ['685', 'WS', 5, 7, null], ['686', 'KI', 5, 8, null], ['688', 'TV', 5, 6, null],
  ['690', 'TK', 4, 4, null], ['691', 'FM', 7, 7, null], ['692', 'MH', 7, 7, null],
  ['850', 'KP', 6, 17, null], ['852', 'HK', 8, 8, R('[569]\\d{7}')], ['853', 'MO', 8, 8, R('6\\d{7}')],
  ['855', 'KH', 8, 9, null], ['856', 'LA', 8, 10, null], ['880', 'BD', 10, 10, R('1[3-9]\\d{8}')],
  ['886', 'TW', 9, 9, R('9\\d{8}')],
  ['960', 'MV', 7, 7, R('[79]\\d{6}')], ['961', 'LB', 7, 8, null], ['962', 'JO', 9, 9, R('7[789]\\d{7}')],
  ['963', 'SY', 9, 9, R('9\\d{8}')], ['964', 'IQ', 10, 10, R('7[3-9]\\d{8}')], ['965', 'KW', 8, 8, R('[569]\\d{7}')],
  ['966', 'SA', 9, 9, R('5\\d{8}')], ['967', 'YE', 9, 9, R('7\\d{8}')], ['968', 'OM', 8, 8, R('[79]\\d{7}')],
  ['970', 'PS', 9, 9, R('5[69]\\d{7}')], ['971', 'AE', 9, 9, R('5[024568]\\d{7}')], ['972', 'IL', 9, 9, R('5\\d{8}')],
  ['973', 'BH', 8, 8, R('[36]\\d{7}')], ['974', 'QA', 8, 8, R('[3567]\\d{7}')], ['975', 'BT', 8, 8, null],
  ['976', 'MN', 8, 8, R('[89]\\d{7}')], ['977', 'NP', 10, 10, R('9[78]\\d{8}')],
  ['992', 'TJ', 9, 9, null], ['993', 'TM', 8, 8, null], ['994', 'AZ', 9, 9, R('(?:40|5[015]|60|7[07]|99)\\d{7}')],
  ['995', 'GE', 9, 9, R('5\\d{8}')], ['996', 'KG', 9, 9, R('[257]\\d{8}')], ['998', 'UZ', 9, 9, R('9\\d{8}')],
];

/* Les indicatifs PARTAGÉS : le pays se lit sur le début du numéro national. Premier qui correspond. */
const PARTAGES = {
  '262': [   // Mayotte d'abord (269 fixe, 639 mobile), puis la Réunion
    ['YT', 9, 9, R('639\\d{6}'), /^(?:269|639)/],
    ['RE', 9, 9, R('69[23]\\d{6}'), null],
  ],
  '590': [['GP', 9, 9, R('69[01]\\d{6}'), null]],    // Guadeloupe, Saint-Martin, Saint-Barthélemy : le même plan
  '594': [['GF', 9, 9, R('694\\d{6}'), null]],
  '596': [['MQ', 9, 9, R('69[67]\\d{6}'), null]],
  '508': [['PM', 6, 6, R('(?:41|55)\\d{4}'), null]],
  '687': [['NC', 6, 6, R('[789]\\d{5}'), null]],
  '689': [['PF', 8, 8, R('8[79]\\d{6}'), null]],
  '7': [
    ['KZ', 10, 10, R('7[04-8]\\d{8}'), /^[67]/],
    ['RU', 10, 10, R('9\\d{9}'), null],
  ],
};

/* L'Amérique du Nord (+1) : le pays se lit sur l'indicatif régional. Le Canada et les États-Unis partagent un tarif. */
const NANP_CARAIBES = {
  242: 'BS', 246: 'BB', 264: 'AI', 268: 'AG', 284: 'VG', 340: 'VI', 345: 'KY', 441: 'BM', 473: 'GD', 649: 'TC', 658: 'JM',
  664: 'MS', 670: 'MP', 671: 'GU', 684: 'AS', 721: 'SX', 758: 'LC', 767: 'DM', 784: 'VC', 787: 'PR', 809: 'DO', 829: 'DO',
  849: 'DO', 868: 'TT', 869: 'KN', 876: 'JM', 939: 'PR',
};
const NANP_CANADA = new Set([204, 226, 236, 249, 250, 263, 289, 306, 343, 365, 367, 368, 382, 403, 416, 418, 431, 437, 438, 450, 468,
  474, 506, 514, 519, 548, 579, 581, 584, 587, 604, 613, 639, 647, 672, 683, 705, 709, 742, 753, 778, 780, 782, 807, 819, 825, 867, 873,
  879, 902, 905]);
/* ⛔ Les indicatifs régionaux qui ne sont PAS des lignes ordinaires : communications personnelles, gratuits, surtaxés. */
const NANP_SPECIAUX = new Set([500, 521, 522, 523, 524, 525, 526, 527, 528, 529, 533, 544, 566, 577, 588, 600, 622, 700, 710, 800, 833, 844, 855, 866, 877, 888, 900, 976]);

/* ⛔ Les indicatifs internationaux SPÉCIAUX : jamais un téléphone ordinaire d'un pays. 800 numéro gratuit mondial, 808 coût partagé,
   870 à 874 satellite, 878 communications personnelles universelles, 881 à 883 réseaux satellites et « internationaux » (la cible
   classique de la fraude au SMS), 888 humanitaire, 979 surtaxé mondial, 991 à 999 hors plan. */
const SPECIAUX = ['800', '808', '870', '871', '872', '873', '874', '878', '881', '882', '883', '888', '979', '991', '990'];

/* Les pays sans plage mobile connue où un « 0 » initial est PARTIE du numéro (Bénin : 10 chiffres depuis 2024, tous en « 01 » ; Saint-Marin :
   « 0549 » ; Gabon : 8 chiffres dont le zéro) : on n'y retire jamais un zéro, on ne sait pas lequel est de ligne. */
const ZERO_SIGNIFICATIF = new Set(['BJ', 'SM', 'GA']);

const PAR_CC = new Map();
for (const [cc, pays, mn, mx, mob, ref] of TABLE) PAR_CC.set(cc, { pays, mn, mx, mob, ref: ref || null });
const CC_PARTAGES = new Set(Object.keys(PARTAGES));
const CC_NANP = '1';

/* L'indicatif d'un numéro international (suite de chiffres SANS « + ») : les indicatifs forment un code préfixe, donc
   la lecture est sans ambiguïté — 1 et 7 d'un chiffre, puis deux, puis trois. */
function indicatifDe(chiffres) {
  if (chiffres[0] === '1' || chiffres[0] === '7') return chiffres[0];
  const c2 = chiffres.slice(0, 2), c3 = chiffres.slice(0, 3);
  if (PAR_CC.has(c2) || CC_PARTAGES.has(c2)) return c2;
  if (SPECIAUX.includes(c3) || PAR_CC.has(c3) || CC_PARTAGES.has(c3)) return c3;
  return null;
}

/* Normalise ce que la personne a tapé : espaces, points, tirets, parenthèses ; « 00 » vaut « + » ; ⛔ un numéro SANS indicatif
   (« 06 12 34 56 78 ») n'est pas interprété — on ne devine pas le pays d'après la langue du navigateur : l'écran propose
   un sélecteur de pays, et envoie du E.164. */
function nettoyer(brut) {
  if (typeof brut !== 'string') return null;
  const s = brut.trim();
  if (s.length === 0 || s.length > 40) return null;
  if (!/^[+0-9 .()\-–]*$/.test(s)) return null;
  let t = s.replace(/\(0\)/g, '').replace(/[ .()\-–]/g, '');   // « +33 (0)6… » : le 0 de ligne entre parenthèses se retire
  if (t.startsWith('00')) t = '+' + t.slice(2);
  if (!/^\+\d{6,15}$/.test(t)) return null;
  return t.slice(1);
}

/* `interdits` : préfixes E.164 de configuration (« +2519 », …), refusés quoi qu'il arrive. */
function analyser(brut, { interdits = [] } = {}) {
  const chiffres = nettoyer(brut);
  if (!chiffres) return { ok: false, raison: 'format' };
  const refus = (raison) => ({ ok: false, raison });
  const cc = indicatifDe(chiffres);
  if (!cc) return refus('pays');
  if (SPECIAUX.includes(cc)) return refus('interdit');
  let nsn = chiffres.slice(cc.length);

  let info;   // { pays, mn, mx, mob, ref }
  if (cc === CC_NANP) {
    /* Le zéro de ligne n'existe pas en Amérique du Nord : un « +1 0… » est faux. */
    if (!/^[2-9]\d{2}[2-9]\d{6}$/.test(nsn)) return refus(nsn.length === 10 ? 'format' : 'longueur');
    const zone = parseInt(nsn.slice(0, 3), 10);
    if (NANP_SPECIAUX.has(zone)) return refus('non_mobile');
    const pays = NANP_CARAIBES[zone] || (NANP_CANADA.has(zone) ? 'CA' : 'US');
    info = { pays, mn: 10, mx: 10, mob: null, ref: null };
  } else if (CC_PARTAGES.has(cc)) {
    const lignes = PARTAGES[cc];
    const essai = (n) => { for (const [p, mn, mx, mob, pref] of lignes) if (!pref || pref.test(n)) return { pays: p, mn, mx, mob, ref: null }; return null; };
    info = essai(nsn);
    if (!info) return refus('format');
    /* « +262 0692… » : un zéro de ligne en trop ; on le retire s'il fait tomber juste. */
    if (nsn.startsWith('0') && (nsn.length < info.mn || nsn.length > info.mx || (info.mob && !info.mob.test(nsn)))) {
      const sans = nsn.slice(1), i2 = essai(sans);
      if (i2 && sans.length >= i2.mn && sans.length <= i2.mx) { nsn = sans; info = i2; }
    }
  } else {
    info = PAR_CC.get(cc);
    if (!info) return refus('pays');
    /* Le zéro de ligne (« +33 06… », « +44 07… ») : il n'appartient pas au numéro international. S'il fait tomber juste en le retirant, on le retire. */
    if (nsn.startsWith('0')) {
      const sans = nsn.slice(1);
      const tombeJuste = (n) => n.length >= info.mn && n.length <= info.mx && (!info.mob || info.mob.test(n));
      if (!tombeJuste(nsn) && tombeJuste(sans)) nsn = sans;
      /* ⛔ UN SEUL E.164 PAR TÉLÉPHONE. Dans un pays SANS plage mobile connue (`mob` nul), la longueur seule ne tranche pas : « +218 912345678 »
         et « +218 0912345678 » tombaient tous les deux juste, donc deux numéros — deux SMS dans la minute, deux comptes pour une seule
         ligne, et un blocage contourné (relecture adverse). Le zéro de ligne s'y retire dès que le reste a une longueur permise.
         Les pays où le zéro FAIT PARTIE du numéro (`ZERO_SIGNIFICATIF`) le gardent. */
      else if (!info.mob && !ZERO_SIGNIFICATIF.has(info.pays) && sans.length >= info.mn && sans.length <= info.mx) nsn = sans;
    }
  }
  if (nsn.length < info.mn || nsn.length > info.mx) return refus('longueur');
  if (info.ref && info.ref.test(nsn)) return refus('non_mobile');
  let mobile = null;
  if (info.mob) { if (!info.mob.test(nsn)) return refus('non_mobile'); mobile = true; }
  const e164 = '+' + cc + nsn;
  for (const p of interdits || []) if (typeof p === 'string' && p.startsWith('+') && p.length > 1 && e164.startsWith(p)) return refus('interdit');
  return { ok: true, e164, cc, nsn, pays: info.pays, mobile };
}

/* Les indicatifs connus (pour les bancs : « aucune liste blanche » se démontre en parcourant TOUS les indicatifs). */
function indicatifsConnus() {
  return Array.from(new Set(Array.from(PAR_CC.keys()).concat(Object.keys(PARTAGES), [CC_NANP])));
}

module.exports = { analyser, nettoyer, indicatifsConnus, SPECIAUX };
