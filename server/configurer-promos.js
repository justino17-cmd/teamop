#!/usr/bin/env node
/* ══ DÉCLARER UN CODE PROMO, ET LE RÉSERVER À DES MÉTIERS, SANS ÉDITER config.json À LA MAIN ═══════════════════
 *
 * Usage, SUR LE VPS (jamais depuis le dépôt : les codes vivent dans `config.promos`, un code écrit dans un fichier servi est un cadeau à tous) :
 *
 *   node /opt/teamop/repo/server/configurer-promos.js lister
 *   node /opt/teamop/repo/server/configurer-promos.js ajouter  <CODE> <pro|business|premium> <mois> [maxUtilisations] [metier,metier…]
 *   node /opt/teamop/repo/server/configurer-promos.js reserver <CODE> <metier,metier…>
 *   node /opt/teamop/repo/server/configurer-promos.js ouvrir   <CODE>          (retire la restriction : le code redevient libre)
 *   systemctl restart teamop-api                                              (la configuration n'est lue qu'au DÉMARRAGE)
 *
 * ⛔ POURQUOI UN SCRIPT PLUTÔT QUE `nano config.json` (Justin, 28 octobre 2026 : « un code de réduction en fonction des packs ») :
 *   · le 17 septembre 2026 une édition à la main, interrompue, a laissé `config.json` SANS SON ACCOLADE FERMANTE — le serveur a refusé de
 *     démarrer. Ici le fichier n'est réécrit qu'une fois tout validé, par fichier temporaire puis renommage, jamais à moitié ;
 *   · les identifiants de métiers se VALIDENT contre `metiers.json` : une faute de frappe dans `metiers` FERME le code côté serveur (rien ne
 *     s'active), elle ne l'ouvre pas à tous — mais on préfère la refuser ici, avant de redémarrer quoi que ce soit ;
 *   · il n'AFFICHE JAMAIS `config.json` : seulement les champs des codes (code, formule, mois, plafond, métiers). Les clés SMTP, Stripe, Firebase
 *     et le reste n'apparaissent nulle part (« on ne fait jamais afficher un secret sur le VPS » — CLAUDE.md).
 * Il ne touche qu'à `promos` : tout le reste du fichier est réécrit à l'identique (mêmes clés, même ordre, même mode).
 *
 * Variables (pour l'épreuve en bac à sable, comme `configurer-sauvegarde.js`) : TEAMOP_CONFIG (défaut /opt/teamop/config.json),
 * TEAMOP_METIERS (défaut : metiers.json à la racine du dépôt). Sortie 0 = fait (ou rien à faire), 1 = refusé, rien n'est écrit.
 */
const fs = require('fs'), path = require('path');

const CONFIG_PATH = process.env.TEAMOP_CONFIG || '/opt/teamop/config.json';
const METIERS_PATH = process.env.TEAMOP_METIERS || path.join(__dirname, '..', 'metiers.json');
const FORMULES = ['pro', 'business', 'premium'];
const HISTORIQUES = require('./metiers').HISTORIQUES;

const refus = (msg) => { console.error('✗ ' + msg); process.exit(1); };
const normCode = c => String(c || '').trim().toUpperCase();
const CODE_OK = /^[A-Z0-9_-]{3,40}$/;

function lireReferentiel() {
  let j = null;
  try { j = JSON.parse(fs.readFileSync(METIERS_PATH, 'utf8')); } catch (e) { j = null; }
  if (!j || typeof j !== 'object' || !j.metiers || typeof j.metiers !== 'object') refus('metiers.json illisible (' + METIERS_PATH + ') : impossible de vérifier les identifiants de métiers — rien n\'est écrit.');
  return j;
}
function lireConfig() {
  let txt;
  try { txt = fs.readFileSync(CONFIG_PATH, 'utf8'); } catch (e) { refus('config.json introuvable (' + CONFIG_PATH + ').'); }
  let cfg;
  try { cfg = JSON.parse(txt); } catch (e) { refus('config.json ne se lit pas (JSON invalide) — il n\'est PAS modifié. Réparer d\'abord ce fichier.'); }
  if (!cfg || typeof cfg !== 'object' || Array.isArray(cfg)) refus('config.json n\'est pas un objet — il n\'est PAS modifié.');
  if (cfg.promos !== undefined && !Array.isArray(cfg.promos)) refus('« promos » n\'est pas une liste dans config.json — il n\'est PAS modifié.');
  return cfg;
}
/* Écrit à côté puis renomme (même dossier : le renommage est atomique), en gardant le mode du fichier d'origine (600 sur le VPS). */
function ecrireConfig(cfg) {
  let mode = 0o600; try { mode = fs.statSync(CONFIG_PATH).mode & 0o777; } catch (e) {}
  const tmp = CONFIG_PATH + '.promos-' + process.pid + '.tmp';
  try {
    fs.writeFileSync(tmp, JSON.stringify(cfg, null, 2) + '\n', { mode });
    fs.chmodSync(tmp, mode);
    fs.renameSync(tmp, CONFIG_PATH);
  } catch (e) { try { fs.unlinkSync(tmp); } catch (x) {} refus('écriture impossible (' + String((e && e.code) || e).slice(0, 40) + ') — config.json n\'est pas modifié.'); }
}
/* des identifiants de métiers → une liste validée, ou un refus qui nomme les identifiants possibles */
function idsValides(texte, ref) {
  const ids = String(texte || '').split(/[\s,;]+/).map(s => s.trim()).filter(Boolean);
  if (!ids.length) refus('aucun métier donné (identifiants de metiers.json séparés par des virgules).');
  const inconnus = ids.filter(k => !Object.prototype.hasOwnProperty.call(ref.metiers, k));
  if (inconnus.length) refus('identifiant(s) inconnu(s) de metiers.json : ' + inconnus.map(x => x.replace(/[^A-Za-z0-9_-]/g, '·').slice(0, 30)).join(', ') + '\n  possibles : ' + Object.keys(ref.metiers).join(', '));
  return [...new Set(ids)];
}
const libelle = (ref, k) => (ref.metiers[k] && ref.metiers[k].nom) || k;
const ouverts = ref => HISTORIQUES.concat(Array.isArray(ref.ouverts) ? ref.ouverts : []);
function trouver(cfg, code) {
  const c = normCode(code);
  const i = (cfg.promos || []).findIndex(p => p && normCode(p.code) === c);
  if (i < 0) refus('code « ' + c.slice(0, 40) + ' » absent de config.promos (node server/configurer-promos.js lister).');
  return i;
}
function ligne(p, ref) {
  const m = p.metiers;
  let restriction;
  if (m === undefined || (Array.isArray(m) && !m.length)) restriction = 'libre';
  else if (!Array.isArray(m)) restriction = 'ILLISIBLE (« metiers » n\'est pas une liste) — le code est FERMÉ';
  else if (m.some(k => typeof k !== 'string' || !Object.prototype.hasOwnProperty.call(ref.metiers, k))) restriction = 'ILLISIBLE (identifiant inconnu) — le code est FERMÉ';
  else restriction = 'réservé : ' + m.map(k => libelle(ref, k) + ' [' + k + ']').join(', ');
  return '  ' + String(p.code || '?').padEnd(28) + ' ' + String(p.formule || '?').padEnd(9) + ' ' + String(p.mois || '?').padStart(2) + ' mois   plafond ' + (p.maxUtilisations ? String(p.maxUtilisations) : '—').padEnd(4) + ' ' + restriction;
}

