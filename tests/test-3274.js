/* ══ test-3274 — `configurer-boites-mail.js` : OUVRIR LES BOÎTES MAIL ET POSER GOOGLE / MICROSOFT SANS AFFICHER UN SECRET ═══════════════════════════════════════════════════════════════════
   Le script est LANCÉ (entrée redirigée, la seule façon de l'éprouver avant de le confier) sur une copie jetable de configuration :
     · `ouvrir` allume la rubrique, `google` / `microsoft` posent l'application, `retirer` la retire, `--verifier` relit — chaque fois, TOUTES les autres clés du fichier restent intactes ;
     · ⛔ le secret n'est JAMAIS écrit sur la sortie (ni à la saisie, ni au résumé) ; le fichier reste en 0600 ;
     · ⛔ ce qu'il écrit est ce que le DÉMARRAGE du service accepte (`boitesMailConfig`) : le vrai service démarre sur ce fichier et dit `boitesMail.ouvert` et le fournisseur posé ;
     · un identifiant ou un secret mal formé, l'ID d'un secret Microsoft (un GUID), une commande inconnue : refusés, et RIEN n'est modifié (le fichier est identique octet pour octet).
   Code 0 si tout passe, 1 sinon. */
'use strict';
const fs = require('fs'), os = require('os'), path = require('path'), crypto = require('crypto');
const { spawnSync } = require('child_process');
const T = require('./outils-msg');
const { v, vrai, fin } = T.compteur();
T.sauterSiSansDependances();

const SCRIPT = path.join(T.SERVICE, 'configurer-boites-mail.js');
const SECRET_G = 'GsecretQWXZ-ne-doit-jamais-sortir-1', SECRET_M = 'MsecretQWXZ-ne-doit-jamais-sortir-2';

