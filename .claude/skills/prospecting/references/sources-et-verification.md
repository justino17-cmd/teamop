# Sources, vérification et liste de suppression

Condensé et adapté de `sourcing-and-enrichment.md`, `data-sources.md` et `enrichment-playbook.md` (marketingskills, MIT) — la plupart de ces fichiers
décrivent des services d'enrichissement américains que TeamOP n'utilise pas ; ce qui reste vrai est gardé.

## Les trois règles de la source qui restent entières

1. **Définir à l'avance ce qu'est un résultat accepté** (une coordonnée professionnelle publique, sourcée, vérifiée), puis s'arrêter quand c'est atteint.
2. **Une erreur de recherche n'est pas une absence.** « Le site n'a pas répondu » ne veut pas dire « pas de site ». Les deux se notent différemment.
3. **Un fichier de prospects périme vite.** Revérifier ce qui a plus d'une semaine avant de le remettre à un envoi.

## Ce que TeamOP ne fait PAS (et pourquoi)

| La source américaine propose | Ici |
|---|---|
| Services d'enrichissement et de « cascade » (Apollo, Clay, FullEnrich, LeadMagic, ZoomInfo, Hunter, Snov…) | **Non.** Ils achètent ou déduisent des adresses nominatives dont nous ne connaissons pas l'origine ; chacun serait un sous-traitant de plus à déclarer dans `sous-traitance.html` et au registre. À rouvrir seulement si Justin le décide, avec Nina. |
| Deviner `prenom.nom@domaine` puis le « vérifier » | **Non** (`droit-francais.md` §6) : créer une donnée sur quelqu'un qui ne l'a pas donnée. |
| Services de vérification d'adresses (envoi de la liste à un tiers) | **Non** par défaut : la liste partirait chez un tiers. Voir ci-dessous la vérification sans tiers. |
| Identification des visiteurs d'un site (RB2B, etc.) | **Non** : recoupement de personnes à leur insu. |
| Aspiration LinkedIn / Google Maps | **Non**, jamais. |

## Vérifier une coordonnée sans l'envoyer chez quelqu'un

Dans l'ordre, et on s'arrête à la première coordonnée qui échoue :
1. **Syntaxe** correcte et domaine existant.
2. **Le domaine reçoit du courrier** : un enregistrement MX existe (`dig +short MX domaine`). Pas d'essai de connexion à la boîte, pas de « sonde SMTP » (elle ressemble à une attaque et grille le domaine d'envoi).
3. **L'adresse est celle publiée par l'entreprise** (la source est dans la fiche), pas une variante.
4. **Domaine « fourre-tout »** (catch-all, accepte n'importe quelle adresse) : on ne sait rien ; la coordonnée reste « À vérifier » et ne reçoit qu'un premier courriel, sous le plafond de Pauline.
5. Une adresse qui a **rebondi** sort de la liste et ne revient pas.

## La liste de suppression (la plus importante de toute la campagne)

- Une ligne par refus : **l'adresse (ou son empreinte), la date, la raison** (« stop » reçu, plainte, désinscription, rebond dur).
- Elle se lit **avant** chaque ajout à une liste : une entreprise qui y figure n'est pas candidate, quelle que soit sa note.
- Elle ne se purge pas avec le reste (`droit-francais.md` §5 et §7). Elle ne contient rien d'autre que ce qu'il faut pour ne pas recontacter.
- Pauline range déjà ces cas à l'état `refus` dans le relevé de la Tour. Une campagne qui part d'ailleurs (Léa, un envoi à la main de Justin) doit la consulter aussi.

## Sources de signaux, à lire plutôt qu'à extraire

Offres d'emploi publiques (leur existence, pas leurs candidats), immatriculations récentes (registre public), avis publics (le sujet, pas le nom de l'auteur),
annonces de chantier ou de recrutement sur le site de l'entreprise, actualités locales. Un signal est **une phrase datée avec son adresse web**, pas un fichier.
Jamais d'inférence sur une personne : on lit ce que l'ENTREPRISE a publié.
