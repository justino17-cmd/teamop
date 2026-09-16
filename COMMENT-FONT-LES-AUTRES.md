# Comment font les autres — Organilog, Praxedo, et le standard du métier

Demandé par Justin le 16 septembre 2026 : *« il faut fait tout sur des serveur comme tout les
entreprise ok donc regard comment les autres travaille gere organilog comme tout les
application de gestion »*.

Ce fichier n'est pas un plan, c'est un **relevé**. Il dit ce que font vraiment les logiciels du
même métier, avec les sources, puis compare point par point avec ce que fait TeamOP aujourd'hui
et ce que prévoit `PLAN-OP-SOCLE.md`. Tout ce qui vient d'une page publique est cité ; tout ce
qui vient d'une mesure du dépôt porte son fichier et sa ligne. **Ce qui n'a pas pu être vérifié
est dit comme tel** — les éditeurs ne publient pas leur architecture interne.

---

## 1. Organilog — le concurrent direct, y compris sur la 3D

Créé en 2014. SaaS pour les entreprises à équipes de terrain : CRM, devis, facturation,
planning, contrats, chantiers, tickets, achats, stocks, suivi des équipements. **Et un produit
dédié `organilog-3d.com`** — dératisation, désinsectisation, désinfection : plans d'appâtage
avec positionnement des postes par glisser-déposer, catégories par type de nuisible, rapports
PDF avec photos avant/après et signature client. C'est exactement le métier d'ELAN.

### Ce qu'ils disent de leur architecture

| Point | Ce qui est publié | Source |
|---|---|---|
| Hébergement | « Données hébergées en France », RGPD | organilog-3d.com, logicielfrance.com |
| Forme | SaaS web + application mobile | fr.organilog.com |
| **Base locale** | « L'application mobile Organilog est une application **hors-ligne**, cela signifie que l'application travaille avec **une base de données enregistrée sur l'appareil mobile** et que les échanges avec l'application web se font **lors des synchronisations** » | support.organilog.com |
| **Fréquence de synchro** | « Une synchronisation automatique est effectuée **toutes les 15 minutes** si l'application reste ouverte, il est possible et **conseillé d'effectuer après chaque modification de données une synchronisation manuelle** si le réseau le permet » | support.organilog.com |
| Modules hors ligne | Interventions, interventions non assignées, CERFA, carte, notes de frais, base client | support.organilog.com |
| Perte de données | « Attention : si vous supprimez la base sans sauvegarder ces images **elles seront perdues** » | support.organilog.com |
| Schéma couplé à la version | Après une mise à jour, il peut être « nécessaire de nettoyer cette base de données sur l'application mobile pour récupérer une version à jour, **et compatible avec la version installée** » | support.organilog.com |
| API | REST, format JSON, clients / adresses / interventions / devis / factures / techniciens / planning ; **privée, communiquée individuellement à partir du forfait Business** | fr.organilog.com/api-web-service |
| Sauvegardes | « Sauvegardes journalières » sur toutes les formules payantes | fr.organilog.com/offre |

### Leur grille tarifaire, et ce qu'elle apprend

| Formule | Prix / utilisateur / mois | Archivage | **Stockage** | Support |
|---|---|---|---|---|
| Basique | 0 € | 72 h | — | aucun |
| Pro | 19 € | illimité | **100 Go** | gratuit |
| Business | 35 € | illimité | **400 Go** | gratuit + API |
| Premium | 59 € (annuel) | illimité | **600 Go** | VIP |
| Premium + Carte | 64 € (annuel) | illimité | 600 Go | VIP |

⛔ **La ligne qui compte est celle du stockage.** Organilog **vend** le stockage : 100 Go, puis
400, puis 600. C'est une ressource comptée, facturée, et c'est un argument de montée en gamme.
Autrement dit : chez eux, **les photos et les pièces jointes sont la charge normale du
serveur**, pas un problème à contourner.

