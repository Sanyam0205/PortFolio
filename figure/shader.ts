// The figure and stairs are drawn as one fragment pass: stairs as flat 2D shapes,
// the figure as a signed distance field viewed front-on, then toon shaded so it
// reads as a soft drawing rather than a lit 3D model.

export const vertexShader = /* glsl */ `
void main() {
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

export const fragmentShader = /* glsl */ `
uniform vec2 uOrigin;
uniform float uScale;
uniform float uCamY;
uniform vec3 uJ[20];
uniform vec3 uM[3];
uniform float uYaw;
uniform vec3 uHead;
uniform vec3 uEye;
uniform vec4 uBox;
uniform vec3 uShadow;
uniform vec3 uStair;
uniform float uFlights;
uniform vec2 uFade;
uniform vec3 uPivot;
uniform vec3 uBend;

mat2 rot(float a) { float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }
float smin(float a, float b, float k) { float h = clamp(.5 + .5 * (b - a) / k, 0., 1.); return mix(b, a, h) - k * h * (1. - h); }
float sdCap(vec3 p, vec3 a, vec3 b, float r) { vec3 pa = p - a, ba = b - a; float h = clamp(dot(pa, ba) / dot(ba, ba), 0., 1.); return length(pa - ba * h) - r; }
float sdEll(vec3 p, vec3 r) { float k0 = length(p / r); float k1 = length(p / (r * r)); return k0 * (k0 - 1.) / k1; }
float box2(vec2 p, vec2 b, float r) { vec2 q = abs(p) - b + r; return length(max(q, 0.)) + min(max(q.x, q.y), 0.) - r; }

float wrapDist(vec3 p) {
  vec3 q = p - uJ[1]; q.xz = rot(-uYaw) * q.xz; q.yz = rot(.1) * q.yz;
  return length(vec2(length(q.xz) - .19, q.y * 1.1)) - .074;
}

vec2 fig(vec3 world) {
  vec3 p = world - uPivot;
  p.xy = rot(uBend.z) * p.xy;
  p /= vec3(uBend.x, uBend.y, uBend.x);
  p += uPivot;

  // One soft pear: narrow shoulders flowing into a wide belly.
  vec3 q = p - uJ[3]; q.xz = rot(-uYaw) * q.xz;
  float d = sdEll(q, vec3(.285, .27, .235));
  q = p - uJ[2]; q.xz = rot(-uYaw) * q.xz;
  d = smin(d, sdEll(q, vec3(.225, .2, .19)), .14);
  d = smin(d, sdCap(p, uJ[4], uJ[7], .085), .1);
  d = smin(d, sdCap(p, uJ[2], uJ[1], .1), .05);

  for (int i = 0; i < 2; i++) {
    // Thick arms that widen into fingerless mitts.
    vec3 S = i == 0 ? uJ[4] : uJ[7];
    vec3 E = i == 0 ? uJ[5] : uJ[8];
    vec3 H = i == 0 ? uJ[6] : uJ[9];
    float a = sdCap(p, S, E, .085);
    a = smin(a, sdCap(p, E, H, .085), .04);
    a = smin(a, sdCap(p, H, H + normalize(H - E) * .04, .095), .04);
    d = smin(d, a, .018);

    // Short thick legs on big round feet.
    vec3 Hp = i == 0 ? uJ[10] : uJ[13];
    vec3 K = i == 0 ? uJ[11] : uJ[14];
    vec3 A = i == 0 ? uJ[12] : uJ[15];
    vec3 F = i == 0 ? uJ[16] : uJ[17];
    float g = sdCap(p, Hp, K, .113);
    g = smin(g, sdCap(p, K, A, .11), .04);
    q = p - F; q.xz = rot(-uYaw) * q.xz;
    g = smin(g, sdEll(q, vec3(.135, .085, .16)), .035);
    d = smin(d, g, .025);
  }

  q = p - uJ[0]; q.xz = rot(-uYaw - uHead.x) * q.xz; q.yz = rot(uHead.y) * q.yz; q.xy = rot(uHead.z) * q.xy;
  d = smin(d, sdEll(q, vec3(.277, .228, .25)), .012);
  vec3 e = q - vec3(uEye.x * .018, -uEye.y * .012, 0.);
  vec3 er = vec3(.033, .056 * uEye.z, .032);
  float ey = min(sdEll(e - vec3(.096, -.07, .2), er), sdEll(e - vec3(-.096, -.07, .2), er));

  // Muffler: a chunky wrap, plus a long tail that swings on its own springs.
  float wrap = wrapDist(p);
  float tail = sdCap(p, uM[0], uM[1], .058);
  tail = smin(tail, sdCap(p, uM[1], uM[2], .056), .015);

  float s = min(uBend.x, uBend.y);
  vec2 r = vec2(d, 1.);
  if (ey < r.x) r = vec2(ey, 3.);
  if (wrap < r.x) r = vec2(wrap, 5.);
  if (tail < r.x) r = vec2(tail, 6.);
  r.x *= s;
  return r;
}

