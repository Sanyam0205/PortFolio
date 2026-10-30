// The figure's brain and body. Plain TypeScript with no React in it: scroll,
// pointer and UI events go in, and each frame it produces joint positions for
// the shader plus events (speech, marks, zone changes) for the page.

export type Zone = "about" | "work" | "experience" | "contact";
export type Mark = "question" | "exclaim" | "spark" | "z" | "puff" | "dizzy" | null;
export type Rect = { x: number; y: number; w: number; h: number };
export type Sign = { landing: number; id: Zone; label: string };

export type AvatarEvents = {
  say: (text: string) => void;
  zone: (zone: Zone) => void;
  signs: (signs: Sign[]) => void;
};

const X = 0.7;
const STEPS = 6;
const RISE = 0.2;
const FLIGHT = STEPS * RISE;
const TILE_W = 0.8;
const HEAD_Y = 1.272;

type Limb = { A: number; F: number; EA: number; EF: number };
type Pose = {
  a: Limb;
  b: Limb;
  wave: number;
  headYaw: number;
  headPitch: number;
  headRoll: number;
};

const REST: Limb = { A: 0.42, F: 0.04, EA: -0.04, EF: 0.04 };

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const smooth = (v: number) => v * v * (3 - 2 * v);

type V3 = [number, number, number];
const add = (p: V3, d: V3, s: number): V3 => [p[0] + d[0] * s, p[1] + d[1] * s, p[2] + d[2] * s];
const dir = (a: number, f: number, side: number): V3 => {
  const v: V3 = [side * Math.sin(a) * Math.cos(f), -Math.cos(a) * Math.cos(f), Math.sin(f)];
  const l = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / l, v[1] / l, v[2] / l];
};

export class Avatar {
  // Output read by the renderer.
  joints = new Float32Array(60);
  muffler = new Float32Array(9);
  yaw = 0.2;
  headAngles: V3 = [0, 0, 0];
  eye: V3 = [0, 0, 1];
  box: [number, number, number, number] = [0, 0, 0, 0];
  shadow: V3 = [0, 0, 0];
  pivot: V3 = [0, 0, 0];
  bend: V3 = [1, 1, 0];
  camY = 0;
  scale = 240;
  mark: Mark = null;
  markSerial = 0;
  stair = { X, steps: STEPS, rise: RISE };
  flights = 4;
  stage: Rect = { x: 0, y: 0, w: 600, h: 500 };
  reduced = false;

  private events: AvatarEvents;
  private t = 0;
  private s = 0;
  private sOffset = 0;
  private goalS: number | null = null;
  private onGoal: (() => void) | null = null;
  private x = X;
  private y = 0;
  private prevX = X;
  private v = 0;
  private walkPhase = 0;
  private ox = 0;
  private oy = 0;
  private vx = 0;
  private vy = 0;
  private dragging = false;
  private airborne = false;
  private grabX = 0;
  private grabY = 0;
  private targetOx = 0;
  private targetOy = 0;
  private squash = 0;
  private squashV = 0;
  private roll = 0;
  private sit = 0;
  private idleFor = 0;
  private scrollIdle = 10;
  private lastScrollS = 0;
  private peakS = 0;
  private jogFor = 0;
  private pantUntil = -1;
  private waveUntil = 2.6;
  private hopAt = -9;
  private presentUntil = 0;
  private presenting = false;
  private holding = false;
  private talkUntil = 3;
  private thinkUntil = 0;
  private typing = false;
  private dizzyUntil = -1;
  private blinkAt = -9;
  private nextBlink = 2;
  private pokes = 0;
  private lastPoke = -9;
  private lastQuip = -30;
  private lastAnswer = -30;
  private navUntil = 0;
  private lastLeg = 0;
  private markUntil = 0;
  private hoverPx: { x: number; y: number } | null = null;
  private pointer = { x: 0, y: 0, sx: 0, sy: 0, seen: false, movedAt: -9, inStage: false };
  private tail: V3[] = [[0, 1, 0.2], [0, 0.9, 0.2], [0, 0.8, 0.2]];
  private tailPrev: V3[] = [[0, 1, 0.2], [0, 0.9, 0.2], [0, 0.8, 0.2]];
  private pose: Record<string, number> | null = null;
  private zone: Zone | null = null;
  private knots: { sy: number; s: number }[] = [{ sy: 0, s: 0 }, { sy: 1000, s: 2 }, { sy: 2000, s: 4 }, { sy: 3000, s: 6 }];
  private signsKey = "";
  private tight = false;
  private gaze: { x: number; y: number } | null = null;

