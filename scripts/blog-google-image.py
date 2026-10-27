#!/usr/bin/env python3
"""Image JPEG 4:3 d'un post Google Business Profile, tirée de la couverture WebP d'un article — Pillow seul.

    python3 scripts/blog-google-image.py <slug> <couverture.webp>   écrit blog/img/<couverture>-google.jpg

Google n'accepte en image de post que JPEG ou PNG : la couverture du blog (WebP 16:9) est posée entière, sans rien couper
(un titre écrit sur la couverture ne doit pas être tronqué), sur son propre fond flouté pour atteindre 1200 × 900.
`BLOG_RACINE` sert aux bancs (tests/test-3065.js)."""
import sys, os
from PIL import Image, ImageFilter

RACINE = os.environ.get('BLOG_RACINE') or os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
L, H = 1200, 900


def main(slug, cover):
    src = os.path.join(RACINE, 'blog', 'img', os.path.basename(cover))
    im = Image.open(src).convert('RGB')
    fond = im.resize((L, int(im.height * L / im.width) or 1))
    fond = fond.resize((int(L * H / fond.height), H)) if fond.height < H else fond
    g, t = (fond.width - L) // 2, (fond.height - H) // 2
    fond = fond.crop((g, t, g + L, t + H)).filter(ImageFilter.GaussianBlur(28))
    devant = im.resize((L, round(im.height * L / im.width)), Image.LANCZOS)
    fond.paste(devant, (0, (H - devant.height) // 2))
    dest = os.path.splitext(src)[0] + '-google.jpg'
    fond.save(dest, 'JPEG', quality=88, optimize=True)
    print('image du post Google :', os.path.relpath(dest, RACINE), os.path.getsize(dest), 'octets')


if __name__ == '__main__':
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    main(sys.argv[1], sys.argv[2])
