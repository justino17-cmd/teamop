#!/usr/bin/env node
/* ══ LE GÉNÉRATEUR DU SITE VITRINE « MARINE » ══════════════════════════════════════════════════════
   Justin, 27 septembre 2026, avec le zip `design_handoff_teamop_leger` : « ce zip comprend toute
   l'interface pour le site web […] partout où il y a des captures d'écran, je veux des vrais iPhone avec
   un vrai Mac, avec des vraies captures d'écran de l'application ».

   Il écrit les HUIT pages du site (accueil, applications, créer, OP GESTION, métiers, OP MESSAGES,
   pourquoi, tarifs) en HTML statique complet : lisibles sans JavaScript, référencées par Google comme les
   pages d'aujourd'hui. Ressources communes : `vitrine/site.css`, `vitrine/site.js`, `vitrine/appareils.css`,
   `vitrine/captures/` (refaites par `scratchpad/captures-site.js`).
     node scripts/site-marine.js                 → apercu/site/ (avec « noindex » : un aperçu ne se référence pas)
     node scripts/site-marine.js --racine        → à la racine, le jour où Justin dit de remplacer le site
   ⛔ ON CORRIGE ICI, JAMAIS DANS UNE PAGE : `tests/test-835.js` régénère et exige des pages IDENTIQUES.

   Ce qui NE vient PAS de la maquette, et pourquoi (décisions de Justin, antérieures au zip) :
   · aucune promesse de « hors-ligne » / « même sans réseau » — retirées du site le 23 septembre 2026
     (`f1cc223`), la maquette les réécrivait ;
   · les places par formule sont celles de l'application (`PLANS` d'app.html : 1, 1, 2, 3) — la FAQ du
     site d'avant disait « 3 en Business, 5 en Business Premium », faux ;
   · OP MESSAGES : « Bientôt disponible », aucune formule ne se choisit (l'application est fermée) ;
   · « Créer » part par e-mail (pas de route serveur) : l'écran ne dit jamais « demande envoyée » ;
   · les boutons de formule mènent à `recap-abonnement.html?formule=…`, comme aujourd'hui. */
'use strict';
const fs = require('fs'), path = require('path');
const RACINE = path.join(__dirname, '..');
const A_LA_RACINE = process.argv.includes('--racine');
const DEST = A_LA_RACINE ? RACINE : path.join(RACINE, 'apercu', 'site');

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
const CAP = '/vitrine/captures/';
function mac(nom, alt, o) {
  o = o || {};
  const tailles = o.tailles || '(max-width: 700px) 94vw, 1120px';
  const charge = o.tot ? 'eager" fetchpriority="high' : 'lazy';
  return `<figure class="ap-mac" style="margin:0"><div class="ap-mac-couvercle"><div class="ap-mac-ecran"><picture>`
    + `<source media="(prefers-color-scheme: dark)" srcset="${CAP}${nom}-nuit.webp 3024w, ${CAP}${nom}-nuit-1x.webp 1512w" sizes="${tailles}">`
    + `<img src="${CAP}${nom}-jour-1x.webp" srcset="${CAP}${nom}-jour.webp 3024w, ${CAP}${nom}-jour-1x.webp 1512w" sizes="${tailles}" width="1512" height="982" alt="${esc(alt)}" loading="${charge}" decoding="async">`
    + `</picture><span class="ap-mac-encoche"></span></div></div><div class="ap-mac-socle"></div></figure>`;
}
function iphone(nom, alt, o) {
  o = o || {};
  const charge = o.tot ? 'eager' : 'lazy';
  return `<figure class="ap-iphone" style="margin:0${o.largeur ? ';--ap-l:' + o.largeur : ''}">`
    + '<span class="ap-iphone-bouton g action"></span><span class="ap-iphone-bouton g vol1"></span><span class="ap-iphone-bouton g vol2"></span><span class="ap-iphone-bouton d marche"></span><span class="ap-iphone-bouton d photo"></span>'
    + `<div class="ap-iphone-corps"><div class="ap-iphone-bord"><div class="ap-iphone-ecran"><picture>`
    + `<source media="(prefers-color-scheme: dark)" srcset="${CAP}${nom}-nuit.webp">`
    + `<img src="${CAP}${nom}-jour.webp" width="804" height="1748" alt="${esc(alt)}" loading="${charge}" decoding="async">`
    + `</picture></div></div></div></figure>`;
}

