/* ══ MATÉRIEL — lot 4 : Fournisseurs, matériel & produits (spec § 7 et § 4), 17 novembre 2026 ══
   Spécification : scratchpad/proto-final/refonte/MATERIEL.md § 7. L’écran répond à UNE question — « Qu’est-ce que je commande, chez qui, à quel prix ? » — et s’ouvre sur
   son travail : trois onglets (Commandes, Articles, Fournisseurs), un seul bouton noir qui change avec l’onglet, un appareil photo pour la facture, « Plus » pour le rare.
   Commandes s’ouvre sur « À commander » (UN bloc par fournisseur), puis la liste des commandes rangée par ce qu’il y a à FAIRE. Articles : une recherche, un filtre,
   la liste par catégorie. Fournisseurs : des cartes sans bouton, la fiche en trois cartes (le joindre, comment il livre, mon compte).
   ⚠️ Ce bloc REMPLACE vueProduits (et son enveloppe de filtres d’état), vueCommandes (et son enveloppe), vueFournisseurs, fournFiche (et son enveloppe), fournListe, foLocal,
   cmdEdVue, cmdFiche, cmdEtapes, cmdReception, cmdRappro et cmdEnvoyer : UNE définition par fonction (`grep "function nom("` avant d’en écrire une ; sonde materiel-four-fonctions.js).
   Les écritures et les calculs restent ceux d’avant : cmdPaniers, cmdSuggere, cmdFranco, cmdMoinsCher, cmdAlerte, cmdReceptionner, cmdFacturer, foAppliquer, foFactureValider. */
const FX = { filtre:'tout', term:false, ajTab:'liste' };
try { const v = localStorage.getItem('opg_prvue'); if (v === 'commandes' || v === 'articles' || v === 'fournisseurs') prVue = v; } catch (e) {}   // l’onglet est celui que l’appareil a quitté ; la première fois : Commandes
const fxGerant = () => msGerant();   // ajouter ou retirer un fournisseur, retirer un article : le gérant ; le bureau prépare, envoie et reçoit les commandes
const fxQuand = d => { const n = tJours(d); return n === 0 ? 'aujourd’hui' : n === 1 ? 'demain' : n === -1 ? 'hier' : jlong(d); };
const fxLiv = f => !f || f.dj == null ? '' : f.dj === 0 ? 'Retrait au comptoir' : `Livraison en ${f.dj} jour${f.dj > 1 ? 's' : ''}`;
const fxGratuite = f => f && f.franco > 0 ? `gratuite dès ${eur(f.franco)}` : '';
/* le texte « livré sous 24 h » que lisent le courriel et la carte est GÉNÉRÉ depuis le nombre de jours : une seule saisie (spec § 7.4, défaut F11) */
const delaiTxt = f => f && f.dj != null ? pdxDelaiTexte(f.dj) : (f && f.delai) || '';
const fxChiffre = n => n ? Number(n).toFixed(2).replace('.', ',') : '';
function fxMenu(b, titre, items){ const r = b.getBoundingClientRect(); ouvrirMenu(r.left, r.bottom + 6, titre, items); }

