/* ══ LES GESTES : tout ce qui se touche. Un seul écouteur de clic, qui lit l'attribut du bouton. ══ */
const REPONSES = ['D’accord, merci !', 'Bien reçu.', 'Parfait, je m’en occupe.', 'Ça marche, à tout à l’heure.', 'Merci pour l’info.'];
function envoyer(c, m) {
  const msg = Object.assign({ id: uid(), de: 'moi', j: 0, h: hMaintenant() }, m); if (S.rep) { msg.rep = S.rep; S.rep = null; }
  c.msgs.push(msg); rendre();
  /* quelqu'un répond : la conversation vit (une seule personne — un canal reste calme) */
  if (!c.avec || c._attend) return; c._attend = true; const nom = P[c.avec].n, cote = S.mode, ici = () => C.includes(c);      // la réponse peut arriver après un changement de côté : P et C ne sont alors plus ceux de cette conversation
  setTimeout(() => { c.ecrit = true; if (ici() && S.vue === 'messages' && S.id === c.id) rendre(); }, 900);
  setTimeout(() => { c.ecrit = false; c._attend = false; msg.lu = hMaintenant(); const r = { id: uid(), de: c.avec, j: 0, h: hMaintenant(), t: REPONSES[c.msgs.length % REPONSES.length] }; c.msgs.push(r);
    if (ici() && S.vue === 'messages' && S.id === c.id && !S.salle && !S.appel) { rendre(); return; }
    c.nl = (c.nl || 0) + 1; if (ici() && !S.salle) rendre();
    /* le Perso n'est jamais coupé ; un message Pro qui arrive pendant qu'on est côté Perso attend la reprise (il sera dans le résumé) */
    if (ici() || cote === 'perso') notifier(nom, r.t, () => { if (ici()) aller('messages', c.id); else if (changerMode(cote)) aller('messages', c.id); }); }, 3200);
}
function majEnvoi() { const s = $('#saisie'), b = $('#btn-envoi'); if (!s || !b) return; const plein = !!s.value.trim();
  if (plein !== b.classList.contains('plein')) { b.classList.toggle('plein', plein); b.dataset.action = plein ? 'envoyer' : 'vocal'; b.setAttribute('aria-label', plein ? 'Envoyer' : 'Enregistrer un message vocal'); b.innerHTML = svg(plein ? 'envoyer' : 'micro'); }
  s.style.height = 'auto'; s.style.height = Math.min(120, s.scrollHeight) + 'px'; }
