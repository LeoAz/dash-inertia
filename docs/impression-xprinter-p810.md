# Impression des reçus — Xprinter P810 (rouleau 80 mm)

Le ticket tient sur 68 mm de large, dans les 72 mm imprimables de la P810, et démarre en haut du papier. C'est le format de papier du pilote qui décide où le ticket s'arrête : il doit donc être réglé sur le rouleau.

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

La longueur vient du format sélectionné. Vérifier dans la fenêtre d'impression de Chrome que le format est bien le rouleau, et non A4, Lettre ou 80 × 297 mm, puis que l'option d'avance papier en fin de document est désactivée dans le pilote.

## Si le bord droit du ticket est coupé

Vérifier que l'échelle est à 100 % et que les marges sont sur Aucune.

## Impression sans dialogue (poste de caisse Windows)

Lancer Chrome avec `--kiosk-printing` et définir la P810 comme imprimante par défaut.
