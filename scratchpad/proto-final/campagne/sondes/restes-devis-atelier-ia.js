// Restes devis-atelier, tour 2 (finition) — « Créer avec l'IA » JOUÉ DE BOUT EN BOUT. Où il vit : l'écran d'entrée « Contrats » de la page « Documents sur mesure » (prototype-documents.html seule).
// Dans OP GESTION l'entrée est contournée (le bouton « Contrat » ouvre directement le contrat vierge) : la carte n'y existe pas — la sonde le CONSTATE (population comptée) au lieu de le supposer.
// Sans hôte Claude (cas ici), l'atelier DIT que l'IA est absente et compose depuis les modèles : c'est ce chemin qui est joué, de la carte au contrat composé.
// Usage : node … [profil] [nuit]. Rend « N ✓ · M ✗ », sort en 1 si un contrôle tombe. CAPT=1 : captures (à REGARDER).
const O = require('./devis-atelier-outils.js'), L = O.L, A = O.A, v = L.v;
(async () => {
  const profil = process.argv[2] || 'mac', nuit = process.argv[3] === 'nuit', tag = profil + (nuit ? '-nuit' : '');
  // 1. dans OP GESTION : la carte n'est pas atteignable
  const g = await L.ouvrir({ profil, nuit, qui: 'marc', hash: 'contrats' });
  const fg = await A.ouvrirAtelier(g, 'contrat', 'contrats'); await L.calme(g.p, 600);
  v(`${tag} · dans OP GESTION le contrat s'ouvre sur le contrat vierge (pas d'entrée, donc pas de carte IA : ${await fg.locator('[data-act="ia-ouvrir"]').count()} trouvée)`, (await fg.locator('[data-act="ia-ouvrir"]').count()) === 0 && (await fg.locator('[data-act="vierge-creer"]:visible').count()) >= 1);
  await L.fin(g);
  // 2. page seule : le parcours entier
  const c = await L.ouvrir({ profil, nuit, app: false, qui: null, page: 'prototype-documents.html', attente: 1500 }), p = c.p;
  const clic = async s => { const e = p.locator(s + ':visible').first(); if (c.doigt) await e.tap({ timeout: 5000 }); else await e.click({ timeout: 5000 }); };
  await clic('[data-act="entree-contrats"]'); await p.waitForTimeout(700);
  v(`${tag} · l'entrée Contrats propose « Créer avec l'IA »`, (await p.locator('[data-act="ia-ouvrir"]:visible').count()) >= 1);
  await clic('[data-act="ia-ouvrir"]'); await p.waitForTimeout(800);
  const fen = await p.evaluate(() => { const e = document.querySelector('.ia-creer'); return e ? { texte: e.innerText.replace(/\s+/g, ' ').slice(0, 300), go: (document.querySelector('#ia-go') || {}).textContent } : null; });
  v(`${tag} · la fenêtre s'ouvre, dit que l'IA est absente et propose « ${fen && fen.go} »`, !!fen && /Composer un exemple|Créer le contrat/.test(fen.go || ''), fen);
  if (process.env.CAPT) await L.capture(c, O.CAP + `ia-1-${tag}.png`);
  await clic('[data-act="ia-exemple"]'); await p.waitForTimeout(300);
  const desc = await p.locator('#ia-desc').inputValue();
  v(`${tag} · « Mettre l'exemple » remplit la description (${desc.length} signes)`, desc.length > 20, desc);
  const avant = await p.evaluate(() => document.querySelectorAll('.feuille').length);
  await clic('#ia-go');
  let ok = false; for (let i = 0; i < 40 && !ok; i++) { await p.waitForTimeout(250); ok = await p.evaluate(() => !document.querySelector('.ia-creer') && !!document.querySelector('.feuille')); }
  const ap = await p.evaluate(() => ({ feuilles: document.querySelectorAll('.feuille').length, texte: (document.querySelector('.feuille') || {}).innerText || '' }));
  v(`${tag} · la fenêtre se ferme et un contrat est composé (${avant} → ${ap.feuilles} feuille(s), ${ap.texte.length} signes)`, ok && ap.feuilles >= 1 && ap.texte.length > 200, { ...ap, texte: ap.texte.slice(0, 120) });
  v(`${tag} · aucune erreur de page`, !(c.err || []).length, c.err);
  if (process.env.CAPT) await L.capture(c, O.CAP + `ia-2-${tag}.png`);
  await L.fin(c);
})();
