/* ══ SONDE — L'ONGLET « CONTACTS » : LES DEMANDES REÇUES, ACCEPTER, REFUSER, DANS LA VRAIE PAGE SERVIE, À TROIS PERSONNES ═════════════════════════════════════
   Demandé le 6 octobre 2026 : « quand je cherche quelqu'un je vois bien les notifications mais je ne vois pas accepter ou refuser… il faudrait un onglet Contacts ;
   dans Contacts on voit les demandes de contact, ça fait plus pro : la personne, on accepte, on refuse ». Joué contre le VRAI service, chacun dans son navigateur :
   Alice (iPhone 393, jour) reçoit la demande de Bruno (bureau 1440, nuit) — la bannière se TOUCHE et mène à l'onglet, l'onglet porte le nombre, « Accepter » fait
   de Bruno un contact ; puis celle de Chloé, qu'Alice REFUSE. Bruno voit sa demande « en attente » puis Alice dans ses contacts, et lui écrit d'un toucher.
   Les demandes partent par l'API, comme la page le fait (la recherche par identifiant a sa propre sonde : sonde-opmessages-identifiant.js).
   ⛔ ON ATTEND AU GESTE, JAMAIS AU CHRONOMÈTRE ; ⛔ CHAQUE ABSENCE EST PRÉCÉDÉE DE SA POPULATION.
   Lancer :   node tests/sonde-opmessages-contacts.js          CAPTURES=/dossier pour les images.
   Code 1 si UN contrôle tombe, 2 si elle ne peut pas tourner. */
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
const api = (S, m, chemin, corps) => S.page.evaluate(async ([m, chemin, corps]) => { const r = await fetch(chemin, { method: m, credentials: 'same-origin', headers: m === 'GET' ? {} : { 'Content-Type': 'application/json', 'X-OPM': '1' }, body: m === 'GET' ? undefined : JSON.stringify(corps || {}) }); return { code: r.status, j: await r.json().catch(() => null) }; }, [m, chemin, corps]);
async function demander(S, identifiant) {
  const t = await api(S, 'POST', '/api/contacts/identifiant', { identifiant });
  if (!t.j || !t.j.trouve) return { trouve: false, t };
  return { trouve: true, d: await api(S, 'POST', '/api/contacts/demander', { id: t.j.id }) };
}
const vueVisible = (S, vue) => attendre(S, x => { const s = document.getElementById('vue-' + x); return !!s && !s.hidden && s.getClientRects().length > 0; }, vue);
const badge = (S) => S.page.evaluate(() => Array.from(document.querySelectorAll('[data-onglet-n="contacts"]')).filter(b => b.getClientRects().length > 0).map(b => b.textContent));
async function capture(S, nom) { if (!DOSSIER) return; fs.mkdirSync(DOSSIER, { recursive: true }); await S.page.waitForTimeout(300); await S.page.screenshot({ path: path.join(DOSSIER, nom + '.png') }); }

