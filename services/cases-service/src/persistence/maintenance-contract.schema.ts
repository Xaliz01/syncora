import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";
import type {
  MaintenanceContractStatus,
  MaintenanceRemindBeforeDays,
  MaintenanceSchedulingMode,
} from "@planwise/shared";

@Schema({ timestamps: true, collection: "maintenance_contracts" })
export class MaintenanceContractDocument extends Document {
  @Prop({ required: true, index: true })
  organizationId!: string;

  @Prop({ required: true, index: true })
  customerId!: string;

  @Prop()
  siteId?: string;

  @Prop()
  templateId?: string;

  @Prop({ required: true })
  title!: string;

  @Prop()
  description?: string;

  @Prop({
    required: true,
    enum: ["draft", "active", "suspended", "ended"],
    default: "draft",
    index: true,
  })
  status!: MaintenanceContractStatus;

  @Prop({ required: true })
  startDate!: string;

  @Prop()
  endDate?: string;

  @Prop({ required: true, min: 1 })
  recurrenceMonths!: number;

  @Prop({ required: true, index: true })
  nextDueDate!: string;

  @Prop({
    enum: ["schedule_with_client", "auto_plan"],
    default: "schedule_with_client",
  })
  schedulingMode?: MaintenanceSchedulingMode;

  @Prop({ enum: [7, 14, 30], default: 14 })
  remindBeforeDays?: MaintenanceRemindBeforeDays;

  @Prop({ default: false, index: true })
  schedulingPending?: boolean;

  @Prop()
  reminderSentForDueDate?: string;

  @Prop()
  defaultAssigneeId?: string;

  @Prop()
  defaultTeamId?: string;

  @Prop()
  lastGeneratedAt?: string;

  @Prop()
  lastGeneratedCaseId?: string;

  @Prop()
  lastGeneratedInterventionId?: string;

  @Prop({
    type: [
      {
        caseId: { type: String, required: true },
        interventionId: { type: String, required: true },
        dueDate: { type: String, required: true },
        generatedAt: { type: String, required: true },
      },
    ],
    default: [],
  })
  visitHistory!: Array<{
    caseId: string;
    interventionId: string;
    dueDate: string;
    generatedAt: string;
  }>;

  @Prop()
  notes?: string;

  createdAt!: Date;
  updatedAt!: Date;
}

export const MaintenanceContractSchema = SchemaFactory.createForClass(MaintenanceContractDocument);
MaintenanceContractSchema.index({ organizationId: 1, status: 1, nextDueDate: 1 });
MaintenanceContractSchema.index({ organizationId: 1, customerId: 1 });
MaintenanceContractSchema.index({ status: 1, schedulingPending: 1, nextDueDate: 1 });
