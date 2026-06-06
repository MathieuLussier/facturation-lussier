// Configuration de la coquille de bureau.
//
// IMPORTANT (avant de builder pour la prod) : remplace DEFAULT_PROD_URL par
// l'URL réelle de ton app web sur le VPS (ex. https://factures.tondomaine.com).
// Tu peux aussi la surcharger au lancement avec la variable FACT_APP_URL.

export type ColorMode = 'color' | 'gray' | 'bw';

export interface ScanConfig {
  /** Résolution de numérisation en points par pouce. */
  resolution: number;
  /** Mode couleur (mappé vers WIA et eSCL). */
  colorMode: ColorMode;
  /** Filtre le scanner WIA par nom (sous-chaîne). Sinon : premier scanner trouvé. */
  wiaDeviceName?: string;
  /** Hôte/IP de l'imprimante pour le repli eSCL réseau (ex. 192.168.1.50). */
  esclHost?: string;
  /** Port eSCL (par défaut 8080 ; HP utilise souvent 8080, parfois 80). */
  esclPort: number;
}

export interface AppConfig {
  isDev: boolean;
  /** URL de l'app web à charger dans la fenêtre. */
  appUrl: string;
  scan: ScanConfig;
}

const isDev = process.env.FACT_DEV === '1';

// TODO: mettre l'URL de production réelle du VPS ici (ou via FACT_APP_URL).
const DEFAULT_PROD_URL = 'https://factures.lussier.app';

function colorModeFromEnv(value: string | undefined): ColorMode {
  return value === 'gray' || value === 'bw' ? value : 'color';
}

export const config: AppConfig = {
  isDev,
  appUrl: isDev ? 'http://localhost:4000' : process.env.FACT_APP_URL || DEFAULT_PROD_URL,
  scan: {
    resolution: Number(process.env.FACT_SCAN_DPI) || 300,
    colorMode: colorModeFromEnv(process.env.FACT_SCAN_MODE),
    wiaDeviceName: process.env.FACT_SCAN_WIA_NAME || undefined,
    esclHost: process.env.FACT_SCAN_ESCL_HOST || undefined,
    esclPort: Number(process.env.FACT_SCAN_ESCL_PORT) || 8080,
  },
};
