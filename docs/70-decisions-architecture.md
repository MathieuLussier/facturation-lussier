# Décisions fonctionnelles et d'architecture

Ce document conserve les décisions qui orientent durablement le produit. Une décision peut être révisée, mais ne doit pas être modifiée sans expliquer la raison et les conséquences.

## ADR-001 — Le call est l'entrée du workflow opérationnel

**Statut : accepté**

### Contexte

Le travail commence généralement par un message reçu la veille. La facture n'est que l'aboutissement d'une chaîne comprenant l'affectation, le travail terrain, le bon signé et les justificatifs.

### Décision

Créer une entité métier `Call` en amont des bons et des factures.

### Conséquences

- un call peut produire plusieurs affectations;
- une affectation correspond à un chauffeur et un camion;
- chaque affectation peut produire son propre bon;
- le call conserve les instructions opérationnelles originales;
- la facture reste reliée à l'origine du travail.

## ADR-002 — Le broker est une source de travail, pas le client facturé

**Statut : accepté**

### Décision

Le broker peut être lié au call, mais la facture est adressée à l'entreprise du chantier ou au profil de facturation du projet.

### Conséquences

- `Broker` et `Client` sont deux concepts distincts;
- un call transmis par un broker doit tout de même identifier le client et le projet facturés;
- les rapports pourront distinguer la provenance du travail du chiffre d'affaires facturé.

## ADR-003 — Partager le SMS avant d'intégrer un numéro Twilio

**Statut : accepté pour le MVP**

### Contexte

Le broker utilise déjà le SMS habituel. L'objectif est de réduire la ressaisie sans lui imposer un nouveau numéro ou un nouveau logiciel.

### Décision

Le premier mécanisme d'import est l'action mobile **Partager vers Facturation Lussier**, avec copier-coller comme solution de repli.

### Conséquences

- aucune modification du comportement du broker;
- validation rapide de la valeur de l'extraction;
- le texte original est conservé;
- une intégration Twilio demeure possible plus tard, après validation du besoin et des coûts.

## ADR-004 — L'automatisation prépare, l'humain confirme

**Statut : accepté**

### Décision

L'extraction de SMS, l'OCR, la création de facture, les courriels et les relances peuvent être préparés automatiquement, mais les actions sensibles exigent une validation humaine.

### Conséquences

- aucun call définitif n'est créé uniquement à partir d'une extraction incertaine;
- aucune facture n'est finalisée silencieusement;
- aucun courriel ou rappel n'est envoyé sans action explicite dans le MVP;
- les corrections et validations sont historisées.

## ADR-005 — Le bon de travail est une entité structurée

**Statut : accepté**

### Contexte

Un fichier joint seul ne permet pas de rechercher, calculer ou vérifier correctement les heures, la plaque, le numéro du bon et le signataire.

### Décision

Créer un modèle `WorkOrder`. Le scan du bon est une pièce jointe de ce modèle, et non l'unique représentation du travail.

### Conséquences

- les données du bon deviennent interrogeables;
- les lignes de facture peuvent référencer leur source;
- l'OCR peut préremplir les champs;
- un futur bon numérique utilise le même modèle.

## ADR-006 — Le produit demeure hybride papier et numérique

**Statut : accepté**

### Décision

Le système doit pouvoir générer un dossier physique complet même lorsque les informations sont capturées numériquement.

### Conséquences

- un bouton produit la facture et les justificatifs dans le bon ordre;
- les préférences de livraison peuvent être portées par le client ou le projet;
- l'impression et le courriel sont deux actions indépendantes;
- le papier n'est pas considéré comme une erreur ou un mode dégradé.

## ADR-007 — La surcharge carburant est manuelle, hebdomadaire et visible

**Statut : accepté pour le MVP**

### Décision

La responsable saisit un pourcentage sur la facture hebdomadaire. Le tarif effectif est calculé à partir du tarif de base du projet. Le client doit voir le pourcentage lorsqu'il est appliqué.

### Conséquences

- le tarif contractuel du projet n'est pas modifié;
- les taxes sont calculées sur le montant après surcharge;
- les valeurs sont figées à la finalisation;
- la source externe du pourcentage reste un point de découverte;
- la maquette devra confirmer la présentation exacte sur le PDF.

## ADR-008 — Le développement reste progressif autour de l'existant

**Statut : accepté**

### Décision

Compléter d'abord la facturation, l'impression, les envois et les relances. Ajouter ensuite les dossiers, les calls et les bons numériques.

### Conséquences

- Odoo et le papier peuvent coexister pendant la transition;
- chaque phase doit fournir une valeur utilisable seule;
- les utilisateurs valident les maquettes avant l'implémentation;
- les migrations de données et changements d'habitude sont limités.
