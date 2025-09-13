import { GenerativeModel, GoogleGenerativeAI } from "@google/generative-ai";
import { config } from "dotenv";
import { Knex } from "knex";
import { buildConnectionString, validateDatabaseConfig } from "./config";
import { ConnectionManager, ConnectionResult } from "./ConnectionManager";
import {
  DatabaseTypeDetection,
  DatabaseTypeDetector,
} from "./DatabaseTypeDetector";
import { PromptManager } from "./PromptManager";
import { ChainResult, QueryChain, QueryInput } from "./QueryChain";
import {
  DatabaseType,
  QueryResult,
  SchemaInfo,
  SQLAssistantOptions,
} from "./types";

config();

export class SQLAssistant {
  private db: Knex | null = null;
  private genAI: GoogleGenerativeAI;
  private model: GenerativeModel;
  private dbType: DatabaseType;
  private maxResults: number;
  private promptManager: PromptManager;
  private queryChain: QueryChain | null = null;

  constructor(options: SQLAssistantOptions) {
    const {
      googleApiKey = process.env.GOOGLE_API_KEY,
      databaseUrl = process.env.DATABASE_URL,
      dbType,
      dbConfig,
      temperature = 0.1,
      maxResults = 100,
    } = options;

    if (!googleApiKey) {
      throw new Error("Google API key is required");
    }

    // Détection automatique du type de base de données
    this.dbType = this.detectDatabaseType(dbType, databaseUrl);
    this.maxResults = maxResults;

    this.genAI = new GoogleGenerativeAI(googleApiKey);
    this.model = this.genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      generationConfig: {
        temperature,
      },
    });

    // Initialize prompt manager for database-specific prompts
    this.promptManager = new PromptManager(this.dbType);

    // Store initialization parameters for later async initialization
    this.initParams = { databaseUrl, dbConfig };
  }

  /**
   * Détecte automatiquement le type de base de données
   */
  private detectDatabaseType(
    explicitType: DatabaseType | undefined,
    databaseUrl: string | undefined
  ): DatabaseType {
    // Si le type est explicitement spécifié, l'utiliser
    if (explicitType) {
      if (!DatabaseTypeDetector.isSupportedType(explicitType)) {
        throw new Error(
          `Type de base de données non supporté: ${explicitType}`
        );
      }
      return explicitType;
    }

    // Détection automatique depuis l'URI
    if (databaseUrl) {
      const detection: DatabaseTypeDetection =
        DatabaseTypeDetector.detectFromUri(databaseUrl);
      console.log(
        `🔍 Type de BDD détecté: ${detection.detectedType} (confiance: ${(
          detection.confidence * 100
        ).toFixed(1)}%)`
      );
      if (detection.reasoning.length > 0) {
        console.log(`   Raison: ${detection.reasoning.join(", ")}`);
      }
      return detection.detectedType;
    }

    // Détection depuis les variables d'environnement
    const envDetection: DatabaseTypeDetection =
      DatabaseTypeDetector.detectFromEnv();
    console.log(
      `🔍 Type de BDD détecté depuis env: ${
        envDetection.detectedType
      } (confiance: ${(envDetection.confidence * 100).toFixed(1)}%)`
    );
    return envDetection.detectedType;
  }

  private initParams?: {
    databaseUrl?: string;
    dbConfig?: SQLAssistantOptions["dbConfig"];
  };

  /**
   * Initialize the database connection asynchronously
   */
  public async initialize(): Promise<void> {
    if (!this.initParams) {
      throw new Error("Already initialized");
    }

    const { databaseUrl, dbConfig } = this.initParams;

    try {
      if (databaseUrl) {
        await this.initializeWithUrl(databaseUrl);
      } else if (dbConfig) {
        await this.initializeWithConfig(dbConfig);
      } else {
        throw new Error("Either databaseUrl or dbConfig is required");
      }

      // Initialize query chain
      this.queryChain = new QueryChain(this, this.dbType);

      // Clear init params after successful initialization
      this.initParams = undefined;
    } catch (error) {
      throw new Error(
        `Database initialization failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  private async initializeWithUrl(url: string): Promise<void> {
    const connectionManager = new ConnectionManager(this.dbType);
    const result: ConnectionResult =
      await connectionManager.createSafeConnection(url);

    if (!result.success) {
      throw new Error(
        `Failed to connect to database: ${result.error}\n` +
          `Connection diagnostics:\n${
            result.diagnostics?.join("\n") || "No diagnostics available"
          }`
      );
    }

    if (!result.connection) {
      throw new Error("Connection object is null");
    }

    this.db = result.connection;
  }

  private async initializeWithConfig(
    config: SQLAssistantOptions["dbConfig"]
  ): Promise<void> {
    if (!config) return;

    validateDatabaseConfig(this.dbType, {
      DB_USER: config.user,
      DB_PASSWORD: config.password,
      DB_HOST: config.host,
      DB_NAME: config.database,
      DB_PATH: config.filename,
    });

    const connectionString = buildConnectionString(this.dbType, config);
    await this.initializeWithUrl(connectionString);
  }

  private async generateSQLQuery(
    question: string,
    schema: string
  ): Promise<string> {
    const prompt = this.promptManager.generateSQLPrompt(
      question,
      schema,
      this.maxResults
    );

    console.log("🔍 Génération de la requête SQL avec Gemini...");
    const result = await this.model.generateContent(prompt);
    const response = await result.response;
    let query = response.text().trim();

    console.log("📝 Requête brute générée par Gemini:", query);

    // Nettoyer la requête (enlever les backticks et les marqueurs de code)
    query = query.replace(/```(?:sql)?/g, "").trim();

    console.log("📝 Requête nettoyée:", query);

    // Validation de sécurité de base
    if (!query.toLowerCase().startsWith("select")) {
      console.log("❌ Requête rejetée - ne commence pas par SELECT");
      throw new Error("Only SELECT queries are allowed");
    }

    // Validation de syntaxe spécifique à la BDD
    const syntaxValidation = this.promptManager.validateSQLSyntax(query);
    if (!syntaxValidation.valid) {
      console.warn("SQL syntax warnings:", syntaxValidation.errors);
      // On continue quand même, l'IA peut avoir raison
    }

    return query;
  }

  private async getSchemaInfo(): Promise<SchemaInfo> {
    if (!this.db) {
      throw new Error("Database not initialized");
    }

    try {
      const tables = await this.db.raw(this.getSchemaQuery());
      return this.parseSchemaResult(tables);
    } catch (error) {
      console.error("Error fetching schema:", error);
      throw new Error("Failed to fetch database schema");
    }
  }

  private getSchemaQuery(): string {
    switch (this.dbType) {
      case "postgresql":
        return `
          SELECT 
            t.table_name,
            c.column_name,
            c.data_type,
            c.is_nullable
          FROM 
            information_schema.tables t
            JOIN information_schema.columns c ON t.table_name = c.table_name
          WHERE 
            t.table_schema = 'public'
          ORDER BY 
            t.table_name, c.ordinal_position;
        `;
      case "mysql":
      case "mariadb":
        return `
          SELECT 
            t.table_name,
            c.column_name,
            c.data_type,
            c.is_nullable
          FROM 
            information_schema.tables t
            JOIN information_schema.columns c ON t.table_name = c.table_name
          WHERE 
            t.table_schema = DATABASE()
          ORDER BY 
            t.table_name, c.ordinal_position;
        `;
      case "sqlite":
        return `
          SELECT 
            m.tbl_name as table_name,
            p.name as column_name,
            p.type as data_type,
            p."notnull" as is_nullable
          FROM 
            sqlite_master m
            JOIN pragma_table_info(m.name) p
          WHERE 
            m.type = 'table'
          ORDER BY 
            m.tbl_name, p.cid;
        `;
      default:
        throw new Error(`Schema query not implemented for ${this.dbType}`);
    }
  }

  private parseSchemaResult(result: unknown): SchemaInfo {
    const tableMap = new Map();

    // Gérer les différents formats de résultat selon le type de BDD
    let rows: unknown[] = [];

    if (Array.isArray(result)) {
      rows = result;
    } else if (result && typeof result === "object") {
      const resultObj = result as Record<string, unknown>;
      // Pour PostgreSQL, le résultat peut être dans result.rows
      if (resultObj.rows && Array.isArray(resultObj.rows)) {
        rows = resultObj.rows;
      } else if (resultObj[0] && Array.isArray(resultObj[0])) {
        // Parfois c'est un array d'arrays
        rows = result as unknown[];
      } else {
        // Essayer de convertir l'objet en array
        rows = Array.isArray(result) ? result : [result];
      }
    }

    // Debug: afficher le format du résultat
    console.log(
      "🔍 Format du résultat schéma:",
      typeof result,
      Array.isArray(result) ? "array" : "object"
    );
    if (rows.length > 0) {
      console.log("🔍 Première ligne:", rows[0]);
    }

    for (const row of rows) {
      if (!row || typeof row !== "object") continue;

      const rowObj = row as Record<string, unknown>;
      const tableName = rowObj.table_name || rowObj.tbl_name;
      const columnName = rowObj.column_name || rowObj.name;
      const dataType = rowObj.data_type || rowObj.type;
      const isNullable = rowObj.is_nullable || rowObj.notnull;

      if (!tableName || !columnName) continue;

      if (!tableMap.has(tableName)) {
        tableMap.set(tableName, {
          name: tableName,
          columns: [],
        });
      }

      const table = tableMap.get(tableName);
      table.columns.push({
        name: columnName,
        type: dataType,
        nullable:
          isNullable === "YES" || isNullable === 0 || isNullable === false,
      });
    }

    return {
      tables: Array.from(tableMap.values()),
    };
  }

  /**
   * Traite une requête en utilisant la chaîne de traitement complète
   * Retourne une réponse formatée avec métriques de performance
   */
  public async processQuery(input: QueryInput): Promise<ChainResult> {
    // Ensure database is initialized
    if (this.initParams) {
      await this.initialize();
    }

    if (!this.queryChain) {
      throw new Error("Query chain not initialized");
    }

    return this.queryChain.execute(input);
  }

  /**
   * Version simplifiée pour la compatibilité avec l'ancienne API
   */
  public async query(question: string): Promise<QueryResult> {
    try {
      // Ensure database is initialized
      if (this.initParams) {
        await this.initialize();
      }

      if (!this.db) {
        throw new Error("Database not initialized");
      }

      const schema = await this.getSchemaInfo();
      const schemaString = JSON.stringify(schema, null, 2);

      const sqlQuery = await this.generateSQLQuery(question, schemaString);
      const result = await this.db.raw(sqlQuery);

      return {
        success: true,
        data: result,
        query: sqlQuery,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
        query: undefined,
      };
    }
  }

  public async disconnect(): Promise<void> {
    if (this.db) {
      await this.db.destroy();
      this.db = null;
    }
  }
}
