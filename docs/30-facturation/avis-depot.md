# Avis de dépôt direct

## Objet

Ce document décrit le format d'avis de dépôt observé et le parcours cible **Enregistrer un dépôt**. Les exemples de production ne sont pas versionnés : les noms, numéros, montants et renseignements bancaires réels demeurent dans le stockage applicatif privé.

## Format observé

Un avis réel analysé est un PDF d'une page transmis par un client. Il représente un seul dépôt qui règle plusieurs factures.

L'en-tête contient notamment :

- un numéro ou une référence d'avis;
- la date de l'avis;
- l'identité du payeur;
- l'identité du fournisseur payé;
- un numéro de vendeur;
- un numéro de compte de dépôt, qui doit être masqué dans l'interface et les journaux;
- le montant total annoncé du dépôt.

Le tableau contient une ligne par facture avec les colonnes suivantes :

- référence de facture;
- date de facture;
- montant de la facture;
- retenue (`Holdback`);
- escompte (`Discount`);
- montant payé (`Paid`).

L'exemple observé contient quatre factures. Les montants payés par facture s'additionnent au montant total du dépôt. Les retenues et escomptes sont présents comme colonnes, mais valent zéro dans cet exemple.

## Date de l'avis et date réelle du paiement

Le document observé précise que les fonds peuvent ne pas être reçus avant un délai pouvant atteindre 48 heures ouvrables.

La date imprimée sur l'avis ne doit donc pas être utilisée automatiquement comme date d'encaissement. Le système doit distinguer :

- `noticeDate` — date de l'avis;
- `receivedAt` — date et heure de réception du courriel ou du PDF;
- `paidAt` — date réelle où le paiement est considéré reçu dans le compte;
- `recordedAt` — date et heure où la responsable enregistre le dépôt dans l'application.

La responsable confirme `paidAt` avant de finaliser le rapprochement.

## Parcours cible — Enregistrer un dépôt

1. La responsable ouvre **Enregistrer un dépôt**.
2. Elle ajoute le PDF de l'avis, ou sélectionne un avis déjà importé depuis un courriel.
3. L'application extrait les données sans les confirmer automatiquement.
4. Elle affiche le montant total annoncé et une ligne par facture.
5. Elle recherche les factures correspondantes par leur référence officielle.
6. Elle compare, pour chaque facture :
   - le montant de la facture dans l'application;
   - le montant indiqué sur l'avis;
   - la retenue;
   - l'escompte;
   - le montant payé;
   - le solde restant après affectation.
7. Elle signale les références inconnues, les factures annulées, déjà payées ou dont le montant ne correspond pas.
8. La responsable confirme la date réelle de réception du paiement.
9. Elle approuve le rapprochement.
10. L'application crée un seul `Payment` et une `PaymentAllocation` par facture.
11. Les factures dont le solde atteint zéro passent à `PAYEE` et leurs relances non envoyées sont annulées.

## Extraction assistée

L'extraction peut proposer :

- référence de l'avis;
- date de l'avis;
- payeur;
- montant total;
- nombre de factures;
- références des factures;
- dates des factures;
- montants;
- retenues;
- escomptes;
- montants payés.

Chaque valeur extraite doit conserver :

- sa valeur brute;
- sa valeur normalisée;
- un niveau de confiance;
- une indication de correction manuelle;
- la zone du document d'où elle provient, lorsque possible.

Aucune extraction ne doit marquer une facture payée sans confirmation humaine.

## Contrôles de cohérence

Avant confirmation :

1. la somme des montants payés par facture doit être comparée au total annoncé;
2. chaque référence doit correspondre à une facture accessible;
3. le montant affecté ne doit pas dépasser le solde, sauf traitement explicite d'un trop-perçu;
4. une retenue ou un escompte non nul doit déclencher une révision manuelle;
5. la date réelle du paiement doit être renseignée;
6. les renseignements bancaires doivent être masqués;
7. le document source doit rester attaché au paiement dans un stockage privé.

Un écart n'est jamais corrigé silencieusement. Il produit un état `ECART_A_RESoudre` ou équivalent et exige une décision auditée.

## États suggérés

- `RECU`
- `EXTRAIT`
- `A_VALIDER`
- `ECART_A_RESoudre`
- `RAPPROCHE`
- `ANNULE`

## Confidentialité

L'avis de dépôt peut contenir des identifiants de compte, de vendeur et des renseignements financiers commerciaux.

Exigences :

- stockage privé et chiffré selon l'architecture retenue;
- accès limité aux rôles autorisés;
- aucune URL publique;
- aucun contenu bancaire dans les journaux applicatifs;
- masquage des numéros sensibles dans l'interface;
- conservation de l'original pour l'audit;
- aucun avis réel dans Git.

## Points encore ouverts

- Les retenues sont-elles parfois supérieures à zéro?
- Les escomptes sont-ils parfois appliqués?
- La date réelle utilisée par la responsable vient-elle du relevé bancaire ou de l'avis?
- Le PDF est-il toujours joint au courriel dans un format semblable?
- Faut-il conserver le courriel complet en plus du PDF?
- Comment traiter un dépôt annoncé qui n'apparaît pas dans le compte après le délai indiqué?
