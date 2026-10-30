#!/usr/bin/env python3
"""Fabrique le contrat d'abonnement d'UN client et le document « Conditions générales et annexes ».

    python3 -I scripts/contrats/fabriquer.py <fiche.json> <dossier de sortie>

⛔ La fiche (nom, adresse, SIRET, e-mail du client, code promo) est une donnée RÉELLE : elle vit HORS du dépôt
(`livrables/`, exclu par .git/info/exclude, ou le dossier temporaire de la session) et les PDF aussi. Ce script n'écrit
aucune donnée de client dans le dépôt, et n'en contient aucune.

Les conditions générales et annexes ne sont PAS réécrites ici : elles se lisent dans `server/contrats-textes/`, la
même source que le serveur sert aux clients. Les notes « [À CONFIRMER …] » sont retirées du PDF remis au client
(elles s'adressent au juriste, pas à lui) — elles restent dans les fichiers tant que personne ne les a tranchées.

Champs de la fiche (exemple fictif : scripts/contrats/fiche-exemple.json) :
  numero, date (texte), ville_signature (facultatif),
  client: {nom, representant, qualite, siret, adresse: [lignes], email},
  activite (« climatisation et pompes à chaleur »…), formule (« Business »), cp (fichier des conditions particulières),
  utilisateurs, prix_utilisateur, acces (« teamop.fr/e/… »), essai_jusqu_au (texte, facultatif),
  remise (facultatif) : {par_mois, mois, code}
"""
import html, json, os, re, sys
from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Paragraph, PageBreak, Spacer, Flowable, KeepTogether, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.colors import HexColor

if len(sys.argv) != 3: sys.exit(__doc__)
FICHE, OUT = sys.argv[1], sys.argv[2]
RACINE = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if os.path.realpath(OUT).startswith(os.path.realpath(RACINE) + os.sep) and not os.path.realpath(OUT).startswith(os.path.realpath(os.path.join(RACINE, 'livrables'))):
  sys.exit('⛔ Sortie dans le dépôt refusée : un contrat porte des données réelles. Utiliser livrables/ (exclu) ou un dossier hors du dépôt.')
F = json.load(open(FICHE, encoding='utf8')); C = F['client']; os.makedirs(OUT, exist_ok=True)
e = html.escape

# L'éditeur : ce sont les mentions légales publiques de TEAM OP (mentions-legales.html), pas une donnée de client.
EDITEUR = ['Justin Biret, entrepreneur individuel', 'SIREN 107 995 011', '10 rue de la Gravière, 17220 Salles-sur-Mer', 'contact@teamop.fr']
police = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
pdfmetrics.registerFont(TTFont('DV', police)); pdfmetrics.registerFont(TTFont('DVB', police.replace('Sans.ttf', 'Sans-Bold.ttf')))
st = getSampleStyleSheet()
corps = ParagraphStyle('c', parent=st['Normal'], fontName='DV', fontSize=9.5, leading=13.5, spaceAfter=5)
gros = ParagraphStyle('g', parent=corps, fontName='DVB', fontSize=18, leading=23, spaceAfter=4, textColor=HexColor('#0B1F3A'))
sous = ParagraphStyle('s', parent=corps, fontSize=10, textColor=HexColor('#55607A'), spaceAfter=14)
titre = ParagraphStyle('t', parent=corps, fontName='DVB', fontSize=14, leading=18, spaceAfter=10, textColor=HexColor('#0B1F3A'))
art = ParagraphStyle('a', parent=corps, fontName='DVB', fontSize=10.5, spaceBefore=9, textColor=HexColor('#0B1F3A'))
MARINE = HexColor('#1E3A8A'); LOGO = os.path.join(RACINE, 'icons', 'teamop-192.png')
P = lambda t, s=corps: Paragraph(t, s)
eur = lambda x: ('%g' % x).replace('.', ',') + ' €'

class Cachet(Flowable):
  w, h = 230, 112
  def wrap(self, *a): return (self.w, self.h)
  def draw(self):
    c = self.canv; c.saveState(); c.setStrokeColor(MARINE); c.setFillColor(MARINE)
    c.setLineWidth(2.2); c.roundRect(0, 0, self.w, self.h, 10); c.setLineWidth(0.8); c.roundRect(5, 5, self.w - 10, self.h - 10, 7)
    c.drawImage(LOGO, 14, self.h - 50, width=34, height=34, mask='auto')
    c.setFont('DVB', 14); c.drawString(56, self.h - 29, 'TEAM OP'); c.setFont('DV', 7.3); c.drawString(56, self.h - 42, 'Justin Biret — entrepreneur individuel')
    yy = self.h - 62
    for l in EDITEUR[1:3] + ['contact@teamop.fr · teamop.fr', 'TVA non applicable, art. 293 B du CGI']: c.drawString(16, yy, l); yy -= 11
    c.restoreState()

