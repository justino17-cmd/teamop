/* Générateur du PDF « Comment fonctionnent les droits » — OP GESTION (demande de Justin, 26 septembre 2026).
   Toutes les listes (catégories, rubriques, cases, libellés, listes de départ) sont LUES dans
   app.html, jamais recopiées à la main : le document dit ce que le code fait. Les contrôles du haut
   refusent d'écrire si ce qu'il lit ne ressemble plus à ce qu'il décrit — et les phrases citées
   doivent exister dans l'application.
   Le texte, lui, est écrit à la main : quand une règle de droits change, le relire ici.
     node scratchpad/droits-pdf/gen.js              # écrit droits.html à côté (non versionné)
     /opt/pw-browsers/chromium --headless=new --no-sandbox --disable-gpu --no-pdf-header-footer \
       --print-to-pdf=droits.pdf file://$PWD/scratchpad/droits-pdf/droits.html */
const fs = require('fs'), path = require('path');
const DEPOT = path.join(__dirname, '..', '..');
const SRC = fs.readFileSync(process.env.APP || path.join(DEPOT, 'app.html'), 'utf8');
const OUT = process.env.OUT || path.join(__dirname, 'droits.html');

function bloc(debut, fin) {
  const i = SRC.indexOf(debut); if (i < 0) throw new Error('ancre introuvable : ' + debut);
  const j = SRC.indexOf(fin, i); if (j < 0) throw new Error('fin introuvable : ' + debut);
  return SRC.slice(i, j + fin.length);
}
const ligne = debut => { const i = SRC.indexOf(debut); if (i < 0) throw new Error('ancre introuvable : ' + debut); return SRC.slice(i, SRC.indexOf('\n', i)); };
const evalue = (code, nom) => new Function(code + '\nreturn ' + nom + ';')();

const APP_VERSION = evalue(ligne("const APP_VERSION = '"), 'APP_VERSION');
const NAV = evalue(bloc('const NAV = [', '\n];'), 'NAV');
const SOUS_CATS = evalue(ligne('const SOUS_CATS='), 'SOUS_CATS');
const PERM_GRPS = evalue(ligne('const PERM_GRPS='), 'PERM_GRPS');
const PERM_GRP_OF = evalue(ligne('const PERM_GRP_OF='), 'PERM_GRP_OF');
const PERM_SPECIAUX = evalue(ligne('const PERM_SPECIAUX='), 'PERM_SPECIAUX');
const USER_CAPS = evalue(bloc('const USER_CAPS=[', '\n];'), 'USER_CAPS');
const CAPS_HERITE = evalue(bloc('const CAPS_HERITE = {', '\n};'), 'CAPS_HERITE');
const ROLE = evalue(ligne('const ROLE = {'), 'ROLE');
const PLAN_BLOQUE = evalue(bloc('const PLAN_BLOQUE={', '\n};'), 'PLAN_BLOQUE');
const PLANS = evalue(bloc('const PLANS={', '\n};'), 'PLANS');
const METIERS = evalue(bloc('const METIERS={', '\n};'), 'METIERS');
const METIERS_ORDRE = evalue(ligne('const METIERS_ORDRE='), 'METIERS_ORDRE');
const DEF = evalue(bloc('function defaultPerms(){', '\n}\n'), 'defaultPerms')();

/* ── contrôles : le document ne part pas si ce qu'il lit ne ressemble plus à ce qu'il décrit ── */
const avecSousCats = items => items.flatMap(it => [it].concat(SOUS_CATS.filter(s => s.parent === it.k)));
const tous = avecSousCats(NAV.flatMap(x => x.items));
const editeur = avecSousCats(NAV.filter(x => PERM_GRP_OF[x.g]).flatMap(x => x.items)).filter(it => it.k !== 'dashboard' && it.k !== 'permissions');
const dansCat = new Set([].concat(...Object.values(PERM_SPECIAUX)));
const autres = USER_CAPS.filter(c => !dansCat.has(c[0]));
const ROLES = ['technicien', 'commercial', 'compta', 'chefEquipe', 'dr'];
const assert = (c, m) => { if (!c) { console.error('✗ ' + m); process.exit(1); } };
assert(/^\d{3,}$/.test(APP_VERSION), 'version lue : ' + APP_VERSION);
assert(PERM_GRPS.length === 10, '10 catégories');
assert(editeur.length === 41, '41 rubriques réglables (lu : ' + editeur.length + ')');
assert(autres.map(c => c[0]).join() === 'creerIntervention,supprimer', 'Autres droits = 2 cases (lu : ' + autres.map(c => c[0]).join() + ')');
ROLES.forEach(r => tous.forEach(it => assert(typeof DEF[r][it.k] === 'boolean', r + '.' + it.k + ' a une valeur')));
Object.values(PERM_SPECIAUX).flat().forEach(k => assert(USER_CAPS.some(c => c[0] === k), 'libellé de ' + k));
/* les phrases citées telles quelles doivent exister dans l'application */
['Cette rubrique n\\\'est pas ouverte à ton compte', 'Toute sortie de stock passe par le DR', 'Ses mouvements de box passent par la validation DR',
 'Effacer ce qui est réglé à part — revenir au rôle', 'Valider ses droits', 'Enregistrer comme profil', 'Appliquer un profil…', 'Directeur régional responsable',
 'que tu n\\\'as pas toi-même', 'Utiliser Devis IA', 'Ventes → Ajouter'].forEach(t => assert(SRC.includes(t), 'phrase de l’application : ' + t));
