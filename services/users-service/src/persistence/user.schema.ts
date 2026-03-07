import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

@Schema({ timestamps: true, _id: true })
export class UserDocument extends Document {
  @Prop({ required: true })
  organizationId!: string;

  @Prop({ required: true, unique: true })
  email!: string;

  @Prop({ required: true })
  passwordHash!: string;

  @Prop()
  name?: string;

  @Prop({ required: true, default: "member" })
  role!: string;
}

export const UserSchema = SchemaFactory.createForClass(UserDocument);
