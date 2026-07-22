# Modèle de domaine proposé

## Entités existantes à conserver

Le dépôt contient déjà des concepts utiles : `User`, `Client`, `Contact`, `Project`, `Invoice`, `InvoiceLine`, `InvoiceAttachment`, `Product` et `IssuerProfile`.

Le modèle `Invoice` possède déjà des champs pour la date d'encaissement et le mode de paiement. Ces champs restent pratiques pour afficher rapidement l'état d'une facture, mais ils ne suffisent pas à représenter le flux confirmé où un seul dépôt règle plusieurs factures. Le modèle cible doit donc introduire `Payment` et `PaymentAllocation`.

## Entités à ajouter progressivement

### Broker

- nom;
- téléphones;
- notes;
- statut.

### IncomingMessage

- source;
- expéditeur;
- texte original;
- date de réception;
- pièces jointes éventuelles;
- résultat d'extraction;
- statut de validation.

### Call

- origine;
- broker facultatif;
- client;
- projet;
- date et heure du travail;
- chargement et livraison;
- matériau;
- nombre et type de camions;
- contact terrain;
- instructions;
- statut;
- message source.

### Driver

- nom;
- utilisateur facultatif;
- véhicule par défaut;
- statut.

### Vehicle

- plaque;
- type;
- description;
- chauffeur principal;
- statut.

### Assignment

- call;
- chauffeur;
- véhicule;
- statut;
- instructions particulières;
- bon associé.

### WorkOrder

- affectation;
- numéro du bon;
- date du travail;
- date de remise au bureau;
- remis par;
- reçu par;
- début, pause et fin;
- heures;
- unité de facturation;
- quantité;
- description;
- signataire;
- signature;
- statut.

### WorkOrderAttachment

- bon;
- type de document;
- nom;
- stockage;
- métadonnées;
- résultat OCR.

### QuarryTicket

- call ou bon;
- numéro;
- carrière;
- matériau;
- quantité;
- unité;
- image;
- date;
- date de remise au bureau.

### BillingProfile

Profil facultatif porté par un projet :

- nom légal;
- adresse;
- contact;
- courriel;
- conditions de paiement;
- préférences de livraison;
- politique d'inclusion du spécimen de chèque facultative.

Valeurs proposées pour la politique d'inclusion :

- `PREMIER_ENVOI`;
- `TOUJOURS_FACTURE`;
- `JAMAIS_AUTOMATIQUE`.

En l'absence de valeur propre au profil, la politique du client ou la valeur par défaut de l'entreprise est utilisée.

### ProjectRate

- projet;
- service;
- type de camion;
- tarif de base;
- unité;
- période de validité.

### BillingFolder

- client;
- projet;
- période;
- lieu;
- bons et billets;
- facture;
- checklist;
- statut.

### InvoiceDelivery

- facture;
- canal;
- destinataires;
- pièces;
- utilisateur;
- date;
- statut;
- erreur;
- indication que le spécimen était inclus;
- version du spécimen transmis, sans données bancaires dans les journaux.

### BankingInstructionDelivery

Trace l'envoi d'un spécimen de chèque ou d'instructions bancaires à un profil de facturation :

- client ou profil de facturation;
- document ou version transmis;
- destinataires;
- date et heure;
- utilisateur;
- facture ou courriel d'origine;
- mode d'inclusion : automatique ou manuel;
- statut d'envoi.

Cette entité enregistre la preuve de transmission sans recopier les coordonnées bancaires dans les journaux.

### DepositNotice

Représente l'avis de dépôt reçu par courriel ou importé comme PDF :

- référence ou numéro de l'avis;
- date de l'avis (`noticeDate`);
- date et heure de réception (`receivedAt`);
- expéditeur;
- payeur;
- objet du courriel;
- référence du message;
- montant total annoncé;
- nombre de factures annoncé;
- fichier PDF source;
- statut de traitement;
- résultat global d'extraction;
- utilisateur ayant validé le rapprochement;
- paiement créé après validation, le cas échéant.

Les identifiants de compte ou de vendeur présents sur le document doivent être chiffrés ou masqués et ne doivent pas apparaître en clair dans les journaux.

Statuts suggérés :

- `RECU`;
- `EXTRAIT`;
- `A_VALIDER`;
- `ECART_A_TRAITER`;
- `RAPPROCHE`;
- `ANNULE`.

Le contenu brut et les pièces doivent être stockés de façon privée. Dans le MVP, l'avis sert de preuve ou d'aide au rapprochement; il ne modifie pas automatiquement les factures.

### DepositNoticeLine

Représente une ligne de facture extraite de l'avis :

- avis de dépôt;
- position de la ligne;
- référence brute de facture;
- date de facture indiquée;
- montant de facture indiqué;
- retenue indiquée;
- escompte indiqué;
- montant payé indiqué;
- facture reconnue facultative;
- statut de correspondance;
- confiance d'extraction;
- valeurs brutes extraites;
- corrections manuelles;
- utilisateur ayant validé la ligne.

Statuts suggérés :

