/* ══ LES ÉCRANS — une fonction par rubrique, qui rend { html, deux } (deux colonnes au bureau : la liste, puis le détail) ══ */
const vide = (ic, t) => `<div class="vide"><div><i>${svg(ic)}</i>${t}</div></div>`;
const chev = () => svg('chev').replace('<svg', '<svg class="ch"');

/* ═══ TABLEAU DE BORD ═══ */
function prochaine() { const m = minutes(hMaintenant()); return EVTS.filter((e) => !e.passe && (e.j > 0 || (e.j === 0 && minutes(e.fin) > m))).sort((a, b) => a.j - b.j || a.deb.localeCompare(b.deb))[0]; }
function dansCombien(e) { if (e.j !== 0) return jourCourt(e.j) + ' à ' + e.deb; const d = minutes(e.deb) - minutes(hMaintenant()); return d <= 0 ? 'En cours' : d < 60 ? 'Dans ' + d + ' min' : 'Aujourd’hui à ' + e.deb; }
VUES.accueil = () => {
  const h = +hMaintenant().slice(0, 2), p = prochaine(), jour = EVTS.filter((e) => e.j === 0).sort((a, b) => a.deb.localeCompare(b.deb));
  const nl = C.filter((c) => c.nl).slice(0, 4), mq = APPELS.filter((a) => a.sens === 'manque').slice(0, 3), eq = Object.values(P).filter((x) => x.eq);
  const tuile = (titre, lien, corps) => `<section class="tuile-b"><header><h3>${titre}</h3>${lien || ''}</header>${corps}</section>`;
  return { html: `<div class="col seule">${tete('Tableau de bord')}<div class="defile"><div class="page">
    <div class="bonjour"><h2>${h < 18 ? 'Bonjour' : 'Bonsoir'} ${prenom('moi')}</h2><p>${jourLong(0)}</p></div>
    <div class="gestes"><button data-action="nouveau-message"><i>${svg('stylo')}</i>Nouveau message</button><button data-action="nouvel-appel"><i style="--c:#30b450">${svg('tel')}</i>Appeler</button>
      <button data-action="reunion-maintenant"><i style="--c:#e8590c">${svg('video')}</i>Réunion immédiate</button><button data-action="programmer"><i style="--c:#7d3c98">${svg('agenda')}</i>Programmer</button></div>
    <div class="tuiles-b">
      ${tuile('Aujourd’hui', '<a href="#agenda">Agenda</a>', (p ? `<div class="prochaine"><span class="t"><b class="coupe">${esc(p.titre)}</b><span>${dansCombien(p)}${p.invites ? ' · ' + p.invites.length + ' invité' + (p.invites.length > 1 ? 's' : '') : ''}</span></span>${p.type === 'reunion' ? `<button class="btn" data-rejoindre="${p.id}">Rejoindre</button>` : `<button class="btn gris" data-evt="${p.id}">Voir</button>`}</div>` : '')
        + (jour.length ? jour.map((e) => `<button class="evt" data-evt="${e.id}" style="--c:${TYPES_E[e.type][1]}"><span class="h">${e.deb}<span>${e.fin}</span></span><span class="tr"></span><span class="t"><b class="coupe">${esc(e.titre)}</b><span>${TYPES_E[e.type][0]}${e.lieu ? ' · ' + esc(e.lieu) : ''}</span></span></button>`).join('') : '<p class="rien">Rien de prévu aujourd’hui.</p>'))}
      ${tuile('Messages non lus', '<a href="#messages">Tout voir</a>', nl.length ? nl.map((c) => `<a class="rang av-g" href="#messages/${c.id}">${convAv(c)}<span class="t"><b class="coupe">${esc(convNom(c))}</b><span class="coupe">${esc(apercu(dernier(c)))}</span></span><span class="pastille b">${c.nl}</span></a>`).join('') : '<p class="rien">Tout est lu.</p>')}
      ${tuile('Appels manqués', '<a href="#appels">Historique</a>', mq.length ? mq.map((a) => `<div class="rang av-g">${av(a.qui)}<span class="t"><b class="coupe" style="color:var(--rouge-txt)">${esc(P[a.qui].n)}</b><span>${jourCourt(a.j)} à ${a.h}</span></span><button class="btn gris" data-appeler="${a.qui}">${svg('tel')}Rappeler</button></div>`).join('') : '<p class="rien">Aucun appel manqué.</p>')}
      ${tuile('Rappels', '<button data-action="rappel-ajouter">Ajouter</button>', RAPPELS.length ? RAPPELS.map((r) => `<div class="rang ${r.fait ? 'fait' : ''}"><button class="coche" role="checkbox" aria-checked="${r.fait}" data-rappel="${r.id}" aria-label="${esc(r.t)}">${svg('coche')}</button><span class="t"><b>${esc(r.t)}</b><span>${jourCourt(r.j)}</span></span></div>`).join('') : '<p class="rien">Aucun rappel.</p>')}
      ${tuile('Mon équipe', '<a href="#contacts">Contacts</a>', eq.map((x) => `<a class="rang av-g" href="#contacts/${x.id}">${av(x.id, '', true)}<span class="t"><b class="coupe">${esc(x.n)}</b><span class="coupe">${esc(x.stt)}</span></span>${chev()}</a>`).join(''))}
      ${tuile('Courrier', '<a href="#courrier">Ouvrir</a>', `<a class="rang ic-g" href="#courrier"><span class="ic">${svg('mail')}</span><span class="t"><b>${COUR.nl ? COUR.nl + ' non lu' + (COUR.nl > 1 ? 's' : '') : 'Aucun non lu'}</b><span>Ta boîte mail professionnelle</span></span>${chev()}</a>`)}
    </div></div></div></div>` };
};

