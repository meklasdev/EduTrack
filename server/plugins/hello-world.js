/**
 * Hello World Plugin for EduTrack Pro
 * Demonstrates the plugin system by adding a /api/health-check endpoint.
 */
class HelloWorldPlugin {
    constructor(app, io, prisma) {
        this.app = app;
        this.io = io;
        this.prisma = prisma;
    }

    async init() {
        console.log('[Plugin: HelloWorld] Initializing...');
        this.app.get('/api/health-check', (req, res) => {
            res.json({ status: 'EduTrack Server is Healthy', time: new Date() });
        });
        console.log('[Plugin: HelloWorld] Registered /api/health-check route.');
    }
}

module.exports = HelloWorldPlugin;
