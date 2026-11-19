// ÉQUIPE et MON ENTREPRISE vues par les AUTRES : ce que chaque personne voit de ces deux écrans, et ce qu'elle essaie de taper à la main.
// Marc (gérant) : tout. Julie (Secrétariat) : ni l'un ni l'autre. Responsable : les deux en LECTURE. Sophie et Karim (terrain) : aucun.
// Un geste d'écriture n'est jamais dessiné pour qui ne l'a pas ; une adresse tapée à la main est refusée EN DISANT pourquoi. ⛔ 127.0.0.1 seulement.
// usage : node equipe-roles.js [mac|iphone|…]
const E = require('./equipe-outils.js'); const { L, v } = E;
const PROFIL = process.argv[2] || 'mac';
const ECRITURE = [/data-eq=inviter$/, /data-eqx=modifier/, /data-eq=mdp/, /data-eq=actif/, /data-eq=desact/, /data-eq=habajout/, /data-eq=renouv/, /data-eqx=regles/, /data-cnx=repose/, /data-cnx=comme/, /data-sec2=telephone/, /data-sec2=deconnecter/];
(async () => {
  // ── les personnes de la démonstration qui n'ont NI Équipe NI Mon entreprise
  for (const qui of ['julie', 'sm', 'kb']) {
    const c = await L.ouvrir({ profil:PROFIL, qui }); const p = c.p; const nom = { julie:'Julie (Secrétariat)', sm:'Sophie (technicienne)', kb:'Karim (chef d’équipe)' }[qui];
    const m = await p.evaluate(() => ({ lignes:rlLignes().map(x => x.k), barre:rlOnglets().map(o => o.k) }));
    v(`${nom} : population : son menu a des lignes`, m.lignes.length >= 5, m.lignes);
    v(`${nom} : ni « Équipe » ni « Mon entreprise » au menu, ni dans la barre`, !m.lignes.includes('equipe') && !m.lignes.includes('entreprise') && !m.barre.includes('equipe') && !m.barre.includes('entreprise'), m);
    for (const r of ['equipe', 'entreprise']) {
      await p.evaluate(r => { location.hash = '#' + r; }, r); await L.calme(p, 800); const o = await E.obs(p); const t = await E.texte(p, '#contenu');
      v(`${nom} : tape #${r} : l’écran ne s’ouvre pas (${o.hash || '—'} « ${o.h1} »)`, o.h1 !== 'Équipe' && o.h1 !== 'Mon entreprise' && !/Inviter une personne|Ton entreprise/.test(t), { hash:o.hash, h1:o.h1 });
      v(`${nom} : tape #${r} : une phrase DIT pourquoi (toast ou écran), pas un silence`, !!(o.toast || /n’existe pas|pas ouvert|pas accès|réservé/i.test(t)), { toast:o.toast, debut:t.slice(0, 100) }); }
    // la porte de fonction : même si on appelle l'écran à la main, aucune donnée d'équipe ne sort
    const fuite = await p.evaluate(() => { try { const h = vueEquipe(); return /@climservices17\.fr/.test(h) ? 'les e-mails de l’équipe sont rendus' : ''; } catch (e) { return ''; } });
    v(`${nom} : l’écran Équipe appelé à la main ne rend pas les e-mails de l’équipe (porte de fonction)`, !fuite, fuite);
    v(`${nom} : aucune erreur de page`, c.err.length === 0, c.err.slice(0, 3)); await L.fin(c);
  }
  // ── Responsable : les deux écrans en LECTURE
  const c = await E.marc(PROFIL); const p = c.p;
  await E.fiche(c, 'julie'); await p.selectOption('#calque select[data-eqprof="julie"]', 'resp'); await L.calme(p, 500); await L.toucher(c, '#calque [data-eqx^="profok|julie|resp"]'); await L.calme(p, 500);
  await E.fiche(c, 'julie'); await L.toucher(c, '[data-cnx="comme|julie"]'); await L.calme(p, 900);
  const q = await p.evaluate(() => ({ qui:acteur(), lignes:rlLignes().map(x => x.k) })); v('Responsable : population : on est Julie, profil Responsable, avec Équipe et Mon entreprise au menu', q.qui === 'julie' && q.lignes.includes('equipe') && q.lignes.includes('entreprise'), q);
  await L.aller(p, 'equipe'); const g = await L.gestes(p); const t = await E.texte(p, '#contenu');
  v('Responsable : population : l’Équipe montre au moins 6 personnes', (await E.cartes(p)) >= 6, await E.cartes(p));
  v('Responsable : Équipe : AUCUN bouton d’écriture (« Inviter une personne »)', !g.some(x => /data-eq=inviter$/.test(x.data)), g.filter(x => /inviter/.test(x.data)).map(x => x.lib));
  v('Responsable : Équipe : une phrase dit qu’il LIT seulement et à qui demander', /lecture|ne peut pas|Demande à|modifie/i.test(t), t.slice(0, 200));
  await L.toucher(c, '[data-eq="fiche|sm"]'); await L.calme(p, 400); const gf = await L.gestes(p, '#calque'); const tf = await E.texte(p, '#calque');
  const ecr = gf.filter(x => ECRITURE.some(r => r.test(x.data)));
  v('Responsable : fiche d’une technicienne : aucun geste d’écriture (modifier, mot de passe, désactiver, habilitation, comme…)', ecr.length === 0, ecr.map(x => x.lib + ' ' + x.data));
  const cases = await p.evaluate(() => [...document.querySelectorAll('#calque input[data-eqd], #calque input[data-eqs], #calque input[data-eqt]')].filter(i => !i.disabled).length);
  v('Responsable-02 fiche : les cases de droits ne sont pas offertes comme actives à qui ne peut pas les régler (désactivées ou non dessinées)', cases === 0, { casesActives:cases });
  if (cases > 0) { const pr = await p.evaluate(() => { const i = document.querySelector('#calque input[data-eqd]:not(:disabled)'); if (!i) return null; const av = i.checked, cle = i.dataset.eqd; const [k, cat, x] = cle.split('|'); const d0 = eqDe(k).droits.cats[cat][x]; i.click(); return { cle, avant:d0 }; });
    await L.calme(p, 400); const ap = pr && await p.evaluate(({ cle }) => { const [k, cat, x] = cle.split('|'); const i = document.querySelector(`#calque input[data-eqd="${cle}"]`); return { donnee:eqDe(k).droits.cats[cat][x], coche:i ? i.checked : null, toast:(document.getElementById('toast') || {}).textContent || '' }; }, pr);
    v('Responsable-03 toucher une case de droit : la donnée ne change pas, la case revient comme avant, et un message dit à qui demander', pr && ap && ap.donnee === pr.avant && ap.coche === !!pr.avant && /Demande à Marc/.test(ap.toast), { pr, ap }); }
  v('Responsable : fiche : « Ouvrir l’application comme » n’est pas proposé (case Sécurité absente)', !gf.some(x => /data-cnx=comme/.test(x.data)), gf.map(x => x.data).filter(d => /cnx/.test(d)));
  await E.ranger(c); await L.aller(p, 'entreprise'); const ge = await L.gestes(p);
  v('Responsable : Mon entreprise : ni « Compléter » ni bouton d’écriture, mais les cartes se lisent', !ge.some(x => /Compléter/.test(x.lib)) && ge.some(x => /data-ent=carte/.test(x.data)), ge.map(x => x.lib).slice(0, 4));
  // modifier par un chemin détourné : l'enregistrement est refusé (porte de fonction)
  const refus = await p.evaluate(() => { const av = ENTREPRISE.nom; try { document.body.insertAdjacentHTML('beforeend', '<button id="zz" data-ent="identok"></button>'); const e = document.getElementById('en-nom'); document.getElementById('zz').click(); document.getElementById('zz').remove(); } catch (x) {} return { nom:ENTREPRISE.nom === av, toast:(document.getElementById('toast') || {}).textContent || '' }; });
  v('Responsable : forcer « Enregistrer » à la main ne change rien et le dit', refus.nom && /pas ouvert à ton compte/.test(refus.toast), refus);
  await p.evaluate(() => secuRevenir()); await L.calme(p, 500);
  await E.fiche(c, 'julie'); await p.selectOption('#calque select[data-eqprof="julie"]', 'secr'); await L.calme(p, 500); await L.toucher(c, '#calque [data-eqx^="profok|julie|secr"]'); await L.calme(p, 400);
  v('aucune erreur de page', c.err.length === 0, c.err.slice(0, 3));
  await L.fin(c); await E.fin();
})().catch(e => { console.error('ÉCHEC DE LA SONDE', e); process.exit(2); });
