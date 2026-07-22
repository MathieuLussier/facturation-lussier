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
- justificatifs sélectionnés.

La responsable relit et déclenche l'envoi.

## Premier envoi et spécimen de chèque

Lors du premier envoi de facture à un nouveau client ou à un nouveau profil de facturation de projet, la responsable joint un spécimen de chèque afin que le destinataire puisse configurer le dépôt direct.

Le système devrait :

- indiquer si les instructions bancaires ont déjà été transmises à ce profil de facturation;
- proposer le spécimen seulement lors du premier envoi;
- exiger une sélection et une validation explicites avant de joindre ce document sensible;
- conserver la date, le destinataire, l'utilisateur et la version du document envoyé;
- permettre de le joindre de nouveau sur demande, sans le joindre automatiquement à toutes les factures.

Le spécimen de chèque doit être conservé dans un stockage privé et protégé. Il ne doit jamais être exposé dans un dépôt public ou une URL non authentifiée.

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
- indication qu'un spécimen de chèque a été transmis, sans exposer ses données dans les journaux.

## Paiement par dépôt direct

Le mode de paiement observé est le dépôt direct.

Flux actuel :

1. le client dépose l'argent dans le compte communiqué;
2. un avis de dépôt arrive par courriel;
3. le courriel indique les numéros de factures payées;
4. la responsable recherche les factures concernées;
5. elle utilise le bouton déjà présent **Marquer comme payée**;
6. elle inscrit ou confirme la date réelle de réception du paiement.

Lorsqu'une facture est marquée payée, l'application doit :

- enregistrer la date de paiement;
- enregistrer le mode `DEPOT_DIRECT`;
- conserver l'utilisateur et l'horodatage de l'action;
- passer la facture au statut `PAYEE`;
- arrêter ou annuler les brouillons de relance encore prévus;
- permettre une référence ou une note liée à l'avis de dépôt.

Dans le MVP, la réception d'un courriel ne doit pas modifier automatiquement le statut d'une facture. Une future extraction peut proposer les factures mentionnées dans l'avis, mais la responsable doit confirmer le rapprochement.

Voir [`paiements.md`](paiements.md) pour les exigences détaillées.

## Relances

Les factures échues génèrent des brouillons de relance. La responsable peut les modifier, envoyer, reporter, ignorer ou noter un appel téléphonique. Aucune relance automatique sans validation dans le MVP.
