"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { portfolio, type Project } from "@/content/portfolio";
import { Avatar, type Sign, type Zone } from "@/figure/avatar";
import { answer, type Action } from "@/lib/assistant";

const Stage = dynamic(() => import("./Stage"), { ssr: false });

const GREETING = "Hi! I'm the soft version of Sanyam. Scroll and I'll walk you through my work. Orrr you can drag and drop me anywhere for a fun experience!!";
const SECTIONS: { id: Zone; label: string }[] = [
  { id: "about", label: "About" },
  { id: "work", label: "Work" },
  { id: "experience", label: "Experience" },
  { id: "contact", label: "Contact" },
];
const projectSkills = new Set(portfolio.projects.flatMap((p) => p.skills));

type Option = { label: string; ask?: string; action?: Action };

// While a project is open he offers its own questions first, three at a time; each one
// asked makes way for the next, and the list starts over once they've all been asked.
function optionsFor(zone: Zone, open: number | null, asked: string[]): Option[] {
  if (open !== null) {
    const project = portfolio.projects[open];
    const pool: Option[] = [
      ...project.questions.map((x) => ({ label: x.label, ask: x.label })),
      ...(project.hard ? [{ label: "What was hard?", ask: "what was hard" }] : []),
      { label: "What did you use?", ask: "what stack" },
      { label: "Where does it stand?", ask: "where does it stand" },
    ];
    const fresh = pool.filter((o) => !asked.includes(o.label));
    return (fresh.length ? fresh : pool).slice(0, 3);
  }
  if (zone === "work") {
    return [
      { label: "Show me your best", action: "best" },
      { label: "Your skills?", ask: "skills" },
      { label: "How do I reach you?", action: "contact" },
    ];
  }
  if (zone === "experience") {
    return [
      { label: "Your education?", ask: "education" },
      { label: "Your skills?", ask: "skills" },
      { label: "How do I reach you?", action: "contact" },
    ];
  }
  if (zone === "contact") {
    return [
      { label: "Copy your email", action: "copy-email" },
      { label: "Back to the work", action: "work" },
    ];
  }
  return [
    { label: "Show me your work", action: "work" },
    { label: "Who are you?", ask: "who are you" },
    { label: "What do you do now?", ask: "what do you do now" },
    { label: "How do I reach you?", action: "contact" },
  ];
}

function Still({ project, image }: { project: Project; image?: string }) {
  if (image) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img className="still-img" src={image} alt="" loading="lazy" decoding="async" />;
  }
  return (
    <span className="still-empty">
      <span className="still-title">{project.title}</span>
      <small>Screenshots coming soon</small>
    </span>
  );
}

function DownloadIcon() {
  return (
    <svg width="12" height="14" viewBox="0 0 12 14" aria-hidden="true">
      <path d="M6 1v9M2 6l4 4 4-4M1 13h10" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function Speech({ text }: { text: string }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const instant = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCount(instant ? text.length : 0);
    if (instant) return;
    const id = window.setInterval(() => {
      setCount((c) => {
        if (c >= text.length) window.clearInterval(id);
        return Math.min(text.length, c + 2);
      });
    }, 22);
    return () => window.clearInterval(id);
  }, [text]);
  return (
    <>
      <p className="speech-text" aria-hidden="true">{text.slice(0, count)}</p>
      <p className="sr-only" aria-live="polite">{text}</p>
    </>
  );
}

