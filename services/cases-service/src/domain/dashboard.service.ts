import { Inject, Injectable, forwardRef } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import {
  activeDocumentFilter,
  MAX_PAGE_LIMIT,
  type CaseDashboardResponse,
  type DashboardStatFilter,
  type DashboardTodoCaseItem,
  type DashboardTodoItem,
} from "@planwise/shared";
import type { CaseDocument } from "../persistence/case.schema";
import type { InterventionDocument } from "../persistence/intervention.schema";
import type { CaseTemplateDocument } from "../persistence/case-template.schema";
import { AbstractDashboardService } from "./ports/dashboard.service.port";
import { toCaseSummary, toDashboardCaseListItem } from "./mappers/case.mapper";
import { toInterventionResponse } from "./mappers/intervention.mapper";
import { MaintenanceContractsService } from "./maintenance-contracts.service";

@Injectable()
export class DashboardService extends AbstractDashboardService {
  constructor(
    @InjectModel("Case")
    private readonly caseModel: Model<CaseDocument>,
    @InjectModel("Intervention")
    private readonly interventionModel: Model<InterventionDocument>,
    @InjectModel("CaseTemplate")
    private readonly templateModel: Model<CaseTemplateDocument>,
    @Inject(forwardRef(() => MaintenanceContractsService))
    private readonly maintenanceContractsService: MaintenanceContractsService,
  ) {
    super();
  }

  async getDashboardTodoCases(
    organizationId: string,
    userId: string,
    userProfileId: string | undefined,
    templateId: string,
    todoLabel: string,
  ): Promise<DashboardTodoCaseItem[]> {
    const template = await this.templateModel
      .findOne({ _id: templateId, organizationId, ...activeDocumentFilter })
      .exec();
    if (!template) return [];

    let found = false;
    for (const step of template.steps) {
      for (const todo of step.todos) {
        if (todo.label === todoLabel && todo.dashboardRule?.showOnDashboard) {
          if (this.isTodoVisibleToUser(todo.dashboardRule, userId, userProfileId)) {
            found = true;
          }
        }
      }
    }
    if (!found) return [];

    const cases = await this.caseModel
      .find({
        organizationId,
        templateId,
        ...activeDocumentFilter,
        status: { $nin: ["completed", "cancelled"] },
        "steps.todos": {
          $elemMatch: { label: todoLabel, status: "pending" },
        },
      })
      .sort({ createdAt: 1 })
      .exec();

    return cases.map((c) => toDashboardCaseListItem(c));
  }

  async getDashboardStatCases(
    organizationId: string,
    userId: string,
    _userProfileId: string | undefined,
    filter: DashboardStatFilter,
  ): Promise<DashboardTodoCaseItem[]> {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay() + 1);
    startOfWeek.setHours(0, 0, 0, 0);

    const assignedBase = {
      organizationId,
      ...activeDocumentFilter,
      $or: [{ assignees: { $elemMatch: { userId } } }, { assigneeId: userId }],
    };

    let query: Record<string, unknown>;
    let sort: Record<string, 1 | -1> = { priority: -1, dueDate: 1 };

    switch (filter) {
      case "assigned":
        query = { ...assignedBase, status: { $nin: ["completed", "cancelled"] } };
        break;
      case "in_progress":
        query = { ...assignedBase, status: "in_progress" };
        break;
      case "completed_week":
        query = {
          ...assignedBase,
          status: "completed",
          updatedAt: { $gte: startOfWeek },
        };
        sort = { updatedAt: -1 };
        break;
      case "overdue":
        query = {
          ...assignedBase,
          status: { $nin: ["completed", "cancelled"] },
          dueDate: { $lt: now },
        };
        break;
      case "to_invoice":
        query = {
          organizationId,
          ...activeDocumentFilter,
          billingStatus: "to_invoice",
        };
        sort = { updatedAt: -1 };
        break;
      default:
        return [];
    }

