/* ⛔ CE QUE CE FICHIER GARDE — PAS DE PAIEMENT SANS COMPTE.

   Justin, 27 septembre 2026, nuit : « Aussi dans les tarifs il faut bien préciser aux personnes qui doivent créer un
   compte d'abord avant de payer, ils peuvent pas payer s'ils ont pas de compte créé pour que nous on ait un vrai suivi
   de qui fait quoi ». Jusque-là, n'importe qui payait sans compte : la page de paiement ouvrait Stripe directement, et
   si le serveur ne répondait pas, elle se repliait sur dix liens de paiement Stripe ANONYMES écrits en clair dans la
   page. Un paiement ne se rattachait alors à personne.

   Quatre endroits portent la règle, et ils doivent dire la même chose :
   1. les TARIFS le disent (en service, le site v2 et son générateur, les deux anciennes pages d'aperçu) ;
   2. plus AUCUN lien de paiement anonyme n'est servi, nulle part (recensé depuis le dépôt, pas depuis une liste) ;
   3. la PAGE de paiement — son vrai script, dans chacun de ses états : pas de compte, adresse à confirmer, prêt,
      service injoignable, et chaque refus du serveur (401, 403, 429, 502, coupure) dit ce qu'il est, sans jamais
      partir vers un paiement ;
   4. la COUTURE : le vrai portail (`espace.html`) crée le compte et range la session, la vraie page de paiement la
      lit, le VRAI serveur répond — Stripe simulé DANS le processus serveur, pour lire ce qui partirait chez lui.

   ⚠️ LA ROUTE `/api/stripe/checkout` PART SUR « POUSSE LE SERVEUR », PAS AVEC LA PAGE. Tant que le serveur de ce
   dépôt n'a pas la règle (c'est le cas de `main` entre les deux publications), le §4 le DIT et vérifie que la page
   tient seule : elle ne paie qu'avec un compte prouvé, et le paiement s'ouvre toujours. La route elle-même est gardée,
   sans tolérance, par `test-727` — c'est lui que le déploiement du serveur lance. */
'use strict';
const fs = require('fs'), os = require('os'), path = require('path'), crypto = require('crypto');
const { spawn, execSync } = require('child_process');
const RACINE = path.join(__dirname, '..');
const lire = f => fs.readFileSync(path.resolve(RACINE, f), 'utf8');
const existe = f => fs.existsSync(path.resolve(RACINE, f));
let ok = 0, ko = 0;
const v = (t, a, b) => { const bon = JSON.stringify(a) === JSON.stringify(b); bon ? ok++ : ko++;
  console.log('  ' + (bon ? '✓' : '✗') + ' ' + t + (bon ? '' : '\n      attendu : ' + JSON.stringify(b) + '\n      obtenu  : ' + JSON.stringify(a))); };
const vrai = (t, c) => v(t, !!c, true);
const texte = h => String(h).replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<style[\s\S]*?<\/style>/g, ' ').replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#39;/g, '\'').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
  .replace(/[  ]/g, ' ').replace(/\s+/g, ' ');
const dormir = ms => new Promise(r => setTimeout(r, ms));
/* `RECAP_FICHIER` : une copie à éprouver (mutation), absolue ou relative au dépôt — sinon la racine et l'aperçu. */
const PAGES_PAIEMENT = process.env.RECAP_FICHIER ? [process.env.RECAP_FICHIER] : ['recap-abonnement.html', 'apercu/recap-abonnement.html'].filter(existe);
const SESSION = 'f'.repeat(64);
const PHRASE = 'Pour payer, il faut un compte TEAM OP : créez-le d\'abord, c\'est gratuit.';

