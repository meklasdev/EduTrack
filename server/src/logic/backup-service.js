/**
 * Automated Database Backup Service — S3 / Cloud Storage
 *
 * Runs a scheduled pg_dump and uploads the result to an S3-compatible bucket.
 *
 * Required environment variables:
 *   DATABASE_URL          — PostgreSQL connection string (same as Prisma)
 *   BACKUP_S3_BUCKET      — Target S3 bucket name
 *   BACKUP_S3_REGION      — AWS region (default: eu-central-1)
 *   BACKUP_S3_KEY_ID      — AWS access key ID
 *   BACKUP_S3_SECRET      — AWS secret access key
 *   BACKUP_CRON           — Cron schedule (default: "0 2 * * *" = 2 AM daily)
 *   BACKUP_LOCAL_DIR      — Local temp directory for dumps (default: ./backups)
 *
 * If S3 credentials are not provided the backup is still written to the local
 * BACKUP_LOCAL_DIR directory so it can be picked up by another backup solution.
 */

const fs = require('fs-extra');
const path = require('path');
const { execFile } = require('child_process');
const { promisify } = require('util');
const execFileAsync = promisify(execFile);
const schedule = require('node-schedule');

const BACKUP_DIR = process.env.BACKUP_LOCAL_DIR || path.join(__dirname, '../../backups');
const CRON       = process.env.BACKUP_CRON || '0 2 * * *'; // 02:00 every day

let s3Client = null;

/**
 * Lazy-load the AWS S3 client only when credentials are present.
 * This avoids crashing on start-up when AWS is not configured.
 */
async function getS3Client() {
    if (s3Client) return s3Client;
    if (!process.env.BACKUP_S3_BUCKET || !process.env.BACKUP_S3_KEY_ID) return null;

    const { S3Client } = require('@aws-sdk/client-s3');
    s3Client = new S3Client({
        region: process.env.BACKUP_S3_REGION || 'eu-central-1',
        credentials: {
            accessKeyId:     process.env.BACKUP_S3_KEY_ID,
            secretAccessKey: process.env.BACKUP_S3_SECRET
        }
    });
    return s3Client;
}

/**
 * Performs a pg_dump of the EduTrack database and saves it locally.
 * @returns {Promise<string>} — path to the created dump file
 */
async function runDump() {
    await fs.ensureDir(BACKUP_DIR);

    const dbUrl  = process.env.DATABASE_URL || '';
    if (!dbUrl) {
        throw new Error('DATABASE_URL is not set — cannot run pg_dump.');
    }

    // Parse the DATABASE_URL to extract connection components.
    // We pass them as separate pg_dump flags and via PGPASSWORD to avoid
    // passing credentials in a shell-interpolated string (command injection risk).
    let parsedUrl;
    try {
        parsedUrl = new URL(dbUrl);
    } catch {
        throw new Error('DATABASE_URL is not a valid URL.');
    }

    const stamp   = new Date().toISOString().replace(/[:.]/g, '-');
    const outPath = path.join(BACKUP_DIR, `edutrack-backup-${stamp}.sql`);

    const env = {
        ...process.env,
        PGPASSWORD: parsedUrl.password || ''
    };

    const args = [
        '-h', parsedUrl.hostname,
        '-p', parsedUrl.port || '5432',
        '-U', parsedUrl.username,
        '-d', parsedUrl.pathname.replace(/^\//, ''),
        '-f', outPath
    ];

    await execFileAsync('pg_dump', args, { env, timeout: 5 * 60 * 1000 });
    console.log(`[Backup] Dump created: ${outPath}`);
    return outPath;
}

/**
 * Uploads a local file to S3.
 * @param {string} filePath
 */
async function uploadToS3(filePath) {
    const client = await getS3Client();
    if (!client) {
        console.log('[Backup] S3 not configured — skipping upload. File kept locally.');
        return;
    }

    const { PutObjectCommand } = require('@aws-sdk/client-s3');
    const key = `edutrack/backups/${path.basename(filePath)}`;
    await client.send(new PutObjectCommand({
        Bucket: process.env.BACKUP_S3_BUCKET,
        Key:    key,
        Body:   fs.createReadStream(filePath),
        ContentType: 'application/sql'
    }));
    console.log(`[Backup] Uploaded to s3://${process.env.BACKUP_S3_BUCKET}/${key}`);
}

/**
 * Full backup cycle: dump → (optional) upload to S3.
 */
async function runBackup() {
    try {
        console.log('[Backup] Starting scheduled database backup...');
        const dumpPath = await runDump();
        await uploadToS3(dumpPath);
        console.log('[Backup] Backup cycle complete.');
    } catch (err) {
        console.error('[Backup] Backup failed:', err.message);
    }
}

/**
 * Registers the backup schedule.  Call once from index.js on server start.
 */
function startSchedule() {
    const job = schedule.scheduleJob(CRON, runBackup);
    console.log(`[Backup] Scheduled database backups: "${CRON}"`);
    return job;
}

module.exports = { startSchedule, runBackup };
