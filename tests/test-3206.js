/* ⛔ CE QUE CE FICHIER GARDE — LA RELECTURE DE SÉCURITÉ DES AGENTS AU TRAVAIL (30 octobre 2026, `gardien`) : « fusion sans risque interrupteur fermé, mais NON prête à allumer ».
       B1. la relance de Margaux : les FAITS de la facture (numéro, montant, date, ancienneté) sont écrits par le CODE dans une ligne fixe AVANT le paragraphe du modèle ; le contrôle refuse chez le modèle tout chiffre,
           toute date, tout nombre de jours, tout ultimatum (« avant le », « sous N jours », « faute de quoi », « procéderons ») ; le cas du gardien (ZZ99-4242, 12 septembre, ultimatum) est refusé ;
       B2. l'indemnité de 40 € : validation de Justin OBLIGATOIRE tant que `config.agents.indemniteConfirmee` n'est pas `true` ; aucune référence à un « article 7 » de CGV (il n'y en a pas dans le dépôt) ;
       B3. la grille : « juste » ou « répond à tout » sous 4 → à revoir, avec ou sans citation ; l'envoi automatique exige une moyenne ≥ 4,5 ET aucun critère sous 4 (les trois cas calculés par le gardien) ;
       A1. Camille, mode travail : un message sensible (« débité deux fois », litige, résiliation) classé facture/technique/question ne reçoit JAMAIS d'accusé automatique ;
       A2. les plafonds du mois en mode travail (100 / 35 / 15 $), réglables ; plafond atteint : alerte à Justin (une fois par jour) ET repli sur le gabarit du code, en validation, sans appel au modèle ;
       A3. un échec du mode travail (modèle refusé, erreur d'API) n'est plus silencieux : une ligne à Justin, une fois par jour et par cause, puis repli ; coupé, aucune alerte.
   Les mutations : scratchpad/mutations-securite-travail.py. */
'use strict';
const fs = require('fs'), path = require('path');
const RACINE = path.join(__dirname, '..');
const OPS = require(path.join(RACINE, 'server', 'agents-courriers-ops.js'));
const G = require(path.join(RACINE, 'server', 'agents-grille.js'));
const CERV = require(path.join(RACINE, 'server', 'cerveau.js'));
const CAM = require(path.join(RACINE, 'server', 'agent-camille.js'));
const bancC = require('./banc-agents-courrier.js'), bancG = require('./banc-agents-gestion.js');
const { NOTEUR_DEBUT, CHARTE_OUVERTE } = bancC;
let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + String(JSON.stringify(b)).slice(0, 400) + '\n      obtenu  : ' + String(JSON.stringify(a)).slice(0, 400)); } };
const vrai = (t, c, d) => v(t + (d !== undefined && !c ? ' — ' + String(d).slice(0, 300) : ''), !!c, true);
setTimeout(() => { console.log('  ✗ banc FIGÉ au-delà de 120 s'); console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); process.exit(1); }, 120000).unref();
const sansComm = s => s.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
const lire = f => fs.readFileSync(path.join(RACINE, f), 'utf8');
const J = 86400000;
const nettoyer = [];

const NOTES_5 = ['repond_a_tout', 'etape_suivante', 'longueur', 'juste', 'charte', 'personnalise', 'professionnel'].map(c => 'NOTE ' + c + ' : 5').join('\n');
const notes = (o, extra) => ['repond_a_tout', 'etape_suivante', 'longueur', 'juste', 'charte', 'personnalise', 'professionnel'].map(c => 'NOTE ' + c + ' : ' + (o[c] || 5)).join('\n') + (extra ? '\n' + extra : '');
const MAIL_OK = ['Objet : Votre question', '', 'Bonjour,', '',
  'Nous avons bien reçu votre message au sujet de votre abonnement OP GESTION, et nous vous en remercions. Vous nous demandez si l’application fonctionne sur téléphone : c’est le cas, OP GESTION s’utilise depuis le navigateur de votre ordinateur, de votre tablette et de votre téléphone, sans installation.', '',
  'Vous nous demandez aussi si votre équipe peut travailler en même temps sur les mêmes informations : oui, toute votre équipe travaille sur des informations à jour, le planning, les interventions et les fiches clients étant partagés.', '',
  'Si un autre point vous vient à l’esprit en parcourant l’application, répondez simplement à ce message : nous le lirons avec attention.', '', 'Bien cordialement,'].join('\n');
