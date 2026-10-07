/* ══ SONDE — LES CATÉGORIES DE L'ONGLET CONTACTS (Tous · Favoris · Groupes · Entreprise), DANS LA VRAIE PAGE SERVIE ═════════════════════════════════════
   Justin, 7 octobre 2026 : « les catégories Contacts qui manquent ». Joué contre le VRAI service, sur un iPhone (393) puis au bureau (1440, nuit) :
     1. le segmenté porte quatre catégories et tient dans l'écran ; « Tous » range les contacts de A à Z (une lettre par carte) ;
     2. l'étoile se TOUCHE : Bruno devient favori, et l'étoile survit à un rechargement (elle vit chez le service) ; « Favoris » ne montre que lui ;
     3. « Groupes » montre le groupe d'Alice, et le toucher ouvre sa conversation ; « Nouveau groupe » ouvre la feuille ;
     4. « Entreprise » dit qu'Alice n'a pas d'espace (après l'avoir LU) ; la recherche filtre la catégorie choisie ; retirer l'étoile vide « Favoris » ;
     5. au bureau, la même page, la même étoile (posée sur l'iPhone) — et aucune erreur JavaScript.
   ⛔ ON ATTEND AU GESTE, JAMAIS AU CHRONOMÈTRE ; ⛔ CHAQUE ABSENCE EST PRÉCÉDÉE DE SA POPULATION.
   Lancer :   node tests/sonde-opmessages-categories.js        CAPTURES=/dossier pour les images.   Code 1 si un contrôle tombe, 2 si elle ne peut pas tourner. */
const fs = require('fs'), path = require('path');
const T = require('./outils-msg');
const { v, vrai, fin } = T.compteur();
T.sauterSiSansDependances();