vec3 nor(vec3 p) {
  vec2 e = vec2(.0008, -.0008);
  return normalize(e.xyy * fig(p + e.xyy).x + e.yyx * fig(p + e.yyx).x + e.yxy * fig(p + e.yxy).x + e.xxx * fig(p + e.xxx).x);
}

float seg(vec2 p, vec2 a, vec2 b) { vec2 pa = p - a, ba = b - a; return length(pa - ba * clamp(dot(pa, ba) / dot(ba, ba), 0., 1.)); }

// One stepped line per flight, drawn in the same ink as the figure's outline.
float flightLine(vec2 w, float f) {
  if (f < 0. || f >= uFlights) return 1e3;
  float n = uStair.y, X = uStair.x, rise = uStair.z;
  float run = 2. * X / n, D = rise * n;
  float dir = mod(f, 2.) < .5 ? -1. : 1.;
  float start = -dir * X;
  float k0 = clamp(floor((w.x - start) * dir / run), 0., n - 1.);
  float d = 1e3;
  for (int i = -1; i <= 1; i++) {
    float k = clamp(k0 + float(i), 0., n - 1.);
    float top = -f * D - k * rise;
    vec2 a = vec2(start + dir * k * run, top);
    vec2 b = vec2(a.x, top - rise);
    vec2 c = vec2(start + dir * (k + 1.) * run, top - rise);
    d = min(d, min(seg(w, a, b), seg(w, b, c)));
  }
  return d;
}

float landingLine(vec2 w, float j) {
  if (j < 0. || j > uFlights) return 1e3;
  float X = uStair.x, D = uStair.z * uStair.y;
  float side = mod(j, 2.) < .5 ? 1. : -1.;
  float y = -j * D;
  return seg(w, vec2(side * X, y), vec2(side * (X + .66), y));
}

// A pale block under the line gives the steps a little body without more outlines.
float flight(vec2 w, float f) {
  if (f < 0. || f >= uFlights) return 1e3;
  float n = uStair.y, X = uStair.x, rise = uStair.z;
  float run = 2. * X / n, D = rise * n, thick = rise + .07;
  float dir = mod(f, 2.) < .5 ? -1. : 1.;
  float start = -dir * X;
  float k0 = clamp(floor((w.x - start) * dir / run), 0., n - 1.);
  float d = 1e3;
  for (int i = -1; i <= 1; i++) {
    float k = clamp(k0 + float(i), 0., n - 1.);
    vec2 c = vec2(start + dir * (k + .5) * run, -f * D - (k + 1.) * rise - thick * .5);
    d = min(d, box2(w - c, vec2(run * .5 + .001, thick * .5), .012));
  }
  return d;
}

float landing(vec2 w, float j) {
  if (j < 0. || j > uFlights) return 1e3;
  float X = uStair.x, D = uStair.z * uStair.y;
  float side = mod(j, 2.) < .5 ? 1. : -1.;
  float thick = uStair.z + .07;
  return box2(w - vec2(side * (X + .28), -j * D - thick * .5), vec2(.38, thick * .5), .012);
}

