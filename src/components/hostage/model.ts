// "Are you a hostage to your agency?" diagnostic.
// Each question scores a risk weight; "don't know" counts as risk because not
// knowing is itself dangerous. Higher total = more hostage risk (0–100).

export type Status = "green" | "amber" | "red";

export interface Category {
  key: string;
  label: string;
}

export const CATEGORIES: Category[] = [
  { key: "code", label: "Code & repository" },
  { key: "backups", label: "Backups" },
  { key: "hosting", label: "Hosting & infrastructure" },
  { key: "domain", label: "Domain & DNS" },
  { key: "payments", label: "Payments & 3rd-party" },
  { key: "access", label: "Access & people" },
  { key: "docs", label: "Documentation & IP" },
];

export interface Option {
  label: string;
  risk: number; // 0 (safe) … 1 (critical)
}

export interface Question {
  id: string;
  category: string;
  weight: number; // importance; critical assets weigh more
  text: string;
  asset: string; // short name shown in "top risks"
  fix: string; // recommendation when this is a top risk
  options: Option[]; // index 0 = best … last usually "don't know"
}

export const QUESTIONS: Question[] = [
  {
    id: "repo-access",
    category: "code",
    weight: 10,
    text: "Do you have direct access to your store's Git repository?",
    asset: "Git repository access",
    fix: "Get an independent full clone into your own GitHub/GitLab organisation.",
    options: [
      { label: "Yes — on our own account", risk: 0 },
      { label: "Yes, but on the agency's account", risk: 0.6 },
      { label: "No / not sure", risk: 1 },
    ],
  },
  {
    id: "repo-history",
    category: "code",
    weight: 7,
    text: "Do you have the full commit history — all branches and tags?",
    asset: "Full commit history",
    fix: "Clone the complete history, not just a snapshot — you lose context and rollback ability without it.",
    options: [
      { label: "Yes — full history", risk: 0 },
      { label: "Only the latest code / a zip", risk: 0.7 },
      { label: "Don't know", risk: 1 },
    ],
  },
  {
    id: "in-vcs",
    category: "code",
    weight: 8,
    text: "Is your site's code actually in version control?",
    asset: "Code under version control",
    fix: "If changes are made straight on the server, take a controlled snapshot and move to Git immediately.",
    options: [
      { label: "Yes — everything is in Git", risk: 0 },
      { label: "Partly — some changes go straight to the server", risk: 0.7 },
      { label: "No — edited directly over FTP", risk: 1 },
    ],
  },
  {
    id: "backup-location",
    category: "backups",
    weight: 9,
    text: "Do you know where your database and media backups are stored?",
    asset: "Backup ownership",
    fix: "Set up an independent backup into cloud storage you own and control.",
    options: [
      { label: "Yes — in our own cloud", risk: 0 },
      { label: "Yes, but the agency controls them", risk: 0.6 },
      { label: "No / not sure", risk: 1 },
    ],
  },
  {
    id: "backup-tested",
    category: "backups",
    weight: 8,
    text: "When was a backup last tested by actually restoring it?",
    asset: "Tested, working backup",
    fix: "A backup that hasn't been restore-tested isn't a backup. Run a restore into a test environment.",
    options: [
      { label: "Within the last 3 months", risk: 0 },
      { label: "Over a year ago / only once", risk: 0.6 },
      { label: "Never / don't know", risk: 1 },
    ],
  },
  {
    id: "hosting-account",
    category: "hosting",
    weight: 9,
    text: "Whose account is the hosting / server under?",
    asset: "Hosting account control",
    fix: "Move hosting to an account you own, or at minimum secure full admin/root access.",
    options: [
      { label: "Ours — with full admin access", risk: 0 },
      { label: "Ours, but only the agency has admin", risk: 0.6 },
      { label: "The agency's account", risk: 1 },
    ],
  },
  {
    id: "domain-owner",
    category: "domain",
    weight: 10,
    text: "Is your domain registered in your name?",
    asset: "Domain ownership",
    fix: "The domain is the single most critical asset. Confirm registrant is you and secure registrar access.",
    options: [
      { label: "Yes — and we control the registrar", risk: 0 },
      { label: "Yes, but the agency manages access", risk: 0.6 },
      { label: "Registered to the agency / not sure", risk: 1 },
    ],
  },
  {
    id: "dns-access",
    category: "domain",
    weight: 6,
    text: "Do you have access to your DNS settings?",
    asset: "DNS access",
    fix: "Get direct registrar/DNS access so you can move services in an emergency.",
    options: [
      { label: "Yes — direct access", risk: 0 },
      { label: "Only via the agency", risk: 0.7 },
      { label: "No / don't know", risk: 1 },
    ],
  },
  {
    id: "third-party",
    category: "payments",
    weight: 7,
    text: "Are your payment gateway and key services (ERP, email) on your own accounts?",
    asset: "Payment & 3rd-party accounts",
    fix: "Critical accounts must be in your name with the agency added as a user — not the other way around.",
    options: [
      { label: "Yes — all on our accounts", risk: 0 },
      { label: "Mixed — some on the agency's", risk: 0.7 },
      { label: "Mostly the agency's / not sure", risk: 1 },
    ],
  },
  {
    id: "bus-factor",
    category: "access",
    weight: 8,
    text: "If your key developer disappeared tomorrow, could someone else take over?",
    asset: "Single point of failure",
    fix: "Document access and knowledge so no single person can hold the store hostage.",
    options: [
      { label: "Yes — access & knowledge are shared", risk: 0 },
      { label: "It would be painful but possible", risk: 0.6 },
      { label: "No — it's all in one person's head", risk: 1 },
    ],
  },
  {
    id: "docs",
    category: "docs",
    weight: 5,
    text: "Is there documentation of your architecture and infrastructure?",
    asset: "Infrastructure documentation",
    fix: "Commission an infrastructure map so a new team can take over without the current one.",
    options: [
      { label: "Yes — current and accessible", risk: 0 },
      { label: "Partial / outdated", risk: 0.6 },
      { label: "None / don't know", risk: 1 },
    ],
  },
  {
    id: "ip-contract",
    category: "docs",
    weight: 8,
    text: "Does your contract clearly state that you own the code?",
    asset: "Code IP ownership",
    fix: "Have the contract's IP clauses reviewed. If the agency retains ownership, this is a risk to resolve contractually.",
    options: [
      { label: "Yes — we own the code", risk: 0 },
      { label: "Not sure what it says", risk: 0.8 },
      { label: "No — the agency retains ownership", risk: 1 },
    ],
  },
];

