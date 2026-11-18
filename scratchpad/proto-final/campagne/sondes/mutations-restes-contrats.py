#!/usr/bin/env python3
"""Mutations des RESTES DES CONTRATS (17 novembre 2026) : sur des COPIES (jamais dans le dépôt), on remet un défaut à la fois puis on lance la sonde qui doit le voir
(RACINE=<copie>). « mord » = la sonde rend au moins un ✗ (code 1) ou meurt (code 2) ; « survit » = elle reste verte : la sonde ne regarde pas là, ou une autre garde couvre.
Avant chaque mutation on vérifie que l'ancien texte est UNIQUE (une mutation qui frappe ailleurs ne prouve rien) et que le fichier a bien changé.
Usage : python3 mutations-restes-contrats.py [filtre-sur-le-nom]   — le journal va dans mutations-restes-contrats.log (hors dépôt)"""
import os, shutil, subprocess, sys, time
ICI = os.path.dirname(os.path.abspath(__file__)); DEPOT = os.path.abspath(os.path.join(ICI, '..', '..', '..', '..'))
CAP = '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/restes-contrats'; COPIE = os.path.join(CAP, 'mut', 'racine')
os.makedirs(os.path.join(COPIE, 'apercu'), exist_ok=True)
for f in ['prototype-op-gestion.html', 'prototype-documents.html', 'prototype-comptabilite.html', 'prototype-paiement.html', 'opcourrier.js', 'prototype-courrier.js']:
    shutil.copy(os.path.join(DEPOT, 'apercu', f), os.path.join(COPIE, 'apercu', f))
