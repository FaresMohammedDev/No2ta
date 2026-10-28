const dgram = require('dgram');
const fs = require('fs');
const path = require('path');

const client = dgram.createSocket({ type: 'udp4', reuseAddr: true });
let found = false;

client.on('error', () => {
    process.exit(1);
});

client.on('message', (msg) => {
    try {
        const data = JSON.parse(msg.toString());
        if (data && data.app === 'no2ta' && data.hostIp) {
            found = true;
            const targetUrl = `http://${data.hostIp}:${data.port || 5000}`;
            console.log(`FOUND:${targetUrl}`);
            
            // Save to data/last_host.txt
            const dataDir = path.join(__dirname, '..', 'data');
            if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
            fs.writeFileSync(path.join(dataDir, 'last_host.txt'), targetUrl, 'utf8');

            client.close();
            process.exit(0);
        }
    } catch (e) {}
});

client.bind(5055, () => {
    // Timeout after 1.8 seconds
    setTimeout(() => {
        if (!found) {
            client.close();
            process.exit(1);
        }
    }, 1800);
});
