/* ══ SONDE — LE PROFIL N'EST PLUS UNE RUBRIQUE DU MENU : ON Y ENTRE PAR SOI ═══════════════════════════════════════════════════════════════════════════════════════
   7 octobre 2026, capture de la barre latérale à l'appui : « je ne veux pas le profil avec contact et agenda — le profil, c'est en bas (la carte à mon nom), on clique, ça nous emmène
   à nos paramètres ». Pour tous les appareils. La sonde joue, contre le VRAI service, au téléphone (393 px, au doigt) puis au bureau (1440 px, à la souris) :
     1. ni la barre latérale ni la barre d'onglets ne portent « Profil » (population : les quatre autres y sont) ;
     2. au téléphone, l'avatar au bout du grand titre (comme le compte de l'App Store) est visible, à mes initiales, et mène au Profil ; au bureau il ne se montre pas — la carte du bas y suffit ;
     3. dans le Profil, la carte du bas porte la page (aria-current) et la bulle de la barre d'onglets s'efface (aucun onglet n'est la vue) ;
     4. au téléphone, « ‹ Agenda » ramène à la vue d'où l'on venait en RENDANT l'entrée (le retour système ne retombe pas sur le Profil) ; au bureau ce retour ne se montre pas.
   ⛔ ON ATTEND AU GESTE, JAMAIS AU CHRONOMÈTRE.   Lancer :   node tests/sonde-opmessages-entree-profil.js     Code 1 si un contrôle tombe, 2 si elle ne peut pas tourner. */
const T = require('./outils-msg');
const { v, vrai, fin } = T.compteur();
T.sauterSiSansDependances();

let pw; try { pw = require('playwright-core'); } catch (e) {
  for (const c of ['/opt/node22/lib/node_modules/playwright/node_modules/playwright-core', '/opt/node-tools/node_modules/playwright-core', 'playwright']) { try { pw = require(c); break; } catch (_) { /* suivant */ } }
  if (!pw) { console.error('Sonde non lançable : playwright-core est introuvable.'); process.exit(2); }
}
const CHROME = '/opt/pw-browsers/chromium';

