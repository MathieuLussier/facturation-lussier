/** Provinces et territoires du Canada (code ISO + libellé FR). */
export const CANADA_PROVINCES: Array<{ value: string; label: string }> = [
  { value: 'QC', label: 'Québec' },
  { value: 'ON', label: 'Ontario' },
  { value: 'AB', label: 'Alberta' },
  { value: 'BC', label: 'Colombie-Britannique' },
  { value: 'MB', label: 'Manitoba' },
  { value: 'NB', label: 'Nouveau-Brunswick' },
  { value: 'NL', label: 'Terre-Neuve-et-Labrador' },
  { value: 'NS', label: 'Nouvelle-Écosse' },
  { value: 'PE', label: 'Île-du-Prince-Édouard' },
  { value: 'SK', label: 'Saskatchewan' },
  { value: 'NT', label: 'Territoires du Nord-Ouest' },
  { value: 'NU', label: 'Nunavut' },
  { value: 'YT', label: 'Yukon' },
];

/**
 * Formate un numéro de téléphone nord-américain au fil de la saisie.
 * - 10 chiffres → « (438) 889-4324 »
 * - préfixe « 1 » (indicatif pays) → « +1 (438) 889-4324 »
 * (Les indicatifs régionaux NANP ne commencent jamais par 1, donc un 1 en tête
 * est toujours l'indicatif pays.)
 */
export function formatPhone(value: string): string {
  let digits = value.replace(/\D/g, '');
  let prefix = '';
  if (digits.startsWith('1')) {
    prefix = '+1 ';
    digits = digits.slice(1);
  }
  digits = digits.slice(0, 10);
  if (digits.length === 0) return prefix.trim();
  if (digits.length < 4) return `${prefix}(${digits}`;
  if (digits.length < 7) return `${prefix}(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `${prefix}(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

/**
 * Formate un code postal canadien : majuscules + espace après le 1er bloc.
 * Ex. « j0l1h0 » → « J0L 1H0 ».
 */
export function formatPostalCode(value: string): string {
  const cleaned = value
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 6);
  if (cleaned.length <= 3) return cleaned;
  return `${cleaned.slice(0, 3)} ${cleaned.slice(3)}`;
}

/**
 * Téléphone valide : vide (champ optionnel) OU 10 chiffres, OU 11 chiffres
 * commençant par 1 (indicatif pays). Une saisie partielle est invalide.
 */
export function isValidPhone(value: string): boolean {
  const digits = value.replace(/\D/g, '');
  if (digits.length === 0) return true;
  return digits.length === 10 || (digits.length === 11 && digits.startsWith('1'));
}

/**
 * Code postal valide : vide OU format canadien A1A 1A1 (lettre-chiffre-lettre
 * chiffre-lettre-chiffre, espace optionnel).
 */
export function isValidPostalCode(value: string): boolean {
  const v = value.trim();
  if (v === '') return true;
  return /^[A-Za-z]\d[A-Za-z]\s?\d[A-Za-z]\d$/.test(v);
}
