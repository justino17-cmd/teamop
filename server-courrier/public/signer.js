/* La page du signataire. Aucun script en ligne, aucune ressource d'ailleurs, et RIEN de ce que le serveur renvoie n'est inséré comme HTML : tout passe par textContent
   (le titre d'un document, un nom, une adresse sont saisis par un tiers). Le lien est lu dans l'adresse de la page et ne quitte jamais ce serveur. */
(function () {
  'use strict';
  var jeton = (location.pathname.match(/^\/signer\/([A-Za-z0-9_-]{43})$/) || [])[1] || '';
  var app = document.getElementById('app'), blobs = [], minuterie = null;
  var MSG = {
    introuvable: 'Ce lien n’est pas valide ou n’est plus actif. Si vous avez reçu un nouveau lien, utilisez-le.',
    consentement_requis: 'Cochez la case pour confirmer que vous avez lu le document et que vous acceptez de le signer.',
    consentement_obsolete: 'Le texte de consentement a changé : rechargez la page.',
    code_requis: 'Demandez d’abord votre code.',
    code_incorrect: 'Ce code n’est pas le bon.',
    code_expire: 'Ce code a expiré. Demandez-en un nouveau.',
    code_bloque: 'Trop d’essais avec ce code. Demandez-en un nouveau.',
    trop_tot: 'Un code vient de partir. Patientez un instant avant d’en demander un autre.',
    trop_de_codes: 'Vous avez demandé trop de codes pour cette demande. Contactez l’expéditeur : il vous enverra un nouveau lien.',
    canal_indisponible: 'L’envoi du code n’est pas disponible pour l’instant. Réessayez plus tard.',
    envoi_code_impossible: 'Le code n’a pas pu être envoyé. Réessayez dans un instant.',
    pas_possible: 'Cette demande ne peut plus être signée depuis ce lien.',
    trop_de_requetes: 'Trop de tentatives. Patientez une minute puis réessayez.',
    erreur_interne: 'Une erreur est survenue. Réessayez dans un instant.'
  };
  function h(tag, attrs) {
    var e = document.createElement(tag), k, i, c;
    for (k in (attrs || {})) {
      if (k === 'class') e.className = attrs[k]; else if (k === 'text') e.textContent = attrs[k];
      else if (k.slice(0, 2) === 'on') e.addEventListener(k.slice(2), attrs[k]);
      else if (attrs[k] !== false && attrs[k] != null) e.setAttribute(k, attrs[k]);
    }
    for (i = 2; i < arguments.length; i++) { c = arguments[i]; if (c == null) continue; e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); }
    return e;
  }
  function api(methode, chemin, corps) {
    return fetch('/api/signer/' + jeton + chemin, { method: methode, headers: corps ? { 'Content-Type': 'application/json' } : {}, body: corps ? JSON.stringify(corps) : undefined, credentials: 'omit', cache: 'no-store', referrerPolicy: 'no-referrer' })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return { ok: r.ok, statut: r.status, j: j }; }); });
  }
  function texteErreur(r) {
    var j = r.j || {}, m = MSG[j.error] || 'Une erreur est survenue (' + r.statut + ').';
    if (j.error === 'code_incorrect' && j.restants != null) m += ' Il vous reste ' + j.restants + ' essai' + (j.restants > 1 ? 's' : '') + '.';
    if (j.error === 'trop_tot' && j.attenteS) m += ' (' + j.attenteS + ' s)';
    return m;
  }
  function vider() { while (app.firstChild) app.removeChild(app.firstChild); if (minuterie) { clearInterval(minuterie); minuterie = null; } }
  function ecran(titre, texte, bon) {
    vider();
    app.appendChild(h('section', { class: 'fin carte' }, h('div', { class: 'rond' + (bon ? '' : ' non'), 'aria-hidden': 'true', text: bon ? '✓' : '!' }), h('h1', { text: titre }), h('p', { text: texte })));
  }
  function tailleTexte(n) { return n >= 1048576 ? (n / 1048576).toFixed(1).replace('.', ',') + ' Mo' : Math.max(1, Math.round(n / 1024)) + ' Ko'; }

  function lecteur(d, zone, bouton) {
    bouton.disabled = true; bouton.textContent = 'Chargement…';
    fetch('/api/signer/' + jeton + '/documents/' + d.n, { credentials: 'omit', cache: 'no-store', referrerPolicy: 'no-referrer' })
      .then(function (r) { if (!r.ok) throw new Error('doc'); return r.blob(); })
      .then(function (b) {
        var url = URL.createObjectURL(new Blob([b], { type: 'application/pdf' })); blobs.push(url);
        while (zone.firstChild) zone.removeChild(zone.firstChild);
        zone.appendChild(h('iframe', { src: url, title: 'Document : ' + d.nom, referrerpolicy: 'no-referrer' }));
        zone.appendChild(h('a', { href: url, target: '_blank', rel: 'noopener noreferrer', text: 'Ouvrir « ' + d.nom + ' » dans un nouvel onglet' }));
        bouton.textContent = 'Document affiché'; bouton.disabled = true;
      })
      .catch(function () { bouton.disabled = false; bouton.textContent = 'Lire le document'; zone.appendChild(h('p', { class: 'msg err', role: 'alert', text: 'Le document n’a pas pu être chargé. Réessayez.' })); });
  }
  function carteDocuments(v) {
    var c = h('section', { class: 'carte' }, h('h2', { text: v.documents.length > 1 ? 'Documents à lire' : 'Document à lire' }));
    v.documents.forEach(function (d) {
      var zone = h('div', { class: 'lecteur' }), b = h('button', { type: 'button', text: 'Lire le document' });
      b.addEventListener('click', function () { lecteur(d, zone, b); });
      c.appendChild(h('div', { class: 'doc' }, h('div', { class: 'nom' }, d.nom, ' ', h('span', { class: 'taille', text: '(' + tailleTexte(d.taille) + ')' })), b));
      c.appendChild(zone);
    });
    return c;
  }
  function entete(v) {
    var ech = v.echeance ? 'À signer avant le ' + new Date(v.echeance).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) + '.' : '';
    return [h('h1', { text: v.titre }), h('p', { class: 'de', text: (v.expediteur ? 'Demandé par ' + v.expediteur + '. ' : '') + 'Pour ' + v.signataire.nom + '. ' + ech })];
  }

  function signature(v) {
    vider();
    entete(v).forEach(function (e) { app.appendChild(e); });
    app.appendChild(carteDocuments(v));
    if (v.etat === 'attente_autres') {
      app.appendChild(h('section', { class: 'carte' }, h('h2', { text: 'Votre tour viendra' }), h('p', { text: 'Vous signez en dernier : vous pourrez signer quand les autres signataires auront signé. Revenez à ce lien plus tard.' })));
      return;
    }
    var coche = h('input', { type: 'checkbox', id: 'consent' });
    var msg = h('div', { 'aria-live': 'polite' });
    var canal = v.signataire.canal === 'sms' ? 'SMS' : 'e-mail';
    var code = h('input', { id: 'code', type: 'text', inputmode: 'numeric', autocomplete: 'one-time-code', pattern: '[0-9]*', maxlength: '6', 'aria-label': 'Code à 6 chiffres', placeholder: '000000' });
    var signer = h('button', { type: 'button', class: 'principal', text: 'Signer le document', disabled: 'disabled' });
    var demander = h('button', { type: 'button', class: 'principal', text: 'Recevoir mon code par ' + canal, disabled: 'disabled' });
    var zoneCode = h('div', { class: 'code', hidden: 'hidden' }, code, signer);
    var renvoi = h('button', { type: 'button', text: 'Renvoyer le code', hidden: 'hidden' });
    function dire(texte, ok) { while (msg.firstChild) msg.removeChild(msg.firstChild); if (texte) msg.appendChild(h('p', { class: 'msg ' + (ok ? 'ok' : 'err'), role: ok ? 'status' : 'alert', text: texte })); }
    function majBoutons() { demander.disabled = !coche.checked; signer.disabled = !(coche.checked && /^\d{6}$/.test(code.value.trim())); }
    function compte(s) {
      renvoi.hidden = false; renvoi.disabled = true; if (minuterie) clearInterval(minuterie);
      var t = s; renvoi.textContent = 'Renvoyer le code (' + t + ' s)';
      minuterie = setInterval(function () { t--; if (t <= 0) { clearInterval(minuterie); minuterie = null; renvoi.disabled = false; renvoi.textContent = 'Renvoyer le code'; } else renvoi.textContent = 'Renvoyer le code (' + t + ' s)'; }, 1000);
    }
    function envoyer() {
      dire('', true); demander.disabled = true; renvoi.disabled = true;
      api('POST', '/code', {}).then(function (r) {
        if (!r.ok) { dire(texteErreur(r), false); majBoutons(); if (r.j && r.j.error === 'trop_tot') compte(r.j.attenteS || 60); else renvoi.disabled = false; return; }
        zoneCode.hidden = false; demander.hidden = true; code.focus();
        dire('Un code à 6 chiffres vient d’être envoyé par ' + canal + ' à ' + r.j.destination + '. Il est valable 10 minutes.', true); compte(r.j.renvoiS || 60);
      }).catch(function () { dire(MSG.erreur_interne, false); majBoutons(); });
    }
    coche.addEventListener('change', majBoutons); code.addEventListener('input', majBoutons);
    demander.addEventListener('click', envoyer); renvoi.addEventListener('click', envoyer);
    signer.addEventListener('click', function () {
      signer.disabled = true; dire('', true);
      api('POST', '/signer', { code: code.value.trim(), consentement: true, version: v.consentement.version }).then(function (r) {
        if (!r.ok) { dire(texteErreur(r), false); majBoutons(); return; }
        ecran('Signature enregistrée', r.j.termine ? 'Merci. Tous les signataires ont signé.' : 'Merci. Votre signature est enregistrée.', true);
      }).catch(function () { dire(MSG.erreur_interne, false); majBoutons(); });
    });
    app.appendChild(h('section', { class: 'carte' }, h('h2', { text: 'Votre accord' }),
      h('div', { class: 'consent' }, coche, h('label', { for: 'consent', text: v.consentement.texte })),
      h('p', { class: 'petit', text: 'Données personnelles : pour établir la preuve de votre signature, nous conservons la date et l’heure, votre adresse e-mail (ou votre mobile), votre adresse réseau (IP) et votre navigateur. Elles sont traitées par l’expéditeur du document et par TeamOP, qui exploite ce service, et conservées 90 jours après la fin de la demande. Vous pouvez demander l’accès, la rectification ou l’effacement de ces données et vous opposer à leur traitement en écrivant à contact@teamop.fr ; vous pouvez aussi saisir la CNIL. Détails : teamop.fr, page « Confidentialité ».' }),
      h('div', { class: 'code' }, demander, renvoi), zoneCode, msg));
    if (v.codeEnvoye) { zoneCode.hidden = false; demander.hidden = true; renvoi.hidden = false; renvoi.disabled = false; dire('Un code vous a déjà été envoyé par ' + canal + ' à ' + v.signataire.destination + '. Saisissez-le, ou demandez-en un nouveau.', true); }
  }

  function vue(v) {
    var e = v.etat;
    if (e === 'a_signer' || e === 'attente_autres') return signature(v);
    if (e === 'signe') return ecran('Vous avez signé', 'Votre signature est enregistrée.', true);
    if (e === 'terminee') return ecran('Signatures terminées', 'Ce document a été signé par toutes les parties.', true);
    if (e === 'annulee') return ecran('Demande annulée', 'L’expéditeur a annulé cette demande : ce lien ne permet plus de signer.', false);
    if (e === 'expiree') return ecran('Délai dépassé', 'Le délai pour signer est écoulé. Demandez à l’expéditeur de vous renvoyer une demande.', false);
    if (e === 'refusee') return ecran('Demande refusée', 'Cette demande a été refusée.', false);
    return ecran('Pas encore prête', 'Cette demande n’est pas encore prête. Réessayez dans un instant.', false);
  }
  window.addEventListener('pagehide', function () { blobs.forEach(function (u) { try { URL.revokeObjectURL(u); } catch (e) { /* déjà libérée */ } }); });
  if (!jeton) return ecran('Lien invalide', MSG.introuvable, false);
  api('GET', '').then(function (r) { if (!r.ok) return ecran('Lien invalide', texteErreur(r), false); vue(r.j); }).catch(function () { ecran('Hors connexion', 'Impossible de joindre le service. Vérifiez votre connexion puis rechargez la page.', false); });
}());
