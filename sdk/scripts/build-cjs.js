const fs = require("fs");
const path = require("path");

// dist フォルダ内のファイルを CommonJS 形式に変換
const distDir = path.join(__dirname, "../dist");

function convertToCommonJS(filePath) {
  let content = fs.readFileSync(filePath, "utf-8");

  // ES module exports を CommonJS に変換
  content = content.replace(
    /export\s+(?:default\s+)?(?:class|function|interface)\s+(\w+)/g,
    "class $1"
  );
  content = content.replace(
    /export\s+(?:type|interface)\s+(\w+)/g,
    ""
  );
  content = content.replace(/export\s+\{([^}]+)\}/g, "module.exports = {$1}");
  content = content.replace(/export\s+default\s+/g, "module.exports = ");

  // import を require に変換
  content = content.replace(
    /import\s+(?:{([^}]+)}|(\w+))\s+from\s+['"]([^'"]+)['"]/g,
    (match, named, def, module) => {
      if (named) {
        return `const {${named}} = require('${module}')`;
      }
      return `const ${def} = require('${module}')`;
    }
  );

  fs.writeFileSync(filePath.replace(/\.js$/, ".cjs"), content);
}

if (fs.existsSync(distDir)) {
  fs.readdirSync(distDir)
    .filter((f) => f.endsWith(".js") && !f.endsWith(".d.ts"))
    .forEach((file) => {
      convertToCommonJS(path.join(distDir, file));
    });
}

console.log("✓ CommonJS files generated");