const RECU = 'Bonjour, est-ce que votre application marche sur téléphone ? Et mon équipe peut-elle travailler en même temps ? Merci.';
const ctxProduire = { profil: 'support', mots: [60, 400] };
const message = t => [{ role: 'user', content: t }];

const DOS = 'DOS-000123';
const LIRE = { texte: '', actions: [{ id: 'tu_1', nom: 'lire_fil_courriel', entree: {} }, { id: 'tu_2', nom: 'fiche_entreprise', entree: {} }] };
const ACCUSE_FACTURE = ['CATEGORIE : facture', 'Objet : Votre facture', '', 'Bonjour,', '',
  'Nous avons bien reçu votre message du jour au sujet de la facture de votre abonnement OP GESTION (dossier ' + DOS + '). Vous nous demandez pourquoi le montant prélevé ce mois-ci diffère de celui du mois dernier, et si la facture peut être envoyée directement à votre comptable.', '',
  'Nous avons confié l’examen du détail de votre abonnement à la personne qui s’occupe de la facturation. Elle reviendra vers vous par courriel avec une réponse précise sur le montant prélevé, et elle vous indiquera comment transmettre la facture à votre comptable.', '',
  'Pendant ce temps, vous gardez l’accès à toutes les fonctions de votre formule. Si un élément vous revient, par exemple la date du prélèvement qui vous a surpris, répondez simplement à ce message : nous le joindrons à votre dossier.', '',
  'Nous vous remercions de votre confiance et restons à votre disposition par retour de mail.', '', 'Bien cordialement,'].join('\n');
const ACCUSE_TECH = ACCUSE_FACTURE.replace('CATEGORIE : facture', 'CATEGORIE : technique').replace('Votre facture', 'Votre problème de connexion')
  .replace(/Nous avons bien reçu votre message du jour[^\n]*/, 'Nous avons bien reçu votre message au sujet de l’écran qui reste blanc quand vous ouvrez le planning de la semaine sur votre téléphone (dossier ' + DOS + '). Vous nous demandez si le problème est connu et comment retrouver vos interventions en attendant.')
  .replace(/Nous avons confié[^\n]*/, 'Nous avons transmis votre signalement à la personne qui s’occupe de la partie technique, avec le détail de votre téléphone et de la page concernée. Elle vérifie si le problème est déjà connu côté application ou serveur, puis revient vers vous par courriel.');
const ACCUSE_INCONNU = ACCUSE_FACTURE.replace('CATEGORIE : facture', 'CATEGORIE : inconnu').replace('Votre facture', 'Votre question')
  .replace(/Nous avons bien reçu votre message du jour[^\n]*/, 'Nous avons bien reçu votre question (dossier ' + DOS + ') : vous voulez savoir si OP GESTION peut s’interfacer avec le logiciel de comptabilité que votre cabinet utilise, et si l’export des factures se fait au format demandé par votre expert-comptable.')
  .replace(/Nous avons confié[^\n]*/, 'Cette réponse ne figure pas encore dans les informations dont nous disposons, et nous ne voulons pas vous répondre à la légère. Nous la faisons chercher par notre équipe, qui revient vers vous par courriel dès qu’elle est précise.');
const OUVERTURE_RESIL = 'CATEGORIE : resiliation\nNous avons bien lu votre message, et nous comprenons que l’équipe n’utilise finalement plus l’application autant que vous l’espériez. Nous vous remercions de nous l’avoir écrit simplement, avec le détail de votre situation.';
const OUVERTURE_REMB = 'CATEGORIE : remboursement\nNous avons bien lu votre message et nous comprenons votre déception : vous attendiez davantage de l’application pour votre première semaine. Nous vous remercions de nous avoir expliqué précisément ce qui vous a manqué.';
/* le texte d'une requête à Claude, messages et résultats d'outils à plat (JSON.stringify échapperait les guillemets des résultats) */
const aplat = req => (req.messages || []).map(m => (Array.isArray(m.content) ? m.content.map(c => c.content || c.text || '').join('\n') : String(m.content))).join('\n');
const poser = (Z, o) => { const m = Object.assign({ uid: 1, dossier: 'INBOX', boite: 'b-contact', mid: '<c1@banc-3201>', de: 'client@exemple-3201.fr', deNom: 'Hortense Valmont', pour: 'contact@teamop.fr', objet: 'Ma facture',
  texte: 'Bonjour, pourquoi le montant a changé ce mois-ci ? Peut-on envoyer la facture à ma comptable ? Mon numéro : 06 12 34 56 78.', ts: Z.horloge.t - 3600000, auto: false, protege: false, authentifie: true }, o); Z.messages[m.boite + '|' + m.dossier + '|' + m.uid] = m; return { boiteId: m.boite, dossier: m.dossier, uid: m.uid }; };
