/* test-3250 — RIEN NE PART PAR TEAM OP : UN DOCUMENT AU CLIENT FINAL NE PART QUE PAR LA BOÎTE DE L'ENTREPRISE (bêta v796, 4 novembre 2026).
 *
 * Justin, après une facture de Toka Clim arrivée dans contact@teamop.fr : « ils doivent mettre leur adresse e-mail dans les paramètres
 * de l'application et dans le système de boîte mail, que comme ça, quand ils envoient le devis, facture ou autre, c'est leur e-mail à
 * eux, pas à nous. Il n'y a rien qui passe par nous. » Le « mode simple » (le serveur de TEAM OP envoie au nom de l'entreprise) était le
 * chemin par défaut de srvMail ; il copiait TEAM OP et faisait répondre le client final chez nous.
 * Ce banc garde :
 *   1. le RECENSEMENT : tout envoi au client final passe par srvMail (18 appels) ; un 19ᵉ fait tomber le banc et oblige à vérifier
 *      qu'il passe par la garde ; aucun autre `fetch` vers /api/sendmail que srvMail et le Courrier (qui exige `useMailbox`) ;
 *   2. la VRAIE srvMail (et ses trois aides) exécutée : sans boîte, rien ne part et l'étape « connecte ta boîte » s'ouvre ; la boîte
 *      connectée pendant l'étape, l'envoi REPREND par elle ; `_mailboxes === null` dit « impossible de vérifier » sans proposer de
 *      connecter ; un non-administrateur est renvoyé à son administrateur ; une boîte qui refuse ne se rabat PAS sur la plateforme ;
 *      l'envoi automatique ne rouvre aucune fenêtre et prévient l'administrateur ; un envoi en lot ne rouvre pas l'étape à chaque ligne ;
 *      la bêta (aucune boîte par construction) montre l'étape. Contre-épreuve : `MUTER=1` retire la garde — le banc tombe. */
const fs = require('fs'), path = require('path'), vm = require('vm');
let SRC = fs.readFileSync(path.join(__dirname, '..', process.env.APP_FICHIER || 'app.html'), 'utf8');
if (process.env.MUTER === '1') SRC = SRC.replace("if(bt.manque){\n    if(opts&&opts.auto)", "if(false&&bt.manque){\n    if(opts&&opts.auto)");
if (process.env.MUTER === '2') SRC = SRC.replace("const ENVOI_ADR_RE=/", "const ENVOI_ADR_RE=/.|/");   // une adresse mal formée compterait
if (process.env.MUTER === '3') SRC = SRC.replace("if(emRep&&confirm(", "if(emRep&&true||confirm(");   // la reprise sans demander
const CODE = SRC.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
let ok = 0, ko = 0;
const vrai = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '  → ' + JSON.stringify(d).slice(0, 400) : '')); } };
const v = (t, a, b) => vrai(t, JSON.stringify(a) === JSON.stringify(b), { obtenu: a, attendu: b });

