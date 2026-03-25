const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const io = require('socket.io-client');

const JWT_SECRET = 'edutrack-jwt-secret-key-2025';

async function test() {
    try {
        console.log('--- Testing Department Isolation ---');

        // 1. Create Departments
        const deptA = await prisma.department.upsert({ where: { name: 'Dept A' }, update: {}, create: { name: 'Dept A' } });
        const deptB = await prisma.department.upsert({ where: { name: 'Dept B' }, update: {}, create: { name: 'Dept B' } });

        // 2. Create Teachers
        const hash = await bcrypt.hash('pass', 10);
        const teacherA = await prisma.teacher.upsert({ where: { username: 'teacherA' }, update: { departmentId: deptA.id }, create: { username: 'teacherA', passwordHash: hash, departmentId: deptA.id } });
        const teacherB = await prisma.teacher.upsert({ where: { username: 'teacherB' }, update: { departmentId: deptB.id }, create: { username: 'teacherB', passwordHash: hash, departmentId: deptB.id } });

        // 3. Create Students and assign to Dept A
        await prisma.student.upsert({ where: { hostname: 'StudentA' }, update: { departmentId: deptA.id }, create: { id: 'StudentA', hostname: 'StudentA', departmentId: deptA.id } });
        await prisma.student.upsert({ where: { hostname: 'StudentB' }, update: { departmentId: deptB.id }, create: { id: 'StudentB', hostname: 'StudentB', departmentId: deptB.id } });

        const tokenA = jwt.sign({ id: teacherA.id, username: teacherA.username, departmentId: teacherA.departmentId }, JWT_SECRET);
        const tokenB = jwt.sign({ id: teacherB.id, username: teacherB.username, departmentId: teacherB.departmentId }, JWT_SECRET);

        // 4. Test Socket.io isolation
        const socketA = io('http://localhost:8080');
        const socketB = io('http://localhost:8080');
        const agent = io('http://localhost:8080');

        let teacherAUpdates = 0;
        let teacherBUpdates = 0;

        socketA.on('connect', () => socketA.emit('teacher-auth', tokenA));
        socketB.on('connect', () => socketB.emit('teacher-auth', tokenB));

        socketA.on('teacher-update', (data) => {
            console.log(`[Teacher A] Update from ${data.id}`);
            teacherAUpdates++;
        });

        socketB.on('teacher-update', (data) => {
            console.log(`[Teacher B] Update from ${data.id}`);
            teacherBUpdates++;
        });

        await new Promise(r => setTimeout(r, 1000));

        console.log('Agent reporting for StudentA (Dept A)...');
        agent.emit('agent-report', { hostname: 'StudentA', windows: [], processes: [] });

        await new Promise(r => setTimeout(r, 1000));

        console.log('Agent reporting for StudentB (Dept B)...');
        agent.emit('agent-report', { hostname: 'StudentB', windows: [], processes: [] });

        await new Promise(r => setTimeout(r, 1000));

        console.log(`Results: Teacher A updates: ${teacherAUpdates}, Teacher B updates: ${teacherBUpdates}`);

        socketA.close();
        socketB.close();
        agent.close();

        if (teacherAUpdates === 1 && teacherBUpdates === 1) {
            console.log('SUCCESS: Updates were correctly routed to respective departments.');
        } else {
            console.log('FAILURE: Update routing issue.');
        }

    } catch (err) {
        console.error(err);
    } finally {
        await prisma.$disconnect();
    }
}

test();