Chez TeamOP aujourd'hui, elles sont **retirées de la copie poussée** par `syncAlleger` pour
tenir dans le plafond (`CHANTIER-SORTIR-DU-DOCUMENT-UNIQUE.md:41-43`) : elles restent sur
l'appareil qui les a prises et ne sont **jamais partagées**. Ce n'est pas une différence de
réglage, c'est une fonctionnalité que le concurrent facture 19 € et que nous n'avons pas.

## 2. Praxedo — le gros de la catégorie

Créé en 2005, plus de 600 clients, 25 000 utilisateurs par jour. « 100 % SaaS hébergée en
France ». Deux chiffres publiés qui situent l'échelle : **200 000 synchronisations par jour**,
et des **sauvegardes sur trois serveurs différents**.

Leur propre article sur la souveraineté des données ne dit ni où, ni chez quel hébergeur, ni
s'il y a chiffrement. Il insiste sur trois choses : la localisation exigée par le RGPD, un
contrat qui définit les responsabilités de chaque partie, et **la réversibilité** — « garantissant
que l'entreprise pourra récupérer l'intégralité de ses données en cas de changement de
prestataire ».

## 3. Le point commun de tous : le serveur LIT les données

C'est la réponse à la question que Justin a posée le 15 septembre (*« il faut que tout soit
chiffré au niveau du serveur. Comme ça, peu importe le problème qu'on aura dans le futur, on
pourra tout voir »*), et elle est nette : **aucun de ces logiciels ne fait de chiffrement de
bout en bout.** Les données arrivent lisibles chez l'éditeur, qui est sous-traitant au sens de
l'article 28 du RGPD.

Ce n'est pas un relâchement, c'est la règle du métier, et les raisons sont documentées :

- « **La plupart des solutions SaaS n'offrent pas encore de véritable chiffrement de bout en
  bout** » ; « le chiffrement de bout en bout est nettement plus complexe à mettre en œuvre sur
  une architecture client-serveur, et si les données ne sont pas chiffrées lors du traitement
  par le service — ce qui est typiquement le cas pour des services SaaS — alors le chiffrement
  au repos et/ou en transit par le fournisseur ne constituent pas des mesures techniques
  supplémentaires efficaces » (CNIL, pratiques de chiffrement dans le cloud public).
