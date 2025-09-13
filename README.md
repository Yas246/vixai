# 🚀 vixai

[![npm version](https://badge.fury.io/js/vixai.svg)](https://badge.fury.io/js/vixai)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-43853D?logo=node.js&logoColor=white)](https://nodejs.org/)

**Assistant SQL alimenté par l'IA** - Transformez vos questions en langage naturel en requêtes SQL optimisées et sécurisées.

**✨ Fonctionnalités principales :**

- 🤖 **IA Avancée** : Google Gemini 2.0-flash pour génération intelligente de SQL
- 🗄️ **Bases de données** : Support complet de SQLite, PostgreSQL, MySQL, MariaDB
- 🔍 **Détection Auto** : Détection automatique du type de base de données
- 🛡️ **Sécurité** : Validation stricte des requêtes (SELECT uniquement)
- ⚡ **Performance** : Système de fallback et connexions optimisées
- 📊 **Métriques** : Suivi détaillé des performances et diagnostics
- 🎯 **TypeScript** : Typage complet et IntelliSense
- 🔧 **Modulaire** : Architecture extensible et maintenable

## 📦 Installation

### Prérequis

- **Node.js** >= 16.0.0
- **npm** ou **yarn**
- **Clé API Google Gemini** (obtenir sur [Google AI Studio](https://makersuite.google.com/app/apikey))

### Installation du package

```bash
npm install vixai
# ou
yarn add vixai
```

### Installation des drivers de base de données

```bash
# PostgreSQL
npm install pg

# MySQL/MariaDB
npm install mysql2

# SQLite (inclus par défaut)
```

## ⚙️ Configuration

### 1. Variables d'environnement

Créez un fichier `.env` à la racine de votre projet :

```env
# 🔑 API Google Gemini (obligatoire)
GOOGLE_API_KEY=votre_cle_api_google_gemini

# 🗄️ Option 1 : URL de connexion directe (recommandé)
DATABASE_URL=postgresql://user:password@localhost:5432/database

# 🗄️ Option 2 : Configuration détaillée
DB_TYPE=postgresql
DB_USER=user
DB_PASSWORD=password
DB_HOST=localhost
DB_PORT=5432
DB_NAME=database

# 🗄️ Option 3 : SQLite (simple)
DATABASE_URL=sqlite:///:memory:
# ou
DB_TYPE=sqlite
DB_PATH=./database.db
```

### 2. Configuration TypeScript

#### Configuration simple (recommandée)

```typescript
import { SQLAssistant } from "vixai";

const assistant = new SQLAssistant({
  googleApiKey: process.env.GOOGLE_API_KEY!,
  databaseUrl: process.env.DATABASE_URL!,
});
```

#### Configuration avancée

```typescript
import { SQLAssistant } from "vixai";

const assistant = new SQLAssistant({
  googleApiKey: process.env.GOOGLE_API_KEY!,
  dbType: "postgresql", // Optionnel : détecté automatiquement
  dbConfig: {
    user: process.env.DB_USER!,
    password: process.env.DB_PASSWORD!,
    host: process.env.DB_HOST!,
    port: parseInt(process.env.DB_PORT!),
    database: process.env.DB_NAME!,
  },
  temperature: 0.1, // Créativité de l'IA (0.0-1.0)
  maxResults: 100, // Nombre max de résultats
});
```

#### Configuration avec initialisation explicite

```typescript
const assistant = new SQLAssistant({
  googleApiKey: process.env.GOOGLE_API_KEY!,
  databaseUrl: process.env.DATABASE_URL!,
});

// Initialisation asynchrone (recommandée)
await assistant.initialize();
```

## 🚀 Utilisation

### API Simple (recommandée)

```typescript
import { SQLAssistant } from "vixai";

async function example() {
  // Configuration
  const assistant = new SQLAssistant({
    googleApiKey: process.env.GOOGLE_API_KEY!,
    databaseUrl: process.env.DATABASE_URL!,
  });

  // Initialisation (optionnel mais recommandé)
  await assistant.initialize();

  // Exécution d'une requête
  const result = await assistant.query("Quel client a le plus grand salaire ?");

  if (result.success) {
    console.log("Requête SQL générée:", result.query);
    console.log("Résultats:", result.data);
  } else {
    console.error("Erreur:", result.error);
  }

  // Fermeture de la connexion
  await assistant.disconnect();
}
```

### API Avancée avec Chaîne de Traitement

```typescript
import { SQLAssistant } from "vixai";

async function advancedExample() {
  const assistant = new SQLAssistant({
    googleApiKey: process.env.GOOGLE_API_KEY!,
    databaseUrl: process.env.DATABASE_URL!,
  });

  await assistant.initialize();

  // Utilisation de la chaîne complète pour plus de détails
  const result = await assistant.processQuery({
    question: "Montre-moi les 5 clients les plus récents",
    context: "Analyse des nouveaux clients",
  });

  if (result.success) {
    console.log("📊 Résultats détaillés:");
    console.log("- Requête SQL:", result.sqlQuery);
    console.log("- Nombre de résultats:", result.rawData?.length);
    console.log("- Temps d'exécution:", result.executionTime, "ms");
    console.log(
      "- Taux de réussite:",
      (result.steps.filter((s) => s.success).length / result.steps.length) *
        100,
      "%"
    );

    // Réponse formatée
    console.log("\n📄 Réponse formatée:");
    console.log(result.formattedResponse);
  }

  await assistant.disconnect();
}
```

### Intégration Next.js

#### API Route (`pages/api/query.ts` ou `app/api/query/route.ts`)

```typescript
import { NextRequest, NextResponse } from "next/server";
import { SQLAssistant } from "vixai";

export async function POST(request: NextRequest) {
  try {
    const { question } = await request.json();

    const assistant = new SQLAssistant({
      googleApiKey: process.env.GOOGLE_API_KEY!,
      databaseUrl: process.env.DATABASE_URL!,
    });

    await assistant.initialize();

    const result = await assistant.processQuery({ question });
    await assistant.disconnect();

    if (result.success) {
      return NextResponse.json({
        success: true,
        data: result.rawData,
        sqlQuery: result.sqlQuery,
        formattedResponse: result.formattedResponse,
        executionTime: result.executionTime,
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
        },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Erreur API:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Erreur interne du serveur",
      },
      { status: 500 }
    );
  }
}
```

#### Composant React

```tsx
"use client";

import { useState } from "react";

export default function SQLQueryForm() {
  const [question, setQuestion] = useState("");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });

      const data = await response.json();

      if (data.success) {
        setResult(data);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError("Erreur de connexion");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Assistant SQL IA</h1>

      <form onSubmit={handleSubmit} className="mb-6">
        <div className="flex gap-2">
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Posez votre question en langage naturel..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !question.trim()}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "🔄 Recherche..." : "🔍 Rechercher"}
          </button>
        </div>
      </form>

      {error && (
        <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
          ❌ {error}
        </div>
      )}

      {result && (
        <div className="space-y-4">
          <div className="p-4 bg-green-100 border border-green-400 text-green-700 rounded-lg">
            ✅ Requête exécutée avec succès en {result.executionTime}ms
          </div>

          <div className="bg-gray-100 p-4 rounded-lg">
            <h3 className="font-semibold mb-2">📝 Requête SQL générée :</h3>
            <code className="block bg-gray-800 text-green-400 p-3 rounded text-sm overflow-x-auto">
              {result.sqlQuery}
            </code>
          </div>

          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="font-semibold mb-2">📊 Résultats :</h3>
            <pre className="text-sm overflow-x-auto">
              {JSON.stringify(result.data, null, 2)}
            </pre>
          </div>

          {result.formattedResponse && (
            <div className="bg-purple-50 p-4 rounded-lg">
              <h3 className="font-semibold mb-2">📄 Réponse formatée :</h3>
              <div className="prose prose-sm max-w-none">
                {result.formattedResponse.split("\n").map((line, i) => (
                  <p key={i} className="mb-1">
                    {line}
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

### Exemples de Requêtes

```typescript
// Requêtes simples
await assistant.query("Combien y a-t-il de clients ?");
await assistant.query("Liste des produits en stock");
await assistant.query("Quel est le montant total des ventes ?");

// Requêtes complexes
await assistant.query("Montre-moi les 10 clients les plus actifs ce mois-ci");
await assistant.query("Quels produits n'ont pas été vendus depuis 6 mois ?");
await assistant.query("Calcule le panier moyen par catégorie");

// Requêtes avec jointures
await assistant.query("Liste des commandes avec les informations clients");
await assistant.query("Produits les plus vendus par catégorie");
```

## 🗄️ Bases de données supportées

| Base de données | Statut         | Driver   | Détection auto | Remarques                           |
| --------------- | -------------- | -------- | -------------- | ----------------------------------- |
| **SQLite**      | ✅ **Complet** | Inclus   | ✅             | Base de données fichier locale      |
| **PostgreSQL**  | ✅ **Complet** | `pg`     | ✅             | Support complet des fonctionnalités |
| **MySQL**       | ✅ **Complet** | `mysql2` | ✅             | Compatible MariaDB                  |
| **MariaDB**     | ✅ **Complet** | `mysql2` | ✅             | Utilise le driver MySQL             |

### Exemples d'URLs de connexion

```typescript
// SQLite
const sqliteUrl = "sqlite:///:memory:"; // En mémoire
const sqliteFile = "sqlite:///path/to/database.db"; // Fichier

// PostgreSQL
const postgresUrl = "postgresql://user:password@localhost:5432/database";

// MySQL/MariaDB
const mysqlUrl = "mysql://user:password@localhost:3306/database";
```

## 📚 API Reference

### Classe `SQLAssistant`

#### Constructeur

```typescript
new SQLAssistant(options: SQLAssistantOptions)
```

#### Méthodes principales

##### `initialize(): Promise<void>`

Initialise la connexion à la base de données de manière asynchrone.

```typescript
await assistant.initialize();
```

##### `query(question: string): Promise<QueryResult>`

Exécute une requête simple et retourne les résultats bruts.

```typescript
const result = await assistant.query("Combien de clients ?");
// Retourne: { success: boolean, data?: any, query?: string, error?: string }
```

##### `processQuery(input: QueryInput): Promise<ChainResult>`

Exécute une requête avec la chaîne de traitement complète et métriques.

```typescript
const result = await assistant.processQuery({
  question: "Liste des clients",
  context: "Analyse clientèle",
});
// Retourne: réponse formatée + métriques + traçabilité
```

##### `disconnect(): Promise<void>`

Ferme proprement la connexion à la base de données.

```typescript
await assistant.disconnect();
```

### Types TypeScript

#### `SQLAssistantOptions`

```typescript
interface SQLAssistantOptions {
  googleApiKey: string; // Clé API Google Gemini (obligatoire)
  databaseUrl?: string; // URL de connexion complète
  dbType?: DatabaseType; // Type de BDD (optionnel, auto-détecté)
  dbConfig?: {
    // Configuration détaillée
    user?: string;
    password?: string;
    host?: string;
    port?: string | number;
    database?: string;
    filename?: string;
  };
  temperature?: number; // Créativité IA (0.0-1.0, défaut: 0.1)
  maxResults?: number; // Limite résultats (défaut: 100)
}
```

#### `QueryResult`

```typescript
interface QueryResult {
  success: boolean;
  data?: any; // Résultats bruts de la requête
  query?: string; // Requête SQL générée
  error?: string; // Message d'erreur si échec
}
```

#### `ChainResult`

```typescript
interface ChainResult {
  success: boolean;
  sqlQuery?: string; // Requête SQL générée
  rawData?: any; // Données brutes
  formattedResponse?: string; // Réponse formatée en français
  executionTime: number; // Temps d'exécution (ms)
  steps: QueryStep[]; // Étapes de traitement
  error?: string;
}
```

## 🛡️ Sécurité et bonnes pratiques

### Mesures de sécurité

- ✅ **SELECT uniquement** : Seules les requêtes de lecture sont autorisées
- ✅ **Validation stricte** : Vérification de la syntaxe avant exécution
- ✅ **Nettoyage des entrées** : Suppression des marqueurs de code et backticks
- ✅ **Limitation des résultats** : Nombre maximum configurable
- ✅ **Connexions sécurisées** : Utilisation de variables d'environnement

### Bonnes pratiques

#### 1. Gestion des connexions

```typescript
// ✅ Bonne pratique : Initialisation explicite
const assistant = new SQLAssistant(config);
await assistant.initialize();

try {
  const result = await assistant.query(question);
} finally {
  await assistant.disconnect(); // Toujours fermer la connexion
}
```

#### 2. Gestion d'erreurs

```typescript
try {
  const result = await assistant.query(question);

  if (!result.success) {
    console.error("Erreur de requête:", result.error);
    // Gérer l'erreur utilisateur
  } else {
    // Traiter les résultats
    console.log("Données:", result.data);
  }
} catch (error) {
  console.error("Erreur système:", error);
  // Gérer les erreurs système
}
```

#### 3. Variables d'environnement

```typescript
// ✅ Sécurisé : Utiliser les variables d'environnement
const assistant = new SQLAssistant({
  googleApiKey: process.env.GOOGLE_API_KEY!,
  databaseUrl: process.env.DATABASE_URL!,
});

// ❌ À éviter : Hardcoder les informations sensibles
const assistant = new SQLAssistant({
  googleApiKey: "AIzaSyAbCdEf...", // Danger !
  databaseUrl: "postgresql://user:secret@localhost/db", // Danger !
});
```

## 🔧 Dépannage

### Erreurs communes

#### "API_KEY_INVALID"

```
❌ Erreur: API key not valid. Please pass a valid API key.
```

**Solution :**

- Vérifiez votre clé API Google Gemini sur [Google AI Studio](https://makersuite.google.com/app/apikey)
- Assurez-vous que la clé n'est pas expirée
- Vérifiez les quotas d'utilisation

#### "Failed to connect to database"

```
❌ Erreur: Failed to connect to database
```

**Solutions :**

- Vérifiez que le serveur de base de données est démarré
- Vérifiez les identifiants de connexion
- Vérifiez la configuration réseau/firewall
- Testez la connexion avec un client SQL

#### "Only SELECT queries are allowed"

```
❌ Erreur: Only SELECT queries are allowed
```

**Cause :** Gemini a généré une requête non-SELECT
**Solution :** Reformulez votre question pour être plus spécifique

### Diagnostic avancé

#### Test de connexion

```typescript
// Test basique de connexion
const assistant = new SQLAssistant(config);
await assistant.initialize();

const testResult = await assistant.query("SELECT 1 as test");
if (testResult.success) {
  console.log("✅ Connexion réussie");
} else {
  console.log("❌ Problème de connexion:", testResult.error);
}

await assistant.disconnect();
```

## 📊 Métriques et monitoring

### Métriques disponibles

```typescript
const result = await assistant.processQuery({ question });

console.log("📈 Métriques de performance:");
console.log(`- Temps total: ${result.executionTime}ms`);
console.log(`- Nombre d'étapes: ${result.steps.length}`);
console.log(
  `- Taux de réussite: ${(
    (result.steps.filter((s) => s.success).length / result.steps.length) *
    100
  ).toFixed(1)}%`
);

// Détail par étape
result.steps.forEach((step, i) => {
  console.log(
    `${i + 1}. ${step.name}: ${step.success ? "✅" : "❌"} (${step.duration}ms)`
  );
});
```

## 🤝 Contribution

Les contributions sont les bienvenues ! Voici comment contribuer :

### Développement local

```bash
# Cloner le repository
git clone https://github.com/your-username/vixai.git
cd vixai

# Installer les dépendances
npm install

# Build du projet
npm run build

# Lancer les tests
npm test

# Tests avec vraie base de données
npm run test:integration
```

### Structure du projet

```
src/
├── SQLAssistant.ts          # Classe principale
├── ConnectionManager.ts     # Gestion des connexions
├── PromptManager.ts         # Prompts spécialisés
├── QueryChain.ts            # Chaîne de traitement
├── DatabaseTypeDetector.ts  # Détection automatique
├── config.ts               # Configuration
├── types.ts                # Types TypeScript
└── index.ts                # Point d'entrée

tests/
├── unit/                   # Tests unitaires
├── integration/            # Tests d'intégration
└── e2e/                    # Tests end-to-end
```

### Guidelines de contribution

- 🔄 **Fork** le projet
- 🌿 **Branch** : `feature/nom-de-la-fonctionnalite`
- ✅ **Tests** : Ajouter des tests pour chaque nouvelle fonctionnalité
- 📚 **Documentation** : Mettre à jour la documentation
- 🎯 **Commits** : Messages clairs et descriptifs
- 📦 **PR** : Description détaillée des changements

### Types de contributions

- 🐛 **Bug fixes** : Corrections de bugs
- ✨ **Features** : Nouvelles fonctionnalités
- 📖 **Documentation** : Améliorations de la doc
- 🧪 **Tests** : Ajout de tests
- 🔧 **Performance** : Optimisations
- 🎨 **UI/UX** : Améliorations d'interface

## 📄 Licence

**MIT License** - Voir le fichier [LICENSE](LICENSE) pour plus de détails.

---

## 🙏 Remerciements

- **Google Gemini** pour la puissance de l'IA
- **Knex.js** pour l'abstraction de base de données
- **LangChain** pour l'inspiration architecturale
- **La communauté open source** pour les outils et libraries

---

## 📞 Support

- 📧 **Email** : wabiyassar@gmail.com
- 🐛 **Issues** : [GitHub Issues](https://github.com/Yas246/vixai/issues)
- 💬 **Discussions** : [GitHub Discussions](https://github.com/Yas246/vixai/discussions)

---

**🎉 Merci d'utiliser vixai ! Transformez vos questions en insights puissants.**
