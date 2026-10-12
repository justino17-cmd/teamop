/* ⛔ CE QUE CE FICHIER GARDE — PERSO, C'EST LES APPELS ET LES MESSAGES ; LES RÉUNIONS SONT À PRO. MODULES SEULS (famille 2 de SERVEUR.md § 3.11).

   Justin, 12 octobre 2026 : « Perso, c'est simple. C'est appel, message, et c'est tout. Créer des groupes d'appels, créer des groupes d'appels vidéo, mais pas de réunion. » Perso+ (le forfait d'une
   personne, 4 octobre 2026, dont le seul ajout était d'organiser des réunions) est RETIRÉ — « Le retirer » — ; et « un Pro peut inviter des Persos à des réunions, mais que par lien ». Ce fichier monte les
   VRAIS modules, sans HTTP (`test-992` joue les routes, `test-994` la page) :

     1. LA FORMULE : `formuleDe({ personne })` ne connaît plus que Perso, Pro et impayé ; `peutOrganiser` (organiser une réunion) et `inviteDirect` (y être invité EN SON NOM) sont Pro, et Pro seulement —
        un impayé n'en a pas, une ligne Perso+ restée dans la base ne donne RIEN ; la bêta ouvre tout MAIS `reel: true` la regarde pour de vrai ; l'espace de pièces suit (10 Go, 35 avec Pro) ;
     2. LA FACTURATION N'A PLUS DE PERSO+ : plus de module, plus de méthode, une configuration d'AVANT (avec son bloc `perso`) démarre encore et ne le lit pas ; la relecture des dix minutes ne lit que
        les espaces — une ligne Perso+ restée dans la base n'appelle pas Stripe ;
     3. UN COMPTE QUI S'EN VA N'APPELLE PLUS STRIPE : demander à partir, changer d'avis, être effacé — aucune file d'annulation, aucun appel, même avec une ligne Perso+ restée dans la base ;
     4. LA MIGRATION 10 RESTE : ses deux tables sont dans le schéma (un retour en arrière du déploiement lit encore leur code), plus aucune fonction ne les écrit, et les TROIS listes de la sauvegarde
        les portent toujours ;
     5. LE PLAFOND D'UNE RÉUNION : dix personnes au plus, organisateur compris — UNE constante, UN endroit (`plafondReunion`) où le supplément « Grandes réunions » la lèvera le jour où il existera (il n'est PAS
        activé : sans serveur de visio, dépasser dix est impossible), le stockage refuse la onzième personne (création, invitation, lien) en nommant le plafond, une personne déjà invitée n'est jamais
        refusée, et aucune route ne recopie le nombre.

   ⛔ UNE ASSERTION SUR UN ENSEMBLE VIDE PASSE ET NE PROUVE RIEN : chaque « zéro » ci-dessous est précédé de la population qu'il aurait pu compter (une ligne Perso+ posée, des appels faits à Stripe). */
'use strict';
const fs = require('fs'), os = require('os'), path = require('path'), crypto = require('crypto');
const T = require('./outils-msg');
const { fauxStripe } = require('./outils-stripe');
T.sauterSiSansDependances();
const { v, vrai, fin } = T.compteur();
const { ouvrir, MIGRATIONS } = require(path.join(T.SERVICE, 'stockage.js'));
const { creerScelleur } = require(path.join(T.SERVICE, 'scelle.js'));
const formuleMod = require(path.join(T.SERVICE, 'formule.js'));
const { creerFormule, REUNION_PERSONNES_MAX } = formuleMod;
const { creerFacturation } = require(path.join(T.SERVICE, 'facturation.js'));
const { facturationConfig, piecesConfig } = require(path.join(T.SERVICE, 'config.js'));

