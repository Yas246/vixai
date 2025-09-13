// Test rapide du DatabaseTypeDetector
const { DatabaseTypeDetector } = require("./dist/index.js");

function testDatabaseTypeDetector() {
  console.log("🧪 Test du DatabaseTypeDetector...\n");

  // Test des URI de différents types
  const testUris = [
    "sqlite:///test.db",
    "postgresql://user:pass@localhost:5432/db",
    "mysql://user:pass@localhost:3306/db",
    "mssql://user:pass@localhost:1433/db",
    "oracle://user:pass@localhost:1521/db",
    "mariadb://user:pass@localhost:3306/db",
    "invalid-uri",
    "",
  ];

  console.log("📋 Test de détection depuis URI:");
  testUris.forEach((uri) => {
    const detection = DatabaseTypeDetector.detectFromUri(uri);
    console.log(
      `   "${uri}" → ${detection.detectedType} (${(
        detection.confidence * 100
      ).toFixed(1)}%)`
    );
    if (detection.reasoning.length > 0) {
      console.log(`      Raison: ${detection.reasoning[0]}`);
    }
  });

  console.log("\n📋 Test des types supportés:");
  const supportedTypes = DatabaseTypeDetector.getSupportedTypes();
  console.log(`   Types supportés: ${supportedTypes.join(", ")}`);

  console.log("\n📋 Exemples d'URI:");
  const examples = DatabaseTypeDetector.getUriExamples();
  Object.entries(examples).forEach(([type, uri]) => {
    console.log(`   ${type}: ${uri}`);
  });

  console.log("\n📋 Validation des types:");
  const testTypes = ["sqlite", "postgresql", "invalid"];
  testTypes.forEach((type) => {
    const isSupported = DatabaseTypeDetector.isSupportedType(type);
    console.log(
      `   ${type}: ${isSupported ? "✅ Supporté" : "❌ Non supporté"}`
    );
  });

  console.log("\n🎉 Test DatabaseTypeDetector terminé!");
}

if (require.main === module) {
  testDatabaseTypeDetector();
}

module.exports = { testDatabaseTypeDetector };
