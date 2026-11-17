#!/usr/bin/env python3
# Angle « courrier » : les CORRECTIFS PROPOSÉS, posés dans une COPIE des pages (jamais dans les pages elles-mêmes : l'audit ne modifie rien).
#   python3 courrier-corrections.py          → fabrique /tmp/opg-courrier-copie (apercu/ en liens, sauf les deux pages corrigées) et écrit courrier-corrections.diff
# Les sondes se rejouent ensuite contre la copie :  RACINE=/tmp/opg-courrier-copie node scratchpad/proto-final/securite/courrier-gestes.js
# Chaque remplacement DOIT trouver sa cible le nombre de fois attendu, sinon le script s'arrête : un correctif qui ne s'applique pas ne prouve rien.
import os, sys, shutil, subprocess
ICI = os.path.dirname(os.path.abspath(__file__))
DEPOT = os.path.abspath(os.path.join(ICI, '..', '..', '..'))
COPIE = os.environ.get('OPG_COPIE', '/tmp/opg-courrier-copie')
SANS = [x for x in os.environ.get('OPG_SANS', '').split(',') if x]   # contre-épreuve : « sans courrier-01 » → la copie garde CE défaut, la sonde correspondante doit retomber (le .diff n'est alors pas écrit)
APERCU = os.path.join(DEPOT, 'apercu')

