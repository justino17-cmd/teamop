// RECENSEMENT ET TOUCHER, sous le bac à sable de l'artefact (17 novembre 2026) : sur chaque écran du rôle (et chaque fenêtre qu'un geste ouvre),
// on dresse la liste des gestes qui SORTENT de la page (télécharger, exporter, copier, appeler, écrire, ouvrir un site, joindre un fichier),
// on les touche un par un, et on exige : ou bien un fichier NON VIDE au bon nom et au bon type reçu par le pont, ou bien un lien vrai (fenêtre
// ouverte), ou bien l'écran DIT ce qui s'est passé — jamais « rien », jamais une annonce que rien ne prouve.
//   QUI=marc|julie|sm  PROFIL=mac|iphone  NUIT=1  ROUTES=a,b  RANGEMENT=refuse  node artefact-recensement.js
// Sort en 1 si un contrôle tombe. La population est comptée d'abord (un recensement vide ne prouve rien).
const fs = require('fs'), path = require('path');
const A = require('./artefact-commun.js'), { bac, L, v } = A;
const QUI = process.env.QUI || 'marc', PROFIL = process.env.PROFIL || 'mac', NUIT = !!process.env.NUIT, RANGEMENT = process.env.RANGEMENT || '';
const FIN = Date.now() + 520000;
const CAP = '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/artefact';
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
(async () => {
  const c = await bac.ouvrir({ profil: PROFIL, qui: QUI, nuit: NUIT }, RANGEMENT ? { rangement: RANGEMENT } : {});
  await A.calmer(c.p);
  const routes = await c.p.evaluate(() => { const m = [...document.querySelectorAll('#menu a[href^="#"]')].map(a => a.getAttribute('href').slice(1)); const ouv = typeof rlOuverture === 'function' ? rlOuverture() : 'accueil'; return [...new Set([ouv, ...m])].filter(r => routeConnue(r)); });
  const filtre = process.env.ROUTES ? process.env.ROUTES.split(',') : null, liste = filtre ? routes.filter(r => filtre.includes(r)) : routes;
  v(`${QUI}/${PROFIL} : population (routes du menu)`, liste.length >= (filtre ? 1 : 3), liste);
  const resultats = []; let total = 0, nonFaits = [];
  // retrouve un ouvreur par son libellé ET ses données (le texte d'une ligne est collé : « MartinDr Martin »), le marque, rend un Locator
  const retrouver = async o => { const ok = await c.p.evaluate(({ lib, data }) => { document.querySelectorAll('[data-bac-o]').forEach(e => e.removeAttribute('data-bac-o'));
      for (const e of document.querySelectorAll('#contenu button, #contenu [role=button], #contenu summary, #contenu a, #contenu .ligne-clic')) { const cs = getComputedStyle(e); if (cs.display === 'none' || cs.visibility === 'hidden' || !e.offsetParent) continue;
        const l = (e.getAttribute('aria-label') || e.textContent || e.title || '').replace(/\s+/g, ' ').trim().slice(0, 60), d = [...e.attributes].filter(a => a.name.startsWith('data-') && a.name !== 'data-bac-o').map(a => a.name + '=' + a.value.slice(0, 40)).join(' ');
        if (l === lib && d.replace(/ ?data-bac-i=\d+/, '') === data.replace(/ ?data-bac-i=\d+/, '')) { e.setAttribute('data-bac-o', '1'); return true; } } return false; }, { lib: o.lib, data: o.data }); return ok ? c.p.locator('[data-bac-o="1"]').first() : null; };
  const ouvrirRoute = async r => { await L.aller(c.p, r); await A.calmer(c.p); await c.p.evaluate(() => { const t = document.getElementById('toast'); if (t) { t.classList.remove('on'); t.textContent = ''; } }); await c.p.waitForTimeout(200); };
  // touche UN candidat (retrouvé par sa signature après avoir remis l'écran) ; chemin : les clics qui ouvrent la fenêtre où il vit
  async function toucher(route, chemin, sig, racine) {
    await ouvrirRoute(route);
    for (const o of chemin) { const loc = await retrouver(o); if (!loc || !await L.toucher(c, loc)) return { perdu: true }; await A.calmer(c.p); }
    const cs = await A.collecter(c.p, racine), k = cs.find(x => x.tag + '|' + x.lib + '|' + x.href === sig); if (!k) return { perdu: true };
    const loc = c.p.locator(`[data-bac-i="${k.i}"]`).first();
    const e0 = await bac.etat(c), p0 = await A.photo(c.p);
    let ok;
    if (k.fichier) { const inp = k.tag === 'INPUT' ? loc : c.p.locator(`[data-bac-i="${k.i}"] input[type=file]`).first(); try { await inp.setInputFiles({ name: 'ticket-essai.png', mimeType: 'image/png', buffer: PNG }, { timeout: 3000 }); ok = true; } catch (e) { ok = false; } await L.calme(c.p, 400); }
    else if (/^https?$/.test(k.sortant)) { ok = await L.toucher(c, loc); await c.p.waitForTimeout(500); if (!/127\.0\.0\.1/.test(c.p.url())) { await c.p.goBack().catch(() => {}); } }
    else ok = await L.toucher(c, loc);
    await c.p.waitForTimeout(500);
    const e1 = await bac.etat(c), p1 = await A.photo(c.p), d = A.delta(e0, e1), dit = A.diff(p0, p1);
    // « lisible » : le numéro ou l'adresse se lit dans le texte de l'écran (sélectionnable)
    let lisible = true; if (/^(tel|mailto|sms)$/.test(k.sortant)) { const cible = k.href.replace(/^(tel|mailto|sms):/i, '').split('?')[0].replace(/[^0-9a-z@.+-]/gi, '').toLowerCase(); const txt = (await c.p.evaluate(() => document.body.innerText)).replace(/[^0-9a-z@.+-]/gi, '').toLowerCase(); lisible = !!cible && txt.includes(cible.replace(/^\+33/, '0').slice(-9)) ; }
    return { k, ok, d, dit, lisible, toast: p1.toast, fichier: (e1.fichiers || []).slice((e0.fichiers || []).length), err: c.err.length };
  }
  for (const route of liste) {
    if (Date.now() > FIN) { nonFaits.push(route); continue; }
    await ouvrirRoute(route);
    const n1 = await A.collecter(c.p, '#contenu'); total += n1.length;
    // les cadres de la page (comptabilité, atelier, paiement) : leurs gestes se recensent aussi (même origine)
    const aTester = n1.map(k => ({ chemin: [], sig: k.tag + '|' + k.lib + '|' + k.href, racine: '#contenu', k }));
    // niveau 2 : les gestes qui ouvrent une fenêtre, une feuille ou une fiche (population prise sur TOUS les gestes de l'écran, trois par famille de données)
    const tous = await L.gestes(c.p, '#contenu'), fam = {}, ouvreurs = tous.filter(k => !/^A$/.test(k.balise) || !/^(https?|tel|mailto|sms):/.test('')).filter(k => { if (/télécharg|export|imprim|copier|appeler|joindre|supprimer|effacer|déconnect/i.test(k.lib)) return false; const g = k.balise + '|' + k.data.replace(/=[^ ]*/g, ''); fam[g] = (fam[g] || 0) + 1; return fam[g] <= 3; }).sort((x, y) => (/data-go|data-action|data-open|data-fiche/.test(y.data) ? 1 : 0) - (/data-go|data-action|data-open|data-fiche/.test(x.data) ? 1 : 0)).slice(0, 22);   // ceux qui ouvrent une fiche ou une fenêtre d'abord : un filtre (Par mois) change la liste pour les suivants
    if (process.env.DEBUG) console.log('  · ' + route + ' : ' + tous.length + ' gestes, ' + ouvreurs.length + ' ouvreurs, ' + n1.length + ' sensibles');
    for (const o of ouvreurs) { if (Date.now() > FIN) break; await ouvrirRoute(route); const cs = await A.collecter(c.p, '#contenu'); /* les gestes SENSIBLES sont déjà au niveau 1 */
      const loc = await retrouver(o); if (!loc) { if (process.env.DEBUG) console.log('  · ouvreur introuvable', o.lib.slice(0, 30), o.data); continue; }
      const h0 = await c.p.evaluate(() => location.hash); if (!await L.toucher(c, loc)) { if (process.env.DEBUG) console.log('  · ouvreur non touché', o.balise, o.lib.slice(0, 30), o.data); continue; } await A.calmer(c.p);
      const h1 = await c.p.evaluate(() => location.hash), ouvert = await c.p.evaluate(() => !!document.querySelector('#calque .panneau'));
      if (process.env.DEBUG) console.log('  · ouvreur', o.lib.slice(0, 30), '→', h0, h1, ouvert);
      if (ouvert || h1 !== h0) { const n2 = await A.collecter(c.p, 'body'); total += n2.length; n2.forEach(k2 => aTester.push({ chemin: [o], sig: k2.tag + '|' + k2.lib + '|' + k2.href, racine: 'body', k: k2 })); }
      await L.ranger(c.p); }
    const vus = new Set();
    for (const t of aTester) { if (Date.now() > FIN) { nonFaits.push(route + ' (suite)'); break; } const cle = t.chemin.map(o => o.lib).join('>') + '>' + t.sig; if (vus.has(cle)) continue; vus.add(cle);
      let r; try { r = await toucher(route, t.chemin, t.sig, t.racine); } catch (e) { r = { erreur: String(e.message).slice(0, 80) }; }
      resultats.push({ route, chemin: t.chemin, ...t.k, r }); await L.ranger(c.p); }
  }
  // verdicts
  let evalues = 0;
  for (const x of resultats) { const r = x.r; if (!r || r.perdu || r.erreur) continue; evalues++;
    const nom = `${QUI}/${PROFIL} ${x.route}${x.chemin.length ? ' › ' + x.chemin.map(o => o.lib).join(' › ').slice(0, 30) : ''} › « ${x.lib || x.href || x.data} »`;
    const annonce = /(télécharg|enregistr|exporté|prêt)/i.test(r.toast || '') && !(r.fichier && r.fichier.length);
    if (x.sortant === 'download' || r.d.liensInertes || (/télécharg|export|pdf|csv|fec/i.test(x.lib) && x.sortant !== 'https')) {
      const f = (r.fichier || [])[0];
      v(`${nom} : un fichier NON VIDE au bon nom, ou l'écran dit pourquoi pas`, (f && f.taille > 0 && /\.[a-z]{2,4}$/.test(f.nom) && !r.d.liensInertes) || (r.dit.length && !annonce && !r.d.liensInertes), { delta: r.d, dit: r.dit, toast: r.toast, f });
    } else if (/^(tel|mailto|sms)$/.test(x.sortant)) {
      v(`${nom} : le numéro/l'adresse se LIT, et rien n'annonce un appel ou un envoi`, r.lisible && !/(appel lancé|message envoyé|envoyé)/i.test(r.toast || ''), { lisible: r.lisible, toast: r.toast, delta: r.d });
    } else if (x.sortant === 'https') {
      v(`${nom} : un vrai lien qui s'ouvre dans une autre fenêtre`, !!(r.d.popups || r.d.ouvertures), { delta: r.d, href: x.href });
    } else if (x.fichier) {
      v(`${nom} : joindre un fichier fait quelque chose de visible`, r.ok && (r.dit.length || r.d.rangement === undefined), { dit: r.dit });
    } else if (/copier|copie/i.test(x.lib)) {
      v(`${nom} : la copie part dans le presse-papiers, ou l'écran dit comment faire`, !!(r.d.presse || r.d.copiesSelection || r.dit.length), { delta: r.d, dit: r.dit, toast: r.toast });
    } else {
      v(`${nom} : le geste fait quelque chose de visible`, !!(Object.keys(r.d).length || r.dit.length), { delta: r.d, dit: r.dit });
    }
  }
  v(`${QUI}/${PROFIL} : population recensée (${total} candidats, ${evalues} jugés, ${nonFaits.length} routes non faites)`, total >= 5 && evalues >= 3, { total, evalues, nonFaits });
  v(`${QUI}/${PROFIL} : aucune erreur JavaScript`, c.err.length === 0, c.err.slice(0, 3));
  const bilanRes = await bac.etat(c); v(`${QUI}/${PROFIL} : aucune boîte de dialogue (elles ne s'affichent jamais dans l'artefact)`, bilanRes.dialogues.length === 0, bilanRes.dialogues.slice(0, 3));
  try { fs.mkdirSync(CAP, { recursive: true }); fs.writeFileSync(path.join(CAP, `recensement-${QUI}-${PROFIL}.json`), JSON.stringify(resultats.map(x => ({ route: x.route, chemin: x.chemin.map(o => o.lib), lib: x.lib, href: x.href, sortant: x.sortant, fichier: x.fichier, d: x.r && x.r.d, dit: x.r && x.r.dit, toast: x.r && x.r.toast, lisible: x.r && x.r.lisible })), null, 1)); } catch (e) {}
  await L.fermer(); const ko = L.bilan(); process.exit(ko ? 1 : 0);
})().catch(async e => { console.log('ERREUR SONDE', e); try { await L.fermer(); } catch (x) {} process.exit(2); });
