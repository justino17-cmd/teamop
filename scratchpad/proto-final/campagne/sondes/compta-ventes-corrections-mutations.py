#!/usr/bin/env python3
"""Contre-épreuve des corrections de « compta-ventes » (17 novembre 2026) : on REMET chaque défaut dans une COPIE des pages (jamais dans le dépôt :
aucun `git checkout` à craindre) et la sonde qui garde la correction doit TOMBER. Une mutation qui ne casse rien dit que la sonde ne regarde pas au bon endroit.
usage : python3 compta-ventes-corrections-mutations.py [numéro ...]      sans argument : toutes."""
import os, re, shutil, subprocess, sys, tempfile
RACINE = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..', '..'))
S = os.path.join(RACINE, 'scratchpad/proto-final/campagne/sondes')
G = 'apercu/prototype-op-gestion.html'; C = 'apercu/prototype-comptabilite.html'
M = [
 ('M1 quantité illisible redevient « 1 » en silence', G, "if (!/^\\d+([.,]\\d+)?$/.test(qTxt.replace(/\\s/g, '')) || !(q > 0)) {", "if (false) {", 'parcours-a'),
 ('M2 le client est de nouveau choisi d\'office', G, '<select class="saisie" id="nf-c"><option value="">Choisir le client…</option>', '<select class="saisie" id="nf-c">', 'parcours-a'),
 ('M3 une ligne sans nom passe pour prête', G, "const ligneOk = l => l.pu != null && String(l.d || '').trim() !== '';", "const ligneOk = l => l.pu != null;", 'parcours-a'),
 ('M4 la ligne ajoutée redevient « Ligne libre »', G, "f.lignes.push({ d:'', q:'1', pu:null }); rendre();", "f.lignes.push({ d:'Ligne libre', q:'1', pu:null }); rendre();", 'parcours-a'),
 ('M5 le bandeau « sans prix » redevient de l\'échafaudage', G, '<div class="bandeau-info"><b>${[sansPrix', '<div class="bandeau-proto"><b>${[sansPrix', 'parcours-a'),
 ('M6 l\'avoir n\'est plus offert sur une facture envoyée', G, "${f.st === 'retard' || f.st === 'envoyee' ? `<div class=\"carte\"><h3>Une erreur sur cette facture ?</h3>", "${false ? `<div class=\"carte\"><h3>Une erreur sur cette facture ?</h3>", 'parcours-c'),
 ('M7 l\'avoir ne passe pas la facture à « annulée »', G, "if (f.st === 'envoyee' || f.st === 'retard') f.st = 'annulee';", "", 'parcours-c'),
 ('M8 la relance promet un lien qu\'on ne voit pas', G, '<span class="lien-pay">Payer ${eur(restant(f))} par carte</span><br><br>', '', 'parcours-c'),
 ('M9 « 1 240,01 » se lit de nouveau 1 € (parseFloat)', G, "v0 = dvLireNb(document.getElementById('pp-m').value)", "v0 = parseFloat(document.getElementById('pp-m').value.replace(',','.')) || 0", 'parcours-b'),
 ('M10 « Paiement reçu » lit de nouveau 1 € pour « 1 114,00 »', G, "v = dvLireNb(document.getElementById('e-v').value)", "v = parseFloat(document.getElementById('e-v').value.replace(',','.')) || 0", 'parcours-b'),
 ('M11 l\'acompte HT redevient le HT « au plus près »', G, "let a = a0, mieux = Infinity;", "let a = a0, mieux = -1;", 'parcours-i'),
 ('M12 la facture annulée compte encore dans le « à recevoir »', G, "const restant = f => f.st === 'annulee' ? 0 : ttcDe(f) - (f.recu || 0);", "const restant = f => ttcDe(f) - (f.recu || 0);", 'parcours-c'),
 ('M13 le cadre garde la facture annulée « à encaisser »', C, "return !lettrer([F.ref, ref(ea, i)], ea.date > AUJ ? AUJ : ea.date).err;", "return false;", 'annulee-cadre'),
 ('M14 le PDF du cadre redevient l\'aperçu d\'une ligne', C, "if (cmptParent({ opc_ouvrir:{ sorte:'pdf', cle:num } })) return;", "", 'parcours-d'),
 ('M15 « Annuler » de la ligne retirée : la croix ne retire plus rien', G, "const l = f.lignes.splice(k, 1)[0]; rendre();", "const l = f.lignes[k]; rendre();", 'parcours-a'),
]
def jouer(i):
    nom, fichier, ancien, nouveau, sonde = M[i]
    tmp = tempfile.mkdtemp(prefix='mut-cv-'); os.makedirs(os.path.join(tmp, 'apercu'))
    for f in os.listdir(os.path.join(RACINE, 'apercu')):
        src = os.path.join(RACINE, 'apercu', f); dst = os.path.join(tmp, 'apercu', f)
        if os.path.join('apercu', f) == fichier:
            t = open(src, encoding='utf-8').read()
            if t.count(ancien) != 1: print('  ⚠ ancre introuvable ou multiple (%d) : %s' % (t.count(ancien), nom)); shutil.rmtree(tmp); return None
            open(dst, 'w', encoding='utf-8').write(t.replace(ancien, nouveau))
        else: os.symlink(src, dst)
    env = dict(os.environ, RACINE=tmp)
    try:
        r = subprocess.run(['node', os.path.join(S, 'compta-ventes-%s.js' % sonde), 'mac'], env=env, capture_output=True, text=True, timeout=420, cwd=RACINE)
        sortie = r.stdout + r.stderr; ko = re.findall(r'(\d+) ✓ · (\d+) ✗', sortie)
        mord = r.returncode != 0 or (ko and int(ko[-1][1]) > 0)
        print('  %s %s → %s (%s)' % ('✓ mord' if mord else '✗ NE MORD PAS', nom, ko[-1] if ko else r.returncode, sonde)); sys.stdout.flush()
        if mord: [print('      ✗', l[:170]) for l in sortie.split('\n') if l.strip().startswith('✗')][:3]
        return mord
    except subprocess.TimeoutExpired: print('  ⏱ délai : %s' % nom); return None
    finally: shutil.rmtree(tmp, ignore_errors=True)
sel = [int(a) - 1 for a in sys.argv[1:]] or range(len(M)); res = [jouer(i) for i in sel]
print('\n%d mutations jouées · %d mordent · %d ne mordent pas · %d sans verdict' % (len(res), sum(1 for x in res if x is True), sum(1 for x in res if x is False), sum(1 for x in res if x is None)))
sys.exit(1 if any(x is False for x in res) else 0)
