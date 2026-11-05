import { portfolio } from "@/content/portfolio";

export type Action = "work" | "contact" | "experience" | "about" | "close" | "best" | "copy-email" | { open: number };
export type Reply = { say: string; action?: Action };

const ORDINALS = ["first", "second", "third"];

const contactValue = (label: string) => portfolio.contact.find((c) => c.label === label && c.href)?.href ?? "";
const email = portfolio.email;

// Answers come only from content/portfolio.ts. Anything else gets an honest
// "not in my portfolio", so the figure can never invent a claim about Sanyam.
// An action may accompany an answer but never replaces it.
export function answer(question: string, openProject: number | null): Reply {
  const q = question.toLowerCase().trim();
  const has = (re: RegExp) => re.test(q);
  const current = openProject === null ? null : portfolio.projects[openProject];
  const count = portfolio.projects.length;

  const digit = q.match(/\bproject\s*#?\s*(\d+)\b/);
  if (digit) {
    const n = Number(digit[1]);
    if (n < 1 || n > count) return { say: `I only have ${count} projects here, so try a number from 1 to ${count}.` };
    return { say: `Project ${n}, coming up.`, action: { open: n - 1 } };
  }
  const ordinal = q.match(new RegExp(`\\b(${ORDINALS.join("|")})\\b`));
  if (ordinal && ORDINALS.indexOf(ordinal[1]) < count) {
    return { say: `The ${ordinal[1]} one, coming up.`, action: { open: ORDINALS.indexOf(ordinal[1]) } };
  }
  const named = portfolio.projects.findIndex((p) => q.includes(p.title.toLowerCase()));
  if (named >= 0) return { say: `${portfolio.projects[named].title}, coming up.`, action: { open: named } };

  // A project's own questions: the offered button's exact wording first.
  const asked = current?.questions.find((x) => x.label.toLowerCase() === q);
  if (asked) return { say: asked.answer };
  if (current && has(/source|\bcode\b|github|repo/)) {
    return { say: current.sourceUrl ? `The code is on GitHub: press Source, or go to ${current.sourceUrl.replace("https://", "")}.` : "The code for this one isn't public yet." };
  }

  if (has(/how (are|were) you (built|made)|how.*(figure|character).*(built|made)|are you (real|a model|3d)|shader/)) {
    return { say: "No 3D model or video. I'm drawn by a hand-written shader on every frame, and my walk and scarf are plain TypeScript." };
  }
  if (has(/\bemail\b|e-mail|mail you/)) return { say: `You can email me at ${email}.`, action: "contact" };
  if (has(/linkedin/)) return { say: contactValue("LinkedIn") ? `I'm on LinkedIn at ${contactValue("LinkedIn")}.` : `My LinkedIn isn't linked here yet. Email me at ${email}.`, action: "contact" };
  if (has(/github/)) return { say: contactValue("GitHub") ? `My GitHub is ${contactValue("GitHub")}.` : `My GitHub isn't linked here yet. Email me at ${email}.`, action: "contact" };
  if (has(/where.*(based|live|from)|location|based in/)) return { say: `I'm based in ${portfolio.city}.` };
  if (has(/authori[sz]|visa|sponsor|right to work|permit|availab|notice|relocat|remote|when can|start date|salary|ctc/)) {
    return { say: `That isn't on my site, but I'll happily answer directly. Email me at ${email}.` };
  }
  if (has(/educat|degree|college|university|study|studied|cgpa|certif|iit/)) {
    const [cert, degree] = portfolio.education;
    return { say: `${degree.title} from ${degree.where}, and a ${cert.title} from ${cert.where}.`, action: "experience" };
  }

  if (has(/hard|challeng|difficult|tough/)) {
    if (!current) return { say: "Pick a project first and I'll tell you what was hard about it." };
    return { say: current.hard ?? "I haven't written that up for this one yet. Ask me what it does or what it's built with." };
  }
  // Typed questions that match one of the open project's own questions.
  const typed = current?.questions.find((x) => x.keys.some((k) => q.includes(k)));
  if (typed) return { say: typed.answer };
  if (current && has(/stack|\buse\b|built with|tech|tools/)) return { say: `I built it with ${current.skills.join(", ")}.` };
  if (current && has(/result|turn out|turned out|impact|learn|outcome|status|stand/)) return { say: current.status };
  if (current && has(/what is|what does|about this/)) return { say: current.summary };

  if (has(/what do you do|currently|right now|day job|working on|current (job|role)/)) {
    const [now] = portfolio.experience;
    return { say: `I'm a ${now.title} at ${now.where}: ${now.note.charAt(0).toLowerCase()}${now.note.slice(1)}`, action: "experience" };
  }
  if (has(/resume|résumé|\bcv\b/)) return { say: "The résumé button is always in the top right corner. It's the maroon one." };
  if (has(/experience|worked at|\bjob|company|employ/)) {
    const [latest] = portfolio.experience;
    return { say: `Most recently, ${latest.title} at ${latest.where}, ${latest.when}. The full list is in Experience.`, action: "experience" };
  }
  const knows = q.match(/(?:know|use|work with|experience with|familiar with)\s+([a-z0-9.+#-]+)/);
  if (knows && !["the", "a", "any", "your"].includes(knows[1])) {
    const found = portfolio.skillGroups.flatMap((g) => g.items).some((s) => s.toLowerCase().includes(knows[1]));
    return { say: found ? `Yes, ${knows[1]} is in my toolkit. The full list is in Experience.` : `${knows[1]} isn't in my portfolio. Mostly I use ${portfolio.skills}.` };
  }
  if (has(/skill|stack|language|framework|\btech/)) return { say: `Mostly ${portfolio.skills}.` };
  if (has(/contact|hire|reach|talk|get in touch/)) return { say: `Email is best: ${email}. The rest is down by the door.`, action: "contact" };
  if (has(/project|portfolio|show me|\bbuilt\b|your work|the work/)) return { say: "Sure, the work is this way. Click any one.", action: "work" };
  if (has(/\bbest\b|impressive|proud|favou?rite|start with/)) return { say: "Good place to start. Here's one of my favourites.", action: "best" };
  if (has(/who are|about you|yourself|your name/)) {
    return { say: `I'm ${portfolio.name}, a ${portfolio.role.toLowerCase()} in ${portfolio.city}. I focus on ${portfolio.focus}.` };
  }
  if (has(/^(hi|hello|hey)\b/)) return { say: "Hello! Ask me anything, or pick an option." };
  return { say: "I don't have that in my portfolio yet. Try my projects, experience, skills, or how to reach me." };
}
