# Connecter les boîtes Outlook / Microsoft 365 et Gmail — ce que Justin fait une fois

But : que **toute** entreprise puisse connecter sa boîte mail dans OP GESTION, y compris chez Microsoft (qui refuse le mot de passe
depuis 2024) et chez Google (sans « mot de passe d'application »). L'entreprise clique « Se connecter avec Microsoft / Google »,
autorise OP GESTION chez son fournisseur, et c'est tout : ses devis et factures partent de **son** adresse.

Le serveur est prêt (`server/boite-oauth.js`, routes `/api/mailbox/oauth/*`). Il reste **inerte** tant que les deux inscriptions
ci-dessous ne sont pas faites : `/health` montre `"oauth":{"microsoft":false,"google":false}`.

⛔ **Le secret client ne passe JAMAIS dans une conversation, un courriel, une capture ou le dépôt.** On le copie depuis la console
du fournisseur et on le tape directement sur le VPS, dans `configurer-oauth.js` (saisie masquée). Si tu envoies une capture, cache-le.

L'adresse de retour, la même pour les deux : **`https://api.teamop.fr/api/mailbox/oauth/retour`**

---

## 1. Microsoft (Outlook, Hotmail, Live, Microsoft 365) — environ 10 minutes

1. Ouvre **https://entra.microsoft.com** (ou portal.azure.com) et connecte-toi avec un compte Microsoft (le tien suffit ; un compte
   professionnel de TEAM OP est préférable s'il existe).
2. Menu **Applications → Inscriptions d'applications** → **Nouvelle inscription**.
   - **Nom** : `OP GESTION` (c'est le nom que les clients verront sur l'écran d'autorisation).
   - **Types de comptes pris en charge** : choisis
     **« Comptes dans un annuaire d'organisation (tout annuaire Microsoft Entra — multilocataire) et comptes Microsoft personnels
     (par exemple, Skype, Xbox) »**. ⚠️ Sans les comptes personnels, Hotmail et Outlook.fr ne pourront pas se connecter.
   - **URI de redirection** : plateforme **Web**, adresse `https://api.teamop.fr/api/mailbox/oauth/retour`.
   - **Inscrire**.
3. Sur la page de l'application, note l'**ID d'application (client)** (un code du genre `xxxxxxxx-xxxx-…`). Ce n'est pas un secret.
4. **Certificats et secrets → Secrets client → Nouveau secret client**. Description `VPS TeamOP`, expiration **24 mois**.
   ⚠️ Copie la colonne **« Valeur »** tout de suite (elle ne s'affiche qu'une fois) — **pas** la colonne « ID du secret ».
   Garde-la dans ton gestionnaire de mots de passe, nulle part ailleurs.
5. **Autorisations de l'API → Ajouter une autorisation → API que mon organisation utilise** → cherche **Office 365 Exchange Online**
   → **Autorisations déléguées** → coche **`SMTP.Send`** et **`IMAP.AccessAsUser.All`**. Ajoute aussi, dans **Microsoft Graph →
   Autorisations déléguées** : **`offline_access`**, **`openid`**, **`email`**. Pas besoin de « consentement administrateur ».
6. (Plus tard, recommandé) **Image de marque et propriétés** : renseigne le site `https://teamop.fr` et, si possible, la
   **vérification de l'éditeur** — sans elle, l'écran d'autorisation affiche « éditeur non vérifié ». Ça marche quand même.

À savoir côté clients Microsoft 365 (entreprises) : l'administrateur de leur messagerie peut avoir coupé le « SMTP authentifié ».
OP GESTION le détecte à la connexion et le dit (« ton fournisseur refuse l'envoi depuis une application »). La solution est chez
eux : réactiver *Authenticated SMTP* pour la boîte concernée dans le centre d'administration Microsoft 365.

## 2. Google (Gmail, Google Workspace) — environ 15 minutes

1. Ouvre **https://console.cloud.google.com** → crée un projet **`OP GESTION`**.
2. **API et services → Écran de consentement OAuth** :
   - Type **Externe**, nom de l'application `OP GESTION`, adresse d'assistance `contact@teamop.fr`, domaine `teamop.fr`,
     liens vers `https://teamop.fr/confidentialite.html` et `https://teamop.fr/mentions-legales.html`.
   - **Champs d'application** : ajoute `https://mail.google.com/`, `openid`, `email`.
   - Statut de publication : **En test** au départ. ⚠️ En mode test, seuls les comptes ajoutés à la liste **« Utilisateurs test »**
     (100 au plus) peuvent se connecter, et l'autorisation expire au bout de **7 jours** (il faut alors reconnecter).
3. **API et services → Identifiants → Créer des identifiants → ID client OAuth** → type **Application Web** →
   **URI de redirection autorisés** : `https://api.teamop.fr/api/mailbox/oauth/retour` → **Créer**.
   Note l'**ID client** et copie le **Code secret du client** (gestionnaire de mots de passe, nulle part ailleurs).
4. **Bibliothèque** : active **Gmail API** (recommandé).
5. ⚠️ **`https://mail.google.com/` est une portée « restreinte »** chez Google. Pour sortir du mode test (plus de 100 entreprises,
   plus d'expiration à 7 jours), Google exige une **vérification de l'application** (et, pour cette portée, un audit de sécurité
   par un organisme agréé, payant). D'ici là : mode test, ou le mot de passe d'application de Gmail, qui continue de marcher.

## 3. Poser les identifiants sur le VPS (saisie masquée)

```bash
ssh root@api.teamop.fr
node /opt/teamop/repo/server/configurer-oauth.js microsoft     # colle l'ID, puis la VALEUR du secret (rien ne s'affiche)
node /opt/teamop/repo/server/configurer-oauth.js google        # idem pour Google
systemctl restart teamop-api
curl -s https://api.teamop.fr/health | grep -o '"oauth":{[^}]*}'
```

Ce que tu dois voir : `"oauth":{"microsoft":true,"google":true}` (ou `false` pour celui que tu n'as pas encore fait).
⛔ N'envoie pas la sortie de `cat /opt/teamop/config.json` : elle contient les secrets. La ligne `curl` ci-dessus, elle, n'en contient
aucun et peut être recollée.

## 4. Renouveler le secret Microsoft (tous les 24 mois)

Azure prévient avant l'échéance. Crée un nouveau secret (étape 1.4), relance `configurer-oauth.js microsoft`, redémarre. Les boîtes
déjà connectées ne sont pas touchées (leur autorisation reste valable).

## Ce que voit une entreprise (pour répondre à ses questions)

- Elle clique « Se connecter avec Microsoft » (ou Google), choisit son compte, accepte « OP GESTION souhaite envoyer et lire vos
  courriels ». La fenêtre se ferme, la boîte apparaît « Connectée ✓ ».
- Ses documents partent de son adresse ; les réponses de ses clients arrivent dans sa boîte (et dans la Réception d'OP GESTION).
- Aucun mot de passe n'est donné à TEAM OP. Elle peut retirer l'accès à tout moment depuis son compte Microsoft ou Google : OP GESTION
  affiche alors « boîte à reconnecter ».