/* v753 : le texte ci-dessous décrit « Validations DR » ouvert d'office et le rôle maison qui part de la liste du
   technicien (droits compris) — sur une page plus ancienne il dirait faux : on refuse d'écrire. */
['function validationsOuvertes(u){', 'function tableDuRole(role){', 'il suit la liste de son rôle'].forEach(t => assert(SRC.includes(t), 'v753 attendue : ' + t));

/* ── les règles, telles que le code les écrit (capDeduitRegle, catDeduitRegle) ── */
const capsRole = r => Object.fromEntries(Object.entries(CAPS_HERITE[r] || {}).map(([k, v]) => [k, !!v]));
function cap(r, k) {
  const c = capsRole(r);
  if (k in c) return c[k];
  if (['voirEquipe', 'corrigerPointages', 'gererFiches'].includes(k)) return cap(r, 'voirTout') || cap(r, 'voirPointages');
  if (k === 'gererGroupes') return cap(r, 'voirTout') && cap(r, 'creerIntervention');
  if (k === 'mailPro') return cap(r, 'voirTout');
  if (k === 'gererBoxes') return cap(r, 'supprimer');
  return false;
}
const act = (r, g, d) => d === 'supprimer' ? cap(r, 'supprimer') : (d === 'ajouter' && g === 'int') ? cap(r, 'creerIntervention') : true;

const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const capLbl = k => (USER_CAPS.find(c => c[0] === k) || [k, k, ''])[1];
const capDesc = k => (USER_CAPS.find(c => c[0] === k) || [k, '', ''])[2];
const lbl = k => { const it = tous.find(x => x.k === k); return it ? it.l : k; };
const ic = k => { const it = tous.find(x => x.k === k); return it ? it.ic : ''; };
const grpItems = g => avecSousCats(NAV.filter(x => PERM_GRP_OF[x.g] === g).flatMap(x => x.items)).filter(it => it.k !== 'dashboard' && it.k !== 'permissions');
const titre = g => (PERM_GRPS.find(x => x[0] === g) || [g, g])[1];
const logo = 'data:image/png;base64,' + fs.readFileSync(path.join(DEPOT, 'icons', 'opgestion-512.png')).toString('base64');
const q = t => '« ' + t + ' »';   // guillemets français, espaces insécables
const DATE = process.env.DATE || new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

/* les numéros de section, à un seul endroit : les renvois ne peuvent pas se tromper */
const N = { essentiel: 1, ordre: 2, ou: 3, blocs: 4, cats: 5, suivent: 6, perim: 7, valid: 8, creer: 9, profils: 10, forfait: 11, depart: 12, savoir: 13 };
const h2 = (k, t, cls) => `<h2${cls ? ' class="' + cls + '"' : ''}><span>${N[k]}</span>${t}</h2>`;

/* ── l'éditeur dessiné pour un technicien de la liste de départ ── */
const exR = 'technicien', exOuv = 'ventes';
const exVus = editeur.filter(m => DEF[exR][m.k]).length;
const exCats = PERM_GRPS.map(([g, t]) => {
  const ms = grpItems(g), sans = ['tdb', 'admin'].includes(g);
  const n = ms.filter(m => DEF[exR][m.k]).length;
  const a = sans ? null : ['ajouter', 'modifier', 'supprimer'].filter(d => act(exR, g, d)).length;
  return { g, t, n, total: ms.length, a };
});
const exO = exCats.find(c => c.g === exOuv);
const exAutres = autres.filter(c => cap(exR, c[0])).length;
const pastille = n => `<span class="pastille">${n}</span>`;