function ProjectView({ project, visible, guideFull, mediaRef, onClose, closeRef }: {
  project: Project;
  visible: boolean;
  guideFull: boolean;
  mediaRef: React.RefObject<HTMLDivElement | null>;
  onClose: () => void;
  closeRef: React.RefObject<HTMLButtonElement | null>;
}) {
  const [shot, setShot] = useState(0);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPaused(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);
  // A video the browser can't play shows its poster and is timed like a still.
  const [failed, setFailed] = useState<number[]>([]);
  const count = project.shots.length;
  const onVideo = Boolean(project.shots[shot]?.video) && !failed.includes(shot);
  // Stills advance on a timer; a video advances when it ends.
  useEffect(() => {
    if (paused || !visible || count < 2 || onVideo) return;
    const id = window.setTimeout(() => setShot((s) => (s + 1) % count), 3400);
    return () => window.clearTimeout(id);
  }, [paused, visible, count, onVideo, shot]);
  // Only the video on screen plays; the others rewind so they start fresh next time.
  useEffect(() => {
    mediaRef.current?.querySelectorAll<HTMLVideoElement>("video").forEach((v) => {
      if (Number(v.dataset.shot) !== shot) {
        v.pause();
        v.currentTime = 0;
      } else if (visible && !paused) {
        // Autoplay refused: wait for Play. Any other failure is handled by onError.
        v.play().catch((e: DOMException) => { if (e.name === "NotAllowedError") setPaused(true); });
      } else {
        v.pause();
      }
    });
  }, [shot, visible, paused, mediaRef]);
  // The progress bar follows the video on screen.
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  useEffect(() => {
    const v = onVideo ? mediaRef.current?.querySelector<HTMLVideoElement>(`video[data-shot="${shot}"]`) : null;
    if (!v) return;
    const sync = () => {
      setTime(v.currentTime);
      if (Number.isFinite(v.duration)) setDuration(v.duration);
    };
    let frame = 0;
    const tick = () => { sync(); frame = requestAnimationFrame(tick); };
    tick();
    v.addEventListener("loadedmetadata", sync);
    return () => { cancelAnimationFrame(frame); v.removeEventListener("loadedmetadata", sync); };
  }, [onVideo, shot, mediaRef]);
  const seek = (t: number) => {
    const v = mediaRef.current?.querySelector<HTMLVideoElement>(`video[data-shot="${shot}"]`);
    if (v) v.currentTime = t;
    setTime(t);
  };
  const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

  return (
    <section className="project" data-visible={visible} data-guide-full={guideFull} role="dialog" aria-label={project.title}>
      <div className="film" ref={mediaRef}>
        {project.shots.map((s, i) => (
          <div key={i} className="shot" data-on={i === shot} data-video={Boolean(s.video)}>
            {s.video ? (
              <video
                className="still-img"
                data-shot={i}
                src={s.video}
                poster={s.image}
                muted
                playsInline
                loop={count === 1}
                preload={i === 0 ? "auto" : "metadata"}
                aria-label={s.alt}
                onEnded={() => setShot((c) => (c + 1) % count)}
                onError={() => setFailed((f) => (f.includes(i) ? f : [...f, i]))}
              />
            ) : s.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img className="still-img" src={s.image} alt={s.alt} />
            ) : (
              <span className="still-empty"><small>[Screenshot: {s.caption}]</small></span>
            )}
          </div>
        ))}
        {project.shots.length === 0 && (
          <div className="film-empty">
            <p>{project.title}</p>
            <small>Screenshots and a video are coming soon.</small>
          </div>
        )}
        {count > 0 && <p className="film-caption">{project.shots[shot].caption}</p>}
      </div>
      {(count > 1 || onVideo) && (
        <div className="film-bar">
          <button type="button" className="film-play" aria-label={paused ? "Play" : "Pause"} onClick={() => setPaused((p) => !p)}>
            <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
              {paused ? <path d="M3 1.5v11l9.5-5.5z" fill="currentColor" /> : <path d="M3 1.5h3v11H3zM8 1.5h3v11H8z" fill="currentColor" />}
            </svg>
          </button>
          {onVideo && (
            <>
              <input
                type="range"
                className="film-seek"
                aria-label="Seek video"
                aria-valuetext={`${clock(time)} of ${clock(duration)}`}
                min={0}
                max={duration || 1}
                step={0.1}
                value={Math.min(time, duration || 1)}
                style={{ "--pct": `${duration ? (time / duration) * 100 : 0}%` } as CSSProperties}
                onChange={(e) => seek(Number(e.currentTarget.value))}
              />
              <span className="film-time">{clock(time)} / {clock(duration)}</span>
            </>
          )}
          {count > 1 && (
            <span className="film-dots">
              {project.shots.map((s, i) => (
                <button
                  key={i}
                  type="button"
                  className="film-dot"
                  aria-label={`${s.video ? "Video" : "Screenshot"} ${i + 1} of ${count}: ${s.caption}`}
                  aria-current={i === shot ? "true" : undefined}
                  onClick={() => setShot(i)}
                />
              ))}
            </span>
          )}
        </div>
      )}
      <div className="project-head">
        <div>
          <h2>{project.title}</h2>
          <p className="project-meta">{project.skills.join(", ")}</p>
        </div>
        <div className="project-actions">
          {project.liveUrl && <a href={project.liveUrl} target="_blank" rel="noreferrer">View live</a>}
          {project.sourceUrl && <a href={project.sourceUrl} target="_blank" rel="noreferrer">Source</a>}
          <button ref={closeRef} type="button" className="close" onClick={onClose}>Close</button>
        </div>
      </div>
      <p className="project-lead">{project.summary}</p>
      <dl className="project-story">
        <div><dt>The problem</dt><dd>{project.problem}</dd></div>
        <div><dt>What I built</dt><dd>{project.built}</dd></div>
        {project.hard && <div><dt>The hard part</dt><dd>{project.hard}</dd></div>}
        <div><dt>Where it stands</dt><dd>{project.status}</dd></div>
      </dl>
    </section>
  );
}

