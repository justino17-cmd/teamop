// « restes équipe » TOUR 4 (19 novembre 2026) — « une case se lit dans la fonction qui écrit, pas dans le bouton ».
//  N3 : « Répondre », « Répondre à tous », « Proposer une visite », « Confier à quelqu'un », « En faire une tâche » exigent Boîte mail › Créer ;
//       « Proposer une visite » exige AUSSI Planning › Modifier (la case de mbxOptions, qui tient les options au planning). Sans la case : pas de bouton,
//       ET la fonction refuse (appel direct, bouton fabriqué, raccourci R / Maj+R). Avec les cases : tout passe (contre-épreuve).
//  D  : eqFiche n'est déclarée qu'UNE fois et la fiche s'ouvre comme avant (référence : restes-equipe-4-fiches-avant.json, prise sur la page d'avant le correctif).
//  T  : un bouton data-sec2 « telephone|k » / « deconnecter|k » fabriqué (ou la fonction appelée) sur un compte DÉSACTIVÉ n'ouvre rien et le dit ; actif : inchangé.
//  usage : node restes-equipe-4.js <profil mac|iphone|android> [N3 D T] ; node restes-equipe-4.js <profil> DUMP <fichier>  (écrit la référence de D)
// ⛔ 127.0.0.1 seulement, entreprise fictive, aucun serveur.
const fs = require('fs'), path = require('path');
const E = require('./equipe-outils.js'); const { L, v } = E;
const PROFIL = process.argv[2] || 'mac'; const ARGS = process.argv.slice(3);
const DUMP = ARGS[0] === 'DUMP' ? ARGS[1] : null; const PHASES = DUMP ? ['D'] : (ARGS.length ? ARGS : ['N3', 'D', 'T']);
const REF = path.join(__dirname, 'restes-equipe-4-fiches-avant.json');
const SNAP = `(() => { const N = ['ENTREPRISE', 'CLIENTS', 'INTS', 'BUREAU', 'ABSENCES', 'NOTES', 'FACTURES', 'ENCAISSEMENTS', 'CONTRATS', 'DEVIS', 'TACHES', 'DEMANDES_ABS', 'DECISIONS_ABS', 'PRODUITS', 'COMMANDES', 'MVTS', 'MAILS', 'ML_BOITES', 'NOTIFS', 'SECU', 'EQUIPE'];
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

// ── N3 ─────────────────────────────────────────────────────────────────────────────────────────────
async function lot(h, etiquette, quoi) {
  // quoi : 'sansC' (Boîte mail › Créer décochée) | 'sansPlan' (Planning › Modifier décochée) | 'avec' | 'sansM' (Modifier décochée : répondre PASSE)
  const p = h.p; await L.aller(p, 'boiteMail'); await attendreMail(p);
  if (process.env.TRACE) console.log('   · état', JSON.stringify(await p.evaluate(() => ({ route, ROLE, acteur:acteur(), permis:rlPermis('boiteMail'), raison:droitRaison('boiteMail'), toast:(document.getElementById('toast') || {}).textContent }))));
  const ids = await p.evaluate(() => { const f = (s, q) => { const m = MAILS.find(m => m.dossier === 'recu' && !m.fait && mlLire(m).sujet === s && (!q || mlLire(m).qui === q)); return m ? m.id : null; }; return { cli:f('msgcli'), dev:f('devis', 'nouveau'), panne:f('panne') }; });
  v(`${etiquette} : le décor existe (un message client, un nouveau contact en devis)`, !!ids.cli && !!ids.dev, ids);
  const sansC = quoi === 'sansC', sansP = quoi === 'sansPlan', avecTout = quoi === 'avec' || quoi === 'sansM';
  // 0) le bandeau « OP GESTION a reconnu » (AVANT les écritures : « Confier » range le message en « traité » et le bandeau n'offre plus rien)
  await p.evaluate(id => { const m = mlDe(id); if (m) m.attente = null; }, ids.cli);   /* le seul message client de la démonstration est « à relancer » : on le remet en « à répondre » pour que le bandeau offre « Répondre » */
  const ba = await p.evaluate(ids => { const id = x => (courrierHoteApi.lecture({ id:x }) || { actions:[] }).actions.map(o => o.id.split('|')[0]); return { cli:id(ids.cli), dev:id(ids.dev) }; }, ids);
  const a = [...ba.cli, ...ba.dev];
  for (const [id, nom, ou] of [['mbx:repondre', 'Répondre', 'cli'], ['ml:tache', 'En faire une tâche', 'cli'], ['mbx:confier', 'Confier à quelqu’un', 'cli'], ['ml:creneau', 'Proposer une visite', 'dev']]) {
    const la = ba[ou].includes(id), voulu = !(sansC || (sansP && id === 'ml:creneau'));
    v(`${etiquette} · bandeau : « ${nom} » ${voulu ? 'est proposé (contre-épreuve)' : 'n\'est PAS proposé'}`, la === voulu, { ids:ba[ou] });
  }
  void a;
  // 1) la FONCTION appelée directement (le bouton n'est pas en cause)
  const D = async (cle, id) => tenter(p, () => p.evaluate(({ cle, id }) => courrierRepondre(mlDe(id), cle), { cle, id }), 'boiteMail');
  for (const [cle, id, nom] of [['repondre', ids.cli, 'Répondre'], ['creneau', ids.dev, 'Proposer une visite'], ['relancer', ids.cli, 'Relancer']]) {
    const r = await D(cle, id), voulu = sansC || (sansP && cle === 'creneau');
    if (voulu) { v(`${etiquette} · appel direct courrierRepondre(« ${nom} ») : REFUSÉ — aucune fenêtre de rédaction, rien d'écrit, refus dit`, !r.compose && r.changed.length === 0 && r.refus >= 1 && /pas ouvert à ton compte|Planning/.test(r.toast), r);
      if (sansP && cle === 'creneau') v(`${etiquette} · la phrase de refus nomme la case Planning`, /Planning/.test(r.toast) && r.dernier && r.dernier.cat === 'planif', r); }
    else v(`${etiquette} · appel direct courrierRepondre(« ${nom} ») : PASSE (contre-épreuve : la fenêtre de rédaction s'ouvre, pas de refus)`, r.compose && r.refus === 0, r);
  }
  // 2) la fonction qui CRÉE une tâche (Confier) : appel direct
  const C = await tenter(p, () => p.evaluate(() => mbxConfier(mlDe(MAILS.find(m => m.dossier === 'recu' && mlLire(m).sujet === 'msgcli').id), 'kb')), 'boiteMail');
  if (sansC) v(`${etiquette} · appel direct mbxConfier : REFUSÉ — aucune tâche créée, refus dit`, C.changed.length === 0 && C.refus >= 1 && /pas ouvert à ton compte/.test(C.toast), C);
  else v(`${etiquette} · appel direct mbxConfier : PASSE (contre-épreuve : une tâche est créée pour Karim)`, C.changed.includes('TACHES') && C.refus === 0, C);
  // 3) boutons FABRIQUÉS (le menu, la console, un vieux cache fabriquent des boutons sans passer par l'écran)
  for (const [attrs, nom, ferme] of [[{ 'data-mbx':'repondre|' + ids.cli }, 'mbx:repondre', sansC], [{ 'data-ml':'repondre|' + ids.cli }, 'ml:repondre', sansC], [{ 'data-ml':'creneau|' + ids.dev }, 'ml:creneau (Proposer une visite)', sansC || sansP], [{ 'data-ml':'modele|' + ids.cli + '|recu' }, 'ml:modele (modèle « accusé »)', sansC], [{ 'data-ml':'tache|' + ids.cli }, 'ml:tache (En faire une tâche)', sansC], [{ 'data-mbx':'confok|' + ids.cli + '|kb' }, 'mbx:confok (Confier)', sansC], [{ 'data-ml':'confok|' + ids.cli + '|kb' }, 'ml:confok', sansC]]) {
    const r = await tenter(p, () => forcer(p, attrs), 'boiteMail');
    if (ferme) v(`${etiquette} · bouton fabriqué ${nom} : REFUSÉ — rien d'écrit, aucune fenêtre de rédaction, refus dit`, r.changed.length === 0 && !r.compose && r.refus >= 1, r);
    else v(`${etiquette} · bouton fabriqué ${nom} : PASSE (contre-épreuve : fenêtre ouverte ou donnée écrite)`, (r.compose || r.changed.length > 0) && r.refus === 0, r);
  }
  // 4) raccourcis du module : R et Maj+R sur le message ouvert
  await L.aller(p, 'boiteMail'); await choisirMail(p, 0);
  for (const [touche, nom] of [['r', 'R (Répondre)'], ['Shift+R', 'Maj+R (Répondre à tous)']]) {
    const r = await tenter(p, async () => { await p.keyboard.press(touche); }, 'boiteMail', true);
    if (touche === 'Shift+R') { v(`${etiquette} · touche ${nom} : le module n'a pas ce raccourci — aucune fenêtre, rien d'écrit`, !r.compose && r.changed.length === 0, r); await choisirMail(p, 0); continue; }
    if (sansC) v(`${etiquette} · touche ${nom} : FERMÉE — pas de fenêtre de rédaction, refus dit`, !r.compose && r.refus >= 1, r);
    else v(`${etiquette} · touche ${nom} : PASSE (contre-épreuve : la fenêtre de rédaction s'ouvre)`, r.compose && r.refus === 0, r);
    await choisirMail(p, 0);
  }
  // 5) ce qui est PROPOSÉ à l'œil : « Répondre », « Répondre à tous », les réponses rapides
  const pr = await repondreProposes(p);
  if (sansC) v(`${etiquette} · AUCUN bouton de réponse n'est proposé (barre, menu « Répondre ▾ », clic droit, réponses rapides)`, !pr.tout, pr);
  else v(`${etiquette} · « Répondre » est proposé (contre-épreuve${quoi === 'sansM' ? ' : sans la case Modifier, il l\'est quand même — répondre n\'est plus un geste de Modifier' : ''})`, pr.barre || pr.menuReponse || pr.clicDroit, pr);
}
async function phaseN3() {
  const ph = await monter(null); const t = await ph.p.evaluate(() => ({ m:DROIT_PHRASES.com.m, c:DROIT_PHRASES.com.c, tab:['repondre', 'creneau', 'tache', 'confok'].map(x => [x, JSON.stringify(geste('ml', x)), JSON.stringify(geste('mbx', x))]) }));
  v('N3 la phrase de la case Modifier ne dit plus « répondre », celle de Créer le dit', !/répondre/.test(t.m) && /répondre/.test(t.c), t);
  v('N3 la table GESTES classe repondre / creneau / tache / confok en Boîte mail › Créer (ml et mbx)', t.tab.every(([x, a, b]) => (/"x":"c"/.test(a) || x === 'repondre' && /"x":"c"/.test(b) || x === 'confok') && /"cat":"com"/.test(b.includes('x') ? b : a)), t.tab);
  await lot(ph, 'N3 AVEC toutes les cases', 'avec'); await L.fin(ph.c);
  const pc = await monter({ cat:'com', x:'c' }); await lot(pc, 'N3 SANS Boîte mail › Créer', 'sansC'); await L.fin(pc.c);
  const pp = await monter({ cat:'planif', x:'m' }); await lot(pp, 'N3 SANS Planning › Modifier', 'sansPlan'); await L.fin(pp.c);
  const pm = await monter({ cat:'com', x:'m' }); await lot(pm, 'N3 SANS Boîte mail › Modifier (mais avec Créer)', 'sansM'); await L.fin(pm.c);
}

