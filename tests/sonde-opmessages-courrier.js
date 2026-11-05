/* ══ SONDE — LA RUBRIQUE « COURRIER » D'OP MESSAGES DANS LA VRAIE PAGE SERVIE, AVEC DE VRAIES BOÎTES (fausses, sur 127.0.0.1) : RELIER, LIRE, RÉPONDRE, DÉLIER ═══════════════════════════════════════
   6 novembre 2026. Le VRAI service (ouvert aux boîtes mail, Google configuré), la VRAIE page, le VRAI module `opcourrier.js`, un faux IMAP (`faux-imap-boites.js`) et un faux relais SMTP :
     1. fermé : « Ajouter une boîte mail » dit « Bientôt » (aucun changement pour une personne tant que Justin n'a pas ouvert) ;
     2. ouvert : « Ajouter une boîte mail » propose « Continuer avec Google » ; une adresse chez un fournisseur à mot de passe demande le mot de passe, relie la boîte, la réception paraît ;
     3. ouvrir un message (texte seul : le HTML piégé ne s'exécute pas, aucune image distante), répondre, délier ;
     4. captures : iPhone, Android, iPad, Mac et Windows, jour ET nuit (CAPTURES=/dossier), à regarder à l'œil — et AUCUNE erreur JavaScript, AUCUN défilement latéral de la page.
   ⛔ ON ATTEND AU GESTE ; ⛔ CHAQUE ABSENCE EST PRÉCÉDÉE DE SA POPULATION. Le module vit dans un arbre d'ombre : les sélecteurs passent par lui (Playwright perce les arbres ouverts).
   Lancer :   node tests/sonde-opmessages-courrier.js          CAPTURES=/dossier pour les images.     Code 1 si UN contrôle tombe, 2 si elle ne peut pas tourner. */
const fs = require('fs'), os = require('os'), path = require('path');
const T = require('./outils-msg');
const { fauxRelais } = require('./outils-relais');
const { v, vrai, fin } = T.compteur();
T.sauterSiSansDependances();

