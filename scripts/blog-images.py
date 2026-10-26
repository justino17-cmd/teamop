#!/usr/bin/env python3
"""Pose dans le blog les images que Gemini a dessinées (scripts/blog-gemini.js) — Pillow seul.

    python3 scripts/blog-images.py <manifeste.json> <slug>   les figures en WebP 1200 × 675, la couverture refaite avec sa photo
    python3 scripts/blog-images.py --attente <blog/img/x.webp>   une image d'ATTENTE, pour qu'une figure `data-gemini`
                                                                passe les bancs avant que Gemini la dessine

La couverture se refait dès qu'une photo existe dans contenu/blog/photos/ (celle d'avant comprise) : le titre peut avoir
changé depuis. `BLOG_RACINE` sert aux bancs (tests/test-3060.js)."""
import sys, os, json, glob, subprocess
from PIL import Image

ICI = os.path.dirname(os.path.abspath(__file__))
RACINE = os.environ.get('BLOG_RACINE') or os.path.join(ICI, '..')
L, H = 1200, 675


def recadrer(p):
    """remplit 1200 × 675 sans déformer : on coupe ce qui dépasse, au centre"""
    p = p.convert('RGB')
    w, h = p.size
    if w / h > L / H:
        nw = int(h * L / H); g = (w - nw) // 2; p = p.crop((g, 0, g + nw, h))
    else:
        nh = int(w * H / L); t = (h - nh) // 2; p = p.crop((0, t, w, t + nh))
    return p.resize((L, H), Image.LANCZOS)


def attente(dest):
    os.makedirs(os.path.dirname(os.path.abspath(dest)), exist_ok=True)
    Image.new('RGB', (L, H), (11, 20, 38)).save(dest, 'WEBP', quality=60)
    print('image d\'attente :', dest)


def principal(manifeste, slug):
    man = json.load(open(manifeste, encoding='utf-8'))
    for f in man.get('figures', []):
        dest = os.path.join(RACINE, f['src'].lstrip('/'))
        os.makedirs(os.path.dirname(dest), exist_ok=True)
        recadrer(Image.open(f['brut'])).save(dest, 'WEBP', quality=80, method=6)
        print('figure :', f['src'], os.path.getsize(dest), 'octets')
    photos = sorted(glob.glob(os.path.join(RACINE, 'contenu', 'blog', 'photos', slug + '.*')))
    if photos:
        fiche = next(a for a in json.load(open(os.path.join(RACINE, 'contenu', 'blog', 'articles.json'), encoding='utf-8')) if a['slug'] == slug)
        subprocess.run([sys.executable, os.path.join(ICI, 'blog-couverture.py'), slug, fiche['titre'], photos[0]], check=True,
                       env=dict(os.environ, BLOG_RACINE=RACINE))
        # blog-couverture.py écrit <slug>-couverture.webp ; une fiche qui nomme sa couverture autrement la reçoit à ce nom
        fait = os.path.join(RACINE, 'blog', 'img', slug + '-couverture.webp')
        voulu = os.path.join(RACINE, 'blog', 'img', fiche['image'])
        if os.path.abspath(fait) != os.path.abspath(voulu):
            os.replace(fait, voulu)


if __name__ == '__main__':
    if len(sys.argv) == 3 and sys.argv[1] == '--attente':
        attente(sys.argv[2])
    elif len(sys.argv) == 3:
        principal(sys.argv[1], sys.argv[2])
    else:
        sys.exit(__doc__)
