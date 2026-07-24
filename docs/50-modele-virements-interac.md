# Modèle de domaine — virements Interac

## Portée

Ce document complète [`50-modele-paiements.md`](50-modele-paiements.md) pour les virements Interac annoncés par courriel avant leur encaissement réel.

## Principe

Un courriel Interac reçu n'est pas automatiquement un paiement encaissé.

Le modèle distingue donc :

```text
PaymentSource (courriel Interac reçu)
        │
        │ validation du mode et confirmation humaine
        ▼
Payment (fonds réellement reçus)
        │
        └── PaymentAllocation[] (factures réglées)
```

Le virement peut exiger une acceptation manuelle ou utiliser le dépôt automatique selon le client.

## Extension de PaymentSource.type

Ajouter :

```text
INTERAC_EMAIL
```

Ce type représente le courriel ou sa copie structurée, qu'il soit importé automatiquement depuis une boîte de réception ou saisi manuellement à partir du message reçu.

## Mode d'encaissement Interac

Ajouter une valeur structurée par source :

```text
InteracDepositMode {
  MANUAL_ACCEPTANCE
  AUTO_DEPOSIT
  UNKNOWN
}
```

Signification :

- `MANUAL_ACCEPTANCE` — la responsable doit accepter le virement dans son institution financière;
- `AUTO_DEPOSIT` — le virement est destiné à être déposé automatiquement;
- `UNKNOWN` — le message ou la saisie ne permet pas encore de déterminer le mode.

Le mode appartient au virement courant. Une valeur habituelle peut aussi être mémorisée au niveau du client ou du profil de facturation, mais elle n'est qu'une valeur par défaut.

## Métadonnées Interac

Le champ structuré `interacMetadata` ou une entité spécialisée équivalente devrait pouvoir conserver :

- `senderName`;
- `announcedAmountCents`;
- `currency`;
- `sentAt`;
- `expiresAt` facultatif;
- `transferReference`;
- `message`;
- `rawInvoiceReferences`;
- `depositMode`;
- `acceptanceStatus`;
- `acceptedAt` facultatif;
- `depositedAt` facultatif;
- `confirmedById` facultatif;
- `confirmedAt` facultatif.

Le message original et la référence originale ne sont jamais remplacés par les valeurs normalisées.

## États de la source

Pour les sources Interac, les états suivants complètent ceux du modèle général :

- `A_ENCAISSER` — acceptation manuelle encore nécessaire;
- `DEPOT_AUTOMATIQUE_A_CONFIRMER` — aucune acceptation attendue, mais réception réelle non confirmée;
- `ENCAISSE` — réception des fonds et rapprochement confirmés;
- `EXPIRE` — échéance dépassée sans encaissement pour un transfert manuel;
- `ANNULE` — virement annulé ou refusé;
- `ECART_A_TRAITER` — montant, référence ou situation incohérente.

Une implémentation peut utiliser un statut général et un sous-statut Interac, mais l'interface doit représenter clairement les deux branches.

## Extension de Payment.method

Ajouter :

```text
VIREMENT_INTERAC
```

`VIREMENT_INTERAC` est distinct de `DEPOT_DIRECT` parce que son cycle de vie peut inclure une réception de courriel, une expiration et, selon le client, une action d'acceptation.

Le mode manuel ou automatique n'a pas besoin de devenir une méthode de paiement différente : il s'agit d'une propriété du cycle d'encaissement de la source Interac.

## Dates

Champs à distinguer :

- `PaymentSource.receivedAt` — arrivée du courriel;
- `interacMetadata.sentAt` — date annoncée par Interac;
- `interacMetadata.expiresAt` — date limite du dépôt lorsqu'elle existe;
- `interacMetadata.acceptedAt` — action d'acceptation manuelle;
- `interacMetadata.depositedAt` — dépôt considéré effectué;
- `Payment.paidAt` — date réelle retenue pour l'encaissement;
- `Payment.recordedAt` — enregistrement dans Facturation Lussier.

