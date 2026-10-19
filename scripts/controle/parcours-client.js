/* Le parcours du CLIENT MYSTÈRE — ce qu'une entreprise vit, du site à l'application, joué au doigt sur le jumeau.

   Camille Exemple dirige « Hygiène Exemple », une petite entreprise de nettoyage. Sur son iPhone :
     1. elle arrive sur teamop.fr, regarde les tarifs, choisit Business ;
     2. la page de paiement lui demande un compte : elle le crée, confirme son adresse par le courriel reçu ;
     3. elle paie (Stripe simulé) et atterrit sur « Merci » ;
     4. elle envoie sa demande d'accès (métier, nombre d'utilisateurs, lien souhaité) ;
   puis, dans la Tour (le bureau de TEAM OP), la demande est acceptée et l'accès lui est envoyé par courriel ;
     5. elle ouvre le lien reçu, se connecte avec son identifiant et son mot de passe provisoire, choisit le sien ;
     6. elle fait le tour de son application : chaque rubrique s'ouvre, sans erreur ni « undefined », et l'accès est
        bien celui qu'elle a payé (pas « Accès suspendu ») ;
     7. elle recharge : elle est toujours là.
   Chaque étape est un geste RÉEL (toucher, taper) quand l'écran le permet ; quand le parcours passe par une fonction
   plutôt qu'un doigt, l'étape le DIT dans ses notes. Une étape qui n'a pas pu se jouer est « non jouée », jamais verte. */
'use strict';
const crypto = require('crypto');
const dormir = ms => new Promise(r => setTimeout(r, ms));
/* Les mots qu'un client NEUF ne doit pas lire dans son application : un logiciel concurrent, le nom d'un client réel.
   Rangés « à regarder » (un humain tranche), jamais « défaut ». */
const MOTS_INTERNES = /\b(Organilog|ELAN|Elan Gestion|ELAN GESTION)\b/g;

