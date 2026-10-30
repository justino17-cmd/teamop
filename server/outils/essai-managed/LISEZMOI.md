# Essai « Managed Agents » d'Anthropic — mode d'emploi pour Justin

## Ce que c'est, en deux phrases

On essaie le service « Managed Agents » d'Anthropic sur **un seul agent** : un double de Max, appelé « Max (essai) », qui lit les **mêmes chiffres de surveillance** que le vrai Max et écrit un rapport. Le vrai Max ne change pas d'une ligne, et le rapport de l'essai **n'est jamais publié ni envoyé** : il est rangé dans un fichier, pour que tu le compares au travail du vrai Max.

## Ce qui ne part jamais chez Anthropic

Aucune donnée de client. L'agent ne reçoit que des **nombres** (minutes d'échec de Stripe, âge de la dernière sauvegarde, erreurs de l'heure…), le **nom des règles de Max** et les **phrases écrites dans notre code**. Pas de nom d'entreprise, pas d'adresse, pas de courriel, pas le texte d'un incident venu d'un appareil. Le vrai Max, lui, n'appelle même pas Claude : le code surveille tout seul. Le banc `tests/test-3190.js` plante des noms et des adresses dans l'état de santé du serveur et vérifie qu'aucun ne ressort.

L'agent n'a **aucun accès à Internet** (son environnement est fermé, ses outils web sont coupés). Il n'a que deux outils : écrire son rapport dans son espace à lui, et demander les chiffres à notre serveur.

## Ce que ça coûte

Le texte ci-dessous vient de la documentation d'Anthropic ; **rien n'a encore été mesuré en vrai** (les bancs parlent à un faux service).

- le modèle (Claude Sonnet 5.5) est facturé **au tarif de l'API** : 2 $ par million de jetons en entrée et 10 $ par million de jetons en sortie ;
- **0,08 $ par heure** d'activité de la session (compté seulement pendant que l'agent travaille) ;
- la « grille » qui fait réviser le rapport (jusqu'à 3 tours) ajoute quelques appels du modèle ;
- **plafond dur : 0,50 $ par session** (réglable de 0,10 $ à 2,00 $). La session s'arrête toute seule à ce montant, à une requête près ; le script refuse de créer une session sans plafond.

Un lancement coûte donc **quelques centimes, jamais plus de 0,50 $ environ**. La ligne « coût » du rapport te donne le chiffre réel (au tarif public, arrondi au centime). Cet essai ne passe pas par le budget des agents (`cerveau.js`, son plafond de 195 $) : il n'y est pas compté. Comme c'est la même clé `agents.cleApi`, il apparaît en revanche sur la même facture Anthropic.

## Ce que tu fais sur le VPS

Tout se passe en `ssh root@api.teamop.fr`. **Aucune de ces commandes n'affiche un secret** (ne colle jamais ici le contenu de `config.json`).

**0. Vérifier que le code est là.** Ces fichiers arrivent avec la fusion de la branche `claude/essai-managed-agents` et le déploiement habituel du serveur.

```bash
ls /opt/teamop/repo/server/outils/essai-managed/
```

**1. Vérifier, sans rien afficher de secret, que la clé des agents est posée.**

```bash
node -e "console.log('clé posée :', !!(require('/opt/teamop/config.json').agents||{}).cleApi)"
```

Ça doit répondre `clé posée : true`.

**2. Allumer l'essai.** Ouvre la configuration, et dans le bloc `"agents"` ajoute la ligne `"essaiManaged": true` (sans oublier la virgule de la ligne d'avant) :

```bash
nano /opt/teamop/config.json
```

Pour changer le plafond de session (en centimes de dollar, 10 à 200) : `"essaiManaged": { "actif": true, "budgetCents": 30 }`. Puis vérifie ce qui est écrit **sans rien montrer d'autre** :

```bash
node -e "console.log(JSON.stringify((require('/opt/teamop/config.json').agents||{}).essaiManaged))"
```

**3. Poser l'agent chez Anthropic** (il crée l'agent et son environnement fermé, et prépare le jeton de l'outil maison, sans l'afficher) :

```bash
cd /opt/teamop/repo/server && node outils/essai-managed/poser.js
```

**4. Redémarrer le service**, pour qu'il serve l'outil maison (la route n'existe que si l'essai est allumé) :

```bash
systemctl restart teamop-api
```

**5. Lancer une session** (une à deux minutes) :

```bash
cd /opt/teamop/repo/server && node outils/essai-managed/lancer.js
```

