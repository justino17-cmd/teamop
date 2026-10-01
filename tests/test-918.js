/* ⛔ CE QUE CE FICHIER GARDE — LA POSE DES IDENTIFIANTS OVH, LA SURVEILLANCE DE L'ARGENT ET LES GARDES DE CODE DU COMPTE PAR TÉLÉPHONE.

   Trois choses que ni le HTTP (`test-914` à `917`) ni les modules (`912` et `916`) ne voient :

     · `configurer-sms.js` : « on ne fait jamais afficher un secret sur le VPS ». Joué pour de bon contre un FAUX OVH qui vérifie la
       signature : les trois clés ne sont affichées NULLE PART (ni sortie standard, ni erreur), le fichier n'est réécrit qu'une fois les
       clés ÉPROUVÉES, des clés fausses ou un service inconnu ne modifient RIEN (octet pour octet), et la configuration écrite fait
       démarrer le VRAI service en mode « ovh » ;
     · la SURVEILLANCE (`.github/scripts/surveillance-messages.js`) : chaque champ de `/health.sms` est surveillé ou nommé « vu et pas
       surveillé » — sur le /health VIVANT du service —, et chaque alarme d'argent crie vraiment (coût du jour, budget, bouclier, échecs
       d'OVH, mode éteint en production) ; un /health sain ne crie pas ;
     · les GARDES DE CODE, qui visent du code et jamais une phrase (le texte est lu SANS ses commentaires) : le code d'un SMS vient de
       `crypto.randomInt`, la comparaison est à temps constant, le numéro n'est jamais un argument de journal, l'envoi n'a lieu qu'APRÈS
       le plan de numérotation, le bouclier, les plafonds et le budget — dans cet ordre —, et la porte de test est refusée en production ;
     · la DOCUMENTATION qui promet un chiffre le tient : les coûts de 1 000 et 10 000 inscriptions de `INSTALLER-LE-SERVEUR.md` sont
       recalculés ici depuis la table de prix.

   ⛔ UNE ANCRE QUI NE SE TROUVE PAS REND UNE TRANCHE VIDE, ET UNE TRANCHE VIDE PASSE AU VERT : chaque découpe prouve d'abord qu'elle a trouvé. */
const fs = require('fs'), os = require('os'), path = require('path');
const { spawn } = require('child_process');
const T = require('./outils-msg');
T.sauterSiSansDependances();
const TEL = require('./outils-tel');
const { v, vrai, fin } = T.compteur();
const S = require(path.join(T.RACINE, '.github', 'scripts', 'surveillance-messages.js'));
const SRC = (f) => fs.readFileSync(path.join(T.SERVICE, f), 'utf8');
const CODE = (f) => T.sansCommentaires(SRC(f));

/* Lance `configurer-sms.js` avec l'entrée standard REDIRIGÉE (le banc ; au clavier, la saisie est masquée) et capture tout. */
function configurer(env, lignes) {
  return new Promise((resolve) => {
    const p = spawn(process.execPath, [path.join(T.SERVICE, 'configurer-sms.js')], { env: Object.assign({}, process.env, env), stdio: ['pipe', 'pipe', 'pipe'] });
    let sortie = ''; p.stdout.on('data', d => { sortie += d; }); p.stderr.on('data', d => { sortie += d; });
    p.on('close', (code) => resolve({ code, sortie }));
    p.stdin.end(lignes.join('\n') + '\n');
    setTimeout(() => { try { p.kill('SIGKILL'); } catch (e) {} }, 30000).unref();
  });
}

