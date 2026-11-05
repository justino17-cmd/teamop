/* ⛔ LES COURRIELS EN DOUBLE — 2 novembre 2026. Justin : « je reçois les mails en double, ça envoie les mails en double, c'est une horreur. Vérifie tout. »
 *
 * Le VRAI serveur, isolé sur 127.0.0.1, avec un facteur SMTP qui garde l'ENVELOPPE de chaque message (les copies cachées n'apparaissent que là).
 * L'expéditeur est réglé comme en ligne (`set-smtp.sh`) : « TeamOP <contact@…> », et l'adresse de contact est la même boîte écrite nue.
 *   § 1  une inscription : UN « Confirmez votre adresse » au client, et UN SEUL avis à l'équipe (la route publique `/api/nouveau-compte` n'envoie plus rien ;
 *        l'avis du passage des comptes reprend le nom et l'entreprise tapés à l'inscription) ;
 *   § 2  la copie cachée compare des ADRESSES : un avis à « contact@… » ne repart pas en copie cachée vers « TeamOP <contact@…> » — la même boîte ;
 *        un courriel à un client garde sa copie (la trace voulue dans la boîte de l'équipe), une seule ;
 *   § 3  l'accusé d'une demande dit la vérité : « nous préparons votre espace » à une entreprise neuve, « votre espace est déjà ouvert » à une entreprise
 *        de l'annuaire (Tokaclim, 1er novembre 2026) ;
 *   § 4  Comptes du site : « porte une entreprise » se lit dans l'ANNUAIRE ; une fiche client seule se dit `fiche` (MS Garnier, 2 novembre 2026).
 */
'use strict';
const path = require('path'), fs = require('fs');
const RACINE = path.join(__dirname, '..');
if (!fs.existsSync(path.join(RACINE, 'server', 'node_modules'))) { console.log('test-3150 : server/node_modules absent — sauté'); process.exit(0); }
const { demarrer, dormir } = require('./banc-serveur-courrier.js');
const { simpleParser } = require(path.join(RACINE, 'server', 'node_modules', 'mailparser'));
let ok = 0, ko = 0;
const v = (nom, obtenu, attendu) => { const a = JSON.stringify(obtenu), b = JSON.stringify(attendu); if (a === b) { ok++; console.log('  ✓ ' + nom); } else { ko++; console.log('  ✗ ' + nom + '\n      obtenu  ' + a + '\n      attendu ' + b); } };
const CONTACT = 'contact@banc-courrier.fr', JUSTIN = 'justin@banc-courrier.fr';   // deux boîtes de l'équipe qui aboutissent chez la même personne : le cas réel