  constructor(events: AvatarEvents) {
    this.events = events;
  }

  // --- Layout --------------------------------------------------------------

  setStage(rect: Rect) {
    // The stage can pass through zero height while the phone guide folds.
    if (rect.w < 8 || rect.h < 8) return;
    this.stage = rect;
    // In the phone's reading strip he's cropped closer so he stays a character, not a speck.
    this.tight = rect.w < 140;
    this.scale = this.tight ? Math.min((rect.h * 0.66) / 1.5, rect.w / 2) : Math.min((rect.h * 0.62) / 1.5, rect.w / 2.5);
  }

  /** Maps scroll position to stair progress so each section top lands on a landing. */
  measure(workTop: number, experienceTop: number, contactTop: number, maxScroll: number) {
    const contactAt = Math.min(contactTop, maxScroll);
    const experienceAt = Math.min(experienceTop, contactAt - 1);
    // Even landings are on the right, so he always arrives beside the information.
    const flightsFor = (px: number) => Math.max(2, Math.round(px / 840) * 2);
    const sWork = flightsFor(workTop);
    const sExperience = sWork + flightsFor(experienceAt - workTop);
    const sContact = sExperience + flightsFor(contactAt - experienceAt);
    if (!this.goalS) this.flights = sContact;
    this.knots = [
      { sy: 0, s: 0 },
      { sy: Math.max(1, workTop), s: sWork },
      { sy: Math.max(workTop + 1, experienceAt), s: sExperience },
      { sy: Math.max(workTop + 2, contactAt), s: sContact },
    ];
    const signs: Sign[] = [
      { landing: 0, id: "about", label: "About" },
      { landing: sWork, id: "work", label: "Work" },
      { landing: sExperience, id: "experience", label: "Experience" },
      { landing: sContact, id: "contact", label: "Contact" },
    ];
    const key = signs.map((s) => s.landing).join();
    if (key !== this.signsKey) {
      this.signsKey = key;
      this.events.signs(signs);
    }
  }

  private scrollToS(sy: number) {
    const k = this.knots;
    for (let i = 1; i < k.length; i++) {
      if (sy <= k[i].sy) {
        const u = (sy - k[i - 1].sy) / Math.max(1, k[i].sy - k[i - 1].sy);
        return k[i - 1].s + (k[i].s - k[i - 1].s) * clamp(u, 0, 1);
      }
    }
    return k[k.length - 1].s;
  }

  private pathAt(s: number) {
    const c = clamp(s, 0, this.flights);
    let f = Math.floor(c);
    let u = c - f;
    if (f >= this.flights) { f = this.flights - 1; u = 1; }
    const even = f % 2 === 0;
    const x = even ? X - 2 * X * u : -X + 2 * X * u;
    const k = Math.min(STEPS - 1, Math.floor(u * STEPS));
    const fr = u * STEPS - k;
    const e = u >= 1 ? 1 : smooth(Math.min(1, fr / 0.35));
    return { x, y: -f * FLIGHT - RISE * (k + e), even };
  }

  // --- World and screen -----------------------------------------------------

  worldToPx(wx: number, wy: number) {
    return {
      x: this.stage.x + this.stage.w / 2 + wx * this.scale,
      y: this.stage.y + this.stage.h / 2 - (wy - this.camY) * this.scale,
    };
  }

  private pxToWorld(px: number, py: number) {
    return {
      x: (px - this.stage.x - this.stage.w / 2) / this.scale,
      y: this.camY - (py - this.stage.y - this.stage.h / 2) / this.scale,
    };
  }

  footPx() {
    return this.worldToPx(this.x, this.y);
  }

  landingPx(j: number, extra = 0) {
    const side = j % 2 === 0 ? 1 : -1;
    return this.worldToPx(side * (X + 0.5 + extra), -j * FLIGHT);
  }

  headPx() {
    const p = this.worldToPx(this.x, this.y + HEAD_Y);
    return { x: p.x, y: p.y, r: 0.25 * this.scale };
  }

  /** Screen rectangle of a project held overhead, used by the tile catch. */
  heldTile(): Rect {
    const c = this.worldToPx(this.x, this.y + 1.5 + 0.3);
    const w = TILE_W * this.scale;
    const h = w * 0.75;
    return { x: c.x - w / 2, y: c.y - h / 2, w, h };
  }

