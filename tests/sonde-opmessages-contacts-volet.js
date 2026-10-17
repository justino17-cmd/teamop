/* ══ SONDE — LE VOLET DROIT DE CONTACTS (BUREAU) : LA FICHE SUIT LA PERSONNE CHOISIE, DANS TOUTES LES CATÉGORIES, ET LE CÔTÉ ═══════════════════════════════════
   Revue de A à Z du 17 octobre 2026 (lot « m11 »), contre le VRAI service et la VRAIE page servie, sur un Mac (1440, nuit) :
     1. « Tous » : toucher Bruno met SA fiche à droite (le témoin) ;
     2. « Favoris » : toucher Chloé (étoilée) met la fiche de CHLOÉ — la ligne marquée (aria-current) et le volet disent la même personne (contacts#0 : le volet restait sur Bruno) ;
     3. côté Pro, « Entreprise » (la catégorie par défaut, le chemin normal pour voir un collègue) : toucher Dan met la fiche de DAN ;
     4. le changement de côté remet le volet à zéro : après Perso → Pro, la fiche de Bruno (un contact Perso) ne reste pas, ni ses gestes Message / Appeler (contacts#2) ;
     5. aucune erreur JavaScript.
   ⛔ ON ATTEND AU GESTE, JAMAIS AU CHRONOMÈTRE ; ⛔ CHAQUE ABSENCE EST PRÉCÉDÉE DE SA POPULATION (la fiche qu'on dit absente a d'abord été vue présente).
   Lancer :   NODE_PATH=/opt/node-tools/node_modules node tests/sonde-opmessages-contacts-volet.js        CAPTURES=/dossier pour les images.
   Code 1 si UN contrôle tombe, 2 si elle ne peut pas tourner. */
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const T = require('./outils-msg');
const { v, vrai, fin } = T.compteur();
T.sauterSiSansDependances();
const { ouvrir: ouvrirBase } = require(path.join(T.SERVICE, 'stockage.js'));
const { creerScelleur } = require(path.join(T.SERVICE, 'scelle.js'));

let pw; try { pw = require('playwright-core'); } catch (e) {
  for (const c of ['/opt/node22/lib/node_modules/playwright/node_modules/playwright-core', '/opt/node-tools/node_modules/playwright-core', 'playwright']) { try { pw = require(c); break; } catch (_) { /* suivant */ } }
  if (!pw) { console.error('Sonde non lançable : playwright-core est introuvable.'); process.exit(2); }
}
const CHROME = '/opt/pw-browsers/chromium';
const DOSSIER = process.env.CAPTURES || null;
const MOTS = { alice: 'pw-alice-1234', bruno: 'pw-bruno-1234', chloe: 'pw-chloe-1234', dan: 'pw-dan-12345' };
const NOMS = { alice: 'Alice Martin', bruno: 'Bruno Petit', chloe: 'Chloé Garnier', dan: 'Dan Colin' };
const BUREAU = { w: 1440, h: 900 };

