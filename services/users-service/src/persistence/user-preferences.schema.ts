import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";
import type { QuickActionId } from "@planwise/shared";
import { DEFAULT_QUICK_ACTION_IDS } from "@planwise/shared";

@Schema({ timestamps: true, _id: true, collection: "user_preferences" })
export class UserPreferencesDocument extends Document {
  @Prop({ required: true, unique: true })
  userId!: string;

  @Prop({ required: true, enum: ["light", "dark"], default: "light" })
  theme!: "light" | "dark";

  @Prop({ required: true, enum: ["expanded", "collapsed"], default: "expanded" })
  sidebarCollapsed!: "expanded" | "collapsed";

  @Prop({
    type: [String],
    default: () => [...DEFAULT_QUICK_ACTION_IDS],
  })
  quickActionIds!: QuickActionId[];

  /** Organisations pour lesquelles l’onboarding fondateur est terminé. */
  @Prop({ type: [String], default: [] })
  onboardingCompletedOrganizationIds!: string[];

  /** Organisations pour lesquelles le guide de démarrage in-app a été masqué. */
  @Prop({ type: [String], default: [] })
  setupGuideDismissedOrganizationIds!: string[];

  /**
   * @deprecated Legacy booléen global — migré vers onboardingCompletedOrganizationIds.
   * Conservé en lecture pour ne pas re-proposer l’onboarding sur l’org courante si déjà fait.
   */
  @Prop({ default: false })
  onboardingProfileCompleted?: boolean;
}

export const UserPreferencesSchema = SchemaFactory.createForClass(UserPreferencesDocument);