/* ── l’en-tête : un seul noir, qui change avec l’onglet ; la facture se photographie d’ici (ordinateur et téléphone) ── */
function fxTete(){
  const k = prVue, noir = k === 'commandes' ? '<button type="button" class="btn" data-ce="nouvelle">＋ Nouvelle commande</button>'
    : k === 'articles' ? `<button type="button" class="btn" data-pr="nouveau|${PACKS_ENT[0]}|">＋ Ajouter un article</button>`
    : fxGerant() ? '<button type="button" class="btn" data-fo="liste">＋ Ajouter un fournisseur</button>' : '';
  return `<div class="tete fx-tete"><div><span class="surtitre">Matériel</span><h1>Fournisseurs, matériel &amp; produits</h1></div>
    <div class="actions">${noir}<button type="button" class="btn gris fx-photo" data-fo="facture|"${matVis('four-photo')} aria-label="Photographier une facture" title="Photographier une facture">${svg('photo')}<span class="fx-lib">Photographier une facture</span></button><button type="button" class="btn gris fx-plusb" data-fx="plus" aria-haspopup="menu" aria-label="Plus d’actions" title="Plus d’actions">Plus ▾</button></div></div>`;
}
function fxOnglets(){
  const nc = cmdNbACommander(), na = PRODUITS.filter(x => !x.retire).length, nf = MES_FOURN.length;
  return `<div class="seg ms-seg fx-seg" role="tablist" aria-label="Fournisseurs, matériel et produits"${matVis('four-onglets')}>${[['commandes', 'Commandes', nc, true], ['articles', 'Articles', na, false], ['fournisseurs', 'Fournisseurs', nf, false]]
    .map(([k, l, n, chaud]) => `<button type="button" role="tab" data-pr="vue|${k}" aria-pressed="${prVue === k}" aria-selected="${prVue === k}" aria-label="${l}${n ? ' · ' + n : ''}">${l}${n ? `<span class="pr-nb${chaud ? ' chaud' : ''}" aria-hidden="true">${n}</span>` : ''}</button>`).join('')}</div>`;
}
function vueProduits(){
  try { localStorage.setItem('opg_prvue', prVue); } catch (e) {}
  return fxTete() + fxOnglets() + (prVue === 'articles' ? fxArticles() : prVue === 'fournisseurs' ? fxFournisseurs() : fxCommandes());
}
function fxMenuPlus(b){
  const it = [{ ic:svg('photo'), l:'Importer les prix d’un fournisseur', fn:() => fournTarifs('') }, { ic:svg('article'), l:'Choisir parmi les articles habituels de mon métier', fn:fxHabituels },
    { ic:svg('registre'), l:'Voir comment les articles sont rangés par métier', fn:() => prRangement(PACKS_ENT[0]) }];
  if (prVue === 'articles') it.push('---', { ic:svg('compter'), l:'Trier par', s:'›', garde:true, fn:() => fxMenuTri(b) });
  fxMenu(b, '', it);
}
function fxMenuTri(b){
  const t = (k, l) => ({ ic:PDX.tri === k ? '✓' : '', l, fn:() => { PDX.tri = k; rendre(); } });
  fxMenu(b, 'Trier les articles', [t('rangement', 'Les plus utilisés d’abord'), t('nom', 'Par nom'), t('marge', 'Par marge'), t('stock', 'Par stock restant')]);
}
function fxHabituels(){
  if (!MES_FOURN.length) return fournListe();
  if (MES_FOURN.length === 1) return fournPreparer(MES_FOURN[0].id);
  foOuvrir(`<span class="surtitre">Fournisseurs, matériel &amp; produits</span><h2>Les articles habituels de mon métier</h2><span class="gris">Choisis le fournisseur : ses articles habituels se cochent par catégorie et se rangent tout seuls.</span>
    <div class="carte ms-envois">${MES_FOURN.map(f => `<button type="button" class="ms-l" data-fo="preparer|${f.id}"><span class="fo-n"><b>${esc(f.nom)}</b><span class="gris petit">${pdxPl(foArticles(f).length, 'article')} chez toi</span></span><span class="gris" aria-hidden="true">›</span></button>`).join('')}</div>`);
}

