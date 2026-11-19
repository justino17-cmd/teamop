# Sœur 3 : arrêt du 19/11 (demandé par le chef, question de facturation)
- Args : {"voie":"final-rejeu","familles":["vehtemps","secu","securite","artefact","retour","double"],"arbre":"/home/user/wt-soeur"} — étapes 0 et 1 FINIES (runs wf_cd1a6309-3e1, wf_94bece2c-b01).
- Rejeu : 110 sondes, 110 vertes, 0 rouge, 0 sans total, 0 couverture partielle. Les 6 rouges du premier passage étaient des sondes périmées (livrable final/rejeu-vehtemps.json).
- Défauts de la consigne + ajouts du chef (C1, C2, R1, R5, N-b) : un sous-agent les a corrigés et commités (861ccc2f, sondes durables, mutations-soeur3.py, mutation refusLong mieux visée). Il a été arrêté AVANT son rapport : NON vérifiés par moi — la liste point par point, les chiffres de rejeu après correction (securite-tout, retour-tout, vehtemps, fumee-routes, bancs 835/836/837/1008/2994) et le livrable final/rejeu-soeur3-corrections.json n'existent pas.
- Reste à faire : relire le diff 861ccc2f, rejouer ces sondes, écrire rejeu-soeur3-corrections.json, recontrôle neuf. R2, R3, R4, N-c, U+FFFC : liste de Justin, non touchés.
- Arbre propre, mutations restaurées, navigateurs tués.
