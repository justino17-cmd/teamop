// « VOIR COMME L'APPLICATION » DANS L'ARTEFACT (17 novembre 2026, voie « restes », artefact, tour 1).
// Dans un artefact, `?app=1` ne passe pas : seul un « #nom » passe. Le visiteur restait en mode REVUE (la bande « Tester en tant que ») et ne voyait jamais
// l'écran de connexion ni OP Security. La bande porte maintenant un bouton qui pose `#lien-<entreprise>` ET un drapeau de session, puis recharge ;
// l'écran de connexion propose « Revenir au mode test » (seulement quand on est entré par ce bouton). Cette sonde JOUE le bouton, la page rechargée,
// le retour — dans la page du haut ET dans un cadre (comme claude.ai) — avec les refus que l'artefact peut opposer :
//   · rangement refusé (le `#lien-` seul suffit) ; adresse perdue au rechargement (le drapeau seul suffit) ; historique refusé (aucune erreur) ;
//   · rechargement refusé ou sans effet : la page le DIT et remet les choses comme elles étaient.
// Et les deux casses du recontrôle côté page : tout `history.replaceState` nu prend son `try` (rubrique refusée à une technicienne sous un historique qui jette).
// Population d'abord (la bande est là, le bouton est là, la connexion est là) : un zéro sur du vide ne prouve rien. 127.0.0.1 seulement.
//   PROFILS=mac,iphone  JOUR=1 (jour seulement)  node artefact-voir-app.js
const P = require('./recontrole-artefact-pose.js'), { bac, lib: L, v } = P;
const fs = require('fs'), path = require('path');
const sec = k => !process.env.SEC || process.env.SEC.split(',').includes(k);   // SEC=A,H : ne jouer que ces parties (les mutations rejouent la partie qu'elles visent)
const PROFILS = (process.env.PROFILS || 'mac,iphone').split(',');
const CAP = process.env.CAP || '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/voir-app';
fs.mkdirSync(CAP, { recursive: true });
const SLUG = 'clim-services-17';
// ce que la page montre, lu dans la page elle-même (jamais dans le texte du <script> : on lit #cnx, .rl-bande, #contenu)
const lit = f => f.evaluate(() => { const cnx = document.getElementById('cnx'), vis = e => !!e && e.getBoundingClientRect().width > 4 && getComputedStyle(e).visibility !== 'hidden';
  let flag = null; try { flag = sessionStorage.getItem('opg_proto_voir_app'); } catch (e) { flag = 'REFUSE'; }
  const lien = document.querySelector('#cnx-test'), bouton = document.querySelector('.rl-bande [data-apv]');
  return { app: typeof MODE_APP !== 'undefined' && !!MODE_APP, dataApp: document.documentElement.dataset.app || '', bande: vis(document.querySelector('.rl-bande')), bouton: vis(bouton), boutonTexte: bouton ? bouton.textContent.trim() : '',
    roles: document.querySelectorAll('.rl-bande [data-rl^="role|"]').length, cnx: vis(cnx), carte: vis(document.querySelector('#cnx .cn-carte')), cnxTitre: cnx ? ((cnx.querySelector('h1') || {}).textContent || '').trim() : '', lien: vis(lien), lienTexte: lien ? lien.textContent.trim() : '',
    err: (document.getElementById('cn-err') || {}).textContent || '', toast: (() => { const t = document.getElementById('toast'); return t && t.classList.contains('on') ? t.textContent.trim() : ''; })(),
    hash: location.hash, drapeau: flag, parBouton: typeof APP_PAR_BOUTON !== 'undefined' && !!APP_PAR_BOUTON, contenu: (document.getElementById('contenu') || { innerText: '' }).innerText.length }; });
// attend que la page (re)chargée soit prête : un état de la page lisible ET stable
async function pret(c, ms) { const t0 = Date.now(); let e = null; while (Date.now() - t0 < (ms || 20000)) { await c.p.waitForTimeout(400); e = await lit(c.p).catch(() => null); if (e && (e.bande || (e.cnx && e.carte))) {   // l'écran de lancement (logo seul) couvre la page avant la carte : on attend la carte
  await c.p.waitForTimeout(700); return await lit(c.p).catch(() => e); } } return e; }