/* le faux Anthropic de Camille : d'abord les outils, puis le texte ; les réécritures reçoivent les textes suivants */
const jeu = (...reponses) => { const r = reponses.slice(); return { claude: () => (r.length > 1 ? r.shift() : r[0]) }; };
const MARGAUX = { repondreQuestion: async o => ({ ok: true, resume: 'Aucun impayé en cours pour ce dossier : aucune facture en attente de règlement.' }) };

const URL1 = 'https://invoice.stripe.com/i/acct_1ABC/live_YWNj';
const IMPAYE = { cle: 't-alpha', slug: 'alpha-proprete', dossier: 'DOS-000001', aboId: 'sub_alpha1', adresse: 'facturation-alpha@exemple-3206.fr', entreprise: 'Alpha Propreté' };
const FAITS_LIGNE = 'Facture concernée : n° AB12-0001, d’un montant de 15 €, émise le 1 octobre 2026, en attente de règlement depuis 3 jours.';
const BASE1 = 'Nous nous permettons de revenir vers vous au sujet de la facture détaillée ci-dessus : elle est en attente de règlement. Un incident de paiement arrive souvent, une carte expirée ou un plafond atteint suffit à l’expliquer.';
const BASE2 = 'Si quelque chose empêche le règlement, ou si vous pensez qu’il s’agit d’une erreur de notre part, répondez simplement à ce courriel : nous regarderons votre situation avec vous.';
const relanceTxt = (p1, p2) => ['Objet : Votre facture OP GESTION', '', 'Bonjour,', '', p1 || BASE1, '', p2 || BASE2, '', 'Bien cordialement,'].join('\n');
const route = (corps, notes) => req => (String(req.system).startsWith(NOTEUR_DEBUT) ? (notes || NOTES_5) : (typeof corps === 'function' ? corps(req) : corps));
function monde(o) {
  const emise = Date.UTC(2026, 9, 1, 8, 0, 0);
  const etat = { liste: [IMPAYE], facture: { numero: 'AB12-0001', montantEur: 15, emiseMs: emise, url: URL1 } };
  const m = bancG.monter(Object.assign({ t0: emise + 1 * J, modes: { margaux: 'auto', camille: 'auto' } }, o, { monde: { impayes: async () => ({ ok: true, liste: etat.liste, incertains: [] }), facture: async () => etat.facture } }));
  nettoyer.push(m); m.etat = etat; m.jour = n => { m.horloge.t = emise + n * J + 3600000; };
  return m;
}

