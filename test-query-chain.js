// Test rapide de la QueryChain
const { SQLAssistant, QueryChain } = require("./dist/index.js");

async function testQueryChain() {
  console.log("🧪 Test de la QueryChain...\n");

  // Configuration de test
  const config = {
    googleApiKey: process.env.GOOGLE_API_KEY || "test-key",
    databaseUrl: "sqlite:///test.db",
    dbType: "sqlite",
    temperature: 0.1,
    maxResults: 10,
  };

  try {
    console.log("1️⃣ Initialisation de l'assistant...");
    const assistant = new SQLAssistant(config);
    await assistant.initialize();

    console.log("2️⃣ Test de la QueryChain...");
    const chain = new QueryChain(assistant, "sqlite");

    const input = {
      question: "Combien y a-t-il de tables dans la base ?",
      context: "Test de la chaîne de traitement",
    };

    console.log("3️⃣ Exécution de la chaîne...");
    const result = await chain.execute(input);

    console.log("✅ Résultat obtenu:");
    console.log(`   - Succès: ${result.success}`);
    console.log(`   - Temps d'exécution: ${result.executionTime}ms`);
    console.log(`   - Nombre d'étapes: ${result.steps.length}`);

    // Afficher les étapes
    console.log("\n📋 Détail des étapes:");
    result.steps.forEach((step, i) => {
      console.log(
        `   ${i + 1}. ${step.name}: ${step.success ? "✅" : "❌"} (${
          step.duration
        }ms)`
      );
      if (!step.success && step.error) {
        console.log(`      Erreur: ${step.error}`);
      }
    });

    // Afficher les métriques
    console.log("\n📊 Métriques de performance:");
    const metrics = chain.getChainMetrics(result);
    console.log(`   - Temps total: ${metrics.totalTime}ms`);
    console.log(`   - Taux de succès: ${metrics.successRate.toFixed(1)}%`);
    console.log(
      `   - Temps moyen par étape: ${metrics.averageStepTime.toFixed(1)}ms`
    );

    Object.entries(metrics.stepBreakdown).forEach(([step, time]) => {
      console.log(`   - ${step}: ${time}ms`);
    });

    // Afficher un extrait de la réponse formatée
    if (result.formattedResponse) {
      console.log("\n📝 Extrait de la réponse formatée:");
      const lines = result.formattedResponse.split("\n").slice(0, 5);
      lines.forEach((line) => console.log(`   ${line}`));
      if (result.formattedResponse.split("\n").length > 5) {
        console.log("   ...");
      }
    }

    console.log("\n4️⃣ Fermeture de la connexion...");
    await assistant.disconnect();

    console.log("\n🎉 Test QueryChain terminé avec succès!");
  } catch (error) {
    console.error("❌ Erreur lors du test:", error.message);

    // Afficher les conseils de diagnostic
    if (error.message.includes("Google API key")) {
      console.log(
        "\n💡 Conseil: Définissez GOOGLE_API_KEY dans vos variables d'environnement"
      );
    } else if (error.message.includes("connect")) {
      console.log(
        "\n💡 Conseil: Vérifiez votre configuration de base de données"
      );
    }
  }
}

if (require.main === module) {
  testQueryChain();
}

module.exports = { testQueryChain };