/* des valeurs de banc : des lettres hors de [0-9a-f] */
const CLE = ['rk', 'test', 'BancSansPersoZzQq9'].join('_');
const PRIX_PRO = { mensuel: 'price_BancProMensuelAa01', annuel: 'price_BancProAnnuelBb02' };
const PRIX_PP = { mensuel: 'price_BancPersoMensuelCc03', annuel: 'price_BancPersoAnnuelDd04' };
const JOUR = 86400000;

(async () => {
  const fake = await fauxStripe();
  fake.poserTarif(PRIX_PRO.mensuel); fake.poserTarif(PRIX_PRO.annuel, { unit_amount: 15000, recurring: { interval: 'year', interval_count: 1 } });
  const bac = fs.mkdtempSync(path.join(os.tmpdir(), 'banc-991-'));
  const h = { t: 1790000000000 };
  const kek = crypto.randomBytes(32);
  let S = null;
  try {
    S = ouvrir({ chemin: path.join(bac, 'msg.db'), scelleur: creerScelleur(kek), horloge: () => h.t });
    const formuleProd = creerFormule({ stockage: S, config: { formule: { toutOuvert: false } } });
    const formuleBeta = creerFormule({ stockage: S, config: { formule: { toutOuvert: true } } });
    const pers = (nom) => S.personneCreer({ identifiant: 'beta:' + nom + crypto.randomBytes(3).toString('hex'), prenom: nom, nom: 'Banc', origine: 'beta', verifie: true });
    const raw = () => new (require('node:sqlite').DatabaseSync)(path.join(bac, 'msg.db'));
    const compte = (sql, ...a) => { const d = raw(); try { return d.prepare(sql).get(...a).n; } finally { d.close(); } };
    /* ⛔ une ligne Perso+ RESTÉE dans la base (le code d'avant l'aurait écrite) : posée À LA MAIN, plus aucune fonction du stockage ne sait le faire */
    const restePerso = (uid, statut) => { const d = raw(); try { d.prepare('INSERT INTO abonnement_perso(personne, client, abonnement, statut, fin_periode, annule, relu_le, cree) VALUES(?, ?, ?, ?, ?, 0, ?, ?)').run(uid, 'cus_bp' + uid.slice(2, 8) + 'x', 'sub_bp' + uid.slice(2, 10) + 'x', statut, h.t + 20 * JOUR, h.t, h.t); } finally { d.close(); } };
    const proEspace = (uid, statut) => { const e = S.espaceCreer({ nom: 'E' + crypto.randomBytes(2).toString('hex'), proprio: uid }).id; S.abonnementPoser(e, { client: 'cus_bpe' + e.slice(2, 8), abonnement: 'sub_bpe' + e.slice(2, 10), statut: statut || 'active', places: 2, fin_periode: null, annule: false, impaye: statut === 'past_due' }, { adopter: true }); return e; };
    const vieillirImpaye = (e, jours) => { const d = raw(); try { d.prepare('UPDATE abonnement SET impaye_depuis = ?, relu_le = ? WHERE espace = ?').run(h.t - jours * JOUR, h.t, e); } finally { d.close(); } };

    /* ═══ 1. LA FORMULE ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════ */
    console.log('La formule d\'une personne : Perso, Pro, impayé — organiser une réunion et y être invité en son nom sont à Pro, et à Pro seulement');
    {
      const sans = pers('Sans');
      v('population : une personne sans rien est Perso, n\'organise pas (la raison dite est « perso ») et ne s\'invite pas en son nom', [formuleProd.formuleDe({ personne: sans.id }).formule, formuleProd.peutOrganiser(sans.id), formuleProd.inviteDirect(sans.id)],
        ['perso', { ok: false, formule: 'perso', motif: 'aucun', raison: 'perso' }, false]);
      const pro = pers('Pro'); proEspace(pro.id, 'active');
      v('une personne d\'un espace Pro PAYÉ : « pro », elle organise ET elle peut être invitée en son nom', [formuleProd.formuleDe({ personne: pro.id }).formule, formuleProd.peutOrganiser(pro.id).ok, formuleProd.inviteDirect(pro.id)], ['pro', true, true]);
      /* ⛔ la table des statuts Perso+ d'AVANT, posée telle quelle : plus rien ne la lit */
      const table = ['active', 'trialing', 'past_due', 'unpaid', 'canceled', 'incomplete', 'incomplete_expired', 'paused'];
      const lu = table.map(st => { const p = pers('St'); restePerso(p.id, st); return [st, formuleProd.formuleDe({ personne: p.id }), formuleProd.peutOrganiser(p.id).ok, formuleProd.inviteDirect(p.id)]; });
      v('population : huit lignes Perso+ restées dans la base, une par statut Stripe', compte('SELECT COUNT(*) AS n FROM abonnement_perso'), 8);
      v('⛔ une ligne Perso+ restée dans la base ne donne RIEN, quel que soit son statut — même `active` : Perso, motif « aucun », n\'organise pas, ne s\'invite pas en son nom (et un `past_due` ne fait pas d\'impayé)',
        lu, table.map(st => [st, { formule: 'perso', motif: 'aucun' }, false, false]));
      const imp = pers('Imp'); vieillirImpaye(proEspace(imp.id, 'past_due'), 9);
      v('un espace impayé depuis neuf jours : « impaye », il n\'organise pas (la raison dite est « perso » : c\'est Messages Pro qui manque) et ne s\'invite pas en son nom', [formuleProd.formuleDe({ personne: imp.id }).formule, formuleProd.peutOrganiser(imp.id), formuleProd.inviteDirect(imp.id)],
        ['impaye', { ok: false, formule: 'impaye', motif: 'impaye', raison: 'perso' }, false]);
      const sur = pers('Sursis'); vieillirImpaye(proEspace(sur.id, 'past_due'), 3);
      v('un espace en retard depuis TROIS jours (sursis) : encore Pro — il organise et il s\'invite en son nom (le sursis de l\'espace est inchangé)', [formuleProd.formuleDe({ personne: sur.id }).formule, formuleProd.peutOrganiser(sur.id).ok, formuleProd.inviteDirect(sur.id)], ['pro', true, true]);
      const deux = pers('Deux'); vieillirImpaye(proEspace(deux.id, 'past_due'), 9); proEspace(deux.id, 'active');
      v('deux espaces, l\'un impayé, l\'autre payé : la meilleure formule gagne (rien n\'est retiré à qui paie ailleurs)', [formuleProd.formuleDe({ personne: deux.id }).formule, formuleProd.peutOrganiser(deux.id).ok, formuleProd.inviteDirect(deux.id)], ['pro', true, true]);
      const ensemble = pers('Ens'); restePerso(ensemble.id, 'active'); vieillirImpaye(proEspace(ensemble.id, 'past_due'), 9);
      v('⛔ un espace impayé ET une ligne Perso+ `active` : impayé — la ligne Perso+ ne repêche plus personne', [formuleProd.formuleDe({ personne: ensemble.id }).formule, formuleProd.peutOrganiser(ensemble.id).ok], ['impaye', false]);
      /* la bêta ouvre tout, mais le RÉEL se regarde */
      v('⛔ la bêta ouvre tout (pro, organise, invité en son nom) pour qui n\'a rien, MAIS `reel: true` regarde la vraie formule', [formuleBeta.formuleDe({ personne: sans.id }).formule, formuleBeta.peutOrganiser(sans.id).ok, formuleBeta.inviteDirect(sans.id), formuleBeta.formuleDe({ personne: sans.id, reel: true }).formule], ['pro', true, true, 'perso']);
      let err = null; try { formuleProd.formuleDe({}); } catch (e) { err = e.message; }
      v('une formule sans espace ni personne est une erreur de code, jamais un « perso » silencieux', err, 'formuleDe : un espace ou une personne');
      /* ⛔ L'ESPACE DE PIÈCES (Justin, 12 octobre 2026 : « perso 10 GB et pro 25 GB », « ça s'ajoute ») : 10 Go à chacun, 25 Go DE PLUS avec Pro. Avec les valeurs de départ de la VRAIE configuration. */
      const pcDep = piecesConfig(undefined), Go = 1073741824;
      const fStock = creerFormule({ stockage: S, config: { formule: { toutOuvert: false }, pieces: pcDep } });
      const pp = pers('PlusAvant'); restePerso(pp.id, 'active');
      v('⛔ l\'espace de pièces suit la formule : Perso 10 Go, une ligne Perso+ restée 10 Go (comme Perso), impayé 10 Go (rien n\'est effacé, les nouveaux envois attendent), Pro 10 + 25 = 35 Go',
        [sans, pp, imp, pro].map(x => { const m = fStock.stockageMax(x.id); return [m.max / Go, m.perso / Go, m.pro / Go]; }), [[10, 10, 0], [10, 10, 0], [10, 10, 0], [35, 10, 25]]);
      v('… et sur la bêta (le drapeau : tout est Pro), une personne sans rien a 35 Go', creerFormule({ stockage: S, config: { formule: { toutOuvert: true }, pieces: pcDep } }).stockageMax(sans.id).max / Go, 35);
      /* — le module ne connaît plus Perso+ — */
      v('⛔ le module ne connaît plus que Pro pour organiser (`FORMULES_ORGANISATEUR`), n\'exporte plus le nom du forfait, et rend `inviteDirect`', [formuleMod.FORMULES_ORGANISATEUR, 'NOM_PERSO_PLUS' in formuleMod, typeof formuleProd.inviteDirect], [['pro'], false, 'function']);
      const codeF = T.sansCommentaires(fs.readFileSync(path.join(T.SERVICE, 'formule.js'), 'utf8'));
      vrai('… et son CODE (commentaires retirés) ne nomme plus ni « perso_plus » ni la table `abonnement_perso`', !/perso_plus|abonnement_perso|abonnementPerso/i.test(codeF));
    }

    /* ═══ 2. LA FACTURATION N'A PLUS DE PERSO+ ═══════════════════════════════════════════════════════════════════════════════════════════════════ */
    console.log('\nLa facturation n\'a plus de Perso+ : plus de module, une configuration d\'avant démarre encore, la relecture ne lit que les espaces');
    {
      vrai('⛔ le module de la facturation personnelle n\'existe plus (`facturation-perso.js`)', !fs.existsSync(path.join(T.SERVICE, 'facturation-perso.js')));
      const lus = fs.readdirSync(T.SERVICE).filter(f => f.endsWith('.js')).filter(f => /facturation-perso|perso_plus|persoPlus|abonnementPerso|annulationsTraiter|annulationsDues|NOM_PERSO_PLUS/.test(T.sansCommentaires(fs.readFileSync(path.join(T.SERVICE, f), 'utf8'))));
      v('⛔ aucun fichier du service ne nomme plus, dans son CODE, le module, le forfait, ses fonctions de stockage ni sa file d\'annulation', lus, []);
      /* — une configuration d'AVANT, avec son bloc `perso` — */
      let cfg = null, ecfg = null;
      try { cfg = facturationConfig({ facturation: { cle: CLE, prix: PRIX_PRO, perso: { prix: PRIX_PP, affichage: { mensuel: 5, annuel: 50 } }, relectureMs: 600000, timeoutMs: 3000 } }, { OPMSG_TEST_STRIPE: fake.hote }, 'beta'); } catch (e) { ecfg = e.message; }
      v('⛔ la configuration d\'AVANT (avec son bloc `perso`) démarre ENCORE — le serveur ne refuse pas de redémarrer pour un réglage devenu inutile — et ne le lit pas', [ecfg, cfg && 'perso' in cfg, cfg && cfg.prix], [null, false, PRIX_PRO]);
      const F = creerFacturation({ stockage: S, config: { facturation: cfg }, formule: formuleProd, horloge: () => h.t, fetchImpl: (...a) => fetch(...a) });
      v('la facturation est ouverte (Messages Pro se vend), et elle n\'a plus de `perso`, plus de `creerPerso`, plus d\'attente d\'annulation', [F.ouvert(), 'perso' in F, 'creerPerso' in F, 'annulationAttenteMin' in F], [true, false, false, false]);
      const ep = JSON.stringify(F.offres());
      v('… et l\'offre publique ne parle que de Messages Pro : ouverte, des offres, aucun tarif Perso+, aucun « perso »', [JSON.parse(ep).ouvert, JSON.parse(ep).offres.length > 0, ep.includes(PRIX_PP.mensuel) || ep.includes(PRIX_PP.annuel), /perso/i.test(ep)], [true, true, false, false]);
      /* — la relecture des dix minutes — */
      const nPerso = compte('SELECT COUNT(*) AS n FROM abonnement_perso WHERE statut IN (\'active\', \'trialing\', \'past_due\', \'unpaid\')');
      fake.vider();
      const r = await F.relireTous();
      const nEspaces = S.abonnementsARelire(200).length;
      v('population : des lignes Perso+ VIVANTES restent dans la base, des espaces sont abonnés, et la passe a bien parlé à Stripe', [nPerso > 0, nEspaces > 0, fake.appels.length > 0], [true, true, true]);
      v('⛔ la relecture des dix minutes ne lit que les ESPACES : son total est celui des espaces, et aucun appel à Stripe ne vise un abonnement Perso+', [r.total, r.total === nEspaces, 'perso' in r, fake.appels.filter(a => /sub_bp[^e]/.test(a.chemin + a.requete)).length], [nEspaces, true, false, 0]);
    }

    /* ═══ 3. UN COMPTE QUI S'EN VA N'APPELLE PLUS STRIPE ══════════════════════════════════════════════════════════════════════════════════════════ */
    console.log('\nUn compte qui s\'en va n\'appelle plus Stripe : demander à partir, changer d\'avis, être effacé — aucune file, aucun appel');
    {
      const partant = pers('Partant'); restePerso(partant.id, 'active');
      fake.vider();
      S.suppressionProgrammer(partant.id, h.t + 14 * JOUR);
      const annulee = S.suppressionAnnuler(partant.id);
      S.suppressionProgrammer(partant.id, h.t + 14 * JOUR);
      h.t += 15 * JOUR;
      const r = S.compteEffacer(partant.id);
      v('population : la personne avait une ligne Perso+ `active`, elle a demandé à partir, changé d\'avis, redemandé — et le compte est effacé', [!!annulee, r.effacee], [true, true]);
      v('⛔ rien n\'a été noté pour Stripe (la file `abonnement_a_annuler` est vide) et rien n\'est parti chez Stripe', [compte('SELECT COUNT(*) AS n FROM abonnement_a_annuler'), fake.appels.length, fake.resiliations.length], [0, 0, 0]);
      v('… et le stockage n\'a plus aucune des fonctions qui le faisaient', ['abonnementPersoPoser', 'abonnementPersoLire', 'annulationsDues', 'annulationNoter', 'persoAjuster', 'persoVersAnnulation'].filter(f => typeof S[f] === 'function'), []);
    }

    /* ═══ 4. LA MIGRATION 10 ET LES TROIS LISTES ═════════════════════════════════════════════════════════════════════════════════════════════════ */
    console.log('\nLa migration 10 reste : deux tables dans le schéma, plus rien ne les écrit, les trois listes de la sauvegarde les portent');
    {
      const m10 = MIGRATIONS.filter(m => m.v === 10);
      v('population : UNE migration 10, après la 9', [m10.length, MIGRATIONS.filter(m => m.v < 10).length], [1, 9]);
      const sqls = m10[0].sql;
      v('⛔ la migration 10 est INCHANGÉE (deux tables, un index, la version, rien d\'autre) : la retirer ou la changer casserait une base qui l\'a déjà, et le repli d\'un déploiement', [sqls.filter(s => /^CREATE TABLE IF NOT EXISTS /.test(s)).length, sqls.filter(s => /^CREATE UNIQUE INDEX IF NOT EXISTS /.test(s)).length, sqls.filter(s => /^PRAGMA user_version = 10$/.test(s)).length, sqls.length, sqls.some(s => /\b(ALTER|DROP|RENAME|INSERT INTO|DELETE FROM|UPDATE )\b/i.test(s))], [2, 1, 1, 4, false]);
      const d = raw();
      try {
        const tables = d.prepare(`SELECT name FROM sqlite_master WHERE type = 'table' AND name LIKE 'abonnement%' ORDER BY name`).all().map(r => r.name);
        v('les deux tables existent toujours à côté de `abonnement` (celui des espaces)', tables, ['abonnement', 'abonnement_a_annuler', 'abonnement_perso']);
      } finally { d.close(); }
      /* ⛔ plus rien ne les ÉCRIT : dans le code du stockage (commentaires retirés), les seules requêtes qui les nomment sont celles de la migration et des deux comptages de la sauvegarde */
      const codeS = T.sansCommentaires(fs.readFileSync(path.join(T.SERVICE, 'stockage.js'), 'utf8'));
      const ecrit = (codeS.match(/(INSERT\s+(OR\s+\w+\s+)?INTO|UPDATE|DELETE\s+FROM|REPLACE\s+INTO)\s+abonnement_(perso|a_annuler)\b/gi) || []);
      const lit = (codeS.match(/FROM\s+abonnement_(perso|a_annuler)\b[^`'"]*/gi) || []).map(s => s.trim()).sort();
      v('⛔ aucune requête du stockage n\'ÉCRIT plus dans `abonnement_perso` ni `abonnement_a_annuler`', ecrit, []);
      v('… et les seules qui les LISENT sont la sonde de la base vivante et le comptage d\'une copie (deux chacune)', lit, ['FROM abonnement_a_annuler', 'FROM abonnement_a_annuler LIMIT 1', 'FROM abonnement_perso', 'FROM abonnement_perso LIMIT 1']);
      const k = ouvrir.copie.controlerFichier(path.join(bac, 'msg.db'));
      const nonVides = Object.keys(S.sonde().nonVides), lignes = Object.keys(k.lignes);
      v('⛔ les TROIS listes (la sonde de la base vivante, le comptage d\'une copie, `TABLES_COMPTEES`) portent toujours les deux tables — en oublier une a déjà fait échouer chaque sauvegarde', [['abonnement_perso', 'abonnement_a_annuler'].map(t => [nonVides.includes(t), lignes.includes(t), ouvrir.copie.TABLES_COMPTEES.includes(t)])], [[[true, true, true], [true, true, true]]]);
      v('… et ces trois listes disent les MÊMES tables', [nonVides.slice().sort().join() === lignes.slice().sort().join(), nonVides.slice().sort().join() === ouvrir.copie.TABLES_COMPTEES.slice().sort().join()], [true, true]);
      v('… et une copie compte les lignes Perso+ restées (la sauvegarde ne les perd pas, ne les invente pas)', k.lignes.abonnement_perso, compte('SELECT COUNT(*) AS n FROM abonnement_perso'));
    }

    /* ═══ 5. LE PLAFOND D'UNE RÉUNION ═════════════════════════════════════════════════════════════════════════════════════════════════════════════ */
    console.log('\nUne réunion compte au plus DIX personnes, organisateur compris : une constante, un endroit pour le supplément, le stockage refuse la onzième, aucune route ne recopie le nombre');
    {
      const formuleP = creerFormule({ stockage: S, config: { formule: { toutOuvert: false } } });
      const quidam = pers('Quidam'), proP = pers('ProP');
      { const e = S.espaceCreer({ nom: 'Plafond', proprio: proP.id }).id; S.abonnementPoser(e, { client: 'cus_bpplafx2', abonnement: 'sub_bpplafx2', statut: 'active', places: 3, fin_periode: null, annule: false, impaye: false }, { adopter: true }); }
      v('population : le plafond est le MÊME pour une personne Perso et Pro — dix, organisateur compris — et c\'est la constante exportée', [formuleP.plafondReunion(quidam.id), formuleP.plafondReunion(proP.id), REUNION_PERSONNES_MAX], [10, 10, 10]);
      v('⛔ l\'endroit du supplément « Grandes réunions » existe (`plafondReunion(organisateur)`) et n\'est PAS activé : une entreprise Pro n\'a pas plus de dix (sans serveur de visio, dépasser dix est impossible)', [typeof formuleP.plafondReunion, formuleP.plafondReunion.length, formuleP.plafondReunion(proP.id) > REUNION_PERSONNES_MAX], ['function', 1, false]);
      /* — le stockage — */
      const hote = pers('HoteP'), foule = []; for (let i = 0; i < 12; i++) foule.push(pers('Foule').id);
      const j0 = h.t + 3 * JOUR;
      const creer = (invites, plafond) => S.reunionCreer({ hote: hote.id, titre: 'Plafond ' + invites.length, lieu: '', debut: j0, fin: j0 + 3600000, tz: 'Europe/Paris', rep: 'aucune', rappels: [15], invites, prochain: j0, finSerie: j0 + 3600000, plafond });
      const nReunions = () => compte('SELECT COUNT(*) AS n FROM reunion');
      const nPersonnes = (id) => compte('SELECT COUNT(*) AS n FROM reunion_invite WHERE reunion = ?', id);
      const n0 = nReunions();
      let e10 = null; try { creer(foule.slice(0, 10), 10); } catch (e) { e10 = [e.code, e.max]; }
      v('⛔ créer avec dix invités + l\'organisateur = ONZE personnes : `reunion_pleine`, le plafond est porté par l\'erreur (`max` 10), rien n\'est créé', [e10, nReunions() - n0], [['reunion_pleine', 10], 0]);
      const r9 = creer(foule.slice(0, 9), 10);
      v('population : neuf invités + l\'organisateur = dix personnes — créée (le refus du dessus venait bien du nombre)', [nReunions() - n0, nPersonnes(r9.id)], [1, 10]);
      let ei = null; try { S.reunionInviter({ id: r9.id, par: hote.id, uids: [foule[9]], plafond: 10 }); } catch (e) { ei = [e.code, e.max]; }
      v('⛔ inviter une ONZIÈME personne : `reunion_pleine`, et elle n\'est PAS ajoutée (la transaction ne garde rien)', [ei, nPersonnes(r9.id)], [['reunion_pleine', 10], 10]);
      const r5 = creer(foule.slice(0, 5), 10);
      let ei2 = null; try { S.reunionInviter({ id: r5.id, par: hote.id, uids: foule.slice(5, 11), plafond: 10 }); } catch (e) { ei2 = e.code; }
      v('⛔ une invitation qui ferait DÉPASSER (six invités de plus à une réunion de six personnes) est refusée EN ENTIER — personne n\'est ajouté à moitié', [ei2, nPersonnes(r5.id)], ['reunion_pleine', 6]);
      const ok4 = S.reunionInviter({ id: r5.id, par: hote.id, uids: foule.slice(5, 9), plafond: 10 });
      v('… et celle qui TIENT (quatre de plus, dix en tout) passe', [ok4.ajoutes.length, nPersonnes(r5.id)], [4, 10]);
      /* — le lien d'invité : la onzième personne n'entre pas, celle qui est déjà dedans n'est jamais refusée — */
      const code = S.reunionLien({ id: r5.id, par: hote.id }).code, plafonds = (organisateur) => formuleP.plafondReunion(organisateur);
      const onzieme = pers('Onzieme');
      let el = null; try { S.reunionInviteParCode({ code, uid: onzieme.id, plafonds }); } catch (e) { el = [e.code, e.max]; }
      v('⛔ la onzième personne qui entre par le LIEN : `reunion_pleine` (max 10) — elle n\'est pas inscrite', [el, compte('SELECT COUNT(*) AS n FROM reunion_invite WHERE reunion = ? AND uid = ?', r5.id, onzieme.id)], [['reunion_pleine', 10], 0]);
      const deja = S.reunionInviteParCode({ code, uid: foule[0], plafonds });
      v('une personne DÉJÀ invitée n\'est jamais refusée par le plafond (elle compte déjà) : « déjà »', [deja.ajoute, deja.reunion === r5.id], [false, true]);
      const r8 = creer(foule.slice(0, 7), 10), code8 = S.reunionLien({ id: r8.id, par: hote.id }).code;
      const entre = S.reunionInviteParCode({ code: code8, uid: onzieme.id, plafonds });
      v('contre-épreuve : une réunion de huit personnes accueille la neuvième par le lien (le refus vient du nombre, pas du lien)', [entre.ajoute, nPersonnes(r8.id)], [true, 9]);
      v('sans plafond donné (un appelant qui n\'en sait rien) le stockage garde sa borne STRUCTURELLE de cent invités, pas dix — le dix est une règle de produit, posée par les routes', [(() => { try { creer(foule.slice(0, 11), undefined); return 'accepté'; } catch (e) { return e.code; } })()], ['accepté']);
      /* — UNE constante : aucun fichier du service ne recopie le nombre — */
      const lisent = fs.readdirSync(T.SERVICE).filter(f => f.endsWith('.js')).filter(f => /REUNION_PERSONNES_MAX/.test(T.sansCommentaires(fs.readFileSync(path.join(T.SERVICE, f), 'utf8')))).sort();
      v('⛔ UNE constante : seuls `formule.js` (qui la définit et la rend) et `routes.js` (qui la PUBLIE à la page) la nomment — aucune route ne compare à un nombre, elle demande à `plafondReunion`', lisent, ['formule.js', 'routes.js']);
      const routesR = T.sansCommentaires(fs.readFileSync(path.join(T.SERVICE, 'routes-reunions.js'), 'utf8'));
      vrai('… et les quatre usages dans les routes de réunions passent tous par `plafondReunion` (créer, inviter, entrer par le lien, la fiche)', (routesR.match(/plafondReunion\(/g) || []).length === 4);
      /* ⛔ ce que la page LIT (`/api/config`) vient de la constante, pas d'un dix recopié : un « dix » écrit en dur passerait tous les bancs de VALEUR (c'est aussi dix) jusqu'au jour où la constante change — mutation éprouvée le 4 octobre 2026 */
      const routesG = T.sansCommentaires(fs.readFileSync(path.join(T.SERVICE, 'routes.js'), 'utf8'));
      vrai('… et `/api/config` publie `limites.reunion_personnes` DEPUIS la constante (jamais un nombre écrit en dur)', /reunion_personnes:\s*REUNION_PERSONNES_MAX\b/.test(routesG) && !/reunion_personnes:\s*\d/.test(routesG));
    }
  } catch (er) {
    console.log('  ✗ le banc est mort : ' + (er && er.stack || er));
    process.exitCode = 1;
  }
  try { if (S) S.fermer(); } catch (e) { /* déjà fermé */ }
  try { await fake.fermer(); } catch (e) { /* déjà fermé */ }
  try { fs.rmSync(bac, { recursive: true, force: true }); } catch (e) { /* déjà parti */ }
  fin();
})();
