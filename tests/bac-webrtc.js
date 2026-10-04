/* ══ UNE FAUSSE CONNEXION PAIR À PAIR POUR LES BANCS (`RTCPeerConnection`, `MediaStream`) ══════════════════════════════════════════════════════════
   Ce fichier ne prouve PAS qu'une voix passe : c'est la sonde du navigateur (`sonde-opmessages-appels.js`, deux Chromium, la vraie pile WebRTC) qui le prouve. Il sert à ce que le MOTEUR d'appels de la page
   (`source-serveur.js`, `creerMoteurAppels`) soit joué dans Node contre le VRAI service : l'offre, la réponse et les candidats voyagent par les vraies routes et le vrai flux, et la fausse connexion ne
   « se connecte » QUE si ce qu'elle a reçu est ce que l'autre a produit (l'offre de l'un est la description distante de l'autre, ses candidats arrivent à l'appelé).
   Elle refuse ce que la vraie refuse (c'est ce qui fait tomber un moteur qui se trompe d'ordre) :
     · `setRemoteDescription(offre)` hors de l'état stable (deux offres qui se croisent) et `setRemoteDescription(réponse)` sans offre locale : InvalidStateError ;
     · `addIceCandidate` avant toute description distante : InvalidStateError ;
     · `createAnswer` sans offre distante ; `createOffer` après `close()` ;
     · `replaceTrack` d'une piste du mauvais genre : TypeError.
   Les candidats sont émis après chaque description locale (deux, puis la fin `null`) ; la liaison s'établit quand les deux descriptions sont posées, que la négociation est stable et qu'AU MOINS UN candidat
   distant de la génération courante est arrivé ; un redémarrage (`a=restart` dans l'offre) remet les candidats distants à zéro. `monde.bloquer = true` empêche toute liaison (la veille), `pc.casser(état)` joue
   un état de liaison (`failed`, `disconnected`), `pc.journal` garde les appels faits dans l'ordre. */
'use strict';

function creerMonde(nom) {
  const monde = { nom: nom || 'monde', pcs: [], bloquer: false, delaiCandidatsMs: 3, delaiLiaisonMs: 3, pistesPosees: [], n: 0 };

  const invalide = (m) => Object.assign(new Error(m), { name: 'InvalidStateError' });

  class FauxFlux {
    constructor() { this.pistes = []; }
    getTracks() { return this.pistes.slice(); }
    getAudioTracks() { return this.pistes.filter(p => p.kind === 'audio'); }
    getVideoTracks() { return this.pistes.filter(p => p.kind === 'video'); }
    addTrack(p) { if (!this.pistes.includes(p)) this.pistes.push(p); }
  }

  class FauxPc {
    constructor(conf) {
      this.id = ++monde.n; this.conf = conf; this.confs = [conf];
      this.signalingState = 'stable'; this.iceConnectionState = 'new';
      this.localDescription = null; this.remoteDescription = null;
      this.transceivers = []; this.candidatsRecus = []; this.candidatsEmis = [];
      this.genOffre = 0; this.gen = 0; this.fermee = false; this.relances = 0; this.pistesAnnoncees = false;
      this.journal = [];
      this.onicecandidate = null; this.ontrack = null; this.oniceconnectionstatechange = null;
      monde.pcs.push(this);
    }
    addTransceiver(kind, init) {
      this.journal.push('addTransceiver:' + kind);
      const pc = this;
      const tr = { kind, direction: init && init.direction, receiver: {}, sender: { track: null, async replaceTrack(t) {
        if (t && t.kind !== kind) throw Object.assign(new TypeError('piste d\'un autre genre'), { name: 'TypeError' });
        this.track = t; pc.journal.push('replaceTrack:' + kind + ':' + (t ? t.id : 'null')); monde.pistesPosees.push([pc.id, kind, t ? t.id : null]);
      } } };
      this.transceivers.push(tr);
      return tr;
    }
    restartIce() { this.journal.push('restartIce'); this.relances++; }
    setConfiguration(conf) { this.journal.push('setConfiguration'); this.conf = conf; this.confs.push(conf); }
    async createOffer(opts) {
      if (this.fermee) throw invalide('connexion fermée');
      this.journal.push('createOffer' + (opts && opts.iceRestart ? ':restart' : ''));
      const sdp = ['v=0', 'o=faux-' + this.id + ' ' + (++this.genOffre), 's=-', opts && opts.iceRestart ? 'a=restart' : 'a=initial', 'm=audio 9 UDP/TLS/RTP/SAVPF 111', 'm=video 9 UDP/TLS/RTP/SAVPF 96', ''].join('\r\n');
      return { type: 'offer', sdp };
    }
    async createAnswer() {
      if (this.fermee) throw invalide('connexion fermée');
      if (this.signalingState !== 'have-remote-offer') throw invalide('pas d\'offre distante');
      this.journal.push('createAnswer');
      const sdp = ['v=0', 'o=faux-' + this.id + ' ' + (++this.genOffre), 's=-', /a=restart/.test(this.remoteDescription.sdp) ? 'a=restart' : 'a=initial', 'm=audio 9 UDP/TLS/RTP/SAVPF 111', 'm=video 9 UDP/TLS/RTP/SAVPF 96', ''].join('\r\n');
      return { type: 'answer', sdp };
    }
    async setLocalDescription(d) {
      if (this.fermee) throw invalide('connexion fermée');
      if (d.type === 'offer') { if (this.signalingState !== 'stable') throw invalide('offre locale hors de l\'état stable'); this.signalingState = 'have-local-offer'; }
      else if (d.type === 'answer') { if (this.signalingState !== 'have-remote-offer') throw invalide('réponse locale sans offre distante'); this.signalingState = 'stable'; }
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
      if (d.type === 'offer') { if (this.signalingState !== 'stable') throw invalide('offre distante hors de l\'état stable (deux offres qui se croisent)'); this.signalingState = 'have-remote-offer'; }
      else if (d.type === 'answer') { if (this.signalingState !== 'have-local-offer') throw invalide('réponse distante sans offre locale'); this.signalingState = 'stable'; }
      else throw invalide('type inconnu');
      this.journal.push('setRemoteDescription:' + d.type);
      const premiere = !this.remoteDescription;
      if (premiere || /a=restart/.test(d.sdp)) this.candidatsRecus = [];
      this.remoteDescription = { type: d.type, sdp: d.sdp };
      if (premiere) this._annoncerPistes();
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
    /* ── l'intérieur ── */
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
    _annoncerPistes() {
      if (this.pistesAnnoncees || !this.ontrack) return;
      this.pistesAnnoncees = true;
      for (const kind of ['audio', 'video']) this.ontrack({ track: { kind, id: 'distant-' + kind + '-' + this.id, readyState: 'live' }, streams: [] });
    }
    _etat(s) { this.iceConnectionState = s; if (this.oniceconnectionstatechange) this.oniceconnectionstatechange(); }
    _verifier() {
      if (this.fermee || this.iceConnectionState === 'connected' || this.iceConnectionState === 'completed') return;
      if (!this.localDescription || !this.remoteDescription || this.signalingState !== 'stable') return;
      if (this.iceConnectionState === 'new') this._etat('checking');
      if (!this.candidatsRecus.length || monde.bloquer) return;
      const n = this.candidatsRecus.length;
      setTimeout(() => {
        if (this.fermee || monde.bloquer || this.candidatsRecus.length < n || this.signalingState !== 'stable') return;
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
  return monde;
}

module.exports = { creerMonde };
