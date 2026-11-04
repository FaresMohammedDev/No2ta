// Static Quran recitation library — mp3quran.net (free, official, reliable CDN).
// Each reciter here uses the "حفص عن عاصم - مرتل" (calm Murattal) riwayah.
// `server` is a base URL; a surah file lives at `${server}${NNN}.mp3` (3-digit, zero-padded).
const QURAN_RECITERS = [
    { id: 'minshawi', name: 'الشيخ محمد صديق المنشاوي', server: 'https://cdn.mp3quran.net/audio/muhammad-minshawi/r1/' },
    { id: 'abdulbasit', name: 'الشيخ عبد الباسط عبد الصمد', server: 'https://cdn.mp3quran.net/audio/abdulbasit-abdulsamad/r3/' },
    { id: 'husary', name: 'الشيخ محمود خليل الحصري', server: 'https://cdn.mp3quran.net/audio/mahmoud-husary/r5/' },
    { id: 'sudais', name: 'الشيخ عبد الرحمن السديس', server: 'https://cdn.mp3quran.net/audio/abdulrahman-sudais/r1/' },
    { id: 'afasy', name: 'الشيخ مشاري العفاسي', server: 'https://cdn.mp3quran.net/audio/mishary-alafasy/r1/' },
    { id: 'muaiqly', name: 'الشيخ ماهر المعيقلي', server: 'https://cdn.mp3quran.net/audio/maher-muaiqly/r1/' },
    { id: 'ayyub', name: 'الشيخ محمد أيوب', server: 'https://cdn.mp3quran.net/audio/muhammad-ayyub/r1/' },
    { id: 'dosari', name: 'الشيخ ياسر الدوسري', server: 'https://cdn.mp3quran.net/audio/yasser-dosari/r1/' },
];

const SURAH_NAMES = [
    'الفاتحة', 'البقرة', 'آل عمران', 'النساء', 'المائدة', 'الأنعام', 'الأعراف', 'الأنفال', 'التوبة', 'يونس',
    'هود', 'يوسف', 'الرعد', 'إبراهيم', 'الحجر', 'النحل', 'الإسراء', 'الكهف', 'مريم', 'طه',
    'الأنبياء', 'الحج', 'المؤمنون', 'النور', 'الفرقان', 'الشعراء', 'النمل', 'القصص', 'العنكبوت', 'الروم',
    'لقمان', 'السجدة', 'الأحزاب', 'سبأ', 'فاطر', 'يس', 'الصافات', 'ص', 'الزمر', 'غافر',
    'فصلت', 'الشورى', 'الزخرف', 'الدخان', 'الجاثية', 'الأحقاف', 'محمد', 'الفتح', 'الحجرات', 'ق',
    'الذاريات', 'الطور', 'النجم', 'القمر', 'الرحمن', 'الواقعة', 'الحديد', 'المجادلة', 'الحشر', 'الممتحنة',
    'الصف', 'الجمعة', 'المنافقون', 'التغابن', 'الطلاق', 'التحريم', 'الملك', 'القلم', 'الحاقة', 'المعارج',
    'نوح', 'الجن', 'المزمل', 'المدثر', 'القيامة', 'الإنسان', 'المرسلات', 'النبأ', 'النازعات', 'عبس',
    'التكوير', 'الانفطار', 'المطففين', 'الانشقاق', 'البروج', 'الطارق', 'الأعلى', 'الغاشية', 'الفجر', 'البلد',
    'الشمس', 'الليل', 'الضحى', 'الشرح', 'التين', 'العلق', 'القدر', 'البينة', 'الزلزلة', 'العاديات',
    'القارعة', 'التكاثر', 'العصر', 'الهمزة', 'الفيل', 'قريش', 'الماعون', 'الكوثر', 'الكافرون', 'النصر',
    'المسد', 'الإخلاص', 'الفلق', 'الناس'
];

function getReciterById(id) {
    return QURAN_RECITERS.find(r => r.id === id) || null;
}

function getSurahAudioUrl(reciterId, surahNumber) {
    const reciter = getReciterById(reciterId);
    if (!reciter) return null;
    const n = parseInt(surahNumber, 10);
    if (!n || n < 1 || n > 114) return null;
    return `${reciter.server}${String(n).padStart(3, '0')}.mp3`;
}

function getSurahName(surahNumber) {
    const n = parseInt(surahNumber, 10);
    return (n >= 1 && n <= 114) ? SURAH_NAMES[n - 1] : 'سورة';
}

module.exports = { QURAN_RECITERS, SURAH_NAMES, getReciterById, getSurahAudioUrl, getSurahName };
