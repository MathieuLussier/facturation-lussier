# Paiements et avis de dépôt

## Situation actuelle

Le mode de paiement observé est le dépôt direct dans le compte bancaire de Transport Lussier et Fils.

Lors du premier envoi de facture à un nouveau client ou profil de facturation, la responsable joint un spécimen de chèque afin de transmettre les coordonnées nécessaires au dépôt direct.

Après le paiement, un avis de dépôt est reçu par courriel. Cet avis indique les numéros des factures payées. La responsable utilise ensuite la fonction déjà présente dans l'application pour marquer chaque facture comme payée et inscrire la date réelle de réception du paiement.

## Premier envoi à un client ou projet

Flux actuel et cible :

1. La responsable prépare la première facture destinée au client ou au profil de facturation du projet.
2. L'application indique que les instructions bancaires n'ont pas encore été enregistrées comme transmises.
3. La responsable sélectionne explicitement le spécimen de chèque comme pièce jointe.
4. Elle vérifie les destinataires et déclenche l'envoi.
5. L'historique conserve la date d'envoi, le destinataire, l'utilisateur et la version du document transmis.
6. Les factures suivantes n'ajoutent pas automatiquement le spécimen, sauf demande explicite.

Le spécimen de chèque contient des renseignements sensibles. Il doit être conservé dans un stockage privé, protégé par les permissions applicatives, et ne doit jamais être versionné dans Git.

## Réception d'un paiement

Flux actuel :

1. Le client effectue un dépôt direct.
2. Un avis de dépôt arrive par courriel.
3. Le courriel fournit les numéros de factures qui ont été payées.
4. La responsable recherche ces factures dans l'application.
5. Elle clique sur **Marquer comme payée**.
6. Elle saisit ou confirme la date réelle de réception du paiement.
7. L'application passe la facture au statut `PAYEE` et arrête les relances encore prévues.

## Données à conserver

Pour chaque facture marquée payée :

- date de réception du paiement;
- mode de paiement, avec `DEPOT_DIRECT` comme valeur observée;
- utilisateur ayant enregistré le paiement;
- date et heure de l'enregistrement;
- référence d'avis de dépôt, si disponible;
- note facultative;
- lien vers l'avis ou le courriel source, si cette fonction est ajoutée plus tard.

## Validation humaine

Dans le MVP, un courriel d'avis de dépôt ne doit pas marquer automatiquement une facture comme payée.

L'application peut éventuellement :

- détecter un avis de dépôt;
- extraire les numéros de facture;
- proposer les factures correspondantes;
- signaler une référence inconnue ou déjà payée.

La responsable doit toutefois confirmer le rapprochement et la date du paiement avant toute modification de statut.

## Contrôles proposés

Avant de marquer une facture comme payée, l'application devrait :

- afficher le numéro et le montant de la facture;
- demander la date réelle du paiement;
- permettre de confirmer le mode de paiement;
- avertir si la facture est déjà payée ou annulée;
- enregistrer l'action dans l'historique;
- annuler les brouillons de relance non envoyés.

## Points à confirmer

Les éléments suivants demeurent ouverts :

- un même dépôt peut-il couvrir plusieurs factures;
- les paiements partiels existent-ils;
- l'avis de dépôt contient-il toujours le montant total;
- des retenues contractuelles peuvent-elles être appliquées;
- comment gérer une erreur, un dépôt annulé ou un montant différent de la facture.
