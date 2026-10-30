#!/usr/bin/env node
/* REJOUER LES 45 CAS CONTRE LE VRAI MODÈLE — AVANT / APRÈS, ET UN RAPPORT QUE JUSTIN LIT (30 octobre 2026).
 *
 * ⛔ HORS CI, À LA MAIN, SUR LE SERVEUR : ce script appelle VRAIMENT Anthropic et dépense VRAIMENT de l'argent (la clé des agents). Il n'est lancé par aucun workflow ni aucune liste de bancs.
 *
 *     TEAMOP_CONFIG=/opt/teamop/config.json node server/outils/evaluation-travail/rejouer.js --estimer
 *     TEAMOP_CONFIG=/opt/teamop/config.json node server/outils/evaluation-travail/rejouer.js --oui --agent camille --sortie /tmp/rapport-camille.md
 *
 * Options : --agent camille|lea|margaux|tous (défaut tous) · --cas c01,c05 (une sélection) · --oui (l'accord : sans lui, RIEN n'est envoyé) · --estimer (n'annonce que le coût, n'envoie rien)
 *           --budget 8 (dollars RÉELS au-delà desquels le script refuse de partir ; défaut 8) · --sortie fichier.md (défaut : rapport-travail-AAAA-MM-JJ.md dans le dossier courant)
 *           --par-jour camille=20,lea=5,margaux=3 (le volume quotidien qui sert à l'estimation du mois ; ces défauts sont des hypothèses, à corriger avec les vrais chiffres)
 *
 * Ce qu'il fait, cas par cas : monte les VRAIS modules (Camille, Léa, Margaux) dans un dossier jetable (`jouer.js`), les joue une première fois interrupteur COUPÉ (« avant »), puis ALLUMÉ (« après »), avec les modèles
 * que Justin a réglés (`agents.modeles`), compte les requêtes et les dollars, applique les exigences de métier du cas (`evaluer`), et écrit un rapport Markdown côte à côte : le texte d'avant, le texte d'après, les
 * notes de la grille, ce que ça a coûté.
 *
 * ⛔ LA CLÉ vient UNIQUEMENT de la configuration du serveur (`agents.cleApi` du fichier désigné par TEAMOP_CONFIG) : jamais d'un argument, jamais de l'environnement, jamais affichée ni écrite — ni dans le rapport,
 *    ni dans la console, ni dans une erreur (les messages d'erreur d'Anthropic sont purgés de la clé avant d'être dits).
 * ⛔ AUCUN VRAI CLIENT : les 45 cas sont fictifs (`cas.js`). Aucune donnée de production n'est lue ; rien n'est écrit hors du dossier jetable et du fichier de rapport. Rien ne part : les messageries et Stripe sont simulés.
 * ⛔ CE QUE LE RAPPORT NE PROUVE PAS : que le vrai modèle écrira toujours aussi bien (45 cas ne sont pas un parc de clients), ni la tenue à la charge. Il montre des textes à lire — c'est à Justin de juger.
 */
'use strict';
const fs = require('fs'), path = require('path');
const CAS = require('./cas.js');
const { jouer, evaluer } = require('./jouer.js');
const CERVEAU = require('../../cerveau.js');
const RAPPORT = require('./rapport.js');

const args = process.argv.slice(2);
const opt = (nom, def) => { const i = args.indexOf('--' + nom); return i >= 0 ? (args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : true) : def; };
const OUI = args.includes('--oui'), ESTIMER = args.includes('--estimer');
const AGENT = String(opt('agent', 'tous'));
const SELECTION = typeof opt('cas', '') === 'string' && opt('cas', '') ? String(opt('cas')).split(',').map(x => x.trim()) : null;
const BUDGET = Math.min(Math.max(Number(opt('budget', 8)) || 8, 0.5), 50);
const PAR_JOUR = Object.assign({ camille: 20, lea: 5, margaux: 3 }, Object.fromEntries(String(opt('par-jour', '')).split(',').filter(Boolean).map(x => x.split('=')).filter(x => /^(camille|lea|margaux)$/.test(x[0]) && Number(x[1]) >= 0).map(x => [x[0], Number(x[1])])));

/* La configuration : le seul endroit d'où vient la clé. Un message d'erreur ne cite jamais un extrait du fichier. */
function lireConfig() {
  const f = process.env.TEAMOP_CONFIG;
  if (!f) { console.error('TEAMOP_CONFIG (le chemin du config.json du serveur) n’est pas posé.'); process.exit(2); }
  let c;
  try { c = JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) { console.error('Configuration du serveur illisible : le script s’arrête.'); process.exit(2); }
  const a = c && typeof c.agents === 'object' && c.agents ? c.agents : {};
  return { cle: typeof a.cleApi === 'string' ? a.cleApi : '', modeles: a.modeles && typeof a.modeles === 'object' ? a.modeles : {}, marge: typeof a.margeTarif === 'number' ? a.margeTarif : CERVEAU.MARGE_DEFAUT };
}

