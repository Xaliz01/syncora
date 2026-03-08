import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import type { VehicleDocument } from "../persistence/vehicle.schema";
import type { TechnicianDocument } from "../persistence/technician.schema";
import type {
  CreateVehicleBody,
  UpdateVehicleBody,
  VehicleResponse,
  CreateTechnicianBody,
  UpdateTechnicianBody,
  TechnicianResponse,
  VehicleStatus,
  VehicleType,
  TechnicianStatus
} from "@syncora/shared";

@Injectable()
export class FleetService {
  constructor(
    @InjectModel("Vehicle")
    private readonly vehicleModel: Model<VehicleDocument>,
    @InjectModel("Technician")
    private readonly technicianModel: Model<TechnicianDocument>
  ) {}

  // ─── Vehicles ───

  async createVehicle(body: CreateVehicleBody): Promise<VehicleResponse> {
    const existing = await this.vehicleModel
      .findOne({
        organizationId: body.organizationId,
        registrationNumber: body.registrationNumber
      })
      .exec();
    if (existing) {
      throw new ConflictException("Un véhicule avec cette immatriculation existe déjà");
    }
    const doc = await this.vehicleModel.create({
      organizationId: body.organizationId,
      type: body.type,
      registrationNumber: body.registrationNumber,
      brand: body.brand,
      vehicleModel: body.model,
      year: body.year,
      color: body.color,
      vin: body.vin,
      mileage: body.mileage ?? 0,
      status: body.status ?? "actif"
    });
    return this.toVehicleResponse(doc);
  }

  async updateVehicle(
    organizationId: string,
    vehicleId: string,
    body: UpdateVehicleBody
  ): Promise<VehicleResponse> {
    const doc = await this.vehicleModel.findById(vehicleId).exec();
    if (!doc || doc.organizationId !== organizationId) {
      throw new NotFoundException("Véhicule introuvable");
    }
    if (body.registrationNumber && body.registrationNumber !== doc.registrationNumber) {
      const dup = await this.vehicleModel
        .findOne({
          organizationId,
          registrationNumber: body.registrationNumber,
          _id: { $ne: vehicleId }
        })
        .exec();
      if (dup) {
        throw new ConflictException("Un véhicule avec cette immatriculation existe déjà");
      }
    }
    if (body.type !== undefined) doc.type = body.type;
    if (body.registrationNumber !== undefined) doc.registrationNumber = body.registrationNumber;
    if (body.brand !== undefined) doc.brand = body.brand;
    if (body.model !== undefined) doc.vehicleModel = body.model;
    if (body.year !== undefined) doc.year = body.year;
    if (body.color !== undefined) doc.color = body.color;
    if (body.vin !== undefined) doc.vin = body.vin;
    if (body.mileage !== undefined) doc.mileage = body.mileage;
    if (body.status !== undefined) doc.status = body.status;
    await doc.save();
    return this.toVehicleResponse(doc);
  }

  async getVehicle(organizationId: string, vehicleId: string): Promise<VehicleResponse> {
    const doc = await this.vehicleModel.findById(vehicleId).exec();
    if (!doc || doc.organizationId !== organizationId) {
      throw new NotFoundException("Véhicule introuvable");
    }
    return this.toVehicleResponse(doc);
  }

  async listVehicles(organizationId: string): Promise<VehicleResponse[]> {
    const docs = await this.vehicleModel
      .find({ organizationId })
      .sort({ createdAt: -1 })
      .exec();
    return docs.map((doc) => this.toVehicleResponse(doc));
  }

  async deleteVehicle(organizationId: string, vehicleId: string): Promise<{ deleted: true }> {
    const doc = await this.vehicleModel.findById(vehicleId).exec();
    if (!doc || doc.organizationId !== organizationId) {
      throw new NotFoundException("Véhicule introuvable");
    }
    if (doc.assignedTechnicianId) {
      await this.technicianModel.updateOne(
        { _id: doc.assignedTechnicianId },
        { $pull: { assignedVehicleIds: vehicleId } }
      );
    }
    await doc.deleteOne();
    return { deleted: true };
  }

  async assignTechnicianToVehicle(
    organizationId: string,
    vehicleId: string,
    technicianId: string
  ): Promise<VehicleResponse> {
    const vehicle = await this.vehicleModel.findById(vehicleId).exec();
    if (!vehicle || vehicle.organizationId !== organizationId) {
      throw new NotFoundException("Véhicule introuvable");
    }
    const technician = await this.technicianModel.findById(technicianId).exec();
    if (!technician || technician.organizationId !== organizationId) {
      throw new NotFoundException("Technicien introuvable");
    }

    if (vehicle.assignedTechnicianId && vehicle.assignedTechnicianId !== technicianId) {
      await this.technicianModel.updateOne(
        { _id: vehicle.assignedTechnicianId },
        { $pull: { assignedVehicleIds: vehicleId } }
      );
    }

    vehicle.assignedTechnicianId = technicianId;
    await vehicle.save();

    if (!technician.assignedVehicleIds.includes(vehicleId)) {
      technician.assignedVehicleIds.push(vehicleId);
      await technician.save();
    }

    return this.toVehicleResponse(vehicle);
  }

