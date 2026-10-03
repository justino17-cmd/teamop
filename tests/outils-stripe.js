/* ══ UN FAUX STRIPE POUR LES BANCS D'OP MESSAGES (tests/test-962, 965, la sonde, les mutations) ═══════════════════════════════════════════════
 *
 * Ce fichier n'est PAS une suite (il ne s'appelle pas `test-*.js` : le compteur ne le lance pas). C'est un petit serveur HTTP en boucle locale qui parle comme Stripe pour les cinq appels que
 * fait `server-msg/facturation.js` — et rien d'autre :
 *
 *     POST /v1/checkout/sessions          une session de paiement (corps en formulaire, comme Stripe) → { id, url, status:'open', client_reference_id, … }
 *     GET  /v1/checkout/sessions/:id      la session : open | complete (avec `subscription`) | expired
 *     GET  /v1/subscriptions/:id          un abonnement (statut, lignes, quantité, métadonnées, échéance) ; 404 s'il n'existe pas
 *     POST /v1/billing_portal/sessions    le portail de facturation (`customer` exigé)
 *     GET  /v1/prices/:id                 un tarif (avec son produit si `expand[]=product`) — lu par `configurer-stripe.js`
 *     GET  /v1/subscriptions?status=all   la LISTE (ce que lit OP GESTION : `status=all`, `limit=100`, `starting_after`, du plus récent au plus ancien, le client et le produit des lignes
 *                                         développés seulement s'ils sont demandés par `expand[]`) — pour le banc de la couture, test-965 ; `listes` garde ce que chaque page a montré
 *
 * ⛔ IL NE JUGE RIEN À LA PLACE DU SERVICE, mais il RECONSTRUIT ce que Stripe ferait : quand un banc « paie » une session (`payer`), l'abonnement qui naît porte exactement les
 * métadonnées (`subscription_data[metadata][…]`), le tarif et la quantité (`line_items[0][…]`) et l'adresse (`customer_email`) que le service a ENVOYÉS — pas ce que le banc voudrait y
 * trouver. C'est ce qui permet de dire « l'abonnement que ce service fait naître est lu par OP GESTION comme un abonnement d'OP MESSAGES ».
 * ⛔ Il note CHAQUE appel (méthode, chemin, en-têtes utiles, paires du formulaire) : un banc relit ce que le service a VRAIMENT dit à Stripe.
 * Des pannes sur commande : `muet` (500), `refuser` (401, clé refusée), `limiter` (429), `illisible` (200 qui n'est pas du JSON), `lent`, et `echo` (une réponse d'erreur qui répète la clé
 * qu'on lui a présentée : le service ne doit rien en rendre à la page).
 * Rien ne sort d'ici : 127.0.0.1, des identifiants fictifs. */
'use strict';
const http = require('http'), crypto = require('crypto');

const alea = (n) => crypto.randomBytes(n).toString('hex');