const choixContacts = (attr, sans) => Object.values(P).filter((p) => p.id !== 'moi' && !(sans || []).includes(p.id)).map((p) => `<button class="rang av-g" ${attr}="${p.id}">${av(p.id, '', true)}<span class="t"><b>${esc(p.n)}</b><span>${esc(p.r)}</span></span></button>`).join('');
function menuMessage(el, x, y) {
  fermerMenu(); const c = conv(S.id), m = c && c.msgs.find((q) => q.id === el.dataset.msg); if (!m) return;
  const d = document.createElement('div'); d.className = 'menu-ctx'; d.setAttribute('role', 'menu'); d.dataset.pour = m.id;
  d.innerHTML = `<div class="tap">${['❤️', '👍', '👎', '😂', '‼️', '❓'].map((r) => `<button data-reac="${r}" aria-label="Réagir ${r}">${r}</button>`).join('')}</div>
    <button class="l" data-ctx="repondre">Répondre${svg('repondre')}</button>${m.t ? `<button class="l" data-ctx="copier">Copier${svg('copier')}</button>` : ''}<button class="l" data-ctx="transferer">Transférer${svg('transferer')}</button>${m.de === 'moi' ? `<button class="l r" data-ctx="supprimer">Supprimer${svg('corbeille')}</button>` : ''}`;
  document.body.appendChild(d); const r = d.getBoundingClientRect(), W = innerWidth, H = innerHeight;
  d.style.left = Math.max(8, Math.min(x, W - r.width - 8)) + 'px'; d.style.top = Math.max(8, Math.min(y, H - r.height - 8)) + 'px';
}
function feuilleProgrammer(pre) {
  pre = pre || {}; const type = pre.type || (S.mode === 'pro' ? 'reunion' : 'rdv'), jours = Array.from({ length: 21 }, (_, k) => k);
  ouvrir(`${fTete(pre.id ? 'Modifier' : 'Nouveau', pre.id ? 'OK' : 'Ajouter', 'data-action="evt-enregistrer"' + (pre.id ? ` data-id="${pre.id}"` : ''))}
    <div class="seg" role="group" aria-label="Type" style="display:flex">${Object.keys(TYPES_E).filter((t) => S.mode === 'pro' || t !== 'reunion').map((t) => `<button aria-pressed="${type === t}" data-pe-type="${t}">${TYPES_E[t][0]}</button>`).join('')}</div>
    <label class="champ"><span>Titre</span><input id="pe-titre" value="${esc(pre.titre || '')}" placeholder="${type === 'reunion' ? 'Point d’équipe' : type === 'rdv' ? 'Rendez-vous client' : 'Salon, congé, livraison…'}" autofocus></label>
    <label class="champ"><span>Jour</span><select id="pe-jour">${jours.map((j) => `<option value="${j}" ${(pre.j != null ? pre.j : S.vue === 'agenda' && S.agJour > 0 ? S.agJour : 0) === j ? 'selected' : ''}>${jourLong(j)}</option>`).join('')}</select></label>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px"><label class="champ"><span>Début</span><input id="pe-deb" type="time" value="${pre.deb || '10:00'}"></label><label class="champ"><span>Fin</span><input id="pe-fin" type="time" value="${pre.fin || '10:30'}"></label></div>
    <label class="champ" id="pe-lieu-z" ${type === 'reunion' ? 'hidden' : ''}><span>Lieu</span><input id="pe-lieu" value="${esc(pre.lieu || '')}" placeholder="Adresse"></label>
    <div class="champ" id="pe-inv-z" ${type !== 'reunion' ? 'hidden' : ''}><span>Invités</span><div class="puces">${Object.values(P).filter((p) => p.id !== 'moi').map((p) => `<button class="puce" aria-pressed="${!!(pre.invites || []).some((i) => i[0] === p.id)}" data-pe-inv="${p.id}">${av(p.id)}${esc(prenom(p.id))}</button>`).join('')}</div></div>
    <label class="champ"><span>Rappel</span><select id="pe-rappel">${[[0, 'Aucun'], [5, '5 minutes avant'], [15, '15 minutes avant'], [60, '1 heure avant'], [1440, 'La veille']].map((r) => `<option value="${r[0]}" ${(pre.rappel != null ? pre.rappel : 15) === r[0] ? 'selected' : ''}>${r[1]}</option>`).join('')}</select></label>`);
}
/* la recherche du haut (⌘K / Ctrl K) : une personne, une conversation, un message, une réunion — ou une action, quand on n'a encore rien tapé */
function palRes(q) {
  q = q.trim().toLowerCase(); const r = (attr, ic, c, t, s) => `<button class="rang ic-g" ${attr}><span class="ic" style="--c:${c}">${svg(ic)}</span><span class="t"><b class="coupe">${t}</b>${s ? `<span class="coupe">${s}</span>` : ''}</span></button>`;
  if (!q) return `<p class="section-l">Actions</p>${r('data-action="nouveau-message"', 'stylo', '#2a4a9c', 'Nouveau message')}${r('data-action="nouvel-appel"', 'tel', '#16a34a', 'Appeler quelqu’un')}${S.mode === 'pro' ? r('data-action="reunion-maintenant"', 'video', '#d97706', 'Réunion immédiate') : r('data-action="rejoindre-code"', 'video', '#d97706', 'Rejoindre une réunion avec un code')}${r('data-action="programmer"', 'agenda', '#7d3c98', 'Ajouter à l’agenda')}
    <p class="section-l">Aller à</p>${NAV.map((n) => r(`data-go="${n[0]}"`, n[1], '#5a6377', n[2])).join('')}`;
  const gens = Object.values(P).filter((x) => x.id !== 'moi' && (x.n + ' ' + x.r).toLowerCase().includes(q)), cv = C.filter((c) => c.canal && c.n.toLowerCase().includes(q)), ms = [], ev = EVTS.filter((e) => e.titre.toLowerCase().includes(q));
  C.forEach((c) => c.msgs.forEach((m) => { if ((m.t || '').toLowerCase().includes(q) && ms.length < 6) ms.push([c, m]); }));
  const h = (gens.length ? `<p class="section-l">Personnes</p>${gens.map((x) => r(`data-go="contacts/${x.id}"`, 'personne', '#2a4a9c', esc(x.n), esc(x.r))).join('')}` : '') + (cv.length ? `<p class="section-l">Canaux</p>${cv.map((c) => r(`data-go="messages/${c.id}"`, 'bulle', '#2a4a9c', '# ' + esc(c.n))).join('')}` : '')
    + (ms.length ? `<p class="section-l">Messages</p>${ms.map((x) => r(`data-go="messages/${x[0].id}"`, 'bulle', '#5a6377', esc(x[1].t), esc(convNom(x[0])) + ' · ' + quand(x[1]))).join('')}` : '') + (ev.length ? `<p class="section-l">Agenda</p>${ev.map((e) => r(`data-evt="${e.id}"`, 'agenda', TYPES_E[e.type][1], esc(e.titre), jourCourt(e.j) + ' à ' + e.deb)).join('')}` : '');
  return h || `<p class="note" style="padding:22px;text-align:center">Aucun résultat pour « ${esc(q)} ».</p>`;
}
const ACTIONS = {
  /* jour / nuit d'un geste (Justin, 17 novembre 2026 : « fais un mode jour et nuit ») ; « Auto », dans le Profil, suit l'appareil */
  theme: () => { S.theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'; appliquerTheme(); rendre(); toast(S.theme === 'dark' ? 'Mode nuit' : 'Mode jour'); },
  chercher: () => { ouvrir(`<label class="pal-champ">${svg('cherche')}<input id="pal" placeholder="Rechercher une personne, un message, une réunion" aria-label="Rechercher partout" autocomplete="off" autofocus></label><div class="pal-res defile" id="pal-res">${palRes('')}</div>`, 'palette'); const i = $('#pal'); if (i) i.focus(); },
  plus: () => ouvrir(`${fTeteOk('Plus')}${coteSeg('clair')}<div class="groupe">${[['reunions', 'video', 'Réunions', '#d97706'], ['courrier', 'mail', 'Courrier', '#0d8a6a'], ['contacts', 'contacts', 'Contacts', '#2a4a9c'], ['activite', 'cloche', 'Activité', '#e5484d'], ['profil', 'personne', 'Profil et réglages', '#5a6377']].filter((x) => S.mode === 'pro' || !['reunions', 'courrier', 'contacts'].includes(x[0])).map((x) => `<button class="rang ic-g" data-go="${x[0]}"><span class="ic" style="--c:${x[3]}">${svg(x[1])}</span><span class="t"><b>${x[2]}</b></span>${compte(x[0]) ? `<span class="pastille r">${compte(x[0])}</span>` : ''}${chev()}</button>`).join('')}</div>`),
  creer: () => ouvrir(`${fTete('Créer')}<div class="groupe">${[['nouveau-message', 'stylo', 'Nouveau message', '#2a4a9c'], ['nouveau-groupe', 'contacts', 'Nouveau groupe', '#2a4a9c'], ['nouvel-appel', 'tel', 'Appel', '#16a34a'], ['reunion-maintenant', 'video', 'Réunion immédiate', '#d97706'], ['programmer', 'agenda', 'Réunion, rendez-vous ou événement', '#7d3c98'], ['rappel-ajouter', 'tache', 'Rappel', '#5a6377'], ['contact-ajouter', 'ajout', 'Contact', '#5a6377']].map((x) => (S.mode === 'pro' || x[0] !== 'reunion-maintenant' ? x : ['rejoindre-code', 'video', 'Rejoindre une réunion avec un code', '#d97706'])).map((x) => `<button class="rang ic-g" data-action="${x[0]}"><span class="ic" style="--c:${x[3]}">${svg(x[1])}</span><span class="t"><b>${x[2]}</b></span></button>`).join('')}</div>`),
  'nouveau-message': () => ouvrir(`${fTete('Nouveau message')}<button class="btn gris large" data-action="nouveau-groupe">${svg('contacts')}Nouveau groupe</button><div class="groupe">${choixContacts('data-ecrire')}</div>`),
  'nouveau-groupe': () => ouvrir(`${fTete('Nouveau groupe', 'Créer', 'data-action="groupe-creer"')}<label class="champ"><span>Nom du groupe</span><input id="g-nom" placeholder="Chantier Les Minimes" autofocus></label>
    <div class="champ"><span>Membres</span><div class="puces">${Object.values(P).filter((p) => p.id !== 'moi').map((p) => `<button class="puce" aria-pressed="false" data-pe-inv="${p.id}">${av(p.id)}${esc(prenom(p.id))}</button>`).join('')}</div></div>`),
  'groupe-creer': () => { const n = $('#g-nom').value.trim(), m = $$('[data-pe-inv][aria-pressed="true"]').map((b) => b.dataset.peInv); if (!n) { $('#g-nom').focus(); toast('Donne un nom au groupe'); return; } if (!m.length) { toast('Choisis au moins un membre'); return; }
    const id = uid(); C.push({ id, n, canal: 1, membres: m, a: ['#3fb6c9', '#3a55b4'], nl: 0, msgs: [{ id: uid(), de: 'moi', type: 'sys', ic: 'contacts', j: 0, h: hMaintenant(), t: 'Tu as créé le groupe « ' + n + ' »' }] }); fermer(); aller('messages', id); },
  'nouvel-appel': () => ouvrir(`${fTete('Nouvel appel')}<div class="groupe">${Object.values(P).filter((p) => p.id !== 'moi').map((p) => `<div class="rang av-g">${av(p.id, '', true)}<span class="t"><b>${esc(p.n)}</b><span>${esc(p.r)}</span></span><button class="rond gris" data-appeler="${p.id}" aria-label="Appel audio avec ${esc(p.n)}">${svg('tel')}</button><button class="rond gris" data-appeler="${p.id}" data-video="1" aria-label="Appel vidéo avec ${esc(p.n)}">${svg('video')}</button></div>`).join('')}</div>`),
  'appel-entrant': () => { const qui = Object.values(P).find((p) => p.id !== 'moi' && p.eq && p.st === 'ok') || Object.values(P).find((p) => p.id !== 'moi'); demarrerAppel(qui.id, false, true); },      /* un proche du côté où l'on est : « leo » n'existe pas côté Perso */
  'reunion-maintenant': () => ouvrirSalle({ titre: 'Réunion de ' + prenom('moi'), invites: [['sophie', 'oui'], ['karim', 'oui'], ['leo', 'attente']] }),
  'rejoindre-code': () => ouvrir(`${fTete('Rejoindre', 'Rejoindre', 'data-action="code-ok"')}<label class="champ"><span>Code de la réunion</span><input id="code" inputmode="numeric" placeholder="123 456 789" autofocus></label><p class="note" style="padding:0">Le code se trouve dans l’invitation que tu as reçue.</p>`),
  'code-ok': () => { const v = $('#code').value.replace(/\D/g, ''); if (v.length < 6) { $('#code').focus(); toast('Le code a au moins six chiffres'); return; } ouvrirSalle({ titre: 'Réunion ' + v.slice(0, 3) + ' ' + v.slice(3, 6), invites: [['thomas', 'oui'], ['camille', 'oui']] }); },
  programmer: (b) => feuilleProgrammer({ type: b.dataset.type }),
  'evt-modifier': (b) => feuilleProgrammer(evt(b.dataset.id)),
  'evt-enregistrer': (b) => { const titre = $('#pe-titre').value.trim(); if (!titre) { $('#pe-titre').focus(); toast('Donne un titre'); return; }
    const type = $('[data-pe-type][aria-pressed="true"]').dataset.peType, deb = $('#pe-deb').value || '10:00', fin = $('#pe-fin').value || deb; if (fin < deb) { $('#pe-fin').focus(); toast('La fin est avant le début'); return; }
    const e = b.dataset.id ? evt(b.dataset.id) : { id: uid() }, neuf = !b.dataset.id, anciens = e.invites || [], avant = '' + e.j + e.deb + e.fin;
    Object.assign(e, { type, titre, j: +$('#pe-jour').value, deb, fin, rappel: +$('#pe-rappel').value, lieu: type === 'reunion' ? undefined : $('#pe-lieu').value.trim() || undefined,
      invites: type === 'reunion' ? $$('[data-pe-inv][aria-pressed="true"]').map((x) => { const a = anciens.find((i) => i[0] === x.dataset.peInv); return a || [x.dataset.peInv, 'attente']; }) : undefined });
    if (neuf) EVTS.push(e); fermer(); S.agJour = e.j; S.agSem = Math.floor((e.j - lundi(0)) / 7); S.agVue = 'semaine';
    if (S.vue === 'reunions' && type === 'reunion') aller('reunions', e.id); else aller('agenda');
    if (!neuf && avant !== '' + e.j + e.deb + e.fin && prevenir(e, 'decale')) return;
    notifier(neuf ? 'Ajouté à ton agenda' : 'Modifié', e.titre + ' · ' + jourCourt(e.j) + ' à ' + e.deb + (e.invites && e.invites.length ? ' · ' + e.invites.length + ' invité' + (e.invites.length > 1 ? 's prévenus' : ' prévenu') : '')); },
  'evt-supprimer': (b) => { const i = EVTS.findIndex((e) => e.id === b.dataset.id); if (i < 0) return; const t = EVTS[i].titre, prevenus = prevenir(EVTS[i], 'annule'); EVTS.splice(i, 1); fermer(); if (S.id === b.dataset.id) aller(S.vue); else rendre(); if (!prevenus) toast('« ' + t + ' » supprimé'); },
  'lien-reunion': () => toast('Lien de la réunion copié'),
  'compte-rendu': (b) => { const e = evt(b.dataset.id); ouvrir(`${fTeteOk('Compte rendu')}<p class="gris" style="text-align:center">${esc(e.titre)} · ${e.cr.duree}</p>
    <div><h3 class="titre-s" style="padding-left:14px">Décisions</h3><div class="groupe">${e.cr.decisions.map((d) => `<div class="rang"><span class="t"><b>${esc(d)}</b></span></div>`).join('')}</div></div>
    <div><h3 class="titre-s" style="padding-left:14px">À faire</h3><div class="groupe">${e.cr.actions.map((a) => `<div class="rang av-g">${av(a[1])}<span class="t"><b>${esc(a[0])}</b><span>${esc(P[a[1]].n)}</span></span></div>`).join('')}</div></div>`); },
  'cr-envoyer': () => { const cr = S._cr; if (!cr) { fermer(); return; } const notes = ($('#cr-notes') || {}).value || '', c = conv('equipe'), gens = cr.presents.map(prenom).join(', ') || 'toi seule';
    const texte = 'Compte rendu · ' + cr.titre + '\nDurée : ' + cr.duree + ' · Présents : ' + gens + (notes.trim() ? '\n' + notes.trim() : '') + (cr.dessins ? '\nPartage annoté joint (' + cr.dessins + ' dessin' + (cr.dessins > 1 ? 's' : '') + ').' : '');
    cr.fichiers.forEach((f) => c.msgs.push({ id: uid(), de: 'moi', j: 0, h: hMaintenant(), type: 'fichier', nom: f, taille: '212 Ko' })); c.msgs.push({ id: uid(), de: 'moi', j: 0, h: hMaintenant(), t: texte });
    const e = cr.id && evt(cr.id); if (e) e.cr = { duree: cr.duree, decisions: notes.trim() ? notes.trim().split('\n').filter(Boolean) : ['Aucune note prise'], actions: [] };
    S._cr = null; fermer(); rendre(); notifier('Compte rendu envoyé', cr.a === 'equipe' ? 'Dans le canal Équipe terrain' : (cr.presents.length ? gens + (cr.presents.length > 1 ? ' l’ont reçu' : ' l’a reçu') : 'Rangé dans Équipe terrain') + (cr.a === 'equipe' ? '' : ', copie dans Équipe terrain'), () => aller('messages', 'equipe')); },
  'rappel-ajouter': () => ouvrir(`${fTete('Nouveau rappel', 'Ajouter', 'data-action="rappel-ok"')}<label class="champ"><span>À faire</span><input id="rap-t" placeholder="Rappeler le fournisseur" autofocus></label>
    <label class="champ"><span>Quand</span><select id="rap-j"><option value="0">Aujourd’hui</option><option value="1">Demain</option><option value="7">Dans une semaine</option></select></label>`),
  'rappel-ok': () => { const t = $('#rap-t').value.trim(); if (!t) { $('#rap-t').focus(); toast('Écris ce qu’il faut faire'); return; } RAPPELS.push({ id: uid(), t, j: +$('#rap-j').value, fait: false }); fermer(); rendre(); },
  'infos-conv': () => { const c = conv(S.id), b = (k, t) => `<div class="rang"><span class="t"><b>${t}</b></span><button class="bascule" role="switch" aria-checked="${!!c[k]}" data-conv-regl="${k}" aria-label="${t}"></button></div>`;
    ouvrir(`${fTeteOk('Infos')}<div style="display:flex;flex-direction:column;align-items:center;gap:6px;text-align:center">${convAv(c, 'xl')}<h2>${esc(convNom(c))}</h2><p class="gris">${c.canal ? c.membres.length + 1 + ' membres' : esc(P[c.avec].r)}</p></div>
      ${c.avec ? `<div class="actions-f"><button data-appeler="${c.avec}">${svg('tel')}Appel</button><button data-appeler="${c.avec}" data-video="1">${svg('video')}Vidéo</button><button data-go="contacts/${c.avec}">${svg('personne')}Fiche</button></div>` : `<div class="groupe"><div class="rang av-g">${av('moi')}<span class="t"><b>Toi</b><span>Administratrice</span></span></div>${c.membres.map((m) => `<button class="rang av-g" data-go="contacts/${m}">${av(m, '', true)}<span class="t"><b>${esc(P[m].n)}</b><span>${esc(P[m].r)}</span></span>${chev()}</button>`).join('')}</div>`}
      <div class="groupe">${b('epingle', 'Épingler en haut')}${b('sourdine', 'Sourdine')}</div>`); },
  joindre: () => { const l = (k, ic, c, t, s) => `<button class="rang ic-g" data-joint="${k}"><span class="ic" style="--c:${c}">${svg(ic)}</span><span class="t"><b>${t}</b><span>${s}</span></span></button>`;
    ouvrir(`${fTete('Joindre')}<div class="groupe">${l('photo', 'photo', '#2a4a9c', 'Photo', 'Depuis l’appareil photo ou la photothèque')}${l('fichier', 'doc', '#8e8e93', 'Document', 'Un fichier de l’appareil')}${l('position', 'position', '#30b450', 'Position', 'Là où tu te trouves')}${l('sondage', 'sonde', '#7d3c98', 'Sondage', 'Une question, des réponses à voter')}</div>`); },
  'sondage-ok': () => { const q = $('#sd-q').value.trim(), o = [$('#sd-1').value.trim(), $('#sd-2').value.trim(), $('#sd-3').value.trim()].filter(Boolean); if (!q) { $('#sd-q').focus(); toast('Écris la question'); return; } if (o.length < 2) { toast('Il faut au moins deux réponses'); return; } fermer(); envoyer(conv(S.id), { type: 'sondage', q, opts: o.map((x) => [x, 0]), v: null }); },
  'rep-annuler': () => { S.rep = null; rendre(); },
  envoyer: () => { const s = $('#saisie'), t = s.value.trim(); if (!t) return; s.value = ''; envoyer(conv(S.id), { t }); const n = $('#saisie'); if (n && !TEL()) n.focus(); },
  vocal: (b) => { if (b.dataset.enr) return; b.dataset.enr = '1'; b.classList.add('plein'); b.style.background = 'var(--rouge)'; toast('Enregistrement… touche encore pour envoyer');
    b.dataset.action = 'vocal-fin'; b.setAttribute('aria-label', 'Envoyer le message vocal'); },
  'vocal-fin': () => envoyer(conv(S.id), { type: 'vocal', d: '0:0' + (3 + Math.floor(Math.random() * 6)) }),
  'contact-ajouter': () => ouvrir(`${fTete('Nouveau contact', 'Ajouter', 'data-action="contact-ok"')}<label class="champ"><span>Prénom et nom</span><input id="ct-nom" placeholder="Paul Lefèvre" autofocus></label><label class="champ"><span>Entreprise</span><input id="ct-soc" placeholder="Garage Lefèvre"></label><label class="champ"><span>Téléphone</span><input id="ct-tel" type="tel" inputmode="tel" placeholder="06 00 00 00 00"></label>`),
  'contact-ok': () => { const n = $('#ct-nom').value.trim(); if (n.split(/\s+/).length < 2) { $('#ct-nom').focus(); toast('Écris le prénom et le nom'); return; } const id = uid();
    P[id] = { id, n, r: $('#ct-soc').value.trim() || 'Contact', soc: 'Contact', a: ['#3fb6c9', '#3a55b4'], tel: $('#ct-tel').value.trim() || '—', mel: '—' }; fermer(); aller('contacts', id); toast(n + ' ajouté à tes contacts'); },
  'ecrire-mail': () => { aller('courrier'); },
  'profil-modifier': () => ouvrir(`${fTete('Mon profil', 'OK', 'data-action="profil-ok"')}<div style="display:flex;justify-content:center">${av('moi', 'xl')}</div><label class="champ"><span>Prénom et nom</span><input id="pf-nom" value="${esc(P.moi.n)}"></label><label class="champ"><span>Fonction</span><input id="pf-role" value="${esc(P.moi.r)}"></label>
    <div class="groupe"><div class="rang"><span class="t"><span>Téléphone</span><b>${P.moi.tel}</b></span></div><div class="rang"><span class="t"><span>E-mail</span><b class="coupe">${P.moi.mel}</b></span></div></div>`),
  'profil-ok': () => { const n = $('#pf-nom').value.trim(); if (n) P.moi.n = n; P.moi.r = $('#pf-role').value.trim() || P.moi.r; fermer(); rendre(); },
  statut: () => ouvrir(`${fTeteOk('Statut')}<div class="groupe">${Object.keys(STATUTS).map((k) => `<button class="rang" data-statut="${k}"><span class="statut ${STATUTS[k][1]}" style="font-size:inherit;color:inherit;flex:1"><i></i>${STATUTS[k][0]}</span>${S.statut === k ? svg('coche').replace('<svg', '<svg style="color:var(--accent)"') : ''}</button>`).join('')}</div>`),
  espace: () => ouvrir(`${fTeteOk('Clim Services 17')}<p class="gris" style="text-align:center">Ton espace professionnel · 5 membres</p><div class="groupe"><div class="rang av-g">${av('moi')}<span class="t"><b>${esc(P.moi.n)}</b><span>Propriétaire</span></span></div>${Object.values(P).filter((p) => p.eq).map((p) => `<div class="rang av-g">${av(p.id, '', true)}<span class="t"><b>${esc(p.n)}</b><span>${esc(p.r)}</span></span></div>`).join('')}</div>
    <button class="btn large" data-action="inviter-espace">${svg('lien')}Inviter un collègue</button>`),
  'inviter-espace': () => toast('Lien d’invitation copié · valable 7 jours'),
  abonnement: () => ouvrir(`${fTeteOk('Abonnement')}<div class="groupe"><div class="rang"><span class="t"><b>OP MESSAGES Pro</b><span>5 membres · appels, réunions, agenda et courrier</span></span><span class="pastille v">Actif</span></div><div class="rang"><span class="t"><b>Prochaine échéance</b></span><span class="v">1ᵉʳ décembre</span></div></div><p class="note" style="padding:0">Exemple : aucun paiement n’existe dans ce prototype.</p>`),
  'a-propos': () => ouvrir(`${fTeteOk('À propos')}<p style="text-align:center;font-weight:600">OP MESSAGES · prototype du côté Pro</p><p class="gris" style="text-align:center">Toutes les données sont des exemples : rien ne part sur un réseau, rien ne s’enregistre. Recharger la page remet tout à zéro.</p>`),
  deconnexion: () => toast('Dans ce prototype, tu restes connectée'),
};
document.addEventListener('click', (e) => {
  const q = (s) => e.target.closest(s); let b;
  if (!q('.menu-ctx')) fermerMenu();
  if (e.target.id === 'calque') { fermer(); return; }
  if ((b = q('[data-reac]'))) { const c = conv(S.id), m = c.msgs.find((x) => x.id === q('.menu-ctx').dataset.pour); m.reac = m.reac || []; const i = m.reac.indexOf(b.dataset.reac); if (i >= 0) m.reac.splice(i, 1); else m.reac.push(b.dataset.reac); fermerMenu(); rendre(); return; }
  if ((b = q('[data-ctx]'))) { const c = conv(S.id), m = c.msgs.find((x) => x.id === q('.menu-ctx').dataset.pour), k = b.dataset.ctx; fermerMenu();
    if (k === 'repondre') { S.rep = apercu(m).slice(0, 60); rendre(); const s = $('#saisie'); if (s) s.focus(); }
    else if (k === 'copier') { try { const pr = navigator.clipboard.writeText(m.t); if (pr && pr.catch) pr.catch(() => {}); } catch (x) { /* presse-papiers refusé (le refus arrive aussi en promesse) : sans conséquence dans le prototype */ } toast('Copié'); }
    else if (k === 'transferer') { S._transfert = m; ouvrir(`${fTete('Transférer à')}<div class="groupe">${choixContacts('data-transferer', [c.avec])}</div>`); }
    else if (k === 'supprimer') { c.msgs.splice(c.msgs.indexOf(m), 1); rendre(); toast('Message supprimé'); }
    return; }
  /* les gestes d'un message, au survol (bureau) : réagir d'un pouce, répondre, ou ouvrir le menu */
  if ((b = q('[data-outil]'))) { const c = conv(S.id), id = b.closest('.outils').dataset.pour, m = c.msgs.find((x) => x.id === id), k = b.dataset.outil;
    if (k === 'pouce') { m.reac = m.reac || []; const i = m.reac.indexOf('👍'); if (i >= 0) m.reac.splice(i, 1); else m.reac.push('👍'); rendre(); }
    else if (k === 'repondre') { S.rep = apercu(m).slice(0, 60); rendre(); const s = $('#saisie'); if (s) s.focus(); }
    else { const r = b.getBoundingClientRect(); menuMessage($(`#fil [data-msg="${id}"]`), r.right - 230, r.bottom + 6); }
    return; }
  /* Perso | Pro, et les heures de travail */
  if ((b = q('button[data-cote]'))) {      /* ⛔ « button » : <html> porte aussi data-cote (la couleur du cadre) — sans lui, CHAQUE clic de la page s'arrêtait ici */ if (S.appel || S.salle) { toast('Termine d’abord l’appel en cours'); return; } changerMode(b.dataset.cote); return; }
  if ((b = q('[data-hp]'))) { if (b.dataset.hp === 'on') S.hp.on = !S.hp.on; else S.auto = !S.auto; _coteHoraire = dansHeures() ? 'pro' : 'perso'; rendre(); return; }
  if ((b = q('[data-hp-jour]'))) { const j = +b.dataset.hpJour, l = S.hp.jours, i = l.indexOf(j); if (i >= 0 && l.length === 1) { toast('Garde au moins un jour, ou coupe les heures de travail'); return; } if (i >= 0) l.splice(i, 1); else { l.push(j); l.sort(); } _coteHoraire = dansHeures() ? 'pro' : 'perso'; rendre(); return; }
  if ((b = q('[data-hp-essai]'))) { const d = new Date().getDay() || 7; if (!S.hp.jours.includes(d)) { toast('Aujourd’hui n’est pas un jour travaillé : coche-le pour essayer'); return; }
    _decal += minutes(b.dataset.hpEssai === 'fin' ? S.hp.fin : S.hp.debut) - minutes(hMaintenant()) + (minutes(b.dataset.hpEssai === 'fin' ? S.hp.fin : S.hp.debut) - minutes(hMaintenant()) < -720 ? 0 : 0); horaireAppliquer(); rendre(); return; }
  if ((b = q('[data-filtre-conv]'))) { S.filtreConv = b.dataset.filtreConv; rendre(); return; }
  if ((b = q('[data-filtre-act]'))) { S.filtreAct = b.dataset.filtreAct; rendre(); return; }
  if ((b = q('[data-traite]'))) { TRAITE.add(b.dataset.traite); rendre(); toast('Rangé : traité'); return; }
  if ((b = q('[data-inv]'))) { const e = evt(b.dataset.inv), oui = b.dataset.rep === 'oui', org = e.invitation; fermer(); delete e.invitation; if (!oui) EVTS.splice(EVTS.indexOf(e), 1); if (!oui && S.id === e.id) aller(S.vue); else rendre(); toast(oui ? 'Accepté : ' + prenom(org) + ' est prévenue' : 'Refusé : ' + prenom(org) + ' est prévenue'); return; }
  if ((b = q('[data-ferme]'))) { fermer(); return; }
  if ((b = q('[data-action]')) && ACTIONS[b.dataset.action]) { ACTIONS[b.dataset.action](b); return; }
  if ((b = q('[data-go]'))) { fermer(); const p = b.dataset.go.split('/'); aller(p[0], p[1]); return; }
  if ((b = q('[data-rejoindre]'))) { ouvrirSalle(evt(b.dataset.rejoindre)); return; }
  if ((b = q('[data-evt]'))) { const ev = evt(b.dataset.evt); if (ev) ouvrir(`${fTeteOk(TYPES_E[ev.type][0])}${ficheEvt(ev)}`); return; }
  if ((b = q('[data-appeler]'))) { demarrerAppel(b.dataset.appeler, !!b.dataset.video); return; }
  if ((b = q('[data-ecrire]'))) { fermer(); const id = b.dataset.ecrire; let c = C.find((x) => x.avec === id); if (!c) { c = { id, avec: id, nl: 0, msgs: [] }; C.push(c); } aller('messages', c.id); return; }
  if ((b = q('[data-transferer]'))) { const id = b.dataset.transferer, m = S._transfert; let c = C.find((x) => x.avec === id); if (!c) { c = { id, avec: id, nl: 0, msgs: [] }; C.push(c); }
    c.msgs.push(Object.assign({}, m, { id: uid(), de: 'moi', j: 0, h: hMaintenant(), reac: [], lu: null, rep: null })); fermer(); rendre(); toast('Transféré à ' + P[id].n); return; }
  if ((b = q('[data-rappel]'))) { const r = RAPPELS.find((x) => x.id === b.dataset.rappel); r.fait = !r.fait; rendre(); return; }
  if ((b = q('[data-vote]'))) { const m = conv(S.id).msgs.find((x) => x.id === b.dataset.vote), k = +b.dataset.k; if (m.v === k) { m.opts[k][1]--; m.v = null; } else { if (m.v != null) m.opts[m.v][1]--; m.opts[k][1]++; m.v = k; } rendre(); return; }
  if ((b = q('[data-jouer]'))) { const v = b.closest('.vocal'), joue = v.classList.toggle('joue'); b.innerHTML = joue ? '<svg viewBox="0 0 24 24"><path d="M8 5.500v13M16 5.500v13" stroke="currentColor" stroke-width="3" fill="none"/></svg>' : svg('jouer'); b.setAttribute('aria-label', joue ? 'Mettre en pause' : 'Écouter le message vocal');
    if (joue) setTimeout(() => { if (v.isConnected && v.classList.contains('joue')) { v.classList.remove('joue'); b.innerHTML = svg('jouer'); } }, 4000); return; }
  if ((b = q('[data-joint]'))) { const k = b.dataset.joint, c = conv(S.id); if (!c) return;
    if (k === 'sondage') { ouvrir(`${fTete('Sondage', 'Envoyer', 'data-action="sondage-ok"')}<label class="champ"><span>Question</span><input id="sd-q" placeholder="Quel jour vous convient ?" autofocus></label><label class="champ"><span>Réponses</span><input id="sd-1" placeholder="Lundi"></label><label class="champ"><input id="sd-2" placeholder="Mardi" aria-label="Deuxième réponse"></label><label class="champ"><input id="sd-3" placeholder="Une autre réponse (facultatif)" aria-label="Troisième réponse"></label>`); return; }
    fermer(); envoyer(c, k === 'photo' ? { type: 'photo', leg: '' } : k === 'fichier' ? { type: 'fichier', nom: 'Document.pdf', taille: '212 Ko' } : { type: 'position', t: 'Près de La Rochelle' }); return; }
  if ((b = q('[data-conv-regl]'))) { const c = conv(S.id), k = b.dataset.convRegl; c[k] = c[k] ? 0 : 1; b.setAttribute('aria-checked', String(!!c[k])); const cal = $('#calque').innerHTML; rendre(); $('#calque').innerHTML = cal; return; }
  if ((b = q('[data-filtre-appels]'))) { S.filtreAppels = b.dataset.filtreAppels; rendre(); return; }
  if ((b = q('[data-ag-vue]'))) { S.agVue = b.dataset.agVue; rendre(); return; }
  if ((b = q('[data-ag-sem]'))) { const d = +b.dataset.agSem; if (S.agVue === 'mois') { const r = jourDe(lundi(S.agSem) + 3); r.setMonth(r.getMonth() + d, 15); S.agSem = Math.round((r - jourDe(lundi(0) + 3)) / (7 * 864e5)); } else S.agSem += d; if (S.agVue === 'semaine') S.agJour = lundi(S.agSem) + (S.agSem === 0 ? -lundi(0) : 0); rendre(); return; }
  if ((b = q('[data-ag-jour]'))) { S.agJour = +b.dataset.agJour; rendre(); return; }
  if ((b = q('[data-ag-auj]'))) { S.agSem = 0; S.agJour = 0; rendre(); return; }
  if ((b = q('[data-regl]'))) { S.regl[b.dataset.regl] = !S.regl[b.dataset.regl]; rendre(); return; }
  if ((b = q('[data-theme-choix]'))) { S.theme = b.dataset.themeChoix; appliquerTheme(); rendre(); return; }
  if ((b = q('[data-statut]'))) { S.statut = b.dataset.statut; fermer(); rendre(); return; }
  if ((b = q('[data-cr-a]'))) { $$('[data-cr-a]').forEach((x) => x.setAttribute('aria-pressed', String(x === b))); if (S._cr) S._cr.a = b.dataset.crA; return; }
  if ((b = q('[data-pe-type]'))) { $$('[data-pe-type]').forEach((x) => x.setAttribute('aria-pressed', String(x === b))); const r = b.dataset.peType === 'reunion'; $('#pe-lieu-z').hidden = r; $('#pe-inv-z').hidden = !r; return; }
  if ((b = q('[data-pe-inv]'))) { b.setAttribute('aria-pressed', String(b.getAttribute('aria-pressed') !== 'true')); return; }
  /* — appel — */
  if ((b = q('[data-touche]'))) { toast('Touche ' + b.dataset.touche); return; }
  if ((b = q('[data-appel]'))) { const a = S.appel, k = b.dataset.appel; if (!a) return;
    if (k === 'raccrocher') { finAppel(); return; }
    if (k === 'repondre') { a.etat = 'cours'; a.etatOrigine = 'entrant'; a.t0 = Date.now(); }
    else if (k === 'muet') a.muet = !a.muet; else if (k === 'hp') a.hp = !a.hp; else if (k === 'camera') a.video = !a.video; else if (k === 'clavier') a.clavier = !a.clavier;
    else if (k === 'reduire') a.reduit = true; else if (k === 'revenir') a.reduit = false;
    else if (k === 'message') { a.reduit = true; peindreAppel(); const c = C.find((x) => x.avec === a.qui); aller('messages', c ? c.id : undefined); return; }
    else if (k === 'ajouter') { const qui = a.qui; S.appel = null; peindreAppel(); ouvrirSalle({ titre: 'Appel de groupe', invites: [[qui, 'oui'], ['sophie', 'oui']] }, true); toast('Sophie rejoint l’appel'); return; }
    peindreAppel(); return; }
  /* — réunion — */
  if ((b = q('[data-salle]'))) { const s = S.salle, k = b.dataset.salle; if (!s) return;
    if (k === 'entrer') { entrerSalle(); return; } if (k === 'annuler') { S.salle = null; $('#plein').innerHTML = ''; return; } if (k === 'quitter') { quitterSalle(); return; }
    if (k === 'micro' || k === 'cam' || k === 'flou' || k === 'main' || k === 'partage' || k === 'rec' || k === 'st' || k === 'verrou') { s[k] = !s[k]; if (k === 'rec') toast(s.rec ? 'Enregistrement démarré : tout le monde est prévenu' : 'Enregistrement arrêté'); if (k === 'verrou') toast(s.verrou ? 'Réunion verrouillée : plus personne n’entre' : 'Réunion déverrouillée'); }
    else if (k === 'volet') s.volet = b.dataset.v && s.volet !== b.dataset.v ? b.dataset.v : null;
    else if (k === 'reagir') { s.reac = ['👍', '👏', '❤️', '😂'][Math.floor(Math.random() * 4)]; setTimeout(() => { if (S.salle === s) { s.reac = null; majTuiles(); } }, 2400); majTuiles(); return; }
    else if (k === 'admettre') { s.attente = s.attente.filter((p) => p !== b.dataset.p); s.presents.push(b.dataset.p); toast(prenom(b.dataset.p) + ' a rejoint la réunion'); }
    else if (k === 'refuser') { s.attente = s.attente.filter((p) => p !== b.dataset.p); toast('Demande refusée'); }
    else if (k === 'inviter') { toast('Lien de la réunion copié'); return; } else if (k === 'tout-couper') { toast('Tous les micros sont coupés'); return; }
    else if (k === 'fichier') { const f = ['Planning semaine 47.pdf', 'Devis hall Les Minimes.pdf', 'Photos du chantier.zip'][s.fichiers.length % 3]; s.fichiers.push(f); s.chat.push({ de: 'moi', f }); s.volet = 'discussion'; toast('« ' + f + ' » envoyé à tous les participants'); }
    else if (k === 'chat-envoyer') { const i = $('#salle-msg'), t = i.value.trim(); if (!t) { i.focus(); toast('Écris ton message'); return; } s.chat.push({ de: 'moi', t }); }
    peindreSalle(); const ch = $('#salle-chat'); if (ch) ch.scrollTop = ch.scrollHeight; return; }
});
/* — clavier, saisie, recherche — */
document.addEventListener('input', (e) => {
  if (e.target.id === 'saisie') majEnvoi();
  if (e.target.id === 'salle-notes' && S.salle) { S.salle.notes = e.target.value; return; }
  if (e.target.id === 'pal') { $('#pal-res').innerHTML = palRes(e.target.value); return; }
  if (e.target.id === 'rech') { S.rech = e.target.value; if (S.vue === 'messages') $('#liste-conv').innerHTML = listeConvHtml(); else { const p = e.target.selectionStart; rendre(); const n = $('#rech'); n.focus(); n.setSelectionRange(p, p); } }
});
document.addEventListener('keydown', (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); if (!$('#pal')) ACTIONS.chercher(); return; }
  if (e.key === 'Escape') { if ($('.menu-ctx')) fermerMenu(); else if ($('#calque').innerHTML) fermer(); return; }
  if (e.key === 'Enter' && !e.shiftKey && e.target.id === 'saisie' && !TEL()) { e.preventDefault(); ACTIONS.envoyer(); }
  if (e.key === 'Enter' && e.target.id === 'salle-msg') { e.preventDefault(); $('[data-salle="chat-envoyer"]').click(); }
  if (e.key === 'Enter' && e.target.id === 'pal') { const r = $('#pal-res .rang'); if (r) r.click(); return; }
  if (e.key === 'Enter' && e.target.tagName === 'INPUT' && e.target.closest('.feuille')) { const ok = $('.feuille .f-tete .lien[data-action]'); if (ok) { e.preventDefault(); ok.click(); } }
});
/* le menu d'un message : clic droit à l'ordinateur, appui long au doigt */
document.addEventListener('contextmenu', (e) => { const b = e.target.closest('[data-msg]'); if (!b) return; e.preventDefault(); menuMessage(b, e.clientX, e.clientY); });
let _long = 0, _longFait = false;
document.addEventListener('touchstart', (e) => { const b = e.target.closest('[data-msg],#scene .evt[data-evt]'); _longFait = false; if (!b || e.touches.length > 1) return; const t = e.touches[0], x = t.clientX, y = t.clientY;
  _long = setTimeout(() => { _longFait = true; const r = b.getBoundingClientRect(); if (b.dataset.evt) menuEvt(evt(b.dataset.evt), x - 110, y + 10); else menuMessage(b, x - 110, r.bottom + 6); }, 480); }, { passive: true });
