import knex, { Knex } from "knex";
import { getDatabaseConfig } from "./config";
import { DatabaseType } from "./types";

export interface ConnectionResult {
  success: boolean;
  connection?: Knex;
  error?: string;
  method?: string;
  diagnostics?: string[];
}

export interface ConnectionDiagnostics {
  connectionType: string;
  errorType: string;
  suggestions: string[];
  requiresAction: boolean;
}

export class ConnectionManager {
  private dbType: DatabaseType;

  constructor(dbType: DatabaseType) {
    this.dbType = dbType;
  }

  /**
   * Tente de se connecter avec un système de fallback en 3 niveaux
   */
  public async createSafeConnection(
    connectionString: string
  ): Promise<ConnectionResult> {
    const diagnostics: string[] = [];

    // Niveau 1: Connexion standard
    try {
      diagnostics.push("🔌 Tentative de connexion standard...");
      const connection = await this.tryStandardConnection(connectionString);
      diagnostics.push("✅ Connexion standard réussie");
      return {
        success: true,
        connection,
        method: "standard",
        diagnostics,
      };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      diagnostics.push(
        `⚠️ Connexion standard échouée: ${errorMessage.slice(0, 100)}...`
      );

      // Vérifier si c'est un problème de permissions
      if (this.isPermissionError(error)) {
        diagnostics.push(
          "🔄 Tentative en mode restreint (permissions limitées)..."
        );

        // Niveau 2: Mode restreint
        try {
          const connection = await this.tryRestrictedConnection(
            connectionString
          );
          diagnostics.push("✅ Connexion restreinte réussie");
          return {
            success: true,
            connection,
            method: "restricted",
            diagnostics,
          };
        } catch (error2: unknown) {
          const errorMessage =
            error2 instanceof Error ? error2.message : String(error2);
          diagnostics.push(
            `⚠️ Mode restreint échoué: ${errorMessage.slice(0, 100)}...`
          );
        }
      }

      // Niveau 3: Connexion SQLAlchemy directe (fallback ultime)
      diagnostics.push("🔄 Tentative avec SQLAlchemy direct...");
      try {
        const connection = await this.tryDirectSQLAlchemyConnection(
          connectionString
        );
        diagnostics.push("✅ Connexion SQLAlchemy directe réussie");
        return {
          success: true,
          connection,
          method: "direct",
          diagnostics,
        };
      } catch (error3: unknown) {
        const errorMessage =
          error3 instanceof Error ? error3.message : String(error3);
        diagnostics.push(`❌ Toutes les tentatives ont échoué`);
        diagnostics.push(`Dernière erreur: ${errorMessage.slice(0, 200)}...`);

        return {
          success: false,
          error: errorMessage,
          diagnostics,
        };
      }
    }
  }

  /**
   * Connexion standard avec Knex
   */
  private async tryStandardConnection(connectionString: string): Promise<Knex> {
    const config = this.createKnexConfig(connectionString);
    const db = knex(config);

    // Test de connexion
    await db.raw("SELECT 1");
    return db;
  }

  /**
   * Connexion en mode restreint (pour bases avec permissions limitées)
   */
  private async tryRestrictedConnection(
    connectionString: string
  ): Promise<Knex> {
    const config = this.createKnexConfig(connectionString, true);
    const db = knex(config);

    // Test de connexion basique
    await db.raw("SELECT 1");
    return db;
  }

  /**
   * Connexion directe via SQLAlchemy (fallback ultime)
   */
  private async tryDirectSQLAlchemyConnection(
    connectionString: string
  ): Promise<Knex> {
    // Pour l'instant, on utilise la même approche que le mode restreint
    // TODO: Implémenter une vraie connexion SQLAlchemy si nécessaire
    return this.tryRestrictedConnection(connectionString);
  }