/* ═══ MESSAGES ═══ */
const ligneConv = (c) => { const d = dernier(c); return `<a class="ligne" href="#messages/${c.id}" ${S.id === c.id ? 'aria-current="true"' : ''}>${c.nl ? '<i class="pt"></i>' : ''}${convAv(c)}<span class="t"><span class="l1"><b class="coupe">${esc(convNom(c))}</b><time>${quand(d)}</time></span>
  <span class="ap">${d.de === 'moi' ? 'Toi : ' : c.canal ? esc(prenom(d.de)) + ' : ' : ''}${esc(apercu(d))}</span></span>${c.sourdine ? svg('sourdine').replace('<svg', '<svg style="width:14px;height:14px;color:var(--faible)"') : ''}</a>`; };
const ordreConv = (a, b) => { const x = dernier(a), y = dernier(b); return y.j - x.j || y.h.localeCompare(x.h); };
function listeConvHtml() {
  const q = S.rech.trim().toLowerCase(), tri = C.slice().sort(ordreConv);
  if (q) { const r = tri.filter((c) => convNom(c).toLowerCase().includes(q) || c.msgs.some((m) => (m.t || '').toLowerCase().includes(q)));
    return r.length ? `<div class="liste-c">${r.map(ligneConv).join('')}</div>` : `<p class="note" style="padding:20px;text-align:center">Aucun résultat pour « ${esc(S.rech)} ».</p>`; }
  const ep = tri.filter((c) => c.epingle), reste = tri.filter((c) => !c.epingle);
  return `${ep.length ? `<div class="epingles">${ep.map((c) => `<a href="#messages/${c.id}" ${S.id === c.id ? 'aria-current="true"' : ''}><span style="position:relative">${convAv(c)}${c.nl ? '<i class="non-lu"></i>' : ''}</span><span class="coupe">${esc(c.avec ? prenom(c.avec) : c.n)}</span></a>`).join('')}</div>` : ''}<div class="liste-c">${reste.map(ligneConv).join('')}</div>`;
}
function bulleHtml(c, m, i) {
  const moi = m.de === 'moi', prec = c.msgs[i - 1], suite = prec && prec.de === m.de && prec.j === m.j && prec.type !== 'sys' && m.type !== 'sys';
  if (m.type === 'sys') return `<div class="sys">${svg(m.ic || 'tel')}${esc(m.t)}</div>`;
  let corps;
  if (m.type === 'vocal') corps = `<div class="bulle" data-msg="${m.id}"><span class="vocal"><button data-jouer aria-label="Écouter le message vocal">${svg('jouer')}</button><span class="onde">${[40, 70, 55, 90, 60, 35, 80, 65, 45, 75, 50, 85, 40, 60, 30, 70, 55, 45].map((h, k) => `<i style="--h:${h}%;--k:${k}"></i>`).join('')}</span><time>${m.d}</time></span></div>`;
  else if (m.type === 'photo') corps = `<div class="bulle photo" data-msg="${m.id}"><span class="photo-i" style="--a1:${P[m.de].a[0]};--a2:${P[m.de].a[1]}">${svg('photo')}</span>${m.leg ? `<small>${esc(m.leg)}</small>` : ''}</div>`;
  else if (m.type === 'fichier') corps = `<div class="bulle" data-msg="${m.id}"><span class="fichier"><i>${svg('doc')}</i><span><b>${esc(m.nom)}</b><small>${esc(m.taille)}</small></span></span></div>`;
  else if (m.type === 'position') corps = `<div class="bulle photo" data-msg="${m.id}"><span class="photo-i" style="--a1:#7fc8a9;--a2:#2a7a6a">${svg('position')}</span><small>${esc(m.t)}</small></div>`;
  else if (m.type === 'sondage') { const tot = m.opts.reduce((n, o) => n + o[1], 0) || 1; corps = `<div class="bulle" data-msg="${m.id}"><span class="sondage"><b>${esc(m.q)}</b>${m.opts.map((o, k) => `<button data-vote="${m.id}" data-k="${k}" aria-pressed="${m.v === k}"><i style="--w:${Math.round(o[1] / tot * 100)}%"></i><span>${esc(o[0])}</span><span>${o[1]}</span></button>`).join('')}<small>${tot} vote${tot > 1 ? 's' : ''}${m.v != null ? ' · tu as voté' : ''}</small></span></div>`; }
  else corps = `<div class="bulle" data-msg="${m.id}">${m.rep ? `<span class="cite">${esc(m.rep)}</span>` : ''}${esc(m.t)}</div>`;
  return `${!prec || prec.j !== m.j ? `<div class="jour">${jourCourt(m.j)}${m.j === 0 ? '' : ''} ${m.h}</div>` : ''}<div class="msg ${moi ? 'moi' : ''} ${suite ? 'suite' : ''}">${!moi && c.canal && !suite ? `<span class="aut">${esc(prenom(m.de))}</span>` : ''}${corps}
    ${m.reac && m.reac.length ? `<span class="reacs">${m.reac.map((r) => `<span>${r}</span>`).join('')}</span>` : ''}${moi && m.lu && i === c.msgs.length - 1 ? `<span class="lu">Lu ${m.lu}</span>` : moi && i === c.msgs.length - 1 ? '<span class="lu">Distribué</span>' : ''}</div>`;
}
function convHtml(c) {
  const p = c.avec && P[c.avec], autres = nonLus() - (c.nl || 0);
  return `<div class="col detail conv"><div class="barre"><a class="retour" href="#messages" aria-label="Retour aux conversations">${svg('retour')}${autres ? `<em>${autres}</em>` : ''}</a>
      <button class="qui" data-action="infos-conv">${convAv(c, 'm')}<span><b><span class="coupe">${esc(convNom(c))}</span>${svg('chev')}</b><small class="coupe">${c.canal ? c.membres.length + 1 + ' membres' : esc(p.stt || p.r)}</small></span></button>
      <span class="pousse"></span><button class="rond" data-appeler="${c.id}" aria-label="Appel audio" title="Appel audio">${svg('tel')}</button><button class="rond" data-appeler="${c.id}" data-video="1" aria-label="Appel vidéo" title="Appel vidéo">${svg('video')}</button></div>
    <div class="fil" id="fil">${c.msgs.map((m, i) => bulleHtml(c, m, i)).join('')}${c.ecrit ? '<div class="ecrit" aria-label="écrit…"><i></i><i></i><i></i></div>' : ''}</div>
    <div class="compo"><button class="rond gris" data-action="joindre" aria-label="Joindre : photo, document, position, sondage">${svg('plus')}</button>
      <div class="zone">${S.rep ? `<div class="rep"><span class="coupe">Réponse à « ${esc(S.rep)} »</span><button data-action="rep-annuler" aria-label="Annuler la réponse">${svg('x')}</button></div>` : ''}<textarea id="saisie" rows="1" placeholder="Message" aria-label="Message"></textarea></div>
      <button class="rond cam" data-joint="photo" aria-label="Prendre une photo">${svg('appareil')}</button><button class="rond" id="btn-envoi" data-action="vocal" aria-label="Enregistrer un message vocal">${svg('micro')}</button></div></div>`;
}
VUES.messages = () => {
  const c = conv(S.id);
  if (c && c.nl) { c.nl = 0; }
  const liste = `<div class="col liste">${tete('Messages', `<button class="rond" data-action="nouveau-message" aria-label="Nouvelle conversation" title="Nouvelle conversation">${svg('stylo')}</button>`)}
    <label class="cherche">${svg('cherche')}<input id="rech" placeholder="Rechercher" value="${esc(S.rech)}" aria-label="Rechercher dans les messages" autocomplete="off"></label><div class="defile" id="liste-conv">${listeConvHtml()}</div></div>`;
  return { deux: true, html: liste + (c ? convHtml(c) : `<div class="col detail">${vide('bulle', 'Choisis une conversation pour la lire et y répondre.')}</div>`), apres: () => { const f = $('#fil'); if (f) f.scrollTop = f.scrollHeight; } };
};