async function jouer(J, K, o) {
  const opt = o || {};
  const suffixe = crypto.randomBytes(3).toString('hex');
  const C = { prenom: 'Camille', nom: 'Exemple', entreprise: 'Hygiène Exemple ' + suffixe, email: 'camille.' + suffixe + '@exemple.fr',
    mdp: 'Jumeau-' + crypto.randomBytes(5).toString('hex'), tel: '06 12 34 56 78', lien: 'hygiene' + suffixe, formule: opt.formule || 'business',
    metier: 'nettoyage', utilisateurs: 3 };
  const p = await J.onglet({ profil: opt.profil || 'telephone', nom: 'client' });
  const etat = { client: C, petites: new Map(), internes: new Set() };
  const passe = (nom, fn, x) => K.etape(nom, async (e) => { p.etape = nom; return fn(e); }, x);
  const juger = async (e, nom) => {
    const a = await p.auditEcran();
    if (a.defileDeCote > 0) K.constat('défaut', 'La page glisse de côté sous le doigt (' + a.defileDeCote + ' px)', p.url, nom);
    if (a.motsSuspects && a.motsSuspects.length) K.constat('défaut', 'Texte suspect à l\'écran : ' + a.motsSuspects.join(', '), p.url, nom);
    /* regroupées par commande sur tout le parcours (le même en-tête de site sur six pages = UN constat) — voir defense.js */
    for (const c of (a.ciblesPetites || [])) { const k = c.replace(/ \d+×\d+$/, ''); if (!etat.petites.has(k)) etat.petites.set(k, { taille: c.slice(k.length + 1), pages: new Set() }); etat.petites.get(k).pages.add(p.url.replace('https://teamop.fr', '').split(/[?#]/)[0]); }
    e.capture(await p.capture(nom));
  };

  /* ── 1. Le site ── */
  await passe('Accueil du site', async (e) => {
    await p.aller('https://teamop.fr/');
    const t = await p.texte(); e.note('titre : ' + await p.ev('document.title'));
    await juger(e, 'accueil');
    return /TEAM OP/i.test(t) && t.length > 200;
  }, { bloquante: true });

  await passe('Tarifs, puis « Choisir Business »', async (e) => {
    await p.aller('https://teamop.fr/tarifs.html');
    await juger(e, 'tarifs');
    const libelle = { pro: 'Choisir Pro', business: 'Choisir Business', premium: 'Choisir Business Premium' }[C.formule];
    const b = await p.toucher({ texte: libelle, exact: true }) || await p.toucher(libelle);
    if (!b) { e.note('bouton « ' + libelle + ' » introuvable'); return false; }
    const ok = await p.attendre(async () => /recap-abonnement\.html/.test(p.url), 8000);
    e.note('arrivée : ' + p.url.replace('https://teamop.fr', ''));
    return ok && new RegExp('formule=' + C.formule).test(p.url);
  }, { bloquante: true });

  /* ── 2. La page de paiement exige un compte ── */
  await passe('Page de paiement : un compte est demandé', async (e) => {
    await p.attendre(async () => (await p.texte()).length > 100, 8000); await dormir(800);
    await juger(e, 'paiement-sans-compte');
    const b = await p.toucher({ sel: '#btnPayer' });
    if (!b) { e.note('#btnPayer introuvable'); return false; }
    e.note('bouton : « ' + b.nom + ' »');
    const ok = await p.attendre(async () => /espace\.html/.test(p.url), 8000);
    e.note('arrivée : ' + p.url.replace('https://teamop.fr', '').slice(0, 90));
    return ok;
  }, { bloquante: true });

  await passe('Création du compte client', async (e) => {
    await p.attendre(() => p.ev(`!!document.querySelector('#a-email')`), 8000);
    /* l'onglet « Créer un compte », s'il n'est pas déjà ouvert */
    if (!(await p.ev(`!!(document.querySelector('#a-prenom')&&document.querySelector('#a-prenom').getClientRects().length)`))) await p.toucher({ sel: '#tab-signup' });
    for (const [sel, v] of [['#a-prenom', C.prenom], ['#a-nom', C.nom], ['#a-company', C.entreprise], ['#a-email', C.email], ['#a-pass', C.mdp], ['#a-pass2', C.mdp]])
      if (!(await p.taper(sel, v))) { e.note('champ ' + sel + ' introuvable'); return false; }
    await juger(e, 'inscription');
    const b = await p.toucher({ sel: '#a-submit' }); if (!b) { e.note('#a-submit introuvable'); return false; }
    const ok = await p.attendre(async () => /recap-abonnement\.html/.test(p.url), 15000);
    e.note('retour : ' + p.url.replace('https://teamop.fr', '').slice(0, 90));
    if (!ok) e.note('écran : ' + (await p.texte()).slice(0, 300));
    return ok;
  }, { bloquante: true });

  await passe('La page de paiement demande de confirmer l\'adresse', async (e) => {
    const ok = await p.attendre(async () => /confirm/i.test(await p.texte()), 10000);
    await juger(e, 'paiement-a-confirmer');
    if (!ok) e.note('écran : ' + (await p.texte()).slice(0, 300));
    return ok;
  });

  /* ── 3. Le courriel de confirmation ── */
  await passe('Courriel « Confirmez votre adresse » reçu, lien ouvert', async (e) => {
    const m = await J.attendreCourrier(c => c.a.includes(C.email) && c.liens.some(l => /mode=verifyEmail/.test(l)), 15000);
    if (!m) { e.note('aucun courriel de confirmation ; reçus : ' + J.courriers().map(c => c.a + ' « ' + c.sujet + ' »').join(' | ')); return false; }
    e.note('sujet : « ' + m.sujet + ' »');
    const lien = m.liens.find(l => /mode=verifyEmail/.test(l));
    if (!/^https:\/\/teamop\.fr\//.test(lien)) K.constat('défaut', 'Le lien de confirmation ne vise pas teamop.fr', lien.replace(/jeton=\w+/, 'jeton=…'), 'confirmation');
    await p.aller(lien);
    const ok = await p.attendre(async () => /vérifiée|confirmée/i.test(await p.texte()), 10000);
    await juger(e, 'adresse-verifiee');
    if (!ok) e.note('écran : ' + (await p.texte()).slice(0, 300));
    return ok;
  }, { bloquante: true });

  /* ── 4. Le paiement ── */
  await passe('Paiement (Stripe simulé) puis « Merci »', async (e) => {
    await p.aller('https://teamop.fr/recap-abonnement.html?formule=' + C.formule + '&utilisateurs=' + C.utilisateurs);
    await p.attendre(async () => /rattach|prêt|continuer/i.test(await p.texte()), 10000);
    await juger(e, 'paiement-pret');
    const b = await p.toucher({ sel: '#btnPayer' }); if (!b) { e.note('#btnPayer introuvable'); return false; }
    e.note('bouton : « ' + b.nom + ' »');
    const stripe = await p.attendre(async () => /checkout\.stripe\.com/.test(p.url), 12000);
    if (!stripe) { e.note('pas de départ vers Stripe ; écran : ' + (await p.texte()).slice(0, 300)); return false; }
    const s = Object.values(J.etatStripe().sessions).pop();
    e.note('session Stripe : ' + s.lignes.map(l => l.qte + ' × ' + l.prix).join(', ') + ' · compte ' + (s.email === C.email ? 'celui du client' : 'AUTRE : ' + s.email));
    if (s.email !== C.email) K.constat('défaut', 'La session Stripe ne porte pas l\'adresse du compte', s.email, 'paiement');
    await p.capture('stripe-simule');
    await p.toucher({ sel: '#payer' });
    const merci = await p.attendre(async () => /merci\.html/.test(p.url), 10000);
    await juger(e, 'merci');
    return merci;
  }, { bloquante: true });

  /* ── 5. La demande d'accès ── */
  await passe('Demande d\'accès envoyée depuis l\'espace client', async (e) => {
    await p.aller('https://teamop.fr/espace.html#v=demandes');
    const pret = await p.attendre(() => p.ev(`!!(document.querySelector('#r-metier')&&document.querySelector('#r-metier').getClientRects().length)`), 10000);
    if (!pret) { e.note('formulaire de demande introuvable ; écran : ' + (await p.texte()).slice(0, 250)); return false; }
    for (const [sel, v] of [['#r-prenom', C.prenom], ['#r-nom', C.nom], ['#r-company', C.entreprise], ['#r-tel', C.tel], ['#r-lien', C.lien], ['#r-users', String(C.utilisateurs)], ['#r-besoin', 'Suivre nos passages de nettoyage et le stock de produits.']]) {
      const vide = await p.ev(`(()=>{ const el=document.querySelector(${JSON.stringify(sel)}); return !!el && !el.value; })()`);
      if (vide && !(await p.taper(sel, v))) e.note('champ ' + sel + ' non rempli');
    }
    if (!(await p.choisir('#r-metier', C.metier))) e.note('métier « ' + C.metier + ' » absent de la liste');
    const libF = { pro: 'Pro', business: 'Business', premium: 'Business Premium' }[C.formule];
    if (!(await p.choisir('#r-formule', libF))) e.note('formule « ' + libF + ' » absente de la liste');
    await juger(e, 'demande');
    const b = await p.toucher({ texte: 'Envoyer ma demande', exact: true }) || await p.toucher('Envoyer ma demande');
    if (!b) { e.note('bouton « Envoyer ma demande » introuvable'); return false; }
    const recu = await J.attendreCourrier(c => c.a.includes(C.email) && /demande/i.test(c.sujet), 15000);
    const equipe = J.courriers().find(c => /equipe@exemple\.fr/.test(c.a) && /demande/i.test(c.sujet));
    e.note('accusé au client : ' + (recu ? '« ' + recu.sujet + ' »' : 'AUCUN') + ' · avis à TEAM OP : ' + (equipe ? '« ' + equipe.sujet + ' »' : 'AUCUN'));
    await juger(e, 'demande-envoyee');
    if (!recu) K.constat('défaut', 'Le client ne reçoit pas l\'accusé de sa demande', 'courriels reçus : ' + J.courriers().map(c => c.a + ' « ' + c.sujet + ' »').join(' | '), 'demande');
    if (!equipe) K.constat('défaut', 'TEAM OP n\'est pas prévenu de la nouvelle demande', '', 'demande');
    return !!(recu || equipe);
  }, { bloquante: true });

  /* ── 6. La Tour accepte la demande et envoie l'accès (le bureau de TEAM OP, sur un ordinateur) ── */
  const tour = await J.onglet({ profil: 'bureau', nom: 'Tour', ip: '203.0.113.20' });
  await passe('Tour : connexion de TEAM OP', async (e) => {
    tour.etape = 'Tour : connexion';
    await tour.aller('https://teamop.fr/tour.html');
    if (!(await tour.taper('#lg-id', 'controle')) || !(await tour.taper('#lg-pass', J.MDP_TOUR))) { e.note('formulaire de connexion introuvable'); return false; }
    await tour.toucher({ texte: 'Se connecter', exact: true });
    const ok = await tour.attendre(async () => !(await tour.ev(`!!(document.querySelector('#lg-id')&&document.querySelector('#lg-id').getClientRects().length)`)), 10000);
    if (!ok) e.note('toujours sur l\'écran de connexion : ' + (await tour.ev(`(document.getElementById('lg-err')||{}).innerText||''`)));
    return ok;
  }, { bloquante: true });

  await passe('Tour : la demande est acceptée (espace, formule, métier)', async (e) => {
    tour.etape = 'Tour : accepter';
    /* La Tour v2.87 a son écran « Demandes » : la carte de la demande, un champ pour l'identifiant de départ, et
       « Accepter et ouvrir l'espace ». C'est le chemin de Justin ; l'ancien (la fiche d'une entreprise de la liste)
       reste joué pour une Tour d'avant. */
    let parDemandes = false;
    if (await tour.toucher({ texte: 'Demandes', exact: true }, 4000)) {
      const carte = await tour.attendre(async () => (await tour.texte()).includes(C.entreprise) && /Accepter et ouvrir/.test(await tour.texte()), 10000);
      if (carte) {
        const paye = /payé ·/.test(await tour.texte());
        e.note('écran Demandes : la demande y est' + (paye ? ', marquée « payé »' : ', SANS la marque « payé »'));
        if (!paye) K.constat('défaut', 'Tour : la demande d\'une cliente qui a payé n\'est pas marquée « payé »', 'Stripe porte l\'abonnement à son adresse', 'Tour');
        await tour.taper('[id^="dem-id-"]', 'camille');
        e.capture(await tour.capture('tour-demandes'));
        parDemandes = !!(await tour.toucher({ texte: 'Accepter et ouvrir l’espace' }));
      } else e.note('écran Demandes ouvert, mais la demande n\'y est pas');
    }
    if (!parDemandes) await tour.toucher({ texte: 'Entreprises', exact: true });
    const vue = parDemandes || await tour.attendre(async () => (await tour.texte()).includes(C.entreprise), 10000);
    let fiche = false, parFonction = false;
    if (parDemandes) { /* acceptée depuis la carte */ }
    else if (vue) {
      await tour.toucher({ texte: C.entreprise, exact: true }) || await tour.toucher(C.entreprise);
      fiche = await tour.attendre(async () => /Accepter la demande/.test(await tour.texte()), 8000);
    } else {
      /* Mesuré le 17 octobre 2026 : la liste « Entreprises » ne lit que l'annuaire et les connexions des appareils
         (`/api/monitor/entreprises`) — une demande neuve venue du site n'y est pas, et le bouton « Accepter la
         demande » ne vit que sur la fiche d'une entreprise de CETTE liste. On le DIT, puis on accepte par la
         fonction du bouton pour contrôler la suite du parcours. */
      const accueil = await tour.ev(`(typeof CLI!=='undefined' ? (CLI.total||(CLI.list||[]).length) : null)`).catch(() => null);
      e.capture(await tour.capture('tour-entreprises'));
      K.constat('défaut', 'Tour : la nouvelle demande n\'apparaît pas dans « Entreprises »',
        'La demande de « ' + C.entreprise + ' » est enregistrée (accusé et avis envoyés), l\'accueil de la Tour compte ' + accueil + ' entreprise(s) cliente(s), mais la liste « Entreprises » en montre 0 ' +
        'et son écran vide promet « Elles apparaissent dès qu\'une s\'inscrit sur le site ». Le bouton « ✅ Accepter la demande » (tour.html, blocGestionClient) ne vit que sur la fiche d\'une entreprise de cette liste, ' +
        'qui ne lit que l\'annuaire et les connexions (server/index.js, /api/monitor/entreprises). Seul détour : ouvrir d\'abord un espace à son adresse (Accès › « Accès à la version publique »), ' +
        'pour que l\'entreprise paraisse, puis l\'accepter depuis sa fiche — deux gestes, et rien ne l\'indique.', 'Tour');
    }
    tour.repondreDialogue('camille');   // la fenêtre « identifiant » de l'acceptation (Tour d'avant)
    if (parDemandes) { /* déjà parti */ }
    else if (fiche) await tour.toucher({ texte: 'Accepter la demande' });
    else { parFonction = true; e.note('fiche introuvable au doigt : acceptation jouée par tourAccepterDemande()');
      await tour.ev(`(async()=>{ if(typeof chargerClients==='function') chargerClients(); await new Promise(r=>setTimeout(r,800)); tourAccepterDemande(${JSON.stringify(C.email)}, ${JSON.stringify(C.entreprise)}); return 1; })()`); }
    const esp = await J.attendreEspace(C.email, 15000);
    if (!esp) { e.note('aucun espace créé dans l\'annuaire'); return false; }
    etat.slug = esp.cle; etat.espace = esp.e;
    e.note('espace « ' + esp.cle + ' » · formule ' + (esp.e.formule || '—') + ' · métier ' + (esp.e.metier || '—') + (parDemandes ? ' (depuis l\'écran Demandes)' : parFonction ? ' (par la fonction)' : ''));
    if (esp.e.formule !== C.formule) K.constat('défaut', 'La formule posée par la Tour n\'est pas celle demandée', 'demandée ' + C.formule + ', posée ' + esp.e.formule, 'Tour');
    if ((esp.e.metier || '') !== C.metier) K.constat('défaut', 'Le métier demandé n\'arrive pas sur l\'espace', 'demandé ' + C.metier + ', posé ' + (esp.e.metier || 'rien'), 'Tour');
    e.capture(await tour.capture('tour-acceptee'));
    return true;
  }, { bloquante: true });

  await passe('Tour : l\'accès est envoyé par courriel au client', async (e) => {
    tour.etape = 'Tour : envoi';
    const b = await tour.toucher({ texte: 'Envoyer par e-mail au client' }, 8000);
    if (!b) { e.note('bouton « Envoyer par e-mail au client » introuvable'); return false; }
    const m = await J.attendreCourrier(c => c.a.includes(C.email) && /lien de connexion/i.test(c.sujet), 15000);
    if (!m) { e.note('aucun courriel d\'accès ; reçus : ' + J.courriers().map(c => c.a + ' « ' + c.sujet + ' »').join(' | ')); return false; }
    const t = m.texte || m.html.replace(/<[^>]+>/g, ' ');
    etat.lienAcces = m.liens.find(l => /teamop\.fr\/e\//.test(l));
    etat.identifiant = (/Identifiant\s*:\s*([^\s<]+)/.exec(t) || [])[1];
    etat.mdpProvisoire = (/Mot de passe provisoire\s*:\s*([^\s<]+)/.exec(t) || [])[1];
    e.note('sujet : « ' + m.sujet + ' » · lien ' + (etat.lienAcces ? etat.lienAcces.replace(/^https:\/\/teamop\.fr/, '') : 'ABSENT') + ' · identifiant ' + (etat.identifiant || 'ABSENT') + ' · mot de passe ' + (etat.mdpProvisoire ? 'présent' : 'ABSENT'));
    return !!(etat.lienAcces && etat.identifiant && etat.mdpProvisoire);
  }, { bloquante: true });

  /* ── 7. Le client ouvre son lien, se connecte, choisit son mot de passe ── */
  await passe('Le client ouvre le lien reçu et se connecte', async (e) => {
    await p.aller(etat.lienAcces);
    const form = await p.attendre(() => p.ev(`!!(document.querySelector('#cx-login')&&document.querySelector('#cx-login').getClientRects().length)`), 12000);
    e.note('arrivée : ' + p.url.replace('https://teamop.fr', ''));
    if (!form) { e.note('écran : ' + (await p.texte()).slice(0, 250)); return false; }
    await juger(e, 'connexion');
    await p.taper('#cx-login', etat.identifiant); await p.taper('#cx-mdp', etat.mdpProvisoire);
    await p.toucher({ sel: '#cx-btn' });
    const app = await p.attendre(async () => /\/app\.html/.test(p.url), 15000);
    if (!app) { e.note('pas d\'arrivée dans l\'application ; écran : ' + (await p.texte()).slice(0, 250)); return false; }
    /* l'application recharge une fois après avoir lu le lien, puis se connecte seule (`cnxAutoTenter`) */
    const dedans = await p.attendre(() => p.ev(`typeof currentUser!=='undefined' && !!currentUser`), 30000);
    e.note(dedans ? 'connecté dans l\'application' : 'toujours pas connecté après 30 s ; écran : ' + (await p.texte()).slice(0, 200));
    return dedans;
  }, { bloquante: true });

  await passe('Mot de passe provisoire remplacé', async (e) => {
    const fenetre = await p.attendre(() => p.ev(`!!(document.querySelector('#fp-p1')&&document.querySelector('#fp-p1').getClientRects().length)`), 8000);
    if (!fenetre) { e.note('la fenêtre « choisir son mot de passe » ne s\'ouvre pas — un mot de passe provisoire resterait actif'); return false; }
    await juger(e, 'mot-de-passe');
    etat.mdpApp = 'Camille-' + crypto.randomBytes(4).toString('hex');
    await p.taper('#fp-p1', etat.mdpApp); await p.taper('#fp-p2', etat.mdpApp);
    if (await p.ev(`!!document.querySelector('#fp-mail')`)) { const vide = await p.ev(`!document.querySelector('#fp-mail').value`); if (vide) await p.taper('#fp-mail', C.email); }
    const b = await p.toucher({ sel: '[onclick*="forcePwdSave"]' }) || await p.toucher({ texte: 'Enregistrer' });
    if (!b) { e.note('bouton d\'enregistrement introuvable'); return false; }
    const ferme = await p.attendre(async () => !(await p.ev(`!!(document.querySelector('#fp-p1')&&document.querySelector('#fp-p1').getClientRects().length)`)), 8000);
    if (!ferme) e.note('la fenêtre reste ouverte : ' + (await p.texte()).slice(0, 200));
    /* le compte qu'elle a reçu porte-t-il SON nom ? La demande le disait (prénom, nom) */
    const nom = await p.ev(`typeof currentUser!=='undefined'&&currentUser ? ((currentUser.prenom||'')+' '+(currentUser.nom||'')).trim() : ''`).catch(() => '');
    e.note('compte : « ' + nom + ' »');
    if (nom && nom !== C.prenom + ' ' + C.nom) K.constat('à regarder', 'Le compte de la cliente ne porte pas son nom : « ' + nom + ' »',
      'La demande disait « ' + C.prenom + ' ' + C.nom + ' ». Le compte de départ d\'un espace neuf naît « OP Admin » (app.html, ESPACE NEUF) et rien ne le renomme : ' +
      'elle se voit « ' + nom + ' » dans son application, son journal et ses documents.', 'mot de passe');
    return ferme;
  });

  /* ── 8. Le tour de l'application ── */
  await passe('L\'accès payé est bien servi (pas « Accès suspendu »)', async (e) => {
    const r = await J.api('/api/espaces/etat', { json: { t: etat.espace.t } });
    e.note('serveur : ' + r.status + ' · formule ' + (r.corps && r.corps.formule) + ' · payé ' + (r.corps && r.corps.paye) + ' · suspendu ' + (r.corps && r.corps.suspendu));
    const suspendu = await p.ev(`typeof accesSuspendu==='function' ? !!accesSuspendu() : null`).catch(() => null);
    e.note('application : ' + (suspendu === null ? 'état illisible' : suspendu ? 'SUSPENDUE' : 'ouverte'));
    if (r.corps && r.corps.formule && r.corps.formule !== C.formule) K.constat('défaut', 'La formule servie n\'est pas celle payée', 'payée ' + C.formule + ', servie ' + r.corps.formule, 'accès');
    return r.status === 200 && r.corps && r.corps.paye === true && !r.corps.suspendu && suspendu === false;
  });

  await passe('Chaque rubrique du menu s\'ouvre sans erreur', async (e) => {
    /* les rubriques que le MENU de cet utilisateur propose — pas une liste écrite ici (CLAUDE.md : une population qu'on
       énumère soi-même est une réponse qu'on s'écrit soi-même) */
    /* le menu RENDU (`renderNav`) : `.nav-item[data-view]` sont les rubriques ouvertes, `.nav-verrou` les verrouillées */
    const menu = await p.ev(`(()=>{ const v=[...document.querySelectorAll('.nav-item[data-view]')].map(x=>x.dataset.view);
      const verrous=[...document.querySelectorAll('.nav-item.nav-verrou')].map(x=>x.innerText.trim()); return { vues:[...new Set(v)], verrous }; })()`);
    const vues = menu.vues;
    if (!vues || !vues.length) { e.note('aucune rubrique dans le menu rendu (.nav-item[data-view])'); return false; }
    if (menu.verrous.length) e.note('verrouillées pour cette formule : ' + menu.verrous.join(', '));
    let ouvertes = 0; const ko = [];
    for (const v of vues) {
      const n0 = p.erreurs.length; p.etape = 'rubrique ' + v;
      await p.ev(`(()=>{ try{ go(${JSON.stringify(v)}); return 1; }catch(e){ return String(e); } })()`).catch(x => ko.push(v + ' : ' + x.message));
      await dormir(450);
      const a = await p.auditEcran();
      const vide = await p.ev(`(document.getElementById('content')||{}).innerText ? document.getElementById('content').innerText.trim().length : 0`);
      if (!vide) ko.push(v + ' : écran vide');
      if (a.motsSuspects && a.motsSuspects.length) K.constat('défaut', 'Texte suspect dans la rubrique « ' + v + ' » : ' + a.motsSuspects.join(', '), '', 'rubriques');
      /* des mots qui n'ont rien à faire sous les yeux d'un client neuf : le nom d'un autre logiciel, d'un client réel */
      const internes = await p.ev(`(()=>{ const t=(document.getElementById('content')||{}).innerText||''; return [...new Set(t.match(${MOTS_INTERNES.toString()})||[])]; })()`).catch(() => []);
      for (const m of internes) { const k = m + '|' + v; if (!etat.internes.has(k)) { etat.internes.add(k);
        K.constat('à regarder', 'Mot interne montré à un client neuf : « ' + m + ' » (rubrique « ' + v + ' »)', 'voulu ? sinon le retirer de l\'écran, ou la rubrique du menu d\'un client', 'rubriques'); } }
      if (a.defileDeCote > 0) K.constat('défaut', 'La rubrique « ' + v + ' » glisse de côté (' + a.defileDeCote + ' px)', '', 'rubriques');
      if (p.erreurs.length === n0 && vide) ouvertes++;
    }
    e.note(ouvertes + '/' + vues.length + ' rubriques ouvertes sans erreur (ouvertes par go(), le chemin du menu)');
    if (ko.length) e.note('en échec : ' + ko.slice(0, 8).join(' · '));
    e.capture(await p.capture('derniere-rubrique'));
    return ouvertes === vues.length;
  });

  await passe('Après rechargement, la session est toujours là', async (e) => {
    await p.aller('https://teamop.fr/app.html');
    const ok = await p.attendre(() => p.ev(`typeof currentUser!=='undefined' && !!currentUser`), 20000);
    await dormir(1500);
    e.capture(await p.capture('apres-rechargement'));
    if (!ok) { e.note('écran : ' + (await p.texte()).slice(0, 200)); return false; }
    /* connecté ne suffit pas : le client doit VOIR son application, pas une fenêtre posée dessus */
    const c = await p.couverture();
    if (c) { e.note('une fenêtre couvre l\'application : « ' + c.texte + ' »');
      K.constat('à regarder', 'Après rechargement, une fenêtre couvre l\'application', '« ' + c.texte + ' » (' + (c.id ? '#' + c.id : c.classe) + ') — voulu une fois (premier choix), ou à chaque ouverture ?', 'rechargement'); }
    return ok;
  });

  return { p, tour, C, etat, passe, juger };
}

module.exports = { jouer };
