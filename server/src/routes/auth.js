const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const JWT_SECRET = process.env.JWT_SECRET || 'edutrack-jwt-secret-key-2025';

// Register a new teacher (and create department/organization if they don't exist)
router.post('/register', async (req, res) => {
    const { username, password, departmentName, organizationName } = req.body;

    if (!username || !password || !departmentName) {
        return res.status(400).json({ error: 'Username, password, and department name are required.' });
    }

    try {
        const passwordHash = await bcrypt.hash(password, 10);

        let organizationId = null;
        if (organizationName) {
            const org = await prisma.organization.upsert({
                where: { name: organizationName },
                update: {},
                create: { name: organizationName }
            });
            organizationId = org.id;
        }

        // Find or create department
        const existingDept = await prisma.department.findUnique({ where: { name: departmentName } });
        if (existingDept && existingDept.organizationId !== organizationId) {
            return res.status(403).json({ error: 'Department already belongs to another organization.' });
        }

        const department = await prisma.department.upsert({
            where: { name: departmentName },
            update: {},
            create: { name: departmentName, organizationId: organizationId }
        });

        const teacher = await prisma.teacher.create({
            data: {
                username,
                passwordHash,
                departmentId: department.id
            }
        });

        res.json({ message: 'Teacher registered successfully', teacherId: teacher.id });
    } catch (err) {
        if (err.code === 'P2002') {
            return res.status(400).json({ error: 'Username already exists.' });
        }
        res.status(500).json({ error: err.message });
    }
});

// Login
router.post('/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        const teacher = await prisma.teacher.findUnique({
            where: { username },
            include: {
                department: {
                    include: { organization: true }
                }
            }
        });

        if (!teacher || !(await bcrypt.compare(password, teacher.passwordHash))) {
            return res.status(400).json({ error: 'Invalid username or password.' });
        }

        const token = jwt.sign(
            {
                id: teacher.id,
                username: teacher.username,
                departmentId: teacher.departmentId,
                organizationId: teacher.department.organizationId
            },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            token,
            teacher: {
                username: teacher.username,
                department: teacher.department.name,
                organization: teacher.department.organization?.name || 'Local'
            }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
