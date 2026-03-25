const fs = require('fs-extra');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const DB_PATH = path.join(__dirname, '../students_db.json');

async function migrate() {
    console.log('[Migration] Checking for students_db.json...');
    if (!fs.existsSync(DB_PATH)) {
        console.log('[Migration] No JSON database found. Skipping migration.');
        return;
    }

    try {
        const studentsStore = await fs.readJson(DB_PATH);
        const hostnames = Object.keys(studentsStore);

        if (hostnames.length === 0) {
            console.log('[Migration] JSON database is empty. Skipping migration.');
            return;
        }

        console.log(`[Migration] Found ${hostnames.length} students. Starting migration...`);

        for (const hostname of hostnames) {
            const data = studentsStore[hostname];

            // Upsert student
            const student = await prisma.student.upsert({
                where: { hostname: hostname },
                update: {
                    lastSeen: data.lastSeen ? new Date(data.lastSeen) : new Date(),
                    alerts: data.alerts || 0,
                    lastScore: data.lastScore || '0/0',
                    lastMatchedApp: data.lastMatchedApp || null,
                },
                create: {
                    id: hostname, // Using hostname as ID for simplicity if needed, or let it be generated
                    hostname: hostname,
                    lastSeen: data.lastSeen ? new Date(data.lastSeen) : new Date(),
                    alerts: data.alerts || 0,
                    lastScore: data.lastScore || '0/0',
                    lastMatchedApp: data.lastMatchedApp || null,
                },
            });

            // Re-create processes (delete old ones first to avoid duplicates during migration)
            await prisma.process.deleteMany({ where: { studentId: student.id } });
            if (data.processes && Array.isArray(data.processes)) {
                await prisma.process.createMany({
                    data: data.processes.map(p => ({
                        name: typeof p === 'string' ? p : (p.name || 'unknown'),
                        studentId: student.id
                    }))
                });
            }

            // Re-create windows
            await prisma.window.deleteMany({ where: { studentId: student.id } });
            if (data.windows && Array.isArray(data.windows)) {
                await prisma.window.createMany({
                    data: data.windows.map(w => ({
                        title: w.title || 'Untitled',
                        app: w.app || null,
                        studentId: student.id
                    }))
                });
            }
        }

        console.log('[Migration] Successfully migrated all data.');

        // Rename file to avoid re-migration
        const backupPath = `${DB_PATH}.bak`;
        await fs.rename(DB_PATH, backupPath);
        console.log(`[Migration] Renamed students_db.json to students_db.json.bak`);

    } catch (err) {
        console.error('[Migration] Error during migration:', err);
    } finally {
        await prisma.$disconnect();
    }
}

if (require.main === module) {
    migrate();
}

module.exports = migrate;
