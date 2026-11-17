/* ══ LES ÉCRANS — une fonction par rubrique, qui rend { html, deux } (deux colonnes au bureau : la liste, puis le détail) ══ */
const vide = (ic, t) => `<div class="vide"><div><i>${svg(ic)}</i>${t}</div></div>`;
const chev = () => svg('chev').replace('<svg', '<svg class="ch"');
const tuile = (titre, lien, corps) => `<section class="tuile-b"><header><h3>${titre}</h3>${lien || ''}</header>${corps}</section>`;
const evtLigne = (e, plus) => `<button class="evt" data-evt="${e.id}" style="--c:${TYPES_E[e.type][1]}"><span class="h">${e.deb}<span>${e.fin}</span></span><span class="tr"></span><span class="t"><b class="coupe">${esc(e.titre)}</b><span class="coupe">${TYPES_E[e.type][0]}${e.lieu ? ' · ' + esc(e.lieu) : ''}${e.invites ? ' · ' + e.invites.map((i) => prenom(i[0])).join(', ') : ''}</span></span>${plus || ''}</button>`;

/* ═══ ACCUEIL : ma journée à gauche, ce qui attend à droite ═══ */
function prochaine() { const m = minutes(hMaintenant()); return EVTS.filter((e) => !e.passe && (e.j > 0 || (e.j === 0 && minutes(e.fin) > m))).sort((a, b) => a.j - b.j || a.deb.localeCompare(b.deb))[0]; }
function dansCombien(e) { if (e.j !== 0) return jourCourt(e.j) + ' à ' + e.deb; const d = minutes(e.deb) - minutes(hMaintenant()); return d <= 0 ? 'En cours' : d < 60 ? 'Dans ' + d + ' min' : 'Aujourd’hui à ' + e.deb; }
VUES.accueil = () => {
  const h = +hMaintenant().slice(0, 2), p = prochaine(), jour = EVTS.filter((e) => e.j === 0).sort((a, b) => a.deb.localeCompare(b.deb)), act = activite(), eq = Object.values(P).filter((x) => x.eq);
  return { html: `<div class="col seule"><div class="defile"><div class="page">
    <div class="bonjour"><div><h2>${h < 18 ? 'Bonjour' : 'Bonsoir'} ${prenom('moi')}</h2><p>${jourLong(0)} · ${act.length ? act.length + ' chose' + (act.length > 1 ? 's' : '') + ' à traiter' : 'rien n’attend'}${jour.length ? ', ' + jour.length + ' rendez-vous aujourd’hui' : ''}</p></div>
      <div class="gestes"><button class="btn" data-action="nouveau-message">${svg('stylo')}Nouveau message</button><button class="btn gris" data-action="nouvel-appel">${svg('tel')}Appeler</button><button class="btn gris" data-action="reunion-maintenant">${svg('video')}Réunion immédiate</button><button class="btn gris" data-action="programmer">${svg('agenda')}Programmer</button></div></div>
    <div class="acc"><div style="display:flex;flex-direction:column;gap:16px;min-width:0">
      ${tuile('Ma journée', '<a href="#agenda">Ouvrir l’agenda</a>', (p ? `<div class="prochaine"><span class="t"><b class="coupe">${esc(p.titre)}</b><span>${dansCombien(p)}${p.invites ? ' · ' + p.invites.length + ' invité' + (p.invites.length > 1 ? 's' : '') : ''}</span></span>${p.type === 'reunion' ? `<button class="btn" data-rejoindre="${p.id}">${svg('video')}Rejoindre</button>` : `<button class="btn" data-evt="${p.id}">Voir</button>`}</div>` : '')
        + (jour.length ? jour.map((e) => evtLigne(e)).join('') : '<p class="rien">Rien de prévu aujourd’hui.</p>'))}
      ${tuile('Rappels', '<button data-action="rappel-ajouter">Ajouter</button>', RAPPELS.length ? RAPPELS.map((r) => `<div class="rang ${r.fait ? 'fait' : ''}"><button class="coche" role="checkbox" aria-checked="${r.fait}" data-rappel="${r.id}" aria-label="${esc(r.t)}">${svg('coche')}</button><span class="t"><b>${esc(r.t)}</b><span>${jourCourt(r.j)}</span></span></div>`).join('') : '<p class="rien">Aucun rappel.</p>')}
    </div><div style="display:flex;flex-direction:column;gap:16px;min-width:0">
      ${tuile('À traiter', `<a href="#activite">Tout voir${act.length ? ' (' + act.length + ')' : ''}</a>`, act.length ? act.slice(0, 5).map(actHtml).join('') : '<p class="rien">Tout est traité. Belle journée !</p>')}
      ${tuile('Mon équipe', '<a href="#contacts">Contacts</a>', `<div class="presence">${eq.map((x) => `<a href="#contacts/${x.id}" title="${esc(x.n)} · ${esc(x.stt)}">${av(x.id, 'g', true)}<span class="coupe" style="max-width:100%">${esc(prenom(x.id))}</span></a>`).join('')}</div>`)}
    </div></div></div></div></div>` };
};

