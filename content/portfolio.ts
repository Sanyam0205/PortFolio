// Everything the site says about Sanyam lives here. The page and the figure's
// answers both read from this file, so nothing else needs editing.

/** One slide in a project's film. A `video` plays through, then the slides move on; `image` doubles as its poster. */
export type Shot = { image?: string; video?: string; alt: string; caption: string };

/**
 * A question the figure offers while a project is open. `label` is the button; a typed
 * question that contains any of `keys` gets the same `answer`. Keep answers to a few lines.
 */
export type Question = { label: string; keys: string[]; answer: string };

export type Project = {
  title: string;
  /** Names must match the skill names below for skill highlighting to find this project. */
  skills: string[];
  summary: string;
  problem: string;
  built: string;
  status: string;
  /** Leave out until it's written; the page skips it and the figure says so. */
  hard?: string;
  /** Add these once the project is deployed; each appears on the page as soon as it is set. */
  liveUrl?: string;
  sourceUrl?: string;
  image?: string;
  shots: Shot[];
  questions: Question[];
};

const skillGroups = [
  { label: "Languages", items: ["Python", "JavaScript", "TypeScript", "SQL", "Java", "C/C++"] },
  { label: "Backend", items: ["FastAPI", "Flask", "Node.js", "Express.js", "REST APIs"] },
  { label: "Frontend", items: ["React", "Vite"] },
  { label: "Databases", items: ["MongoDB", "MySQL", "ChromaDB"] },
  { label: "Data and AI", items: ["Data processing", "Log ingestion", "Ollama", "LLM integration", "AI agents", "Embeddings", "Vector search"] },
  { label: "Security", items: ["API security testing", "Access control", "JWT", "SSRF protection"] },
  { label: "Automation and testing", items: ["Selenium WebDriver", "PowerShell", "End-to-end testing", "Debugging"] },
  { label: "Systems and tools", items: ["Linux", "Windows", "macOS", "Git", "GitHub", "Postman", "AWS EC2", "Docker", "Chromium"] },
];

const email = "sanyamsingh0205@gmail.com";

