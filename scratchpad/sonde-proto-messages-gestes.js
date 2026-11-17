/* Sonde des GESTES du prototype d'OP MESSAGES, côté Pro (apercu/prototype-op-messages.html, refait le 16 novembre 2026).
   Lancer depuis la racine : node scratchpad/sonde-proto-messages-gestes.js   (PROFILS=mac,iphone pour restreindre)
   Elle joue ce qu'une personne fait — écrire, répondre, réagir, voter, appeler, programmer, entrer en réunion — par de vrais clics (souris ou doigt),
   et relit ce que la page a retenu ET ce qu'elle montre. Sort en 1 au moindre ✗. */
const { chromium } = require('playwright');
const path = require('path');
const FICHIER = 'file://' + path.join(__dirname, '..', 'apercu', 'prototype-op-messages.html');
const PROFILS = [{ n: 'mac', w: 1440, h: 900 }, { n: 'windows', w: 1280, h: 720 }, { n: 'ipad', w: 820, h: 1180, tactile: true }, { n: 'iphone', w: 393, h: 852, tactile: true, mobile: true }, { n: 'android', w: 360, h: 780, tactile: true, mobile: true }];
(async () => {
  const seuls = process.env.PROFILS ? process.env.PROFILS.split(',') : null; const b = await chromium.launch(); let ok = 0, ko = 0;
  for (const p of PROFILS) { if (seuls && !seuls.includes(p.n)) continue; console.log('— ' + p.n);
    const ctx = await b.newContext({ viewport: { width: p.w, height: p.h }, hasTouch: !!p.tactile, isMobile: !!p.mobile, reducedMotion: 'reduce' });
    const page = await ctx.newPage(); const errs = []; page.on('pageerror', (e) => errs.push(e.message));
    const vrai = (nom, c, detail) => { if (c) ok++; else { ko++; console.log('  ✗ ' + nom + (detail !== undefined ? ' — ' + JSON.stringify(detail) : '')); } };
    const tel = p.w <= 760;
    /* un vrai clic (ou un vrai toucher) sur le premier élément VISIBLE qui répond au sélecteur ; il dit s'il a porté */
    /* une bannière de notification (en haut, 4 s) couvre ce qu'elle surplombe, comme sur un vrai appareil : la sonde l'écarte avant de frapper, et le DIT ici */
    const clic = async (sel, n) => { const pt = await page.evaluate(([s, k]) => { document.querySelectorAll('.banniere').forEach((x) => { if (!s.includes('banniere')) x.remove(); }); const l = [...document.querySelectorAll(s)].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; }); const e = l[k || 0]; if (!e) return null; e.scrollIntoView({ block: 'center', inline: 'center' }); const r = e.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2, t = document.elementFromPoint(x, y); return { x, y, bon: !!t && (t === e || e.contains(t) || t.contains(e)) }; }, [sel, n]);
      if (!pt || !pt.bon) { vrai('la frappe porte sur ' + sel, false, pt); return false; } if (p.tactile) await page.touchscreen.tap(pt.x, pt.y); else await page.mouse.click(pt.x, pt.y); await page.waitForTimeout(90); return true; };
    const ev = (f, a) => page.evaluate(f, a);
    const va = async (h) => { await ev((x) => { location.hash = x; }, h); await page.waitForTimeout(120); };
    await page.goto(FICHIER); await page.waitForTimeout(300);

    /* ── navigation : le rail (bureau) ; au téléphone, quatre onglets et « Plus » ── */
    for (const r of ['messages', 'contacts', 'appels', 'reunions', 'agenda', 'courrier', 'accueil']) { const direct = !tel || ['accueil', 'messages', 'appels', 'agenda'].includes(r);
      if (direct) await clic((tel ? '#onglets' : '#cote') + ` a[href="#${r}"]`); else { await clic('#onglets [data-action="plus"]'); await clic(`#calque [data-go="${r}"]`); }
      vrai('la rubrique ' + r + ' s’ouvre', await ev(() => S.vue) === r && await ev(([x, d]) => !!document.querySelector(innerWidth > 760 ? `#cote a[href="#${x}"][aria-current]` : d ? `#onglets a[href="#${x}"][aria-current]` : '#onglets [data-action="plus"][aria-current]'), [r, direct])); }
    await clic('#haut a[href="#profil"]'); vrai('le Profil s’ouvre par soi (en haut à droite)', await ev(() => S.vue) === 'profil');
    /* la recherche du haut */
    await clic('#haut [data-action="chercher"]'); vrai('la recherche s’ouvre sur des actions', await ev(() => !!document.querySelector('#pal') && document.querySelectorAll('#pal-res .rang').length >= 8));
    await page.fill('#pal', 'compresseur'); await page.waitForTimeout(80); vrai('elle trouve des messages et un rendez-vous', await ev(() => /Messages/.test(document.querySelector('#pal-res').textContent) && /Agenda/.test(document.querySelector('#pal-res').textContent)));
    await page.fill('#pal', 'thomas'); await page.waitForTimeout(80); await clic('#pal-res .rang'); vrai('choisir une personne ouvre sa fiche', await ev(() => S.vue === 'contacts' && S.id === 'thomas' && !document.querySelector('#calque').innerHTML));
    if (!p.tactile) { await page.keyboard.press('Control+k'); await page.waitForTimeout(80); vrai('Ctrl K ouvre la recherche', await ev(() => !!document.querySelector('#pal'))); await page.keyboard.press('Escape'); }
    /* l'activité : une seule file à vider */
    await va('activite'); { const n = await ev(() => activite().length); vrai('l’activité réunit messages, mentions, appels manqués, invitation et courriels', n >= 7 && await ev(() => document.querySelectorAll('.act').length) === n && await ev(() => +document.querySelector('#haut .h-btn em').textContent) === n, n);
      await clic('[data-filtre-act="appel"]'); vrai('le filtre « Appels » ne garde que les appels manqués', await ev(() => document.querySelectorAll('.act').length === 2)); await clic('[data-filtre-act="tout"]');
      await clic('[data-inv][data-rep="oui"]'); vrai('accepter une invitation la retire de la file', await ev((x) => activite().length === x - 1 && !evt('e4').invitation, n));
      await clic('[data-traite="a-a5"]'); vrai('« Traité » range la ligne', await ev((x) => activite().length === x - 2 && !/Camille Roy/.test(document.querySelector('.carte').textContent), n)); }
    vrai('le Courrier est monté et compte ses non lus', await ev(() => COUR.nl > 0 && !!COUR.inst), await ev(() => COUR.nl));

    /* ── tableau de bord ── */
    await va('accueil');
    vrai('le tableau de bord annonce la prochaine réunion du jour', await ev(() => /Visio client/.test(document.querySelector('.prochaine').textContent) && /Dans \d+ min/.test(document.querySelector('.prochaine').textContent)), await ev(() => document.querySelector('.prochaine').textContent));
    await clic('[data-rappel="r1"]'); vrai('cocher un rappel le barre', await ev(() => RAPPELS[0].fait && !!document.querySelector('.rang.fait')));
    await clic('[data-action="rappel-ajouter"]'); await page.fill('#rap-t', 'Commander des filtres'); await clic('[data-action="rappel-ok"]'); vrai('ajouter un rappel', await ev(() => RAPPELS.length === 4 && /Commander des filtres/.test(document.querySelector('#scene').textContent) && !document.querySelector('#calque').innerHTML));
    await clic('.tuile-b a[href="#messages/marc"]'); vrai('un message non lu mène à sa conversation', await ev(() => S.vue === 'messages' && S.id === 'marc'));

    /* ── messages ── */
    vrai('ouvrir une conversation la marque lue', await ev(() => conv('marc').nl === 0));
    vrai('au téléphone la barre d’onglets se retire dans une conversation', !tel || await ev(() => getComputedStyle(document.querySelector('#onglets')).display === 'none'));
    await page.fill('#saisie', 'Le prix arrive dans l’heure.'); vrai('écrire transforme le micro en bouton d’envoi', await ev(() => document.querySelector('#btn-envoi').dataset.action === 'envoyer'));
    await clic('#btn-envoi'); vrai('le message part et s’affiche', await ev(() => { const m = dernier(conv('marc')); return m.de === 'moi' && m.t === 'Le prix arrive dans l’heure.' && /Le prix arrive/.test(document.querySelector('#fil').textContent) && /Toi/.test([...document.querySelectorAll('#fil .msg .ent b')].pop().textContent) && document.querySelector('#saisie').value === ''; }));
    await page.waitForFunction(() => conv('marc').ecrit, null, { timeout: 3000 }).catch(() => {}); vrai('le correspondant écrit (trois points)', await ev(() => !!document.querySelector('.ecrit')));
    await page.waitForFunction(() => dernier(conv('marc')).de === 'marc' && !conv('marc').ecrit, null, { timeout: 6000 }).catch(() => {}); vrai('puis il répond, et mon message passe à « Lu »', await ev(() => dernier(conv('marc')).de === 'marc' && conv('marc').msgs.slice(-2)[0].lu && !document.querySelector('.ecrit')));
    /* le menu d'un message : clic droit, ou appui long */
    const menu = async (k) => { const r = await ev((i) => { const e = [...document.querySelectorAll('#fil [data-msg]')].slice(i)[0]; e.scrollIntoView({ block: 'center' }); const q = e.getBoundingClientRect(); return { x: q.left + 20, y: q.top + q.height / 2 }; }, k);
      if (p.tactile) { const c = await ctx.newCDPSession(page); await c.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: r.x, y: r.y, id: 1 }] }); await page.waitForTimeout(620); await c.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await c.detach(); } else await page.mouse.click(r.x, r.y, { button: 'right' }); await page.waitForTimeout(150); };
    await menu(0); vrai(p.tactile ? 'l’appui long ouvre le menu du message' : 'le clic droit ouvre le menu du message', await ev(() => { const m = document.querySelector('.menu-ctx'); if (!m) return false; const r = m.getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= innerHeight; }));
    await clic('.menu-ctx [data-reac="👍"]'); if (!p.tactile) { await page.hover('#fil .msg'); await page.waitForTimeout(60); vrai('au survol, les gestes du message paraissent', await ev(() => getComputedStyle(document.querySelector('#fil .msg .outils')).display === 'flex')); }
    vrai('réagir pose la réaction sous le message', await ev(() => conv('marc').msgs[0].reac.includes('👍') && !!document.querySelector('.reacs') && !document.querySelector('.menu-ctx')));
    await menu(0); await clic('.menu-ctx [data-ctx="repondre"]'); vrai('Répondre cite le message au-dessus de la saisie', await ev(() => !!S.rep && !!document.querySelector('.compo .rep')));
    await page.fill('#saisie', 'Oui, c’est possible.'); await clic('#btn-envoi'); vrai('la réponse porte sa citation', await ev(() => { const m = conv('marc').msgs.filter((x) => x.de === 'moi').pop(); return !!m.rep && !S.rep && !!document.querySelector('.msg .cite'); }));
    await menu(-1); vrai('mon message propose « Supprimer »', await ev(() => !!document.querySelector('.menu-ctx [data-ctx="supprimer"]')));
    { const n = await ev(() => conv('marc').msgs.length); await clic('.menu-ctx [data-ctx="supprimer"]'); vrai('supprimer retire le message', await ev((x) => conv('marc').msgs.length === x - 1, n)); }
    await page.keyboard.press('Escape');
    await clic('[data-action="joindre"]'); await clic('#calque [data-joint="photo"]'); vrai('joindre une photo l’envoie', await ev(() => dernier(conv('marc')).type === 'photo' && !document.querySelector('#calque').innerHTML));
    await clic('[data-action="joindre"]'); await clic('#calque [data-joint="sondage"]'); await page.fill('#sd-q', 'Quel jour ?'); await page.fill('#sd-1', 'Lundi'); await page.fill('#sd-2', 'Mardi'); await clic('[data-action="sondage-ok"]'); vrai('créer un sondage l’envoie', await ev(() => dernier(conv('marc')).type === 'sondage' || conv('marc').msgs.slice(-2).some((m) => m.type === 'sondage')));
    await va('messages/equipe'); await clic('[data-vote]', 1); vrai('voter dans un sondage compte la voix', await ev(() => { const m = conv('equipe').msgs.find((x) => x.type === 'sondage'); return m.v === 1 && m.opts[1][1] === 2 && /tu as voté/.test(document.querySelector('.sondage').textContent); }));
    await clic('[data-jouer]'); vrai('écouter un message vocal anime la forme d’onde', await ev(() => !!document.querySelector('.vocal.joue')));
    await clic('[data-action="infos-conv"]'); vrai('les infos du canal listent ses membres', await ev(() => document.querySelectorAll('#calque .rang.av-g').length === 5));
    await clic('[data-conv-regl="sourdine"]'); vrai('la sourdine se règle', await ev(() => conv('equipe').sourdine === 1 && document.querySelector('[data-conv-regl="sourdine"]').getAttribute('aria-checked') === 'true')); await clic('#calque [data-ferme]');
    await va('messages'); await clic('[data-filtre-conv="clients"]'); vrai('le filtre « Clients » ne garde que les clients et partenaires', await ev(() => { const l = [...document.querySelectorAll('#liste-conv a.ligne')]; return l.length === 4 && !l.some((x) => x.querySelector('.diese')); })); await clic('[data-filtre-conv="tout"]');
    vrai('la liste est rangée en sections', await ev(() => [...document.querySelectorAll('#liste-conv .section-l')].map((x) => x.textContent).join('|')) === 'Favoris|Canaux|Équipe|Clients et partenaires' || await ev(() => document.querySelectorAll('#liste-conv .section-l').length >= 3));
    await page.fill('#rech', 'compresseur'); await page.waitForTimeout(100); vrai('la recherche filtre les conversations', await ev(() => { const l = document.querySelectorAll('#liste-conv .ligne'); return l.length >= 2 && l.length < C.length && !document.querySelector('.epingles'); })); await page.fill('#rech', ''); 
    await clic('[data-action="nouveau-message"]'); await clic('[data-action="nouveau-groupe"]'); await page.fill('#g-nom', 'Chantier Minimes'); await clic('[data-pe-inv="karim"]'); await clic('[data-pe-inv="leo"]'); await clic('[data-action="groupe-creer"]');
    vrai('créer un groupe l’ouvre', await ev(() => { const c = conv(S.id); return S.vue === 'messages' && c && c.n === 'Chantier Minimes' && c.membres.length === 2; }));

    /* écrire à quelqu'un avec qui on n'a encore rien échangé (trouvé par la sonde des clics : la liste lisait le dernier message d'une conversation vide) */
    await va('messages'); await clic('[data-action="nouveau-message"]'); await clic('#calque [data-ecrire="leo"]'); vrai('écrire à un contact sans conversation en ouvre une, vide', await ev(() => S.vue === 'messages' && S.id === 'leo' && conv('leo').msgs.length === 0 && !!document.querySelector('#saisie') && /Nouvelle conversation/.test(document.querySelector('#liste-conv').textContent)));
    await page.fill('#saisie', 'Tu peux passer au dépôt ?'); await clic('#btn-envoi'); vrai('et le premier message part', await ev(() => conv('leo').msgs.length >= 1 && conv('leo').msgs[0].t === 'Tu peux passer au dépôt ?'));
    /* ── contacts ── */
    await va('contacts'); await clic('a[href="#contacts/thomas"]'); vrai('la fiche d’un contact s’ouvre', await ev(() => S.id === 'thomas' && /Froid Atlantique/.test(document.querySelector('.fiche').textContent)));
    await clic('.fiche [data-ecrire="thomas"]'); vrai('« Message » ouvre la conversation', await ev(() => S.vue === 'messages' && S.id === 'thomas'));
    await va('contacts'); await clic('[data-action="contact-ajouter"]'); await page.fill('#ct-nom', 'Paul Lefèvre'); await page.fill('#ct-soc', 'Garage Lefèvre'); await clic('[data-action="contact-ok"]'); vrai('ajouter un contact ouvre sa fiche', await ev(() => S.vue === 'contacts' && P[S.id] && P[S.id].n === 'Paul Lefèvre'));

    /* ── appels ── */
    await va('appels'); await clic('[data-filtre-appels="manques"]'); vrai('« Manqués » ne garde que les manqués', await ev(() => document.querySelectorAll('a.ligne').length === 2 && document.querySelectorAll('a.ligne.manque').length === 2)); await clic('[data-filtre-appels="tous"]');
    await clic('a[href="#appels/a4"]'); vrai('la fiche d’un appel montre l’historique', await ev(() => S.id === 'a4' && /24 min/.test(document.querySelector('.fiche').textContent)));
    await clic('.fiche [data-appeler="james"]'); vrai('l’appel sonne', await ev(() => S.appel && S.appel.etat === 'sonne' && !!document.querySelector('.appel.sonne')));
    await page.waitForFunction(() => S.appel && S.appel.etat === 'cours', null, { timeout: 5000 }).catch(() => {}); vrai('puis il est en cours, avec sa durée', await ev(() => S.appel.etat === 'cours' && !!document.querySelector('[data-duree]')));
    await clic('[data-appel="muet"]'); vrai('Silence coupe le micro', await ev(() => S.appel.muet && document.querySelector('[data-appel="muet"]').getAttribute('aria-pressed') === 'true'));
    await clic('[data-appel="camera"]'); vrai('Caméra passe en vidéo', await ev(() => S.appel.video && !!document.querySelector('.appel.video .vous')));
    await clic('[data-appel="clavier"]'); vrai('Clavier montre les touches', await ev(() => document.querySelectorAll('.clavier button').length === 12)); await clic('[data-appel="clavier"]');
    await clic('[data-appel="reduire"]'); vrai('réduire l’appel laisse une pastille', await ev(() => !!document.querySelector('#mini') && !document.querySelector('#plein').innerHTML));
    await clic('#mini'); vrai('la pastille ramène à l’appel', await ev(() => !!document.querySelector('.appel') && !document.querySelector('#mini')));
    { const n = await ev(() => APPELS.length); await clic('[data-appel="raccrocher"]'); vrai('raccrocher range l’appel dans l’historique', await ev((x) => !S.appel && APPELS.length === x + 1 && APPELS[0].qui === 'james' && !document.querySelector('#plein').innerHTML, n)); }
    await va('appels'); await clic('[data-action="appel-entrant"]'); vrai('un appel entrant propose Refuser et Répondre', await ev(() => S.appel.etat === 'entrant' && !!document.querySelector('[data-appel="repondre"]')));
    await clic('[data-appel="repondre"]'); vrai('répondre met l’appel en cours', await ev(() => S.appel.etat === 'cours')); await clic('[data-appel="raccrocher"]');
    await clic('[data-action="nouvel-appel"]'); vrai('« Nouvel appel » liste les contacts, audio et vidéo', await ev(() => document.querySelectorAll('#calque [data-appeler]').length >= 16)); await clic('#calque [data-ferme]');

    /* ── agenda ── */
    await va('agenda'); vrai('la semaine montre sept jours, aujourd’hui choisi', await ev(() => document.querySelectorAll('.jour-c').length === 7 && document.querySelector('.jour-c.auj').getAttribute('aria-pressed') === 'true'));
    await clic('[data-ag-vue="mois"]'); vrai('le mois montre six semaines', await ev(() => document.querySelectorAll('.mois button').length === 42)); await clic('[data-ag-vue="semaine"]');
    await clic('[data-ag-sem="1"]'); vrai('la semaine suivante s’affiche', await ev(() => S.agSem === 1)); await clic('[data-ag-auj]'); vrai('« Revenir à aujourd’hui »', await ev(() => S.agSem === 0 && S.agJour === 0));
    await clic('[data-action="programmer"]'); await page.fill('#pe-titre', 'Visite de chantier'); await clic('[data-pe-type="rdv"]'); vrai('un rendez-vous demande un lieu, pas des invités', await ev(() => !document.querySelector('#pe-lieu-z').hidden && document.querySelector('#pe-inv-z').hidden));
    await page.selectOption('#pe-jour', '1'); await page.fill('#pe-lieu', 'Résidence Les Minimes'); await clic('[data-action="evt-enregistrer"]');
    vrai('une bannière annonce l’ajout', await ev(() => /Ajouté à ton agenda/.test((document.querySelector('.banniere') || {}).textContent || '')));
    vrai('le rendez-vous se place au bon jour de l’agenda', await ev(() => { const e = EVTS[EVTS.length - 1]; return e.titre === 'Visite de chantier' && e.j === 1 && e.type === 'rdv' && S.agJour === 1 && /Visite de chantier/.test(document.querySelector('#scene').textContent) ; }));
    await clic(`#scene [data-evt="${await ev(() => EVTS[EVTS.length - 1].id)}"]`); vrai('toucher un événement ouvre sa fiche', await ev(() => !!document.querySelector('#calque .feuille h2')));
    { const n = await ev(() => EVTS.length); await clic('#calque [data-action="evt-supprimer"]'); vrai('supprimer un événement', await ev((x) => EVTS.length === x - 1 && !document.querySelector('#calque').innerHTML, n)); }

    /* ── l'agenda se manie à la main : glisser un bloc, clic droit, invités prévenus (la grille horaire n'existe que sur les grands écrans) ── */
    if (!tel) { await va('agenda'); await ev(() => { S.agSem = 0; S.agJour = 0; rendre(); document.querySelectorAll('.banniere').forEach((x) => x.remove()); });
      const bloc = await ev(() => { const b = document.querySelector('.bloc-g[data-evt="e1"]'); b.scrollIntoView({ block: 'center' }); const r = b.getBoundingClientRect(), c = document.querySelector('.g-col').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + 8, hh: c.height / 15, lc: c.width }; });
      if (p.tactile) { const c = await ctx.newCDPSession(page), pt = (x, y) => [{ x, y, id: 1 }]; await c.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: pt(bloc.x, bloc.y) }); await page.waitForTimeout(380);
        for (let k = 1; k <= 6; k++) { await c.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: pt(bloc.x + bloc.lc * k / 6, bloc.y + bloc.hh * 2 * k / 6) }); await page.waitForTimeout(30); } await c.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await c.detach(); }
      else { await page.mouse.move(bloc.x, bloc.y); await page.mouse.down(); await page.mouse.move(bloc.x + bloc.lc, bloc.y + bloc.hh * 2, { steps: 8 }); await page.mouse.up(); }
      await page.waitForTimeout(150);
      vrai('glisser un bloc le décale d’un jour et de deux heures', await ev(() => { const e = evt('e1'); return e.j === 1 && e.deb === '16:00' && e.fin === '16:30'; }), await ev(() => { const e = evt('e1'); return [e.j, e.deb, e.fin]; }));
      vrai('les invités sont prévenus, leur réponse repasse en attente', await ev(() => evt('e1').invites.every((i) => i[1] === 'attente') && /Réunion décalée/.test((document.querySelector('.banniere') || {}).textContent || '') && /sont prévenus/.test(document.querySelector('.banniere').textContent)));
      vrai('glisser n’ouvre pas la fiche', await ev(() => !document.querySelector('#calque').innerHTML));
      const droit = async (id) => { await ev(() => document.querySelectorAll('.banniere').forEach((x) => x.remove())); const r = await ev((i) => { const b = document.querySelector(`.bloc-g[data-evt="${i}"]`); b.scrollIntoView({ block: 'center' }); const q = b.getBoundingClientRect(); return { x: q.left + 12, y: q.top + 6 }; }, id);
        if (p.tactile) await ev(([i, q]) => document.querySelector(`.bloc-g[data-evt="${i}"]`).dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: q.x, clientY: q.y })), [id, r]); else await page.mouse.click(r.x, r.y, { button: 'right' }); await page.waitForTimeout(100); };
      await droit('e1'); vrai('le clic droit sur un événement ouvre son menu', await ev(() => document.querySelectorAll('.menu-ctx [data-ectx]').length >= 6));
      await clic('.menu-ctx [data-ectx="plus1h"]'); vrai('« Décaler d’une heure » déplace et prévient', await ev(() => evt('e1').deb === '17:00' && !document.querySelector('.menu-ctx') && /Réunion décalée/.test((document.querySelector('.banniere') || {}).textContent || '')));
      await droit('e1'); await clic('.menu-ctx [data-ectx="dupliquer"]'); vrai('« Dupliquer » crée la même une semaine plus tard', await ev(() => EVTS.filter((e) => e.titre === 'Point d’équipe').length === 2));
      { const n = await ev(() => EVTS.length); await droit('e0'); await clic('.menu-ctx [data-ectx="annuler"]'); vrai('« Annuler la réunion » la retire et prévient les invités', await ev((x) => EVTS.length === x - 1 && !evt('e0') && /Réunion annulée/.test((document.querySelector('.banniere') || {}).textContent || ''), n)); }
      await ev(() => document.querySelectorAll('.banniere').forEach((x) => x.remove()));
      const vide2 = await ev(() => { const c = document.querySelectorAll('.g-col')[6], r = c.getBoundingClientRect(); c.scrollIntoView({ block: 'center' }); const q = c.getBoundingClientRect(); return { x: q.left + q.width / 2, y: q.top + q.height / 15 * 5.2 }; });
      if (p.tactile) await ev((q) => document.elementFromPoint(q.x, q.y).dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: q.x, clientY: q.y })), vide2); else await page.mouse.click(vide2.x, vide2.y, { button: 'right' });
      await page.waitForTimeout(100); vrai('le clic droit sur une case vide propose de créer là', await ev(() => /Nouvelle réunion à 10:00/.test((document.querySelector('.menu-ctx') || {}).textContent || '')), await ev(() => (document.querySelector('.menu-ctx') || {}).textContent));
      await clic('.menu-ctx [data-ectx="neuf"]'); vrai('et la feuille s’ouvre au bon jour et à la bonne heure', await ev(() => document.querySelector('#pe-deb').value === '10:00' && +document.querySelector('#pe-jour').value === lundi(0) + 6)); await clic('#calque [data-ferme]');
      /* modifier l'heure dans la feuille prévient aussi */
      await ev(() => ACTIONS['evt-modifier']({ dataset: { id: 'e1' } })); await page.fill('#pe-deb', '11:00'); await page.fill('#pe-fin', '11:30'); await clic('[data-action="evt-enregistrer"]'); vrai('modifier l’heure dans la feuille prévient les invités', await ev(() => evt('e1').deb === '11:00' && /Réunion décalée/.test((document.querySelector('.banniere') || {}).textContent || ''))); }
    else { await va('agenda'); await ev(() => { S.agSem = 0; S.agJour = 0; rendre(); }); const r = await ev(() => { const b = document.querySelector('#scene .evt[data-evt="e1"]'); b.scrollIntoView({ block: 'center' }); const q = b.getBoundingClientRect(); return { x: q.left + 60, y: q.top + q.height / 2 }; });
      const c = await ctx.newCDPSession(page); await c.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: r.x, y: r.y, id: 1 }] }); await page.waitForTimeout(620); await c.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await c.detach(); await page.waitForTimeout(120);
      vrai('au téléphone, l’appui long sur un événement ouvre son menu', await ev(() => document.querySelectorAll('.menu-ctx [data-ectx]').length >= 6));
      await clic('.menu-ctx [data-ectx="demain"]'); vrai('« Reporter au lendemain » déplace et prévient les invités', await ev(() => evt('e1').j === 1 && evt('e1').invites.every((i) => i[1] === 'attente') && /Réunion décalée/.test((document.querySelector('.banniere') || {}).textContent || ''))); }

    /* ── réunions ── */
    await va('reunions'); await clic('a[href="#reunions/e6"]'); await clic('[data-action="compte-rendu"]'); vrai('une réunion passée a son compte rendu', await ev(() => /Décisions/i.test(document.querySelector('#calque').textContent))); await clic('#calque [data-ferme]');
    await va('reunions'); await clic('a[href="#reunions/e1"]'); await clic('.fiche [data-rejoindre="e1"]'); vrai('« Rejoindre » passe par la préparation', await ev(() => S.salle && S.salle.etape === 'prepa' && !!document.querySelector('.prepa')));
    await clic('[data-salle="cam"]'); vrai('couper la caméra avant d’entrer', await ev(() => !S.salle.cam && !!document.querySelector('.apercu.sans'))); await clic('[data-salle="cam"]');
    await clic('[data-salle="entrer"]'); vrai('entrer ouvre la salle', await ev(() => S.salle.etape === 'salle' && document.querySelectorAll('#tuiles .tuile').length === S.salle.presents.length + 1));
    await clic('[data-salle="admettre"]'); vrai('admettre quelqu’un de la salle d’attente', await ev(() => S.salle.attente.length === 0 && S.salle.presents.includes('ines') && !document.querySelector('.attente')));
    await clic('[data-salle="micro"]'); vrai('couper son micro', await ev(() => !S.salle.micro && !!document.querySelector('.ctl.off')));
    await clic('[data-salle="main"]'); vrai('lever la main', await ev(() => S.salle.main && !!document.querySelector('.tuile .main')));
    await clic('[data-salle="volet"][data-v="discussion"]'); await page.fill('#salle-msg', 'Je partage le planning.'); await clic('[data-salle="chat-envoyer"]'); vrai('écrire dans la discussion', await ev(() => S.salle.chat.slice(-1)[0].t === 'Je partage le planning.' && /Je partage le planning/.test(document.querySelector('#salle-chat').textContent)));
    await clic('[data-salle="volet"][data-v="options"]'); await clic('.volet [data-salle="rec"]'); vrai('enregistrer affiche REC', await ev(() => S.salle.rec && !!document.querySelector('.rec')));
    await clic('[data-salle="volet"][data-v="discussion"]'); await clic('[data-salle="fichier"]'); vrai('envoyer un fichier pendant la réunion', await ev(() => S.salle.fichiers.length === 1 && !!document.querySelector('#salle-chat .chat-f')));
    await clic('[data-salle="volet"][data-v="notes"]'); await page.fill('#salle-notes', 'Karim commande le compresseur.'); vrai('prendre des notes', await ev(() => S.salle.notes === 'Karim commande le compresseur.'));
    await clic('[data-salle="volet"][data-v="options"]'); await clic('.volet [data-salle="st"]'); vrai('les sous-titres s’affichent', await ev(() => !!document.querySelector('#soustitres'))); await clic('.volet [data-salle="volet"]');
    await clic('.bas [data-salle="partage"]'); vrai('partager l’écran ouvre le partage avec ses outils de dessin', await ev(() => S.salle.partage && !!document.querySelector('#an-tuile #an-barre') && document.querySelector('#an-vue').getBoundingClientRect().height >= 100), await ev(() => document.querySelector('#an-vue') && document.querySelector('#an-vue').getBoundingClientRect().height));
    await clic('.bas [data-salle="partage"]'); vrai('arrêter le partage', await ev(() => !S.salle.partage && !document.querySelector('#an-tuile')));
    await clic('[data-salle="quitter"]'); vrai('quitter propose d’envoyer un compte rendu', await ev(() => !S.salle && !document.querySelector('#plein').innerHTML && !!document.querySelector('#calque [data-action="cr-envoyer"]')));
    vrai('le compte rendu reprend la durée, les notes et le fichier', await ev(() => document.querySelector('#cr-notes').value === 'Karim commande le compresseur.' && /Planning semaine 47/.test(document.querySelector('#calque').textContent)));
    await clic('#calque [data-action="cr-envoyer"]'); vrai('le compte rendu part dans le canal de l’équipe, notes et fichier compris', await ev(() => { const m = conv('equipe').msgs.slice(-2); return /Compte rendu/.test(m[1].t) && /Karim commande/.test(m[1].t) && m[0].type === 'fichier' && !!evt('e1').cr; }));
    await va('reunions'); await clic('[data-action="rejoindre-code"]'); await page.fill('#code', '123456789'); await clic('[data-action="code-ok"]'); vrai('rejoindre avec un code', await ev(() => S.salle && /123 456/.test(S.salle.e.titre))); await clic('[data-salle="annuler"]');
    await va('messages/equipe'); await clic('.conv [data-appeler="equipe"]'); vrai('appeler un canal ouvre une réunion', await ev(() => S.salle && S.salle.etape === 'salle')); await clic('[data-salle="quitter"]'); await clic('#calque [data-ferme]');

    /* ── profil ── */
    await va('profil'); await clic('[data-action="statut"]'); await clic('[data-statut="npd"]'); vrai('changer de statut se voit', await ev(() => S.statut === 'npd' && /Ne pas déranger/.test(document.querySelector('#scene').textContent)));
    await clic('[data-regl="heuresPro"]'); vrai('un réglage bascule', await ev(() => S.regl.heuresPro === false && document.querySelector('[data-regl="heuresPro"]').getAttribute('aria-checked') === 'false'));
    await clic('[data-theme-choix="dark"]'); vrai('le thème Nuit s’applique', await ev(() => document.documentElement.dataset.theme === 'dark' && getComputedStyle(document.querySelector('#app')).backgroundColor === 'rgb(12, 21, 48)'));
    await clic('[data-theme-choix="light"]'); vrai('le thème Jour s’applique', await ev(() => getComputedStyle(document.querySelector('#app')).backgroundColor === 'rgb(246, 247, 251)'));
    await clic('[data-action="profil-modifier"]'); await page.fill('#pf-role', 'Dirigeante'); await clic('[data-action="profil-ok"]'); vrai('modifier son profil', await ev(() => P.moi.r === 'Dirigeante' && /Dirigeante/.test(document.querySelector('#scene').textContent)));
    for (const a of ['espace', 'abonnement', 'a-propos']) { await clic(`[data-action="${a}"]`); vrai('la feuille « ' + a + ' » s’ouvre et se ferme', await ev(() => !!document.querySelector('#calque .feuille'))); await page.keyboard.press('Escape'); vrai('Échap ferme la feuille « ' + a + ' »', await ev(() => !document.querySelector('#calque').innerHTML)); }
    /* la touche Retour ferme la feuille ouverte */
    await va('agenda'); await clic('[data-action="programmer"]'); await page.goBack(); await page.waitForTimeout(150); vrai('la touche Retour ferme la feuille', await ev(() => !document.querySelector('#calque').innerHTML));
    vrai('la page ne déborde pas de côté', await ev((w) => document.documentElement.scrollWidth <= w + 1, p.w));
    vrai('aucune erreur JavaScript', errs.length === 0, errs.slice(0, 3));
    await ctx.close(); }
  console.log(`${ok} ✓  ${ko} ✗`); await b.close(); process.exit(ko ? 1 : 0);
})();