/* ── la navigation : un seul endroit pour les liens, le volet, le menu du téléphone et le pied ── */
const L = (label, href, sous) => ({ label, href, sous });
const VOLETS = {
  applications: { label: 'Applications', href: 'applications.html', titre: 'Explorer les applications',
    grands: [L('OP GESTION', 'elan.html', 'Gestion tout-en-un : interventions, stock, compta'), L('OP MESSAGES', 'opmessages.html', 'Messagerie d\'équipe — bientôt disponible'), L('Créer votre application', 'creer.html', 'Décrivez votre besoin, on le construit')],
    petits: [L('Toutes les applications', 'applications.html')] },
  metiers: { label: 'Métiers', href: 'metiers.html', titre: 'Explorer les métiers',
    grands: [L('3D — Anti-nuisibles', 'metiers.html#m-3d', 'Pack complet : registre sanitaire, biocides'), L('Plomberie', 'metiers.html#m-plomberie'), L('Électricité', 'metiers.html#m-electricite'), L('Chauffage / Climatisation', 'metiers.html#m-chauffage')],
    petits: [L('Tous les métiers', 'metiers.html')] },
  tarifs: { label: 'Tarifs', href: 'tarifs.html', titre: 'Explorer les tarifs',
    grands: [L('Tarifs OP GESTION', 'tarifs.html#elan', 'Gratuit · Pro 15 € · Business 25 € · Business Premium 50 €'), L('Tarifs OP MESSAGES', 'tarifs.html#opmessages', 'Perso · Pro · Premium — bientôt disponible')],
    petits: [L('Comparer toutes les formules', 'tarifs.html'), L('Questions fréquentes', 'tarifs.html#faq')] },
  pourquoi: { label: 'Pourquoi TEAM OP', href: 'pourquoi.html', titre: 'Pourquoi TEAM OP',
    grands: [L('Au service des entreprises', 'pourquoi.html#partenaire', 'On écoute, on adapte, on construit avec vous'), L('Sécurité et engagements', 'pourquoi.html#engagements', 'Chiffrement AES-256, vos données à vous')],
    petits: [L('Nos services', 'pourquoi.html#services'), L('Découvrir pourquoi TEAM OP', 'pourquoi.html')] },
};
const ESPACE = '/espace.html', CONNEXION = '/connexion.html?choix=1';

function entete(section, sousnav) {
  const liens = Object.keys(VOLETS).map(k => `<a href="${VOLETS[k].href}" data-fly="${k}" aria-haspopup="true" aria-expanded="false"${section === k ? ' aria-current="page"' : ''}>${esc(VOLETS[k].label)}</a>`).join('');
  const volets = Object.keys(VOLETS).map(k => { const v = VOLETS[k]; return `<div class="fly" id="fly-${k}"><div class="fly-in"><div><div class="fly-t">${esc(v.titre)}</div><div class="fly-grand">`
    + v.grands.map(l => `<a href="${l.href}"><b>${esc(l.label)}</b>${l.sous ? `<small>${fr(l.sous)}</small>` : ''}</a>`).join('')
    + `</div></div><div><div class="fly-t">En savoir plus</div><div class="fly-petit">` + v.petits.map(l => `<a href="${l.href}">${esc(l.label)}</a>`).join('') + '</div></div></div></div>'; }).join('');
  const mobile = `<section><div class="fly-t">TEAM OP</div><a href="index.html">Accueil</a></section>`
    + Object.keys(VOLETS).map(k => `<section><div class="fly-t">${esc(VOLETS[k].label)}</div>` + VOLETS[k].grands.concat(VOLETS[k].petits).map(l => `<a href="${l.href}">${esc(l.label)}</a>`).join('') + '</section>').join('');
  const sn = sousnav ? `<div class="sousnav"><div class="sousnav-in"><a class="sousnav-t" href="${sousnav.href}">${esc(sousnav.titre)}</a><nav class="sousnav-liens" aria-label="${esc(sousnav.titre)}">`
    + sousnav.liens.map(l => `<a href="${l.href}">${esc(l.label)}</a>`).join('') + `</nav>${sousnav.cta}</div></div>` : '';
  return `<header class="entete"><nav class="nav" aria-label="Navigation principale"><div class="nav-in">
      <a class="marque" href="index.html"><img src="/icons/teamop-192.png" width="22" height="22" alt=""><span>TEAM OP</span></a>
      <div class="nav-liens">${liens}</div>
      <div class="nav-droite"><a class="pilule" href="${ESPACE}">Espace client</a>
        <button class="burger" type="button" aria-label="Menu" aria-expanded="false" aria-controls="menu-mobile"><svg class="ouvre" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 8h16M4 16h16"/></svg><svg class="ferme" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg></button></div>
    </div>${volets}</nav>
    <div class="menu-mobile" id="menu-mobile">${mobile}</div>
  </header><div class="voile" aria-hidden="true"></div>${sn}`;
}

function pied() {
  const cols = [['Applications', VOLETS.applications], ['Métiers', VOLETS.metiers], ['Tarifs', VOLETS.tarifs]].map(([t, v]) => `<div><b>${t}</b>` + v.grands.concat(v.petits).map(l => `<a href="${l.href}">${esc(l.label)}</a>`).join('') + '</div>').join('')
    + '<div><b>TEAM OP</b>' + VOLETS.pourquoi.grands.map(l => `<a href="${l.href}">${esc(l.label)}</a>`).join('') + `<a href="${ESPACE}">Espace client</a><a href="${CONNEXION}">Se connecter</a></div>`;
  return `<footer class="pied"><div class="pied-in"><div class="cols">${cols}</div>
    <p>TEAM OP est une plateforme française d'applications métier pour les entreprises de terrain. Fondée et développée par Justin Biret. Prix HT, sans engagement.</p>
    <div class="ligne"><span>Copyright © 2026 TEAM OP. Tous droits réservés.</span><a href="/confidentialite.html">Confidentialité</a><a href="/mentions-legales.html">Mentions légales et CGV</a><a href="mailto:support@teamop.fr">support@teamop.fr</a><span class="fin">France</span></div>
  </div></footer>`;
}

const commencer = () => `<section class="commencer" id="commencer"><div class="commencer-in"><div><h2>Prêt en trois étapes.</h2><ol>
    <li><b>1</b><span>Créez votre compte gratuitement.</span></li><li><b>2</b><span>Demandez l'accès à une application.</span></li><li><b>3</b><span>Votre équipe travaille, tout se synchronise.</span></li></ol></div>
    <div class="boutons"><a href="${ESPACE}">Créer mon compte gratuit</a><a href="${CONNEXION}">Se connecter ›</a></div></div></section>`;