(async () => {
  console.log('\n── 839 · pas de paiement sans compte ──');

  /* ── 1. les tarifs le disent — sur le texte VISIBLE, pas dans un commentaire ──────────────────────────────── */
  console.log('1. les tarifs le disent');
  const GEN = require(path.join(RACINE, 'scripts', 'site-marine.js'));
  const TARIFS = { 'tarifs.html (en service)': lire('tarifs.html'), 'tarifs du site v2 (générateur)': GEN.page('tarifs') };
  if (existe('apercu/site/tarifs.html')) TARIFS['apercu/site/tarifs.html'] = lire('apercu/site/tarifs.html');
  for (const [nom, h] of Object.entries(TARIFS)) {
    const t = texte(h);
    vrai(nom + ' : « ' + PHRASE + ' »', t.includes(PHRASE));
    vrai(nom + ' : la FAQ demande « Faut-il un compte pour payer ? » et répond que sans compte on ne paie pas',
      t.includes('Faut-il un compte pour payer ?') && t.includes('Sans compte, il n\'est pas possible de payer'));
  }
  vrai('la phrase est dans l\'INTRODUCTION, au-dessus des formules (là où l\'on regarde les prix)',
    /<p class="intro">[^<]*Pour payer, il faut un compte TEAM OP/.test(TARIFS['tarifs.html (en service)']));
  for (const f of ['apercu/tarifs.html', 'apercu/site-apple.html'].filter(existe))
    vrai(f + ' (ancienne page d\'aperçu, servie) : la même phrase', texte(lire(f)).includes(PHRASE));

  /* ── 2. plus aucun lien de paiement anonyme servi — recensé depuis le dépôt ─────────────────────────────── */
  console.log('2. plus aucun lien de paiement anonyme servi');
  let suivis = [];
  try { suivis = execSync('git ls-files', { cwd: RACINE, encoding: 'utf8' }).split('\n').filter(Boolean); } catch (e) {}
  const SERVIS = suivis.filter(f => /\.(html|js|json)$/.test(f) && !/^(scratchpad|design|tests|server|\.github|scripts)\//.test(f) && !/node_modules/.test(f));
  vrai('population : ' + SERVIS.length + ' fichiers servis relus', SERVIS.length > 50);
  v('⛔ aucun fichier servi ne porte un lien de paiement Stripe (buy.stripe.com)', SERVIS.filter(f => /buy\.stripe\.com/.test(lire(f))), []);

  /* ── 3. la page de paiement, son vrai script, contre un faux serveur ────────────────────────────────────── */
  function page(fichier, recherche, o) {
    const PAGE = lire(fichier);
    const bloc = [...PAGE.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)].map(m => m[1]).find(b => b.includes('const FORMULES = {'));
    if (!bloc) return null;
    const derniers = {}, conteneurs = {}, appels = [], ecouteurs = {};
    const nouveau = id => {
      const el = { id, _h: {}, style: {}, dataset: {}, value: '', disabled: false, textContent: '', innerHTML: '',
        addEventListener(t, fn) { (this._h[t] = this._h[t] || []).push(fn); },
        querySelectorAll() { return []; }, querySelector() { return null; }, blur() {}, focus() {},
        classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } } };
      derniers[id] = el; return el;
    };
    const document = { title: '', visibilityState: 'visible', querySelectorAll() { return []; }, querySelector() { return null; },
      addEventListener(t, fn) { (ecouteurs['d:' + t] = ecouteurs['d:' + t] || []).push(fn); },
      getElementById(id) {
        if (!/^(selecteurFormules|carteDroits|cartePaiement)$/.test(id)) return nouveau(id);
        if (!conteneurs[id]) {
          conteneurs[id] = nouveau(id);
          /* les pastilles de formule : relues depuis le HTML que la page vient d'écrire, pour que le banc les TOUCHE */
          if (id === 'selecteurFormules') conteneurs[id].querySelectorAll = function (sel) {
            if (sel !== '.puce-formule') return [];
            return (conteneurs.puces = [...this.innerHTML.matchAll(/data-formule="([a-z]+)"/g)].map(m => ({ dataset: { formule: m[1] }, _h: {},
              addEventListener(t, fn) { (this._h[t] = this._h[t] || []).push(fn); } })));
          };
        }
        return conteneurs[id];
      } };
    const window = { location: { search: recherche, href: '', hostname: o.hostname || 'teamop.fr' },
      addEventListener(t, fn) { (ecouteurs['w:' + t] = ecouteurs['w:' + t] || []).push(fn); } };
    const stockage = o.stockage || new Map();
    const localStorage = { getItem: k => (stockage.has(k) ? stockage.get(k) : null), setItem: (k, x) => stockage.set(k, String(x)), removeItem: k => stockage.delete(k) };
    const fetchBanc = async (url, opts) => {
      const appel = { url: String(url), methode: (opts && opts.method) || 'GET', entetes: Object.assign({}, (opts && opts.headers) || {}), corps: opts && opts.body ? JSON.parse(opts.body) : null };
      appels.push(appel);
      return o.serveur(appel);
    };
    const api = new Function('window', 'document', 'history', 'localStorage', 'fetch', 'alert',
      bloc + '\n;return { etat: () => ({ compte, compteMsg, nbUsersVoulu, formuleActive, cycleAnnuel }), compteLu, relireCompte };')(
      window, document, { replaceState() {} }, localStorage, fetchBanc, () => {});
    const html = () => conteneurs.cartePaiement.innerHTML;
    const puce = cle => { const b = (conteneurs.puces || []).find(x => x.dataset.formule === cle); return b ? (b._h.click[0](), true) : false; };
    return { api, derniers, appels, window, stockage, ecouteurs, html, texte: () => texte(html()), clic: id => derniers[id]._h.click[0](), puce };
  }
  const rep = (status, corps) => ({ ok: status >= 200 && status < 300, status, json: async () => { if (corps === undefined) throw new Error('pas du JSON'); return corps; } });
  const MOI = (verifie, prenom, nom) => rep(200, { ok: true, compte: { email: 'camille@entreprise-banc.fr', prenom: prenom === undefined ? 'Camille' : prenom, nom: nom === undefined ? 'Banc' : nom, verifie } });
  const avecSession = () => new Map([['teamop_portail_jeton', SESSION], ['elan_sync_team', 'monclient-9f2a']]);
  const aucunVersStripe = p => p.appels.every(a => !/stripe\/checkout/.test(a.url));

  vrai('population : ' + PAGES_PAIEMENT.length + ' pages de paiement (racine et aperçu)', PAGES_PAIEMENT.length >= 1);
  for (const f of PAGES_PAIEMENT) {
    console.log('3. ' + f + ' — son vrai script, contre un faux serveur');
    const apercu = /apercu\//.test(f);
    const portail = apercu ? '/apercu/espace.html' : 'espace.html';

    // a) sans compte : pas un seul aller-retour, et le bouton mène au portail avec le choix fait
    {
      const p = page(f, '?formule=business&utilisateurs=7', { serveur: () => rep(500, {}) });
      vrai('le script de la page s\'exécute', !!p);
      if (!p) continue;
      await p.api.compteLu;
      v('sans session : l\'état est « pas de compte », sans même demander au serveur', [p.api.etat().compte.etat, p.appels.length], ['aucun', 0]);
      vrai('⛔ le bouton dit « Créer mon compte pour payer »', p.texte().includes('Créer mon compte pour payer'));
      vrai('   et le bloc dit pourquoi : « Un compte TEAM OP d\'abord », avec le choix fait (7 abonnements Business)',
        p.texte().includes('Un compte TEAM OP d\'abord.') && p.texte().includes('7 abonnements Business'));
      vrai('   l\'annonce « Paiement sécurisé par Stripe, depuis votre compte TEAM OP »', p.texte().includes('Paiement sécurisé par Stripe, depuis votre compte TEAM OP'));
      await p.clic('btnPayer');
      const href = p.window.location.href, retour = decodeURIComponent((href.split('?retour=')[1] || ''));
      v('⛔ « Créer mon compte pour payer » mène au portail… sans rien envoyer à personne', [href.split('?')[0], p.appels.length], [portail, 0]);
      v('   … et le portail ramènera ici avec la formule et le nombre', retour, 'recap-abonnement.html?formule=business&utilisateurs=7');
      /* le retour est accepté par la VRAIE garde du portail qui le recevra (racine, ou aperçu pour l'aperçu) */
      const E = lire(apercu ? 'apercu/espace.html' : 'espace.html');
      const mR = /const RETOUR_PAIEMENT=\(\(\)=>\{ try\{ const r=new URLSearchParams\(location\.search\)\.get\('retour'\)\|\|''; return (\/.*?\/)\.test\(r\)\?r:''; \}/.exec(E);
      vrai('⛔ ' + (apercu ? 'apercu/espace.html' : 'espace.html') + ' accepte ce retour (sinon on ne revient jamais payer)', mR && new Function('return ' + mR[1])().test(retour));
      /* le cycle annuel voyage aussi */
      p.derniers.nbUsers.value = '3'; p.derniers.nbUsers._h.change[0]();
      const cy = page(f, '?formule=pro&utilisateurs=3&cycle=annuel', { serveur: () => rep(500, {}) });
      await cy.api.compteLu;
      v('?cycle=annuel est relu (on revient du portail sur l\'annuel choisi)', cy.api.etat().cycleAnnuel, true);
      await cy.clic('btnPayer');
      v('   et repart avec le retour', decodeURIComponent(cy.window.location.href.split('?retour=')[1] || ''), 'recap-abonnement.html?formule=pro&utilisateurs=3&cycle=annuel');
    }

    // b) une session que le serveur ne reconnaît plus : elle est oubliée, et on retombe sur « pas de compte »
    {
      const p = page(f, '?formule=pro', { stockage: avecSession(), serveur: a => /compte\/moi$/.test(a.url) ? rep(401, { error: 'session_refusee' }) : rep(500, {}) });
      v('session présente : on commence par la VÉRIFIER (bouton grisé, « Vérification de votre compte… »)', [p.api.etat().compte.etat, p.texte().includes('Vérification de votre compte'), /id="btnPayer"[^>]*disabled/.test(p.html())], ['lecture', true, true]);
      await p.api.compteLu;
      const moi = p.appels.find(a => /\/api\/compte\/moi$/.test(a.url));
      vrai('⛔ « qui suis-je » part avec la session dans Authorization, vers api.teamop.fr', moi && moi.entetes.Authorization === 'Bearer ' + SESSION && moi.url === 'https://api.teamop.fr/api/compte/moi');
      v('session refusée (401) : « pas de compte », et la session morte est oubliée', [p.api.etat().compte.etat, p.stockage.has('teamop_portail_jeton')], ['aucun', false]);
    }

    // c) adresse pas encore confirmée : on ne paie pas, on peut renvoyer le lien, et on se relit
    {
      let verifie = false, renvoi = 200;
      const p = page(f, '?formule=business&utilisateurs=2', { stockage: avecSession(), serveur: a => {
        if (/compte\/moi$/.test(a.url)) return MOI(verifie);
        if (/verifier\/renvoyer$/.test(a.url)) return renvoi === 200 ? rep(200, { ok: true }) : rep(renvoi, { error: 'trop_de_tentatives' });
        return rep(500, {});
      } });
      await p.api.compteLu;
      v('adresse pas confirmée : l\'état « à confirmer »', p.api.etat().compte.etat, 'a_confirmer');
      vrai('⛔ le bloc dit « Confirmez votre adresse e-mail » et à QUELLE adresse le lien est parti',
        p.texte().includes('Confirmez votre adresse e-mail.') && p.texte().includes('camille@entreprise-banc.fr'));
      vrai('   deux gestes : « Renvoyer le lien », « Changer de compte »', /id="btnRenvoiLien"/.test(p.html()) && /id="btnAutreCompte"/.test(p.html()));
      vrai('   le bouton principal dit « J\'ai confirmé mon adresse »', p.texte().includes('J\'ai confirmé mon adresse'));
      await p.clic('btnPayer');
      v('⛔ « J\'ai confirmé » sans l\'avoir fait : on relit, on reste « à confirmer », et RIEN ne part vers le paiement', [p.api.etat().compte.etat, aucunVersStripe(p)], ['a_confirmer', true]);
      await p.clic('btnRenvoiLien');
      const r1 = p.appels.filter(a => /verifier\/renvoyer$/.test(a.url));
      vrai('« Renvoyer le lien » : un POST vers le serveur, AVEC la session', r1.length === 1 && r1[0].methode === 'POST' && r1[0].entetes.Authorization === 'Bearer ' + SESSION);
      vrai('   et il dit que le lien est parti — parce que le serveur a répondu 200', p.texte().includes('Un nouveau lien vient de partir à camille@entreprise-banc.fr'));
      renvoi = 429; await p.clic('btnRenvoiLien');
      vrai('⛔ refusé (429) : il ne dit PAS « parti », il dit d\'attendre', !/vient de partir/.test(p.texte()) && p.texte().includes('patientez un moment'));
      renvoi = 502; await p.clic('btnRenvoiLien');
      vrai('⛔ serveur tombé (502) : « Le lien n\'a pas pu partir »', p.texte().includes('Le lien n\'a pas pu partir'));
      verifie = true;
      for (const fn of (p.ecouteurs['d:visibilitychange'] || [])) fn();
      await dormir(0); await dormir(0);
      v('⛔ revenir sur l\'onglet après avoir confirmé : la page se relit TOUTE SEULE et passe « prête »', p.api.etat().compte.etat, 'pret');
      vrai('   et l\'ancien message (« n\'a pas pu partir ») ne survit pas au changement', !/n'a pas pu partir/.test(p.texte()));
      v('   toujours rien vers le paiement tant que personne n\'a touché « Payer »', aucunVersStripe(p), true);
    }

    // d) compte prêt : le paiement part AVEC la session, et chaque refus dit ce qu'il est
    {
      let paiement = () => rep(200, { url: 'https://checkout.stripe.com/c/pay/banc' });
      const p = page(f, '?formule=business&utilisateurs=4', { stockage: avecSession(), serveur: a => {
        if (/compte\/moi$/.test(a.url)) return MOI(true);
        if (/stripe\/checkout$/.test(a.url)) return paiement(a);
        return rep(500, {});
      } });
      await p.api.compteLu;
      v('compte prouvé : l\'état « prêt »', p.api.etat().compte.etat, 'pret');
      vrai('⛔ le bloc dit à QUI le paiement sera rattaché : « Camille Banc · camille@entreprise-banc.fr »',
        p.texte().includes('Paiement rattaché à votre compte : Camille Banc · camille@entreprise-banc.fr'));
      vrai('   et « Ce n\'est pas vous ? Changer de compte »', p.texte().includes('Ce n\'est pas vous ? Changer de compte'));
      vrai('   le bouton : « Continuer vers le paiement »', p.texte().includes('Continuer vers le paiement'));
      await p.clic('btnPayer');
      const c = p.appels.filter(a => /stripe\/checkout$/.test(a.url));
      v('⛔ « Payer » : UN appel à la route de paiement, en POST', [c.length, c[0] && c[0].methode], [1, 'POST']);
      v('⛔ … AVEC la session du compte, sous la forme que le serveur lit', c[0] && c[0].entetes.Authorization, 'Bearer ' + SESSION);
      v('   … la quantité, le tarif et la référence de l\'espace', c[0] && [c[0].corps.quantity, /^price_/.test(c[0].corps.price), c[0].corps.ref], [4, true, 'monclient-9f2a']);
      v('   … puis la page part vers l\'adresse que le serveur a rendue', p.window.location.href, 'https://checkout.stripe.com/c/pay/banc');

      const essai = async (reponse, etiquette) => {
        paiement = reponse; p.window.location.href = '';
        const q = page(f, '?formule=business&utilisateurs=4', { stockage: avecSession(), serveur: a => {
          if (/compte\/moi$/.test(a.url)) return MOI(true);
          if (/stripe\/checkout$/.test(a.url)) return paiement(a);
          return rep(500, {});
        } });
        await q.api.compteLu; await q.clic('btnPayer');
        return q;
      };
      let q = await essai(() => rep(403, { error: 'adresse_non_verifiee' }));
      v('⛔ le serveur dit « adresse pas prouvée » (403) : la page passe « à confirmer », sans partir', [q.api.etat().compte.etat, q.window.location.href], ['a_confirmer', '']);
      q = await essai(() => rep(401, { error: 'compte_requis' }));
      v('⛔ session expirée entre-temps (401) : « pas de compte », session oubliée, et la page le DIT',
        [q.api.etat().compte.etat, q.stockage.has('teamop_portail_jeton'), q.texte().includes('Votre session a expiré'), q.window.location.href], ['aucun', false, true, '']);
      q = await essai(() => rep(403, { error: 'compte_autre_entreprise' }));
      v('⛔ « B » — le compte n\'est pas celui de l\'entreprise de l\'appareil (403) : la page dit QUI peut payer, reste « prête », ne part pas',
        [q.api.etat().compte.etat, q.texte().includes('Seul le compte de l\'entreprise peut payer pour elle'), q.texte().includes('Rien n\'a été payé'), q.window.location.href],
        ['pret', true, true, '']);
      vrai('   … sans le « réessayez » d\'une panne (le refus est définitif pour ce compte), avec « Changer de compte » à portée',
        !/Réessayez dans un instant/.test(q.texte()) && q.texte().includes('Changer de compte'));
      /* et les deux refus voisins (relecture de `gardien`) : une entreprise SANS adresse chez TEAM OP — « connectez-vous avec
         l'adresse de l'entreprise » serait une consigne impossible — et une référence ambiguë */
      q = await essai(() => rep(403, { error: 'entreprise_sans_adresse' }));
      v('⛔ « B » — l\'entreprise de l\'appareil n\'a PAS d\'adresse chez TEAM OP (403) : la page dit d\'écrire au support, jamais « connectez-vous avec l\'adresse de l\'entreprise »',
        [q.api.etat().compte.etat, q.texte().includes('n\'a pas encore d\'adresse e-mail enregistrée chez TEAM OP'), q.texte().includes('support@teamop.fr'),
          /Connectez-vous avec l'adresse e-mail de l'entreprise|Réessayez dans un instant/.test(q.texte()), q.texte().includes('Rien n\'a été payé'), q.window.location.href],
        ['pret', true, true, false, true, '']);
      q = await essai(() => rep(403, { error: 'reference_ambigue' }));
      v('   … une référence ambiguë (403) : au support, sans « réessayez », et rien n\'est parti',
        [q.texte().includes('ne peut pas être rattaché à votre entreprise sans vérification'), /Réessayez dans un instant/.test(q.texte()), q.texte().includes('Rien n\'a été payé'), q.window.location.href], [true, false, true, '']);
      /* un tarif SOUS la formule de l'entreprise, ou un tarif inconnu (28 septembre 2026, nuit) : la page dit lequel, sans
         « réessayez dans un instant », et ne part pas */
      q = await essai(() => rep(403, { error: 'tarif_formule', formule: 'premium' }));
      v('⛔ tarif sous la formule de l\'entreprise (403) : la page nomme SA formule (Business Premium), renvoie au support pour en changer, ne part pas',
        [q.texte().includes('Votre entreprise est en formule Business Premium'), q.texte().includes('support@teamop.fr'), /Réessayez dans un instant/.test(q.texte()), q.texte().includes('Rien n\'a été payé'), q.window.location.href],
        [true, true, false, true, '']);
      /* et le geste qui suit : monter à la formule de l'entreprise. Le NOMBRE venu du courriel (4) reste — la pastille le
         remettait à 1 —, et le refus d'avant, qui visait l'autre formule, s'efface (relecture adverse, 28 septembre, nuit) */
      const avantPuce = q.api.etat().nbUsersVoulu;
      v('   … toucher « Business Premium » : 4 utilisateurs restent (pas 1), le refus d\'avant s\'efface, et payer vise Premium',
        [avantPuce, q.puce('premium'), q.api.etat().formuleActive, q.api.etat().nbUsersVoulu, q.api.etat().compteMsg, /Votre entreprise est en formule/.test(q.texte()), /id="nbUsers"[^>]*value="4"/.test(q.html())],
        [4, true, 'premium', 4, null, false, true]);
      q = await essai(() => rep(400, { error: 'tarif_inconnu' }));
      v('   … un tarif que le serveur ne connaît pas (400) : « rechargez la page », rien n\'est parti',
        [q.texte().includes('Ce tarif n\'est plus proposé'), q.window.location.href], [true, '']);
      q = await essai(() => rep(429, { error: 'trop de requêtes' }));
      vrai('⛔ trop de tentatives (429) : on le dit, on ne part pas', q.texte().includes('Trop de tentatives') && q.window.location.href === '');
      q = await essai(() => rep(502, undefined));
      vrai('⛔ serveur tombé (502, du HTML) : « Le paiement n\'a pas pu s\'ouvrir — rien n\'a été payé », et AUCUN départ',
        q.texte().includes('Le paiement n\'a pas pu s\'ouvrir — rien n\'a été payé') && q.window.location.href === '');
      q = await essai(() => { throw new TypeError('Failed to fetch'); });
      vrai('⛔ coupure réseau : le même message, et AUCUN départ (plus de repli vers un lien anonyme)',
        q.texte().includes('Le paiement n\'a pas pu s\'ouvrir') && q.window.location.href === '');
      q = await essai(() => rep(200, { ok: true }));
      vrai('   une réponse 200 SANS adresse de paiement ne fait partir nulle part', q.window.location.href === '' && q.texte().includes('Le paiement n\'a pas pu s\'ouvrir'));
    }

    // d bis) ⛔ quelqu'un d'autre se connecte dans un AUTRE onglet : la page ne paie jamais au nom qu'elle n'affiche pas
    {
      const AUTRE = 'e'.repeat(64);
      const p = page(f, '?formule=business&utilisateurs=4', { stockage: avecSession(), serveur: a => {
        if (/compte\/moi$/.test(a.url)) return a.entetes.Authorization === 'Bearer ' + AUTRE
          ? rep(200, { ok: true, compte: { email: 'bruno@societe-b.fr', prenom: 'Bruno', nom: 'Autre', verifie: true } }) : MOI(true);
        if (/stripe\/checkout$/.test(a.url)) return rep(200, { url: 'https://checkout.stripe.com/c/pay/banc' });
        return rep(500, {});
      } });
      await p.api.compteLu;
      vrai('la page montre Camille', p.texte().includes('Camille Banc · camille@entreprise-banc.fr'));
      p.stockage.set('teamop_portail_jeton', AUTRE);   // le portail, dans un autre onglet, vient de connecter Bruno
      await p.clic('btnPayer');
      v('⛔ « Payer » avec une session changée ailleurs : on ne paie PAS, on relit', [aucunVersStripe(p), p.window.location.href], [true, '']);
      vrai('   et la page montre maintenant Bruno (c\'est lui qui paiera, s\'il retouche « Payer »)', p.texte().includes('Bruno Autre · bruno@societe-b.fr'));
      await p.clic('btnPayer');
      const c = p.appels.filter(a => /stripe\/checkout$/.test(a.url));
      v('   retouché : le paiement part, avec la session de Bruno — celle qui est affichée', [c.length, c[0] && c[0].entetes.Authorization], [1, 'Bearer ' + AUTRE]);
      const q = page(f, '?formule=pro', { stockage: avecSession(), serveur: a => /compte\/moi$/.test(a.url)
        ? (a.entetes.Authorization === 'Bearer ' + AUTRE ? rep(200, { ok: true, compte: { email: 'bruno@societe-b.fr', verifie: true } }) : MOI(true)) : rep(500, {}) });
      await q.api.compteLu;
      q.stockage.set('teamop_portail_jeton', AUTRE);
      for (const fn of (q.ecouteurs['w:storage'] || [])) fn({ key: 'teamop_portail_jeton' });
      await dormir(0); await dormir(0);
      vrai('⛔ une session posée par un autre onglet (événement « storage ») : la page se relit d\'elle-même', q.texte().includes('bruno@societe-b.fr'));
      const r2 = page(f, '?formule=pro', { stockage: avecSession(), serveur: a => /compte\/moi$/.test(a.url) ? (a.entetes.Authorization ? MOI(true) : rep(401, {})) : rep(500, {}) });
      await r2.api.compteLu;
      r2.stockage.delete('teamop_portail_jeton');   // déconnecté ailleurs
      for (const fn of (r2.ecouteurs['d:visibilitychange'] || [])) fn();
      await dormir(0); await dormir(0);
      v('⛔ revenir sur l\'onglet d\'une page « prête » après une déconnexion ailleurs : elle se relit, et redit « pas de compte »', r2.api.etat().compte.etat, 'aucun');
    }

    // e) le service ne répond pas : on le dit, on ne paie pas, on peut réessayer
    {
      let panne = true;
      const p = page(f, '?formule=premium', { stockage: avecSession(), serveur: a => {
        if (/compte\/moi$/.test(a.url)) { if (panne) throw new TypeError('Failed to fetch'); return MOI(true); }
        return rep(500, {});
      } });
      await p.api.compteLu;
      v('« qui suis-je » injoignable : l\'état « injoignable »', p.api.etat().compte.etat, 'injoignable');
      vrai('⛔ le bloc le dit : « Le service TEAM OP ne répond pas » — « rien n\'a été payé »', p.texte().includes('Le service TEAM OP ne répond pas.') && p.texte().includes('rien n\'a été payé'));
      vrai('   le bouton : « Réessayer »', p.texte().includes('Réessayer'));
      vrai('   la session n\'est PAS oubliée pour une panne (seul un 401 la fait oublier)', p.stockage.has('teamop_portail_jeton'));
      panne = false; await p.clic('btnPayer');
      v('« Réessayer » relit le compte, et la page passe « prête » — sans avoir payé', [p.api.etat().compte.etat, aucunVersStripe(p)], ['pret', true]);
    }

    // f) ce qui vient du compte s'affiche ÉCHAPPÉ
    {
      const p = page(f, '?formule=pro', { stockage: avecSession(), serveur: a => /compte\/moi$/.test(a.url) ? MOI(true, '<img src=x onerror=alert(1)>', '"Banc"') : rep(500, {}) });
      await p.api.compteLu;
      vrai('⛔ un prénom qui contient du HTML s\'affiche en texte, jamais en balise', !/<img/i.test(p.html()) && /&lt;img src=x onerror=alert\(1\)&gt;/.test(p.html()));
    }

    // g) « Changer de compte » : la session est rendue au serveur, oubliée ici, et on repart au portail
    {
      const p = page(f, '?formule=business&utilisateurs=5', { stockage: avecSession(), serveur: a => {
        if (/compte\/moi$/.test(a.url)) return MOI(true);
        if (/compte\/deconnexion$/.test(a.url)) return rep(200, { ok: true });
        return rep(500, {});
      } });
      await p.api.compteLu;
      await p.clic('btnAutreCompte');
      const d = p.appels.find(a => /compte\/deconnexion$/.test(a.url));
      vrai('« Changer de compte » : la session est rendue au serveur (déconnexion, AVEC la session)', d && d.methode === 'POST' && d.entetes.Authorization === 'Bearer ' + SESSION);
      v('   oubliée sur l\'appareil, et direction le portail, avec le choix fait', [p.stockage.has('teamop_portail_jeton'), decodeURIComponent(p.window.location.href.split('?retour=')[1] || '')], [false, 'recap-abonnement.html?formule=business&utilisateurs=5']);
    }

    // h) le Gratuit : un compte, rien à payer, rien ne change
    {
      const p = page(f, '?formule=gratuit', { serveur: () => rep(500, {}) });
      await p.api.compteLu;
      vrai('Gratuit : « Créer mon compte gratuit », sans bloc de compte ni paiement', p.texte().includes('Créer mon compte gratuit') && !/compte-bloc/.test(p.html()));
      await p.clic('btnPayer');
      v('   il mène au portail, sans rien demander au serveur', [p.window.location.href, p.appels.length], ['espace.html', 0].map((x, i) => i === 0 && apercu ? '/apercu/espace.html' : x));
    }
  }

  /* ── 3 bis. le portail s'ouvre sur « Créer un compte » quand on arrive du paiement ─────────────────────────── */
  /* ⛔ ZONE MORTE, trouvée en jouant le parcours au navigateur (scratchpad/sonde-compte-paiement.js). Sans session,
     `auth.onAuthStateChanged` rappelle TOUT DE SUITE, donc `renderAuth()` → `authTab('signup')` s'exécutait avant la ligne
     `let _authMode` : l'exception était avalée par le `try` de `direAuth`, et le portail restait sur « Se connecter ». On
     lit l'ordre RÉEL des deux déclarations dans chaque portail servi — la preuve au navigateur est dans la sonde. */
  console.log('3 bis. le portail ouvre « Créer un compte » quand on arrive du paiement');
  for (const e of ['espace.html', 'apercu/espace.html'].filter(existe)) {
    const E = lire(e), iMode = E.indexOf("let _authMode='login';"), iEcoute = E.indexOf('auth.onAuthStateChanged(user=>{'), iTab = E.indexOf("if(RETOUR_PAIEMENT) authTab('signup');");
    vrai(e + ' : les trois lignes sont trouvées (l\'onglet, l\'écouteur, l\'ouverture sur « Créer un compte »)', iMode > 0 && iEcoute > 0 && iTab > 0);
    vrai('⛔ ' + e + ' : l\'onglet choisi est déclaré AVANT l\'écouteur de connexion (sinon zone morte, et l\'onglet reste « Se connecter »)', iMode > 0 && iMode < iEcoute);
  }

  /* ── 4. la couture : le VRAI portail, la VRAIE page, le VRAI serveur ───────────────────────────────────────── */
  console.log('4. la couture : le vrai portail, la vraie page, le vrai serveur');
  if (!existe('server/node_modules')) { console.log('  (sauté : server/node_modules absent)'); }
  else {
    const SRV = lire('server/index.js');
    const iRoute = SRV.indexOf("app.post('/api/stripe/checkout'");
    const ROUTE = SRV.slice(iRoute, SRV.indexOf("app.post('", iRoute + 10));
    const REGLE = /cm\.verifie\(payeur\)/.test(ROUTE) && /customer_email/.test(ROUTE);
    const REGLE_B = /compte_autre_entreprise/.test(ROUTE);   // « B — on verrouille » (28 septembre 2026), part avec le serveur
    console.log('  ' + (REGLE ? 'serveur de ce dépôt : la route exige un compte prouvé'
      : '⚠️ serveur de ce dépôt : la route n\'a PAS encore la règle (elle part sur « pousse le serveur ») — la page doit tenir seule'));
    const BANC = fs.mkdtempSync(path.join(os.tmpdir(), 'banc-839-'));
    const JOURNAL_STRIPE = path.join(BANC, 'stripe.jsonl');
    /* Stripe, simulé DANS le processus serveur : `fetch` global remplacé avant le chargement d'`index.js`. Ce qu'on lit
       est donc littéralement ce que le serveur enverrait à Stripe — et rien ne sort de la machine. */
    const PRECHARGE = path.join(BANC, 'stripe-simule.js');
    fs.writeFileSync(PRECHARGE, `const fs = require('fs'); const vrai = globalThis.fetch;
globalThis.fetch = async function (url, opts) {
  const u = String(url && url.url || url);
  if (u.startsWith('https://api.stripe.com/')) {
    fs.appendFileSync(${JSON.stringify(JOURNAL_STRIPE)}, JSON.stringify({ url: u, corps: String((opts && opts.body) || '') }) + '\\n');
    const corps = u.startsWith('https://api.stripe.com/v1/checkout/sessions') ? { url: 'https://checkout.stripe.com/c/pay/banc-839' } : { data: [], has_more: false };
    return new Response(JSON.stringify(corps), { status: 200, headers: { 'content-type': 'application/json' } });
  }
  return vrai.apply(this, arguments);
};\n`);
    /* un relais de courriel (le même que test-831) : le lien de confirmation se lit dans ce qui est VRAIMENT parti */
    const recus = [];
    const facteur = require('net').createServer(c => {
      let tampon = '', corps = false, msg = '';
      c.write('220 banc\r\n');
      c.on('data', d => {
        tampon += d.toString('utf8');
        let i;
        while ((i = tampon.indexOf('\r\n')) >= 0) {
          let l = tampon.slice(0, i); tampon = tampon.slice(i + 2);
          if (corps) { if (l === '.') { corps = false; recus.push(msg); msg = ''; c.write('250 ok\r\n'); } else { if (l.startsWith('..')) l = l.slice(1); msg += l + '\n'; } continue; }
          const h = l.toUpperCase();
          if (h.startsWith('EHLO') || h.startsWith('HELO')) c.write('250-banc\r\n250 AUTH PLAIN LOGIN\r\n');
          else if (h.startsWith('AUTH')) c.write('235 ok\r\n');
          else if (h.startsWith('DATA')) { corps = true; c.write('354 go\r\n'); }
          else if (h.startsWith('QUIT')) { c.write('221 bye\r\n'); c.end(); }
          else c.write('250 ok\r\n');
        }
      });
      c.on('error', () => {});
    });
    const portSmtp = await new Promise(res => facteur.listen(0, '127.0.0.1', () => res(facteur.address().port)));
    const portLibre = () => new Promise(res => { const s = require('net').createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)); }); });
    const data = path.join(BANC, 'data'); fs.mkdirSync(data, { recursive: true });
    /* l'annuaire du vrai serveur : l'entreprise de Camille (son adresse), et une voisine — pour jouer « B » de bout en bout */
    fs.writeFileSync(path.join(data, 'espaces.json'), JSON.stringify({
      'camille-banc': { nom: 'Camille Banc', t: 'banc-camille-t1', email: 'camille@entreprise-banc.fr', ts: 1, par: 'banc', origine: 'banc' },
      'voisine-banc': { nom: 'La voisine', t: 'banc-voisine-t2', email: 'patron@voisine-banc.fr', ts: 1, par: 'banc', origine: 'banc' },
      'sansadresse-banc': { nom: 'Sans adresse', t: 'banc-sansadr-t3', email: '', ts: 1, par: 'banc', origine: 'banc' },
      /* une seconde entreprise de Camille, réglée Business Premium dans la Tour (deux noms d'accès : l'un oublié en Pro) */
      'premium-banc': { nom: 'Camille Premium', t: 'banc-prem-t4', email: 'camille@entreprise-banc.fr', formule: 'premium', quantite: 1, ts: 2, par: 'banc', origine: 'banc' },
      'premium-banc-ancien': { nom: 'Camille Premium', t: 'banc-prem-t4', email: 'camille@entreprise-banc.fr', formule: 'pro', quantite: 1, ts: 1, par: 'banc', origine: 'banc' },
      /* et une troisième, descendue de Business Premium à Pro sur son nom RÉCENT, l'ancien nom resté en Business Premium */
      'descendue-banc': { nom: 'Camille Pro', t: 'banc-desc-t5', email: 'camille@entreprise-banc.fr', formule: 'pro', quantite: 1, ts: 3, par: 'banc', origine: 'banc' },
      'descendue-banc-ancien': { nom: 'Camille Pro', t: 'banc-desc-t5', email: 'camille@entreprise-banc.fr', formule: 'premium', quantite: 1, ts: 1, par: 'banc', origine: 'banc' },
    }));
    const cfg = path.join(BANC, 'config.json');
    const vap = require(path.join(RACINE, 'server', 'node_modules', 'web-push')).generateVAPIDKeys();
    fs.writeFileSync(cfg, JSON.stringify({ vapidPublicKey: vap.publicKey, vapidPrivateKey: vap.privateKey, apiKey: 'banc',
      adminPassHash: crypto.createHash('sha256').update('mot-de-passe-du-banc-839').digest('hex'), comptes: { actif: true },
      stripe: { secretKey: 'sk_de_banc_839' },
      smtp: { host: '127.0.0.1', port: portSmtp, secure: false, user: 'x', pass: 'y', from: 'banc@teamop.fr' } }));
    const port = await portLibre();
    const enfant = spawn(process.execPath, ['--require', PRECHARGE, path.join(RACINE, 'server', 'index.js')], {
      env: Object.assign({}, process.env, { TEAMOP_CONFIG: cfg, TEAMOP_DATA: data, PORT: String(port) }), stdio: ['ignore', 'pipe', 'pipe'] });
    let journal = ''; enfant.stdout.on('data', d => { journal += d; }); enfant.stderr.on('data', d => { journal += d; });
    const B = 'http://127.0.0.1:' + port;
    let vivant = false;
    for (let i = 0; i < 150 && !vivant; i++) { await dormir(100); try { vivant = (await fetch(B + '/health')).ok; } catch (e) {} }
    vrai('le vrai serveur démarre (comptes du portail allumés, Stripe simulé dans son processus)', vivant);
    const stripeRecu = () => { try { return fs.readFileSync(JOURNAL_STRIPE, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l)).filter(x => /checkout\/sessions/.test(x.url)); } catch (e) { return []; } };
    try {
      if (vivant) {
        /* le portail : l'adaptateur RÉEL d'espace.html (la même découpe que test-831), sur un rangement PARTAGÉ avec la
           page de paiement — c'est exactement ce que fait le navigateur, les deux pages étant sur la même origine */
        const ESPACE = lire('espace.html');
        const i0 = ESPACE.indexOf('const API_PORTAIL'), i1 = ESPACE.indexOf('const _pv = portailMaison();');
        const ADAPTATEUR = i0 > 0 && i1 > i0 ? ESPACE.slice(i0, i1) : '';
        vrai('l\'adaptateur du portail est trouvé dans espace.html', /function portailMaison\(/.test(ADAPTATEUR));
        const rangement = new Map();
        const LS = { getItem: k => (rangement.has(k) ? rangement.get(k) : null), setItem: (k, x) => rangement.set(k, String(x)), removeItem: k => rangement.delete(k) };
        const code = ADAPTATEUR.replace(/const API_PORTAIL = [\s\S]*?;\n/, 'const API_PORTAIL = ' + JSON.stringify(B) + ';\n');
        const portail = new Function('fetch', 'crypto', 'TextEncoder', 'console', 'location', 'localStorage', 'setTimeout', 'clearTimeout', code + '\nreturn portailMaison();')(
          (u, o) => fetch(u, o), globalThis.crypto, TextEncoder, { warn() {}, log() {}, error() {} }, { hostname: '127.0.0.1' }, LS, setTimeout, clearTimeout);
        /* la page de paiement, sur le même rangement ; son adresse d'API (api.teamop.fr) est redirigée vers le banc */
        const vers = a => fetch(a.url.replace('https://api.teamop.fr', B), { method: a.methode, headers: a.entetes, body: a.corps ? JSON.stringify(a.corps) : undefined })
          .then(async r => { const t = await r.text(); let j; try { j = JSON.parse(t); } catch (e) { j = undefined; } return rep(r.status, j); });
        const recap = (recherche) => page(PAGES_PAIEMENT[0], recherche, { stockage: rangement, serveur: vers });

        // sans compte : pas un appel
        const p0 = recap('?formule=business&utilisateurs=3');
        await p0.api.compteLu;
        v('sans compte : « Créer mon compte pour payer », et pas un seul appel au serveur', [p0.api.etat().compte.etat, p0.appels.length], ['aucun', 0]);

        // le compte est créé par le VRAI portail — adresse pas encore confirmée
        await portail.auth.createUserWithEmailAndPassword('camille@entreprise-banc.fr', 'un-mot-de-passe-solide-839');
        vrai('le portail a rangé sa session là où la page de paiement la cherche (teamop_portail_jeton)', /^[0-9a-f]{64}$/.test(rangement.get('teamop_portail_jeton') || ''));
        /* ⚠️ Camille a aussi une fiche Business Premium (plus bas) : sans référence, l'adresse de son compte y mène, donc
           ce qu'elle paie ici est Business Premium (un tarif plus bas est refusé : voir « LE TARIF ») */
        const p1 = recap('?formule=premium&utilisateurs=3');
        await p1.api.compteLu;
        v('⛔ compte créé, adresse pas confirmée : le vrai serveur le dit, la page passe « à confirmer »', p1.api.etat().compte.etat, 'a_confirmer');
        const direct = await fetch(B + '/api/stripe/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + rangement.get('teamop_portail_jeton') }, body: JSON.stringify({ price: 'price_1Banc', quantity: 1 }) });
        if (REGLE) v('⛔ et payer SANS la page (appel direct) avec cette session : 403, rien chez Stripe', [direct.status, stripeRecu().length], [403, 0]);
        else vrai('   (serveur d\'avant : un appel direct passerait — la page, elle, ne l\'envoie pas)', true);
        const avant = recus.length;
        await p1.clic('btnRenvoiLien');
        let parti = false; for (let i = 0; i < 40 && !parti; i++) { await dormir(100); parti = recus.length > avant; }
        vrai('« Renvoyer le lien » : le VRAI serveur l\'a envoyé (le relais l\'a reçu), et la page le dit', parti && p1.texte().includes('Un nouveau lien vient de partir'));
        /* le lien de confirmation, lu dans le courriel (quoted-printable décodé) */
        const qp = m => m.replace(/=\r?\n/g, '').replace(/=([0-9A-F]{2})/g, (x, h) => String.fromCharCode(parseInt(h, 16)));
        const liens = recus.map(qp).map(m => (/mode=verifyEmail&jeton=([0-9a-f]{64})/.exec(m) || [])[1]).filter(Boolean);
        vrai('   le courriel porte bien un lien de confirmation', liens.length >= 1);
        const conf = await fetch(B + '/api/compte/verifier', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ jeton: liens[liens.length - 1] }) });
        v('le lien est suivi (comme reinit.html le fait) : adresse confirmée', conf.status, 200);
        await p1.clic('btnPayer');   // « J'ai confirmé mon adresse »
        await dormir(0);
        v('⛔ « J\'ai confirmé mon adresse » : la page relit le vrai serveur et passe « prête »', p1.api.etat().compte.etat, 'pret');
        vrai('   « Paiement rattaché à votre compte : camille@entreprise-banc.fr »', p1.texte().includes('Paiement rattaché à votre compte : camille@entreprise-banc.fr'));
        /* on compte à partir d'ICI : contre le serveur d'avant, l'appel direct plus haut a, lui, ouvert une page */
        const n0 = stripeRecu().length;
        await p1.clic('btnPayer');
        const s1 = stripeRecu().slice(n0);
        v('⛔ « Payer » : le vrai serveur a ouvert UNE page de paiement chez Stripe, et la page y part', [s1.length, p1.window.location.href], [1, 'https://checkout.stripe.com/c/pay/banc-839']);
        const envoye = new URLSearchParams(s1[0] ? s1[0].corps : '');
        v('   pour la quantité choisie (3)', envoye.get('line_items[0][quantity]'), '3');
        if (REGLE) {
          v('⛔ au nom du COMPTE : c\'est son adresse que Stripe reçoit pour le client (customer_email)', envoye.get('customer_email'), 'camille@entreprise-banc.fr');
          v('⛔ et elle est gravée sur l\'ABONNEMENT (metadata[compte])', envoye.get('subscription_data[metadata][compte]'), 'camille@entreprise-banc.fr');
        } else vrai('   (serveur d\'avant : l\'adresse du compte n\'est pas encore imposée à Stripe — elle le sera avec « pousse le serveur »)', true);

        // la session brûlée ailleurs (déconnexion depuis le portail) : la page le découvre en payant, et le dit
        const p2 = recap('?formule=pro&utilisateurs=2');
        await p2.api.compteLu;
        v('une nouvelle page, même session : « prête »', p2.api.etat().compte.etat, 'pret');
        /* la session meurt CÔTÉ SERVEUR (périmée, mot de passe changé ailleurs) — l'appareil la garde encore */
        const morte = rangement.get('teamop_portail_jeton');
        await fetch(B + '/api/compte/deconnexion', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + morte }, body: '{}' });
        await p2.clic('btnPayer');
        if (REGLE) v('⛔ session morte au moment de payer : le vrai serveur refuse (401), la page dit « Votre session a expiré », l\'oublie, rien chez Stripe',
          [p2.api.etat().compte.etat, p2.texte().includes('Votre session a expiré'), rangement.has('teamop_portail_jeton'), stripeRecu().length], ['aucun', true, false, n0 + 1]);
        else vrai('   (serveur d\'avant : une session morte ne se découvre qu\'à la relecture du compte)', true);
        /* et déconnecté AILLEURS (le portail, dans un autre onglet, a retiré la session) : la page relit, ne paie pas */
        await portail.auth.signInWithEmailAndPassword('camille@entreprise-banc.fr', 'un-mot-de-passe-solide-839');
        const p3 = recap('?formule=pro&utilisateurs=2');
        await p3.api.compteLu;
        v('reconnecté par le portail : une nouvelle page est « prête »', p3.api.etat().compte.etat, 'pret');
        await portail.auth.signOut();
        const n3 = stripeRecu().length;   // compté ICI : contre la route d'avant, la session morte plus haut a, elle, payé
        await p3.clic('btnPayer');
        v('⛔ déconnecté dans un autre onglet puis « Payer » : la page relit le vrai serveur, redit « pas de compte », rien chez Stripe',
          [p3.api.etat().compte.etat, stripeRecu().length], ['aucun', n3]);

        // sans en-tête du tout, ou mal formé : le vrai serveur refuse
        if (REGLE) {
          const sans = await fetch(B + '/api/stripe/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ price: 'price_1Banc', quantity: 1 }) });
          const faux = await fetch(B + '/api/stripe/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + 'e'.repeat(64) }, body: JSON.stringify({ price: 'price_1Banc', quantity: 1 }) });
          v('⛔ le vrai serveur : sans session 401, session inventée 401 — et rien de plus chez Stripe', [sans.status, faux.status, stripeRecu().length], [401, 401, n0 + 1]);
        }

        // « B — on verrouille » (Justin, 28 septembre 2026) : seul le compte de l'entreprise paie pour elle — le VRAI serveur, son annuaire
        await portail.auth.signInWithEmailAndPassword('camille@entreprise-banc.fr', 'un-mot-de-passe-solide-839');
        const payerAvec = async (espaceAppareil, formule) => {
          if (espaceAppareil) rangement.set('elan_sync_team', espaceAppareil); else rangement.delete('elan_sync_team');
          const q = recap('?formule=' + (formule || 'business') + '&utilisateurs=2');
          await q.api.compteLu;
          const n = stripeRecu().length;
          await q.clic('btnPayer');
          const s = stripeRecu().slice(n);
          return { q, s, envoye: new URLSearchParams(s[0] ? s[0].corps : '') };
        };
        const voisine = await payerAvec('banc-voisine-t2');
        if (REGLE_B) {
          v('⛔ « B » — l\'appareil est relié à une AUTRE entreprise : le vrai serveur refuse, la page le dit, rien chez Stripe',
            [voisine.s.length, voisine.q.texte().includes('Seul le compte de l\'entreprise peut payer pour elle'), voisine.q.window.location.href], [0, true, '']);
          const sienne = await payerAvec('banc-camille-t1');
          v('⛔ « B » — l\'appareil est relié à SON entreprise : le paiement s\'ouvre, la référence est gravée sur l\'abonnement',
            [sienne.s.length, sienne.envoye.get('subscription_data[metadata][espace]'), sienne.q.window.location.href], [1, 'banc-camille-t1', 'https://checkout.stripe.com/c/pay/banc-839']);
          /* une entreprise SANS adresse chez TEAM OP (espaces ouverts par la Tour) : aucun compte ne prouve être le sien — le
             refus doit le DIRE, pas envoyer le client chercher une adresse qui n'existe pas (`gardien`) */
          const sansAdr = await payerAvec('banc-sansadr-t3');
          if (/entreprise_sans_adresse/.test(ROUTE)) v('⛔ « B » — relié à une entreprise SANS adresse : le vrai serveur refuse en le disant, la page renvoie au support, rien chez Stripe',
            [sansAdr.s.length, sansAdr.q.texte().includes('n\'a pas encore d\'adresse e-mail enregistrée chez TEAM OP'), /Connectez-vous avec l'adresse e-mail de l'entreprise/.test(sansAdr.q.texte()), sansAdr.q.window.location.href], [0, true, false, '']);
          else vrai('   (serveur « B » sans le refus distinct : l\'entreprise sans adresse est refusée, rien chez Stripe)', sansAdr.s.length === 0);
          const inconnue = await payerAvec('banc-inconnu-t9', 'premium');
          v('   une référence inconnue de l\'annuaire : le paiement s\'ouvre SANS référence (rattaché à l\'adresse du compte, à personne d\'autre)',
            [inconnue.s.length, inconnue.envoye.get('subscription_data[metadata][espace]'), inconnue.envoye.get('customer_email')], [1, null, 'camille@entreprise-banc.fr']);
          /* ⛔ LE TARIF (28 septembre 2026, nuit) : seulement ceux de la page, et jamais sous la formule de l'entreprise */
          if (/tarif_formule/.test(ROUTE)) {
            const bas = await payerAvec('banc-prem-t4', 'business');
            v('⛔ son entreprise est réglée Business Premium : payer Business est refusé par le vrai serveur, la page nomme sa formule, rien chez Stripe',
              [bas.s.length, bas.q.texte().includes('Votre entreprise est en formule Business Premium'), bas.q.window.location.href], [0, true, '']);
            /* OP MESSAGES : la page le montre « Bientôt disponible », sans bouton — seul un appel direct peut l'envoyer */
            const prixMsg = (/msgpro:\s*\{ mensuel: '(price_\w+)'/.exec(lire(PAGES_PAIEMENT[0])) || [])[1];
            const nMsg = stripeRecu().length;
            const msg = await fetch(B + '/api/stripe/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + rangement.get('teamop_portail_jeton') }, body: JSON.stringify({ price: prixMsg, quantity: 1, ref: 'banc-prem-t4' }) });
            const mj = await msg.json().catch(() => ({}));
            v('⛔ … et le tarif d\'OP MESSAGES (appel direct) ne règle pas OP GESTION : 403 tarif_formule, rien chez Stripe', [!!prixMsg, msg.status, mj.error, mj.formule, stripeRecu().length], [true, 403, 'tarif_formule', 'premium', nMsg]);
            const juste = await payerAvec('banc-prem-t4', 'premium');
            v('⛔ Business Premium : le paiement s\'ouvre, référence gravée (la fiche lue par l\'application — la plus récente — fait foi, pas le vieux nom en Pro)',
              [juste.s.length, juste.envoye.get('subscription_data[metadata][espace]'), juste.envoye.get('line_items[0][price]'), juste.q.window.location.href],
              [1, 'banc-prem-t4', (/premium:\s*\{ mensuel: '(price_\w+)'/.exec(lire(PAGES_PAIEMENT[0])) || [])[1], 'https://checkout.stripe.com/c/pay/banc-839']);
            const desc = await payerAvec('banc-desc-t5', 'pro');
            v('⛔ descendue à Pro sur son nom récent (l\'ancien nom resté en Business Premium) : le tarif Pro passe', [desc.s.length, desc.envoye.get('subscription_data[metadata][espace]')], [1, 'banc-desc-t5']);
            /* ⛔ SANS référence (appareil qui n'a jamais ouvert l'application) : l'adresse du compte dit qui paie — Camille a une
               fiche Business Premium, le tarif Business est refusé ; le tarif Business Premium passe */
            const sansRef = await payerAvec(null, 'business');
            v('⛔ sans référence, le compte d\'une fiche Business Premium : Business refusé, la page nomme la formule, rien chez Stripe',
              [sansRef.s.length, sansRef.q.texte().includes('Votre entreprise est en formule Business Premium')], [0, true]);
            const sansRefOk = await payerAvec(null, 'premium');
            v('   … et Business Premium passe, sans référence gravée (l\'abonnement suit l\'adresse du compte)', [sansRefOk.s.length, sansRefOk.envoye.get('subscription_data[metadata][espace]')], [1, null]);
            const libre = await payerAvec('banc-camille-t1', 'pro');
            v('   une entreprise sans formule payante réglée choisit la sienne (Pro) : le paiement s\'ouvre', libre.s.length, 1);
            const n = stripeRecu().length;
            const inconnu = await fetch(B + '/api/stripe/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + rangement.get('teamop_portail_jeton') }, body: JSON.stringify({ price: 'price_1Banc', quantity: 1 }) });
            const ij = await inconnu.json().catch(() => ({}));
            v('⛔ un tarif qui n\'est pas sur la page (appel direct, compte prouvé) : 400 tarif_inconnu, rien chez Stripe', [inconnu.status, ij.error, stripeRecu().length], [400, 'tarif_inconnu', n]);
          } else vrai('   (serveur d\'avant : le tarif n\'est pas encore vérifié — la garde part avec le serveur)', true);
        } else vrai('   (serveur d\'avant : la référence de l\'appareil passe sans vérification — « B » part avec le serveur)', voisine.s.length === 1);
        rangement.delete('elan_sync_team');
      }
    } finally {
      try { facteur.close(); } catch (e) {}
      try { enfant.kill('SIGKILL'); } catch (e) {}
      if (ko && !vivant) console.log(journal.slice(0, 800));
    }
  }

  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.log('  ✗ le banc a jeté : ' + (e && e.stack || e)); console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); process.exit(1); });
