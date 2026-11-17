#!/usr/bin/env python3
# Contre-épreuve des corrections de la partie « client » (17 novembre 2026) : on REMET chaque défaut un par un dans une COPIE de la page
# (jamais dans le dépôt), et la sonde qui garde ce défaut doit tomber. Une mutation qui ne casse rien dit que la sonde ne regarde pas au bon endroit.
# Usage : python3 mutations-client.py <dossier racine temporaire>   puis :   RACINE=<dossier> node client-<sonde>.js …
import os, sys, shutil
dep = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
dest = sys.argv[1]
if os.path.exists(dest): shutil.rmtree(dest)
os.makedirs(os.path.join(dest, 'apercu'))
for nom in os.listdir(dep):
    if nom in ('apercu', '.git', 'node_modules', 'scratchpad') or nom.startswith('.'): continue
    os.symlink(os.path.join(dep, nom), os.path.join(dest, nom))
os.symlink(os.path.join(dep, 'scratchpad'), os.path.join(dest, 'scratchpad'))
for nom in os.listdir(os.path.join(dep, 'apercu')):
    src = os.path.join(dep, 'apercu', nom)
    if nom != 'prototype-op-gestion.html': os.symlink(src, os.path.join(dest, 'apercu', nom))
s = open(os.path.join(dep, 'apercu', 'prototype-op-gestion.html'), encoding='utf-8').read()
M = [
 ('client-01 tutoiement des messages du devis', "'Cochez « bon pour accord » pour accepter.'", "'Coche « bon pour accord » pour accepter.'"),
 ('client-01 tutoiement (nom)', "'Indiquez votre nom et votre prénom.'", "'Indique ton nom et ton prénom.'"),
 ('client-01 tutoiement (signature)', "'Signez dans le cadre, avec le doigt.'", "'Signe dans le cadre, avec le doigt.'"),
 ('client-10 date d’expiration', "return toast('La date d’expiration s’écrit mois/année, par exemple 12/28.');", ";"),
 ('client-02 confirmation lue par le client', "toast(RL_ACTIF && ROLE === 'client' ? 'Merci, votre devis est accepté", "toast(false ? 'Merci, votre devis est accepté"),
 ('client-03 signature : retour dans l’espace', "if (chezCli) { EC.tab = 'contrats'; aller('espaceclient'); } else aller('contrat-x-' + k.id); toast(chezCli", "aller('contrat-x-' + k.id); toast(chezCli"),
 ('client-04 refus vouvoyé', "if (ROLE === 'client') m = 'Cette page n’est pas dans votre espace.';   /*", "if (false) m = 'x';   /*"),
 ('client-05 compte rendu du client', "if (RL_ACTIF && ROLE === 'client') { go = '';", "if (false) { go = '';"),
 ('client-06 demande de contrat', "if (!b) return; ecDemande(true); });", "if (!b) return; ecDemande(); });"),
 ('client-07 mots du devis', "mot = DV_MOTS[e] || DV_MOTS.attente;", "mot = DV_ETATS[e];"),
 ('client-08 « En retard »', "i.st === 'retard' ? 'Un peu de retard' : 'Prévue'", "i.st === 'retard' ? 'En retard' : 'Prévue'"),
 ('client-09 tuiles du paiement', '<div class="cx-montants deux">', '<div class="cx-montants">'),
 ('client-10 code au dos', "return toast('Le code au dos a 3 chiffres.');", ";"),
 ('client-13 contrat d’un autre client', "if (RL_ACTIF && ROLE === 'client' && k.cli !== RL_CLI.cli) return vueEspaceClient();", ""),
 ('client-16 demande retrouvée', "${i.clientDit ? `<br>", "${false ? `<br>"),
 ('client-17 date écrite deux fois', "esc(String(f.objet).split(' · ' + f.emise).join(''))", "esc(f.objet)"),
 ('client-18 copier l’IBAN', ">Copier</button></div>${ENTREPRISE.bic", ">Recopier</button></div>${ENTREPRISE.bic"),
 ('client-20 bouton Jour/Nuit au doigt', "@media (pointer:coarse){.pied .mode-seg button{min-height:44px}}", ""),
 ('client-21 message du téléchargement', "toast(RL_ACTIF && ROLE === 'client' ? 'Votre téléchargement démarre.", "toast(false ? 'Votre téléchargement démarre."),
]
sel = [int(x) for x in sys.argv[2].split(',')] if len(sys.argv) > 2 else range(len(M))
for i in sel:
    nom, a, n = M[i]
    if s.count(a) != 1: sys.exit('mutation « %s » : motif trouvé %d fois (attendu 1)' % (nom, s.count(a)))
    s = s.replace(a, n)
    print('mutée :', nom)
open(os.path.join(dest, 'apercu', 'prototype-op-gestion.html'), 'w', encoding='utf-8').write(s)
