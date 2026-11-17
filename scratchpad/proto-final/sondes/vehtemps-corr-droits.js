// Correcteur du lot « vehtemps » — les DROITS (gerant-01, gerant-02, salarie-08, salarie-10).
//  · gerant-01 : « Ses heures › » (fiche Équipe) ouvre un salaire : fermé au bureau (julie), ni bouton ni panneau, même en forçant le geste.
//  · gerant-02 : la case « Corriger les pointages » garde CHAQUE écriture d'heure du nouvel écran (terminer, accepter, correction, ajout) — boutons forgés compris.
//  · salarie-08 : « Voir » sa fiche de paie (Mes heures › Mes fiches de paie) ouvre un document pour le salarié lui-même, jamais celle d'un autre.
//  · salarie-10 : Je commence / Je termine ne s'écrivent plus dans un mois fermé.
// Chaque contrôle prouve sa population. 127.0.0.1 seulement.
const L = require('../lib.js'), v = L.v;
const ev = (c, f, a) => c.p.evaluate(f, a);
const PROFILS = (process.env.PROFILS || 'mac,iphone').split(',');
const net = t => String(t).replace(/[  ]/g, ' ');
(async () => {
  for (const profil of PROFILS) {
    const nom = profil;
    /* ── gerant-01 : julie (Secrétariat) ne voit pas « Ses heures › » et ne l'obtient pas en forçant le geste ── */
    { const c = await L.ouvrir({ profil, qui:'julie', calme:true }); await L.aller(c.p, 'equipe');
      const n = await ev(c, () => [...document.querySelectorAll('#contenu [data-eq="fiche"], #contenu [data-eq^="fiche|"]')].length);
      await ev(c, () => eqFiche('sm')); await L.calme(c.p, 400);
      const bouton = await ev(c, () => document.querySelectorAll('#calque [data-eq^="heures|"]').length);
      const textes = await ev(c, () => (document.querySelector('#calque') || {}).textContent || '');
      v(nom + ' · julie : la fiche de Sophie s\'ouvre (population)', /Sophie/.test(net(textes)) && n >= 0, { n, long:textes.length });
      v(nom + ' · julie : aucun bouton « Ses heures › » sur la fiche (Temps de travail lui est fermé)', bouton === 0 && !/Ses heures/.test(net(textes)), { bouton });
      await ev(c, () => { const b = document.createElement('button'); b.setAttribute('data-eq', 'heures|sm'); b.id = 'forge-h'; b.textContent = 'x'; document.getElementById('calque').appendChild(b); });
      await c.p.evaluate(() => document.getElementById('forge-h').click()); await L.calme(c.p, 700);
      const panneau = await ev(c, () => (document.querySelector('#calque') || {}).textContent || '');
      v(nom + ' · julie : le geste forgé « heures » n\'ouvre ni le panneau salaire ni Temps de travail', !/170h46|Ses semaines/.test(net(panneau)) && (await ev(c, () => location.hash)) !== '#pointage', { hash:await ev(c, () => location.hash), debut:net(panneau).slice(0, 80) });
      const direct = await ev(c, () => { try { fermerPanneau(); ttMoisPers('sm'); } catch (e) { return 'ERR ' + e.message; } return (document.querySelector('#calque') || {}).textContent || ''; });
      v(nom + ' · julie : ttMoisPers appelée directement ne lit rien (garde en première instruction)', !/170h46|Ses semaines/.test(net(direct)), net(direct).slice(0, 80));
      await L.fin(c); }
    /* le gérant, lui, l'a toujours (contre-épreuve : on n'a pas supprimé le geste) */
    { const c = await L.ouvrir({ profil, qui:'marc', calme:true }); await L.aller(c.p, 'equipe'); await ev(c, () => eqFiche('sm')); await L.calme(c.p, 400);
      const n = await ev(c, () => document.querySelectorAll('#calque [data-eq^="heures|"]').length); v(nom + ' · marc : « Ses heures › » est là (contre-épreuve)', n === 1, { n });
      await L.toucher(c, '#calque [data-eq^="heures|"]'); await L.calme(c.p, 900);
      const t = await ev(c, () => (document.querySelector('#calque') || {}).textContent || ''); v(nom + ' · marc : le toucher ouvre le mois de Sophie', /travaillées/.test(net(t)) && /Sophie/.test(net(t)), net(t).slice(0, 90));
      await L.fin(c); }
    /* ── gerant-02 : un compte qui voit Temps de travail SANS « Corriger les pointages » ── */
    { const c = await L.ouvrir({ profil, qui:'julie', calme:true });
      const pose = await ev(c, () => { const p = eqDe('julie'); p.droits.cats.temps = { v:1, c:1, m:1, s:1 }; p.droits.sp.corrpt = 0; droitsMaj(); return { temps:droitCase(p, 'temps.m'), corr:droitSp(p, 'corrpt'), voit:droitVoit('pointage') }; });
      v(nom + ' · le compte d\'essai voit Temps de travail, sans « Corriger les pointages » (population)', pose.temps && !pose.corr && pose.voit, pose);
      await L.aller(c.p, 'pointage');
      const vus = await ev(c, () => ['terminer', 'accepter', 'ajout', 'fin'].map(a => [a, [...document.querySelectorAll('[data-tt="' + a + '"], [data-tt^="' + a + '|"]')].filter(e => e.offsetParent).length]));
      v(nom + ' · les boutons qui écrivent une heure ne sont pas dessinés', vus.every(([, n]) => n === 0), vus);
      const avant = await ev(c, () => ({ pt:JSON.stringify(POINTAGES).length, tr:PT_TRACE.length, nt:typeof NOTIFS !== 'undefined' ? NOTIFS.length : -1 }));
      const ouv = await ev(c, () => POINTAGES.find(p => p.qui === 'tl' && !p.fin));
      for (const [lib, js] of [['terminer', () => ttTerminer(window.__o.id, '16:47', 0, 'x')], ['accepter', () => ptxCorriger('tl')], ['ajout', () => { ttAjouterOk(); }], ['correction', () => ttJourEnregistrer('tl', '2026-10-30')]]) {
        await ev(c, o => { window.__o = o; }, ouv); await ev(c, js); }
      const apres = await ev(c, () => ({ pt:JSON.stringify(POINTAGES).length, tr:PT_TRACE.length, nt:typeof NOTIFS !== 'undefined' ? NOTIFS.length : -1 }));
      v(nom + ' · quatre fonctions appelées directement n\'écrivent rien (pointages, trace, notifications inchangés)', ouv && JSON.stringify(avant) === JSON.stringify(apres), { avant, apres, ouv:!!ouv });
      for (const [a, val] of [['terminer', 'terminer|' + (ouv && ouv.id) + '|16:47'], ['accepter', 'accepter|tl'], ['ajoutok', 'ajoutok'], ['jourok', 'jourok|tl|2026-10-30']]) {
        await ev(c, x => { const b = document.createElement('button'); b.setAttribute('data-tt', x); b.className = 'forge'; document.body.appendChild(b); b.click(); b.remove(); }, val); }
      const apres2 = await ev(c, () => ({ pt:JSON.stringify(POINTAGES).length, tr:PT_TRACE.length, nt:typeof NOTIFS !== 'undefined' ? NOTIFS.length : -1 }));
      v(nom + ' · quatre boutons forgés (data-tt) sont avalés par la garde : rien n\'est écrit', JSON.stringify(avant) === JSON.stringify(apres2), { avant, apres2 });
      /* contre-épreuve : avec la case, le même geste écrit */
      await ev(c, () => { eqDe('julie').droits.sp.corrpt = 1; droitsMaj(); });
      await ev(c, o => { ttTerminer(o.id, '16:47', 30, 'essai'); }, ouv);
      const fin = await ev(c, id => (POINTAGES.find(p => p.id === id) || {}).fin, ouv && ouv.id);
      v(nom + ' · avec la case « Corriger les pointages », la même fonction écrit (contre-épreuve)', fin === '16:47', { fin });
      await L.fin(c); }
    /* ── salarie-08 : « Voir » ma fiche de paie ── */
    for (const qui of ['sm', 'kb', 'tl']) {
      const c = await L.ouvrir({ profil, qui, calme:true }); await L.aller(c.p, 'mesheures');
      await ev(c, () => { TT.mh = 'fiches'; rendre(); }); await L.calme(c.p, 400);
      const n = await ev(c, q => [...document.querySelectorAll('#contenu [data-paie^="bulletin|' + q + '|"]')].filter(e => e.offsetParent).length, qui);
      let ouvert = false, texte = '';
      if (n) { await L.toucher(c, '#contenu [data-paie^="bulletin|' + qui + '|"]'); await L.calme(c.p, 900);
        texte = await ev(c, () => (document.getElementById('docplein') || {}).textContent || ''); ouvert = await ev(c, () => !!document.getElementById('docplein')); }
      const refus = await ev(c, () => DROITS_REFUS.length);
      v(nom + ' · ' + qui + ' : des lignes « Voir » existent (population)', n >= 2, { n });
      v(nom + ' · ' + qui + ' : « Voir » ouvre sa fiche de paie, sans refus de la garde des droits', ouvert && refus === 0, { ouvert, refus, texte:net(texte).slice(0, 80) });
      await L.fin(c); }
    /* ── salarie-10 : un mois fermé n'accepte plus Je commence / Je termine ── */
    { const c = await L.ouvrir({ profil, qui:'sm', calme:true });
      const r = await ev(c, () => { PAIE.verrou = { le:'31/10 · 09:00', par:'marc', emp:'x' };
        const libre = !ptJour('sm', AUJ).length; const n0 = POINTAGES.length; let e1 = null; try { ptxCommencer('sm', '08:00'); } catch (e) { e1 = e.message; }
        const commence = POINTAGES.length !== n0;
        POINTAGES.push({ id:'pessai-sm', qui:'sm', date:AUJ, debut:'06:00', fin:null, pause:0, origine:'salarié' });
        const f = document.createElement('input'); f.id = 'ptx-f'; f.value = '07:00'; const q = document.createElement('input'); q.id = 'ptx-p'; q.value = '0'; document.body.append(f, q);
        let e2 = null; try { ptxTerminer('sm'); } catch (e) { e2 = e.message; }
        const fini = POINTAGES.find(p => p.id === 'pessai-sm').fin; f.remove(); q.remove(); POINTAGES.splice(POINTAGES.findIndex(p => p.id === 'pessai-sm'), 1);
        return { verrou:paieMoisVerrou(AUJ), libre, commence, fini, e1, e2 }; });
      v(nom + ' · mois fermé : Je commence et Je termine n\'écrivent rien', r.verrou === true && r.libre && !r.commence && !r.fini && !r.e1 && !r.e2, r);
      await L.fin(c); }
  }
  await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(async e => { console.log('ERREUR', e.stack || e); await L.fermer().catch(() => {}); process.exit(2); });
