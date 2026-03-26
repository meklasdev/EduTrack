const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const JWT_SECRET = process.env.JWT_SECRET || 'edutrack-jwt-secret-key-2025';

// Register a new teacher (and create department if it doesn't exist)
router.post('/register', async (req, res) => {
    const { username, password, departmentName } = req.body;

    if (!username || !password || !departmentName) {
        return res.status(400).json({ error: 'Username, password, and department name are required.' });
    }

    try {
        const passwordHash = await bcrypt.hash(password, 10);

        // Find or create department
        const department = await prisma.department.upsert({
            where: { name: departmentName },
            update: {},
            create: { name: departmentName }
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
            include: { department: true }
        });

        if (!teacher || !(await bcrypt.compare(password, teacher.passwordHash))) {
            return res.status(400).json({ error: 'Invalid username or password.' });
        }

        const token = jwt.sign(
            { id: teacher.id, username: teacher.username, departmentId: teacher.departmentId },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({ token, teacher: { username: teacher.username, department: teacher.department.name } });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