/* ═══ CONTACTS ═══ */
VUES.contacts = () => {
  const q = S.rech.trim().toLowerCase(), gens = Object.values(P).filter((p) => p.id !== 'moi' && (!q || (p.n + ' ' + p.r).toLowerCase().includes(q))).sort((a, b) => a.n.localeCompare(b.n));
  const ligne = (p) => `<a class="ligne" href="#contacts/${p.id}" ${S.id === p.id ? 'aria-current="true"' : ''}>${av(p.id, '', true)}<span class="t"><span class="l1"><b class="coupe">${esc(p.n)}</b></span><span class="ap une">${esc(p.r)}</span></span></a>`;
  const grp = [['Mon équipe', gens.filter((p) => p.eq)], ['Clients et partenaires', gens.filter((p) => !p.eq)]].filter((g) => g[1].length);
  const liste = `<div class="col liste">${tete('Contacts', `<button class="rond" data-action="contact-ajouter" aria-label="Ajouter un contact" title="Ajouter un contact">${svg('ajout')}</button>`)}
    <label class="cherche">${svg('cherche')}<input id="rech" placeholder="Rechercher" value="${esc(S.rech)}" aria-label="Rechercher un contact" autocomplete="off"></label>
    <div class="defile">${grp.map((g) => `<p class="section-l">${g[0]}</p><div class="liste-c">${g[1].map(ligne).join('')}</div>`).join('') || `<p class="note" style="padding:20px;text-align:center">Aucun contact pour « ${esc(S.rech)} ».</p>`}</div></div>`;
  const p = P[S.id]; let d = `<div class="col detail">${vide('contacts', 'Choisis un contact pour voir sa fiche.')}</div>`;
  if (p && p.id !== 'moi') { const hist = APPELS.filter((a) => a.qui === p.id).slice(0, 3), c = C.find((x) => x.avec === p.id);
    d = `<div class="col detail"><div class="barre"><a class="retour" href="#contacts" aria-label="Retour aux contacts">${svg('retour')}Contacts</a><h1></h1></div><div class="defile"><div class="fiche">
      <div class="tete">${av(p.id, 'xl')}<h2>${esc(p.n)}</h2><p class="gris">${esc(p.eq ? p.r : (p.soc ? p.soc + ' · ' : '') + p.r)}</p>${p.stt ? `<span class="statut ${p.st === 'ok' ? '' : p.st}"><i></i>${esc(p.stt)}</span>` : ''}</div>
      <div class="actions-f"><button data-ecrire="${p.id}">${svg('bulle')}Message</button><button data-appeler="${p.id}">${svg('tel')}Appel</button><button data-appeler="${p.id}" data-video="1">${svg('video')}Vidéo</button><button data-action="ecrire-mail">${svg('mail')}E-mail</button></div>
      <div class="groupe"><div class="rang"><span class="t"><span>Téléphone</span><b style="color:var(--accent)">${esc(p.tel)}</b></span></div><div class="rang"><span class="t"><span>E-mail</span><b style="color:var(--accent)" class="coupe">${esc(p.mel)}</b></span></div><div class="rang"><span class="t"><span>${p.eq ? 'Fonction' : 'Entreprise'}</span><b>${esc(p.r)}</b></span></div></div>
      ${c ? `<div><h3 class="titre-s" style="padding-left:14px">Dernier message</h3><a class="groupe" href="#messages/${c.id}" style="display:block"><span class="rang"><span class="t"><b class="coupe">${esc(apercu(dernier(c)))}</b><span>${quand(dernier(c))}</span></span>${chev()}</span></a></div>` : ''}
      ${hist.length ? `<div><h3 class="titre-s" style="padding-left:14px">Appels récents</h3><div class="groupe">${hist.map((a) => `<div class="rang"><span class="t"><b ${a.sens === 'manque' ? 'style="color:var(--rouge-txt)"' : ''}>${a.sens === 'manque' ? 'Appel manqué' : (a.sens === 'entrant' ? 'Appel reçu' : 'Appel émis') + (a.video ? ' · vidéo' : '')}</b><span>${jourCourt(a.j)} à ${a.h}${a.duree ? ' · ' + a.duree : ''}</span></span></div>`).join('')}</div></div>` : ''}
    </div></div></div>`; }
  return { deux: true, html: liste + d };
};

