// Everything the site says about Sanyam lives here. The page and the figure's
// answers both read from this file, so nothing else needs editing.

export type Shot = { image?: string; alt: string; caption: string };

export type Project = {
  title: string;
  /** Names must match the skill names below for skill highlighting to find this project. */
  skills: string[];
  summary: string;
  problem: string;
  built: string;
  status: string;
  hard: string;
  /** Add these once the project is deployed; each appears on the page as soon as it is set. */
  liveUrl?: string;
  sourceUrl?: string;
  image?: string;
  shots: Shot[];
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
    { label: "Education", value: "B.Tech in IT, Amity University. CGPA 8.04/10" },
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
    { title: "B.Tech in Information Technology", where: "Amity University, CGPA 8.04/10", when: "2021 – 2025" },
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
      status: "28 end-to-end tests and a deliberately vulnerable demo API. A retest reports each finding as fixed, still open or new. Being completed and deployed.",
      hard: "Making a scanner safe to run. Every request goes through one guarded client that enforces consent, exact host scope, proof of control, budgets and stop conditions.",
      shots: [],
    },
    {
      title: "Job Search OS",
      skills: ["TypeScript", "Node.js", "React", "Vite", "Python", "AI agents", "LLM integration"],
      summary: "A personal, agent-run job search for entry-level software roles in India and remote, built on the open-source career-ops engine.",
      problem: "A job search means watching many boards, judging each role, tailoring a CV and keeping track of it all, every day.",
      built: "An orchestrator that adds LinkedIn, Naukri, Indeed, Glassdoor, Gmail alerts and more to career-ops, with agent-run triage and evaluation, scheduled runs, phone alerts and a React desk for review.",
      status: "Nothing is sent or submitted without my approval on the desk. Being completed and deployed.",
      hard: "Keeping automation from overstepping. Agents run with an explicit allowlist of connector access, sending and deleting are denied, and every application waits for my approval.",
      shots: [],
    },
    {
      title: "Automated Academic Publication Profiler",
      skills: ["Python", "FastAPI", "React", "Data processing"],
      summary: "Collects academic publications from Google Scholar and DBLP, and turns them into structured reports.",
      problem: "Discovering and compiling academic publications across sources takes a lot of manual work.",
      built: "Data-collection workflows integrating Google Scholar and DBLP, with a React interface for browsing the results.",
      status: "Exports structured reports to Excel and Word.",
      hard: "I haven't written that up for this one yet. Ask me what it does or what it's built with.",
      shots: [],
    },
  ] as Project[],
};