/* ═══ ACTIVITÉ ═══ */
VUES.activite = () => {
  const tout = activite(), f = [['tout', 'Tout'], ['message', 'Messages'], ['mention', 'Mentions'], ['appel', 'Appels'], ['invitation', 'Invitations']], l = tout.filter((x) => S.filtreAct === 'tout' || x.g === S.filtreAct);
  return { html: `<div class="col seule">${tete('Activité')}<div class="defile"><div class="page" style="max-width:820px">
    <div class="filtres" style="padding:0">${f.map((x) => { const n = x[0] === 'tout' ? tout.length : tout.filter((y) => y.g === x[0]).length; return `<button aria-pressed="${S.filtreAct === x[0]}" data-filtre-act="${x[0]}">${x[1]}${n ? `<b>${n}</b>` : ''}</button>`; }).join('')}</div>
    ${l.length ? `<div class="carte">${l.map(actHtml).join('')}</div>` : `<div class="carte">${vide('coche', tout.length ? 'Rien dans ce filtre.' : 'Tout est traité. Rien ne t’attend.')}</div>`}
    <p class="note" style="padding:0">Ici se rangent les messages non lus, les mentions, les appels manqués, les invitations et les courriels : une seule file à vider.</p></div></div></div>` };
};

/* ═══ MESSAGES : une seule liste, en sections (favoris, canaux, équipe, clients), avec des filtres ═══ */
const ligneConv = (c) => { const d = dernier(c); return `<a class="ligne ${c.nl ? 'nl' : ''}" href="#messages/${c.id}" ${S.id === c.id ? 'aria-current="true"' : ''}>${c.canal ? '<span class="diese" aria-hidden="true">#</span>' : av(c.avec, '', true)}<span class="t"><span class="l1"><b class="coupe">${esc(convNom(c))}</b><time>${d.vide ? '' : quand(d)}</time></span>
  <span class="ap">${d.vide ? '' : d.de === 'moi' ? 'Toi : ' : c.canal ? esc(prenom(d.de)) + ' : ' : ''}${esc(apercu(d))}</span></span>${c.nl ? `<span class="n">${c.nl}</span>` : c.sourdine ? svg('sourdine').replace('<svg', '<svg style="width:15px;height:15px;color:var(--faible)"') : ''}</a>`; };