async function fauxStripe(opts = {}) {
  const o = Object.assign({ prix: [], hote: 'checkout.stripe.test' }, opts);
  const E = {
    appels: [],                 // { m, chemin, requete, auth, type, paires, corps }
    sessions: new Map(),        // id → { id, status, mode, client_reference_id, paires, subscription, url, customer_email }
    abonnements: new Map(),     // id → objet « subscription » tel que Stripe le rendrait
    clients: new Map(),         // id → { id, email }
    mode: 'normal',             // normal | muet | refuse | limite | illisible
    retardMs: 0,
    echo: false,                // l'erreur répète l'en-tête d'autorisation reçu
    portailConfigure: true,     // faux : Stripe répond 400 « no configuration » comme un compte dont le portail n'est pas réglé
    pannesRestantes: 0,         // les N prochains appels répondent 500, puis tout revient
    tarifs: new Map(),          // id → objet « price » (lu par `configurer-stripe.js`)
    sansDroits: new Set(),      // 'abonnements' | 'tarifs' | 'produits' : le droit manque à la clé → 403
    listes: [],                 // chaque PAGE de `GET /v1/subscriptions` servie : { auth, requete, statuts: { identifiant: statut } }
    n: 0,
  };
  const json = (res, code, corps) => { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(corps)); };
  /* le produit d'un tarif, tel que `expand[]=data.items.data.price.product` le rend : l'objet du tarif posé (`poserTarif`), sinon celui que la ligne porte, sinon un produit
     SANS NOM — qui ne parle donc ni d'OP GESTION ni d'OP MESSAGES : une ligne dont le tarif est inconnu ne se reconnaît alors que par son identifiant */
  const produitDe = (price) => {
    const t = E.tarifs.get(price.id);
    if (t && t.product && typeof t.product === 'object') return t.product;
    if (price.product && typeof price.product === 'object') return price.product;
    return { id: String(price.product || 'prod_banc'), object: 'product', name: 'Produit du banc' };
  };
  const srv = http.createServer((req, res) => {
    const morceaux = []; req.on('data', d => morceaux.push(d));
    req.on('end', () => {
      const corps = Buffer.concat(morceaux).toString('utf8');
      const u = new URL(req.url, 'http://x');
      const type = String(req.headers['content-type'] || '');
      const paires = req.method === 'POST' && /x-www-form-urlencoded/.test(type) ? Array.from(new URLSearchParams(corps).entries()) : [];
      E.appels.push({ m: req.method, chemin: u.pathname, requete: u.search, auth: req.headers.authorization || '', type, paires, corps });
      const repondre = () => {
        if (E.mode === 'refuse') return json(res, 401, { error: { type: 'invalid_request_error', message: E.echo ? 'Invalid API Key provided: ' + (req.headers.authorization || '') : 'Invalid API Key provided' } });
        if (E.mode === 'muet' || E.pannesRestantes > 0) { if (E.pannesRestantes > 0) E.pannesRestantes--; return json(res, 500, { error: { message: E.echo ? 'panne ' + (req.headers.authorization || '') : 'panne du banc' } }); }
        if (E.mode === 'limite') return json(res, 429, { error: { message: 'Too many requests' } });
        if (E.mode === 'illisible') { res.writeHead(200, { 'Content-Type': 'text/html' }); return res.end('<html>pas du json</html>'); }
        if (!/^Bearer \S{8,}$/.test(req.headers.authorization || '')) return json(res, 401, { error: { message: 'No API key provided' } });
        const p = u.pathname;
        let m;
        if (req.method === 'POST' && p === '/v1/checkout/sessions') {
          const get = (k) => (paires.find(x => x[0] === k) || [])[1];
          if (get('mode') !== 'subscription' || !get('line_items[0][price]') || !get('line_items[0][quantity]') || !get('success_url')) return json(res, 400, { error: { message: 'Missing required param' } });
          if (o.prix.length && !o.prix.includes(get('line_items[0][price]'))) return json(res, 400, { error: { message: 'No such price: ' + get('line_items[0][price]') } });
          const id = 'cs_banc' + (++E.n) + alea(6);
          const s = { id, object: 'checkout.session', status: 'open', mode: 'subscription', client_reference_id: get('client_reference_id') || null, paires, subscription: null,
            url: 'https://' + o.hote + '/c/pay/' + id, customer_email: get('customer_email') || null, customer: null };
          E.sessions.set(id, s);
          return json(res, 200, { id, object: 'checkout.session', url: s.url, status: 'open', mode: s.mode, client_reference_id: s.client_reference_id });
        }
        if (req.method === 'GET' && (m = /^\/v1\/checkout\/sessions\/([^/]+)$/.exec(p))) {
          const s = E.sessions.get(decodeURIComponent(m[1]));
          if (!s) return json(res, 404, { error: { message: 'No such checkout.session' } });
          return json(res, 200, { id: s.id, object: 'checkout.session', status: s.status, mode: s.mode, client_reference_id: s.client_reference_id, subscription: s.subscription, customer: s.customer, url: s.status === 'open' ? s.url : null });
        }
        if (req.method === 'GET' && (m = /^\/v1\/subscriptions\/([^/]+)$/.exec(p))) {
          const sb = E.abonnements.get(decodeURIComponent(m[1]));
          if (!sb) return json(res, 404, { error: { message: 'No such subscription' } });
          return json(res, 200, sb);
        }
        if (req.method === 'GET' && (m = /^\/v1\/prices\/([^/]+)$/.exec(p))) {
          if (E.sansDroits.has('tarifs')) return json(res, 403, { error: { message: 'The provided key does not have the required permissions for this endpoint (rak_price_read)' } });
          const t = E.tarifs.get(decodeURIComponent(m[1]));
          if (!t) return json(res, 404, { error: { message: 'No such price' } });
          const etendre = u.searchParams.getAll('expand[]').includes('product');
          if (etendre && E.sansDroits.has('produits')) return json(res, 403, { error: { message: 'The provided key does not have the required permissions for this endpoint (rak_product_read)' } });
          return json(res, 200, Object.assign({}, t, { product: etendre ? t.product : (t.product && t.product.id) }));
        }
        if (req.method === 'GET' && p === '/v1/subscriptions') {
          if (E.sansDroits.has('abonnements')) return json(res, 403, { error: { message: 'The provided key does not have the required permissions for this endpoint (rak_subscription_read)' } });
          /* la liste telle qu'OP GESTION la lit : `status=all`, `limit`, `starting_after` — par pages de 100 au plus, `has_more` tant qu'il en reste. Comme Stripe : du plus RÉCENT au plus ancien (à
             `created` égal, le dernier rangé d'abord) ; le client et le produit des lignes ne sont développés que s'ils sont DEMANDÉS (`expand[]=data.customer`,
             `expand[]=data.items.data.price.product`) — sinon un identifiant, comme chez Stripe. */
          const etendre = u.searchParams.getAll('expand[]');
          const avecClient = etendre.includes('data.customer'), avecProduit = etendre.includes('data.items.data.price.product');
          const tous = Array.from(E.abonnements.values()).map((sb, i) => [sb, i]).sort((a, b) => ((b[0].created || 0) - (a[0].created || 0)) || (b[1] - a[1])).map(x => x[0]);
          const lim = Math.min(100, Math.max(1, parseInt(u.searchParams.get('limit') || '10', 10) || 10)), apres = u.searchParams.get('starting_after');
          const debut = apres ? Math.max(0, tous.findIndex(x => x.id === apres) + 1) : 0;
          const page = tous.slice(debut, debut + lim);
          /* ce que CETTE page de la liste a montré au lecteur (identifiant → statut) : un banc prouve ainsi que la décision qu'il juge a été prise sur une liste qui CONTENAIT l'abonnement */
          E.listes.push({ auth: req.headers.authorization || '', requete: u.search, statuts: Object.fromEntries(page.map(sb => [sb.id, sb.status])) });
          const rendre = (sb) => {
            const c = Object.assign({}, sb);
            if (avecClient) c.customer = E.clients.get(sb.customer) || sb.customer;
            if (avecProduit) c.items = Object.assign({}, sb.items, { data: ((sb.items && sb.items.data) || []).map(it => Object.assign({}, it, { price: Object.assign({}, it.price, { product: produitDe(it.price || {}) }) })) });
            return c;
          };
          return json(res, 200, { object: 'list', data: page.map(rendre), has_more: debut + lim < tous.length });
        }
        if (req.method === 'POST' && p === '/v1/billing_portal/sessions') {
          const get = (k) => (paires.find(x => x[0] === k) || [])[1];
          if (!E.portailConfigure) return json(res, 400, { error: { message: 'No configuration provided and your live mode default configuration has not been created.' } });
          if (!/^cus_\w{4,}$/.test(get('customer') || '') || !get('return_url')) return json(res, 400, { error: { message: 'Missing required param' } });
          return json(res, 200, { id: 'bps_banc' + (++E.n), object: 'billing_portal.session', url: 'https://billing.stripe.test/p/session/' + alea(6), customer: get('customer') });
        }
        return json(res, 404, { error: { message: 'Unrecognized request URL' } });
      };
      if (E.retardMs) setTimeout(repondre, E.retardMs); else repondre();
    });
  });
  await new Promise(r => srv.listen(0, '127.0.0.1', r));
  E.port = srv.address().port;
  E.hote = '127.0.0.1:' + E.port;
  E.fermer = () => new Promise(r => { try { srv.closeAllConnections(); } catch (e) { /* rien */ } srv.close(() => r()); });

  /* ── ce qu'un banc fait faire à Stripe ── */
  const pairesDe = (s, k) => (s.paires.find(x => x[0] === k) || [])[1];
  /* « payer » une session : l'abonnement qui naît est CELUI que le service a demandé (métadonnées, tarif, quantité, adresse) */
  E.payer = (sessionId, { statut = 'active', quantite = null, jours = 30, client = null } = {}) => {
    const s = E.sessions.get(sessionId); if (!s) throw new Error('session inconnue : ' + sessionId);
    const cid = client || 'cus_banc' + alea(5), sid = 'sub_banc' + alea(6);
    const meta = {}; for (const [k, v] of s.paires) { const m = /^subscription_data\[metadata\]\[(.+)\]$/.exec(k); if (m) meta[m[1]] = v; }
    const q = quantite === null ? parseInt(pairesDe(s, 'line_items[0][quantity]'), 10) : quantite;
    E.clients.set(cid, { id: cid, object: 'customer', email: s.customer_email });
    /* le tarif de la ligne est CELUI QUE LE SERVICE A DEMANDÉ ; son produit, celui du tarif posé (`poserTarif`) quand il y en a un, sinon un produit du banc (un identifiant, comme chez Stripe) */
    const prixId = pairesDe(s, 'line_items[0][price]'), tarif = E.tarifs.get(prixId);
    const produitId = tarif && tarif.product ? (typeof tarif.product === 'object' ? tarif.product.id : tarif.product) : 'prod_banc';
    const sb = { id: sid, object: 'subscription', status: statut, created: Math.floor(Date.now() / 1000), metadata: meta, customer: cid, cancel_at_period_end: false,
      current_period_end: Math.floor(Date.now() / 1000) + jours * 86400,
      items: { object: 'list', data: [{ id: 'si_' + alea(4), quantity: q, price: { id: prixId, object: 'price', product: produitId } }] } };
    E.abonnements.set(sid, sb);
    s.status = 'complete'; s.subscription = sid; s.customer = cid;
    return sb;
  };
  E.statut = (subId, statut, plus) => { const sb = E.abonnements.get(subId); if (!sb) throw new Error('abonnement inconnu'); sb.status = statut; Object.assign(sb, plus || {}); return sb; };
  E.quantite = (subId, q) => { const sb = E.abonnements.get(subId); sb.items.data[0].quantity = q; return sb; };
  E.ajouterLigne = (subId, prix, quantite = 1) => { const sb = E.abonnements.get(subId); sb.items.data.push({ id: 'si_' + alea(4), quantity: quantite, price: { id: prix, object: 'price' } }); return sb; };
  E.expirer = (sessionId) => { E.sessions.get(sessionId).status = 'expired'; };
  E.oublier = (subId) => { E.abonnements.delete(subId); };
  /* un abonnement d'un AUTRE produit ou d'un autre compte, rangé tel quel dans la liste (pour la couture) */
  E.poser = (sb) => { E.abonnements.set(sb.id, sb); if (sb.customer && typeof sb.customer === 'object') { E.clients.set(sb.customer.id, sb.customer); sb.customer = sb.customer.id; } return sb; };
  /* un tarif tel que Stripe le rend (par défaut : 15 € par mois, par place, en euros, en mode test, produit « OP MESSAGES Pro ») */
  E.poserTarif = (id, plus) => { const t = Object.assign({ id, object: 'price', active: true, currency: 'eur', unit_amount: 1500, type: 'recurring', recurring: { interval: 'month', interval_count: 1 }, billing_scheme: 'per_unit', livemode: false, product: { id: 'prod_banc' + alea(3), object: 'product', name: 'OP MESSAGES Pro' } }, plus || {}); E.tarifs.set(id, t); return t; };
  E.sessionsOuvertes = () => Array.from(E.sessions.values()).filter(s => s.status === 'open');
  E.derniereSession = () => Array.from(E.sessions.values()).pop() || null;
  E.compter = (m, motif) => E.appels.filter(a => a.m === m && motif.test(a.chemin)).length;
  E.dernier = (m, motif) => E.appels.slice().reverse().find(a => a.m === m && motif.test(a.chemin)) || null;
  E.vider = () => { E.appels.length = 0; };
  return E;
}

module.exports = { fauxStripe };
