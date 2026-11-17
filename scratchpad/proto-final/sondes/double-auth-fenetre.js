// Sonde « double-auth-fenetre » (étape 3, § 8.5) : la fenêtre secondaire (« Ouvrir dans une nouvelle fenêtre »). Elle s'ouvre déjà connectée (même appareil, même navigateur),
// mais ne tient NI le téléphone NI les confirmations : un geste sensible s'y arrête avec le message exact, aucune demande n'est créée, la première fenêtre reste intacte.
// Population : 2 fenêtres du même navigateur, 3 gestes sensibles essayés dans la seconde (banque, paie, nouveau téléphone), les deux fenêtres comparées avant/après.
const S = require('./double-auth-commun.js'), L = S.L, v = L.v;
const MSG = 'Pour cette action, reviens dans la première fenêtre : la confirmation sur le téléphone s’y passe.';
(async () => {
  const a = await L.ouvrir({ qui:'marc', profil:'mac' });
  v('population : la première fenêtre est ouverte (Marc) et passe sa session', await a.p.evaluate(() => { try { return fenPasse('equipe'); } catch (e) { return false; } }));
  const b = await a.ctx.newPage(), erreurs = [];
  b.on('pageerror', e => erreurs.push(e.message));
  await b.addInitScript("try{localStorage.setItem('opg_proto_espace','clim-services-17')}catch(e){}");
  await b.goto('http://127.0.0.1:' + a.port + '/apercu/prototype-op-gestion.html?app=1#equipe', { waitUntil:'load' }); await b.waitForTimeout(2500);
  await b.evaluate(() => { const x = document.querySelector('#nv [data-nv="fermer"]'); if (x) x.click(); }); await b.waitForTimeout(400);
  const e0 = await b.evaluate(() => ({ session:SESSION, secondaire:SECU.secondaire, auto:SECU.sessions[SESSION] && SECU.sessions[SESSION].auto, opsec:!!document.getElementById('opsec'), cnx:!!document.getElementById('cnx') }));
  v('la fenêtre secondaire s’ouvre CONNECTÉE (la session de Marc passée), sans écran de connexion', e0.session === 'marc' && !e0.cnx, e0);
  v('elle est marquée « secondaire », et le téléphone ne s’y monte pas', e0.secondaire === true && e0.opsec === false, e0);
  const gestes = [['banque', () => entPanBanque()], ['paie', () => paieAller('fiches')], ['nouveau téléphone', () => { secuPanTelephone('kb'); const i = document.getElementById('sec-verif'); if (i) i.click(); return secuNouveauTelephone('kb'); }], ['reposer', () => secuReposer('sm')], ['voir comme', () => secuVoirComme('sm')]];
  for (const [nom, f] of gestes) {
    const av = await b.evaluate(() => ({ demandes:SECU.demandes.length, panneau:(document.querySelector('#calque .panneau h2') || {}).textContent || null, onglet:CP.onglet, telKb:!!SECU.comptes.kb.tel, prov:SECU.comptes.sm.prov, session:SESSION }));
    await b.evaluate(f); await b.waitForTimeout(500);
    const ap = await b.evaluate(() => ({ demandes:SECU.demandes.length, conf:!!document.getElementById('sec-conf'), panneau:(document.querySelector('#calque .panneau h2') || {}).textContent || null, onglet:CP.onglet, telKb:!!SECU.comptes.kb.tel, prov:SECU.comptes.sm.prov, session:SESSION, toast:(document.getElementById('toast') || {}).textContent || '' }));
    v(nom + ' : le geste s’arrête avec « ' + MSG + ' »', ap.toast.replace(/[  ]/g, ' ').includes(MSG), ap.toast.slice(0, 120));
    v(nom + ' : aucune demande n’est créée, aucune fenêtre de confirmation, rien n’a changé', ap.demandes === av.demandes && !ap.conf && ap.onglet === av.onglet && ap.telKb === av.telKb && ap.prov === av.prov && ap.session === av.session, { av, ap });
    await b.evaluate(() => { fermerPanneau(); });
  }
  const a1 = await a.p.evaluate(() => ({ session:SESSION, demandes:SECU.demandes.length, conf:!!document.getElementById('sec-conf') }));
  v('la première fenêtre est intacte (même session, aucune demande, aucune confirmation)', a1.session === 'marc' && a1.demandes === 0 && !a1.conf, a1);
  await b.evaluate(() => sessionFermer());
  v('« Se déconnecter » dans la seconde fenêtre ne touche pas la première (sa session reste ouverte)', await a.p.evaluate(() => !!SESSION && !document.getElementById('cnx')));
  v('aucune erreur JavaScript (deux fenêtres)', a.err.length === 0 && erreurs.length === 0, [...a.err, ...erreurs].slice(0, 3));
  await L.fin(a); await L.fermer(); const ko = L.bilan(); process.exit(ko ? 1 : 0);
})().catch(e => { console.log('ERR', e); process.exit(1); });
