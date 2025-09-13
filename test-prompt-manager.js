// Test rapide du PromptManager
const { PromptManager } = require("./dist/index.js");

function testPromptManager() {
  console.log("🧪 Test du PromptManager...\n");

  // Test pour différents types de BDD
  const dbTypes = ["sqlite", "postgresql", "mysql", "mssql", "oracle"];

  dbTypes.forEach((dbType) => {
    console.log(`📋 Test pour ${dbType.toUpperCase()}:`);

    const manager = new PromptManager(dbType);

    // Test de génération de prompt
    const prompt = manager.generateSQLPrompt(
      "Combien y a-t-il d'utilisateurs ?",
      "Table: users (id, name, email)",
      100
    );

    console.log(`  ✅ Prompt généré (${prompt.length} caractères)`);

    // Test de validation SQL
    const testQuery = "SELECT COUNT(*) FROM users";
    const validation = manager.validateSQLSyntax(testQuery);

    console.log(
      `  ✅ Validation SQL: ${validation.valid ? "Valide" : "Erreur"}`
    );
    if (validation.errors.length > 0) {
      console.log(`     ⚠️  Erreurs: ${validation.errors.join(", ")}`);
    }

    console.log("");
  });

  console.log("🎉 Test PromptManager terminé !");
}

testPromptManager();