['touchmove', 'touchend', 'touchcancel'].forEach((n) => document.addEventListener(n, () => clearTimeout(_long), { passive: true }));
/* le clic qui suit le relâcher d'un appui long tomberait sur le menu qui vient de s'ouvrir sous le doigt : on avale celui-là, et lui seul */
document.addEventListener('click', (e) => { if (_longFait) { _longFait = false; e.stopPropagation(); e.preventDefault(); } }, true);
/* une feuille se tire vers le bas pour la fermer (téléphone) */
let _tire = null;
document.addEventListener('touchstart', (e) => { const f = e.target.closest('.feuille'); if (!f || !TEL() || f.scrollTop > 0 || e.target.closest('input,textarea,select')) return; _tire = { f, y: e.touches[0].clientY, d: 0 }; }, { passive: true });
document.addEventListener('touchmove', (e) => { if (!_tire) return; _tire.d = Math.max(0, e.touches[0].clientY - _tire.y); _tire.f.style.transform = `translateY(${_tire.d}px)`; _tire.f.style.transition = 'none'; }, { passive: true });
document.addEventListener('touchend', () => { if (!_tire) return; const t = _tire; _tire = null; t.f.style.transition = 'transform .25s'; if (t.d > 110) fermer(); else t.f.style.transform = ''; }, { passive: true });
/* la zone de saisie reste au-dessus du clavier : la page se cale sur la hauteur réellement visible */
if (window.visualViewport) { const cale = () => document.documentElement.style.setProperty('--haut', Math.round(visualViewport.height) + 'px'); visualViewport.addEventListener('resize', cale); cale(); }

