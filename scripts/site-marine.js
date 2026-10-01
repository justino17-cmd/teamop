#!/usr/bin/env node
/* ══ LE GÉNÉRATEUR DU SITE VITRINE « MARINE » ══════════════════════════════════════════════════════
   Justin, 27 septembre 2026, avec le zip `design_handoff_teamop_leger` : « ce zip comprend toute
   l'interface pour le site web […] partout où il y a des captures d'écran, je veux des vrais iPhone avec
   un vrai Mac, avec des vraies captures d'écran de l'application ».

   Il écrit les HUIT pages du site (accueil, applications, créer, OP GESTION, métiers, OP MESSAGES,
   pourquoi, tarifs) en HTML statique complet : lisibles sans JavaScript, référencées par Google comme les
   pages d'aujourd'hui. Ressources communes : `vitrine/v2/` (site.css, site.js, appareils.css, captures/ —
   refaites par `scratchpad/captures-site.js`).
   ⛔ LA RACINE EN SERVICE LIT `vitrine/` (la v1 publiée le 27 septembre, `fe599df`), L'APERÇU LIT `vitrine/v2/`.
   Tant que Justin n'a pas dit « remplace le site », on ne touche ni aux pages de la racine ni à `vitrine/`
   hors de `v2/` : `vitrine/racine-v1.json` en garde l'empreinte, et `tests/test-835.js` la relit.
     node scripts/site-marine.js                 → apercu/site/ (avec « noindex » : un aperçu ne se référence pas)
     node scripts/site-marine.js --racine        → à la racine, le jour où Justin dit de remplacer le site
   ⛔ ON CORRIGE ICI, JAMAIS DANS UNE PAGE : `tests/test-835.js` régénère et exige des pages IDENTIQUES.

   Ce qui NE vient PAS de la maquette, et pourquoi (décisions de Justin, antérieures au zip) :
   · aucune promesse de « hors-ligne » / « même sans réseau » — retirées du site le 23 septembre 2026
     (`f1cc223`), la maquette les réécrivait ;
   · UN ABONNEMENT = UN UTILISATEUR, dans toutes les formules (Justin, 27 septembre 2026 au soir : « à partir
     d'aujourd'hui c'est 1 utilisateur par abonnement »). Avant : 2 en Business, 3 en Business Premium. L'application
     suivra avec la version qui porte `maxU:1` ; d'ici là elle donne PLUS que ce que le site promet, jamais moins,
     et `test-835` §3 garde cet écart déclaré ;
   · OP MESSAGES : « Bientôt disponible », aucune formule ne se choisit (l'application est fermée) ;
   · « Créer » part par e-mail (pas de route serveur) : l'écran ne dit jamais « demande envoyée » ;
   · les boutons de formule mènent à `recap-abonnement.html?formule=…`, comme aujourd'hui. */
'use strict';
const fs = require('fs'), path = require('path');
const RACINE = path.join(__dirname, '..');
const A_LA_RACINE = process.argv.includes('--racine');
/* ⛔ LES OPTIONS DU PRO NE PARTENT À LA RACINE QUE SUR UN GESTE : `--options`, en plus de `--racine` (voir « LES OPTIONS DU
   PRO » plus bas : l'aperçu les montre, la racine non, tant que l'application SERVIE ne les ouvre pas). */
const OPTIONS_DEMANDEES = process.argv.includes('--options');
const DEST = A_LA_RACINE ? RACINE : path.join(RACINE, 'apercu', 'site');
/* ⛔ UN PACK « PRÊT » EST UN PACK QUE L'APPLICATION CONNAÎT — lu dans `app.html` (METIERS_ORDRE), jamais écrit ici. Le site
   se publie sans attendre l'application (30 septembre 2026 : les six packs de la v766 vivent sur la bêta, l'application en
   service n'en connaît que six) : un pack qu'elle ne connaît pas se dit « bientôt », et ce qui ne passe qu'avec la v766
   (« Autre métier », le compte « 12 packs ») ne se dit pas — une clé inconnue partirait en 3D, le défaut de `metierId`.
   Publier l'application, c'est donc aussi régénérer le site (`test-835` §8 le rappelle). */