void over(inout vec3 c, inout float a, vec3 lc, float la) {
  float o = la + a * (1. - la);
  if (o > .0001) c = (lc * la + c * a * (1. - la)) / o;
  a = o;
}

void main() {
  vec2 w = (gl_FragCoord.xy - uOrigin) / uScale;
  w.y += uCamY;
  float px = 1. / uScale;
  vec3 c = vec3(0.);
  float a = 0.;

  if (abs(w.x) < uStair.x + .6) {
    float D = uStair.z * uStair.y;
    float f0 = floor(-w.y / D);
    float sd = min(flight(w, f0), min(flight(w, f0 - 1.), flight(w, f0 + 1.)));
    float j0 = floor(-w.y / D + .5);
    sd = min(sd, min(landing(w, j0), landing(w, j0 + 1.)));
    float fade = smoothstep(uFade.x, uFade.x + 48., gl_FragCoord.y) * (1. - smoothstep(uFade.y - 48., uFade.y, gl_FragCoord.y));
    float line = min(flightLine(w, f0), min(flightLine(w, f0 - 1.), flightLine(w, f0 + 1.)));
    line = min(line, min(landingLine(w, j0), landingLine(w, j0 + 1.)));
    over(c, a, vec3(.975, .978, .984), (1. - smoothstep(-px, px, sd)) * fade);
    over(c, a, vec3(.6, .635, .69), (1. - smoothstep(px * .6, px * 1.8, line)) * fade);
  }

  vec2 sh = (w - uShadow.xy) / vec2(.38, .024);
  over(c, a, vec3(.72, .74, .78), uShadow.z * .55 * (1. - smoothstep(.55, 1., length(sh))));

  if (w.x > uBox.x && w.x < uBox.z && w.y > uBox.y && w.y < uBox.w) {
    float tt = 0., md = 1e3, id = -1.;
    vec3 p;
    for (int i = 0; i < 64; i++) {
      p = vec3(w, 1.2 - tt);
      vec2 h = fig(p);
      md = min(md, h.x);
      if (h.x < .0012) { id = h.y; break; }
      tt += h.x;
      if (tt > 2.4) break;
    }
    vec3 ink = vec3(.5, .535, .62);
    if (id > 0.) {
      vec3 n = nor(p);
      float nv = clamp(n.z, 0., 1.);
      float tl = dot(n, normalize(vec3(-.35, .6, .72)));
      // Airbrushed rather than lit: white in the middle, pale lavender at the edges.
      vec3 m = mix(vec3(.875, .885, .945), vec3(1.), smoothstep(-.25, .5, tl));
      m = mix(m, vec3(.84, .855, .925), (1. - smoothstep(.16, .62, nv)) * .75);
      if (id < 1.5) m = mix(vec3(.83, .845, .915), m, smoothstep(0., .07, wrapDist(p)));
      m = mix(m, ink, 1. - smoothstep(.07, .17, nv));
      if (id > 2.5 && id < 4.) {
        m = vec3(.05, .05, .065);
        if (dot(n, normalize(vec3(-.32, .5, .8))) > .975) m = vec3(.96);
      }
      if (id > 4.) {
        // Maroon and black stripes: diagonal around the wrap, bands down the tail.
        vec3 local = p - uJ[1];
        local.xz = rot(-uYaw) * local.xz;
        float band = id < 5.5 ? atan(local.x, local.z) * 2.3 + local.y * 6. : length(p - uM[0]) / .164;
        float st = smoothstep(.22, .28, abs(fract(band) - .5));
        vec3 cloth = mix(vec3(.54, .07, .12), vec3(.085, .07, .1), st);
        m = cloth * mix(.82, 1., smoothstep(-.1, .2, tl));
        m = mix(m, vec3(.04, .025, .04), (1. - smoothstep(.08, .2, nv)) * .85);
      }
      over(c, a, m, 1.);
    } else {
      over(c, a, ink, 1. - smoothstep(.006, .012, md));
    }
  }

  gl_FragColor = vec4(c * a, a);
}
`;
