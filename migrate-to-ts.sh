#!/bin/bash

# Migration script from JavaScript to TypeScript
# Fuck JavaScript, embrace TypeScript with Bun

echo "🔥 Migrating from JavaScript to TypeScript..."
echo "   JavaScript is trash, Node.js is slow"
echo "   TypeScript + Bun = The way"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check and install Bun
if ! command -v bun &> /dev/null; then
    echo -e "${YELLOW}Bun not found. Installing Bun...${NC}"
    curl -fsSL https://bun.sh/install | bash
    export BUN_INSTALL="$HOME/.bun"
    export PATH="$BUN_INSTALL/bin:$PATH"
else
    echo -e "${GREEN}✓ Bun is installed${NC}"
fi

# Install dependencies with Bun (4x faster than npm)
echo -e "${YELLOW}Installing dependencies with Bun...${NC}"
bun install

# Rename all .js files to .ts
echo -e "${YELLOW}Converting JavaScript files to TypeScript...${NC}"

# Source files
for file in src/*.js src/**/*.js; do
    if [ -f "$file" ]; then
        newfile="${file%.js}.ts"
        if [ ! -f "$newfile" ]; then
            mv "$file" "$newfile"
            echo -e "${GREEN}✓ Converted: $file → $newfile${NC}"
        else
            echo -e "${YELLOW}⚠ Already exists: $newfile${NC}"
        fi
    fi
done

# Test files
for file in test/*.js test/**/*.js; do
    if [ -f "$file" ]; then
        newfile="${file%.js}.ts"
        mv "$file" "$newfile"
        echo -e "${GREEN}✓ Converted: $file → $newfile${NC}"
    fi
done

# Script files
for file in script/*.js; do
    if [ -f "$file" ]; then
        newfile="${file%.js}.ts"
        mv "$file" "$newfile"
        echo -e "${GREEN}✓ Converted: $file → $newfile${NC}"
    fi
done

# Update imports in all TypeScript files
echo -e "${YELLOW}Updating imports to use .ts extensions...${NC}"
if command -v bun &> /dev/null; then
    bun run --eval "
        import { readdir, readFile, writeFile } from 'fs/promises'
        import { join } from 'path'
        
        async function updateImports(dir) {
            const files = await readdir(dir, { withFileTypes: true })
            
            for (const file of files) {
                const path = join(dir, file.name)
                
                if (file.isDirectory() && !['node_modules', 'dist', '.git'].includes(file.name)) {
                    await updateImports(path)
                } else if (file.name.endsWith('.ts')) {
                    let content = await readFile(path, 'utf8')
                    
                    // Update relative imports
                    content = content.replace(/from ['\"](\.[^'\"]+)\.js['\"]/g, 'from \"\$1\"')
                    content = content.replace(/import ['\"](\.[^'\"]+)\.js['\"]/g, 'import \"\$1\"')
                    
                    await writeFile(path, content)
                    console.log('Updated imports in:', path)
                }
            }
        }
        
        await updateImports('src')
        await updateImports('test')
        await updateImports('script')
    "
else
    echo -e "${RED}Bun not available for import updates${NC}"
fi

# Update main.js to main.ts
if [ -f "main.js" ]; then
    mv main.js src/main.ts
    echo -e "${GREEN}✓ Moved main.js → src/main.ts${NC}"
fi

# Update index.js to index.ts
if [ -f "index.js" ]; then
    mv index.js src/index.ts
    echo -e "${GREEN}✓ Moved index.js → src/index.ts${NC}"
fi

# Run type checking
echo -e "${YELLOW}Running TypeScript type check...${NC}"
if command -v bun &> /dev/null; then
    bun run typecheck || echo -e "${YELLOW}⚠ Type errors found (expected for initial migration)${NC}"
else
    npx tsc --noEmit || echo -e "${YELLOW}⚠ Type errors found (expected for initial migration)${NC}"
fi

# Build the project
echo -e "${YELLOW}Building TypeScript project...${NC}"
if command -v bun &> /dev/null; then
    bun run build:bun
else
    npm run build:node
fi

echo -e "${GREEN}✅ Migration complete!${NC}"
echo ""
echo "Next steps:"
echo "1. Fix any TypeScript errors: bun run typecheck"
echo "2. Run tests: bun test"
echo "3. Start with Bun: bun run dev"
echo "4. Build for production: bun run build"
echo ""
echo "🚀 Welcome to the TypeScript + Bun master race!"