(async () => {
  const og = await T.fauxOpGestion(Object.fromEntries(Object.keys(MOTS).map(l => [l, { pass: MOTS[l], nom: NOMS[l], actif: true }])));
  const port = await T.portLibre();
  const svc = await T.lancerService({ port, urlGestion: og.url, config: { origines: ['http://127.0.0.1:' + port] } });
  let nav = null;
  try { nav = await pw.chromium.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage', '--mute-audio'] }); }
  catch (e) { console.error('Sonde non lançable : ' + e.message.split('\n')[0]); await svc.arreter(); await og.fermer(); process.exit(2); }
  try {
    const C = {}; for (const l of Object.keys(MOTS)) C[l] = await T.connecter(svc, og, l, MOTS[l]);
    const A = C.alice;
    for (const l of ['bruno', 'chloe']) { const k = await A.post('/api/contacts/lien', { max: 1 }); await C[l].post('/api/liens/accepter', { code: k.j.code }); }
    /* Alice possède un espace payé où Dan est collègue (il n'est PAS son contact : la fiche se choisit dans « Entreprise ») */
    const S = ouvrirBase({ chemin: path.join(svc.data, 'msg.db'), scelleur: creerScelleur(Buffer.from(svc.cle, 'hex')) });
    const espace = S.espaceCreer({ nom: 'Atelier Nord', proprio: A.moi.id }).id;
    S.abonnementPoser(espace, { client: 'cus_sonde', abonnement: 'sub_sonde', statut: 'active', places: 5 });
    const code = crypto.randomBytes(16).toString('base64url'), h = crypto.createHash('sha256').update(code).digest('hex');
    S.lienCreer({ h, genre: 'espace', cible: espace, par: A.moi.id, ttlMs: 86400000, max: 5 });
    S.invitationAccepter({ h, uid: C.dan.moi.id, max: Infinity });
    await A.post('/api/contacts/favori', { uid: C.chloe.moi.id, favori: true });

    const ctx = await nav.newContext({ viewport: { width: BUREAU.w, height: BUREAU.h }, colorScheme: 'dark', reducedMotion: 'reduce', locale: 'fr-FR' });
    const page = await ctx.newPage(); page.setDefaultTimeout(9000);
    const erreurs = []; page.on('pageerror', e => erreurs.push(String(e && e.message || e).slice(0, 220)));
    const attendre = (fn, arg, ms) => page.waitForFunction(fn, arg, { timeout: ms || 9000, polling: 50 }).then(() => true, () => false);
    await page.goto(svc.base + '/');
    await page.locator('#c-login').fill('alice'); await page.locator('#c-pass').fill(MOTS.alice); await page.locator('#c-entrer').click();
    vrai('population : Alice est connectée au bureau', await attendre(() => { const a = document.getElementById('app'); return a && !a.hidden && document.getElementById('moi-nom').textContent.trim().length > 0; }, null, 12000));
    await page.evaluate(() => { location.hash = '#contacts'; });
    vrai('population : Contacts est ouvert, Bruno et Chloé y sont (« Tous »)', await attendre(() => { const t = document.getElementById('vc-corps'); return !document.getElementById('vue-contacts').hidden && t && t.innerText.includes('Bruno Petit') && t.innerText.includes('Chloé Garnier'); }));
    const fiche = () => page.evaluate(() => { const f = document.getElementById('vc-fiche'); const n = f && f.querySelector('.vc-fiche-nom'); return { nom: n ? n.textContent : '', gestes: f ? f.querySelectorAll('[data-fiche="ecrire"]').length : 0, vide: !!(f && f.querySelector('.vc-fiche-vide')) }; });
    const marquee = () => page.evaluate(() => Array.from(document.querySelectorAll('#vc-corps [aria-current="true"] .contact-nom')).map(x => x.textContent));
    const choisir = async (nom) => { await page.locator('#vc-corps .contact', { hasText: nom }).first().click(); };
    const fichePour = (nom) => attendre(n => { const e = document.querySelector('#vc-fiche .vc-fiche-nom'); return !!e && e.textContent === n; }, nom);
    const categorie = async (cat) => { await page.locator('#vc-seg [data-cat="' + cat + '"]').click(); return attendre(c => { const b = document.querySelector('#vc-seg [data-cat="' + c + '"]'); return b && b.getAttribute('aria-pressed') === 'true'; }, cat); };

    console.log('\n── 1. « Tous » (le témoin) ──');
    await choisir('Bruno Petit');
    vrai('la fiche de Bruno paraît à droite', await fichePour('Bruno Petit'));
    await page.screenshot({ path: DOSSIER ? path.join(fs.mkdirSync(DOSSIER, { recursive: true }) || DOSSIER, 'volet-tous.png') : '/dev/null' }).catch(() => {});

    console.log('\n── 2. « Favoris » ──');
    vrai('population : « Favoris » est choisie et montre Chloé', (await categorie('favoris')) && await attendre(() => document.getElementById('vc-corps').innerText.includes('Chloé Garnier')));
    await choisir('Chloé Garnier');
    vrai('⛔ la fiche de CHLOÉ remplace celle de Bruno dans le volet (contacts#0)', await fichePour('Chloé Garnier'));
    v('…la ligne marquée et le volet disent la même personne', [(await marquee()), (await fiche()).nom], [['Chloé Garnier'], 'Chloé Garnier']);

    console.log('\n── 3. le côté : Perso → Pro remet le volet à zéro ──');
    await categorie('tous');
    await choisir('Bruno Petit');
    vrai('population : la fiche de Bruno est de nouveau à droite, ses gestes sont actifs', await fichePour('Bruno Petit') && (await fiche()).gestes === 1);
    await page.locator('.cote-seg [data-cote="pro"]').filter({ visible: true }).first().click();
    vrai('population : le côté Pro est choisi (« Entreprise » est proposée)', await attendre(() => !!document.querySelector('#vc-seg [data-cat="entreprise"]') && document.documentElement.dataset.cote === 'pro'));
    vrai('⛔ la fiche de Bruno (un contact Perso) ne reste pas côté Pro : « Choisis un contact… » (contacts#2)', await attendre(() => !!document.querySelector('#vc-fiche .vc-fiche-vide')));
    v('…et ses gestes Message / Appeler ne sont plus là', (await fiche()).gestes, 0);

    console.log('\n── 4. « Entreprise », la catégorie du côté Pro ──');
    vrai('population : « Entreprise » est choisie par défaut et montre Dan', await attendre(() => { const b = document.querySelector('#vc-seg [data-cat="entreprise"]'); return b && b.getAttribute('aria-pressed') === 'true' && document.getElementById('vc-corps').innerText.includes('Dan Colin'); }, null, 12000));
    await choisir('Dan Colin');
    vrai('⛔ la fiche de DAN s\'affiche (le chemin normal pour voir un collègue) (contacts#0)', await fichePour('Dan Colin'));
    v('…sa ligne est marquée', await marquee(), ['Dan Colin']);
    if (DOSSIER) await page.screenshot({ path: path.join(DOSSIER, 'volet-entreprise.png') });

    console.log('\n── 5. rien ne casse ──');
    v('aucune erreur JavaScript', erreurs, []);
    await ctx.close();
  } catch (e) { console.error('✗ la sonde est morte : ' + (e && e.stack || e)); process.exitCode = 1; }
  finally { try { await nav.close(); } catch (e) { /* déjà fermé */ } await svc.arreter(); await og.fermer(); }
  fin();
})();
