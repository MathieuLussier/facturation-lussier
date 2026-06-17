# Facturation Lussier — Application de bureau (Electron)

Coquille de bureau Windows qui **charge l'app web** (hébergée sur le VPS) dans une
fenêtre native et ajoute la **numérisation directe depuis le scanner de l'imprimante**
(bouton « Scanner » de la fiche facture).

Pourquoi une app de bureau ? Le serveur est sur un VPS et n'a **aucun accès** au réseau
local de l'imprimante. L'app de bureau, elle, tourne sur ton poste (sur le même réseau
que l'imprimante) : elle peut donc piloter le scanner, puis téléverser le document vers
le VPS via l'API existante.

```
┌──────────────────────── Poste Windows (réseau local) ────────────────────────┐
│  Electron                                                                     │
│   • BrowserWindow → charge l'app web du VPS (HTTPS)                            │
│   • Numérisation native :  WIA (imprimante installée)  ➜ eSCL (repli réseau)   │
│   • preload expose  window.facturationScan.scan()  → JPEG (WIA) ou PDF (eSCL)  │
└───────────────────────────────────────────────────────────────────────────────┘
        │ scan (PDF base64)                         ▲ upload pièce jointe (HTTPS)
        ▼                                           │
   App web (renderer) ──────────────────────────────┘  → POST /invoices/:id/attachments
```

L'app web détecte `window.facturationScan` (voir `apps/web/src/lib/desktop-scan.ts`) :
- **dans l'app de bureau** → numérisation native en un clic ;
- **dans un navigateur normal** → repli sélecteur de fichier / caméra.

---

## 1. Avant de builder — à configurer

1. **URL de l'app web** : dans `src/config.ts`, remplace `DEFAULT_PROD_URL`
   (`https://factures.lussier.app`) par l'URL réelle de ton app sur le VPS.
   (Surchargeable au lancement par la variable d'env `FACT_APP_URL`.)
2. **URL des mises à jour** : dans `electron-builder.yml`, champ `publish.url`,
   mets l'URL où tu déposeras les fichiers de mise à jour (voir §5).
3. **Pilote du scanner** : sur le poste Windows, installe **HP Smart** (ou le pilote
   complet HP) pour la **HP DeskJet 2700** afin qu'elle apparaisse comme scanner WIA
   dans Windows (Démarrer → « Numériser »).

---

## 2. Développement

Prérequis : Node ≥ 20, et l'app web + l'API démarrées (web `:4000`, API `:4001`).

```bash
cd desktop
npm install
npm run dev          # ouvre Electron sur http://localhost:4000 (FACT_DEV=1)
```

> Le scan WIA ne fonctionne **que sous Windows**. Sous Linux/macOS, configure un
> `FACT_SCAN_ESCL_HOST` (imprimante eSCL) pour tester le repli réseau.

---

## 3. Build de l'installeur Windows (.exe)

### Option A — depuis Windows (recommandé)

```bash
cd desktop
npm install
npm run build:win
```

Produit dans `desktop/release/` :
- `Facturation Lussier-Setup-<version>.exe`  ← l'installeur à distribuer
- `Facturation Lussier-Setup-<version>.exe.blockmap`
- `latest.yml`  ← manifeste d'auto-update

### Option B — depuis Linux via Docker (Wine)

Aucun module natif n'est utilisé (scan WIA = PowerShell, eSCL = HTTP), donc le
cross-build fonctionne :

```bash
cd desktop
docker run --rm -v "$PWD":/project -w /project \
  electronuserland/builder:wine \
  sh -c "npm install && npm run build:win"
```

---

## 4. Signature de code (éviter l'alerte SmartScreen)

Sans signature, Windows SmartScreen affichera un avertissement à l'installation.
Pour signer, fournis un certificat **avant** le build via variables d'environnement :

```bash
# Certificat OV en fichier .pfx / .p12
export CSC_LINK="/chemin/vers/certificat.pfx"   # ou base64 du fichier
export CSC_KEY_PASSWORD="motdepasse_du_certificat"
npm run build:win
```

- **Certificat OV** (fichier) : ~quelques centaines $/an ; fonctionne comme ci-dessus.
- **Certificat EV** (depuis 2023, clé sur HSM/token) : nécessite un script de signature
  custom (`win.sign`) appelant l'outil du fournisseur (DigiCert KeyLocker `smctl`,
  Azure Trusted Signing, etc.). À brancher quand tu auras le certificat.

> Tant que tu n'as pas de certificat, le build **non signé** fonctionne — il y aura
> juste l'avertissement SmartScreen (« Informations complémentaires » → « Exécuter
> quand même »).

