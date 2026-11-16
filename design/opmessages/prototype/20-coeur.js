/* ══ LE CŒUR : les données d'exemple, l'état, la navigation, les feuilles, les bannières ══
   Tout est fictif (« Clim Services 17 », adresses en .example) ; rien ne part sur un réseau, rien ne s'enregistre. */
Object.assign(IC, {
  personne: '<circle cx="12" cy="8.500" r="4"/><path d="M4.500 20c.9-3.700 3.900-5.700 7.500-5.700s6.600 2 7.500 5.700"/>',
  photo: '<rect x="3" y="5" width="18" height="14" rx="3"/><circle cx="8.500" cy="10" r="1.700"/><path d="m4 17 5-4.500 4 3.500 3-2.500 4.500 4"/>',
  appareil: '<path d="M4 8.500A2 2 0 0 1 6 6.500h2l1.500-2h5l1.500 2h2a2 2 0 0 1 2 2V17a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z"/><circle cx="12" cy="12.500" r="3.300"/>',
  position: '<path d="M12 21s-6.500-5.800-6.500-11a6.500 6.500 0 0 1 13 0c0 5.200-6.500 11-6.500 11z"/><circle cx="12" cy="10" r="2.300"/>',
  copier: '<rect x="8" y="8" width="12" height="12" rx="2.500"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
  clavier: '<circle cx="6" cy="6" r="1.200"/><circle cx="12" cy="6" r="1.200"/><circle cx="18" cy="6" r="1.200"/><circle cx="6" cy="12" r="1.200"/><circle cx="12" cy="12" r="1.200"/><circle cx="18" cy="12" r="1.200"/><circle cx="6" cy="18" r="1.200"/><circle cx="12" cy="18" r="1.200"/><circle cx="18" cy="18" r="1.200"/>',
  info: '<circle cx="12" cy="12" r="8.500"/><path d="M12 11v5.500M12 7.800h.01"/>',
  sortie: '<path d="M14 4.500h3.500a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H14M10 8l-4 4 4 4M6 12h9"/>',
  lune: '<path d="M19.500 14.500A8 8 0 0 1 9.500 4.500a8 8 0 1 0 10 10z"/>',
  etoile: '<path d="m12 3.500 2.600 5.400 5.900.8-4.300 4.100 1 5.900-5.200-2.800-5.200 2.800 1-5.900-4.300-4.100 5.900-.8z"/>',
});
const svg = (k) => '<svg viewBox="0 0 24 24" aria-hidden="true">' + (IC[k] || '') + '</svg>';
const $ = (s, r) => (r || document).querySelector(s), $$ = (s, r) => [...(r || document).querySelectorAll(s)];
const esc = (t) => String(t == null ? '' : t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
let _uid = 0; const uid = () => 'x' + (++_uid);
const TEL = () => matchMedia('(max-width:760px)').matches;

/* ── les personnes ── */
const P = {
  moi:    { n: 'Julie Martin', r: 'Gérante', a: ['#4f78d6', '#2a4a9c'], tel: '06 00 00 00 10', mel: 'julie@clim-services-17.example' },
  karim:  { n: 'Karim Benali', r: 'Technicien', eq: 1, st: 'occ', stt: 'En déplacement jusqu’à 11 h', a: ['#59b98a', '#1f6e9c'], tel: '06 00 00 00 11', mel: 'karim@clim-services-17.example' },
  leo:    { n: 'Léo Faure', r: 'Technicien', eq: 1, st: 'ok', stt: 'Disponible', a: ['#f08a5d', '#d6336c'], tel: '06 00 00 00 12', mel: 'leo@clim-services-17.example' },
  sophie: { n: 'Sophie Renard', r: 'Assistante', eq: 1, st: 'ok', stt: 'Disponible', a: ['#a26be0', '#4b3fb0'], tel: '06 00 00 00 13', mel: 'sophie@clim-services-17.example' },
  ines:   { n: 'Inès Garnier', r: 'Apprentie', eq: 1, st: 'abs', stt: 'Absente aujourd’hui', a: ['#3fb6c9', '#3a55b4'], tel: '06 00 00 00 14', mel: 'ines@clim-services-17.example' },
  marc:   { n: 'Marc Dubois', r: 'Boulangerie Dubois', soc: 'Client', a: ['#8e8e93', '#55555a'], tel: '06 00 00 00 21', mel: 'marc@boulangerie-dubois.example' },
  james:  { n: 'James Carter', r: 'Hôtel des Remparts', soc: 'Client', a: ['#4aa3e8', '#3856c9'], tel: '06 00 00 00 22', mel: 'j.carter@hotel-remparts.example' },
  thomas: { n: 'Thomas Girard', r: 'Froid Atlantique', soc: 'Fournisseur', a: ['#f5a64a', '#d9622b'], tel: '06 00 00 00 23', mel: 'thomas@froid-atlantique.example' },
  camille:{ n: 'Camille Roy', r: 'Cabinet Roy', soc: 'Comptable', a: ['#5fbf7f', '#23764a'], tel: '06 00 00 00 24', mel: 'camille@cabinet-roy.example' },
};
Object.keys(P).forEach((k) => { P[k].id = k; });
const prenom = (k) => (P[k] ? P[k].n.split(' ')[0] : '');
const initiales = (n) => n.replace(/^#\s*/, '').split(/\s+/).map((m) => m[0]).slice(0, 2).join('').toUpperCase();
function av(k, cls, point) { const p = P[k]; if (!p) return '';
  return `<span class="av ${cls || ''}" style="--a1:${p.a[0]};--a2:${p.a[1]}" aria-hidden="true">${initiales(p.n)}${point && p.st ? `<u class="${p.st}"></u>` : ''}</span>`; }

/* ── les conversations (j : jours depuis aujourd'hui ; les plus récents en bas) ── */
const C = [
  { id: 'equipe', n: 'Équipe terrain', canal: 1, epingle: 1, membres: ['karim', 'leo', 'sophie', 'ines'], a: ['#4f78d6', '#2a4a9c'], nl: 3, msgs: [
    { de: 'sophie', j: -1, h: '17:42', t: 'Le planning de demain est à jour : deux dépannages le matin, l’entretien de l’hôtel l’après-midi.' },
    { de: 'leo', j: -1, h: '17:50', t: 'Vu. Je prends le dépannage de la rue des Halles.', reac: ['👍'] },
    { de: 'karim', j: 0, h: '08:05', type: 'vocal', d: '0:42' },
    { de: 'karim', j: 0, h: '08:06', type: 'photo', leg: 'Plaque du compresseur' },
    { de: 'sophie', j: 0, h: '08:20', t: 'Je demande le prix au fournisseur tout de suite.' },
    { de: 'sophie', j: 0, h: '08:41', type: 'sondage', q: 'Repas d’équipe de décembre', opts: [['Vendredi 11', 2], ['Vendredi 18', 1]], v: null },
    { de: 'leo', j: 0, h: '09:20', t: 'Je passe au dépôt à midi, quelqu’un a besoin de quelque chose ?' }] },
  { id: 'general', n: 'Général', canal: 1, membres: ['karim', 'leo', 'sophie', 'ines'], a: ['#8e8e93', '#55555a'], nl: 0, msgs: [
    { de: 'moi', j: -3, h: '09:00', t: 'Bienvenue à Inès, qui nous rejoint en apprentissage cette semaine.', reac: ['👏', '❤️'] },
    { de: 'sophie', j: -1, h: '10:12', t: 'Réunion d’équipe demain à 14 h, en visio pour ceux qui sont sur la route.' }] },
  { id: 'karim', avec: 'karim', epingle: 1, nl: 1, msgs: [
    { de: 'moi', j: -1, h: '16:13', t: 'Dépannage de la chambre froide à la boulangerie Dubois, demain à 8 h.' },
    { de: 'karim', j: -1, h: '16:20', t: 'Oui, c’est noté.' },
    { de: 'karim', j: 0, h: '09:03', t: 'Compresseur hors service, il faut le remplacer. Je t’ai mis la photo dans le canal.' }] },
  { id: 'sophie', avec: 'sophie', epingle: 1, nl: 0, msgs: [
    { de: 'sophie', j: 0, h: '08:15', type: 'fichier', nom: 'Planning semaine 47.pdf', taille: '184 Ko' },
    { de: 'moi', j: 0, h: '08:18', t: 'Merci Sophie, parfait.', lu: '08:19' }] },
  { id: 'marc', avec: 'marc', nl: 2, msgs: [
    { de: 'marc', j: 0, h: '07:48', t: 'Bonjour, la chambre froide est à 9 °C ce matin. Vous pouvez venir en urgence ?' },
    { de: 'moi', j: 0, h: '07:52', t: 'Bonjour Marc, Karim sera chez vous à 8 h.', lu: '07:53' },
    { de: 'marc', j: 0, h: '09:10', t: 'Merci. Votre technicien parle d’un compresseur à changer, vous pouvez m’envoyer le prix ?' },
    { de: 'marc', j: 0, h: '09:11', t: 'Et ce serait possible demain matin avant 6 h ? On ouvre à 6 h 30.' }] },
  { id: 'james', avec: 'james', nl: 1, msgs: [
    { de: 'james', j: 0, h: '08:55', t: 'Hello Julie, could you start the maintenance on the third floor first? We have guests arriving at 5 pm.' }] },
  { id: 'thomas', avec: 'thomas', nl: 0, msgs: [
    { de: 'moi', j: 0, h: '08:30', t: 'Bonjour Thomas, il me faut un compresseur ZB45 au plus vite. Prix et délai ?' },
    { de: 'thomas', j: 0, h: '08:58', t: '1 480 € HT, en stock, livré demain avant 10 h.' }] },
  { id: 'camille', avec: 'camille', nl: 0, sourdine: 1, msgs: [
    { de: 'camille', j: -4, h: '15:30', t: 'Les pièces du trimestre sont bien arrivées.' },
    { de: 'moi', j: -4, h: '15:41', t: 'Merci, je m’en occupe lundi.', lu: 'lundi' }] },
];
C.forEach((c) => c.msgs.forEach((m) => { m.id = uid(); }));
const conv = (id) => C.find((c) => c.id === id);
const convNom = (c) => (c.avec ? P[c.avec].n : c.n);
const convAv = (c, cls) => (c.avec ? av(c.avec, cls, true) : `<span class="av ${cls || ''}" style="--a1:${c.a[0]};--a2:${c.a[1]}" aria-hidden="true">#</span>`);
const apercu = (m) => (m.type === 'vocal' ? 'Message vocal · ' + m.d : m.type === 'photo' ? 'Photo' + (m.leg ? ' · ' + m.leg : '') : m.type === 'sondage' ? 'Sondage · ' + m.q : m.type === 'fichier' ? m.nom : m.type === 'position' ? 'Position partagée' : m.type === 'sys' ? m.t : m.t);
const dernier = (c) => c.msgs[c.msgs.length - 1];

/* ── les appels ── */
const APPELS = [
  { id: 'a1', qui: 'marc', sens: 'manque', j: 0, h: '07:41' },
  { id: 'a2', qui: 'karim', sens: 'entrant', j: 0, h: '08:02', duree: '3 min' },
  { id: 'a3', qui: 'thomas', sens: 'sortant', j: 0, h: '08:27', duree: '1 min' },
  { id: 'a4', qui: 'james', sens: 'entrant', video: 1, j: -1, h: '15:10', duree: '24 min' },
  { id: 'a5', qui: 'camille', sens: 'manque', j: -1, h: '11:32' },
  { id: 'a6', qui: 'sophie', sens: 'sortant', j: -2, h: '17:05', duree: '6 min' },
  { id: 'a7', qui: 'leo', sens: 'entrant', video: 1, j: -3, h: '12:20', duree: '2 min' },
];

/* ── l'agenda : réunions, rendez-vous, événements ── */
const TYPES_E = { reunion: ['Réunion', '#2a4a9c'], rdv: ['Rendez-vous', '#1c7a3a'], evt: ['Événement', '#a05a00'] };
const EVTS = [
  { id: 'e0', type: 'reunion', titre: 'Visio client · Hôtel des Remparts', j: 0, deb: '10:00', fin: '10:30', invites: [['james', 'oui'], ['sophie', 'oui']], rappel: 15, odj: ['Planning de l’entretien annuel', 'Accès au troisième étage', 'Date de la prochaine visite'] },
  { id: 'e1', type: 'reunion', titre: 'Point d’équipe', j: 0, deb: '14:00', fin: '14:30', invites: [['karim', 'oui'], ['leo', 'oui'], ['sophie', 'oui'], ['ines', 'attente']], rappel: 15, repete: 'Chaque semaine', odj: ['Chantiers de la semaine', 'Stock et commandes', 'Questions diverses'] },
  { id: 'e2', type: 'rdv', titre: 'Entretien annuel · Hôtel des Remparts', j: 0, deb: '15:00', fin: '18:00', lieu: '12 rue des Remparts, La Rochelle', rappel: 60 },
  { id: 'e3', type: 'rdv', titre: 'Remplacement du compresseur', j: 1, deb: '05:00', fin: '07:00', lieu: 'Boulangerie Dubois, 4 rue des Halles', rappel: 60 },
  { id: 'e4', type: 'reunion', titre: 'Bilan du trimestre', j: 2, deb: '09:30', fin: '10:30', invites: [['camille', 'oui'], ['sophie', 'attente']], rappel: 1440 },
  { id: 'e5', type: 'evt', titre: 'Salon du froid · Nantes', j: 4, deb: '09:00', fin: '18:00', lieu: 'Parc des expositions, Nantes', rappel: 1440 },
  { id: 'e6', type: 'reunion', titre: 'Lancement du chantier Les Minimes', j: -2, deb: '11:00', fin: '11:45', invites: [['karim', 'oui'], ['leo', 'oui'], ['sophie', 'oui']], passe: 1,
    cr: { duree: '42 min', decisions: ['Début du chantier lundi 23', 'Karim référent sur place'], actions: [['Commander les trois unités murales', 'sophie'], ['Réserver la nacelle', 'leo']] } },
];
const evt = (id) => EVTS.find((e) => e.id === id);
const RAPPELS = [
  { id: 'r1', t: 'Envoyer le prix du compresseur à Marc Dubois', j: 0, fait: false },
  { id: 'r2', t: 'Rappeler Camille Roy (comptable)', j: 0, fait: false },
  { id: 'r3', t: 'Valider les congés de décembre', j: 2, fait: false },
];

/* ── l'état ── */
const S = { vue: 'accueil', id: null, theme: 'auto', statut: 'ok', filtreAppels: 'tous', agVue: 'semaine', agSem: 0, agJour: 0, rech: '', rep: null, appel: null, salle: null,
  regl: { notif: true, heuresPro: true, pauseReunion: true, lecture: true, enligne: true, apercuNotif: true } };
const STATUTS = { ok: ['Disponible', ''], occ: ['Occupée', 'occ'], npd: ['Ne pas déranger', 'npd'], abs: ['Absente', 'abs'] };
const NAV = [['accueil', 'groupe', 'Tableau de bord', 'Accueil'], ['messages', 'bulle', 'Messages'], ['contacts', 'contacts', 'Contacts'], ['appels', 'tel', 'Appels'], ['reunions', 'video', 'Réunions'], ['agenda', 'agenda', 'Agenda'], ['courrier', 'mail', 'Courrier']];
const VUES = {};
const nonLus = () => C.reduce((n, c) => n + (c.nl || 0), 0);
const manques = () => APPELS.filter((a) => a.sens === 'manque' && !a.vu).length;
const COUR = { inst: null, nl: 0, montage: false };
const compte = (k) => (k === 'messages' ? nonLus() : k === 'appels' ? manques() : k === 'courrier' ? COUR.nl : 0);

/* ── le temps ── */
const auj = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
const jourDe = (j) => { const d = auj(); d.setDate(d.getDate() + j); return d; };
const fmt = (d, o) => new Intl.DateTimeFormat('fr-FR', o).format(d);
const maj1 = (t) => t.charAt(0).toUpperCase() + t.slice(1);
const jourLong = (j) => maj1(fmt(jourDe(j), { weekday: 'long', day: 'numeric', month: 'long' }));
const jourCourt = (j) => (j === 0 ? 'Aujourd’hui' : j === -1 ? 'Hier' : j === 1 ? 'Demain' : j > -7 && j < 0 ? maj1(fmt(jourDe(j), { weekday: 'long' })) : fmt(jourDe(j), { day: 'numeric', month: 'short' }));
const quand = (m) => (m.j === 0 ? m.h : jourCourt(m.j));
/* l'heure du prototype : il est 9 h 42 à l'ouverture (les données d'exemple racontent une matinée), puis le temps passe pour de vrai */
const _t0 = Date.now();
const hMaintenant = () => { const m = 9 * 60 + 42 + Math.floor((Date.now() - _t0) / 60000); return String(Math.floor(m / 60) % 24).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0'); };
const minutes = (h) => +h.slice(0, 2) * 60 + +h.slice(3);
const lundi = (sem) => { const d = auj(), k = (d.getDay() + 6) % 7; return -k + sem * 7; };       // le décalage (en jours) du lundi de la semaine visée

/* ── la navigation : #vue ou #vue/identifiant ── */
function lireAdresse() { const p = location.hash.slice(1).split('/'); S.vue = VUES[p[0]] ? p[0] : 'accueil'; S.id = p[1] ? decodeURIComponent(p[1]) : null; }
function aller(vue, id) { const h = '#' + vue + (id ? '/' + encodeURIComponent(id) : ''); if (location.hash === h) rendre(); else location.hash = h; }
/* la touche Retour (Android, navigateur) ferme aussi la feuille ouverte */
window.addEventListener('hashchange', () => { if ($('#calque').innerHTML) fermer(); fermerMenu(); lireAdresse(); rendre(); });
function menuHtml() {
  return `<div class="marque"><i>OP<br>MSG</i><span>OP MESSAGES</span><em>PRO</em></div><nav class="nav" aria-label="Rubriques">${NAV.map((n) => { const c = compte(n[0]);
    return `<a href="#${n[0]}" ${S.vue === n[0] ? 'aria-current="page"' : ''} title="${n[2]}">${svg(n[1])}<b>${n[2]}</b>${c ? `<span class="n">${c}</span>` : ''}</a>`; }).join('')}</nav>
    <a class="moi" href="#profil" ${S.vue === 'profil' ? 'aria-current="page"' : ''} aria-label="Mon profil et mes réglages">${av('moi', 'm')}<span><b class="coupe">${esc(P.moi.n)}</b><span class="statut ${STATUTS[S.statut][1]}"><i></i>${STATUTS[S.statut][0]}</span></span>${svg('chev')}</a>`;
}
function ongletsHtml() { return NAV.map((n) => { const c = compte(n[0]); return `<a href="#${n[0]}" ${S.vue === n[0] ? 'aria-current="page"' : ''} aria-label="${n[2]}">${svg(n[1])}<span>${n[3] || n[2]}</span>${c ? `<em>${c}</em>` : ''}</a>`; }).join(''); }
function majMenu() { $('#cote').innerHTML = menuHtml(); $('#onglets').innerHTML = ongletsHtml(); }
/* le grand titre du téléphone (avec l'avatar qui mène au Profil, comme l'App Store) et la barre du bureau : le même contenu, deux formes */
function tete(titre, gestes, sous) {
  return `<div class="barre"><h1>${titre}</h1>${gestes || ''}</div><div class="grand"><h2>${titre}</h2><a href="#profil" aria-label="Mon profil et mes réglages">${av('moi', 'm')}</a></div>${sous ? `<p class="gris" style="padding:0 20px 4px" data-sous>${sous}</p>` : ''}`; }
function rendre() {
  const v = VUES[S.vue](), sc = $('#scene'), garde = sc.dataset.cle === S.vue + '/' + (S.id || '') ? $$('.defile,.fil', sc).map((e) => e.scrollTop) : null;
  sc.className = (v.deux ? 'deux ' : '') + (v.deux && S.id ? 'ouvert' : ''); sc.dataset.cle = S.vue + '/' + (S.id || ''); sc.innerHTML = v.html;
  if (garde) $$('.defile,.fil', sc).forEach((e, i) => { if (garde[i] != null) e.scrollTop = garde[i]; });
  document.body.classList.toggle('sans-onglets', S.vue === 'messages' && !!S.id);
  majMenu(); placerCourrier(); if (v.apres) v.apres();
}

/* ── feuilles ── */
let _declencheur = null;
function ouvrir(html) { _declencheur = document.activeElement; $('#calque').innerHTML = `<div class="feuille" role="dialog" aria-modal="true"><span class="poignee"></span>${html}</div>`; const f = $('#calque [autofocus]'); if (f && !TEL()) f.focus(); }
function fermer() { $('#calque').innerHTML = ''; fermerMenu(); if (_declencheur && _declencheur.isConnected) _declencheur.focus({ preventScroll: true }); _declencheur = null; }
const fTete = (titre, ok, okAttr) => `<div class="f-tete"><button class="lien" data-ferme>Annuler</button><h2>${titre}</h2>${ok ? `<button class="lien" ${okAttr}>${ok}</button>` : '<span class="lien"></span>'}</div>`;
const fTeteOk = (titre) => `<div class="f-tete"><span class="lien"></span><h2>${titre}</h2><button class="lien" data-ferme>OK</button></div>`;
function fermerMenu() { const m = $('.menu-ctx'); if (m) m.remove(); }

/* ── toast et bannière ── */
let _toast = 0;
function toast(t) { const e = $('#toast'); e.textContent = t; e.classList.add('on'); clearTimeout(_toast); _toast = setTimeout(() => e.classList.remove('on'), 2600); }
function notifier(titre, texte, go) {
  const b = document.createElement('button'); b.className = 'banniere'; b.innerHTML = `<i>${svg('bulle')}</i><span><b>${esc(titre)}<small>maintenant</small></b><p>${esc(texte)}</p></span>`;
  const sortir = () => { b.classList.add('sort'); setTimeout(() => b.remove(), 280); };
  b.addEventListener('click', () => { sortir(); if (go) go(); }); $('#notif').appendChild(b); setTimeout(sortir, 4200);
}

/* ── jour et nuit : en production, l'application suit l'appareil ; le réglage n'existe que dans ce prototype ── */
function appliquerTheme() { const nuit = S.theme === 'dark' || (S.theme === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches); document.documentElement.dataset.theme = nuit ? 'dark' : 'light';
  const m = $('meta[name="theme-color"]'); if (m) m.content = nuit ? '#0b1633' : '#f2f2f7'; if (COUR.inst && COUR.inst.rafraichir) COUR.inst.rafraichir({ donnees: false }); }
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', appliquerTheme);
const themeHote = () => (document.documentElement.dataset.theme === 'dark' ? 'nuit' : 'jour');
