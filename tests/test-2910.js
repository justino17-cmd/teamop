/* ⛔ CE QUE CE FICHIER GARDE — LA FIN D'ABONNEMENT CHEZ STRIPE ET LES COURRIERS DE HUGO, MARGAUX ET EMMA (23 octobre 2026).
   Justin : « On ne fera pas de remboursement. Une personne qui s'abonne pour le mois et après il arrête, c'est son choix. Mais il faut qu'il arrête l'abonnement. »
   Deux modules purs, sans disque ni réseau extérieur :
     · `server/stripe-resiliation.js` — la fin de période par `fetch` (pas de bibliothèque), contre un Stripe LOCAL qui garde ce qu'il reçoit : une lecture puis UNE écriture
       (`cancel_at_period_end=true`, rien d'autre), jamais de DELETE ni de remboursement, la date dite est celle que Stripe rend, une réponse qui ne confirme pas est un échec,
       une fin déjà programmée n'écrit rien, un identifiant mal formé n'appelle personne, Stripe muet ou en 500 se dit ;
     · `server/agents-courriers-ops.js` — la signature (le prénom de l'agent, « Assistant(e) virtuel(le) », « Équipe TeamOP »), les modèles (accusé, relances J+3 et J+7, mise en demeure,
       créneaux d'Emma) et le CONTRÔLE QUALITÉ : chaque modèle, rempli de valeurs hostiles, passe ; chaque faute qu'il garde (tutoiement, lien ou adresse étrangers, numéro, montant
       hors liste, promesse, crochet, signature écrite, Justin…) est RÉELLEMENT refusée. Aucun mot n'est gardé par un commentaire : le banc exécute. */
const fs = require('fs'), path = require('path'), http = require('http');
const RACINE = path.join(__dirname, '..');
let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + String(JSON.stringify(b)).slice(0, 300) + '\n      obtenu  : ' + String(JSON.stringify(a)).slice(0, 300)); } };
const vrai = (t, c) => v(t, !!c, true);
const R = require(path.join(RACINE, 'server', 'stripe-resiliation.js'));
const O = require(path.join(RACINE, 'server', 'agents-courriers-ops.js'));

/* Un Stripe local : garde chaque requête, rend l'abonnement tel qu'il est, et le modifie quand on lui écrit `cancel_at_period_end=true`. */
function stripeLocal(abos, options) {
  options = options || {};
  const recu = [];
  const srv = http.createServer((req, res) => {
    let corps = ''; req.on('data', d => { corps += d; });
    req.on('end', () => {
      recu.push({ methode: req.method, url: req.url, corps, auth: req.headers.authorization, cle: req.headers['idempotency-key'], type: req.headers['content-type'] });
      const m = /^\/v1\/subscriptions\/([^?/]+)$/.exec(req.url);
      const ab = m && abos[decodeURIComponent(m[1])];
      const json = (code, o) => { res.writeHead(code, { 'content-type': 'application/json' }); res.end(typeof o === 'string' ? o : JSON.stringify(o)); };
      if (options.panne) return json(500, { error: { message: 'panne du banc' } });
      if (!ab) return json(404, { error: { message: 'No such subscription' } });
      if (req.method === 'POST') {
        if (options.nePasConfirmer) return json(200, ab);
        if (options.illisible) return json(200, 'pas du json');
        if (/(^|&)cancel_at_period_end=true(&|$)/.test(corps)) ab.cancel_at_period_end = true;
        return json(200, ab);
      }
      return json(200, ab);
    });
  });
  return new Promise(r => srv.listen(0, '127.0.0.1', () => r({ srv, recu, base: 'http://127.0.0.1:' + srv.address().port, fermer: () => srv.close() })));
}
const FIN = Math.floor(Date.parse('2026-11-12T10:00:00Z') / 1000);

