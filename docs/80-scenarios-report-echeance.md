# Scénarios d'acceptation — report d'échéance après paiement partiel

## SC-DUE-001 — Accorder un nouveau délai après un paiement partiel

**Étant donné** une facture dont le solde est de 3 000,00 $,

**et** un paiement partiel de 1 000,00 $,

**quand** la responsable confirme le paiement et accorde un nouveau délai pour le solde de 2 000,00 $,

**alors** l'application :

- conserve l'échéance originale;
- prépare le report sans l'activer avant l'envoi du courriel;
- conserve le paiement partiel et le solde restant;
- maintient la facture à `PARTIELLEMENT_PAYEE`;
- associe le report à la personne qui l'a préparé;
- prépare le courriel destiné au client.

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
- unité de calcul : jours calendaires;
- origine de la valeur utilisée;
- date du courriel ayant activé le report;
- solde concerné;
- utilisateur ayant accordé le délai.

La nouvelle date ne remplace pas l'historique contractuel de la facture.

## SC-DUE-004 — Invalider une ancienne relance

**Étant donné** qu'un brouillon de relance a été préparé selon l'échéance originale,

**quand** le courriel de nouveau délai est envoyé avec succès,

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

**quand** la responsable accorde un autre délai et envoie le nouveau courriel,

**alors** :

- l'ancien report passe à `SUPERSEDED`;
- le nouveau report devient `ACTIVE` après l'envoi réussi;
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

**quand** la responsable prépare le report,

**alors** l'application utilise 15 jours et indique que la valeur provient de la facture.

Le projet et le client ne sont pas modifiés.

## SC-DUE-010 — Exiger un choix lorsqu'aucune valeur n'existe

**Étant donné** qu'aucun délai n'est configuré sur la facture, le projet ou le client,

**quand** un paiement partiel est enregistré,

**alors** l'application exige que la responsable choisisse 15, 30, 45 ou 60 jours avant de préparer le courriel de report.

## SC-DUE-011 — Figer la valeur historique du report

**Étant donné** qu'un report de 45 jours provenant du projet a été activé par un courriel envoyé,

**quand** le projet est plus tard modifié pour utiliser 30 jours,

**alors** le report déjà confirmé conserve 45 jours, son origine, son unité en jours calendaires, l'horodatage du courriel et sa nouvelle date calculée.

Seuls les futurs reports utilisent la nouvelle configuration du projet.

## SC-DUE-012 — Calculer le délai depuis l'envoi du courriel

**Étant donné** qu'un délai de 30 jours est confirmé,

**et** que le courriel est envoyé avec succès le 10 juillet 2026,

**quand** l'application active le report,

**alors** :

- `extensionEmailSentAt` correspond à l'envoi du 10 juillet;
- la nouvelle échéance est calculée à partir de cette date;
- le calcul utilise 30 jours calendaires;
- les samedis et dimanches sont inclus;
- la date du paiement partiel n'est pas utilisée comme point de départ;
- la date de création du brouillon n'est pas utilisée comme point de départ;
- le report et l'envoi restent liés dans l'historique.

La nouvelle échéance brute est le 9 août 2026.

## SC-DUE-013 — Ne pas activer un report en brouillon

**Étant donné** qu'un paiement partiel est enregistré et qu'un courriel de nouveau délai est préparé,

**quand** la responsable enregistre le courriel sans l'envoyer,

**alors** :

- le report demeure `DRAFT`;
- `extensionEmailSentAt` reste vide;
- `newDueDate` n'est pas finalisée;
- les relances existantes ne sont pas reportées comme si le client avait été avisé;
- l'interface indique que le délai n'est pas encore communiqué.

## SC-DUE-014 — Ne pas activer le report après un échec d'envoi

**Étant donné** qu'un courriel de nouveau délai est prêt,

**quand** son envoi échoue ou est annulé,

**alors** :

- le report ne devient pas `ACTIVE`;
- aucune nouvelle échéance définitive n'est appliquée;
- l'ancienne échéance et les relances restent en vigueur jusqu'à une action humaine;
- l'erreur d'envoi est visible et auditée;
- la responsable peut corriger puis renvoyer le courriel.

## SC-DUE-015 — Ne pas redémarrer le délai sur un simple renvoi

**Étant donné** qu'un report actif a déjà été communiqué,

**quand** le même courriel est renvoyé pour une raison technique ou comme copie,

**alors** le point de départ et la nouvelle échéance ne changent pas automatiquement.

Un nouveau point de départ exige qu'un autre report soit explicitement créé, confirmé et communiqué.

## SC-DUE-016 — Inclure les fins de semaine dans le compteur

**Étant donné** qu'un courriel de report est envoyé le vendredi 10 juillet 2026,

**et** que la responsable accorde 15 jours,

**quand** l'application calcule la nouvelle échéance,

**alors** elle compte chaque samedi et chaque dimanche comme un jour du délai.

La date brute calculée est le samedi 25 juillet 2026. Le système ne transforme pas ce délai en 15 jours ouvrables.

Le traitement final d'une échéance qui tombe elle-même une fin de semaine ou un jour férié demeure à confirmer.

## Points à préciser

- si une échéance tombe un samedi, un dimanche ou un jour férié, doit-elle rester à cette date ou être déplacée;
- contenu exact du courriel de confirmation;
- délai entre la nouvelle échéance et la prochaine relance;
- fréquence réelle des reports successifs;
- possibilité d'une date exceptionnelle hors des quatre délais standards.