// ── D : eqFiche déclarée une fois ───────────────────────────────────────────────────────────────────
async function phaseD() {
  const src = fs.readFileSync(path.join(process.env.RACINE || path.join(__dirname, '..', '..', '..', '..'), 'apercu', 'prototype-op-gestion.html'), 'utf8');
  const nFonc = (src.match(/^function eqFiche\s*\(/gm) || []).length, nAff = (src.match(/^eqFiche\s*=\s*function/gm) || []).length, nTotal = nFonc + nAff;
  const c = await E.marc(PROFIL), p = c.p;
  const fiches = {};
  const moi = await p.evaluate(() => acteur());   /* la fiche d'un ADMINISTRATEUR (ses cases sont grisées) en plus de trois fiches de personnes ordinaires */
  for (const k of ['kb', 'sm', 'lr', moi]) { await E.fiche(c, k); fiches[k === moi ? 'moi' : k] = await p.evaluate(() => { const q = document.querySelector('#calque .panneau'); return q ? q.innerHTML.replace(/\s+/g, ' ').replace(/\d{1,2}[:h]\d{2}/g, 'H') : null; }); await E.ranger(c); }
  const ouv = await p.evaluate(() => { eqFiche('kb'); const q = document.querySelector('#calque .panneau'); return { h2:q && q.querySelector('h2') ? q.querySelector('h2').textContent.trim() : null, cases:q ? q.querySelectorAll('input[data-eqd]').length : 0, comme:q ? !!q.querySelector('[data-cnx^="comme"]') : false, acces:q ? !!q.querySelector('.cn-acces') : false }; }); await E.ranger(c);
  if (DUMP) { fs.writeFileSync(DUMP, JSON.stringify(fiches)); console.log('référence écrite : ' + DUMP); await L.fin(c); return; }
  v('D eqFiche : UNE seule déclaration `function eqFiche` ne reste pas (la morte est retirée) et une seule affectation `eqFiche = function` ', nFonc === 0 && nAff === 1 && nTotal === 1, { nFonc, nAff, nTotal });
  v('D la fiche s\'ouvre : titre, cases de droits, bouton « Ouvrir l\'application comme », bloc d\'accès (le correctif de la seconde déclaration vit encore)', !!ouv.h2 && ouv.cases > 20 && ouv.comme && ouv.acces, ouv);
  if (!fs.existsSync(REF)) v('D la référence « fiches avant » existe', false, REF);
  else { const ref = JSON.parse(fs.readFileSync(REF, 'utf8'));
    /* la SEULE différence voulue : les deux phrases de la case Boîte mail (N3 : « répondre » passe de Modifier à Créer) — on les remet dans leur forme d'avant pour comparer le reste, signe pour signe */
    const AVANT = [['écrire un message ou y répondre, le transférer, confier un e-mail, en faire une tâche, connecter une boîte, ajouter une règle', 'écrire un message, le transférer, connecter une boîte, ajouter une règle'], ['marquer, archiver, ranger, reconnecter une boîte', 'répondre, marquer, archiver, ranger, reconnecter une boîte']];
    for (const k of Object.keys(fiches)) for (const [n, a] of AVANT) fiches[k] = (fiches[k] || '').split(n).join(a);
    for (const k of Object.keys(ref)) v(`D la fiche de « ${k} » est IDENTIQUE à celle d'avant le correctif (${(fiches[k] || '').length} signes)`, fiches[k] === ref[k], { avant:(ref[k] || '').length, apres:(fiches[k] || '').length }); }
  await L.fin(c);
}

// ── T : téléphone / déconnexion sur un compte désactivé ────────────────────────────────────────────
async function phaseT() {
  const c = await E.marc(PROFIL), p = c.p;
  const panneau = () => p.evaluate(() => { const q = document.querySelector('#calque .panneau'); return q ? (q.querySelector('h2') || q).textContent.replace(/\s+/g, ' ').trim() : ''; });
  const secu = () => p.evaluate(() => JSON.stringify(SECU) + '|' + JSON.stringify(EQUIPE));
  const run = async (etat, k) => {
    for (const [verbe, titre] of [['telephone', /Nouveau téléphone/], ['deconnecter', /Déconnecter/]]) {
      await p.evaluate(() => { try { fermerPanneau(); } catch (e) {} }); await L.aller(p, 'equipe'); await L.calme(p, 300);
      const s0 = await secu(), r0 = await p.evaluate(() => DROITS_REFUS.length);
      await forcer(p, { 'data-sec2':verbe + '|' + k }); await L.calme(p, 600);
      const pan = await panneau(), tst = await E.toast(p), s1 = await secu();
      if (etat === 'désactivé') v(`T compte DÉSACTIVÉ · bouton fabriqué data-sec2="${verbe}|${k}" : aucun panneau, la phrase le dit (« ${tst.slice(0, 80)} »), rien n'a bougé`, !titre.test(pan) && /désactivé/.test(tst) && s0 === s1, { pan, tst });
      else v(`T compte ACTIF · bouton fabriqué data-sec2="${verbe}|${k}" : le panneau s'ouvre (contre-épreuve)`, titre.test(pan) && s0 === s1, { pan, tst });
    }
    // la fonction elle-même, appelée directement (panneau ET écriture), et les boutons « ok » fabriqués
    await p.evaluate(() => { try { fermerPanneau(); } catch (e) {} });
    const s0 = await secu(); const rets = await p.evaluate(k => { const o = {}; o.panT = secuPanTelephone(k); o.panD = secuPanDeconnecter(k); const q = document.querySelector('#calque .panneau'); o.pan = q ? q.textContent.replace(/\s+/g, ' ').slice(0, 60) : ''; return o; }, k); const pan2 = rets.pan;
    await p.evaluate(() => { try { fermerPanneau(); } catch (e) {} });
    const ecr = await p.evaluate(k => { const v = document.getElementById('sec-verif'); return { tel:secuNouveauTelephone(k), deco:secuDeconnecter(k), verif:!!v }; }, k);
    const s1 = await secu();
    if (etat === 'désactivé') v('T compte DÉSACTIVÉ · fonctions secuPanTelephone / secuPanDeconnecter appelées directement : aucun panneau', !/Nouveau téléphone|Déconnecter/.test(pan2), { pan2 });
    if (etat === 'désactivé') v('T compte DÉSACTIVÉ · secuNouveauTelephone / secuDeconnecter appelées directement : refusées (false) et rien n\'est écrit', ecr.tel === false && ecr.deco === false && s0 === s1, ecr);
    else v('T compte ACTIF · fonctions panneau appelées directement : le panneau s\'ouvre (contre-épreuve)', /Nouveau téléphone|Déconnecter/.test(pan2), { pan2 });
    for (const verbe of ['tel-ok', 'deco-ok']) { await p.evaluate(() => { try { fermerPanneau(); } catch (e) {} }); const a = await secu(); await forcer(p, { 'data-sec2':verbe + '|' + k }); await L.calme(p, 500); const b = await secu();
      if (etat === 'désactivé') v(`T compte DÉSACTIVÉ · bouton fabriqué data-sec2="${verbe}|${k}" (le bouton final) : rien n'a bougé`, a === b, { verbe }); }
  };
  await L.aller(p, 'equipe');
  await run('actif', 'kb');
  await p.evaluate(() => { eqDe('kb').actif = false; rendre(); }); await L.calme(p, 300);
  await run('désactivé', 'kb');
  // l'ÉCRAN, lui, ne propose toujours pas ces deux boutons sur la fiche d'une désactivée (tour 3) : « Déverrouiller » seul gardé
  await E.fiche(c, 'kb'); const bt = await p.evaluate(() => ({ tel:!!document.querySelector('#calque [data-sec2^="telephone|"]'), deco:!!document.querySelector('#calque [data-sec2^="deconnecter|"]') }));
  v('T la fiche d\'une désactivée ne propose ni « Nouveau téléphone » ni « Déconnecter partout » (tour 3 tenu)', !bt.tel && !bt.deco, bt);
  await L.fin(c);
}
(async () => {
  for (const ph of PHASES) { console.log('-- ' + ph + ' · ' + PROFIL); if (ph === 'N3') await phaseN3(); else if (ph === 'D') await phaseD(); else if (ph === 'T') await phaseT(); }
  await E.fin();
})().catch(e => { console.error('ÉCHEC DE LA SONDE', e.message, String(e.stack).split('\n').slice(0, 4).join(' | ')); process.exit(2); });
