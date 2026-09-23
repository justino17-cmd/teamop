/* Captures du site retouché (OP MESSAGES « Bientôt disponible », plus de « hors-ligne »).
   Pages du SITE seulement, servies en 127.0.0.1 depuis la copie de travail. */
const path = require('path'), fs = require('fs');
const { ouvrir, dormir } = require('/home/user/teamop/scratchpad/pilote.js');
const OUT = process.env.CAP || path.join(require('os').tmpdir(), 'cap-site');
fs.mkdirSync(OUT, { recursive: true });
let ok = 0, ko = 0; const vrai = (t, c, d) => { c ? ok++ : ko++; console.log((c ? '  ✓ ' : '  ✗ ') + t + (c || d === undefined ? '' : '  → ' + JSON.stringify(d))); };

(async () => {
  const S = await ouvrir({});
  const aller = async (url, l, h) => {
    await S.c.envoyer('Emulation.setDeviceMetricsOverride', { width: l, height: h, deviceScaleFactor: 1, mobile: l < 500 });
    const avant = S.exceptions.length;
    await S.c.envoyer('Page.navigate', { url: S.BASE + url });
    await dormir(2200);
    return () => S.exceptions.slice(avant);
  };
  const cliche = async (nom, sel, marge) => {
    const r = await S.ev(`const e=document.querySelector(${JSON.stringify(sel)}); if(!e) return null; const hd=[...document.querySelectorAll('body *')].filter(x=>{const cs=getComputedStyle(x);return (cs.position==='fixed'||cs.position==='sticky')&&x.getBoundingClientRect().top<=0;}); hd.forEach(x=>x.style.setProperty('visibility','hidden','important')); e.scrollIntoView({block:'start'}); await new Promise(r=>setTimeout(r,400));
      const b=e.getBoundingClientRect(); return {x:b.left+scrollX,y:b.top+scrollY,w:b.width,h:b.height};`);
    if (!r) { vrai('élément trouvé pour ' + nom, false, sel); return; }
    const m = marge || 12;
    const cap = await S.c.envoyer('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true,
      clip: { x: Math.max(0, r.x - m), y: Math.max(0, r.y - m), width: r.w + 2 * m, height: Math.min(r.h + 2 * m, 2400), scale: 1 } });
    fs.writeFileSync(path.join(OUT, nom + '.png'), Buffer.from(cap.data, 'base64'));
    console.log('    capture', nom + '.png', Math.round(r.w) + '×' + Math.round(r.h));
  };
  const texte = () => S.ev(`return document.body.innerText`);

  console.log('\n══ tarifs.html ══');
  let exc = await aller('/tarifs.html', 1280, 900);
  let t = await texte();
  vrai('plus aucun « hors-ligne »', !/hors-ligne|hors ligne|sans connexion/i.test(t));
  vrai('la bande « Bientôt disponible » d’OP MESSAGES est là', /Bientôt disponible\s*OP MESSAGES change d.infrastructure/.test(t));
  vrai('⛔ aucun lien vers une souscription OP MESSAGES', await S.ev(`return document.querySelectorAll('a[href*="formule=msg"]').length`) === 0);
  vrai('trois mentions inertes à la place', await S.ev(`return [...document.querySelectorAll('#opmessages [aria-disabled="true"]')].length`) === 3);
  vrai('aucune erreur', exc().length === 0, exc());
  await cliche('site-tarifs-opmsg', '#opmessages');
  exc = await aller('/tarifs.html', 390, 844);
  vrai('au téléphone, la page ne glisse pas de côté', await S.ev(`return document.documentElement.scrollWidth<=392`), await S.ev(`return document.documentElement.scrollWidth`));

  console.log('\n══ opmessages.html ══');
  exc = await aller('/opmessages.html', 1280, 900);
  t = await texte();
  vrai('⛔ plus de bouton « Ouvrir OP MESSAGES »', !/Ouvrir OP MESSAGES/.test(t) && await S.ev(`return document.querySelectorAll('a[href="messages.html"]').length`) === 0);
  vrai('« Bientôt disponible » et la phrase d’explication', /Bientôt disponible/.test(t) && /rouvre bientôt/.test(t));
  vrai('aucune erreur', exc().length === 0, exc());
  await S.ev(`document.querySelector('h1').parentElement.id='hero-opmsg'; return 1;`);
  await cliche('site-opmessages', '#hero-opmsg', 16);

  console.log('\n══ index.html ══');
  exc = await aller('/index.html', 1280, 900);
  t = await texte();
  vrai('plus aucun « hors-ligne »', !/hors-ligne|hors ligne|sans réseau/i.test(t));
  vrai('la FAQ dit « en ligne »', /Faut-il du réseau sur le terrain \?/.test(t) && /travaille en ligne/.test(t));
  vrai('OP MESSAGES porte « Bientôt disponible »', /OP MESSAGES — communiquer en équipe\s*⏳ Bientôt disponible/.test(t));
  vrai('aucune erreur', exc().length === 0, exc());
  await S.ev(`const i=document.querySelector('img[alt="OP MESSAGES"][style*="50px"]'); if(i) i.closest('div[style*="padding: 28px"]').id='carte-opmsg'; return 1;`);
  await cliche('site-index-opmsg', '#carte-opmsg', 12);

  console.log('\n══ applications.html ══');
  exc = await aller('/applications.html', 1280, 900);
  t = await texte();
  vrai('plus aucun « hors-ligne »', !/hors-ligne|sans connexion|retour du réseau/i.test(t));
  vrai('OP MESSAGES : « Bientôt disponible » à la place de « Nouveau »', /OP MESSAGES\s*⏳ Bientôt disponible/.test(t) && !/OP MESSAGES\s*Nouveau/.test(t));
  vrai('aucune erreur', exc().length === 0, exc());

  console.log('\n══ pourquoi.html · elan.html · creer.html · mentions-legales.html ══');
  for (const p of ['/pourquoi.html', '/elan.html', '/creer.html', '/mentions-legales.html']) {
    exc = await aller(p, 1280, 900); t = await texte();
    vrai(p + ' : plus aucun « hors-ligne »', !/hors-ligne|hors ligne|sans connexion|sans réseau|retour du réseau/i.test(t) && t.length > 500, t.length);
    vrai(p + ' : aucune erreur', exc().length === 0, exc());
  }

  console.log('\n══ recap-abonnement.html ══');
  for (const f of ['msggratuit', 'msgpro', 'msgpremium']) {
    exc = await aller('/recap-abonnement.html?formule=' + f, 1280, 900);
    const r = await S.ev(`const c=document.getElementById('cartePaiement'); return {txt:c.innerText, payer:!!document.getElementById('btnPayer'), droits:document.getElementById('carteDroits').innerText.length}`);
    vrai(f + ' : « Bientôt disponible », pas de bouton de paiement', /Bientôt disponible/.test(r.txt) && !r.payer, r);
    vrai(f + ' : les droits restent lisibles', r.droits > 100, r.droits);
    vrai(f + ' : aucune erreur', exc().length === 0, exc());
    if (f === 'msgpro') await cliche('site-recap-msgpro', '#cartePaiement', 12);
  }
  /* contre-épreuve : une formule OP GESTION garde son paiement */
  exc = await aller('/recap-abonnement.html?formule=business', 1280, 900);
  const g = await S.ev(`return {payer:!!document.getElementById('btnPayer'), txt:document.getElementById('cartePaiement').innerText.slice(0,80)}`);
  vrai('⛔ contre-épreuve : Business (OP GESTION) garde son bouton de paiement', g.payer && !/Bientôt disponible/.test(g.txt), g);
  exc = await aller('/recap-abonnement.html?formule=gratuit', 1280, 900);
  vrai('… et le droit « Temps réel » ne parle plus de hors-ligne', await S.ev(`const t=document.body.innerText; return /Temps réel/.test(t) && !/hors-ligne/.test(t)`));

  console.log(`\n════ capture-site : ${ok} ✓ ${ko} ✗ ════\n`);
  S.fermer(); process.exit(ko ? 1 : 0);
})().catch(e => { console.error('SONDE MORTE :', e && e.stack || e); process.exit(2); });
