/* ══ MATÉRIEL — lot 2 (Stock), 16 novembre 2026 ══
   Spécification : scratchpad/proto-final/refonte/MATERIEL.md § 5 et § 4. Stock répond à UNE question — « Qu’est-ce qu’il me reste, et où ? » — et s’ouvre sur son
   travail : un bandeau d’une ligne (les envois à accepter), trois tuiles qui AGISSENT, deux onglets (Articles, Ce qui a bougé), une recherche, une liste.
   Tout le reste (réglages, registre des fluides, export, comptage) est derrière « Plus ». Une seule feuille dit ce qui s’est passé (« Mettre à jour le stock »),
   une seule fiche décrit un article, une seule porte compte un lieu. Le bureau (Julie) voit Stock et « Fournisseurs, matériel & produits » ; elle n’accepte rien.
   ⚠️ Ce bloc REMPLACE vueStock (trois définitions en chaîne), stkVueMouvements, stkVueValider, sxBandeau, sxEntree*, sxRegistre et les trois prFiche : une seule
   définition par fonction (`grep "function nom("` avant d’en écrire une ; sonde materiel-fonctions.js). Les écritures restent celles du lot 0 : stkAppliquer, sxDepose, sxToast. */
if (!ROLES.gestion.routes.includes('stock')) ROLES.gestion.routes.push('stock', 'produits');   // le bureau voit Stock et Fournisseurs (§ 4) ; ni Dépôts, ni « accepter »
if (!LIGNES_ROLE.gestion.some(g => g[0] === 'Matériel')) LIGNES_ROLE.gestion.push(['Matériel', ['stock', 'produits']]);
/* ce qu’un rôle peut faire : tant que les cases d’Équipe « n’agissent pas » (MENU-FINAL, constat 7), le gérant a tout et le bureau n’a pas ces trois droits */
const msAccepte = () => rlPermis('stockAccepter'), msReglages = () => rlPermis('stockReglages'), msPrixVente = () => rlPermis('produitsPrixVente');
const msGerant = () => ROLE === 'patron';
const msPersonne = k => ({ id:k, nom:H_NOM(k), c:(H_GENS[k] || {}).c || '#8a8a8a' });
const msIcCat = x => sxEstFluide(x) ? 'fluide' : 'article';
const msD = d => d === AUJ ? 'Aujourd’hui' : d === jour(-1) ? 'Hier' : jlong(d).replace(/^./, c => c.toUpperCase());
const msQuand = j => j == null ? 'pas encore compté' : j < 1 ? 'compté aujourd’hui' : j < 45 ? `compté il y a ${j} jour${j > 1 ? 's' : ''}` : j < 700 ? `compté il y a ${Math.round(j / 30)} mois` : 'compté il y a plus d’un an';

