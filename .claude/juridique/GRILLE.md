# La grille juridique de TeamOP

Lue en premier par l'agent `juriste` (`.claude/agents/juriste.md`). Elle remplace le « profil de pratique » que les compétences d'Anthropic (`.claude/references/claude-for-legal/`) font remplir par entretien.

⛔ **Cette grille n'est pas un avis d'avocat et n'est pas exhaustive.** Elle dit quoi regarder, pas ce qui est légal. Les références de loi y sont **de mémoire** : chacune est à confirmer par un avocat avant de s'y fier, et l'agent écrit `[à vérifier]` quand il n'est pas sûr. Elle se tient à jour avec l'avocat de TeamOP quand il y en aura un (décision 7 du plan de la signature : « un seul passage sur le consentement, les CGU et la conservation »).

## 1. Où lire les FAITS (on ne les récite pas, on les lit)

| Fait | Où |
|---|---|
| Qui est l'éditeur, l'hébergeur, le directeur de la publication | `mentions-legales.html` |
| Ce que TeamOP dit faire des données | `confidentialite.html`, `registre-traitements.html` |
| Qui sont les sous-traitants, dans quel pays | `sous-traitance.html` |
| Ce que le code fait vraiment (durées, appels sortants, données envoyées) | `server/`, `server-courrier/`, `app.html` — avec `grep`, jamais de mémoire |
| Les décisions de Justin | `CLAUDE.md`, `REPRISE.md` |

Une page qui dit une chose et un code qui en fait une autre : **le code a raison, la page est fausse** — c'est un constat `BLOQUANT`.

## 2. Les positions de TeamOP (tirées du dépôt)

- **Signature** : électronique **simple**. Jamais « avancée », « qualifiée », « certifiée », « équivalente à la signature manuscrite ». Le pro doit recevoir et conserver le PDF signé et son dossier de preuve : le service les efface après la durée de conservation de sa configuration (90 jours par défaut pour une demande signée).
- **Qui paie, qui est suspendu** : plus de formule gratuite depuis le 30 septembre 2026 ; ce qui n'est pas payé est suspendu, **rien n'est effacé** (cf. `mentions-legales.html`). Un document ne promet jamais une gratuité qui n'existe plus.
- **L'application s'appelle OP GESTION** ; l'éditeur est TeamOP. **Aucun nom de client** dans un document de modèle, une page ou un exemple.
- **Aucun code promo, secret, clé ou adresse privée** dans un fichier servi, même comme exemple.
- **Données envoyées à l'IA** : l'assistant de devis envoie à Anthropic nom, adresse et ville de clients réels (`server/agent-devis.js`). Tout texte qui décrit ce traitement doit être exact, et `sous-traitance.html` doit le dire.
- **Adresse IP du visiteur** : `app.html` appelle des ressources chez des tiers (polices, bibliothèques) — l'adresse du visiteur part chez eux. Une page qui affirme qu'aucune donnée ne quitte l'appareil est `BLOQUANT`.

## 3. Les listes, par type de document

Pour chaque élément : **présent / absent / contraire à une position de TeamOP**. Le client est un **professionnel** (B2B) ou un **particulier** (B2C) : le document dit lequel, et les listes ne sont pas les mêmes — si le document ne le dit pas, c'est un constat.

### A. Devis
Émetteur identifié (dénomination, forme, capital, SIREN/RCS, TVA intracommunautaire, adresse, contact) · client identifié · date et **durée de validité** · désignation précise des prestations, lieu et date d'exécution · prix HT, TVA, TTC · conditions de paiement, acompte · **B2B** : pénalités de retard et indemnité forfaitaire de recouvrement (Code de commerce, L441-10 `[à vérifier]`) · **B2C** : information précontractuelle (Code de la consommation, L111-1 `[à vérifier]`), **droit de rétractation de 14 jours** si le contrat est conclu à distance ou hors établissement (L221-18 `[à vérifier]`) avec formulaire type et, si l'on commence avant la fin du délai, demande expresse du client (L221-25 `[à vérifier]`), médiation de la consommation (L612-1 `[à vérifier]`) · renvoi aux conditions générales, jointes ou accessibles · mention d'acceptation et date.

