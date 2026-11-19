// RELECTURE ADVERSE du lot « menu », angle TÉLÉPHONE, 2e sonde : « Personnaliser la barre du bas » (choisir 5, 6e refusée, barre d'origine,
// retenue au rechargement, appui long SANS naviguer, noms longs à 320 px) et Jour / Nuit / Auto retenu après rechargement.
// Variables : PROFILS=iphone,petit  CAP=dossier
const L = require('../lib.js'), v = L.v;
const CAP = process.env.CAP || '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/relire-menu-telephone';
const PROFILS = (process.env.PROFILS || 'iphone,android,petit').split(',');
const lireBarre = p => p.evaluate(() => [...document.querySelectorAll('#barre-bas .opg-tab')].map(t => ({ mot:t.querySelector('.t-n').textContent.trim(), k:t.dataset.tab, aria:t.getAttribute('aria-label'),
  coupe:t.querySelector('.t-n').scrollWidth > t.querySelector('.t-n').clientWidth + 0.5, lignes:Math.round(t.querySelector('.t-n').getBoundingClientRect().height / (parseFloat(getComputedStyle(t.querySelector('.t-n')).lineHeight) || 12)), l:Math.round(t.getBoundingClientRect().width), h:Math.round(t.getBoundingClientRect().height),
  chev:(() => { const s = t.querySelector('.t-n').getBoundingClientRect(), n = t.nextElementSibling; return !!n && s.right > n.getBoundingClientRect().left + 0.5; })() })));
const panneau = p => p.evaluate(() => { const P = document.querySelector('#calque .panneau'); if (!P) return null; return { titre:(P.querySelector('h2') || {}).textContent, dit:(P.querySelector('.mb-dit') || {}).textContent, non:!!P.querySelector('.mb-dit.non'),
  lignes:[...P.querySelectorAll('.mb-l')].map(b => ({ k:b.dataset.mabarre, nom:b.querySelector('b').textContent, on:b.classList.contains('on'), n:b.querySelector('i').textContent, h:Math.round(b.getBoundingClientRect().height) })), larg:P.scrollWidth - P.clientWidth }; });
async function ouvrirMaBarre(c) { await L.aller(c.p, 'accueil'); await L.toucher(c, '#contenu .tt-menu');
  await c.p.evaluate(() => { const b = document.querySelector('#calque .panneau [data-mabarre="~ouvrir"]'); if (b) b.scrollIntoView({ block:'center' }); });
  const ok = await L.toucher(c, '#calque .panneau [data-mabarre="~ouvrir"]'); await L.calme(c.p, 400); return ok; }
// appui long RÉEL au doigt (CDP) sur un onglet de la barre
async function appuiLong(c, k, ms) { const r = await c.p.evaluate(k => { const t = document.querySelector(`#barre-bas .opg-tab[data-tab="${k}"]`).getBoundingClientRect(); return { x:t.left + t.width / 2, y:t.top + t.height / 2 }; }, k);
  const cdp = await c.ctx.newCDPSession(c.p); await cdp.send('Input.dispatchTouchEvent', { type:'touchStart', touchPoints:[{ x:r.x, y:r.y }] }); await c.p.waitForTimeout(ms);
  await cdp.send('Input.dispatchTouchEvent', { type:'touchEnd', touchPoints:[] }); await L.calme(c.p, 500); }

