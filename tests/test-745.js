/* ⛔ CE QUE CE FICHIER GARDE — LES 24 MOIS DE CONSERVATION DES CGV.

   `mentions-legales.html`, article 5, mot pour mot :

     « Un changement d'offre, une résiliation ou un impayé n'entraînent aucune suppression : le
       client retrouve l'intégralité de ses données s'il revient. Elles sont conservées 24 mois
       après la fin de l'abonnement, puis supprimées — le RGPD interdit de conserver des données
       personnelles sans limite de durée. Un courriel prévient le client 30 jours avant […] »

   Mesuré le 21 septembre 2026 : ZÉRO ligne de `server/` ne comptait ces 24 mois. C'est un
   engagement publié sur un site vivant, et le principe de limitation de conservation du RGPD.

   ⛔⛔ CE QUI EST GARDÉ ICI EST L'HORLOGE, PAS LA SUPPRESSION — et ce n'est pas un raccourci,
   c'est la décision. Supprimer automatiquement la base d'un client est la chose la plus
   dangereuse qu'on puisse écrire dans ce dépôt : un défaut n'abîme pas un écran, il efface le
   travail d'une entreprise. Elle s'écrira et s'allumera seule, sur décision de Justin.
   Le préavis par courriel non plus : il ANNONCE une suppression, et tant que rien ne supprime,
   l'envoyer serait mentir à un client et lui faire peur pour rien.

   ⚠️ CE QUI ÉTAIT URGENT, EN REVANCHE : **la date ne se rattrape pas.** Chaque jour sans « ne
   paie plus depuis le … » est un jour perdu POUR TOUJOURS — et le jour où la suppression
   s'écrira, celui qui la branche n'aura que deux choix, tous deux faux : dater tout le monde
   d'aujourd'hui (un client parti depuis trois ans repart pour 24 mois), ou dater au plus tôt
   (des suppressions le jour du déploiement). C'est la faute qu'on vient de refermer sur la
   suspension et ses sept jours.

   ⛔⛔ ET CE BANC A ÉTÉ VERT SUR DU CODE FAUX — la leçon de méthode la plus chère de la nuit.
   Son `lister()` était SYNCHRONE ; le vrai, dans `index.js`, appelle `espacePaye()` qui est
   `async` (elle interroge Stripe). Le module ne l'attendait pas : `!!promesse.paye` vaut
   `!!undefined`, donc FAUX pour tout le monde, donc **une horloge de suppression démarrée sur
   CHAQUE entreprise, y compris celles parfaitement à jour**. Mesuré sur le vrai serveur, pas
   déduit. La question n'était pas « le code est-il bon ? » mais « qu'est-ce que le banc ne
   joue pas ? ». Il joue désormais les DEUX formes. */
const fs = require('fs'), os = require('os'), path = require('path');

const RACINE = path.join(__dirname, '..');
let ok = 0, ko = 0;
const v = (t, a, b) => { const bon = JSON.stringify(a) === JSON.stringify(b); bon ? ok++ : ko++;
  console.log('  ' + (bon ? '✓' : '✗') + ' ' + t + (bon ? '' : '  → attendu ' + JSON.stringify(b) + ', reçu ' + JSON.stringify(a))); };
const vrai = (t, c) => v(t, !!c, true);

const { monterConservation } = require(path.join(RACINE, 'server', 'conservation.js'));
const JOUR = 86400000;
const BANC = fs.mkdtempSync(path.join(os.tmpdir(), 'conserv-745-'));
let n = 0;

/* ⚠️ `minuterie: false` : une minuterie par instance ferait vivre le banc une heure de plus, et
   `unref()` ne suffit pas quand on en monte vingt. On appelle `balayer()` à la main — c'est
   d'ailleurs ce qu'on veut éprouver.
   ⛔ `sync` choisit la FORME du `lister`. Par défaut il est ASYNCHRONE, comme le vrai. */
const monter = (espaces, dossier, sync) => {
  const d = dossier || path.join(BANC, 'i' + (++n));
  fs.mkdirSync(d, { recursive: true });
  return { c: monterConservation({ dossier: d, minuterie: false, journal: () => {},
    lister: sync ? (() => espaces()) : (async () => espaces()),
    intouchable: (t) => t === 'elan-gestion-beta' }), dossier: d };
};
const fichier = (d) => { try { return JSON.parse(fs.readFileSync(path.join(d, 'conservation.json'), 'utf8')); } catch (e) { return null; } };

