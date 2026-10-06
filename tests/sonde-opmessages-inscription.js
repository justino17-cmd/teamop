/* ══ SONDE — S'INSCRIRE « COMME DISCORD » (une adresse e-mail, un mot de passe, un code reçu par courriel), SE CONNECTER, MOT DE PASSE OUBLIÉ — LA VRAIE PAGE SERVIE ══════════════
   Décision de Justin, 6 octobre 2026 : le numéro de téléphone devient facultatif. Joué contre le VRAI service (inscriptions ouvertes, un faux relais SMTP qui reçoit les codes) :
     1. l'écran s'ouvre sur « Se connecter » par adresse, avec « Créer un compte » et l'accès d'essai ;
     2. Zoé (iPhone 393, jour) crée son compte : les refus se DISENT (case non cochée, mot de passe court, faux code), le bon code la fait entrer ;
     3. sur un autre appareil (bureau 1440, nuit) elle se connecte ; un mauvais mot de passe le dit ;
     4. sur un troisième, « mot de passe oublié » : le code, un nouveau mot de passe — elle entre, et l'appareil d'avant est DÉCONNECTÉ ;
     5. un service SANS relais garde l'écran d'avant (accès d'essai seul) : rien n'est proposé qui ne marcherait pas.
   ⛔ ON ATTEND AU GESTE ; ⛔ CHAQUE ABSENCE EST PRÉCÉDÉE DE SA POPULATION ; mises en page mesurées (champs à 16 px au moins : Safari zoomerait ; cibles de 44 px ; rien ne déborde).
   Lancer :   node tests/sonde-opmessages-inscription.js          CAPTURES=/dossier pour les images.
   Code 1 si UN contrôle tombe, 2 si elle ne peut pas tourner. */
const fs = require('fs'), path = require('path');
const T = require('./outils-msg');
const { fauxRelais, lireMessage } = require('./outils-relais');
const { v, vrai, fin } = T.compteur();
T.sauterSiSansDependances();