(async () => {
  console.log('\n── 918 · configurer-sms.js : saisie, épreuve des clés, écriture atomique, aucun secret affiché ──');
  {
    const ovh = await TEL.fauxOvhService();
    const dossier = fs.mkdtempSync(path.join(os.tmpdir(), 'banc-cfgsms-'));
    const chemin = path.join(dossier, 'beta.json');
    const base = { origine: 'https://msg-beta.exemple', budgetJour: 7, sms: { budgetPaysJour: 2, interdits: ['+2519'] }, vapidPublicKey: 'vapid-conserve' };
    const ecrire = () => fs.writeFileSync(chemin, JSON.stringify(base, null, 2), { mode: 0o640 });
    ecrire();
    const env = { OPMSG_CONFIG: chemin, OPMSG_OVH_URL: ovh.base };
    const secrets = [TEL.APP, TEL.SECRET, TEL.CONSUMER];
    try {
      const bons = [TEL.SERVICE, 'OPMSG', TEL.APP, TEL.SECRET, TEL.CONSUMER];
      const r = await configurer(env, bons);
      v('les bonnes valeurs : sortie 0', r.code, 0);
      vrai('la population : le script a imprimé de quoi examiner (' + r.sortie.length + ' caractères)', r.sortie.length > 300);
      v('⛔ AUCUN des trois secrets n\'est affiché (sortie standard ni sortie d\'erreur) — c\'est la règle « on ne fait jamais afficher un secret sur le VPS »', secrets.filter(x => r.sortie.includes(x)), []);
      vrai('   mais les valeurs qui ne sont pas des secrets le sont (le nom du service, pour que Justin vérifie qu\'il a tapé le bon)', r.sortie.includes(TEL.SERVICE));
      vrai('   et il le dit : les clés sont éprouvées (un appel signé, aucun SMS) — le faux OVH a vu la signature juste et AUCUN job', ovh.signaturesFausses === 0 && ovh.jobs.length === 0 && /clés valides/.test(r.sortie));
      const ecrit = JSON.parse(fs.readFileSync(chemin, 'utf8'));
      v('⛔ la configuration existante est CONSERVÉE (budgets, interdits, clé VAPID, origine) ; seule `sms.ovh` s\'ajoute', [ecrit.origine, ecrit.budgetJour, ecrit.vapidPublicKey, ecrit.sms.budgetPaysJour, ecrit.sms.interdits], ['https://msg-beta.exemple', 7, 'vapid-conserve', 2, ['+2519']]);
      v('   les cinq valeurs sont rangées', [ecrit.sms.ovh.serviceName, ecrit.sms.ovh.expediteur, ecrit.sms.ovh.appKey === TEL.APP, ecrit.sms.ovh.appSecret === TEL.SECRET, ecrit.sms.ovh.consumerKey === TEL.CONSUMER], [TEL.SERVICE, 'OPMSG', true, true, true]);
      v('⛔ le fichier est en 0600 (le secret n\'est lisible que du service)', (fs.statSync(chemin).mode & 0o777).toString(8), '600');
      vrai('   et aucun fichier temporaire n\'est resté', fs.readdirSync(dossier).filter(f => f.includes('.tmp-')).length === 0);

      /* La configuration écrite fait démarrer le VRAI service en mode « ovh », et il envoie par ce faux OVH. */
      const svc = await TEL.lancerTel({ ovh, sms: Object.assign({}, ecrit.sms, { ovh: Object.assign({}, ecrit.sms.ovh, { urlBase: ovh.base }) }) });
      try {
        const h = (await T.client(svc.base).get('/health')).j.sms;
        const rr = await T.client(svc.base, { xff: TEL.reseauNeuf() }).post('/api/tel/code', { numero: TEL.numeroBE() });
        v('⛔ la configuration écrite par le script fait démarrer le service en mode « ovh », et un code part par OVH', [h.mode, rr.code, ovh.jobs.length], ['ovh', 200, 1]);
      } finally { await svc.arreter(); }

      /* Des clés FAUSSES ou un service inconnu ne modifient RIEN. */
      ecrire(); const avant = fs.readFileSync(chemin);
      const mauvais = await configurer(env, [TEL.SERVICE, 'OPMSG', TEL.APP, 'un-autre-secret-xyz1234', TEL.CONSUMER]);
      v('⛔ un secret FAUX : sortie 1, le message nomme la signature', [mauvais.code, /signature/.test(mauvais.sortie)], [1, true]);
      v('   et le fichier est resté OCTET POUR OCTET le même', fs.readFileSync(chemin).equals(avant), true);
      v('   et le secret faux n\'est pas affiché non plus', ['un-autre-secret-xyz1234', TEL.SECRET].filter(x => mauvais.sortie.includes(x)), []);
      const inconnu = await configurer(env, ['sms-zz999999-1', 'OPMSG', TEL.APP, TEL.SECRET, TEL.CONSUMER]);
      v('⛔ un service inconnu d\'OVH : sortie 1, « 404 », fichier intact', [inconnu.code, /404/.test(inconnu.sortie), fs.readFileSync(chemin).equals(avant)], [1, true, true]);
      const incomplet = await configurer(env, [TEL.SERVICE, 'OPMSG', TEL.APP, TEL.SECRET, '']);
      v('une valeur manquante : sortie 1, fichier intact', [incomplet.code, fs.readFileSync(chemin).equals(avant)], [1, true]);
      const long = await configurer(env, [TEL.SERVICE, 'UNEXPEDITEURTROPLONG', TEL.APP, TEL.SECRET, TEL.CONSUMER]);
      v('un expéditeur invalide (plus de 11 caractères) : refusé AVANT d\'aller déranger OVH, fichier intact', [long.code, fs.readFileSync(chemin).equals(avant)], [1, true]);
      const sansFichier = await configurer({ OPMSG_CONFIG: path.join(dossier, 'absent.json'), OPMSG_OVH_URL: ovh.base }, bons);
      v('⛔ un fichier de configuration qui n\'existe pas : refusé (le script MODIFIE une configuration, il n\'en crée pas)', [sansFichier.code, fs.existsSync(path.join(dossier, 'absent.json'))], [1, false]);
      fs.writeFileSync(chemin, '{ pas du json'); const casse = fs.readFileSync(chemin);
      const rc = await configurer(env, bons);
      v('un fichier qui n\'est pas du JSON : refusé, non touché', [rc.code, fs.readFileSync(chemin).equals(casse)], [1, true]);
      const sansVar = await configurer({ OPMSG_CONFIG: '' }, bons);
      v('sans OPMSG_CONFIG : refusé', sansVar.code, 1);
      ovh.mode = '500';
      ecrire(); const avant2 = fs.readFileSync(chemin);
      const coupe = await configurer(env, bons);
      vrai('(OVH injoignable ou en panne pendant l\'épreuve : le script n\'écrit rien non plus — ' + coupe.code + ')', fs.readFileSync(chemin).equals(avant2) || coupe.code === 0);
    } finally { await ovh.fermer(); fs.rmSync(dossier, { recursive: true, force: true }); }
    const src = CODE('configurer-sms.js');
    vrai('⛔ le code ne lit JAMAIS un secret en argument de ligne de commande (`ps` le montrerait à toute la machine)', !/process\.argv/.test(src));
    vrai('   il masque la saisie des trois clés (`_writeToOutput`) et ne réécrit pas une valeur masquée à l\'écran', /masque/.test(src) && /_writeToOutput/.test(src) && /\(masque \? '' : r\)/.test(src));
    vrai('   et il valide avec la MÊME fonction que le démarrage du service (`lireConfigSms`) avant ET après l\'écriture', (src.match(/lireConfigSms\(/g) || []).length >= 2);
  }

  console.log('\n── 918 · la SURVEILLANCE de l\'argent : le /health VIVANT, champ par champ ──');
  {
    const svc = await TEL.lancerTel(); const ovh = svc.ovh;
    try {
      await T.client(svc.base, { xff: TEL.reseauNeuf() }).post('/api/tel/code', { numero: TEL.numeroBE() });
      await T.client(svc.base, { xff: TEL.reseauNeuf() }).post('/api/tel/code', { numero: '+33812345678' });
      const h = (await T.client(svc.base).get('/health')).j;
      vrai('la population : le /health vivant porte un bloc `sms` avec un envoi et un refus (' + JSON.stringify(h.sms) + ')', h.sms && h.sms.envoyes24h === 1 && h.sms.refus.numero_non_mobile === 1);
      v('⛔ chaque champ `sms.*` du /health vivant est surveillé OU nommé « vu et pas surveillé » (un champ que personne ne lit est du code mort qui a l\'air d\'une garde)', S.nonClasses(h).filter(c => /^sms\./.test(c)), []);
      /* ⚠️ Les AUTRES champs du /health vivant (version, uptimeS, base.*, flux.*, porte.*, boucle.*, disque.*, quotasRefus) ne sont ni surveillés ni nommés
         dans `surveillance-messages.js` : c'est la dette que ce fichier annonce déjà (« à la fusion, le banc du service doit lire CES deux listes »),
         antérieure à ce chantier — la surveillance les signale en `::notice::` sans crier. On ne la masque pas : on la nomme ici. */
      vrai('(dette antérieure, nommée : ' + S.nonClasses(h).filter(c => !/^sms\./.test(c)).length + ' champs du /health vivant hors du bloc `sms` ne sont pas encore classés)', S.nonClasses(h).filter(c => !/^sms\./.test(c)).length >= 1);
      v('un bloc `sms` sain, tel que le service le publie, ne fait rien crier', S.evaluer({ ok: true, instance: 'beta', sha: 'a'.repeat(40), sms: h.sms }, 'beta'), []);
      const sms = Object.keys(h.sms).map(k => 'sms.' + k).sort();
      v('⛔ les champs `sms.*` publiés sont exactement ceux que la surveillance connaît (surveillés ou vus) — ni un de plus, ni un de moins', sms, S.CHAMPS_SURVEILLES.concat(Object.keys(S.CHAMPS_VUS)).filter(c => /^sms\./.test(c)).sort());
      v('⛔ le /health ne contient AUCUN numéro ni code', [/\+?32470\d{6}|\b\d{6}\b.*code/i.test(JSON.stringify(h)), JSON.stringify(h).includes('8123')], [false, false]);
      void ovh;
    } finally { await svc.arreter(); }
  }
  {
    const SAIN = { ok: true, instance: 'prod', sha: 'a'.repeat(40), sms: { mode: 'ovh', envoyes24h: 40, coutJourEur: 3.2, budgetJourPct: 16, budgetHeurePct: 4, boucliers: 0, ovhEchecs: 0, refus: { numero_non_mobile: 9, reseau_plafond: 2 } } };
    v('un service sain (40 SMS, 3,20 € dépensés, des refus de plafond) ne crie pas', S.evaluer(SAIN, 'prod'), []);
    const avec = (c) => S.evaluer(Object.assign({}, SAIN, { sms: Object.assign({}, SAIN.sms, c) }), 'prod');
    const cris = [
      ['⛔ plus de 12 € dépensés en 24 h (une fraude au SMS ?)', { coutJourEur: 13.5 }, /13[.,]5 €/],
      ['⛔ le budget du jour à 80 %', { budgetJourPct: 80 }, /80 % du budget du jour/],
      ['⛔ le budget de l\'heure à 85 % (un emballement ?)', { budgetHeurePct: 85 }, /85 % du budget de l'heure/],
      ['⛔ un pays en bouclier (une attaque, ou un vrai pic)', { boucliers: 1 }, /1 pays en mode bouclier/],
      ['⛔ trois envois de suite refusés ou perdus par OVH', { ovhEchecs: 3 }, /3 envois de suite/],
      ['⛔ des inscriptions refusées faute de budget', { refus: { budget_pays_jour: 4 } }, /budget_pays_jour ×4/],
      ['⛔ EN PRODUCTION, un mode « inactif » : plus personne ne peut s\'inscrire', { mode: 'inactif' }, /éteints en production/],
      ['⛔ EN PRODUCTION, un mode « journal » (aucun SMS ne part vraiment)', { mode: 'journal' }, /éteints en production/],
    ];
    vrai('la population : ' + cris.length + ' alarmes d\'argent', cris.length >= 8);
    for (const [nom, c, motif] of cris) { const p = avec(c); vrai(nom + ' → crie : ' + (p[0] || '(rien)'), p.length === 1 && motif.test(p[0])); }
    v('en BÊTA, le mode « journal » est normal (aucun SMS réel : rien à crier)', S.evaluer(Object.assign({}, SAIN, { instance: 'beta', sms: Object.assign({}, SAIN.sms, { mode: 'journal' }) }), 'beta'), []);
    v('un refus qui n\'est pas un budget (plafond de réseau, numéro non mobile) ne fait pas crier : c\'est la défense qui travaille', avec({ refus: { reseau_plafond: 500, numero_non_mobile: 900, renvoi_trop_tot: 40 } }), []);
    v('⛔ le seuil d\'argent se règle (OPMSG_SMS_SEUIL_EUR) sans toucher au code', (() => { const a = process.env.OPMSG_SMS_SEUIL_EUR; process.env.OPMSG_SMS_SEUIL_EUR = '50'; const r = avec({ coutJourEur: 30 }); if (a === undefined) delete process.env.OPMSG_SMS_SEUIL_EUR; else process.env.OPMSG_SMS_SEUIL_EUR = a; return r; })(), []);
    vrai('l\'alarme ne cite jamais autre chose que des nombres et des motifs', cris.every(([, c]) => !/\+\d{6}/.test(avec(c).join(' '))));
  }

  console.log('\n── 918 · les GARDES DE CODE (le texte est lu SANS ses commentaires) ──');
  {
    const fich = ['telephone.js', 'sms-garde.js', 'sms-ovh.js', 'sms-prix.js', 'numero.js', 'configurer-sms.js'];
    const code = Object.fromEntries(fich.map(f => [f, CODE(f)]));
    for (const f of fich) vrai('population : ' + f + ' garde du code une fois ses commentaires retirés (' + code[f].split('\n').filter(l => l.trim()).length + ' lignes)', code[f].split('\n').filter(l => l.trim()).length > 20);
    const serveur = ['telephone.js', 'sms-garde.js', 'sms-ovh.js', 'sms-prix.js', 'numero.js'];
    v('⛔ aucun `console.` dans le code du service téléphonique : il ne parle que par `journaliser`, qui filtre ses champs', serveur.filter(f => /\bconsole\./.test(code[f])), []);
    v('⛔ aucun `Math.random` : un code de connexion ou une preuve ne se tire pas d\'un générateur prévisible', serveur.filter(f => /Math\.random/.test(code[f])), []);
    const tel = code['telephone.js'];
    vrai('⛔ le code d\'un SMS est tiré par `crypto.randomInt` (6 chiffres, zéros de tête gardés)', /crypto\.randomInt\(0, 1000000\)\)\.padStart\(6, '0'\)/.test(tel));
    vrai('⛔ la comparaison d\'un code (et d\'un défi) est à TEMPS CONSTANT : `crypto.timingSafeEqual`', /timingSafeEqual/.test(tel) && /timingSafeEqual/.test(code['sms-garde.js']));
    vrai('⛔ le numéro est HACHÉ par la clé maître (`scelleur.hmac(\'tel\'…`), le code aussi, lié au numéro', /scelleur\.hmac\('tel', 'numero'/.test(tel) && /scelleur\.hmac\('tel', 'code'/.test(tel));
    vrai('⛔ le code n\'est rangé QUE haché (`code_h: hCode(…)`), jamais tel quel dans `telCodePoser`', /telCodePoser\(\{ num_h, code_h: hCode\(num_h, code\)/.test(tel));
    /* Aucun appel de journal ne porte autre chose qu'un motif ou un pays. */
    const appels = [].concat(...serveur.map(f => Array.from(code[f].matchAll(/journaliser\(([^;]*)\)/g)).map(m => [f, m[1]])));
    vrai('la population : ' + appels.length + ' appel(s) de journal dans le code du téléphone (le contrôle ci-dessous n\'est pas vide)', appels.length >= 2);
    v('⛔ chaque appel de journal ne porte que `motif` et `pays` (jamais `numero`, `code`, `e164`, `num_h`)', appels.filter(([, a]) => /numero|e164|num_h|\bcode\b|req\./.test(a.replace(/'sms_[a-z]+'/g, ''))), []);
    const index = fs.readFileSync(path.join(T.SERVICE, 'index.js'), 'utf8');
    const champs = /CHAMPS_JOURNAL = new Set\(\[([^\]]*)\]/.exec(index);
    vrai('   et le journal ne laisse passer qu\'une liste blanche de champs, où le numéro n\'est pas : ' + (champs ? champs[1].replace(/\s+/g, ' ') : 'INTROUVABLE'), !!champs && !/numero|tel|e164|num_h|nom_/.test(champs[1].replace(/'nom'/, '')));
    /* L'ordre des défenses dans `tel.code` : plan de numérotation → appareil connu → inactif → bouclier → plafonds → budget → envoi. */
    const corpsCode = tel.slice(tel.indexOf("H_['tel.code']"), tel.indexOf("H_['tel.verifier']"));
    vrai('population : la tranche du gestionnaire `tel.code` est trouvée (' + corpsCode.length + ' caractères)', corpsCode.length > 1500);
    const i = (s) => corpsCode.indexOf(s);
    const ordre = ['analyse(b.numero)', "lireCookie(req, nomAppareil)", "sms.mode === 'inactif'", 'sms.bouclierDe(a.pays)', 'const portes = [', 'sms.reserver(', 'sms.envoyer('];
    const pos = ordre.map(i);
    vrai('⛔ l\'ordre des défenses est celui de la conception : numérotation, appareil connu, interrupteur, bouclier, plafonds, budget, envoi (toutes trouvées : ' + pos.join(' < ') + ')', pos.every(x => x > 0) && pos.every((x, k) => k === 0 || x > pos[k - 1]));
    vrai('⛔ rien n\'envoie un SMS ailleurs : UN seul appel à `sms.envoyer(` (telephone.js), UN seul à `ovh.envoyer(` (sms-garde.js), et aucun `fetch` hors de sms-ovh.js et de configurer-sms.js', (tel.match(/sms\.envoyer\(/g) || []).length === 1 && (code['sms-garde.js'].match(/ovh\.envoyer\(/g) || []).length === 1 && ['telephone.js', 'sms-garde.js', 'sms-prix.js', 'numero.js'].every(f => !/\bfetch\(|fetchImpl\(/.test(code[f])));
    vrai('⛔ le budget est réservé DANS une transaction (`stockage.tx`)', /stockage\.tx\(\(\) =>/.test(code['sms-garde.js']));
    vrai('⛔ un code n\'est jamais renvoyé dans la réponse HTTP (`res.json` de `tel.code` ne porte ni `code` ni `numero`)', !/res\.json\(\{[^}]*\b(code|numero|e164)\b/.test(tel.slice(i("H_['tel.code']"), i("H_['tel.verifier']"))));
    vrai('⛔ la recherche de contact ne rend jamais le numéro ni le nom de famille', !/rep = \{[^}]*\b(numero|nom|e164)\b/.test(tel));
    vrai('⛔ la porte de test des codes : le service refuse de démarrer en production (config.js) ET la porte ne s\'ouvre que si la configuration l\'a posée', /instance !== 'beta'/.test(CODE('config.js')) && /if \(config\.testCodes\)/.test(tel));
    vrai('⛔ en production, une base d\'API autre qu\'OVH est refusée (`URLS_OVH`)', /instance === 'prod' \? URLS_OVH\.test/.test(code['sms-garde.js']));
    vrai('⛔ aucun identifiant OVH ne sort par /health (`sante()` ne lit que des nombres)', !/cfg\.ovh|appSecret|consumerKey|appKey/.test(code['sms-garde.js'].slice(code['sms-garde.js'].indexOf('function sante'), code['sms-garde.js'].indexOf('return { mode, reserver'))));
  }

  console.log('\n── 918 · la DOCUMENTATION tient ses chiffres : les coûts de 1 000 et 10 000 inscriptions, recalculés depuis la table ──');
  {
    const { CREDITS } = require(path.join(T.SERVICE, 'sms-prix.js'));
    const doc = fs.readFileSync(path.join(T.RACINE, 'design', 'opmessages', 'INSTALLER-LE-SERVEUR.md'), 'utf8');
    const sec = doc.slice(doc.indexOf('## 10 bis'), doc.indexOf('## 11. La production'));
    vrai('la section SMS existe (population)', sec.length > 3000);
    const MIX = { FR: 40, BE: 10, MA: 8, US: 6, DZ: 4, SN: 4, CI: 4, IN: 4, BR: 4, RE: 3, CM: 3, GB: 3, DE: 3, CA: 2, ES: 2 };
    vrai('le mélange fait 100 %', Object.values(MIX).reduce((a, b) => a + b, 0) === 100);
    const credits = Object.entries(MIX).reduce((a, [p, w]) => a + CREDITS[p] * w, 0) / 100;
    const eur = (n) => Math.round(n).toLocaleString('fr-FR').replace(/ | /g, ' ') + ' €';
    const fr = [60, 69, 600, 690].map(eur);
    const mix = [1000 * credits * 0.06, 1150 * credits * 0.06, 10000 * credits * 0.06, 11500 * credits * 0.06].map(eur);
    for (const c of fr.concat(mix)) vrai('⛔ le document annonce « ' + c + ' » (recalculé depuis la table de prix : ' + credits.toFixed(3) + ' crédit en moyenne)', sec.includes(c));
    v('   et le document annonce le coût moyen d\'un SMS du mélange (0,095 €) et les 8 370 € d\'une attaque non plafonnée vers la Russie', [sec.includes('0,095 €'), sec.includes('8 370 €'), Math.round(CREDITS.RU * 0.06 * 10000)], [true, true, 8370]);
    vrai('⛔ le document dit de NE PAS activer la recharge automatique et de ne donner que deux droits à la clé', /recharge automatique/.test(sec) && /GET {3}\/sms\/sms-xx123456-1\n/.test(sec) && /POST {2}\/sms\/sms-xx123456-1\/jobs/.test(sec));
    vrai('⛔ le document ne demande JAMAIS de recoller un secret dans la conversation', /Tu ne les recolles \*\*jamais\*\*/.test(sec));
    const conc = fs.readFileSync(path.join(T.RACINE, 'design', 'opmessages', 'SERVEUR.md'), 'utf8');
    vrai('SERVEUR.md : le Pro entre par un lien de connexion créé par TEAM OP (étape 5)', /Le PRO n'est pas construit ici/.test(conc) && /lien de connexion créé par TEAM OP/.test(conc));
    vrai('SERVEUR.md : la connexion par clé d\'accès (passkey, WebAuthn : Face ID / empreinte) est PROPOSÉE comme étape suivante', /passkey, WebAuthn/.test(conc) && /Étape suivante, non construite/.test(conc));
    vrai('SERVEUR.md : l\'appel vocal est écrit comme étape suivante, sans prétendre qu\'OVH le permet', /je ne sais pas si OVH le permet/.test(conc));
  }
  fin();
})().catch(e => { console.log('  ✗ le banc est mort : ' + (e && e.stack || e)); process.exitCode = 1; fin(); });
