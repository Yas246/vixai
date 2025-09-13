const { SQLAssistant } = require("./dist/index.js");

async function testWithRealDatabase() {
  console.log("🚀 Test complet avec vraie base PostgreSQL + API Gemini\n");

  // Configuration avec les vraies informations fournies
  const config = {
    googleApiKey: "AIzaSyAhTMATCABckAvkmXXFYdiiIGtZs7Z9q24",
    databaseUrl: "postgresql://postgres:root@localhost:5432/banque",
    dbType: "postgresql",
    temperature: 0.1,
    maxResults: 10,
  };

  try {
    console.log("1️⃣ Initialisation de l'assistant...");
    const assistant = new SQLAssistant(config);

    console.log("2️⃣ Connexion à PostgreSQL...");
    await assistant.initialize();
    console.log("✅ Connexion réussie !\n");

    // Test 1: Question sur le salaire maximum
    console.log('3️⃣ Test: "Quel client a le plus grand salaire ?"');
    const result1 = await assistant.processQuery({
      question: "Quel client a le plus grand salaire ?",
    });

    console.log("📊 Résultat:", result1.success ? "✅" : "❌");

    // Afficher toujours la requête générée pour debug
    if (result1.sqlQuery) {
      console.log("📝 Requête SQL générée:", result1.sqlQuery);
    }

    if (result1.success) {
      console.log("📝 Requête SQL générée:", result1.sqlQuery);
      console.log(
        "📊 Données récupérées:",
        result1.rawData?.length || 0,
        "lignes"
      );
      console.log("⏱️ Temps d'exécution:", result1.executionTime, "ms");
      console.log("📋 Nombre d'étapes:", result1.steps.length);

      // Afficher la réponse formatée
      console.log("\n📄 Réponse formatée:");
      console.log("=".repeat(50));
      console.log(result1.formattedResponse);
      console.log("=".repeat(50));
    } else {
      console.log("❌ Erreur:", result1.error);
    }

    // Test 2: Métriques de performance
    console.log("\n4️⃣ Métriques de performance:");
    const metrics = assistant.queryChain.getChainMetrics(result1);
    console.log("📈 Performance:", {
      tempsTotal: `${metrics.totalTime}ms`,
      tauxReussite: `${metrics.successRate.toFixed(1)}%`,
      tempsMoyenParEtape: `${metrics.averageStepTime.toFixed(1)}ms`,
    });

    // Afficher le détail des étapes
    console.log("\n📋 Détail des étapes:");
    result1.steps.forEach((step, i) => {
      const status = step.success ? "✅" : "❌";
      console.log(`   ${i + 1}. ${step.name}: ${status} (${step.duration}ms)`);
    });

    console.log("\n5️⃣ Fermeture de la connexion...");
    await assistant.disconnect();
    console.log("✅ Test terminé avec succès ! 🎉");
  } catch (error) {
    console.error("❌ Erreur lors du test:", error.message);

    // Diagnostic des erreurs communes
    if (error.message.includes("API_KEY_INVALID")) {
      console.log("\n💡 Conseil: Vérifiez votre clé API Google Gemini");
    } else if (error.message.includes("connect")) {
      console.log(
        "\n💡 Conseil: Vérifiez vos informations de connexion PostgreSQL"
      );
      console.log("   - Le serveur PostgreSQL est-il démarré ?");
      console.log("   - Les identifiants sont-ils corrects ?");
      console.log('   - La base de données "banque" existe-t-elle ?');
    } else if (
      error.message.includes("relation") ||
      error.message.includes("does not exist")
    ) {
      console.log(
        "\n💡 Conseil: Vérifiez que les tables existent dans votre base de données"
      );
      console.log('   - Avez-vous des tables "client" ou similaires ?');
      console.log('   - Les colonnes "salaire" existent-elles ?');
    }
  }
}

// Exécuter le test
testWithRealDatabase();
