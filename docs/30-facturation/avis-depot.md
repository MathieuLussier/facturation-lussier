# Avis de dépôt et sources de paiement

## Objet

Ce document décrit les formes possibles d'information de dépôt et le parcours cible **Enregistrer un dépôt**.

Un format réel analysé est un PDF détaillé d'une page, mais ce format n'est pas universel. Certains clients ne fournissent aucun PDF. L'application doit donc traiter l'avis comme une information de paiement pouvant provenir de plusieurs sources, et non comme un type de fichier obligatoire.

Les exemples de production ne sont pas versionnés : les noms, numéros, montants et renseignements bancaires réels demeurent dans le stockage applicatif privé.

## Sources possibles

Une information de dépôt peut provenir :

- d'un PDF joint à un courriel;
- du texte directement écrit dans le courriel;
- d'une image ou d'une capture;
- d'une autre pièce jointe;
- d'une saisie manuelle effectuée par la responsable;
- d'une autre confirmation accompagnée d'une note.

Le bouton **Enregistrer un dépôt** doit toujours être disponible, même lorsqu'aucun fichier n'existe.

## Format PDF observé

Le PDF réel analysé représente un seul dépôt qui règle plusieurs factures.

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

L'exemple observé contient quatre factures. Les montants payés par facture s'additionnent au montant total du dépôt. Les retenues et escomptes sont présents comme colonnes, mais valent zéro.

Selon l'expérience actuelle, les retenues et escomptes observés ont toujours été à zéro. Ils restent toutefois conservés comme données facultatives afin de ne pas perdre l'information lorsqu'un client les utilise éventuellement.

## Date de l'avis et date réelle du paiement

Le document observé précise que les fonds peuvent ne pas être reçus avant un délai pouvant atteindre 48 heures ouvrables.

La date imprimée sur l'avis ne doit donc pas être utilisée automatiquement comme date d'encaissement. Le système doit distinguer :

- `noticeDate` — date de l'avis;
- `receivedAt` — date et heure de réception du courriel, du fichier ou de l'information;
- `paidAt` — date réelle où le paiement est considéré reçu dans le compte;
- `recordedAt` — date et heure où la responsable enregistre le dépôt dans l'application.

La responsable confirme `paidAt` avant de finaliser le rapprochement.

## Parcours cible avec un PDF ou une source structurée

1. La responsable ouvre **Enregistrer un dépôt**.
2. Elle ajoute le fichier ou sélectionne un avis déjà importé.
3. L'application extrait les données sans les confirmer automatiquement.
4. Elle affiche le montant total annoncé et une ligne par facture.
5. Elle recherche les factures correspondantes par leur référence officielle.
6. Elle compare, pour chaque facture :
   - le montant de la facture dans l'application;
   - le montant indiqué dans la source;
   - la retenue;
   - l'escompte;
   - le montant payé;
   - le solde restant après affectation.
7. Elle signale les références inconnues, les factures annulées, déjà payées ou dont le montant ne correspond pas.
8. La responsable confirme la date réelle de réception du paiement.
9. Elle approuve le rapprochement.
10. L'application crée un seul `Payment` et une `PaymentAllocation` par facture.
11. Les factures dont le solde atteint zéro passent à `PAYEE`.
12. Les factures qui conservent un solde restent ouvertes comme paiements partiels.

## Parcours cible sans PDF

1. La responsable ouvre **Enregistrer un dépôt**.
2. Elle choisit **Saisir manuellement**, ou importe le texte du courriel.
3. Elle indique le payeur, la date réelle et le montant total.
4. Elle ajoute chaque numéro de facture et le montant payé correspondant.
5. L'application recherche les factures et affiche leur solde.
6. Elle signale les écarts ou références inconnues.
7. La responsable confirme le rapprochement.
8. Le paiement et ses affectations sont enregistrés avec le type de source et une note d'audit.

L'absence de PDF ne réduit pas les contrôles de cohérence et ne permet pas de contourner la validation humaine.

## Extraction assistée

Selon la source, l'extraction peut proposer :

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
- la zone du document ou du texte d'où elle provient, lorsque possible.

Aucune extraction ne doit marquer une facture payée sans confirmation humaine.

## Paiement partiel

Le montant payé pour une facture peut être inférieur à son solde.

Dans ce cas :

- l'affectation est enregistrée pour le montant réellement reçu;
- le solde après paiement est conservé;
- la facture ne passe pas à `PAYEE`;
- elle devient `PARTIELLEMENT_PAYEE` ou expose cet état à partir de son solde;
- d'autres paiements peuvent être appliqués plus tard;
- les relances ne sont annulées que lorsque le solde atteint zéro.

## Contrôles de cohérence

Avant confirmation :

1. la somme des montants payés par facture est comparée au total annoncé lorsqu'il est connu;
2. chaque référence doit correspondre à une facture accessible;
3. le montant affecté ne doit pas dépasser le solde, sauf traitement explicite d'un trop-perçu;
4. un montant inférieur au solde est accepté comme paiement partiel;
5. une retenue ou un escompte non nul déclenche une révision manuelle;
6. la date réelle du paiement doit être renseignée;
7. les renseignements bancaires doivent être masqués;
8. la source originale est conservée lorsqu'elle existe;
9. une saisie sans pièce doit conserver une note et l'identité de l'utilisateur.

Un écart n'est jamais corrigé silencieusement. Il produit un état `ECART_A_TRAITER` ou équivalent et exige une décision auditée.

## États suggérés

- `RECU`
- `EXTRAIT`
- `A_VALIDER`
- `ECART_A_TRAITER`
- `RAPPROCHE`
- `ANNULE`

L'entité de paiement possède ses propres états et peut exister sans entité d'avis formelle.

## Confidentialité

Une source de paiement peut contenir des identifiants de compte, de vendeur et des renseignements financiers commerciaux.

Exigences :

- stockage privé et chiffré selon l'architecture retenue;
- accès limité aux rôles autorisés;
- aucune URL publique;
- aucun contenu bancaire dans les journaux applicatifs;
- masquage des numéros sensibles dans l'interface;
- conservation de l'original lorsqu'il existe;
- aucun avis réel dans Git.

## Points encore ouverts

- Quels formats les clients utilisent-ils lorsqu'ils ne fournissent pas de PDF?
- La date réelle utilisée par la responsable vient-elle du relevé bancaire, du courriel ou d'une autre confirmation?
- Les retenues ou escomptes seront-ils un jour utilisés avec une valeur non nulle?
- Faut-il conserver le courriel complet en plus de son texte ou de ses pièces jointes?
- Comment traiter un dépôt annoncé qui n'apparaît pas dans le compte après le délai indiqué?
- Après un paiement partiel, quand et comment relancer le solde restant?