const choisis = CAS.TOUS.filter(c => (AGENT === 'tous' || (AGENT === 'camille' && c.id[0] === 'c') || (AGENT === 'lea' && c.id[0] === 'l') || (AGENT === 'margaux' && c.id[0] === 'm')) && (!SELECTION || SELECTION.includes(c.id)));

/* L'ESTIMATION AVANT D'ENVOYER : des jetons moyens par cas et par mode (ordre de grandeur, mesuré sur les requêtes des bancs), au tarif RÉEL de chaque modèle. */
const JETONS = { // [entrée, sortie] par cas
  camille: { avant: [3500, 500], apres: [16000, 3500] }, lea: { avant: [3500, 900], apres: [14000, 3500] }, margaux: { avant: [0, 0], apres: [7000, 1800] } };
function estimer(cfg) {
  let total = 0; const lignes = [];
  for (const c of choisis) {
    const ag = c.id[0] === 'c' ? 'camille' : c.id[0] === 'l' ? 'lea' : 'margaux';
    const modele = cfg.modeles[ag] || CERVEAU.MODELE_DEFAUT;
    const t = CERVEAU.TARIFS_REELS[modele] || [4, 20];
    for (const mode of ['avant', 'apres']) { const j = JETONS[ag][mode]; total += (j[0] * t[0] + j[1] * t[1]) / 1e6; }
    lignes.push(c.id);
  }
  return Math.round(total * 100) / 100;
}

(async () => {
  const cfg = lireConfig();
  const est = estimer(cfg);
  console.log('Cas choisis : ' + choisis.length + ' (' + AGENT + ') · modèles : ' + (Object.keys(cfg.modeles).length ? JSON.stringify(cfg.modeles) : 'Sonnet 5 partout') + ' · Coût estimé de l’envoi (avant + après) : environ ' + est.toFixed(2) + ' $ RÉELS (plafond demandé : ' + BUDGET + ' $).');
  if (ESTIMER) return;
  if (!cfg.cle) { console.error('Aucune clé des agents (agents.cleApi) dans la configuration : rien n’est envoyé.'); process.exit(2); }
  if (!OUI) { console.error('Rien n’est envoyé sans l’accord explicite : relancer avec --oui.'); process.exit(1); }
  if (est > BUDGET) { console.error('Le coût estimé (' + est.toFixed(2) + ' $) dépasse le plafond demandé (' + BUDGET + ' $) : choisir moins de cas (--cas, --agent) ou relever --budget.'); process.exit(1); }

  /* l'appel RÉEL : le SDK d'Anthropic, par la fonction du cerveau ; toute erreur est purgée de la clé avant d'être dite */
  const purger = t => String(t == null ? '' : t).split(cfg.cle).join('(clé)');
  const appelerReel = async (cle, requete, oa) => { try { return await CERVEAU.appelerAnthropic(cle, requete, oa); } catch (e) { throw new Error(purger(e && e.message || e).slice(0, 160)); } };
  const cerveauCtx = { modeles: cfg.modeles, margeTarif: cfg.marge, plafondsAgent: { camille: 40, lea: 40, margaux: 40 }, budgetMois: 100 };

  const rapport = [], resumes = [];
  let usdReel = 0;
  for (const c of choisis) {
    process.stdout.write(c.id + ' …');
    const sortie = { cas: c };
    for (const mode of ['avant', 'apres']) {
      const res = await jouer(c, { travail: mode === 'apres', appelerReel, cleApi: cfg.cle, cerveauCtx }).catch(e => ({ id: c.id, agent: '?', erreur: purger(e && e.message || e).slice(0, 200), requetes: 0, usd: 0 }));
      res.lignes = res.erreur ? [{ ok: false, texte: 'erreur : ' + res.erreur }] : evaluer(c, res);
      res.usdReel = (res.usd || 0) / cfg.marge;
      usdReel += res.usdReel;
      sortie[mode] = res;
    }
    process.stdout.write(' fait\n');
    resumes.push(sortie);
    rapport.push(sortie);
    if (usdReel > BUDGET * 1.5) { console.error('Le coût réel dépasse une fois et demie le plafond demandé : arrêt.'); break; }
  }

  const texteRapport = RAPPORT.composer(rapport, cfg, PAR_JOUR);
  const dest = typeof opt('sortie', '') === 'string' && opt('sortie', '') ? String(opt('sortie')) : 'rapport-travail-' + new Date().toISOString().slice(0, 10) + '.md';
  fs.writeFileSync(dest, purger(texteRapport));
  console.log('Rapport écrit : ' + dest + ' · coût réel estimé de cet essai : ' + usdReel.toFixed(2) + ' $.');
})().catch(e => { console.error('Le rejeu a échoué : ' + String(e && e.message || e).slice(0, 160)); process.exit(1); });
