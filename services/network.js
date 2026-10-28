const os = require('os');
const { exec } = require('child_process');

// Clean IP address
function cleanIP(rawIp) {
    if (!rawIp) return '127.0.0.1';
    let ip = rawIp.trim();
    if (ip.startsWith('::ffff:')) {
        ip = ip.replace('::ffff:', '');
    }
    if (ip === '::1' || ip === 'localhost') {
        ip = '127.0.0.1';
    }
    return ip;
}

// Get Server LAN IPv4 addresses
function getServerLanIPs() {
    const interfaces = os.networkInterfaces();
    const addresses = [];

    for (const name of Object.keys(interfaces)) {
        for (const net of interfaces[name]) {
            // Skip over non-IPv4 and internal (i.e. 127.0.0.1) addresses
            if (net.family === 'IPv4' && !net.internal) {
                addresses.push({
                    interface: name,
                    address: net.address,
                    mac: net.mac
                });
            }
        }
    }
    return addresses;
}

// Try to resolve MAC address for a given IP
function resolveMacAddress(ip) {
    return new Promise((resolve) => {
        const clean = cleanIP(ip);

        // If it's local host or one of the server's own interfaces
        const lanIps = getServerLanIPs();
        const localMatch = lanIps.find(item => item.address === clean);
        if (localMatch && localMatch.mac && localMatch.mac !== '00:00:00:00:00:00') {
            return resolve(localMatch.mac.toUpperCase());
        }

        if (clean === '127.0.0.1') {
            if (lanIps.length > 0 && lanIps[0].mac) {
                return resolve(lanIps[0].mac.toUpperCase());
            }
            return resolve('LOCAL-HOST-MAC');
        }

        // Run Windows ARP query: arp -a <ip>
        exec(`arp -a ${clean}`, { timeout: 1500 }, (err, stdout) => {
            if (err || !stdout) {
                return resolve(null);
            }
            // Sample line: 192.168.20.75         00-15-5d-01-02-03     dynamic
            const macRegex = /([0-9a-fA-F]{2}[:-]){5}([0-9a-fA-F]{2})/;
            const match = stdout.match(macRegex);
            if (match && match[0]) {
                return resolve(match[0].toUpperCase().replace(/-/g, ':'));
            }
            resolve(null);
        });
    });
}

module.exports = {
    cleanIP,
    getServerLanIPs,
    resolveMacAddress
};
