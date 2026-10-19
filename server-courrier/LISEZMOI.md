# OP Courrier — le serveur de signature (Yousign)

Un service **à part** : ni le serveur d'OP GESTION (`server/`, `api.teamop.fr`), ni celui d'OP MESSAGES (`server-msg/`).
Il tourne sur **son propre VPS** (IONOS) et fait signer des documents par Yousign pour le module OP Courrier.
Première brique : la signature. La lecture des boîtes viendra dans le même service.

- `courrier-beta.teamop.fr` : l'instance bêta, **bac à sable Yousign** (rien de légal, aucun vrai signataire prévenu)
- `courrier.teamop.fr` : la production (plus tard, avec la clé de production Yousign)

## Comment ça marche, en dix lignes

1. Le module OP Courrier (dans la Tour) appelle ce service avec **le jeton de session de la Tour** (celui que `api.teamop.fr` a donné à la connexion).
2. Ce service ne connaît aucun mot de passe : il demande à `api.teamop.fr` (`GET /api/monitor/moi`) **qui** est la personne, et n'accepte que le rôle `patron`. Couper un accès dans la Tour le ferme ici en moins d'une minute. `server/` n'a pas bougé d'une ligne.
3. Une demande = un brouillon (JSON), puis le PDF **en flux** (25 Mo maximum, octets `%PDF-` vérifiés, pas seulement le type), puis « activer » : le service crée la demande chez Yousign, y dépose le PDF, ajoute les signataires (zones de signature sur la dernière page), la contre-signature (vous) **en dernier**, et active.
4. Niveau « Code SMS » = signature avancée ; « Code e-mail » = signature simple. Délai 7/15/30 jours ; relances tous les 3 jours.
5. Yousign prévient le service par **webhook** (signature HMAC vérifiée sur le corps brut ; un événement reçu deux fois n'est traité qu'une fois) ; l'état avance : En attente → Ouvert → À contresigner → Signé (ou Refusé, Annulé, Expiré).
6. À la fin, le service **télécharge** le PDF signé et le dossier de preuve chez Yousign (il ne les croit jamais sur parole).
7. Les PDF et les fiches des signataires sont **chiffrés** (AES-256-GCM) sur le disque ; la clé maître est dans `/etc/opcourrier/kek-<instance>`, jamais en base ni dans le dépôt.
8. Une demande finie est effacée après 90 jours (30 si annulée/refusée/expirée, 7 si jamais activée) ; annuler efface le PDF à signer tout de suite.
9. Le journal ne contient **aucune donnée personnelle** (ni adresse, ni nom, ni téléphone, ni IP) ; nginx n'écrit pas de journal d'accès.
10. Plafonds : 20 demandes/heure, 15 envois/heure, 50 SMS/jour par personne ; jetons refusés limités par adresse.

---

## Ce que Justin fait, dans l'ordre

> ⛔ **Aucun secret ne s'affiche jamais sur le VPS, et aucun ne se colle dans la conversation.** Une clé va du site de Yousign à ton gestionnaire de mots de passe, puis au VPS en **saisie masquée** (on ne voit rien en tapant, c'est normal).

### 1. Créer le VPS (IONOS)
Ubuntu **24.04**, 1 vCPU / 2 Go suffisent. Ajoute ta clé SSH à la création. Note l'**adresse IPv4**. (Ce VPS ne sert qu'à OP Courrier : n'y mets rien d'autre.)

### 2. Le DNS (OVH)
Dans la zone `teamop.fr`, ajoute un enregistrement **A** :
`courrier-beta` → l'adresse IPv4 du VPS (et plus tard `courrier` → la même adresse pour la production).
Attends que `getent hosts courrier-beta.teamop.fr` rende cette adresse (quelques minutes à quelques heures). L'installeur refuse de continuer sinon.