(async () => {
  const racine = fs.mkdtempSync(path.join(os.tmpdir(), 'banc-3274-'));
  const cfg = path.join(racine, 'config.json');
  const base = { origines: ['https://msg-beta.teamop.fr'], cookie: { nom: 'opm', secure: true }, quotas: { ip: { max: 5, fenetreMs: 1000 } }, vapidPublicKey: 'x', autre: { liste: [1, 2, 3] } };
  const ecrire = (o) => fs.writeFileSync(cfg, JSON.stringify(o, null, 2), { mode: 0o600 });
  const lire = () => JSON.parse(fs.readFileSync(cfg, 'utf8'));
  const lancer = (args, entree) => { const r = spawnSync(process.execPath, [SCRIPT].concat(args), { input: entree, env: Object.assign({}, process.env, { OPMSG_CONFIG: cfg }), encoding: 'utf8' }); return { code: r.status, sortie: (r.stdout || '') + (r.stderr || '') }; };
  try {
    ecrire(base);
    console.log('\n1. Ouvrir, poser, retirer');
    const o = lancer(['ouvrir']);
    v('ouvrir : la rubrique est ouverte, les autres clés sont INTACTES, aucun fournisseur', [o.code, lire().boitesMail, Object.keys(base).every(k => JSON.stringify(lire()[k]) === JSON.stringify(base[k]))], [0, { ouvert: true }, true]);
    vrai('   le résumé donne l\'adresse de retour à déclarer chez Google et Microsoft (une adresse publique, déduite de l\'origine)', o.sortie.includes('https://msg-beta.teamop.fr/api/boites-mail/oauth/retour'));
    const g = lancer(['google'], 'gclient-id-0123456789\n' + SECRET_G + '\n');
    const apresG = lire();
    v('google : posé (identifiant et secret au fichier), ouvert, les autres clés intactes', [g.code, apresG.boitesMail.oauth.google, apresG.boitesMail.ouvert, JSON.stringify(apresG.autre)], [0, { clientId: 'gclient-id-0123456789', clientSecret: SECRET_G }, true, JSON.stringify(base.autre)]);
    v('⛔ le secret n\'est écrit NULLE PART sur la sortie (ni à la saisie, ni au résumé) — seulement sa longueur', [g.sortie.includes(SECRET_G), g.sortie.includes('secret de ' + SECRET_G.length + ' caractères')], [false, true]);
    v('   le fichier reste en 0600', (fs.statSync(cfg).mode & 0o777).toString(8), '600');
    const m = lancer(['microsoft'], 'mclient-id-0123456789\n' + SECRET_M + '\n');
    v('microsoft : posé à côté de Google', [m.code, Object.keys(lire().boitesMail.oauth).sort(), m.sortie.includes(SECRET_M), m.sortie.includes(SECRET_G)], [0, ['google', 'microsoft'], false, false]);
    const ver = lancer(['--verifier']);
    v('--verifier : relit, nomme ce qui est posé, N\'AFFICHE aucun secret', [ver.code, /Google +: posé/.test(ver.sortie), /Microsoft +: posé/.test(ver.sortie), ver.sortie.includes(SECRET_G), ver.sortie.includes(SECRET_M), ver.sortie.includes('gclient-id')], [0, true, true, false, false, false]);

    console.log('\n2. Ce que le SERVICE fait de ce fichier');
    const og = await T.fauxOpGestion({});
    const svc = await T.lancerService({ urlGestion: og.url, config: { boitesMail: lire().boitesMail } }).catch(e => e);
    if (svc instanceof Error) { vrai('le service démarre sur le bloc écrit par le script : ' + svc.message.slice(0, 200), false); }
    else {
      try {
        const c = await T.client(svc.base).get('/api/config');
        v('le vrai service accepte le bloc : ouvert, Google et Microsoft configurés — et RIEN du secret dans ses réponses publiques', [c.j.boitesMail, c.txt.includes(SECRET_G), c.txt.includes('gclient-id')], [{ ouvert: true, oauth: { google: true, microsoft: true } }, false, false]);
      } finally { await svc.arreter(); }
    }
    await og.fermer();

    console.log('\n3. Retirer');
    const r1 = lancer(['retirer', 'google']);
    v('retirer google : il reste Microsoft, la rubrique reste ouverte', [r1.code, Object.keys(lire().boitesMail.oauth), lire().boitesMail.ouvert], [0, ['microsoft'], true]);
    const r2 = lancer(['retirer', 'tout']);
    v('retirer tout : le bloc disparaît, les autres clés restent', [r2.code, lire().boitesMail, Object.keys(base).filter(k => JSON.stringify(lire()[k]) !== JSON.stringify(base[k]))], [0, undefined, []]);

    console.log('\n4. Les refus ne modifient RIEN');
    ecrire(base); const avant = fs.readFileSync(cfg);
    const refus = [
      ['google', 'court\n' + SECRET_G + '\n'], ['google', 'client avec espace\n' + SECRET_G + '\n'], ['google', 'gclient-id-0123456789\n\n'], ['google', '\n\n'], ['google', 'gclient-id-0123456789\ncourt\n'],
      ['microsoft', 'mclient-id-0123456789\n' + crypto.randomUUID() + '\n'], ['retirer', ''], ['inconnue', ''], [],
    ];
    const sorties = refus.map(([a, e]) => lancer(a === 'retirer' ? ['retirer', 'yahoo'] : (a ? [a] : []), e));
    v('identifiant trop court, avec un espace, secret absent, rien du tout, secret trop court, ID de secret Microsoft (GUID), fournisseur inconnu, commande inconnue, aucune commande : tous refusés (code 1)', sorties.map(x => x.code), refus.map(() => 1));
    vrai('   ⛔ le fichier est IDENTIQUE octet pour octet, et aucun secret n\'a été écrit sur la sortie', fs.readFileSync(cfg).equals(avant) && sorties.every(x => !x.sortie.includes(SECRET_G)));
    vrai('   l\'ID du secret Microsoft est refusé avec la phrase qui dit où trouver la VALEUR', /Valeur/.test(sorties[5].sortie));
    fs.writeFileSync(cfg, '{ pas du json');
    const illisible = lancer(['ouvrir']);
    v('une configuration illisible : refusée, non réécrite', [illisible.code, fs.readFileSync(cfg, 'utf8')], [1, '{ pas du json']);
    ecrire(Object.assign({}, base, { origines: undefined }));
    const sansOrigine = lancer(['ouvrir']);
    v('sans origine configurée ni adresse de retour, un bloc à moitié posé REFUSE (comme le démarrage le ferait)', [sansOrigine.code, lire().boitesMail], [1, undefined]);
  } catch (e) { console.log('  ✗ EXCEPTION', e && e.stack || e); process.exitCode = 1; }
  finally { try { fs.rmSync(racine, { recursive: true, force: true }); } catch (e) {} }
  fin();
})().catch(e => { console.log('  ✗ MORT', e && e.stack || e); process.exit(1); });