/* ══ L'AGENDA SE MANIE À LA MAIN (17 novembre 2026, Justin : « un super système pour gérer les rendez-vous ; si on décale, les autres reçoivent une
   notification, pareil pour les annulations ; clic droit, et rester cliqué pour déplacer »). ══ */
const hm = (m) => String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
/* prévenir les invités d'un décalage ou d'une annulation : leur réponse repasse « en attente » (ils doivent revalider le nouvel horaire) */
function prevenir(e, quoi) { const inv = e.invites || []; if (!inv.length) return ''; const noms = inv.map((i) => prenom(i[0])), qui = noms.length > 2 ? noms.slice(0, 2).join(', ') + ' et ' + (noms.length - 2) + ' autre' + (noms.length > 3 ? 's' : '') : noms.join(' et ');
  if (quoi !== 'annule') inv.forEach((i) => { i[1] = 'attente'; });
  notifier(quoi === 'annule' ? 'Réunion annulée' : 'Réunion décalée', '« ' + e.titre + ' »' + (quoi === 'annule' ? '' : ' passe à ' + jourCourt(e.j).toLowerCase() + ' ' + e.deb) + ' · ' + qui + (inv.length > 1 ? ' sont prévenus' : ' est prévenu')); return qui; }
function deplacerEvt(e, j, deb) { const dur = minutes(e.fin) - minutes(e.deb), m = Math.max(0, Math.min(24 * 60 - dur, minutes(deb))); if (e.j === j && e.deb === hm(m)) { rendre(); return; }
  e.j = j; e.deb = hm(m); e.fin = hm(m + dur); S.agJour = j; rendre(); if (!prevenir(e, 'decale')) toast('Déplacé : ' + jourCourt(j).toLowerCase() + ' à ' + e.deb); }
