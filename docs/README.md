# Documentation fonctionnelle — Facturation Lussier

Cette documentation décrit le métier réel de Transport Lussier et Fils et sert de référence pour la conception du produit.

Le code explique comment l'application fonctionne. Ce dossier explique **pourquoi** elle doit fonctionner ainsi, quelles règles métier elle doit respecter et quelles décisions restent à valider.

## Principes

- documenter le métier avant les écrans;
- conserver une validation humaine pour les actions sensibles;
- éviter la ressaisie;
- préserver les preuves terrain et l'historique;
- soutenir un flux hybride numérique et papier;
- ne pas remplacer immédiatement les habitudes qui fonctionnent;
- distinguer clairement une règle confirmée d'une hypothèse ou d'un point ouvert.

## Structure

- [`00-vision.md`](00-vision.md) — vision, objectifs et périmètre;
- [`01-glossaire.md`](01-glossaire.md) — vocabulaire métier;
- [`02-acteurs.md`](02-acteurs.md) — utilisateurs et responsabilités;
- [`10-calls/workflow.md`](10-calls/workflow.md) — réception et traitement des calls;
- [`20-operations/bons-de-travail.md`](20-operations/bons-de-travail.md) — opérations terrain, remise hebdomadaire et bons;
- [`30-facturation/workflow.md`](30-facturation/workflow.md) — facturation, impression et envoi;
- [`30-facturation/surcharge-carburant.md`](30-facturation/surcharge-carburant.md) — calcul hebdomadaire de surcharge;
- [`30-facturation/paiements.md`](30-facturation/paiements.md) — spécimen de chèque, dépôt direct et avis de dépôt;
- [`40-regles-metier.md`](40-regles-metier.md) — règles métier numérotées;
- [`50-modele-domaine.md`](50-modele-domaine.md) — modèle conceptuel proposé;
- [`60-roadmap.md`](60-roadmap.md) — phases de livraison;
- [`70-decisions-architecture.md`](70-decisions-architecture.md) — décisions fonctionnelles structurantes;
- [`80-scenarios-acceptation.md`](80-scenarios-acceptation.md) — scénarios métier et futurs critères de test;
- [`90-questions-ouvertes.md`](90-questions-ouvertes.md) — éléments à confirmer.

## Gouvernance

1. Une règle métier confirmée reçoit un identifiant stable `RM-XXX`.
2. Une décision structurante doit être documentée avant son implémentation.
3. Une hypothèse ne doit pas être transformée silencieusement en exigence.
4. Les documents doivent évoluer dans la même pull request que le code concerné.
5. Une facture finalisée et les pièces qui la justifient doivent rester traçables.

## Confidentialité

Le dépôt est public. Les exemples de production doivent donc être anonymisés :

- aucun scan de bon signé ou de facture client ne doit être versionné;
- aucune signature, plaque réelle ou coordonnée personnelle ne doit être versionnée;
- aucun spécimen de chèque ni renseignement bancaire ne doit être versionné;
- les noms de personnes, numéros de bons et données de clients sont remplacés par des exemples génériques lorsque nécessaire.

Les documents opérationnels réels et les instructions bancaires appartiennent au stockage applicatif protégé, pas à Git.

## Statut

Version initiale issue des entrevues avec la responsable de facturation et un chauffeur-propriétaire, ainsi que de l'analyse d'un vrai SMS de call, de deux bons papier et d'une facture correspondante.

Cette version est une base de travail : les points non confirmés demeurent dans `90-questions-ouvertes.md`.