/* ═══ APPELS ═══ */
VUES.appels = () => {
  const l = APPELS.filter((a) => S.filtreAppels === 'tous' || a.sens === 'manque');
  const ligne = (a) => `<a class="ligne ${a.sens === 'manque' ? 'manque' : ''}" href="#appels/${a.id}" ${S.id === a.id ? 'aria-current="true"' : ''}>${av(a.qui)}<span class="t"><span class="l1"><b class="coupe">${esc(P[a.qui].n)}</b><time>${a.j === 0 ? a.h : jourCourt(a.j)}</time></span>
    <span class="ap une">${svg(a.video ? 'video' : a.sens === 'sortant' ? 'sortant' : 'entrant').replace('<svg', '<svg class="sens"')}${a.sens === 'manque' ? 'Manqué' : a.sens === 'entrant' ? 'Reçu' : 'Émis'}${a.video ? ' · vidéo' : ''}${a.duree ? ' · ' + a.duree : ''}</span></span></a>`;
  const liste = `<div class="col liste">${tete('Appels', `<button class="rond" data-action="nouvel-appel" aria-label="Nouvel appel" title="Nouvel appel">${svg('plus')}</button>`)}
    <div style="padding:10px 16px 6px;flex:none"><div class="seg" role="group" aria-label="Filtrer les appels" style="display:flex">${[['tous', 'Tous'], ['manques', 'Manqués']].map((f) => `<button aria-pressed="${S.filtreAppels === f[0]}" data-filtre-appels="${f[0]}">${f[1]}</button>`).join('')}</div></div>
    <div class="defile">${l.length ? `<div class="liste-c">${l.map(ligne).join('')}</div>` : '<p class="note" style="padding:20px;text-align:center">Aucun appel manqué.</p>'}
      <p class="note" style="text-align:center;padding:16px"><button class="lien" data-action="appel-entrant" style="font-size:inherit">Simuler un appel entrant</button></p></div></div>`;
  const a = APPELS.find((x) => x.id === S.id); let d = `<div class="col detail">${vide('tel', 'Choisis un appel, ou lance un nouvel appel audio ou vidéo.')}</div>`;
  if (a) { const p = P[a.qui], tous = APPELS.filter((x) => x.qui === a.qui); a.vu = true;
    d = `<div class="col detail"><div class="barre"><a class="retour" href="#appels" aria-label="Retour aux appels">${svg('retour')}Appels</a><h1></h1></div><div class="defile"><div class="fiche">
      <div class="tete">${av(p.id, 'xl')}<h2>${esc(p.n)}</h2><p class="gris">${esc(p.r)}</p></div>
      <div class="actions-f"><button data-appeler="${p.id}">${svg('tel')}Appel</button><button data-appeler="${p.id}" data-video="1">${svg('video')}Vidéo</button><button data-ecrire="${p.id}">${svg('bulle')}Message</button><button data-go="contacts/${p.id}">${svg('personne')}Fiche</button></div>
      <div><h3 class="titre-s" style="padding-left:14px">Historique</h3><div class="groupe">${tous.map((x) => `<div class="rang"><span class="t"><b ${x.sens === 'manque' ? 'style="color:var(--rouge-txt)"' : ''}>${x.sens === 'manque' ? 'Appel manqué' : (x.sens === 'entrant' ? 'Appel reçu' : 'Appel émis') + (x.video ? ' · vidéo' : '')}</b><span>${jourCourt(x.j)} à ${x.h}</span></span><span class="v">${x.duree || ''}</span></div>`).join('')}</div></div>
    </div></div></div>`; }
  return { deux: true, html: liste + d };
};

