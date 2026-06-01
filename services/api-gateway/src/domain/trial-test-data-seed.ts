import type {
  CaseAssignee,
  CasePriority,
  CaseStatus,
  CreateAgenceBody,
  CreateArticleBody,
  CreateCaseBody,
  CreateCaseTemplateBody,
  CreateCustomerBody,
  CreateInterventionBody,
  CreatePermissionProfileBody,
  CreateTeamBody,
  CreateTechnicianBody,
  CreateVehicleBody,
  CustomerKind,
  PermissionCode,
  TemplateStep,
  TodoDashboardRule,
} from "@syncora/shared";

/** Volumes cibles pour l’injection de démo (vs. jeu initial minimal). */
export const TRIAL_DEMO_COUNTS = {
  agences: 2,
  technicians: 6,
  teams: 2,
  vehicles: 2,
  permissionProfiles: 4,
  caseTemplates: 4,
  customers: 100,
  cases: 100,
  articles: 30,
  interventions: 40,
  /** Interventions sans créneau (colonne « Non planifiées » du planning). */
  unscheduledInterventions: 10,
  /** Dossiers assignés à l’utilisateur qui injecte (tableau de bord). */
  userAssignedCases: 24,
} as const;

export interface DemoCaseAssignee {
  userId: string;
  name: string;
}

const FIRST_NAMES = [
  "Lucas",
  "Emma",
  "Noah",
  "Léa",
  "Hugo",
  "Chloé",
  "Louis",
  "Manon",
  "Gabriel",
  "Camille",
  "Arthur",
  "Julie",
  "Raphaël",
  "Sarah",
  "Tom",
  "Inès",
];

const LAST_NAMES = [
  "Martin",
  "Bernard",
  "Petit",
  "Durand",
  "Leroy",
  "Moreau",
  "Simon",
  "Laurent",
  "Lefebvre",
  "Michel",
  "Garcia",
  "David",
  "Bertrand",
  "Roux",
  "Vincent",
  "Fournier",
];

const SPECIALITIES = [
  "Électricité",
  "Plomberie",
  "Chauffage",
  "Climatisation",
  "Couverture",
  "Menuiserie",
];

const COMPANY_PREFIXES = [
  "Bâtiments",
  "Habitat",
  "Rénovation",
  "Travaux",
  "Services",
  "Énergie",
  "Confort",
  "Pro",
];

const COMPANY_SUFFIXES = [
  "Dupont",
  "Martin",
  "Leroy",
  "Bernard",
  "Girard",
  "Roux",
  "Blanc",
  "Noir",
];

const CASE_TITLE_VERBS = [
  "Dépannage",
  "Installation",
  "Rénovation",
  "Maintenance",
  "Diagnostic",
  "Mise aux normes",
  "Contrôle",
  "Remplacement",
];

const CASE_TITLE_OBJECTS = [
  "chaudière",
  "tableau électrique",
  "fuite cuisine",
  "VMC",
  "radiateurs",
  "compteur",
  "réseau eau",
  "porte de garage",
  "climatisation",
  "toiture",
];

const ARTICLE_CATALOG: { name: string; unit: string; baseRef: string }[] = [
  { name: "Disjoncteur 20A", unit: "unité", baseRef: "DJ20" },
  { name: "Disjoncteur 32A", unit: "unité", baseRef: "DJ32" },
  { name: "Tube PER 16 mm", unit: "m", baseRef: "PER16" },
  { name: "Tube PER 20 mm", unit: "m", baseRef: "PER20" },
  { name: "Joint fibre 3/4", unit: "unité", baseRef: "JF34" },
  { name: "Robinet d'arrêt", unit: "unité", baseRef: "RA12" },
  { name: "Gaine ICTA 20 mm", unit: "m", baseRef: "ICTA20" },
  { name: "Câble 3G2,5", unit: "m", baseRef: "C325" },
  { name: "Wago 5 entrées", unit: "unité", baseRef: "W5" },
  { name: "Colle PVC 250 ml", unit: "unité", baseRef: "CPVC" },
];