Le script dit : la session créée et son plafond, un lien pour la suivre en direct dans la Console Anthropic (si ton espace n'est pas « Default », remplace `default` dans le lien par l'identifiant de ton espace), puis l'issue, le coût et le chemin du rapport. Tu peux relancer autant de fois que tu veux ; chaque lancement est une nouvelle session payante, plafonnée.

## Ce que tu verras

Un fichier par lancement :

```bash
ls -t /opt/teamop/data/essai-managed/rapports | head
cat /opt/teamop/data/essai-managed/rapports/<le fichier>
```

Il contient, dans l'ordre : un bandeau « jamais publié, jamais envoyé » ; la session, l'issue, la note de la grille (« satisfied » = la grille de 6 critères est remplie) et le coût ; **ce que voit le vrai Max** au même instant (les règles actives et leur phrase — ou « aucune règle active : le vrai Max ne dirait rien ») ; **le rapport de l'agent** (Constat chiffré et daté, Cause probable, Gravité, Action proposée) ; les chiffres exacts qu'on lui a remis. Pour comparer avec le vrai Max : ses messages sont dans le fil « Plateforme » de la Tour.

Le détail de la session (chaque appel, chaque outil) est visible dans la Console Anthropic, section « Managed Agents » puis « Sessions ».

## Tout arrêter et tout effacer

Pour **arrêter** sans rien effacer : retire la ligne `essaiManaged` de la configuration (ou mets `false`), puis `systemctl restart teamop-api`. La route de l'outil disparaît, et les scripts refusent de lancer quoi que ce soit.

Pour **tout effacer** chez Anthropic :

```bash
cd /opt/teamop/repo/server && node outils/essai-managed/nettoyer.js
```

Il supprime les sessions de l'essai (⚠️ **supprimer une session efface son historique chez Anthropic** ; ce qui compte est dans les rapports, qu'il garde), supprime l'environnement, **archive** l'agent (un agent ne se supprime pas chez Anthropic : « archivé » veut dire lecture seule, sans retour en arrière ; une nouvelle pose en crée un autre) et efface le jeton. S'il tombe en panne en route, il le dit et on le relance : il reprend où il s'était arrêté. Ajoute `--tout` pour effacer aussi les rapports :

```bash
cd /opt/teamop/repo/server && node outils/essai-managed/nettoyer.js --tout
```

Il marche même si l'interrupteur est déjà éteint. Après le nettoyage, retire `essaiManaged` de la configuration et redémarre le service.

## Ce que l'essai permet de juger

- **La qualité** : un modèle qui rédige constat, cause et action, face au code seul du vrai Max (qui dit une phrase composée d'avance). Vaut-il son prix ? Invente-t-il quelque chose (la grille le surveille) ?
- **La plateforme comme chef d'orchestre** : agent versionné, outil maison appelé depuis chez eux et servi par notre serveur, « grille » qui fait réviser le travail, plafond de dépense dur, Console qui montre tout. C'est ce qu'il faudrait pour orchestrer plus d'un agent plus tard.
- **La fiabilité** : combien de lancements finissent « termine » avec une grille satisfaite, et combien s'arrêtent au plafond ou au délai (10 minutes au plus par lancement).
- **Le coût réel** d'un rapport, ligne « coût » de chaque fichier.
- **La dépendance** : la plateforme est encore en bêta chez Anthropic (les noms d'API peuvent changer) ; la définition de l'agent vit dans des **fichiers du dépôt** (`definition/`) pour qu'elle ne soit jamais prisonnière de leur Console.

## Où est quoi

| Fichier | Rôle |
|---|---|
| `definition/agent.json`, `systeme.md`, `grille.md`, `environnement.json` | l'agent, son prompt, la grille de 6 critères, l'environnement fermé — versionnés ici |
| `poser.js` | crée ou met à jour l'agent et l'environnement (idempotent) |
| `lancer.js` | une session plafonnée, un rapport rangé en fichier |
| `nettoyer.js` | efface tout chez Anthropic |
| `faits.js`, `route.js` | l'outil maison : les chiffres de Max, en forme fermée, servis par notre serveur sur `127.0.0.1` avec un jeton |
| `commun.js` | l'interrupteur, le plafond, le client (la clé ne va qu'à `api.anthropic.com`) |

Les définitions sont synchronisées par nos scripts plutôt que par l'outil en ligne de commande `ant apply` de la documentation, parce que cet outil n'est pas installé sur le VPS .

Les données restent sur le VPS : `/opt/teamop/data/essai-managed/` (`etat.json` : les identifiants à nettoyer ; `jeton` : le secret de l'outil maison, mode 600, jamais affiché ; `rapports/`).
