/* ══ UNE FAUSSE CONNEXION PAIR À PAIR POUR LES BANCS (`RTCPeerConnection`, `MediaStream`) ══════════════════════════════════════════════════════════
   Ce fichier ne prouve PAS qu'une voix passe : c'est la sonde du navigateur (`sonde-opmessages-appels.js`, deux Chromium, la vraie pile WebRTC) qui le prouve. Il sert à ce que le MOTEUR d'appels de la page
   (`source-serveur.js`, `creerMoteurAppels`) soit joué dans Node contre le VRAI service : l'offre, la réponse et les candidats voyagent par les vraies routes et le vrai flux, et la fausse connexion ne
   « se connecte » QUE si ce qu'elle a reçu est ce que l'autre a produit (l'offre de l'un est la description distante de l'autre, ses candidats arrivent à l'appelé).
   Elle refuse ce que la vraie refuse (c'est ce qui fait tomber un moteur qui se trompe d'ordre) :
     · `setRemoteDescription(offre)` hors de l'état stable (deux offres qui se croisent) et `setRemoteDescription(réponse)` sans offre locale : InvalidStateError ;
     · `addIceCandidate` avant toute description distante : InvalidStateError ;
     · `createAnswer` sans offre distante ; `createOffer` après `close()` ;
     · `replaceTrack` d'une piste du mauvais genre : TypeError.
   ⛔ ET ELLE REPREND LA RÈGLE QUI A FAIT MENTIR LE PREMIER MOTEUR (trouvée par la sonde du navigateur) : un émetteur créé par `addTransceiver` AVANT `setRemoteDescription(offre)` n'est PAS rattaché aux
   sections de l'offre. Le navigateur crée d'autres émetteurs, `recvonly`, pour chaque section — l'appelé qui n'y touche pas répond « je ne fais que recevoir », et l'appelant ne reçoit aucune piste.
   Chaque section (`m=audio`, `m=video`) porte donc sa DIRECTION (`a=sendrecv`, `a=recvonly`…), l'événement `ontrack` n'a lieu que pour une section que l'AUTRE envoie, et `pc.envoyes()` / `pc.recues()`
   disent ce qui passe vraiment : les genres dont un émetteur rattaché, en `sendrecv` ou `sendonly`, porte une piste — et les genres pour lesquels une piste distante est arrivée.
   Les candidats sont émis après chaque description locale (deux, puis la fin `null`) ; la liaison s'établit quand les deux descriptions sont posées, que la négociation est stable et qu'AU MOINS UN candidat
   distant de la génération courante est arrivé ; un redémarrage (`a=restart` dans l'offre) remet les candidats distants à zéro. `monde.bloquer = true` empêche toute liaison (la veille), `pc.casser(état)` joue
   un état de liaison (`failed`, `disconnected`), `pc.journal` garde les appels faits dans l'ordre.

   ⛔ POUR LES SALLES (étape 8, `test-990` : une MAILLE, N − 1 connexions par page, plusieurs pages dans un même processus) :
     · chaque connexion a une ORIGINE (`faux-<page>-<n>`, la ligne `o=` de ses descriptions) : `pc.distantOrigine()` dit avec QUI elle est réellement liée, et `appariees(mondes)` vérifie que la liaison est
       RÉCIPROQUE — A croit parler à B, B croit parler à A. Un moteur qui mélange deux liaisons (une réponse envoyée à la mauvaise paire) ne s'établit pas, ou s'établit avec la mauvaise ;
     · `sender.getParameters()` / `setParameters()` gardent le plafond de débit posé (`monde.debits`, `pc.debitMax(kind)`) ;
     · `pc.getReceivers()` rend les récepteurs des genres REÇUS, et `pc.niveauDistant` (0 à 1) est le niveau de voix que leurs statistiques annoncent (`audioLevel`) : c'est la voix de l'AUTRE ;
     · `monde.exigeRelais = true` : une connexion ne s'établit que si SA configuration porte un serveur de relais (`turn:` / `turns:`) — le STUN seul ne suffit pas (un réseau qui bloque tout trajet direct). */
'use strict';

