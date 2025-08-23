#!/bin/bash
# Bun PATH Setup Script for Air Project
# Ensures bun command is available permanently

echo "🔧 Setting up Bun PATH for Air project..."

# Check if bun is installed
if [ ! -f "$HOME/.bun/bin/bun" ]; then
    echo "❌ Bun not found at ~/.bun/bin/bun"
    echo "   Please install Bun first: curl -fsSL https://bun.sh/install | bash"
    exit 1
fi

# Add to shell configs (both bash and zsh)
SHELL_TYPE=$(basename "$SHELL")

if [ "$SHELL_TYPE" = "zsh" ]; then
    if ! grep -q 'export PATH="$HOME/.bun/bin:$PATH"' ~/.zshrc 2>/dev/null; then
        echo 'export PATH="$HOME/.bun/bin:$PATH"' >> ~/.zshrc
        echo "✅ Added Bun to ~/.zshrc (zsh detected)"
    else
        echo "✅ Bun PATH already in ~/.zshrc"
    fi
elif [ "$SHELL_TYPE" = "bash" ]; then
    if ! grep -q 'export PATH="$HOME/.bun/bin:$PATH"' ~/.bashrc 2>/dev/null; then
        echo 'export PATH="$HOME/.bun/bin:$PATH"' >> ~/.bashrc
        echo "✅ Added Bun to ~/.bashrc (bash detected)"
    else
        echo "✅ Bun PATH already in ~/.bashrc"
    fi
else
    echo "⚠️  Shell $SHELL_TYPE detected - adding to both ~/.bashrc and ~/.zshrc"
    echo 'export PATH="$HOME/.bun/bin:$PATH"' >> ~/.bashrc
    echo 'export PATH="$HOME/.bun/bin:$PATH"' >> ~/.zshrc
fi

# Add to current session
export PATH="$HOME/.bun/bin:$PATH"

# Test bun command
if command -v bun &> /dev/null; then
    BUN_VERSION=$(bun --version)
    echo "✅ Bun v$BUN_VERSION is now available"
    
    # Test Air status command
    echo "🧪 Testing 'bun status' command..."
    if bun status --non-interactive &> /dev/null; then
        echo "✅ Air status command working perfectly"
    else
        echo "⚠️  Air status had issues (check npm scripts)"
    fi
else
    echo "❌ Bun command still not available"
    echo "   Try: source ~/.bashrc"
    exit 1
fi

echo "🚀 Bun setup complete! Air is ready to use Bun runtime."