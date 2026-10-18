// PORTÉ de la maquette (maquette/audit_contrast.js) sur le MODULE `opcourrier.js` monté dans la page d'essai (source de démonstration), servi en local (127.0.0.1) — voir l'en-tête de pilote.js.
// Audit de contraste WCAG AA (texte) d'OP Courrier : Mac, iPad, iPhone × clair / sombre. Le thème suit l'appareil (média prefers-color-scheme), plus de
// bouton ni de data-theme : le mode « sombre-attr » de la maquette n'existe plus (3 formats × 2 = 6 combinaisons, et non 9).
// Usage : node audit_contrast.js  → liste les textes sous 4,5:1 (3:1 pour le grand texte). Code de sortie 1 si échec.
const { ouvrir } = require('./pilote.js');

const measure = () => {
  function parseAll(str) {
    const out = []; const re = /rgba?\(([^)]+)\)|color\(srgb ([^)]+)\)/g; let m;
    while ((m = re.exec(str))) {
      if (m[1]) { const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); out.push([p[0], p[1], p[2], p.length > 3 ? p[3] : 1]); }
      else { const p = m[2].split(/[ /]+/).filter(Boolean).map(Number); out.push([p[0] * 255, p[1] * 255, p[2] * 255, p.length > 3 ? p[3] : 1]); }
    }
    return out;
  }
  const parse = c => parseAll(c)[0] || [0, 0, 0, 0];
  const blend = (t, b) => { const a = t[3]; return [t[0] * a + b[0] * (1 - a), t[1] * a + b[1] * (1 - a), t[2] * a + b[2] * (1 - a), 1]; };
  const lum = c => { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
  const ratio = (a, b) => { const l1 = lum(a), l2 = lum(b); return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05); };
  // Possible backgrounds (several when a gradient is involved)
  function bgsOf(el) {
    const layers = []; let e = el;
    while (e && e.nodeType === 1) {
      const cs = getComputedStyle(e);
      const c = parse(cs.backgroundColor);
      const img = cs.backgroundImage && cs.backgroundImage !== 'none' ? parseAll(cs.backgroundImage).filter(x => x[3] > 0) : [];
      if (img.length) { layers.push({ alts: img }); if (img.every(x => x[3] >= 1)) break; }
      if (c[3] > 0) { layers.push({ alts: [c] }); if (c[3] >= 1) break; }
      e = e.parentElement;
    }
    let res = [[255, 255, 255, 1]];
    if (!e) { const bc = parse(getComputedStyle(document.body).backgroundColor); if (bc[3] > 0) res = [blend(bc, [255, 255, 255, 1])]; }
    for (let i = layers.length - 1; i >= 0; i--) { const n = []; for (const alt of layers[i].alts) for (const r of res) n.push(blend(alt, r)); res = n; }
    return res;
  }
  const root = document.querySelector('[data-opcourrier]').shadowRoot;
  const overlayOpen = !!root.querySelector('#overlay');
  const out = [];
  for (const el of root.querySelectorAll('*')) {
    if (['SCRIPT', 'STYLE', 'svg', 'path', 'circle', 'rect', 'OPTION'].includes(el.tagName)) continue;
    let text = Array.from(el.childNodes).filter(n => n.nodeType === 3 && n.textContent.trim()).map(n => n.textContent.trim()).join(' ');
    const ph = (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') && el.placeholder && !el.value;
    const val = el.tagName === 'INPUT' && el.value && !['checkbox', 'radio', 'hidden'].includes(el.type);
    if (!text && !ph && !val) continue;
    if (el.closest('.sr')) continue;
    if (overlayOpen && !el.closest('#overlays') && !el.closest('#toast')) continue;
    if (!el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1 || r.bottom <= 0 || r.top >= innerHeight || r.right <= 0 || r.left >= innerWidth) continue;
    let op = 1; for (let p = el; p; p = p.parentElement) op *= +getComputedStyle(p).opacity; if (op < 0.98) continue;
    const cs = getComputedStyle(el);
    let fg = parse(cs.color);
    if (ph) { fg = parse(getComputedStyle(el, '::placeholder').color); text = 'placeholder:' + el.placeholder; }
    else if (val && !text) text = 'value:' + el.value;
    const size = parseFloat(cs.fontSize), weight = +cs.fontWeight;
    const large = size >= 24 || (size >= 18.66 && weight >= 700);
    const need = large ? 3 : 4.5;
    let worst = 99, wbg = null;
    for (const bg of bgsOf(el)) { const f = blend(fg, bg); const cr = ratio(f, bg); if (cr < worst) { worst = cr; wbg = bg; } }
    if (worst < need) out.push({ sel: (el.id ? '#' + el.id : '') + '.' + String(el.className || el.tagName).slice(0, 40), text: text.slice(0, 36), size, weight, ratio: worst.toFixed(2), need, bg: wbg.map(Math.round).slice(0, 3).join(',') });
  }
  return out;
};

