/* ══ EN DIRECT : l'appel (audio, vidéo) et la réunion (préparation, salle, partage d'écran) ══ */
const dureeTxt = (t0) => { const s = Math.max(0, Math.floor((Date.now() - t0) / 1000)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
let _tic = 0;

/* ═══ APPEL ═══ */
function demarrerAppel(qui, video, entrant) {
  const c = conv(qui);
  if (c && c.canal) { ouvrirSalle({ titre: c.n, invites: c.membres.map((m) => [m, 'oui']) }, true); return; }      // appeler un canal, c'est une réunion
  const p = c ? c.avec : qui; if (!P[p]) return; fermer();
  S.appel = { qui: p, video: !!video, etat: entrant ? 'entrant' : 'sonne', muet: false, hp: false, clavier: false, reduit: false, t0: 0 };
  peindreAppel(); if (!entrant) setTimeout(() => { if (S.appel && S.appel.etat === 'sonne') { S.appel.etat = 'cours'; S.appel.t0 = Date.now(); peindreAppel(); } }, 2200);
}
function peindreAppel() {
  const a = S.appel, z = $('#plein'), m = $('#mini'); clearInterval(_tic);
  if (!a) { if (!S.salle) z.innerHTML = ''; if (m) m.remove(); return; }
  if (a.etat === 'cours') _tic = setInterval(() => { $$('[data-duree]').forEach((e) => { e.textContent = dureeTxt(a.t0); }); }, 1000);
  if (a.reduit) { z.innerHTML = ''; let b = m; if (!b) { b = document.createElement('button'); b.id = 'mini'; b.dataset.appel = 'revenir'; document.body.appendChild(b); }
    b.innerHTML = `${svg('tel')}${esc(prenom(a.qui))} · <span data-duree class="tab">${a.t0 ? dureeTxt(a.t0) : '…'}</span>`; b.setAttribute('aria-label', 'Revenir à l’appel avec ' + P[a.qui].n); return; }
  if (m) m.remove();
  const p = P[a.qui], b = (k, ic, l, on) => `<button data-appel="${k}" aria-pressed="${!!on}"><i>${svg(ic)}</i>${l}</button>`;
  const etat = a.etat === 'sonne' ? 'Appel en cours…' : a.etat === 'entrant' ? (a.video ? 'Appel vidéo entrant' : 'Appel entrant') : `<span data-duree class="tab">${dureeTxt(a.t0)}</span>`;
  z.innerHTML = `<div class="appel ${a.video && a.etat === 'cours' ? 'video' : ''} ${a.etat !== 'cours' ? 'sonne' : ''}" style="--a1:${p.a[0]};--a2:${p.a[1]}" role="dialog" aria-label="Appel avec ${esc(p.n)}">
    ${a.etat === 'cours' ? `<button class="reduire" data-appel="reduire" aria-label="Réduire l’appel">${svg('bas')}</button>` : ''}${a.video && a.etat === 'cours' ? '<span class="vous">Toi</span>' : ''}
    <div class="haut-a">${av(a.qui, 'xl')}<h2>${esc(p.n)}</h2><p>${etat}</p></div>
    ${a.etat === 'entrant' ? `<div class="fin" style="margin-top:auto"><button data-appel="raccrocher" class="racc"><i>${svg('tel')}</i>Refuser</button><button data-appel="repondre"><i class="ok">${svg('tel')}</i>Répondre</button></div>`
      : a.clavier ? `<div class="clavier">${'123456789*0#'.split('').map((t) => `<button data-touche="${t}">${t}</button>`).join('')}</div><div class="fin"><button data-appel="clavier"><i style="background:rgba(255,255,255,.16)">${svg('x')}</i>Masquer</button><button data-appel="raccrocher" class="racc"><i>${svg('tel')}</i>Raccrocher</button></div>`
      : `<div class="cmd">${b('muet', a.muet ? 'microoff' : 'micro', 'Silence', a.muet)}${b('hp', 'hp', 'Haut-parleur', a.hp)}${b('camera', a.video ? 'video' : 'camoff', 'Caméra', a.video)}${b('clavier', 'clavier', 'Clavier')}${b('ajouter', 'ajout', 'Ajouter')}${b('message', 'bulle', 'Message')}</div>
        <div class="fin"><button data-appel="raccrocher" class="racc"><i>${svg('tel')}</i>Raccrocher</button></div>`}</div>`;
}
function finAppel() {
  const a = S.appel; if (!a) return; clearInterval(_tic);
  const duree = a.t0 ? dureeTxt(a.t0) : null, sens = a.etat === 'entrant' ? 'manque' : a.etatOrigine === 'entrant' ? 'entrant' : 'sortant';
  APPELS.unshift({ id: uid(), qui: a.qui, sens, video: a.video ? 1 : 0, j: 0, h: hMaintenant(), duree: duree || undefined, vu: true });
  const c = C.find((x) => x.avec === a.qui); if (c && duree) c.msgs.push({ id: uid(), de: 'moi', type: 'sys', ic: a.video ? 'video' : 'tel', j: 0, h: hMaintenant(), t: `Appel ${a.video ? 'vidéo' : 'audio'} · ${duree}` });
  S.appel = null; peindreAppel(); rendre(); toast(duree ? 'Appel terminé · ' + duree : sens === 'manque' ? 'Appel refusé' : 'Appel annulé');
}

/* ═══ RÉUNION ═══ */
const ST_PHRASES = [['karim', 'Le compresseur arrive demain avant dix heures.'], ['sophie', 'Je préviens le client et je mets à jour le planning.'], ['leo', 'Je peux passer en renfort en début d’après-midi.']];
function ouvrirSalle(e, direct) {
  fermer(); const inv = (e.invites || []).map((i) => i[0]);
  S.salle = { e, etape: 'prepa', micro: true, cam: true, flou: false, volet: null, main: false, st: false, rec: false, verrou: false, partage: false, parle: 0, phrase: 0, t0: 0, reac: null,
    presents: inv.slice(0, Math.max(1, inv.length - 1)), attente: inv.length > 1 ? inv.slice(-1) : [], chat: inv.length ? [{ de: inv[0], t: 'Bonjour à tous.' }] : [], notes: '', fichiers: [] };
  if (S.appel) { S.appel = null; peindreAppel(); }
  if (direct) entrerSalle(); else peindreSalle();
}
function entrerSalle() {
  const s = S.salle; if (!s) return; s.etape = 'salle'; s.t0 = Date.now(); peindreSalle(); clearInterval(_tic); let n = 0;
  _tic = setInterval(() => { if (!S.salle) { clearInterval(_tic); return; } const d = $('#salle-duree'); if (d) d.textContent = dureeTxt(s.t0);
    if (++n % 3 === 0 && s.presents.length) { s.parle = (s.parle + 1) % s.presents.length; s.phrase = (s.phrase + 1) % ST_PHRASES.length; majTuiles(); } }, 1000);
}
function tuilesHtml() {
  const s = S.salle, gens = ['moi'].concat(s.presents), n = gens.length, cols = s.partage ? Math.min(4, n) : n <= 1 ? 1 : n <= 4 ? 2 : 3;
  const t = gens.map((p) => { const moi = p === 'moi', parle = !moi && s.presents[s.parle] === p && !s.partage ? true : !moi && s.presents[s.parle] === p, cam = moi ? s.cam : p !== 'leo';
    return `<div class="tuile ${cam ? 'cam' : ''} ${parle ? 'parle' : ''}" style="--a1:${P[p].a[0]};--a2:${P[p].a[1]}">${av(p, 'g')}<span class="nom">${(moi ? !s.micro : p === 'sophie') ? svg('microoff') : ''}<span class="coupe">${moi ? 'Toi' : esc(P[p].n)}</span></span>${moi && s.main ? '<span class="main">✋</span>' : ''}${moi && s.reac ? `<span class="reac-v">${s.reac}</span>` : ''}</div>`; }).join('');
  return { html: (s.partage ? anHtml() : '') + t, gens: t, cols };
}
function majTuiles() {
  const z = $('#tuiles'); if (!z) return; const t = tuilesHtml(); z.style.setProperty('--cols', t.cols);
  /* la tuile du partage RESTE : la reconstruire toutes les trois secondes couperait le trait qu'on est en train de dessiner */
  const pa = $('#an-tuile', z);
  if (pa && S.salle.partage) { while (pa.nextSibling) pa.nextSibling.remove(); pa.insertAdjacentHTML('afterend', t.gens); } else z.innerHTML = t.html;
  const st = $('#soustitres'); if (st) st.innerHTML = stHtml();
}
const stHtml = () => { const ph = ST_PHRASES[S.salle.phrase]; return `<b>${esc(prenom(ph[0]))} :</b> ${esc(ph[1])}`; };
function voletHtml() {
  const s = S.salle, v = s.volet; if (!v) return '';
  const t = (x) => `<div class="v-tete"><b>${x}</b><button class="rond" data-salle="volet" data-v="" aria-label="Fermer le volet">${svg('x')}</button></div>`;
  if (v === 'participants') return `<aside class="volet">${t('Participants · ' + (s.presents.length + 1))}<div class="v-corps">
    ${s.attente.map((p) => `<div class="l-p">${av(p, 'p')}<span>${esc(P[p].n)}<br><small style="opacity:.7">dans la salle d’attente</small></span><button class="btn-s ok" data-salle="admettre" data-p="${p}">Admettre</button></div>`).join('')}
    <div class="l-p">${av('moi', 'p')}<span>Toi <small style="opacity:.7">· organisatrice</small></span></div>${s.presents.map((p) => `<div class="l-p">${av(p, 'p')}<span>${esc(P[p].n)}</span>${p === 'sophie' ? svg('microoff') : ''}</div>`).join('')}</div>
    <div class="v-pied"><button class="btn-s" data-salle="inviter">${svg('lien')}Copier le lien</button><button class="btn-s" data-salle="tout-couper">Couper les micros</button></div></aside>`;
  if (v === 'discussion') return `<aside class="volet">${t('Discussion')}<div class="v-corps" id="salle-chat">${s.chat.map((m) => `<div><b>${m.de === 'moi' ? 'Toi' : esc(prenom(m.de))}</b><br>${m.f ? `<span class="chat-f">${svg('doc')}${esc(m.f)}</span>` : esc(m.t)}</div>`).join('') || '<span style="opacity:.6">Aucun message.</span>'}</div>
    <div class="v-pied"><button class="btn-s" data-salle="fichier" aria-label="Envoyer un fichier" title="Envoyer un fichier">${svg('doc')}</button><input id="salle-msg" placeholder="Écrire à tous" aria-label="Écrire à tous"><button class="btn-s ok" data-salle="chat-envoyer" aria-label="Envoyer">${svg('envoyer')}</button></div></aside>`;
  if (v === 'notes') return `<aside class="volet">${t('Notes de la réunion')}<div class="v-corps"><textarea id="salle-notes" placeholder="Décisions, points à retenir, qui fait quoi…" aria-label="Notes de la réunion">${esc(s.notes)}</textarea><small style="opacity:.7">Ces notes partent dans le compte rendu, à la fin.</small></div></aside>`;
  const l = (k, lib, on) => `<div class="l-p"><span>${lib}</span><button class="bascule" role="switch" aria-checked="${!!on}" data-salle="${k}" aria-label="${lib}"></button></div>`;
  return `<aside class="volet">${t('Options')}<div class="v-corps" style="gap:14px">${l('rec', 'Enregistrer la réunion', s.rec)}${l('st', 'Sous-titres en direct', s.st)}${l('flou', 'Flouter mon arrière-plan', s.flou)}${l('verrou', 'Verrouiller la réunion', s.verrou)}</div></aside>`;
}
function peindreSalle() {
  const s = S.salle, z = $('#plein'); if (!s) { z.innerHTML = ''; return; }
  if (s.etape === 'prepa') { z.innerHTML = `<div class="prepa" role="dialog" aria-label="Avant d’entrer"><div class="apercu ${!s.cam ? 'sans' : s.flou ? 'flou' : ''}">${s.cam ? av('moi', 'xl') : '<span>Caméra coupée</span>'}</div>
    <div class="col-p"><div><p>Prêt à entrer ?</p><h2>${esc(s.e.titre)}</h2><p>${s.presents.length ? s.presents.length + ' personne' + (s.presents.length > 1 ? 's sont déjà là' : ' est déjà là') : 'Tu es la première'}</p></div>
      <div><p style="font-size:12px;margin-bottom:5px">${s.micro ? 'Ton micro capte ta voix' : 'Ton micro est coupé'}</p><div class="niveau">${s.micro ? '<i></i>' : ''}</div></div>
      <div class="ligne-p"><button class="btn-s ${s.micro ? 'ok' : 'non'}" data-salle="micro">${svg(s.micro ? 'micro' : 'microoff')}${s.micro ? 'Micro activé' : 'Micro coupé'}</button><button class="btn-s ${s.cam ? 'ok' : 'non'}" data-salle="cam">${svg(s.cam ? 'video' : 'camoff')}${s.cam ? 'Caméra activée' : 'Caméra coupée'}</button><button class="btn-s ${s.flou ? 'ok' : ''}" data-salle="flou">${svg('flou')}Flou</button></div>
      <div class="ligne-p"><button class="btn" data-salle="entrer">Entrer dans la réunion</button><button class="btn-s" data-salle="annuler">Annuler</button></div></div></div>`; return; }
  const t = tuilesHtml(), c = (k, ic, l, on, cls) => `<button class="ctl ${cls || ''}" data-salle="${k}" aria-pressed="${!!on}">${svg(ic)}${l}</button>`;
  z.innerHTML = `<div class="salle" role="dialog" aria-label="Réunion ${esc(s.e.titre)}"><div class="haut"><b class="coupe">${esc(s.e.titre)}</b>${s.rec ? '<span class="rec"><i></i>REC</span>' : ''}${s.verrou ? `<span class="pastille-s">${svg('cadenas').replace('<svg', '<svg style="width:12px;height:12px"')}Verrouillée</span>` : ''}<span class="pastille-s tab" id="salle-duree">${dureeTxt(s.t0)}</span><span class="pousse"></span><span class="pastille-s">${s.presents.length + 1} personne${s.presents.length ? 's' : ''}</span></div>
    ${s.attente.length ? `<div class="attente">${av(s.attente[0], 'p')}<span><b>${esc(P[s.attente[0]].n)}</b> attend dans la salle d’attente</span><button class="btn-s ok" data-salle="admettre" data-p="${s.attente[0]}">Admettre</button><button class="btn-s non" data-salle="refuser" data-p="${s.attente[0]}">Refuser</button></div>` : ''}
    <div class="milieu"><div style="flex:1;min-width:0;min-height:0;display:flex;flex-direction:column"><div class="tuiles" id="tuiles" style="--cols:${t.cols}">${t.html}</div>${s.st ? `<div class="soustitres" id="soustitres">${stHtml()}</div>` : ''}</div>${voletHtml()}</div>
    <div class="bas">${c('micro', s.micro ? 'micro' : 'microoff', 'Micro', false, s.micro ? '' : 'off')}${c('cam', s.cam ? 'video' : 'camoff', 'Caméra', false, s.cam ? '' : 'off')}${c('partage', 'ecran', s.partage ? 'Arrêter' : 'Partager', s.partage)}${c('reagir', 'sourire', 'Réagir')}${c('main', 'main', 'Main', s.main)}
      ${c('volet', 'contacts', 'Participants', s.volet === 'participants').replace('data-salle="volet"', 'data-salle="volet" data-v="participants"')}${c('volet', 'bulle', 'Discussion', s.volet === 'discussion').replace('data-salle="volet"', 'data-salle="volet" data-v="discussion"')}${c('volet', 'note', 'Notes', s.volet === 'notes').replace('data-salle="volet"', 'data-salle="volet" data-v="notes"')}${c('volet', 'points', 'Options', s.volet === 'options').replace('data-salle="volet"', 'data-salle="volet" data-v="options"')}
      <button class="ctl quitter" data-salle="quitter">Quitter</button></div></div>`;
}
/* quitter : le COMPTE RENDU se prépare tout seul (durée, présents, notes prises, fichiers envoyés, dessins du partage) ; on le relit, on choisit à qui il part */
function quitterSalle() {
  const s = S.salle; if (!s) return; clearInterval(_tic); const n = $('#salle-notes'); if (n) s.notes = n.value;
  const cr = S._cr = { titre: s.e.titre, id: s.e.id, duree: dureeTxt(s.t0), presents: s.presents.slice(), notes: s.notes, fichiers: s.fichiers.slice(), dessins: s.an ? s.an.items.filter((i) => i.par === 'moi').length : 0, rec: s.rec, a: 'participants' };
  S.salle = null; $('#plein').innerHTML = ''; rendre();
  ouvrir(`${fTete('Compte rendu', 'Envoyer', 'data-action="cr-envoyer"')}<div class="groupe"><div class="rang"><span class="t"><b>${esc(cr.titre)}</b><span>${cr.duree} · ${cr.presents.length + 1} participant${cr.presents.length ? 's' : ''}${cr.rec ? ' · enregistrée' : ''}</span></span><span class="avs">${cr.presents.slice(0, 4).map((x) => av(x)).join('')}</span></div>
      ${cr.fichiers.map((f) => `<div class="rang ic-g"><span class="ic" style="--c:#e5484d">${svg('doc')}</span><span class="t"><b>${esc(f)}</b><span>Envoyé pendant la réunion</span></span></div>`).join('')}${cr.dessins ? `<div class="rang ic-g"><span class="ic" style="--c:#7d3c98">${svg('stylo')}</span><span class="t"><b>Partage annoté</b><span>${cr.dessins} dessin${cr.dessins > 1 ? 's' : ''} sur le document partagé, joint en image</span></span></div>` : ''}</div>
    <label class="champ"><span>Notes et décisions</span><textarea id="cr-notes" rows="5" placeholder="Ce qui a été décidé, qui fait quoi…">${esc(cr.notes)}</textarea></label>
    <div class="champ"><span>Envoyer à</span><div class="seg" role="group" aria-label="Destinataires" style="display:flex"><button aria-pressed="true" data-cr-a="participants">Les participants</button><button aria-pressed="false" data-cr-a="equipe">Le canal Équipe terrain</button></div></div>`);
}
