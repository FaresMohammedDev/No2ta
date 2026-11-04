module.exports = {
            darkMode: 'class',
            theme: {
                extend: {
                    colors: {
                        slate: { // neutrals -> warm graphite
                            50: '#FBF8F2', 100: '#F5EFE4', 200: '#E3D9C8',
                            300: '#CFC3AE', 400: '#B8AC97', 500: '#7C7363',
                            600: '#3D3226', 700: '#2A231C', 800: '#1F1A15',
                            850: '#1F1A15', 900: '#161310', 950: '#060504',
                        },
                        cyan: { // primary action accent -> brass gold
                            200: '#F3E4C4', 300: '#E8C988', 400: '#DEBD7C',
                            500: '#D6B26E', 600: '#A67E39', 950: '#241B0C',
                        },
                        amber: { // faith / warm tag accent -> terracotta
                            200: '#E3BBA0', 300: '#D6A17D', 400: '#C68961',
                            500: '#B5693F', 600: '#8F4F2C', 950: '#1D0F08',
                        },
                        pink: { // media tag -> dusty rose
                            200: '#E7C5D1', 300: '#DBAFBE', 400: '#D29CB1', 500: '#C98BA0',
                        },
                        sky: { // broadcast tag -> slate blue
                            300: '#9BB3C4', 400: '#85A3B9', 500: '#6E8CA6',
                        },
                        blue: { // was paired with cyan in gradients -> warm bronze, keeps the brass gradient warm
                            500: '#A86B35', 600: '#8C5A2B', 950: '#241708',
                        },
                        indigo: { // collab tag -> dusty blue
                            300: '#A3B0D2', 500: '#7C8FBD', 600: '#65759E',
                        },
                        red: { // danger -> muted terracotta red
                            400: '#E8806C', 500: '#E0604A', 600: '#C04F3B', 800: '#5C2419',
                        },
                        no2ta: {
                            bg: 'var(--no2ta-bg-canvas)',
                            surface: 'var(--no2ta-bg-surface)',
                            primary: 'var(--no2ta-primary-500)',
                            secondary: 'var(--no2ta-secondary-500)',
                        }
                    },
                    fontFamily: {
                        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
                    },
                    fontSize: {
                        micro: ['0.656rem', { lineHeight: '1.3' }],
                    }
                }
            }
        };
module.exports.content = ['./public/**/*.html', './public/js/app.js'];