(async () => {
  console.log('\n══ 1. ⛔ L\'HORLOGE PART QUAND LE CLIENT CESSE DE PAYER ══\n');
  {
    const etat = [{ t: 'a-1', paye: true }, { t: 'b-2', paye: false }, { t: 'elan-gestion-beta', paye: false }];
    const { c, dossier } = monter(() => etat);
    await c.balayer();
    const f = fichier(dossier);
    vrai('⛔ celle qui ne paie pas est datée', !!(f && f['b-2'] && f['b-2'].depuis));
    vrai('   celle qui paie ne l\'est pas', !(f && f['a-1']));
    /* ⛔ LES ESPACES TECHNIQUES N'ONT PAS D'ABONNEMENT. Leur donner une horloge de conservation,
       c'est les inscrire sur une liste de suppression pour un abonnement qui n'a jamais existé. */
    vrai('⛔ l\'espace TECHNIQUE est ignoré', !(f && f['elan-gestion-beta']));
    v('   `etat` d\'une entreprise qui paie rend `null`', c.etat('a-1'), null);
    v('   celle qui ne paie pas a 730 jours restants', c.etat('b-2').restants, 730);
    v('   et zéro jour écoulé', c.etat('b-2').jours, 0);
  }

  console.log('\n══ 2. ⛔⛔ `null` N\'EST PAS `0` — C\'EST CE QUI DÉCIDE D\'UN EFFACEMENT ══\n');
  {
    /* `null` veut dire « cette entreprise paie, il n'y a pas d'horloge », JAMAIS « zéro jour
       restant ». Le jour où la suppression lira ce champ, un `0` rendu pour « pas d'horloge »
       effacerait tout le monde. */
    const { c } = monter(() => [{ t: 'x', paye: true }]);
    await c.balayer();
    v('⛔ une entreprise inconnue rend `null`, jamais 0', c.etat('jamais-vue'), null);
    v('⛔ une entreprise qui PAIE rend `null`, jamais 0', c.etat('x'), null);
  }

  console.log('\n══ 3. ⛔ LE CLIENT REVIENT : L\'HORLOGE SE LÈVE ══\n');
  {
    /* Les CGV : « le client retrouve l'intégralité de ses données s'il revient ». Donc les
       24 mois repartent de zéro — les compter depuis le premier incident de paiement d'une
       entreprise qui a régularisé depuis serait contraire à ce qui est écrit. */
    let paye = false;
    const { c, dossier } = monter(() => [{ t: 'z', paye: paye }]);
    await c.balayer();
    vrai('   l\'horloge tourne', !!c.etat('z'));
    paye = true;
    const r = await c.balayer();
    v('   le balayage lève une horloge', r.leves, 1);
    v('⛔ et l\'entreprise revenue n\'en a plus', c.etat('z'), null);
    vrai('   le fichier non plus', !(fichier(dossier) || {}).z);
    paye = false;
    await c.balayer();
    v('⛔ un nouvel impayé repart de ZÉRO, pas de là où on s\'était arrêté', c.etat('z').jours, 0);
  }

  console.log('\n══ 4. ⛔ LE BALAYAGE HORAIRE NE REDÉMARRE PAS LE DÉLAI ══\n');
  {
    /* ⛔ Il tourne toutes les heures. S'il réécrivait la date à chaque passage, aucune horloge
       n'avancerait jamais d'une seconde — et personne ne le verrait, parce que tout aurait
       l'air de marcher. */
    const { c, dossier } = monter(() => [{ t: 'w', paye: false }]);
    await c.balayer();
    const d1 = fichier(dossier).w.depuis;
    for (let i = 0; i < 5; i++) await c.balayer();
    v('⛔⛔ cinq balayages ne bougent PAS la date', fichier(dossier).w.depuis, d1);
    v('   et ils ne posent rien de neuf', (await c.balayer()).poses, 0);
  }

  console.log('\n══ 5. ⛔ LE COMPTE À REBOURS, ET SES DEUX BORNES ══\n');
  {
    const { c, dossier } = monter(() => [{ t: 'v', paye: false }]);
    await c.balayer();
    const reg = fichier(dossier);
    const poser = (jours) => {
      reg.v.depuis = Date.now() - jours * JOUR;
      fs.writeFileSync(path.join(dossier, 'conservation.json'), JSON.stringify(reg));
      return monterConservation({ dossier: dossier, minuterie: false, journal: () => {},
        lister: async () => [{ t: 'v', paye: false }], intouchable: () => false });
    };
    let c2 = poser(0);
    v('   à l\'instant : 730 jours restants', c2.etat('v').restants, 730);
    vrai('   pas de préavis', !c2.etat('v').preavis);
    c2 = poser(699);
    v('   à 699 jours : 31 restants', c2.etat('v').restants, 31);
    vrai('   (toujours pas de préavis)', !c2.etat('v').preavis);
    /* ⛔ LE PRÉAVIS DES CGV : 30 jours avant l'échéance, donc au 700e jour. */
    c2 = poser(700);
    v('⛔ à 700 jours : 30 restants, et le PRÉAVIS s\'allume', c2.etat('v').restants, 30);
    vrai('   (les CGV promettent un courriel ici)', c2.etat('v').preavis);
    vrai('   mais pas encore échu', !c2.etat('v').echu);
    c2 = poser(730);
    v('⛔ à 730 jours : 0 restant, et c\'est ÉCHU', c2.etat('v').restants, 0);
    vrai('   (échu)', c2.etat('v').echu);
    /* ⛔ ET ÇA NE DESCEND PAS SOUS ZÉRO. Un client parti depuis trois ans rendrait -365, et un
       écran qui affiche « -365 jours restants » est un écran qu'on ne croit plus. */
    c2 = poser(1200);
    v('⛔ à 1 200 jours : 0, jamais un nombre négatif', c2.etat('v').restants, 0);
    vrai('   et toujours échu', c2.etat('v').echu);
  }

  console.log('\n══ 6. ⛔ CE QUE `/health` PUBLIE : DES NOMBRES, JAMAIS UN NOM ══\n');
  {
    /* ⛔ `/health` est PUBLIQUE. Y nommer une entreprise dirait au monde QUI ne paie plus —
       même règle que `mailRefus` et que le socle. */
    const { c } = monter(() => [{ t: 'entreprise-bernard-hygiene', paye: false },
      { t: 'entreprise-durand-nettoyage', paye: false }]);
    await c.balayer();
    const s = c.sante();
    v('   deux entreprises suivies', s.suivis, 2);
    v('   aucune en préavis', s.enPreavis, 0);
    v('   aucune échue', s.echus, 0);
    v('   la durée annoncée est publiée', s.jours, 730);
    v('⛔⛔ AUCUN identifiant d\'entreprise dans ce que /health publie',
      /bernard|durand|entreprise-/.test(JSON.stringify(s)), false);
    /* La Tour, elle, est gardée : elle a le droit de savoir QUI. */
    const l = c.tout();
    v('   la Tour, elle, voit les deux', l.length, 2);
    vrai('   avec leur identifiant', l.some(x => x.t === 'entreprise-bernard-hygiene'));
  }

  console.log('\n══ 7. ⛔ EN CAS DE DOUTE, ON NE DÉMARRE PAS D\'HORLOGE ══\n');
  {
    /* ⛔ Entre une horloge en retard et une horloge qui tourne à tort sur un client à jour, il
       n'y a pas d'hésitation : la seconde mène à un effacement. */
    const { c, dossier } = monter(() => { throw new Error('annuaire illisible'); });
    const r = await c.balayer();
    vrai('⛔ un annuaire illisible ne date personne', r.erreur === true && r.poses === 0);
    v('   et le fichier reste vide', fichier(dossier), null);
  }

  console.log('\n══ 8. ⛔ UNE ENTREPRISE DISPARUE DE L\'ANNUAIRE GARDE SA DATE ══\n');
  {
    /* ⚠️ On ne nettoie PAS sur absence : un annuaire momentanément illisible ou incomplet
       ferait perdre toutes les horloges d'un coup — et elles ne se rattrapent pas. Le ménage
       se fera AVEC la suppression, quand elle existera. */
    let liste = [{ t: 'p', paye: false }];
    const { c, dossier } = monter(() => liste);
    await c.balayer();
    const d1 = fichier(dossier).p.depuis;
    liste = [];
    await c.balayer();
    v('⛔ l\'horloge survit à une disparition de l\'annuaire', (fichier(dossier).p || {}).depuis, d1);
    vrai('   et `etat` la rend toujours', !!c.etat('p'));
  }

  console.log('\n══ 9. ⛔ CE MODULE NE SUPPRIME RIEN, ET ÇA SE VÉRIFIE ══\n');
  {
    /* ⛔⛔ LE CONTRÔLE LE PLUS IMPORTANT DU FICHIER. Tant que Justin n'a pas tranché, ce module
       ne doit contenir AUCUN chemin d'effacement. Le jour où la suppression s'écrira, ce
       contrôle tombera : c'est son rôle, obliger à ce que ce soit un geste conscient.
       ⚠️ Commentaires retirés d'abord : ce fichier PARLE de suppression à chaque paragraphe. */
    const SRC = fs.readFileSync(path.join(RACINE, 'server', 'conservation.js'), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
    v('⛔⛔ aucun `rmSync` dans conservation.js', /rmSync/.test(SRC), false);
    v('⛔⛔ aucun `unlink`', /unlink/.test(SRC), false);
    v('⛔⛔ aucun appel à `effacerEntreprise`', /effacerEntreprise/.test(SRC), false);
    /* ⛔ ET AUCUN COURRIEL : le préavis ANNONCE une suppression. */
    v('⛔ et aucun envoi de courriel', /mailer|sendMail|envoyer\(/.test(SRC), false);
    vrai('   il écrit son fichier en temporaire puis renommage', /renameSync/.test(SRC));
  }

  console.log('\n══ 10. ⛔ LA COUTURE AVEC LE SERVEUR ══\n');
  {
    const SRV = fs.readFileSync(path.join(RACINE, 'server', 'index.js'), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
    vrai('   le serveur monte l\'horloge', /require\('\.\/conservation'\)\.monterConservation\(/.test(SRV));
    /* ⛔⛔ `espacePaye()` EST ASYNCHRONE — l'appeler sans l'attendre rend une PROMESSE, donc
       `!!promesse.paye` vaut FAUX pour tout le monde, donc une horloge de suppression sur
       CHAQUE entreprise. Mesuré sur le vrai serveur le 21 septembre 2026. */
    vrai('⛔⛔ l\'appel à `espacePaye` est ATTENDU', /await espacePaye\(Object\.assign\(\{\}, e, \{ slug: slug \}\)\)/.test(SRV));
    /* ⛔ ET L'ENTRÉE PORTE LE SLUG — défaut attrapé par `test-727` sur ce code même.
       `espacePaye()` rattache par `[e.slug, e.t]`, et l'entrée du registre n'en a pas. */
    vrai('⛔ et il passe une entrée PORTEUSE DU SLUG', /espacePaye\(Object\.assign\(\{\}, e, \{ slug: slug \}\)\)/.test(SRV));
    /* ⚠️ UNE À LA FOIS : lancer un aller-retour Stripe par espace simultanément, c'est se faire
       limiter par Stripe le jour où il y aura cent clients — pour une tâche de fond que
       personne n'attend. */
    v('⚠️ et pas en `Promise.all` — une à la fois, Stripe n\'est pas pressé',
      /lister: async \(\) => \{[\s\S]{0,1400}?Promise\.all/.test(SRV), false);
    vrai('   les espaces techniques sont exclus', /intouchable: \(t\) => ESPACES_INTOUCHABLES\.includes/.test(SRV));
    /* ⛔⛔ ZONE MORTE TEMPORELLE : le montage DOIT venir après `ESPACES_INTOUCHABLES`. Mesuré —
       monté 1 700 lignes plus haut, le balayage initial jetait, ne datait RIEN, et `/health`
       répondait `actif:true, suivis:0`. C'est la panne qui a éteint toute la sauvegarde hors
       site le 19 septembre, dans ce fichier, pour la même raison.
       ⚠️ Et `typeof` ne garde pas de ça : sur une `const` en zone morte, `typeof` jette AUSSI. */
    const iListe = SRV.indexOf('const ESPACES_INTOUCHABLES =');
    const iMont = SRV.indexOf("require('./conservation').monterConservation(");
    vrai('⛔⛔ le montage vient APRÈS `ESPACES_INTOUCHABLES` (zone morte temporelle)',
      iListe > 0 && iMont > iListe);
    vrai('   `/health` publie l\'agrégé', /conservation: conservation \? Object\.assign\(\{ actif: true \}, conservation\.sante\(\)\)/.test(SRV));
    vrai('   la Tour a sa route, et elle est gardée', /app\.get\('\/api\/monitor\/conservation', monAdmin,/.test(SRV));
    /* ⛔ ET LA SURVEILLANCE LE LIT. Un champ de `/health` que personne ne lit est du code mort
       qui a l'air d'une garde — la leçon du 21 septembre, payée sur `mailRefus`. */
    const SURV = fs.readFileSync(path.join(RACINE, '.github', 'scripts', 'surveillance.js'), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
    vrai('⛔ la surveillance crie si l\'horloge n\'est PAS MONTÉE', /j\.conservation\.erreur/.test(SURV));
    vrai('⛔⛔ et si elle est montée mais que son BALAYAGE échoue', /j\.conservation\.balayageOk === false/.test(SURV));
    vrai('   et si une échéance est dépassée', /j\.conservation\.echus/.test(SURV));
    vrai('   et sur le préavis que personne n\'envoie encore', /j\.conservation\.enPreavis/.test(SURV));
  }

  console.log('\n══ 11. ⛔ UN `lister` SYNCHRONE MARCHE AUSSI ══\n');
  {
    /* Le vrai est asynchrone, mais un module qui casserait sur un `lister` non-promesse serait
       un piège pour le prochain appelant. `await` sur une valeur simple la rend telle quelle. */
    const { c } = monter(() => [{ t: 'sync-1', paye: false }], null, true);
    await c.balayer();
    vrai('   l\'horloge part aussi avec un `lister` synchrone', !!c.etat('sync-1'));
    v('   et le balayage se déclare réussi', c.sante().balayageOk, true);
  }

  console.log('\n══ 12. ⛔⛔ UN BALAYAGE QUI ÉCHOUE DOIT SE VOIR ══\n');
  {
    /* ⛔⛔ LE CONTRÔLE QUI MANQUAIT, ET UNE MESURE L'A DIT. Au premier montage sur le vrai
       serveur, `lister()` jetait (zone morte temporelle) : le balayage rendait `{erreur:true}`,
       personne ne le lisait, et `/health` répondait `actif:true, suivis:0` — EXACTEMENT ce que
       répond une horloge qui n'a rien à faire. Une horloge arrêtée ne se rattrape pas : chaque
       heure de silence est une date perdue définitivement. */
    let casse = true;
    const { c } = monter(() => { if (casse) throw new Error('annuaire illisible'); return [{ t: 'q', paye: false }]; });
    await c.balayer();
    v('⛔⛔ le dernier balayage se déclare EN ÉCHEC', c.sante().balayageOk, false);
    vrai('   et le motif est gardé', /illisible/.test(c.dernierBalayage().motif));
    v('   `suivis` reste à zéro — mais on sait POURQUOI', c.sante().suivis, 0);
    casse = false;
    await c.balayer();
    v('   une fois réparé, le balayage se redéclare bon', c.sante().balayageOk, true);
    vrai('   et l\'horloge part enfin', !!c.etat('q'));
  }

  console.log('\n══ 13. ⛔ LE MOTIF DISTINGUE UN PROSPECT D\'UN CLIENT PARTI ══\n');
  {
    /* Les CGV parlent de « 24 mois après la FIN de l'abonnement ». Un espace qui n'a JAMAIS eu
       d'abonnement n'a pas de « fin » à laquelle les rattacher. Le module ne tranche pas — ce
       n'est pas à lui de le faire — mais il GARDE l'information, parce qu'elle ne se retrouve
       plus après coup. */
    const { c } = monter(() => [{ t: 'prospect', paye: false, motif: 'aucune formule' },
      { t: 'parti', paye: false, motif: 'impayé (réglé par TEAM OP)' }]);
    await c.balayer();
    vrai('⛔ le prospect est marqué « jamais abonné »', c.etat('prospect').jamaisAbonne);
    vrai('⛔ le client parti ne l\'est PAS', !c.etat('parti').jamaisAbonne);
    v('   et le motif est gardé tel quel', c.etat('parti').motif, 'impayé (réglé par TEAM OP)');
    v('   `sante()` les compte à part', c.sante().jamaisAbonnes, 1);
  }

  try { fs.rmSync(BANC, { recursive: true, force: true }); } catch (e) {}
  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  process.exit(ko ? 1 : 0);
})().catch((e) => {
  console.error('\n✗ le banc est tombé : ' + (e && e.stack || e));
  console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗');
  process.exit(1);
});
