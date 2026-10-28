/* ⛔ CE QUE CE FICHIER GARDE — LES TROIS RÈGLES DE LA PROSPECTION FRANÇAISE QUE LÉA TIENT (28 octobre 2026).
     Justin : « sers-toi des skills marketing adaptés pour améliorer les agents qui prospectent ». Du fichier de droit des skills (`.claude/skills/prospecting/references/droit-francais.md`),
     `server/agent-lea.js` n'a retenu que ce qui est SÛR et se contrôle :
       0. la phrase d'opposition (RGPD art. 21 §4) est posée par le CODE, à part, juste avant « Bien cordialement, », une seule fois — jamais confiée au modèle ;
       1. Léa n'annonce AUCUNE relance (`relance_annoncee`, `agents-controle.js`) — et ce contrôle ne touche ni Hugo, ni Margaux, ni Chloé, ni Camille (ils n'envoient pas `sansRelance`) ;
       2. la consigne de Léa dit ces règles (ses mots sont dans `SYSTEM`) et la phrase ajoutée passe tous les contrôles du courriel (aucun mot de promesse, « essai » absent) ;
       3. de bout en bout, par les VRAIS modules (`tests/banc-agents-courrier.js`) : le brouillon rangé porte la phrase UNE fois, et un courriel qui annonce une relance est réécrit.
     Ce que ce banc NE garde PAS : que la réponse « stop » d'une personne soit traitée (c'est Camille, `REPRISE.md`), ni le point « particulier ou professionnel » du fichier de droit. */
'use strict';
const path = require('path');
const RACINE = path.join(__dirname, '..');
const { monter, COURRIEL_TOKA } = require('./banc-agents-courrier.js');
let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + String(JSON.stringify(b)).slice(0, 400) + '\n      obtenu  : ' + String(JSON.stringify(a)).slice(0, 400)); } };
const vrai = (t, c, d) => v(t + (d !== undefined && !c ? ' — ' + String(d).slice(0, 200) : ''), !!c, true);
setTimeout(() => { console.log('  ✗ banc FIGÉ au-delà de 90 s'); console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); process.exit(1); }, 90000).unref();
const compte = (t, motif) => (String(t).match(motif) || []).length;

