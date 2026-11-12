/* Design tokens — single source of truth for the palette.
   Wealthsimple warm minimalism × Gina Cody burgundy.
   Brand hex verified: Concordia Burgundy #912338, Wealthsimple Dune #32302F */
export const T = {
  paper: "#FAF8F5", surface: "#FFFFFF", ink: "#32302F", muted: "#6E6E6E",
  hairline: "#ECE7E1", burgundy: "#912338", tint: "#E9D3D7", gold: "#CBB576",
  turquoise: "#057D78", turqTint: "#CCE3E4",
  ok: "#508212", info: "#0072A8", warn: "#E5A712", danger: "#DA3A16",
  /* soft fills used by pills and status chips. warnInk is dark enough to pass
     4.5:1 as small text on warnTint, white and paper (5.2-5.8:1); the lighter
     #9A7B12 it replaces measured 3.6-4.0:1. */
  okTint: "#E8F0DD", warnTint: "#FBF1D8", dangerTint: "#FBE3DC", warnInk: "#7D6208",
  /* The same idea for the other three states. As small text on their own
     tints the base colours measured 3.7 (danger), 3.9 (ok) and 4.3 (info)
     to 1; these read 5.4, 5.5 and 5.7. The base colours stay for dots, bars
     and borders, where they are meant to be bright. */
  dangerInk: "#B42318", okInk: "#3F6A0C", infoInk: "#005F8C", infoTint: "#DCEBF3",
  /* Muted text on the grey chip fill (5.6:1; plain muted is 4.3 there). */
  mutedInk: "#5F5B57", chip: "#EFEAE5",
};

/* The eight accents a call can be given. */
export const PALETTE = [
  { name: "Burgundy", hex: "#912338" },
  { name: "Turquoise", hex: "#057D78" },
  { name: "Dark blue", hex: "#004085" },
  { name: "Mauve", hex: "#573996" },
  { name: "Magenta", hex: "#DB0272" },
  { name: "Green", hex: "#508212" },
  { name: "Orange", hex: "#DA3A16" },
  { name: "Gold", hex: "#9A7B12" },
];
