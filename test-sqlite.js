const { SQLAssistant } = require("./dist/index.js");

async function detailedTest() {
  console.log("🧪 Test détaillé avec vraie base SQLite...\n");

  const assistant = new SQLAssistant({
    googleApiKey: "test-key",
    databaseUrl: "sqlite:///:memory:",
    dbType: "sqlite",
  });

  try {
    console.log("1️⃣ Initialisation...");
    await assistant.initialize();
    console.log("✅ Initialisation réussie\n");

    console.log("2️⃣ Test de requête simple...");
    const result = await assistant.query("SELECT 1 as test");
    console.log("📊 Résultat:", {
      success: result.success,
      error: result.error,
      hasQuery: !!result.query,
      hasData: !!result.data,
    });

    if (result.error) {
      console.log("❌ Erreur détaillée:", result.error);
    }

    await assistant.disconnect();
    console.log("\n✅ Connexion fermée avec succès");
  } catch (error) {
    console.error("❌ Erreur d'initialisation:", error.message);
  }
}

detailedTest();