const scene = (surtitre, titre, chapeau, actions, o) => `<section class="scene${o && o.courte ? ' courte' : ''}" id="apercu"><p class="surtitre">${fr(surtitre)}</p><h1>${fr(titre)}</h1>`
  + (chapeau ? `<p class="chapeau">${fr(chapeau)}</p>` : '') + (actions ? `<div class="actions">${actions}</div>` : '') + '</section>';

/* ── les fonctions en tuiles, et leur fenêtre ── */
const LARGEURS = { elan: [2, 1, 1, 1, 1, 1, 2, 1, 1, 1], msg: [2, 1, 3] };
function tuiles(k, app, liste) {
  const html = liste.map(([i, t, s], n) => { const span = LARGEURS[k][n] || 1, large = span > 1, inv = large && n === 0;
    return `<button type="button" class="tuile-f${large ? ' large' : ''}${inv ? ' inv' : ''}" style="--span:${span}" data-i="${n}" aria-haspopup="dialog"><span class="ic">${ic(i, 26)}</span><span class="esp"></span><b>${fr(t)}</b><span class="t">${fr(s)}</span><span class="plus">${PLUS}</span></button>`; }).join('');
  const donnees = { app, coche: COCHE(16), liste: liste.map(([i, t, s, p]) => ({ ic: ic(i, 28), titre: t, sous: s, points: p })) };
  return `<div class="bento">${html}</div><script type="application/json" id="fonctions-donnees">${JSON.stringify(donnees).replace(/</g, '\\u003c')}</script>`;
}
const FENETRE = `<div class="fenetre" role="dialog" aria-modal="true" aria-hidden="true" aria-labelledby="fenetre-titre"><div class="fenetre-in">
  <button type="button" class="fermer" aria-label="Fermer"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" aria-hidden="true"><path d="M5 5l14 14M19 5 5 19"/></svg></button>
  <span class="ic"></span><div class="app"></div><h2 id="fenetre-titre"></h2><div class="st"></div><ul></ul>
  <div class="pied"><button type="button" class="prec"></button><span class="pos"></span><button type="button" class="suiv"></button></div></div></div>`;

const F_GESTION = [
  ['tool', 'Interventions', 'Planifier, intervenir, rendre compte', ['Fiche détaillée en 4 onglets, du planning au rapport signé par le client', 'Chronomètre automatique par GPS : démarre à l\'arrivée, s\'arrête au départ', 'Checklist, photos avant/après, signatures client et technicien horodatées', 'Statuts en temps réel : à planifier → planifiée → en cours → terminée', 'Passages multiples et récurrences (1/3, 2/3, 3/3…) automatiques']],
  ['cal', 'Planning et tournées', 'Jour, semaine, mois, tournées', ['Vues Jour / Semaine / Mois avec la charge de chaque technicien', 'Glisser-déposer vers un autre jour ou un autre technicien', 'Tournées optimisées : ordre des étapes, temps de trajet réels et carte', 'Conflits, absences et congés détectés automatiquement', 'Affectation automatique selon le secteur du client']],
  ['box', 'Stock et box', 'Postes d\'appâtage, arrivages, scanner', ['Chaque box / poste : produits, codes d\'accès, relevés horodatés avec photo', 'Arrivages fournisseurs avec photo du bon de livraison', 'Scanner sécurisé, seuils d\'alerte, réapprovisionnement', 'Mouvements tracés par produit, technicien et box', 'Carte géolocalisée des box, partage en PDF']],
  ['euro', 'Encaissements et compta', 'Télécollecte, paiements, exports', ['Télécollecte terrain : encaissements du jour par technicien', 'CB, espèces, chèque, virement, financement…', 'Récapitulatif à la comptable et export Excel en un clic', 'Suivi payé / impayé, TVA, export Factur-X']],
  ['doc', 'Devis, factures et contrats', 'Du devis au règlement', ['Devis avec photos, transformés en facture en un clic', 'Factures générées depuis les interventions', 'Contrats récurrents planifiés automatiquement', 'Envoi au nom de votre entreprise, statuts suivis']],
  ['file', 'Rapports et documents', 'Envoyés en un clic, à votre nom', ['Rapports personnalisés : votre logo, vos champs, vos mentions', 'Envoi par e-mail ou SMS depuis la fiche', 'Avis de passage, rappels, confirmations de rendez-vous', 'Photos et documents archivés sur chaque fiche']],
  ['users', 'Équipe et rôles', 'Chacun voit ce qui le concerne', ['Comptes pour toute l\'équipe : admin, technicien, commercial, comptable…', 'Permissions menu par menu et action par action', 'Un technicien ne voit que ses interventions et ses box', 'Pointage des heures, parc de véhicules']],
  ['bell', 'Notifications', 'Même application fermée', ['Sur le téléphone et l\'ordinateur, même application fermée', 'Intervention assignée, arrivage, seuil de stock, message', 'Un clic ouvre directement la bonne fiche']],
  ['lock', 'Sécurisé', 'Chiffrement et espace isolé', ['Code PIN et chiffrement AES-256 de bout en bout', 'Espace isolé par entreprise : chaque société a sa clé', 'Sauvegardes complètes en un clic']],
  ['device', 'Partout, sur tous vos appareils', 'iPhone, Android, Mac, Windows', ['Une vraie application sur tous les appareils', 'Synchronisée en temps réel entre les appareils de l\'équipe']],
];
const F_MESSAGES = [
  ['bolt', 'Chat en temps réel', 'Canal général, groupes, messages privés', ['Canal Général, groupes par chantier ou service, messages privés', 'Réponse par glissement, mentions @collègue', 'Instantané sur tous les appareils']],
  ['bell', 'Notifications', 'Même application fermée', ['Prévenu même application fermée — téléphone et ordinateur', 'Un clic ouvre directement la conversation', 'Seuls les membres de la conversation sont prévenus']],
  ['clip', 'Photos, vocaux et fichiers', 'Tout se partage', ['Photos, vocaux, documents, fiches contact', 'Sondages pour décider ensemble', 'Événements pour caler les rendez-vous d\'équipe']],
];

