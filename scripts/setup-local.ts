import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, "..");

async function setupLocal() {
  console.log("[Setup] Initializing USSP local development environment...\n");

  // Create necessary directories
  const dirs = ["data", "data/storage", "logs"];

  for (const dir of dirs) {
    const dirPath = path.join(projectRoot, dir);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
      console.log(`✓ Created directory: ${dir}`);
    } else {
      console.log(`✓ Directory exists: ${dir}`);
    }
  }

  // Check .env file
  const envPath = path.join(projectRoot, ".env");
  if (!fs.existsSync(envPath)) {
    const envExamplePath = path.join(projectRoot, ".env.example");
    if (fs.existsSync(envExamplePath)) {
      fs.copyFileSync(envExamplePath, envPath);
      console.log(`✓ Created .env file from .env.example`);
    }
  } else {
    console.log(`✓ .env file already exists`);
  }

  // Check package dependencies
  const packageJsonPath = path.join(projectRoot, "package.json");
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));

  const requiredDeps = [
    "express",
    "drizzle-orm",
    "pg",
    "better-sqlite3",
    "typescript",
  ];

  const missingDeps = requiredDeps.filter(
    (dep) =>
      !packageJson.dependencies[dep] && !packageJson.devDependencies?.[dep]
  );

  if (missingDeps.length > 0) {
    console.log(`\n⚠ Missing dependencies: ${missingDeps.join(", ")}`);
    console.log(`  Run: npm install ${missingDeps.join(" ")}`);
  } else {
    console.log(`✓ All required dependencies are installed`);
  }

  console.log("\n[Setup] Local development environment is ready!");
  console.log("\nNext steps:");
  console.log("  1. Run: npm install");
  console.log("  2. Run: npm run dev");
  console.log("  3. Visit: http://localhost:5000");
}

setupLocal().catch((err) => {
  console.error("[Setup] Error:", err);
  process.exit(1);
});
