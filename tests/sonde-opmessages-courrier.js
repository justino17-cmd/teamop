/* ══ SONDE — L'ENTRÉE « OP COURRIER » D'OP MESSAGES : SUR LE CANAL BÊTA SEULEMENT, DU BON CÔTÉ, SANS RIEN BRANCHER (18 octobre 2026) ═════════════
   OP Courrier (étape 1, interface seule — `courrier-beta.html`) s'ouvre depuis OP MESSAGES bêta. La page servie (`server-msg/public/`, VRAIE, contre le VRAI service)
   reconnaît le canal bêta à son NOM D'HÔTE et à rien d'autre : l'interface est la même octet pour octet sur la production (msg.teamop.fr). La sonde la joue sous trois
   noms — `msg-beta.teamop.fr` (le canal bêta), `msg.teamop.fr` (la production) et `127.0.0.1` (un poste de développement) — que Chromium résout vers le service local
   (`--host-resolver-rules`) : aucun octet ne sort. Ce qu'on prouve :
     1. bêta : dans Réglages, l'entrée « OP Courrier » est là, dit « Bêta — aucun vrai mail n'est lu ni envoyé », mesure au moins 44 px de haut, et son clic ouvre
        `<protocole de la page>//teamop.fr/courrier-beta.html#perso` (https en production ; la sonde sert en http, donc http ici) — ou `#pro` du côté Pro dans un NOUVEL onglet — OP MESSAGES reste où il est (un appel en cours ne se coupe pas) ;
     2. production et poste de développement : AUCUNE entrée, et l'écran Réglages est bien là (la population : il y a de quoi chercher) ;
     3. rien d'OP MESSAGES ne part vers OP Courrier : aucune requête de la page vers teamop.fr avant le clic.
   ⛔ ON ATTEND AU GESTE, JAMAIS AU CHRONOMÈTRE ; ⛔ CHAQUE ABSENCE EST PRÉCÉDÉE DE SA POPULATION.
   Lancer :   node tests/sonde-opmessages-courrier.js          Code 1 si UN contrôle tombe, 2 si elle ne peut pas tourner. */
const T = require('./outils-msg');
const { v, vrai, fin } = T.compteur();
T.sauterSiSansDependances();

let pw; try { pw = require('playwright-core'); } catch (e) {
  for (const c of ['/opt/node22/lib/node_modules/playwright/node_modules/playwright-core', '/opt/node-tools/node_modules/playwright-core', 'playwright']) { try { pw = require(c); break; } catch (_) { /* suivant */ } }
  if (!pw) { console.error('Sonde non lançable : playwright-core est introuvable (NODE_PATH, voir scratchpad/courrier/pilote.js).'); process.exit(2); }
}
const CHROME = '/opt/pw-browsers/chromium';

