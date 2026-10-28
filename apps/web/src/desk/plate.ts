// The desk is one photograph (public/desk/desk.jpg, generated to match intro
// shot 8). Everything placed on it is measured in its pixels.

export const PLATE = { w: 2736, h: 1536, src: "/desk/desk.jpg" };

/** The CRT's glass. The live terminal sits here, under the photo's own reflections. */
export const GLASS = { x: 1002, y: 525, w: 563, h: 415, radius: 46 };

/** The patch around the candle flame that the shader redraws. */
export const FLAME = { x: 266, y: 822, w: 104, h: 168 };
/** Where the flame stands inside that patch, in its pixels: wick and tip. */
export const WICK = { x: 52, y: 153, tip: 53 };

/** The two framings: leaning in on the screen, or sitting back to see the desk. */
export type Framing = "close" | "wide";
export function frame(f: Framing, vw: number, vh: number) {
  if (f === "wide") {
    const s = Math.max(vw / PLATE.w, vh / PLATE.h);
    return { s, x: (vw - PLATE.w * s) / 2, y: (vh - PLATE.h * s) / 2 };
  }
  // The glass takes most of the view, a little above centre, as if you were leaning in to read.
  const s = Math.min((vw * 0.56) / GLASS.w, (vh * 0.7) / GLASS.h);
  const cx = GLASS.x + GLASS.w / 2;
  const cy = GLASS.y + GLASS.h / 2;
  return { s, x: vw / 2 - cx * s, y: vh * 0.47 - cy * s };
}