const ordreConv = (a, b) => { const x = dernier(a), y = dernier(b); return y.j - x.j || y.h.localeCompare(x.h); };
function listeConvHtml() {
  const q = S.rech.trim().toLowerCase(), f = S.filtreConv; let tri = C.slice().sort(ordreConv);
  if (q) { const r = tri.filter((c) => convNom(c).toLowerCase().includes(q) || c.msgs.some((m) => (m.t || '').toLowerCase().includes(q)));
    return r.length ? r.map(ligneConv).join('') : `<p class="note" style="padding:20px;text-align:center">Aucun résultat pour « ${esc(S.rech)} ».</p>`; }
  if (f === 'nonlus') tri = tri.filter((c) => c.nl); else if (f === 'canaux') tri = tri.filter((c) => c.canal); else if (f === 'clients') tri = tri.filter((c) => c.avec && !P[c.avec].eq);
  if (!tri.length) return '<p class="note" style="padding:20px;text-align:center">Rien dans ce filtre.</p>';
  const pro = S.mode === 'pro', sec = [['Favoris', tri.filter((c) => c.epingle)], [pro ? 'Canaux' : 'Groupes', tri.filter((c) => !c.epingle && c.canal)], [pro ? 'Équipe' : 'Proches', tri.filter((c) => !c.epingle && c.avec && P[c.avec].eq)], [pro ? 'Clients et partenaires' : 'Autres', tri.filter((c) => !c.epingle && c.avec && !P[c.avec].eq)]];
  return sec.filter((s) => s[1].length).map((s) => `<p class="section-l">${s[0]}</p>${s[1].map(ligneConv).join('')}`).join('');
}
function bulleHtml(c, m, i) {
  const prec = c.msgs[i - 1], suite = prec && prec.de === m.de && prec.j === m.j && prec.type !== 'sys' && m.type !== 'sys', moi = m.de === 'moi';
  const sep = !prec || prec.j !== m.j ? `<div class="jour">${jourCourt(m.j)}</div>` : '';
  if (m.type === 'sys') return sep + `<div class="sys">${svg(m.ic || 'tel')}${esc(m.t)}</div>`;
  let corps;
  if (m.type === 'vocal') corps = `<div class="bulle piece" data-msg="${m.id}"><span class="vocal"><button data-jouer aria-label="Écouter le message vocal">${svg('jouer')}</button><span class="onde">${[40, 70, 55, 90, 60, 35, 80, 65, 45, 75, 50, 85, 40, 60, 30, 70, 55, 45].map((h, k) => `<i style="--h:${h}%;--k:${k}"></i>`).join('')}</span><time>${m.d}</time></span></div>`;
  else if (m.type === 'photo') corps = `<div class="bulle piece" data-msg="${m.id}"><span class="photo-i" style="--a1:${P[m.de].a[0]};--a2:${P[m.de].a[1]}">${svg('photo')}</span>${m.leg ? `<small>${esc(m.leg)}</small>` : ''}</div>`;
  else if (m.type === 'fichier') corps = `<div class="bulle piece" data-msg="${m.id}"><span class="fichier"><i>${svg('doc')}</i><span><b>${esc(m.nom)}</b><small>${esc(m.taille)}</small></span></span></div>`;
  else if (m.type === 'position') corps = `<div class="bulle piece" data-msg="${m.id}"><span class="photo-i" style="--a1:#7fc8a9;--a2:#2a7a6a">${svg('position')}</span><small>${esc(m.t)}</small></div>`;
  else if (m.type === 'sondage') { const tot = m.opts.reduce((n, o) => n + o[1], 0) || 1; corps = `<div class="bulle piece" data-msg="${m.id}"><span class="sondage"><b>${esc(m.q)}</b>${m.opts.map((o, k) => `<button data-vote="${m.id}" data-k="${k}" aria-pressed="${m.v === k}"><i style="--w:${Math.round(o[1] / tot * 100)}%"></i><span>${esc(o[0])}</span><span>${o[1]}</span></button>`).join('')}<small>${tot} vote${tot > 1 ? 's' : ''}${m.v != null ? ' · tu as voté' : ''}</small></span></div>`; }
  else corps = `<div class="bulle" data-msg="${m.id}">${m.rep ? `<span class="cite">${esc(m.rep)}</span>` : ''}${esc(m.t)}</div>`;
  return `${sep}<div class="msg ${suite ? 'suite' : ''}">${av(m.de)}<div class="ent"><b>${moi ? 'Toi' : esc(P[m.de].n)}</b><time>${m.h}</time></div><div class="corps">${corps}
    ${m.reac && m.reac.length ? `<span class="reacs">${m.reac.map((r) => `<span>${r}</span>`).join('')}</span>` : ''}${moi && i === c.msgs.length - 1 ? `<span class="lu">${m.lu ? 'Lu ' + m.lu : 'Distribué'}</span>` : ''}</div>
    <div class="outils" data-pour="${m.id}"><button data-outil="pouce" aria-label="Réagir 👍" title="Réagir">👍</button><button data-outil="repondre" aria-label="Répondre" title="Répondre">${svg('repondre')}</button><button data-outil="plus" aria-label="Plus d’actions" title="Plus d’actions">${svg('points')}</button></div></div>`;
}
function convHtml(c) {
  const p = c.avec && P[c.avec], autres = nonLus() - (c.nl || 0);
  return `<div class="col detail conv"><div class="barre"><a class="retour" href="#messages" aria-label="Retour aux conversations">${svg('retour')}${autres ? `<em>${autres}</em>` : ''}</a>
      <button class="qui" data-action="infos-conv">${c.canal ? '<span class="ligne" style="padding:0;margin:0;width:auto"><span class="diese" aria-hidden="true">#</span></span>' : av(c.avec, '', true)}<span><b><span class="coupe">${esc(convNom(c))}</span>${svg('chev')}</b><small class="coupe">${c.canal ? c.membres.length + 1 + ' membres' : esc(p.stt || p.r)}</small></span></button>
      <span class="pousse"></span><button class="rond" data-appeler="${c.id}" aria-label="Appel audio" title="Appel audio">${svg('tel')}</button><button class="rond" data-appeler="${c.id}" data-video="1" aria-label="Appel vidéo" title="Appel vidéo">${svg('video')}</button></div>
    <div class="fil" id="fil">${c.msgs.length ? c.msgs.map((m, i) => bulleHtml(c, m, i)).join('') : vide('bulle', 'Écris le premier message de cette conversation.')}${c.ecrit ? `<div class="ecrit" aria-label="${esc(prenom(c.avec))} écrit"><i></i><i></i><i></i>${esc(prenom(c.avec))} écrit…</div>` : ''}</div>
    <div class="compo"><div class="zone">${S.rep ? `<div class="rep"><span class="coupe">Réponse à « ${esc(S.rep)} »</span><button data-action="rep-annuler" aria-label="Annuler la réponse">${svg('x')}</button></div>` : ''}<textarea id="saisie" rows="1" placeholder="Écrire à ${esc(c.canal ? '#' + c.n : prenom(c.avec))}" aria-label="Message"></textarea>
      <div class="bas-c"><button class="rond" data-action="joindre" aria-label="Joindre : photo, document, position, sondage" title="Joindre">${svg('plus')}</button><button class="rond" data-joint="photo" aria-label="Prendre une photo" title="Photo">${svg('appareil')}</button><span class="pousse"></span>
        <button class="rond" id="btn-envoi" data-action="vocal" aria-label="Enregistrer un message vocal">${svg('micro')}</button></div></div></div></div>`;
}
VUES.messages = () => {
  const c = conv(S.id); if (c && c.nl) c.nl = 0;
  const f = S.mode === 'pro' ? [['tout', 'Tout'], ['nonlus', 'Non lus'], ['canaux', 'Canaux'], ['clients', 'Clients']] : [['tout', 'Tout'], ['nonlus', 'Non lus'], ['canaux', 'Groupes']];
  const liste = `<div class="col liste">${tete('Messages', `<button class="rond" data-action="nouveau-message" aria-label="Nouvelle conversation" title="Nouvelle conversation">${svg('stylo')}</button>`)}
    <label class="cherche">${svg('cherche')}<input id="rech" placeholder="Filtrer les conversations" value="${esc(S.rech)}" aria-label="Filtrer les conversations" autocomplete="off"></label>
    <div class="filtres">${f.map((x) => `<button aria-pressed="${S.filtreConv === x[0]}" data-filtre-conv="${x[0]}">${x[1]}</button>`).join('')}</div><div class="defile" id="liste-conv">${listeConvHtml()}</div></div>`;
  return { deux: true, html: liste + (c ? convHtml(c) : `<div class="col detail">${vide('bulle', 'Choisis une conversation pour la lire et y répondre.')}</div>`), apres: () => { const z = $('#fil'); if (z) z.scrollTop = z.scrollHeight; } };
};

