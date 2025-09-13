import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { SQLAssistant } from "../SQLAssistant";

// Mock des dépendances
jest.mock("@google/generative-ai", () => ({
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: jest.fn().mockReturnValue({
      generateContent: (jest.fn() as any).mockResolvedValue({
        response: {
          text: jest.fn().mockReturnValue("SELECT * FROM users LIMIT 100"),
        },
      }),
    }),
  })),
}));

jest.mock("knex", () => {
  const mockDestroy = (jest.fn() as any).mockResolvedValue(void 0);
  return jest.fn().mockImplementation(() => ({
    raw: jest.fn().mockImplementation((...args: any[]) => {
      const query = args[0] as string;
      if (query.includes("information_schema")) {
        return Promise.resolve([
          {
            table_name: "users",
            column_name: "id",
            data_type: "integer",
            is_nullable: "NO",
          },
          {
            table_name: "users",
            column_name: "name",
            data_type: "varchar",
            is_nullable: "YES",
          },
        ]);
      }
      return Promise.resolve([{ id: 1, name: "Test User" }]);
    }),
    destroy: mockDestroy,
  }));
});

describe("SQLAssistant", () => {
  const mockOptions = {
    googleApiKey: "test-api-key",
    databaseUrl: "sqlite://test.db",
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should create an instance with database URL", () => {
    const assistant = new SQLAssistant(mockOptions);
    expect(assistant).toBeInstanceOf(SQLAssistant);
  });

  it("should throw error without Google API key", () => {
    expect(() => {
      new SQLAssistant({
        databaseUrl: "sqlite://test.db",
      });
    }).toThrow("Google API key is required");
  });

  it("should throw error without database configuration", async () => {
    const assistant = new SQLAssistant({
      googleApiKey: "test-api-key",
    });
    await expect(assistant.initialize()).rejects.toThrow(
      "Either databaseUrl or dbConfig is required"
    );
  });

  it("should execute a query successfully", async () => {
    const assistant = new SQLAssistant(mockOptions);
    const result = await assistant.query("List all users");

    expect(result).toEqual({
      success: true,
      data: [{ id: 1, name: "Test User" }],
      query: "SELECT * FROM users LIMIT 100",
    });
  });

  it("should handle query errors gracefully", async () => {
    const assistant = new SQLAssistant(mockOptions);

    // Mock une erreur dans la requête
    jest
      .spyOn(
        assistant as unknown as { generateSQLQuery: jest.MockedFunction<any> },
        "generateSQLQuery"
      )
      .mockRejectedValueOnce(new Error("Query generation failed"));

    const result = await assistant.query("Invalid query");

    expect(result).toEqual({
      success: false,
      error: "Query generation failed",
      query: undefined,
    });
  });

  it("should disconnect from database", async () => {
    const assistant = new SQLAssistant(mockOptions);
    await assistant.initialize(); // Initialize to set up the db
    await assistant.disconnect();

    // Vérifie que la méthode destroy a été appelée
    const knexInstance = (
      jest.requireMock("knex") as jest.MockedFunction<any>
    )();
    expect(knexInstance.destroy).toHaveBeenCalled();
  });
});