const P = [];
P.push(`
<header class="couv">
  <div class="marque"><img src="${logo}" alt=""><div><b>OP GESTION</b><span>Guide de l’administrateur</span></div></div>
  <h1>Comment fonctionnent les droits</h1>
  <p class="chapeau">Qui voit quoi, qui peut faire quoi — et où ça se règle.</p>
  <p class="meta">Version ${APP_VERSION} · ${DATE} · les listes de ce document sont lues dans le code de l’application</p>
</header>

${h2('essentiel', 'L’essentiel')}
<div class="grille2">
  <div class="carte"><h3>Le rôle n’est qu’un nom</h3><p>Technicien, DR, Commercial… servent à s’y retrouver et donnent un <b>point de départ</b>. Ce sont les <b>cases</b> de chaque personne qui ouvrent ou ferment.</p></div>
  <div class="carte"><h3>L’administrateur a tout</h3><p>Tous les droits, sur tout, tout le temps — dans les limites du forfait et du métier. Rien à régler pour lui, et rien qu’on puisse lui retirer sans changer son rôle.</p></div>
  <div class="carte"><h3>Quatre familles de réglages</h3><p>Les <b>menus</b> qu’une personne voit · ce qu’elle peut <b>faire</b> dans chaque catégorie (Ajouter, Modifier, Supprimer) · des <b>droits spéciaux</b> · les <b>box</b> et véhicules qu’elle ouvre.</p></div>
  <div class="carte"><h3>Un seul endroit, un seul geste</h3><p>Utilisateurs → la personne → on coche → <b>${q('✓ Valider ses droits')}</b>. C’est actif tout de suite, et sur le téléphone de la personne dès la synchronisation suivante.</p></div>
  <div class="carte"><h3>Seul l’administrateur modifie des droits</h3><p>Quelqu’un qui a ${q('Créer des utilisateurs')} peut ajouter des comptes, mais <b>ne peut pas donner un droit qu’il n’a pas</b> lui-même.</p></div>
  <div class="carte"><h3>Le forfait et le métier passent avant</h3><p>Une rubrique hors forfait ou hors métier n’apparaît pour <b>personne</b>, administrateur compris. Aucune case ne la rouvre.</p></div>
</div>

${h2('ordre', 'Dans quel ordre l’application décide')}
<p>Pour chaque menu et chaque case, l’application se pose les mêmes questions, <b>dans cet ordre</b>, et s’arrête à la première réponse&#8239;:</p>
<div class="etapes">
  <div class="etape"><b>1</b><div><h3>Le forfait et le métier</h3><p>La rubrique en est exclue&#8239;? Fermée pour tout le monde (section&nbsp;${N.forfait}).</p></div></div>
  <div class="etape"><b>2</b><div><h3>L’administrateur</h3><p>C’est un administrateur&#8239;? Oui à tout.</p></div></div>
  <div class="etape"><b>3</b><div><h3>Ce qui est réglé pour la personne</h3><p>Ce qui a été validé sur sa ligne — ou posé par un profil — fait loi.</p></div></div>
  <div class="etape"><b>4</b><div><h3>La liste de son rôle</h3><p>Sinon, le réglage de son rôle&#8239;: le point de départ de ses comptes (section&nbsp;${N.depart})&#8239;; un rôle créé à la main part de celle du technicien.</p></div></div>
  <div class="etape"><b>5</b><div><h3>Le défaut</h3><p>Sinon, une case qui <b>suit</b> une autre (section&nbsp;${N.suivent}). Le reste&#8239;: droits spéciaux fermés, Ajouter et Modifier ouverts.</p></div></div>
</div>
<div class="encart"><b>Changer le rôle de quelqu’un</b> ne touche pas à ce qui a été réglé à part pour lui&#8239;: seul ce qui suivait son rôle change. Pour qu’il suive de nouveau entièrement son rôle&#8239;: ${q('↩ Effacer ce qui est réglé à part — revenir au rôle')}, sur sa ligne.</div>
`);