const CASE_STATUSES: CaseStatus[] = [
  "open",
  "in_progress",
  "waiting",
  "completed",
  "draft",
  "open",
  "in_progress",
];

const CASE_PRIORITIES: CasePriority[] = ["medium", "high", "low", "urgent", "medium", "high"];

const TEAM_COLORS = ["#7C3AED", "#0EA5E9", "#059669", "#D97706"];

type DemoProfileSeed = Pick<CreatePermissionProfileBody, "name" | "description" | "permissions">;

const DEMO_PERMISSION_PROFILES: DemoProfileSeed[] = [
  {
    name: "Démo — Technicien terrain",
    description: "Lecture dossiers, interventions et clients.",
    permissions: [
      "cases.read",
      "interventions.read",
      "interventions.update",
      "customers.read",
      "fleet.technicians.read",
      "teams.read",
    ] as PermissionCode[],
  },
  {
    name: "Démo — Chef d'équipe",
    description: "Pilotage des équipes et du planning.",
    permissions: [
      "cases.read",
      "cases.update",
      "cases.assign",
      "interventions.read",
      "interventions.create",
      "interventions.update",
      "customers.read",
      "teams.read",
      "teams.update",
      "fleet.technicians.read",
      "fleet.vehicles.read",
    ] as PermissionCode[],
  },
  {
    name: "Démo — Gestionnaire stock",
    description: "Articles et mouvements de stock.",
    permissions: [
      "stock.articles.read",
      "stock.articles.create",
      "stock.articles.update",
      "stock.movements.read",
      "stock.movements.create",
      "cases.read",
    ] as PermissionCode[],
  },
  {
    name: "Démo — Secrétariat",
    description: "Accueil client et création de dossiers.",
    permissions: [
      "customers.read",
      "customers.create",
      "customers.update",
      "cases.read",
      "cases.create",
      "cases.update",
      "case_templates.read",
    ] as PermissionCode[],
  },
];

/** Règle « Afficher sur le tableau de bord » pour les todos des modèles démo. */
const DEMO_TODO_DASHBOARD_RULE: TodoDashboardRule = {
  showOnDashboard: true,
  visibility: "all",
};

function demoTemplateSteps(kind: string): TemplateStep[] {
  return [
    {
      name: "Prise en charge",
      order: 0,
      description: `Étape démo — ${kind}`,
      todos: [
        {
          label: "Contacter le client",
          description: "Donnée de démonstration",
          dashboardRule: DEMO_TODO_DASHBOARD_RULE,
        },
        { label: "Planifier le créneau", description: "Donnée de démonstration" },
      ],
    },
    {
      name: "Intervention",
      order: 1,
      todos: [
        {
          label: "Réaliser l'intervention",
          description: "Donnée de démonstration",
          dashboardRule: DEMO_TODO_DASHBOARD_RULE,
        },
        { label: "Photos avant / après", description: "Donnée de démonstration" },
      ],
    },
    {
      name: "Clôture",
      order: 2,
      todos: [
        {
          label: "Compte-rendu et facturation",
          description: "Donnée de démonstration",
          dashboardRule: DEMO_TODO_DASHBOARD_RULE,
        },
      ],
    },
  ];
}

const DEMO_CASE_TEMPLATES: Pick<CreateCaseTemplateBody, "name" | "description" | "steps">[] = [
  {
    name: "Démo — Dépannage plomberie",
    description: "Modèle de dossier pour fuites et dépannages sanitaires.",
    steps: demoTemplateSteps("plomberie"),
  },
  {
    name: "Démo — Installation électrique",
    description: "Modèle pour mise aux normes et extensions.",
    steps: demoTemplateSteps("électricité"),
  },
  {
    name: "Démo — Entretien chauffage",
    description: "Modèle pour maintenance annuelle chaudière.",
    steps: demoTemplateSteps("chauffage"),
  },
  {
    name: "Démo — SAV climatisation",
    description: "Modèle pour diagnostic et recharge.",
    steps: demoTemplateSteps("climatisation"),
  },
];

