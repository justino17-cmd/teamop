// LES DROITS À PART, un par un : « Créer des comptes » (invitation, réactivation), « Valider les gestes de stock des autres » (À valider, Accepter), « Envoyer des commandes aux fournisseurs », « Corriger les pointages »,
// « Se servir à l'atelier sans validation » (la sortie d'un technicien va dans « À valider » sans lui, s'applique avec lui), et la case « Voir les prix d'achat » qui n'est PAS branchée donc pas dessinée. ⛔ 127.0.0.1 seulement.
const { L, v, ouvrirComme, fin } = require('./droits-commun.js');
const CATS = ['planif', 'inter', 'crm', 'ventes', 'compta', 'stock', 'temps', 'com', 'achats', 'admin'];
(async () => {
  const c = await ouvrirComme({ k:'rp', prenom:'Rémi', nom:'Poulain', pd:'resp', terrain:false, cases:Object.fromEntries(CATS.map(k => [k, '1111'])), sp:{ tout:1, prix:1, atelier:1, valstock:1, commander:1, corrpt:1, comptes:1 } });
  const fiche = await c.p.evaluate(() => { aller('equipe'); eqFiche('julie'); return [...document.querySelectorAll('#calque input[data-eqs]')].map(i => i.dataset.eqs.split('|')[1]); }); await L.calme(c.p, 400);
  v('la fiche affiche les cinq droits à part qui agissent, et ni « tout » ni « prix »', ['comptes', 'corrpt', 'atelier', 'valstock', 'commander'].every(k => fiche.includes(k)) && !fiche.includes('tout') && !fiche.includes('prix'), fiche);
  // l'atelier : la sortie d'un technicien (Sophie, sans le droit) attend ; celle de Karim (qui l'a) s'applique
  const at = await c.p.evaluate(() => { STK_VALID = true; const p = PRODUITS.find(x => stkAt(x, 'atelier') > 3), nj = MVTS_ATT.length; const mk = qui => ({ id:'mt' + qui + Date.now(), d:AUJ, h:'10:00', type:'sortie', pid:p.id, q:1, de:'atelier', qui, motif:'Essai droits' });
    const a = msPoser ? (window.RL_ACTIF = true, null) : null;
    const rs = sxDepose(mk('sm')), nA = MVTS_ATT.length - nj, rk = sxDepose(mk('kb')), nK = MVTS_ATT.length - nj - nA;
    return { sophie:rs, karim:rk, attenteSophie:nA, attenteKarim:nK, atelierSophie:droitsAtelier('sm'), atelierKarim:droitsAtelier('kb'), atelierRP:droitsAtelier('rp') }; });
  v('l\'atelier : la sortie de Sophie (sans le droit) va dans « À valider »', at.sophie === 'attente' && at.attenteSophie === 1 && at.atelierSophie === false, at);
  v('l\'atelier : la sortie de Karim (droit « atelier ») s\'applique tout de suite, sans attendre', at.karim === 'applique' && at.attenteKarim === 0 && at.atelierKarim === true, at);
  // corrpt : corriger un pointage déjà enregistré demande le droit
  const cp = await c.p.evaluate(() => { const bout = (f, vb) => { const b = document.createElement('button'); b.type = 'button'; b.setAttribute('data-' + f, vb + '|x'); b.dataset.essaiDroits = '1'; window.__w = 0; document.body.appendChild(b); const r0 = DROITS_REFUS.length; b.click(); b.remove(); return DROITS_REFUS.length - r0; };
    window.addEventListener('click', ev => { if (ev.target.dataset && ev.target.dataset.essaiDroits) { window.__w++; ev.stopImmediatePropagation(); } }, true);
    const p = eqDe('rp'); p.droits.sp.corrpt = 0; const sans = [bout('ptx', 'corrige'), bout('pt', 'clore'), bout('pt', 'ajout')]; p.droits.sp.corrpt = 1; const avec = [bout('ptx', 'corrige'), bout('pt', 'clore'), bout('pt', 'ajout')]; const libre = bout('ptx', 'plustotok');
    p.droits.sp.corrpt = 0; const soi = bout('ptx', 'plustotok'); p.droits.sp.corrpt = 1; return { sans, avec, soi, libre }; });
  v('corriger les pointages : refusé sans le droit (3 gestes), permis avec ; « plus tôt » reste la déclaration du salarié', cp.sans.every(x => x === 1) && cp.avec.every(x => x === 0) && cp.soi === 0, cp);
  // commander : l'envoi d'une commande demande le droit
  const co = await c.p.evaluate(() => { const bout = (f, vb) => { const b = document.createElement('button'); b.type = 'button'; b.setAttribute('data-' + f, vb + '|x'); document.body.appendChild(b); const r0 = DROITS_REFUS.length; b.click(); b.remove(); return DROITS_REFUS.length - r0; };
    const p = eqDe('rp'); p.droits.sp.commander = 0; const sans = [bout('ce', 'envoi'), bout('cm', 'conf'), bout('ac', 'commande')]; p.droits.sp.commander = 1; return { sans }; });
  v('envoyer des commandes : refusé sans le droit (trois chemins)', co.sans.every(x => x === 1), co);
  v('aucune erreur de page', c.err.length === 0, c.err.slice(0, 2));
  await L.fin(c); await fin();
})().catch(e => { console.error(e); process.exit(1); });
