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