P.push(`
${h2('ou', 'Où ça se règle', 'saut')}
<p><b>Utilisateurs</b> → toucher le nom d’une personne&#8239;: sa ligne se déplie, et c’est l’éditeur de ses droits. Chaque interrupteur montre ce que la personne a <b>aujourd’hui</b>&#8239;; rien ne s’enregistre avant ${q('✓ Valider ses droits')}. Ci-dessous, un technicien de la liste de départ.</p>
<div class="ecran">
  <div class="ecran-t"><div class="av">LM</div><div><b>Léa Martin</b><span>Technicien · exemple</span></div>${pastille(1)}</div>
  <div class="resume">Voit <b>${exVus}</b> menus sur ${editeur.length} · <b>1</b> box · <i>suit son rôle, rien de réglé à part</i></div>
  ${exCats.map(c => {
    const ouv = c.g === exOuv;
    const tete = `<div class="cat${ouv ? ' ouverte' : ''}"><span class="ct">${esc(c.t)}</span><span class="cn">${c.n}/${c.total} menu${c.total > 1 ? 's' : ''}${c.a === null ? '' : ' · ' + c.a + '/3 actions'}</span><span class="chev">${ouv ? '▴' : '▾'}</span>${ouv ? pastille(2) : ''}</div>`;
    if (!ouv) return tete;
    return tete + `<div class="cat-corps">
      <div class="sec">👁 Ce qu’il voit — menus</div>
      ${grpItems(c.g).map(m => `<div class="rg"><span>${m.parent ? '↳ ' : ''}${m.ic} ${esc(m.l)}</span><i class="sw${DEF[exR][m.k] ? ' on' : ''}"></i></div>`).join('')}
      <div class="sec">✎ Ce qu’il peut faire ici</div>
      ${[['ajouter', '＋ Ajouter'], ['modifier', '✎ Modifier'], ['supprimer', '🗑 Supprimer']].map(([d, l]) => `<div class="rg"><span>${l}${d === 'supprimer' ? ' <em>suit ' + q('Supprimer des éléments') + '</em>' : ''}</span><i class="sw${act(exR, c.g, d) ? ' on' : ''}"></i></div>`).join('')}
      <div class="sec">🔑 Droits spéciaux</div>
      ${(PERM_SPECIAUX[c.g] || []).map(k => `<div class="rg"><span>${esc(capLbl(k))}</span><i class="sw${cap(exR, k) ? ' on' : ''}"></i></div>`).join('')}
    </div>`;
  }).join('')}
  <div class="cat"><span class="ct">Autres droits</span><span class="cn">${exAutres}/${autres.length}</span><span class="chev">▾</span>${pastille(3)}</div>
  <div class="cat"><span class="ct">📦 Box qu’il ouvre</span><span class="cn">1/3</span><span class="chev">▾</span>${pastille(4)}</div>
  <div class="pied"><span class="faux-sel">🎛 Appliquer un profil…</span><span class="faux-bt g">💾 Enregistrer comme profil</span>${pastille(5)}</div>
  <div class="pied"><span class="faux-bt">✓ Valider ses droits</span><span class="lien">↩ Effacer ce qui est réglé à part — revenir au rôle</span>${pastille(6)}</div>
</div>
<ol class="legende">
  <li><b>La ligne de résumé</b>&#8239;: combien de menus sur ${editeur.length}, combien de box, s’il valide, et s’il suit simplement son rôle.</li>
  <li><b>Une catégorie</b>&#8239;: ${q(exO.n + '/' + exO.total + ' menus · ' + exO.a + '/3 actions')} = ${exO.n} rubrique${exO.n > 1 ? 's' : ''} ouverte${exO.n > 1 ? 's' : ''} sur les ${exO.total} de la catégorie, et ${exO.a} des 3 gestes. <i>Tableau de bord</i> et <i>Administration</i> n’ont que des menus.</li>
  <li><b>Autres droits</b>&#8239;: les deux cases rangées dans aucune catégorie (section&nbsp;${N.cats}).</li>
  <li><b>Box qu’il ouvre</b> (et <b>Véhicules qu’il voit</b>, s’il y en a)&#8239;: masqué quand ${q('Tout voir')} est coché, qui rend la question sans objet.</li>
  <li><b>Les profils</b>&#8239;: poser d’un coup des droits enregistrés, ou garder ceux-ci comme modèle (section&nbsp;${N.profils}).</li>
  <li><b>Valider</b> enregistre&#8239;; <b>revenir au rôle</b> efface ce qui a été réglé à part pour cette personne (ses box cochées restent).</li>
</ol>
`);

P.push(`
${h2('blocs', 'Dans une catégorie : trois blocs', 'saut')}
<div class="grille3">
  <div class="carte"><h3>👁 Ce qu’il voit — menus</h3><p>Un interrupteur par rubrique. Éteint, la rubrique <b>disparaît du menu</b> et son adresse est refusée&#8239;: un lien direct ramène au Tableau de bord avec ${q('🔒 Cette rubrique n’est pas ouverte à ton compte')}.</p></div>
  <div class="carte"><h3>✎ Ce qu’il peut faire ici</h3><p><b class="ligne">＋ Ajouter · ✎ Modifier · 🗑 Supprimer</b>Le bouton ET l’enregistrement relisent la case&#8239;: passer par un autre chemin (un menu, une recherche, une notification) ne contourne rien.</p></div>
  <div class="carte"><h3>🔑 Droits spéciaux</h3><p>Des gestes précis, propres à la catégorie&#8239;: tout voir, annuler, valider, gérer les box… Détaillés ci-dessous, avec le texte que l’application affiche.</p></div>
</div>
<p class="note">Le <b>Tableau de bord</b> lui-même n’a pas d’interrupteur&#8239;: tout le monde l’a.</p>

${h2('cats', 'Les dix catégories')}
${PERM_GRPS.map(([g, t]) => {
  const ms = grpItems(g), sp = PERM_SPECIAUX[g] || [], sans = ['tdb', 'admin'].includes(g);
  return `<div class="cb">
    <div class="cb-t"><b>${esc(t)}</b><span>${ms.length} menu${ms.length > 1 ? 's' : ''}${sans ? ' · menus seulement' : ' · Ajouter · Modifier · Supprimer'}</span></div>
    <div class="cb-m">${ms.map(m => `<span>${m.parent ? '↳ ' : ''}${m.ic} ${esc(m.l)}${m.parent ? ' <em>(dans ' + esc(lbl(m.parent)) + ')</em>' : ''}</span>`).join('')}</div>
    ${sp.length ? `<div class="cb-s">${sp.map(k => `<div class="sp"><b>🔑 ${esc(capLbl(k))}</b>${capDesc(k) ? '<span>' + esc(capDesc(k)) + '</span>' : ''}</div>`).join('')}</div>` : ''}
  </div>`;
}).join('')}
<div class="cb autres">
  <div class="cb-t"><b>Autres droits</b><span>rangés dans aucune catégorie</span></div>
  <div class="cb-s">${autres.map(c => `<div class="sp"><b>🔑 ${esc(c[1])}</b>${c[2] ? '<span>' + esc(c[2]) + '</span>' : '<span>Nouvelles interventions et planification.</span>'}</div>`).join('')}</div>
  <p class="cb-n">Ces deux cases sont aussi le point de départ des gestes de catégorie&#8239;: ${q('🗑 Supprimer')} suit ${q('Supprimer des éléments')} partout, et ${q('Interventions → ＋ Ajouter')} suit ${q('Créer / planifier des interventions')} (section&nbsp;${N.suivent}).</p>
</div>
`);

