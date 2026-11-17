// Sonde « secu-inactif » (double authentification, étape 2, §§ 3.6 et 3.9) : une session ne dure pas pour toujours.
// Population : 4 gestes — 14 minutes puis un toucher (le compteur repart), 14 minutes de plus (toujours dedans), 16 minutes sans rien (fermée, message exact), « Se déconnecter » (message exact) ;
// plus le rechargement (aucune session gardée) et la règle écrite dans UN objet (SECU_REGLES.inactiviteMs = 15 minutes).
const S = require('./secu-commun.js'), L = S.L, v = L.v;
(async () => {
  const c = await S.ouvrir({ profil:'mac' });
  const r = await c.p.evaluate(() => ({ inact:SECU_REGLES.inactiviteMs, conf:SECU_REGLES.confirmationMs, dem:SECU_REGLES.demandeMs, max:SECU_REGLES.demandesMax, ech:SECU_REGLES.echecsMax, verrou:SECU_REGLES.verrouMs, pin:SECU_REGLES.pinMax, act:SECU_REGLES.activationMs, prov:SECU_REGLES.provisoireMs }));
  v('les chiffres de la référence vivent dans UN objet : demande 2 min, 6 demandes, 5 échecs, verrou 15 min, 5 PIN, activation 15 min, provisoire 72 h, confirmation 5 min, inactivité 15 min',
    r.inact === 900000 && r.conf === 300000 && r.dem === 120000 && r.max === 6 && r.ech === 5 && r.verrou === 900000 && r.pin === 5 && r.act === 900000 && r.prov === 72 * 3600000, r);
  const k = 'kb', mdp = await S.provisoire(c, k);
  await S.jour(c, k, mdp, '246802'); await c.p.waitForTimeout(500);
  v('Karim est connecté par son nombre', await c.p.evaluate(() => SESSION === 'kb' && !SECU.sessions.kb.auto));
  await S.avancer(c, 14); await c.p.waitForTimeout(1500);
  v('14 minutes sans rien toucher : toujours connecté', await c.p.evaluate(() => SESSION === 'kb'));
  await c.p.mouse.move(300, 300); await c.p.mouse.down(); await c.p.mouse.up(); await c.p.waitForTimeout(300);
  await S.avancer(c, 14); await c.p.waitForTimeout(1500);
  v('un toucher a remis le compteur à zéro : 14 minutes de plus, toujours connecté', await c.p.evaluate(() => SESSION === 'kb'));
  await S.avancer(c, 2); await c.p.waitForTimeout(2500);
  const f = await c.p.evaluate(() => ({ s:SESSION, cnx:!!document.getElementById('cnx'), msg:(document.getElementById('cnx') || {}).textContent || '', sess:Object.keys(SECU.sessions).join() }));
  v('16 minutes sans rien toucher : la session est fermée, l’écran de connexion dit « Tu as été déconnecté : 15 minutes sans rien toucher. Reconnecte-toi. »', f.s === null && f.cnx && /Tu as été déconnecté : 15 minutes sans rien toucher\. Reconnecte-toi\./.test(f.msg.replace(/\s+/g, ' ')), f);
  v('plus aucune session ni confirmation en mémoire pour Karim', f.sess === '' && await c.p.evaluate(() => !SECU.confirmeA.kb));
  const m2 = await S.provisoire(c, k); v('le mot de passe de Karim (bloc Démonstration) est toujours lisible pour se reconnecter', !!m2);
  await S.jour(c, k, m2, '246802'); await c.p.evaluate(() => sessionFermer('deconnexion')); await c.p.waitForTimeout(1200);
  const g = await c.p.evaluate(() => ({ s:SESSION, msg:(document.getElementById('cnx') || {}).textContent || '' }));
  v('« Se déconnecter » : l’écran de connexion dit « Tu es déconnecté. »', g.s === null && /Tu es déconnecté\./.test(g.msg), g.msg.slice(0, 200));
  const ls = await S.rangement(c); v('aucune session n’est rangée sur l’appareil (rien à rouvrir après un rechargement)', !/session/i.test(ls.replace(/opg_proto_espace/, '')), ls);
  await S.jour(c, k, m2, '246802'); await c.p.reload({ waitUntil:'load' }); await L.attendre(c.p, () => !!document.getElementById('cn-id') || !!document.getElementById('cn-form-lien'), 20000);
  v('après un rechargement de la page : l’écran de connexion, aucune session (la démonstration repart de zéro)', await c.p.evaluate(() => SESSION === null && !!document.getElementById('cnx')));
  v('aucune erreur JavaScript', c.err.length === 0, c.err.slice(0, 3)); await L.fin(c);
  await L.fermer(); const ko = L.bilan(); process.exit(ko ? 1 : 0);
})().catch(e => { console.log('ERR', e); process.exit(1); });
