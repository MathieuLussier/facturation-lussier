# Scénarios d'acceptation — virements Interac

Ces scénarios complètent [`80-scenarios-paiements.md`](80-scenarios-paiements.md). Les exemples sont anonymisés.

## SC-INT-001 — Extraire un virement Interac reçu par courriel

**Étant donné** un courriel Interac contenant un expéditeur, un montant, une devise, une date, une référence, une échéance et un message de facture,

**quand** la responsable l'importe ou le sélectionne dans **Enregistrer un dépôt**,

**alors** l'application propose ces valeurs sans créer de paiement définitif.

La source est créée avec le type `INTERAC_EMAIL` et conserve le contenu original ou une référence privée vers celui-ci.

## SC-INT-002 — Ne pas marquer la facture payée à la réception du courriel

**Étant donné** qu'un courriel annonce que les fonds sont disponibles, mais exige encore une action de dépôt,

**quand** le courriel est reçu,

**alors** :

- la source passe à `A_ENCAISSER`;
- aucune facture ne passe à `PAYEE`;
- aucun `PaymentAllocation` définitif n'est créé;
- la responsable voit que le dépôt doit encore être confirmé.

## SC-INT-003 — Rapprocher une référence abrégée

**Étant donné** que le message contient :

```text
Facture 2026/06/000X
```

et que la référence officielle est :

```text
FAC/2026/06/000X
```

**quand** l'application recherche une facture correspondante,

**alors** elle propose la facture après normalisation du préfixe et des séparateurs.

La valeur originale reste visible, et la responsable doit confirmer la correspondance.

## SC-INT-004 — Confirmer l'encaissement d'un virement Interac

**Étant donné** une source Interac en état `A_ENCAISSER`,

**quand** la responsable confirme que les fonds ont été déposés et saisit la date réelle de réception,

**alors** :

- un `Payment` de méthode `VIREMENT_INTERAC` est créé ou finalisé;
- la référence du virement est conservée;
- une ou plusieurs `PaymentAllocation` sont créées;
- la source passe à `ENCAISSE`;
- chaque facture est mise à jour selon son solde.

## SC-INT-005 — Enregistrer un virement Interac partiel

**Étant donné** une facture dont le solde est supérieur au montant du virement,

**quand** le virement est encaissé et affecté à cette facture,

**alors** :

- l'affectation est valide;
- la facture ne passe pas à `PAYEE`;
- le solde restant demeure visible;
- l'état `PARTIELLEMENT_PAYEE` est affiché ou dérivé;
- les relances futures portent sur le solde restant.

## SC-INT-006 — Signaler un virement expiré

**Étant donné** une source Interac non encaissée dont la date d'expiration est dépassée,

**quand** l'application vérifie son état,

**alors** elle la signale comme `EXPIRE` ou **À vérifier**.

Elle ne crée aucun paiement et n'altère aucune facture.

La responsable peut documenter un nouvel envoi, une annulation ou une autre méthode de paiement.

## SC-INT-007 — Empêcher un doublon

**Étant donné** qu'un virement Interac possède la même référence, le même expéditeur et le même montant qu'une source déjà enregistrée,

**quand** la responsable tente de l'importer de nouveau,

**alors** l'application affiche un avertissement de doublon et exige une décision explicite.

Elle ne crée pas automatiquement une seconde transaction financière.

## SC-INT-008 — Ne jamais ouvrir automatiquement le lien bancaire

**Étant donné** qu'un courriel Interac contient une action permettant de choisir une institution financière,

**quand** l'application analyse le message,

**alors** :

- elle n'ouvre pas automatiquement le lien;
- elle ne demande aucun identifiant bancaire;
- elle n'automatise pas le dépôt;
- elle limite son rôle à l'extraction, au suivi et au rapprochement.

## SC-INT-009 — Saisir manuellement un Interac sans connexion courriel

**Étant donné** que Facturation Lussier n'est pas connecté à la boîte de réception,

**quand** la responsable choisit **Enregistrer un dépôt — Virement Interac**,

**alors** elle peut saisir manuellement :

- l'expéditeur;
- le montant;
- la devise;
- la date d'envoi;
- la référence;
- l'échéance;
- le message;
- la facture proposée;
- la date réelle de dépôt lorsqu'elle est connue.

La saisie manuelle conserve l'utilisateur et l'horodatage.
