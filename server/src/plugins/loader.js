const fs = require('fs-extra');
const path = require('path');

/**
 * PluginLoader
 * Dynamically loads JS files from a specified directory as plugins.
 */
class PluginLoader {
    constructor(app, io, prisma) {
        this.app = app;
        this.io = io;
        this.prisma = prisma;
        this.plugins = [];
    }

    async loadPlugins(pluginsDir) {
        if (!fs.existsSync(pluginsDir)) {
            console.log(`[PluginLoader] Directory ${pluginsDir} not found. Skipping.`);
            return;
        }

        const files = await fs.readdir(pluginsDir);
        for (const file of files) {
            if (file.endsWith('.js')) {
                try {
                    const pluginPath = path.resolve(pluginsDir, file);
                    const PluginClass = require(pluginPath);
                    const plugin = new PluginClass(this.app, this.io, this.prisma);

                    if (typeof plugin.init === 'function') {
                        await plugin.init();
                        this.plugins.push(plugin);
                        console.log(`[PluginLoader] Loaded plugin: ${file}`);
                    } else {
                        console.warn(`[PluginLoader] Plugin ${file} missing init() method.`);
                    }
                } catch (err) {
                    console.error(`[PluginLoader] Failed to load plugin ${file}:`, err);
                }
            }
        }
    }
}

module.exports = PluginLoader;
