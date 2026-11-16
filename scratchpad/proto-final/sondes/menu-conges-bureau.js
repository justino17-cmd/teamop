// « Mes congés » de la technicienne ne porte AUCUN geste du bureau (16 novembre 2026, relecture « ordinateur-code-1 ») :
// elle ne voit ni « ＋ Nouvelle absence » du bureau, ni « ‹ Toute l'équipe », ni la liste de l'équipe, et aucun geste
// (même forcé par la console) ne pose, valide, refuse ou supprime une absence pour quelqu'un d'autre.
// Le toast d'envoi d'une demande ne propose pas « Voir comme Marc » en mode application (échafaudage de revue, bouton mort).
// ⛔ 127.0.0.1 seulement. Une sonde compte sa population avant de conclure.
const { L } = require('./menu-commun.js'), v = L.v;
(async () => {
  for (const [qui, prenom] of [['sm', 'Sophie'], ['tl', 'Tom'], ['kb', 'Karim']]) {
    for (const profil of ['mac', 'iphone']) {
      const c = await L.ouvrir({ profil, qui, hash:'absences' }), tag = `${qui} ${profil}`;
      await L.calme(c.p, 500);
      const e = await c.p.evaluate(() => ({ role:ROLE, lecture:typeof aLecture === 'function' ? aLecture() : null, h1:(document.querySelector('#contenu h1') || {}).textContent,
        nouv:document.querySelectorAll('#contenu [data-anouv]').length, qui:document.querySelectorAll('#contenu [data-aqui-v]').length, chips:document.querySelectorAll('#contenu [data-acqui]').length,
        equipe:/Toute l.équipe|Non assigné/.test(document.getElementById('contenu').innerText), demande:document.querySelectorAll('#contenu [data-atdem]').length, jours:document.querySelectorAll('#contenu .ac-zone').length }));
      v(`${tag} : la population existe (écran « Mes congés », sa demande de congé, son calendrier)`, e.h1 === 'Mes congés' && e.demande === 1 && e.jours >= 1, e);
      v(`${tag} : aucun « ＋ Nouvelle absence » du bureau, aucune liste de l'équipe`, e.nouv === 0 && e.qui === 0 && e.chips === 0 && !e.equipe, e);
      // un geste du bureau forcé à la main (console, ancienne page en cache) ne doit RIEN écrire
      const av = await c.p.evaluate(() => ({ a:ABSENCES.length, d:DEMANDES_ABS.length, dec:DECISIONS_ABS.length }));
      const forces = await c.p.evaluate(() => { const r = []; const cree = (attr, val) => { const b = document.createElement('button'); b.setAttribute(attr, val); document.getElementById('contenu').appendChild(b); b.click(); b.remove(); };
        const d0 = DEMANDES_ABS[0] ? DEMANDES_ABS[0].id : 'x'; const a0 = ABSENCES[0] ? ABSENCES[0].id : 'x';
        cree('data-anouv', '1'); cree('data-anouv', 'kb'); cree('data-anouvok', '1'); cree('data-aqui-v', 'kb'); cree('data-aok', d0); cree('data-anon', d0); cree('data-anonok', d0); cree('data-amodif', d0); cree('data-adem', d0); cree('data-asuppr', 'd|' + a0); cree('data-asuppr', a0);
        return { panneau:!!document.querySelector('#calque .panneau'), a:ABSENCES.length, d:DEMANDES_ABS.length, dec:DECISIONS_ABS.length, quiSeul:typeof aCalQui !== 'undefined' ? aCalQui : null }; });
      v(`${tag} : onze gestes du bureau forcés à la main n'ouvrent aucun panneau et n'écrivent rien`, !forces.panneau && forces.a === av.a && forces.d === av.d && forces.dec === av.dec && forces.quiSeul === 'tous', { av, forces });
      v(`${tag} : aucune erreur JavaScript`, c.err.length === 0, c.err.slice(0, 2));
      await L.fin(c);
    }
  }
  // le vrai geste de la demande, jusqu'au toast : pas de « Voir comme Marc » en mode application
  for (const profil of ['iphone', 'android']) {
    const c = await L.ouvrir({ profil, qui:'sm', hash:'absences' }), tag = 'sm ' + profil;
    await L.toucher(c, '[data-atdem]');
    await c.p.evaluate(() => { document.getElementById('ad-du').value = jour(40); document.getElementById('ad-au').value = jour(41); for (const i of ['ad-du', 'ad-au']) document.getElementById(i).dispatchEvent(new Event('input', { bubbles:true })); });
    await L.calme(c.p, 300);
    const actif = await c.p.evaluate(() => { const b = document.querySelector('[data-atenvoi]'); return !!b && !b.disabled; });
    v(`${tag} : la demande de congé est prête à partir (population)`, actif);
    await L.toucher(c, '[data-atenvoi]'); await L.calme(c.p, 400);
    const t = await c.p.evaluate(() => { const e = document.getElementById('toast'); return { texte:e ? e.innerText.replace(/\s+/g, ' ') : '', bouton:e ? [...e.querySelectorAll('button')].map(b => b.textContent.trim()) : [], comme:aComme }; });
    v(`${tag} : le toast dit « Demande envoyée à Marc » et ne propose pas « Voir comme Marc »`, /Demande envoyée à Marc/.test(t.texte) && !/Voir comme/.test(t.texte) && t.comme === 'marc', t);
    await L.fin(c);
  }
  // le prototype nu (échafaudage de revue) garde, lui, son interrupteur ET le bouton du toast : on ne casse pas la revue
  { const c = await L.ouvrir({ profil:'mac', app:false, qui:null }); await c.p.evaluate(() => rlChanger('tech', { muet:true })); await L.calme(c.p, 400); await L.aller(c.p, 'absences');
    const r = await c.p.evaluate(() => ({ h1:(document.querySelector('#contenu h1') || {}).textContent, nouv:document.querySelectorAll('#contenu [data-anouv]').length }));
    v('prototype nu, rôle technicien : « Mes congés », sans geste du bureau', r.h1 === 'Mes congés' && r.nouv === 0, r);
    await L.toucher(c, '[data-atdem]');
    await c.p.evaluate(() => { document.getElementById('ad-du').value = jour(40); document.getElementById('ad-au').value = jour(41); for (const i of ['ad-du', 'ad-au']) document.getElementById(i).dispatchEvent(new Event('input', { bubbles:true })); });
    await L.calme(c.p, 300); await L.toucher(c, '[data-atenvoi]'); await L.calme(c.p, 400);
    const t = await c.p.evaluate(() => (document.getElementById('toast') || {}).innerText || '');
    v('prototype nu : le toast garde « Voir comme Marc » (échafaudage de revue)', /Voir comme Marc/.test(t), t.slice(0, 120));
    await L.fin(c); }
  await L.fermer(); const ko = L.bilan(); process.exit(ko ? 1 : 0);
})();
