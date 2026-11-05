/* test-3293 — GÉRER LES BOÎTES MAIL ET SE CONNECTER AVEC GOOGLE / MICROSOFT / « AUTRE MESSAGERIE » (v803, bêta, 5 novembre 2026).
 *
 * Justin, mot pour mot : « un système de déconnexion des boîtes mail, parce que là, je sais pas comment on fait […] dans les réglages, ça
 * regroupe toutes les boîtes mail connectées et on peut les déconnecter de là » ; « j'ai toujours pas le bouton de connexion Google ou
 * Hotmail ou iCloud dans les boîtes mail ».
 *
 * Trois choses gardées, chacune par ce qu'elle LAISSE PASSER et non par la phrase qui la décrit :
 *   1. la feuille « Ajouter une boîte mail » du module partagé `opcourrier.js` : trois boutons (Google, Microsoft, Autre messagerie), seulement
 *      quand l'HÔTE le déclare (`boutonsFournisseurs`) — OP MESSAGES ne le déclare pas et garde sa feuille ; un fournisseur fermé est
 *      GRISÉ et sa raison écrite ; l'autorisation s'ouvre DANS le geste (rien d'attendu entre le clic et la source : Safari bloque sinon) ;
 *   2. le lien « Gérer les boîtes » du Courrier (`gererBoites`, déclaré ET méthode présente) ;
 *   3. la gestion d'`app.html` — les VRAIES fonctions, exécutées avec un `fetch` imité : les TROIS états de `_mailboxes` (liste, vide, null),
 *      « Déconnecter » (`/api/mailbox/disconnect`, `enteteEquipe`, `r.ok` lu, liste RELUE avant de dire « déconnectée »), qui peut (administrateur).
 * Les motifs visent le CODE : les commentaires de ce dépôt citent tout ce qu'on cherche (CLAUDE.md : « un motif de banc doit viser du code »).
 * Ce que ce banc ne voit pas — la mise en page, le doigt, le jour et la nuit — se mesure au navigateur : scratchpad/sonde-boites-mail.js (captures relues).
 */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const R = path.join(__dirname, '..');
let ok = 0, ko = 0;
const vrai = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '  → ' + (typeof d === 'string' ? d : JSON.stringify(d)).slice(0, 400) : '')); } };
const egal = (t, a, b) => vrai(t, JSON.stringify(a) === JSON.stringify(b), [a, b]);
const sansCom = s => s.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
const APP = sansCom(fs.readFileSync(path.join(R, 'app.html'), 'utf8')), MOD = sansCom(fs.readFileSync(path.join(R, 'opcourrier.js'), 'utf8'));
/* une tranche qui ne se trouve pas est une tranche VIDE, et une tranche vide passe au vert sur tout : on prouve d'abord qu'elle existe */
function entre(src, a, b, nom) { const i = src.indexOf(a); const j = i < 0 ? -1 : src.indexOf(b, i + a.length); vrai('(la tranche « ' + nom + ' » est trouvée)', i >= 0 && j > i, [i, j]); return i >= 0 && j > i ? src.slice(i, j) : ''; }
const DE = (s, re) => re.test(s);

