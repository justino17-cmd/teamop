/* ══ OP MESSAGES — L'APERÇU DES PHOTOS AVANT L'ENVOI EST UNE COUCHE DE LA ROUTE (testeur « medias#1 », 17 octobre 2026) ═══════════════════════════
   Le retour du navigateur (Android, geste d'iOS), aperçu ouvert, QUITTAIT LA CONVERSATION et laissait l'aperçu affiché par-dessus la liste : « Envoyer » depuis là faisait
   partir la photo vers une conversation qui n'était plus à l'écran. Échap et la croix, eux, fermaient proprement. L'aperçu n'avait aucune entrée d'historique : il vivait
   hors de la route (`etat.photo`, la photo agrandie, y est ; `ep`, l'aperçu d'envoi, non).

   Règle de la page (section 6) : chaque couche qu'on ouvre POUSSE une entrée, chaque fermeture à la main la REND (`history.back()` par `fermerCouche`), et `popstate` →
   `appliquer` est le SEUL chemin qui ferme vraiment. Ce banc monte la VRAIE navigation de la page (tests/outils-navigation-msg.js) avec les VRAIES `epOuvrir`, `epFermer`,
   `epRendre`, `apercuAppliquer`, et les lignes réelles d'`appliquer` qui rejouent la photo et l'aperçu — sur un historique de navigateur qui joue `back()` en ASYNCHRONE.
   ⛔ Les gestes de la page ne sont pas des textes à chercher : on les JOUE (ouvrir, retour, croix, Échap, envoyer, route remplacée), puis on lit la route, l'historique,
   ce qui reste ouvert et les adresses d'images rendues. */
const T = require('./outils-navigation-msg');
const { v, vrai, fin } = T.compteur();

const URLS_REVOQUEES = [];
function monter() {
  let fns = []; try { fns = ['epAjuster', 'epRendre', 'epOuvrir', 'epFermer', 'apercuAppliquer'].filter(n => { try { T.fonction(n); return true; } catch (e) { return false; } }); } catch (e) { /* rien */ }
  const lignesPhoto = T.tranche('    const cle = r.photo || null;', '    /* l\'appel est la couche du DESSUS');
  const M = T.monter({
    avec: fns,
    pre: 'const ep = { ouvert: false, conv: null, photos: [], sel: 0, max: 10, declencheur: null, envoi: false }; const esc = s => String(s);\n'
      + 'function ouvrirPhotoDom() {} function fermerPhotoDom() {} etat.photo = null; this.ep = ep;',
    appliquerDe: 'function appliquer(r) { const prec = etat.route; etat.route = r; appliquees.push(JSON.stringify(r));\n' + lignesPhoto + '}',
  });
  M.ctx.URL = { revokeObjectURL: u => URLS_REVOQUEES.push(u) }; M.ctx.document.activeElement = null;
  M.ep = M.ctx.ep; M.fns = fns;
  return M;
}
const photos = (...u) => u.map(x => ({ url: x, blob: {}, w: 10, h: 10 }));
const etatFin = (M) => ({ apercu: M.ep.ouvert, route: M.etat.route && { conv: M.etat.route.conv, apercu: M.etat.route.apercu || null }, hash: M.loc.hash.slice(0, 12), rang: M.index() });
const OUVERT = (M, conv) => { M.pousser({ vue: 'messages', conv, feuille: false, photo: null, appel: null }); return M; };
const C = 'c_' + 'a'.repeat(32);

