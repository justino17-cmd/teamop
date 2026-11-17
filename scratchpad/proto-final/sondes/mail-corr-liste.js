// Boîte mail, étape 4 « corriger » (17 novembre 2026) — la LISTE, les dossiers, les catégories, la mise en page ordinateur.
// Rejoue chef-01, ordinateur-01, -02, -03, -05, -13, -14, -20 de scratchpad/proto-final/refonte/mail-relecture-*.json. ✓ = corrigé.
// Chaque contrôle dit ce qu'il a mesuré ; une population vide ne passe pas (on compte les catégories, les dossiers, les boutons avant de croire un « zéro »).
const { lib, v, entrer, cap, fin, sortie, ouvrirMsg, casserBoite } = require('./mail-commun.js');
const S = (c, f, a) => c.p.evaluate(f, a);
(async () => {
  // ── chef-01 : à l'ouverture, aucun message d'erreur ; deux boîtes connectées ──
  let c = await entrer({ profil:'mac' }), p = c.p;
  const ouv = await S(c, () => ({ alerte:!!R().querySelector('.loaderr'), vide:!!R().querySelector('.empty[role=alert]'), etats:ML_BOITES.map(b => b.etat), nb:R().querySelectorAll('.msg').length }));
  v('chef-01 à l\'ouverture : aucun bandeau rouge, aucun écran d\'erreur, deux boîtes connectées, des messages (population comptée)', !ouv.alerte && !ouv.vide && ouv.etats.length === 2 && ouv.etats.every(e => e === 'ok') && ouv.nb >= 5, ouv);
  await cap(c, 'corr-liste-mac-jour');
  // ── ordinateur-01 : le nombre sous le titre est celui de TOUTE la boîte, jamais collé au nom d'une catégorie ──
  const cats = ['principal', 'notif', 'recus', 'voyages', 'promos', 'tout'], sub = [];
  for (const k of cats) { await S(c, x => R().querySelector('#catBar [data-cat="' + x + '"]').click(), k); await p.waitForTimeout(250);
    sub.push(await S(c, () => ({ t:R().querySelector('#lbSub').innerText.replace(/\s+/g, ' ').trim(), badge:+(((R().querySelector('[data-folder=inbox] .cnt') || {}).textContent || '0').match(/\d+/) || [0])[0], lignes:R().querySelectorAll('#rows .msg.unread').length }))); }
  v('ordinateur-01 six catégories jouées', sub.length === 6, sub.length);
  v('ordinateur-01 le sous-titre ne porte le nom d\'aucune catégorie et dit le nombre de la BOÎTE (celui du dossier), « en tout » quand une catégorie est ouverte',
    sub.every((s, i) => !/Principal|Notifications|Factures|Voyages|Promotions/.test(s.t) && s.t.indexOf(s.badge + ' non lu') === (s.t.indexOf('·') < 0 ? 0 : s.t.indexOf(s.badge + ' non lu')) && s.t.includes(s.badge + ' non lu') && (cats[i] === 'tout' || /en tout/.test(s.t))), sub);
  // ── ordinateur-13 : la lisibilité des commandes (souris : 14 px et 34 px au moins) ──
  await S(c, () => R().querySelector('#catBar [data-cat="principal"]').click()); await p.waitForTimeout(200);
  const tailles = await S(c, () => { const t = (s, e) => { const x = R().querySelector(s); return x ? { fs:parseFloat(getComputedStyle(x).fontSize), h:Math.round(x.getBoundingClientRect().height) } : null; };
    return { recherche:t('#search'), champ:t('#searchBox'), filtre:t('#filters button'), dossier:t('[data-folder=inbox]'), cat:t('#catBar .cat'), cnt:t('[data-folder=inbox] .cnt'), sous:t('#lbSub'), pastille:t('.hpast') }; });
  v('ordinateur-13 la recherche : texte ≥ 14 px, champ ≥ 34 px de haut', tailles.recherche && tailles.recherche.fs >= 14 && tailles.champ.h >= 34, tailles.recherche && [tailles.recherche, tailles.champ]);
  v('ordinateur-13 filtres, dossiers, catégories ≥ 14 px ; nombres ≥ 13 px ; sous-titre ≥ 12,5 px ; pastilles ≥ 12 px', tailles.filtre.fs >= 14 && tailles.dossier.fs >= 14 && tailles.cat.fs >= 14 && tailles.cnt.fs >= 13 && tailles.sous.fs >= 12.5 && tailles.pastille.fs >= 12, tailles);
  // ── ordinateur-14 : « 2 sélectionnés » en entier ──
  await S(c, () => R().querySelector('#btnSelect').click()); await p.waitForTimeout(250);
  await S(c, () => R().querySelectorAll('#rows .msg')[0].click()); await p.waitForTimeout(200); await S(c, () => R().querySelectorAll('#rows .msg')[1].click()); await p.waitForTimeout(300);
  const sel = await S(c, () => { const e = R().querySelector('#selBar .sc'), b = R().querySelector('#selBar').getBoundingClientRect(); return e ? { t:e.textContent, tronque:e.scrollWidth > e.clientWidth + 1, deborde:R().querySelector('#selBar').scrollWidth > R().querySelector('#selBar').clientWidth + 1 } : null; });
  v('ordinateur-14 « 2 sélectionnés » n\'est pas coupé et la barre ne déborde pas (mac 1440)', !!sel && /2 sélectionnés/.test(sel.t) && !sel.tronque && !sel.deborde, sel);
  await fin(c);
  // ── ordinateur-20 : les six catégories se voient, sur quatre profils ──
  for (const pr of ['mac', 'windows', 'mac720', 'ipad']) {
    c = await entrer({ profil:pr }); p = c.p;
    const k = await S(c, () => { const b = R().querySelector('#catBar'), br = b.getBoundingClientRect(); const l = [...b.querySelectorAll('.cat')].map(x => { const r = x.getBoundingClientRect(); return { t:x.textContent.trim(), dedans:r.left >= br.left - 1 && r.right <= br.right + 1 && r.width > 10, coupe:x.scrollWidth > x.clientWidth + 1 }; }); return { n:l.length, l, deborde:b.scrollWidth > b.clientWidth + 1, lignes:new Set([...b.querySelectorAll('.cat')].map(x => Math.round(x.getBoundingClientRect().top))).size }; });
    v('ordinateur-20 ' + pr + ' : les six catégories sont TOUTES dans la colonne, entières, sans rien à faire défiler (' + k.lignes + ' rangée(s))', k.n === 6 && k.l.every(x => x.dedans && !x.coupe) && !k.deborde && k.lignes <= 3, k);
    if (pr === 'windows') {
      await cap(c, 'corr-liste-windows-jour');
      // ── ordinateur-05 : le pied de colonne ne recouvre pas « Archive » ; un fondu dit qu'on peut défiler ──
      await S(c, () => { const s = R().querySelector('#sideScroll'); s.scrollTop = s.scrollHeight; }); await p.waitForTimeout(300);
      const pied = await S(c, () => { const f = R().querySelector('.side-foot').getBoundingClientRect(), t = R().querySelector('[data-folder=trash]').getBoundingClientRect(), a = R().querySelector('[data-folder=archive]').getBoundingClientRect(); const fade = getComputedStyle(R().querySelector('.side-foot'), '::before');
        return { piedHaut:Math.round(f.top), corbeilleBas:Math.round(t.bottom), archiveBas:Math.round(a.bottom), fondu:fade.content !== 'none' && parseFloat(fade.height) > 10, defile:R().querySelector('#sideScroll').scrollHeight > R().querySelector('#sideScroll').clientHeight }; });
      v('ordinateur-05 windows 1366×768 : au bout du défilement, Archive, Indésirable et Corbeille sont AU-DESSUS du pied (rien n\'est recouvert)', pied.corbeilleBas <= pied.piedHaut + 1 && pied.archiveBas <= pied.piedHaut + 1, pied);
      v('ordinateur-05 la colonne défile (population) et un fondu au-dessus du pied le dit', pied.defile && pied.fondu, pied);
    }
    if (pr === 'mac720' || pr === 'ipad') {
      // ── ordinateur-03 : le petit titre de la liste défilée ne tombe pas sur « Sélectionner » (format tablette du module) ──
      for (const nuit of [false, true]) { await S(c, n => { document.documentElement.dataset.mode = n ? 'nuit' : 'jour'; }, nuit); await p.waitForTimeout(250);
        await S(c, () => { const s = R().querySelector('#listScroll'); s.scrollTop = 240; s.dispatchEvent(new Event('scroll')); }); await p.waitForTimeout(500);
        const t = await S(c, () => { const a = R().querySelector('#lbTitle').getBoundingClientRect(), b = R().querySelector('#btnSelect').getBoundingClientRect(), n = R().querySelector('#btnNav').getBoundingClientRect(); const fmt = R().querySelector('.opc').dataset.fmt, vis = parseFloat(getComputedStyle(R().querySelector('.lb-titles')).opacity);
          return { fmt, vis, titre:[Math.round(a.left), Math.round(a.right)], select:[Math.round(b.left), Math.round(b.right)], nav:[Math.round(n.left), Math.round(n.right)], scrolled:R().querySelector('#list').classList.contains('scrolled') }; });
        v('ordinateur-03 ' + pr + (nuit ? ' nuit' : ' jour') + ' : liste défilée, le titre (' + t.titre + ') ne touche ni « Sélectionner » (' + t.select + ') ni « Boîtes » (' + t.nav + ')', t.scrolled && t.vis > 0.9 && t.titre[1] <= t.select[0] + 1 && t.titre[0] >= t.nav[1] - 1, t); }
      await S(c, () => { document.documentElement.dataset.mode = 'jour'; });
    }
    await fin(c);
  }
  // ── ordinateur-02 : seule la boîte b2 ne répond pas ; les dossiers locaux ne le disent pas, les autres listes vides disent « Aucun message » AVEC le bandeau ──
  c = await entrer({ profil:'mac' }); p = c.p; await casserBoite(c);
  const rep = {};
  for (const f of ['drafts', 'scheduled', 'flagged', 'archive', 'trash', 's_encours', 's_moi', 'inbox']) { await S(c, x => R().querySelector('[data-folder="' + x + '"]').click(), f); await p.waitForTimeout(250);
    rep[f] = await S(c, () => ({ lignes:R().querySelectorAll('#rows .msg').length, indispo:/Réception indisponible/.test(R().querySelector('#listScroll').textContent), bandeau:!!R().querySelector('#rows .loaderr'), vide:((R().querySelector('#rows .empty b') || {}).textContent || ''), sub:R().querySelector('#lbSub').innerText.replace(/\s+/g, ' ').trim() })); }
  v('ordinateur-02 huit dossiers parcourus', Object.keys(rep).length === 8, Object.keys(rep));
  v('ordinateur-02 aucun dossier ne répond « Réception indisponible » quand UNE boîte sur deux est en panne', Object.values(rep).every(x => !x.indispo && !/indisponible/.test(x.sub)), rep);
  v('ordinateur-02 Brouillons et À envoyer plus tard (locaux) : ni bandeau ni « réception indisponible », le sous-titre dit « aucun brouillon » / « aucun envoi programmé »', ['drafts', 'scheduled'].every(f => !rep[f].bandeau && !rep[f].indispo && (/aucun (brouillon|envoi programmé)/.test(rep[f].sub) || rep[f].lignes > 0)), { drafts:rep.drafts, scheduled:rep.scheduled });
  v('ordinateur-02 les listes vides des dossiers de la boîte portent le bandeau de la boîte en panne et « Aucun message »', ['archive', 'trash', 's_encours', 's_moi', 'flagged'].filter(f => rep[f].lignes === 0).every(f => rep[f].bandeau && /Aucun/.test(rep[f].vide)) && ['archive', 'trash', 's_encours', 's_moi', 'flagged'].some(f => rep[f].lignes === 0), rep);
  // toutes les boîtes en panne : une seule vérité, l'adresse n'est écrite qu'une fois (telephone-07)
  await S(c, () => { ML_BOITES[0].etat = 'reco'; ML_BOITES[0].vu = 'le 28 oct.'; return COURRIER.inst.rafraichir(); }); await p.waitForTimeout(900);
  await S(c, () => R().querySelector('[data-folder=archive]').click()); await p.waitForTimeout(300);
  const tout = await S(c, () => { const e = R().querySelector('#rows .empty'); return e ? { t:e.textContent.replace(/\s+/g, ' ').trim(), b:e.querySelector('b').textContent } : null; });
  v('ordinateur-02 / telephone-07 toutes les boîtes en panne : « Réception indisponible », et chaque adresse n\'est écrite qu\'UNE fois', !!tout && /Réception indisponible/.test(tout.b) && (tout.t.match(/marc@climservices17\.fr/g) || []).length === 1 && (tout.t.match(/contact@climservices17\.fr/g) || []).length === 1, tout);
  await fin(c);
  await sortie();
})();
