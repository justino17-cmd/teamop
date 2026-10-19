/* ══ LE JOURNAL CHAÎNÉ — CHAQUE LIGNE PORTE L'EMPREINTE DE LA PRÉCÉDENTE ═══════════════════════════════════════════════
 * Le dossier de preuve d'une signature est un journal de ce qui s'est passé (envoyé, ouvert, code envoyé, code validé, signé…).
 * Chaque ligne contient `prev` (l'empreinte de la ligne d'avant) et `h` (son empreinte à elle, calculée sur `prev` et sur ses propres
 * champs) : modifier, retirer ou intervertir UNE ligne rend toute la suite invalide, et `verifier` dit à quel rang.
 * Les champs sont des valeurs simples (texte, nombre, booléen) : l'écriture canonique est celle des clés TRIÉES, donc la même sur
 * toute machine. ⛔ Rien ici n'est un secret : le code à usage unique, lui, n'entre JAMAIS dans une ligne.
 */
'use strict';
const crypto = require('crypto');
const ZERO = '0'.repeat(64);
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');
const canon = (o) => JSON.stringify(Object.keys(o).sort().map((k) => [k, o[k]]));

function ajouter(journal, t, evt, champs) {
  const prev = journal.length ? journal[journal.length - 1].h : ZERO;
  const e = { t, evt: String(evt) };
  for (const k of Object.keys(champs || {})) {
    const v = champs[k];
    if (k === 't' || k === 'evt' || k === 'prev' || k === 'h') continue;
    if (typeof v === 'string') e[k] = v.slice(0, 200); else if (typeof v === 'number' || typeof v === 'boolean') e[k] = v;
  }
  e.prev = prev; e.h = sha(prev + '|' + canon(e));
  journal.push(e); return e;
}
/* { ok:true } ou { ok:false, rang } : le rang (à partir de 1) de la première ligne qui ne tient pas. */
function verifier(journal) {
  let prev = ZERO;
  for (let i = 0; i < journal.length; i++) {
    const e = journal[i]; if (!e || typeof e !== 'object') return { ok: false, rang: i + 1 };
    const { h, ...reste } = e;
    if (reste.prev !== prev || h !== sha(prev + '|' + canon(reste))) return { ok: false, rang: i + 1 };
    prev = h;
  }
  return { ok: true, derniere: prev };
}
module.exports = { ajouter, verifier, sha, ZERO };
