# Paiements, avis de dépôt et instructions bancaires

## Situation actuelle

Le mode de paiement observé est le dépôt direct dans le compte bancaire de Transport Lussier et Fils.

Lors de l'envoi d'une facture, un spécimen de chèque peut être joint afin de transmettre les coordonnées nécessaires au dépôt direct. Historiquement, ce document est surtout utilisé au premier contact avec un nouveau client ou un nouveau profil de facturation.

Après le paiement, la responsable reçoit une information de dépôt. Un seul dépôt peut régler plusieurs factures. L'information reçue peut contenir le montant total ainsi qu'un montant attribué à chaque facture.

Un format réel analysé est un PDF détaillé contenant une ligne par facture, une retenue, un escompte et le montant payé. Ce format n'est toutefois pas universel : tous les clients ne fournissent pas un PDF. Le parcours **Enregistrer un dépôt** ne doit donc jamais dépendre de la présence d'un fichier.

Il est également confirmé qu'un client peut payer seulement une partie d'une facture.

Voir [`avis-depot.md`](avis-depot.md) pour le format observé et les différents modes de saisie.

## Principe : séparer le paiement de son avis

Le paiement reçu est l'événement financier principal. L'avis, le courriel, le PDF ou la note manuelle servent de preuve ou d'aide au rapprochement.

Ainsi :

- un `Payment` peut exister sans PDF;
- un avis ou document source peut être lié au paiement lorsqu'il existe;
- l'absence de document ne doit pas empêcher l'enregistrement d'un dépôt;
- toute saisie manuelle doit conserver l'utilisateur, la date et une note ou une référence lorsque disponible;
- aucune source reçue ne modifie automatiquement les factures sans validation humaine.

## Sources possibles d'un dépôt

Le système doit soutenir au minimum :

- `PDF_ATTACHMENT` — avis PDF joint à un courriel;
- `EMAIL_BODY` — renseignements directement écrits dans le corps du courriel;
- `IMAGE_ATTACHMENT` — capture, image ou document numérisé;
- `MANUAL_ENTRY` — saisie manuelle à partir d'une information reçue autrement;
- `OTHER` — autre source avec note descriptive.

La source est facultative pour le paiement, mais son type doit être enregistré lorsqu'elle existe.

## Envoi du spécimen de chèque

Le spécimen de chèque contient des renseignements bancaires sensibles. Il doit être conservé dans un stockage privé, protégé par les permissions applicatives, et ne doit jamais être versionné dans Git ni exposé par une URL publique.

Le système doit soutenir une politique configurable d'inclusion du spécimen :

- `PREMIER_ENVOI` — le proposer au premier envoi vers un profil de facturation;
- `TOUJOURS_FACTURE` — le joindre par défaut à chaque courriel de facture;
- `JAMAIS_AUTOMATIQUE` — le joindre seulement sur sélection manuelle.

La politique peut avoir une valeur par défaut au niveau de l'entreprise et une exception par client ou profil de facturation.

Dans tous les cas :

- le composeur affiche clairement que le spécimen sera joint;
- la responsable peut le retirer avant l'envoi;
- la version active du document est conservée et identifiable;
- l'historique enregistre qu'un document bancaire a été transmis, sans recopier ses coordonnées dans les journaux;
- une relance de paiement ne joint pas automatiquement le spécimen, sauf sélection explicite.

### Recommandation à confirmer

Pour le fonctionnement décrit, la politique la plus simple serait :

- spécimen coché par défaut sur chaque **courriel de facture**;
- spécimen non coché sur les **relances**;
- possibilité de remplacer ce comportement pour un client ou un projet particulier.

Cette approche évite les oublis tout en gardant le document visible et retirable avant l'envoi.

## Dates à distinguer

Lorsqu'un avis existe, le système peut devoir distinguer :

- `noticeDate` — date inscrite sur l'avis;
- `receivedAt` — date et heure de réception du courriel, du fichier ou de l'information;
- `paidAt` — date réelle où les fonds sont considérés reçus;
- `recordedAt` — date et heure où la responsable enregistre le paiement.

La date de l'avis ne remplit jamais automatiquement `paidAt`. La responsable confirme la date réelle avant de finaliser le rapprochement.

## Parcours cible — Enregistrer un dépôt

Le parcours doit fonctionner avec ou sans document source :

1. La responsable ouvre **Enregistrer un dépôt**.
2. Elle choisit éventuellement une source : PDF, courriel, image ou autre.
3. Si aucune source structurée n'existe, elle choisit **Saisir manuellement**.
4. Elle inscrit ou confirme la date réelle du dépôt.
5. Elle inscrit ou confirme le montant total.
6. Elle ajoute les références de factures et les montants payés pour chacune.
7. L'application recherche les factures correspondantes et affiche leur solde.
8. Elle compare le total des affectations au montant du dépôt.
9. La responsable corrige ou confirme les données.
10. L'application crée un seul `Payment` et une `PaymentAllocation` par facture.
11. Chaque facture est mise à jour selon son nouveau solde.

Le bouton existant **Marquer comme payée** reste utile pour une seule facture réglée intégralement. **Enregistrer un dépôt** devient le parcours général pour :

- plusieurs factures;
- un paiement partiel;
- une preuve non structurée;
- une saisie sans PDF;
- un écart nécessitant une vérification.

## Rapprochement assisté