/* ═══ CONTACTS ═══ */
const ficheTete = (p, sous) => `<div class="tete">${av(p.id, 'xl', true)}<div><h2>${esc(p.n)}</h2><p class="gris">${esc(sous)}</p>${p.stt ? `<span class="statut ${p.st === 'ok' ? '' : p.st}"><i></i>${esc(p.stt)}</span>` : ''}</div></div>`;
VUES.contacts = () => {
  const q = S.rech.trim().toLowerCase(), gens = Object.values(P).filter((p) => p.id !== 'moi' && (!q || (p.n + ' ' + p.r).toLowerCase().includes(q))).sort((a, b) => a.n.localeCompare(b.n));
  const ligne = (p) => `<a class="ligne" href="#contacts/${p.id}" ${S.id === p.id ? 'aria-current="true"' : ''}>${av(p.id, '', true)}<span class="t"><span class="l1"><b class="coupe">${esc(p.n)}</b></span><span class="ap">${esc(p.r)}</span></span></a>`;
  const grp = [[S.mode === 'pro' ? 'Mon équipe' : 'Proches', gens.filter((p) => p.eq)], [S.mode === 'pro' ? 'Clients et partenaires' : 'Autres contacts', gens.filter((p) => !p.eq)]].filter((g) => g[1].length);
  const liste = `<div class="col liste">${tete('Contacts', `<button class="rond" data-action="contact-ajouter" aria-label="Ajouter un contact" title="Ajouter un contact">${svg('ajout')}</button>`)}
    <label class="cherche">${svg('cherche')}<input id="rech" placeholder="Filtrer les contacts" value="${esc(S.rech)}" aria-label="Filtrer les contacts" autocomplete="off"></label>
    <div class="defile">${grp.map((g) => `<p class="section-l">${g[0]}</p>${g[1].map(ligne).join('')}`).join('') || `<p class="note" style="padding:20px;text-align:center">Aucun contact pour « ${esc(S.rech)} ».</p>`}</div></div>`;
  const p = P[S.id]; let d = `<div class="col detail">${vide('contacts', 'Choisis un contact pour voir sa fiche.')}</div>`;
  if (p && p.id !== 'moi') { const hist = APPELS.filter((a) => a.qui === p.id).slice(0, 3), c = C.find((x) => x.avec === p.id);
    d = `<div class="col detail"><div class="barre"><a class="retour" href="#contacts" aria-label="Retour aux contacts">${svg('retour')}Contacts</a><h1>Fiche</h1></div><div class="defile"><div class="fiche">
      ${ficheTete(p, p.eq ? p.r : (p.soc ? p.soc + ' · ' : '') + p.r)}
      <div class="actions-f"><button data-ecrire="${p.id}">${svg('bulle')}Message</button><button data-appeler="${p.id}">${svg('tel')}Appel</button><button data-appeler="${p.id}" data-video="1">${svg('video')}Vidéo</button><button data-action="ecrire-mail">${svg('mail')}E-mail</button></div>
      <div class="groupe"><div class="rang ic-g"><span class="ic">${svg('tel')}</span><span class="t"><span>Téléphone</span><b>${esc(p.tel)}</b></span></div><div class="rang ic-g"><span class="ic">${svg('mail')}</span><span class="t"><span>E-mail</span><b class="coupe">${esc(p.mel)}</b></span></div><div class="rang ic-g"><span class="ic">${svg('personne')}</span><span class="t"><span>${p.eq ? 'Fonction' : 'Entreprise'}</span><b>${esc(p.r)}</b></span></div></div>
      ${c && c.msgs.length ? `<div><h3 class="titre-s">Dernier message</h3><a class="groupe" href="#messages/${c.id}" style="display:block"><span class="rang"><span class="t"><b class="coupe">${esc(apercu(dernier(c)))}</b><span>${quand(dernier(c))}</span></span>${chev()}</span></a></div>` : ''}
      ${hist.length ? `<div><h3 class="titre-s">Appels récents</h3><div class="groupe">${hist.map((a) => `<div class="rang"><span class="t"><b ${a.sens === 'manque' ? 'style="color:var(--rouge)"' : ''}>${a.sens === 'manque' ? 'Appel manqué' : (a.sens === 'entrant' ? 'Appel reçu' : 'Appel émis') + (a.video ? ' · vidéo' : '')}</b><span>${jourCourt(a.j)} à ${a.h}${a.duree ? ' · ' + a.duree : ''}</span></span></div>`).join('')}</div></div>` : ''}
    </div></div></div>`; }
  return { deux: true, html: liste + d };
};

