<#
.SYNOPSIS
    Numérisation headless via WIA Automation Layer (wiaaut.dll).
    Compatible WIA 2.0 (Windows Vista et ultérieur).
.PARAMETER OutputPath
    Chemin complet du fichier de sortie (JPEG ou BMP selon driver).
    Défaut : $env:TEMP\scan_<timestamp>.jpg
.PARAMETER DeviceName
    Sous-chaîne du nom du scanner. Défaut : premier scanner trouvé.
.PARAMETER DPI
    Résolution DPI. Défaut : 300.
.PARAMETER ColorMode
    "color" | "gray" | "bw". Défaut : "color".
.PARAMETER Source
    "flatbed" | "adf". Défaut : "flatbed".
.NOTES
    stdout : le chemin du fichier produit est écrit sur la DERNIÈRE ligne.
    Les diagnostics passent par Write-Host (informationnel) ; le wrapper Node
    lit la dernière ligne non vide.
#>
param(
    [ValidateSet("acquire","list")]
    [string]$Mode       = "acquire",
    [string]$OutputPath = "",
    [string]$DeviceId   = "",
    [string]$DeviceName = "",
    [int]   $DPI        = 300,
    [ValidateSet("color","gray","bw")]
    [string]$ColorMode  = "color",
    [ValidateSet("flatbed","adf")]
    [string]$Source     = "flatbed"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# ── Constantes WIA (wiaaut.dll Automation Layer) ─────────────────────────────
# WiaDeviceType : 1 = ScannerDeviceType, 2 = CameraDeviceType, 3 = VideoDeviceType
$WIA_SCANNER_TYPE   = 1

# Propriétés item (WIA_IPS_* / WIA_IPA_*)
$PROP_XRES          = 6147   # WIA_IPS_XRES
$PROP_YRES          = 6148   # WIA_IPS_YRES
$PROP_CUR_INTENT    = 6146   # WIA_IPS_CUR_INTENT
$PROP_DATATYPE      = 4103   # WIA_IPA_DATATYPE
$PROP_ITEM_CATEGORY = 4101   # WIA_IPA_ITEM_CATEGORY (GUID de catégorie)

# WIA_IPS_CUR_INTENT
$INTENT_COLOR       = 0x00000001
$INTENT_GRAYSCALE   = 0x00000002
$INTENT_TEXT        = 0x00000004

# WIA_IPA_DATATYPE
$DATA_COLOR         = 3
$DATA_GRAYSCALE     = 2
$DATA_BW            = 0

# WIA_IPA_ITEM_CATEGORY GUIDs (sources WIA 2.0)
$CAT_FLATBED        = "{FB607B1F-43F3-488b-855B-FB703EC342A8}"
$CAT_FEEDER         = "{3A441600-D095-11D1-9C51-00A0C9B7CC02}"

# WIA FormatID
$FORMAT_JPEG        = "{B96B3CAE-0728-11D3-9D7B-0000F81EF32E}"
$FORMAT_BMP         = "{B96B3CAB-0728-11D3-9D7B-0000F81EF32E}"

# ── Chemin de sortie ─────────────────────────────────────────────────────────
if ($OutputPath -eq "") {
    $ts         = Get-Date -Format "yyyyMMdd_HHmmss"
    $OutputPath = "$env:TEMP\scan_$ts.jpg"
}

# ── Helpers propriétés WIA ───────────────────────────────────────────────────
function Set-WIAProperty {
    param([System.__ComObject]$Properties, [int]$PropID, [object]$Value)
    foreach ($prop in $Properties) {
        if ($prop.PropertyID -eq $PropID) { $prop.Value = $Value; return }
    }
    Write-Host "Propriété WIA ID=$PropID absente (driver ne la supporte pas)."
}

function Get-WIAProperty {
    param([System.__ComObject]$Properties, [int]$PropID)
    foreach ($prop in $Properties) {
        if ($prop.PropertyID -eq $PropID) { return $prop.Value }
    }
    return $null
}

# ── DeviceManager ────────────────────────────────────────────────────────────
try {
    $wia = New-Object -ComObject WIA.DeviceManager
} catch {
    Write-Error "Impossible de créer WIA.DeviceManager : $_"
    exit 2
}

# ── Mode "list" : énumérer les scanners et sortir en JSON ────────────────────
if ($Mode -eq "list") {
    $parts = @()
    for ($i = 1; $i -le $wia.DeviceInfos.Count; $i++) {
        $di = $wia.DeviceInfos.Item($i)
        if ($di.Type -ne $WIA_SCANNER_TYPE) { continue }
        $name = Get-WIAProperty -Properties $di.Properties -PropID 7  # WIA_DIP_DEV_NAME
        $parts += ('{"id":' + (ConvertTo-Json "$($di.DeviceID)") + ',"name":' + (ConvertTo-Json "$name") + '}')
    }
    Write-Output ('[' + ($parts -join ',') + ']')
    exit 0
}

# ── Sélection du scanner ─────────────────────────────────────────────────────
$scannerInfo = $null
for ($i = 1; $i -le $wia.DeviceInfos.Count; $i++) {
    $di = $wia.DeviceInfos.Item($i)
    if ($di.Type -ne $WIA_SCANNER_TYPE) { continue }

    $diName = Get-WIAProperty -Properties $di.Properties -PropID 7  # WIA_DIP_DEV_NAME
    Write-Host "Scanner trouvé : '$diName'"

    if ($DeviceId -ne "") {
        if ($di.DeviceID -eq $DeviceId) {
            $scannerInfo = $di
            Write-Host "Scanner sélectionné (id) : $diName"
            break
        }
    } elseif ($DeviceName -eq "" -or ($diName -and $diName -like "*$DeviceName*")) {
        $scannerInfo = $di
        Write-Host "Scanner sélectionné : $diName"
        break
    }
}

if ($null -eq $scannerInfo) {
    Write-Error "Aucun scanner WIA trouvé$(if ($DeviceName) { " correspondant à '$DeviceName'" })."
    exit 3
}

# ── Connexion ────────────────────────────────────────────────────────────────
try {
    $device = $scannerInfo.Connect()
} catch {
    Write-Error "Connexion au scanner échouée : $_"
    exit 4
}

# ── Sélection de l'item (WIA 2.0 : sources = child items par catégorie) ──────
$targetCategory = if ($Source -eq "adf") { $CAT_FEEDER } else { $CAT_FLATBED }
$scanItem       = $null

for ($i = 1; $i -le $device.Items.Count; $i++) {
    $item    = $device.Items.Item($i)
    $catGuid = Get-WIAProperty -Properties $item.Properties -PropID $PROP_ITEM_CATEGORY
    if ($catGuid -eq $targetCategory) { $scanItem = $item; break }
}

# Repli : drivers simples ne peuplent pas WIA_IPA_ITEM_CATEGORY.
if ($null -eq $scanItem) {
    Write-Host "Catégorie $targetCategory introuvable. Utilisation de Items(1)."
    if ($device.Items.Count -lt 1) {
        Write-Error "Le scanner ne présente aucun item de numérisation."
        exit 6
    }
    $scanItem = $device.Items.Item(1)
}

# ── ADF : vérifier la présence de papier ─────────────────────────────────────
if ($Source -eq "adf") {
    # WIA_DPS_DOCUMENT_HANDLING_STATUS (3087) ; FEED_READY = 0x01
    $adfStatus = Get-WIAProperty -Properties $device.Properties -PropID 3087
    if ($null -ne $adfStatus -and ($adfStatus -band 0x01) -eq 0) {
        Write-Error "ADF demandé mais aucun document détecté (STATUS=0x$($adfStatus.ToString('X')))."
        exit 5
    }
}

# ── Configuration de l'item ──────────────────────────────────────────────────
Set-WIAProperty -Properties $scanItem.Properties -PropID $PROP_XRES -Value $DPI
Set-WIAProperty -Properties $scanItem.Properties -PropID $PROP_YRES -Value $DPI

switch ($ColorMode) {
    "color" {
        Set-WIAProperty -Properties $scanItem.Properties -PropID $PROP_CUR_INTENT -Value $INTENT_COLOR
        Set-WIAProperty -Properties $scanItem.Properties -PropID $PROP_DATATYPE   -Value $DATA_COLOR
    }
    "gray" {
        Set-WIAProperty -Properties $scanItem.Properties -PropID $PROP_CUR_INTENT -Value $INTENT_GRAYSCALE
        Set-WIAProperty -Properties $scanItem.Properties -PropID $PROP_DATATYPE   -Value $DATA_GRAYSCALE
    }
    "bw" {
        Set-WIAProperty -Properties $scanItem.Properties -PropID $PROP_CUR_INTENT -Value $INTENT_TEXT
        Set-WIAProperty -Properties $scanItem.Properties -PropID $PROP_DATATYPE   -Value $DATA_BW
    }
}

# ── Numérisation ─────────────────────────────────────────────────────────────
try {
    Write-Host "Numérisation en cours ($DPI DPI, $ColorMode, source=$Source)..."
    $imageFile = $scanItem.Transfer($FORMAT_JPEG)
} catch {
    Write-Host "JPEG non supporté, bascule BMP : $_"
    try {
        $imageFile  = $scanItem.Transfer($FORMAT_BMP)
        $OutputPath = [System.IO.Path]::ChangeExtension($OutputPath, ".bmp")
    } catch {
        Write-Error "Échec du Transfer() WIA (JPEG et BMP) : $_"
        exit 7
    }
}

# ── Sauvegarde ───────────────────────────────────────────────────────────────
if (Test-Path $OutputPath) { Remove-Item $OutputPath -Force }
try {
    $imageFile.SaveFile($OutputPath)
} catch {
    Write-Error "Impossible de sauvegarder dans '$OutputPath' : $_"
    exit 8
}

if (-not (Test-Path $OutputPath)) {
    Write-Error "Fichier introuvable après SaveFile() : '$OutputPath'"
    exit 9
}

# Dernière ligne stdout = chemin absolu du fichier produit.
Write-Output $OutputPath
exit 0