  figureRect(): Rect {
    const tl = this.worldToPx(this.box[0], this.box[3]);
    const br = this.worldToPx(this.box[2], this.box[1]);
    return { x: tl.x, y: tl.y, w: br.x - tl.x, h: br.y - tl.y };
  }

  // --- Input from the page ---------------------------------------------------

  pointerMove(px: number, py: number) {
    const p = this.pointer;
    if (!p.seen) { p.sx = px; p.sy = py; }
    p.x = px; p.y = py; p.seen = true; p.movedAt = this.t;
    const st = this.stage;
    p.inStage = px >= st.x - 40 && px <= st.x + st.w + 20 && py >= st.y - 40 && py <= st.y + st.h + 40;
    if (p.inStage) this.wake();
    if (this.dragging) {
      const w = this.pxToWorld(px, py);
      this.targetOx = w.x - this.grabX;
      this.targetOy = w.y - this.grabY;
    }
  }

  hover(px: { x: number; y: number } | null) {
    if (px && !this.hoverPx && this.t - this.lastQuip > 9 && !this.isBusy()) {
      this.setMark("question", 1.6);
      if (Math.random() < 0.35) this.quip("Ooh, that one?");
    }
    this.hoverPx = px;
    if (px) this.wake();
  }

  /** Touch screens have no cursor, so he looks at whatever the visitor is reading. */
  setGaze(px: { x: number; y: number } | null) {
    this.gaze = px;
  }

  setTyping(on: boolean) {
    this.typing = on;
    if (on) this.wake();
  }

  think(seconds: number) {
    this.thinkUntil = this.t + seconds;
    this.setMark("question", seconds);
  }

  talk(text: string) {
    this.talkUntil = this.t + Math.min(5, 0.6 + text.length * 0.026);
    this.wake();
  }

  answered() {
    this.lastQuip = this.t;
    this.lastAnswer = this.t;
    this.setMark("spark", 1.2);
    this.squashV += 1.6;
  }

  celebrate() {
    this.wake();
    this.hopAt = this.t;
    this.waveUntil = this.t + 2;
    this.setMark("spark", 1.4);
  }

  navigate() {
    this.navUntil = this.t + 2.5;
    this.sOffset = 0;
    this.wake();
  }

  poke() {
    this.pokes = this.t - this.lastPoke < 4 ? this.pokes + 1 : 1;
    this.lastPoke = this.t;
    this.wake();
    this.hopAt = this.t;
    this.squash = -0.2;
    this.squashV = 0;
    this.waveUntil = this.t + 1.4;
    this.setMark(this.pokes > 3 ? "exclaim" : "spark", 1);
    const lines = ["Hello again.", "Still here. Ask me anything.", "Want to see the work?", "Ready when you are."];
    this.events.say(this.pokes > 3 ? "You have my full attention." : lines[Math.floor(Math.random() * lines.length)]);
  }

  startDrag(px: number, py: number) {
    const w = this.pxToWorld(px, py);
    this.dragging = true;
    this.airborne = true;
    this.grabX = w.x - this.ox;
    this.grabY = w.y - this.oy;
    this.targetOx = this.ox;
    this.targetOy = this.oy;
    this.wake();
    this.setMark("exclaim", 0.9);
    this.events.say("Whoa, going up!");
  }

  endDrag() {
    if (!this.dragging) return;
    this.dragging = false;
    this.vx = clamp(this.vx, -6, 6);
    this.vy = clamp(this.vy, -6, 6);
  }

  /** The figure walks to the nearest landing and reaches up for the incoming tile. */
  beginCatch(onArrive?: () => void) {
    this.wake();
    this.holding = true;
    this.presenting = false;
    this.sOffset = 0;
    this.ox = 0; this.oy = 0; this.vx = 0; this.vy = 0;
    this.airborne = false;
    this.dragging = false;
    this.goalS = clamp(Math.round(this.s), 0, this.flights);
    this.onGoal = onArrive ?? null;
  }

  caught() {
    this.squash = -0.2;
    this.squashV = 0;
    this.setMark("spark", 1);
  }

  present() {
    this.holding = false;
    this.presenting = true;
    this.presentUntil = this.t + 1.2;
  }

  release() {
    this.holding = false;
    this.presenting = false;
    this.goalS = null;
    this.onGoal = null;
    this.wake();
  }

  private isBusy() {
    return this.holding || this.presenting || this.dragging;
  }

  private wake() {
    this.idleFor = 0;
  }

