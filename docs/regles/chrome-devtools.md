# Chrome DevTools MCP — mesurer pour de vrai, sur la bêta seulement

> Déplacé tel quel de `CLAUDE.md` le 18 novembre 2026 (allègement : chaque session et chaque agent relit `CLAUDE.md` d'office). Rien n'a été réécrit. 


`.mcp.json` déclare un seul serveur : `chrome-devtools` (lancé par `npx`, avec
`--no-usage-statistics`). Il donne un vrai Chrome piloté — captures, console avec pile
d'appels, réseau, et surtout **trace de performance**. C'est le seul moyen de mesurer ce que
`app.html` coûte réellement : plus de 2 Mo en fichier unique, chargés sur des téléphones de
terrain en 4G. Le skill `performance-budget-monitor` décrit le budget ; sans cet outil,
personne ne pouvait le vérifier.

**Le navigateur doit exister LÀ OÙ TOURNE LA SESSION**, pas sur le Mac de qui la pilote. Une
session distante (Claude Code sur le web ou l'app) tourne dans un conteneur Linux : c'est lui
qui doit avoir un navigateur. D'où `--executablePath /opt/pw-browsers/chromium` dans
`.mcp.json` — un lien symbolique vers le Chromium de l'image, stable d'une version à l'autre.
Sur un Mac où Chrome est installé, remplacer cette ligne par le chemin de Chrome
(`/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`) ou retirer les deux lignes :
il est alors trouvé tout seul.

⚠️ **Dans un environnement distant, viser `127.0.0.1`, jamais `teamop.fr`.** Le proxy sortant
coupe les connexions du navigateur (`ERR_CONNECTION_RESET`) ; seul le local passe. On sert donc
le dépôt et on pointe dessus :

```bash
node -e "const h=require('http'),f=require('fs'),p=require('path');h.createServer((q,r)=>{const x=p.join(process.cwd(),q.url.split('?')[0]);f.readFile(x,(e,d)=>e?(r.writeHead(404),r.end()):(r.writeHead(200,{'Content-Type':x.endsWith('.js')?'text/javascript':'text/html;charset=utf-8'}),r.end(d)))}).listen(8123,'127.0.0.1')" &
# puis viser http://127.0.0.1:8123/beta.html
```

C'est même préférable pour concevoir : on juge le fichier qu'on vient de modifier, pas la
version publiée il y a deux heures.

⏱️ **Toujours passer `timeout: 60000` à `new_page`.** Le défaut est de 10 s ; `app.html` et
`beta.html` font 2,6 Mo et ne finissent pas de charger à temps — on obtient sinon
« Navigation timeout of 10000 ms exceeded » alors que tout va bien.

Les trois `--chromeArg` de `.mcp.json` (`--no-sandbox`, `--disable-gpu`,
`--disable-dev-shm-usage`) sont indispensables en conteneur : sans le premier, le navigateur
meurt au lancement (« Target closed »). Chaîne vérifiée de bout en bout le 7 septembre 2026 —
poignée de main MCP, lancement du navigateur, page rendue.

⛔ **Bêta uniquement, sans exception.** Le serveur expose au client MCP **tout** le contenu
de la page ouverte. Sur `app.html` en production, ce sont des noms, des adresses et des
coordonnées de vrais clients — un flux de données qui n'est pas couvert par
`sous-traitance.html`. On ne pointe donc le navigateur piloté que sur `beta.html` ou une
copie d'aperçu : la bêta est isolée par construction (préfixe `elanB_`, espace
`opgestion-beta`, jamais de données d'entreprise). Cette règle est écrite aussi dans les
agents `concepteur` et `testeur`.

⛔ **Mais ces deux agents ne PEUVENT pas s'en servir, et il faut le savoir avant d'essayer.**
Un sous-agent dont le frontmatter porte une liste `tools:` explicite n'atteint AUCUN outil MCP.
Éprouvé le 8 septembre 2026, quatre essais, tous concluants dans le même sens :

| ce qu'on déclare dans `tools:` | ce que l'agent voit |
|---|---|
| `mcp__chrome-devtools__*` | rien |
| les 13 outils nommés un par un | rien |
| les 13 outils **plus** `ToolSearch` | rien — `ToolSearch` lui-même est retiré |
| `tools: *` (agent `general-purpose`) | **tout** : schéma chargé, `list_pages` répond |

Le mécanisme : les outils MCP arrivent *différés* — nommés, mais sans schéma — et il faut
`ToolSearch` pour le charger. Une liste `tools:` explicite retire `ToolSearch`, donc ferme la
porte, même quand les outils MCP y sont écrits noir sur blanc. Rien n'avertit : la ligne est
acceptée, les entrées sont simplement ignorées.

Conséquence pratique : **le navigateur piloté ne se conduit que depuis la session principale**
(ou un agent à `tools: *`, ce qu'on ne veut pas pour `concepteur` ni `testeur` — leur liste
restreinte est délibérée). Les deux agents mesurent donc avec Playwright par `Bash`, ce que
`testeur` fait déjà. Pour une vraie trace de performance, c'est la session principale qui la
prend.

