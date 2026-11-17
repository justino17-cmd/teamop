// RELEVÉ DES MOTS (voie « final-mots », 17 novembre 2026). On lit TOUT le texte qu'une personne voit, par le NAVIGATEUR (le texte rendu,
// les aria-label, title, placeholder, options, alt ; cadres compris), pour chaque rôle : chaque rubrique, puis chaque geste visible
// (onglet, bouton, ligne, menu) jusqu'à trois niveaux — fenêtre, feuille, toast, boîte de confirmation — en REJOUANT le chemin depuis
// la rubrique à chaque fois (une vue qui s'anime ou qui se redessine ne rend jamais deux fois la même liste : on vise par SIGNATURE).
// Sortie : /tmp/…/cap/final-mots/<rôle>-<profil>.json (hors dépôt, comme les captures). ⛔ 127.0.0.1 seulement, entreprise fictive.
// usage : node mots-releve.js <marc|julie|sm|kb|client> [profil] [routes séparées par des virgules] [--profondeur N] [--max N]
const L = require('../lib.js'); const fs = require('fs'), path = require('path');
const SORTIE = '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/final-mots/';
const args = [], opt = {}; { const t = process.argv.slice(2); for (let i = 0; i < t.length; i++) { if (t[i].startsWith('--')) { opt[t[i].slice(2)] = t[i + 1]; i++; } else args.push(t[i]); } }
const FICHIER_NOM = () => QUI + "-" + PROFIL + (opt.nom ? "-" + opt.nom : ROUTES ? "-" + ROUTES.join("+").slice(0, 80) : "") + ".json";
const QUI = args[0] || 'marc', PROFIL = args[1] || 'mac', ROUTES = args[2] ? args[2].split(',') : null;
const ATT = +(opt.attente || 280), BASE = +(opt.base || 500);
const PROF = +(opt.profondeur || 3), MAX = +(opt.max || 120), TEMPS_ROUTE = +(opt.temps || 150) * 1000;
// ce qu'on ne touche pas : sortir, télécharger vers l'extérieur, liens qui quittent la page
const EVITE = /^(se déconnecter|déconnexion)/i;
// ── recensement dans une zone (page ou cadre) : signature stable pour chaque élément qui répond
const RECENSER = (zone) => { const R = document.querySelector(zone) || document.body, vus = [], sig = new Set();
  for (const e of R.querySelectorAll('*')) { const cs = getComputedStyle(e); if (cs.visibility === 'hidden' || cs.display === 'none' || (!e.offsetParent && cs.position !== 'fixed')) continue;
    const dd = [...e.attributes].some(a => /^data-[a-z0-9-]+$/.test(a.name) && !/^data-(mots|tip)/.test(a.name));
    const clic = e.tagName === 'BUTTON' || e.tagName === 'SUMMARY' || (e.tagName === 'A' && e.getAttribute('href') && !/^(https?:|mailto:|tel:)/.test(e.getAttribute('href'))) || (e.tagName === 'INPUT' && /checkbox|radio|button|submit/.test(e.type)) || e.getAttribute('role') === 'button' || e.tagName === 'SELECT' || (dd && cs.cursor === 'pointer');
    if (!clic || e.disabled || e.getAttribute('aria-disabled') === 'true') continue; const r = e.getBoundingClientRect(); if (r.width < 2 || r.height < 2) continue;
    const d = [...e.attributes].filter(a => a.name.startsWith('data-') && !/^data-(mots|tip)/.test(a.name)).map(a => a.name + '=' + a.value.slice(0, 40)).join(' ');
    const lib = (e.getAttribute('aria-label') || e.textContent || e.title || '').replace(/[ \t\r\n\f\v]+/g, ' ').trim().slice(0, 60), s = e.tagName + '|' + lib + '|' + d;
    if (sig.has(s)) continue; sig.add(s); vus.push(s); }
  return vus; };
