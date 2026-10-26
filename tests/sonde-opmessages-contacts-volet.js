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

    console.log('\n── 5. MON statut dans la barre latérale, et la couleur de ma pastille (reglages#1, appareils@7) ──');
    vrai('population : la barre dit « Disponible » (aucun statut)', await attendre(() => document.getElementById('moi-statut-texte').textContent === 'Disponible'));
    const couleurs = await page.evaluate(() => ({ barre: document.querySelector('#moi-carte .moi-av').className.match(/\bav\d\b/)[0] }));
    await page.evaluate(async () => { await fetch('/api/moi/maj', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json', 'X-OPM': '1' }, body: JSON.stringify({ statut: 'Au bureau jusqu\'à 17 h' }) }); });
    vrai('⛔ la barre dit MON statut, plus « Disponible » (le service prévient les autres appareils de la personne : l\'événement `moi`)', await attendre(() => document.getElementById('moi-statut-texte').textContent === 'Au bureau jusqu\'à 17 h', null, 12000));
    await page.evaluate(() => { location.hash = '#reglages'; });
    vrai('population : le Profil est ouvert (la carte du compte)', await attendre(() => !!document.querySelector('#reg-profil .reg-moi .avatar')));
    v('⛔ la pastille de la barre et la grande photo du Profil ont la MÊME couleur d\'avatar', await page.evaluate(() => [document.querySelector('#moi-carte .moi-av').className.match(/\bav\d\b/)[0] === document.querySelector('#reg-profil .reg-moi .avatar').className.match(/\bav\d\b/)[0]]), [true]);
    void couleurs;

    console.log('\n── 6. bloquée sans le savoir : ni « Introuvable », ni « Réessayer », ni accusation (contacts#6, contacts@6, contacts@9) ──');
    await page.locator('.cote-seg [data-cote="perso"]').filter({ visible: true }).first().click();
    await page.evaluate(() => { location.hash = '#contacts'; });
    const pageB = await (await nav.newContext({ viewport: { width: 900, height: 700 }, locale: 'fr-FR' })).newPage();
    await pageB.goto(svc.base + '/'); await pageB.locator('#c-login').fill('bruno'); await pageB.locator('#c-pass').fill(MOTS.bruno); await pageB.locator('#c-entrer').click();
    await pageB.waitForFunction(() => { const a = document.getElementById('app'); return a && !a.hidden; }, null, { timeout: 12000 });
    const ligneBruno = () => page.evaluate(() => { const l = Array.from(document.querySelectorAll('#vc-corps .contact')).find(x => x.textContent.includes('Bruno Petit')); return l ? { role: (l.querySelector('.contact-role') || {}).textContent || '', enLigne: !!l.querySelector('.avatar.en-ligne') } : null; });
    await categorie('tous');
    vrai('population : Alice voit Bruno EN LIGNE dans sa liste', await attendre(() => { const l = Array.from(document.querySelectorAll('#vc-corps .contact')).find(x => x.textContent.includes('Bruno Petit')); return !!l && !!l.querySelector('.avatar.en-ligne'); }, null, 12000));
    v('…et sa ligne dit « En ligne »', (await ligneBruno()).role, 'En ligne');
    const convAB = (await A.post('/api/conversations/directe', { uid: C.bruno.moi.id })).j.conversation.id;       // la conversation qui existait AVANT le blocage
    const bl = await C.bruno.post('/api/contacts/bloquer', { uid: A.moi.id });
    v('Bruno bloque Alice', bl.code, 200);
    vrai('⛔ l\'indicateur « En ligne » de Bruno s\'éteint chez Alice SANS rechargement (contacts@6)', await attendre(() => { const l = Array.from(document.querySelectorAll('#vc-corps .contact')).find(x => x.textContent.includes('Bruno Petit')); return !l || !l.querySelector('.avatar.en-ligne'); }, null, 12000));
    await choisir('Bruno Petit');
    vrai('population : la fiche de Bruno est ouverte', await fichePour('Bruno Petit'));
    vrai('population : la lecture de « En commun » est finie (plus de squelette) — elle date d\'avant le blocage : la fiche montre encore ses rubriques', await attendre(() => !document.querySelector('#vc-fiche .fc-squelette') && !!document.querySelector('#vc-fiche .fc-commun .rubrique'), null, 12000));
    /* un événement d'agenda (Alice programme une réunion à elle seule) vide la mémoire de « En commun » et la fait RELIRE : c'est ce qui arrive en vrai, dans la minute — le service répond alors 404 */
    const demain = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
    const prog = await A.post('/api/reunions', { titre: 'Point seul', debut: demain + 'T10:00', fin: demain + 'T11:00', tz: 'Europe/Paris', invites: [], notifier: false });
    v('(population) Alice programme une réunion (elle seule)', prog.code, 201);
    vrai('population : la fiche relit « En commun » et le service répond « introuvable » : elle se vide', await attendre(() => { const c = document.querySelector('#vc-fiche .fc-commun'); return !!c && c.children.length === 0; }, null, 12000));
    v('⛔ la fiche ne montre ni « Introuvable… », ni « Réessayer », ni rubrique « En commun » en erreur (contacts#6)', await page.evaluate(() => ({ note: !!document.querySelector('#vc-fiche .fc-note'), reessayer: !!document.querySelector('#vc-fiche [data-fiche="relire"]'), texte: /Introuvable|supprimée|n.y es plus/.test(document.getElementById('vc-fiche').innerText) })), { note: false, reessayer: false, texte: false });
    /* ⛔ 26 octobre 2026 (contacts#1) : celui qui est BLOQUÉ ne voit rien changer — « Message » depuis la fiche de qui l'a bloqué OUVRE la conversation qui existait (aucun avis d'échec). Le refus neutre
       (« Cette conversation n'a pas pu s'ouvrir. ») ne vaut plus que pour une conversation NEUVE (`test-3040`). */
    await page.locator('#vc-fiche [data-fiche="ecrire"]').click();
    vrai('⛔ « Message » depuis la fiche de Bruno (qui a bloqué) OUVRE la conversation d\'avant — et ne dit aucun échec', await attendre(() => document.documentElement.hasAttribute('data-conv') && !document.getElementById('mot').classList.contains('on'), null, 12000));
    await page.evaluate(() => { history.back(); });
    await attendre(() => !document.documentElement.hasAttribute('data-conv'), null, 12000);
    if (!await page.evaluate(() => !!document.querySelector('#vc-fiche [data-fiche="appel"]'))) { await page.evaluate(() => { location.hash = '#contacts'; }); await choisir('Bruno Petit'); }
    /* « Appeler » et « Vidéo » depuis la même fiche (POST /api/appels → 404 « introuvable » : routes-appels.js) — la relecture du lot a trouvé qu'ils disaient la phrase générale (accusation de suppression) */
    vrai('population : la fiche porte « Appeler » et « Vidéo »', await attendre(() => !!document.querySelector('#vc-fiche [data-fiche="appel"][data-video="0"]') && !!document.querySelector('#vc-fiche [data-fiche="appel"][data-video="1"]'), null, 12000));
    for (const [video, nom] of [['0', 'Appeler'], ['1', 'Vidéo']]) {
      await page.locator('#vc-fiche [data-fiche="appel"][data-video="' + video + '"]').click();
      vrai('⛔ « ' + nom + ' » vers Bruno (qui a bloqué) dit « L\'appel n\'a pas pu être lancé. » (ni suppression, ni « tu n\'y es plus », ni « Introuvable »)', await attendre(() => { const m = document.getElementById('mot'); return m.classList.contains('on') && m.textContent === 'L\'appel n\'a pas pu être lancé.'; }, null, 12000));
      vrai('…et aucun écran d\'appel ne s\'ouvre', await page.evaluate(() => !document.documentElement.hasAttribute('data-appel')));
      await page.waitForFunction(() => !document.getElementById('mot').classList.contains('on'), null, { timeout: 12000 }).catch(() => {});
    }
    await page.evaluate((id) => { location.hash = '#messages/' + id; }, convAB);
    vrai('population : la conversation avec Bruno (celle d\'avant le blocage) s\'ouvre', await attendre(() => /^#messages\/./.test(location.hash) && !!document.getElementById('saisie') && document.getElementById('saisie').getClientRects().length > 0));
    await page.locator('#saisie').fill('Bruno ?'); await page.keyboard.press('Enter');
    /* ⛔ 26 octobre 2026 (contacts#1) : celui qui est BLOQUÉ ne voit rien changer — l'envoi réussit comme avant (le service rend 201 et masque le message pour Bruno) : aucun avis d'échec, le texte part, et le
       message paraît dans la conversation de qui l'a écrit. Ce que Bruno reçoit : rien (`test-3040`). */
    vrai('⛔ l\'envoi réussit sans avis d\'échec (aucun « n\'a pas pu être remis »), le champ se vide', await attendre(() => document.getElementById('saisie').value === '' && document.getElementById('avis').hidden, null, 12000));
    vrai('…et le message est dans la conversation d\'Alice, comme tout envoi', await attendre(() => /Bruno \?/.test(document.getElementById('conv-messages').textContent), null, 12000));
    v('…et Bruno, lui, ne le reçoit pas (le service le masque)', ((await C.bruno.get('/api/conversations/' + convAB + '/messages')).j.messages || []).some(m => m.texte === 'Bruno ?'), false);

    console.log('\n── 7. rien ne casse ──');
    v('aucune erreur JavaScript', erreurs, []);
    await ctx.close();
  } catch (e) { console.error('✗ la sonde est morte : ' + (e && e.stack || e)); process.exitCode = 1; }
  finally { try { await nav.close(); } catch (e) { /* déjà fermé */ } await svc.arreter(); await og.fermer(); }
  fin();
})();