    const cases = await this.caseModel.find(query).sort(sort).limit(MAX_PAGE_LIMIT).exec();
    return cases.map((c) => toDashboardCaseListItem(c));
  }

  async getDashboard(
    organizationId: string,
    userId: string,
    userProfileId?: string,
  ): Promise<CaseDashboardResponse> {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay() + 1);
    startOfWeek.setHours(0, 0, 0, 0);

    const assignedToUser = {
      organizationId,
      ...activeDocumentFilter,
      status: { $nin: ["completed", "cancelled"] },
      $or: [{ assignees: { $elemMatch: { userId } } }, { assigneeId: userId }],
    };

    const [assignedCases, upcomingInterventions, completedThisWeek] = await Promise.all([
      this.caseModel.find(assignedToUser).sort({ priority: -1, dueDate: 1 }).exec(),
      this.interventionModel
        .find({
          organizationId,
          ...activeDocumentFilter,
          $or: [{ assigneeId: userId }, { assigneeId: { $exists: false } }],
          scheduledStart: { $gte: now },
          status: { $ne: "cancelled" },
        })
        .sort({ scheduledStart: 1 })
        .limit(20)
        .exec(),
      this.caseModel.countDocuments({
        organizationId,
        ...activeDocumentFilter,
        status: "completed",
        updatedAt: { $gte: startOfWeek },
        $or: [{ assignees: { $elemMatch: { userId } } }, { assigneeId: userId }],
      }),
    ]);

    const overdueCases = assignedCases.filter(
      (c) => c.dueDate && c.dueDate < now && c.status !== "completed" && c.status !== "cancelled",
    );

    const caseIds = [...new Set(upcomingInterventions.map((i) => i.caseId))];
    const cases = await this.caseModel
      .find({ _id: { $in: caseIds }, ...activeDocumentFilter })
      .select("_id title")
      .exec();
    const caseMap = new Map(cases.map((c) => [c._id.toString(), c.title]));

    const todoWidgets = await this.computeTodoWidgets(organizationId, userId, userProfileId);

    let pendingMaintenanceVisits: CaseDashboardResponse["pendingMaintenanceVisits"] = [];
    try {
      pendingMaintenanceVisits =
        await this.maintenanceContractsService.listVisitsToSchedule(organizationId);
    } catch {
      pendingMaintenanceVisits = [];
    }

    return {
      assignedCases: assignedCases.map((c) => toCaseSummary(c)),
      upcomingInterventions: upcomingInterventions.map((i) =>
        toInterventionResponse(i, caseMap.get(i.caseId)),
      ),
      overdueCases: overdueCases.map((c) => toCaseSummary(c)),
      todoWidgets,
      pendingMaintenanceVisits,
      stats: {
        totalAssigned: assignedCases.length,
        inProgress: assignedCases.filter((c) => c.status === "in_progress").length,
        completedThisWeek,
        overdue: overdueCases.length,
      },
    };
  }

  private isTodoVisibleToUser(
    rule: {
      showOnDashboard: boolean;
      visibility?: string;
      profileIds?: string[];
      userIds?: string[];
    },
    userId: string,
    userProfileId?: string,
  ): boolean {
    if (!rule.showOnDashboard) return false;

    switch (rule.visibility) {
      case "all":
        return true;
      case "by_profile":
        return !!(userProfileId && rule.profileIds?.includes(userProfileId));
      case "by_user":
        return !!(rule.userIds && rule.userIds.includes(userId));
      default:
        return true;
    }
  }

  private async computeTodoWidgets(
    organizationId: string,
    userId: string,
    userProfileId?: string,
  ): Promise<DashboardTodoItem[]> {
    const templates = await this.templateModel
      .find({ organizationId, ...activeDocumentFilter })
      .exec();

    const todoConfigs: {
      templateId: string;
      templateName: string;
      stepName: string;
      todoLabel: string;
    }[] = [];

    for (const template of templates) {
      for (const step of template.steps) {
        for (const todo of step.todos) {
          if (
            todo.dashboardRule?.showOnDashboard &&
            this.isTodoVisibleToUser(todo.dashboardRule, userId, userProfileId)
          ) {
            todoConfigs.push({
              templateId: template._id.toString(),
              templateName: template.name,
              stepName: step.name,
              todoLabel: todo.label,
            });
          }
        }
      }
    }

    if (todoConfigs.length === 0) return [];

    const templateIds = [...new Set(todoConfigs.map((c) => c.templateId))];
    const activeCases = await this.caseModel
      .find({
        organizationId,
        templateId: { $in: templateIds },
        ...activeDocumentFilter,
        status: { $nin: ["completed", "cancelled"] },
      })
      .exec();

    const results: DashboardTodoItem[] = [];
    for (const config of todoConfigs) {
      const matching = activeCases.filter(
        (c) =>
          c.templateId === config.templateId &&
          c.steps.some((s) =>
            s.todos.some((t) => t.label === config.todoLabel && t.status === "pending"),
          ),
      );
      if (matching.length > 0) {
        results.push({
          todoLabel: config.todoLabel,
          stepName: config.stepName,
          templateId: config.templateId,
          templateName: config.templateName,
          count: matching.length,
        });
      }
    }

    return results;
  }
}
