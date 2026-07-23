# Virements Interac reçus par courriel

## Objet

Ce document décrit le cas où un client paie par virement Interac et où les renseignements utiles apparaissent directement dans le courriel, sans avis PDF séparé.

L'exemple de production analysé n'est pas versionné. Les noms, montants, références, dates et renseignements financiers sont remplacés par des exemples génériques.

## Format observé

Le courriel observé contient notamment :

- le nom de l'expéditeur ou payeur;
- le montant annoncé du virement;
- la devise;
- la date d'envoi;
- un numéro de référence Interac;
- une date d'expiration;
- un message libre contenant une référence de facture;
- une action permettant au destinataire de choisir son institution financière et de déposer les fonds.

Exemple anonymisé :

```text
Montant : 2 250,00 $ CAD
Message : Facture 2026/06/000X
Date d'envoi : 8 juillet 2026
Référence : ABC12345
Expiration : 6 août 2026
```

## Deux modes d'encaissement confirmés

Le fonctionnement varie selon le client. Deux modes sont utilisés dans la pratique :

### Acceptation manuelle

Le courriel annonce que les fonds sont disponibles, mais la responsable doit choisir son institution financière et accepter le virement.

Tant que cette action n'est pas effectuée et confirmée :

- la source demeure `A_ENCAISSER`;
- aucun paiement définitif n'est créé;
- aucune facture ne devient `PAYEE`;
- la date réelle d'encaissement reste vide.

### Dépôt automatique

Pour certains clients, le virement est déposé automatiquement dans le compte configuré. Aucune action d'acceptation n'est normalement requise.

La réception du courriel peut alors être une notification de dépôt automatique, mais elle ne doit toujours pas modifier silencieusement les factures. La source passe dans un état comme `DEPOT_AUTOMATIQUE_A_CONFIRMER` jusqu'à ce que la responsable confirme :

- que les fonds sont réellement reçus;
- la date comptable à utiliser;
- la ou les factures concernées;
- les montants affectés.

Le mode peut avoir une valeur habituelle par client ou profil de facturation, mais il doit aussi être enregistré pour chaque virement. Une valeur par défaut ne remplace jamais l'information du message courant ni la validation humaine.

## Distinction essentielle : virement annoncé et fonds reçus

La réception d'un courriel Interac ne constitue jamais, à elle seule, une autorisation suffisante pour marquer une facture payée.

Le système doit distinguer :

- `receivedAt` — réception du courriel;
- `sentAt` — date annoncée du virement;
- `expiresAt` — échéance du virement lorsqu'elle existe;
- `acceptedAt` — action d'acceptation manuelle, lorsqu'elle existe;
- `depositedAt` — moment où le dépôt est considéré effectué;
- `paidAt` — date comptable retenue comme réception réelle du paiement;
- `recordedAt` — moment où la responsable confirme l'opération dans l'application.

Pour un dépôt automatique, `acceptedAt` reste vide. Pour un virement manuel, `acceptedAt` peut être conservé séparément de `paidAt` si l'argent n'est pas considéré reçu au même moment.

Une facture ne devient jamais `PAYEE` uniquement parce que le courriel Interac a été reçu.

## Type de source et mode de paiement

Valeurs proposées :

```text
PaymentSource.type = INTERAC_EMAIL
Payment.method = VIREMENT_INTERAC
InteracMetadata.depositMode = MANUAL_ACCEPTANCE | AUTO_DEPOSIT | UNKNOWN
```

Le courriel est une source de paiement. Le paiement réel est créé ou finalisé après confirmation humaine de l'encaissement.

## Parcours cible commun

1. La responsable reçoit le courriel Interac.
2. Elle ouvre **Enregistrer un dépôt**.
3. Elle importe ou sélectionne le courriel, ou saisit les renseignements manuellement.
4. L'application propose :
   - le payeur;
   - le montant;
   - la devise;
   - la date d'envoi;
   - la référence du virement;
   - la date d'expiration;
   - le message;
   - la ou les références de facture détectées;
   - le mode d'encaissement probable.
5. L'application recherche les factures correspondantes.
6. La responsable confirme le mode réel : acceptation manuelle ou dépôt automatique.
7. Le parcours se poursuit selon ce mode.

### Branche — acceptation manuelle

1. La source reste `A_ENCAISSER`.
2. La responsable accepte le virement dans son environnement bancaire habituel.
3. Elle revient confirmer la réception réelle et sa date.
4. L'application crée ou finalise un `Payment` et ses `PaymentAllocation`.
5. La source passe à `ENCAISSE`.

### Branche — dépôt automatique

