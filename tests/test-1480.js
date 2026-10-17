/* ⛔ CE QUE CE FICHIER GARDE — CELUI QUI TERMINE LA SALLE LIT « TERMINÉE POUR TOUS », LES AUTRES « L'HÔTE A MIS FIN » (famille 4 ; modèle `test-990`).

   Constat du testeur (salle#5) : l'hôte qui venait de choisir « Terminer pour tous » lisait, comme les autres, « L'hôte a mis fin à la réunion. » — son propre geste, raconté à la troisième personne.
   Le service ne dit pas QUI a terminé (`phraseFin` ne sait que « termine ») : la distinction se fait dans le module de la page (`source-serveur.js`), qui sait qu'IL vient de demander la fin
   (`action('terminerPourTous')`). Les VRAIES fonctions de la page contre le VRAI service, deux « navigateurs de poche » (cookie, flux, fausse liaison pair à pair) :

     1. UNE RÉUNION : l'organisatrice termine pour tous → SA vue dit « Réunion terminée pour tous. », celle de Ben « L'hôte a mis fin à la réunion. » ;
     2. UN APPEL DE GROUPE : « Appel terminé pour tous. » chez celui qui termine, « L'hôte a mis fin à l'appel. » chez l'autre ;
     3. UN GESTE REFUSÉ NE RACONTE RIEN : un invité qui tente de terminer (refusé par le service) lira ensuite la phrase des autres quand l'hôte termine vraiment.

   ⛔ UNE ASSERTION SUR UN ENSEMBLE VIDE PASSE ET NE PROUVE RIEN : chaque phrase est précédée de la preuve que la salle a bien fini des deux côtés. Toute attente est au GESTE. */
'use strict';
const path = require('path'), crypto = require('crypto');
const T = require('./outils-msg');
T.sauterSiSansDependances();
const { v, vrai, fin } = T.compteur();
const { creerMonde } = require('./bac-webrtc');
const OPMSG = require(path.join(T.SERVICE, 'public', 'api.js'));
const { creerSourceServeur } = require(path.join(T.SERVICE, 'public', 'source-serveur.js'));
const att = (cond, ms = 8000) => T.attendre(cond, ms, 8);
const attrape = async (p) => { try { await p; return null; } catch (e) { return e; } };

setTimeout(() => { console.log('  ✗ délai global du banc dépassé (120 s)'); process.exit(1); }, 120000).unref();

const DELAIS = { pouls: 150, candidats: 5, veille: 3000, deconnecte: 250, reessai: [40, 80], iceMax: 1500, quitter: [40, 80], marge: 600000, renouvMin: 600000, nettoyage: 600000,
  relaisApres: 1000, toutApres: 500, reoffre: 2500, reprise: 400, niveau: 40, tenuParle: 150, reseau: 60, etat: 20 };

