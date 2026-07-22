# Modèle de domaine — virements Interac

## Portée

Ce document complète [`50-modele-paiements.md`](50-modele-paiements.md) pour les virements Interac annoncés par courriel avant leur encaissement réel.

## Principe

Un courriel Interac reçu n'est pas encore un paiement encaissé.

Le modèle distingue donc :

```text
PaymentSource (courriel Interac reçu)
        │
        │ après dépôt et confirmation humaine
        ▼
Payment (fonds réellement reçus)
        │
        └── PaymentAllocation[] (factures réglées)
```

## Extension de PaymentSource.type

Ajouter :

```text
INTERAC_EMAIL
```

Ce type représente le courriel ou sa copie structurée, qu'il soit importé automatiquement depuis une boîte de réception ou saisi manuellement à partir du message reçu.

## Métadonnées Interac

Le champ structuré `interacMetadata` ou une entité spécialisée équivalente devrait pouvoir conserver :

- `senderName`;
- `announcedAmountCents`;
- `currency`;
- `sentAt`;
- `expiresAt`;
- `transferReference`;
- `message`;
- `rawInvoiceReferences`;
- `acceptanceStatus`;
- `depositedAt` facultatif;
- `confirmedById` facultatif;
- `confirmedAt` facultatif.

Le message original et la référence originale ne sont jamais remplacés par les valeurs normalisées.

## États de la source

Pour les sources Interac, les états suivants complètent ceux du modèle général :

- `A_ENCAISSER` — virement annoncé, fonds non encore confirmés;
- `ENCAISSE` — dépôt confirmé par la responsable;
- `EXPIRE` — échéance dépassée sans encaissement;
- `ANNULE` — virement annulé ou refusé;
- `ECART_A_TRAITER` — montant, référence ou situation incohérente.

Une implémentation peut utiliser un statut général et un sous-statut Interac, mais l'interface doit représenter clairement ces états.

## Extension de Payment.method

Ajouter :

```text
VIREMENT_INTERAC
```

`VIREMENT_INTERAC` est distinct de `DEPOT_DIRECT` parce que son cycle de vie peut inclure une réception de courriel, une expiration et une action de dépôt.

## Dates

Champs à distinguer :

- `PaymentSource.receivedAt` — arrivée du courriel;
- `interacMetadata.sentAt` — date annoncée par Interac;
- `interacMetadata.expiresAt` — date limite du dépôt;
- `interacMetadata.depositedAt` — action de dépôt, lorsqu'elle est connue;
- `Payment.paidAt` — date réelle retenue pour l'encaissement;
- `Payment.recordedAt` — enregistrement dans Facturation Lussier.

Aucune de ces dates ne doit écraser silencieusement une autre.

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
4. La référence originale, le message original et le montant annoncé restent auditables.
5. Une source expirée ou annulée ne crée aucune affectation valide.
6. Une référence de facture abrégée n'est qu'une proposition de correspondance.
7. La confirmation d'un paiement partiel conserve le solde restant.
8. Les identifiants bancaires et liens sensibles ne sont pas écrits dans les journaux applicatifs.

## Sécurité applicative

Le système n'accède pas au compte bancaire et ne réalise pas le dépôt.

Il ne doit pas stocker :

- les identifiants de connexion bancaire;
- les réponses à des questions de sécurité;
- les sessions de l'institution financière;
- les liens bancaires comme commandes à exécuter automatiquement.

Le dépôt est effectué dans l'environnement bancaire habituel. Facturation Lussier sert uniquement à préparer, suivre et confirmer le rapprochement.
