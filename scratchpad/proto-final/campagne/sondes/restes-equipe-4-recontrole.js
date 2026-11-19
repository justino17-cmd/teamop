//  usage : node restes-equipe-4.js <profil mac|iphone|android> [N3 D T] ; node restes-equipe-4.js <profil> DUMP <fichier>  (écrit la référence de D)
// ⛔ 127.0.0.1 seulement, entreprise fictive, aucun serveur.
const fs = require('fs'), path = require('path');
const E = require('./equipe-outils.js'); const { L, v } = E;
const PROFIL = process.argv[2] || 'mac'; const ARGS = process.argv.slice(3);
const PHASES = ARGS.length ? ARGS : ['A', 'B', 'T'];
const SNAP = `(() => { const N = ['ENTREPRISE', 'CLIENTS', 'INTS', 'BUREAU', 'ABSENCES', 'NOTES', 'FACTURES', 'ENCAISSEMENTS', 'CONTRATS', 'DEVIS', 'TACHES', 'DEMANDES_ABS', 'DECISIONS_ABS', 'PRODUITS', 'COMMANDES', 'MVTS', 'MAILS', 'ML_BOITES', 'NOTIFS', 'SECU', 'EQUIPE', 'JOURNAL', 'ENVOIS'];
  const o = {}; for (const n of N) { try { o[n] = JSON.stringify(eval(n)); } catch (e) { o[n] = 'ABSENT'; } }
  try { o.LS = JSON.stringify(Object.keys(localStorage).sort().filter(k => !/(_nv_vu_|vues|opg_proto_mode|theme)/i.test(k)).map(k => [k, localStorage.getItem(k)])); } catch (e) { o.LS = 'ERR'; } return o; })()`;
const diff = (a, b) => Object.keys(a).filter(k => a[k] !== b[k]);

// la personne test (même montage que equipe-droits-joues : formulaire d'Équipe, toutes les cases, UNE décochée par la vraie case de sa fiche, « voir comme »)
async function monter(sans) {
  const c = await E.marc(PROFIL); const p = c.p;
  await L.aller(p, 'equipe'); await L.toucher(c, '[data-eq="inviter"]'); await p.fill('#eq-p', 'Rémi'); await p.fill('#eq-n', 'Poulain'); await p.fill('#eq-m', 'remi@climservices17.fr');
  await p.evaluate(() => { const s = document.getElementById('eq-terrain'); if (s && s.checked) s.click(); });   /* un compte de BUREAU : la Boîte mail est une rubrique du bureau */
  await L.toucher(c, '[data-eq="inviterok"]'); await L.calme(p, 500); await E.ranger(c);
  const k = await p.evaluate(() => EQUIPE.find(q => q.prenom === 'Rémi').k);
  await p.evaluate(({ k }) => { for (const cat of ['planif', 'inter', 'crm', 'ventes', 'compta', 'stock', 'temps', 'com', 'achats', 'admin']) eqDe(k).droits.cats[cat] = { v:1, c:1, m:1, s:1 }; ['tout', 'prix', 'atelier', 'valstock', 'commander', 'corrpt', 'comptes', 'securite'].forEach(s => { eqDe(k).droits.sp[s] = 1; }); eqDe(k).droits.profil = 'resp*'; }, { k });
  if (sans) {
    await E.fiche(c, k); await p.evaluate(() => { const d = document.querySelector('#calque details.eqx-det'); if (d) d.open = true; document.querySelectorAll('#calque details.eq-dr-m').forEach(m => { m.open = true; }); });
    const sel = `#calque input[data-eqd="${k}|${sans.cat}|${sans.x}"]`;
    if (!(await p.evaluate(s => [...document.querySelectorAll(s)].some(e => e.offsetParent !== null), sel))) throw new Error('la case ' + sans.cat + '.' + sans.x + ' n\'est pas affichée dans la fiche');
    await L.toucher(c, sel + ':visible'); await E.ranger(c);
    if (await p.evaluate(({ k, sans }) => eqDe(k).droits.cats[sans.cat][sans.x], { k, sans })) throw new Error('la case ' + sans.cat + '.' + sans.x + ' est restée cochée');
  }
  await L.aller(p, 'equipe'); await p.evaluate(() => { fermerPanneau(); }); await p.evaluate(({ id }) => secuVoirComme(id), { id:k }); await L.calme(p, 900);
  if ((await p.evaluate(() => acteur())) !== k) throw new Error('pas ouvert comme la personne');
  return { c, p, k };
}
const forcer = (p, attrs) => p.evaluate(a => { const b = document.createElement('button'); b.type = 'button'; b.hidden = true; Object.entries(a).forEach(([k, x]) => b.setAttribute(k, x)); document.body.appendChild(b); try { b.click(); } finally { b.remove(); } return true; }, attrs);
const attendreMail = async p => { await p.waitForFunction(() => { const h = document.querySelector('[data-opcourrier]'); const r = h && h.shadowRoot; return !!(r && r.querySelector('#rows .msg')); }, null, { timeout:9000 }).catch(() => {});
  for (let i = 0; i < 3; i++) { const liste = await p.evaluate(() => { const h = document.querySelector('[data-opcourrier]'); const r = h && h.shadowRoot; const a = r && r.querySelector('[data-view]'); if (!a || a.getAttribute('data-view') === 'list') return true; const b = r.querySelector('#btnBack'); if (b && b.offsetParent !== null) b.click(); return false; }); if (liste) break; await L.calme(p, 300); } };