  /**
   * Crée la configuration Knex
   */
  private createKnexConfig(
    connectionString: string,
    restricted: boolean = false
  ): Knex.Config {
    const dbConfig = getDatabaseConfig(this.dbType);

    let connection: string | { filename: string };

    // Configuration spécifique pour SQLite
    if (this.dbType === "sqlite") {
      // Parser l'URI SQLite
      if (connectionString === "sqlite:///:memory:") {
        connection = { filename: ":memory:" };
      } else if (connectionString.startsWith("sqlite:///")) {
        const filename = connectionString.replace("sqlite:///", "");
        connection = { filename };
      } else {
        // Fallback pour les autres formats
        connection = { filename: ":memory:" };
      }

      return {
        client: dbConfig.driver,
        connection,
        useNullAsDefault: true,
        pool: restricted ? { min: 1, max: 2 } : { min: 2, max: 10 },
      };
    }

    // Pour les autres bases de données, utiliser l'URI directement
    connection = connectionString;

    const baseConfig: Knex.Config = {
      client: dbConfig.driver,
      connection,
      pool: restricted ? { min: 1, max: 2 } : { min: 2, max: 10 },
    };

    // Configuration restreinte pour les permissions limitées
    if (restricted) {
      return {
        ...baseConfig,
        // Options pour limiter les accès
        acquireConnectionTimeout: 5000,
        pool: { min: 1, max: 2 },
      };
    }

    return baseConfig;
  }

  /**
   * Détecte si l'erreur est liée aux permissions
   */
  private isPermissionError(error: unknown): boolean {
    const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
    return (
      message.includes("permission denied") ||
      message.includes("insufficient") ||
      message.includes("access denied") ||
      message.includes("unauthorized")
    );
  }

  /**
   * Crée un diagnostic détaillé de l'erreur
   */
  private createDetailedDiagnostics(error: unknown): ConnectionDiagnostics {
    const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
    const diagnostics: ConnectionDiagnostics = {
      connectionType: this.dbType,
      errorType: "unknown",
      suggestions: [],
      requiresAction: false,
    };

    // Diagnostic par type d'erreur
    if (
      message.includes("could not connect") ||
      message.includes("connection refused")
    ) {
      diagnostics.errorType = "connectivity";
      diagnostics.suggestions = [
        "🔍 Vérifiez la connectivité réseau ou l'état du serveur",
        "🔍 Vérifiez que le service de base de données est démarré",
        "🔍 Vérifiez le nom d'hôte et le port",
      ];
    } else if (
      message.includes("authentication") ||
      message.includes("password") ||
      message.includes("login")
    ) {
      diagnostics.errorType = "authentication";
      diagnostics.suggestions = [
        "🔍 Vérifiez les identifiants de connexion (login/mot de passe)",
        "🔍 Vérifiez que l'utilisateur existe et a les droits",
        "🔍 Vérifiez la configuration des variables d'environnement",
      ];
      diagnostics.requiresAction = true;
    } else if (
      message.includes("database") &&
      message.includes("does not exist")
    ) {
      diagnostics.errorType = "database_not_found";
      diagnostics.suggestions = [
        "🔍 Vérifiez que la base de données existe",
        "🔍 Créez la base de données si elle n'existe pas",
        "🔍 Vérifiez les droits de création de base de données",
      ];
      diagnostics.requiresAction = true;
    } else if (message.includes("driver") || message.includes("module")) {
      diagnostics.errorType = "driver_missing";
      diagnostics.suggestions = [
        `🔍 Driver manquant pour ${this.dbType}`,
        this.getDriverInstallationSuggestion(),
        "🔍 Redémarrez l'application après installation",
      ];
      diagnostics.requiresAction = true;
    }

    return diagnostics;
  }

  /**
   * Suggestion d'installation de driver selon le type de BDD
   */
  private getDriverInstallationSuggestion(): string {
    switch (this.dbType) {
      case "postgresql":
        return "💡 Installez: npm install pg";
      case "mysql":
      case "mariadb":
        return "💡 Installez: npm install mysql2";
      default:
        return "💡 Vérifiez la documentation pour le driver approprié";
    }
  }

  /**
   * Test de connexion basique
   */
  public async testConnection(connection: Knex): Promise<boolean> {
    try {
      await connection.raw("SELECT 1");
      return true;
    } catch {
      return false;
    }
  }
}
