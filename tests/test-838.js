/* ══ v759 · « AJOUTER UN UTILISATEUR » PROPOSE CE QUI MANQUE, PAS TOUTE L'ÉQUIPE ═══════════════════════════════════
   Justin, 27 septembre 2026 au soir, au constat « dans l'application, “ajouter un utilisateur” ouvre le paiement avec
   le nombre TOTAL de personnes — une entreprise de 7 qui veut un 8ᵉ se verrait proposer 8 abonnements neufs au lieu
   d'un seul » : « oui il faudrait faire ça ».

   La page de paiement compte un abonnement par personne (test-837) et ouvre un abonnement NEUF, à côté de ceux qui
   courent déjà : l'application doit donc lui demander ce qui MANQUE. Sauf depuis le forfait Gratuit, où l'on change de
   formule — toute l'équipe passe en Pro. Et trois cas n'ouvrent pas d'abonnement neuf du tout : qui n'est pas
   administrateur, un abonnement en attente de règlement, une formule réservée qui attend son paiement.

   Ce banc EXÉCUTE les vraies `forfait`, `planPlaces`, `abosManquants` et `proposerAbonnement` (app.html ET beta.html),
   puis fait LIRE l'adresse qu'elles ouvrent par le VRAI script de la page de paiement (racine, et sa copie d'aperçu) :
   la quantité qui part vers Stripe est celle qui manque. L'application et la page de paiement sont deux moitiés justes
   chacune ; ce dépôt a appris à ses dépens que c'est entre deux moitiés que naissent les pires défauts (CLAUDE.md). */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const RACINE = path.join(__dirname, '..');
const lire = f => fs.readFileSync(path.join(RACINE, f), 'utf8');
const existe = f => fs.existsSync(path.join(RACINE, f));
let ok = 0, ko = 0;
const vrai = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '  → ' + JSON.stringify(d) : '')); } };
const v = (t, a, b) => vrai(t, JSON.stringify(a) === JSON.stringify(b), a);
/* commentaires d'explication retirés avant de chercher (seuls ceux qui commencent une ligne : CLAUDE.md) */
const sansCommentaires = s => s.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
const texte = h => h.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<style[\s\S]*?<\/style>/g, ' ').replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/[  ]/g, ' ').replace(/\s+/g, ' ');

/* ── la page de paiement, son vrai script sur un faux document (même bac à sable que test-837) ── */
function paiement(PAGE, recherche) {
  const bloc = [...PAGE.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)].map(m => m[1]).find(b => b.includes('const FORMULES = {'));
  if (!bloc) return null;
  const derniers = {}, conteneurs = {}, envoye = [];
  const nouveau = id => {
    const el = { id, _h: {}, style: {}, dataset: {}, value: '', disabled: false, textContent: '', innerHTML: '',
      addEventListener(t, fn) { (this._h[t] = this._h[t] || []).push(fn); },
      querySelectorAll() { return []; }, querySelector() { return null; }, blur() {}, focus() {},
      classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } } };
    derniers[id] = el; return el;
  };
  const document = { title: '', querySelectorAll() { return []; }, querySelector() { return null; },
    getElementById(id) { return /^(selecteurFormules|carteDroits|cartePaiement)$/.test(id) ? (conteneurs[id] || (conteneurs[id] = nouveau(id))) : nouveau(id); } };
  const window = { location: { search: recherche, href: '' } };
  /* ⛔ ON NE PAIE QU'AVEC UN COMPTE PROUVÉ (Justin, 27 septembre 2026 — `test-839` garde la règle) : ce faux navigateur
     porte donc la session d'un compte prouvé, et le faux serveur répond « qui suis-je ». */
  const fetchFaux = async (url, opts) => {
    if (/\/api\/compte\/moi$/.test(url)) return { ok: true, status: 200, json: async () => ({ ok: true, compte: { email: 'paie@entreprise-banc.fr', prenom: 'Camille', nom: 'Banc', verifie: true } }) };
    envoye.push({ url, corps: JSON.parse(opts.body) }); return { ok: true, status: 200, json: async () => ({ url: 'https://checkout.stripe.com/c/banc' }) };
  };
  const api = new Function('window', 'document', 'history', 'localStorage', 'fetch', 'alert',
    bloc + '\n;return { etat: () => ({ nbUsersVoulu, formuleActive }), compteLu };')(
    window, document, { replaceState() {} }, { getItem: k => (k === 'teamop_portail_jeton' ? 'e'.repeat(64) : null), removeItem() {} }, fetchFaux, () => {});
  return { api, derniers, envoye, texte: () => texte(conteneurs.cartePaiement.innerHTML) };
}
const PAGES_PAIEMENT = ['recap-abonnement.html', 'apercu/recap-abonnement.html'].filter(existe);