/* le menu d'un événement (clic droit, ou appui long au doigt) ; sur une case vide de la grille : créer là */
function menuLibre(x, y, html, pour) { fermerMenu(); const d = document.createElement('div'); d.className = 'menu-ctx'; d.setAttribute('role', 'menu'); d.dataset.pour = pour || ''; d.innerHTML = html; document.body.appendChild(d);
  const r = d.getBoundingClientRect(); d.style.left = Math.max(8, Math.min(x, innerWidth - r.width - 8)) + 'px'; d.style.top = Math.max(8, Math.min(y, innerHeight - r.height - 8)) + 'px'; return d; }
function menuEvt(e, x, y) { const l = (k, t, ic, cls) => `<button class="l ${cls || ''}" data-ectx="${k}">${t}${svg(ic)}</button>`;
  menuLibre(x, y, l('ouvrir', 'Ouvrir', 'info') + (e.type === 'reunion' && !e.passe ? l('rejoindre', 'Rejoindre', 'video') : '') + (e.passe ? '' : l('modifier', 'Modifier', 'stylo') + l('plus1h', 'Décaler d’une heure', 'horloge') + l('demain', 'Reporter au lendemain', 'agenda') + l('dupliquer', 'Dupliquer', 'copier') + l('annuler', e.invites && e.invites.length ? 'Annuler la réunion' : 'Supprimer', 'corbeille', 'r')), e.id); }