# (page, libellé, ancien, nouveau, nombre d'occurrences attendu)
CORRECTIFS = [
 # courrier-01 : « À faire maintenant » écrit le titre d'une TÂCHE (née de l'objet d'un courriel) en HTML
 ('prototype-op-gestion.html', 'courrier-01 : l\'accueil écrit le titre et le détail d\'une tâche en texte',
  '<span><b>${a.t}</b><br><span class="gris petit">${a.s}</span></span>', '<span><b>${esc(a.t)}</b><br><span class="gris petit">${esc(a.s)}</span></span>', 1),
 # courrier-02 : l'Historique écrit l'ACTION en HTML ; « a répondu à <nom d'expéditeur> » et « a écrit à <adresse> » portent du texte venu d'un inconnu
 ('prototype-op-gestion.html', 'courrier-02a : « a répondu à » échappe le nom de l\'expéditeur',
  "'a répondu à ' + m.de.nom,", "'a répondu à ' + esc(m.de.nom),", 1),
 ('prototype-op-gestion.html', 'courrier-02b : « a écrit à » échappe le nom du client ou l\'adresse',
  "'a écrit à ' + (cli ? CLIENTS[cli].nom : mail.a)", "'a écrit à ' + esc(cli ? CLIENTS[cli].nom : mail.a)", 1),
 # courrier-04 : un nom d'expéditeur devient le nom d'un CLIENT : on le nettoie à l'entrée (pas de balise, pas de formule de tableur, borné)
 ('prototype-op-gestion.html', 'courrier-04a : mailNom() — le nom d\'un inconnu se nettoie à l\'entrée',
  "function mlLire(m){", "/* un nom venu d'un courriel est celui d'un INCONNU : ni balise, ni caractère de contrôle ou d'inversion de sens, ni formule de tableur (= + - @ en tête), 80 signes au plus */\nconst mailNom = m => String(m.de.nom || m.de.mail || '').replace(/[<>\"\\u0000-\\u001f\\u007f\\u202a-\\u202e\\u2066-\\u2069]/g, '').replace(/^[\\s=+\\-@]+/, '').trim().slice(0, 80) || String(m.de.mail || 'Nouveau contact').replace(/^[=+\\-@]+/, '');\nfunction mlLire(m){", 1),
 ('prototype-op-gestion.html', 'courrier-04b : les trois créations de client depuis un courriel prennent mailNom(m)',
  "CLIENTS[k] = { nom:m.de.nom, type:'part', contact:m.de.nom,", "CLIENTS[k] = { nom:mailNom(m), type:'part', contact:mailNom(m),", 2),
 ('prototype-op-gestion.html', 'courrier-04c : idem pour la confirmation d\'un créneau',
  "CLIENTS[cl] = { nom:m.de.nom, type:'part', contact:m.de.nom,", "CLIENTS[cl] = { nom:mailNom(m), type:'part', contact:mailNom(m),", 1),
 ('prototype-op-gestion.html', 'courrier-04d : le nom de qui « a signé » par courriel et la trace du devis',
  "dvAccepter(R.devis, { via:'e-mail', par:m.de.nom })", "dvAccepter(R.devis, { via:'e-mail', par:mailNom(m) })", 1),
 ('prototype-op-gestion.html', 'courrier-04e : la trace du devis préparé depuis un courriel',
  "trace:'Préparé depuis le courriel de ' + m.de.nom", "trace:'Préparé depuis le courriel de ' + mailNom(m)", 1),
 # courrier-03 : un numéro de devis ou de facture cité dans le texte ne désigne un document que si l'expéditeur est le CLIENT de ce document
 ('prototype-op-gestion.html', 'courrier-03 : mlLire ne rattache un devis, une facture ou une commande qu\'à son propre client / fournisseur',
  "cmd:bc && COMMANDES.find(c => c.num === bc), facture:fac && FACTURES.find(o => o.num === fac), devis:dvn && DV.find(o => o.num === dvn),",
  "cmd:bc && f && COMMANDES.find(c => c.num === bc), facture:fac && cli && FACTURES.find(o => o.num === fac && o.cli === cli), devis:dvn && cli && DV.find(o => o.num === dvn && o.cli === cli),", 1),
 # courrier-05 : les exports ne produisent pas de formule
 ('prototype-op-gestion.html', 'courrier-05a : les deux tableaux de Véhicules neutralisent = + - @ en tête de cellule',
  "q = s => '\"' + String(s).replace(/\"/g, '\"\"') + '\"'", "q = s => '\"' + (/^[=+\\-@\\t\\r]/.test(String(s)) ? \"'\" : '') + String(s).replace(/\"/g, '\"\"') + '\"'", 2),
 ('prototype-op-gestion.html', 'courrier-05b : le FEC du mois neutralise les colonnes de libellé (compte, tiers, pièce, écriture)',
  "m(l.cr), '', '', CP.envoye ? dt(CP.envoye) : '', '', ''].map(net).join('\\t')", "m(l.cr), '', '', CP.envoye ? dt(CP.envoye) : '', '', ''].map((v, i) => [5, 7, 8, 10].includes(i) ? net(v).replace(/^[=+\\-@]/, \"'$&\") : net(v)).join('\\t')", 1),
 ('prototype-comptabilite.html', 'courrier-05c : le FEC de la Comptabilité neutralise les mêmes colonnes',
  "l.let || '', d8(l.dlet), d8(e.valideLe), '', ''].map(net)));", "l.let || '', d8(l.dlet), d8(e.valideLe), '', ''].map((v, i) => [5, 7, 8, 10].includes(i) ? net(v).replace(/^[=+\\-@]/, \"'$&\") : net(v))));", 1),
 # courrier-07 : un lien dont l'adresse est en lettres non latines s'écrit sous sa forme réelle (xn--…), pas sous son aspect
 ('prototype-courrier.js', 'courrier-07 : corpsLu écrit l\'adresse réelle d\'un lien en lettres non latines (punycode)',
  "return '<a class=\"rlien\" href=\"'+u+'\" target=\"_blank\" rel=\"noopener noreferrer nofollow\">'+u+'</a>'+fin; });",
  "return '<a class=\"rlien\" href=\"'+u+'\" target=\"_blank\" rel=\"noopener noreferrer nofollow\">'+adresseVue(u)+'</a>'+fin; });", 1),
 ('prototype-courrier.js', 'courrier-07c : un lien qui porte des identifiants dans son adresse (https://impots.gouv.fr@evil.example/) n\'est pas rendu cliquable',
  "if(!/^https?:\\/\\/./.test(u)) return u+fin;", "if(!/^https?:\\/\\/./.test(u)||/^https?:\\/\\/[^\\/?#]*@/i.test(u)) return u+fin;", 1),
 ('prototype-courrier.js', 'courrier-07b : adresseVue()',
  "function corpsLu(s,liens){",
  "/* un lien se lit tel qu'il s'ouvre : « аррӏе.com » en lettres cyrilliques ressemble à « apple.com », on écrit donc sa forme réelle (xn--…) quand l'adresse n'est pas en lettres latines */\n  function adresseVue(u){ var m=/^(https?:\\/\\/)([^\\/?#]*)/i.exec(u); if(!m||!/[^\\x00-\\x7f]/.test(m[2])) return u; try{ return m[1]+new URL(m[1]+m[2]).host+u.slice(m[0].length); }catch(e){ return u; } }\n  function corpsLu(s,liens){", 1),
 # courrier-06 : l'import de catalogue borne ce qu'il accepte
 ('prototype-op-gestion.html', 'courrier-06a : la désignation, la référence, le code-barres et l\'unité d\'une ligne de fichier sont bornés, sans balise ni formule ; l\'unité est une LISTE de ce qui est permis',
  "rows.forEach((r, i) => { const nom = m.nom != null ? String(r[m.nom] || '').trim() : ''; if (!nom) return;\n    const ref = m.ref != null ? String(r[m.ref] || '').trim() : '', ean = m.ean != null ? String(r[m.ean] || '').trim() : '', u = m.u != null ? String(r[m.u] || '').trim() : '';",
  "const propre = (t, n) => String(t || '').replace(/[<>\\u0000-\\u001f\\u007f\\u202a-\\u202e\\u2066-\\u2069]/g, ' ').trim().replace(/^[=+\\-@]+/, '').slice(0, n);   /* un fichier venu d'un tiers : bornée, sans balise, sans formule de tableur en tête */\n  const unite = t => { const x = String(t || '').trim(); return /^[\\p{L}\\p{N}\\/².³°µ%. -]{1,12}$/u.test(x) ? x : ''; };   /* l'unité : une liste de ce qui est permis, jamais de ce qui est interdit */\n  rows.forEach((r, i) => { const nom = m.nom != null ? propre(r[m.nom], 200) : ''; if (!nom) return;\n    const ref = m.ref != null ? propre(r[m.ref], 40) : '', ean = m.ean != null ? propre(r[m.ean], 20) : '', u = m.u != null ? unite(r[m.u]) : '';", 1),
 ('prototype-op-gestion.html', 'courrier-06b : un prix absurde (> 1 000 000 €) est refusé',
  "if (pa == null || pa <= 0) return;\n    const vivants", "if (pa == null || pa <= 0 || pa > 1e6) return;\n    const vivants", 1),
]