(async () => {
  for (const profil of PROFILS) {
    const tag = profil; console.log('\n##', tag);
    const c = await L.ouvrir({ profil, nuit:false, qui:'marc' });
    const base = await lireBarre(c.p); v(`${tag} : la barre d'origine a 5 onglets`, base.length === 5, base.map(b => b.mot));
    // 1. ouvrir « Ma barre » depuis le pied de la feuille
    v(`${tag} : « Personnaliser la barre du bas » ouvre le panneau`, await ouvrirMaBarre(c));
    let P = await panneau(c.p); if (!v(`${tag} : le panneau est là`, !!P)) { await L.fin(c); continue; }
    await L.capture(c, `${CAP}/mabarre-${tag}.png`);
    // 21 lignes depuis le menu final : les 21 rubriques du gérant (MENU-FINAL.md, balise lignes-gerant) ; la sonde en attendait 19 avant que « Dépôts et camions » et « Temps de travail » rejoignent le menu
    v(`${tag} : 21 lignes proposées, 5 choisies, numérotées 1 à 5`, P.lignes.length === 21 && P.lignes.filter(l => l.on).map(l => l.n).join('') === '12345', { n:P.lignes.length, on:P.lignes.filter(l => l.on).map(l => l.k + l.n) });
    v(`${tag} : le panneau dit « 5 sur 5 choisis »`, /5 sur 5/.test(P.dit), P.dit);
    v(`${tag} : les lignes font ≥ 44 px et le panneau ne glisse pas`, P.lignes.every(l => l.h >= 44) && P.larg <= 1, { min:Math.min(...P.lignes.map(l => l.h)), larg:P.larg });
    // 2. une 6e est refusée, avec le mot
    const non = P.lignes.find(l => !l.on).k;
    await c.p.evaluate(k => document.querySelector(`#calque .panneau [data-mabarre="${k}"]`).scrollIntoView({ block:'center' }), non); await L.toucher(c, `#calque .panneau [data-mabarre="${non}"]`);
    P = await panneau(c.p); v(`${tag} : une 6e ligne est refusée et le dit`, P.non && /5 boutons au maximum/.test(P.dit) && P.lignes.filter(l => l.on).length === 5, P.dit);
    // 3. retirer « Clients », mettre « Statistiques » à la place → il passe en dernier, la barre derrière suit
    await c.p.evaluate(() => document.querySelector('#calque .panneau [data-mabarre="clients"]').scrollIntoView({ block:'center' })); await L.toucher(c, '#calque .panneau [data-mabarre="clients"]');
    await c.p.evaluate(() => document.querySelector('#calque .panneau [data-mabarre="statistiques"]').scrollIntoView({ block:'center' })); await L.toucher(c, '#calque .panneau [data-mabarre="statistiques"]');
    P = await panneau(c.p); const ordre = P.lignes.filter(l => l.on).sort((a, b) => a.n - b.n).map(l => l.k);
    v(`${tag} : Clients retiré, Statistiques ajouté en dernier`, ordre.join() === 'accueil,planning,interventions,comptabilite,statistiques', ordre);
    // 4. retirer jusqu'à 1 : le dernier est refusé
    // 5. Terminé : la barre suit, mots entiers
    await L.toucher(c, '#calque .panneau [data-mabarre="~ok"]');
    let B = await lireBarre(c.p); v(`${tag} : la barre suit le choix, dans l'ordre`, B.map(b => b.k).join() === 'accueil,planning,interventions,comptabilite,statistiques', B.map(b => b.k));
    v(`${tag} : « Statistiques » tient entier (pas coupé)`, B.every(b => !b.coupe && !b.chev && b.lignes <= 1), B);
    await L.capture(c, `${CAP}/barre-perso-${tag}.png`);
    // 6. rechargement : le choix est retenu
    await c.p.reload({ waitUntil:'load' }); await c.p.waitForTimeout(2400); await c.p.evaluate(() => { const b = document.querySelector('#nv [data-nv="fermer"]'); if (b) b.click(); }); await L.calme(c.p, 400);
    B = await lireBarre(c.p); v(`${tag} : après rechargement la barre est la même`, B.map(b => b.k).join() === 'accueil,planning,interventions,comptabilite,statistiques', B.map(b => b.k));
    // 7. appui long au doigt : ouvre « Ma barre », ne navigue PAS, ne coche rien
    await L.aller(c.p, 'planning'); const avant = await panneau(c.p); const hashAvant = await c.p.evaluate(() => location.hash);
    await appuiLong(c, 'interventions', 800);
    P = await panneau(c.p); const h2 = await c.p.evaluate(() => location.hash);
    v(`${tag} : l'appui long sur la barre ouvre « Ma barre »`, !!P && P.titre === 'Ma barre', P && P.titre);
    v(`${tag} : l'appui long ne navigue pas (reste sur ${hashAvant}) et ne coche rien`, h2 === hashAvant && !!P && P.lignes.filter(l => l.on).map(l => l.k).sort().join() === 'accueil,comptabilite,interventions,planning,statistiques' && !P.non, { h2, on:P && P.lignes.filter(l => l.on).map(l => l.k) });
    // 8. barre d'origine
    if (P) { await L.toucher(c, '#calque .panneau [data-mabarre="~defaut"]'); P = await panneau(c.p); B = await lireBarre(c.p);
      v(`${tag} : « Barre d'origine » remet Accueil · Planning · Interventions · Clients · Comptabilité`, B.map(b => b.k).join() === 'accueil,planning,interventions,clients,comptabilite' && /origine/.test(P.dit), { B:B.map(b => b.k), dit:P.dit });
      await L.toucher(c, '#calque .panneau [data-mabarre="~ok"]'); }
    // 9. les NOMS LONGS dans la barre à 5 : chaque ligne du menu, mise dans une barre de cinq, ne doit être ni coupée ni abrégée à point
    const cles = (await panneau(await (async () => { await ouvrirMaBarre(c); return c.p; })())).lignes.map(l => l.k); await L.ranger(c.p);
    const lots = []; for (let i = 0; i < cles.length; i += 5) lots.push(cles.slice(i, i + 5)); if (lots.length > 1 && lots[lots.length - 1].length < 5) lots[lots.length - 1] = cles.slice(-5);
    for (const lot of lots) { await c.p.evaluate(l => { mbEcrire(l); rendre(); }, lot); await L.calme(c.p, 400); B = await lireBarre(c.p);
      v(`${tag} : barre « ${lot.join(', ')} » : mots entiers, sans point, une ligne, jamais coupés`, B.length === lot.length && B.every(b => !b.coupe && !b.chev && b.lignes <= 1 && !/\.|…/.test(b.mot) && b.l >= 44 && b.h >= 44), B.map(b => `${b.mot}(${b.l}×${b.h}${b.coupe ? ' COUPÉ' : ''}${b.lignes > 1 ? ' ' + b.lignes + ' lignes' : ''})`));
      if (profil === 'petit') await L.capture(c, `${CAP}/barre-lot-${lots.indexOf(lot)}-${tag}.png`); }
    await c.p.evaluate(() => { mbEcrire(null); rendre(); });
    v(`${tag} : aucune erreur JavaScript`, c.err.length === 0, c.err.slice(0, 3));
    await L.fin(c);
  }
  await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})();