(async () => {
  console.log('\n── 3206 · la relecture de sécurité des agents au travail ──');

  console.log('\nB1. Les faits de la relance sont écrits par le code');
  {
    v('le contrôle du corps du modèle : un corps sain n’a aucune faute', OPS.fautesCorpsRelance(relanceTxt()), []);
    for (const [nom, t, attendu] of [['un autre numéro de facture (le cas du gardien)', 'la facture ZZ99-4242', ['fait_du_modele']], ['une date en chiffres', 'émise le 12/09', ['fait_du_modele']], ['une date en lettres', 'émise le douze septembre', ['fait_du_modele']],
      ['un nombre de jours en chiffres', 'en attente depuis 45 jours', ['fait_du_modele']], ['un nombre de jours en lettres', 'en attente depuis quarante jours', ['fait_du_modele']],
      ['« avant le »', 'à régler avant le plus tôt', ['ultimatum']], ['« sous huit jours »', 'à régler sous huit jours', ['fait_du_modele', 'ultimatum']], ['« faute de quoi »', 'faute de quoi nous agirons', ['ultimatum']],
      ['« procéderons »', 'nous procéderons autrement', ['ultimatum']], ['« date limite »', 'la date limite est proche', ['ultimatum']]]) {
      v('⛔ refusé chez le modèle : ' + nom, OPS.fautesCorpsRelance(relanceTxt(BASE1 + ' ' + t + '.')).sort(), attendu.slice().sort());
    }
    const a = OPS.relanceTravail({ etape: 3, facture: { numero: 'AB12-0001', montantEur: 15, emiseMs: Date.UTC(2026, 9, 1) }, url: URL1, age: 3 }, BASE1 + '\n\n' + BASE2);
    vrai('la ligne des faits est écrite par le code, juste sous « Bonjour, » et AVANT le paragraphe du modèle', a.texte.indexOf(FAITS_LIGNE) > 0 && a.texte.indexOf('Bonjour,') < a.texte.indexOf(FAITS_LIGNE) && a.texte.indexOf(FAITS_LIGNE) < a.texte.indexOf(BASE1), a.texte.slice(0, 200));
    vrai('…son numéro est autorisé au contrôle (permis), pas un autre', a.autorises.permis.includes('AB12-0001') && OPS.controle(a.objet, a.texte, Object.assign({}, a.autorises, { lettre: false })).length === 0);
    vrai('…sans âge connu, la ligne ne dit pas de nombre de jours', !/depuis \d+ jour/.test(OPS.relanceTravail({ etape: 3, facture: { numero: 'AB12-0001', montantEur: 15, emiseMs: Date.UTC(2026, 9, 1) }, url: URL1 }, BASE1 + '\n\n' + BASE2).texte));

    let m = monde({ travail: true, claude: route(relanceTxt()) });
    m.jour(3); await m.margaux.passer();
    const bon = m.envoyes[0];
    vrai('⛔ de bout en bout : un corps sain part avec la ligne des faits du CODE, avant le paragraphe du modèle', m.envoyes.length === 1 && bon.texte.indexOf(FAITS_LIGNE) > 0 && bon.texte.indexOf(FAITS_LIGNE) < bon.texte.indexOf('revenir vers vous'), bon && bon.texte.slice(0, 250));
    const garde = relanceTxt('Nous revenons vers vous au sujet de la facture ZZ99-4242, émise le 12 septembre et restée sans règlement.', 'Merci de régler avant le 12 septembre 2026, sous huit jours, faute de quoi nous procéderons au recouvrement de la somme.');
    m = monde({ travail: true, claude: route(garde) });
    m.jour(3); await m.margaux.passer();
    v('⛔ LE CAS DU GARDIEN (ZZ99-4242, 12 septembre, ultimatum) : refusé trois fois par le code, la relance d’avant part, aucune relecture payée', [m.envoyes.length, (m.envoyes[0] || {}).texte, m.recus.filter(q => String(q.system).startsWith(NOTEUR_DEBUT)).length], [1, OPS.relanceImpaye({ etape: 3, facture: m.etat.facture, url: URL1 }).texte, 0]);
    vrai('…et ni le faux numéro, ni la date, ni l’ultimatum ne sont dans ce qui est parti', !/ZZ99|12 septembre|faute de quoi|procéderons/.test(JSON.stringify(m.envoyes)));
    for (const [nom, p1] of [['un autre numéro', BASE1 + ' Il s’agit de la facture ZZ99-4242.'], ['une date en lettres', BASE1 + ' Elle a été émise le douze septembre.'], ['un nombre de jours en lettres', BASE1 + ' Elle attend depuis quarante jours.'], ['un ultimatum sans mot de droit', BASE1 + ' Merci de régler avant le plus tôt possible.']]) {
      const mm = monde({ travail: true, claude: route(relanceTxt(p1)) });
      mm.jour(3); await mm.margaux.passer();
      v('⛔ de bout en bout, le modèle écrit ' + nom + ' : refusé par le code seul (aucun mot de droit en cause), la relance d’avant part', [mm.envoyes.length, (mm.envoyes[0] || {}).texte, mm.recus.filter(r => String(r.system).startsWith(NOTEUR_DEBUT)).length], [1, OPS.relanceImpaye({ etape: 3, facture: mm.etat.facture, url: URL1 }).texte, 0]);
    }
    const q = m.recus.find(r => String(r.system).startsWith('Tu es Margaux'));
    vrai('…le prompt dit au modèle de n’écrire AUCUN chiffre (la ligne est au serveur)', /tu n’en écris AUCUN/.test(q.system) && /AUCUN chiffre/.test(q.system));
  }

  console.log('\nB2. L’indemnité de 40 € attend Justin tant qu’elle n’est pas confirmée');
  {
    let m = monde({ travail: true, claude: route(relanceTxt()) });
    m.jour(7); await m.margaux.passer();
    v('⛔ sans `indemniteConfirmee` : la seconde relance (avec l’indemnité) n’est PAS envoyée, même en mode « auto » — elle attend dans les validations', [m.envoyes.length, (await m.validations('en_attente')).map(x => x.type)], [0, ['courrier_agent']]);
    m = monde({ travail: true, indemniteConfirmee: true, claude: route(relanceTxt()) });
    m.jour(7); await m.margaux.passer();
    vrai('avec `indemniteConfirmee: true` : elle part seule (charte ouverte), l’indemnité de 40 € dedans', m.envoyes.length === 1 && /indemnité forfaitaire de 40 €/.test(m.envoyes[0].texte));
    m = monde({ travail: true, claude: route(relanceTxt()) });
    m.jour(3); await m.margaux.passer();
    vrai('la PREMIÈRE relance (sans indemnité) n’a pas besoin de cette confirmation', m.envoyes.length === 1 && !/indemnit/.test(m.envoyes[0].texte));
    m = monde({ travail: true, indemniteConfirmee: 'oui', claude: route(relanceTxt()) });
    m.jour(7); await m.margaux.passer();
    v('« oui », 1, une chaîne : seul `true` confirme', m.envoyes.length, 0);
    const T7 = OPS.relanceTravail({ etape: 7, facture: { numero: 'AB12-0001', montantEur: 15, emiseMs: Date.UTC(2026, 9, 1) }, url: URL1, age: 7 }, BASE1 + '\n\n' + BASE2).texte;
    vrai('⛔ le texte cite les articles L. 441-10 et D. 441-5 du Code de commerce et PAS « l’article 7 de nos conditions générales » (aucune CGV dans le dépôt)', /L\. 441-10 et D\. 441-5 du Code de commerce/.test(T7) && !/article 7|conditions générales/i.test(T7), T7.slice(-700));
    const src = sansComm(lire('server/agent-margaux.js'));
    vrai('le champ `validation:` que personne ne lisait est supprimé de l’appel à `documents.courrier`', !/validation:\s*!!aRevoirT/.test(src) && /porte: 'relancer_impaye', aRevoirT \}/.test(src));
    vrai('index.js passe le réglage, vrai SEULEMENT pour `true` (jamais un défaut permissif)', /indemniteConfirmee: !!\(config\.agents && config\.agents\.indemniteConfirmee === true\)/.test(sansComm(lire('server/index.js'))));
    vrai('REPRISE.md note ce qui reste à faire (CGV, expert-comptable, `indemniteConfirmee`)', /indemniteConfirmee/.test(lire('REPRISE.md')) && /CGV/.test(lire('REPRISE.md')));
  }

  console.log('\nB3. La grille : le fond bloque, l’envoi automatique est plus exigeant');
  {
    const ecrire = textes => async () => ({ ok: true, texte: textes.length > 1 ? textes.shift() : textes[0] });
    const base = { agent: 'camille', demande: 'Voici le courriel reçu : ' + RECU, ctx: ctxProduire, contexteJuge: ['Catégorie : question'], recu: RECU };
    const rejouer = async (notesFn) => { const Z = bancC.monter({ modes: { camille: 'brouillon', lea: 'brouillon', victor: 'brouillon', margaux: 'brouillon' }, travail: true, notes: notesFn }); const r = await Z.travail.produire(Object.assign({ cerveau: Z.cerveau, ecrire: ecrire([MAIL_OK]) }, base)); Z.nettoyer(); return r; };
    let r = await rejouer(() => notes({ juste: 3 }));
    v('⛔ « juste » à 3, tout le reste à 5, SANS phrase citée : à revoir, jamais « bon »', [r.etat, r.fautes], ['a_revoir', ['grille_juste']]);
    r = await rejouer(() => notes({ juste: 3, repond_a_tout: 3 }));
    v('⛔ « juste » 3 + « répond à tout » 3 : à revoir, les deux fautes', [r.etat, (r.fautes || []).slice().sort()], ['a_revoir', ['grille_juste', 'grille_repond_a_tout']]);
    r = await rejouer(() => notes({ etape_suivante: 3, longueur: 3, charte: 3 }));
    vrai('⛔ trois critères à 3 (moyenne 4,14) : validé pour Justin mais JAMAIS « bon » (donc jamais un envoi automatique), avec la raison dite', r.etat === 'non_verifie' && /seuil d’envoi automatique/.test(r.raison) && r.moyenne > 4 && r.moyenne < 4.5, JSON.stringify([r.etat, r.raison, r.moyenne]));
    r = await rejouer(() => notes({ repond_a_tout: 4, etape_suivante: 4, longueur: 4, juste: 4, charte: 4, personnalise: 4, professionnel: 4 }));
    vrai('⛔ quatre partout (moyenne 4,0, aucun critère sous 4) : validé pour Justin, PAS d’envoi automatique', r.etat === 'non_verifie' && /seuil d’envoi automatique/.test(r.raison), JSON.stringify([r.etat, r.moyenne]));
    r = await rejouer(() => notes({ charte: 3 }));
    vrai('⛔ moyenne 4,71 mais UN critère à 3 : validé pour Justin, PAS d’envoi automatique', r.etat === 'non_verifie' && /seuil d’envoi automatique/.test(r.raison) && r.moyenne > 4.5, JSON.stringify([r.etat, r.moyenne]));
    r = await rejouer(() => NOTES_5);
    v('contre-épreuve : toutes les notes à 5 → « bon »', r.etat, 'bon');
    r = await rejouer(() => notes({ charte: 4, professionnel: 4 }));
    v('contre-épreuve : moyenne 4,71 et aucun critère sous 4 → « bon » (4 n’est pas bloquant)', r.etat, 'bon');

    // de bout en bout : Camille en mode « auto », charte ouverte
    const parcourir = async (notesFn) => {
      const Z = bancC.monter(Object.assign({ modes: { camille: 'auto' }, charte: CHARTE_OUVERTE, travail: true, dossierDe: () => '', margaux: MARGAUX, notes: notesFn }, jeu(LIRE, 'CATEGORIE : question\n' + MAIL_OK)));
      const rr = await Z.camille.surNouveauMessage(poser(Z, { objet: 'Téléphone', texte: 'Bonjour, est-ce que votre application marche sur téléphone ? Et mon équipe peut-elle travailler en même temps ? Merci.' }));
      const sortie = [rr.voie, Z.envoyes.length]; Z.nettoyer(); return sortie;
    };
    v('⛔ Camille en « auto » : notes à 5 → envoi direct', await parcourir(() => NOTES_5), ['direct', 1]);
    v('⛔ Camille en « auto » : trois critères à 3 → VALIDATION, rien n’est parti', await parcourir(() => notes({ etape_suivante: 3, longueur: 3, charte: 3 })), ['validation', 0]);
  }

  console.log('\nA1. Camille : un message sensible ne reçoit jamais d’accusé automatique');
  {
    const essayer = async (o, claude) => { const Z = bancC.monter(Object.assign({ modes: { camille: 'auto', margaux: 'auto' }, charte: CHARTE_OUVERTE, travail: true, dossierDe: () => DOS, margaux: MARGAUX }, claude)); const r = await Z.camille.surNouveauMessage(poser(Z, o)); const s = [r.categorie, r.voie, Z.envoyes.length]; Z.nettoyer(); return s; };
    v('⛔ « débité deux fois » classé « facture » : un brouillon en validation, rien n’est parti, même en « auto » avec la charte ouverte', await essayer({ objet: 'Débité deux fois', texte: 'Bonjour, j’ai été débité deux fois ce mois-ci pour mon abonnement.' }, jeu(LIRE, ACCUSE_FACTURE)), ['facture', 'validation', 0]);
    v('⛔ une menace d’avocat classée « technique » : idem', await essayer({ objet: 'Écran blanc', texte: 'Bonjour, mon écran reste blanc, et j’ai aussi été débité deux fois ce mois-ci.' }, jeu(LIRE, ACCUSE_TECH)), ['technique', 'validation', 0]);
    v('contre-épreuve : une question de facture ordinaire, même mode : l’accusé part seul', await essayer({}, jeu(LIRE, ACCUSE_FACTURE)), ['facture', 'direct', 1]);
    const src = sansComm(lire('server/agent-camille.js'));
    vrai('le code lie la validation au mode travail ET au message sensible (litige, erreur de paiement, résiliation)', /const validationT = \(\) => enTravail && \(sensible\(objet \+ '\\n' \+ texte\) \|\| erreurDePaiement\(objet \+ '\\n' \+ texte\) \|\| menaceDeLitige\(objet \+ '\\n' \+ texte\)\)/.test(src) && (src.match(/forceValidation: validationT\(\)/g) || []).length === 2);
  }

  console.log('\nA2. Les plafonds du mois en mode travail, et le repli quand ils sont atteints');
  {
    const pl = o => bancC.monter(o).cerveau.etatBudget().plafondsAgent;
    const travail = pl({ travail: true }), coupe = pl({});
    v('⛔ mode travail allumé : Camille 100 $, Léa 35 $, Margaux 15 $ (total 150 $, sous les 195 $)', [travail.camille, travail.lea, travail.margaux, travail.camille + travail.lea + travail.margaux], [100, 35, 15, 150]);
    v('⛔ mode travail COUPÉ : les plafonds du registre, au dollar près (35, 10, 10)', [coupe.camille, coupe.lea, coupe.margaux], [35, 10, 10]);
    v('allumé pour Camille seule : les deux autres gardent le registre', [pl({ travail: { camille: true } }).camille, pl({ travail: { camille: true } }).lea], [100, 10]);
    v('`config.agents.plafondsAgent` gagne toujours', [pl({ travail: true, cerveauCtx: { plafondsAgent: { camille: 60 } } }).camille, pl({ travail: true, cerveauCtx: { plafondsAgent: { camille: 60 } } }).lea], [60, 35]);
    v('les constantes du cerveau sont ces chiffres', CERV.PLAFONDS_TRAVAIL, { camille: 100, lea: 35, margaux: 15 });

    // Camille atteint son plafond du MOIS
    let Z = bancC.monter(Object.assign({ modes: { camille: 'brouillon' }, travail: true, dossierDe: () => DOS, cerveauCtx: { plafondsAgent: { camille: 0.00001 } } }, jeu(LIRE, ACCUSE_FACTURE)));
    await Z.camille.surNouveauMessage(poser(Z, {}));
    const avantN = Z.recus.length;
    let r = await Z.camille.surNouveauMessage(poser(Z, { uid: 2, mid: '<c2@banc-3206>' }));
    const alertes = () => Z.paroles.filter(p => /^Mode travail \(/.test(p.texte));
    v('⛔ plafond du mois atteint : AUCUN appel de plus, le CODE dépose l’accusé (gabarit) en validation', [r.repli, r.raison, r.voie, Z.recus.length - avantN], ['gabarit', 'plafond_agent', 'validation', 0]);
    const b = Z.fichierJson('agents-brouillons.json')[r.ref];
    vrai('…le brouillon est le gabarit du code, marqué « contrôle non fait » (jamais présenté comme relu)', b && b.texte === CAM.GABARITS.inconnu && b.controle.etat === 'non_verifie', b && JSON.stringify(b.controle));
    v('⛔ Justin est prévenu : UNE ligne « important » dans le fil de l’agent, qui dit la cause', [alertes().length, alertes()[0].niveau, alertes()[0].de === 'camille', /plafond du MOIS/.test(alertes()[0].texte)], [1, 'important', true, true]);
    await Z.camille.surNouveauMessage(poser(Z, { uid: 3, mid: '<c3@banc-3206>' }));
    v('…un troisième message le même jour : toujours UNE seule alerte', alertes().length, 1);
    Z.horloge.t += J;
    const r4 = await Z.camille.surNouveauMessage(poser(Z, { uid: 4, mid: '<c4@banc-3206>', de: 'quatre@exemple-3206.fr', ts: Z.horloge.t - 3600000 }));
    v('…le lendemain : l’alerte se redit (une par jour)', [alertes().length, r4.raison], [2, 'plafond_agent']); if (alertes().length !== 2) console.log('   [r4] ' + JSON.stringify(r4));
    Z.nettoyer();

    // plafond du JOUR
    Z = bancC.monter(Object.assign({ modes: { camille: 'brouillon' }, travail: true, dossierDe: () => DOS, cerveauCtx: { plafondsJour: { agentMin: 0.00001, agentPct: 0.00001 } } }, jeu(LIRE, ACCUSE_FACTURE)));
    await Z.camille.surNouveauMessage(poser(Z, {}));
    r = await Z.camille.surNouveauMessage(poser(Z, { uid: 2, mid: '<c2@banc-3206>' }));
    vrai('plafond du JOUR : même repli (gabarit en validation) et une alerte qui dit « JOUR »', r.repli === 'gabarit' && r.raison === 'plafond_jour' && Z.paroles.some(p => /^Mode travail \(/.test(p.texte) && /budget du JOUR/.test(p.texte)), JSON.stringify(r));
    Z.nettoyer();

    // coupé : aucune alerte, comportement d'avant
    Z = bancC.monter(Object.assign({ modes: { camille: 'brouillon' }, dossierDe: () => DOS, cerveauCtx: { plafondsAgent: { camille: 0.00001 } } }, jeu('CATEGORIE : facture')));
    await Z.camille.surNouveauMessage(poser(Z, {}));
    r = await Z.camille.surNouveauMessage(poser(Z, { uid: 2, mid: '<c2@banc-3206>' }));
    v('⛔ mode travail COUPÉ : le plafond atteint se comporte comme avant (le courriel attend, aucun repli, aucune alerte « Mode travail »)', [r.saute, r.repli, Z.paroles.filter(p => /^Mode travail \(/.test(p.texte)).length], ['plafond_agent', undefined, 0]);
    Z.nettoyer();

    // Margaux : le plafond atteint retombe sur la relance du code (sans modèle), et prévient
    const m = monde({ travail: true, cerveauCtx: { plafondsAgent: { margaux: 0.00001 } }, claude: route(relanceTxt()) });
    await m.cerveau.penser('margaux', 's', [{ role: 'user', content: 'x' }], {});
    m.jour(3); await m.margaux.passer();
    v('⛔ Margaux au plafond : la relance du CODE part (aucun modèle), et Justin est prévenu', [m.envoyes.length, (m.envoyes[0] || {}).texte, m.conversations.historique('margaux', 50).filter(p => /^Mode travail \(/.test(p.texte)).length], [1, OPS.relanceImpaye({ etape: 3, facture: m.etat.facture, url: URL1 }).texte, 1]);
  }

  console.log('\nA3. Un échec du mode travail se dit');
  {
    const SECRET = 'sk-ant-api03-SECRET-3206';
    let Z = bancC.monter(Object.assign({ modes: { camille: 'brouillon' }, travail: true, dossierDe: () => DOS, claude: () => new Error('boom ' + SECRET) }));
    await Z.camille.surNouveauMessage(poser(Z, {}));
    const al = () => Z.paroles.filter(p => /^Mode travail \(/.test(p.texte));
    vrai('⛔ modèle refusé / erreur d’API : UNE ligne à Justin, qui dit la cause en mots du code', al().length === 1 && /Le modèle a refusé ou n’a pas répondu/.test(al()[0].texte) && al()[0].niveau === 'important', JSON.stringify(Z.paroles));
    vrai('…sans un mot de l’API ni de la clé', !/boom|sk-ant|SECRET/.test(JSON.stringify(Z.paroles)));
    await Z.camille.surNouveauMessage(poser(Z, { uid: 2, mid: '<c2@banc-3206>' }));
    v('…même cause le même jour : pas de doublon', al().length, 1);
    Z.horloge.t += J;
    await Z.camille.surNouveauMessage(poser(Z, { uid: 3, mid: '<c3@banc-3206>', ts: Z.horloge.t - 3600000 }));
    v('…le lendemain : elle se redit', al().length, 2);
    Z.nettoyer();

    Z = bancC.monter({ modes: { camille: 'brouillon' }, dossierDe: () => DOS, claude: () => new Error('boom') });
    await Z.camille.surNouveauMessage(poser(Z, {}));
    v('⛔ mode travail COUPÉ : une panne du modèle ne fait aucune alerte « Mode travail » (le chemin d’avant, inchangé)', Z.paroles.filter(p => /^Mode travail \(/.test(p.texte)).length, 0);
    Z.nettoyer();

    // la fonction elle-même
    const Y = bancC.monter({ travail: { camille: true } });
    const lignes = () => Y.paroles.filter(p => /^Mode travail \(/.test(p.texte)).length;
    Y.travail.signaler('camille', 'erreur_api'); Y.travail.signaler('camille', 'requete');
    v('deux raisons d’une même cause (erreur d’API, requête refusée) : une seule ligne', lignes(), 1);
    Y.travail.signaler('camille', 'plafond_agent');
    v('…une autre cause (le plafond) : sa propre ligne', lignes(), 2);
    v('une pause, l’arrêt, les heures de travail sont des choix de Justin : aucune alerte', ['pause', 'arret', 'hors_heures', 'forme', 'inconnue'].map(x => Y.travail.signaler('camille', x).fait), [false, false, false, false, false]);
    v('un agent dont le mode est coupé (Léa ici) ne dit rien', [Y.travail.signaler('lea', 'erreur_api').fait, lignes()], [false, 2]);
    Y.nettoyer();
    const src = sansComm(lire('server/agents-travail.js'));
    vrai('les deux entrées du moteur (`travailler`, `produire`) signalent leurs échecs', /if \(!r\.ok && o && typeof o\.agent === 'string'\) signaler\(o\.agent, r\.raison\)/.test(src) && /if \(r && r\.etat === 'echec' && o && typeof o\.agent === 'string'\) signaler\(o\.agent, r\.raison\)/.test(src));
  }

  for (const m of nettoyer) m.nettoyer();
  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.log('  ✗ le banc a levé : ' + (e && e.stack || e)); console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); process.exit(1); });
