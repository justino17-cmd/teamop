/* ══ LA PAGE DE L'INVITÉ SANS COMPTE — « ILS CLIQUENT SUR LE LIEN, ILS PEUVENT REJOINDRE LA RÉUNION » ═══════════════════════════════════════════════
 *
 * Justin, 26 octobre 2026 : le client ouvre un lien dans son navigateur, sans compte et sans rien installer, tape son nom, passe l'écran de préparation, ATTEND à la porte, et l'organisateur le fait entrer.
 * Cette page n'est PAS l'application : elle n'en charge ni les conversations, ni les contacts, ni l'agenda, ni la recherche, ni le profil — elle ne sait faire qu'une chose, entrer dans UNE salle. Elle réemploie ce qui
 * existe : `api.js` (le client du service et ses refus qui se disent) et le MOTEUR DE SALLE de `source-serveur.js` (les liaisons entre pages, le relais, la visio) — pas de seconde mécanique.
 *
 * ⛔ TOUT CE QUI EST TAPÉ PAR UN INCONNU S'ÉCRIT EN `textContent`, JAMAIS EN BALISAGE : le nom d'un invité atterrit sur l'écran de l'organisateur (une autre page), mais aussi sur celui des autres invités. Ici, il n'existe
 * aucun `innerHTML`, aucun `insertAdjacentHTML`, aucun `document.write` (`tests/test-3053.js` le compte : zéro).
 * ⛔ LA PAGE N'APPELLE QUE `/api/invite/…` (le même banc le lit : aucune autre route n'y est citée). Sa session est un cookie `HttpOnly` que le script ne voit jamais ; le jeton du lien vit dans le FRAGMENT de l'adresse
 * (jamais envoyé à un serveur, jamais dans un journal) et dans la mémoire de l'onglet — il est effacé de la barre d'adresse dès que la session existe.
 * ⛔ Rien n'est rangé sur l'appareil : ni `localStorage`, ni `sessionStorage`, ni IndexedDB, ni cookie posé par le script. Fermer l'onglet, c'est partir.
 */
