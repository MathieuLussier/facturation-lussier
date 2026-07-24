# Vérification de l'encaissement

## Objet

Ce document précise comment la responsable confirme qu'un paiement annoncé par courriel a réellement été reçu avant de modifier les factures.

## Principe confirmé

Pour un virement Interac à dépôt automatique, la responsable vérifie **les deux sources suivantes** :

1. le courriel ou la notification qui annonce le paiement;
2. le compte bancaire, afin de confirmer que les fonds sont réellement présents.

Le courriel seul n'est pas une preuve suffisante d'encaissement. La consultation du compte bancaire seule peut confirmer la présence des fonds, mais le courriel demeure utile pour identifier le payeur, le montant, la référence et la ou les factures concernées.

## Rôle des deux vérifications

### Vérification du courriel

Elle sert à confirmer ou proposer :

- le payeur;
- le montant annoncé;
- la devise;
- la référence du virement;
- la date d'envoi;
- la référence de facture inscrite dans le message;
- le mode annoncé : acceptation manuelle ou dépôt automatique.

### Vérification du compte bancaire

Elle sert à confirmer :

- que les fonds sont réellement reçus;
- le montant réellement crédité;
- la date bancaire à considérer;
- l'absence d'écart avec le courriel;
- qu'il ne s'agit pas seulement d'une notification en attente, expirée ou annulée.

## Parcours cible — dépôt automatique

1. Le courriel Interac est reçu et la source passe à `DEPOT_AUTOMATIQUE_A_CONFIRMER`.
2. L'application extrait ou permet de saisir les renseignements du courriel.
3. La responsable vérifie le courriel.
4. Elle consulte le compte bancaire.
5. Elle confirme séparément dans l'application :
   - **Courriel vérifié**;
   - **Fonds vérifiés au compte**.
6. Elle choisit et confirme la date d'encaissement utilisée pour `paidAt`.
7. Elle confirme les factures et les montants affectés.
8. L'application crée ou finalise le `Payment` et ses `PaymentAllocation`.
9. La source passe à `ENCAISSE`.

Aucune facture ne devient `PAYEE` tant que la réception réelle des fonds n'est pas confirmée.

## Données d'audit proposées

Sans stocker d'identifiants bancaires, l'application peut conserver :

- `emailNoticeCheckedAt`;
- `emailNoticeCheckedById`;
- `bankAccountCheckedAt`;
- `bankAccountCheckedById`;
- `bankTransactionDate` facultative;
- `paidAtBasis`;
- `paidAtOverrideNote` facultative;
- `confirmationNote` facultative;
- `paidAt` confirmé;
- l'écart constaté, le cas échéant.

Ces champs attestent qu'une vérification a été faite. Ils ne constituent pas une connexion au compte bancaire et ne doivent contenir aucun mot de passe, numéro de compte complet ou information de session.

## Gestion d'un écart

Si le courriel et le compte bancaire ne concordent pas :

- ne pas marquer la facture payée;
- placer la source ou le paiement dans `ECART_A_TRAITER`;
- afficher le montant annoncé et le montant observé;
- demander une note explicative;
- conserver les valeurs originales;
- permettre une correction auditée ou l'attente d'une confirmation du client.

## Date comptable à discrétion contrôlée

Le choix final de `paidAt` reste à la discrétion d'une personne autorisée de l'entreprise. L'application ne doit pas imposer automatiquement la date du courriel, de l'avis, du virement ou du compte bancaire.

Comportement recommandé :

1. proposer par défaut la date où le crédit apparaît ou est comptabilisé dans le compte bancaire;
2. permettre à la responsable de choisir une autre date lorsqu'elle juge qu'elle représente mieux l'encaissement;
3. conserver la base du choix;
4. demander une note lorsque la date retenue remplace la suggestion ou utilise une valeur manuelle;
5. ne jamais écraser les autres dates du cycle de paiement.

Valeurs proposées pour `paidAtBasis` :

- `BANK_POSTING_DATE` — date d'inscription visible au compte;
- `BANK_VALUE_DATE` — date de valeur fournie par l'institution financière;
- `EMAIL_NOTICE_DATE` — date de la notification reçue;
- `TRANSFER_SENT_DATE` — date annoncée d'envoi du virement;
- `MANUAL_OTHER` — autre date choisie explicitement.

La politique par défaut peut être configurée pour l'entreprise, mais elle reste modifiable sur chaque paiement. Le système doit montrer la suggestion et la valeur finalement confirmée afin de préserver à la fois la souplesse opérationnelle et la traçabilité.

## Sécurité

Facturation Lussier ne se connecte pas automatiquement au compte bancaire dans le MVP. La vérification est effectuée par la responsable dans son environnement bancaire habituel, puis confirmée manuellement dans l'application.