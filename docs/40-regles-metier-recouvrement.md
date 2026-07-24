# Règles métier — recouvrement après paiement partiel

Ce complément poursuit la numérotation du registre principal.

- **RM-081** — Après un paiement partiel, la responsable peut accorder au client un nouveau délai pour régler le solde restant.
- **RM-082** — Le nouveau délai s'applique au solde restant et ne doit jamais écraser l'échéance originale de la facture.
- **RM-083** — Tant qu'un report actif n'est pas expiré, les relances ordinaires doivent utiliser la nouvelle date convenue plutôt que l'échéance originale.
- **RM-084** — Le choix de la nouvelle date reste à la discrétion d'une personne autorisée; toute suggestion par défaut demeure modifiable.
- **RM-085** — Chaque report d'échéance doit conserver la date précédente, la nouvelle date, le solde concerné, l'utilisateur, l'horodatage et l'historique des reports remplacés.
- **RM-086** — Une facture demeure `PARTIELLEMENT_PAYEE` pendant le report et devient `PAYEE` seulement lorsque son solde atteint zéro.
- **RM-087** — Un brouillon de relance fondé sur une ancienne échéance doit être annulé ou marqué obsolète lorsqu'un nouveau délai est confirmé.
- **RM-088** — Si le solde reste impayé après la nouvelle date, l'application prépare une relance soumise à validation humaine.
- **RM-089** — Les délais standards accordés pour un solde restant sont de 15, 30, 45 ou 60 jours.
- **RM-090** — Le délai proposé est résolu selon l'ordre de priorité suivant : valeur de la facture, sinon valeur du projet, sinon valeur du client.
- **RM-091** — Si aucun délai n'est configuré sur la facture, le projet ou le client, la responsable doit choisir explicitement 15, 30, 45 ou 60 jours avant de préparer le report.
- **RM-092** — Un délai choisi sur une facture ne modifie jamais les valeurs par défaut du projet ou du client.
- **RM-093** — Le délai résolu et son niveau d'origine doivent être copiés dans le report confirmé afin qu'une modification future du client ou du projet ne change pas rétroactivement l'historique.
- **RM-094** — Une seule valeur de report est active pour une facture à un moment donné, mais tous les reports remplacés demeurent auditables.
- **RM-095** — Les 15, 30, 45 ou 60 jours commencent à la date et à l'heure où le courriel communiquant le nouveau délai est envoyé avec succès au client.
- **RM-096** — La nouvelle échéance du solde est calculée selon `rawDueDate = addCalendarDays(extensionEmailSentAt, termDays)` et non depuis la date du paiement partiel, la date du brouillon ou l'échéance originale.
- **RM-097** — Un brouillon de courriel, un envoi annulé ou un échec d'envoi n'active pas le report et ne doit pas reporter les relances.
- **RM-098** — L'envoi de courriel ayant activé le report doit rester lié à celui-ci dans l'historique avec ses destinataires, son horodatage et son statut.
- **RM-099** — Le renvoi technique du même courriel ne redémarre pas automatiquement le délai; seul un nouveau report explicitement accordé peut remplacer le report actif.
- **RM-100** — Les délais de 15, 30, 45 ou 60 jours sont calculés en jours calendaires; les samedis et dimanches sont inclus dans le compteur.
- **RM-101** — Si l'échéance brute tombe un samedi, un dimanche ou un jour férié défini dans le calendrier d'entreprise, l'échéance effective est déplacée au prochain jour ouvrable; la date brute et l'ajustement demeurent auditables.
- **RM-102** — Le calendrier d'entreprise utilisé par défaut est basé sur les jours fériés applicables au Québec, avec les samedis et dimanches comme jours non ouvrables.
- **RM-103** — L'entreprise peut ajouter ses propres journées ou périodes de fermeture; celles-ci sont traitées comme non ouvrables pour les futurs calculs.
- **RM-104** — Le système avance jusqu'au premier jour ouvrable en traversant successivement toute fin de semaine, tout jour férié québécois configuré et toute fermeture interne.
- **RM-105** — Le calendrier, sa version, la date brute, la date effective et les journées traversées doivent être figés dans l'historique d'un report; une modification future du calendrier ne recalcule jamais rétroactivement une échéance déjà communiquée.