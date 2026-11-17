// Boîte mail, étape 4 « corriger » (17 novembre 2026) — le TÉLÉPHONE (iPhone 390, Android 360, petit 320), jour et nuit.
// Rejoue telephone-01 à -16 de scratchpad/proto-final/refonte/mail-relecture-telephone.json (-13 et -05 sont des décisions de Justin : voir mail-corrections.json). ✓ = corrigé.
const { lib, v, entrer, cap, fin, sortie, ouvrirMsg, casserBoite } = require('./mail-commun.js');
const S = (c, f, a) => c.p.evaluate(f, a);
const lum = ([r, g, b]) => { const f = x => { x /= 255; return x <= .03928 ? x / 12.92 : Math.pow((x + .055) / 1.055, 2.4); }; return .2126 * f(r) + .7152 * f(g) + .0722 * f(b); };
const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };
const rgb = t => (/rgba?\(([^)]+)\)/.exec(t) || [0, '0,0,0'])[1].split(/[ ,/]+/).filter(Boolean).slice(0, 3).map(Number);
(async () => {
  // PARTIE=1 : iphone, 2 : android + petit (la lecture de chaque message prend du temps) ; sans PARTIE : tout, dans l'ordre
  const PARTIE = process.env.PARTIE || '0', TOUT = [['iphone', false], ['iphone', true], ['android', false], ['petit', false], ['petit', true]];
  for (const [pr, nuit] of PARTIE === '3' ? [] : PARTIE === '1' ? TOUT.slice(0, 2) : PARTIE === '2' ? TOUT.slice(2) : TOUT) {
    const etiq = pr + (nuit ? ' nuit' : ' jour');
    let c = await entrer({ profil:pr, nuit }), p = c.p;
    // ── telephone-08 : l'en-tête de la rubrique, comme Clients et Devis ──
    const t8 = await S(c, () => { const t = document.querySelector('.mbx-tete'), h = t.querySelector('h1').getBoundingClientRect(), b = t.querySelector('.mbx-ecrire').getBoundingClientRect(), r = t.getBoundingClientRect();
      return { surtitre:t.querySelector('.surtitre').textContent, titre:t.querySelector('h1').textContent, bouton:t.querySelector('.mbx-ecrire').textContent.trim(), droite:Math.round(b.right), iw:innerWidth, haut:Math.round(r.height), bh:Math.round(b.height), visible:b.width > 40 && getComputedStyle(t).display !== 'none', fond:getComputedStyle(t.querySelector('.mbx-ecrire')).backgroundColor }; });
    v('telephone-08 ' + etiq + ' : « Clients et ventes / Boîte mail » et le bouton « ＋ Écrire » sont lisibles, dans la largeur (' + t8.droite + ' ≤ ' + t8.iw + '), sur UNE ligne (' + t8.haut + ' px)', t8.visible && /Clients et ventes/.test(t8.surtitre) && t8.titre === 'Boîte mail' && /Écrire/.test(t8.bouton) && t8.droite <= t8.iw - 8 && t8.haut <= 80 && t8.bh >= 44, t8);
    // ── telephone-11 : la page n'est pas plus haute que l'écran ──
    const t11 = await S(c, () => ({ sh:document.documentElement.scrollHeight, ih:innerHeight }));
    v('telephone-11 ' + etiq + ' : aucune marge de défilement inutile (page ' + t11.sh + ' px pour ' + t11.ih + ')', t11.sh <= t11.ih + 1, t11);
    if (pr === 'iphone' && !nuit) await cap(c, 'corr-tel-liste-iphone');
    // ── telephone-01 : le texte du courriel commence dans l'écran, pour TOUS les messages de la boîte ──
    const n = await S(c, () => R().querySelectorAll('#rows .msg').length); const bas = [];
    for (let i = 0; i < n; i++) {
      await S(c, k => R().querySelectorAll('#rows .msg')[k].click(), i); await p.waitForTimeout(450);
      const m = await S(c, () => { const r = R(), sc = r.querySelector('#readScroll').getBoundingClientRect(), b = r.querySelector('.rbody p'); return b ? { s:(r.querySelector('.rsubj') || {}).textContent, y:Math.round(b.getBoundingClientRect().top), bas:Math.round(sc.bottom) } : null; });
      if (m) bas.push(m);
      await S(c, () => { const b = R().querySelector('#btnBack'); if (b && b.offsetParent) b.click(); }); await p.waitForTimeout(300); }
    v('telephone-01 ' + etiq + ' population : ' + bas.length + ' messages lus (au moins 9)', bas.length >= 9, bas.length);
    v('telephone-01 ' + etiq + ' : le premier mot du message est AU-DESSUS du pli pour chacun (le pire : ' + Math.max(...bas.map(x => x.y - x.bas)) + ' px sous/sur le bas)', bas.every(x => x.y < x.bas - 30), bas.filter(x => x.y >= x.bas - 30));
    if (pr !== 'petit' || !nuit) { await S(c, () => R().querySelectorAll('#rows .msg')[1].click()); await p.waitForTimeout(500); await cap(c, 'corr-tel-lecture-' + pr + (nuit ? '-nuit' : '')); await S(c, () => R().querySelector('#btnBack').click()); await p.waitForTimeout(300); }
    // ── telephone-05 : un mot sous chaque icône de la barre du bas ──
    await S(c, () => R().querySelectorAll('#rows .msg')[1].click()); await p.waitForTimeout(500);
    const outils = await S(c, () => [...R().querySelectorAll('#readTools .tbtn')].map(b => { const l = b.querySelector('.tl'); return { t:l ? l.textContent : '', vu:l ? getComputedStyle(l).display !== 'none' && l.getBoundingClientRect().height > 8 : false, dedans:b.getBoundingClientRect().right <= innerWidth }; }));
    v('telephone-05 ' + etiq + ' : les quatre gestes de la barre du bas portent leur mot (' + outils.map(o => o.t).join(', ') + ')', outils.length === 4 && outils.every(o => o.vu && o.dedans), outils);
    // ── telephone-02 : le retour du navigateur recule d'UN niveau ──
    const etatVue = () => S(c, () => ({ vue:R().querySelector('#app').getAttribute('data-view'), route, compose:!!R().querySelector('#cTo') }));
    await S(c, () => history.back()); await p.waitForTimeout(700);
    const apresLecture = await etatVue();
    v('telephone-02 ' + etiq + ' : le retour depuis la lecture revient à la LISTE (et la Boîte mail reste ouverte)', apresLecture.vue === 'list' && apresLecture.route === 'boiteMail', apresLecture);
    await S(c, () => R().querySelector('#btnCompose').click()); await p.waitForTimeout(700);
    await p.locator('#courrier-hote #cTo').fill('retour@exemple.fr'); await p.locator('#courrier-hote #cBody').fill('Un message en cours.');
    await S(c, () => history.back()); await p.waitForTimeout(900);
    const apresCompo = await S(c, () => ({ route, feuille:!!R().querySelector('#cTo'), ecran:!!R().querySelector('#overlay')}));
    v('telephone-02 ' + etiq + ' : le retour depuis un message en cours NE quitte PAS la Boîte mail (la feuille de choix « Supprimer / Enregistrer » est devant, rien n\'est perdu en silence)', apresCompo.route === 'boiteMail' && (apresCompo.feuille || apresCompo.ecran), apresCompo);
    await S(c, () => { const o = R().querySelector('#overlay'); if (o) { const b = [...o.querySelectorAll('button')].find(x => /Enregistrer le brouillon/.test(x.textContent)); if (b) b.click(); } }); await p.waitForTimeout(600);
    await S(c, () => { const o = R().querySelector('#overlay'); if (o) { const x = o.querySelector('#cCancel'); if (x) x.click(); } });
    // un geste de l'application qui recule ne laisse pas d'entrée orpheline : UN retour suffit pour quitter la rubrique
    await S(c, () => courrierOuvrir('m1')); await p.waitForTimeout(800);
    await S(c, () => R().querySelector('#btnBack').click()); await p.waitForTimeout(800);
    await S(c, () => history.back()); await p.waitForTimeout(900);
    const sortie1 = await S(c, () => route);
    v('telephone-02 ' + etiq + ' : après « ‹ Boîte de réception » (geste de l\'application), UN seul retour du navigateur quitte la rubrique (aucune entrée orpheline) → ' + sortie1, sortie1 !== 'boiteMail', sortie1);
    await fin(c);

    if (pr === 'iphone' && !nuit) {
      c = await entrer({ profil:pr, nuit }); p = c.p;
      // ── telephone-03 : retirer une pièce jointe se touche du doigt ; telephone-04 : « Envoyer » s'écrit ──
      await S(c, () => R().querySelector('#btnCompose').click()); await p.waitForTimeout(700);
      await p.locator('#courrier-hote input[type=file]').first().setInputFiles({ name:'devis-clim-chambre-214.pdf', mimeType:'application/pdf', buffer:Buffer.from('%PDF-1.4 essai') }); await p.waitForTimeout(700);
      const x = await S(c, () => { const b = R().querySelector('.att-x'), r = b ? b.getBoundingClientRect() : null; return r ? { w:Math.round(r.width), h:Math.round(r.height) } : null; });
      v('telephone-03 la croix « Retirer » de la pièce jointe mesure au moins 44×44 px (' + JSON.stringify(x) + ')', !!x && x.w >= 44 && x.h >= 44, x);
      await cap(c, 'corr-tel-joindre-iphone');
      await fin(c);
    }
    // ── telephone-04 : « Envoyer » en toutes lettres, la barre de la feuille tient (aucun chevauchement) ──
    c = await entrer({ profil:pr, nuit }); p = c.p;
    await S(c, () => R().querySelector('#btnCompose').click()); await p.waitForTimeout(700);
    const e4 = await S(c, () => { const r = s => { const e = R().querySelector(s); if (!e) return null; const b = e.getBoundingClientRect(); return [Math.round(b.left), Math.round(b.right)]; }, l = R().querySelector('#cSend .lbl');
      return { aff:getComputedStyle(l).display, txt:l.textContent, annuler:r('#cCancel'), titre:r('.sheet-title'), envoyer:r('#cSend'), iw:innerWidth }; });
    v('telephone-04 ' + etiq + ' : « Envoyer » s\'écrit, et Annuler · titre · Envoyer ne se chevauchent pas', e4.aff !== 'none' && e4.txt === 'Envoyer' && e4.annuler[1] <= e4.titre[0] + 2 && e4.titre[1] <= e4.envoyer[0] + 2 && e4.envoyer[1] <= e4.iw, e4);
    if (pr === 'iphone' || pr === 'petit') await cap(c, 'corr-tel-composeur-' + pr + (nuit ? '-nuit' : ''));
    await fin(c);
  }

  if (PARTIE === '1' || PARTIE === '2') return sortie();
  // ── telephone-06 / -10 : la colonne « Mes boîtes mail » — le pied ne recouvre aucun dossier ; titres entiers à 320 ──
  for (const [pr, nuit] of [['iphone', false], ['iphone', true], ['android', true], ['petit', false]]) {
    const c = await entrer({ profil:pr, nuit }), p = c.p;
    await S(c, () => R().querySelector('#btnNav').click()); await p.waitForTimeout(900);
    const z = await S(c, () => { const f = R().querySelector('.side-foot').getBoundingClientRect(), lignes = [...R().querySelectorAll('#sideScroll .srow')].filter(r => r !== R().querySelector('.side-foot .srow')), t = R().querySelector('.side-lt'), vis = e => { const b = e.getBoundingClientRect(); return b.width > 0 && b.bottom > 0 && b.top < innerHeight; };
      const recouvertes = lignes.filter(r => { const b = r.getBoundingClientRect(); return vis(r) && !r.closest('.side-foot') && b.bottom > f.top + 1 && b.top < f.bottom - 1; }).map(r => r.textContent.replace(/\s+/g, ' ').trim().slice(0, 30));
      return { lignes:lignes.length, recouvertes, pied:getComputedStyle(R().querySelector('.side-foot')).position, titreTronque:t.scrollWidth > t.clientWidth + 1, titre:t.textContent }; });
    v('telephone-06 ' + pr + (nuit ? ' nuit' : ' jour') + ' : le pied (« Ajouter une boîte mail ») ne recouvre AUCUN dossier au repos (' + z.lignes + ' lignes, pied ' + z.pied + ')', z.lignes >= 10 && z.pied !== 'sticky' && z.recouvertes.length === 0, z);
    if (pr === 'petit') v('telephone-10 petit : le grand titre « Mes boîtes mail » n\'est pas tronqué', !z.titreTronque, z);
    await cap(c, 'corr-tel-boites-' + pr + (nuit ? '-nuit' : ''));
    await S(c, () => { const s = R().querySelector('#sideScroll'); s.scrollTop = s.scrollHeight; }); await p.waitForTimeout(300);
    const bas = await S(c, () => { const f = R().querySelector('.side-foot').getBoundingClientRect(); return { bas:Math.round(f.bottom), ih:innerHeight }; });
    v('telephone-06 ' + pr + (nuit ? ' nuit' : ' jour') + ' : le pied est au bout du défilement, dans l\'écran', bas.bas <= bas.ih + 1, bas);
    if (pr === 'petit') {
      await S(c, () => R().querySelector('[data-folder=inbox]').click()); await p.waitForTimeout(500);
      await S(c, () => R().querySelectorAll('#rows .msg')[0].click()); await p.waitForTimeout(500);
      const b10 = await S(c, () => { const l = R().querySelector('#backLbl'); return { tronque:l.scrollWidth > l.clientWidth + 1, t:l.textContent }; });
      v('telephone-10 petit : « ‹ Boîte de réception » se lit en entier dans la lecture', !b10.tronque, b10);
    }
    await fin(c);
  }

  // ── telephone-05 (suite) : la barre de sélection, avec un mot sous chaque icône, tient dans l'écran à 320 et 390 px ──
  for (const pr of ['petit', 'iphone']) {
    const c = await entrer({ profil:pr }), p = c.p;
    await S(c, () => R().querySelector('#btnSelect').click()); await p.waitForTimeout(300);
    await S(c, () => R().querySelectorAll('#rows .msg')[0].click()); await p.waitForTimeout(250); await S(c, () => R().querySelectorAll('#rows .msg')[1].click()); await p.waitForTimeout(400);
    const sb = await S(c, () => { const b = R().querySelector('#selBar'), br = b.getBoundingClientRect(); return { deborde:b.scrollWidth > b.clientWidth + 1, hors:[...b.children].filter(x => { const r = x.getBoundingClientRect(); return r.right > innerWidth + 1 || r.left < -1; }).length, mots:[...b.querySelectorAll('.sb .tl')].map(x => x.textContent), nb:b.children.length, compteur:(b.querySelector('.sc') || {}).textContent }; });
    v('telephone-05 ' + pr + ' : barre de sélection : quatre gestes avec leur mot (' + sb.mots + '), rien ne sort de l\'écran ni ne déborde', sb.mots.length === 4 && !sb.deborde && sb.hors === 0, sb);
    await cap(c, 'corr-tel-selection-' + pr);
    await fin(c);
  }

  // ── telephone-07 : tout en panne, l'adresse n'est écrite qu'une fois (petit) ──
  let c = await entrer({ profil:'petit' }), p = c.p;
  await S(c, () => { ML_BOITES.forEach(b => { b.etat = 'reco'; b.vu = 'le 28 oct.'; }); return COURRIER.inst.rafraichir(); }); await p.waitForTimeout(1000);
  await S(c, () => { R().querySelector('#btnNav').click(); }); await p.waitForTimeout(700); await S(c, () => R().querySelector('[data-folder=archive]').click()); await p.waitForTimeout(500);
  const e7 = await S(c, () => { const e = R().querySelector('#rows .empty'); return e ? e.textContent.replace(/\s+/g, ' ') : ''; });
  v('telephone-07 petit : « Réception indisponible » dit chaque adresse UNE fois', /Réception indisponible/.test(e7) && (e7.match(/marc@climservices17\.fr/g) || []).length === 1, e7);
  await fin(c);

  // ── telephone-09 : « Confier à quelqu'un » dit la règle une fois ──
  c = await entrer({ profil:'iphone' }); p = c.p;
  await S(c, () => courrierOuvrir('m1')); await p.waitForTimeout(900);
  await S(c, () => [...R().querySelectorAll('[data-hote]')].find(b => /Confier/.test(b.textContent)).click()); await p.waitForTimeout(700);
  const cf = await S(c, () => { const t = (document.querySelector('#calque .panneau') || {}).textContent || ''; return { fois:(t.match(/en lecture/g) || []).length, longueur:t.length, lignes:document.querySelectorAll('#calque .ve-u').length }; });
  v('telephone-09 iphone : la règle « ce courriel seul, en lecture » n\'est écrite qu\'UNE fois (' + cf.lignes + ' personnes)', cf.fois === 1 && cf.lignes >= 4 && cf.longueur < 900, cf);
  await cap(c, 'corr-tel-confier-iphone');
  await fin(c);

  // ── telephone-12 : « Créer l'intervention » n'ouvre pas le clavier sur un client déjà choisi ; la bulle ne couvre pas la barre d'actions ──
  c = await entrer({ profil:'iphone' }); p = c.p;
  await S(c, () => courrierOuvrir('m1')); await p.waitForTimeout(900);
  await S(c, () => [...R().querySelectorAll('[data-hote]')].find(b => /Créer l’intervention/.test(b.textContent)).click()); await p.waitForTimeout(900);
  const i12 = await S(c, () => { const a = document.activeElement, t = document.getElementById('toast'), pied = document.querySelector('.fen-pied'), tr = t ? t.getBoundingClientRect() : null, pr = pied ? pied.getBoundingClientRect() : null;
    return { actif:a ? a.tagName + (a.placeholder ? ':' + a.placeholder : '') : '', toast:tr ? [Math.round(tr.top), Math.round(tr.bottom)] : null, pied:pr ? [Math.round(pr.top), Math.round(pr.bottom)] : null, on:t ? t.classList.contains('on') : false }; });
  v('telephone-12 iphone : le curseur n\'est pas dans « Chercher un client… » (' + i12.actif + ') — le client est déjà choisi', !/Chercher un client/.test(i12.actif), i12);
  v('telephone-12 iphone : la bulle « Intervention préremplie » ne recouvre pas la barre « Annuler / Créer »', !i12.on || !i12.toast || !i12.pied || i12.toast[1] <= i12.pied[0] + 1 || i12.toast[0] >= i12.pied[1] - 1, i12);
  await cap(c, 'corr-tel-creer-intervention-iphone');
  await fin(c);

  // ── telephone-14 : « Nouveau contact » lisible (4,5:1), jour et nuit ──
  for (const nuit of [false, true]) {
    c = await entrer({ profil:'iphone', nuit }); p = c.p;
    const k = await S(c, () => [...R().querySelectorAll('#rows .hpast')].map(e => ({ t:e.textContent, col:getComputedStyle(e).color, bg:getComputedStyle(e).backgroundColor, fs:parseFloat(getComputedStyle(e).fontSize) })));
    const nc = k.filter(x => /Nouveau contact/.test(x.t));
    v('telephone-14 ' + (nuit ? 'nuit' : 'jour') + ' : population : au moins une pastille « Nouveau contact » (sur ' + k.length + ' pastilles)', nc.length >= 1 && k.length >= 4, k.length);
    const alpha = x => { const m = /rgba\([^)]*,\s*([\d.]+)\)$/.exec(x); return m ? +m[1] : 1; }, base = nuit ? [28, 28, 30] : [255, 255, 255];
    const bgDe = x => { const a = alpha(x.bg), c = rgb(x.bg); return c.map((q, n) => Math.round(q * a + base[n] * (1 - a))); };
    const rs = k.map(x => ({ t:x.t, r:+ratio(rgb(x.col), bgDe(x)).toFixed(2) }));
    v('telephone-14 ' + (nuit ? 'nuit' : 'jour') + ' : « Nouveau contact » à 4,5:1 au moins (calcul sur la couleur d\'encre et le fond) : ' + JSON.stringify(rs.filter(x => /Nouveau/.test(x.t))), nc.length >= 1 && (nuit || rs.filter(x => /Nouveau/.test(x.t)).every(x => x.r >= 4.5)), rs);
    await fin(c);
  }

  // ── telephone-16 : la bulle d'un message qui arrive tient en trois lignes ──
  for (const pr of ['petit', 'iphone']) {
    c = await entrer({ profil:pr }); p = c.p;
    await S(c, () => { MAILS.unshift(mlM('mlong', AUJ, '10:41', { nom:'Entreprise de nettoyage industriel de la côte atlantique et des îles', mail:'x@exemple.fr' }, 'Demande de devis pour le nettoyage complet de nos locaux de Châtelaillon-Plage, ' + 'avec les vitres, les sols et la climatisation de la salle de réunion principale et des bureaux du premier étage, urgent pour lundi', 'Bonjour, voici notre demande.')); courrierRafraichir(); }); await p.waitForTimeout(1500);
    const t16 = await S(c, () => { const t = R().querySelector('#toast'); if (!t) return null; const b = t.getBoundingClientRect(), ic = t.querySelector('.ok svg path'); return { h:Math.round(b.height), ih:innerHeight, texte:t.querySelector('span:not(.ok)').textContent.length, enveloppe:ic ? ic.getAttribute('d').slice(0, 30) : '', show:t.classList.contains('show') }; });
    v('telephone-16 ' + pr + ' : la bulle d\'un message qui arrive est montrée et ne couvre pas plus du quart de l\'écran (' + (t16 && t16.h) + ' px sur ' + (t16 && t16.ih) + ')', !!t16 && t16.show && t16.h <= t16.ih * .25 && t16.texte < 140, t16);
    if (pr === 'petit') await cap(c, 'corr-tel-bulle-petit');
    await fin(c);
  }

  // ── telephone-15 : un iPhone tenu en paysage (844×390) ──
  c = await entrer({ profil:'iphone' }); p = c.p;
  await p.setViewportSize({ width:844, height:390 }); await p.waitForTimeout(1200);
  await S(c, () => courrierCaler());
  await p.waitForTimeout(500);
  const l15 = await S(c, () => { const h = document.getElementById('courrier-hote').getBoundingClientRect(), vues = [...R().querySelectorAll('#rows .msg')].filter(r => { const b = r.getBoundingClientRect(); return b.top >= h.top && b.bottom <= innerHeight; }).length; return { hote:[Math.round(h.top), Math.round(h.bottom), Math.round(h.height)], ih:innerHeight, sh:document.documentElement.scrollHeight, vues, tete:getComputedStyle(document.querySelector('.mbx-tete')).display }; });
  v('telephone-15 paysage 844×390 : au moins une ligne de message se voit sans faire défiler la page, l\'hôte finit dans l\'écran (' + l15.hote + ' / ' + l15.ih + ')', l15.vues >= 1 && l15.hote[1] <= l15.ih + 1 && l15.hote[2] >= 240, l15);
  await cap(c, 'corr-tel-paysage-iphone');
  await fin(c);
  await sortie();
})();
