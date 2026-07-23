# Scénarios d'acceptation — report d'échéance après paiement partiel

## SC-DUE-001 — Accorder un nouveau délai après un paiement partiel

**Étant donné** une facture dont le solde est de 3 000,00 $,

**et** un paiement partiel de 1 000,00 $,

**quand** la responsable confirme le paiement et accorde une nouvelle date pour le solde de 2 000,00 $,

**alors** l'application :

- conserve l'échéance originale;
- enregistre la nouvelle date comme échéance effective du solde;
- conserve le paiement partiel et le solde restant;
- maintient la facture à `PARTIELLEMENT_PAYEE`;
- associe le report à la personne qui l'a confirmé;
- reporte les relances fondées sur l'ancienne date.

## SC-DUE-002 — Choisir librement la nouvelle date

**Étant donné** qu'un paiement partiel vient d'être enregistré,

**quand** l'application propose une nouvelle échéance,

**alors** la responsable peut :

- accepter la suggestion;
- choisir une autre date;
- ajouter une note;
- ne pas accorder de report dans un cas exceptionnel.

La valeur proposée ne devient jamais définitive sans confirmation.

## SC-DUE-003 — Préserver l'échéance originale

**Étant donné** une facture initialement échue le 30 juin,

**quand** un nouveau délai au 15 juillet est accordé,

**alors** l'application affiche et conserve séparément :

- échéance originale : 30 juin;
- échéance effective du solde : 15 juillet;
- date de la décision;
- solde concerné;
- utilisateur ayant accordé le délai.

La nouvelle date ne remplace pas l'historique contractuel de la facture.

## SC-DUE-004 — Invalider une ancienne relance

**Étant donné** qu'un brouillon de relance a été préparé selon l'échéance originale,

**quand** un nouveau délai est confirmé,

**alors** le brouillon est annulé ou marqué obsolète et ne peut pas être envoyé comme s'il était encore valide.

## SC-DUE-005 — Relancer après la nouvelle échéance

**Étant donné** une facture partiellement payée avec un report actif,

**et** un solde toujours impayé après la nouvelle date,

**quand** le calendrier de recouvrement devient applicable,

**alors** l'application prépare un brouillon de relance qui :

- mentionne le solde restant;
- utilise la nouvelle échéance;
- conserve la référence de la facture originale;
- exige une validation humaine avant l'envoi.

## SC-DUE-006 — Remplacer un report existant

**Étant donné** qu'un report est déjà actif,

**quand** la responsable accorde un autre délai,

**alors** :

- l'ancien report passe à `SUPERSEDED`;
- le nouveau report devient `ACTIVE`;
- les deux restent visibles dans l'historique;
- le prochain calendrier de relance utilise uniquement le report actif.

## Points à préciser

- méthode habituelle de choix de la nouvelle date;
- canal utilisé pour communiquer le délai au client;
- contenu du courriel éventuel de confirmation;
- délai entre la nouvelle échéance et la prochaine relance;
- fréquence réelle des reports successifs.