/* ═══ APPELS ═══ */
VUES.appels = () => {
  const l = APPELS.filter((a) => S.filtreAppels === 'tous' || a.sens === 'manque');
  const ligne = (a) => `<a class="ligne ${a.sens === 'manque' ? 'manque' : ''}" href="#appels/${a.id}" ${S.id === a.id ? 'aria-current="true"' : ''}>${av(a.qui)}<span class="t"><span class="l1"><b class="coupe">${esc(P[a.qui].n)}</b><time>${a.j === 0 ? a.h : jourCourt(a.j)}</time></span>
    <span class="ap">${svg(a.video ? 'video' : a.sens === 'sortant' ? 'sortant' : 'entrant').replace('<svg', '<svg class="sens"')}${a.sens === 'manque' ? 'Manqué' : a.sens === 'entrant' ? 'Reçu' : 'Émis'}${a.video ? ' · vidéo' : ''}${a.duree ? ' · ' + a.duree : ''}</span></span></a>`;
  const liste = `<div class="col liste">${tete('Appels', `<button class="rond" data-action="nouvel-appel" aria-label="Nouvel appel" title="Nouvel appel">${svg('plus')}</button>`)}
    <div class="filtres">${[['tous', 'Tous'], ['manques', 'Manqués']].map((f) => `<button aria-pressed="${S.filtreAppels === f[0]}" data-filtre-appels="${f[0]}">${f[1]}</button>`).join('')}</div>
    <div class="defile">${l.length ? l.map(ligne).join('') : '<p class="note" style="padding:20px;text-align:center">Aucun appel manqué.</p>'}
      <p class="note" style="text-align:center;padding:16px"><button class="lien" data-action="appel-entrant" style="font-size:inherit">Simuler un appel entrant</button></p></div></div>`;
  const a = APPELS.find((x) => x.id === S.id); let d = `<div class="col detail">${vide('tel', 'Choisis un appel, ou lance un nouvel appel audio ou vidéo.')}</div>`;
  if (a) { const p = P[a.qui], tous = APPELS.filter((x) => x.qui === a.qui); a.vu = true;
    d = `<div class="col detail"><div class="barre"><a class="retour" href="#appels" aria-label="Retour aux appels">${svg('retour')}Appels</a><h1>Appel</h1></div><div class="defile"><div class="fiche">
      ${ficheTete(p, p.r)}
      <div class="actions-f"><button data-appeler="${p.id}">${svg('tel')}Rappeler</button><button data-appeler="${p.id}" data-video="1">${svg('video')}Vidéo</button><button data-ecrire="${p.id}">${svg('bulle')}Message</button><button data-go="contacts/${p.id}">${svg('personne')}Fiche</button></div>
      <div><h3 class="titre-s">Historique</h3><div class="groupe">${tous.map((x) => `<div class="rang ic-g"><span class="ic" style="--c:${x.sens === 'manque' ? '#e5484d' : '#16a34a'}">${svg(x.video ? 'video' : 'tel')}</span><span class="t"><b ${x.sens === 'manque' ? 'style="color:var(--rouge)"' : ''}>${x.sens === 'manque' ? 'Appel manqué' : (x.sens === 'entrant' ? 'Appel reçu' : 'Appel émis') + (x.video ? ' · vidéo' : '')}</b><span>${jourCourt(x.j)} à ${x.h}</span></span><span class="v">${x.duree || ''}</span></div>`).join('')}</div></div>
    </div></div></div>`; }
  return { deux: true, html: liste + d };
};