console.log('\n── 3250 · 1. le recensement des envois ──');
const appels = [];
const reAppel = /(^|[^.\w])srvMail\(/g; let m;
while ((m = reAppel.exec(CODE))) {
  const k = m.index + m[1].length;
  if (/function\s+$/.test(CODE.slice(k - 20, k))) continue;   // la déclaration elle-même
  appels.push(k);
}
vrai('population : les appels à srvMail sont trouvés (au moins 15)', appels.length >= 15, appels.length);
v('⛔ exactement 18 appels à srvMail — un 19ᵉ envoi se vérifie (passe-t-il par la boîte de l\'entreprise ?), puis s\'ajoute ici', appels.length, 18);
const fetchs = [...CODE.matchAll(/fetch\(PUSH_API\+'\/api\/sendmail'/g)].map(x => x.index);
const dans = i => { const fns = [...CODE.slice(Math.max(0, i - 80000), i).matchAll(/(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(|async\s+(envoyer)\s*\(/g)]; const f = fns[fns.length - 1]; return f ? (f[1] || f[2]) : '?'; };
v('⛔ trois fetch vers /api/sendmail seulement : srvMail (l\'envoi, et la reprise que la personne ACCEPTE) et le Courrier', fetchs.map(dans).sort(), ['envoyer', 'srvMail', 'srvMail']);
{ const i = CODE.indexOf('async envoyer(m){'); const c = i < 0 ? '' : CODE.slice(i, i + 900);
  vrai('le Courrier envoie TOUJOURS par une boîte connectée (useMailbox), jamais en mode simple', /useMailbox:\{id:m\.boite\}/.test(c) && !/brand:/.test(c), c.slice(0, 200)); }
{ const i = CODE.indexOf('async function srvMail('); const j = CODE.indexOf('var _srvMailEnRoute', i); const c = CODE.slice(i, j);
  vrai('srvMail est trouvée', c.length > 1500, c.length);
  { const i2 = c.indexOf("fetch(PUSH_API+'/api/sendmail'", c.indexOf("fetch(PUSH_API+'/api/sendmail'") + 10);
    vrai('⛔ la boîte refuse : la reprise par OP GESTION n\'existe QUE derrière un confirm() qui dit où iront les réponses (jamais en silence, jamais en automatique)',
      i2 > 0 && /if\(emRep&&confirm\('Ta boîte mail a refusé l’envoi/.test(c.slice(0, i2)) && /!\(opts&&opts\.auto\)\?envoiAdresseEnt\(\)/.test(c.slice(0, i2)) && !/via la plateforme/.test(c), i2); }
  vrai('⛔ l\'adresse de réponse envoyée est TOUJOURS celle de Mon entreprise (bt.ent / envoiAdresseEnt), jamais une valeur fabriquée', (c.match(/replyTo:/g) || []).length === 1 && /replyTo:emRep/.test(c) && /payload\.brand\.replyTo=bt\.ent/.test(c)); }
vrai('Paramètres : plus de « Mode simple — actif par défaut » ni de « la plateforme envoie au nom de ton entreprise »', !/Mode simple — actif par défaut|la plateforme envoie au nom de ton entreprise/.test(CODE));
vrai('Paramètres : une rubrique « E-mails à tes clients » avec l\'adresse de l\'entreprise ET l\'état de la boîte connectée', /E-mails à tes clients/.test(CODE) && /id="ms-email"/.test(CODE) && /id="envoi-boite-etat"/.test(CODE));
vrai('plus aucun libellé « Plateforme — au nom de » dans les choix d\'expéditeur', !/Plateforme — au nom de|Plateforme \(au nom de/.test(CODE));
vrai('l\'envoi automatique de la facture payée se déclare `auto` (aucune fenêtre chez le technicien)', /opts\.auto=true;/.test((() => { const i = CODE.indexOf('function factureMailPayee('); return i < 0 ? '' : CODE.slice(i, i + 4000); })()));

console.log('\n── 3250 · 2. la vraie srvMail, exécutée ──');
const tranche = (a, b) => { const i = SRC.indexOf(a), j = SRC.indexOf(b, i + a.length); return i < 0 || j < 0 ? '' : SRC.slice(i, j); };
const FN = tranche('async function envoiBoiteResoudre(', '/* un courriel IDENTIQUE');
vrai('les quatre fonctions sont trouvées (envoiBoiteResoudre, envoiBoiteEtape, envoiBoiteSignaler, srvMail)', ['envoiBoiteResoudre', 'envoiBoiteEtape', 'envoiBoiteSignaler', 'async function srvMail'].every(n => FN.includes(n)), FN.length);
const monde = (o) => {
  const W = { console, JSON, String, Math, Date, Array, Number, Object, Promise, parseInt, encodeURIComponent,
    __req: [], __modales: [], __toasts: [], __push: [], __obs: [], __confirms: [], __champ: null, __rep: o.rep || { ok: true, status: 200 }, __mb: o.mb === undefined ? [] : o.mb, __boite: o.boite || null };
  W.fetch = async (u, init) => { if (/\/api\/sendmail/.test(u)) W.__req.push(JSON.parse(init.body)); const r = (Array.isArray(W.__rep) ? W.__rep[Math.min(W.__req.length - 1, W.__rep.length - 1)] : W.__rep); return { ok: r.ok, status: r.status, json: async () => (r.body || {}) }; };
  const ov = { cls: new Set(), classList: { contains: k => ov.cls.has(k) } };
  W.document = { getElementById: id => (id === 'overlay' ? ov : id === 'boite-etape-email' ? W.__champ : null) };
  W.MutationObserver = function (cb) { this.observe = () => W.__obs.push(cb); this.disconnect = () => { W.__obs = W.__obs.filter(x => x !== cb); }; };
  W.openModal = h => { W.__modales.push(String(h)); ov.cls.add('open'); };
  W.closeModal = () => { ov.cls.delete('open'); W.__obs.slice().forEach(cb => cb()); };
  W.toast = t => W.__toasts.push(String(t)); W.pushNotify = (...a) => W.__push.push(a);
  W.localStorage = { _: {}, getItem(k) { return this._[k] || null; }, setItem(k, val) { this._[k] = String(val); } };
  W.location = {}; W.navigator = { userAgent: '' };
  vm.createContext(W);
  vm.runInContext(`const PUSH_API='http://essai'; const BETA_ESSAI=${o.beta ? 'true' : 'false'}; let _srvMailErr='';
    let _mailboxes=__mb; async function loadMailboxes(){ return _mailboxes; }
    async function enteteEquipe(h){ return h||{}; } function syncTeam(){ return 'ent-3250'; } function todayISO(){ return '2026-11-04'; }
    function mailBoxFor(){ return __boite; } function can(){ return true; } var currentUser={ id:'u1', role:'${o.role || 'admin'}' };
    var db={ mailFrom:'Toka Clim', entreprise:${JSON.stringify(o.ent || {})}, users:[{id:'u1',role:'admin'},{id:'u2',role:'technicien'}] }; function mailBrandName(){ return 'Toka Clim'; }
    function esc(x){ return String(x==null?'':x); } function entPose(k,v){ db.entreprise[k]=v; } function save(){ __saves=(typeof __saves==='number'?__saves:0)+1; } var __saves=0;
    function confirm(m){ __confirms.push(String(m)); return ${o.confirm ? 'true' : 'false'}; }
    function mailConnect(){ openModal('<h3>Connecter une boîte mail</h3>'); }
    function oauthBoutonsHtml(){ return '<div class="oauth-boutons"></div>'; } function oauthBoutonsMontrer(){}   // v798 : « Se connecter avec Google » (test-3252 le joue contre le vrai serveur)
    ${FN}
    this.srvMail=srvMail; this.poser=l=>{ _mailboxes=l; }; this.err=()=>_srvMailErr; this.ent=()=>db.entreprise; this.enregistrer=envoiAdresseEnregistrer;`, W);
  return W;
};
const dormir = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  try {
    let W = monde({});
    let p = W.srvMail('client@dehors.fr', 'Votre facture', 'Bonjour', '', 'facture', null, {});
    await dormir(20);
    vrai('A · ni boîte ni adresse : l\'étape s\'ouvre avec les DEUX choix (l\'adresse de mon entreprise, ou connecter ma boîte)', W.__modales.some(h => /l’adresse e-mail de ton entreprise/.test(h) && /envoiAdresseEnregistrer\(\)/.test(h) && /mailConnect\(\)/.test(h) && /où tes clients te répondront/.test(h)), W.__modales);
    v('A · ⛔ … et RIEN n\'est parti vers /api/sendmail', W.__req.length, 0);
    W.closeModal(); let r = await p;
    v('A · fermée sans connecter : srvMail rend faux', r, false);
    v('A · ⛔ … toujours rien de parti', W.__req.length, 0);
    vrai('A · … et l\'écran le dit (« Rien n\'est parti »)', W.__toasts.some(t => /Rien n.est parti/.test(t)), W.__toasts);
    const n0 = W.__modales.length; r = await W.srvMail('autre@dehors.fr', 'Votre RDV', 'Bonjour', '', 'rdv', null, {});
    vrai('B · envoi en lot juste après « Plus tard » : pas de nouvelle fenêtre, rien ne part', r === false && W.__modales.length === n0 && W.__req.length === 0, [r, W.__modales.length - n0, W.__req.length]);
    W = monde({});
    p = W.srvMail('client@dehors.fr', 'Votre devis', 'Bonjour', '✉️ Devis envoyé', 'devis', null, { societe: 'Toka Clim' });
    await dormir(20);
    W.poser([{ id: 'mb7', email: 'contact@tokaclim.fr' }]); W.closeModal();
    r = await p;
    v('C · boîte connectée pendant l\'étape : l\'envoi reprend et réussit', r, true);
    v('C · … UN envoi, par la boîte connectée (useMailbox), sans SMTP', W.__req.map(q => [q.useMailbox && q.useMailbox.id, !!q.smtp]), [['mb7', false]]);
    vrai('C · … le nom affiché est celui de l\'entreprise, sans adresse de réponse fabriquée', W.__req[0] && W.__req[0].brand && W.__req[0].brand.name === 'Toka Clim' && !('replyTo' in W.__req[0].brand), W.__req[0]);
    W = monde({ mb: null });
    p = W.srvMail('client@dehors.fr', 'Votre facture', 'Bonjour', '', 'facture', null, {}); await dormir(20);
    vrai('D · _mailboxes inconnu : « Impossible de vérifier ta boîte mail », sans bouton de connexion', W.__modales.some(h => /Impossible de vérifier ta boîte mail/.test(h) && !/mailConnect\(\)/.test(h)), W.__modales);
    W.closeModal(); r = await p; v('D · … rien n\'est parti', [r, W.__req.length], [false, 0]);
    W = monde({ role: 'technicien' });
    p = W.srvMail('client@dehors.fr', 'Avis de passage', 'Bonjour', '', 'avis', null, {}); await dormir(20);
    vrai('E · technicien sans boîte : « Demande à ton administrateur », sans bouton de connexion', W.__modales.some(h => /Demande à ton administrateur de connecter la boîte mail de l.entreprise/.test(h) && !/mailConnect\(\)/.test(h)), W.__modales);
    W.closeModal(); r = await p; v('E · … rien n\'est parti', [r, W.__req.length], [false, 0]);
    W = monde({ boite: { user: 'factures@tokaclim.fr', pass: 'x', host: 'smtp.essai' }, rep: { ok: false, status: 500, body: { error: 'Invalid login' } } });
    r = await W.srvMail('client@dehors.fr', 'Votre facture', 'Bonjour', '', 'facture', null, { sansMailto: true });
    v('F · ⛔ boîte de l\'entreprise refusée : UN seul envoi tenté (le sien), aucun par la plateforme', W.__req.map(q => !!q.smtp), [true]);
    vrai('F · … l\'écran dit que SA boîte a refusé, et que rien n\'est parti', r === false && W.__toasts.some(t => /ta boîte mail a refusé/.test(t) && /rien n.est parti/.test(t)), W.__toasts);
    W = monde({ role: 'technicien' });
    r = await W.srvMail('client@dehors.fr', 'Votre facture F-1', 'Bonjour', '', 'facture', null, { auto: true });
    await W.srvMail('client@dehors.fr', 'Votre facture F-2', 'Bonjour', '', 'facture', null, { auto: true });
    v('G · envoi automatique sans boîte : rien ne part, aucune fenêtre', [r, W.__req.length, W.__modales.length], [false, 0, 0]);
    vrai('G · … l\'administrateur est prévenu UNE fois (pas à chaque facture)', W.__push.length === 1 && JSON.stringify(W.__push[0][3]) === '["u1"]', W.__push);
    v('G · … et la raison est gardée pour l\'appelant', W.err(), 'aucune boîte mail connectée');
    W = monde({});
    r = await W.srvMail('fournisseur@dehors.fr', 'Bon BC-12', 'Bonjour', '', 'bon', null, { mailboxId: 'mbX' });
    v('H · boîte choisie à l\'envoi : envoyée par elle, sans étape', [r, W.__req.map(q => q.useMailbox && q.useMailbox.id), W.__modales.length], [true, ['mbX'], 0]);
    W = monde({ mb: [{ id: 'mb1', email: 'contact@tokaclim.fr' }] });
    r = await W.srvMail('client@dehors.fr', 'Votre devis', 'Bonjour', '', 'devis', null, {});
    v('I · boîte déjà connectée : envoi direct par elle', [r, W.__req.map(q => q.useMailbox && q.useMailbox.id), W.__modales.length], [true, ['mb1'], 0]);
    W = monde({ beta: true, mb: null });
    p = W.srvMail('client@dehors.fr', 'Votre devis', 'Bonjour', '', 'devis', null, {}); await dormir(20);
    vrai('J · bêta : l\'étape s\'affiche (pas « impossible de vérifier »)', W.__modales.some(h => /envoiAdresseEnregistrer\(\)/.test(h)), W.__modales);
    W.closeModal(); r = await p; v('J · … et rien ne part depuis la bêta', [r, W.__req.length], [false, 0]);
    /* ── v797 (Justin : « s'il n'utilise pas la boîte mail, il faut que dans Mon entreprise on l'oblige à mettre le mail ») ── */
    W = monde({ ent: { email: 'contact@tokaclim.fr' } });
    r = await W.srvMail('client@dehors.fr', 'Votre devis', 'Bonjour', '', 'devis', null, {});
    v('K · adresse dans Mon entreprise, pas de boîte : l\'envoi part, sans étape', [r, W.__modales.length], [true, 0]);
    v('K · … par le serveur au nom de l\'entreprise : ni boîte ni SMTP, Reply-To = l\'adresse de Mon entreprise', W.__req.map(q => [!!q.useMailbox, !!q.smtp, q.brand && q.brand.name, q.brand && q.brand.replyTo]), [[false, false, 'Toka Clim', 'contact@tokaclim.fr']]);
    W = monde({ ent: { email: 'pas-une-adresse' } });
    p = W.srvMail('client@dehors.fr', 'Votre devis', 'Bonjour', '', 'devis', null, {}); await dormir(20);
    vrai('L · ⛔ adresse mal formée dans Mon entreprise : elle ne compte pas — l\'étape s\'ouvre, rien ne part', W.__modales.length === 1 && W.__req.length === 0, [W.__modales.length, W.__req.length]);
    W.__champ = { value: 'toujours mauvaise', focus() {} }; W.enregistrer();
    vrai('L · … une adresse mal formée tapée dans l\'étape est REFUSÉE (rien d\'enregistré, la fenêtre reste)', W.ent().email === 'pas-une-adresse' && W.__toasts.some(t => /Adresse e-mail invalide/.test(t)), [W.ent(), W.__toasts]);
    W.__champ = { value: 'contact@tokaclim.fr', focus() {} }; W.enregistrer();
    r = await p;
    v('L · … une adresse valide s\'enregistre dans Mon entreprise et l\'envoi REPREND avec elle en Reply-To', [r, W.ent().email, W.__req.map(q => q.brand && q.brand.replyTo)], [true, 'contact@tokaclim.fr', ['contact@tokaclim.fr']]);
    W = monde({ ent: { email: 'contact@tokaclim.fr' }, mb: [{ id: 'mb1', email: 'contact@tokaclim.fr' }], rep: [{ ok: false, status: 500, body: { error: 'SMTP refusé' } }, { ok: true, status: 200 }], confirm: false });
    r = await W.srvMail('client@dehors.fr', 'Votre facture', 'Bonjour', '', 'facture', null, { sansMailto: true });
    vrai('M · ⛔ la boîte refuse, la personne dit NON : un seul envoi tenté (par la boîte), on le lui a demandé en disant où iront les réponses', r === false && W.__req.length === 1 && W.__req[0].useMailbox && W.__confirms.length === 1 && /contact@tokaclim\.fr/.test(W.__confirms[0]), [r, W.__req.length, W.__confirms]);
    W = monde({ ent: { email: 'contact@tokaclim.fr' }, mb: [{ id: 'mb1', email: 'contact@tokaclim.fr' }], rep: [{ ok: false, status: 500, body: { error: 'SMTP refusé' } }, { ok: true, status: 200 }], confirm: true });
    r = await W.srvMail('client@dehors.fr', 'Votre facture', 'Bonjour', '', 'facture', null, { sansMailto: true });
    v('M · la personne dit OUI : la seconde demande part au nom de l\'entreprise, réponses vers Mon entreprise, sans boîte', [r, W.__req.map(q => [!!q.useMailbox, q.brand && q.brand.replyTo || ''])], [true, [[true, ''], [false, 'contact@tokaclim.fr']]]);
    W = monde({ ent: { email: 'contact@tokaclim.fr' }, mb: [{ id: 'mb1', email: 'contact@tokaclim.fr' }], rep: { ok: false, status: 500, body: { error: 'SMTP refusé' } }, confirm: true, role: 'technicien' });
    r = await W.srvMail('client@dehors.fr', 'Votre facture', 'Bonjour', '', 'facture', null, { auto: true, sansMailto: true });
    v('N · ⛔ envoi AUTOMATIQUE et boîte qui refuse : aucune question, aucune reprise par OP GESTION', [r, W.__req.length, W.__confirms.length], [false, 1, 0]);
    W = monde({ ent: { email: 'contact@tokaclim.fr' }, mb: null });
    p = W.srvMail('client@dehors.fr', 'Votre devis', 'Bonjour', '', 'devis', null, {}); await dormir(20);
    vrai('O · ⛔ boîtes inconnues (route en panne) : même avec une adresse, on ne contourne pas une boîte qui existe peut-être — « impossible de vérifier »', W.__modales.some(h => /Impossible de vérifier/.test(h)) && W.__req.length === 0, W.__modales);
    W.closeModal(); await p;
  } catch (e) { ko++; console.log('  ✗ EXCEPTION : ' + (e && e.stack || e)); }
  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  process.exit(ko ? 1 : 0);
})();