def lire(p): return open(p, encoding='utf8').read()
def main():
    shutil.rmtree(COPIE, ignore_errors=True); os.makedirs(os.path.join(COPIE, 'apercu'))
    for e in os.listdir(DEPOT):
        if e in ('apercu', '.git'): continue
        os.symlink(os.path.join(DEPOT, e), os.path.join(COPIE, e))
    pages = sorted({c[0] for c in CORRECTIFS})
    for e in os.listdir(APERCU):
        if e in pages: continue
        os.symlink(os.path.join(APERCU, e), os.path.join(COPIE, 'apercu', e))
    textes = {p: lire(os.path.join(APERCU, p)) for p in pages}
    for page, lib, ancien, nouveau, n in CORRECTIFS:
        if any(lib.startswith(x) for x in SANS): print('— laissé tel quel :', lib); continue
        k = textes[page].count(ancien)
        if k != n:
            print('✗ %s : « %s » trouvé %d fois, attendu %d' % (lib, ancien[:70], k, n)); sys.exit(1)
        textes[page] = textes[page].replace(ancien, nouveau); print('✓', lib, '(%d)' % k)
    for p, t in textes.items(): open(os.path.join(COPIE, 'apercu', p), 'w', encoding='utf8').write(t)
    if SANS: print('copie avec défauts remis :', COPIE); return
    # le diff (git apply le rejoue depuis la racine du dépôt)
    sortie = []
    for p in pages:
        r = subprocess.run(['diff', '-u', '--label', 'a/apercu/' + p, '--label', 'b/apercu/' + p, os.path.join(APERCU, p), os.path.join(COPIE, 'apercu', p)], capture_output=True, text=True)
        sortie.append(r.stdout)
    tete = ("CORRECTIFS PROPOSÉS — angle « courrier » (17 novembre 2026). Rien n'est appliqué : le chef de chantier décide. Se rejoue : git apply --check <ce fichier>, puis git apply.\n"
            "Ce que contient chaque morceau (les mêmes sondes, rejouées contre une copie corrigée par courrier-corrections.py, passent : voir courrier.json › contreEpreuve) :\n"
            " · prototype-op-gestion.html : courrier-01 (accueil), courrier-02 (historique), courrier-03 (confiance : un numéro de devis/facture ne désigne que le document de SON client),\n"
            "   courrier-04 (nom d'expéditeur nettoyé avant de devenir un nom de client), courrier-05 (exports : pas de formule), courrier-06 (import de catalogue borné) ;\n"
            " · prototype-comptabilite.html : courrier-05 (FEC de la Comptabilité).\n"
            "Pas dans ce fichier : l'authenticité de l'expéditeur (SPF / DKIM / DMARC) — c'est le SERVEUR qui la lit (règle pour la vraie application).\n\n")
    open(os.path.join(ICI, 'courrier-corrections.diff'), 'w', encoding='utf8').write(tete + ''.join(sortie))
    print('copie :', COPIE, '· diff :', os.path.join(ICI, 'courrier-corrections.diff'))
main()