/* ── Commandes : « À commander » (un bloc par fournisseur), puis ce qu’il y a à FAIRE sur les commandes ── */
const fxPhrase = l => {
  const x = l.x, reste = x ? `Il en reste ${prNum(x.q)}` : 'Pas encore dans ta liste', P = [reste];
  if (l.demande) P.push('demandé par ' + prenomDe(l.demande.qui));
  else if (l.inter && l.inter.t && l.inter.t.par) P.push('demandé par ' + prenomDe(l.inter.t.par));
  if (l.inter && l.inter.i) P.push(`pour l’intervention du ${jlong(l.inter.i.d)}, ${CLIENTS[l.inter.i.cli].nom}`);
  else if (!l.demande && x && x.seuil > 0) P.push('bientôt fini');
  return P.join(' · ');
};
function fxPanier(pan){
  const f = foDe(pan.four), F = cmdFranco(pan), b = cmdBrouillonDe(pan.four), sous = [fxLiv(f), F.ht ? eur(F.ht) + ' HT' : ''].filter(Boolean).join(' · ');
  const lignes = pan.lignes.map(l => { const mc = cmdMoinsCher(l.x, pan.four), tard = l.inter && l.inter.i && f && f.dj != null && tJours(ajoute(AUJ, f.dj)) > tJours(l.inter.i.d), k = esc(l.k), nom = esc(l.nom);
    const detail = [l.pourquoi && l.pourquoi.replace(/^./, c => c.toUpperCase())].filter(Boolean)[0];
    return `<div class="fx-pl"><span class="fo-n"><b>${nom}</b><span class="gris petit">${esc(fxPhrase(l))}</span>${tard ? '<span class="fx-tard petit">Livré trop tard : retrait au comptoir ?</span>' : ''}
        ${detail ? `<details class="fx-i"><summary aria-label="Pourquoi cette quantité ?" title="Pourquoi cette quantité ?"><span aria-hidden="true">i</span></summary><span class="gris petit">${esc(detail)}</span></details>` : ''}
        ${mc ? `<span class="fx-mc petit">Chez ${esc(mc.four)} : ${eur(prixChez(l.x, pan.four) - mc.pa)} de moins · <button type="button" class="lien fx-lien" data-cm="depl|${k}|${esc(mc.four)}">Le prendre chez lui</button></span>` : ''}</span>
      <span class="fx-pq"><span class="mat-pas"><button type="button" data-fx="pas|${k}|-1" aria-label="Un de moins : ${nom}">−</button><input inputmode="decimal" data-cmq="${k}" value="${prNum(l.q)}" aria-label="Quantité de ${nom}"><button type="button" data-fx="pas|${k}|1" aria-label="Un de plus : ${nom}">+</button></span>
        <span class="gris petit fx-u">${esc(prU(l.q, l.u))}${l.pu ? ' · ' + eur(l.q * l.pu) : ''}</span><button type="button" class="lien fx-lien" data-cm="hors|${k}">Retirer</button></span></div>${l.pu ? '' : '<div class="fx-sansprix petit">Pas de prix : ajoute-le pour que la commande se prépare.</div>'}`; }).join('');
  const franco = F.manque > 0 ? `<div class="fx-franco"><div class="cmd-barre"><i style="width:${Math.min(100, Math.round(F.ht / f.franco * 100))}%"></i></div><span class="petit">Plus que <b>${eur(F.manque)}</b> pour la livraison gratuite — sinon ${eur(f.port)} de port</span>${F.idees.length ? `<span class="fx-idees petit">${F.idees.map(x => `<button type="button" class="lien fx-lien" data-cm="plus|${x.id}">＋ ${esc(x.nom)} (il t’en reste ${prNum(x.q)})</button>`).join('')}</span>` : ''}</div>`
    : f && f.franco ? '<div class="fx-franco ok petit">✓ Livraison gratuite</div>' : '';
  const mail = f && !f.mail ? `<div class="fx-mail"><span class="st st-r">Il manque son e-mail pour envoyer la commande</span><label class="fx-mailc"><span class="gris petit">E-mail des commandes de ${esc(f.nom)}</span><input class="saisie" type="email" inputmode="email" data-fxmail="${f.id}" placeholder="commandes@…" autocomplete="off"></label></div>` : '';
  return `<section class="fx-pan" id="pan-${foSlug(pan.four)}"><div class="fx-pt"><b>${esc(pan.four)}</b><span class="gris petit">${f ? esc(sous) : 'Fournisseur non enregistré'}</span></div>${lignes}${franco}${mail}
    <div class="fx-pb"><button type="button" class="btn gris" data-cm="preparer|${esc(pan.four)}">${b ? 'Ajouter au brouillon ' + esc(matNumAff(b.num)) : 'Préparer la commande'}</button></div></section>`;
}
function fxPastille(c){
  const a = cmdAlerte(c);
  if (a && a.t === 'retard') { const n = -tJours(c.st === 'partielle' ? c.reliquat : c.prevue); return ['En retard ' + (n > 1 ? 'de ' + n + ' jours' : 'd’1 jour'), 'st-r']; }
  if (a && a.t === 'silence') return ['Sans réponse', 'st-o'];
  return mtbEtat(c);
}
const fxQuandCmd = c => c.st === 'brouillon' ? 'brouillon du ' + jCourt(c.cree || AUJ) : c.st === 'recue' ? 'livrée ' + (c.recue ? 'le ' + jCourt(c.recue) : '') : c.st === 'partielle' ? (c.reliquat && tJours(c.reliquat) < 0 ? 'le reste devait arriver le ' : 'le reste arrive ') + (c.reliquat ? (tJours(c.reliquat) < 0 ? jCourt(c.reliquat) : fxQuand(c.reliquat)) : 'à une date inconnue')
  : cmdOuverte(c) ? (c.prevue ? (tJours(c.prevue) >= 0 ? 'attendue ' + fxQuand(c.prevue) : 'était attendue le ' + jCourt(c.prevue)) : 'sans date confirmée') : c.st === 'facturee' ? 'terminée le ' + jCourt((c.fac && c.fac.le) || c.recue || AUJ) : 'annulée';
