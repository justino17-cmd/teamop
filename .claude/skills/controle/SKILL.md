---
name: "controle"
description: "Contrôle de bout en bout de TeamOP : un client fictif part du site, commande, paie (Stripe simulé), reçoit son accès et travaille dans l'application — sur un jumeau local du site et du serveur réels, jamais en production. Rend un rapport (bloquant, défaut, à regarder) avec captures, et fait enquêter l'agent client-mystere sur chaque défaut. Use when the owner asks to « tout tester », « contrôler », « vérifier que tout marche de A à Z », before publishing app.html or server/, or from the scheduled control task."
---

# Contrôle — le client mystère de TeamOP

Justin, 17 octobre 2026 : « je voudrais qu'ils partent du site internet comme s'ils commandaient l'application, ils
travaillent avec tout ça — je veux un contrôle ».

## Ce que fait le contrôle

`scripts/controle/` monte un **jumeau** sur 127.0.0.1 et y joue Camille, gérante d'une entreprise de nettoyage, sur
iPhone : tarifs → compte → courriel de confirmation → paiement → demande d'accès → acceptation dans la Tour → courriel
d'accès → première connexion → mot de passe provisoire remplacé → accès payé servi → chaque rubrique du menu →
rechargement. Puis les contrôles défensifs relisent ce que le parcours a laissé : erreurs JavaScript, réponses 5xx,
données personnelles dans le journal du serveur, liens morts, fichiers internes servis, appels hors de teamop.fr.

Le jumeau sert les VRAIES pages (assemblées par `scripts/assembler-site.sh`, la liste blanche de la publication) sous
leurs vraies adresses, et le VRAI `server/index.js` isolé. Stripe est imité avec état ; Firebase, les polices et le
reste du web sont coupés. ⛔ **Rien ne part en production**, et rien n'y est lu : ni données de clients, ni paiement réel.

## Le geste

1. Lancer, au premier plan (≈ 70 s) :
   ```bash
   node scripts/controle/controle.js <scratchpad>/controle-$(date +%Y%m%d-%H%M)
   ```
   Code de sortie : 0 rien à signaler · 1 défauts · 2 bloqué · 3 le jumeau n'a pas démarré (`server/node_modules`
   absent → `cd server && npm ci`). `PROFIL=bureau` joue un ordinateur au lieu d'un iPhone.
2. Lire `rapport.md` du dossier de sortie (verdict, parcours, constats, limites) et regarder les captures citées.
3. **S'il y a un défaut ou un bloquant** : lancer l'agent `client-mystere` sur ce dossier pour qu'il enquête —
   `fichier:ligne`, journal du serveur, capture —, sans rien corriger.
4. **Si le changement en cours touche `server/`** : l'agent `gardien` relit aussi le diff (la sécurité du code n'est
   pas jouée par le contrôle, qui ne fait que des vérifications défensives).
5. Rendre à Justin, en français, court : le verdict et le chiffre (« 16/16 étapes »), les constats du plus grave au
   moins grave (ce que le client vit, où c'est, la preuve), puis ce que le contrôle ne voit pas. Envoyer `rapport.md`
   et les captures utiles comme fichiers.

## Les règles

- **Une étape « non jouée » n'est pas réussie.** Après un bloquant, la suite ne se joue pas : le dire.
- **Un refus voulu de l'API** (401 sans compte, 404 du socle éteint…) vit dans `REFUS_VOULUS` de
  `scripts/controle/defense.js`, avec sa raison. En ajouter un est une décision : on écrit pourquoi.
- **On ne corrige pas dans la même passe**, sauf demande expresse : un correctif suit le rituel du dépôt (bêta d'abord,
  banc, mutation, `app.html` sur la phrase de Justin).
- **Après une modification du contrôle lui-même**, rejouer sa contre-épreuve : `node scratchpad/mutations-controle.js`
  (un témoin vert, et chaque défaut remis doit être vu).
- Jamais teamop.fr pour de vrai. La production ne se lit qu'en lecture seule, par `verificateur` et l'audit mensuel.
