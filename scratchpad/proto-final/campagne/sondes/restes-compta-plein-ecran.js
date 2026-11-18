// Comptabilité plein écran (#cpsys) : (1) au téléphone UN SEUL bouton à trois traits visible, et il marche (celui d'OP GESTION, « Menu », dans la barre
// du cadre : c'est lui qui ouvre la feuille des rubriques d'OP GESTION ; le ≡ de l'en-tête de la Comptabilité, dans l'iframe, s'efface — la barre du bas
// « Plus » porte déjà ses rubriques) ; (2) un message de la page posé pendant que la Comptabilité est en plein écran passe AU-DESSUS du cadre.
// Contre-épreuves : ordinateur/tablette inchangés (aucun bouton « Menu » dans la barre, le ≡ de la Comptabilité reste là où il existait), le menu d'OP GESTION reste
// accessible au téléphone, la Comptabilité hors plein écran (dans OP GESTION) n'est pas touchée.
// usage : node restes-compta-plein-ecran.js — « N ✓ · M ✗ », sort en 1 si un contrôle tombe. 127.0.0.1 seulement.
const path = require('path'), L = require('../../lib.js'), v = L.v;
const CAP = process.env.CAP || '/tmp/claude-0/-home-user-teamop/8635c152-538b-540f-897d-db2367154ee4/scratchpad/cap/compta-plein-ecran/';
const PAGE = process.env.PAGE || 'prototype-op-gestion.html';
const TEL = ['iphone', 'petit', 'android'], BUREAU = ['mac', 'ipad'];
async function plein(c) { await c.p.evaluate(() => { try { cpSysAllerRubrique('comptabilite'); } catch (e) {} }); await L.calme(c.p, 900);
  await c.p.waitForFunction(() => !!document.querySelector('#cpsys:not([hidden]) iframe'), null, { timeout: 8000 }).catch(() => {}); await c.p.waitForTimeout(2200); }
// les boutons « trois traits » visibles : dans la barre du cadre (page du haut) et dans l'iframe de la Comptabilité
async function trois(c) {
  const hote = await c.p.evaluate(() => [...document.querySelectorAll('#cpsys .cpsys-barre button')].filter(b => b.getBoundingClientRect().width > 0 && b.querySelector('path[d*="M4 7h16"]')).map(b => { const r = b.getBoundingClientRect(); return { t:(b.getAttribute('aria-label') || b.textContent).trim(), h:Math.round(r.height) }; }));
  const f = L.cadre(c.p, /prototype-comptabilite\.html/);
  const cad = f ? await f.evaluate(() => [...document.querySelectorAll('.barre .ouvrir-menu')].filter(b => { const r = b.getBoundingClientRect(), s = getComputedStyle(b); return r.width > 0 && s.visibility !== 'hidden' && s.display !== 'none'; }).map(b => ({ t:(b.getAttribute('aria-label') || b.textContent).trim() }))) : null;
  return { hote, cad, cadreTrouve: !!f }; }
