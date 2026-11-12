const fs = require('fs');
const path = require('path');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) { 
            results = results.concat(walk(file));
        } else { 
            if (file.endsWith('.js')) {
                results.push(file);
            }
        }
    });
    return results;
}

const files = walk(path.join(__dirname, '../frontend/src'));
let changedCount = 0;

for (const file of files) {
    let content = fs.readFileSync(file, 'utf8');
    if (content.includes('toLocaleDateString()')) {
        const updated = content.replace(/\.toLocaleDateString\(\)/g, ".toLocaleDateString('en-GB')");
        fs.writeFileSync(file, updated, 'utf8');
        changedCount++;
    }
}
console.log(`Updated ${changedCount} files to use en-GB format.`);
