/* ══ SONDE — L'IDENTIFIANT « Prénom#1234 » ET LES DEMANDES DE CONTACT, DANS LA VRAIE PAGE SERVIE, À DEUX PERSONNES ══════════════════════════════
   Justin, 5 octobre 2026 : « quand on clique sur nouveau contact, qu'on puisse ajouter des personnes qui ont déjà l'application… un petit système avec un hashtag » ;
   puis « Nom#1234 exact » et « demande à accepter ». `tests/test-996.js` garde le service ; cette sonde joue la VRAIE PAGE SERVIE (`server-msg/public/`) contre le VRAI
   service, par deux personnes, chacune dans son navigateur : Alice (iPhone 393, jour) cherche Bruno (bureau 1440, nuit) par son identifiant, lui demande ; Bruno voit la
   demande (compteur dans Réglages, rubrique « Demandes reçues »), l'accepte, et la conversation s'ouvre ; puis Bruno se rend introuvable et Alice ne le retrouve plus.

   ⛔ CHAQUE ZÉRO EST PRÉCÉDÉ DE SA POPULATION ; ⛔ ON ATTEND AU GESTE, JAMAIS AU CHRONOMÈTRE ; ⛔ UN NOM SEUL NE PART JAMAIS AU SERVICE (compté sur le réseau).
   Lancer :   node tests/sonde-opmessages-identifiant.js          CAPTURES=/dossier pour les images des étapes clés.
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
const MOTS = { alice: 'pw-alice-1234', bruno: 'pw-bruno-1234' };
const NOMS = { alice: 'Alice Martin', bruno: 'Bruno Petit' };
const IPHONE = { nom: 'iPhone 393', w: 393, h: 852, dpr: 2, mobile: true }, BUREAU = { nom: 'bureau 1440', w: 1440, h: 900, dpr: 1, mobile: false };

async function ouvrir(b, base, pf, nuit, nom) {
  const ctx = await b.newContext({ viewport: { width: pf.w, height: pf.h }, deviceScaleFactor: pf.dpr, isMobile: pf.mobile, hasTouch: pf.mobile, colorScheme: nuit ? 'dark' : 'light',
    reducedMotion: 'reduce', locale: 'fr-FR', timezoneId: 'Europe/Paris', permissions: ['clipboard-read', 'clipboard-write'], baseURL: base });
  const page = await ctx.newPage(); page.setDefaultTimeout(9000);
  const S = { ctx, page, pf, nom, erreurs: [], console: [], reseau: [] };
  page.on('pageerror', e => S.erreurs.push(String(e && e.message || e).slice(0, 220)));
  page.on('console', m => { if (m.type() === 'error') S.console.push(m.text().slice(0, 220)); });
  page.on('request', r => S.reseau.push(r.method() + ' ' + new URL(r.url()).pathname));
  await page.goto(base + '/');
  return S;
}
async function toucher(S, sel) {
  const loc = S.page.locator(sel).filter({ visible: true }).first();
  await loc.scrollIntoViewIfNeeded().catch(() => {});
  if (S.pf.mobile) await loc.tap(); else await loc.click();
}
const saisir = (S, sel, t) => S.page.locator(sel).fill(t);
const attendre = (S, fn, arg, ms) => S.page.waitForFunction(fn, arg, { timeout: ms || 9000, polling: 50 }).then(() => true, () => false);
const texte = (S, sel) => S.page.evaluate(s => { const e = document.querySelector(s); return e ? e.textContent.replace(/\s+/g, ' ').trim() : '(absent)'; }, sel);
const contient = (S, sel, mot, ms) => attendre(S, a => { const e = document.querySelector(a.sel); return !!e && e.textContent.replace(/\s+/g, ' ').toLowerCase().includes(a.mot); }, { sel, mot: mot.toLowerCase() }, ms);
async function connecter(S, login) {
  await saisir(S, '#c-login', login); await saisir(S, '#c-pass', MOTS[login]); await toucher(S, '#c-entrer');
  await S.page.waitForFunction(() => { const a = document.getElementById('app'); return a && !a.hidden && document.getElementById('moi-nom').textContent.trim().length > 0; }, null, { timeout: 12000 });
}
async function onglet(S, vue) {
  if (await S.page.evaluate(() => { const r = document.getElementById('conv-retour'); return !!r && r.getClientRects().length > 0; })) await toucher(S, '#conv-retour');
  await toucher(S, 'a[data-vue="' + vue + '"]');
  await S.page.waitForFunction(x => { const s = document.getElementById('vue-' + x); return s && !s.hidden && s.getClientRects().length > 0; }, vue, { timeout: 5000 });
}
async function capture(S, nom) { if (!DOSSIER) return; fs.mkdirSync(DOSSIER, { recursive: true }); await S.page.waitForTimeout(350); await S.page.screenshot({ path: path.join(DOSSIER, nom + '.png') }); }

(async () => {
  const og = await T.fauxOpGestion(Object.fromEntries(Object.keys(MOTS).map(l => [l, { pass: MOTS[l], nom: NOMS[l], actif: true }])));
  const port = await T.portLibre();
  const svc = await T.lancerService({ port, urlGestion: og.url, config: { origines: ['http://127.0.0.1:' + port], pulsationMs: 3000, presenceGraceMs: 500, balayageMs: 500, beta: { relectureMs: 300, timeoutMs: 1500 } } });
  let b = null;
  try { b = await pw.chromium.launch({ executablePath: CHROME, headless: true, args: ARGS }); }
  catch (e) { console.error('Sonde non lançable : ' + e.message.split('\n')[0]); await svc.arreter(); await og.fermer(); process.exit(2); }
  try {
    const A = await ouvrir(b, svc.base, IPHONE, false, 'Alice'), B = await ouvrir(b, svc.base, BUREAU, true, 'Bruno');
    await connecter(A, 'alice'); await connecter(B, 'bruno');
    const ident = (S) => S.page.evaluate(async () => (await (await fetch('/api/moi')).json()).moi.identifiant);
    const iA = await ident(A), iB = await ident(B);
    vrai('population : Alice et Bruno sont connectés, chacun avec son identifiant (' + iA + ', ' + iB + ')', /^Alice#\d{4}$/.test(iA || '') && /^Bruno#\d{4}$/.test(iB || ''));

    console.log('\n── Réglages : l\'identifiant sous le nom, « Ajouter un contact » ──');
    await onglet(A, 'reglages');
    vrai('Alice lit son identifiant sous son nom, dans Réglages', await contient(A, '#reg-profil', iA), await texte(A, '#reg-profil'));
    vrai('« Ajouter un contact » dit « Par son identifiant, son numéro ou un lien »', await contient(A, '#reg-contact', 'par son identifiant'), await texte(A, '#reg-contact'));
    await toucher(A, '#reg-contact');
    vrai('la feuille « Contacts » s\'ouvre sur « Ajouter quelqu\'un qui a OP MESSAGES » : le champ est là', await attendre(A, () => { const c = document.getElementById('ct-ident'); return !!c && c.getClientRects().length > 0; }));
    const champ = await A.page.evaluate(() => { const c = document.getElementById('ct-ident'), r = c.getBoundingClientRect(); return { h: Math.round(r.height), fs: parseFloat(getComputedStyle(c).fontSize), ph: c.placeholder }; });
    v('⛔ le champ fait 16 px au moins (Safari zoomerait la page) et répond sur 44 px ; il dit quoi taper', [champ.fs >= 16, champ.h >= 44, champ.ph], [true, true, 'Camille#4821 ou un numéro']);
    vrai('« Mon identifiant » montre le sien, avec « Copier »', await attendre(A, x => { const c = document.getElementById('ct-ident-moi-champ'); return !!c && c.value === x; }, iA));

    console.log('\n── ⛔ un nom seul ne part pas au service ──');
    const avant = A.reseau.filter(r => r === 'POST /api/contacts/identifiant').length;
    await saisir(A, '#ct-ident', 'Bruno'); await toucher(A, '[data-act="ident-voir"]');
    vrai('« Bruno » seul : la page explique qu\'il faut « # » et les chiffres', await contient(A, '#info-erreur', 'un nom seul ne suffit pas'), await texte(A, '#info-erreur'));
    v('   et AUCUNE requête n\'est partie (population : la recherche suivante en fera une)', A.reseau.filter(r => r === 'POST /api/contacts/identifiant').length - avant, 0);

    console.log('\n── un identifiant inconnu : la phrase neutre ──');
    await saisir(A, '#ct-ident', 'Personne#1234'); await A.page.locator('#ct-ident').press('Enter');
    vrai('Entrée lance la recherche, la réponse est neutre (« Personne avec cet identifiant, ou… ne souhaite pas être trouvée »)', await contient(A, '#ct-ident-res', 'ne souhaite pas être trouvée'), await texte(A, '#ct-ident-res'));
    v('   (population : une requête est bien partie)', A.reseau.filter(r => r === 'POST /api/contacts/identifiant').length - avant, 1);
    vrai('   et l\'erreur d\'avant s\'est effacée', await A.page.evaluate(() => { const e = document.getElementById('info-erreur'); return !e || e.hidden || !e.textContent.trim(); }));

    console.log('\n── Alice trouve Bruno (en minuscules) et lui demande ──');
    await saisir(A, '#ct-ident', iB.toLowerCase()); await toucher(A, '[data-act="ident-voir"]');
    vrai('trouvé : « Bruno », son identifiant, « utilise OP MESSAGES », et « Demander »', await contient(A, '#ct-ident-res', 'utilise op messages') && (await texte(A, '#ct-ident-res')).includes(iB) && (await A.page.locator('#ct-ident-res [data-act="demande-envoyer"]').count()) === 1, await texte(A, '#ct-ident-res'));
    vrai('⛔ le nom de famille de Bruno n\'apparaît pas (seulement son prénom)', !(await texte(A, '#ct-ident-res')).includes('Petit'));
    await capture(A, '1-alice-trouve-bruno');
    await toucher(A, '#ct-ident-res [data-act="demande-envoyer"]');
    vrai('« Demander » devient « Demande envoyée »', await contient(A, '#ct-ident-res', 'demande envoyée'), await texte(A, '#ct-ident-res'));
    vrai('« Demandes envoyées » nomme Bruno, en attente, avec « Retirer »', await contient(A, '#ct-demandes', 'en attente') && (await texte(A, '#ct-demandes')).includes('Bruno'), await texte(A, '#ct-demandes'));
    vrai('⛔ …par son PRÉNOM seulement : son nom de famille n\'est pas dit à qui lui demande', !(await texte(A, '#ct-demandes')).includes('Petit'), await texte(A, '#ct-demandes'));
    vrai('les demandes viennent EN TÊTE de la feuille, avant le champ', await A.page.evaluate(() => { const d = document.getElementById('ct-demandes'), c = document.getElementById('ct-ident'); return !!d && !!c && !!(d.compareDocumentPosition(c) & Node.DOCUMENT_POSITION_FOLLOWING); }));
    await capture(A, '2-alice-demande-envoyee');
    const contactAvant = await A.page.evaluate(async x => ((await (await fetch('/api/contacts')).json()).contacts || []).some(c => c.id === x && c.mutuel), await B.page.evaluate(async () => (await (await fetch('/api/moi')).json()).moi.id));
    v('⛔ avant l\'accord, Bruno n\'est PAS un contact d\'Alice', contactAvant, false);

    console.log('\n── Bruno reçoit la demande et l\'accepte ──');
    vrai('une bannière « Demande de contact » descend chez Bruno', await contient(B, '#notif', 'demande de contact', 9000), await texte(B, '#notif'));
    await onglet(B, 'reglages');
    vrai('Réglages : une pastille « 1 » sur « Ajouter un contact »', await attendre(B, () => { const n = document.getElementById('reg-demandes-n'); return !!n && n.textContent.trim() === '1' && n.classList.contains('pastille-n'); }), await texte(B, '#reg-demandes-n'));
    await toucher(B, '#reg-contact');
    vrai('« Demandes reçues » : Alice Martin, son identifiant, « Accepter », « Refuser » et « Bloquer » (relecture du gardien, A3)', await contient(B, '#ct-demandes', 'demandes reçues') && (await texte(B, '#ct-demandes')).includes('Alice Martin') && (await texte(B, '#ct-demandes')).includes(iA)
      && (await B.page.locator('#ct-demandes [data-act="demande-accepter"]').count()) === 1 && (await B.page.locator('#ct-demandes [data-act="demande-refuser"]').count()) === 1
      && (await B.page.locator('#ct-demandes [data-act="demande-bloquer"]').count()) === 1, await texte(B, '#ct-demandes'));
    await capture(B, '3-bruno-demande-recue');
    await toucher(B, '#ct-demandes [data-act="demande-accepter"]');
    vrai('accepter ouvre la conversation avec Alice', await attendre(B, () => document.documentElement.dataset.conv === '1' && document.getElementById('conv-titre').textContent.includes('Alice'), null, 9000), await texte(B, '#conv-titre'));
    vrai('⛔ ils sont maintenant en contact (vu par Alice)', await attendre(A, async () => { const j = await (await fetch('/api/contacts')).json(); return (j.contacts || []).some(c => c.nom === 'Petit' || (c.prenom === 'Bruno' && c.mutuel)); }, null, 9000));
    vrai('Alice est prévenue : « Demande acceptée »', await contient(A, '#notif', 'demande acceptée', 9000), await texte(A, '#notif'));
    vrai('   et sa liste « Demandes envoyées » s\'est vidée', await attendre(A, () => !/Demandes envoyées/.test((document.getElementById('ct-demandes') || {}).textContent || ''), null, 9000), await texte(A, '#ct-demandes'));

    console.log('\n── Bruno se rend introuvable : Alice ne le retrouve plus ──');
    await onglet(B, 'reglages');
    vrai('Réglages › Confidentialité : l\'interrupteur « Me trouver par mon identifiant ou mon numéro », allumé', await attendre(B, () => { const s = document.querySelector('[data-reg-cle="trouvable"]'); return !!s && s.getAttribute('aria-checked') === 'true'; }));
    await capture(B, '4-bruno-confidentialite');
    await toucher(B, '[data-reg-cle="trouvable"]');
    vrai('il le coupe : aria-checked « false »', await attendre(B, () => { const s = document.querySelector('[data-reg-cle="trouvable"]'); return !!s && s.getAttribute('aria-checked') === 'false'; }));
    await saisir(A, '#ct-ident', iB); await toucher(A, '[data-act="ident-voir"]');
    vrai('⛔ Alice tape de nouveau son identifiant : la phrase neutre, comme pour un identifiant qui n\'existe pas', await contient(A, '#ct-ident-res', 'ne souhaite pas être trouvée'), await texte(A, '#ct-ident-res'));

    console.log('\n── « Nouvelle discussion › Nouveau contact » mène au champ ──');
    await A.page.evaluate(() => history.back()); await A.page.waitForTimeout(400);
    await onglet(A, 'messages'); await toucher(A, '#btn-plus');
    await attendre(A, () => !!document.querySelector('[data-nd-act="contact"]'));
    await toucher(A, '[data-nd-act="contact"]');
    vrai('au TÉLÉPHONE, la feuille Contacts s\'ouvre avec le champ là, mais le focus va à la feuille (le clavier ne surgit pas avant qu\'on ait rien vu)', await attendre(A, () => { const c = document.getElementById('ct-ident'); return !!c && c.getClientRects().length > 0 && document.activeElement && document.activeElement.id === 'feuille'; }),
      await A.page.evaluate(() => document.activeElement && (document.activeElement.id || document.activeElement.tagName)));
    await B.page.keyboard.press('Escape'); await B.page.waitForTimeout(300);
    await onglet(B, 'messages'); await toucher(B, '#btn-plus');
    await attendre(B, () => !!document.querySelector('[data-nd-act="contact"]'));
    await toucher(B, '[data-nd-act="contact"]');
    vrai('au BUREAU, « Nouveau contact » met le focus droit dans le champ de l\'identifiant', await attendre(B, () => document.activeElement && document.activeElement.id === 'ct-ident'), await B.page.evaluate(() => document.activeElement && (document.activeElement.id || document.activeElement.tagName)));
    await capture(B, '5-bruno-nouveau-contact');

    for (const S of [A, B]) {
      v(S.nom + ' : aucune erreur JavaScript, aucune erreur dans la console', [S.erreurs, S.console.filter(t => !/Failed to load resource/.test(t))], [[], []]);
    }
    const sortie = svc.sortie.texte();
    v('le service n\'a écrit aucune erreur (population : ' + sortie.split('\n').filter(Boolean).length + ' lignes de journal)', /Error|TypeError|unhandled|Exception/.test(sortie), false);
  } catch (e) { console.log('  ✗ la sonde est morte : ' + (e && e.stack || e)); process.exitCode = 1; }
  finally { try { await b.close(); } catch (e) { /* rien */ } await svc.arreter(); await og.fermer(); }
  fin();
})();
