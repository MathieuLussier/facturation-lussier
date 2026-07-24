# Scénarios d'acceptation — vérification de l'encaissement

Ces scénarios complètent les scénarios de paiements et de virements Interac.

## SC-VER-001 — Vérifier un dépôt automatique par deux sources

**Étant donné** une notification Interac en état `DEPOT_AUTOMATIQUE_A_CONFIRMER`,

**quand** la responsable prépare la confirmation du paiement,

**alors** l'application lui demande de confirmer séparément :

- qu'elle a vérifié le courriel ou la notification;
- qu'elle a vérifié le compte bancaire;
- que le montant observé au compte correspond au montant annoncé;
- la date réelle d'encaissement utilisée pour `paidAt`;
- la ou les factures et les montants affectés.

Aucune facture ne passe à `PAYEE` avant la confirmation de la réception réelle des fonds.

## SC-VER-002 — Tracer les deux vérifications

**Étant donné** que les deux vérifications ont été effectuées,

**quand** la responsable confirme l'encaissement,

**alors** l'historique conserve au minimum :

- l'utilisateur ayant vérifié la notification;
- l'heure de cette vérification;
- l'utilisateur ayant vérifié le compte bancaire;
- l'heure de cette vérification;
- la date comptable confirmée;
- une note facultative.

Aucun identifiant bancaire, mot de passe ou numéro de compte complet n'est enregistré.

## SC-VER-003 — Détecter une différence entre le courriel et le compte

**Étant donné** que le courriel annonce un montant différent de celui observé au compte bancaire,

**quand** la responsable compare les deux sources,

**alors** :

- l'application affiche l'écart;
- la source ou le paiement passe à `ECART_A_TRAITER`;
- aucune facture n'est marquée payée automatiquement;
- les valeurs originales restent conservées;
- une décision explicite et une note d'audit sont exigées.

## SC-VER-004 — Notification reçue, dépôt absent du compte

**Étant donné** qu'un courriel annonce un dépôt automatique,

**quand** la responsable ne trouve pas encore les fonds dans le compte bancaire,

**alors** :

- la source demeure `DEPOT_AUTOMATIQUE_A_CONFIRMER`;
- aucun `Payment` définitif ni `PaymentAllocation` définitive n'est créé;
- la facture reste ouverte;
- la responsable peut reporter la vérification;
- le système conserve la date de la notification sans la copier dans `paidAt`.

## SC-VER-005 — Montant et dépôt confirmés

**Étant donné** que la notification et le compte bancaire concordent,

**quand** la responsable confirme la date réelle et les affectations,

**alors** :

- le `Payment` est créé ou finalisé;
- les `PaymentAllocation` sont enregistrées;
- la source passe à `ENCAISSE`;
- une facture entièrement réglée passe à `PAYEE`;
- une facture partiellement réglée conserve son solde;
- l'historique relie la notification, la vérification bancaire et le paiement.