(function () {
  'use strict';
  const OPMSG = window.OPMSG, MOT = window.OPMSG_MOTEUR_SALLE;
  const $ = (id) => document.getElementById(id);
  const ECRANS = ['charge', 'mort', 'identite', 'prepa', 'attente', 'refus', 'fin', 'salle'];
  const RE_JETON = /(?:^|[#&])i=([A-Za-z0-9_-]{32})(?:&|$)/;
  const RELANCE_MS = 30000, RELANCE_MAX = 40;           // l'organisateur n'est pas encore là : on redemande toutes les 30 s, vingt minutes au plus (le seau des essais du service est de 600 par heure et par réseau : trois collègues derrière une même adresse passent)

  const ST = {
    jeton: null, titre: '', organisateur: '', nom: '', ent: '', moiId: null, appelId: null, micro: true, cam: true,
    apercu: null,                        // l'aperçu de l'écran de préparation : { flux, ctx, raf }
    local: { audio: null, video: null }, // les pistes envoyées à la salle
    moteur: null, ecoute: null, relance: null, essais: 0, ecran: 'charge', admis: false, fini: false, tic: null, entre: false,
  };

  /* ═══ Les phrases ═══ */
  const MORT = {
    reunion_terminee: ['Cette réunion est terminée', 'Ce lien ne fonctionne plus. Demandez un nouveau lien à la personne qui vous a invité.'],
    lien_remplace: ['Ce lien a été remplacé', 'La personne qui vous a invité a créé un autre lien. Demandez-le-lui.'],
    lien_invalide: ['Ce lien n\'est pas valable', 'Il est incomplet, ou il n\'existe pas. Demandez un nouveau lien à la personne qui vous a invité.'],
  };
  const FIN = {
    termine: 'L\'organisateur a mis fin à la réunion.',
    fini: 'La réunion est terminée.',
    annulee: 'La réunion a été annulée.',
    supprimee: 'La réunion a été annulée.',
    perdu: 'La connexion a été perdue.',
    exclu: 'L\'organisateur vous a retiré de la réunion.',
    session: 'La réunion est terminée.',
  };
  const REFUS = {
    refuse_hote: 'L\'organisateur n\'a pas pu vous laisser entrer.',
    exclu: 'L\'organisateur vous a retiré de la réunion.',
    refuse: 'L\'organisateur n\'a pas pu vous laisser entrer.',
  };
  /* ce qu'un refus de l'entrée dit — le service parle en codes, la page en phrases */
  function phraseEntree(e) {
    switch (e && e.code) {
      case 'pas_ouverte': return 'L\'organisateur n\'est pas encore arrivé.';
      case 'verrouillee': return 'L\'organisateur a verrouillé la réunion : personne ne peut plus y entrer.';
      case 'invites_attente_max': return 'Trop de personnes attendent déjà à la porte. Réessayez dans un instant.';
      case 'invites_lignes_max': return 'Cette réunion ne peut plus recevoir d\'invités sans compte. Demandez à l\'organisateur de vous inviter autrement.';
      case 'refuse': return REFUS.refuse;
      case 'nom_requis': return 'Tapez votre nom pour que l\'organisateur sache qui vous êtes.';
      case 'quota_atteint': return 'Trop d\'essais en peu de temps. Réessayez dans quelques minutes.';
      case 'reseau': return 'Le réseau ne répond pas. Vérifiez votre connexion et réessayez.';
      default: return e && e.dit && e.message ? e.message : 'L\'entrée n\'a pas pu être demandée. Réessayez.';
    }
  }

  /* ═══ L'écran ═══ */
  function montrer(nom) {
    ST.ecran = nom;
    for (const e of ECRANS) $('p-' + e).hidden = e !== nom;
    const p = $('p-charge'); p.setAttribute('aria-busy', nom === 'charge' ? 'true' : 'false');
    const h = { mort: 'mort-titre', identite: 'identite-titre', prepa: 'prepa-titre', attente: 'attente-titre', refus: 'refus-titre', fin: 'fin-titre' }[nom];
    if (h) { const el = $(h); if (el) { try { el.focus({ preventScroll: true }); } catch (e) { /* rien */ } } }
    if (nom === 'salle') document.title = (ST.titre || 'Réunion') + ' · OP MESSAGES';
  }
  const dire = (el, texte) => { el.textContent = texte || ''; el.hidden = !texte; };
  const initiale = (n) => { const m = /\p{L}/u.exec(String(n || '')); return m ? m[0].toUpperCase() : '?'; };
  function mort(code) {
    const [t, x] = MORT[code] || MORT.lien_invalide;
    arreterTout();
    $('mort-titre').textContent = t; $('mort-texte').textContent = x;
    document.title = t + ' · OP MESSAGES';
    montrer('mort');
  }

  /* ═══ Le service (jamais une autre route que `/api/invite/…`) ═══ */
  const api = OPMSG.creer({ cheminFlux: '/api/invite/flux', verifierSession: () => api.appel('GET', '/api/invite/etat') });
  const P = (route, corps) => api.appel('POST', route, corps);       // (la route s'écrit en entier à chaque appel : le générateur les relit une à une)
  const G = (route) => api.appel('GET', route);

  /* ═══ La préparation : se voir, s'entendre — rien ne part ═══ */
  const contraintes = {
    audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
  };
  const mediasDispo = () => !!(navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function');
  function arreterApercu() {
    const a = ST.apercu; ST.apercu = null;
    if (!a) return;
    cancelAnimationFrame(a.raf);
    if (a.ctx) { try { const p = a.ctx.close(); if (p && p.catch) p.catch(() => {}); } catch (e) { /* déjà fermé */ } }
    if (a.flux) a.flux.getTracks().forEach(t => { try { t.stop(); } catch (e) { /* déjà arrêtée */ } });
    const v = $('prepa-video'); if (v) { try { v.pause(); } catch (e) { /* rien */ } v.srcObject = null; }
  }
  function majPrepa() {
    const ap = $('apercu'), flux = ST.apercu && ST.apercu.flux, vt = flux && flux.getVideoTracks()[0];
    ap.dataset.camera = vt && ST.cam ? 'on' : 'off';
    const m = $('prepa-micro'), c = $('prepa-cam');
    m.setAttribute('aria-pressed', ST.micro ? 'false' : 'true'); m.setAttribute('aria-label', ST.micro ? 'Couper le micro' : 'Activer le micro');
    m.querySelector('use').setAttribute('href', ST.micro ? '#i-mic' : '#i-mic-off');
    c.setAttribute('aria-pressed', ST.cam ? 'false' : 'true'); c.setAttribute('aria-label', ST.cam ? 'Couper la caméra' : 'Activer la caméra');
    c.querySelector('use').setAttribute('href', ST.cam ? '#i-video' : '#i-video-off');
  }
  async function ouvrirApercu() {
    arreterApercu();
    const a = ST.apercu = { flux: null, ctx: null, raf: 0 };
    $('prepa-init').textContent = initiale(ST.nom);
    dire($('prepa-erreur'), '');
    majPrepa();
    if (!mediasDispo()) { dire($('prepa-erreur'), 'Ce navigateur ne donne pas accès au micro ni à la caméra : vous pourrez entrer quand même, et écouter.'); return; }
    let flux = null, errCam = null, err = null;
    try { flux = await navigator.mediaDevices.getUserMedia({ audio: contraintes.audio, video: contraintes.video }); }
    catch (e) { errCam = e; try { flux = await navigator.mediaDevices.getUserMedia({ audio: contraintes.audio }); } catch (e2) { err = e2; } }
    if (ST.apercu !== a) { if (flux) flux.getTracks().forEach(t => t.stop()); return; }
    a.flux = flux;
    if (!flux) dire($('prepa-erreur'), 'Le micro et la caméra sont refusés (' + (err && err.name === 'NotAllowedError' ? 'autorisation refusée' : 'introuvables') + '). Vous pourrez entrer quand même, et écouter.');
    else if (errCam && !flux.getVideoTracks().length) dire($('prepa-erreur'), 'La caméra n\'est pas disponible : vous entrerez avec le micro seul.');
    const vt = flux && flux.getVideoTracks()[0], v = $('prepa-video');
    v.srcObject = vt ? new MediaStream([vt]) : null;
    if (vt) { const p = v.play(); if (p && p.catch) p.catch(() => {}); }
    const at = flux && flux.getAudioTracks()[0];
    if (at) jauge(a, at);
    majPrepa();
  }
  function jauge(a, piste) {
    const Ctx = window.AudioContext || window.webkitAudioContext; if (typeof Ctx !== 'function') return;
    try {
      const ctx = a.ctx = new Ctx(), an = ctx.createAnalyser(); an.fftSize = 512;
      ctx.createMediaStreamSource(new MediaStream([piste])).connect(an);
      const reprise = () => { if (ctx.state === 'suspended') ctx.resume().catch(() => {}); };
      reprise(); document.addEventListener('pointerdown', reprise, { once: true });
      const buf = new Float32Array(an.fftSize);
      let lisse = 0, dit = 0;
      const tour = () => {
        if (ST.apercu !== a) return;
        an.getFloatTimeDomainData(buf);
        let e = 0; for (let i = 0; i < buf.length; i++) e += buf[i] * buf[i];
        lisse = Math.max(Math.min(1, Math.sqrt(e / buf.length) * 6), lisse * 0.85);
        $('niveau-i').style.transform = 'scaleX(' + (ST.micro ? lisse : 0).toFixed(3) + ')';
        const t = performance.now(); if (t - dit > 400) { dit = t; $('niveau').setAttribute('aria-valuenow', String(Math.round(lisse * 100))); }
        a.raf = requestAnimationFrame(tour);
      };
      a.raf = requestAnimationFrame(tour);
    } catch (e) { /* pas de jauge : l'entrée reste possible */ }
  }

  /* ═══ Le moteur de salle (celui de l'application), branché sur les routes de l'invité ═══ */
  const registre = new Map();
  const nomDe = (r) => ((r.prenom || '') + ' ' + (r.nom || '')).trim() || 'Participant';
  function noter(p) { if (p && typeof p.id === 'string') registre.set(p.id, { id: p.id, prenom: p.prenom, nom: p.nom, invite: p.invite_sans_compte === true, entreprise: typeof p.entreprise === 'string' ? p.entreprise : '' }); }
  function personne(id) {
    const r = registre.get(id); if (!r) return null;
    const n = nomDe(r);
    return { id, nom: n + (r.invite && r.entreprise ? ' — ' + r.entreprise : ''), prenom: n.split(' ')[0] || n, initiales: initiale(n), avatar: 0, photo: null, invite: r.invite, entreprise: r.entreprise };
  }
  /* Le contrat de `d.api` du moteur, en routes d'invité. Rien d'autre n'y est : le moteur n'appelle pas « admettre » ni « terminer » pour une personne qui n'en a pas le geste (la page ne les propose pas). */
  const apiMoteur = {
    ice: () => G('/api/invite/ice'),
    signalAppel: (id, a, type, donnees) => P('/api/invite/signal', donnees === undefined ? { a, type } : { a, type, donnees }),
    salle: () => G('/api/invite/etat'),
    salleMain: (id, actif) => P('/api/invite/main', { actif: !!actif }),
    salleReaction: (id, emoji) => P('/api/invite/reaction', { emoji }),
    salleEtat: (id, ch) => P('/api/invite/media', { camera: !!(ch && ch.camera), micro: !(ch && ch.micro === false) }),   // jamais `partage` : un invité sans compte ne partage pas son écran
    salleVisio: () => P('/api/invite/visio', {}),
    quitterAppel: (id, opts) => api.appel('POST', '/api/invite/quitter', { definitif: !(opts && opts.keepalive) }, opts),     // la page qui se ferme (`keepalive`) garde sa place ; le bouton « Quitter » la rend
    rejoindreAppel: () => P('/api/invite/redemander', {}),
    rejoindreReunionParCode: () => entrerRoute(),
    appels: async () => { const r = await G('/api/invite/etat'); return { actif: r.appel && r.appel.etat !== 'fini' ? r.appel : null, appels: [], salles: [] }; },
    repondreAppel: () => Promise.reject(new OPMSG.ErreurApi('interdit', 403, 0)),
    lancerAppel: () => Promise.reject(new OPMSG.ErreurApi('interdit', 403, 0)),
  };
  let reponseEntree = null;
  async function entrerRoute() {
    const r = await P('/api/invite/entrer', { jeton: ST.jeton, nom: ST.nom, entreprise: ST.ent });
    ST.moiId = r.invite.id; ST.nom = r.invite.nom || ST.nom; ST.ent = r.invite.entreprise || '';
    reponseEntree = r;
    return { appel: r.appel, salle: r.salle, attente: true };
  }
  function creerMoteur() {
    const d = {
      api: apiMoteur, webrtc: { RTCPeerConnection: window.RTCPeerConnection || window.webkitRTCPeerConnection || null, MediaStream: window.MediaStream || null },
      maintenant: () => Date.now(), planifier: (f, ms) => setTimeout(f, ms), annuler: (h) => clearTimeout(h), emettre: surEvenement,
      personne, noter, acquitter: () => {}, nomSupprime: 'Compte supprimé', erreurLocale: MOT.erreurLocale,
      refus: (code, statut, extra) => new OPMSG.ErreurApi(code, statut || 0, 0, extra), fermerNotif: () => Promise.resolve(),
      moi: () => ST.moiId, niveaux: true, visio: MOT.visioReel(window),
    };
    return MOT.creerMoteurSalle(d);
  }
  function ouvrirFlux() {
    if (ST.ecoute) return;
    const m = ST.moteur;
    ST.ecoute = api.ecouter({
      appel: (v, gid) => { m.surAppel(v, gid); },
      signal: (s) => { m.surSignal(s); },
      salle_evt: (e) => { m.surSalleEvt(e); },
      resync: () => { m.surResync(); },
      reseau: (etat) => { m.surReseau(etat); majEtatReseau(etat); },
      erreur: (e) => { if (e && e.code === 'session_requise') sessionCoupee(); },
    });
  }
  /* la session a été COUPÉE par le service : la salle a fini (l'organisateur l'a terminée, ou plus personne ne la tient), ou le lien a été régénéré pendant qu'on attendait */
  async function sessionCoupee() {
    if (ST.fini) return;
    const s = ST.moteur && ST.appelId ? ST.moteur.instantane(ST.appelId) : null;
    if (ST.ecran !== 'attente' && s && s.issue && FIN[s.issue]) { finir(s.issue); return; }
    /* le service a coupé la session : pourquoi ? le lien lui-même le dit (la réunion est finie, ou l'organisateur en a fait un autre pendant qu'on attendait) */
    if (ST.jeton) {
      try { await P('/api/invite/apercu', { jeton: ST.jeton }); }
      catch (e) { if (e && (e.code === 'lien_remplace' || e.code === 'reunion_terminee')) { if (!ST.fini) { ST.fini = true; mort(e.code); } return; } }
    }
    finir('session');
  }
  function finir(motif) {
    if (ST.fini) return;
    ST.fini = true;
    arreterTout();
    $('fin-titre').textContent = motif === 'quitte' ? 'Vous avez quitté la réunion' : 'La réunion est terminée';
    $('fin-texte').textContent = motif === 'quitte' ? 'Vous pouvez fermer cette page. Pour revenir, rouvrez le lien tant que la réunion dure.' : (FIN[motif] || FIN.fini) + ' Ce lien ne fonctionne plus.';
    document.title = $('fin-titre').textContent + ' · OP MESSAGES';
    montrer('fin');
  }
  function arreterTout() {
    arreterApercu();
    if (ST.relance) { clearTimeout(ST.relance); ST.relance = null; }
    if (ST.tic) { clearInterval(ST.tic); ST.tic = null; }
    libererPistes();
    if (ST.moteur) { try { ST.moteur.arreter(); } catch (e) { /* déjà arrêté */ } }
    if (ST.ecoute) { try { ST.ecoute.fermer(); } catch (e) { /* déjà fermé */ } ST.ecoute = null; }
    document.getElementById('grille').replaceChildren();
  }

  /* ═══ Ce que le moteur annonce ═══ */
  let rendu = 0;
  function surEvenement(ev) {
    if (!ev || ev.type !== 'appel' || !ST.moteur) return;
    if (!rendu) rendu = requestAnimationFrame(() => { rendu = 0; majSalle(); });
  }
  function majEtatReseau(etat) {
    const b = $('salle-bandeau');
    if (ST.ecran !== 'salle') return;
    dire(b, etat === 'perdu' ? 'Reconnexion…' : '');
  }
  function majSalle() {
    const m = ST.moteur; if (!m || ST.fini) return;
    const s = ST.appelId ? m.instantane(ST.appelId) : null;
    if (!s) return;
    ST.titre = s.nom || ST.titre;
    if (s.etat === 'termine' || s.issue) {
      const i = s.issue;
      if (i === 'refuse_hote' || (i === 'exclu' && !ST.admis)) { arreterTout(); $('refus-texte').textContent = REFUS[i] || REFUS.refuse; ST.fini = true; montrer('refus'); return; }
      finir(i || 'fini'); return;
    }
    const st = s.moi && s.moi.statut;
    if (st === 'attente' || s.attente) {
      if (ST.ecran !== 'attente') { montrer('attente'); }
      $('attente-texte').textContent = (ST.organisateur ? ST.organisateur + ' va ' : 'L\'organisateur va ') + 'vous laisser entrer dans « ' + (ST.titre || 'la réunion') + ' ».';
      return;
    }
    if (st === 'refuse') { arreterTout(); ST.fini = true; $('refus-texte').textContent = REFUS.refuse; montrer('refus'); return; }
    if (st === 'exclu') { arreterTout(); ST.fini = true; $('refus-texte').textContent = ST.admis ? FIN.exclu : REFUS.exclu; montrer(ST.admis ? 'fin' : 'refus'); if (ST.admis) { $('fin-titre').textContent = 'Vous avez été retiré'; $('fin-texte').textContent = FIN.exclu; } return; }
    if (st === 'present') {
      if (!ST.admis) { ST.admis = true; admis(s); }
      if (ST.ecran !== 'salle') { montrer('salle'); }
      rendreSalle(s);
      return;
    }
    if (st === 'parti') { /* sorti de la salle (perte de connexion) : la salle le dira ; on attend la suite */ }
  }

  /* — admis : le micro et la caméra s'ouvrent MAINTENANT (le navigateur se souvient de l'autorisation donnée à la préparation) — */
  async function admis(s) {
    ST.entre = true;
    ST.tic = setInterval(() => { if (ST.ecran === 'salle') majDuree(); }, 1000);
    document.getElementById('salle-titre').textContent = ST.titre || 'Réunion';
    $('b-cam').hidden = s.type === 'audio';
    await ouvrirPistes(s.type !== 'audio' && ST.cam, ST.micro);
    envoyerPistes();
  }
  async function ouvrirPistes(veutCam, veutMic) {
    if (!mediasDispo()) { montrerBandeau('Ce navigateur ne donne pas accès au micro : vous écoutez seulement.'); return; }
    let flux = null;
    try { flux = await navigator.mediaDevices.getUserMedia({ audio: contraintes.audio, video: veutCam ? contraintes.video : false }); }
    catch (e) { if (veutCam) { try { flux = await navigator.mediaDevices.getUserMedia({ audio: contraintes.audio }); ST.cam = false; } catch (e2) { flux = null; } } }
    if (!flux) { montrerBandeau('Le micro est refusé : vous écoutez seulement.'); return; }
    const a = flux.getAudioTracks()[0] || null, v = flux.getVideoTracks()[0] || null;
    if (a && !ST.local.audio) { ST.local.audio = a; } else if (a) { a.stop(); }
    if (v) { if (ST.local.video) ST.local.video.stop(); ST.local.video = v; }
    if (ST.local.audio) ST.local.audio.enabled = ST.micro;
    majBarre();
  }
  function libererPistes() {
    for (const k of ['audio', 'video']) { const t = ST.local[k]; if (t) { try { t.stop(); } catch (e) { /* déjà arrêtée */ } ST.local[k] = null; } }
  }
  function envoyerPistes() {
    if (!ST.moteur || !ST.appelId) return;
    ST.moteur.pistes(ST.appelId, { audio: ST.local.audio, video: ST.cam ? ST.local.video : null, ecran: false, micro: ST.micro });
    majBarre();
  }
  let bandeauT = null;
  function montrerBandeau(texte) {
    const b = $('salle-bandeau'); dire(b, texte);
    if (bandeauT) clearTimeout(bandeauT);
    if (texte) bandeauT = setTimeout(() => dire(b, ''), 7000);
  }

  /* ═══ La salle ═══ */
  function majDuree() {
    const s = ST.moteur && ST.appelId ? ST.moteur.instantane(ST.appelId) : null;
    const el = $('salle-etat'); if (!s) return;
    const sec = Math.max(0, s.duree | 0), mm = Math.floor(sec / 60), ss = String(sec % 60).padStart(2, '0');
    el.textContent = (s.liaison === 'connecte' ? '' : s.liaison === 'reconnexion' ? 'Reconnexion · ' : 'Connexion · ') + mm + ':' + ss;
  }
  function tuile(id, nom, moi) {
    const t = document.createElement('div');
    t.className = 'tuile'; t.dataset.uid = id; t.dataset.moi = moi ? 'true' : 'false'; t.dataset.camera = 'off';
    const init = document.createElement('span'); init.className = 'init'; init.setAttribute('aria-hidden', 'true');
    const video = document.createElement('video'); video.playsInline = true; video.autoplay = true; if (moi) video.muted = true; video.setAttribute('aria-label', moi ? 'Votre caméra' : 'Caméra de ' + nom);
    const lib = document.createElement('div'); lib.className = 'nom';
    const b = document.createElement('b'); lib.appendChild(b);
    t.append(init, video, lib);
    return t;
  }
  function rendreSalle(s) {
    const grille = $('grille'), vus = new Set();
    const liste = [{ id: ST.moiId, nom: 'Vous', moi: true, camera: ST.cam && !!ST.local.video && s.type !== 'audio', micro: ST.micro, main: s.moi && s.moi.main, parle: false }]
      .concat((s.membres || []).filter(m => m.statut === 'present').map(m => ({ id: m.id, nom: m.nom || 'Participant', moi: false,
        /* ⛔ un écran partagé PASSE PAR LA PISTE DE LA CAMÉRA (même émetteur en maille ; en LiveKit `flux()` rend l'écran avant la caméra) : caméra coupée ou non, l'image arrive — la page connectée le sait depuis le
           7 octobre 2026. Sans `|| m.partage`, la tuile restait sur l'avatar (`data-camera="off"` → vidéo à `opacity:0`) pendant que l'écran de l'organisateur ARRIVAIT, décodé, derrière (28 octobre 2026, capture de Justin) */
        camera: (!!m.camera || !!m.partage) && s.type !== 'audio', ecran: !!m.partage, micro: m.micro !== false, main: !!m.main, parle: !!m.parle, initiales: m.initiales })));
    for (const x of liste) {
      vus.add(x.id);
      let t = grille.querySelector('[data-uid="' + CSS.escape(x.id) + '"]');
      if (!t) { t = tuile(x.id, x.nom, x.moi); grille.appendChild(t); }
      t.dataset.camera = x.camera ? 'on' : 'off'; t.dataset.ecran = x.ecran ? '1' : '0'; t.dataset.parle = x.parle ? 'true' : 'false';
      t.querySelector('.init').textContent = x.moi ? initiale(ST.nom) : (x.initiales || initiale(x.nom));
      t.querySelector('.nom b').textContent = x.nom;
      let p = t.querySelector('.puce');
      const etiquettes = [x.micro ? '' : 'micro coupé', x.main ? '✋' : ''].filter(Boolean).join(' ');
      if (etiquettes) { if (!p) { p = document.createElement('span'); p.className = 'puce'; t.querySelector('.nom').appendChild(p); } p.textContent = etiquettes; } else if (p) p.remove();
      const v = t.querySelector('video');
      const flux = x.moi ? (ST.local.video && x.camera ? new MediaStream([ST.local.video]) : null) : ST.moteur.flux(ST.appelId, x.id);
      if (x.moi) { if (!flux) { if (v.srcObject) v.srcObject = null; } else if (!v.srcObject || v.dataset.piste !== ST.local.video.id) { v.srcObject = flux; v.dataset.piste = ST.local.video.id; } }
      else if (v.srcObject !== flux) { v.srcObject = flux; }
      if (v.srcObject && v.paused) { const pr = v.play(); if (pr && pr.catch) pr.catch(() => {}); }
    }
    for (const t of Array.from(grille.children)) if (!vus.has(t.dataset.uid)) t.remove();
    /* la scène : tant que quelqu'un partage son écran, il a la grande place et les autres passent en vignettes dessous (la page connectée fait pareil en « vue intervenant ») */
    grille.dataset.ecran = grille.querySelector('.tuile[data-ecran="1"]') ? '1' : '0';
    majBarre();
    majDuree();
  }
  function majBarre() {
    const m = $('b-micro'), c = $('b-cam'), h = $('b-main');
    m.setAttribute('aria-pressed', ST.micro ? 'false' : 'true'); m.setAttribute('aria-label', ST.micro ? 'Couper le micro' : 'Activer le micro');
    m.querySelector('use').setAttribute('href', ST.micro ? '#i-mic' : '#i-mic-off');
    const camOn = ST.cam && !!ST.local.video;
    c.setAttribute('aria-pressed', camOn ? 'false' : 'true'); c.setAttribute('aria-label', camOn ? 'Couper la caméra' : 'Activer la caméra');
    c.querySelector('use').setAttribute('href', camOn ? '#i-video' : '#i-video-off');
    const s = ST.moteur && ST.appelId ? ST.moteur.instantane(ST.appelId) : null, main = !!(s && s.moi && s.moi.main);
    h.dataset.actif = main ? 'true' : 'false'; h.setAttribute('aria-pressed', main ? 'true' : 'false'); h.setAttribute('aria-label', main ? 'Baisser la main' : 'Lever la main');
  }

  /* ═══ L'entrée : se présenter, puis attendre à la porte ═══ */
  async function demanderEntree() {
    const bouton = $('b-entrer');
    if (ST.relance) { clearTimeout(ST.relance); ST.relance = null; }
    bouton.disabled = true; dire($('prepa-erreur'), ''); dire($('prepa-note'), '');
    arreterApercu();                                           // ⛔ ni micro ni caméra ne restent ouverts à la porte
    if (!ST.moteur) ST.moteur = creerMoteur();
    try {
      await ST.moteur.rejoindreParCode(ST.jeton, 'video');
      const i = reponseEntree && reponseEntree.appel; ST.appelId = i ? i.id : null;
      reponseEntree = null;
      ST.essais = 0;
      history.replaceState(null, '', location.pathname);       // la session existe : le jeton quitte la barre d'adresse
      ouvrirFlux();
      majSalle();
      if (ST.ecran !== 'salle') montrer('attente');
    } catch (e) {
      bouton.disabled = false;
      const c = e && e.code;
      if (c === 'lien_invalide' || c === 'reunion_terminee' || c === 'lien_remplace') { mort(c); return; }
      if (c === 'refuse') { arreterTout(); $('refus-texte').textContent = REFUS.refuse; ST.fini = true; montrer('refus'); return; }       // ⛔ l'organisateur a refusé ce réseau : pas de nouvel essai
      if (c === 'pas_ouverte' && ST.essais < RELANCE_MAX) {
        ST.essais++;
        if (ST.ecran !== 'prepa') montrer('prepa');
        if (!ST.apercu) await ouvrirApercu();
        dire($('prepa-note'), 'L\'organisateur n\'est pas encore arrivé. Nous réessayons toutes les 30 secondes : gardez cette page ouverte.');
        bouton.textContent = 'Réessayer maintenant';           // un geste de la personne vaut mieux qu'une minuterie : elle peut redemander tout de suite
        ST.relance = setTimeout(() => { ST.relance = null; demanderEntree(); }, RELANCE_MS);
        return;
      }
      if (ST.ecran !== 'prepa') montrer('prepa');
      if (!ST.apercu) await ouvrirApercu();
      dire($('prepa-erreur'), c === 'pas_ouverte' ? 'L\'organisateur n\'est toujours pas arrivé. Réessayez dans un moment.' : phraseEntree(e));
    }
  }

  /* ═══ Les gestes de la page ═══ */
  $('f-identite').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const nom = $('c-nom').value.replace(/\s+/g, ' ').trim();
    if (!nom) { dire($('identite-erreur'), 'Tapez votre nom pour que l\'organisateur sache qui vous êtes.'); $('c-nom').focus(); return; }
    dire($('identite-erreur'), '');
    ST.nom = nom; ST.ent = $('c-ent').value.replace(/\s+/g, ' ').trim();
    $('prepa-sous').textContent = ST.titre ? '« ' + ST.titre + ' »' : '';
    montrer('prepa');
    await ouvrirApercu();
  });
  $('prepa-micro').addEventListener('click', () => {
    ST.micro = !ST.micro;
    const t = ST.apercu && ST.apercu.flux && ST.apercu.flux.getAudioTracks()[0]; if (t) t.enabled = ST.micro;
    majPrepa();
  });
  $('prepa-cam').addEventListener('click', () => { ST.cam = !ST.cam; majPrepa(); });
  $('b-entrer').addEventListener('click', () => { ST.essais = 0; $('b-entrer').textContent = 'Demander à entrer'; demanderEntree(); });
  $('b-prepa-retour').addEventListener('click', () => {
    if (ST.relance) { clearTimeout(ST.relance); ST.relance = null; }
    arreterApercu(); $('b-entrer').disabled = false; dire($('prepa-note'), ''); montrer('identite'); $('c-nom').focus();
  });
  $('b-annuler').addEventListener('click', async () => { try { await ST.moteur.terminer(ST.appelId); } catch (e) { /* déjà sorti */ } finir('quitte'); });
  $('b-refus-retour').addEventListener('click', () => { location.reload(); });
  $('b-micro').addEventListener('click', () => {
    ST.micro = !ST.micro;
    if (ST.local.audio) ST.local.audio.enabled = ST.micro;
    envoyerPistes();
  });
  $('b-cam').addEventListener('click', async () => {
    const s = ST.moteur && ST.appelId ? ST.moteur.instantane(ST.appelId) : null;
    if (s && s.type === 'audio') return;
    if (ST.cam && ST.local.video) { ST.cam = false; try { ST.local.video.stop(); } catch (e) { /* rien */ } ST.local.video = null; envoyerPistes(); rendreSalle(s); return; }
    ST.cam = true;
    await ouvrirPistes(true, ST.micro);
    if (!ST.local.video) { ST.cam = false; montrerBandeau('La caméra n\'est pas disponible.'); }
    envoyerPistes();
    if (s) rendreSalle(ST.moteur.instantane(ST.appelId) || s);
  });
  $('b-main').addEventListener('click', async () => {
    const s = ST.moteur.instantane(ST.appelId), actif = !(s && s.moi && s.moi.main);
    try { await ST.moteur.action(ST.appelId, 'main', { actif }); } catch (e) { montrerBandeau('La main n\'a pas pu être levée.'); }
    majBarre();
  });
  $('b-quitter').addEventListener('click', async () => { try { await ST.moteur.terminer(ST.appelId); } catch (e) { /* déjà sorti */ } finir('quitte'); });
  window.addEventListener('pagehide', () => { if (ST.moteur && ST.appelId && !ST.fini) { try { ST.moteur.fermeture(); } catch (e) { /* la page se ferme */ } } });

  /* ═══ Le démarrage ═══ */
  async function demarrer() {
    const m = RE_JETON.exec(location.hash || '');
    ST.jeton = m ? m[1] : null;
    if (!OPMSG || !MOT) { mort('lien_invalide'); return; }
    /* 1. une session existe déjà (la page a été rechargée) : on reprend là où l'on en était */
    let etat = null;
    try { etat = await G('/api/invite/etat'); } catch (e) { etat = null; }
    /* ⛔ UN VIEUX COOKIE NE L'EMPORTE PAS SUR LE LIEN QU'ON VIENT DE CLIQUER : si le navigateur porte une session d'une AUTRE réunion (un client qui a deux rendez-vous), on la quitte pour de bon et on entre par le lien
       neuf — sinon il atterrirait dans la salle d'hier. Le service dit si la session est celle de CE lien (`ici`) ; un lien mort s'affiche mort, quelle que soit la session. */
    if (etat && etat.invite && etat.appel && ST.jeton) {
      let ap0 = null;
      try { ap0 = await P('/api/invite/apercu', { jeton: ST.jeton }); }
      catch (e) { const c0 = e && e.code; if (c0 === 'reunion_terminee' || c0 === 'lien_remplace' || c0 === 'lien_invalide') { mort(c0); return; } }
      if (ap0 && ap0.ici === false) { try { await P('/api/invite/quitter', { definitif: true }); } catch (e) { /* la session d'avant sera remplacée à l'entrée */ } etat = null; }
      else if (ap0) history.replaceState(null, '', location.pathname);
    }
    if (etat && etat.invite && etat.appel) {
      ST.moiId = etat.invite.id; ST.nom = etat.invite.nom; ST.ent = etat.invite.entreprise || '';
      ST.appelId = etat.appel.id; ST.titre = etat.appel.titre || '';
      for (const p of etat.appel.participants || []) noter(p);
      const st = etat.appel.moi && etat.appel.moi.statut;
      if (st === 'refuse' || st === 'exclu') { $('refus-texte').textContent = REFUS[st] || REFUS.refuse; ST.fini = true; montrer('refus'); return; }
      ST.moteur = creerMoteur();
      if (st === 'attente' || st === 'present' || st === 'parti') {
        /* le service tranche : qui est déjà entré revient dans la salle, qui attendait attend encore */
        try { await ST.moteur.rejoindre(ST.appelId); } catch (e) { if (e && (e.code === 'pas_ouverte' || e.code === 'verrouillee')) { ST.moteur = null; $('prepa-sous').textContent = ST.titre ? '« ' + ST.titre + ' »' : ''; $('c-nom').value = ST.nom; $('c-ent').value = ST.ent; montrer('prepa'); await ouvrirApercu(); dire($('prepa-erreur'), phraseEntree(e)); return; } }
        ouvrirFlux(); majSalle();
        if (ST.ecran === 'charge') montrer(st === 'present' ? 'salle' : 'attente');
        return;
      }
      $('prepa-sous').textContent = ST.titre ? '« ' + ST.titre + ' »' : '';
      $('c-nom').value = ST.nom; $('c-ent').value = ST.ent;
      montrer('prepa'); await ouvrirApercu(); return;
    }
    /* 2. pas de session : le jeton du lien */
    if (!ST.jeton) { mort('lien_invalide'); return; }
    let ap = null;
    try { ap = await P('/api/invite/apercu', { jeton: ST.jeton }); }
    catch (e) {
      const c = e && e.code;
      if (c === 'reunion_terminee' || c === 'lien_remplace' || c === 'lien_invalide') { mort(c); return; }
      $('mort-titre').textContent = 'Le service ne répond pas'; $('mort-texte').textContent = phraseEntree(e); montrer('mort'); return;
    }
    ST.titre = (ap.reunion && ap.reunion.titre) || ''; ST.organisateur = (ap.reunion && ap.reunion.organisateur) || '';
    $('identite-titre').textContent = ST.titre || 'Réunion';
    $('identite-org').textContent = ST.organisateur ? 'Organisée par ' + ST.organisateur : '';
    document.title = (ST.titre || 'Réunion') + ' · OP MESSAGES';
    montrer('identite');
  }
  demarrer();
})();