const choisirMail = async (p, i) => { await attendreMail(p); await p.locator('#rows .msg').nth(i || 0).click({ timeout:6000 }); await L.calme(p, 500); };
const composeOuvert = p => p.locator('#cSub').count().then(n => n > 0);
const fermerCompose = async p => { for (let i = 0; i < 3; i++) { if (!(await composeOuvert(p))) break; await p.keyboard.press('Escape'); await L.calme(p, 300); const d = p.locator('#cDiscard, [data-act="discard"], #cClose'); if ((await composeOuvert(p)) && (await d.count())) { await d.first().click().catch(() => {}); await L.calme(p, 300); } } await p.evaluate(() => { try { fermerPanneau(); } catch (e) {} }); await L.calme(p, 200); };
const toastTout = async p => ((await E.toast(p)) || (await p.evaluate(() => { const h = document.querySelector('[data-opcourrier]'); const r = h && h.shadowRoot; const t = r && r.querySelector('#toast.show, .toast.show'); return t ? t.textContent.replace(/\s+/g, ' ').trim() : ''; })) || '');
// « la fonction » : on joue, on compare. Rend { changed, refus, compose, toast }
async function tenter(p, jouer, route, sel) {
  if (process.env.TRACE) console.log('   · tenter ' + String(jouer).slice(0, 70).replace(/\s+/g, ' '));
  await E.ranger({ p }); await p.evaluate(() => { try { fermerPanneau(); } catch (e) {} }); if (route) { await L.aller(p, route); await attendreMail(p); if (sel) await choisirMail(p, 0); }
  const avant = await p.evaluate(SNAP + ''), r0 = await p.evaluate(() => DROITS_REFUS.length);
  let err = ''; try { await jouer(); } catch (e) { err = String(e.message || e).slice(0, 120); }
  await L.calme(p, 800);
  const apres = await p.evaluate(SNAP + ''), compose = await composeOuvert(p), toast = (await toastTout(p)).slice(0, 160);
  const refus = (await p.evaluate(() => DROITS_REFUS.length)) - r0, dernier = await p.evaluate(() => DROITS_REFUS.slice(-1)[0] || null);
  if (compose) await fermerCompose(p);
  return { changed:diff(avant, apres).filter(k => k !== 'LS'), ls:diff(avant, apres).includes('LS'), refus, compose, toast, dernier, err };
}
const dansMail = (p, sel) => p.evaluate(sel => { const h = document.querySelector('[data-opcourrier]'); const r = h && h.shadowRoot; return !!(r && [...r.querySelectorAll(sel)].some(q => { const b = q.getBoundingClientRect(); return b.width > 0 && b.height > 0 && b.x > -1 && b.x < innerWidth; })); }, sel);
// « Répondre » est-il PROPOSÉ à l'œil : bouton de la barre, ou (téléphone) entrée du menu « Répondre ▾ », ou entrée du clic droit
async function repondreProposes(p) {
  const r = { barre:await dansMail(p, '[data-act="reply"]'), tous:await dansMail(p, '[data-act="replyAll"]'), menuReponse:false, entreeTous:false, clicDroit:false, rapide:await dansMail(p, '[data-quick]') };
  if (!r.barre && (await dansMail(p, '[data-act="replyMenu"]'))) { await p.locator('[data-act="replyMenu"]:visible').first().click(); await L.calme(p, 400);
    r.menuReponse = (await p.locator('[role=menuitem]', { hasText:/^\s*Répondre\s*$/ }).count()) > 0; r.entreeTous = (await p.locator('[role=menuitem]', { hasText:'Répondre à tous' }).count()) > 0; await p.keyboard.press('Escape'); await L.calme(p, 300); }
  const ok = await p.evaluate(() => { const h = document.querySelector('[data-opcourrier]'); const r = h && h.shadowRoot; const e = r && r.querySelector('#rows .msg'); if (!e) return false; const b = e.getBoundingClientRect(); e.dispatchEvent(new MouseEvent('contextmenu', { bubbles:true, cancelable:true, composed:true, clientX:b.left + 40, clientY:b.top + 10, button:2 })); return true; });
  if (ok) { await L.calme(p, 400); r.clicDroit = (await p.locator('[role=menuitem]', { hasText:/^\s*Répondre\s*$/ }).count()) > 0; await p.keyboard.press('Escape'); await L.calme(p, 300); }
  r.tout = r.barre || r.tous || r.menuReponse || r.entreeTous || r.clicDroit || r.rapide; return r;
}
const dist = x => JSON.stringify(x).slice(0, 260);
// ═══ RECONTRÔLE ADVERSE du tour 4 (19 novembre 2026) : on cherche un chemin qui écrit SANS la case ═══
// A : message / tâche / créneau d'option par des portes que la sonde du correcteur ne joue pas (hôte.envoyer, boutons du module cliqués à la main, agir(), mlRepondre, mbxPanConfier, envoi de bout en bout)
// B : combinaisons (Planning seul retiré / Créer seul retiré) et « Confier » n'écrit rien dans BUREAU
// T : portes de la famille « compte désactivé » (repose, dev-ok, nouveau-code, data-eq actions)
const modDom = (p, sel, quoi) => p.evaluate(({ sel, quoi }) => { const h = document.querySelector('[data-opcourrier]'), r = h && h.shadowRoot; const e = r && r.querySelector(sel); if (!e) return 'absent'; if (quoi === 'click') { e.click(); return 'clic'; } return 'ok'; }, { sel, quoi });
async function mailsIds(p) { return p.evaluate(() => { const f = (s, q) => { const m = MAILS.find(m => m.dossier === 'recu' && !m.fait && mlLire(m).sujet === s && (!q || mlLire(m).qui === q)); return m ? m.id : null; }; return { cli:f('msgcli'), dev:f('devis', 'nouveau'), panne:f('panne') }; }); }
async function phaseA(h, etiquette, ferme, fermeCreneau) {
  const p = h.p; await L.aller(p, 'boiteMail'); await attendreMail(p);
  const ids = await mailsIds(p); v(`${etiquette} : décor`, !!ids.cli && !!ids.dev, ids);
  const nMsg = () => p.evaluate(() => MAILS.length);
  const T = async (nom, jouer, route, sel) => { const r = await tenter(p, jouer, route || 'boiteMail', sel); return { nom, r }; };
  // 1) l'hôte, appelé directement : il ÉCRIT un message dans Envoyés
  const e = await T('hôte.envoyer direct', () => p.evaluate(() => { const bo = ML_BOITES.find(o => o.etat === 'ok'); return courrierSource().envoyer({ boite:bo.id, a:'x@exemple.fr', objet:'sonde', texte:'sonde', pieces:[] }); }));
  const eEcrit = e.r.changed.includes('MAILS');
  v(`${etiquette} · [NOUVEAU?] courrierSource().envoyer() appelé directement ${ferme ? 'écrit-il ? (sans Créer : ne devrait RIEN écrire)' : '(avec Créer : écrit, contre-épreuve)'}`, ferme ? !eEcrit : eEcrit, { ecrit:eEcrit, refus:e.r.refus, ch:e.r.changed });
  // 2) les contrôles du module, cliqués à la main (cachés par le CSS, mais le clic JS passe) : rien ne doit s'ouvrir sans Créer
  await L.aller(p, 'boiteMail'); await choisirMail(p, 0);
  for (const [sel, nom] of [['[data-act="reply"]', 'bouton Répondre'], ['[data-act="replyAll"]', 'bouton Répondre à tous'], ['[data-act="forward"]', 'bouton Transférer'], ['[data-quick]', 'réponse rapide'], ['#btnCompose', 'bouton Nouveau message']]) {
    const r = await tenter(p, () => modDom(p, sel, 'click')); const present = await p.evaluate(() => 1);
    void present;
    if (ferme) v(`${etiquette} · clic JS sur ${nom} : aucune fenêtre de rédaction, rien d'écrit`, !r.compose && r.changed.length === 0, r);
    else v(`${etiquette} · clic JS sur ${nom} : (contre-épreuve) la fenêtre s'ouvre ou le bouton n'existe pas ici`, r.compose || r.err === '' , r);
    await choisirMail(p, 0);
  }
  for (const k of ['c', 'r', 'Shift+R', 'f']) { const r = await tenter(p, async () => { await p.keyboard.press(k); }, 'boiteMail', true); if (ferme && k !== 'f') v(`${etiquette} · touche ${k} : pas de fenêtre`, !r.compose && r.changed.filter(x => x !== 'MAILS').length === 0, r); await choisirMail(p, 0); }
  // multi-sélection → Transférer
  const rm = await tenter(p, async () => { await p.evaluate(() => { const h = document.querySelector('[data-opcourrier]'), r = h.shadowRoot; const b = r.querySelector('[data-multi="forward"]'); const rows = [...r.querySelectorAll('#rows .msg')]; void rows; if (b) { b.disabled = false; b.click(); } }); }, 'boiteMail');
  if (ferme) v(`${etiquette} · multi-sélection › Transférer (bouton forcé) : pas de fenêtre`, !rm.compose, rm);
  // 3) l'hôte : agir() et les fonctions de Boîte mail appelées en direct
  for (const [id, nom, quoi] of [['mbx:relancer|', 'agir mbx:relancer', 'cli'], ['mbx:prevenir|', 'agir mbx:prevenir', 'cli'], ['mbx:repondre|', 'agir mbx:repondre', 'cli'], ['ml:creneau|', 'agir ml:creneau', 'dev'], ['ml:tache|', 'agir ml:tache', 'cli'], ['mbx:confier|', 'agir mbx:confier (panneau)', 'cli'], ['mbx:confok|', 'agir mbx:confok (écrit la tâche)', 'cli'], ['ml:confok|', 'agir ml:confok', 'cli']]) {
    const mid = ids[quoi], arg = id + mid + (/confok/.test(id) ? '|kb' : '');
    const r = await tenter(p, () => p.evaluate(a => courrierHoteApi.agir(a, { id:a.split('|')[1] }), arg));
    const pan = await p.evaluate(() => 0); void pan;
    const voulu = ferme || (fermeCreneau && /creneau/.test(id));
    const nonClassePlan = /confier\|/.test(id) && !/confok/.test(id);   // le panneau « Confier » : on regarde qu'il ne s'ouvre pas
    if (voulu) v(`${etiquette} · ${nom} : REFUSÉ — rien d'écrit, pas de fenêtre`, r.changed.length === 0 && !r.compose, r);
    else if (/confier\|/.test(id) && !/confok/.test(id)) v(`${etiquette} · ${nom} : (contre-épreuve) n'écrit rien (ouvre le panneau)`, r.changed.length === 0, r);
    else v(`${etiquette} · ${nom} : (contre-épreuve) passe : fenêtre ou donnée écrite`, r.compose || r.changed.length > 0, r);
    void nonClassePlan;
  }
  const rp = await tenter(p, () => p.evaluate(id => mbxPanConfier(mlDe(id)), ids.cli));
  const panOuvert = await p.evaluate(() => !!document.querySelector('#calque .panneau')); await p.evaluate(() => { try { fermerPanneau(); } catch (e) {} });
  v(`${etiquette} · mbxPanConfier appelé directement : ${ferme ? 'aucun panneau, refus dit' : 'le panneau s\'ouvre (contre-épreuve)'}`, ferme ? (!panOuvert && rp.refus >= 1) : panOuvert, { panOuvert, refus:rp.refus });
  const rr = await tenter(p, () => p.evaluate(id => mlRepondre(mlDe(id), 'confirm'), ids.cli));
  if (ferme) v(`${etiquette} · mlRepondre(m,'confirm') (« Prévenir le client » du toast) appelé directement : refusé`, !rr.compose && rr.changed.length === 0 && rr.refus >= 1, rr);
  else v(`${etiquette} · mlRepondre(m,'confirm') passe (contre-épreuve)`, rr.compose, rr);
  // 4) mbxOptions / mbxLiberer : le créneau d'option dans BUREAU se lit dans la fonction qui l'écrit
  const bo = await tenter(p, () => p.evaluate(id => { const m = mlDe(id); mbxMod(m); MBX.crProp = { id, list:[{ d:AUJ, h:'09:00', t:'kb' }] }; mbxOptions(m, MBX.crProp); return 1; }, ids.dev));
  const optEcrite = bo.changed.includes('BUREAU');
  v(`${etiquette} · mbxOptions appelé directement : ${fermeCreneau ? 'aucune option posée au planning' : 'une option est posée (contre-épreuve)'}`, fermeCreneau ? !optEcrite : optEcrite, bo);
  // 5) de bout en bout : on rédige une réponse AVEC le texte « créneau » et on l'envoie (avec Créer seul, sans Planning › Modifier)
  if (!ferme) {
    await L.aller(p, 'boiteMail'); await attendreMail(p);
    const ob = await p.evaluate(() => BUREAU.length), om = await p.evaluate(() => MAILS.length);
    await p.evaluate(id => { const m = mlDe(id); const M = mbxMod(m); mlRep = { id, modele:'creneau' }; courrierRepondre(m, 'repondre'); void M; }, ids.dev).catch(() => {});
    // on ouvre la réponse « normale » puis on remplace son corps par le modèle « créneau » : le module ne sait pas quel modèle c'est, l'hôte le déduit du texte
    await L.calme(p, 600);
    if (await composeOuvert(p)) {
      await p.evaluate(id => { const h = document.querySelector('[data-opcourrier]'), r = h.shadowRoot; const m = mlDe(id), M = mbxMod(m); r.querySelector('#cBody').value = courrierSansFin(M.creneau) + '\n\nBien cordialement'; r.querySelector('#cTo').value = 'client@exemple.fr'; }, ids.dev);
      await p.evaluate(() => { const r = document.querySelector('[data-opcourrier]').shadowRoot; r.querySelector('#cSend').click(); }); await L.calme(p, 1500);
      await p.evaluate(() => { const r = document.querySelector('[data-opcourrier]').shadowRoot; const u = r.querySelector('[data-act="sendNow"], #toast [data-undo], .toast .tact'); void u; }); await L.calme(p, 7000);
    }
    const ob2 = await p.evaluate(() => BUREAU.length), om2 = await p.evaluate(() => MAILS.length), opt = await p.evaluate(() => BUREAU.filter(b => b.option).length);
    v(`${etiquette} · envoi de bout en bout d'une réponse « créneau » : le message part (${om}→${om2}) ; options au planning : ${fermeCreneau ? 'AUCUNE' : 'posées (contre-épreuve)'} (BUREAU ${ob}→${ob2}, options ${opt})`, om2 > om && (fermeCreneau ? ob2 === ob && opt === 0 : opt > 0), { ob, ob2, om, om2, opt });
  }
}
async function phaseStale(h) {
  // une personne qui a Créer ouvre une réponse ; PUIS son administrateur lui retire Créer (même page) : l'envoi part-il ?
  const p = h.p, k = h.k; await L.aller(p, 'boiteMail'); await attendreMail(p);
  const ids = await mailsIds(p);
  await p.evaluate(id => courrierRepondre(mlDe(id), 'repondre'), ids.cli); await L.calme(p, 600);
  const ouv = await composeOuvert(p); v('STALE la fenêtre de réponse s\'ouvre (avec Créer)', ouv, {});
  if (!ouv) return;
  await p.evaluate(k => { eqDe(k).droits.cats.com.c = 0; }, k);
  const om = await p.evaluate(() => MAILS.length);
  await p.evaluate(() => { const r = document.querySelector('[data-opcourrier]').shadowRoot; r.querySelector('#cTo').value = 'client@exemple.fr'; r.querySelector('#cSend').click(); }); await L.calme(p, 8000);
  const om2 = await p.evaluate(() => MAILS.length);
  v('STALE [NOUVEAU?] Créer retiré PENDANT que la fenêtre est ouverte : l\'envoi est refusé (la fonction hôte.envoyer relit la case)', om2 === om, { om, om2 });
}
async function phaseB(etiquette, h, quoi) {
  // « Confier » n'écrit RIEN dans BUREAU ; « Proposer une visite » en écrit (avec les deux cases)
  const p = h.p; await L.aller(p, 'boiteMail'); await attendreMail(p);
  const ids = await mailsIds(p);
  const C = await tenter(p, () => p.evaluate(id => mbxConfier(mlDe(id), 'kb'), ids.cli));
  v(`${etiquette} · « Confier » : tâche créée, BUREAU intact${quoi === 'sansPlan' ? ' (donc Planning n\'est pas requis : vrai)' : ''}`, C.changed.includes('TACHES') && !C.changed.includes('BUREAU') && C.refus === 0, C);
}
async function phaseT() {
  const c = await E.marc(PROFIL), p = c.p;
  const secu = () => p.evaluate(() => JSON.stringify(SECU.comptes) + '|' + JSON.stringify(EQUIPE.map(q => [q.k, q.actif])));
  await L.aller(p, 'equipe'); await p.evaluate(() => { eqDe('kb').actif = false; rendre(); }); await L.calme(p, 300);
  const porte = async (nom, attrs, fn) => { await p.evaluate(() => { try { fermerPanneau(); } catch (e) {} }); await L.aller(p, 'equipe'); const a = await secu(), j0 = await p.evaluate(() => (typeof JOURNAL !== 'undefined' ? JOURNAL.length : -1));
    if (attrs) await forcer(p, attrs); else await p.evaluate(fn);
    await L.calme(p, 700); const b = await secu(), j1 = await p.evaluate(() => (typeof JOURNAL !== 'undefined' ? JOURNAL.length : -1)), tst = await E.toast(p), pan = await p.evaluate(() => { const q = document.querySelector('#calque .panneau'); return q ? (q.querySelector('h2') || q).textContent.replace(/\s+/g, ' ').trim() : ''; });
    return { nom, ecrit:a !== b, journal:j1 - j0, tst:tst.slice(0, 90), pan }; };
  for (const [nom, attrs, fn] of [['data-cnx="repose|kb" (mot de passe provisoire)', { 'data-cnx':'repose|kb' }], ['data-sec2="dev-ok|kb" (déverrouiller)', { 'data-sec2':'dev-ok|kb' }], ['secuReposer(kb)', null, () => secuReposer('kb')], ['secuDeverrouiller(kb)', null, () => secuDeverrouiller('kb')], ['data-sec2="deverrouiller|kb"', { 'data-sec2':'deverrouiller|kb' }], ['data-cnx="nouveau-code"', { 'data-cnx':'nouveau-code' }]]) {
    // un compte verrouillé pour que « déverrouiller » ait de quoi faire
    await p.evaluate(() => { const c = secuCompte('kb'); c.verrou = { jusqua:null, depuis:secuMaint() }; c.echecs = 5; });
    const r = await porte(nom, attrs, fn);
    v(`T compte DÉSACTIVÉ · ${nom} : [porte voisine] n'écrit pas sur un compte désactivé`, !r.ecrit, r);
  }
  // autres actions data-eq sur un désactivé
  const L2 = await p.evaluate(() => { const s = document.documentElement.outerHTML.slice(0, 0); return s; }); void L2;
  for (const [nom, attrs] of [['data-eq="relancer|kb"', { 'data-eq':'relancer|kb' }], ['data-eqx="renouv|kb|0"', { 'data-eqx':'renouv|kb|0' }], ['data-eqx="modifok|kb"', { 'data-eqx':'modifok|kb' }]]) {
    const r = await porte(nom, attrs); v(`T compte DÉSACTIVÉ · ${nom} : n'écrit pas`, !r.ecrit, r); }
  await L.fin(c);
}


