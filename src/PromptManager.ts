import { DatabaseType } from "./types";

export interface DatabasePrompts {
  basePrompt: string;
  specificRules: string[];
  examples: string[];
}

export class PromptManager {
  private dbType: DatabaseType;

  constructor(dbType: DatabaseType) {
    this.dbType = dbType;
  }

  /**
   * Génère le prompt complet adapté au type de base de données
   */
  public generateSQLPrompt(
    question: string,
    schema: string,
    maxResults: number
  ): string {
    const prompts = this.getDatabasePrompts();

    const prompt = `${prompts.basePrompt}

Database type: ${this.dbType.toUpperCase()}
Schema information:
${schema}

Rules:
1. Use only the tables and columns that exist in the schema
2. Limit results to ${maxResults} rows maximum
3. Make the query efficient and readable
4. Only generate the SQL query, no explanation needed
5. Use appropriate syntax for ${this.dbType}

${
  prompts.specificRules.length > 0
    ? `Database-specific rules:
${prompts.specificRules.map((rule) => `- ${rule}`).join("\n")}

`
    : ""
}Question: "${question}"

Query:`;

    return prompt;
  }

  /**
   * Retourne les prompts spécifiques à chaque type de base de données
   */
  private getDatabasePrompts(): DatabasePrompts {
    const basePrompt =
      "You are an expert SQL assistant. Generate a SQL query to answer the user's question.";

    switch (this.dbType) {
      case "sqlite":
        return {
          basePrompt,
          specificRules: [
            "Utilise LIKE pour les recherches textuelles (sensible à la casse)",
            "Date/time avec strftime() si nécessaire",
            "Utilise les fonctions SQLite natives disponibles",
          ],
          examples: [
            "Pour les dates: strftime('%Y-%m-%d', date_column)",
            "Pour les recherches: column LIKE 'pattern'",
          ],
        };

      case "postgresql":
        return {
          basePrompt,
          specificRules: [
            "Utilise ILIKE pour les recherches insensibles à la casse",
            "Fonctions PostgreSQL natives disponibles (EXTRACT, DATE_TRUNC, etc.)",
            "Support des arrays et JSON",
            "Utilise les opérateurs spécifiques PostgreSQL",
          ],
          examples: [
            "Recherche insensible: column ILIKE '%pattern%'",
            "Date: EXTRACT(YEAR FROM date_column)",
            "JSON: column->>'key' = 'value'",
          ],
        };

      case "mysql":
      case "mariadb":
        return {
          basePrompt,
          specificRules: [
            "Utilise LIKE (insensible à la casse par défaut)",
            "Fonctions MySQL disponibles (DATE_FORMAT, CONCAT, etc.)",
            "Support des FULLTEXT si configuré",
            "Syntaxe MySQL standard",
          ],
          examples: [
            "Date: DATE_FORMAT(date_column, '%Y-%m-%d')",
            "Concaténation: CONCAT(first_name, ' ', last_name)",
            "Recherche: MATCH(column) AGAINST('search' IN NATURAL LANGUAGE MODE)",
          ],
        };

      default:
        return {
          basePrompt,
          specificRules: [
            "Utilise la syntaxe SQL standard",
            "Fonctions de base disponibles",
          ],
          examples: [
            "Recherche basique: column LIKE '%pattern%'",
            "Tri: ORDER BY column ASC/DESC",
          ],
        };
    }
  }

  /**
   * Génère un prompt de réponse formatée
   */
  public generateResponsePrompt(
    question: string,
    query: string,
    dbType: DatabaseType
  ): string {
    return `Tu es un assistant expert en bases de données ${dbType.toUpperCase()}.
Réponds à la question de l'utilisateur en français de manière claire et structurée.

Si aucun résultat n'est trouvé, explique pourquoi de façon constructive.
Si les résultats sont nombreux, présente-les de manière organisée.
Si la requête a des limites, mentionne-le à l'utilisateur.

Question: ${question}
Requête SQL (${dbType.toUpperCase()}): ${query}
Résultat: {result}

Réponse détaillée:`;
  }

  /**
   * Valide la syntaxe SQL selon le type de base de données
   */
  public validateSQLSyntax(query: string): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];
    const upperQuery = query.toUpperCase();

    // Vérifications générales
    if (!upperQuery.includes("SELECT")) {
      errors.push("La requête doit contenir SELECT");
    }

    // Vérifications spécifiques par type de BDD
    switch (this.dbType) {
      case "sqlite":
        if (upperQuery.includes("ILIKE")) {
          errors.push("SQLite ne supporte pas ILIKE, utilisez LIKE");
        }
        break;

      case "postgresql":
        // PostgreSQL supporte la plupart des syntaxes
        break;

      case "mysql":
        if (upperQuery.includes("SERIAL")) {
          errors.push("MySQL utilise AUTO_INCREMENT au lieu de SERIAL");
        }
        break;
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
