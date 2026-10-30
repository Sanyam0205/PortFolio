"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { portfolio, type Project } from "@/content/portfolio";
import { Avatar, type Sign, type Zone } from "@/figure/avatar";
import { answer, type Action } from "@/lib/assistant";

const Stage = dynamic(() => import("./Stage"), { ssr: false });

const GREETING = "Hi! I'm the soft version of Sanyam. Scroll and I'll walk you through my work.";
const SECTIONS: { id: Zone; label: string }[] = [
  { id: "about", label: "About" },
  { id: "work", label: "Work" },
  { id: "experience", label: "Experience" },
  { id: "contact", label: "Contact" },
];
const projectSkills = new Set(portfolio.projects.flatMap((p) => p.skills));

type Option = { label: string; ask?: string; action?: Action };

function optionsFor(zone: Zone, open: number | null): Option[] {
  if (open !== null) {
    return [
      { label: "What was hard?", ask: "what was hard" },
      { label: "What did you use?", ask: "what stack" },
      { label: "Where does it stand?", ask: "where does it stand" },
    ];
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
    { label: "How do I reach you?", action: "contact" },
  ];
}

function Still({ project, image }: { project: Project; image?: string }) {
  if (image) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img className="still-img" src={image} alt="" />;
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

function ProjectView({ project, visible, mediaRef, onClose, closeRef }: {
  project: Project;
  visible: boolean;
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
  useEffect(() => {
    if (paused || !visible || project.shots.length < 2) return;
    const id = window.setInterval(() => setShot((s) => (s + 1) % project.shots.length), 3400);
    return () => window.clearInterval(id);
  }, [paused, visible, project.shots.length]);

  return (
    <section className="project" data-visible={visible} role="dialog" aria-label={project.title}>
      <div className="film" ref={mediaRef}>
        {project.shots.map((s, i) => (
          <div key={i} className="shot" data-on={i === shot}>
            {s.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img className="still-img" src={s.image} alt={s.alt} />
            ) : (
              <span className="still-empty"><small>[Screenshot: {s.caption}]</small></span>
            )}
          </div>
        ))}
        {project.shots.length === 0 && (
          <div className="film-empty">
            <p>{project.summary}</p>
            <small>Screenshots and a video are coming soon.</small>
          </div>
        )}
        {project.shots.length > 0 && <p className="film-caption">{project.shots[shot].caption}</p>}
        {project.shots.length > 1 && (
          <button type="button" className="film-toggle" onClick={() => setPaused((p) => !p)}>
            {paused ? "Play" : "Pause"}
          </button>
        )}
      </div>
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
      <dl className="project-story">
        <div><dt>The problem</dt><dd>{project.problem}</dd></div>
        <div><dt>What I built</dt><dd>{project.built}</dd></div>
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
    const onScroll = () => {
      const y = window.scrollY;
      const phone = window.innerWidth <= 980;
      setCompact((c) => (phone ? (c ? y > 8 : y > 48) : false));
      if (Math.abs(y - guideOpenedAt.current) > 60) setGuideOpen(false);
    };
    onScroll();
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", measure);
    window.addEventListener("resize", onScroll);
    return () => {
      ro.disconnect();
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", measure);
      window.removeEventListener("resize", onScroll);
    };
  }, [avatar]);

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
    returnFocus.current?.focus({ preventScroll: true });
  }, [avatar, say]);

  const pickProject = useCallback((i: number, tile?: HTMLElement | null) => {
    avatar.hover(null);
    const el = tile ?? document.querySelector<HTMLElement>(`[data-project="${i}"]`);
    returnFocus.current = el;
    flight.current.from = el?.querySelector(".tile-media")?.getBoundingClientRect() ?? null;
    document.documentElement.classList.add("locked");
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
      avatar.present();
      say(project.summary);
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
    if (viewVisible) closeBtn.current?.focus({ preventScroll: true });
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
    try {
      await navigator.clipboard.writeText(portfolio.email);
      setCopied(true);
      say(`Copied! My email is ${portfolio.email}. Come on in.`);
    } catch {
      say(`I couldn't reach your clipboard, so here it is: ${portfolio.email}`);
    }
    doorTimer.current = window.setTimeout(() => { setDoorOpen(false); setCopied(false); }, 3200);
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

  const options = optionsFor(zone, open);
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
      </header>

      <div className="split">
        <aside className="guide" data-compact={compact && !guideOpen} aria-label="Sanyam, your guide">
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
                  onClick={() => (o.action ? runAction(o.action) : respond(o.ask ?? ""))}
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
              }}
            >
              <label htmlFor="ask" className="sr-only">Ask Sanyam a question</label>
              <input
                id="ask"
                type="text"
                autoComplete="off"
                value={input}
                placeholder="Ask about my projects, skills or availability"
                onChange={(e) => setInput(e.target.value)}
                onFocus={() => avatar.setTyping(true)}
                onBlur={() => avatar.setTyping(false)}
              />
              <button type="submit" aria-label="Ask">
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

      <nav aria-label="Sections" className="tabs" onClick={closeOnNav}>
        {SECTIONS.map((s) => (
          <a key={s.id} href={`#${s.id}`} aria-current={zone === s.id ? "true" : undefined}>{s.label}</a>
        ))}
      </nav>

      {open !== null && (
        <ProjectView
          key={open}
          project={portfolio.projects[open]}
          visible={viewVisible}
          mediaRef={media}
          closeRef={closeBtn}
          onClose={() => closeProject()}
        />
      )}

      <div ref={flyer} className="flyer" style={{ display: "none" } as CSSProperties} aria-hidden="true">
        {open !== null && <Still project={portfolio.projects[open]} image={portfolio.projects[open].image} />}
      </div>

      <Stage avatar={avatar} slot={slot} bubble={bubble} signs={signs} zone={zone} doorOpen={doorOpen} onSign={onSign} onNoWebgl={onNoWebgl} />
    </div>
  );
}
