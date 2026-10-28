const dgram = require('dgram');
const { getServerLanIPs } = require('./network');

function startBeacon(port = 5000, beaconPort = 5055) {
    try {
        const socket = dgram.createSocket({ type: 'udp4', reuseAddr: true });

        socket.bind(() => {
            try {
                socket.setBroadcast(true);
            } catch (e) {}

            setInterval(() => {
                try {
                    const lanIps = getServerLanIPs();
                    const primary = lanIps.find(i => i.address.startsWith('192.168.')) || lanIps[0];
                    if (primary) {
                        const payload = Buffer.from(JSON.stringify({
                            app: 'no2ta',
                            hostIp: primary.address,
                            port: port,
                            timestamp: Date.now()
                        }));
                        socket.send(payload, 0, payload.length, beaconPort, '255.255.255.255', () => {});
                    }
                } catch (e) {}
            }, 2000);
        });

        socket.on('error', (err) => {
            // Non-fatal if UDP broadcast is restricted
            console.log('LAN Beacon notice:', err.message);
        });
    } catch (e) {}
}

module.exports = { startBeacon };