export const portfolio = {
  name: "Sanyam Singh",
  role: "Software engineer",
  city: "India",
  intro:
    "I build reliable backend services in Python, along with REST APIs, cross-platform automation and locally hosted LLM integrations. The soft one in the scarf is me.",
  focus: "backend services, automation and AI-assisted information retrieval",
  // The answers a recruiter screens for, shown on the first screen.
  facts: [
    { label: "Currently", value: "Software Development Engineer I, Teleperformance" },
    { label: "Focus", value: "Python backend, automation, LLM integration" },
    { label: "Based in", value: "India" },
    { label: "Education", value: "B.Tech in IT, Amity University. CGPA 8.15/10" },
  ],
  skillGroups,
  skills: "Python, FastAPI, Node.js, SQL and MongoDB, plus LLM integration with Ollama and vector search",
  experience: [
    {
      title: "Software Development Engineer I",
      where: "Teleperformance",
      when: "Jul 2025 – Present",
      note: "Cross-platform network monitoring in Python and PowerShell, backend workflows for device telemetry and logs, and locally hosted LLM workflows for natural-language investigation of device data.",
    },
    {
      title: "Business Intern",
      where: "BT Group",
      when: "Jan 2025 – Jul 2025",
      note: "Root-cause analysis of enterprise connectivity and performance incidents across routers, switches and firewalls.",
    },
    {
      title: "Web Developer Intern",
      where: "ReKart Innovation",
      when: "May 2024 – Aug 2024",
      note: "Built a MERN purchase-order application with vendor management, backend APIs and PDF generation.",
    },
  ],
  education: [
    { title: "Major Certification in Artificial Intelligence", where: "Indian Institute of Technology Ropar", when: "Nov 2024 – Jun 2026" },
    { title: "B.Tech in Information Technology", where: "Amity University, CGPA 8.15/10", when: "2021 – 2025" },
  ],
  certifications: [
    "NPTEL: Introduction to Machine Learning",
    "Cisco CCNAv7: Introduction to Networks; Switching, Routing and Wireless Essentials; Enterprise Networking, Security and Automation",
  ],
  email,
  /** A row only appears once it has something to show; add your LinkedIn and GitHub addresses to href. */
  contact: [
    { label: "Based in", value: "India", href: "" },
    { label: "LinkedIn", value: "LinkedIn profile", href: "" },
    { label: "GitHub", value: "GitHub profile", href: "" },
  ],
  resumeUrl: "/Sanyam_Singh_Resume.pdf",
  /** Link to this site's source, shown in the "how he's built" note when set. */
  sourceUrl: "",
  projects: [
    {
      title: "breakAPI",
      skills: ["Node.js", "JavaScript", "REST APIs", "API security testing", "Access control", "JWT", "SSRF protection", "End-to-end testing", "Docker"],
      summary: "Checks APIs you own, or are authorized to test, for security weaknesses such as broken access control and cross-account data exposure.",
      problem: "APIs can ship with broken access control, authentication gaps, IDOR/BOLA exposure and unsafe input handling, and testing for these needs real guardrails.",
      built: "A dependency-free Node.js scanner that imports OpenAPI and Postman specs and runs configuration, authentication, authorization, input and rate-limit checks. No test runs until consent is recorded and the target is in approved scope.",
      status: "Live as a public demo lab: plant flaws in a simulated multi-tenant SaaS API, scan it, and compare what was planted with what was found. 28 end-to-end tests, and a retest reports each finding as fixed, still open or new.",
      hard: "Making a scanner safe to run. Every request goes through one guarded client that enforces consent, exact host scope, proof of control, budgets and stop conditions.",
      liveUrl: "https://breakapi.netlify.app/#/lab",
      sourceUrl: "https://github.com/Sanyam0205/BreakAPI",
      image: "/projects/breakapi-results.jpg",
      shots: [
        { video: "/projects/breakapi.mp4", image: "/projects/breakapi-lab.jpg", alt: "Screen recording of breakAPI's demo lab: five flaws are planted in a sandbox API, a scan runs, and the planted-versus-detected table and a critical finding are shown.", caption: "Plant five flaws, scan, see what it caught" },
        { image: "/projects/breakapi-lab.jpg", alt: "breakAPI simulation playground with checkboxes for flaws to plant, grouped by test category.", caption: "Choose which flaws to plant in a sandbox API" },
        { image: "/projects/breakapi-results.jpg", alt: "Completed scan showing planted versus detected: every planted flaw found and no false alarms on patched ones.", caption: "Planted vs detected, checked against ground truth" },
        { image: "/projects/breakapi-finding.jpg", alt: "A critical finding, a JWT signed with a guessable secret, with impact, fix and evidence, above the request log.", caption: "Every finding with impact, fix and evidence" },
      ],
      questions: [
        { label: "Can I try it?", keys: ["try", "demo", "live", "play with", "use it"], answer: "Yes. The demo lab runs real scans against a practice API, and the playground lets you plant flaws in a sandbox and see what it catches. Press View live." },
        { label: "How does it stay safe?", keys: ["safe", "consent", "guard", "scope", "legal", "permission", "authoriz"], answer: "Nothing runs without recorded consent and an exact host scope. Every request goes through one guarded client with proof of control, request budgets and stop conditions, and DELETE is never sent." },
        { label: "What does it check?", keys: ["check", "test for", "scan for", "look for", "detect", "vulnerab", "find"], answer: "Configuration and CORS, exposed files, authentication and JWT flaws, cross-account access (IDOR/BOLA), input handling and rate limits, plus opt-in synthetic writes for validation and business logic." },
        { label: "How do you know it works?", keys: ["accura", "false", "know it works", "prove", "reliab"], answer: "The playground plants known flaws and scores planted against detected, so misses and false alarms both show up. There are also 28 end-to-end tests." },
        { label: "What can it import?", keys: ["import", "openapi", "swagger", "postman", "spec"], answer: "OpenAPI 3 and Swagger 2 specs, Postman v2 collections, or a plain list of endpoints like GET /users/{id}." },
        { label: "Any dependencies?", keys: ["dependen", "framework", "library", "npm"], answer: "None. It's a hand-written Node.js 22 server and a vanilla JavaScript single-page app, with no build step." },
      ],
    },
    {
      title: "GiggleGig",
      skills: ["TypeScript", "Node.js", "React", "Vite", "SQL", "Python", "AI agents", "LLM integration"],
      summary: "A personal, agent-run job search that runs on my own computer. Upload a resume and it finds matching roles, scores them and writes tailored CVs, but never sends or submits anything. Built on the open-source career-ops engine.",
      problem: "A job search means watching many boards, judging each role, tailoring a CV and keeping track of it all, every day.",
      built: "A Node and SQLite orchestrator around career-ops, with a React desk. Agents run through Claude Code: they search job boards, 100+ company career pages and alert emails, screen and score each role, and write fact-checked one-page CVs.",
      status: "In daily use for my own search. It runs locally on a paid Claude plan with no logins, so there's no public demo; the video is the real desk.",
      hard: "Keeping automation from overstepping. Nothing runs or sends on its own: agents get a narrow tool allowlist, sending and deleting are blocked in code, and every CV and message waits for my approval.",
      sourceUrl: "https://github.com/Sanyam0205/GiggleGig",
      image: "/projects/gigglegig-tile.jpg",
      shots: [
        { video: "/projects/gigglegig.mp4", image: "/projects/gigglegig-today.jpg", alt: "Screen recording of the GiggleGig desk: Today, the Review boxes with a role's full read, Find, Applications, Profile, the agent register, and the dark theme. Pay details are blurred.", caption: "A tour of the desk" },
        { image: "/projects/gigglegig-review.jpg", alt: "Review page: roles as boxes grouped into strong, good and possible fits, with the selected role's checks, pay and job description beside them.", caption: "Every role as a box; the heavier it is, the better the fit" },
        { image: "/projects/gigglegig-today.jpg", alt: "Today page: items waiting for sign-off, new matches and the agent register.", caption: "Today: what needs me, new matches and what the agents did" },
        { image: "/projects/gigglegig-applications.jpg", alt: "Applications page listing applied roles by stage, with export and backup buttons.", caption: "Applications by stage, kept safe through resume updates" },
        { image: "/projects/gigglegig-agents.jpg", alt: "The agent register open over the usage page, listing each agent run and its steps.", caption: "Every agent run, step by step, and my plan's limits" },
      ],
      questions: [
        { label: "Does it apply for you?", keys: ["apply for", "submit", "send", "on its own", "automatic"], answer: "No. Agents draft CVs, answers and outreach and stop before Submit. I approve each one, and email items become Gmail drafts that I send myself." },
        { label: "Where does it look?", keys: ["where does it look", "source", "board", "platform", "linkedin", "naukri"], answer: "LinkedIn, Naukri, Indeed, Google Jobs, Wellfound, Y Combinator, Cutshort, Instahyre, remote boards, Hacker News \"Who is hiring\", 100+ company career pages and job-alert emails." },
        { label: "How does it score roles?", keys: ["score", "rank", "rate", "evaluat", "triage", "fit"], answer: "Rules drop the obvious misses before any AI runs. A quick review scores each role against my profile, and only roles I pick get a full requirement-by-requirement evaluation." },
        { label: "Are the CVs truthful?", keys: ["cv", "truth", "honest", "fact", "tailor", "make up", "invent"], answer: "Yes. Each CV uses only facts from my resume and is fact-checked against it, then read by three reviewer agents: an ATS parser, a recruiter and a hiring manager." },
        { label: "Why isn't it online?", keys: ["online", "live", "demo", "host", "deploy", "try it"], answer: "It runs on my machine through Claude Code on a paid plan, and the desk has no logins by design, so it shouldn't face the internet. The video shows the real desk." },
        { label: "What does it cost to run?", keys: ["cost", "price", "token", "expensive", "money"], answer: "At API prices, a quick review is about $0.02 for eight roles, a full evaluation about $0.40 and a tailored CV about $1.50. The desk shows my plan's limits before anything runs." },
      ],
    },
    {
      title: "Automated Academic Publication Profiler",
      skills: ["Python", "FastAPI", "React", "Data processing"],
      summary: "Collects academic publications from Google Scholar and DBLP, and turns them into structured reports.",
      problem: "Discovering and compiling academic publications across sources takes a lot of manual work.",
      built: "Data-collection workflows integrating Google Scholar and DBLP, with a React interface for browsing the results.",
      status: "Exports structured reports to Excel and Word.",
      shots: [],
      questions: [
        { label: "Where does the data come from?", keys: ["data", "source", "scholar", "dblp", "where from"], answer: "Google Scholar and DBLP. Data-collection workflows pull publications from both." },
        { label: "What do you get out?", keys: ["output", "export", "report", "excel", "word", "get out"], answer: "Structured reports exported to Excel and Word, plus a React interface for browsing the results." },
      ],
    },
  ] as Project[],
};