P.push(`
${h2('suivent', 'Les cases qui suivent d’autres cases')}
<p>Tant qu’on n’y a pas touché, ces cases <b>bougent toutes seules</b> avec leur case de base, en direct, dans l’éditeur. Dès qu’on en touche une et qu’on valide, c’est une décision écrite&#8239;: elle ne suit plus.</p>
<table class="simple">
  <thead><tr><th style="width:46%">La case…</th><th>…suit, tant qu’on n’y a pas touché</th></tr></thead>
  <tbody>
    <tr><td>${esc(capLbl('voirEquipe'))}<br>${esc(capLbl('corrigerPointages'))}<br>${esc(capLbl('gererFiches'))}</td><td>${q('Tout voir')} <b>ou</b> ${q('Voir les pointages de son équipe')}</td></tr>
    <tr><td>${esc(capLbl('gererGroupes'))}</td><td>${q('Tout voir')} <b>et</b> ${q('Créer / planifier des interventions')}</td></tr>
    <tr><td>${esc(capLbl('mailPro'))}</td><td>${q('Tout voir')}</td></tr>
    <tr><td>${esc(capLbl('gererBoxes'))}</td><td>${q('Supprimer des éléments')}</td></tr>
    <tr><td>🗑 Supprimer, dans chaque catégorie</td><td>${q('Supprimer des éléments')}</td></tr>
    <tr><td>＋ Ajouter, dans Interventions</td><td>${q('Créer / planifier des interventions')}</td></tr>
    <tr><td>${esc(capLbl('stockage'))}</td><td><b>Rien</b>&#8239;: l’administrateur seul, tant qu’on ne la coche pas pour quelqu’un</td></tr>
  </tbody>
</table>

${h2('perim', 'Ouvrir une rubrique ne veut pas dire tout y voir')}
<div class="grille2">
  <div class="carte"><h3>${q('Tout voir')}</h3><p>Toutes les interventions et toutes les box de l’entreprise. <b>Sans</b>&#8239;: ses interventions à lui, et les box qu’il ouvre.</p></div>
  <div class="carte"><h3>Box qu’il ouvre</h3><p>Les box cochées pour lui, plus celles visibles par toute l’équipe, celles où sa fiche technicien est cochée, et celles dont il est responsable. Décocher une box ouverte d’office la retire à <b>cette personne seulement</b>.</p></div>
  <div class="carte"><h3>L’équipe rattachée</h3><p>Sur la fiche de chacun&#8239;: ${q('Chef d’équipe')} et ${q('Directeur régional responsable')}. Dès qu’une personne au moins est rattachée à un chef ou à un DR, celui-ci — <b>même avec ${q('Tout voir')}</b> — ne voit plus que ce qui concerne son équipe et lui-même&#8239;: leurs interventions, leurs clients, leurs devis, leurs pointages, leurs box. Tant que personne ne lui est rattaché, rien ne change.</p></div>
  <div class="carte"><h3>Le stockage (le stock hors des box)</h3><p>Il ne s’ouvre que par la case ${q('Se servir dans le stockage')}&#8239;: ni ${q('Tout voir')}, ni une liste de box ne l’ouvrent. Par défaut&#8239;: l’administrateur seul.</p></div>
  <div class="carte"><h3>Pointages</h3><p>Chacun voit ses propres heures. ${q('Voir les pointages de son équipe')} ouvre les feuilles de temps de son périmètre, et leur export PDF.</p></div>
  <div class="carte"><h3>Interventions sans technicien</h3><p>Qui peut planifier (${q('Déplacer / réassigner le planning')}) les voit pour les affecter — dans le planning, la liste et la recherche seulement, jamais leurs clients ni leurs documents.</p></div>
</div>
`);

