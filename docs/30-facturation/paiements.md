# Paiements, avis de dépôt et instructions bancaires

## Situation actuelle

Le mode de paiement observé est le dépôt direct dans le compte bancaire de Transport Lussier et Fils.

Lors de l'envoi d'une facture, un spécimen de chèque peut être joint afin de transmettre les coordonnées nécessaires au dépôt direct. Historiquement, ce document est surtout utilisé au premier contact avec un nouveau client ou un nouveau profil de facturation.

Après le paiement, un avis de dépôt est reçu par courriel. Un seul dépôt peut régler plusieurs factures et le même avis contient alors plusieurs numéros de facture.

La responsable utilise ensuite la fonction déjà présente dans l'application pour marquer les factures comme payées et inscrire la date réelle de réception du paiement.

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

## Réception d'un dépôt couvrant plusieurs factures

Flux actuel et cible :

1. Le client effectue un dépôt direct.
2. Un avis de dépôt arrive par courriel.
3. L'avis indique plusieurs numéros de facture lorsqu'un seul dépôt en règle plusieurs.
4. La responsable recherche les factures concernées.
5. Elle enregistre une seule opération de paiement avec la date réelle de réception.
6. Elle rattache toutes les factures mentionnées à ce paiement.
7. Les factures entièrement réglées passent au statut `PAYEE`.
8. Les relances encore prévues pour ces factures sont arrêtées.

Le bouton existant **Marquer comme payée** reste utile pour un paiement simple portant sur une seule facture. Un second parcours, **Enregistrer un dépôt**, doit permettre de traiter plusieurs factures en une seule opération.

## Rapprochement proposé

Lorsqu'un avis de dépôt est traité, l'application peut :

- extraire ou permettre de saisir les numéros de facture;
- rechercher toutes les factures correspondantes;
- afficher leur client, leur montant et leur solde;
- proposer de les sélectionner ensemble;
- comparer le total des factures au montant du dépôt lorsque ce montant est connu;
- signaler une référence inconnue, annulée ou déjà payée;
- demander une confirmation humaine avant toute modification.

La réception d'un courriel ne doit jamais, à elle seule, marquer automatiquement les factures comme payées dans le MVP.

## Données à conserver

### Paiement

- date réelle de réception;
- montant total, lorsqu'il est fourni;
- mode, avec `DEPOT_DIRECT` comme valeur observée;
- référence de dépôt ou d'avis;
- avis de dépôt source facultatif;
- utilisateur ayant enregistré le paiement;
- date et heure de l'enregistrement;
- note facultative.

### Affectation du paiement

Pour chaque facture liée au dépôt :

- facture;
- montant affecté;
- solde avant affectation;
- solde après affectation;
- utilisateur;
- date et heure.

Même lorsque les factures sont toutes payées intégralement, cette séparation conserve la preuve qu'elles provenaient d'un seul dépôt.

## Contrôles proposés

Avant de confirmer un dépôt, l'application devrait :

- afficher chaque numéro de facture et son montant;
- demander la date réelle du paiement;
- permettre de confirmer le mode de paiement;
- afficher le total sélectionné;
- comparer le total sélectionné au montant du dépôt, lorsqu'il est disponible;
- avertir si une facture est déjà payée ou annulée;
- exiger une décision explicite en cas d'écart;
- enregistrer l'action dans l'historique;
- annuler les brouillons de relance des factures entièrement payées.

## Points à confirmer

Les éléments suivants demeurent ouverts :

- les paiements partiels existent-ils;
- l'avis de dépôt indique-t-il toujours le montant total;
- indique-t-il un montant par facture ou seulement les numéros;
- des retenues contractuelles peuvent-elles être appliquées;
- comment gérer une erreur, un dépôt annulé ou un montant différent du total attendu;
- faut-il conserver le courriel complet, sa pièce jointe ou seulement sa référence;
- confirmer la politique par défaut du spécimen : chaque facture, premier envoi seulement ou autre.