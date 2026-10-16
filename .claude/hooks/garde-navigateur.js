#!/usr/bin/env node
'use strict';
/* ══ GARDE NAVIGATEUR — hook PreToolUse de Claude Code, sur les outils mcp__chrome-devtools__.* ═════════════════
 *
 * ⛔ POURQUOI. CLAUDE.md, « Chrome DevTools MCP — bêta seulement, sans exception » : le serveur MCP expose au modèle
 * TOUT le contenu de la page ouverte, et `app.html` en production porte les noms, adresses et coordonnées de vrais
 * clients — un flux qui n'est pas couvert par `sous-traitance.html`. La règle tenait jusqu'ici à la discipline.
 *
 * Ce qui passe : la bêta (`beta.html`) et les copies d'aperçu (`apercu/…`), d'où qu'elles soient servies ; tout ce
 * qui est servi en LOCAL (127.x, localhost, ::1, file:) sauf `app.html` ; les pages sans réseau (about:, data:…).
 * Ce qui est refusé : `app.html` hors aperçu, partout, et tout autre hôte distant (teamop.fr/tour.html,
 * api.teamop.fr…). On ne garde que les portes qui prennent une adresse (`new_page`, `navigate_page`) : une
 * navigation lancée par un script dans la page leur échappe — c'est une garde, pas une cage.
 * `tests/test-996.js` joue chaque cas.
 */

function refus(u) {
  let x;
  try { x = new URL(u); } catch { return null; }                     // pas une adresse : Chrome la refusera lui-même
  if (x.protocol === 'view-source:') return refus(u.slice('view-source:'.length));
  if (!['http:', 'https:', 'file:'].includes(x.protocol)) return null;
  let p = x.pathname;
  try { p = decodeURIComponent(p); } catch { /* adresse mal encodée : on juge le texte brut */ }
  p = p.toLowerCase();
  const apercu = /\/apercu\//.test(p);
  if (/\/app\.html$/.test(p) && !apercu) return '`app.html` est l\'application de PRODUCTION, même servie en local';
  if (x.protocol === 'file:') return null;
  const h = x.hostname.toLowerCase();
  if (/^127\./.test(h) || h === 'localhost' || h === '[::1]' || h === '::1') return null;
  if (/\/beta\.html$/.test(p) || apercu) return null;
  return `hôte distant (${x.hostname}) hors bêta et hors aperçu`;
}

let brut = '';
process.stdin.on('data', d => { brut += d; });
process.stdin.on('end', () => {
  let entree;
  try { entree = JSON.parse(brut); } catch { process.exit(0); }
  const ti = (entree && entree.tool_input) || {};
  for (const u of [ti.url, ti.uri]) {
    if (typeof u !== 'string' || !u) continue;
    const r = refus(u.trim());
    if (r) {
      process.stderr.write(`⛔ garde-navigateur : ${u} refusée — ${r}. CLAUDE.md : « Bêta uniquement, sans exception » ` +
        `(le navigateur piloté expose toute la page au modèle, et la production porte des données de vrais clients). ` +
        `Servir le dépôt sur 127.0.0.1 et ouvrir beta.html, ou une copie d'aperçu (bash scripts/apercu.sh <page>).\n`);
      process.exit(2);
    }
  }
  process.exit(0);
});
