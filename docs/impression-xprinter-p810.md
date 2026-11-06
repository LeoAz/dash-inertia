# Impression des reçus — Xprinter P810 (rouleau 80 mm)

L'application calcule la hauteur exacte de chaque reçu : le poste d'impression ne doit pas imposer une longueur de page fixe.

## À régler une seule fois

**Dans Chrome (fenêtre d'impression, « Plus de paramètres »)**

- Destination : Xprinter P810
- Marges : **Aucune**
- Échelle : **100 %** (par défaut)
- En-têtes et pieds de page : **décochés** (sinon l'URL et la date sont imprimées)

**Dans le pilote Windows (Propriétés de l'imprimante > Préférences d'impression)**

- Format du papier : rouleau 80 mm, le plus long proposé (exemple : 80 × 3276 mm), jamais A4
- S'il n'existe pas : créer un format personnalisé de 80 mm de large

## Si le papier continue de défiler après le reçu

Chrome peut garder le format choisi dans le pilote. La longueur vient alors du format sélectionné : vérifier qu'il s'agit bien du rouleau, que l'option d'avance papier en fin de document est désactivée, et que le pilote est à jour.

## Impression sans dialogue (poste de caisse Windows)

Lancer Chrome avec `--kiosk-printing` et définir la P810 comme imprimante par défaut.
