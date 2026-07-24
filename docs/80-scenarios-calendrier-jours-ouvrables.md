# Scénarios d'acceptation — calendrier des jours ouvrables

## SC-CAL-001 — Utiliser le calendrier québécois par défaut

**Étant donné** qu'aucun calendrier particulier n'est sélectionné,

**quand** l'application calcule l'échéance effective d'un report,

**alors** elle utilise le calendrier actif de l'entreprise basé sur la région `CA-QC`, le fuseau `America/Toronto` et les samedis et dimanches comme jours non ouvrables.

Le calendrier utilisé et sa version sont conservés dans l'historique du report.

## SC-CAL-002 — Traverser un jour férié québécois configuré

**Étant donné** qu'une échéance brute tombe un jour férié actif dans le calendrier québécois,

**quand** l'application cherche la date effective,

**alors** elle avance jusqu'au prochain jour ouvrable.

La date brute, la date effective, le libellé du jour férié et la version du calendrier demeurent auditables.

## SC-CAL-003 — Ajouter une fermeture propre à l'entreprise

**Étant donné** que l'entreprise prévoit une journée de fermeture qui n'est pas un jour férié public,

**quand** une personne autorisée ajoute cette date dans **Calendrier de l'entreprise**,

**alors** :

- la date devient non ouvrable pour les futurs calculs;
- un libellé et l'utilisateur ayant créé la fermeture sont conservés;
- les échéances déjà confirmées ne sont pas recalculées;
- les nouvelles échéances traversent cette date.

## SC-CAL-004 — Ajouter une période de fermeture

**Étant donné** que l'entreprise ferme plusieurs jours consécutifs,

**quand** une période de fermeture est enregistrée,

**alors** chaque date de la période est considérée non ouvrable.

Une échéance brute située avant ou dans cette période est déplacée jusqu'au premier jour ouvrable suivant la fin de la fermeture.

## SC-CAL-005 — Traverser une fin de semaine, un jour férié et une fermeture

**Étant donné** qu'une date brute tombe un samedi,

**et** que le lundi suivant est un jour férié,

**et** que le mardi est une fermeture interne,

**quand** l'application calcule la date effective,

**alors** elle déplace l'échéance au mercredi, s'il est ouvrable.

L'historique montre séparément les jours traversés et leur raison : `WEEKEND`, `QUEBEC_PUBLIC_HOLIDAY` et `COMPANY_CLOSURE`.

## SC-CAL-006 — Ne pas recalculer une échéance historique

**Étant donné** qu'un report a été communiqué avec une date effective confirmée,

**quand** un administrateur ajoute plus tard une fermeture qui aurait affecté ce calcul,

**alors** le report existant conserve sa date effective originale.

La nouvelle fermeture s'applique uniquement aux calculs futurs, sauf création explicite d'un nouveau report communiqué au client.

## SC-CAL-007 — Prévisualiser une date déplacée

**Étant donné** que la date brute diffère de la date effective,

**quand** la responsable prépare le courriel de report,

**alors** l'application affiche avant l'envoi :

- la date de départ;
- le nombre de jours calendaires;
- la date brute;
- les journées non ouvrables traversées;
- la date effective communiquée au client.

La responsable confirme le courriel en connaissant la date réellement utilisée.

## SC-CAL-008 — Annuler une fermeture future

**Étant donné** qu'une fermeture interne future a été créée par erreur,

**quand** une personne autorisée l'annule,

**alors** :

- l'annulation est auditée;
- la date redevient ouvrable pour les calculs futurs si aucune autre règle ne la ferme;
- les échéances déjà confirmées ne changent pas;
- l'historique conserve l'entrée annulée.

## SC-CAL-009 — Gérer le changement d'année

**Étant donné** qu'un report traverse la fin d'une année,

**quand** l'application cherche le prochain jour ouvrable,

**alors** le calendrier de l'année suivante doit être actif et disponible.

Si le calendrier requis n'est pas validé, l'application bloque la confirmation définitive du report ou exige une validation explicite par une personne autorisée.

## SC-CAL-010 — Utiliser le fuseau horaire de l'entreprise

**Étant donné** qu'un courriel est envoyé près de minuit,

**quand** l'application détermine la date civile de départ du délai,

**alors** elle utilise le fuseau horaire `America/Toronto` du calendrier d'entreprise.

L'horodatage complet de l'envoi demeure conservé afin d'éviter qu'un déploiement dans un autre fuseau change le résultat.