/* ═══ RÉUNIONS ═══ */
const invitesAv = (e) => `<span class="avs">${(e.invites || []).slice(0, 4).map((i) => av(i[0])).join('')}</span>`;
const dateTuile = (j) => { const d = jourDe(j); return `<span class="date-t"><small>${fmt(d, { month: 'short' }).replace('.', '')}</small><b>${d.getDate()}</b></span>`; };
function ficheEvt(e) {
  const t = TYPES_E[e.type], st = { oui: ['Accepté', 'v'], attente: ['En attente', 'o'], non: ['Refusé', 'r'] }, rap = { 5: '5 minutes avant', 15: '15 minutes avant', 60: '1 heure avant', 1440: 'La veille' };
  return `<div style="display:flex;flex-direction:column;gap:6px;align-items:flex-start"><span class="pastille" style="color:${t[1]};background:color-mix(in srgb,${t[1]} 14%,transparent)">${t[0]}</span><h2>${esc(e.titre)}</h2><p class="gris">${jourLong(e.j)} · ${e.deb} – ${e.fin}${e.repete ? ' · ' + e.repete : ''}</p></div>
    ${e.invitation ? `<div class="carte pad" style="display:flex;gap:10px;align-items:center;flex-wrap:wrap"><span style="flex:1;min-width:160px"><b>${esc(P[e.invitation].n)}</b> t’invite à cette réunion.</span><button class="btn" data-inv="${e.id}" data-rep="oui">Accepter</button><button class="btn gris" data-inv="${e.id}" data-rep="non">Refuser</button></div>` : ''}
    <div style="display:flex;gap:8px;flex-wrap:wrap">${e.type === 'reunion' && !e.passe ? `<button class="btn" data-rejoindre="${e.id}">${svg('video')}Rejoindre</button><button class="btn gris" data-action="lien-reunion" data-id="${e.id}">${svg('lien')}Copier le lien</button>` : ''}${e.cr ? `<button class="btn" data-action="compte-rendu" data-id="${e.id}">${svg('doc')}Compte rendu</button>` : ''}${!e.passe ? `<button class="btn gris" data-action="evt-modifier" data-id="${e.id}">Modifier</button>` : ''}</div>
    ${e.lieu ? `<div class="groupe"><div class="rang ic-g"><span class="ic" style="--c:#16a34a">${svg('position')}</span><span class="t"><span>Lieu</span><b>${esc(e.lieu)}</b></span></div></div>` : ''}
    ${e.invites && e.invites.length ? `<div><h3 class="titre-s">Invités</h3><div class="groupe">${e.invites.map((i) => `<div class="rang av-g">${av(i[0])}<span class="t"><b>${esc(P[i[0]].n)}</b><span>${esc(P[i[0]].r)}</span></span><span class="pastille ${st[i[1]][1]}">${st[i[1]][0]}</span></div>`).join('')}</div></div>` : ''}
    ${e.odj ? `<div><h3 class="titre-s">Ordre du jour</h3><div class="groupe">${e.odj.map((o, k) => `<div class="rang"><span class="v tab">${k + 1}</span><span class="t"><b>${esc(o)}</b></span></div>`).join('')}</div></div>` : ''}
    ${!e.passe ? `<div class="groupe"><div class="rang"><span class="t"><b>Rappel</b></span><span class="v">${rap[e.rappel] || 'Aucun'}</span></div></div>${e.invites && e.invites.length ? '<p class="note" style="padding:0">Les invités sont prévenus dès que tu décales ou annules.</p>' : ''}<button class="btn gris large" style="color:var(--rouge)" data-action="evt-supprimer" data-id="${e.id}">${e.invites && e.invites.length ? 'Annuler la réunion' : 'Supprimer'}</button>` : ''}`;
}
VUES.reunions = () => {
  const r = EVTS.filter((e) => e.type === 'reunion').sort((a, b) => a.j - b.j || a.deb.localeCompare(b.deb)), av2 = r.filter((e) => !e.passe), pa = r.filter((e) => e.passe);
  const ligne = (e) => `<a class="ligne" href="#reunions/${e.id}" ${S.id === e.id ? 'aria-current="true"' : ''}>${dateTuile(e.j)}<span class="t"><span class="l1"><b class="coupe">${esc(e.titre)}</b></span><span class="ap">${jourCourt(e.j)} · ${e.deb} – ${e.fin}</span></span>${e.invitation ? '<span class="pastille o">Invitation</span>' : invitesAv(e)}</a>`;
  const liste = `<div class="col liste">${tete('Réunions', `<button class="rond" data-action="programmer" data-type="reunion" aria-label="Programmer une réunion" title="Programmer une réunion">${svg('plus')}</button>`)}
    <div style="display:flex;gap:8px;padding:0 14px 10px;flex:none;flex-wrap:wrap"><button class="btn" style="flex:1 1 140px" data-action="reunion-maintenant">${svg('video')}Nouvelle réunion</button><button class="btn gris" style="flex:1 1 140px" data-action="rejoindre-code">Rejoindre avec un code</button></div>
    <div class="defile"><p class="section-l">À venir</p>${av2.map(ligne).join('') || '<p class="note" style="padding:14px">Aucune réunion à venir.</p>'}${pa.length ? `<p class="section-l">Passées</p>${pa.map(ligne).join('')}` : ''}</div></div>`;
  const e = evt(S.id);
  return { deux: true, html: liste + (e ? `<div class="col detail"><div class="barre"><a class="retour" href="#reunions" aria-label="Retour aux réunions">${svg('retour')}Réunions</a><h1>Réunion</h1></div><div class="defile"><div class="fiche">${ficheEvt(e)}</div></div></div>` : `<div class="col detail">${vide('video', 'Choisis une réunion, ou lance-en une tout de suite.')}</div>`) };
};

