# Le pont des agents — la messagerie de la Tour dans OP MESSAGES (bêta)

Justin, 28 octobre 2026 : « tu vas implanter OP MESSAGES à la place » ; bascule directe, historique importé, « moi je
récupère tout sur OP MESSAGES sur mon téléphone ». Les seize agents, leurs règles, leurs réunions et la suppression de
messages restent ce qu'ils sont, **côté Tour** (`server/conversations.js` reste le registre que les agents relisent).
OP MESSAGES devient **le transport et l'écran**.

```
  Tour (api.teamop.fr)                                OP MESSAGES bêta (msg-beta.teamop.fr)
  ────────────────────                                ─────────────────────────────────────
  agents ⇄ conversations.js ──► pont-messages.js ──►  /api/pont/*  (pont-agents.js)
            (registre)          file · réessai         16 robots + « Système » · espace PRO
                       ◄────────  lit toutes les 3 s ◄─ ce que JUSTIN écrit / supprime
```

Deux fichiers de code, deux services, **un secret** :

| | fichier | rôle |
|---|---|---|
| OP MESSAGES | `server-msg/pont-agents.js` | cinq routes `/api/pont/*` (installer, poster, nouveaux, supprimer, avatar), gardées comme l'administration : boucle locale, aucun en-tête de proxy, secret `X-OPM-Pont` comparé à son **empreinte**. Inertes (404) sans bloc `pont`. |
| Tour | `server/pont-messages.js` | installe au démarrage, recopie chaque message du registre (file bornée, réessai), importe l'historique avec ses dates, lit ce que Justin écrit/supprime et le fait entrer par `justinEcrit` — **le même chemin que la route de la Tour** (mentions, réveil des agents), et **envoie les photos** (visages des agents, groupes, Système). |
| les deux | `server-msg/configurer-pont.js` | pose le pont **dans les deux configurations d'un coup**, secret saisi masqué ou fabriqué sur place. |

Une panne d'OP MESSAGES ne casse rien côté agents : le crochet de `conversations.js` est appelé après l'écriture du
registre, dans un `try`, sans rien rendre. Pas de configuration = pas de pont = la Tour exactement comme avant.

---

## 0. Avant de commencer

1. **Le code est déployé des deux côtés.** Une même fusion sur `main` déclenche `deploiement.yml` (la Tour) et
   `deploiement-messages.yml` (OP MESSAGES). Sans configuration, le pont est **inerte** : on peut déployer d'abord, sans risque.
   Vérifier : `curl -s https://api.teamop.fr/health | grep -c '"pont"'` doit rendre **0** (le champ n'existe pas tant que rien n'est posé).
2. **L'accès bêta de Justin existe pour OP MESSAGES** : il se crée dans la **console MESSAGES de la Tour** (Accès → bêta d'OP MESSAGES),
   avec **OP MESSAGES** coché (`apps: ["messages"]`). ⚠️ **L'identifiant `b…` de l'accès n'est PAS affiché dans la Tour** : il se lit sur le VPS, par
   ```bash
   node -e "for(const c of require('/opt/teamop/data/beta-comptes.json')) if(c.login==='justin') console.log(c.id, (c.apps||['gestion']).join(','), c.actif?'ouvert':'coupé')"
   ```
   — la ligne dont la liste d'applications est **`messages`** (c'est elle qu'on veut, pas celle de la bêta d'OP GESTION). **Noter l'identifiant** : `b` + des hexadécimaux. Ce n'est pas un secret.
