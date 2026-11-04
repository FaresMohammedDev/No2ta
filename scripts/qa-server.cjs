// Isolated preview: never uses classroom data or broadcasts a discovery beacon.
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const root = path.resolve(__dirname, '..');
const sandbox = fs.mkdtempSync(path.join(root, '.no2ta-qa-'));
for (const dir of ['data', 'services']) fs.mkdirSync(path.join(sandbox, dir));
for (const file of ['data/db.js', 'data/quran-reciters.js', 'services/network.js', 'services/streaks.js', 'services/sessions.js']) {
    fs.copyFileSync(path.join(root, file), path.join(sandbox, file));
}
fs.writeFileSync(path.join(sandbox, 'services/discovery.js'), 'exports.startBeacon = () => {};');
let source = fs.readFileSync(path.join(root, 'server.js'), 'utf8');
// Security tests must run as students regardless of the developer's adapter.
source = source.replace(/const STRICT_ADMIN_MAC = '[^']+';/, "const STRICT_ADMIN_MAC = 'QA-NO-ADMIN-ADAPTER';");
source = source.replace("path.join(__dirname, 'public')", JSON.stringify(path.join(root, 'public')));
source = source.replace("server.listen(PORT, '0.0.0.0'", "server.listen(PORT, '127.0.0.1'");
source = source.replace(/^.*console\.log\(.*MASTER_PASSWORD.*$/m, '');
fs.writeFileSync(path.join(sandbox, 'server.js'), source);
const child = spawn(process.execPath, [path.join(sandbox, 'server.js')], {
    env: { ...process.env, PORT: process.env.PORT || '5001' }, stdio: 'inherit', windowsHide: true
});
function cleanup() {
    const resolved = path.resolve(sandbox);
    if (path.dirname(resolved) === root && path.basename(resolved).startsWith('.no2ta-qa-')) {
        fs.rmSync(resolved, { recursive: true, force: true });
    }
}
child.on('exit', code => { cleanup(); process.exit(code || 0); });
process.on('SIGINT', () => child.kill());
process.on('SIGTERM', () => child.kill());
process.on('message', message => { if (message === 'stop') child.kill(); });
