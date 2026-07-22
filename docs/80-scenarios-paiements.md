# Scénarios d'acceptation — paiements et instructions bancaires

Ces scénarios complètent les scénarios métier généraux et servent de base aux futures maquettes, API et tests E2E. Les données sont volontairement génériques et ne reproduisent aucun renseignement bancaire ou montant de production.

## SC-PAY-001 — Enregistrer un dépôt couvrant plusieurs factures

**Étant donné** qu'un avis de dépôt mentionne plusieurs numéros de facture,

**quand** la responsable choisit **Enregistrer un dépôt**,

**alors** l'application lui permet :

- d'ajouter ou de sélectionner l'avis source;
- de saisir la date réelle du dépôt;
- de saisir ou confirmer le montant total;
- de rechercher les factures;
- de voir leur client, leur montant et leur solde;
- de les sélectionner dans la même opération;
- de confirmer les montants affectés.

Une seule entité `Payment` est créée et une `PaymentAllocation` distincte la relie à chaque facture.

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

**quand** la somme des montants payés ou des affectations ne correspond pas au montant du dépôt,

**alors** l'application signale l'écart et exige une décision explicite avant la confirmation.

Le dépôt reste en état `ECART_A_TRAITER` ou `A_RAPPROCHER`. Le système ne modifie jamais une facture pour forcer l'égalité.

## SC-PAY-004 — Reconnaître les références d'un avis de dépôt

**Étant donné** qu'un avis de dépôt reçu par courriel contient plusieurs numéros de facture,

**quand** une fonction d'extraction est utilisée,

**alors** l'application :

- propose les références détectées;
- retrouve les factures correspondantes;
- signale les références inconnues, annulées ou déjà payées;
- affiche une confiance d'extraction;
- permet de corriger chaque valeur;
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

## SC-PAY-008 — Importer un avis détaillé de quatre factures

**Étant donné** un PDF d'avis contenant :

- une date d'avis;
- un montant total;
- quatre références de facture;
- une date et un montant pour chaque facture;
- des colonnes de retenue, d'escompte et de montant payé;

**quand** la responsable l'importe dans **Enregistrer un dépôt**,

**alors** l'application crée un `DepositNotice` en brouillon et quatre `DepositNoticeLine`.

Chaque ligne conserve les valeurs brutes, les valeurs normalisées, la confiance d'extraction et la facture proposée. Aucun `Payment` n'est créé avant la confirmation.

## SC-PAY-009 — Vérifier le total de l'avis

**Étant donné** que quatre lignes ont été extraites,

**quand** leur somme est égale au montant total annoncé,

**alors** l'application affiche le contrôle comme réussi.

Si la somme diffère, elle affiche l'écart, passe l'avis à `ECART_A_TRAITER` et bloque la confirmation ordinaire jusqu'à une décision explicite.

## SC-PAY-010 — Distinguer la date de l'avis de la date d'encaissement

**Étant donné** qu'un avis indique que les fonds peuvent prendre jusqu'à 48 heures ouvrables pour être reçus,

**quand** la responsable prépare le rapprochement,

**alors** :

- la date de l'avis est préremplie comme information documentaire;
- la date réelle d'encaissement reste un champ séparé;
- `paidAt` n'est jamais rempli automatiquement à partir de la date de l'avis;
- la responsable doit confirmer la date réelle avant la finalisation.

## SC-PAY-011 — Traiter une retenue ou un escompte non nul

**Étant donné** qu'une ligne d'avis contient une retenue ou un escompte supérieur à zéro,

**quand** l'avis est analysé,

**alors** l'application :

- met la ligne en état `A_REVISER`;
- affiche le montant de la facture, la retenue, l'escompte et le montant payé;
- calcule le solde potentiel sans le confirmer;
- ne marque pas automatiquement la facture entièrement payée;
- exige une décision humaine et une note d'audit.

Le traitement comptable précis demeure à valider avec les pratiques réelles et, au besoin, le comptable.

## SC-PAY-012 — Conserver le document source en privé

**Étant donné** qu'un avis de dépôt peut contenir des identifiants bancaires ou de vendeur,

**quand** il est importé,

**alors** :

- le fichier est stocké dans un espace privé;
- les numéros sensibles sont masqués dans l'interface;
- aucune valeur sensible n'est recopiée dans les journaux;
- les utilisateurs non autorisés ne peuvent ni le consulter ni le télécharger;
- le paiement et ses affectations conservent un lien d'audit vers l'avis.