document.addEventListener('contextmenu', (ev) => { const b = ev.target.closest('#scene [data-evt]'), col = !b && ev.target.closest('.g-col'); if (!b && !col) return; ev.preventDefault();
  if (b) { menuEvt(evt(b.dataset.evt), ev.clientX, ev.clientY); return; }
  const r = col.getBoundingClientRect(), m = Math.floor(((ev.clientY - r.top) / (r.height / GH) * 60) / 30) * 30 + G0 * 60, j = lundi(S.agSem) + $$('.g-col').indexOf(col);
  const d = menuLibre(ev.clientX, ev.clientY, (S.mode === 'pro' ? `<button class="l" data-ectx="neuf" data-type="reunion">Nouvelle réunion à ${hm(m)}${svg('video')}</button>` : '') + `<button class="l" data-ectx="neuf" data-type="rdv">Nouveau rendez-vous à ${hm(m)}${svg('agenda')}</button>`); d.dataset.j = j; d.dataset.m = m; });
document.addEventListener('click', (ev) => { const b = ev.target.closest('[data-ectx]'); if (!b) return; const mn = b.closest('.menu-ctx'), k = b.dataset.ectx, e = evt(mn.dataset.pour); ev.stopPropagation(); fermerMenu();
  if (k === 'neuf') { const m = +mn.dataset.m; feuilleProgrammer({ type: b.dataset.type, j: +mn.dataset.j, deb: hm(m), fin: hm(m + (b.dataset.type === 'reunion' ? 30 : 60)) }); return; }
  if (!e) return;
  if (k === 'ouvrir') ouvrir(`${fTeteOk(TYPES_E[e.type][0])}${ficheEvt(e)}`); else if (k === 'rejoindre') ouvrirSalle(e); else if (k === 'modifier') feuilleProgrammer(e);
  else if (k === 'plus1h') deplacerEvt(e, e.j, hm(minutes(e.deb) + 60)); else if (k === 'demain') deplacerEvt(e, e.j + 1, e.deb);
  else if (k === 'dupliquer') { EVTS.push(Object.assign({}, e, { id: uid(), j: e.j + 7, invites: e.invites ? e.invites.map((i) => [i[0], 'attente']) : undefined, cr: undefined, invitation: undefined })); rendre(); toast('Dupliqué : une semaine plus tard'); }
  else if (k === 'annuler') ACTIONS['evt-supprimer']({ dataset: { id: e.id } }); }, true);
