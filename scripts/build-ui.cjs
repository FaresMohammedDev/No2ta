const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
process.chdir(path.join(__dirname, '..'));
const result = spawnSync(process.execPath, [require.resolve('tailwindcss/lib/cli.js'), '-c', 'tailwind.config.cjs', '-i', 'styles/tailwind.css', '-o', 'public/css/tailwind.css', '--minify'], { stdio: 'inherit' });
if (result.status !== 0) process.exit(result.status || 1);
const lucideDir = path.dirname(require.resolve('lucide/package.json'));
fs.mkdirSync('public/js/vendor', { recursive: true });
fs.copyFileSync(path.join(lucideDir, 'dist/umd/lucide.min.js'), 'public/js/vendor/lucide.min.js');
fs.copyFileSync(path.join(lucideDir, 'LICENSE'), 'public/js/vendor/lucide.LICENSE');
const fonts = ['cairo', 'plus-jakarta-sans', 'jetbrains-mono'];
let fontCss = '';
fs.mkdirSync('public/fonts', { recursive: true });
for (const font of fonts) {
    const dir = path.dirname(require.resolve(`@fontsource-variable/${font}/package.json`));
    let css = fs.readFileSync(path.join(dir, 'index.css'), 'utf8');
    for (const match of css.matchAll(/url\(\.\/files\/([^)]*)\)/g)) {
        fs.copyFileSync(path.join(dir, 'files', match[1]), path.join('public/fonts', match[1]));
    }
    css = css.replaceAll(' Variable\'', '\'').replaceAll('./files/', '../fonts/');
    fontCss += css + '\n';
    fs.copyFileSync(path.join(dir, 'LICENSE'), path.join('public/fonts', `${font}.LICENSE`));
}
fs.writeFileSync('public/css/fonts.css', fontCss);
console.log('Local CSS, fonts and Lucide assets ready. Commit these assets with the source.');