### B. Contrat de maintenance ou de prestation
Parties · objet précis · durée · **reconduction tacite** (B2C : information du consommateur avant l'échéance, L215-1 `[à vérifier]` ; B2B : durée et préavis clairs) · prix et révision · obligations (de moyens ou de résultat : le dire) · **responsabilité** : plafond, exclusions ; une clause ne peut pas exclure la faute lourde ou dolosive `[à vérifier]` · résiliation · force majeure · confidentialité · **données personnelles** : qui est responsable, qui est sous-traitant, accord de sous-traitance (RGPD art. 28) si TeamOP ou le pro traite des données pour un tiers · droit applicable et juridiction (B2C : le consommateur garde ses règles de compétence `[à vérifier]`) · **clauses abusives** (B2C : L212-1 `[à vérifier]` ; B2B : déséquilibre significatif, Code de commerce L442-1 `[à vérifier]`).

### C. Bon et rapport d'intervention (reçus par un client)
Intervenant et client identifiés · date, horaires, adresse · **produits utilisés** (nom, autorisation, type de produit biocide `[à vérifier]`), quantités, précautions, délai avant retour dans les lieux · constats · signature · si des **photos** montrent des personnes ou des lieux privés : information et consentement · aucun « ? » ni caractère cassé dans le PDF.

### D. Facture
Mentions obligatoires (Code de commerce L441-9 ; CGI art. 242 nonies A, annexe II `[à vérifier]`) · numérotation continue et sans trou · TVA ou mention d'exonération · date d'échéance, pénalités, indemnité forfaitaire · obligations de facturation électronique à venir `[à vérifier]`.

### E. Certificat de signature, courriels et page de signature
Aucun mot « avancée » ou « qualifiée » · **le texte de consentement** est clair, daté, versionné, et correspond à l'empreinte du certificat · ce qui est collecté (adresse réseau, navigateur) est **dit au signataire** et inscrit au registre · la durée de conservation écrite est celle du code · l'expéditeur est nommé · le courriel du lien ne ressemble pas à de l'hameçonnage (nom de l'expéditeur, adresse du lien, pas de pièce jointe exécutable) · le certificat dit ce qu'il atteste **et ce qu'il n'atteste pas**.

### F. Pages légales du site
- **Mentions légales** (LCEN, art. 6-III `[à vérifier]`) : éditeur, forme, SIREN, adresse, directeur de la publication, hébergeur (nom, adresse, téléphone).
- **Confidentialité** (RGPD art. 13 et 14) : responsable, finalités, **base légale de chacune**, destinataires, **transferts hors UE et garanties**, **durées**, droits (accès, rectification, effacement, opposition, portabilité, limitation), réclamation auprès de la CNIL, délégué à la protection des données s'il y en a un.
- **Sous-traitance** (art. 28) : liste **complète** des sous-traitants réellement utilisés par le code, leur pays, leur rôle, les garanties. Compare avec `grep` aux appels sortants (`fetch`, SMTP, hébergeur, paiement, IA, SMS).
- **Registre des traitements** (art. 30) : finalités, catégories de personnes et de données, destinataires, durées, mesures de sécurité.
- **Traceurs et cookies** : ce que le site dépose ou lit sur l'appareil, et le consentement quand il est requis `[à vérifier]`.

## 4. Quand il faut un avocat (et la question à lui poser)

Dire « **à faire valider par un avocat** » dès qu'on rencontre : une nouvelle catégorie de document · une mise en demeure, un litige, un contentieux · une clause de responsabilité chiffrée ou de garantie · des **données sensibles** (santé : un établissement de soins peut apparaître dans un rapport) ou des **mineurs** · un **transfert hors de l'UE** · une obligation réglementaire propre au métier (produits biocides, registre sanitaire) · un niveau de signature supérieur à « simple » · tout document qu'un tiers a rédigé et que TeamOP doit signer.
La question posée à l'avocat tient en **une phrase** et cite l'extrait.