function padIndex(index: number, width = 3): string {
  return String(index).padStart(width, "0");
}

function pick<T>(items: readonly T[], index: number): T {
  return items[index % items.length]!;
}

export function buildDemoAgences(organizationId: string): CreateAgenceBody[] {
  return [
    {
      organizationId,
      name: "Agence démo Lyon",
      address: "12 rue de la République",
      city: "Lyon",
      postalCode: "69002",
      phone: "04 00 00 00 01",
      isTestData: true,
    },
    {
      organizationId,
      name: "Agence démo Marseille",
      address: "5 quai du Port",
      city: "Marseille",
      postalCode: "13002",
      phone: "04 00 00 00 02",
      isTestData: true,
    },
  ];
}

export function buildDemoTechnicians(organizationId: string): CreateTechnicianBody[] {
  return Array.from({ length: TRIAL_DEMO_COUNTS.technicians }, (_, i) => ({
    organizationId,
    firstName: pick(FIRST_NAMES, i),
    lastName: pick(LAST_NAMES, i + 3),
    speciality: pick(SPECIALITIES, i),
    phone: `06 00 00 ${padIndex(i, 2)}`,
    isTestData: true,
  }));
}

export function buildDemoTeams(
  organizationId: string,
  agenceIds: string[],
  technicianIds: string[],
): CreateTeamBody[] {
  const half = Math.ceil(technicianIds.length / TRIAL_DEMO_COUNTS.teams);
  return Array.from({ length: TRIAL_DEMO_COUNTS.teams }, (_, i) => ({
    organizationId,
    name: `Équipe démo ${i + 1}`,
    agenceId: pick(agenceIds, i),
    technicianIds: technicianIds.slice(i * half, (i + 1) * half),
    calendarColor: pick(TEAM_COLORS, i),
    isTestData: true,
  }));
}

export function buildDemoVehicles(organizationId: string, orgSuffix: string): CreateVehicleBody[] {
  return Array.from({ length: TRIAL_DEMO_COUNTS.vehicles }, (_, i) => ({
    organizationId,
    type: i === 0 ? "camionnette" : "utilitaire",
    registrationNumber: `DEMO-${orgSuffix}-${padIndex(i + 1, 2)}`,
    brand: i === 0 ? "Renault" : "Peugeot",
    model: i === 0 ? "Kangoo" : "Partner",
    status: "actif",
    isTestData: true,
  }));
}

export function buildDemoPermissionProfiles(organizationId: string): CreatePermissionProfileBody[] {
  return DEMO_PERMISSION_PROFILES.map((p) => ({
    organizationId,
    ...p,
    isTestData: true,
  }));
}

export function buildDemoCaseTemplates(organizationId: string): CreateCaseTemplateBody[] {
  return DEMO_CASE_TEMPLATES.map((t) => ({
    organizationId,
    ...t,
    isTestData: true,
  }));
}

export function buildDemoCustomers(organizationId: string): CreateCustomerBody[] {
  return Array.from({ length: TRIAL_DEMO_COUNTS.customers }, (_, i) => {
    const kind: CustomerKind = i % 3 === 0 ? "company" : "individual";
    if (kind === "company") {
      return {
        organizationId,
        kind,
        companyName: `${pick(COMPANY_PREFIXES, i)} ${pick(COMPANY_SUFFIXES, i)} ${i + 1}`,
        email: `client-demo-${padIndex(i + 1)}@example.test`,
        phone: `01 ${padIndex(10 + (i % 90), 2)} 00 00 ${padIndex(i % 100, 2)}`,
        isTestData: true,
      };
    }
    return {
      organizationId,
      kind,
      firstName: pick(FIRST_NAMES, i),
      lastName: pick(LAST_NAMES, i + 5),
      mobile: `06 ${padIndex(10 + (i % 90), 2)} 00 00 ${padIndex(i % 100, 2)}`,
      isTestData: true,
    };
  });
}

