# Bons de travail et opérations terrain

## Principe

Chaque camion remplit son propre bon, même lorsque plusieurs camions travaillent sur le même call et le même chantier.

Chaque camion possède son propre carnet papier. Le numéro seul n'est donc pas garanti unique dans tout le système. La référence fonctionnelle doit inclure au minimum la plaque et le numéro du bon.

Exemple :

```text
L 874072 / 131493
L 998726 / 748985
```

## Informations minimales

- numéro du bon;
- camion et plaque;
- chauffeur;
- date du travail;
- client ou projet indiqué sur le document;
- lieu;
- description;
- heure de début;
- pause repas;
- heure de fin;
- heures calculées;
- nombre de voyages ou tonnage, lorsque pertinent;
- unité de facturation;
- signature;
- nom du signataire, lorsque disponible;
- image numérisée ou copie numérique.

## Modes de rémunération

Le système doit soutenir :

- l'heure, environ 98 % des cas;
- le voyage;
- la tonne;
- le forfait;
- une unité exceptionnelle.

Pour un travail horaire :

```text
heures facturables = fin - début - pauses
```

Le calcul est proposé automatiquement, mais reste modifiable avant facturation.

## Signature

La signature provient d'une personne responsable et reconnue par le client. Cette personne peut varier et n'a pas besoin d'être enregistrée à l'avance.

À conserver :

- image ou tracé de signature;
- nom du signataire si connu;
- rôle si connu;
- date et heure;
- lieu;
- utilisateur ayant saisi ou numérisé le document.

## Copie client

Le client détient une copie du bon. Le numéro du bon doit donc apparaître comme référence sur la facture afin de permettre le rapprochement.

## Billets de carrière

Les travaux au voyage ou à la tonne peuvent reposer principalement sur des billets de carrière. Un dossier peut contenir plusieurs billets. Ceux-ci sont des pièces justificatives structurées, distinctes du bon de travail.

## Numérisation

Flux cible intermédiaire :

1. Le bon papier est rapporté au bureau.
2. La responsable ouvre le call, l'affectation ou le dossier.
3. Elle numérise le bon depuis l'application Electron.
4. L'application propose la plaque, le numéro, la date et les heures.
5. Les champs incertains sont signalés.
6. La responsable confirme l'association.

L'OCR assiste; il ne décide pas seul, car l'écriture au crayon peut être pâle ou ambiguë.

## États suggérés

- `BROUILLON`
- `A_SIGNER`
- `SIGNE`
- `SOUMIS`
- `A_VERIFIER`
- `VERIFIE`
- `FACTURE`
- `ANNULE`

## Avenir : bon numérique

À terme, le chauffeur devrait pouvoir saisir le travail sur téléphone, obtenir la signature et transmettre le bon immédiatement. Le flux papier doit toutefois rester disponible pour les clients ou chantiers qui l'exigent.