  async unassignTechnicianFromVehicle(
    organizationId: string,
    vehicleId: string
  ): Promise<VehicleResponse> {
    const vehicle = await this.vehicleModel.findById(vehicleId).exec();
    if (!vehicle || vehicle.organizationId !== organizationId) {
      throw new NotFoundException("Véhicule introuvable");
    }
    if (vehicle.assignedTechnicianId) {
      await this.technicianModel.updateOne(
        { _id: vehicle.assignedTechnicianId },
        { $pull: { assignedVehicleIds: vehicleId } }
      );
      vehicle.assignedTechnicianId = undefined;
      await vehicle.save();
    }
    return this.toVehicleResponse(vehicle);
  }

  // ─── Technicians ───

  async createTechnician(body: CreateTechnicianBody): Promise<TechnicianResponse> {
    const doc = await this.technicianModel.create({
      organizationId: body.organizationId,
      firstName: body.firstName,
      lastName: body.lastName,
      email: body.email,
      phone: body.phone,
      speciality: body.speciality,
      status: body.status ?? "actif"
    });
    return this.toTechnicianResponse(doc);
  }

  async updateTechnician(
    organizationId: string,
    technicianId: string,
    body: UpdateTechnicianBody
  ): Promise<TechnicianResponse> {
    const doc = await this.technicianModel.findById(technicianId).exec();
    if (!doc || doc.organizationId !== organizationId) {
      throw new NotFoundException("Technicien introuvable");
    }
    if (body.firstName !== undefined) doc.firstName = body.firstName;
    if (body.lastName !== undefined) doc.lastName = body.lastName;
    if (body.email !== undefined) doc.email = body.email;
    if (body.phone !== undefined) doc.phone = body.phone;
    if (body.speciality !== undefined) doc.speciality = body.speciality;
    if (body.status !== undefined) doc.status = body.status;
    await doc.save();
    return this.toTechnicianResponse(doc);
  }

  async getTechnician(organizationId: string, technicianId: string): Promise<TechnicianResponse> {
    const doc = await this.technicianModel.findById(technicianId).exec();
    if (!doc || doc.organizationId !== organizationId) {
      throw new NotFoundException("Technicien introuvable");
    }
    return this.toTechnicianResponse(doc);
  }

  async listTechnicians(organizationId: string): Promise<TechnicianResponse[]> {
    const docs = await this.technicianModel
      .find({ organizationId })
      .sort({ createdAt: -1 })
      .exec();
    return docs.map((doc) => this.toTechnicianResponse(doc));
  }

  async deleteTechnician(
    organizationId: string,
    technicianId: string
  ): Promise<{ deleted: true }> {
    const doc = await this.technicianModel.findById(technicianId).exec();
    if (!doc || doc.organizationId !== organizationId) {
      throw new NotFoundException("Technicien introuvable");
    }
    await this.vehicleModel.updateMany(
      { assignedTechnicianId: technicianId },
      { $unset: { assignedTechnicianId: "" } }
    );
    await doc.deleteOne();
    return { deleted: true };
  }

  async linkUserToTechnician(
    organizationId: string,
    technicianId: string,
    userId: string
  ): Promise<TechnicianResponse> {
    const doc = await this.technicianModel.findById(technicianId).exec();
    if (!doc || doc.organizationId !== organizationId) {
      throw new NotFoundException("Technicien introuvable");
    }
    if (doc.userId) {
      throw new BadRequestException("Ce technicien a déjà un compte utilisateur associé");
    }
    doc.userId = userId;
    await doc.save();
    return this.toTechnicianResponse(doc);
  }

  // ─── Mappers ───

  private toVehicleResponse(doc: VehicleDocument): VehicleResponse {
    return {
      id: doc._id.toString(),
      organizationId: doc.organizationId,
      type: doc.type as VehicleType,
      registrationNumber: doc.registrationNumber,
      brand: doc.brand,
      model: doc.vehicleModel,
      year: doc.year,
      color: doc.color,
      vin: doc.vin,
      mileage: doc.mileage,
      status: doc.status as VehicleStatus,
      assignedTechnicianId: doc.assignedTechnicianId,
      createdAt: doc.get("createdAt")?.toISOString(),
      updatedAt: doc.get("updatedAt")?.toISOString()
    };
  }

  private toTechnicianResponse(doc: TechnicianDocument): TechnicianResponse {
    return {
      id: doc._id.toString(),
      organizationId: doc.organizationId,
      firstName: doc.firstName,
      lastName: doc.lastName,
      email: doc.email,
      phone: doc.phone,
      speciality: doc.speciality,
      status: doc.status as TechnicianStatus,
      userId: doc.userId,
      assignedVehicleIds: doc.assignedVehicleIds,
      createdAt: doc.get("createdAt")?.toISOString(),
      updatedAt: doc.get("updatedAt")?.toISOString()
    };
  }
}
