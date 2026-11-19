// « Mes congés » du technicien : l'écran lit la personne CONNECTÉE (Sophie, pas Karim), elle fait une demande, la retrouve,
// et le gérant la voit arriver. L'interrupteur « Prototype · voir l'écran comme » n'existe pas en mode application.
const { L } = require('./menu-commun.js'), v = L.v;
(async () => {
  for (const [qui, prenom] of [['sm', 'Sophie Martin'], ['tl', 'Tom Leroy']]) {
    const c = await L.ouvrir({ profil:'iphone', qui, hash:'absences' }), tag = qui;
    const e = await c.p.evaluate(() => ({ h1:(document.querySelector('#contenu h1') || {}).textContent, sur:(document.querySelector('#contenu .surtitre') || {}).textContent, comme:!!document.querySelector('.a-comme'), bouton:!!document.querySelector('[data-atdem]'), solde:document.querySelectorAll('.at-t').length, tid:aTech() }));
    v(`${tag} : l'écran s'appelle « Mes congés » et porte le nom de ${prenom}`, e.h1 === 'Mes congés' && (e.sur || '').includes(prenom), e);
    v(`${tag} : il lit la personne connectée (${qui}), pas un technicien fixe`, e.tid === qui, e.tid);
    v(`${tag} : soldes (congés payés, RTT) et bouton de demande`, e.solde === 2 && e.bouton, e);
    v(`${tag} : plus d'interrupteur « voir l'écran comme »`, !e.comme);
    // la demande : le vrai geste
    await L.toucher(c, '[data-atdem]'); const ouvert = await c.p.evaluate(() => !!document.getElementById('ad-ty'));
    v(`${tag} : « Demande de congé » ouvre le formulaire`, ouvert);
    await c.p.evaluate(() => { document.getElementById('ad-du').value = jour(20); document.getElementById('ad-au').value = jour(22); document.getElementById('ad-m').value = 'Vacances en famille'; document.getElementById('ad-du').dispatchEvent(new Event('input', { bubbles:true })); document.getElementById('ad-au').dispatchEvent(new Event('input', { bubbles:true })); });
    await L.calme(c.p, 300);
    const dispo = await c.p.evaluate(() => !document.querySelector('[data-atenvoi]').disabled); v(`${tag} : le bouton d'envoi est actif sur des jours libres`, dispo);
    await L.toucher(c, '[data-atenvoi]'); await L.calme(c.p, 500);
    const apres = await c.p.evaluate((q) => ({ mes:DEMANDES_ABS.filter(d => d.tech === q).length, carte:[...document.querySelectorAll('#contenu .at-d')].map(x => x.innerText.replace(/\s+/g, ' ').slice(0, 120)), panneau:!!document.querySelector('#calque .panneau') }), qui);
    v(`${tag} : la demande est enregistrée à son nom et retrouvée dans « Mes demandes »`, apres.mes >= 1 && apres.carte.some(x => /En attente/.test(x)), apres);
    // le gérant la voit arriver : on ouvre son compte par la fonction que la connexion appelle, puis « Absences et congés › à valider »
    await c.p.evaluate(() => { sessionOuvrir('marc'); }); await L.calme(c.p, 600); await L.aller(c.p, 'absences'); await L.calme(c.p, 500);
    const g = await c.p.evaluate((q) => { const t = document.getElementById('contenu').innerText; return { h1:(document.querySelector('#contenu h1') || {}).textContent, vue:/Vacances en famille|à valider|demande/i.test(t), nom:t.includes(q.split(' ')[0]), carte:!!document.querySelector('[data-ademid]'), comme:!!document.querySelector('.a-comme') }; }, prenom);
    v(`${tag} → gérant : « Absences et congés » montre la demande de ${prenom.split(' ')[0]}`, g.h1 === 'Absences et congés' && g.carte && g.nom, g);
    v(`${tag} → gérant : pas d'interrupteur de revue en mode application`, !g.comme);
    v(`${tag} : aucune erreur JavaScript`, c.err.length === 0, c.err.slice(0, 2));
    await L.fin(c);
  }
  // le prototype nu : le gérant garde l'interrupteur de revue (échafaudage), le technicien (rôle) ne l'a pas
  { const c = await L.ouvrir({ profil:'mac', app:false, qui:null }); await L.aller(c.p, 'absences'); const a = await c.p.evaluate(() => !!document.querySelector('.a-comme'));
    v('prototype nu : le gérant a « voir l’écran comme » (revue)', a);
    await c.p.evaluate(() => rlChanger('tech', { muet:true })); await L.calme(c.p, 500); await L.aller(c.p, 'absences'); const t = await c.p.evaluate(() => ({ h1:(document.querySelector('#contenu h1') || {}).textContent, comme:!!document.querySelector('.a-comme') }));
    v('prototype nu, rôle technicien : « Mes congés », sans interrupteur', t.h1 === 'Mes congés' && !t.comme, t); await L.fin(c); }
  await L.fermer(); const ko = L.bilan(); process.exit(ko ? 1 : 0);
})();
