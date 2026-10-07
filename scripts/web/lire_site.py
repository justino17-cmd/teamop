"""Lire un site avec Crawl4AI et le rendre en markdown propre — appelé par lire-site.sh (voir ce fichier et LISEZMOI.md).

Trois usages : une page (son texte), --liens (ses liens, internes d'abord : de quoi cartographier un site sans autre outil),
--pages N (la page puis jusqu'à N pages du même site, en suivant ses liens internes). Le robots.txt est respecté.
"""
import argparse
import asyncio
import sys
from urllib.parse import urlparse

from crawl4ai import AsyncWebCrawler, BrowserConfig, CrawlerRunConfig


def meme_site(a, b):
    return urlparse(a).netloc.lower().removeprefix('www.') == urlparse(b).netloc.lower().removeprefix('www.')


async def principal(args):
    navigateur = BrowserConfig(headless=True, verbose=False)
    lecture = CrawlerRunConfig(check_robots_txt=True, verbose=False)
    async with AsyncWebCrawler(config=navigateur) as c:
        r = await c.arun(url=args.url, config=lecture)
        if not r.success:
            print(f"✗ {args.url} n'a pas pu être lu : {r.error_message or r.status_code}", file=sys.stderr)
            return 1
        if args.liens:
            internes = [l.get('href') for l in (r.links or {}).get('internal', []) if l.get('href')]
            externes = [l.get('href') for l in (r.links or {}).get('external', []) if l.get('href')]
            print(f"# Liens de {args.url}\n\n## Du même site ({len(set(internes))})")
            for h in sorted(set(internes)):
                print('- ' + h)
            print(f"\n## Ailleurs ({len(set(externes))})")
            for h in sorted(set(externes)):
                print('- ' + h)
            return 0
        print(f"# {args.url}\n")
        print(str(r.markdown or ''))
        if args.pages > 0:
            vus = {args.url}
            a_lire = [l.get('href') for l in (r.links or {}).get('internal', []) if l.get('href') and meme_site(l.get('href'), args.url)]
            for u in a_lire:
                if len(vus) > args.pages:
                    break
                if u in vus:
                    continue
                vus.add(u)
                s = await c.arun(url=u, config=lecture)
                if s.success:
                    print(f"\n\n---\n\n# {u}\n")
                    print(str(s.markdown or ''))
                else:
                    print(f"\n\n---\n\n# {u}\n\n(non lue : {s.error_message or s.status_code})")
    return 0


def main():
    p = argparse.ArgumentParser(description='Lire un site en markdown propre (Crawl4AI).')
    p.add_argument('url')
    p.add_argument('--liens', action='store_true', help='lister les liens de la page au lieu de son texte')
    p.add_argument('--pages', type=int, default=0, help='lire aussi jusqu\'à N pages du même site')
    args = p.parse_args()
    if not args.url.startswith(('http://', 'https://')):
        args.url = 'https://' + args.url
    sys.exit(asyncio.run(principal(args)))


if __name__ == '__main__':
    main()
