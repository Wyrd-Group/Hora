import fs from 'fs';

let content = fs.readFileSync('apps/empire/src/data/shoppingData.ts', 'utf-8');
let idx = 1;
content = content.replace(/{ id: (.*?), name: '(.*?)', tier: (.*?), category: '(.*?)', description: '(.*?)', imageUrl: '.*?', value: (.*?), yieldMultiplier: (.*?), owned: false },/g, (match, id, name, tier, category, description, value, mult) => {
  // Use the last word of the name plus the category as a Flickr keyword combo
  const words = name.split(' ');
  const kw = encodeURIComponent(words[words.length-1].toLowerCase());
  const catParam = encodeURIComponent(category.toLowerCase());
  const newUrl = `https://loremflickr.com/800/600/${catParam},${kw}/all?lock=${idx++}`;
  
  return `{ id: ${id}, name: '${name}', tier: ${tier}, category: '${category}', description: '${description}', imageUrl: '${newUrl}', value: ${value}, yieldMultiplier: ${mult}, owned: false },`;
});

fs.writeFileSync('apps/empire/src/data/shoppingData.ts', content);

// Bump local storage version to force state rehydration!
let storeContent = fs.readFileSync('apps/empire/src/store/empireStore.ts', 'utf-8');
storeContent = storeContent.replace("name: 'quantico-empire-storage-v3'", "name: 'quantico-empire-storage-v4'");
fs.writeFileSync('apps/empire/src/store/empireStore.ts', storeContent);

console.log("Images fixed with loremflickr locks and storage version bumped to v4.");
