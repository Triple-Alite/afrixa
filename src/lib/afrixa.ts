export type OpportunityCategory =
  | "job"
  | "gig"
  | "freelance"
  | "internship"
  | "grant";

export type Opportunity = {
  id: string;
  client_id: string | null;
  title: string;
  company: string;
  country: string | null;
  category: string;
  job_type: string | null;
  work_mode: string | null;
  currency: string;
  budget_min: number | null;
  budget_max: number | null;
  price_from: number | null;
  escrow_funded: boolean;
  rating: number | null;
  reviews_count: number;
  delivery_days: number | null;
  deadline: string | null;
  experience_level: string | null;
  description: string | null;
  skills: string[];
  created_at: string;
};

const SYMBOLS: Record<string, string> = {
  USD: "$",
  NGN: "₦",
  GBP: "£",
  EUR: "€",
  KES: "KSh ",
  GHS: "GH₵",
  ZAR: "R",
};

export function money(amount: number | null | undefined, currency = "USD") {
  if (amount === null || amount === undefined) return "—";
  const symbol = SYMBOLS[currency] ?? `${currency} `;
  return `${symbol}${Math.round(amount).toLocaleString("en-US")}`;
}

export function budgetLabel(o: Opportunity) {
  if (o.price_from !== null) return `From ${money(o.price_from, o.currency)}`;
  if (o.budget_min !== null && o.budget_max !== null && o.budget_min !== o.budget_max)
    return `${money(o.budget_min, o.currency)} – ${money(o.budget_max, o.currency)}`;
  return money(o.budget_max ?? o.budget_min, o.currency);
}

export function timeLeft(deadline: string | null) {
  if (!deadline) return null;
  const days = Math.ceil(
    (new Date(deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
  );
  if (days < 0) return "Closed";
  if (days === 0) return "Today";
  return `${days}d left`;
}

export function initials(name: string | null | undefined) {
  if (!name) return "AX";
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export const COUNTRIES = [
  "Nigeria",
  "Kenya",
  "Ghana",
  "South Africa",
  "Egypt",
  "Rwanda",
  "Tanzania",
  "Uganda",
  "Senegal",
  "Morocco",
  "Ethiopia",
  "Côte d'Ivoire",
  "United Kingdom",
  "United States",
  "Canada",
  "Germany",
  "United Arab Emirates",
];

export const SKILLS = [
  "UI/UX Design",
  "Graphic Design",
  "Frontend Development",
  "Backend Development",
  "Mobile Development",
  "Data Analysis",
  "Content Writing",
  "Digital Marketing",
  "Video Editing",
  "Virtual Assistance",
  "Product Management",
  "Customer Support",
];

export const LANGUAGES = [
  "English",
  "French",
  "Arabic",
  "Portuguese",
  "Swahili",
  "Yoruba",
  "Hausa",
  "Igbo",
  "Amharic",
  "Zulu",
];

export const EXPERIENCE_LEVELS = [
  "Less than 1 year",
  "1-2 Years",
  "3-4 Years",
  "5+ Years",
  "10+ Years",
];

export const OPPORTUNITY_STATS = [
  { label: "Jobs", value: "1,248", key: "job" },
  { label: "Gigs", value: "2,356", key: "gig" },
  { label: "Freelance", value: "5,748", key: "freelance" },
  { label: "Internships", value: "823", key: "internship" },
  { label: "Grants", value: "209", key: "grant" },
];

export type QuizQuestion = {
  question: string;
  options: string[];
  answer: number;
};

export const ASSESSMENT_QUESTIONS: QuizQuestion[] = [
  {
    question:
      "Which principle focuses on designing products that are easy to use and understand?",
    options: ["Consistency", "Usability", "Accessibility", "Scalability"],
    answer: 1,
  },
  {
    question: "What is the main purpose of a wireframe?",
    options: [
      "Final visual polish",
      "Structure and layout of content",
      "Writing production code",
      "Choosing brand colours",
    ],
    answer: 1,
  },
  {
    question: "Which research method observes users completing real tasks?",
    options: ["Usability testing", "Surveys", "A/B testing", "Card sorting"],
    answer: 0,
  },
  {
    question: "What does a design system primarily provide?",
    options: [
      "One-off screen mockups",
      "Reusable components and shared rules",
      "Server infrastructure",
      "Marketing copy",
    ],
    answer: 1,
  },
  {
    question: "Minimum recommended touch target size on mobile is closest to:",
    options: ["12px", "24px", "44px", "80px"],
    answer: 2,
  },
  {
    question: "Which contrast ratio meets WCAG AA for normal body text?",
    options: ["2:1", "3:1", "4.5:1", "1.5:1"],
    answer: 2,
  },
  {
    question: "A user flow diagram is most useful for:",
    options: [
      "Mapping the steps to complete a task",
      "Picking typefaces",
      "Estimating server cost",
      "Writing unit tests",
    ],
    answer: 0,
  },
  {
    question: "What is progressive disclosure?",
    options: [
      "Showing everything at once",
      "Revealing information only as needed",
      "Hiding errors from users",
      "Animating every element",
    ],
    answer: 1,
  },
  {
    question: "Which metric best measures onboarding success?",
    options: [
      "Number of colours used",
      "Completion rate of the first key action",
      "Total screens designed",
      "Font file size",
    ],
    answer: 1,
  },
  {
    question: "Good empty-state design should:",
    options: [
      "Be left blank",
      "Explain what goes here and offer the next action",
      "Show a raw error code",
      "Redirect users home",
    ],
    answer: 1,
  },
];

export function levelForScore(score: number) {
  if (score >= 85) return "Advanced";
  if (score >= 65) return "Intermediate";
  if (score >= 40) return "Beginner";
  return "Learning";
}