P.push(`
${h2('valid', 'La validation DR')}
<div class="flux">
  <div class="bloc"><span>Une personne <b>soumise</b> à la validation sort, prend ou reçoit du stock</span></div><div class="fl">→</div>
  <div class="bloc"><span>Le mouvement <b>attend</b> dans ${q('Validations DR')}</span></div><div class="fl">→</div>
  <div class="bloc"><span>Un <b>valideur</b> valide ou refuse</span></div>
</div>
<table class="simple">
  <tbody>
    <tr><th>Qui valide</th><td>Les comptes qui ont ${q(capLbl('validerDR'))} (catégorie Achats internes). Ils reçoivent les alertes ${q('à valider')}.</td></tr>
    <tr><th>Qui est soumis</th><td><b>Tout le monde</b>, si l’administrateur a allumé Paramètres → ${q('Toute sortie de stock passe par le DR')}.<br>Sinon, la personne dont la fiche (Utilisateurs → ✎) porte ${q('🔒 Ses mouvements de box passent par la validation DR')}.<br>Les valideurs ne le sont jamais&#8239;: ils se valideraient eux-mêmes.</td></tr>
    <tr><th>Ce qui attend</th><td>Arrivages, réceptions, prises ＋/−, retraits de box, produits pris en intervention. Les demandes de commande (${q('Mes demandes')}) passent, elles, <b>toujours</b> par un valideur.</td></tr>
    <tr><th>À qui ça part</th><td>Au DR choisi sur la fiche de la personne (${q('Directeur régional responsable')}), et au responsable de la box concernée s’il peut valider. Si personne n’est choisi&#8239;: à tous les valideurs.</td></tr>
    <tr><th>Pendant ses congés</th><td>Un DR peut donner la main à un collègue, avec des dates. Le remplaçant valide à sa place et voit ce qu’il faut pour le faire, sans devenir le DR de l’équipe&#8239;; tout s’éteint seul au retour.</td></tr>
  </tbody>
</table>
<div class="encart"><b>D’office&#8239;:</b> ${q('Validations DR')} s’ouvre de lui-même à qui a la case de validation (il y valide, et reçoit les alertes ${q('à valider')}) et à qui est soumis à la validation (il y suit ses mouvements et la décision du DR). Sur sa ligne, l’interrupteur paraît alors ouvert et verrouillé, avec la raison écrite dessous. Seul le forfait passe avant.</div>

${h2('creer', 'Créer un compte')}
<ol class="pas">
  <li><b>Utilisateurs → ${q('＋ Utilisateur')}</b> — l’administrateur, ou quelqu’un qui a ${q('Créer des utilisateurs')} (Temps &amp; équipe), s’il reste une place dans le forfait&#8239;: ${['gratuit', 'pro', 'business', 'premium'].map(f => esc(PLANS[f].l) + '&nbsp;' + PLANS[f].maxU).join(' · ')} par abonnement.</li>
  <li><b>Prénom ET nom</b>, obligatoires&#8239;: deux comptes ne peuvent pas porter le même prénom + nom. Un identifiant unique, et l’e-mail, facultatif (il sert à ${q('Mot de passe oublié')} et à recevoir ses accès).</li>
  <li><b>Le rôle</b> — un nom, et sa liste de départ. <b>Le profil de droits</b> (administrateur) pose tout d’un coup.</li>
  <li><b>À qui il est rattaché</b>&#8239;: validation DR, chef d’équipe, DR responsable, et les box et véhicules qu’il ouvre. Seules les cases <b>cochées</b> sont posées&#8239;: ne rien cocher ne retire rien.</li>
  <li><b>Le mot de passe provisoire</b> (8 caractères minimum) est proposé tout seul. Il part par e-mail avec le lien de connexion si une adresse est renseignée, et s’affiche pour être transmis&#8239;; à sa première connexion, la personne choisit le sien.</li>
</ol>
<div class="grille2">
  <div class="carte"><h3>Sans profil</h3><p>Le compte suit la liste de son rôle. On ajuste ensuite sur sa ligne.</p></div>
  <div class="carte"><h3>Créé par un non-administrateur</h3><p>Ce que le créateur n’a pas est retiré au nouveau compte, et le message le dit (${q('Compte créé sans N droits que tu n’as pas toi-même…')}). Seul un administrateur crée un administrateur, et seul un administrateur modifie un compte existant.</p></div>
  <div class="carte"><h3>Ce qu’un rôle règle vraiment</h3><p>En plus de sa liste de départ, deux choses seulement (🏷 Rôles)&#8239;: il <b>crée une fiche technicien</b> (nécessaire pour les interventions, un véhicule, le pointage) et il <b>peut être chef</b> de quelqu’un.</p></div>
  <div class="carte"><h3>Un rôle créé à la main</h3><p>Il n’a pas de liste à lui&#8239;: il part de celle du ${q('Technicien')} — ses menus comme ses droits spéciaux. On l’ajuste ensuite, ou on lui applique un profil.</p></div>
</div>

${h2('profils', 'Les profils de droits')}
<div class="grille2">
  <div class="carte"><h3>Une photo des droits</h3><p>Les menus, les actions et les droits spéciaux d’une personne, enregistrés sous un nom de métier réel (${q('Technicien 3D')}, ${q('Chef d’équipe Nord')}). Pour en créer un&#8239;: régler quelqu’un, puis ${q('💾 Enregistrer comme profil')}.</p></div>
  <div class="carte"><h3>Le poser</h3><p>À la création (menu ${q('Profil de droits')}), il est posé directement. Sur la ligne d’une personne (${q('🎛 Appliquer un profil…')}), il <b>coche</b>&#8239;: on relit, puis on valide. Modifier ou supprimer un profil&#8239;: ${q('🎛 Profils')}, en haut de Utilisateurs.</p></div>
  <div class="carte"><h3>Jamais les box</h3><p>Une box dépend du secteur de la personne, pas de son métier&#8239;: on les coche sur sa ligne.</p></div>
  <div class="carte"><h3>Le rôle ne change pas</h3><p>Le profil habille le compte&#8239;; il ne remplace pas son rôle.</p></div>
</div>
`);

