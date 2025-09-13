import { DatabaseConfigs, DatabaseType } from "./types";

export const DB_CONFIGS: DatabaseConfigs = {
  sqlite: {
    driver: "sqlite",
    port: null,
    exampleUri: "sqlite:///database.db",
    description: "SQLite local database",
    requiredEnv: [],
  },
  postgresql: {
    driver: "pg",
    port: 5432,
    exampleUri: "postgresql://user:password@localhost:5432/database",
    description: "PostgreSQL database",
    requiredEnv: ["DB_USER", "DB_PASSWORD", "DB_HOST", "DB_NAME"],
  },
  mysql: {
    driver: "mysql2",
    port: 3306,
    exampleUri: "mysql://user:password@localhost:3306/database",
    description: "MySQL database",
    requiredEnv: ["DB_USER", "DB_PASSWORD", "DB_HOST", "DB_NAME"],
  },
  mariadb: {
    driver: "mysql2",
    port: 3306,
    exampleUri: "mysql://user:password@localhost:3306/database",
    description: "MariaDB database",
    requiredEnv: ["DB_USER", "DB_PASSWORD", "DB_HOST", "DB_NAME"],
  },
};

export function getDatabaseConfig(dbType: DatabaseType) {
  const config = DB_CONFIGS[dbType];
  if (!config) {
    throw new Error(`Unsupported database type: ${dbType}`);
  }
  return config;
}

export function buildConnectionString(
  dbType: DatabaseType,
  config: {
    user?: string;
    password?: string;
    host?: string;
    port?: string | number;
    database?: string;
    filename?: string;
  }
): string {
  const dbConfig = getDatabaseConfig(dbType);

  if (dbType === "sqlite") {
    return `sqlite:///${config.filename || "database.db"}`;
  }

  const {
    user = "user",
    password = "password",
    host = "localhost",
    port = dbConfig.port,
    database = "database",
  } = config;

  switch (dbType) {
    case "postgresql":
      return `postgresql://${user}:${password}@${host}:${port}/${database}`;
    case "mysql":
    case "mariadb":
      return `mysql://${user}:${password}@${host}:${port}/${database}`;
    default:
      throw new Error(`Unsupported database type: ${dbType}`);
  }
}

export function validateDatabaseConfig(
  dbType: DatabaseType,
  config: Record<string, string | undefined>
): void {
  const dbConfig = getDatabaseConfig(dbType);

  if (dbType === "sqlite") {
    return;
  }

  const missingVars = dbConfig.requiredEnv.filter((env) => !config[env]);
  if (missingVars.length > 0) {
    throw new Error(
      `Missing required environment variables for ${dbType}: ${missingVars.join(
        ", "
      )}`
    );
  }
}
