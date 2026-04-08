/**
 * Plugin Loader — 3rd party plugin system for EduTrack.
 *
 * Plugins are Node.js modules placed in the `plugins/` directory next to the
 * server root. Each plugin must export an object with:
 *
 *   { name, version, register(app, io, prisma) }
 *
 * The `register` function receives the Express app, the Socket.io server and
 * the Prisma client so plugins can add routes, socket handlers and DB queries.
 *
 * Usage in index.js:
 *   const pluginLoader = require('./src/logic/plugin-loader');
 *   pluginLoader.loadAll(app, io, prisma);
 */

const path = require('path');
const fs = require('fs');

const PLUGINS_DIR = path.join(__dirname, '../../plugins');

/**
 * Discover and load all plugins from the plugins/ directory.
 * @param {import('express').Application} app
 * @param {import('socket.io').Server} io
 * @param {import('@prisma/client').PrismaClient} prisma
 */
function loadAll(app, io, prisma) {
    if (!fs.existsSync(PLUGINS_DIR)) {
        fs.mkdirSync(PLUGINS_DIR, { recursive: true });
        console.log('[Plugins] plugins/ directory created.');
        return;
    }

    const entries = fs.readdirSync(PLUGINS_DIR, { withFileTypes: true });
    for (const entry of entries) {
        // Support both single-file plugins (plugin.js) and directory plugins (plugin/index.js)
        if (!entry.isDirectory() && !entry.name.endsWith('.js')) continue;
        const pluginPath = entry.isDirectory()
            ? path.join(PLUGINS_DIR, entry.name, 'index.js')
            : path.join(PLUGINS_DIR, entry.name);

        if (!fs.existsSync(pluginPath)) continue;

        try {
            const plugin = require(pluginPath);
            if (typeof plugin.register !== 'function') {
                console.warn(`[Plugins] Skipping "${entry.name}": missing register() export.`);
                continue;
            }
            plugin.register(app, io, prisma);
            console.log(`[Plugins] Loaded: ${plugin.name || entry.name} v${plugin.version || '?'}`);
        } catch (err) {
            console.error(`[Plugins] Failed to load "${entry.name}":`, err.message);
        }
    }
}

module.exports = { loadAll, PLUGINS_DIR };
