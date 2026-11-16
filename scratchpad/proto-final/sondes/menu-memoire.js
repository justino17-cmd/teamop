// Les routes ne changent pas : on pose les ANCIENNES valeurs des clés opg_proto_* (barre personnalisée d'avant, session, mode, vues) et
// des adresses d'avant (#boxes, #factures, #clientvoit, une adresse qui n'existe pas), et rien ne doit casser (MENU-FINAL.md).
const { L, lireMenu } = require('./menu-commun.js'), v = L.v;
(async () => {
  // 1. une barre personnalisée d'AVANT : « Plus », « Ce que voit le client », un mot qui n'existe plus
  { const init = () => { try { localStorage.setItem('opg_proto_barre', JSON.stringify(['accueil', 'clientvoit', 'plus', 'planning', 'disparue'])); localStorage.setItem('opg_proto_vues', '[]'); localStorage.setItem('opg_proto_mode', 'nuit'); } catch (e) {} };
    const c = await L.ouvrir({ profil:'iphone', qui:'marc', init });
    const b = await c.p.evaluate(() => [...document.querySelectorAll('#barre-bas .opg-tab .t-n')].map(e => e.textContent.trim()));
    v('barre d\'avant (Plus, clientvoit, inconnue) : les rubriques disparues sont retirées, les autres gardées', b.join('|') === 'Accueil|Planning', b);
    v('barre d\'avant : plus d\'onglet « Plus »', !b.includes('Plus'));
    const mode = await c.p.evaluate(() => document.documentElement.dataset.mode); v('le choix Nuit se retient d\'une ouverture à l\'autre', mode === 'nuit', mode);
    v('barre d\'avant : aucune erreur JavaScript', c.err.length === 0, c.err.slice(0, 2)); await L.fin(c); }
  { const init = () => { try { localStorage.setItem('opg_proto_barre', JSON.stringify(['plus'])); } catch (e) {} };
    const c = await L.ouvrir({ profil:'iphone', qui:'marc', init });
    const b = await c.p.evaluate(() => [...document.querySelectorAll('#barre-bas .opg-tab .t-n')].map(e => e.textContent.trim()));
    v('barre d\'avant réduite à « Plus » : retour à la barre de tout le monde', b.join('|') === 'Accueil|Planning|Interventions|Clients|Comptabilité', b); await L.fin(c); }
  // 2. la barre se personnalise toujours (pied de la feuille Menu), et se retient
  { const c = await L.ouvrir({ profil:'iphone', qui:'marc' }); await L.toucher(c, '#contenu .tt-menu');
    await c.p.evaluate(() => document.querySelector('#calque [data-mabarre="~ouvrir"]').scrollIntoView({ block:'center' })); const ok = await L.toucher(c, '#calque [data-mabarre="~ouvrir"]'); v('« Personnaliser la barre du bas » (pied de la feuille) ouvre « Ma barre »', ok && /Ma barre/.test(await c.p.evaluate(() => (document.querySelector('#calque h2') || {}).textContent)));
    const nb = await c.p.evaluate(() => document.querySelectorAll('#calque [data-mabarre^="~"]').length + ' / ' + [...document.querySelectorAll('#calque .mb-l b')].map(e => e.textContent).join('|'));
    v('« Ma barre » liste les lignes du menu (sans « Plus »)', !/Plus \(/.test(nb) && /Accueil/.test(nb) && /Dépôts et camions/.test(nb), nb);
    await c.p.evaluate(() => mbBasculer('comptabilite')); await c.p.evaluate(() => mbBasculer('stock')); await L.ranger(c.p);
    const b = await c.p.evaluate(() => [...document.querySelectorAll('#barre-bas .opg-tab .t-n')].map(e => e.textContent.trim())); v('« Ma barre » : on retire Comptabilité, on met Stock', b.join('|') === 'Accueil|Planning|Interventions|Clients|Stock', b);
    const rt = await c.p.evaluate(() => localStorage.getItem('opg_proto_barre')); v('le choix est rangé sur l\'appareil sous la même clé', /stock/.test(rt || ''), rt);
    await L.fin(c); }
  // 3. les adresses d'avant
  for (const [qui, adresse, h1, on] of [['marc', 'boxes', 'Dépôts et camions', 'Dépôts et camions'], ['marc', 'factures', 'Comptabilité', 'Comptabilité'], ['marc', 'encaissements', 'Comptabilité', 'Comptabilité'], ['marc', 'clientvoit', 'Ce que voit le client', 'Interventions'], ['marc', 'accueil', null, 'Accueil'], ['sm', 'inter-x-i1', null, 'Ma journée']]) {
    const c = await L.ouvrir({ profil:'mac', qui, hash:adresse }); await L.calme(c.p, 600);
    const e = await c.p.evaluate(() => ({ h1:(document.querySelector('#contenu h1') || {}).textContent, on:(document.querySelector('#menu a.on .m-n') || {}).textContent, hash:location.hash, toast:((document.getElementById('toast') || {}).textContent || '').trim() }));
    v(`${qui} : l'adresse d'avant #${adresse} marche encore${h1 ? ' (« ' + h1 + ' »)' : ''}, ligne « ${on} » surlignée`, (!h1 || e.h1 === h1) && e.on === on, e); await L.fin(c); }
  // 4. une adresse qui n'existe pas : l'écran d'ouverture du rôle, avec « Cette page n'existe pas. »
  for (const [qui, ouverture] of [['marc', '#accueil'], ['julie', '#comptabilite'], ['sm', '#majournee']]) {
    const c = await L.ouvrir({ profil:'mac', qui, hash:'rien-du-tout' }); await L.calme(c.p, 700);
    const e = await c.p.evaluate(() => ({ hash:location.hash, toast:((document.getElementById('toast') || {}).textContent || '').trim(), vue:(document.querySelector('#contenu h1') || {}).textContent, refaire:/À refaire|On la refait/.test(document.body.innerText) }));
    v(`${qui} : #rien-du-tout → ${ouverture} avec « Cette page n'existe pas. »`, e.hash === ouverture && /Cette page n[’']existe pas\./.test(e.toast) && !e.refaire, e); await L.fin(c); }
  { const c = await L.ouvrir({ profil:'mac', qui:'marc' }); await L.aller(c.p, 'page-fantome'); await L.calme(c.p, 500);
    const e = await c.p.evaluate(() => ({ hash:location.hash, refaire:/À refaire/.test(document.body.innerText) })); v('marc : aller() sur une route fantôme revient à l\'accueil, sans écran « À refaire »', e.hash === '#accueil' && !e.refaire, e); await L.fin(c); }
  // 5. la session et le mode retenus : on rouvre sans ?auto, la session gardée ouvre le même compte ; le mode choisi reste
  { const c = await L.ouvrir({ profil:'mac', qui:'marc' });
    await c.p.evaluate(() => { ESPACE = ESPACE_SLUG; cnxGarder(); });   // l'appareil est relié à l'entreprise (ce que fait le lien de connexion)
    const k = await c.p.evaluate(() => ({ s:localStorage.getItem('opg_proto_session') })); v('la session est rangée', k.s === 'marc', k);
    await L.toucher(c, '#menu [data-modetheme="nuit"]'); const m1 = await c.p.evaluate(() => localStorage.getItem('opg_proto_mode')); v('choisir Nuit le range', m1 === 'nuit', m1);
    await c.p.goto(c.p.url().replace(/&auto=\w+/, ''), { waitUntil:'load' }); await L.attendre(c.p, () => !!SESSION, 9000); await c.p.waitForTimeout(600);
    const e = await c.p.evaluate(() => ({ mode:document.documentElement.dataset.mode, pressed:(document.querySelector('#menu [data-modetheme][aria-pressed="true"]') || {}).textContent, qui:SESSION })); v('rouvert : Nuit retenu, session retenue', e.mode === 'nuit' && e.pressed === 'Nuit' && e.qui === 'marc', e);
    await c.p.evaluate(() => { document.querySelector('[data-modetheme="auto"]').click(); }); const m2 = await c.p.evaluate(() => localStorage.getItem('opg_proto_mode')); v('choisir Auto le range aussi', m2 === 'auto', m2);
    v('aucune erreur JavaScript', c.err.length === 0, c.err.slice(0, 2)); await L.fin(c); }
  await L.fermer(); const ko = L.bilan(); process.exit(ko ? 1 : 0);
})();