/* ── les formules (les places viennent de `PLANS` d'app.html : 1, 1, 2, 3) ── */
const F = (cle, nom, prix, per, places, desc, tete, points, phare, tag) => ({ cle, nom, prix, per, places, desc, tete, points, phare, tag });
const FORMULES_GESTION = [
  F('gratuit', 'Gratuit', '0', '€ pour toujours', '1 utilisateur', 'Pour découvrir TEAM OP et gérer ses premières interventions.', 'Inclus', ['Planning des interventions (jour · semaine · mois)', 'Fiches clients et historique des passages', 'Rapports d\'intervention simples', 'App web + mobile (iPhone, Android, Mac, PC)', 'Temps réel, sur tous vos appareils', 'Données chiffrées AES-256, espace isolé', 'Support par e-mail']),
  F('pro', 'Pro', '15', '€ / mois', '1 utilisateur inclus', 'Pour les équipes terrain qui veulent un planning et des rapports impeccables.', 'Tout Gratuit, plus', ['Rapports complets : photos, signatures, compte-rendu assisté', 'Tournées du jour : carte, temps de trajet, ordre optimisé', 'Récurrences (contrats) et passages multiples', 'Détection des conflits de planning et absences', 'Devis et factures', 'Exports CSV, notifications push']),
  F('business', 'Business', '25', '€ / mois', '2 utilisateurs inclus', 'Pour piloter toute l\'entreprise : stock, achats, réglementaire et compta.', 'Tout Pro, plus', ['Stock et box : inventaire, seuils, alertes automatiques', 'Bons de commande fournisseurs : PDF pro, envoi en 1 clic', 'Commande suggérée, réception qui crédite le stock', 'Boîte mail intégrée rattachée aux bons', 'Registre sanitaire et biocides (AMM, Certibiocide, courbes)', 'Télécollecte et comptabilité, rôles fins', 'Votre logo dans l\'application', 'Support prioritaire'], true, 'Le plus choisi'),
  F('premium', 'Business Premium', '50', '€ / mois', '3 utilisateurs inclus', 'Le maximum : espace client, service 24h/24 — et la messagerie d\'équipe à sa réouverture.', 'Tout Business, plus', ['100 % des fonctions d\'OP GESTION, sans limite', 'OP MESSAGES inclus dès sa réouverture', 'Espace client : vos clients suivent leurs interventions', 'Statistiques avancées, multi-sites / multi-équipes', 'Personnalisation complète : logo, nom, votre couleur', '3 mois offerts sur chaque future application', 'Création sur mesure d\'une application selon vos besoins', 'Service 24h/24, 7j/7 et accompagnement à la mise en route']),
];
const FORMULES_MESSAGES = [
  F('', 'Perso', '0', '€ pour toujours', 'Compte personnel', 'La messagerie classique, gratuite : messages, appels et vidéo.', 'Inclus', ['Messages privés et groupes entre contacts', 'Appels audio illimités', 'Appels vidéo en tête-à-tête', 'Photos, vidéos, fichiers et messages vocaux', 'App web + mobile, synchro en temps réel']),
  F('', 'Messages Pro', '15', '€ / mois', '1 utilisateur inclus', 'La messagerie de votre entreprise, propre et séparée du perso.', 'Tout Perso, plus', ['Espace entreprise (SIRET) : vos équipes, vos règles', 'Canaux d\'équipe (# équipe, # dépôt…) et canal général', 'Épingles, favoris, archivage, recherche', 'Mentions @, réponses, messages vocaux', 'Notifications push, gestion des membres'], true, 'Équipes'),
  F('', 'Messages Premium', '25', '€ / mois', '3 utilisateurs inclus', 'La totale : visio illimitée et priorité au support.', 'Tout Messages Pro, plus', ['Réunions visio illimitées : HD, partage d\'écran', 'Réunions planifiées avec invitations, appels de groupe', 'Couleurs de conversation et personnalisation avancée', 'Support prioritaire', 'Inclus avec le Business Premium d\'OP GESTION']),
];
function formules(liste, attente) {
  return liste.map(f => `<article class="formule${f.phare ? ' phare' : ''}"><div><div class="n">${f.tag ? `<i>${fr(f.tag)}</i>` : ''}<b>${fr(f.nom)}</b></div>`
    + `<div class="prix"><b>${f.prix}</b><span>${fr(f.per)}</span></div><div class="places">${fr(f.places)}</div><div class="d">${fr(f.desc)}</div></div>`
    + `<div class="inclus"><small>${fr(f.tete)}</small><ul>${f.points.map(p => `<li>${COCHE()}<span>${fr(p)}</span></li>`).join('')}</ul></div>`
    + (attente ? '<span class="cta attente">Bientôt disponible</span>'
      : `<a class="cta" href="/recap-abonnement.html?formule=${f.cle}">${f.prix === '0' ? 'Créer mon compte' : 'Choisir ' + fr(f.nom)}</a>`)
    + '</article>').join('');
}

