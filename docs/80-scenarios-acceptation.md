# Scénarios métier et critères d'acceptation

Ces scénarios serviront à concevoir les maquettes, les tests d'intégration et les tests E2E. Les données sont volontairement génériques.

## SC-001 — Importer un call partagé depuis un SMS

**Étant donné** qu'un chauffeur reçoit un SMS contenant une date, une heure, un projet, des lieux, un contact et un nombre de camions,

**quand** il partage le texte vers Facturation Lussier,

**alors** l'application :

- conserve le texte original;
- propose les champs extraits;
- signale les champs manquants ou incertains;
- exige une confirmation avant de créer le call validé;
- permet le copier-coller comme solution de repli.

## SC-002 — Affecter deux camions au même call

**Étant donné** qu'un call demande deux camions,

**quand** les deux chauffeurs et véhicules sont sélectionnés,

**alors** deux affectations distinctes sont créées sous le même call.

Chaque affectation doit pouvoir évoluer indépendamment : acceptée, en cours, terminée, annulée ou incomplète.

## SC-003 — Produire un bon distinct par camion

**Étant donné** que deux camions travaillent le même jour sur le même chantier,

**quand** le travail se termine,

**alors** chaque camion possède son propre bon avec :

- sa référence composée du camion et du numéro de bon;
- ses heures ou quantités;
- sa signature;
- ses pièces justificatives;
- son statut de vérification.

## SC-004 — Regrouper deux camions sur une facture hebdomadaire

**Étant donné** deux bons vérifiés qui concernent le même profil de facturation, le même projet, le même lieu et la même semaine,

**quand** la responsable crée la facture,

**alors** l'application propose une seule facture contenant une section ou ligne traçable par camion et par bon.

## SC-005 — Séparer des lieux différents

**Étant donné** deux bons pour le même client, mais pour des lieux de travail différents,

**quand** la responsable prépare la facturation,

**alors** le système propose des factures séparées, sauf décision explicite autorisant leur regroupement.

## SC-006 — Appliquer une surcharge carburant hebdomadaire

**Étant donné** un tarif de base de 140,00 $/h, une surcharge de 6 % et 9,50 heures,

**quand** la responsable saisit la surcharge sur la facture,

**alors** :

```text
tarif effectif = 140,00 × 1,06 = 148,40 $/h
montant avant taxes = 148,40 × 9,50 = 1 409,80 $
```

Le PDF doit rendre visibles le tarif de base, le pourcentage et le tarif effectif. Les taxes s'appliquent au montant de 1 409,80 $.

## SC-007 — Facturer sans surcharge

**Étant donné** qu'aucune surcharge ne s'applique pour la semaine,

**quand** la valeur est absente ou égale à zéro,

**alors** le tarif effectif est égal au tarif de base et aucune mention de surcharge n'est affichée sur la facture.

## SC-008 — Utiliser un profil de facturation propre au projet

**Étant donné** qu'un projet possède un nom légal, une adresse ou un contact de facturation différent de ceux du client principal,

**quand** une facture est créée pour ce projet,

**alors** le profil du projet est utilisé.

En l'absence de profil de projet, les valeurs du client sont utilisées.

## SC-009 — Imprimer un dossier client

**Étant donné** une facture finalisée avec deux bons signés et des billets,

**quand** la responsable clique sur **Imprimer le dossier client**,

**alors** elle obtient un document ou une série de documents dans l'ordre suivant :

1. facture;
2. bons signés;
3. billets de carrière;
4. autres justificatifs sélectionnés.

## SC-010 — Préparer un courriel de facture

**Étant donné** une facture prête à envoyer,

**quand** la responsable clique sur **Préparer le courriel**,

**alors** l'application prépare le destinataire, l'objet, le message et les pièces jointes, sans envoyer le courriel.

L'envoi exige une action explicite et crée une entrée d'historique.

## SC-011 — Préparer une relance

**Étant donné** une facture non payée dont l'échéance est dépassée,

**quand** la règle de relance devient applicable,

**alors** l'application crée un brouillon que la responsable peut modifier, envoyer, reporter, ignorer ou remplacer par une note d'appel téléphonique.

## SC-012 — Numériser un bon papier

**Étant donné** un bon papier rapporté au bureau,

**quand** la responsable le numérise depuis l'application de bureau,

**alors** le fichier est rattaché au bon de travail et l'application peut proposer des valeurs extraites.

Les valeurs incertaines doivent être validées avant de marquer le bon comme vérifié.

## SC-013 — Facturer au voyage ou à la tonne

**Étant donné** un travail qui n'est pas payé à l'heure,

**quand** des billets de carrière justifient les voyages ou le tonnage,

**alors** la ligne de facture utilise l'unité appropriée et reste traçable jusqu'aux billets concernés.

Le format détaillé de ces scénarios demeure à compléter pendant la découverte.