(async () => {
  for (const [profil, nuit] of [['iphone', false], ['iphone', true], ['petit', true], ['petit', false], ['android', false], ['android', true], ['ipad', false], ['ipad', true], ['mac', false], ['mac', true]]) {
    const tel = TEL.includes(profil), tag = `${profil}${nuit ? ' nuit' : ' jour'}`;
    const c = await L.ouvrir({ profil, nuit, qui:'marc', page:undefined }); await L.calme(c.p, 700); await plein(c);
    const ouvert = await c.p.evaluate(() => !!document.querySelector('#cpsys:not([hidden])')); v(`${tag} : la Comptabilité plein écran est ouverte (population)`, ouvert);
    const T = await trois(c); v(`${tag} : le cadre de la Comptabilité est chargé (population)`, T.cadreTrouve, T);
    const n = T.hote.length + (T.cad ? T.cad.length : 0);
    if (tel) { v(`${tag} : UN SEUL bouton à trois traits visible (hôte ${T.hote.length} + cadre ${T.cad ? T.cad.length : '?'})`, n === 1 && T.hote.length === 1 && T.hote[0].h >= 44, T);
      // il marche : la feuille des rubriques d'OP GESTION s'ouvre AU-DESSUS de la Comptabilité
      await L.capture(c, CAP + `${profil}-${nuit ? 'nuit' : 'jour'}-barre.png`);
      await L.toucher(c, '#cpsys .cpsys-menu'); await L.calme(c.p, 600);
      const f = await c.p.evaluate(() => { const P = document.querySelector('#calque .panneau'), r = P ? P.getBoundingClientRect() : null, e = r ? document.elementFromPoint(r.left + r.width / 2, r.top + 40) : null; return { feuille:!!P, auDessus:!!e && !!P && P.contains(e) }; });
      v(`${tag} : le bouton restant ouvre la feuille « Menu » d'OP GESTION, au-dessus de la Comptabilité`, f.feuille && f.auDessus, f);
      await c.p.evaluate(() => { try { fermerPanneau(); } catch (e) {} }); await L.calme(c.p, 400);
    } else { v(`${tag} : ordinateur/tablette inchangés : aucun bouton « Menu » dans la barre du cadre`, T.hote.length === 0, T); }
    // (2) un message de la page, pendant la Comptabilité plein écran : il se voit AU-DESSUS (elementFromPoint au centre de la bulle = la bulle)
    const M = await c.p.evaluate(async () => { toast('Message de la page pendant la Comptabilité'); await new Promise(r => setTimeout(r, 700)); const t = document.getElementById('toast'); if (!t) return { bulle:false };
      t.style.pointerEvents = 'auto';   /* la bulle laisse passer le toucher : elementFromPoint la sauterait, et on mesure l'ORDRE DE PEINTURE, pas le toucher */
      const r = t.getBoundingClientRect(), e = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return { bulle:true, vue:r.width > 0 && getComputedStyle(t).opacity > 0.9, auDessus:!!e && (t === e || t.contains(e)), sur:e ? (e.id || e.tagName) : null, bas:Math.round(innerHeight - r.bottom), z:getComputedStyle(t).zIndex }; });
    v(`${tag} : un message de la page posé pendant la Comptabilité plein écran est AU-DESSUS du cadre et lisible`, M.bulle && M.vue && M.auDessus, M);
    await L.capture(c, CAP + `${profil}-${nuit ? 'nuit' : 'jour'}-message.png`);
    await c.p.evaluate(() => { sortieCarte('Copie ce texte à la main', 'FA-2026-0042', { aide:'Appuie longtemps sur le texte (ou Ctrl + C) pour le copier.' }); }); await L.calme(c.p, 500); await L.capture(c, CAP + `${profil}-${nuit ? 'nuit' : 'jour'}-carte.png`);
    // (2 bis) la carte « Copie ce texte » (copie de secours, numéro après un lien tel:) est un message de la page aussi : elle passe AU-DESSUS du cadre
    const S = await c.p.evaluate(async () => { sortieCarte('Copie ce texte à la main', 'FA-2026-0042', { aide:'Appuie longtemps sur le texte.' }); await new Promise(r => setTimeout(r, 500)); const z = document.getElementById('sortie-carte'); if (!z) return { carte:false };
      const r = z.getBoundingClientRect(), e = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2), x = z.querySelector('.sc-x').getBoundingClientRect(), ex = document.elementFromPoint(x.left + x.width / 2, x.top + x.height / 2);
      const res = { carte:true, dansEcran:r.top >= 0 && r.bottom <= innerHeight, auDessus:!!e && z.contains(e), fermeRecoit:!!ex && z.contains(ex), sur:e ? (e.id || e.tagName) : null, z:getComputedStyle(z).zIndex }; z.remove(); return res; });
    v(`${tag} : la carte « Copie ce texte » posée pendant la Comptabilité plein écran est AU-DESSUS du cadre, dans l'écran, et sa croix reçoit le toucher`, S.carte && S.dansEcran && S.auDessus && S.fermeRecoit, S);
    // (3) le toast qui porte un geste (« Annuler ») reçoit le toucher
    await c.p.evaluate(() => { const z = document.getElementById("sortie-carte"); if (z) z.remove(); });
    const A = await c.p.evaluate(async () => { let ok = false; toast('Geste annulable', { lib:'Annuler', fn:() => { ok = true; } }); await new Promise(r => setTimeout(r, 700)); const b = document.querySelector('#toast button'); if (!b) return { bouton:false };
      const r = b.getBoundingClientRect(), e = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return { bouton:true, recoit:!!e && (e === b || b.contains(e)) }; });
    v(`${tag} : le bouton « Annuler » de la bulle reçoit le toucher (rien ne le recouvre)`, A.bouton && A.recoit, A);
    v(`${tag} : aucune erreur JavaScript`, c.err.length === 0, c.err.slice(0, 3)); await L.fin(c); }
  // contre-épreuve : hors plein écran (la Comptabilité d'OP GESTION), la bulle garde son empilement d'origine (90) et le menu de la page reste le sien
  { const c = await L.ouvrir({ profil:'iphone', qui:'marc' }); await c.p.evaluate(() => { try { aller('clients'); } catch (e) {} }); await L.calme(c.p, 500);
    const z = await c.p.evaluate(() => { toast('x'); return { z:getComputedStyle(document.getElementById('toast')).zIndex, cpsys:!!document.querySelector('#cpsys:not([hidden])'), menu:!![...document.querySelectorAll('[data-menu="ouvrir"]')].find(b => b.getBoundingClientRect().width > 0) }; });
    v('hors Comptabilité plein écran : bulle à son empilement d\'origine (90) et bouton « Menu » de la page visible', z.z === '90' && !z.cpsys && z.menu, z); await L.fin(c); }
  await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.error('PLANTÉ', e.message); process.exit(2); });
