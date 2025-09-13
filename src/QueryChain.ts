import { SQLAssistant } from "./SQLAssistant";
import { DatabaseType } from "./types";

export interface QueryInput {
  question: string;
  context?: string;
}

export interface QueryStep {
  name: string;
  input: unknown;
  output: unknown;
  duration: number;
  success: boolean;
  error?: string;
}

export interface ChainResult {
  success: boolean;
  question: string;
  sqlQuery: string;
  rawData: unknown;
  formattedResponse: string;
  executionTime: number;
  steps: QueryStep[];
  error?: string;
}

export class QueryChain {
  private assistant: SQLAssistant;
  private dbType: DatabaseType;

  constructor(assistant: SQLAssistant, dbType: DatabaseType) {
    this.assistant = assistant;
    this.dbType = dbType;
  }

  /**
   * Exécute la chaîne complète de traitement d'une requête
   */
  public async execute(input: QueryInput): Promise<ChainResult> {
    const startTime = Date.now();
    const steps: QueryStep[] = [];

    try {
      // Étape 1: Validation de l'entrée
      const validationStep = await this.executeStep("validation", input, () =>
        this.validateInput(input)
      );
      steps.push(validationStep);

      if (!validationStep.success) {
        throw new Error(validationStep.error || "Validation failed");
      }

      // Étape 2: Génération du schéma (si nécessaire)
      const schemaStep = await this.executeStep(
        "schema_analysis",
        { question: input.question },
        async () => {
          // Pour l'instant, on utilise la méthode existante
          // TODO: Implémenter une analyse de schéma plus sophistiquée
          return { schemaAvailable: true };
        }
      );
      steps.push(schemaStep);

      // Étape 3: Génération de la requête SQL
      const sqlGenerationStep = await this.executeStep(
        "sql_generation",
        { question: input.question, schema: schemaStep.output },
        async () => {
          // Utilise la méthode existante de SQLAssistant
          const result = await this.assistant.query(input.question);
          if (!result.success) {
            throw new Error(result.error || "SQL generation failed");
          }
          return {
            sqlQuery: result.query,
            data: result.data,
          };
        }
      );
      steps.push(sqlGenerationStep);

      if (!sqlGenerationStep.success) {
        throw new Error(sqlGenerationStep.error || "SQL generation failed");
      }

      // Étape 4: Formatage de la réponse
      const formattingStep = await this.executeStep(
        "response_formatting",
        {
          question: input.question,
          sqlQuery: (sqlGenerationStep.output as { sqlQuery: string }).sqlQuery,
          data: (sqlGenerationStep.output as { data: unknown }).data,
          dbType: this.dbType,
        },
        async (params) =>
          this.formatResponse(
            params as {
              question: string;
              sqlQuery: string;
              data: unknown;
              dbType: DatabaseType;
            }
          )
      );
      steps.push(formattingStep);

      const executionTime = Date.now() - startTime;

      return {
        success: true,
        question: input.question,
        sqlQuery: (sqlGenerationStep.output as { sqlQuery: string }).sqlQuery,
        rawData: (sqlGenerationStep.output as { data: unknown }).data,
        formattedResponse: formattingStep.output as string,
        executionTime,
        steps,
      };
    } catch (error: unknown) {
      const executionTime = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      // Ajouter l'étape d'erreur
      steps.push({
        name: "error_handling",
        input: { error: errorMessage },
        output: null,
        duration: 0,
        success: false,
        error: errorMessage,
      });

      return {
        success: false,
        question: input.question,
        sqlQuery: "",
        rawData: null,
        formattedResponse: "",
        executionTime,
        steps,
        error: errorMessage,
      };
    }
  }