/* rester cliqué sur un bloc de la grille et le glisser : il suit, par quarts d'heure, d'un jour à l'autre. Au doigt : tenir un instant avant de bouger. */
let _gl = null, _glFait = false;
document.addEventListener('pointerdown', (ev) => { const b = ev.target.closest && ev.target.closest('.bloc-g'); if (!b || ev.button) return; const e = evt(b.dataset.evt); if (!e || e.passe) return;
  _gl = { b, e, x: ev.clientX, y: ev.clientY, dy: ev.clientY - b.getBoundingClientRect().top, actif: false, tactile: ev.pointerType === 'touch', t: Date.now(), hh: b.parentElement.getBoundingClientRect().height / GH, dur: minutes(e.fin) - minutes(e.deb) }; });
document.addEventListener('pointermove', (ev) => { const g = _gl; if (!g) return;
  if (!g.actif) { if (Math.hypot(ev.clientX - g.x, ev.clientY - g.y) < 6) return; if (g.tactile && Date.now() - g.t < 280) { _gl = null; return; } g.actif = true; g.b.classList.add('glisse'); fermerMenu(); }
  const cols = $$('.g-col'), k = cols.findIndex((c) => { const r = c.getBoundingClientRect(); return ev.clientX >= r.left && ev.clientX < r.right; }); if (k < 0) return; const c = cols[k], r = c.getBoundingClientRect();
  const m = Math.max(G0 * 60, Math.min((G0 + GH) * 60 - g.dur, Math.round(((ev.clientY - g.dy - r.top) / g.hh * 60) / 15) * 15 + G0 * 60)); g.k = k; g.m = m;
  if (g.b.parentElement !== c) c.appendChild(g.b); g.b.style.top = `calc(var(--hh) * ${(m - G0 * 60) / 60} + 1px)`; const s = $('span', g.b); if (s) s.textContent = hm(m) + ' – ' + hm(m + g.dur); });
