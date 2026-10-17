/* ══ SONDE — L'ÉCRAN DE CONNEXION (lot m02) : LA PANNE DU RELAIS SE DIT, LE CODE ÉPUISÉ SE DIT, LE FOCUS, LE MOT DE PASSE QU'UNE COUPURE NE VIDE PAS, LA PHRASE D'UNE SESSION FERMÉE — LA VRAIE PAGE SERVIE ══
   Joué contre le VRAI service, sur la page servie (`server-msg/public/`), au navigateur :
     1. relais MORT : « Mot de passe oublié » ne mène PAS à « Vérifie tes e-mails » — la page DIT que l'envoi est indisponible et reste sur la demande ; « Créer un compte » n'est pas proposé ;
     2. cinq codes faux : les quatre premiers ont la phrase d'avant (« Ce code n'est pas le bon »), le cinquième et le sixième disent « Trop d'essais … demande un nouveau code » ;
     3. à l'ouverture sur ORDINATEUR (pointeur précis) le champ Identifiant (accès d'essai) ou Adresse e-mail a le focus ; au doigt, rien ne s'ouvre tout seul ;
     4. une COUPURE (réseau coupé) ne vide pas le mot de passe, un REFUS d'identifiants le vide — sur les deux formulaires ;
     5. la session fermée ne parle pas de la Tour de contrôle.
   ⛔ ON ATTEND AU GESTE ; chaque absence est précédée de sa population.
   Lancer :   node tests/sonde-opmessages-entree-m02.js     (BANC_SITE_MSG pour viser un autre dossier de service n'est pas géré ici : la sonde lance le service du dépôt.)
   Code 1 si UN contrôle tombe, 2 si elle ne peut pas tourner. */
const T = require('./outils-msg');
const { fauxRelais } = require('./outils-relais');
const { v, vrai, fin } = T.compteur();
T.sauterSiSansDependances();

let pw; try { pw = require('playwright-core'); } catch (e) {
  for (const c of ['/opt/node22/lib/node_modules/playwright/node_modules/playwright-core', '/opt/node-tools/node_modules/playwright-core', 'playwright']) { try { pw = require(c); break; } catch (_) { /* suivant */ } }
  if (!pw) { console.error('Sonde non lançable : playwright-core est introuvable.'); process.exit(2); }
}
const CHROME = '/opt/pw-browsers/chromium';
const ARGS = ['--no-sandbox', '--disable-dev-shm-usage'];
const BUREAU = { w: 1440, h: 900, mobile: false }, IPHONE = { w: 393, h: 852, mobile: true };
const ADR = 'zoe.martin@exemple.invalid', MDP = 'un-mot-de-passe-solide';

async function ouvrir(b, base, pf, chemin) {
  const ctx = await b.newContext({ viewport: { width: pf.w, height: pf.h }, deviceScaleFactor: 1, isMobile: pf.mobile, hasTouch: pf.mobile, reducedMotion: 'reduce', locale: 'fr-FR' });
  const page = await ctx.newPage(); page.setDefaultTimeout(9000);
  await page.goto(base + (chemin || '/'));
  return { ctx, page };
}
const attendre = (S, fn, arg, ms) => S.page.waitForFunction(fn, arg, { timeout: ms || 9000, polling: 50 }).then(() => true, () => false);
const PANNEAUX = ['f-connexion', 'f-mel', 'f-inscrire', 'f-code', 'f-oubli'];
const panneau = (S) => S.page.evaluate((P) => P.filter(id => !document.getElementById(id).hidden), PANNEAUX);
const erreur = (S) => S.page.evaluate((P) => { const f = P.map(id => document.getElementById(id)).find(x => !x.hidden); const e = f && (f.id === 'f-connexion' ? document.getElementById('connexion-erreur') : f.querySelector('.connexion-erreur')); return e && !e.hidden ? e.textContent.trim() : ''; }, PANNEAUX);
const actif = (S) => S.page.evaluate(() => document.activeElement && document.activeElement !== document.body ? document.activeElement.id || document.activeElement.tagName : '');
const visible = (S, sel) => S.page.evaluate(x => { const e = document.querySelector(x); return !!e && !e.closest('[hidden]') && e.getClientRects().length > 0; }, sel);
const soumettre = (S, form) => S.page.locator('#' + form + ' button[type=submit]').click();
const attendreErreur = (S, re) => attendre(S, (r) => { const P = ['f-connexion', 'f-mel', 'f-inscrire', 'f-code', 'f-oubli']; const f = P.map(id => document.getElementById(id)).find(x => !x.hidden); const e = f && (f.id === 'f-connexion' ? document.getElementById('connexion-erreur') : f.querySelector('.connexion-erreur')); return !!e && !e.hidden && new RegExp(r).test(e.textContent); }, re.source);

