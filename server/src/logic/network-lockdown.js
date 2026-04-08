/**
 * Network Lockdown Module — Block all student internet traffic except EduTrack server.
 *
 * On Linux (Ubuntu Server) it uses iptables to whitelist only the EduTrack
 * server IP/port and block all other outbound traffic on the student machine.
 *
 * The server exposes HTTP endpoints that the student agent calls via Socket.io
 * to apply / remove the lockdown.  The actual iptables commands are executed on
 * the server host (suitable when the server is also the network gateway) or can
 * be applied remotely via SSH by an administrator.
 *
 * On Windows the student app uses `netsh` / Windows Firewall APIs.
 *
 * USAGE (call from server index.js):
 *   const lockdown = require('./src/logic/network-lockdown');
 *   lockdown.registerRoutes(app, io, authMiddleware);
 */

const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);
const os = require('os');

/**
 * Validates that the provided string is a well-formed IPv4 or IPv6 address.
 * Returns true if valid, false otherwise.
 * @param {string} ip
 * @returns {boolean}
 */
function isValidIP(ip) {
    // IPv4
    const ipv4 = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (ipv4.test(ip)) {
        return ip.split('.').every(octet => parseInt(octet, 10) <= 255);
    }
    // IPv6 (simplified check — allows ::, compressed notation)
    const ipv6 = /^[0-9a-fA-F:]+$/;
    return ipv6.test(ip) && ip.includes(':');
}

/**
 * Build iptables rules that allow only traffic to/from serverIp:serverPort.
 * @param {string} serverIp — must be a validated IP address
 * @param {number} serverPort
 * @returns {string[]} shell commands
 */
function buildLockdownCommands(serverIp, serverPort) {
    return [
        // Allow loopback
        `iptables -A OUTPUT -o lo -j ACCEPT`,
        // Allow established/related connections
        `iptables -A OUTPUT -m state --state ESTABLISHED,RELATED -j ACCEPT`,
        // Allow DNS (so server hostname can be resolved)
        `iptables -A OUTPUT -p udp --dport 53 -j ACCEPT`,
        // Allow traffic to EduTrack server
        `iptables -A OUTPUT -d ${serverIp} -p tcp --dport ${serverPort} -j ACCEPT`,
        // Drop everything else
        `iptables -A OUTPUT -j DROP`
    ];
}

/**
 * Remove lockdown rules by flushing the OUTPUT chain.
 * @returns {string[]} shell commands
 */
function buildUnlockCommands() {
    return [`iptables -F OUTPUT`];
}

/**
 * Execute a list of shell commands sequentially.
 * @param {string[]} cmds
 */
async function runCommands(cmds) {
    for (const cmd of cmds) {
        await execAsync(cmd, { timeout: 5000 });
    }
}

/**
 * Register network lockdown API endpoints.
 *
 * POST /api/network-lockdown/apply   { serverIp, serverPort }
 * POST /api/network-lockdown/remove
 * GET  /api/network-lockdown/status
 *
 * @param {import('express').Application} app
 * @param {import('socket.io').Server} io
 * @param {Function} authMiddleware
 */
function registerRoutes(app, io, authMiddleware) {
    let lockdownActive = false;
    let lockdownTarget = null;

    // The teacher triggers lockdown via the admin API
    app.post('/api/network-lockdown/apply', authMiddleware, async (req, res) => {
        const { serverIp, serverPort = 8080 } = req.body;
        if (!serverIp) return res.status(400).json({ error: 'serverIp required.' });

        // Validate IP address to prevent command injection
        if (!isValidIP(serverIp)) {
            return res.status(400).json({ error: 'Invalid serverIp format — must be a valid IPv4 or IPv6 address.' });
        }
        const safePort = parseInt(serverPort, 10);
        if (isNaN(safePort) || safePort < 1 || safePort > 65535) {
            return res.status(400).json({ error: 'Invalid serverPort.' });
        }

        // Emit command to all student agents to apply their local firewall rules
        io.emit('network-lockdown', { action: 'apply', serverIp, serverPort: safePort });

        // Also apply on server host if running on Linux (gateway scenario)
        if (os.platform() === 'linux') {
            try {
                await runCommands(buildLockdownCommands(serverIp, safePort));
            } catch (e) {
                console.warn('[Lockdown] iptables failed (non-root?):', e.message);
            }
        }

        lockdownActive = true;
        lockdownTarget = { serverIp, serverPort: safePort };
        res.json({ message: 'Network lockdown applied.', target: lockdownTarget });
    });

    app.post('/api/network-lockdown/remove', authMiddleware, async (req, res) => {
        io.emit('network-lockdown', { action: 'remove' });

        if (os.platform() === 'linux') {
            try {
                await runCommands(buildUnlockCommands());
            } catch (e) {
                console.warn('[Lockdown] iptables flush failed:', e.message);
            }
        }

        lockdownActive = false;
        lockdownTarget = null;
        res.json({ message: 'Network lockdown removed.' });
    });

    app.get('/api/network-lockdown/status', authMiddleware, (req, res) => {
        res.json({ active: lockdownActive, target: lockdownTarget });
    });

    console.log('[NetworkLockdown] Routes registered: /api/network-lockdown/{apply,remove,status}');
}

module.exports = { registerRoutes, buildLockdownCommands, buildUnlockCommands };
