// Boîte mail, étape 5 « recontrôler » (17 novembre 2026) — le RESTE des défauts annoncés « corrigés », rejoués à part, puis la casse alentour.
// PARTIE=1 : suivi, assigné, boîte en panne, mots, sélection (mac) ; 2 : titre de la liste défilée (mac720, ipad) ; 3 : téléphone (confier, bulle, panne totale, contraste, champs coupés)
// ⛔ 127.0.0.1 seulement. Chaque contrôle compte sa population avant de croire un zéro.
const { lib, v, entrer, cap, fin, sortie, ouvrirMsg, casserBoite } = require('./mail-commun.js');
const S = (c, f, a) => c.p.evaluate(f, a);
const PARTIE = process.env.PARTIE || '0', veut = n => PARTIE === '0' || PARTIE === String(n);
const sec = async (nom, f) => { try { await f(); } catch (e) { v('SECTION ' + nom + ' : aucune exception', false, String(e && e.message || e).slice(0, 300) + ' @ ' + String(e && e.stack || '').split('\n')[1]); } };
const lum = ([r, g, b]) => { const f = x => { x /= 255; return x <= .03928 ? x / 12.92 : Math.pow((x + .055) / 1.055, 2.4); }; return .2126 * f(r) + .7152 * f(g) + .0722 * f(b); };
const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };
const rgb = t => (/rgba?\(([^)]+)\)/.exec(t) || [0, '0,0,0'])[1].split(/[ ,/]+/).filter(Boolean).slice(0, 3).map(Number);
// largeur d'un texte écrit dans une police donnée, mesurée par un canvas : sert à savoir si un « placeholder » ou un titre tient dans son champ
const MESURE = (txt, font) => { const c = document.createElement('canvas').getContext('2d'); c.font = font; return c.measureText(txt).width; };
(async () => {
  if (veut(1)) await sec('mac : suivi, assigné, panne, mots', async () => {
    let c = await entrer({ profil:'mac' }), p = c.p;
    // ordinateur-15 : l'en-tête de la page suit « En cours » puis « Résolu » puis « À traiter » (retour)
    await S(c, () => courrierOuvrir('m2')); await p.waitForTimeout(900);
    const lire = () => S(c, () => ({ en:document.querySelector('.mbx-tete .gris').textContent, calc:courrierNbATraiter(), foot:R().querySelector('#lbSub').innerText.replace(/\s+/g, ' ') }));
    const a0 = await lire();
    const suit = [];
    for (const k of ['enCours', 'resolu', 'aTraiter']) { await S(c, x => R().querySelector('[data-suivi=' + x + ']').click(), k); await p.waitForTimeout(600); suit.push(Object.assign({ k }, await lire())); }
    v('ordinateur-15 population : trois gestes de suivi joués, le compte interne bouge (' + a0.calc + ' → ' + suit.map(x => x.calc).join(' → ') + ')', suit.length === 3 && suit[0].calc === a0.calc - 1 && suit[2].calc === a0.calc, { a0, suit });
    v('ordinateur-15 à chaque geste la phrase sous le titre de la page dit le nombre juste', suit.every(x => new RegExp('^' + x.calc + ' message').test(x.en) || (x.calc === 0 && /Tout est traité/.test(x.en))), suit);
    // ordinateur-18 : « Assigné à » — la liste, le refus, un prénom accepté ; casse : la ligne ne montre pas deux fois la même tâche
    await S(c, () => courrierOuvrir('m9')); await p.waitForTimeout(900);
    const eq = await S(c, () => ({ opts:[...R().querySelectorAll('#suiviEquipe option')].map(o => o.value), moi:typeof MOI !== 'undefined' ? MOI : null }));
    v('ordinateur-18 population : l\'équipe proposée (' + eq.opts.join(', ') + ')', eq.opts.length >= 3, eq);
    const nT0 = await S(c, () => TACHES.length);
    await p.locator('#courrier-hote #suiviAssigne').click(); await p.keyboard.type('Zorro'); await p.keyboard.press('Enter'); await p.waitForTimeout(600);
    const z = await S(c, () => ({ toast:R().querySelector('#toast').classList.contains('show') ? R().querySelector('#toast').innerText : '', champ:R().querySelector('#suiviAssigne').value, n:TACHES.length }));
    v('ordinateur-18 « Zorro » : refus dit en clair, champ vidé, aucune tâche de plus (' + nT0 + ' → ' + z.n + ')', /Personne/.test(z.toast) && z.champ === '' && z.n === nT0, z);
    await p.waitForTimeout(2800);
    await p.locator('#courrier-hote #suiviAssigne').click(); await p.keyboard.type('Sophie'); await p.keyboard.press('Enter'); await p.waitForTimeout(900);
    const so = await S(c, () => ({ champ:R().querySelector('#suiviAssigne').value, n:TACHES.length, tache:TACHES.filter(t => /Sophie|sm/.test(JSON.stringify([t.qui, t.pour || ''])) && /Mimosas|Devis D-2026-027|Re: Devis/.test(t.t || '')).length }));
    v('ordinateur-18 « Sophie » : une tâche de plus est créée pour elle (' + nT0 + ' → ' + so.n + ')', so.n === nT0 + 1, so);
    await fin(c);

    // ordinateur-19 / -02 / chef-01 : la panne d'une boîte
    c = await entrer({ profil:'mac' }); p = c.p; await casserBoite(c);
    await S(c, () => R().querySelector('[data-folder=inbox]').click()); await p.waitForTimeout(400);
    const pan = await S(c, () => { const b = R().querySelector('.loaderr'); return b ? { t:b.innerText.replace(/\s+/g, ' '), gerer:!!b.querySelector('[data-gererboites]'), retry:!!b.querySelector('[data-retry]'), lignes:R().querySelectorAll('#rows .msg').length } : null; });
    v('ordinateur-19 population : le bandeau de panne est là (' + (pan && pan.t.slice(0, 70)) + '), avec ses deux boutons, et les messages de l\'autre boîte restent listés (' + (pan && pan.lignes) + ')', !!pan && pan.gerer && pan.retry && pan.lignes >= 5, pan);
    await cap(c, 'rc-panne-mac');
    await p.locator('#courrier-hote .loaderr [data-retry]').click(); await p.waitForTimeout(1000);
    const re = await S(c, () => (R().querySelector('#toast').classList.contains('show') ? R().querySelector('#toast').innerText : ''));
    v('ordinateur-19 « Réessayer » parle (« ' + re.replace(/\s+/g, ' ') + ' »)', /toujours|ne répond/i.test(re), re);
    await p.locator('#courrier-hote .loaderr [data-gererboites]').click(); await p.waitForTimeout(800);
    v('ordinateur-19 « Reconnecter » ouvre « Boîtes connectées »', await S(c, () => /Boîtes connectées/.test((document.querySelector('#calque .panneau h2') || {}).textContent || '')));
    // le bouton Reconnecter du panneau mène la personne jusqu'au bout (3 étapes : accord, autorisation, terminé) et le bandeau rouge part
    const rb = p.locator('#calque .panneau button', { hasText:'Reconnecter' }).first(); const nrb = await rb.count();
    if (nrb) { await rb.click(); await p.waitForTimeout(900); await S(c, () => { const k = document.querySelector('#calque input[type=checkbox]'); if (k) k.click(); }); await p.waitForTimeout(300);
      await p.locator('#calque .panneau button', { hasText:/Autoriser/ }).first().click(); await p.waitForTimeout(1000);
      await S(c, () => { const k = document.querySelector('#calque input[type=checkbox]'); if (k && !k.checked) k.click(); }); await p.waitForTimeout(300);
      const t = p.locator('#calque .panneau button', { hasText:/Terminer/ }).first(); if (await t.count()) { await t.click(); await p.waitForTimeout(2500); } }
    const apres = await S(c, () => ({ etat:ML_BOITES[1].etat, panneau:!!document.querySelector('#calque .panneau'), rouge:!!R().querySelector('.loaderr'), lignes:R().querySelectorAll('#rows .msg').length, toast:(document.getElementById('toast') || {}).innerText || '' }));
    v('ordinateur-19 / chef-01 « Reconnecter » mène jusqu\'à « Terminer » : la boîte redevient connectée (' + apres.etat + '), le bandeau rouge part, la liste se relit (' + apres.lignes + ' lignes) — population : le bouton existait (' + nrb + ')', nrb === 1 && apres.etat === 'ok' && !apres.rouge && apres.lignes >= 8, apres);
    await fin(c);

    // mots, programmation, sélection
    c = await entrer({ profil:'mac' }); p = c.p;
    await S(c, () => R().querySelector('#btnCompose').click()); await p.waitForTimeout(600);
    await S(c, () => R().querySelector('#cSched').click()); await p.waitForTimeout(500);
    const prog = await S(c, () => R().querySelector('#cSchedWrap').innerText.replace(/\s+/g, ' '));
    v('ordinateur-11 envoi programmé : mots français (« aujourd’hui », « demain », heure en « h »), ni « Fuseau » ni fuseau Europe/Paris ni « 08:00 » : « ' + prog.slice(0, 160) + ' »', !/Fuseau|Europe\/|\b\d\d:\d\d\b|Today|Tomorrow/.test(prog) && /ujourd.hui/i.test(prog) && /demain/i.test(prog) && /\d h/.test(prog), prog);
    await cap(c, 'rc-programmer-mac');
    await S(c, () => R().querySelector('#cCancel').click()); await p.waitForTimeout(400);
    // tous les mots visibles des 11 dossiers : aucun jargon (IMAP, SMTP, fuseau, vérifié, appareil, cache, hors-ligne)
    const jargon = [];
    for (const f of ['inbox', 'flagged', 'drafts', 'scheduled', 'sent', 's_atraiter', 's_encours', 's_moi', 'archive', 'junk', 'trash']) {
      const ok = await S(c, x => { const b = R().querySelector('[data-folder="' + x + '"]'); if (!b) return false; b.click(); return true; }, f); if (!ok) continue; await p.waitForTimeout(250);
      const t = await S(c, () => R().querySelector('#app').innerText); const m = t.match(/\b(IMAP|SMTP|POP3?|fuseau|appareil|cache|hors[- ]ligne|serveur|token)\b/gi); if (m) jargon.push(f + ':' + [...new Set(m)].join('/')); }
    v('ordinateur-11 (collatéral) onze dossiers parcourus : aucun mot technique (IMAP, SMTP, fuseau, serveur, cache…) à l\'écran', jargon.length === 0, jargon);
    // ordinateur-14 : « 2 sélectionnés » et les gestes de la barre, mesurés sur trois profils plus tard ; ici : l'effet du bouton Archiver sur la sélection
    await S(c, () => R().querySelector('[data-folder=inbox]').click()); await p.waitForTimeout(300);
    await S(c, () => R().querySelector('#btnSelect').click()); await p.waitForTimeout(300);
    const nAvant = await S(c, () => R().querySelectorAll('#rows .msg').length);
    await S(c, () => R().querySelectorAll('#rows .msg')[3].click()); await p.waitForTimeout(200); await S(c, () => R().querySelectorAll('#rows .msg')[4].click()); await p.waitForTimeout(300);
    const sel = await S(c, () => { const b = R().querySelector('#selBar'); return { t:(b.querySelector('.sc') || {}).textContent, boutons:[...b.querySelectorAll('button')].map(x => ({ t:x.textContent.replace(/\s+/g, ' ').trim(), h:Math.round(x.getBoundingClientRect().height), w:Math.round(x.getBoundingClientRect().width) })), deborde:b.scrollWidth > b.clientWidth + 1 }; });
    v('ordinateur-14 barre de sélection : « 2 sélectionnés » entier, ' + sel.boutons.length + ' boutons (au moins 3) de ≥ 28 px de haut, sans débordement', /2 sélectionnés/.test(sel.t) && sel.boutons.length >= 3 && sel.boutons.every(b => b.h >= 28) && !sel.deborde, sel);
    await cap(c, 'rc-selection-mac');
    const arch = p.locator('#courrier-hote #selBar button', { hasText:/Archiver/ }).first();
    if (await arch.count()) { await arch.click(); await p.waitForTimeout(900); }
    const nApres = await S(c, () => R().querySelectorAll('#rows .msg').length);
    v('ordinateur-14 (collatéral) « Archiver » sur deux courriels sélectionnés les retire de la boîte (' + nAvant + ' → ' + nApres + ')', nApres === nAvant - 2, { nAvant, nApres });
    v('aucune erreur JavaScript (mac, suite)', c.err.length === 0, c.err.slice(0, 3));
    await fin(c);
  });

  if (veut(2)) await sec('titre de la liste défilée', async () => {
    for (const [pr, nuit] of [['mac720', false], ['mac720', true], ['ipad', false]]) { const c = await entrer({ profil:pr, nuit }), p = c.p;
      await S(c, () => { const s = R().querySelector('#listScroll'); s.scrollTop = 260; s.dispatchEvent(new Event('scroll')); }); await p.waitForTimeout(600);
      const t = await S(c, () => { const g = s => { const e = R().querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.right)]; }; const ti = R().querySelector('#lbTitle'); return { fmt:R().querySelector('.opc').dataset.fmt, titre:g('#lbTitle'), nav:g('#btnNav'), sel:g('#btnSelect'), coupe:ti.scrollWidth > ti.clientWidth + 1, op:parseFloat(getComputedStyle(R().querySelector('.lb-titles')).opacity), txt:ti.textContent }; });
      v('ordinateur-03 ' + pr + (nuit ? ' nuit' : ' jour') + ' (format ' + t.fmt + ') : liste défilée, le titre « ' + t.txt + ' » (' + t.titre + ') est visible, entier, entre « Boîtes » (' + t.nav + ') et « Sélectionner » (' + t.sel + ')', !!t.titre && t.op > .9 && !t.coupe && t.titre[0] >= t.nav[1] - 1 && t.titre[1] <= t.sel[0] + 1, t);
      if (pr === 'mac720' && !nuit) await cap(c, 'rc-titre-defile-mac720');
      await fin(c); }
  });

  if (veut(3)) await sec('téléphone : reste', async () => {
    // tel-09 / tel-12 / tel-16 / tel-14 : confier, créer l'intervention, bulle, pastille ; tel-07 : tout en panne
    for (const [pr, nuit] of [['iphone', false], ['android', true], ['petit', false]]) {
      const etiq = pr + (nuit ? ' nuit' : ' jour'), c = await entrer({ profil:pr, nuit }), p = c.p;
      // champs et titres coupés : « Assigné à » (placeholder), titre de la feuille d'écriture, bandeau « reconnu »
      await S(c, () => courrierOuvrir('m9')); await p.waitForTimeout(1000);
      const as = await S(c, MESURE_AS = () => { const i = R().querySelector('#suiviAssigne'), cs = getComputedStyle(i), r = i.getBoundingClientRect(), c2 = document.createElement('canvas').getContext('2d'); c2.font = cs.fontStyle + ' ' + cs.fontWeight + ' ' + cs.fontSize + ' ' + cs.fontFamily; const w = c2.measureText(i.placeholder).width, dispo = r.width - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight); return { ph:i.placeholder, w:Math.round(w), dispo:Math.round(dispo), larg:Math.round(r.width) }; });
      v('ordinateur-18 / téléphone ' + etiq + ' : le texte du champ « Assigné à » (« ' + as.ph + ' », ' + as.w + ' px) tient dans le champ (' + as.dispo + ' px)', as.w <= as.dispo + 1, as);
      await S(c, () => R().querySelector('#btnBack').click()); await p.waitForTimeout(400);
      await S(c, () => R().querySelector('#btnCompose').click()); await p.waitForTimeout(700);
      const ti = await S(c, () => { const t = R().querySelector('.sheet-title .t-main'), r = t.getBoundingClientRect(), cs = getComputedStyle(t); return { txt:t.textContent, coupe:t.scrollWidth > t.clientWidth + 1, w:t.scrollWidth, dispo:Math.round(r.width), over:cs.textOverflow }; });
      v('téléphone-04 (collatéral) ' + etiq + ' : le titre de la feuille d\'écriture « ' + ti.txt + ' » n\'est pas coupé (' + ti.w + ' px pour ' + ti.dispo + ')', !ti.coupe && ti.w <= ti.dispo + 1, ti);
      if (pr === 'petit') await cap(c, 'rc-titre-feuille-petit');
      await S(c, () => R().querySelector('#cCancel').click()); await p.waitForTimeout(400);
      // tel-09 : confier
      await S(c, () => courrierOuvrir('m1')); await p.waitForTimeout(900);
      await S(c, () => { const b = [...R().querySelectorAll('.hband button')].find(x => /Confier/.test(x.textContent)); const r = b.getBoundingClientRect(); if (r.height < 5 || r.top > innerHeight) { const m = [...R().querySelectorAll('.hband summary, .hband button, .hband [data-plus]')].find(x => /Autres gestes/.test(x.textContent)); if (m) m.click(); } }); await p.waitForTimeout(500);
      await S(c, () => [...R().querySelectorAll('.hband button')].find(x => /Confier/.test(x.textContent)).scrollIntoView({ block:'center' })); await p.waitForTimeout(300);
      await p.locator('#courrier-hote .hband button', { hasText:'Confier' }).first().tap(); await p.waitForTimeout(800);
      const cf = await S(c, () => { const pn = document.querySelector('#calque .panneau'), r = pn.getBoundingClientRect(); return { fois:(pn.textContent.match(/en lecture/g) || []).length, gens:pn.querySelectorAll('[data-mbx^="confok"]').length, bas:Math.round(r.bottom), ih:innerHeight, dedans:r.left >= -1 && r.right <= innerWidth + 1, hs:[...pn.querySelectorAll('[data-mbx^="confok"]')].map(b => Math.round(b.getBoundingClientRect().height)) }; });
      v('telephone-09 ' + etiq + ' : la règle est dite une fois, ' + cf.gens + ' personnes à toucher (≥ 44 px de haut), tout dans l\'écran', cf.fois === 1 && cf.gens >= 4 && cf.hs.every(h => h >= 44) && cf.dedans, cf);
      if (pr === 'iphone') await cap(c, 'rc-confier-' + pr + (nuit ? '-nuit' : ''));
      await S(c, () => fermerPanneau()); await p.waitForTimeout(300);
      // tel-12 : créer l'intervention — pas de clavier sur « Chercher un client », bulle hors de la barre « Annuler / Créer »
      await S(c, () => courrierOuvrir('m1')); await p.waitForTimeout(800);
      await S(c, () => [...R().querySelectorAll('.hband button')].find(x => /Créer l’intervention/.test(x.textContent)).scrollIntoView({ block:'center' })); await p.waitForTimeout(300);
      await p.locator('#courrier-hote .hband button', { hasText:'Créer l’intervention' }).first().tap(); await p.waitForTimeout(1000);
      const i12 = await S(c, () => { const a = document.activeElement, t = document.getElementById('toast'), pied = document.querySelector('.fen-pied'), tr = t && t.getBoundingClientRect(), pr = pied && pied.getBoundingClientRect(); const vis = t && t.classList.contains('on'); return { actif:a ? a.tagName + (a.placeholder ? ':' + a.placeholder : '') : '', toast:vis && tr ? [Math.round(tr.top), Math.round(tr.bottom)] : null, pied:pr ? [Math.round(pr.top), Math.round(pr.bottom)] : null }; });
      v('telephone-12 ' + etiq + ' : pas de clavier sur « Chercher un client » (' + i12.actif + '), la bulle ne couvre pas les boutons du bas', !/Chercher/.test(i12.actif) && (!i12.toast || !i12.pied || i12.toast[1] <= i12.pied[0] || i12.toast[0] >= i12.pied[1]), i12);
      if (pr !== 'android') await cap(c, 'rc-creer-int-' + pr + (nuit ? '-nuit' : ''));
      await S(c, () => document.querySelector('.fen [data-action=cPlusTard]') && document.querySelector('.fen [data-action=cPlusTard]').click()); await S(c, () => { try { fermerCreation(); } catch (e) {} }); await p.waitForTimeout(400);
      // tel-14 : contraste de TOUTES les pastilles de la liste (population comptée), couleur d'encre calculée contre son fond composé
      await S(c, () => courrierOuvrir('m5')); await p.waitForTimeout(500); await S(c, () => { const b = R().querySelector('#btnBack'); if (b && b.offsetParent) b.click(); }); await p.waitForTimeout(400);
      const base = nuit ? [20, 28, 51] : [255, 255, 255];
      const pas = await S(c, () => [...R().querySelectorAll('#rows .msg:not(.sel) .hpast, #rows .msg:not(.sel) .sgchip')].map(e => ({ t:e.textContent.trim(), col:getComputedStyle(e).color, bg:getComputedStyle(e).backgroundColor, fs:parseFloat(getComputedStyle(e).fontSize) })));
      const alpha = x => { const m = /rgba\([^)]*,\s*([\d.]+)\)$/.exec(x); return m ? +m[1] : 1; };
      const rs = pas.map(x => { const a = alpha(x.bg), cc = rgb(x.bg), bg = cc.map((q, n) => Math.round(q * a + base[n] * (1 - a))); return { t:x.t, r:+ratio(rgb(x.col), bg).toFixed(2), fs:x.fs }; });
      v('telephone-14 ' + etiq + ' : population : ' + rs.length + ' pastilles (au moins 6) ; toutes ≥ 4,5:1 (le pire : ' + Math.min(...rs.map(x => x.r)) + ')', rs.length >= 6 && rs.every(x => x.r >= 4.5), rs.filter(x => x.r < 4.5));
      // tel-16 : la bulle d'un message qui arrive tient en peu de place et ne masque pas la barre d'outils
      await S(c, () => { MAILS.unshift(mlM('mlong', AUJ, '10:41', { nom:'Entreprise de nettoyage industriel de la côte atlantique et des îles', mail:'x@exemple.fr' }, 'Demande de devis pour le nettoyage complet de nos locaux de Châtelaillon-Plage avec vitres, sols et climatisation de la salle de réunion principale, urgent pour lundi', 'Bonjour, voici notre demande.')); courrierRafraichir(); });
      await p.waitForTimeout(2200);
      const t16 = await S(c, () => { const t = R().querySelector('#toast'); if (!t || !t.classList.contains('show')) return null; const b = t.getBoundingClientRect(); return { h:Math.round(b.height), w:Math.round(b.width), iw:innerWidth, ih:innerHeight, top:Math.round(b.top), txt:t.innerText.replace(/\s+/g, ' ').slice(0, 120) }; });
      v('telephone-16 ' + etiq + ' : la bulle « nouveau message » est montrée (' + (t16 && t16.txt) + '), ≤ 25 % de la hauteur, dans la largeur', !!t16 && t16.h <= t16.ih * .25 && t16.w <= t16.iw, t16);
      if (pr === 'petit') await cap(c, 'rc-bulle-petit');
      v('aucune erreur JavaScript sur ' + etiq + ' (reste)', c.err.length === 0, c.err.slice(0, 3));
      await fin(c);
    }
    // tel-07 / tel-10 : tout en panne à 320 px
    const c = await entrer({ profil:'petit' }), p = c.p;
    await S(c, () => { ML_BOITES.forEach(b => { b.etat = 'reco'; b.vu = 'le 28 oct.'; }); return COURRIER.inst.rafraichir(); }); await p.waitForTimeout(1200);
    await S(c, () => R().querySelector('#btnNav').click()); await p.waitForTimeout(700);
    await S(c, () => { const s = R().querySelector('#sideScroll'); s.scrollTop = s.scrollHeight; }); await p.waitForTimeout(400);
    const col = await S(c, () => { const t = R().querySelector('.side-lt'); return { titre:t.textContent, coupe:t.scrollWidth > t.clientWidth + 1, foot:Math.round(R().querySelector('.side-foot').getBoundingClientRect().bottom), ih:innerHeight, dossiers:R().querySelectorAll('#sideScroll [data-folder]').length }; });
    v('telephone-10 petit (320 px) : « ' + col.titre + ' » entier, ' + col.dossiers + ' dossiers listés (au moins 9), pied dans l\'écran', !col.coupe && col.dossiers >= 9 && col.foot <= col.ih + 1, col);
    await cap(c, 'rc-boites-petit');
    await S(c, () => R().querySelector('[data-folder=archive]').click()); await p.waitForTimeout(500);
    const e7 = await S(c, () => { const e = R().querySelector('#rows .empty'); return e ? { t:e.innerText.replace(/\s+/g, ' '), b:Math.round(e.getBoundingClientRect().bottom) } : null; });
    v('telephone-07 petit : toutes les boîtes en panne, « Réception indisponible » dit chaque adresse une fois', !!e7 && /Réception indisponible/.test(e7.t) && (e7.t.match(/marc@climservices17\.fr/g) || []).length === 1 && (e7.t.match(/contact@climservices17\.fr/g) || []).length === 1, e7);
    await cap(c, 'rc-toutes-en-panne-petit');
    await fin(c);
  });
  await sortie();
})();