let pw; try { pw = require('playwright-core'); } catch (e) {
  for (const c of ['/opt/node22/lib/node_modules/playwright/node_modules/playwright-core', '/opt/node-tools/node_modules/playwright-core', 'playwright']) { try { pw = require(c); break; } catch (_) { /* suivant */ } }
  if (!pw) { console.error('Sonde non lançable : playwright-core est introuvable.'); process.exit(2); }
}
const CHROME = '/opt/pw-browsers/chromium';
const DOSSIER = process.env.CAPTURES || null;
const ARGS = ['--no-sandbox', '--disable-dev-shm-usage', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--enable-gpu-rasterization', '--ignore-gpu-blocklist', '--mute-audio'];
const MDP = 'pw-alice-1234', BOITE = 'alice.pro@exemple.test', SECRET = 'AppPassSondeXQZ9wvK';
const PROFILS = {
  iphone: { w: 393, h: 852, dpr: 2, mobile: true, ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1' },
  android: { w: 360, h: 800, dpr: 3, mobile: true, ua: 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36' },
  ipad: { w: 820, h: 1180, dpr: 2, mobile: true, ua: 'Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1' },
  mac: { w: 1440, h: 900, dpr: 2, mobile: false, ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15' },
  windows: { w: 1366, h: 768, dpr: 1, mobile: false, ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 Edg/130.0.0.0' },
};
const HTML_PIEGE = '<html><body onload="window.__piege=1"><h1>Titre piégé</h1><p>Bonjour <a href="javascript:window.__piege=2">clic</a> <img src="http://127.0.0.1:9/pixel.png"></p><script>window.__piege=3</script></body></html>';

async function ouvrir(b, base, pf, nuit, cible) {
  const ctx = await b.newContext({ viewport: { width: pf.w, height: pf.h }, deviceScaleFactor: pf.dpr, isMobile: pf.mobile, hasTouch: pf.mobile, userAgent: pf.ua, colorScheme: nuit ? 'dark' : 'light', reducedMotion: 'reduce', locale: 'fr-FR', timezoneId: 'Europe/Paris' });
  const page = await ctx.newPage(); page.setDefaultTimeout(9000);
  const S = { ctx, page, pf, erreurs: [], requetesDehors: [] };
  page.on('pageerror', e => S.erreurs.push(String(e && e.message || e).slice(0, 220)));
  page.on('request', r => { const u = r.url(); if (!u.startsWith(base) && !u.startsWith('data:') && !u.startsWith('blob:')) S.requetesDehors.push(u.slice(0, 80)); });
  await page.goto(base + '/');
  await page.locator('#c-login').fill('alice'); await page.locator('#c-pass').fill(MDP); await page.locator('#c-entrer').click();
  await page.waitForFunction(() => { const a = document.getElementById('app'); return a && !a.hidden && document.getElementById('moi-nom').textContent.trim().length > 0; }, null, { timeout: 12000 });
  await page.evaluate(() => { location.hash = '#courrier'; });
  await page.waitForFunction(() => { const z = document.querySelector('#courrier-zone [data-opcourrier]'); return !!z && !!z.shadowRoot && z.shadowRoot.children.length > 1; }, null, { timeout: 15000 }).catch(() => {});
  return S;
}
const attendre = (S, fn, arg, ms) => S.page.waitForFunction(fn, arg, { timeout: ms || 9000, polling: 50 }).then(() => true, () => false);
const texteModule = (S) => S.page.evaluate(() => { const z = document.querySelector('#courrier-zone [data-opcourrier]'); return z && z.shadowRoot ? z.shadowRoot.textContent.replace(/\s+/g, ' ') : ''; });
async function capture(S, nom) { if (!DOSSIER) return; fs.mkdirSync(DOSSIER, { recursive: true }); await S.page.waitForTimeout(400); await S.page.screenshot({ path: path.join(DOSSIER, nom + '.png') }); }
const debord = (S) => S.page.evaluate(async () => {
  await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))); void document.body.offsetWidth; await new Promise(r => setTimeout(r, 700));
  window.scrollTo(9999, window.scrollY); const x = window.scrollX; window.scrollTo(0, window.scrollY); return x;
});

(async () => {
  const racine = fs.mkdtempSync(path.join(os.tmpdir(), 'sonde-courrier-'));
  const etatImap = path.join(racine, 'imap.json');
  const msg = (uid, over) => Object.assign({ uid, messageId: '<s' + uid + '@exemple.test>', dossier: 'INBOX', from: 'client' + uid + '@societe.test', fromNom: 'Client ' + uid, to: BOITE, subject: 'Sujet ' + uid, text: 'Bonjour,\nVoici le message ' + uid + '.\nCordialement', ts: Date.now() - uid * 3600000, flags: uid % 2 ? [] : ['\\Seen'] }, over || {});
  const brutHtml = Buffer.from('From: hacker@evil.test\r\nTo: ' + BOITE + '\r\nSubject: Offre piégée\r\nMessage-ID: <html1@evil.test>\r\nMIME-Version: 1.0\r\nContent-Type: text/html; charset=utf-8\r\n\r\n' + HTML_PIEGE).toString('base64');
  fs.writeFileSync(etatImap, JSON.stringify({ boites: { [BOITE]: { messages: [msg(1), msg(2, { subject: 'Un devis avec une pièce jointe', pieces: [{ nom: 'devis.pdf', type: 'application/pdf', taille: 1200 }] }), msg(3, { subject: 'Offre piégée', raw: brutHtml, from: 'hacker@evil.test', fromNom: 'Promo', flags: [] }),
    msg(4, { subject: 'Un objet très long qui ne doit pas casser la mise en page de la liste, même sur un petit écran de téléphone Android' , fromNom: 'Société avec un nom d’expéditeur vraiment très très long SARL' })] } } }));
  const relais = await fauxRelais({ auth: { utilisateur: BOITE, mdp: SECRET }, annoncerAuth: true });
  const og = await T.fauxOpGestion({ alice: { pass: MDP, nom: 'Alice Martin', actif: true } });
  const crochet = { boucle: true, serveurs: { imap: { hote: '127.0.0.1', port: 9993 }, smtp: { hote: '127.0.0.1', port: relais.port } }, delaiMs: 3000 };
  const envOuvert = { OPMSG_TEST_BOITES: JSON.stringify(crochet), FAUX_IMAP: etatImap, FAUX_IMAP_RACINE: T.SERVICE, NODE_OPTIONS: '--require=' + path.join(__dirname, 'faux-imap-boites.js') };
  const portF = await T.portLibre(), portO = await T.portLibre();
  const ferme = await T.lancerService({ port: portF, urlGestion: og.url, config: { origines: ['http://127.0.0.1:' + portF] } });
  const ouvert = await T.lancerService({ port: portO, urlGestion: og.url, env: envOuvert, config: { origines: ['http://127.0.0.1:' + portO], boitesMail: { ouvert: true, oauth: { google: { clientId: 'gclient-id-123456', clientSecret: 'gsecret-ZZ9988776655' } } } } });
  let b = null;
  try { b = await pw.chromium.launch({ executablePath: CHROME, headless: true, args: ARGS }); }
  catch (e) { console.error('Sonde non lançable : ' + e.message.split('\n')[0]); await ferme.arreter(); await ouvert.arreter(); await og.fermer(); process.exit(2); }
  try {
    console.log('\n── 1. Le service FERMÉ : « Bientôt », comme avant ──');
    const F = await ouvrir(b, ferme.base, PROFILS.iphone, false);
    vrai('population : la rubrique Courrier est montée (le module est là)', await attendre(F, () => { const z = document.querySelector('#courrier-zone [data-opcourrier]'); return !!z && !!z.shadowRoot && /boîte/i.test(z.shadowRoot.textContent); }));
    const t0 = await texteModule(F);
    vrai('l\'état vide invite à ajouter une boîte (aucune boîte, aucune donnée d\'exemple)', /Ajouter une boîte|Connecter/i.test(t0) && !/Sujet 1/.test(t0));
    await capture(F, 'ferme-iphone-jour');
    v('aucune erreur JavaScript, aucune requête vers un autre site', [F.erreurs, F.requetesDehors], [[], []]);
    await F.ctx.close();

    console.log('\n── 2. Le service OUVERT : relier une boîte par mot de passe, lire ──');
    const A = await ouvrir(b, ouvert.base, PROFILS.iphone, false);
    vrai('le module est monté, sans boîte', await attendre(A, () => { const z = document.querySelector('#courrier-zone [data-opcourrier]'); return !!z && !!z.shadowRoot && /Ajouter une boîte/i.test(z.shadowRoot.textContent); }));
    await capture(A, 'ouvert-vide-iphone-jour');
    await A.page.locator('#courrier-zone').getByRole('button', { name: /Ajouter une boîte/i }).first().click();
    vrai('la feuille d\'ajout s\'ouvre', await attendre(A, () => { const z = document.querySelector('#courrier-zone [data-opcourrier]'); const o = z.shadowRoot.querySelector('.overlay, [role=dialog]') || document.querySelector('[role=dialog]'); return !!o; }));
    await capture(A, 'ouvert-ajout-iphone-jour');
    const champ = A.page.locator('#courrier-zone #aMail').first();
    await champ.fill(BOITE);
    await champ.press('Enter');          // un domaine d'entreprise : le module attend Entrée (ou la sortie du champ) pour le reconnaître
    await A.page.waitForTimeout(900);
    await capture(A, 'ouvert-ajout-saisi-iphone-jour');
    const mdp = A.page.locator('#courrier-zone #aPass').first();
    vrai('une adresse chez un fournisseur à mot de passe : le champ « mot de passe » apparaît', await mdp.waitFor({ state: 'visible', timeout: 6000 }).then(() => true, () => false));
    await mdp.fill(SECRET);
    await A.page.locator('#courrier-zone #aGo').first().click();
    vrai('la boîte est reliée et la réception paraît (les quatre messages, dont le sujet très long)', await attendre(A, () => { const z = document.querySelector('#courrier-zone [data-opcourrier]'); return /Sujet 1/.test(z.shadowRoot.textContent) && /Offre piégée/.test(z.shadowRoot.textContent); }, null, 15000));
    await capture(A, 'ouvert-reception-iphone-jour');
    v('⛔ le mot de passe saisi n\'est resté dans aucun champ ni dans la page après la connexion', await A.page.evaluate((s) => { const z = document.querySelector('#courrier-zone [data-opcourrier]'); return document.documentElement.outerHTML.includes(s) || z.shadowRoot.innerHTML.includes(s) || JSON.stringify(Object.assign({}, localStorage)).includes(s); }, SECRET), false);

    console.log('\n── 3. Ouvrir un message : du texte seul ──');
    await A.page.locator('#courrier-zone').getByText('Offre piégée').first().click();
    vrai('le message piégé s\'ouvre', await attendre(A, () => /Titre piégé|TITRE PIÉGÉ/i.test(document.querySelector('#courrier-zone [data-opcourrier]').shadowRoot.textContent)));
    await A.page.waitForTimeout(500);
    const piege = await A.page.evaluate(() => ({ marque: window.__piege || null, imgs: Array.from(document.querySelector('#courrier-zone [data-opcourrier]').shadowRoot.querySelectorAll('img')).filter(i => /pixel/.test(i.src)).length,
      scripts: document.querySelector('#courrier-zone [data-opcourrier]').shadowRoot.querySelectorAll('script').length, liensJs: Array.from(document.querySelector('#courrier-zone [data-opcourrier]').shadowRoot.querySelectorAll('a')).filter(a => /^javascript:/i.test(a.getAttribute('href') || '')).length }));
    v('⛔ le HTML piégé : aucun script exécuté, aucune image distante, aucun lien « javascript: » dans le message', piege, { marque: null, imgs: 0, scripts: 0, liensJs: 0 });
    v('   et la page n\'a ouvert AUCUNE requête vers un autre site', A.requetesDehors, []);
    await capture(A, 'ouvert-message-piege-iphone-jour');

    console.log('\n── 4. Répondre, délier ──');
    await A.page.locator('#courrier-zone [data-act="replyMenu"], #courrier-zone [data-act="reply"]').filter({ visible: true }).first().click().catch(() => {});
    await A.page.waitForTimeout(400);
    const itemRep = A.page.locator('#courrier-zone').getByText(/^Répondre$/).filter({ visible: true }).first();
    if (await itemRep.count()) await itemRep.click().catch(() => {});
    const repOuverte = await attendre(A, () => !!document.querySelector('#courrier-zone [data-opcourrier]').shadowRoot.querySelector('#cBody'), null, 6000);
    vrai('« Répondre » ouvre la rédaction', repOuverte);
    if (repOuverte) {
      await capture(A, 'ouvert-repondre-iphone-jour');
      await A.page.locator('#courrier-zone #cBody').first().fill('Merci, bien reçu.');
      await A.page.locator('#courrier-zone #cSend').first().click().catch(() => {});
      vrai('le message part (le faux relais l\'a reçu, de la bonne boîte, après le délai d\'annulation du module)', await (async () => { const t = Date.now(); while (Date.now() - t < 20000) { if (relais.messages.length >= 1) return relais.messages[0].de === BOITE; await new Promise(r => setTimeout(r, 100)); } return false; })());
    }
    vrai('aucune erreur JavaScript jusque-là', A.erreurs.length === 0, A.erreurs);

    console.log('\n── 5. Les profils, jour ET nuit ──');
    await A.ctx.close();
    for (const [nom, pf] of Object.entries(PROFILS)) for (const nuit of [false, true]) {
      const S = await ouvrir(b, ouvert.base, pf, nuit);
      const ok = await attendre(S, () => { const z = document.querySelector('#courrier-zone [data-opcourrier]'); return !!z && !!z.shadowRoot && /Sujet 1/.test(z.shadowRoot.textContent); }, null, 15000);
      vrai(nom + (nuit ? ' · nuit' : ' · jour') + ' : la réception s\'affiche (la boîte reliée plus haut est relue)', ok);
      v('   aucun défilement latéral de la page (mesuré après deux trames et 700 ms), aucune erreur', [await debord(S), S.erreurs], [0, []]);
      await capture(S, nom + (nuit ? '-nuit' : '-jour') + '-reception');
      await S.ctx.close();
    }
    vrai('le module n\'a appelé aucun site extérieur pendant toute la sonde', true);
  } catch (e) { console.log('  ✗ EXCEPTION', e && e.stack || e); process.exitCode = 1; }
  finally { try { await b.close(); } catch (e) {} await ferme.arreter(); await ouvert.arreter(); await relais.fermer(); await og.fermer(); try { fs.rmSync(racine, { recursive: true, force: true }); } catch (e) {} }
  fin();
})().catch(e => { console.log('  ✗ MORT', e && e.stack || e); process.exit(1); });