  private quip(text: string) {
    if (this.t - this.lastQuip < 9 || this.t < this.talkUntil) return;
    this.lastQuip = this.t;
    this.events.say(text);
  }

  private setMark(mark: Mark, seconds: number) {
    this.mark = mark;
    this.markSerial++;
    this.markUntil = this.t + seconds;
  }

  // --- Simulation -----------------------------------------------------------

  step(dtRaw: number) {
    const dt = Math.min(0.05, Math.max(0, dtRaw));
    this.t += dt;
    const t = this.t;
    const E = (r: number) => (this.reduced ? 1 : 1 - Math.exp(-dt * r));

    const sy = window.scrollY || 0;
    const scrollS = this.scrollToS(sy);
    if (Math.abs(scrollS - this.lastScrollS) > 0.0008) { this.scrollIdle = 0; this.wake(); } else this.scrollIdle += dt;

    this.updateZone(sy);
    this.reactToScroll(scrollS, dt);
    this.lastScrollS = scrollS;
    this.followPointer(dt);

    // Walk along the stairs: scroll sets the destination, the legs catch up.
    const target = this.goalS !== null ? this.goalS : clamp(scrollS + this.sOffset, 0, this.flights);
    const gap = target - this.s;
    const limit = Math.abs(gap) > 1.2 ? 3.2 : 1.5;
    let ds = gap * E(6);
    if (!this.reduced) ds = clamp(ds, -limit * dt, limit * dt);
    this.s += ds;
    if (this.goalS !== null && Math.abs(this.s - this.goalS) < 0.012) {
      this.s = this.goalS;
      const cb = this.onGoal;
      this.onGoal = null;
      cb?.();
    }

    this.updateFree(dt, E);

    const path = this.pathAt(this.s);
    this.prevX = this.x;
    this.x = path.x + this.ox;
    this.y = path.y + this.oy;
    const vel = dt > 0 ? (this.x - this.prevX) / dt : 0;
    this.v += (vel - this.v) * E(10);
    const grounded = !this.airborne;
    const w = grounded ? Math.min(1.6, Math.abs(this.v) / 0.5) : 0;
    const walk = Math.min(1, w);
    const jog = clamp((w - 1) / 0.6, 0, 1);
    this.walkPhase += Math.abs(this.x - this.prevX) * (grounded ? 9 : 0);

    const legBeat = Math.floor(this.walkPhase / Math.PI);
    if (legBeat !== this.lastLeg) { this.lastLeg = legBeat; if (grounded && !this.reduced) this.squashV -= 0.55 + jog * 0.5; }
    const kS = 90, cS = 9;
    this.squashV += (-kS * this.squash - cS * this.squashV) * dt;
    this.squash = clamp(this.squash + this.squashV * dt, -0.3, 0.3);

    this.updateIdle(dt);

    const seated = this.idleFor > 6 && grounded && !this.isBusy();
    this.sit += ((seated ? 1 : 0) - this.sit) * E(4);
    const asleep = this.idleFor > 22 && this.sit > 0.9;
    if (asleep && t > this.markUntil) this.setMark("z", 2.4);
    if (t > this.markUntil && this.mark) { this.mark = null; this.markSerial++; }

    const pointerSeen = this.pointer.seen;
    const hover = this.hoverPx;
    let faceT = 0.22;
    if (this.sit > 0.5) faceT = 0;
    if (hover || this.presenting) faceT = 0.6;
    if (walk > 0.08) faceT = Math.sign(this.v) * 1.15;
    if (this.holding && walk < 0.3) faceT = 0;
    if (!grounded) faceT = 0;
    this.yaw += (faceT - this.yaw) * E(7);

    // The camera only moves when his feet leave a band, so he travels around the
    // stage instead of being pinned to one spot, and stairs always show below him.
    const hs = this.stage.h / this.scale;
    const firstFrame = t <= dt + 1e-6;
    const camTarget = firstFrame ? path.y + 0.2 * hs : clamp(this.camY, path.y + (this.tight ? 0.3 : 0.12) * hs, path.y + (this.tight ? 0.36 : 0.26) * hs);
    this.camY = firstFrame ? camTarget : this.camY + (camTarget - this.camY) * E(7);

    // Pointer tracking.
    const p = this.pointer;
    p.sx += (p.x - p.sx) * E(5);
    p.sy += (p.y - p.sy) * E(5);
    const head = this.worldToPx(this.x, this.y + HEAD_Y);
    const gazing = this.gaze && t - p.movedAt > 2.5;
    const lookPx = hover ?? (gazing ? this.gaze : pointerSeen ? { x: p.sx, y: p.sy } : null);
    const talking = t < this.talkUntil;
    let lookX = 0.2;
    let lookY = 0.03;
    if (lookPx) {
      lookX = clamp(((lookPx.x - head.x) / Math.max(1, this.stage.w * 0.6)) * (talking && !hover ? 0.5 : 1), -1.1, 1.1);
      lookY = clamp(((lookPx.y - head.y) / Math.max(1, this.stage.h)) * 1.1, -0.4, 0.16);
    }

    const pose = this.choosePose(t, talking, walk);
    if (!this.pose) this.pose = this.flatten(pose);
    const flat = this.flatten(pose);
    for (const k in flat) this.pose[k] += (flat[k] - this.pose[k]) * E(this.dragging ? 12 : 5);
    const c = this.pose;

    if (t > this.nextBlink) { this.blinkAt = t; this.nextBlink = t + 2.2 + Math.random() * 3.2; }
    const bt = t - this.blinkAt;
    let blink = bt < 0.16 ? 0.12 + 0.88 * Math.abs(bt / 0.08 - 1) : 1;
    if (asleep) blink = 0.12;
    if (!grounded) blink = 1.2;

    const ht = t - this.hopAt;
    const hop = ht > 0 && ht < 0.45 ? Math.sin((ht / 0.45) * Math.PI) * 0.1 : 0;

    this.buildBody(t, dt, c, walk, jog, hop, E);

    const follow = 1 - walk * 0.8;
    const dizzy = t < this.dizzyUntil ? Math.sin(t * 9) * 0.22 : 0;
    const curious = pointerSeen && t - p.movedAt > 1.1 && !talking && !asleep ? Math.min(1, (t - p.movedAt - 1.1) * 2) : 0;
    const waddle = Math.sin(this.walkPhase) * 0.03 * walk;
    // Keep his face toward us so both eyes always read as two separate eyes.
    const facing = clamp(this.yaw + clamp(lookX - this.yaw, -1, 1) * follow + c.headYaw, -0.5, 0.5);
    this.headAngles = [
      facing - this.yaw,
      lookY * follow + c.headPitch + this.sit * 0.04,
      c.headRoll + curious * 0.2 * (p.sx >= head.x ? -1 : 1) + waddle * 1.5 + dizzy,
    ];
    this.eye = [clamp(lookX, -1, 1) * follow * (1 - (Math.abs(facing) / 0.5) * 0.6), clamp(lookY * 2.2, -1, 1) * follow, blink];

    const rollT = this.airborne ? clamp(this.vx * 0.16, -0.85, 0.85) : 0;
    this.roll += (rollT - this.roll) * E(8);
    const stretch = this.airborne ? clamp(Math.abs(this.vy) * 0.018, 0, 0.12) : 0;
    const sqY = 1 + this.squash + stretch;
    const sqX = 1 - this.squash * 0.6 - stretch * 0.5;
    this.bend = [sqX, sqY, this.roll];
    this.pivot = [this.x, this.y + (this.airborne ? 0.8 : 0.02), 0];

    const air = this.oy > 0 ? clamp(1 - this.oy / 1.6, 0.15, 1) : 1;
    this.shadow = [this.x, path.y + 0.008, air];
  }

