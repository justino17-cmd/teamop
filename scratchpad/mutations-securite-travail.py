#!/usr/bin/env python3
"""Mutations de test-3206 (relecture de sécurité des agents au travail), 30 octobre 2026.

Règle du dépôt : correctif -> banc -> `git commit` -> mutation -> `git checkout`. Chaque fichier est restauré par `git checkout -- <fichier>` après chaque mutation :
lancer d'abord `git status` (rien de non commité dans ces fichiers). Chaque mutation doit faire tomber test-3206 (sortie 1) ET changer vraiment le fichier (`git diff` non vide).
Au premier plan, depuis la racine : python3 scratchpad/mutations-securite-travail.py
"""
import subprocess, sys

OPS, GR, TR, CE, CA, MA, IX = ("server/agents-courriers-ops.js", "server/agents-grille.js", "server/agents-travail.js",
                               "server/cerveau.js", "server/agent-camille.js", "server/agent-margaux.js", "server/index.js")
MUT = [
    ("B1 le contrôle ne refuse plus les chiffres du modèle", OPS, "if (/\\d/.test(t) || MOIS.test(t) || JOURS_EN_LETTRES.test(t)) f.push('fait_du_modele');", ""),
    ("B1 le contrôle ne refuse plus l'ultimatum", OPS, "if (ULTIMATUM.test(t)) f.push('ultimatum');", ""),
    ("B1 le contrôle ne refuse plus les dates en lettres", OPS, "|| MOIS.test(t) ||", "||"),
    ("B1 la ligne des faits passe APRÈS le paragraphe du modèle", OPS, "['Bonjour,', '', ligneFaits, '', corps, '', d.regler", "['Bonjour,', '', corps, '', ligneFaits, '', d.regler"),
    ("B1 la ligne des faits perd l'ancienneté", OPS, "(age !== null ? ', en attente de règlement depuis ' + age + ' jour' + (age > 1 ? 's' : '') : '')", "''"),
    ("B1 Margaux ne passe plus le corps au contrôle", MA, "const fautes = OPS.fautesCorpsRelance(lu.corps);", "const fautes = [];"),
    ("B1 le prompt laisse le modèle écrire les faits", MA, "tu n’en écris AUCUN", "tu les écris"),
    ("B2 l'indemnité n'attend plus Justin", MA, "const aRevoirI = o.etape === 7 && !indemniteConfirmee ?", "const aRevoirI = false ?"),
    ("B2 le réglage est toujours « confirmé »", MA, "const indemniteConfirmee = ctx.indemniteConfirmee === true;", "const indemniteConfirmee = true;"),
    ("B2 le réglage accepte n'importe quelle valeur", MA, "const indemniteConfirmee = ctx.indemniteConfirmee === true;", "const indemniteConfirmee = !!ctx.indemniteConfirmee;"),
    ("B2 l'article 7 des CGV revient", OPS, "engager les démarches de recouvrement, après vous en avoir informé par écrit. Nous préférons", "engager les démarches de recouvrement prévues à l’article 7 de nos conditions générales, après vous en avoir informé par écrit. Nous préférons"),
    ("B2 index.js ne passe plus le réglage", IX, "indemniteConfirmee: !!(config.agents && config.agents.indemniteConfirmee === true) });", "});"),
    ("B2 index.js confirme par défaut", IX, "indemniteConfirmee: !!(config.agents && config.agents.indemniteConfirmee === true) });", "indemniteConfirmee: !(config.agents && config.agents.indemniteConfirmee === false) });"),
    ("B3 « juste » ne bloque plus sans citation", GR, "(c.id === 'repond_a_tout' || c.id === 'juste')) bloque = true;", "(c.id === 'repond_a_tout' && lu.sansReponse && lu.sansReponse.length || c.id === 'juste' && lu.invente && lu.invente.length)) bloque = true;"),
    ("B3 « répond à tout » ne bloque plus sous 4", GR, "const SEUIL = { min: 3, moyenne: 4.0, fond: 4 };", "const SEUIL = { min: 3, moyenne: 4.0, fond: 3 };"),
    ("B3 l'envoi automatique à moyenne 4,0", GR, "const SEUIL_AUTO = { moyenne: 4.5, min: 4 };", "const SEUIL_AUTO = { moyenne: 4.0, min: 4 };"),
    ("B3 l'envoi automatique ignore les critères bas", GR, "typeof n === 'number' && n >= SEUIL_AUTO.min", "typeof n === 'number'"),
    ("B3 produire n'applique plus le seuil d'envoi", TR, "if (v.etat === 'ok' && !G.autoriseEnvoi(v)) return", "if (false) return"),
    ("A1 la validation du message sensible est coupée", CA, "const validationT = () => enTravail && (", "const validationT = () => false && ("),
    ("A1 le dépôt final ne force plus la validation", CA, "controle, reecrit: res.reecrit, forceValidation: validationT() });", "controle, reecrit: res.reecrit });"),
    ("A1 l'accusé facture/technique ne force plus la validation", CA, "reecrit: perso ? perso.reecrit : false, forceValidation: validationT() });", "reecrit: perso ? perso.reecrit : false });"),
    ("A2 le plafond de Camille reste à 35 $", CE, "const PLAFONDS_TRAVAIL = { camille: 100,", "const PLAFONDS_TRAVAIL = { camille: 35,"),
    ("A2 le plafond travail s'applique même coupé", CE, "return enTravail && Object.prototype.hasOwnProperty.call(PLAFONDS_TRAVAIL, id)", "return Object.prototype.hasOwnProperty.call(PLAFONDS_TRAVAIL, id)"),
    ("A2 le réglage de Justin ne gagne plus", CE, "if (typeof o === 'number' && Number.isFinite(o) && o > 0) return Math.min(o, TOTAL);", ""),
    ("A2 plus de repli au plafond", CA, "if (!r.ok && enTravail && ['plafond_agent', 'plafond_jour'].includes(r.raison)) {", "if (false) {"),
    ("A2 le repli se fait passer pour un contrôle bon", CA, "controle: { etat: 'non_verifie', fautes: [], juge: false, raison: 'plafond atteint : accusé écrit par le code' }", "controle: { etat: 'bon', fautes: [], juge: false }"),
    ("A2 le repli part SEUL (contrôle bon ET validation retirée ; l'un sans l'autre est neutralisé par la garde jumelle)", CA, "controle: { etat: 'non_verifie', fautes: [], juge: false, raison: 'plafond atteint : accusé écrit par le code' }, forceValidation: true });", "controle: { etat: 'bon', fautes: [], juge: false }, forceValidation: false });"),
    ("A3 l'alerte se répète à chaque échec", TR, "if (dejaDit.get(cle) === jour) return { fait: false, raison: 'deja_dit' };", ""),
    ("A3 l'alerte ne distingue plus les jours", TR, "dejaDit.set(cle, jour);", "dejaDit.set(cle, 'toujours'); "),
    ("A3 l'alerte parle même coupé", TR, "if (!actif(agent)) return { fait: false, raison: 'coupe' };", ""),
    ("A3 la boucle ne signale plus", TR, "if (!r.ok && o && typeof o.agent === 'string') signaler(o.agent, r.raison);", ""),
    ("A3 produire ne signale plus", TR, "if (r && r.etat === 'echec' && o && typeof o.agent === 'string') signaler(o.agent, r.raison);", ""),
    ("A3 l'alerte cite le message de l'API", TR, "const r = conv.parler(agent, agent, 'Mode travail (' + jour.split('-').reverse().join('/') + ') : ' + phrase,", "const r = conv.parler(agent, agent, 'Mode travail (' + jour.split('-').reverse().join('/') + ') : ' + phrase + ' ' + raison + ' sk-ant-SECRET',"),
]