function fxBoutonCmd(c){
  const a = cmdAlerte(c);
  if (c.st === 'recue') return `<button type="button" class="btn gris petit fx-ab" data-cm="rappro|${c.id}">Comparer</button>`;
  if (a && (a.t === 'retard' || a.t === 'silence')) return `<button type="button" class="btn gris petit fx-ab" data-cm="relance|${c.id}">Relancer</button>`;
  if (cmdOuverte(c)) return `<button type="button" class="btn gris petit fx-ab" data-cm="recep|${c.id}"><span class="fx-long">J’ai reçu la livraison</span><span class="fx-court" aria-hidden="true">J’ai reçu</span></button>`;
  return '';
}
function fxLigneCmd(c){
  const e = fxPastille(c), a = cmdAlerte(c);
  return `<div class="fx-l${a && a.t !== 'facture' ? ' fx-al' : ''}"><button type="button" class="fx-lm" data-cm="voir|${c.id}"><span class="fo-n"><b>Commande ${esc(matNumAff(c.num))} · ${esc(c.four)}</b><span class="gris petit">${eur(cmdHT(c))} HT · ${esc(fxQuandCmd(c))}</span></span><span class="fo-dr"><span class="st ${e[1]}">${esc(e[0])}</span></span></button>${fxBoutonCmd(c)}</div>`;
}
function fxCommandes(){
  const pans = cmdPaniers(), nb = pans.reduce((s, p) => s + p.lignes.length, 0), tri = (a, b) => (cmdAlerte(b) ? 1 : 0) - (cmdAlerte(a) ? 1 : 0) || ((b.env || b.cree || '') > (a.env || a.cree || '') ? 1 : -1);
  const traiter = COMMANDES.filter(c => c.st === 'brouillon' || c.st === 'recue' || cmdAlerte(c)).sort(tri), enRoute = COMMANDES.filter(c => cmdOuverte(c) && !traiter.includes(c)).sort(tri), finies = COMMANDES.filter(c => c.st === 'facturee' || c.st === 'annulee').sort(tri);
  const late = pdxEnRetard(), mois = COMMANDES.filter(c => c.st !== 'annulee' && c.st !== 'brouillon' && c.env && c.env.slice(0, 7) === AUJ.slice(0, 7)).reduce((s, c) => s + cmdHT(c), 0);
  const carte = nb ? `<div class="carte fx-acmd" id="pans"${matVis('four-commander')}><div class="fx-ch"><div><h3>À commander · ${nb}</h3><span class="gris">${pdxPl(nb, 'article')} chez ${pdxPl(pans.length, 'fournisseur')}</span></div>${pans.length > 1 ? `<button type="button" class="btn gris" data-pdx="toutprep">Tout préparer · ${pans.length}</button>` : ''}</div>${pans.map(fxPanier).join('')}</div>`
    : COMMANDES.length ? '<div class="carte fx-rien"><b>Rien à commander</b><span class="gris">Tout est au-dessus de son seuil, et aucune intervention n’attend de pièce.</span></div>' : '';
  const grp = (t, L, plus) => L.length ? `<div class="groupe fx-gh">${t}${plus || ''}</div>${L.map(fxLigneCmd).join('')}` : '';
  const liste = COMMANDES.length ? `<div class="carte dv-liste ms-liste fx-liste"${matVis('four-liste')}>${grp('À traiter', traiter, late.length > 1 ? `<button type="button" class="btn gris petit fx-gb" data-pdx="relgroup">Relancer les ${late.length} commandes en retard</button>` : '')}${grp('En route', enRoute)}${!traiter.length && !enRoute.length ? '<div class="gris fx-calme">Rien à suivre pour l’instant : toutes les commandes sont terminées.</div>' : ''}</div>`
    : `<div class="carte ms-vide"><span class="ms-vic">${svg('livraison')}</span><b>Aucune commande pour l’instant.</b><span class="gris">Quand un article sera bientôt fini, il apparaîtra ici avec le fournisseur déjà choisi.</span><span class="ms-vb"><button type="button" class="btn" data-ce="nouvelle">＋ Nouvelle commande</button></span></div>`;
  const ligneT = c => { const e = fxPastille(c); return `<button type="button" class="fx-tr" data-cm="voir|${c.id}"><b>${esc(matNumAff(c.num))}</b><span class="fx-tf">${esc(c.four)}</span><span class="fx-tm mono">${eur(cmdHT(c))} HT</span><span class="gris fx-td">${esc(jCourt((c.fac && c.fac.le) || c.recue || c.env || c.cree || AUJ))}</span><span class="st ${e[1]}">${esc(e[0])}</span></button>`; };
  const term = finies.length ? `<details class="fx-term"${FX.term ? ' open' : ''}><summary><span class="lien">Voir les commandes terminées (${finies.length})</span><span class="gris petit">Commandé en ${ST_MOIS_L[dObj(AUJ).getMonth()]} : ${eur(mois)} HT</span></summary><div class="carte fx-table"><div class="fx-tr fx-te" aria-hidden="true"><b>N°</b><span>Fournisseur</span><span>Montant</span><span>Date</span><span>État</span></div>${finies.map(ligneT).join('')}</div></details>` : '';
  return `${carte}${liste}${term}${carteAide(['Un article bientôt fini arrive ici tout seul, avec le bon fournisseur.', 'La quantité se calcule sur ce que tu utilises.', 'Quand la livraison arrive, touche « J’ai reçu la livraison » : le stock se met à jour.', 'Photographie la facture : les prix se mettent à jour.'])}`;
}
document.addEventListener('toggle', ev => { if (ev.target.matches && ev.target.matches('.fx-term')) FX.term = ev.target.open; }, true);

