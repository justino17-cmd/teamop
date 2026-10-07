/* ══ SONDE — L'IDENTIFIANT D'ESSAI DE LA TOUR SE TAPE LÀ OÙ L'ÉCRAN S'OUVRE ═══════════════════════════════════════════════════════════════════════════════════
   Justin, 7 octobre 2026, capture de la Tour à l'appui : « quand je crée les accès et que je me connecte, ça ne marche pas ». Le matin même, le compte par e-mail avait été ouvert sur la bêta :
   l'écran de connexion s'ouvre depuis sur « Adresse e-mail / Mot de passe », et l'identifiant donné par la Tour (sans @) y recevait « Adresse e-mail ou mot de passe incorrect ». Le formulaire
   d'essai n'existait plus que derrière un lien discret. La sonde joue, contre le VRAI service avec le compte par e-mail allumé (un faux relais SMTP) :
     1. l'écran s'ouvre bien sur le formulaire e-mail (population : c'est le cas qui cassait) ;
     2. ⛔ l'identifiant d'essai et son mot de passe, tapés DANS CE FORMULAIRE, ouvrent l'application ;
     3. un mauvais mot de passe d'essai dit « Identifiant ou mot de passe incorrect » (pas « adresse e-mail ») ;
     4. contre-épreuve : une adresse e-mail inconnue passe toujours par le compte e-mail (« Adresse e-mail ou mot de passe incorrect »).
   ⛔ ON ATTEND AU GESTE, JAMAIS AU CHRONOMÈTRE.   Lancer :   node tests/sonde-opmessages-essai-connexion.js     Code 1 si un contrôle tombe, 2 si elle ne peut pas tourner. */
const T = require('./outils-msg');
const { fauxRelais } = require('./outils-relais');
const { v, vrai, fin } = T.compteur();
T.sauterSiSansDependances();

let pw; try { pw = require('playwright-core'); } catch (e) {
  for (const c of ['/opt/node22/lib/node_modules/playwright/node_modules/playwright-core', '/opt/node-tools/node_modules/playwright-core', 'playwright']) { try { pw = require(c); break; } catch (_) { /* suivant */ } }
  if (!pw) { console.error('Sonde non lançable : playwright-core est introuvable.'); process.exit(2); }
}
const CHROME = '/opt/pw-browsers/chromium';

(async () => {
  const og = await T.fauxOpGestion({ controle: { pass: 'pw-controle-12', nom: 'Contrôle TEAM OP', actif: true } });
  const relais = await fauxRelais({});
  const courriel = { hote: '127.0.0.1', port: relais.port, securite: 'aucune', de: 'comptes@exemple.invalid', timeoutMs: 3000 };
  const port = await T.portLibre();
  const svc = await T.lancerService({ port, urlGestion: og.url, config: { origines: ['http://127.0.0.1:' + port], courriel, inscriptionCourriel: true } });
  let b = null;
  try { b = await pw.chromium.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] }); }
  catch (e) { console.error('Sonde non lançable : ' + e.message.split('\n')[0]); await svc.arreter(); await og.fermer(); await relais.fermer(); process.exit(2); }
  try {
    const ctx = await b.newContext({ viewport: { width: 393, height: 852 }, isMobile: true, hasTouch: true, locale: 'fr-FR' });
    const page = await ctx.newPage(); page.setDefaultTimeout(12000);
    const erreurs = []; page.on('pageerror', e => erreurs.push(String(e && e.message || e).slice(0, 200)));
    const attendre = (fn, ms) => page.waitForFunction(fn, null, { timeout: ms || 12000, polling: 50 }).then(() => true, () => false);
    const message = () => page.evaluate(() => { const e = document.querySelector('#f-mel .connexion-erreur'); return e && !e.hidden ? e.textContent : ''; });
    await page.goto(svc.base + '/');

    console.log('\n1. L\'écran s\'ouvre sur le compte par e-mail');
    vrai('population : le formulaire « Adresse e-mail » est celui qui s\'affiche (le compte par e-mail est ouvert)', await attendre(() => { const f = document.getElementById('f-mel'); return f && !f.hidden && document.getElementById('f-connexion').hidden; }));
    v('le champ dit qu\'il accepte aussi l\'identifiant', await page.getAttribute('#cx-mel-adresse', 'placeholder'), 'Adresse e-mail ou identifiant');

    console.log('\n2. Un mauvais mot de passe d\'essai');
    await page.fill('#cx-mel-adresse', 'controle'); await page.fill('#cx-mel-mdp', 'pas-le-bon-1'); await page.tap('#f-mel button[type=submit]');
    vrai('il dit « Identifiant ou mot de passe incorrect », pas « adresse e-mail »', await attendre(() => { const e = document.querySelector('#f-mel .connexion-erreur'); return e && !e.hidden && /Identifiant ou mot de passe incorrect/.test(e.textContent); }));

    console.log('\n3. Une adresse inconnue passe toujours par le compte e-mail (contre-épreuve)');
    await page.fill('#cx-mel-adresse', 'personne@exemple.invalid'); await page.fill('#cx-mel-mdp', 'pas-le-bon-1'); await page.tap('#f-mel button[type=submit]');
    vrai('elle dit « Adresse e-mail ou mot de passe incorrect »', await attendre(() => { const e = document.querySelector('#f-mel .connexion-erreur'); return e && !e.hidden && /Adresse e-mail ou mot de passe incorrect/.test(e.textContent); }));

    console.log('\n4. ⛔ L\'identifiant d\'essai et son mot de passe, tapés dans CE formulaire');
    await page.fill('#cx-mel-adresse', 'controle'); await page.fill('#cx-mel-mdp', 'pw-controle-12'); await page.tap('#f-mel button[type=submit]');
    const dedans = await attendre(() => { const a = document.getElementById('app'); return a && !a.hidden && document.getElementById('moi-nom').textContent.trim().length > 0; }, 15000);
    vrai('l\'application s\'ouvre (message affiché avant : « ' + (dedans ? '—' : await message().catch(() => '?')) + ' »)', dedans);
    if (dedans) v('…au nom donné par la Tour', await page.evaluate(() => document.getElementById('moi-nom').textContent.trim()), 'Contrôle TEAM OP');
    v('aucune erreur JavaScript', erreurs, []);
  } finally { await b.close(); await svc.arreter(); await og.fermer(); await relais.fermer(); }
  fin();
})().catch(e => { console.error(e); process.exit(1); });