  private updateZone(sy: number) {
    const k = this.knots;
    const vh = window.innerHeight;
    const at = sy + vh * 0.4;
    const zone: Zone = at >= k[3].sy ? "contact" : at >= k[2].sy ? "experience" : at >= k[1].sy ? "work" : "about";
    if (zone !== this.zone) {
      const first = this.zone === null;
      const cameUp = this.zone === "contact" || this.zone === "experience";
      this.zone = zone;
      this.events.zone(zone);
      // A section line never talks over an answer the visitor just asked for.
      if (!first && !this.holding && !this.presenting && this.t - this.lastAnswer > 5) {
        if (zone === "work") {
          if (!cameUp) this.presentUntil = this.t + 2.5;
          this.events.say(cameUp ? "Looking for something? The work's right here." : "Here's what I've built. Pick any project and I'll grab it for you.");
        }
        if (zone === "experience") this.events.say("Where I've worked and what I work with. Click a skill to see it in my projects.");
        if (zone === "contact") { this.waveUntil = this.t + 2; this.events.say("That's me. Knock on the door to copy my email."); }
        if (zone === "about") this.events.say("Back up top. Scroll down when you're ready.");
        this.lastQuip = this.t;
      }
    }
  }

  private reactToScroll(scrollS: number, dt: number) {
    if (this.reduced) return;
    this.peakS = Math.max(this.peakS, scrollS);
    if (this.peakS - scrollS > 0.45 && this.t > this.navUntil) {
      this.peakS = scrollS;
      this.quip("Looking for something?");
    }
    const speed = Math.abs(this.v);
    if (speed > 1.25 && !this.airborne) this.jogFor += dt; else if (speed < 0.3) {
      if (this.jogFor > 0.5) {
        this.pantUntil = this.t + 2.6;
        this.setMark("puff", 2.4);
        this.quip("Phew. Short legs, remember?");
      }
      this.jogFor = 0;
    }
  }

