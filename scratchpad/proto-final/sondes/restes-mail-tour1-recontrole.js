// Boîte mail — recontrôle ADVERSE des restes (tour 1), 17 novembre 2026 : ce que les corrections du tour 1 ont cassé À CÔTÉ.
// PARTIE=1 : la pastille d'une ligne choisie sur TÉLÉPHONE (la ligne reste « choisie » quand on revient de la lecture) et sur iPad, jour et nuit
//         2 : le paysage sur tous les téléphones (iPhone 844×390, Android 740×360, petit 568×320) : rien ne se chevauche, titre, ligne entière
//         3 : la feuille d'écriture qui tourne (debout → paysage → debout) : le titre se REMESURE
//         4 : le clavier ouvert (fenêtre de 420 px de haut, téléphone debout) : la liste ne saute pas
//         5 : bulles : texte long + bouton, fenêtre ouverte, deux rôles ; la bulle d'« Annuler l'envoi » reste devant celle de l'hôte
// ⛔ 127.0.0.1 seulement. Chaque contrôle compte sa population avant de croire un zéro ; sort en 1 si un contrôle tombe.
const { lib, v, entrer, cap, fin, sortie } = require('./mail-commun.js');
const S = (c, f, a) => c.p.evaluate(f, a);
const PARTIE = process.env.PARTIE || '0', veut = n => PARTIE === '0' || PARTIE === String(n);
const sec = async (nom, f) => { try { await f(); } catch (e) { v('SECTION ' + nom + ' : aucune exception', false, String(e && e.message || e).slice(0, 300) + ' @ ' + String(e && e.stack || '').split('\n')[1]); } };
const lum = ([r, g, b]) => { const f = x => { x /= 255; return x <= .03928 ? x / 12.92 : Math.pow((x + .055) / 1.055, 2.4); }; return .2126 * f(r) + .7152 * f(g) + .0722 * f(b); };
const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };
const rgba = t => (/rgba?\(([^)]+)\)/.exec(t) || [0, '0,0,0'])[1].split(/[ ,/]+/).filter(Boolean).map(Number);
// le fond RÉEL d'un élément : on remonte ses ancêtres en composant (transparent → on continue), jusqu'au blanc de la page
const FOND = () => { const cmp = (f, b) => { const a = f.length > 3 ? f[3] : 1; return [0, 1, 2].map(i => f[i] * a + b[i] * (1 - a)); }; return cmp; };
const LIGNE_PASTILLE = () => { const R2 = window.R(), l = R2.querySelector('#rows .msg.sel'), h = l && l.querySelector('.hpast'); if (!h) return null;
  const pile = []; for (let e = h; e; e = e.parentElement || (e.getRootNode && e.getRootNode().host)) { pile.push(getComputedStyle(e).backgroundColor); if (e.tagName === 'BODY') break; }
  return { fond:getComputedStyle(h).backgroundColor, enc:getComputedStyle(h).color, pile }; };
const lisible = k => { const comp = (f, b) => { const a = f.length > 3 ? f[3] : 1; return [0, 1, 2].map(i => f[i] * a + b[i] * (1 - a)); };
  let sous = [255, 255, 255]; for (let i = k.pile.length - 1; i >= 1; i--) sous = comp(rgba(k.pile[i]), sous);   // du plus haut ancêtre jusqu'au parent de la pastille
  const mix = comp(rgba(k.fond), sous); return ratio(rgba(k.enc).slice(0, 3), mix); };