const CLIQUER = ({ zone, s, i }) => { const R = document.querySelector(zone) || document.body; let n = 0;
  for (const e of R.querySelectorAll('*')) { const cs = getComputedStyle(e); if (cs.visibility === 'hidden' || cs.display === 'none' || (!e.offsetParent && cs.position !== 'fixed')) continue;
    const dd = [...e.attributes].some(a => /^data-[a-z0-9-]+$/.test(a.name) && !/^data-(mots|tip)/.test(a.name));
    const clic = e.tagName === 'BUTTON' || e.tagName === 'SUMMARY' || (e.tagName === 'A' && e.getAttribute('href') && !/^(https?:|mailto:|tel:)/.test(e.getAttribute('href'))) || (e.tagName === 'INPUT' && /checkbox|radio|button|submit/.test(e.type)) || e.getAttribute('role') === 'button' || e.tagName === 'SELECT' || (dd && cs.cursor === 'pointer');
    if (!clic || e.disabled || e.getAttribute('aria-disabled') === 'true') continue; const r = e.getBoundingClientRect(); if (r.width < 2 || r.height < 2) continue;
    const d = [...e.attributes].filter(a => a.name.startsWith('data-') && !/^data-(mots|tip)/.test(a.name)).map(a => a.name + '=' + a.value.slice(0, 40)).join(' ');
    const lib = (e.getAttribute('aria-label') || e.textContent || e.title || '').replace(/[ \t\r\n\f\v]+/g, ' ').trim().slice(0, 60);
    if (e.tagName + '|' + lib + '|' + d !== s) continue;
    if (e.tagName === 'SELECT') { const o = [...e.options].filter(o => !o.selected); if (o[i || 0]) { e.value = o[i || 0].value; e.dispatchEvent(new Event('input', { bubbles: true })); e.dispatchEvent(new Event('change', { bubbles: true })); return 'select'; } return 'rien'; }
    e.scrollIntoView({ block: 'center' }); e.click(); return 'ok'; }
  return 'absent'; };
// ── lecture du texte d'une zone : lignes visibles + attributs lisibles + options de listes + textes des feuilles du bas
const LIRE = (zone) => { const R = document.querySelector(zone) || document.body;
  /* un cadre caché (display:none) n'est pas rendu : son innerText rend alors TOUT le texte du document, scripts et feuilles de style compris — on ne le lit pas */
  if (!R.getClientRects().length && R !== document.body) return { lignes: [], attrs: [] }; if (R === document.body && !document.documentElement.getClientRects().length) return { lignes: [], attrs: [] };
  R.querySelectorAll('details').forEach(d => { d.open = true; });
  const lignes = (R.innerText || '').split('\n').map(x => x.replace(/[ \t\r\n\f\v]+/g, ' ').trim()).filter(Boolean), attrs = [];
  const vis = e => !!(e.offsetParent || getComputedStyle(e).position === 'fixed') && getComputedStyle(e).visibility !== 'hidden';
  for (const e of R.querySelectorAll('[aria-label],[title],[placeholder],[alt]')) { if (!vis(e)) continue; for (const a of ['aria-label', 'title', 'placeholder', 'alt']) { const v = (e.getAttribute(a) || '').replace(/[ \t\r\n\f\v]+/g, ' ').trim(); if (v) attrs.push(a + ' : ' + v); } }
  for (const s of R.querySelectorAll('select')) { if (!vis(s)) continue; const lab = (s.getAttribute('aria-label') || (s.closest('label') ? s.closest('label').innerText.split('\n')[0] : '')).trim(); for (const o of s.options) { const v = (o.textContent || '').replace(/[ \t\r\n\f\v]+/g, ' ').trim(); if (v) attrs.push('option (' + lab.slice(0, 30) + ') : ' + v); } }
  for (const e of R.querySelectorAll('input[type=button],input[type=submit]')) if (vis(e) && e.value) attrs.push('bouton : ' + e.value);
  return { lignes, attrs: [...new Set(attrs)] }; };
const DESSUS = () => { const t = document.getElementById('toast'), q = document.querySelector('#calque .panneau'), d = document.getElementById('docplein'), nv = document.getElementById('nv');
  return { toast: t && t.classList.contains('on') ? t.textContent.trim() : '', panneau: q ? q.innerText.replace(/[ \t\r\n\f\v]+/g, ' ').trim() : '', docplein: d && !d.hidden ? (d.getAttribute('aria-label') || 'document') : '', hash: location.hash, nv: !!nv }; };
