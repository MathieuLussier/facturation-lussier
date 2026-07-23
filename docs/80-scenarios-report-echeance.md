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

## SC-DUE-002 — Choisir un délai standard

**Étant donné** qu'un paiement partiel vient d'être enregistré,

**quand** l'application propose un nouveau délai,

**alors** la responsable peut choisir :

- 15 jours;
- 30 jours;
- 45 jours;
- 60 jours.

La valeur proposée ne devient jamais définitive sans confirmation.

## SC-DUE-003 — Préserver l'échéance originale

**Étant donné** une facture initialement échue le 30 juin,

**quand** un nouveau délai mène à une échéance effective au 15 juillet,

**alors** l'application affiche et conserve séparément :

- échéance originale : 30 juin;
- échéance effective du solde : 15 juillet;
- durée du report;
- origine de la valeur utilisée;
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

## SC-DUE-007 — Hériter du délai du client

**Étant donné** qu'un client possède un délai après paiement partiel de 30 jours,

**et** que le projet et la facture ne possèdent aucune valeur propre,

**quand** la responsable enregistre un paiement partiel,

**alors** l'application propose 30 jours et indique que la valeur provient du client.

## SC-DUE-008 — Remplacer le délai du client par celui du projet

**Étant donné** qu'un client possède un délai de 30 jours,

**et** que le projet possède un délai de 45 jours,

**et** que la facture ne possède aucune valeur propre,

**quand** la responsable enregistre un paiement partiel,

**alors** l'application propose 45 jours et indique que la valeur provient du projet.

La valeur du client demeure inchangée.

## SC-DUE-009 — Remplacer le projet sur une facture précise

**Étant donné** qu'un projet possède un délai de 45 jours,

**et** que la facture courante possède un délai propre de 15 jours,

**quand** la responsable confirme le report,

**alors** l'application utilise 15 jours et indique que la valeur provient de la facture.

Le projet et le client ne sont pas modifiés.

## SC-DUE-010 — Exiger un choix lorsqu'aucune valeur n'existe

**Étant donné** qu'aucun délai n'est configuré sur la facture, le projet ou le client,

**quand** un paiement partiel est enregistré,

**alors** l'application exige que la responsable choisisse 15, 30, 45 ou 60 jours avant de confirmer le report.

## SC-DUE-011 — Figer la valeur historique du report

**Étant donné** qu'un report de 45 jours provenant du projet a été confirmé,

**quand** le projet est plus tard modifié pour utiliser 30 jours,

**alors** le report déjà confirmé conserve 45 jours, son origine et sa nouvelle date calculée.

Seuls les futurs reports utilisent la nouvelle configuration du projet.

## Points à préciser

- date de départ utilisée pour calculer les 15, 30, 45 ou 60 jours;
- canal utilisé pour communiquer le délai au client;
- contenu du courriel éventuel de confirmation;
- délai entre la nouvelle échéance et la prochaine relance;
- fréquence réelle des reports successifs;
- possibilité d'une date exceptionnelle hors des quatre délais standards.