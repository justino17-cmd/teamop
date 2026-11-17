# Lot 4 (Fournisseurs, matériel & produits) : applique lot4-four-a.js / -b.js / .css à apercu/prototype-op-gestion.html.
# Idempotent : refuse de rejouer si le bloc est déjà là. Usage : python3 lot4-patch.py
import re, sys, os
D = os.path.dirname(os.path.abspath(__file__)); P = os.path.join(D, '..', '..', '..', 'apercu', 'prototype-op-gestion.html')
s = open(P, encoding='utf-8').read()
if 'MATÉRIEL — lot 4 : Fournisseurs, matériel & produits' in s: sys.exit('déjà appliqué')
def supprimer(nom):
    global s
    ms = [m.start() for m in re.finditer(r'\nfunction ' + nom + r'\(', s)]
    assert len(ms) == 1, (nom, len(ms))
    st = ms[0]; en = s.index('\n}\n', st) + 2
    s = s[:st] + s[en:]
def remplacer(a, b, n=1):
    global s
    assert s.count(a) == n, (a[:70], s.count(a))
    s = s.replace(a, b)
for f in ['vueProduits', 'vueCommandes', 'vueFournisseurs', 'cmdEdVue', 'cmdFiche', 'cmdEtapes', 'cmdReception', 'cmdRappro', 'cmdEnvoyer', 'cmdEnvoiVue', 'fournFiche', 'fournListe', 'foLocal', 'foAjouterDir', 'foBandeau', 'cmdLigne', 'cmdTrouve', 'pdxFournApres']: supprimer(f)
# les enveloppes qui retouchaient ce que ce lot réécrit
def sans_enveloppe(debut, fin):
    global s
    i = s.index(debut); j = s.index(fin, i) + len(fin); s = s[:i] + s[j:]
sans_enveloppe("(() => { const o = vueProduits; vueProduits = function(){", "}; })();\n")
sans_enveloppe("(() => { const o = vueCommandes; vueCommandes = function(){", "return h; }; })();\n")
sans_enveloppe("(() => { const o = fournFiche; fournFiche = function(id){", "})();\n") if False else None
i = s.index("(() => { const o = fournFiche; fournFiche = function(id){"); j = s.index('\n', i) + 1; s = s[:i] + s[j:]
# état de départ : Commandes ; le bon part en un geste ; retirer un fournisseur ferme la fenêtre
remplacer("prAC = false, prVue = 'articles';", "prAC = false, prVue = 'commandes';")
remplacer("prAlerte = false; prAC = false; prVue = 'articles'; PDX.etat = 'tous'", "prAlerte = false; prAC = false; prVue = 'commandes'; try { localStorage.removeItem('opg_prvue'); } catch (e) {} PDX.etat = 'tous'")
remplacer("""  if (a === 'envoi') { if (x) return cmdEnvoiVue(x); const c = cmdEdEnregistrer(); return cmdEnvoiVue(c.id); }
  if (a === 'go') return cmdEnvoyer(x);""", """  if (a === 'envoyer') { const c = x ? COMMANDES.find(o => o.id === x) : cmdEdEnregistrer(); return c ? cmdEnvoyer(c.id) : null; }""")
remplacer("MES_FOURN.splice(i, 1); fournListe(); rendre();", "MES_FOURN.splice(i, 1); fermerPanneau(); rendre();")
remplacer("partielle:['Reçue en partie', 'st-o'], recue:['Reçue · facture à rapprocher', 'st-o']", "partielle:['Livraison partielle', 'st-o'], recue:['Facture à comparer', 'st-o']")
remplacer("Mettre de côté <b>${pdxQ(qn)}</b> pour ${esc(CLIENTS[i.cli].nom)} · ${esc(pdxJC(i.d))}", "Garder <b>${pdxQ(qn)}</b> pour l’intervention du ${esc(jlong(i.d))} (${esc(CLIENTS[i.cli].nom)})")
css = open(os.path.join(D, 'lot4-four.css'), encoding='utf-8').read().rstrip('\n') + '\n'
anc = "/* ── ce que d'autres écrans empruntent encore à Dépôts"
assert s.count(anc) == 1; s = s.replace(anc, css + anc)
js = open(os.path.join(D, 'lot4-four-a.js'), encoding='utf-8').read().rstrip('\n') + '\n' + open(os.path.join(D, 'lot4-four-b.js'), encoding='utf-8').read().strip('\n') + '\n'
anc = "/* ── pointage ── */\n/* ══ TEMPS DE TRAVAIL — lot « pointage »"
assert s.count(anc) == 1; s = s.replace(anc, js + anc)
open(P, 'w', encoding='utf-8').write(s)
print('ok', len(s))