(async () => {
  const t0 = Date.now(); const res = { qui: QUI, profil: PROFIL, ecrans: {}, notes: [] };
  const c = QUI === 'client' ? await ouvrirClient() : await L.ouvrir({ profil: PROFIL, qui: QUI });
  const p = c.p; const dialogues = [];
  p.on('dialog', d => { dialogues.push(d.type() + ' : ' + d.message()); d.dismiss().catch(() => {}); });
  await p.evaluate(() => { window.open = () => null; });
  async function ouvrirClient() { const c = await L.ouvrir({ profil: PROFIL, qui: 'marc' }); await c.p.evaluate(() => { rlChanger('client', { cli: Object.keys(CLIENTS)[0], ec: 'accueil', muet: true }); }); await L.calme(c.p, 700); return c; }
  const routes = ROUTES || await p.evaluate(() => { const r = [...document.querySelectorAll('#menu a[href^="#"]')].map(a => a.getAttribute('href').slice(1)); return [...new Set(r)]; });
  // le texte fixe du poste : menu, barre du bas, pied (une fois)
  res.ecrans['(menu)'] = Object.assign(await p.evaluate(LIRE, '#menu'), { gestes: {} });
  const barre = await p.evaluate(LIRE, '#barre-bas'); res.ecrans['(barre du bas)'] = Object.assign(barre, { gestes: {} });
  const cadres = () => p.frames().filter(f => f !== p.mainFrame() && /prototype-/.test(f.url()));
  const lireCadres = async () => { const o = {}; for (const f of cadres()) { const k = f.url().split('/').pop().split('?')[0]; try { o[k] = new Set((await f.evaluate(LIRE, 'body')).lignes); } catch (e) { o[k] = new Set(); } } return o; };
  async function replay(route, chemin) { await L.aller(p, route); for (const [zone, s, i, fr] of chemin) { const f = fr ? cadres().find(x => x.url().includes(fr)) : p; if (!f) return false; const r = await f.evaluate(CLIQUER, { zone, s, i }); if (r === 'absent') return false; await L.calme(p, ATT); } return true; }
  async function explorer(route, chemin, niveau, rec, zone, nom, vus, t) {
    if (niveau > PROF || Date.now() - t.debut > TEMPS_ROUTE || t.n >= MAX) return;
    const f = nom ? cadres().find(x => x.url().includes(nom)) : p; if (!f) return;
    let liste; try { liste = await f.evaluate(RECENSER, zone); } catch (e) { return; }
    for (const s of liste) {
      if (Date.now() - t.debut > TEMPS_ROUTE || t.n >= MAX) { rec.coupe = true; return; }
      const lib = s.split('|')[1]; if (EVITE.test(lib)) continue;
      const nSel = s.startsWith('SELECT') ? 1 : 0; const essais = nSel ? 2 : 1;
      for (let i = 0; i < essais; i++) {
        if (chemin.length && !(await replay(route, chemin))) { rec.notes = (rec.notes || []).concat('chemin perdu avant « ' + lib + ' »'); break; }
        if (!chemin.length) await L.aller(p, route);
        const f2 = nom ? cadres().find(x => x.url().includes(nom)) : p; if (!f2) break;
        const avantC = await lireCadres(); const avant = await p.evaluate(DESSUS); const avantT = new Set((await f2.evaluate(LIRE, zone)).lignes);
        dialogues.length = 0; let r; try { r = await f2.evaluate(CLIQUER, { zone, s, i }); } catch (e) { r = 'erreur'; }
        t.n++; if (r !== 'ok' && r !== 'select') continue;
        await L.calme(p, ATT);
        const apres = await p.evaluate(DESSUS); const e = { geste: lib + (nSel ? ' (choix ' + (i + 1) + ')' : ''), niveau };
        if (apres.toast && apres.toast !== avant.toast) e.toast = apres.toast;
        if (dialogues.length) e.dialogue = dialogues.slice();
        if (apres.panneau && apres.panneau !== avant.panneau) { e.panneau = apres.panneau.slice(0, 1500); const q = await p.evaluate(LIRE, '#calque .panneau'); e.attrs = q.attrs; e.lignes = q.lignes; }
        if (apres.docplein && !avant.docplein) { e.docplein = apres.docplein; }
        if (apres.hash !== avant.hash) e.hash = apres.hash;
        /* un geste qui change d'écran : l'écran d'arrivée est relevé à sa place, pas ici */ if (!e.hash) { const nouv = await f2.evaluate(LIRE, zone); const plus = nouv.lignes.filter(x => !avantT.has(x)); if (plus.length) e.nouveau = plus.slice(0, 80); }
        const apresC = await lireCadres(); let cadreNeuf = '';
        for (const k of Object.keys(apresC)) { const neu = [...apresC[k]].filter(x => !(avantC[k] || new Set()).has(x)); if (neu.length > 3) { e.cadre = k; e.nouveauCadre = neu.slice(0, 200); cadreNeuf = k; } }
        rec.gestes.push(e);
        // on descend dans ce que le geste a ouvert : une fenêtre (zone #calque .panneau) — jamais dans un autre écran
        const cle = e.panneau ? 'P' + e.panneau.slice(0, 120) : '';
        if (cle && !vus.has(cle) && niveau < PROF && !e.hash) { vus.add(cle); await explorer(route, chemin.concat([[zone, s, i, nom || '']]), niveau + 1, rec, '#calque .panneau', '', vus, t); }
        // un ONGLET (la page change sans fenêtre ni adresse neuve) : on descend dans ce qu'il a montré, une fois par contenu
        if (!e.panneau && !e.hash && !cadreNeuf && e.nouveau && e.nouveau.length >= 5 && niveau < PROF) { const kt = 'T' + e.nouveau.slice(0, 3).join('|').slice(0, 120); if (!vus.has(kt)) { vus.add(kt); await explorer(route, chemin.concat([[zone, s, i, nom || '']]), niveau + 1, rec, zone, nom, vus, t); } }
        if (cadreNeuf && niveau < PROF && !e.hash && !vus.has('C' + cadreNeuf + chemin.length + lib)) { vus.add('C' + cadreNeuf + chemin.length + lib); await explorer(route, chemin.concat([[zone, s, i, nom || '']]), niveau + 1, rec, 'body', cadreNeuf, vus, t); }
      }
    }
  }
  for (const route of routes) {
    const rec = { lignes: [], attrs: [], gestes: [], cadres: {} }; const debut = Date.now(); const t = { debut, n: 0 };
    try {
      await L.aller(p, route); await p.waitForTimeout(BASE);
      const base = await p.evaluate(LIRE, '#contenu'); rec.lignes = base.lignes; rec.attrs = base.attrs; rec.h = await p.evaluate(() => location.hash);
      for (const f of cadres()) { const k = f.url().split('/').pop().split('?')[0]; try { const x = await f.evaluate(LIRE, 'body'); rec.cadres[k] = { lignes: x.lignes, attrs: x.attrs, gestes: [] }; } catch (e) {} }
      await explorer(route, [], 1, rec, '#contenu', '', new Set(), t);
      // cadres (comptabilité, paiement, documents) : leurs propres gestes
      for (const k of Object.keys(rec.cadres)) { const sous = rec.cadres[k]; await L.aller(p, route); await p.waitForTimeout(BASE); const tt = { debut: Date.now(), n: 0 }; await explorer(route, [], 1, sous, 'body', k, new Set(), tt); }
    } catch (e) { rec.notes = (rec.notes || []).concat('ÉCHEC ' + String(e.message).slice(0, 200)); }
    res.ecrans[route] = rec;
    console.log(`  ${route}: ${rec.lignes.length} lignes, ${rec.gestes.length} gestes, ${Object.keys(rec.cadres).length} cadres, ${Math.round((Date.now() - debut) / 1000)} s${rec.coupe ? ' (coupé)' : ''}`);
    fs.mkdirSync(SORTIE, { recursive: true }); fs.writeFileSync(SORTIE + FICHIER_NOM(), JSON.stringify(res));
    if (Date.now() - t0 > +(opt.budget || 3000) * 1000) { console.log('  · temps écoulé : suite à relancer avec les routes restantes'); break; }
  }
  res.erreurs = c.err; fs.writeFileSync(SORTIE + FICHIER_NOM(), JSON.stringify(res));
  console.log('FIN', QUI, PROFIL, Object.keys(res.ecrans).length, 'écrans, erreurs de page :', c.err.length);
  await L.fin(c); await L.fermer();
})().catch(e => { console.error('ÉCHEC', e); process.exit(2); });
