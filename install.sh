#!/usr/bin/env bash
set -e

# Antigravity Autonomous Studio - 1-Line Installer
echo "======================================================="
echo "Antigravity Autonomous Studio - 1-Line Installer"
echo "======================================================="

REPO_URL="https://github.com/yoshiafk/agi-autonomous-studio.git"
PLUGINS_DIR="${HOME}/.gemini/config/plugins"
INSTALL_DIR="${PLUGINS_DIR}/antigravity-studio"

mkdir -p "${PLUGINS_DIR}"

if [ -d "${INSTALL_DIR}/.git" ]; then
    echo "Updating existing installation in ${INSTALL_DIR}..."
    cd "${INSTALL_DIR}"
    git pull --quiet origin master || git pull --quiet
else
    echo "Installing Antigravity Studio plugin into ${INSTALL_DIR}..."
    git clone --quiet "${REPO_URL}" "${INSTALL_DIR}"
    cd "${INSTALL_DIR}"
fi

chmod +x start.sh server.py install.sh 2>/dev/null || true

echo ""
echo "======================================================="
echo "Installation Complete!"
echo "   Plugin location: ${INSTALL_DIR}"
echo "   Chat command:    /studio"
echo "   Dashboard link:  http://localhost:7777/?auto=true"
echo "======================================================="
echo ""
echo "Starting Studio Visualizer in background..."
./start.sh --daemon
