# Calendrier des jours ouvrables

## Décision métier confirmée

Le calendrier utilisé pour ajuster les échéances doit être basé par défaut sur les jours fériés applicables au Québec.

Transport Lussier et Fils doit également pouvoir ajouter ses propres journées de fermeture. Ces fermetures internes sont considérées comme non ouvrables même lorsqu'elles ne correspondent pas à un jour férié public.

Ce calendrier sert notamment à déplacer une échéance brute au prochain jour ouvrable. Il ne transforme pas les délais de 15, 30, 45 ou 60 jours en jours ouvrables : le délai demeure calculé en jours calendaires, puis la date obtenue est ajustée seulement si elle est non ouvrable.

## Règle de calcul

```text
rawDueDate = addCalendarDays(extensionEmailSentAt, extensionTermDays)
effectiveDueDate = moveToNextBusinessDay(rawDueDate, businessCalendar)
```

Un jour est ouvrable lorsqu'il :

- n'est ni un samedi ni un dimanche;
- n'est pas un jour férié actif dans le calendrier québécois configuré;
- n'est pas une journée de fermeture ajoutée par l'entreprise.

L'algorithme avance d'une journée à la fois jusqu'à trouver une date ouvrable.

## Configuration par défaut

Valeurs proposées :

```text
code = QUEBEC_STANDARD
timezone = America/Toronto
weekendDays = SATURDAY, SUNDAY
region = CA-QC
```

Le calendrier québécois doit être maintenu par année et rester configurable. La liste des jours fériés ne doit pas être dispersée ou codée en dur dans plusieurs parties de l'application.

L'administrateur doit pouvoir vérifier le calendrier d'une année avant qu'il soit utilisé pour les échéances.

## Fermetures propres à l'entreprise

L'entreprise peut ajouter une fermeture pour :

- une journée complète;
- plusieurs journées consécutives;
- une fermeture exceptionnelle;
- les vacances annuelles;
- une journée administrative;
- toute autre raison interne.

Une fermeture personnalisée doit contenir au minimum :

- une date de début;
- une date de fin;
- un libellé;
- une note facultative;
- l'utilisateur ayant créé l'entrée;
- la date et l'heure de création;
- son statut actif ou annulé.

Exemple :

```text
Du 24 décembre 2026 au 4 janvier 2027
Type : COMPANY_CLOSURE
Libellé : Fermeture des Fêtes
```

## Types de journées spéciales

Valeurs proposées :

```text
QUEBEC_PUBLIC_HOLIDAY
COMPANY_CLOSURE
MANUAL_NON_WORKING_DAY
MANUAL_WORKING_DAY
```

`MANUAL_WORKING_DAY` est une exception facultative permettant de déclarer ouvrable une date normalement fermée. Son utilisation doit être limitée aux personnes autorisées et rester auditée.

Ordre de résolution proposé :

1. exception manuelle explicite pour une date;
2. fermeture propre à l'entreprise;
3. jour férié du calendrier québécois;
4. fin de semaine;
5. jour ouvrable normal.

## Versionnement et historique

Une modification future du calendrier ne doit jamais changer rétroactivement une échéance déjà confirmée.

Lorsqu'un report est activé, le système conserve :

- le calendrier utilisé;
- sa version ou son année;
- la date brute;
- la date effective;
- les journées non ouvrables traversées;
- la raison de chaque déplacement;
- l'utilisateur ayant confirmé le report.

Exemple :

```text
Date brute : dimanche 9 août 2026
Jours traversés :
- 9 août — WEEKEND
Date effective : lundi 10 août 2026
Calendrier : QUEBEC_STANDARD / 2026
```

Lorsqu'une fermeture est ajoutée après la confirmation d'un report, elle s'applique aux futurs calculs seulement. Le report existant conserve les dates déjà communiquées au client.

## Modèle proposé

### BusinessCalendar

- `id`;
- `code`;
- `name`;
- `region`;
- `timezone`;
- `weekendDays`;
- `year`;
- `version`;
- `status`;
- `createdAt`;
- `updatedAt`.

Statuts suggérés :

- `DRAFT`;
- `ACTIVE`;
- `ARCHIVED`.

### BusinessCalendarDay

- `id`;
- `calendarId`;
- `date`;
- `type`;
- `label`;
- `isBusinessDay`;
- `source`;
- `note` facultative;
- `createdById`;
- `createdAt`;
- `cancelledAt` facultative.

### Éléments figés sur un report

`PaymentDeadlineExtension` conserve ou référence :

- `businessCalendarId`;
- `businessCalendarVersion`;
- `rawDueDate`;
- `newDueDate`;
- `adjustmentReason`;
- `calendarEvaluationSnapshot` facultatif.

## Interface d'administration

L'écran **Calendrier de l'entreprise** devrait permettre :

- de consulter les jours fériés québécois par année;
- de visualiser les samedis et dimanches;
- d'ajouter une journée ou une période de fermeture;
- de modifier ou annuler une fermeture future;
- de voir les échéances futures potentiellement touchées;
- d'activer le calendrier de l'année suivante;
- de consulter l'historique des modifications.

La modification d'une fermeture déjà utilisée par une échéance confirmée doit afficher un avertissement indiquant que les anciennes échéances ne seront pas recalculées.

## Contrôles

- Une période de fermeture doit avoir une date de fin égale ou postérieure à sa date de début.
- Deux entrées peuvent se chevaucher, mais l'interface doit les signaler afin d'éviter les doublons inutiles.
- Un calendrier doit être actif pour l'année d'une échéance avant la confirmation du report.
- Le fuseau horaire doit être appliqué avant de déterminer la date civile de l'envoi du courriel.
- Le système doit toujours afficher la date brute et la date effective lorsqu'elles diffèrent.
- Une modification de calendrier doit être auditée.

## Portée initiale

Pour le MVP :

- calendrier par défaut du Québec;
- fins de semaine non ouvrables;
- ajout manuel de fermetures internes;
- déplacement au prochain jour ouvrable;
- conservation de la date brute et de la date effective;
- absence de recalcul rétroactif.

Une intégration future à une source externe de calendriers peut être envisagée, mais elle ne doit pas remplacer la validation et le contrôle de l'entreprise.