Lorsqu'une source structurée est disponible, l'application peut proposer :

- la référence et la date de l'avis;
- le montant total;
- les références et dates de factures;
- pour chaque facture, le montant, la retenue, l'escompte et le montant payé;
- les factures correspondantes dans l'application;
- l'écart entre le total annoncé et les affectations.

Lorsqu'aucun PDF n'est disponible, la même grille de rapprochement est remplie manuellement ou à partir du texte du courriel.

Dans tous les cas :

- une valeur extraite reste une proposition;
- une référence inconnue, annulée ou déjà payée est signalée;
- la responsable confirme avant toute modification;
- le système ne crée jamais artificiellement plusieurs dépôts pour représenter une seule transaction bancaire.

## Paiement partiel

Un paiement partiel est une affectation dont le montant est inférieur au solde de la facture avant paiement.

Exemple :

```text
Solde avant paiement : 3 000,00 $
Montant reçu :         1 000,00 $
Solde restant :        2 000,00 $
```

Après confirmation :

- la facture ne passe pas à `PAYEE`;
- son statut devient `PARTIELLEMENT_PAYEE`, ou cet état est dérivé de son solde;
- le paiement et son affectation sont conservés;
- le solde restant demeure visible;
- un paiement ultérieur peut être affecté à la même facture;
- la facture passe à `PAYEE` seulement lorsque son solde atteint zéro;
- les relances ne sont pas toutes annulées automatiquement tant qu'un solde demeure.

Le texte et le calendrier exacts d'une relance après paiement partiel restent à confirmer avec la responsable.

## Retenue et escompte

Dans l'exemple analysé et selon l'expérience actuelle, les colonnes de retenue et d'escompte ont toujours été à zéro.

Le système doit néanmoins conserver ces champs lorsqu'ils sont fournis par un client, sans leur attribuer automatiquement une signification comptable. Une valeur non nulle déclenche une révision manuelle et une note d'audit.

## Données à conserver

### Information ou avis de dépôt

- type de source;
- référence ou numéro de l'avis, lorsque disponible;
- date de l'avis, lorsque disponible;
- date et heure de réception;
- payeur;
- montant total annoncé;
- nombre de factures annoncé;
- fichier source facultatif;
- texte source facultatif;
- référence du courriel facultative;
- statut de traitement;
- utilisateur ayant validé le rapprochement.

Les numéros de compte ou de vendeur doivent être masqués dans l'interface et exclus des journaux en clair.

### Ligne d'avis ou de saisie

Pour chaque facture mentionnée :

- référence brute de la facture;
- date de facture indiquée, lorsque disponible;
- montant de facture indiqué, lorsque disponible;
- retenue indiquée;
- escompte indiqué;
- montant payé indiqué;
- facture reconnue;
- état de rapprochement;
- niveau de confiance lorsque la valeur est extraite;
- corrections manuelles éventuelles.

### Paiement

- date réelle de réception;
- montant total;
- mode, avec `DEPOT_DIRECT` comme valeur observée;
- référence facultative;
- source ou avis facultatif;
- utilisateur ayant enregistré le paiement;
- date et heure de l'enregistrement;
- note facultative.

### Affectation du paiement

Pour chaque facture liée au dépôt :

- facture;
- ligne source facultative;
- montant affecté;
- retenue observée facultative;
- escompte observé facultatif;
- solde avant affectation;
- solde après affectation;
- utilisateur;
- date et heure.

Une facture peut recevoir plusieurs affectations provenant de paiements distincts.

## Contrôles proposés

Avant de confirmer un dépôt, l'application devrait :

- afficher chaque numéro de facture, son total et son solde actuel;
- afficher le montant payé prévu pour chaque facture;
- demander la date réelle du paiement;
- permettre de confirmer le mode de paiement;
- afficher le montant total du dépôt et le total affecté;
- comparer les deux totaux;
- avertir si une facture est déjà payée ou annulée;
- avertir si une affectation dépasse le solde;
- accepter une affectation inférieure au solde comme paiement partiel;
- exiger une décision explicite pour une retenue, un escompte ou tout autre écart;
- enregistrer l'action dans l'historique;
- annuler les relances seulement pour les factures dont le solde atteint zéro.

## Gestion des écarts

Un dépôt peut être partiel, supérieur au solde, insuffisant par rapport au détail annoncé, annulé ou attribué à la mauvaise facture.

Dans ces cas :

- le dépôt peut rester en état `A_RAPPROCHER` ou `ECART_A_TRAITER`;
- la responsable choisit le traitement approprié;
- toute correction conserve la source et l'historique originaux;
- le système ne modifie jamais le montant original de la facture pour forcer une égalité;
- une correction ou annulation doit être auditée plutôt que supprimée silencieusement.

## Points à confirmer

- Quels formats les clients utilisent-ils lorsqu'ils ne fournissent pas de PDF?
- La date réelle du paiement vient-elle du relevé bancaire, du courriel ou d'une autre confirmation?
- Après un paiement partiel, à quel moment et avec quel texte faut-il relancer le solde?
- Les retenues ou escomptes peuvent-ils un jour être réellement utilisés?
- Comment gérer un trop-perçu, un dépôt annulé ou une mauvaise affectation?
- Faut-il conserver le courriel complet, son texte, ses pièces jointes ou seulement une référence?
- Confirmer la politique par défaut du spécimen : chaque facture, premier envoi seulement ou autre.
