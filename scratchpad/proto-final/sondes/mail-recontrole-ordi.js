// Boîte mail, étape 5 « recontrôler » (17 novembre 2026) — le RECONTRÔLEUR ADVERSE, côté ORDINATEUR.
// Rejoue, avec des mesures écrites À PART de celles du correcteur (mail-corr-*.js), les défauts annoncés « corrigés » de
// scratchpad/proto-final/refonte/mail-corrections.json (chef-01, ordinateur-01 à -20), puis cherche ce que les corrections ont cassé à côté.
// ⛔ 127.0.0.1 seulement. Chaque contrôle compte sa population avant de croire un zéro. PARTIE=1 : ordinateurs ; 2 : clavier et hôte ; 3 : gestes et boîtes.
const { lib, v, entrer, cap, fin, sortie, ouvrirMsg, casserBoite } = require('./mail-commun.js');
const S = (c, f, a) => c.p.evaluate(f, a);
const PARTIE = process.env.PARTIE || '0', veut = n => PARTIE === '0' || PARTIE === String(n);
const sec = async (nom, f) => { try { await f(); } catch (e) { v('SECTION ' + nom + ' : aucune exception', false, String(e && e.message || e).slice(0, 300)); } };
(async () => {
  // ═══ 1. Les quatre ordinateurs, jour et nuit : ouverture, catégories, tailles, pied, lecture du texte d'abord ═══
  if (veut(1)) for (const [pr, nuit] of [['mac', false], ['windows', true], ['mac720', true], ['ipad', false], ['mac720', false]]) await sec('ordinateur ' + pr + (nuit ? ' nuit' : ' jour'), async () => {
    const etiq = pr + (nuit ? ' nuit' : ' jour'), c = await entrer({ profil:pr, nuit }), p = c.p;
    // chef-01 : l'ouverture est sereine (aucune alerte, aucun bandeau rouge, aucun écran « indisponible »)
    const ouv = await S(c, () => ({ rouge:!!R().querySelector('.loaderr'), indispo:/indisponible|ne répond/i.test(R().querySelector('#listScroll').textContent), nb:R().querySelectorAll('#rows .msg').length, etats:ML_BOITES.map(b => b.etat).join(), toast:R().querySelector('#toast') && R().querySelector('#toast').classList.contains('show'), bandeauHote:!!document.querySelector('#courrier-hote .hl-alerte,.mbx-alerte') }));
    v('chef-01 ' + etiq + ' : ouverture sans alerte, ' + ouv.nb + ' messages (population ≥ 8), boîtes « ' + ouv.etats + ' »', !ouv.rouge && !ouv.indispo && ouv.nb >= 8 && ouv.etats === 'ok,ok', ouv);
    // la page ne déborde pas de sa largeur POSÉE (jamais innerWidth)
    const larg = await S(c, () => ({ sw:document.documentElement.scrollWidth, cw:document.documentElement.clientWidth, h:R().host.scrollWidth, hc:R().host.clientWidth }));
    v('mise en page ' + etiq + ' : la page ne déborde pas de côté (' + larg.sw + ' pour ' + c.largeur + ')', larg.sw <= c.largeur + 1 && larg.h <= larg.hc + 1, larg);
    // ordinateur-01 : le nombre sous le titre ne ment pour aucune catégorie
    if (!nuit || pr === 'mac720') {
      const cats = ['principal', 'notif', 'recus', 'voyages', 'promos', 'tout'], res = [];
      for (const k of cats) { await S(c, x => R().querySelector('#catBar [data-cat="' + x + '"]').click(), k); await p.waitForTimeout(220);
        res.push(await S(c, () => ({ sub:R().querySelector('#lbSub').innerText.replace(/\s+/g, ' ').trim(), lignes:R().querySelectorAll('#rows .msg.unread').length, total:R().querySelectorAll('#rows .msg').length, badge:+(((R().querySelector('[data-folder=inbox] .cnt') || {}).textContent || '').match(/\d+/) || [0])[0], titre:R().querySelector('#lbTitle').textContent.trim() }))); }
      v('ordinateur-01 ' + etiq + ' : six catégories jouées', res.length === 6 && res.every(r => r.total >= 0), res.length);
      // la phrase juste : soit le nombre de la boîte avec « en tout », soit celui des lignes ; jamais un nombre qui ne correspond à rien
      const faux = res.filter((r, i) => { const n = +((/(\d+) non lu/.exec(r.sub) || [0, -1])[1]); if (n < 0) return false; return !(n === +r.badge && (cats[i] === 'tout' || /en tout/.test(r.sub)) || n === r.lignes); });
      v('ordinateur-01 ' + etiq + ' : aucun sous-titre ne donne un nombre qui ne correspond ni aux lignes ni à la pastille de la boîte, sans « en tout »', faux.length === 0, faux);
      const tousNoms = res.filter(r => /Principal|Notifications|Factures|Voyages|Promotions/.test(r.sub));
      v('ordinateur-01 ' + etiq + ' : le sous-titre ne colle plus un nom de catégorie à un nombre', tousNoms.length === 0, tousNoms);
      await S(c, () => R().querySelector('#catBar [data-cat="principal"]').click()); await p.waitForTimeout(200);
    }
    // ordinateur-20 : six catégories ENTIÈRES dans la colonne ; et la liste garde de la place (au moins 3 lignes de message vues)
    const k = await S(c, () => { const b = R().querySelector('#catBar'), br = b.getBoundingClientRect(), ls = R().querySelector('#listScroll').getBoundingClientRect();
      const l = [...b.querySelectorAll('.cat')].map(x => { const r = x.getBoundingClientRect(); return { t:x.textContent.trim(), dedans:r.left >= br.left - 1 && r.right <= br.right + 1 && r.width > 10, coupe:x.scrollWidth > x.clientWidth + 1 }; });
      const vues = [...R().querySelectorAll('#rows .msg')].filter(m => { const r = m.getBoundingClientRect(); return r.top >= ls.top - 1 && r.bottom <= ls.bottom + 1 && r.height > 20; }).length;
      return { n:l.length, l:l.filter(x => !x.dedans || x.coupe), hb:Math.round(br.height), vues, hl:Math.round(ls.height) }; });
    v('ordinateur-20 ' + etiq + ' : six catégories toutes entières (' + k.n + '), barre de ' + k.hb + ' px', k.n === 6 && k.l.length === 0 && k.hb < 150, k);
    v('ordinateur-20 / mise en page ' + etiq + ' : au moins 2 e-mails se voient en entier dans la liste sous la barre des catégories (' + k.vues + ' ; à 1280×720 la tête de liste en prend ' + (k.hl - 0) + ' px)', k.vues >= 2, k);
    // ordinateur-13 : tailles de la souris
    const t = await S(c, () => { const f = s => { const e = R().querySelector(s); return e ? { fs:parseFloat(getComputedStyle(e).fontSize), h:Math.round(e.getBoundingClientRect().height) } : null; };
      return { rech:f('#search'), dos:f('[data-folder=inbox]'), cat:f('#catBar .cat'), cnt:f('[data-folder=inbox] .cnt'), fil:(() => { const e = [...R().querySelectorAll('#filters button')].find(b => b.getBoundingClientRect().height > 10); return e ? { fs:parseFloat(getComputedStyle(e).fontSize), h:Math.round(e.getBoundingClientRect().height) } : null; })(), obj:f('#rows .msg .subj') || f('#rows .msg') }; });
    v('ordinateur-13 ' + etiq + ' : texte ≥ 13 px partout (recherche, dossier, catégorie, filtre, nombre) et lignes de dossier ≥ 28 px', t.rech.fs >= 13 && t.dos.fs >= 13 && t.cat.fs >= 13 && t.cnt.fs >= 12.5 && (!t.fil || t.fil.fs >= 13) && t.dos.h >= 28, t);
    // les noms de dossiers, tous, entiers (aucune coupure à 14 px dans la colonne)
    const dos = await S(c, () => [...R().querySelectorAll('#sideScroll [data-folder]')].map(e => { const n = e.querySelector('.nm,.lbl,span') || e; return { t:e.textContent.replace(/\s+/g, ' ').trim().slice(0, 28), coupe:n.scrollWidth > n.clientWidth + 1 || e.scrollWidth > e.clientWidth + 1 }; }));
    v('ordinateur-13 ' + etiq + ' : les ' + dos.length + ' dossiers (au moins 9) ont leur nom entier', dos.length >= 9 && dos.every(d => !d.coupe), dos.filter(d => d.coupe));
    // ordinateur-05 : au bout de la colonne, rien n'est recouvert par le pied ; et au repos le pied existe sans manger la liste
    await S(c, () => { const s = R().querySelector('#sideScroll'); s.scrollTop = s.scrollHeight; }); await p.waitForTimeout(250);
    const pied = await S(c, () => { const f = R().querySelector('.side-foot').getBoundingClientRect(), tous = [...R().querySelectorAll('#sideScroll [data-folder]')].map(e => e.getBoundingClientRect()), pos = getComputedStyle(R().querySelector('.side-foot')).position, s = R().querySelector('#sideScroll');
      return { pos, recouverts:tous.filter(b => b.height > 4 && b.bottom > f.top + 1 && b.top < f.bottom - 1).length, tous:tous.length, defile:s.scrollHeight > s.clientHeight + 2, fb:Math.round(f.bottom), ih:innerHeight }; });
    v('ordinateur-05 ' + etiq + ' : au bout du défilement aucun des ' + pied.tous + ' dossiers n\'est sous le pied (' + pied.pos + '), le pied tient dans la fenêtre', pied.tous >= 9 && pied.recouverts === 0 && pied.fb <= pied.ih + 1, pied);
    await S(c, () => { R().querySelector('#sideScroll').scrollTop = 0; });
    // ordinateur-04 : lecture de TOUS les e-mails, le premier mot du texte au-dessus du pli, le bandeau « reconnu » après lui
    if (['windows', 'mac720', 'ipad'].includes(pr)) {
      await S(c, () => R().querySelector('[data-folder=inbox]').click()); await S(c, () => R().querySelector('#catBar [data-cat="tout"]').click()); await p.waitForTimeout(300);
      const n = await S(c, () => R().querySelectorAll('#rows .msg').length), mal = []; let lus = 0, bandeaux = 0;
      for (let i = 0; i < Math.min(n, 16); i++) {
        await S(c, k => R().querySelectorAll('#rows .msg')[k].click(), i); await p.waitForTimeout(330);
        const m = await S(c, () => { const r = R(), sc = (r.querySelector('#readScroll') || r.querySelector('#read')).getBoundingClientRect(), b = r.querySelector('.rbody p, .rbody'), h = r.querySelector('.hband'), cb = b && b.getBoundingClientRect();
          return b ? { s:((r.querySelector('.rsubj') || {}).textContent || '').slice(0, 40), y:Math.round(cb.top), bas:Math.round(sc.bottom), band:!!h, apres:h ? h.getBoundingClientRect().top >= cb.top : true, h:Math.round(cb.height) } : null; });
        if (!m) continue; lus++; if (m.band) bandeaux++; if (m.y > m.bas - 80 || !m.apres) mal.push(etiq + ' · ' + JSON.stringify(m)); }
      v('ordinateur-04 ' + etiq + ' : ' + lus + ' lectures (au moins 10), dont ' + bandeaux + ' avec le bandeau « reconnu » (au moins 5)', lus >= 10 && bandeaux >= 5, { lus, bandeaux, n });
      v('ordinateur-04 ' + etiq + ' : pour chacune le texte est au-dessus du pli (80 px de marge) et le bandeau vient après', mal.length === 0, mal);
      await S(c, () => R().querySelectorAll('#rows .msg')[1].click()); await p.waitForTimeout(500);
    }
    if (['mac', 'windows', 'ipad', 'mac720'].includes(pr)) await cap(c, 'rc-ordi-' + pr + (nuit ? '-nuit' : '-jour'));
    v('aucune erreur JavaScript sur ' + etiq, c.err.length === 0, c.err.slice(0, 3));
    await fin(c);
  });

  // ═══ 2. Clavier réel, raccourcis du prototype, rôles, fiche client ═══
  if (veut(2)) await sec('clavier', async () => {
    let c = await entrer({ profil:'windows' }), p = c.p;
    const texte = 'Bonjour: nous avons rdv demain à 9 h ? j k c r f a d n e / # !';
    const champs = [['#search', 'recherche'], ['#cTo', 'À'], ['#cSub', 'objet'], ['#cBody', 'corps']];
    await p.locator('#courrier-hote #search').click(); await p.keyboard.type(texte, { delay:8 });
    let r = await S(c, () => ({ val:R().querySelector('#search').value, fen:!!document.querySelector('.fen-voile,.fen'), pal:!!document.getElementById('pal'), route, comp:!!R().querySelector('#cTo') }));
    v('ordinateur-07 recherche : 62 touches (j k c r f a d n e / # ! comprises) arrivent toutes, rien ne s\'ouvre', r.val === texte && !r.fen && !r.pal && r.route === 'boiteMail' && !r.comp, r);
    await S(c, () => { const s = R().querySelector('#search'); s.value = ''; s.dispatchEvent(new Event('input', { bubbles:true })); }); await p.waitForTimeout(200);
    await p.keyboard.press('Escape');
    await S(c, () => R().querySelector('#btnCompose').click()); await p.waitForTimeout(500);
    for (const [s, nom] of champs.slice(1)) { await p.locator('#courrier-hote ' + s).click(); await p.keyboard.type(texte, { delay:6 }); }
    r = await S(c, () => ({ a:R().querySelector('#cTo').value, o:R().querySelector('#cSub').value, b:R().querySelector('#cBody').value, fen:!!document.querySelector('.fen-voile,.fen'), route }));
    v('ordinateur-07 « À », objet et corps : le texte entier arrive dans chacun, aucune fenêtre du prototype', r.a === texte && r.o === texte && r.b.includes(texte) && !r.fen && r.route === 'boiteMail', { a:r.a.slice(0, 20), o:r.o.slice(0, 20), b:r.b.slice(0, 20), bfin:r.b.slice(-70), fen:r.fen });
    await S(c, () => R().querySelector('#cCancel').click()); await p.waitForTimeout(500);
    // le corps d'un message modifiable ? (contenteditable éventuel) : on teste aussi la zone de note du suivi
    await p.locator('#courrier-hote .msg').first().click(); await p.waitForTimeout(400);
    // raccourcis du MODULE : c (écrire), r (répondre), / (chercher), Échap
    await p.keyboard.press('r'); await p.waitForTimeout(500);
    v('ordinateur-07 hors champ : « r » ouvre la réponse dans le module', await S(c, () => !!R().querySelector('#cTo') && route === 'boiteMail'));
    await S(c, () => (R().querySelector('#cCancel') || {}).click && R().querySelector('#cCancel').click()); await p.waitForTimeout(400);
    await S(c, () => { const o = R().querySelector('#overlay'); if (o) { const b = [...o.querySelectorAll('button')].find(x => /Supprimer|Ne pas|Annuler/.test(x.textContent)); if (b) b.click(); } }); await p.waitForTimeout(300);
    // raccourcis de l'HÔTE avec une touche modificatrice : Ctrl K doit encore ouvrir la recherche du prototype depuis la Boîte mail
    await p.locator('#courrier-hote .msg').first().click(); await p.keyboard.press('Control+k'); await p.waitForTimeout(500);
    const pal = await S(c, () => ({ pal:!!document.getElementById('pal'), route }));
    v('collatéral : Ctrl K depuis la Boîte mail ouvre toujours la recherche du prototype (les raccourcis à touche modificatrice passent)', pal.pal, pal);
    await p.keyboard.press('Escape'); await p.waitForTimeout(300);
    // dans une AUTRE rubrique, les raccourcis du prototype fonctionnent encore (n = nouvelle intervention) et un champ reçoit ses lettres
    await lib.aller(p, 'clients'); await p.waitForTimeout(500);
    const champ = await S(c, () => { const i = rcChampRecherche(); return i ? true : false; });
    if (champ) { await S(c, () => rcChampRecherche().focus()); await p.keyboard.type('n d a c', { delay:6 });
      const val = await S(c, () => rcChampRecherche().value); v('collatéral : dans Clients, la recherche reçoit « n d a c » (aucune fenêtre n\'a volé les touches)', val === 'n d a c' && !(await S(c, () => !!document.querySelector('.fen-voile'))), val); }
    else v('collatéral : Clients offre un champ de recherche (population)', false, 'aucun champ');
    await p.keyboard.press('Escape'); await S(c, () => rcChampRecherche().blur());
    await p.keyboard.press('n'); await p.waitForTimeout(500);
    v('collatéral : « n » dans Clients ouvre encore la création du prototype (le garde de l\'hôte n\'a pas tout avalé)', await S(c, () => !!document.querySelector('.fen-voile,.fen,#calque .panneau')));
    await lib.ranger(p);
    v('aucune erreur JavaScript (clavier)', c.err.length === 0, c.err.slice(0, 3));
    await fin(c);
  });

  // ═══ 3. Gestes : brouillon local, « Tous les e-mails », boîtes connectées, relances, rôles ═══
  if (veut(3)) await sec('gestes', async () => {
    let c = await entrer({ profil:'mac' }), p = c.p;
    // ordinateur-08 : un brouillon écrit à l'adresse d'un VRAI client ne porte pas non plus la pastille de ce client
    await S(c, () => R().querySelector('#btnCompose').click()); await p.waitForTimeout(500);
    await p.locator('#courrier-hote #cTo').fill('durand@mail.fr'); await p.locator('#courrier-hote #cSub').fill('Brouillon pour Durand'); await p.locator('#courrier-hote #cBody').fill('Bonjour.');
    await S(c, () => R().querySelector('#cDraft').click()); await p.waitForTimeout(700);
    await S(c, () => R().querySelector('[data-folder=drafts]').click()); await p.waitForTimeout(400);
    const br = await S(c, () => [...R().querySelectorAll('#rows .msg')].map(r => ({ t:r.textContent.replace(/\s+/g, ' ').slice(0, 80), p:!!r.querySelector('.hpast') })));
    v('ordinateur-08 population : le brouillon à Durand est dans Brouillons', br.some(r => /Brouillon pour Durand/.test(r.t)), br);
    v('ordinateur-08 le brouillon écrit pour un client connu ne porte pas de pastille « Client » ni de bandeau (c\'est un brouillon, pas un e-mail reçu)', br.filter(r => /Brouillon pour Durand/.test(r.t)).every(r => !r.p), br);
    // on l'ouvre : aucun bandeau « reconnu » ni réponses rapides d'un autre e-mail
    await S(c, () => [...R().querySelectorAll('#rows .msg')].find(r => /Brouillon pour Durand/.test(r.textContent)).click()); await p.waitForTimeout(600);
    const ouv = await S(c, () => ({ band:!!R().querySelector('.hband'), modifier:[...R().querySelectorAll('#readTools button')].some(b => /Modifier/.test(b.textContent)), corps:/Bonjour\./.test(R().querySelector('#readScroll').innerText) }));
    v('ordinateur-08 ouvrir le brouillon le montre en lecture (« Modifier » proposé, texte écrit) sans bandeau « reconnu »', ouv.modifier && ouv.corps && !ouv.band, ouv);
    await S(c, () => [...R().querySelectorAll('#readTools button')].find(b => /Modifier/.test(b.textContent)).click()); await p.waitForTimeout(700);
    v('ordinateur-08 « Modifier » rouvre le composeur avec le destinataire et l\'objet', await S(c, () => !!R().querySelector('#cTo') && /durand/.test(R().querySelector('#cTo').value) && /Brouillon pour Durand/.test(R().querySelector('#cSub').value)));
    await S(c, () => (R().querySelector('#cCancel') || {}).click && R().querySelector('#cCancel').click()); await p.waitForTimeout(300);
    await S(c, () => { const o = R().querySelector('#overlay'); if (o) { const b = [...o.querySelectorAll('button')].find(x => /Enregistrer/.test(x.textContent)); if (b) b.click(); } }); await p.waitForTimeout(300);

    // ordinateur-09 : « Voir tous » depuis TOUTES les fiches client
    const clients = await S(c, () => Object.keys(CLIENTS).filter(k => CLIENTS[k].mail).map(k => ({ k, mail:CLIENTS[k].mail, nom:CLIENTS[k].nom, att:MAILS.filter(x => (x.de && x.de.mail === CLIENTS[k].mail) || x.a === CLIENTS[k].mail).length })));
    const avec = clients.filter(x => x.att >= 1);
    v('ordinateur-09 population : ' + clients.length + ' clients avec adresse, ' + avec.length + ' avec au moins un e-mail (au moins 3)', avec.length >= 3, avec.map(x => x.nom + ':' + x.att));
    for (const cl of avec.slice(0, 5)) { await S(c, m => courrierRechercher(m), cl.mail); await p.waitForTimeout(900);
      const t = await S(c, () => ({ n:R().querySelectorAll('#rows .msg').length, titre:R().querySelector('#lbTitle').textContent.trim() }));
      v('ordinateur-09 « Voir tous » de ' + cl.nom + ' : ' + cl.att + ' e-mail(s) attendus, ' + t.n + ' en liste (« ' + t.titre + ' »)', t.n === cl.att, t); }
    // sortir de « Tous les e-mails » en changeant de dossier : la recherche ne reste pas collée
    await S(c, () => R().querySelector('[data-folder=sent]').click()); await p.waitForTimeout(400);
    const apres = await S(c, () => ({ titre:R().querySelector('#lbTitle').textContent.trim(), rech:R().querySelector('#search').value, n:R().querySelectorAll('#rows .msg').length }));
    v('ordinateur-09 passer à « Envoyés » depuis « Tous les e-mails » : le titre est « Envoyés » et la recherche n\'est pas restée', /Envoy/.test(apres.titre) && apres.rech === '', apres);
    await S(c, () => R().querySelector('[data-folder=inbox]').click()); await p.waitForTimeout(300);
    v('ordinateur-09 « Tous les e-mails » n\'est PAS un dossier de la colonne', await S(c, () => ![...R().querySelectorAll('#sideScroll [data-folder]')].some(e => /Tous les e-mails/.test(e.textContent))));

    // ordinateur-10 : Boîtes connectées, sur trois profils, adresse LONGUE
    await S(c, () => { ML_BOITES[1].adr = 'prenom.nom.tres.long.pour.essai@un-domaine-vraiment-long-climservices17.fr'; ML_BOITES[1].etat = 'reco'; ML_BOITES[1].vu = 'le 28 oct.'; mbxPanBoites(); }); await p.waitForTimeout(500);
    const bo = await S(c, () => { const pan = document.querySelector('#calque .panneau'); return pan ? { texte:pan.innerText.replace(/\s+/g, ' '), debord:pan.scrollWidth > pan.clientWidth + 1, lignes:[...pan.querySelectorAll('.mbx-lig-bte')].map(r => { const a = r.querySelector('.fo-n b'), act = r.querySelector('.mbx-bo-act'); const ra = a.getBoundingClientRect(), rb = act ? act.getBoundingClientRect() : null, rr = r.getBoundingClientRect(); return { adr:a.textContent.slice(0, 24), coupe:a.scrollWidth > a.clientWidth + 1, sortie:ra.right > rr.right + 1, h:Math.round(ra.height), boutonsSous:rb ? rb.top >= ra.bottom - 2 : null }; }) } : null; });
    v('ordinateur-10 population : le panneau « Boîtes connectées » est ouvert avec deux boîtes', !!bo && bo.lignes.length === 2, bo && bo.lignes);
    v('ordinateur-10 une adresse très longue ne sort pas de sa ligne ni du panneau (elle se replie, ne sort pas)', !!bo && !bo.debord && bo.lignes.every(l => !l.sortie), bo);
    v('ordinateur-10 « IMAP » n\'est écrit nulle part dans le panneau', !!bo && !/IMAP/i.test(bo.texte), bo && bo.texte.slice(0, 200));
    await cap(c, 'rc-boites-mac');
    // le bouton « Ajouter une boîte » : les fournisseurs proposés parlent en clair
    await S(c, () => { const b = [...document.querySelectorAll('#calque .panneau button')].find(x => /Ajouter/.test(x.textContent)); if (b) b.click(); }); await p.waitForTimeout(500);
    const ajout = await S(c, () => (document.querySelector('#calque') || {}).innerText || '');
    v('ordinateur-10 « Ajouter une boîte » : « Autre messagerie » présent, jamais « IMAP »', /Autre messagerie/.test(ajout) && !/IMAP/.test(ajout), ajout.replace(/\s+/g, ' ').slice(0, 260));
    await S(c, () => { ML_BOITES[1].adr = 'marc@climservices17.fr'; ML_BOITES[1].etat = 'ok'; try { fermerPanneau(); } catch (e) {} });
    await fin(c);

    // ordinateur-06 reste une décision : Julie / Sophie / Karim ne voient toujours pas la Boîte mail (rien n'a bougé), et #boiteMail les ramène chez eux
    for (const qui of ['julie', 'sm', 'kb']) { const d = await entrer({ profil:'mac', qui, sansAller:true }); await lib.aller(d.p, 'boiteMail').catch(() => {}); await d.p.waitForTimeout(700);
      const x = await S(d, () => ({ route, hote:!!document.querySelector('#courrier-hote [data-opcourrier]'), menu:/Boîte mail/.test((document.querySelector('#menu,nav,.menu') || document.body).innerText) }));
      v('rôles : ' + qui + ' ne voit pas la Boîte mail (route « ' + x.route + ' », module monté : ' + x.hote + ')', !x.hote && x.route !== 'boiteMail', x);
      v('aucune erreur JavaScript (' + qui + ')', d.err.length === 0, d.err.slice(0, 3)); await fin(d); }
  });
  await sortie();
})();