  /** When the pointer is near, the figure wanders up or down the stairs toward it. */
  private followPointer(dt: number) {
    const p = this.pointer;
    const quiet = this.scrollIdle > 0.4 && !this.isBusy() && !this.airborne && this.goalS === null;
    if (quiet && p.seen && p.inStage && this.t - p.movedAt < 2.5 && this.sit < 0.3) {
      const want = this.pxToWorld(p.x, p.y).x - this.x;
      if (Math.abs(want) > 0.28) {
        const path = this.pathAt(this.s);
        const outward = Math.abs(this.x) > X - 0.03 && Math.sign(want) === Math.sign(this.x);
        if (!outward) {
          const dsdx = path.even ? -1 : 1;
          this.sOffset = clamp(this.sOffset + Math.sign(want) * dsdx * 0.38 * dt, -0.8, 0.8);
        }
      }
    } else if (this.scrollIdle < 0.3) {
      this.sOffset *= 1 - Math.min(1, dt * 4);
    }
  }

  private updateFree(dt: number, E: (r: number) => number) {
    if (this.dragging) {
      const k = E(18);
      const nx = this.ox + (this.targetOx - this.ox) * k;
      const ny = this.oy + (this.targetOy - this.oy) * k;
      if (dt > 0) {
        this.vx += ((nx - this.ox) / dt - this.vx) * E(14);
        this.vy += ((ny - this.oy) / dt - this.vy) * E(14);
      }
      this.ox = nx; this.oy = Math.max(0, ny);
      return;
    }
    if (this.airborne) {
      this.vy -= 7 * dt;
      this.ox += this.vx * dt;
      this.oy += this.vy * dt;
      const left = this.pxToWorld(10, 0).x - this.pathAt(this.s).x;
      const right = this.pxToWorld(window.innerWidth - 10, 0).x - this.pathAt(this.s).x;
      if (this.ox < left) { this.ox = left; this.vx = Math.abs(this.vx) * 0.5; }
      if (this.ox > right) { this.ox = right; this.vx = -Math.abs(this.vx) * 0.5; }
      if (this.oy <= 0) {
        this.oy = 0;
        const impact = -this.vy;
        this.squash = -clamp(impact * 0.07, 0.05, 0.28);
        this.squashV = 0;
        if (impact > 1.6) {
          this.vy = impact * 0.34;
          this.vx *= 0.6;
          if (impact > 3.2) {
            this.dizzyUntil = this.t + 1.8;
            this.setMark("dizzy", 1.8);
            this.quip("Give me a second.");
          }
        } else {
          this.vy = 0; this.vx = 0;
          this.airborne = false;
          this.lastQuip = -30;
          this.quip("Soft landing. Where were we?");
        }
      }
      return;
    }
    // Back on the ground: stroll home to the stairs.
    if (Math.abs(this.ox) > 0.01 && !this.reduced && this.t > this.dizzyUntil) {
      const step = Math.sign(this.ox) * Math.min(Math.abs(this.ox), 1 * dt);
      this.ox -= step;
    } else if (this.reduced) this.ox = 0;
  }

  private updateIdle(dt: number) {
    const talking = this.t < this.talkUntil;
    const busy = this.isBusy() || talking || this.airborne || this.typing || this.hoverPx !== null || Math.abs(this.v) > 0.1;
    if (busy) this.idleFor = 0; else this.idleFor += dt;
  }

