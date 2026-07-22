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

Représente l'avis de dépôt reçu par courriel :

- date et heure de réception;
- expéditeur;
- objet;
- référence du message;
- numéros de factures mentionnés;
- montant total, lorsqu'il est fourni;
- détail par facture, lorsqu'il est fourni;
- pièce jointe éventuelle;
- statut de traitement;
- utilisateur ayant validé le rapprochement;
- paiement créé après validation, le cas échéant.

Le contenu brut et les pièces doivent être stockés de façon privée. Dans le MVP, l'avis sert de preuve ou d'aide au rapprochement; il ne modifie pas automatiquement les factures.

### Payment

Représente une seule opération financière reçue. Un paiement peut régler une ou plusieurs factures.

- date réelle de réception;
- montant total, lorsqu'il est connu;
- mode de paiement;
- référence;
- avis de dépôt facultatif;
- client ou payeur, lorsque connu;
- statut;
- utilisateur ayant enregistré le paiement;
- date de création;
- note.

Statuts suggérés :

- `BROUILLON`;
- `A_RAPPROCHER`;
- `RAPPROCHE`;
- `ANNULE`;
- `CORRIGE`.

### PaymentAllocation

Relie une opération de paiement à une facture précise :

- paiement;
- facture;
- montant appliqué;
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
DepositNotice -> Payment? (après validation)
Payment -> PaymentAllocation[]
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
3. La somme des affectations ne doit pas dépasser le montant du paiement lorsqu'il est connu, sauf correction explicite et auditée.
4. Une facture devient `PAYEE` seulement lorsque son solde atteint zéro.
5. Une annulation ou correction de paiement ne supprime pas l'historique original.
6. La réception d'un avis de dépôt ne crée aucune affectation définitive sans validation humaine.