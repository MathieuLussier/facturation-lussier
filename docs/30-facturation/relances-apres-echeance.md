# Relances après échéance

## Décision métier confirmée

Lorsqu'une facture ou un solde reporté demeure impayé après son échéance effective, l'application prépare un brouillon de relance **dès le lendemain**.

La préparation du brouillon est automatique, mais son envoi ne l'est jamais. Une personne autorisée de Transport Lussier et Fils doit relire, modifier au besoin et approuver la relance avant qu'elle puisse être envoyée.

## Date de déclenchement

La date utilisée est l'échéance effective de recouvrement :

1. l'échéance effective du report actif, lorsqu'un nouveau délai a été accordé après un paiement partiel;
2. sinon, l'échéance de la facture.

```text
effectiveCollectionDueDate = activeExtension.effectiveDueDate ?? invoice.dueDate
reminderDraftEligibleAt = startOfNextCalendarDay(effectiveCollectionDueDate, America/Toronto)
```

Le « lendemain » est le lendemain civil. Le brouillon peut donc devenir admissible un samedi ou un dimanche; il demeure simplement en attente d'une intervention humaine.

L'exigence fonctionnelle est que le brouillon soit disponible au plus tard au prochain traitement de l'application après le passage à cette date. Le choix technique entre une tâche planifiée et une génération à la prochaine ouverture ne doit pas modifier la date métier du brouillon.

## Aucune transmission automatique

Le système doit séparer clairement :

- la génération du brouillon;
- sa révision;
- son approbation;
- son envoi.

La génération d'un brouillon ne constitue ni une approbation ni un envoi.

Tant que la relance n'est pas approuvée :

- aucun courriel ne quitte l'application;
- aucun statut de livraison n'est créé;
- le client ne reçoit aucune notification;
- la responsable peut modifier le destinataire, l'objet, le texte et les pièces jointes proposées;
- le brouillon reste visible dans une file **Relances à approuver**.

## Contenu proposé du brouillon

Le brouillon devrait présenter au minimum :

- le client et le profil de facturation;
- le projet, lorsqu'il existe;
- le numéro de facture;
- l'échéance originale;
- l'échéance effective utilisée pour la relance;
- le solde restant;
- les paiements partiels déjà reçus, lorsqu'il y en a;
- le nombre de jours écoulés depuis l'échéance effective;
- le destinataire et les copies;
- l'objet et le corps du courriel;
- la facture ou les pièces sélectionnées pour l'envoi.

Une relance ne joint pas automatiquement le spécimen de chèque. Celui-ci peut être ajouté explicitement si la responsable le juge pertinent.

## Contrôles avant approbation et envoi

Avant d'autoriser l'envoi, l'application doit recalculer la situation courante et vérifier :

- que le solde est toujours supérieur à zéro;
- que la facture n'est ni payée, ni annulée, ni archivée dans un état incompatible;
- qu'aucun nouveau paiement n'a réglé le solde depuis la génération du brouillon;
- qu'aucun nouveau report d'échéance actif ne rend la relance prématurée;
- que l'échéance effective utilisée est toujours la bonne;
- que les destinataires sont présents et valides;
- que le contenu reflète le solde actuel;
- qu'aucun autre envoi identique n'a déjà été effectué.

Si la situation a changé, le brouillon doit être marqué `OBSOLETE` ou être régénéré. Il ne doit pas pouvoir être envoyé avec des données périmées.

## Approbation

Une approbation explicite est obligatoire.

À conserver :

- utilisateur ayant généré ou déclenché le brouillon, lorsque pertinent;
- date et heure de génération;
- utilisateur ayant approuvé;
- date et heure d'approbation;
- contenu approuvé ou son instantané;
- version du modèle utilisé;
- utilisateur ayant envoyé;
- date et heure d'envoi;
- destinataires et pièces jointes réellement envoyés;
- statut de livraison ou erreur disponible.

Si le contenu, le solde, l'échéance ou les destinataires sont modifiés après l'approbation, l'approbation précédente doit être invalidée et une nouvelle approbation doit être demandée.

## États suggérés

```text
DRAFT_A_APPROUVER
APPROUVEE
ENVOYEE
OBSOLETE
ANNULEE
ERREUR_ENVOI
```

Une relance `APPROUVEE` peut être envoyée immédiatement ou au moyen d'une action distincte, selon le choix d'interface qui sera validé. Dans tous les cas, aucune relance ne doit être envoyée sans approbation active.

## Annulation et obsolescence

Le brouillon devient obsolète notamment lorsque :

- le solde atteint zéro;
- un paiement partiel modifie le montant à réclamer;
- un nouveau délai est accordé;
- le profil de facturation ou le destinataire change;
- la facture est annulée;
- une autre relance équivalente a déjà été envoyée.

L'obsolescence ne supprime pas le brouillon. Elle conserve la raison, l'utilisateur ou l'événement déclencheur et l'horodatage.

## File de travail proposée

Le tableau de bord peut afficher :

- **Relances à préparer** — échéance dépassée, brouillon pas encore généré;
- **Relances à approuver** — brouillon prêt et en attente de validation;
- **Relances approuvées** — prêtes à envoyer;
- **Relances envoyées** — historique;
- **Relances obsolètes ou en erreur** — éléments à vérifier.

## Points encore ouverts

- Qui peut approuver une relance : la responsable de facturation seulement, Mathieu, Michel ou plusieurs rôles?
- L'action **Approuver et envoyer** doit-elle être combinée ou l'approbation et l'envoi doivent-ils rester deux actions séparées?
- Quel texte exact doit être utilisé pour la première relance?
- Après une première relance non payée, à quel rythme faut-il préparer les suivantes?
- Les relances doivent-elles toujours être envoyées par courriel, ou faut-il aussi tracer les appels téléphoniques et autres communications?
