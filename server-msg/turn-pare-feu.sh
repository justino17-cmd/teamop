#!/bin/bash
# ══ LE PARE-FEU SORTANT DU RELAIS D'APPELS (coturn) — il ne peut parler aux services de la machine que par ses ports de relais ═════════════════════
#
# Usage (root) :   turn-pare-feu.sh start      pose les règles (rejouable : elles se remplacent, ne s'empilent pas)
#                  turn-pare-feu.sh verifier   relit le noyau : sort 1 si les règles n'y sont pas
#                  turn-pare-feu.sh stop       les retire
# Posé par `install-turn.sh` sous /usr/local/sbin/opmsg-turn-pare-feu et rejoué par systemd à CHAQUE démarrage de coturn (`ExecStartPre=+`), retiré à son arrêt (`ExecStopPost=+`).
#
# ⛔ POURQUOI. `denied-peer-ip` refuse au relais les adresses privées et la boucle locale, mais PAS l'adresse publique de la machine elle-même : sans elle, relayer entre deux appareils
# distants est impossible quand ils sont tous deux derrière un relais (le pair de l'un est l'adresse relayée de l'autre — l'adresse de la machine). Mesuré par la relecture sur coturn 4.6.1 : une
# personne qui a une allocation envoie des paquets UDP, de la part de la machine, à n'importe quel service UDP qui écoute sur son adresse publique (un résolveur, un NTP, un service de
# supervision…). Refuser cette adresse à coturn casserait les appels relayés des deux côtés ; on referme donc le trou AILLEURS, là où il se mesure : dans le noyau.
#
# La règle, pour les paquets UDP que coturn (l'utilisateur système `turnserver`) émet vers une adresse de CETTE machine :
#   · vers un port de relais (49160-49999) : PASSE — c'est « relais ↔ relais », le seul trafic local légitime ;
#   · depuis un port d'écoute de coturn (3478, 3479, 5349, 5350) : PASSE — la réponse à un client qui est sur la machine (le contrôle de l'installation) ;
#   · tout le reste : REFUSÉ. Vers l'extérieur, la règle ne dit rien (`RETURN`) : le reste des règles de la machine décide.
# Les mêmes règles en IPv6. Le TCP n'est pas touché : coturn n'ouvre aucun relais TCP (`no-tcp-relay`).
#
# ⛔ SANS PARE-FEU, PAS DE RELAIS : si une règle ne se pose pas, ce script sort en erreur et systemd REFUSE de démarrer coturn (un relais qui parle aux services de la machine est pire qu'un relais
# éteint). IPv6 absent du noyau : sauté, dit. Rien de ce script ne lit ni n'affiche un secret.
set -u
CHAINE="OPMSG-TURN"
UTILISATEUR="${OPMSG_TURN_UTILISATEUR:-turnserver}"
PORT_MIN="${OPMSG_TURN_PORT_MIN:-49160}"
PORT_MAX="${OPMSG_TURN_PORT_MAX:-49999}"
PORTS_ECOUTE="${OPMSG_TURN_PORTS_ECOUTE:-3478,3479,5349,5350}"
IPT4="${OPMSG_IPTABLES:-iptables}"
IPT6="${OPMSG_IP6TABLES:-ip6tables}"

# Ces valeurs viennent de l'environnement de l'unité : on n'y laisse passer que ce qui en a la forme.
[[ "$UTILISATEUR" =~ ^[a-z_][a-z0-9_-]*$ ]] || { echo "pare-feu du relais : nom d'utilisateur illisible"; exit 2; }
[[ "$PORT_MIN" =~ ^[0-9]+$ && "$PORT_MAX" =~ ^[0-9]+$ ]] || { echo "pare-feu du relais : plage de ports illisible"; exit 2; }
[[ "$PORTS_ECOUTE" =~ ^[0-9]+(,[0-9]+)*$ ]] || { echo "pare-feu du relais : ports d'écoute illisibles"; exit 2; }

poser() {
  local ipt="$1"
  "$ipt" -N "$CHAINE" 2>/dev/null || true
  "$ipt" -F "$CHAINE" || return 1
  "$ipt" -A "$CHAINE" -p udp -m addrtype ! --dst-type LOCAL -j RETURN || return 1
  "$ipt" -A "$CHAINE" -p udp --dport "$PORT_MIN:$PORT_MAX" -j RETURN || return 1
  "$ipt" -A "$CHAINE" -p udp -m multiport --sports "$PORTS_ECOUTE" -j RETURN || return 1
  "$ipt" -A "$CHAINE" -p udp -j DROP || return 1
  "$ipt" -C OUTPUT -m owner --uid-owner "$UTILISATEUR" -j "$CHAINE" 2>/dev/null || "$ipt" -I OUTPUT 1 -m owner --uid-owner "$UTILISATEUR" -j "$CHAINE" || return 1
}
retirer() {
  local ipt="$1"
  while "$ipt" -D OUTPUT -m owner --uid-owner "$UTILISATEUR" -j "$CHAINE" 2>/dev/null; do :; done
  "$ipt" -F "$CHAINE" 2>/dev/null || true
  "$ipt" -X "$CHAINE" 2>/dev/null || true
}
# IPv6 existe-t-il pour le noyau ? (un noyau sans IPv6 refuse même de LISTER ip6tables)
ipv6() { command -v "$IPT6" >/dev/null 2>&1 && "$IPT6" -S OUTPUT >/dev/null 2>&1; }
# Les règles sont-elles DANS LE NOYAU ? (le saut depuis OUTPUT existe, et la chaîne finit par refuser) — on relit, on ne croit pas ce que `start` a dit.
en_place() { local ipt="$1"; "$ipt" -C OUTPUT -m owner --uid-owner "$UTILISATEUR" -j "$CHAINE" >/dev/null 2>&1 && "$ipt" -S "$CHAINE" 2>/dev/null | grep -q -e '-j DROP'; }

case "${1:-}" in
  start)
    command -v "$IPT4" >/dev/null 2>&1 || { echo "pare-feu du relais : $IPT4 est absent, le relais ne démarre pas"; exit 1; }
    id -u "$UTILISATEUR" >/dev/null 2>&1 || { echo "pare-feu du relais : l'utilisateur $UTILISATEUR n'existe pas, le relais ne démarre pas"; exit 1; }
    poser "$IPT4" || { echo "pare-feu du relais : les règles IPv4 n'ont pas pu être posées, le relais ne démarre pas"; exit 1; }
    if ipv6; then
      poser "$IPT6" || { echo "pare-feu du relais : les règles IPv6 n'ont pas pu être posées, le relais ne démarre pas"; exit 1; }
      echo "pare-feu du relais : posé (IPv4 et IPv6)"
    else
      echo "pare-feu du relais : posé (IPv4 ; IPv6 absent de ce noyau)"
    fi
    ;;
  verifier)
    en_place "$IPT4" || { echo "pare-feu du relais : ABSENT (IPv4)"; exit 1; }
    if ipv6; then en_place "$IPT6" || { echo "pare-feu du relais : ABSENT (IPv6)"; exit 1; }; fi
    echo "pare-feu du relais : en place"
    ;;
  stop)
    retirer "$IPT4"
    if ipv6; then retirer "$IPT6"; fi
    ;;
  *) echo "usage : opmsg-turn-pare-feu <start|verifier|stop>"; exit 2 ;;
esac
