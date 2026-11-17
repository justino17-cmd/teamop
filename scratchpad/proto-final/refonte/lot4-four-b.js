
/* ── la fiche d’un fournisseur : TROIS cartes (le joindre, comment il livre, mon compte), des mots d’artisan et UNE saisie par notion ── */
function fournFiche(id){
  const f = MES_FOURN.find(o => o.id === id); if (!f) return; const d = foDir(f), A = foArticles(f), pan = cmdPaniers().find(p => p.four === f.nom), art = PDX.retourArt;
  PDX.retourArt = null; if (art) PDX.retourFour = { id, art };
  if (f.dj != null) f.delai = delaiTxt(f);   // le texte lu par le courriel et la carte suit le nombre de jours
  const cmds = COMMANDES.filter(c => c.four === f.nom).sort((a, b) => ((b.env || b.cree || '') > (a.env || a.cree || '') ? 1 : -1)).slice(0, 5), comptoir = f.dj === 0;
  const lg = (lib, champ, aide) => `<label class="ligne fx-lg"><span>${lib}${aide ? `<span class="gris petit fx-aide">${aide}</span>` : ''}</span>${champ}</label>`;
  const nb = (c, v, ph) => `<input class="saisie fx-n" inputmode="decimal" data-pdxfo="${f.id}|${c}" value="${esc(fxChiffre(v))}" placeholder="${ph || '—'}">`;
  const txt = (c, ph, t, extra) => `<input class="saisie" ${t || ''} ${extra || ''} data-pdxfo="${f.id}|${c}" value="${esc(f[c] == null ? '' : f[c])}" placeholder="${ph || ''}">`;
  const contact = [f.contact && 'Contact : ' + f.contact, f.tel].filter(Boolean).join(' · ');
  const noir = pan ? `<button type="button" class="btn" data-cm="preparer|${esc(f.nom)}">Commander chez lui</button>` : f.mail ? `<a class="btn" href="mailto:${esc(f.mail)}">Écrire à ce fournisseur</a>` : f.tel ? `<a class="btn" href="${lienTel(f.tel)}">Appeler ${esc(f.nom.split(' ')[0])}</a>` : '';
  foOuvrir(`${art && PRODUITS.find(o => o.id === art) ? `<button type="button" class="lien pdx-retour" data-pr="fiche|${esc(art)}">‹ Retour à l’article</button>` : ''}<span class="surtitre">${d ? esc(d.type) + ' · ' + esc(d.cv) : 'Mon fournisseur'}</span><h2>${esc(f.nom)}</h2>
    ${contact ? `<span class="gris">${f.tel && !f.contact ? `<a class="lien" href="${lienTel(f.tel)}">${esc(f.tel)}</a>` : esc(contact)}</span>` : ''}
    <div class="ms-boutons fx-boutons">${noir}<button type="button" class="btn gris" data-fo="facture|${f.id}">Photographier sa facture</button><button type="button" class="btn gris" data-fo="tarifs|${f.id}">Importer ses prix</button><button type="button" class="btn gris" data-fx="fplus|${f.id}" aria-haspopup="menu" aria-label="Plus d’actions">Plus ▾</button></div>
    <div class="carte fx-fc"><h3>Comment le joindre</h3>
      ${lg('Nom du contact', txt('contact', 'ex. Mme Lefèvre'))}
      ${lg('Téléphone', `<span class="pdx-tel">${txt('tel', '05 …', 'inputmode="tel"')}${f.tel ? `<a class="btn gris petit" href="${lienTel(f.tel)}">Appeler</a>` : ''}</span>`)}
      ${lg('E-mail pour les commandes', `<input class="saisie" type="email" inputmode="email" data-fochamp="${f.id}|mail" value="${esc(f.mail || '')}" placeholder="commandes@…">`, f.mail ? '' : '<span class="st st-o">À ajouter</span> Ajoute-le pour envoyer les commandes')}
      ${d ? `<div class="ligne"><span>Son site</span><a class="lien" href="${esc(d.site)}" target="_blank" rel="noopener noreferrer">${esc(d.site.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, ''))} ↗</a></div>` : ''}</div>
    <div class="carte fx-fc"><h3>Comment il livre</h3>
      ${f.hist ? `<div class="gris petit">Il livre à l’heure ${f.hist.heure} % du temps, en ${prNum(f.hist.delai)} jour${f.hist.delai >= 2 ? 's' : ''} en moyenne.</div>` : ''}
      ${comptoir ? '' : lg('Livré en', `<span class="fx-jours"><input class="saisie fx-n" inputmode="numeric" data-pdxfo="${f.id}|dj" value="${f.dj == null ? '' : f.dj}" placeholder="1"><span>jour${f.dj > 1 ? 's' : ''}</span></span>`)}
      <label class="fo-garder fx-case"><input type="checkbox" data-fx="comptoir|${f.id}" ${comptoir ? 'checked' : ''}><span>Je le retire au comptoir</span></label>
      ${lg('Livraison gratuite à partir de', `<span class="fx-jours">${nb('franco', f.franco, '0,00')}<span>€</span></span>`)}
      ${lg('Sinon, frais de port', `<span class="fx-jours">${nb('port', f.port, '0,00')}<span>€</span></span>`)}
      ${lg('Commander avant', `<input class="saisie fx-n" type="time" step="900" data-pdxfo="${f.id}|avant" value="${esc(f.avant || '')}">`, comptoir ? 'pour retirer le jour même' : f.dj === 1 ? 'pour être livré le lendemain' : f.dj > 1 ? 'pour être livré en ' + f.dj + ' jours' : '')}</div>
    <div class="carte fx-fc"><h3>Mon compte</h3>
      ${lg('Mon numéro de client', `<input class="saisie" data-fochamp="${f.id}|compte" value="${esc(f.compte || '')}" placeholder="ex. 004521">`)}
      ${lg('Ma remise', `<span class="fx-jours"><input class="saisie fx-n" inputmode="decimal" data-fochamp="${f.id}|remise" value="${f.remise == null ? '' : prNum(f.remise)}" placeholder="0"><span>%</span></span>`)}
      ${lg('Paiement', `<select class="saisie" data-pdxfo="${f.id}|paie">${PDX_PAIE.map(([k, l]) => `<option value="${k}" ${(f.paie || '') === k ? 'selected' : ''}>${k === '' ? 'Pas précisé' : l}</option>`).join('')}</select>`)}
      <label class="fo-garder fx-case"><input type="checkbox" data-pdxfo="${f.id}|relAuto" ${f.relAuto ? 'checked' : ''}><span>Le relancer tout seul si pas de réponse<span class="gris petit">Un jour ouvré après le retard. Désactivé tant que tu ne le coches pas.</span></span></label></div>
    <details class="ms-acc"><summary>Ses articles · ${A.length}</summary><div class="fo-bloc">${A.slice(0, 8).map(x => `<button type="button" class="fo-l" data-pr="fiche|${x.id}"><span class="fo-n"><b>${esc(x.nom)}</b><span class="gris petit">${esc(x.ref)} · ${prNum(x.q)} ${esc(prU(x.q, x.u))} en stock</span></span><span class="fo-dr">${x.ac ? '<span class="st st-o">Prix à compléter</span>' : x.pa ? `<b>${eur(x.pa)}</b><span class="gris petit">achat HT</span>` : ''}</span></button>`).join('') || '<div class="gris" style="padding:10px 4px">Aucun article pour l’instant.</div>'}${A.length > 8 ? `<div class="gris petit" style="padding:8px 4px">et ${A.length - 8} autres</div>` : ''}</div></details>
    <details class="ms-acc"><summary>Ses commandes · ${cmds.length}</summary>${cmds.length ? `<div class="fo-bloc">${cmds.map(c => { const e = fxPastille(c); return `<button type="button" class="fo-l" data-cm="voir|${c.id}"><span class="fo-n"><b>Commande ${esc(matNumAff(c.num))}</b><span class="gris petit">${esc(jCourt(c.env || c.cree || AUJ))} · ${pdxPl(c.lignes.length, 'ligne')}</span></span><span class="fo-dr"><b>${eur(cmdHT(c))}</b><span class="st ${e[1]}">${esc(e[0])}</span></span></button>`; }).join('')}</div>` : '<div class="gris petit">Aucune commande pour l’instant.</div>'}<button type="button" class="lien" data-pdx="cmdchez|${f.id}">＋ Nouvelle commande chez ${esc(f.nom.split(' ')[0])}</button></details>`, true);
}
function fxMenuFournisseur(b, id){
  const f = MES_FOURN.find(o => o.id === id); if (!f) return;
  const it = [{ ic:svg('article'), l:'Choisir parmi ses articles habituels', fn:() => fournPreparer(id) }];
  if (fxGerant()) it.push('---', { ic:'✕', l:'Ce n’est plus mon fournisseur', danger:true, fn:() => fxRetirerConfirm(id) });
  fxMenu(b, '', it);
}
function fxRetirerConfirm(id){
  const f = MES_FOURN.find(o => o.id === id); if (!f) return;
  foOuvrir(`<span class="surtitre">Fournisseurs, matériel &amp; produits</span><h2>Retirer ${esc(f.nom)} ?</h2><span class="gris">Ses articles restent dans ton catalogue et ses commandes passées restent suivies. Tu pourras le rajouter quand tu veux.</span>
    <div class="fo-pied"><button type="button" class="btn rouge" data-fo="retirer|${f.id}">Oui, ce n’est plus mon fournisseur</button><button type="button" class="btn gris" data-fo="fiche|${f.id}">Le garder</button></div>`);
}

