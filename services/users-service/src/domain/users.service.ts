import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import * as bcrypt from "bcrypt";
import type { UserDocument } from "../persistence/user.schema";
import type {
  ActivateInvitedUserBody,
  CreateInvitedUserBody,
  CreateUserBody,
  UserResponse,
  ValidateCredentialsResponse
} from "@syncora/shared";
import { AbstractUsersService } from "./ports/users.service.port";

const SALT_ROUNDS = 10;

@Injectable()
export class UsersService extends AbstractUsersService {
  constructor(
    @InjectModel("User")
    private readonly userModel: Model<UserDocument>
  ) {
    super();
  }

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
      role: body.role,
      status: "active"
    });
    return this.toResponse(doc);
  }

  async invite(body: CreateInvitedUserBody): Promise<UserResponse> {
    const existing = await this.userModel.findOne({ email: body.email }).exec();
    if (existing) {
      throw new ConflictException("User with this email already exists");
    }
    const doc = await this.userModel.create({
      organizationId: body.organizationId,
      email: body.email,
      name: body.name,
      role: body.role ?? "member",
      status: "invited",
      invitedByUserId: body.invitedByUserId
    });
    return this.toResponse(doc);
  }

  async activateInvitedUser(id: string, body: ActivateInvitedUserBody): Promise<UserResponse> {
    const doc = await this.userModel.findById(id).exec();
    if (!doc) throw new NotFoundException("User not found");
    if (doc.status !== "invited") {
      throw new BadRequestException("User is not in invited status");
    }
    doc.passwordHash = await bcrypt.hash(body.password, SALT_ROUNDS);
    doc.status = "active";
    if (body.name) doc.name = body.name;
    await doc.save();
    return this.toResponse(doc);
  }

  async findById(id: string): Promise<UserResponse | null> {
    const doc = await this.userModel.findById(id).exec();
    if (!doc) return null;
    return this.toResponse(doc);
  }

  async listByOrganization(organizationId: string): Promise<UserResponse[]> {
    const docs = await this.userModel.find({ organizationId }).sort({ createdAt: 1 }).exec();
    return docs.map((doc) => this.toResponse(doc));
  }

  async validateCredentials(
    email: string,
    password: string
  ): Promise<ValidateCredentialsResponse | null> {
    const doc = await this.userModel.findOne({ email }).exec();
    if (!doc) return null;
    if (doc.status !== "active") return null;
    if (!doc.passwordHash) return null;
    const ok = await bcrypt.compare(password, doc.passwordHash);
    if (!ok) return null;
    return {
      id: doc._id.toString(),
      organizationId: doc.organizationId,
      email: doc.email,
      name: doc.name,
      role: doc.role as ValidateCredentialsResponse["role"],
      status: doc.status
    };
  }

  private toResponse(doc: UserDocument): UserResponse {
    return {
      id: doc._id.toString(),
      organizationId: doc.organizationId,
      email: doc.email,
      name: doc.name,
      role: doc.role as UserResponse["role"],
      status: doc.status,
      createdAt: doc.get("createdAt")?.toISOString()
    };
  }
}
