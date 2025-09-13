// Démonstration de l'utilisation de vix-ai-sql avec les nouvelles fonctionnalités
const { SQLAssistant } = require("./dist/index.js");

async function demoUsage() {
  console.log(
    "🚀 Démonstration de vix-ai-sql avec les nouvelles fonctionnalités\n"
  );

  // Configuration (remplacer par vos vraies valeurs)
  const config = {
    googleApiKey: process.env.GOOGLE_API_KEY || "your-api-key",
    databaseUrl: "sqlite:///demo.db", // ou votre URL de BDD
    dbType: "sqlite",
    temperature: 0.1,
    maxResults: 50,
  };

  try {
    console.log("1️⃣ Initialisation de l'assistant...");
    const assistant = new SQLAssistant(config);

    // NOUVELLE FONCTIONNALITÉ: Initialisation asynchrone avec fallback
    console.log(
      "2️⃣ Connexion à la base de données (avec système de fallback)..."
    );
    await assistant.initialize();

    console.log("3️⃣ Test de requête avec prompts spécialisés...");
    const result = await assistant.query(
      "Montre-moi les 5 premiers utilisateurs"
    );

    if (result.success) {
      console.log("✅ Requête exécutée avec succès!");
      console.log("📝 Requête SQL générée:", result.query);
      console.log("📊 Résultats:", result.data);
    } else {
      console.log("❌ Erreur:", result.error);
    }

    console.log("4️⃣ Fermeture de la connexion...");
    await assistant.disconnect();

    console.log("\n🎉 Démonstration terminée avec succès!");
  } catch (error) {
    console.error("❌ Erreur lors de la démonstration:", error.message);

    // Afficher les conseils de diagnostic si disponibles
    if (error.message.includes("Failed to connect")) {
      console.log("\n💡 Conseils:");
      console.log("• Vérifiez vos identifiants de connexion");
      console.log("• Assurez-vous que la base de données existe");
      console.log("• Vérifiez les permissions utilisateur");
      console.log("• Testez la connectivité réseau");
    }
  }
}

// Fonction pour tester différents types de BDD
async function testMultipleDatabases() {
  console.log(
    "\n🧪 Test des prompts spécialisés pour différents types de BDD...\n"
  );

  const dbTypes = ["sqlite", "postgresql", "mysql", "mssql", "oracle"];

  for (const dbType of dbTypes) {
    console.log(`📋 Test des prompts pour ${dbType.toUpperCase()}:`);

    // Simuler la génération de prompt sans connexion réelle
    const { PromptManager } = require("./dist/index.js");
    const manager = new PromptManager(dbType);

    const prompt = manager.generateSQLPrompt(
      'Chercher les utilisateurs dont le nom contient "Jean"',
      "Table users: id(int), name(varchar), email(varchar)",
      10
    );

    // Afficher un extrait du prompt pour voir les spécificités
    const lines = prompt.split("\n");
    const specificRules = lines.find((line) =>
      line.includes("Database-specific rules")
    );
    if (specificRules) {
      console.log(`  ✅ Règles spécifiques trouvées`);
    } else {
      console.log(`  ⚠️  Pas de règles spécifiques`);
    }

    // Test de validation
    const testQueries = [
      'SELECT * FROM users WHERE name LIKE "%Jean%"', // MySQL style
      'SELECT * FROM users WHERE name ILIKE "%Jean%"', // PostgreSQL style
    ];

    testQueries.forEach((query, i) => {
      const validation = manager.validateSQLSyntax(query);
      console.log(
        `  🔍 Validation requête ${i + 1}: ${validation.valid ? "✅" : "❌"}`
      );
    });

    console.log("");
  }
}

// Exécuter les démonstrations
async function runAllDemos() {
  await demoUsage();
  await testMultipleDatabases();
}

if (require.main === module) {
  runAllDemos();
}

module.exports = { demoUsage, testMultipleDatabases };
