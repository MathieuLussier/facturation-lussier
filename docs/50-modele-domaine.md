# Modèle de domaine proposé

## Entités existantes à conserver

Le dépôt contient déjà des concepts utiles : `User`, `Client`, `Contact`, `Project`, `Invoice`, `InvoiceLine`, `InvoiceAttachment`, `Product` et `IssuerProfile`.

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
- date;
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
- date.

### BillingProfile

Profil facultatif porté par un projet :

- nom légal;
- adresse;
- contact;
- courriel;
- conditions;
- préférences de livraison.

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
- erreur.

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
```

## Extensions des modèles existants

### Client

- délai de paiement par défaut;
- préférence papier/courriel;
- nombre de copies papier;
- notes de facturation.

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
- livraisons et relances.

### InvoiceLine

- unité;
- tarif de base;
- pourcentage de surcharge appliqué;
- tarif effectif;
- références aux documents sources.
