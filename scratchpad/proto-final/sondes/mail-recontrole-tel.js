// Boîte mail, étape 5 « recontrôler » (17 novembre 2026) — le RECONTRÔLEUR ADVERSE, côté TÉLÉPHONE.
// Rejoue telephone-01 à -16 (mesures À PART de mail-corr-telephone.js, vrais touchers) puis cherche ce que les corrections ont cassé à côté :
// la barre d'onglets du bas, l'historique du navigateur entre rubriques, le paysage, la tablette, la nuit.
// ⛔ 127.0.0.1 seulement. PARTIE=1 : iphone jour+nuit ; 2 : android nuit et petit ; 3 : historique, paysage, ipad, en-têtes.
const { lib, v, entrer, cap, fin, sortie, ouvrirMsg, casserBoite } = require('./mail-commun.js');
const S = (c, f, a) => c.p.evaluate(f, a);
const PARTIE = process.env.PARTIE || '0', veut = n => PARTIE === '0' || PARTIE === String(n);
const sec = async (nom, f) => { try { await f(); } catch (e) { v('SECTION ' + nom + ' : aucune exception', false, String(e && e.message || e).slice(0, 300)); } };
const lum = ([r, g, b]) => { const f = x => { x /= 255; return x <= .03928 ? x / 12.92 : Math.pow((x + .055) / 1.055, 2.4); }; return .2126 * f(r) + .7152 * f(g) + .0722 * f(b); };
const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };
const rgb = t => (/rgba?\(([^)]+)\)/.exec(t) || [0, '0,0,0'])[1].split(/[ ,/]+/).filter(Boolean).slice(0, 3).map(Number);
(async () => {
  const lots = [];
  if (veut(1)) lots.push(['iphone', false], ['iphone', true]);
  if (veut(2)) lots.push(['android', true], ['petit', false]);
  for (const [pr, nuit] of lots) await sec('téléphone ' + pr + (nuit ? ' nuit' : ' jour'), async () => {
    const etiq = pr + (nuit ? ' nuit' : ' jour'), c = await entrer({ profil:pr, nuit }), p = c.p;
    // ── telephone-08 / -11 : l'en-tête de rubrique comme Clients, la page à la hauteur de l'écran, la liste finit AU-DESSUS de la barre d'onglets ──
    const bas = await S(c, () => { const h = document.getElementById('courrier-hote').getBoundingClientRect(), b = document.getElementById('barre-bas'), cs = b ? getComputedStyle(b) : null, br = b && cs.display !== 'none' ? b.getBoundingClientRect() : null, t = document.querySelector('.mbx-tete');
      return { hoteHaut:Math.round(h.top), hoteBas:Math.round(h.bottom), barreHaut:br ? Math.round(br.top) : null, ih:innerHeight, sh:document.documentElement.scrollHeight, tete:t ? Math.round(t.getBoundingClientRect().height) : null, ecrire:!!document.querySelector('.mbx-ecrire') && document.querySelector('.mbx-ecrire').getBoundingClientRect().height > 30 }; });
    v('telephone-11 ' + etiq + ' : la page n\'est pas plus haute que l\'écran (' + bas.sh + ' pour ' + bas.ih + ')', bas.sh <= bas.ih + 1, bas);
    v('telephone-11 (collatéral) ' + etiq + ' : le module finit AU-DESSUS de la barre d\'onglets du bas (module ' + bas.hoteBas + ', barre ' + bas.barreHaut + ') — rien n\'est caché derrière elle', bas.barreHaut === null || bas.hoteBas <= bas.barreHaut + 1, bas);
    v('telephone-08 ' + etiq + ' : en-tête d\'une ligne (' + bas.tete + ' px) avec un bouton « Écrire » touchable', bas.tete !== null && bas.tete <= 80 && bas.ecrire, bas);
    // le même geste que Clients : « Écrire » d'un vrai toucher ouvre la feuille
    await c.p.locator('.mbx-ecrire').tap(); await p.waitForTimeout(700);
    v('telephone-08 ' + etiq + ' : le bouton « ＋ Écrire » de l\'en-tête, TOUCHÉ, ouvre le nouveau message', await S(c, () => !!R().querySelector('#cTo')));
    await S(c, () => R().querySelector('#cCancel').click()); await p.waitForTimeout(500);
    await cap(c, 'rc-tel-liste-' + etiq.replace(' ', '-'));
    // ── telephone-01 : tous les messages, au toucher, le texte avant le pli ; ordre du bandeau ──
    const n = await S(c, () => R().querySelectorAll('#rows .msg').length), mal = []; let lus = 0, band = 0;
    for (let i = 0; i < Math.min(n, 14); i++) {
      await c.p.locator('#courrier-hote').evaluate((_, k) => R().querySelectorAll('#rows .msg')[k].scrollIntoView({ block:'center' }), i).catch(() => {});
      await S(c, k => R().querySelectorAll('#rows .msg')[k].click(), i); await p.waitForTimeout(380);
      const m = await S(c, () => { const r = R(), sc = (r.querySelector('#readScroll') || r.querySelector('#read')).getBoundingClientRect(), b = r.querySelector('.rbody p, .rbody'), h = r.querySelector('.hband'), tools = r.querySelector('#readTools'), cb = b && b.getBoundingClientRect(), tb = tools && tools.getBoundingClientRect();
        return b ? { s:((r.querySelector('.rsubj') || {}).textContent || '').slice(0, 30), y:Math.round(cb.top), bas:Math.round(tb ? tb.top : sc.bottom), band:!!h, apres:h ? h.getBoundingClientRect().top >= cb.top : true } : null; });
      if (m) { lus++; if (m.band) band++; if (m.y > m.bas - 60 || !m.apres) mal.push(m); }
      await S(c, () => { const b = R().querySelector('#btnBack'); if (b && b.offsetParent) b.click(); }); await p.waitForTimeout(260); }
    v('telephone-01 ' + etiq + ' : ' + lus + ' lectures (au moins 9), ' + band + ' avec bandeau (au moins 4)', lus >= 9 && band >= 4, { lus, band, n });
    v('telephone-01 ' + etiq + ' : le texte commence au-dessus de la barre d\'outils du bas pour chacune, le bandeau est après le texte', mal.length === 0, mal);
    // ── telephone-05 / -04 : les mots sous les icônes (lecture), « Envoyer » (feuille) ──
    await S(c, () => R().querySelectorAll('#rows .msg')[1].click()); await p.waitForTimeout(500);
    const tb = await S(c, () => [...R().querySelectorAll('#readTools .tbtn')].map(b => { const l = b.querySelector('.tl'), r = b.getBoundingClientRect(); return { t:l ? l.textContent : '', w:Math.round(r.width), h:Math.round(r.height), dedans:r.left >= -1 && r.right <= innerWidth + 1 && r.bottom <= innerHeight + 1, aria:b.getAttribute('aria-label') || b.title || '' }; }));
    v('telephone-05 ' + etiq + ' : la barre du bas de la lecture (' + tb.length + ' boutons) porte un mot sous chaque icône, tient dans l\'écran, cibles ≥ 44 × 44 px', tb.length >= 4 && tb.every(x => x.t && x.dedans && x.h >= 44 && x.w >= 44), tb);
    await S(c, () => R().querySelector('#btnBack').click()); await p.waitForTimeout(400);
    await S(c, () => R().querySelector('#btnCompose').click()); await p.waitForTimeout(700);
    const s4 = await S(c, () => { const l = R().querySelector('#cSend .lbl'), a = R().querySelector('#cCancel').getBoundingClientRect(), e = R().querySelector('#cSend').getBoundingClientRect(), t = R().querySelector('.sheet-title').getBoundingClientRect(); return { txt:l && l.textContent, aff:l && getComputedStyle(l).display, chev:a.right > t.left + 2 || t.right > e.left + 2, eh:Math.round(e.height), ew:Math.round(e.width) }; });
    v('telephone-04 ' + etiq + ' : « Envoyer » s\'écrit, sans chevauchement, cible ≥ 40 px', s4.txt === 'Envoyer' && s4.aff !== 'none' && !s4.chev && s4.eh >= 40, s4);
    // telephone-03 : la croix d'une pièce jointe au doigt
    await p.locator('#courrier-hote input[type=file]').first().setInputFiles({ name:'devis.pdf', mimeType:'application/pdf', buffer:Buffer.from('%PDF-1.4 essai') }); await p.waitForTimeout(600);
    const x3 = await S(c, () => { const b = R().querySelector('.att-x'), r = b && b.getBoundingClientRect(); return r ? { w:Math.round(r.width), h:Math.round(r.height), tire:!!(R().querySelector('.att-chip,.att')) } : null; });
    v('telephone-03 ' + etiq + ' : la croix « Retirer » de la pièce jointe mesure ≥ 44 × 44', !!x3 && x3.w >= 44 && x3.h >= 44, x3);
    await cap(c, 'rc-tel-composeur-' + etiq.replace(' ', '-'));
    // la croix, TOUCHÉE, retire vraiment la pièce
    await c.p.locator('#courrier-hote .att-x').first().tap().catch(() => {}); await p.waitForTimeout(400);
    v('telephone-03 ' + etiq + ' : toucher la croix retire la pièce jointe', await S(c, () => !R().querySelector('.att-x')));
    await S(c, () => R().querySelector('#cCancel').click()); await p.waitForTimeout(400);
    v('aucune erreur JavaScript sur ' + etiq, c.err.length === 0, c.err.slice(0, 3));
    await fin(c);
  });

  // ═══ 3. Historique du navigateur, entre rubriques et dans le module ; paysage ; tablette ; en-têtes comparés à Clients ═══
  if (veut(3)) {
    await sec('historique', async () => {
      const c = await entrer({ profil:'iphone', sansAller:true }), p = c.p;
      const h0 = await S(c, () => ({ r:route, n:history.length }));
      await lib.aller(p, 'clients'); await lib.aller(p, 'boiteMail'); await p.waitForTimeout(1500);
      const h1 = await S(c, () => ({ r:route, n:history.length }));
      // ouvrir un message, revenir par le geste de l'appareil : on retombe sur la liste, pas ailleurs
      await S(c, () => R().querySelectorAll('#rows .msg')[2].click()); await p.waitForTimeout(500);
      await S(c, () => history.back()); await p.waitForTimeout(700);
      const a = await S(c, () => ({ r:route, vue:R() && R().querySelector('#app').getAttribute('data-view') }));
      v('telephone-02 (collatéral) : depuis la lecture, le retour revient à la liste de la Boîte mail (' + JSON.stringify(a) + ')', a.r === 'boiteMail' && a.vue === 'list', a);
      // un second retour : on quitte la Boîte mail pour la rubrique d'avant (Clients), pas pour une page orpheline
      await S(c, () => history.back()); await p.waitForTimeout(800);
      const b = await S(c, () => ({ r:route, hote:document.getElementById('courrier-hote').hidden }));
      v('telephone-02 (collatéral) : un second retour quitte la Boîte mail vers la rubrique d\'avant (Clients), l\'hôte est masqué', b.r === 'clients' && b.hote === true, b);
      // « en avant » : revient à la Boîte mail, liste intacte
      await S(c, () => history.forward()); await p.waitForTimeout(900);
      const f = await S(c, () => ({ r:route, n:R() ? R().querySelectorAll('#rows .msg').length : -1, hote:document.getElementById('courrier-hote').hidden }));
      v('telephone-02 (collatéral) : « en avant » ramène à la Boîte mail, liste affichée (' + f.n + ' lignes), hôte visible', f.r === 'boiteMail' && f.n >= 8 && f.hote === false, f);
      // l'historique ne gonfle pas : dix allers-retours lecture/liste n'ajoutent pas dix entrées
      const n0 = await S(c, () => history.length);
      for (let i = 0; i < 8; i++) { await S(c, k => R().querySelectorAll('#rows .msg')[k % 5].click(), i); await p.waitForTimeout(200); await S(c, () => R().querySelector('#btnBack').click()); await p.waitForTimeout(200); }
      const n1 = await S(c, () => history.length);
      v('telephone-02 (collatéral) : huit lectures + huit retours par le bouton de l\'application : l\'historique ne grossit pas de plus de 1 entrée (' + n0 + ' → ' + n1 + ')', n1 - n0 <= 1, { n0, n1 });
      // le retour dans une feuille « Boîtes » (colonne) puis lecture : même discipline
      await S(c, () => R().querySelector('#btnNav').click()); await p.waitForTimeout(600);
      await S(c, () => history.back()); await p.waitForTimeout(700);
      const col = await S(c, () => ({ r:route, vue:R().querySelector('#app').getAttribute('data-view') }));
      v('telephone-02 (collatéral) : le retour depuis la colonne « Mes boîtes mail » revient à la liste', col.r === 'boiteMail' && col.vue === 'list', col);
      // ouvrir la Boîte mail par un lien de l'application (hôte masqué ailleurs) : ni entrée orpheline ni feuille bloquée
      await lib.aller(p, 'accueil'); await p.waitForTimeout(500);
      await S(c, () => courrierOuvrir('m2')); await p.waitForTimeout(1500);
      const lien = await S(c, () => ({ r:route, sujet:(R().querySelector('.rsubj') || {}).textContent || '' }));
      v('telephone-02 (collatéral) : « courrierOuvrir » depuis l\'Accueil ouvre BIEN l’e-mail demandé dans la Boîte mail', lien.r === 'boiteMail' && lien.sujet.length > 3, lien);
      v('aucune erreur JavaScript (historique)', c.err.length === 0, c.err.slice(0, 3));
      await fin(c);
    });

    await sec('paysage', async () => {
      const c = await entrer({ profil:'iphone' }), p = c.p;
      await p.setViewportSize({ width:844, height:390 }); await p.waitForTimeout(1400);
      const l = await S(c, () => { const h = document.getElementById('courrier-hote').getBoundingClientRect(), ls = R().querySelector('#listScroll').getBoundingClientRect(), vues = [...R().querySelectorAll('#rows .msg')].filter(r => { const b = r.getBoundingClientRect(); return b.top >= ls.top - 1 && b.bottom <= Math.min(ls.bottom, innerHeight) + 1; }).length; return { hote:[Math.round(h.top), Math.round(h.bottom)], ih:innerHeight, sw:document.documentElement.scrollWidth, vues, tete:(document.querySelector('.mbx-tete') && getComputedStyle(document.querySelector('.mbx-tete')).display) }; });
      // restes tour 1 : la liste d'un téléphone en paysage fait 352 px (recherche et catégories comprises) ; une ligne entière + la suivante entamée est le plancher tenu (restes-mail-tour1.js PARTIE=2), deux entières ne tiennent pas
      v('telephone-15 paysage 844×390 : au moins 1 ligne de message se voit en entier, l\'hôte finit dans l\'écran, rien ne déborde de côté', l.vues >= 1 && l.hote[1] <= l.ih + 1 && l.sw <= 845, l);
      await cap(c, 'rc-tel-paysage');
      // on rouvre un message en paysage : le texte se lit sans que la barre du bas mange tout
      await S(c, () => R().querySelectorAll('#rows .msg')[1].click()); await p.waitForTimeout(500);
      const r = await S(c, () => { const sc = R().querySelector('#readScroll').getBoundingClientRect(), t = R().querySelector('#readTools') && R().querySelector('#readTools').getBoundingClientRect(), b = R().querySelector('.rbody p, .rbody').getBoundingClientRect(); return { corpsHaut:Math.round(b.top), zone:[Math.round(sc.top), Math.round(sc.bottom)], outils:t ? [Math.round(t.top), Math.round(t.bottom)] : null, ih:innerHeight }; });
      v('telephone-15 paysage : en lecture, le premier mot du texte est dans la fenêtre au-dessus de la barre d\'outils', r.corpsHaut < (r.outils ? r.outils[0] : r.ih) - 20, r);
      await cap(c, 'rc-tel-paysage-lecture');
      // retour au portrait : tout se remet en place
      await p.setViewportSize({ width:390, height:844 }); await p.waitForTimeout(1400);
      const q = await S(c, () => { const h = document.getElementById('courrier-hote').getBoundingClientRect(), b = document.getElementById('barre-bas'), br = b && getComputedStyle(b).display !== 'none' ? b.getBoundingClientRect() : null; return { hote:[Math.round(h.top), Math.round(h.bottom)], barre:br ? Math.round(br.top) : null, ih:innerHeight, sw:document.documentElement.scrollWidth }; });
      v('telephone-15 (collatéral) : de retour en portrait, l\'hôte se recale au-dessus de la barre d\'onglets, sans débordement', (q.barre === null || q.hote[1] <= q.barre + 1) && q.sw <= 391, q);
      await fin(c);
    });

    await sec('tablette', async () => {
      for (const nuit of [false, true]) { const c = await entrer({ profil:'ipad', nuit }), p = c.p;
        const t = await S(c, () => ({ fmt:R().querySelector('.opc').dataset.fmt, sh:document.documentElement.scrollHeight, ih:innerHeight, sw:document.documentElement.scrollWidth, hote:Math.round(document.getElementById('courrier-hote').getBoundingClientRect().bottom), vues:R().querySelectorAll('#rows .msg').length }));
        v('tablette ' + (nuit ? 'nuit' : 'jour') + ' : la Boîte mail occupe l\'écran de l\'iPad sans débordement (format ' + t.fmt + ')', t.sw <= c.largeur + 1 && t.hote <= t.ih + 1 && t.vues >= 8, t);
        await S(c, () => R().querySelectorAll('#rows .msg')[1].click()); await p.waitForTimeout(500);
        await S(c, () => R().querySelector('#btnCompose').click()); await p.waitForTimeout(700);
        const e = await S(c, () => { const l = R().querySelector('#cSend .lbl'), sh = R().querySelector('.sheet').getBoundingClientRect(); return { txt:l && l.textContent, sheet:[Math.round(sh.left), Math.round(sh.right)], iw:innerWidth }; });
        v('tablette ' + (nuit ? 'nuit' : 'jour') + ' : « Envoyer » s\'écrit, la feuille est dans l\'écran', e.txt === 'Envoyer' && e.sheet[0] >= 0 && e.sheet[1] <= e.iw, e);
        await cap(c, 'rc-ipad-compose-' + (nuit ? 'nuit' : 'jour'));
        v('aucune erreur JavaScript (iPad)', c.err.length === 0, c.err.slice(0, 3)); await fin(c); }
    });

    await sec('en-têtes', async () => {
      // telephone-08 : la Boîte mail a la même charpente que Clients (surtitre, titre, bouton d'action) — comparaison de la position du titre
      const c = await entrer({ profil:'iphone', sansAller:true }), p = c.p;
      const mesure = async r => { await lib.aller(p, r); await p.waitForTimeout(700); return S(c, () => { const t = document.querySelector('#contenu .tete'), h = t && t.querySelector('h1'), b = t && t.querySelector('button,.btn'); return t ? { haut:Math.round(h.getBoundingClientRect().top), fs:parseFloat(getComputedStyle(h).fontSize), h:Math.round(t.getBoundingClientRect().height), bouton:b ? b.textContent.trim() : '', bh:b ? Math.round(b.getBoundingClientRect().height) : 0 } : null; }); };
      const cl = await mesure('clients'), de = await mesure('devis'), bm = await mesure('boiteMail');
      v('telephone-08 : population — trois en-têtes de rubrique relevés (Clients, Devis, Boîte mail)', !!cl && !!de && !!bm, { cl, de, bm });
      v('telephone-08 : le titre de la Boîte mail est à la même hauteur que celui de Clients et Devis (±6 px) et de même corps (±2 px) : ' + JSON.stringify({ cl:cl.haut, de:de.haut, bm:bm.haut }), Math.abs(bm.haut - cl.haut) <= 6 && Math.abs(bm.haut - de.haut) <= 6 && Math.abs(bm.fs - cl.fs) <= 2, { cl, de, bm });
      v('telephone-08 : la hauteur de l\'en-tête est comparable (Boîte mail ' + bm.h + ' px, Clients ' + cl.h + ' px)', bm.h <= cl.h + 14, { cl, de, bm });
      await lib.aller(p, 'clients'); await cap(c, 'rc-tel-clients'); await lib.aller(p, 'boiteMail'); await p.waitForTimeout(900); await cap(c, 'rc-tel-boitemail');
      // les AUTRES rubriques n'ont pas perdu leur marge du bas : la correction de telephone-11 (#contenu:has(.courrier-place)) ne touche que la Boîte mail
      await lib.aller(p, 'clients'); await p.waitForTimeout(600);
      const pad = await S(c, () => parseFloat(getComputedStyle(document.getElementById('contenu')).paddingBottom));
      v('telephone-11 (collatéral) : Clients garde sa marge basse sous la barre d\'onglets (' + pad + ' px ≥ 60)', pad >= 60, pad);
      v('aucune erreur JavaScript (en-têtes)', c.err.length === 0, c.err.slice(0, 3));
      await fin(c);
    });
  }
  await sortie();
})();