const [, , cmd, a1, a2, a3, a4, a5] = process.argv;
const RAPPEL = 'Redémarre ensuite le service pour que le serveur relise la configuration :  systemctl restart teamop-api';

if (cmd === 'lister') {
  const ref = lireReferentiel(), cfg = lireConfig();
  const l = cfg.promos || [];
  console.log(l.length + ' code(s) dans config.promos :');
  for (const p of l) if (p && typeof p === 'object') console.log(ligne(p, ref));
  process.exit(0);
}

if (cmd === 'ajouter') {
  const code = normCode(a1), formule = String(a2 || '').toLowerCase(), mois = Number(a3);
  if (!CODE_OK.test(code)) refus('code invalide : 3 à 40 caractères parmi A-Z, 0-9, _ et - (reçu « ' + String(a1 || '').slice(0, 40).replace(/[^A-Za-z0-9_-]/g, '·') + ' »).');
  if (!FORMULES.includes(formule)) refus('formule invalide : pro, business ou premium.');
  if (!Number.isInteger(mois) || mois < 1 || mois > 36) refus('mois invalide : un entier de 1 à 36.');
  let max = 0, metiersTxt = '';
  if (a4 !== undefined) {
    if (/^\d+$/.test(String(a4))) { max = Number(a4); metiersTxt = a5; } else { metiersTxt = a4; }   // le plafond est facultatif : `ajouter CODE pro 3 plomberie,chauffage` marche aussi
  }
  if (max < 0 || max > 100000) refus('maxUtilisations invalide.');
  const ref = lireReferentiel();
  const ids = metiersTxt ? idsValides(metiersTxt, ref) : [];
  const cfg = lireConfig();
  if ((cfg.promos || []).some(p => p && normCode(p.code) === code)) refus('le code « ' + code + ' » existe déjà (reserver / ouvrir pour changer sa restriction).');
  const p = { code, formule, mois };
  if (max) p.maxUtilisations = max;
  if (ids.length) p.metiers = ids;
  cfg.promos = (cfg.promos || []).concat([p]);
  ecrireConfig(cfg);
  console.log('✓ code ajouté :\n' + ligne(p, ref));
  const fermes = ids.filter(k => !ouverts(ref).includes(k));
  if (fermes.length) console.log('⚠ pas encore ouvert(s) au public : ' + fermes.join(', ') + ' — aucune entreprise ne peut avoir ce métier pour l\'instant.');
  console.log(RAPPEL);
  process.exit(0);
}

if (cmd === 'reserver') {
  const ref = lireReferentiel(), cfg = lireConfig();
  const ids = idsValides(a2, ref), i = trouver(cfg, a1);
  cfg.promos[i].metiers = ids;
  ecrireConfig(cfg);
  console.log('✓ code réservé :\n' + ligne(cfg.promos[i], ref));
  const fermes = ids.filter(k => !ouverts(ref).includes(k));
  if (fermes.length) console.log('⚠ pas encore ouvert(s) au public : ' + fermes.join(', ') + ' — aucune entreprise ne peut avoir ce métier pour l\'instant.');
  console.log(RAPPEL);
  process.exit(0);
}

if (cmd === 'ouvrir') {
  const ref = lireReferentiel(), cfg = lireConfig();
  const i = trouver(cfg, a1);
  if (cfg.promos[i].metiers === undefined) { console.log('Rien à faire : le code est déjà libre.'); process.exit(0); }
  delete cfg.promos[i].metiers;
  ecrireConfig(cfg);
  console.log('✓ restriction retirée, le code est libre :\n' + ligne(cfg.promos[i], ref));
  console.log(RAPPEL);
  process.exit(0);
}

console.error('Usage :\n  node server/configurer-promos.js lister\n  node server/configurer-promos.js ajouter <CODE> <pro|business|premium> <mois> [maxUtilisations] [metier,metier…]\n  node server/configurer-promos.js reserver <CODE> <metier,metier…>\n  node server/configurer-promos.js ouvrir <CODE>');
process.exit(1);