- `NON_TRAITEE`;
- `CORRESPONDANCE_PROPOSEE`;
- `CORRESPONDANCE_CONFIRMEE`;
- `REFERENCE_INCONNUE`;
- `FACTURE_DEJA_PAYEE`;
- `ECART_DE_MONTANT`;
- `A_REVISER`.

Une ligne conserve toujours les valeurs présentes sur l'avis, même si elles diffèrent des données internes.

### Payment

Représente une seule opération financière reçue. Un paiement peut régler une ou plusieurs factures.

- date réelle de réception (`paidAt`);
- montant total;
- mode de paiement;
- référence;
- avis de dépôt facultatif;
- client ou payeur, lorsque connu;
- statut;
- utilisateur ayant enregistré le paiement;
- date de création;
- note.

La date réelle de réception est distincte de la date de l'avis et de la date de réception du courriel.

Statuts suggérés :

- `BROUILLON`;
- `A_RAPPROCHER`;
- `RAPPROCHE`;
- `ECART_A_TRAITER`;
- `ANNULE`;
- `CORRIGE`.

### PaymentAllocation

Relie une opération de paiement à une facture précise :

- paiement;
- facture;
- ligne d'avis source facultative;
- montant appliqué;
- retenue observée facultative;
- escompte observé facultatif;
- solde avant affectation;
- solde après affectation;
- date et heure;
- utilisateur.

Un même `Payment` peut posséder plusieurs `PaymentAllocation`. Cette séparation conserve la preuve qu'un seul dépôt a réglé plusieurs factures et prépare le système aux paiements partiels, même si ceux-ci restent à confirmer.

### PaymentReminder

- facture;
- niveau;
- date prévue;
- objet et corps;
- statut;
- date d'envoi.

## Relations principales

```text
IncomingMessage -> Call
Call -> Assignment[]
Assignment -> Driver
Assignment -> Vehicle
Assignment -> WorkOrder
WorkOrder -> WorkOrderAttachment[]
Call/WorkOrder -> QuarryTicket[]
Client -> Project[]
Project -> BillingProfile?
Project -> ProjectRate[]
BillingFolder -> WorkOrder[]
BillingFolder -> Invoice?
InvoiceLine -> WorkOrder/QuarryTicket sources
Invoice -> InvoiceDelivery[]
Invoice -> PaymentReminder[]
BillingProfile/Client -> BankingInstructionDelivery[]
DepositNotice -> DepositNoticeLine[]
DepositNotice -> Payment? (après validation)
DepositNoticeLine -> Invoice? (correspondance proposée ou confirmée)
Payment -> PaymentAllocation[]
PaymentAllocation -> DepositNoticeLine?
PaymentAllocation -> Invoice
Invoice -> PaymentAllocation[]
```

## Extensions des modèles existants

### IssuerProfile

- politique par défaut d'inclusion du spécimen;
- référence vers le spécimen actif;
- numéro de version du document;
- date d'activation.

Le fichier bancaire lui-même demeure dans un stockage privé.

### Client

- délai de paiement par défaut;
- préférence papier/courriel;
- nombre de copies papier;
- notes de facturation;
- politique d'inclusion du spécimen facultative.

### Project

- numéro de projet;
- adresses opérationnelles;
- profil de facturation;
- délai de paiement;
- tarifs.

### Invoice

- période de facturation;
- pourcentage de surcharge carburant;
- note de surcharge;
- instantané du profil de facturation;
- livraisons et relances;
- allocations de paiement;
- solde restant calculé.

Les champs existants `paidAt` et `paymentMethod` peuvent être conservés comme valeurs de synthèse ou de compatibilité :

- `paidAt` correspond à la date où le solde atteint zéro;
- `paymentMethod` peut refléter le mode lorsque la facture est réglée par un seul mode;
- le statut `PAYEE` est atteint lorsque le solde restant est nul;
- la source de vérité détaillée demeure `PaymentAllocation`.

### InvoiceLine

- unité;
- tarif de base;
- pourcentage de surcharge appliqué;
- tarif effectif;
- références aux documents sources.

## Invariants de paiement

1. Un dépôt reçu est enregistré une seule fois, même s'il règle plusieurs factures.
2. Chaque facture réglée par ce dépôt possède sa propre affectation.
3. La somme des montants payés provenant des lignes d'avis est comparée au total annoncé.
4. La somme des affectations ne doit pas dépasser le montant du paiement lorsqu'il est connu, sauf correction explicite et auditée.
5. Une facture devient `PAYEE` seulement lorsque son solde atteint zéro.
6. La date de l'avis, la réception du courriel, la réception réelle des fonds et l'enregistrement applicatif sont des événements distincts.
7. Une retenue, un escompte ou un écart non nul bloque la confirmation automatique et exige une décision humaine.
8. Une annulation ou correction de paiement ne supprime pas l'historique original.
9. La réception d'un avis de dépôt ne crée aucune affectation définitive sans validation humaine.
10. Les valeurs brutes du document source sont conservées même après correction ou normalisation.
