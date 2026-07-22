# Questions ouvertes

Ces questions doivent être résolues avant de figer les exigences détaillées. Les faits confirmés sont rappelés pour éviter de les redemander.

## Paiements

Confirmé :

- le mode observé est le dépôt direct;
- une information de dépôt est généralement reçue après le paiement;
- tous les clients ne fournissent pas un PDF;
- le parcours **Enregistrer un dépôt** doit donc fonctionner avec ou sans fichier;
- une source peut être un PDF, du texte de courriel, une image, une autre pièce ou une saisie manuelle;
- l'information reçue peut indiquer les numéros des factures payées;
- un même dépôt peut régler plusieurs factures;
- plusieurs numéros de facture peuvent figurer dans la même information;
- le format PDF réel analysé affiche le montant total du dépôt;
- il affiche également un montant pour chaque facture;
- chaque ligne contient une référence et une date de facture, un montant, une retenue, un escompte et un montant payé;
- dans l'exemple analysé, les retenues et les escomptes valent zéro et chaque facture est payée intégralement;
- selon l'expérience actuelle, les retenues et escomptes observés ont toujours été à zéro;
- un client peut toutefois effectuer un paiement partiel sur une facture;
- la date de l'avis et la date réelle d'encaissement doivent rester distinctes lorsqu'un avis existe;
- la responsable utilise déjà un bouton pour marquer une facture payée et saisir la date réelle du paiement;
- le système cible doit conserver un paiement unique et ses affectations aux différentes factures;
- une facture ne doit devenir `PAYEE` que lorsque son solde atteint zéro;
- une même facture peut recevoir plusieurs paiements successifs.

À confirmer :

- quels formats précis sont utilisés par les clients qui ne fournissent pas de PDF;
- ces clients donnent-ils le montant total et un montant par facture dans le texte du courriel;
- la date réelle utilisée vient-elle du relevé bancaire, du courriel ou d'une autre confirmation;
- après un paiement partiel, quand faut-il relancer le solde restant;
- quel texte utiliser pour une relance après paiement partiel;
- faut-il permettre à la responsable de reporter manuellement la prochaine relance;
- comment gérer un dépôt en trop, annulé ou attribué à la mauvaise facture;
- comment gérer un dépôt annoncé qui n'apparaît pas après le délai indiqué;
- faut-il conserver le courriel complet, son texte, ses pièces jointes ou seulement une référence dans l'application;
- les retenues ou escomptes peuvent-ils un jour être réellement utilisés avec une valeur non nulle.

## Spécimen de chèque

Confirmé :

- le spécimen sert à transmettre les coordonnées de dépôt direct;
- il peut être joint aux courriels de facture;
- son stockage doit être privé;
- sa présence doit être visible avant l'envoi;
- le système doit permettre une politique configurable.

À confirmer :

- politique par défaut : chaque facture ou premier envoi seulement;
- faut-il appliquer une exception à certains clients ou projets;
- confirmer que les relances ne doivent jamais le joindre automatiquement;
- qui peut remplacer la version active du spécimen.

## Courriels

- Combien de destinataires une facture peut-elle avoir?
- Les copies conformes sont-elles fréquentes?
- Le courriel dépend-il du client, du projet ou de la facture?
- Quels documents doivent toujours être joints?
- Quel texte est utilisé aujourd'hui?

## Remise des bons

Confirmé :

- les chauffeurs remettent les bons et billets papier à la responsable le vendredi, à la fin de la semaine.

À confirmer :

- où les documents sont-ils conservés par chaque chauffeur avant le vendredi;
- qui vérifie qu'aucun bon ne manque;
- que se passe-t-il lorsqu'un bon ne peut pas être remis le vendredi;
- la facturation commence-t-elle le vendredi, la fin de semaine ou la semaine suivante;
- faut-il enregistrer un lot de remise par chauffeur et par semaine.

## Exceptions terrain

- Que faire lorsque personne ne veut ou ne peut signer?
- Que faire lorsqu'un bon est perdu ou endommagé?
- Un chauffeur peut-il changer de camion pendant une journée?
- Un camion peut-il travailler sur plusieurs calls dans la même journée?
- Un call peut-il être modifié après le début du travail?
- Comment gérer une annulation ou un déplacement inutile?
- Comment facturer l'attente, les péages ou les minimums?

## Tarifs

- Existe-t-il plusieurs tarifs pour un même projet selon le camion ou le service?
- Les heures supplémentaires, nuits et fins de semaine changent-elles le prix?
- Existe-t-il un minimum d'heures?
- Comment les arrondis sont-ils appliqués?
- Quelle est la source officielle de la surcharge carburant?

## Facturation

- La semaine de facturation va-t-elle du lundi au dimanche?
- Peut-on inclure plusieurs semaines sur une facture?
- Un bon peut-il être réparti entre deux factures?
- Peut-on corriger une facture envoyée par note de crédit?
- Quels clients exigent une copie papier?
- Les factures papier sont-elles postées, remises ou conservées?

## Projets saisonniers

- Comment fonctionne un contrat direct de déneigement saisonnier?
- Est-ce facturé à l'heure, au passage, à la sortie ou au forfait?
- Y a-t-il des feuilles ou preuves différentes?
- Le même projet revient-il chaque saison?

## Sécurité et permissions

- Les chauffeurs voient-ils uniquement leurs affectations?
- Peuvent-ils corriger un bon après signature?
- Qui peut modifier un tarif?
- Qui peut finaliser, annuler ou marquer payée une facture?
- Qui peut enregistrer, corriger ou annuler un paiement?
- Quelle durée de conservation est requise pour les documents?
