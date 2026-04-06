import {
  Injectable,
  ConflictException,
  NotFoundException
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import type { VehicleDocument } from "../persistence/vehicle.schema";
import {
  activeDocumentFilter,
  type CreateVehicleBody,
  type UpdateVehicleBody,
  type VehicleResponse,
  type VehicleStatus,
  type VehicleType
} from "@syncora/shared";
import { AbstractFleetService } from "./ports/fleet.service.port";

@Injectable()
export class FleetService extends AbstractFleetService {
  constructor(
    @InjectModel("Vehicle")
    private readonly vehicleModel: Model<VehicleDocument>
  ) {
    super();
  }

  async createVehicle(body: CreateVehicleBody): Promise<VehicleResponse> {
    const existing = await this.vehicleModel
      .findOne({
        organizationId: body.organizationId,
        registrationNumber: body.registrationNumber,
        ...activeDocumentFilter
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
    const doc = await this.vehicleModel
      .findOne({ _id: vehicleId, organizationId, ...activeDocumentFilter })
      .exec();
    if (!doc) {
      throw new NotFoundException("Véhicule introuvable");
    }
    if (body.registrationNumber && body.registrationNumber !== doc.registrationNumber) {
      const dup = await this.vehicleModel
        .findOne({
          organizationId,
          registrationNumber: body.registrationNumber,
          _id: { $ne: vehicleId },
          ...activeDocumentFilter
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
    const doc = await this.vehicleModel
      .findOne({ _id: vehicleId, organizationId, ...activeDocumentFilter })
      .exec();
    if (!doc) {
      throw new NotFoundException("Véhicule introuvable");
    }
    return this.toVehicleResponse(doc);
  }

  async listVehicles(organizationId: string): Promise<VehicleResponse[]> {
    const docs = await this.vehicleModel
      .find({ organizationId, ...activeDocumentFilter })
      .sort({ createdAt: -1 })
      .exec();
    return docs.map((doc) => this.toVehicleResponse(doc));
  }

  async deleteVehicle(organizationId: string, vehicleId: string): Promise<{ deleted: true }> {
    const result = await this.vehicleModel
      .updateOne(
        { _id: vehicleId, organizationId, ...activeDocumentFilter },
        { $set: { deletedAt: new Date() } }
      )
      .exec();
    if (!result.matchedCount) {
      throw new NotFoundException("Véhicule introuvable");
    }
    return { deleted: true };
  }

  async assignTeam(
    organizationId: string,
    vehicleId: string,
    teamId: string
  ): Promise<VehicleResponse> {
    const vehicle = await this.vehicleModel
      .findOne({ _id: vehicleId, organizationId, ...activeDocumentFilter })
      .exec();
    if (!vehicle) {
      throw new NotFoundException("Véhicule introuvable");
    }
    vehicle.assignedTeamId = teamId;
    await vehicle.save();
    return this.toVehicleResponse(vehicle);
  }

  async unassignTeam(
    organizationId: string,
    vehicleId: string
  ): Promise<VehicleResponse> {
    const vehicle = await this.vehicleModel
      .findOne({ _id: vehicleId, organizationId, ...activeDocumentFilter })
      .exec();
    if (!vehicle) {
      throw new NotFoundException("Véhicule introuvable");
    }
    vehicle.assignedTeamId = undefined;
    await vehicle.save();
    return this.toVehicleResponse(vehicle);
  }

  async unassignTeamFromAllVehicles(
    organizationId: string,
    teamId: string
  ): Promise<void> {
    await this.vehicleModel.updateMany(
      { organizationId, assignedTeamId: teamId },
      { $unset: { assignedTeamId: "" } }
    );
  }

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
      assignedTeamId: doc.assignedTeamId,
      createdAt: doc.get("createdAt")?.toISOString(),
      updatedAt: doc.get("updatedAt")?.toISOString()
    };
  }
}