---

## 5. Auto-update — hébergement sur le VPS

electron-updater (provider `generic`) interroge un dossier statique sur ton serveur.

### Dépôt des fichiers

À chaque version, copie les **3 fichiers** de `release/` vers le dossier pointé par
`publish.url` :

```
/var/www/updates/desktop/releases/
├── latest.yml
├── Facturation Lussier-Setup-<version>.exe
└── Facturation Lussier-Setup-<version>.exe.blockmap
```

```bash
rsync -avz release/latest.yml \
      release/"Facturation Lussier-Setup-"*.exe \
      release/"Facturation Lussier-Setup-"*.exe.blockmap \
      user@vps:/var/www/updates/desktop/releases/
```

### nginx (statique, sans CORS — l'updater requête depuis le process principal)

```nginx
location /desktop/releases/ {
    root /var/www/updates;
    autoindex off;
}
```

### Cycle de release

1. Incrémente `version` dans `desktop/package.json`.
2. `npm run build:win` (signé si certificat configuré).
3. Dépose les 3 fichiers sur le VPS.
4. **Ne modifie jamais `latest.yml` à la main** : electron-updater vérifie le `sha512`
   qu'il contient et refusera une mise à jour dont le hash ne correspond pas.

L'app vérifie les mises à jour au démarrage (prod), télécharge en arrière-plan et
installe au redémarrage.

---

## 6. Configuration du scanner

Par défaut : **WIA** (l'imprimante installée dans Windows), résolution 300 DPI, couleur.
Variables d'environnement optionnelles :

| Variable                | Effet                                                        |
|-------------------------|--------------------------------------------------------------|
| `FACT_SCAN_DPI`         | Résolution (défaut 300)                                       |
| `FACT_SCAN_MODE`        | `color` (défaut) \| `gray` \| `bw`                            |
| `FACT_SCAN_WIA_NAME`    | Filtre le scanner WIA par nom (sous-chaîne)                   |
| `FACT_SCAN_ESCL_HOST`   | IP de l'imprimante pour le repli eSCL réseau                  |
| `FACT_SCAN_ESCL_PORT`   | Port eSCL (défaut 8080)                                       |

**HP DeskJet 2700** : numérise via WIA une fois HP Smart installé. Si la 2700 est
configurée en Wi-Fi, tu peux aussi tenter le repli réseau eSCL en réglant
`FACT_SCAN_ESCL_HOST` sur l'IP de l'imprimante (le repli ne sert que si WIA échoue).

---

## 7. Dépannage

| Symptôme                                   | Piste                                                        |
|--------------------------------------------|-------------------------------------------------------------|
| « Aucun scanner WIA trouvé »               | Installer HP Smart ; vérifier dans Démarrer → « Numériser ». |
| Bouton « Scanner » ouvre un sélecteur      | L'app n'est pas lancée en mode bureau (API native absente).  |
| Page blanche au démarrage                  | Vérifier `appUrl` (`config.ts`) et l'accès réseau au VPS.    |
| L'update ne s'installe pas                 | Vérifier `latest.yml` + `.exe` + `.blockmap` côté serveur.   |
| Avertissement SmartScreen                  | Normal sans certificat ; configurer la signature (§4).       |

---

## 8. Structure

```
desktop/
├── package.json            # deps + scripts (build:win, publish:win)
├── electron-builder.yml    # packaging NSIS + auto-update + signature
├── tsconfig.json
├── scripts/copy-resources.mjs   # copie wia.ps1 → dist/ (dev)
└── src/
    ├── main.ts             # process principal : fenêtre, sécurité, IPC, auto-update
    ├── preload.ts          # expose window.facturationScan.scan()
    └── scan/
        ├── index.ts        # orchestration WIA→eSCL (joint l'image/PDF tel quel)
        ├── wia.ts          # wrapper Node du script PowerShell
        ├── wia.ps1         # numérisation WIA headless (Windows)
        └── escl.ts         # client eSCL/AirScan réseau (repli)
```
