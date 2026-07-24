# Workflow de facturation

## Fréquence

Une facture est généralement produite par semaine pour un projet donné.

Les chauffeurs remettent normalement les bons et billets de la semaine le vendredi. Cette remise alimente la vérification et la préparation des factures hebdomadaires.

## Destinataire

La facture peut être adressée :

- à l'entreprise cliente;
- ou à un profil de facturation propre au projet.

Le projet peut donc définir son propre nom légal, son adresse, son contact, son courriel et ses conditions de paiement. En l'absence de valeurs propres au projet, celles du client sont utilisées.

## Regroupement

Plusieurs bons peuvent être regroupés sur une facture lorsqu'ils concernent :

- le même destinataire de facturation;
- le même projet;
- le même lieu ou un regroupement autorisé;
- la même période hebdomadaire;
- des conditions compatibles.

Des travaux réalisés à des endroits différents produisent généralement des factures distinctes.

## Création

La responsable sélectionne les bons vérifiés et clique sur **Créer la facture**.

L'application propose :

- client et profil du projet;
- date de facture;
- échéance;
- lignes par camion;
- plaque;
- date du travail;
- début, pause et fin;
- numéro du bon;
- heures;
- tarif de base du projet;
- surcharge hebdomadaire éventuelle;
- tarif effectif;
- TPS et TVQ.

## Traçabilité des lignes

Chaque ligne doit référencer explicitement le ou les documents qui la justifient. Pour un travail horaire, la ligne principale est généralement liée à un bon de travail précis.

La facture doit permettre au client de retrouver le numéro visible sur sa copie papier.

## Conditions de paiement

Les délais peuvent varier selon le client ou le projet :

- sur réception;
- 15 jours;
- 30 jours;
- 45 jours;
- valeur personnalisée.

Ordre de résolution :

1. valeur remplacée sur la facture;
2. valeur du projet;
3. valeur du client;
4. valeur par défaut de l'entreprise.

## Finalisation

Avant finalisation, vérifier :

- au moins une ligne;
- tous les bons requis;
- tarifs et quantités;
- surcharge;
- taxes;
- destinataire;
- échéance;
- pièces obligatoires.

À la finalisation :

- attribuer la référence officielle;
- figer les tarifs et calculs;
- générer le PDF;
- marquer les bons comme facturés;
- conserver un instantané des informations de facturation.

## Impression

Le bouton **Imprimer le dossier client** génère, dans l'ordre :

1. facture;
2. bons signés;
3. billets de carrière;
4. autres justificatifs.

Options :

- PDF combiné;
- documents séparés;
- sélection des pièces;
- copie interne;
- copie client.

## Courriel

Le bouton **Préparer le courriel** génère un brouillon contenant :

- destinataire et copies;
- objet;
- message;
- facture PDF;
- justificatifs sélectionnés;
- spécimen de chèque, selon la politique applicable.

La responsable voit toutes les pièces jointes, peut les retirer, relit le message et déclenche l'envoi.

## Spécimen de chèque

Le spécimen permet au destinataire de configurer le dépôt direct. Il contient des renseignements sensibles et doit être conservé dans un stockage privé.

Le système doit proposer une politique configurable :

- premier envoi seulement;
- chaque courriel de facture;
- jamais automatiquement.

Ordre de résolution proposé :

1. choix effectué pour le courriel en cours;
2. politique du profil de facturation du projet;
3. politique du client;
4. politique par défaut de l'entreprise.

Même lorsqu'une politique ajoute automatiquement le spécimen :

- sa présence est clairement affichée dans le composeur;
- la responsable peut le retirer avant l'envoi;
- l'historique conserve la version transmise;
- les coordonnées bancaires ne sont pas recopiées dans les journaux;
- le document n'est pas ajouté automatiquement aux relances.

La recommandation actuelle, à confirmer, est de le cocher par défaut pour chaque courriel de facture et de le laisser décoché pour les relances.

## Historique des envois

Conserver :

- date et heure;
- utilisateur;
- destinataires;
- objet;
- pièces jointes;
- canal;
- statut de remise disponible;
- erreur éventuelle;
- indication qu'un spécimen de chèque a été transmis;
- version du document bancaire transmis, sans exposer son contenu dans les journaux.

## Paiement par dépôt direct

Le mode de paiement observé est le dépôt direct.

Un seul dépôt peut régler plusieurs factures. Dans le format réel analysé, l'avis reçu par courriel contient :

- le montant total du dépôt;
- plusieurs numéros et dates de facture;
- un montant par facture;
- une retenue;
- un escompte;
- un montant payé par facture.

L'avis précise aussi que les fonds peuvent prendre jusqu'à 48 heures ouvrables pour être reçus. La date de l'avis et la date réelle d'encaissement doivent rester distinctes.

### Paiement d'une seule facture

Le bouton existant **Marquer comme payée** reste disponible :

1. la responsable ouvre la facture;
2. elle clique sur **Marquer comme payée**;
3. elle inscrit ou confirme la date réelle de réception;
4. elle confirme le mode `DEPOT_DIRECT`;
5. la facture passe à `PAYEE` lorsque son solde est nul.

### Dépôt couvrant plusieurs factures

Un parcours **Enregistrer un dépôt** doit permettre :

1. d'importer le PDF de l'avis ou de sélectionner un avis reçu;
2. d'extraire le numéro, la date et le montant total de l'avis;
3. d'extraire les références, dates, montants, retenues, escomptes et montants payés par facture;
4. de retrouver et sélectionner les factures correspondantes;
5. d'afficher leur montant et leur solde;
6. de comparer chaque ligne aux données internes;
7. de comparer la somme des montants payés au total annoncé;
8. de confirmer la date réelle de réception du paiement;
9. d'affecter le paiement à chaque facture;
10. de confirmer l'ensemble en une seule action.

Le système enregistre une seule opération de paiement et plusieurs affectations, une par facture. Il ne doit pas fabriquer plusieurs dépôts indépendants pour représenter la même transaction bancaire.

Une retenue, un escompte, une référence inconnue ou un écart de montant bloque la confirmation ordinaire et exige une révision humaine.

Lorsqu'une facture est entièrement réglée, l'application doit :

- enregistrer la date de paiement;
- conserver le paiement, la ligne d'avis et son affectation;
- passer la facture au statut `PAYEE`;
- arrêter ou annuler les brouillons de relance encore prévus;
- conserver l'utilisateur et l'horodatage de l'action.

Dans le MVP, la réception d'un courriel ne modifie pas automatiquement le statut d'une facture. L'extraction propose les données et la responsable confirme le rapprochement.

Voir [`paiements.md`](paiements.md) et [`avis-depot.md`](avis-depot.md) pour les exigences détaillées.

## Relances

Les factures échues génèrent des brouillons de relance. La responsable peut les modifier, envoyer, reporter, ignorer ou noter un appel téléphonique. Aucune relance automatique sans validation dans le MVP.
