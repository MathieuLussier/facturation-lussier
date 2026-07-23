# Report d'échéance après un paiement partiel

## Décision métier confirmée

Lorsqu'un client effectue un paiement partiel, Transport Lussier et Fils lui accorde un nouveau délai pour régler le solde restant.

Le paiement partiel demeure une opération financière valide. La facture reste ouverte et conserve un solde, mais les relances ne doivent pas continuer à utiliser aveuglément l'échéance originale comme si aucun arrangement n'avait été accordé.

## Principe de traçabilité

La date d'échéance originale de la facture doit rester conservée. Le nouveau délai ne doit pas l'écraser silencieusement.

Le système doit distinguer :

- `originalDueDate` — échéance contractuelle ou initiale de la facture;
- `effectiveBalanceDueDate` — date actuellement convenue pour le solde restant;
- `nextReminderAt` — prochaine date de relance prévue;
- la date et le montant du paiement partiel;
- le solde au moment où le nouveau délai est accordé;
- la personne ayant accordé ou enregistré le délai;
- la date de la décision;
- une note ou raison facultative.

Cette séparation permet de comprendre plus tard pourquoi une facture initialement échue n'a pas été relancée pendant une certaine période.

## Parcours cible

1. La responsable enregistre le paiement partiel dans **Enregistrer un dépôt**.
2. L'application calcule et affiche le solde restant.
3. Elle demande si un nouveau délai est accordé au client.
4. La responsable choisit la nouvelle date à sa discrétion.
5. L'application affiche l'échéance originale, la nouvelle date et le solde visé.
6. La responsable ajoute une note facultative et confirme.
7. Les brouillons ou relances prévus selon l'ancienne date sont annulés, reportés ou marqués comme remplacés.
8. Le prochain cycle de relance utilise la nouvelle date pour le solde restant.
9. La facture demeure `PARTIELLEMENT_PAYEE` jusqu'à ce que son solde atteigne zéro.

## Discrétion de la responsable

Le système ne doit pas imposer un nombre fixe de jours après le paiement partiel.

Il peut proposer une valeur par défaut configurable, mais la responsable doit pouvoir :

- sélectionner toute date appropriée;
- modifier la suggestion;
- ne pas accorder de nouveau délai dans un cas exceptionnel;
- ajouter une justification;
- remplacer plus tard la date active par une nouvelle entente.

Toute modification demeure auditée.

## Effet sur les relances

Lorsqu'un nouveau délai est confirmé :

- aucune relance ordinaire ne doit partir avant cette date;
- tout brouillon fondé sur l'ancienne échéance doit être invalidé ou clairement marqué comme obsolète;
- les futurs messages doivent afficher uniquement le solde restant;
- l'historique doit continuer d'afficher l'échéance originale et tous les reports accordés;
- si le client règle le solde avant la nouvelle date, les relances restantes sont annulées;
- si le solde n'est pas réglé à la nouvelle date, l'application prépare une relance soumise à validation humaine.

## Modèle proposé

### PaymentDeadlineExtension

Représente un report accordé pour le solde d'une facture.

Champs proposés :

- `id`;
- `invoiceId`;
- `triggerPaymentId` facultatif — paiement partiel ayant motivé le report;
- `previousEffectiveDueDate`;
- `newDueDate`;
- `remainingBalanceCents` au moment de la décision;
- `reason`;
- `note` facultative;
- `status`;
- `createdById`;
- `createdAt`;
- `supersededById` facultatif;
- `communicatedAt` facultatif;
- `communicationMethod` facultative.

Statuts suggérés :

- `ACTIVE`;
- `SUPERSEDED`;
- `COMPLETED`;
- `CANCELLED`.

Une facture ne possède qu'un report actif à la fois, mais conserve l'historique complet de tous les reports antérieurs.

## Date effective du solde

La date effective utilisée pour les relances est déterminée ainsi :

1. date du report actif, lorsqu'il existe;
2. sinon, échéance originale de la facture.

Cette règle concerne la gestion du recouvrement. Elle ne modifie pas la date d'émission, l'échéance originale ni l'historique du document facturé.

## Contrôles proposés

Avant de confirmer un nouveau délai :

- la facture doit avoir un solde supérieur à zéro;
- le solde affiché doit intégrer tous les paiements valides;
- la nouvelle date doit être confirmée explicitement;
- une date antérieure à la date courante doit produire un avertissement;
- le système doit montrer les relances qui seront reportées ou remplacées;
- l'utilisateur et l'horodatage doivent être enregistrés;
- le report ne doit jamais modifier le total original de la facture.

## Points encore ouverts

- Comment la nouvelle date est-elle habituellement choisie : nombre de jours, promesse du client ou décision au cas par cas?
- Le nouveau délai est-il communiqué par courriel, téléphone ou les deux?
- Faut-il préparer automatiquement un courriel confirmant le paiement partiel, le solde et la nouvelle échéance?
- Combien de jours après la nouvelle échéance faut-il préparer la prochaine relance?
- Plusieurs reports successifs sont-ils parfois accordés au même client?