# Report d'échéance après un paiement partiel

## Décision métier confirmée

Lorsqu'un client effectue un paiement partiel, Transport Lussier et Fils lui accorde un nouveau délai pour régler le solde restant.

Le paiement partiel demeure une opération financière valide. La facture reste ouverte et conserve un solde, mais les relances ne doivent pas continuer à utiliser aveuglément l'échéance originale comme si aucun arrangement n'avait été accordé.

## Délais standards

Les délais utilisés sont :

- 15 jours;
- 30 jours;
- 45 jours;
- 60 jours.

Le délai applicable est configuré selon une hiérarchie allant du général au particulier :

```text
Client
  └── Projet
        └── Facture
```

La valeur la plus spécifique remplace la valeur plus générale.

Ordre de résolution :

1. délai choisi ou remplacé sur la facture;
2. sinon, délai configuré sur le projet;
3. sinon, délai configuré sur le client;
4. si aucune valeur n'est définie, la responsable doit choisir explicitement 15, 30, 45 ou 60 jours avant de préparer le report.

Exemple :

```text
Client : 30 jours
Projet : 45 jours
Facture : aucune valeur propre

Délai proposé après paiement partiel : 45 jours
```

Une valeur choisie sur une facture ne modifie pas les valeurs du projet ou du client. Le délai résolu est copié dans le report afin que l'historique ne change pas si la configuration est modifiée plus tard.

## Point de départ du nouveau délai

Les 15, 30, 45 ou 60 jours commencent à la date où la responsable envoie au client le courriel qui communique le paiement partiel, le solde restant et le nouveau délai.

Le point de départ n'est donc pas automatiquement :

- la date de la facture;
- l'échéance originale;
- la date du paiement partiel;
- la date de création du brouillon;
- la date où le report a été préparé dans l'application.

La date de communication utilisée doit provenir de l'envoi réussi du courriel :

```text
newDueDate = extensionEmailSentAt + extensionTermDays
```

Exemple :

```text
Courriel envoyé : 10 juillet 2026
Délai confirmé : 30 jours
Nouvelle échéance du solde : 9 août 2026
```

Le calcul précis des jours calendaires ou ouvrables reste à confirmer. Tant que le courriel n'a pas été envoyé avec succès, le nouveau délai n'est pas actif et les relances ne doivent pas être recalculées comme si l'entente avait déjà été communiquée.

Un brouillon enregistré, un envoi annulé ou un échec d'envoi ne déclenche pas le délai. Un renvoi technique du même courriel ne redémarre pas automatiquement le compteur; seul un nouveau report explicitement accordé peut remplacer la date active.

## Principe de traçabilité

La date d'échéance originale de la facture doit rester conservée. Le nouveau délai ne doit pas l'écraser silencieusement.

Le système doit distinguer :

- `originalDueDate` — échéance contractuelle ou initiale de la facture;
- `effectiveBalanceDueDate` — date actuellement convenue pour le solde restant;
- `extensionTermDays` — durée confirmée : 15, 30, 45 ou 60 jours;
- `extensionTermSource` — niveau ayant fourni la valeur : facture, projet ou client;
- `extensionEmailSentAt` — date et heure de l'envoi réussi qui déclenche le délai;
- `extensionEmailDeliveryId` — référence facultative vers l'historique d'envoi;
- `nextReminderAt` — prochaine date de relance prévue;
- la date et le montant du paiement partiel;
- le solde au moment où le nouveau délai est accordé;
- la personne ayant accordé ou enregistré le délai;
- la date de la décision;
- une note ou raison facultative.

Cette séparation permet de comprendre plus tard pourquoi une facture initialement échue n'a pas été relancée pendant une certaine période, quelle configuration avait été utilisée et à quel moment le nouveau délai a réellement été communiqué.

## Parcours cible

1. La responsable enregistre le paiement partiel dans **Enregistrer un dépôt**.
2. L'application calcule et affiche le solde restant.
3. Elle résout le délai selon la facture, le projet puis le client.
4. Elle propose 15, 30, 45 ou 60 jours avec l'origine de la valeur.
5. La responsable confirme la valeur ou la remplace sur cette facture.
6. L'application prépare un courriel indiquant le paiement reçu, le solde restant et le délai accordé.
7. La responsable vérifie les destinataires, le texte et le délai, puis envoie le courriel.
8. Après confirmation de l'envoi réussi, l'application enregistre `extensionEmailSentAt` et calcule la nouvelle échéance.
9. Elle affiche l'échéance originale, la nouvelle date et le solde visé.
10. Les brouillons ou relances prévus selon l'ancienne date sont annulés, reportés ou marqués comme remplacés.
11. Le prochain cycle de relance utilise la nouvelle date pour le solde restant.
12. La facture demeure `PARTIELLEMENT_PAYEE` jusqu'à ce que son solde atteigne zéro.

