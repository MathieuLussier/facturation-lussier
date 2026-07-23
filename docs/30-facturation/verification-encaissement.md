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
6. Elle confirme la date réelle d'encaissement utilisée pour `paidAt`.
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

## Date comptable

La source de vérité de `paidAt` reste à confirmer précisément avec la responsable. La recommandation fonctionnelle est d'utiliser la date où le crédit est visible ou comptabilisé dans le compte bancaire, et de conserver séparément la date du courriel, la date d'envoi et la date d'acceptation éventuelle.

## Sécurité

Facturation Lussier ne se connecte pas automatiquement au compte bancaire dans le MVP. La vérification est effectuée par la responsable dans son environnement bancaire habituel, puis confirmée manuellement dans l'application.