/* ── Articles : une recherche, un filtre, la liste par catégorie ── */
const fxFiltreNom = { tout:'Tout', vend:'Ce que je vends au client', mat:'Mon matériel (non facturé)', ac:'Prix à compléter' };
const fxFiltre = () => prAC ? 'ac' : FX.filtre;
function fxSetFiltre(k){ prAC = k === 'ac'; FX.filtre = k === 'ac' ? 'tout' : k; if (prAC) { prPack = 'tous'; prCat = null; } rendre(); }
const fxOk = (x, f) => f === 'tout' || (f === 'vend' && prVend(x)) || (f === 'mat' && !prVend(x) && !x.ac) || (f === 'ac' && x.ac);
function fxLigneArt(x){
  const m = prMarge(x), ref = x.ref && x.ref !== '—' ? `Réf. ${x.ref} · ` : '';
  const droite = x.ac && !prVend(x) ? '<span class="st st-o">Prix à compléter</span>' : prVend(x) ? `<b>${eur(x.pv)}</b>${m != null ? `<span class="gris petit">marge ${m} %</span>` : ''}` : '<b class="fx-nf">Non facturé</b>';
  return `<button type="button" class="sk-l ms-l fx-a" data-${x.ac && !prVend(x) ? 'fx="prixac' : 'pr="fiche'}|${x.id}"><span class="ms-ic" aria-hidden="true">${svg(msIcCat(x))}</span><span class="fo-n"><b>${esc(x.nom)}</b><span class="gris petit">${esc(ref + (x.four && x.four !== '—' ? x.four : 'sans fournisseur'))}</span></span>${x.pa ? `<span class="fx-pa gris">achat ${eur(x.pa)}</span>` : ''}<span class="fo-dr">${droite}</span></button>`;
}
function fxArticles(){
  const tous = PRODUITS.filter(x => !x.retire), f = fxFiltre(), q = prQ.trim(), nAC = tous.filter(x => x.ac).length;
  const L = tous.filter(x => (prPack === 'tous' || x.p === prPack) && fxOk(x, f) && (!q || pdxChercheOk(x, q)));
  const packs = metiersPacksVus(), ordre = x => packs.indexOf(x.p) * 1000 + Math.max(0, ((PACKS[x.p] || { cats:[] }).cats.findIndex(c => c.n === x.cat)));
  const G = {}; L.forEach(x => { (G[x.p + '|' + x.cat] = G[x.p + '|' + x.cat] || []).push(x); });
  const cles = Object.keys(G).sort((a, b) => ordre(G[a][0]) - ordre(G[b][0]));
  const classe = A => PDX.tri === 'rangement' ? A.slice().sort((a, b) => (PR_CONSO[b.id] || 0) - (PR_CONSO[a.id] || 0) || a.nom.localeCompare(b.nom, 'fr')) : pdxTrier(A);
  const ouvert = L.length <= 40 || q || f !== 'tout';
  const groupes = cles.map((k, i) => { const A = G[k], x0 = A[0], titre = String(x0.cat).replace(/ \(.*\)$/, '') + (packs.length > 1 && prPack === 'tous' ? ' · ' + metiersCourt(x0.p) : '');
    return `<details class="ms-cat" ${ouvert || i === 0 ? 'open' : ''}><summary class="groupe">${esc(titre)} · ${A.length}</summary>${classe(A).map(fxLigneArt).join('')}</details>`; }).join('');
  const plusMetiers = packs.length > 1 ? `<button type="button" class="btn gris" data-fx="metier" aria-haspopup="menu">${prPack === 'tous' ? 'Tous mes métiers' : esc(metiersCourt(prPack))} ▾</button>` : '';
  const bandeau = nAC && f !== 'ac' ? `<div class="carte dv-focus ms-bandeau"><div class="dv-tache"><span class="t-etat" aria-hidden="true"></span><span class="dv-c"><b>${pdxPl(nAC, 'article')} ${nAC > 1 ? 'attendent' : 'attend'} ${nAC > 1 ? 'leur' : 'son'} prix</b><span class="gris petit">Tant qu’il n’a pas de prix, un article ne part pas dans les devis.</span></span><span class="ms-bd"><button type="button" class="btn gris petit" data-fx="completer">Les compléter</button></span></div></div>` : '';
  const vide = !tous.length ? `<div class="carte ms-vide"><span class="ms-vic">${svg('article')}</span><b>Aucun article.</b><span class="gris">Choisis ceux de ton métier, ils se rangent tout seuls.</span><span class="ms-vb"><button type="button" class="btn" data-fx="habituels">Choisir parmi les articles habituels de mon métier</button><button type="button" class="btn gris" data-pr="nouveau|${PACKS_ENT[0]}|">＋ Ajouter un article</button></span></div>`
    : !L.length ? `<div class="carte ms-vide"><span class="ms-vic">${svg('article')}</span><b>${q ? `Rien trouvé pour « ${esc(q)} ».` : 'Aucun article ici.'}</b><span class="gris">${q ? 'Vérifie l’orthographe, ou ajoute-le.' : 'Change le filtre pour voir les autres.'}</span><span class="ms-vb">${q ? `<button type="button" class="btn gris" data-fx="ajouteq">＋ Ajouter « ${esc(q)} »</button>` : ''}<button type="button" class="btn gris" data-fx="toutvoir">Tout afficher</button></span></div>` : '';
  const nv = tous.filter(prVend).length;
  return `<div class="ms-cherche fx-cherche"${matVis('four-articles')}><input class="saisie" id="fx-q" type="search" data-prq="1" value="${esc(prQ)}" placeholder="Chercher un article, une référence, un fournisseur" aria-label="Chercher un article, une référence ou un fournisseur" autocomplete="off" enterkeyhint="search">
      <button type="button" class="btn gris fx-filtre" data-fx="filtre" aria-haspopup="menu">${esc(fxFiltreNom[f])} ▾</button>${plusMetiers}</div>
    ${bandeau}${vide || `<div class="carte dv-liste ms-liste fx-arts">${groupes}</div>`}
    ${tous.length ? `<div class="gris petit ms-pied">${pdxPl(L.length, 'article')}${L.length !== tous.length ? ' sur ' + tous.length : ''} · ${nv} que je vends · ${tous.filter(x => !prVend(x)).length} de matériel (non facturé)</div>` : ''}
    ${carteAide(['Tape le nom d’un article : tu vois son prix et sa marge.', 'Touche une ligne pour voir où il est, son prix et son fournisseur.', 'Un article sans prix ne part pas dans les devis : complète-le.', 'Chaque article se range tout seul dans la bonne catégorie.'])}`;
}
function fxMenuFiltre(b){
  const nAC = PRODUITS.filter(x => !x.retire && x.ac).length, it = k => ({ ic:fxFiltre() === k ? '✓' : '', l:fxFiltreNom[k] + (k === 'ac' ? ' · ' + nAC : ''), fn:() => fxSetFiltre(k) });
  fxMenu(b, 'Voir', [it('tout'), it('vend'), it('mat'), it('ac')]);
}
function fxMenuMetier(b){
  const it = (k, l) => ({ ic:prPack === k ? '✓' : '', l, fn:() => { prPack = k; prCat = null; rendre(); } });
  fxMenu(b, 'Quel métier ?', [it('tous', 'Tous mes métiers'), ...metiersPacksVus().map(k => it(k, metiersCourt(k)))]);
}

