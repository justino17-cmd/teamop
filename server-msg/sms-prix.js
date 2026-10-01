/* ══ LA TABLE DE PRIX D'UN SMS PAR PAYS — CE QUE COÛTE UN CODE, AVANT DE L'ENVOYER ══════════════
 *
 * ⛔ POURQUOI ELLE EXISTE. Le Perso est GRATUIT (Justin, 1er octobre 2026 : « le but c'est qu'on gagne de l'argent ») :
 * chaque SMS est un COÛT, et la fraude au « SMS pumping » vise justement les destinations chères. Comme tout numéro mobile
 * du monde peut s'inscrire (« une connexion pour tous les pays »), la protection passe de « où » à « combien » : avant
 * chaque envoi, on estime ce que coûte CE SMS vers CE pays (`coutEstime`) et `sms-garde.js` le compare à des budgets en euros.
 *
 * ⚠️ ORIGINE DES VALEURS : la grille publique d'OVHcloud (API `GET /sms/rates/destinations`, sans authentification), relevée
 * le 1er octobre 2026 avec le pays de facturation « fr » : 207 destinations. Un SMS coûte un nombre de CRÉDITS qui dépend du
 * pays (1 crédit = 0,06 € pour la France) ; les prix changent. La table est une ESTIMATION : le montant réel de chaque
 * envoi est relu dans la réponse d'OVH (`totalCreditsRemoved`) et remplace l'estimation dans le budget. Quand la grille d'OVH
 * bouge, on corrige `sms.prixCreditEur` ou `sms.prix` dans la configuration, sans toucher au code.
 * ⛔ UN PAYS ABSENT DE LA TABLE COÛTE LE PRIX LE PLUS CHER CONNU, MARGE COMPRISE (`prixDefautEur`, 1,05 € : la Russie est à
 * 13,95 crédits, soit 0,84 €, et 1,05 € avec la marge) : dans le doute, on suppose le pire, et le budget par pays fait le reste.
 * Une marge de 25 % (`margePrix`) s'ajoute à l'estimation d'un pays de la table.
 *
 * Aucune dépendance, aucune écriture : ce module est une fonction pure de la configuration.
 */