/* ═══ RÉUNIONS ═══ */
const invitesAv = (e) => `<span class="avs">${(e.invites || []).slice(0, 4).map((i) => av(i[0])).join('')}</span>`;
const dateTuile = (j) => { const d = jourDe(j); return `<span class="date-t"><small>${fmt(d, { month: 'short' }).replace('.', '')}</small><b>${d.getDate()}</b></span>`; };
function ficheEvt(e) {
  const t = TYPES_E[e.type], st = { oui: ['Accepté', 'v'], attente: ['En attente', 'o'], non: ['Refusé', 'r'] }, rap = { 5: '5 minutes avant', 15: '15 minutes avant', 60: '1 heure avant', 1440: 'La veille' };
  return `<div class="tete" style="align-items:flex-start;text-align:left"><span class="pastille b" style="color:${t[1]};background:color-mix(in srgb,${t[1]} 14%,transparent)">${t[0]}</span><h2>${esc(e.titre)}</h2><p class="gris">${jourLong(e.j)} · ${e.deb} – ${e.fin}${e.repete ? ' · ' + e.repete : ''}</p></div>
    <div style="display:flex;gap:8px;flex-wrap:wrap">${e.type === 'reunion' && !e.passe ? `<button class="btn" data-rejoindre="${e.id}">${svg('video')}Rejoindre</button><button class="btn gris" data-action="lien-reunion" data-id="${e.id}">${svg('lien')}Copier le lien</button>` : ''}${e.cr ? `<button class="btn" data-action="compte-rendu" data-id="${e.id}">${svg('doc')}Compte rendu</button>` : ''}${!e.passe ? `<button class="btn gris" data-action="evt-modifier" data-id="${e.id}">Modifier</button>` : ''}</div>
    ${e.lieu ? `<div class="groupe"><div class="rang ic-g"><span class="ic" style="--c:#30b450">${svg('position')}</span><span class="t"><span>Lieu</span><b>${esc(e.lieu)}</b></span></div></div>` : ''}
    ${e.invites && e.invites.length ? `<div><h3 class="titre-s" style="padding-left:14px">Invités</h3><div class="groupe">${e.invites.map((i) => `<div class="rang av-g">${av(i[0])}<span class="t"><b>${esc(P[i[0]].n)}</b><span>${esc(P[i[0]].r)}</span></span><span class="pastille ${st[i[1]][1]}">${st[i[1]][0]}</span></div>`).join('')}</div></div>` : ''}
    ${e.odj ? `<div><h3 class="titre-s" style="padding-left:14px">Ordre du jour</h3><div class="groupe">${e.odj.map((o, k) => `<div class="rang"><span class="v tab">${k + 1}</span><span class="t"><b>${esc(o)}</b></span></div>`).join('')}</div></div>` : ''}
    ${!e.passe ? `<div class="groupe"><div class="rang"><span class="t"><b>Rappel</b></span><span class="v">${rap[e.rappel] || 'Aucun'}</span></div></div><button class="btn gris large" style="color:var(--rouge-txt)" data-action="evt-supprimer" data-id="${e.id}">Supprimer</button>` : ''}`;
}
VUES.reunions = () => {
  const r = EVTS.filter((e) => e.type === 'reunion').sort((a, b) => a.j - b.j || a.deb.localeCompare(b.deb)), av2 = r.filter((e) => !e.passe), pa = r.filter((e) => e.passe);
  const ligne = (e) => `<a class="ligne" href="#reunions/${e.id}" ${S.id === e.id ? 'aria-current="true"' : ''}>${dateTuile(e.j)}<span class="t"><span class="l1"><b class="coupe">${esc(e.titre)}</b></span><span class="ap une">${jourCourt(e.j)} · ${e.deb} – ${e.fin}</span></span>${invitesAv(e)}</a>`;
  const liste = `<div class="col liste">${tete('Réunions', `<button class="rond" data-action="programmer" data-type="reunion" aria-label="Programmer une réunion" title="Programmer une réunion">${svg('plus')}</button>`)}
    <div style="display:flex;gap:8px;padding:12px 16px 4px;flex:none;flex-wrap:wrap"><button class="btn" style="flex:1 1 150px" data-action="reunion-maintenant">${svg('video')}Nouvelle réunion</button><button class="btn gris" style="flex:1 1 150px" data-action="rejoindre-code">Rejoindre avec un code</button></div>
    <div class="defile"><p class="section-l">À venir</p><div class="liste-c">${av2.map(ligne).join('') || '<p class="note" style="padding:14px">Aucune réunion à venir.</p>'}</div>${pa.length ? `<p class="section-l">Passées</p><div class="liste-c">${pa.map(ligne).join('')}</div>` : ''}</div></div>`;
  const e = evt(S.id);
  return { deux: true, html: liste + (e ? `<div class="col detail"><div class="barre"><a class="retour" href="#reunions" aria-label="Retour aux réunions">${svg('retour')}Réunions</a><h1></h1></div><div class="defile"><div class="fiche">${ficheEvt(e)}</div></div></div>` : `<div class="col detail">${vide('video', 'Choisis une réunion, ou lance-en une tout de suite.')}</div>`) };
};