/* ── Fournisseurs : des cartes sans bouton ; un toucher ouvre la fiche ── */
function fxFournisseurs(){
  if (!MES_FOURN.length) return `<div class="carte ms-vide"${matVis('four-fournisseurs')}><span class="ms-vic">${svg('livraison')}</span><b>Ajoute tes fournisseurs pour commander en deux touchers.</b><span class="gris">${fxGerant() ? 'Choisis-les dans la liste de ton métier : tes articles se préparent tout seuls.' : 'Demande au gérant d’ajouter les fournisseurs de l’entreprise.'}</span>${fxGerant() ? '<span class="ms-vb"><button type="button" class="btn" data-fo="liste">Choisir dans la liste de mon métier</button><button type="button" class="btn gris" data-fo="local">Ajouter un fournisseur</button></span>' : ''}</div>`;
  const pans = cmdPaniers(), mois = AUJ.slice(0, 7), dern = f => COMMANDES.filter(c => c.four === f.nom).map(c => c.env || c.cree || '').sort().pop() || '';
  const L = MES_FOURN.slice().sort((a, b) => dern(b).localeCompare(dern(a)) || a.nom.localeCompare(b.nom, 'fr'));
  const carte = f => { const d = foDir(f), A = foArticles(f), pan = pans.find(p => p.four === f.nom), cm = COMMANDES.filter(c => c.four === f.nom && c.st !== 'annulee' && c.env && c.env.slice(0, 7) === mois).reduce((s, c) => s + cmdHT(c), 0);
    const ret = COMMANDES.find(c => c.four === f.nom && (cmdAlerte(c) || {}).t === 'retard'), l2 = [fxLiv(f), fxGratuite(f)].filter(Boolean).join(' · ') || (d ? d.type : 'Livraison à préciser');
    const pas = ret ? `<span class="st st-r">En retard sur la commande ${esc(matNumAff(ret.num))}</span>` : pan ? `<span class="st st-o">${pdxPl(pan.lignes.length, 'article')} à commander</span>` : '';
    const ch = (b, t, cl) => `<span><b${cl ? ` class="${cl}"` : ''}>${b}</b><small>${t}</small></span>`;
    return `<button type="button" class="carte client-carte md-c fx-c" data-fo="fiche|${f.id}"><span class="md-t"><b>${esc(f.nom)}</b>${pas}</span><span class="gris md-l2">${esc(l2)}</span>
      <span class="client-chiffres">${ch(A.length, A.length > 1 ? 'articles' : 'article')}${ch(eur(cm), 'ce mois-ci')}${ch(f.hist ? f.hist.heure + ' %' : '—', 'à l’heure', f.hist && f.hist.heure < 90 ? 'md-o' : '')}</span></button>`; };
  return `<div class="cartes-clients md-grille fx-grille"${matVis('four-fournisseurs')}>${L.map(carte).join('')}</div>
    ${carteAide(['Touche un fournisseur : son compte, ses conditions, ses articles.', 'Un article bientôt fini est rangé chez son fournisseur, dans Commandes.', 'Importe son fichier de prix : tes prix se mettent à jour d’un coup.', 'Photographie sa facture : le stock et les prix suivent.'])}`;
}