Pour un dépôt automatique, `acceptedAt` reste vide. Aucune de ces dates ne doit écraser silencieusement une autre.

## Préférence facultative par client

Puisque le mode dépend des clients, ajouter facultativement sur `Client` ou `BillingProfile` :

```text
preferredInteracDepositMode: InteracDepositMode?
```

Ordre proposé :

1. mode explicitement confirmé sur le virement courant;
2. mode détecté dans le message courant;
3. préférence du profil de facturation;
4. préférence du client;
5. `UNKNOWN`.

La préférence ne doit jamais transformer automatiquement une notification en paiement.

## Correspondance des références de facture

Le message peut contenir une référence abrégée, par exemple :

```text
Facture 2026/06/000X
```

alors que la référence officielle est :

```text
FAC/2026/06/000X
```

Le système peut calculer une clé normalisée :

```text
normalizeInvoiceReference("Facture 2026/06/000X")
= "2026/06/000X"
```

Règles proposées :

- retirer les libellés génériques comme `Facture`;
- traiter `FAC/` comme préfixe facultatif pour la recherche;
- uniformiser les espaces, tirets et barres obliques;
- ne pas ignorer les chiffres significatifs;
- refuser une correspondance ambiguë;
- conserver la valeur brute pour l'audit;
- exiger une confirmation humaine.

## Doublons

Une source Interac ne doit pas être enregistrée deux fois comme paiement.

Clé de détection suggérée :

```text
transferReference + senderName + announcedAmountCents
```

La référence seule peut être suffisante lorsqu'elle est garantie unique, mais le système doit rester prudent en cas de valeur manquante ou mal extraite.

Le passage d'un état `A_ENCAISSER` ou `DEPOT_AUTOMATIQUE_A_CONFIRMER` à `ENCAISSE` met à jour la même source; il ne crée pas un second virement.

## Paiement partiel

Après encaissement :

```text
Payment.totalAmountCents = montant réellement reçu
PaymentAllocation.amountCents = montant affecté à la facture
```

Si l'affectation est inférieure au solde :

- la facture reste ouverte;
- son solde est recalculé;
- elle expose l'état `PARTIELLEMENT_PAYEE`;
- un paiement futur peut compléter le règlement.

## Invariants

1. Une source `INTERAC_EMAIL` peut exister sans `Payment` tant que les fonds ne sont pas confirmés.
2. La réception du courriel ne change jamais le statut d'une facture.
3. Un `Payment` de méthode `VIREMENT_INTERAC` est créé ou finalisé seulement après confirmation humaine.
4. Chaque source conserve son mode `MANUAL_ACCEPTANCE`, `AUTO_DEPOSIT` ou `UNKNOWN`.
5. Une source manuelle reste `A_ENCAISSER` jusqu'à l'acceptation et la confirmation.
6. Une source à dépôt automatique reste `DEPOT_AUTOMATIQUE_A_CONFIRMER` jusqu'à la confirmation de réception.
7. Un courriel de dépôt automatique ne marque jamais silencieusement une facture payée.
8. La référence originale, le message original et le montant annoncé restent auditables.
9. Une source expirée ou annulée ne crée aucune affectation valide.
10. Une référence de facture abrégée n'est qu'une proposition de correspondance.
11. La confirmation d'un paiement partiel conserve le solde restant.
12. Les identifiants bancaires et liens sensibles ne sont pas écrits dans les journaux applicatifs.
13. Une préférence client ne remplace jamais le mode confirmé sur le virement courant.

## Sécurité applicative

Le système n'accède pas au compte bancaire et ne réalise pas le dépôt.

Il ne doit pas stocker :

- les identifiants de connexion bancaire;
- les réponses à des questions de sécurité;
- les sessions de l'institution financière;
- les liens bancaires comme commandes à exécuter automatiquement.

Le dépôt ou son acceptation est effectué dans l'environnement bancaire habituel. Facturation Lussier sert uniquement à préparer, suivre et confirmer le rapprochement.