/* ═══ AGENDA ═══ */
VUES.agenda = () => {
  const l0 = lundi(S.agSem), jours = [0, 1, 2, 3, 4, 5, 6].map((k) => l0 + k), du = (j) => EVTS.filter((e) => e.j === j).sort((a, b) => a.deb.localeCompare(b.deb));
  const titreSem = `${jourDe(jours[0]).getDate()} – ${fmt(jourDe(jours[6]), { day: 'numeric', month: 'long' })}`;
  let corps;
  if (S.agVue === 'semaine') corps = `<div class="semaine">${jours.map((j) => { const d = jourDe(j), ev = du(j); return `<button class="jour-c ${j === 0 ? 'auj' : ''}" aria-pressed="${S.agJour === j}" data-ag-jour="${j}" aria-label="${jourLong(j)}, ${ev.length} événement${ev.length > 1 ? 's' : ''}"><header><span>${maj1(fmt(d, { weekday: 'short' }).replace('.', ''))}</span><b>${d.getDate()}</b></header>
      ${ev.map((e) => `<span class="bloc" style="--c:${TYPES_E[e.type][1]}"><b>${esc(e.titre)}</b><span>${e.deb}</span></span>`).join('')}<i class="pt-j ${ev.length ? '' : 'sans'}"></i></button>`; }).join('')}</div>`;
  else { const ref = jourDe(l0 + 3), a = ref.getFullYear(), m = ref.getMonth(), premier = new Date(a, m, 1), dec = (premier.getDay() + 6) % 7, base = Math.round((premier - auj()) / 864e5) - dec;
    corps = `<div class="mois">${['lun', 'mar', 'mer', 'jeu', 'ven', 'sam', 'dim'].map((x) => `<span class="e">${x}</span>`).join('')}${Array.from({ length: 42 }, (_, k) => { const j = base + k, d = jourDe(j), ev = du(j);
      return `<button class="${d.getMonth() !== m ? 'hors' : ''} ${j === 0 ? 'auj' : ''}" aria-pressed="${S.agJour === j}" data-ag-jour="${j}" aria-label="${jourLong(j)}"><b>${d.getDate()}</b><span class="blocs" style="display:flex;flex-direction:column;gap:2px">${ev.slice(0, 2).map((e) => `<span class="bloc" style="--c:${TYPES_E[e.type][1]}"><b>${esc(e.titre)}</b></span>`).join('')}</span><span class="pts">${ev.slice(0, 3).map((e) => `<i style="--c:${TYPES_E[e.type][1]}"></i>`).join('')}</span></button>`; }).join('')}</div>`; }
  const sel = du(S.agJour);
  return { html: `<div class="col seule">${tete('Agenda', `<button class="rond" data-action="programmer" aria-label="Ajouter à l’agenda" title="Ajouter à l’agenda">${svg('plus')}</button>`)}<div class="defile"><div class="page" style="max-width:980px">
    <div style="display:flex;justify-content:center"><div class="seg" role="group" aria-label="Affichage" style="min-width:220px">${[['semaine', 'Semaine'], ['mois', 'Mois']].map((v) => `<button aria-pressed="${S.agVue === v[0]}" data-ag-vue="${v[0]}">${v[1]}</button>`).join('')}</div></div>
    <div class="ag-tete"><button class="rond" data-ag-sem="-1" aria-label="${S.agVue === 'semaine' ? 'Semaine précédente' : 'Mois précédent'}">${svg('retour')}</button><b>${S.agVue === 'semaine' ? titreSem : maj1(fmt(jourDe(l0 + 3), { month: 'long', year: 'numeric' }))}</b><button class="rond" data-ag-sem="1" aria-label="${S.agVue === 'semaine' ? 'Semaine suivante' : 'Mois suivant'}">${svg('chev')}</button></div>
    ${corps}
    <div><h3 class="titre-s" style="padding-left:14px">${jourLong(S.agJour)}</h3><div class="groupe">${sel.length ? sel.map((e) => `<button class="evt" data-evt="${e.id}" style="--c:${TYPES_E[e.type][1]}"><span class="h">${e.deb}<span>${e.fin}</span></span><span class="tr"></span><span class="t"><b>${esc(e.titre)}</b><span>${TYPES_E[e.type][0]}${e.lieu ? ' · ' + esc(e.lieu) : ''}${e.invites ? ' · ' + e.invites.map((i) => prenom(i[0])).join(', ') : ''}</span></span>${e.type === 'reunion' && !e.passe && e.j === 0 ? '<span class="pastille b" style="align-self:center">Rejoindre</span>' : ''}</button>`).join('') : '<p class="rien" style="padding:16px;color:var(--second)">Rien de prévu ce jour-là.</p>'}</div></div>
    ${S.agSem !== 0 || S.agJour !== 0 ? '<div style="text-align:center"><button class="lien" data-ag-auj>Revenir à aujourd’hui</button></div>' : ''}
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
    COUR.inst = OPCourrier.monter(z, { source, cotes: ['pro'], cote: 'pro', cleStockage: 'protoOpmsg2_courrier', titre: 'OP Courrier', intervalle: 0, theme: themeHote,
      onCompter: (n) => { if (COUR.nl === n) return; COUR.nl = n; setTimeout(() => { majMenu(); if (S.vue === 'accueil' && !$('#calque').innerHTML) rendre(); }, 0); } });
  } catch (e) { z.innerHTML = vide('mail', 'La boîte mail n’a pas pu s’ouvrir dans ce prototype.'); }
}

/* ═══ PROFIL : soi d'abord, les réglages rangés dessous (comme Réglages sur iPhone) ═══ */
VUES.profil = () => {
  const b = (k, t, d) => `<div class="rang"><span class="t"><b>${t}</b>${d ? `<span>${d}</span>` : ''}</span><button class="bascule" role="switch" aria-checked="${S.regl[k]}" data-regl="${k}" aria-label="${t}"></button></div>`;
  const l = (ic, c, t, v, attr) => `<button class="rang ic-g" ${attr}><span class="ic" style="--c:${c}">${svg(ic)}</span><span class="t"><b>${t}</b></span>${v ? `<span class="v">${v}</span>` : ''}${chev()}</button>`;
  return { html: `<div class="col seule">${tete('Profil')}<div class="defile"><div class="page profil">
    <div class="groupe"><button class="moi-c" data-action="profil-modifier">${av('moi', 'g')}<span><b>${esc(P.moi.n)}</b><span class="gris">${esc(P.moi.r)} · Clim Services 17</span></span>${chev()}</button>
      <button class="rang" data-action="statut"><span class="t"><b>Statut</b></span><span class="statut ${STATUTS[S.statut][1]}"><i></i>${STATUTS[S.statut][0]}</span>${chev()}</button></div>
    <div class="groupe">${l('contacts', '#2a4a9c', 'Mon espace', 'Clim Services 17', 'data-action="espace"')}${l('etoile', '#e8590c', 'Abonnement', 'Pro', 'data-action="abonnement"')}</div>
    <div><h3 class="titre-s" style="padding-left:14px">Notifications</h3><div class="groupe">${b('notif', 'Autoriser les notifications')}${b('apercuNotif', 'Afficher l’aperçu', 'Le début du message dans la notification.')}${b('heuresPro', 'Heures de travail', 'De 8 h à 18 h, du lundi au vendredi. En dehors, le côté Pro ne sonne pas.')}${b('pauseReunion', 'Silence en réunion', 'Les notifications attendent la fin de la réunion.')}</div></div>
    <div><h3 class="titre-s" style="padding-left:14px">Confidentialité</h3><div class="groupe">${b('lecture', 'Confirmations de lecture', 'Les autres voient « Lu » ; tu vois le leur.')}${b('enligne', 'Montrer que je suis en ligne')}</div></div>
    <div><h3 class="titre-s" style="padding-left:14px">Apparence</h3><div class="groupe"><div class="rang"><span class="t"><b>Thème</b></span><div class="seg" role="group" aria-label="Thème">${[['auto', 'Auto'], ['light', 'Jour'], ['dark', 'Nuit']].map((m) => `<button aria-pressed="${S.theme === m[0]}" data-theme-choix="${m[0]}">${m[1]}</button>`).join('')}</div></div></div>
      <p class="note" style="padding-top:6px">Dans la vraie application, le jour et la nuit suivent l’appareil : ce réglage n’existe que dans ce prototype.</p></div>
    <div class="groupe">${l('info', '#8e8e93', 'À propos', 'Prototype', 'data-action="a-propos"')}</div>
    <button class="btn gris large" style="color:var(--rouge-txt)" data-action="deconnexion">Se déconnecter</button>
  </div></div></div>` };
};