(async () => {
  console.log('\n── 3141 · Léa : la prospection française (opposition, aucune relance) ──');
  const K = require(path.join(RACINE, 'server', 'agents-connaissance.js'));
  const CTRL = require(path.join(RACINE, 'server', 'agents-controle.js'));
  const LEA = require(path.join(RACINE, 'server', 'agent-lea.js'));
  const L = LEA.LIGNE_OPPOSITION;
  const CORPS = K.lireMail(COURRIEL_TOKA).corps;   // le corps seul : COURRIEL_TOKA est la réponse BRUTE du modèle, avec sa ligne « Objet : »

  console.log('\n0. La phrase d’opposition : posée par le code, à part, une seule fois');
  {
    vrai('(population) la phrase est trouvée et lisible', typeof L === 'string' && L.length > 60 && /stop/.test(L), L);
    const base = 'Bonjour,\n\nNous restons à votre disposition par retour de mail ou par téléphone.\n\nBien cordialement,';
    const r = LEA.avecOpposition(base);
    vrai('la phrase est ajoutée', r.includes(L));
    vrai('⛔ …dans un paragraphe à elle (RGPD art. 21 §4 : « clairement et séparément »)', r.includes('\n\n' + L + '\n\n'));
    vrai('…juste avant « Bien cordialement, », qui reste la dernière ligne', r.endsWith(L + '\n\nBien cordialement,'));
    vrai('⛔ …et la phrase qui précède n’est pas touchée', r.startsWith('Bonjour,\n\nNous restons à votre disposition par retour de mail ou par téléphone.\n\n'));
    v('une seconde application ne la double pas (idempotent)', LEA.avecOpposition(r), r);
    v('⛔ si le modèle l’a écrite malgré la consigne, le code n’en ajoute pas une seconde', compte(LEA.avecOpposition('Bonjour,\n\nTexte.\n\nSi vous ne voulez plus nous lire, répondez simplement « stop ».\n\nBien cordialement,'), /stop/g), 1);
    v('un texte qui ne finit pas sur « Bien cordialement, » n’est pas déformé (le contrôle l’a déjà refusé)', LEA.avecOpposition('Bonjour,\n\nTexte sans fermeture.'), 'Bonjour,\n\nTexte sans fermeture.');
    v('« Bien cordialement » avec ou sans virgule, espaces en fin de texte', LEA.avecOpposition('Bonjour,\n\nTexte.\n\nBien cordialement  \n\n').endsWith(L + '\n\nBien cordialement,'), true);
    v('rien (ou autre chose qu’un texte) ne plante', [LEA.avecOpposition(''), LEA.avecOpposition(undefined)], ['', '']);
  }

  console.log('\n1. La phrase passe tous les contrôles du courriel — elle n’en fait tomber aucun');
  {
    const corps = CORPS;
    const avec = LEA.avecOpposition(corps);
    vrai('(population) le courriel d’essai est un vrai courriel de Léa : il passe le contrôle du code SANS la phrase', CTRL.fautesDuCode('TeamOP — OP GESTION pour votre activité', corps, { profil: 'vente', sansRelance: true }).length === 0,
      JSON.stringify(CTRL.fautesDuCode('TeamOP — OP GESTION pour votre activité', corps, { profil: 'vente', sansRelance: true })));
    v('…et AVEC la phrase', CTRL.fautesDuCode('TeamOP — OP GESTION pour votre activité', avec, { profil: 'vente', sansRelance: true }), []);
    vrai('⛔ aucun mot de promesse, de délai, d’adresse, de lien, de numéro (refusDe)', !K.refusDe('TeamOP — OP GESTION pour votre activité', K.normaliserCorps(avec)), K.refusDe('TeamOP — OP GESTION pour votre activité', K.normaliserCorps(avec)));
    vrai('« essai » n’y figure pas (sinon « essai_trop_tot »)', !/essai/i.test(L));
    vrai('vouvoiement et « nous » (les contrôles du serveur)', /\bvous\b/.test(L) && /\bnous\b/.test(L) && !/\b(?:tu|ton|ta|tes|te|je)\b/i.test(L));
  }

  console.log('\n2. Léa n’annonce aucune relance — et ce contrôle ne vise qu’elle');
  {
    const faute = t => CTRL.fautesDuCode('TeamOP — OP GESTION', CORPS.replace('Nous restons à votre disposition par retour de mail ou par téléphone.', t), { profil: 'vente', sansRelance: true });
    for (const t of ['Sans réponse de votre part, nous vous relancerons.', 'Nous vous relancerons la semaine prochaine.', 'Faute de réponse, nous reviendrons en vous relançant.', 'Sans nouvelles de votre part, nous vous recontacterons.',
      'À défaut de réponse, nous vous rappellerons.', 'Nous nous permettrons de vous relancer.'])
      vrai('⛔ annoncée → relance_annoncee : « ' + t + ' »', faute(t).includes('relance_annoncee'), JSON.stringify(faute(t)));
    for (const t of ['Nous restons à votre disposition par retour de mail ou par téléphone.', 'Si le service vous intéresse, nous reviendrons vers vous à son ouverture.', 'Nous vous rappelons que l’essai se propose après vos réponses.',
      'Le rappel avant l’échéance d’un contrat d’entretien est prévu.', 'Nous vous remercions de votre réponse.'])
      v('une phrase juste n’est pas une relance : « ' + t + ' »', faute(t).includes('relance_annoncee'), false);
    const nue = CORPS.replace('Nous restons à votre disposition par retour de mail ou par téléphone.', 'Sans réponse de votre part, nous vous relancerons.');
    v('⛔ SANS `sansRelance` (Hugo, Margaux, Chloé, Camille) le contrôle ne s’applique pas : une relance de facture reste permise', CTRL.fautesDuCode('TeamOP — OP GESTION', nue, { profil: 'vente' }).includes('relance_annoncee'), false);
    vrai('la faute a sa phrase (ce que lit Justin et ce que reçoit l’auteur à la réécriture)', CTRL.FAUTES.relance_annoncee && /relance/.test(CTRL.FAUTES.relance_annoncee.phrase));
  }

  console.log('\n3. La consigne de Léa dit ces règles');
  {
    const S = LEA.SYSTEM;
    vrai('(population) la consigne est trouvée', S.length > 3000, S.length);
    vrai('le bloc des règles est dans la consigne', S.includes(LEA.REGLES_PROSPECTION));
    vrai('aucune relance annoncée', /n’annonces aucune relance/.test(S));
    vrai('« accepté / demandé » : l’inscription n’est pas un consentement à recevoir nos messages', /jamais que la personne a « accepté »/.test(S));
    vrai('aucun prix que celui de la liste', /aucun prix que celui de la liste/.test(S));
    vrai('qui écrit et pourquoi ; pas de « Re: »', /ne te fais jamais passer pour une personne/.test(S) && /« Re: »/.test(S));
    vrai('⛔ le modèle sait que la phrase d’opposition est posée par le serveur (pas de doublon)', /tu n’écris jamais la phrase d’opposition/.test(S) && /posée par le serveur juste avant « Bien cordialement, »/.test(S));
  }

  console.log('\n4. De bout en bout — les VRAIS modules, Claude simulé');
  {
    const Z = monter({ modes: { lea: 'brouillon' }, claude: () => COURRIEL_TOKA });
    const r = await Z.lea.surInscription({ entreprise: 'Toka Clim', email: 'gerant@toka-3141.fr' });
    vrai('un brouillon est déposé', r.depose === true, JSON.stringify(r));
    const b = (await Z.appeler('GET /api/monitor/agents/brouillons', { tourUser: Z.COLLAB, query: { refs: r.ref } })).corps[r.ref];
    v('⛔ le brouillon que Justin relit porte la phrase d’opposition UNE fois', compte(b.texte, /répondez simplement « stop »/g), 1);
    vrai('…avant « Bien cordialement, », qui finit le texte', b.texte.endsWith(L + '\n\nBien cordialement,'), b.texte.slice(-260));
    vrai('…et ce que le modèle a écrit est intact (la phrase de l’essai y est toujours)', /Dès réception de vos réponses/.test(b.texte));
    v('⛔ Claude n’a PAS reçu la phrase à écrire (il n’en reçoit que l’interdiction)', Z.recus.some(q => /répondez simplement « stop »/.test(JSON.stringify(q.messages))), false);
    vrai('la consigne envoyée à Claude porte les règles', Z.recus.length > 0 && /RÈGLES DE LA PROSPECTION EN FRANCE/.test(JSON.stringify(Z.recus[0].system)), Z.recus.length);
  }
  {
    /* la demande d'application RÉÉCRIT le brouillon qui attend (test-2862 § 5) : le texte réécrit porte la phrase lui aussi, une seule fois */
    let n = 0;
    const Z = monter({ modes: { lea: 'brouillon' }, claude: () => { n++; return n === 1 ? COURRIEL_TOKA : COURRIEL_TOKA.replace('Nous avons bien noté', 'Nous avons bien relevé'); } });
    const ADR = 'gerant@toka-3141d.fr';
    const r1 = await Z.lea.surInscription({ entreprise: 'Toka Clim', email: ADR });
    const r2 = await Z.lea.surDemande({ email: ADR, entreprise: 'Toka Clim', metier: 'chauffage', users: '5', formule: 'pro', besoin: 'planning' });
    v('la demande réécrit le brouillon (même référence)', [r2.reecrit, r2.ref], [true, r1.ref]);
    const b = (await Z.appeler('GET /api/monitor/agents/brouillons', { tourUser: Z.COLLAB, query: { refs: r1.ref } })).corps[r1.ref];
    vrai('⛔ le texte RÉÉCRIT est bien celui de la seconde réponse de Claude', /Nous avons bien relevé/.test(b.texte), b.texte.slice(0, 200));
    v('⛔ …et il porte la phrase d’opposition UNE fois, avant « Bien cordialement, »', [compte(b.texte, /répondez simplement « stop »/g), b.texte.endsWith(L + '\n\nBien cordialement,')], [1, true]);
  }
  {
    /* un courriel qui annonce une relance est réécrit une fois ; la réécriture en reçoit la raison */
    let n = 0;
    const AVEC = COURRIEL_TOKA.replace('Nous restons à votre disposition par retour de mail ou par téléphone.', 'Sans réponse de votre part, nous vous relancerons.');
    const Z = monter({ modes: { lea: 'brouillon' }, claude: () => { n++; return n === 1 ? AVEC : COURRIEL_TOKA; } });
    const r = await Z.lea.surInscription({ entreprise: 'Toka Clim', email: 'gerant@toka-3141b.fr' });
    vrai('un brouillon est déposé', r.depose === true, JSON.stringify(r));
    vrai('⛔ le courriel a été réécrit une fois : le contrôle a vu la relance', Z.recus.length >= 2 && /Ne pas annoncer de relance/.test(JSON.stringify(Z.recus[1].messages)), Z.recus.length);
    const b = (await Z.appeler('GET /api/monitor/agents/brouillons', { tourUser: Z.COLLAB, query: { refs: r.ref } })).corps[r.ref];
    vrai('…le texte rangé est la réécriture : aucune relance, et la phrase d’opposition', !/relanc/i.test(b.texte) && b.texte.includes(L), b.texte.slice(-300));
    v('le contrôle est « bon » après la réécriture', r.controle, 'bon');
  }
  {
    /* si la relance reste, le brouillon n'est pas envoyé seul : il attend Justin, avec la raison */
    const AVEC = COURRIEL_TOKA.replace('Nous restons à votre disposition par retour de mail ou par téléphone.', 'Sans réponse de votre part, nous vous relancerons.');
    const Z = monter({ modes: { lea: 'brouillon' }, claude: () => AVEC });
    const r = await Z.lea.surInscription({ entreprise: 'Toka Clim', email: 'gerant@toka-3141c.fr' });
    vrai('un brouillon est déposé, « à revoir » (jamais « bon »)', r.depose === true && r.controle === 'a_revoir', JSON.stringify(r));
    v('⛔ RIEN n’est parti', Z.envoyes.length, 0);
  }

  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.log('  ✗ le banc a levé : ' + (e && e.stack || e)); console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); process.exit(1); });
