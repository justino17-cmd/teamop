// SONDE « la page SEULE n'a pas changé » : l'atelier sans ?app=1 doit rendre et ranger comme avant. Deux pages dans une racine temporaire : l'ORIGINE (la source d'avant le mode « dans OP GESTION »,
// copie gardée dans le dossier temporaire, sinon relue du commit 629da64) et l'ACTUELLE (apercu/prototype-documents.html). Le même parcours est joué sur chacune, dans un contexte neuf :
// accueil, compositeur de devis, compositeur de contrat, éditeur, envoi — de jour et de nuit, sur ordinateur et téléphone. On compare la STRUCTURE rendue (balise, classe, texte, boîte
// au pixel près, pour chaque élément visible) et les CLÉS de rangement. Rend « N ✓ · M ✗ », sort en 1 si un contrôle tombe.
const fs = require('fs'), path = require('path'), cp = require('child_process');
const TMP = process.env.TMP_SEULE || '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/racine-seule';
const DEPOT = path.join(__dirname, '..', '..', '..'), ORIGINE_CAP = '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/atelier/page-origine.source';
fs.mkdirSync(path.join(TMP, 'apercu'), { recursive: true }); fs.mkdirSync(path.join(TMP, 'x', 'y', 'z'), { recursive: true });
const orig = fs.existsSync(ORIGINE_CAP) ? fs.readFileSync(ORIGINE_CAP, 'utf8') : cp.execSync('git show 629da64:scratchpad/proto-final/atelier/page.source', { cwd: DEPOT, maxBuffer: 1 << 28 }).toString();
const gabarit = s => '<!doctype html>\n<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="robots" content="noindex,nofollow"></head><body>\n' + s + '\n</body>\n</html>\n';
fs.writeFileSync(path.join(TMP, 'apercu', 'doc-origine.html'), gabarit(orig));
fs.writeFileSync(path.join(TMP, 'apercu', 'doc-actuel.html'), fs.readFileSync(process.env.ACTUEL || path.join(DEPOT, 'apercu', 'prototype-documents.html'), 'utf8'));      // ACTUEL : une copie mutée (atelier-mutations)
process.env.RACINE = TMP;
const A = require('./atelier-outils.js'), L = A.L, v = L.v;
const sig = p => p.evaluate(() => [...document.querySelectorAll('body *')].filter(e => (e.offsetParent !== null || getComputedStyle(e).position === 'fixed') && !/^(SCRIPT|STYLE|SVG|USE|PATH)$/i.test(e.tagName) && !e.closest('svg') && !e.closest('#enreg, #toasts')).map(e => { const r = e.getBoundingClientRect(); return [e.tagName, typeof e.className === 'string' ? e.className : '', e.childNodes.length === 1 && e.firstChild.nodeType === 3 ? e.textContent.trim().slice(0, 80) : '', Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)].join('|'); }));
const diff = (a, b) => { const out = []; for (let i = 0; i < Math.max(a.length, b.length) && out.length < 4; i++) if (a[i] !== b[i]) out.push([i, a[i], b[i]]); return out; };
async function parcours(page, profil, nuit) {
  const c = await L.ouvrir({ profil, nuit, app: false, qui: null, page, attente: 1500 }), p = c.p, S = {}, clic = async s => { const l = p.locator(s).first(); if (c.doigt) await l.tap({ timeout: 5000 }); else await l.click({ timeout: 5000 }); await p.waitForTimeout(500); };
  await L.calme(p, 800); S.accueil = await sig(p); S.attrs = await p.evaluate(() => [document.documentElement.getAttribute('data-theme'), document.documentElement.getAttribute('data-app'), document.querySelector('.mode-seg') && getComputedStyle(document.querySelector('.mode-seg')).display, document.querySelector('.acc-marque') && getComputedStyle(document.querySelector('.acc-marque')).display]);
  await clic('[data-act="theme"][data-v="dark"]'); S.theme = await p.evaluate(() => [document.documentElement.getAttribute('data-theme'), localStorage.getItem('documents-sur-mesure-theme')]);
  await clic('[data-act="theme"][data-v="auto"]');
  await clic('[data-act="devis-vierge"]'); await L.calme(p, 900); S.compoDevis = await sig(p);
  await p.locator('#vv-objet').fill('Essai de la page seule'); await clic('[data-vv="client"][data-id="c1"]'); await clic('[data-vv="art-add"][data-id="CL-M25"]'); await L.calme(p, 600); S.compoDevis2 = await sig(p);
  await clic('[data-act="vierge-creer"]'); await L.calme(p, 1000); S.editeur = await sig(p); S.numero = await p.evaluate(() => D().meta.numero);
  await clic('[data-act="envoyer"]:visible'); await L.calme(p, 800); S.envoi = await sig(p); await p.keyboard.press('Escape'); await p.waitForTimeout(300);
  await clic('[data-act="retour"]:visible'); await L.calme(p, 700); S.accueil2 = await sig(p);
  await clic('[data-act="contrat-vierge"]'); await L.calme(p, 900); S.compoContrat = await sig(p); await clic('[data-fen-x]'); await p.waitForTimeout(500);
  const dem = await p.locator('.voile .dialogue [data-r="1"]').count(); if (dem) await p.locator('.voile .dialogue [data-r="1"]').click();
  await clic('[data-act="ident-ouvrir"]'); await p.locator('[data-id="nom"]').fill('Entreprise d\'essai'); await clic('[data-ic="enregistrer"]'); await L.calme(p, 700); S.ident = await sig(p);
  S.cles = await p.evaluate(() => Object.keys(localStorage).sort()); S.numeros = await p.evaluate(() => S.docs.map(d => d.meta.numero).sort());
  S.accueil3 = await sig(p); S.err = c.err; await L.fin(c); return S;
}
(async () => {
  for (const [profil, nuit] of process.env.SEULE_UNE ? [['mac', false]] : [['mac', false], ['mac', true], ['iphone', false], ['iphone', true]]) {      // SEULE_UNE=1 : un seul passage (les mutations)
    const tag = profil + (nuit ? ' nuit' : ' jour'), O = await parcours('doc-origine.html', profil, nuit), N = await parcours('doc-actuel.html', profil, nuit);
    for (const k of ['accueil', 'compoDevis', 'compoDevis2', 'editeur', 'envoi', 'accueil2', 'compoContrat', 'ident', 'accueil3']) {
      v(`${tag} · ${k} : même structure, mêmes boîtes au pixel près (population ${N[k].length} éléments)`, N[k].length > 15 && O[k].length === N[k].length && !diff(O[k], N[k]).length, diff(O[k], N[k]));
    }
    v(`${tag} · mêmes attributs de départ (pas de data-app, sélecteur de thème visible, marque visible)`, JSON.stringify(O.attrs) === JSON.stringify(N.attrs) && N.attrs[1] === null && N.attrs[2] !== 'none' && N.attrs[3] !== 'none', [O.attrs, N.attrs]);
    v(`${tag} · le thème « Nuit » est rangé comme avant (data-theme et clé)`, JSON.stringify(O.theme) === JSON.stringify(N.theme) && N.theme[0] === 'dark' && N.theme[1] === 'dark', [O.theme, N.theme]);
    v(`${tag} · les CLÉS de rangement sont les mêmes (population ${N.cles.length})`, N.cles.length >= 4 && N.cles.includes('documents-sur-mesure-entreprise') && JSON.stringify(O.cles) === JSON.stringify(N.cles) && N.cles.every(k => /^documents-sur-mesure-/.test(k) && !/-opg-/.test(k)), [O.cles, N.cles]);
    v(`${tag} · les numéros sont ceux d'avant (DEV-2026-…, CTR-2026-…)`, JSON.stringify(O.numeros) === JSON.stringify(N.numeros) && N.numeros.some(n => /^DEV-2026-033$/.test(n)), [O.numeros, N.numeros]);
    v(`${tag} · aucune erreur de page, ni d'un côté ni de l'autre`, O.err.length === 0 && N.err.length === 0, [O.err, N.err]);
  }
  await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