(async () => {
  const og = await T.fauxOpGestion({ alice: { pass: 'pw-alice-1234', nom: 'Alice Martin', actif: true } });
  const port = await T.portLibre();
  const svc = await T.lancerService({ port, urlGestion: og.url, config: { origines: ['http://127.0.0.1:' + port] } });
  let b = null;
  try { b = await pw.chromium.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] }); }
  catch (e) { console.error('Sonde non lançable : ' + e.message.split('\n')[0]); await svc.arreter(); await og.fermer(); process.exit(2); }
  try {
    for (const [nom, vp, mob] of [['téléphone', { width: 393, height: 852 }, true], ['bureau', { width: 1440, height: 900 }, false]]) {
      console.log('\n── ' + nom);
      const ctx = await b.newContext({ viewport: vp, isMobile: mob, hasTouch: mob, reducedMotion: 'reduce', locale: 'fr-FR' });
      const page = await ctx.newPage(); page.setDefaultTimeout(12000);
      const erreurs = []; page.on('pageerror', e => erreurs.push(String(e && e.message || e).slice(0, 200)));
      const attendre = (fn, arg) => page.waitForFunction(fn, arg, { timeout: 12000, polling: 50 }).then(() => true, () => false);
      await page.goto(svc.base + '/');
      await page.fill('#c-login', 'alice'); await page.fill('#c-pass', 'pw-alice-1234'); await page.click('#c-entrer');
      vrai('l\'application s\'ouvre', await attendre(() => { const a = document.getElementById('app'); return a && !a.hidden && document.getElementById('moi-nom').textContent.trim().length > 0; }));

      console.log('1. Le menu');
      const menu = await page.evaluate(() => [[...document.querySelectorAll('#nav-side a')].map(a => a.dataset.vue).join(','), [...document.querySelectorAll('#tabs a')].map(a => a.dataset.vue).join(',')]);
      v('⛔ la barre latérale et la barre d\'onglets : Messages · Contacts · Appels · Agenda, sans « Profil »', menu, ['messages,contacts,appels,reunions', 'messages,contacts,appels,reunions']);

      console.log('2. L\'avatar au bout du grand titre');
      await page.evaluate(() => { location.hash = '#reunions'; });
      await attendre(() => !document.getElementById('vue-reunions').hidden);
      const pastille = await page.evaluate(() => { const a = document.querySelector('#vue-reunions .moi-pastille'); if (!a) return null; const r = a.getBoundingClientRect(), h = document.getElementById('titre-reunions').getBoundingClientRect(); return { w: r.width, h: r.height, texte: a.textContent.trim(), aLaLigne: r.top < h.bottom && r.bottom > h.top, aDroite: r.left > h.left + 100 }; });
      if (mob) {
        v('visible, 44 × 44 (le plancher tactile), à mes initiales', pastille && [pastille.w, pastille.h, pastille.texte], [44, 44, 'AM']);
        vrai('posé sur la ligne du grand titre, à droite (il ne décale pas le titre)', pastille && pastille.aLaLigne && pastille.aDroite);
        await page.tap('#vue-reunions .moi-pastille');
      } else {
        vrai('au bureau il ne se montre pas (la carte du bas y suffit)', pastille && pastille.w === 0);
        await page.click('#moi-carte');
      }
      vrai('le geste ouvre le Profil', await attendre(() => location.hash === '#reglages' && !document.getElementById('vue-reglages').hidden));

      console.log('3. Dans le Profil');
      v('la carte du bas porte la page', await page.evaluate(() => document.getElementById('moi-carte').getAttribute('aria-current')), 'page');
      vrai('aucun onglet n\'est la vue : la bulle s\'efface', await page.evaluate(() => document.getElementById('tabs').classList.contains('sans-onglet') && !document.querySelector('#tabs a[aria-current]')));

      console.log('4. Le retour');
      const retour = await page.evaluate(() => { const a = document.getElementById('profil-retour'); return a && a.getBoundingClientRect().width > 0 ? a.textContent.trim() : ''; });
      if (mob) {
        v('« ‹ Agenda » : la vue d\'où l\'on venait', retour, 'Agenda');
        const n0 = await page.evaluate(() => history.length);
        await page.tap('#profil-retour');
        vrai('il ramène à l\'Agenda', await attendre(() => location.hash === '#reunions' && !document.getElementById('vue-reunions').hidden));
        v('…en rendant l\'entrée, sans en empiler une', await page.evaluate(() => history.length), n0);
        await page.goBack();
        vrai('⛔ le retour système ne retombe pas sur le Profil', await attendre(() => location.hash !== '#reglages' && document.getElementById('vue-reglages').hidden));
      } else v('au bureau le retour ne se montre pas (la barre latérale y suffit)', retour, '');

      /* ⛔ 5. UNE RUBRIQUE OUVERTE N'A QU'UN RETOUR (vu sur la bêta le 8 octobre 2026, au téléphone : « ‹ Tableau de bord » ET « ‹ Profil » empilés en haut de Notifications) */
      console.log('5. Une rubrique du Profil : un seul retour');
      const retours = () => page.evaluate(() => Array.from(document.querySelectorAll('#vue-reglages .reg-retour')).filter(x => { const r = x.getBoundingClientRect(); return r.width > 0 && r.height > 0; }).map(x => x.textContent.trim()));
      await page.evaluate(() => { location.hash = '#reglages'; });
      await attendre(() => !document.getElementById('vue-reglages').hidden && !!document.querySelector('[data-reg-sec="confidentialite"]'));
      if (mob) v('population : sur la liste du Profil, le retour vers la vue d\'avant est là', (await retours()).length, 1);
      if (mob) await page.tap('[data-reg-sec="confidentialite"]'); else await page.click('[data-reg-sec="confidentialite"]');
      vrai('la rubrique « Confidentialité » s\'ouvre', await attendre(() => { const s = document.getElementById('reg-sec-confidentialite'); return !!s && !s.hidden && s.getBoundingClientRect().height > 0; }));
      if (mob) {
        v('⛔ au téléphone, UN retour : « ‹ Profil » (celui de la vue d\'avant s\'efface avec la liste)', await retours(), ['Profil']);
        await page.tap('#reg-sec-confidentialite [data-reg-retour]');
        vrai('« ‹ Profil » ramène à la liste, où le retour d\'avant revient', await attendre(() => { const a = document.getElementById('profil-retour'); return !!a && a.getBoundingClientRect().width > 0 && document.getElementById('reg-sec-confidentialite').hidden; }));
      } else v('au bureau, aucun chevron : la liste reste à gauche, la rubrique à droite', await retours(), []);
      v('aucune erreur JavaScript', erreurs, []);
      await ctx.close();
    }
  } finally { await b.close(); await svc.arreter(); await og.fermer(); }
  fin();
})().catch(e => { console.error(e); process.exit(1); });
