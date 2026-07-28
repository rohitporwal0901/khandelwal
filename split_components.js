const fs = require('fs');
const path = require('path');

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  console.log(`Processing: ${filePath}`);

  // Find template
  let templateStart = content.indexOf('template: `');
  if (templateStart === -1) {
    console.log(`No inline template found in ${filePath}`);
    return;
  }
  
  let templateIndex = templateStart + 'template: `'.length;
  let templateEnd = -1;
  // find closing backtick, ignoring escaped ones
  for (let i = templateIndex; i < content.length; i++) {
    if (content[i] === '`' && content[i - 1] !== '\\') {
      templateEnd = i;
      break;
    }
  }

  if (templateEnd === -1) {
    console.log(`Could not find end of template in ${filePath}`);
    return;
  }

  const templateContent = content.substring(templateIndex, templateEnd);
  
  // Find styles
  let stylesStart = content.indexOf('styles: [`', templateEnd);
  let hasStyles = false;
  let stylesEnd = -1;
  let stylesContent = '';
  let fullStylesBlock = '';
  let beforeStyles = '';

  if (stylesStart !== -1) {
    hasStyles = true;
    let stylesIndex = stylesStart + 'styles: [`'.length;
    for (let i = stylesIndex; i < content.length; i++) {
      if (content[i] === '`' && content[i - 1] !== '\\') {
        stylesEnd = i;
        break;
      }
    }
    if (stylesEnd !== -1) {
      stylesContent = content.substring(stylesIndex, stylesEnd);
      // find closing `]`
      let arrayEnd = content.indexOf(']', stylesEnd);
      if (arrayEnd !== -1) {
        fullStylesBlock = content.substring(stylesStart, arrayEnd + 1);
      }
    }
  } else {
    // maybe styles: [ ` (with spaces)
    let stylesRegex = /styles:\s*\[\s*`/;
    let match = content.match(stylesRegex);
    if (match) {
        hasStyles = true;
        stylesStart = match.index;
        let stylesIndex = stylesStart + match[0].length;
        for (let i = stylesIndex; i < content.length; i++) {
          if (content[i] === '`' && content[i - 1] !== '\\') {
            stylesEnd = i;
            break;
          }
        }
        if (stylesEnd !== -1) {
          stylesContent = content.substring(stylesIndex, stylesEnd);
          let arrayEnd = content.indexOf(']', stylesEnd);
          if (arrayEnd !== -1) {
            fullStylesBlock = content.substring(stylesStart, arrayEnd + 1);
          }
        }
    }
  }

  // File names
  const dirName = path.dirname(filePath);
  const baseName = path.basename(filePath, '.component.ts');
  const htmlPath = path.join(dirName, `${baseName}.component.html`);
  const cssPath = path.join(dirName, `${baseName}.component.css`);

  // Write files
  fs.writeFileSync(htmlPath, templateContent.trim() + '\n', 'utf8');
  if (hasStyles && fullStylesBlock) {
    fs.writeFileSync(cssPath, stylesContent.trim() + '\n', 'utf8');
  }

  // Update TS file
  // Replace template with templateUrl
  let newContent = content.substring(0, templateStart) + 
                   `templateUrl: './${baseName}.component.html'` + 
                   content.substring(templateEnd + 1);
  
  if (hasStyles && fullStylesBlock) {
    newContent = newContent.replace(fullStylesBlock, `styleUrls: ['./${baseName}.component.css']`);
  }

  fs.writeFileSync(filePath, newContent, 'utf8');
  console.log(`Successfully split ${baseName}`);
}

function findFiles(dir, files = []) {
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      findFiles(filePath, files);
    } else if (filePath.endsWith('.component.ts')) {
      files.push(filePath);
    }
  }
  return files;
}

const files = findFiles('./src/app/user');
for (const file of files) {
  processFile(file);
}