## Discrétion de la responsable

Le système propose le délai configuré, mais la responsable garde le contrôle sur la facture courante.

Elle peut :

- accepter la valeur héritée du client ou du projet;
- choisir 15, 30, 45 ou 60 jours sur la facture;
- ne pas accorder de nouveau délai dans un cas exceptionnel;
- modifier le courriel avant l'envoi;
- ajouter une justification;
- remplacer plus tard le report actif par une nouvelle entente.

Toute modification demeure auditée. Un remplacement sur la facture ne change jamais les valeurs par défaut du client ou du projet.

## Effet sur les relances

Lorsqu'un nouveau délai est communiqué par courriel et activé :

- aucune relance ordinaire ne doit partir avant la date effective du solde;
- tout brouillon fondé sur l'ancienne échéance doit être invalidé ou clairement marqué comme obsolète;
- les futurs messages doivent afficher uniquement le solde restant;
- l'historique doit continuer d'afficher l'échéance originale et tous les reports accordés;
- si le client règle le solde avant la nouvelle date, les relances restantes sont annulées;
- si le solde n'est pas réglé à la nouvelle date, l'application prépare une relance soumise à validation humaine.

Si le courriel de report demeure en brouillon ou échoue, l'application doit signaler que le délai n'est pas encore actif. Elle ne doit pas reporter silencieusement les relances sur la base d'une communication qui n'a pas eu lieu.

## Modèle proposé

### Configuration du délai

Champs facultatifs proposés :

- `Client.partialPaymentTermDays`;
- `Project.partialPaymentTermDays`;
- `Invoice.partialPaymentTermDays`.

Valeurs permises : `15 | 30 | 45 | 60`.

### PaymentDeadlineExtension

Représente un report accordé pour le solde d'une facture.

Champs proposés :

- `id`;
- `invoiceId`;
- `triggerPaymentId` facultatif — paiement partiel ayant motivé le report;
- `previousEffectiveDueDate`;
- `newDueDate` facultative tant que le courriel n'est pas envoyé;
- `termDays` — 15, 30, 45 ou 60;
- `termSource` — `INVOICE`, `PROJECT` ou `CLIENT`;
- `remainingBalanceCents` au moment de la décision;
- `reason`;
- `note` facultative;
- `status`;
- `createdById`;
- `createdAt`;
- `supersededById` facultatif;
- `communicatedAt` facultatif — date et heure de l'envoi réussi;
- `communicationMethod` — `EMAIL` dans le workflow confirmé;
- `invoiceDeliveryId` facultatif — lien vers l'envoi ayant activé le délai.

Statuts suggérés :

- `DRAFT` — report préparé, mais courriel non envoyé;
- `ACTIVE` — courriel envoyé et nouvelle échéance calculée;
- `SUPERSEDED`;
- `COMPLETED`;
- `CANCELLED`.

Une facture ne possède qu'un report actif à la fois, mais conserve l'historique complet de tous les reports antérieurs.

## Date effective du solde

La date effective utilisée pour les relances est déterminée ainsi :

1. date du report actif, calculée depuis l'envoi réussi du courriel;
2. sinon, échéance originale de la facture.

Cette règle concerne la gestion du recouvrement. Elle ne modifie pas la date d'émission, l'échéance originale ni l'historique du document facturé.

## Contrôles proposés

Avant d'envoyer et d'activer un nouveau délai :

- la facture doit avoir un solde supérieur à zéro;
- le solde affiché doit intégrer tous les paiements valides;
- le délai résolu et son origine doivent être visibles;
- le courriel doit afficher le solde restant et le délai accordé;
- les destinataires doivent être confirmés;
- la nouvelle date calculée doit être prévisualisée;
- le système doit montrer les relances qui seront reportées ou remplacées;
- l'utilisateur et l'horodatage doivent être enregistrés;
- le report ne doit jamais modifier le total original de la facture;
- la configuration future d'un client ou projet ne doit jamais recalculer rétroactivement un report confirmé;
- un échec d'envoi ne doit pas activer le report;
- l'envoi utilisé comme point de départ doit rester lié à l'historique du report.

## Points encore ouverts

- Les délais de 15, 30, 45 ou 60 jours sont-ils calculés en jours calendaires ou en jours ouvrables?
- Quel texte exact doit être utilisé dans le courriel confirmant le paiement partiel, le solde et la nouvelle échéance?
- Combien de jours après la nouvelle échéance faut-il préparer la prochaine relance?
- Plusieurs reports successifs sont-ils parfois accordés au même client?
- Une date exceptionnelle hors des quatre délais standards doit-elle être permise?