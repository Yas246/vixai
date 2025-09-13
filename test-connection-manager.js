// Test rapide du ConnectionManager
const { ConnectionManager } = require("./dist/index.js");

async function testConnectionManager() {
  console.log("🧪 Test du ConnectionManager...\n");

  const manager = new ConnectionManager("sqlite");

  try {
    // Test avec une base SQLite valide
    const result = await manager.createSafeConnection("sqlite:///test.db");

    console.log("✅ Résultat de connexion:", {
      success: result.success,
      method: result.method,
      diagnosticsCount: result.diagnostics?.length || 0,
    });

    if (result.diagnostics) {
      console.log("\n📋 Diagnostics:");
      result.diagnostics.forEach((diag, i) =>
        console.log(`  ${i + 1}. ${diag}`)
      );
    }

    if (result.connection) {
      console.log("\n🔍 Test de connexion basique...");
      const isConnected = await manager.testConnection(result.connection);
      console.log(`📊 Connexion active: ${isConnected ? "✅" : "❌"}`);

      // Fermer la connexion
      await result.connection.destroy();
      console.log("🔌 Connexion fermée");
    }
  } catch (error) {
    console.error("❌ Erreur lors du test:", error.message);
  }
}

testConnectionManager();