/* ── les pages ── */
const PAGES = {
  index: { titre: 'TEAM OP — Vos applications métier, au même endroit', desc: 'TEAM OP : votre espace professionnel. Interventions, stock, encaissements et communication d\'équipe — sur mobile, tablette et ordinateur, partout, en temps réel.',
    corps: () => `<section class="accueil"><p class="surtitre">TEAM OP</p><h1>Toutes vos applications métier. Au même endroit.</h1>
      <p class="chapeau">${fr('Interventions, stock, encaissements et communication d\'équipe — sur iPhone, Android, Mac et PC, en temps réel.')}</p>
      <div class="actions"><a class="bouton" href="${ESPACE}">Créer mon compte</a><a class="lien-suite" href="applications.html">Découvrir les applications ›</a></div>
      <div class="gages"><span>Chiffré AES-256</span><span>Temps réel</span><span>Sans installation</span></div>
      <div class="appareils"><div class="ap-duo">${mac('mac-tableau', 'OP GESTION sur un Mac : le tableau de bord d\'une entreprise de démonstration', { tot: true })}${iphone('iphone-tableau', 'OP GESTION sur un iPhone : le tableau de bord', { tot: true })}</div></div></section>
      <div class="plateformes"><span>Mac · Windows</span><span>iPhone · Android</span><span>Navigateur</span></div>
      <section class="duo">
        <div class="grande-carte"><div class="haut"><div class="petit-titre">Sur le terrain</div><h3>${fr('La fiche d\'intervention, dans la poche.')}</h3><p>${fr('Client, adresse, produits, photos et signature : tout est sur la fiche.')}</p></div>
          <div class="bas"><div class="rogne-tel" style="--ap-l:clamp(230px,22vw,330px)">${iphone('iphone-intervention', 'OP GESTION sur un iPhone : une fiche d\'intervention en cours')}</div></div></div>
        <div class="grande-carte nuit"><div class="haut"><div class="petit-titre">Au dépôt</div><h3>Le stock de chaque box, à jour.</h3><p>${fr('Scan, arrivage, relevé. Chaque mouvement est tracé et crédite le stock.')}</p></div>
          <div class="bas"><div class="rogne-tel" style="--ap-l:clamp(230px,22vw,330px)">${iphone('iphone-box', 'OP GESTION sur un iPhone : la fiche d\'une box et ses gestes')}</div></div></div>
      </section>
      <section class="page" style="padding-top:90px;padding-bottom:40px"><h2 class="h2">${fr('Tout TEAM OP, en un coup d\'œil.')}</h2><div class="teasers">`
      + [['tool', 'Adapté à votre métier', 'Anti-nuisibles, plomberie, électricité, chauffage… TEAM OP se règle sur votre métier dès la création.', 'Page Métiers ›', 'metiers.html'],
        ['euro', 'Des tarifs clairs', 'Gratuit pour commencer, sans engagement. Les places s\'additionnent quand l\'équipe grandit.', 'Page Tarifs ›', 'tarifs.html'],
        ['lock', 'Pourquoi TEAM OP', 'Chiffrement AES-256, un espace par entreprise et un interlocuteur direct.', 'Pourquoi TEAM OP ›', 'pourquoi.html']]
        .map(([i, t, x, c, h]) => `<a class="teaser" href="${h}"><span class="tuile">${ic(i)}</span><b>${fr(t)}</b><span class="t">${fr(x)}</span><span class="l">${fr(c)}</span></a>`).join('')
      + '</div></section>' },

  applications: { section: 'applications', titre: 'Nos applications — TEAM OP', desc: 'Les applications TEAM OP : OP GESTION (gestion d\'activité terrain) et OP MESSAGES (messagerie professionnelle d\'équipe).',
    corps: () => scene('Applications', 'Nos applications.', 'Toutes les applications de la plateforme TEAM OP. Ouvrez-en une pour voir tout ce qu\'elle fait.')
      + `<section class="page" id="applications" style="padding-top:20px;padding-bottom:20px"><h2 class="h2 moyen">Deux applications. Un seul compte.</h2><p class="intro">Le même espace sécurisé, la même logique. Vous activez ce dont vous avez besoin.</p><div class="apps">
        <article class="app-carte"><img class="ico" src="/icons/opgestion-512.png" width="64" height="64" alt=""><div><div class="nom">OP GESTION</div><div class="desc">${fr('Interventions avec rapports signés, planning et tournées, stock et box, devis-factures, encaissements, équipe.')}</div></div><a href="elan.html">Découvrir OP GESTION ›</a>
          <div class="rogne-mac">${mac('mac-tableau', 'OP GESTION sur un Mac : le tableau de bord', { tailles: '(max-width: 700px) 90vw, 620px' })}</div></article>
        <article class="app-carte nuit"><img class="ico" src="/icons/opmsg-512.png" width="64" height="64" alt=""><div><div class="nom">OP MESSAGES</div><div class="desc">${fr('Toute votre équipe, une seule conversation : chat en temps réel, groupes, photos, vocaux, sondages — réservé à votre entreprise. Bientôt disponible.')}</div></div><a href="opmessages.html">Découvrir OP MESSAGES ›</a>
          <div class="sondage" aria-hidden="true"><b>Quel créneau pour la réunion d'équipe ?</b>
            <div class="l"><span>Mardi 14 h</span><span class="barre"><i style="width:70%;background:#7fb2ff"></i></span><span>4 votes</span></div>
            <div class="l"><span>Jeudi 9 h</span><span class="barre"><i style="width:35%;background:#3d4d6b"></i></span><span>2 votes</span></div>
            <small>${fr('Événement créé : Réunion d\'équipe — mardi 14 h')}</small></div></article></div></section>
      <section class="page" style="padding-top:20px;padding-bottom:40px"><a class="bandeau-creer" href="creer.html"><span class="tuile">${ic('rocket', 24)}</span><span><b>Créer votre application</b><small>${fr('Décrivez votre besoin, on le construit avec vous — de A à Z.')}</small></span><span class="l">Décrire mon besoin ›</span></a></section>` },

  elan: { section: 'applications', titre: 'OP GESTION — Pilotez votre activité terrain | TEAM OP', desc: 'OP GESTION : interventions, planning & tournées, stock & box, encaissements, devis-factures et équipe — tout votre quotidien dans une application simple et rapide.',
    sousnav: { titre: 'OP GESTION', href: 'elan.html', liens: [L('Vue d\'ensemble', 'elan.html#apercu'), L('Fonctions', 'elan.html#fonctions'), L('Tarifs', 'tarifs.html#elan')], cta: `<a class="pilule" href="${ESPACE}">Demander un accès</a>` },
    corps: () => scene('Application de gestion tout-en-un', 'Pilotez votre activité terrain en un seul endroit.', 'Interventions, planning et tournées, stock et box, encaissements, devis-factures et équipe : OP GESTION réunit tout votre quotidien dans une application simple, rapide et accessible partout.',
        `<a class="bouton" href="${ESPACE}">Demander un accès</a><a class="lien-suite" href="tarifs.html#elan">Voir les tarifs ›</a>`)
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
      + [['3d', '3D — Anti-nuisibles', 'Dératisation · désinsectisation · désinfection', 1], ['plomberie', 'Plomberie', 'Dépannage · sanitaire · réseaux', 1], ['electricite', 'Électricité', 'Installation · normes · dépannage', 1], ['chauffage', 'Chauffage / Climatisation', 'CVC · entretien · contrats', 1], ['serrurerie', 'Serrurerie', 'Ouverture · sécurité · accès', 1], ['nettoyage', 'Nettoyage / Propreté', 'Bureaux · remise en état · vitrerie', 1], ['maconnerie', 'Maçonnerie / Gros œuvre', 'Construction · rénovation', 0], ['menuiserie', 'Menuiserie', 'Pose · agencement · fermetures', 0], ['peinture', 'Peinture / Revêtements', 'Intérieur · extérieur · sols', 0], ['paysagiste', 'Paysagiste / Espaces verts', 'Entretien · création · élagage', 0], ['couverture', 'Couverture / Zinguerie', 'Toiture · gouttières · étanchéité', 0], ['multiservices', 'Multiservices / Maintenance', 'Petits travaux · contrats', 0]]
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
    corps: () => scene('Métiers', 'Un outil qui parle votre métier.', 'Dites-nous ce que vous faites, TEAM OP se règle sur votre métier : types d\'intervention, fiche de rapport et modules utiles sont prêts dès le départ. Vous démarrez en quelques minutes, pas en quelques semaines.',
        `<a class="bouton" href="${ESPACE}">Créer mon espace</a>`)
      + `<section class="page" style="padding-top:10px;padding-bottom:20px"><div class="cartes-3">`
      + [['1', 'Renseignez votre entreprise', 'Nom, coordonnées… et surtout votre métier, au moment de créer votre espace.'], ['2', 'Tout se met en place', 'Types d\'intervention, fiche de rapport et modules de votre métier se règlent tout seuls. Vos produits et fournisseurs, vous les ajoutez à votre rythme.'], ['3', 'Vous travaillez', 'Planning, rapports, stock, bons de commande : votre équipe est opérationnelle dès le premier jour.']]
        .map(([n, t, d]) => `<div class="etape-carte"><b class="n">${n}</b><b class="t">${fr(t)}</b><span>${fr(d)}</span></div>`).join('')
      + `</div></section><section class="page" style="padding-top:60px;padding-bottom:20px"><h2 class="h2">Les métiers couverts.</h2><p class="intro">${fr('6 packs préconfigurés déjà disponibles — l\'application fonctionne pour tous les autres métiers de terrain.')}</p><div class="packs">`
      + [['m-3d', 'PACK COMPLET', 'bug', '3D — Hygiène anti-nuisibles', 'Dératisation · désinsectisation · désinfection', ['Registre sanitaire et biocides (AMM, Certibiocide)', 'Fiches de traitement par nuisible', 'Plans d\'appâtage et postes par site', 'Courbe d\'évolution de l\'infestation'], 1],
        ['m-plomberie', 'PACK DISPONIBLE', 'pipe', 'Plomberie', 'Dépannage · sanitaire · réseaux', ['Interventions type : fuite, chauffe-eau, débouchage…', 'Stock de pièces et consommables', 'Devis-factures et photos avant/après'], 1],
        ['m-electricite', 'PACK DISPONIBLE', 'bolt', 'Électricité', 'Installation · mise aux normes · dépannage', ['Interventions type : tableau, câblage, contrôle…', 'Matériel électrique en stock avec seuils', 'Rapports signés sur place'], 1],
        ['m-chauffage', 'PACK DISPONIBLE', 'flame', 'Chauffage / Climatisation', 'CVC · entretien · contrats annuels', ['Contrats d\'entretien à récurrence automatique', 'Passages planifiés et rappels d\'échéance', 'Historique complet par client'], 1],
        ['m-serrurerie', 'PACK DISPONIBLE', 'key', 'Serrurerie', 'Ouverture · sécurité · accès', [], 1],
        ['m-nettoyage', 'PACK DISPONIBLE', 'spray', 'Nettoyage / Propreté', 'Bureaux · remise en état · vitrerie', [], 1],
        ['m-maconnerie', 'PACK BIENTÔT', 'brick', 'Maçonnerie / Gros œuvre', 'Construction · rénovation · chantiers', ['Chantiers suivis dans la durée', 'Matériaux et quantités par chantier', 'Bons de commande aux négoces'], 0],
        ['m-menuiserie', 'PACK BIENTÔT', 'saw', 'Menuiserie', 'Pose · agencement · fabrication', ['Prises de cotes et photos dans le rapport', 'Planning de pose par équipe', 'Suivi des commandes fournisseurs'], 0],
        ['m-peinture', 'PACK BIENTÔT', 'brush', 'Peinture / Finitions', 'Intérieur · extérieur · décoration', ['Chantiers en plusieurs passages (préparation, couches…)', 'Consommation de peintures et consommables', 'Photos avant/après pour le client'], 0],
        ['m-paysagiste', 'PACK BIENTÔT', 'leaf', 'Paysagiste / Espaces verts', 'Entretien · création · élagage', [], 0]]
        .map(([id, tag, i, t, s, pts, pret]) => `<article class="pack" id="${id}"><span class="tag${pret ? ' pret' : ''}">${tag}</span><span class="tete"><span class="tuile">${ic(i)}</span><span><b>${fr(t)}</b><small>${fr(s)}</small></span></span>`
          + (pts.length ? `<ul>${pts.map(p => `<li>${COCHE(13)}<span>${fr(p)}</span></li>`).join('')}</ul>` : '')
          + (pret ? `<a href="${ESPACE}">Démarrer avec ce pack ›</a>` : '<a href="creer.html">En parler avec nous ›</a>') + '</article>').join('')
      + '</div></section>' },

  tarifs: { section: 'tarifs', titre: 'Tarifs — TEAM OP', desc: 'Les offres TEAM OP : Gratuit, Pro 15 €, Business 25 € (2 utilisateurs), Business Premium 50 € (3 utilisateurs + service 24h/24). OP MESSAGES a ses propres formules, à part.',
    corps: () => scene('Tarifs', 'Des tarifs simples et clairs.', 'Commencez gratuitement, passez à la vitesse supérieure quand votre équipe grandit. Sans engagement, sans frais cachés.', '', { courte: true })
      + `<section class="tarifs" id="tarifs"><span id="elan"></span><span id="opmessages"></span><div class="tarifs-in">
        <p class="intro">${fr('Prix HT par mois, sans engagement. Chaque abonnement inclut un nombre d\'utilisateurs — besoin de plus ? Ajoutez un abonnement, les places s\'additionnent.')}</p>
        <div class="segment" role="tablist" aria-label="Application"><button type="button" role="tab" id="onglet-gestion" aria-controls="formules-gestion" aria-selected="true">OP GESTION</button><button type="button" role="tab" id="onglet-msg" aria-controls="formules-msg" aria-selected="false" tabindex="-1">OP MESSAGES</button></div>
        <div class="formules" id="formules-gestion" role="tabpanel" aria-labelledby="onglet-gestion" style="--n:4">${formules(FORMULES_GESTION)}</div>
        <div class="formules" id="formules-msg" role="tabpanel" aria-labelledby="onglet-msg" style="--n:3" hidden>${formules(FORMULES_MESSAGES, true)}</div>
        <p class="note-msg">${fr('OP MESSAGES change d\'infrastructure : ses formules ouvriront avec la nouvelle version, et rien n\'est facturé d\'ici là.')}</p>
      </div></section>
      <section class="faq" id="faq"><h2 class="h2 moyen">Questions fréquentes.</h2><div class="liste">`
      + [['Puis-je changer de formule à tout moment ?', 'Oui. Vous passez de Gratuit à Pro, Business ou Business Premium quand vous voulez, et vous pouvez redescendre ou arrêter à tout moment — aucun engagement de durée.'],
        ['Comment fonctionnent les places utilisateur ?', 'Chaque abonnement inclut un nombre de comptes : 1 en Gratuit, 1 en Pro, 2 en Business, 3 en Business Premium. Besoin de plus ? Ajoutez un abonnement : les places s\'additionnent (par exemple, Business × 2 = 4 comptes).'],
        ['Faut-il installer quelque chose ?', 'Non. TEAM OP est une vraie application qui s\'installe en un clic sur iPhone, Android, Mac et Windows. Elle s\'ouvre aussi dans le navigateur, sans rien télécharger.'],
        ['Mes données sont-elles en sécurité ?', 'Oui : chiffrement AES-256, un espace totalement isolé par entreprise, et une sauvegarde complète exportable à tout moment.'],
        ['Y a-t-il des frais d\'installation ?', 'Non, aucun frais caché. L\'accompagnement à la mise en route est inclus dans Business Premium.'],
        ['Que se passe-t-il si j\'arrête ?', 'Vos données vous appartiennent : vous exportez tout en un clic avant de partir. Rien n\'est retenu en otage.']]
        .map(([q, r], n) => `<div class="q"><button type="button" aria-expanded="false" aria-controls="r${n}"><b>${fr(q)}</b>${PLUS.replace('width="14" height="14"', 'width="16" height="16"')}</button><div class="r" id="r${n}"><div><p>${fr(r)}</p></div></div></div>`).join('')
      + '</div></section>' },

  pourquoi: { section: 'pourquoi', titre: 'Pourquoi TEAM OP ?', desc: 'Sécurité AES-256, temps réel, développé en France : pourquoi des équipes terrain choisissent TEAM OP.',
    corps: () => {
      const cartes = l => '<div class="cartes-3">' + l.map(([i, t, x]) => `<div class="carte-v"><span class="tuile">${ic(i)}</span><b>${fr(t)}</b><span class="t">${fr(x)}</span></div>`).join('') + '</div>';
      return scene('Pourquoi TEAM OP', 'Pourquoi choisir TEAM OP ?', 'Ce que nous proposons, comment nous protégeons vos données et pourquoi des équipes terrain nous font confiance au quotidien.')
        + `<section class="bloc" id="services"><div class="bloc-in"><h2 class="h2">Nos services.</h2><div style="height:28px"></div>${cartes([['grid', 'Des applications métier prêtes à l\'emploi', 'Gestion d\'activité, messagerie d\'équipe — activez ce dont vous avez besoin, quand vous en avez besoin. Un seul compte pour tout.'], ['chat', 'Un accompagnement direct', 'Un contact humain (support@teamop.fr), des mises à jour régulières et une prise en main rapide — sans formation compliquée.'], ['device', 'Installation sur tous vos appareils', 'Une vraie application : icône sur l\'écran d\'accueil, plein écran, notifications — iPhone, Android, Mac, Windows, sans passer par un magasin d\'applications.'], ['building', 'Un espace par entreprise', 'Chaque entreprise (SIRET) a son espace isolé : vos données ne croisent jamais celles des autres.']])}</div></section>
        <section class="bloc teinte" id="partenaire"><div class="bloc-in"><h2 class="h2">Au service des entreprises et de leurs besoins.</h2><p class="intro">${fr('TEAM OP n\'est pas un logiciel figé : nous sommes une équipe au service de la vôtre. On écoute, on adapte et on construit avec vous — votre besoin d\'aujourd\'hui devient la fonctionnalité de demain.')}</p>${cartes([['ear', 'À l\'écoute', 'Chaque retour est lu et traité — vous parlez directement à ceux qui développent l\'outil.'], ['wrench', 'Sur mesure', 'Un besoin particulier ? On étudie votre demande et on construit l\'outil qu\'il vous faut.'], ['rocket', 'Un vrai partenaire', 'Accompagnement à la mise en route, support réactif et évolutions régulières incluses.']])}</div></section>
        <section class="bloc" id="engagements"><div class="bloc-in"><h2 class="h2">Nos engagements techniques.</h2><div style="height:28px"></div>${cartes([['lock', 'Sécurité AES-256', 'Vos données sont chiffrées de bout en bout et hébergées de façon sécurisée. Personne d\'autre que votre équipe n\'y accède.'], ['bolt', 'Temps réel', 'Chaque action est visible immédiatement par toute l\'équipe, sans rafraîchir la page — au bureau comme sur le terrain.'], ['flag', 'Développé en France', 'Conçu et maintenu par TEAM OP — un interlocuteur unique, réactif, qui connaît votre métier.']])}</div></section>`; } },
};

