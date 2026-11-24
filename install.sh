#!/usr/bin/env bash
set -e

# Antigravity Autonomous Studio Installer
echo "======================================================="
echo "🏢 Antigravity Autonomous Studio - 1-Line Installer"
echo "======================================================="

REPO_URL="https://github.com/yoshiafk/agi-autonomous-studio.git"
INSTALL_DIR="${HOME}/.gemini/config/plugins/antigravity-studio"

mkdir -p "${HOME}/.gemini/config/plugins"

if [ -d "${INSTALL_DIR}/.git" ]; then
    echo "🔄 Updating existing installation in ${INSTALL_DIR}..."
    cd "${INSTALL_DIR}"
    git pull --quiet origin master || git pull --quiet
else
    echo "📦 Cloning studio plugin into ${INSTALL_DIR}..."
    git clone --quiet "${REPO_URL}" "${INSTALL_DIR}"
    cd "${INSTALL_DIR}"
fi

chmod +x start.sh install.sh 2>/dev/null || true

echo "✨ Installation complete!"
echo "   Plugin location: ${INSTALL_DIR}"
echo "   Chat command:    /studio"
echo ""
echo "🚀 Starting Studio Visualizer..."
./start.sh
