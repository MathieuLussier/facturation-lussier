# Workflow des calls

## Origines possibles

Un call peut provenir :

- d'un broker;
- directement d'un client;
- d'un contrat récurrent ou saisonnier;
- d'une demande interne.

Le broker est une source de travail, pas l'entité facturée.

## Réception par SMS

Le scénario principal est un SMS reçu la veille. Exemple de structure observée :

- date du travail;
- entreprise ou donneur d'ouvrage;
- numéro et nom du projet;
- nombre et type de camions;
- heure de début;
- lieu de chargement;
- matériau;
- lieu de livraison;
- ville;
- contremaître et téléphone;
- obligations de sécurité;
- exigences du camion;
- texte à inscrire sur le bon.

## Partage vers l'application

Flux cible MVP :

1. Le SMS arrive dans l'application de messagerie habituelle.
2. L'utilisateur choisit **Partager**.
3. Il sélectionne **Facturation Lussier**.
4. Le texte original est importé.
5. L'application propose les champs extraits.
6. L'utilisateur corrige et confirme.
7. Le call est créé avec le SMS original conservé comme preuve.

Le copier-coller doit rester disponible comme solution de repli.

## Champs du call

- source et type de source;
- texte original;
- date et heure de réception;
- date et heure du travail;
- broker facultatif;
- client facturé;
- projet;
- lieu de chargement;
- lieu de livraison;
- matériau;
- nombre de camions demandés;
- type de camion;
- contact terrain;
- téléphone;
- instructions;
- exigences de sécurité;
- référence à inscrire sur le bon;
- statut.

## Statuts suggérés

- `RECU`
- `A_VALIDER`
- `VALIDE`
- `A_AFFECTER`
- `AFFECTE`
- `EN_COURS`
- `TERMINE`
- `PRET_A_FACTURER`
- `FACTURE`
- `ANNULE`

## Affectation des camions

Le nombre de camions disponibles est communiqué au broker. Le broker indique combien sont nécessaires et où.

Chaque camion accepté produit une affectation distincte contenant :

- chauffeur;
- camion;
- plaque;
- statut;
- instructions particulières;
- bon de travail associé.

## Règles de validation

L'extraction automatique ne doit jamais créer silencieusement un call définitif. Les champs critiques doivent être confirmés :

- date;
- heure;
- projet;
- lieux;
- nombre de camions;
- contact;
- exigences obligatoires.

Le texte original doit rester accessible en tout temps.
