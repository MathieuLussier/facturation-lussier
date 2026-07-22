# Surcharge carburant

## Décision actuelle

La surcharge carburant est calculée par semaine. Son mode de détermination externe n'est pas encore compris et ne doit pas être automatisé dans le MVP.

La responsable saisit manuellement un pourcentage sur la facture hebdomadaire.

## Calcul

Pour chaque ligne horaire :

```text
tarif effectif = tarif de base × (1 + surcharge / 100)
montant de ligne = tarif effectif × heures
```

Exemple :

```text
Tarif de base : 140,00 $/h
Surcharge : 6 %
Tarif effectif : 148,40 $/h
Heures : 9,50
Montant avant taxes : 1 409,80 $
```

La TPS et la TVQ sont calculées sur le montant obtenu après application de la surcharge.

## Portée

- une valeur de surcharge est saisie au niveau de la facture;
- elle représente la surcharge applicable à la semaine facturée;
- elle s'applique aux lignes horaires admissibles;
- si la valeur est absente ou égale à zéro, aucune surcharge n'est appliquée;
- le tarif de base du projet n'est jamais modifié par cette saisie.

## Présentation au client

Lorsqu'une surcharge est appliquée, elle doit être visible sur la facture. La présentation doit permettre au client de comprendre :

- le tarif de base;
- le pourcentage de surcharge;
- le tarif effectif utilisé;
- les heures;
- le montant calculé.

Exemple de ligne :

```text
Service de 12 roues — bon 131493
Tarif de base 140,00 $/h + surcharge carburant 6,00 %
9,50 h × 148,40 $/h = 1 409,80 $
```

Il n'est pas nécessaire d'afficher une ligne monétaire de surcharge distincte si le détail ci-dessus est clairement visible. La décision d'affichage final devra être validée par la responsable sur une maquette de facture.

## Historique

À la finalisation, conserver :

- tarif de base de chaque ligne;
- pourcentage saisi;
- tarif effectif;
- montant avant taxes;
- utilisateur ayant saisi la surcharge;
- date et heure;
- note facultative sur la période ou la source.

Une modification future du tarif du projet ne doit jamais modifier une facture finalisée.

## Point ouvert

La source officielle et la méthode contractuelle de détermination du pourcentage restent à documenter après consultation d'autres chauffeurs, contrats ou clients.
