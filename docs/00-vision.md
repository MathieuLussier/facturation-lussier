# Vision du produit

## Mission

Facturation Lussier doit devenir le système opérationnel de Transport Lussier et Fils, du call reçu par SMS jusqu'au paiement de la facture.

Le produit ne se limite pas à produire des factures. Il doit réunir les informations aujourd'hui dispersées entre SMS, bons papier, billets de carrière, appels, fichiers numérisés, courriels et Odoo.

## Problèmes actuels

- les calls arrivent principalement par SMS;
- les détails doivent être relus et mémorisés manuellement;
- chaque camion utilise son propre carnet de bons papier;
- les données des bons sont ressaisies au bureau;
- les bons doivent être numérisés et associés à la bonne facture;
- les factures et pièces jointes sont envoyées manuellement;
- les relances exigent plusieurs appels ou courriels;
- certains clients exigent une copie physique.

## Résultat cible

1. Un SMS est partagé vers l'application.
2. Les champs du call sont extraits et validés.
3. Un ou plusieurs camions sont affectés.
4. Chaque camion produit son propre bon.
5. Les documents sont regroupés dans un dossier de chantier.
6. La responsable vérifie les informations.
7. La facture hebdomadaire est générée.
8. Le dossier peut être imprimé, envoyé par courriel, ou les deux.
9. Les échéances sont suivies.
10. Les relances sont préparées, mais envoyées seulement après validation humaine.

## Principes de conception

### Validation humaine

L'automatisation prépare et suggère. Elle ne finalise pas une facture, n'envoie pas un courriel et ne lance pas une relance sans confirmation.

### Traçabilité

Chaque ligne de facture doit pouvoir être reliée au bon, au camion, au chauffeur, au projet, au tarif appliqué et aux documents justificatifs.

### Papier et numérique

Le numérique ne supprime pas le papier lorsque le client l'exige. Un dossier complet doit pouvoir être imprimé en une action.

### Évolution graduelle

Le produit doit d'abord compléter le processus existant, puis remplacer progressivement la ressaisie et les bons papier.

## Hors périmètre initial

- calcul automatique de la surcharge carburant à partir d'un indice externe;
- rapprochement bancaire complet;
- comptabilité générale complète;
- remplacement immédiat d'Odoo;
- décisions automatiques non validées par un humain.