/* ── « Ajouter un fournisseur » : dans la liste de mon métier, ou un autre ── */
function fournListe(){
  const choisis = new Set(MES_FOURN.map(f => f.dir).filter(Boolean)), packs = foMet === 'tiens' ? PACKS_ENT : [foMet], q = prNorm(foQ);
  const dir = Object.values(FOURN_DIR).filter(d => !choisis.has(d.id) && packs.some(k => d.packs[k]) && (!q || prNorm(d.nom + ' ' + d.type).includes(q)))
    .map(d => ({ d, n:packs.reduce((s, k) => s + (d.packs[k] || []).length, 0) })).sort((a, b) => b.n - a.n || a.d.nom.localeCompare(b.d.nom, 'fr'));
  const ligneDir = ({ d }) => { const C = packs.flatMap(k => (d.packs[k] || []).map(c => [k, c]));
    return `<div class="fo-l fx-dir"><span class="fo-n"><b>${esc(d.nom)}</b><span class="gris petit">${esc(d.type)} · ${esc(d.cv)}</span>
      <span class="fo-cv">${C.slice(0, 4).map(([k, c]) => `<span>${esc(c)}</span>`).join('')}${C.length > 4 ? `<span>+ ${C.length - 4}</span>` : ''}</span></span>
      <button type="button" class="btn gris petit" data-fo="ajouter|${d.id}" aria-label="${esc(d.nom)} : c’est mon fournisseur">Choisir</button></div>`; };
  const liste = `<div class="fo-filtres"><select class="saisie" data-fomet="1" aria-label="Métier">${[['tiens', 'Mes métiers (' + PACKS_ENT.length + ')'], ...Object.entries(PACKS).map(([k, p]) => [k, p.nom + (PACKS_ENT.includes(k) ? ' · le mien' : '')])].map(([k, l]) => `<option value="${k}" ${foMet === k ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>
      <input class="saisie" type="search" data-foq="1" value="${esc(foQ)}" placeholder="Chercher un fournisseur" aria-label="Chercher un fournisseur"></div>
    ${packs.length === 1 ? `<div class="gris petit fo-conseil">${esc(FOURN_METIER[packs[0]].c)}</div>` : ''}
    <div class="fo-bloc" id="fo-dir">${dir.map(ligneDir).join('') || '<div class="gris" style="padding:12px 4px">Aucun fournisseur ne correspond.</div>'}</div>
    <span class="gris petit">Liste préparée par TEAM OP pour chacun des 24 métiers (${Object.keys(FOURN_DIR).length} entreprises), sans lien commercial avec elles. Il en manque un ? Dis-le-nous, on l’ajoute pour tout le métier.</span>`;
  const autre = `<span class="gris">Ton grossiste du coin, une agence locale : trois champs suffisent.</span>
    <label class="champ">Nom<input id="fo-l-nom" placeholder="ex. Quincaillerie du Port" autocomplete="off"></label>
    <div class="deux-champs"><label class="champ">E-mail des commandes<input id="fo-l-mail" type="email" placeholder="commandes@…"></label><label class="champ">Téléphone<input id="fo-l-tel" inputmode="tel"></label></div>
    <details class="ms-acc ms-plus"><summary>Plus de détails</summary><label class="champ">Métier<select id="fo-l-pack">${PACKS_ENT.map(k => `<option value="${k}">${esc(PACKS[k].nom)}</option>`).join('')}</select></label></details>
    <div class="fo-pied"><button type="button" class="btn" data-fo="localok">Ajouter ce fournisseur</button></div>`;
  foOuvrir(`<span class="surtitre">Fournisseurs, matériel &amp; produits</span><h2>Ajouter un fournisseur</h2>
    <div class="seg ms-seg2" role="tablist" aria-label="Où est ton fournisseur ?">${[['liste', 'Dans la liste de mon métier'], ['autre', 'Un autre']].map(([k, l]) => `<button type="button" role="tab" data-fx="ajtab|${k}" aria-pressed="${FX.ajTab === k}" aria-selected="${FX.ajTab === k}">${l}</button>`).join('')}</div>
    ${FX.ajTab === 'autre' ? autre : liste}`, true);
}
function foLocal(){ FX.ajTab = 'autre'; fournListe(); setTimeout(() => { const i = document.getElementById('fo-l-nom'); if (i) i.focus(); }, 60); }
function foAjouterDir(id){
  const d = FOURN_DIR[id]; if (!d || MES_FOURN.some(f => f.dir === id)) return;
  const f = { id:'f' + Date.now().toString(36), dir:id, nom:d.nom, compte:'', mail:'', tel:'', delai:'', remise:null }; MES_FOURN.push(f); FX.ajTab = 'liste';
  rendre(); fournPreparer(f.id);   // « après le choix, ses articles habituels tout de suite »
  fxToast(`${esc(d.nom)} est dans tes fournisseurs. Coche ses articles habituels.`, { lib:'Annuler', fn:() => { const i = MES_FOURN.findIndex(o => o.id === f.id); if (i >= 0) MES_FOURN.splice(i, 1); fermerPanneau(); rendre(); } });
}

/* ── les commandes : la frise, le bon, la fiche, la livraison, la facture ── */
function fxToast(msg, actions){ toast(msg, actions); const t = document.getElementById('toast'); if (t) { clearTimeout(t._f); t._f = setTimeout(() => t.classList.remove('on'), 8000); } }   // « Annuler » reste huit secondes (spec § 3.6)
function fxAjouteAnnuler(fn){ const t = document.getElementById('toast'); if (!t) return; const b = document.createElement('button'); b.type = 'button'; b.textContent = 'Annuler'; b.onclick = () => { t.classList.remove('on'); fn(); }; t.appendChild(b); clearTimeout(t._f); t._f = setTimeout(() => t.classList.remove('on'), 8000); }
function fxClic(attr, val){ const b = document.createElement('button'); b.dataset[attr] = val; document.body.appendChild(b); b.click(); b.remove(); }
function cmdEtapes(c){
  const e = c.st, part = e === 'partielle', pas = [['Préparée', true, c.cree || c.env], ['Envoyée', e !== 'brouillon' && e !== 'annulee', c.env], [part ? 'Livrée en partie' : 'Livrée', ['recue', 'facturee'].includes(e) || part, c.recue], ['Facture comparée', e === 'facturee', c.fac && c.fac.le]];
  return `<span class="cmd-pas fx-frise" role="list" aria-label="Où en est la commande">${pas.map(([l, ok, d]) => `<span role="listitem" class="${ok ? 'ok' : ''}"><i></i>${l}${ok && d ? ' · ' + jCourt(d) : ''}</span>`).join('')}</span>${c.conf && e !== 'brouillon' ? `<span class="gris petit">Confirmée par ${esc(c.four)} le ${jCourt(c.conf.le)}${c.conf.num ? ' (leur réf. ' + esc(c.conf.num) + ')' : ''}.</span>` : ''}`;
}
const fxRaison = (l, x) => l.pourInter ? 'pour une intervention' : x ? `il en reste ${prNum(x.q)}` : 'ligne libre';
function cmdEdVue(){
  const E = CMD_ED, f = foDe(E.four) || {}, ht = cmdHT(E), tva = cmdTVA(E), i = E.pour && INTS.find(o => o.id === E.pour), F = f.franco ? Math.round((f.franco - ht) * 100) / 100 : 0, ok = E.lignes.length > 0;
  const aff = f.mail ? 'Envoyer à ' + E.four : 'Noter la commande chez ' + E.four, brouillon = Object.assign({ cree:AUJ }, E);
  foOuvrir(`<span class="surtitre">Commande ${esc(matNumAff(E.num))}${E.id ? ' · brouillon' : ''}</span><h2>${E.id ? 'Modifier la commande' : 'Nouvelle commande'}</h2>
    <label class="champ">Fournisseur<select data-ced="four">${metiersOptionsFour(E)}</select></label>${metiersFourInconnu(E)}
    <div class="gris petit">${[f.compte && 'compte ' + esc(f.compte), f.remise != null && 'remise ' + prNum(f.remise) + ' %', fxLiv(f), fxGratuite(f) && 'livraison ' + fxGratuite(f), f.mail ? 'commande à ' + esc(f.mail) : 'pas d’e-mail de commande'].filter(Boolean).join(' · ')}</div>
    <div class="fx-ed">${E.lignes.map((l, j) => { const x = cmdArt(l);
      return `<div class="fx-el"><span class="fo-n"><b>${esc(cmdNom(l))}</b><span class="gris petit">${l.ref && l.ref !== '—' ? 'Réf. ' + esc(l.ref) + ' · ' : ''}${esc(fxRaison(l, x))}</span></span>
        <span class="fx-eq"><span class="mat-pas"><button type="button" data-fx="edpas|${j}|-1" aria-label="Un de moins : ${esc(cmdNom(l))}">−</button><input inputmode="decimal" data-cedl="${j}|q" value="${prNum(l.q)}" aria-label="Quantité de ${esc(cmdNom(l))}"><button type="button" data-fx="edpas|${j}|1" aria-label="Un de plus : ${esc(cmdNom(l))}">+</button></span><span class="gris petit">${esc(prU(l.q, cmdU(l)))}</span></span>
        <label class="fx-ep"><span class="gris petit">Prix HT</span><input inputmode="decimal" data-cedl="${j}|pu" value="${l.pu != null ? l.pu.toFixed(2).replace('.', ',') : ''}" placeholder="selon tarif" aria-label="Prix HT de ${esc(cmdNom(l))}"></label>
        <b class="fx-et">${l.pu != null ? eur(l.q * l.pu) : '—'}</b><button type="button" class="lien fx-lien" data-ce="suppr|${j}" aria-label="Retirer ${esc(cmdNom(l))}">Retirer</button></div>`; }).join('') || '<div class="gris" style="padding:10px 2px">Aucune ligne : cherche un article ci-dessous.</div>'}</div>
    <div class="ced-ajout"><input class="saisie" data-cedrech="1" placeholder="＋ Ajouter un article : nom, référence…" autocomplete="off" aria-label="Ajouter un article"><div id="ced-res" class="ced-res"></div></div>
    <div class="ced-tot"><span>Total HT</span><b>${eur(ht)}</b><span>TVA</span><b>${eur(tva)}</b><span>Total TTC</span><b>${eur(ht + tva)}</b></div>
    ${f.franco ? (F > 0 ? `<div class="fx-franco"><div class="cmd-barre"><i style="width:${Math.min(100, Math.round(ht / f.franco * 100))}%"></i></div><span class="petit">Plus que <b>${eur(F)}</b> pour la livraison gratuite — sinon ${eur(f.port)} de port</span></div>` : '<div class="fx-franco ok petit">✓ Livraison gratuite</div>') : ''}
    <div class="deux-champs"><label class="champ">Où livrer ?<select data-ced="liv"><option value="atelier" ${E.liv === 'atelier' ? 'selected' : ''}>À l’atelier</option><option value="comptoir" ${E.liv === 'comptoir' ? 'selected' : ''}>Au comptoir</option><option value="chantier" ${E.liv === 'chantier' ? 'selected' : ''} ${i ? '' : 'disabled'}>Sur le chantier${i ? '' : ' (choisis l’intervention)'}</option></select></label>
      <label class="champ">Pour quand ?<input type="date" data-ced="souh" value="${E.souh || ''}" aria-label="${E.liv === 'comptoir' ? 'Retrait souhaité le' : 'Livraison souhaitée le'}"></label></div>
    ${E.liv === 'chantier' && i ? `<div class="gris petit">Adresse du chantier : ${esc(CLIENTS[i.cli].adr)}</div>` : ''}
    <label class="champ">Pour quelle intervention ?<select data-ced="pour"><option value="">Aucune : pour le stock de l’entreprise</option>${interAVenir().map(o => `<option value="${o.id}" ${o.id === E.pour ? 'selected' : ''}>${esc(interLib(o))}</option>`).join('')}</select></label>
    <label class="champ">Une note pour le fournisseur<textarea data-ced="note" rows="2" placeholder="ex. sonner à l’atelier, livrer avant 10 h">${esc(E.note || '')}</textarea></label>
    <details class="ms-acc fx-voir"${FX.voir ? ' open' : ''}><summary>Voir le message</summary>${ok ? `${f.mail ? `<pre class="cmd-pre">${esc(cmdMail(brouillon))}</pre>` : `<div class="gris petit">${esc(E.four)} n’a pas d’e-mail de commande : la commande sera notée comme passée (téléphone ou comptoir).</div>`}<div class="gris petit" style="margin:8px 0 4px">Le bon de commande (PDF joint)</div>${cmdDoc(E)}` : '<div class="gris petit">Ajoute un article pour voir le message.</div>'}</details>
    <div class="fo-pied">${ok ? '' : '<div class="mat-pourquoi">Ajoute au moins un article.</div>'}<button type="button" class="btn" data-ce="envoyer" ${ok ? '' : 'disabled'}>${esc(aff)}</button><button type="button" class="btn gris" data-ce="brouillon" ${ok ? '' : 'disabled'}>Enregistrer sans envoyer</button></div>`, true);
}
document.addEventListener('toggle', ev => { if (ev.target.matches && ev.target.matches('.fx-voir')) FX.voir = ev.target.open; }, true);
function cmdEnvoyer(id){
  const c = COMMANDES.find(o => o.id === id), f = foDe(c.four) || {}, avant = JSON.parse(JSON.stringify(c)), tk = TACHES.map(t => [t, t.etat, t.commandeLe]), pan = c.lignes.filter(l => l.pid).map(l => ['+' + l.pid, CMD_PANIER['+' + l.pid]]);
  c.lignes.forEach(l => { if (l.pid) delete CMD_PANIER['+' + l.pid]; });   // ce qui part en commande quitte « À commander »
  c.st = 'envoyee'; c.sansMail = !f.mail; c.env = AUJ; c.lien = { lu:null }; if (!c.prevue) c.prevue = c.souh || ajoute(AUJ, f.dj != null ? Math.max(f.dj, c.liv === 'comptoir' ? 0 : 1) : 2);
  c.journal.push([AUJ, f.mail ? `Envoyée à ${f.mail} (bon ${c.num} en PDF, lien de confirmation)` : 'Notée comme commandée (téléphone ou comptoir)']);
  [...new Set(c.lignes.map(l => l.inter).filter(Boolean))].forEach(t => { const T = TACHES.find(o => o.id === t); if (T) { T.etat = 'commandee'; T.commandeLe = jCourt(AUJ); } });
  CMD_ED = null; fermerPanneau(); prVue = 'commandes'; rendre();
  fxToast(`${f.mail ? 'Commande envoyée à ' + esc(c.four) : 'Commande notée chez ' + esc(c.four)} · ${eur(cmdHT(c))} HT. Elle est dans « En route ».`, [{ lib:'Voir', fn:() => cmdFiche(c.id) }, { lib:'Annuler', fn:() => {
    Object.keys(c).forEach(k => delete c[k]); Object.assign(c, avant); tk.forEach(([t, e, l]) => { t.etat = e; if (l === undefined) delete t.commandeLe; else t.commandeLe = l; }); pan.forEach(([k, v]) => { if (v !== undefined) CMD_PANIER[k] = v; }); rendre(); cmdFiche(c.id); toast('Annulé : la commande repasse en brouillon.'); } }]);
}
function cmdFiche(id){
  const c = COMMANDES.find(o => o.id === id); if (!c) return; const a = cmdAlerte(c), f = foDe(c.four), e = fxPastille(c), i = c.pour && INTS.find(o => o.id === c.pour);
  const noir = c.st === 'brouillon' ? `<button type="button" class="btn" data-ce="envoyer|${c.id}">${f && f.mail ? 'Envoyer à ' + esc(c.four) : 'Noter la commande chez ' + esc(c.four)}</button>` : cmdOuverte(c) ? `<button type="button" class="btn" data-cm="recep|${c.id}">J’ai reçu la livraison</button>` : c.st === 'recue' ? `<button type="button" class="btn" data-cm="rappro|${c.id}">Comparer avec la facture</button>` : '';
  const quand = c.st === 'brouillon' ? (c.souh ? 'livraison souhaitée ' + fxQuand(c.souh) : '') : c.st === 'facturee' || c.st === 'annulee' ? esc(fxQuandCmd(c)) : c.st === 'partielle' && c.reliquat ? 'le reste est prévu ' + fxQuand(c.reliquat) : c.prevue && cmdOuverte(c) ? (c.liv === 'comptoir' ? 'à retirer ' : 'livraison prévue ') + fxQuand(c.prevue) : '';
  foOuvrir(`<span class="surtitre">Commande ${esc(matNumAff(c.num))}${c.conf && c.conf.num ? ' · réf. ' + esc(c.conf.num) : ''}</span><h2>${esc(c.four)}</h2>
    <span class="gris">${eur(cmdHT(c))} HT${quand ? ' · ' + quand : ''}</span>
    <div class="puces"><span class="st ${e[1]}">${esc(e[0])}</span>${a && a.t === 'facture' && !a.txt.includes('conforme') ? `<span class="st st-o">${esc(a.txt)}</span>` : ''}${c.lien && c.lien.lu && c.st === 'envoyee' ? `<span class="st st-g">Lue par le fournisseur le ${jCourt(c.lien.lu)}</span>` : ''}</div>
    ${cmdEtapes(c)}
    <div class="gris petit">${c.liv === 'comptoir' ? 'Retrait au comptoir' : c.liv === 'chantier' && i ? 'Livraison sur le chantier · ' + esc(CLIENTS[i.cli].adr) : 'Livraison à l’atelier'}${i ? ` · pour <button type="button" class="lien" data-tvoir="inter|${i.id}">${esc(interLib(i))}</button>` : ''}</div>
    <div class="fo-bloc">${c.lignes.map(l => { const t = l.inter && TACHES.find(o => o.id === l.inter), ii = t && INTS.find(o => o.id === t.inter);
      return `<div class="fo-r"><span class="fo-n"><b>${esc(cmdNom(l))}</b><span class="gris petit">${prNum(l.q)} ${esc(prU(l.q, cmdU(l)))}${c.st === 'brouillon' ? '' : ' · ' + (l.recu >= l.q ? '<span class="fo-down">tout est arrivé</span>' : l.recu ? `reçu ${prNum(l.recu)} sur ${prNum(l.q)}, <b class="fo-up">il en manque ${prNum(l.q - l.recu)}</b>` : 'pas encore arrivé')}${l.rupture && l.recu < l.q ? ` · <b class="fo-up">en rupture, prévu le ${jCourt(l.rupture)}</b>` : ''}${ii ? ` · pour ${esc(CLIENTS[ii.cli].nom)}` : ''}</span></span><span class="fo-dr"><b>${l.pu != null ? eur(l.q * l.pu) : '—'}</b><span class="gris petit">${l.pu != null ? eur(l.pu) + ' l’unité' : 'selon tarif'}</span></span></div>`; }).join('')}
      <div class="fo-r"><span class="fo-n"><b>Total HT</b><span class="gris petit">TTC ${eur(cmdHT(c) + cmdTVA(c))}</span></span><b>${eur(cmdHT(c))}</b></div></div>
    ${c.note ? `<div class="gris petit">Note au fournisseur : ${esc(c.note)}</div>` : ''}
    <div class="ms-boutons fx-boutons">${noir}${a && (a.t === 'retard' || a.t === 'silence') ? `<button type="button" class="btn gris" data-cm="relance|${c.id}">Relancer</button>` : ''}<button type="button" class="btn gris" data-fx="cplus|${c.id}" aria-haspopup="menu" aria-label="Plus d’actions">Plus ▾</button></div>
    <details class="ms-acc"><summary>Ce qui s’est passé</summary><div class="cmd-journal">${[...c.journal].reverse().map(([d, t]) => `<div><span class="gris petit">${jCourt(d)}</span><span>${esc(t)}</span></div>`).join('')}</div></details>
    ${f ? `<button type="button" class="lien" data-fo="fiche|${f.id}">${esc(c.four)} : son compte et ses articles ›</button>` : ''}`, true);
}
function fxMenuCmd(b, id){
  const c = COMMANDES.find(o => o.id === id); if (!c) return; const it = [], ouv = cmdOuverte(c);
  if (c.st === 'brouillon') it.push({ ic:'✎', l:'Modifier', fn:() => fxClic('ce', 'modif|' + id) });
  if (c.st === 'envoyee') it.push({ ic:svg('coche'), l:'Le fournisseur a confirmé', fn:() => cmdConfirmer(id) });
  if (ouv) it.push({ ic:svg('livraison'), l:'Relancer', fn:() => cmdRelance(id) });
  it.push({ ic:svg('photo'), l:'Voir le bon (PDF)', fn:() => fxClic('ce', 'voirbon|' + id) });
  if (c.st !== 'brouillon') it.push({ ic:svg('ranger'), l:'Recommander la même chose', fn:() => fxClic('ce', 'recommander|' + id) });
  if (c.st === 'envoyee' || c.st === 'confirmee') it.push({ ic:'👁', l:'Voir ce que voit le fournisseur (démonstration)', fn:() => cmdPortail(id) });
  if (c.st === 'brouillon') it.push('---', { ic:'✕', l:'Supprimer le brouillon', danger:true, fn:() => fxClic('ce', 'jeter|' + id) });
  if (c.st === 'envoyee' || c.st === 'confirmee') it.push('---', { ic:'✕', l:'Annuler la commande', danger:true, fn:() => fxClic('cm', 'annuler|' + id) });
  fxMenu(b, '', it);
}
function cmdReception(id){
  const c = COMMANDES.find(o => o.id === id), att = c.lignes.filter(l => l.recu < l.q);
  foOuvrir(`<span class="surtitre">Commande ${esc(matNumAff(c.num))} · ${esc(c.four)}</span><h2>J’ai reçu la livraison</h2><span class="gris">Dis ce qui est arrivé : le stock monte d’autant, et ce qui manque reste suivi.</span>
    <button type="button" class="btn gris fx-tout" data-fx="toutarrive">Tout est arrivé</button>
    <div class="fo-bloc">${att.map(l => { const j = c.lignes.indexOf(l), reste = l.q - l.recu;
      return `<div class="fo-r"><span class="fo-n"><b>${esc(cmdNom(l))}</b><span class="gris petit">on attendait ${prNum(reste)} ${esc(prU(reste, cmdU(l)))}</span></span><span class="mat-pas"><button type="button" data-fx="rpas|${j}|-1" aria-label="Un de moins : ${esc(cmdNom(l))}">−</button><input inputmode="decimal" data-cmr="${j}" data-att="${reste}" value="${prNum(reste)}" aria-label="Reçu : ${esc(cmdNom(l))}"><button type="button" data-fx="rpas|${j}|1" aria-label="Un de plus : ${esc(cmdNom(l))}">+</button></span></div>`; }).join('')}</div>
    <div class="fx-manque petit" id="fx-manque" aria-live="polite" hidden></div>
    <label class="champ" id="fx-reliq" hidden>On attend le reste le<input id="cmd-reliq" type="date" value="${(c.lignes.find(l => l.rupture && l.recu < l.q) || {}).rupture || c.reliquat || cmdJourOuvre(ajoute(AUJ, 3))}"></label>
    <details class="ms-acc"><summary>Ajouter le numéro du bon de livraison</summary><label class="champ">N° du bon de livraison<input id="cmd-bl" placeholder="ex. BL-88120" autocomplete="off"></label></details>
    <div class="fo-pied"><button type="button" class="btn" data-cm="recok|${c.id}">Ranger dans le stock</button></div>`, true);
  fxManqueMaj();
}
function fxManqueMaj(){
  const z = document.getElementById('fx-manque'), r = document.getElementById('fx-reliq'); if (!z) return;
  const M = [...document.querySelectorAll('#calque [data-cmr]')].map(i => ({ i, att:+i.dataset.att, n:Math.max(0, Math.min(+i.dataset.att, foNum(i.value) || 0)) })).filter(o => o.att - o.n > 1e-9), nb = M.reduce((s, o) => s + (o.att - o.n), 0);
  z.hidden = r.hidden = !M.length; if (M.length) z.innerHTML = `Il en manque ${prNum(Math.round(nb * 100) / 100)}. On les attend ci-dessous : ils restent suivis dans la commande.`;
}
function cmdRappro(id){
  const c = COMMANDES.find(o => o.id === id);
  if (!c.facLue) c.facLue = { num:'FA-' + c.four.split(' ').map(w => w[0]).join('').toUpperCase() + '-' + (500 + cmdNum), le:AUJ, pu:Object.fromEntries(c.lignes.map(l => [l.pid, l.pu])), q:Object.fromEntries(c.lignes.map(l => [l.pid, l.recu])) };
  const E = cmdEcarts(c), F = c.facLue, ht = Math.round(c.lignes.reduce((s, l) => s + (F.q[l.pid] != null ? F.q[l.pid] : l.recu) * (F.pu[l.pid] != null ? F.pu[l.pid] : l.pu), 0) * 100) / 100;
  const phr = e => { const nom = cmdNom(e.l), p = F.pu[e.l.pid], q = F.q[e.l.pid];
    return [e.dpu ? `Le fournisseur a facturé ${eur(p)} au lieu de ${eur(e.l.pu)} pour ${prNum(e.l.recu)} ${prU(e.l.recu, cmdU(e.l))} de ${nom}` : '', e.dq ? `Il a facturé ${prNum(q)} ${nom} au lieu de ${prNum(e.l.recu)} reçus` : ''].filter(Boolean).join(' · '); };
  foOuvrir(`<span class="surtitre">Commande ${esc(matNumAff(c.num))} · facture ${esc(F.num)}</span><h2>Comparer avec la facture</h2>
    <div class="fx-compare">La facture dit <b>${eur(ht)}</b>. La commande dit <b>${eur(cmdHT(c))}</b>.${E.length ? '' : ' <b class="fo-down">C’est bon.</b>'}</div>
    ${E.map(e => `<div class="fx-ecart"><span class="st st-o">Écart</span> ${esc(phr(e))}</div>`).join('')}
    <div class="fo-bloc">${c.lignes.map(l => { const e = E.find(o => o.l === l), pu = F.pu[l.pid] != null ? F.pu[l.pid] : l.pu, q = F.q[l.pid] != null ? F.q[l.pid] : l.recu;
      return `<div class="fo-r"><span class="fo-n"><b>${esc(cmdNom(l))}</b><span class="gris petit">commandé ${prNum(l.q)} × ${eur(l.pu)} · reçu ${prNum(l.recu)} · facturé ${prNum(q)} × ${eur(pu)}</span></span><span class="fo-dr">${e ? `<b class="fo-up">${e.dpu ? (e.dpu > 0 ? '+' : '') + eur(e.dpu) + ' l’unité' : ''}${e.dq ? (e.dpu ? ' · ' : '') + (e.dq > 0 ? '+' : '') + prNum(e.dq) + ' facturé' + (Math.abs(e.dq) > 1 ? 's' : '') : ''}</b>` : '<span class="fo-down">conforme</span>'}</span></div>`; }).join('')}
      <div class="fo-r"><span class="fo-n"><b>Facture HT</b><span class="gris petit">commande ${eur(cmdHT(c))} HT</span></span><b>${eur(ht)}</b></div></div>
    ${E.length ? '<div class="gris petit">Si tu acceptes, ton prix d’achat suit la facture et ta marge est gardée. Sinon, un e-mail prêt part au fournisseur.</div>' : ''}
    <div class="fo-pied">${E.length ? `<button type="button" class="btn" data-cm="accepte|${c.id}">Accepter ${E.length > 1 ? 'les écarts' : 'l’écart'}</button><button type="button" class="btn gris" data-cm="conteste|${c.id}">Contester</button>` : `<button type="button" class="btn" data-cm="accepte|${c.id}">Tout est bon</button>`}</div>`, true);
}
/* « J’ai reçu la livraison » se défait : la photo de la commande, des articles, du journal et des achats d’avant le rangement */
(() => { const o = cmdReceptionner; cmdReceptionner = function(id){
  const c = COMMANDES.find(k => k.id === id); if (!c) return o.apply(this, arguments);
  const snap = { c:JSON.parse(JSON.stringify(c)), p:JSON.parse(JSON.stringify(PRODUITS)), nM:MVTS.length, nA:ACHATS.length, tk:TACHES.map(t => [t, t.etat, t.recueLe]), recu:JSON.stringify(c.lignes.map(l => l.recu)) };
  const r = o.apply(this, arguments); if (JSON.stringify(c.lignes.map(l => l.recu)) === snap.recu) return r;
  fxAjouteAnnuler(() => {
    Object.keys(c).forEach(k => delete c[k]); Object.assign(c, snap.c);
    const ids = new Set(snap.p.map(x => x.id)); for (let k = PRODUITS.length - 1; k >= 0; k--) if (!ids.has(PRODUITS[k].id)) PRODUITS.splice(k, 1);
    snap.p.forEach(x => { const y = PRODUITS.find(z => z.id === x.id); if (y) { Object.keys(y).forEach(k => delete y[k]); Object.assign(y, x); } });
    MVTS.splice(0, MVTS.length - snap.nM); ACHATS.splice(snap.nA); snap.tk.forEach(([t, e, l]) => { t.etat = e; if (l === undefined) delete t.recueLe; else t.recueLe = l; });
    prCatalogueMaj(); rendre(); cmdFiche(c.id); toast('Annulé : la livraison n’est plus rangée.'); });
  return r; }; })();

/* ── les clics et les saisies de ce lot ── */
document.addEventListener('click', ev => {
  const b = ev.target.closest('[data-fx]'); if (!b) return;
  const [a, x, y] = b.dataset.fx.split('|');
  if (a === 'plus') return fxMenuPlus(b);
  if (a === 'filtre') return fxMenuFiltre(b);
  if (a === 'metier') return fxMenuMetier(b);
  if (a === 'completer') return fxSetFiltre('ac');
  if (a === 'toutvoir') { prQ = ''; prPack = 'tous'; return fxSetFiltre('tout'); }
  if (a === 'habituels') return fxHabituels();
  if (a === 'ajouteq') { const q = prQ.trim(); prFormulaire(null, prPack !== 'tous' ? prPack : PACKS_ENT[0], ''); return setTimeout(() => { const i = document.getElementById('pr-nom'); if (i) { i.value = q; i.dispatchEvent(new Event('input', { bubbles:true })); } }, 60); }
  if (a === 'prixac') { prFiche(x); return setTimeout(() => { const p = document.querySelector('#calque [data-ms="fprixo|' + x + '"]'); if (p) p.click(); }, 0); }
  if (a === 'pas') { const L = cmdPaniers().flatMap(p => p.lignes).find(l => l.k === x); if (!L) return; const n = Math.round((L.q + (+y)) * 100) / 100; if (n <= 0) return toast('Une quantité doit être plus grande que zéro : pour ne pas le commander, touche « Retirer ».'); CMD_PANIER[x] = n; return rendre(); }
  if (a === 'edpas') { const l = CMD_ED && CMD_ED.lignes[+x]; if (!l) return; const n = Math.round((l.q + (+y)) * 100) / 100; if (n <= 0) return toast('Une quantité doit être plus grande que zéro : pour ne pas le commander, touche « Retirer ».'); l.q = n; return foGarder(cmdEdVue); }
  if (a === 'rpas') { const i = document.querySelector(`#calque [data-cmr="${x}"]`); if (!i) return; const n = Math.max(0, Math.min(+i.dataset.att, Math.round(((foNum(i.value) || 0) + (+y)) * 100) / 100)); i.value = prNum(n); return fxManqueMaj(); }
  if (a === 'toutarrive') { document.querySelectorAll('#calque [data-cmr]').forEach(i => { i.value = prNum(+i.dataset.att); }); return fxManqueMaj(); }
  if (a === 'cplus') return fxMenuCmd(b, x);
  if (a === 'fplus') return fxMenuFournisseur(b, x);
  if (a === 'ajtab') { FX.ajTab = x; return foGarder(fournListe); }
  if (a === 'comptoir') { const f = MES_FOURN.find(o => o.id === x); if (!f) return; f.dj = b.checked ? 0 : (f.dj > 0 ? f.dj : 1); f.delai = delaiTxt(f); return foGarder(() => fournFiche(x)); }
});
document.addEventListener('input', ev => { if (ev.target.matches && ev.target.matches('#calque [data-cmr]')) fxManqueMaj(); });
document.addEventListener('change', ev => {
  const t = ev.target; if (!t.matches || !t.matches('[data-fxmail]')) return; const f = MES_FOURN.find(o => o.id === t.dataset.fxmail); if (f && t.value.trim()) { f.mail = t.value.trim(); rendre(); toast(`E-mail de ${esc(f.nom)} noté : la commande peut partir.`); }
});
