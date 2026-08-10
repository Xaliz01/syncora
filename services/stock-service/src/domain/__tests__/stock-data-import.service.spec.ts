import { StockDataImportService } from "../stock-data-import.service";

describe("StockDataImportService deleteCreated", () => {
  it("deletes articles and related stock movements", async () => {
    const articleId = "507f1f77bcf86cd799439031";
    const stockMovementModel = {
      deleteMany: jest.fn().mockReturnValue({ exec: async () => ({ deletedCount: 3 }) }),
    };
    const articleModel = {
      deleteMany: jest.fn().mockReturnValue({ exec: async () => ({ deletedCount: 1 }) }),
    };
    const svc = new StockDataImportService(
      articleModel as never,
      { deleteMany: jest.fn() } as never,
      stockMovementModel as never,
      {} as never,
    );

    const result = await svc.deleteCreated({
      organizationId: "org-1",
      entity: "articles",
      ids: [articleId],
    });

    expect(result.deleted).toBe(1);
    expect(stockMovementModel.deleteMany).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: "org-1",
        articleId: { $in: [articleId] },
      }),
    );
    expect(articleModel.deleteMany).toHaveBeenCalled();
  });

  it("deletes prestations", async () => {
    const id = "507f1f77bcf86cd799439032";
    const prestationModel = {
      deleteMany: jest.fn().mockReturnValue({ exec: async () => ({ deletedCount: 1 }) }),
    };
    const svc = new StockDataImportService(
      { deleteMany: jest.fn() } as never,
      prestationModel as never,
      { deleteMany: jest.fn() } as never,
      {} as never,
    );

    const result = await svc.deleteCreated({
      organizationId: "org-1",
      entity: "prestations",
      ids: [id],
    });

    expect(result.deleted).toBe(1);
    expect(prestationModel.deleteMany).toHaveBeenCalled();
  });
});