(async () => {
  // ═══ 1. la pastille d'une ligne choisie : sur téléphone la ligne reste « choisie » au retour de la lecture, mais son fond n'est PAS bleu ═══
  if (veut(1)) await sec('pastille', async () => {
    for (const [pr, nuit] of [['iphone', false], ['iphone', true], ['android', false], ['petit', false], ['ipad', false], ['ipad', true]]) {
      const etiq = pr + (nuit ? ' nuit' : ' jour'), c = await entrer({ profil:pr, nuit }), p = c.p;
      const n = await S(c, () => { const ls = [...R().querySelectorAll('#rows .msg')]; const i = ls.findIndex(x => x.querySelector('.hpast')); if (i >= 0) ls[i].click(); return { total:ls.length, avec:ls.filter(x => x.querySelector('.hpast')).length }; }); await p.waitForTimeout(900);
      v('population ' + etiq + ' : des lignes portent une pastille (' + n.avec + ' sur ' + n.total + ')', n.avec >= 1, n);
      if (pr === 'iphone' || pr === 'android' || pr === 'petit') {   // téléphone : on est dans la lecture, on revient à la liste par le bouton de retour de l'écran
        const lu = await S(c, () => !!R().querySelector('.rsubj')); v('population ' + etiq + ' : la lecture s\'est ouverte', lu);
        await S(c, () => { const b = R().querySelector('#btnBack'); if (b) b.click(); }); await p.waitForTimeout(1200);   // le « flash » de la ligne retrouvée est fini
      }
      const k = await S(c, LIGNE_PASTILLE);
      if (!k) { v('population ' + etiq + ' : une ligne choisie porte sa pastille', false); await fin(c); continue; }
      const r = lisible(k);
      v(etiq + ' : pastille de la ligne choisie, contraste ' + r.toFixed(2) + ':1 (au moins 4,5)', r >= 4.5, k);
      await cap(c, '../restes1r/pastille-' + pr + (nuit ? '-nuit' : '-jour'));
      await fin(c);
    }
  });
  // ═══ 1b. iPad TENU EN PAYSAGE (deux colonnes, la ligne choisie est bleue) : la pastille s'y lit aussi, jour et nuit ═══
  if (veut(1)) await sec('pastille ipad paysage', async () => {
    for (const nuit of [false, true]) {
      const etiq = 'ipad paysage 1180×820' + (nuit ? ' nuit' : ' jour'), c = await entrer({ profil:'ipad', nuit }), p = c.p;
      await p.setViewportSize({ width:1180, height:820 }); await p.waitForTimeout(1500);
      const n = await S(c, () => { const ls = [...R().querySelectorAll('#rows .msg')], i = ls.findIndex(x => x.querySelector('.hpast')); if (i >= 0) ls[i].click(); return ls.filter(x => x.querySelector('.hpast')).length; }); await p.waitForTimeout(900);
      v('population ' + etiq + ' : des lignes portent une pastille (' + n + ')', n >= 1);
      const k = await S(c, LIGNE_PASTILLE); if (!k) { v('population ' + etiq + ' : une ligne choisie porte sa pastille', false); await fin(c); continue; }
      const r = lisible(k); v(etiq + ' : pastille de la ligne choisie, contraste ' + r.toFixed(2) + ':1 (au moins 4,5)', r >= 4.5, k);
      await cap(c, '../restes1r/pastille-ipad-paysage' + (nuit ? '-nuit' : '-jour')); await fin(c);
    }
  });
  // ═══ 2. paysage sur chaque téléphone : le grand titre ne mord pas la recherche, l'encart ne mord pas les catégories, les lignes ne sortent pas du cadre ═══
  if (veut(2)) await sec('paysage', async () => {
    for (const [pr, w, h, nuit] of [['android', 740, 360, false], ['android', 740, 360, true], ['petit', 568, 320, false], ['petit', 568, 320, true], ['iphone', 844, 390, false]]) {
      const etiq = pr + (nuit ? ' nuit' : ' jour') + ' ' + w + '×' + h, c = await entrer({ profil:pr, nuit }), p = c.p;
      await p.setViewportSize({ width:w, height:h }); await p.waitForTimeout(1600);
      const m = await S(c, () => { const R2 = window.R(), r = s => { const e = R2.querySelector(s); if (!e) return null; const b = e.getBoundingClientRect(); return { t:Math.round(b.top), b:Math.round(b.bottom), l:Math.round(b.left), r:Math.round(b.right), h:Math.round(b.height) }; };
        const ls = R2.querySelector('#listScroll').getBoundingClientRect(), lignes = [...R2.querySelectorAll('#rows .msg')];
        const entieres = lignes.filter(x => { const b = x.getBoundingClientRect(); return b.top >= ls.top - 1 && b.bottom <= ls.bottom + 1; }).length;
        const tt = R2.querySelector('.list .large-title'), rg = document.createRange(); rg.selectNodeContents(tt); const tb = rg.getBoundingClientRect();   // le TEXTE du titre : sa boîte, elle, est plus haute que ses lettres
        const ordre = [{ t:Math.round(tb.top), b:Math.round(tb.bottom), l:Math.round(tb.left), r:Math.round(tb.right), h:Math.round(tb.height) }, ...['.search, .searchbar, input[type=search]', '.catbar', '.rangeail'].map(s => r(s))];
        return { w:innerWidth, sw:document.documentElement.scrollWidth, titre:Math.round(parseFloat(getComputedStyle(R2.querySelector('.list .large-title')).fontSize)), ordre, liste:{ t:Math.round(ls.top), b:Math.round(ls.bottom) }, entieres, total:lignes.length, sous:getComputedStyle(R2.querySelector('.list .lt-sub')).display }; });
      v('population ' + etiq + ' : la liste a des messages (' + m.total + ') et le titre existe', m.total >= 3 && !!m.ordre[0], m);
      const rangs = m.ordre.filter(Boolean); let chev = 0; for (let i = 1; i < rangs.length; i++) if (rangs[i].t < rangs[i - 1].b - 1) chev++;
      v(etiq + ' : titre, recherche, catégories, encart se suivent sans se couvrir (' + chev + ' chevauchement)', chev === 0, m.ordre);
      v(etiq + ' : la page ne glisse pas de côté (' + m.sw + ' pour ' + w + ')', m.sw <= w + 1);
      v(etiq + ' : titre à 20 px au plus, phrase du dessous retirée (' + m.titre + ' px, ' + m.sous + ')', m.titre <= 22 && m.sous === 'none', m);
      // information : combien de lignes entières — la liste défile, on ne l'exige pas ; on la compte pour le rapport
      console.log('  · ' + etiq + ' : ' + m.entieres + ' ligne(s) entière(s) sur ' + m.total + ', zone de liste ' + (m.liste.b - m.liste.t) + ' px');
      await cap(c, '../restes1r/paysage-' + pr + (nuit ? '-nuit' : '-jour'));
      await fin(c);
    }
  });
  // ═══ 3. la feuille d'écriture tourne : le titre se remesure (court debout, entier en paysage, court de nouveau) ═══
  if (veut(3)) await sec('rotation', async () => {
    for (const [pr, w, h] of [['iphone', 390, 844], ['petit', 320, 568], ['android', 360, 740]]) {
      const c = await entrer({ profil:pr }), p = c.p;
      await S(c, () => R().querySelector('#btnCompose').click()); await p.waitForTimeout(800);
      const T = () => S(c, () => { const e = R().querySelector('.sheet-title .t-main'); return e ? { txt:e.textContent, tronque:e.scrollWidth > e.clientWidth + 1 } : null; });
      const debout = await T(); v('population ' + pr + ' : la feuille d\'écriture est ouverte (« ' + (debout && debout.txt) + ' »)', !!debout);
      v(pr + ' debout : titre non coupé', debout && !debout.tronque, debout);
      await p.setViewportSize({ width:h, height:w }); await p.waitForTimeout(1500);
      const pay = await T(); v(pr + ' paysage ' + h + '×' + w + ' : titre non coupé (« ' + (pay && pay.txt) + ' »)', pay && !pay.tronque, pay);
      if (pay && pay.txt !== 'Nouveau message') console.log('  · ' + pr + ' paysage : le titre reste « ' + pay.txt + ' » alors qu\'il y a la place (pas de remesure tant que la mise en page ne change pas) — information');
      await cap(c, '../restes1r/rotation-' + pr + '-paysage');
      await p.setViewportSize({ width:w, height:h }); await p.waitForTimeout(1500);
      const re = await T(); v(pr + ' redebout : titre non coupé, de nouveau court (« ' + (re && re.txt) + ' »)', re && !re.tronque && re.txt === debout.txt, { debout, re });
      await fin(c);
      // le sens inverse : feuille ouverte DÉJÀ en paysage (titre entier), puis le téléphone se redresse : le titre doit se raccourcir, pas se couper
      const c2 = await entrer({ profil:pr }), p2 = c2.p;
      await p2.setViewportSize({ width:h, height:w }); await p2.waitForTimeout(1500);
      await S(c2, () => R().querySelector('#btnCompose').click()); await p2.waitForTimeout(900);
      const T2 = () => S(c2, () => { const e = R().querySelector('.sheet-title .t-main'); return e ? { txt:e.textContent, tronque:e.scrollWidth > e.clientWidth + 1 } : null; });
      const a = await T2(); v('population ' + pr + ' : feuille ouverte en paysage (« ' + (a && a.txt) + ' »)', !!a && !a.tronque, a);
      await p2.setViewportSize({ width:w, height:h }); await p2.waitForTimeout(1500);
      const b = await T2(); v(pr + ' ouverte en paysage puis redressé : titre non coupé (« ' + (b && b.txt) + ' »)', b && !b.tronque, { a, b });
      await cap(c2, '../restes1r/rotation-inverse-' + pr);
      await fin(c2);
    }
  });
  // ═══ 4. le clavier ouvert (fenêtre qui perd la moitié de sa hauteur, téléphone debout) : même règle que le paysage (max-height:500px), la liste reste propre ═══
  if (veut(4)) await sec('clavier', async () => {
    for (const [pr, w, h] of [['android', 360, 740], ['iphone', 390, 844]]) {
      const c = await entrer({ profil:pr }), p = c.p;
      const avant = await S(c, () => { const R2 = window.R(); return { titre:Math.round(parseFloat(getComputedStyle(R2.querySelector('.list .large-title')).fontSize)), sous:getComputedStyle(R2.querySelector('.list .lt-sub')).display }; });
      await p.setViewportSize({ width:w, height:430 }); await p.waitForTimeout(1500);
      const k = await S(c, () => { const R2 = window.R(), ls = R2.querySelector('#listScroll').getBoundingClientRect(); return { titre:Math.round(parseFloat(getComputedStyle(R2.querySelector('.list .large-title')).fontSize)), sous:getComputedStyle(R2.querySelector('.list .lt-sub')).display, liste:Math.round(ls.height), sw:document.documentElement.scrollWidth }; });
      v('population ' + pr + ' : debout le titre est grand (' + avant.titre + ' px)', avant.titre >= 24, avant);
      console.log('  · ' + pr + ' ' + w + '×430 (clavier) : titre ' + k.titre + ' px, phrase ' + k.sous + ', liste ' + k.liste + ' px — information (à soumettre : le titre rétrécit pendant la frappe, comme en paysage)');
      v(pr + ' clavier : la page ne glisse pas de côté (' + k.sw + ' pour ' + w + ') et la liste garde de la place (' + k.liste + ' px)', k.sw <= w + 1 && k.liste >= 150, k);
      await cap(c, '../restes1r/clavier-' + pr);
      await fin(c);
    }
  });
  // ═══ 5. bulles : texte long + bouton dans la fenêtre ouverte (téléphone), deux rôles ; « Annuler l'envoi » du module reste à l'écran quand l'hôte parle ═══
  if (veut(5)) await sec('bulles', async () => {
    const LONG = 'Facture FA-CDA-10-552 comparée au bon de commande 2026-036, trois lignes rapprochées, une différence de 12,40 € signalée au fournisseur et rangée dans les achats du mois.';
    for (const [pr, qui, nuit] of [['petit', 'marc', false], ['iphone', 'julie', true], ['android', 'marc', true]]) {
      const c = await entrer({ profil:pr, qui, nuit, sansAller:true }), p = c.p;
      const compta = await S(c, () => !!document.querySelector('#cpsys:not([hidden])'));   // Julie arrive dans la Comptabilité plein écran : la fenêtre s'y ouvre à z-index 9100, au-dessus de la bulle (300)
      const etiq = pr + ' ' + qui + (nuit ? ' nuit' : ' jour') + (compta ? ' (fenêtre ouverte depuis la Comptabilité plein écran)' : '');
      await S(c, () => ouvrirCreation()); await p.waitForTimeout(900);
      await p.evaluate(t => toast(t, { lib:'Annuler', fn:() => {} }), LONG); await p.waitForTimeout(700);
      const g = await S(c, () => { const t = document.getElementById('toast'), tete = document.querySelector('.fen-voile .fen-tete'), pied = document.querySelector('.fen-voile .fen-pied'), r = e => { if (!e) return null; const b = e.getBoundingClientRect(); return [Math.round(b.top), Math.round(b.bottom), Math.round(b.left), Math.round(b.right)]; }; const bt = t && t.querySelector('button'); return { on:!!t && t.classList.contains('on'), toast:r(t), tete:r(tete), pied:r(pied), bouton:r(bt), iw:innerWidth, ih:innerHeight }; });
      v('population ' + etiq + ' : fenêtre ouverte, bulle longue avec son bouton à l\'écran', g.on && !!g.tete && !!g.pied && !!g.bouton, g);
      v(etiq + ' : bulle longue ni sur le titre (' + (g.tete && g.tete[1]) + '), ni sur la barre d\'actions (' + (g.pied && g.pied[0]) + ') — bulle ' + (g.toast && g.toast[0]) + '–' + (g.toast && g.toast[1]), g.toast && g.toast[0] >= g.tete[1] - 1 && g.toast[1] <= g.pied[0] + 1, g);
      v(etiq + ' : la bulle tient dans la largeur (' + (g.toast && g.toast[2]) + '–' + (g.toast && g.toast[3]) + ' pour ' + g.iw + ')', g.toast && g.toast[2] >= 0 && g.toast[3] <= g.iw, g);
      // le bouton « Annuler » de la bulle se touche vraiment (point central, au doigt) : il reçoit le geste, pas la fenêtre dessous
      const touche = await S(c, () => { const b = document.querySelector('#toast button'); const r = b.getBoundingClientRect(), e = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return { h:Math.round(r.height), ok:e === b || b.contains(e) }; });
      v(etiq + ' : le bouton de la bulle reçoit le toucher (' + touche.h + ' px de haut)', touche.ok && touche.h >= 36, touche);
      await cap(c, '../restes1r/bulle-longue-' + pr + '-' + qui + (nuit ? '-nuit' : '-jour'));
      await fin(c);
    }
    // « Annuler l'envoi » du module est une bulle qui porte un geste en cours : la bulle de l'hôte ne doit pas la retirer
    const c = await entrer({ profil:'iphone', nuit:false }), p = c.p;
    await S(c, () => R().querySelector('#btnCompose').click()); await p.waitForTimeout(700);
    await S(c, () => { const x = R().querySelector('#cTo'); x.value = 'a@exemple.fr'; x.dispatchEvent(new Event('input', { bubbles:true })); });
    await S(c, () => R().querySelector('#cSub').focus()); await p.keyboard.type('Essai envoi');
    await S(c, () => R().querySelector('#cBody, [contenteditable]').focus()); await p.keyboard.type('Bonjour');
    const env = await S(c, () => { const b = R().querySelector('#cSend'); if (b) b.click(); return !!b; }); await p.waitForTimeout(800);
    const avant = await S(c, () => { const t = R().querySelector('#toast'); return t && t.classList.contains('show') ? { act:t.classList.contains('act'), txt:t.innerText.replace(/\s+/g, ' ') } : null; });
    v('population : le bouton Envoyer existe et la bulle « Annuler l\'envoi » du module est à l\'écran (' + JSON.stringify(avant) + ')', env && !!avant && /nnuler/.test(avant.txt), avant);
    await p.evaluate(() => toast('Intervention préremplie depuis le message.')); await p.waitForTimeout(500);
    const deux = await S(c, () => { const h = document.getElementById('toast'), m = R().querySelector('#toast'), r = e => { const b = e.getBoundingClientRect(); return [Math.round(b.top), Math.round(b.bottom)]; }; return { hote:h && h.classList.contains('on') ? r(h) : null, module:m && m.classList.contains('show') ? r(m) : null }; });
    const chev = deux.hote && deux.module && !(deux.hote[1] <= deux.module[0] + 1 || deux.module[1] <= deux.hote[0] + 1);
    v('« Annuler l\'envoi » reste, la bulle de l\'hôte ne la couvre pas (hôte ' + JSON.stringify(deux.hote) + ', module ' + JSON.stringify(deux.module) + ')', !!deux.module && !!deux.hote && !chev, deux);
    await cap(c, '../restes1r/deux-bulles-iphone');
    await fin(c);
  });
  // ═══ 6. le SENS INVERSE de « une bulle à la fois » : l'hôte parle d'abord (6 s), puis le module (« Brouillon enregistré ») — les deux ne se recouvrent pas ═══
  if (veut(6)) await sec('bulles inverse', async () => {
    for (const [pr, nuit] of [['iphone', false], ['mac', false], ['mac', true], ['windows', false]]) {
      const etiq = pr + (nuit ? ' nuit' : ' jour'), c = await entrer({ profil:pr, nuit }), p = c.p;
      await S(c, () => R().querySelector('#btnCompose').click()); await p.waitForTimeout(800);
      await S(c, () => { const x = R().querySelector('#cTo'); x.value = 'a@exemple.fr'; x.dispatchEvent(new Event('input', { bubbles:true })); });
      await S(c, () => R().querySelector('#cSub').focus()); await p.keyboard.type('Essai');
      await p.evaluate(() => toast('Commande 2026-036 terminée : facture comparée et rangée dans les achats.')); await p.waitForTimeout(400);
      await S(c, () => R().querySelector('#cDraft').click()); await p.waitForTimeout(500);
      const r = await S(c, () => { const h = document.getElementById('toast'), m = R().querySelector('#toast'), rc = e => { const b = e.getBoundingClientRect(); return [Math.round(b.left), Math.round(b.top), Math.round(b.right), Math.round(b.bottom)]; };
        return { hote:h && h.classList.contains('on') ? rc(h) : null, module:m && m.classList.contains('show') ? rc(m) : null }; });
      v('population ' + etiq + ' : la bulle de l\'hôte ET celle du module sont à l\'écran', !!r.hote && !!r.module, r);
      const rec = r.hote && r.module && !(r.hote[2] <= r.module[0] + 1 || r.module[2] <= r.hote[0] + 1 || r.hote[3] <= r.module[1] + 1 || r.module[3] <= r.hote[1] + 1);
      v(etiq + ' : les deux bulles ne se recouvrent pas (hôte ' + JSON.stringify(r.hote) + ', module ' + JSON.stringify(r.module) + ')', !rec, r);
      await cap(c, '../restes1r/bulles-inverse-' + pr + (nuit ? '-nuit' : '-jour'));
      await fin(c);
    }
  });
  await sortie();
})();
