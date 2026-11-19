// RECONTRÔLE ADVERSE — LES GESTES DES PAGES VOISINES, UN PAR UN (17 novembre 2026).
// Le recensement de l'agent précédent (artefact-recensement.js) ne descend JAMAIS dans un <iframe> : sa collecte vise `#contenu` de la page principale,
// or la Comptabilité, l'atelier de devis et contrats et le paiement sont des pages voisines dans des cadres — leurs exports, copies et envois n'y étaient
// touchés que par trois gestes choisis à la main (FEC, PDF de l'atelier par la fonction, IBAN). Ici : le prototype est servi dans un cadre (comme l'artefact),
// on entre dans chaque page voisine, on parcourt CHACUNE de ses vues, on recense ce qui sort (télécharger, exporter, copier, envoyer, imprimer, lien…) par le
// DOM, on le TOUCHE, et on exige : un fichier non vide au pont, ou une phrase à l'écran, ou une fenêtre de lien — jamais « rien », jamais une annonce que rien ne prouve.
//   PROFIL=mac|iphone  CADRES=compta,atelier,paiement  DUREE_S=240
const P = require('./recontrole-artefact-pose.js'), A = require('./artefact-commun.js'), { bac, lib: L, v } = P;
const PROFIL = process.env.PROFIL || 'mac', NUIT = !!process.env.NUIT, DUREE = 1000 * parseInt(process.env.DUREE_S || '240', 10);
const CADRES = (process.env.CADRES || 'compta,atelier,paiement').split(',');
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
// ce que le cadre « dit » : tout le texte visible + les messages éphémères (toast, status) — comparé avant/après le geste
const photo = f => f.evaluate(() => { const t = [...document.querySelectorAll('.toast, #toast, #toasts, [role=status], [role=alert], #fec-msg, .msg')].filter(e => e.offsetParent !== null || getComputedStyle(e).position === 'fixed').map(e => e.textContent.trim()).filter(Boolean).join(' | ');
  return { msg: t.slice(0, 200), nb: document.body.innerText.length, ouv: document.querySelectorAll('[role=dialog]:not([hidden]), .fenetre, .modal, .panneau, dialog[open]').length, hash: location.hash }; });
