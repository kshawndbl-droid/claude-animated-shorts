// Cast for "The Man-Eaters of Tsavo" (1898), drawn with the v2 figure: John Henry Patterson in khaki and a pith helmet,
// and railway workers in turbans and plain tunics.
import { Look } from "../eiffel/figure";

const base = { vest: "#000", tie: "#000", hat: "none" as const, hatCol: "#000", band: "#000" };
/** Patterson: khaki field jacket and trousers, pith helmet, brown boots, a big moustache */
export const PATTERSON: Look = { ...base, top: "suit", suit: "#b89a64", suitDark: "#9a7e4c", vest: "#b89a64", shirt: "#efe6d0", tie: "#6a4a2a",
  trousers: "#a88c58", shoes: "#4a2e1a", hat: "pith", hatCol: "#e6dcc0", band: "#8a7450", hair: "#5a3a22", brows: "#4a2e18",
  mustache: "walrus", sideburns: true, skin: "#f0c8a0" };
/** railway workers: white or saffron turbans, loose tunics */
export const WORKER1: Look = { ...base, top: "tee", suit: "#ece4d2", suitDark: "#cfc4ac", shirt: "#ece4d2", trousers: "#d8ccb0", shoes: "#5a3a22",
  hat: "turban", hatCol: "#f2ede0", band: "#cfc6b0", hair: "#1a1210", brows: "#1a1210", mustache: "walrus", skin: "#b07850" };
export const WORKER2: Look = { ...WORKER1, suit: "#c9b48a", suitDark: "#a8946c", trousers: "#8a7a5a", hatCol: "#e08a2a", band: "#b06a1a", mustache: undefined, skin: "#9a6440" };