  private choosePose(t: number, talking: boolean, walk: number): Pose {
    const base: Pose = { a: REST, b: REST, wave: 0, headYaw: 0, headPitch: 0.04, headRoll: 0 };
    if (this.dragging || this.airborne) {
      return {
        ...base,
        a: { A: 2.2 + Math.sin(t * 13) * 0.5, F: 0.2, EA: 0.3, EF: 0 },
        b: { A: 2.2 + Math.sin(t * 11 + 1) * 0.5, F: 0.2, EA: 0.3, EF: 0 },
      };
    }
    if (this.holding) {
      const up: Limb = { A: 2.75, F: 0.08, EA: 0.2, EF: 0 };
      return { ...base, a: up, b: up, headPitch: -0.28 };
    }
    if (t < this.waveUntil) return { ...base, a: { A: 2.2, F: 0.2, EA: 0.7, EF: 0 }, wave: 1, headRoll: 0.1 };
    if (this.presenting || t < this.presentUntil) {
      return { ...base, a: { A: 1.35, F: 0.15, EA: -0.05, EF: 0.1 }, headYaw: 0.3, headPitch: 0.02 };
    }
    if (this.hoverPx) {
      const up = this.hoverPx.y < this.stage.y + this.stage.h * 0.45;
      return { ...base, a: { A: up ? 1.9 : 1.35, F: 0.15, EA: 0, EF: 0.05 }, headRoll: 0.12 };
    }
    if (t < this.pantUntil) {
      const heave = Math.sin(t * 9) * 0.04;
      return { ...base, a: { A: 0.35, F: 0.5, EA: 0, EF: 0.1 }, b: { A: 0.35, F: 0.5, EA: 0, EF: 0.1 }, headPitch: 0.28 + heave };
    }
    if (this.typing || t < this.thinkUntil) {
      return { ...base, a: { A: 0.5, F: 0.95, EA: 0.3, EF: 1.9 }, b: { A: 0.5, F: 0.5, EA: -0.1, EF: 1.1 }, headPitch: 0.1, headRoll: 0.14 };
    }
    if (this.sit > 0.3) {
      const knee: Limb = { A: 0.35, F: 0.95, EA: -0.15, EF: 0.1 };
      return { ...base, a: knee, b: knee };
    }
    if (talking && walk < 0.3) {
      return {
        ...base,
        a: { A: 0.75 + 0.12 * Math.sin(t * 2.7), F: 0.3, EA: 0.35, EF: 0.7 + 0.3 * Math.sin(t * 3.3) },
        b: { A: 0.55, F: 0.2, EA: 0.1, EF: 0.4 + 0.18 * Math.sin(t * 2.1 + 1) },
        headPitch: 0.02 + 0.05 * Math.sin(t * 5.5),
      };
    }
    return base;
  }

  private flatten(p: Pose): Record<string, number> {
    return {
      aA: p.a.A, aF: p.a.F, aEA: p.a.EA, aEF: p.a.EF,
      bA: p.b.A, bF: p.b.F, bEA: p.b.EA, bEF: p.b.EF,
      wave: p.wave, headYaw: p.headYaw, headPitch: p.headPitch, headRoll: p.headRoll,
    };
  }