export function buildDemoArticles(organizationId: string, orgSuffix: string): CreateArticleBody[] {
  return Array.from({ length: TRIAL_DEMO_COUNTS.articles }, (_, i) => {
    const base = pick(ARTICLE_CATALOG, i);
    return {
      organizationId,
      name: `${base.name} (démo)`,
      reference: `DEMO-${orgSuffix}-${base.baseRef}-${padIndex(i + 1)}`,
      unit: base.unit,
      initialStock: 10 + (i % 40),
      reorderPoint: 5 + (i % 10),
      isTestData: true,
    };
  });
}

export interface DemoCaseSeed {
  create: CreateCaseBody;
  status: CaseStatus;
}

function buildCaseBase(
  organizationId: string,
  i: number,
  customerIds: string[],
  templateIds: string[],
  assignees?: CaseAssignee[],
): Omit<CreateCaseBody, "organizationId"> & { organizationId: string } {
  const verb = pick(CASE_TITLE_VERBS, i);
  const object = pick(CASE_TITLE_OBJECTS, i + 2);
  const templateId = i % 4 === 0 && templateIds.length > 0 ? pick(templateIds, i / 4) : undefined;
  return {
    organizationId,
    title: `Démo — ${verb} ${object} #${i + 1}`,
    description: "Dossier généré pour la démonstration Syncora.",
    priority: pick(CASE_PRIORITIES, i),
    customerId: pick(customerIds, i),
    ...(templateId ? { templateId } : {}),
    ...(assignees?.length ? { assignees } : {}),
    isTestData: true,
  };
}

/** Dossiers assignés à l’utilisateur courant, avec statuts variés pour le tableau de bord. */
function buildUserAssignedCaseSeed(
  organizationId: string,
  i: number,
  customerIds: string[],
  templateIds: string[],
  assignee: DemoCaseAssignee,
): DemoCaseSeed {
  const now = Date.now();
  const assignees: CaseAssignee[] = [{ userId: assignee.userId, name: assignee.name }];
  const base = buildCaseBase(organizationId, i, customerIds, templateIds, assignees);
  const templateId =
    templateIds.length > 0 && i < 20 ? pick(templateIds, i % templateIds.length) : undefined;
  const create = { ...base, ...(templateId ? { templateId } : {}) };

  if (i < 8) {
    const dueDate = new Date(now + ((i % 7) + 2) * 24 * 60 * 60 * 1000);
    return {
      status: "in_progress",
      create: { ...create, dueDate: dueDate.toISOString() },
    };
  }
  if (i < 12) {
    const dueDate = new Date(now + ((i % 5) + 3) * 24 * 60 * 60 * 1000);
    return {
      status: "open",
      create: { ...create, dueDate: dueDate.toISOString() },
    };
  }
  if (i < 16) {
    const dueDate = new Date(now + ((i % 4) + 5) * 24 * 60 * 60 * 1000);
    return {
      status: "waiting",
      create: { ...create, dueDate: dueDate.toISOString() },
    };
  }
  if (i < 20) {
    const dueDate = new Date(now - ((i % 4) + 1) * 24 * 60 * 60 * 1000);
    return {
      status: "in_progress",
      create: { ...create, dueDate: dueDate.toISOString() },
    };
  }
  const dueDate = new Date(now - 2 * 24 * 60 * 60 * 1000);
  return {
    status: "completed",
    create: { ...create, dueDate: dueDate.toISOString() },
  };
}

