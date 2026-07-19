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
}

export const UserPreferencesSchema = SchemaFactory.createForClass(UserPreferencesDocument);