export const TOTAL_WEIGHT = QUESTIONS.reduce((s, q) => s + q.weight, 0);

export function statusForPct(pct: number): Status {
  if (pct <= 40) return "green";
  if (pct <= 70) return "amber";
  return "red";
}

export interface CategoryResult {
  key: string;
  label: string;
  pct: number;
  status: Status;
}

export interface RiskItem {
  asset: string;
  fix: string;
  status: Status;
  category: string;
}

export interface HostageResult {
  score: number; // 0–100
  status: Status;
  bandLabel: string;
  answered: number;
  categories: CategoryResult[];
  topRisks: RiskItem[];
}

const BAND_LABEL: Record<Status, string> = {
  green: "Low risk — you're in control",
  amber: "Vulnerable — gaps to close",
  red: "Critical — you're exposed",
};

/** answers[i] = chosen option index for QUESTIONS[i], or null if unanswered. */
export function evaluate(answers: (number | null)[]): HostageResult {
  let weighted = 0;
  let answeredWeight = 0;
  let answered = 0;

  const catAgg: Record<string, { w: number; r: number }> = {};
  const risks: (RiskItem & { sortVal: number })[] = [];

  QUESTIONS.forEach((q, i) => {
    const ai = answers[i];
    if (ai == null || !q.options[ai]) return;
    answered++;
    const risk = q.options[ai].risk;
    const contrib = q.weight * risk;
    weighted += contrib;
    answeredWeight += q.weight;

    if (!catAgg[q.category]) catAgg[q.category] = { w: 0, r: 0 };
    catAgg[q.category].w += q.weight;
    catAgg[q.category].r += contrib;

    if (risk > 0) {
      risks.push({
        asset: q.asset,
        fix: q.fix,
        status: statusForPct(risk * 100),
        category: q.category,
        sortVal: contrib,
      });
    }
  });

  // score normalised against answered weight (so partial quizzes still read sensibly)
  const score = answeredWeight > 0 ? Math.round((weighted / answeredWeight) * 100) : 0;
  const status = statusForPct(score);

  const categories: CategoryResult[] = CATEGORIES.map((c) => {
    const agg = catAgg[c.key];
    const pct = agg && agg.w > 0 ? Math.round((agg.r / agg.w) * 100) : 0;
    return { key: c.key, label: c.label, pct, status: statusForPct(pct) };
  });

  // top risks: by weighted severity (weight × risk), highest first
  const topRisks: RiskItem[] = risks
    .sort((a, b) => b.sortVal - a.sortVal)
    .slice(0, 3)
    .map(({ sortVal, ...r }) => r);

  return {
    score,
    status,
    bandLabel: BAND_LABEL[status],
    answered,
    categories,
    topRisks,
  };
}