def sh(*a, **k):
    return subprocess.run(a, capture_output=True, text=True, timeout=k.get("timeout", 150))

bilan = []
for nom, fic, ancien, nouveau in MUT:
    src = open(fic, encoding="utf-8").read()
    if src.count(ancien) != 1:
        bilan.append((nom, "MAL VISÉE (motif trouvé %d fois)" % src.count(ancien)))
        continue
    open(fic, "w", encoding="utf-8").write(src.replace(ancien, nouveau, 1))
    try:
        if not sh("git", "diff", "--stat", "--", fic).stdout.strip():
            bilan.append((nom, "MAL VISÉE (git diff vide)"))
            continue
        try:
            tombe = sh("node", "tests/test-3206.js", timeout=150).returncode != 0
        except subprocess.TimeoutExpired:
            tombe = True
        bilan.append((nom, "TOMBE" if tombe else "NE MORD PAS"))
    finally:
        sh("git", "checkout", "--", fic)

ok = True
for nom, etat in bilan:
    print("%-70s %s" % (nom, etat))
    ok = ok and etat == "TOMBE"
propre = sh("git", "status", "--short", "--", *sorted({m[1] for m in MUT})).stdout.strip()
print("fichiers mutés restaurés :", "oui" if not propre else "NON — " + propre)
sys.exit(0 if ok and not propre else 1)
