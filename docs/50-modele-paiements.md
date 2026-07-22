# Modèle de domaine — paiements et rapprochement

## Portée

Ce document précise le modèle de paiement confirmé par la découverte métier. Il complète `50-modele-domaine.md` et devient la référence détaillée pour les dépôts multi-factures, les sources sans PDF et les paiements partiels.

## Principes

1. Le paiement est distinct de l'avis ou de la preuve reçue.
2. Un paiement peut exister sans fichier source.
3. Un seul paiement peut être affecté à plusieurs factures.
4. Une facture peut recevoir plusieurs paiements successifs.
5. Une facture devient payée seulement lorsque son solde atteint zéro.
6. Les valeurs extraites d'un document ne deviennent jamais définitives sans validation humaine.

## PaymentSource

Représente l'information ou la preuve à partir de laquelle la responsable prépare le rapprochement.

Champs proposés :

- `id`;
- `type`;
- `receivedAt`;
- `noticeDate` facultative;
- `sender` facultatif;
- `payerName` facultatif;
- `emailSubject` facultatif;
- `emailMessageRef` facultatif;
- `rawText` facultatif;
- `storedFileName` facultatif;
- `mimeType` facultatif;
- `announcedTotalCents` facultatif;
- `announcedInvoiceCount` facultatif;
- `status`;
- `extractionData` facultative;
- `validatedById` facultatif;
- `validatedAt` facultatif;
- `createdAt`;
- `updatedAt`.

Types suggérés :

- `PDF_ATTACHMENT`;
- `EMAIL_BODY`;
- `IMAGE_ATTACHMENT`;
- `MANUAL_ENTRY`;
- `OTHER`.

Statuts suggérés :

- `RECU`;
- `EXTRAIT`;
- `A_VALIDER`;
- `ECART_A_TRAITER`;
- `RAPPROCHE`;
- `ANNULE`.

Le fichier, le texte et la référence de courriel sont tous facultatifs. Une source manuelle conserve obligatoirement l'utilisateur et une note ou référence disponible.

## PaymentSourceLine

Représente une facture mentionnée dans la source de paiement.

Champs proposés :

- `id`;
- `sourceId`;
- `position`;
- `rawInvoiceReference`;
- `announcedInvoiceDate` facultative;
- `announcedInvoiceAmountCents` facultatif;
- `holdbackCents` facultatif;
- `discountCents` facultatif;
- `paidAmountCents`;
- `matchedInvoiceId` facultatif;
- `matchStatus`;
- `confidence` facultative;
- `rawExtraction` facultative;
- `manualCorrections` facultatives;
- `validatedById` facultatif;
- `validatedAt` facultatif.

Les retenues et escomptes observés ont toujours été à zéro. Les champs sont néanmoins conservés afin de représenter fidèlement une source future qui contiendrait une valeur non nulle.

## Payment

Représente une seule transaction financière reçue.

Champs proposés :

- `id`;
- `paidAt` — date réelle de réception des fonds;
- `totalAmountCents`;
- `method`;
- `reference` facultative;
- `sourceId` facultatif;
- `payerClientId` facultatif;
- `status`;
- `note` facultative;
- `recordedById`;
- `recordedAt`;
- `createdAt`;
- `updatedAt`.

Statuts suggérés :

- `BROUILLON`;
- `A_RAPPROCHER`;
- `RAPPROCHE`;
- `ECART_A_TRAITER`;
- `ANNULE`;
- `CORRIGE`.

Un `Payment` peut être créé sans `PaymentSource`.

## PaymentAllocation

Relie un paiement à une facture.

Champs proposés :

- `id`;
- `paymentId`;
- `invoiceId`;
- `sourceLineId` facultatif;
- `amountCents`;
- `holdbackCents` facultatif;
- `discountCents` facultatif;
- `balanceBeforeCents`;
- `balanceAfterCents`;
- `allocatedById`;
- `allocatedAt`;
- `note` facultative.

Relations :

```text
PaymentSource 0..1 ── 0..1 Payment
PaymentSource 1 ── * PaymentSourceLine
Payment 1 ── * PaymentAllocation
Invoice 1 ── * PaymentAllocation
PaymentSourceLine 0..1 ── 0..1 PaymentAllocation
```

## Solde d'une facture

```text
solde = total de la facture - somme des affectations de paiement valides
```

Le calcul réel devra tenir compte des annulations ou corrections au moyen d'états auditables plutôt que par suppression de l'historique.

États de synthèse proposés :

- aucun paiement et solde supérieur à zéro : état de facturation courant;
- somme affectée supérieure à zéro et solde supérieur à zéro : `PARTIELLEMENT_PAYEE`;
- solde égal à zéro : `PAYEE`;
- solde négatif : `TROP_PERÇU_A_TRAITER` ou anomalie équivalente.

Le champ existant `Invoice.paidAt` peut rester une valeur de synthèse : il correspond à la date où le solde atteint zéro, et non à la date du premier paiement partiel.

## Invariants

1. Un dépôt bancaire est enregistré une seule fois.
2. Chaque facture touchée possède une affectation distincte.
3. Une affectation peut être inférieure au solde : il s'agit d'un paiement partiel valide.
4. Une affectation ne doit pas dépasser le solde sans traitement explicite d'un trop-perçu.
5. La somme des affectations est comparée au total du paiement lorsqu'il est connu.
6. Une facture ne devient `PAYEE` que lorsque son solde est nul.
7. Plusieurs paiements peuvent être appliqués à une même facture.
8. Une source de paiement est facultative; la traçabilité utilisateur demeure obligatoire.
9. Une source extraite ne crée aucune affectation sans validation humaine.
10. Une correction ou annulation conserve l'opération originale dans l'audit.

## Compatibilité avec le modèle actuel

Le modèle `Invoice` actuel contient `paidAt`, `paymentMethod` et le statut `PAYEE`. Pour soutenir le modèle cible :

- ajouter `Payment` et `PaymentAllocation` comme source de vérité détaillée;
- calculer ou stocker un solde restant;
- ajouter `PARTIELLEMENT_PAYEE` à `InvoiceStatus`, ou dériver cet état dans l'interface;
- conserver `paidAt` comme date de règlement complet;
- conserver `paymentMethod` comme valeur de synthèse lorsque cela reste pertinent;
- ne pas écraser les anciennes données de paiement pendant la migration.

## Relances

Lorsqu'un paiement est partiel :

- les relances de la facture ne sont pas toutes annulées;
- le solde restant doit être visible dans tout brouillon futur;
- le calendrier exact de la prochaine relance reste une règle métier à confirmer;
- la responsable doit pouvoir reporter ou ajuster la relance après avoir communiqué avec le client.
