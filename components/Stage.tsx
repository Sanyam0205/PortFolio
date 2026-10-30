"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { createPortal } from "react-dom";
import * as THREE from "three";
import { Avatar, type Sign, type Zone } from "@/figure/avatar";
import { fragmentShader, vertexShader } from "@/figure/shader";

type StageProps = {
  avatar: Avatar;
  slot: RefObject<HTMLDivElement | null>;
  bubble: RefObject<HTMLDivElement | null>;
  signs: Sign[];
  zone: Zone;
  doorOpen: boolean;
  onSign: (id: Zone) => void;
  onNoWebgl: () => void;
};

function Scene({ avatar, slot, bubble, hit, mark, signRefs, signs }: {
  avatar: Avatar;
  slot: RefObject<HTMLDivElement | null>;
  bubble: RefObject<HTMLDivElement | null>;
  hit: RefObject<HTMLButtonElement | null>;
  mark: RefObject<HTMLDivElement | null>;
  signRefs: RefObject<(HTMLButtonElement | null)[]>;
  signs: Sign[];
}) {
  const setDpr = useThree((s) => s.setDpr);
  const slow = useRef({ time: 0, frames: 0 });
  const lastMark = useRef(-1);
  const material = useRef<THREE.ShaderMaterial>(null);

  const uniforms = useMemo(
    () => ({
      uOrigin: { value: new THREE.Vector2() },
      uScale: { value: 240 },
      uCamY: { value: 0 },
      uJ: { value: avatar.joints },
      uM: { value: avatar.muffler },
      uYaw: { value: 0 },
      uHead: { value: new THREE.Vector3() },
      uEye: { value: new THREE.Vector3(0, 0, 1) },
      uBox: { value: new THREE.Vector4() },
      uShadow: { value: new THREE.Vector3() },
      uStair: { value: new THREE.Vector3(avatar.stair.X, avatar.stair.steps, avatar.stair.rise) },
      uFlights: { value: 4 },
      uFade: { value: new THREE.Vector2() },
      uPivot: { value: new THREE.Vector3() },
      uBend: { value: new THREE.Vector3(1, 1, 0) },
    }),
    [avatar],
  );

  useFrame((state, delta) => {
    const el = slot.current;
    const mat = material.current;
    if (!el || !mat) return;
    const r = el.getBoundingClientRect();
    avatar.setStage({ x: r.left, y: r.top, w: r.width, h: r.height });
    avatar.step(delta);

    const dpr = state.viewport.dpr;
    const height = state.size.height;
    // R3F copies the uniforms object onto the material, so write to the material's own copy.
    const u = mat.uniforms as unknown as typeof uniforms;
    u.uOrigin.value.set((r.left + r.width / 2) * dpr, (height - (r.top + r.height / 2)) * dpr);
    u.uScale.value = avatar.scale * dpr;
    u.uCamY.value = avatar.camY;
    u.uYaw.value = avatar.yaw;
    u.uHead.value.set(...avatar.headAngles);
    u.uEye.value.set(...avatar.eye);
    u.uBox.value.set(...avatar.box);
    u.uShadow.value.set(...avatar.shadow);
    u.uFlights.value = avatar.flights;
    u.uFade.value.set((height - r.bottom) * dpr, (height - r.top) * dpr);
    u.uPivot.value.set(...avatar.pivot);
    u.uBend.value.set(...avatar.bend);

    // DOM that rides along with the figure, moved directly to avoid re-rendering.
    const box = avatar.figureRect();
    if (hit.current) {
      // Tight to the body, so nearby signs and the door stay clickable.
      const insetX = 0.42 * avatar.scale;
      const insetY = 0.3 * avatar.scale;
      hit.current.style.transform = `translate3d(${box.x + insetX}px, ${box.y + insetY}px, 0)`;
      hit.current.style.width = `${Math.max(44, box.w - insetX * 2)}px`;
      hit.current.style.height = `${Math.max(44, box.h - insetY * 2)}px`;
    }
    const head = avatar.headPx();
    if (mark.current) {
      mark.current.style.transform = `translate3d(${head.x + head.r * 0.75}px, ${head.y - head.r * 1.75}px, 0)`;
      if (lastMark.current !== avatar.markSerial) {
        lastMark.current = avatar.markSerial;
        mark.current.dataset.mark = "none";
        void mark.current.offsetWidth;
        mark.current.dataset.mark = avatar.mark ?? "none";
      }
    }
    if (bubble.current) {
      const b = bubble.current.getBoundingClientRect();
      bubble.current.style.setProperty("--tail-x", `${Math.max(28, Math.min(b.width - 28, head.x - b.left))}px`);
    }
    // A sign on a visible landing stands there. Any other destination pins to the
    // stage edge with an arrow, so every section stays one click away.
    const placed = signs.map((sign) => {
      const n = signRefs.current[signs.indexOf(sign)];
      const p = avatar.landingPx(sign.landing, sign.id === "contact" ? 0.08 : 0);
      const h = n?.offsetHeight ?? 74;
      return { p, h, up: p.y <= r.top + h, down: p.y >= r.bottom };
    });
    const aboveAll = placed.filter((q) => q.up).length;
    const belowAll = placed.filter((q) => q.down).length;
    let above = 0;
    let below = 0;
    const foot = avatar.footPx();
    const narrow = window.innerWidth <= 980;
    signs.forEach((sign, i) => {
      const n = signRefs.current[i];
      if (!n) return;
      const { p, up, down } = placed[i];
      const w = n.offsetWidth;
      const inView = !up && !down;
      const underFoot = Math.abs(p.y - foot.y) < 30 && Math.abs(p.x - foot.x) < 0.8 * avatar.scale;
      n.style.visibility = inView && underFoot && narrow ? "hidden" : "visible";
      let x = Math.max(w / 2 + 4, Math.min(window.innerWidth - w / 2 - 4, p.x));
      let y = p.y;
      if (!inView) {
        // Pinned signs keep page order from left to right.
        const slot = up ? aboveAll - 1 - above++ : belowAll - 1 - below++;
        x = r.right - w / 2 - 4 - slot * (w + 8);
        y = up ? r.top + n.offsetHeight : r.bottom;
        n.dataset.pin = up ? "up" : "down";
      } else {
        delete n.dataset.pin;
      }
      n.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -100%)`;
    });

    // Drop resolution rather than frame rate on slower machines.
    slow.current.time += delta;
    slow.current.frames += 1;
    if (slow.current.frames >= 90) {
      const avg = slow.current.time / slow.current.frames;
      slow.current = { time: 0, frames: 0 };
      if (avg > 0.028 && dpr > 0.75) setDpr(Math.max(0.75, dpr - 0.25));
    }
  });

  return (
    <mesh frustumCulled={false}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        ref={material}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        depthTest={false}
        depthWrite={false}
        blending={THREE.NoBlending}
        toneMapped={false}
      />
    </mesh>
  );
}

function SignBoard({ label, door }: { label: string; door: boolean }) {
  return (
    <>
      <svg className="sign-art" viewBox="0 0 104 74" aria-hidden="true">
        <path d="M51 44 C50 52 53 62 52 73" className="sign-post" />
        <path d="M6 7 C26 4 72 3 98 6 C101 15 100 30 98 41 C70 44 30 45 7 42 C3 31 4 16 6 7 Z" className="sign-plate" />
        <path d="M17 18 L17 32 M12 23 L17 17 L22 24" className="sign-arrow sign-arrow-up" />
        <path d="M17 17 L17 31 M12 25 L17 32 L22 26" className="sign-arrow sign-arrow-down" />
        <text x="52" y="30" textAnchor="middle" className="sign-text">{label}</text>
      </svg>
      {door && (
        <svg className="door-art" viewBox="0 0 90 140" aria-hidden="true">
          <rect x="11" y="7" width="68" height="130" className="door-inside" />
          <g className="door-panel">
          <path d="M9 138 C7 96 8 44 10 6 C32 3 60 4 80 5 C83 48 82 98 81 138 Z" className="sign-plate" />
          <circle cx="67" cy="78" r="4" className="door-knob" />
          <text x="45" y="48" textAnchor="middle" className="sign-text">{label}</text>
          </g>
        </svg>
      )}
    </>
  );
}

function StaticFigure() {
  const line = { stroke: "#7f889e", strokeWidth: 2.5 };
  return (
    <svg className="static-figure" viewBox="0 0 210 300" role="img" aria-label="A soft white figure of Sanyam in a maroon and black striped muffler">
      <ellipse cx="105" cy="294" rx="86" ry="5" fill="#e4e5e9" />
      <rect x="48" y="118" width="38" height="108" rx="19" transform="rotate(20 67 118)" fill="#fff" {...line} />
      <rect x="124" y="118" width="38" height="108" rx="19" transform="rotate(-20 143 118)" fill="#fff" {...line} />
      <rect x="62" y="225" width="34" height="50" rx="17" fill="#fff" {...line} />
      <rect x="114" y="225" width="34" height="50" rx="17" fill="#fff" {...line} />
      <ellipse cx="65" cy="270" rx="28" ry="20" fill="#fff" {...line} />
      <ellipse cx="145" cy="270" rx="28" ry="20" fill="#fff" {...line} />
      <path d="M66 112 C50 150 42 200 58 232 C70 250 140 250 152 232 C168 200 160 150 144 112 Z" fill="#fff" {...line} />
      <ellipse cx="105" cy="60" rx="58" ry="48" fill="#fff" {...line} />
      <ellipse cx="85" cy="76" rx="6.5" ry="11" fill="#14141a" />
      <ellipse cx="125" cy="76" rx="6.5" ry="11" fill="#14141a" />
      <rect x="52" y="102" width="106" height="24" rx="12" fill="#8a121f" />
      <path d="M74 102h12l6 24H80zM104 102h12l6 24h-12zM134 102h10l4 24h-10z" fill="#16121a" />
      <rect x="124" y="116" width="26" height="82" rx="10" fill="#8a121f" />
      <rect x="124" y="136" width="26" height="18" fill="#16121a" />
      <rect x="124" y="172" width="26" height="18" fill="#16121a" />
    </svg>
  );
}

export default function Stage({ avatar, slot, bubble, signs, zone, doorOpen, onSign, onNoWebgl }: StageProps) {
  const hit = useRef<HTMLButtonElement>(null);
  const mark = useRef<HTMLDivElement>(null);
  const signRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const drag = useRef({ id: -1, x: 0, y: 0, moved: false });
  const [webgl, setWebgl] = useState(true);

  useEffect(() => {
    const test = document.createElement("canvas");
    const ctx = test.getContext("webgl2") || test.getContext("webgl");
    if (!ctx) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setWebgl(false);
      onNoWebgl();
    }
  }, [onNoWebgl]);

  if (!webgl) return slot.current ? createPortal(<StaticFigure />, slot.current) : null;

  return (
    <>
      <Canvas
        className="figure-canvas"
        aria-hidden="true"
        dpr={[1, 1.75]}
        flat
        linear
        frameloop="always"
        gl={{ alpha: true, antialias: false, premultipliedAlpha: true, powerPreference: "high-performance" }}
        onCreated={({ gl }) => gl.setClearColor(0x000000, 0)}
        style={{ position: "fixed", inset: 0, zIndex: 2, pointerEvents: "none" }}
      >
        <Scene avatar={avatar} slot={slot} bubble={bubble} hit={hit} mark={mark} signRefs={signRefs} signs={signs} />
      </Canvas>

      {signs.map((sign, i) => (
        <button
          key={sign.id}
          ref={(n) => { signRefs.current[i] = n; }}
          type="button"
          className="sign"
          data-active={zone === sign.id}
          data-open={sign.id === "contact" && doorOpen}
          data-label={sign.label}
          aria-label={sign.id === "contact" && zone === "contact" ? "Open the door and copy Sanyam's email" : `Walk to ${sign.label}`}
          aria-current={zone === sign.id ? "true" : undefined}
          onClick={() => onSign(sign.id)}
        >
          <SignBoard label={sign.label} door={sign.id === "contact"} />
        </button>
      ))}

      <button
        ref={hit}
        type="button"
        className="figure-hit"
        aria-label="Poke Sanyam"
        onClick={(e) => {
          // A keyboard press arrives as a click with no pointer travel.
          if (e.detail === 0) avatar.poke();
        }}
        onPointerDown={(e) => {
          drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY, moved: false };
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          const d = drag.current;
          if (d.id !== e.pointerId || e.pointerType === "touch") return;
          if (!d.moved && Math.hypot(e.clientX - d.x, e.clientY - d.y) > 5) {
            d.moved = true;
            avatar.startDrag(d.x, d.y);
            e.currentTarget.dataset.grabbing = "true";
          }
        }}
        onPointerUp={(e) => {
          const d = drag.current;
          if (d.id !== e.pointerId) return;
          if (d.moved) avatar.endDrag(); else avatar.poke();
          drag.current.id = -1;
          delete e.currentTarget.dataset.grabbing;
        }}
        onPointerCancel={(e) => {
          avatar.endDrag();
          drag.current.id = -1;
          delete e.currentTarget.dataset.grabbing;
        }}
      />

      <div ref={mark} className="mark" data-mark="none" aria-hidden="true">
        <svg viewBox="0 0 48 48" className="mark-question"><path d="M15 15 C16 6 33 5 34 15 C35 23 24 23 24 31" /><path d="M24 40 L24.5 41" /></svg>
        <svg viewBox="0 0 48 48" className="mark-exclaim"><path d="M24 6 C23 15 25 22 24 31" /><path d="M24 40 L24.5 41" /></svg>
        <svg viewBox="0 0 48 48" className="mark-spark"><path d="M24 6 L25 20 M24 42 L23 28 M6 24 L20 25 M42 24 L28 23 M11 11 L19 19 M37 37 L29 29 M37 11 L29 19 M11 37 L19 29" /></svg>
        <svg viewBox="0 0 48 48" className="mark-z"><path d="M12 12 L28 11 L12 28 L29 28" /><path d="M31 32 L41 31 L31 42 L42 41" /></svg>
        <svg viewBox="0 0 48 48" className="mark-puff"><path d="M8 28 C4 20 13 15 18 19 C20 11 33 11 34 20 C42 18 45 28 37 31 C30 35 13 35 8 28 Z" /></svg>
        <svg viewBox="0 0 48 48" className="mark-dizzy"><path d="M24 24 C27 21 31 26 27 30 C21 35 13 28 17 20 C22 11 36 14 38 25 C39 34 32 41 24 41" /></svg>
      </div>
    </>
  );
}
