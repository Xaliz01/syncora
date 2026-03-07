import { Injectable, ConflictException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import * as bcrypt from "bcrypt";
import type { UserDocument } from "../persistence/user.schema";
import type {
  CreateUserBody,
  UserResponse,
  ValidateCredentialsResponse
} from "@syncora/shared";

const SALT_ROUNDS = 10;

@Injectable()
export class UsersService {
  constructor(
    @InjectModel("User")
    private readonly userModel: Model<UserDocument>
  ) {}

  async create(body: CreateUserBody): Promise<UserResponse> {
    const existing = await this.userModel.findOne({ email: body.email }).exec();
    if (existing) {
      throw new ConflictException("User with this email already exists");
    }
    const passwordHash = await bcrypt.hash(body.password, SALT_ROUNDS);
    const doc = await this.userModel.create({
      organizationId: body.organizationId,
      email: body.email,
      passwordHash,
      name: body.name,
      role: body.role
    });
    return this.toResponse(doc);
  }

  async validateCredentials(
    email: string,
    password: string
  ): Promise<ValidateCredentialsResponse | null> {
    const doc = await this.userModel.findOne({ email }).exec();
    if (!doc) return null;
    const ok = await bcrypt.compare(password, doc.passwordHash);
    if (!ok) return null;
    return {
      id: doc._id.toString(),
      organizationId: doc.organizationId,
      email: doc.email,
      name: doc.name,
      role: doc.role as ValidateCredentialsResponse["role"]
    };
  }

  private toResponse(doc: UserDocument): UserResponse {
    return {
      id: doc._id.toString(),
      organizationId: doc.organizationId,
      email: doc.email,
      name: doc.name,
      role: doc.role as UserResponse["role"],
      createdAt: doc.get("createdAt")?.toISOString()
    };
  }
}