let pw; try { pw = require('playwright-core'); } catch (e) {
  for (const c of ['/opt/node22/lib/node_modules/playwright/node_modules/playwright-core', '/opt/node-tools/node_modules/playwright-core', 'playwright']) { try { pw = require(c); break; } catch (_) { /* suivant */ } }
  if (!pw) { console.error('Sonde non lançable : playwright-core est introuvable.'); process.exit(2); }
}
const CHROME = '/opt/pw-browsers/chromium';
const DOSSIER = process.env.CAPTURES || null;
const ARGS = ['--no-sandbox', '--disable-dev-shm-usage', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--enable-gpu-rasterization', '--ignore-gpu-blocklist', '--mute-audio'];
const IPHONE = { w: 393, h: 852, dpr: 2, mobile: true }, BUREAU = { w: 1440, h: 900, dpr: 1, mobile: false };
const ADR = 'zoe.martin@exemple.invalid', MDP = 'un-mot-de-passe-solide', MDP2 = 'un-autre-mot-de-passe-solide';
const codeDe = (m) => { const x = /\b(\d{6})\b/.exec(m.texte || ''); return x ? x[1] : null; };

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
const visible = (S, sel) => S.page.evaluate(x => { const e = document.querySelector(x); return !!e && !e.closest('[hidden]') && e.getClientRects().length > 0; }, sel);
const panneau = (S) => S.page.evaluate(() => ['f-connexion', 'f-mel', 'f-inscrire', 'f-code', 'f-oubli'].filter(id => !document.getElementById(id).hidden));
const erreur = (S) => S.page.evaluate(() => { const f = ['f-connexion', 'f-mel', 'f-inscrire', 'f-code', 'f-oubli'].map(id => document.getElementById(id)).find(x => !x.hidden); const e = f && f.querySelector('.connexion-erreur'); return e && !e.hidden ? e.textContent : ''; });
const dansApp = (S) => attendre(S, () => { const a = document.getElementById('app'); return a && !a.hidden && document.getElementById('moi-nom').textContent.trim().length > 0; }, null, 12000);
async function mesurer(S, id) {
  return S.page.evaluate((id) => {
    const f = document.getElementById(id), r = f.getBoundingClientRect();
    const champs = Array.from(f.querySelectorAll('input:not([type=checkbox])')).filter(x => x.getClientRects().length).map(x => parseFloat(getComputedStyle(x).fontSize));
    const cibles = Array.from(f.querySelectorAll('button, .cx-case')).filter(x => x.getClientRects().length && !x.classList.contains('en-ligne')).map(x => Math.round(x.getBoundingClientRect().height));
    return { dedans: r.left >= 0 && r.right <= innerWidth + 0.5, page: document.documentElement.scrollWidth <= innerWidth, champs16: champs.length > 0 && champs.every(t => t >= 16), cibles44: cibles.length > 0 && cibles.every(h => h >= 44), n: champs.length + cibles.length };
  }, id);
}
async function capture(S, nom) { if (!DOSSIER) return; fs.mkdirSync(DOSSIER, { recursive: true }); await S.page.waitForTimeout(250); await S.page.screenshot({ path: path.join(DOSSIER, nom + '.png') }); }

(async () => {
  const relais = await fauxRelais({});
  const courriel = { hote: '127.0.0.1', port: relais.port, securite: 'aucune', de: 'comptes@exemple.invalid', timeoutMs: 3000 };
  const port = await T.portLibre();
  const svc = await T.lancerService({ port, config: { origines: ['http://127.0.0.1:' + port], courriel, inscriptionCourriel: true, quotas: { mel_envoi: { renvoiMs: 2000 } } } });
  const sansRelais = await T.lancerService({});
  const messages = () => relais.messages.map(lireMessage);
  let b = null;
  try { b = await pw.chromium.launch({ executablePath: CHROME, headless: true, args: ARGS }); }
  catch (e) { console.error('Sonde non lançable : ' + e.message.split('\n')[0]); await svc.arreter(); await sansRelais.arreter(); await relais.fermer(); process.exit(2); }
  try {
    console.log('\n── 1. L\'écran de connexion propose l\'adresse e-mail ──');
    const A = await ouvrir(b, svc.base, IPHONE, false);
    vrai('l\'écran s\'ouvre sur « Se connecter » par adresse (le service l\'a proposé)', await attendre(A, () => !document.getElementById('f-mel').hidden && document.getElementById('f-connexion').hidden));
    v('« Créer un compte » et « Accès d\'essai » y sont', [await visible(A, '#f-mel [data-cx="f-inscrire"]'), await visible(A, '#f-mel [data-cx-essai]')], [true, true]);
    const m1 = await mesurer(A, 'f-mel');
    v('iPhone : la carte tient dans l\'écran, la page ne glisse pas de côté, champs à 16 px au moins, cibles de 44 px', [m1.dedans, m1.page, m1.champs16, m1.cibles44, m1.n > 3], [true, true, true, true, true]);
    await capture(A, '1-connexion-iphone');

    console.log('\n── 2. Zoé crée son compte (iPhone, jour) ──');
    await toucher(A, '#f-mel [data-cx="f-inscrire"]');
    vrai('« Créer un compte » ouvre le formulaire', await attendre(A, () => !document.getElementById('f-inscrire').hidden));
    await A.page.locator('#cx-ins-prenom').fill('Zoé'); await A.page.locator('#cx-ins-nom').fill('Martin');
    await A.page.locator('#cx-ins-adresse').fill(ADR); await A.page.locator('#cx-ins-mdp').fill('court');
    await toucher(A, '#f-inscrire button[type=submit]');
    vrai('un mot de passe court : l\'écran le DIT, rien ne part', /10 caractères/.test(await erreur(A)) && relais.messages.length === 0, await erreur(A));
    await A.page.locator('#cx-ins-mdp').fill(MDP);
    await toucher(A, '#f-inscrire button[type=submit]');
    vrai('la case non cochée : l\'écran le DIT', /15 ans/.test(await erreur(A)), await erreur(A));
    const m2 = await mesurer(A, 'f-inscrire');
    v('iPhone : le formulaire tient, champs à 16 px, case et boutons à 44 px', [m2.dedans, m2.page, m2.champs16, m2.cibles44], [true, true, true, true]);
    await capture(A, '2-inscription-iphone');
    await toucher(A, '#cx-ins-conditions');
    await toucher(A, '#f-inscrire button[type=submit]');
    vrai('« Continuer » : l\'écran du code, qui nomme l\'adresse SANS dire si elle a déjà un compte', await attendre(A, x => !document.getElementById('f-code').hidden && document.getElementById('cx-code-sous').textContent.includes(x) && /n'a pas encore de compte/.test(document.getElementById('cx-code-sous').textContent), ADR));
    vrai('« Renvoyer le code » attend (décompte affiché)', await A.page.evaluate(() => { const r = document.getElementById('cx-renvoyer'); return r.disabled && /\(\d+ s\)/.test(r.textContent); }));
    vrai('population : le code arrive au relais', await T.attendre(() => relais.messages.length >= 1, 8000, 25));
    const code = codeDe(messages()[0]);
    await capture(A, '3-code-iphone');
    await A.page.locator('#cx-code').fill(String((Number(code) + 1) % 1000000).padStart(6, '0'));
    await toucher(A, '#f-code button[type=submit]');
    vrai('un faux code : « Ce code n\'est pas le bon »', await attendre(A, () => { const f = document.getElementById('f-code'); const e = f.querySelector('.connexion-erreur'); return !e.hidden && /pas le bon/.test(e.textContent); }), await erreur(A));
    await A.page.locator('#cx-code').fill(code);
    await toucher(A, '#f-code button[type=submit]');
    vrai('le bon code : Zoé ENTRE dans l\'application', await dansApp(A));
    v('   à son nom', await A.page.evaluate(() => document.getElementById('moi-nom').textContent.trim()), 'Zoé Martin');
    await capture(A, '4-entree-iphone');

    console.log('\n── 3. Se connecter sur un autre appareil (bureau, nuit) ──');
    const B = await ouvrir(b, svc.base, BUREAU, true);
    vrai('population : l\'écran « Se connecter » par adresse', await attendre(B, () => !document.getElementById('f-mel').hidden));
    await B.page.locator('#cx-mel-adresse').fill(ADR); await B.page.locator('#cx-mel-mdp').fill('pas-le-bon-mot-de-passe');
    await toucher(B, '#f-mel button[type=submit]');
    vrai('un mauvais mot de passe : « Adresse e-mail ou mot de passe incorrect », le champ du mot de passe vidé', await attendre(B, () => { const e = document.querySelector('#f-mel .connexion-erreur'); return !e.hidden && /incorrect/.test(e.textContent) && document.getElementById('cx-mel-mdp').value === ''; }));
    await capture(B, '5-erreur-bureau-nuit');
    await B.page.locator('#cx-mel-mdp').fill(MDP);
    await toucher(B, '#f-mel button[type=submit]');
    vrai('le bon mot de passe : Zoé entre', await dansApp(B));

    console.log('\n── 4. Mot de passe oublié (un troisième appareil) : l\'appareil d\'avant est déconnecté ──');
    const C = await ouvrir(b, svc.base, IPHONE, true);
    await attendre(C, () => !document.getElementById('f-mel').hidden);
    await C.page.locator('#cx-mel-adresse').fill(ADR);
    await toucher(C, '#f-mel [data-cx="f-oubli"]');
    v('« Mot de passe oublié ? » reprend l\'adresse déjà tapée', await C.page.evaluate(() => document.getElementById('cx-oubli-adresse').value), ADR);
    const n0 = relais.messages.length;
    await toucher(C, '#f-oubli button[type=submit]');
    vrai('l\'écran du code demande AUSSI le nouveau mot de passe, et prévient que tous les appareils seront déconnectés', await attendre(C, () => !document.getElementById('f-code').hidden && !document.getElementById('cx-code-mdp-champ').hidden && /déconnectés/.test(document.getElementById('cx-code-sous').textContent)));
    vrai('population : le code de réinitialisation arrive', await T.attendre(() => relais.messages.length > n0, 8000, 25));
    const code2 = codeDe(messages()[n0]);
    await C.page.locator('#cx-code').fill(code2); await C.page.locator('#cx-code-mdp').fill(MDP2);
    await capture(C, '6-reinit-iphone-nuit');
    await toucher(C, '#f-code button[type=submit]');
    vrai('le code et le nouveau mot de passe : Zoé entre', await dansApp(C));
    vrai('⛔ l\'appareil du bureau, connecté avec l\'ancien mot de passe, est RENVOYÉ à l\'écran de connexion (sans rien toucher)', await attendre(B, () => !document.getElementById('connexion').hidden && document.getElementById('app').hidden, null, 15000));

    console.log('\n── 5. Sans relais, rien n\'est proposé qui ne marcherait pas ──');
    const D = await ouvrir(b, sansRelais.base, IPHONE, false);
    vrai('population : l\'écran de connexion est là', await attendre(D, () => !document.getElementById('connexion').hidden));
    await D.page.waitForTimeout(800);
    v('il reste celui de l\'accès d\'essai : pas de « Se connecter avec une adresse e-mail », pas de création de compte', [await panneau(D), await visible(D, '#f-connexion [data-cx="f-mel"]')], [['f-connexion'], false]);

    v('aucune erreur JavaScript', [A.erreurs, B.erreurs, C.erreurs, D.erreurs], [[], [], [], []]);
  } finally { await b.close(); await svc.arreter(); await sansRelais.arreter(); await relais.fermer(); }
  fin();
})().catch(e => { console.error(e); process.exit(2); });