(async () => {
  const MDP = { ana: 'pw-ana-1234567', ben: 'pw-ben-1234567' };
  const og = await T.fauxOpGestion(Object.fromEntries(Object.keys(MDP).map(k => [k, { pass: MDP[k], nom: k[0].toUpperCase() + k.slice(1) + ' Banc', actif: true }])));
  const svc = await T.lancerService({ urlGestion: og.url, horloge: true, config: { appels: { relais: { secret: crypto.randomBytes(24).toString('hex'), hote: 'turn.exemple.invalid', port: 3478, portTls: 5349, ttlS: 60 }, balayageMs: 100, perduMs: 20000, parHeure: 900, parPaireHeure: 90, entrantsParHeure: 600, iceParHeure: 900, signalMax: 2000, groupeSignalMax: 5000, salleEvtMax: 1000 } } });
  const sources = [];
  function monter(login) {
    const nav = T.navigateur(svc.base), monde = creerMonde(login), D = { login, nav, monde, evs: [] };
    const faux = { priseEnCharge: () => ({ ok: false, raison: 'navigateur' }), permission: () => 'default', visible: () => true, surMessage: () => {}, abonnementActuel: async () => null, fermerNotifications: async () => {} };
    D.src = creerSourceServeur({ OPMSG, base: svc.base, fetch: nav.fetch, EventSource: nav.EventSource, navigateur: faux, webrtc: monde, attente: () => 60, attenteEnvoi: () => 120, delaiSaisieMs: 500, delaiRelireMs: 5, delaiAckMs: 20, appelsDelais: DELAIS });
    sources.push(D.src); D.src.ecouter(e => { D.evs.push(e); });
    D.entrer = async () => { await D.src.connexion(login, MDP[login]); const d = await D.src.demarrer(); if (!d.connecte) throw new Error('démarrage refusé'); D.moi = D.src.moi(); return D.moi; };
    D.attendreSnap = async (id, pred, ms) => { let s = null; await att(async () => { s = await D.src.appel(id); return s && pred(s) ? s : null; }, ms); return s && pred(s) ? s : null; };
    return D;
  }
  const donnerPistes = (D, id) => D.src.appelPistes(id, { audio: D.monde.piste('audio', D.login + '-audio'), video: null });

  try {
    const A = monter('ana'), B = monter('ben');
    await A.entrer(); const ben = await B.entrer();
    const l1 = await A.src.lienContact(); await B.src.accepterLien(l1.code);

    /* ═══ 1. UNE RÉUNION ═══ */
    console.log('Une réunion : celui qui termine pour tous lit « Réunion terminée pour tous. », l\'autre la phrase de l\'hôte');
    {
      const debut = Date.now() + 5 * 60000;
      const r = await A.src.programmer({ titre: 'Point d\'équipe', debut, fin: debut + 3600000, invites: [ben.id], salle_attente: false });
      const sa = await A.src.rejoindreReunion(r.id, 'audio'); donnerPistes(A, sa.id);
      const sb = await B.src.rejoindreReunion(r.id, 'audio'); donnerPistes(B, sb.id);
      vrai('(population) les deux sont présents dans la salle de la réunion', sa.id === sb.id && !!(await att(async () => ((await A.src.appel(sa.id)).membres || []).some(m => m.id === ben.id && m.statut === 'present'))));
      await A.src.salleAction(sa.id, 'terminerPourTous', {});
      const fa = await A.attendreSnap(sa.id, s => s.etat === 'termine', 6000), fb = await B.attendreSnap(sb.id, s => s.etat === 'termine', 6000);
      vrai('(population) la salle est finie des DEUX côtés, pour la même cause', !!fa && !!fb && fa.issue === 'termine' && fb.issue === 'termine');
      v('⛔ l\'hôte qui vient de terminer lit « Réunion terminée pour tous. » (son geste, pas « l\'hôte a mis fin »)', fa && fa.avis, 'Réunion terminée pour tous.');
      v('   l\'autre lit toujours la phrase de l\'hôte', fb && fb.avis, 'L\'hôte a mis fin à la réunion.');
    }

    /* ═══ 2. UN APPEL DE GROUPE, ET UN GESTE REFUSÉ ═══ */
    console.log('\nUn appel de groupe : « Appel terminé pour tous. » chez celui qui termine ; un geste refusé ne raconte rien');
    {
      const groupe = await A.src.creerGroupe({ nom: 'Équipe terrain', membres: [ben.id] });
      const s = await A.src.demarrerAppel({ membres: [], video: false, conv: groupe.id }); donnerPistes(A, s.id);
      await att(() => B.evs.find(e => e.type === 'appel-entrant' && e.id === s.id));
      await B.src.repondreAppel(s.id, true); donnerPistes(B, s.id);
      vrai('(population) Ben est présent dans l\'appel de groupe', !!(await att(async () => ((await A.src.appel(s.id)).membres || []).some(m => m.id === ben.id && m.statut === 'present'))));
      const refus = await attrape(B.src.salleAction(s.id, 'terminerPourTous', {}));
      vrai('(population) un invité qui tente de terminer est REFUSÉ par le service, et la salle court toujours', !!refus && (await A.src.appel(s.id)).etat !== 'termine');
      await A.src.salleAction(s.id, 'terminerPourTous', {});
      const fa = await A.attendreSnap(s.id, x => x.etat === 'termine', 6000), fb = await B.attendreSnap(s.id, x => x.etat === 'termine', 6000);
      vrai('(population) l\'appel est fini des deux côtés', !!fa && !!fb);
      v('⛔ l\'hôte lit « Appel terminé pour tous. »', fa && fa.avis, 'Appel terminé pour tous.');
      v('⛔ l\'invité dont le geste avait été refusé lit la phrase de l\'hôte (le refus n\'a rien marqué)', fb && fb.avis, 'L\'hôte a mis fin à l\'appel.');
    }
  } catch (e) {
    console.log('  ✗ le banc est mort : ' + (e && e.stack || e));
    console.log(svc.sortie.texte().slice(-1200));
    process.exitCode = 1;
  }
  for (const s of sources) { try { s.arreter(); } catch (e) { /* déjà arrêté */ } }
  await svc.arreter(); await og.fermer();
  fin();
})();