/* ═════ 1. LA FEUILLE « AJOUTER UNE BOÎTE MAIL » (opcourrier.js) ═════ */
console.log('\n1. La feuille : trois gros boutons, seulement si l\'hôte le déclare');
const FEUILLE = entre(MOD, 'function openAddAccount(){', 'function openProviderList(){', 'openAddAccount');
vrai('population : la feuille est lue en entier (plus de 3 000 caractères)', FEUILLE.length > 3000, FEUILLE.length);
vrai('le bouton « Se connecter avec Google » existe (id aQG)', /quickRow\("aQG",pG,"Se connecter avec Google"/.test(FEUILLE));
vrai('le bouton « Se connecter avec Microsoft » existe (id aQM)', /quickRow\("aQM",pM,"Se connecter avec Microsoft"/.test(FEUILLE));
vrai('le bouton « Autre messagerie » existe (id aQO) et ouvre le formulaire adresse + mot de passe (#aAutre)', /id="aQO"[^>]*aria-controls="aAutre"/.test(FEUILLE) && /<b>Autre messagerie<\/b>/.test(FEUILLE) && /id="aAutre" hidden/.test(FEUILLE));
vrai('Google est « Gmail, Google Workspace » ; Microsoft « Outlook, Hotmail, Microsoft 365 » ; Autre cite iCloud, Orange, Free, OVH', /"Gmail, Google Workspace"/.test(FEUILLE) && /"Outlook, Hotmail, Microsoft 365"/.test(FEUILLE) && /iCloud, Orange, Free, OVH/.test(FEUILLE));
vrai('la phrase d\'iCloud dit OÙ créer le mot de passe pour app (account.apple.com → Mots de passe pour app)', /account\.apple\.com[^<]*Mots de passe pour app/.test(FEUILLE));
vrai('le tout dépend de la capacité de l\'hôte : qk = CAP.boutonsFournisseurs', /var qk=CAP\.boutonsFournisseurs,/.test(FEUILLE));
vrai('sans qk, la feuille est CELLE D\'AVANT : le champ adresse sert de tête (aMail hors de #aAutre) et « Continuer » reste visible', /\(qk\?quickHtml:''\)/.test(FEUILLE) && /\(qk\?'<div id="aAutre" hidden>/.test(FEUILLE) && /if\(qk\)\{\s*go\.style\.display="none";/.test(FEUILLE));
vrai('un fournisseur fermé n\'est PAS un bouton qui échoue : désactivé (disabled aria-disabled), sa raison écrite dessous', /\(ok\?'':' disabled aria-disabled="true"'\)/.test(FEUILLE) && /id="aQWhy"/.test(FEUILLE) && /La connexion Google n’est pas disponible/.test(FEUILLE) && /Microsoft refuse les mots de passe/.test(FEUILLE));
vrai('seul un fournisseur OUVERT reçoit un clic (if(okG) … onclick, if(okM) … onclick)', /if\(okG\) \$\("#aQG"\)\.onclick=function\(\)\{ quick\(pG\); \};/.test(FEUILLE) && /if\(okM\) \$\("#aQM"\)\.onclick=function\(\)\{ quick\(pM\); \};/.test(FEUILLE));
vrai('l\'ouverture se décide sur oauthOk (la capacité DÉCLARÉE par la source), pas sur le nom', /okG=oauthOk\(pG\), okM=oauthOk\(pM\)/.test(FEUILLE));
/* ⛔ l'autorisation s'ouvre DANS le geste */
const QUICK = entre(FEUILLE, 'var quick=function(p){', '};\n      if(okG)', 'quick');
const AVANT_CONNECT = QUICK.slice(0, QUICK.indexOf('connectAccount('));
vrai('quick() appelle connectAccount (la tranche avant lui est non vide)', QUICK.includes('connectAccount(') && AVANT_CONNECT.length > 10);
vrai('⛔ RIEN d\'attendu entre le clic et connectAccount : ni await, ni setTimeout, ni then, ni Promise (Safari bloque la fenêtre sinon)', !/await|setTimeout|\.then\(|Promise|requestAnimationFrame/.test(AVANT_CONNECT), AVANT_CONNECT);
const CONN = entre(MOD, 'function connectAccount(p,mail,name,kind,extra){', 'SRC.ajouterBoite(', 'connectAccount→source');
vrai('⛔ …et connectAccount appelle la source dans le constructeur de la promesse, sans rien attendre avant', /return new Promise\(function\(ok\)\{ ok\($/.test(CONN.trimEnd()) && !/await|setTimeout|\.then\(/.test(CONN), CONN);
vrai('Google et Microsoft partent SANS adresse tapée (connectAccount(p,"","",…)) ; le nom se déduit de l\'adresse rendue par le fournisseur', /connectAccount\(p,"","",kind,\{mdp:"",imap:null,logo:logoChoisi\}\)/.test(QUICK) && /if\(!name\) name=mail\.split\("@"\)\[0\];/.test(MOD));
vrai('un échec REVIENT dans la feuille (qSay) et rend les boutons ; la feuille reste ouverte', /qSay\(msgErr\(e,"Connexion impossible\."\)\)/.test(QUICK) && /b\.disabled=\(i===0&&!okG\)\|\|\(i===1&&!okM\)/.test(QUICK));
vrai('aucun bouton rapide ne se rend cliquable par erreur au retour d\'un échec : un fournisseur fermé reste fermé (même formule qu\'au départ)', /\(i===0&&!okG\)/.test(QUICK));

console.log('\n2. Les capacités : faux par défaut, vrai seulement chez l\'hôte qui les déclare');
vrai('CAP part à FAUX pour les deux', /boutonsFournisseurs:false,gererBoites:false,/.test(MOD));
vrai('boutonsFournisseurs exige c.boutonsFournisseurs === true', /CAP\.boutonsFournisseurs=c\.boutonsFournisseurs===true;/.test(MOD));
vrai('gererBoites exige la déclaration ET la méthode SRC.gererBoites (une déclaration sans méthode ne promet rien)', /CAP\.gererBoites=c\.gererBoites===true&&typeof SRC\.gererBoites==="function";/.test(MOD));
vrai('le lien « Gérer les boîtes » n\'est écrit que si CAP.gererBoites ET s\'il y a des boîtes', /if\(CAP\.gererBoites&&mine\.length\) h=h\.replace\(.*Gérer les boîtes/.test(MOD));
vrai('le clic rend la main à l\'hôte (SRC.gererBoites) et un échec se DIT (toast), il ne se tait pas', /data-gererboites\]"\)\)\{ if\(CAP\.gererBoites\) Promise\.resolve\(\)\.then\(function\(\)\{ return SRC\.gererBoites\(\); \}\)\.catch\(function\(x\)\{ toast\("Gestion des boîtes indisponible/.test(MOD));
const SRC_APP = entre(APP, 'function courrierSource(){', 'function courrierOauthDe(', 'courrierSource');
vrai('l\'hôte (OP GESTION) déclare les deux dans capacites()', /boutonsFournisseurs:true,gererBoites:true/.test(SRC_APP));
vrai('l\'hôte porte la méthode gererBoites, qui ouvre la gestion', /async gererBoites\(\)\{ mailBoxesManage\(\); \}/.test(SRC_APP));
vrai('⛔ OP MESSAGES ne déclare rien de tout cela (sa source ne dit ni boutonsFournisseurs ni gererBoites)', !/boutonsFournisseurs|gererBoites/.test(fs.readFileSync(path.join(R, 'server-msg', 'public', 'source-serveur.js'), 'utf8')));
vrai('les trois copies du module sont identiques (racine, aperçu, OP MESSAGES)', fs.readFileSync(path.join(R, 'opcourrier.js'), 'utf8') === fs.readFileSync(path.join(R, 'apercu', 'opcourrier.js'), 'utf8') && fs.readFileSync(path.join(R, 'opcourrier.js'), 'utf8') === fs.readFileSync(path.join(R, 'server-msg', 'public', 'opcourrier.js'), 'utf8'));

/* ═════ 3. LA GESTION D'APP.HTML — LES VRAIES FONCTIONS, JOUÉES ═════ */
console.log('\n3. La gestion des boîtes d\'app.html : les vraies fonctions, un fetch imité');
const BLOC = entre(APP, 'function boitesPeutGerer(){', 'async function mailBoxesManage(){', 'gestion des boîtes');
const CHARGE = entre(APP, 'async function loadMailboxes(){', '_mailboxesCode=0; } return _mailboxes; }', 'loadMailboxes') + '_mailboxesCode=0; } return _mailboxes; }\n';
vrai('population : le bloc de gestion est lu en entier', BLOC.length > 4000 && CHARGE.length > 200, [BLOC.length, CHARGE.length]);

function monde(o) {
  const j = { fetch: [], toast: [], confirm: [], entetes: 0, zones: [] };
  const zone = () => ({ innerHTML: '', attrs: {}, setAttribute(k, v) { this.attrs[k] = v; }, removeAttribute(k) { delete this.attrs[k]; }, _bx: 0 });
  const z = zone(); j.zones.push(z);
  const ctx = {
    console, esc: s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])),
    PUSH_API: 'https://api.test', syncTeam: () => 'equipe-test', currentUser: o.role === null ? null : { role: o.role || 'admin' },
    OAUTH_NOMS: { google: 'Google', microsoft: 'Microsoft' }, current: 'parametres', _courrierInst: null, _courrierRep: 'x',
    courrierRefusBeta: () => o.refusBeta || '', envoiBoiteCarteMaj: () => { j.carteMaj = (j.carteMaj || 0) + 1; },
    oauthDispo: async () => o.dispo || { google: true, microsoft: true },
    enteteEquipe: async (x) => { j.entetes++; return Object.assign({ Authorization: 'Bearer ' + 'a'.repeat(64) }, x || {}); },
    toast: m => j.toast.push(m), confirm: m => { j.confirm.push(m); return o.confirmer !== false; },
    document: { querySelectorAll: () => j.zones, body: { contains: () => true }, getElementById: () => z },
    fetch: async (url, init) => { j.fetch.push({ url, init }); return o.reponse(url, init, j); },
  };
  vm.createContext(ctx);
  vm.runInContext('let _mailboxes=null; let _mailboxesCode=0;\n' + CHARGE + '\n' + BLOC, ctx);
  j.ctx = ctx; j.zone = z; return j;
}
const rep = (status, corps) => ({ ok: status >= 200 && status < 300, status, json: async () => { if (corps === undefined) throw new Error('pas de json'); return corps; } });
const BOITES = [{ id: 'bx1', email: 'contact@exemple-qzw.fr', type: 'google', etat: 'ok' }, { id: 'bx2', email: 'compta@exemple-qzw.fr', type: 'motdepasse', etat: 'a_reconnecter' }];
const H = (j) => vm.runInContext('boitesHtml', j.ctx);

(async () => {
  /* — les trois états — */
  let j = monde({ reponse: (u) => rep(200, { mailboxes: BOITES }) });
  await vm.runInContext('loadMailboxes()', j.ctx);
  let h = await vm.runInContext('boitesHtml({google:true,microsoft:true})', j.ctx);
  vrai('liste : chaque boîte est écrite avec son adresse', h.includes('contact@exemple-qzw.fr') && h.includes('compta@exemple-qzw.fr'));
  vrai('liste : « Connectée » et « À reconnecter » sont dits en MOTS (pas seulement par la couleur)', /<b[^>]*>Connectée<\/b>/.test(h) && /<b[^>]*>À reconnecter<\/b>/.test(h));
  vrai('liste : le fournisseur est dit (Google / adresse et mot de passe)', /avec Google/.test(h) && /adresse et mot de passe/.test(h));
  vrai('liste : « Déconnecter » sur chaque boîte, « Reconnecter » seulement sur celle à reconnecter', (h.match(/boiteDeconnecter\('/g) || []).length === 2 && (h.match(/boiteReconnecter\('/g) || []).length === 1 && /boiteReconnecter\('bx2'\)/.test(h));
  vrai('liste : les trois boutons d\'ajout sont là (Google, Microsoft, Autre messagerie)', /mailOauthDemarrer\('google'\)/.test(h) && /mailOauthDemarrer\('microsoft'\)/.test(h) && /onclick="mailConnect\(\)"/.test(h) && />Autre messagerie/.test(h));
  vrai('la phrase d\'iCloud est là', /account\.apple\.com/.test(h));
  vrai('une cible tactile d\'au moins 44 px sur chaque geste (min-height:44px / 48px)', (h.match(/min-height:4[48]px/g) || []).length >= 5);
  /* vide ≠ inconnu */
  j = monde({ reponse: () => rep(200, { mailboxes: [] }) });
  await vm.runInContext('loadMailboxes()', j.ctx);
  h = await vm.runInContext('boitesHtml({google:true,microsoft:true})', j.ctx);
  vrai('liste VIDE : « Aucune boîte reliée à OP GESTION », et les boutons d\'ajout', /Aucune boîte reliée à OP GESTION/.test(h) && /mailOauthDemarrer\('google'\)/.test(h));
  vrai('liste vide : PAS de « Impossible de vérifier »', !/Impossible de vérifier/.test(h));
  j = monde({ reponse: () => rep(403, { error: 'refus' }) });
  const l403 = await vm.runInContext('loadMailboxes()', j.ctx);
  h = await vm.runInContext('boitesHtml({google:true,microsoft:true})', j.ctx);
  vrai('un 403 rend NULL (pas []) : « on n\'a pas pu savoir »', l403 === null);
  vrai('null : « Impossible de vérifier les boîtes pour l\'instant » + Réessayer', /Impossible de vérifier les boîtes pour l’instant/.test(h) && /boitesToutPeindre\(true\)">Réessayer/.test(h));
  vrai('null : JAMAIS « Aucune boîte », ni invitation à connecter, ni Déconnecter', !/Aucune boîte/.test(h) && !/mailOauthDemarrer|mailConnect|boiteDeconnecter/.test(h));
  vrai('null : le motif est dit (403 → « accès refusé par le serveur »)', /accès refusé par le serveur/.test(h));
  j = monde({ refusBeta: 'Rejoins l’espace de la bêta pour relier tes boîtes.', reponse: () => rep(403) });
  await vm.runInContext('loadMailboxes()', j.ctx); h = await vm.runInContext('boitesHtml({})', j.ctx);
  vrai('null sur la bêta : le 403 dit QUOI FAIRE (le message de la bêta), pas « clé non reconnue »', /Rejoins l’espace de la bêta/.test(h));
  j = monde({ reponse: () => rep(502) }); await vm.runInContext('loadMailboxes()', j.ctx); h = await vm.runInContext('boitesHtml({})', j.ctx);
  vrai('null sur un 5xx : « le serveur a répondu 502 »', /le serveur a répondu 502/.test(h));
  j = monde({ reponse: () => { throw new Error('réseau'); } }); const lr = await vm.runInContext('loadMailboxes()', j.ctx); h = await vm.runInContext('boitesHtml({})', j.ctx);
  vrai('null sur une coupure : rendu NULL et « le serveur n\'a pas répondu »', lr === null && /le serveur n’a pas répondu/.test(h));
  j = monde({ reponse: () => rep(200, { pasUneListe: 1 }) }); const lb = await vm.runInContext('loadMailboxes()', j.ctx);
  vrai('une réponse qui n\'est pas une liste n\'est pas une liste vide', lb === null);
  /* un fournisseur fermé : grisé, avec sa raison */
  j = monde({ reponse: () => rep(200, { mailboxes: [] }) }); await vm.runInContext('loadMailboxes()', j.ctx);
  h = await vm.runInContext('boitesHtml({google:false,microsoft:false})', j.ctx);
  vrai('Google et Microsoft fermés : boutons désactivés (disabled), pas de mailOauthDemarrer, et la raison écrite', !/mailOauthDemarrer/.test(h) && (h.match(/disabled aria-disabled="true"/g) || []).length === 2 && /La connexion Google n’est pas disponible/.test(h) && /Microsoft refuse les mots de passe/.test(h));
  /* qui voit quoi */
  j = monde({ role: 'technicien', reponse: () => rep(200, { mailboxes: BOITES }) }); await vm.runInContext('loadMailboxes()', j.ctx);
  h = await vm.runInContext('boitesHtml({google:true,microsoft:true})', j.ctx);
  vrai('un non-administrateur voit la LISTE, sans aucun geste (ni Déconnecter, ni Reconnecter, ni ajout) et la phrase le dit', h.includes('contact@exemple-qzw.fr') && !/boiteDeconnecter|boiteReconnecter|mailOauthDemarrer|mailConnect/.test(h) && /Seul l’administrateur connecte ou déconnecte/.test(h));
  await vm.runInContext("boiteDeconnecter('bx1')", j.ctx);
  vrai('…et sa fonction refuse aussi (la garde est dans la fonction qui écrit) : ni question, ni requête', j.fetch.length === 1 /* le seul fetch est la lecture de la liste */ && j.confirm.length === 0 && j.fetch[0].url.includes('/api/mailboxes'));

  /* — Déconnecter — */
  const serveur = (opt) => { const etat = { liste: BOITES.slice() }; return { etat, reponse: (url, init, jj) => {
    if (url.includes('/api/mailboxes')) return rep(200, { mailboxes: etat.liste });
    if (url.includes('/api/mailbox/disconnect')) { const b = JSON.parse(init.body); if (opt && opt.status) return rep(opt.status, opt.corps); if (!(opt && opt.garde)) etat.liste = etat.liste.filter(x => x.id !== b.id); return rep(200, { ok: true }); }
    return rep(404); } }; };
  let sv = serveur(); j = monde({ reponse: sv.reponse }); await vm.runInContext('loadMailboxes()', j.ctx);
  await vm.runInContext("boiteDeconnecter('bx1')", j.ctx);
  const dis = j.fetch.filter(f => f.url.includes('/api/mailbox/disconnect'));
  vrai('Déconnecter : UN POST vers /api/mailbox/disconnect', dis.length === 1 && dis[0].init.method === 'POST' && dis[0].url === 'https://api.test/api/mailbox/disconnect', dis.map(d => d.url));
  vrai('…avec le corps { teamId, id }', JSON.stringify(JSON.parse(dis[0].init.body)) === JSON.stringify({ teamId: 'equipe-test', id: 'bx1' }));
  vrai('…et les en-têtes de la PREUVE (enteteEquipe : Authorization Bearer 64 hexa) en plus du JSON', j.entetes >= 1 && /^Bearer [0-9a-f]{64}$/.test(dis[0].init.headers.Authorization) && dis[0].init.headers['Content-Type'] === 'application/json', dis[0].init.headers);
  vrai('la confirmation DIT que les mails restent dans la messagerie et que seule la liaison est retirée', j.confirm.length === 1 && /Tes mails restent dans ta messagerie/.test(j.confirm[0]) && /seule la liaison avec OP GESTION est retirée/.test(j.confirm[0]) && j.confirm[0].includes('contact@exemple-qzw.fr'), j.confirm);
  vrai('la liste est RELUE après (un GET /api/mailboxes suit le POST)', j.fetch.map(f => f.url.replace('https://api.test', '').split('?')[0]).join(' ').endsWith('/api/mailbox/disconnect /api/mailboxes'), j.fetch.map(f => f.url));
  vrai('la zone est repeinte SANS la boîte retirée, avec celle qui reste', !/contact@exemple-qzw/.test(j.zone.innerHTML) && /compta@exemple-qzw/.test(j.zone.innerHTML));
  vrai('« Boîte déconnectée » est dit, avec « tes mails restent dans ta messagerie »', j.toast.some(m => /Boîte déconnectée : contact@exemple-qzw\.fr/.test(m) && /restent dans ta messagerie/.test(m)), j.toast);
  vrai('le Courrier ouvert se relit (le cache des réponses est vidé)', vm.runInContext('_courrierRep', j.ctx) === null);
  vrai('la carte d\'envoi se met à jour aussi', j.carteMaj === 1);
  /* annuler */
  j = monde({ confirmer: false, reponse: sv.reponse }); await vm.runInContext('loadMailboxes()', j.ctx);
  await vm.runInContext("boiteDeconnecter('bx1')", j.ctx);
  vrai('« Annuler » à la confirmation : aucune requête de retrait', j.fetch.every(f => !f.url.includes('/disconnect')) && j.toast.length === 0);
  /* ⛔ un refus se DIT : fetch ne jette pas */
  for (const [nom, opt, motif] of [['403 JSON', { status: 403, corps: { error: 'clé refusée' } }, /clé refusée/], ['403 text/plain', { status: 403 }, /accès|403/], ['500', { status: 500, corps: {} }, /500/], ['429', { status: 429, corps: { error: 'trop de demandes' } }, /trop de demandes/]]) {
    sv = serveur(opt); j = monde({ reponse: sv.reponse }); await vm.runInContext('loadMailboxes()', j.ctx);
    await vm.runInContext("boiteDeconnecter('bx1')", j.ctx);
    vrai('un ' + nom + ' : « n\'a pas été déconnectée » + la raison, JAMAIS « Boîte déconnectée »', j.toast.some(m => /n’a pas été déconnectée/.test(m) && motif.test(m)) && !j.toast.some(m => /Boîte déconnectée/.test(m)), j.toast);
    vrai('un ' + nom + ' : la boîte reste dans la liste affichée', /contact@exemple-qzw/.test(j.zone.innerHTML));
  }
  j = monde({ refusBeta: 'Rejoins l’espace de la bêta pour relier tes boîtes.', reponse: (u, i) => u.includes('/disconnect') ? rep(403) : rep(200, { mailboxes: BOITES }) }); await vm.runInContext('loadMailboxes()', j.ctx);
  await vm.runInContext("boiteDeconnecter('bx1')", j.ctx);
  vrai('un 403 sur la bêta dit le geste de la bêta (refusBeta), pas « clé non reconnue »', j.toast.some(m => /Rejoins l’espace de la bêta/.test(m)), j.toast);
  j = monde({ reponse: (u) => { if (u.includes('/disconnect')) throw new Error('coupure'); return rep(200, { mailboxes: BOITES }); } }); await vm.runInContext('loadMailboxes()', j.ctx);
  await vm.runInContext("boiteDeconnecter('bx1')", j.ctx);
  vrai('une coupure : « serveur injoignable », rien de faux', j.toast.some(m => /n’a pas été déconnectée : serveur injoignable/.test(m)) && !j.toast.some(m => /Boîte déconnectée/.test(m)), j.toast);
  /* le serveur dit ok mais la boîte est toujours là : on ne l'annonce pas retirée */
  sv = serveur({ garde: true }); j = monde({ reponse: sv.reponse }); await vm.runInContext('loadMailboxes()', j.ctx);
  await vm.runInContext("boiteDeconnecter('bx1')", j.ctx);
  vrai('un « ok » du serveur alors que la liste relue porte encore la boîte : « est toujours connectée », jamais « déconnectée »', j.toast.some(m => /est toujours connectée/.test(m)) && !j.toast.some(m => /Boîte déconnectée/.test(m)), j.toast);
  /* retrait réussi mais relecture impossible */
  j = monde({ reponse: (u) => u.includes('/disconnect') ? rep(200, { ok: true }) : (j.n = (j.n || 0) + 1) === 1 ? rep(200, { mailboxes: BOITES }) : rep(503) }); await vm.runInContext('loadMailboxes()', j.ctx);
  await vm.runInContext("boiteDeconnecter('bx1')", j.ctx);
  vrai('retrait fait mais liste illisible ensuite : la zone dit « Impossible de vérifier » (pas « Aucune boîte »)', /Impossible de vérifier/.test(j.zone.innerHTML) && !/Aucune boîte/.test(j.zone.innerHTML), j.zone.innerHTML.slice(0, 200));

  /* ═════ 4. LA CARTE DES PARAMÈTRES ET LE CÂBLAGE ═════ */
  console.log('\n4. La carte des Paramètres et le câblage');
  vrai('les Paramètres portent la carte « Boîtes mail » (#boites-carte, zone #bx-carte) AVANT « E-mails à tes clients »', /id="boites-carte"[\s\S]{0,700}id="bx-carte"[\s\S]{0,300}id="envoi-boite-carte"/.test(APP));
  vrai('la carte se remplit à l\'ouverture (boitesPeindre(#bx-carte, relire))', /boitesPeindre\(document\.getElementById\('bx-carte'\),true\)/.test(APP));
  const DECO = entre(APP, 'async function boiteDeconnecter(id){', 'function boiteReconnecter(id)', 'boiteDeconnecter');
  vrai('boiteDeconnecter : enteteEquipe + /api/mailbox/disconnect + lecture de r.ok + relecture de la liste', /fetch\(PUSH_API\+'\/api\/mailbox\/disconnect',\{method:'POST',headers:await enteteEquipe\(\{'Content-Type':'application\/json'\}\)/.test(DECO) && /if\(!r\.ok\) msg=/.test(DECO) && /await loadMailboxes\(\);/.test(DECO));
  vrai('l\'ancien « Déconnecter » (mailDisconnect) passe par elle : plus de fetch muet dont la réponse est jetée', /async function mailDisconnect\(id\)\{ return boiteDeconnecter\(id\); \}/.test(APP) && !/function mailDisconnect\(id\)\{ if\(!confirm/.test(APP));
  vrai('mailBoxesManage ouvre la gestion partagée (zone #bx-modal peinte par boitesPeindre)', /async function mailBoxesManage\(\)\{[\s\S]{0,900}id="bx-modal"[\s\S]{0,200}boitesPeindre\(\$\('bx-modal'\),true\)/.test(APP));
  vrai('un retour d\'autorisation (oauthFin) repeint la gestion et relit le Courrier', /boitesToutPeindre\(false\); courrierRelire\(\);/.test(APP));
  vrai('l\'ancienne mention « Hotmail / Outlook : bientôt » ne reste que si Microsoft est fermé', /_oauthDispo&&_oauthDispo\.microsoft\?'« Se connecter avec Microsoft »':'bientôt/.test(APP));
  vrai('loadMailboxes garde sa forme (test-641) ET retient le code du refus', /if\(!r\.ok\)\{ _mailboxes=null; return _mailboxes; \}/.test(APP) && /_mailboxesCode=r\.status;/.test(APP));

  console.log('\ntest-3293 : ' + ok + ' ✓ ' + ko + ' ✗');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.log('  ✗ banc mort : ' + (e && e.stack || e)); process.exit(1); });