/* ═══ AGENDA : la semaine en GRILLE HORAIRE (5 h – 20 h) au bureau, en bandeau + liste du jour au téléphone ; le mois en cases ═══ */
const G0 = 5, GH = 15;                                           // première heure affichée, nombre d'heures
VUES.agenda = () => {
  const l0 = lundi(S.agSem), jours = [0, 1, 2, 3, 4, 5, 6].map((k) => l0 + k), du = (j) => EVTS.filter((e) => e.j === j).sort((a, b) => a.deb.localeCompare(b.deb));
  const pos = (h) => Math.min(GH, Math.max(0, (minutes(h) - G0 * 60) / 60));
  let corps;
  if (S.agVue === 'semaine') corps = `<div class="grille" style="--hh:44px"><div class="g-jours"><span></span>${jours.map((j) => { const d = jourDe(j), n = du(j).length; return `<button class="jour-c ${j === 0 ? 'auj' : ''}" aria-pressed="${S.agJour === j}" data-ag-jour="${j}" aria-label="${jourLong(j)}, ${n} événement${n > 1 ? 's' : ''}">${fmt(d, { weekday: 'short' }).replace('.', '')}<b>${d.getDate()}</b><i class="pt-j ${n ? '' : 'sans'}"></i></button>`; }).join('')}</div>
      <div class="g-corps"><div class="g-h">${Array.from({ length: GH - 1 }, (_, k) => `<span style="top:calc(var(--hh) * ${k + 1})">${G0 + k + 1}:00</span>`).join('')}</div>
      ${jours.map((j) => `<div class="g-col ${j === 0 ? 'auj' : ''}">${du(j).map((e) => `<button class="bloc-g" data-evt="${e.id}" style="--c:${TYPES_E[e.type][1]};top:calc(var(--hh) * ${pos(e.deb)} + 1px);height:calc(var(--hh) * ${Math.max(0.5, pos(e.fin) - pos(e.deb))} - 2px)"><b>${esc(e.titre)}</b><span>${e.deb} – ${e.fin}</span></button>`).join('')}${j === 0 ? `<i class="g-now" style="top:calc(var(--hh) * ${pos(hMaintenant())})"></i>` : ''}</div>`).join('')}</div></div>`;
  else { const ref = jourDe(l0 + 3), a = ref.getFullYear(), m = ref.getMonth(), premier = new Date(a, m, 1), dec = (premier.getDay() + 6) % 7, base = Math.round((premier - auj()) / 864e5) - dec;
    corps = `<div class="mois">${['lun', 'mar', 'mer', 'jeu', 'ven', 'sam', 'dim'].map((x) => `<span class="e">${x}</span>`).join('')}${Array.from({ length: 42 }, (_, k) => { const j = base + k, d = jourDe(j), ev = du(j);
      return `<button class="${d.getMonth() !== m ? 'hors' : ''} ${j === 0 ? 'auj' : ''}" aria-pressed="${S.agJour === j}" data-ag-jour="${j}" aria-label="${jourLong(j)}"><b>${d.getDate()}</b><span class="blocs">${ev.slice(0, 2).map((e) => `<span class="bloc" style="--c:${TYPES_E[e.type][1]}"><b>${esc(e.titre)}</b></span>`).join('')}</span><span class="pts">${ev.slice(0, 3).map((e) => `<i style="--c:${TYPES_E[e.type][1]}"></i>`).join('')}</span></button>`; }).join('')}</div>`; }
  const sel = du(S.agJour);
  return { html: `<div class="col seule">${tete('Agenda', `<button class="btn" data-action="programmer">${svg('plus')}Ajouter</button>`)}<div class="defile"><div class="page">
    <div class="ag-tete"><button class="rond gris" data-ag-sem="-1" aria-label="${S.agVue === 'semaine' ? 'Semaine précédente' : 'Mois précédent'}">${svg('retour')}</button><button class="rond gris" data-ag-sem="1" aria-label="${S.agVue === 'semaine' ? 'Semaine suivante' : 'Mois suivant'}">${svg('chev')}</button>
      <b>${S.agVue === 'semaine' ? jourDe(jours[0]).getDate() + ' – ' + fmt(jourDe(jours[6]), { day: 'numeric', month: 'long' }) : maj1(fmt(jourDe(l0 + 3), { month: 'long', year: 'numeric' }))}</b>${S.agSem !== 0 || S.agJour !== 0 ? '<button class="btn gris" data-ag-auj>Aujourd’hui</button>' : ''}<span class="pousse"></span>
      <div class="seg" role="group" aria-label="Affichage">${[['semaine', 'Semaine'], ['mois', 'Mois']].map((v) => `<button aria-pressed="${S.agVue === v[0]}" data-ag-vue="${v[0]}">${v[1]}</button>`).join('')}</div></div>
    ${corps}
    <div class="jour-liste" ${S.agVue === 'mois' ? 'style="display:block"' : ''}><h3 class="titre-s">${jourLong(S.agJour)}</h3><div class="groupe">${sel.length ? sel.map((e) => evtLigne(e, e.type === 'reunion' && !e.passe && e.j === 0 ? '<span class="pastille b" style="align-self:center">Rejoindre</span>' : '')).join('') : '<p style="padding:16px;color:var(--second)">Rien de prévu ce jour-là.</p>'}</div></div>
  </div></div></div>` };
};

/* ═══ COURRIER : la VRAIE boîte mail d'OP MESSAGES Pro (le module opcourrier.js), montée telle quelle avec des courriels d'exemple.
   Justin, 13 novembre 2026 : « la boîte mail, je veux celle qui était ». Rien n'y est redessiné. ⛔ Sa zone reste toujours dans la page (on la
   masque) : le module se démonte de lui-même dès que son conteneur quitte le document. ═══ */
VUES.courrier = () => ({ html: '<div class="col seule"></div>' });
function placerCourrier() {
  const f = $('#courrier-fixe'), vu = S.vue === 'courrier', z = $('#zone-courrier');
  f.classList.toggle('masquee', !vu); f.setAttribute('aria-hidden', String(!vu));
  if (!window.OPCourrier || !window.OPCourrierDemo) { z.innerHTML = vide('mail', 'La boîte mail n’a pas pu se charger dans ce prototype.'); return; }
  if (COUR.inst) { if (vu) COUR.inst.rafraichir({ donnees: false }); return; }
  if (COUR.montage) return;                 // ⛔ le module annonce son compte PENDANT son montage : sans cette garde, le rendu qu'il déclenche le remontait sans fin
  COUR.montage = true;
  try { const source = OPCourrierDemo.creer({ mode: 'demo' }), toutes = source.boites.bind(source);
    source.boites = () => Promise.resolve(toutes()).then((l) => l.filter((b) => b.cote === 'pro'));      // la source d'exemple a une boîte perso : le côté Pro ne la montre pas
    COUR.inst = OPCourrier.monter(z, { source, cotes: ['pro'], cote: 'pro', cleStockage: 'protoOpmsg3_courrier', titre: 'OP Courrier', intervalle: 0, theme: themeHote,
      onCompter: (n) => { if (COUR.nl === n) return; COUR.nl = n; setTimeout(() => { majMenu(); if ((S.vue === 'accueil' || S.vue === 'activite') && !$('#calque').innerHTML) rendre(); }, 0); } });
  } catch (e) { z.innerHTML = vide('mail', 'La boîte mail n’a pas pu s’ouvrir dans ce prototype.'); }
}