const nomsPlan = f => PLAN_BLOQUE[f].filter(k => tous.some(x => x.k === k));
const pro = nomsPlan('pro'), gratuitEnPlus = nomsPlan('gratuit').filter(k => !pro.includes(k));
const masqueMetier = METIERS_ORDRE.filter(m => (METIERS[m].masque || []).length);
const masque0 = METIERS[masqueMetier[0]].masque;
assert(masqueMetier.every(m => JSON.stringify(METIERS[m].masque) === JSON.stringify(masque0)), 'les métiers masquent la même liste');
assert(!PLAN_BLOQUE.premium.length && !PLAN_BLOQUE.business.length, 'Business et Business Premium ne masquent rien');
const rub = k => `<span class="rb">${ic(k)} ${esc(lbl(k))}</span>`;
P.push(`
${h2('forfait', 'Le forfait et le métier passent avant')}
<p>Ils décident pour <b>toute l’entreprise</b>, administrateur compris&#8239;: une rubrique qu’ils excluent n’apparaît pour personne, et aucune case ne la rouvre.</p>
<table class="simple">
  <thead><tr><th style="width:24%">Forfait</th><th>Rubriques absentes</th></tr></thead>
  <tbody>
    <tr><td><b>${esc(PLANS.premium.l)}</b><br><b>${esc(PLANS.business.l)}</b></td><td>Aucune&#8239;: toutes les rubriques.</td></tr>
    <tr><td><b>${esc(PLANS.pro.l)}</b></td><td class="rbs">${pro.map(rub).join('')}</td></tr>
    <tr><td><b>${esc(PLANS.gratuit.l)}</b></td><td class="rbs"><span class="rb nu">Celles de ${esc(PLANS.pro.l)}, et aussi&#8239;:</span>${gratuitEnPlus.map(rub).join('')}</td></tr>
  </tbody>
</table>
<table class="simple">
  <thead><tr><th style="width:24%">Métier</th><th>Rubriques absentes</th></tr></thead>
  <tbody>
    ${METIERS_ORDRE.filter(m => !(METIERS[m].masque || []).length).map(m => `<tr><td><b>${esc(METIERS[m].nom)}</b></td><td>Aucune&#8239;: toutes les rubriques.</td></tr>`).join('')}
    <tr><td><b>Les autres métiers</b></td><td><div class="sous haut">${masqueMetier.map(m => esc(METIERS[m].nom)).join(' · ')}</div><div class="rbs">${masque0.map(rub).join('')}</div></td></tr>
  </tbody>
</table>
`);

const rubriques = NAV.filter(x => PERM_GRP_OF[x.g]).map(s => ({ g: PERM_GRP_OF[s.g], items: avecSousCats(s.items) }));
const COLS = ['technicien', 'commercial', 'compta', 'chefEquipe', 'dr'];
const tete = `<tr><th></th>${COLS.map(r => `<th class="r">${esc(ROLE[r])}</th>`).join('')}<th class="r adm">Adminis&shy;trateur</th></tr>`;
const pt = v => v ? '<i class="oui">●</i>' : '<i class="non">–</i>';
const compte = r => tous.filter(it => DEF[r][it.k]).length;
P.push(`
${h2('depart', 'Les droits de départ d’une entreprise neuve', 'saut')}
<p class="serre">Ce que chaque rôle reçoit <b>avant que personne n’ait rien coché</b>, dans une entreprise créée avec la version ${APP_VERSION}. Une entreprise qui existe déjà garde les listes écrites dans sa base&#8239;: celle-ci n’y change rien. Tout se règle ensuite personne par personne.</p>
<table class="matrice">
  <thead>${tete}</thead>
  <tbody>
  ${rubriques.map(({ g, items }) => `<tr class="grp"><td colspan="7">${esc(titre(g))}</td></tr>` + items.map(it => `<tr><td>${it.parent ? '↳ ' : ''}${it.ic} ${esc(it.l)}</td>${COLS.map(r => `<td class="c">${pt(DEF[r][it.k])}</td>`).join('')}<td class="c adm">${pt(true)}</td></tr>`).join('')).join('')}
  <tr class="total"><td>Rubriques au menu</td>${COLS.map(r => `<td class="c">${compte(r)}</td>`).join('')}<td class="c adm">${tous.length}</td></tr>
  </tbody>
</table>
`);

const lignesCaps = [
  ['creerIntervention', 'supprimer', 'voirTout', 'annuler', 'planifDeplacer', 'planifObligerTravail', 'modifierPlans', 'validerDR', 'voirCompta', 'devisIA'],
  ['voirEquipe', 'corrigerPointages', 'gererFiches', 'gererGroupes', 'mailPro', 'gererBoxes', 'stockage'],
];
const fermes = USER_CAPS.map(c => c[0]).filter(k => !lignesCaps.flat().includes(k));
assert(fermes.every(k => COLS.every(r => !cap(r, k))), 'les autres cases sont fermées pour tous les rôles');
assert(lignesCaps[0].every(k => k in CAPS_HERITE.technicien), 'la première liste est celle que la reprise pose');
P.push(`
<h3 class="h3 saut-avant">Les droits spéciaux au départ</h3>
<table class="matrice caps">
  <thead>${tete}</thead>
  <tbody>
    <tr class="grp"><td colspan="7">Posés pour chaque rôle</td></tr>
    ${lignesCaps[0].map(k => `<tr><td>${esc(capLbl(k))}</td>${COLS.map(r => `<td class="c">${pt(cap(r, k))}</td>`).join('')}<td class="c adm">${pt(true)}</td></tr>`).join('')}
    <tr class="grp"><td colspan="7">Qui suivent d’autres cases (section ${N.suivent})</td></tr>
    ${lignesCaps[1].map(k => `<tr><td>${esc(capLbl(k))}</td>${COLS.map(r => `<td class="c">${pt(cap(r, k))}</td>`).join('')}<td class="c adm">${pt(true)}</td></tr>`).join('')}
    <tr class="grp"><td colspan="7">Fermées pour tous les rôles — à cocher pour qui en a besoin</td></tr>
    <tr><td colspan="7" class="liste">${fermes.map(k => esc(capLbl(k))).join(' · ')}</td></tr>
    <tr class="grp"><td colspan="7">Gestes de catégorie</td></tr>
    <tr><td colspan="7" class="liste">＋ Ajouter et ✎ Modifier&#8239;: ouverts partout, sauf ${q('Interventions → ＋ Ajouter')}, qui suit ${q('Créer / planifier des interventions')}. 🗑 Supprimer suit ${q('Supprimer des éléments')} dans toutes les catégories.</td></tr>
  </tbody>
</table>
<div class="encart">${q('🤖 Assistant devis')} est fermé à tous les rôles au départ&#8239;: il demande la rubrique, la case ${q('Utiliser Devis IA')} (l’administrateur seul par défaut), ${q('Ventes → ＋ Ajouter')}, le code d’accès de l’équipe — et que TEAM OP ait activé Devis IA pour l’entreprise. Sans la case, son écran n’affiche qu’un cadenas.</div>

${h2('savoir', 'Bon à savoir')}
<ul class="savoir">
  <li><b>La liste d’un rôle ne se modifie pas dans l’application</b>&#8239;: elle ne sert que de point de départ. Pour poser d’un coup les mêmes droits à plusieurs personnes, on passe par un profil (section&nbsp;${N.profils}).</li>
  <li><b>Masquer une rubrique ferme aussi son adresse</b>&#8239;: un lien direct ou un ancien favori ramène au Tableau de bord.</li>
  <li><b>${q('Bons de commande : consultation seule')} se lit à l’envers</b>&#8239;: cochée, la personne voit les bons et leur PDF, mais n’en passe pas.</li>
  <li><b>${q('Accès à OP MESSAGES')}</b> n’a d’effet que si TEAM OP a ouvert OP MESSAGES à l’entreprise (abonnement séparé).</li>
  <li><b>L’Historique garde la trace</b> des gestes sur les droits&#8239;: ${q('Droits modifiés')}, ${q('Utilisateur créé')} (avec le profil posé), ${q('Droits remis au rôle')}, ${q('Rôle créé')}.</li>
</ul>
`);

/* espaces insécables à la française, dans le TEXTE seulement (jamais dans les balises) */
const typo = h => h.replace(/>([^<]+)</g, (m, t) => '>' + t
  .replace(/« /g, '« ').replace(/ »/g, ' »')
  .replace(/ ([:;!?])(?=\s|$|<|&)/g, ' $1') + '<');

const css = fs.readFileSync(path.join(__dirname, 'style.css'), 'utf8').replace(/\$\{APP_VERSION\}/g, APP_VERSION);
const corps = typo(P.join('\n'));
const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>OP GESTION — Comment fonctionnent les droits</title><style>${css}</style></head><body>${corps}</body></html>`;
fs.writeFileSync(OUT, html);
console.log('écrit :', OUT, (html.length / 1024).toFixed(0) + ' Ko', '· exemple :', exVus, 'menus sur', editeur.length, '· autres', exAutres + '/' + autres.length,
  '· départ :', COLS.map(r => ROLE[r] + ' ' + compte(r)).join(', '));
