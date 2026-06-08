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

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;

  // Find all occurrences of BACKEND_URL reassignment and remove the if blocks
  content = content.replace(/if\s*\(typeof window !== 'undefined'[^\)]*\)\s*\{[\s\S]*?(?:BACKEND_URL\s*=[^}]*\}\s*\})?/g, function(match) {
     if (match.includes('BACKEND_URL =')) {
         return '';
     }
     return match;
  });

  content = content.replace(/if\s*\([^)]*\)\s*\{\s*BACKEND_URL\s*=\s*['"]http:\/\/localhost:3001['"]\s*\}\s*else\s*if\s*\([^)]*\)\s*\{\s*BACKEND_URL\s*=\s*['"]https:\/\/gigo-dapp\.onrender\.com['"]\s*\}/g, '');

  content = content.replace(/if\s*\(typeof window !== 'undefined'\)\s*\{\s*BACKEND_URL\s*=\s*import\.meta\.env\.VITE_BACKEND_URL[^\}]*\}/g, '');
  
  // also catch remaining random ones
  content = content.replace(/if\s*\(typeof window !== 'undefined'\)\s*\{\s*if\s*\(window\.location\.hostname === 'localhost'\)\s*\{\s*BACKEND_URL\s*=\s*'http:\/\/localhost:3001'\s*\}\s*else\s*if\s*\(BACKEND_URL\.includes\('localhost'\)\)\s*\{\s*BACKEND_URL\s*=\s*'https:\/\/gigo-dapp\.onrender\.com'\s*\}\s*\}/g, '');

  content = content.replace(/if\s*\(typeof window !== 'undefined' && window\.location\.hostname === 'localhost'\)\s*\{\s*BACKEND_URL\s*=\s*'http:\/\/localhost:3001'\s*\}\s*else\s*if\s*\(typeof window !== 'undefined' && BACKEND_URL\.includes\('localhost'\)\)\s*\{\s*BACKEND_URL\s*=\s*'https:\/\/gigo-dapp\.onrender\.com'\s*\}/g, '');
  
  if (content !== original) {
      fs.writeFileSync(file, content, 'utf8');
      console.log('Cleaned ' + file);
  }
}
