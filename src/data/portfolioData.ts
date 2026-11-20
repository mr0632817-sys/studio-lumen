export interface ProjectItem {
  id: string;
  title: string;
  subtitle: string;
  category: "Web Application" | "Productivity System" | "Finance Tool";
  description: string;
  highlights: string[];
  tech: string[];
  liveUrl?: string;
  repoUrl?: string;
}

export interface CreativeWorkItem {
  title: string;
  medium: string;
  description: string;
}

export const PROFILE_DATA = {
  brand: "ABM IT",
  fullName: "ABM Iftiazur Rahman",
  role: "Full-Stack Developer & Media Communicator",
  tagline: "Engineering precision web systems and purposeful digital narratives.",
  bio: "Undergraduate student in Media, Communication, and Journalism at North South University, building clean full-stack applications alongside analytical writing and creative storytelling.",
  location: "Dhaka, Bangladesh",
  email: "contact@abmit-portfolio.vercel.app",
  githubUrl: "https://github.com/mr0632817-sys",
};

export const PROJECTS: ProjectItem[] = [
  {
    id: "hishab",
    title: "হিসাব (Hishab)",
    subtitle: "Personal Finance & Expense Intelligence",
    category: "Finance Tool",
    description:
      "A streamlined personal accounting and daily cash-flow tracker built for rapid entry, category-level analytics, and clear monthly budget visibility.",
    highlights: [
      "Real-time income vs. expense breakdown with visual summaries",
      "Fast transaction logging optimized for mobile and desktop workflows",
      "Clean dual-theme interface designed for distraction-free financial review",
    ],
    tech: ["React", "TypeScript", "Tailwind CSS", "Local Persistence"],
    liveUrl: "https://abmit-portfolio.vercel.app",
    repoUrl: "https://github.com/mr0632817-sys",
  },
  {
    id: "routina",
    title: "Routina",
    subtitle: "Structured Daily Habit & Schedule Architecture",
    category: "Productivity System",
    description:
      "A minimalist daily planning and consistency engine designed to organize academic blocks, deep-work sessions, and recurring personal routines.",
    highlights: [
      "Time-blocked daily planner with visual completion tracking",
      "Streak and consistency metrics without clutter",
      "Responsive layout tailored for quick daily check-ins",
    ],
    tech: ["React", "TypeScript", "Tailwind CSS", "State Management"],
    liveUrl: "https://abmit-portfolio.vercel.app",
    repoUrl: "https://github.com/mr0632817-sys",
  },
  {
    id: "split-ledger",
    title: "Split Ledger",
    subtitle: "Group Expense & Balance Settlement Engine",
    category: "Web Application",
    description:
      "A collaborative expense-splitting application for trips, shared living, and group outings that calculates exact net balances with minimal transactions.",
    highlights: [
      "Automated debt simplification across multiple participants",
      "Transparent itemized ledger with instant shareable summaries",
      "Zero-friction calculation for equal and custom splits",
    ],
    tech: ["TypeScript", "React", "Tailwind CSS", "Algorithmic Settlement"],
    liveUrl: "https://abmit-portfolio.vercel.app",
    repoUrl: "https://github.com/mr0632817-sys",
  },
];

export const CREATIVE_WORKS: CreativeWorkItem[] = [
  {
    title: "Bilingual Philosophical Essays",
    medium: "Long-Form Writing & Logic",
    description:
      "Explorations of clarity, patience, and human behavior through structured reasoning and allegorical storytelling.",
  },
  {
    title: "Bengali Poetry & Verse",
    medium: "Literature & Creative Expression",
    description:
      "Free-verse and rhythmic compositions examining solitude, human connection, and quiet introspection.",
  },
  {
    title: "Media & Communication Research",
    medium: "Academic & Digital Media",
    description:
      "Critical analysis of contemporary digital ecosystems, visual storytelling, and audience narratives.",
  },
];

export const TECH_STACK = [
  "TypeScript",
  "React / Next.js",
  "Three.js / WebGL",
  "Tailwind CSS",
  "Node.js",
  "Git & Linux",
  "UI/UX Systems",
  "Digital Media",
];
