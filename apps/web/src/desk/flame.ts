import { FLAME, PLATE, WICK } from "./plate";

// The candle flame, alive. A WebGL pass over the flame's patch of the desk
// photo: the flame sways, breathes, and leans away from the cursor. Snuffed,
// its bright pixels are replaced by the wall just above, so it is simply gone.

const VERT = `attribute vec2 p; varying vec2 uv; void main() { uv = vec2(p.x * 0.5 + 0.5, 0.5 - p.y * 0.5); gl_Position = vec4(p, 0.0, 1.0); }`;

const FRAG = `precision mediump float;
varying vec2 uv;
uniform sampler2D img;
uniform vec4 box;      // the patch in plate uv: x, y, w, h
uniform vec2 wick;     // wick in patch uv
uniform float tip;     // flame tip height in patch uv
uniform float t;
uniform float lean;    // -1..1, away from the cursor
uniform float lit;     // 1 lit, 0 snuffed

void main() {
  // 0 at the wick, 1 at the tip: the higher up the flame, the more it moves.
  float h = clamp((wick.y - uv.y) / (wick.y - tip), 0.0, 1.0);
  float sway = (sin(t * 7.3) * 0.5 + sin(t * 12.9 + 1.3) * 0.3 + sin(t * 3.1) * 0.2) * 0.012;
  float dx = (sway + lean * 0.05) * h * h;
  vec2 src = uv + vec2(-dx, 0.0);
  vec4 c = texture2D(img, box.xy + src * box.zw);
  float breathe = 0.93 + 0.07 * sin(t * 9.0) * sin(t * 2.3);
  float luma = dot(c.rgb, vec3(0.299, 0.587, 0.114));
  // The flame and its halo: bright, above the wick, near its column.
  float column = 1.0 - smoothstep(0.08, 0.22, abs(uv.x - wick.x));
  float flame = smoothstep(0.42, 0.75, luma) * step(uv.y, wick.y) * column;
  vec3 lifted = c.rgb * mix(1.0, breathe * 1.06, flame);
  // Snuffed: the wall either side of the flame, at the same height, stands in for it.
  vec3 wall = 0.5 * (texture2D(img, box.xy + vec2(wick.x - 0.34, uv.y) * box.zw).rgb
                   + texture2D(img, box.xy + vec2(wick.x + 0.34, uv.y) * box.zw).rgb);
  gl_FragColor = vec4(mix(mix(c.rgb, wall, flame), lifted, lit), 1.0);
}`;

export type Flame = {
  setLean: (l: number) => void;
  setLit: (on: boolean) => void;
  /** Current brightness, 0..1, for the warm light around the desk to follow. */
  glow: () => number;
  dispose: () => void;
};

export function mountFlame(canvas: HTMLCanvasElement, image: HTMLImageElement): Flame | null {
  const gl = canvas.getContext("webgl", { premultipliedAlpha: false });
  if (!gl) return null;
  const sh = (type: number, src: string) => { const s = gl.createShader(type)!; gl.shaderSource(s, src); gl.compileShader(s); return s; };
  const prog = gl.createProgram()!;
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT));
  gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null;
  gl.useProgram(prog);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const p = gl.getAttribLocation(prog, "p");
  gl.enableVertexAttribArray(p);
  gl.vertexAttribPointer(p, 2, gl.FLOAT, false, 0, 0);

  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);

  const u = (n: string) => gl.getUniformLocation(prog, n);
  gl.uniform4f(u("box"), FLAME.x / PLATE.w, FLAME.y / PLATE.h, FLAME.w / PLATE.w, FLAME.h / PLATE.h);
  gl.uniform2f(u("wick"), WICK.x / FLAME.w, WICK.y / FLAME.h);
  gl.uniform1f(u("tip"), WICK.tip / FLAME.h);

  canvas.width = FLAME.w;
  canvas.height = FLAME.h;
  gl.viewport(0, 0, FLAME.w, FLAME.h);

  let lean = 0, want = 0, lit = 1, wantLit = 1, raf = 0;
  const start = performance.now();
  const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const draw = (now: number) => {
    const t = still ? 0 : (now - start) / 1000;
    lean += (want - lean) * 0.08;
    lit += (wantLit - lit) * 0.12;
    gl.uniform1f(u("t"), t);
    gl.uniform1f(u("lean"), lean);
    gl.uniform1f(u("lit"), lit);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    raf = requestAnimationFrame(draw);
  };
  raf = requestAnimationFrame(draw);

  return {
    setLean: (l) => { want = Math.max(-1, Math.min(1, l)); },
    setLit: (on) => { wantLit = on ? 1 : 0; },
    glow: () => lit * (0.9 + 0.1 * Math.sin((performance.now() - start) / 110) * Math.sin((performance.now() - start) / 437)),
    dispose: () => { cancelAnimationFrame(raf); gl.deleteTexture(tex); gl.deleteBuffer(buf); gl.deleteProgram(prog); },
  };
}