(async () => {
  const og = await T.fauxOpGestion(Object.fromEntries(Object.keys(MOTS).map(l => [l, { pass: MOTS[l], nom: NOMS[l], actif: true }])));
  const port = await T.portLibre();
  const svc = await T.lancerService({ port, urlGestion: og.url, config: { origines: ['http://127.0.0.1:' + port], pulsationMs: 3000, presenceGraceMs: 500, balayageMs: 500, beta: { relectureMs: 300, timeoutMs: 1500 } } });
  let b = null;
  try { b = await pw.chromium.launch({ executablePath: CHROME, headless: true, args: ARGS }); }
  catch (e) { console.error('Sonde non lançable : ' + e.message.split('\n')[0]); await svc.arreter(); await og.fermer(); process.exit(2); }
  try {
    const A = await ouvrir(b, svc.base, IPHONE, false), B = await ouvrir(b, svc.base, BUREAU, true), C = await ouvrir(b, svc.base, BUREAU, false);
    vrai('population : Alice, Bruno et Chloé sont connectés', (await connecter(A, 'alice')) && (await connecter(B, 'bruno')) && (await connecter(C, 'chloe')));
    const iA = (await api(A, 'GET', '/api/moi')).j.moi.identifiant;

    console.log('\n── 1. l\'onglet existe, vide ──');
    v('la barre du téléphone porte CINQ onglets, Contacts en deuxième', await A.page.evaluate(() => Array.from(document.querySelectorAll('#tabs a[data-vue]')).map(a => a.dataset.vue)), ['messages', 'contacts', 'appels', 'reunions', 'reglages']);
    v('la barre latérale du bureau aussi', await B.page.evaluate(() => Array.from(document.querySelectorAll('#nav-side a[data-vue]')).map(a => a.dataset.vue)), ['messages', 'contacts', 'appels', 'reunions', 'reglages']);
    const barre = await A.page.evaluate(() => { const t = document.getElementById('tabs').getBoundingClientRect(); const libs = Array.from(document.querySelectorAll('#tabs a span')).map(s => s.scrollWidth <= s.clientWidth + 1); return { dedans: t.left >= 0 && t.right <= innerWidth, coupe: libs.filter(x => !x).length, page: document.documentElement.scrollWidth <= innerWidth }; });
    v('iPhone 393 : la barre tient dans l\'écran, aucun libellé coupé, la page ne défile pas de côté', [barre.dedans, barre.coupe, barre.page], [true, 0, true]);
    v('population : aucune demande au départ, la pastille de l\'onglet est cachée', await badge(A), []);
    await toucher(A, '#tabs a[data-vue="contacts"]');
    vrai('toucher « Contacts » ouvre l\'onglet', await vueVisible(A, 'contacts'));
    vrai('il dit « Aucune demande en attente » et « Pas encore de contact » (après avoir LU les demandes)', await attendre(A, () => { const t = document.getElementById('vue-contacts').textContent; return t.includes('Aucune demande en attente') && t.includes('Pas encore de contact'); }));
    const bulle = await A.page.evaluate(() => { const bu = document.querySelector('.tabs-bulle').getBoundingClientRect(), t = document.querySelector('#tabs a[data-vue="contacts"]').getBoundingClientRect(); return Math.abs((bu.left + bu.width / 2) - (t.left + t.width / 2)) < 3 && Math.abs(bu.width - t.width) < 3; });
    vrai('la bulle de la barre se pose exactement sous « Contacts » (cinq colonnes égales)', await attendre(A, () => { const bu = document.querySelector('.tabs-bulle').getBoundingClientRect(), t = document.querySelector('#tabs a[data-vue="contacts"]').getBoundingClientRect(); return Math.abs((bu.left + bu.width / 2) - (t.left + t.width / 2)) < 3 && Math.abs(bu.width - t.width) < 3; }) || bulle);
    await toucher(A, '#tabs a[data-vue="messages"]'); await vueVisible(A, 'messages');

    console.log('\n── 2. Bruno demande : la bannière se touche, l\'onglet compte ──');
    const dB = await demander(B, iA);
    vrai('population : Bruno trouve Alice par son identifiant et sa demande part (« envoyee »)', dB.trouve && dB.d.code === 200 && dB.d.j.resultat === 'envoyee', dB);
    vrai('Alice voit la bannière « Demande de contact … veut vous ajouter », et elle se TOUCHE', await attendre(A, () => { const n = document.getElementById('notif'); return n.classList.contains('on') && n.classList.contains('touchable') && n.textContent.includes('Bruno'); }));
    vrai('l\'onglet « Contacts » porte « 1 » et le dit (aria-label)', await attendre(A, () => { const b = document.querySelector('#tabs [data-onglet-n="contacts"]'); return !!b && !b.hidden && b.textContent === '1' && /1 demande de contact/.test(document.querySelector('#tabs a[data-vue="contacts"]').getAttribute('aria-label')); }));
    await capture(A, '1-banniere-iphone');
    await toucher(A, '#notif');
    vrai('toucher la bannière ouvre l\'onglet Contacts', await vueVisible(A, 'contacts'));
    vrai('« Demandes de contact » : Bruno, son identifiant, « veut t\'ajouter », avec Accepter et Refuser', await attendre(A, () => { const c = document.querySelector('#vue-contacts .vc-recues'); return !!c && c.textContent.includes('Bruno') && /Bruno#\d{4}/.test(c.textContent) && c.textContent.includes('veut t\'ajouter') && !!c.querySelector('[data-act="vc-accepter"]') && !!c.querySelector('[data-act="vc-refuser"]'); }));
    const boutons = await A.page.evaluate(() => Array.from(document.querySelectorAll('#vue-contacts .vc-recues button')).map(x => { const r = x.getBoundingClientRect(); return { h: Math.round(r.height), dedans: r.left >= 0 && r.right <= innerWidth }; }));
    v('iPhone : chaque bouton répond sur 44 px et tient dans l\'écran', [boutons.length >= 2, boutons.every(x => x.h >= 44), boutons.every(x => x.dedans)], [true, true, true]);
    await capture(A, '2-demande-iphone');
    await toucher(B, '#nav-side a[data-vue="contacts"]');
    vrai('Bruno, dans SON onglet : « Demandes envoyées » — Alice, en attente, avec « Retirer »', await attendre(B, () => { const t = document.getElementById('vue-contacts').textContent; return t.includes('Demandes envoyées') && t.includes('Alice') && t.includes('en attente') && !!document.querySelector('#vue-contacts [data-act="vc-retirer"]'); }));
    await capture(B, '3-envoyee-bureau-nuit');

    console.log('\n── 3. Alice accepte ──');
    await toucher(A, '#vue-contacts [data-act="vc-accepter"]');
    vrai('« Contact ajouté » ; la demande quitte la liste ; Bruno est dans « Mes contacts »', await attendre(A, () => { const s = document.getElementById('vue-contacts'); return !s.querySelector('.vc-recues') && s.textContent.includes('Aucune demande en attente') && !!Array.from(s.querySelectorAll('[data-act="vc-ecrire"]')).find(x => x.textContent.includes('Bruno')); }));
    v('la pastille de l\'onglet disparaît', await badge(A), []);
    vrai('chez Bruno, sans rien toucher : Alice passe de « en attente » à « Mes contacts »', await attendre(B, () => { const s = document.getElementById('vue-contacts'); return !s.querySelector('[data-act="vc-retirer"]') && !!Array.from(s.querySelectorAll('[data-act="vc-ecrire"]')).find(x => x.textContent.includes('Alice')); }, null, 12000));
    await toucher(B, '#vue-contacts [data-act="vc-ecrire"]');
    vrai('Bruno touche Alice : leur conversation s\'ouvre', await attendre(B, () => { const t = document.getElementById('conv-titre'); return location.hash.startsWith('#messages/') && !!t && t.textContent.includes('Alice'); }));

    console.log('\n── 4. Chloé demande, Alice refuse ──');
    const dC = await demander(C, iA);
    vrai('population : la demande de Chloé part', dC.trouve && dC.d.j && dC.d.j.resultat === 'envoyee', dC);
    vrai('l\'onglet d\'Alice compte de nouveau « 1 », et la demande de Chloé est dans la liste (ouverte)', await attendre(A, () => { const b = document.querySelector('#tabs [data-onglet-n="contacts"]'); const c = document.querySelector('#vue-contacts .vc-recues'); return !!b && !b.hidden && b.textContent === '1' && !!c && c.textContent.includes('Chloé'); }));
    await toucher(A, '#vue-contacts [data-act="vc-refuser"]');
    vrai('« Refuser » : la demande disparaît, Chloé N\'EST PAS dans les contacts, Bruno y reste', await attendre(A, () => { const s = document.getElementById('vue-contacts'); const ec = Array.from(s.querySelectorAll('[data-act="vc-ecrire"]')).map(x => x.textContent); return !s.querySelector('.vc-recues') && !ec.some(t => t.includes('Chloé')) && ec.some(t => t.includes('Bruno')); }));
    v('la pastille est de nouveau cachée', await badge(A), []);
    v('⛔ côté service : Chloé n\'est pas un contact d\'Alice', ((await api(A, 'GET', '/api/contacts')).j.contacts || []).map(c => c.nom).filter(n => /Chlo/.test(n)), []);
    await capture(A, '4-apres-iphone');

    v('aucune erreur JavaScript (Alice, Bruno, Chloé)', [A.erreurs, B.erreurs, C.erreurs], [[], [], []]);
  } finally { await b.close(); await svc.arreter(); await og.fermer(); }
  fin();
})().catch(e => { console.error(e); process.exit(2); });
