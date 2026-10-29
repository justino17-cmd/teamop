#!/usr/bin/env node
/* LE COÛT, ANNONCÉ AVANT L'APPEL (28 octobre 2026) — sans clé, sans réseau.
 *
 * Construit le VRAI prompt de chaque cas du jeu demandé (`construire-prompt.js`, réponse simulée : rien ne part) et en tire la borne HAUTE de ce qu'une évaluation réelle coûterait :
 * l'entrée estimée comme `cerveau.js` la réserve (un jeton pour trois signes), la sortie au maximum que la requête permet (3 000 jetons quand l'agent réfléchit, comme en production),
 * aux tarifs de `cerveau.js` (3,5 $ / 17,5 $ le million, un peu au-dessus du réel). La dépense vraie est donc plus basse ; elle ne peut pas être plus haute.
 *
 * Usage : node estimer.js [--jeu petit|complet] [--json]
 * Sortie : une phrase lisible, ou (--json) une ligne { appels, entreeTokens, borneHauteUsd, attenduUsd }. Code 0 ; 2 si un cas ne se construit pas (alors rien ne doit partir). */
'use strict';
const path = require('path');
const { evaluerCas } = require('./evaluer-local.js');
const Fournisseur = require('./fournisseur-teamop.js');
const TOUS = require(path.join(__dirname, 'cas', 'index.js')).TOUS;

const SORTIE_ATTENDUE = 350;   // jetons : un message d'agent tient en 600 signes, un courriel de vente en 500 à 700 jetons — on retient une valeur médiane pour « attendu »

async function estimer(jeu) {
  const cas = jeu === 'complet' ? TOUS : TOUS.filter(c => c.metadata && c.metadata.jeu === 'petit');
  let entree = 0, sortieMax = 0, appels = 0;
  const detail = [];
  for (const c of cas) {
    const r = await evaluerCas(c, 'bonne', 'simule');
    if (r.erreur) throw new Error('cas ' + c.vars.id + ' : ' + r.erreur);
    const m = r.reponse.metadata;
    entree += m.entreeEstimee; sortieMax += m.sortieMax; appels++;
    detail.push({ id: c.vars.id, agent: c.vars.agent, entree: m.entreeEstimee, sortieMax: m.sortieMax });
  }
  const usd = (e, s) => (e * Fournisseur.USD_ENTREE_M + s * Fournisseur.USD_SORTIE_M) / 1e6;
  return { jeu: jeu === 'complet' ? 'complet' : 'petit', appels, entreeTokens: entree, sortieMaxTokens: sortieMax,
    borneHauteUsd: Math.round(usd(entree, sortieMax) * 1000) / 1000, attenduUsd: Math.round(usd(entree, appels * SORTIE_ATTENDUE) * 1000) / 1000, detail };
}

if (require.main === module) {
  const arg = k => { const i = process.argv.indexOf(k); return i >= 0 ? process.argv[i + 1] : undefined; };
  estimer(arg('--jeu') || 'petit').then(e => {
    if (process.argv.includes('--json')) console.log(JSON.stringify({ jeu: e.jeu, appels: e.appels, entreeTokens: e.entreeTokens, borneHauteUsd: e.borneHauteUsd, attenduUsd: e.attenduUsd }));
    else console.log('Jeu « ' + e.jeu + ' » : ' + e.appels + ' appels à Anthropic (modèle des agents), ~' + e.entreeTokens + ' jetons d’entrée. Coût attendu ≈ ' + e.attenduUsd.toFixed(2) + ' $ ; borne haute (sortie au maximum permis) ' + e.borneHauteUsd.toFixed(2) + ' $.');
    process.exit(0);
  }).catch(err => { console.error('estimation impossible : ' + err.message); process.exit(2); });
}
module.exports = { estimer };
