// KAIZEN CLIPS WARDROBE: ready-made looks for the library rig, by period and role, plus body types and palettes.
// A new character = one of these + overrides, e.g.
//   const hero = cast(WARDROBE.victorianGent, { skin: SKIN.olive, hair: HAIR.black, body: BODY.tall, mustache: true });
// Every Short must still give its main characters their own colours and details (originality rule): use these as a
// starting point, change colours, hats, hair and accessories, then save the final looks in that Short's own folder.
import type { Look } from "./rig";

export const SKIN = {
  pale: "#f0d0b8", fair: "#e6c0a0", light: "#e0b493", warm: "#dcae8c", tan: "#d2a383", olive: "#c09068",
  brown: "#9a6a48", deep: "#6e4a32", darkest: "#4e3424",
};
export const HAIR = {
  black: "#1a1410", darkBrown: "#3a2616", brown: "#5a3a22", auburn: "#7a3a1e", ginger: "#b0582a", blond: "#c99a52",
  platinum: "#e0d4b0", grey: "#a8a49c", white: "#e8e4dc",
};
/** body types: pass as look.body */
export const BODY = {
  man: {}, woman: { height: 0.95, build: 0.9 }, tall: { height: 1.08, build: 0.95 }, short: { height: 0.9 },
  heavy: { build: 1.3, belly: 1 }, slim: { build: 0.86 }, strong: { build: 1.18, height: 1.04 },
  child: { height: 0.62, head: 1.18, build: 0.88 }, teen: { height: 0.85, head: 1.05, build: 0.9 },
  elder: { height: 0.96, build: 0.95 },
};

const base = (o: Partial<Look>): Look => ({
  skin: SKIN.warm, hair: HAIR.darkBrown, top: "#5a4630", topDark: "#3a2c1e", legs: "#3e3a34", legsDark: "#28251f", boots: "#2e2016", ...o,
});

