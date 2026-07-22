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

## Distinction essentielle : virement annoncé et fonds reçus

La réception du courriel ne prouve pas encore que les fonds ont été encaissés.

Dans le format observé, la responsable doit effectuer une action auprès de son institution financière pour déposer le virement. Le système doit donc distinguer :

- `receivedAt` — réception du courriel;
- `sentAt` — date annoncée du virement;
- `expiresAt` — échéance du virement;
- `depositedAt` — moment où le virement est effectivement déposé;
- `paidAt` — date comptable retenue comme réception réelle du paiement;
- `recordedAt` — moment où la responsable confirme l'opération dans l'application.

Une facture ne devient jamais `PAYEE` uniquement parce que le courriel Interac a été reçu.

## Type de source et mode de paiement

Valeurs proposées :

```text
PaymentSource.type = INTERAC_EMAIL
Payment.method = VIREMENT_INTERAC
```

Le courriel est une source de paiement. Le paiement réel est créé ou finalisé après confirmation du dépôt.

## Parcours cible

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
   - la ou les références de facture détectées.
5. L'application recherche les factures correspondantes.
6. La source reste en état `A_ENCAISSER` tant que le dépôt n'est pas confirmé.
7. La responsable dépose les fonds en dehors de Facturation Lussier.
8. Elle revient confirmer la date réelle de réception.
9. L'application crée ou finalise un `Payment` et ses `PaymentAllocation`.
10. Chaque facture est mise à jour selon le montant affecté et son solde restant.

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
- `ENCAISSE`
- `EXPIRE`
- `ANNULE`
- `ECART_A_TRAITER`

L'état `A_ENCAISSER` signifie que le virement a été annoncé mais que la réception réelle des fonds n'a pas encore été confirmée.

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
- statut d'encaissement;
- date de dépôt confirmée;
- utilisateur ayant confirmé;
- horodatage de la confirmation.

## Sécurité

Facturation Lussier ne doit jamais :

- ouvrir automatiquement le lien bancaire;
- demander, stocker ou transmettre les identifiants bancaires de l'utilisateur;
- accepter automatiquement un virement;
- marquer automatiquement une facture payée à la réception du courriel;
- considérer le nom affiché dans le courriel comme une preuve suffisante d'identité.

L'application peut analyser le contenu reçu et préparer le rapprochement, mais le dépôt se fait dans le parcours bancaire habituel et la confirmation finale reste humaine.

## Contrôles proposés

Avant de finaliser :

- confirmer le montant et la devise;
- confirmer la référence du virement;
- confirmer la ou les factures proposées;
- comparer le montant au solde de chaque facture;
- signaler une référence inconnue ou ambiguë;
- signaler une date d'expiration dépassée;
- demander la date réelle de réception des fonds;
- empêcher la création d'un doublon pour la même référence Interac;
- conserver le courriel ou sa référence dans un stockage privé.

## Points à confirmer

- Les virements Interac sont-ils toujours déposés manuellement, ou certains utilisent-ils le dépôt automatique?
- La responsable considère-t-elle le paiement reçu à la date du dépôt dans l'institution financière ou à la date visible sur le relevé bancaire?
- Un virement Interac peut-il couvrir plusieurs factures dans votre pratique?
- Que se passe-t-il lorsqu'un virement expire avant d'être déposé?
- Le courriel complet doit-il être conservé, ou une copie structurée et sa référence suffisent-elles?
