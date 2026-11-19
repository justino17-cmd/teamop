// Boîte mail, étape 4 « corriger » (17 novembre 2026) — le CLAVIER, les messages écrits ici, la fiche client, le tiroir des boîtes, l'envoi.
// Rejoue ordinateur-07 (bloquant), -08, -09, -10, -16 de scratchpad/proto-final/refonte/mail-relecture-ordinateur.json. ✓ = corrigé.
const { lib, v, entrer, cap, fin, sortie, ouvrirMsg } = require('./mail-commun.js');
const S = (c, f, a) => c.p.evaluate(f, a);
(async () => {
  let c = await entrer({ profil:'mac' }), p = c.p;
  // ── ordinateur-07 : toutes les lettres arrivent dans le champ (a, c, d, n, « / », « ? » comprises) ──
  const texte = 'nous avons cherché des devis, ça a coûté ? c/d a.n';
  await p.locator('#courrier-hote #search').click(); await p.keyboard.type(texte); await p.waitForTimeout(250);
  const rech = await S(c, () => ({ v:R().querySelector('#search').value, fen:!!document.querySelector('.fen-voile'), route, pal:!!document.getElementById('pal'), aide:!!document.querySelector('#calque .panneau .rc-t') }));
  v('ordinateur-07 recherche : les ' + texte.length + ' touches arrivent dans le champ, rien ne s\'ouvre à côté (fenêtre, palette, aide)', rech.v === texte && !rech.fen && rech.route === 'boiteMail' && !rech.pal && !rech.aide, rech);
  await S(c, () => { const s = R().querySelector('#search'); s.value = ''; s.dispatchEvent(new Event('input', { bubbles:true })); }); await p.waitForTimeout(300);
  await S(c, () => R().querySelector('#btnCompose').click()); await p.waitForTimeout(600);
  await p.locator('#courrier-hote #cTo').click(); await p.keyboard.type('nathalie.dacosta@exemple.fr'); await p.locator('#courrier-hote #cSub').click(); await p.keyboard.type('Rendez-vous de ce lundi, à confirmer ?');
  await p.locator('#courrier-hote #cBody').click(); await p.keyboard.type('Bonjour, nous passerons demain. a c d n / ?');
  const champs = await S(c, () => ({ a:R().querySelector('#cTo').value, o:R().querySelector('#cSub').value, c:R().querySelector('#cBody').value, fen:!!document.querySelector('.fen-voile'), route }));
  v('ordinateur-07 « À : », objet et corps d\'un message : toutes les lettres arrivent (a, c, d, n, /, ?), aucune fenêtre du prototype ne s\'ouvre', champs.a === 'nathalie.dacosta@exemple.fr' && champs.o === 'Rendez-vous de ce lundi, à confirmer ?' && champs.c.includes('Bonjour, nous passerons demain. a c d n / ?') && !champs.fen && champs.route === 'boiteMail', champs);
  await S(c, () => R().querySelector('#cCancel').click()); await p.waitForTimeout(500);
  // sans champ : les raccourcis du module (c écrire, / chercher) marchent, ceux du prototype (n, d, a) ne partent pas
  await p.locator('#courrier-hote .msg').first().click(); await p.waitForTimeout(300);
  await p.keyboard.press('n'); await p.keyboard.press('d'); await p.keyboard.press('a'); await p.waitForTimeout(300);
  const pro = await S(c, () => ({ fen:!!document.querySelector('.fen-voile'), route, panneau:!!document.querySelector('#calque .panneau') }));
  v('ordinateur-07 hors champ : « n », « d », « a » ne déclenchent aucune création du prototype (la Boîte mail a ses propres touches)', !pro.fen && pro.route === 'boiteMail' && !pro.panneau, pro);
  await p.keyboard.press('/'); await p.waitForTimeout(300);
  const slash = await S(c, () => R().activeElement && R().activeElement.id);
  v('ordinateur-07 « / » met le curseur dans la recherche du module', slash === 'search', slash);
  await p.keyboard.press('Escape'); await p.waitForTimeout(200);
  await p.locator('#courrier-hote .msg').first().click(); await p.keyboard.press('c'); await p.waitForTimeout(600);
  v('ordinateur-07 « c » ouvre un nouveau message dans le module (et pas « Nouveau client »)', await S(c, () => !!R().querySelector('#cTo') && route === 'boiteMail' && !document.querySelector('.fen-voile')));
  await S(c, () => R().querySelector('#cCancel').click()); await p.waitForTimeout(300);

  // ── ordinateur-08 : un message écrit ici ne porte aucune étiquette Client / Fournisseur / Nouveau contact ──
  const ecrire = async (a, obj, sortir) => { await S(c, () => R().querySelector('#btnCompose').click()); await p.waitForTimeout(500);
    await p.locator('#courrier-hote #cTo').fill(a); await p.locator('#courrier-hote #cSub').fill(obj); await p.locator('#courrier-hote #cBody').fill('Essai de pastille.');
    await S(c, s => R().querySelector(s).click(), sortir); await p.waitForTimeout(sortir === '#cSend' ? 6200 : 700); };
  await ecrire('x@y.fr', 'Brouillon pour un inconnu', '#cDraft');
  await S(c, () => R().querySelector('[data-folder=drafts]').click()); await p.waitForTimeout(400);
  const br = await S(c, () => [...R().querySelectorAll('#rows .msg')].map(r => ({ t:r.textContent.replace(/\s+/g, ' ').slice(0, 90), pastille:!!r.querySelector('.hpast') })));
  v('ordinateur-08 population : le brouillon est dans Brouillons', br.some(r => /Brouillon pour un inconnu/.test(r.t)), br);
  v('ordinateur-08 le brouillon pour une adresse inconnue ne porte aucune pastille (il portait « Client »)', br.filter(r => /Brouillon pour un inconnu/.test(r.t)).every(r => !r.pastille), br);
  await ecrire('direction@hotelplage.fr', 'Message pour la cliente', '#cSend');
  await S(c, () => R().querySelector('[data-folder=sent]').click()); await p.waitForTimeout(500);
  const en = await S(c, () => [...R().querySelectorAll('#rows .msg')].map(r => ({ t:r.textContent.replace(/\s+/g, ' ').slice(0, 90), pastille:!!r.querySelector('.hpast') })));
  v('ordinateur-08 population : le message envoyé est dans Envoyés', en.some(r => /Message pour la cliente/.test(r.t)), en.map(r => r.t));
  v('ordinateur-08 le message envoyé à une cliente ne porte aucune pastille (il portait « Fournisseur »)', en.filter(r => /Message pour la cliente/.test(r.t)).every(r => !r.pastille), en);
  // la même ligne, reçue : la pastille existe toujours (la correction ne retire pas la fonction)
  await S(c, () => R().querySelector('[data-folder=inbox]').click()); await p.waitForTimeout(400);
  v('ordinateur-08 contre-épreuve : dans la boîte de réception les pastilles « Client » / « Fournisseur » existent toujours', await S(c, () => [...R().querySelectorAll('#rows .hpast')].length >= 3));

  // ── ordinateur-09 : « Voir tous » d'une fiche client montre TOUS ses e-mails (reçus et envoyés) ──
  const mailD = 'durand@mail.fr', cl = await S(c, m => Object.keys(CLIENTS).find(k => CLIENTS[k].mail === m), mailD);
  const attendus = await S(c, m => MAILS.filter(x => (x.de && x.de.mail === m) || x.a === m).length, mailD);
  await S(c, m => courrierRechercher(m), mailD); await p.waitForTimeout(1200);
  const tous = await S(c, () => ({ titre:R().querySelector('#lbTitle').textContent, lignes:[...R().querySelectorAll('#rows .msg')].map(r => r.textContent.replace(/\s+/g, ' ').slice(0, 70)) }));
  v('ordinateur-09 population : la fiche de ce client compte au moins 2 e-mails (un reçu, un envoyé)', !!cl && attendus >= 2, { cl, attendus });
  v('ordinateur-09 « Voir tous » : ' + attendus + ' lignes (reçu ET envoyé), la liste s\'appelle « Tous les e-mails »', tous.lignes.length === attendus && tous.titre === 'Tous les e-mails' && tous.lignes.some(t => /FAC-2026-0144/.test(t)), tous);
  await S(c, () => { const s = R().querySelector('#search'); s.value = ''; s.dispatchEvent(new Event('input', { bubbles:true })); }); await p.waitForTimeout(500);
  v('ordinateur-09 la recherche effacée, on revient à la Boîte de réception (le dossier « Tous » s\'éteint avec elle)', await S(c, () => R().querySelector('#lbTitle').textContent === 'Boîte de réception' && R().querySelectorAll('#rows .msg').length > 3));

  // ── ordinateur-10 : « Boîtes connectées » — l'adresse tient, les boutons dessous, un seul nom pour « autre messagerie » ──
  await S(c, () => { ML_BOITES[1].etat = 'reco'; ML_BOITES[1].vu = 'le 28 oct.'; mbxPanBoites(); }); await p.waitForTimeout(500);
  const bo = await S(c, () => ({ lignes:[...document.querySelectorAll('#calque .mbx-lig-bte')].map(r => { const b = r.querySelector('.fo-n b'), a = r.querySelector('.mbx-bo-act'), fn = r.querySelector('.fo-n').getBoundingClientRect(); return { adr:b.textContent, large:Math.round(fn.width), coupe:b.getBoundingClientRect().right > r.querySelector('.fo-n').getBoundingClientRect().right + 1, haut:Math.round(b.getBoundingClientRect().height), boutonsSous:!a.children.length || a.getBoundingClientRect().top >= b.getBoundingClientRect().bottom - 1 }; }), texte:(document.querySelector('#calque .panneau') || {}).textContent || '' }));
  v('ordinateur-10 population : deux boîtes listées', bo.lignes.length === 2, bo.lignes);
  v('ordinateur-10 l\'adresse de la boîte à reconnecter tient sur UNE ligne (colonne ≥ 200 px), ses boutons sont DESSOUS', bo.lignes.every(l => !l.coupe && l.haut < 28 && l.boutonsSous && l.large >= 200), bo.lignes);
  v('ordinateur-10 un seul nom : « Autre messagerie », jamais « IMAP »', /Autre messagerie/.test(bo.texte) && !/IMAP/.test(bo.texte), bo.texte.replace(/\s+/g, ' ').slice(0, 300));
  await cap(c, 'corr-boites-mac');
  await S(c, () => { ML_BOITES[1].etat = 'ok'; try { fermerPanneau(); } catch (e) {} });
  await fin(c);

  // ── ordinateur-16 : « Envoyer » en toutes lettres sur un portable de 1280 px et sur iPad ; la feuille est centrée ──
  for (const [pr, nuit] of [['mac720', false], ['ipad', false], ['ipad', true]]) {
    c = await entrer({ profil:pr, nuit }); p = c.p;
    await S(c, () => R().querySelector('#btnCompose').click()); await p.waitForTimeout(700);
    const e = await S(c, () => { const b = R().querySelector('#cSend'), l = b.querySelector('.lbl'), sh = R().querySelector('.sheet').getBoundingClientRect(); return { aff:getComputedStyle(l).display, txt:l.textContent, larg:Math.round(b.getBoundingClientRect().width), sheet:[Math.round(sh.left), Math.round(sh.right)], iw:innerWidth }; });
    v('ordinateur-16 ' + pr + (nuit ? ' nuit' : ' jour') + ' : « Envoyer » s\'écrit (' + e.larg + ' px de large)', e.aff !== 'none' && e.txt === 'Envoyer' && e.larg > 60, e);
    v('ordinateur-16 ' + pr + (nuit ? ' nuit' : ' jour') + ' : la feuille d\'écriture est centrée (' + e.sheet + ' dans ' + e.iw + ')', Math.abs((e.sheet[0] + e.sheet[1]) / 2 - e.iw / 2) <= 3 || e.sheet[0] >= 0 && Math.abs(e.sheet[0] - (e.iw - e.sheet[1])) <= 3, e);
    if (pr === 'ipad') { await cap(c, 'corr-compose-ipad' + (nuit ? '-nuit' : ''));
      const noir = await S(c, () => getComputedStyle(R().querySelector('.opc-root')).backgroundColor);
      v('ordinateur-16 ipad : pas de cadre noir autour de la carte sous la feuille (fond ' + noir + ')', !/rgb\(0, 0, 0\)$/.test(noir), noir); }
    await fin(c); }
  await sortie();
})();