export function buildDemoCases(
  organizationId: string,
  customerIds: string[],
  templateIds: string[],
  currentUser?: DemoCaseAssignee,
): DemoCaseSeed[] {
  const now = Date.now();
  const userAssignedCount = currentUser
    ? Math.min(TRIAL_DEMO_COUNTS.userAssignedCases, TRIAL_DEMO_COUNTS.cases)
    : 0;

  return Array.from({ length: TRIAL_DEMO_COUNTS.cases }, (_, i) => {
    if (currentUser && i < userAssignedCount) {
      return buildUserAssignedCaseSeed(organizationId, i, customerIds, templateIds, currentUser);
    }
    const verb = pick(CASE_TITLE_VERBS, i);
    const object = pick(CASE_TITLE_OBJECTS, i + 2);
    const dueDate = new Date(now + ((i % 14) + 1) * 24 * 60 * 60 * 1000);
    const templateId = i % 4 === 0 && templateIds.length > 0 ? pick(templateIds, i / 4) : undefined;
    return {
      status: pick(CASE_STATUSES, i),
      create: {
        organizationId,
        title: `Démo — ${verb} ${object} #${i + 1}`,
        description: "Dossier généré pour la démonstration Syncora.",
        priority: pick(CASE_PRIORITIES, i),
        customerId: pick(customerIds, i),
        dueDate: dueDate.toISOString(),
        ...(templateId ? { templateId } : {}),
        isTestData: true,
      },
    };
  });
}

/** Répartit les interventions sans créneau (priorité aux dossiers de l’utilisateur). */
function buildUnscheduledInterventionIndices(
  total: number,
  userCaseCount: number,
  target: number,
): Set<number> {
  const indices = new Set<number>();
  for (let i = 1; i < userCaseCount && indices.size < target; i += 3) {
    indices.add(i);
  }
  for (let i = userCaseCount; i < total && indices.size < target; i++) {
    if ((i - userCaseCount) % 4 === 3) {
      indices.add(i);
    }
  }
  for (let i = 0; i < total && indices.size < target; i++) {
    if (!indices.has(i)) {
      indices.add(i);
    }
  }
  return indices;
}

export function buildDemoInterventions(
  organizationId: string,
  caseIds: string[],
  teamIds: string[],
  options?: { assigneeUserId?: string; userCaseCount?: number },
): CreateInterventionBody[] {
  const base = new Date();
  const userCaseCount = options?.userCaseCount ?? 0;
  const total = Math.min(TRIAL_DEMO_COUNTS.interventions, caseIds.length);
  const unscheduledIndices = buildUnscheduledInterventionIndices(
    total,
    userCaseCount,
    Math.min(TRIAL_DEMO_COUNTS.unscheduledInterventions, total),
  );
  return Array.from({ length: total }, (_, i) => {
    const onUserCase = i < userCaseCount;
    const unscheduled = unscheduledIndices.has(i);
    const start = new Date(base);
    start.setDate(start.getDate() + 1 + (i % 10));
    start.setHours(8 + (i % 6), 0, 0, 0);
    const end = new Date(start);
    end.setHours(start.getHours() + 2 + (i % 3));
    return {
      organizationId,
      caseId: caseIds[i]!,
      title: unscheduled
        ? `Intervention démo (à planifier) #${i + 1}`
        : `Intervention démo #${i + 1}`,
      assignedTeamId: pick(teamIds, i),
      ...(onUserCase && options?.assigneeUserId ? { assigneeId: options.assigneeUserId } : {}),
      ...(unscheduled
        ? {}
        : {
            scheduledStart: start.toISOString(),
            scheduledEnd: end.toISOString(),
          }),
      isTestData: true,
    };
  });
}

export async function runInBatches<T, R>(
  items: readonly T[],
  batchSize: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = [];
  for (let i = 0; i < items.length; i += batchSize) {
    const slice = items.slice(i, i + batchSize);
    const batch = await Promise.all(slice.map((item, j) => fn(item, i + j)));
    results.push(...batch);
  }
  return results;
}
