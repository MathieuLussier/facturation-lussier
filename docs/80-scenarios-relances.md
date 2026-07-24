# Scénarios d'acceptation — relances après échéance

## SC-REM-001 — Préparer une relance le lendemain de l'échéance

**Étant donné** une facture dont le solde reste supérieur à zéro à la fin de son échéance effective,

**quand** le jour civil suivant commence,

**alors** l'application prépare ou rend admissible un brouillon de relance.

Le brouillon utilise l'échéance effective du report actif lorsqu'il existe; sinon, il utilise l'échéance de la facture.

## SC-REM-002 — Ne jamais envoyer automatiquement le brouillon

**Étant donné** qu'un brouillon de relance a été généré automatiquement,

**quand** aucune personne autorisée ne l'a approuvé,

**alors** :

- aucun courriel n'est envoyé;
- le brouillon reste `DRAFT_A_APPROUVER`;
- il apparaît dans la file **Relances à approuver**;
- le client ne reçoit aucune notification.

## SC-REM-003 — Approuver puis envoyer une relance

**Étant donné** un brouillon à approuver dont les données sont encore valides,

**quand** une personne autorisée relit le contenu, confirme le solde et approuve la relance,

**alors** :

- l'utilisateur et l'heure d'approbation sont enregistrés;
- un instantané du contenu approuvé est conservé;
- la relance peut être envoyée;
- l'envoi conserve ses destinataires, pièces, utilisateur, heure et résultat.

## SC-REM-004 — Invalider l'approbation après une modification

**Étant donné** une relance déjà approuvée,

**quand** le texte, le destinataire, les pièces, le solde ou l'échéance sont modifiés,

**alors** l'approbation précédente est invalidée et une nouvelle approbation est requise avant l'envoi.

## SC-REM-005 — Rendre le brouillon obsolète après paiement

**Étant donné** un brouillon de relance en attente d'approbation,

**quand** un paiement règle entièrement la facture avant l'envoi,

**alors** :

- le brouillon passe à `OBSOLETE`;
- aucun courriel ne peut être envoyé à partir de celui-ci;
- la raison et l'heure de l'obsolescence sont conservées;
- la facture ne génère plus de relance tant que son solde reste nul.

## SC-REM-006 — Régénérer après un paiement partiel

**Étant donné** un brouillon qui réclame un certain solde,

**quand** un paiement partiel modifie ce solde avant l'envoi,

**alors** :

- le brouillon existant est marqué obsolète ou à actualiser;
- le nouveau solde est recalculé;
- une nouvelle version du brouillon est préparée au moment approprié;
- l'ancien contenu reste accessible dans l'audit;
- une nouvelle approbation est nécessaire.

## SC-REM-007 — Annuler une relance lorsqu'un nouveau délai est accordé

**Étant donné** un brouillon préparé après l'échéance,

**quand** la responsable accorde et communique un nouveau délai au client,

**alors** :

- le brouillon est marqué `OBSOLETE`;
- la relance ne peut plus être envoyée;
- le calendrier de recouvrement utilise la nouvelle échéance effective;
- un futur brouillon n'est préparé que le lendemain de cette nouvelle échéance si un solde subsiste.

## SC-REM-008 — Préparer un brouillon un samedi ou un dimanche

**Étant donné** que l'échéance effective est un vendredi,

**quand** le samedi suivant commence,

**alors** le brouillon devient admissible puisque le déclenchement est fixé au lendemain civil.

Le brouillon demeure sans effet externe jusqu'à ce qu'une personne autorisée l'approuve et l'envoie.

## SC-REM-009 — Empêcher un envoi avec des données périmées

**Étant donné** un brouillon généré depuis plusieurs jours,

**quand** une personne tente de l'approuver ou de l'envoyer,

**alors** l'application vérifie de nouveau :

- le solde;
- les paiements récents;
- l'échéance effective;
- les reports actifs;
- le statut de la facture;
- les destinataires;
- les envois déjà effectués.

Toute divergence bloque l'envoi ordinaire jusqu'à une correction ou une régénération.

## SC-REM-010 — Conserver une erreur d'envoi sans perdre l'approbation

**Étant donné** une relance approuvée,

**quand** l'envoi échoue pour une raison technique,

**alors** :

- l'erreur est enregistrée;
- la relance passe à `ERREUR_ENVOI`;
- aucun succès de livraison n'est simulé;
- la responsable peut corriger le problème et réessayer;
- l'application revalide les données avant le nouvel essai.

## Points à préciser

- rôles autorisés à approuver;
- approbation et envoi en une action ou en deux actions;
- modèle exact de la première relance;
- calendrier des relances suivantes;
- traitement des appels téléphoniques et autres communications.