function creerMonde(nom) {
  const monde = { nom: nom || 'monde', pcs: [], bloquer: false, exigeRelais: false, delaiCandidatsMs: 3, delaiLiaisonMs: 3, pistesPosees: [], debits: [], n: 0 };

  const invalide = (m) => Object.assign(new Error(m), { name: 'InvalidStateError' });
  const envoie = (d) => d === 'sendrecv' || d === 'sendonly';
  const recoit = (d) => d === 'sendrecv' || d === 'recvonly';

  class FauxFlux {
    constructor() { this.pistes = []; }
    getTracks() { return this.pistes.slice(); }
    getAudioTracks() { return this.pistes.filter(p => p.kind === 'audio'); }
    getVideoTracks() { return this.pistes.filter(p => p.kind === 'video'); }
    addTrack(p) { if (!this.pistes.includes(p)) this.pistes.push(p); }
  }

  /* les sections d'une description : [{ kind, direction }] dans l'ordre */
  function sections(sdp) {
    const out = [];
    for (const l of String(sdp).split(/\r?\n/)) {
      const m = /^m=(audio|video) /.exec(l);
      if (m) out.push({ kind: m[1], direction: 'sendrecv' });
      else if (out.length && /^a=(sendrecv|sendonly|recvonly|inactive)$/.test(l)) out[out.length - 1].direction = l.slice(2);
    }
    return out;
  }
  const inverse = (d) => d === 'sendonly' ? 'recvonly' : d === 'recvonly' ? 'sendonly' : d;

  class FauxPc {
    constructor(conf) {
      this.id = ++monde.n; this.conf = conf; this.confs = [conf]; this.origine = 'faux-' + monde.nom + '-' + this.id; this.niveauDistant = 0;
      this.signalingState = 'stable'; this.iceConnectionState = 'new';
      this.localDescription = null; this.remoteDescription = null;
      this.transceivers = []; this.candidatsRecus = []; this.candidatsEmis = []; this.pistesRecues = [];
      this.genOffre = 0; this.gen = 0; this.fermee = false; this.relances = 0;
      this.journal = [];
      this.onicecandidate = null; this.ontrack = null; this.oniceconnectionstatechange = null;
      monde.pcs.push(this);
    }
    /* un émetteur : `associe` dit s'il est rattaché à une section d'une description (jamais avant la première offre pour `addTransceiver`) */
    _emetteur(kind, direction, associe) {
      const pc = this;
      const tr = { kind, direction, associe, receiver: { track: { kind }, async getStats() {
        const m = new Map(); m.set('in-' + kind, Object.assign({ type: 'inbound-rtp', kind }, kind === 'audio' ? { audioLevel: pc.niveauDistant || 0 } : {})); return m;
      } }, sender: { track: null, _params: null, async replaceTrack(t) {
        if (t && t.kind !== kind) throw Object.assign(new TypeError('piste d\'un autre genre'), { name: 'TypeError' });
        this.track = t; pc.journal.push('replaceTrack:' + kind + ':' + (t ? t.id : 'null')); monde.pistesPosees.push([pc.id, kind, t ? t.id : null]);
      }, getParameters() { return JSON.parse(JSON.stringify(this._params || { encodings: [{}] })); },
      async setParameters(p) {
        if (pc.fermee) throw invalide('connexion fermée');
        this._params = JSON.parse(JSON.stringify(p));
        const max = p && p.encodings && p.encodings[0] ? p.encodings[0].maxBitrate : undefined;
        pc.journal.push('setParameters:' + kind + ':' + max); monde.debits.push([pc.id, kind, max]);
      } } };
      this.transceivers.push(tr);
      return tr;
    }
    addTransceiver(kind, init) {
      this.journal.push('addTransceiver:' + kind);
      return this._emetteur(kind, (init && init.direction) || 'sendrecv', false);
    }
    getTransceivers() { return this.transceivers.slice(); }
    getReceivers() { return this.transceivers.filter(t => t.associe && recoit(t.direction) && this.pistesRecues.includes(t.kind)).map(t => t.receiver); }
    getSenders() { return this.transceivers.filter(t => t.associe && envoie(t.direction)).map(t => t.sender); }
    /* avec QUI cette connexion est réellement liée : l'origine de la description distante (null tant qu'aucune n'est posée) */
    distantOrigine() { const m = this.remoteDescription && /^o=(\S+) /m.exec(this.remoteDescription.sdp); return m ? m[1] : null; }
    /* le plafond de débit posé sur l'émetteur de ce genre (null s'il n'en a pas) */
    debitMax(kind) { const t = this.transceivers.find(x => x.kind === kind && x.sender._params); return t && t.sender._params.encodings[0] ? (t.sender._params.encodings[0].maxBitrate === undefined ? null : t.sender._params.encodings[0].maxBitrate) : null; }
    /* cette connexion porte-t-elle un serveur de relais dans SA configuration courante ? */
    /* `monde.exigeRelais` : vrai (toutes les liaisons) ou la liste des pages (leur nom) avec lesquelles aucun trajet direct n'existe — la liaison attend alors d'avoir un relais dans SA configuration */
    _attendLeRelais() {
      const x = monde.exigeRelais; if (!x) return false;
      if (x !== true) { const o = this.distantOrigine() || ''; if (!x.some(n => o.indexOf('faux-' + n + '-') === 0)) return false; }
      return !this.avecRelais();
    }
    avecRelais() { return !!(this.conf && Array.isArray(this.conf.iceServers) && this.conf.iceServers.some(s => (Array.isArray(s.urls) ? s.urls : [s.urls]).some(u => /^turns?:/.test(String(u))))); }
    restartIce() { this.journal.push('restartIce'); this.relances++; }
    setConfiguration(conf) { this.journal.push('setConfiguration'); this.conf = conf; this.confs.push(conf); this._verifier(); }
    _sdp(redemarrage) {
      const l = ['v=0', 'o=' + this.origine + ' ' + (++this.genOffre), 's=-', redemarrage ? 'a=restart' : 'a=initial'];
      for (const tr of this.transceivers) l.push('m=' + tr.kind + ' 9 UDP/TLS/RTP/SAVPF ' + (tr.kind === 'audio' ? '111' : '96'), 'a=' + tr.direction);
      l.push('');
      return l.join('\r\n');
    }
    async createOffer(opts) {
      if (this.fermee) throw invalide('connexion fermée');
      this.journal.push('createOffer' + (opts && opts.iceRestart ? ':restart' : ''));
      return { type: 'offer', sdp: this._sdp(opts && opts.iceRestart) };
    }
    async createAnswer() {
      if (this.fermee) throw invalide('connexion fermée');
      if (this.signalingState !== 'have-remote-offer') throw invalide('pas d\'offre distante');
      this.journal.push('createAnswer');
      /* la réponse ne porte que les sections RATTACHÉES à l'offre reçue (celles que `addTransceiver` a créées d'avance n'y sont pas) ; chacune dit ce que NOUS faisons de ce que l'autre propose */
      const offertes = sections(this.remoteDescription.sdp);
      const l = ['v=0', 'o=' + this.origine + ' ' + (++this.genOffre), 's=-', /a=restart/.test(this.remoteDescription.sdp) ? 'a=restart' : 'a=initial'];
      const prises = new Set();
      for (const o of offertes) {
        const tr = this.transceivers.find(t => t.associe && t.kind === o.kind && !prises.has(t));
        prises.add(tr);
        const nous = tr ? tr.direction : 'recvonly';
        const sendNous = envoie(nous) && recoit(o.direction), recvNous = recoit(nous) && envoie(o.direction);
        l.push('m=' + o.kind + ' 9 UDP/TLS/RTP/SAVPF ' + (o.kind === 'audio' ? '111' : '96'), 'a=' + (sendNous && recvNous ? 'sendrecv' : sendNous ? 'sendonly' : recvNous ? 'recvonly' : 'inactive'));
      }
      l.push('');
      return { type: 'answer', sdp: l.join('\r\n') };
    }
    async setLocalDescription(d) {
      if (this.fermee) throw invalide('connexion fermée');
      if (d.type === 'offer') {
        if (this.signalingState !== 'stable') throw invalide('offre locale hors de l\'état stable');
        this.signalingState = 'have-local-offer';
        for (const tr of this.transceivers) tr.associe = true;                 // une offre rattache TOUS les émetteurs qu'on a ajoutés
      } else if (d.type === 'answer') { if (this.signalingState !== 'have-remote-offer') throw invalide('réponse locale sans offre distante'); this.signalingState = 'stable'; }
      else throw invalide('type inconnu');
      this.journal.push('setLocalDescription:' + d.type);
      this.localDescription = { type: d.type, sdp: d.sdp };
      this.gen++;
      this._collecter();
      this._verifier();
    }
    async setRemoteDescription(d) {
      if (this.fermee) throw invalide('connexion fermée');
      if (!d || typeof d.sdp !== 'string') throw new TypeError('description illisible');
      const distantes = sections(d.sdp);
      if (d.type === 'offer') {
        if (this.signalingState !== 'stable') throw invalide('offre distante hors de l\'état stable (deux offres qui se croisent)');
        this.signalingState = 'have-remote-offer';
        /* ⛔ une section de l'offre retrouve un émetteur DÉJÀ RATTACHÉ (un redémarrage) ; sinon le navigateur en crée un NEUF, en réception seule — jamais un émetteur d'`addTransceiver` */
        const prises = new Set();
        for (const o of distantes) {
          let tr = this.transceivers.find(t => t.associe && t.kind === o.kind && !prises.has(t));
          if (!tr) { tr = this._emetteur(o.kind, 'recvonly', true); this.journal.push('transceiverNeuf:' + o.kind); }
          prises.add(tr);
          if (envoie(o.direction) && recoit(tr.direction)) this._piste(o.kind);
        }
      } else if (d.type === 'answer') {
        if (this.signalingState !== 'have-local-offer') throw invalide('réponse distante sans offre locale');
        this.signalingState = 'stable';
        for (const o of distantes) if (envoie(o.direction)) this._piste(o.kind);
      } else throw invalide('type inconnu');
      this.journal.push('setRemoteDescription:' + d.type);
      if (!this.remoteDescription || /a=restart/.test(d.sdp)) this.candidatsRecus = [];
      this.remoteDescription = { type: d.type, sdp: d.sdp };
      this._verifier();
    }
    async addIceCandidate(c) {
      if (!this.remoteDescription) throw invalide('aucune description distante');
      if (!c || typeof c.candidate !== 'string') throw new TypeError('candidat illisible');
      this.journal.push('addIceCandidate');
      this.candidatsRecus.push(c);
      this._verifier();
    }
    close() { this.journal.push('close'); this.fermee = true; this.signalingState = 'closed'; this.iceConnectionState = 'closed'; }
    /* ce qui passe vraiment : les genres qu'on ENVOIE (un émetteur rattaché, en envoi, avec une piste) et ceux qu'on REÇOIT (une piste distante est arrivée) */
    envoyes() { return this.transceivers.filter(t => t.associe && envoie(t.direction) && t.sender.track).map(t => t.kind).sort(); }
    recues() { return this.pistesRecues.slice().sort(); }
    /* ── l'intérieur ── */
    _piste(kind) {
      if (this.pistesRecues.includes(kind)) return;
      this.pistesRecues.push(kind);
      if (this.ontrack) this.ontrack({ track: { kind, id: 'distant-' + kind + '-' + this.id, readyState: 'live' }, streams: [] });
    }
    _collecter() {
      const gen = this.gen;
      setTimeout(() => {
        if (this.fermee || gen !== this.gen || !this.onicecandidate) return;
        for (const [i, typ] of [[1, 'host'], [2, 'srflx']]) {
          const c = { candidate: 'candidate:' + i + ' 1 udp ' + (2122000 - i) + ' 192.0.2.' + this.id + ' ' + (50000 + i) + ' typ ' + typ + ' generation ' + gen, sdpMid: String(i % 2), sdpMLineIndex: i % 2, usernameFragment: 'u' + this.id + 'g' + gen };
          this.candidatsEmis.push(c);
          this.onicecandidate({ candidate: Object.assign({ toJSON() { return c; } }, c) });
        }
        this.onicecandidate({ candidate: null });
      }, monde.delaiCandidatsMs);
    }
    _etat(s) { this.iceConnectionState = s; if (this.oniceconnectionstatechange) this.oniceconnectionstatechange(); }
    _verifier() {
      if (this.fermee || this.iceConnectionState === 'connected' || this.iceConnectionState === 'completed') return;
      if (!this.localDescription || !this.remoteDescription || this.signalingState !== 'stable') return;
      if (this.iceConnectionState === 'new') this._etat('checking');
      if (!this.candidatsRecus.length || monde.bloquer || this._attendLeRelais()) return;
      const n = this.candidatsRecus.length;
      setTimeout(() => {
        if (this.fermee || monde.bloquer || this._attendLeRelais() || this.candidatsRecus.length < n || this.signalingState !== 'stable') return;
        if (this.iceConnectionState === 'connected' || this.iceConnectionState === 'completed') return;
        this._etat('connected');
      }, monde.delaiLiaisonMs);
    }
    /* joué par le banc : la liaison tombe (`failed`, `disconnected`) ou revient (`connected`) */
    casser(etat) { if (!this.fermee) this._etat(etat || 'failed'); }
  }

  /* une piste de la PAGE (ce que `getUserMedia` rendrait) */
  const piste = (kind, id) => ({ kind, id: id || (kind + '-' + (++monde.n)), readyState: 'live', enabled: true, stop() { this.readyState = 'ended'; } });
  monde.RTCPeerConnection = FauxPc; monde.MediaStream = FauxFlux; monde.piste = piste;
  monde.dernier = () => monde.pcs[monde.pcs.length - 1] || null;
  monde.vivants = () => monde.pcs.filter(p => !p.fermee);
  /* les liaisons RÉCIPROQUES entre ce monde et les autres : [{ local, distant }] — chacune des connexions vivantes d'ici dont l'autre bout, ailleurs, nomme cette même connexion */
  monde.appariees = (mondes) => {
    const out = [];
    for (const pc of monde.vivants()) {
      const o = pc.distantOrigine(); if (!o) continue;
      for (const m of mondes) {
        if (m === monde) continue;
        const autre = m.vivants().find(x => x.origine === o);
        if (autre && autre.distantOrigine() === pc.origine) out.push({ local: pc.origine, distant: autre.origine, monde: m.nom });
      }
    }
    return out;
  };
  return monde;
}

module.exports = { creerMonde };