const _glFin = (ev) => { const g = _gl; _gl = null; if (!g || !g.actif) return; _glFait = true; setTimeout(() => { _glFait = false; }, 60);
  if (ev.type === 'pointercancel' || g.k == null) { rendre(); return; } deplacerEvt(g.e, lundi(S.agSem) + g.k, hm(g.m)); };
document.addEventListener('pointerup', _glFin); document.addEventListener('pointercancel', _glFin);
/* le clic qui suit un glissement ouvrirait la fiche : on l'avale */
document.addEventListener('click', (ev) => { if (_glFait) { _glFait = false; ev.stopPropagation(); ev.preventDefault(); } }, true);

/* les deux heures de travail : une heure s'enregistre quand on la lâche ; début = fin n'est pas une plage */
document.addEventListener('change', (e) => { const x = e.target; if (x.id !== 'hp-debut' && x.id !== 'hp-fin') return; const d = $('#hp-debut').value, f = $('#hp-fin').value;
  if (!d || !f || d >= f) { toast('La fin doit venir après le début'); rendre(); return; } S.hp.debut = d; S.hp.fin = f; _coteHoraire = dansHeures() ? 'pro' : 'perso'; rendre(); const n = $('#' + x.id); if (n) n.focus({ preventScroll: true }); });
_coteHoraire = dansHeures() ? 'pro' : 'perso'; document.documentElement.dataset.cote = S.mode; setInterval(horaireAppliquer, 20000);

/* ── départ ── */
appliquerTheme(); lireAdresse(); rendre();
