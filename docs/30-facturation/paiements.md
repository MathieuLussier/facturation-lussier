# Paiements, avis de dépôt et instructions bancaires

## Situation actuelle

Le mode de paiement observé est le dépôt direct dans le compte bancaire de Transport Lussier et Fils.

Lors de l'envoi d'une facture, un spécimen de chèque peut être joint afin de transmettre les coordonnées nécessaires au dépôt direct. Historiquement, ce document est surtout utilisé au premier contact avec un nouveau client ou un nouveau profil de facturation.

Après le paiement, un avis de dépôt est reçu par courriel. Un seul dépôt peut régler plusieurs factures et le même avis contient alors plusieurs numéros de facture.

L'exemple réel analysé confirme que l'avis peut contenir :

- le montant total annoncé du dépôt;
- une ligne par facture;
- la référence et la date de chaque facture;
- le montant de chaque facture;
- une colonne de retenue;
- une colonne d'escompte;
- le montant payé par facture;
- le total du nombre de factures et des montants.

La responsable utilise ensuite la fonction déjà présente dans l'application pour marquer les factures comme payées et inscrire la date réelle de réception du paiement.

Voir [`avis-depot.md`](avis-depot.md) pour le format observé et les exigences d'importation.

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

Cette approche évite les oublis tout en gardant le document visible et révocable avant l'envoi.

## Date de l'avis et date réelle du paiement

L'avis analysé précise que le dépôt peut ne pas être reçu avant un délai pouvant atteindre 48 heures ouvrables.

Le système doit donc distinguer :

- la date imprimée sur l'avis;
- la date de réception du courriel;
- la date réelle où les fonds sont considérés reçus;
- la date où la responsable enregistre le paiement.

La date de l'avis ne remplit jamais automatiquement `paidAt`. La responsable confirme la date réelle de réception avant de finaliser le rapprochement.

## Réception d'un dépôt couvrant plusieurs factures

Flux actuel et cible :

1. Le client effectue un dépôt direct.
2. Un avis de dépôt arrive par courriel.
3. L'avis indique plusieurs numéros de facture lorsqu'un seul dépôt en règle plusieurs.
4. L'avis indique le montant total du dépôt et un montant par facture dans le format observé.
5. La responsable ouvre **Enregistrer un dépôt**.
6. Elle importe le PDF ou sélectionne l'avis reçu.
7. L'application propose les données extraites et recherche les factures correspondantes.
8. La responsable confirme les factures, les montants et la date réelle de réception.
9. Elle enregistre une seule opération de paiement.
10. Une affectation distincte relie cette opération à chaque facture.
11. Les factures entièrement réglées passent au statut `PAYEE`.
12. Les relances encore prévues pour ces factures sont arrêtées.

Le bouton existant **Marquer comme payée** reste utile pour un paiement simple portant sur une seule facture. Le parcours **Enregistrer un dépôt** traite plusieurs factures en une seule opération.

## Rapprochement proposé

Lorsqu'un avis de dépôt est traité, l'application peut :

- extraire ou permettre de saisir le numéro et la date de l'avis;
- extraire le montant total;
- extraire les références et dates de factures;
- extraire, pour chaque facture, le montant, la retenue, l'escompte et le montant payé;
- rechercher toutes les factures correspondantes;
- afficher leur client, leur montant et leur solde;
- comparer les données de l'avis aux données internes;
- proposer de sélectionner toutes les factures reconnues ensemble;
- comparer la somme des montants payés au montant total du dépôt;
- signaler une référence inconnue, annulée ou déjà payée;
- signaler une retenue, un escompte ou un écart non nul;
- demander une confirmation humaine avant toute modification.

La réception d'un courriel ne doit jamais, à elle seule, marquer automatiquement les factures comme payées dans le MVP.

## Données à conserver

### Avis de dépôt

- référence ou numéro de l'avis;
- date de l'avis;
- date et heure de réception;
- payeur;
- montant total annoncé;
- nombre de factures;
- document PDF source;
- référence du courriel source, lorsque disponible;
- statut de traitement;
- utilisateur ayant validé le rapprochement.

Les numéros de compte ou de vendeur doivent être masqués dans l'interface et exclus des journaux en clair.

### Ligne d'avis de dépôt

Pour chaque facture mentionnée :

- référence brute de la facture;
- date de facture indiquée;
- montant indiqué;
- retenue indiquée;
- escompte indiqué;
- montant payé indiqué;
- facture reconnue, lorsqu'une correspondance est trouvée;
- état de rapprochement;
- niveau de confiance de l'extraction;
- corrections manuelles éventuelles.

### Paiement

- date réelle de réception;
- montant total;
- mode, avec `DEPOT_DIRECT` comme valeur observée;
- référence de dépôt ou d'avis;
- avis de dépôt source facultatif;
- utilisateur ayant enregistré le paiement;
- date et heure de l'enregistrement;
- note facultative.

### Affectation du paiement

Pour chaque facture liée au dépôt :

- facture;
- ligne d'avis source facultative;
- montant affecté;
- retenue observée, le cas échéant;
- escompte observé, le cas échéant;
- solde avant affectation;
- solde après affectation;
- utilisateur;
- date et heure.

Même lorsque les factures sont toutes payées intégralement, cette séparation conserve la preuve qu'elles provenaient d'un seul dépôt.

## Contrôles proposés

Avant de confirmer un dépôt, l'application devrait :

- afficher chaque numéro de facture et son montant;
- afficher les retenues, escomptes et montants payés provenant de l'avis;
- demander la date réelle du paiement;
- permettre de confirmer le mode de paiement;
- afficher le total sélectionné;
- comparer la somme des montants payés au montant total annoncé;
- comparer le montant payé au solde de chaque facture;
- avertir si une facture est déjà payée ou annulée;
- bloquer la confirmation automatique si une retenue ou un escompte est non nul;
- exiger une décision explicite en cas d'écart;
- enregistrer l'action dans l'historique;
- annuler les brouillons de relance des factures entièrement payées.

## Gestion des écarts

Un avis peut contenir une retenue, un escompte, un montant inférieur au solde, un trop-perçu ou une référence inconnue.

Dans ces cas :

- aucune facture n'est marquée entièrement payée par défaut;
- le dépôt peut rester en état `A_RAPPROCHER` ou `ECART_A_RESoudre`;
- la responsable choisit le traitement approprié;
- toute correction conserve l'avis original et un historique audit-able;
- le système ne modifie jamais le montant original de la facture pour forcer une égalité.

## Points à confirmer

Les éléments suivants demeurent ouverts :

- les retenues sont-elles parfois supérieures à zéro;
- les escomptes sont-ils parfois appliqués;
- les paiements partiels existent-ils indépendamment des retenues;
- la date réelle utilisée vient-elle du relevé bancaire, de l'avis ou d'une autre confirmation;
- comment gérer un dépôt en trop, insuffisant, annulé ou attribué à la mauvaise facture;
- faut-il conserver le courriel complet, sa pièce jointe ou seulement sa référence;
- confirmer la politique par défaut du spécimen : chaque facture, premier envoi seulement ou autre;
- le format du PDF est-il stable selon chaque client payeur.
