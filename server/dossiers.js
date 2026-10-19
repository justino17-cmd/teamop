/* LES DOSSIERS CLIENTS (19 octobre 2026) — un numéro par client, que Justin donne à un agent : « traite le dossier DOS-000123 ».
 *
 * Justin : « il faudrait faire des numéros de dossier à chaque client, comme ça les agents, si j'ai besoin d'un agent pour qu'il traite
 * un client sur une erreur, ou corrige des choses, je lui donne le numéro de dossier du client et il a tout. »
 *
 * ⛔ Un numéro est une FORME FERMÉE (`DOS-` + six chiffres) : il passe d'un agent à l'autre sans qu'aucune phrase de client ne voyage.
 * ⛔ Un numéro n'est JAMAIS réutilisé : `prochain` ne redescend pas, même si le client est supprimé (le numéro reste, sa fiche dit
 *    « client supprimé »). Les clients d'avant reçoivent le leur dans l'ordre d'inscription (rétro-attribution) : un numéro se
 *    mérite une fois, pas à chaque redémarrage — `parCle` est la mémoire, indexée par l'EMPREINTE de l'adresse (pas l'adresse).
 * ⛔ `dossiers.json` ne s'écrit que par temporaire puis renommage, et JAMAIS par-dessus un fichier qu'on n'a pas pu lire (la règle
 *    d'`espaces.json`) : illisible, plus aucun numéro ne s'attribue (on rend `null`, jamais un numéro inventé qui pourrait en doubler un).
 * ⛔ La FICHE (coordonnées comprises) n'est lisible que par le patron : les coordonnées d'un client ne sont pas pour un simple admin.
 *    Le module ne parle ni à Stripe ni au courrier : le paiement lui est INJECTÉ.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const FORME = /^DOS-\d{6}$/;
const F = 'dossiers.json';
const empreinte = email => crypto.createHash('sha256').update(String(email || '').trim().toLowerCase()).digest('hex');
const numero = n => 'DOS-' + String(n).padStart(6, '0');

module.exports = function monterDossiers(app, ctx) {
  const { DATA_DIR, monPatronStrict } = ctx;
  const clients = typeof ctx.clients === 'function' ? ctx.clients : (() => ({}));
  const espaceDe = typeof ctx.espaceDe === 'function' ? ctx.espaceDe : (() => null);
  const paiement = typeof ctx.paiement === 'function' ? ctx.paiement : (async () => ({ etat: 'inconnu' }));
  let illisible = false;
  function charger() {
    let brut;
    try { brut = fs.readFileSync(path.join(DATA_DIR, F), 'utf8'); }
    catch (e) { if (e && e.code === 'ENOENT') return { prochain: 1, parCle: {}, parNumero: {} }; illisible = true; return { prochain: 1, parCle: {}, parNumero: {} }; }
    try {
      const j = JSON.parse(brut);
      if (!j || typeof j !== 'object' || Array.isArray(j) || !j.parCle || typeof j.parCle !== 'object' || !Number.isInteger(j.prochain) || j.prochain < 1) throw new Error('forme');
      const parNumero = {}; for (const [k, n] of Object.entries(j.parCle)) { if (!FORME.test(n)) throw new Error('numéro illisible'); parNumero[n] = k; }
      return { prochain: j.prochain, parCle: j.parCle, parNumero };
    } catch (e) { illisible = true; return { prochain: 1, parCle: {}, parNumero: {} }; }
  }
  let etat = charger();
  function ecrire() {
    if (illisible) { console.error('⛔ ' + F + ' NON réécrit : il était illisible au démarrage — le réparer, puis redémarrer'); return false; }
    try {
      const f = path.join(DATA_DIR, F), tmp = f + '.tmp';
      fs.writeFileSync(tmp, JSON.stringify({ prochain: etat.prochain, parCle: etat.parCle }));
      fs.renameSync(tmp, f);
      return true;
    } catch (e) { console.error(F + ' non écrit :', e.message); return false; }
  }
  /* Le numéro d'un client, créé s'il n'en a pas. `null` = on ne sait pas / on n'a pas pu l'écrire : jamais un numéro qui ne serait pas gravé. */
  function numeroDe(email) {
    const m = String(email || '').trim().toLowerCase();
    if (!m || !m.includes('@') || illisible) return null;
    const k = empreinte(m);
    if (etat.parCle[k]) return etat.parCle[k];
    const n = numero(etat.prochain);
    etat.parCle[k] = n; etat.parNumero[n] = k; etat.prochain++;
    if (!ecrire()) { delete etat.parCle[k]; delete etat.parNumero[n]; etat.prochain--; return null; }
    return n;
  }
  /* La rétro-attribution : dans l'ordre d'inscription, puis par adresse (un ordre STABLE : deux démarrages donnent les mêmes numéros). */
  function attribuerTous() {
    if (illisible) return 0;
    const c = clients() || {};
    const ordre = Object.keys(c).filter(m => !etat.parCle[empreinte(m)]).sort((a, b) => (Number((c[a] || {}).inscrit) || 0) - (Number((c[b] || {}).inscrit) || 0) || (a < b ? -1 : 1));
    if (!ordre.length) return 0;
    const avant = JSON.stringify([etat.prochain, etat.parCle]);
    for (const m of ordre) { const k = empreinte(m), n = numero(etat.prochain); etat.parCle[k] = n; etat.parNumero[n] = k; etat.prochain++; }
    if (!ecrire()) { const o = JSON.parse(avant); etat.prochain = o[0]; etat.parCle = o[1]; etat.parNumero = {}; for (const [k, n] of Object.entries(o[1])) etat.parNumero[n] = k; return 0; }
    return ordre.length;
  }
  const tronque = (t, n) => String(t == null ? '' : t).replace(/[\u0000-\u001f]/g, ' ').slice(0, n);
  const emailDe = n => { const k = etat.parNumero[n]; if (!k) return null; const c = clients() || {}; return Object.keys(c).find(m => empreinte(m) === k) || ''; };

  /* La fiche : ce que le serveur SAIT, composé ici — jamais ce qu'un agent en dit. */
  async function fiche(n) {
    if (!FORME.test(String(n || '')) || !etat.parNumero[n]) return null;
    const email = emailDe(n);
    if (!email) return { numero: n, supprime: true };
    const c = (clients() || {})[email] || {};
    const sp = espaceDe(email) || null;
    let pay; try { pay = await paiement(email, sp && sp.slug); } catch (e) { pay = { etat: 'inconnu' }; }
    return {
      numero: n, supprime: false,
      client: { entreprise: tronque(c.entreprise, 80), prenom: tronque(c.prenom, 40), nom: tronque(c.nomFam || c.nom, 80), email, tel: tronque(c.tel, 30), inscrit: Number(c.inscrit) || 0,
        apps: (Array.isArray(c.apps) ? c.apps : []).slice(0, 6).map(a => tronque(a, 20)), plan: tronque(c.plan, 40), planStatus: tronque(c.planStatus, 20), promo: tronque(c.promo, 60),
        note: tronque(c.noteInterne, 500) },
      demandes: (Array.isArray(c.demandes) ? c.demandes : []).slice(0, 10).map(d => ({ app: tronque(d && d.app, 60), formule: tronque(d && d.formule, 40), statut: tronque(d && d.statut, 20), date: Number(d && d.date) || 0 })),
      espace: sp ? { existe: true, slug: tronque(sp.slug, 80), formule: tronque(sp.formule, 20), creeLe: Number(sp.ts) || 0 } : { existe: false },
      paiement: { etat: ['paye', 'impaye', 'aucun', 'inconnu'].includes(pay && pay.etat) ? pay.etat : 'inconnu', formule: pay && pay.formule ? tronque(pay.formule, 20) : '' } };
  }

  app.get('/api/monitor/dossiers', monPatronStrict, (req, res) => {
    if (illisible) return res.status(503).json({ error: 'Le registre des dossiers est illisible' });
    attribuerTous();
    const q = String(req.query.q || '').trim().toLowerCase().slice(0, 80);
    const c = clients() || {};
    const lignes = Object.keys(c).map(m => ({ numero: etat.parCle[empreinte(m)] || '', entreprise: tronque((c[m] || {}).entreprise, 80), inscrit: Number((c[m] || {}).inscrit) || 0, espace: !!espaceDe(m) }))
      .filter(l => l.numero && (!q || l.numero.toLowerCase().includes(q) || l.entreprise.toLowerCase().includes(q)))
      .sort((a, b) => (a.numero < b.numero ? 1 : -1));
    res.json({ ok: true, total: lignes.length, dossiers: lignes.slice(0, 100) });
  });
  app.get('/api/monitor/dossiers/:numero', monPatronStrict, async (req, res) => {
    if (illisible) return res.status(503).json({ error: 'Le registre des dossiers est illisible' });
    const n = String(req.params.numero || '').toUpperCase();
    if (!FORME.test(n)) return res.status(400).json({ error: 'Numéro de dossier : DOS- suivi de six chiffres' });
    try {
      const f = await fiche(n);
      if (!f) return res.status(404).json({ error: 'Dossier inconnu' });
      res.json({ ok: true, dossier: f });
    } catch (e) { console.error('dossier :', e.message); res.status(500).json({ error: 'Dossier non lu' }); }
  });

  attribuerTous();
  return { numeroDe, attribuerTous, fiche, FORME, estIllisible: () => illisible };
};
module.exports.FORME = FORME;
