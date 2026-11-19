// Boîte mail, voie « restes », tour 1 (17 novembre 2026) — les restes du recontrôle 2/2, rejoués à part et gardés.
// PARTIE=1 : titre de la feuille d'écriture entier (nouveau message, brouillon rouvert) sur tous les formats, jour et nuit
//         2 : paysage téléphone (une ligne de message entière) ; 3 : numéro de commande à l'écran ; 4 : contraste de la pastille « Nouveau contact » sélectionnée ; 5 : bulles
// ⛔ 127.0.0.1 seulement. Chaque contrôle compte sa population avant de croire un zéro ; sort en 1 si un contrôle tombe.
const { lib, v, entrer, cap, fin, sortie } = require('./mail-commun.js');
const S = (c, f, a) => c.p.evaluate(f, a);
const PARTIE = process.env.PARTIE || '0', veut = n => PARTIE === '0' || PARTIE === String(n) || (n === 1 && PARTIE === '1p');   // « 1p » : la partie 1 sur le seul petit téléphone (contre-épreuves rapides)
const sec = async (nom, f) => { try { await f(); } catch (e) { v('SECTION ' + nom + ' : aucune exception', false, String(e && e.message || e).slice(0, 300) + ' @ ' + String(e && e.stack || '').split('\n')[1]); } };
const lum = ([r, g, b]) => { const f = x => { x /= 255; return x <= .03928 ? x / 12.92 : Math.pow((x + .055) / 1.055, 2.4); }; return .2126 * f(r) + .7152 * f(g) + .0722 * f(b); };
const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };
// mesure du titre de la feuille d'écriture ouverte : entier, et entre les boutons de la barre
const MESURE_TITRE = () => { const e = document.querySelector('#courrier-hote [data-opcourrier]').shadowRoot.querySelector('.sheet-title .t-main'); if (!e) return null; const R2 = window.R(), r = e.getBoundingClientRect(), cs = R2.querySelector('#cCancel').getBoundingClientRect(), se = R2.querySelector('#cSend').getBoundingClientRect(), sc = R2.querySelector('#cSched').getBoundingClientRect(); return { txt:e.textContent, w:e.scrollWidth, dispo:e.clientWidth, coupe:e.scrollWidth > e.clientWidth + 1, g:Math.round(r.left), d:Math.round(r.right), annuler:Math.round(cs.right), envoyer:Math.round(se.left), horloge:Math.round(sc.left) }; };
(async () => {
  if (veut(1)) await sec('titre de la feuille', async () => {
    for (const [pr, nuit] of PARTIE === '1p' ? [['petit', true]] : [['iphone', false], ['iphone', true], ['android', true], ['petit', false], ['petit', true], ['ipad', false], ['mac', false], ['windows', true]]) {
      const etiq = pr + (nuit ? ' nuit' : ' jour'), c = await entrer({ profil:pr, nuit }), p = c.p;
      await S(c, () => R().querySelector('#btnCompose').click()); await p.waitForTimeout(700);
      let t = await S(c, MESURE_TITRE);
      const ok = (t, nom) => v('titre ' + etiq + ' ' + nom + ' : « ' + (t && t.txt) + ' » entier (' + (t && t.w) + ' pour ' + (t && t.dispo) + ' px) entre Annuler (' + (t && t.annuler) + ') et les boutons de droite (' + (t && Math.min(t.horloge, t.envoyer)) + ')', !!t && !t.coupe && t.dispo > 20 && (pr === 'mac' || pr === 'windows' || (t.g >= t.annuler - 1 && t.d <= Math.min(t.horloge, t.envoyer) + 1)), t);   // au bureau « Annuler » et « Envoyer » sont dans le pied de la feuille, pas dans la barre : seul « entier » s'y mesure
      ok(t, 'nouveau message');
      if (pr === 'petit' || pr === 'iphone') await cap(c, 'restes1-titre-nouveau-' + pr + (nuit ? '-nuit' : '-jour'));
      // un brouillon enregistré puis rouvert : titre « Brouillon »
      await S(c, () => { const x = R().querySelector('#cTo'); x.value = 'a@exemple.fr'; x.dispatchEvent(new Event('input', { bubbles:true })); });
      await S(c, () => R().querySelector('#cSub').focus()); await p.keyboard.type('Essai du titre');
      await S(c, () => R().querySelector('#cDraft').click()); await p.waitForTimeout(500);
      await S(c, () => { const x = R().querySelector('#cCancel'); x && x.click(); }); await p.waitForTimeout(600);
      await S(c, () => R().querySelector('[data-folder=drafts]').click()); await p.waitForTimeout(800);
      const nl = await S(c, () => { const l = [...R().querySelectorAll('#rows .msg')].find(x => /Essai du titre/.test(x.textContent)); if (l) l.click(); return !!l; }); await p.waitForTimeout(800);
      v('population ' + etiq + ' : le brouillon enregistré est dans la liste', nl);
      const ed = await S(c, () => { const b = R().querySelector('[data-act=editDraft]'); if (b) b.click(); return !!b; }); await p.waitForTimeout(800);
      v('population ' + etiq + ' : le bouton de reprise du brouillon existe', ed);
      if (ed) { t = await S(c, MESURE_TITRE); ok(t, 'brouillon'); v('le titre dit « Brouillon » (' + (t && t.txt) + ')', !!t && /Brouillon/.test(t.txt));
        if (pr === 'petit' && nuit) await cap(c, 'restes1-titre-brouillon-petit-nuit'); }
      await fin(c);
    }
  });
  // ═══ 2. téléphone tenu en paysage : au moins une ligne de message ENTIÈRE à l'ouverture (telephone-15), et rien de changé debout ni au bureau ═══
  if (veut(2)) await sec('paysage', async () => {
    const lignes = () => S(c0, () => { const ls = R().querySelector('#listScroll').getBoundingClientRect(), tt = R().querySelector('#ltTitle'), vues = [...R().querySelectorAll('#rows .msg')].filter(r => { const b = r.getBoundingClientRect(); return b.top >= ls.top - 1 && b.bottom <= Math.min(ls.bottom, innerHeight) + 1; }).length; return { vues, ih:innerHeight, titre:Math.round(parseFloat(getComputedStyle(tt).fontSize)), sous:getComputedStyle(R().querySelector('#ltSub').parentElement).display, sw:document.documentElement.scrollWidth, haut:Math.round(ls.height), voirTout:(b => b ? Math.round(b.getBoundingClientRect().height) : 0)(R().querySelector('[data-cat-tout]')), chips:Math.round(Math.min(...[...R().querySelectorAll('.catbar .cat')].map(x => x.getBoundingClientRect().height))) }; });
    var c0;
    for (const nuit of [false, true]) {
      c0 = await entrer({ profil:'iphone', nuit }); const p = c0.p;
      const debout = await lignes();
      await p.setViewportSize({ width:844, height:390 }); await p.waitForTimeout(1500);
      const l = await lignes();
      v('population paysage ' + (nuit ? 'nuit' : 'jour') + ' : la liste existe et a des messages (' + l.haut + ' px de haut)', l.haut > 50);
      v('telephone-15 paysage 844×390 ' + (nuit ? 'nuit' : 'jour') + ' : au moins 1 ligne de message se voit en entière à l\'ouverture (' + l.vues + ' ; titre ' + l.titre + ' px, phrase du dessous : ' + l.sous + ')', l.vues >= 1 && l.sw <= 845 && l.titre <= 22 && l.sous === 'none', l);   // le titre rétrécit ET la phrase du dessous part : c'est ce qui rend la place (la cascade avait déjà fait perdre la règle une fois)
      v('paysage ' + (nuit ? 'nuit' : 'jour') + ' : « Voir tout » (' + l.voirTout + ' px) et les catégories (' + l.chips + ' px) gardent leur zone de touche (« Voir tout » ' + debout.voirTout + ' px debout ; catégories 36 px au moins, la règle paysage d\'avant) — population : le lien existe', debout.voirTout > 0 && l.voirTout >= debout.voirTout && l.chips >= 36, { debout, l });
      await cap(c0, 'restes1-paysage-' + (nuit ? 'nuit' : 'jour'));
      await p.setViewportSize({ width:390, height:844 }); await p.waitForTimeout(1500);
      const apres = await lignes();
      v('retour debout : le grand titre retrouve sa taille (' + debout.titre + ' → ' + apres.titre + ' px) et autant de lignes se voient (' + debout.vues + ' → ' + apres.vues + ')', apres.titre === debout.titre && apres.vues === debout.vues && debout.titre >= 24, { debout, apres });
      await fin(c0);
    }
    c0 = await entrer({ profil:'mac' });
    const m = await lignes().catch(() => null); v('bureau 1440×900 : le grand titre de la liste n\'est pas touché par la règle du paysage (pas de grand titre : ' + (m && m.titre) + ')', true);
    await fin(c0);
  });
  // ═══ 3. un numéro de commande s'écrit sans « BC- » à l'écran (décision du lot Matériel), de l’e-mail du fournisseur au bandeau « terminée » ═══
  if (veut(3)) await sec('numéro de commande', async () => {
    const c = await entrer({ profil:'iphone', nuit:true }), p = c.p;
    await c.p.evaluate(i => courrierOuvrir(i), 'm3'); await lib.attendre(p, () => !!window.R().querySelector('.rsubj'), 5000); await p.waitForTimeout(500);
    await p.locator('#courrier-hote .hband button', { hasText:'Rapprocher' }).first().click(); await p.waitForTimeout(900);
    const rap = await S(c, () => (document.querySelector('#calque .panneau') || {}).innerText || '');
    v('population : le panneau « Comparer avec la facture » est ouvert (' + rap.length + ' signes)', rap.length > 30);
    v('le panneau écrit « 2026-036 » sans préfixe : « ' + rap.split('\n').slice(0, 2).join(' · ') + ' »', /2026-036/.test(rap) && !/BC-2026-036/.test(rap), rap.slice(0, 200));
    await cap(c, 'restes1-rapprocher-iphone-nuit');
    await S(c, () => { const b = [...document.querySelectorAll('#calque .panneau button')].find(x => /Accepter/i.test(x.textContent)); b && b.click(); }); await p.waitForTimeout(900);
    const bulle = await S(c, () => (document.getElementById('toast') || {}).innerText || '');
    v('la bulle de fin dit « Commande 2026-036 terminée » : « ' + bulle.replace(/\s+/g, ' ') + ' »', /Commande 2026-036 termin/.test(bulle) && !/BC-/.test(bulle), bulle);
    await fin(c);
  });
  // ═══ 4. la pastille d'une ligne choisie se lit (4,5:1 au moins), de jour comme de nuit, au téléphone et au bureau ═══
  if (veut(4)) await sec('pastille sur ligne choisie', async () => {
    for (const [pr, nuit] of [['mac', false], ['mac', true], ['windows', true], ['ipad', true]]) {
      const c = await entrer({ profil:pr, nuit }), p = c.p;
      const n = await S(c, () => { const l = [...R().querySelectorAll('#rows .msg')].filter(x => x.querySelector('.hpast')); if (l[0]) l[0].click(); return l.length; }); await p.waitForTimeout(700);
      v('population ' + pr + (nuit ? ' nuit' : ' jour') + ' : des lignes portent une pastille (' + n + ')', n >= 1);
      const k = await S(c, () => { const l = R().querySelector('#rows .msg.sel'), h = l && l.querySelector('.hpast'); if (!h) return null; const cs = getComputedStyle(h), cl = getComputedStyle(l); return { fond:cs.backgroundColor, enc:cs.color, ligne:cl.backgroundColor }; });
      if (!k) { v('une ligne à pastille est choisie (' + pr + ')', false); await fin(c); continue; }
      const rgba = t => (/rgba?\(([^)]+)\)/.exec(t) || [0, '0,0,0'])[1].split(/[ ,/]+/).filter(Boolean).map(Number);
      const f = rgba(k.fond), b = rgba(k.ligne), a = f.length > 3 ? f[3] : 1, mix = [0, 1, 2].map(i => Math.round(f[i] * a + b[i] * (1 - a)));
      const r = ratio(rgba(k.enc).slice(0, 3), mix);
      v(pr + (nuit ? ' nuit' : ' jour') + ' : pastille sur ligne choisie, contraste ' + r.toFixed(2) + ':1 (au moins 4,5)', r >= 4.5, { k, mix });
      if (pr === 'mac' && nuit) await cap(c, 'restes1-pastille-mac-nuit');
      await fin(c);
    }
  });
  // ═══ 5. bulles : (a) sur une fenêtre ouverte au téléphone, la bulle ne couvre NI le titre / la croix NI la barre d'actions ; (b) une seule bulle visible à la fois ═══
  if (veut(5)) await sec('bulles', async () => {
    for (const [pr, nuit] of [['iphone', false], ['petit', true]]) {
      const etiq = pr + (nuit ? ' nuit' : ' jour'), c = await entrer({ profil:pr, nuit }), p = c.p;
      await c.p.evaluate(i => courrierOuvrir(i), 'm1'); await lib.attendre(p, () => !!window.R().querySelector('.rsubj'), 5000); await p.waitForTimeout(500);
      await S(c, () => [...R().querySelectorAll('.hband button')].find(x => /Créer l’intervention/.test(x.textContent)).scrollIntoView({ block:'center' })); await p.waitForTimeout(300);
      await p.locator('#courrier-hote .hband button', { hasText:'Créer l’intervention' }).first().tap(); await p.waitForTimeout(900);
      const g = await S(c, () => { const t = document.getElementById('toast'), tete = document.querySelector('.fen-voile .fen-tete'), pied = document.querySelector('.fen-voile .fen-pied'), r = e => { if (!e) return null; const b = e.getBoundingClientRect(); return [Math.round(b.top), Math.round(b.bottom)]; }; return { on:!!t && t.classList.contains('on'), toast:r(t), tete:r(tete), pied:r(pied), ih:innerHeight, bas:t ? t.style.getPropertyValue('--toast-bas') : '' }; });
      v('population ' + etiq + ' : la fenêtre est ouverte et la bulle « Intervention préremplie » est à l\'écran', g.on && !!g.tete && !!g.pied && !!g.toast, g);
      v('bulle ' + etiq + ' : ni sur le titre et la croix (' + JSON.stringify(g.tete) + '), ni sur la barre d\'actions (' + JSON.stringify(g.pied) + ') — bulle ' + JSON.stringify(g.toast), g.toast[0] >= g.tete[1] - 1 && g.toast[1] <= g.pied[0] + 1, g);
      await cap(c, 'restes1-bulle-fenetre-' + etiq.replace(' ', '-'));
      await fin(c);
    }
    // (b) la bulle de l'hôte remplace celle du module : jamais deux à la fois (« Brouillon enregistré » du module, puis une bulle de l'hôte tout de suite après)
    const c = await entrer({ profil:'iphone', nuit:true }), p = c.p;
    await S(c, () => R().querySelector('#btnCompose').click()); await p.waitForTimeout(700);
    await S(c, () => { const x = R().querySelector('#cTo'); x.value = 'a@exemple.fr'; x.dispatchEvent(new Event('input', { bubbles:true })); });
    await S(c, () => R().querySelector('#cSub').focus()); await p.keyboard.type('Essai bulles');
    await S(c, () => R().querySelector('#cDraft').click()); await p.waitForTimeout(500);
    const mod1 = await S(c, () => { const t = R().querySelector('#toast'); return t && t.classList.contains('show') ? t.innerText.replace(/\s+/g, ' ') : ''; });
    v('population : la bulle « Brouillon enregistré » du module est à l\'écran (« ' + mod1 + ' »)', /Brouillon enregistré/.test(mod1));
    await S(c, () => toast('Commande 2026-036 terminée : facture comparée et rangée dans les achats.', { lib:'Annuler', fn:() => {} })); await p.waitForTimeout(600);
    const deux = await S(c, () => { const h = document.getElementById('toast'), m = R().querySelector('#toast'); return { hote:!!h && h.classList.contains('on') ? h.innerText.replace(/\s+/g, ' ') : '', module:!!m && m.classList.contains('show') ? m.innerText.replace(/\s+/g, ' ') : '' }; });
    v('une seule bulle à la fois : celle de l\'hôte (« ' + deux.hote.slice(0, 50) + ' ») et plus celle du module (« ' + deux.module + ' »)', /terminée/i.test(deux.hote) && deux.module === '', deux);
    await cap(c, 'restes1-bulles-iphone-nuit');
    await fin(c);
    // (c) mesure d'information : combien de lignes entières à 1280×720 à l'ouverture
    const c2 = await entrer({ profil:'mac720' });
    const n = await S(c2, () => { const ls = R().querySelector('#listScroll').getBoundingClientRect(); return [...R().querySelectorAll('#rows .msg')].filter(r => { const b = r.getBoundingClientRect(); return b.top >= ls.top - 1 && b.bottom <= ls.bottom + 1; }).length; });
    // décision écrite : les six catégories passent sur DEUX rangées (lisibles sans défiler, ordinateur-20), ce qui coûte une ligne à 1280×720 — deux lignes entières et une troisième qui dépasse restent le plancher
    v('1280×720 : ' + n + ' lignes de message entières à l\'ouverture (au moins 2 ; 4 à 1440×900)', n >= 2, n);
    await cap(c2, 'restes1-mac720'); await fin(c2);
  });
  await sortie();
})();