(async () => {
  const P = await ouvrir(); const browser = P.b; const url = P.url;
  const modes = [['clair', 'light', null], ['sombre', 'dark', null]];
  const vps = [['mac', { width: 1440, height: 900 }], ['ipad', { width: 820, height: 1180 }], ['iphone', { width: 390, height: 844 }]];
  let fails = 0;
  for (const [vpName, vp] of vps) for (const [label, scheme, attr] of modes) {
    const ctx = await browser.newContext({ viewport: vp, colorScheme: scheme, reducedMotion: 'reduce' });
    /* un message PROGRAMMÉ et un brouillon, écrits par la personne : ils vivent sur l'appareil, la source de démonstration n'en connaît pas */
    await ctx.addInitScript(() => { const now = Date.now(); localStorage.setItem('opcourrierEssai_ui', JSON.stringify({ v: 4, scope: 'pro', folder: 'inbox', cat: 'principal', rules: { senders: {}, domains: {} }, contacts: [], settings: { notif: true, threads: true }, kinds: {}, names: {}, sigs: {}, msgs: {}, gone: [],
      user: [{ id: 'm1', acct: 'a1', folder: 'scheduled', from: null, to: 'equipe@exemple.fr', subject: 'Rappel : point hebdo mardi 9 h 30', preview: 'Rappel du point hebdomadaire.', body: ['Bonjour,', 'Rappel du point hebdomadaire de mardi.'], read: true, flagged: false, vip: false, att: [], user: true, at: now - 3600000, sendAt: now + 86400000 },
              { id: 'm2', acct: 'a1', folder: 'drafts', from: null, to: 'client@exemple.fr', subject: 'Réponse à votre proposition', preview: 'Bonjour, merci pour votre proposition.', body: ['Bonjour, merci pour votre proposition.'], read: true, flagged: false, vip: false, att: [], user: true, at: now - 7200000 }] })); });
    const page = await ctx.newPage();
    const errs = []; page.on('pageerror', e => errs.push(String(e)));
    await page.goto(url);
    await page.waitForTimeout(150);
    const phone = vp.width < 700, pad = !phone && vp.width < 1000;
    const res = [];
    const snap = async st => { await page.waitForTimeout(120); res.push([st, await page.evaluate(measure)]); };
    const esc = async () => { await page.keyboard.press('Escape'); await page.waitForTimeout(80); };
    await snap('liste');
    // Tri automatique : chaque catégorie choisie (pastille pleine de sa couleur)
    for (const c of ['notif', 'recus', 'voyages', 'promos', 'tout', 'principal']) { await page.locator(`#catBar [data-cat="${c}"]`).click(); await snap('catégorie ' + c); }
    await page.locator('.msg').nth(3).click(); await snap('message');
    if (phone) await page.waitForTimeout(450);
    await page.locator('#whyBtn').click(); await snap('pourquoi ici');
    await page.locator('.rcat [data-act="moveCat"]').click(); await page.locator('#mvList [data-cat="promos"]').click(); await page.locator('#mvAlways').check(); await snap('déplacer vers'); await esc();
    if (phone) { await page.locator('#readTools [data-act="replyMenu"]').click(); await snap('feuille d’actions'); await esc(); await page.locator('#btnBack').click(); }
    await page.locator('#list').evaluate(() => {});
    if (phone) { await page.locator('#btnFilter').click(); await snap('menu filtre'); await page.locator('.menu [data-pick="unread"]').click(); await snap('filtre non lus'); await page.locator('#btnFilter').click(); await page.locator('.menu [data-pick="all"]').click(); }
    else if (!pad) { await page.locator('#filters [data-filter="unread"]').click(); await snap('filtre non lus'); await page.locator('#filters [data-filter="all"]').click(); }
    if (phone) { await page.locator('#btnNav').click(); await snap('boîtes'); }
    else if (pad) { await page.locator('#btnNav').click(); await snap('colonne boîtes'); }
    await page.locator('.folder[data-folder="scheduled"]').click();
    await page.locator('.msg').first().click(); await snap('programmé');
    await page.locator('[data-act="reschedule"]').click(); await snap('changer l’heure'); await esc();
    await page.locator('#btnCompose').click(); await page.fill('#cTo', 'client@exemple.fr'); await snap('composer');
    await page.locator('#cSched').click(); await snap('composer + programmation'); await esc(); await esc();
    if (phone) { await page.locator('#btnBack').click(); await page.locator('#btnNav').click(); }
    else if (pad) await page.locator('#btnNav').click();
    // Indésirables : bandeau « Classé en indésirable » ; vue Pro sélectionnée dans la barre latérale
    if (phone) { await page.locator('.folder[data-folder="inbox"]').click(); await page.waitForTimeout(450); }
    await page.locator('#spaceBar [data-space="pro"]').click(); if (phone) { await page.waitForTimeout(450); await page.locator('#btnNav').click(); await page.waitForTimeout(450); }   // iPad : la colonne reste ouverte
    await page.locator('.folder[data-folder="junk"]').click(); if (phone) await page.waitForTimeout(450);
    await page.locator('.msg').first().click(); await snap('indésirable (vue Pro)');
    if (phone) { await page.waitForTimeout(450); await page.locator('#btnBack').click(); await page.waitForTimeout(450); await page.locator('#btnNav').click(); await page.waitForTimeout(450); }
    else if (pad) await page.locator('#btnNav').click();
    await page.locator('.side-foot [data-addaccount]').click(); await snap('ajouter un compte');
    await page.fill('#aMail', 'julie@orange.fr'); await page.waitForTimeout(700); await page.locator('#aAdvTog').click(); await snap('détection IMAP + réglages');
    await page.fill('#aMail', 'karim@gmail.com'); await page.waitForTimeout(700); await snap('détection OAuth');
    await page.fill('#aMail', 'julie@societe-exemple.fr'); await page.waitForTimeout(700); await snap('domaine d’entreprise : en attente du geste');
    await page.locator('#aManual').click(); await snap('liste manuelle');
    await page.locator('.prov[data-prov="imap"]').click(); await snap('connexion IMAP'); await esc();
    if (phone) await page.waitForTimeout(450);
    if (pad) await page.locator('#btnNav').click();
    await page.locator('.side-foot [data-addaccount]').click(); await page.locator('#aManual').click(); await page.locator('.prov[data-prov="gmail"]').click(); await snap('connexion OAuth');
    await page.fill('#kMail', 'x@gmail.com'); await page.locator('#kGo').click(); await snap('type de boîte : erreur');
    await page.locator('#kKind [data-kind="perso"]').click(); await snap('type de boîte : Perso'); await esc();
    await page.evaluate(() => { const t = document.querySelector('[data-opcourrier]').shadowRoot.querySelector('#toast'); t.classList.add('show'); t.innerHTML = '<span>Envoi en cours…</span><button class="undo">Annuler l’envoi</button>'; });
    await snap('toast');
    await page.evaluate(() => { const t = document.querySelector('[data-opcourrier]').shadowRoot.querySelector('#toast'); t.innerHTML = '<span>Déplacé dans Indésirables — les prochains mails de x@y.fr aussi</span><button class="undo">Annuler</button>'; });
    await snap('toast');
    const agg = new Map();
    for (const [st, arr] of res) for (const r of arr) { const k = r.sel + '|' + r.bg + '|' + r.ratio; if (!agg.has(k)) agg.set(k, Object.assign({ st }, r)); }
    console.log(`==== ${vpName} ${label} : ${agg.size ? agg.size + ' problème(s)' : 'OK'}` + (errs.length ? ' ERREURS JS: ' + errs.join(' | ') : ''));
    for (const r of agg.values()) console.log(`  ${r.ratio}:1 (≥${r.need}) ${r.size}px/${r.weight} [${r.sel}] "${r.text}" bg=${r.bg} @${r.st}`);
    fails += agg.size + errs.length;
    await ctx.close();
  }
  console.log('requêtes sorties du navigateur : ' + P.sorties.length + (P.sorties.length ? ' ' + JSON.stringify(P.sorties) : ''));
  await P.fermer();
  process.exit(fails || P.sorties.length ? 1 : 0);
})();