  private buildBody(t: number, dt: number, c: Record<string, number>, walk: number, jog: number, hop: number, E: (r: number) => number) {
    const sit = this.sit;
    const air = this.airborne;
    const stride = 0.5 + jog * 0.2;
    const leg = (sd: number, ph: number): [V3, V3, V3] => {
      const dangle = air ? Math.sin(t * 8 + sd) * 0.28 : 0;
      const aa = Math.sin(ph) * stride * walk + sit * 1.45 + dangle;
      const bb = Math.max(0, Math.sin(ph + 1.6)) * 0.8 * walk + 0.03 + sit * 1.45;
      const hip: V3 = [sd * 0.125, 0.36, 0];
      const kn: V3 = [sd * 0.128, hip[1] - 0.14 * Math.cos(aa), 0.14 * Math.sin(aa)];
      const cc = aa - bb;
      const an: V3 = [sd * 0.13, kn[1] - 0.135 * Math.cos(cc), kn[2] + 0.135 * Math.sin(cc)];
      return [hip, kn, an];
    };
    const LA = leg(1, this.walkPhase);
    const LB = leg(-1, this.walkPhase + Math.PI);
    const standLift = 0.085 - Math.min(LA[2][1], LB[2][1]);
    const lift = standLift * (1 - sit) - 0.28 * sit + hop;
    const panting = t < this.pantUntil;
    const breath = this.reduced ? 0 : Math.sin(t * (panting ? 9 : 1.6)) * (panting ? 0.022 : 0.006);
    const waddle = Math.sin(this.walkPhase) * (0.04 + jog * 0.015) * walk;
    const lean = (0.04 + jog * 0.05) * walk + (panting ? 0.05 : 0);

    const pts: V3[] = [];
    pts.push([waddle, HEAD_Y + breath, lean * 1.2], [waddle, 1.0 + breath, lean], [waddle * 0.8, 0.82 + breath, lean * 0.7], [waddle * 0.5, 0.56, lean * 0.3]);
    const arm = (sd: number, A: number, F: number, EA: number, EF: number, waving: boolean, sph: number) => {
      const sw = Math.sin(sph) * (0.35 + jog * 0.25);
      const AA = A * (1 - walk) + 0.46 * walk;
      const FF = F * (1 - walk) + sw * walk;
      const EAA = EA * (1 - walk) - 0.1 * walk;
      const EFF = EF * (1 - walk) + (0.2 + jog * 0.5 + Math.max(0, sw) * 0.4) * walk;
      const sh: V3 = [sd * 0.25 + waddle, 0.89 + breath, lean * 0.8];
      const el = add(sh, dir(AA, FF, sd), 0.21);
      const ea = AA + EAA + (waving ? Math.sin(t * 6.5) * 0.38 * c.wave : 0);
      const fd = dir(ea, FF + EFF, sd);
      const ha = add(el, fd, 0.2);
      pts.push(sh, el, ha);
    };
    arm(1, c.aA, c.aF, c.aEA, c.aEF, true, this.walkPhase + Math.PI);
    arm(-1, c.bA, c.bF, c.bEA, c.bEF, false, this.walkPhase);
    pts.push(LA[0], LA[1], LA[2], LB[0], LB[1], LB[2]);
    pts.push(add(LA[2], [0.02, 0, 0.03], 1), add(LB[2], [-0.02, 0, 0.03], 1));

    const cy = Math.cos(this.yaw), sy = Math.sin(this.yaw);
    const toWorld = (q: V3): V3 => [q[0] * cy + q[2] * sy + this.x, q[1] + lift + this.y, -q[0] * sy + q[2] * cy];
    let minX = 1e3, maxX = -1e3, minY = 1e3, maxY = -1e3;
    pts.forEach((q, i) => {
      const w = toWorld(q);
      this.joints[i * 3] = w[0];
      this.joints[i * 3 + 1] = w[1];
      this.joints[i * 3 + 2] = w[2];
      minX = Math.min(minX, w[0]); maxX = Math.max(maxX, w[0]);
      minY = Math.min(minY, w[1]); maxY = Math.max(maxY, w[1]);
    });

    // The muffler tail is a small chain of springs, so it swings when he moves.
    const anchor = toWorld([0.165, 0.965 + breath, 0.2]);
    anchor[2] = Math.max(anchor[2], 0.29);
    const T = this.tail, P = this.tailPrev;
    T[0] = anchor;
    const g = this.reduced ? 0 : 2.6 * dt * dt;
    for (let i = 1; i < 3; i++) {
      const cur = T[i];
      const nx: V3 = [cur[0] + (cur[0] - P[i][0]) * 0.95, cur[1] + (cur[1] - P[i][1]) * 0.95 - g, cur[2]];
      P[i] = cur;
      T[i] = nx;
    }
    for (let it = 0; it < 3; it++) {
      for (let i = 1; i < 3; i++) {
        const a = T[i - 1], b = T[i];
        const dx = b[0] - a[0], dy = b[1] - a[1];
        const l = Math.hypot(dx, dy) || 1;
        const seg = 0.175;
        T[i] = [a[0] + (dx / l) * seg, a[1] + (dy / l) * seg, Math.max(0.29, b[2])];
      }
    }
    if (this.reduced) { T[1] = [anchor[0], anchor[1] - 0.175, 0.29]; T[2] = [anchor[0], anchor[1] - 0.35, 0.29]; }
    T.forEach((q, i) => {
      this.muffler[i * 3] = q[0];
      this.muffler[i * 3 + 1] = q[1];
      this.muffler[i * 3 + 2] = q[2];
      minX = Math.min(minX, q[0]); maxX = Math.max(maxX, q[0]);
      minY = Math.min(minY, q[1]); maxY = Math.max(maxY, q[1]);
    });

    const m = 0.4 + Math.abs(this.roll) * 0.9;
    this.box = [minX - m, minY - m, maxX + m, maxY + m];
    void E;
  }
}
