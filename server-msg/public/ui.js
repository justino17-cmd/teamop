/* ══ LA PAGE MINIMALE D'OP MESSAGES (étape 1) ════════════════════════════════════════════════
 *
 * Connexion bêta, liste des conversations, une conversation, envoi, réception en direct. Rien
 * d'autre : la vraie interface se branchera sur `api.js`, qui est la couture.
 *
 * ⛔ TOUT TEXTE VENU D'UN TIERS (nom, message, nom de groupe) ENTRE PAR `textContent`, JAMAIS PAR
 * `innerHTML` : un message « <img src=x onerror=…> » doit s'afficher tel quel. `tests/test-906.js`
 * refuse `innerHTML`, `insertAdjacentHTML`, `document.write` et `eval` dans ce fichier.
 * ⛔ CHAQUE ESSAI REMET LE VERDICT À ZÉRO (`dire('')`) : un refus d'avant ne survit pas à la
 * réussite qui le dément (règle du dépôt, `_err()` d'`espace.html`).
 * ⛔ AUCUN JETON DANS LE JAVASCRIPT : la session est un cookie `HttpOnly`.
 */
(function () {
  'use strict';
  const api = window.OPMSG.creer({ base: '' });
  const $ = (id) => document.getElementById(id);
  const etat = { moi: null, conversations: [], courante: null, messages: [], membres: [], ecoute: null, noms: new Map(), saisie: new Map() };

  function dire(msg) { $('erreur').textContent = msg || ''; }
  function echec(e) { dire(e && e.message ? e.message : 'Erreur inattendue.'); if (e && e.code === 'session_requise') montrer(false); }
  function nomDe(id) { const p = etat.noms.get(id); return p ? (p.prenom + ' ' + p.nom).trim() : 'Quelqu\'un'; }
  function el(tag, classe, texte) { const n = document.createElement(tag); if (classe) n.className = classe; if (texte !== undefined) n.textContent = texte; return n; }
  function montrer(connecte) { $('connexion').hidden = connecte; $('appli').hidden = !connecte; $('etat').textContent = connecte && etat.moi ? '· ' + (etat.moi.prenom || '') : ''; }

  function titreConv(c) { return c.type === 'direct' ? (c.autre ? (c.autre.prenom + ' ' + c.autre.nom).trim() : 'Conversation') : (c.nom || 'Groupe'); }

  function dessinerListe() {
    const ul = $('liste'); ul.textContent = '';
    for (const c of etat.conversations) {
      const li = el('li', 'conv' + (etat.courante && etat.courante.id === c.id ? ' actif' : ''));
      const b = el('button'); b.type = 'button';
      const t = el('span', '', titreConv(c));
      if (c.non_lus) t.appendChild(el('span', 'badge', String(c.non_lus)));
      b.appendChild(t);
      b.appendChild(el('span', 'doux', c.apercu ? (c.apercu.supprime ? 'Message supprimé' : (c.apercu.illisible ? 'Message illisible' : (c.apercu.texte || ''))) : 'Aucun message'));
      b.addEventListener('click', () => ouvrir(c.id).catch(echec));
      li.appendChild(b); ul.appendChild(li);
    }
  }

  function dessinerFil() {
    const fil = $('fil'); fil.textContent = '';
    for (const m of etat.messages) {
      if (m.type === 'systeme') { fil.appendChild(el('div', 'bulle systeme', libelleSysteme(m))); continue; }
      const b = el('div', 'bulle' + (etat.moi && m.auteur === etat.moi.id ? ' moi' : ''));
      b.textContent = m.supprime ? 'Message supprimé' : (m.illisible ? 'Message illisible' : (m.texte === null || m.texte === undefined ? '…' : m.texte));
      if (!(etat.moi && m.auteur === etat.moi.id)) { const q = el('div', 'doux', nomDe(m.auteur)); b.insertBefore(q, b.firstChild); }
      fil.appendChild(b);
    }
    fil.scrollTop = fil.scrollHeight;
  }
  function libelleSysteme(m) {
    const k = m.meta && m.meta.k;
    if (k === 'groupe_cree') return nomDe(m.auteur) + ' a créé le groupe';
    if (k === 'membre_ajoute') return nomDe(m.auteur) + ' a ajouté ' + nomDe(m.meta.uid);
    if (k === 'rejoint') return nomDe(m.meta.uid) + ' a rejoint le groupe';
    if (k === 'membre_retire') return nomDe(m.auteur) + ' a retiré ' + nomDe(m.meta.uid);
    if (k === 'membre_parti') return nomDe(m.meta.uid) + ' a quitté le groupe';
    return 'Le groupe a été modifié';
  }

  async function chargerListe() {
    etat.conversations = await api.conversations();
    for (const c of etat.conversations) if (c.autre) etat.noms.set(c.autre.id, c.autre);
    dessinerListe();
  }

  async function ouvrir(id) {
    dire('');
    const d = await api.conversation(id);
    etat.courante = d.conversation; etat.membres = d.membres;
    for (const m of d.membres) etat.noms.set(m.id, m);
    const r = await api.messages(id, { limite: 50 });
    etat.messages = r.messages;
    $('titre').textContent = titreConv(d.conversation);
    $('f-envoi').hidden = false;
    dessinerFil(); dessinerListe();
    const dernier = etat.messages.length ? etat.messages[etat.messages.length - 1].seq : 0;
    if (dernier) api.marquerLu(id, dernier).then(chargerListe).catch(() => {});
  }

  function ecouter() {
    if (etat.ecoute) etat.ecoute.fermer();
    etat.ecoute = api.ecouter({
      message: (d) => {
        if (etat.courante && d.conv === etat.courante.id) {
          const q = etat.membres.find(m => m.id === d.auteur);
          if (!q) { api.conversation(d.conv).then(x => { etat.membres = x.membres; for (const m of x.membres) etat.noms.set(m.id, m); dessinerFil(); }).catch(() => {}); }
          if (d.relis) api.messages(d.conv, { apres_seq: d.seq - 1, limite: 1 }).then(r => { r.messages.forEach(m => window.OPMSG.fusionner(etat.messages, m)); dessinerFil(); }).catch(() => {});
          else window.OPMSG.fusionner(etat.messages, { seq: d.seq, id: d.id, auteur: d.auteur, ts: d.ts, type: d.type, texte: d.texte === undefined ? null : d.texte, meta: d.meta || null, supprime: !!d.supprime, reactions: [] });
          dessinerFil();
          api.marquerLu(d.conv, d.seq).catch(() => {});
        }
        chargerListe().catch(echec);
      },
      /* ⛔ Un texte de plus de 2 Ko n'est pas porté par l'événement (`relis`) : on le RELIT, comme pour un message neuf —
         sinon la bulle gardait « … » jusqu'au rechargement (relecture adverse, D7). */
      message_modifie: (d) => {
        if (!(etat.courante && d.conv === etat.courante.id)) return;
        if (d.relis) api.messages(d.conv, { apres_seq: d.seq - 1, limite: 1 }).then(r => { r.messages.forEach(m => window.OPMSG.fusionner(etat.messages, m)); dessinerFil(); }).catch(() => {});
        else { window.OPMSG.fusionner(etat.messages, { seq: d.seq, texte: d.texte === undefined ? null : d.texte, illisible: d.illisible === true }); dessinerFil(); }
      },
      message_supprime: (d) => { if (etat.courante && d.conv === etat.courante.id) { const m = etat.messages.find(x => x.seq === d.seq); if (m) { if (d.pour === 'moi' || d.pour === 'expire') etat.messages = etat.messages.filter(x => x.seq !== d.seq); else { m.supprime = true; m.texte = null; } dessinerFil(); } } },
      conversation: () => chargerListe().catch(echec),
      retire: (d) => { if (etat.courante && d.conv === etat.courante.id) { etat.courante = null; $('titre').textContent = ''; $('fil').textContent = ''; $('f-envoi').hidden = true; } chargerListe().catch(echec); },
      resync: () => { chargerListe().catch(echec); if (etat.courante) ouvrir(etat.courante.id).catch(echec); },
      saisie: (d) => {
        if (!etat.courante || d.conv !== etat.courante.id) return;
        if (d.actif) etat.saisie.set(d.uid, Date.now()); else etat.saisie.delete(d.uid);
        const qui = Array.from(etat.saisie.keys()).filter(u => Date.now() - etat.saisie.get(u) < 5000).map(nomDe);
        $('saisie').hidden = !qui.length; $('saisie').textContent = qui.length ? qui.join(', ') + ' écrit…' : '';
        setTimeout(() => { for (const [u, t] of etat.saisie) if (Date.now() - t >= 5000) etat.saisie.delete(u); }, 5100);
      },
      erreur: echec,
    });
  }

  async function demarrer(moi) {
    etat.moi = moi; etat.noms.set(moi.id, moi);
    montrer(true);
    await chargerListe();
    ecouter();
    const m = /(?:^|[#&])lien=([A-Za-z0-9_-]{20,64})/.exec(location.hash || '');
    if (m) {
      try { const a = await api.lireLien(m[1]); const p = $('a-accepter'); p.hidden = false; p.textContent = ''; const b = el('button', 'sec', 'Accepter l\'invitation de ' + (a.par.prenom + ' ' + a.par.nom).trim()); b.type = 'button'; b.addEventListener('click', () => accepter(m[1])); p.appendChild(b); }
      catch (e) { echec(e); }
      history.replaceState(null, '', location.pathname);
    }
  }
  async function accepter(code) {
    dire('');
    try { const r = await api.accepterLien(code); $('a-accepter').hidden = true; if (r.genre === 'contact') { const d = await api.directe(r.contact.id); await chargerListe(); await ouvrir(d.conversation.id); } else { await chargerListe(); await ouvrir(r.conversation.id); } }
    catch (e) { echec(e); }
  }

  $('f-connexion').addEventListener('submit', async (ev) => {
    ev.preventDefault(); dire('');
    try { demarrer(await api.connexionBeta($('login').value, $('pass').value)).catch(echec); $('pass').value = ''; } catch (e) { echec(e); }
  });
  $('f-envoi').addEventListener('submit', async (ev) => {
    ev.preventDefault(); dire('');
    const t = $('texte').value.trim(); if (!t || !etat.courante) return;
    try { const r = await api.envoyer(etat.courante.id, t); $('texte').value = ''; window.OPMSG.fusionner(etat.messages, { seq: r.seq, id: r.id, auteur: etat.moi.id, ts: r.ts, type: 'texte', texte: t, supprime: false, reactions: [] }); dessinerFil(); await chargerListe(); }
    catch (e) { echec(e); }
  });
  let derniereSaisie = 0;
  $('texte').addEventListener('input', () => { const t = Date.now(); if (etat.courante && t - derniereSaisie > 2500) { derniereSaisie = t; api.saisie(etat.courante.id, true).catch(() => {}); } });
  $('b-lien').addEventListener('click', async () => {
    dire('');
    try { const r = await api.lienContact({ max: 1, jours: 7 }); const p = $('lien-affiche'); p.hidden = false; p.textContent = location.origin + '/#lien=' + r.code; } catch (e) { echec(e); }
  });
  $('f-lien').addEventListener('submit', async (ev) => {
    ev.preventDefault(); dire('');
    const m = /([A-Za-z0-9_-]{20,64})\s*$/.exec($('code').value.trim()); if (!m) return dire(window.OPMSG.dire('lien_invalide'));
    $('code').value = ''; await accepter(m[1]);
  });
  $('b-sortir').addEventListener('click', async () => {
    try { if (etat.ecoute) etat.ecoute.fermer(); await api.deconnexion(); etat.moi = null; montrer(false); } catch (e) { echec(e); }
  });

  /* Une session déjà ouverte (cookie valable) : on entre directement. */
  api.moi().then(m => demarrer(m)).catch(() => { montrer(false); });
})();