(async () => {
  const relais = await fauxRelais({});
  const vif = await T.lancerService({ config: { courriel: { hote: '127.0.0.1', port: relais.port, securite: 'aucune', de: 'comptes@exemple.invalid', timeoutMs: 3000 }, inscriptionCourriel: true } });
  const mort = await T.lancerService({ config: { courriel: { hote: '127.0.0.1', port: 1, securite: 'aucune', de: 'comptes@exemple.invalid', timeoutMs: 3000 }, inscriptionCourriel: true } });
  const og = await T.fauxOpGestion({ controle: { pass: 'pw-controle-12', nom: 'Contrôle TEAM OP', actif: true } });      // la porte de l'accès d'essai : un faux OP GESTION qui refuse les autres
  const sans = await T.lancerService({ urlGestion: og.url });
  let b = null;
  try { b = await pw.chromium.launch({ executablePath: CHROME, headless: true, args: ARGS }); }
  catch (e) { console.error('Sonde non lançable : ' + e.message); process.exit(2); }
  try {
    console.log('\n1. Relais mort : « Mot de passe oublié » DIT la panne au lieu d\'annoncer un code');
    {
      const S = await ouvrir(b, mort.base, BUREAU);
      vrai('population : l\'écran de connexion par adresse est là', await attendre(S, () => !document.getElementById('f-mel').hidden));
      v('« Créer un compte » n\'est PAS proposé (le service ne peut rien envoyer)', await visible(S, '#f-mel [data-cx="f-inscrire"]'), false);
      await S.page.locator('#f-mel [data-cx="f-oubli"]').click();
      await S.page.fill('#cx-oubli-adresse', ADR);
      await soumettre(S, 'f-oubli');
      vrai('la page DIT que l\'envoi est indisponible', await attendreErreur(S, /indisponible/));
      v('⛔ elle reste sur la demande : jamais « Vérifie tes e-mails »', await panneau(S), ['f-oubli']);
      vrai('   et ne promet aucun code', !/vient de partir|est parti/.test(await erreur(S)));
      await S.ctx.close();
    }

    console.log('\n2. Cinq codes faux : le refus devient « Trop d\'essais »');
    {
      const S = await ouvrir(b, vif.base, BUREAU);
      vrai('population : « Créer un compte » est proposé', await attendre(S, () => { const e = document.querySelector('#f-mel [data-cx="f-inscrire"]'); return !!e && !e.hidden && e.getClientRects().length > 0; }));
      await S.page.locator('#f-mel [data-cx="f-inscrire"]').click();
      await S.page.fill('#cx-ins-prenom', 'Zoé'); await S.page.fill('#cx-ins-adresse', ADR); await S.page.fill('#cx-ins-mdp', MDP); await S.page.check('#cx-ins-conditions');
      await soumettre(S, 'f-inscrire');
      vrai('population : l\'écran du code', await attendre(S, () => !document.getElementById('f-code').hidden));
      vrai('population : un courriel est arrivé au relais', await T.attendre(() => relais.messages.length >= 1, 8000, 25));
      const phrases = [];
      for (let i = 0; i < 6; i++) {
        await S.page.fill('#cx-code', '00000' + (i + 1));
        await soumettre(S, 'f-code');
        const dit = await attendreErreur(S, /./);
        phrases.push(dit ? await erreur(S) : '(rien)');
        if (i < 5) await S.page.waitForTimeout(150);
        await S.page.fill('#cx-code', '');
      }
      v('les quatre premiers refus gardent la phrase du service', phrases.slice(0, 4).map(p => /pas le bon|expiré/.test(p)), [true, true, true, true]);
      v('⛔ le cinquième ET le sixième disent « Trop d\'essais » et qu\'il faut un nouveau code', phrases.slice(4).map(p => /Trop d'essais/.test(p) && /nouveau/.test(p)), [true, true]);
      await S.ctx.close();
    }

    console.log('\n3. Le focus à l\'ouverture (ordinateur seulement)');
    {
      const D = await ouvrir(b, sans.base, BUREAU);
      vrai('population : l\'écran d\'accès d\'essai est ouvert', await attendre(D, () => !document.getElementById('f-connexion').hidden));
      v('⛔ bureau, accès d\'essai : le champ Identifiant a le focus', await actif(D), 'c-login');
      await D.ctx.close();
      const E = await ouvrir(b, vif.base, BUREAU);
      vrai('population : le panneau par adresse est ouvert', await attendre(E, () => !document.getElementById('f-mel').hidden));
      v('bureau, par adresse : le champ Adresse e-mail a le focus', await actif(E), 'cx-mel-adresse');
      await E.ctx.close();
      const M = await ouvrir(b, sans.base, IPHONE);
      vrai('population : l\'écran d\'accès d\'essai est ouvert (iPhone)', await attendre(M, () => !document.getElementById('f-connexion').hidden));
      await M.page.waitForTimeout(400);
      v('au doigt : rien n\'a le focus (le clavier ne s\'ouvre pas tout seul)', await actif(M), '');
      await M.ctx.close();
    }

    console.log('\n4. Une coupure ne vide pas le mot de passe, un refus le vide');
    {
      const S = await ouvrir(b, sans.base, BUREAU);
      vrai('population : accès d\'essai', await attendre(S, () => !document.getElementById('f-connexion').hidden));
      await S.page.fill('#c-login', 'zoe'); await S.page.fill('#c-pass', MDP);
      await S.ctx.setOffline(true);
      await soumettre(S, 'f-connexion');
      vrai('la coupure se dit', await attendreErreur(S, /connexion au service/));
      v('⛔ accès d\'essai : le mot de passe est resté', await S.page.inputValue('#c-pass'), MDP);
      await S.ctx.setOffline(false);
      await soumettre(S, 'f-connexion');
      vrai('en ligne, les identifiants sont refusés', await attendreErreur(S, /incorrect|identifiant/i));
      v('   un refus d\'identifiants VIDE le mot de passe', await S.page.inputValue('#c-pass'), '');
      await S.ctx.close();
      const F = await ouvrir(b, vif.base, BUREAU);
      vrai('population : par adresse', await attendre(F, () => !document.getElementById('f-mel').hidden));
      await F.page.fill('#cx-mel-adresse', ADR); await F.page.fill('#cx-mel-mdp', MDP);
      await F.ctx.setOffline(true);
      await soumettre(F, 'f-mel');
      vrai('la coupure se dit', await attendreErreur(F, /connexion au service/));
      v('⛔ par adresse : le mot de passe est resté', await F.page.inputValue('#cx-mel-mdp'), MDP);
      await F.ctx.setOffline(false);
      await soumettre(F, 'f-mel');
      vrai('en ligne, le refus se dit', await attendreErreur(F, /incorrect/));
      v('   un refus d\'identifiants VIDE le mot de passe', await F.page.inputValue('#cx-mel-mdp'), '');
      await F.ctx.close();
    }

    console.log('\n5. La session fermée ne parle pas de la Tour de contrôle');
    {
      const S = await ouvrir(b, sans.base, BUREAU, '/?m=session_requise');
      vrai('population : l\'écran de connexion dit que la session a pris fin', await attendreErreur(S, /Ta session a pris fin/));
      const t = await erreur(S);
      v('⛔ pas un mot sur la Tour de contrôle, et la cause « autre appareil » est nommée', [/Tour/.test(t), /autre de tes appareils/.test(t), /Reconnecte-toi/.test(t)], [false, true, true]);
      await S.ctx.close();
    }
  } finally {
    try { await b.close(); } catch (e) { /* déjà fermé */ }
    for (const s of [vif, mort, sans]) { try { await s.arreter(); } catch (e) { /* déjà arrêté */ } }
    try { await relais.fermer(); } catch (e) { /* déjà fermé */ }
    try { await og.fermer(); } catch (e) { /* déjà fermé */ }
  }
  fin();
})().catch((e) => { console.log('  ✗ la sonde a levé : ' + (e && e.stack || e)); process.exitCode = 1; fin(); });
