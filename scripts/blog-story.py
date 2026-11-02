#!/usr/bin/env python3
"""La story Instagram d'un article du blog (1080 × 1920, JPEG).

Justin, 2 novembre 2026 : « je veux que tu mettes les stories automatiquement quand tu mets les blogs ».
`.github/workflows/blog-publication.yml` lance ce script pour chaque article NEUF, avant la fusion : l'image part donc
avec l'article, dans `blog/img/<slug>-story.jpg`, servie sur teamop.fr. `scripts/instagram-story.js` la publie ensuite,
quand le site est en ligne (Instagram va la chercher à son adresse publique : il veut une adresse, et du JPEG).

    python3 scripts/blog-story.py <slug> [<slug>…]      (racine du dépôt : BLOG_RACINE, sinon le dossier du script)

Ce qu'elle montre, et seulement ça : le logo TEAM OP, la couverture de l'article TELLE QU'ELLE EST (jamais recadrée :
la couverture porte son propre titre, un recadrage le coupait), « Nouvel article », le titre de l'article, et
« À lire sur teamop.fr/blog ». Aucun prix, aucune promesse : rien que l'article ne dise déjà. `tests/test-3236.js`.
"""
import json, os, sys
from PIL import Image, ImageDraw, ImageFont, ImageFilter

RACINE = os.environ.get('BLOG_RACINE') or os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
POLICES = ['/usr/share/fonts/opentype/inter/', '/usr/share/fonts/truetype/inter/']
W, H = 1080, 1920
NUIT = (11, 20, 38)            # le bleu nuit de TEAM OP (#0b1426)
MENTHE = (94, 214, 170)


def police(nom, taille):
    # Inter s'il est là ; sinon DejaVu (installé sur les machines de GitHub) — jamais la police bitmap par défaut,
    # illisible à cette taille
    for d in POLICES:
        p = os.path.join(d, nom)
        if os.path.exists(p):
            return ImageFont.truetype(p, taille)
    gras = 'Bold' in nom or 'Black' in nom
    return ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans%s.ttf' % ('-Bold' if gras else ''), taille)


def couper(d, texte, f, largeur):
    lignes, cour = [], ''
    for mot in texte.split():
        essai = (cour + ' ' + mot).strip()
        if d.textlength(essai, font=f) <= largeur or not cour:
            cour = essai
        else:
            lignes.append(cour)
            cour = mot
    if cour:
        lignes.append(cour)
    return lignes


def story(article):
    im = Image.new('RGB', (W, H), NUIT)
    halo = Image.new('RGB', (W, H), NUIT)
    hd = ImageDraw.Draw(halo)
    hd.ellipse((-300, 1150, 900, 2300), fill=(22, 48, 84))
    hd.ellipse((500, -200, 1400, 700), fill=(18, 36, 66))
    im = halo.filter(ImageFilter.GaussianBlur(160))
    d = ImageDraw.Draw(im)

    logo = Image.open(os.path.join(RACINE, 'icons', 'teamop-192.png')).convert('RGBA').resize((112, 112), Image.LANCZOS)
    masque = Image.new('L', (112, 112), 0)
    ImageDraw.Draw(masque).rounded_rectangle((0, 0, 111, 111), 26, fill=255)
    im.paste(logo, (80, 110), masque)
    d.text((216, 128), 'TEAM OP', font=police('Inter-ExtraBold.otf', 44), fill='white')
    d.text((216, 182), 'Le blog', font=police('Inter-Medium.otf', 32), fill=(170, 186, 210))

    cv = Image.open(os.path.join(RACINE, 'blog', 'img', article['image'])).convert('RGB')
    cw = 920
    ch = round(cv.height * cw / cv.width)
    ch = min(ch, 700)                                   # une couverture très haute ne pousse pas le titre hors de l'écran
    cv = cv.resize((cw, round(cv.height * cw / cv.width)), Image.LANCZOS).crop((0, 0, cw, ch))
    m = Image.new('L', (cw, ch), 0)
    ImageDraw.Draw(m).rounded_rectangle((0, 0, cw - 1, ch - 1), 36, fill=255)
    im.paste(cv, (80, 320), m)

    y = 320 + ch + 90
    fe = police('Inter-Bold.otf', 30)
    et = 'NOUVEL ARTICLE'
    d.rounded_rectangle((80, y, 80 + d.textlength(et, font=fe) + 48, y + 60), 30, fill=MENTHE)
    d.text((104, y + 12), et, font=fe, fill=NUIT)

    titre = article['titre'].replace('’', "'")
    y += 100
    bas = 1660                                          # le pied commence à 1700
    for taille in (76, 68, 60, 52):
        ft = police('Inter-ExtraBold.otf', taille)
        lignes = couper(d, titre, ft, 920)
        if y + len(lignes) * int(taille * 1.18) <= bas:
            break
    for l in lignes:
        d.text((80, y), l, font=ft, fill='white')
        y += int(ft.size * 1.18)

    d.text((80, 1700), 'À lire sur teamop.fr/blog', font=police('Inter-SemiBold.otf', 40), fill=(200, 212, 230))
    return im


def main(slugs):
    articles = json.load(open(os.path.join(RACINE, 'contenu', 'blog', 'articles.json'), encoding='utf-8'))
    par_slug = {a['slug']: a for a in articles}
    code = 0
    for s in slugs:
        a = par_slug.get(s)
        if not a or not a.get('image'):
            print('blog-story : %s inconnu ou sans couverture, pas de story' % s)
            code = 1
            continue
        sortie = os.path.join(RACINE, 'blog', 'img', s + '-story.jpg')
        story(a).save(sortie, 'JPEG', quality=88, optimize=True, progressive=True)
        print('blog-story : %s (%d Ko)' % (os.path.relpath(sortie, RACINE), os.path.getsize(sortie) // 1024))
    return code


if __name__ == '__main__':
    if len(sys.argv) < 2:
        print('usage : python3 scripts/blog-story.py <slug> [<slug>…]')
        sys.exit(2)
    sys.exit(main(sys.argv[1:]))
