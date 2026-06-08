const fs = require('fs');
const path = require('path');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(function(file) {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) { 
            results = results.concat(walk(file));
        } else { 
            if (file.endsWith('.ts') || file.endsWith('.tsx')) {
                results.push(file);
            }
        }
    });
    return results;
}

const files = walk('src');
let totalReplacements = 0;

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  const original = content;

  // First, replace the block where it does the nested ifs:
  content = content.replace(/let\s+BACKEND_URL\s*=\s*import\.meta\.env\.VITE_BACKEND_URL\s*\|\|\s*'http:\/\/localhost:3001';?\s*if\s*\(typeof window !== 'undefined'\)\s*\{[\s\S]*?(?:BACKEND_URL\s*=\s*'https:\/\/gigo-dapp\.onrender\.com';?\s*\}\s*\})/g, 
    "const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'https://gigo-dapp.onrender.com';");

  // DriverDashboard block:
  content = content.replace(/let\s+BACKEND_URL\s*=\s*import\.meta\.env\.VITE_BACKEND_URL\s*\|\|\s*'http:\/\/localhost:3001';?\s*if\s*\(typeof window !== 'undefined' && window\.location\.hostname === 'localhost'\)\s*\{[\s\S]*?(?:BACKEND_URL\s*=\s*'https:\/\/gigo-dapp\.onrender\.com';?\s*\})/g, 
    "const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'https://gigo-dapp.onrender.com';");

  // Any remaining simple fallback assignment:
  content = content.replace(/import\.meta\.env\.VITE_BACKEND_URL\s*\|\|\s*'http:\/\/localhost:3001'/g,
    "import.meta.env.VITE_BACKEND_URL || 'https://gigo-dapp.onrender.com'");
    
  // Change let to const for BACKEND_URL if it was just a simple let BACKEND_URL = ...
  content = content.replace(/let\s+BACKEND_URL\s*=\s*import\.meta\.env\.VITE_BACKEND_URL/g, 
    "const BACKEND_URL = import.meta.env.VITE_BACKEND_URL");

  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    totalReplacements++;
    console.log('Updated ' + file);
  }
}
console.log('Total files updated: ' + totalReplacements);
