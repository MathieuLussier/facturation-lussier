# Scénarios d'acceptation — paiements et instructions bancaires

Ces scénarios complètent les scénarios métier généraux et servent de base aux futures maquettes, API et tests E2E.

## SC-PAY-001 — Enregistrer un dépôt couvrant plusieurs factures

**Étant donné** qu'un avis de dépôt mentionne trois numéros de facture,

**quand** la responsable choisit **Enregistrer un dépôt**,

**alors** l'application lui permet :

- de saisir la date réelle du dépôt;
- de saisir le montant total lorsqu'il est connu;
- de rechercher les trois factures;
- de voir leur client, leur montant et leur solde;
- de les sélectionner dans la même opération;
- de confirmer les montants affectés.

Une seule entité `Payment` est créée et trois `PaymentAllocation` la relient aux factures.

## SC-PAY-002 — Payer intégralement plusieurs factures

**Étant donné** que les affectations couvrent le solde complet de chaque facture,

**quand** le dépôt est confirmé,

**alors** :

- chaque facture passe à `PAYEE`;
- la date où son solde atteint zéro est conservée;
- ses relances non envoyées sont annulées;
- l'historique montre qu'elles ont été réglées par le même dépôt.

## SC-PAY-003 — Détecter un écart de montant

**Étant donné** que le montant total du dépôt est connu,

**quand** la somme des affectations ne correspond pas au montant du dépôt,

**alors** l'application signale l'écart et exige une décision explicite avant la confirmation.

Le traitement exact d'un paiement partiel, d'une retenue ou d'un trop-perçu reste à confirmer.

## SC-PAY-004 — Reconnaître les références d'un avis de dépôt

**Étant donné** qu'un avis de dépôt reçu par courriel contient plusieurs numéros de facture,

**quand** une fonction d'extraction est utilisée,

**alors** l'application :

- propose les références détectées;
- retrouve les factures correspondantes;
- signale les références inconnues, annulées ou déjà payées;
- n'enregistre aucun paiement sans validation humaine.

## SC-PAY-005 — Ajouter le spécimen selon une politique configurable

**Étant donné** que la politique applicable est `TOUJOURS_FACTURE`,

**quand** la responsable prépare un courriel de facture,

**alors** le spécimen actif est coché par défaut dans les pièces jointes.

La responsable voit clairement le document et peut le retirer avant l'envoi.

## SC-PAY-006 — Ne pas ajouter automatiquement le spécimen à une relance

**Étant donné** qu'une relance de paiement est préparée,

**quand** le composeur s'ouvre,

**alors** le spécimen de chèque n'est pas joint automatiquement, même si la politique des courriels de facture est `TOUJOURS_FACTURE`.

La responsable peut néanmoins le sélectionner explicitement.

## SC-PAY-007 — Tracer la version du spécimen transmis

**Étant donné** qu'un spécimen est joint à un courriel,

**quand** le courriel est envoyé,

**alors** l'historique conserve :

- la facture;
- les destinataires;
- la date et l'utilisateur;
- la version du spécimen;
- le fait qu'il a été ajouté automatiquement ou manuellement.

Les coordonnées bancaires ne sont jamais recopiées dans les journaux.