1. La source passe à `DEPOT_AUTOMATIQUE_A_CONFIRMER`.
2. Aucune action d'acceptation bancaire n'est demandée dans Facturation Lussier.
3. La responsable confirme que le dépôt a réellement été reçu et indique la date comptable.
4. L'application crée ou finalise un `Payment` et ses `PaymentAllocation`.
5. La source passe à `ENCAISSE`.

Dans les deux cas, chaque facture est mise à jour selon le montant affecté et son solde restant.

## Référence de facture dans le message

L'exemple observé contient une référence sous la forme :

```text
Facture 2026/06/000X
```

La référence officielle interne peut toutefois être formatée différemment, par exemple :

```text
FAC/2026/06/000X
```

Le rapprochement doit donc normaliser les références sans les modifier dans la source originale. Il peut notamment :

- ignorer le mot `Facture`;
- reconnaître un préfixe `FAC/` facultatif;
- uniformiser les espaces, tirets et barres obliques;
- comparer l'année, le mois et la séquence;
- présenter la correspondance comme une proposition à confirmer.

Le texte original du message doit rester conservé pour l'audit.

## Paiement partiel

Le montant Interac peut être inférieur au solde de la facture.

Dans ce cas :

- le virement demeure un paiement valide;
- une `PaymentAllocation` est créée pour le montant reçu;
- le solde restant est conservé;
- la facture devient `PARTIELLEMENT_PAYEE`, ou expose cet état à partir de son solde;
- les relances futures portent uniquement sur le solde restant;
- la facture passe à `PAYEE` seulement lorsque son solde atteint zéro.

## États proposés pour la source Interac

- `RECU`
- `EXTRAIT`
- `A_VALIDER`
- `A_ENCAISSER`
- `DEPOT_AUTOMATIQUE_A_CONFIRMER`
- `ENCAISSE`
- `EXPIRE`
- `ANNULE`
- `ECART_A_TRAITER`

`A_ENCAISSER` signifie qu'une acceptation manuelle est encore nécessaire.

`DEPOT_AUTOMATIQUE_A_CONFIRMER` signifie qu'aucune acceptation n'est attendue, mais que la réception réelle et le rapprochement n'ont pas encore été confirmés dans l'application.

## Données propres au virement Interac

À conserver dans les métadonnées structurées de la source :

- nom de l'expéditeur;
- montant annoncé;
- devise;
- date d'envoi;
- date d'expiration;
- numéro de référence;
- message libre;
- références de facture proposées;
- mode d'encaissement : manuel, automatique ou inconnu;
- statut d'encaissement;
- date d'acceptation manuelle facultative;
- date de dépôt confirmée;
- utilisateur ayant confirmé;
- horodatage de la confirmation.

## Valeur habituelle par client

Puisque le mode dépend des clients, le système peut mémoriser une préférence facultative sur le client ou son profil de facturation :

```text
preferredInteracDepositMode = MANUAL_ACCEPTANCE | AUTO_DEPOSIT | UNKNOWN
```

Cette préférence sert uniquement à préremplir le prochain rapprochement. La responsable peut la modifier pour un virement précis si le courriel indique un autre fonctionnement.

## Sécurité

Facturation Lussier ne doit jamais :

- ouvrir automatiquement le lien bancaire;
- demander, stocker ou transmettre les identifiants bancaires de l'utilisateur;
- accepter automatiquement un virement;
- marquer automatiquement une facture payée à la réception du courriel;
- considérer le nom affiché dans le courriel comme une preuve suffisante d'identité.

L'application peut analyser le contenu reçu et préparer le rapprochement, mais le dépôt ou sa confirmation se fait dans le parcours bancaire habituel et la confirmation finale reste humaine.

## Contrôles proposés

Avant de finaliser :

- confirmer le montant et la devise;
- confirmer la référence du virement;
- confirmer le mode d'encaissement;
- confirmer la ou les factures proposées;
- comparer le montant au solde de chaque facture;
- signaler une référence inconnue ou ambiguë;
- signaler une date d'expiration dépassée pour un virement manuel;
- demander la date réelle de réception des fonds;
- empêcher la création d'un doublon pour la même référence Interac;
- conserver le courriel ou sa référence dans un stockage privé.

## Points à confirmer

- Le même client utilise-t-il toujours le même mode, ou peut-il alterner entre acceptation manuelle et dépôt automatique?
- Pour un dépôt automatique, comment la responsable confirme-t-elle que les fonds sont réellement reçus : courriel, relevé bancaire ou consultation du compte?
- À quel moment `paidAt` est-il fixé pour chacun des deux modes?
- Un virement Interac peut-il couvrir plusieurs factures dans votre pratique?
- Que se passe-t-il lorsqu'un virement manuel expire avant d'être déposé?
- Le courriel complet doit-il être conservé, ou une copie structurée et sa référence suffisent-elles?
