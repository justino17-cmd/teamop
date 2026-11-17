// Matériel, étape 4 (Fournisseurs, matériel & produits) — LES MOTS (spec § 3.4) : le textContent (jamais le innerHTML, qui porte le script) des trois onglets, de chaque fiche, de chaque feuille, de chaque menu,
// des messages (toasts), du journal des commandes et des courriels préparés, jouant les gestes pour de vrai.
// Exige : AUCUN mot du lexique banni ; aucun « BC-… » ni « BR-… » à l'écran ; aucun émoji ; chaque bouton à icône seule porte un nom.
// Usage : node materiel-four-mots.js [profil] → « N ✓ · M ✗ »
const L = require('../lib.js');
(async () => {
  const v = L.v, profil = process.argv[2] || 'mac', c = await L.ouvrir({ profil, qui:'marc' }), p = c.p, R = (f, a) => p.evaluate(f, a), attendre = ms => p.waitForTimeout(ms || 250);
  const BANNI = /dotation|r[ée]assort|franco|reliquat|rapproch|seuil|inventaire|mouvement|fournisseur local|\bCSV\b|FAB-DIS|\bIA\b|sur commande|[ée]puis[ée]|r[ée]ceptionn|\bBC-\d|\bBR-\d|undefined|\bnull\b|\bNaN\b|\[object/i;
  const DOC = /\bBC-\d|\bBR-\d/;
  const EMOJI = /\p{Extended_Pictographic}/u;
  const vus = []; let ecrans = 0, signes = 0;
  const lire = async nom => { let t = await R(() => { const o = []; const z = e => e && e.innerText ? e.innerText : ''; o.push(z(document.getElementById('contenu'))); const pn = document.querySelector('#calque .panneau'); if (pn) o.push(z(pn)); const m = document.querySelector('.ctx'); if (m) o.push(z(m)); const t = document.getElementById('toast'); if (t && t.classList.contains('on')) o.push(z(t));
      // les attributs lus à voix haute comptent aussi : un bouton à icône seule se lit par son aria-label et son title
      document.querySelectorAll('#contenu [aria-label], #calque [aria-label], #contenu [title], #calque [title]').forEach(e => o.push(e.getAttribute('aria-label') || '', e.getAttribute('title') || '')); o.push('\u0001'); document.querySelectorAll('.bc-doc, .bc-portail, .cmd-pre').forEach(e => o.push(e.innerText || '')); return o.join('\n'); }); ecrans++; signes += t.length;
    // un DOCUMENT (le bon en PDF, le courriel préparé, la page du fournisseur) garde son numéro « BC-2026-039 » : c'est ce que le fournisseur lit. Seul l'ÉCRAN le perd.
    let [ecran, docs] = t.split('\u0001'); for (const d of (docs || '').split('\n').map(x => x.trim()).filter(x => x.length > 12)) ecran = ecran.split(d).join(' '); t = ecran;
    const bad = (t.match(new RegExp(BANNI.source, 'gi')) || []).concat((docs || '').match(new RegExp(BANNI.source.replace(DOC.source + '|', ''), 'gi')) || []), em = t.match(EMOJI);
    const ctx = [...t.matchAll(new RegExp('.{0,45}(' + BANNI.source + ').{0,35}', 'gi'))].slice(0, 3).map(m => m[0].replace(/\s+/g, ' '));   // le contexte du mot : sans lui, on cherche une aiguille
    v(nom + ' : aucun mot banni' + (bad.length ? ' (' + [...new Set(bad)].join(', ') + ')' : ''), !bad.length, bad.length ? ctx : []);
    if (em) v(nom + ' : aucun émoji (' + em[0] + ')', false, em[0]);
    vus.push(t); return t; };
  const sansNom = nom => R(() => { const o = []; for (const e of document.querySelectorAll('#contenu button, #calque button, #contenu a[href], #calque a[href], #contenu summary, #calque summary')) { if (!e.offsetParent) continue; const txt = (e.textContent || '').replace(/\s/g, ''); if (!txt && !(e.getAttribute('aria-label') || e.getAttribute('title'))) o.push(e.className || e.tagName); } return o; }).then(o => v(nom + ' : chaque bouton à icône seule a un nom (' + o.length + ' sans nom)', o.length === 0, o));
  const menu = async (sel, nom) => { await R(s => document.querySelector(s).click(), sel); await attendre(250); await lire(nom); await sansNom(nom); await R(() => fermerMenu()); };
  const annuler = async () => { await R(() => { const b = [...document.querySelectorAll('#toast button')].find(e => /Annuler/.test(e.textContent)); if (b) b.click(); }); await attendre(300); };
  await R(() => { window.NB = s => s; });
  await L.aller(p, 'produits');
  // les trois onglets
  await R(() => { prVue = 'commandes'; rendre(); }); await attendre(); const cm = await lire('Commandes'); await sansNom('Commandes');
  v('Commandes : les mots de l’artisan (À commander, À traiter, En route, J’ai reçu la livraison, Préparer la commande)', /À commander/.test(cm) && /À traiter/.test(cm) && /En route/.test(cm) && /J’ai reçu la livraison/.test(cm) && /Préparer la commande/.test(cm) && /Livraison en 1 jour/.test(cm) && /livraison gratuite/.test(cm), cm.slice(0, 120));
  v('Commandes : « Commande 2026-039 », jamais « BC-2026-039 »', /Commande 2026-039/.test(cm) && !/BC-2026/.test(cm));
  await menu('[data-fx="plus"]', 'Menu Plus des commandes');
  await R(() => { prVue = 'articles'; rendre(); }); await attendre(); await lire('Articles'); await sansNom('Articles'); await menu('[data-fx="filtre"]', 'Menu du filtre'); await menu('[data-fx="metier"]', 'Menu des métiers');
  await R(() => { document.querySelector('[data-fx="plus"]').click(); [...document.querySelectorAll('.ctx button')][3].click(); }); await attendre(250); await lire('Menu Trier par'); await R(() => fermerMenu());
  await R(() => { prQ = 'zzzz'; rendre(); }); await attendre(); await lire('Articles : rien trouvé'); await R(() => { prQ = ''; rendre(); });
  await R(() => { prVue = 'fournisseurs'; rendre(); }); await attendre(); await lire('Fournisseurs'); await sansNom('Fournisseurs');
  // les fiches et les feuilles
  for (const [nom, f] of [['Fiche fournisseur (livre)', () => fournFiche('cpa')], ['Fiche fournisseur (comptoir)', () => fournFiche('fd')], ['Fiche d’un fournisseur sans e-mail', () => { MES_FOURN.find(o => o.id === 'dko').mail = ''; fournFiche('dko'); }],
    ['Ajouter un fournisseur : la liste', () => { FX.ajTab = 'liste'; fournListe(); }], ['Ajouter un fournisseur : un autre', () => { FX.ajTab = 'autre'; fournListe(); }], ['Les articles habituels (choix du fournisseur)', () => fxHabituels()], ['Les articles habituels d’un fournisseur', () => fournPreparer('cpa')],
    ['Importer les prix : l’étape 1', () => fournTarifs('cpa')], ['Retirer un fournisseur', () => fxRetirerConfirm('cpa')], ['Photographier une facture', () => fournFacture('')],
    ['Une commande confirmée', () => cmdFiche('c39')], ['Une commande en livraison partielle', () => cmdFiche('c38')], ['Une commande dont la facture est arrivée', () => cmdFiche('c36')], ['Une commande terminée', () => cmdFiche('c35')], ['Tout préparer', () => pdxToutPanneau()], ['Relancer les commandes en retard', () => pdxRelGroupe()],
    ['J’ai reçu la livraison', () => cmdReception('c38')], ['Comparer avec la facture', () => cmdRappro('c36')], ['Le bon : Préparer la commande', () => { cmdPreparer('Clim Pièces Atlantique'); document.querySelector('#calque details.fx-voir').open = true; }], ['Nouvelle commande', () => cmdEdOuvrir()], ['Relancer une commande', () => cmdRelance('c39')], ['Le fournisseur a confirmé', () => cmdConfirmer('c39')], ['Ce que voit le fournisseur', () => cmdPortail('c39')], ['Le bon en PDF', () => fxClic('ce', 'voirbon|c39')]]) {
    await R(f); await attendre(300); await lire(nom); await sansNom(nom); await R(() => { fermerPanneau(); }); }
  await R(() => { prVue = 'commandes'; MES_FOURN.find(o => o.id === 'dko').mail = 'pro-ouest@daikin-distrib.fr'; rendre(); });
  // les menus des fiches
  await R(() => cmdFiche('c39')); await attendre(300); await menu('#calque [data-fx^="cplus|"]', 'Menu Plus d’une commande confirmée'); await R(() => fermerPanneau());
  await R(() => fournFiche('cpa')); await attendre(300); await menu('#calque [data-fx^="fplus|"]', 'Menu Plus d’une fiche fournisseur'); await R(() => fermerPanneau());
  // les gestes : les messages, le journal, les courriels
  const toasts = [];
  const geste = async (nom, fn) => { await R(fn); await attendre(400); toasts.push(await R(() => (document.getElementById('toast') || { innerText:'' }).innerText)); };
  await R(() => { prVue = 'commandes'; rendre(); });
  await geste('envoyer', () => { cmdPreparer('Sanitaire Pro 17'); document.querySelector('#calque [data-ce="envoyer"]').click(); }); await annuler();
  await R(() => { const c = COMMANDES[0]; fxClic('ce', 'jeter|' + c.id); }); await attendre(300); toasts.push(await R(() => (document.getElementById('toast') || { innerText:'' }).innerText));
  await geste('recevoir', () => { cmdReception('c39'); document.querySelector('#calque [data-fx="toutarrive"]').click(); document.querySelector('#calque [data-cm="recok|c39"]').click(); }); await lire('Commande reçue (fiche ouverte derrière)'); await annuler();
  await geste('comparer', () => { cmdRappro('c36'); document.querySelector('#calque [data-cm="accepte|c36"]').click(); }); await lire('Commande terminée (fiche)'); await annuler();
  await geste('importer', () => { fournTarifs('cpa'); document.querySelector('#calque [data-fo="exemple"]').click(); }); await lire('Importer les prix : l’étape 2'); await R(() => document.querySelector('#calque [data-fo="appliquer"]').click()); await attendre(300); toasts.push(await R(() => (document.getElementById('toast') || { innerText:'' }).innerText)); await annuler();
  await geste('facture', () => { fournFacture(''); document.querySelector('#calque [data-fo="facex"]').click(); }); await lire('Facture lue (étape 2)'); await R(() => document.querySelector('#calque [data-fo="facok"]').click()); await attendre(300); toasts.push(await R(() => (document.getElementById('toast') || { innerText:'' }).innerText)); await annuler();
  await R(() => { cmdRelance('c39'); document.querySelector('#calque [data-cm="relok|c39"]').click(); }); await attendre(300); toasts.push(await R(() => (document.getElementById('toast') || { innerText:'' }).innerText));
  const tt = toasts.join('\n'); const badT = tt.match(new RegExp(BANNI.source, 'gi')) || [];
  v('les messages (' + toasts.filter(Boolean).length + ') : aucun mot banni', !badT.length, badT); v('population : des messages lus (' + toasts.filter(Boolean).length + ')', toasts.filter(Boolean).length >= 6);
  // le journal d'une commande se LIT à l'écran (donc sans préfixe de document : matSansPrefixe), le courriel préparé est un DOCUMENT (il garde « BC- »)
  const jr = await R(() => COMMANDES.map(c => c.journal.map(j => matSansPrefixe(j[1])).join('\n')).join('\n')), mails = await R(() => COMMANDES.map(c => cmdMail(c)).join('\n'));
  const horsInconnu = BANNI.source.replace('|undefined|\\bnull\\b|\\bNaN\\b|\\[object', ''), badJ = jr.match(new RegExp(horsInconnu, 'gi')) || [], badM = mails.match(new RegExp(horsInconnu.replace('|' + DOC.source, ''), 'gi')) || [];
  v('le journal des commandes (' + jr.split('\n').length + ' lignes) et les courriels préparés (' + mails.split('Objet :').length + ' lus) : aucun mot banni', !badJ.length && !badM.length && jr.length > 200 && mails.length > 500, [...new Set(badJ.concat(badM))]);
  for (const id of await R(() => COMMANDES.map(c => c.id))) { await R(i => { cmdFiche(i); }, id); await attendre(150); await lire('Fiche de la commande ' + id); await R(() => fermerPanneau()); }
  v('population : ' + ecrans + ' écrans et feuilles lus, ' + signes + ' signes', ecrans >= 40 && signes > 15000, { ecrans, signes });
  v('aucune erreur de page', c.err.length === 0, c.err);
  await L.fin(c); await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.error(e); L.v('le parcours a pu se jouer jusqu\'au bout (' + String(e.message).split('\n')[0].slice(0, 120) + ')', false); try { L.fermer(); } catch (x) {} process.exit(L.bilan() ? 1 : 2); });