def entete(label, pied):
  def page(c, d):
    c.saveState(); c.drawImage(LOGO, 48, A4[1] - 40, width=24, height=24, mask='auto')
    c.setFont('DVB', 11); c.setFillColor(HexColor('#0B1F3A')); c.drawString(78, A4[1] - 31, 'TEAM OP')
    c.setFont('DV', 7.5); c.setFillColor(HexColor('#55607A')); c.drawRightString(A4[0] - 48, A4[1] - 31, label)
    c.setStrokeColor(HexColor('#D5DBE6')); c.line(48, A4[1] - 46, A4[0] - 48, A4[1] - 46)
    c.drawString(48, 25, pied); c.drawRightString(A4[0] - 48, 25, 'page %d' % d.page); c.restoreState()
  return page

def doc(nom, titreDoc, label, pied, s):
  pg = entete(label, pied)
  SimpleDocTemplate(os.path.join(OUT, nom), pagesize=A4, leftMargin=48, rightMargin=48, topMargin=64, bottomMargin=48,
                    title=titreDoc, author='TEAM OP').build(s, onFirstPage=pg, onLaterPages=pg)

slug = re.sub(r'[^A-Za-z0-9]+', '-', C['nom']).strip('-').upper()
lab = 'Contrat d’abonnement OP GESTION — TEAM OP / ' + e(C['nom'])
n_u, pu = int(F['utilisateurs']), float(F['prix_utilisateur'])

# ── Le contrat ──
s = [P('CONTRAT D’ABONNEMENT — OP GESTION', gros), P('Contrat n° %s · établi le %s' % (e(F['numero']), e(F['date'])), sous), P('Entre les soussignés', art)]
vide = '……………………………………'
cli = '<b>%s</b><br/>représentée par %s, en sa qualité de %s<br/>SIRET : %s<br/>Adresse : %s<br/>%s<br/><i>ci-après « le Client »</i>' % (
  e(C['nom']), e(C.get('representant') or vide), e(C.get('qualite') or vide), e(C.get('siret') or vide),
  '<br/>'.join(e(l) for l in (C.get('adresse') or [vide, vide])), e(C.get('email', '')))
tab = Table([[P('<b>TEAM OP</b><br/>' + '<br/>'.join(EDITEUR) + '<br/><i>ci-après « TEAM OP »</i>'), P(cli)]], colWidths=[245, 245])
tab.setStyle(TableStyle([('BOX', (0, 0), (0, 0), 0.6, HexColor('#C7CFDD')), ('BOX', (1, 0), (1, 0), 0.6, HexColor('#C7CFDD')), ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                         ('LEFTPADDING', (0, 0), (-1, -1), 9), ('TOPPADDING', (0, 0), (-1, -1), 8), ('BOTTOMPADDING', (0, 0), (-1, -1), 8)]))
num = iter(range(1, 20)); A = lambda t: P('Article %d — %s' % (next(num), t), art)
s += [tab, Spacer(1, 6), P('Il a été convenu ce qui suit.'),
  A('Objet'), P('TEAM OP met à la disposition du Client, sous forme d’abonnement en ligne, l’application <b>OP GESTION</b> (gestion des interventions, du planning, des clients, des devis et des factures), réglée pour son activité de <b>%s</b>.' % e(F['activite'])),
  A('Formule souscrite'), P('Formule <b>OP GESTION %s</b>, pour <b>%d utilisateur%s</b>. Le détail des fonctions comprises figure dans les conditions particulières (annexe 1 des conditions générales jointes).' % (e(F['formule']), n_u, 's' if n_u > 1 else '')),
  A('Accès'), P('L’application est accessible à l’adresse propre au Client : <b>%s</b>. TEAM OP remet au Client un identifiant et un mot de passe provisoire ; à la première connexion, le Client choisit son propre mot de passe. Le Client crée lui-même les comptes de ses utilisateurs, dans la limite de sa formule.' % e(F['acces']))]
if F.get('essai_jusqu_au'):
  s += [A('Période d’essai'), P('Le Client bénéficie d’une <b>période d’essai offerte jusqu’au %s inclus</b>. Aucun prélèvement n’a lieu pendant cette période.' % e(F['essai_jusqu_au']))]
s += [A('Prix et conditions commerciales'), P('Tarif de la formule %s : %s par mois et par utilisateur, soit %s par mois pour %d utilisateur%s. TVA non applicable, article 293 B du CGI.' % (e(F['formule']), eur(pu), eur(pu * n_u), n_u, 's' if n_u > 1 else ''))]
R = F.get('remise')
if R:
  s.append(P('À titre commercial, TEAM OP accorde au Client une <b>remise de %s par mois pendant %d mois</b> à compter du premier paiement, au moyen du code <b>%s</b> à saisir lors du paiement. Le Client règle ainsi <b>%s par mois pendant %d mois</b> ; à l’issue de cette période, le tarif en vigueur s’applique.' % (
    eur(float(R['par_mois'])), int(R['mois']), e(R['code']), eur(pu * n_u - float(R['par_mois'])), int(R['mois']))))
