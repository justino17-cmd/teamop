// Campagne « coque » (17 novembre 2026) — la RECHERCHE (Ctrl/Cmd+K) et tout ce qu'elle propose, les RACCOURCIS clavier et leur panneau (?),
// les touches de création N, D, C, A et leurs boutons. Jouée comme une personne au clavier : on tape, on lit ce qui s'ouvre.
// Usage : PROFIL=mac|windows|mac720 QUI=marc|julie MAC=1 (simule un Mac : Cmd à la place de Ctrl) node coque-clavier.js
const L = require('../../lib.js'), v = L.v;
const PROFIL = process.env.PROFIL || 'windows', QUI = process.env.QUI || 'marc', MACSIM = !!process.env.MAC, NUIT = !!process.env.NUIT;
const CAP = '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/campagne-coque/';
const CMD = MACSIM ? 'Meta' : 'Control';
const h1 = p => p.evaluate(() => ((document.querySelector('#contenu h1') || {}).textContent || '').replace(/\s+/g, ' ').trim());
const pal = p => p.evaluate(() => !!document.getElementById('pal'));
const panneau = p => p.evaluate(() => { const e = document.querySelector('#calque .panneau'); return e ? ((e.querySelector('h2') || e).textContent || '').replace(/\s+/g, ' ').trim().slice(0, 60) : ''; });
const cpOuvert = p => p.evaluate(() => { const e = document.getElementById('cpsys'); return !!e && !e.hidden && e.getBoundingClientRect().width > 0 && getComputedStyle(e).display !== 'none'; });
const entrees = p => p.evaluate(() => [...document.querySelectorAll('#pal .pal-i')].map(e => (e.querySelector('b') || e).textContent.trim()));
let apres_;
(async () => {
  const c = await L.ouvrir({ profil: PROFIL, nuit: NUIT, qui: QUI, init: MACSIM ? "Object.defineProperty(navigator,'platform',{get:()=>'MacIntel'});Object.defineProperty(navigator,'userAgent',{get:()=>'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15'})" : undefined }), p = c.p;
  if (await p.evaluate(() => { const e = document.getElementById('cpsys'); return !!e && !e.hidden && e.getBoundingClientRect().width > 0; })) { await L.toucher(c, '[data-cpsys="retour"]'); await L.calme(p, 600); }   // Julie ouvre l'application sur Comptabilité plein écran
  const fen = () => p.evaluate(() => (document.getElementById('fenetre') || {}).innerText ? document.getElementById('fenetre').innerText.replace(/\s+/g, ' ').trim().slice(0, 50) : '');
  const k = async t => { await p.keyboard.press(t); await L.calme(p, 350); };
  v('population : le prototype sait s’il tourne sur Mac (' + (MACSIM ? 'Mac simulé' : 'pas Mac') + ')', (await p.evaluate(() => MAC)) === MACSIM);
  // ---- la recherche
  await k(CMD + '+k');
  v('Ctrl/Cmd+K ouvre la recherche et met le curseur dans le champ', await pal(p) && await p.evaluate(() => document.activeElement && document.activeElement.id === 'pal-q'));
  const tout = await entrees(p);
  v('la recherche vide propose des entrées (' + tout.length + ')', tout.length >= 10);
  const kbd = await p.evaluate(() => [...document.querySelectorAll('#pal kbd')].map(e => e.textContent.trim()));
  v('le raccourci affiché dit ' + (MACSIM ? '⌘' : 'Ctrl'), kbd.some(t => t.startsWith(MACSIM ? '⌘' : 'Ctrl')), kbd.slice(0, 4));
  await p.screenshot({ path: CAP + `recherche-${PROFIL}-${QUI}${MACSIM ? '-cmd' : ''}${NUIT ? '-nuit' : ''}.png` });
  await k('Escape'); v('Échap ferme la recherche', !(await pal(p)));
  await k(CMD + '+k'); await k(CMD + '+k'); v('Ctrl/Cmd+K une seconde fois la referme', !(await pal(p)));
  await k(CMD + '+k'); await p.mouse.click(5, 5); await L.calme(p, 300); v('un clic à côté la ferme', !(await pal(p)));
  // mots qu'on tape : ce que la recherche trouve (ou pas)
  const mots = ['planning', 'stock', 'tâche', 'tache', 'heures', 'congés', 'absence', 'véhicule', 'camion', 'fournisseur', 'mot de passe', 'déconnexion', 'nuit', 'aide', 'raccourci', 'facture', 'paiement', 'logo', 'siret', 'iban', 'paie', 'équipe', 'utilisateur', 'technicien', 'frais', 'note de frais', 'comptabilité', 'banque', 'tva', 'courrier', 'mail', 'client', 'contrat', 'devis', 'intervention', 'statistiques', 'historique', 'nouveautés', 'visite', 'dépôt', 'produit', 'commande', 'achat', 'rendez-vous', 'horaires', 'paramètres', 'réglages'];
  const rien = [];
  for (const m of mots) { await k(CMD + '+k'); await p.keyboard.type(m, { delay: 5 }); await L.calme(p, 120); const e = await entrees(p); if (!e.length) rien.push(m); await k('Escape'); }
  console.log('  · mots tapés sans aucune réponse :', rien.join(', ') || '(aucun)');
  v('[coque-03] les mots courants de l’artisan trouvent quelque chose (sans réponse : ' + rien.join(', ') + ')', QUI !== 'marc' ? true : rien.length === 0, rien);
  await k(CMD + '+k'); await p.keyboard.type('zzzzqq'); await L.calme(p, 150);
  const vide = await p.evaluate(() => (document.querySelector('#pal .pal-v') || {}).textContent);
  v('rien ne correspond : le dit, avec ce qui a été tapé (« ' + vide + ' »)', /Rien ne correspond/.test(vide || ''));
  await p.keyboard.press('Enter'); await L.calme(p, 200); v('Entrée sur « rien » ne casse rien et laisse la recherche ouverte', await pal(p));
  await k('Escape');
  // chaque entrée de la recherche est JOUÉE
  const E = await p.evaluate(() => palEntrees().map(e => ({ g: e.g, l: e.l })));
  v('population : la recherche compte ' + E.length + ' entrées', E.length >= 15);
  let joues = 0;
  for (const e of E) {
    if (e.l === 'Se déconnecter') continue;
    await p.evaluate(() => { try { fermerPanneau(); } catch (x) {} const n = document.getElementById('nv'); if (n) n.remove(); });
    const avant = await L.etat(p); avant.fenetre = await fen();
    await k(CMD + '+k'); await p.keyboard.type(e.l, { delay: 4 }); await L.calme(p, 150);
    const liste = await entrees(p); const i = liste.indexOf(e.l);
    if (i < 0) { v('« ' + e.l + ' » se retrouve en tapant son nom', false, liste.slice(0, 4)); await k('Escape'); continue; }
    for (let j = 0; j < i; j++) await p.keyboard.press('ArrowDown');
    await p.keyboard.press('Enter'); await L.calme(p, 700); joues++;
    apres_ = await L.etat(p); apres_.fenetre = await fen(); const apres = apres_, ch = L.change(avant, apres).filter(x => x !== 'focus' && x !== 'toast' || apres.toast !== avant.toast);
    const mode = e.g === 'Affichage';
    const modeChange = mode && (await p.evaluate(() => document.documentElement.dataset.mode));
    v('recherche › « ' + e.l + ' » fait quelque chose (' + (ch.join(',') || 'rien') + (mode ? ', mode ' + modeChange : '') + ')', ch.length > 0 || mode || e.l === 'Accueil');
    if (e.g === 'Aller à' && !/Factures|Paiements/.test(e.l)) { const t = await h1(p); v('  … et l’écran dit « ' + e.l + ' » (titre « ' + t.slice(0, 40) + ' »)', t.toLowerCase().includes(e.l.toLowerCase().slice(0, 6)) || /^bonjour/i.test(t), t); }
    if (e.g === 'Clients') { const t = await h1(p); v('  … la fiche client s’appelle « ' + e.l + ' » (titre « ' + t.slice(0, 40) + ' »)', t.toLowerCase().includes(e.l.toLowerCase().slice(0, 8)), t); }
    await p.evaluate(() => { try { fermerPanneau(); } catch (x) {} const n = document.getElementById('nv'); if (n) n.remove(); document.querySelectorAll('#gd-bulle,.gd-voile').forEach(x => x.remove()); });
    await p.evaluate(() => { try { if (typeof CREA !== 'undefined' && CREA) fermerCreation(); } catch (x) {} });
    if (await cpOuvert(p)) { await p.evaluate(() => document.querySelector('[data-cpsys="retour"]')?.click()); await L.calme(p, 600); }
    await p.keyboard.press('Escape');
  }
  console.log('  · entrées jouées : ' + joues + ' / ' + (E.length - 1));
  v('aucune erreur de console pendant la recherche', c.err.length === 0, c.err.slice(0, 3));
  v('population : aucune fenêtre ni Comptabilité plein écran ne reste ouverte avant les touches', !(await cpOuvert(p)) && !(await p.evaluate(() => !!document.querySelector('#calque .voile, .fen-voile, .ctx, #opdz:not([hidden]), #gd-bulle'))));
  // la visite parlée et le guide, lancés par la recherche, ne s'effacent pas d'un geste : on repart d'une page neuve pour les touches
  await p.reload({ waitUntil: 'load' }); await p.waitForTimeout(1600); await p.evaluate(() => document.querySelector('#nv [data-nv="fermer"]')?.click()); await L.calme(p, 400);
  // ---- le panneau des raccourcis
  await L.aller(p, 'accueil');
  await p.evaluate(() => { try { fermerPanneau(); } catch (x) {} }); await p.evaluate(() => document.activeElement && document.activeElement.blur && document.activeElement.blur());
  await p.keyboard.press('Shift+?'); await L.calme(p, 350);
  v('« ? » ouvre « Raccourcis clavier et gestes »', /Raccourcis/.test(await panneau(p)), await panneau(p));
  const lignesAide = await p.evaluate(() => [...document.querySelectorAll('#calque .rc-l')].map(r => r.innerText.replace(/\s+/g, ' ')));
  console.log('  · lignes du panneau :', lignesAide.length);
  v('le panneau cite ' + (MACSIM ? '⌘' : 'Ctrl') + ' et pas l’autre', lignesAide.some(t => t.includes(MACSIM ? '⌘' : 'Ctrl')) && !lignesAide.some(t => t.includes(MACSIM ? 'Ctrl' : '⌘')), lignesAide.slice(0, 2));
  // ce que la personne a le droit de créer se lit dans les cases de ses droits (le panneau et les touches doivent dire la même chose)
  const droits = await p.evaluate(() => ({ N: rcInterOk(), D: rcCreerOk(RC_CREER.find(c => c.nom === 'devis')), C: rcCreerOk(RC_CREER.find(c => c.nom === 'client')), A: rcCreerOk(RC_CREER.find(c => c.nom === 'tache')) }));
  const promis = { N: lignesAide.some(t => /Nouvelle intervention/.test(t)), D: lignesAide.some(t => /Nouveau devis/.test(t)), C: lignesAide.some(t => /Nouveau client/.test(t)), A: lignesAide.some(t => /Nouvelle tâche/.test(t)) };
  v('[coque-05] le panneau ne promet que ce que cette personne peut faire, et promet tout ce qu’elle peut (N, D, C, A pour ' + QUI + ')', ['N', 'D', 'C', 'A'].every(k => promis[k] === droits[k]), { droits, promis });
  v('[coque-06] le panneau n’annonce pas le « Trackpad » à qui n’a pas de Mac (' + PROFIL + ')', MACSIM || !lignesAide.some(t => /2 doigts|Pincer/.test(t)), lignesAide.filter(t => /doigts|Pincer/.test(t)));
  await k('Escape'); v('Échap ferme le panneau des raccourcis', !(await panneau(p)));
  // ---- les touches de création
  const essais = [['n', /Nouvelle intervention|intervention/i, 'N'], ['d', /Devis|devis/, 'D'], ['c', /client/i, 'C'], ['a', /tâche|Tâches/i, 'A']];
  for (const [t, motif, nom] of essais) {
    await L.aller(p, QUI === 'marc' ? 'accueil' : 'clients'); await p.evaluate(() => { const n = document.getElementById('fenetre'); if (n) n.innerHTML = ''; });   // une personne dont l'écran d'ouverture est la Comptabilité plein écran : on part d'un écran ordinaire (la Comptabilité est jouée dans coque-parcours § F) await p.evaluate(() => document.activeElement && document.activeElement.blur && document.activeElement.blur());
    const avant = await L.etat(p); await p.keyboard.press(t); await L.calme(p, 900);
    const apres = await L.etat(p), ch = L.change(avant, apres);
    const traitee = !!droits[nom];
    const texte = (apres.panneau || '') + ' ' + (await fen()) + ' ' + (apres.h1 || '') + ' ' + (await p.evaluate(() => document.activeElement ? (document.activeElement.placeholder || document.activeElement.id || '') : ''));
    if (traitee) v('touche ' + nom + ' : ouvre le bon geste (« ' + texte.trim().slice(0, 60) + ' »)', (ch.length > 0 || (await fen())) && (motif.test(texte) || (nom === 'A' && /taches|tkx/.test(await p.evaluate(() => location.hash + (document.activeElement.getAttribute('data-tkxajout') !== null ? 'tkx' : ''))))), { ch, texte });
    else v('touche ' + nom + ' : ne fait rien pour ' + QUI + ' qui n’a pas la case (pas de geste caché)', ch.filter(x => x !== 'focus').length === 0 && !(await fen()), ch);
    await p.screenshot({ path: CAP + `creation-${nom}-${PROFIL}-${QUI}.png` });
    await p.evaluate(() => { try { fermerPanneau(); } catch (x) {} try { if (typeof CREA !== 'undefined' && CREA) fermerCreation && fermerCreation(); } catch (x) {} }); await p.keyboard.press('Escape'); await L.calme(p, 300);
  }
  // une touche tapée DANS un champ ne déclenche rien
  await L.aller(p, 'clients'); const champ = p.locator('#contenu input[placeholder^="Cherch"], #contenu input[placeholder^="Recherch"], #contenu input[type=search]').first();
  if (await champ.count()) { await champ.click(); const avant = await L.etat(p); await p.keyboard.type('ndca', { delay: 20 }); await L.calme(p, 400); const apres = await L.etat(p); v('taper « ndca » dans le champ de recherche n’ouvre aucun geste', !apres.panneau && apres.h1 === avant.h1, { avant: avant.h1, apres: apres.h1, panneau: apres.panneau }); }
  else v('population : un champ de recherche existe sur Clients', false);
  // « / » cherche dans l'écran
  await p.evaluate(() => document.activeElement.blur()); await p.keyboard.press('Escape');
  await p.keyboard.press('/'); await L.calme(p, 300);
  v('« / » met le curseur dans le champ de recherche de l’écran', await p.evaluate(() => { const a = document.activeElement; return !!a && /INPUT/.test(a.tagName) && /Cherch|Recherch/i.test(a.placeholder || ''); }));
  await p.evaluate(() => document.activeElement.blur());
  // précédent / suivant
  const [ra, rb] = await p.evaluate(() => rcRubriques().filter(r => r.k !== 'comptabilite').slice(0, 2).map(r => [r.k, r.l]));   // deux écrans que CETTE personne a au menu
  await L.aller(p, ra[0]); await L.aller(p, rb[0]); await k(CMD + '+[');
  const hash = () => p.evaluate(() => location.hash);   // on lit l'adresse : le titre d'« Accueil » est « Bonjour Marc »
  v(CMD + ' + [ revient à l’écran d’avant (' + ra[1] + ')', (await hash(p)).includes(ra[0]), await hash(p));
  await k(CMD + '+]'); v(CMD + ' + ] avance (' + rb[1] + ')', (await hash(p)).includes(rb[0]), await hash(p));
  // annuler le dernier geste quand il n'y a rien à annuler
  const av = await L.etat(p); await k(CMD + '+z'); const ap = await L.etat(p);
  console.log('  · Ctrl/Cmd+Z sans rien à annuler → changements :', L.change(av, ap).join(',') || 'aucun', '| toast :', ap.toast);
  v('Ctrl/Cmd+Z ne casse rien (pas d’erreur)', c.err.length === 0, c.err.slice(0, 3));
  await L.fin(c); await L.fermer();
  process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.error('SONDE MORTE', e); process.exit(2); });