let pw; try { pw = require('playwright-core'); } catch (e) {
  for (const c of ['/opt/node22/lib/node_modules/playwright/node_modules/playwright-core', '/opt/node-tools/node_modules/playwright-core', 'playwright']) { try { pw = require(c); break; } catch (_) { /* suivant */ } }
  if (!pw) { console.error('Sonde non lançable : playwright-core est introuvable.'); process.exit(2); }
}
const CHROME = '/opt/pw-browsers/chromium';
const DOSSIER = process.env.CAPTURES || null;
const ARGS = ['--no-sandbox', '--disable-dev-shm-usage', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--enable-gpu-rasterization', '--ignore-gpu-blocklist', '--mute-audio'];
const MOTS = { alice: 'pw-alice-1234', bruno: 'pw-bruno-1234', chloe: 'pw-chloe-1234' };
const NOMS = { alice: 'Alice Martin', bruno: 'Bruno Petit', chloe: 'Chloé Garnier' };
const IPHONE = { w: 393, h: 852, dpr: 2, mobile: true }, BUREAU = { w: 1440, h: 900, dpr: 1, mobile: false };

async function ouvrir(b, base, pf, nuit) {
  const ctx = await b.newContext({ viewport: { width: pf.w, height: pf.h }, deviceScaleFactor: pf.dpr, isMobile: pf.mobile, hasTouch: pf.mobile, colorScheme: nuit ? 'dark' : 'light', reducedMotion: 'reduce', locale: 'fr-FR' });
  const page = await ctx.newPage(); page.setDefaultTimeout(9000);
  const S = { ctx, page, pf, erreurs: [] };
  page.on('pageerror', e => S.erreurs.push(String(e && e.message || e).slice(0, 220)));
  await page.goto(base + '/');
  return S;
}
const attendre = (S, fn, arg, ms) => S.page.waitForFunction(fn, arg, { timeout: ms || 9000, polling: 50 }).then(() => true, () => false);
async function toucher(S, sel) { const l = S.page.locator(sel).filter({ visible: true }).first(); await l.scrollIntoViewIfNeeded().catch(() => {}); if (S.pf.mobile) await l.tap(); else await l.click(); }
async function connecter(S, login) {
  await S.page.locator('#c-login').fill(login); await S.page.locator('#c-pass').fill(MOTS[login]); await toucher(S, '#c-entrer');
  return attendre(S, () => { const a = document.getElementById('app'); return a && !a.hidden && document.getElementById('moi-nom').textContent.trim().length > 0; }, null, 12000);
}
const api = (S, m, chemin, corps) => S.page.evaluate(async ([m, chemin, corps]) => {
  const r = await fetch(chemin, { method: m, credentials: 'same-origin', headers: m === 'GET' ? {} : { 'Content-Type': 'application/json', 'X-OPM': '1' }, body: m === 'GET' ? undefined : JSON.stringify(corps || {}) });
  let j = null; try { j = await r.json(); } catch (e) { /* pas de JSON */ } return { code: r.status, j };
}, [m, chemin, corps]);
const texteVue = S => S.page.evaluate(() => document.getElementById('vc-corps').innerText);
const etoile = (S, nom) => S.page.evaluate(n => { const l = Array.from(document.querySelectorAll('#vc-corps .vc-ligne')).find(x => x.querySelector('.contact-nom').textContent === n); const e = l && l.querySelector('.vc-etoile'); return e ? e.getAttribute('aria-pressed') : null; }, nom);
async function capture(S, nom) { if (!DOSSIER) return; fs.mkdirSync(DOSSIER, { recursive: true }); await S.page.waitForTimeout(300); await S.page.screenshot({ path: path.join(DOSSIER, nom + '.png') }); }
async function categorie(S, cat) { await toucher(S, '#vc-seg [data-cat="' + cat + '"]'); return attendre(S, c => { const b = document.querySelector('#vc-seg [data-cat="' + c + '"]'); return b && b.getAttribute('aria-pressed') === 'true'; }, cat); }

(async () => {
  const og = await T.fauxOpGestion(Object.fromEntries(Object.keys(MOTS).map(l => [l, { pass: MOTS[l], nom: NOMS[l], actif: true }])));
  const port = await T.portLibre();
  const svc = await T.lancerService({ port, urlGestion: og.url, config: { origines: ['http://127.0.0.1:' + port] } });
  let b = null;
  try { b = await pw.chromium.launch({ executablePath: CHROME, headless: true, args: ARGS }); }
  catch (e) { console.error('Sonde non lançable : ' + e.message.split('\n')[0]); await svc.arreter(); await og.fermer(); process.exit(2); }
  try {
    const A = await ouvrir(b, svc.base, IPHONE, false), B = await ouvrir(b, svc.base, BUREAU, true), C = await ouvrir(b, svc.base, BUREAU, false);
    vrai('population : Alice, Bruno et Chloé sont connectés', (await connecter(A, 'alice')) && (await connecter(B, 'bruno')) && (await connecter(C, 'chloe')));
    for (const X of [B, C]) { const l = await api(A, 'POST', '/api/contacts/lien', {}); await api(X, 'POST', '/api/liens/accepter', { code: l.j.code }); }
    const ids = {}; for (const [k, X] of [['bruno', B], ['chloe', C]]) ids[k] = (await api(X, 'GET', '/api/moi')).j.moi.id;
    const g = await api(A, 'POST', '/api/conversations/groupe', { nom: 'Chantier Lyon', membres: [ids.bruno, ids.chloe] });
    vrai('population : Bruno et Chloé sont contacts d\'Alice, et le groupe « Chantier Lyon » existe (' + g.code + ')', g.code === 201 || g.code === 200);
    await A.page.reload(); await attendre(A, () => { const a = document.getElementById('app'); return a && !a.hidden; }, null, 12000);

    console.log('\n── 1. le segmenté, et « Tous » de A à Z ──');
    await toucher(A, '#tabs a[data-vue="contacts"]');
    vrai('l\'onglet Contacts s\'ouvre, les deux contacts y sont', await attendre(A, () => { const t = document.getElementById('vc-corps'); return t && t.innerText.includes('Bruno Petit') && t.innerText.includes('Chloé Garnier'); }));
    v('le segmenté porte quatre catégories, « Tous » choisi', await A.page.evaluate(() => Array.from(document.querySelectorAll('#vc-seg [data-cat]')).map(b => b.textContent + (b.getAttribute('aria-pressed') === 'true' ? '*' : ''))), ['Tous*', 'Favoris', 'Groupes', 'Entreprise']);
    const tient = await A.page.evaluate(() => { const s = document.getElementById('vc-seg').getBoundingClientRect(); return { dedans: s.left >= 0 && s.right <= innerWidth, coupe: Array.from(document.querySelectorAll('#vc-seg .seg-bouton')).filter(b => b.scrollWidth > b.clientWidth + 1).length, page: document.documentElement.scrollWidth <= innerWidth }; });
    v('iPhone 393 : le segmenté tient, aucun libellé coupé, la page ne défile pas de côté', [tient.dedans, tient.coupe, tient.page], [true, 0, true]);
    v('« Tous » range de A à Z : une lettre par carte (B, puis C)', await A.page.evaluate(() => Array.from(document.querySelectorAll('#vc-corps .vc-lettre')).map(h => h.textContent)), ['B', 'C']);
    const cible = await A.page.evaluate(() => { const e = document.querySelector('#vc-corps .vc-etoile'); const r = e.getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)]; });
    vrai('l\'étoile se touche au doigt (' + cible.join('×') + ' px, 44 au moins)', cible[0] >= 44 && cible[1] >= 44);
    await capture(A, '1-tous');

    console.log('\n── 2. l\'étoile ──');
    v('population : Bruno n\'est pas favori', await etoile(A, 'Bruno Petit'), 'false');
    await A.page.locator('#vc-corps .vc-ligne', { hasText: 'Bruno Petit' }).locator('.vc-etoile').tap();
    vrai('toucher l\'étoile : Bruno devient favori (l\'étoile se remplit)', await attendre(A, () => { const l = Array.from(document.querySelectorAll('#vc-corps .vc-ligne')).find(x => x.textContent.includes('Bruno Petit')); return l && l.querySelector('.vc-etoile').getAttribute('aria-pressed') === 'true'; }));
    v('…et le service le sait', ((await api(A, 'GET', '/api/contacts')).j.contacts.find(c => c.id === ids.bruno) || {}).favori, true);
    await A.page.reload(); await attendre(A, () => { const a = document.getElementById('app'); return a && !a.hidden; }, null, 12000);
    await toucher(A, '#tabs a[data-vue="contacts"]'); await attendre(A, () => !!document.querySelector('#vc-corps .vc-ligne'));
    v('après un rechargement, l\'étoile de Bruno est toujours pleine', await etoile(A, 'Bruno Petit'), 'true');
    vrai('« Favoris » ne montre que Bruno', (await categorie(A, 'favoris')) && await attendre(A, () => { const t = document.getElementById('vc-corps').innerText; return t.includes('Bruno Petit') && !t.includes('Chloé Garnier'); }));
    await capture(A, '2-favoris');

    console.log('\n── 3. « Groupes » ──');
    vrai('« Groupes » montre « Chantier Lyon » et « Nouveau groupe »', (await categorie(A, 'groupes')) && await attendre(A, () => { const t = document.getElementById('vc-corps').innerText; return t.includes('Chantier Lyon') && t.includes('Nouveau groupe'); }));
    v('…et aucun contact seul (ni Bruno ni Chloé comme ligne)', await A.page.evaluate(() => document.querySelectorAll('#vc-corps [data-act="vc-ecrire"]').length), 0);
    await capture(A, '3-groupes');
    await toucher(A, '#vc-corps [data-act="vc-groupe"]');
    vrai('toucher le groupe ouvre sa conversation', await attendre(A, () => /^#messages\/./.test(location.hash) && !!document.getElementById('saisie') && document.getElementById('saisie').getClientRects().length > 0));
    await A.page.goBack(); await attendre(A, () => !document.getElementById('vue-contacts').hidden);
    await toucher(A, '#vc-corps [data-act="vc-nouveau-groupe"]');
    vrai('« Nouveau groupe » ouvre la feuille « Nouvelle discussion »', await attendre(A, () => { const f = document.querySelector('[role="dialog"]:not([hidden])'); return !!f && f.getClientRects().length > 0; }));
    await A.page.keyboard.press('Escape'); await attendre(A, () => !document.querySelector('[role="dialog"]:not([hidden])') || true);

    console.log('\n── 4. « Entreprise », la recherche, retirer l\'étoile ──');
    await A.page.evaluate(() => { location.hash = '#contacts'; });
    await attendre(A, () => !document.getElementById('vue-contacts').hidden);
    vrai('« Entreprise » dit, après lecture, qu\'Alice n\'a aucun espace', (await categorie(A, 'entreprise')) && await attendre(A, () => document.getElementById('vc-corps').innerText.includes('aucun espace d\'entreprise')));
    await categorie(A, 'favoris');
    await A.page.locator('#vc-recherche').fill('zzz');
    vrai('dans « Favoris », chercher « zzz » dit que rien ne correspond', await attendre(A, () => document.getElementById('vc-corps').innerText.includes('Rien ne correspond')));
    await A.page.locator('#vc-recherche').fill('bru');
    vrai('chercher « bru » retrouve Bruno', await attendre(A, () => document.getElementById('vc-corps').innerText.includes('Bruno Petit')));
    await A.page.locator('#vc-recherche').fill('');
    await A.page.locator('#vc-corps .vc-ligne', { hasText: 'Bruno Petit' }).locator('.vc-etoile').tap();
    vrai('retirer l\'étoile vide « Favoris » (le message d\'aide s\'affiche)', await attendre(A, () => document.getElementById('vc-corps').innerText.includes('Aucun favori')));
    await A.page.locator('#vc-corps').waitFor();
    await A.page.locator('#vc-seg [data-cat="favoris"]').waitFor();
    await api(A, 'POST', '/api/contacts/favori', { uid: ids.chloe, favori: true });

    console.log('\n── 5. au bureau, la même étoile ──');
    const D = await ouvrir(b, svc.base, BUREAU, true);
    vrai('population : Alice se connecte au bureau (nuit)', await connecter(D, 'alice'));
    await toucher(D, '#nav-side a[data-vue="contacts"]');
    vrai('au bureau, Chloé (étoilée depuis l\'iPhone) est favori et Bruno ne l\'est plus', await attendre(D, () => { const l = Array.from(document.querySelectorAll('#vc-corps .vc-ligne')); const e = n => { const x = l.find(y => y.textContent.includes(n)); return x && x.querySelector('.vc-etoile').getAttribute('aria-pressed'); }; return e('Chloé Garnier') === 'true' && e('Bruno Petit') === 'false'; }));
    await capture(D, '5-bureau');
    v('aucune erreur JavaScript, sur l\'iPhone ni au bureau', A.erreurs.concat(B.erreurs, C.erreurs, D.erreurs), []);
  } finally { await b.close(); await svc.arreter(); await og.fermer(); }
  fin();
})().catch(e => { console.error(e); process.exit(1); });
