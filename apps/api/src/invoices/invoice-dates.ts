/**
 * Minuit UTC du jour courant. Les dates d'échéance sont stockées à minuit UTC
 * (le formulaire envoie une date « AAAA-MM-JJ » → `new Date` = minuit UTC), donc
 * comparer `dueDate < startOfTodayUtc()` revient à comparer des JOURS calendaires :
 * une facture n'est « en retard » que le lendemain de son échéance (pas le jour
 * même, ni la veille au soir comme avec une comparaison à l'instant présent).
 */
export function startOfTodayUtc(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}