// V : l'API du module repondre() et ce que l'œil voit (barre, menu, clic droit, réponses rapides) : sans Créer rien ; avec tout, tout (régression)
async function phaseV(etiquette, h, ferme) {
  const p = h.p; await L.aller(p, 'boiteMail'); await attendreMail(p); const ids = await mailsIds(p);
  await choisirMail(p, 0);
  const vu = await repondreProposes(p);
  v(`${etiquette} · à l'œil (barre, menu Répondre ▾, clic droit, réponses rapides) : ${ferme ? 'RIEN de proposé' : 'Répondre est proposé (régression)'}`, ferme ? !vu.tout : vu.tout, vu);
  const r = await tenter(p, () => p.evaluate(id => courrierQuand(c => c.repondre(id, 'sonde API')), ids.cli), 'boiteMail');
  if (ferme) v(`${etiquette} · API du module repondre(id, texte) : pas de fenêtre, rien d'écrit`, !r.compose && r.changed.length === 0, r);
  else v(`${etiquette} · API du module repondre() : la fenêtre s'ouvre (contre-épreuve)`, r.compose, r);
}

async function phaseU() {
  const c = await E.marc(PROFIL), p = c.p;
  await L.aller(p, 'equipe'); await p.evaluate(() => { eqDe('kb').actif = false; const cc = secuCompte('kb'); cc.verrou = { jusqua:null, depuis:secuMaint() }; cc.echecs = 5; rendre(); }); await L.calme(p, 300);
  await E.fiche(c, 'kb');
  const bt = await p.evaluate(() => ({ repose:!!document.querySelector('#calque [data-cnx^="repose|"]'), dev:!!document.querySelector('#calque [data-sec2^="deverrouiller|"]'), tel:!!document.querySelector('#calque [data-sec2^="telephone|"]'), acces:!!document.querySelector('#calque .cn-acces') }));
  console.log('   fiche désactivée kb :', JSON.stringify(bt));
  v('U l\'écran de la fiche d\'une désactivée propose « Lui donner un mot de passe provisoire » (info : à trancher)', true, bt);
  await E.ranger(c);
  // dev-ok avec la case « j\'ai vérifié » cochée
  const a = await p.evaluate(() => JSON.stringify(SECU.comptes.kb));
  await p.evaluate(() => { secuPanDeverrouiller('kb'); const z = document.getElementById('sec-verif'); if (z) { z.checked = true; z.dispatchEvent(new Event('change', { bubbles:true })); } });
  const pan = await p.evaluate(() => !!document.querySelector('#calque .panneau'));
  await forcer(p, { 'data-sec2':'dev-ok|kb' }); await L.calme(p, 700);
  const b = await p.evaluate(() => JSON.stringify(SECU.comptes.kb));
  console.log('   déverrouiller une désactivée (case cochée) : panneau ouvert=' + pan + ', écrit=' + (a !== b));
  v('U secuDeverrouiller sur un désactivé : n\'écrit pas (famille « compte désactivé »)', a === b, { pan, ecrit:a !== b });
  await L.fin(c);
}
(async () => {
  for (const ph of PHASES) { console.log('-- ' + ph + ' · ' + PROFIL);
    if (ph === 'A') { const a = await monter({ cat:'com', x:'c' }); await phaseA(a, 'A SANS Créer', true, true); await L.fin(a.c);
      const b = await monter({ cat:'planif', x:'m' }); await phaseA(b, 'A SANS Planning', false, true); await L.fin(b.c);
      const d = await monter(null); await phaseA(d, 'A AVEC tout', false, false); await L.fin(d.c); }
    else if (ph === 'B') { const b = await monter({ cat:'planif', x:'m' }); await phaseB('B SANS Planning', b, 'sansPlan'); await L.fin(b.c); const d = await monter(null); await phaseStale(d); await L.fin(d.c); }
    else if (ph === 'T') await phaseT(); else if (ph === 'U') await phaseU();
    else if (ph === 'V') { const a = await monter({ cat:'com', x:'c' }); await phaseV('V SANS Créer', a, true); await L.fin(a.c); const d = await monter(null); await phaseV('V AVEC tout', d, false); await L.fin(d.c); } }
  await E.fin();
})().catch(e => { console.error('ÉCHEC DE LA SONDE', e.message, String(e.stack).split('\n').slice(0, 4).join(' | ')); process.exit(2); });
