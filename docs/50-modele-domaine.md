# Modèle de domaine proposé

## Entités existantes à conserver

Le dépôt contient déjà des concepts utiles : `User`, `Client`, `Contact`, `Project`, `Invoice`, `InvoiceLine`, `InvoiceAttachment`, `Product` et `IssuerProfile`.

Le modèle `Invoice` possède déjà des champs pour la date d'encaissement et le mode de paiement. Ils peuvent soutenir le flux actuel de paiement complet marqué manuellement. Un modèle de paiement plus détaillé ne devient nécessaire que si les paiements partiels, les dépôts couvrant plusieurs factures ou les corrections de paiement sont confirmés.

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

### BankingInstructionDelivery

Trace l'envoi d'un spécimen de chèque ou d'instructions bancaires à un profil de facturation :

- client ou profil de facturation;
- document ou version transmis;
- destinataires;
- date et heure;
- utilisateur;
- facture ou courriel d'origine;
- statut d'envoi.

Cette entité doit enregistrer la preuve de transmission sans recopier les coordonnées bancaires dans les journaux.

### DepositNotice

Représente l'avis de dépôt reçu par courriel :

- date et heure de réception;
- expéditeur;
- objet;
- référence du message;
- numéros de factures mentionnés;
- montant, lorsqu'il est fourni;
- pièce jointe éventuelle;
- statut de traitement;
- utilisateur ayant validé le rapprochement.

Le contenu brut et les pièces doivent être stockés de façon privée. Dans le MVP, l'avis sert de preuve ou d'aide au rapprochement; il ne modifie pas automatiquement les factures.

### PaymentReminder

- facture;
- niveau;
- date prévue;
- objet et corps;
- statut;
- date d'envoi.

### Payment et PaymentAllocation — extension conditionnelle

Le flux actuel peut continuer à utiliser les champs d'encaissement de `Invoice` si chaque facture est payée intégralement en une fois.

Si les paiements partiels ou les dépôts couvrant plusieurs factures sont confirmés, ajouter :

#### Payment

- date de réception;
- montant;
- mode;
- référence;
- avis de dépôt facultatif;
- utilisateur ayant enregistré le paiement;
- date de création;
- note.

#### PaymentAllocation

- paiement;
- facture;
- montant appliqué;
- date;
- utilisateur.

Cette séparation permettrait à un dépôt de régler plusieurs factures et à une facture de recevoir plusieurs paiements sans perdre la traçabilité.

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
DepositNotice -> Invoice[] (rapprochement validé)
Payment -> PaymentAllocation[] (si extension activée)
PaymentAllocation -> Invoice
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
- livraisons et relances;
- avis de dépôt facultatif;
- référence de paiement facultative.

Les champs existants `paidAt` et `paymentMethod` restent suffisants pour le scénario confirmé où la responsable marque manuellement une facture entièrement payée et saisit sa date de réception.

### InvoiceLine

- unité;
- tarif de base;
- pourcentage de surcharge appliqué;
- tarif effectif;
- références aux documents sources.