/* ── la page « Articles » ── */
function msBandeau(){
  if (!STK_VALID || !MVTS_ATT.length || !msAccepte()) return '';
  const A = matEnvoisAAccepter(), n = A.n;
  return `<div class="carte dv-focus ms-bandeau"${matVis('stock-envois')}><div class="dv-tache"><span class="t-etat" aria-hidden="true"></span><span class="dv-c"><b>${n} envoi${n > 1 ? 's' : ''} à accepter</b><span class="gris petit">${esc(A.qui.length > 1 ? A.qui.slice(0, -1).join(', ') + ' et ' + A.qui[A.qui.length - 1] : A.qui[0] || '')}</span></span>
    <span class="ms-bd"><button type="button" class="btn gris petit" data-ms="envois">Voir</button><button type="button" class="btn petit" data-ms="toutacc">Tout accepter</button></span></div></div>`;
}
function msTuiles(){
  const nc = cmdNbACommander(), att = COMMANDES.filter(cmdOuverte), retard = att.some(c => (c.st === 'partielle' ? c.reliquat : c.prevue) < AUJ), cam = camionsARemplir().n;
  const t = (k, n, couleur, texte) => `<button type="button" class="kpi" data-ms="t|${k}"><b style="color:var(--${n ? couleur : 'vert'})">${n}</b><span>${texte}</span></button>`;
  return `<div class="kpis ptx-k3 ms-kpis"${matVis('stock-tuiles')}>${t('cmd', nc, 'orange', nc ? 'à commander' : 'rien à commander')}${t('liv', att.length, retard ? 'orange' : 'encre', att.length ? (att.length > 1 ? 'livraisons attendues' : 'livraison attendue') : 'aucune livraison attendue')}${t('cam', cam, 'orange', cam ? (cam > 1 ? 'manquent dans les camions' : 'manque dans les camions') : 'les camions sont prêts')}</div>`;
}
const msLieuxDe = x => [['atelier', stkAt(x, 'atelier')], ...Object.entries(x.loc || {})].filter(([k, v]) => v > 0);
/* la ligne d’un article : une phrase de lieux, la quantité, un état seulement s’il y en a un (le normal est silencieux) */
function matLigneArticle(x, lf){
  const L = msLieuxDe(x), e = matEtat(x), l = lf && lf !== 'tous' ? lieu(lf) : null, cible = l && l.dot && DOTATION[l.dot] ? DOTATION[l.dot][x.id] : 0;
  const sous = l ? (stkAt(x, lf) > 0 ? `Il y en a aussi ${L.filter(([k]) => k !== lf).slice(0, 2).map(([k, v]) => esc(sxLieuCourt(lieu(k))) + ' ' + prNum(v)).join(' · ') || 'nulle part ailleurs'}` : (L.length ? `Pas ici · ${L.slice(0, 2).map(([k, v]) => esc(sxLieuCourt(lieu(k))) + ' ' + prNum(v)).join(' · ')}` : 'Il n’y en a nulle part'))
    : L.slice(0, 3).map(([k, v]) => esc(sxLieuCourt(lieu(k))) + ' ' + prNum(v)).join(' · ') + (L.length > 3 ? ` · +${L.length - 3} lieu${L.length > 4 ? 'x' : ''}` : '') || 'Nulle part pour l’instant';
  const q = l ? (cible ? `${prNum(stkAt(x, lf))} sur ${prNum(cible)}` : sxQte(stkAt(x, lf), x)) : sxQte(x.q, x);
  return `<button type="button" class="sk-l ms-l" data-pr="fiche|${x.id}"><span class="ms-ic" aria-hidden="true">${svg(msIcCat(x))}</span><span class="fo-n"><b>${esc(x.nom)}</b><span class="gris petit">${sous}</span></span><span class="fo-dr"><b>${q}</b>${e ? `<span class="st ${e.cls}">${esc(e.mot)}</span>` : ''}</span></button>`;
}
function msArticles(){
  const tous = PRODUITS.filter(x => !x.retire), lf = SX.lieuF, l = lf !== 'tous' ? lieu(lf) : null, q = stkQ.trim();
  let L = tous.filter(x => (!q || pdxChercheOk(x, q)) && (!l || stkAt(x, lf) > 0 || (l.dot && DOTATION[l.dot] && DOTATION[l.dot][x.id])));
  const rang = { commande:0, plus:1, bientot:2 }, E = new Map(L.map(x => [x.id, matEtat(x)])), surv = L.filter(x => E.get(x.id) && E.get(x.id).k in rang).sort((a, b) => rang[E.get(a.id).k] - rang[E.get(b.id).k] || a.nom.localeCompare(b.nom, 'fr'));
  const reste = L.filter(x => !surv.includes(x)).sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));
  const val = tous.reduce((s, x) => s + (x.pa || 0) * Math.max(0, x.q), 0);
  const vide = !tous.length ? `<div class="carte ms-vide"><span class="ms-vic">${svg('article')}</span><b>Ton stock est vide</b><span class="gris">Commence par noter ce que tu as à l’atelier.</span><span class="ms-vb"><button type="button" class="btn" data-pr="nouveau|">＋ Ajouter un article</button><button type="button" class="btn gris" data-ms="habituels">Choisir parmi les articles habituels de mon métier</button></span></div>` : '';
  const rien = !L.length && tous.length ? `<div class="carte ms-vide"><span class="ms-vic">${svg('article')}</span><b>${q ? `Rien trouvé pour « ${esc(q)} »` : 'Rien dans ce lieu'}</b><span class="gris">${q && l ? (() => { const x = tous.find(o => pdxChercheOk(o, q) && stkAt(o, 'atelier') > 0); return `Pas de ${esc(q)} dans ${esc(lieuNom(lf).toLowerCase().replace('camion de', 'le camion de'))}.${x ? ` Il y en a ${prNum(stkAt(x, 'atelier'))} à l’atelier.` : ''}`; })() : 'Change de lieu avec « Partout ».'}</span>
    ${q && msGerant() ? `<span class="ms-vb"><button type="button" class="btn gris" data-ms="ajouteq">＋ Ajouter « ${esc(q)} »</button></span>` : ''}</div>` : '';
  const grp = (t, A) => A.length ? `<div class="groupe">${t}</div>${A.map(x => matLigneArticle(x, lf)).join('')}` : '';
  const parCat = reste.length > 40 ? [...new Set(reste.map(x => x.cat))].map(c => `<details class="ms-cat" ${q ? 'open' : ''}><summary class="groupe">${esc(c)}</summary>${reste.filter(x => x.cat === c).map(x => matLigneArticle(x, lf)).join('')}</details>`).join('') : null;
  return `<div class="ms-cherche"${matVis('stock-recherche')}><input class="saisie" id="ms-q" type="search" data-skq="1" value="${esc(stkQ)}" placeholder="Chercher un article, une référence…" aria-label="Chercher un article" autocomplete="off" enterkeyhint="search"><button type="button" class="btn gris" data-ms="ou" aria-haspopup="menu" aria-label="Où : ${esc(l ? sxLieuCourt(l) : 'partout')}">${esc(l ? sxLieuCourt(l) : 'Partout')} ▾</button></div>
    ${vide || rien || `<div class="carte dv-liste ms-liste"${matVis('stock-liste')}>${grp('À surveiller', surv)}${parCat ? `<div class="groupe">Tout le reste</div>${parCat}` : grp(surv.length ? 'Tout le reste' : 'Tous les articles', reste)}</div>`}
    ${tous.length && !rien ? `<div class="gris petit ms-pied">${L.length} article${L.length > 1 ? 's' : ''}${l ? ' ici' : ''}${!l ? ` · ${eur(val)} de matériel (prix d’achat HT)` : ''}</div>` : ''}`;
}
/* ── la page ── */
function vueStock(){
  if (stkOnglet === 'valider') { stkOnglet = 'ensemble'; setTimeout(msEnvois, 0); }
  else if (stkOnglet === 'inventaire') { stkOnglet = 'ensemble'; const l = invLieu; invLieu = null; INV = {}; setTimeout(() => matCompter(l), 0); }
  const jr = stkOnglet === 'mvts';
  if (!tel() && !jr && document.activeElement === document.body && !document.querySelector('#calque .panneau')) setTimeout(() => { const i = document.getElementById('ms-q'); if (i && document.activeElement === document.body) i.focus({ preventScroll:true }); }, 0);   // sur ordinateur, le curseur est déjà dans la recherche
  return `<div class="tete ms-tete"><div><span class="surtitre">Matériel</span><h1>Stock</h1><span class="gris">Ce qu’il te reste, et où il est.</span></div>
    <div class="actions"><button type="button" class="btn" data-ms="maj"${matVis('stock-maj')}>＋ Mettre à jour le stock</button><button type="button" class="btn gris" data-ms="plus" aria-haspopup="menu" aria-label="Plus d’actions">Plus ▾</button></div></div>
  ${msBandeau()}${msTuiles()}
  <div class="seg ms-seg" role="group" aria-label="Stock">${[['ensemble', 'Articles'], ['mvts', 'Ce qui a bougé']].map(([k, l]) => `<button type="button" data-ms="onglet|${k}" aria-pressed="${(k === 'mvts') === jr}">${l}</button>`).join('')}</div>
  ${jr ? msJournal() : msArticles()}
  ${carteAide(jr ? ['Une ligne dit ce qui a vraiment bougé, avec le nom de la personne.', 'Touche le nom d’un article, d’un client ou d’un bon pour l’ouvrir.', 'La dernière ligne se défait avec « Annuler ce geste ».']
    : ['Tape le nom d’un article : tu vois où il est.', 'Quand un article est bientôt fini, il apparaît dans À commander, avec le bon fournisseur.', 'Ce que ton équipe a pris attend ton accord avant de sortir du stock.', 'Chaque geste se défait avec Annuler.'])}`;
}
/* ── « Ce qui a bougé » : une ligne = une phrase ── */
const MS_QUOI = [['tous', 'Tout'], ['sortie', 'Pris'], ['entree', 'Rangé'], ['transfert', 'Déplacé'], ['correction', 'Compté']];
const msOu = () => SX.mvOu && SX.mvOu !== 'tous' ? SX.mvOu : LIEUX.some(l => l.id === mvFiltre) ? mvFiltre : 'tous';
const msQuoiK = () => MS_QUOI.some(o => o[0] === mvFiltre) ? mvFiltre : 'tous';
const msNbFiltres = () => (msQuoiK() !== 'tous') + (msOu() !== 'tous') + (SX.mvQui !== 'tous') + (SX.mvPer !== 'tout');
function msMvVisibles(){
  const q = prNorm(mvRech), deb = SX.mvPer === '7' ? jour(-7) : SX.mvPer === 'mois' ? AUJ.slice(0, 8) + '01' : SX.mvPer === 'perso' ? SX.mvDu : '', fin = SX.mvPer === 'perso' ? SX.mvAu : '', K = msQuoiK(), O = msOu();
  const ok = m => (K === 'tous' || m.type === K) && (O === 'tous' || m.de === O || m.vers === O) && (!q || prNorm([(PRODUITS.find(p => p.id === m.pid) || {}).nom, H_NOM(m.qui), m.pourQui && H_NOM(m.pourQui), m.motif, matNumAff(m.br), (CLIENTS[(INTS.find(o => o.id === m.inter) || {}).cli] || {}).nom, (COMMANDES.find(c => c.id === m.bc) || {}).num].join(' ')).includes(q))
    && (!deb || m.d >= deb) && (!fin || m.d <= fin) && (SX.mvQui === 'tous' || m.qui === SX.mvQui || m.pourQui === SX.mvQui);
  return { att:MVTS_ATT.filter(ok), faits:MVTS.filter(ok) };
}
/* la phrase du geste, avec de vrais liens : l’article, le client, la commande, le bon (jamais un pointillé) */
function msPhraseHtml(m){
  let h = esc(matPhrase(m)); const x = PRODUITS.find(p => p.id === m.pid), i = m.inter && INTS.find(o => o.id === m.inter), c = m.bc && COMMANDES.find(o => o.id === m.bc), lien = (t, d) => `<button type="button" class="lien ms-lien" ${d}>${t}</button>`;
  const sub = (txt, d) => { const e = esc(txt); if (txt && h.includes(e)) h = h.replace(e, lien(e, d)); };
  if (x) sub(matNomCourt(x), `data-pr="fiche|${x.id}"`);
  if (i && CLIENTS[i.cli]) sub(CLIENTS[i.cli].nom, `data-tvoir="inter|${i.id}"`);
  if (c) sub(matNumAff(c.num), `data-cm="voir|${c.id}"`);
  if (m.br) sub(matNumAff(m.br), `data-sk="br|${m.id}"`);
  return h;
}
const MS_JIC = { sortie:'sortir', entree:'ranger', transfert:'deplacer', correction:'compter' };
function msLigneJournal(m, att, dernier){
  return `<div class="ms-g${att ? ' att' : ''}"><span class="ms-gi" aria-hidden="true">${svg(MS_JIC[m.type] || 'compter')}</span><span class="fo-n"><span class="ms-ph">${msPhraseHtml(m)}</span>${dernier ? '<button type="button" class="lien ms-ann" data-sx="annuler">Annuler ce geste</button>' : ''}</span>
    <span class="fo-dr"><span class="petit">${m.h}</span>${att ? `<button type="button" class="st st-o ms-att" data-ms="envois">À accepter</button>` : m.valPar ? `<span class="gris petit">${m.valPar === 'auto' ? 'accepté tout seul' : 'accepté par ' + esc(prenomDe(m.valPar))}</span>` : ''}</span></div>`;
}
function msJournal(){
  const { att, faits } = msMvVisibles(), tous = [...att.map(m => [m, true]), ...faits.map(m => [m, false])], jours = [...new Set(tous.map(([m]) => m.d))].sort().reverse();
  const D = SX.dernier && SX.dernier.sig === sxSig() ? SX.dernier : null, premier = faits[0];
  const sorties = faits.filter(m => m.type === 'sortie'), perdu = sorties.filter(m => m.motif === 'Cassé ou perdu'), v = L => L.reduce((s, m) => s + sxMvValeur(m), 0), n = msNbFiltres();
  return `<div class="ms-cherche"><input class="saisie" id="ms-mq" type="search" data-skmvq="1" value="${esc(mvRech)}" placeholder="Chercher un article, une personne, un client, un bon de remise…" aria-label="Chercher dans ce qui a bougé" autocomplete="off"><button type="button" class="btn gris" data-ms="filtrer">Filtrer${n ? ' · ' + n : ''}</button></div>
    ${tous.length ? `<div class="carte dv-liste ms-liste"${matVis('stock-journal')}>${jours.map(d => `<div class="groupe">${esc(msD(d))}</div>${tous.filter(([m]) => m.d === d).map(([m, a]) => msLigneJournal(m, a, !!D && m === premier)).join('')}`).join('')}</div>
    <div class="gris petit ms-pied">${faits.length} geste${faits.length > 1 ? 's' : ''} · ${eur(v(sorties))} sortis${perdu.length ? ` · ${eur(v(perdu))} cassés ou perdus` : ''}</div>`
    : `<div class="carte ms-vide"><span class="ms-vic">${svg('compter')}</span><b>Rien n’a bougé pour l’instant</b><span class="gris">Change la période ou les filtres.</span></div>`}`;
}
function msFiltrer(){
  const qui = [...new Set(MVTS.flatMap(m => [m.qui, m.pourQui]).filter(Boolean))].filter(k => H_GENS[k]);
  foOuvrir(`<span class="surtitre">Stock</span><h2>Filtrer ce qui a bougé</h2>
    <h3 class="mat-h">Quoi</h3><div class="puces ms-puces" role="group" aria-label="Quoi">${MS_QUOI.map(([k, l]) => `<button type="button" class="puce-c" data-ms="pk|${k}" aria-pressed="${msQuoiK() === k}">${l}</button>`).join('')}</div>
    <label class="champ">Où<select data-msf="ou"><option value="tous">Partout</option>${LIEUX.map(l => `<option value="${l.id}" ${msOu() === l.id ? 'selected' : ''}>${esc(l.nom)}</option>`).join('')}</select></label>
    <label class="champ">Qui<select data-msf="qui"><option value="tous">Tout le monde</option>${qui.map(k => `<option value="${k}" ${SX.mvQui === k ? 'selected' : ''}>${esc(H_NOM(k))}</option>`).join('')}</select></label>
    <label class="champ">Quand<select data-msf="per">${[['tout', 'Depuis le début'], ['7', 'Les 7 derniers jours'], ['mois', 'Ce mois-ci'], ['perso', 'Choisir les dates']].map(([k, l]) => `<option value="${k}" ${SX.mvPer === k ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
    ${SX.mvPer === 'perso' ? `<div class="deux-champs"><label class="champ">Du<input type="date" data-msf="du" value="${esc(SX.mvDu)}"></label><label class="champ">au<input type="date" data-msf="au" value="${esc(SX.mvAu)}"></label></div>` : ''}
    <div class="fo-pied"><button type="button" class="btn" data-ferme="1">Voir ${msMvVisibles().faits.length + msMvVisibles().att.length} geste${msMvVisibles().faits.length + msMvVisibles().att.length > 1 ? 's' : ''}</button><button type="button" class="btn gris" data-ms="fraz">Tout effacer</button></div>`);
}

/* ── les menus ── */
function msMenu(b, titre, items){ const r = b.getBoundingClientRect(); ouvrirMenu(r.left, r.bottom + 6, titre, items); }
function msMenuOu(b){
  const L = LIEUX.filter(l => !l.ferme), it = (id, nom) => ({ ic:SX.lieuF === id ? '✓' : '', l:nom, fn:() => { SX.lieuF = id; rendre(); } });
  msMenu(b, 'Voir le stock', [it('tous', 'Partout'), ...L.map(l => it(l.id, l.type === 'atelier' ? 'L’atelier' : l.type === 'vehicule' ? (bxGarage(l.id) ? l.nom + ' (au garage)' : l.nom) : l.nom))]);
}
function msMenuPlus(b){
  const D = SX.dernier && SX.dernier.sig === sxSig() ? SX.dernier : null, it = [];
  if (SX.bout.length) it.push({ ic:svg('fluide'), l:'Registre des fluides', fn:sxRegistre });
  it.push({ ic:svg('compter'), l:'Compter un lieu…', fn:() => matCompter() });
  it.push({ ic:svg('photo'), l:'Exporter l’historique', fn:sxExport });
  if (msReglages()) it.push({ ic:svg('coche'), l:'Réglages du stock', fn:msReglagesVue });
  it.push('---', { ic:'↺', l:'Annuler le dernier geste', s:D ? '' : 'rien à annuler', fn:() => D ? sxAnnule(D.photo, D.lib, D.sig) : toast('Il n’y a rien à annuler : le dernier geste est déjà passé.') });
  msMenu(b, '', it);
}
function msReglagesVue(){
  const f = Math.round(((SX.freqDef || 0) * 30 || 90) / 30);
  foOuvrir(`<span class="surtitre">Stock</span><h2>Réglages du stock</h2>
    <label class="fo-garder ms-reg"><input type="checkbox" data-msr="valid" ${STK_VALID ? 'checked' : ''}><span><b>Je dois accepter ce que les techniciens notent</b><span class="gris petit">Tant que tu n’as pas accepté, le stock ne bouge pas.</span></span></label>
    <label class="fo-garder ms-reg"><input type="checkbox" data-sxauto="1" ${SX.autoUsage ? 'checked' : ''} ${STK_VALID ? '' : 'disabled'}><span><b>Accepter tout seul ce qu’un technicien a utilisé chez un client</b><span class="gris petit">Seul ce qu’il prend à l’atelier me demande mon accord.</span></span></label>
    <label class="champ">Me rappeler de compter chaque lieu tous les (mois)<input type="number" inputmode="numeric" min="1" max="24" data-msr="freq" value="${f}"></label>
    <span class="gris petit">Cette durée vaut pour tous les lieux. Pour un lieu seul, ouvre sa fiche et choisis « Modifier ce lieu ».</span>
    <div class="fo-pied"><button type="button" class="btn" data-ferme="1">Fermer</button></div>`);
}

/* ── « Envois à accepter » : une ligne par envoi, en phrase ── */
function msEnvois(){
  if (!msAccepte()) return;
  const A = matEnvoisAAccepter(), refus = SX.refus;
  foOuvrir(`<span class="surtitre">Stock</span><h2>Envois à accepter</h2>
    ${A.n ? `<span class="gris">Rien ne sort du stock tant que tu n’as pas accepté.</span><div class="carte ms-envois"${matVis('stock-envois-liste')}>${A.lignes.map(o => `<div class="ms-ev"><span class="ms-evh">${avatar(msPersonne(o.qui))}<span class="fo-n"><b>${esc(matPhrase(o.m))}</b><span class="${o.vide || o.dispo <= 0 ? 'mc-o' : 'gris'} petit">${esc(o.apres)}</span></span></span>
      <span class="ms-evb"><button type="button" class="btn gris petit" data-ms="acc|${o.m.id}">Accepter</button><button type="button" class="lien ms-rouge" data-ms="ref|${o.m.id}">Refuser</button></span></div>`).join('')}</div>`
    : `<div class="carte ms-vide"><span class="ms-vic">${svg('coche')}</span><b>Rien à accepter</b><span class="gris">Quand un technicien prend ou utilise du matériel, tu le vois ici.</span></div>`}
    ${refus.length ? `<h3 class="mat-h">Refusés · ${refus.length}</h3><div class="carte">${refus.slice(0, 5).map(o => `<div class="ms-ev"><span class="fo-n"><b>${esc(matPhrase(o.m))}</b><span class="gris petit">« ${esc(o.motif)} »</span></span><button type="button" class="lien" data-sx="rouvrir|${o.id}">Remettre à accepter</button></div>`).join('')}</div>` : ''}
    ${A.n ? `<div class="fo-pied"><button type="button" class="btn" data-ms="toutacc">Tout accepter</button></div>` : ''}`);
}
function msAccepter(ids, tout){
  if (!msAccepte()) return;
  const snap = sxPhoto(), faits = [], reste = [];
  MVTS_ATT.filter(m => !ids || ids.includes(m.id)).forEach(m => { const q = stkAppliquer(m); if (q > 0) { MVTS_ATT.splice(MVTS_ATT.indexOf(m), 1); m.valPar = 'marc'; MVTS.unshift(m); faits.push(m); } else reste.push(m); });
  if (!faits.length) return toast('Rien à accepter : il n’y en a plus à cet endroit. Tu peux les refuser en disant pourquoi.');
  faits.forEach(m => { if (m.qui !== 'marc') notifier(m.qui, `Ton geste « ${sxNom(m.pid)} × ${prNum(m.q)} » est accepté : ton stock est à jour.`); });
  sxJournal('a accepté ce que les techniciens ont noté', sxPl(faits.length, 'envoi'), faits.map(m => sxNom(m.pid) + ' (' + prenomDe(m.qui) + ')').join(', '));
  prCatalogueMaj(); if (!MVTS_ATT.length || !tout) fermerPanneau(); rendre(); if (MVTS_ATT.length && !tout && document.querySelector('#calque .panneau')) msEnvois();
  sxToast(`${faits.length > 1 ? faits.length + ' envois acceptés' : '1 envoi accepté'}${reste.length ? ` · ${reste.length} reste${reste.length > 1 ? 'nt' : ''} : plus de stock` : ''}.`, null, snap, 'l’acceptation de ' + sxPl(faits.length, 'envoi'));
}
function msRefuser(id){
  const m = MVTS_ATT.find(o => o.id === id); if (!m) return;
  foOuvrir(`<span class="surtitre">Refuser</span><h2>${esc(matPhrase(m))}</h2><span class="gris">Le stock ne bouge pas. Dis pourquoi : ${esc(prenomDe(m.qui))} le lira.</span>
    <div class="puces ms-puces" role="group" aria-label="Réponses rapides">${['Trop cher', 'Pas cette semaine', 'On en a déjà'].map(t => `<button type="button" class="puce-c" data-ms="rmot|${t}">${t}</button>`).join('')}</div>
    <label class="champ">Pourquoi ?<textarea id="ms-rm" placeholder="ex. On en a commandé, ça arrive jeudi"></textarea></label>
    <div class="fo-pied"><button type="button" class="btn" data-ms="rok|${id}">Refuser</button><button type="button" class="btn gris" data-ms="envois">Retour</button></div>`);
}
function msRefusOk(id){
  const k = MVTS_ATT.findIndex(o => o.id === id); if (k < 0) return; const motif = ((document.getElementById('ms-rm') || {}).value || '').trim(); if (!motif) return toast('Un refus s’explique : écris pourquoi, ou touche une des réponses.');
  const snap = sxPhoto(), m = MVTS_ATT.splice(k, 1)[0];
  SX.refus.unshift({ id:sxId('rf'), m, motif, d:AUJ, h:hNow() });
  if (m.qui !== 'marc') notifier(m.qui, `Ton geste « ${sxNom(m.pid)} × ${prNum(m.q)} » est refusé : ${motif}.`);
  sxJournal('a refusé le geste de ' + prenomDe(m.qui), sxNom(m.pid) + ' × ' + prNum(m.q), motif);
  fermerPanneau(); rendre();
  sxToast(`Refusé : le stock ne bouge pas. ${esc(prenomDe(m.qui))} reçoit le motif.`, null, snap, 'le refus');
}

/* ── LA feuille qui dit ce qui s’est passé : « Mettre à jour le stock » (le gérant et le bureau) — les mêmes quatre verbes partout ── */
const msMotifSortie = G => G.pour === 'client' ? 'Utilisé chez le client' : G.pour === 'collegue' ? 'Donné à un collègue' : 'Cassé ou perdu';
function matGOuvrir(mode, pre){
  pre = pre || {};
  const G = MAT.G = { mode, lignes:[], de:pre.de || 'atelier', vers:pre.vers || '', pour:pre.pour || 'client', inter:'', collegue:'', texte:'', br:true, origine:pre.origine || 'livraison', montant:'', ticket:true, q:'', qi:'', lieu:pre.lieu || 'atelier', choisirInter:false };
  if (mode === 'deplacer' && !G.vers) G.vers = G.de === 'atelier' ? (LIEUX.find(l => l.type === 'vehicule' && !l.ferme) || { id:'atelier' }).id : 'atelier';
  if (pre.pid) { const x = PRODUITS.find(p => p.id === pre.pid && !p.retire); if (x) G.lignes.push({ pid:x.id, q:Math.min(sxPas(x), mode === 'ranger' ? 99 : Math.max(sxPas(x), stkAt(x, G.de))) || sxPas(x) }); }
  matGVue();
}
const msLieuxOpt = (sel, sauf) => LIEUX.filter(l => !l.ferme && l.id !== sauf).map(l => `<option value="${l.id}" ${l.id === sel ? 'selected' : ''}>${esc(l.type === 'atelier' ? 'L’atelier' : l.nom)}${bxGarage(l.id) ? ' (au garage)' : ''}</option>`).join('');
function msgPool(G){
  const q = G.q.trim(), pris = new Set(G.lignes.map(l => l.pid)), ranger = G.mode === 'ranger';
  let pool = PRODUITS.filter(x => !x.retire && !pris.has(x.id) && (ranger || stkAt(x, G.de) > 0));
  if (q) pool = pool.filter(x => pdxChercheOk(x, q));
  return pool.sort((a, b) => sxConsoSem(b.id) - sxConsoSem(a.id) || a.nom.localeCompare(b.nom, 'fr')).slice(0, q ? 8 : 5);
}
function msgResultats(G){
  const pool = msgPool(G), ranger = G.mode === 'ranger', ou = id => id === 'atelier' ? 'à l’atelier' : id.startsWith('v') ? 'dans le camion de ' + prenomDe(lieu(id).tech) : 'dans la réserve';
  if (!pool.length) return G.q.trim() ? `<div class="gris petit mat-rien">Rien trouvé pour « ${esc(G.q)} »${ranger ? '' : ' ' + ou(G.de)}.</div>` : '';
  return pool.map(x => `<button type="button" class="ligne-clic mat-res" data-ms="gajoute|${x.id}"><span class="fo-n"><b>${esc(x.nom)}</b><span class="gris petit">${ranger ? `en tout ${sxQte(x.q, x)}` : `${ou(G.de)} ${prNum(stkAt(x, G.de))}`}</span></span><span class="mat-plus" aria-hidden="true">＋</span></button>`).join('');
}
function msgLigne(G, l, j){
  const x = PRODUITS.find(p => p.id === l.pid); if (!x) return ''; const dispo = G.mode === 'ranger' ? null : stkAt(x, G.de);
  return `<div class="mat-l"><span class="fo-n"><b>${esc(x.nom)}</b><span class="gris petit">${dispo == null ? 'en tout ' + sxQte(x.q, x) : (G.de === 'atelier' ? 'à l’atelier ' : 'ici ') + prNum(dispo)}</span></span>
    <span class="mat-pas"><button type="button" data-ms="gmoins|${j}" aria-label="Moins de ${esc(x.nom)}">−</button><input inputmode="decimal" data-msgq="${j}" value="${prNum(l.q)}" aria-label="Quantité de ${esc(x.nom)}"><button type="button" data-ms="gplus|${j}" aria-label="Plus de ${esc(x.nom)}">＋</button></span>
    <button type="button" class="lien mat-ret" data-ms="gret|${j}" aria-label="Retirer ${esc(x.nom)}">Retirer</button></div>`;
}
function msIntsPour(q){
  const n = prNorm(q);
  return INTS.filter(i => !['annulee'].includes(i.st) && i.d >= jour(-14) && i.d <= jour(14) && (!n || prNorm((CLIENTS[i.cli] || {}).nom + ' ' + i.titre).includes(n))).sort((a, b) => Math.abs(tJours(a.d)) - Math.abs(tJours(b.d)) || a.h.localeCompare(b.h)).slice(0, 8);
}
function matGPourquoi(G){
  if (G.mode === 'ranger' && G.origine === 'livraison') return '';
  if (!G.lignes.length) return 'Choisis un article.';
  if (G.mode === 'sortir') { if (G.pour === 'client' && !G.inter) return 'Choisis le client ou l’intervention.'; if (G.pour === 'collegue' && !G.collegue) return 'Choisis le collègue.'; }
  if (G.mode === 'deplacer' && G.de === G.vers) return 'Choisis deux lieux différents.';
  return '';
}
function matGPhrase(G){
  if (!G.lignes.length) return '';
  const T = G.lignes.map(l => { const x = PRODUITS.find(p => p.id === l.pid); return x ? matQte(l.q, x) : ''; }).filter(Boolean), liste = G.lignes.length > 2 ? sxPl(G.lignes.length, 'article') : T.join(' et '), d = id => id === 'atelier' ? 'l’atelier' : lieu(id).type === 'vehicule' ? 'le camion de ' + prenomDe(lieu(id).tech) : 'la réserve';
  if (G.mode === 'sortir') { const i = INTS.find(o => o.id === G.inter), pour = G.pour === 'client' ? (i ? ', pour ' + CLIENTS[i.cli].nom : '') : G.pour === 'collegue' ? (G.collegue ? ', pour ' + prenomDe(G.collegue) : '') : ', cassé ou perdu'; return `Tu notes : ${liste} sorti${G.lignes.length > 1 ? 's' : ''} de ${d(G.de)}${pour}.`; }
  if (G.mode === 'ranger') return `Tu notes : ${liste} rangé${G.lignes.length > 1 ? 's' : ''} dans ${d(G.lieu)}.`;
  return `Tu notes : ${liste} déplacé${G.lignes.length > 1 ? 's' : ''} de ${d(G.de)} vers ${d(G.vers)}.`;
}
function matGVue(){
  const G = MAT.G; if (!G) return; const m = G.mode;
  if (m === 'quoi') {
    const R = [['sortir', 'Sortir du stock', 'Pour un client, pour un collègue, ou parce que c’est cassé ou perdu'], ['ranger', 'Ranger dans le stock', 'Une livraison, un achat au comptoir, un retour de chantier'], ['deplacer', 'Déplacer', 'D’un lieu à un autre, par exemple de l’atelier à un camion'], ['compter', 'Compter', 'Je vérifie ce qu’il y a vraiment dans un lieu']];
    return foOuvrir(`<span class="surtitre">Stock</span><h2>Que veux-tu faire ?</h2><div class="ms-quoi"${matVis('stock-maj-liste')}>${R.map(([k, t, s]) => `<button type="button" class="ligne-clic ms-q" data-ms="q|${k}"><span class="ms-qi" aria-hidden="true">${svg(k)}</span><span class="fo-n"><b>${t}</b><span class="gris petit">${s}</span></span></button>`).join('')}</div>`);
  }
  const pb = matGPourquoi(G), n = G.lignes.length, titre = { sortir:'Sortir du stock', ranger:'Ranger dans le stock', deplacer:'Déplacer' }[m], garage = m === 'deplacer' && bxGarage(G.vers);
  const bouton = m === 'sortir' ? `Noter : j’ai sorti ${n === 1 ? prNum(G.lignes[0].q) : n ? sxPl(n, 'article') : ''}` : m === 'ranger' ? `Noter : j’ai rangé ${n === 1 ? prNum(G.lignes[0].q) : n ? sxPl(n, 'article') : ''}` : (garage ? 'Déplacer quand même' : 'Noter : j’ai déplacé') + (n === 1 ? ' ' + prNum(G.lignes[0].q) : n ? ' ' + sxPl(n, 'article') : '');
  const liv = m === 'ranger' && G.origine === 'livraison', att = COMMANDES.filter(cmdOuverte);
  const intSel = INTS.find(o => o.id === G.inter), ints = G.choisirInter ? msIntsPour(G.qi) : [];
  foOuvrir(`<span class="surtitre">Stock</span><h2>${titre}</h2>
    ${m === 'ranger' ? `<h3 class="mat-h">D’où ça vient ?</h3><div class="seg ms-seg2" role="group" aria-label="D’où ça vient">${[['livraison', 'Une livraison'], ['comptoir', 'Un achat au comptoir'], ['retour', 'Un retour']].map(([k, l]) => `<button type="button" data-ms="gorig|${k}" aria-pressed="${G.origine === k}">${l}</button>`).join('')}</div>` : ''}
    ${liv ? (att.length ? `<h3 class="mat-h">Quelle livraison ?</h3><div class="carte ms-envois">${att.map(c => `<button type="button" class="ligne-clic mat-res" data-ms="grecevoir|${c.id}"><span class="fo-n"><b>Commande ${esc(matNumAff(c.num))} · ${esc(c.four)}</b><span class="gris petit">${c.lignes.length} article${c.lignes.length > 1 ? 's' : ''} · attendue ${(c.st === 'partielle' ? c.reliquat : c.prevue) ? (c.st === 'partielle' ? c.reliquat : c.prevue) < AUJ ? 'depuis le ' + jCourt(c.st === 'partielle' ? c.reliquat : c.prevue) : 'le ' + jCourt(c.st === 'partielle' ? c.reliquat : c.prevue) : 'bientôt'}</span></span><span class="mat-plus" aria-hidden="true">›</span></button>`).join('')}</div>` : '<div class="carte ms-vide"><span class="ms-vic">' + svg('livraison') + '</span><b>Aucune livraison attendue</b><span class="gris">Quand une commande est envoyée, elle apparaît ici pour la ranger.</span></div>') : `
    <h3 class="mat-h">${n ? 'Ajouter un autre article' : 'Quel article ?'}</h3>
    ${G.lignes.length ? `<div class="fo-bloc mat-lignes">${G.lignes.map((l, j) => msgLigne(G, l, j)).join('')}</div>` : ''}
    <input class="saisie" id="msg-q" type="text" inputmode="search" enterkeyhint="search" autocomplete="off" placeholder="Chercher un article" aria-label="Chercher un article" value="${esc(G.q)}"><div id="msg-res" class="mat-resl">${msgResultats(G)}</div>
    ${m === 'sortir' ? `<label class="champ">Sorti d’où ?<select data-msg="de">${msLieuxOpt(G.de)}</select></label>
      <h3 class="mat-h">Pour qui ?</h3><div class="seg ms-seg2" role="group" aria-label="Pour qui">${[['client', 'Un client'], ['collegue', 'Un collègue'], ['perdu', 'Cassé ou perdu']].map(([k, l]) => `<button type="button" data-ms="gpour|${k}" aria-pressed="${G.pour === k}">${l}</button>`).join('')}</div>
      ${G.pour === 'client' ? (intSel && !G.choisirInter ? `<div class="mat-inter"><span class="fo-n"><b>${esc(matInterTitre(intSel))}</b><span class="gris petit">${esc(matInterQuand(intSel))}</span></span><button type="button" class="lien" data-ms="gchinter">Changer</button></div>`
        : `<label class="champ">Quel client ou quelle intervention ?<input class="saisie" id="msg-i" type="search" data-msg="qi" autocomplete="off" placeholder="Chercher un client" value="${esc(G.qi)}"></label><div class="mat-choix">${(G.choisirInter || G.qi ? msIntsPour(G.qi) : msIntsPour('').slice(0, 4)).map(o => `<button type="button" class="ligne-clic" data-ms="ginter|${o.id}"><span class="fo-n"><b>${esc(matInterTitre(o))}</b><span class="gris petit">${esc(matInterQuand(o))}</span></span></button>`).join('')}</div>`)
        : G.pour === 'collegue' ? `<label class="champ">Quel collègue ?<select data-msg="collegue"><option value="">Choisis…</option>${Object.keys(H_GENS).filter(k => k !== sxQui() && H_GENS[k].role).map(k => `<option value="${k}" ${G.collegue === k ? 'selected' : ''}>${esc(H_NOM(k))}</option>`).join('')}</select></label><label class="fo-garder"><input type="checkbox" data-msg="br" ${G.br ? 'checked' : ''}><span><b>Faire un bon de remise</b><span class="gris petit">Un papier qui dit qui a pris quoi.</span></span></label>`
        : `<label class="champ">Qu’est-ce qui s’est passé ?<input class="saisie" data-msg="texte" autocomplete="off" placeholder="ex. cassé en le montant" value="${esc(G.texte)}"></label>`}` : ''}
    ${m === 'ranger' ? `<label class="champ">Où je le range ?<select data-msg="lieu">${msLieuxOpt(G.lieu)}</select></label>
      ${G.origine === 'comptoir' ? `<label class="champ">Montant du ticket (€ HT)<input class="saisie" inputmode="decimal" data-msg="montant" placeholder="ex. 18,50" value="${esc(G.montant)}"></label><label class="fo-garder"><input type="checkbox" data-msg="ticket" ${G.ticket ? 'checked' : ''}><span><b>Ranger le ticket dans les achats</b></span></label>` : ''}
      <div class="info petit">Tu as la facture ? Photographie-la, tout se range seul. <button type="button" class="lien" data-ms="gfacture">Photographier une facture</button></div>` : ''}
    ${m === 'deplacer' ? `<div class="ms-de-vers"><label class="champ">De<select data-msg="de">${msLieuxOpt(G.de)}</select></label><button type="button" class="ms-echange" data-ms="gechange" aria-label="Échanger les deux lieux" title="Échanger les deux lieux">${svg('deplacer')}</button><label class="champ">Vers<select data-msg="vers">${msLieuxOpt(G.vers)}</select></label></div>
      ${garage ? `<div class="info petit fo-alerte">Ce camion est au garage. Tu les mets quand même ?</div>` : ''}` : ''}
    <div class="mat-phrase gris petit" aria-live="polite">${esc(matGPhrase(G))}</div>
    <div class="info petit">${STK_VALID && !msGerant() ? 'Ça part au gérant : le stock bougera quand il aura accepté.' : 'Le stock bouge tout de suite. Tu peux le défaire avec « Annuler ».'}</div>
    <div class="fo-pied mat-pied">${pb ? `<span class="mat-pourquoi" role="status">${pb}</span>` : ''}<button type="button" class="btn" data-ms="genvoyer" ${pb ? 'disabled' : ''}>${bouton}</button><button type="button" class="btn gris" data-ferme="1">Annuler</button></div>`}`);
}
/* un geste de plus : le gérant applique tout de suite, les autres passent par son accord (la même règle que le technicien) */
const msPoser = m => msGerant() || sxQui() === 'marc' ? (stkAppliquer(m) > 0 ? (MVTS.unshift(m), 'applique') : 'rien') : sxDepose(m);
function matGEnvoyer(){
  const G = MAT.G; if (!G) return; const pb = matGPourquoi(G); if (pb) return toast(pb);
  const snap = sxPhoto(), moi = sxQui(), br = G.mode === 'sortir' && G.pour === 'collegue' && G.br && G.collegue !== moi ? 'BR-2026-0' + (++brNum) : null, n = { attente:0, applique:0, rien:0, doublon:0 }, fait = [];
  G.lignes.forEach(l => { const x = PRODUITS.find(p => p.id === l.pid); if (!x) return; let m;
    if (G.mode === 'sortir') m = sxMvt({ type:'sortie', pid:l.pid, q:l.q, de:G.de, qui:moi, pourQui:G.pour === 'collegue' ? G.collegue : moi, motif:msMotifSortie(G), inter:G.pour === 'client' ? G.inter : undefined, note:G.pour === 'perdu' ? G.texte.trim() || undefined : undefined, br:br || undefined });
    else if (G.mode === 'ranger') m = sxMvt({ type:'entree', pid:l.pid, q:l.q, vers:G.lieu, qui:moi, motif:G.origine === 'comptoir' ? 'Acheté au comptoir' : 'Retour de chantier' });
    else m = sxMvt({ type:'transfert', pid:l.pid, q:l.q, de:G.de, vers:G.vers, qui:moi, motif:'Déplacé' });
    const r = msPoser(m); n[r]++; if (r === 'attente' || r === 'applique') fait.push(m); });
  const i = G.mode === 'sortir' && G.pour === 'client' && INTS.find(o => o.id === G.inter);
  MAT.G = null; fermerPanneau();
  if (!fait.length) { rendre(); return toast(n.doublon ? 'Déjà envoyé : ça attend l’accord du gérant.' : 'Rien n’a bougé : il n’y en a plus à cet endroit.'); }
  const ht = fait.reduce((s, m) => s + (PRODUITS.find(p => p.id === m.pid).pa || 0) * m.q, 0), mt = foNum(G.montant) || 0;
  if (G.mode === 'ranger' && G.origine === 'comptoir' && G.ticket && (mt > 0 || ht > 0) && fait.some(m => !m.valPar && n.applique)) ACHATS.push({ id:'a' + Date.now().toString(36), d:dFr(AUJ).slice(0, 5), four:'Achat au comptoir', objet:sxMvResume(fait) + ' (rangé dans le stock)', ht:Math.round((mt || ht) * 100) / 100, tva:20, compte:'607', mode:'Carte', paye:dFr(AUJ).slice(0, 5), piece:null, ref:'à justifier' });
  sxJournal({ sortir:'a sorti du stock', ranger:'a rangé dans le stock', deplacer:'a déplacé du stock' }[G.mode], sxMvResume(fait), n.attente ? 'envoyé au gérant, en attente d’accord' : G.mode === 'sortir' ? msMotifSortie(G) : 'appliqué au stock', i && i.cli);
  prCatalogueMaj(); rendre();
  const verbe = { sortir:'Sorti', ranger:'Rangé', deplacer:'Déplacé' }[G.mode], lib = { sortir:'la sortie', ranger:'le rangement', deplacer:'le déplacement' }[G.mode];
  sxToast(n.attente ? `Envoyé au gérant : ${esc(sxMvResume(fait))}.` : `${verbe} : ${esc(sxMvResume(fait))}${G.mode === 'ranger' && G.origine === 'comptoir' && G.ticket ? ' · ticket rangé dans les achats' : ''}${br ? ' · bon de remise ' + esc(matNumAff(br)) : ''}.`, br && !n.attente ? { lib:'Voir le bon', fn:() => stkBon(fait[0].id) } : null, snap, lib);
}
/* ── « Compter » : UNE seule porte pour compter un lieu ── */
function matCompter(lieuId){
  if (!lieuId) {
    return foOuvrir(`<span class="surtitre">Stock</span><h2>Compter quel lieu ?</h2><span class="gris">Tu vérifies ce qu’il y a vraiment, et l’écart se note tout seul.</span>
      <div class="mat-choix">${LIEUX.filter(l => !l.ferme).map(l => { const j = sxJoursInv(l.id), du = j == null || j > sxFreq(l.id); return `<button type="button" class="ligne-clic" data-ms="cpt|${l.id}"><span class="fo-n"><b>${esc(l.type === 'atelier' ? 'L’atelier' : l.nom)}</b><span class="${du ? 'mc-o' : 'gris'} petit">${msQuand(j)}</span></span><span aria-hidden="true">›</span></button>`; }).join('')}</div>`);
  }
  MAT.C = { lieu:lieuId, v:{}, grp:false }; matCVue();
}
const msCLignes = l => PRODUITS.filter(x => !x.retire && (stkAt(x, l) > 0 || (lieu(l).dot && DOTATION[lieu(l).dot] && DOTATION[lieu(l).dot][x.id]))).sort((a, b) => a.cat.localeCompare(b.cat, 'fr') || a.nom.localeCompare(b.nom, 'fr'));
function matCVue(){
  const C = MAT.C; if (!C) return; const L = lieu(C.lieu), A = msCLignes(C.lieu), j = sxJoursInv(C.lieu), nom = L.type === 'atelier' ? 'l’atelier' : L.type === 'vehicule' ? 'le camion de ' + prenomDe(L.tech) : L.nom;
  const ecart = x => C.v[x.id] != null ? stkR(C.v[x.id] - stkAt(x, C.lieu)) : 0, phraseE = e => e < 0 ? `${prNum(-e)} de moins que prévu` : `${prNum(e)} de plus que prévu`, E = A.filter(x => ecart(x)), val = E.reduce((s, x) => s + ecart(x) * (x.pa || 0), 0);
  const ligne = x => { const a = stkAt(x, C.lieu), c = C.v[x.id] != null ? C.v[x.id] : a, e = ecart(x);
    return `<div class="mat-l"><span class="fo-n"><b>${esc(x.nom)}</b><span class="${e ? 'mc-o' : 'gris'} petit">${e ? phraseE(e) : 'Prévu ' + prNum(a)}</span></span><span class="mat-pas"><button type="button" data-ms="cmoins|${x.id}" aria-label="Moins de ${esc(x.nom)}">−</button><input inputmode="decimal" data-mscq="${x.id}" value="${prNum(c)}" aria-label="Compté : ${esc(x.nom)}"><button type="button" data-ms="cplus|${x.id}" aria-label="Plus de ${esc(x.nom)}">＋</button></span>${e && x.pa ? `<span class="gris petit ms-ev€">${eur(e * x.pa)}</span>` : ''}</div>`; };
  const corps = C.grp ? [...new Set(A.map(x => x.cat))].map(c => `<details class="ms-cat" open><summary class="groupe">${esc(c)}</summary>${A.filter(x => x.cat === c).map(ligne).join('')}</details>`).join('') : A.map(ligne).join('');
  foOuvrir(`<span class="surtitre">Stock</span><h2>Compter ${esc(nom)}</h2><span class="gris">Dernier comptage : ${msQuand(j).replace('compté ', '')}.</span>
    <div class="ms-cbar"><button type="button" class="btn gris" data-ms="ctout">Tout est juste</button><button type="button" class="btn gris" data-ms="cgrp" aria-pressed="${C.grp}">${C.grp ? 'Tout afficher à plat' : 'Compter par catégorie'}</button></div>
    <span class="gris petit">Pour chaque article, dis combien il y en a. Touche seulement ceux qui sont différents.</span>
    <div class="carte ms-cliste">${corps || '<div class="gris">Rien à compter ici pour l’instant.</div>'}</div>
    <div class="fo-pied"><span class="gris petit ms-csom">${E.length ? `${sxPl(E.length, 'écart')} · ${val >= 0 ? '+' : ''}${eur(val)}` : 'Aucun écart pour l’instant.'}</span><button type="button" class="btn" data-ms="cok">Enregistrer le comptage</button><button type="button" class="btn gris" data-ms="cpt|">Changer de lieu</button></div>`, true);
}
function matCEnregistrer(){
  const C = MAT.C; if (!C) return; const l = C.lieu, snap = sxPhoto(), moi = sxQui(), n = [], att = [];
  msCLignes(l).forEach(x => { if (C.v[x.id] == null) return; const e = stkR(C.v[x.id] - stkAt(x, l)); if (!e) return;
    const m = sxMvt({ type:'correction', pid:x.id, q:e, de:l, qui:moi, motif:`Comptage (${lieuNom(l)}) : ${prNum(Math.abs(e))} de ${e > 0 ? 'plus' : 'moins'} que prévu` }), r = msPoser(m); if (r === 'applique') n.push(m); else if (r === 'attente') att.push(m); });
  SX.invs[l] = AUJ; MAT.C = null; fermerPanneau(); prCatalogueMaj();
  sxJournal('a compté', lieuNom(l), n.length + att.length ? sxPl(n.length + att.length, 'écart') : 'tout est juste');
  rendre();
  const nom = lieu(l).type === 'atelier' ? 'l’atelier' : lieuNom(l).toLowerCase().replace('camion de', 'le camion de');
  sxToast(att.length ? `Comptage envoyé au gérant : ${sxPl(att.length, 'écart')} à accepter.` : n.length ? `Comptage enregistré : ${sxPl(n.length, 'écart')} noté${n.length > 1 ? 's' : ''} dans ${esc(nom)}.` : `Tout est juste dans ${esc(nom)} : la date de comptage est notée.`, null, snap, 'le comptage de ' + lieuNom(l));
}

/* ── le registre des fluides : une ligne de totaux PAR fluide, jamais R32 et R410A mélangés ── */
function sxRegistre(){
  const an = SX.regAn || String(dObj(AUJ).getFullYear()), R = SX.reg.filter(r => r.d.slice(0, 4) === an), fl = [...new Set(R.map(r => r.fluide))];
  const tot = fl.map(f => { const L = R.filter(r => r.fluide === f), c = L.reduce((s, r) => s + r.charge, 0), rc = L.reduce((s, r) => s + r.recup, 0); return `<div class="ligne"><span><b>${esc(f === 'à retraiter' ? 'À retraiter' : f)}</b></span><span>${prNum(Math.round(c * 10) / 10)} kg chargés · ${prNum(Math.round(rc * 10) / 10)} kg récupérés</span></div>`; }).join('');
  foOuvrir(`<span class="surtitre">Stock</span><h2>Registre des fluides</h2><span class="gris">Du 1er janvier au ${jlong(AUJ)} ${an}.</span>
    <label class="champ">Période<select data-msr="an">${[String(dObj(AUJ).getFullYear()), String(dObj(AUJ).getFullYear() - 1)].map((a, k) => `<option value="${a}" ${a === an ? 'selected' : ''}>${k ? 'L’an dernier' : 'Cette année'}</option>`).join('')}</select></label>
    <div class="carte">${tot || '<div class="gris">Aucun fluide chargé ni récupéré sur cette période.</div>'}</div>
    <div class="carte ms-regl">${R.map(r => { const i = r.inter && INTS.find(o => o.id === r.inter), cl = CLIENTS[r.cli];
      return `<div class="mv-l"><span class="fo-n"><b>${r.charge ? prNum(r.charge) + ' kg chargés' : prNum(r.recup) + ' kg récupérés'} · ${esc(r.fluide)}</b><span class="gris petit">${cl ? (i ? `<button type="button" class="lien ms-lien" data-tvoir="inter|${i.id}">${esc(cl.nom)}</button>` : esc(cl.nom)) : 'Sans client'}${r.equip ? ' · ' + esc(r.equip) : ''} · bouteille ${esc(r.bout)}</span></span><span class="fo-dr"><span class="petit">${esc(prenomDe(r.qui))}</span><span class="gris petit">${jCourt(r.d)}</span></span></div>`; }).join('')}</div>
    <div class="fo-pied"><button type="button" class="btn" data-sx="expok|reg">Exporter en PDF (simulé)</button></div>`, true);
}

/* ══ LA FICHE D’UN ARTICLE — UNE seule fenêtre, ouverte de partout (Stock, Articles, une commande, un lieu, le journal) ══ */
const MS_FICHE = { seuil:null, prix:null };
function msConseilSeuil(x){ const f = foDe(x.four), dj = f && f.dj != null ? f.dj : 2, cs = sxConsoSem(x.id); if (!(cs > 0)) return null; const c = Math.max(1, Math.ceil(cs * (1 + dj / 7))); return c !== x.seuil ? c : null; }
function prFiche(id){
  const x = PRODUITS.find(o => o.id === id); if (!x) return; const t = document.getElementById('toast'); if (t) t.classList.remove('on');
  const e = matEtat(x), tech = ROLE === 'tech', P = PACKS[x.p] || { nom:'', ic:'' }, L = LIEUX.filter(l => stkAt(x, l.id) > 0), cs = sxConsoSem(x.id), cons = msConseilSeuil(x), ed = MS_FICHE.seuil === id, edp = MS_FICHE.prix === id, M = prMarge(x), f = foDe(x.four);
  const ou = LIEUX.filter(l => stkAt(x, l.id) > 0), usage = pdxUsageListes(x), gestes = MVTS.filter(m => m.pid === x.id).slice(0, 5), autres = Object.entries(x.offres || {}).filter(([n, pa]) => n !== x.four && x.pa && pa < x.pa).sort((a, b) => a[1] - b[1]);
  const moins = autres[0], hausse = x.paAvant && x.pa ? foPct(x.paAvant, x.pa) : 0, conseilPv = !tech && prVend(x) && x.pa ? foArr(x.pa / .6) : null;
  const rep = L.length ? L.map(l => `<button type="button" class="lien ms-lien" data-sk="lieu|${l.id}">${esc(l.type === 'atelier' ? 'à l’atelier' : l.type === 'vehicule' ? 'dans le camion de ' + prenomDe(l.tech) : 'dans la réserve')} ${prNum(stkAt(x, l.id))}</button>`).join(' · ') : '<span class="gris">Il n’y en a nulle part pour l’instant.</span>';
  const noir = tech ? `<button type="button" class="btn" data-ms="fusage|${x.id}">J’ai utilisé</button>` : (e && ['plus', 'bientot'].includes(e.k)) ? `<button type="button" class="btn" data-ms="fcmd|${x.id}">Commander</button>` : `<button type="button" class="btn" data-ms="fq|sortir|${x.id}">Sortir du stock</button>`;
  const bout = sxEstFluide(x) ? sxBoutsDe(x.id) : [];
  ouvrirPanneau(`<span class="surtitre">${esc(P.nom)} › ${esc(x.cat)}</span><h2>${esc(x.nom)}</h2>
    <span class="gris">Réf. ${esc(x.ref)}${x.four && x.four !== '—' ? ' · ' + (f ? `<button type="button" class="lien ms-lien" data-fo="fiche|${f.id}">${esc(x.four)}</button>` : esc(x.four)) : ''}</span>
    <div class="ms-rep carte"${matVis('article-reste')}><div class="ms-big">Il en reste ${sxQte(x.q, x)}${e ? ` <span class="st ${e.cls}">${esc(e.mot)}</span>` : ''}</div><div class="gris petit">${rep}</div>
      ${tech ? '' : `<div class="ms-seuil">${ed ? `<label class="champ">Je te préviens quand il en reste moins de<input class="saisie" inputmode="decimal" data-msf="seuil" value="${prNum(x.seuil)}" id="ms-seuil"></label><span class="ms-fb"><button type="button" class="btn petit" data-ms="fseuil|${x.id}">Enregistrer</button><button type="button" class="btn gris petit" data-ms="fseuilx">Annuler</button></span>`
        : `<button type="button" class="lien ms-lien" data-ms="fseuilo|${x.id}">${x.seuil > 0 ? `Je te préviens quand il en reste moins de ${prNum(x.seuil)}` : 'Je ne te préviens pas : choisis à partir de combien'}</button>${cons ? `<span class="gris petit">Conseil : sous ${cons}, d’après ce que tu utilises <button type="button" class="lien ms-lien" data-ms="fseuil|${x.id}|${cons}">Mettre ${cons}</button></span>` : ''}`}</div>`}
      ${cs > 0 ? `<div class="gris petit">Tu en utilises environ ${prNum(Math.round(cs * 10) / 10)} par semaine${x.q > 0 ? ` : de quoi tenir ${Math.max(1, Math.floor(x.q / cs))} semaine${Math.floor(x.q / cs) > 1 ? 's' : ''}` : ''}.</div>` : ''}</div>
    <div class="ms-boutons">${noir}${tech ? `<button type="button" class="btn gris" data-ms="fmanque|${x.id}">Il me manque</button>` : `<button type="button" class="btn gris" data-ms="fq|ranger|${x.id}">Ranger</button><button type="button" class="btn gris" data-ms="fq|deplacer|${x.id}">Déplacer</button>`}</div>
    ${tech ? '' : `<div class="carte"${matVis('article-prix')}><h3>Prix</h3>
      <div class="ligne"><span>Je l’achète</span><b>${x.pa ? eur(x.pa) + ' HT' : x.ac ? 'prix à compléter' : '—'}</b></div>${hausse > 0 ? `<div class="gris petit ms-haus">${prNum(Math.abs(hausse))} % de plus qu’avant</div>` : hausse < 0 ? `<div class="gris petit ms-haus">${prNum(Math.abs(hausse))} % de moins qu’avant</div>` : ''}
      ${prVend(x) ? `<div class="ligne"><span>Je le vends</span><b>${eur(x.pv)} HT</b></div><div class="ligne"><span>Marge</span><b>${M != null ? M + ' %' : '—'}</b></div><div class="ligne"><span>TVA</span><b>${prNum(x.tva)} %</b></div>` : '<div class="gris petit">C’est du matériel pour ton équipe : il n’est jamais facturé.</div>'}
      ${edp ? `<div class="deux-champs"><label class="champ">J’achète (€ HT)<input class="saisie" inputmode="decimal" data-msf="pa" value="${x.pa ? prNum(x.pa) : ''}"></label>${prVend(x) ? `<label class="champ">Je vends (€ HT)<input class="saisie" inputmode="decimal" data-msf="pv" value="${prNum(x.pv)}" ${msPrixVente() ? '' : 'disabled'}></label>` : ''}</div>${msPrixVente() ? '' : '<span class="gris petit">Le prix de vente se change par le gérant.</span>'}<span class="ms-fb"><button type="button" class="btn petit" data-ms="fprix|${x.id}">Enregistrer</button><button type="button" class="btn gris petit" data-ms="fprixx">Annuler</button></span>`
        : `<button type="button" class="lien ms-lien" data-ms="fprixo|${x.id}">Changer un prix</button>`}
      ${moins ? `<div class="ligne"><span class="gris">Chez d’autres fournisseurs</span><span class="fo-dr"><b>${esc(moins[0])} ${eur(moins[1])}</b><button type="button" class="lien ms-lien" data-ms="fchez|${x.id}|${esc(moins[0])}">Passer chez lui</button></span></div>` : ''}
      ${conseilPv && prVend(x) && x.pv < conseilPv - .05 ? `<div class="gris petit">Pour garder 40 % de marge, vends-le ${eur(conseilPv)} HT.</div>` : ''}</div>`}
    ${bout.length ? `<div class="carte"><h3>Bouteilles</h3>${bout.map(b => { const s = sxBoutEtat(b); return `<div class="ligne"><span><b>${esc(b.id)}</b><br><span class="gris petit">${esc(lieuNom(b.lieu))} · capacité ${prNum(b.cap)} kg</span></span><span class="fo-dr"><b>il reste ${prNum(b.reste)} kg</b><span class="st ${s[1]}">${s[0]}</span></span></div>`; }).join('')}<button type="button" class="lien ms-lien" data-sx="fluides">Registre des fluides ›</button></div>` : ''}
    <details class="ms-acc"><summary>Où il est</summary>${ou.map(l => `<div class="ligne"><span>${esc(l.nom)}</span><span class="fo-dr"><b>${prNum(stkAt(x, l.id))}</b>${tech ? '' : `<button type="button" class="lien ms-lien" data-ms="fq|deplacer|${x.id}|${l.id}">Déplacer</button>`}</span></div>`).join('') || '<div class="gris">Nulle part.</div>'}</details>
    <details class="ms-acc"><summary>Derniers gestes</summary>${gestes.map(m => `<div class="ms-ph ligne">${msPhraseHtml(m)}</div>`).join('') || '<div class="gris">Aucun geste.</div>'}${gestes.length ? `<button type="button" class="lien ms-lien" data-ms="fhisto|${x.id}">Tout voir</button>` : ''}</details>
    <details class="ms-acc"><summary>Dans tes documents</summary><div class="gris">Utilisé dans ${pdxPl(usage.inters.length, 'intervention')} et ${pdxPl(usage.devis.length, 'devis', 'devis')}.</div></details>
    ${tech ? '' : `<div class="actions ms-pied-f"><button type="button" class="btn gris" data-pr="modif|${x.id}">Modifier</button><button type="button" class="lien ms-rouge" data-pr="retirer|${x.id}">Retirer cet article</button></div>`}`);
  const p = document.querySelector('#calque .panneau'); if (p) p.dataset.pdxart = id;
}

/* ── le formulaire « Ajouter / modifier un article » : QUATRE champs d’abord, le reste derrière « Plus de détails » ── */
function msFormApres(x){
  const p = document.querySelector('#calque .panneau'); if (!p || !document.getElementById('pr-nom')) return;
  const lab = id => { const e = document.getElementById(id); return e && e.closest('label'); }, plus = document.createElement('details'); plus.className = 'ms-acc ms-plus'; plus.innerHTML = '<summary>Plus de détails</summary>';
  const nomL = lab('pr-nom'), range = document.createElement('div'); range.className = 'gris petit ms-range'; range.id = 'ms-range';
  const rng = () => { const k = (document.getElementById('pr-pack') || {}).value, c = (document.getElementById('pr-cat') || {}).value, P = PACKS[k]; range.innerHTML = P ? `Rangé dans : ${esc(P.nom.split(/ \/|,/)[0])} › ${esc(c || '')} · <button type="button" class="lien ms-lien" data-ms="fchange">Changer</button>` : ''; };
  rng(); const sugg = document.getElementById('pr-sugg'); if (sugg) sugg.insertAdjacentElement('afterend', range);
  const met = p.querySelector('.pr-met'); if (met) { met.hidden = true; plus.appendChild(met); }
  const fourL = lab('pr-ref'); if (fourL && fourL.parentElement) plus.appendChild(fourL.parentElement);
  const q = lab('pr-q'), u = lab('pr-u'), s = lab('pr-seuil'), pa = lab('pr-pa'), pv = lab('pr-pv'), tva = lab('pr-tva');
  if (q) q.firstChild.textContent = 'Combien j’en ai';
  const trois = q && q.parentElement; if (trois) { trois.className = 'deux-champs'; if (s) { s.firstChild.textContent = 'Me prévenir quand il en reste moins de'; plus.appendChild(s); } }
  const prix = pa && pa.parentElement; if (prix) { if (pa) { pa.firstChild.textContent = 'Prix d’achat HT (€)'; plus.appendChild(pa); } if (tva) plus.appendChild(tva); }
  const nat = document.getElementById('pdx-nat'); if (nat) { nat.querySelectorAll('button').forEach(b => { b.textContent = b.dataset.pdx.endsWith('vente') ? 'Oui, je le facture' : 'Non, c’est du matériel pour mon équipe'; });
    const q0 = document.createElement('h3'); q0.className = 'mat-h'; q0.textContent = 'Je le vends au client ?'; nat.insertAdjacentElement('beforebegin', q0); if (pv) { pv.firstChild.textContent = 'Prix de vente HT (€)'; nat.insertAdjacentElement('afterend', pv); } }
  const act = p.querySelector('.actions'); if (act) { act.insertAdjacentElement('beforebegin', plus); const b = act.querySelector('[data-pr^="garder|"]'); if (b) b.textContent = x ? 'Enregistrer' : 'Ajouter l’article'; }
  const refresh = () => rng(); p.addEventListener('input', refresh); p.addEventListener('change', refresh);
}
(() => { const o = prFormulaire; prFormulaire = function(x){ const r = o.apply(this, arguments); msFormApres(x); return r; }; })();

/* ── les clics et les saisies de ces écrans ── */
document.addEventListener('click', ev => {
  const b = ev.target.closest('[data-ms]'); if (!b) return;
  const [a, x, y, z] = b.dataset.ms.split('|'), G = MAT.G, C = MAT.C;
  if (a === 'maj') return matGOuvrir('quoi');
  if (a === 'plus') return msMenuPlus(b);
  if (a === 'ou') return msMenuOu(b);
  if (a === 'onglet') { stkOnglet = x; return rendre(); }
  if (a === 'envois') return msEnvois();
  if (a === 'toutacc') return msAccepter(null, true);
  if (a === 'acc') return msAccepter([x]);
  if (a === 'ref') return msRefuser(x);
  if (a === 'rmot') { const t = document.getElementById('ms-rm'); if (t) { t.value = x; t.focus(); } return; }
  if (a === 'rok') return msRefusOk(x);
  if (a === 't') { fermerPanneau(); if (x === 'cmd' || x === 'liv') { prVue = 'commandes'; return aller('produits'); } return aller('boxes'); }
  if (a === 'habituels') { prVue = 'articles'; return aller('produits'); }
  if (a === 'ajouteq') { const n = stkQ.trim(); prFormulaire(null, PACKS_ENT[0], ''); const i = document.getElementById('pr-nom'); if (i) { i.value = n; i.dispatchEvent(new Event('input', { bubbles:true })); } return; }
  if (a === 'filtrer') return msFiltrer();
  if (a === 'pk') { mvFiltre = x; foGarder(msFiltrer); return rendre(); }
  if (a === 'fraz') { mvFiltre = 'tous'; SX.mvOu = 'tous'; SX.mvQui = 'tous'; SX.mvPer = 'tout'; foGarder(msFiltrer); return rendre(); }
  if (a === 'q') return matFeuille(x === 'compter' ? 'compter' : x);
  if (a === 'cpt') return matCompter(x || undefined);
  if (G && a === 'gajoute') { const p = PRODUITS.find(o => o.id === x); if (p && !G.lignes.some(l => l.pid === x)) { G.lignes.push({ pid:x, q:Math.min(sxPas(p), G.mode === 'ranger' ? 99 : stkAt(p, G.de)) || sxPas(p) }); G.q = ''; } return foGarder(matGVue); }
  if (G && a === 'gmoins') { const l = G.lignes[+x], p = l && PRODUITS.find(o => o.id === l.pid); if (l) { const pas = sxPas(p); if (l.q - pas < pas - .001) toast(`Pour ne rien noter de ${esc(matNomCourt(p))}, touche « Retirer ».`); else l.q = stkR(l.q - pas); } return foGarder(matGVue); }
  if (G && a === 'gplus') { const l = G.lignes[+x], p = l && PRODUITS.find(o => o.id === l.pid); if (l) { const dispo = G.mode === 'ranger' ? 9999 : stkAt(p, G.de); if (l.q + sxPas(p) > dispo + .001) toast(`Il n’y en a que ${sxQte(dispo, p)} à cet endroit.`); else l.q = stkR(l.q + sxPas(p)); } return foGarder(matGVue); }
  if (G && a === 'gret') { G.lignes.splice(+x, 1); return foGarder(matGVue); }
  if (G && a === 'gpour') { G.pour = x; return foGarder(matGVue); }
  if (G && a === 'gchinter') { G.choisirInter = true; G.inter = ''; return foGarder(matGVue); }
  if (G && a === 'ginter') { G.inter = x; G.choisirInter = false; G.qi = ''; return foGarder(matGVue); }
  if (G && a === 'gorig') { G.origine = x; return foGarder(matGVue); }
  if (G && a === 'gechange') { const d = G.de; G.de = G.vers; G.vers = d; G.lignes = G.lignes.filter(l => stkAt(PRODUITS.find(p => p.id === l.pid), G.de) > 0); return foGarder(matGVue); }
  if (G && a === 'grecevoir') { MAT.G = null; fermerPanneau(); return cmdReception(x); }
  if (G && a === 'gfacture') { MAT.G = null; fermerPanneau(); return typeof foFactureVue === 'function' ? foFactureVue() : undefined; }
  if (G && a === 'genvoyer') return matGEnvoyer();
  if (C && a === 'cmoins') { const p = PRODUITS.find(o => o.id === x), v = C.v[x] != null ? C.v[x] : stkAt(p, C.lieu); C.v[x] = Math.max(0, stkR(v - sxPas(p))); return foGarder(matCVue); }
  if (C && a === 'cplus') { const p = PRODUITS.find(o => o.id === x), v = C.v[x] != null ? C.v[x] : stkAt(p, C.lieu); C.v[x] = stkR(v + sxPas(p)); return foGarder(matCVue); }
  if (C && a === 'ctout') { C.v = {}; return foGarder(matCVue); }
  if (C && a === 'cgrp') { C.grp = !C.grp; return foGarder(matCVue); }
  if (C && a === 'cok') return matCEnregistrer();
  /* la fiche d’un article */
  if (a === 'fq') { const [mode, pid, de] = [x, y, z]; const p = PRODUITS.find(o => o.id === pid); fermerPanneau(); return matFeuille(mode, { pid, de:de || (p && stkAt(p, 'atelier') > 0 ? 'atelier' : (LIEUX.find(l => stkAt(p, l.id) > 0) || {}).id || 'atelier') }); }
  if (a === 'fcmd') { const p = PRODUITS.find(o => o.id === x); fermerPanneau(); prVue = 'commandes'; aller('produits'); return toast(p && p.pa ? `${esc(p.nom)} est dans « À commander », chez ${esc(p.four)}.` : 'Pas de prix : ajoute-le pour que la commande se prépare.'); }
  if (a === 'fusage') { fermerPanneau(); return matFeuille('usage', { pid:x }); }
  if (a === 'fmanque') { fermerPanneau(); return matManque({ pid:x }); }
  if (a === 'fseuilo') { MS_FICHE.seuil = x; return prFiche(x); }
  if (a === 'fseuilx') { const id = MS_FICHE.seuil; MS_FICHE.seuil = null; return prFiche(id); }
  if (a === 'fseuil') { const p = PRODUITS.find(o => o.id === x), v = y ? Number(y) : foNum((document.getElementById('ms-seuil') || {}).value); if (!p) return; if (!(v >= 0)) return toast('Mets un nombre : zéro pour ne plus être prévenu.'); const av = p.seuil; p.seuil = v; MS_FICHE.seuil = null; prCatalogueMaj(); rendre(); prFiche(x); return toast(`C’est noté : je te préviens quand il en reste moins de ${prNum(v)}.`, { lib:'Annuler', fn:() => { p.seuil = av; prCatalogueMaj(); rendre(); } }); }
  if (a === 'fprixo') { MS_FICHE.prix = x; return prFiche(x); }
  if (a === 'fprixx') { const id = MS_FICHE.prix; MS_FICHE.prix = null; return prFiche(id); }
  if (a === 'fprix') { const p = PRODUITS.find(o => o.id === x), pa = foNum((document.querySelector('[data-msf="pa"]') || {}).value), pv = document.querySelector('[data-msf="pv"]') ? foNum(document.querySelector('[data-msf="pv"]').value) : null; if (!p) return;
    if ((pa != null && !(pa >= 0)) || (pv != null && !(pv >= 0))) return toast('Un prix s’écrit avec des chiffres, jamais en négatif.');
    const av = { pa:p.pa, paAvant:p.paAvant, pv:p.pv }; if (pa != null && pa !== p.pa) { p.paAvant = p.pa || undefined; p.pa = pa; } if (pv != null && msPrixVente()) p.pv = pv; MS_FICHE.prix = null; prCatalogueMaj(); rendre(); prFiche(x);
    return toast('Prix enregistré.', { lib:'Annuler', fn:() => { Object.assign(p, av); prCatalogueMaj(); rendre(); } }); }
  if (a === 'fchez') { const p = PRODUITS.find(o => o.id === x), pa = p && (p.offres || {})[y]; if (!p || pa == null) return; const av = { four:p.four, pa:p.pa, paAvant:p.paAvant }; p.paAvant = p.pa; p.four = y; p.pa = pa; prCatalogueMaj(); rendre(); prFiche(x);
    return toast(`${esc(p.nom)} : je le prends maintenant chez ${esc(y)}.`, { lib:'Annuler', fn:() => { Object.assign(p, av); prCatalogueMaj(); rendre(); } }); }
  if (a === 'fhisto') { const p = PRODUITS.find(o => o.id === x); fermerPanneau(); mvRech = p ? matNomCourt(p) : ''; mvFiltre = 'tous'; SX.mvOu = 'tous'; SX.mvPer = 'tout'; SX.mvQui = 'tous'; stkOnglet = 'mvts'; return aller('stock'); }
  if (a === 'fchange') { const m = document.querySelector('#calque .pr-met'); if (m) m.hidden = false, m.closest('details').open = true; return; }
}, true);
document.addEventListener('input', ev => {
  const t = ev.target; if (!t.matches) return;
  if (t.id === 'msg-q' && MAT.G) { MAT.G.q = t.value; const r = document.getElementById('msg-res'); if (r) r.innerHTML = msgResultats(MAT.G); return; }
  if (t.matches('[data-msg="qi"]') && MAT.G) { MAT.G.qi = t.value; MAT.G.choisirInter = true; const z = t.closest('label'), L = z && z.nextElementSibling; if (L) L.innerHTML = msIntsPour(t.value).map(o => `<button type="button" class="ligne-clic" data-ms="ginter|${o.id}"><span class="fo-n"><b>${esc(matInterTitre(o))}</b><span class="gris petit">${esc(matInterQuand(o))}</span></span></button>`).join(''); return; }
  if (t.matches('[data-msg="texte"]') && MAT.G) { MAT.G.texte = t.value; return; }
  if (t.matches('[data-msg="montant"]') && MAT.G) { MAT.G.montant = t.value; return; }
});
document.addEventListener('change', ev => {
  const t = ev.target; if (!t.matches) return; const G = MAT.G, C = MAT.C;
  if (t.matches('[data-msg]') && G) { const k = t.dataset.msg; if (k === 'br' || k === 'ticket') G[k] = t.checked; else if (!['qi', 'texte', 'montant'].includes(k)) { G[k] = t.value;
      if (k === 'de') { G.lignes = G.mode === 'ranger' ? G.lignes : G.lignes.filter(l => stkAt(PRODUITS.find(p => p.id === l.pid), G.de) > 0); if (G.vers === G.de) G.vers = (LIEUX.find(l => l.id !== G.de && !l.ferme) || {}).id; } }
    return foRefocus(() => foGarder(matGVue)); }
  if (t.matches('[data-msgq]') && G) { const l = G.lignes[+t.dataset.msgq], x = l && PRODUITS.find(p => p.id === l.pid), n = foNum(t.value), a = x ? (G.mode === 'ranger' ? 9999 : stkAt(x, G.de)) : 0;
    if (x && n > 0) { l.q = Math.min(n, a); if (n > a) toast(`Il n’y en a que ${sxQte(a, x)} : j’ai mis ${prNum(a)}.`); } else if (x) toast(`Une quantité doit être plus grande que zéro : j’ai gardé ${sxQte(l.q, x)}.`); return foRefocus(() => foGarder(matGVue)); }
  if (t.matches('[data-mscq]') && C) { const n = foNum(t.value); if (n != null && n >= 0) C.v[t.dataset.mscq] = n; else toast('Un comptage ne peut pas être négatif.'); return foRefocus(() => foGarder(matCVue)); }
  if (t.matches('[data-msf]') && t.dataset.msf in { ou:1, qui:1, per:1, du:1, au:1 }) { const k = t.dataset.msf; if (k === 'ou') SX.mvOu = t.value; else if (k === 'qui') SX.mvQui = t.value; else if (k === 'per') { SX.mvPer = t.value; if (t.value === 'perso' && !SX.mvDu) { SX.mvDu = jour(-30); SX.mvAu = AUJ; } } else if (k === 'du') SX.mvDu = t.value; else SX.mvAu = t.value; foGarder(msFiltrer); return rendre(); }
  if (t.matches('[data-msr]')) { const k = t.dataset.msr; if (k === 'valid') { STK_VALID = t.checked; foGarder(msReglagesVue); return rendre(); } if (k === 'freq') { const n = Math.max(1, Math.min(24, Math.round(Number(t.value) || 3))); SX.freqDef = n; return toast(`C’est noté : je te rappelle de compter tous les ${n} mois.`); } if (k === 'an') { SX.regAn = t.value; return sxRegistre(); } }
});