/* ═══ PROFIL ═══ */
const heuresTexte = () => hTexte(S.hp.debut) + ' – ' + hTexte(S.hp.fin) + (S.hp.jours.join('') === '12345' ? ', du lundi au vendredi' : ' (' + S.hp.jours.map((j) => JOURS_HP[j - 1][1].slice(0, 3).toLowerCase()).join(', ') + ')');
VUES.profil = () => {
  const b = (k, t, d) => `<div class="rang"><span class="t"><b>${t}</b>${d ? `<span>${d}</span>` : ''}</span><button class="bascule" role="switch" aria-checked="${S.regl[k]}" data-regl="${k}" aria-label="${t}"></button></div>`;
  const l = (ic, c, t, v, attr) => `<button class="rang ic-g" ${attr}><span class="ic" style="--c:${c}">${svg(ic)}</span><span class="t"><b>${t}</b></span>${v ? `<span class="v">${v}</span>` : ''}${chev()}</button>`;
  return { html: `<div class="col seule">${tete('Profil et réglages')}<div class="defile"><div class="page profil">
    <div class="groupe"><button class="moi-c" data-action="profil-modifier">${av('moi', 'g')}<span><b>${esc(P.moi.n)}</b><span class="gris">${S.mode === 'pro' ? esc(P.moi.r) + ' · Clim Services 17' : 'Compte personnel · gratuit'}</span></span>${chev()}</button>
      <button class="rang" data-action="statut"><span class="t"><b>Statut</b></span><span class="statut ${STATUTS[S.statut][1]}"><i></i>${STATUTS[S.statut][0]}</span>${chev()}</button></div>
    <div class="groupe">${S.mode === 'pro' ? l('contacts', '#2a4a9c', 'Mon espace', 'Clim Services 17', 'data-action="espace"') : ''}${l('etoile', '#d97706', 'Abonnement', S.mode === 'pro' ? 'Pro' : 'Gratuit', 'data-action="abonnement"')}</div>
    <div><h3 class="titre-s">Perso et Pro</h3><div class="groupe"><div class="rang"><span class="t"><b>Côté affiché</b><span>Chaque côté a ses conversations, ses appels, ses contacts et son agenda. Ils ne se mélangent pas.</span></span></div><div style="padding:0 14px 12px">${coteSeg('clair')}</div>
      <div class="rang"><span class="t"><b>Heures de travail (Pro)</b><span>${S.hp.on ? 'En dehors de ' + heuresTexte() + ', les messages et les mentions Pro ne font pas sonner tes appareils : un seul résumé arrive à la reprise. Les appels sonnent toujours, le Perso n’est jamais coupé.' : 'Coupé : le Pro sonne à toute heure.'}</span></span><button class="bascule" role="switch" aria-checked="${S.hp.on}" data-hp="on" aria-label="Heures de travail (Pro)"></button></div>
      ${S.hp.on ? `<div class="hp-ed"><div class="hp-jours" role="group" aria-label="Jours de travail">${JOURS_HP.map((j, i) => `<button data-hp-jour="${i + 1}" aria-pressed="${S.hp.jours.includes(i + 1)}" aria-label="${j[1]}">${j[0]}</button>`).join('')}</div><div style="display:flex;gap:10px"><label class="champ"><span>Début</span><input type="time" id="hp-debut" step="300" value="${S.hp.debut}"></label><label class="champ"><span>Fin</span><input type="time" id="hp-fin" step="300" value="${S.hp.fin}"></label></div></div>
      <div class="rang"><span class="t"><b>Passer en Pro pendant mes heures</b><span>${S.auto ? 'Au début de tes heures, toute l’application passe en Pro ; à la fin, en Perso. Basculer à la main l’emporte jusqu’à la borne suivante.' : 'Coupé : tu changes de côté toi-même.'}</span></span><button class="bascule" role="switch" aria-checked="${S.auto}" data-hp="auto" aria-label="Passer en Pro pendant mes heures"></button></div>
      <div class="rang" style="flex-wrap:wrap"><span class="t" style="min-width:180px"><b>Il est ${hTexte(hMaintenant())}</b><span>${dansHeures() ? 'Tu es dans tes heures de travail.' : 'Tu es hors de tes heures de travail.'} Pour essayer la bascule dans ce prototype :</span></span><button class="btn gris" data-hp-essai="${dansHeures() ? 'fin' : 'debut'}">${dansHeures() ? 'Aller à la fin de mes heures' : 'Aller au début de mes heures'}</button></div>` : ''}</div></div>
    <div><h3 class="titre-s">Notifications</h3><div class="groupe">${b('notif', 'Autoriser les notifications')}${b('apercuNotif', 'Afficher l’aperçu', 'Le début du message dans la notification.')}${b('pauseReunion', 'Silence en réunion', 'Les notifications attendent la fin de la réunion.')}</div></div>
    <div><h3 class="titre-s">Confidentialité</h3><div class="groupe">${b('lecture', 'Confirmations de lecture', 'Les autres voient « Lu » ; tu vois le leur.')}${b('enligne', 'Montrer que je suis en ligne')}</div></div>
    <div><h3 class="titre-s">Apparence</h3><div class="groupe"><div class="rang"><span class="t"><b>Thème</b><span>Dans la vraie application, il suit l’appareil.</span></span><div class="seg" role="group" aria-label="Thème">${[['auto', 'Auto'], ['light', 'Jour'], ['dark', 'Nuit']].map((m) => `<button aria-pressed="${S.theme === m[0]}" data-theme-choix="${m[0]}">${m[1]}</button>`).join('')}</div></div></div></div>
    <div class="groupe">${l('info', '#5a6377', 'À propos', 'Prototype', 'data-action="a-propos"')}</div>
    <button class="btn gris large" style="color:var(--rouge)" data-action="deconnexion">Se déconnecter</button>
  </div></div></div>` };
};
