import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

@Schema({ timestamps: true, _id: true, collection: "user_preferences" })
export class UserPreferencesDocument extends Document {
  @Prop({ required: true, unique: true })
  userId!: string;

  @Prop({ required: true, enum: ["light", "dark"], default: "light" })
  theme!: "light" | "dark";

  @Prop({ required: true, enum: ["expanded", "collapsed"], default: "expanded" })
  sidebarCollapsed!: "expanded" | "collapsed";
}

export const UserPreferencesSchema = SchemaFactory.createForClass(UserPreferencesDocument);
