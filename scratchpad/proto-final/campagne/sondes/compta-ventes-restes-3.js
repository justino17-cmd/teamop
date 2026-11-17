// Restes compta-ventes, tour 1 (17 novembre 2026), décision du chef 20 : en mode APPLICATION, « Paiement en ligne » (Trésorerie) ne montre plus son harnais d'essai
// (ruban « Prototype », « Tests 0 / 25 », « + 1 jour », « + 1 semaine », « Jusqu'au prochain événement », « Recommencer », « Nouvelle facture de test », « dans la vraie version… »,
// cadres jaunes de test) ; l'onglet dit CLAIREMENT « exemples » (ses factures ne sont pas celles de la Comptabilité : à soumettre). CONTRE-ÉPREUVE : sans l'application, le harnais est là.
// Usage : node compta-ventes-restes-3.js [profil] [nuit]
const X = require('./compta-ventes-outils.js'), L = X.L;
const HARNAIS = { 'ruban Prototype': '#sur-t', 'Tests 0 / 25': '#b-tests', 'boutons du temps': '.b-temps', 'Recommencer': '#reset' };
const MOTS = ['Prototype', 'Tests 0', '+ 1 jour', '+ 1 semaine', 'Jusqu’au prochain événement', 'Recommencer', 'Nouvelle facture de test', 'vraie version', 'Carte de test', 'Pour la démonstration'];
(async () => {
  const profil = process.argv[2] || 'mac', nuit = process.argv[3] === 'nuit';
  // ── contre-épreuve : le prototype SANS l'application garde son harnais (sinon « caché » ne prouverait rien) ──
  { const c0 = await L.ouvrir({ profil, qui: null, app: false, nuit }), p0 = c0.p;
    await p0.evaluate(() => { try { aller('comptabilite'); } catch (e) {} }); await p0.waitForTimeout(600); await p0.evaluate(() => { try { CP.onglet = 'enligne'; rendre(); } catch (e) {} }); await p0.waitForTimeout(1500);
    const f0 = L.cadre(p0, /prototype-paiement\.html/);
    if (f0) { const vis = await f0.evaluate(H => Object.fromEntries(Object.entries(H).map(([k, s]) => { const e = document.querySelector(s); return [k, !!e && getComputedStyle(e).display !== 'none' && e.getBoundingClientRect().width > 0]; })), HARNAIS);
      L.v('contre-épreuve · sans l’application, le harnais d’essai est bien là (ruban, temps, recommencer, et les tests quand il y a la place)', vis['ruban Prototype'] && vis['boutons du temps'] && vis['Recommencer'] && (vis['Tests 0 / 25'] || c0.largeur <= 760), vis); }   // « Tests 0 / 25 » n'a pas de place sur un téléphone, même hors application
    else L.v('contre-épreuve · le cadre existe hors application', false, p0.frames().map(x => x.url().slice(-40)));
    await L.fin(c0); }
  const c = await L.ouvrir({ profil, qui: 'marc', nuit }), p = c.p; await X.compta(c, 'enligne'); await p.waitForTimeout(1800);
  const f = L.cadre(p, /prototype-paiement\.html/); L.v('le cadre « Paiement en ligne » s’ouvre', !!f, p.frames().map(x => x.url().slice(-40)));
  if (!f) { await L.fermer(); process.exit(1); }
  L.v('le cadre reçoit le mode application (?app=1)', /app=1/.test(f.url()), f.url().slice(-40));
  const { 'ruban Prototype': _r, ...HA } = HARNAIS;   // le ruban devient l'étiquette « Exemples · paiement en ligne » : il reste visible, avec ce mot-là (vérifié plus bas)
  const el = await f.evaluate(H => Object.fromEntries(Object.entries(H).map(([k, s]) => { const e = document.querySelector(s); return [k, e ? (getComputedStyle(e).display === 'none' || e.getBoundingClientRect().width === 0 ? 'caché' : 'VISIBLE') : 'absent']; })), HA);
  L.v('le ruban « Prototype » est devenu « Exemples · paiement en ligne »', await f.evaluate(() => (document.getElementById('sur-t') || {}).textContent === 'Exemples · paiement en ligne'));
  L.v('population : les éléments du harnais existent dans la page (cachés, pas absents)', Object.values(el).filter(v => v !== 'absent').length >= 3, el);
  L.v('aucun élément du harnais n’est visible', !Object.values(el).includes('VISIBLE'), el);
  const nouv = await f.evaluate(() => { const b = document.querySelector('[data-act="nouvelle"]'); return b ? (b.getBoundingClientRect().width === 0 || getComputedStyle(b.closest('.rangee') || b).display === 'none' ? 'caché' : 'VISIBLE') : 'absent'; });
  L.v('« Nouvelle facture de test » n’est pas montrée', nouv !== 'VISIBLE', nouv);
  // ce qu'un lecteur voit : le texte VISIBLE du cadre et de l'hôte
  const vu = await f.evaluate(() => { const o = []; const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); let n; while ((n = w.nextNode())) { const e = n.parentElement; if (!e || /^(SCRIPT|STYLE)$/.test(e.tagName)) continue; const r = e.getBoundingClientRect(); if (r.width === 0 || r.height === 0 || getComputedStyle(e).visibility === 'hidden') continue; let k = e, ok = true; while (k) { if (getComputedStyle(k).display === 'none') { ok = false; break; } k = k.parentElement; } if (ok) o.push(n.textContent.trim()); } return o.join(' | '); });
  const hote = await p.evaluate(() => document.querySelector('#contenu').innerText);
  const trouves = MOTS.filter(m => (vu + ' ' + hote).includes(m));
  L.v('aucun mot du harnais n’est lu à l’écran', trouves.length === 0, trouves);
  L.v('l’onglet dit « exemples » (hôte ET cadre)', /exemples/i.test(hote) && /Exemples/.test(vu), { hote: /exemples/i.test(hote), cadre: /Exemples/.test(vu) });
  await L.capture(c, X.CAP + `restes3-${profil}${nuit ? '-nuit' : ''}-enligne.png`);
  // le cadre reste vivant : on touche une facture et on change de côté, sans erreur
  const g = await L.gestes(f, 'body'); L.v('population : le cadre garde des gestes (factures, côtés)', g.length >= 8, g.length);
  const cote = await f.evaluate(() => { const b = document.querySelector('[data-cote="cli"]'); if (b) b.click(); return !!b; }); await p.waitForTimeout(500);
  L.v('« Son client » s’ouvre toujours', cote);
  await L.capture(c, X.CAP + `restes3-${profil}${nuit ? '-nuit' : ''}-enligne-client.png`);
  console.log('  erreurs de page :', c.err.length ? c.err.slice(0, 3) : 'aucune'); L.v('aucune erreur de page', c.err.length === 0, c.err.slice(0, 3));
  await L.fin(c); const k = L.bilan(); await L.fermer(); process.exit(k ? 1 : 0);
})().catch(e => { console.error('SONDE MORTE', e); process.exit(2); });