(async () => {
  const S = await demarrer({ comptes: true, smtpFrom: 'TeamOP <' + CONTACT + '>', contactEmail: CONTACT, conf: { comptesScanMs: 1500, notifDemandes: JUSTIN },
    avant: D => fs.writeFileSync(path.join(D, 'espaces.json'), JSON.stringify({ 'toka-clim': { slug: 'toka-clim', t: 'teamToka', email: 'patron@toka-3150.fr', nom: 'Toka Clim', formule: 'pro', ts: Date.now() } })) });
  try {
    if (!S.vivant) { ko++; console.log('  ✗ le serveur ne démarre pas\n' + S.journal().slice(-1500)); return; }
    const lus = async () => { const L = []; for (const e of S.fact.enveloppes) { const m = await simpleParser(e.msg); L.push({ sujet: m.subject || '', a: String((m.to && m.to.text) || '').toLowerCase(), rcpt: e.rcpt, texte: String(m.text || '') }); } return L; };
    const de = (L, re) => L.filter(x => re.test(x.sujet));

    /* § 1 — une inscription */
    const ADR = 'jeremy@exemple-3150.fr';
    const nc = await S.public('/api/nouveau-compte', { email: ADR, prenom: 'Jérémy', nom: 'Garnier', company: 'MS Garnier' });
    v('§1 la route publique /api/nouveau-compte répond toujours 200', nc.s, 200);
    await dormir(800);
    v('§1 … et n\'envoie plus aucun courriel', (await lus()).length, 0);
    const ins = await S.inscrire(ADR, 'MS Garnier', []);
    v('§1 inscription menée jusqu\'à la synchro', !!ins.jeton, true);
    await S.attendre(async () => de(await lus(), /Nouveau compte/).length > 0, 8000);
    await dormir(2500);   // un passage de plus : l'avis ne doit pas revenir
    let L = await lus();
    const conf = de(L, /Confirmez votre adresse/);
    v('§1 UN SEUL « Confirmez votre adresse »', conf.length, 1);
    v('§1 … sans copie cachée (il porte un lien personnel)', conf[0] && conf[0].rcpt, [ADR]);
    const avis = de(L, /Nouveau compte/);
    v('§1 UN SEUL avis « Nouveau compte » à l\'équipe', avis.length, 1);
    v('§1 … reçu UNE fois, par la boîte des demandes (pas de copie cachée en plus)', avis[0] && avis[0].rcpt, [JUSTIN]);
    v('§1 … avec le nom et l\'entreprise de l\'inscription', [/Garnier|Prénom|Nom/.test(avis[0] ? avis[0].texte : ''), /MS Garnier/.test(avis[0] ? avis[0].sujet + avis[0].texte : '')], [true, true]);
    const internes = L.filter(x => x.rcpt.includes(CONTACT) || x.rcpt.includes(JUSTIN));
    v('§1 aucun avis n\'atteint l\'équipe deux fois (même sujet)', internes.length, new Set(internes.map(x => x.sujet)).size);

    /* § 3 — l'accusé d'une demande (entreprise neuve, puis entreprise déjà ouverte) */
    const avant = S.fact.enveloppes.length;
    await S.inscrire('neuve@exemple-3150.fr', 'Neuve Clim', [{ app: 'OP GESTION', formule: 'Pro', metier: 'chauffage', date: Date.now() }]);
    await S.attendre(async () => de((await lus()).slice(avant), /Votre demande est bien reçue/).length > 0, 8000);
    L = (await lus()).slice(avant);
    const acc = de(L, /Votre demande est bien reçue/);
    v('§3 entreprise neuve : UN accusé, « nous préparons votre espace »', [acc.length, /prépare votre espace/.test(acc[0] ? acc[0].texte : '')], [1, true]);
    v('§3 … au client, avec UNE copie pour l\'équipe (la trace voulue)', acc[0] && acc[0].rcpt.slice().sort(), [JUSTIN, 'neuve@exemple-3150.fr'].sort());
    v('§3 UN avis « Nouvelle demande à traiter », reçu une fois', [de(L, /Nouvelle demande à traiter/).length, (de(L, /Nouvelle demande à traiter/)[0] || {}).rcpt], [1, [JUSTIN]]);
    await dormir(3500);   // deux passages des comptes
    v('§3 un compte qui a DÉJÀ envoyé sa demande ne reçoit pas en plus l\'avis « Nouveau compte » (il a eu « Nouvelle demande à traiter »)',
      (await lus()).slice(avant).filter(x => /Nouveau compte/.test(x.sujet) && /Neuve Clim/.test(x.sujet + x.texte)).length, 0);
    const avant2 = S.fact.enveloppes.length;
    await S.inscrire('patron@toka-3150.fr', 'Toka Clim', [{ app: 'OP GESTION', formule: 'Pro', metier: 'chauffage', date: Date.now() }]);
    await S.attendre(async () => de((await lus()).slice(avant2), /Votre demande est bien reçue/).length > 0, 8000);
    const acc2 = de((await lus()).slice(avant2), /Votre demande est bien reçue/);
    v('§3 entreprise DÉJÀ OUVERTE (Tokaclim) : l\'accusé dit « votre espace est déjà ouvert », sans promettre des identifiants',
      [acc2.length, /déjà ouvert/.test(acc2[0] ? acc2[0].texte : ''), /prépare votre espace/.test(acc2[0] ? acc2[0].texte : '')], [1, true, false]);

    /* § 4 — Comptes du site : l'annuaire décide de « porte une entreprise » */
    const cs = (await S.get('/api/monitor/comptes-site')).j.comptes || [];
    const ligne = m => cs.find(c => c.email === m) || {};
    v('§4 MS Garnier (fiche, pas d\'espace) : ni « entreprise », mais une fiche', [ligne(ADR).aUnEspace, ligne(ADR).fiche], [false, true]);
    v('§4 Toka Clim (dans l\'annuaire) : porte son entreprise', ligne('patron@toka-3150.fr').aUnEspace, true);
    const sup = await S.post('/api/monitor/comptes-site/supprimer', { email: ADR });
    v('§4 supprimer un compte à fiche seule : refus qui renvoie vers les Demandes, pas vers une entreprise', [sup.s, /Demandes/.test(sup.j.error || ''), /pas encore d'entreprise/.test(sup.j.error || '')], [409, true, true]);

    /* § 2 — la copie cachée, JOUÉE : un signalement de bug part à l'adresse de contact écrite NUE (« contact@… ») pendant que l'expéditeur est
       « TeamOP <contact@…> » — c'est exactement le cas qui faisait arriver chaque avis deux fois dans la même boîte. */
    const avant3 = S.fact.enveloppes.length;
    await S.public('/api/bug', { teamId: 'banc-3150', app: 'opgestion', version: '1', msg: 'Erreur de banc 3150 ' + Date.now(), src: 'banc', line: 1 });
    await S.attendre(async () => de((await lus()).slice(avant3), /Bug/).length > 0, 8000);
    const bug = de((await lus()).slice(avant3), /Bug/);
    v('§2 un avis de bug à « contact@… » : UNE enveloppe, UN destinataire (plus de copie cachée vers l\'autre boîte de l\'équipe)', [bug.length, bug[0] && bug[0].rcpt], [1, [CONTACT]]);
    /* … et la règle, lue dans le code (la forme, pas une phrase) */
    const SRC = fs.readFileSync(path.join(RACINE, 'server', 'index.js'), 'utf8').replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
    v('§2 la copie cachée compare des adresses nues, à toutes les adresses de l\'équipe', [/const nus = String\(opts\.to \|\| ''\)\.split\(','\)\.map\(adrNue\)/.test(SRC), /!nus\.some\(a => internes\.has\(a\)\)\) o2\.bcc = moi/.test(SRC)], [true, true]);
    v('§2 « Corrigé » marque l\'envoi AVANT le premier courriel (deux appuis ne font pas deux envois)', /if \(statut === 'corrige' && prevenir && !issue\.mailEnvoye\) \{\s*issue\.mailEnvoye = true;/.test(SRC), true);
  } catch (e) { ko++; console.log('  ✗ exception : ' + (e && e.stack || e)); }
  finally { await S.fin(); console.log(`════ test-3150 : ${ok} ✓ ${ko} ✗ ════`); process.exit(ko ? 1 : 0); }
})();