(async () => {
  const og = await T.fauxOpGestion({ alice: { pass: 'pw-alice-1234', nom: 'Alice Martin', actif: true } });
  const port = await T.portLibre();
  const HOTES = ['msg-beta.teamop.fr', 'msg.teamop.fr', '127.0.0.1'];
  const svc = await T.lancerService({ port, urlGestion: og.url, config: { origines: HOTES.map(h => 'http://' + h + ':' + port) } });
  let b = null;
  const regles = 'MAP msg-beta.teamop.fr 127.0.0.1, MAP msg.teamop.fr 127.0.0.1';
  const surs = HOTES.slice(0, 2).map(h => 'http://' + h + ':' + port).join(',');
  try { b = await pw.chromium.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage', '--host-resolver-rules=' + regles, '--unsafely-treat-insecure-origin-as-secure=' + surs] }); }
  catch (e) { console.error('Sonde non lançable : ' + e.message.split('\n')[0]); await svc.arreter(); await og.fermer(); process.exit(2); }
  const sorties = [];
  try {
    for (const hote of HOTES) {
      console.log('\n── ' + hote + (hote === 'msg-beta.teamop.fr' ? '  (le canal bêta)' : hote === 'msg.teamop.fr' ? '  (la production)' : '  (un poste de développement)'));
      const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce', locale: 'fr-FR' });
      /* tout ce qui n'est pas le service local est COMPTÉ et refusé (le clic ouvre teamop.fr : la sonde ne le suit pas) */
      await ctx.route(u => !(HOTES.includes(u.hostname) && String(u.port) === String(port)) && !/^(data|blob|about):/.test(u.protocol), r => {
        /* le clic ouvre OP Courrier : la sonde REPOND à cette seule adresse (une page vide) pour que l'onglet garde son adresse, hash compris — sans rien joindre */
        if (/^https?:\/\/teamop\.fr\/courrier-beta\.html$/.test(r.request().url().split('#')[0])) return r.fulfill({ status: 200, contentType: 'text/html;charset=utf-8', body: '<!doctype html><title>OP Courrier (réponse de la sonde)</title>' });
        sorties.push(r.request().url()); r.abort(); });
      const page = await ctx.newPage(); page.setDefaultTimeout(12000);
      const erreurs = []; page.on('pageerror', e => erreurs.push(String(e && e.message || e).slice(0, 200)));
      const attendre = (fn, arg) => page.waitForFunction(fn, arg, { timeout: 12000, polling: 50 }).then(() => true, () => false);
      const base = 'http://' + hote + ':' + port;
      await page.goto(base + '/');
      await page.fill('#c-login', 'alice'); await page.fill('#c-pass', 'pw-alice-1234'); await page.click('#c-entrer');
      vrai('l\'application s\'ouvre', await attendre(() => { const a = document.getElementById('app'); return a && !a.hidden && document.getElementById('moi-nom').textContent.trim().length > 0; }));
      vrai('(population) la page est bien servie sous ce nom d\'hôte', await page.evaluate(() => location.hostname) === hote);
      const avant = sorties.length;
      await page.evaluate(() => { location.hash = '#reglages'; });
      vrai('l\'écran Réglages s\'ouvre', await attendre(() => !document.getElementById('vue-reglages').hidden && !!document.getElementById('reg-sortir')));
      const entree = page.locator('#reg-courrier');
      if (hote === 'msg-beta.teamop.fr') {
        v('l\'entrée « OP Courrier » est dans Réglages (une seule)', await entree.count(), 1);
        const t = (await entree.textContent()).replace(/\s+/g, ' ').trim();
        vrai('elle dit « Bêta — aucun vrai mail n\'est lu ni envoyé » (« ' + t + ' »)', /OP Courrier/.test(t) && /Bêta — aucun vrai mail n.est lu ni envoyé/.test(t));
        if (process.env.CAPTURES) await page.screenshot({ path: require('path').join(process.env.CAPTURES, 'opmessages-reglages-beta.png') });
        const bb = await entree.boundingBox();
        vrai('elle est visible et d\'au moins 44 px de haut (' + (bb ? Math.round(bb.width) + ' × ' + Math.round(bb.height) : 'pas de boîte') + ')', !!bb && bb.height >= 44);
        v('avant le clic, OP MESSAGES n\'a fait AUCUNE requête vers teamop.fr', sorties.slice(avant).filter(u => /teamop\.fr/.test(u) && !u.includes(':' + port)), []);
        const [popup] = await Promise.all([page.waitForEvent('popup', { timeout: 8000 }).catch(() => null), entree.click()]);
        vrai('⛔ le clic ouvre un NOUVEL onglet : OP MESSAGES reste là où il est', !!popup);
        v('…vers OP Courrier, du côté Perso (le côté d\'arrivée du compte)', popup ? popup.url() : null, 'http://teamop.fr/courrier-beta.html#perso');
        v('l\'onglet d\'OP MESSAGES n\'a pas bougé', await page.evaluate(() => location.hash), '#reglages');
        if (popup) await popup.close();
        /* le côté Pro : seulement si le compte l'a (le sélecteur n'existe que pour un compte qui a les deux côtés) */
        const pro = await page.evaluate(() => { const s = document.querySelector('[data-cote-seg] [data-cote="pro"]'); return !!(s && s.getBoundingClientRect().width > 0); });
        if (pro) {
          await page.click('[data-cote-seg] [data-cote="pro"]');
          await page.evaluate(() => { location.hash = '#reglages'; });
          await attendre(() => !!document.getElementById('reg-courrier'));
          const [p2] = await Promise.all([page.waitForEvent('popup', { timeout: 8000 }).catch(() => null), page.click('#reg-courrier')]);
          v('du côté Pro : …#pro', p2 ? p2.url() : null, 'http://teamop.fr/courrier-beta.html#pro'); if (p2) await p2.close();
        } else console.log('  · ce compte n\'a pas les deux côtés : #perso est son seul côté (le côté Pro est gardé par test-2701, sur le code)');
      } else {
        v('⛔ AUCUNE entrée « OP Courrier » (' + hote + ')', await entree.count(), 0);
        vrai('rien dans l\'écran ne nomme OP Courrier', !/OP Courrier/.test(await page.evaluate(() => document.getElementById('vue-reglages').innerText)));
      }
      v('aucune erreur JS', erreurs, []);
      await ctx.close();
    }
    v('⛔ rien n\'est sorti de la machine (la seule adresse d\'OP Courrier, ouverte par le clic, est répondue par la sonde)', sorties, []);
  } finally { await b.close(); await svc.arreter(); await og.fermer(); }
  fin();
})().catch(e => { console.error(e); process.exit(1); });