s += [P('Paiement mensuel par carte bancaire, via la plateforme sécurisée Stripe, depuis « Mon espace » sur teamop.fr.'),
  A('Durée et résiliation'), P('Le contrat prend effet à sa signature. L’abonnement est <b>sans engagement de durée</b> : le Client peut y mettre fin à tout moment, avec effet à la fin de la période mensuelle en cours, dans les conditions des conditions générales.'),
  A('Données'), P('Les données saisies par le Client lui appartiennent. TEAM OP les traite pour son compte, en qualité de sous-traitant, dans les conditions du contrat de sous-traitance (annexe 4 des conditions générales jointes).'),
  A('Documents contractuels'), P('Le contrat se compose, par ordre de priorité : (1) le présent contrat ; (2) les conditions particulières OP GESTION %s ; (3) les conditions d’utilisation d’OP GESTION ; (4) les conditions générales TEAM OP ; (5) le contrat de sous-traitance des données. Ces documents (2) à (5) sont réunis dans le document « Conditions générales et annexes » remis avec le présent contrat. En cas de contradiction, le document placé le plus haut l’emporte.' % e(F['formule'])),
  Spacer(1, 8), P('Fait en deux exemplaires, le ……………………………, à ……………………………')]
sig = Table([[P('<b>Pour TEAM OP</b><br/>Justin Biret'), P('<b>Pour le Client — %s</b><br/>%s<br/><font size="8">Signature précédée de la mention « Lu et approuvé », et cachet de l’entreprise</font>' % (e(C['nom']), e(C.get('representant') or '')))], [Cachet(), '']],
            colWidths=[245, 245], rowHeights=[None, 128])
sig.setStyle(TableStyle([('VALIGN', (0, 0), (-1, -1), 'TOP'), ('BOX', (1, 1), (1, 1), 0.6, HexColor('#C7CFDD')), ('TOPPADDING', (0, 0), (-1, -1), 6)]))
s += [Spacer(1, 6), KeepTogether([sig])]
doc('Contrat-%s.pdf' % slug, lab, lab, 'Contrat n° %s · Paraphes : ______ / ______' % F['numero'], s)

# ── Conditions générales et annexes : la source du serveur, notes au juriste retirées ──
def bloc(chemin, n):
  t = re.sub(r'\s*\[À CONFIRMER[^\]]*\]', '', open(chemin, encoding='utf8').read())
  L = t.strip().split('\n'); out = [P('Annexe %d — %s' % (n, e(L[0])), titre)]
  for l in L[1:]:
    if not l.strip(): continue
    x = e(l)
    if re.match(r'^(Article|ANNEXE|Annexe)\b', l) or (len(l) < 70 and l.isupper()): out.append(P(x, art))
    elif l.startswith('- '): out.append(P('• ' + x[2:]))
    else: out.append(P(x))
  return out
T = os.path.join(RACINE, 'server', 'contrats-textes')
annexes = [(F['cp'], 'Conditions particulières OP GESTION ' + F['formule']), ('conditions_op_gestion.txt', 'Conditions d’utilisation d’OP GESTION'),
           ('conditions_generales.txt', 'Conditions générales TEAM OP'), ('dpa.txt', 'Contrat de sous-traitance des données (RGPD)')]
s = [P('CONDITIONS GÉNÉRALES ET ANNEXES', gros), P('Remises avec le contrat d’abonnement OP GESTION n° %s — TEAM OP / %s' % (e(F['numero']), e(C['nom'])), sous),
     P('Ce document réunit les conditions qui complètent le contrat :')] + [P('• Annexe %d — %s' % (i, e(t))) for i, (_, t) in enumerate(annexes, 1)]
for i, (fn, _) in enumerate(annexes, 1): s += [PageBreak()] + bloc(os.path.join(T, fn), i)
doc('Conditions-generales-TEAM-OP.pdf', 'Conditions générales et annexes — TEAM OP', 'Conditions générales et annexes', 'TEAM OP — Justin Biret EI · SIREN 107 995 011 · contact@teamop.fr', s)
reste = sum(len(re.findall(r'\[À CONFIRMER', open(os.path.join(T, fn), encoding='utf8').read())) for fn, _ in annexes)
print('✓ %s : Contrat-%s.pdf et Conditions-generales-TEAM-OP.pdf' % (OUT, slug))
if reste: print('⚠️ %d point(s) « À CONFIRMER » restent dans les textes source (retirés du PDF, pas tranchés) : à faire valider.' % reste)