(async () => {
  console.log('\n── 2910 · la fin d\'abonnement chez Stripe, et les courriers de Hugo, Margaux et Emma ──');

  console.log('\n1. Stripe : la fin de période, par fetch, contre un Stripe local');
  const abos = { sub_actif1: { id: 'sub_actif1', status: 'active', current_period_end: FIN, cancel_at_period_end: false, items: { data: [{ current_period_end: FIN }] } },
    sub_deja1: { id: 'sub_deja1', status: 'active', current_period_end: FIN, cancel_at_period_end: true, items: { data: [] } },
    sub_cancelat: { id: 'sub_cancelat', status: 'active', cancel_at: FIN + 86400, cancel_at_period_end: false, items: { data: [] } },
    sub_ligne1: { id: 'sub_ligne1', status: 'active', cancel_at_period_end: false, items: { data: [{ current_period_end: FIN }] } } };
  let S = await stripeLocal(abos);
  const entetes = (sk, extra) => Object.assign({ Authorization: 'Bearer ' + sk, 'Stripe-Version': '2026-09-30' }, extra || {});
  let r = await R.programmerFin({ aboId: 'sub_actif1', sk: 'sk_banc_2910', entetes, base: S.base, jour: '2026-10-23' });
  v('la fin de période est programmée, à la date de Stripe (heure de Paris)', [r.ok, r.deja, r.finLe], [true, false, '2026-11-12']);
  v('une lecture PUIS une écriture, rien d\'autre', S.recu.map(x => x.methode + ' ' + x.url), ['GET /v1/subscriptions/sub_actif1', 'POST /v1/subscriptions/sub_actif1']);
  const ecr = S.recu[1];
  v('l\'écriture ne dit que « cancel_at_period_end=true », en formulaire', [ecr.corps, ecr.type], ['cancel_at_period_end=true', 'application/x-www-form-urlencoded']);
  v('la clé de Stripe est présentée, et une clé d\'idempotence (abonnement + jour) est posée', [ecr.auth, ecr.cle], ['Bearer sk_banc_2910', 'teamop-fin-periode-sub_actif1-2026-10-23']);
  vrai('l\'abonnement de Stripe porte bien la fin programmée (ce que le serveur relira)', abos.sub_actif1.cancel_at_period_end === true);
  S.recu.length = 0;
  r = await R.programmerFin({ aboId: 'sub_actif1', sk: 'sk_banc_2910', entetes, base: S.base });
  v('rejouée : « déjà programmée », la même date, AUCUNE écriture', [r.ok, r.deja, r.finLe, S.recu.map(x => x.methode)], [true, true, '2026-11-12', ['GET']]);
  S.recu.length = 0;
  r = await R.programmerFin({ aboId: 'sub_deja1', sk: 'sk_banc_2910', entetes, base: S.base });
  v('une fin déjà posée par quelqu\'un d\'autre : on ne réécrit pas', [r.ok, r.deja, S.recu.map(x => x.methode)], [true, true, ['GET']]);
  r = await R.programmerFin({ aboId: 'sub_cancelat', sk: 'sk_banc_2910', entetes, base: S.base });
  v('une fin datée (cancel_at) vaut une fin programmée, avec SA date', [r.ok, r.deja, r.finLe], [true, true, '2026-11-13']);
  r = await R.programmerFin({ aboId: 'sub_ligne1', sk: 'sk_banc_2910', entetes, base: S.base });
  v('la fin de période se lit aussi sur la première ligne (versions récentes de l\'API)', [r.ok, r.finLe], [true, '2026-11-12']);
  S.recu.length = 0;
  for (const mal of ['', 'sub_', 'sub_a/b', 'sub_a?x=1', 'cus_123', 'sub_ a', null, 42, { a: 1 }, 'sub_' + 'a'.repeat(200)]) {
    r = await R.programmerFin({ aboId: mal, sk: 'sk', entetes, base: S.base });
    if (r.ok || r.raison !== 'forme') vrai('un identifiant mal formé est refusé : ' + JSON.stringify(mal), false);
  }
  v('(population) 10 identifiants mal formés : refusés SANS appeler Stripe', S.recu.length, 0);
  v('sans clé Stripe : rien', (await R.programmerFin({ aboId: 'sub_actif1', sk: '', entetes, base: S.base })).raison, 'sans_cle');
  v('un abonnement inconnu : le refus de Stripe se dit', (await R.programmerFin({ aboId: 'sub_inconnu', sk: 'sk', entetes, base: S.base })).raison, 'stripe_http');
  S.fermer();
  S = await stripeLocal({ sub_x1: { id: 'sub_x1', status: 'active', current_period_end: FIN, cancel_at_period_end: false } }, { nePasConfirmer: true });
  r = await R.programmerFin({ aboId: 'sub_x1', sk: 'sk', entetes, base: S.base });
  v('⛔ Stripe répond 200 SANS confirmer la fin : c\'est un échec (on ne prévient pas un client d\'une fin qui n\'est pas programmée)', [r.ok, r.raison], [false, 'non_programmee']);
  S.fermer();
  S = await stripeLocal({ sub_x2: { id: 'sub_x2', status: 'active', current_period_end: FIN, cancel_at_period_end: false } }, { illisible: true });
  r = await R.programmerFin({ aboId: 'sub_x2', sk: 'sk', entetes, base: S.base });
  v('une réponse qui n\'est pas du JSON : un échec', [r.ok, r.raison], [false, 'stripe_illisible']);
  S.fermer();
  S = await stripeLocal({}, { panne: true });
  r = await R.programmerFin({ aboId: 'sub_x3', sk: 'sk', entetes, base: S.base });
  v('Stripe en panne (500) : un échec dit, pas une exception', [r.ok, r.raison], [false, 'stripe_http']);
  S.fermer();
  r = await R.programmerFin({ aboId: 'sub_x4', sk: 'sk', entetes, base: 'http://127.0.0.1:1', fetch: undefined });
  v('Stripe injoignable : un échec « réseau », pas une exception', [r.ok, r.raison], [false, 'reseau']);
  const SRC = fs.readFileSync(path.join(RACINE, 'server', 'stripe-resiliation.js'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
  vrai('(population) le code est lu sans ses commentaires', SRC.length > 1500 && /async function programmerFin/.test(SRC));
  vrai('⛔ aucune requête DELETE, aucune route /cancel, aucun remboursement, aucun avoir, aucune bibliothèque : du code, pas une phrase',
    !/DELETE/.test(SRC) && !/\/cancel\b/.test(SRC) && !/refund|rembours|credit_note/i.test(SRC) && !/require\(\s*['"]stripe['"]/.test(SRC));
  vrai('…et la seule écriture est « cancel_at_period_end »', (SRC.match(/method: 'POST'/g) || []).length === 1 && /cancel_at_period_end: 'true'/.test(SRC));
  vrai('… et jamais api.stripe.com autrement que comme base par défaut', (SRC.match(/api\.stripe\.com/g) || []).length === 1 && /const BASE = 'https:\/\/api\.stripe\.com'/.test(SRC));

  console.log('\n2. La signature d\'un agent : composée par le code');
  v('Hugo', O.signatureAgent('hugo'), 'Hugo\nAssistant virtuel · Équipe TeamOP\ncontact@teamop.fr · teamop.fr');
  v('Margaux, Emma, Sarah : « Assistante virtuelle »', ['margaux', 'emma', 'sarah'].map(a => O.signatureAgent(a).split('\n')[1]), ['Assistante virtuelle · Équipe TeamOP', 'Assistante virtuelle · Équipe TeamOP', 'Assistante virtuelle · Équipe TeamOP']);
  v('un agent inconnu, ou un nom piégé (propriété d\'objet), n\'a pas de signature', ['pirate', 'constructor', '__proto__', 'toString', '', null].map(a => O.signatureAgent(a)), ['', '', '', '', '', '']);
  v('une adresse étrangère ne se glisse pas dans la signature', O.signatureAgent('hugo', 'x@pirate.example').split('\n')[2], 'contact@teamop.fr · teamop.fr');

  console.log('\n3. Les modèles passent leur propre contrôle, remplis de valeurs hostiles');
  const sain = (nom, m, o) => { const f = O.controle(m && m.objet, m && m.texte, Object.assign({}, m && m.autorises, o)); v(nom, f, []); };
  const accuse = O.accuseResiliation({ finMs: Date.parse('2026-11-12T10:00:00Z') });
  sain('l\'accusé de résiliation', accuse);
  vrai('…il dit la date de fin et la poursuite de l\'accès, sans remboursement ni arrêt immédiat', /12 novembre 2026/.test(accuse.texte) && /accès à l’application reste le même/.test(accuse.texte) && !/rembours|immédiat/i.test(accuse.texte));
  v('sans date lisible, pas d\'accusé (on ne prévient pas d\'une date qu\'on ne connaît pas)', [O.accuseResiliation({}), O.accuseResiliation({ finMs: NaN }), O.accuseResiliation({ finMs: 0 }), O.accuseResiliation(null)], [null, null, null, null]);
  const url = 'https://invoice.stripe.com/i/acct_1ABC/live_YWNjdF8xQUJD?s=ap';
  for (const etape of [3, 7]) {
    sain('la relance J+' + etape + ', avec le lien de la facture', O.relanceImpaye({ etape, facture: { numero: 'ABCD1234-0001', montantEur: 15 }, url }), {});
    sain('la relance J+' + etape + ', sans lien : elle renvoie à contact@, elle n\'invente rien', O.relanceImpaye({ etape, facture: { numero: 'ABCD1234-0001', montantEur: 30.5 }, url: '' }), {});
  }
  const sans = O.relanceImpaye({ etape: 3, facture: {}, url: '' });
  sain('une facture sans numéro ni montant : le texte tient quand même', sans);
  vrai('…et ne dit alors ni numéro ni montant inventé', !/n°/.test(sans.texte) && !/€/.test(sans.texte));
  vrai('sans lien : « écrivez-nous à contact@teamop.fr », jamais de lien', /contact@teamop\.fr/.test(sans.texte) && !/https?:/.test(sans.texte));
  const r3 = O.relanceImpaye({ etape: 3, facture: { numero: 'A-1', montantEur: 15 }, url }), r7 = O.relanceImpaye({ etape: 7, facture: { numero: 'A-1', montantEur: 15 }, url });
  vrai('J+3 courtois (pas de recouvrement), J+7 ferme (l\'article 7, par écrit avant toute démarche)', !/recouvrement/.test(r3.texte) && /article 7/.test(r7.texte) && /par écrit/.test(r7.texte));
  vrai('les deux objets diffèrent', r3.objet !== r7.objet);
  const vilains = ['</script><img src=x onerror=1>', 'https://pirate.example/pay', 'https://evilstripe.com/x', 'https://stripe.com.pirate.example/x', 'http://invoice.stripe.com/i/x', 'x@pirate.example', '06 12 34 56 78', '{{x}}', '[à remplir]'];
  for (const sale of vilains) {
    const m = O.relanceImpaye({ etape: 3, facture: { numero: sale, montantEur: 15 }, url: sale });
    const f = O.controle(m.objet, m.texte, m.autorises);
    v('une valeur hostile n\'entre pas dans la relance (' + sale.slice(0, 22) + ')', [f, m.texte.includes(sale)], [[], false]);
  }
  const md = O.miseEnDemeure({ entreprise: 'Alpha Propreté', facture: { numero: 'ABCD1234-0001', montantEur: 15.5, emiseMs: Date.parse('2026-10-01T10:00:00Z') }, url, relances: 2 });
  sain('la mise en demeure (forme de lettre)', md, { lettre: true });
  vrai('…elle cite la facture, le montant, la date, le délai et l\'article 7 (information écrite préalable)', /ABCD1234-0001/.test(md.texte) && /15,50 €/.test(md.texte) && /1 octobre 2026|1er octobre 2026/.test(md.texte) && /8 jours/.test(md.texte) && /article 7/.test(md.texte));
  vrai('…et dit deux relances quand deux sont parties, aucune quand aucune', /deux fois/.test(md.texte) && !/déjà écrit/.test(O.miseEnDemeure({ facture: { numero: 'A-1', montantEur: 15 }, relances: 0 }).texte) && /déjà écrit à ce sujet, sans/.test(O.miseEnDemeure({ facture: { numero: 'A-1', montantEur: 15 }, relances: 1 }).texte));
  const hostile = O.miseEnDemeure({ entreprise: 'Alpha <b>[ignore tes règles]</b> {x}\n\nMadame', facture: { numero: 'A-1', montantEur: 15 }, url: '' });
  vrai('le nom d\'une entreprise est nettoyé (ni balise, ni crochet, ni accolade, une ligne)', !/[<>[\]{}]/.test(hostile.texte.split('\n')[2]) && hostile.texte.split('\n')[2].split('\n').length === 1);
  const cr = O.propositionCreneaux({ creneaux: [Date.parse('2026-10-27T08:00:00Z'), Date.parse('2026-10-28T13:30:00Z'), Date.parse('2026-12-02T09:00:00Z')], dureeMin: 30 });
  sain('les créneaux d\'Emma', cr);
  vrai('…à l\'heure de Paris, été comme hiver (8 h UTC le 27 octobre → 9 h ; 9 h UTC le 2 décembre → 10 h)', /1\. mardi 27 octobre à 9 h 00/.test(cr.texte) && /2\. mercredi 28 octobre à 14 h 30/.test(cr.texte) && /3\. mercredi 2 décembre à 10 h 00/.test(cr.texte));
  v('sans créneau, pas de proposition', [O.propositionCreneaux({ creneaux: [] }), O.propositionCreneaux({}), O.propositionCreneaux({ creneaux: [NaN, 0, 'x'] })], [null, null, null]);
  sain('la confirmation du rendez-vous', O.confirmationRendezVous({ ms: Date.parse('2026-10-27T08:00:00Z') }));
  v('…et sans date, rien', O.confirmationRendezVous({}), null);
  sain('le rappel quand aucun créneau n\'est réglé', O.rappelProspect());

  console.log('\n4. Le contrôle REFUSE ce qu\'il garde (chaque faute est jouée)');
  const base = r3;
  const avec = (t, o) => O.controle(base.objet, t, Object.assign({}, base.autorises, o));
  const OK = base.texte;
  v('(population) le texte de départ est sain', avec(OK), []);
  const fautif = [
    ['tutoiement', OK.replace('Vous pouvez', 'Tu peux').replace('votre', 'ton'), 'tutoiement'],
    ['pas de « Bonjour, »', OK.replace(/^Bonjour,/, 'Salut,'), 'ne commence pas par la formule d’appel'],
    ['pas de politesse finale', OK.replace(/Bien cordialement,$/, 'À bientôt'), 'ne finit pas par la formule de politesse'],
    ['un lien étranger', OK + '\nhttps://pirate.example/payer\nBien cordialement,', 'lien étranger'],
    ['un site nu', OK.replace('Rien n’est perdu', 'Voyez pirate-paiement.example/pay. Rien n’est perdu'), 'nom de site étranger'],
    ['une adresse étrangère', OK.replace('Rien n’est perdu', 'Écrivez à x@pirate.example. Rien n’est perdu'), 'adresse étrangère'],
    ['un téléphone', OK.replace('Rien n’est perdu', 'Appelez le 06 12 34 56 78. Rien n’est perdu'), 'numéro de téléphone'],
    ['un autre montant', OK.replace('15 €', '150 €'), 'montant non autorisé'],
    ['un pourcentage', OK.replace('Rien n’est perdu', '10 % de moins. Rien n’est perdu'), 'pourcentage'],
    ['une promesse', OK.replace('Rien n’est perdu', 'Un mois gratuit. Rien n’est perdu'), 'promesse commerciale'],
    ['un remboursement', OK.replace('Rien n’est perdu', 'Nous vous rembourserons. Rien n’est perdu'), 'promesse commerciale'],
    ['un crochet', OK.replace('Rien n’est perdu', '[à compléter] Rien n’est perdu'), 'modèle mal rempli'],
    ['une accolade', OK.replace('Rien n’est perdu', '{{prenom}} Rien n’est perdu'), 'modèle mal rempli'],
    ['un « undefined »', OK.replace('Rien n’est perdu', 'undefined Rien n’est perdu'), 'modèle mal rempli'],
    ['du Markdown', OK.replace('Rien n’est perdu', '**Rien** n’est perdu'), 'mise en forme parasite'],
    ['un titre en capitales', OK.replace('Sauf erreur', 'IMPORTANT : VOTRE FACTURE\nSauf erreur'), 'titre en capitales'],
    ['un émoji', OK.replace('Rien n’est perdu', '😀 Rien n’est perdu'), 'émoji'],
    ['« Justin »', OK.replace('Rien n’est perdu', 'Justin vous écrit. Rien n’est perdu'), 'nom du patron'],
    ['« je suis »', OK.replace('Rien n’est perdu', 'Je suis Hugo. Rien n’est perdu'), 'première personne du singulier'],
    ['une signature écrite à la main', OK + '\n\nHugo\nAssistant virtuel · Équipe TeamOP', 'signature écrite à la main'],
    ['trop court', 'Bonjour,\n\nBien cordialement,', 'longueur hors bornes'],
  ];
  for (const [nom, texte, attendue] of fautif) { const f = avec(texte); vrai('la faute « ' + nom + ' » est refusée (' + attendue + ')', f.includes(attendue)); }
  v('un objet à saut de ligne, ou vide, est refusé', [O.controle('a\nb', OK, {}), O.controle('', OK, {})].map(f => f.includes('objet hors bornes')), [true, true]);
  vrai('⛔ un lien non autorisé est refusé même quand c\'est un lien de Stripe : seul celui que le code a relu passe', O.controle(base.objet, OK.replace(url, 'https://invoice.stripe.com/i/acct_AUTRE/live_X'), base.autorises).includes('lien étranger'));
  vrai('un lien teamop.fr est permis', O.controle(base.objet, OK.replace('Rien n’est perdu', 'Voyez https://teamop.fr/tarifs.html. Rien n’est perdu'), base.autorises).length === 0);
  vrai('le numéro de facture autorisé n\'est pas pris pour un téléphone (9 chiffres ou plus)', O.controle(base.objet, OK.replace('A-1', '2026-10-123456'), { liens: [url], montants: [15], permis: ['2026-10-123456'] }).length === 0
    && O.controle(base.objet, OK.replace('A-1', '2026-10-123456'), { liens: [url], montants: [15] }).includes('numéro de téléphone'));
  vrai('(population) 21 fautes jouées, aucune ne passe', fautif.every(([, texte]) => avec(texte).length > 0) && fautif.length === 21);
  const lettre = O.controle(md.objet, md.texte, Object.assign({ lettre: true }, md.autorises));
  v('la lettre n\'est pas contrôlée comme un courriel (« Madame, Monsieur, » … « Cordialement, »)', lettre, []);
  vrai('…mais un courriel contrôlé comme lettre ne passe pas', O.controle(base.objet, OK, Object.assign({ lettre: true }, base.autorises)).includes('ne commence pas par la formule d’appel'));

  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.log('  ✗ exception : ' + (e && e.stack || e)); console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); process.exit(1); });