export default function Portfolio() {
  const [speech, setSpeech] = useState(GREETING);
  const [zone, setZone] = useState<Zone>("about");
  const [signs, setSigns] = useState<Sign[]>([]);
  const [open, setOpen] = useState<number | null>(null);
  const [viewVisible, setViewVisible] = useState(false);
  const [input, setInput] = useState("");
  const [skill, setSkill] = useState<string | null>(null);
  const [doorOpen, setDoorOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [compact, setCompact] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [typing, setTyping] = useState(false);

  const slot = useRef<HTMLDivElement>(null);
  const bubble = useRef<HTMLDivElement>(null);
  const flyer = useRef<HTMLDivElement>(null);
  const media = useRef<HTMLDivElement>(null);
  const closeBtn = useRef<HTMLButtonElement>(null);
  const aboutEl = useRef<HTMLElement>(null);
  const workEl = useRef<HTMLElement>(null);
  const experienceEl = useRef<HTMLElement>(null);
  const contactEl = useRef<HTMLElement>(null);
  const flight = useRef({ from: null as DOMRect | null, raf: 0 });
  const returnFocus = useRef<HTMLElement | null>(null);
  const openRef = useRef<number | null>(null);
  const bestIndex = useRef(0);
  const doorTimer = useRef(0);
  const compactRef = useRef(false);
  const guideOpenedAt = useRef(0);
  const typingRef = useRef(false);
  const askInput = useRef<HTMLInputElement>(null);
  // Focus is only moved for keyboard users. After a click or tap, pressing an arrow
  // key would otherwise draw a focus ring around whatever was last pressed.
  const usingPointer = useRef(true);
  useEffect(() => { openRef.current = open; }, [open]);
  useEffect(() => { compactRef.current = compact; }, [compact]);
  useEffect(() => { if (guideOpen) guideOpenedAt.current = window.scrollY; }, [guideOpen]);

  const avatarRef = useRef<Avatar | null>(null);
  const say = useCallback((text: string) => {
    setSpeech(text);
    avatarRef.current?.talk(text);
    // A long answer doesn't fit the phone's compact strip, so open it up.
    if (compactRef.current && text.length > 70) setGuideOpen(true);
  }, []);
  if (!avatarRef.current) {
    avatarRef.current = new Avatar({ say: (t) => say(t), zone: setZone, signs: setSigns });
  }
  const avatar = avatarRef.current;

  useEffect(() => {
    avatar.reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const measure = () => {
      if (!workEl.current || !experienceEl.current || !contactEl.current) return;
      const y = window.scrollY;
      const padding = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 76;
      const top = (el: HTMLElement) => el.getBoundingClientRect().top + y - padding;
      avatar.measure(
        top(workEl.current),
        top(experienceEl.current),
        top(contactEl.current),
        Math.max(0, document.documentElement.scrollHeight - window.innerHeight),
      );
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(document.body);
    const onMove = (e: PointerEvent) => avatar.pointerMove(e.clientX, e.clientY);
    const onDown = (e: PointerEvent) => {
      usingPointer.current = true;
      // On a touch screen a tap is the only "cursor" he gets: look there, and walk over if it's on the stairs.
      avatar.pointerMove(e.clientX, e.clientY);
    };
    const onUp = () => {
      const active = document.activeElement;
      if (active instanceof HTMLElement && active.matches("button, a")) active.blur();
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Tab" || e.key === "Enter" || e.key === " ") usingPointer.current = false;
    };
    // Touch only: he looks at what you're reading, and points out a project you stop on.
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    let pointTimer = 0;
    let releaseTimer = 0;
    let lastPointed: Element | null = null;
    const attend = () => {
      if (!coarse || openRef.current !== null) return;
      const middle = window.innerHeight * 0.55;
      let best: Element | null = null;
      let bestGap = Infinity;
      document.querySelectorAll(".tile, .content h1, .content h2, .content h3").forEach((el) => {
        const r = el.getBoundingClientRect();
        const gap = Math.abs(r.top + r.height / 2 - middle);
        if (gap < bestGap) { bestGap = gap; best = el; }
      });
      if (!best) return;
      const target: Element = best;
      const r = target.getBoundingClientRect();
      const center = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      avatar.setGaze(center);
      window.clearTimeout(pointTimer);
      pointTimer = window.setTimeout(() => {
        if (!target.matches(".tile") || target === lastPointed || openRef.current !== null) return;
        lastPointed = target;
        avatar.hover(center);
        window.clearTimeout(releaseTimer);
        releaseTimer = window.setTimeout(() => avatar.hover(null), 1600);
      }, 900);
    };
    const onScroll = () => {
      const y = window.scrollY;
      const phone = window.innerWidth <= 980;
      setCompact((c) => (phone ? (c ? y > 8 : y > 48) : false));
      // The keyboard scrolls the page too. Folding the guide then would hide the input and close the keyboard.
      if (!typingRef.current && Math.abs(y - guideOpenedAt.current) > 60) setGuideOpen(false);
      attend();
    };
    onScroll();
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onDown, { passive: true });
    window.addEventListener("pointerup", onUp, { passive: true });
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", measure);
    window.addEventListener("resize", onScroll);
    return () => {
      ro.disconnect();
      window.clearTimeout(pointTimer);
      window.clearTimeout(releaseTimer);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", measure);
      window.removeEventListener("resize", onScroll);
    };
  }, [avatar]);

  // While typing on a phone, the panel fits the space above the keyboard and the page stays where it was.
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!typing || !viewport) return;
    const y = window.scrollY;
    let settle = 0;
    const fit = () => {
      document.documentElement.style.setProperty("--typing-h", `${Math.round(viewport.height)}px`);
      window.scrollTo({ top: y, behavior: "instant" });
    };
    const onResize = () => {
      fit();
      window.clearTimeout(settle);
      settle = window.setTimeout(fit, 350);
    };
    viewport.addEventListener("resize", onResize);
    return () => {
      window.clearTimeout(settle);
      viewport.removeEventListener("resize", onResize);
      document.documentElement.style.removeProperty("--typing-h");
    };
  }, [typing]);

  const scrollTo = useCallback((el: HTMLElement | null) => {
    avatar.navigate();
    el?.scrollIntoView({ block: "start" });
  }, [avatar]);

  const closeProject = useCallback((silent = false) => {
    cancelAnimationFrame(flight.current.raf);
    if (flyer.current) flyer.current.style.display = "none";
    document.documentElement.classList.remove("locked");
    avatar.release();
    setOpen(null);
    setViewVisible(false);
    if (!silent) say("Anything else catch your eye?");
    if (!usingPointer.current) returnFocus.current?.focus({ preventScroll: true });
  }, [avatar, say]);

  const pickProject = useCallback((i: number, tile?: HTMLElement | null) => {
    avatar.hover(null);
    const el = tile ?? document.querySelector<HTMLElement>(`[data-project="${i}"]`);
    returnFocus.current = el;
    flight.current.from = el?.querySelector(".tile-media")?.getBoundingClientRect() ?? null;
    document.documentElement.classList.add("locked");
    // On a phone he steps out of the strip, full size, to make the catch.
    if (compactRef.current) setGuideOpen(true);
    avatar.beginCatch();
    setViewVisible(false);
    setOpen(i);
    say(`Ooh, ${portfolio.projects[i].title}. Let me grab it.`);
  }, [avatar, say]);

  // The tile's flight: from the grid, up into his hands, then out to full size.
  useEffect(() => {
    if (open === null) return;
    const project = portfolio.projects[open];
    const finish = () => {
      if (flyer.current) flyer.current.style.display = "none";
      setViewVisible(true);
      setGuideOpen(false);
      avatar.present();
      setSpeech(project.summary);
      avatar.talk(project.summary);
    };
    const from = flight.current.from;
    const box = flyer.current;
    const target = media.current?.getBoundingClientRect();
    if (avatar.reduced || !from || !box || !target) {
      finish();
      return;
    }
    const apply = (x: number, y: number, w: number, h: number, radius: number) => {
      box.style.display = "block";
      box.style.left = `${x}px`;
      box.style.top = `${y}px`;
      box.style.width = `${w}px`;
      box.style.height = `${h}px`;
      box.style.borderRadius = `${radius}px`;
    };
    const ease = (u: number) => 1 - Math.pow(1 - u, 3);
    const easeInOut = (u: number) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);
    const lerp = (a: number, b: number, u: number) => a + (b - a) * u;
    const start = performance.now();
    const TOSS = 620, HOLD = 850, GROW = 620;
    let caughtFlag = false;
    const tick = (now: number) => {
      const e = now - start;
      const held = avatar.heldTile();
      if (e < TOSS) {
        const u = ease(e / TOSS);
        const arc = Math.sin(u * Math.PI) * 90;
        apply(lerp(from.left, held.x, u), lerp(from.top, held.y, u) - arc, lerp(from.width, held.w, u), lerp(from.height, held.h, u), 16);
      } else if (e < TOSS + HOLD) {
        if (!caughtFlag) { caughtFlag = true; avatar.caught(); say("Got it! Let me show you."); }
        apply(held.x, held.y, held.w, held.h, 12);
      } else if (e < TOSS + HOLD + GROW) {
        const u = easeInOut((e - TOSS - HOLD) / GROW);
        apply(lerp(held.x, target.left, u), lerp(held.y, target.top, u), lerp(held.w, target.width, u), lerp(held.h, target.height, u), lerp(12, 22, u));
      } else {
        finish();
        return;
      }
      flight.current.raf = requestAnimationFrame(tick);
    };
    flight.current.raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(flight.current.raf);
  }, [open, avatar, say]);

  // The view is hidden until the flight lands, so focus can only move once it shows.
  useEffect(() => {
    if (viewVisible && !usingPointer.current) closeBtn.current?.focus({ preventScroll: true });
  }, [viewVisible]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && openRef.current !== null) closeProject();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [closeProject]);

  const copyEmail = useCallback(async () => {
    window.clearTimeout(doorTimer.current);
    setDoorOpen(true);
    avatar.celebrate();
    if (compactRef.current) setGuideOpen(true);
    try {
      await navigator.clipboard.writeText(portfolio.email);
      setCopied(true);
      say(`Copied! My email is ${portfolio.email}. Come on in.`);
    } catch {
      say(`I couldn't reach your clipboard, so here it is: ${portfolio.email}`);
    }
    doorTimer.current = window.setTimeout(() => { setDoorOpen(false); setCopied(false); setGuideOpen(false); }, 3200);
  }, [avatar, say]);

  const runAction = useCallback((action: Action) => {
    if (action === "close") { closeProject(); return; }
    if (action === "copy-email") { void copyEmail(); return; }
    if (typeof action === "object" || action === "best") {
      let i: number;
      if (typeof action === "object") {
        i = action.open;
      } else {
        i = bestIndex.current % portfolio.projects.length;
        bestIndex.current += 1;
      }
      if (openRef.current !== null) closeProject(true);
      pickProject(i);
      return;
    }
    if (openRef.current !== null) closeProject(true);
    const target = { work: workEl, contact: contactEl, experience: experienceEl, about: aboutEl }[action];
    scrollTo(target.current);
  }, [closeProject, copyEmail, pickProject, scrollTo]);

  const respond = useCallback((q: string) => {
    const reply = answer(q, openRef.current);
    avatar.think(0.5);
    window.setTimeout(() => {
      if (reply.action) runAction(reply.action);
      say(reply.say);
      avatar.answered();
    }, avatar.reduced ? 0 : 450);
  }, [avatar, runAction, say]);

  const tileHover = (e: React.PointerEvent<HTMLElement> | React.FocusEvent<HTMLElement>, on: boolean) => {
    if (!on) { avatar.hover(null); return; }
    const r = e.currentTarget.getBoundingClientRect();
    avatar.hover({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
  };

  const onSign = useCallback((id: Zone) => {
    if (openRef.current !== null) closeProject(true);
    if (id === "contact" && zone === "contact") { void copyEmail(); return; }
    say(id === "about" ? "Back up we go." : id === "work" ? "To the work." : id === "experience" ? "This way." : "To the door.");
    scrollTo({ about: aboutEl, work: workEl, experience: experienceEl, contact: contactEl }[id].current);
  }, [closeProject, copyEmail, say, scrollTo, zone]);

  // Clicking a skill lights up the projects that use it, and he points them out.
  const selectSkill = useCallback((name: string) => {
    if (skill === name) { setSkill(null); return; }
    setSkill(name);
    const matches = portfolio.projects.filter((p) => p.skills.includes(name));
    say(`${name} is in ${matches.length} ${matches.length === 1 ? "project" : "projects"}. ${matches.length === 1 ? "It's" : "They're"} lit up for you.`);
    avatar.answered();
    scrollTo(workEl.current);
    window.setTimeout(() => {
      const first = document.querySelector<HTMLElement>('.tile[data-match="true"]');
      if (!first) return;
      const r = first.getBoundingClientRect();
      avatar.hover({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
      window.setTimeout(() => avatar.hover(null), 2600);
    }, avatar.reduced ? 0 : 900);
  }, [avatar, say, scrollTo, skill]);

  const onNoWebgl = useCallback(() => {
    setSpeech("Hi! I'm Sanyam. Your browser can't show my moving self, but everything is still here. Ask me anything.");
  }, []);

  // In the phone's reading strip, tapping the little figure brings him back full size.
  const onFigureTap = useCallback(() => {
    if (compactRef.current) setGuideOpen(true);
  }, []);

  // Questions already asked about the project that's open; another project starts fresh.
  const [asked, setAsked] = useState<{ project: number | null; labels: string[] }>({ project: null, labels: [] });
  const askedHere = asked.project === open ? asked.labels : [];
  const options = optionsFor(zone, open, askedHere);
  const choose = (o: Option) => {
    if (o.action) { runAction(o.action); return; }
    if (open !== null) setAsked({ project: open, labels: [...askedHere, o.label] });
    respond(o.ask ?? "");
  };
  const closeOnNav = () => { if (openRef.current !== null) closeProject(true); };

  return (
    <div className="site">
      <svg className="filters" aria-hidden="true" width="0" height="0">
        <filter id="boil-1" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence baseFrequency="0.011" numOctaves="1" seed="2" /><feDisplacementMap in="SourceGraphic" scale="7" /></filter>
        <filter id="boil-2" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence baseFrequency="0.011" numOctaves="1" seed="7" /><feDisplacementMap in="SourceGraphic" scale="7" /></filter>
        <filter id="wobble" x="-3%" y="-3%" width="106%" height="106%"><feTurbulence baseFrequency="0.006" numOctaves="1" seed="4" /><feDisplacementMap in="SourceGraphic" scale="4" /></filter>
        <filter id="boil-3" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence baseFrequency="0.011" numOctaves="1" seed="13" /><feDisplacementMap in="SourceGraphic" scale="7" /></filter>
      </svg>

      <header className="top">
        <a href="#about" className="brand">{portfolio.name}</a>
        <div className="top-right">
          <nav aria-label="Sections" className="top-nav" onClick={closeOnNav}>
            {SECTIONS.map((s) => (
              <a key={s.id} href={`#${s.id}`} aria-current={zone === s.id ? "true" : undefined}>{s.label}</a>
            ))}
          </nav>
          <a className="resume" href={portfolio.resumeUrl} download="Sanyam-Singh-Resume.pdf">
            <DownloadIcon />Download résumé
          </a>
        </div>
        <nav aria-label="Sections" className="tabs" onClick={closeOnNav}>
          {SECTIONS.map((s) => (
            <a key={s.id} href={`#${s.id}`} aria-current={zone === s.id ? "true" : undefined}>{s.label}</a>
          ))}
        </nav>
      </header>

      <div className="split">
        <aside className="guide" data-compact={compact && !guideOpen} data-typing={typing} aria-label="Sanyam, your guide">
          <div className="stage-slot" ref={slot} />
          <div className="bubble" ref={bubble}>
            <Speech text={speech} />
          </div>
          <div className="talk">
            <div className="options" role="group" aria-label="Things to ask">
              {options.map((o) => (
                <button
                  key={o.label}
                  type="button"
                  className="option"
                  onClick={() => choose(o)}
                >
                  {o.label}
                </button>
              ))}
            </div>
            <form
              className="ask"
              onSubmit={(e) => {
                e.preventDefault();
                const q = input.trim();
                if (!q) return;
                setInput("");
                respond(q);
                // On a phone the keyboard would cover him while he answers.
                if (window.innerWidth <= 980) askInput.current?.blur();
              }}
            >
              <label htmlFor="ask" className="sr-only">Ask Sanyam a question</label>
              <input
                ref={askInput}
                id="ask"
                type="text"
                autoComplete="off"
                enterKeyHint="send"
                value={input}
                placeholder="Ask about my projects, skills or availability"
                onChange={(e) => setInput(e.target.value)}
                onFocus={() => {
                  avatar.setTyping(true);
                  typingRef.current = true;
                  setTyping(true);
                  if (window.innerWidth <= 980) setGuideOpen(true);
                }}
                onBlur={() => {
                  avatar.setTyping(false);
                  typingRef.current = false;
                  guideOpenedAt.current = window.scrollY;
                  setTyping(false);
                }}
              />
              {/* Keep focus in the input, or the panel resizes under the finger before the tap lands. */}
              <button type="submit" aria-label="Ask" onPointerDown={(e) => e.preventDefault()}>
                <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
                  <path d="M2 7h10M8 3l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.6" />
                </svg>
              </button>
            </form>
          </div>
          <button type="button" className="guide-open" onClick={() => setGuideOpen(true)}>Ask</button>
        </aside>

        <main className="content" inert={open !== null}>
          <section id="about" ref={aboutEl} className="about">
            <h1>{portfolio.name}, <span>{portfolio.role.toLowerCase()}.</span></h1>
            <p className="intro">{portfolio.intro}</p>
            <dl className="facts">
              {portfolio.facts.map((f) => (
                <div key={f.label}><dt>{f.label}</dt><dd>{f.value}</dd></div>
              ))}
            </dl>
            <p className="hint">
              <svg width="12" height="16" viewBox="0 0 12 16" aria-hidden="true"><path d="M6 1v13M1 9l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="1.5" /></svg>
              Scroll, and I’ll walk you down to the work
            </p>
          </section>

          <section id="work" ref={workEl} className="work">
            <div className="work-head">
              <h2>Work</h2>
              <p>Three projects I’ve built. Click any one and I’ll catch it and show you around.</p>
            </div>
            {skill && (
              <p className="skill-bar">
                Showing projects with <strong>{skill}</strong>
                <button type="button" onClick={() => setSkill(null)}>Show all</button>
              </p>
            )}
            <div className="grid">
              {portfolio.projects.map((p, i) => {
                const isLead = i === 0;
                return (
                  <button
                    key={p.title}
                    type="button"
                    className="tile"
                    data-project={i}
                    data-lead={isLead}
                    data-match={skill ? p.skills.includes(skill) : undefined}
                    onClick={(e) => pickProject(i, e.currentTarget)}
                    onPointerEnter={(e) => tileHover(e, true)}
                    onPointerLeave={(e) => tileHover(e, false)}
                    onFocus={(e) => tileHover(e, true)}
                    onBlur={(e) => tileHover(e, false)}
                  >
                    <span className="tile-media">
                      <Still project={p} image={p.image} />
                      {isLead && <span className="start-here">Start here</span>}
                      <svg className="tile-line" aria-hidden="true"><rect x="3" y="3" rx="14" pathLength={1} /></svg>
                    </span>
                    <span className="tile-title">{p.title}</span>
                    <span className="tile-line-text">{p.summary}</span>
                    <span className="tile-stack">{p.skills.join(", ")}</span>
                  </button>
                );
              })}
            </div>
          </section>

          <section id="experience" ref={experienceEl} className="experience-section">
            <h2>Experience</h2>
            <ul className="jobs">
              {portfolio.experience.map((x, i) => (
                <li key={i}>
                  <strong>{x.title}</strong>
                  <span>{x.where}</span>
                  <span className="when">{x.when}</span>
                  {x.note && <span className="note">{x.note}</span>}
                </li>
              ))}
            </ul>
            <h3 className="skills-title">Education</h3>
            <ul className="jobs">
              {portfolio.education.map((x) => (
                <li key={x.title}>
                  <strong>{x.title}</strong>
                  <span>{x.where}</span>
                  <span className="when">{x.when}</span>
                </li>
              ))}
            </ul>
            <ul className="certs">
              {portfolio.certifications.map((c) => <li key={c}>{c}</li>)}
            </ul>
            <h3 className="skills-title">Skills</h3>
            <p className="skills-help">Outlined skills are in my projects. Click one to see where.</p>
            <div className="skill-groups">
              {portfolio.skillGroups.map((g) => (
                <div key={g.label} className="skill-group">
                  <h4>{g.label}</h4>
                  <div className="skill-list">
                    {g.items.map((name) => (projectSkills.has(name) ? (
                      <button key={name} type="button" className="skill" aria-pressed={skill === name} onClick={() => selectSkill(name)}>
                        {name}
                      </button>
                    ) : (
                      <span key={name} className="skill-plain">{name}</span>
                    )))}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section id="contact" ref={contactEl} className="contact">
            <h2>Let’s talk.</h2>
            <p className="contact-lead">Email is the quickest way to reach me.</p>
            <div className="email-row">
              <a className="email-value" href={`mailto:${portfolio.email}`}>{portfolio.email}</a>
              <button type="button" className="copy" onClick={() => void copyEmail()}>{copied ? "Copied" : "Copy email"}</button>
            </div>
            <dl className="contact-list">
              {portfolio.contact.filter((c) => c.href || c.label === "Based in").map((c) => (
                <div key={c.label}>
                  <dt>{c.label}</dt>
                  <dd>{c.href ? <a href={c.href}>{c.value}</a> : c.value}</dd>
                </div>
              ))}
            </dl>
            <details className="built">
              <summary>How he’s built</summary>
              <p>There’s no 3D model, video or animation file here. He’s a shape defined by maths and drawn by a hand-written GLSL shader on every frame, through React Three Fiber. His walk, spring-driven scarf and reactions are plain TypeScript.
                {portfolio.sourceUrl && <> <a href={portfolio.sourceUrl}>Read the source</a>.</>}
              </p>
            </details>
            <p className="legal">© 2026 {portfolio.name}</p>
          </section>
        </main>
      </div>

      {open !== null && (
        <ProjectView
          key={open}
          project={portfolio.projects[open]}
          visible={viewVisible}
          guideFull={viewVisible ? !(compact && !guideOpen) : !compact}
          mediaRef={media}
          closeRef={closeBtn}
          onClose={() => closeProject()}
        />
      )}

      <div ref={flyer} className="flyer" style={{ display: "none" } as CSSProperties} aria-hidden="true">
        {open !== null && <Still project={portfolio.projects[open]} image={portfolio.projects[open].image} />}
      </div>

      <Stage avatar={avatar} slot={slot} bubble={bubble} signs={signs} zone={zone} doorOpen={doorOpen} onSign={onSign} onNoWebgl={onNoWebgl} onFigureTap={onFigureTap} />
    </div>
  );
}