const APP_HTML = fs.readFileSync(path.join(RACINE, 'app.html'), 'utf8');
const PACKS_APP = ((APP_HTML.match(/const METIERS_ORDRE=\[([^\]]*)\]/) || ['', ''])[1])
  .split(',').map(x => x.trim().replace(/'/g, '')).filter(Boolean);
const packPret = k => PACKS_APP.includes(k) ? 1 : 0;

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
/* les insécables de la typographie française, posés une fois ici (« : ; ! ? » et guillemets) */
const fr = s => esc(s).replace(/ ([:;!?])/g, '\u202f$1').replace(/« /g, '«\u202f').replace(/ »/g, '\u202f»');

/* ── les icônes (tracés de la maquette, 24 × 24, trait) ── */
const TRACE = {
  grid: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
  cal: 'M4.5 7.8A1.8 1.8 0 0 1 6.3 6h11.4a1.8 1.8 0 0 1 1.8 1.8v10.4a1.8 1.8 0 0 1-1.8 1.8H6.3a1.8 1.8 0 0 1-1.8-1.8V7.8Zm0 3.6h15M8.8 4v3.4m6.4-3.4v3.4',
  tool: 'M4 9h16v10a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 19V9Zm4 0V6.5A1.5 1.5 0 0 1 9.5 5h5A1.5 1.5 0 0 1 16 6.5V9M4 13h16',
  box: 'M3.5 8 12 3.5 20.5 8v8L12 20.5 3.5 16V8Zm0 0L12 12.5 20.5 8M12 12.5v8',
  euro: 'M17 6.5A6.5 6.5 0 1 0 17 17.5M4 10.5h9M4 13.5h9',
  doc: 'M7 3h7l5 5v12a1.5 1.5 0 0 1-1.5 1.5h-10A1.5 1.5 0 0 1 6 20V4.5A1.5 1.5 0 0 1 7.5 3ZM14 3v5h5M9 13h6M9 17h6',
  file: 'M7 3h7l5 5v12a1.5 1.5 0 0 1-1.5 1.5h-10A1.5 1.5 0 0 1 6 20V4.5A1.5 1.5 0 0 1 7.5 3ZM14 3v5h5M9 12h6',
  users: 'M8.5 11a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4Zm8 .4a2.6 2.6 0 1 0 0-5.2 2.6 2.6 0 0 0 0 5.2ZM3 19.4c0-3 2.5-5 5.5-5s5.5 2 5.5 5m3-6.4c2.4.2 4 2 4 4.4',
  bell: 'M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15L6 16ZM10 21a2 2 0 0 0 4 0',
  lock: 'M6 11h12v9H6zM8.5 11V8a3.5 3.5 0 0 1 7 0v3',
  device: 'M7 3h10a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Zm4 15h2',
  clip: 'M8 12.5 14 6.5a3 3 0 0 1 4.2 4.2l-7.8 7.8a4.5 4.5 0 0 1-6.4-6.4L11 5',
  building: 'M5 21V4h10v17M15 9h4v12M8 8h2m-2 4h2m-2 4h2',
  rocket: 'M12 15c3-2 6-6 6-11-5 0-9 3-11 6l5 5Zm-5-5-3 1 2 2m6 2-1 3-2-2M9 15l-3 3',
  flag: 'M5 21V4m0 0h11l-2 4 2 4H5',
  key: 'M14 10a4 4 0 1 1-1.2-2.8L21 15v3h-3v-2h-2v-2',
  brick: 'M3 6h18v4H3zM3 10h18v4H3zM3 14h18v4H3zM9 6v4m6 4v4M12 10v4',
  saw: 'M3 17 17 3l4 4L7 21H3v-4Zm4-4 2 2m2-6 2 2m2-6 2 2',
  brush: 'M14 4l6 6-8 8H6v-6l8-8Zm-8 14-3 3',
  ear: 'M8 10a4 4 0 1 1 8 0c0 3-3 3-3 6a2 2 0 0 1-4 0',
  bug: 'M12 20a6 6 0 0 0 6-6v-3a6 6 0 0 0-12 0v3a6 6 0 0 0 6 6Zm0 0v-9M6 11H3m18 0h-3M7 6 5 4m12 2 2-2M4 17l2-1m14 1-2-1',
  pipe: 'M4 10h6v10H4zM10 10V6a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v4M14 10v4h6',
  bolt: 'M13 3 5 14h6l-1 7 8-11h-6l1-7Z',
  flame: 'M12 3s5 4 5 9a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3 1-6 1-8Z',
  leaf: 'M5 19c0-8 5-14 14-14 0 9-6 14-14 14Zm0 0 7-7',
  spray: 'M8 9h6v11H8zM10 9V6h2v3M15 6h1m2-2h1m-1 4h1M6 11H4',
  wrench: 'M14 6a4 4 0 0 0 4 4l-8 8a2.5 2.5 0 0 1-4-4l8-8Zm1-3 3 3',
  chat: 'M4 6a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v7a3 3 0 0 1-3 3H10l-5 4v-4H7a3 3 0 0 1-3-3V6Z',
};
const ic = (k, t) => `<svg width="${t || 20}" height="${t || 20}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${TRACE[k]}"/></svg>`;
const COCHE = (t) => `<svg width="${t || 14}" height="${t || 14}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5 10 17.5 19 7"/></svg>`;
const PLUS = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>`;

/* ── les appareils : le cadre (vitrine/appareils.css) et l'écran jour/nuit ── */
const RES = '/vitrine/v2/';
const CAP = RES + 'captures/';
function mac(nom, alt, o) {
  o = o || {};
  const tailles = o.tailles || '(max-width: 700px) 94vw, 1120px';
  const charge = o.tot ? 'eager" fetchpriority="high' : 'lazy';
  return `<figure class="ap-mac" style="margin:0"><div class="ap-mac-couvercle"><div class="ap-mac-ecran"><picture>`
    + `<source data-nuit media="(prefers-color-scheme: dark)" srcset="${CAP}${nom}-nuit.webp 3024w, ${CAP}${nom}-nuit-1x.webp 1512w" sizes="${tailles}">`
    + `<img src="${CAP}${nom}-jour-1x.webp" srcset="${CAP}${nom}-jour.webp 3024w, ${CAP}${nom}-jour-1x.webp 1512w" sizes="${tailles}" width="1512" height="982" alt="${esc(alt)}" loading="${charge}" decoding="async">`
    + `</picture><span class="ap-mac-encoche"></span></div></div><div class="ap-mac-socle"></div></figure>`;
}
function iphone(nom, alt, o) {
  o = o || {};
  const charge = o.tot ? 'eager' : 'lazy';
  return `<figure class="ap-iphone" style="margin:0${o.largeur ? ';--ap-l:' + o.largeur : ''}">`
    + '<span class="ap-iphone-bouton g action"></span><span class="ap-iphone-bouton g vol1"></span><span class="ap-iphone-bouton g vol2"></span><span class="ap-iphone-bouton d marche"></span><span class="ap-iphone-bouton d photo"></span>'
    + `<div class="ap-iphone-corps"><div class="ap-iphone-bord"><div class="ap-iphone-ecran"><picture>`
    + `<source data-nuit media="(prefers-color-scheme: dark)" srcset="${CAP}${nom}-nuit.webp">`
    + `<img src="${CAP}${nom}-jour.webp" width="804" height="1748" alt="${esc(alt)}" loading="${charge}" decoding="async">`
    + `</picture></div></div></div></figure>`;
}

/* ── la navigation : un seul endroit pour les liens, le volet, le menu du téléphone et le pied ── */
const L = (label, href, sous) => ({ label, href, sous });
const VOLETS = {
  applications: { label: 'Applications', href: 'applications.html', titre: 'Explorer les applications',
    grands: [L('OP GESTION', 'elan.html', 'Gestion tout-en-un : interventions, stock, compta'), L('OP MESSAGES', 'opmessages.html', 'Messagerie d\'équipe — bientôt disponible'), L('Créer votre application', 'creer.html', 'Décrivez votre besoin, on le construit')],
    petits: [L('Planning des interventions', 'logiciel-planning-interventions.html'), L('Gestion de stock', 'logiciel-gestion-de-stock.html'), L('Devis et factures', 'logiciel-devis-factures.html'),
      L('Bons de commande', 'logiciel-bons-de-commande.html'), L('Pointage des heures', 'logiciel-pointage.html'), L('Registre sanitaire (3D)', 'logiciel-registre-sanitaire.html'),
      L('Toutes les applications', 'applications.html')] },
  metiers: { label: 'Métiers', href: 'metiers.html', titre: 'Explorer les métiers',
    grands: [L('3D — Anti-nuisibles', 'logiciel-anti-nuisibles.html', 'Pack complet : registre sanitaire, biocides'), L('Plomberie', 'logiciel-plombier.html'), L('Électricité', 'logiciel-electricien.html'), L('Chauffage / Climatisation', 'logiciel-chauffage-climatisation.html'), L('Nettoyage / Propreté', 'logiciel-nettoyage.html')],
    petits: [L('Tous les métiers', 'metiers.html')] },
  tarifs: { label: 'Tarifs', href: 'tarifs.html', titre: 'Explorer les tarifs',
    /* le sous-titre se LIT dans FORMULES_GESTION (une seconde liste de prix recopiée divergerait) — par un accesseur : la table est plus bas */
    grands: [{ label: 'Tarifs OP GESTION', href: 'tarifs.html#elan', get sous() { return FORMULES_GESTION.map(f => f.nom + ' ' + f.prix + ' €').join(' · '); } }, L('Tarifs OP MESSAGES', 'tarifs.html#opmessages', 'Perso · Pro · Premium — bientôt disponible')],
    petits: [L('Comparer toutes les formules', 'tarifs.html'), L('Questions fréquentes', 'tarifs.html#faq')] },
  pourquoi: { label: 'Pourquoi TEAM OP', href: 'pourquoi.html', titre: 'Pourquoi TEAM OP',
    grands: [L('Au service des entreprises', 'pourquoi.html#partenaire', 'On écoute, on adapte, on construit avec vous'), L('Sécurité et engagements', 'pourquoi.html#engagements', 'Chiffrement AES-256, vos données à vous')],
    petits: [L('Nos services', 'pourquoi.html#services'), L('Découvrir pourquoi TEAM OP', 'pourquoi.html')] },
};
/* Les pages hors du site (portail, connexion, formule, mentions) : à la racine, les vraies ; dans l'aperçu, LEURS
   aperçus (apercu/espace.html…, au thème du site) — sinon « Espace client » menait de l'aperçu au portail en service,
   encore à l'ancien thème (Justin, 27 septembre au soir : « au niveau des connexions ou création de compte, j'ai pas
   mon thème »). `page()` pose POUR_LA_RACINE avant d'écrire la page. */
let POUR_LA_RACINE = A_LA_RACINE;
const hors = c => (POUR_LA_RACINE ? '' : '/apercu') + c;
const ESPACE = () => hors('/espace.html'), CONNEXION = () => hors('/connexion.html?choix=1');

/* le menu, tel que CETTE génération le montre : avec les options du Pro (aperçu), le volet Tarifs y mène ; sans (racine), il est
   VOLETS tel quel — octet pour octet ce qui est en service */
function voletsActifs() {
  if (!AVEC_OPTIONS) return VOLETS;
  const t = VOLETS.tarifs;
  return Object.assign({}, VOLETS, { tarifs: Object.assign({}, t, { petits: [L('Les options du Pro', 'tarifs.html#options'), L('Comparer toutes les formules', 'tarifs.html#comparatif')].concat(t.petits.filter(l => l.href !== 'tarifs.html')) }) });
}
function entete(section, sousnav) {
  const VOLETS = voletsActifs();
  const liens = Object.keys(VOLETS).map(k => `<a href="${VOLETS[k].href}" data-fly="${k}" aria-haspopup="true" aria-expanded="false"${section === k ? ' aria-current="page"' : ''}>${esc(VOLETS[k].label)}</a>`).join('');
  const volets = Object.keys(VOLETS).map(k => { const v = VOLETS[k]; return `<div class="fly" id="fly-${k}"><div class="fly-in"><div><div class="fly-t">${esc(v.titre)}</div><div class="fly-grand">`
    + v.grands.map(l => `<a href="${l.href}"><b>${esc(l.label)}</b>${l.sous ? `<small>${fr(l.sous)}</small>` : ''}</a>`).join('')
    + `</div></div><div><div class="fly-t">En savoir plus</div><div class="fly-petit">` + v.petits.map(l => `<a href="${l.href}">${esc(l.label)}</a>`).join('') + '</div></div></div></div>'; }).join('');
  const mobile = `<section><div class="fly-t">TEAM OP</div><a href="index.html">Accueil</a></section>`
    + Object.keys(VOLETS).map(k => `<section><div class="fly-t">${esc(VOLETS[k].label)}</div>` + VOLETS[k].grands.concat(VOLETS[k].petits).map(l => `<a href="${l.href}">${esc(l.label)}</a>`).join('') + '</section>').join('');
  const sn = sousnav ? `<div class="sousnav"><div class="sousnav-in"><a class="sousnav-t" href="${sousnav.href}">${esc(sousnav.titre)}</a><nav class="sousnav-liens" aria-label="${esc(sousnav.titre)}">`
    + sousnav.liens.map(l => `<a href="${l.href}">${esc(l.label)}</a>`).join('') + `</nav>${typeof sousnav.cta === 'function' ? sousnav.cta() : sousnav.cta}</div></div>` : '';
  return `<header class="entete"><nav class="nav" aria-label="Navigation principale"><div class="nav-in">
      <a class="marque" href="index.html"><img src="/icons/teamop-192.png" width="22" height="22" alt=""><span>TEAM OP</span></a>
      <div class="nav-liens">${liens}</div>
      <div class="nav-droite"><a class="pilule" href="${ESPACE()}">Espace client</a>
        <button class="burger" type="button" aria-label="Menu" aria-expanded="false" aria-controls="menu-mobile"><svg class="ouvre" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 8h16M4 16h16"/></svg><svg class="ferme" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg></button></div>
    </div>${volets}</nav>
    <div class="menu-mobile" id="menu-mobile">${mobile}</div>
  </header><div class="voile" aria-hidden="true"></div>${sn}`;
}

function pied() {
  const VOLETS = voletsActifs();
  const cols = [['Applications', VOLETS.applications], ['Métiers', VOLETS.metiers], ['Tarifs', VOLETS.tarifs]].map(([t, v]) => `<div><b>${t}</b>` + v.grands.concat(v.petits).map(l => `<a href="${l.href}">${esc(l.label)}</a>`).join('') + '</div>').join('')
    + '<div><b>TEAM OP</b>' + VOLETS.pourquoi.grands.map(l => `<a href="${l.href}">${esc(l.label)}</a>`).join('') + `<a href="${ESPACE()}">Espace client</a><a href="${CONNEXION()}">Se connecter</a></div>`;
  return `<footer class="pied"><div class="pied-in"><div class="cols">${cols}</div>
    <p>TEAM OP est une plateforme française d'applications métier pour les entreprises de terrain. Fondée et développée par Justin Biret. Prix TTC, sans engagement.</p>
    <div class="ligne"><span>Copyright © 2026 TEAM OP. Tous droits réservés.</span><a href="${hors('/confidentialite.html')}">Confidentialité</a><a href="${hors('/mentions-legales.html')}">Mentions légales et CGV</a><a href="mailto:support@teamop.fr">support@teamop.fr</a><span class="fin">France</span></div>
  </div></footer>`;
}

const commencer = () => `<section class="commencer" id="commencer"><div class="commencer-in"><div><h2>Prêt en trois étapes.</h2><ol>
    <li><b>1</b><span>Créez votre compte TEAM OP.</span></li><li><b>2</b><span>Demandez l'accès à une application.</span></li><li><b>3</b><span>Votre équipe travaille, tout se synchronise.</span></li></ol></div>
    <div class="boutons"><a href="${ESPACE()}">Créer mon compte</a><a href="${CONNEXION()}">Se connecter ›</a></div></div></section>`;

const scene = (surtitre, titre, chapeau, actions, o) => `<section class="scene${o && o.courte ? ' courte' : ''}" id="apercu"><p class="surtitre">${fr(surtitre)}</p><h1>${fr(titre)}</h1>`
  + (chapeau ? `<p class="chapeau">${fr(chapeau)}</p>` : '') + (actions ? `<div class="actions">${actions}</div>` : '') + '</section>';

/* ── les fonctions en tuiles, et leur fenêtre ── */
const LARGEURS = { elan: [2, 1, 1, 1, 1, 1, 2, 1, 1, 1], msg: [2, 1, 3] };
/* ── l'écran de chaque case (Justin, 27 septembre au soir : « dans chaque petite case, une capture — téléphone,
   Mac — de ce qui est concerné ; ça fait plus pro, et le but c'est de vendre l'application »). Une case large
   montre un Mac, une petite un iPhone ; la dernière (« Partout ») montre les deux. L'appareil déborde en bas
   de la case, coupé par elle : on voit le haut de l'écran, là où l'application dit ce qu'elle fait. */
const VUE_TAILLES = { mac: '(max-width: 820px) 92vw, 640px' };
function vue(v, titre) {
  if (!v) return '';
  const alt = 'OP GESTION — ' + titre;
  if (v.duo) return `<span class="vue duo" aria-hidden="true">${mac(v.duo[0], alt, { tailles: VUE_TAILLES.mac })}${iphone(v.duo[1], alt)}</span>`;
  if (v.mac) return `<span class="vue v-mac">${mac(v.mac, alt, { tailles: VUE_TAILLES.mac })}</span>`;
  return `<span class="vue v-iphone">${iphone(v.iphone, alt)}</span>`;
}
function tuiles(k, app, liste) {
  const html = liste.map(([i, t, s, , v], n) => { const span = LARGEURS[k][n] || 1, large = span > 1, inv = large && n === 0;
    return `<button type="button" class="tuile-f${large ? ' large' : ''}${inv ? ' inv' : ''}${v ? ' avec-vue' : ''}" style="--span:${span}" data-i="${n}" aria-haspopup="dialog"><span class="ic">${ic(i, 26)}</span>${v ? '' : '<span class="esp"></span>'}<b>${fr(t)}</b><span class="t">${fr(s)}</span>${vue(v, t)}<span class="plus">${PLUS}</span></button>`; }).join('');
  const donnees = { app, coche: COCHE(16), liste: liste.map(([i, t, s, p]) => ({ ic: ic(i, 28), titre: t, sous: s, points: p })) };
  return `<div class="bento">${html}</div><script type="application/json" id="fonctions-donnees">${JSON.stringify(donnees).replace(/</g, '\\u003c')}</script>`;
}
const FENETRE = `<div class="fenetre" role="dialog" aria-modal="true" aria-hidden="true" aria-labelledby="fenetre-titre"><div class="fenetre-in">
  <button type="button" class="fermer" aria-label="Fermer"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" aria-hidden="true"><path d="M5 5l14 14M19 5 5 19"/></svg></button>
  <span class="ic"></span><div class="app"></div><h2 id="fenetre-titre"></h2><div class="st"></div><ul></ul>
  <div class="pied"><button type="button" class="prec"></button><span class="pos"></span><button type="button" class="suiv"></button></div></div></div>`;

const F_GESTION = [
  ['tool', 'Interventions', 'Du planning au rapport signé, sans papier', ['Fiche détaillée par onglets, du planning au rapport signé par le client', 'Chronomètre automatique par GPS : démarre à l\'arrivée, s\'arrête au départ', 'Checklist, photos avant/après, signatures client et technicien horodatées', 'Statuts partagés par toute l\'équipe : à planifier → planifiée → en cours → terminée', 'Passages multiples et récurrences (1/3, 2/3, 3/3…) automatiques'], { mac: 'mac-interventions' }],
  ['cal', 'Planning et tournées', 'Chaque technicien sait où aller, et quand', ['Vues Jour / Semaine / Mois avec la charge de chaque technicien', 'Glisser-déposer vers un autre jour ou un autre technicien', 'Tournées optimisées : ordre des étapes, temps de trajet par la route et carte', 'Conflits, absences et congés détectés automatiquement', 'Affectation automatique selon le secteur du client'], { iphone: 'iphone-journee' }],
  ['box', 'Stock et box', 'Chaque produit tracé, de l\'arrivage à la sortie', ['Chaque box (métier 3D) : produits, codes d\'accès, relevés de passage avec photo', 'Arrivages fournisseurs avec photo du bon de livraison', 'Lecture d\'étiquette à la caméra, seuils d\'alerte, commande suggérée', 'Mouvements tracés par produit, technicien et box', 'Carte géolocalisée des box (métier 3D)'], { iphone: 'iphone-box' }],
  ['euro', 'Encaissements et compta', 'Ce qui est prévu, ce qui est encaissé, le jour même', ['Télécollecte terrain : encaissements du jour par technicien', 'CB, espèces, chèque, virement, financement…', 'Synthèse comptable et export CSV (s\'ouvre dans Excel) en un clic', 'Suivi payé / impayé et TVA collectée'], { iphone: 'iphone-compta' }],
  ['doc', 'Devis, factures et contrats', 'Du devis au règlement, en un clic', ['Devis acceptés transformés en facture en un clic', 'Factures générées depuis les interventions', 'Contrats d\'entretien : l\'intervention suivante générée d\'un clic', 'Envoi au nom de votre entreprise, statuts suivis'], { iphone: 'iphone-factures' }],
  ['file', 'Rapports et documents', 'Envoyés depuis la fiche, à votre nom', ['Rapports à votre nom : logo, coordonnées de la société, champs personnalisés', 'Envoi par e-mail, PDF joint — ou un SMS prêt à partir de votre téléphone', 'Avis de passage et rappel de rendez-vous par e-mail, depuis la fiche', 'Photos et documents archivés sur chaque fiche'], { iphone: 'iphone-rapports' }],
  ['users', 'Équipe et rôles', 'Chacun voit ce qui le concerne', ['Comptes pour toute l\'équipe : admin, technicien, commercial, comptable…', 'Permissions menu par menu et action par action', 'Un technicien ne voit que ses interventions et ses box', 'Pointage des heures, parc de véhicules'], { mac: 'mac-utilisateurs' }],
  ['bell', 'Notifications', 'Même application fermée', ['Sur le téléphone et l\'ordinateur, même application fermée', 'Nouvelle intervention, arrivage, stock bas, validation à faire, message', 'Dans l\'application, la cloche mène droit à la bonne fiche'], { iphone: 'iphone-notifs' }],
  ['lock', 'Sécurisé', 'Chiffré sur l\'appareil, isolé par entreprise', ['Un identifiant et un mot de passe personnels par compte', 'Données chiffrées (AES-256) sur l\'appareil avant l\'envoi', 'Espace isolé par entreprise, avec sa propre clé', 'Sauvegardes complètes en un clic'], { iphone: 'iphone-connexion' }],
  ['device', 'Partout, sur tous vos appareils', 'iPhone, Android, Mac, Windows', ['Une vraie application sur tous les appareils', 'Synchronisée en quelques secondes entre les appareils de l\'équipe'], { duo: ['mac-tableau', 'iphone-tableau'] }],
];
const F_MESSAGES = [
  ['bolt', 'Chat en temps réel', 'Canal général, groupes, messages privés', ['Canal Général, groupes par chantier ou service, messages privés', 'Réponse par glissement, mentions @collègue', 'Instantané sur tous les appareils']],
  ['bell', 'Notifications', 'Même application fermée', ['Prévenu même application fermée — téléphone et ordinateur', 'Un clic ouvre directement la conversation', 'Seuls les membres de la conversation sont prévenus']],
  ['clip', 'Photos, vocaux et fichiers', 'Tout se partage', ['Photos, vocaux, documents, fiches contact', 'Sondages pour décider ensemble', 'Événements pour caler les rendez-vous d\'équipe']],
];

/* ── les formules : un abonnement = un utilisateur, quelle que soit la formule (Justin, 27 septembre 2026) ── */
const F = (cle, nom, prix, per, places, desc, tete, points, phare, tag) => ({ cle, nom, prix, per, places, desc, tete, points, phare, tag });
const FORMULES_GESTION = [
  F('pro', 'Pro', '15', '€ / mois', '1 utilisateur par abonnement', 'Pour les équipes terrain qui veulent un planning et des rapports impeccables.', 'Inclus', ['Planning des interventions (jour · semaine · mois)', 'Fiches clients et historique des passages', 'Rapports d\'intervention : photos, signatures, envoi en PDF', 'Tournées du jour : carte, temps de trajet, ordre optimisé', 'Récurrences (contrats) et passages multiples', 'Conflits de planning et absences signalés', 'Devis et factures', 'Pointage des heures', 'Exports CSV, notifications push', 'App web + mobile (iPhone, Android, Mac, PC), données chiffrées AES-256, support par e-mail']),
  F('business', 'Business', '25', '€ / mois', '1 utilisateur par abonnement', 'Pour piloter toute l\'entreprise : stock, achats, réglementaire et compta.', 'Tout Pro, plus', ['Stock : inventaire et seuils d\'alerte (box pour le métier 3D)', 'Bons de commande fournisseurs : PDF pro, envoi en 1 clic', 'Commande suggérée, réception qui crédite le stock', 'Boîte mail intégrée rattachée aux bons', 'Registre sanitaire (métier 3D) : tous les passages et les produits appliqués', 'Télécollecte et comptabilité, rôles fins', 'Votre logo dans l\'application', 'Support prioritaire'], true),
  F('premium', 'Business Premium', '50', '€ / mois', '1 utilisateur par abonnement', 'Le maximum : votre couleur, le service 24h/24 — et la messagerie d\'équipe à sa réouverture.', 'Tout Business, plus', ['Toutes les fonctions d\'OP GESTION pour votre métier, sans limite', 'OP MESSAGES inclus dès sa réouverture', 'Votre logo et votre couleur d\'entreprise, pour toute l\'équipe', 'Création sur mesure d\'une application selon vos besoins', 'Service 24h/24, 7j/7 et accompagnement à la mise en route']),
];
const FORMULES_MESSAGES = [
  F('', 'Perso', '0', '€ pour toujours', 'Compte personnel', 'La messagerie classique, gratuite : messages, appels et vidéo.', 'Inclus', ['Messages privés et groupes entre contacts', 'Appels audio illimités', 'Appels vidéo en tête-à-tête', 'Photos, vidéos, fichiers et messages vocaux', 'App web + mobile, synchro en temps réel']),
  F('', 'Messages Pro', '15', '€ / mois', '1 utilisateur par abonnement', 'La messagerie de votre entreprise, propre et séparée du perso.', 'Tout Perso, plus', ['Espace entreprise (SIRET) : vos équipes, vos règles', 'Canaux d\'équipe (# équipe, # dépôt…) et canal général', 'Épingles, favoris, archivage, recherche', 'Mentions @, réponses, messages vocaux', 'Notifications push, gestion des membres'], true, 'Équipes'),
  F('', 'Messages Business Premium', '25', '€ / mois', '1 utilisateur par abonnement', 'La totale : visio illimitée et priorité au support.', 'Tout Messages Pro, plus', ['Réunions visio illimitées : HD, partage d\'écran', 'Réunions planifiées avec invitations, appels de groupe', 'Couleurs de conversation et personnalisation avancée', 'Support prioritaire', 'Inclus avec le Business Premium d\'OP GESTION']),
];
/* ══ LES OPTIONS DU PRO — Justin, 1er octobre 2026 : « Plus cher » (cahier des charges, section 1 : l'offre et ses prix) ══════
   Le Pro (15 €) s'étoffe de quatre options PAR UTILISATEUR ET PAR MOIS — Stock 9 €, Achats fournisseurs 6 €, Encaissements et
   compta 6 €, Registre sanitaire (métier 3D) 6 € ; Business et Business Premium les ont toutes. À l'année : 10 mois payés sur 12.
   ⛔ UNE TABLE, TROIS RENDUS. `OPTIONS_SITE` (les prix) et `CATALOGUE` (ce que chaque formule ouvre, ligne par ligne) nourrissent
   les cartes de formule, le bloc « Les options du Pro » ET le tableau comparatif : trois copies écrites à la main divergeraient
   (une carte qui dit 9 €, un tableau qui dit 6 €). `tests/test-855.js` relit les trois contre la table.
   ⛔ LE SITE NE VEND PAS CE QUE L'APPLICATION NE LIVRE PAS (règle d'or n° 6 du cahier des charges : « les appareils d'abord, la porte
   ensuite »). Trois verrous :
   1. l'APERÇU (`apercu/site/`, `noindex`) montre toujours les options : c'est lui que Justin regarde pour valider ;
   2. la RACINE ne les montre que si `app.html` DÉCLARE `OPTIONS_GESTION` (la carte des options servies, lue ici SANS rien exécuter)
      ET qu'on a dit `--options` : l'application de la branche n'est pas l'application servie, et lire `app.html` ne prouve pas qu'elle
      est publiée — c'est un geste de Justin, pas une déduction. Sans l'un ou l'autre, la racine est octet pour octet celle d'avant ;
   3. quelle que soit la sortie, si `app.html` déclare `OPTIONS_GESTION`, le générateur REFUSE (il jette) de vendre une option qu'elle
      ne connaît pas, ou à un prix, ou avec des écrans, qui ne sont pas les siens. Aujourd'hui `app.html` ne la déclare pas : l'aperçu
      vend dans le vide, c'est voulu, et la ligne d'avertissement de la commande le dit. */
const MOIS_OFFERTS = 2;
const euro = n => String(n).replace('.', ',') + ' €';
const surAn = p => p * (12 - MOIS_OFFERTS);
const OPTIONS_SITE = [
  { cle: 'stock', nom: 'Stock (et box pour la 3D)', court: 'Stock', prix: 9, vues: ['produits', 'stock', 'mouvements', 'saisieConso', 'boxes', 'carteBox', 'produitsDonnes', 'demandes', 'histoDemandes', 'brouillon', 'validations'],
    d: 'Le stock produit par produit, les mouvements tracés et, pour le métier 3D, les box.' },
  { cle: 'achats', nom: 'Achats fournisseurs', court: 'Achats', prix: 6, vues: ['fournisseurs', 'bons', 'commandes', 'boiteMail'],
    d: 'Vos fournisseurs, vos bons de commande en PDF et leur suivi, avec la boîte mail intégrée.' },
  { cle: 'compta', nom: 'Encaissements et compta', court: 'Compta', prix: 6, vues: ['comptabilite', 'telecollecte', 'enveloppes'],
    d: 'Ce qui est encaissé chaque jour, technicien par technicien, et la comptabilité qui en découle.' },
  { cle: 'sanitaire', nom: 'Registre sanitaire (métier 3D)', court: 'Registre', prix: 6, vues: ['registre', 'produits'], metier3d: true,
    d: 'Le registre sanitaire des passages et des biocides, pour les entreprises 3D.' },
];
const optDe = cle => OPTIONS_SITE.find(o => o.cle === cle);
const prixOpt = cle => optDe(cle).prix;
const PRIX_OPT_MIN = Math.min(...OPTIONS_SITE.map(o => o.prix));
const MIN2 = OPTIONS_SITE.map(o => o.prix).sort((a, b) => a - b).slice(0, 2).reduce((a, b) => a + b, 0);
/* UNE LIGNE PAR CAPACITÉ, DITE UNE FOIS : { t, pro, business, premium } — 1 = inclus, 0 = non, une clé d'option (ou une liste de
   clés : il les faut TOUTES) = « en option » pour le Pro. Une catégorie qui porte `opt` donne cette option à ses lignes par défaut.
   Chaque phrase reprend ce que le site disait déjà de l'application (relu dans app.html v763), jamais une promesse neuve. */
const CATALOGUE = [
  { id: 'planning', t: 'Planning et interventions', l: [
    { t: 'Planning des interventions : jour, semaine, mois' },
    { t: 'Tournées du jour : carte, temps de trajet, ordre optimisé' },
    { t: 'Rapports d\'intervention : photos, signatures, envoi en PDF' },
    { t: 'Récurrences (contrats) et passages multiples' },
    { t: 'Conflits de planning et absences signalés' }] },
  { id: 'clients', t: 'Clients, devis et factures', l: [
    { t: 'Fiches clients et historique des passages' },
    { t: 'Devis et factures en PDF à votre en-tête' },
    { t: 'Contrats d\'entretien' }] },
  { id: 'equipe', t: 'Équipe', l: [
    { t: 'Pointage des heures, absences et congés' },
    { t: 'Exports CSV, notifications push' },
    { t: 'App web + mobile (iPhone, Android, Mac, PC), données chiffrées AES-256' }] },
  { id: 'stock', opt: 'stock', t: 'Stock', l: [
    { t: 'Produits et stock : inventaire, seuils d\'alerte, un total par produit' },
    { t: 'Mouvements tracés : arrivage avec photo du bon, sortie « pour qui », corrections' },
    { t: 'Box pour le métier 3D : points de stock et carte des box' },
    { t: 'Demandes de l\'équipe, validées par un responsable' }] },
  { id: 'achats', opt: 'achats', t: 'Achats fournisseurs', l: [
    { t: 'Bons de commande en PDF, envoyés par e-mail au fournisseur' },
    { t: 'Fournisseurs et commandes en cours' },
    { t: 'Boîte mail intégrée, rattachée aux bons' },
    { t: 'Commande suggérée et réception qui entre en stock', pro: ['stock', 'achats'], note: 'avec l\'option Stock' }] },
  { id: 'compta', opt: 'compta', t: 'Encaissements et compta', l: [
    { t: 'Télécollecte : les encaissements du jour, technicien par technicien' },
    { t: 'Comptabilité : synthèse, TVA collectée, export CSV' }] },
  { id: 'sanitaire', opt: 'sanitaire', t: 'Registre sanitaire (métier 3D)', l: [
    { t: 'Registre sanitaire : les passages et les produits appliqués' },
    { t: 'Dossier sanitaire du client, à imprimer en PDF' },
    { t: 'Catalogue de produits : l\'AMM d\'un biocide s\'y renseigne' }] },
  { id: 'marque', t: 'Votre marque et le service', l: [
    { t: 'Support par e-mail' },
    { t: 'Support prioritaire', pro: 0 },
    { t: 'Votre logo dans l\'application', pro: 0 },
    { t: 'Votre couleur d\'entreprise dans l\'application', pro: 0, business: 0 },
    { t: 'OP MESSAGES inclus dès sa réouverture', pro: 0, business: 0 },
    { t: 'Création sur mesure d\'une application selon vos besoins', pro: 0, business: 0 },
    { t: 'Service 24h/24, 7j/7 et accompagnement à la mise en route', pro: 0, business: 0 }] },
];
const FORMULES_COL = ['pro', 'business', 'premium'];
const valeur = (c, l, col) => l[col] !== undefined ? l[col] : (col === 'pro' ? (c.opt || 1) : 1);
const clesDe = v => Array.isArray(v) ? v : typeof v === 'string' ? [v] : [];
const PLUS_O = PLUS.replace('width="14" height="14"', 'width="13" height="13"');
const noteDe = l => l.note ? ` <em>(${fr(l.note)})</em>` : '';
/* ce qu'une carte de formule liste : le Pro ce qu'il a (et ses options, une ligne chacune), les autres CE QU'ILS AJOUTENT */
function groupesDe(col) {
  const prec = col === 'premium' ? 'business' : 'pro';
  return CATALOGUE.map(c => ({ id: c.id, t: c.t,
    l: c.l.filter(l => col === 'pro' ? valeur(c, l, 'pro') === 1 : valeur(c, l, col) === 1 && valeur(c, l, prec) !== 1) })).filter(g => g.l.length);
}
function detailFormule(f) {
  const groupes = groupesDe(f.cle).map(g => `<div class="groupe"><div class="groupe-t">${fr(g.t)}</div><ul>`
    + g.l.map(l => `<li>${COCHE()}<span>${fr(l.t)}${noteDe(l)}</span></li>`).join('') + '</ul></div>').join('');
  const opts = f.cle !== 'pro' ? '' : `<div class="groupe options"><div class="groupe-t">En option avec le Pro</div><ul>`
    + OPTIONS_SITE.map(o => `<li class="opt">${PLUS_O}<span>${fr(o.nom)} <b>+${euro(o.prix)}</b></span></li>`).join('')
    + `</ul><a class="voir" href="#options">Voir les options ›</a></div>`;
  return groupes + opts;
}
const anDe = f => `<div class="an">ou ${euro(surAn(+f.prix))} par an : ${MOIS_OFFERTS} mois offerts</div>`;

/* ── lire `OPTIONS_GESTION` dans app.html SANS l'exécuter (ni vm ni eval : le générateur lit du code, il n'en lance pas) ──
   On retire les commentaires de bloc qui COMMENCENT une ligne (les seuls que ce dépôt utilise pour expliquer du code — un
   motif plus gourmand avale du vrai code, CLAUDE.md) ; une déclaration commentée ne COMMENCE pas la ligne par `const`, le
   motif ne la voit donc pas. On parcourt ensuite les accolades en reconnaissant chaînes et commentaires de fin de ligne : une apostrophe française dans un commentaire ne doit pas ouvrir une « chaîne » qui mange le reste. */
function lireOptionsApp(src) {
  const code = String(src).replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, m => m.replace(/[^\n]/g, ' '));
  const d = /^[ \t]*(?:const|let|var)\s+OPTIONS_GESTION\s*=\s*\{/m.exec(code);
  if (!d) return null;
  const debut = d.index + d[0].length - 1;
  let prof = 0, cle = null, corps = 0;
  const res = {};
  for (let i = debut; i < code.length; i++) {
    const ch = code[i];
    if (ch === '"' || ch === "'" || ch === '`') { for (i++; i < code.length && code[i] !== ch; i++) if (code[i] === '\\') i++; continue; }
    if (ch === '/' && code[i + 1] === '/') { while (i < code.length && code[i] !== '\n') i++; continue; }
    if (ch === '/' && code[i + 1] === '*') { i = code.indexOf('*/', i + 2); if (i < 0) break; i++; continue; }
    if (ch === '{') {
      prof++;
      if (prof === 2) { const m = /([A-Za-z_$][\w$]*)\s*:\s*$/.exec(code.slice(Math.max(debut, i - 80), i)); cle = m && m[1]; corps = i + 1; }
    } else if (ch === '}') {
      if (prof === 2 && cle) {
        const b = code.slice(corps, i), px = /\bprix\s*:\s*['"]?\s*(\d+(?:[.,]\d+)?)/.exec(b), vu = /\bvues\s*:\s*\[([^\]]*)\]/.exec(b);
        res[cle] = { prix: px ? +px[1].replace(',', '.') : undefined, vues: vu ? [...vu[1].matchAll(/['"]([^'"]+)['"]/g)].map(x => x[1]) : undefined };
        cle = null;
      }
      prof--;
      if (prof === 0) return res;
    }
  }
  throw new Error('OPTIONS_GESTION : accolade jamais refermée dans app.html — le site ne peut pas dire ce que l\'application ouvre');
}
/* le verrou n° 3 : tout ce que le site vend, l'application le connaît, au même prix et avec les mêmes écrans */
function verifierOptions(appOptions) {
  const maux = [];
  for (const o of OPTIONS_SITE) {
    const a = appOptions[o.cle];
    if (!a) { maux.push('« ' + o.cle + ' » : le site la vend, app.html ne la connaît pas'); continue; }
    if (a.prix !== undefined && a.prix !== o.prix) maux.push('« ' + o.cle + ' » : le site la vend ' + o.prix + ' €, app.html ' + a.prix + ' €');
    if (a.vues && JSON.stringify(a.vues.slice().sort()) !== JSON.stringify(o.vues.slice().sort())) maux.push('« ' + o.cle + ' » : le site dit qu\'elle ouvre [' + o.vues + '], app.html [' + a.vues + ']');
  }
  if (maux.length) throw new Error('Le site refuse de vendre ce que l\'application ne livre pas :\n  · ' + maux.join('\n  · '));
}
const OPTIONS_APP_REELLE = lireOptionsApp(APP_HTML);
/* l'état d'UNE génération : { actif, appOptions } — `o.appSrc` remplace app.html (les bancs jouent une application qui les connaît) */
function etatOptions(racine, o) {
  o = o || {};
  const appOptions = o.appSrc !== undefined ? lireOptionsApp(o.appSrc) : OPTIONS_APP_REELLE;
  if (appOptions) verifierOptions(appOptions);
  if (!racine) return { actif: true, appOptions };
  if (!o.options) return { actif: false, appOptions };
  if (!appOptions) throw new Error('--options : app.html ne déclare pas OPTIONS_GESTION — la racine ne vend pas ce que l\'application ne connaît pas');
  return { actif: true, appOptions };
}
let AVEC_OPTIONS = etatOptions(A_LA_RACINE, { options: OPTIONS_DEMANDEES }).actif;

/* le bloc « Les options du Pro » : quatre cartes, une par option, avec ce qu'elle ouvre (les lignes du CATALOGUE) */
function blocOptions() {
  const pro = +prixDe('pro'), bus = +prixDe('business');
  const carte = o => { const c = CATALOGUE.find(x => x.opt === o.cle);
    return `<article class="option" id="option-${o.cle}"><div class="o-t"><b>${fr(o.nom)}</b></div>`
      + `<div class="o-prix"><b>+${euro(o.prix)}</b><span>par utilisateur et par mois</span></div><div class="o-an">ou +${euro(surAn(o.prix))} par an : ${MOIS_OFFERTS} mois offerts</div>`
      + `<p class="o-d">${fr(o.d)}</p><ul>` + c.l.map(l => `<li>${COCHE(13)}<span>${fr(l.t)}${noteDe(l)}</span></li>`).join('') + '</ul>'
      + (o.metier3d ? `<p class="o-3d">${fr('Réservée au métier 3D : OP GESTION masque le registre pour les autres métiers.')}</p>` : '')
      + `<a class="o-cta" href="${hors('/recap-abonnement.html')}?formule=pro&amp;options=${o.cle}">${fr('Ajouter au Pro')}</a></article>`; };
  return `<section class="options-pro" id="options" aria-labelledby="options-t"><h2 class="h2 moyen" id="options-t">Les options du Pro.</h2>`
    + `<p class="intro">${fr('Gardez le Pro à ' + euro(pro) + ' et ajoutez seulement ce dont vous avez besoin. Une option se paie par utilisateur et par mois, en plus du Pro, et couvre toute l\'équipe : prenez-en autant que d\'abonnements Pro.')}</p>`
    + `<div class="options-grille">${OPTIONS_SITE.map(carte).join('')}</div>`
    + `<p class="options-calcul">${fr('Pro avec l\'option Stock : ' + euro(pro + prixOpt('stock')) + ', moins que Business (' + euro(bus) + '). Dès deux options, Business revient moins cher : Pro avec deux options coûte au moins ' + euro(pro + MIN2) + '. Business et Business Premium incluent les quatre options.')}</p></section>`;
}
function cellule(v) {
  if (v === 1) return `<td>${COCHE(16)}<span class="vh">inclus</span></td>`;
  if (!v) return '<td><span aria-hidden="true">—</span><span class="vh">non inclus</span></td>';
  const ks = clesDe(v);
  return '<td class="opt-cell"><span class="vh">en option : </span>' + (ks.length === 1 ? `+${euro(prixOpt(ks[0]))}` : ks.map(k => fr(optDe(k).court)).join(' + ')) + '</td>';
}
/* le tableau comparatif : généré depuis CATALOGUE, jamais écrit à la main — une ligne de plus dans la table, une ligne de plus ici */
function blocComparatif() {
  const F = FORMULES_GESTION;
  const tete = `<tr><th scope="col" class="c-fn">Fonction</th>` + F.map(f => `<th scope="col">${fr(f.nom)}<small>${euro(f.prix)} par mois</small></th>`).join('') + '</tr>';
  const corps = CATALOGUE.map(c => {
    const o = c.opt && optDe(c.opt);
    return `<tbody><tr class="cat"><th scope="rowgroup" colspan="4"><span class="cat-t">${fr(c.t)}${o ? `<small>option du Pro : +${euro(o.prix)} par utilisateur et par mois</small>` : ''}</span></th></tr>`
      + c.l.map(l => `<tr><th scope="row">${fr(l.t)}${noteDe(l)}</th>` + FORMULES_COL.map(col => cellule(valeur(c, l, col))).join('') + '</tr>').join('') + '</tbody>';
  }).join('');
  const prix = `<tbody><tr class="cat"><th scope="rowgroup" colspan="4"><span class="cat-t">Prix</span></th></tr>`
    + `<tr><th scope="row">Par utilisateur et par mois</th>` + F.map(f => `<td class="px">${euro(f.prix)}</td>`).join('') + '</tr>'
    + `<tr><th scope="row">À l'année : ${MOIS_OFFERTS} mois offerts</th>` + F.map(f => `<td class="px">${euro(surAn(+f.prix))}</td>`).join('') + '</tr></tbody>';
  return `<section class="comparatif" id="comparatif" aria-labelledby="comparatif-t"><h2 class="h2 moyen" id="comparatif-t">Comparer les formules.</h2>`
    + `<p class="intro">${fr('Ce que chaque formule ouvre, ligne par ligne. Les box et le registre sanitaire ne concernent que le métier 3D.')}</p>`
    + `<p class="glisse">${fr('Faites glisser le tableau pour voir toutes les formules.')}</p>`
    + `<div class="table-defile" role="region" aria-labelledby="comparatif-t" tabindex="0"><table class="tableau-formules"><caption class="vh">Comparatif des formules OP GESTION</caption><thead>${tete}</thead>${corps}${prix}</table></div></section>`;
}

function formules(liste, attente) {
  /* avec les options (aperçu), les cartes d'OP GESTION listent catégorie par catégorie ; sans (racine), la liste d'avant, inchangée */
  const detail = AVEC_OPTIONS && !attente;
  return liste.map(f => `<article class="formule${f.phare ? ' phare' : ''}"><div><div class="n">${f.tag ? `<i>${fr(f.tag)}</i>` : ''}<b>${fr(f.nom)}</b></div>`
    + `<div class="prix"><b>${f.prix}</b><span>${fr(f.per)}</span></div>${detail ? anDe(f) : ''}<div class="places">${fr(f.places)}</div><div class="d">${fr(f.desc)}</div></div>`
    + `<div class="inclus"><small>${fr(f.tete)}</small>` + (detail ? detailFormule(f) : `<ul>${f.points.map(p => `<li>${COCHE()}<span>${fr(p)}</span></li>`).join('')}</ul>`) + '</div>'
    + (attente ? '<span class="cta attente">Bientôt disponible</span>'
      : `<a class="cta" href="${hors('/recap-abonnement.html')}?formule=${f.cle}">${f.prix === '0' ? 'Créer mon compte' : 'Choisir ' + fr(f.nom)}</a>`)
    + '</article>').join('');
}

/* la FAQ des options (aperçu) : chaque somme se calcule dans la table — une réponse qui recopie « 24 € » diverge au premier changement de prix */
function FAQ_OPTIONS() {
  const pro = +prixDe('pro'), bus = +prixDe('business'), prem = +prixDe('premium');
  return [
    ['Comment fonctionnent les options du Pro ?', 'Ce sont des catégories d\'OP GESTION que vous ajoutez au Pro : ' + OPTIONS_SITE.map(o => o.nom + ' ' + euro(o.prix)).join(', ') + ', par utilisateur et par mois. Une option couvre toute l\'équipe : prenez-en autant que d\'abonnements Pro. Business et Business Premium incluent les quatre.'],
    ['Business ou Pro avec des options ?', 'Pro avec l\'option Stock fait ' + euro(pro + prixOpt('stock')) + ' par utilisateur et par mois, moins que Business (' + euro(bus) + '). Avec deux options, Pro coûte au moins ' + euro(pro + MIN2) + ' : Business, qui les inclut toutes, revient moins cher.'],
    ['Et si je paie à l\'année ?', 'À l\'année, vous payez ' + (12 - MOIS_OFFERTS) + ' mois au lieu de 12 : ' + MOIS_OFFERTS + ' mois offerts, pour la formule comme pour les options. Pro : ' + euro(surAn(pro)) + ' par utilisateur et par an, Business : ' + euro(surAn(bus)) + ', Business Premium : ' + euro(surAn(prem)) + '.'],
  ];
}

/* ── les pages ── */
/* ══ LES PAGES MÉTIER — une page, une adresse, un mot-clé (Justin, 29 septembre 2026, pages-metiers.md : « un seul H1,
   400 mots minimum, titre < 60 caractères, description < 155 caractères, lien vers /tarifs.html et vers l'inscription »).
   ⛔ CHAQUE PHRASE EST CE QUE L'APPLICATION FAIT AUJOURD'HUI (app.html v763, relu affirmation par affirmation le même soir) :
   · « en quelques secondes », jamais « en temps réel » : la synchronisation prend de l'ordre de la seconde avec du réseau ;
   · les contrats d'entretien planifient le passage suivant d'un clic (« Générer ») : ni passage automatique, ni rappel
     d'échéance — seule la récurrence posée sur une INTERVENTION planifie la suivante toute seule, à sa clôture ;
   · une « box » est un point de stock (local, réserve, armoire), jamais un véhicule ni un poste d'appâtage — et les box et
     le registre sanitaire n'existent que pour le métier 3D : on n'en parle pas aux plombiers, électriciens, chauffagistes ;
   · la caméra lit l'ÉTIQUETTE d'un produit : aucun code-barres ;
   · une intervention ne retire rien du stock (v741) : les produits utilisés sont notés, le stock bouge quand un produit sort ;
   · pas de relance automatique des factures, pas de module « chantier » (retiré le 23 septembre, v730) ;
   · le devis dicté est une option activée pour l'entreprise, la dictée dépend du navigateur ;
   · chaque fonction est dite avec la formule qui l'ouvre (FORMULES_GESTION) : Pro n'a ni stock, ni registre, ni télécollecte ;
   · plus de formule Gratuit sur le site (Justin, 29 septembre 2026 : « je veux que l'application soit payante directement ») :
     les cartes de formule vont de Pro à Business Premium, et aucun bouton ne promet un « compte gratuit » d'application
     (le compte TEAM OP, lui, reste gratuit : il ne donne accès à rien tant qu'un abonnement n'est pas pris).
   Les captures sont celles d'une entreprise de DÉMONSTRATION anti-nuisibles : la page 3D montre ses interventions ; les
   trois autres ne montrent que des écrans neutres (factures, comptabilité), jamais un « Dératisation » chez un plombier. */
const prixDe = cle => (FORMULES_GESTION.find(f => f.cle === cle) || {}).prix;
/* la troisième carte de chaque page : la même partout, sauf si la page en dit une autre */
const PREMIUM_METIER = "Tout Business, plus la couleur de votre entreprise dans l'application, OP MESSAGES dès sa réouverture et le service 24h/24.";
const DES_PRO = 'Dès ' + prixDe('pro') + ' € TTC par mois.';
const METIERS = {
  'logiciel-anti-nuisibles': { priorite: '0.9', icone: 'bug',
    titre: "Logiciel anti-nuisibles 3D : registre sanitaire | TEAM OP",
    desc: "Logiciel pour entreprises 3D : fiches d'intervention, registre sanitaire, suivi des biocides, stock par box et signature client. " + DES_PRO,
    surtitre: 'Logiciel anti-nuisibles (3D)', h1: "Le logiciel de gestion pensé pour les entreprises anti-nuisibles (3D)",
    chapeau: "Une entreprise de dératisation, désinsectisation et désinfection jongle entre les interventions, les produits biocides, le registre sanitaire et les devis. OP GESTION, l'application de TEAM OP, réunit tout au même endroit, sur téléphone comme sur ordinateur.",
    mac: ['mac-planning', "OP GESTION sur un Mac : la semaine de deux techniciens d'une entreprise anti-nuisibles de démonstration"],
    duo: [["Sur le terrain", "La fiche d'intervention, dans la poche.", "Client, adresse, produits, photos et signature : tout est sur la fiche.", 'iphone-intervention', "OP GESTION sur un iPhone : une intervention de dératisation en cours"],
      ["Au dépôt", "Le stock de chaque box, à jour.", "Arrivage, sortie, relevé : chaque mouvement est tracé.", 'iphone-box', "OP GESTION sur un iPhone : la fiche d'une box et ses gestes"]],
    blocs: [
      ["Des fiches d'intervention complètes, sur le terrain.", ["Client, adresse, produits utilisés, photos avant et après, signature du client : le technicien remplit la fiche depuis son téléphone, et le bureau la retrouve aussitôt. Si le client est absent, on le note sur la fiche.", "Le rapport part ensuite au client par e-mail, en PDF, avec les photos, le plan et les signatures. Fini les papiers à ressaisir le soir."]],
      ["Registre sanitaire et suivi des biocides.", ["Chaque passage et chaque produit biocide utilisé alimentent le registre sanitaire du client, avec le numéro d'AMM du produit. Le Certibiocide de chaque technicien, avec son numéro et sa date de validité, est suivi : un badge le signale 60 jours avant l'échéance.", "Pour un client professionnel, le dossier sanitaire complet (plan de lutte, relevés, produits, attestation de passage) s'imprime ou s'enregistre en PDF en un clic : vous êtes prêt le jour d'un contrôle."]],
      ["Plans d'appâtage et relevés des postes.", ["Pour chaque site, dessinez le plan d'appâtage sur une photo, une vue satellite ou le plan des pièces, avec vos postes numérotés, leur type et le produit posé. À chaque passage, le technicien relève chaque poste : rien à signaler, consommation partielle, consommé ou remplacé.", "L'évolution de l'infestation sur les derniers passages se lit d'un coup d'œil, et une fiche de traitement est prévue pour chaque nuisible : rats, souris, blattes, punaises de lit, guêpes et frelons…"]],
      ["Le stock de chaque box, toujours à jour.", ["Une box, c'est un point de stock : un local, une réserve ou une armoire, chez vous ou chez un client. Lisez l'étiquette d'un produit avec la caméra, enregistrez un arrivage, sortez un produit pour un technicien : chaque mouvement est tracé (qui, quoi, pour qui) et le stock se met à jour.", "Les produits utilisés en intervention sont notés sur la fiche sans fausser le stock : il ne baisse que quand un produit sort vraiment d'une box. Et les catalogues des principaux fournisseurs du métier s'ajoutent en quelques clics, sans tout ressaisir."]],
      ["Pour toute l'équipe.", ["Chaque technicien travaille sur son propre appareil (iPhone, Android, Mac ou PC) et les changements arrivent chez les autres en quelques secondes dès qu'il y a du réseau. Planning par technicien, tournées du jour avec l'ordre des visites optimisé, pointage des heures : le responsable voit la journée d'un coup d'œil.", "Les données envoyées à notre serveur sont chiffrées (AES-256) et chaque entreprise a son propre espace, séparé des autres."]]],
    formules: ["Les fiches d'intervention avec photos et signatures, les biocides et leur AMM sur chaque passage, les plans d'appâtage, le Certibiocide, les tournées du jour, les contrats et les récurrences, les devis et les factures.",
      "Tout Pro, plus l'écran Registre sanitaire, le stock et les box, les bons de commande aux fournisseurs, la télécollecte des encaissements et la comptabilité."] },
  'logiciel-plombier': { priorite: '0.8', icone: 'pipe',
    titre: "Logiciel pour plombiers : interventions et stock | TEAM OP",
    desc: "Gérez vos interventions, votre stock, vos devis et vos encaissements depuis votre téléphone. Logiciel français pour plombiers. " + DES_PRO,
    surtitre: 'Logiciel pour plombiers', h1: "Le logiciel de gestion pour plombiers et entreprises de plomberie",
    chapeau: "Fuites, chauffe-eau, débouchages, installations neuves : entre deux dépannages, il faut encore planifier, facturer et suivre ses pièces. OP GESTION, l'application de TEAM OP, s'occupe du reste, sur téléphone comme sur ordinateur.",
    duo: [["Au bureau", "Devis et factures, sans ressaisie.", "Ce qui est facturé, encaissé, à encaisser : tout est là.", 'iphone-factures', "OP GESTION sur un iPhone : les factures, ce qui est encaissé et ce qui reste à encaisser"],
      ["En fin de journée", "Chaque encaissement, à sa place.", "Avec la formule Business : ce qui était prévu, ce qui est encaissé, l'écart du jour.", 'iphone-compta', "OP GESTION sur un iPhone : le contrôle des encaissements du jour"]],
    blocs: [
      ["Une fiche d'intervention prête pour la plomberie.", ["En indiquant la plomberie dans votre demande d'accès, OP GESTION se règle sur votre métier dès l'ouverture de votre espace : dépannage de fuite, recherche de fuite, débouchage, chauffe-eau, robinetterie, réseau, évacuation, installation neuve. Le réglage se change sur simple demande au support, sans toucher à vos clients ni à vos interventions.", "Sur place, le technicien coche les prestations réalisées, note ses relevés, prend des photos avant et après et fait signer le client sur l'écran. Le rapport part au client par e-mail, en PDF, directement depuis l'application."]],
      ["Le stock de pièces et de consommables.", ["Raccords, flexibles, cartouches, joints : suivez vos pièces avec un seuil d'alerte par référence. Quand une quantité passe sous son seuil, l'application le signale, et la commande suggérée reprend les produits à racheter dans un bon de commande pour votre fournisseur.", "Vous saisissez vos propres références, à votre rythme : aucun catalogue ne vous est imposé."]],
      ["Devis, factures et encaissements.", ["Créez vos devis et vos factures, et envoyez-les en PDF par e-mail — ou leur résumé par SMS, depuis votre téléphone. Vous pouvez même dicter la prestation à la voix : l'assistant propose un devis que vous relisez avant de l'envoyer (une option activée pour votre entreprise).", "Suivez les factures à encaisser et celles qui sont payées ; avec la formule Business, l'encaissement de chaque technicien en fin de journée : carte, espèces, chèques. Une facture impayée se renvoie au client d'un bouton."]],
      ["Toute l'équipe, sur la même page.", ["Planning par technicien, tournées du jour avec l'ordre des visites optimisé, carte des interventions, pointage des heures : chaque plombier travaille sur son téléphone, et les changements arrivent chez les autres en quelques secondes dès qu'il y a du réseau.", "Chaque fiche client garde l'historique de ses interventions, de ses devis et de ses factures. Les données envoyées à notre serveur sont chiffrées (AES-256) et votre entreprise a son propre espace, séparé des autres."]]],
    formules: ["Les fiches d'intervention avec photos et signatures, les tournées du jour, les devis et les factures, les contrats et les récurrences, le pointage des heures.",
      "Tout Pro, plus le stock de pièces avec ses seuils d'alerte, les bons de commande et la commande suggérée, la télécollecte des encaissements et la comptabilité."] },
  'logiciel-electricien': { priorite: '0.8', icone: 'bolt',
    titre: "Logiciel électricien : interventions et devis | TEAM OP",
    desc: "Interventions, stock, devis et encaissements réunis dans une seule application pour électriciens. Sur mobile et ordinateur. " + DES_PRO,
    surtitre: 'Logiciel pour électriciens', h1: "Le logiciel de gestion pour électriciens",
    chapeau: "Dépannages, mises aux normes, tableaux, bornes de recharge : vos journées vont d'un client à l'autre. OP GESTION, l'application de TEAM OP, réunit interventions, matériel, devis et encaissements, sur téléphone comme sur ordinateur.",
    duo: [["Au bureau", "Devis et factures, sans ressaisie.", "Ce qui est facturé, encaissé, à encaisser : tout est là.", 'iphone-factures', "OP GESTION sur un iPhone : les factures, ce qui est encaissé et ce qui reste à encaisser"],
      ["En fin de journée", "Chaque encaissement, à sa place.", "Avec la formule Business : ce qui était prévu, ce qui est encaissé, l'écart du jour.", 'iphone-compta', "OP GESTION sur un iPhone : le contrôle des encaissements du jour"]],
    blocs: [
      ["Des interventions réglées pour l'électricité.", ["En indiquant l'électricité dans votre demande d'accès, OP GESTION se règle sur votre métier dès l'ouverture de votre espace : dépannage, tableau électrique, mise aux normes, éclairage, prises et circuits, borne de recharge, contrôle et vérification. Les prestations se cochent sur la fiche, du tirage de câble au raccordement au tableau.", "Sur place, le technicien note ses relevés, prend des photos avant et après et fait signer le client sur l'écran. Le rapport part au client par e-mail, en PDF, directement depuis l'application."]],
      ["Votre matériel en stock, avec ses seuils.", ["Disjoncteurs, câbles, gaines, appareillage : suivez votre matériel avec un seuil d'alerte par référence. Quand une quantité passe sous son seuil, l'application le signale, et la commande suggérée prépare le bon de commande pour votre fournisseur.", "Vous saisissez vos propres références : aucun catalogue ne vous est imposé, et vous ne gardez que ce que vous utilisez vraiment."]],
      ["Devis, factures et encaissements.", ["Créez vos devis et vos factures, et envoyez-les en PDF par e-mail — ou leur résumé par SMS, depuis votre téléphone. Vous pouvez même dicter la prestation à la voix : l'assistant propose un devis que vous relisez avant de l'envoyer (une option activée pour votre entreprise).", "Suivez les factures à encaisser et celles qui sont payées ; avec la formule Business, l'encaissement de chaque technicien en fin de journée : carte, espèces, chèques. Une facture impayée se renvoie au client d'un bouton."]],
      ["Toute l'équipe, sur la même page.", ["Planning par technicien, tournées du jour avec l'ordre des visites optimisé, carte des interventions, pointage des heures : chaque électricien travaille sur son téléphone, et les changements arrivent chez les autres en quelques secondes dès qu'il y a du réseau.", "Chaque fiche client garde l'historique de ses interventions, de ses devis et de ses factures. Les données envoyées à notre serveur sont chiffrées (AES-256) et votre entreprise a son propre espace, séparé des autres."]]],
    formules: ["Les fiches d'intervention avec photos et signatures, les tournées du jour, les devis et les factures, les contrats et les récurrences, le pointage des heures.",
      "Tout Pro, plus le stock de matériel avec ses seuils d'alerte, les bons de commande et la commande suggérée, la télécollecte des encaissements et la comptabilité."] },
  'logiciel-chauffage-climatisation': { priorite: '0.8', icone: 'flame',
    titre: "Logiciel chauffage et climatisation : suivi | TEAM OP",
    desc: "Interventions, contrats d'entretien, stock et encaissements pour chauffagistes et frigoristes. Application mobile et web. " + DES_PRO,
    surtitre: 'Logiciel chauffage et climatisation', h1: "Le logiciel de gestion pour chauffagistes et climaticiens",
    chapeau: "Entretiens annuels, pompes à chaleur, climatisation, dépannages : un chauffagiste revoit ses clients année après année. OP GESTION, l'application de TEAM OP, garde tout : contrats d'entretien, historique par client, pièces, devis et encaissements.",
    duo: [["Au bureau", "Devis et factures, sans ressaisie.", "Ce qui est facturé, encaissé, à encaisser : tout est là.", 'iphone-factures', "OP GESTION sur un iPhone : les factures, ce qui est encaissé et ce qui reste à encaisser"],
      ["En fin de journée", "Chaque encaissement, à sa place.", "Avec la formule Business : ce qui était prévu, ce qui est encaissé, l'écart du jour.", 'iphone-compta', "OP GESTION sur un iPhone : le contrôle des encaissements du jour"]],
    blocs: [
      ["Des interventions réglées pour le chauffage et la climatisation.", ["En indiquant le chauffage et la climatisation dans votre demande d'accès, OP GESTION se règle sur votre métier dès l'ouverture de votre espace : entretien annuel de chaudière, pompe à chaleur, climatisation, dépannage, désembouage, ramonage, installation.", "Sur place, le technicien coche les prestations réalisées, note ses relevés, prend des photos avant et après et fait signer le client sur l'écran. Le rapport part au client par e-mail, en PDF, directement depuis l'application."]],
      ["Les contrats d'entretien, sans rien oublier.", ["Créez vos contrats d'entretien : le client, la fréquence (du mois à l'année), le montant et les dates. Un clic sur « Générer » planifie le passage suivant. Une intervention peut aussi porter sa propre récurrence : quand elle est terminée, la suivante est planifiée toute seule.", "Chaque fiche client garde l'historique complet de ses passages, de ses devis et de ses factures : d'une année sur l'autre, vous savez ce qui a été fait, et par qui."]],
      ["Les pièces en stock, avec leurs seuils.", ["Filtres, pièces détachées, consommables : suivez vos pièces avec un seuil d'alerte par référence. Quand une quantité passe sous son seuil, l'application le signale, et la commande suggérée prépare le bon de commande pour votre fournisseur. Vous saisissez vos propres références, à votre rythme."]],
      ["Devis, factures et encaissements.", ["Créez vos devis et vos factures, et envoyez-les en PDF par e-mail — ou leur résumé par SMS, depuis votre téléphone. Vous pouvez même dicter la prestation à la voix : l'assistant propose un devis que vous relisez avant de l'envoyer (une option activée pour votre entreprise).", "Suivez les factures à encaisser et celles qui sont payées ; avec la formule Business, l'encaissement de chaque technicien en fin de journée : carte, espèces, chèques."]],
      ["Toute l'équipe, sur la même page.", ["Planning par technicien, tournées du jour avec l'ordre des visites optimisé, carte des interventions, pointage des heures : chaque technicien travaille sur son téléphone, et les changements arrivent chez les autres en quelques secondes dès qu'il y a du réseau. Les données envoyées à notre serveur sont chiffrées (AES-256) et votre entreprise a son propre espace, séparé des autres."]]],
    formules: ["Les contrats d'entretien et les récurrences, les fiches d'intervention avec photos et signatures, les tournées du jour, les devis et les factures, le pointage des heures.",
      "Tout Pro, plus le stock de pièces avec ses seuils d'alerte, les bons de commande et la commande suggérée, la télécollecte des encaissements et la comptabilité."] },
  'logiciel-nettoyage': { priorite: '0.8', icone: 'spray',
    titre: "Logiciel pour entreprises de nettoyage | TEAM OP",
    desc: "Planning des agents, fiches d'intervention, relevés de surface et de temps, devis, factures et encaissements pour le nettoyage. " + DES_PRO,
    surtitre: 'Logiciel pour entreprises de nettoyage', h1: "Le logiciel de gestion pour les entreprises de nettoyage et de propreté",
    chapeau: "Bureaux, remise en état, vitrerie, parties communes : entre les contrats réguliers et les chantiers ponctuels, il faut planifier les agents, prouver le passage et facturer. OP GESTION, l'application de TEAM OP, réunit tout, sur téléphone comme sur ordinateur.",
    duo: [["Au bureau", "Devis et factures, sans ressaisie.", "Ce qui est facturé, encaissé, à encaisser : tout est là.", 'iphone-factures', "OP GESTION sur un iPhone : les factures, ce qui est encaissé et ce qui reste à encaisser"],
      ["En fin de journée", "Chaque encaissement, à sa place.", "Avec la formule Business : ce qui était prévu, ce qui est encaissé, l'écart du jour.", 'iphone-compta', "OP GESTION sur un iPhone : le contrôle des encaissements du jour"]],
    blocs: [
      ["Une fiche d'intervention prête pour le nettoyage.", ["En indiquant le nettoyage dans votre demande d'accès, OP GESTION se règle sur votre métier dès l'ouverture de votre espace : nettoyage de bureaux, remise en état, vitrerie, nettoyage de fin de chantier, nettoyage industriel, copropriété et parties communes, décapage et protection des sols, désinfection des locaux, contrat régulier, visite technique. Le réglage se change sur simple demande au support, sans toucher à vos clients ni à vos interventions.", "Sur place, l'agent coche les prestations réalisées (dépoussiérage, lavage des sols, sanitaires, vitres intérieures et extérieures, désinfection des points de contact, réapprovisionnement des consommables…), prend des photos avant et après et fait signer le client sur l'écran."]],
      ["Des relevés qui prouvent le passage.", ["La fiche note la surface traitée en mètres carrés, le nombre d'agents et le temps passé sur site. Quand l'application est ouverte et la localisation autorisée, le chronomètre démarre tout seul à moins de 200 mètres de l'adresse, et s'arrête quand l'agent s'éloigne.", "Le rapport part ensuite au client par e-mail, en PDF, avec les photos et la signature, directement depuis l'application."]],
      ["Les contrats réguliers et le planning des agents.", ["Pour un client que vous nettoyez chaque semaine, une récurrence posée sur l'intervention propose le passage suivant à sa clôture, en évitant les absences et les jours où le client ne souhaite pas de visite. Un contrat d'entretien génère l'intervention suivante d'un clic.", "Le planning montre chaque agent, jour par jour ou semaine par semaine, avec sa charge de la journée. Une intervention se glisse d'un agent à l'autre, et l'application signale un chevauchement ou une absence."]],
      ["Devis, factures et encaissements.", ["Créez vos devis et vos factures, et envoyez-les en PDF par e-mail — ou leur résumé par SMS, depuis votre téléphone. Vous pouvez même dicter la prestation à la voix : l'assistant propose un devis que vous relisez avant de l'envoyer (une option activée pour votre entreprise).", "Suivez les factures à encaisser et celles qui sont payées ; avec la formule Business, l'encaissement de chaque agent en fin de journée : carte, espèces, chèques. Une facture impayée se renvoie au client d'un bouton."]],
      ["Le pointage des agents, et les consommables en stock.", ["Chaque agent pointe son début et sa fin de journée depuis son téléphone ; une pause, entre une fin et une reprise, n'est pas comptée. Les journées de nuit sont comptées en entier, et le total de chacun se lit sur la période choisie.", "Produits d'entretien, sacs, papier : suivez vos consommables avec un seuil d'alerte par référence. Quand une quantité passe sous son seuil, l'application le signale, et la commande suggérée reprend tout ce qui manque pour préparer le bon de commande au fournisseur."]]],
    formules: ["Les fiches d'intervention avec photos et signatures, les tournées du jour, les contrats et les récurrences, les devis et les factures, le pointage des agents.",
      "Tout Pro, plus le stock de consommables avec ses seuils d'alerte, les bons de commande et la commande suggérée, la télécollecte des encaissements et la comptabilité."] },
};
/* ══ AVEC LES OPTIONS, LES PHRASES QUI DISAIENT « PRO N'A NI STOCK… » DEVIENNENT VRAIES (aperçu seulement) ═══════════════════════
   Sans option, le Pro n'ouvrait ni le stock, ni les achats, ni la télécollecte, ni le registre : les pages le disaient. Avec elles,
   « Pro n'a pas de stock » est FAUX (le Pro peut l'ajouter) et « avec la formule Business » aussi, pour la télécollecte (l'option
   Encaissements et compta l'ouvre). Chaque retouche ci-dessous remplace une phrase EXACTE du texte d'origine ; une phrase qui ne se
   trouve plus fait jeter le générateur (un texte d'origine réécrit ne doit pas laisser la retouche viser du vide). */
const SUBST_OPTIONS = [
  ['Avec la formule Business : ce qui était prévu, ce qui est encaissé, l\'écart du jour.', 'Avec Business, ou l\'option Encaissements et compta du Pro : ce qui était prévu, ce qui est encaissé, l\'écart du jour.'],
  ['avec la formule Business, l\'encaissement de chaque', 'avec Business, ou l\'option Encaissements et compta du Pro, l\'encaissement de chaque'],
  ['Avec la formule Business, la télécollecte rapproche', 'Avec Business, ou l\'option Encaissements et compta du Pro, la télécollecte rapproche'],
];
const optSeule = cle => `en option avec le Pro (+${euro(prixOpt(cle))} par utilisateur et par mois)`;
/* les retouches d'une page : de quoi remplacer (chapeau, description, cartes Pro et Business) ou compléter (un bloc) — une fonction,
   parce que les prix se lisent dans la table au moment de dire */
const PAGE_OPTIONS = {
  'logiciel-anti-nuisibles': () => ({
    formules: ['Les fiches d\'intervention avec photos et signatures, les plans d\'appâtage, le Certibiocide, les tournées du jour, les contrats et les récurrences, les devis et les factures. Le registre sanitaire, le catalogue de produits avec leur AMM et le dossier sanitaire s\'ajoutent avec l\'option Registre sanitaire (+' + euro(prixOpt('sanitaire')) + '), le stock et les box avec l\'option Stock (+' + euro(prixOpt('stock')) + ').'],
    ajouts: { 1: ' Le registre et le dossier sanitaire sont inclus dans Business, et ' + optSeule('sanitaire') + '.', 3: ' Le stock et les box sont inclus dans Business, et ' + optSeule('stock') + '.' } }),
  'logiciel-plombier': () => ({ pro: true, ajouts: { 1: ' Le stock est inclus dans Business, et ' + optSeule('stock') + '.' } }),
  'logiciel-electricien': () => ({ pro: true, ajouts: { 1: ' Le stock est inclus dans Business, et ' + optSeule('stock') + '.' } }),
  'logiciel-chauffage-climatisation': () => ({ pro: true, ajouts: { 2: ' Le stock est inclus dans Business, et ' + optSeule('stock') + '.' } }),
  'logiciel-nettoyage': () => ({ pro: true, ajouts: { 4: ' Le stock est inclus dans Business, et ' + optSeule('stock') + '.' } }),
  'logiciel-gestion-de-stock': () => ({
    desc: 'Votre stock produit par produit : arrivages, sorties tracées, seuils d\'alerte et commande suggérée. Option du Pro, inclus dans Business.',
    chapeau: 'Combien il en reste, qui a pris quoi, et quoi commander : OP GESTION, l\'application de TEAM OP, suit votre stock sur téléphone comme sur ordinateur, et trace chaque mouvement. Le stock est ' + optSeule('stock') + ', et inclus dans la formule Business.',
    formules: ['Pas de stock dans Pro seul : le planning, les fiches d\'intervention, les devis et les factures, les contrats, la carte des interventions et le pointage. Le stock s\'y ajoute avec l\'option Stock (+' + euro(prixOpt('stock')) + ').'] }),
  'logiciel-bons-de-commande': () => ({
    desc: 'Préparez vos bons de commande, envoyez-les en PDF au fournisseur, réceptionnez la livraison, photo du bon à l\'appui. Option du Pro, inclus dans Business.',
    chapeau: 'Ce qu\'il faut commander, à qui, et ce qui est arrivé : OP GESTION, l\'application de TEAM OP, relie vos commandes fournisseurs à votre stock. Les bons de commande sont ' + optSeule('achats') + ', et inclus dans la formule Business.',
    formules: ['Pas de bons de commande dans Pro seul : le planning, les fiches d\'intervention, les devis et les factures, les contrats, la carte des interventions et le pointage. Ils s\'ajoutent avec l\'option Achats fournisseurs (+' + euro(prixOpt('achats')) + ') ; avec l\'option Stock en plus, la commande suggérée se prépare depuis vos seuils et la réception entre en stock.'] }),
  'logiciel-registre-sanitaire': () => ({
    chapeau: 'Pour une entreprise de dératisation, désinsectisation et désinfection, le registre est incontournable. OP GESTION, l\'application de TEAM OP, le remplit à partir des interventions elles-mêmes. Le registre est ' + optSeule('sanitaire') + ', pour le métier 3D, et inclus dans la formule Business.',
    formules: ['Pas d\'écran Registre dans Pro seul : il s\'ajoute avec l\'option Registre sanitaire (métier 3D), qui apporte aussi le dossier sanitaire et le catalogue de produits avec leur AMM. Le Pro garde les fiches d\'intervention, les plans d\'appâtage, le Certibiocide, les devis, les factures et les contrats.'],
    ajouts: { 3: ' Le dossier sanitaire fait partie de l\'option Registre sanitaire du Pro, et de la formule Business.', 4: ' Les box font partie de l\'option Stock du Pro, et de la formule Business.' } }),
};
const PRO_NON_3D = () => ' Le stock, les bons de commande et la comptabilité s\'ajoutent au Pro en option, dès ' + euro(PRIX_OPT_MIN) + ' par utilisateur et par mois.';
const sub = t => SUBST_OPTIONS.reduce((x, [de, vers]) => x.split(de).join(vers), t);
/* la description d'une page, avec ou sans les options — un accesseur de PAGES : l'état change d'une génération à l'autre */
const descDe = (k, d) => AVEC_OPTIONS && PAGE_OPTIONS[k] && PAGE_OPTIONS[k]().desc || d;
function retouche(m, k) {
  if (!AVEC_OPTIONS) return m;
  const o = PAGE_OPTIONS[k] ? PAGE_OPTIONS[k]() : {};
  const remplace = o.formules || [];
  const formules = remplace.concat(m.formules.slice(remplace.length)).map((f, i) => (i === 0 && o.pro ? f + PRO_NON_3D() : f));
  const blocs = m.blocs.map(([h, ps], i) => [h, ps.map((t, j) => sub(t) + (o.ajouts && o.ajouts[i] !== undefined && j === ps.length - 1 ? o.ajouts[i] : ''))]);
  return Object.assign({}, m, { chapeau: sub(o.chapeau || m.chapeau), formules: formules.map(sub), blocs,
    duo: m.duo.map(d => [d[0], d[1], sub(d[2]), d[3], d[4]]) });
}

function pageMetier(m0, k) {
  const m = retouche(m0, k);
  const duo = `<section class="duo">` + m.duo.map(([pt, h3, p, nom, alt]) => `<div class="grande-carte"><div class="haut"><div class="petit-titre">${fr(pt)}</div><h3>${fr(h3)}</h3><p>${fr(p)}</p></div>
          <div class="bas"><div class="rogne-tel" style="--ap-l:clamp(230px,22vw,330px)">${iphone(nom, alt)}</div></div></div>`).join('') + '</section>';
  const bloc = ([h2, ps], i) => `<section class="bloc${i % 2 ? ' teinte' : ''}"><div class="bloc-in texte-metier"><h2 class="h2 moyen">${fr(h2)}</h2>` + ps.map(t => `<p>${fr(t)}</p>`).join('') + '</div></section>';
  const f = [['Pro', prixDe('pro') + ' € TTC par mois et par utilisateur', m.formules[0]], ['Business', prixDe('business') + ' € TTC par mois et par utilisateur', m.formules[1]],
    ['Business Premium', prixDe('premium') + ' € TTC par mois et par utilisateur', m.formules[2] || PREMIUM_METIER]];
  const formules = `<section class="bloc${m.blocs.length % 2 ? ' teinte' : ''}" id="formules"><div class="bloc-in texte-metier"><h2 class="h2 moyen">${fr('Quelle formule choisir ?')}</h2>`
    + `<p>${fr('Sans engagement : choisissez la formule qui vous convient, et changez-en quand votre équipe grandit. Un abonnement par utilisateur.')}</p><div style="height:22px"></div>`
    + '<div class="cartes-3">' + f.map(([n, pr, t]) => `<div class="carte-v"><b>${fr(n)}</b><span class="prix-metier">${fr(pr)}</span><span class="t">${fr(t)}</span></div>`).join('') + '</div>'
    + `<div class="actions" style="margin-top:28px"><a class="bouton" href="${ESPACE()}">Créer mon compte</a><a class="lien-suite" href="tarifs.html">Voir les tarifs ›</a></div></div></section>`;
  return scene(m.surtitre, m.h1, m.chapeau, `<a class="bouton" href="${ESPACE()}">Créer mon compte</a><a class="lien-suite" href="tarifs.html">Voir les tarifs ›</a>`)
    + (m.mac ? `<section class="scene-mac">${mac(m.mac[0], m.mac[1], { tot: false })}</section>` : '')
    + bloc(m.blocs[0], 0) + duo + m.blocs.slice(1).map((b, i) => bloc(b, i + 1)).join('') + formules;
}

/* ══ LES PAGES PAR FONCTION — une page, une adresse, un mot-clé (Justin, 29 septembre 2026 au soir : « une page par
   fonction (stock, planning, devis et factures, bons de commande, pointage, registre), plus une page nettoyage »).
   Même gabarit et mêmes règles que les pages métier (pageMetier) : un seul H1, 400 mots au moins, titre ≤ 60, description
   ≤ 155, un lien vers les tarifs et vers l'inscription.
   ⛔ CHAQUE PHRASE A ÉTÉ RELUE DANS app.html (v763 en service, le même soir), et chaque fonction est dite avec la formule qui
   l'ouvre (PLAN_BLOQUE) : Gratuit ferme le pointage, les devis, les factures, les contrats, la carte, les secteurs, les
   absences et les tâches ; Pro ferme en plus le stock, les box, les bons de commande, le registre, la télécollecte et la
   comptabilité. Ce qui a été vérifié, et où :
   · planning : vues Jour, Semaine, Mois, plusieurs jours avec la carte (planMode) ; jauge de charge rapportée à la capacité
     du technicien (techCap, 7 h par défaut) : orange au-delà de 75 %, rouge à 100 % (planGauge) — les seuils 7 h / 9 h ne
     sont que ceux du voyant moyen des fenêtres « Multi », la page les donnait à tort (relecture du 29 septembre) ; glisser-déposer (planDragStart) ; chevauchement signalé (intConflictOf) ; technicien absent
     signalé ; affectation au technicien du secteur (techForClient) ; ordre proposé des étapes (planOptBarre) et trajets
     par la route (OSRM) ; chronomètre à moins de 200 m ; passage suivant proposé en évitant absences, conflits et jours
     refusés, « À planifier » sous 14 jours (planNextModal) ;
   · stock : le stockage (stockageCarte, case « Se servir dans le stockage », administrateur seul au départ), les box du
     métier 3D, arrivage avec photo du bon, lecture d'étiquette, sortie « pour qui », bon de remise, seuils, commande
     suggérée (le plus grand des deux besoins), validation d'un responsable (boxMvtValider), une intervention ne retire rien ;
   · devis et factures : PDF à l'en-tête de la société (docEntete), envoi par e-mail PDF joint (envoiDoc), dictée en option,
     devis accepté → facture (devisToFacture), facture préremplie depuis l'intervention, numéro jamais réutilisé (numMax),
     relance d'une facture envoyée (📧), télécollecte, export CSV, TVA collectée dans la comptabilité ;
   · bons de commande : PDF (bonPdfStr) joint à l'e-mail (opts.atts), adresse d'envoi au choix, bon dupliqué, commande
     suggérée, demande validée par un responsable puis « bon à préparer » (formDemande), arrivage prérempli et converti
     (arrBonPrefill), bon « livré » ou « partiel » (saveArrivage) ;
   · pointage : « Début de journée » / « Fin de journée » ; une pause = une fin puis une reprise, l'écart n'est pas compté
     (le champ « Pause » n'existe que dans la correction d'un responsable) ; horodatage qui compte les nuits sur l'écran
     Pointage (ptSecs — les totaux des Archives et de la fiche technicien lisent encore HH:MM, voir REPRISE) ; plafond de
     16 h signalé (PT_MAX_H), correction réservée aux responsables, total par personne, export PDF (ptPdf) ; absences avec
     leurs motifs, la durée légale préremplie pour les événements familiaux (ABS_INFO, j > 0) et rappelée pour les autres ;
   · registre : les phrases de la page anti-nuisibles, déjà relues, et l'unité de ligne (prodLineUnit) ;
   · nettoyage : le métier « Nettoyage / Propreté » de l'application (types, prestations, relevés surface / agents /
     temps) — ni box ni registre, que ce métier masque. */
const FONCTIONS = {
  'logiciel-planning-interventions': { priorite: '0.8',
    titre: "Logiciel de planning des interventions | TEAM OP",
    desc: "Planning de vos techniciens en vues jour, semaine et mois, tournées optimisées, absences et chevauchements signalés. " + DES_PRO,
    surtitre: 'Planning des interventions', h1: "Le planning des interventions de toute votre équipe, au même endroit",
    chapeau: "Qui intervient où, à quelle heure, et avec quelle charge de travail : OP GESTION, l'application de TEAM OP, tient le planning de vos techniciens sur ordinateur comme sur téléphone. Chacun voit sa journée, le bureau voit tout.",
    mac: ['mac-planning', "OP GESTION sur un Mac : la semaine d'une entreprise de démonstration, technicien par technicien"],
    duo: [["Pour le technicien", "Sa journée, dans la poche.", "Les interventions du jour, dans l'ordre, avec l'adresse et le statut.", 'iphone-journee', "OP GESTION sur un iPhone : la journée de travail d'un technicien"],
      ["Pour le bureau", "L'activité d'un coup d'œil.", "Les interventions en cours ; le reste se choisit carte par carte.", 'iphone-tableau', "OP GESTION sur un iPhone : le tableau de bord"]],
    blocs: [
      ["Jour, semaine, mois : le planning qu'il vous faut.", ["La vue Jour place vos techniciens côte à côte, heure par heure. La vue Semaine montre la semaine entière, la vue Mois pose chaque intervention sur un calendrier, et une quatrième vue réunit plusieurs jours avec la carte des adresses.", "Chaque technicien a sa couleur, et une jauge montre sa charge de la journée par rapport à sa capacité (sept heures au départ, réglable sur sa fiche) : orange aux trois quarts, rouge quand la journée est pleine. Vous voyez tout de suite qui est déjà bien chargé et qui peut encore prendre un dépannage."]],
      ["Déplacer une intervention d'un geste.", ["Sur ordinateur, une intervention se glisse vers un autre jour ou un autre technicien. Si le nouveau créneau chevauche une autre intervention du même technicien, l'application le signale ; si le technicien est absent ce jour-là, elle le dit avant d'enregistrer.", "Les interventions qui n'ont pas encore de date attendent dans « À planifier ». Et une intervention créée sans technicien est confiée à celui qui couvre le département du client, dès que vous avez défini vos secteurs."]],
      ["Les tournées du jour, dans le bon ordre.", ["Pour une journée, l'application propose l'ordre des étapes qui raccourcit la route, avec le temps de trajet par la route entre deux adresses, et dessine la tournée sur la carte. Vous validez l'ordre proposé, ou vous gardez le vôtre.", "Sur place, application ouverte et localisation autorisée, le chronomètre démarre tout seul quand le technicien arrive à moins de 200 mètres de l'adresse, et s'arrête quand il s'éloigne : le temps passé chez chaque client se retrouve sur la fiche, sans rien noter à la main."]],
      ["Les passages suivants, sans rien oublier.", ["Une intervention peut porter une récurrence. À sa clôture, l'application propose le passage suivant à la bonne date, en évitant les absences, les autres interventions du technicien et les jours où le client ne souhaite pas de visite. Sans créneau libre dans les quatorze jours, la carte part dans « À planifier ».", "Les contrats d'entretien, eux, génèrent l'intervention suivante d'un clic, avec le client, l'adresse et la prestation déjà remplis."]],
      ["Pour toute l'équipe, sur tous les appareils.", ["Chaque technicien ouvre sa journée sur son téléphone, iPhone ou Android ; le bureau travaille sur Mac ou sur PC. Les changements arrivent chez les autres en quelques secondes dès qu'il y a du réseau, et une nouvelle intervention prévient l'équipe par une notification.", "Chacun ne voit que ce qui le concerne : un technicien voit ses interventions, un responsable celles de son équipe, l'administrateur tout le planning. Les droits se règlent personne par personne."]]],
    formules: ["Le planning en vues Jour, Semaine et Mois, les tournées et la carte des interventions, les secteurs par département, les absences et les congés, les tâches et le pointage des heures.",
      "Tout Pro, plus le stock, les bons de commande aux fournisseurs, la télécollecte des encaissements et la comptabilité."] },
  'logiciel-gestion-de-stock': { priorite: '0.8',
    titre: "Logiciel de gestion de stock pour le terrain | TEAM OP",
    desc: "Votre stock produit par produit : arrivages, sorties tracées, seuils d'alerte et commande suggérée, sur téléphone et ordinateur. Inclus dans Business.",
    surtitre: 'Gestion de stock', h1: "Un stock à jour, produit par produit, du dépôt jusqu'au technicien",
    chapeau: "Combien il en reste, qui a pris quoi, et quoi commander : OP GESTION, l'application de TEAM OP, suit votre stock sur téléphone comme sur ordinateur, et trace chaque mouvement. Le stock est inclus dans la formule Business.",
    duo: [["Au dépôt", "Chaque mouvement, tracé.", "Arrivage, sortie, correction : qui, quoi, pour qui.", 'iphone-box', "OP GESTION sur un iPhone : la fiche d'un point de stock et ses gestes"],
      ["Au bureau", "Ce qui manque, signalé.", "La cloche prévient quand un produit passe sous son seuil.", 'iphone-tableau', "OP GESTION sur un iPhone : le tableau de bord"]],
    blocs: [
      ["Un stock central, et autant de points de stock qu'il vous faut.", ["Le stockage, c'est votre stock central, hors de toute box : les arrivages y entrent, et ceux à qui vous en donnez l'accès s'y servent. L'accès se donne personne par personne, par une case de ses droits ; au départ, seul l'administrateur l'a.", "Les entreprises anti-nuisibles (3D) y ajoutent des box : une box est un point de stock, un local, une réserve ou une armoire, chez vous ou chez un client. L'écran Stock additionne le stockage et toutes les box que vous voyez, pour un seul total par produit."]],
      ["Arrivages, sorties, corrections : tout est tracé.", ["À la livraison, l'arrivage enregistre les quantités reçues et la photo du bon de livraison. Pour retrouver un produit, la caméra du téléphone lit son étiquette. Chaque sortie dit pour qui elle est faite, et un bon de remise peut accompagner ce qui est donné.", "Rien ne bouge sans laisser de trace : le journal des mouvements garde, produit par produit, qui a fait quoi, quand et pour qui. Une quantité ne descend jamais sous zéro, et la trace dit ce qui a vraiment bougé, pas ce qui avait été demandé."]],
      ["Des seuils d'alerte, et une commande qui se prépare seule.", ["Donnez un seuil à chaque produit : quand le total passe dessous, l'application le signale dans la cloche, et la commande suggérée le reprend.", "La commande suggérée reprend tout ce qui est à réapprovisionner, les produits sous leur seuil comme les points de stock épuisés, sans jamais compter deux fois le même besoin. Elle prépare un bon de commande que vous relisez avant de l'envoyer au fournisseur."]],
      ["Une validation quand vous le décidez.", ["Vous pouvez exiger qu'un responsable valide les mouvements avant qu'ils ne comptent, pour certaines personnes ou pour toute l'entreprise : la demande part chez lui, il accepte, corrige la quantité ou refuse avec un motif, et la personne est prévenue de sa décision.", "Les interventions ne retirent rien du stock d'elles-mêmes : les produits utilisés sont notés sur la fiche, pour le rapport et la facture, et le stock ne bouge que lorsqu'un produit sort vraiment. Le chiffre affiché reste celui de l'étagère."]],
      ["Pour toute l'équipe, sur tous les appareils.", ["Le technicien fait ses gestes depuis son téléphone, le responsable suit depuis son ordinateur, et chacun voit les mêmes chiffres en quelques secondes dès qu'il y a du réseau.", "Chaque personne ne voit que les points de stock qui la concernent, et chaque geste, ajouter, sortir, corriger ou valider, dépend d'une case de ses droits."]]],
    formules: ["Pas de stock dans Pro : le planning, les fiches d'intervention, les devis et les factures, les contrats, la carte des interventions et le pointage.",
      "Le stock complet : le stockage et, pour le métier 3D, les box ; arrivages, seuils d'alerte, mouvements tracés, commande suggérée et bons de commande aux fournisseurs."] },
  'logiciel-devis-factures': { priorite: '0.8',
    titre: "Logiciel de devis et factures pour artisans | TEAM OP",
    desc: "Devis et factures en PDF à votre en-tête, envoyés par e-mail, du devis accepté à la facture en un clic, suivi payé ou impayé. Inclus dès la formule Pro.",
    surtitre: 'Devis et factures', h1: "Vos devis et vos factures, faits sur place et envoyés à votre nom",
    chapeau: "Du devis au règlement, OP GESTION, l'application de TEAM OP, garde le fil sur téléphone comme sur ordinateur. Les devis, les factures et les contrats d'entretien sont inclus dès la formule Pro.",
    duo: [["Au bureau", "Ce qui est facturé, et ce qui reste.", "Facturé, encaissé, à encaisser : tout est là.", 'iphone-factures', "OP GESTION sur un iPhone : les factures, ce qui est encaissé et ce qui reste à encaisser"],
      ["En fin de journée", "Chaque encaissement, à sa place.", "Avec la formule Business : ce qui était prévu, ce qui est encaissé, l'écart du jour.", 'iphone-compta', "OP GESTION sur un iPhone : le contrôle des encaissements du jour"]],
    blocs: [
      ["Un devis propre, en quelques minutes.", ["Composez le devis ligne par ligne, avec les quantités, les prix et la TVA : l'application calcule les totaux et produit un vrai PDF à l'en-tête de votre société, avec votre logo et vos coordonnées. Il part par e-mail, le PDF joint, depuis la fiche.", "Vous pouvez aussi dicter la prestation à la voix : l'assistant propose un devis que vous relisez et corrigez avant de l'envoyer. C'est une option, activée pour votre entreprise, et la dictée dépend du navigateur."]],
      ["Du devis accepté à la facture, sans ressaisie.", ["Quand le client accepte, le devis devient une facture d'un clic, avec les mêmes lignes. Une intervention peut aussi donner sa facture : la prestation, les produits et le montant de la fiche la préremplissent.", "Chaque devis et chaque facture reçoit un numéro qui ne sera jamais réutilisé, même après une suppression. Si deux appareils émettent le même numéro avant de s'être synchronisés, l'application le signale dans la liste."]],
      ["Plusieurs sociétés ? Chaque document porte la bonne.", ["Si votre groupe réunit plusieurs sociétés, chacune a son nom, son logo, sa couleur et, quand c'est une entreprise distincte, ses propres coordonnées légales : SIRET, TVA, IBAN. Un devis, une facture ou un rapport porte l'en-tête de la société choisie, sans rien emprunter aux autres.", "Les mentions de votre entreprise, SIRET, numéro de TVA intracommunautaire, IBAN et BIC pour le virement, se règlent une fois pour toutes dans les paramètres."]],
      ["Payé, à encaisser : vous savez où vous en êtes.", ["Chaque facture a son statut, et la liste montre ce qui est encaissé et ce qui reste à encaisser. Une facture envoyée et toujours impayée se renvoie au client d'un bouton.", "Avec la formule Business, la télécollecte rapproche en fin de journée ce que chaque technicien a encaissé, carte, espèces, chèque ou virement, de ce qui était prévu. La comptabilité donne la TVA collectée et s'exporte en CSV, qui s'ouvre dans Excel."]],
      ["Les contrats d'entretien, sans rien ressaisir.", ["Un contrat d'entretien garde le client, la prestation et la période. L'intervention suivante se génère d'un clic, déjà remplie.", "Pour les interventions qui reviennent, une récurrence posée sur l'intervention propose le passage suivant à sa clôture, à la bonne date."]]],
    formules: ["Les devis et les factures en PDF à votre en-tête, envoyés par e-mail, avec le suivi de ce qui est payé et de ce qui reste ; les contrats d'entretien.",
      "Tout Pro, plus la télécollecte des encaissements, la comptabilité et son export, le stock et les bons de commande aux fournisseurs."] },
  'logiciel-bons-de-commande': { priorite: '0.7',
    titre: "Bons de commande fournisseurs en ligne | TEAM OP",
    desc: "Préparez vos bons de commande, envoyez-les en PDF par e-mail au fournisseur et réceptionnez la livraison, photo du bon à l'appui. Inclus dans Business.",
    surtitre: 'Bons de commande', h1: "Des bons de commande préparés, envoyés et réceptionnés au même endroit",
    chapeau: "Ce qu'il faut commander, à qui, et ce qui est arrivé : OP GESTION, l'application de TEAM OP, relie vos commandes fournisseurs à votre stock. Les bons de commande sont inclus dans la formule Business.",
    duo: [["Au bureau", "Ce qui attend.", "Les bons à envoyer, et les demandes de l'équipe dès qu'il y en a.", 'iphone-tableau', "OP GESTION sur un iPhone : le tableau de bord"],
      ["À la livraison", "L'arrivage, photo du bon comprise.", "Les quantités reçues entrent en stock, la photo reste.", 'iphone-box', "OP GESTION sur un iPhone : la fiche d'un point de stock et ses gestes"]],
    blocs: [
      ["Un bon de commande propre, en quelques gestes.", ["Choisissez le fournisseur, ajoutez les produits et les quantités : l'application produit un PDF à l'en-tête de votre entreprise, avec vos coordonnées. Un bon déjà passé se duplique pour recommander la même chose.", "Le bon part par e-mail au fournisseur, le PDF joint, depuis l'adresse de votre choix quand vous avez relié vos boîtes mail. La boîte mail intégrée, rattachée aux bons, garde vos échanges avec les fournisseurs."]],
      ["La commande suggérée fait la liste pour vous.", ["Un geste sur « Commande suggérée » prépare un bon avec tout ce qui est à réapprovisionner : les produits passés sous leur seuil d'alerte et les points de stock épuisés, en retenant le plus grand des deux besoins pour ne jamais commander deux fois la même chose.", "Vous relisez, vous ajustez les quantités, et le bon est prêt à partir."]],
      ["Les demandes de l'équipe, validées par un responsable.", ["Sur le terrain, un chef d'équipe demande une commande pour son point de stock : sa box, pour le métier 3D, ou le stockage s'il y a accès. La demande part chez le responsable désigné, qui la valide ou la refuse. Validée, elle devient un bon à préparer, et la personne chargée des commandes est prévenue.", "Chacun sait où en est sa demande : une notification dit quand elle est validée, ou refusée."]],
      ["La réception, photo du bon de livraison à l'appui.", ["À la livraison, l'arrivage reprend la commande : les quantités sont préremplies, converties dans l'unité de votre stock, et vous corrigez ce qui manque. La photo du bon de livraison reste attachée à l'arrivage.", "Les quantités reçues entrent en stock aussitôt, le bon passe en « livré », ou en « partiel » s'il manque quelque chose, et le journal des mouvements garde la trace de la réception."]],
      ["Qui peut commander, c'est vous qui le décidez.", ["Le droit de passer commande se règle personne par personne : un compte peut préparer et envoyer des bons, un autre seulement les consulter. Les responsables désignés valident les demandes de leur équipe.", "Tout se fait sur téléphone comme sur ordinateur, et les changements arrivent chez les autres en quelques secondes dès qu'il y a du réseau."]]],
    formules: ["Pas de bons de commande dans Pro : le planning, les fiches d'intervention, les devis et les factures, les contrats, la carte des interventions et le pointage.",
      "Les bons de commande en PDF envoyés par e-mail, la commande suggérée, les demandes validées, l'arrivage et le stock, avec la boîte mail intégrée."] },
  'logiciel-pointage': { priorite: '0.7',
    titre: "Logiciel de pointage des heures d'équipe | TEAM OP",
    desc: "Début et fin de journée pointés depuis le téléphone, pauses, journées de nuit, corrections par un responsable et feuille en PDF. Inclus dès la formule Pro.",
    surtitre: 'Pointage des heures', h1: "Le pointage des heures de votre équipe, depuis le téléphone",
    chapeau: "Qui a commencé à quelle heure, combien d'heures sur la période, et qui a oublié de dépointer : OP GESTION, l'application de TEAM OP, tient le pointage de vos techniciens. Le pointage est inclus dès la formule Pro.",
    duo: [["Pour le technicien", "Un geste le matin, un le soir.", "Le début et la fin de journée, pris à l'heure exacte.", 'iphone-journee', "OP GESTION sur un iPhone : la journée de travail d'un technicien"],
      ["Pour le responsable", "L'activité d'un coup d'œil.", "Les interventions en cours ; le reste se choisit carte par carte.", 'iphone-tableau', "OP GESTION sur un iPhone : le tableau de bord"]],
    blocs: [
      ["Un geste le matin, un geste le soir.", ["Le technicien touche « Début de journée » en arrivant et « Fin de journée » en partant : l'heure est prise par l'application, pas tapée à la main. Pour une pause, il termine sa journée puis la reprend : l'écart s'affiche et n'est pas compté.", "Une journée qui passe minuit est comptée en entier : chaque pointage garde la date et l'heure exactes de son début et de sa fin, et l'écran Pointage additionne les heures de nuit comme les autres."]],
      ["Un oubli ne gonfle pas les heures.", ["Un pointage resté ouvert ne devient pas une journée interminable : au-delà de seize heures, l'application le plafonne et le signale, et il se clôture à l'heure qu'on indique, pas à l'heure qu'il est.", "Corriger des heures est réservé aux responsables. Une correction réécrit ensemble l'heure affichée et l'heure comptée : ce que vous lisez à l'écran est toujours ce qui est compté."]],
      ["Le total de chacun, sur la période choisie.", ["La vue par personne additionne les heures de chacun sur la période que vous choisissez, pauses déduites, avec le total de la période. Un responsable voit son équipe, l'administrateur toute l'entreprise, et chaque technicien ses propres pointages.", "La feuille de pointage s'exporte en PDF, pour la période affichée à l'écran : ce que vous voyez est ce que vous exportez."]],
      ["Absences et congés, avec leurs durées légales.", ["Les absences se posent avec leur motif : congés payés, RTT, arrêt maladie, accident du travail, événements familiaux, formation, rendez-vous médical… Pour les événements familiaux (mariage, naissance, décès d'un proche…), la durée prévue par la loi est proposée ; pour les autres motifs, elle est rappelée à côté des dates.", "Une intervention posée sur un technicien absent ce jour-là est signalée, et la proposition du passage suivant évite ses jours d'absence."]],
      ["Pour toute l'équipe, sur tous les appareils.", ["Le pointage se fait sur le téléphone du technicien, iPhone ou Android ; le responsable suit depuis son ordinateur, Mac ou PC. Les pointages arrivent chez les autres en quelques secondes dès qu'il y a du réseau.", "Le pointage vit à côté du planning et des interventions : la journée prévue et la journée pointée se lisent dans la même application."]]],
    formules: ["Le pointage des heures, les absences et les congés, les tâches, et de quoi facturer : devis, factures et contrats d'entretien.",
      "Tout Pro, plus le stock, les bons de commande aux fournisseurs, la télécollecte des encaissements et la comptabilité."] },
  'logiciel-registre-sanitaire': { priorite: '0.8',
    titre: "Registre sanitaire et suivi des biocides | TEAM OP",
    desc: "Registre sanitaire tenu à chaque passage : biocides et leur AMM, Certibiocide des techniciens, plans d'appâtage et relevés de postes. Pour le métier 3D.",
    surtitre: 'Registre sanitaire (3D)', h1: "Le registre sanitaire de vos clients, tenu à chaque passage",
    chapeau: "Pour une entreprise de dératisation, désinsectisation et désinfection, le registre n'est pas une option. OP GESTION, l'application de TEAM OP, le remplit à partir des interventions elles-mêmes. Le registre est inclus dans la formule Business, pour le métier 3D.",
    duo: [["Sur le terrain", "La fiche d'intervention, dans la poche.", "Produits, quantités, photos et signature : tout est sur la fiche.", 'iphone-intervention', "OP GESTION sur un iPhone : une intervention de dératisation en cours"],
      ["Au bureau", "Les rapports, rédigés et envoyés.", "Chaque passage terminé a son rapport, prêt pour le client.", 'iphone-rapports', "OP GESTION sur un iPhone : les comptes rendus d'intervention"]],
    blocs: [
      ["Chaque passage alimente le registre.", ["Le technicien note sur la fiche d'intervention les produits biocides utilisés et leurs quantités : chaque passage et chaque produit s'inscrivent au registre sanitaire du client, avec le numéro d'AMM du produit.", "Chaque quantité garde l'unité de sa ligne : 250 mL d'un produit stocké au litre restent 250 mL dans le registre, sans erreur d'un facteur mille."]],
      ["Le Certibiocide de chaque technicien, suivi.", ["Le numéro et la date de validité du Certibiocide de chaque technicien sont enregistrés sur sa fiche, et un badge le signale 60 jours avant l'échéance, dans la liste des techniciens et sur la fiche.", "Vous savez à tout moment qui peut appliquer quoi, et vous n'apprenez pas l'échéance le jour d'un contrôle."]],
      ["Plans d'appâtage et relevés des postes.", ["Pour chaque site, dessinez le plan d'appâtage sur une photo, une vue satellite ou le plan des pièces, avec vos postes numérotés, leur type et le produit posé. À chaque passage, le technicien relève chaque poste : rien à signaler, consommation partielle, consommé ou remplacé.", "L'évolution de l'infestation sur les derniers passages se lit d'un coup d'œil, et une fiche de traitement est prévue pour chaque nuisible : rats, souris, blattes, punaises de lit, guêpes et frelons…"]],
      ["Le dossier sanitaire, prêt pour un contrôle.", ["Pour un client professionnel, le dossier sanitaire complet, plan de lutte, relevés, produits, attestation de passage, s'imprime ou s'enregistre en PDF en un clic.", "Le rapport de chaque passage part au client par e-mail, en PDF, avec les photos, le plan et les signatures."]],
      ["Le stock des produits, à côté du registre.", ["Les produits biocides se suivent dans vos box, des points de stock, locaux, réserves ou armoires : chaque arrivage et chaque sortie sont tracés, qui, quoi, pour qui.", "Les produits utilisés en intervention sont notés sur la fiche sans fausser le stock : il ne baisse que quand un produit sort vraiment d'une box."]]],
    formules: ["Pas d'écran Registre dans Pro, mais pour le métier 3D les biocides et leur AMM sur chaque fiche, les plans d'appâtage, le Certibiocide et le dossier sanitaire ; plus les devis, les factures et les contrats.",
      "L'écran Registre sanitaire, qui réunit les passages et les produits appliqués, le stock et les box, les bons de commande aux fournisseurs."] },
};

/* un texte d'origine réécrit ne doit pas laisser une retouche viser du vide : on le vérifie ICI, au chargement, sur tout le texte */
{
  const tout = JSON.stringify([METIERS, FONCTIONS]);
  for (const [de] of SUBST_OPTIONS) if (!tout.includes(JSON.stringify(de).slice(1, -1))) throw new Error('retouche des options : la phrase « ' + de + ' » n\'est plus dans les pages métier ni fonction');
  for (const [k, f] of Object.entries(PAGE_OPTIONS)) {
    const m = METIERS[k] || FONCTIONS[k], o = f();
    if (!m) throw new Error('retouche des options : la page « ' + k + ' » n\'existe pas');
    for (const i of Object.keys(o.ajouts || {})) if (!m.blocs[i]) throw new Error('retouche des options : « ' + k + ' » n\'a pas de bloc ' + i);
  }
}

const PAGES = {
  index: { titre: 'TEAM OP — Logiciel de gestion pour entreprises de terrain', desc: 'Logiciel français pour entreprises de terrain : interventions, planning, stock, devis et factures. Anti-nuisibles, artisans. ' + DES_PRO,
    ogDesc: 'Interventions, stock, registre sanitaire, encaissements et équipe, sur mobile, tablette et ordinateur.',
    corps: () => `<section class="accueil"><p class="surtitre">TEAM OP</p><h1>Toutes vos applications métier. Au même endroit.</h1>
      <p class="chapeau">${fr('Interventions, stock, encaissements et communication d\'équipe — sur iPhone, Android, Mac et PC, à jour en quelques secondes.')}</p>
      <div class="actions"><a class="bouton" href="${ESPACE()}">Créer mon compte</a><a class="lien-suite" href="applications.html">Découvrir les applications ›</a></div>
      <div class="gages"><span>Chiffré AES-256</span><span>Sur tous vos appareils</span><span>Sans installation</span></div>
      <div class="appareils"><div class="ap-duo">${mac('mac-tableau', 'OP GESTION sur un Mac : le tableau de bord d\'une entreprise de démonstration', { tot: true })}${iphone('iphone-tableau', 'OP GESTION sur un iPhone : le tableau de bord', { tot: true })}</div></div></section>
      <div class="plateformes"><span>Mac · Windows</span><span>iPhone · Android</span><span>Navigateur</span></div>
      <section class="duo">
        <div class="grande-carte"><div class="haut"><div class="petit-titre">Sur le terrain</div><h3>${fr('La fiche d\'intervention, dans la poche.')}</h3><p>${fr('Client, adresse, produits, photos et signature : tout est sur la fiche.')}</p></div>
          <div class="bas"><div class="rogne-tel" style="--ap-l:clamp(230px,22vw,330px)">${iphone('iphone-intervention', 'OP GESTION sur un iPhone : une fiche d\'intervention en cours')}</div></div></div>
        <div class="grande-carte"><div class="haut"><div class="petit-titre">Au dépôt</div><h3>Le stock, à jour.</h3><p>${fr(AVEC_OPTIONS ? 'Avec Business, ou l\'option Stock du Pro : arrivage, sortie, relevé — chaque mouvement est tracé et met le stock à jour.' : 'Avec la formule Business : arrivage, sortie, relevé — chaque mouvement est tracé et met le stock à jour.')}</p></div>
          <div class="bas"><div class="rogne-tel" style="--ap-l:clamp(230px,22vw,330px)">${iphone('iphone-box', 'OP GESTION sur un iPhone : la fiche d\'une box et ses gestes')}</div></div></div>
      </section>
      <section class="page" style="padding-top:90px;padding-bottom:40px"><h2 class="h2">${fr('Tout TEAM OP, en un coup d\'œil.')}</h2><div class="teasers">`
      + [['tool', 'Adapté à votre métier', 'Anti-nuisibles, plomberie, électricité, chauffage… TEAM OP se règle sur le métier que vous indiquez à votre demande d\'accès.', 'Page Métiers ›', 'metiers.html'],
        ['euro', 'Des tarifs clairs', 'Sans engagement, dès ' + prixDe('pro') + ' € TTC par mois. Les places s\'additionnent quand l\'équipe grandit.', 'Page Tarifs ›', 'tarifs.html'],
        ['lock', 'Pourquoi TEAM OP', 'Chiffrement AES-256, un espace par entreprise et un interlocuteur direct.', 'Pourquoi TEAM OP ›', 'pourquoi.html']]
        .map(([i, t, x, c, h]) => `<a class="teaser" href="${h}"><span class="tuile">${ic(i)}</span><b>${fr(t)}</b><span class="t">${fr(x)}</span><span class="l">${fr(c)}</span></a>`).join('')
      + '</div></section>' },

  applications: { section: 'applications', titre: 'Nos applications — TEAM OP', desc: 'Les applications TEAM OP : OP GESTION (gestion d\'activité terrain) et OP MESSAGES (messagerie professionnelle d\'équipe).',
    corps: () => scene('Applications', 'Nos applications.', 'Toutes les applications de la plateforme TEAM OP. Ouvrez-en une pour voir tout ce qu\'elle fait.')
      + `<section class="page" id="applications" style="padding-top:20px;padding-bottom:20px"><h2 class="h2 moyen">Deux applications, chacune à sa place.</h2><p class="intro">${fr('OP GESTION pour gérer votre activité. OP MESSAGES, bientôt disponible, pour échanger — avec son propre compte.')}</p><div class="apps">
        <article class="app-carte"><img class="ico" src="/icons/opgestion-512.png" width="64" height="64" alt=""><div><div class="nom">OP GESTION</div><div class="desc">${fr('Interventions avec rapports signés, planning et tournées, stock et box, devis-factures, encaissements, équipe.')}</div></div><a href="elan.html">Découvrir OP GESTION ›</a>
          <div class="rogne-mac">${mac('mac-tableau', 'OP GESTION sur un Mac : le tableau de bord', { tailles: '(max-width: 700px) 90vw, 620px' })}</div></article>
        <article class="app-carte"><img class="ico" src="/icons/opmsg-512.png" width="64" height="64" alt=""><div><div class="nom">OP MESSAGES</div><div class="desc">${fr('Toute votre équipe, une seule conversation : chat en temps réel, groupes, photos, vocaux, sondages — réservé à votre entreprise. Bientôt disponible.')}</div></div><a href="opmessages.html">Découvrir OP MESSAGES ›</a>
          <div class="sondage" aria-hidden="true"><b>Quel créneau pour la réunion d'équipe ?</b>
            <div class="l"><span>Mardi 14 h</span><span class="barre"><i class="v1" style="width:70%"></i></span><span>4 votes</span></div>
            <div class="l"><span>Jeudi 9 h</span><span class="barre"><i class="v2" style="width:35%"></i></span><span>2 votes</span></div>
            <small>${fr('Événement créé : Réunion d\'équipe — mardi 14 h')}</small></div></article></div></section>
      <section class="page" style="padding-top:20px;padding-bottom:40px"><a class="bandeau-creer" href="creer.html"><span class="tuile">${ic('rocket', 24)}</span><span><b>Créer votre application</b><small>${fr('Décrivez votre besoin, on le construit avec vous — de A à Z.')}</small></span><span class="l">Décrire mon besoin ›</span></a></section>` },

  elan: { section: 'applications', titre: 'OP GESTION — Pilotez votre activité terrain | TEAM OP', desc: 'OP GESTION : interventions, planning et tournées, stock, devis et factures, encaissements et équipe — votre quotidien dans une seule application.',
    sousnav: { titre: 'OP GESTION', href: 'elan.html', liens: [L('Vue d\'ensemble', 'elan.html#apercu'), L('Fonctions', 'elan.html#fonctions'), L('Tarifs', 'tarifs.html#elan')], cta: () => `<a class="pilule" href="${ESPACE()}">Demander un accès</a>` },
    corps: () => scene('Application de gestion tout-en-un', 'Pilotez votre activité terrain en un seul endroit.', 'Interventions, planning et tournées, stock et box, encaissements, devis-factures et équipe : OP GESTION réunit tout votre quotidien dans une application simple, rapide et accessible partout.',
        `<a class="bouton" href="${ESPACE()}">Demander un accès</a><a class="lien-suite" href="tarifs.html#elan">Voir les tarifs ›</a>`)
      + `<section class="scene-mac">${mac('mac-planning', 'OP GESTION sur un Mac : le planning de la semaine, technicien par technicien', { tot: false })}</section>
      <section id="fonctions" style="padding:clamp(70px,9vw,120px) 12px 12px"><div class="page" style="padding:0 10px"><h2 class="h2">Ce que fait OP GESTION.</h2><p class="intro">Ouvrez une carte pour tout voir.</p></div>${tuiles('elan', 'OP GESTION', F_GESTION)}</section>${FENETRE}` },

  opmessages: { section: 'applications', titre: 'OP MESSAGES — La messagerie de votre équipe | TEAM OP', desc: 'OP MESSAGES : chat temps réel, groupes, photos, messages vocaux et notifications — une messagerie réservée à votre entreprise.',
    sousnav: { titre: 'OP MESSAGES', href: 'opmessages.html', liens: [L('Vue d\'ensemble', 'opmessages.html#apercu'), L('Fonctions', 'opmessages.html#fonctions'), L('Tarifs', 'tarifs.html#opmessages')], cta: '<span class="pilule calme">Bientôt disponible</span>' },
    corps: () => scene('Messagerie professionnelle d\'équipe', 'Toute votre équipe, une seule conversation.', 'Chat en temps réel, groupes, photos, messages vocaux et notifications — une messagerie réservée à votre entreprise, sans mélange avec le personnel.',
        `<span class="etiquette-calme">Bientôt disponible</span><a class="lien-suite" href="tarifs.html#opmessages">Voir les tarifs ›</a>`)
      + `<section style="padding:0 22px 40px;text-align:center;background:var(--stage);margin-top:-1px"><p style="margin:0 auto;max-width:560px;font-size:14px;line-height:1.5;color:var(--sub)">${fr('OP MESSAGES change d\'infrastructure : l\'application rouvre bientôt, et ses formules avec elle.')}</p></section>
      <section class="convers" aria-label="Aperçu d'une conversation"><div class="convers-in"><div class="canaux"><small>Espace entreprise</small><span class="on"># général</span><span># dépôt</span><span># chantier-mairie</span><span>Marc</span><span>Julie</span></div>
        <div class="fil"><div class="bulle eux"><b>Julie</b>${fr('Tu peux m\'envoyer une photo du compteur ?')}</div><div class="bulle moi">Oui, deux secondes</div><div class="photos"><span></span><span></span></div><div class="bulle eux">${fr('Parfait, merci !')}</div><div class="ecrit">Marc est en train d'écrire…</div></div></div></section>
      <section id="fonctions" style="padding:clamp(70px,9vw,120px) 12px 12px"><div class="page" style="padding:0 10px"><h2 class="h2">Ce que fait OP MESSAGES.</h2><p class="intro">Ouvrez une carte pour tout voir.</p></div>${tuiles('msg', 'OP MESSAGES', F_MESSAGES)}</section>${FENETRE}` },

  creer: { section: 'applications', cta: false, titre: 'Créer votre application — TEAM OP', desc: 'Décrivez votre métier et vos besoins : nous étudions votre demande et construisons avec vous l\'application qu\'il vous faut.',
    corps: () => scene('Sur mesure', 'Créons votre application, de A à Z.', 'Décrivez-nous votre métier, votre quotidien et vos besoins : nous étudions votre demande et construisons avec vous l\'outil qu\'il vous faut.')
      + `<section class="page" style="max-width:1100px;padding-top:clamp(50px,6vw,80px);padding-bottom:60px">
        <div class="etapes3"><div><b>1</b><span>Vous décrivez votre besoin</span></div><div><b>2</b><span>On vous rappelle sous 48 h</span></div><div><b>3</b><span>On construit ensemble</span></div></div>
        <form class="demande" id="demande" novalidate>
          <div><h3>1 · Votre entreprise</h3><div class="champs">`
      + [['Nom', 'text', 'Dupont', 'family-name'], ['Prénom', 'text', 'Marie', 'given-name'], ['E-mail', 'email', 'marie@entreprise.fr', 'email'], ['Téléphone', 'tel', '06 12 34 56 78', 'tel'], ['Nom de l\'entreprise', 'text', 'Votre entreprise', 'organization'], ['Taille de l\'équipe', 'text', 'Ex. : 5 personnes', 'off']]
        .map(([l, t, ph, ac], n) => `<label class="champ">${fr(l)}<input type="${t}" name="c${n}" data-libelle="${esc(l)}" placeholder="${esc(ph)}" autocomplete="${ac}"${t === 'tel' ? ' inputmode="tel"' : ''}></label>`).join('')
      + `</div></div>
          <div><h3>Votre métier</h3><p>${fr('Votre application démarre avec les catégories d\'intervention, la fiche de terrain et les modules de votre métier.')}</p><div class="metiers-choix">`
      + [['3d', '3D — Anti-nuisibles', 'Dératisation · désinsectisation · désinfection', 1], ['plomberie', 'Plomberie', 'Dépannage · sanitaire · réseaux', 1], ['electricite', 'Électricité', 'Installation · normes · dépannage', 1], ['chauffage', 'Chauffage / Climatisation', 'CVC · entretien · contrats', 1], ['serrurerie', 'Serrurerie', 'Ouverture · sécurité · accès', 1], ['nettoyage', 'Nettoyage / Propreté', 'Bureaux · remise en état · vitrerie', 1], ['maconnerie', 'Maçonnerie / Gros œuvre', 'Construction · rénovation', 1], ['menuiserie', 'Menuiserie', 'Pose · agencement · fermetures', 1], ['peinture', 'Peinture / Revêtements', 'Intérieur · extérieur · sols', 1], ['paysagiste', 'Paysagiste / Espaces verts', 'Entretien · création · élagage', 1], ['couverture', 'Couverture / Zinguerie', 'Toiture · gouttières · étanchéité', 1], ['multiservices', 'Multiservices / Maintenance', 'Petits travaux · contrats', 1]]
        .map(([k, n, s]) => [k, n, s, packPret(k)])
        .map(([k, n, s, p]) => `<button type="button" class="metier-puce" aria-pressed="false" data-pack="${k}" data-nom="${esc(n)}" data-pret="${p}"><b>${fr(n)}</b><small>${fr(s)}</small><i${p ? ' class="pret"' : ''}>${p ? 'Pack prêt' : 'Sur mesure avec vous'}</i></button>`).join('')
      + `</div></div>
          <div><h3>2 · Ce dont vous avez besoin</h3><p>${fr('Cochez tout ce qui vous parle — on affine ensemble après.')}</p><div class="besoins">`
      + ['Planning et rendez-vous', 'Suivi d\'interventions / chantiers', 'Stock / matériel / box', 'Encaissements / facturation', 'Communication d\'équipe', 'Photos et comptes-rendus', 'Gestion clients / contrats'].map(b => `<button type="button" class="besoin" aria-pressed="false">${fr(b)}</button>`).join('')
      + `</div></div>
          <label class="champ">Décrivez votre quotidien (facultatif)<textarea name="quotidien" data-libelle="Quotidien" rows="4" placeholder="${esc('Ex. : 3 techniciens, 40 clients en contrat, on veut les rapports signés sur tablette…')}"></textarea></label>
          <div class="envoi"><button type="submit" class="bouton">Préparer ma demande</button><small>${fr('Elle s\'ouvre dans votre messagerie, adressée à support@teamop.fr : vous l\'envoyez. On vous rappelle sous 48 h.')}</small></div>
          <p class="avis-envoi" hidden role="status">${fr('Votre messagerie s\'ouvre avec la demande prête : il ne reste qu\'à l\'envoyer. Rien ne s\'est ouvert ? Écrivez-nous directement à ')}<a href="mailto:support@teamop.fr">support@teamop.fr</a>.</p>
        </form></section>` },

  metiers: { section: 'metiers', titre: 'Métiers — TEAM OP', desc: 'TEAM OP s\'adapte à votre métier : 3D anti-nuisibles, plomberie, électricité, chauffage, BTP, paysagistes, nettoyage et plus encore.',
    corps: () => scene('Métiers', 'Un outil qui parle votre métier.', 'Dites-nous ce que vous faites, TEAM OP se règle sur votre métier : types d\'intervention, fiche de rapport et modules utiles sont prêts dès l\'ouverture de votre espace. Vous démarrez dès que votre demande est acceptée, pas au bout de quelques semaines.',
        `<a class="bouton" href="${ESPACE()}">Créer mon espace</a>`)
      + `<section class="page" style="padding-top:10px;padding-bottom:20px"><div class="cartes-3">`
      + [['1', 'Renseignez votre entreprise', 'Nom, coordonnées… et surtout votre métier, dans votre demande d\'accès.'], ['2', 'Tout se met en place', 'Types d\'intervention, fiche de rapport et modules de votre métier sont réglés pour vous à l\'ouverture de votre espace. Vos produits et fournisseurs, vous les ajoutez à votre rythme.'], ['3', 'Vous travaillez', 'Planning, rapports, devis et factures : votre équipe est opérationnelle dès le premier jour.']]
        .map(([n, t, d]) => `<div class="etape-carte"><b class="n">${n}</b><b class="t">${fr(t)}</b><span>${fr(d)}</span></div>`).join('')
      + `</div></section><section class="page" style="padding-top:60px;padding-bottom:20px"><h2 class="h2">Les métiers couverts.</h2><p class="intro">${fr(PACKS_APP.includes('autre') ? PACKS_APP.filter(k => k !== 'autre').length + ' packs préconfigurés, et un réglage général pour tous les autres métiers de terrain.' : PACKS_APP.length + ' packs préconfigurés déjà disponibles, d\'autres en préparation.')}</p><div class="packs">`
      + [['m-3d', 'PACK COMPLET', 'bug', '3D — Hygiène anti-nuisibles', 'Dératisation · désinsectisation · désinfection', ['Registre sanitaire et biocides (AMM, Certibiocide)', 'Fiches de traitement par nuisible', 'Plans d\'appâtage et postes par site', 'Courbe d\'évolution de l\'infestation'], 1],
        ['m-plomberie', 'PACK DISPONIBLE', 'pipe', 'Plomberie', 'Dépannage · sanitaire · réseaux', ['Interventions type : fuite, chauffe-eau, débouchage…', 'Stock de pièces et consommables', 'Devis-factures et photos avant/après'], 1],
        ['m-electricite', 'PACK DISPONIBLE', 'bolt', 'Électricité', 'Installation · mise aux normes · dépannage', ['Interventions type : tableau, mise aux normes, contrôle…', 'Matériel électrique en stock avec seuils', 'Rapports signés sur place'], 1],
        ['m-chauffage', 'PACK DISPONIBLE', 'flame', 'Chauffage / Climatisation', 'CVC · entretien · contrats annuels', ['Contrats d\'entretien : chaque passage généré d\'un clic', 'Récurrences : le passage suivant planifié à la clôture', 'Historique complet par client'], 1],
        ['m-serrurerie', 'PACK DISPONIBLE', 'key', 'Serrurerie', 'Ouverture · sécurité · accès', ['Interventions type : ouverture de porte, serrure, blindage…', 'Relevés : clés remises, modèle posé, certification'], 1],
        ['m-nettoyage', 'PACK DISPONIBLE', 'spray', 'Nettoyage / Propreté', 'Bureaux · remise en état · vitrerie', ['Interventions type : bureaux, remise en état, vitrerie…', 'Relevés : surface traitée, agents, temps passé', 'Consommables en stock avec seuils'], 1],
        /* ⛔ les six packs qui étaient « bientôt » ou « sur mesure » existent depuis la v766 (Justin, 30 septembre 2026 : « oui,
           fais ce qu'il faut ») : chaque puce dit ce que le PACK règle — ses types, ses prestations, ses relevés (METIERS,
           app.html), rien d'autre. « Chantiers suivis dans la durée » ne se dit plus : le module chantier a été retiré (v730). */
        ['m-maconnerie', 'PACK DISPONIBLE', 'brick', 'Maçonnerie / Gros œuvre', 'Construction · rénovation · gros œuvre', ['Interventions type : construction, rénovation, dalle, façade…', 'Prestations au rapport : coffrage, ferraillage, enduit…', 'Relevés : surface réalisée, béton coulé, linéaire de mur'], 1],
        ['m-menuiserie', 'PACK DISPONIBLE', 'saw', 'Menuiserie', 'Pose · agencement · fermetures', ['Interventions type : fenêtres, portes, volets, agencement…', 'Relevés : cotes, éléments posés, matériau', 'Photos avant/après dans le rapport'], 1],
        ['m-peinture', 'PACK DISPONIBLE', 'brush', 'Peinture / Revêtements', 'Intérieur · extérieur · sols', ['Interventions type : intérieur, façade, revêtements, ravalement…', 'Prestations au rapport : lessivage, sous-couche, couches…', 'Relevés : surface traitée, nombre de couches, teinte'], 1],
        ['m-paysagiste', 'PACK DISPONIBLE', 'leaf', 'Paysagiste / Espaces verts', 'Entretien · création · élagage', ['Interventions type : tonte, taille de haies, élagage…', 'Contrats d\'entretien : chaque passage généré d\'un clic', 'Relevés : surface entretenue, haie taillée, déchets verts'], 1],
        ['m-couverture', 'PACK DISPONIBLE', 'building', 'Couverture / Zinguerie', 'Toiture · gouttières · étanchéité', ['Interventions type : fuite, tuiles, gouttières, démoussage…', 'Relevés : surface, gouttière posée, hauteur de travail', 'Photos avant/après dans le rapport'], 1],
        ['m-multiservices', 'PACK DISPONIBLE', 'wrench', 'Multiservices / Maintenance', 'Petits travaux · maintenance · contrats', ['Interventions type : dépannage, petits travaux, maintenance…', 'Contrats de maintenance : chaque passage généré d\'un clic', 'Relevés : temps passé, pièces fournies'], 1],
        ['m-autre', 'RÉGLAGE GÉNÉRAL', 'tool', 'Autre métier de terrain', 'Interventions · entretien · dépannage', ['Types d\'intervention généraux : dépannage, entretien, installation…', 'Rapport : prestations réalisées et temps passé'], 1]]
        .filter(([id]) => id !== 'm-autre' || PACKS_APP.includes('autre'))
        .map(([id, tag, i, t, s, pts]) => [id, packPret(id.slice(2)) ? tag : 'PACK BIENTÔT', i, t, s, pts, packPret(id.slice(2))])
        .map(([id, tag, i, t, s, pts, pret]) => `<article class="pack" id="${id}"><span class="tag${pret ? ' pret' : ''}">${tag}</span><span class="tete"><span class="tuile">${ic(i)}</span><span><b>${fr(t)}</b><small>${fr(s)}</small></span></span>`
          + (pts.length ? `<ul>${pts.map(p => `<li>${COCHE(13)}<span>${fr(p)}</span></li>`).join('')}</ul>` : '')
          + (pret ? `<a href="${ESPACE()}">Démarrer avec ce pack ›</a>` : '<a href="creer.html">En parler avec nous ›</a>') + '</article>').join('')
      + '</div></section>' },

  ...Object.fromEntries(Object.entries(METIERS).map(([k, m]) => [k, { section: 'metiers', titre: m.titre, get desc() { return descDe(k, m.desc); }, priorite: m.priorite, corps: () => pageMetier(m, k) }])),
  ...Object.fromEntries(Object.entries(FONCTIONS).map(([k, m]) => [k, { section: 'applications', titre: m.titre, get desc() { return descDe(k, m.desc); }, priorite: m.priorite, corps: () => pageMetier(m, k) }])),

  tarifs: { section: 'tarifs', titre: 'Tarifs — TEAM OP', get desc() { return 'Tarifs TEAM OP : Pro ' + prixDe('pro') + ' €, Business ' + prixDe('business') + ' €, Business Premium ' + prixDe('premium') + ' €, par mois et par utilisateur, TTC et sans engagement.' + (AVEC_OPTIONS ? ' Options du Pro dès ' + euro(PRIX_OPT_MIN) + '.' : ''); },
    corps: () => scene('Tarifs', 'Des tarifs simples et clairs.', 'Choisissez votre formule, et changez-en quand votre équipe grandit. Sans engagement, sans frais cachés.', '', { courte: true })
      + `<section class="tarifs" id="tarifs"><span id="elan"></span><span id="opmessages"></span><div class="tarifs-in">
        <p class="intro">${fr('Prix TTC par mois, sans engagement. Un abonnement par utilisateur : pour une équipe de cinq, prenez cinq abonnements. Pour payer, il faut un compte TEAM OP : créez-le d\'abord, c\'est gratuit.')}</p>
        <div class="segment" role="tablist" aria-label="Application"><button type="button" role="tab" id="onglet-gestion" aria-controls="formules-gestion" aria-selected="true">OP GESTION</button><button type="button" role="tab" id="onglet-msg" aria-controls="formules-msg" aria-selected="false" tabindex="-1">OP MESSAGES</button></div>
        <div class="formules" id="formules-gestion" role="tabpanel" aria-labelledby="onglet-gestion" style="--n:${FORMULES_GESTION.length}">${formules(FORMULES_GESTION)}</div>
        ${AVEC_OPTIONS ? `<div class="suite-gestion" data-onglet="formules-gestion">${blocOptions()}${blocComparatif()}</div>\n        ` : ''}<div class="formules" id="formules-msg" role="tabpanel" aria-labelledby="onglet-msg" style="--n:3" hidden>${formules(FORMULES_MESSAGES, true)}</div>
        <p class="note-msg">${fr('OP MESSAGES change d\'infrastructure : ses formules ouvriront avec la nouvelle version, et rien n\'est facturé d\'ici là.')}</p>
      </div></section>
      <section class="faq" id="faq"><h2 class="h2 moyen">Questions fréquentes.</h2><div class="liste">`
      + [['Faut-il un compte pour payer ?', 'Oui. Créez d\'abord votre compte TEAM OP — c\'est gratuit — et confirmez votre adresse e-mail : le paiement se fait ensuite depuis ce compte. Sans compte, il n\'est pas possible de payer : c\'est ce qui rattache chaque abonnement à la personne qui l\'a souscrit et à son entreprise.'],
        ['Puis-je changer de formule à tout moment ?', 'Oui. Vous passez de Pro à Business ou à Business Premium quand vous voulez, et vous pouvez redescendre ou arrêter sur simple demande au support — aucun engagement de durée.' + (AVEC_OPTIONS ? ' Une option s\'ajoute à tout moment depuis la page d\'abonnement, et se retire sur simple demande au support, comme un changement de formule.' : '')],
        ['Comment fonctionnent les places utilisateur ?', 'Un abonnement donne un compte utilisateur, quelle que soit la formule. Besoin de plus ? Ajoutez un abonnement par personne : les places s\'additionnent (par exemple, Business\u00a0×\u00a03\u00a0=\u00a03\u00a0comptes).']
        ].concat(AVEC_OPTIONS ? FAQ_OPTIONS() : []).concat([
        ['Faut-il installer quelque chose ?', 'Non. TEAM OP s\'ouvre dans le navigateur, sans rien télécharger. Vous pouvez aussi l\'ajouter à l\'écran d\'accueil de votre téléphone ou de votre ordinateur, comme une application : en un clic sur Android et sur ordinateur, et sur iPhone par Partager puis « Sur l\'écran d\'accueil ».'],
        ['Mes données sont-elles en sécurité ?', 'Oui : vos données sont chiffrées (AES-256) sur l\'appareil avant l\'envoi, chaque entreprise a son espace et sa clé, et une sauvegarde complète s\'exporte à tout moment.'],
        ['Y a-t-il des frais d\'installation ?', 'Non, aucun frais caché. L\'accompagnement à la mise en route est inclus dans Business Premium.'],
        ['Que se passe-t-il si j\'arrête ?', 'Vos données vous appartiennent : vous exportez tout en un clic avant de partir. Rien n\'est retenu en otage.']])
        .map(([q, r], n) => `<div class="q"><button type="button" aria-expanded="false" aria-controls="r${n}"><b>${fr(q)}</b>${PLUS.replace('width="14" height="14"', 'width="16" height="16"')}</button><div class="r" id="r${n}"><div><p>${fr(r)}</p></div></div></div>`).join('')
      + '</div></section>' },

  pourquoi: { section: 'pourquoi', titre: 'Pourquoi TEAM OP ?', desc: 'Sécurité AES-256, synchronisation en quelques secondes, développé en France : pourquoi des équipes terrain choisissent TEAM OP.',
    corps: () => {
      const cartes = l => '<div class="cartes-3">' + l.map(([i, t, x]) => `<div class="carte-v"><span class="tuile">${ic(i)}</span><b>${fr(t)}</b><span class="t">${fr(x)}</span></div>`).join('') + '</div>';
      return scene('Pourquoi TEAM OP', 'Pourquoi choisir TEAM OP ?', 'Ce que nous proposons, comment nous protégeons vos données et pourquoi des équipes terrain nous font confiance au quotidien.')
        + `<section class="bloc" id="services"><div class="bloc-in"><h2 class="h2">Nos services.</h2><div style="height:28px"></div>${cartes([['grid', 'Des applications métier prêtes à l\'emploi', 'La gestion d\'activité aujourd\'hui, la messagerie d\'équipe à sa réouverture : chaque application se choisit selon vos besoins.'], ['chat', 'Un accompagnement direct', 'Un contact humain (support@teamop.fr), des mises à jour régulières et une prise en main rapide — sans formation compliquée.'], ['device', 'Installation sur tous vos appareils', 'Une vraie application : icône sur l\'écran d\'accueil, plein écran, notifications — iPhone, Android, Mac, Windows, sans passer par un magasin d\'applications.'], ['building', 'Un espace par entreprise', 'Chaque entreprise a son espace isolé, avec sa propre clé : vos données ne croisent jamais celles des autres.']])}</div></section>
        <section class="bloc teinte" id="partenaire"><div class="bloc-in"><h2 class="h2">Au service des entreprises et de leurs besoins.</h2><p class="intro">${fr('TEAM OP n\'est pas un logiciel figé : nous sommes une équipe au service de la vôtre. On écoute, on adapte et on construit avec vous — votre besoin d\'aujourd\'hui devient la fonctionnalité de demain.')}</p>${cartes([['ear', 'À l\'écoute', 'Chaque retour est lu et traité — vous parlez directement à ceux qui développent l\'outil.'], ['wrench', 'Sur mesure', 'Un besoin particulier ? On étudie votre demande et on construit l\'outil qu\'il vous faut.'], ['rocket', 'Un vrai partenaire', 'Accompagnement à la mise en route, support réactif et évolutions régulières incluses.']])}</div></section>
        <section class="bloc" id="engagements"><div class="bloc-in"><h2 class="h2">Nos engagements techniques.</h2><div style="height:28px"></div>${cartes([['lock', 'Sécurité AES-256', 'Vos données sont chiffrées (AES-256) sur vos appareils avant l\'envoi, puis hébergées sur notre serveur, en France. Chaque entreprise a son espace et sa propre clé.'], ['bolt', 'Toujours à jour', 'Chaque action arrive chez toute l\'équipe en quelques secondes, sans rafraîchir la page — au bureau comme sur le terrain.'], ['flag', 'Développé en France', 'Conçu et maintenu par TEAM OP — un interlocuteur unique, réactif, qui connaît votre métier.']])}</div></section>`; } },
};

/* Le jour et la nuit, écrits UNE fois : le site et les pages hors du site (espace.html, connexion.html…) portent cette
   tête à l'identique — tests/test-836.js relit chaque page contre cette constante. Justin, 29 septembre 2026, capture de
   son iPhone à l'appui : « Sur le site je veux pas le bouton jour nuit, je veux que ça soit automatique » — la page suit
   l'appareil (prefers-color-scheme, la feuille le fait seule), sans bouton. Le script efface le choix qu'avait rangé
   l'ancien bouton ☀︎/☾ : plus rien ne le lit, il n'a pas à rester sur l'appareil.
   ⛔ CINQ LIGNES, COMME AVANT : les pages juridiques sont citées par numéro de ligne (mentions-legales.html:74…). */
const TETE_MODE = `<meta name="theme-color" content="#f0f3f8" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#0b1426" media="(prefers-color-scheme: dark)">
<meta name="color-scheme" content="light dark">
<script>/* le jour et la nuit suivent l'appareil, sans bouton (Justin, 29 septembre 2026 : « je veux que ça soit automatique ») : on efface le choix qu'avait rangé l'ancien bouton ☀︎/☾, que plus rien ne lit (dans une fonction : une variable globale heurterait celles des pages qui embarquent ces lignes) */
(function () { try { localStorage.removeItem('teamop_site_mode'); } catch (e) {} })();</script>`;

/* le lanceur de l'écran d'accueil : une PWA installée rouvre la dernière application choisie (?hub=1 pour revenir au choix) */
/* ══ LE RÉFÉRENCEMENT — Justin, 29 septembre 2026, avec son plan SEO (robots.txt, sitemap.xml, seo-head-snippet.html,
   pages-metiers.md) : « Fais l'optimisation SEO avec les fichiers fournis ». ══
   · À LA RACINE seulement : l'aperçu garde son « noindex », il ne se référence pas et n'a pas d'adresse canonique à lui.
   · L'adresse canonique est celle que Google doit retenir : l'accueil est « https://teamop.fr/ », jamais « /index.html ».
   · ⛔ LE JSON-LD NE RECOPIE AUCUN PRIX : ses offres se lisent dans FORMULES_GESTION, les mêmes que la page Tarifs — deux
     listes de prix recopiées divergent toujours, et Google afficherait un prix faux. Accueil seulement (« index.html
     uniquement », Justin).
   · Le plan du site (sitemap.xml) s'écrit ICI, depuis PAGES : une page ajoutée au site y entre d'elle-même (« mettre à
     jour le sitemap à chaque nouvelle page », son plan). `MAJ` est la date des derniers changements : on la remonte
     quand le contenu change (une date calculée au jour changerait le fichier tous les jours). */
const SITE_URL = 'https://teamop.fr/';
const MAJ = '2026-09-29';
const urlDe = cle => SITE_URL + (cle === 'index' ? '' : cle + '.html');
const IMAGE_PARTAGE = { url: SITE_URL + 'vitrine/v2/captures/partage-tableau-jour.jpg', l: 1200, h: 630,
  alt: 'OP GESTION sur un Mac : le tableau de bord d\'une entreprise de démonstration' };
const JSONLD = () => JSON.stringify({ '@context': 'https://schema.org', '@graph': [
  { '@type': 'Organization', '@id': SITE_URL + '#organisation', name: 'TEAM OP', url: SITE_URL, logo: SITE_URL + 'icons/teamop-192.png',
    founder: { '@type': 'Person', name: 'Justin Biret' }, email: 'support@teamop.fr', areaServed: 'FR' },
  { '@type': 'WebSite', '@id': SITE_URL + '#site', url: SITE_URL, name: 'TEAM OP', inLanguage: 'fr-FR', publisher: { '@id': SITE_URL + '#organisation' } },
  { '@type': 'SoftwareApplication', name: 'OP GESTION', applicationCategory: 'BusinessApplication', operatingSystem: 'iOS, Android, macOS, Windows, Web',
    description: 'Gestion tout-en-un pour entreprises de terrain : interventions, stock, encaissements, comptabilité.', url: SITE_URL + 'elan.html',
    offers: FORMULES_GESTION.map(f => ({ '@type': 'Offer', name: f.nom, price: f.prix, priceCurrency: 'EUR' })) }] }, null, 2);
function teteSeo(cle) {
  const P = PAGES[cle], u = urlDe(cle);
  return `<link rel="canonical" href="${u}">
<meta name="robots" content="index, follow, max-image-preview:large">
<meta property="og:type" content="website">
<meta property="og:locale" content="fr_FR">
<meta property="og:site_name" content="TEAM OP">
<meta property="og:title" content="${esc(P.ogTitre || P.titre)}">
<meta property="og:description" content="${esc(P.ogDesc || P.desc)}">
<meta property="og:url" content="${u}">
<meta property="og:image" content="${IMAGE_PARTAGE.url}">
<meta property="og:image:width" content="${IMAGE_PARTAGE.l}">
<meta property="og:image:height" content="${IMAGE_PARTAGE.h}">
<meta property="og:image:alt" content="${esc(IMAGE_PARTAGE.alt)}">
<meta name="twitter:card" content="summary_large_image">
` + (cle === 'index' ? `<script type="application/ld+json">\n${JSONLD()}\n</script>\n` : '');
}
/* les pages du plan du site, et leur priorité (celles du sitemap.xml de Justin) ; les pages hors du générateur (les deux
   pages juridiques qu'il y a mises) sont nommées à part */
const PRIORITE = { index: '1.0', elan: '0.9', applications: '0.8', metiers: '0.8', tarifs: '0.8', opmessages: '0.6', creer: '0.6', pourquoi: '0.6' };
const HORS_GENERATEUR = [['confidentialite.html', '0.2'], ['mentions-legales.html', '0.2']];
function sitemap() {
  const u = (loc, pr) => `  <url><loc>${loc}</loc><lastmod>${MAJ}</lastmod><priority>${pr}</priority></url>`;
  return '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
    + Object.keys(PAGES).map(c => u(urlDe(c), PAGES[c].priorite || PRIORITE[c] || '0.6')).concat(HORS_GENERATEUR.map(([f, pr]) => u(SITE_URL + f, pr))).join('\n')
    + '\n</urlset>\n';
}

const LANCEUR = `<script>try{var pwa=matchMedia('(display-mode: standalone)').matches||navigator.standalone===true||document.referrer.indexOf('android-app://')===0,d=localStorage.getItem('teamop_app');if(pwa&&(d==='app.html'||d==='messages.html')&&!/hub/.test(location.search))location.replace('/'+d);}catch(e){}</script>`;

/* ⛔ l'accueil porte le logo TEAM OP : c'est LUI que Google affiche pour tout teamop.fr (un logo par nom d'hôte, celui de
   la page d'accueil — Justin, 29 septembre 2026, capture de Google à l'appui). La page OP MESSAGES porte le sien dans l'onglet
   du navigateur ; dans Google, elle garde celui de l'accueil, et seule une adresse à part (messages.teamop.fr) le changerait. */
const ICONES = cle => cle === 'opmessages'
  ? `<link rel="icon" type="image/png" sizes="32x32" href="/icons/opmsg-favicon-32.png">
<link rel="icon" type="image/png" sizes="192x192" href="/icons/opmsg-192.png">
<link rel="apple-touch-icon" href="/icons/opmsg-apple-touch.png">`
  : `<link rel="icon" href="/favicon.ico" sizes="any">
<link rel="icon" type="image/png" sizes="32x32" href="/icons/teamop-favicon-32.png">
<link rel="icon" type="image/png" sizes="192x192" href="/icons/teamop-192.png">
<link rel="apple-touch-icon" href="/icons/teamop-apple-touch.png">`;
function page(cle, o) {
  const P = PAGES[cle], racine = o ? !!o.racine : A_LA_RACINE;
  POUR_LA_RACINE = racine;
  /* l'état des options vaut pour CETTE page, puis il est rendu : un banc qui génère la racine puis lit PAGES[c].desc ne lit pas celle-là */
  const avant = AVEC_OPTIONS;
  AVEC_OPTIONS = etatOptions(racine, { options: o ? o.options : racine && OPTIONS_DEMANDEES, appSrc: o && o.appSrc }).actif;
  try {
    return rendre(cle, P, racine);
  } finally { AVEC_OPTIONS = avant; }
}
function rendre(cle, P, racine) {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
${TETE_MODE}
${racine ? '' : '<meta name="robots" content="noindex">\n'}<title>${esc(P.titre)}</title>
<meta name="description" content="${esc(P.desc)}">
${racine ? teteSeo(cle) : ''}${ICONES(cle)}
<link rel="manifest" href="/manifest-teamop.webmanifest">
${cle === 'index' ? LANCEUR + '\n' : ''}<link rel="stylesheet" href="${RES}site.css">
<link rel="stylesheet" href="${RES}appareils.css">
</head>
<body>
${entete(P.section, P.sousnav)}
<main>
${P.corps()}
${P.cta === false ? '' : commencer()}
</main>
${pied()}
<script src="${RES}site.js" defer></script>
</body>
</html>
`;
}

if (require.main === module) {
  if (!A_LA_RACINE && !OPTIONS_APP_REELLE) console.log('⚠ aperçu : app.html ne déclare pas encore OPTIONS_GESTION — l\'aperçu montre les options du Pro, la racine non (elle ne les montrera qu\'avec --racine --options, quand l\'application les connaîtra)');
  if (OPTIONS_DEMANDEES && !A_LA_RACINE) console.log('⚠ --options ne sert qu\'avec --racine : l\'aperçu les montre toujours');
  fs.mkdirSync(DEST, { recursive: true });
  for (const cle of Object.keys(PAGES)) {
    const f = path.join(DEST, cle + '.html');
    fs.writeFileSync(f, page(cle));
    console.log('✓', path.relative(RACINE, f), Math.round(fs.statSync(f).size / 1024) + ' Ko');
  }
  if (A_LA_RACINE) { fs.writeFileSync(path.join(RACINE, 'sitemap.xml'), sitemap()); console.log('✓ sitemap.xml'); }
}
module.exports = { PAGES, page, FORMULES_GESTION, FORMULES_MESSAGES, VOLETS, DEST, TETE_MODE, SITE_URL, urlDe, sitemap, JSONLD, IMAGE_PARTAGE,
  OPTIONS_SITE, CATALOGUE, SUBST_OPTIONS, MOIS_OFFERTS, lireOptionsApp, etatOptions, FAQ_OPTIONS, voletsActifs: o => { const a = AVEC_OPTIONS; AVEC_OPTIONS = !!o; try { return voletsActifs(); } finally { AVEC_OPTIONS = a; } } };