PAGE = open(os.path.join(DEPOT, 'apercu', 'prototype-op-gestion.html'), encoding='utf-8').read()
S1 = 'restes-contrats-1.js'
S4 = 'restes-contrats-4.js'
def M(nom, old, new, sonde=S1, profil='mac'): return dict(nom=nom, old=old, new=new, sonde=sonde, profil=profil)
MUT = [
 M("C1 le prix d'une visite n'est plus arrondi au centime (casse 1)", "const ctrPart = (prix, n, rang) => { const p = Math.round(prix * 100), u = Math.round(p / n), r = rang >= n ? p - u * (n - 1) : u; return r / 100; };", "const ctrPart = (prix, n, rang) => prix / n;"),
 M("C2 une pièce posée sur une visite comprise n'est facturée nulle part (casse 2)", "    if (!F.pieces.length) return;\n    FACTURES.unshift({ id:'f-' + i.id, num:'—', cli:i.cli, int:i.id, paieTech:F.paiement, objet:`Pièces", "    return;\n    FACTURES.unshift({ id:'f-' + i.id, num:'—', cli:i.cli, int:i.id, paieTech:F.paiement, objet:`Pièces"),
 M("C3 « Terminer » une visite comprise redit « garantie » (casse 3)", ": kcomp ? 'Terminée : le compte rendu part au client. Visite comprise dans le contrat ' + kcomp.num + ' : pas de facture à part.' :", ":"),
 M("C4 le bloc « Paiement sur place » revient avant la fin (casse 4)", "${ctrCompris(i) && !F.pieces.length ? `<div class=\"carte\"><h3>Paiement</h3>", "${false ? `<div class=\"carte\"><h3>Paiement</h3>"),
 M("C5 un contrat échu redit « dans -16 jours » (casse 5)", "const ctrDansTxt = n => n < 0 ? 'échu depuis ' + (-n) + ' jour' + (-n > 1 ? 's' : '') :", "const ctrDansTxt = n => n < 0 ? 'dans ' + n + ' jours' :"),
 M("C6 un second « Oui, renouveler » renouvelle deux fois", "if (!k || k.st !== 'signe' || k.renouvele) { fermerPanneau(); return; }   // un second appui", "if (!k || k.st !== 'signe') { fermerPanneau(); return; }   // un second appui"),
 M("C7 un contrat renouvelé est compté deux fois dans « HT par an »", "const ctrActifs = () => CONTRATS.filter(k => k.st === 'signe' && !k.renouvele);", "const ctrActifs = () => CONTRATS.filter(k => k.st === 'signe');"),
 M("C8 « Mettre fin » laisse les visites non faites au planning", "sorties.forEach(i => INTS.splice(INTS.indexOf(i), 1));", ""),
 M("C9 un brouillon de contrat propose « Envoyer par e-mail » (contrats-16)", "${ROLE === 'client' || d.hasAttribute('data-sans-mail') || (ROLE === 'tech' && d.classList.contains('paie-bul-doc')) ?", "${ROLE === 'client' || (ROLE === 'tech' && d.classList.contains('paie-bul-doc')) ?"),
 M("C10 la fausse barre d'adresse revient (contrats-14)", "<div class=\"client-web\" style=\"max-width:620px\"><div class=\"corps\">", "<div class=\"client-web\" style=\"max-width:620px\"><div class=\"url\">🔒 climservices17.teamop.fr/signer/K7P2</div><div class=\"corps\">"),
 M("C11 le mode « chaque mois » ne prépare plus la facture du premier mois (contrats-15)", "if (k.fact === 'visite' || FACTURES.some(f => f.id === 'fc-' + k.id)) return null;", "if (k.fact !== 'an' || FACTURES.some(f => f.id === 'fc-' + k.id)) return null;"),
 M("C12 au téléphone, le PDF repasse avant les cartes (contrats-13)", ".ctr-grille > .col{order:1}.ctr-grille > .ctr-doc{order:2}", ".ctr-grille > .col{order:2}.ctr-grille > .ctr-doc{order:1}", S1, 'iphone'),
 M("C13 l'article 4 du PDF ne dit plus le TTC (décision i)", "soit ${eur(ctrTTC(ctrCentimes(B.prix) || 0, B))} TTC (TVA ${ctrTva(B)} %)", "(TVA en sus)"),
 M("C14 le pied du PDF redit « Modèle de démonstration » (contrats-06)", "<div class=\"pdf-pied\">${ENTREPRISE.nom} · ${ENTREPRISE.adr}", "<div class=\"pdf-pied\">Modèle de démonstration, à faire relire avant tout usage. ${ENTREPRISE.nom} · ${ENTREPRISE.adr}"),
 M("C15 les visites d'un renouvellement lisent celles de l'ancien contrat", "&& ctrDeVisite(o) === k);", ");"),
 M("C16 le PDF d'un contrat terminé redit « à signer »", "const sig = k && k.st !== 'envoye' ? (k.sigImg", "const sig = k && k.st === 'signe' ? (k.sigImg"),
 M("C18 « Mettre fin » ne note plus les visites de départ à l'ancien contrat (recontrôle 1)", "    ctrFigerVisites(k);   // AVANT de changer l'état", "    //   // AVANT de changer l'état", "restes-contrats-1-recontrole.js"),
 M("C19 le TTC d'un prix « abc » redit NaN (recontrôle 1)", "return isFinite(h) ? Math.round(h * (1 + ctrTva(k) / 100) * 100) / 100 : 0; };", "return Math.round(h * (1 + ctrTva(k) / 100) * 100) / 100; };", "restes-contrats-1-recontrole.js"),
 M("C20 la visite d'un contrat terminé écrase de nouveau son nom (320 px)", ".ctr-vl{flex-wrap:wrap}", ".ctr-vl{flex-wrap:nowrap}", "restes-contrats-1-recontrole-ecrans.js", "petit"),
 M("C21 un prix à trois décimales se range tel quel (recontrôle 1)", "prix:ctrCentimes(B.prix) || 0, fact:B.fact, st:'envoye'", "prix:Number(B.prix) || 0, fact:B.fact, st:'envoye'", "restes-contrats-1-recontrole.js"),
 M("C22 une visite sortie du planning redit une date (recontrôle 1)", "(fini && !v.fait ? '' : ' · ' + jlong(v.d))}</span><span class=\"st ${v.fait", "' · ' + jlong(v.d)}</span><span class=\"st ${v.fait", "restes-contrats-1-recontrole-ecrans.js", "petit"),
 M("C23 le prix rangé redit l'arrondi flottant : 1.005 range 1,00 € alors que l'aperçu dit 1,01 € (tour 3)", "if (/^\\d+(\\.\\d+)?$/.test(t)) return Number(Math.round(Number(t + 'e2')) + 'e-2');", "if (false) return 0;", "restes-contrats-2-recontrole.js"),
 M("C24 la carte Facturation d'un contrat repasse sur une ligne forcée (320 px)", ".ctr-fact{flex-wrap:wrap}", ".ctr-fact{flex-wrap:nowrap}", "restes-contrats-2-recontrole-facturation.js", "petit"),
 M("C25 l'aperçu lit le TTC sur la saisie brute (tour 4 : 99.995 → 119,99 au lieu de 120,00)", "soit ${eur(ctrTTC(ctrCentimes(B.prix) || 0, B))} TTC (TVA ${ctrTva(B)}\xa0%)", "soit ${eur(ctrTTC(B.prix, B))} TTC (TVA ${ctrTva(B)}\xa0%)", S4),
 M("C26 l'aperçu lit le prix par visite sur la saisie brute (tour 4 : 100.005 sur 2 visites → 50,00 au lieu de 50,01)", "prixVisite = ctrPart(ctrCentimes(B.prix) || 0, Number(B.freq) || 1, 1);", "prixVisite = (Number(B.prix)||0) / (Number(B.freq)||1);", S4),
 M("C27 le plafond se juge de nouveau sur la saisie brute (tour 4 : 1000000.004 refusé)", "if (ctrCentimes(B.prix) > CTR_PRIX_MAX) {", "if (Number(B.prix) > CTR_PRIX_MAX) {", S4),
 M("C28 le tableau des Contrats ne se replie plus quand la CARTE est étroite (iPad portrait, tour 4)", ".ctr-liste{container:ctrl / inline-size}", ".ctr-liste{}", S4, 'ipad'),
 M("C29 le total à sept chiffres reprend ses 22 px au téléphone (tour 4)", ".kpis .kpi.kpi-long b{font-size:clamp(14px,4.2vw,22px)}", ".kpis .kpi.kpi-long b{font-size:22px}", S4, 'petit'),
 M("C17 la liste composée ne dit plus le TTC (décision i)", "${x.type !== 'devis' && x.ttc > 0 ? `<small>${eur(x.ttc / 100)} TTC</small>` : ''}", "", "restes-contrats-composes.js"),
]
filtre = sys.argv[1] if len(sys.argv) > 1 else ''
log = open(os.path.join(CAP, 'mutations-restes-contrats.log'), 'a')
def dire(t): print(t, flush=True); log.write(t + '\n'); log.flush()
bilan = []
for m in MUT:
    if filtre and filtre not in m['nom']: continue
    n = PAGE.count(m['old'])
    if n != 1: dire(f"?? {m['nom']} : l'ancien texte apparaît {n} fois (il en faut UNE) — mutation non jouée"); bilan.append((m['nom'], 'non jouée')); continue
    neuf = PAGE.replace(m['old'], m['new'])
    if neuf == PAGE: dire(f"?? {m['nom']} : le fichier n'a pas changé"); bilan.append((m['nom'], 'non jouée')); continue
    open(os.path.join(COPIE, 'apercu', 'prototype-op-gestion.html'), 'w', encoding='utf-8').write(neuf)
    t0 = time.time()
    try:
        r = subprocess.run(['node', m['sonde'], m['profil']], cwd=ICI, env=dict(os.environ, RACINE=COPIE), capture_output=True, text=True, timeout=900)
        code = r.returncode; sortie = r.stdout
    except subprocess.TimeoutExpired:
        code = 124; sortie = ''
    tomb = [l.strip()[:110] for l in sortie.splitlines() if l.strip().startswith('✗')][:2]
    etat = 'MORD' if code in (1, 2) else ('délai' if code == 124 else 'SURVIT')
    dire(f"{etat} ({code}, {int(time.time() - t0)} s) {m['nom']} {tomb}"); bilan.append((m['nom'], etat))
open(os.path.join(COPIE, 'apercu', 'prototype-op-gestion.html'), 'w', encoding='utf-8').write(PAGE)
dire(f"== {sum(1 for _, e in bilan if e == 'MORD')} mordent · {sum(1 for _, e in bilan if e == 'SURVIT')} survivent · {sum(1 for _, e in bilan if e not in ('MORD', 'SURVIT'))} non jouées ou en délai")