  /**
   * Exécute une étape individuelle de la chaîne
   */
  private async executeStep(
    name: string,
    input: unknown,
    operation: (input: unknown) => Promise<unknown>
  ): Promise<QueryStep> {
    const startTime = Date.now();

    try {
      const output = await operation(input);
      const duration = Date.now() - startTime;

      return {
        name,
        input,
        output,
        duration,
        success: true,
      };
    } catch (error: unknown) {
      const duration = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      return {
        name,
        input,
        output: null,
        duration,
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Valide l'entrée utilisateur
   */
  private async validateInput(
    input: QueryInput
  ): Promise<{ valid: boolean; reason?: string }> {
    if (!input.question || input.question.trim().length === 0) {
      throw new Error("La question ne peut pas être vide");
    }

    if (input.question.length > 1000) {
      throw new Error("La question est trop longue (maximum 1000 caractères)");
    }

    // Vérifications de sécurité de base
    const dangerousPatterns = [
      /drop\s+table/i,
      /delete\s+from/i,
      /update\s+.*set/i,
      /insert\s+into/i,
      /alter\s+table/i,
      /create\s+table/i,
      /truncate/i,
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(input.question)) {
        throw new Error("La question contient des opérations non autorisées");
      }
    }

    return { valid: true };
  }

  /**
   * Formate la réponse finale en français
   */
  private formatResponse(params: {
    question: string;
    sqlQuery: string;
    data: unknown;
    dbType: DatabaseType;
  }): string {
    const { question, sqlQuery, data, dbType } = params;

    let response = `## Réponse à votre question\n\n`;
    response += `**Question :** ${question}\n\n`;
    response += `**Requête SQL exécutée** (${dbType.toUpperCase()}) :\n`;
    response += `\`\`\`sql\n${sqlQuery}\n\`\`\`\n\n`;

    // Analyse des résultats
    if (data && Array.isArray(data) && data.length > 0) {
      response += `**Résultats** (${data.length} ligne${
        data.length > 1 ? "s" : ""
      }) :\n\n`;

      // Déterminer les colonnes
      const columns = Object.keys(data[0]);

      // Créer un tableau markdown
      response += `| ${columns.join(" | ")} |\n`;
      response += `| ${columns.map(() => "---").join(" | ")} |\n`;

      // Ajouter les données (limiter à 10 lignes pour la lisibilité)
      const displayData = data.slice(0, 10);
      displayData.forEach((row) => {
        const values = columns.map((col) => {
          const value = row[col];
          // Formater les valeurs longues
          const strValue = String(value || "");
          return strValue.length > 50
            ? strValue.substring(0, 47) + "..."
            : strValue;
        });
        response += `| ${values.join(" | ")} |\n`;
      });

      if (data.length > 10) {
        response += `\n*... et ${data.length - 10} autres lignes*\n`;
      }

      // Ajouter des statistiques
      response += `\n**Statistiques :**\n`;
      response += `- Nombre total de résultats : ${data.length}\n`;

      // Statistiques par colonne si applicable
      columns.forEach((col) => {
        const values = data.map((row) => row[col]).filter((val) => val != null);
        if (values.length > 0) {
          if (typeof values[0] === "number") {
            const sum = values.reduce((a, b) => a + b, 0);
            const avg = sum / values.length;
            response += `- ${col} : somme = ${sum.toLocaleString()}, moyenne = ${avg.toFixed(
              2
            )}\n`;
          } else {
            const uniqueValues = new Set(values.map((v) => String(v))).size;
            response += `- ${col} : ${uniqueValues} valeur${
              uniqueValues > 1 ? "s" : ""
            } unique${uniqueValues > 1 ? "s" : ""}\n`;
          }
        }
      });
    } else if (data && Array.isArray(data) && data.length === 0) {
      response += `**Résultats :** Aucun résultat trouvé\n\n`;
      response += `💡 **Suggestion :** Essayez de reformuler votre question ou vérifiez les données disponibles.\n`;
    } else if (data && !Array.isArray(data)) {
      // Résultat simple (COUNT, SUM, etc.)
      response += `**Résultat :** ${JSON.stringify(data, null, 2)}\n`;
    } else {
      response += `**Résultats :** Impossible d'afficher les résultats\n`;
    }

    // Informations supplémentaires
    response += `\n---\n`;
    response += `*Base de données : ${dbType.toUpperCase()}*\n`;
    response += `*Assistant IA : Google Gemini*\n`;

    return response;
  }

  /**
   * Obtient les métriques de performance de la chaîne
   */
  public getChainMetrics(result: ChainResult): {
    totalTime: number;
    stepBreakdown: { [key: string]: number };
    successRate: number;
    averageStepTime: number;
  } {
    const stepBreakdown: { [key: string]: number } = {};
    let successfulSteps = 0;

    result.steps.forEach((step) => {
      stepBreakdown[step.name] = step.duration;
      if (step.success) successfulSteps++;
    });

    return {
      totalTime: result.executionTime,
      stepBreakdown,
      successRate: (successfulSteps / result.steps.length) * 100,
      averageStepTime: result.executionTime / result.steps.length,
    };
  }
}