(async () => {
  const M0 = monter();
  vrai('(population) les fonctions de l\'aperçu sont trouvées dans la page : ' + M0.fns.join(', '), ['epAjuster', 'epRendre', 'epOuvrir', 'epFermer'].every(n => M0.fns.includes(n)));
  vrai('… dont `apercuAppliquer`, qui rejoue l\'aperçu que dit la route', M0.fns.includes('apercuAppliquer'));

  /* 1. ouvrir : une entrée de plus, la route le dit */
  {
    const M = OUVERT(monter(), C); await T.attendre();
    const avant = M.pile().length;
    M.ctx.epOuvrir(C, photos('blob:1', 'blob:2'), 10);
    v('ouvrir l\'aperçu POUSSE une entrée d\'historique (une couche, comme la photo agrandie)', [M.pile().length, M.etat.route.apercu, M.ep.ouvert], [avant + 1, C, true]);
    v('… l\'adresse ne change pas (c\'est la même conversation)', M.loc.hash.slice(0, 12), '#messages/c_');
  }
  /* 2. LE BUG : le retour du navigateur ne ferme QUE l'aperçu */
  {
    URLS_REVOQUEES.length = 0;
    const M = OUVERT(monter(), C); await T.attendre();
    M.ctx.epOuvrir(C, photos('blob:1', 'blob:2'), 10);
    M.hist.back(); await T.attendre();
    v('le retour du navigateur FERME l\'aperçu et la conversation reste (route, adresse) — c\'était : conversation quittée, aperçu resté ouvert', etatFin(M), { apercu: false, route: { conv: C, apercu: null }, hash: '#messages/c_', rang: 1 });
    v('… les adresses des photos non envoyées sont rendues (rien ne fuit)', URLS_REVOQUEES.slice().sort(), ['blob:1', 'blob:2']);
    M.hist.back(); await T.attendre();
    v('… et un SECOND retour quitte la conversation (une couche par retour)', [M.etat.route.conv, M.loc.hash], [null, '#messages']);
  }
  /* 3. la croix et Échap (epFermer) rendent l'entrée : un retour, pas deux */
  {
    URLS_REVOQUEES.length = 0;
    const M = OUVERT(monter(), C); await T.attendre();
    M.ctx.epOuvrir(C, photos('blob:1'), 10);
    M.journal.length = 0;
    M.ctx.epFermer(); await T.attendre();
    v('la croix / Échap : l\'aperçu se ferme, la route d\'avant revient, UN seul retour d\'historique', [etatFin(M), M.journal.filter(x => x === 'back').length], [{ apercu: false, route: { conv: C, apercu: null }, hash: '#messages/c_', rang: 1 }, 1]);
    v('… les photos non envoyées sont rendues', URLS_REVOQUEES, ['blob:1']);
    M.hist.back(); await T.attendre();
    v('… et le retour suivant quitte la conversation : la croix n\'a pas laissé d\'entrée orpheline', M.etat.route.conv, null);
  }
  /* 4. envoyer : l'aperçu se ferme, les photos NE sont PAS rendues (elles partent), une entrée rendue */
  {
    URLS_REVOQUEES.length = 0;
    const M = OUVERT(monter(), C); await T.attendre();
    M.ctx.epOuvrir(C, photos('blob:1', 'blob:2'), 10);
    M.ctx.epFermer(true); await T.attendre();
    v('envoyer (epFermer(true)) : fermé, conversation gardée, une seule entrée rendue, les images ne sont pas révoquées (elles partent)', [etatFin(M), URLS_REVOQUEES.length], [{ apercu: false, route: { conv: C, apercu: null }, hash: '#messages/c_', rang: 1 }, 0]);
  }
  /* 5. retirer la dernière vignette ferme l'aperçu — par la même porte */
  {
    const M = OUVERT(monter(), C); await T.attendre();
    M.ctx.epOuvrir(C, photos('blob:1'), 10);
    M.ep.photos = []; M.ctx.epRendre(); await T.attendre();
    v('retirer la dernière photo ferme l\'aperçu et rend son entrée', etatFin(M), { apercu: false, route: { conv: C, apercu: null }, hash: '#messages/c_', rang: 1 });
  }
  /* 6. la route change sans retour (la conversation n'existe plus, un lien) : l'aperçu ne survit pas, sans retour de plus */
  {
    URLS_REVOQUEES.length = 0;
    const M = OUVERT(monter(), C); await T.attendre();
    M.ctx.epOuvrir(C, photos('blob:1'), 10);
    M.journal.length = 0;
    M.remplacer({ vue: 'messages', conv: null, feuille: false, photo: null, appel: null }); await T.attendre();
    v('la conversation disparaît (route remplacée) : l\'aperçu se ferme, aucune entrée rendue en plus, les images sont rendues', [M.ep.ouvert, M.journal.filter(x => x === 'back').length, URLS_REVOQUEES], [false, 0, ['blob:1']]);
  }
  /* 7. une entrée d'aperçu que cette page n'a plus (« avancer » après un retour) : l'aperçu n'existe pas, la route le retire */
  {
    const M = OUVERT(monter(), C); await T.attendre();
    M.ctx.epOuvrir(C, photos('blob:1'), 10);
    M.hist.back(); await T.attendre();
    M.hist.forward(); await T.attendre();
    v('avancer vers l\'entrée d\'un aperçu qui n\'existe plus : rien n\'est ouvert, la route est celle de la conversation', [M.ep.ouvert, M.etat.route.apercu || null, M.etat.route.conv], [false, null, C]);
  }
  /* 8. un aperçu pour une AUTRE conversation que celle de la route n'est jamais gardé */
  {
    const M = OUVERT(monter(), C); await T.attendre();
    M.ctx.epOuvrir(C, photos('blob:1'), 10);
    const autre = 'c_' + 'b'.repeat(32);
    M.remplacer({ vue: 'messages', conv: autre, feuille: false, photo: null, apercu: C, appel: null }); await T.attendre();
    v('une route qui porte l\'aperçu d\'une autre conversation : l\'aperçu est fermé et retiré de la route', [M.ep.ouvert, M.etat.route.apercu || null, M.etat.route.conv], [false, null, autre]);
  }
  /* 9. la route sait comparer et remonter la couche */
  {
    const M = monter();
    const r = { vue: 'messages', conv: C, feuille: false, photo: null, appel: null };
    v('memeRoute distingue la route avec aperçu de la route sans', [M.memeRoute(r, Object.assign({}, r, { apercu: C })), M.memeRoute(r, Object.assign({}, r, { apercu: null }))], [false, true]);
    v('parentDe d\'une route avec aperçu = la même route sans aperçu (la conversation reste)', M.parentDe(Object.assign({}, r, { apercu: C })), Object.assign({}, r, { apercu: null }));
    v('routeDepuisHash ne ressuscite jamais un aperçu (une adresse ne porte pas de photos)', M.routeDepuisHash().apercu, null);
  }
  fin();
})().catch(e => { console.error(e); process.exitCode = 1; fin(); });