- Implémenter un vrai bout-en-bout « peut rendre **caduques les fonctionnalités
  collaboratives** » (LeMagIT, sur l'offre de Google).

**Conclusion pour TeamOP, sans détour :** la position d'aujourd'hui — un serveur qui transporte
des blocs qu'il ne peut pas ouvrir — est **plus stricte que le standard**, et c'est précisément
ce qui rend un diagnostic impossible quand ELAN a un problème. Passer à un serveur qui lit,
chiffré au repos sous une clé TeamOP, **nous amène au niveau du marché, pas en dessous**. Ce
qui change n'est pas la sécurité, c'est le **contrat** : `sous-traitance.html` et
`index.html:319` disent aujourd'hui autre chose, et devront être réécrits — c'est déjà nommé
dans `PLAN-OP-SOCLE.md` §1.

⚠️ **Un fait déjà établi le 15 septembre et qu'il faut garder en tête ici** : « le serveur ne
peut RIEN lire » est **déjà faux au sens de la capacité**. La clé AES de chaque entreprise de
l'annuaire dort en clair dans `espaces.json` (`espaceCleOk()`, `server/index.js:2265`). Il ne
manquait pas la clé, il manquait vingt lignes de code. La séparation était organisationnelle,
pas cryptographique.

## 4. Le cloisonnement entre entreprises — quel modèle pour quelle taille

Trois modèles existent, et le choix dépend du nombre de clients, pas du goût :

| Modèle | Recommandé pour | Ce qu'on gagne / perd |
|---|---|---|
| Base partagée, **colonne `tenant_id`** | **> 1 000 clients**, ambition de millions d'utilisateurs | coût d'infrastructure minimal ; un `WHERE` oublié et une entreprise voit les données d'une autre |
| Base partagée, **un schéma par client** | **50 à 500 clients**, formules 200 à 2 000 €/mois | compromis ; « quelques centaines de schémas par instance PostgreSQL avant dégradation » |
| **Une base par client** | **< 50 clients**, formules 5 000 €/mois, secteurs réglementés | « isolation maximale : **zéro risque de fuite cross-tenant** » ; chaque base consomme RAM, CPU, stockage |

Source : guide technique multi-tenant 2026, HEXAIT.

**TeamOP a une poignée d'entreprises.** Le modèle « une base par client » retenu dans
`PLAN-OP-SOCLE.md` §2.2 (`/opt/teamop/data/socle/<t>/base.db`) est donc **exactement celui que
la littérature recommande à cette taille** — et c'est celui qui donne l'isolation maximale. La
phrase du plan — *« il n'y a pas de `WHERE entreprise_id` à oublier, la connexion EST le
cloisonnement »* — est la formulation exacte de l'argument standard : « queries don't need
`WHERE tenant_id` filters because there's nothing else in the database ».

### Les chiffres mesurés de ce modèle, et les deux qui nous concernent

Relevé d'un retour d'expérience en production (SQLite, un fichier par client) :

| | valeur |
|---|---|
| Limites du système de fichiers | **rien avant 5 000 clients** ; à 50 000+, inodes et taille de répertoire |
| Mémoire par connexion ouverte | 2 à 5 Mo |
| Connexions réellement ouvertes | 30 à 50 pour 200 clients actifs (fermeture après 10 min d'inactivité) |
| Migration de schéma | 10 à 50 ms **par base**, appliquée paresseusement à la première ouverture |
| Lecture de 100 lignes | **6× plus rapide** qu'en base partagée (200 clients) |
| Insertion | **10× plus rapide** |
| Mise à jour | **12× plus rapide** |
| **Comptage inter-entreprises** | ⛔ **21× plus LENT** |
| Suppression d'un client | **trois fichiers** : la base, son `-wal`, son `-shm` |
| Export d'un client | une copie de fichier |

**Deux corrections à porter dans `PLAN-OP-SOCLE.md` :**

1. ⛔ **Le comptage inter-entreprises est 21× plus lent.** La Tour de contrôle fait exactement
   ça : elle agrège sur toutes les entreprises. Le plan a déjà l'exception nommée
   (`socle-annuaire.db`, commun, avec une colonne `t`) — ce relevé confirme qu'elle n'est **pas
   un confort mais une nécessité de performance**, et que la Tour ne doit **jamais** balayer
   les fichiers par entreprise pour construire un tableau.
2. Le plan écrit *« Fermer une entreprise = effacer un fichier »*. En WAL, c'est **trois
   fichiers**. Effacer seulement `base.db` laisse un `-wal` qui peut contenir des écritures non
   fusionnées : la suppression serait incomplète, et silencieusement.

## 5. Ce que l'industrie a productisé — et que nous écrivons à la main

Le problème de TeamOP — une base locale sur chaque appareil, qui se synchronise avec un
serveur — a un nom et des produits en 2026 : **PowerSync, ElectricSQL, Replicache/Zero**.

- **PowerSync** : synchro bidirectionnelle complète, du serveur vers un **SQLite côté client**
  via des règles de synchro, et les écritures du client remontent par une **file d'attente
  persistante**. Les cas d'usage cités en premier sont « **field service tools**, mobile data
  collection, retail POS ».
- **ElectricSQL** : chemin de LECTURE seulement, en flux depuis PostgreSQL ; les écritures
  passent par votre propre API — choix délibéré pour garder l'architecture simple.
- **Replicache / Zero** : synchronise des **mutations** (des commandes nommées), pas des
  lignes ; navigateur uniquement, IndexedDB.

⚠️ **À lire honnêtement : l'architecture d'`OP SOCLE` est la même forme que PowerSync.** Une
ligne par enregistrement, un curseur serveur (`seq`) qui dit ce que l'appareil n'a pas vu, une
horloge client (`maj_le`) qui arbitre les conflits, une file d'écritures. C'est une validation
du dessin — nous n'inventons pas une bizarrerie, nous retrouvons la forme standard.

Faut-il alors acheter plutôt que construire ? **Non, et pour trois raisons nommées :**
`CLAUDE.md` pose « fait main plutôt qu'une dépendance de plus » sur un serveur exposé ;
PowerSync suppose un PostgreSQL et un service tiers de plus dans la chaîne (donc un
sous-traitant de plus à déclarer) ; et la partie vraiment spécifique de TeamOP — la fusion fine
des box ligne à ligne, les pierres tombales, le plafond de numérotation — resterait à écrire de
toute façon. Mais **la comparaison doit rester ouverte** : si le chantier dérape au-delà de son
budget, c'est l'issue de secours, et elle est chiffrable.

## 6. Le tableau qui répond à la question de Justin

| | Organilog / Praxedo | TeamOP **aujourd'hui** | TeamOP **après OP SOCLE** |
|---|---|---|---|
| Données hébergées | France, chez l'éditeur | Google Firestore (chiffré), clé sur le VPS | **VPS TeamOP, France** |
| Le serveur peut lire | **oui** | non (code manquant, pas la clé) | **oui, chiffré au repos** |
| Base locale sur l'appareil | oui | oui | oui |
| Synchro | **toutes les 15 min** + manuelle | **à chaque `save()`** | à chaque `save()`, par enregistrement |
| Unité envoyée | l'enregistrement | ⛔ **toute la base, remplacée en bloc** | l'enregistrement |
| Plafond par entreprise | 100 à 600 **Go** vendus | ⛔ **1 Mio**, dur (Google) | disque du VPS |
| Photos / pièces jointes | ✅ partagées, facturées | ⛔ **retirées de la synchro**, restent sur l'appareil | ✅ partagées |
| Sauvegarde des données métier | **journalière** (Praxedo : 3 serveurs) | celle de Google, jamais restaurée par nous | à écrire — **rien n'existe** |
| API pour le client | ✅ REST/JSON, palier Business | ❌ aucune | hors périmètre |
| Isolation entre entreprises | non publiée | un document par entreprise | **un fichier par entreprise** |

**Trois lectures à en tirer, et une seule est confortable :**

1. ✅ **Sur l'offline et la fraîcheur, TeamOP est DEVANT.** Organilog synchronise toutes les
   quinze minutes et *conseille* un geste manuel après chaque modification. TeamOP envoie à
   chaque enregistrement. Ce n'est pas rien sur le terrain : chez eux, deux techniciens sur la
   même tournée peuvent travailler un quart d'heure sur des données divergentes.
2. ⛔ **Sur le plafond et les pièces jointes, TeamOP est le seul à avoir ce problème.** Personne
   ne remplace toute la base d'une entreprise à chaque geste, et personne n'a de plafond de
   1 Mio. C'est la cause des pannes du 11 et du 15 septembre
   (`CHANTIER-SORTIR-DU-DOCUMENT-UNIQUE.md:32-46`), et c'est ce que le chantier supprime.
3. ⛔ **Sur la sauvegarde, personne n'est devant nous — nous n'avons rien.** Organilog vend des
   sauvegardes journalières, Praxedo en fait trois copies. Aujourd'hui la sauvegarde de TeamOP,
   c'est celle de Google, et **nous ne l'avons jamais restaurée**. Le jour où les données
   passent sur le VPS, ce point cesse d'être une négligence tolérable pour devenir **le risque
   numéro un** : `CHANTIER-SORTIR-DU-DOCUMENT-UNIQUE.md:105-109` le dit déjà — « le VPS devient
   le point unique de panne du travail des clients ».

## 7. Ce que ce relevé ne dit pas

À ne pas confondre avec une certitude :

- **Aucun de ces éditeurs ne publie son architecture interne.** Ce qui est écrit ici vient de
  leurs pages publiques, de leur documentation de support et de leur grille tarifaire. Le
  modèle de cloisonnement d'Organilog et de Praxedo n'est **pas** connu — les seuils du §4
  viennent de la littérature technique, pas d'eux.
- **La capacité disque du VPS n'a toujours pas été mesurée.** C'est l'étape 0 du plan, elle
  demande un accès SSH, et elle n'a jamais été faite. Tant qu'elle ne l'est pas, tout chiffre
  de volumétrie ici est une estimation.
- **Le chiffrement au repos des concurrents n'est pas établi.** L'absence de chiffrement de
  bout en bout est documentée ; ce qu'ils font au repos sur leurs disques ne l'est pas.

---

## Sources

- [Organilog — fonctionnalités](https://fr.organilog.com/fonctionnalites/) · [tarifs](https://fr.organilog.com/offre/) · [API Web Service](https://fr.organilog.com/api-web-service/) · [Organilog 3D](https://organilog-3d.com/)
- [Organilog — application mobile, vue d'ensemble](https://support.organilog.com/en/articles/6435630-organilog-mobile-application-overview) · [base locale et synchronisation](https://support.organilog.com/fr/articles/4141996-je-rencontre-des-problemes-avec-l-application-mobile-sur-android) · [API](https://support.organilog.com/en/articles/1534580-organilog-api)
- [Organilog sur logicielfrance.com](https://logicielfrance.com/logiciel/organilog) · [sur francenum.gouv.fr](https://www.francenum.gouv.fr/activateurs/organilog)
- [Praxedo — SaaS et souveraineté des données](https://www.praxedo.fr/notre-blog-specialise/saas-gestion-des-interventions-souverainete-des-donnees/) · [présentation SQI](https://sqi.fr/actus/blog/entry/optimisez-la-gestion-de-vos-interventions-avec-praxedo-en-mode-saas-et-espace-affaires)
- [HEXAIT — Architecture multi-tenant pour SaaS, guide technique 2026](https://www.hexait.fr/blog/architecture-multi-tenant-saas)
- [Multi-Tenant Data Isolation in SQLite: Per-User Database Files vs Row-Level](https://dev.to/helperx/multi-tenant-data-isolation-in-sqlite-per-user-database-files-vs-row-level-5glm) · [SQLite in Production](https://dev.to/helperx/sqlite-in-production-why-we-chose-it-over-postgres-for-a-multi-tenant-saas-44n8)
- [Sync Engines: Replicache, PowerSync, ElectricSQL — Deep Dive](https://adhdecode.com/edge-computing/offline-first-and-progressive-web-apps/sync-engines-replicache-powersync-electricsql/) · [ElectricSQL vs PowerSync vs Zero, 2026](https://trybuildpilot.com/648-electric-sql-vs-powersync-vs-zero-2026)
- [CNIL — Les pratiques de chiffrement dans l'informatique en nuage public](https://www.cnil.fr/fr/les-pratiques-de-chiffrement-dans-linformatique-en-nuage-cloud-public) · [CNIL — Guide du sous-traitant (PDF)](https://www.cnil.fr/sites/cnil/files/atoms/files/rgpd-guide_sous-traitant-cnil.pdf)
- [LeMagIT — SaaS : Google donne les clefs de chiffrement aux clients](https://www.lemagit.fr/actualites/252504259/SaaS-Google-donne-les-clefs-de-chiffrement-aux-clients)

*Relevé du 16 septembre 2026. Les pages des éditeurs changent : revérifier les tarifs et les
volumes de stockage avant de s'en servir dans une comparaison commerciale.*