### 3. Lancer l'installeur (sur le VPS, en root)
```bash
ssh root@<adresse du VPS>
apt-get update && apt-get install -y git
git clone --depth 1 --branch courrier/serveur https://github.com/justino17-cmd/teamop.git /root/depot-courrier
bash /root/depot-courrier/server-courrier/install-courrier.sh beta courrier-beta.teamop.fr --email <ton adresse> --branche courrier/serveur
```
(Quand la branche sera fusionnée, retire `--branche …` et `--branch …` : c'est `main` par défaut.)
Il installe Node 22, nginx, le certificat HTTPS (Let's Encrypt), l'utilisateur `opcourrier`, le service `opcourrier-beta`, tire au sort la **clé maître** (sans l'afficher), et dit à la fin l'adresse du webhook.
Il est rejouable : ce qui existe est gardé. ⛔ S'il trouve des données **sans** clé maître, il refuse : une clé neuve rendrait tout illisible.

### 4. Sauvegarder la clé maître (sans l'afficher)
Sans elle, perdre le VPS = perdre les PDF signés. **De ton Mac** (pas dans une session partagée) :
```bash
scp root@<adresse du VPS>:/etc/opcourrier/kek-beta ~/kek-beta.txt
```
Ouvre le fichier **dans ton gestionnaire de mots de passe** (nouvelle note « OP Courrier kek beta »), puis supprime-le : `rm -P ~/kek-beta.txt`. Ne le colle nulle part.

### 5. Créer la clé API Yousign (bac à sable)
1. Crée ton compte sur Yousign et ouvre l'espace **bac à sable** (« sandbox »).
2. *Développeurs → Clés API → Créer* : donne-lui un nom (« OP Courrier beta »), copie la clé **directement dans ton gestionnaire de mots de passe**.
3. Dans le gestionnaire, fabrique aussi un **mot de passe aléatoire de 32 caractères ou plus** : ce sera le **secret du webhook**.

### 6. Poser les deux valeurs sur le VPS (saisie masquée)
```bash
cd /opt/opcourrier/repo/server-courrier
sudo node configurer-yousign.js beta
```
Il demande : l'environnement (`sandbox`), la clé API (deux fois), le secret du webhook (deux fois) — masqués, jamais réaffichés — puis redémarre le service. Pour **comparer** une copie sans rien afficher : `sudo node configurer-yousign.js beta verifier` (« identique » ou « DIFFÉRENTE »). Pour vérifier que Yousign accepte la clé : `sudo node configurer-yousign.js beta tester`.

### 7. Déclarer le webhook chez Yousign
*Développeurs → Webhooks → Créer* :
- **URL** : `https://courrier-beta.teamop.fr/api/signature/webhook/yousign`
- **Clé secrète** : le secret de l'étape 5 (colle-le depuis le gestionnaire)
- **Événements** : tous ceux de `signature_request` et de `signer` (activée, terminée, refusée, expirée, annulée ; lien ouvert, signé, refusé).

### 8. Contrôler
`https://courrier-beta.teamop.fr/health` doit répondre `"signature":{"pret":true,"sandbox":true}`. Dis-le à Claude : il branche la page (voir plus bas) et fait un essai de bout en bout contre le bac à sable.

### Plus tard : la production
Même chose avec `courrier.teamop.fr` et `install-courrier.sh prod courrier.teamop.fr …` (port et service distincts, **autre** clé maître, **autre** clé API Yousign de production, **autre** webhook). Vérifie d'abord les prix de Yousign. Mets à jour `registre-traitements.html` et `sous-traitance.html` (hébergeur IONOS, Yousign sous-traitant) **avant** d'ouvrir à de vrais clients.

### Le déploiement automatique (facultatif, plus tard)
`.github/workflows/deploiement-courrier.yml` ne part qu'à la main et reste éteint tant que la variable de dépôt `COURRIER_ACTIF` ne vaut pas « oui ». Il exige : les secrets `VPS_SSH_KEY_COURRIER_BETA` / `_PROD` (clés dont la ligne `authorized_keys` du VPS est `command="/opt/opcourrier/deployer.sh",restrict …`), les variables `COURRIER_HOTE` et `COURRIER_EMPREINTE_HOTE` (la clé publique d'hôte, `ssh-keyscan -t ed25519`), et l'environnement `courrier-prod` avec toi comme relecteur obligatoire.

---

## Côté page

La page n'allume la signature réelle que si `/health` du serveur répond **et** dit `signature.pret`. Sinon le module garde « Prête — en attente de Yousign ». Voir `REPRISE.md` pour l'état du branchement.

## Routes

Sous `/api/signature`, jeton de la Tour dans `Authorization: Bearer …` :
`POST /demandes` · `PUT /demandes/:id/documents?nom=` (PDF brut) · `POST /demandes/:id/activer` · `GET /demandes[/:id]` · `POST /demandes/:id/relancer` · `POST /demandes/:id/annuler` · `DELETE /demandes/:id` · `GET /demandes/:id/documents/:n/signe` · `GET /demandes/:id/preuves/:i`. Publiques : `GET /health`, `POST /webhook/yousign`.

## Bancs

`node tests/test-1670.js` (le vrai service contre un faux Yousign avec état) · `node tests/test-1671.js` (installeur, saisie des clés, workflow, séparation). Contre-épreuve : `python3 scratchpad/mutations-courrier.py`.
