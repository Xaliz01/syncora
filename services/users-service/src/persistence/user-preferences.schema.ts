import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";
import type { QuickActionBookmark, QuickActionId } from "@planwise/shared";
import { DEFAULT_QUICK_ACTIONS } from "@planwise/shared";

@Schema({ timestamps: true, _id: true, collection: "user_preferences" })
export class UserPreferencesDocument extends Document {
  @Prop({ required: true, unique: true })
  userId!: string;

  @Prop({ required: true, enum: ["light", "dark"], default: "light" })
  theme!: "light" | "dark";

  @Prop({ required: true, enum: ["expanded", "collapsed"], default: "expanded" })
  sidebarCollapsed!: "expanded" | "collapsed";

  /** Commandes vocales terrain (Ma journée). */
  @Prop({ type: Boolean, default: false })
  voiceFieldEnabled!: boolean;

  /** Favoris URL (modèle actuel). */
  @Prop({
    type: [
      {
        id: { type: String, required: true },
        href: { type: String, required: true },
        label: { type: String, required: true },
        _id: false,
      },
    ],
    default: () => DEFAULT_QUICK_ACTIONS.map((b) => ({ ...b })),
  })
  quickActions?: QuickActionBookmark[];

  /**
   * Favoris par organisation (source de vérité multi-tenant).
   * Clé = organizationId ; valeur = liste de bookmarks.
   */
  @Prop({ type: Object, default: {} })
  quickActionsByOrganizationId?: Record<string, QuickActionBookmark[]>;

  /**
   * @deprecated Anciens IDs catalogue — lus pour migration si quickActions absent.
   */
  @Prop({ type: [String] })
  quickActionIds?: QuickActionId[];

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