const APPLIS = ['app.html', 'beta.html'].filter(existe);
(async () => {
  console.log('\n── 838 · « ajouter un utilisateur » : ce qui manque, pas toute l\'équipe ──');
  v('population : ' + APPLIS.length + ' applications (app.html, beta.html) et ' + PAGES_PAIEMENT.length + ' pages de paiement', [APPLIS.length, PAGES_PAIEMENT.length >= 1], [2, true]);

  for (const APPLI of APPLIS) {
    console.log('\n' + APPLI);
    const SRC = sansCommentaires(lire(APPLI));
    const bloc = debut => {
      const i = SRC.indexOf(debut); if (i < 0) return '';
      const j = SRC.indexOf('{', i); let p = 0;
      for (let k = j; k < SRC.length; k++) { const c = SRC[k]; if (c === '{') p++; else if (c === '}') { p--; if (p === 0) return SRC.slice(i, k + 1); } }
      return '';
    };
    const FN = {
      PLANS: bloc('const PLANS={'), grise: bloc('function suspensionGrise(){'), forfait: bloc('function forfait(){'),
      places: bloc('function planPlaces(){'), libre: bloc('function planPlaceLibre(){'),
      manquants: bloc('function abosManquants(){'), proposer: bloc('function proposerAbonnement(){'),
      essai: bloc('function essaiCouvreEquipe(){'),
    };
    v('les fonctions sont trouvées', Object.keys(FN).filter(k => !FN[k]), []);
    v('⛔ une seule définition de chacune (une seconde gagnerait partout, en silence)',
      ['function abosManquants(', 'function proposerAbonnement(', 'function planPlaces(', 'function planPlaceLibre(', 'function essaiCouvreEquipe('].map(n => SRC.split(n).length - 1), [1, 1, 1, 1, 1]);
    /* les deux portes qui créent un compte passent toujours par là quand il n'y a plus de place */
    v('les deux portes qui créent un compte (utilisateur, fiche technicien) appellent proposerAbonnement quand il n\'y a plus de place',
      (SRC.match(/if\(!id && !planPlaceLibre\(\)\)\{ proposerAbonnement\(\); return; \}/g) || []).length, 2);

    /* le bac à sable : les vraies fonctions ; confirm, toast et window.open sont les doubles qui notent */
    const monde = ({ f = 'business', qty = 1, n = 1, role = 'admin', susp = false, sursis = null, attente = null, oui = true, essai = null } = {}) => {
      const ctx = { JSON, Math, Object, Array, String, Number, __toasts: [], __questions: [], __ouverts: [],
        db: { forfait: f, forfaitQty: qty, users: Array.from({ length: n }, (_, i) => ({ id: 'u' + i })), formuleAttente: attente, forfaitEssai: essai },
        currentUser: role ? { id: 'moi', role } : null };
      vm.createContext(ctx);
      vm.runInContext(`${FN.PLANS};
        var _susp = { suspendu: ${!!susp}, sursis: ${JSON.stringify(sursis)} };
        ${FN.grise}\n${FN.forfait}\n${FN.places}\n${FN.libre}\n${FN.manquants}\n${FN.proposer}\n${FN.essai}
        function todayISO(){ return '2026-09-28'; }
        function toast(m){ __toasts.push(String(m)); }
        function confirm(m){ __questions.push(String(m)); return ${!!oui}; }
        var window = { open: function(u, c){ __ouverts.push([String(u), c]); } };`, ctx);
      return ctx;
    };
    const jouer = o => { const m = monde(o); vm.runInContext('proposerAbonnement()', m); return m; };
    const adresse = m => (m.__ouverts[0] || [''])[0];
    const qs = u => { try { return Object.fromEntries(new URL(u).searchParams); } catch (e) { return {}; } };

    /* 1. l'exemple de Justin : sept personnes, sept places (Pro : 1 place par abonnement), un huitième */
    let m = jouer({ f: 'pro', qty: 7, n: 7 });
    v('Pro, 7 personnes pour 7 places : la page de paiement s\'ouvre pour 1 abonnement, pas 8', qs(adresse(m)), { formule: 'pro', utilisateurs: '1' });
    vrai('… sur la page de paiement du site, dans un nouvel onglet', /^https:\/\/teamop\.fr\/recap-abonnement\.html\?/.test(adresse(m)) && m.__ouverts[0][1] === '_blank');
    const q = m.__questions[0] || '';
    vrai('… et la question le dit : « 7 utilisateurs pour 7 places », « il faut 1 abonnement Pro de plus »', q.includes('Formule Pro : 7 utilisateurs pour 7 places.') && q.includes('il faut 1 abonnement Pro de plus.'), q);
    vrai('… « Un abonnement = un utilisateur », et qui ajoute la place : TEAM OP (rien d\'automatique n\'est promis)', q.includes('Un abonnement = un utilisateur') && q.includes('TEAM OP ajoute la place à ton espace.'), q);

    /* 2. la place manquante se CALCULE sur les vraies places (Business en donnait 2 par abonnement jusqu'à la v761 ;
          depuis la v762, un abonnement = un utilisateur — le calcul reste le même) */
    m = jouer({ f: 'business', qty: 3, n: 6 });
    const places = vm.runInContext('planPlaces()', m);
    v('Business, 6 personnes pour ' + places + ' places : ' + Math.max(1, 7 - places) + ' abonnement(s) de plus', qs(adresse(m)).utilisateurs, String(Math.max(1, 7 - places)));
    /* 3. une équipe déjà au-delà de ses places (la Tour a baissé le nombre) : tout ce qui manque, d'un coup */
    m = jouer({ f: 'pro', qty: 6, n: 8 });
    v('Pro, 8 personnes pour 6 places : 3 abonnements de plus (8 + 1 − 6)', qs(adresse(m)), { formule: 'pro', utilisateurs: '3' });
    vrai('… « il faut 3 abonnements Pro de plus », « les places »', (m.__questions[0] || '').includes('il faut 3 abonnements Pro de plus.') && (m.__questions[0] || '').includes('ajoute les places à ton espace.'), m.__questions[0]);
    /* 4. Business Premium : même règle */
    m = jouer({ f: 'premium', qty: 1, n: vm.runInContext('planPlaces()', monde({ f: 'premium', qty: 1 })) });
    v('Business Premium plein : 1 abonnement de plus', qs(adresse(m)), { formule: 'premium', utilisateurs: '1' });

    /* 5. depuis le forfait Gratuit : on change de formule — TOUTE l'équipe passe en Pro */
    m = jouer({ f: 'gratuit', qty: 1, n: 1 });
    v('Gratuit, 1 personne, une 2ᵉ : Pro pour 2 (la place gratuite ne s\'ajoute pas à un abonnement payant)', qs(adresse(m)), { formule: 'pro', utilisateurs: '2' });
    vrai('… « passe en Pro : un abonnement par utilisateur, soit 2 abonnements », « active la formule Pro »',
      (m.__questions[0] || '').includes('passe en Pro : un abonnement par utilisateur, soit 2 abonnements.') && (m.__questions[0] || '').includes('TEAM OP active la formule Pro sur ton espace.'), m.__questions[0]);

    /* 6. « Annuler » : rien ne s'ouvre */
    m = jouer({ f: 'pro', qty: 7, n: 7, oui: false });
    v('« Annuler » : rien ne s\'ouvre', m.__ouverts.length, 0);

    /* 7. qui n'est pas administrateur ne se voit pas proposer d'abonner l'entreprise */
    for (const role of ['technicien', 'chef', 'dr']) {
      m = jouer({ f: 'pro', qty: 7, n: 7, role });
      vrai('rôle « ' + role + ' » (avec le droit de créer des comptes) : pas de paiement, pas de question — « seul l\'administrateur peut en ajouter »',
        m.__ouverts.length === 0 && m.__questions.length === 0 && /seul l'administrateur peut en ajouter/.test(m.__toasts[0] || ''), [m.__ouverts, m.__toasts]);
    }
    vrai('… et le message ne dit RIEN du paiement de l\'entreprise (« c\'est pas aux utilisateurs de savoir si l\'entreprise paye »)',
      !/pay|règl|abonnement/i.test(jouer({ f: 'pro', qty: 7, n: 7, role: 'technicien' }).__toasts[0] || 'pay'));

    /* 8. abonnement en attente de règlement (en sursis, puis grisé) : on renvoie à l'espace client, pas à un abonnement neuf */
    for (const sursis of [3, 0]) {
      m = jouer({ f: 'business', qty: 3, n: 6, susp: true, sursis });
      vrai('abonnement en attente de règlement (sursis ' + sursis + ' j) : l\'espace client, jamais un abonnement de plus',
        m.__ouverts.length === 1 && m.__ouverts[0][0] === 'https://teamop.fr/espace.html' && /règle-le d'abord/.test(m.__questions[0] || ''), m.__ouverts);
    }

    /* 9. une formule réservée qui attend son paiement : c'est elle qu'il faut payer */
    m = jouer({ f: 'gratuit', qty: 1, n: 1, attente: { formule: 'business', quantite: 3 } });
    vrai('formule Business ×3 réservée, pas encore payée : l\'espace client, pour la payer', m.__ouverts.length === 1 && m.__ouverts[0][0] === 'https://teamop.fr/espace.html', m.__ouverts);
    vrai('… « Ta formule Business ×3 attend son paiement »', (m.__questions[0] || '').includes('Ta formule Business ×3 attend son paiement'), m.__questions[0]);

    /* 9 bis. ⛔ UN ABONNEMENT = UN UTILISATEUR, QUELLE QUE SOIT LA FORMULE (Justin, 28 septembre 2026, v762) — et pendant
       la période offerte par un code promo, le code couvre TOUTE l'équipe : la porte s'ouvre, les places ne changent pas. */
    v('chaque formule donne UNE place par abonnement (Business et Business Premium aussi)',
      ['gratuit', 'pro', 'business', 'premium'].map(f => vm.runInContext('planPlaces()', monde({ f, qty: 1 }))), [1, 1, 1, 1]);
    v('… et trois abonnements Business Premium, trois places', vm.runInContext('planPlaces()', monde({ f: 'premium', qty: 3 })), 3);
    const ESSAI = (o) => Object.assign({ code: 'ESSAI-BANC-838', formule: 'premium', finLe: '2026-10-05', mois: 3 }, o || {});
    const libre = (o) => vm.runInContext('planPlaceLibre()', monde(o));
    v('⛔ sept personnes, un abonnement Premium, SANS code : plus de place', libre({ f: 'premium', qty: 1, n: 7 }), false);
    v('⛔ … avec un code promo en cours : la place s\'ouvre (le code couvre toute l\'équipe, et ceux qu\'on ajoute)', libre({ f: 'premium', qty: 1, n: 7, essai: ESSAI() }), true);
    v('… jusqu\'au dernier jour compris', libre({ f: 'premium', qty: 1, n: 7, essai: ESSAI({ finLe: '2026-09-28' }) }), true);
    v('… plus le lendemain de la fin', libre({ f: 'premium', qty: 1, n: 7, essai: ESSAI({ finLe: '2026-09-27' }) }), false);
    v('… ni un essai marqué terminé', libre({ f: 'premium', qty: 1, n: 7, essai: ESSAI({ termine: true }) }), false);
    v('… ni pendant une suspension dont le sursis est écoulé (ce qui grise le forfait grise aussi cette largesse)', libre({ f: 'premium', qty: 1, n: 7, essai: ESSAI(), susp: true, sursis: 0 }), false);
    v('… et le nombre de places, lui, ne ment pas pendant le code (la page de paiement et « il manque N » le lisent)',
      vm.runInContext('planPlaces()', monde({ f: 'premium', qty: 1, n: 7, essai: ESSAI() })), 1);

    /* 10. ⛔ LA COUTURE : l'adresse ouverte par l'application, lue par le VRAI script de la page de paiement */
    for (const PAGE of PAGES_PAIEMENT) {
      for (const [cas, o, attendu] of [['Pro, 7 pour 7', { f: 'pro', qty: 7, n: 7 }, 1], ['Pro, 8 pour 6', { f: 'pro', qty: 6, n: 8 }, 3], ['Gratuit → Pro', { f: 'gratuit', qty: 1, n: 1 }, 2]]) {
        const u = adresse(jouer(o));
        const p = paiement(lire(PAGE), u.slice(u.indexOf('?')));
        if (!p) { vrai(PAGE + ' : le script de la page s\'exécute', false); continue; }
        await p.api.compteLu;   // la page lit le compte au chargement, puis se redessine
        await p.derniers.btnPayer._h.click[0]();
        v('⛔ ' + APPLI + ' → ' + PAGE + ' (' + cas + ') : la page compte ' + attendu + ' abonnement(s), et « Payer » envoie la quantité ' + attendu,
          [p.api.etat().nbUsersVoulu, p.envoye.map(e => e.corps.quantity)], [attendu, [attendu]]);
      }
    }
  }

  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.log('  ✗ le banc a jeté : ' + (e && e.stack || e)); console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); process.exit(1); });
