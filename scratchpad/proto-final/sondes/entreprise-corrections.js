// Les 13 défauts de la relecture « tout » du lot entreprise (étape 7, 17 novembre 2026) : une section par défaut, chacune REJOUE le geste
// de la personne dans la vraie page et lit ce qu'elle voit. Rend « N ✓ · M ✗ », sort en 1 si un contrôle tombe.
// ⛔ 127.0.0.1 seulement, entreprise fictive Clim Services 17. Chaque section compte sa population avant de conclure.
// Usage : node scratchpad/proto-final/sondes/entreprise-corrections.js [01 05 …]   (sans argument : toutes les sections)
const C = require('./entreprise-commun.js'); const D = require('./droits-commun.js'); const { L, v } = C;
const CAP = C.CAP;
const SEL = process.argv.slice(2);
const veut = n => !SEL.length || SEL.includes(n);
const cases = (o) => Object.assign({ planif:'1111', inter:'1111', crm:'1111', ventes:'1111', compta:'1111', stock:'1111', temps:'1111', com:'1111', achats:'1111', admin:'1000' }, o || {});
const personne = async (appareil, o, nuit) => { const c = await D.ouvrirComme({ qui:'marc', appareil, nuit }); await c.p.evaluate(D.INJECTER, Object.assign({ k:'zz', prenom:'Zoé', nom:'Zéro', pd:'secr', terrain:false }, o)); await L.calme(c.p, 500); return c; };
const norm = t => String(t || '').replace(/[  ]/g, ' ').replace(/\s+/g, ' ').trim();
(async () => {
  // ───── 01 + 12 : le SIRET seul suffit ; un seul verdict (bandeau et facture)
  if (veut('01') || veut('12')) for (const pr of ['mac', 'iphone']) {
    const c = await C.ouvrirEnt({ profil:pr }); const p = c.p;
    // 12 : fiche complète → bandeau VERT « complète » ; mentions manquantes → bandeau ORANGE qui ne dit plus « complète »
    await p.evaluate(() => { Object.assign(ENTREPRISE, { forme:'SARL', capital:'5 000', rcs:'RCS La Rochelle 303 123 456', assureur:'MAAF Pro', assurc:'MAAF, 79036 Niort', assurZone:'France métropolitaine' }); rendre(); }); await L.calme(p, 300);
    const complet = await p.evaluate(() => { const b = document.querySelector('.ent-ban'); return { vert:b.classList.contains('ok-bloc'), orange:b.classList.contains('attention'), t:b.textContent, L:cxMentionsManquantes().length, M:entrepriseManque().length }; });
    v(`12 ${pr} : tout est en règle (population : 0 mention manquante) → bandeau vert « complète »`, complet.L === 0 && complet.M === 0 && complet.vert && /Ta fiche est complète/.test(complet.t), complet);
    await p.evaluate(() => { ENTREPRISE.siret = ''; ENTREPRISE.forme = ''; ENTREPRISE.capital = ''; ENTREPRISE.rcs = ''; rendre(); }); await L.calme(p, 400);
    const ban = await p.evaluate(() => { const b = document.querySelector('.ent-ban'); return { orange:b.classList.contains('attention'), t:norm(b.textContent), bouton:(b.querySelector('[data-ent^="completer"]') || {}).dataset }; function norm(x) { return x.replace(/\s+/g, ' ').trim(); } });
    v(`01 ${pr} : SIRET manquant → bandeau « Il manque ton SIRET »`, ban.orange && /Il manque ton SIRET/.test(ban.t), ban);
    await L.toucher(c, '[data-ent="completer"]');
    v(`01 ${pr} : « Compléter » ouvre les mentions légales`, /mentions légales|Ce que tes factures/.test(await C.panneauOuvert(p)), await C.panneauOuvert(p));
    await p.locator('#fl-siret').fill('73282932000074'); await L.toucher(c, '[data-cx="ficheok"]');
    const ap = await p.evaluate(() => ({ siret:ENTREPRISE.siret, forme:ENTREPRISE.forme, M:entrepriseManque().length, L:cxMentionsManquantes().map(x => x.replace(/ \(.*\)$/, '')) }));
    const t = await C.toast(p), ouv = await C.panneauOuvert(p);
    v(`01 ${pr} : le SIRET seul s'enregistre (forme, capital, immatriculation, assurance vides), panneau fermé`, ap.siret === '732 829 320 00074' && ap.forme === '' && ouv === '', { ap, ouv, t });
    v(`01 ${pr} : la facture est débloquée (rien ne manque côté SIRET, nom, adresse)`, ap.M === 0, ap);
    v(`01 ${pr} : le toast nomme ce qui reste (population : ${ap.L.length} mentions)`, ap.L.length >= 3 && /Il reste à compléter : la forme juridique/.test(t), t);
    // 12 : le bandeau ne dit plus « complète » — orange, avec la liste et un bouton « Compléter » qui rouvre les mentions
    const b2 = await p.evaluate(() => { const b = document.querySelector('.ent-ban'); return { orange:b.classList.contains('attention'), vert:b.classList.contains('ok-bloc'), t:b.textContent.replace(/\s+/g, ' ').trim(), bouton:(b.querySelector('[data-ent="completer|legal"]') || {}).textContent || '' }; });
    v(`12 ${pr} : mentions manquantes → bandeau ORANGE, plus « complète », avec la liste`, b2.orange && !b2.vert && !/Ta fiche est complète/.test(b2.t) && /Il reste à compléter, dans tes mentions légales : la forme juridique/.test(b2.t), b2);
    v(`12 ${pr} : le bandeau porte un bouton « Compléter »`, b2.bouton === 'Compléter', b2.bouton);
    await L.toucher(c, '[data-ent="completer|legal"]'); v(`12 ${pr} : « Compléter » du bandeau rouvre les mentions légales`, /mentions légales|Ce que tes factures/.test(await C.panneauOuvert(p)), await C.panneauOuvert(p));
    await p.evaluate(() => fermerPanneau());
    // la fiche d'une facture dit la MÊME chose (« il manque »), sans « complète » : un seul verdict
    await p.evaluate(() => aller('facture-x-' + FACTURES.find(f => f.num !== '—').id)); await L.calme(p, 700);
    const fac = await p.evaluate(() => (document.querySelector('.cx-mq') || {}).textContent || '');
    v(`12 ${pr} : la facture ouverte dit « Il manque sur cette facture : la forme juridique… » (même verdict que le bandeau)`, /Il manque sur cette facture : la forme juridique/.test(norm(fac)), fac);
    if (pr === 'mac') await L.capture(c, CAP + 'corr-bandeau-orange-mac.png', false);
    // 01 : une valeur FAUSSE reste refusée (SIRET, TVA), et un capital qui n'est pas un montant
    await L.aller(p, 'entreprise'); await L.toucher(c, '[data-ent="carte|legal"]');
    await p.locator('#fl-siret').fill('123'); await L.toucher(c, '[data-cx="ficheok"]');
    v(`01 ${pr} : un SIRET faux est toujours refusé`, /quatorze chiffres/.test((await C.champ(p, 'fl-siret')).err), await C.champ(p, 'fl-siret'));
    await L.fin(c);
  }

  // ───── 02 : un téléphone sans six chiffres est refusé
  if (veut('02')) for (const pr of ['mac', 'iphone']) {
    const c = await C.ouvrirEnt({ profil:pr }); await L.toucher(c, '[data-ent="carte|ident"]'); const BTN = '[data-ent="identok"]'; let n = 0;
    for (const x of ['......', '++++++', '------', '+ + + +', '12345', '+..--..']) { await C.remplir(c.p, 'en-tel', x); await L.toucher(c, BTN); n++; const r = await C.champ(c.p, 'en-tel'); v(`02 ${pr} : « ${x} » refusé`, r.err === 'Ce numéro de téléphone ne semble pas juste.' && r.invalide, r); }
    for (const x of ['+33 5 46 11 22 33', '05.46.11.22.33', '0546112233', '(+33) 546 112']) { await C.remplir(c.p, 'en-tel', x.replace(/[()]/g, '')); await L.toucher(c, BTN); n++; const ouv = await C.panneauOuvert(c.p); v(`02 ${pr} : « ${x.replace(/[()]/g, '')} » accepté`, ouv === '', ouv); if (ouv !== '') {} else await L.toucher(c, '[data-ent="carte|ident"]'); }
    v(`02 ${pr} : population : ${n} cas joués`, n === 10, n); await L.fin(c);
  }

  // ───── 03 : « Enregistrer » reste sous le pouce sur téléphone (feuille collée en bas)
  if (veut('03')) for (const [pr, nuit] of [['iphone', false], ['iphone', true], ['android', false], ['petit', true], ['mac', false]]) {
    const c = await C.ouvrirEnt({ profil:pr, nuit }); const p = c.p; let n = 0;
    for (const carte of ['ident', 'legal', 'banque', 'horaires', 'logo']) {
      await L.toucher(c, `[data-ent="carte|${carte}"]`); await L.calme(p, 450); n++;
      const r = await p.evaluate(() => { const z = document.querySelector('#calque .panneau'); z.scrollTop = 0; const a = z.querySelector('.actions:last-child'), b = a && a.getBoundingClientRect(), s = a && getComputedStyle(a), btn = a && a.querySelector('.btn'), hb = btn && btn.getBoundingClientRect();
        return { H:innerHeight, haut:z.scrollHeight > z.clientHeight, bas:b && Math.round(b.bottom), btnBas:hb && Math.round(hb.bottom), pos:s && s.position, fond:s && s.backgroundColor, sticky:z.classList.contains('ent-pan') }; });
      if (pr === 'mac') v(`03 ${pr} : ${carte} — sur ordinateur la rangée reste dans le flux (pas collée)`, r.pos === 'static', r);
      else if (r.haut) v(`03 ${pr}${nuit ? ' nuit' : ''} : ${carte} — « Enregistrer » est visible SANS défiler (feuille haute) et sa rangée a un fond`, r.pos === 'sticky' && r.btnBas <= r.H && r.fond !== 'rgba(0, 0, 0, 0)' && r.fond !== 'transparent', r);
      else v(`03 ${pr}${nuit ? ' nuit' : ''} : ${carte} — feuille courte : le bouton est à l'écran`, r.btnBas <= r.H, r);
      if (pr === 'iphone' && carte === 'ident') await L.capture(c, CAP + `corr-feuille-collee-iphone-${nuit ? 'nuit' : 'jour'}.png`, false);
      await p.evaluate(() => fermerPanneau());
    }
    v(`03 ${pr} : population : ${n} feuilles ouvertes`, n === 5, n); await L.fin(c);
  }

  // ───── 04 : un tarif s'écrit au centime
  if (veut('04')) { const c = await C.ouvrirEnt({ profil:'mac' }); await L.toucher(c, '[data-ent="carte|horaires"]');
    await C.remplir(c.p, 'en-horaire', '65,555'); await C.remplir(c.p, 'en-z1', '30,004'); await C.remplir(c.p, 'en-z2', '48,505'); await C.remplir(c.p, 'en-z3', '65'); await L.toucher(c, '[data-ent="horairesok"]');
    const t = await c.p.evaluate(() => ({ h:TARIFS.horaire, z:TARIFS.zone.slice ? TARIFS.zone.slice(1, 4) : [TARIFS.zone[1], TARIFS.zone[2], TARIFS.zone[3]], ouv:!document.querySelector('#calque .panneau') }));
    v('04 : « 65,555 » est rangé 65,56 (au centime)', t.h === 65.56, t); v('04 : les zones aussi (30,004 → 30 ; 48,505 → 48,51 ; 65 → 65)', t.z[0] === 30 && t.z[1] === 48.51 && t.z[2] === 65, t); v('04 : le panneau se ferme (enregistré)', t.ouv, t);
    await L.fin(c); }

  // ───── 05 : la fiche d'un client se modifie avec « Modifier », pas avec « Créer »
  if (veut('05')) for (const [crm, nom] of [['1100', 'Voir + Créer'], ['1010', 'Voir + Modifier'], ['1110', 'Voir + Créer + Modifier'], ['1000', 'Voir seul']]) {
    const c = await personne('mac', { cases:cases({ crm }) }); const p = c.p; await L.aller(p, 'clients'); await L.calme(p, 400);
    const cle = await p.evaluate(() => Object.keys(CLIENTS)[0]); await p.evaluate(k => { ongletClient = 'infos'; aller('client-x-' + k); }, cle); await L.calme(p, 700);
    const m = crm[2] === '1'; const avant = await p.evaluate(k => CLIENTS[k].acces, cle);
    const r = await p.evaluate(() => { const ch = [...document.querySelectorAll('[data-ci]')], b = document.querySelector('[data-action="clientEnreg"]'); return { champs:ch.length, figes:ch.filter(e => e.disabled).length, bouton:!!b && getComputedStyle(b).display !== 'none', texte:(document.querySelector('#contenu .actions .gris.petit') || {}).textContent || '' }; });
    v(`05 « ${nom} » (population : ${r.champs} champs) : ${m ? 'les champs sont saisissables et « Enregistrer » est là' : 'les champs sont figés et « Enregistrer » n’est pas dessiné'}`, r.champs === 6 && (m ? r.figes === 0 && r.bouton : r.figes === 6 && !r.bouton), r);
    if (!m) v(`05 « ${nom} » : la phrase dit pourquoi`, /Tu peux regarder cette fiche ; pour la changer, demande à Marc\./.test(r.texte), r.texte);
    // le geste forcé (clic synthétique sur le bouton, même caché) : modifie SEULEMENT avec « Modifier »
    const ap = await p.evaluate(async k => { const ta = document.querySelector('[data-ci="acces"]'); if (!ta.disabled) ta.value = 'Consigne posée par la sonde'; const b = document.querySelector('[data-action="clientEnreg"]'); if (b) b.click(); await new Promise(r => setTimeout(r, 200)); return { acces:CLIENTS[k].acces, refus:DROITS_REFUS.filter(x => x.verbe === 'clientEnreg').length }; }, cle);
    v(`05 « ${nom} » : ${m ? 'l’enregistrement passe' : 'le clic forcé est avalé, le client ne change pas'}`, m ? ap.acces === 'Consigne posée par la sonde' : (ap.acces === avant && ap.refus >= 1), { ap, avant });
    if (crm === '1100') { const toast = await C.toast(p); v('05 « Voir + Créer » : le refus dit « modifier » (la phrase de la case)', /modifier un client|changer un client|Modifier|changer/i.test(toast) || /Ce geste n’est pas ouvert/.test(toast), toast); }
    await L.fin(c);
  }

  // ───── 07 : l'atelier mène à Mon entreprise
  if (veut('07')) {
    for (const [qui, doit] of [['marc', true], ['julie', null]]) {
      const c = await L.ouvrir({ profil:'mac', qui }); const p = c.p;
      const voit = await p.evaluate(() => !!droitVoit('entreprise'));
      await p.evaluate(() => { opdOuvrir('devis', {}); }); await L.calme(p, 2500);
      const f = L.cadre(p); v(`07 ${qui} : l'atelier est ouvert (population : un cadre)`, !!f, p.frames().map(x => x.url()));
      if (f) {
        await f.evaluate(() => { ouvrirIdentite(DEFAUT_ID); }); await L.calme(p, 600);
        const bouton = await f.evaluate(() => { const b = document.querySelector('[data-ent-ouvrir]'); return b ? b.textContent.trim() : ''; });
        const comp = await f.evaluate(() => [...document.querySelectorAll('.fen-pied [data-fen-x]')].map(b => b.textContent.trim()));
        v(`07 ${qui} : le bouton « Ouvrir Mon entreprise » ${voit ? 'est là' : 'n’est pas là (il ne voit pas Mon entreprise)'} ; « Compris » reste`, (voit ? bouton === 'Ouvrir Mon entreprise' : bouton === '') && comp.includes('Compris'), { bouton, comp, voit });
        if (voit) { await f.evaluate(() => document.querySelector('[data-ent-ouvrir]').click()); await L.calme(p, 900);
          const ap = await p.evaluate(() => ({ route, atelier:!document.getElementById('opdz').hidden, h1:(document.querySelector('#contenu h1') || {}).textContent }));
          v('07 marc : l’atelier se ferme et Mon entreprise s’ouvre', ap.route === 'entreprise' && !ap.atelier && ap.h1 === 'Mon entreprise', ap); }
      }
      await L.fin(c);
    }
  }

  // ───── 08 : Boîte mail, les cases ne promettent que ce que la page garde
  if (veut('08')) { const c = await personne('mac', { cases:cases({ com:'1000' }) }); await L.aller(c.p, 'boiteMail'); await L.calme(c.p, 2200);
    const r = await c.p.evaluate(() => ({ note:!!document.querySelector('.droits-note'), ph:DROIT_PHRASES.com }));
    v('08 : com = Voir seul → pas de note « tu peux regarder cet écran, pas le modifier » sur la Boîte mail (elle mentirait)', !r.note, r);
    v('08 : les phrases des cases ne promettent plus « écrire », « répondre », « classer »', !/écrire|répondre|classer|confier/.test(JSON.stringify(r.ph)) && /connecter une boîte/.test(r.ph.c) && /déconnecter une boîte/.test(r.ph.s), r.ph);
    await L.fin(c); }

  // ───── 09 : devis et contrats : « Composer » demande « Créer », rouvrir un document demande « Modifier »
  if (veut('09')) for (const [ventes, nom] of [['1000', 'Voir seul'], ['1100', 'Voir + Créer'], ['1010', 'Voir + Modifier']]) {
    const c = await personne('mac', { cases:cases({ ventes }) }); const p = c.p; const cree = ventes[1] === '1', modifie = ventes[2] === '1';
    // un document composé dans l'atelier (une ligne de la liste) : on le fabrique dans la liste de l'hôte
    await p.evaluate(() => { ATD.docs = [{ id:'d1', type:'devis', nom:'Entretien annuel', numero:'D-2026-099', etat:'brouillon', client:'Cabinet dentaire Martin', clientId:'', ttc:120000, prix:0, maj:Date.now(), nr:0 }]; OPDZ.sigDocs = ''; }); await L.aller(p, 'devis'); await p.evaluate(() => rendre()); await L.calme(p, 600);
    const r = await p.evaluate(() => { const vis = e => e && getComputedStyle(e).display !== 'none' && e.getClientRects().length > 0; return { composer:[...document.querySelectorAll('[data-opd="devis"]')].filter(vis).length, lignes:document.querySelectorAll('.opd-l').length, lignesBouton:[...document.querySelectorAll('.opd-l[data-opd="doc"]')].filter(vis).length, lect:document.querySelectorAll('.opd-l.opd-lect').length }; });
    v(`09 « ${nom} » : « Composer un devis » ${cree ? 'est dessiné' : 'n’est pas dessiné'} (population : ${r.lignes} ligne de la liste)`, r.lignes === 1 && (cree ? r.composer === 1 : r.composer === 0), r);
    v(`09 « ${nom} » : la ligne du document composé ${modifie ? 'est un bouton qui rouvre' : 'se lit sans s’ouvrir'}`, modifie ? r.lignesBouton === 1 && r.lect === 0 : r.lignesBouton === 0 && r.lect === 1, r);
    // le geste forcé : avalé par la garde (clic synthétique sur le bouton, même caché)
    const g = await p.evaluate(async () => { const n0 = DROITS_REFUS.length; const b = document.querySelector('[data-opd="devis"]'); if (b) b.click(); await new Promise(r => setTimeout(r, 300)); return { refus:DROITS_REFUS.length - n0, ouvert:!document.getElementById('opdz').hidden }; });
    if (!cree) v(`09 « ${nom} » : le clic forcé sur « Composer » est avalé (un refus compté), l’atelier ne s’ouvre pas`, g.refus >= 1 && !g.ouvert, g);
    // l'atelier se défend aussi tout seul : le message de rôle porte les droits, l'ouverture d'un document NEUF sans « Créer » est refusée DANS l'atelier
    await p.evaluate(() => { opdEnvoyer(opdRoleMsg()); opdOuvrir('devis', {}); }); await L.calme(p, 2600);
    const a = await p.evaluate(() => ({ ouvert:!document.getElementById('opdz').hidden })); const f = L.cadre(p);
    const fl = f && await f.evaluate(() => ({ creer:OPG.role.creer, modifier:OPG.role.modifier }));
    v(`09 « ${nom} » : l'atelier a reçu les droits (créer ${cree}, modifier ${modifie}) — population : un cadre`, !!fl && fl.creer === cree && fl.modifier === modifie, fl);
    v(`09 « ${nom} » : ${cree ? 'composer un document neuf s’ouvre' : 'composer un document neuf est refusé par l’atelier lui-même (hors clic)'}`, cree ? a.ouvert === true : a.ouvert === false, a);
    await L.fin(c);
  }

  // ───── 10 : un nom d'entreprise de 60 signes ne casse pas le bloc de marque
  if (veut('10')) for (const [pr, nuit] of [['mac', false], ['windows', true], ['mac720', false], ['ipad', false]]) {
    const c = await C.ouvrirEnt({ profil:pr, nuit }); const p = c.p; const nom = 'Entreprise Générale de Climatisation et Plomberie Littoral'; 
    await p.evaluate(n => { ENTREPRISE.nom = n; rendre(); }, nom); await L.calme(p, 600);
    const r = await p.evaluate(() => { const a = document.querySelector('.menu a.logo'); if (!a) return null; const i = a.querySelector('i'), sm = a.querySelector('small'), ri = i.getBoundingClientRect(), ra = a.getBoundingClientRect(), nx = [...a.parentElement.children].find(e => e !== a && e.getBoundingClientRect().top >= ra.top + 8), rn = nx && nx.getBoundingClientRect(), lh = parseFloat(getComputedStyle(sm).lineHeight) || 15, hs = sm.getBoundingClientRect().height;
      return { tuileL:Math.round(ri.width), tuileH:Math.round(ri.height), lignes:Math.round(hs / lh), titre:a.getAttribute('title') || '', bas:Math.round(ra.bottom), hautSuivant:rn ? Math.round(rn.top) : null, nom:ENTREPRISE.nom.length }; });
    v(`10 ${pr}${nuit ? ' nuit' : ''} : le menu porte un bloc de marque (population)`, !!r && r.nom >= 55, r);
    if (r) { v(`10 ${pr}${nuit ? ' nuit' : ''} : la tuile « OP » garde son carré (38 px)`, r.tuileL >= 36 && r.tuileH >= 36 && Math.abs(r.tuileL - r.tuileH) <= 3, r);
      v(`10 ${pr}${nuit ? ' nuit' : ''} : le nom tient sur deux lignes au plus, le nom entier est dans l'infobulle`, r.lignes <= 2 && r.titre.includes('Littoral'), r);
      v(`10 ${pr}${nuit ? ' nuit' : ''} : le bloc ne recouvre pas la ligne suivante du menu`, r.hautSuivant === null || r.bas <= r.hautSuivant + 1, r); }
    await L.capture(c, CAP + `corr-marque-longue-${pr}-${nuit ? 'nuit' : 'jour'}.png`, false); await L.fin(c);
  }

  // ───── 11 : les liens de « Ce qui se règle ailleurs » ramènent à Mon entreprise
  if (veut('11')) for (const pr of ['iphone', 'mac']) for (const lien of ['rdv', 'auto', 'ndf', 'stock', 'boites']) {
    const c = await C.ouvrirEnt({ profil:pr }); const p = c.p;
    await L.toucher(c, `[data-ent="lien|${lien}"]`); await L.calme(p, 1500);
    const r = await p.evaluate(() => { const b = document.querySelector('.rl-retour, .retour-va'); return { route, retour:b ? b.textContent.replace(/\s+/g, ' ').trim() : '' }; });
    v(`11 ${pr} : « ${lien} » mène ailleurs (${r.route}) et propose « Retour · Mon entreprise »`, r.route !== 'entreprise' && /Retour.*Mon entreprise|Revenir à Mon entreprise/.test(r.retour), r);
    await p.evaluate(() => { try { fermerPanneau(); } catch (e) {} }); await L.calme(p, 300);
    const b = p.locator('.rl-retour, .retour-va').first(); if (await b.count()) { await b.click(); await L.calme(p, 700); const ap = await p.evaluate(() => route); v(`11 ${pr} : « ${lien} » — le bouton ramène à Mon entreprise`, ap === 'entreprise', ap); }
    await L.fin(c);
  }

  // ───── 13 : le bloc Droits de la fiche d'une personne
  if (veut('13')) for (const [pr, nuit] of [['iphone', true], ['mac', false], ['android', false]]) {
    const c = await C.ouvrirEnt({ profil:pr, nuit }); const p = c.p; await L.aller(p, 'equipe'); await p.evaluate(() => { eqFiche('julie'); const dt = document.querySelector('details.eqx-det'); if (dt) dt.open = true; }); await L.calme(p, 700);
    const r = await p.evaluate(() => { const z = document.querySelector('#calque .panneau'), t = z.querySelector('.fo-terrain'), sel = z.querySelector('[data-eqprof]'), rt = t.getBoundingClientRect(), rs = sel && sel.closest('label').getBoundingClientRect(), titre = t.querySelector('b'), rb = titre.getBoundingClientRect(), ri = t.querySelector('input').getBoundingClientRect();
      const non = [...z.querySelectorAll('.eq-dr .eq-dr-non')], vides = [...z.querySelectorAll('.eq-dr label')].filter(l => !l.querySelector('input') && !l.querySelector('.eq-dr-non')).length;
      return { ecart:sel ? Math.round(rt.top - rs.bottom) : null, decalage:Math.round(Math.abs((ri.top + ri.height / 2) - (rb.top + rb.height / 2))), nonN:non.length, vides, lignesTitre:Math.round(rb.height / (parseFloat(getComputedStyle(titre).lineHeight) || 20)) }; });
    v(`13 ${pr}${nuit ? ' nuit' : ''} : « Travaille sur le terrain » respire sous « Appliquer un profil » (≥ 12 px)`, r.ecart === null || r.ecart >= 12, r);
    v(`13 ${pr}${nuit ? ' nuit' : ''} : la case est alignée sur le TITRE (écart de centre ≤ 6 px)`, r.decalage <= 6, r);
    if (pr === 'mac') { v(`13 ${pr} : la grille détaillée — population : ${r.nonN} cases sans geste, toutes ont un tiret (0 vide sans signe)`, r.nonN > 0 && r.vides === 0, r); }
    await p.evaluate(() => { const z = document.querySelector('#calque .panneau'), t = z.querySelector('.fo-terrain'); if (z && t) z.scrollTop = t.offsetTop - 140; }); await L.calme(p, 300);
    await L.capture(c, CAP + `corr-droits-bloc-${pr}-${nuit ? 'nuit' : 'jour'}.png`, false); await L.fin(c);
  }
  await C.fin();
})().catch(e => { console.error('ERREUR sonde', e); process.exit(2); });