3. Une seule instance : **la bêta**. En production, un bloc `pont` **refuse le démarrage** (décision : bêta d'abord).

## 1. Poser le pont (sur le VPS, en root)

```bash
ssh root@api.teamop.fr
OPMSG_CONFIG=/etc/opmsg/beta.json TEAMOP_CONFIG=/opt/teamop/config.json \
  node /opt/opmsg/beta/current/configurer-pont.js
```

Ce qu'on doit voir, dans cet ordre :

```
Accès bêta de Justin : b…          ← on tape l'identifiant noté à l'étape 0 (visible)
Secret du pont (masqué ; vide = en fabriquer un ici) :     ← ⛔ on appuie sur ENTRÉE, sans rien taper
✅ /etc/opmsg/beta.json et /opt/teamop/config.json mis à jour (chmod 600). Empreinte courte du secret, xxxxxxxx (la même dans les deux fichiers).
   Le secret a été fabriqué ICI et n'a été montré à personne — c'est voulu : il n'a pas à voyager.
```

⛔ **Le secret ne s'affiche jamais, et on ne le fabrique pas ailleurs pour le coller** : Entrée à l'invite, c'est tout. Les deux
fichiers sont sur la même machine, l'outil écrit l'empreinte dans l'un et le secret dans l'autre. (Coller un secret fabriqué
ailleurs reste possible — `openssl rand -hex 32 | pbcopy` — il ne s'affiche pas à la frappe.) Si l'écriture du second
fichier échoue, le premier est remis comme il était : on voit « Rien n'a été modifié ».

Refus possibles, avant toute écriture : accès mal formé, secret qui n'est pas 64 hexadécimaux, empreinte égale à celle de
l'administration (« un secret par pouvoir »).

## 2. Redémarrer — OP MESSAGES d'abord, la Tour ensuite

```bash
systemctl restart teamop-msg@beta
systemctl restart teamop-api
```

(La Tour réessaie tant qu'OP MESSAGES ne répond pas : l'ordre n'est pas critique, il évite seulement quelques secondes d'attente.)
À son premier démarrage avec le pont, la Tour **installe** (les 16 agents, « Système », l'espace, les 4 groupes, les directes), puis
**importe l'historique** du registre avec ses dates d'origine, sans notification.

## 3. Vérifier

```bash
# les deux fichiers portent-ils le même secret ? (rien d'autre que l'empreinte courte ne s'affiche)
OPMSG_CONFIG=/etc/opmsg/beta.json TEAMOP_CONFIG=/opt/teamop/config.json node /opt/opmsg/beta/current/configurer-pont.js --verifier
#   → « ✅ jumelles : la Tour et OP MESSAGES portent le même secret. Empreinte courte : …  Accès de Justin : b… »
#   (à l'invite « Valeur à comparer », Entrée)

# la Tour parle-t-elle ? les deux nombres du pont
curl -s https://api.teamop.fr/health | grep -o '"pont":{[^}]*}'
#   → "pont":{"echecMin":0,"file":0}   (file = 0 une fois l'import fini ; echecMin = minutes d'échec d'affilée)

# les journaux
journalctl -u teamop-api   --since "10 min ago" | grep -i "pont"
journalctl -u teamop-msg@beta --since "10 min ago" | grep -E "pont_(installe|refus)"
#   « pont_installe » une fois ; « pont_refus » = quelqu'un a frappé à la porte sans le bon secret (jamais la valeur)
```

Puis **dans OP MESSAGES** (`https://msg-beta.teamop.fr/`, connecté avec l'accès de Justin) :

- la liste porte **16 conversations directes** (une par agent) et **4 groupes** (Équipe, Clients, Plateforme, Réunions) ;
- l'historique est là, **avec ses dates** ; seuls les messages non lus dans la Tour le sont encore ;
- écrire à Victor : sa réponse arrive dans la minute (c'est le cerveau des agents, toujours côté Tour) ;
- citer `@Léa` dans « Équipe » réveille Léa ; supprimer un message le retire aussi de la Tour.

Si une étape ne donne pas ce qui est écrit : **on s'arrête**, on ne continue pas « en espérant ».

## 4. Sur le téléphone

Ouvrir `https://msg-beta.teamop.fr/` dans Safari, « Ajouter à l'écran d'accueil », se connecter, **accepter les notifications**
(l'iPhone ne les accorde qu'à une page ajoutée à l'écran d'accueil). Un agent d'importance « important » ou « urgent »
fait sonner le téléphone — comme dans la Tour, pas les messages « info ».

## 5. Revenir en arrière

```bash
OPMSG_CONFIG=/etc/opmsg/beta.json TEAMOP_CONFIG=/opt/teamop/config.json node /opt/opmsg/beta/current/configurer-pont.js --retirer
systemctl restart teamop-msg@beta && systemctl restart teamop-api
```

Les deux blocs sont retirés ; la messagerie de la Tour continue exactement comme avant (rien n'y a jamais été déplacé : elle
est le registre). Ce qui a été recopié dans OP MESSAGES y reste — des conversations ordinaires, que Justin peut supprimer.

---

## Les photos (28 octobre 2026)

Justin : « je voudrais les photos des agents et aussi des photos sur les groupes ». Les visages sont `icons/agents/<id>.jpg` (JPEG 256 px, les seize agents du pont ;
Pauline n'est pas dans le pont), les images des groupes et du Système `icons/groupes/{equipe,clients,plateforme,reunions,systeme}.png` (PNG 256 px, générées par `scripts/avatars-groupes.js`).

**Rien à faire sur le VPS : les photos partent au redémarrage de la Tour.** La Tour tourne depuis le clone complet du dépôt (`/opt/teamop/repo`), donc `server/pont-messages.js`
lit `icons/` à côté de `server/`. Au déploiement elle redémarre, **réinstalle** (c'est ce qu'elle fait à chaque démarrage), reçoit du service ce qui est déjà posé (`avatars`) et envoie
les photos manquantes ou changées — les vingt et une la première fois, **aucune** les fois suivantes.

**Le contrat — `POST /api/pont/avatar?cible=<id>`** (garde `PT`, comme les quatre autres : tout refus est le même 404, inerte sans configuration)

| | |
|---|---|
| `cible` | un **robot** de la table du pont (un agent, `systeme`) ou le **fil d'un groupe** (`equipe`, `clients`…). Jamais une directe (sa photo est celle du robot), jamais une clé héritée : sinon `400 champ_invalide`. |
| corps | l'image **brute**, `Content-Type: application/octet-stream`, `Content-Length` **obligatoire** (`411`), au plus `pieces.avatarMax` (2 Mo, `413`). Le service juge la **signature aux octets** et retire les métadonnées (`pieces.deposer`) : un non-image est `415 type_refuse`. |
| `X-OPM-Empreinte` | le SHA-256 (64 hexadécimaux) du corps **reçu**, recalculé par le service ; absent ou différent : `400`, rien n'est posé. |
| pose | en **une transaction** : la photo est posée sur le robot (`avatar_piece`) ou sur la conversation du groupe (une pièce du robot « Système », lisible par les membres) et l'empreinte source est rangée dans la table du pont. L'ancienne photo est effacée (ligne **et** fichier). La cible est **relue dans la transaction** : si une réinstallation a recréé le robot ou le groupe pendant le dépôt, la photo est refusée (`409 cible_changee`, le fichier part) plutôt que d'aller à l'ancien — la Tour reprend au démarrage suivant. |
| silence | **aucun message système** « a changé la photo du groupe » : vingt lignes parasites au premier démarrage. Les écrans de Justin sont prévenus par un événement sans texte. |
| réponse | `200 { ok, deja }` ; `deja: true` quand la même empreinte était déjà posée (rien n'est écrit) ; `429` au-delà de 120 photos par minute. |

`POST /api/pont/installer` rend en plus `avatars: { <cible>: <empreinte> }` — ce que le service a déjà. Côté Tour, une photo **refusée, absente ou trop grosse** ne retarde aucun
message et ne compte **pas** comme une panne du pont (`echecMin`) : elle part en tâche de fond, une à la fois, et se retente à l'installation suivante (le prochain démarrage).
Les noms de fichiers viennent des listes fixes (agents, groupes du registre), jamais de la réponse du service.

⚠️ **Ce que ça ne fait pas** : si Justin **change** la photo d'un groupe dans OP MESSAGES, la Tour ne la remet pas (l'empreinte source n'a pas bougé) ; pour remplacer un visage,
remplacer le fichier de `icons/agents/` et déployer (l'empreinte change, la photo est renvoyée). Un groupe supprimé puis recréé par l'installation perd sa photo, qui est renvoyée.

## Ce que le pont ne fait PAS (à savoir, pas à découvrir)

- **Le texte seulement.** Une photo, un vocal, un sondage de Justin n'arrive pas aux agents ; le pont le lui dit dans le fil
  (une fois par dix minutes). Les agents, eux, n'envoient que du texte.
- **Une modification de message dans OP MESSAGES ne revient pas** à la Tour (le message d'origine y reste lu par les agents).
- **« Supprimer pour moi »** d'un message d'agent, dans une conversation directe, vaut suppression (Justin est seul à lire ces fils) ;
  dans un groupe il est administrateur et supprime « pour tous ». Un **rappel client non lu** ne se supprime pas depuis
  OP MESSAGES (il n'existe que dans la Tour) : il reste là-bas.
- **Un groupe renommé** (Tour ou OP MESSAGES) ne se renomme pas de l'autre côté ; les groupes gardent le nom qu'ils avaient à l'installation.
- **Pauline** n'y est pas : ce n'est pas un agent de ce serveur (c'est Harvey, sur le Mac de Justin) et elle n'écrit pas dans ces conversations.
- **OP MESSAGES n'est pas chiffré de bout en bout** : le service lit le texte (corps chiffrés au repos). Même VPS, même patron — mais c'est
  une décision à savoir : le texte des agents, y compris les numéros de dossier des rappels clients, y est rangé.
- **Pas d'iframe dans la Tour.** La page d'OP MESSAGES interdit d'être encadrée (`frame-ancestors 'none'`) ; l'encadrer demanderait de relâcher cette
  politique — un choix de sécurité à faire avec Justin, pas ici. Le bandeau de l'onglet Messagerie ouvre OP MESSAGES dans **un autre onglet**.
- **Deux notifications possibles** sur le téléphone si la Tour et OP MESSAGES y sont toutes deux abonnées (même message important).
- **Le bandeau « Vos agents sont maintenant dans OP MESSAGES » s'affiche toujours**, pont posé ou non.

## Les alarmes

`/health` de la Tour porte `pont.echecMin` (minutes d'échec d'affilée vers OP MESSAGES) et `pont.file` (messages en attente) —
**seulement si le pont est monté**. La surveillance horaire (`.github/scripts/surveillance.js`) crie à **30 minutes** d'échec ou **1 000 messages**
en file. À la maison : `journalctl -u teamop-msg@beta`, et `--verifier` ci-dessus (un secret qui a dérivé d'un côté se voit en une commande).

## Les bancs

`test-3094` (le vrai service : gardes, installer, poster, nouveaux, supprimer, avatar), `test-3095` (le vrai serveur de la Tour + le vrai service + un faux
Anthropic : historique, direct, réveil des agents, suppressions dans les deux sens, panne), `test-3096` (le module de la Tour contre un faux
service : file, attente, rattrapage, bandeau), `test-3097` (l'outil de pose). Mutations : `scratchpad/mutations-pont-agents.py`.
