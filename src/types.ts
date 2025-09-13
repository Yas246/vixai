import { z } from "zod";

export type DatabaseType = "sqlite" | "postgresql" | "mysql" | "mariadb";

export interface DatabaseConfig {
  driver: string;
  port: number | null;
  exampleUri: string;
  description: string;
  requiredEnv: string[];
}

export interface DatabaseConfigs {
  [key: string]: DatabaseConfig;
}

export const envSchema = z.object({
  GOOGLE_API_KEY: z.string(),
  DATABASE_URL: z.string().optional(),
  DB_TYPE: z.string().optional(),
  DB_USER: z.string().optional(),
  DB_PASSWORD: z.string().optional(),
  DB_HOST: z.string().optional(),
  DB_PORT: z.string().optional(),
  DB_NAME: z.string().optional(),
  DB_PATH: z.string().optional(),
});

export type EnvVars = z.infer<typeof envSchema>;

export interface SQLAssistantOptions {
  googleApiKey?: string;
  databaseUrl?: string;
  dbType?: DatabaseType;
  dbConfig?: {
    user?: string;
    password?: string;
    host?: string;
    port?: string | number;
    database?: string;
    filename?: string;
  };
  temperature?: number;
  maxResults?: number;
}

export interface QueryResult {
  success: boolean;
  data?: unknown;
  error?: string;
  query?: string;
}

export interface SchemaInfo {
  tables: {
    name: string;
    columns: {
      name: string;
      type: string;
      nullable: boolean;
    }[];
  }[];
}