export const WARDROBE: Record<string, Look> = {
  // ---- approved Hidebehind cast (kept here so they are reusable as references, not as copies)
  logger: base({ top: "#8e2622", topDark: "#5a1614", check: "1", legs: "#4a4640", legsDark: "#2f2c28", boots: "#3a2618", beard: "#6b4a2e", toque: "#5d5e58", toqueDark: "#3e3f3a", braces: "#2a2420", belt: "#2a1c12" }),
  // ---- ancient / medieval / early modern
  roman: base({ top: "#b8a07a", topDark: "#8a7454", outfit: "robe", accent: "#b8a07a", sash: "#8a2222", shoes: "sandals", boots: "#6a4426", hairStyle: "short" }),
  medievalPeasant: base({ top: "#7a6a4a", topDark: "#54482e", long: true, belt: "#3a2a1c", legs: "#5a5044", hat: "hood", hatCol: "#5a4a32", shoes: "shoes" }),
  knight: base({ top: "#9aa0a6", topDark: "#6a7076", outfit: "coat", accent: "#2a3a7a", legs: "#7a8086", hat: "helmet", hatCol: "#8a9096", belt: "#3a2a1c" }),
  monk: base({ top: "#5a3a22", topDark: "#3a2414", outfit: "robe", belt: "#2a1c12", hairStyle: "bald", shoes: "sandals", boots: "#4a3020" }),
  king: base({ top: "#6a1a2a", topDark: "#441018", outfit: "robe", accent: "#6a1a2a", hat: "crown", hatCol: "#d8a828", band: "#b02a2a", beard: HAIR.grey, medals: true }),
  colonist1700s: base({ top: "#3a4a6a", topDark: "#243048", outfit: "coat", legs: "#d8ccb0", legsDark: "#a89c80", hat: "tricorn", hatCol: "#1e1a18", band: "#3a3230", shoes: "shoes", hairStyle: "ponytail", hair: HAIR.white, scarf: "#efe8dc" }),
  colonialWoman: base({ top: "#7a4a3a", topDark: "#54301e", outfit: "dress", accent: "#7a4a3a", apron: "#efe8dc", hat: "bonnet", hatCol: "#efe8dc", band: "#c8bca8", hairStyle: "bun", lips: "#b05a5a", body: BODY.woman, shoes: "shoes" }),
  edoSamurai: base({ top: "#2a3a4a", topDark: "#1a2430", outfit: "robe", accent: "#2a3a4a", sash: "#8a2222", hairStyle: "topknot", hair: HAIR.black, shoes: "sandals", boots: "#c8b890" }),
  aztecWarrior: base({ top: "#c8a860", topDark: "#987838", long: true, sash: "#2a7a6a", shoes: "sandals", boots: "#6a4426", skin: SKIN.brown, hair: HAIR.black, hairStyle: "long" }),
  // ---- 1800s
  frontiersman: base({ top: "#8a6a40", topDark: "#5a4426", legs: "#4a4034", hat: "cowboy", hatCol: "#5a4632", band: "#2a2018", scarf: "#8a2a22", stubble: true }),
  victorianGent: base({ top: "#2a2a30", topDark: "#16161a", outfit: "coat", legs: "#3a3a40", hat: "tophat", hatCol: "#16161a", band: "#3a3036", tie: "#6a1a1a", shoes: "shoes", mustache: true, sideburns: true }),
  victorianLady: base({ top: "#4a2a4a", topDark: "#2e182e", outfit: "dress", accent: "#4a2a4a", hairStyle: "bun", hair: HAIR.auburn, lips: "#a84a5a", body: BODY.woman, shoes: "shoes" }),
  streetUrchin: base({ top: "#6a5a44", topDark: "#4a3e2e", hat: "flatcap", hatCol: "#4a4440", body: BODY.child, legs: "#4a4034", stubble: false, blush: true }),
  sailor: base({ top: "#e8e4dc", topDark: "#b8b4ac", pattern: "stripes", legs: "#2a3450", legsDark: "#1a2034", hat: "beret", hatCol: "#1a2440", scarf: "#1a2440" }),
  civilWarSoldier: base({ top: "#2a3a5a", topDark: "#1a2640", outfit: "uniform", accent: "#c8a030", legs: "#5a6a8a", hat: "kepi", hatCol: "#2a3a5a", band: "#1a2640", belt: "#1a1410" }),
  // ---- 1900s - 1940s
  worker1900: base({ top: "#6a6c66", topDark: "#45463f", braces: "#5a1c18", hat: "flatcap", hatCol: "#3a3634", mustache: true }),
  gent1920s: base({ top: "#3a3630", topDark: "#24201c", outfit: "vest", accent: "#5a4a3a", legs: "#3a3630", hat: "bowler", hatCol: "#1a1614", band: "#2a2420", tie: "#7a2a2a", shoes: "shoes" }),
  flapper1920s: base({ top: "#2a6a6a", topDark: "#1a4646", outfit: "dress", accent: "#2a6a6a", hairStyle: "short", hair: HAIR.black, lips: "#b02a3a", body: BODY.woman, shoes: "shoes", hat: "beret", hatCol: "#1a2a2a" }),
  ww1Soldier: base({ top: "#6a6444", topDark: "#4a462e", outfit: "uniform", accent: "#8a7a4a", legs: "#6a6444", hat: "helmet", hatCol: "#5a5a3e", belt: "#3a2a1c", scarf: undefined }),
  ww2Officer: base({ top: "#5a5a3e", topDark: "#3e3e2a", outfit: "uniform", accent: "#c8a030", legs: "#5a5a3e", hat: "kepi", hatCol: "#4a4a32", band: "#2a2a1c", medals: true, tie: "#4a4a32" }),
  detective1940s: base({ top: "#6a5a44", topDark: "#4a3e2e", outfit: "coat", legs: "#3a3630", hat: "slouch", hatCol: "#3a3430", band: "#1a1614", tie: "#3a2a2a", shoes: "shoes" }),
  nurse1940s: base({ top: "#e8e4dc", topDark: "#b8b4ac", outfit: "dress", accent: "#e8e4dc", hat: "headscarf", hatCol: "#f4f0e8", hairStyle: "bun", body: BODY.woman, lips: "#a84a5a", shoes: "shoes", boots: "#e8e4dc" }),
  // ---- modern
  office: base({ top: "#e8e8e4", topDark: "#b8b8b4", legs: "#2a3040", tie: "#2a4a8a", shoes: "shoes", glasses: true }),
  casual: base({ top: "#3a6a8a", topDark: "#244a62", legs: "#34405a", shoes: "shoes" }),
  scientist: base({ top: "#f2f0ec", topDark: "#c4c2be", outfit: "coat", legs: "#3a3a40", glasses: true, hairStyle: "curly", hair: HAIR.grey, shoes: "shoes" }),
  police: base({ top: "#1e2a44", topDark: "#121a2c", outfit: "uniform", accent: "#c8c8c8", legs: "#1e2a44", hat: "kepi", hatCol: "#1e2a44", band: "#0e1420", shoes: "shoes" }),
  chef: base({ top: "#f2f0ec", topDark: "#c4c2be", apron: "#e8e4dc", hat: "chef", hatCol: "#f4f0e8", legs: "#3a3a40", shoes: "shoes", mustache: true }),
  farmer: base({ top: "#3a5a8a", topDark: "#243a5e", pattern: "check", legs: "#4a5a7a", hat: "straw", hatCol: "#d8b870", band: "#8a2a22", braces: "#4a3a2a" }),
};

/** a new look from a wardrobe entry plus overrides (body is merged, not replaced) */
export const cast = (from: Look, over: Partial<Look> = {}): Look => ({ ...from, ...over, body: { ...(from.body ?? {}), ...(over.body ?? {}) } });

/** a near-black silhouette version of any look (creatures in the dark, figures against a bright window) */
export const silhouette = (L: Look, col = "#0c0a0e"): Look => ({
  ...L, skin: col, hair: col, top: col, topDark: col, legs: col, legsDark: col, boots: col, beard: L.beard ? col : undefined,
  hatCol: col, band: col, toque: L.toque ? col : undefined, toqueDark: L.toqueDark ? col : undefined, accent: col, apron: L.apron ? col : undefined,
  tie: undefined, scarf: L.scarf ? col : undefined, check: undefined, pattern: undefined, braces: undefined, belt: undefined, sash: undefined, lips: undefined,
});
