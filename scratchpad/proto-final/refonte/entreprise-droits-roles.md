# Tri des décisions « au nom du rôle » (étape 5, droits qui agissent · 17 novembre 2026)

Relevé par `grep "ROLE ===\|ROLE !=="` sur la page au moment de l’étape (123 occurrences). Règle de tri de la spécification : si la ligne REFUSE ou CACHE un geste ou une information, c’est un droit (une case) ; si elle choisit entre deux MISES EN PAGE du même écran, c’est la forme et elle reste. **Les lignes déjà converties sont marquées « converti »** ; les autres disent pourquoi elles restent.

| ligne | fonction | test | classement |
|---|---|---|---|
| 4811 | finiEcran | `ROLE === 'tech'` | forme : le technicien voit l’écran personnel (« Mon camion » là où le bureau voit « Stock ») |
| 4859 | vueClientVoit | `ROLE === 'tech'` | forme : le technicien voit l’écran personnel (« Mon camion » là où le bureau voit « Stock ») |
| 5245 | vueSigner | `ROLE === 'client'` | forme : l’espace client n’est pas une personne de l’entreprise |
| 5247 | vueSigner | `ROLE === 'client'` | forme : l’espace client n’est pas une personne de l’entreprise |
| 5476 | docBarres | `ROLE === 'client'` | forme : l’espace client n’est pas une personne de l’entreprise |
| 5476 | docBarres | `ROLE === 'tech'` | forme : le technicien voit l’écran personnel (« Mon camion » là où le bureau voit « Stock ») |
| 5490 | docPlein | `ROLE === 'client'` | forme : l’espace client n’est pas une personne de l’entreprise |
| 5490 | docPlein | `ROLE === 'tech'` | forme : le technicien voit l’écran personnel (« Mon camion » là où le bureau voit « Stock ») |
| 6418 | tDetail | `ROLE !== 'tech'` | forme : le technicien voit l’écran personnel (« Mon camion » là où le bureau voit « Stock ») |
| 6425 | tDetail | `ROLE !== 'tech'` | forme : le technicien voit l’écran personnel (« Mon camion » là où le bureau voit « Stock ») |
| 6432 | tDetail | `ROLE !== 'tech'` | forme : le technicien voit l’écran personnel (« Mon camion » là où le bureau voit « Stock ») |
| 6655 | aLecture | `ROLE === 'tech'` | forme : le technicien voit l’écran personnel (« Mon camion » là où le bureau voit « Stock ») |
| 7260 | aTech | `ROLE === 'tech'` | forme : le technicien voit l’écran personnel (« Mon camion » là où le bureau voit « Stock ») |
| 7261 | aCommeSeg | `ROLE === 'tech'` | forme : le technicien voit l’écran personnel (« Mon camion » là où le bureau voit « Stock ») |
| 7489 | somme | `ROLE !== 'gestion'` | à relire par la voie qui possède l’écran (Matériel, Véhicules, Temps de travail, Boîte mail) ou échafaudage de revue : ne refuse aucun geste |
| 8238 | majCollant | `ROLE === 'client'` | forme : l’espace client n’est pas une personne de l’entreprise |
| 11329 | rlLieu | `ROLE === 'tech'` | forme : le technicien voit l’écran personnel (« Mon camion » là où le bureau voit « Stock ») |
| 11354 | rlPermis | `ROLE === 'client'` | converti (une case) |
| 11354 | rlPermis | `ROLE === 'compta'` | converti (une case) |
| 11399 | peut | `ROLE === 'client'` | converti (une case) |
| 11561 | droitsGeste | `ROLE === 'client'` | forme : l’espace client n’est pas une personne de l’entreprise |
| 11594 | droitsCss | `ROLE === 'client'` | forme : l’espace client n’est pas une personne de l’entreprise |
| 11611 | droitsNote | `ROLE === 'client'` | forme : l’espace client n’est pas une personne de l’entreprise |
| 11611 | droitsNote | `ROLE === 'compta'` | forme : la fenêtre OP COMPTABLE du comptable |
| 11626 | droitsVide | `ROLE === 'client'` | forme : l’espace client n’est pas une personne de l’entreprise |
| 11626 | droitsVide | `ROLE === 'compta'` | forme : la fenêtre OP COMPTABLE du comptable |
| 11688 | rlBande | `ROLE === 'client'` | forme : l’espace client n’est pas une personne de l’entreprise |
| 11711 | rlQuiMenu | `ROLE === 'patron'` | à relire par la voie qui possède l’écran (Matériel, Véhicules, Temps de travail, Boîte mail) ou échafaudage de revue : ne refuse aucun geste |
| 11713 | rlOuverture | `ROLE === 'compta'` | forme : la fenêtre OP COMPTABLE du comptable |
| 11713 | rlOuverture | `ROLE === 'client'` | forme : l’espace client n’est pas une personne de l’entreprise |
| 11715 | rlLignes | `ROLE === 'compta'` | forme : la fenêtre OP COMPTABLE du comptable |
| 11716 | rlLignes | `ROLE === 'client'` | forme : l’espace client n’est pas une personne de l’entreprise |
| 11725 | rlPastille | `ROLE === 'tech'` | forme : le technicien voit l’écran personnel (« Mon camion » là où le bureau voit « Stock ») |
| 11726 | rlPastille | `ROLE === 'tech'` | forme : le technicien voit l’écran personnel (« Mon camion » là où le bureau voit « Stock ») |
| 11732 | rlLigneActive | `ROLE === 'tech'` | forme : le technicien voit l’écran personnel (« Mon camion » là où le bureau voit « Stock ») |
| 11733 | rlLigneActive | `ROLE === 'tech'` | forme : le technicien voit l’écran personnel (« Mon camion » là où le bureau voit « Stock ») |
| 11745 | rlLogo | `ROLE === 'client'` | forme : l’espace client n’est pas une personne de l’entreprise |
| 11746 | rlLogo | `ROLE === 'client'` | forme : l’espace client n’est pas une personne de l’entreprise |
| 11747 | rlLogo | `ROLE === 'client'` | forme : l’espace client n’est pas une personne de l’entreprise |
| 11747 | rlLogo | `ROLE === 'client'` | forme : l’espace client n’est pas une personne de l’entreprise |
| 11755 | rlPied | `ROLE !== 'client'` | converti (une case) |
| 11755 | rlPied | `ROLE !== 'compta'` | converti (une case) |
| 11767 | rlMenu | `ROLE === 'client'` | forme : l’espace client n’est pas une personne de l’entreprise |
| 11809 | rlOnglets | `ROLE === 'compta'` | forme : la fenêtre OP COMPTABLE du comptable |
| 11811 | rlOnglets | `ROLE === 'client'` | converti (une case) |
| 11811 | rlOnglets | `ROLE === 'tech'` | converti (une case) |
| 11813 | rlOnglets | `ROLE === 'client'` | forme : l’espace client n’est pas une personne de l’entreprise |
| 11819 | rlBarre | `ROLE === 'client'` | forme : l’espace client n’est pas une personne de l’entreprise |
| 11820 | rlBarre | `ROLE === 'client'` | forme : l’espace client n’est pas une personne de l’entreprise |
| 11820 | rlBarre | `ROLE === 'client'` | forme : l’espace client n’est pas une personne de l’entreprise |
| 11821 | rlBarre | `ROLE === 'client'` | forme : l’espace client n’est pas une personne de l’entreprise |
| 11826 | barreBas | `ROLE === 'client'` | forme : l’espace client n’est pas une personne de l’entreprise |
| 11830 | menuBouton | `ROLE === 'compta'` | forme : la fenêtre OP COMPTABLE du comptable |
| 11831 | menuBouton | `ROLE === 'patron'` | à relire par la voie qui possède l’écran (Matériel, Véhicules, Temps de travail, Boîte mail) ou échafaudage de revue : ne refuse aucun geste |
| 11842 | feuilleMenu | `ROLE === 'patron'` | à relire par la voie qui possède l’écran (Matériel, Véhicules, Temps de travail, Boîte mail) ou échafaudage de revue : ne refuse aucun geste |
| 11852 | feuilleMenu | `ROLE === 'tech'` | forme : le technicien voit l’écran personnel (« Mon camion » là où le bureau voit « Stock ») |
| 11852 | feuilleMenu | `ROLE === 'tech'` | forme : le technicien voit l’écran personnel (« Mon camion » là où le bureau voit « Stock ») |
| 11859 | feuilleMenu | `ROLE === 'tech'` | forme : le technicien voit l’écran personnel (« Mon camion » là où le bureau voit « Stock ») |
| 11868 | feuilleMenu | `ROLE === 'client'` | forme : l’espace client n’est pas une personne de l’entreprise |
| 12071 | rlParcours | `ROLE === 'gestion'` | à relire par la voie qui possède l’écran (Matériel, Véhicules, Temps de travail, Boîte mail) ou échafaudage de revue : ne refuse aucun geste |
| 12073 | rlParcours | `ROLE === 'patron'` | à relire par la voie qui possède l’écran (Matériel, Véhicules, Temps de travail, Boîte mail) ou échafaudage de revue : ne refuse aucun geste |
| 12109 | rlFicheVisite | `ROLE === 'tech'` | forme : le technicien voit l’écran personnel (« Mon camion » là où le bureau voit « Stock ») |
| 12440 | paieATraiter | `ROLE === 'tech'` | forme : le technicien voit l’écran personnel (« Mon camion » là où le bureau voit « Stock ») |
| 13545 | xyLu | `ROLE === 'tech'` | forme : le technicien voit l’écran personnel (« Mon camion » là où le bureau voit « Stock ») |
| 13556 | xyLu | `ROLE === 'gestion'` | converti (une case) |
| 13558 | xyLu | `ROLE !== 'gestion'` | converti (une case) |
| 13576 | tkxPerso | `ROLE === 'gestion'` | à relire par la voie qui possède l’écran (Matériel, Véhicules, Temps de travail, Boîte mail) ou échafaudage de revue : ne refuse aucun geste |
| 13576 | tkxPerso | `ROLE === 'tech'` | forme : le technicien voit l’écran personnel (« Mon camion » là où le bureau voit « Stock ») |
| 13618 | tkxContexte | `ROLE === 'tech'` | forme : le technicien voit l’écran personnel (« Mon camion » là où le bureau voit « Stock ») |
| 13711 | tkxBarre | `ROLE === 'tech'` | forme : le technicien voit l’écran personnel (« Mon camion » là où le bureau voit « Stock ») |
| 13895 | tkxAction | `ROLE === 'tech'` | forme : le technicien voit l’écran personnel (« Mon camion » là où le bureau voit « Stock ») |
| 13981 | tkxRappels | `ROLE === 'gestion'` | à relire par la voie qui possède l’écran (Matériel, Véhicules, Temps de travail, Boîte mail) ou échafaudage de revue : ne refuse aucun geste |
| 14122 | pdxFicheInter | `ROLE === 'patron'` | à relire par la voie qui possède l’écran (Matériel, Véhicules, Temps de travail, Boîte mail) ou échafaudage de revue : ne refuse aucun geste |
| 14129 | pdxFicheInter | `ROLE === 'tech'` | forme : le technicien voit l’écran personnel (« Mon camion » là où le bureau voit « Stock ») |
| 14158 | pdxMatin | `ROLE !== 'patron'` | à relire par la voie qui possède l’écran (Matériel, Véhicules, Temps de travail, Boîte mail) ou échafaudage de revue : ne refuse aucun geste |
| 14636 | sxEstTech | `ROLE === 'tech'` | forme : le technicien voit l’écran personnel (« Mon camion » là où le bureau voit « Stock ») |
| 15251 | msGerant | `ROLE !== 'tech'` | converti (une case) |
| 15251 | msGerant | `ROLE !== 'client'` | converti (une case) |
| 15563 | prFiche | `ROLE === 'tech'` | forme : le technicien voit l’écran personnel (« Mon camion » là où le bureau voit « Stock ») |
| 15861 | vueBoxes | `ROLE === 'tech'` | forme : le technicien voit l’écran personnel (« Mon camion » là où le bureau voit « Stock ») |
| 16148 | bxReserveDe | `ROLE === 'client'` | forme : l’espace client n’est pas une personne de l’entreprise |
| 16149 | bxReserveDe | `ROLE === 'patron'` | à relire par la voie qui possède l’écran (Matériel, Véhicules, Temps de travail, Boîte mail) ou échafaudage de revue : ne refuse aucun geste |
| 16149 | bxReserveDe | `ROLE === 'tech'` | forme : le technicien voit l’écran personnel (« Mon camion » là où le bureau voit « Stock ») |
| 16153 | bxReserveDe | `ROLE === 'client'` | forme : l’espace client n’est pas une personne de l’entreprise |
| 16154 | bxReserveDe | `ROLE === 'patron'` | à relire par la voie qui possède l’écran (Matériel, Véhicules, Temps de travail, Boîte mail) ou échafaudage de revue : ne refuse aucun geste |
| 16168 | bxSurveillerVehicules | `ROLE === 'patron'` | à relire par la voie qui possède l’écran (Matériel, Véhicules, Temps de travail, Boîte mail) ou échafaudage de revue : ne refuse aucun geste |
| 16379 | ptxQuiHeures | `ROLE === 'tech'` | forme : le technicien voit l’écran personnel (« Mon camion » là où le bureau voit « Stock ») |
| 16405 | g | `ROLE !== 'tech'` | forme : le technicien voit l’écran personnel (« Mon camion » là où le bureau voit « Stock ») |
| 16409 | g | `ROLE === 'tech'` | forme : le technicien voit l’écran personnel (« Mon camion » là où le bureau voit « Stock ») |
| 17226 | vxPleinPanel | `ROLE === 'tech'` | forme : le technicien voit l’écran personnel (« Mon camion » là où le bureau voit « Stock ») |
| 17644 | vhBureau | `ROLE === 'gestion'` | converti (une case) |
| 17769 | vehFiche | `ROLE === 'patron'` | à relire par la voie qui possède l’écran (Matériel, Véhicules, Temps de travail, Boîte mail) ou échafaudage de revue : ne refuse aucun geste |
| 18429 | mbxBande | `ROLE === 'patron'` | à relire par la voie qui possède l’écran (Matériel, Véhicules, Temps de travail, Boîte mail) ou échafaudage de revue : ne refuse aucun geste |
| 18429 | mbxBande | `ROLE === 'client'` | forme : l’espace client n’est pas une personne de l’entreprise |
| 18571 | axEstTech | `ROLE === 'tech'` | forme : le technicien voit l’écran personnel (« Mon camion » là où le bureau voit « Stock ») |
| 18572 | axLect | `ROLE !== 'tech'` | converti (une case) |
| 18572 | axLect | `ROLE !== 'client'` | converti (une case) |
| 19455 | entClientJoignable | `ROLE === 'client'` | forme : l’espace client n’est pas une personne de l’entreprise |
| 19459 | entClientJoignable | `ROLE === 'tech'` | forme : le technicien voit l’écran personnel (« Mon camion » là où le bureau voit « Stock ») |
| 20071 | rgVue | `ROLE === 'tech'` | forme : le technicien voit l’écran personnel (« Mon camion » là où le bureau voit « Stock ») |
| 20114 | rgProdZone | `ROLE === 'tech'` | forme : le technicien voit l’écran personnel (« Mon camion » là où le bureau voit « Stock ») |
| 20155 | rgSaisieOuvrir | `ROLE === 'tech'` | forme : le technicien voit l’écran personnel (« Mon camion » là où le bureau voit « Stock ») |
| 20184 | rgSaisieRendre | `ROLE === 'tech'` | forme : le technicien voit l’écran personnel (« Mon camion » là où le bureau voit « Stock ») |
| 20397 | rgPrevenir | `ROLE !== 'tech'` | forme : le technicien voit l’écran personnel (« Mon camion » là où le bureau voit « Stock ») |
| 20397 | rgPrevenir | `ROLE !== 'gestion'` | à relire par la voie qui possède l’écran (Matériel, Véhicules, Temps de travail, Boîte mail) ou échafaudage de revue : ne refuse aucun geste |
| 20397 | rgPrevenir | `ROLE !== 'client'` | forme : l’espace client n’est pas une personne de l’entreprise |
| 20862 | cbApresRendu | `ROLE === 'tech'` | forme : le technicien voit l’écran personnel (« Mon camion » là où le bureau voit « Stock ») |
| 20990 | dxVue | `ROLE === 'tech'` | forme : le technicien voit l’écran personnel (« Mon camion » là où le bureau voit « Stock ») |
| 21117 | dxOuvrir | `ROLE === 'tech'` | forme : le technicien voit l’écran personnel (« Mon camion » là où le bureau voit « Stock ») |
| 21263 | dxCarteInter | `ROLE === 'tech'` | forme : le technicien voit l’écran personnel (« Mon camion » là où le bureau voit « Stock ») |
| 21268 | dxCarteInter | `ROLE === 'tech'` | forme : le technicien voit l’écran personnel (« Mon camion » là où le bureau voit « Stock ») |
| 21273 | dxApres | `ROLE !== 'tech'` | forme : le technicien voit l’écran personnel (« Mon camion » là où le bureau voit « Stock ») |
| 21276 | dxApres | `ROLE === 'tech'` | forme : le technicien voit l’écran personnel (« Mon camion » là où le bureau voit « Stock ») |
| 21354 | cmptRole | `ROLE !== 'patron'` | à relire par la voie qui possède l’écran (Matériel, Véhicules, Temps de travail, Boîte mail) ou échafaudage de revue : ne refuse aucun geste |
| 21354 | cmptRole | `ROLE === 'patron'` | à relire par la voie qui possède l’écran (Matériel, Véhicules, Temps de travail, Boîte mail) ou échafaudage de revue : ne refuse aucun geste |
| 21354 | cmptRole | `ROLE === 'patron'` | à relire par la voie qui possède l’écran (Matériel, Véhicules, Temps de travail, Boîte mail) ou échafaudage de revue : ne refuse aucun geste |
| 21354 | cmptRole | `ROLE === 'compta'` | forme : la fenêtre OP COMPTABLE du comptable |
| 21354 | cmptRole | `ROLE === 'patron'` | à relire par la voie qui possède l’écran (Matériel, Véhicules, Temps de travail, Boîte mail) ou échafaudage de revue : ne refuse aucun geste |
| 22024 | dxCarteRelevee | `ROLE === 'tech'` | forme : le technicien voit l’écran personnel (« Mon camion » là où le bureau voit « Stock ») |
| 22032 | dxCarteRelevee | `ROLE !== 'tech'` | forme : le technicien voit l’écran personnel (« Mon camion » là où le bureau voit « Stock ») |
| 23514 | sessionFermer | `ROLE === 'compta'` | forme : la fenêtre OP COMPTABLE du comptable |
| 23520 | sessionFermer | `ROLE !== 'compta'` | forme : la fenêtre OP COMPTABLE du comptable |
| 24052 | defileCote | `ROLE === 'client'` | forme : l’espace client n’est pas une personne de l’entreprise |

Décompte par valeur : patron 15, gestion 8, tech 53, client 36, compta 11.
