// Angle « accès » · sonde 3 : la CONNEXION et la SESSION, par les vrais gestes (écran du lien, écran d'identifiant, première connexion, « Se déconnecter »),
// puis ce que le navigateur garde (localStorage opg_proto_*) et ce qu'une autre fenêtre peut faire. 127.0.0.1 seulement, entreprise fictive.
const L = require('../lib.js'), fs = require('fs');
const OUT = '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/acces/';
const rap = {};
const attendre = (p, f, ms, a) => L.attendre(p, f, ms || 12000, a);
async function lienPuisIdentifiant(p, texte) { await attendre(p, () => !!document.getElementById('cn-form-lien'), 15000); await p.fill('#cn-lien', texte); await p.press('#cn-lien', 'Enter');
  return attendre(p, () => !!document.getElementById('cn-form'), 15000); }
async function tenter(p, id, mdp, att) { await p.fill('#cn-id', id); await p.fill('#cn-mdp', mdp); await p.press('#cn-mdp', 'Enter'); await p.waitForTimeout(att || 90);
  return p.evaluate(() => ({ err: (document.getElementById('cn-err') || {}).textContent || '', premier: !!document.getElementById('cn-form-premier'), charge: !!document.querySelector('#cnx.charge') })); }
(async () => {
  // ── A. à froid : l'écran du lien couvre-t-il VRAIMENT l'application ? (l'application du gérant est dessinée dessous) ─────────────────────────
  let c = await L.ouvrir({ profil: 'mac', qui: null, attente: 600 });
  await attendre(c.p, () => !!document.getElementById('cn-form-lien'), 15000);
  const A = await c.p.evaluate(() => ({ session: typeof SESSION === 'undefined' ? 'indéfini' : SESSION, role: ROLE, acteur: acteur(), contenu: document.getElementById('contenu').innerText.replace(/\s+/g, ' ').length, menu: document.querySelectorAll('#menu a[href^="#"]').length, h1: (document.querySelector('#contenu h1') || {}).textContent, inerte: !!document.querySelector('#menu').closest('[inert]') || document.getElementById('contenu').closest('[inert]') !== null, ariaCache: document.getElementById('contenu').closest('[aria-hidden="true"]') !== null }));
  console.log('A. à froid :', JSON.stringify(A)); rap.aFroid = A;
  L.v('A. population : l\'écran du lien est là et l\'application dessinée dessous compte des éléments', A.menu > 10 && A.contenu > 200, A);
  // Tab : où va le focus quand on n'est PAS connecté ?
  const sortis = [], vus = new Set(); await c.p.evaluate(() => document.getElementById('cn-lien').focus());
  for (let i = 0; i < 70; i++) { await c.p.keyboard.press('Tab'); const r = await c.p.evaluate(() => { const e = document.activeElement; return { dedans: !!(e && e.closest('#cnx')), s: e ? (e.tagName + '|' + (e.getAttribute('aria-label') || e.textContent || e.id || '').replace(/\s+/g, ' ').trim().slice(0, 40)) : '' }; });
    if (!r.dedans && !vus.has(r.s)) { vus.add(r.s); sortis.push(r.s); } }
  console.log('A. focus clavier sorti de l\'écran de connexion vers', sortis.length, 'éléments :', sortis.slice(0, 8).join(' ¦ ')); rap.focusDehors = sortis;
  L.v('A. le clavier reste dans l\'écran de connexion (Tab ×70)', sortis.length === 0, sortis.slice(0, 6));
  if (sortis.length) { // un geste derrière le rideau : Entrée sur un élément de l'application du gérant
    const av = await L.etat(c.p); await c.p.keyboard.press('Enter'); await c.p.waitForTimeout(500); const ap = await L.etat(c.p);
    console.log('A. Entrée derrière l\'écran de connexion → changé :', L.change(av, ap).join(',') || 'rien', JSON.stringify({ hash: ap.hash, panneau: ap.panneau })); rap.entreeDerriere = { change: L.change(av, ap), hash: ap.hash }; }
  await c.p.screenshot({ path: OUT + 'connexion-a-froid.png' });
  // ── B. le « lien » est le nom de l'entreprise ────────────────────────────────────────────────────────────────────────────────────────────
  const okNom = await lienPuisIdentifiant(c.p, 'Clim Services 17');
  L.v('B. le nom public de l\'entreprise suffit comme « lien de connexion »', okNom, 'ouvre l\'écran d\'identifiant avec « Clim Services 17 »'); rap.lienEstLeNom = okNom;
  // ── C. essais de mot de passe : aucune limite ? ──────────────────────────────────────────────────────────────────────────────────────────
  const t0 = Date.now(); let derniere = null, dist = new Set();
  for (let i = 0; i < 40; i++) { derniere = await tenter(c.p, 'marc', 'faux' + i); dist.add(derniere.err); }
  const dur = Date.now() - t0;
  console.log('C. 40 essais faux sur « marc » :', dur, 'ms · messages distincts :', [...dist].join(' | '));
  rap.essais = { n: 40, ms: dur, messages: [...dist] };
  L.v('C. au bout de 40 essais faux le compte se verrouille ou ralentit', dist.size > 1 || dur > 40 * 1500, { messages: [...dist], ms: dur });
  const inconnu = await tenter(c.p, 'personne-inconnue', 'x'); const connu = await tenter(c.p, 'marc', 'x');
  L.v('C. même message pour un identifiant inconnu et un identifiant connu (pas de sondage des comptes)', inconnu.err === connu.err, [inconnu.err, connu.err]);
  const jules = await tenter(c.p, 'MARC ', 'Bienvenue17', 700); // le mot de passe provisoire COMMUN de la page
  console.log('C. « marc » + mot de passe provisoire commun (écrit dans la page publique) →', JSON.stringify(jules)); rap.marcProvisoire = jules;
  L.v('C. le compte du gérant ne s\'ouvre pas avec le mot de passe provisoire commun', !jules.premier && !jules.charge, jules);
  // ── D. la première connexion : celui qui arrive PREMIER choisit le mot de passe du gérant ────────────────────────────────────────────────
  if (jules.premier) { await c.p.fill('#cn-n1', 'MotDePasseDuPirate1'); await c.p.fill('#cn-n2', 'MotDePasseDuPirate1'); await c.p.press('#cn-n2', 'Enter');
    await attendre(c.p, () => !document.getElementById('cnx') && !!document.getElementById('menu') && typeof SESSION !== 'undefined' && !!SESSION, 20000);
    const D = await c.p.evaluate(() => ({ session: SESSION, role: ROLE, mdp: localStorage.getItem('opg_proto_mdp'), sess: localStorage.getItem('opg_proto_session'), espace: localStorage.getItem('opg_proto_espace') }));
    console.log('D. le pirate est le gérant ; ce que le navigateur garde :', JSON.stringify(D)); rap.pirateGerant = D;
    L.v('D. (preuve) le premier arrivé choisit le mot de passe du gérant', D.session === 'marc', D);
    L.v('D. le navigateur ne range aucun mot de passe en clair', !/MotDePasseDuPirate1/.test(D.mdp || ''), D.mdp);
    // ── E. l'identité rangée est une simple clé : l'éditer change de personne ──────────────────────────────────────────────────────────────
    for (const k of ['sm', 'julie']) { await c.p.evaluate(k => { localStorage.setItem('opg_proto_session', k); }, k); await c.p.reload({ waitUntil: 'load' }); await c.p.waitForTimeout(6500);
      const E = await c.p.evaluate(() => ({ session: SESSION, role: ROLE, cnx: !!document.getElementById('cnx') })); console.log('E. opg_proto_session=' + k + ' puis rechargement →', JSON.stringify(E)); rap['edition_' + k] = E;
      L.v('E. changer opg_proto_session ne donne pas la session d\'un autre (' + k + ')', E.session !== k, E); }
    // ── F. « Se déconnecter » ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
    await c.p.evaluate(() => { localStorage.setItem('opg_proto_session', 'marc'); }); await c.p.reload({ waitUntil: 'load' }); await c.p.waitForTimeout(6500);
    const p2 = await c.ctx.newPage(); await p2.goto(c.p.url(), { waitUntil: 'load' }); await p2.waitForTimeout(6500);
    const avant = await Promise.all([c.p, p2].map(p => p.evaluate(() => SESSION)));
    await c.p.evaluate(() => { const b = document.querySelector('[data-cnx="sortir"]'); if (b) b.click(); }); await c.p.waitForTimeout(1200);
    const F = await c.p.evaluate(() => ({ session: SESSION, role: ROLE, acteur: acteur(), stocke: localStorage.getItem('opg_proto_session'), cnx: !!document.getElementById('cn-form'), contenuDessous: document.getElementById('contenu').innerText.replace(/\s+/g, ' ').length, h1: (document.querySelector('#contenu h1') || {}).textContent }));
    console.log('F. après « Se déconnecter » :', JSON.stringify(F)); rap.apresDeconnexion = F;
    L.v('F. (population) la session était ouverte avant', avant[0] === 'marc' && avant[1] === 'marc', avant);
    L.v('F. la déconnexion efface la clé rangée', F.stocke === null, F);
    L.v('F. après la déconnexion, l\'acteur n\'est plus le gérant', F.acteur !== 'marc', F);
    const F2 = await p2.evaluate(() => ({ session: SESSION, cnx: !!document.getElementById('cn-form') }));
    console.log('F. l\'AUTRE fenêtre (déjà ouverte) :', JSON.stringify(F2)); rap.autreFenetre = F2;
    L.v('F. une autre fenêtre déjà ouverte tombe aussi en déconnexion', F2.session === null, F2);
    // retour arrière du navigateur
    await c.p.goBack().catch(() => {}); await c.p.waitForTimeout(500);
    const F3 = await c.p.evaluate(() => ({ session: SESSION, cnx: !!document.getElementById('cn-form'), hash: location.hash }));
    L.v('F. « Précédent » du navigateur ne rouvre rien', F3.cnx && !F3.session, F3);
    // focus derrière le rideau, après déconnexion
    await c.p.evaluate(() => document.getElementById('cn-id') && document.getElementById('cn-id').focus()); const dehors = [];
    for (let i = 0; i < 60; i++) { await c.p.keyboard.press('Tab'); const r = await c.p.evaluate(() => { const e = document.activeElement; return { dedans: !!(e && e.closest('#cnx')), s: e ? e.tagName + '|' + (e.getAttribute('aria-label') || e.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 30) : '' }; }); if (!r.dedans) dehors.push(r.s); }
    L.v('F. après déconnexion, le clavier reste dans l\'écran de connexion', dehors.length === 0, [...new Set(dehors)].slice(0, 6)); rap.focusDehorsApresSortie = [...new Set(dehors)];
    await p2.close();
    // ── H. le passage d'une nouvelle fenêtre (opg_proto_fenetre) ───────────────────────────────────────────────────────────────────────────
    await c.p.evaluate(() => { localStorage.removeItem('opg_proto_session'); localStorage.setItem('opg_proto_fenetre', JSON.stringify({ k: 'marc', vue: 'accueil', mode: 'jour', t: Date.now() })); });
    const p3 = await c.ctx.newPage(); await p3.goto(c.p.url().replace(/#.*/, ''), { waitUntil: 'load' }); await p3.waitForTimeout(3500);
    const H = await p3.evaluate(() => ({ session: SESSION, role: ROLE })); console.log('H. un passage « fenêtre » planté dans le rangement →', JSON.stringify(H)); rap.passageFenetre = H;
    L.v('H. un passage rangé à la main n\'ouvre pas de session', H.session === null, H); await p3.close();
  }
  fs.writeFileSync(OUT + 'connexion.json', JSON.stringify(rap, null, 1));
  console.log('erreurs page :', c.err.slice(0, 3)); await L.fin(c); await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(async e => { console.error(e); try { await L.fermer(); } catch (x) {} process.exit(2); });