const dit = (a, b) => b.msg !== a.msg || b.nb !== a.nb || b.ouv !== a.ouv || b.hash !== a.hash;
const SENS = A.SENS, SD = A.SENS_DATA;
async function recenserVue(c, f, nomCadre, vue, allerVue, resultats, FIN) {
  await allerVue(vue); await L.calme(c.p, 500);
  const liste = await A.collecter(f, 'body'); resultats.total += liste.length; if (process.env.DEBUG) console.log('  · ' + nomCadre + ':' + vue + ' → ' + liste.length + ' candidats : ' + liste.map(x => x.lib.slice(0, 22)).join(' ; ').slice(0, 160));
  for (const k of liste) {
    if (Date.now() > FIN) { resultats.nonFaits.push(nomCadre + ':' + vue + ' (suite)'); return; }
    // « Y aller » de la Comptabilité est une NAVIGATION interne (data-a=aller), pas une sortie : la toucher change l'état de la page (les vues suivantes n'offrent plus rien) — écarté, compté
    if (/data-a=aller\b/.test(k.data)) { resultats.internes++; continue; }
    // un champ de fichier caché (créé au démarrage, déclenché par un bouton seulement quand un document est ouvert) n'est pas atteignable par la personne : écarté, compté
    if (k.fichier && k.tag === 'INPUT') { const vis = await f.evaluate(i => { const e = document.querySelector(`[data-bac-i="${i}"]`); if (!e) return false; const l = e.closest('label'); return !!(l && l.offsetParent) || !!e.offsetParent; }, k.i).catch(() => false); if (!vis) { resultats.caches++; continue; } }
    const cle = nomCadre + '>' + vue + '>' + k.tag + '|' + k.lib + '|' + k.href; if (resultats.vus.has(cle)) continue; resultats.vus.add(cle);
    // on remet l'écran d'aplomb, on retrouve le candidat par sa signature, on le touche
    await allerVue(vue); await L.calme(c.p, 300);
    const cs = await A.collecter(f, 'body'), kk = cs.find(x => x.tag + '|' + x.lib + '|' + x.href === k.tag + '|' + k.lib + '|' + k.href); if (!kk) { resultats.perdus++; continue; }
    // le message du geste d'AVANT (« Ticket photographié… ») dure plusieurs secondes : laissé à l'écran il se confond avec celui du geste qu'on mesure (avant = après, « rien de visible » à tort). On attend qu'il s'éteigne.
    for (let k = 0; k < 14 && (await photo(f).catch(() => ({ msg: '' }))).msg; k++) await c.p.waitForTimeout(500);
    const loc = f.locator(`[data-bac-i="${kk.i}"]`).first(); const e0 = await bac.etat(c), p0 = await photo(f);
    let ok = true;
    if (kk.fichier) { const inp = kk.tag === 'INPUT' ? loc : f.locator(`[data-bac-i="${kk.i}"] input[type=file]`).first(); try { await inp.setInputFiles({ name: 'essai.png', mimeType: 'image/png', buffer: PNG }, { timeout: 3000 }); } catch (e) { ok = false; } }
    else { try { if (c.doigt) await loc.tap({ timeout: 3500 }); else await loc.click({ timeout: 3500 }); } catch (e) { ok = false; } }
    await c.p.waitForTimeout(700);
    const e1 = await bac.etat(c), p1 = await photo(f), d = A.delta(e0, e1);
    resultats.liste.push({ cadre: nomCadre, vue, ...kk, ok, d, dit: dit(p0, p1), msg: p1.msg, fichier: (e1.fichiers || []).slice((e0.fichiers || []).length) });
    // un geste qui a ouvert une fenêtre ou changé de vue : on remet tout (la vue suivante repart d'une page d'aplomb)
    await f.evaluate(() => { try { document.querySelectorAll('[data-a="fermer"],[data-fermer],.fenetre .x,[aria-label="Fermer"]').forEach(b => b.click()); } catch (e) {} }).catch(() => {});
    // Échap ne se presse plus à l'aveugle : depuis « Retour ferme la couche du dessus » (b2ad1978, Restes Retour tour 4) il FERME le cadre de la Comptabilité quand rien d'autre n'est ouvert, et les vues suivantes se recensaient dans un cadre parti (0 candidat partout après le FEC). On ne l'envoie que si une couche de l'hôte est ouverte.
    if (await c.hote.evaluate(() => !!document.querySelector('#calque .panneau, .fen-voile, [role=dialog]:not([hidden])')).catch(() => false)) await c.hote.keyboard.press('Escape').catch(() => {});
  }
}
function verdict(x) {
  const nom = `${PROFIL} ${x.cadre}:${x.vue} › « ${(x.lib || x.href || x.data || '').slice(0, 40)} »`;
  const annonce = /(téléchargé|téléchargée|enregistré|enregistrée|exporté|exportée|prêt)/i.test(x.msg || '') && !(x.fichier && x.fichier.length);
  if (!x.ok) return null;
  if (x.sortant === 'download' || x.d.liensInertes || (/télécharg|export|pdf|csv|fec\b/i.test(x.lib) && !/^https?$/.test(x.sortant))) { const f = (x.fichier || [])[0];
    return [nom + ' : un fichier NON VIDE au bon nom, ou l\'écran dit pourquoi pas', (f && f.taille > 0 && /\.[a-z]{2,4}$/.test(f.nom) && !x.d.liensInertes) || (x.dit && !annonce && !x.d.liensInertes), x]; }
  if (/^(tel|mailto|sms)$/.test(x.sortant)) return [nom + ' : rien n\'annonce un appel ou un envoi', !/(appel lancé|message envoyé|envoyé)/i.test(x.msg || ''), x];
  if (x.sortant === 'https') return [nom + ' : un vrai lien (fenêtre ouverte)', !!(x.d.popups || x.d.ouvertures), x];
  if (x.fichier) return [nom + ' : joindre un fichier fait quelque chose de visible', x.dit, x];
  if (/copier|copie/i.test(x.lib)) return [nom + ' : la copie part, ou l\'écran dit comment faire', !!(x.d.presse || x.d.copiesSelection || x.dit), x];
  return [nom + ' : le geste fait quelque chose de visible (ou dit pourquoi pas)', !!(Object.keys(x.d).length || x.dit), x];
}
(async () => {
  const FIN0 = Date.now() + DUREE;
  const R = { total: 0, vus: new Set(), liste: [], nonFaits: [], perdus: 0, internes: 0, caches: 0 };
  const c = await P.ouvrirHote({ profil: PROFIL, qui: 'marc', nuit: NUIT }, {});
  await A.calmer(c.p);
  // ── le paiement (cadre) — JOUÉ EN PREMIER : après une visite de la Comptabilité, la route « comptabilite » n'affiche plus que « La comptabilité s'ouvre dans sa fenêtre » et ses groupes (Trésorerie…) n'y sont plus ──
  if (CADRES.includes('paiement')) {
    // Le paiement en ligne n'est plus une route de l'application : il vit dans la Comptabilité, Trésorerie › « Paiement en ligne » (8 novembre 2026, cxVueEnLigne) ; la sonde y va comme la personne (groupe puis section) au lieu de chercher un nom de route qui n'existe plus (« route paiement : null », cadre jamais recensé)
    await L.aller(c.p, 'comptabilite'); await L.calme(c.p, 1200); if (!(await c.p.evaluate(() => { const b = document.querySelector('[data-cx="sec|enligne"]'); return !!(b && b.offsetParent); }))) { await L.toucher(c, '[data-cx="grp|tresorerie"]').catch(() => {}); await L.calme(c.p, 400); }   // le groupe garde son état d'ouverture : un second toucher le REFERMERAIT
    await c.p.evaluate(() => { const b = document.querySelector('[data-cx="sec|enligne"]'); if (b) b.click(); }); await L.calme(c.p, 2500);
    const r = await c.p.evaluate(() => !!document.querySelector('#cx-enligne iframe')) ? 'comptabilite › Trésorerie › Paiement en ligne' : null;
    console.log('  · route paiement :', r);
    if (r) { const f = L.cadre(c.hote, /prototype-paiement\.html/);
      v(`${PROFIL} paiement : population (le cadre est chargé)`, !!f, f && f.url()); if (f) await recenserVue(c, f, 'paiement', 'ouverture', async () => {}, R, Math.min(FIN0, Date.now() + DUREE / 3)); }
  }
  // ── Comptabilité (cadre) ──
  if (CADRES.includes('compta')) {
    await c.p.evaluate(() => { location.hash = 'accueil'; }); await L.calme(c.p, 800);   // le paiement a laissé la route « comptabilite » : le cadre de la Comptabilité ne s'ouvre qu'à l'ARRIVÉE sur elle
    await c.p.evaluate(() => { location.hash = 'comptabilite'; }); await L.calme(c.p, 2200);
    const f = L.cadre(c.hote, /prototype-comptabilite\.html/);
    v(`${PROFIL} compta : population (le cadre est chargé)`, !!f && await f.evaluate(() => typeof ROUTES !== 'undefined' && ROUTES.length > 5).catch(() => false), f && f.url());
    if (f) { const routes = await f.evaluate(() => ROUTES.slice()); v(`${PROFIL} compta : ${routes.length} vues recensées`, routes.length > 5, routes);
      const FIN = Math.min(FIN0, Date.now() + DUREE / CADRES.length);
      for (const r of routes) { if (Date.now() > FIN) { R.nonFaits.push('compta:' + r); continue; } await recenserVue(c, f, 'compta', r, async x => { await f.evaluate(y => aller(y), x); }, R, FIN); } }
  }
  // ── l'atelier de devis et contrats (cadre) ──
  if (CADRES.includes('atelier')) {
    await L.aller(c.p, 'devis'); await c.p.locator('#contenu [data-opd="devis"]').first().click({ timeout: 5000 }).catch(() => {}); await L.calme(c.p, 2500);
    const f = L.cadre(c.hote, /prototype-documents\.html/);
    v(`${PROFIL} atelier : population (le cadre est chargé)`, !!f && await f.evaluate(() => typeof pdfEnregistrer === 'function').catch(() => false), f && f.url());
    if (f) { const vues = await f.evaluate(() => { try { return ['accueil', 'liste', 'editeur', 'modeles', 'clients'].filter(x => typeof S !== 'undefined'); } catch (e) { return []; } });
      const FIN = Math.min(FIN0, Date.now() + DUREE / CADRES.length);
      await recenserVue(c, f, 'atelier', 'ouverture', async () => {}, R, FIN); }
  }
  const evalues = R.liste.filter(x => x.ok), nonTouches = R.liste.filter(x => !x.ok);
  v(`${PROFIL} cadres : population recensée (${R.total} candidats, ${R.liste.length} touchés, ${R.nonFaits.length} vues non faites, ${R.perdus} perdus, ${R.internes} navigations internes écartées, ${R.caches} champs cachés écartés)`, R.total >= 5 && R.liste.length >= 3, { total: R.total, touches: R.liste.length, nonFaits: R.nonFaits });
  for (const x of evalues) { const r = verdict(x); if (r) v(r[0], r[1], { d: r[2].d, dit: r[2].dit, msg: r[2].msg, f: r[2].fichier && r[2].fichier[0] }); }
  v(`${PROFIL} cadres : gestes non touchables (${nonTouches.length} sur ${R.liste.length}), au plus un quart`, nonTouches.length * 4 <= R.liste.length, nonTouches.slice(0, 8).map(x => x.cadre + ':' + x.vue + ' ' + x.lib));
  v(`${PROFIL} cadres : aucune erreur JavaScript`, c.err.length === 0, c.err.slice(0, 3));
  const e = await bac.etat(c); v(`${PROFIL} cadres : aucune boîte de dialogue`, e.dialogues.length === 0, e.dialogues.slice(0, 3));
  require('fs').writeFileSync('/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/recontrole-artefact/cadres-' + PROFIL + '.json', JSON.stringify(R.liste.map(x => ({ cadre: x.cadre, vue: x.vue, lib: x.lib, href: x.href, sortant: x.sortant, ok: x.ok, d: x.d, dit: x.dit, msg: x.msg, f: x.fichier && x.fichier[0] })), null, 1));
  await L.fin(c); await L.fermer(); const ko = L.bilan(); process.exit(ko ? 1 : 0);
})().catch(async e => { console.log('ERREUR SONDE', e); try { await L.fermer(); } catch (x) {} process.exit(2); });