/* le lanceur de l'écran d'accueil : une PWA installée rouvre la dernière application choisie (?hub=1 pour revenir au choix) */
const LANCEUR = `<script>try{var pwa=matchMedia('(display-mode: standalone)').matches||navigator.standalone===true||document.referrer.indexOf('android-app://')===0,d=localStorage.getItem('teamop_app');if(pwa&&(d==='app.html'||d==='messages.html')&&!/hub/.test(location.search))location.replace('/'+d);}catch(e){}</script>`;

function page(cle, o) {
  const P = PAGES[cle], racine = o ? !!o.racine : A_LA_RACINE;
  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#f0f3f8" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#0b1426" media="(prefers-color-scheme: dark)">
<meta name="color-scheme" content="light dark">
${racine ? '' : '<meta name="robots" content="noindex">\n'}<title>${esc(P.titre)}</title>
<meta name="description" content="${esc(P.desc)}">
<link rel="icon" href="/favicon.ico" sizes="any">
<link rel="icon" type="image/png" sizes="32x32" href="/icons/teamop-favicon-32.png">
<link rel="apple-touch-icon" href="/icons/teamop-apple-touch.png">
<link rel="manifest" href="/manifest-teamop.webmanifest">
${cle === 'index' ? LANCEUR + '\n' : ''}<link rel="stylesheet" href="/vitrine/site.css">
<link rel="stylesheet" href="/vitrine/appareils.css">
</head>
<body>
${entete(P.section, P.sousnav)}
<main>
${P.corps()}
${P.cta === false ? '' : commencer()}
</main>
${pied()}
<script src="/vitrine/site.js" defer></script>
</body>
</html>
`;
}

if (require.main === module) {
  fs.mkdirSync(DEST, { recursive: true });
  for (const cle of Object.keys(PAGES)) {
    const f = path.join(DEST, cle + '.html');
    fs.writeFileSync(f, page(cle));
    console.log('✓', path.relative(RACINE, f), Math.round(fs.statSync(f).size / 1024) + ' Ko');
  }
}
module.exports = { PAGES, page, FORMULES_GESTION, FORMULES_MESSAGES, VOLETS, DEST };