/* Crédits OVH par SMS, par pays (code ISO en majuscules). */
const CREDITS = {
   AD: 3, AE: 2.8, AF: 7.75, AG: 3.7, AI: 2.7, AL: 2.3, AM: 4.3, AN: 2, AO: 1.3, AR: 2.55, AT: 1.8, AU: 0.85,
   AW: 2.2, AZ: 10.25, BA: 2.35, BB: 4.35, BD: 7.8, BE: 1.35, BF: 3.05, BG: 3.4, BH: 0.95, BI: 6.6, BJ: 4.5, BM: 5.6,
   BN: 1.05, BO: 3.45, BR: 1.15, BS: 1.5, BT: 6.85, BW: 2.4, BY: 8.55, BZ: 4.65, CA: 0.35, CD: 4.6, CF: 1.45,
   CG: 3.25, CH: 1, CI: 4.25, CK: 2.4, CL: 1.3, CM: 4.1, CN: 1.05, CO: 0.5, CR: 1.15, CU: 2.15, CV: 3.65, CY: 1.65,
   CZ: 1.9, DE: 2.3, DK: 1.25, DM: 3.15, DZ: 4.95, EC: 4.35, EE: 1.8, EG: 4.65, ES: 0.85, ET: 5.35, FI: 0.7, FJ: 3.6,
   FK: 1.9, FO: 1.25, FR: 1, GA: 5.4, GB: 1.05, GD: 3.75, GE: 4.5, GF: 2, GH: 3.65, GI: 2.15, GL: 0.55, GM: 3.5,
   GN: 4, GP: 1.85, GQ: 3, GR: 2.1, GT: 3.25, GU: 2.05, GW: 3.7, GY: 4.6, HK: 1.8, HN: 2.2, HR: 2.75, HT: 4.15,
   HU: 2.8, ID: 9.05, IE: 0.7, IL: 3.9, IN: 2.15, IO: 1.9, IQ: 6.35, IR: 5.85, IS: 2.05, IT: 1.1, JM: 4.3, JO: 5.2,
   JP: 2.1, KE: 2, KG: 5.2, KH: 5, KM: 5.3, KN: 4.6, KR: 0.7, KW: 5.75, KY: 3.75, KZ: 6.25, LA: 2.1, LB: 0.8,
   LC: 3.95, LI: 0.75, LK: 7.9, LR: 3, LS: 3.95, LT: 1.35, LU: 1.7, LV: 1.75, LY: 8.45, MA: 1.2, MD: 2.75, ME: 2.55,
   MG: 8.4, MK: 2.25, ML: 3.55, MN: 5.1, MO: 1.05, MQ: 1.85, MR: 3.8, MS: 2.1, MT: 2.25, MU: 4.8, MV: 1.05, MW: 5.35,
   MX: 1.2, MY: 2.5, MZ: 2.1, NA: 1.15, NC: 2.35, NE: 7, NG: 5.6, NI: 1.95, NL: 2.05, NO: 0.6, NP: 4.1, NZ: 0.7,
   OM: 3.3, PA: 2.45, PE: 2.1, PF: 2.95, PG: 4.2, PH: 4.9, PK: 6, PL: 0.5, PS: 9.85, PT: 0.5, PY: 1.4, QA: 1.75,
   RE: 1.05, RO: 1.95, RS: 3.25, RU: 13.95, RW: 4.7, SA: 3.2, SB: 1.4, SC: 1.8, SD: 7.25, SE: 1.3, SG: 1.1, SI: 4.15,
   SK: 1.95, SL: 3.9, SM: 1.7, SN: 3.95, SO: 3.55, SR: 3.65, ST: 0.4, SV: 1.9, SY: 7.55, SZ: 2.55, TC: 3.8, TD: 7,
   TG: 2.9, TH: 0.6, TJ: 9.3, TL: 2.45, TM: 4.95, TN: 4.8, TO: 3.5, TR: 0.25, TT: 3.95, TW: 1.25, TZ: 4.9, UA: 5.15,
   UG: 5.65, US: 0.35, UY: 2.05, UZ: 8.2, VC: 3.15, VE: 2.2, VG: 4.45, VI: 3.65, VN: 4.3, VU: 2.75, WS: 2.35,
   YE: 6.05, YT: 1.05, ZA: 0.8, ZM: 6.1, ZW: 3.75,
};

const PRIX_CREDIT_EUR = 0.06;      // le crédit d'OVH (grille France)
const MARGE_PRIX = 1.25;           // prudence : un prix qui monte ne doit pas faire sauter un budget
const PRIX_DEFAUT_EUR = 1.05;      // pays inconnu : le pire connu (Russie, 13,95 crédits × 0,06 € × 1,25), marge comprise

/* Le coût estimé d'UN SMS, en micro-euros (entier : pas de dérive de virgule flottante dans les sommes). `reglages` vient de
   `sms.*` de la configuration (déjà normalisée par `lireConfigSms`). Un prix écrit dans `sms.prix` par pays (« FR ») ou par
   indicatif (« +33 ») est pris tel quel, SANS marge : c'est la personne qui l'a posé qui le garantit. */
function coutEstime(pays, cc, reglages) {
  const r = reglages || {};
  const prix = r.prix || {};
  const direct = (k) => (Number.isFinite(prix[k]) && prix[k] >= 0 ? prix[k] : null);
  let eur = direct(pays);
  if (eur === null && cc) eur = direct('+' + cc);
  if (eur === null) {
    const credits = CREDITS[pays];
    const pc = Number.isFinite(r.prixCreditEur) ? r.prixCreditEur : PRIX_CREDIT_EUR;
    const marge = Number.isFinite(r.margePrix) ? r.margePrix : MARGE_PRIX;
    eur = credits !== undefined ? credits * pc * marge : (Number.isFinite(r.prixDefautEur) ? r.prixDefautEur : PRIX_DEFAUT_EUR);
  }
  return Math.ceil(Math.round(eur * 1e9) / 1e3);   // l'arrondi intermédiaire évite que 0,10125 × 1e6 devienne 101250,00000000001 puis 101251
}

module.exports = { coutEstime, CREDITS, PRIX_CREDIT_EUR, MARGE_PRIX, PRIX_DEFAUT_EUR };
