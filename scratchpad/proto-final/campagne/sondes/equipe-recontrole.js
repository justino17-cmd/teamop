// RECONTRÔLE ADVERSE de la partie « Équipe » + « Mon entreprise » (18 novembre 2026) : ce que les corrections ont pu CASSER à côté.
// Ce n'est PAS la sonde du testeur rejouée : d'autres personnes, d'autres ordres de gestes, d'autres valeurs (longues, accentuées).
// Quatre parcours de bout en bout (RC1 noms partout, RC2 droits → effet réel dans l'application ouverte comme la personne, RC3 Mon entreprise → facture,
// RC4 gestes à la volée : toast, places). Population comptée avant chaque conclusion. ⛔ 127.0.0.1 seulement, entreprise fictive.
// usage : node equipe-recontrole.js [mac|iphone|android|petit|ipad] [nuit]
const E = require('./equipe-outils.js'); const { L, v } = E;
const PROFIL = process.argv[2] || 'mac', NUIT = process.argv[3] === 'nuit', SUF = `${PROFIL}-${NUIT ? 'nuit' : 'jour'}`;
const jouer = async (nom, fn) => { try { await fn(); } catch (e) { v(`${nom} : le parcours va jusqu'au bout`, false, String(e.message).slice(0, 240)); } };
const txt = (p, z) => E.texte(p, z || '#contenu');
(async () => {
  const c = await E.marc(PROFIL, NUIT), p = c.p;

  // ── RC1 · UN renommage, et le nom suit PARTOUT (equipe-02 a élargi eqxSynchro : on cherche ce qu'il a pu casser — couleur, colonne, personne invitée, accent)
  await jouer('RC1', async () => {
    const av = await p.evaluate(() => ({ techs:TECHS.filter(t => t.id).map(t => [t.id, t.nom, t.c]), gens:Object.keys(H_GENS).length, tgens:T_GENS.length }));
    v('RC1 population : 4 techniciennes/techniciens au planning (TECHS) et au moins 6 « gens »', av.techs.length >= 4 && av.gens >= 6, av);
    for (const [k, pr, no] of [['sm', 'Sophie', 'Martin-Lefèvre'], ['julie', 'Julie', 'Petit-Moreau']]) {
      await E.fiche(c, k); await L.toucher(c, `[data-eqx="modifier|${k}"]`); await p.fill('#eqx-mp', pr); await p.fill('#eqx-mn', no); await L.toucher(c, `[data-eqx="modifok|${k}"]`); await L.calme(p, 500); await E.ranger(c);
    }
    const ap = await p.evaluate(() => ({ techs:TECHS.filter(t => t.id).map(t => [t.id, t.nom, t.c]), sm:H_NOM('sm'), julie:H_NOM('julie'), cSm:(H_GENS.sm || {}).c, tgens:T_GENS.slice() }));
    v('RC1 la couleur de Sophie au planning est INTACTE après renommage (eqxSynchro n\'a pas remis la palette)', av.techs.find(t => t[0] === 'sm')[2] === ap.techs.find(t => t[0] === 'sm')[2] && ap.cSm === ap.techs.find(t => t[0] === 'sm')[2], { avant:av.techs.find(t => t[0] === 'sm'), apres:ap.techs.find(t => t[0] === 'sm'), cSm:ap.cSm });
    v('RC1 les techniciennes gardent leur colonne, leur couleur et leur ordre', JSON.stringify(av.techs.map(t => [t[0], t[2]])) === JSON.stringify(ap.techs.map(t => [t[0], t[2]])), { av:av.techs.map(t => t[0]), ap:ap.techs.map(t => t[0]) });
    v('RC1 H_NOM suit les deux fiches', ap.sm === 'Sophie Martin-Lefèvre' && ap.julie === 'Julie Petit-Moreau', ap);
    v('RC1 T_GENS (les gens qu\'on peut désigner) ne perd ni ne double personne', ap.tgens.length === new Set(ap.tgens).size && ap.tgens.length >= av.tgens, { av:av.tgens, ap:ap.tgens });
    const ecrans = [['planning', /Martin-Lefèvre|Sophie/], ['pointage', /Petit-Moreau|Martin-Lefèvre/], ['interventions', /Martin-Lefèvre/], ['absences', /Martin-Lefèvre|Petit-Moreau/], ['historique', /./], ['taches', /./]];
    const vus = {};
    for (const [r] of ecrans) { await L.aller(p, r); await L.calme(p, 500); vus[r] = await txt(p); }
    for (const [r, re] of ecrans) { if (r === 'historique' || r === 'taches') continue; v(`RC1 « ${r} » écrit le NOUVEAU nom (population : ${vus[r].length} signes lus)`, vus[r].length > 200 && re.test(vus[r]), (vus[r].match(/(Sophie|Julie)[^,.;]{0,20}/g) || []).slice(0, 4)); }
    const vieux = Object.entries(vus).filter(([, t]) => /Sophie Martin(?!-)/.test(t) || /Julie Petit(?!-)/.test(t)).map(([r, t]) => r + ' : ' + (t.match(/(Sophie Martin(?!-)|Julie Petit(?!-))[^,.;]{0,12}/) || [''])[0]);
    const vieuxHors = vieux.filter(x => !/^historique/.test(x));   // le journal garde la ligne « Julie Petit → Julie Petit-Moreau » : c'est le changement lui-même, pas un oubli
    v('RC1 aucun écran (hors la ligne du changement dans l\'Historique) ne garde l\'ANCIEN nom', vieuxHors.length === 0, vieuxHors);
    for (const [pr, no, terrain] of [['Zoé', 'Ñiguez-Ôbert', false], ['Éloïse', 'Dupont-Longuenom', true]]) {
      await L.aller(p, 'equipe'); await L.toucher(c, '[data-eq="inviter"]'); await p.fill('#eq-p', pr); await p.fill('#eq-n', no); await p.fill('#eq-m', pr.toLowerCase().normalize('NFD').replace(/[^a-z]/g, '') + '@climservices17.fr');
      if (!terrain) await p.evaluate(() => { const s = document.getElementById('eq-terrain'); if (s && s.checked) s.click(); });
      await L.toucher(c, '[data-eq="inviterok"]'); await L.calme(p, 500); const t = await E.texte(p, '#calque') + ' ' + await E.toast(p); await E.ranger(c);
      const q = await p.evaluate(({ pr }) => { const e = EQUIPE.find(x => x.prenom === pr); return e ? { k:e.k, hnom:H_NOM(e.k), tech:!!TECHS.find(t => t.id === e.k), tg:T_GENS.includes(e.k) } : null; }, { pr });
      v(`RC1 « ${pr} » existe, son nom s'écrit en entier partout (H_NOM), colonne au planning seulement si terrain`, q && q.hnom === `${pr} ${no}` && q.tech === terrain, { q, t:t.slice(0, 100) });
    }
    const aff = await p.evaluate(() => [...document.querySelectorAll('#contenu *')].filter(e => e.children.length === 0 && /undefined|NaN|\[object/.test(e.textContent)).map(e => e.textContent.trim().slice(0, 40)));
    v('RC1 aucun « undefined », « NaN » ou « [object » à l\'écran après ces ajouts', aff.length === 0, aff);
    await L.aller(p, 'planning'); await L.calme(p, 700); await L.capture(c, E.CAP + `rc-planning-renommes-${SUF}.png`);
  });

  // ── RC2 · les droits ont un EFFET, et la décision du 17/11 (« Voir » seule) ne donne pas trop
  await jouer('RC2', async () => {
    const T = await p.evaluate(() => { const R = {}; for (const k of EQUIPE.map(x => x.k)) { const q = eqDe(k); if (!q || !q.droits) continue; R[k] = ['pointage', 'vehicules', 'boxes', 'stock', 'comptabilite', 'equipe', 'entreprise', 'securite', 'clients', 'majournee'].filter(r => droitVoit(r, q)); } return R; });
    v('RC2 population : les personnes de l\'entreprise ont chacune des routes', Object.keys(T).length >= 6 && T.marc.length >= 9, T);
    v('RC2 un technicien (forme terrain) ne voit PAS « Temps de travail » ni « Véhicules » de toute l\'équipe', ['sm', 'kb', 'lr', 'tl'].every(k => !T[k].includes('pointage') && !T[k].includes('vehicules')), { sm:T.sm, kb:T.kb });
    v('RC2 un technicien ne voit pas « Équipe », « Mon entreprise », « Sécurité »', ['sm', 'kb', 'lr', 'tl'].every(k => !T[k].some(r => ['equipe', 'entreprise', 'securite'].includes(r))), { sm:T.sm });
    v('RC2 Julie (Secrétariat) : Temps de travail et Dépôts et camions s\'ouvrent (décision 17/11, à soumettre à Justin), Équipe/Mon entreprise/Sécurité non', T.julie.includes('pointage') && T.julie.includes('boxes') && !T.julie.some(r => ['equipe', 'entreprise', 'securite'].includes(r)), T.julie);
    const rev = await p.evaluate(() => { const q = eqDe('lr'), av = q.terrain; q.terrain = false; const r = ['pointage', 'vehicules', 'boxes'].filter(x => droitVoit(x, q)); q.terrain = av; return { terrain:eqxTerrain(q), r }; });
    v('RC2 (constat à dire) Léa Roux (profil Technicien) rendue « bureau » par la case terrain voit : ' + JSON.stringify(rev.r), true, rev);
    const menu = () => p.evaluate(() => rlLignes().map(x => x.k));
    const caseClients = async () => { await p.evaluate(() => { document.querySelectorAll('#calque details').forEach(d => { if (d.querySelector('[data-eqd="julie|crm|v"]')) d.open = true; }); const i = [...document.querySelectorAll('#calque [data-eqd="julie|crm|v"]')].find(e => e.offsetParent !== null); if (i) i.scrollIntoView({ block:'center' }); }); await L.calme(p, 250);   // la forme en listes (téléphone) range les cases dans des <details> repliés : on ouvre celui de la catégorie puis on touche la case VISIBLE
      const i = p.locator('#calque [data-eqd="julie|crm|v"]:visible').first(); if (await i.count()) await i.click(); await L.calme(p, 400); };
    await E.fiche(c, 'julie'); await L.toucher(c, '[data-cnx="comme|julie"]'); await L.calme(p, 900);
    const m1 = await menu(); const bande = await p.evaluate(() => !!document.querySelector('.sec-bande'));
    v('RC2 ouverte comme Julie : la bande « tu es Julie » est là et le menu a Clients, Temps de travail', bande && m1.includes('clients') && m1.includes('pointage'), m1);
    await L.aller(p, 'pointage'); await L.calme(p, 700); const tp = await txt(p);
    v('RC2 Julie ouvre Temps de travail : elle voit les heures d\'au moins deux personnes (population)', (tp.match(/Martin|Leblanc|Benali|Roux|Leroy/g) || []).length >= 2, tp.slice(0, 160));
    await L.capture(c, E.CAP + `rc-julie-temps-${SUF}.png`);
    await p.evaluate(() => secuRevenir()); await L.calme(p, 700);
    await E.fiche(c, 'julie'); await p.evaluate(() => { const d = document.querySelector('#calque details.eqx-det'); if (d) d.open = true; });
    const avant = await p.evaluate(() => eqDe('julie').droits.cats.crm.v);
    const trouve = await p.evaluate(() => !!document.querySelector('#calque [data-eqd="julie|crm|v"]'));
    v('RC2 population : la case « Clients › Voir » de Julie existe dans sa fiche', trouve && avant === 1, { trouve, avant });
    if (trouve) {
      await caseClients();
      const ap = await p.evaluate(() => ({ crmV:eqDe('julie').droits.cats.crm.v, crmM:eqDe('julie').droits.cats.crm.m, profil:eqDe('julie').droits.profil, toast:(document.getElementById('toast') || {}).textContent || '' }));
      v('RC2 décocher « Clients › Voir » retire aussi Créer/Modifier de Clients (pas de droit sans voir)', ap.crmV === 0 && ap.crmM === 0, ap);
      await E.ranger(c); await E.fiche(c, 'julie'); await L.toucher(c, '[data-cnx="comme|julie"]'); await L.calme(p, 900);
      const m2 = await menu(); v('RC2 ouverte de nouveau comme Julie : plus de Clients dans son menu, le reste est intact', !m2.includes('clients') && m2.includes('pointage') && m2.length >= m1.length - 2, { avant:m1, apres:m2 });
      await p.evaluate(() => { location.hash = '#clients'; }); await L.calme(p, 600); const h = await p.evaluate(() => ({ hash:location.hash, route:typeof route !== 'undefined' ? route : '' }));
      v('RC2 taper #clients à la main : refusé, on ne reste pas sur Clients', h.route !== 'clients', h);
      await p.evaluate(() => secuRevenir()); await L.calme(p, 700);
      await E.fiche(c, 'julie'); await caseClients(); await E.ranger(c);
    }
    await p.evaluate(() => { const o = eqDe('julie'); o.droits.cats.admin = { v:1, c:1, m:1, s:0 }; o.droits.profil = 'resp*'; });
    await E.fiche(c, 'julie'); await L.toucher(c, '[data-cnx="comme|julie"]'); await L.calme(p, 900);
    await L.aller(p, 'equipe'); await E.fiche(c, 'tl'); const g = await L.gestes(p, '#calque'); const lib = g.map(x => (x.data || '') + ' ' + x.lib);
    v('RC2 Julie (Équipe : voir+créer+modifier, sans supprimer) ouvre la fiche de Tom : « Modifier la fiche » oui, « Désactiver » non, population ≥ 4', lib.some(l => /eqx=modifier/.test(l)) && !lib.some(l => /desact|actif\|/.test(l)) && g.length >= 4, lib.slice(0, 12));
    await E.ranger(c); await p.evaluate(() => secuRevenir()); await L.calme(p, 700);
    await p.evaluate(() => { const o = eqDe('julie'); o.droits.cats.admin = { v:0, c:0, m:0, s:0 }; o.droits.profil = 'secr'; });
  });

  // ── RC3 · Mon entreprise : le SIRET manquant se dit, la facture se débloque, et rien d'autre ne s'en trouve cassé
  await jouer('RC3', async () => {
    await L.aller(p, 'entreprise'); await L.calme(p, 500); const t0 = await txt(p);
    v('RC3 population : Mon entreprise montre au moins cinq cartes', (await p.evaluate(() => document.querySelectorAll('[data-ent^="carte|"]').length)) >= 5, t0.slice(0, 100));
    await L.toucher(c, '[data-ent="carte|legal"]'); await L.calme(p, 500);
    const sir = await p.evaluate(() => (document.getElementById('fl-siret') || {}).value || '');
    v('RC3 la carte « Tes mentions légales » a un SIRET lisible (population)', sir.replace(/\s/g, '').length === 14, sir);
    for (const [val, nom] of [['', 'vide'], ['12 34', 'trop court'], ['１２３４５６７８９０１２３４', 'chiffres pleine chasse']]) {
      await p.fill('#fl-siret', val); await L.toucher(c, '[data-cx="ficheok"]'); await L.calme(p, 300);
      const e = await p.evaluate(() => { const x = document.getElementById('fl-siret-err'); const s = document.getElementById('fl-siret'); return { msg:x && !x.hidden ? x.textContent.trim() : '', inv:s ? s.getAttribute('aria-invalid') : null, ouvert:!!s }; }); const tt = await E.toast(p);
      v(`RC3 SIRET ${nom} : la carte reste ouverte, le message est SOUS le champ et le champ est marqué`, e.ouvert && e.inv === 'true' && (e.msg.length > 5 || tt.length > 5), { e, tt });
    }
    await p.fill('#fl-siret', sir); await L.toucher(c, '[data-cx="ficheok"]'); await L.calme(p, 500); await E.ranger(c);
    await p.evaluate(() => { ENTREPRISE.siret = ''; });
    await L.aller(p, 'entreprise'); await L.calme(p, 500); const t1 = await txt(p);
    v('RC3 SIRET vide : la page le dit (« Il manque ton SIRET ») et que la facture ne part pas', /SIRET/.test(t1) && /ne peut pas partir/.test(t1), t1.slice(0, 160));
    await L.aller(p, 'comptabilite'); await p.evaluate(() => { try { cxAller('factures'); } catch (e) {} }); await L.calme(p, 700);
    const f = await p.evaluate(() => { let x = FACTURES.find(q => q.st === 'avalider' && lignesDe(q).every(l => l.pu != null)); if (!x) { x = JSON.parse(JSON.stringify(FACTURES[0])); x.id = 'f-rc'; x.st = 'avalider'; x.num = '—'; x.vue = false; FACTURES.push(x); } return x.id; });
    v('RC3 population : une facture « à valider » existe dans la démonstration', !!f, f);
    if (f) {
      await p.evaluate(id => ACTIONS.apercuEnvoi({ dataset:{ id } }), f); await L.calme(p, 600);
      const ap = await p.evaluate(() => { const P = document.querySelector('#calque .panneau'); return P ? { envoyer:!!P.querySelector('[data-action="envoyer"]'), comp:!!P.querySelector('[data-ent="completer"]'), txt:P.textContent.replace(/\s+/g, ' ').slice(0, 220) } : null; });
      v('RC3 facture sans SIRET : « Envoyer » n\'est pas offert, « Compléter » l\'est', ap && !ap.envoyer && ap.comp, ap);
      const dir = await p.evaluate(id => { try { const av = FACTURES.find(q => q.id === id).st; ACTIONS.envoyer({ dataset:{ id } }); const ap = FACTURES.find(q => q.id === id).st; return { av, ap }; } catch (e) { return { err:String(e.message).slice(0, 80) }; } }, f);
      v('RC3 appeler l\'action « envoyer » à la main sans SIRET ne l\'envoie pas', dir.err || dir.av === dir.ap, dir);
      await E.ranger(c);
    }
    await L.aller(p, 'entreprise'); await L.toucher(c, '[data-ent="carte|legal"]'); await L.calme(p, 400); await p.fill('#fl-siret', '732 829 320 00074'); await L.toucher(c, '[data-cx="ficheok"]'); await L.calme(p, 500); await E.ranger(c);
    await L.aller(p, 'entreprise'); const t2 = await txt(p);
    v('RC3 SIRET rempli : plus de « Il manque ton SIRET » sur la page', !/Il manque ton SIRET/.test(t2), t2.slice(0, 140));
    await L.capture(c, E.CAP + `rc-entreprise-${SUF}.png`);
  });

  // ── RC4 · à la volée : désactiver puis « Annuler » du toast, places pleines
  await jouer('RC4', async () => {
    await L.aller(p, 'equipe');
    await E.fiche(c, 'tl'); const bd = await p.evaluate(() => !!document.querySelector('#calque [data-eq="desact|tl"]'));
    v('RC4 population : la fiche de Tom propose « Désactiver le compte »', bd, null);
    await L.toucher(c, '#calque [data-eq="desact|tl"]'); await L.calme(p, 500);
    const o = await p.evaluate(() => ({ pan:!!document.querySelector('#calque .panneau'), btns:[...document.querySelectorAll('#calque .panneau button')].map(b => b.textContent.trim()).slice(0, 8) }));
    if (o.pan && o.btns.some(b => /Désactiver/.test(b))) { await L.toucher(c, '#calque [data-eqx^="desactok|tl"], #calque .btn.rouge'); await L.calme(p, 500); }
    const t = await E.toast(p), off = await p.evaluate(() => !eqDe('tl').actif);
    v('RC4 Tom est désactivé et le toast propose « Annuler »', off && /Annuler/.test(await p.evaluate(() => (document.getElementById('toast') || {}).textContent || '')), { t, o });
    if (c.doigt) { const bt = await p.evaluate(() => { const b = document.querySelector('#toast button'); if (!b) return null; const r = b.getBoundingClientRect(); const T = document.getElementById('toast').getBoundingClientRect(); const bar = document.querySelector('.rf-tabs, #tabbar, .tabbar, nav.bas'); const rb = bar ? bar.getBoundingClientRect() : null; return { w:r.width, h:r.height, bas:T.bottom, haut:T.top, barre:rb ? rb.top : null, gauche:T.left, droite:T.right, larg:innerWidth }; });
      v(`RC4 toast : le bouton « Annuler » fait ≥ 44 × 44, le toast tient dans l'écran et ne chevauche pas la barre du bas (${SUF})`, bt && bt.w >= 43.5 && bt.h >= 43.5 && bt.gauche >= 0 && bt.droite <= bt.larg + 1 && (bt.barre === null || bt.bas <= bt.barre + 1), bt);
      await L.capture(c, E.CAP + `rc-toast-annuler-${SUF}.png`); }
    await L.toucher(c, '#toast button'); await L.calme(p, 500);
    v('RC4 « Annuler » du toast : Tom est actif de nouveau', await p.evaluate(() => eqDe('tl').actif), await E.toast(p));
    await E.ranger(c);
    const places = await p.evaluate(() => ({ n:EQUIPE.filter(x => x.actif).length, max:EQ_PLACES }));
    for (let i = 0; i < places.max - places.n; i++) await p.evaluate(i => { EQUIPE.push({ k:'x' + i, terrain:true, prenom:'Essai' + i, nom:'Plein', role:'Technicien', mail:`e${i}@x.fr`, tel:'', actif:true, droits:copieProfil('tech'), habil:[] }); }, i);
    await L.aller(p, 'equipe'); await L.toucher(c, '[data-eq="inviter"]'); await L.calme(p, 400);
    const pl = await E.texte(p, '#calque') + ' ' + await E.toast(p);
    v('RC4 places pleines : inviter dit que les places sont prises et propose quoi faire', /place/i.test(pl) && /(libér|abonnement|désactiv|augment)/i.test(pl), pl.slice(0, 220));
    await E.ranger(c);
    await p.evaluate(() => { for (let i = EQUIPE.length - 1; i >= 0; i--) if (/^x\d/.test(EQUIPE[i].k)) EQUIPE.splice(i, 1); });
  });
  const dd = await L.deborde(c); v(`la page ne glisse pas de côté en fin de parcours (${SUF})`, dd.bouge === 0, dd);
  v('aucune erreur de page', c.err.length === 0, c.err.slice(0, 4));
  await E.fin();
})().catch(e => { console.error('ÉCHEC DE LA SONDE', e); process.exit(2); });