const calmer = f => f.evaluate(() => { try { window.horsLigneDebut = function () {}; } catch (e) {} const e = document.getElementById('hl-ecran'); if (e) e.remove(); const b = document.querySelector('#nv [data-nv="fermer"]'); if (b) b.click(); }).catch(() => {});
// ouvre le prototype « comme un artefact » : sans requête, en mode revue. enCadre : dans un cadre (comme claude.ai) ; sinon page du haut.
async function ouvrir(profil, nuit, pose, enCadre, hash) {
  const o = { profil, qui: null, app: false, nuit, guide: true, hash };
  const c = enCadre ? await P.ouvrirHote(o, pose || {}) : await P.ouvrir(o, pose || {});
  await calmer(c.p); return c;
}
const rien = c => (c.err || []).filter(x => !/hors-ligne|horsLigne/.test(x));
const photo = async (c, nom) => { try { await (c.hote || c.p).screenshot({ path: path.join(CAP, nom + '.png') }); } catch (e) {} };
(async () => {
  for (const profil of PROFILS) for (const nuit of (process.env.JOUR ? [false] : [false, true])) {
    const T = `${profil}/${nuit ? 'nuit' : 'jour'}`;
    // ── A. la page du haut : le chemin complet, bouton → application → retour ─────────────────────────────────────────────
    if (sec('A')) { let c = await ouvrir(profil, nuit, {}, false);
    let e = await lit(c.p);
    v(`${T} A : population (mode revue : la bande, ses ${e.roles} rôles et le bouton sont là, pas d'écran de connexion)`, !e.app && e.bande && e.roles >= 3 && e.bouton && !e.cnx && e.dataApp === '', e);
    v(`${T} A : le bouton se lit « Voir comme l'application »`, /Voir comme l.application/.test(e.boutonTexte), e.boutonTexte);
    await photo(c, `${profil}-${nuit ? 'nuit' : 'jour'}-1-bande`);
    // la cible tactile : au moins 44 px au doigt, 40 px à la souris
    const tb = await c.p.evaluate(() => { const r = document.querySelector('.rl-bande [data-apv]').getBoundingClientRect(); return { h: Math.round(r.height), w: Math.round(r.width), droite: Math.round(r.right), larg: innerWidth }; });
    v(`${T} A : le bouton est une vraie cible (${tb.h} px de haut) et tient dans l'écran`, tb.h >= (c.doigt ? 44 : 40) && tb.droite <= tb.larg + 1, tb);
    await L.toucher(c, c.p.locator('.rl-bande [data-apv]').first()); e = await pret(c, 25000);
    v(`${T} A : un toucher → l'écran de connexion (plus de bande, plus de rôles à choisir)`, e && e.app && e.cnx && !e.bande && e.roles === 0 && e.dataApp === '1', e);
    v(`${T} A : le drapeau de session est posé et l'écran sait qu'on est entré par le bouton`, e.drapeau === '1' && e.parBouton, { d: e.drapeau, pb: e.parBouton });
    v(`${T} A : « Revenir au mode test » est là, lisible (${e.lienTexte})`, e.lien && /Revenir au mode test/.test(e.lienTexte), e);
    await photo(c, `${profil}-${nuit ? 'nuit' : 'jour'}-2-connexion`);
    // le lien est posé en haut à gauche, DANS l'écran, hors de la colonne : il ne recouvre ni le logo ni la carte, et la page ne défile pas pour le trouver
    const g = await c.p.evaluate(() => { const l = document.querySelector('#cnx-test').getBoundingClientRect(), lo = document.querySelector('#cnx .cn-logo').getBoundingClientRect(), ca = document.querySelector('#cnx .cn-carte').getBoundingClientRect();
      const recouvre = (a, b) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
      return { l: [Math.round(l.left), Math.round(l.top), Math.round(l.width), Math.round(l.height)], dansEcran: l.top >= 0 && l.left >= 0 && l.right <= innerWidth && l.bottom <= innerHeight, surLogo: recouvre(l, lo), surCarte: recouvre(l, ca) }; });
    v(`${T} A : le lien « Revenir au mode test » est dans l'écran (${g.l.join(', ')}), sans recouvrir le logo ni la carte, cible ≥ 44 px`, g.dansEcran && !g.surLogo && !g.surCarte && g.l[3] >= 44, g);
    // et il s'éteint avec l'écran de connexion (une fois connecté, il ne reste rien à l'écran)
    const apres = await c.p.evaluate(() => { const cx = document.getElementById('cnx'); const avant = getComputedStyle(document.getElementById('cnx-test')).display; cx.style.display = 'none'; const x = cx; x.id = 'cnx-ferme'; const d = getComputedStyle(document.getElementById('cnx-test')).display; x.id = 'cnx'; x.style.display = ''; return { avant, apres: d }; });
    v(`${T} A : le lien disparaît quand l'écran de connexion n'est plus là (display : ${apres.avant} → ${apres.apres})`, apres.avant !== 'none' && apres.apres === 'none', apres);
    // l'adresse ne reste pas « #lien-… » collée : la page l'a remplacée (ou l'a gardée), jamais d'erreur
    v(`${T} A : aucune erreur JavaScript jusqu'ici`, rien(c).length === 0, c.err.slice(0, 3));
    // un second rechargement (F5) : le drapeau seul garde l'application, l'écran reste celui de la connexion
    await c.p.reload({ waitUntil: 'load', timeout: 60000 }).catch(() => {}); await calmer(c.p); e = await pret(c, 25000);
    v(`${T} A : un rechargement ramène la connexion (le drapeau tient), le lien de retour aussi`, e && e.app && e.cnx && e.lien && e.drapeau === '1', e);
    // le retour
    await L.toucher(c, c.p.locator('#cnx-test').first()); e = await pret(c, 25000);
    v(`${T} A : « Revenir au mode test » → la bande est de retour, plus d'écran de connexion`, e && !e.app && e.bande && !e.cnx && e.roles >= 3 && e.bouton, e);
    v(`${T} A : le drapeau est retiré et l'adresse n'est plus « #lien-… »`, e.drapeau === null && !/^#lien-/.test(e.hash), { d: e.drapeau, h: e.hash });
    await calmer(c.p); await L.fin(c); }

    // ── B. la connexion NE propose PAS le retour hors du bouton : ?app=1 (sondes, partage d'adresse) et la coque (OPG_MODE_APP) ─
    if (sec('B')) { let c = await L.ouvrir({ profil, qui: null, app: true, nuit, guide: true }); await calmer(c.p); await c.p.waitForTimeout(900); let e = await lit(c.p);
    v(`${T} B : population (?app=1 sans session : l'écran de connexion est là)`, e.app && e.cnx, e);
    v(`${T} B : ?app=1 → AUCUN « Revenir au mode test »`, !e.lien && !e.parBouton, e);
    await L.fin(c);
    c = await L.ouvrir({ profil, qui: null, app: false, nuit, guide: true, requete: '', init: 'window.OPG_MODE_APP = true;' }); await calmer(c.p); await c.p.waitForTimeout(900); e = await lit(c.p);
    v(`${T} B : population (coque : OPG_MODE_APP, l'écran de connexion est là)`, e.app && e.cnx && !e.bande, e);
    v(`${T} B : la coque → AUCUN « Revenir au mode test », même avec un drapeau de session posé`, !e.lien && !e.parBouton, e);
    await c.p.evaluate(() => { try { sessionStorage.setItem('opg_proto_voir_app', '1'); } catch (e) {} }); await c.p.reload({ waitUntil: 'load', timeout: 60000 }).catch(() => {}); await calmer(c.p); await c.p.waitForTimeout(1200); e = await lit(c.p);
    v(`${T} B : la coque rechargée avec un drapeau posé → toujours aucun lien de retour`, e.app && e.cnx && !e.lien && !e.parBouton, e);
    await L.fin(c); }
  }

  // ── C, D, E, F : les refus de l'artefact, sur un profil et en jour (le dessin est jugé en A) ───────────────────────────────
  for (const profil of PROFILS.slice(0, 1)) {
    const T = profil;
    // C. rangement refusé : le `#lien-` seul suffit, et le retour marche sans drapeau
    if (sec('C')) for (const mode of ['refuse', 'methodes']) {
      let c = await ouvrir(profil, false, { rangement: mode }, false); let e = await lit(c.p);
      v(`${T} C(${mode}) : population (le rangement refuse bien : drapeau illisible → ${e.drapeau}), la bande est là`, e.bande && e.bouton, e);
      await L.toucher(c, c.p.locator('.rl-bande [data-apv]').first()); e = await pret(c, 25000);
      v(`${T} C(${mode}) : rangement refusé → l'application s'ouvre quand même (le #lien- seul suffit)`, e && e.app && e.cnx && !e.bande && e.parBouton && e.lien, e);
      await c.p.reload({ waitUntil: 'load', timeout: 60000 }).catch(() => {}); await calmer(c.p); e = await pret(c, 25000);
      v(`${T} C(${mode}) : l'adresse n'ayant plus son #lien-, le rechargement suivant revient en mode test, sans erreur (rien ne tient l'application sans rangement)`, e && !e.app && e.bande, e);
      v(`${T} C(${mode}) : aucune erreur JavaScript`, rien(c).length === 0, c.err.slice(0, 3));
      await L.fin(c);
    }
    // et le retour sans rangement : on entre par l'adresse seule (#lien-), puis « Revenir au mode test » (le drapeau est illisible, l'adresse se vide)
    if (sec('C')) { const c = await L.ouvrir({ profil, qui: null, app: false, requete: '', hash: 'lien-' + SLUG, guide: true, init: bac.script({ rangement: 'refuse' }) }); await calmer(c.p); let e = await pret(c, 25000);
      v(`${T} C : population (entré par #lien-${SLUG} sans rangement : la connexion, le lien de retour)`, e && e.app && e.cnx && e.lien, e);
      await L.toucher(c, c.p.locator('#cnx-test').first()); e = await pret(c, 25000);
      v(`${T} C : « Revenir au mode test » sans rangement → la bande, sans erreur`, e && !e.app && e.bande && !e.cnx, e);
      v(`${T} C : aucune erreur JavaScript`, rien(c).length === 0, c.err.slice(0, 3)); await L.fin(c); }

    // D. le drapeau seul : l'adresse est perdue au rechargement (l'hôte rejoue l'adresse d'origine, sans #lien-)
    if (sec('D')) { const c = await ouvrir(profil, false, {}, false); await c.p.evaluate(() => { window.appRecharger = () => { location.replace(location.pathname + location.search); return true; }; });
      await L.toucher(c, c.p.locator('.rl-bande [data-apv]').first()); const e = await pret(c, 25000);
      v(`${T} D : adresse perdue au rechargement → le drapeau seul ouvre l'application (hash « ${e && e.hash} », drapeau ${e && e.drapeau})`, e && e.app && e.cnx && e.drapeau === '1' && !/lien-/.test(e.hash), e);
      v(`${T} D : aucune erreur JavaScript`, rien(c).length === 0, c.err.slice(0, 3)); await L.fin(c); }

    // E. historique refusé (origine opaque) : le bouton marche quand même, aucune erreur
    if (sec('E')) for (const hist of ['jette', 'jette-tout']) { const c = await ouvrir(profil, false, { historique: hist }, false); let e = await lit(c.p);
      await L.toucher(c, c.p.locator('.rl-bande [data-apv]').first()); e = await pret(c, 25000);
      v(`${T} E(${hist}) : historique refusé → le bouton ouvre quand même la connexion`, e && e.app && e.cnx && !e.bande, e);
      v(`${T} E(${hist}) : aucune erreur JavaScript`, rien(c).length === 0, c.err.slice(0, 3));
      if (e && e.cnx && e.lien) { await L.toucher(c, c.p.locator('#cnx-test').first()); e = await pret(c, 25000); v(`${T} E(${hist}) : le retour marche aussi`, e && !e.app && e.bande && !e.cnx, e); }
      v(`${T} E(${hist}) : toujours aucune erreur JavaScript après le retour`, rien(c).length === 0, c.err.slice(0, 3)); await L.fin(c); }

    // F. rechargement refusé / sans effet : la page le DIT, et remet les choses comme avant
    if (sec('F')) for (const cas of ['jette', 'rien']) {
      let c = await ouvrir(profil, false, {}, false);
      await c.p.evaluate(k => { window.appRecharger = k === 'jette' ? () => false : () => true; }, cas);
      const h0 = await c.p.evaluate(() => location.hash);
      await L.toucher(c, c.p.locator('.rl-bande [data-apv]').first()); await c.p.waitForTimeout(cas === 'jette' ? 400 : 2200); let e = await lit(c.p);
      v(`${T} F(${cas}) : rechargement impossible → la page le dit (« ${(e.toast || e.err).slice(0, 70)} »)`, /Impossible ici/.test(e.toast + e.err) && /#lien-/.test(e.toast + e.err), e);
      v(`${T} F(${cas}) : et elle remet tout comme avant : toujours le mode test, drapeau retiré, adresse d'origine (« ${e.hash} »)`, !e.app && e.bande && e.drapeau === null && e.hash === h0, { e, h0 });
      v(`${T} F(${cas}) : aucune erreur JavaScript`, rien(c).length === 0, c.err.slice(0, 3)); await L.fin(c);
      // depuis l'application : « Revenir au mode test » refusé → dit, et on reste dans l'application
      c = await L.ouvrir({ profil, qui: null, app: false, requete: '', hash: 'lien-' + SLUG, guide: true }); await calmer(c.p); e = await pret(c, 25000);
      v(`${T} F(${cas}) : population (entré par #lien-, la connexion et son lien de retour)`, e && e.app && e.cnx && e.lien, e);
      await c.p.evaluate(k => { window.appRecharger = k === 'jette' ? () => false : () => true; }, cas);
      await L.toucher(c, c.p.locator('#cnx-test').first()); await c.p.waitForTimeout(cas === 'jette' ? 400 : 2200); e = await lit(c.p);
      v(`${T} F(${cas}) : retour impossible → l'écran le dit sous le formulaire et reste en application`, /Impossible ici/.test(e.err) && e.app && e.cnx, e);
      v(`${T} F(${cas}) : aucune erreur JavaScript`, rien(c).length === 0, c.err.slice(0, 3)); await L.fin(c);
    }

    // F'. un rechargement LENT (le serveur tarde à répondre) : la page a prévenu qu'elle part (beforeunload), elle ne doit pas se défaire avant d'être partie
    if (sec('F')) { const c = await ouvrir(profil, false, {}, false);
      await c.p.evaluate(() => { window.appRecharger = () => { window.dispatchEvent(new Event('beforeunload')); setTimeout(() => location.reload(), 2600); return true; }; });
      await L.toucher(c, c.p.locator('.rl-bande [data-apv]').first()); await c.p.waitForTimeout(2100); let e = await lit(c.p);
      v(`${T} F' : un rechargement qui a démarré mais tarde → aucun « Impossible ici », rien n'est défait (drapeau ${e.drapeau}, adresse ${e.hash})`, !/Impossible/.test(e.toast + e.err) && e.drapeau === '1' && /^#lien-/.test(e.hash), e);
      e = await pret(c, 25000); v(`${T} F' : et le rechargement arrivé, c'est bien l'application`, e && e.app && e.cnx, e);
      v(`${T} F' : aucune erreur JavaScript`, rien(c).length === 0, c.err.slice(0, 3)); await L.fin(c); }

    // G. dans un CADRE, comme claude.ai : le même chemin, la page n'est pas la fenêtre du haut
    if (sec('G')) for (const pose of [{}, { rangement: 'refuse' }, { historique: 'jette' }]) {
      const nom = Object.keys(pose)[0] ? Object.keys(pose)[0] + '=' + Object.values(pose)[0] : 'normal';
      const c = await ouvrir(profil, false, pose, true); let e = await lit(c.p);
      const cadre = await c.p.evaluate(() => { try { return window.top !== window && window.parent !== window; } catch (x) { return true; } });
      v(`${T} G(${nom}) : population (le prototype est DANS un cadre ; la bande et le bouton sont là)`, cadre && e.bande && e.bouton && !e.app, { cadre, e });
      await L.toucher(c, c.p.locator('.rl-bande [data-apv]').first()); e = await pret(c, 25000);
      v(`${T} G(${nom}) : dans le cadre, le bouton ouvre l'écran de connexion`, e && e.app && e.cnx && !e.bande && e.lien, e);
      await photo(c, `${profil}-cadre-${nom.replace(/\W/g, '')}-connexion`);
      await L.toucher(c, c.p.locator('#cnx-test').first()); e = await pret(c, 25000);
      v(`${T} G(${nom}) : dans le cadre, « Revenir au mode test » ramène la bande`, e && !e.app && e.bande && !e.cnx, e);
      v(`${T} G(${nom}) : aucune erreur JavaScript`, rien(c).length === 0, c.err.slice(0, 3)); await L.fin(c);
    }
  }

  // ── H. les deux casses du recontrôle côté page : tout `history.replaceState` nu prend son `try` ───────────────────────────
  // la technicienne ouvre une rubrique qu'elle n'a pas : la page la ramène à son accueil par history.replaceState ; sous un historique qui jette, ça jetait.
  if (sec('H')) for (const hist of ['jette', 'jette-tout']) {
    const c = await P.ouvrir({ profil: 'mac', qui: 'sm' }, { historique: hist }); await calmer(c.p); await c.p.waitForTimeout(500);
    const refus = await c.p.evaluate(() => Object.keys(vues()).filter(r => routeConnue(r) && !rlPermis(r)));
    v(`H(${hist}) : population (la technicienne a des rubriques refusées : ${refus.length})`, refus.length >= 3, refus.slice(0, 5));
    let ok = 0, rendu = 0;
    for (const r of refus.slice(0, 5)) { const e0 = c.err.length; await c.p.evaluate(x => { location.hash = x; }, r).catch(() => {}); await L.calme(c.p, 500);
      const e = await c.p.evaluate(() => ({ n: document.getElementById('contenu').innerText.length, h1: ((document.querySelector('#contenu h1') || {}).textContent || '').trim() }));
      if (c.err.length === e0) ok++; if (e.n > 60) rendu++; }
    v(`H(${hist}) : une rubrique refusée → la technicienne retombe sur son écran, sans erreur (${ok}/${Math.min(5, refus.length)}), un écran est rendu (${rendu})`, ok === Math.min(5, refus.length) && rendu === Math.min(5, refus.length), c.err.slice(0, 3));
    // les rubriques de redirection du gérant : Factures et Encaissements ré-écrivent l'adresse en passant par Comptabilité
    await L.fin(c);
    const g = await P.ouvrir({ profil: 'mac', qui: 'marc' }, { historique: hist }); await calmer(g.p); await g.p.waitForTimeout(500);
    for (const fn of ['vueFactures', 'vueEncaissements']) { const e0 = g.err.length; const r = await g.p.evaluate(n => { try { const x = window[n](); return typeof x === 'string' ? x.length : -1; } catch (e) { return 'JETTE ' + e.message; } }, fn);
      v(`H(${hist}) : ${fn}() ne jette pas sous un historique refusé`, typeof r === 'number' && g.err.length === e0, r); }
    // l'ouverture d'une page inexistante : la page choisit son ouverture, sans erreur
    const e1 = g.err.length; await g.p.evaluate(() => { location.hash = 'nexiste-pas'; }).catch(() => {}); await L.calme(g.p, 500);
    v(`H(${hist}) : une adresse inconnue → un écran du rôle, sans erreur`, g.err.length === e1 && (await g.p.evaluate(() => document.getElementById('contenu').innerText.length)) > 60, g.err.slice(0, 3));
    v(`H(${hist}) : aucune erreur JavaScript chez le gérant`, g.err.length === 0, g.err.slice(0, 3)); await L.fin(g);
  }
  await L.fermer(); const ko = L.bilan(); process.exit(ko ? 1 : 0);
})().catch(async e => { console.log('ERREUR SONDE', e); try { await L.fermer(); } catch (x) {} process.exit(2); });
