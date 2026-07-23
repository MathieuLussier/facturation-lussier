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
- **RM-091** — Si aucun délai n'est configuré sur la facture, le projet ou le client, la responsable doit choisir explicitement 15, 30, 45 ou 60 jours avant de confirmer le report.
- **RM-092** — Un délai choisi sur une facture ne modifie jamais les valeurs par défaut du projet ou du client.
- **RM-093** — Le délai résolu et son niveau d'origine doivent être copiés dans le report confirmé afin qu'une modification future du client ou du projet ne change pas rétroactivement l'historique.
- **RM-094** — Une seule valeur de report est active pour une facture à un moment donné, mais tous les reports remplacés demeurent auditables.