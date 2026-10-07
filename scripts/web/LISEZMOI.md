# Lire un site — `scripts/web/`

Demandé par Justin le 7 octobre 2026 (« je le veux quand je travaille avec mon iPhone et mon Mac »), à partir d'un guide qui listait neuf outils de récupération de données web. **Un seul est gardé : Crawl4AI**. Il lit une page comme un navigateur, JavaScript compris, et la rend en markdown propre, qu'une IA range ensuite en tableau.

Les huit autres outils du guide n'ont pas été installés :
- **Playwright** est déjà dedans : c'est le navigateur que Crawl4AI pilote.
- **Scrapy, Crawlee** servent à des volumes industriels.
- **Katana** est un outil de reconnaissance de sécurité ; `--liens` suffit pour cartographier un site.
- **Scrapegraph AI, Browser Use** exigent une clé d'API payante, et c'est ce que fait déjà Claude dans la session.
- **Firecrawl, Maxun** demandent Docker et des dizaines de conteneurs.

## S'en servir

Depuis une session Claude, sur iPhone ou sur Mac, il suffit de demander « lis ce site », « liste les pages de… » ou « fais-moi un tableau des entreprises de cette page ». En ligne de commande :

```bash
bash scripts/web/lire-site.sh https://exemple.fr              # le texte de la page
bash scripts/web/lire-site.sh https://exemple.fr --liens       # ses liens, ceux du même site d'abord
bash scripts/web/lire-site.sh https://exemple.fr --pages 10    # la page, puis jusqu'à 10 pages du même site
```

La première utilisation installe tout, une seule fois, dans `~/.cache/teamop-web`. Rien n'est installé dans le dépôt ni dans le système.
- **Dans le conteneur du cloud**, l'outil prend le Chromium de la machine et la version de Playwright qui le connaît. Aucun téléchargement de navigateur.
- **Sur le Mac**, Playwright télécharge son Chromium une fois. Il faut `python3`, déjà présent avec les outils de développement d'Apple : `xcode-select --install`.

Mesuré le 7 octobre 2026 dans le conteneur :
- installation neuve : 38 s ;
- teamop.fr lu en 2,5 s, 23 liens internes listés ;
- `--pages 2` lit trois pages.

## ⛔ Le cadre

On lit comme un visiteur :
- le `robots.txt` est respecté (l'outil le vérifie) ;
- les conditions d'utilisation des sites aussi ;
- aucune donnée sensible.

Des coordonnées de **personnes**, prises pour prospecter, relèvent du RGPD : un usage professionnel en lien avec leur activité, le droit de s'y opposer annoncé dès le premier message, rien de plus que le nécessaire. Ce n'est pas un conseil juridique. Pour une prospection à grande échelle, on fait valider le procédé.
