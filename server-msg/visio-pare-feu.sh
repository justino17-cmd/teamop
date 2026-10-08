#!/bin/bash
# ══ LE PARE-FEU SORTANT DU SERVEUR DE VISIO (LiveKit) — pas d'UDP vers la machine elle-même ni vers un réseau privé ═════════════════════
#
# Usage (root) :   visio-pare-feu.sh start      pose les règles (rejouable : elles se remplacent, ne s'empilent pas)
#                  visio-pare-feu.sh verifier   relit le noyau : sort 1 si les règles n'y sont pas
#                  visio-pare-feu.sh stop       les retire
# Posé par `install-sfu.sh` sous /usr/local/sbin/opmsg-visio-pare-feu et rejoué par systemd à CHAQUE démarrage du serveur de visio (`ExecStartPre=+`), retiré à son arrêt (`ExecStopPost=+`).
# L'unité lui donne son compte et sa chaîne (OPMSG_VISIO_UTILISATEUR, OPMSG_VISIO_CHAINE) : une instance, un compte, une chaîne — arrêter la bêta ne retire pas les règles de la production.
#
# ⛔ POURQUOI (lu dans le code de LiveKit 1.13.7, sa copie de pion/ice : `AddRemoteCandidate` ne filtre AUCUNE adresse). Une personne admise dans une salle annonce ses « candidats » — les adresses où la
# joindre — et LiveKit leur envoie ses vérifications de liaison : des requêtes STUN, qui portent l'identifiant que CETTE personne a choisi. Sans garde, elle peut donc faire envoyer, de la part de la
# machine, des paquets UDP à un service qui n'écoute qu'en local (127.0.0.1, ou l'adresse publique de la machine elle-même) ou sur un réseau privé de l'hébergeur (le service de métadonnées,
# 169.254.169.254, d'abord). C'est le trou que `turn-pare-feu.sh` ferme pour le relais, par un autre chemin. Le TCP n'est pas concerné : LiveKit n'ouvre jamais de liaison TCP vers un participant
# (son ICE-TCP est passif : c'est le participant qui l'appelle), et son seul TCP sortant est l'avis qu'il envoie au service, en boucle locale.
#
# La règle, pour les paquets UDP que le serveur de visio (son compte système) émet :
#   · vers une adresse de CETTE machine : REFUSÉ — sauf le résolveur de noms local (port 53 : le seul service local qu'un programme peut avoir à joindre en UDP) ;
#   · vers un réseau privé, partagé, de lien local, la boucle locale ou « ce réseau » : REFUSÉ — un participant n'y est jamais (ses vrais candidats sont publics) ;
#   · tout le reste : RETURN — le reste des règles de la machine décide.
# Les mêmes règles en IPv6 (la boucle, les réseaux privés et de lien local, une IPv4 écrite en IPv6, NAT64).
#
# ⛔ SANS PARE-FEU, PAS DE VISIO : si une règle ne se pose pas, ce script sort en erreur et systemd REFUSE de démarrer le serveur de visio. IPv6 absent du noyau : sauté, dit. Rien ici ne lit un secret.
set -u
UTILISATEUR="${OPMSG_VISIO_UTILISATEUR:-}"
CHAINE="${OPMSG_VISIO_CHAINE:-}"
IPT4="${OPMSG_IPTABLES:-iptables}"
IPT6="${OPMSG_IP6TABLES:-ip6tables}"

# Ces valeurs viennent de l'environnement de l'unité : on n'y laisse passer que ce qui en a la forme.
[[ "$UTILISATEUR" =~ ^opmsg-visio-(beta|prod)$ ]] || { echo "pare-feu de la visio : compte illisible"; exit 2; }
[[ "$CHAINE" =~ ^OPMSG-VISIO-(BETA|PROD)$ ]] || { echo "pare-feu de la visio : chaîne illisible"; exit 2; }

REFUSES4=(0.0.0.0/8 10.0.0.0/8 100.64.0.0/10 127.0.0.0/8 169.254.0.0/16 172.16.0.0/12 192.168.0.0/16)
REFUSES6=(::1/128 fc00::/7 fe80::/10 ::ffff:0:0/96 64:ff9b::/96)

poser() {
  local ipt="$1"; shift
  "$ipt" -N "$CHAINE" 2>/dev/null || true
  "$ipt" -F "$CHAINE" || return 1
  "$ipt" -A "$CHAINE" -p udp --dport 53 -m addrtype --dst-type LOCAL -j RETURN || return 1
  "$ipt" -A "$CHAINE" -p udp -m addrtype --dst-type LOCAL -j DROP || return 1
  local plage
  for plage in "$@"; do "$ipt" -A "$CHAINE" -p udp -d "$plage" -j DROP || return 1; done
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
# Les règles sont-elles DANS LE NOYAU ? (le saut depuis OUTPUT existe, et la chaîne refuse) — on relit, on ne croit pas ce que `start` a dit.
en_place() { local ipt="$1"; "$ipt" -C OUTPUT -m owner --uid-owner "$UTILISATEUR" -j "$CHAINE" >/dev/null 2>&1 && "$ipt" -S "$CHAINE" 2>/dev/null | grep -q -e '-j DROP'; }

case "${1:-}" in
  start)
    command -v "$IPT4" >/dev/null 2>&1 || { echo "pare-feu de la visio : $IPT4 est absent, la visio ne démarre pas"; exit 1; }
    id -u "$UTILISATEUR" >/dev/null 2>&1 || { echo "pare-feu de la visio : le compte $UTILISATEUR n'existe pas, la visio ne démarre pas"; exit 1; }
    poser "$IPT4" "${REFUSES4[@]}" || { echo "pare-feu de la visio : les règles IPv4 n'ont pas pu être posées, la visio ne démarre pas"; exit 1; }
    if ipv6; then
      poser "$IPT6" "${REFUSES6[@]}" || { echo "pare-feu de la visio : les règles IPv6 n'ont pas pu être posées, la visio ne démarre pas"; exit 1; }
      echo "pare-feu de la visio : posé (IPv4 et IPv6)"
    else
      echo "pare-feu de la visio : posé (IPv4 ; IPv6 absent de ce noyau)"
    fi
    ;;
  verifier)
    en_place "$IPT4" || { echo "pare-feu de la visio : ABSENT (IPv4)"; exit 1; }
    if ipv6; then en_place "$IPT6" || { echo "pare-feu de la visio : ABSENT (IPv6)"; exit 1; }; fi
    echo "pare-feu de la visio : en place"
    ;;
  stop)
    retirer "$IPT4"
    if ipv6; then retirer "$IPT6"; fi
    ;;
  *) echo "usage : opmsg-visio-pare-feu <start|verifier|stop>"; exit 2 ;;
esac
