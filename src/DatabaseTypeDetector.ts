import { DatabaseType } from "./types";

export interface DatabaseTypeDetection {
  detectedType: DatabaseType;
  confidence: number;
  uri: string;
  reasoning: string[];
}

export class DatabaseTypeDetector {
  /**
   * Détecte automatiquement le type de base de données depuis l'URI
   */
  public static detectFromUri(uri: string): DatabaseTypeDetection {
    if (!uri || typeof uri !== "string") {
      return {
        detectedType: "sqlite",
        confidence: 0,
        uri,
        reasoning: ["URI invalide ou manquante, fallback vers SQLite"],
      };
    }

    const lowerUri = uri.toLowerCase();
    const reasoning: string[] = [];

    // Détection par mots-clés dans l'URI
    if (lowerUri.includes("sqlite")) {
      reasoning.push('Mot-clé "sqlite" trouvé dans l\'URI');
      return {
        detectedType: "sqlite",
        confidence: 1.0,
        uri,
        reasoning,
      };
    }

    if (lowerUri.includes("postgresql") || lowerUri.includes("postgres")) {
      reasoning.push('Mot-clé "postgresql/postgres" trouvé dans l\'URI');
      return {
        detectedType: "postgresql",
        confidence: 1.0,
        uri,
        reasoning,
      };
    }

    if (lowerUri.includes("mysql") && !lowerUri.includes("mariadb")) {
      reasoning.push('Mot-clé "mysql" trouvé dans l\'URI (sans mariadb)');
      return {
        detectedType: "mysql",
        confidence: 0.9,
        uri,
        reasoning,
      };
    }

    if (lowerUri.includes("mariadb")) {
      reasoning.push('Mot-clé "mariadb" trouvé dans l\'URI');
      return {
        detectedType: "mariadb",
        confidence: 1.0,
        uri,
        reasoning,
      };
    }

    // Détection par pattern d'URI
    const uriPatterns = [
      {
        pattern: /^mysql:\/\//,
        type: "mysql" as DatabaseType,
        reason: "Pattern MySQL détecté",
      },
      {
        pattern: /^postgresql:\/\//,
        type: "postgresql" as DatabaseType,
        reason: "Pattern PostgreSQL détecté",
      },
      {
        pattern: /^sqlite:\/\//,
        type: "sqlite" as DatabaseType,
        reason: "Pattern SQLite détecté",
      },
    ];

    for (const { pattern, type, reason } of uriPatterns) {
      if (pattern.test(uri)) {
        reasoning.push(reason);
        return {
          detectedType: type,
          confidence: 0.95,
          uri,
          reasoning,
        };
      }
    }

    // Détection par numéro de port
    const portPatterns = [
      {
        ports: [5432],
        type: "postgresql" as DatabaseType,
        reason: "Port PostgreSQL détecté",
      },
      {
        ports: [3306],
        type: "mysql" as DatabaseType,
        reason: "Port MySQL/MariaDB détecté",
      },
    ];

    for (const { ports, type, reason } of portPatterns) {
      for (const port of ports) {
        if (uri.includes(`:${port}`)) {
          reasoning.push(`${reason} (${port})`);
          return {
            detectedType: type,
            confidence: 0.8,
            uri,
            reasoning,
          };
        }
      }
    }

    // Fallback vers SQLite si rien n'est détecté
    reasoning.push("Aucun pattern reconnu, fallback vers SQLite");
    return {
      detectedType: "sqlite",
      confidence: 0.1,
      uri,
      reasoning,
    };
  }

  /**
   * Détecte le type depuis les variables d'environnement
   */
  public static detectFromEnv(): DatabaseTypeDetection {
    const dbType = process.env.DB_TYPE;
    const databaseUrl = process.env.DATABASE_URL;

    // Priorité à DATABASE_URL si elle existe
    if (databaseUrl) {
      return this.detectFromUri(databaseUrl);
    }

    // Sinon utiliser DB_TYPE
    if (dbType) {
      const reasoning = [`Type spécifié via DB_TYPE: ${dbType}`];
      return {
        detectedType: dbType as DatabaseType,
        confidence: 0.9,
        uri: "",
        reasoning,
      };
    }

    // Fallback
    return {
      detectedType: "sqlite",
      confidence: 0.1,
      uri: "",
      reasoning: ["Aucune configuration trouvée, fallback vers SQLite"],
    };
  }

  /**
   * Valide qu'un type de base de données est supporté
   */
  public static isSupportedType(type: string): type is DatabaseType {
    const supportedTypes: DatabaseType[] = [
      "sqlite",
      "postgresql",
      "mysql",
      "mariadb",
    ];
    return supportedTypes.includes(type as DatabaseType);
  }

  /**
   * Obtient la liste des types supportés
   */
  public static getSupportedTypes(): DatabaseType[] {
    return ["sqlite", "postgresql", "mysql", "mariadb"];
  }

  /**
   * Fournit des exemples d'URI pour chaque type
   */
  public static getUriExamples(): Record<DatabaseType, string> {
    return {
      sqlite: "sqlite:///chemin/vers/database.db",
      postgresql: "postgresql://user:password@localhost:5432/database",
      mysql: "mysql://user:password@localhost:3306/database",
      mariadb: "mysql://user:password@localhost:3306/database",
    };
  }
}
